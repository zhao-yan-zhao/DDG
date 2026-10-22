import { describe, it, expect, beforeEach } from 'vitest';
import {
  ShopManager,
  PityTimer,
  getShopLadderWeights,
  getWeaponQualityTier,
  SHOP_WEAPON_POOLS,
  BASE_SHOP_REFRESH_COST
} from '../src/core/types';
import { PlayerWallet } from '../src/core/economy/economy';
import { GridModel } from '../src/core/grid/grid-model';
import { WeaponInstance } from '../src/core/types';

describe('Armory Shop & Pity Timer Test Suite (Milestone M5)', () => {
  let wallet: PlayerWallet;
  let gridModel: GridModel;
  let shop: ShopManager;

  const createStarWeapon = (id: string, configId: string, star: 1 | 2 | 3 | 4, faction: any = 'fire'): WeaponInstance => ({
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
  // TC-SHOP-01 ~ TC-SHOP-04: Wave Ladder Distribution
  // =========================================================================

  it('TC-SHOP-01: W1–W2 probability distribution (75/25/0)', () => {
    const weightsW1 = getShopLadderWeights(1);
    const weightsW2 = getShopLadderWeights(2);

    expect(weightsW1.commonRate).toBe(0.75);
    expect(weightsW1.fineRate).toBe(0.25);
    expect(weightsW1.heavyRate).toBe(0.00);

    expect(weightsW2.commonRate).toBe(0.75);
    expect(weightsW2.fineRate).toBe(0.25);
    expect(weightsW2.heavyRate).toBe(0.00);

    // Monte Carlo distribution check over 1000 slot rolls
    let commonCount = 0;
    let fineCount = 0;
    let heavyCount = 0;
    const rolls = 500; // 500 rolls * 2 non-pity slots = 1000 slots
    for (let i = 0; i < rolls; i++) {
      const slots = shop.rollSlots(1);
      for (const slot of [slots[0], slots[1]]) {
        if (slot.quality === 'common') commonCount++;
        else if (slot.quality === 'fine') fineCount++;
        else if (slot.quality === 'heavy') heavyCount++;
      }
    }

    const total = commonCount + fineCount + heavyCount;
    expect(heavyCount).toBe(0); // Strictly 0.00%
    expect(commonCount / total).toBeGreaterThan(0.70);
    expect(commonCount / total).toBeLessThan(0.80);
    expect(fineCount / total).toBeGreaterThan(0.20);
    expect(fineCount / total).toBeLessThan(0.30);
  });

  it('TC-SHOP-02: W3–W5 introduction of heavy weapons (50/35/15)', () => {
    for (let w = 3; w <= 5; w++) {
      const weights = getShopLadderWeights(w);
      expect(weights.commonRate).toBe(0.50);
      expect(weights.fineRate).toBe(0.35);
      expect(weights.heavyRate).toBe(0.15);
    }

    let commonCount = 0;
    let fineCount = 0;
    let heavyCount = 0;
    const rolls = 500;
    for (let i = 0; i < rolls; i++) {
      const slots = shop.rollSlots(4);
      for (const slot of [slots[0], slots[1]]) {
        if (slot.quality === 'common') commonCount++;
        else if (slot.quality === 'fine') fineCount++;
        else if (slot.quality === 'heavy') heavyCount++;
      }
    }

    const total = commonCount + fineCount + heavyCount;
    expect(commonCount / total).toBeGreaterThan(0.44);
    expect(commonCount / total).toBeLessThan(0.56);
    expect(fineCount / total).toBeGreaterThan(0.29);
    expect(fineCount / total).toBeLessThan(0.41);
    expect(heavyCount / total).toBeGreaterThan(0.10);
    expect(heavyCount / total).toBeLessThan(0.20);
  });

  it('TC-SHOP-03: W6–W8 mid-game weights (35/40/25)', () => {
    for (let w = 6; w <= 8; w++) {
      const weights = getShopLadderWeights(w);
      expect(weights.commonRate).toBe(0.35);
      expect(weights.fineRate).toBe(0.40);
      expect(weights.heavyRate).toBe(0.25);
    }

    let commonCount = 0;
    let fineCount = 0;
    let heavyCount = 0;
    const rolls = 500;
    for (let i = 0; i < rolls; i++) {
      const slots = shop.rollSlots(7);
      for (const slot of [slots[0], slots[1]]) {
        if (slot.quality === 'common') commonCount++;
        else if (slot.quality === 'fine') fineCount++;
        else if (slot.quality === 'heavy') heavyCount++;
      }
    }

    const total = commonCount + fineCount + heavyCount;
    expect(commonCount / total).toBeGreaterThan(0.29);
    expect(commonCount / total).toBeLessThan(0.41);
    expect(fineCount / total).toBeGreaterThan(0.34);
    expect(fineCount / total).toBeLessThan(0.46);
    expect(heavyCount / total).toBeGreaterThan(0.19);
    expect(heavyCount / total).toBeLessThan(0.31);
  });

  it('TC-SHOP-04: W9–W15 endgame weights (25/45/30)', () => {
    for (let w = 9; w <= 15; w++) {
      const weights = getShopLadderWeights(w);
      expect(weights.commonRate).toBe(0.25);
      expect(weights.fineRate).toBe(0.45);
      expect(weights.heavyRate).toBe(0.30);
    }

    // Boundary check: wave > 15
    const weightsW20 = getShopLadderWeights(20);
    expect(weightsW20.commonRate).toBe(0.25);
    expect(weightsW20.fineRate).toBe(0.45);
    expect(weightsW20.heavyRate).toBe(0.30);
  });

  // =========================================================================
  // TC-SHOP-05 ~ TC-SHOP-08: Pity Timer Engine & Slot 3 Compensation
  // =========================================================================

  it('TC-SHOP-05: Consecutive refresh without merge increments rollsWithoutMerge counter', () => {
    expect(shop.rollsWithoutMerge).toBe(0);

    const r1 = shop.refresh();
    expect(r1.success).toBe(true);
    expect(shop.rollsWithoutMerge).toBe(1);
    expect(r1.slots[2].isPityCompensation).toBe(false);

    const r2 = shop.refresh();
    expect(r2.success).toBe(true);
    expect(shop.rollsWithoutMerge).toBe(2);
    expect(r2.slots[2].isPityCompensation).toBe(false);

    const r3 = shop.refresh();
    expect(r3.success).toBe(true);
    expect(shop.rollsWithoutMerge).toBe(3);
  });

  it('TC-SHOP-06: Slot 3 pity replacement at rollsWithoutMerge >= 3 with owned ★1 unit', () => {
    // Put a ★1 fire_lance on bench
    const fl = createStarWeapon('w1', 'fire_lance', 1);
    gridModel.addToFirstEmptyBenchSlot(fl);

    // Roll twice without pity
    shop.rollSlots(1);
    shop.rollSlots(1);
    expect(shop.rollsWithoutMerge).toBe(2);

    // Third roll with forced pity trigger
    const slots = shop.rollSlots(1, undefined, { slot3IsPity: true });
    expect(shop.rollsWithoutMerge).toBe(3);

    // Slot 3 (index 2) must be the owned ★1 weapon with isPityCompensation = true
    expect(slots[2].slotIndex).toBe(2);
    expect(slots[2].isPityCompensation).toBe(true);
    expect(slots[2].weaponConfigId).toBe('fire_lance');

    // Slots 0 and 1 are never pity compensated
    expect(slots[0].isPityCompensation).toBe(false);
    expect(slots[1].isPityCompensation).toBe(false);
  });

  it('TC-SHOP-07: Pity timer resets to 0 upon 2-in-1 merge (onMergeOccurred)', () => {
    shop.rollSlots(1);
    shop.rollSlots(1);
    shop.rollSlots(1);
    expect(shop.rollsWithoutMerge).toBe(3);

    shop.onMergeOccurred();
    expect(shop.rollsWithoutMerge).toBe(0);

    // Next roll starts counter at 1
    shop.rollSlots(1);
    expect(shop.rollsWithoutMerge).toBe(1);
  });

  it('TC-SHOP-08: Pity inactive when no ★1 units owned even if rolls >= 3', () => {
    // Player has only ★2 weapon
    const fl2 = createStarWeapon('w2', 'fire_lance', 2);
    gridModel.addToFirstEmptyBenchSlot(fl2);

    for (let i = 0; i < 5; i++) {
      shop.rollSlots(1);
    }
    expect(shop.rollsWithoutMerge).toBe(5);

    // Even if forcedRng requests pity, ownedStar1 is empty, so cannot trigger
    const slots = shop.rollSlots(1, undefined, { slot3IsPity: true });
    expect(slots[2].isPityCompensation).toBe(false);
  });

  // =========================================================================
  // TC-SHOP-09 ~ TC-SHOP-11: Shop Refresh Economy
  // =========================================================================

  it('TC-SHOP-09: Standard manual refresh consumes 2 silver', () => {
    wallet = new PlayerWallet(10);
    shop = new ShopManager(wallet, gridModel);

    expect(shop.getRefreshCost()).toBe(2);
    const res = shop.refresh();

    expect(res.success).toBe(true);
    expect(res.costPaid).toBe(2);
    expect(wallet.getSilver()).toBe(8);
  });

  it('TC-SHOP-10: Insufficient silver rejects refresh without state changes', () => {
    wallet = new PlayerWallet(1);
    shop = new ShopManager(wallet, gridModel);

    // Open initial wave shop (free)
    shop.openWaveShop(1);
    const initialSlots = [...shop.getSlots()];

    const res = shop.refresh();
    expect(res.success).toBe(false);
    expect(wallet.getSilver()).toBe(1);
    expect(res.error).toBeDefined();
    expect(shop.getSlots()).toEqual(initialSlots);
  });

  it('TC-SHOP-11: T01 《募兵急令》 discount reduces refresh cost to 1 silver', () => {
    wallet = new PlayerWallet(10);
    shop = new ShopManager(wallet, gridModel);

    shop.hasT01Discount = true;
    expect(shop.getRefreshCost()).toBe(1);

    const res = shop.refresh();
    expect(res.success).toBe(true);
    expect(res.costPaid).toBe(1);
    expect(wallet.getSilver()).toBe(9);
  });

  // =========================================================================
  // TC-SHOP-12 ~ TC-SHOP-15: Armory Purchase Lifecycle & Protections
  // =========================================================================

  it('TC-SHOP-12: Successful weapon purchase deducts silver and adds ★1 unit to bench', () => {
    wallet = new PlayerWallet(25);
    shop = new ShopManager(wallet, gridModel);

    const slots = shop.openWaveShop(1);
    const slot0 = slots[0];
    const cost = slot0.cost;

    const res = shop.purchaseSlot(0);
    expect(res.success).toBe(true);
    expect(res.code).toBe('SUCCESS');
    expect(wallet.getSilver()).toBe(25 - cost);
    expect(slot0.isPurchased).toBe(true);

    // Verify weapon on bench
    const benchWeapons = gridModel.getAllBenchWeapons();
    expect(benchWeapons.length).toBe(1);
    expect(benchWeapons[0].configId).toBe(slot0.weaponConfigId);
    expect(benchWeapons[0].star).toBe(1);
    expect(res.benchSlotIndex).toBe(0);
  });

  it('TC-SHOP-13: Insufficient silver rejects purchase (INSUFFICIENT_FUNDS)', () => {
    wallet = new PlayerWallet(10);
    shop = new ShopManager(wallet, gridModel);

    shop.openWaveShop(1);
    // All weapons cost at least 15 silver
    const res = shop.purchaseSlot(0);

    expect(res.success).toBe(false);
    expect(res.code).toBe('INSUFFICIENT_FUNDS');
    expect(wallet.getSilver()).toBe(10);
    expect(gridModel.getAllBenchWeapons().length).toBe(0);
  });

  it('TC-SHOP-14: Full bench capacity rejects purchase (BENCH_FULL)', () => {
    wallet = new PlayerWallet(100);
    shop = new ShopManager(wallet, gridModel);

    // Fill all 5 bench slots
    for (let i = 0; i < 5; i++) {
      gridModel.addToFirstEmptyBenchSlot(createStarWeapon(`b_${i}`, 'fire_lance', 1));
    }
    expect(gridModel.getEmptyBenchSlotsCount()).toBe(0);

    shop.openWaveShop(1);
    const res = shop.purchaseSlot(0);

    expect(res.success).toBe(false);
    expect(res.code).toBe('BENCH_FULL');
    expect(wallet.getSilver()).toBe(100); // No silver deducted
  });

  it('TC-SHOP-15: Repeated purchase of same slot is rejected (ALREADY_PURCHASED)', () => {
    wallet = new PlayerWallet(100);
    shop = new ShopManager(wallet, gridModel);

    shop.openWaveShop(1);
    const res1 = shop.purchaseSlot(0);
    expect(res1.success).toBe(true);

    const res2 = shop.purchaseSlot(0);
    expect(res2.success).toBe(false);
    expect(res2.code).toBe('ALREADY_PURCHASED');
  });
});
