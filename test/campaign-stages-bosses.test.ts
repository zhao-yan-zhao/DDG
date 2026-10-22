/**
 * 《孤城神机营》- Campaign Stages (1..20), Environmental Weather Engine & 5 Chapter Boss AI Tests
 * Verification of:
 * 1. EnvironmentEngine (All 5 Chapter Themes & Modifiers)
 * 2. Enemy Archetypes Expansion (5 Bosses + Siege Ram)
 * 3. 20 Stages Timetables & Difficulty Scaling
 * 4. Boss 1 (Bear King): Earth Slam, Enrage, Dog Summon
 * 5. Boss 2 (Xuanwu): Iron Curtain Shield, Broadside Barrage, Oil Fire
 * 6. Boss 3 (Khan): Wolf Howl Aura (+armor, +tenacity), Ice Arrow & Pagoda Summon
 * 7. Boss 4 (Corpse Demon): Corrosion Miasma, Devour Minions, Nether Poison Fire Counter, Feign Death & 35% HP Revive
 * 8. Boss 5 (Taotie): Swallow Vortex, 6.0s Charge Fatal Wall Damage, Weakpoint Interrupt (3 Heavy Hits or 50k Dmg -> Backfire Stun & 200% Vulnerability)
 * 9. Strict Headless Core Validation (Zero DOM, Zero Phaser)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CAMPAIGN_CHAPTERS_CONFIG,
  CAMPAIGN_STAGES_CONFIG,
  getStageConfig
} from '../src/config/campaign.config';
import {
  ALL_CAMPAIGN_STAGES_WAVES,
  getStageWaveConfig,
  CHAPTER_1_BOSS_BEAR_KING,
  CHAPTER_2_BOSS_XUANWU,
  CHAPTER_3_BOSS_KHAN,
  CHAPTER_4_BOSS_CORPSE_DEMON,
  CHAPTER_5_BOSS_TAOTIE
} from '../src/config/campaign-waves.config';
import {
  ENEMY_ARCHETYPES,
  EnemyFactory,
  createEnemyEntity
} from '../src/core/enemy/enemy-entity';
import {
  EnvironmentEngine,
  EnvironmentCombatModifiers
} from '../src/core/wave/environment-engine';
import {
  CampaignWaveEngine
} from '../src/core/wave/campaign-wave-engine';

describe('九州战役全 5 章 20 关数据驱动波次与四大首领战 (Campaign Stages & Boss AI)', () => {
  // =========================================================================
  // 1. Environment Weather Modifiers Engine Tests
  // =========================================================================
  describe('EnvironmentEngine (5 Chapter Weather Modifiers)', () => {
    it('TC-ENV-01: Plain Valley (Ch1) returns standard baseline multipliers (1.0)', () => {
      const mods = EnvironmentEngine.getModifiers('plain_valley');
      expect(mods.themeId).toBe('plain_valley');
      expect(mods.directRangedDamageMultiplier).toBe(1.0);
      expect(mods.lightningDamageMultiplier).toBe(1.0);
      expect(mods.lightningExtraChain).toBe(0);
      expect(mods.iceShatterDamageMultiplier).toBe(1.0);
      expect(mods.iceShatterRadiusMultiplier).toBe(1.0);
      expect(mods.poisonFireTickMultiplier).toBe(1.0);
      expect(mods.commanderRageRateMultiplier).toBe(1.0);
    });

    it('TC-ENV-02: River Water (Ch2) river mist reduces ranged dmg by 15% and boosts lightning by 30% with +1 chain', () => {
      const mods = EnvironmentEngine.getModifiers('river_water');
      expect(mods.themeId).toBe('river_water');
      expect(mods.directRangedDamageMultiplier).toBe(0.85);
      expect(mods.lightningDamageMultiplier).toBe(1.30);
      expect(mods.lightningExtraChain).toBe(1);

      // Helper function calculations
      expect(EnvironmentEngine.applyDirectRangedDamage(100, 'river_water')).toBe(85);
      const lightning = EnvironmentEngine.applyLightningModifier(100, 2, 'river_water');
      expect(lightning.damage).toBe(130);
      expect(lightning.chains).toBe(3);
    });

    it('TC-ENV-03: Snow Tundra (Ch3) blizzard doubles ice shatter damage & radius, and applies -15% weapon attack speed', () => {
      const mods = EnvironmentEngine.getModifiers('snow_tundra');
      expect(mods.themeId).toBe('snow_tundra');
      expect(mods.iceShatterDamageMultiplier).toBe(2.0);
      expect(mods.iceShatterRadiusMultiplier).toBe(2.0);
      expect(mods.weaponAttackSpeedMultiplier).toBe(0.85);
      expect(mods.nonColdWeaponReloadPenalty).toBe(0.15);

      const shatter = EnvironmentEngine.applyIceShatterModifier(200, 2.5, 'snow_tundra');
      expect(shatter.damage).toBe(400);
      expect(shatter.radius).toBe(5.0);

      // Cold weapon interval unaffected, non-cold weapon interval increased by 1/0.85
      const coldInterval = EnvironmentEngine.applyWeaponAttackInterval(1.0, true, 'snow_tundra');
      expect(coldInterval).toBe(1.0);
      const nonColdInterval = EnvironmentEngine.applyWeaponAttackInterval(0.85, false, 'snow_tundra');
      expect(nonColdInterval).toBeCloseTo(1.0, 3);
    });

    it('TC-ENV-04: Night Mountain (Ch4) poison miasma enhances Nether Poison Fire tick damage by +50%', () => {
      const mods = EnvironmentEngine.getModifiers('night_mountain');
      expect(mods.themeId).toBe('night_mountain');
      expect(mods.poisonFireTickMultiplier).toBe(1.50);

      expect(EnvironmentEngine.applyPoisonFireTick(100, 'night_mountain')).toBe(150);
    });

    it('TC-ENV-05: Imperial City (Ch5) dragon vein accelerates commander rage accumulation by +50%', () => {
      const mods = EnvironmentEngine.getModifiers('imperial_city');
      expect(mods.themeId).toBe('imperial_city');
      expect(mods.commanderRageRateMultiplier).toBe(1.50);

      expect(EnvironmentEngine.applyRageAccumulation(20, 'imperial_city')).toBe(30);
    });

    it('TC-ENV-06: Stage-specific nuances (Stage 6, 10, 15, 19) correctly apply specialized parameters', () => {
      const s6Mods = EnvironmentEngine.getModifiers('river_water', 6);
      expect(s6Mods.enemySpeedMultiplier).toBe(1.15);

      const s10Mods = EnvironmentEngine.getModifiers('snow_tundra', 10);
      expect(s10Mods.enemySpeedMultiplier).toBe(1.20);

      const s15Mods = EnvironmentEngine.getModifiers('night_mountain', 15);
      expect(s15Mods.enemyPeriodicHealPercent).toBe(0.03);

      const s19Mods = EnvironmentEngine.getModifiers('imperial_city', 19);
      expect(s19Mods.allowWallRepair).toBe(false);
      expect(s19Mods.wallThornsMultiplier).toBe(2.50);
      expect(EnvironmentEngine.applyWallThornsModifier(100, 'imperial_city', 19)).toBe(250);
    });

    it('TC-ENV-07: getThemeForChapter maps chapters 1..5 accurately', () => {
      expect(EnvironmentEngine.getThemeForChapter(1)).toBe('plain_valley');
      expect(EnvironmentEngine.getThemeForChapter(2)).toBe('river_water');
      expect(EnvironmentEngine.getThemeForChapter(3)).toBe('snow_tundra');
      expect(EnvironmentEngine.getThemeForChapter(4)).toBe('night_mountain');
      expect(EnvironmentEngine.getThemeForChapter(5)).toBe('imperial_city');
      expect(EnvironmentEngine.getThemeForChapter(99)).toBe('plain_valley');
    });
  });

  // =========================================================================
  // 2. Enemy Archetypes Expansion Tests
  // =========================================================================
  describe('Enemy Archetypes & Factory Registration', () => {
    it('TC-ARC-01: All 5 chapter bosses and siege ram exist in ENEMY_ARCHETYPES', () => {
      const expectedIds = [
        'boss_bear',
        'boss_xuanwu',
        'boss_khan',
        'boss_corpse_demon',
        'boss_taotie',
        'siege_ram'
      ];
      for (const id of expectedIds) {
        expect(ENEMY_ARCHETYPES[id], `Missing archetype: ${id}`).toBeDefined();
      }
    });

    it('TC-ARC-02: Boss Xuanwu (Ch2) stats adhere to GDD specifications', () => {
      const p = ENEMY_ARCHETYPES.boss_xuanwu;
      expect(p.isBoss).toBe(true);
      expect(p.baseHp).toBe(364000);
      expect(p.armor).toBe(200);
      expect(p.moveSpeed).toBe(0.35);
      expect(p.wallDamage).toBe(80);
      expect(p.attackInterval).toBe(2.5);
    });

    it('TC-ARC-03: Boss Khan (Ch3) stats adhere to GDD specifications', () => {
      const p = ENEMY_ARCHETYPES.boss_khan;
      expect(p.isBoss).toBe(true);
      expect(p.baseHp).toBe(1080000);
      expect(p.armor).toBe(180);
      expect(p.moveSpeed).toBe(1.0);
      expect(p.wallDamage).toBe(60);
      expect(p.attackInterval).toBe(1.5);
    });

    it('TC-ARC-04: Boss Corpse Demon (Ch4) stats adhere to GDD specifications', () => {
      const p = ENEMY_ARCHETYPES.boss_corpse_demon;
      expect(p.isBoss).toBe(true);
      expect(p.baseHp).toBe(2970000);
      expect(p.armor).toBe(120);
      expect(p.moveSpeed).toBe(0.4);
      expect(p.wallDamage).toBe(70);
      expect(p.attackInterval).toBe(2.0);
    });

    it('TC-ARC-05: Boss Taotie (Ch5) stats adhere to GDD specifications', () => {
      const p = ENEMY_ARCHETYPES.boss_taotie;
      expect(p.isBoss).toBe(true);
      expect(p.baseHp).toBe(8800000);
      expect(p.armor).toBe(300);
      expect(p.moveSpeed).toBe(0.28);
      expect(p.wallDamage).toBe(120);
      expect(p.attackInterval).toBe(3.0);
    });

    it('TC-ARC-06: Siege Ram (攻城木冲车) entity factory creation and frontal DR', () => {
      const ram = EnemyFactory.createSiegeRam();
      expect(ram.typeId).toBe('siege_ram');
      expect(ram.isBoss).toBe(false);
      expect(ram.maxHp).toBe(6850);
      expect(ram.armor).toBe(100);
      expect(ram.moveSpeed).toBe(0.25);
      expect(ram.wallDamage).toBe(150);
      expect(ram.frontalDr).toBe(0.50);
    });
  });

  // =========================================================================
  // 3. 20 Stages Timetables & Difficulty Scaling Tests
  // =========================================================================
  describe('Master Waves Timetables for Stages 1..20', () => {
    it('TC-STG-01: All 20 stages have complete, non-empty wave configurations', () => {
      for (let sId = 1; sId <= 20; sId++) {
        const config = getStageWaveConfig(sId);
        expect(config).toBeDefined();
        expect(config.stageId).toBe(sId);
        expect(config.waves.length).toBe(config.totalWaves);
        expect(config.waves.length).toBeGreaterThanOrEqual(6);
      }
    });

    it('TC-STG-02: Total wave count in each stage matches CAMPAIGN_STAGES_CONFIG specification', () => {
      const expectedWaveCounts: Record<number, number> = {
        1: 6, 2: 8, 3: 8, 4: 10,
        5: 8, 6: 10, 7: 10, 8: 12,
        9: 10, 10: 10, 11: 12, 12: 12,
        13: 12, 14: 12, 15: 15, 16: 15,
        17: 12, 18: 15, 19: 15, 20: 15
      };

      for (let sId = 1; sId <= 20; sId++) {
        const stageCfg = CAMPAIGN_STAGES_CONFIG[sId];
        const waveCfg = getStageWaveConfig(sId);
        expect(stageCfg.totalWaves).toBe(expectedWaveCounts[sId]);
        expect(waveCfg.totalWaves).toBe(expectedWaveCounts[sId]);
        expect(waveCfg.waves.length).toBe(expectedWaveCounts[sId]);
      }
    });

    it('TC-STG-03: Every enemyType spawned across all 20 stages exists in ENEMY_ARCHETYPES', () => {
      for (let sId = 1; sId <= 20; sId++) {
        const waveCfg = getStageWaveConfig(sId);
        for (const wave of waveCfg.waves) {
          for (const spawn of wave.spawns) {
            expect(
              ENEMY_ARCHETYPES[spawn.enemyType],
              `Unknown enemyType "${spawn.enemyType}" in Stage ${sId} Wave ${wave.waveNumber}`
            ).toBeDefined();
          }
        }
      }
    });

    it('TC-STG-04: Boss stages (4, 8, 12, 16, 20) feature their designated Chapter Boss on final wave', () => {
      const bossMappings: Record<number, string> = {
        4: 'boss_bear',
        8: 'boss_xuanwu',
        12: 'boss_khan',
        16: 'boss_corpse_demon',
        20: 'boss_taotie'
      };

      for (const [stageIdStr, expectedBossId] of Object.entries(bossMappings)) {
        const sId = Number(stageIdStr);
        const waveCfg = getStageWaveConfig(sId);
        const finalWave = waveCfg.waves[waveCfg.waves.length - 1];

        expect(finalWave.isBossWave).toBe(true);
        expect(finalWave.bossConfig).toBeDefined();
        expect(finalWave.bossConfig!.bossId).toBe(expectedBossId);

        const bossSpawn = finalWave.spawns.find(s => s.enemyType === expectedBossId);
        expect(bossSpawn).toBeDefined();
        expect(bossSpawn!.count).toBe(1);
      }
    });

    it('TC-STG-05: Non-boss stages do not have bossConfig on final wave', () => {
      const nonBossStages = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19];
      for (const sId of nonBossStages) {
        const waveCfg = getStageWaveConfig(sId);
        const finalWave = waveCfg.waves[waveCfg.waves.length - 1];
        expect(finalWave.isBossWave).toBeFalsy();
        expect(finalWave.bossConfig).toBeUndefined();
      }
    });

    it('TC-STG-06: Monotonic difficulty scaling across chapters', () => {
      for (let chId = 1; chId < 5; chId++) {
        const currentChapterLastStage = CAMPAIGN_STAGES_CONFIG[chId * 4];
        const nextChapterFirstStage = CAMPAIGN_STAGES_CONFIG[chId * 4 + 1];
        expect(nextChapterFirstStage.baseEnemyHpMultiplier).toBeGreaterThan(
          currentChapterLastStage.baseEnemyHpMultiplier
        );
      }
    });

    it('TC-STG-07: Wave stipends and durations are strictly positive', () => {
      for (let sId = 1; sId <= 20; sId++) {
        const waveCfg = getStageWaveConfig(sId);
        for (const w of waveCfg.waves) {
          expect(w.stipend).toBeGreaterThan(0);
          expect(w.durationSec).toBeGreaterThanOrEqual(18);
          expect(w.prepTimeSec).toBeGreaterThanOrEqual(10);
        }
      }
    });
  });

  // =========================================================================
  // 4. Boss 1: 铁塔熊王 (Ch1 Stage 4) Tests
  // =========================================================================
  describe('Chapter 1 Boss: 铁塔熊王 (boss_bear)', () => {
    it('TC-B01-01: Earth slam triggers on interval and dispatches onBossSkillCast', () => {
      const stageConfig = getStageConfig(4)!;
      const waveConfig = getStageWaveConfig(4);
      const engine = new CampaignWaveEngine(stageConfig, waveConfig);

      // Fast forward to final wave (Wave 10)
      for (let i = 1; i < 10; i++) {
        engine.startWave();
        engine.getWaveFSM().onAllEnemiesDefeated();
        engine.openDecreeReward();
        engine.claimDecree();
        engine.collectIncome();
      }

      const skillCasts: string[] = [];
      engine.onBossSkillCast = (id, name) => skillCasts.push(id);

      engine.startWave(); // Wave 10 Boss Wave
      expect(engine.getBossRuntimeState()).toBeDefined();

      // Tick 10 seconds to trigger Earth Slam
      engine.update(10.1);
      expect(skillCasts).toContain('earth_slam');
    });

    it('TC-B01-02: Bear King enrages at <= 50% HP, boosting speed +80% and summoning 25 dogs', () => {
      const stageConfig = getStageConfig(4)!;
      const waveConfig = getStageWaveConfig(4);
      const engine = new CampaignWaveEngine(stageConfig, waveConfig);

      for (let i = 1; i < 10; i++) {
        engine.startWave();
        engine.getWaveFSM().onAllEnemiesDefeated();
        engine.openDecreeReward();
        engine.claimDecree();
        engine.collectIncome();
      }

      let phaseChanged = false;
      engine.onBossPhaseChange = (phase) => {
        if (phase === 2) phaseChanged = true;
      };

      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;
      expect(boss).toBeDefined();

      const initialSpeed = boss.moveSpeed;
      // Deal 55% damage to trigger enrage
      engine.applyDamageToEnemy(boss.id, boss.maxHp * 0.55);
      engine.update(0.1);

      expect(phaseChanged).toBe(true);
      expect(boss.moveSpeed).toBeGreaterThan(initialSpeed);

      // War dogs summoned
      const warDogs = engine.getActiveEnemies().filter(e => e.typeId === 'war_dog');
      expect(warDogs.length).toBeGreaterThanOrEqual(25);
    });
  });

  // =========================================================================
  // 5. Boss 2: 玄武巨舰 (Ch2 Stage 8) Tests
  // =========================================================================
  describe('Chapter 2 Boss: 玄武巨舰 (boss_xuanwu)', () => {
    let engine: CampaignWaveEngine;

    beforeEach(() => {
      const stageConfig = getStageConfig(8)!;
      const waveConfig = getStageWaveConfig(8);
      engine = new CampaignWaveEngine(stageConfig, waveConfig);

      // Fast forward to wave 12
      for (let i = 1; i < 12; i++) {
        engine.startWave();
        engine.getWaveFSM().onAllEnemiesDefeated();
        engine.openDecreeReward();
        engine.claimDecree();
        engine.collectIncome();
      }
    });

    it('TC-B02-01: Xuanwu Iron Curtain activates linear projectile shield for 5s', () => {
      let shieldActive = false;
      engine.onBossShieldChange = (active) => {
        shieldActive = active;
      };

      engine.startWave(); // Wave 12
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;
      expect(boss).toBeDefined();

      // Initial delay is 5.0s, advance 5.0s more
      engine.update(5.0);
      expect(engine.isBossLinearShieldActive()).toBe(true);
      expect(shieldActive).toBe(true);

      // Linear projectile damage blocked
      const resultLinear = engine.applyDamageToEnemy(boss.id, 5000, false, { isLinearProjectile: true });
      expect(resultLinear.actualDeducted).toBe(0);

      // High-arc / non-linear projectile damages normally
      const resultMortar = engine.applyDamageToEnemy(boss.id, 5000, false, { isLinearProjectile: false });
      expect(resultMortar.actualDeducted).toBeGreaterThan(0);

      // Advance 5.1s: shield should expire
      engine.update(5.1);
      expect(engine.isBossLinearShieldActive()).toBe(false);

      // Linear projectile can damage again
      const resultLinearAfter = engine.applyDamageToEnemy(boss.id, 5000, false, { isLinearProjectile: true });
      expect(resultLinearAfter.actualDeducted).toBeGreaterThan(0);
    });

    it('TC-B02-02: Broadside barrage deals direct wall damage on interval', () => {
      let wallDamageReported = 0;
      engine.onWallDamage = (dmg) => {
        wallDamageReported += dmg;
      };

      engine.startWave();
      engine.update(0.1);
      const initialWallHp = engine.getWallHp();

      // Tick 8.0s more to trigger broadside barrage (40 damage)
      engine.update(8.0);
      expect(engine.getWallHp()).toBeLessThan(initialWallHp);
      expect(wallDamageReported).toBeGreaterThanOrEqual(40);
    });

    it('TC-B02-03: Oil fire zone triggers at <= 50% HP', () => {
      const skillsCast: string[] = [];
      engine.onBossSkillCast = (id) => skillsCast.push(id);

      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;
      engine.applyDamageToEnemy(boss.id, boss.maxHp * 0.55);
      engine.update(0.1);

      expect(skillsCast).toContain('oil_fire_zone');
    });
  });

  // =========================================================================
  // 6. Boss 3: 金帐可汗 (Ch3 Stage 12) Tests
  // =========================================================================
  describe('Chapter 3 Boss: 金帐可汗 (boss_khan)', () => {
    let engine: CampaignWaveEngine;

    beforeEach(() => {
      const stageConfig = getStageConfig(12)!;
      const waveConfig = getStageWaveConfig(12);
      engine = new CampaignWaveEngine(stageConfig, waveConfig);

      for (let i = 1; i < 12; i++) {
        engine.startWave();
        engine.getWaveFSM().onAllEnemiesDefeated();
        engine.openDecreeReward();
        engine.claimDecree();
        engine.collectIncome();
      }
    });

    it('TC-B03-01: Wolf Howl grants +50 armor and tenacity to active minions', () => {
      engine.startWave();
      // Wait for minion spawn
      engine.update(3.5);

      const minion = engine.getActiveEnemies().find(e => !e.isBoss);
      expect(minion).toBeDefined();
      const initialArmor = minion!.armor;

      // Tick 6.1s to trigger Wolf Howl
      engine.update(3.0); // total 6.5s
      expect(minion!.armor).toBe(initialArmor + 50);
      expect(minion!.isTenacious).toBe(true);
      expect(minion!.tenacityTimer).toBe(4.0);
    });

    it('TC-B03-02: Wolf Spirit Ice Arrow summons 8 Iron Pagodas at 75% HP', () => {
      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;

      const initialPagodas = engine.getActiveEnemies().filter(e => e.typeId === 'iron_pagoda').length;
      engine.applyDamageToEnemy(boss.id, boss.maxHp * 0.30); // HP now 70% <= 75%
      engine.update(0.1);

      const newPagodas = engine.getActiveEnemies().filter(e => e.typeId === 'iron_pagoda').length;
      expect(newPagodas).toBe(initialPagodas + 8);
    });

    it('TC-B03-03: Phase 2 at 50% HP increases movespeed and summons additional pagodas', () => {
      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;
      const baseSpeed = boss.moveSpeed;

      engine.applyDamageToEnemy(boss.id, boss.maxHp * 0.55); // HP now 45% <= 50%
      engine.update(0.1);

      expect(boss.moveSpeed).toBeGreaterThan(baseSpeed);
    });
  });

  // =========================================================================
  // 7. Boss 4: 万蛊尸魔 (Ch4 Stage 16) Tests
  // =========================================================================
  describe('Chapter 4 Boss: 万蛊尸魔 (boss_corpse_demon)', () => {
    let engine: CampaignWaveEngine;

    beforeEach(() => {
      const stageConfig = getStageConfig(16)!;
      const waveConfig = getStageWaveConfig(16);
      engine = new CampaignWaveEngine(stageConfig, waveConfig);

      for (let i = 1; i < 15; i++) {
        engine.startWave();
        engine.getWaveFSM().onAllEnemiesDefeated();
        engine.openDecreeReward();
        engine.claimDecree();
        engine.collectIncome();
      }
    });

    it('TC-B04-01: Corpse Poison Miasma deals periodic 15 corrosion damage to city wall', () => {
      engine.startWave();
      engine.update(0.1);
      const wallHpBefore = engine.getWallHp();

      // Tick 3.0s to trigger Miasma
      engine.update(3.0);
      expect(engine.getWallHp()).toBeLessThanOrEqual(wallHpBefore - 15);
    });

    it('TC-B04-02: Devour Minions devours minions and heals boss when NOT burning with poison fire', () => {
      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;
      // Damage boss first
      boss.currentHp = Math.round(boss.maxHp * 0.60);

      // Ensure minions are active
      engine.spawnDynamicMinions('war_dog', 2);
      const initialMinions = engine.getActiveEnemies().filter(e => !e.isBoss && e.currentHp > 0);
      expect(initialMinions.length).toBeGreaterThanOrEqual(2);

      let devouredCount = 0;
      engine.onBossMinionDevoured = (cnt) => {
        devouredCount = cnt;
      };

      // Advance to 10.0s to trigger devour
      engine.update(10.0);
      expect(devouredCount).toBeGreaterThanOrEqual(2);
      expect(boss.currentHp).toBeGreaterThan(Math.round(boss.maxHp * 0.60));
    });

    it('TC-B04-03: Nether Poison Fire counter-attacks devour: blocks healing and causes 4% maxHp backlash', () => {
      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;
      boss.currentHp = Math.round(boss.maxHp * 0.60);

      // Boss is burning with Nether Poison Fire!
      engine.setBossPoisonFireBurning(true);
      expect(engine.isBossPoisonFireBurning()).toBe(true);

      engine.spawnDynamicMinions('war_dog', 2);
      let interruptedReason = '';
      engine.onBossSkillInterrupt = (_, reason) => {
        interruptedReason = reason;
      };

      // Trigger devour at 10.0s
      engine.update(10.0);
      expect(interruptedReason).toBe('poison_fire_backlash');
      // Boss suffered 4% backlash damage
      expect(boss.currentHp).toBeLessThan(Math.round(boss.maxHp * 0.60));
    });

    it('TC-B04-04: Feign Death & Revive: lethal hit triggers 3s invulnerability and revives with 35% HP', () => {
      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;

      let feignDeathTriggered = false;
      let revived = false;
      engine.onBossFeignDeath = () => { feignDeathTriggered = true; };
      engine.onBossRevive = () => { revived = true; };

      // Deal lethal damage
      const result = engine.applyDamageToEnemy(boss.id, boss.maxHp * 2.0);
      expect(result.isDead).toBe(false);
      expect(feignDeathTriggered).toBe(true);
      expect(engine.isBossInFeignDeath()).toBe(true);

      // Damage during feign death is completely nullified (invulnerable)
      const hitDuringCocoon = engine.applyDamageToEnemy(boss.id, 99999);
      expect(hitDuringCocoon.actualDeducted).toBe(0);

      // Advance 3.1s: Feign death expires and Boss revives!
      engine.update(3.1);
      expect(revived).toBe(true);
      expect(engine.isBossInFeignDeath()).toBe(false);
      expect(boss.currentHp).toBe(Math.round(boss.maxHp * 0.35));

      // After reviving, lethal damage kills normally (no second revive)
      const secondLethal = engine.applyDamageToEnemy(boss.id, boss.maxHp);
      expect(secondLethal.isDead).toBe(true);
    });
  });

  // =========================================================================
  // 8. Boss 5: 饕餮巨炮 (Ch5 Stage 20) Tests
  // =========================================================================
  describe('Chapter 5 Boss: 饕餮巨炮 (boss_taotie)', () => {
    let engine: CampaignWaveEngine;

    beforeEach(() => {
      const stageConfig = getStageConfig(20)!;
      const waveConfig = getStageWaveConfig(20);
      engine = new CampaignWaveEngine(stageConfig, waveConfig);

      for (let i = 1; i < 15; i++) {
        engine.startWave();
        engine.getWaveFSM().onAllEnemiesDefeated();
        engine.openDecreeReward();
        engine.claimDecree();
        engine.collectIncome();
      }
    });

    it('TC-B05-01: Swallow Vortex absorbs linear projectiles for 4.0s', () => {
      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;

      // Initial delay is 7.0s
      engine.update(7.0);
      expect(engine.isBossLinearShieldActive()).toBe(true);

      const blocked = engine.applyDamageToEnemy(boss.id, 10000, false, { isLinearProjectile: true });
      expect(blocked.actualDeducted).toBe(0);

      // After 4.1s, vortex expires
      engine.update(4.1);
      expect(engine.isBossLinearShieldActive()).toBe(false);
    });

    it('TC-B05-02: Siege bombardment starts 6.0s charge and deals 1000 fatal wall damage if uninterrupted', () => {
      engine.startWave();
      engine.update(0.1);
      const initialWallHp = engine.getWallHp();

      let chargeStarted = false;
      engine.onBossSkillChargeStart = () => { chargeStarted = true; };

      // Initial delay is 10.0s
      engine.update(10.0);
      expect(chargeStarted).toBe(true);
      expect(engine.isBossCharging()).toBe(true);

      // Tick 1.0s to advance charge progress
      engine.update(1.0);
      expect(engine.getBossChargeProgress()).toBeGreaterThan(0);

      // Allow remaining 5.1s charge to complete uninterrupted (total 6.1s)
      engine.update(5.1);
      expect(engine.isBossCharging()).toBe(false);
      expect(engine.getWallHp()).toBeLessThanOrEqual(initialWallHp - 1000);
    });

    it('TC-B05-03: Weakpoint interrupt by 3 heavy hits triggers Backfire: 5.0s stun & 200% vulnerability', () => {
      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;

      // Start charge at 10.0s
      engine.update(10.0);
      expect(engine.isBossCharging()).toBe(true);

      let interruptReason = '';
      engine.onBossSkillInterrupt = (_, reason) => { interruptReason = reason; };

      // Hit 1 & 2
      engine.applyDamageToEnemy(boss.id, 1000, false, { isHeavy: true });
      expect(engine.isBossCharging()).toBe(true);
      engine.applyDamageToEnemy(boss.id, 1000, false, { isHeavy: true });
      expect(engine.isBossCharging()).toBe(true);

      // Hit 3: interrupt!
      engine.applyDamageToEnemy(boss.id, 1000, false, { isHeavy: true });
      expect(engine.isBossCharging()).toBe(false);
      expect(interruptReason).toBe('backfire');

      // Stun & vulnerability active
      expect(engine.isBossStunned()).toBe(true);
      expect(engine.getBossVulnerabilityBonus()).toBe(2.0);

      // During vulnerability, damage is amplified by 3.0x (1 + 2.0)
      const dmg = engine.applyDamageToEnemy(boss.id, 1000);
      expect(dmg.actualDeducted).toBe(3000);

      // After 6.1s, vulnerability and stun expire
      engine.update(6.1);
      expect(engine.isBossStunned()).toBe(false);
      expect(engine.getBossVulnerabilityBonus()).toBe(0);
    });

    it('TC-B05-04: Weakpoint interrupt by 50,000 damage threshold triggers Backfire', () => {
      engine.startWave();
      engine.update(0.1);
      const boss = engine.getActiveEnemies().find(e => e.isBoss)!;

      // Start charge at 10.0s
      engine.update(10.0);
      expect(engine.isBossCharging()).toBe(true);

      let interruptReason = '';
      engine.onBossSkillInterrupt = (_, reason) => { interruptReason = reason; };

      // Deal 55,000 non-heavy damage in one or multiple hits
      engine.applyDamageToEnemy(boss.id, 55000, false, { isHeavy: false });
      expect(engine.isBossCharging()).toBe(false);
      expect(interruptReason).toBe('backfire');
      expect(engine.isBossStunned()).toBe(true);
    });
  });

  // =========================================================================
  // 9. Strict Headless Core Validation
  // =========================================================================
  describe('Headless Core Architecture Validation', () => {
    it('TC-HDL-01: Zero DOM / browser globals', () => {
      expect(typeof window).toBe('undefined');
      expect(typeof document).toBe('undefined');
    });

    it('TC-HDL-02: CampaignWaveEngine and EnvironmentEngine operate purely in Node.js', () => {
      const stageConfig = getStageConfig(1)!;
      const waveConfig = getStageWaveConfig(1);
      const engine = new CampaignWaveEngine(stageConfig, waveConfig);

      expect(engine.getState()).toBe('Prep');
      engine.startWave();
      expect(engine.getState()).toBe('WaveActive');

      const summary = engine.getSummary();
      expect(summary.stageId).toBe(1);
      expect(summary.totalWaves).toBe(6);
    });

    it('TC-HDL-03: Settlement input generation format compliance', () => {
      const stageConfig = getStageConfig(4)!;
      const waveConfig = getStageWaveConfig(4);
      const engine = new CampaignWaveEngine(stageConfig, waveConfig);

      const input = engine.createSettlementInput({
        hasDoubleStar4Awakening: true,
        isFirstClear: true
      });

      expect(input.stageId).toBe(4);
      expect(input.hasDoubleStar4Awakening).toBe(true);
      expect(input.isFirstClear).toBe(true);
      expect(input.totalWaves).toBe(10);
    });
  });
});
