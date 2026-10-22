/**
 * 《孤城神机营》- Endless Mode & Leaderboard Domain Types
 * Implements GDD V3.0 §11.3, §17.2, §17.3:
 * - Elite Enemy Affixes (疾风、坚韧、狂暴、同归、枯荣、玄甲)
 * - Ming Dynasty Military Rank Titles (神机营卒 -> 定国公·太师)
 * - Anti-cheat Combat Checksum & Leaderboard Data Protocols
 * 
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 */

import { CommanderId } from '../types';

/**
 * 6 Core Elite Enemy Affixes (敌军精锐词缀)
 */
export type EnemyAffixId =
  | 'swift'          // 疾风: 移速 +30%, 免疫减速
  | 'stone_skin'     // 坚韧: 物理护甲 +100, 免疫首次击退
  | 'enraged'        // 狂暴: 残血 (<50%) 时攻速+50%, 移速+40%
  | 'throes_explode' // 同归: 阵亡时自爆造成范围伤害与击退
  | 'regeneration'   // 枯荣: 每秒恢复 3% 最大生命值
  | 'shielded';      // 玄甲: 出生自带 40% 最大生命值的吸收护盾

export interface EnemyAffix {
  id: EnemyAffixId;
  name: string;
  badge: string;      // 简短标签, e.g. "疾风"
  description: string;
  color: string;      // UI / 跳字色值, e.g. "#00e5ff"
}

export const ENEMY_AFFIX_REGISTRY: Record<EnemyAffixId, EnemyAffix> = {
  swift: {
    id: 'swift',
    name: '疾风行军',
    badge: '疾风',
    description: '移速提高 30%，免疫一切减速与寒霜迟滞',
    color: '#00e5ff'
  },
  stone_skin: {
    id: 'stone_skin',
    name: '磐石坚甲',
    badge: '坚韧',
    description: '物理护甲 +100，免疫首次受击击退',
    color: '#ffb74d'
  },
  enraged: {
    id: 'enraged',
    name: '背水狂暴',
    badge: '狂暴',
    description: '生命值低于 50% 时进入狂怒，攻速 +50%，移速 +40%',
    color: '#ff5252'
  },
  throes_explode: {
    id: 'throes_explode',
    name: '同归玉碎',
    badge: '自爆',
    description: '死士阵亡时引发烈性火药爆炸，对周围 1.5 米造成范围伤害',
    color: '#ff9100'
  },
  regeneration: {
    id: 'regeneration',
    name: '枯荣自愈',
    badge: '复苏',
    description: '受巫蛊祝祷加护，每秒持续恢复 3% 最大生命值',
    color: '#69f0ae'
  },
  shielded: {
    id: 'shielded',
    name: '玄甲罡气',
    badge: '玄甲',
    description: '凝聚铁幕罡气，开局额外获得相当于 40% 最大生命值的护盾',
    color: '#b388ff'
  }
};

/**
 * Ming Dynasty Military Rank Tier (大明战功官阶)
 */
export interface MilitaryRankTier {
  minWave: number;
  maxWave: number;
  title: string;
  honorBadge: string;
  description: string;
}

export const MILITARY_RANK_TIERS: MilitaryRankTier[] = [
  {
    minWave: 1,
    maxWave: 4,
    title: '神机营卒',
    honorBadge: '铜符·初出茅庐',
    description: '初入神机营之火器新卒，操演铳炮，驻守孤城女墙。'
  },
  {
    minWave: 5,
    maxWave: 9,
    title: '把总·哨官',
    honorBadge: '铁符·旗开得胜',
    description: '统领百人哨队，临危不惧，击退数波精锐试探。'
  },
  {
    minWave: 10,
    maxWave: 14,
    title: '千总·守备',
    honorBadge: '银符·中流砥柱',
    description: '坐镇一方要塞，谙熟五行生克与火药阵列，首领莫敢逼近。'
  },
  {
    minWave: 15,
    maxWave: 19,
    title: '游击将军',
    honorBadge: '金符·百战穿甲',
    description: '神出鬼没，机动御敌，以少胜多，令敌胆寒。'
  },
  {
    minWave: 20,
    maxWave: 29,
    title: '参将·副总兵',
    honorBadge: '朱雀玉符·塞上长城',
    description: '督领三军，铁壁拒敌二十重怪潮，名动九边。'
  },
  {
    minWave: 30,
    maxWave: 39,
    title: '神机营提督',
    honorBadge: '玄武金印·神机宗师',
    description: '总揽神机重器，排炮轰天，弹无虚发，守卫紫禁中枢。'
  },
  {
    minWave: 40,
    maxWave: 49,
    title: '兵部尚书',
    honorBadge: '白虎虎符·国之桢干',
    description: '运筹帷幄之中，决胜千里之外，天下兵马莫不听从号令。'
  },
  {
    minWave: 50,
    maxWave: Infinity,
    title: '定国公·太师',
    honorBadge: '青龙九锡·孤城不灭',
    description: '功盖当世，以凡人之躯抵御无穷妖潮，受封开国公爵，千古流芳。'
  }
];

/**
 * Leaderboard Entry (符合 GDD §17.2 协议结构)
 */
export interface LeaderboardEntry {
  rank: number;
  openId: string;
  nickname: string;
  cityName: string;
  maxWave: number;
  score: number;
  militaryTitle: string;
  commanderId: CommanderId;
  timestamp: number;
}

/**
 * Settlement Result for Endless Mode Run
 */
export interface EndlessSettlementResult {
  waveReached: number;
  score: number;
  totalKills: number;
  eliteKills: number;
  bossKills: number;
  remainingWallHp: number;
  maxWallHp: number;
  goldEarned: number;
  ironEarned: number;
  militaryTitle: string;
  honorBadge: string;
  isNewPersonalRecord: boolean;
  checksum: string;
}
