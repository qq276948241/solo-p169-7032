const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { DIRECTIONS, ITEMS } = require('./data');
const { createPlayer, getPlayerAtk, addItem, describePlayer } = require('./player');
const { generateMap, describeRoom } = require('./map');
const { combat, handleDeath } = require('./combat');
const { describeShop, buyItem } = require('./shop');

const SAVE_FILE = path.join(__dirname, '..', 'save.json');

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
          handleDeath(player, rl, onLoop);
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
          handleDeath(player, rl, onLoop);
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
    handleDeath(player, rl, onLoop);
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
