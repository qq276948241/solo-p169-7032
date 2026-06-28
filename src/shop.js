const chalk = require('chalk');
const { ITEMS, SHOP_ITEMS } = require('./data');
const { INVENTORY_MAX } = require('./player');

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
  if (player.inventory.length >= INVENTORY_MAX) return { success: false, msg: '背包已满！最多5格。' };
  player.gold -= entry.price;
  player.inventory.push(itemId);
  return { success: true, msg: `购买成功！花费 ${entry.price} 金币，获得了 ${chalk.yellow(ITEMS[itemId].name)}。剩余金币: ${player.gold}` };
}

module.exports = { describeShop, buyItem };
