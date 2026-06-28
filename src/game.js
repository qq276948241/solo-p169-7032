const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SAVE_FILE = path.join(__dirname, '..', 'save.json');

const DIRECTIONS = ['north', 'south', 'east', 'west'];
const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' };

const MONSTERS = [
  { name: '哥布林', hp: 20, atk: 5, exp: 10, goldMin: 3, goldMax: 8 },
  { name: '骷髅兵', hp: 30, atk: 7, exp: 15, goldMin: 5, goldMax: 12 },
  { name: '蝙蝠', hp: 10, atk: 3, exp: 5, goldMin: 1, goldMax: 4 },
  { name: '巨型蜘蛛', hp: 25, atk: 6, exp: 12, goldMin: 4, goldMax: 10 },
  { name: '暗影刺客', hp: 40, atk: 10, exp: 25, goldMin: 10, goldMax: 20 },
];

const ITEMS = {
  potion: { name: '血瓶', type: 'consumable', heal: 30, desc: '恢复30点生命值' },
  key: { name: '钥匙', type: 'key', desc: '可以打开宝箱' },
  sword: { name: '铁剑', type: 'weapon', atk: 5, desc: '攻击力+5' },
  axe: { name: '战斧', type: 'weapon', atk: 8, desc: '攻击力+8' },
  dagger: { name: '匕首', type: 'weapon', atk: 3, desc: '攻击力+3' },
  greatsword: { name: '巨剑', type: 'weapon', atk: 12, desc: '攻击力+12（商店限定）' },
};

const SHOP_ITEMS = [
  { id: 'potion', price: 15 },
  { id: 'key', price: 10 },
  { id: 'sword', price: 30 },
  { id: 'axe', price: 50 },
  { id: 'greatsword', price: 90 },
];

const ROOM_DESC = [
  '一间阴暗潮湿的石室，墙壁上爬满了青苔。',
  '一个废弃的储藏室，散落着破旧的木箱。',
  '弥漫着血腥气味的大厅，地上还有干涸的血迹。',
  '古老的祭坛室，中央有一座残破的石像。',
  '狭窄的走廊，火把的光芒忽明忽暗。',
  '被藤蔓覆盖的房间，几乎看不清前方。',
  '堆满骸骨的墓穴，令人毛骨悚然。',
  '闪烁着幽蓝光芒的神秘房间。',
  '破旧的守卫室，生锈的盔甲东倒西歪。',
  '烟雾缭绕的炼丹房，空气中有奇怪的药味。',
];

const SKULL = `
          _______
         /       \\
        |  X   X  |
        |    >    |
        |  \\___/  |
         \\_______/
        /|       |\\
       / |       | \\
      |  |  RIP  |  |
      |  |       |  |
       \\_|_______|_/
          \\   /
           \\ /
            V
`;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMap() {
  const rooms = [];
  const roomCount = randInt(10, 14);

  for (let i = 0; i < roomCount; i++) {
    rooms.push({
      id: i,
      desc: choice(ROOM_DESC),
      exits: {},
      monster: null,
      chest: null,
      trap: null,
      isExit: false,
      isStart: i === 0,
      isShop: false,
      visited: false,
    });
  }

  rooms[0].visited = true;
  rooms[roomCount - 1].isExit = true;

  const shopCandidates = [];
  for (let i = 1; i < roomCount - 1; i++) shopCandidates.push(i);
  const shopId = choice(shopCandidates);
  rooms[shopId].isShop = true;
  rooms[shopId].desc = '一间点着暖黄油灯的小屋，柜台后站着一位神秘商人。墙上挂满了各式武器和药水。';

  const visited = [0];
  const unvisited = [];
  for (let i = 1; i < roomCount; i++) unvisited.push(i);

  while (unvisited.length > 0) {
    const fromId = choice(visited);
    const toId = unvisited.shift();
    const dir = choice(DIRECTIONS.filter(d => !rooms[fromId].exits[d]));

    rooms[fromId].exits[dir] = toId;
    rooms[toId].exits[OPPOSITE[dir]] = fromId;
    visited.push(toId);
  }

  const extraLinks = randInt(2, 4);
  for (let i = 0; i < extraLinks; i++) {
    const a = randInt(0, roomCount - 1);
    const b = randInt(0, roomCount - 1);
    if (a === b) continue;
    const availableDirs = DIRECTIONS.filter(d => !rooms[a].exits[d] && !rooms[b].exits[OPPOSITE[d]]);
    if (availableDirs.length === 0) continue;
    const dir = choice(availableDirs);
    rooms[a].exits[dir] = b;
    rooms[b].exits[OPPOSITE[dir]] = a;
  }

  for (let i = 1; i < roomCount - 1; i++) {
    const r = rooms[i];
    if (r.isShop) continue;
    const roll = Math.random();
    if (roll < 0.45) {
      const m = choice(MONSTERS);
      r.monster = { ...m, maxHp: m.hp };
    } else if (roll < 0.7) {
      r.chest = {
        opened: false,
        locked: Math.random() < 0.5,
        contents: generateChestContents(),
      };
    } else if (roll < 0.85) {
      r.trap = { damage: randInt(5, 15), triggered: false };
    }
  }

  return rooms;
}

function generateChestContents() {
  const items = [];
  const count = randInt(1, 2);
  const pool = ['potion', 'potion', 'key', 'sword', 'dagger', 'axe'];
  for (let i = 0; i < count; i++) {
    items.push(choice(pool));
  }
  return items;
}

function createPlayer() {
  return {
    hp: 100,
    maxHp: 100,
    baseAtk: 10,
    currentRoom: 0,
    inventory: [],
    weapon: null,
    gold: 0,
    deaths: 0,
  };
}

function getPlayerAtk(player) {
  let atk = player.baseAtk;
  if (player.weapon) atk += ITEMS[player.weapon].atk;
  return atk;
}

function addItem(player, itemId) {
  if (player.inventory.length >= 5) {
    return { success: false, msg: '背包已满！最多5格。' };
  }
  player.inventory.push(itemId);
  return { success: true, msg: `获得了 ${chalk.yellow(ITEMS[itemId].name)}！` };
}

function describeShop(player) {
  const W = 43;
  const pad = (s, len) => {
    let plain = s.replace(/\u001b\[[0-9;]*m/g, '');
    return s + ' '.repeat(Math.max(0, len - plain.length));
  };
  const border = chalk.yellow('╔' + '═'.repeat(W) + '╗');
  const borderEnd = chalk.yellow('╚' + '═'.repeat(W) + '╝');
  const line = chalk.yellow('╠' + '═'.repeat(W) + '╣');
  const wrap = (content) => chalk.yellow('║') + content + chalk.yellow('║');

  let out = `\n${border}\n`;
  out += wrap(pad('          ' + chalk.white.bold('🛒  地  牢  商  店'), W)) + '\n';
  out += line + '\n';
  out += wrap(pad('  ' + chalk.white('你的金币:') + ' ' + chalk.yellow('💰 ' + player.gold), W)) + '\n';
  out += line + '\n';
  SHOP_ITEMS.forEach((s, i) => {
    const it = ITEMS[s.id];
    const row = '  ' + chalk.white(String(i + 1).padStart(2, ' ') + '.') + ' ' +
      chalk.yellow(it.name.padEnd(6, ' ')) + '  ' +
      chalk.gray(it.desc.padEnd(18, ' ')) + '  ' +
      chalk.yellow('💰' + String(s.price).padStart(3, ' '));
    out += wrap(pad(row, W)) + '\n';
  });
  out += line + '\n';
  out += wrap(pad('  ' + chalk.gray('输入: buy potion / buy sword 等'), W)) + '\n';
  out += borderEnd;
  return out;
}

function buyItem(player, itemId) {
  const entry = SHOP_ITEMS.find(s => s.id === itemId);
  if (!entry) return { success: false, msg: '商店里没有这件商品。' };
  if (player.gold < entry.price) return { success: false, msg: `金币不足！需要 ${entry.price} 金币。` };
  if (player.inventory.length >= 5) return { success: false, msg: '背包已满！最多5格。' };
  player.gold -= entry.price;
  player.inventory.push(itemId);
  return { success: true, msg: `购买成功！花费 ${entry.price} 金币，获得了 ${chalk.yellow(ITEMS[itemId].name)}。剩余金币: ${player.gold}` };
}

function describeRoom(rooms, player) {
  const room = rooms[player.currentRoom];
  let out = '\n' + chalk.gray('═══════════════════════════════════') + '\n';
  out += chalk.gray(room.desc) + '\n';

  const exits = Object.keys(room.exits);
  if (exits.length > 0) {
    out += chalk.gray(`可见出口: ${exits.map(e => chalk.white(e)).join('、')}`) + '\n';
  }

  if (room.isShop) {
    out += chalk.yellow('🛒  这里是地牢商店！输入 "shop" 查看商品，"buy [物品名]" 购买。') + '\n';
  }
  if (room.monster) {
    out += chalk.red(`⚠  一只 ${room.monster.name} 出现了！(HP:${room.monster.hp}/${room.monster.maxHp} ATK:${room.monster.atk})`) + '\n';
  }
  if (room.chest && !room.chest.opened) {
    out += chalk.yellow(`✦  发现一个${room.chest.locked ? '上锁的' : ''}宝箱！`) + '\n';
  }
  if (room.trap && room.trap.triggered) {
    out += chalk.gray('地上有一个被触发过的陷阱...') + '\n';
  }
  if (room.isExit) {
    out += chalk.yellow('★  这里有通往下一层的出口！输入 "exit" 离开地牢。') + '\n';
  }
  if (room.isStart) {
    out += chalk.gray('（这里是地牢入口）') + '\n';
  }

  out += chalk.gray('═══════════════════════════════════');
  return out;
}

function describePlayer(player) {
  const weapon = player.weapon ? ITEMS[player.weapon].name : '无';
  const inv = player.inventory.length > 0
    ? player.inventory.map(id => chalk.yellow(ITEMS[id].name)).join('、')
    : chalk.gray('空');
  return `${chalk.white('【状态】')} HP:${chalk.red(player.hp + '/' + player.maxHp)}  ATK:${chalk.red(getPlayerAtk(player))}  武器:${chalk.yellow(weapon)}  ${chalk.yellow('金币:' + player.gold)}\n${chalk.white('【背包】')} (${player.inventory.length}/5) ${inv}`;
}

function combat(rooms, player, rl, onDone) {
  const room = rooms[player.currentRoom];
  const monster = room.monster;

  function turn() {
    if (!room.monster) { onDone('win'); return; }
    if (player.hp <= 0) { onDone('lose'); return; }

    rl.question(chalk.white('\n战斗指令 [attack / use potion / flee]: '), (input) => {
      const cmd = input.trim().toLowerCase();

      if (cmd === 'attack' || cmd === 'a') {
        const dmg = randInt(getPlayerAtk(player) - 2, getPlayerAtk(player) + 2);
        monster.hp -= dmg;
        console.log(chalk.red(`你对 ${monster.name} 造成了 ${dmg} 点伤害！`));
        if (monster.hp <= 0) {
          console.log(chalk.red(`${monster.name} 被击败了！`));
          if (Math.random() < 0.8) {
            const gold = randInt(monster.goldMin, monster.goldMax);
            player.gold += gold;
            console.log(chalk.yellow(`💰  获得了 ${gold} 枚金币！当前金币: ${player.gold}`));
          }
          room.monster = null;
          onDone('win');
          return;
        }
        monsterAttack();
      } else if (cmd.startsWith('use') && cmd.includes('potion')) {
        const idx = player.inventory.indexOf('potion');
        if (idx === -1) {
          console.log(chalk.red('你没有血瓶！'));
          turn();
          return;
        }
        player.inventory.splice(idx, 1);
        const heal = ITEMS.potion.heal;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        console.log(chalk.yellow(`使用了血瓶，恢复了 ${heal} 点HP！当前HP: ${player.hp}/${player.maxHp}`));
        monsterAttack();
      } else if (cmd === 'flee' || cmd === 'f') {
        if (Math.random() < 0.5) {
          console.log(chalk.yellow('逃跑成功！'));
          onDone('flee');
          return;
        } else {
          console.log(chalk.red('逃跑失败！'));
          monsterAttack();
        }
      } else {
        console.log(chalk.red('无效指令。战斗中可用: attack, use potion, flee'));
        turn();
      }
    });
  }

  function monsterAttack() {
    const dmg = randInt(monster.atk - 1, monster.atk + 2);
    player.hp -= dmg;
    console.log(chalk.red(`${monster.name} 对你造成了 ${dmg} 点伤害！你的HP: ${Math.max(0, player.hp)}/${player.maxHp}`));
    setTimeout(turn, 200);
  }

  console.log(chalk.red(`\n⚔  战斗开始！你遭遇了 ${monster.name}！`));
  turn();
}

function handleDeath(player, rooms, rl, onRespawn) {
  console.log(chalk.red(SKULL));
  console.log(chalk.red('你死了...'));
  player.deaths++;
  player.hp = Math.floor(player.maxHp / 2);
  player.currentRoom = 0;
  console.log(chalk.yellow(`你在地牢入口复活了，但失去了一半生命值。(HP: ${player.hp}/${player.maxHp})`));
  rl.question(chalk.white('按回车继续...'), () => onRespawn());
}

function saveGame(rooms, player) {
  const data = { rooms, player, savedAt: Date.now() };
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, msg: '游戏已保存！' };
  } catch (e) {
    return { success: false, msg: '保存失败: ' + e.message };
  }
}

function loadGame() {
  try {
    if (!fs.existsSync(SAVE_FILE)) return { success: false, msg: '没有找到存档文件。' };
    const raw = fs.readFileSync(SAVE_FILE, 'utf8');
    const data = JSON.parse(raw);
    return { success: true, data };
  } catch (e) {
    return { success: false, msg: '读档失败: ' + e.message };
  }
}

function mainMenu(rl, onStart) {
  console.log(chalk.yellow('\n╔═══════════════════════════════════╗'));
  console.log(chalk.yellow('║      ⚔  文字地牢探险  ⚔         ║'));
  console.log(chalk.yellow('╚═══════════════════════════════════╝\n'));
  console.log(chalk.white('  1) 新游戏'));
  console.log(chalk.white('  2) 读取存档'));
  console.log(chalk.white('  3) 退出\n'));

  rl.question(chalk.white('请选择 [1-3]: '), (input) => {
    const choice = input.trim();
    if (choice === '1') {
      const rooms = generateMap();
      const player = createPlayer();
      onStart(rooms, player);
    } else if (choice === '2') {
      const res = loadGame();
      if (!res.success) {
        console.log(chalk.red(res.msg));
        mainMenu(rl, onStart);
      } else {
        console.log(chalk.yellow('读档成功！'));
        onStart(res.data.rooms, res.data.player);
      }
    } else if (choice === '3') {
      console.log(chalk.gray('再见！'));
      rl.close();
      process.exit(0);
    } else {
      console.log(chalk.red('无效选择。'));
      mainMenu(rl, onStart);
    }
  });
}

function processCommand(rooms, player, rl, cmd, onLoop, onExit) {
  const room = rooms[player.currentRoom];
  const parts = cmd.trim().toLowerCase().split(/\s+/);
  const action = parts[0];

  if (room.monster && !['attack', 'a', 'use', 'flee', 'f', 'help', 'h', 'save'].includes(action)) {
    console.log(chalk.red('有怪物挡路！先战斗吧。可用 attack / use potion / flee'));
    onLoop();
    return;
  }

  switch (action) {
    case 'go':
    case 'g': {
      const dir = parts[1];
      if (!DIRECTIONS.includes(dir)) {
        console.log(chalk.red('无效方向。可用: north, south, east, west'));
        break;
      }
      if (!room.exits[dir]) {
        console.log(chalk.red('那个方向没有出口。'));
        break;
      }
      player.currentRoom = room.exits[dir];
      rooms[player.currentRoom].visited = true;
      const newRoom = rooms[player.currentRoom];
      console.log(chalk.gray(`你向 ${dir} 走去...`));

      if (newRoom.trap && !newRoom.trap.triggered) {
        newRoom.trap.triggered = true;
        player.hp -= newRoom.trap.damage;
        console.log(chalk.red(`你踩到了陷阱！受到 ${newRoom.trap.damage} 点伤害！HP: ${Math.max(0, player.hp)}/${player.maxHp}`));
        if (player.hp <= 0) {
          handleDeath(player, rooms, rl, onLoop);
          return;
        }
      }
      break;
    }
    case 'attack':
    case 'a': {
      if (!room.monster) {
        console.log(chalk.red('这里没有怪物可以攻击。'));
        break;
      }
      combat(rooms, player, rl, (result) => {
        if (result === 'lose') {
          handleDeath(player, rooms, rl, onLoop);
          return;
        }
        onLoop();
      });
      return;
    }
    case 'use': {
      const item = parts[1];
      if (item === 'potion') {
        const idx = player.inventory.indexOf('potion');
        if (idx === -1) {
          console.log(chalk.red('你没有血瓶！'));
          break;
        }
        player.inventory.splice(idx, 1);
        const heal = ITEMS.potion.heal;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        console.log(chalk.yellow(`使用了血瓶，恢复了 ${heal} 点HP！当前HP: ${player.hp}/${player.maxHp}`));
      } else if (item === 'key') {
        if (!room.chest || room.chest.opened) {
          console.log(chalk.red('这里没有可开启的宝箱。'));
          break;
        }
        if (!room.chest.locked) {
          console.log(chalk.yellow('宝箱并没有上锁。用 open 即可。'));
          break;
        }
        const idx = player.inventory.indexOf('key');
        if (idx === -1) {
          console.log(chalk.red('你没有钥匙！'));
          break;
        }
        player.inventory.splice(idx, 1);
        room.chest.locked = false;
        console.log(chalk.yellow('你用钥匙打开了宝箱！现在可以用 open 打开。'));
      } else if (item && ITEMS[item] && ITEMS[item].type === 'weapon') {
        const idx = player.inventory.indexOf(item);
        if (idx === -1) {
          console.log(chalk.red('你没有这件武器。'));
          break;
        }
        if (player.weapon) {
          if (player.inventory.length >= 5) {
            console.log(chalk.red('背包已满，无法换下当前武器。'));
            break;
          }
          player.inventory.push(player.weapon);
        }
        player.inventory.splice(idx, 1);
        player.weapon = item;
        console.log(chalk.yellow(`装备了 ${ITEMS[item].name}！攻击力变为 ${getPlayerAtk(player)}`));
      } else {
        console.log(chalk.red('无法使用该物品。'));
      }
      break;
    }
    case 'open': {
      if (!room.chest) {
        console.log(chalk.red('这里没有宝箱。'));
        break;
      }
      if (room.chest.opened) {
        console.log(chalk.red('宝箱已经被打开过了。'));
        break;
      }
      if (room.chest.locked) {
        console.log(chalk.red('宝箱是锁着的，需要用钥匙 (use key)。'));
        break;
      }
      room.chest.opened = true;
      console.log(chalk.yellow('你打开了宝箱！'));
      for (const itemId of room.chest.contents) {
        const r = addItem(player, itemId);
        console.log(r.msg);
      }
      break;
    }
    case 'shop':
    case 's': {
      if (!room.isShop) {
        console.log(chalk.red('这里不是商店。'));
        break;
      }
      console.log(describeShop(player));
      break;
    }
    case 'buy':
    case 'b': {
      if (!room.isShop) {
        console.log(chalk.red('这里不是商店，无法购买。'));
        break;
      }
      const item = parts[1];
      if (!item) {
        console.log(chalk.red('请输入要购买的物品，例如: buy potion'));
        console.log(describeShop(player));
        break;
      }
      const r = buyItem(player, item);
      console.log(r.success ? chalk.yellow(r.msg) : chalk.red(r.msg));
      break;
    }
    case 'inventory':
    case 'inv':
    case 'i': {
      console.log(describePlayer(player));
      break;
    }
    case 'look':
    case 'l': {
      console.log(describeRoom(rooms, player));
      break;
    }
    case 'save': {
      const r = saveGame(rooms, player);
      console.log(r.success ? chalk.yellow(r.msg) : chalk.red(r.msg));
      break;
    }
    case 'exit': {
      if (!room.isExit) {
        console.log(chalk.red('这里不是出口。'));
        break;
      }
      console.log(chalk.yellow('\n★  恭喜你逃出了地牢！你胜利了！\n'));
      console.log(chalk.white(`死亡次数: ${player.deaths}`));
      console.log(chalk.white(`剩余金币: ${player.gold}`));
      onExit();
      return;
    }
    case 'help':
    case 'h': {
      console.log(chalk.white('\n可用指令:'));
      console.log('  go [north/south/east/west]  - 移动 (简写 g)');
      console.log('  attack / a                  - 攻击怪物');
      console.log('  use [potion/key/武器名]     - 使用或装备物品');
      console.log('  open                        - 打开宝箱');
      console.log('  flee / f                    - 战斗中逃跑');
      console.log('  shop / s                    - 在商店查看商品');
      console.log('  buy [物品名] / b [物品名]   - 在商店购买物品 (例: buy potion)');
      console.log('  inventory / inv / i         - 查看背包和状态(含金币)');
      console.log('  look / l                    - 查看当前房间');
      console.log('  save                        - 保存游戏');
      console.log('  exit                        - 在出口离开地牢');
      console.log('  help / h                    - 显示帮助');
      break;
    }
    default:
      console.log(chalk.red('未知指令。输入 help 查看帮助。'));
  }

  if (player.hp <= 0) {
    handleDeath(player, rooms, rl, onLoop);
    return;
  }
  onLoop();
}

function gameLoop(rooms, player, rl) {
  console.log(describeRoom(rooms, player));
  console.log(describePlayer(player));

  rl.question(chalk.white('\n> '), (input) => {
    if (!input.trim()) { gameLoop(rooms, player, rl); return; }
    processCommand(rooms, player, rl, input,
      () => gameLoop(rooms, player, rl),
      () => {
        rl.question(chalk.white('\n按回车返回主菜单...'), () => mainMenu(rl, startGame));
      }
    );
  });
}

function startGame(rooms, player) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  gameLoop(rooms, player, rl);
}

function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  mainMenu(rl, (rooms, player) => {
    rl.close();
    startGame(rooms, player);
  });
}

module.exports = { main, generateMap, createPlayer, saveGame, loadGame, buyItem, describeShop };
