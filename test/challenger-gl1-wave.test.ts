/**
 * 《孤城神机营》- Adversarial Stress Test Suite: Campaign Config & Decoupled Wave Engine
 * Written by Empirical Challenger (challenger_gl1_2).
 *
 * Scopes tested:
 * 1. Timetable validation for all 20 stages (monotonous scaling, bounds, positive counts, valid IDs).
 * 2. High-speed headless simulation of Chapter 1 Tongguan (Stage 4, 10 waves tick-by-tick at 100x+ speed).
 * 3. Adversarial Edge Cases:
 *    - Early defeat at Wave 1 (wall HP to 0) -> FSM transitions, summary payload, no crash.
 *    - Boss Bear King phase 2 trigger -> <= 50% HP, enrage status, speed/damage multipliers, 25 war dogs summoned, idempotence.
 *    - Invalid stage ID queries -> graceful Error rejections.
 *    - Zero wall damage flawless run -> 100% wall HP tracking & settlement payload.
 *    - Over-damage clamping & illegal state transition resilience.
 */

import { describe, it, expect, vi } from 'vitest';
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
  getStageWaveConfig
} from '../src/config/campaign-waves.config';
import { CampaignWaveEngine } from '../src/core/wave/campaign-wave-engine';
import { ENEMY_ARCHETYPES, EnemyEntity } from '../src/core/enemy/enemy-entity';
import { InvalidStateTransitionError } from '../src/core/wave/wave-fsm';

describe('Adversarial Challenger Suite: Campaign Config & Wave Engine', () => {
  // =========================================================================
  // 1. Timetable & Configuration Integrity for all 20 Stages
  // =========================================================================
  describe('Timetable Validation for All 20 Stages', () => {
    it('TC-CHALLENGE-01: Exhaustive metadata and progression validation across all 20 stages and 5 chapters', () => {
      const allStageIds = Object.keys(CAMPAIGN_STAGES_CONFIG).map(Number);
      expect(allStageIds).toHaveLength(20);
      expect(allStageIds.sort((a, b) => a - b)).toEqual(
        Array.from({ length: 20 }, (_, i) => i + 1)
      );

      let previousEnemyHpMultiplier = 0;
      let previousWallHp = 0;

      for (let sId = 1; sId <= 20; sId++) {
        const stage = getStageConfig(sId);
        const expectedChapterId = Math.ceil(sId / 4);
        const expectedIndexInChapter = ((sId - 1) % 4) + 1;

        // Structural invariants
        expect(stage.stageId).toBe(sId);
        expect(stage.chapterId).toBe(expectedChapterId);
        expect(stage.stageIndexInChapter).toBe(expectedIndexInChapter);
        expect(typeof stage.name).toBe('string');
        expect(stage.name.trim().length).toBeGreaterThan(0);
        expect(typeof stage.description).toBe('string');
        expect(stage.description.trim().length).toBeGreaterThan(0);

        // Wave count constraints from GDD
        expect([6, 8, 10, 12, 15]).toContain(stage.totalWaves);

        // Wall HP progression
        expect(stage.wallBaseHp).toBeGreaterThanOrEqual(1000);
        expect(stage.wallBaseHp).toBeGreaterThanOrEqual(previousWallHp);
        previousWallHp = stage.wallBaseHp;

        // Monotonic enemy difficulty scaling
        expect(stage.baseEnemyHpMultiplier).toBeGreaterThan(previousEnemyHpMultiplier);
        previousEnemyHpMultiplier = stage.baseEnemyHpMultiplier;

        // Rewards integrity
        expect(stage.firstClearRewards.gold).toBeGreaterThan(0);
        expect(stage.firstClearRewards.iron).toBeGreaterThan(0);
        expect(stage.firstClearRewards.blueprints).toBeGreaterThanOrEqual(0);
        expect(stage.repeatRewards.gold).toBeGreaterThanOrEqual(0);
        expect(stage.repeatRewards.iron).toBeGreaterThanOrEqual(0);
        expect(stage.firstClearRewards.gold).toBeGreaterThan(stage.repeatRewards.gold);
        expect(stage.firstClearRewards.iron).toBeGreaterThan(stage.repeatRewards.iron);

        // Boss stage mapping
        const isExpectedBossStage = sId % 4 === 0;
        expect(stage.isBossStage).toBe(isExpectedBossStage);
        if (stage.isBossStage) {
          expect(stage.bossName).toBeDefined();
          expect(stage.bossName!.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('TC-CHALLENGE-02: Deep wave schema & timetable bounds verification for all 20 stages', () => {
      for (let sId = 1; sId <= 20; sId++) {
        const stage = getStageConfig(sId);
        const waveConfig = getStageWaveConfig(sId);

        expect(waveConfig.stageId).toBe(sId);
        expect(waveConfig.totalWaves).toBe(stage.totalWaves);
        expect(waveConfig.waves).toHaveLength(stage.totalWaves);

        // Validate each wave in stage
        waveConfig.waves.forEach((wave, wIdx) => {
          const expectedWaveNumber = wIdx + 1;
          expect(wave.waveNumber).toBe(expectedWaveNumber);

          // Bound checks
          expect(wave.prepTimeSec).toBeGreaterThanOrEqual(5);
          expect(wave.prepTimeSec).toBeLessThanOrEqual(30);
          expect(wave.durationSec).toBeGreaterThanOrEqual(15);
          expect(wave.durationSec).toBeLessThanOrEqual(120);
          expect(wave.stipend).toBeGreaterThanOrEqual(30);
          expect(wave.stipend).toBeLessThanOrEqual(200);

          // Spawns array must be non-empty
          expect(wave.spawns.length).toBeGreaterThan(0);

          let totalUnitsInWave = 0;
          for (const spawn of wave.spawns) {
            // Enemy archetype validity
            expect(ENEMY_ARCHETYPES[spawn.enemyType]).toBeDefined();
            expect(spawn.enemyType.length).toBeGreaterThan(0);

            // Count checks
            expect(Number.isInteger(spawn.count)).toBe(true);
            expect(spawn.count).toBeGreaterThan(0);
            totalUnitsInWave += spawn.count;

            // Interval and delay bounds
            expect(spawn.intervalMs).toBeGreaterThanOrEqual(50);
            expect(spawn.intervalMs).toBeLessThanOrEqual(5000);
            expect(spawn.delayMs).toBeGreaterThanOrEqual(0);
            expect(spawn.delayMs).toBeLessThan(wave.durationSec * 1000);

            // Distribution bounds
            expect(['RandomFull', 'LeftWing', 'RightWing', 'CenterValley']).toContain(
              spawn.xDistribution
            );

            // Explicit lane bounds
            if (spawn.laneIndex !== undefined) {
              expect(Number.isInteger(spawn.laneIndex)).toBe(true);
              expect(spawn.laneIndex).toBeGreaterThanOrEqual(0);
              expect(spawn.laneIndex).toBeLessThanOrEqual(4);
            }

            // HP multiplier bounds
            if (spawn.hpMultiplier !== undefined) {
              expect(spawn.hpMultiplier).toBeGreaterThan(0);
              expect(spawn.hpMultiplier).toBeLessThanOrEqual(50);
            }
          }

          expect(totalUnitsInWave).toBeGreaterThan(0);

          // Boss wave checks
          if (wave.isBossWave) {
            expect(wave.bossConfig).toBeDefined();
            expect(wave.bossConfig!.bossId).toBeDefined();
            expect(wave.bossConfig!.maxHp).toBeGreaterThan(0);
            expect(wave.bossConfig!.armor).toBeGreaterThanOrEqual(0);
            expect(wave.bossConfig!.moveSpeed).toBeGreaterThan(0);
            expect(wave.bossConfig!.wallDamage).toBeGreaterThan(0);
            expect(wave.bossConfig!.skills.length).toBeGreaterThan(0);
          }
        });
      }
    });
  });

  // =========================================================================
  // 2. High-Speed Headless Simulation of Chapter 1 Tongguan (100x Speed)
  // =========================================================================
  describe('High-Speed Headless Simulation: Chapter 1 Stage 4 (10 Waves)', () => {
    it('TC-CHALLENGE-03: Simulates 10 waves tick-by-tick at 100x+ real-time speed to complete Victory', () => {
      const stageConfig = getStageConfig(4); // Tongguan 10 waves with Boss Bear King
      const stageWaveConfig = getStageWaveConfig(4);
      const engine = new CampaignWaveEngine(stageConfig, stageWaveConfig);

      const realStartTime = performance.now();
      const dt = 0.05; // 20 ticks per simulated second

      let totalSimulatedTicks = 0;
      let totalEnemiesKilledInSimulation = 0;
      let wave10BossEncountered = false;
      let wave10BossEnraged = false;
      let wave10SummonedDogsKilled = 0;

      engine.onBossPhaseChange = (phase) => {
        if (phase === 2) {
          wave10BossEnraged = true;
        }
      };

      // Run through all 10 waves
      for (let wave = 1; wave <= stageConfig.totalWaves; wave++) {
        expect(engine.getState()).toBe('Prep');
        expect(engine.getCurrentWave()).toBe(wave);

        // 1. Start Wave
        engine.startWave();
        expect(engine.getState()).toBe('WaveActive');

        let waveTicks = 0;
        const maxWaveTicks = 5000; // Safeguard against infinite loops (250s of sim time)

        while (engine.getState() === 'WaveActive' && waveTicks < maxWaveTicks) {
          engine.update(dt);
          waveTicks++;
          totalSimulatedTicks++;

          // Automated combat defense simulation
          const activeEnemies = engine.getActiveEnemies();
          for (const enemy of activeEnemies) {
            if (enemy.isBoss) {
              wave10BossEncountered = true;
              // If boss is above 50% HP, deal burst damage to trigger enrage
              if (!wave10BossEnraged && enemy.currentHp > enemy.maxHp * 0.5) {
                engine.applyDamageToEnemy(enemy.id, 70000);
              } else if (wave10BossEnraged) {
                // Once enraged and adds spawned, finish the boss after minions are killed
                const activeMinions = engine.getActiveEnemies().filter(e => !e.isBoss);
                if (activeMinions.length === 0) {
                  engine.applyDamageToEnemy(enemy.id, enemy.currentHp);
                  totalEnemiesKilledInSimulation++;
                }
              }
            } else {
              // Standard enemy: eliminate before reaching wall
              if (enemy.typeId === 'war_dog' && wave10BossEnraged) {
                wave10SummonedDogsKilled++;
              }
              const res = engine.applyDamageToEnemy(enemy.id, enemy.currentHp);
              if (res.isDead) {
                totalEnemiesKilledInSimulation++;
              }
            }
          }
        }

        // Verify wave cleared without hitting tick limit
        expect(waveTicks).toBeLessThan(maxWaveTicks);
        expect(engine.getState()).toBe('WaveClear');

        // Post-wave reward flow
        engine.openDecreeReward();
        expect(engine.getState()).toBe('DecreeReward');

        engine.claimDecree(`card_w${wave}`);
        expect(engine.getState()).toBe('Income');

        engine.collectIncome(10);
      }

      const realEndTime = performance.now();
      const realDurationMs = realEndTime - realStartTime;
      const simulatedTimeSec = totalSimulatedTicks * dt;

      // Assertions on simulation speed (>100x speedup)
      // e.g. 50+ seconds simulated time in < 500ms wall-clock time
      expect(simulatedTimeSec).toBeGreaterThan(30);
      expect(realDurationMs).toBeLessThan(1000); // Executed in under 1 second!
      const speedupFactor = (simulatedTimeSec * 1000) / Math.max(1, realDurationMs);
      expect(speedupFactor).toBeGreaterThan(100); // Proven > 100x speed!

      // Final Victory State
      expect(engine.getState()).toBe('Victory');

      // Verify Boss battle dynamics occurred
      expect(wave10BossEncountered).toBe(true);
      expect(wave10BossEnraged).toBe(true);
      expect(wave10SummonedDogsKilled).toBeGreaterThanOrEqual(25);

      // Verify Combat Summary
      const summary = engine.getSummary();
      expect(summary.cleared).toBe(true);
      expect(summary.wavesCleared).toBe(10);
      expect(summary.totalWaves).toBe(10);
      expect(summary.isBossDefeated).toBe(true);
      expect(summary.revivesUsed).toBe(0);
      expect(summary.finalWallHp).toBeGreaterThan(0);
      expect(summary.finalWallHp).toBeLessThanOrEqual(summary.maxWallHp);
    });
  });

  // =========================================================================
  // 3. Edge Case Testing
  // =========================================================================
  describe('Adversarial Edge Case Tests', () => {
    it('TC-CHALLENGE-04: Early defeat at Wave 1 (wall HP to 0) transitions cleanly to DEFEAT and produces valid summary', () => {
      const stageConfig = getStageConfig(1);
      const stageWaveConfig = getStageWaveConfig(1);
      const engine = new CampaignWaveEngine(stageConfig, stageWaveConfig);

      const defeatSpy = vi.fn();
      engine.onStageDefeat = defeatSpy;

      engine.startWave();
      expect(engine.getState()).toBe('WaveActive');
      expect(engine.getWallHp()).toBe(1000);

      // Inflict lethal damage to city wall
      (engine as any).waveFSM.damageWall(1000);

      // Verify immediate state transition to Defeat
      expect(engine.getWallHp()).toBe(0);
      expect(engine.getState()).toBe('Defeat');
      expect(defeatSpy).toHaveBeenCalledTimes(1);
      expect(defeatSpy).toHaveBeenCalledWith(1, 1);

      // Subsequent update calls in Defeat are safe no-ops
      expect(() => engine.update(0.1)).not.toThrow();
      expect(engine.getState()).toBe('Defeat');

      // WaveFSM forbids transition from Defeat to WaveActive
      expect(() => (engine as any).waveFSM.startWave()).toThrow(InvalidStateTransitionError);
      expect(() => (engine as any).waveFSM.transitionTo('WaveActive')).toThrow(
        InvalidStateTransitionError
      );

      // Calling engine.startWave() while in Defeat does NOT alter state
      engine.startWave();
      expect(engine.getState()).toBe('Defeat');

      // Summary verification for early defeat
      const summary = engine.getSummary();
      expect(summary.stageId).toBe(1);
      expect(summary.cleared).toBe(false);
      expect(summary.wavesCleared).toBe(0);
      expect(summary.totalWaves).toBe(6);
      expect(summary.finalWallHp).toBe(0);
      expect(summary.isBossDefeated).toBe(false);

      // Settlement payload creation
      const settlement = engine.createSettlementInput();
      expect(settlement.cleared).toBe(false);
      expect(settlement.wavesCleared).toBe(0);
      expect(settlement.finalWallHp).toBe(0);

      // Revive restoration
      engine.revive(0.5);
      expect(engine.getWallHp()).toBe(500);
      expect(engine.getState()).toBe('Prep');
      expect(engine.getSummary().revivesUsed).toBe(1);

      // Illegal revive when not in Defeat throws Error
      expect(() => engine.revive(0.5)).toThrow(/Cannot revive/);
    });

    it('TC-CHALLENGE-05: Boss Bear King Phase 2 enrage trigger at <= 50% HP, speed/damage boost, and 25 add summon with idempotence', () => {
      const stageConfig = getStageConfig(4);
      const stageWaveConfig = getStageWaveConfig(4);
      const engine = new CampaignWaveEngine(stageConfig, stageWaveConfig);

      // Fast forward to Wave 10
      (engine as any).waveFSM.currentWave = 10;
      engine.startWave();

      const phaseChangeSpy = vi.fn();
      const skillCastSpy = vi.fn();
      const enemySpawnSpy = vi.fn();

      engine.onBossPhaseChange = phaseChangeSpy;
      engine.onBossSkillCast = skillCastSpy;
      engine.onEnemySpawn = enemySpawnSpy;

      // Spawn initial enemies including Boss
      engine.update(0.1);

      const boss = engine.getActiveEnemies().find(e => e.isBoss);
      expect(boss).toBeDefined();
      expect(boss!.typeId).toBe('boss_bear');
      expect(boss!.maxHp).toBe(135000);
      expect(boss!.currentHp).toBe(135000);
      expect(boss!.moveSpeed).toBe(0.45);
      expect(boss!.wallDamage).toBe(50);

      // Phase 1 Cooldown Skill: Earth Slam test
      // earth_slam has initialDelaySec = 10.0s
      engine.update(9.8);
      expect(skillCastSpy).not.toHaveBeenCalledWith('earth_slam', expect.anything(), boss);

      engine.update(0.3); // cross 10.0s boundary
      expect(skillCastSpy).toHaveBeenCalledWith('earth_slam', '撼地重锤', boss);

      // Phase 2 Trigger: Reduce HP below 50% (50% of 135,000 = 67,500)
      const dogsBeforeEnrage = engine.getActiveEnemies().filter(e => e.typeId === 'war_dog').length;

      // Damage boss down to 49% (currentHp = 66,150)
      engine.applyDamageToEnemy(boss!.id, 68850);
      expect(boss!.currentHp).toBe(66150);

      // Process Boss AI tick
      engine.update(0.05);

      // Verify Enraged status
      const bossState = engine.getBossRuntimeState();
      expect(bossState?.isEnraged).toBe(true);
      expect(bossState?.currentPhase).toBe(2);
      expect(phaseChangeSpy).toHaveBeenCalledWith(2, boss);

      // Verify stat boosts
      expect(boss!.moveSpeed).toBeCloseTo(0.45 * 1.80, 2); // 0.81 m/s
      expect(boss!.wallDamage).toBe(Math.round(50 * 1.50)); // 75 damage

      // Verify skills triggered
      expect(skillCastSpy).toHaveBeenCalledWith('enrage_throw', '狂暴掷锤', boss);
      expect(skillCastSpy).toHaveBeenCalledWith('summon_war_dogs', '狂犬袭营', boss);

      // Verify exactly 25 War Dogs were dynamically spawned
      const dogsAfterEnrage = engine.getActiveEnemies().filter(e => e.typeId === 'war_dog').length;
      expect(dogsAfterEnrage - dogsBeforeEnrage).toBe(25);

      // Verify IDEMPOTENCE: Subsequent updates with boss at low HP do not re-summon war dogs or re-boost stats
      const speedAfterFirstEnrage = boss!.moveSpeed;
      const damageAfterFirstEnrage = boss!.wallDamage;
      const dogsCountAfterFirstEnrage = dogsAfterEnrage;

      // Deal more damage (down to 20% HP) and tick 10 times
      engine.applyDamageToEnemy(boss!.id, 30000);
      for (let i = 0; i < 10; i++) {
        engine.update(0.1);
      }

      expect(boss!.moveSpeed).toBe(speedAfterFirstEnrage);
      expect(boss!.wallDamage).toBe(damageAfterFirstEnrage);
      const dogsCountAfterMoreTicks = engine.getActiveEnemies().filter(e => e.typeId === 'war_dog').length;
      expect(dogsCountAfterMoreTicks).toBe(dogsCountAfterFirstEnrage);
      expect(phaseChangeSpy).toHaveBeenCalledTimes(1); // Only 1 phase transition
    });

    it('TC-CHALLENGE-06: Invalid stage ID and chapter queries trigger strict and graceful error rejections', () => {
      const invalidStageIds = [0, 21, -1, 999, NaN];

      for (const invalidId of invalidStageIds) {
        expect(() => getStageConfig(invalidId)).toThrow(
          /Invalid stageId/
        );
        expect(() => getStageWaveConfig(invalidId)).toThrow(
          /not found in CAMPAIGN_STAGES_CONFIG/
        );
      }

      const invalidChapterIds = [0, 6, -1, 100];
      for (const invalidCh of invalidChapterIds) {
        expect(() => getChapterConfig(invalidCh)).toThrow(
          /Invalid chapterId/
        );
        expect(() => getStagesByChapter(invalidCh)).toThrow(
          /Invalid chapterId/
        );
      }

      // Unlock helper edge checks
      expect(isStageUnlocked(1, 0)).toBe(true); // Stage 1 is unconditionally unlocked
      expect(isStageUnlocked(2, 1)).toBe(false);
      expect(isStageUnlocked(20, 19)).toBe(false);
      expect(isStageUnlocked(20, 20)).toBe(true);
    });

    it('TC-CHALLENGE-07: Zero wall damage flawless run preserves 100% wall HP and produces perfect settlement inputs', () => {
      const stageConfig = getStageConfig(1);
      const stageWaveConfig = getStageWaveConfig(1);
      const engine = new CampaignWaveEngine(stageConfig, stageWaveConfig);

      for (let w = 1; w <= stageConfig.totalWaves; w++) {
        engine.startWave();

        // Kill each spawned enemy instantly at spawn location
        while (engine.getState() === 'WaveActive') {
          engine.update(0.05);
          for (const enemy of engine.getActiveEnemies()) {
            engine.applyDamageToEnemy(enemy.id, enemy.currentHp);
          }
        }

        expect(engine.getWallHp()).toBe(stageConfig.wallBaseHp);
        expect(engine.getWallState().isBroken).toBe(false);

        engine.openDecreeReward();
        engine.claimDecree();
        engine.collectIncome(0);
      }

      expect(engine.getState()).toBe('Victory');
      expect(engine.getWallHp()).toBe(stageConfig.wallBaseHp);

      const summary = engine.getSummary();
      expect(summary.cleared).toBe(true);
      expect(summary.wavesCleared).toBe(stageConfig.totalWaves);
      expect(summary.finalWallHp).toBe(summary.maxWallHp);
      expect(summary.finalWallHp / summary.maxWallHp).toBe(1.0);

      const settlement = engine.createSettlementInput({
        hasDoubleStar4Awakening: true,
        isFirstClear: true
      });
      expect(settlement.cleared).toBe(true);
      expect(settlement.finalWallHp).toBe(settlement.maxWallHp);
      expect(settlement.hasDoubleStar4Awakening).toBe(true);
      expect(settlement.isFirstClear).toBe(true);
    });

    it('TC-CHALLENGE-08: Over-damage clamping, invalid enemy targeting, and engine reset invariants', () => {
      const stageConfig = getStageConfig(2);
      const stageWaveConfig = getStageWaveConfig(2);
      const engine = new CampaignWaveEngine(stageConfig, stageWaveConfig);

      // 1. Damage to non-existent enemy ID
      const missingEnemyResult = engine.applyDamageToEnemy('non_existent_id_999', 500);
      expect(missingEnemyResult.actualDeducted).toBe(0);
      expect(missingEnemyResult.isDead).toBe(true);

      // 2. Wall over-damage clamping
      const fsm = (engine as any).waveFSM;
      fsm.damageWall(99999999);
      expect(engine.getWallHp()).toBe(0); // Clamped to 0, never negative

      // 3. Wall negative damage is ignored
      fsm.damageWall(-500);
      expect(engine.getWallHp()).toBe(0);

      // 4. Reset invariant
      engine.reset();
      expect(engine.getState()).toBe('Prep');
      expect(engine.getCurrentWave()).toBe(1);
      expect(engine.getWallHp()).toBe(stageConfig.wallBaseHp);
      expect(engine.getActiveEnemyCount()).toBe(0);
      expect(engine.getBossRuntimeState()).toBeNull();

      const resetSummary = engine.getSummary();
      expect(resetSummary.cleared).toBe(false);
      expect(resetSummary.wavesCleared).toBe(0);
      expect(resetSummary.totalKilled).toBe(0);
      expect(resetSummary.totalDamageDealt).toBe(0);
    });
  });
});
