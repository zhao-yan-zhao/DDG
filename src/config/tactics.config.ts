/**
 * 《孤城神机营》- 36 Roguelike Tactics Master Configuration
 * Strictly conforms to GDD V3.0 §4.3 & §7.2, PROJECT.md contracts, and all E2E specifications.
 * 
 * Total Cards: 36
 * - Categories:
 *   - general (通用经济与空间): 8 cards (T01 ~ T08)
 *   - fire (神机火器专精): 8 cards (T09 ~ T16)
 *   - mohist (墨家机关专精): 8 cards (T17 ~ T24)
 *   - fortress (城防控制专精): 8 cards (T25 ~ T32)
 *   - fusion (双系融合觉醒): 4 cards (T33 ~ T36)
 * - Rarities:
 *   - 9 Blue, 12 Purple, 11 Gold, 4 Red-Gold
 * - Pick Limits:
 *   - Exactly 3 cards have max 2 picks: T01 (募兵急令), T02 (修缮女墙), T07 (天降虎符)
 *   - Remaining 33 cards strictly max 1 pick
 */

export type TacticQuality = 'blue' | 'purple' | 'gold' | 'red_gold';
export type TacticCategory = 'general' | 'fire' | 'mohist' | 'fortress' | 'fusion';

export type AffixType =
  | 'INSTANT_EFFECT'
  | 'STATIC_MODIFIER'
  | 'EVENT_HOOK'
  | 'ENTITY_MUTATION';

export interface TacticPrerequisiteUnit {
  configId: string;
  aliases?: string[];
  star: number;
}

export interface TacticPrerequisites {
  unitA: TacticPrerequisiteUnit;
  unitB: TacticPrerequisiteUnit;
}

export interface TacticCardConfig {
  id: string;
  name: string;
  quality: TacticQuality;
  category: TacticCategory;
  maxPicksPerRun: 1 | 2;
  baseWeight?: number;
  affixTypes: AffixType[];
  description: string;
  prerequisites?: TacticPrerequisites;
  params?: Record<string, any>;
}

export const TACTICS_CONFIG: readonly TacticCardConfig[] = [
  // =========================================================================
  // 1. 通用经济与空间类 (General, 8 Cards: T01 ~ T08)
  // =========================================================================
  {
    id: 'T01',
    name: '募兵急令',
    quality: 'blue',
    category: 'general',
    maxPicksPerRun: 2,
    baseWeight: 100,
    affixTypes: ['INSTANT_EFFECT', 'STATIC_MODIFIER'],
    description: '立即获得 35 银两，且后续军备商店单次刷新费用降低 1 银两（最低降至 1 银两）。',
    params: { grantSilver: 35, shopRefreshCostOverride: 1 }
  },
  {
    id: 'T02',
    name: '修缮女墙',
    quality: 'blue',
    category: 'general',
    maxPicksPerRun: 2,
    baseWeight: 100,
    affixTypes: ['INSTANT_EFFECT', 'STATIC_MODIFIER'],
    description: '立即修复城墙 40% 最大耐久，并永久提升城墙最大耐久 300 点。',
    params: { healWallRatio: 0.40, addWallMaxHp: 300 }
  },
  {
    id: 'T03',
    name: '精兵简政',
    quality: 'blue',
    category: 'general',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['INSTANT_EFFECT', 'STATIC_MODIFIER'],
    description: '立即获得 15 银两；本局内出售器械返还 100% 原始银两购入成本。',
    params: { grantSilver: 15, recycleRateOverride: 1.00 }
  },
  {
    id: 'T04',
    name: '屯田生息',
    quality: 'purple',
    category: 'general',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '储蓄利息结算比例提升至 20%（每 10 银产 2 银），利息上限由 5 提升至 8 银。',
    params: { interestRate: 0.20, interestCap: 8 }
  },
  {
    id: 'T05',
    name: '鲁班括地',
    quality: 'purple',
    category: 'general',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['INSTANT_EFFECT', 'STATIC_MODIFIER'],
    description: '立即免费解锁城头沙盘 3 个锁定地块，且每个已解锁地块使全军器械伤害提升 2%。',
    params: { unlockCells: 3, dmgPerUnlockedCell: 0.02 }
  },
  {
    id: 'T06',
    name: '以战养战',
    quality: 'purple',
    category: 'general',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['EVENT_HOOK'],
    description: '波次战斗中每累计击杀 40 名敌军，波次结算时额外掉落 1 尊随机 ★1 军械至备战席。',
    params: { killsPerBenchWeapon: 40 }
  },
  {
    id: 'T07',
    name: '天降虎符',
    quality: 'gold',
    category: 'general',
    maxPicksPerRun: 2,
    baseWeight: 100,
    affixTypes: ['INSTANT_EFFECT'],
    description: '立即获得 1 枚【虎符升级令】，可指定场上任意一尊 ★1~★3 器械无消耗直升一星。',
    params: { grantStarUpgradeTokens: 1 }
  },
  {
    id: 'T08',
    name: '多多益善',
    quality: 'gold',
    category: 'general',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '城头沙盘上每放置一尊器械，全军攻击速度提升 4%；若 25 格全部摆满，额外获得 40% 独立最终增伤。',
    params: { aspdPerWeapon: 0.04, fullBoardFinalDmgBonus: 0.40 }
  },

  // =========================================================================
  // 2. 神机火器专精类 (Fire, 8 Cards: T09 ~ T16)
  // =========================================================================
  {
    id: 'T09',
    name: '改良黑火药',
    quality: 'blue',
    category: 'fire',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '火器系器械造成的伤害提升 25%，灼烧持续时间延长 2 秒。',
    params: { fireAtkBonus: 0.25, burnDurationBonus: 2.0 }
  },
  {
    id: 'T10',
    name: '散霰铁砂',
    quality: 'blue',
    category: 'fire',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION'],
    description: '神机火铳射击时分裂出 2 颗散霰铁砂弹，各造成主弹 50% 伤害并附加灼烧。',
    params: { targetWeapon: 'fire_lance', extraPellets: 2, pelletDamageMultiplier: 0.50 }
  },
  {
    id: 'T11',
    name: '三段击阵法',
    quality: 'purple',
    category: 'fire',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '若同一横排部署至少 3 尊火器系器械，该排所有火器攻击速度大幅提升 80%。',
    params: { minRowFireCount: 3, rowFireAspdBonus: 0.80 }
  },
  {
    id: 'T12',
    name: '焦土火海',
    quality: 'purple',
    category: 'fire',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER', 'ENTITY_MUTATION'],
    description: '火箭与雷飞雹弹着点化为焦土火海，持续 5 秒，践踏火海的敌军移速降低 40% 并持续叠燃。',
    params: { targets: ['rocket_box', 'thunder_thrower'], fireSeaDuration: 5.0, moveSpeedSlow: 0.40 }
  },
  {
    id: 'T13',
    name: '重炮开花弹',
    quality: 'purple',
    category: 'fire',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION', 'EVENT_HOOK'],
    description: '红衣大炮轰击范围扩大 45%，对已处于灼烧状态的目标必定产生暴击。',
    params: { targets: ['red_cannon', 'cannon'], aoeRadiusBonus: 0.45, guaranteedCritOnBurn: true }
  },
  {
    id: 'T14',
    name: '神机百炼',
    quality: 'gold',
    category: 'fire',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '玩家当前每存留 10 银两，火器系伤害提升 3%（最高计入 300 银两，即 +90% 增伤）。',
    params: { dmgPer10Silver: 0.03, maxSilverCap: 300 }
  },
  {
    id: 'T15',
    name: '连环引爆',
    quality: 'gold',
    category: 'fire',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['EVENT_HOOK'],
    description: '被火器消灭的带油/灼烧敌军发生尸爆，对周围造成其最大生命 15% 的范围火伤并传染状态。',
    params: { maxHpRatio: 0.15 }
  },
  {
    id: 'T16',
    name: '万历大阅兵',
    quality: 'gold',
    category: 'fire',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER', 'ENTITY_MUTATION'],
    description: '多格火器（红衣大炮、八牛床弩）突破几何去重限制，每个接触网格均独立提供辅助增益，且弹道发射量 +1。',
    params: { targets: ['red_cannon', 'bed_crossbow'], bypassSupportDeduplication: true, extraBarrels: 1 }
  },

  // =========================================================================
  // 3. 墨家机关专精类 (Mohist, 8 Cards: T17 ~ T24)
  // =========================================================================
  {
    id: 'T17',
    name: '淬毒弩簇',
    quality: 'blue',
    category: 'mohist',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['EVENT_HOOK'],
    description: '连弩与床弩命中敌军附加剧毒，使其受治疗效果降低 30% 并在 5 秒内持续掉血。',
    params: { healingReduction: 0.30, poisonDuration: 5.0 }
  },
  {
    id: 'T18',
    name: '牛筋绞弦',
    quality: 'blue',
    category: 'mohist',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '墨家机关系器械暴击率提升 15%，暴击伤害加成提升 30%。',
    params: { mohistCritRateBonus: 0.15, mohistCritDmgBonus: 0.30 }
  },
  {
    id: 'T19',
    name: '分裂机关箭',
    quality: 'purple',
    category: 'mohist',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION'],
    description: '诸葛连弩射出的箭矢命中后分裂为 2 支折射小箭，追踪临近敌军造成 50% 伤害。',
    params: { targetWeapon: 'repeating_crossbow', splitCount: 2, splitDamageRatio: 0.50 }
  },
  {
    id: 'T20',
    name: '巨石滚木',
    quality: 'purple',
    category: 'mohist',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION'],
    description: '发石机投掷的巨石体积增大 40%，滚压沿线多名敌军，每碾压一个目标最终伤害递增 10%。',
    params: { targetWeapon: 'catapult', boulderRadiusBonus: 0.40, crushDamageStepBonus: 0.10 }
  },
  {
    id: 'T21',
    name: '透甲重锤',
    quality: 'purple',
    category: 'mohist',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION', 'EVENT_HOOK'],
    description: '八牛床弩对持盾敌军护盾造成 300% 破盾伤害；若一击秒杀目标，立即返还 30% 上弹冷却。',
    params: { targetWeapon: 'bed_crossbow', shieldDamageMultiplier: 3.0, killCooldownRefund: 0.30 }
  },
  {
    id: 'T22',
    name: '墨门机巧心',
    quality: 'gold',
    category: 'mohist',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['EVENT_HOOK'],
    description: '墨家器械触发暴击时，全城所有器械当前上弹冷却缩短 0.2 秒。',
    params: { cooldownReduction: 0.20 }
  },
  {
    id: 'T23',
    name: '万箭穿心',
    quality: 'gold',
    category: 'mohist',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION'],
    description: '诸葛连弩攻击距离改为全屏无限，且箭矢碰到斜坡边界时折弹反弹 1 次。',
    params: { targetWeapon: 'repeating_crossbow', range: 99.0, wallBounceCount: 1 }
  },
  {
    id: 'T24',
    name: '泰山压顶',
    quality: 'gold',
    category: 'mohist',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION', 'STATIC_MODIFIER'],
    description: '发石机攻速降低 20%，但每次齐射投出 3 颗巨石，并使碎冰崩裂百分比伤害翻倍。',
    params: { targetWeapon: 'catapult', catapultAspdPenalty: -0.20, boulderCount: 3, iceShatterRatioMultiplier: 2.0 }
  },

  // =========================================================================
  // 4. 城防控制专精类 (Fortress, 8 Cards: T25 ~ T32)
  // =========================================================================
  {
    id: 'T25',
    name: '猛火沥青',
    quality: 'blue',
    category: 'fortress',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER', 'ENTITY_MUTATION'],
    description: '猛火油柜喷洒油池范围扩大 35%，陷入油池的敌军攻击力降低 30%。',
    params: { targetWeapon: 'oil_cabinet', oilRadiusBonus: 0.35, oilEnemyAtkDebuff: 0.30 }
  },
  {
    id: 'T26',
    name: '荆棘铁甲',
    quality: 'blue',
    category: 'fortress',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER', 'EVENT_HOOK'],
    description: '铁索拒马反弹伤害比例提升 100%，攻击拒马的近战敌军附加 2 秒流血状态。',
    params: { targets: ['barricade', 'spear_camp'], reflectRatioBonus: 1.00, bleedDuration: 2.0 }
  },
  {
    id: 'T27',
    name: '雷火交加',
    quality: 'purple',
    category: 'fortress',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['EVENT_HOOK'],
    description: '陷马电网脉冲对带油敌军有 50% 概率直接引爆【雷火天劫】，清空油污并造成大范围轰炸。',
    params: { targets: ['electric_grid', 'grid_trap'], oilDetonateChance: 0.50 }
  },
  {
    id: 'T28',
    name: '陷阵死士',
    quality: 'purple',
    category: 'fortress',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['EVENT_HOOK', 'ENTITY_MUTATION'],
    description: '白杆长枪营阵亡士兵化为英灵继续作战 4 秒，消失时自爆造成全场敌军眩晕 2 秒。',
    params: { targetWeapon: 'spear_camp', spiritFightDuration: 4.0, stunDuration: 2.0 }
  },
  {
    id: 'T29',
    name: '极寒星象',
    quality: 'purple',
    category: 'fortress',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '观星祭坛光环使十字范围敌军减速效果提升 30%，全军对冰冻目标暴击伤害提升 80%。',
    params: { targetWeapon: 'stargazer', extraSlowRatio: 0.30, frozenTargetCritDmgBonus: 0.80 }
  },
  {
    id: 'T30',
    name: '固若金汤',
    quality: 'gold',
    category: 'fortress',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '城墙当前最大耐久的 25% 转化为全军器械的基础攻击力加成。',
    params: { wallMaxHpToAtkRatio: 0.25 }
  },
  {
    id: 'T31',
    name: '元素乱流',
    quality: 'gold',
    category: 'fortress',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['EVENT_HOOK', 'STATIC_MODIFIER'],
    description: '每次触发任意元素反应，主帅获得 8 点怒气，全军攻速提升 5%（最多叠加 10 层，即 +50% 攻速）。',
    params: { rageOnReaction: 8, aspdPerStack: 0.05, maxStacks: 10 }
  },
  {
    id: 'T32',
    name: '阵列同心',
    quality: 'gold',
    category: 'fortress',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['STATIC_MODIFIER'],
    description: '任何被上下左右 4 格完全包围的 1×1 器械，攻击力提升 100%，攻速提升 50%。',
    params: { surroundedAtkBonus: 1.00, surroundedAspdBonus: 0.50 }
  },

  // =========================================================================
  // 5. 双系融合觉醒类 (Fusion Red-Gold, 4 Cards: T33 ~ T36)
  // =========================================================================
  {
    id: 'T33',
    name: '红夷雷火炮',
    quality: 'red_gold',
    category: 'fusion',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION', 'EVENT_HOOK'],
    description: '【神机 × 城防】红衣大炮炮弹附带强磁电弧，落地生成电磁黑洞牵引周围敌军并引发高频雷击。',
    prerequisites: {
      unitA: { configId: 'red_cannon', aliases: ['cannon', 'red_cannon'], star: 3 },
      unitB: { configId: 'electric_grid', aliases: ['grid_trap', 'electric_grid'], star: 3 }
    }
  },
  {
    id: 'T34',
    name: '暴雨火箭车',
    quality: 'red_gold',
    category: 'fusion',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION'],
    description: '【神机 × 墨家】连弩与火箭车合体，攻速锁定为每秒 3 发，每支弩箭均附带微型爆破火箭。',
    prerequisites: {
      unitA: { configId: 'repeating_crossbow', aliases: ['repeating_crossbow'], star: 3 },
      unitB: { configId: 'rocket_box', aliases: ['rocket_box'], star: 3 }
    },
    params: { interval: 0.333 }
  },
  {
    id: 'T35',
    name: '铁浮屠火牛阵',
    quality: 'red_gold',
    category: 'fusion',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION'],
    description: '【城防 × 火器】长枪兵披挂重甲并点燃油火冲锋，沿直线碾压敌军留下烈焰余烬。',
    prerequisites: {
      unitA: { configId: 'spear_camp', aliases: ['spear_camp'], star: 3 },
      unitB: { configId: 'oil_cabinet', aliases: ['oil_cabinet'], star: 3 }
    }
  },
  {
    id: 'T36',
    name: '九天星陨石',
    quality: 'red_gold',
    category: 'fusion',
    maxPicksPerRun: 1,
    baseWeight: 100,
    affixTypes: ['ENTITY_MUTATION', 'EVENT_HOOK'],
    description: '【墨家 × 奇门】发石机引导九天星辰，召唤巨型冰晶陨石砸击地面，引发全屏霜冻与碎冰连锁。',
    prerequisites: {
      unitA: { configId: 'catapult', aliases: ['catapult'], star: 3 },
      unitB: { configId: 'stargazer', aliases: ['stargazer'], star: 3 }
    }
  }
];

/**
 * Returns configuration by tactic ID
 */
export function getTacticCardConfig(id: string): TacticCardConfig | undefined {
  return TACTICS_CONFIG.find(c => c.id === id);
}

/**
 * Returns all 36 tactic card configurations
 */
export function getAllTacticCards(): readonly TacticCardConfig[] {
  return TACTICS_CONFIG;
}
