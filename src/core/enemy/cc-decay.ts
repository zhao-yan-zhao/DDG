/**
 * 《孤城神机营》- Control Diminishing Returns & Tenacity Engine
 * Implements GDD V3.0 §3.3:
 * - Diminishing CC duration: Duration = max(0.20, Duration_base * (isBoss ? 0.50 : 1.0) * 0.70^k)
 * - Tenacity window: 1.5s post-CC immunity window
 * - Boss CC counter tracking & stun limit integration (compatible with ReactionValve)
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { EnemyEntity } from '../types';

export const CC_DECAY_RATE = 0.70;
export const BOSS_NATURAL_TENACITY = 0.50;
export const MIN_CC_DURATION_FLOOR = 0.20;
export const TENACITY_WINDOW_DURATION = 1.5; // in seconds
export const MAX_BOSS_STUNS = 3;

export type CCType = 'freeze' | 'paralysis' | 'stun' | 'slow';

export interface CCApplyOptions {
  isStun?: boolean;
  maxBossStuns?: number;
}

export interface CCApplicationResult {
  success: boolean;
  appliedDuration: number;
  ccCount: number;
  reason?: 'TENACIOUS_IMMUNITY' | 'BOSS_STUN_LIMIT_EXCEEDED' | 'ZERO_DURATION' | 'TARGET_DEAD';
}

export class CCDecayEngine {
  /**
   * Calculates effective CC duration based on diminishing returns and boss status.
   * Duration = max(0.20, baseDuration * (isBoss ? 0.50 : 1.0) * 0.70^k)
   * If baseDuration <= 0, returns 0.
   */
  public static calculateCCDuration(
    baseDuration: number,
    ccCount: number,
    isBoss: boolean
  ): number {
    if (baseDuration <= 0) {
      return 0.0;
    }

    let duration = baseDuration;
    if (isBoss) {
      duration *= BOSS_NATURAL_TENACITY;
    }

    const decayed = duration * Math.pow(CC_DECAY_RATE, Math.max(0, ccCount));
    return Math.max(MIN_CC_DURATION_FLOOR, decayed);
  }

  /**
   * Checks if an enemy entity is currently eligible to receive a hard CC.
   * Returns false during the 1.5s post-CC tenacity window.
   */
  public static canApplyCC(target: EnemyEntity, currentTime: number): boolean {
    if (target.isTenacious && target.tenacityTimer !== undefined) {
      if (currentTime < target.tenacityTimer) {
        return false; // Immune during tenacity window
      }
    }
    return true;
  }

  /**
   * Checks whether a Boss has reached its hard stun limit.
   */
  public static isBossStunExceeded(target: EnemyEntity, maxStuns: number = MAX_BOSS_STUNS): boolean {
    if (!target.isBoss) {
      return false;
    }
    return (target.ccCount || 0) >= maxStuns;
  }

  /**
   * High-level method to attempt applying a CC effect on an enemy entity.
   * Validates tenacity, applies boss limits, computes decayed duration, and updates entity state.
   */
  public static applyCC(
    target: EnemyEntity,
    baseDuration: number,
    currentTime: number,
    options?: CCApplyOptions
  ): CCApplicationResult {
    if (target.currentHp <= 0) {
      return { success: false, appliedDuration: 0, ccCount: target.ccCount || 0, reason: 'TARGET_DEAD' };
    }

    // 1. Tenacity window check
    if (!this.canApplyCC(target, currentTime)) {
      return { success: false, appliedDuration: 0, ccCount: target.ccCount || 0, reason: 'TENACIOUS_IMMUNITY' };
    }

    // 2. Boss stun limit check
    if (options?.isStun && target.isBoss) {
      const maxStuns = options.maxBossStuns ?? MAX_BOSS_STUNS;
      if (this.isBossStunExceeded(target, maxStuns)) {
        return { success: false, appliedDuration: 0, ccCount: target.ccCount || 0, reason: 'BOSS_STUN_LIMIT_EXCEEDED' };
      }
    }

    // 3. Compute duration
    const currentCount = target.ccCount || 0;
    const duration = this.calculateCCDuration(baseDuration, currentCount, target.isBoss);

    if (duration <= 0) {
      return { success: false, appliedDuration: 0, ccCount: currentCount, reason: 'ZERO_DURATION' };
    }

    // 4. Commit CC state mutation
    target.ccCount = currentCount + 1;
    target.isTenacious = false;
    target.tenacityTimer = undefined;

    return {
      success: true,
      appliedDuration: duration,
      ccCount: target.ccCount
    };
  }

  /**
   * Called when a CC effect expires or is broken. Grants the target 1.5s tenacity immunity.
   */
  public static onCCExpired(
    target: EnemyEntity,
    currentTime: number,
    tenacityDuration: number = TENACITY_WINDOW_DURATION
  ): void {
    target.isTenacious = true;
    target.tenacityTimer = currentTime + tenacityDuration;
    target.isFrozen = false;
    target.isParalyzed = false;
  }

  /**
   * Periodic tick helper to clear tenacity flag when timer elapses.
   */
  public static updateTenacity(target: EnemyEntity, currentTime: number): void {
    if (target.isTenacious && target.tenacityTimer !== undefined) {
      if (currentTime >= target.tenacityTimer) {
        target.isTenacious = false;
        target.tenacityTimer = undefined;
      }
    }
  }

  /**
   * Resets wave-specific CC counters and status flags.
   */
  public static resetCCState(target: EnemyEntity): void {
    target.ccCount = 0;
    target.isTenacious = false;
    target.tenacityTimer = undefined;
    target.isFrozen = false;
    target.isParalyzed = false;
  }
}
