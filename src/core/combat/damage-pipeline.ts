/**
 * 《孤城神机营》- Strict Seven-Step Damage Calculation Pipeline
 * 
 * Step 1: Base Attack Panel: attacker.baseAtk
 * Step 2: Skill Base Damage: skillDmg = baseAtk * (skillMultiplier ?? 1.0)
 * Step 3: Additive Bonus Modifiers: additiveDmg = skillDmg * (1 + min(sumAdditive, 1.50)) [Hard cap at +150%]
 * Step 4: Independent Multiplicative Gates: multiplicativeDmg = additiveDmg * prod(1 + min(gate, 0.25)) [Max 3 gates, each <= +25%]
 * Step 5: Critical Hit Calculation: critRate <= 75%, critMultiplier <= 2.00
 * Step 6: Armor Defense, Sunder & Vulnerability: effectiveArmor = max(0, armor * (1 - sunderRate) - sunderFlat), DR = Armor / (Armor + 150)
 * Step 7: Minimum Damage Floor & Actual HP Deduction: finalDamage = max(1.0, armorDmg * (1 - specialReduction)), HP deduction = min(HP, finalDamage)
 */

import { DamageCalculationContext, DamageResult } from '../types';

export class DamagePipeline {
  /**
   * Executes the full 7-step damage calculation pipeline
   * @param ctx Damage calculation context
   * @param forcedCritRoll Optional deterministic roll for unit testing (0.0 <= roll < 1.0)
   */
  public static calculate(ctx: DamageCalculationContext, forcedCritRoll?: number): DamageResult {
    // Step 1: Base Attack Panel
    const baseAtk = ctx.attacker.baseAtk;

    // Step 2: Skill Base Damage
    const skillMultiplier = ctx.skillMultiplier !== undefined && ctx.skillMultiplier !== null
      ? ctx.skillMultiplier
      : 1.0;
    const skillDmg = baseAtk * skillMultiplier;

    // Step 3: Additive Bonus Modifiers (Hard cap at +150% / 1.50)
    const rawAdditiveSum = (ctx.additiveBonuses || []).reduce((acc, bonus) => acc + bonus, 0);
    const clampedAdditive = Math.min(Math.max(0, rawAdditiveSum), 1.50);
    const additiveDmg = skillDmg * (1 + clampedAdditive);

    // Step 4: Independent Multiplicative Gates (Whitelist, max 3 gates, each capped at <= +25% / 0.25)
    const acceptedMultipliers = (ctx.independentMultipliers || []).slice(0, 3);
    let multiProduct = 1.0;
    for (const m of acceptedMultipliers) {
      const clampedM = Math.min(Math.max(0, m), 0.25);
      multiProduct *= (1 + clampedM);
    }
    const multiplicativeDmg = additiveDmg * multiProduct;

    // Step 5: Critical Hit Calculation (Crit Rate <= 75%, Crit Multiplier <= 2.00)
    const critRate = Math.min(Math.max(0, ctx.critRateBonus || 0), 0.75);
    const critDmgMultiplier = Math.min(Math.max(1.50, 1.50 + (ctx.critDmgBonus || 0)), 2.00);
    const roll = forcedCritRoll !== undefined ? forcedCritRoll : Math.random();
    const isCrit = roll < critRate;
    const critDmg = isCrit ? multiplicativeDmg * critDmgMultiplier : multiplicativeDmg;

    // Step 6: Armor Defense, Sunder & Vulnerability
    const sunderRate = Math.min(Math.max(0, ctx.sunderRate || 0), 1.0);
    const sunderFlat = Math.max(0, ctx.sunderFlat || 0);
    const effectiveArmor = Math.max(0, (ctx.target.armor || 0) * (1 - sunderRate) - sunderFlat);
    const armorDr = effectiveArmor / (effectiveArmor + 150);
    const vulnerability = Math.max(0, ctx.vulnerability || 0);
    const armorDmg = critDmg * (1 - armorDr) * (1 + vulnerability);

    // Step 7: Minimum Damage Floor (>= 1.0) & Actual HP Deduction
    const specialReduction = Math.min(Math.max(0, ctx.specialReduction || 0), 1.0);
    const finalDamage = Math.max(1.0, armorDmg * (1 - specialReduction));
    const actualHpDeducted = Math.min(ctx.target.currentHp, finalDamage);

    return {
      finalDamage,
      isCrit,
      actualHpDeducted,
      effectiveArmor,
      steps: {
        baseAtk,
        skillDmg,
        additiveDmg,
        multiplicativeDmg,
        critDmg,
        armorDmg,
        finalDmg: finalDamage
      }
    };
  }

  /**
   * Helper to calculate effective armor after flat and percent sunder (floor at 0)
   */
  public static calculateEffectiveArmor(rawArmor: number, sunderRate: number = 0, sunderFlat: number = 0): number {
    const rate = Math.min(Math.max(0, sunderRate), 1.0);
    const flat = Math.max(0, sunderFlat);
    return Math.max(0, rawArmor * (1 - rate) - flat);
  }

  /**
   * Helper to calculate armor damage reduction ratio: Armor / (Armor + 150)
   */
  public static calculateArmorDr(effectiveArmor: number): number {
    const armor = Math.max(0, effectiveArmor);
    return armor / (armor + 150);
  }

  /**
   * Executes damage calculation and deducts HP directly on target entity
   */
  public static applyDamage(ctx: DamageCalculationContext, forcedCritRoll?: number): { result: DamageResult; targetDied: boolean } {
    const result = this.calculate(ctx, forcedCritRoll);
    ctx.target.currentHp = Math.max(0, ctx.target.currentHp - result.actualHpDeducted);
    return {
      result,
      targetDied: ctx.target.currentHp <= 0
    };
  }
}

/**
 * Functional wrapper for direct calculation
 */
export function calculateDamage(ctx: DamageCalculationContext, forcedCritRoll?: number): DamageResult {
  return DamagePipeline.calculate(ctx, forcedCritRoll);
}

export const DamagePipelineEngine = DamagePipeline;
export type DamagePipelineEngine = DamagePipeline;
