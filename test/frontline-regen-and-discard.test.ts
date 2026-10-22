import { describe, it, expect } from 'vitest';
import { FrontlineDefenseManager } from '../src/core/defense/frontline-manager';
import { StarUpgradeStateMachine } from '../src/core/grid/star-upgrade';
import { WeaponInstance } from '../src/core/types';
import { TouchCoordinateMapper, RECYCLE_ZONE_CONFIG } from '../src/presentation/touch/touch-controller';
import { EconomyEngine } from '../src/core/economy/economy';

describe('New Fortress Mechanics & Discard Card Features Suite', () => {
  const createMockWeapon = (
    id: string,
    configId: string,
    star: 1 | 2 | 3 | 4,
    row: number,
    col: number,
    hp?: number,
    isBroken?: boolean
  ): WeaponInstance => ({
    id,
    configId,
    name: '滚木礌石',
    star,
    faction: 'fortress',
    footprint: { width: 1, height: 1 },
    anchor: { row, col },
    isFortressOnly: true,
    baseAtk: 40,
    attackInterval: 2.0,
    range: 5.0,
    maxHp: FrontlineDefenseManager.getBaseHp(configId, star),
    currentHp: hp ?? FrontlineDefenseManager.getBaseHp(configId, star),
    isBroken: isBroken ?? false
  });

  describe('1. Row 0 Fortress Self-Regeneration Mechanism', () => {
    it('heals 2% per second during combat (recent damage < 3s)', () => {
      const weapon = createMockWeapon('w1', 'barricade', 1, 0, 2, 100);
      weapon.lastDamageTimeSec = 100; // recent hit at t=100

      // Tick 1s during combat (t=101, deltaSec=1.0)
      const res = FrontlineDefenseManager.tickRegen(weapon, 1.0, 101);
      // maxHp for barricade star 1 is 300, 2% of 300 is 6 HP/s
      expect(res.healed).toBe(6);
      expect(weapon.currentHp).toBe(106);
      expect(res.restoredFromBroken).toBe(false);
    });

    it('heals 6% per second out of combat (no damage for >= 3s)', () => {
      const weapon = createMockWeapon('w2', 'barricade', 1, 0, 2, 100);
      weapon.lastDamageTimeSec = 100;

      // Tick 1s out of combat (t=104, deltaSec=1.0)
      const res = FrontlineDefenseManager.tickRegen(weapon, 1.0, 104);
      // 6% of 300 is 18 HP/s
      expect(res.healed).toBe(18);
      expect(weapon.currentHp).toBe(118);
    });

    it('automatically restores from isBroken when HP reaches >= 1', () => {
      const weapon = createMockWeapon('w3', 'barricade', 1, 0, 2, 0, true);
      weapon.lastDamageTimeSec = 50;

      // Out of combat at t=60: 300 * 0.06 * 0.5s = 9 HP
      const res = FrontlineDefenseManager.tickRegen(weapon, 0.5, 60);
      expect(weapon.currentHp).toBe(9);
      expect(weapon.isBroken).toBe(false);
      expect(res.restoredFromBroken).toBe(true);
    });

    it('caps regeneration at maxHp', () => {
      const weapon = createMockWeapon('w4', 'barricade', 1, 0, 2, 298);
      const res = FrontlineDefenseManager.tickRegen(weapon, 2.0, 100);
      expect(weapon.currentHp).toBe(300);
      expect(res.healed).toBe(2);
    });
  });

  describe('2. Synthetic Health Calculation on Star Upgrade', () => {
    it('averages health percentages of both parent cards for upgraded weapon', () => {
      // Barricade ★1 maxHp = 300.
      // Source at 20% (60/300 HP), Target at 60% (180/300 HP)
      const source = createMockWeapon('src', 'barricade', 1, 0, 1, 60);
      const target = createMockWeapon('tgt', 'barricade', 1, 0, 2, 180);

      const mergeRes = StarUpgradeStateMachine.evaluateMerge(
        source,
        target,
        { row: 0, col: 2 },
        { row: 0, col: 2 }
      );

      expect(mergeRes.canMerge).toBe(true);
      expect(mergeRes.mergedWeapon).toBeDefined();

      const merged = mergeRes.mergedWeapon!;
      expect(merged.star).toBe(2);
      // Barricade ★2 maxHp = 550
      expect(merged.maxHp).toBe(550);
      // Avg ratio = (20% + 60%) / 2 = 40% -> 550 * 0.40 = 220 HP
      expect(merged.currentHp).toBe(220);
      expect(merged.isBroken).toBe(false);
    });

    it('repairs broken units and grants at least 1 HP even if both are zero HP', () => {
      const source = createMockWeapon('src', 'barricade', 1, 0, 1, 0, true);
      const target = createMockWeapon('tgt', 'barricade', 1, 0, 2, 0, true);

      const merged = StarUpgradeStateMachine.executeMerge(source, target);
      expect(merged.star).toBe(2);
      expect(merged.maxHp).toBe(550);
      expect(merged.currentHp).toBe(1); // Floor at 1 HP
      expect(merged.isBroken).toBe(false);
    });
  });

  describe('3. Discard and Recycle Zone Mechanics', () => {
    it('detects hit points inside the bottom recycle zone', () => {
      const pointInside = { x: RECYCLE_ZONE_CONFIG.centerX, y: RECYCLE_ZONE_CONFIG.centerY };
      expect(TouchCoordinateMapper.isPointInRecycleZone(pointInside)).toBe(true);

      const pointOutside = { x: 375, y: 500 };
      expect(TouchCoordinateMapper.isPointInRecycleZone(pointOutside)).toBe(false);
    });

    it('calculates 75% standard refund and 100% with JingBing', () => {
      const invested = 60;
      const normalRefund = EconomyEngine.calculateRecycleRefund(invested, false);
      expect(normalRefund).toBe(45); // 60 * 0.75 = 45

      const jingBingRefund = EconomyEngine.calculateRecycleRefund(invested, true);
      expect(jingBingRefund).toBe(60); // 60 * 1.00 = 60
    });
  });
});
