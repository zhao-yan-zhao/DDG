/**
 * 《孤城神机营》- Campaign Chapters & Stages Configuration
 * Implements GDD V3.0 §9.1 & §11:
 * - 5 Major Chapters: 潼关初战, 赤壁火峡, 塞外雪原, 夜袭巴蜀, 京师保卫
 * - 20 Sequential Main Stages with wave counts, base wall HP, base enemy multipliers
 * - First clear rewards (Gold, Iron, Blueprints) & Repeat clear rewards
 * - Progression unlock requirements and master unlock descriptors
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

export interface StageRewards {
  gold: number;
  iron: number;
  blueprints: number;
}

export interface StageUnlockRequirement {
  requiredStageId?: number;
  requiredStars?: number;
}

export interface StageConfig {
  stageId: number;                  // 1 .. 20
  chapterId: number;                // 1 .. 5
  stageIndexInChapter: number;      // 1 .. 4
  name: string;                     // e.g. "《风陵渡口》"
  description: string;
  totalWaves: number;               // 6, 8, 10, 12, 15
  wallBaseHp: number;               // 1000, 1200, 1500, 1800, 2200, 2500
  baseEnemyHpMultiplier: number;    // BaseHP scaling factor from GDD §9.1
  firstClearRewards: StageRewards;
  repeatRewards: StageRewards;
  unlockRequirements: StageUnlockRequirement;
  unlockContentDescription?: string; // Text description of unlocked weapon/system
  isBossStage: boolean;
  bossName?: string;
  environmentModifier?: string;
}

export interface ChapterConfig {
  chapterId: number;                // 1 .. 5
  name: string;                     // e.g. "第一章：潼关初战"
  subtitle: string;
  description: string;
  theme: 'plain_valley' | 'river_water' | 'snow_tundra' | 'night_mountain' | 'imperial_city';
  stageIds: number[];
  bossStageId: number;
  bossName: string;
}

export const CAMPAIGN_CHAPTERS_CONFIG: Record<number, ChapterConfig> = {
  1: {
    chapterId: 1,
    name: '第一章：潼关初战',
    subtitle: '黄河天险·关中门户',
    description: '明军扼守潼关天险，抵御黑风寨流寇与叛军先锋。',
    theme: 'plain_valley',
    stageIds: [1, 2, 3, 4],
    bossStageId: 4,
    bossName: '黑风寨主·铁塔熊王'
  },
  2: {
    chapterId: 2,
    name: '第二章：赤壁火峡',
    subtitle: '大江东去·烈焰焚天',
    description: '逆江而上封锁长江水道，迎战叛军玄武水师舰队。',
    theme: 'river_water',
    stageIds: [5, 6, 7, 8],
    bossStageId: 8,
    bossName: '机关楼船·玄武巨舰'
  },
  3: {
    chapterId: 3,
    name: '第三章：塞外雪原',
    subtitle: '雁门飞雪·狼烟千里',
    description: '出塞远征大漠雪原，冰天雪地间迎击漠北狼骑。',
    theme: 'snow_tundra',
    stageIds: [9, 10, 11, 12],
    bossStageId: 12,
    bossName: '漠北狼主·金帐可汗'
  },
  4: {
    chapterId: 4,
    name: '第四章：夜袭巴蜀',
    subtitle: '蜀道天堑·幽暗绝壁',
    description: '绝壁栈道暗夜交锋，深入蜀中密林清剿万蛊毒瘴。',
    theme: 'night_mountain',
    stageIds: [13, 14, 15, 16],
    bossStageId: 16,
    bossName: '五毒教主·万蛊尸魔'
  },
  5: {
    chapterId: 5,
    name: '第五章：京师保卫',
    subtitle: '皇城九门·孤城绝唱',
    description: '京畿决战紫禁城下，集结神机营终极火器摧毁饕餮攻城机。',
    theme: 'imperial_city',
    stageIds: [17, 18, 19, 20],
    bossStageId: 20,
    bossName: '魔化巨兽·饕餮攻城机'
  }
};

export const CAMPAIGN_STAGES_CONFIG: Record<number, StageConfig> = {
  // =========================================================================
  // Chapter 1: 潼关初战 (Stages 1-4)
  // =========================================================================
  1: {
    stageId: 1,
    chapterId: 1,
    stageIndexInChapter: 1,
    name: '《风陵渡口》',
    description: '风陵渡口黄河奔涌，流寇轻步兵成群渡河，正是验证二合一升星与阵法火力的试炼之地。',
    totalWaves: 6,
    wallBaseHp: 1000,
    baseEnemyHpMultiplier: 40,
    firstClearRewards: { gold: 500, iron: 150, blueprints: 2 },
    repeatRewards: { gold: 100, iron: 25, blueprints: 0 },
    unlockRequirements: {},
    unlockContentDescription: '解锁器械【诸葛连弩】【铁索拒马】',
    isBossStage: false,
    environmentModifier: '晴朗无风·平原开阔宽道'
  },
  2: {
    stageId: 2,
    chapterId: 1,
    stageIndexInChapter: 2,
    name: '《华阴前哨》',
    description: '华阴驿道前哨告急，狂暴战犬突袭侧翼，急需布置前排油柜与地雷予以拦截。',
    totalWaves: 8,
    wallBaseHp: 1000,
    baseEnemyHpMultiplier: 45,
    firstClearRewards: { gold: 750, iron: 180, blueprints: 2 },
    repeatRewards: { gold: 150, iron: 30, blueprints: 0 },
    unlockRequirements: { requiredStageId: 1 },
    unlockContentDescription: '解锁器械【猛火油柜】【震天雷投手】',
    isBossStage: false,
    environmentModifier: '晴朗无风·平原开阔宽道'
  },
  3: {
    stageId: 3,
    chapterId: 1,
    stageIndexInChapter: 3,
    name: '《函谷古道》',
    description: '一夫当关万夫莫开，重甲刀盾兵横列推进，需架设红衣大炮与战鼓实施穿甲轰鸣。',
    totalWaves: 8,
    wallBaseHp: 1000,
    baseEnemyHpMultiplier: 48,
    firstClearRewards: { gold: 1000, iron: 220, blueprints: 3 },
    repeatRewards: { gold: 200, iron: 40, blueprints: 0 },
    unlockRequirements: { requiredStageId: 2 },
    unlockContentDescription: '解锁器械【红衣大炮】【聚义战鼓】',
    isBossStage: false,
    environmentModifier: '晴朗无风·中路峡谷窄道'
  },
  4: {
    stageId: 4,
    chapterId: 1,
    stageIndexInChapter: 4,
    name: '《潼关决战》',
    description: '黑风寨主·铁塔熊王携千军万马压境，双锤裂地震荡女墙，唯有构筑多层火力网方可斩首！',
    totalWaves: 10,
    wallBaseHp: 1000,
    baseEnemyHpMultiplier: 50,
    firstClearRewards: { gold: 2000, iron: 500, blueprints: 5 },
    repeatRewards: { gold: 400, iron: 80, blueprints: 1 },
    unlockRequirements: { requiredStageId: 3 },
    unlockContentDescription: '解锁主帅【禽滑厘】、开放【墨门残局模式】',
    isBossStage: true,
    bossName: '黑风寨主·铁塔熊王',
    environmentModifier: '晴朗无风·决战【首领：铁塔熊王】'
  },

  // =========================================================================
  // Chapter 2: 赤壁火峡 (Stages 5-8)
  // =========================================================================
  5: {
    stageId: 5,
    chapterId: 2,
    stageIndexInChapter: 1,
    name: '《乌林芦苇》',
    description: '大江两岸芦苇丛生，东南狂风骤起，火器射程剧增，火海顺风蔓延。',
    totalWaves: 8,
    wallBaseHp: 1200,
    baseEnemyHpMultiplier: 75,
    firstClearRewards: { gold: 1500, iron: 300, blueprints: 3 },
    repeatRewards: { gold: 300, iron: 50, blueprints: 0 },
    unlockRequirements: { requiredStageId: 4 },
    unlockContentDescription: '解锁器械【一窝蜂火箭】',
    isBossStage: false,
    environmentModifier: '【东南狂风】火伤射程+30%，火海自动顺风扩散'
  },
  6: {
    stageId: 6,
    chapterId: 2,
    stageIndexInChapter: 2,
    name: '《柴桑水寨》',
    description: '水陆并进，敌军战船借风势加速突入，需以烈火喷射兽封锁水道。',
    totalWaves: 10,
    wallBaseHp: 1200,
    baseEnemyHpMultiplier: 90,
    firstClearRewards: { gold: 1800, iron: 350, blueprints: 3 },
    repeatRewards: { gold: 360, iron: 60, blueprints: 0 },
    unlockRequirements: { requiredStageId: 5 },
    unlockContentDescription: '解锁器械【机关喷火兽】',
    isBossStage: false,
    environmentModifier: '【东南狂风】敌军借风势加速+15%'
  },
  7: {
    stageId: 7,
    chapterId: 2,
    stageIndexInChapter: 3,
    name: '《巴陵要隘》',
    description: '大雨倾盆地面湿滑，水汽强化雷电脉冲，陷马电网正是破敌关键。',
    totalWaves: 10,
    wallBaseHp: 1200,
    baseEnemyHpMultiplier: 110,
    firstClearRewards: { gold: 2200, iron: 420, blueprints: 4 },
    repeatRewards: { gold: 440, iron: 70, blueprints: 0 },
    unlockRequirements: { requiredStageId: 6 },
    unlockContentDescription: '解锁器械【陷马电网】',
    isBossStage: false,
    environmentModifier: '【暴雨如注】地面火海持续时间减半，水汽强化雷电'
  },
  8: {
    stageId: 8,
    chapterId: 2,
    stageIndexInChapter: 4,
    name: '《火烧连营》',
    description: '机关楼船·玄武巨舰升起铁幕护盾阻隔直射，必须以高抛大炮与地狱烈焰跨越阻隔直轰敌核心！',
    totalWaves: 12,
    wallBaseHp: 1200,
    baseEnemyHpMultiplier: 130,
    firstClearRewards: { gold: 4000, iron: 800, blueprints: 7 },
    repeatRewards: { gold: 800, iron: 120, blueprints: 1 },
    unlockRequirements: { requiredStageId: 7 },
    unlockContentDescription: '解锁主帅【秦良玉】、科技树二阶权限',
    isBossStage: true,
    bossName: '机关楼船·玄武巨舰',
    environmentModifier: '【中路水战】决战【首领：玄武巨舰】（需高抛越盾）'
  },

  // =========================================================================
  // Chapter 3: 塞外雪原 (Stages 9-12)
  // =========================================================================
  9: {
    stageId: 9,
    chapterId: 3,
    stageIndexInChapter: 1,
    name: '《雁门风雪》',
    description: '塞外雁门暴雪呼啸，刮骨寒风降低常规器械装填，观星祭坛指引极寒破局。',
    totalWaves: 10,
    wallBaseHp: 1500,
    baseEnemyHpMultiplier: 165,
    firstClearRewards: { gold: 3000, iron: 500, blueprints: 4 },
    repeatRewards: { gold: 600, iron: 90, blueprints: 0 },
    unlockRequirements: { requiredStageId: 8 },
    unlockContentDescription: '解锁器械【观星祭坛】',
    isBossStage: false,
    environmentModifier: '【暴风雪】每20s刮骨寒风，非耐寒器械装填降35%'
  },
  10: {
    stageId: 10,
    chapterId: 3,
    stageIndexInChapter: 2,
    name: '《黑水冰河》',
    description: '坚冰凝结河道滑行，襄阳发石机投掷万钧寒石，砸碎冰雕触发连锁崩裂。',
    totalWaves: 10,
    wallBaseHp: 1500,
    baseEnemyHpMultiplier: 195,
    firstClearRewards: { gold: 3500, iron: 600, blueprints: 5 },
    repeatRewards: { gold: 700, iron: 100, blueprints: 0 },
    unlockRequirements: { requiredStageId: 9 },
    unlockContentDescription: '解锁器械【襄阳发石机】',
    isBossStage: false,
    environmentModifier: '【结冰河道】全敌军移速+20%，冰封承伤翻倍'
  },
  11: {
    stageId: 11,
    chapterId: 3,
    stageIndexInChapter: 3,
    name: '《受降城外》',
    description: '极寒冻土前线筑垒，八牛床弩望山校准，超远距离贯穿重甲铁骑。',
    totalWaves: 12,
    wallBaseHp: 1500,
    baseEnemyHpMultiplier: 230,
    firstClearRewards: { gold: 4200, iron: 720, blueprints: 5 },
    repeatRewards: { gold: 840, iron: 120, blueprints: 0 },
    unlockRequirements: { requiredStageId: 10 },
    unlockContentDescription: '解锁器械【八牛床弩】',
    isBossStage: false,
    environmentModifier: '【极寒冻土】近战工事反伤效果翻倍'
  },
  12: {
    stageId: 12,
    chapterId: 3,
    stageIndexInChapter: 4,
    name: '《狼山王庭》',
    description: '漠北狼主·金帐可汗率狼骑折返突袭，冰箭封冻城楼，唯有群体极寒冻结方能限制其狂飙！',
    totalWaves: 12,
    wallBaseHp: 1500,
    baseEnemyHpMultiplier: 270,
    firstClearRewards: { gold: 7000, iron: 1200, blueprints: 10 },
    repeatRewards: { gold: 1400, iron: 180, blueprints: 2 },
    unlockRequirements: { requiredStageId: 11 },
    unlockContentDescription: '解锁主帅【刘伯温】、开放【无尽守城模式】',
    isBossStage: true,
    bossName: '漠北狼主·金帐可汗',
    environmentModifier: '【冰原暴雪】决战【首领：金帐可汗】（横向游击折返）'
  },

  // =========================================================================
  // Chapter 4: 夜袭巴蜀 (Stages 13-16)
  // =========================================================================
  13: {
    stageId: 13,
    chapterId: 4,
    stageIndexInChapter: 1,
    name: '《白帝云雾》',
    description: '伸手不见五指的大雾笼罩绝壁，鲁班工坊机簧轰鸣，照亮全屏索敌视野。',
    totalWaves: 12,
    wallBaseHp: 1800,
    baseEnemyHpMultiplier: 330,
    firstClearRewards: { gold: 5500, iron: 900, blueprints: 6 },
    repeatRewards: { gold: 1100, iron: 140, blueprints: 0 },
    unlockRequirements: { requiredStageId: 12 },
    unlockContentDescription: '解锁器械【鲁班工坊】',
    isBossStage: false,
    environmentModifier: '【伸手不见五指】索敌射程减半，唯火光与雷光照亮全屏'
  },
  14: {
    stageId: 14,
    chapterId: 4,
    stageIndexInChapter: 2,
    name: '《葭萌暗渡》',
    description: '山道崎岖险隘分路突入，白杆长枪营依险据守，枪林阵列击退两翼突刺。',
    totalWaves: 12,
    wallBaseHp: 1800,
    baseEnemyHpMultiplier: 390,
    firstClearRewards: { gold: 6500, iron: 1050, blueprints: 7 },
    repeatRewards: { gold: 1300, iron: 160, blueprints: 0 },
    unlockRequirements: { requiredStageId: 13 },
    unlockContentDescription: '解锁器械【白杆长枪营】',
    isBossStage: false,
    environmentModifier: '【山道崎岖】敌军分左、右两路栈道夹击'
  },
  15: {
    stageId: 15,
    chapterId: 4,
    stageIndexInChapter: 3,
    name: '《梓潼毒沼》',
    description: '毒瘴弥漫腐蚀生灵，火药局终阶秘术就位，以猛烈爆炸引燃毒气反制敌潮。',
    totalWaves: 15,
    wallBaseHp: 1800,
    baseEnemyHpMultiplier: 460,
    firstClearRewards: { gold: 7800, iron: 1250, blueprints: 8 },
    repeatRewards: { gold: 1560, iron: 190, blueprints: 0 },
    unlockRequirements: { requiredStageId: 14 },
    unlockContentDescription: '解锁器械【火药局】终阶图纸',
    isBossStage: false,
    environmentModifier: '【瘴气弥漫】普通敌军每秒恢复3%血量，遇火即燃'
  },
  16: {
    stageId: 16,
    chapterId: 4,
    stageIndexInChapter: 4,
    name: '《剑门天险》',
    description: '五毒教主·万蛊尸魔吞噬全场小兵回血，必须以烈焰烈火点燃毒瘴引发全屏反噬焚身！',
    totalWaves: 15,
    wallBaseHp: 1800,
    baseEnemyHpMultiplier: 540,
    firstClearRewards: { gold: 12000, iron: 2000, blueprints: 14 },
    repeatRewards: { gold: 2400, iron: 280, blueprints: 2 },
    unlockRequirements: { requiredStageId: 15 },
    unlockContentDescription: '解锁赤金双系融合觉醒卡牌池',
    isBossStage: true,
    bossName: '五毒教主·万蛊尸魔',
    environmentModifier: '【绝壁夜战】决战【首领：万蛊尸魔】（点燃毒瘴反噬）'
  },

  // =========================================================================
  // Chapter 5: 京师保卫 (Stages 17-20)
  // =========================================================================
  17: {
    stageId: 17,
    chapterId: 5,
    stageIndexInChapter: 1,
    name: '《居庸关雪》',
    description: '血月当空居庸关告急，敌军死后结茧复生，唯有暴击破茧方可彻底斩灭。',
    totalWaves: 12,
    wallBaseHp: 2200,
    baseEnemyHpMultiplier: 650,
    firstClearRewards: { gold: 9500, iron: 1500, blueprints: 9 },
    repeatRewards: { gold: 1900, iron: 220, blueprints: 0 },
    unlockRequirements: { requiredStageId: 16 },
    unlockContentDescription: '开放【异步攻城防守布阵】功能',
    isBossStage: false,
    environmentModifier: '【血月降临】敌军首次死亡化为血茧，未被暴击则复活'
  },
  18: {
    stageId: 18,
    chapterId: 5,
    stageIndexInChapter: 2,
    name: '《卢沟夜月》',
    description: '卢沟晓月重型冲车三路齐发，城防重器全面解锁 ★4 觉醒升级权限，迎战工业级攻城怪潮。',
    totalWaves: 15,
    wallBaseHp: 2200,
    baseEnemyHpMultiplier: 780,
    firstClearRewards: { gold: 11500, iron: 1800, blueprints: 10 },
    repeatRewards: { gold: 2300, iron: 260, blueprints: 0 },
    unlockRequirements: { requiredStageId: 17 },
    unlockContentDescription: '开放全器械 ★4 觉醒升级权限',
    isBossStage: false,
    environmentModifier: '【三路冲锋】左中右三路御街同时刷重型冲车'
  },
  19: {
    stageId: 19,
    chapterId: 5,
    stageIndexInChapter: 3,
    name: '《德胜门外》',
    description: '背水死战德胜门外，城墙破损无法常规修缮，反伤倍率空前爆发，神机造办处全线登顶。',
    totalWaves: 15,
    wallBaseHp: 2200,
    baseEnemyHpMultiplier: 920,
    firstClearRewards: { gold: 14000, iron: 2200, blueprints: 12 },
    repeatRewards: { gold: 2800, iron: 310, blueprints: 0 },
    unlockRequirements: { requiredStageId: 18 },
    unlockContentDescription: '解锁【神机造办处】满级科技权限',
    isBossStage: false,
    environmentModifier: '【背水死战】城墙无法被常规手段修缮，反伤提升150%'
  },
  20: {
    stageId: 20,
    chapterId: 5,
    stageIndexInChapter: 4,
    name: '《紫禁之巅》',
    description: '终极大首领魔化巨兽·饕餮攻城机黑洞吸附弹道蓄力秒杀！6秒窗口重炮连续入喉触发炸膛！',
    totalWaves: 15,
    wallBaseHp: 2500,
    baseEnemyHpMultiplier: 1100,
    firstClearRewards: { gold: 25000, iron: 4000, blueprints: 25 },
    repeatRewards: { gold: 5000, iron: 500, blueprints: 4 },
    unlockRequirements: { requiredStageId: 19 },
    unlockContentDescription: '通关战役大通关，解锁全成就与限定神武皮肤',
    isBossStage: true,
    bossName: '魔化巨兽·饕餮攻城机',
    environmentModifier: '【终极天劫】决战【首领：饕餮攻城机】（蓄力炸膛机制）'
  }
};

/**
 * Returns configuration for a stage by ID (1..20).
 */
export function getStageConfig(stageId: number): StageConfig {
  const config = CAMPAIGN_STAGES_CONFIG[stageId];
  if (!config) {
    throw new Error(`[CampaignConfig] Invalid stageId: ${stageId}. Valid range is 1..20.`);
  }
  return config;
}

/**
 * Returns chapter configuration by chapter ID (1..5).
 */
export function getChapterConfig(chapterId: number): ChapterConfig {
  const config = CAMPAIGN_CHAPTERS_CONFIG[chapterId];
  if (!config) {
    throw new Error(`[CampaignConfig] Invalid chapterId: ${chapterId}. Valid range is 1..5.`);
  }
  return config;
}

/**
 * Returns all stages belonging to a specific chapter.
 */
export function getStagesByChapter(chapterId: number): StageConfig[] {
  const chapter = getChapterConfig(chapterId);
  return chapter.stageIds.map(id => getStageConfig(id));
}

/**
 * Checks whether a stage is unlocked based on highest unlocked stage and stars.
 */
export function isStageUnlocked(stageId: number, highestUnlockedStage: number): boolean {
  if (stageId === 1) {
    return true;
  }
  return highestUnlockedStage >= stageId;
}
