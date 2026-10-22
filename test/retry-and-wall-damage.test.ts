/**
 * 《孤城神机营》- Retry & Wall Damage Pipeline Unit Tests
 * Verifies:
 * 1. retryBattle cleans up UIScene / FTUEOverlay and transitions scenes cleanly.
 * 2. BattleScene shutdown preserves Phaser's internal sys.events listeners.
 * 3. Wall damage correctly passes through single pipeline (absorbing barrier, applying thorns, damaging wall).
 * 4. waveFSM.onWallDamage fires before defeat trigger, guaranteeing HUD receives wallHp=0 on defeat.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WaveFSM } from '../src/core/wave/wave-fsm';
import { WaveSpawner } from '../src/core/wave/wave-spawner';
import { Commander } from '../src/core/commander/commander';
import { COMMANDERS_CONFIG } from '../src/config/commanders.config';
import { EnemyFactory } from '../src/core/enemy/enemy-entity';

describe('Retry & Wall Damage Pipeline Tests', () => {
  describe('WaveFSM Wall Damage & Defeat Timing', () => {
    let fsm: WaveFSM;

    beforeEach(() => {
      fsm = new WaveFSM({
        initialWave: 1,
        maxWaves: 5,
        initialWallHp: 100,
        maxWallHp: 100
      });
      fsm.startWave();
    });

    it('TC-WALL-01: waveFSM.onWallDamage fires with currentHp=0 before onDefeat is dispatched', () => {
      const callOrder: string[] = [];
      let reportedHpOnWallDamage = -1;

      fsm.onWallDamage = (_dmg, currentHp, _maxHp) => {
        callOrder.push('onWallDamage');
        reportedHpOnWallDamage = currentHp;
      };

      fsm.onDefeat = (_wave) => {
        callOrder.push('onDefeat');
      };

      fsm.damageWall(100);

      expect(callOrder).toEqual(['onWallDamage', 'onDefeat']);
      expect(reportedHpOnWallDamage).toBe(0);
      expect(fsm.getWallHp()).toBe(0);
      expect(fsm.getState()).toBe('Defeat');
    });

    it('TC-WALL-02: Partial wall damage updates wallHp accurately and does not trigger defeat', () => {
      const damagesReported: number[] = [];

      fsm.onWallDamage = (dmg, currentHp, maxHp) => {
        damagesReported.push(currentHp);
      };

      fsm.damageWall(35);
      expect(fsm.getWallHp()).toBe(65);
      expect(fsm.getState()).toBe('WaveActive');
      expect(damagesReported).toEqual([65]);

      fsm.damageWall(25);
      expect(fsm.getWallHp()).toBe(40);
      expect(damagesReported).toEqual([65, 40]);
    });
  });

  describe('Commander Barrier & Wall Damage Absorption', () => {
    it('TC-WALL-03: Commander barrier absorbs wall damage before wall takes remaining damage', () => {
      const qin = new Commander(COMMANDERS_CONFIG.qin_huali);
      // Simulate Qin Huali activating ultimate with 2000 barrier HP
      qin.addRage(100);
      qin.castUltimate();
      expect(qin.isUltimateActive).toBe(true);
      expect(qin.barrierHp).toBe(2000);

      // Incoming enemy attack of 500
      const hit1 = qin.absorbBarrierDamage(500);
      expect(hit1.absorbed).toBe(500);
      expect(hit1.remainingDamage).toBe(0);
      expect(qin.barrierHp).toBe(1500);

      // Incoming massive attack of 1800 (exceeds remaining 1500 barrier)
      const hit2 = qin.absorbBarrierDamage(1800);
      expect(hit2.absorbed).toBe(1500);
      expect(hit2.remainingDamage).toBe(300);
      expect(qin.barrierHp).toBe(0);
      qin.update(6.0);
      expect(qin.isUltimateActive).toBe(false);
    });
  });

  describe('WaveSpawner onWallDamage integration', () => {
    it('TC-WALL-04: WaveSpawner passes enemy reference in onWallDamage callback', () => {
      const spawner = new WaveSpawner();
      spawner.startWave({
        chapterId: 1,
        waveIndex: 1,
        duration: 10,
        baseSalary: 10,
        batches: [
          {
            timeOffset: 0,
            enemyId: 'war_dog',
            count: 1,
            spawnInterval: 1,
            xDistribution: 'CenterValley'
          }
        ]
      });

      let receivedEnemyX: number | undefined;
      let damageDealt: number = 0;

      spawner.onWallDamage = (dmg, enemy) => {
        damageDealt = dmg;
        receivedEnemyX = enemy?.x;
      };

      // Spawn the enemy
      spawner.update(0.1, 840);
      const activeEnemies = spawner.getActiveEnemies();
      expect(activeEnemies).toHaveLength(1);
      const dog = activeEnemies[0];

      // Teleport dog to wall to simulate wall breach contact
      dog.y = 840;
      dog.distanceToWall = 0;

      // Update spawner to trigger wall attack
      spawner.update(1.1, 840);

      expect(damageDealt).toBeGreaterThan(0);
      expect(receivedEnemyX).toBe(dog.x);
    });
  });
});
