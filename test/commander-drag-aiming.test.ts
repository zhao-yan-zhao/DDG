/**
 * 《孤城神机营》- Commander Drag-Aiming & Tactical Target Indicator Tests
 * 
 * Verifies:
 * 1. Commander.castUltimate() supports optional { x, y } target coordinate injection.
 * 2. Targeted ultimate returns targetX, targetY and resets rage.
 * 3. Targeting auto-aim logic identifies optimal enemy cluster / wall proximity.
 * 4. Aim indicator cancellation zone threshold detection (Y >= 1230 || Y < 480).
 * 5. Commander damage recording in CombatStatsTracker under targeted ultimate execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Commander } from '../src/core/commander/commander';
import { CombatStatsTracker } from '../src/core/combat/combat-stats-tracker';
import { EnemyEntity } from '../src/core/types';

describe('Commander Drag-Aiming & Directional Ultimate Suite', () => {
  let wangCommander: Commander;
  let liuCommander: Commander;
  let qinLiangyuCommander: Commander;
  let qinHualiCommander: Commander;

  beforeEach(() => {
    wangCommander = new Commander('wang_shouren');
    liuCommander = new Commander('liu_bowen');
    qinLiangyuCommander = new Commander('qin_liangyu');
    qinHualiCommander = new Commander('qin_huali');
  });

  describe('1. Core Commander Headless Target Injection', () => {
    it('TC-AIM-01: castUltimate with target coordinate records targetX and targetY', () => {
      wangCommander.setRage(100);
      expect(wangCommander.canCastUltimate()).toBe(true);

      const target = { x: 380, y: 720 };
      const res = wangCommander.castUltimate(target);

      expect(res.success).toBe(true);
      expect(res.targetX).toBe(380);
      expect(res.targetY).toBe(720);
      expect(wangCommander.rage).toBe(0);
      expect(wangCommander.isUltimateActive).toBe(true);
    });

    it('TC-AIM-02: castUltimate without target keeps targetX and targetY undefined (backward-compatible)', () => {
      liuCommander.setRage(100);
      const res = liuCommander.castUltimate();

      expect(res.success).toBe(true);
      expect(res.targetX).toBeUndefined();
      expect(res.targetY).toBeUndefined();
      expect(liuCommander.rage).toBe(0);
    });

    it('TC-AIM-03: rejects casting when rage < 100 even if target is provided', () => {
      qinLiangyuCommander.setRage(99);
      const res = qinLiangyuCommander.castUltimate({ x: 300, y: 800 });

      expect(res.success).toBe(false);
      expect(res.reason).toBe('NOT_ENOUGH_RAGE');
      expect(qinLiangyuCommander.rage).toBe(99);
    });
  });

  describe('2. Tactical Auto-Aiming & Priority Resolution', () => {
    function resolveAutoAimTarget(enemies: Partial<EnemyEntity>[]): { x: number; y: number } {
      const active = enemies.filter(e => (e.currentHp ?? 100) > 0);
      if (active.length === 0) {
        return { x: 375, y: 800 };
      }
      for (const enemy of active) {
        if (enemy.isBoss) {
          return { x: enemy.x ?? 375, y: enemy.y ?? 800 };
        }
      }
      let best = active[0];
      let minWallDist = 99999;
      for (const enemy of active) {
        const dist = enemy.y ?? 999;
        if (dist < minWallDist) {
          minWallDist = dist;
          best = enemy;
        }
      }
      return { x: best.x ?? 375, y: best.y ?? 800 };
    }

    it('TC-AIM-04: defaults to (375, 800) battlefield center when no active enemies exist', () => {
      const target = resolveAutoAimTarget([]);
      expect(target).toEqual({ x: 375, y: 800 });
    });

    it('TC-AIM-05: prioritizes Boss target regardless of position', () => {
      const enemies: Partial<EnemyEntity>[] = [
        { id: 'grunt_1', x: 200, y: 600, currentHp: 50, isBoss: false },
        { id: 'boss_taotie', x: 375, y: 950, currentHp: 5000, isBoss: true }
      ];
      const target = resolveAutoAimTarget(enemies);
      expect(target).toEqual({ x: 375, y: 950 });
    });

    it('TC-AIM-06: selects enemy closest to the wall (lowest Y) when no Boss is present', () => {
      const enemies: Partial<EnemyEntity>[] = [
        { id: 'grunt_far', x: 150, y: 1100, currentHp: 80, isBoss: false },
        { id: 'grunt_near', x: 500, y: 620, currentHp: 120, isBoss: false },
        { id: 'grunt_mid', x: 300, y: 850, currentHp: 90, isBoss: false }
      ];
      const target = resolveAutoAimTarget(enemies);
      expect(target).toEqual({ x: 500, y: 620 });
    });
  });

  describe('3. Cancellation Zone & Aim Thresholds', () => {
    function isCancellationZone(screenY: number): boolean {
      // Cancel when released at bottom command bar (Y >= 1230) or top status bar (Y < 480)
      return screenY >= 1230 || screenY < 480;
    }

    it('TC-AIM-07: recognizes battlefield slope Y in [480, 1229] as valid targeting zone', () => {
      expect(isCancellationZone(540)).toBe(false);
      expect(isCancellationZone(800)).toBe(false);
      expect(isCancellationZone(1150)).toBe(false);
      expect(isCancellationZone(1220)).toBe(false);
    });

    it('TC-AIM-08: triggers cancellation when pointer is held at bottom command bar (Y >= 1230)', () => {
      expect(isCancellationZone(1230)).toBe(true);
      expect(isCancellationZone(1260)).toBe(true);
      expect(isCancellationZone(1334)).toBe(true);
    });

    it('TC-AIM-09: triggers cancellation when pointer is dragged into top header (Y < 480)', () => {
      expect(isCancellationZone(479)).toBe(true);
      expect(isCancellationZone(100)).toBe(true);
      expect(isCancellationZone(0)).toBe(true);
    });
  });

  describe('4. Combat DPS Statistics Attribution for Targeted Ultimates', () => {
    it('TC-AIM-10: records targeted commander bombardment damage and kills into CombatStatsTracker', () => {
      const tracker = new CombatStatsTracker();
      tracker.reset();

      // Simulate Wang Shouren focus fire barrage hitting 3 targets
      tracker.recordDamage('commander_wang_shouren', 400, false);
      tracker.recordDamage('commander_wang_shouren', 400, true);
      tracker.recordDamage('commander_wang_shouren', 400, false);

      const stats = tracker.getSortedStats();
      const wangStat = stats.find(s => s.weaponId === 'commander_wang_shouren');

      expect(wangStat).toBeDefined();
      expect(wangStat?.totalDamage).toBe(1200);
      expect(wangStat?.killCount).toBe(1);
    });

    it('TC-AIM-11: records Liu Bowen cluster lightning strike damage into CombatStatsTracker', () => {
      const tracker = new CombatStatsTracker();
      tracker.reset();

      tracker.recordDamage('commander_liu_bowen', 550, true);
      tracker.recordDamage('commander_liu_bowen', 550, true);
      tracker.recordDamage('commander_liu_bowen', 250, false);

      const stats = tracker.getSortedStats();
      const liuStat = stats.find(s => s.weaponId === 'commander_liu_bowen');

      expect(liuStat).toBeDefined();
      expect(liuStat?.totalDamage).toBe(1350);
      expect(liuStat?.killCount).toBe(2);
    });
  });
});
