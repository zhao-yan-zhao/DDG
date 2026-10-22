/**
 * 《孤城神机营》- 7-Step Damage Calculation Pipeline Unit Tests
 * 
 * Comprehensive verification of:
 * - Step 1: Base Attack Panel
 * - Step 2: Skill Multiplier
 * - Step 3: Additive Bonus Modifiers & +150% Hard Cap
 * - Step 4: Independent Multiplicative Gates (Max 3 gates, each <= +25% Hard Cap)
 * - Step 5: Critical Hit Calculation (Crit Rate <= 75%, Crit Dmg <= 2.00x)
 * - Step 6: Armor Defense, Sunder (Flat & Rate) & Vulnerability
 * - Step 7: Minimum Damage Floor (>= 1.0) & Actual HP Deduction
 */

import { describe, it, expect } from 'vitest';
import { DamagePipeline, calculateDamage } from '../src/core/combat/damage-pipeline';
import { WeaponInstance, EnemyEntity, DamageCalculationContext } from '../src/core/types';

function createMockWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: 'w_test_cannon',
    configId: 'cannon',
    name: '红衣大炮',
    star: 1,
    faction: 'fire',
    footprint: { width: 1, height: 2 },
    anchor: { row: 1, col: 1 },
    isFortressOnly: false,
    baseAtk: overrides.baseAtk ?? 100,
    attackInterval: overrides.attackInterval ?? 1.5,
    range: overrides.range ?? 10.0,
    ...overrides
  };
}

function createMockEnemy(overrides: Partial<EnemyEntity> = {}): EnemyEntity {
  return {
    id: 'e_test_boss',
    typeId: 'boss_iron_bear',
    name: '铁塔熊王',
    isBoss: false,
    maxHp: overrides.maxHp ?? 1000,
    currentHp: overrides.currentHp ?? 1000,
    armor: overrides.armor ?? 150,
    shield: overrides.shield ?? 0,
    moveSpeed: overrides.moveSpeed ?? 1.0,
    ...overrides
  };
}

describe('Milestone M3: Strict 7-Step Damage Pipeline', () => {
  describe('Step 1: Base Attack Panel', () => {
    it('accurately uses attacker baseAtk as step 1 output', () => {
      const weapon = createMockWeapon({ baseAtk: 240 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 1.0);
      expect(result.steps.baseAtk).toBe(240);
    });
  });

  describe('Step 2: Skill Multiplier', () => {
    it('applies skill multiplier to baseAtk', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 2.5,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 1.0);
      expect(result.steps.skillDmg).toBe(250);
    });

    it('defaults to 1.0 when skillMultiplier is omitted or nullish', () => {
      const weapon = createMockWeapon({ baseAtk: 120 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 0, // note 0 should be 0 if explicitly passed, but undefined/null defaults to 1.0
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const resultZero = DamagePipeline.calculate(ctx, 1.0);
      expect(resultZero.steps.skillDmg).toBe(0);

      const ctxNull = { ...ctx, skillMultiplier: undefined as any };
      const resultDefault = DamagePipeline.calculate(ctxNull, 1.0);
      expect(resultDefault.steps.skillDmg).toBe(120);
    });
  });

  describe('Step 3: Additive Bonus Modifiers & Hard Cap (+150%)', () => {
    it('sums multiple additive modifiers correctly below cap', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [0.20, 0.35, 0.15], // Sum = 0.70 (+70%)
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 1.0);
      // 100 * (1 + 0.70) = 170
      expect(result.steps.additiveDmg).toBeCloseTo(170, 4);
    });

    it('enforces +150% hard cap when additive bonuses exceed 1.50', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [0.80, 0.90, 0.50], // Sum = 2.20 > 1.50
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 1.0);
      // 100 * (1 + 1.50) = 250
      expect(result.steps.additiveDmg).toBe(250);
    });

    it('clamps negative additive sum to zero (cannot lower below base skillDmg)', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [-0.30],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 1.0);
      expect(result.steps.additiveDmg).toBe(100);
    });
  });

  describe('Step 4: Independent Multiplicative Gates', () => {
    it('applies up to 3 independent multipliers under the 25% single-gate cap', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [0.10, 0.20, 0.15],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 1.0);
      // 100 * (1 + 0.10) * (1 + 0.20) * (1 + 0.15) = 100 * 1.10 * 1.20 * 1.15 = 151.8
      expect(result.steps.multiplicativeDmg).toBeCloseTo(151.8, 2);
    });

    it('enforces single gate cap of <= +25% (0.25)', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [0.50], // 50% exceeds 25%
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 1.0);
      // Capped to 0.25: 100 * 1.25 = 125
      expect(result.steps.multiplicativeDmg).toBeCloseTo(125, 2);
    });

    it('drops any multipliers beyond the 3-gate whitelist ceiling', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [0.10, 0.20, 0.25, 0.25, 0.25], // 5 gates provided
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 1.0);
      // Only first 3 accepted: 100 * 1.10 * 1.20 * 1.25 = 165
      expect(result.steps.multiplicativeDmg).toBeCloseTo(165, 2);
    });
  });

  describe('Step 5: Critical Hit Calculation', () => {
    it('applies base crit multiplier 1.50 on successful crit roll', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0.50, // 50% crit rate
        critDmgBonus: 0,     // base crit dmg is 1.50
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      // Roll 0.30 < 0.50 -> Crit!
      const critResult = DamagePipeline.calculate(ctx, 0.30);
      expect(critResult.isCrit).toBe(true);
      expect(critResult.steps.critDmg).toBe(150);

      // Roll 0.60 >= 0.50 -> No crit
      const normalResult = DamagePipeline.calculate(ctx, 0.60);
      expect(normalResult.isCrit).toBe(false);
      expect(normalResult.steps.critDmg).toBe(100);
    });

    it('strictly clamps crit rate to 75% (0.75)', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0.99, // 99% requested
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      // Roll 0.74 < 0.75 -> Crit
      const resCrit = DamagePipeline.calculate(ctx, 0.74);
      expect(resCrit.isCrit).toBe(true);

      // Roll 0.76 >= 0.75 -> No crit
      const resNoCrit = DamagePipeline.calculate(ctx, 0.76);
      expect(resNoCrit.isCrit).toBe(false);
    });

    it('strictly clamps crit multiplier to 2.00x', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 1.0,
        critDmgBonus: 1.50, // 1.50 base + 1.50 bonus = 3.00 > 2.00
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const result = DamagePipeline.calculate(ctx, 0.0);
      expect(result.isCrit).toBe(true);
      expect(result.steps.critDmg).toBe(200);
    });
  });

  describe('Step 6: Armor Defense, Sunder & Vulnerability', () => {
    it('calculates nonlinear damage reduction DR = Armor / (Armor + 150)', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      // Armor = 150 => DR = 150 / 300 = 50%
      const enemy150 = createMockEnemy({ armor: 150 });
      const ctx150: DamageCalculationContext = {
        attacker: weapon,
        target: enemy150,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res150 = DamagePipeline.calculate(ctx150, 1.0);
      expect(res150.effectiveArmor).toBe(150);
      expect(res150.steps.armorDmg).toBeCloseTo(50, 4);

      // Armor = 450 => DR = 450 / 600 = 75%
      const enemy450 = createMockEnemy({ armor: 450 });
      const res450 = DamagePipeline.calculate({ ...ctx150, target: enemy450 }, 1.0);
      expect(res450.steps.armorDmg).toBeCloseTo(25, 4);
    });

    it('calculates flat and percentage sunder with 0 minimum floor', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      // Base armor 200, 50% sunderRate, 50 sunderFlat => 200 * 0.5 - 50 = 50 effective armor
      const enemy = createMockEnemy({ armor: 200 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 50,
        sunderRate: 0.50,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      expect(res.effectiveArmor).toBe(50);
      // DR = 50 / (50 + 150) = 50 / 200 = 0.25 (25% reduction, 75% passes through)
      expect(res.steps.armorDmg).toBeCloseTo(75, 4);
    });

    it('prevents negative effective armor when sunder exceeds current armor', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 30 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 100, // Exceeds 30
        sunderRate: 0.80,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      expect(res.effectiveArmor).toBe(0);
      // 0 effective armor means 0% DR, 100% damage passes
      expect(res.steps.armorDmg).toBe(100);
    });

    it('amplifies damage through vulnerability', () => {
      const weapon = createMockWeapon({ baseAtk: 100 });
      const enemy = createMockEnemy({ armor: 0 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0.50, // +50% vuln (e.g. Thunder Strike reaction)
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      expect(res.steps.armorDmg).toBeCloseTo(150, 4);
    });
  });

  describe('Step 7: Minimum Damage Floor & Actual HP Deduction', () => {
    it('guarantees damage floor >= 1.0 even against astronomical armor and 99% reduction', () => {
      const weapon = createMockWeapon({ baseAtk: 1 });
      const enemy = createMockEnemy({ armor: 999999, currentHp: 500 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 0.01,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0.99
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      expect(res.finalDamage).toBe(1.0);
      expect(res.actualHpDeducted).toBe(1.0);
    });

    it('clamps actualHpDeducted to target.currentHp to prevent negative HP deduction', () => {
      const weapon = createMockWeapon({ baseAtk: 1000 });
      const enemy = createMockEnemy({ armor: 0, currentHp: 45 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      expect(res.finalDamage).toBe(1000);
      expect(res.actualHpDeducted).toBe(45);
    });

    it('deducts HP correctly via applyDamage helper', () => {
      const weapon = createMockWeapon({ baseAtk: 80 });
      const enemy = createMockEnemy({ armor: 0, currentHp: 100 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const { result, targetDied } = DamagePipeline.applyDamage(ctx, 1.0);
      expect(result.finalDamage).toBe(80);
      expect(enemy.currentHp).toBe(20);
      expect(targetDied).toBe(false);

      // Kill blow
      const secondHit = DamagePipeline.applyDamage(ctx, 1.0);
      expect(secondHit.result.actualHpDeducted).toBe(20);
      expect(enemy.currentHp).toBe(0);
      expect(secondHit.targetDied).toBe(true);
    });
  });

  describe('Full Multi-Step Integration & Functional Wrapper', () => {
    it('computes end-to-end multi-step damage matching theoretical numbers', () => {
      const weapon = createMockWeapon({ baseAtk: 200 });
      const enemy = createMockEnemy({ armor: 300, currentHp: 5000 });
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.5,                 // Step 2: 200 * 1.5 = 300
        additiveBonuses: [0.30, 0.20],        // Step 3: 300 * (1 + 0.50) = 450
        independentMultipliers: [0.20, 0.10], // Step 4: 450 * 1.20 * 1.10 = 594
        critRateBonus: 0.50,                  // Step 5: critRate = 0.50
        critDmgBonus: 0.30,                   // critMultiplier = 1.50 + 0.30 = 1.80 => 594 * 1.80 = 1069.2
        sunderFlat: 60,                       // Step 6: effArmor = 300 * (1 - 0.20) - 60 = 180
        sunderRate: 0.20,                     // DR = 180 / 330 = 0.545454... (1 - DR = 0.454545...)
        vulnerability: 0.25,                  // armorDmg = 1069.2 * 0.454545... * 1.25 = 607.5
        specialReduction: 0.10                // Step 7: finalDamage = 607.5 * 0.90 = 546.75
      };

      const res = calculateDamage(ctx, 0.20); // Forced crit
      expect(res.steps.baseAtk).toBe(200);
      expect(res.steps.skillDmg).toBe(300);
      expect(res.steps.additiveDmg).toBe(450);
      expect(res.steps.multiplicativeDmg).toBeCloseTo(594, 2);
      expect(res.steps.critDmg).toBeCloseTo(1069.2, 2);
      expect(res.effectiveArmor).toBe(180);
      expect(res.steps.armorDmg).toBeCloseTo(607.5, 2);
      expect(res.finalDamage).toBeCloseTo(546.75, 2);
      expect(res.actualHpDeducted).toBeCloseTo(546.75, 2);
    });
  });
});
