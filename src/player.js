const chalk = require('chalk');
const { ITEMS } = require('./data');

const INVENTORY_MAX = 5;

function getPlayerAtk(player) {
  let atk = player.baseAtk;
  if (player.weapon) atk += ITEMS[player.weapon].atk;
  return atk;
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

function addItem(player, itemId) {
  if (player.inventory.length >= INVENTORY_MAX) {
    return { success: false, msg: '背包已满！最多5格。' };
  }
  player.inventory.push(itemId);
  return { success: true, msg: `获得了 ${chalk.yellow(ITEMS[itemId].name)}！` };
}

function describePlayer(player) {
  const weapon = player.weapon ? ITEMS[player.weapon].name : '无';
  const inv = player.inventory.length > 0
    ? player.inventory.map(id => chalk.yellow(ITEMS[id].name)).join('、')
    : chalk.gray('空');
  return `${chalk.white('【状态】')} HP:${chalk.red(player.hp + '/' + player.maxHp)}  ATK:${chalk.red(getPlayerAtk(player))}  武器:${chalk.yellow(weapon)}  ${chalk.yellow('金币:' + player.gold)}\n${chalk.white('【背包】')} (${player.inventory.length}/${INVENTORY_MAX}) ${inv}`;
}

module.exports = { createPlayer, getPlayerAtk, addItem, describePlayer, INVENTORY_MAX };
