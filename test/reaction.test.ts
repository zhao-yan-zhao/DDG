import { describe, it, expect, beforeEach } from 'vitest';
import {
  createElementalStatus,
  applyOil,
  clearOil,
  applyBurn,
  clearBurn,
  applyShock,
  clearShock,
  applyFreeze,
  clearFreeze,
  applyPoison,
  clearPoison,
  clearAllStatus,
  decayStatus,
  ElementStateManager
} from '../src/core/reaction/element-state';
import {
  triggerExplosion,
  triggerThunderStrike,
  triggerIceShatter,
  triggerPoisonFire,
  ReactionValve,
  ElementalReactionEngine,
  MAX_REACTIONS_PER_TICK,
  EXPLOSION_ICD,
  ICE_SHATTER_ICD
} from '../src/core/reaction/reaction-valve';
import { ElementalStatus, EnemyEntity } from '../src/core/types';

describe('Milestone M2: Four Elemental Reactions & Anti-Crash Valves', () => {
  let regularEnemy: EnemyEntity;
  let bossEnemy: EnemyEntity;

  beforeEach(() => {
    ReactionValve.resetTick();

    regularEnemy = {
      id: 'enemy_regular_1',
      typeId: 'infantry',
      name: '流寇重步兵',
      isBoss: false,
      maxHp: 1000,
      currentHp: 1000,
      armor: 50,
      shield: 200,
      moveSpeed: 1.2
    };

    bossEnemy = {
      id: 'boss_ch1',
      typeId: 'boss_wanyan',
      name: '完颜宗翰',
      isBoss: true,
      maxHp: 100000,
      currentHp: 100000,
      armor: 120,
      shield: 5000,
      moveSpeed: 0.8
    };
  });

  describe('1. Elemental State Lifecycle & Target Tracking', () => {
    it('initializes clean elemental status', () => {
      const status = createElementalStatus();
      expect(status.hasOil).toBe(false);
      expect(status.burnStacks).toBe(0);
      expect(status.hasShock).toBe(false);
      expect(status.isFrozen).toBe(false);
      expect(status.hasPoison).toBe(false);
      expect(status.lastExplosionTime).toBeUndefined();
      expect(status.lastIceShatterTime).toBeUndefined();
      expect(status.thunderStrikeCountOnBoss).toBe(0);
      expect(status.poisonFireDurationRemaining).toBe(0);
    });

    it('manages oil status application and clearing', () => {
      const status = createElementalStatus();
      applyOil(status);
      expect(status.hasOil).toBe(true);

      clearOil(status);
      expect(status.hasOil).toBe(false);
    });

    it('manages burn stack accumulation and clamping', () => {
      const status = createElementalStatus();
      applyBurn(status, 2, 4);
      expect(status.burnStacks).toBe(2);

      // Stacks clamp to default max 4
      applyBurn(status, 3, 4);
      expect(status.burnStacks).toBe(4);

      // Can stack up to 8 with fire synergy
      applyBurn(status, 3, 8);
      expect(status.burnStacks).toBe(7);

      clearBurn(status);
      expect(status.burnStacks).toBe(0);
    });

    it('manages shock, freeze, and poison states', () => {
      const status = createElementalStatus();
      applyShock(status);
      applyFreeze(status);
      applyPoison(status);
      expect(status.hasShock).toBe(true);
      expect(status.isFrozen).toBe(true);
      expect(status.hasPoison).toBe(true);

      clearShock(status);
      clearFreeze(status);
      clearPoison(status);
      expect(status.hasShock).toBe(false);
      expect(status.isFrozen).toBe(false);
      expect(status.hasPoison).toBe(false);
    });

    it('clears all status at once', () => {
      const status = createElementalStatus();
      applyOil(status);
      applyBurn(status, 4);
      applyShock(status);
      applyFreeze(status);
      applyPoison(status);
      status.poisonFireDurationRemaining = 4.0;

      clearAllStatus(status);
      expect(status.hasOil).toBe(false);
      expect(status.burnStacks).toBe(0);
      expect(status.hasShock).toBe(false);
      expect(status.isFrozen).toBe(false);
      expect(status.hasPoison).toBe(false);
      expect(status.poisonFireDurationRemaining).toBe(0);
    });

    it('decays time-based statuses via ElementStateManager', () => {
      const manager = new ElementStateManager();
      const status = manager.getOrCreateStatus('target_1');
      status.poisonFireDurationRemaining = 4.0;

      manager.tick(1.5);
      expect(status.poisonFireDurationRemaining).toBeCloseTo(2.5, 2);

      manager.tick(3.0);
      expect(status.poisonFireDurationRemaining).toBe(0);
    });
  });

  describe('2. Reaction 1: 【猛火轰爆】 (Oil + Fire)', () => {
    it('triggers explosion on oiled target with 180 AoE damage and 3.5s fire sea', () => {
      const status = createElementalStatus();
      applyOil(status);

      const res = triggerExplosion(status, 10.0);
      expect(res.triggered).toBe(true);
      expect(res.damage).toBe(180);
      expect(res.fireSeaDuration).toBe(3.5);
      expect(status.hasOil).toBe(false); // Cleared oil
      expect(status.lastExplosionTime).toBe(10.0);
    });

    it('fails to trigger explosion when target has no oil', () => {
      const status = createElementalStatus();
      const res = triggerExplosion(status, 10.0);
      expect(res.triggered).toBe(false);
      expect(res.reason).toBe('NO_OIL');
    });

    it('enforces 1.5s target ICD valve cooldown', () => {
      const status = createElementalStatus();
      applyOil(status);

      // Trigger 1 at t = 10.0 -> OK
      const res1 = triggerExplosion(status, 10.0);
      expect(res1.triggered).toBe(true);

      // Re-apply oil, attempt at t = 10.8 (delta 0.8s < 1.5s) -> Cooldown
      applyOil(status);
      const res2 = triggerExplosion(status, 10.8);
      expect(res2.triggered).toBe(false);
      expect(res2.reason).toBe('VALVE_COOLDOWN');
      expect(status.hasOil).toBe(true); // Oil not consumed during cooldown reject

      // Attempt at t = 11.5 (delta 1.5s == 1.5s) -> OK
      const res3 = triggerExplosion(status, 11.5);
      expect(res3.triggered).toBe(true);
      expect(res3.damage).toBe(180);
      expect(status.hasOil).toBe(false);
    });

    it('scales damage when Fire 4-piece synergy bonus (2.0x) is active', () => {
      const status = createElementalStatus();
      applyOil(status);

      const res = triggerExplosion(status, 1.0, 2.0);
      expect(res.triggered).toBe(true);
      expect(res.damage).toBe(360); // 180 * 2.0
    });
  });

  describe('3. Reaction 2: 【雷火天劫】 (Shock + Burn >= 3)', () => {
    it('fails if shock is absent or burn stacks < 3', () => {
      const status = createElementalStatus();
      applyBurn(status, 4);
      expect(triggerThunderStrike(status, regularEnemy).triggered).toBe(false);

      clearBurn(status);
      applyShock(status);
      applyBurn(status, 2);
      const res = triggerThunderStrike(status, regularEnemy);
      expect(res.triggered).toBe(false);
      expect(res.reason).toBe('CONDITIONS_UNMET');
    });

    it('breaks shield, inflicts 2.0s paralysis and +50% vuln on regular enemy', () => {
      const status = createElementalStatus();
      applyShock(status);
      applyBurn(status, 3);

      expect(regularEnemy.shield).toBe(200);
      const res = triggerThunderStrike(status, regularEnemy);

      expect(res.triggered).toBe(true);
      expect(res.paralysisDuration).toBe(2.0);
      expect(res.vulnRate).toBe(0.50);
      expect(regularEnemy.shield).toBe(0); // Guard broken
    });

    it('applies 50% tenacity (1.0s paralysis) on Boss and caps at max 3 stuns per battle', () => {
      const status = createElementalStatus();
      applyShock(status);
      applyBurn(status, 3);

      // Strike 1
      const s1 = triggerThunderStrike(status, bossEnemy);
      expect(s1.triggered).toBe(true);
      expect(s1.paralysisDuration).toBe(1.0); // 50% tenacity on Boss
      expect(status.thunderStrikeCountOnBoss).toBe(1);

      // Strike 2
      const s2 = triggerThunderStrike(status, bossEnemy);
      expect(s2.triggered).toBe(true);
      expect(status.thunderStrikeCountOnBoss).toBe(2);

      // Strike 3
      const s3 = triggerThunderStrike(status, bossEnemy);
      expect(s3.triggered).toBe(true);
      expect(status.thunderStrikeCountOnBoss).toBe(3);

      // Strike 4 -> Hard cap exceeded
      const s4 = triggerThunderStrike(status, bossEnemy);
      expect(s4.triggered).toBe(false);
      expect(s4.reason).toBe('BOSS_LIMIT_EXCEEDED');
      expect(status.thunderStrikeCountOnBoss).toBe(3);
    });
  });

  describe('4. Reaction 3: 【碎冰崩裂】 (Frozen + Blunt)', () => {
    it('fails when target is not frozen', () => {
      const status = createElementalStatus();
      const res = triggerIceShatter(status, regularEnemy, 1.0);
      expect(res.triggered).toBe(false);
      expect(res.reason).toBe('NOT_FROZEN');
    });

    it('deals 8% max HP true physical damage and 40% slow on regular enemy', () => {
      const status = createElementalStatus();
      applyFreeze(status);

      const res = triggerIceShatter(status, regularEnemy, 5.0);
      expect(res.triggered).toBe(true);
      expect(res.damage).toBe(1000 * 0.08); // 80 damage
      expect(res.slowRate).toBe(0.40);
      expect(status.isFrozen).toBe(false); // Unfrozen
      expect(status.lastIceShatterTime).toBe(5.0);
    });

    it('enforces 3% max HP damage cap on Boss units', () => {
      const status = createElementalStatus();
      applyFreeze(status);

      // Boss maxHp = 100,000. 8% would be 8,000. Cap is 3% = 3,000.
      const res = triggerIceShatter(status, bossEnemy, 5.0);
      expect(res.triggered).toBe(true);
      expect(res.damage).toBe(100000 * 0.03); // 3,000 damage
    });

    it('enforces 2.0s target ICD valve cooldown', () => {
      const status = createElementalStatus();
      applyFreeze(status);

      const res1 = triggerIceShatter(status, regularEnemy, 10.0);
      expect(res1.triggered).toBe(true);

      applyFreeze(status);
      const res2 = triggerIceShatter(status, regularEnemy, 11.5);
      expect(res2.triggered).toBe(false);
      expect(res2.reason).toBe('VALVE_COOLDOWN');
      expect(status.isFrozen).toBe(true); // Retains freeze on reject

      const res3 = triggerIceShatter(status, regularEnemy, 12.0);
      expect(res3.triggered).toBe(true);
      expect(status.isFrozen).toBe(false);
    });
  });

  describe('5. Reaction 4: 【幽冥毒火】 (Poison + Fire)', () => {
    it('fails when target has no poison', () => {
      const status = createElementalStatus();
      const res = triggerPoisonFire(status);
      expect(res.triggered).toBe(false);
      expect(res.reason).toBe('NO_POISON');
    });

    it('triggers poison fire with 120% DoT amp, 4.0s duration ceiling, and disables healing', () => {
      const status = createElementalStatus();
      applyPoison(status);

      const res = triggerPoisonFire(status);
      expect(res.triggered).toBe(true);
      expect(res.dotAmp).toBe(1.20);
      expect(res.duration).toBe(4.0);
      expect(res.healingDisabled).toBe(true);
      expect(status.poisonFireDurationRemaining).toBe(4.0);
    });

    it('strictly clamps refresh ceiling to 4.0s without infinite stacking', () => {
      const status = createElementalStatus();
      applyPoison(status);

      triggerPoisonFire(status);
      expect(status.poisonFireDurationRemaining).toBe(4.0);

      // Advance 2 seconds
      decayStatus(status, 2.0);
      expect(status.poisonFireDurationRemaining).toBeCloseTo(2.0, 2);

      // Re-trigger does not add to 6.0, but resets to 4.0s
      triggerPoisonFire(status);
      expect(status.poisonFireDurationRemaining).toBe(4.0);
    });
  });

  describe('6. Anti-Crash Valves: Global Tick Cap & Recursion Guard', () => {
    it('enforces maximum 20 reactions per tick global cap', () => {
      ReactionValve.resetTick();
      expect(ReactionValve.getReactionsThisTick()).toBe(0);

      // Trigger 20 explosions across different targets
      for (let i = 0; i < MAX_REACTIONS_PER_TICK; i++) {
        const s = createElementalStatus();
        applyOil(s);
        const res = triggerExplosion(s, 1.0);
        expect(res.triggered).toBe(true);
      }

      expect(ReactionValve.getReactionsThisTick()).toBe(20);

      // 21st reaction in same tick MUST be suppressed
      const excessStatus = createElementalStatus();
      applyOil(excessStatus);
      const excessRes = triggerExplosion(excessStatus, 1.0);
      expect(excessRes.triggered).toBe(false);
      expect(excessRes.reason).toBe('GLOBAL_TICK_CAP_EXCEEDED');

      // After tick reset, reactions can trigger again
      ReactionValve.resetTick();
      expect(ReactionValve.getReactionsThisTick()).toBe(0);
      const postResetRes = triggerExplosion(excessStatus, 1.0);
      expect(postResetRes.triggered).toBe(true);
    });

    it('prevents recursive reaction cascades', () => {
      let nestedCalled = false;
      let nestedReason = '';

      const outerResult = ReactionValve.runWithRecursionGuard(() => {
        // Attempt recursive trigger inside reaction handler
        const innerResult = ReactionValve.runWithRecursionGuard(() => {
          nestedCalled = true;
          return 'nested_success';
        });

        if (!innerResult.executed) {
          nestedReason = innerResult.reason || '';
        }

        return 'outer_success';
      });

      expect(outerResult.executed).toBe(true);
      expect(outerResult.result).toBe('outer_success');
      expect(nestedCalled).toBe(false);
      expect(nestedReason).toBe('RECURSION_PREVENTED');
    });

    it('works via static facade ElementalReactionEngine', () => {
      const s = createElementalStatus();
      applyOil(s);
      const res = ElementalReactionEngine.triggerExplosion(s, 10.0);
      expect(res.triggered).toBe(true);
      expect(res.damage).toBe(180);
    });
  });
});
