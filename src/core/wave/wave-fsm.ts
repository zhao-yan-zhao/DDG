/**
 * 《孤城神机营》- Wave Combat Finite State Machine & City Wall Model
 * Implements GDD V3.0 §1.2 & §9.1:
 * - 5 core sequential states: Prep -> WaveActive -> WaveClear (BattleResolve) -> DecreeReward -> Income -> Prep
 * - Terminal states: Defeat (wallHp <= 0), Victory (currentWave >= maxWaves)
 * - Strict InvalidStateTransitionError on illegal transitions
 * - City wall state with health clamping, damage, repair, and defeat triggering
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

export type WaveState =
  | 'Prep'
  | 'WaveActive'
  | 'WaveClear'
  | 'DecreeReward'
  | 'Income'
  | 'Defeat'
  | 'Victory';

export interface CityWallState {
  currentHp: number;
  maxHp: number;
  isBroken: boolean;
  reflectRate?: number;
}

export interface WaveFsmConfig {
  initialWave?: number;
  maxWaves?: number;
  initialWallHp?: number;
  maxWallHp?: number;
  chapterId?: number;
}

export class InvalidStateTransitionError extends Error {
  constructor(public readonly fromState: WaveState, public readonly toState: WaveState) {
    super(`Illegal WaveFSM transition: cannot transition from '${fromState}' to '${toState}'.`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class WaveFSM {
  private state: WaveState = 'Prep';
  private currentWave: number = 1;
  private maxWaves: number = 15;
  private wallHp: number = 1000;
  private maxWallHp: number = 1000;
  private chapterId: number = 1;

  // Event callbacks
  public onStateChange?: (from: WaveState, to: WaveState) => void;
  public onWallDamage?: (damage: number, currentHp: number, maxHp: number) => void;
  public onDefeat?: (wave: number) => void;
  public onVictory?: () => void;

  constructor(config?: WaveFsmConfig) {
    if (config) {
      this.currentWave = config.initialWave ?? 1;
      this.maxWaves = config.maxWaves ?? 15;
      this.maxWallHp = config.maxWallHp ?? 1000;
      this.wallHp = config.initialWallHp ?? this.maxWallHp;
      this.chapterId = config.chapterId ?? 1;
    }
  }

  public getState(): WaveState {
    return this.state;
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public getMaxWaves(): number {
    return this.maxWaves;
  }

  public getWallHp(): number {
    return this.wallHp;
  }

  public getMaxWallHp(): number {
    return this.maxWallHp;
  }

  public getChapterId(): number {
    return this.chapterId;
  }

  public isWallBroken(): boolean {
    return this.wallHp <= 0;
  }

  public getWallState(): CityWallState {
    return {
      currentHp: this.wallHp,
      maxHp: this.maxWallHp,
      isBroken: this.isWallBroken()
    };
  }

  /**
   * Checks whether a transition from current state to target is legal.
   */
  public canTransitionTo(target: WaveState): boolean {
    if (this.state === target) {
      return false;
    }

    // Terminal states cannot transition out unless explicitly revived/reset
    if (this.state === 'Defeat' || this.state === 'Victory') {
      return false;
    }

    // Defeat can be triggered from any non-terminal state
    if (target === 'Defeat') {
      return true;
    }

    switch (this.state) {
      case 'Prep':
        return target === 'WaveActive';
      case 'WaveActive':
        return target === 'WaveClear';
      case 'WaveClear':
        return target === 'DecreeReward';
      case 'DecreeReward':
        return target === 'Income';
      case 'Income':
        return target === 'Prep' || target === 'Victory';
      default:
        return false;
    }
  }

  /**
   * Enforces transition to target state with validation.
   */
  public transitionTo(target: WaveState): void {
    if (!this.canTransitionTo(target)) {
      throw new InvalidStateTransitionError(this.state, target);
    }

    const previousState = this.state;
    this.state = target;
    this.onStateChange?.(previousState, target);

    if (target === 'Defeat') {
      this.onDefeat?.(this.currentWave);
    } else if (target === 'Victory') {
      this.onVictory?.();
    }
  }

  // Domain convenience methods
  public startWave(): void {
    this.transitionTo('WaveActive');
  }

  public onAllEnemiesDefeated(): void {
    this.completeBattle();
  }

  public completeBattle(): void {
    this.transitionTo('WaveClear');
  }

  public openDecreeReward(): void {
    this.transitionTo('DecreeReward');
  }

  public onDecreePicked(_cardId?: string): void {
    this.claimDecree(_cardId);
  }

  public claimDecree(_cardId?: string): void {
    this.transitionTo('Income');
  }

  public onIncomeCollected(): void {
    this.finishIncome();
  }

  public finishIncome(): void {
    if (this.currentWave >= this.maxWaves) {
      this.transitionTo('Victory');
    } else {
      this.currentWave++;
      this.transitionTo('Prep');
    }
  }

  public triggerDefeat(): void {
    this.transitionTo('Defeat');
  }

  public revive(reviveHp?: number): void {
    if (this.state !== 'Defeat') {
      throw new Error(`Cannot revive when state is '${this.state}', expected 'Defeat'.`);
    }
    this.wallHp = Math.min(this.maxWallHp, reviveHp ?? Math.floor(this.maxWallHp * 0.5));
    const previous = this.state;
    this.state = 'Prep';
    this.onStateChange?.(previous, 'Prep');
  }

  // City wall operations
  public damageWall(amount: number): number {
    if (amount <= 0 || this.wallHp <= 0) {
      return this.wallHp;
    }

    const damage = Math.min(this.wallHp, amount);
    this.wallHp = Math.max(0, this.wallHp - damage);
    this.onWallDamage?.(damage, this.wallHp, this.maxWallHp);

    if (this.wallHp === 0 && this.state !== 'Defeat' && this.state !== 'Victory') {
      this.triggerDefeat();
    }

    return this.wallHp;
  }

  public repairWall(amount: number): number {
    if (amount <= 0) {
      return this.wallHp;
    }
    this.wallHp = Math.min(this.maxWallHp, this.wallHp + amount);
    return this.wallHp;
  }

  public setMaxWallHp(newMax: number, healDelta: boolean = false): void {
    const oldMax = this.maxWallHp;
    this.maxWallHp = Math.max(1, newMax);
    if (healDelta && newMax > oldMax) {
      this.wallHp = Math.min(this.maxWallHp, this.wallHp + (newMax - oldMax));
    } else {
      this.wallHp = Math.min(this.maxWallHp, this.wallHp);
    }
  }

  public reset(config?: WaveFsmConfig): void {
    this.state = 'Prep';
    this.currentWave = config?.initialWave ?? 1;
    this.maxWaves = config?.maxWaves ?? 15;
    this.maxWallHp = config?.maxWallHp ?? 1000;
    this.wallHp = config?.initialWallHp ?? this.maxWallHp;
    this.chapterId = config?.chapterId ?? 1;
  }
}
