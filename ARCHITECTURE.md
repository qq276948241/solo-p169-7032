# 项目架构说明

> 十分钟读懂整个游戏是怎么跑起来的。

## 一、文件结构总览

```
project169/
├── index.js              ← 入口文件，只有两行：require game.js 然后调 main()
├── save.json             ← 游戏存档（运行后自动生成）
├── package.json
└── src/
    ├── utils.js          ← 纯工具函数（无依赖）
    ├── data.js           ← 所有游戏常量数据（无依赖）
    ├── player.js         ← 玩家状态和背包操作（依赖 data, utils）
    ├── map.js            ← 地图生成和房间描述（依赖 data, utils, player）
    ├── combat.js         ← 战斗、死亡、复活逻辑（依赖 data, utils, player）
    ├── shop.js           ← 商店界面和购买（依赖 data, player）
    └── game.js           ← 主循环、命令解析、存档读档、主菜单（调度所有模块）
```

## 二、模块依赖图（文字版）

```
utils.js   data.js          ← 最底层，零依赖，纯数据/纯函数
   │          │
   ▼          ▼
player.js (data + utils)     ← 玩家状态抽象
   │
   ├──► map.js    (data + utils + player)   ← 地图生成
   ├──► combat.js (data + utils + player)   ← 战斗系统
   └──► shop.js   (data + player)           ← 商店系统
         │          │           │
         ▼          ▼           ▼
     game.js (调度所有模块 + fs/readline)     ← 唯一有副作用的文件
         │
         ▼
     index.js (启动 game.main())
```

**设计原则**：单向依赖，绝对没有循环引用。`utils` 和 `data` 是纯叶子，任何模块都能引用它们，但它们不引用任何人。所有业务逻辑模块只引用底层，不互相引用。

## 三、各个模块是干嘛的

| 模块 | 负责的事 | 不该管的事 |
|---|---|---|
| **utils.js** | `randInt(min,max)` 随机整数、`choice(arr)` 随机选元素 | 不存任何状态 |
| **data.js** | 怪物数据、物品表、商店商品、房间描述、ASCII 骷髅头 | 不包含任何逻辑 |
| **player.js** | 创建玩家、计算攻击力、增删物品、使用血瓶/装备武器、打印状态 | 不知道地图和战斗的存在 |
| **map.js** | 随机生成 10~14 个房间并连起来、放怪物/宝箱/陷阱/商店、打印房间描述 | 不修改玩家 |
| **combat.js** | 回合制战斗循环、处理攻击/用血瓶/逃跑、死亡复活 | 不处理地图移动 |
| **shop.js** | 渲染带边框的商店界面、扣金币卖东西 | 不知道地图坐标 |
| **game.js** | 主菜单、命令解析(`go north`/`attack` 等)、游戏循环、保存/读取 JSON、调度上面所有模块 | 具体的战斗和购买逻辑尽量不写在这 |

## 四、一局游戏是怎么跑起来的

从 `index.js` 启动开始，完整流程：

```
1. index.js 调用 game.main()
    ↓
2. game.js 创建 readline 接口，显示主菜单 (mainMenu)
    ├── 选 1 → 调 map.generateMap()  + player.createPlayer() 开始新游戏
    └── 选 2 → 调 loadGame() 从 save.json 读 rooms 和 player
    ↓
3. 进入 gameLoop，每一轮做三件事：
    a. 调 map.describeRoom() 打印当前房间（怪物、宝箱、出口、商店提示）
    b. 调 player.describePlayer() 打印血量/金币/背包
    c. rl.question 等待玩家输入命令
    ↓
4. processCommand 根据命令分派：
    ├─ go [方向]    → 改 player.currentRoom，检查陷阱扣血
    ├─ attack       → 调 combat.combat()，进入战斗子循环
    ├─ use potion   → 调 player.useItem()
    ├─ open         → 开宝箱，调 player.addItem() 塞物品
    ├─ shop / buy   → 调 shop.describeShop() / shop.buyItem()
    ├─ save         → 调 saveGame() 写 JSON
    └─ exit         → 在出口房间触发胜利，回主菜单
    ↓
5. 命令处理完后回调 gameLoop，回到第 3 步继续，直到玩家退出
```

## 五、数据在模块之间怎么流

核心就两个纯对象，模块之间传引用：

- **`player` 对象**：玩家的所有状态，从头到尾同一个实例。战斗模块改 `hp` 和 `gold`，商店模块改 `inventory` 和 `gold`，地图模块只读取 `currentRoom`，game.js 负责整体调度。
- **`rooms` 数组**：地图就是一个房间对象数组，每个房间有 `exits`、`monster`、`chest`、`trap`、`isShop` 等字段。战斗会把 `room.monster` 置为 `null`，开宝箱会改 `room.chest.opened`。

所有模块都是**直接修改传入对象的属性**，没有做不可变数据处理（对一个命令行小游戏来说性能不是问题，代码简单最重要）。

## 六、存档机制详解（扩展最容易踩坑的地方）

### 6.1 save.json 长什么样

```json
{
  "savedAt": 1719567890123,
  "player": {
    "hp": 75,
    "maxHp": 100,
    "baseAtk": 10,
    "currentRoom": 5,
    "inventory": ["potion", "sword", "key", "potion"],
    "weapon": null,
    "gold": 42,
    "deaths": 1
  },
  "rooms": [
    {
      "id": 0,
      "desc": "一间阴暗潮湿的石室...",
      "exits": { "east": 1, "south": 2 },
      "monster": null,
      "chest": null,
      "trap": null,
      "isExit": false,
      "isStart": true,
      "isShop": false,
      "visited": true
    },
    {
      "id": 1,
      "desc": "...",
      "exits": { "west": 0 },
      "monster": { "name": "哥布林", "hp": 15, "maxHp": 20, "atk": 5, "exp": 10, "goldMin": 3, "goldMax": 8 },
      "chest": { "opened": false, "locked": true, "contents": ["potion"] },
      "trap": { "damage": 10, "triggered": false },
      "...": "..."
    }
  ]
}
```

### 6.2 序列化（保存）

`saveGame(rooms, player)` 直接调用 `JSON.stringify(data, null, 2)` 整个写入 `save.json`。

**关键点**：
- `rooms` 和 `player` 必须是纯 JS 对象，**不能有函数、循环引用、Date 对象（目前用的是时间戳数字）**
- `room.exits` 是一个 `{ north: 3, south: 0 }` 这样的普通对象，存的是目标房间的 id（数字），**不是房间对象的引用**——这是刻意设计的，避免序列化时把整个图重复存 N 遍

### 6.3 反序列化（读档）

`loadGame()` 直接 `JSON.parse(fs.readFileSync(...))`。

**关键点**：
- 读出来的 `rooms` 和 `player` 是全新对象，跟游戏里正在跑的没有任何引用关系
- 所有怪物数据是直接序列化到 `rooms[i].monster` 里的，不是运行时重新生成——这意味着如果你后来改了 `data.js` 里怪物的 ATK，读旧存档时老怪物还是旧数值（这是特性不是 bug，要全局升级怪物属性需要写迁移脚本）

### 6.4 新增字段时怎么不把老存档搞崩

以后加新功能要往 `player` 或 `room` 里加字段时，**必须给默认值**，否则老存档里没有这个字段会是 `undefined`。推荐做法：

```js
// 读档后做一次字段补全
function normalizeSave(data) {
  data.player.newField = data.player.newField ?? '默认值';
  data.rooms.forEach(r => r.newRoomField = r.newRoomField ?? false);
  return data;
}
```

目前没做这一步，加新字段时记得补上。

## 七、目前的设计有什么可以优化的

以下是留给以后扩展的坑，按优先级排序：

1. **事件系统**：现在战斗加金币是 `combat.js` 直接改 `player.gold`，以后要加"战斗日志""成就系统"之类的东西时会很麻烦。可以改成战斗模块发事件（`monsterKilled`、`itemUsed`），game.js 监听事件再改状态。
2. **存档版本号 + 迁移脚本**：现在 `save.json` 没有 `version` 字段，改数据结构后老存档直接炸。加个 `"version": 1`，然后写迁移函数把老版本升到新版本。
3. **房间 ID 解耦**：目前 `room.exits` 存的是数组下标，删房间或重新排序会全部错位。改成 UUID 或单独的 id 字段更安全。
4. **命令解析抽成模块**：`processCommand` 现在有 200 行的 switch，以后指令多了会很难维护。可以改成注册制：`commands.register('go', handler)`。
5. **不可变数据**：目前所有模块直接改 `player` 和 `rooms` 的引用，调试时很难追踪谁改了状态。换成 immer 或者统一由 game.js 做状态变更会更稳。
6. **测试文件**：现在没有正式的测试框架，测试脚本跑完就删。可以加 Jest 或者 Mocha，把上面那些验证场景写成单元测试。
