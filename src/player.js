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

function useItem(player, itemId) {
  const idx = player.inventory.indexOf(itemId);
  if (idx === -1) {
    return { success: false, msg: `你没有 ${ITEMS[itemId] ? ITEMS[itemId].name : itemId}！` };
  }

  const item = ITEMS[itemId];
  if (!item) {
    return { success: false, msg: '未知物品。' };
  }

  if (item.type === 'consumable' && item.heal) {
    if (player.hp >= player.maxHp) {
      return { success: false, msg: '你的生命值已满，无需使用血瓶！', consumed: false };
    }
    const actualHeal = Math.min(item.heal, player.maxHp - player.hp);
    player.inventory.splice(idx, 1);
    player.hp = Math.min(player.maxHp, player.hp + item.heal);
    return { success: true, msg: `使用了血瓶，恢复了 ${actualHeal} 点HP！当前HP: ${player.hp}/${player.maxHp}`, consumed: true };
  }

  if (item.type === 'weapon') {
    if (player.weapon === itemId) {
      return { success: false, msg: `你已经装备了 ${item.name}。`, consumed: false };
    }
    if (player.weapon && player.inventory.length >= INVENTORY_MAX) {
      return { success: false, msg: '背包已满，无法换下当前武器。', consumed: false };
    }
    if (player.weapon) {
      player.inventory.push(player.weapon);
    }
    player.inventory.splice(idx, 1);
    player.weapon = itemId;
    return { success: true, msg: `装备了 ${item.name}！攻击力变为 ${getPlayerAtk(player)}`, consumed: true };
  }

  return { success: false, msg: '该物品无法直接使用。', consumed: false };
}

function describePlayer(player) {
  const weapon = player.weapon ? ITEMS[player.weapon].name : '无';
  const inv = player.inventory.length > 0
    ? player.inventory.map(id => chalk.yellow(ITEMS[id].name)).join('、')
    : chalk.gray('空');
  return `${chalk.white('【状态】')} HP:${chalk.red(player.hp + '/' + player.maxHp)}  ATK:${chalk.red(getPlayerAtk(player))}  武器:${chalk.yellow(weapon)}  ${chalk.yellow('金币:' + player.gold)}\n${chalk.white('【背包】')} (${player.inventory.length}/${INVENTORY_MAX}) ${inv}`;
}

module.exports = { createPlayer, getPlayerAtk, addItem, useItem, describePlayer, INVENTORY_MAX };
