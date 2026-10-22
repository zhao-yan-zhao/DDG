/**
 * 《孤城神机营》- Commander System & Entity Logic
 * 
 * Tracks Commander state, rage accumulation (0..100), passive aura bonuses,
 * ultimate cast resolution, barrier absorption, reflect damage calculation,
 * and duration ticking.
 */

import {
  CommanderConfig,
  CommanderId,
  CommanderState,
  CommanderPassiveEffect,
  CommanderUltimateEffect,
  UltimateCastResult
} from '../types';
import { getCommanderConfig } from '../../config/commanders.config';

export class Commander {
  public readonly config: CommanderConfig;
  public rage: number = 0;
  public readonly maxRage: number = 100;
  public isUltimateActive: boolean = false;
  public ultimateRemainingDuration: number = 0;
  public barrierHp: number = 0;

  constructor(configOrId: CommanderConfig | CommanderId | string = 'wang_shouren') {
    if (typeof configOrId === 'string') {
      this.config = getCommanderConfig(configOrId);
    } else {
      this.config = configOrId;
    }
  }

  /**
   * Adds rage points to the commander, clamped strictly between 0 and 100
   * @param amount Rage points to add (can be negative to drain rage)
   * @returns Current rage after addition
   */
  public addRage(amount: number): number {
    this.rage = Math.min(this.maxRage, Math.max(0, this.rage + amount));
    return this.rage;
  }

  /**
   * Sets rage to an exact clamped value (0..100)
   */
  public setRage(amount: number): number {
    this.rage = Math.min(this.maxRage, Math.max(0, amount));
    return this.rage;
  }

  /**
   * Checks whether the commander has enough rage (100) to cast the ultimate
   */
  public canCastUltimate(): boolean {
    return this.rage >= this.config.ultimate.rageCost;
  }

  /**
   * Casts the 100-rage ultimate ability
   * @param target Optional targeting coordinate {x, y} on battlefield
   */
  public castUltimate(target?: { x: number; y: number }): UltimateCastResult {
    if (!this.canCastUltimate()) {
      return {
        success: false,
        reason: 'NOT_ENOUGH_RAGE'
      };
    }

    this.rage -= this.config.ultimate.rageCost;
    const duration = this.config.ultimate.duration || 0;

    if (duration > 0) {
      this.isUltimateActive = true;
      this.ultimateRemainingDuration = duration;
    } else {
      this.isUltimateActive = false;
      this.ultimateRemainingDuration = 0;
    }

    if (this.config.ultimate.barrierHp) {
      this.barrierHp = this.config.ultimate.barrierHp;
    } else {
      this.barrierHp = 0;
    }

    return {
      success: true,
      ultimate: this.config.ultimate,
      activeDuration: duration,
      resetAllWeaponCooldowns: this.config.ultimate.resetAllWeaponCooldowns,
      reloadSpeedBonus: this.config.ultimate.reloadSpeedBonus,
      barrierHp: this.config.ultimate.barrierHp,
      reflectMeleeRatio: this.config.ultimate.reflectMeleeRatio,
      damage: this.config.ultimate.damage,
      cavalryCount: this.config.ultimate.cavalryCount,
      knockbackDistance: this.config.ultimate.knockbackDistance,
      lightningStrikes: this.config.ultimate.lightningStrikes,
      inflictsShock: this.config.ultimate.inflictsShock,
      targetX: target?.x,
      targetY: target?.y
    };
  }

  /**
   * Absorbs damage via active barrier (if any)
   */
  public absorbBarrierDamage(damage: number): { absorbed: number; remainingDamage: number } {
    if (damage <= 0 || this.barrierHp <= 0 || !this.isUltimateActive) {
      return { absorbed: 0, remainingDamage: Math.max(0, damage) };
    }

    const absorbed = Math.min(this.barrierHp, damage);
    this.barrierHp -= absorbed;
    const remainingDamage = damage - absorbed;

    if (this.barrierHp <= 0 && (!this.config.ultimate.duration || this.ultimateRemainingDuration <= 0)) {
      this.isUltimateActive = false;
    }

    return { absorbed, remainingDamage };
  }

  /**
   * Calculates melee damage reflected back to attacker.
   * - Qin Huali: 100% reflect during active ultimate (reflectMeleeRatio = 1.0)
   * - Qin Liangyu: +50% reflect from fortress passive (fortressReflectBonus = 0.50)
   */
  public calculateReflectDamage(incomingMeleeDamage: number): number {
    if (incomingMeleeDamage <= 0) return 0;
    let ratio = 0;
    if (this.isUltimateActive && this.config.ultimate.reflectMeleeRatio) {
      ratio += this.config.ultimate.reflectMeleeRatio;
    }
    if (this.config.passive.fortressReflectBonus) {
      ratio += this.config.passive.fortressReflectBonus;
    }
    return incomingMeleeDamage * ratio;
  }

  /**
   * Advances active ultimate remaining duration by dt seconds,
   * cleanly resetting isUltimateActive and barrierHp when duration reaches zero.
   * @param dt Delta time in seconds
   */
  public update(dt: number): void {
    if (dt <= 0) return;
    if (this.isUltimateActive && this.ultimateRemainingDuration > 0) {
      this.ultimateRemainingDuration = Math.max(0, this.ultimateRemainingDuration - dt);
      if (this.ultimateRemainingDuration <= 0) {
        this.isUltimateActive = false;
        this.ultimateRemainingDuration = 0;
        this.barrierHp = 0;
      }
    }
  }

  /**
   * Legacy alias for update(delta)
   */
  public tick(delta: number): void {
    this.update(delta);
  }

  /**
   * Returns passive bonuses provided by this commander
   */
  public getPassive(): CommanderPassiveEffect {
    return this.config.passive;
  }

  /**
   * Returns the ultimate specification
   */
  public getUltimate(): CommanderUltimateEffect {
    return this.config.ultimate;
  }

  /**
   * Passive bonus: Fire weapon ATK multiplier bonus (Wang Shouren: +20% -> 0.20)
   */
  public getFireAtkBonus(): number {
    return this.config.passive.fireAtkBonus ?? 0;
  }

  /**
   * Passive bonus: Explosion cooldown reduction (Wang Shouren: 0.1s)
   */
  public getExplosionCdReduction(): number {
    return this.config.passive.explosionCdReduction ?? 0;
  }

  /**
   * Passive bonus: Mohist weapon attack range bonus (Qin Huali: +15% -> 0.15)
   */
  public getMohistRangeBonus(): number {
    return this.config.passive.mohistRangeBonus ?? 0;
  }

  /**
   * Passive bonus: Fortress unit max HP bonus (Qin Huali: +30% -> 0.30)
   */
  public getFortressHpBonus(): number {
    return this.config.passive.fortressHpBonus ?? 0;
  }

  /**
   * Passive bonus: Fortress melee reflect damage bonus (Qin Liangyu: +50% -> 0.50)
   */
  public getFortressReflectBonus(): number {
    return this.config.passive.fortressReflectBonus ?? 0;
  }

  /**
   * Passive bonus: Enemy attack speed reduction near wall (Qin Liangyu: -20% -> 0.20)
   */
  public getEnemyAtkSpeedReductionNearWall(): number {
    return this.config.passive.enemyAtkSpeedReductionNearWall ?? 0;
  }

  /**
   * Passive bonus: Qimen aura radius range bonus in grid cells (Liu Bowen: +1)
   */
  public getQimenAuraRangeBonus(): number {
    return this.config.passive.qimenAuraRangeBonus ?? 0;
  }

  /**
   * Passive bonus: Elemental reaction damage multiplier bonus (Liu Bowen: +30% -> 0.30)
   */
  public getReactionDmgBonus(): number {
    return this.config.passive.reactionDmgBonus ?? 0;
  }

  /**
   * Active ultimate bonus: Reload speed bonus multiplier (Wang Shouren: +150% -> 1.50 during ultimate)
   */
  public getReloadSpeedBonus(): number {
    return this.isUltimateActive ? (this.config.ultimate.reloadSpeedBonus ?? 0) : 0;
  }

  /**
   * Returns snapshot of current commander state
   */
  public getState(): CommanderState {
    return {
      configId: this.config.id,
      rage: this.rage,
      maxRage: this.maxRage,
      isUltimateActive: this.isUltimateActive,
      ultimateRemainingDuration: this.ultimateRemainingDuration,
      barrierHp: this.barrierHp
    };
  }

  /**
   * Resets commander state to initial
   */
  public reset(): void {
    this.rage = 0;
    this.isUltimateActive = false;
    this.ultimateRemainingDuration = 0;
    this.barrierHp = 0;
  }
}
