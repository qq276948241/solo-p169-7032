const chalk = require('chalk');
const { DIRECTIONS, OPPOSITE, MONSTERS, ROOM_DESC } = require('./data');
const { randInt, choice } = require('./utils');

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

module.exports = { generateMap, generateChestContents, describeRoom };
