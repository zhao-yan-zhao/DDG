/**
 * 《孤城神机营》- Pity Timer Anti-Bad-Luck Engine
 * Strictly conforms to GDD V3.0 §4.2:
 * - Tracks `rollsWithoutMerge` (consecutive rolls without 2-in-1 merge).
 * - When `rollsWithoutMerge >= 3`, Slot 3 triggers 65% pity compensation
 *   to provide an owned ★1 weapon archetype for pairing.
 * - Calling `onMergeOccurred()` immediately resets counter to 0.
 */

export interface PityRollOptions {
  slot3IsPity?: boolean;
}

export interface PityEvaluationResult {
  isPity: boolean;
  weaponConfigId?: string;
}

export class PityTimer {
  private _rollsWithoutMerge: number = 0;
  private readonly threshold: number = 3;
  private readonly triggerRate: number = 0.65;
  private readonly rng: () => number;

  constructor(rng?: () => number) {
    this.rng = rng || Math.random;
  }

  public get rollsWithoutMerge(): number {
    return this._rollsWithoutMerge;
  }

  public setRollsWithoutMerge(count: number): void {
    this._rollsWithoutMerge = Math.max(0, count);
  }

  /**
   * Records a shop roll / refresh event. Increments rollsWithoutMerge counter.
   */
  public recordRoll(): number {
    this._rollsWithoutMerge++;
    return this._rollsWithoutMerge;
  }

  /**
   * Checks whether pity is eligible: rollsWithoutMerge >= 3 and player owns at least one ★1 weapon.
   */
  public isPityEligible(ownedStar1Count: number): boolean {
    return this._rollsWithoutMerge >= this.threshold && ownedStar1Count > 0;
  }

  /**
   * Evaluates slot 3 pity compensation:
   * Returns { isPity: true, weaponConfigId } on 65% trigger, or { isPity: false } otherwise.
   */
  public evaluateSlot3Pity(
    ownedStar1Configs: string[],
    forcedRng?: PityRollOptions
  ): PityEvaluationResult {
    if (!this.isPityEligible(ownedStar1Configs.length)) {
      return { isPity: false };
    }

    const willTrigger =
      forcedRng?.slot3IsPity !== undefined
        ? forcedRng.slot3IsPity
        : this.rng() < this.triggerRate;

    if (!willTrigger) {
      return { isPity: false };
    }

    // Pick uniform random configuration from owned star-1 list
    const randomIndex = Math.floor(this.rng() * ownedStar1Configs.length);
    const selectedConfig = ownedStar1Configs[randomIndex];

    return {
      isPity: true,
      weaponConfigId: selectedConfig
    };
  }

  /**
   * Resets counter to 0 immediately when a 2-in-1 merge occurs.
   */
  public onMergeOccurred(): void {
    this._rollsWithoutMerge = 0;
  }

  /**
   * Manual reset method.
   */
  public reset(): void {
    this._rollsWithoutMerge = 0;
  }
}
