/**
 * 《孤城神机营》- Milestone M3 Adversarial Challenge & Stress Test Suite
 * Challenger: Challenger 1 (Empirical Challenger)
 * 
 * Adversarial Verifications:
 * 1. Additive sum boundary overflow: Stack +500% additive bonuses -> capped strictly to +150% (2.50x multiplier).
 * 2. Independent multiplicative gates: Pass 10 gates with +50% each -> ONLY first 3 accepted, each capped at +25% (1.25^3 = 1.953125x multiplier).
 * 3. Crit rate boundary: Roll = 0.7499 crits; Roll = 0.7501 does not crit; bonus crit rate 200% clamped to 75%. Crit damage multiplier clamped to 2.0x under 500% crit damage bonus.
 * 4. Sunder & Armor non-negative floor: Sunder 500 flat armor against 50 base armor -> effective armor is 0 (never negative, preventing reverse damage amplification).
 * 5. Extreme defense & damage floor: Target with 99999 armor and 99.9% special reduction -> final damage must remain >= 1.0 (minimum damage guarantee).
 * 6. Target HP clamp: Massive 1,000,000 damage against 100 HP enemy -> actualHpDeducted must be exactly 100 (never deducting more than currentHp).
 * 7. Ballistics & Splash AOE integration: Parabolic arc symmetry & splash deduplication.
 * 8. Commander Rage clamp & barrier absorption under stress.
 */

import { describe, it, expect } from 'vitest';
import { DamagePipeline, calculateDamage } from '../src/core/combat/damage-pipeline';
import { WeaponInstance, EnemyEntity, DamageCalculationContext } from '../src/core/types';
import { ProjectileManager } from '../src/core/combat/projectile';
import { SpatialTargetingSystem } from '../src/core/combat/targeting';
import { Commander } from '../src/core/commander/commander';

function makeWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: 'w_challenger_test',
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

function makeEnemy(overrides: Partial<EnemyEntity> = {}): EnemyEntity {
  return {
    id: 'e_challenger_test',
    typeId: 'elite_iron_shield',
    name: '重甲铁盾兵',
    isBoss: false,
    maxHp: overrides.maxHp ?? 1000,
    currentHp: overrides.currentHp ?? 1000,
    armor: overrides.armor ?? 150,
    shield: overrides.shield ?? 0,
    moveSpeed: overrides.moveSpeed ?? 1.0,
    ...overrides
  };
}

describe('Challenger M3 Adversarial Challenge: 7-Step Damage Pipeline', () => {

  // =========================================================================
  // Challenge 1: Additive Sum Boundary Overflow & Negative Stacking
  // =========================================================================
  describe('Challenge 1: Additive Sum Boundary Overflow (+150% Hard Cap)', () => {
    it('strictly clamps stacked +500% additive bonuses to +150% (2.50x multiplier)', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 0 });

      // Pass multiple large additive bonuses totaling 500% (5.00)
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [1.0, 1.5, 0.5, 1.0, 1.0], // Sum = 5.00 (+500%)
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      // Expected: baseAtk (100) * skillMultiplier (1.0) * (1 + min(5.00, 1.50)) = 100 * 2.50 = 250.0
      expect(res.steps.skillDmg).toBe(100);
      expect(res.steps.additiveDmg).toBe(250.0);
      expect(res.finalDamage).toBe(250.0);
    });

    it('verifies exact boundary threshold behavior around 1.50 (150%)', () => {
      const weapon = makeWeapon({ baseAtk: 1000 });
      const enemy = makeEnemy({ armor: 0 });

      // Just below cap: +149.99% (1.4999) -> 2.4999x
      const ctxBelow: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [1.4999],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };
      const resBelow = DamagePipeline.calculate(ctxBelow, 1.0);
      expect(resBelow.steps.additiveDmg).toBeCloseTo(2499.9, 4);

      // Exactly at cap: +150.00% (1.50) -> 2.50x
      const ctxExact: DamageCalculationContext = {
        ...ctxBelow,
        additiveBonuses: [1.50]
      };
      const resExact = DamagePipeline.calculate(ctxExact, 1.0);
      expect(resExact.steps.additiveDmg).toBe(2500.0);

      // Just above cap: +150.01% (1.5001) -> clamped to 2.50x
      const ctxAbove: DamageCalculationContext = {
        ...ctxBelow,
        additiveBonuses: [1.5001]
      };
      const resAbove = DamagePipeline.calculate(ctxAbove, 1.0);
      expect(resAbove.steps.additiveDmg).toBe(2500.0);
    });

    it('clamps negative additive sum to zero, never reducing damage below skill base', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 0 });

      const ctxNegative: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [-0.40, -0.60], // Sum = -1.00
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctxNegative, 1.0);
      expect(res.steps.additiveDmg).toBe(100.0);
    });
  });

  // =========================================================================
  // Challenge 2: Independent Multiplicative Gates Whitelist & Capping
  // =========================================================================
  describe('Challenge 2: Independent Multiplicative Gates (Max 3 Gates, Each <= +25%)', () => {
    it('accepts ONLY the first 3 gates from 10 inputs with +50% each, clamping each to +25% (1.25^3 = 1.953125x)', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 0 });

      // Pass 10 independent multiplier gates with +50% (0.50) each
      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [], // additive = 100
        independentMultipliers: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      // Expected:
      // Gate 1: clamped min(0.5, 0.25) = 0.25 -> 1.25
      // Gate 2: clamped min(0.5, 0.25) = 0.25 -> 1.25
      // Gate 3: clamped min(0.5, 0.25) = 0.25 -> 1.25
      // Gates 4-10: ignored (whitelist max 3)
      // Total multiplicative factor = 1.25 * 1.25 * 1.25 = 1.953125
      // 100 * 1.953125 = 195.3125
      expect(res.steps.multiplicativeDmg).toBeCloseTo(195.3125, 6);
    });

    it('verifies gates 4 through 10 are discarded even if containing huge values or negatives', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 0 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        // First 3 gates normal, gates 4-6 have astronomical numbers
        independentMultipliers: [0.20, 0.10, 0.25, 999.0, 500.0, -100.0],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      // Expected: 100 * (1 + 0.20) * (1 + 0.10) * (1 + 0.25) = 100 * 1.20 * 1.10 * 1.25 = 165.0
      expect(res.steps.multiplicativeDmg).toBeCloseTo(165.0, 4);
    });

    it('clamps negative independent multipliers to 0, preventing damage debuffs via independent slots', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 0 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [-0.25, -0.50],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      expect(res.steps.multiplicativeDmg).toBe(100.0);
    });
  });

  // =========================================================================
  // Challenge 3: Crit Rate & Crit Multiplier Boundaries
  // =========================================================================
  describe('Challenge 3: Crit Rate (<=75%) and Crit Damage (<=2.00x) Boundaries', () => {
    it('verifies roll = 0.7499 crits and roll = 0.7501 does not crit when crit rate is stacked to 200%', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 0 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 2.00, // 200% bonus crit rate, must be clamped to 75% (0.75)
        critDmgBonus: 0,     // base crit dmg is 1.50
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      // Roll 0.7499 < 0.7500 -> CRIT
      const resCrit = DamagePipeline.calculate(ctx, 0.7499);
      expect(resCrit.isCrit).toBe(true);
      expect(resCrit.steps.critDmg).toBe(150.0);

      // Roll 0.7500 == 0.7500 -> NO CRIT (roll must be strictly < critRate)
      const resExactBoundary = DamagePipeline.calculate(ctx, 0.7500);
      expect(resExactBoundary.isCrit).toBe(false);
      expect(resExactBoundary.steps.critDmg).toBe(100.0);

      // Roll 0.7501 > 0.7500 -> NO CRIT
      const resNoCrit = DamagePipeline.calculate(ctx, 0.7501);
      expect(resNoCrit.isCrit).toBe(false);
      expect(resNoCrit.steps.critDmg).toBe(100.0);
    });

    it('strictly clamps crit damage multiplier to 2.0x when +500% crit damage bonus is stacked', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 0 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 1.0, // 100% -> clamped to 75%
        critDmgBonus: 5.0,  // +500% crit damage bonus -> raw 1.50 + 5.00 = 6.50 -> clamped to 2.00
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      // Forced crit with roll 0.00
      const res = DamagePipeline.calculate(ctx, 0.00);
      expect(res.isCrit).toBe(true);
      expect(res.steps.critDmg).toBe(200.0); // Exactly 2.0x
    });

    it('enforces 1.50x floor on crit damage multiplier if negative crit damage bonus is given', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 0 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 1.0,
        critDmgBonus: -0.80, // Negative bonus
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 0.00);
      expect(res.isCrit).toBe(true);
      expect(res.steps.critDmg).toBe(150.0); // 1.50 base floor preserved
    });
  });

  // =========================================================================
  // Challenge 4: Sunder & Armor Non-Negative Floor
  // =========================================================================
  describe('Challenge 4: Sunder & Armor Non-Negative Floor', () => {
    it('verifies sunder of 500 flat armor against 50 base armor floors effective armor to 0 (no reverse damage amplification)', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 50 }); // Base armor = 50

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 500, // Massive flat sunder exceeding armor by 10x
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      // Effective armor must be max(0, 50 - 500) = 0
      expect(res.effectiveArmor).toBe(0);
      // DR = 0 / (0 + 150) = 0
      // Damage should be exactly 100, NOT amplified into negative armor domain
      expect(res.steps.armorDmg).toBe(100.0);
    });

    it('clamps sunderRate to 1.0 (100%), preventing percentage sunder from creating negative armor', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 200 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 2.50, // 250% sunder rate
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      expect(res.effectiveArmor).toBe(0);
      expect(res.steps.armorDmg).toBe(100.0);
    });

    it('handles negative sunder inputs gracefully without buffing enemy armor', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 150 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: -100, // Malformed negative sunder
        sunderRate: -0.50,
        vulnerability: 0,
        specialReduction: 0
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      // Must not increase armor above 150
      expect(res.effectiveArmor).toBe(150);
      expect(res.steps.armorDmg).toBeCloseTo(50.0, 4);
    });
  });

  // =========================================================================
  // Challenge 5: Extreme Defense & Minimum Damage Floor
  // =========================================================================
  describe('Challenge 5: Extreme Defense & Minimum Damage Floor Guarantee', () => {
    it('guarantees final damage >= 1.0 against 99999 armor and 99.9% special reduction', () => {
      const weapon = makeWeapon({ baseAtk: 100 });
      const enemy = makeEnemy({ armor: 99999, currentHp: 1000 });

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
        specialReduction: 0.999 // 99.9% reduction
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      // Armor DR = 99999 / (99999 + 150) = 0.998502...
      // armorDmg = 100 * 0.001497... = 0.1497...
      // After specialReduction 99.9%: 0.1497 * 0.001 = 0.0001497...
      // Final damage MUST be floored to 1.0
      expect(res.finalDamage).toBe(1.0);
      expect(res.actualHpDeducted).toBe(1.0);
    });

    it('guarantees final damage >= 1.0 even with 0 base attack and 100% special reduction', () => {
      const weapon = makeWeapon({ baseAtk: 0 });
      const enemy = makeEnemy({ armor: 1000, currentHp: 50 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 1.0 // 100% immunity
      };

      const res = DamagePipeline.calculate(ctx, 1.0);
      expect(res.finalDamage).toBe(1.0);
      expect(res.actualHpDeducted).toBe(1.0);
    });
  });

  // =========================================================================
  // Challenge 6: Target HP Clamp & Actual HP Deduction
  // =========================================================================
  describe('Challenge 6: Target HP Clamp (1,000,000 Damage vs 100 HP)', () => {
    it('verifies actualHpDeducted is exactly 100 when dealing 1,000,000 damage to 100 HP enemy', () => {
      const weapon = makeWeapon({ baseAtk: 1_000_000 });
      const enemy = makeEnemy({ armor: 0, currentHp: 100, maxHp: 100 });

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
      expect(res.finalDamage).toBe(1_000_000);
      expect(res.actualHpDeducted).toBe(100);

      // Now apply damage via state mutation helper
      const { result, targetDied } = DamagePipeline.applyDamage(ctx, 1.0);
      expect(result.actualHpDeducted).toBe(100);
      expect(enemy.currentHp).toBe(0);
      expect(targetDied).toBe(true);
    });

    it('returns 0 actualHpDeducted and keeps currentHp at 0 when attacking already dead target', () => {
      const weapon = makeWeapon({ baseAtk: 500 });
      const enemy = makeEnemy({ armor: 0, currentHp: 0, maxHp: 100 });

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
      expect(result.finalDamage).toBe(500);
      expect(result.actualHpDeducted).toBe(0);
      expect(enemy.currentHp).toBe(0);
      expect(targetDied).toBe(true);
    });

    it('handles fractional HP deduction correctly (e.g. 0.4 HP remaining vs 1.0 floor damage)', () => {
      const weapon = makeWeapon({ baseAtk: 0 });
      const enemy = makeEnemy({ armor: 1000, currentHp: 0.4, maxHp: 100 });

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: enemy,
        skillMultiplier: 0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 1.0
      };

      const { result, targetDied } = DamagePipeline.applyDamage(ctx, 1.0);
      expect(result.finalDamage).toBe(1.0);
      expect(result.actualHpDeducted).toBe(0.4);
      expect(enemy.currentHp).toBe(0);
      expect(targetDied).toBe(true);
    });
  });

  // =========================================================================
  // Challenge 7: Ballistics, High-Arc Parabolic Trajectory & Splash
  // =========================================================================
  describe('Challenge 7: Ballistics & AOE Splash Integrity', () => {
    it('computes exact parabolic trajectory peak at progress = 0.5', () => {
      const projMgr = new ProjectileManager();
      const weapon = makeWeapon({ configId: 'cannon' });
      const enemy = makeEnemy({ x: 200, y: 840 });

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

      const proj = projMgr.spawn(weapon, enemy, ctx, { isHighArc: true, arcHeight: 80, speed: 10 });
      expect(proj.isHighArc).toBe(true);
      expect(proj.arcHeight).toBe(80);

      // Advance by half travel time
      const halfTime = proj.travelTime * 0.5;
      projMgr.update(halfTime);

      const active = projMgr.getProjectile(proj.id);
      expect(active).toBeDefined();
      if (active) {
        expect(active.progress).toBeCloseTo(0.5, 2);
        // visualY offset: 4 * 80 * 0.5 * 0.5 = 80
        const expectedVisualY = active.currentY - 80;
        expect(active.visualY).toBeCloseTo(expectedVisualY, 1);
      }
    });

    it('correctly damages primary target and distinct splash targets on impact without duplicating primary target', () => {
      const projMgr = new ProjectileManager();
      const weapon = makeWeapon({ configId: 'catapult', baseAtk: 200 });
      const primary = makeEnemy({ id: 'primary_1', currentHp: 500, maxHp: 500, x: 2.0, y: 5.0, armor: 0 });
      const splash1 = makeEnemy({ id: 'splash_1', currentHp: 300, maxHp: 300, x: 2.5, y: 5.2, armor: 0 });
      const deadEnemy = makeEnemy({ id: 'dead_1', currentHp: 0, maxHp: 300, x: 2.1, y: 5.1, armor: 0 });
      const distantEnemy = makeEnemy({ id: 'far_1', currentHp: 300, maxHp: 300, x: 10.0, y: 15.0, armor: 0 });

      const allEnemies = [primary, splash1, deadEnemy, distantEnemy];

      const ctx: DamageCalculationContext = {
        attacker: weapon,
        target: primary,
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

      const proj = projMgr.spawn(weapon, primary, ctx, { aoeRadius: 2.0, speed: 20 });
      const hitEvent = projMgr.simulateToHit(proj.id, allEnemies);

      expect(hitEvent).not.toBeNull();
      if (hitEvent) {
        expect(hitEvent.primaryTarget.id).toBe('primary_1');
        expect(primary.currentHp).toBe(300); // 500 - 200
        expect(hitEvent.splashTargets).toBeDefined();
        // Splash targets must include splash1, but NOT deadEnemy, distantEnemy, or primary
        const splashIds = hitEvent.splashTargets!.map(e => e.id);
        expect(splashIds).toContain('splash_1');
        expect(splashIds).not.toContain('primary_1');
        expect(splashIds).not.toContain('dead_1');
        expect(splashIds).not.toContain('far_1');
        expect(splash1.currentHp).toBe(100); // 300 - 200
      }
    });

    it('properly converts pixel coordinates to meters in SpatialTargetingSystem.getDistanceBetweenEnemies even for close-proximity enemies (dx, dy <= 100)', () => {
      // In pixel space on battlefield (y: 560~1240, x: 60~690), two enemies at (300, 800) and (320, 810) are 22.36 pixels apart (~0.329m).
      // With coordinate space magnitude check, it correctly divides by PIXELS_PER_METER (68), returning ~0.329 meters.
      const e1 = makeEnemy({ x: 300, y: 800 });
      const e2 = makeEnemy({ x: 320, y: 810 });
      const dist = SpatialTargetingSystem.getDistanceBetweenEnemies(e1, e2);
      expect(dist).toBeCloseTo(22.36 / 68, 3);
    });
  });

  // =========================================================================
  // Challenge 8: Commander Rage Accumulation & Barrier Absorption Stress
  // =========================================================================
  describe('Challenge 8: Commander Rage & Barrier Under Stress', () => {
    it('clamps rage strictly to [0, 100] when spammed with large positive or negative values', () => {
      const commander = new Commander('wang_shouren');
      expect(commander.rage).toBe(0);

      // Add 999 rage -> capped at 100
      commander.addRage(999);
      expect(commander.rage).toBe(100);
      expect(commander.canCastUltimate()).toBe(true);

      // Cast ultimate -> consumes 100
      const castRes = commander.castUltimate();
      expect(castRes.success).toBe(true);
      expect(commander.rage).toBe(0);

      // Drain -500 rage -> floored at 0
      commander.addRage(-500);
      expect(commander.rage).toBe(0);

      // Boundary: 99.9 rage cannot cast ultimate
      commander.setRage(99.9);
      expect(commander.canCastUltimate()).toBe(false);
      const failedCast = commander.castUltimate();
      expect(failedCast.success).toBe(false);
      expect(failedCast.reason).toBe('NOT_ENOUGH_RAGE');
    });

    it('absorbs barrier damage and lets overflow pass through cleanly', () => {
      const commander = new Commander('qin_huali'); // Qin Huali has 2000 barrierHp
      commander.setRage(100);
      commander.castUltimate();
      expect(commander.barrierHp).toBe(2000);
      expect(commander.isUltimateActive).toBe(true);

      // Take 800 damage -> 800 absorbed, 0 remaining, barrier = 1200
      const hit1 = commander.absorbBarrierDamage(800);
      expect(hit1.absorbed).toBe(800);
      expect(hit1.remainingDamage).toBe(0);
      expect(commander.barrierHp).toBe(1200);

      // Take 1500 damage -> 1200 absorbed, 300 remaining, barrier = 0
      const hit2 = commander.absorbBarrierDamage(1500);
      expect(hit2.absorbed).toBe(1200);
      expect(hit2.remainingDamage).toBe(300);
      expect(commander.barrierHp).toBe(0);
    });
  });
});
