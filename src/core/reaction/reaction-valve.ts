/**
 * 《孤城神机营》- Elemental Reactions & Anti-Crash Protection Valves
 * Four core elemental reactions with strict anti-crash safeguards:
 * 1. 【猛火轰爆】 (Oil + Fire)
 * 2. 【雷火天劫】 (Shock + Burn >= 3)
 * 3. 【碎冰崩裂】 (Frozen + Blunt)
 * 4. 【幽冥毒火】 (Poison + Fire)
 *
 * Anti-Crash Valves:
 * - Max 20 reactions per tick global ceiling
 * - Per-target ICD (1.5s for Explosion, 2.0s for Ice Shatter)
 * - Boss CC limits (Max 3 thunder strikes per battle, 50% tenacity, 3% max HP ice cap)
 * - Cascading recursion protection guard
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { ElementalStatus, EnemyEntity } from '../types';

export const MAX_REACTIONS_PER_TICK = 20;
export const EXPLOSION_ICD = 1.5;
export const ICE_SHATTER_ICD = 2.0;
export const MAX_BOSS_THUNDER_STRIKES = 3;

/**
 * Anti-Crash Valve Manager for global tick limits and recursion prevention
 */
export class ReactionValve {
  private static reactionsThisTick: number = 0;
  private static isHandlingReaction: boolean = false;

  public static getReactionsThisTick(): number {
    return this.reactionsThisTick;
  }

  public static canTriggerReaction(): boolean {
    return this.reactionsThisTick < MAX_REACTIONS_PER_TICK;
  }

  public static recordReaction(): boolean {
    if (this.reactionsThisTick >= MAX_REACTIONS_PER_TICK) {
      return false;
    }
    this.reactionsThisTick++;
    return true;
  }

  public static resetTick(): void {
    this.reactionsThisTick = 0;
  }

  public static isRecursionActive(): boolean {
    return this.isHandlingReaction;
  }

  public static runWithRecursionGuard<T>(
    fn: () => T
  ): { executed: boolean; result?: T; reason?: string } {
    if (this.isHandlingReaction) {
      return { executed: false, reason: 'RECURSION_PREVENTED' };
    }
    this.isHandlingReaction = true;
    try {
      const result = fn();
      return { executed: true, result };
    } finally {
      this.isHandlingReaction = false;
    }
  }
}

/**
 * Reaction 1: 【猛火轰爆】 (Oil + Fire)
 * Clears oil, deals 180 AoE fire damage (multiplied by synergy if present),
 * leaves 3.5s fire ground. Enforces 1.5s target ICD.
 */
export function triggerExplosion(
  status: ElementalStatus,
  currentTime: number,
  damageMultiplier: number = 1.0
): { triggered: boolean; damage: number; fireSeaDuration: number; reason?: string } {
  if (!status.hasOil) {
    return { triggered: false, damage: 0, fireSeaDuration: 0, reason: 'NO_OIL' };
  }

  if (status.lastExplosionTime !== undefined && currentTime - status.lastExplosionTime < EXPLOSION_ICD) {
    return { triggered: false, damage: 0, fireSeaDuration: 0, reason: 'VALVE_COOLDOWN' };
  }

  if (!ReactionValve.canTriggerReaction()) {
    return { triggered: false, damage: 0, fireSeaDuration: 0, reason: 'GLOBAL_TICK_CAP_EXCEEDED' };
  }

  ReactionValve.recordReaction();
  status.hasOil = false;
  status.lastExplosionTime = currentTime;

  return {
    triggered: true,
    damage: 180 * damageMultiplier,
    fireSeaDuration: 3.5
  };
}

/**
 * Reaction 2: 【雷火天劫】 (Shock + Burn >= 3)
 * Breaks enemy shield, inflicts 2.0s paralysis (1.0s on Boss), +50% vuln.
 * Enforces Boss limit of max 3 stuns per battle.
 */
export function triggerThunderStrike(
  status: ElementalStatus,
  target: EnemyEntity
): { triggered: boolean; paralysisDuration: number; vulnRate: number; reason?: string } {
  if (!status.hasShock || status.burnStacks < 3) {
    return { triggered: false, paralysisDuration: 0, vulnRate: 0, reason: 'CONDITIONS_UNMET' };
  }

  // Check if Boss reached stun limit (do NOT increment yet)
  if (target.isBoss && (status.thunderStrikeCountOnBoss || 0) >= MAX_BOSS_THUNDER_STRIKES) {
    return { triggered: false, paralysisDuration: 0, vulnRate: 0, reason: 'BOSS_LIMIT_EXCEEDED' };
  }

  // Check global tick valve ceiling
  if (!ReactionValve.canTriggerReaction()) {
    return { triggered: false, paralysisDuration: 0, vulnRate: 0, reason: 'GLOBAL_TICK_CAP_EXCEEDED' };
  }

  // Commit reaction trigger
  ReactionValve.recordReaction();
  if (target.isBoss) {
    status.thunderStrikeCountOnBoss = (status.thunderStrikeCountOnBoss || 0) + 1;
  }
  target.shield = 0; // Guard broken

  const baseDuration = target.isBoss ? 1.0 : 2.0; // Boss 50% natural tenacity
  return {
    triggered: true,
    paralysisDuration: baseDuration,
    vulnRate: 0.50
  };
}

/**
 * Reaction 3: 【碎冰崩裂】 (Frozen + Blunt)
 * 8% max HP true physical damage (Boss capped at 3% max HP), 40% slow for 3s.
 * Enforces 2.0s target ICD. Clears frozen status.
 */
export function triggerIceShatter(
  status: ElementalStatus,
  target: EnemyEntity,
  currentTime: number
): { triggered: boolean; damage: number; slowRate: number; reason?: string } {
  if (!status.isFrozen) {
    return { triggered: false, damage: 0, slowRate: 0, reason: 'NOT_FROZEN' };
  }

  if (status.lastIceShatterTime !== undefined && currentTime - status.lastIceShatterTime < ICE_SHATTER_ICD) {
    return { triggered: false, damage: 0, slowRate: 0, reason: 'VALVE_COOLDOWN' };
  }

  if (!ReactionValve.canTriggerReaction()) {
    return { triggered: false, damage: 0, slowRate: 0, reason: 'GLOBAL_TICK_CAP_EXCEEDED' };
  }

  ReactionValve.recordReaction();
  status.isFrozen = false;
  status.lastIceShatterTime = currentTime;

  let damage = target.maxHp * 0.08;
  if (target.isBoss) {
    damage = Math.min(damage, target.maxHp * 0.03); // Hard cap 3% on Boss
  }

  return {
    triggered: true,
    damage,
    slowRate: 0.40
  };
}

/**
 * Reaction 4: 【幽冥毒火】 (Poison + Fire)
 * 120% DoT amp, 4.0s duration ceiling, healing disabled.
 * Non-stackable refresh.
 */
export function triggerPoisonFire(
  status: ElementalStatus
): { triggered: boolean; dotAmp: number; duration: number; healingDisabled: boolean; reason?: string } {
  if (!status.hasPoison) {
    return { triggered: false, dotAmp: 0, duration: 0, healingDisabled: false, reason: 'NO_POISON' };
  }

  if (!ReactionValve.canTriggerReaction()) {
    return { triggered: false, dotAmp: 0, duration: 0, healingDisabled: false, reason: 'GLOBAL_TICK_CAP_EXCEEDED' };
  }

  ReactionValve.recordReaction();
  status.poisonFireDurationRemaining = 4.0; // Strictly capped at 4.0s without infinite stacking

  return {
    triggered: true,
    dotAmp: 1.20,
    duration: 4.0,
    healingDisabled: true
  };
}

/**
 * Elemental Reaction Engine class providing static methods matching domain contracts.
 */
export class ElementalReactionEngine {
  public static triggerExplosion = triggerExplosion;
  public static triggerThunderStrike = triggerThunderStrike;
  public static triggerIceShatter = triggerIceShatter;
  public static triggerPoisonFire = triggerPoisonFire;
}

export const ReactionValveEngine = ReactionValve;
export type ReactionValveEngine = ReactionValve;
