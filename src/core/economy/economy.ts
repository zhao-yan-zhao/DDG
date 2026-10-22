/**
 * 《孤城神机营》- Economy & Currency Ledger Engine
 * Implements GDD V3.0 §3.5:
 * - Wave guaranteed stipends: W1=35, W2=40, W3=45, W4=50, W5=55, W6=60, W7=65, W8=70, W9=80, W10+=100
 * - Base interest: min(floor(Silver * 0.10), 5)
 * - TunTian interest: min(floor(Silver * 0.20), 8) with 【屯田生息】
 * - Weapon recycle: 75% standard, 100% with 【精兵简政】
 * - Stateful PlayerWallet for balance, spending, earning, and audit history
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

export const WAVE_STIPENDS: Record<number, number> = {
  1: 35,
  2: 40,
  3: 45,
  4: 50,
  5: 55,
  6: 60,
  7: 65,
  8: 70,
  9: 80
};

export const WAVE_10_PLUS_STIPEND = 100;
export const BASE_INTEREST_RATE = 0.10;
export const BASE_INTEREST_CAP = 5;
export const TUNTIAN_INTEREST_RATE = 0.20;
export const TUNTIAN_INTEREST_CAP = 8;
export const DEFAULT_RECYCLE_RATE = 0.75;
export const JINGBING_RECYCLE_RATE = 1.00;
export const BASE_SHOP_REFRESH_COST = 2;

export interface WaveIncomeResult {
  wave: number;
  stipend: number;
  interest: number;
  total: number;
}

export interface WalletTransaction {
  type: 'STIPEND' | 'INTEREST' | 'EARN' | 'SPEND' | 'RECYCLE' | 'REFUND';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason?: string;
  timestamp?: number;
}

export class EconomyEngine {
  /**
   * Looks up guaranteed stipend for a given wave.
   */
  public static calculateStipend(wave: number): number {
    if (wave <= 0) {
      return WAVE_STIPENDS[1];
    }
    if (wave >= 10) {
      return WAVE_10_PLUS_STIPEND;
    }
    return WAVE_STIPENDS[wave] || WAVE_STIPENDS[1];
  }

  /**
   * Computes bank interest based on current silver balance and TunTian perk status.
   * Base: min(floor(silver * 0.10), 5)
   * TunTian: min(floor(silver * 0.20), 8)
   */
  public static calculateInterest(currentSilver: number, hasTunTian: boolean = false): number {
    if (currentSilver <= 0) {
      return 0;
    }
    const rate = hasTunTian ? TUNTIAN_INTEREST_RATE : BASE_INTEREST_RATE;
    const cap = hasTunTian ? TUNTIAN_INTEREST_CAP : BASE_INTEREST_CAP;
    const calculated = Math.floor(currentSilver * rate);
    return Math.min(calculated, cap);
  }

  /**
   * Calculates total wave income (stipend + interest).
   * 100% backward-compatible with domain harness contract.
   */
  public static calculateIncome(
    wave: number,
    currentSilver: number,
    hasTunTian: boolean = false
  ): { stipend: number; interest: number; total: number } {
    const stipend = this.calculateStipend(wave);
    const interest = this.calculateInterest(currentSilver, hasTunTian);
    return {
      stipend,
      interest,
      total: stipend + interest
    };
  }

  /**
   * Computes weapon recycle refund amount.
   * Standard: floor(invested * 0.75)
   * With 《精兵简政》: invested * 1.00
   */
  public static calculateRecycleRefund(investedSilver: number, hasJingBing: boolean = false): number {
    if (investedSilver <= 0) {
      return 0;
    }
    const rate = hasJingBing ? JINGBING_RECYCLE_RATE : DEFAULT_RECYCLE_RATE;
    return Math.floor(investedSilver * rate);
  }

  /**
   * Utility to check whether a given cost can be afforded.
   */
  public static canAfford(currentSilver: number, cost: number): boolean {
    return cost >= 0 && currentSilver >= cost;
  }
}

/**
 * Stateful Player Currency Wallet managing runtime silver balance and transactions.
 */
export class PlayerWallet {
  private silver: number;
  private history: WalletTransaction[] = [];

  constructor(initialSilver: number = 0) {
    this.silver = Math.max(0, Math.floor(initialSilver));
  }

  public static calculateWaveIncome(wave: number, silver: number, hasTunTian: boolean = false): { stipend: number; interest: number; total: number } {
    return EconomyEngine.calculateIncome(wave, silver, hasTunTian);
  }

  public getSilver(): number {
    return this.silver;
  }

  public getBalance(): number {
    return this.silver;
  }

  public canAfford(cost: number): boolean {
    return EconomyEngine.canAfford(this.silver, cost);
  }

  public spend(cost: number, reason?: string): boolean {
    if (cost < 0 || !this.canAfford(cost)) {
      return false;
    }
    const before = this.silver;
    this.silver -= cost;
    this.history.push({
      type: 'SPEND',
      amount: cost,
      balanceBefore: before,
      balanceAfter: this.silver,
      reason
    });
    return true;
  }

  public earn(amount: number, reason?: string): number {
    if (amount <= 0) {
      return this.silver;
    }
    const cleanAmount = Math.floor(amount);
    const before = this.silver;
    this.silver += cleanAmount;
    this.history.push({
      type: 'EARN',
      amount: cleanAmount,
      balanceBefore: before,
      balanceAfter: this.silver,
      reason
    });
    return this.silver;
  }

  public settleWaveIncome(
    wave: number,
    hasTunTian: boolean = false
  ): { wave: number; stipend: number; interest: number; totalIncome: number; silverBefore: number; silverAfter: number } {
    const before = this.silver;
    const { stipend, interest, total } = EconomyEngine.calculateIncome(wave, before, hasTunTian);
    this.silver += total;

    this.history.push({
      type: 'STIPEND',
      amount: stipend,
      balanceBefore: before,
      balanceAfter: before + stipend,
      reason: `Wave ${wave} Stipend`
    });

    this.history.push({
      type: 'INTEREST',
      amount: interest,
      balanceBefore: before + stipend,
      balanceAfter: this.silver,
      reason: `Wave ${wave} Interest (TunTian: ${hasTunTian})`
    });

    return {
      wave,
      stipend,
      interest,
      totalIncome: total,
      silverBefore: before,
      silverAfter: this.silver
    };
  }

  public recycleWeapon(investedSilver: number, hasJingBing: boolean = false): number {
    const refund = EconomyEngine.calculateRecycleRefund(investedSilver, hasJingBing);
    if (refund > 0) {
      const before = this.silver;
      this.silver += refund;
      this.history.push({
        type: 'RECYCLE',
        amount: refund,
        balanceBefore: before,
        balanceAfter: this.silver,
        reason: `Recycle weapon (invested: ${investedSilver}, JingBing: ${hasJingBing})`
      });
    }
    return refund;
  }

  public getHistory(): readonly WalletTransaction[] {
    return this.history;
  }

  public reset(initialSilver: number = 0): void {
    this.silver = Math.max(0, Math.floor(initialSilver));
    this.history = [];
  }
}
