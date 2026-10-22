/**
 * 《孤城神机营》- Armory Shop Manager
 * Strictly conforms to GDD V3.0 §4.1–§4.2, PROJECT.md contracts, and all E2E specifications.
 * Manages:
 * - 3-slot card rolling with wave ladder probabilities
 * - Slot 3 anti-bad-luck pity timer evaluation
 * - Manual refresh economy (2 silver base, or 0 if free refreshes available, discounts from T01)
 * - Purchase flow with wallet deduction, bench space checks, and ★1 WeaponInstance creation.
 */

import { ArmoryCardSlot, Faction, WeaponInstance } from '../types';
import { PlayerWallet } from '../economy/economy';
import { GridModel } from '../grid/grid-model';
import { PityTimer, PityRollOptions } from './pity-timer';
import {
  BASE_SHOP_REFRESH_COST,
  SHOP_SLOT_COUNT,
  getShopLadderWeights,
  getWeaponQualityTier,
  SHOP_WEAPON_POOLS,
  ShopQualityTier,
  WEAPON_ALIAS_MAP
} from '../../config/shop.config';
import { getWeaponConfig, getWeaponStarConfig } from '../../config/weapons.config';

export type ShopPurchaseFailureReason =
  | 'INVALID_SLOT'
  | 'ALREADY_PURCHASED'
  | 'INSUFFICIENT_FUNDS'
  | 'BENCH_FULL';

export interface ShopPurchaseResult {
  success: boolean;
  code: 'SUCCESS' | ShopPurchaseFailureReason;
  slotIndex?: number;
  slot?: ArmoryCardSlot;
  weapon?: WeaponInstance;
  benchSlotIndex?: number;
  silverRemaining?: number;
  error?: string;
}

export interface ShopRefreshResult {
  success: boolean;
  slots: ArmoryCardSlot[];
  costPaid: number;
  freeRefreshesRemaining: number;
  silverRemaining: number;
  error?: string;
}

export class ShopManager {
  private currentWave: number = 1;
  private slots: ArmoryCardSlot[] = [];
  private freeRefreshesRemaining: number = 0;
  private refreshCostModifier: number = 0;
  public hasT01Discount: boolean = false;
  private readonly pityTimer: PityTimer;
  private readonly rng: () => number;

  constructor(
    private readonly wallet: PlayerWallet,
    private readonly gridModel: GridModel,
    pityTimer?: PityTimer,
    rng?: () => number
  ) {
    this.rng = rng || Math.random;
    this.pityTimer = pityTimer || new PityTimer(this.rng);
  }

  public get rollsWithoutMerge(): number {
    return this.pityTimer.rollsWithoutMerge;
  }

  public getFreeRefreshes(): number {
    return this.freeRefreshesRemaining;
  }

  public addFreeRefreshes(count: number): void {
    this.freeRefreshesRemaining += Math.max(0, count);
  }

  public setRefreshCostModifier(mod: number): void {
    this.refreshCostModifier = mod;
  }

  public getRefreshCost(): number {
    if (this.freeRefreshesRemaining > 0) return 0;
    if (this.hasT01Discount) return 1;
    return Math.max(0, BASE_SHOP_REFRESH_COST + this.refreshCostModifier);
  }

  /**
   * Rolls and generates 3 shop slots for the given wave.
   */
  public rollSlots(
    wave: number,
    ownedStar1Configs?: string[],
    forcedRng?: PityRollOptions
  ): ArmoryCardSlot[] {
    this.currentWave = wave;
    this.pityTimer.recordRoll();

    const ownedConfigs = ownedStar1Configs ?? this.getOwnedStar1Configs();
    const ladder = getShopLadderWeights(wave);
    const newSlots: ArmoryCardSlot[] = [];

    for (let slotIndex = 0; slotIndex < SHOP_SLOT_COUNT; slotIndex++) {
      if (slotIndex === 2) {
        // Slot 3: Evaluate Pity
        const pityRes = this.pityTimer.evaluateSlot3Pity(ownedConfigs, forcedRng);
        if (pityRes.isPity && pityRes.weaponConfigId) {
          newSlots.push(this.createCardSlot(slotIndex, pityRes.weaponConfigId, true));
          continue;
        }
      }

      // Standard wave ladder roll
      const quality = this.rollQualityFromLadder(ladder);
      const pickedConfig = this.pickRandomFromQuality(quality);
      newSlots.push(this.createCardSlot(slotIndex, pickedConfig, false));
    }

    this.slots = newSlots;
    return this.slots;
  }

  /**
   * Player manual refresh action with currency / free refresh deduction.
   */
  public refresh(forcedRng?: PityRollOptions): ShopRefreshResult {
    const cost = this.getRefreshCost();

    if (cost > 0 && !this.wallet.canAfford(cost)) {
      return {
        success: false,
        slots: this.slots,
        costPaid: 0,
        freeRefreshesRemaining: this.freeRefreshesRemaining,
        silverRemaining: this.wallet.getSilver(),
        error: '银两不足，无法刷新军备商店！'
      };
    }

    if (cost > 0) {
      this.wallet.spend(cost, 'SHOP_REFRESH');
    } else if (this.freeRefreshesRemaining > 0) {
      this.freeRefreshesRemaining--;
    }

    const slots = this.rollSlots(this.currentWave, undefined, forcedRng);
    return {
      success: true,
      slots,
      costPaid: cost,
      freeRefreshesRemaining: this.freeRefreshesRemaining,
      silverRemaining: this.wallet.getSilver()
    };
  }

  /**
   * Purchases weapon at slotIndex and transfers it directly to the bench.
   */
  public purchaseSlot(slotIndex: number): ShopPurchaseResult {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return { success: false, code: 'INVALID_SLOT', error: '无效卡槽编号！' };
    }

    const slot = this.slots[slotIndex];
    if (slot.isPurchased) {
      return { success: false, code: 'ALREADY_PURCHASED', error: '该卡槽军械已售出！' };
    }

    if (!this.wallet.canAfford(slot.cost)) {
      return { success: false, code: 'INSUFFICIENT_FUNDS', error: '银两不足！' };
    }

    if (this.gridModel.getEmptyBenchSlotsCount() <= 0) {
      return { success: false, code: 'BENCH_FULL', error: '备战席已满，无法容纳新军械！' };
    }

    // Deduct silver
    this.wallet.spend(slot.cost, `PURCHASE_${slot.weaponConfigId}`);

    // Create ★1 weapon instance
    const weaponInstance = this.instantiateWeapon(slot.weaponConfigId);

    // Add to bench
    const benchSlotIndex = this.gridModel.addToFirstEmptyBenchSlot(weaponInstance);

    slot.isPurchased = true;

    return {
      success: true,
      code: 'SUCCESS',
      slotIndex,
      slot,
      weapon: weaponInstance,
      benchSlotIndex,
      silverRemaining: this.wallet.getSilver()
    };
  }

  /**
   * Notifies PityTimer that a 2-in-1 merge has occurred, resetting rolls counter.
   */
  public onMergeOccurred(): void {
    this.pityTimer.onMergeOccurred();
  }

  /**
   * Opens shop for a new wave. Wave start roll is free.
   */
  public openWaveShop(wave: number, freeRefreshes: number = 0): ArmoryCardSlot[] {
    this.currentWave = wave;
    if (freeRefreshes > 0) {
      this.freeRefreshesRemaining += freeRefreshes;
    }
    return this.rollSlots(wave);
  }

  /**
   * Collects all distinct ★1 weapon config IDs currently on the grid or bench.
   */
  public getOwnedStar1Configs(): string[] {
    const all = [...this.gridModel.getAllWeapons(), ...this.gridModel.getAllBenchWeapons()];
    return Array.from(new Set(all.filter(w => w.star === 1).map(w => w.configId)));
  }

  public getSlots(): readonly ArmoryCardSlot[] {
    return this.slots;
  }

  // --- Private Helper Methods ---

  private createCardSlot(
    slotIndex: number,
    weaponConfigId: string,
    isPityCompensation: boolean
  ): ArmoryCardSlot {
    const canonicalId = WEAPON_ALIAS_MAP[weaponConfigId] || weaponConfigId;
    const arch = getWeaponConfig(canonicalId);
    const star1 = getWeaponStarConfig(canonicalId, 1);
    const quality = getWeaponQualityTier(canonicalId);

    return {
      slotIndex,
      weaponConfigId: canonicalId,
      faction: (arch?.faction ?? 'fire') as Faction,
      quality,
      cost: star1?.cost ?? 15,
      isPityCompensation,
      isPurchased: false
    };
  }

  private rollQualityFromLadder(ladder: { commonRate: number; fineRate: number; heavyRate: number }): ShopQualityTier {
    const r = this.rng();
    if (r < ladder.commonRate) return 'common';
    if (r < ladder.commonRate + ladder.fineRate) return 'fine';
    return 'heavy';
  }

  private pickRandomFromQuality(quality: ShopQualityTier): string {
    const pool = SHOP_WEAPON_POOLS[quality];
    const index = Math.floor(this.rng() * pool.length);
    return pool[index];
  }

  private instantiateWeapon(configId: string): WeaponInstance {
    const canonicalId = WEAPON_ALIAS_MAP[configId] || configId;
    const arch = getWeaponConfig(canonicalId)!;
    const star1 = arch.stars[1];

    return {
      id: `w_${Date.now()}_${Math.floor(this.rng() * 100000)}`,
      configId: canonicalId,
      name: arch.name,
      star: 1,
      faction: arch.faction,
      footprint: { ...star1.footprint },
      anchor: { row: 0, col: 0 },
      isFortressOnly: arch.isFortressOnly,
      baseAtk: star1.baseAtk,
      attackInterval: star1.attackInterval,
      range: star1.range
    };
  }
}
