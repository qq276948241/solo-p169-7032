const chalk = require('chalk');
const { ITEMS, SKULL } = require('./data');
const { randInt } = require('./utils');
const { getPlayerAtk, useItem } = require('./player');

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
            const before = player.gold;
            const goldDrop = randInt(monster.goldMin, monster.goldMax);
            player.gold += goldDrop;
            const after = player.gold;
            const actualGain = after - before;
            console.log(chalk.yellow(`💰  获得了 ${actualGain} 枚金币！( ${before} → ${after} )`));
          }
          room.monster = null;
          onDone('win');
          return;
        }
        monsterAttack();
      } else if (cmd.startsWith('use') && cmd.includes('potion')) {
        const r = useItem(player, 'potion');
        console.log(r.success ? chalk.yellow(r.msg) : chalk.red(r.msg));
        if (!r.consumed && !r.success) {
          turn();
          return;
        }
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

function handleDeath(player, rl, onRespawn) {
  console.log(chalk.red(SKULL));
  console.log(chalk.red('你死了...'));
  player.deaths++;
  player.hp = Math.floor(player.maxHp / 2);
  player.currentRoom = 0;
  console.log(chalk.yellow(`你在地牢入口复活了，但失去了一半生命值。(HP: ${player.hp}/${player.maxHp})`));
  rl.question(chalk.white('按回车继续...'), () => onRespawn());
}

module.exports = { combat, handleDeath };
