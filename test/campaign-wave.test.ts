/**
 * 《孤城神机营》- Campaign Config & Decoupled Wave Engine Unit Tests
 * Verification of Campaign Chapters/Stages Config, Wave Timetable, and CampaignWaveEngine.
 * Pure headless domain tests (Zero DOM / Zero Phaser dependencies).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CAMPAIGN_CHAPTERS_CONFIG,
  CAMPAIGN_STAGES_CONFIG,
  getStageConfig,
  getChapterConfig,
  getStagesByChapter,
  isStageUnlocked
} from '../src/config/campaign.config';
import {
  CHAPTER_1_MASTER_WAVES,
  CHAPTER_1_BOSS_BEAR_KING,
  CHAPTER_1_STAGES_WAVES,
  getStageWaveConfig
} from '../src/config/campaign-waves.config';
import { CampaignWaveEngine } from '../src/core/wave/campaign-wave-engine';
import { ENEMY_ARCHETYPES } from '../src/core/enemy/enemy-entity';

describe('Milestone GL-1: Campaign Config & Decoupled Wave Engine Tests', () => {
  // =========================================================================
  // 1. Campaign Config Integrity Tests (TC-CFG-01..04)
  // =========================================================================
  describe('Campaign Master Configuration (5 Chapters & 20 Stages)', () => {
    it('TC-CFG-01: Exactly 5 chapters configured with valid metadata and sequential stage links', () => {
      const chapterKeys = Object.keys(CAMPAIGN_CHAPTERS_CONFIG).map(Number);
      expect(chapterKeys).toHaveLength(5);
      expect(chapterKeys).toEqual([1, 2, 3, 4, 5]);

      for (let chId = 1; chId <= 5; chId++) {
        const chapter = getChapterConfig(chId);
        expect(chapter.chapterId).toBe(chId);
        expect(chapter.name.length).toBeGreaterThan(0);
        expect(chapter.subtitle.length).toBeGreaterThan(0);
        expect(chapter.description.length).toBeGreaterThan(0);
        expect(chapter.stageIds).toHaveLength(4);
        expect(chapter.stageIds).toEqual([
          (chId - 1) * 4 + 1,
          (chId - 1) * 4 + 2,
          (chId - 1) * 4 + 3,
          (chId - 1) * 4 + 4
        ]);
        expect(chapter.bossStageId).toBe(chId * 4);
        expect(chapter.bossName.length).toBeGreaterThan(0);
      }
    });

    it('TC-CFG-02: Exactly 20 stages configured with valid parameters and progressive wall HP', () => {
      const stageKeys = Object.keys(CAMPAIGN_STAGES_CONFIG).map(Number);
      expect(stageKeys).toHaveLength(20);

      for (let sId = 1; sId <= 20; sId++) {
        const stage = getStageConfig(sId);
        expect(stage.stageId).toBe(sId);
        expect(stage.chapterId).toBe(Math.ceil(sId / 4));
        expect(stage.stageIndexInChapter).toBe(((sId - 1) % 4) + 1);
        expect(stage.name.length).toBeGreaterThan(0);
        expect(stage.description.length).toBeGreaterThan(0);
        expect([6, 8, 10, 12, 15]).toContain(stage.totalWaves);
        expect(stage.wallBaseHp).toBeGreaterThanOrEqual(1000);

        if (stage.isBossStage) {
          expect(sId % 4).toBe(0); // Boss stages are 4, 8, 12, 16, 20
          expect(stage.bossName).toBeDefined();
        }
      }

      // Test helper getStagesByChapter
      const ch1Stages = getStagesByChapter(1);
      expect(ch1Stages).toHaveLength(4);
      expect(ch1Stages.map(s => s.stageId)).toEqual([1, 2, 3, 4]);

      // Test helper isStageUnlocked
      expect(isStageUnlocked(1, 1)).toBe(true);
      expect(isStageUnlocked(2, 1)).toBe(false);
      expect(isStageUnlocked(2, 2)).toBe(true);
      expect(isStageUnlocked(5, 4)).toBe(false);
      expect(isStageUnlocked(5, 5)).toBe(true);
    });

    it('TC-CFG-03: Stage reward tables have strictly non-negative values and rewarding first clears', () => {
      for (let sId = 1; sId <= 20; sId++) {
        const stage = getStageConfig(sId);
        // First clear rewards
        expect(stage.firstClearRewards.gold).toBeGreaterThan(0);
        expect(stage.firstClearRewards.iron).toBeGreaterThan(0);
        expect(stage.firstClearRewards.blueprints).toBeGreaterThanOrEqual(0);

        // Repeat clear rewards
        expect(stage.repeatRewards.gold).toBeGreaterThanOrEqual(0);
        expect(stage.repeatRewards.iron).toBeGreaterThanOrEqual(0);
        expect(stage.repeatRewards.blueprints).toBeGreaterThanOrEqual(0);

        // First clear reward is strictly greater than repeat reward
        expect(stage.firstClearRewards.gold).toBeGreaterThan(stage.repeatRewards.gold);
        expect(stage.firstClearRewards.iron).toBeGreaterThan(stage.repeatRewards.iron);
      }
    });

    it('TC-CFG-04: Enemy BaseHP difficulty multiplier scales monotonically from Stage 1 (40) to Stage 20 (1100)', () => {
      let previousMultiplier = 0;
      for (let sId = 1; sId <= 20; sId++) {
        const stage = getStageConfig(sId);
        expect(stage.baseEnemyHpMultiplier).toBeGreaterThan(previousMultiplier);
        previousMultiplier = stage.baseEnemyHpMultiplier;
      }

      expect(getStageConfig(1).baseEnemyHpMultiplier).toBe(40);
      expect(getStageConfig(4).baseEnemyHpMultiplier).toBe(50);
      expect(getStageConfig(20).baseEnemyHpMultiplier).toBe(1100);
    });
  });

  // =========================================================================
  // 2. Wave Timetable Tests (TC-TIME-01..05)
  // =========================================================================
  describe('Wave Timetable & Data-Driven Schemas', () => {
    it('TC-TIME-01: Chapter 1 wave timetable contains exact 10 waves and proper wave counts for Stages 1-4', () => {
      expect(CHAPTER_1_MASTER_WAVES).toHaveLength(10);

      const stage1WaveConfig = getStageWaveConfig(1);
      expect(stage1WaveConfig.waves).toHaveLength(6);
      expect(stage1WaveConfig.totalWaves).toBe(6);

      const stage2WaveConfig = getStageWaveConfig(2);
      expect(stage2WaveConfig.waves).toHaveLength(8);

      const stage3WaveConfig = getStageWaveConfig(3);
      expect(stage3WaveConfig.waves).toHaveLength(8);

      const stage4WaveConfig = getStageWaveConfig(4);
      expect(stage4WaveConfig.waves).toHaveLength(10);
      expect(stage4WaveConfig.totalWaves).toBe(10);
    });

    it('TC-TIME-02: All enemy archetypes referenced in wave timetables exist in ENEMY_ARCHETYPES', () => {
      for (const wave of CHAPTER_1_MASTER_WAVES) {
        for (const spawn of wave.spawns) {
          expect(ENEMY_ARCHETYPES[spawn.enemyType]).toBeDefined();
        }
      }
    });

    it('TC-TIME-03: Wave 5 is marked as Elite Wave with guaranteed gold decree card', () => {
      const wave5 = CHAPTER_1_MASTER_WAVES[4]; // 0-indexed Wave 5
      expect(wave5.waveNumber).toBe(5);
      expect(wave5.isEliteWave).toBe(true);
      expect(wave5.specialRules?.guaranteedTacticsQuality).toBe('gold');

      // Verify spawns iron_pagoda
      const hasIronPagoda = wave5.spawns.some(s => s.enemyType === 'iron_pagoda');
      expect(hasIronPagoda).toBe(true);
    });

    it('TC-TIME-04: Wave 10 Boss Bear King is configured with 135,000 HP, 150 armor, and 3 specific skills', () => {
      const wave10 = CHAPTER_1_MASTER_WAVES[9]; // 0-indexed Wave 10
      expect(wave10.waveNumber).toBe(10);
      expect(wave10.isBossWave).toBe(true);
      expect(wave10.bossConfig).toBeDefined();

      const boss = wave10.bossConfig!;
      expect(boss.bossId).toBe('boss_bear');
      expect(boss.name).toBe('黑风寨主·铁塔熊王');
      expect(boss.maxHp).toBe(135000);
      expect(boss.armor).toBe(150);
      expect(boss.moveSpeed).toBe(0.45);
      expect(boss.wallDamage).toBe(50);
      expect(boss.skills).toHaveLength(3);

      const skillIds = boss.skills.map(s => s.id);
      expect(skillIds).toContain('earth_slam');
      expect(skillIds).toContain('enrage_throw');
      expect(skillIds).toContain('summon_war_dogs');

      const earthSlam = boss.skills.find(s => s.id === 'earth_slam')!;
      expect(earthSlam.triggerType).toBe('interval');
      expect(earthSlam.intervalSec).toBe(10.0);
      expect(earthSlam.effects.stunRow0DurationSec).toBe(3.0);

      const enrageThrow = boss.skills.find(s => s.id === 'enrage_throw')!;
      expect(enrageThrow.triggerType).toBe('hp_percent');
      expect(enrageThrow.triggerHpPercent).toBe(50);
      expect(enrageThrow.effects.speedMultiplier).toBe(1.80);

      const summonDogs = boss.skills.find(s => s.id === 'summon_war_dogs')!;
      expect(summonDogs.triggerType).toBe('hp_percent');
      expect(summonDogs.effects.summonCount).toBe(25);
    });

    it('TC-TIME-05: Procedural wave generator synthesizes valid configurations for Chapters 2-5 (Stages 5-20)', () => {
      for (let sId = 5; sId <= 20; sId++) {
        const stageWaveConfig = getStageWaveConfig(sId);
        const stageConfig = getStageConfig(sId);

        expect(stageWaveConfig.stageId).toBe(sId);
        expect(stageWaveConfig.totalWaves).toBe(stageConfig.totalWaves);
        expect(stageWaveConfig.waves).toHaveLength(stageConfig.totalWaves);

        // Final wave in boss stage is boss wave
        const lastWave = stageWaveConfig.waves[stageWaveConfig.waves.length - 1];
        if (stageConfig.isBossStage) {
          expect(lastWave.isBossWave).toBe(true);
          expect(lastWave.bossConfig).toBeDefined();
        }
      }
    });
  });

  // =========================================================================
  // 3. CampaignWaveEngine Decoupled Execution Tests (TC-ENG-01..05)
  // =========================================================================
  describe('CampaignWaveEngine (解耦波次战斗驱动引擎)', () => {
    let stageConfig = getStageConfig(1);
    let stageWaveConfig = getStageWaveConfig(1);
    let engine: CampaignWaveEngine;

    beforeEach(() => {
      stageConfig = getStageConfig(1);
      stageWaveConfig = getStageWaveConfig(1);
      engine = new CampaignWaveEngine(stageConfig, stageWaveConfig, {
        extraWallMaxHp: 200,
        waveStipendBonus: 5
      });
    });

    it('TC-ENG-01: Orchestrates the 5-state wave FSM cycle without presentation dependencies', () => {
      expect(engine.getState()).toBe('Prep');
      expect(engine.getCurrentWave()).toBe(1);
      expect(engine.getMaxWallHp()).toBe(1200); // 1000 + 200 bonus
      expect(engine.getWallHp()).toBe(1200);

      const onWaveStart = vi.fn();
      engine.onWaveStart = onWaveStart;

      // 1. Start Wave: Prep -> WaveActive
      engine.startWave();
      expect(engine.getState()).toBe('WaveActive');
      expect(onWaveStart).toHaveBeenCalledWith(1, expect.anything());

      // 2. Clear Wave (simulate defeating all enemies)
      const onWaveClear = vi.fn();
      engine.onWaveClear = onWaveClear;
      (engine as any).waveSpawner.activeEnemies.clear();
      (engine as any).waveSpawner.batchStates.forEach((b: any) => {
        b.spawnedCount = b.item.count;
      });
      engine.update(0.1);

      expect(engine.getState()).toBe('WaveClear');
      expect(onWaveClear).toHaveBeenCalledWith(1, false);

      // 3. Open Decree: WaveClear -> DecreeReward
      engine.openDecreeReward();
      expect(engine.getState()).toBe('DecreeReward');

      // 4. Claim Decree: DecreeReward -> Income
      engine.claimDecree('card_001');
      expect(engine.getState()).toBe('Income');

      // 5. Collect Income: Income -> Prep (wave 2)
      const silver = engine.collectIncome(10); // 45 base + 5 bonus + 10 interest = 60
      expect(silver).toBe(60);
      expect(engine.getState()).toBe('Prep');
      expect(engine.getCurrentWave()).toBe(2);
    });

    it('TC-ENG-02: Timeline spawner simulation spawns enemies according to batch offsets and tracks active enemies', () => {
      engine.startWave();

      // At t=0, first batch starts (light_infantry has delayMs: 0)
      engine.update(0.1);
      expect(engine.getActiveEnemyCount()).toBeGreaterThan(0);

      const activeEnemies = engine.getActiveEnemies();
      expect(activeEnemies.length).toBeGreaterThan(0);
      expect(activeEnemies[0].currentHp).toBeGreaterThan(0);

      // Apply damage to an enemy
      const enemy = activeEnemies[0];
      const damageRes = engine.applyDamageToEnemy(enemy.id, 9999);
      expect(damageRes.isDead).toBe(true);
      expect(damageRes.actualDeducted).toBeGreaterThan(0);
    });

    it('TC-ENG-03: Boss Bear King Phase 2 Enrage triggers at <= 50% HP with phase change event and stat modifications', () => {
      const stage4Config = getStageConfig(4);
      const stage4WaveConfig = getStageWaveConfig(4);
      const bossEngine = new CampaignWaveEngine(stage4Config, stage4WaveConfig);

      // Fast-forward FSM to Wave 10
      (bossEngine as any).waveFSM.currentWave = 10;
      bossEngine.startWave();

      const onPhaseChange = vi.fn();
      const onSkillCast = vi.fn();
      bossEngine.onBossPhaseChange = onPhaseChange;
      bossEngine.onBossSkillCast = onSkillCast;

      bossEngine.update(0.1);
      const boss = bossEngine.getActiveEnemies().find(e => e.isBoss);
      expect(boss).toBeDefined();
      expect(boss!.typeId).toBe('boss_bear');

      const initialSpeed = boss!.moveSpeed;

      // Damage Boss down to 50% HP (135,000 / 2 = 67,500)
      bossEngine.applyDamageToEnemy(boss!.id, 67500);
      bossEngine.update(0.1);

      // Verify Enraged status and callbacks
      const bossState = bossEngine.getBossRuntimeState();
      expect(bossState?.isEnraged).toBe(true);
      expect(bossState?.currentPhase).toBe(2);
      expect(onPhaseChange).toHaveBeenCalledWith(2, boss);

      // Move speed increased by +80% (0.7 * 1.8 = 1.26)
      expect(boss!.moveSpeed).toBeCloseTo(initialSpeed * 1.8, 2);
    });

    it('TC-ENG-04: Wall HP dropping to 0 transitions engine state to Defeat and triggers defeat callback', () => {
      const onDefeat = vi.fn();
      engine.onStageDefeat = onDefeat;

      engine.startWave();
      expect(engine.getState()).toBe('WaveActive');

      // Wall takes lethal damage
      (engine as any).waveFSM.damageWall(99999);

      expect(engine.getWallHp()).toBe(0);
      expect(engine.getState()).toBe('Defeat');
      expect(onDefeat).toHaveBeenCalledWith(1, 1);

      // Test Revive functionality (WaveFSM restores HP and returns to Prep)
      engine.revive(0.5);
      expect(engine.getWallHp()).toBe(600); // 50% of 1200
      expect(engine.getState()).toBe('Prep');
    });

    it('TC-ENG-05: Generates comprehensive StageCombatSummary and SettlementInputPayload for settlement evaluation', () => {
      const payload = engine.createSettlementInput({
        hasDoubleStar4Awakening: true,
        isFirstClear: true
      });

      expect(payload.stageId).toBe(1);
      expect(payload.cleared).toBe(false);
      expect(payload.wavesCleared).toBe(0);
      expect(payload.totalWaves).toBe(6);
      expect(payload.finalWallHp).toBe(1200);
      expect(payload.maxWallHp).toBe(1200);
      expect(payload.revivesUsed).toBe(0);
      expect(payload.hasDoubleStar4Awakening).toBe(true);
      expect(payload.isFirstClear).toBe(true);

      const summary = engine.getSummary();
      expect(summary.stageId).toBe(1);
      expect(summary.chapterId).toBe(1);
      expect(summary.totalWaves).toBe(6);
      expect(summary.isBossDefeated).toBe(false);
    });
  });
});
