import { describe, it, expect, beforeEach } from 'vitest';
import {
  ShopManager,
  PityTimer,
  getShopLadderWeights,
  getWeaponQualityTier,
  SHOP_WEAPON_POOLS,
  BASE_SHOP_REFRESH_COST,
  WeaponInstance,
  ArmoryCardSlot
} from '../src/core/types';
import { PlayerWallet } from '../src/core/economy/economy';
import { GridModel } from '../src/core/grid/grid-model';

describe('Adversarial Stress Test Suite: Armory Shop & Pity Engine (Challenger M5 1)', () => {
  let wallet: PlayerWallet;
  let gridModel: GridModel;
  let shop: ShopManager;

  const createStarWeapon = (
    id: string,
    configId: string,
    star: 1 | 2 | 3 | 4,
    faction: 'fire' | 'mohist' | 'fortress' | 'qimen' = 'fire'
  ): WeaponInstance => ({
    id,
    configId,
    name: '测试军械',
    star,
    faction,
    footprint: { width: 1, height: 1 },
    anchor: { row: 0, col: 0 },
    isFortressOnly: false,
    baseAtk: 30,
    attackInterval: 1.0,
    range: 10.0
  });

  beforeEach(() => {
    wallet = new PlayerWallet(100);
    gridModel = new GridModel();
    shop = new ShopManager(wallet, gridModel);
  });

  // =========================================================================
  // 1. WAVE LADDER PROBABILITIES & BOUNDARY CLAMPING
  // =========================================================================
  describe('1. Wave Ladder Probabilities & Boundary Clamping', () => {
    it('1.1 W1..W2: High-iteration Monte Carlo (50,000 slots) strictly 0.000% heavy weapons', () => {
      let commonCount = 0;
      let fineCount = 0;
      let heavyCount = 0;

      // 25,000 rolls * 2 non-pity slots = 50,000 slot observations
      const rolls = 25000;
      for (let i = 0; i < rolls; i++) {
        // Player owns no ★1 units, so no pity can interfere
        const slots = shop.rollSlots(1);
        for (const slot of [slots[0], slots[1]]) {
          if (slot.quality === 'common') commonCount++;
          else if (slot.quality === 'fine') fineCount++;
          else if (slot.quality === 'heavy') heavyCount++;
        }
      }

      const total = commonCount + fineCount + heavyCount;
      expect(total).toBe(50000);

      // In W1..W2, heavy weapons rate must be strictly 0.000% (zero occurrences)
      expect(heavyCount).toBe(0);

      // Check statistical convergence around 75% common, 25% fine
      const commonRate = commonCount / total;
      const fineRate = fineCount / total;
      expect(commonRate).toBeGreaterThan(0.74);
      expect(commonRate).toBeLessThan(0.76);
      expect(fineRate).toBeGreaterThan(0.24);
      expect(fineRate).toBeLessThan(0.26);
    });

    it('1.2 W3..W5: High-iteration Monte Carlo (50,000 slots) converges to (50/35/15)', () => {
      let commonCount = 0;
      let fineCount = 0;
      let heavyCount = 0;

      const rolls = 25000;
      for (let i = 0; i < rolls; i++) {
        const slots = shop.rollSlots(4);
        for (const slot of [slots[0], slots[1]]) {
          if (slot.quality === 'common') commonCount++;
          else if (slot.quality === 'fine') fineCount++;
          else if (slot.quality === 'heavy') heavyCount++;
        }
      }

      const total = commonCount + fineCount + heavyCount;
      expect(total).toBe(50000);

      const commonRate = commonCount / total;
      const fineRate = fineCount / total;
      const heavyRate = heavyCount / total;

      expect(commonRate).toBeGreaterThan(0.485);
      expect(commonRate).toBeLessThan(0.515);
      expect(fineRate).toBeGreaterThan(0.335);
      expect(fineRate).toBeLessThan(0.365);
      expect(heavyRate).toBeGreaterThan(0.138);
      expect(heavyRate).toBeLessThan(0.162);
    });

    it('1.3 W6..W8: High-iteration Monte Carlo (50,000 slots) converges to (35/40/25)', () => {
      let commonCount = 0;
      let fineCount = 0;
      let heavyCount = 0;

      const rolls = 25000;
      for (let i = 0; i < rolls; i++) {
        const slots = shop.rollSlots(7);
        for (const slot of [slots[0], slots[1]]) {
          if (slot.quality === 'common') commonCount++;
          else if (slot.quality === 'fine') fineCount++;
          else if (slot.quality === 'heavy') heavyCount++;
        }
      }

      const total = commonCount + fineCount + heavyCount;
      expect(total).toBe(50000);

      const commonRate = commonCount / total;
      const fineRate = fineCount / total;
      const heavyRate = heavyCount / total;

      expect(commonRate).toBeGreaterThan(0.335);
      expect(commonRate).toBeLessThan(0.365);
      expect(fineRate).toBeGreaterThan(0.385);
      expect(fineRate).toBeLessThan(0.415);
      expect(heavyRate).toBeGreaterThan(0.235);
      expect(heavyRate).toBeLessThan(0.265);
    });

    it('1.4 W9..W15: High-iteration Monte Carlo (50,000 slots) converges to (25/45/30)', () => {
      let commonCount = 0;
      let fineCount = 0;
      let heavyCount = 0;

      const rolls = 25000;
      for (let i = 0; i < rolls; i++) {
        const slots = shop.rollSlots(12);
        for (const slot of [slots[0], slots[1]]) {
          if (slot.quality === 'common') commonCount++;
          else if (slot.quality === 'fine') fineCount++;
          else if (slot.quality === 'heavy') heavyCount++;
        }
      }

      const total = commonCount + fineCount + heavyCount;
      expect(total).toBe(50000);

      const commonRate = commonCount / total;
      const fineRate = fineCount / total;
      const heavyRate = heavyCount / total;

      expect(commonRate).toBeGreaterThan(0.235);
      expect(commonRate).toBeLessThan(0.265);
      expect(fineRate).toBeGreaterThan(0.435);
      expect(fineRate).toBeLessThan(0.465);
      expect(heavyRate).toBeGreaterThan(0.285);
      expect(heavyRate).toBeLessThan(0.315);
    });

    it('1.5 Wave boundary clamp: negative waves, wave 0, and waves > 15 do not throw or return NaN', () => {
      const testCases = [-100, -1, 0, 1, 2, 8, 15, 16, 20, 100, 9999];

      for (const w of testCases) {
        expect(() => getShopLadderWeights(w)).not.toThrow();
        const weights = getShopLadderWeights(w);

        expect(Number.isNaN(weights.commonRate)).toBe(false);
        expect(Number.isNaN(weights.fineRate)).toBe(false);
        expect(Number.isNaN(weights.heavyRate)).toBe(false);

        expect(weights.commonRate).toBeGreaterThanOrEqual(0);
        expect(weights.fineRate).toBeGreaterThanOrEqual(0);
        expect(weights.heavyRate).toBeGreaterThanOrEqual(0);

        // Sum must be strictly 1.00
        const sum = weights.commonRate + weights.fineRate + weights.heavyRate;
        expect(Math.abs(sum - 1.00)).toBeLessThan(1e-9);

        // Verify shop.rollSlots doesn't crash on any boundary wave
        expect(() => shop.rollSlots(w)).not.toThrow();
        const slots = shop.getSlots();
        expect(slots.length).toBe(3);
        for (const s of slots) {
          expect(s.weaponConfigId).toBeDefined();
          expect(s.cost).toBeGreaterThan(0);
          expect(Number.isNaN(s.cost)).toBe(false);
          expect(['common', 'fine', 'heavy']).toContain(s.quality);
        }
      }
    });

    it('1.6 Slot metadata integrity across 1,000 rolls', () => {
      for (let i = 0; i < 1000; i++) {
        const wave = (i % 15) + 1;
        const slots = shop.rollSlots(wave);
        expect(slots.length).toBe(3);
        slots.forEach((s, idx) => {
          expect(s.slotIndex).toBe(idx);
          expect(typeof s.weaponConfigId).toBe('string');
          expect(s.weaponConfigId.length).toBeGreaterThan(0);
          expect(['fire', 'mohist', 'fortress', 'qimen']).toContain(s.faction);
          expect(s.cost).toBeGreaterThanOrEqual(15);
          expect(s.isPurchased).toBe(false);
        });
      }
    });
  });

  // =========================================================================
  // 2. PITY TIMER ANTI-BAD-LUCK ENGINE ADVERSARIAL STRESS
  // =========================================================================
  describe('2. Pity Timer Anti-Bad-Luck Engine Adversarial Stress', () => {
    it('2.1 Pity trigger condition: inactive at rolls 1-2, triggers at rolls >= 3 with 65% chance', () => {
      // Put a ★1 repeating_crossbow on the bench
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon('w_rc', 'repeating_crossbow', 1));

      // Roll 1: rollsWithoutMerge = 1 -> Pity cannot trigger
      shop.rollSlots(1, undefined, { slot3IsPity: true });
      expect(shop.rollsWithoutMerge).toBe(1);
      expect(shop.getSlots()[2].isPityCompensation).toBe(false);

      // Roll 2: rollsWithoutMerge = 2 -> Pity cannot trigger
      shop.rollSlots(1, undefined, { slot3IsPity: true });
      expect(shop.rollsWithoutMerge).toBe(2);
      expect(shop.getSlots()[2].isPityCompensation).toBe(false);

      // Roll 3: rollsWithoutMerge = 3 -> Pity triggers!
      shop.rollSlots(1, undefined, { slot3IsPity: true });
      expect(shop.rollsWithoutMerge).toBe(3);
      expect(shop.getSlots()[2].isPityCompensation).toBe(true);
      expect(shop.getSlots()[2].weaponConfigId).toBe('repeating_crossbow');
    });

    it('2.2 High-iteration Monte Carlo (50,000 trials) verifies 65% forced probability on Slot 3', () => {
      const pityTimer = new PityTimer();
      pityTimer.setRollsWithoutMerge(3);
      const owned = ['fire_lance'];

      let pityTriggers = 0;
      const trials = 50000;
      for (let i = 0; i < trials; i++) {
        const res = pityTimer.evaluateSlot3Pity(owned);
        if (res.isPity) {
          pityTriggers++;
          expect(res.weaponConfigId).toBe('fire_lance');
        }
      }

      const rate = pityTriggers / trials;
      // 5-sigma range around 0.65: [0.638, 0.662]
      expect(rate).toBeGreaterThan(0.638);
      expect(rate).toBeLessThan(0.662);
    });

    it('2.3 Slot 3 targeting isolation: Slot 0 and Slot 1 are NEVER pity compensated', () => {
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon('w1', 'barricade', 1));
      // Pre-advance roll counter to 3 so pity is eligible
      shop.rollSlots(1);
      shop.rollSlots(1);
      shop.rollSlots(1);
      expect(shop.rollsWithoutMerge).toBe(3);

      for (let i = 0; i < 500; i++) {
        const slots = shop.rollSlots(1, undefined, { slot3IsPity: true });
        expect(slots[0].isPityCompensation).toBe(false);
        expect(slots[1].isPityCompensation).toBe(false);
        expect(slots[2].isPityCompensation).toBe(true);
      }
    });

    it('2.4 Multiple owned ★1 units: uniform distribution of pity compensation', () => {
      const pityTimer = new PityTimer();
      pityTimer.setRollsWithoutMerge(3);
      const owned = ['fire_lance', 'repeating_crossbow'];

      let fireLanceCount = 0;
      let crossbowCount = 0;
      const triggers = 20000;

      for (let i = 0; i < triggers; i++) {
        // Force pity to trigger so we only measure unit selection distribution
        const res = pityTimer.evaluateSlot3Pity(owned, { slot3IsPity: true });
        expect(res.isPity).toBe(true);
        if (res.weaponConfigId === 'fire_lance') fireLanceCount++;
        else if (res.weaponConfigId === 'repeating_crossbow') crossbowCount++;
      }

      expect(fireLanceCount + crossbowCount).toBe(triggers);
      const flRate = fireLanceCount / triggers;
      const rcRate = crossbowCount / triggers;

      // Both should be ~50% (within 47%..53%)
      expect(flRate).toBeGreaterThan(0.47);
      expect(flRate).toBeLessThan(0.53);
      expect(rcRate).toBeGreaterThan(0.47);
      expect(rcRate).toBeLessThan(0.53);
    });

    it('2.5 Continuous streak: rolls 3, 4, 5, 6, 7, 8 without merge remain pity-active', () => {
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon('w1', 'rocket_box', 1));

      // Advance to roll 3
      shop.rollSlots(1);
      shop.rollSlots(1);
      shop.rollSlots(1);
      expect(shop.rollsWithoutMerge).toBe(3);

      // Subsequent streak of 6 rolls without merge
      for (let roll = 4; roll <= 10; roll++) {
        const slots = shop.rollSlots(1, undefined, { slot3IsPity: true });
        expect(shop.rollsWithoutMerge).toBe(roll);
        expect(slots[2].isPityCompensation).toBe(true);
        expect(slots[2].weaponConfigId).toBe('rocket_box');
      }
    });

    it('2.6 Reset conditions: purchase does NOT reset counter; onMergeOccurred DOES reset counter to 0', () => {
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon('w1', 'fire_lance', 1));
      wallet.earn(500, 'TEST_CREDIT');

      // Roll 3 times
      shop.openWaveShop(1);
      shop.refresh();
      shop.refresh();
      expect(shop.rollsWithoutMerge).toBe(3);

      // Purchase Slot 0: counter MUST NOT reset!
      const buyRes = shop.purchaseSlot(0);
      expect(buyRes.success).toBe(true);
      expect(shop.rollsWithoutMerge).toBe(3);

      // Purchase Slot 1: counter MUST NOT reset!
      const buyRes2 = shop.purchaseSlot(1);
      expect(buyRes2.success).toBe(true);
      expect(shop.rollsWithoutMerge).toBe(3);

      // Now trigger merge event: counter MUST reset to 0!
      shop.onMergeOccurred();
      expect(shop.rollsWithoutMerge).toBe(0);

      // Immediate next roll starts counter at 1, pity cannot trigger
      const nextSlots = shop.rollSlots(1, undefined, { slot3IsPity: true });
      expect(shop.rollsWithoutMerge).toBe(1);
      expect(nextSlots[2].isPityCompensation).toBe(false);
    });

    it('2.7 Edge case: player owns zero ★1 units does NOT crash, NaN, or return undefined weapon', () => {
      // 0 units on grid and 0 units on bench
      expect(gridModel.getAllWeapons().length).toBe(0);
      expect(gridModel.getAllBenchWeapons().length).toBe(0);

      // Advance roll counter to 10
      for (let i = 0; i < 10; i++) {
        const slots = shop.rollSlots(1, undefined, { slot3IsPity: true });
        expect(slots.length).toBe(3);
        expect(slots[2].isPityCompensation).toBe(false);
        expect(slots[2].weaponConfigId).toBeDefined();
        expect(typeof slots[2].weaponConfigId).toBe('string');
        expect(slots[2].cost).toBeGreaterThan(0);
      }

      // Now add only ★2, ★3, ★4 units (no ★1)
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon('w2', 'fire_lance', 2));
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon('w3', 'red_cannon', 3));
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon('w4', 'catapult', 4));

      for (let i = 0; i < 10; i++) {
        const slots = shop.rollSlots(1, undefined, { slot3IsPity: true });
        expect(slots[2].isPityCompensation).toBe(false);
        expect(slots[2].weaponConfigId).toBeDefined();
      }
    });

    it('2.8 Dynamic unit removal: selling or upgrading ★1 immediately deactivates pity eligibility', () => {
      const fl = createStarWeapon('w1', 'fire_lance', 1);
      gridModel.addToFirstEmptyBenchSlot(fl);

      // Rolls without merge reaches 3
      shop.rollSlots(1);
      shop.rollSlots(1);
      shop.rollSlots(1);
      expect(shop.rollsWithoutMerge).toBe(3);

      // Pity is active
      let slots = shop.rollSlots(1, undefined, { slot3IsPity: true });
      expect(slots[2].isPityCompensation).toBe(true);

      // Remove ★1 from bench (e.g. upgraded or sold)
      const removed = gridModel.removeBenchWeapon('w1');
      expect(removed?.id).toBe('w1');
      expect(shop.getOwnedStar1Configs().length).toBe(0);

      // Next roll must NOT trigger pity even with forcedRng
      slots = shop.rollSlots(1, undefined, { slot3IsPity: true });
      expect(slots[2].isPityCompensation).toBe(false);
    });
  });

  // =========================================================================
  // 3. SHOP PURCHASE & ECONOMY BOUNDARIES
  // =========================================================================
  describe('3. Shop Purchase & Economy Boundaries', () => {
    it('3.1 Overdraft protection: attempt purchase with silver = cost - 1 is rejected', () => {
      wallet = new PlayerWallet(100);
      shop = new ShopManager(wallet, gridModel);
      shop.openWaveShop(1);
      const slot0 = shop.getSlots()[0];
      const cost = slot0.cost;

      // Adjust wallet so it has exactly cost - 1 silver
      wallet.spend(100 - (cost - 1));
      expect(wallet.getSilver()).toBe(cost - 1);

      const res = shop.purchaseSlot(0);
      expect(res.success).toBe(false);
      expect(res.code).toBe('INSUFFICIENT_FUNDS');
      expect(wallet.getSilver()).toBe(cost - 1); // Not deducted
      expect(gridModel.getAllBenchWeapons().length).toBe(0);
      expect(slot0.isPurchased).toBe(false);
    });

    it('3.2 Exact funds boundary: attempt purchase with silver = cost succeeds with 0 silver remaining', () => {
      wallet = new PlayerWallet(100);
      shop = new ShopManager(wallet, gridModel);
      shop.openWaveShop(1);
      const slot0 = shop.getSlots()[0];
      const cost = slot0.cost;

      // Adjust wallet so it has exactly cost silver
      wallet.spend(100 - cost);
      expect(wallet.getSilver()).toBe(cost);

      const res = shop.purchaseSlot(0);
      expect(res.success).toBe(true);
      expect(res.code).toBe('SUCCESS');
      expect(wallet.getSilver()).toBe(0);
      expect(res.silverRemaining).toBe(0);
      expect(gridModel.getAllBenchWeapons().length).toBe(1);
    });

    it('3.3 Zero silver boundary: purchase attempt with 0 silver is rejected', () => {
      wallet = new PlayerWallet(0);
      shop = new ShopManager(wallet, gridModel);
      shop.openWaveShop(1);

      const res = shop.purchaseSlot(0);
      expect(res.success).toBe(false);
      expect(res.code).toBe('INSUFFICIENT_FUNDS');
      expect(wallet.getSilver()).toBe(0);
      expect(gridModel.getAllBenchWeapons().length).toBe(0);
    });

    it('3.4 Full bench protection: attempt purchase with 5/5 bench slots full is rejected', () => {
      wallet = new PlayerWallet(500);
      shop = new ShopManager(wallet, gridModel);

      // Completely fill all 5 bench slots
      for (let i = 0; i < 5; i++) {
        const added = gridModel.addToFirstEmptyBenchSlot(createStarWeapon(`bench_${i}`, 'fire_lance', 1));
        expect(added).toBe(i);
      }
      expect(gridModel.getEmptyBenchSlotsCount()).toBe(0);

      shop.openWaveShop(1);

      // Attempt purchasing slot 0, 1, 2
      for (let s = 0; s < 3; s++) {
        const res = shop.purchaseSlot(s);
        expect(res.success).toBe(false);
        expect(res.code).toBe('BENCH_FULL');
        expect(res.error).toBe('备战席已满，无法容纳新军械！');
        expect(wallet.getSilver()).toBe(500); // 0 silver deducted
        expect(shop.getSlots()[s].isPurchased).toBe(false);
      }
    });

    it('3.5 Bench partial fill to 5/5 boundary: 5th unit succeeds, 6th is rejected', () => {
      wallet = new PlayerWallet(500);
      shop = new ShopManager(wallet, gridModel);

      // Pre-fill 4 bench slots
      for (let i = 0; i < 4; i++) {
        gridModel.addToFirstEmptyBenchSlot(createStarWeapon(`bench_${i}`, 'fire_lance', 1));
      }
      expect(gridModel.getEmptyBenchSlotsCount()).toBe(1);

      shop.openWaveShop(1);

      // 5th unit: should succeed and fill bench
      const res5 = shop.purchaseSlot(0);
      expect(res5.success).toBe(true);
      expect(res5.code).toBe('SUCCESS');
      expect(gridModel.getEmptyBenchSlotsCount()).toBe(0);

      // 6th unit: should be rejected
      const res6 = shop.purchaseSlot(1);
      expect(res6.success).toBe(false);
      expect(res6.code).toBe('BENCH_FULL');
    });

    it('3.6 Fast repeated purchases: ALREADY_PURCHASED guard prevents double spending', () => {
      wallet = new PlayerWallet(200);
      shop = new ShopManager(wallet, gridModel);
      shop.openWaveShop(1);

      const targetSlot = shop.getSlots()[0];
      const initialCost = targetSlot.cost;

      // First purchase
      const res1 = shop.purchaseSlot(0);
      expect(res1.success).toBe(true);
      expect(res1.code).toBe('SUCCESS');
      expect(wallet.getSilver()).toBe(200 - initialCost);
      expect(gridModel.getAllBenchWeapons().length).toBe(1);

      // 20 rapid repeat purchase calls on the same slot
      for (let i = 0; i < 20; i++) {
        const resRepeat = shop.purchaseSlot(0);
        expect(resRepeat.success).toBe(false);
        expect(resRepeat.code).toBe('ALREADY_PURCHASED');
        expect(wallet.getSilver()).toBe(200 - initialCost);
        expect(gridModel.getAllBenchWeapons().length).toBe(1);
      }
    });

    it('3.7 Invalid slot indices: negative, out-of-bounds rejected with INVALID_SLOT', () => {
      shop.openWaveShop(1);
      const invalidIndices = [-10, -1, 3, 4, 100];

      for (const idx of invalidIndices) {
        const res = shop.purchaseSlot(idx);
        expect(res.success).toBe(false);
        expect(res.code).toBe('INVALID_SLOT');
      }
    });

    it('3.8 Free refresh stack: add 2 free refreshes -> 2 cost 0 silver, 3rd costs 2 silver', () => {
      wallet = new PlayerWallet(10);
      shop = new ShopManager(wallet, gridModel);

      // Add 2 free refreshes (e.g. Liu Bowen trait or reward)
      shop.addFreeRefreshes(2);
      expect(shop.getFreeRefreshes()).toBe(2);
      expect(shop.getRefreshCost()).toBe(0);

      // Refresh 1: free
      const r1 = shop.refresh();
      expect(r1.success).toBe(true);
      expect(r1.costPaid).toBe(0);
      expect(r1.freeRefreshesRemaining).toBe(1);
      expect(wallet.getSilver()).toBe(10); // Untouched

      // Refresh 2: free
      expect(shop.getRefreshCost()).toBe(0);
      const r2 = shop.refresh();
      expect(r2.success).toBe(true);
      expect(r2.costPaid).toBe(0);
      expect(r2.freeRefreshesRemaining).toBe(0);
      expect(wallet.getSilver()).toBe(10); // Untouched

      // Refresh 3: exhausts free refreshes, costs 2 silver
      expect(shop.getRefreshCost()).toBe(2);
      const r3 = shop.refresh();
      expect(r3.success).toBe(true);
      expect(r3.costPaid).toBe(2);
      expect(r3.freeRefreshesRemaining).toBe(0);
      expect(wallet.getSilver()).toBe(8); // Deducted 2 silver

      // Refresh 4: costs 2 silver
      const r4 = shop.refresh();
      expect(r4.success).toBe(true);
      expect(r4.costPaid).toBe(2);
      expect(wallet.getSilver()).toBe(6);
    });

    it('3.9 Free refresh stack combined with T01 discount', () => {
      wallet = new PlayerWallet(10);
      shop = new ShopManager(wallet, gridModel);
      shop.hasT01Discount = true; // Refresh cost normally 1
      shop.addFreeRefreshes(1);

      // Free refresh takes precedence (cost = 0)
      expect(shop.getRefreshCost()).toBe(0);
      const r1 = shop.refresh();
      expect(r1.costPaid).toBe(0);
      expect(wallet.getSilver()).toBe(10);

      // Free refresh exhausted, now T01 discount applies (cost = 1)
      expect(shop.getRefreshCost()).toBe(1);
      const r2 = shop.refresh();
      expect(r2.costPaid).toBe(1);
      expect(wallet.getSilver()).toBe(9);
    });

    it('3.10 Manual refresh insufficient funds rejection does not roll slots or mutate free refreshes', () => {
      wallet = new PlayerWallet(1); // Needs 2
      shop = new ShopManager(wallet, gridModel);
      shop.openWaveShop(1);
      const initialSlots = [...shop.getSlots()];

      const r = shop.refresh();
      expect(r.success).toBe(false);
      expect(wallet.getSilver()).toBe(1);
      expect(shop.getSlots()).toEqual(initialSlots);
    });

    it('3.11 Refresh cost modifier clamps properly at 0 silver minimum', () => {
      wallet = new PlayerWallet(50);
      shop = new ShopManager(wallet, gridModel);

      // Normal cost is 2
      expect(shop.getRefreshCost()).toBe(2);

      // Increase modifier +3 -> cost 5
      shop.setRefreshCostModifier(3);
      expect(shop.getRefreshCost()).toBe(5);

      // Negative modifier -1 -> cost 1
      shop.setRefreshCostModifier(-1);
      expect(shop.getRefreshCost()).toBe(1);

      // Deep negative modifier -10 -> clamped to 0 (cannot be negative)
      shop.setRefreshCostModifier(-10);
      expect(shop.getRefreshCost()).toBe(0);

      const r = shop.refresh();
      expect(r.success).toBe(true);
      expect(r.costPaid).toBe(0);
      expect(wallet.getSilver()).toBe(50);
    });

    it('3.12 Complete shop cycle: purchase, duplicate guard, refresh, fill bench 5/5, release via merge, re-purchase', () => {
      wallet = new PlayerWallet(300);
      shop = new ShopManager(wallet, gridModel);

      // Wave 1 shop open
      shop.openWaveShop(1);
      expect(shop.getSlots().length).toBe(3);

      // Buy slot 0
      const buy0 = shop.purchaseSlot(0);
      expect(buy0.success).toBe(true);
      expect(gridModel.getAllBenchWeapons().length).toBe(1);

      // Re-buy slot 0 should fail
      const buy0Re = shop.purchaseSlot(0);
      expect(buy0Re.success).toBe(false);
      expect(buy0Re.code).toBe('ALREADY_PURCHASED');

      // Buy slot 1
      const buy1 = shop.purchaseSlot(1);
      expect(buy1.success).toBe(true);
      expect(gridModel.getAllBenchWeapons().length).toBe(2);

      // Refresh shop
      const ref1 = shop.refresh();
      expect(ref1.success).toBe(true);
      expect(ref1.costPaid).toBe(2);

      // Buy 3 more weapons to fill bench to 5/5
      expect(shop.purchaseSlot(0).success).toBe(true);
      expect(shop.purchaseSlot(1).success).toBe(true);
      expect(shop.purchaseSlot(2).success).toBe(true);
      expect(gridModel.getEmptyBenchSlotsCount()).toBe(0);

      // Refresh shop again
      shop.refresh();

      // Attempt purchase when bench is 5/5 full
      const buyFailBench = shop.purchaseSlot(0);
      expect(buyFailBench.success).toBe(false);
      expect(buyFailBench.code).toBe('BENCH_FULL');

      // Simulate player removing a weapon (sold or placed on grid)
      const removedW = gridModel.removeBenchWeapon(gridModel.getAllBenchWeapons()[0].id);
      expect(removedW).toBeDefined();
      expect(gridModel.getEmptyBenchSlotsCount()).toBe(1);

      // Purchase now succeeds into the freed bench slot
      const buyAfterFree = shop.purchaseSlot(0);
      expect(buyAfterFree.success).toBe(true);
      expect(buyAfterFree.code).toBe('SUCCESS');
      expect(gridModel.getEmptyBenchSlotsCount()).toBe(0);
    });
  });

  // =========================================================================
  // 4. WEAPON CATALOG AUDIT & PITY DEDUPLICATION
  // =========================================================================
  describe('4. Weapon Catalog Audit & Pity Deduplication', () => {
    it('4.1 All 16 weapon archetypes are classified without omission across common, fine, and heavy', () => {
      const common = SHOP_WEAPON_POOLS.common;
      const fine = SHOP_WEAPON_POOLS.fine;
      const heavy = SHOP_WEAPON_POOLS.heavy;

      expect(common.length).toBe(3);
      expect(fine.length).toBe(8);
      expect(heavy.length).toBe(5);
      expect(common.length + fine.length + heavy.length).toBe(16);

      // Ensure no duplicates across pools
      const allWeapons = [...common, ...fine, ...heavy];
      const uniqueWeapons = new Set(allWeapons);
      expect(uniqueWeapons.size).toBe(16);

      // Verify canonical alias mapping
      expect(getWeaponQualityTier('cannon')).toBe('heavy');
      expect(getWeaponQualityTier('red_cannon')).toBe('heavy');
      expect(getWeaponQualityTier('grid_trap')).toBe('fine');
      expect(getWeaponQualityTier('electric_grid')).toBe('fine');
    });

    it('4.2 Grid and bench multi-unit deduplication: duplicate ★1 instances do not skew pity probability', () => {
      // Add two instances of fire_lance (one on grid, one on bench)
      gridModel.placeWeapon(createStarWeapon('w_g1', 'fire_lance', 1), { row: 0, col: 0 });
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon('w_b1', 'fire_lance', 1));

      // Owned configs should deduplicate fire_lance to single entry
      const owned = shop.getOwnedStar1Configs();
      expect(owned).toEqual(['fire_lance']);

      const pityTimer = new PityTimer();
      pityTimer.setRollsWithoutMerge(3);
      const res = pityTimer.evaluateSlot3Pity(owned, { slot3IsPity: true });
      expect(res.isPity).toBe(true);
      expect(res.weaponConfigId).toBe('fire_lance');
    });

    it('4.3 PityTimer boundary clamps: negative counter clamped to 0, large streak safe', () => {
      const pityTimer = new PityTimer();

      pityTimer.setRollsWithoutMerge(-999);
      expect(pityTimer.rollsWithoutMerge).toBe(0);

      // 10,000 streak without overflow
      pityTimer.setRollsWithoutMerge(10000);
      expect(pityTimer.rollsWithoutMerge).toBe(10000);
      expect(pityTimer.isPityEligible(1)).toBe(true);

      const res = pityTimer.evaluateSlot3Pity(['fire_lance'], { slot3IsPity: true });
      expect(res.isPity).toBe(true);
      expect(res.weaponConfigId).toBe('fire_lance');
    });
  });
});
