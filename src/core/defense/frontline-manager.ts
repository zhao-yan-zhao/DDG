/**
 * 《孤城神机营》- Frontline Fortification & Lane Defense System
 * Handles Row 0 Fortress weapon HP, lane interception, broken state, wave restoration,
 * and frontline fortification resonance set bonuses.
 * Pure headless domain logic (Zero DOM / Zero Phaser).
 */

import { StarLevel, WeaponInstance } from '../types';

/**
 * Base Frontline HP matrix by weapon archetype and star level
 */
export const FRONTLINE_HP_TABLE: Record<string, Record<StarLevel, number>> = {
  barricade: {
    1: 300,
    2: 550,
    3: 950,
    4: 1600
  },
  oil_cabinet: {
    1: 240,
    2: 440,
    3: 780,
    4: 1350
  },
  electric_grid: {
    1: 200,
    2: 380,
    3: 680,
    4: 1200
  },
  spear_camp: {
    1: 280,
    2: 500,
    3: 880,
    4: 1500
  }
};

/**
 * Fallback baseline HP for unknown or test fortress weapons
 */
export const DEFAULT_FRONTLINE_HP: Record<StarLevel, number> = {
  1: 250,
  2: 450,
  3: 800,
  4: 1400
};

/**
 * Frontline Fortification Resonance Status
 */
export interface FrontlineResonanceBonus {
  activeCount: number;
  maxHpBonusMultiplier: number; // e.g. 0.20 for +20%
  damageReduction: number;       // e.g. 0.15 for 15%
  thornsReflectRatio: number;    // e.g. 0.20 for 20%
  wallRangedDr: number;          // e.g. 0.30 for 30%
}

export class FrontlineDefenseManager {
  /**
   * Calculates the base max HP for a frontline weapon based on its configId and star level.
   */
  public static getBaseHp(configId: string, star: StarLevel): number {
    const table = FRONTLINE_HP_TABLE[configId] || DEFAULT_FRONTLINE_HP;
    return table[star] || DEFAULT_FRONTLINE_HP[star] || 300;
  }

  /**
   * Initializes frontline HP state onto a weapon placed at Row 0.
   */
  public static initFrontlineWeapon(weapon: WeaponInstance): void {
    if (weapon.anchor.row !== 0) return;
    const baseHp = this.getBaseHp(weapon.configId, weapon.star);
    weapon.maxHp = baseHp;
    weapon.currentHp = baseHp;
    weapon.isBroken = false;
  }

  /**
   * Calculates active resonance bonuses based on living Row 0 weapons count.
   */
  public static calculateResonance(frontlineWeapons: WeaponInstance[]): FrontlineResonanceBonus {
    const count = frontlineWeapons.filter(w => w.anchor.row === 0).length;

    let maxHpBonusMultiplier = 0;
    let damageReduction = 0;
    let thornsReflectRatio = 0;
    let wallRangedDr = 0;

    // 2 units: 【坚壁】+20% max HP for all Row 0 units
    if (count >= 2) {
      maxHpBonusMultiplier += 0.20;
    }
    // 3 units: 【铁壁】+15% damage reduction for all Row 0 units
    if (count >= 3) {
      damageReduction += 0.15;
    }
    // 4 units: 【拒止连环】+35% max HP (replacing 20%), 20% thorns reflect
    if (count >= 4) {
      maxHpBonusMultiplier = 0.35;
      thornsReflectRatio += 0.20;
    }
    // 5 units: 【固若金汤】+50% max HP, 30% ranged damage reduction to wall
    if (count >= 5) {
      maxHpBonusMultiplier = 0.50;
      wallRangedDr += 0.30;
    }

    return {
      activeCount: count,
      maxHpBonusMultiplier,
      damageReduction,
      thornsReflectRatio,
      wallRangedDr
    };
  }

  /**
   * Applies frontline damage to a target weapon, factoring in damage reduction.
   * Returns deducted damage, thorns reflected damage, and whether weapon is now broken.
   */
  public static applyDamage(
    weapon: WeaponInstance,
    rawDamage: number,
    resonance?: FrontlineResonanceBonus
  ): {
    actualDeducted: number;
    reflectedDamage: number;
    isNowBroken: boolean;
  } {
    if (weapon.currentHp === undefined || weapon.currentHp <= 0 || weapon.isBroken) {
      if (weapon.currentHp === undefined) {
        this.initFrontlineWeapon(weapon);
      } else {
        return { actualDeducted: 0, reflectedDamage: 0, isNowBroken: true };
      }
    }

    const currentHp = weapon.currentHp ?? 0;
    const dr = resonance?.damageReduction ?? 0;
    const effectiveDamage = Math.max(1, Math.round(rawDamage * (1 - dr)));
    // Cleanly round actual deducted HP to integer to prevent IEEE-754 decimal leaks
    const actualDeducted = Math.min(Math.round(currentHp), effectiveDamage);

    weapon.currentHp = Math.max(0, Math.round((currentHp - actualDeducted) * 100) / 100);
    weapon.lastDamageTimeSec = Date.now() / 1000;
    let isNowBroken = false;
    if (weapon.currentHp <= 0) {
      weapon.currentHp = 0;
      weapon.isBroken = true;
      isNowBroken = true;
    }

    const thornsRatio = resonance?.thornsReflectRatio ?? 0;
    const reflectedDamage = thornsRatio > 0 ? Math.round(actualDeducted * thornsRatio) : 0;

    return {
      actualDeducted,
      reflectedDamage,
      isNowBroken
    };
  }

  /**
   * Finds the best frontline weapon to intercept an incoming enemy attack at screen coordinate X.
   * Maps enemy X to column (0..4) and checks for an active (non-broken) weapon in that column or nearest column.
   */
  public static findInterceptingWeapon(
    frontlineWeapons: WeaponInstance[],
    enemyX: number,
    startX: number = 195,
    endX: number = 555,
    cols: number = 5
  ): WeaponInstance | null {
    const activeUnits = frontlineWeapons.filter(
      w => w.anchor.row === 0 && !w.isBroken && (w.currentHp ?? 0) > 0
    );
    if (activeUnits.length === 0) return null;

    // Convert enemy X to continuous lane column index (0..4)
    const cellW = (endX - startX) / cols;
    const targetCol = Math.max(0, Math.min(cols - 1, Math.floor((enemyX - startX) / cellW)));

    // 1. Direct hit in same column
    const directHit = activeUnits.find(w => {
      const colStart = w.anchor.col;
      const colEnd = colStart + (w.footprint?.width || 1) - 1;
      return targetCol >= colStart && targetCol <= colEnd;
    });
    if (directHit) return directHit;

    // 2. Nearest column fallback within distance threshold (e.g. 1 column away)
    let bestUnit: WeaponInstance | null = null;
    let minDistance = 999;
    for (const unit of activeUnits) {
      const unitCenterCol = unit.anchor.col + (unit.footprint?.width || 1) / 2 - 0.5;
      const dist = Math.abs(unitCenterCol - targetCol);
      if (dist < minDistance) {
        minDistance = dist;
        bestUnit = unit;
      }
    }

    // Only intercept if within 1.2 column distance
    if (minDistance <= 1.2) {
      return bestUnit;
    }

    return null;
  }

  /**
   * Regenerates HP for Row 0 Frontline Fortress weapons over time.
   * - In-combat regen: 2% of max HP per second.
   * - Out-of-combat regen: 6% of max HP per second (after 3.0s without taking damage).
   * - When currentHp reaches >= 1, isBroken is automatically cleared, re-enabling interception.
   * @param weapon Target weapon instance
   * @param deltaSec Elapsed delta time in seconds
   * @param currentTimeSec Current simulation time in seconds (optional)
   */
  public static tickRegen(
    weapon: WeaponInstance,
    deltaSec: number,
    currentTimeSec?: number
  ): { healed: number; restoredFromBroken: boolean } {
    if (weapon.anchor.row !== 0 || !weapon.maxHp) {
      return { healed: 0, restoredFromBroken: false };
    }

    const maxHp = weapon.maxHp;
    const currentHp = weapon.currentHp ?? 0;
    if (currentHp >= maxHp) {
      return { healed: 0, restoredFromBroken: false };
    }

    const now = currentTimeSec !== undefined ? currentTimeSec : Date.now() / 1000;
    const timeSinceDamage = weapon.lastDamageTimeSec !== undefined ? now - weapon.lastDamageTimeSec : 999;
    const isOutOfCombat = timeSinceDamage >= 3.0;

    // 2%/s in combat, 6%/s out of combat
    const regenRate = isOutOfCombat ? 0.06 : 0.02;
    const regenAmount = maxHp * regenRate * deltaSec;

    const newHp = Math.min(maxHp, Math.round((currentHp + regenAmount) * 100) / 100);
    const healed = Math.round((newHp - currentHp) * 100) / 100;
    weapon.currentHp = newHp;

    let restoredFromBroken = false;
    if (weapon.isBroken && weapon.currentHp >= 1.0) {
      weapon.isBroken = false;
      restoredFromBroken = true;
    }

    return { healed, restoredFromBroken };
  }

  /**
   * Fully restores all frontline weapons to 100% HP at wave clear.
   */
  public static restoreAllAtWaveClear(weapons: WeaponInstance[]): void {
    for (const weapon of weapons) {
      if (weapon.anchor.row === 0 && weapon.maxHp) {
        weapon.currentHp = weapon.maxHp;
        weapon.isBroken = false;
      }
    }
  }
}
