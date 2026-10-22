/**
 * 《孤城神机营》- Campaign Waves Configuration & Wave Timetable Schema
 * Implements GDD V3.0 §8.2, §9.1, §9.2, §16.3 & SCOPE.md (GL-1):
 * - WaveSpawnItem, BossSkillConfig, BossWaveConfig, StageWaveDefinition, StageWaveConfig schemas
 * - Complete data-driven wave timetables for all 5 Chapters (Stages 1-20)
 * - 5 Unique Chapter Bosses:
 *   1. Ch1 铁塔熊王 (boss_bear): Earth Slam, Enrage, Dog Summon
 *   2. Ch2 玄武巨舰 (boss_xuanwu): Xuanwu Iron Curtain (linear projectile shield), Broadside Barrage, Oil Fire
 *   3. Ch3 金帐可汗 (boss_khan): Wolf Howl Aura (+armor, +tenacity), Ice Arrow (freeze row/col + iron pagodas)
 *   4. Ch4 万蛊尸魔 (boss_corpse_demon): Wall Corrosion Miasma, Devour Minions (countered by Nether Poison Fire), Feign Death & Revive
 *   5. Ch5 饕餮巨炮 (boss_taotie): Swallow Vortex, 6.0s Siege Bombardment Charge (1000 wall damage), Weakpoint Interrupt Mechanism
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { XDistribution } from '../core/wave/wave-spawner';
import { CAMPAIGN_STAGES_CONFIG, StageConfig } from './campaign.config';

/**
 * Single batch spawn configuration within a wave.
 */
export interface WaveSpawnItem {
  enemyType: string;             // Archetype ID (e.g. 'light_infantry', 'war_dog', 'shield_guard', 'boss_bear')
  count: number;                 // Total units to spawn in this batch
  intervalMs: number;            // Milliseconds between consecutive unit spawns
  delayMs: number;               // Milliseconds after wave start before batch starts
  xDistribution: XDistribution;  // 'RandomFull' | 'LeftWing' | 'RightWing' | 'CenterValley'
  laneIndex?: number;            // Optional explicit lane (0..4)
  hpMultiplier?: number;         // Relative scaling multiplier
  atkMultiplier?: number;        // Damage multiplier
}

/**
 * Boss skill trigger types.
 */
export type BossSkillTriggerType = 'hp_percent' | 'interval' | 'phase_start' | 'charging';

/**
 * Boss skill specification and trigger conditions.
 */
export interface BossSkillConfig {
  id: string;                    // Skill identifier
  name: string;                  // Display name
  description: string;
  triggerType: BossSkillTriggerType;
  triggerHpPercent?: number;     // e.g. 50 (triggers when currentHp <= maxHp * 0.50)
  intervalSec?: number;          // Cooldown between casts (for 'interval' or 'charging' skills)
  initialDelaySec?: number;      // First cast delay after boss spawns
  phase: number;                 // Phase 1 (100%..50%) or Phase 2 (<50%)
  effects: {
    stunRow0DurationSec?: number;                // e.g. 3.0s stun to Row 0 units (Ch1 Bear)
    speedMultiplier?: number;                    // e.g. 1.80 (+80% speed)
    wallDamageMultiplier?: number;               // e.g. 1.50 (+50% damage)
    summonEnemyId?: string;                      // e.g. 'war_dog' or 'iron_pagoda'
    summonCount?: number;                        // e.g. 25
    // Advanced Boss mechanics
    shieldLinearProjectilesDurationSec?: number; // Xuanwu Iron Curtain / Taotie Swallow Vortex
    broadsideBarrageWallDamage?: number;        // Xuanwu Broadside Cannon Barrage (40 wall damage)
    oilFireDurationSec?: number;                // Xuanwu Oil Fire zone (8.0s)
    auraArmorBonus?: number;                    // Khan Wolf Howl aura (+50 armor)
    auraTenacitySec?: number;                   // Khan Wolf Howl aura (+4.0s tenacity)
    freezeRandomRowColDurationSec?: number;     // Khan Wolf Spirit Ice Arrow (3.0s freeze)
    wallCorrosionDamagePerSec?: number;         // Corpse Demon Miasma (15 damage)
    devourMinionsHealPercent?: number;          // Corpse Demon Devour (10% max HP per minion)
    feignDeathDurationSec?: number;             // Corpse Demon Revive (3.0s invulnerable)
    feignDeathReviveHpPercent?: number;         // Corpse Demon Revive (35% HP)
    chargeUpDurationSec?: number;               // Taotie Fatal Beam (6.0s charge)
    chargeFatalWallDamage?: number;             // Taotie 1000 fatal wall damage
    weakpointHeavyHitsThreshold?: number;       // Taotie 3 heavy hits to interrupt
    weakpointDamageThreshold?: number;          // Taotie 50,000 damage to interrupt
    backfireStunDurationSec?: number;           // Taotie 5.0s backfire stun
    backfireVulnerabilityBonus?: number;        // Taotie +200% damage vulnerability
  };
}

/**
 * Full Boss battle configuration and combat AI timetable.
 */
export interface BossWaveConfig {
  bossId: string;                // e.g. 'boss_bear', 'boss_xuanwu', 'boss_khan', 'boss_corpse_demon', 'boss_taotie'
  name: string;                  // Display name
  title: string;                 // Chapter boss title
  maxHp: number;
  armor: number;
  moveSpeed: number;             // m/s
  wallDamage: number;
  attackInterval: number;        // s
  spawnDelayMs: number;
  spawnLane: number;             // 0..4 (default 2)
  skills: BossSkillConfig[];
}

/**
 * Wave special tactical events, drops, and guaranteed cards.
 */
export interface WaveSpecialRules {
  guaranteedTacticsQuality?: 'blue' | 'purple' | 'gold' | 'red_gold';
  freeShopRefreshes?: number;
  specialDrop?: {
    enemyType: string;
    itemType: string;
    description: string;
  };
  tutorialGuideStep?: number;
}

/**
 * Complete definition of a single wave.
 */
export interface StageWaveDefinition {
  waveNumber: number;            // 1..totalWaves
  prepTimeSec: number;           // Preparation time before wave begins
  durationSec: number;           // Maximum battle duration limit
  stipend: number;               // Base silver granted upon wave clear
  spawns: WaveSpawnItem[];
  isEliteWave?: boolean;
  isBossWave?: boolean;
  bossConfig?: BossWaveConfig;
  specialRules?: WaveSpecialRules;
}

/**
 * Complete wave set for a stage.
 */
export interface StageWaveConfig {
  stageId: number;
  chapterId: number;
  stageName: string;
  totalWaves: number;
  waves: StageWaveDefinition[];
}

// =============================================================================
// Chapter 1 Boss: 黑风寨主·铁塔熊王 (GDD §8.2.1 & §9.2)
// =============================================================================
export const CHAPTER_1_BOSS_BEAR_KING: BossWaveConfig = {
  bossId: 'boss_bear',
  name: '黑风寨主·铁塔熊王',
  title: '第一章守关首领',
  maxHp: 135000,
  armor: 150,
  moveSpeed: 0.45,
  wallDamage: 50,
  attackInterval: 2.0,
  spawnDelayMs: 0,
  spawnLane: 2,
  skills: [
    {
      id: 'earth_slam',
      name: '撼地重锤',
      description: '手持双柄重锤跳斩重砸女墙，引发剧烈震荡波使前排 Row 0 器械眩晕瘫痪 3.0 秒。',
      triggerType: 'interval',
      intervalSec: 10.0,
      initialDelaySec: 10.0,
      phase: 1,
      effects: {
        stunRow0DurationSec: 3.0
      }
    },
    {
      id: 'enrage_throw',
      name: '狂暴掷锤',
      description: '生命值降至 50% 以下时抛掷战锤进入赤血狂暴，移速提升 +80%，攻城破门伤害提升 +50%。',
      triggerType: 'hp_percent',
      triggerHpPercent: 50,
      phase: 2,
      effects: {
        speedMultiplier: 1.80,
        wallDamageMultiplier: 1.50
      }
    },
    {
      id: 'summon_war_dogs',
      name: '狂犬袭营',
      description: '熊王半血狂暴咆哮，瞬间召唤 25 只狂暴战犬全屏冲阵掩护。',
      triggerType: 'hp_percent',
      triggerHpPercent: 50,
      phase: 2,
      effects: {
        summonEnemyId: 'war_dog',
        summonCount: 25
      }
    }
  ]
};

// =============================================================================
// Chapter 2 Boss: 机关楼船·玄武巨舰 (GDD §9.2 & §19)
// =============================================================================
export const CHAPTER_2_BOSS_XUANWU: BossWaveConfig = {
  bossId: 'boss_xuanwu',
  name: '机关楼船·玄武巨舰',
  title: '第二章守关首领',
  maxHp: 364000,
  armor: 200,
  moveSpeed: 0.35,
  wallDamage: 80,
  attackInterval: 2.5,
  spawnDelayMs: 0,
  spawnLane: 2,
  skills: [
    {
      id: 'iron_curtain',
      name: '玄武铁幕',
      description: '升起青铜铁壁机括护盾 5.0 秒，阻隔吸收所有直线平射弹道（迫击炮、发石机等高抛弹道可越过）。',
      triggerType: 'interval',
      intervalSec: 12.0,
      initialDelaySec: 5.0,
      phase: 1,
      effects: {
        shieldLinearProjectilesDurationSec: 5.0
      }
    },
    {
      id: 'broadside_barrage',
      name: '两舷排炮',
      description: '左右两舷 8 门重炮齐射，直接对城墙造成 40 点轰击伤害。',
      triggerType: 'interval',
      intervalSec: 8.0,
      initialDelaySec: 8.0,
      phase: 1,
      effects: {
        broadsideBarrageWallDamage: 40
      }
    },
    {
      id: 'oil_fire_zone',
      name: '烈火油封',
      description: '生命值降至 50% 以下时向江面释放大面积烈火油，点燃烈火油区域持续 8.0 秒。',
      triggerType: 'hp_percent',
      triggerHpPercent: 50,
      phase: 2,
      effects: {
        oilFireDurationSec: 8.0
      }
    }
  ]
};

// =============================================================================
// Chapter 3 Boss: 漠北狼主·金帐可汗 (GDD §9.2 & §19)
// =============================================================================
export const CHAPTER_3_BOSS_KHAN: BossWaveConfig = {
  bossId: 'boss_khan',
  name: '漠北狼主·金帐可汗',
  title: '第三章守关首领',
  maxHp: 1080000,
  armor: 180,
  moveSpeed: 1.0,
  wallDamage: 60,
  attackInterval: 1.5,
  spawnDelayMs: 0,
  spawnLane: 2,
  skills: [
    {
      id: 'wolf_howl',
      name: '天狼狂嗥',
      description: '金帐战旗高举发出长啸，令场上全体在场随从获得 +50 护甲与 4.0 秒免控霸体状态。',
      triggerType: 'interval',
      intervalSec: 10.0,
      initialDelaySec: 6.0,
      phase: 1,
      effects: {
        auraArmorBonus: 50,
        auraTenacitySec: 4.0
      }
    },
    {
      id: 'wolf_spirit_ice_arrow_p1',
      name: '天狼极寒箭',
      description: '射出狼神冰魄箭，冻结城头随机行列器械 3.0 秒，并召唤 8 骑铁浮屠重骑冲阵。',
      triggerType: 'hp_percent',
      triggerHpPercent: 75,
      phase: 1,
      effects: {
        freezeRandomRowColDurationSec: 3.0,
        summonEnemyId: 'iron_pagoda',
        summonCount: 8
      }
    },
    {
      id: 'wolf_spirit_ice_arrow_p2',
      name: '狂狼极速冲阵',
      description: '半血暴怒进入二阶段，移速再次提升 +25%，再次冻结城垣并唤出 8 骑精锐铁浮屠。',
      triggerType: 'hp_percent',
      triggerHpPercent: 50,
      phase: 2,
      effects: {
        freezeRandomRowColDurationSec: 3.0,
        summonEnemyId: 'iron_pagoda',
        summonCount: 8,
        speedMultiplier: 1.25
      }
    }
  ]
};

// =============================================================================
// Chapter 4 Boss: 五毒教主·万蛊尸魔 (GDD §9.2 & §19)
// =============================================================================
export const CHAPTER_4_BOSS_CORPSE_DEMON: BossWaveConfig = {
  bossId: 'boss_corpse_demon',
  name: '五毒教主·万蛊尸魔',
  title: '第四章守关首领',
  maxHp: 2970000,
  armor: 120,
  moveSpeed: 0.4,
  wallDamage: 70,
  attackInterval: 2.0,
  spawnDelayMs: 0,
  spawnLane: 2,
  skills: [
    {
      id: 'corpse_poison_miasma',
      name: '百足毒瘴',
      description: '散发浓郁毒瘴，每 3 秒对女墙造成 15 点直接腐蚀穿透伤害。',
      triggerType: 'interval',
      intervalSec: 3.0,
      initialDelaySec: 3.0,
      phase: 1,
      effects: {
        wallCorrosionDamagePerSec: 15
      }
    },
    {
      id: 'devour_minions',
      name: '百蛊吞噬',
      description: '施展五毒嗜血邪法吞噬场上随从回血（每只恢复 10% 最大生命值）；若尸魔正处于幽冥毒火灼烧中，吞噬被强行打断且遭受反噬伤害！',
      triggerType: 'interval',
      intervalSec: 12.0,
      initialDelaySec: 10.0,
      phase: 1,
      effects: {
        devourMinionsHealPercent: 10
      }
    },
    {
      id: 'feign_death_revive',
      name: '蜕皮假死',
      description: '首次生命归零时触发金蝉脱壳假死 3.0 秒（期间完全无敌），随后破茧复活并恢复 35% 最大生命值。',
      triggerType: 'hp_percent',
      triggerHpPercent: 0,
      phase: 2,
      effects: {
        feignDeathDurationSec: 3.0,
        feignDeathReviveHpPercent: 35,
        summonEnemyId: 'war_dog',
        summonCount: 20
      }
    }
  ]
};

// =============================================================================
// Chapter 5 Boss: 魔化巨兽·饕餮攻城机 (GDD §9.2 & §19)
// =============================================================================
export const CHAPTER_5_BOSS_TAOTIE: BossWaveConfig = {
  bossId: 'boss_taotie',
  name: '魔化巨兽·饕餮攻城机',
  title: '第五章守关首领',
  maxHp: 8800000,
  armor: 300,
  moveSpeed: 0.28,
  wallDamage: 120,
  attackInterval: 3.0,
  spawnDelayMs: 0,
  spawnLane: 2,
  skills: [
    {
      id: 'swallow_vortex',
      name: '饕餮旋涡',
      description: '巨型青铜巨口产生强力引力旋涡 4.0 秒，将正面飞来的所有直线弹道吞噬无效化。',
      triggerType: 'interval',
      intervalSec: 14.0,
      initialDelaySec: 7.0,
      phase: 1,
      effects: {
        shieldLinearProjectilesDurationSec: 4.0
      }
    },
    {
      id: 'siege_bombardment',
      name: '神机天劫轰城炮',
      description: '巨兽聚能蓄力 6.0 秒发射毁灭巨炮，造成 1000 点致命破城伤害！弱点拦截机制：蓄力期间命中 3 次重炮攻击或承受 50,000 伤害可打断蓄力，并触发炸膛瘫痪 5.0 秒与 +200% 易伤！',
      triggerType: 'charging',
      intervalSec: 20.0,
      initialDelaySec: 10.0,
      phase: 1,
      effects: {
        chargeUpDurationSec: 6.0,
        chargeFatalWallDamage: 1000,
        weakpointHeavyHitsThreshold: 3,
        weakpointDamageThreshold: 50000,
        backfireStunDurationSec: 5.0,
        backfireVulnerabilityBonus: 2.0
      }
    }
  ]
};

// =============================================================================
// Chapter 1: 10 Waves Master Timetable (GDD §9.2)
// =============================================================================
export const CHAPTER_1_MASTER_WAVES: StageWaveDefinition[] = [
  // Wave 1: Duration 18s, Stipend 45, 12 Light Infantry (1.2s/unit, CenterValley focus for smooth onboarding)
  {
    waveNumber: 1,
    prepTimeSec: 10,
    durationSec: 18,
    stipend: 45,
    spawns: [
      {
        enemyType: 'light_infantry',
        count: 12,
        intervalMs: 1200,
        delayMs: 0,
        xDistribution: 'CenterValley',
        hpMultiplier: 1.0
      }
    ],
    specialRules: {
      guaranteedTacticsQuality: 'purple',
      tutorialGuideStep: 1
    }
  },

  // Wave 2: Duration 22s, Stipend 50, 18 Light Infantry + 6 War Dogs (Smooth difficulty step)
  {
    waveNumber: 2,
    prepTimeSec: 10,
    durationSec: 22,
    stipend: 50,
    spawns: [
      {
        enemyType: 'light_infantry',
        count: 18,
        intervalMs: 800,
        delayMs: 0,
        xDistribution: 'RandomFull',
        hpMultiplier: 1.10
      },
      {
        enemyType: 'war_dog',
        count: 6,
        intervalMs: 1000,
        delayMs: 8000,
        xDistribution: 'LeftWing',
        hpMultiplier: 1.0
      }
    ]
  },

  // Wave 3: Duration 25s, Stipend 58, 8 Shield Guards + 20 Light Infantry (Armor countering introduction)
  {
    waveNumber: 3,
    prepTimeSec: 10,
    durationSec: 25,
    stipend: 58,
    spawns: [
      {
        enemyType: 'shield_guard',
        count: 8,
        intervalMs: 1500,
        delayMs: 0,
        xDistribution: 'CenterValley',
        hpMultiplier: 1.0
      },
      {
        enemyType: 'light_infantry',
        count: 20,
        intervalMs: 600,
        delayMs: 4000,
        xDistribution: 'RandomFull',
        hpMultiplier: 1.30
      }
    ]
  },

  // Wave 4: Duration 28s, Stipend 65, 12 Bowman + 16 War Dogs (Range & fortress frontline challenge)
  {
    waveNumber: 4,
    prepTimeSec: 10,
    durationSec: 28,
    stipend: 65,
    spawns: [
      {
        enemyType: 'ranged_bowman',
        count: 12,
        intervalMs: 1200,
        delayMs: 0,
        xDistribution: 'CenterValley',
        hpMultiplier: 1.50
      },
      {
        enemyType: 'war_dog',
        count: 16,
        intervalMs: 600,
        delayMs: 8000,
        xDistribution: 'RandomFull',
        hpMultiplier: 1.20
      }
    ]
  },

  // Wave 5: Duration 30s, Stipend 75, ELITE WAVE: 2 Iron Pagoda + 24 Infantry + 6 Bomb Carriers
  {
    waveNumber: 5,
    prepTimeSec: 12,
    durationSec: 30,
    stipend: 75,
    isEliteWave: true,
    spawns: [
      {
        enemyType: 'iron_pagoda',
        count: 2,
        intervalMs: 4000,
        delayMs: 0,
        xDistribution: 'CenterValley',
        hpMultiplier: 1.0
      },
      {
        enemyType: 'light_infantry',
        count: 24,
        intervalMs: 500,
        delayMs: 2000,
        xDistribution: 'RandomFull',
        hpMultiplier: 1.50
      },
      {
        enemyType: 'bomb_carrier',
        count: 6,
        intervalMs: 1500,
        delayMs: 10000,
        xDistribution: 'CenterValley',
        hpMultiplier: 2.0
      }
    ],
    specialRules: {
      guaranteedTacticsQuality: 'gold'
    }
  },

  // Wave 6: Duration 32s, Stipend 60, 35 Light Infantry + 20 Light Cavalry
  {
    waveNumber: 6,
    prepTimeSec: 10,
    durationSec: 32,
    stipend: 60,
    spawns: [
      {
        enemyType: 'light_infantry',
        count: 35,
        intervalMs: 714,
        delayMs: 0,
        xDistribution: 'CenterValley',
        hpMultiplier: 11.44
      },
      {
        enemyType: 'light_cavalry',
        count: 20,
        intervalMs: 850,
        delayMs: 8000,
        xDistribution: 'RandomFull',
        hpMultiplier: 5.20
      }
    ]
  },

  // Wave 7: Duration 35s, Stipend 65, 3 Siege Rams + 40 Shield Guards
  {
    waveNumber: 7,
    prepTimeSec: 10,
    durationSec: 35,
    stipend: 65,
    spawns: [
      {
        enemyType: 'siege_ram',
        count: 3,
        intervalMs: 1000,
        delayMs: 0,
        xDistribution: 'RandomFull',
        hpMultiplier: 1.0
      },
      {
        enemyType: 'shield_guard',
        count: 40,
        intervalMs: 500,
        delayMs: 5000,
        xDistribution: 'RandomFull',
        hpMultiplier: 3.61
      }
    ],
    specialRules: {
      specialDrop: {
        enemyType: 'siege_ram',
        itemType: 'luban_hammer',
        description: '击毁中路冲车固定掉落【鲁班开山锤】'
      }
    }
  },

  // Wave 8: Duration 35s, Stipend 70, 30 Light Infantry + 30 Cavalry
  {
    waveNumber: 8,
    prepTimeSec: 10,
    durationSec: 35,
    stipend: 70,
    spawns: [
      {
        enemyType: 'light_infantry',
        count: 30,
        intervalMs: 833,
        delayMs: 0,
        xDistribution: 'RandomFull',
        hpMultiplier: 28.4
      },
      {
        enemyType: 'light_cavalry',
        count: 30,
        intervalMs: 666,
        delayMs: 5000,
        xDistribution: 'RandomFull',
        hpMultiplier: 12.17
      }
    ]
  },

  // Wave 9: Duration 38s, Stipend 80, 12 Iron Pagoda + 35 Bomb Carriers + 80 Infantry
  {
    waveNumber: 9,
    prepTimeSec: 12,
    durationSec: 38,
    stipend: 80,
    spawns: [
      {
        enemyType: 'iron_pagoda',
        count: 12,
        intervalMs: 2500,
        delayMs: 0,
        xDistribution: 'CenterValley',
        hpMultiplier: 3.61
      },
      {
        enemyType: 'bomb_carrier',
        count: 35,
        intervalMs: 857,
        delayMs: 0,
        xDistribution: 'RandomFull',
        hpMultiplier: 13.0
      },
      {
        enemyType: 'light_infantry',
        count: 80,
        intervalMs: 375,
        delayMs: 0,
        xDistribution: 'RandomFull',
        hpMultiplier: 5.0
      }
    ],
    specialRules: {
      freeShopRefreshes: 3
    }
  },

  // Wave 10: Duration 60s, Stipend 100, BOSS WAVE: 【黑风寨主·铁塔熊王】 + Guards
  {
    waveNumber: 10,
    prepTimeSec: 15,
    durationSec: 60,
    stipend: 100,
    isBossWave: true,
    bossConfig: CHAPTER_1_BOSS_BEAR_KING,
    spawns: [
      {
        enemyType: 'boss_bear',
        count: 1,
        intervalMs: 1000,
        delayMs: 0,
        xDistribution: 'CenterValley',
        laneIndex: 2,
        hpMultiplier: 1.0
      },
      {
        enemyType: 'shield_guard',
        count: 40,
        intervalMs: 1000,
        delayMs: 5000,
        xDistribution: 'RandomFull',
        hpMultiplier: 9.40
      },
      {
        enemyType: 'ranged_bowman',
        count: 30,
        intervalMs: 1300,
        delayMs: 5000,
        xDistribution: 'CenterValley',
        hpMultiplier: 5.0
      }
    ]
  }
];

// =============================================================================
// Helper: Chapter Wave Timetable Builder
// =============================================================================

function createChapterWaves(
  chapterId: number,
  totalWaves: number,
  baseScale: number,
  bossConfig?: BossWaveConfig
): StageWaveDefinition[] {
  const waves: StageWaveDefinition[] = [];

  for (let w = 1; w <= totalWaves; w++) {
    const isBossWave = w === totalWaves && bossConfig !== undefined;
    const isEliteWave = !isBossWave && (w === Math.floor(totalWaves / 2));
    const stipend = Math.min(200, 45 + (chapterId - 1) * 15 + w * 6);
    const durationSec = isBossWave ? 65 : (20 + w * 2);
    const prepTimeSec = isBossWave ? 15 : (isEliteWave ? 12 : 10);
    const waveHpMult = (baseScale / 50.0) * (0.8 + (w / totalWaves) * 0.5);

    const spawns: WaveSpawnItem[] = [];

    if (isBossWave) {
      spawns.push({
        enemyType: bossConfig.bossId,
        count: 1,
        intervalMs: 1000,
        delayMs: 0,
        xDistribution: 'CenterValley',
        laneIndex: 2,
        hpMultiplier: 1.0
      });

      // Chapter-themed escort guard minions (tuned to prevent overflow)
      if (chapterId === 2) {
        spawns.push({
          enemyType: 'shield_guard',
          count: 16,
          intervalMs: 1000,
          delayMs: 3000,
          xDistribution: 'RandomFull',
          hpMultiplier: waveHpMult
        });
        spawns.push({
          enemyType: 'ranged_bowman',
          count: 12,
          intervalMs: 1200,
          delayMs: 6000,
          xDistribution: 'CenterValley',
          hpMultiplier: waveHpMult
        });
      } else if (chapterId === 3) {
        spawns.push({
          enemyType: 'light_cavalry',
          count: 16,
          intervalMs: 800,
          delayMs: 3000,
          xDistribution: 'LeftWing',
          hpMultiplier: waveHpMult
        });
        spawns.push({
          enemyType: 'iron_pagoda',
          count: 6,
          intervalMs: 2000,
          delayMs: 5000,
          xDistribution: 'CenterValley',
          hpMultiplier: waveHpMult
        });
      } else if (chapterId === 4) {
        spawns.push({
          enemyType: 'war_dog',
          count: 18,
          intervalMs: 600,
          delayMs: 3000,
          xDistribution: 'RandomFull',
          hpMultiplier: waveHpMult
        });
        spawns.push({
          enemyType: 'bomb_carrier',
          count: 10,
          intervalMs: 1000,
          delayMs: 6000,
          xDistribution: 'RightWing',
          hpMultiplier: waveHpMult
        });
      } else if (chapterId === 5) {
        spawns.push({
          enemyType: 'iron_pagoda',
          count: 8,
          intervalMs: 1800,
          delayMs: 3000,
          xDistribution: 'CenterValley',
          hpMultiplier: waveHpMult
        });
        spawns.push({
          enemyType: 'siege_ram',
          count: 3,
          intervalMs: 3500,
          delayMs: 5000,
          xDistribution: 'RandomFull',
          hpMultiplier: waveHpMult
        });
      }
    } else if (isEliteWave) {
      if (chapterId === 1 || chapterId === 2) {
        spawns.push({
          enemyType: 'iron_pagoda',
          count: 2 + chapterId,
          intervalMs: 3000,
          delayMs: 0,
          xDistribution: 'CenterValley',
          hpMultiplier: waveHpMult
        });
        spawns.push({
          enemyType: 'light_infantry',
          count: 18 + w * 2,
          intervalMs: 500,
          delayMs: 2000,
          xDistribution: 'RandomFull',
          hpMultiplier: waveHpMult
        });
      } else if (chapterId === 3) {
        spawns.push({
          enemyType: 'iron_pagoda',
          count: 4,
          intervalMs: 2500,
          delayMs: 0,
          xDistribution: 'CenterValley',
          hpMultiplier: waveHpMult
        });
        spawns.push({
          enemyType: 'light_cavalry',
          count: 16,
          intervalMs: 600,
          delayMs: 2000,
          xDistribution: 'RandomFull',
          hpMultiplier: waveHpMult
        });
      } else if (chapterId === 4) {
        spawns.push({
          enemyType: 'bomb_carrier',
          count: 12,
          intervalMs: 800,
          delayMs: 0,
          xDistribution: 'RandomFull',
          hpMultiplier: waveHpMult
        });
        spawns.push({
          enemyType: 'shield_guard',
          count: 12,
          intervalMs: 1000,
          delayMs: 3000,
          xDistribution: 'CenterValley',
          hpMultiplier: waveHpMult
        });
      } else {
        spawns.push({
          enemyType: 'siege_ram',
          count: 2,
          intervalMs: 3000,
          delayMs: 0,
          xDistribution: 'RandomFull',
          hpMultiplier: waveHpMult
        });
        spawns.push({
          enemyType: 'iron_pagoda',
          count: 6,
          intervalMs: 2000,
          delayMs: 2000,
          xDistribution: 'CenterValley',
          hpMultiplier: waveHpMult
        });
      }
    } else {
      // Normal combat wave
      if (w === 1) {
        // Wave 1 of any chapter: clean onboarding wave
        const w1Count = 12 + (chapterId - 1) * 2;
        const w1Interval = Math.max(700, 1200 - (chapterId - 1) * 100);
        spawns.push({
          enemyType: 'light_infantry',
          count: w1Count,
          intervalMs: w1Interval,
          delayMs: 0,
          xDistribution: 'CenterValley',
          hpMultiplier: waveHpMult
        });
      } else {
        // Later waves: chapter-escalated difficulty & troop compositions
        const baseInfantryCount = 14 + (chapterId - 1) * 2 + Math.floor(w * 1.5);
        const infantryInterval = Math.max(380, 700 - (chapterId - 1) * 60);

        spawns.push({
          enemyType: 'light_infantry',
          count: baseInfantryCount,
          intervalMs: infantryInterval,
          delayMs: 0,
          xDistribution: 'RandomFull',
          hpMultiplier: waveHpMult
        });

        // Fast raiders branch (War Dogs in early chapters, Light Cavalry in later chapters)
        if (w >= 3) {
          const fastEnemy = chapterId >= 3 ? 'light_cavalry' : 'war_dog';
          const fastCount = 6 + (chapterId - 1) * 2 + Math.floor(w * 0.8);
          const fastInterval = Math.max(450, 800 - (chapterId - 1) * 60);
          spawns.push({
            enemyType: fastEnemy,
            count: fastCount,
            intervalMs: fastInterval,
            delayMs: 4000,
            xDistribution: 'LeftWing',
            hpMultiplier: waveHpMult
          });
        }

        // Heavy tank branch (Shield Guard in early chapters, Iron Pagoda in late chapters)
        if (w >= 5) {
          const heavyEnemy = chapterId >= 4 ? 'iron_pagoda' : 'shield_guard';
          const heavyCount = 4 + (chapterId - 1) + Math.floor(w * 0.5);
          const heavyInterval = Math.max(800, 1400 - (chapterId - 1) * 100);
          spawns.push({
            enemyType: heavyEnemy,
            count: heavyCount,
            intervalMs: heavyInterval,
            delayMs: 7000,
            xDistribution: 'CenterValley',
            hpMultiplier: waveHpMult
          });
        }

        // Special siege & ranged branch (Bowman in Ch2/Ch3, Bomb Carrier / Siege Ram in Ch4/Ch5)
        if (w >= 7 && chapterId >= 2) {
          const siegeEnemy = chapterId === 4 ? 'bomb_carrier' : (chapterId === 5 ? 'siege_ram' : 'ranged_bowman');
          const siegeCount = 3 + (chapterId - 2) + Math.floor(w * 0.4);
          const siegeInterval = Math.max(900, 1600 - (chapterId - 1) * 100);
          spawns.push({
            enemyType: siegeEnemy,
            count: siegeCount,
            intervalMs: siegeInterval,
            delayMs: 10000,
            xDistribution: 'RandomFull',
            hpMultiplier: waveHpMult
          });
        }
      }
    }

    waves.push({
      waveNumber: w,
      prepTimeSec,
      durationSec,
      stipend,
      spawns,
      isEliteWave,
      isBossWave,
      bossConfig: isBossWave ? bossConfig : undefined,
      specialRules: isEliteWave ? { guaranteedTacticsQuality: 'gold' } : undefined
    });
  }

  return waves;
}

// =============================================================================
// Chapter 1 Stages Wave Configurations (Stages 1..4)
// =============================================================================

export const CHAPTER_1_STAGES_WAVES: Record<number, StageWaveConfig> = {
  // Stage 1: 6 Waves
  1: {
    stageId: 1,
    chapterId: 1,
    stageName: '《风陵渡口》',
    totalWaves: 6,
    waves: CHAPTER_1_MASTER_WAVES.slice(0, 6).map((w: StageWaveDefinition, idx: number) => ({
      ...w,
      waveNumber: idx + 1
    }))
  },

  // Stage 2: 8 Waves
  2: {
    stageId: 2,
    chapterId: 1,
    stageName: '《华阴前哨》',
    totalWaves: 8,
    waves: CHAPTER_1_MASTER_WAVES.slice(0, 8).map((w: StageWaveDefinition, idx: number) => ({
      ...w,
      waveNumber: idx + 1
    }))
  },

  // Stage 3: 8 Waves
  3: {
    stageId: 3,
    chapterId: 1,
    stageName: '《函谷古道》',
    totalWaves: 8,
    waves: CHAPTER_1_MASTER_WAVES.slice(0, 8).map((w: StageWaveDefinition, idx: number) => ({
      ...w,
      waveNumber: idx + 1
    }))
  },

  // Stage 4: Full 10 Waves with Boss
  4: {
    stageId: 4,
    chapterId: 1,
    stageName: '《潼关决战》',
    totalWaves: 10,
    waves: CHAPTER_1_MASTER_WAVES
  }
};

// =============================================================================
// All 20 Stages Master Configuration (Chapters 1-5)
// =============================================================================

function buildAllStagesWaves(): Record<number, StageWaveConfig> {
  const configs: Record<number, StageWaveConfig> = { ...CHAPTER_1_STAGES_WAVES };

  for (let stageId = 5; stageId <= 20; stageId++) {
    const stage = CAMPAIGN_STAGES_CONFIG[stageId];
    if (!stage) {
      continue;
    }

    let bossConfig: BossWaveConfig | undefined;
    if (stage.isBossStage) {
      switch (stage.chapterId) {
        case 2:
          bossConfig = CHAPTER_2_BOSS_XUANWU;
          break;
        case 3:
          bossConfig = CHAPTER_3_BOSS_KHAN;
          break;
        case 4:
          bossConfig = CHAPTER_4_BOSS_CORPSE_DEMON;
          break;
        case 5:
          bossConfig = CHAPTER_5_BOSS_TAOTIE;
          break;
        default:
          bossConfig = CHAPTER_1_BOSS_BEAR_KING;
          break;
      }
    }

    const waves = createChapterWaves(
      stage.chapterId,
      stage.totalWaves,
      stage.baseEnemyHpMultiplier,
      bossConfig
    );

    configs[stageId] = {
      stageId: stage.stageId,
      chapterId: stage.chapterId,
      stageName: stage.name,
      totalWaves: stage.totalWaves,
      waves
    };
  }

  return configs;
}

export const ALL_CAMPAIGN_STAGES_WAVES: Record<number, StageWaveConfig> = buildAllStagesWaves();

/**
 * Procedural wave configuration generator for horizontal extension or fallback.
 */
export function generateStageWaveConfig(stageId: number): StageWaveConfig {
  if (ALL_CAMPAIGN_STAGES_WAVES[stageId]) {
    return ALL_CAMPAIGN_STAGES_WAVES[stageId];
  }

  const stage = CAMPAIGN_STAGES_CONFIG[stageId];
  if (!stage) {
    throw new Error(`[CampaignWavesConfig] Stage ID ${stageId} not found in CAMPAIGN_STAGES_CONFIG.`);
  }

  const waves = createChapterWaves(stage.chapterId, stage.totalWaves, stage.baseEnemyHpMultiplier);
  return {
    stageId: stage.stageId,
    chapterId: stage.chapterId,
    stageName: stage.name,
    totalWaves: stage.totalWaves,
    waves
  };
}

/**
 * Stage wave config cache.
 */
const stageWaveConfigCache: Map<number, StageWaveConfig> = new Map();

/**
 * Master API: Returns the complete StageWaveConfig for any stage 1..20.
 */
export function getStageWaveConfig(stageId: number): StageWaveConfig {
  if (stageWaveConfigCache.has(stageId)) {
    return stageWaveConfigCache.get(stageId)!;
  }

  const config = ALL_CAMPAIGN_STAGES_WAVES[stageId] ?? generateStageWaveConfig(stageId);
  stageWaveConfigCache.set(stageId, config);
  return config;
}
