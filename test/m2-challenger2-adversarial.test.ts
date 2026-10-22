/**
 * 《孤城神机营》- Adversarial Challenger 2 Test Suite (Milestone M2)
 * Empirical stress testing and vulnerability mining for Elemental Reactions & Anti-Crash Valves:
 *
 * 1. Global reaction ceiling: Attempt to trigger >20 reactions in a single tick/frame.
 *    Does the valve truncate and drop excess reactions safely without state leakage?
 * 2. Target ICD enforcement:
 *    - Explosion: Repeat explosion within <1.5s on same target -> rejected with VALVE_COOLDOWN.
 *    - Ice Shatter: Repeat shatter within <2.0s on same target -> rejected with VALVE_COOLDOWN.
 *    - Multi-target isolation & timestamp boundaries.
 * 3. Boss tenacity and damage caps:
 *    - Thunder Strike on Boss: Stun duration halved (1.0s vs 2.0s), and after 3 stuns, subsequent stuns rejected with BOSS_LIMIT_EXCEEDED.
 *    - Ice Shatter damage on Boss: Damage capped at 3% max HP (not 8%).
 *    - Boss stun counter leak analysis under global ceiling truncation.
 * 4. Poison Fire duration ceiling:
 *    - Non-stackable refresh ceiling strictly at 4.0s.
 * 5. Recursion guard:
 *    - Cascading prevention, exception resilience, multi-level nesting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createElementalStatus,
  applyOil,
  applyBurn,
  applyShock,
  applyFreeze,
  applyPoison,
  decayStatus
} from '../src/core/reaction/element-state';
import {
  triggerExplosion,
  triggerThunderStrike,
  triggerIceShatter,
  triggerPoisonFire,
  ReactionValve,
  MAX_REACTIONS_PER_TICK,
  EXPLOSION_ICD,
  ICE_SHATTER_ICD,
  MAX_BOSS_THUNDER_STRIKES
} from '../src/core/reaction/reaction-valve';
import { EnemyEntity, ElementalStatus } from '../src/core/types';

function createEnemy(overrides: Partial<EnemyEntity> = {}): EnemyEntity {
  return {
    id: overrides.id || `enemy_${Math.random().toString(36).substring(2, 7)}`,
    typeId: overrides.typeId || 'infantry',
    name: overrides.name || '普通敌军',
    isBoss: overrides.isBoss ?? false,
    maxHp: overrides.maxHp ?? 1000,
    currentHp: overrides.currentHp ?? 1000,
    armor: overrides.armor ?? 50,
    shield: overrides.shield ?? 200,
    moveSpeed: overrides.moveSpeed ?? 1.0
  };
}

describe('Challenger 2 — Adversarial: Elemental Reactions & Anti-Crash Valves (M2)', () => {
  beforeEach(() => {
    ReactionValve.resetTick();
  });

  describe('Suite 1: Global Reaction Ceiling Stress & State Purity (>20 Truncation)', () => {
    it('strictly truncates single-frame reaction bursts to exactly 20 and rejects all excess with GLOBAL_TICK_CAP_EXCEEDED', () => {
      ReactionValve.resetTick();

      const totalAttempts = 120;
      const results: Array<{ triggered: boolean; reason?: string }> = [];

      for (let i = 0; i < totalAttempts; i++) {
        const s = createElementalStatus();
        const reactionType = i % 4;

        if (reactionType === 0) {
          applyOil(s);
          results.push(triggerExplosion(s, 1.0));
        } else if (reactionType === 1) {
          applyShock(s);
          applyBurn(s, 3);
          const enemy = createEnemy();
          results.push(triggerThunderStrike(s, enemy));
        } else if (reactionType === 2) {
          applyFreeze(s);
          const enemy = createEnemy();
          results.push(triggerIceShatter(s, enemy, 1.0));
        } else {
          applyPoison(s);
          results.push(triggerPoisonFire(s));
        }
      }

      const triggeredCount = results.filter((r) => r.triggered).length;
      const rejectedCount = results.filter((r) => !r.triggered).length;
      const capExceededCount = results.filter(
        (r) => !r.triggered && r.reason === 'GLOBAL_TICK_CAP_EXCEEDED'
      ).length;

      expect(triggeredCount).toBe(MAX_REACTIONS_PER_TICK); // exactly 20
      expect(rejectedCount).toBe(totalAttempts - MAX_REACTIONS_PER_TICK); // 100
      expect(capExceededCount).toBe(totalAttempts - MAX_REACTIONS_PER_TICK); // 100
      expect(ReactionValve.getReactionsThisTick()).toBe(MAX_REACTIONS_PER_TICK);
    });

    it('preserves target elemental status when reaction is dropped by global ceiling (no status corruption)', () => {
      // Saturate the valve to 20
      for (let i = 0; i < MAX_REACTIONS_PER_TICK; i++) {
        const s = createElementalStatus();
        applyOil(s);
        expect(triggerExplosion(s, 1.0).triggered).toBe(true);
      }

      // Test 1: Explosion on 21st target
      const oilStatus = createElementalStatus();
      applyOil(oilStatus);
      const expRes = triggerExplosion(oilStatus, 1.0);
      expect(expRes.triggered).toBe(false);
      expect(expRes.reason).toBe('GLOBAL_TICK_CAP_EXCEEDED');
      expect(oilStatus.hasOil).toBe(true); // Oil was NOT consumed
      expect(oilStatus.lastExplosionTime).toBeUndefined(); // Cooldown not started

      // Test 2: Ice Shatter on 22nd target
      const freezeStatus = createElementalStatus();
      applyFreeze(freezeStatus);
      const freezeEnemy = createEnemy();
      const iceRes = triggerIceShatter(freezeStatus, freezeEnemy, 1.0);
      expect(iceRes.triggered).toBe(false);
      expect(iceRes.reason).toBe('GLOBAL_TICK_CAP_EXCEEDED');
      expect(freezeStatus.isFrozen).toBe(true); // Freeze was NOT consumed
      expect(freezeStatus.lastIceShatterTime).toBeUndefined();

      // Test 3: Thunder Strike on 23rd regular target
      const shockStatus = createElementalStatus();
      applyShock(shockStatus);
      applyBurn(shockStatus, 4);
      const shockEnemy = createEnemy({ shield: 300 });
      const thunderRes = triggerThunderStrike(shockStatus, shockEnemy);
      expect(thunderRes.triggered).toBe(false);
      expect(thunderRes.reason).toBe('GLOBAL_TICK_CAP_EXCEEDED');
      expect(shockEnemy.shield).toBe(300); // Shield was NOT stripped

      // Test 4: Poison Fire on 24th target
      const poisonStatus = createElementalStatus();
      applyPoison(poisonStatus);
      const poisonRes = triggerPoisonFire(poisonStatus);
      expect(poisonRes.triggered).toBe(false);
      expect(poisonRes.reason).toBe('GLOBAL_TICK_CAP_EXCEEDED');
      expect(poisonStatus.poisonFireDurationRemaining).toBe(0);
    });

    it('allows reactions to resume immediately in next frame after resetTick()', () => {
      for (let i = 0; i < MAX_REACTIONS_PER_TICK; i++) {
        const s = createElementalStatus();
        applyOil(s);
        triggerExplosion(s, 1.0);
      }
      expect(ReactionValve.canTriggerReaction()).toBe(false);

      ReactionValve.resetTick();
      expect(ReactionValve.canTriggerReaction()).toBe(true);
      expect(ReactionValve.getReactionsThisTick()).toBe(0);

      const nextStatus = createElementalStatus();
      applyOil(nextStatus);
      const nextRes = triggerExplosion(nextStatus, 1.0);
      expect(nextRes.triggered).toBe(true);
      expect(ReactionValve.getReactionsThisTick()).toBe(1);
    });

    it('evaluates boss stun counter behavior when thunder strike is dropped by global cap', () => {
      // Saturate the valve to 20
      for (let i = 0; i < MAX_REACTIONS_PER_TICK; i++) {
        const s = createElementalStatus();
        applyOil(s);
        triggerExplosion(s, 1.0);
      }

      const boss = createEnemy({ isBoss: true, shield: 1000 });
      const bossStatus = createElementalStatus();
      applyShock(bossStatus);
      applyBurn(bossStatus, 3);

      // Attempt thunder strike while valve is saturated
      const droppedRes = triggerThunderStrike(bossStatus, boss);
      expect(droppedRes.triggered).toBe(false);
      expect(droppedRes.reason).toBe('GLOBAL_TICK_CAP_EXCEEDED');

      // CRITICAL CHECK: In a robust system, an untriggered reaction should NOT consume the Boss's 3-stun limit!
      const countAfterDrop = bossStatus.thunderStrikeCountOnBoss || 0;
      expect(countAfterDrop).toBe(0);
    });

    it('ensures Boss stun quota is preserved when dropped under global tick cap, and all 3 stuns can still be triggered on fresh ticks', () => {
      // 1. Saturated valve (20 reactions)
      for (let i = 0; i < MAX_REACTIONS_PER_TICK; i++) {
        const s = createElementalStatus();
        applyOil(s);
        triggerExplosion(s, 1.0);
      }

      const boss = createEnemy({ isBoss: true, shield: 1000 });
      const bossStatus = createElementalStatus();
      applyShock(bossStatus);
      applyBurn(bossStatus, 3);

      // Attempt 3 thunder strikes while valve is saturated
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = triggerThunderStrike(bossStatus, boss);
        expect(res.triggered).toBe(false);
        expect(res.reason).toBe('GLOBAL_TICK_CAP_EXCEEDED');
      }

      // After 3 dropped attempts, the boss was NEVER stunned and shield remained intact
      expect(boss.shield).toBe(1000);
      expect(bossStatus.thunderStrikeCountOnBoss || 0).toBe(0);

      // Now reset tick (fresh frame, zero reactions)
      ReactionValve.resetTick();

      // On fresh frames, all 3 stuns can be achieved legitimately
      // Stun 1
      const s1 = triggerThunderStrike(bossStatus, boss);
      expect(s1.triggered).toBe(true);
      expect(s1.paralysisDuration).toBe(1.0);
      expect(bossStatus.thunderStrikeCountOnBoss).toBe(1);

      // Stun 2
      const s2 = triggerThunderStrike(bossStatus, boss);
      expect(s2.triggered).toBe(true);
      expect(bossStatus.thunderStrikeCountOnBoss).toBe(2);

      // Stun 3
      const s3 = triggerThunderStrike(bossStatus, boss);
      expect(s3.triggered).toBe(true);
      expect(bossStatus.thunderStrikeCountOnBoss).toBe(3);

      // Stun 4: Reaches hard limit of 3 stuns on Boss -> BOSS_LIMIT_EXCEEDED
      const s4 = triggerThunderStrike(bossStatus, boss);
      expect(s4.triggered).toBe(false);
      expect(s4.reason).toBe('BOSS_LIMIT_EXCEEDED');
      expect(bossStatus.thunderStrikeCountOnBoss).toBe(3);
    });
  });

  describe('Suite 2: Target ICD Enforcement (<1.5s Explosion, <2.0s Ice Shatter)', () => {
    it('enforces exact sub-millisecond boundary for Explosion ICD (< 1.5s vs >= 1.5s)', () => {
      const status = createElementalStatus();
      applyOil(status);

      const t0 = 100.0;
      const res0 = triggerExplosion(status, t0);
      expect(res0.triggered).toBe(true);
      expect(status.lastExplosionTime).toBe(t0);

      // 1. Re-apply oil and attempt at t0 + 0.5s -> Rejected
      applyOil(status);
      const res1 = triggerExplosion(status, t0 + 0.5);
      expect(res1.triggered).toBe(false);
      expect(res1.reason).toBe('VALVE_COOLDOWN');
      expect(status.hasOil).toBe(true);

      // 2. Attempt at t0 + 1.499s (delta 1.499s < 1.5s) -> Rejected
      const res2 = triggerExplosion(status, t0 + 1.499);
      expect(res2.triggered).toBe(false);
      expect(res2.reason).toBe('VALVE_COOLDOWN');
      expect(status.hasOil).toBe(true);

      // 3. Attempt at t0 + 1.500s (delta 1.500s == 1.5s) -> Allowed!
      const res3 = triggerExplosion(status, t0 + 1.500);
      expect(res3.triggered).toBe(true);
      expect(res3.damage).toBe(180);
      expect(status.hasOil).toBe(false);
      expect(status.lastExplosionTime).toBe(t0 + 1.500);
    });

    it('enforces exact sub-millisecond boundary for Ice Shatter ICD (< 2.0s vs >= 2.0s)', () => {
      const status = createElementalStatus();
      applyFreeze(status);
      const enemy = createEnemy();

      const t0 = 50.0;
      const res0 = triggerIceShatter(status, enemy, t0);
      expect(res0.triggered).toBe(true);
      expect(status.lastIceShatterTime).toBe(t0);

      // 1. Re-freeze and attempt at t0 + 1.0s -> Rejected
      applyFreeze(status);
      const res1 = triggerIceShatter(status, enemy, t0 + 1.0);
      expect(res1.triggered).toBe(false);
      expect(res1.reason).toBe('VALVE_COOLDOWN');
      expect(status.isFrozen).toBe(true); // Frozen state preserved

      // 2. Attempt at t0 + 1.999s (delta 1.999s < 2.0s) -> Rejected
      const res2 = triggerIceShatter(status, enemy, t0 + 1.999);
      expect(res2.triggered).toBe(false);
      expect(res2.reason).toBe('VALVE_COOLDOWN');
      expect(status.isFrozen).toBe(true);

      // 3. Attempt at t0 + 2.000s (delta 2.000s == 2.0s) -> Allowed!
      const res3 = triggerIceShatter(status, enemy, t0 + 2.000);
      expect(res3.triggered).toBe(true);
      expect(res3.slowRate).toBe(0.40);
      expect(status.isFrozen).toBe(false);
      expect(status.lastIceShatterTime).toBe(t0 + 2.000);
    });

    it('strictly isolates ICD between distinct targets (no cross-target lockup)', () => {
      const statusA = createElementalStatus();
      const statusB = createElementalStatus();
      applyOil(statusA);
      applyOil(statusB);

      // Target A explodes at t = 10.0
      const resA = triggerExplosion(statusA, 10.0);
      expect(resA.triggered).toBe(true);

      // Target B explodes at t = 10.1 (only 0.1s later)
      // Must NOT be blocked by Target A's cooldown!
      const resB = triggerExplosion(statusB, 10.1);
      expect(resB.triggered).toBe(true);
      expect(resB.damage).toBe(180);
    });

    it('safely handles non-monotonic timestamps or clock jitter without crashing', () => {
      const status = createElementalStatus();
      applyOil(status);

      triggerExplosion(status, 10.0);

      // Jitter: event arrives with earlier timestamp 9.0 (delta = -1.0 < 1.5)
      applyOil(status);
      const resJitter = triggerExplosion(status, 9.0);
      expect(resJitter.triggered).toBe(false);
      expect(resJitter.reason).toBe('VALVE_COOLDOWN');
    });

    it('withstands high-frequency spam attack (50 calls on same target)', () => {
      const status = createElementalStatus();
      const enemy = createEnemy();
      let triggeredCount = 0;
      let rejectedCount = 0;

      for (let i = 0; i < 50; i++) {
        applyFreeze(status);
        // All within 0.1s of initial shatter
        const res = triggerIceShatter(status, enemy, 10.0 + i * 0.002);
        if (res.triggered) {
          triggeredCount++;
        } else {
          rejectedCount++;
        }
      }

      expect(triggeredCount).toBe(1);
      expect(rejectedCount).toBe(49);
    });
  });

  describe('Suite 3: Boss Tenacity & Damage Caps Empirical Verification', () => {
    it('strictly halves stun duration on Boss (1.0s vs 2.0s) and applies 50% vuln', () => {
      const regular = createEnemy({ isBoss: false, shield: 500 });
      const regStatus = createElementalStatus();
      applyShock(regStatus);
      applyBurn(regStatus, 3);

      const regRes = triggerThunderStrike(regStatus, regular);
      expect(regRes.triggered).toBe(true);
      expect(regRes.paralysisDuration).toBe(2.0); // 2.0s on regular
      expect(regRes.vulnRate).toBe(0.50);
      expect(regular.shield).toBe(0);

      const boss = createEnemy({ isBoss: true, shield: 5000 });
      const bossStatus = createElementalStatus();
      applyShock(bossStatus);
      applyBurn(bossStatus, 3);

      const bossRes = triggerThunderStrike(bossStatus, boss);
      expect(bossRes.triggered).toBe(true);
      expect(bossRes.paralysisDuration).toBe(1.0); // Halved to 1.0s on Boss
      expect(bossRes.vulnRate).toBe(0.50);
      expect(boss.shield).toBe(0);
    });

    it('strictly enforces Boss stun limit of 3 times per battle and rejects 4th+ with BOSS_LIMIT_EXCEEDED', () => {
      const boss = createEnemy({ isBoss: true, shield: 1000 });
      const bossStatus = createElementalStatus();
      applyShock(bossStatus);
      applyBurn(bossStatus, 3);

      // Stun 1
      const s1 = triggerThunderStrike(bossStatus, boss);
      expect(s1.triggered).toBe(true);
      expect(s1.paralysisDuration).toBe(1.0);
      expect(bossStatus.thunderStrikeCountOnBoss).toBe(1);

      // Stun 2
      const s2 = triggerThunderStrike(bossStatus, boss);
      expect(s2.triggered).toBe(true);
      expect(bossStatus.thunderStrikeCountOnBoss).toBe(2);

      // Stun 3
      const s3 = triggerThunderStrike(bossStatus, boss);
      expect(s3.triggered).toBe(true);
      expect(bossStatus.thunderStrikeCountOnBoss).toBe(3);

      // Stun 4: MUST be rejected with BOSS_LIMIT_EXCEEDED
      boss.shield = 1000; // Reset shield
      const s4 = triggerThunderStrike(bossStatus, boss);
      expect(s4.triggered).toBe(false);
      expect(s4.reason).toBe('BOSS_LIMIT_EXCEEDED');
      expect(boss.shield).toBe(1000); // Shield must NOT be broken!

      // Stun 5..10: All must remain rejected
      for (let i = 5; i <= 10; i++) {
        const sN = triggerThunderStrike(bossStatus, boss);
        expect(sN.triggered).toBe(false);
        expect(sN.reason).toBe('BOSS_LIMIT_EXCEEDED');
      }
    });

    it('does NOT impose the 3-stun ceiling on regular enemies', () => {
      const regular = createEnemy({ isBoss: false });
      const regStatus = createElementalStatus();
      applyShock(regStatus);
      applyBurn(regStatus, 3);

      for (let i = 1; i <= 8; i++) {
        const res = triggerThunderStrike(regStatus, regular);
        expect(res.triggered).toBe(true);
        expect(res.paralysisDuration).toBe(2.0);
      }
    });

    it('strictly caps Ice Shatter damage at 3% max HP on Boss while regular takes 8% max HP', () => {
      // Test across multiple HP scales
      const testCases = [
        { maxHp: 100, expectedRegular: 8, expectedBoss: 3 },
        { maxHp: 1000, expectedRegular: 80, expectedBoss: 30 },
        { maxHp: 50000, expectedRegular: 4000, expectedBoss: 1500 },
        { maxHp: 1000000, expectedRegular: 80000, expectedBoss: 30000 },
        { maxHp: 10000000, expectedRegular: 800000, expectedBoss: 300000 }
      ];

      for (const tc of testCases) {
        // Regular enemy
        const regEnemy = createEnemy({ isBoss: false, maxHp: tc.maxHp });
        const regStatus = createElementalStatus();
        applyFreeze(regStatus);
        const regRes = triggerIceShatter(regStatus, regEnemy, 1.0);
        expect(regRes.triggered).toBe(true);
        expect(regRes.damage).toBeCloseTo(tc.expectedRegular, 4);

        // Boss enemy
        const bossEnemy = createEnemy({ isBoss: true, maxHp: tc.maxHp });
        const bossStatus = createElementalStatus();
        applyFreeze(bossStatus);
        const bossRes = triggerIceShatter(bossStatus, bossEnemy, 1.0);
        expect(bossRes.triggered).toBe(true);
        expect(bossRes.damage).toBeCloseTo(tc.expectedBoss, 4);
        // Verify exact 3% ratio
        expect(bossRes.damage / bossEnemy.maxHp).toBeCloseTo(0.03, 6);
      }
    });
  });

  describe('Suite 4: Poison Fire Duration Ceiling & Refresh Dynamics', () => {
    it('strictly clamps poison fire duration ceiling to 4.0s across successive refreshes without accumulation', () => {
      const status = createElementalStatus();
      applyPoison(status);

      // Trigger 1: sets to 4.0
      const r1 = triggerPoisonFire(status);
      expect(r1.triggered).toBe(true);
      expect(r1.duration).toBe(4.0);
      expect(r1.dotAmp).toBe(1.20);
      expect(r1.healingDisabled).toBe(true);
      expect(status.poisonFireDurationRemaining).toBe(4.0);

      // Decay 1.0s -> 3.0s remaining
      decayStatus(status, 1.0);
      expect(status.poisonFireDurationRemaining).toBeCloseTo(3.0, 2);

      // Trigger 2: resets to 4.0s (NOT 3.0 + 4.0 = 7.0s)
      const r2 = triggerPoisonFire(status);
      expect(r2.triggered).toBe(true);
      expect(status.poisonFireDurationRemaining).toBe(4.0);

      // Decay 3.9s -> 0.1s remaining
      decayStatus(status, 3.9);
      expect(status.poisonFireDurationRemaining).toBeCloseTo(0.1, 2);

      // Trigger 3: resets to 4.0s
      triggerPoisonFire(status);
      expect(status.poisonFireDurationRemaining).toBe(4.0);

      // Decay past zero (5.0s) -> clamps to 0
      decayStatus(status, 5.0);
      expect(status.poisonFireDurationRemaining).toBe(0);
    });
  });

  describe('Suite 5: Recursion Guard Robustness & Cascading Protection', () => {
    it('blocks secondary nested reactions within the same reaction execution cycle', () => {
      let outerExecuted = false;
      let innerAttempted = false;
      let innerExecuted = false;

      const outer = ReactionValve.runWithRecursionGuard(() => {
        outerExecuted = true;
        // Inner nested attempt
        const inner = ReactionValve.runWithRecursionGuard(() => {
          innerExecuted = true;
          return 'inner_val';
        });
        innerAttempted = true;
        expect(inner.executed).toBe(false);
        expect(inner.reason).toBe('RECURSION_PREVENTED');
        expect(inner.result).toBeUndefined();
        return 'outer_val';
      });

      expect(outer.executed).toBe(true);
      expect(outer.result).toBe('outer_val');
      expect(outerExecuted).toBe(true);
      expect(innerAttempted).toBe(true);
      expect(innerExecuted).toBe(false);
      expect(ReactionValve.isRecursionActive()).toBe(false);
    });

    it('recovers cleanly and resets recursion guard even if reaction handler throws an exception', () => {
      expect(ReactionValve.isRecursionActive()).toBe(false);

      expect(() => {
        ReactionValve.runWithRecursionGuard(() => {
          throw new Error('SIMULATED_REACTION_FATAL_ERROR');
        });
      }).toThrow('SIMULATED_REACTION_FATAL_ERROR');

      // Guard must NOT be stuck in active state!
      expect(ReactionValve.isRecursionActive()).toBe(false);

      // Subsequent reaction must execute cleanly
      const subsequent = ReactionValve.runWithRecursionGuard(() => 'healthy');
      expect(subsequent.executed).toBe(true);
      expect(subsequent.result).toBe('healthy');
    });

    it('rejects all levels of deeply nested recursion (stress depth 10)', () => {
      const depthsBlocked: number[] = [];

      ReactionValve.runWithRecursionGuard(() => {
        function recurse(level: number) {
          if (level > 10) return;
          const res = ReactionValve.runWithRecursionGuard(() => {
            recurse(level + 1);
          });
          if (!res.executed && res.reason === 'RECURSION_PREVENTED') {
            depthsBlocked.push(level);
          }
        }
        recurse(1);
      });

      // Level 1 was blocked by recursion guard, preventing any deeper calls
      expect(depthsBlocked).toEqual([1]);
      expect(ReactionValve.isRecursionActive()).toBe(false);
    });
  });
});
