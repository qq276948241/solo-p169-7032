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

module.exports = { DIRECTIONS, OPPOSITE, MONSTERS, ITEMS, SHOP_ITEMS, ROOM_DESC, SKULL };
