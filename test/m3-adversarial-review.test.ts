/**
 * 《孤城神机营》- Milestone M3 Adversarial & Forensic Review Test Suite
 * Independent Verification by Reviewer & Adversarial Critic
 * 
 * Stresses:
 * 1. Pipeline Hard Cap Integrity: Additive (+150%), Multiplicative (3 gates, 25%), Crit (75%, 2.0x)
 * 2. Armor & Damage Floor Non-Linearity: Armor floor at 0, DR = Armor / (Armor + 150), Damage Floor >= 1.0
 * 3. HP Deduction Invariants: Non-negative HP, dead enemy hits, exact boundary kills
 * 4. Commander State Machine & Barriers: 100-rage threshold, duration expiration, barrier absorption
 * 5. Dynamic / Non-Hardcoded Inputs: Random attacker/target configurations with arbitrary floating-point numbers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DamagePipeline, calculateDamage } from '../src/core/combat/damage-pipeline';
import { SpatialTargetingSystem } from '../src/core/combat/targeting';
import { ProjectileManager } from '../src/core/combat/projectile';
import { Commander } from '../src/core/commander/commander';
import { COMMANDERS_CONFIG, getCommanderConfig, ALL_COMMANDERS } from '../src/config/commanders.config';
import { WeaponInstance, EnemyEntity, DamageCalculationContext } from '../src/core/types';

function makeDynamicWeapon(baseAtk: number): WeaponInstance {
  return {
    id: `dyn_wpn_${Math.random().toString(36).substring(2, 9)}`,
    configId: 'arbitrary_archetype',
    name: '动态测试武器',
    star: 2,
    faction: 'fire',
    footprint: { width: 1, height: 1 },
    anchor: { row: 2, col: 2 },
    isFortressOnly: false,
    baseAtk,
    attackInterval: 0.8,
    range: 12.0
  };
}

function makeDynamicEnemy(hp: number, armor: number): EnemyEntity {
  return {
    id: `dyn_enm_${Math.random().toString(36).substring(2, 9)}`,
    typeId: 'arbitrary_enemy',
    name: '动态测试敌人',
    isBoss: false,
    maxHp: hp,
    currentHp: hp,
    armor,
    shield: 0,
    moveSpeed: 1.0,
    distanceToWall: 4.5
  };
}

describe('M3 Adversarial Review: Damage Pipeline Boundaries & Integrity', () => {
  it('Adversarial 1: Massive additive stacking (+1000%) clamped strictly to +150%', () => {
    const weapon = makeDynamicWeapon(73.5);
    const enemy = makeDynamicEnemy(10000, 0);
    // 10 distinct bonuses summing to 10.0 (+1000%)
    const bonuses = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const ctx: DamageCalculationContext = {
      attacker: weapon,
      target: enemy,
      skillMultiplier: 1.0,
      additiveBonuses: bonuses,
      independentMultipliers: [],
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    const res = DamagePipeline.calculate(ctx, 1.0);
    // 73.5 * (1 + 1.50) = 73.5 * 2.50 = 183.75
    expect(res.steps.additiveDmg).toBeCloseTo(183.75, 5);
  });

  it('Adversarial 2: Negative additive bonus cannot debuff below 1.0x', () => {
    const weapon = makeDynamicWeapon(100);
    const enemy = makeDynamicEnemy(1000, 0);
    const ctx: DamageCalculationContext = {
      attacker: weapon,
      target: enemy,
      skillMultiplier: 1.0,
      additiveBonuses: [-0.99],
      independentMultipliers: [],
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    const res = DamagePipeline.calculate(ctx, 1.0);
    expect(res.steps.additiveDmg).toBe(100);
  });

  it('Adversarial 3: Independent multipliers strictly drops beyond 3 gates and clamps each to 25%', () => {
    const weapon = makeDynamicWeapon(100);
    const enemy = makeDynamicEnemy(1000, 0);
    // 6 gates, all high
    const multipliers = [0.80, 0.50, 0.30, 0.25, 0.25, 0.25];
    const ctx: DamageCalculationContext = {
      attacker: weapon,
      target: enemy,
      skillMultiplier: 1.0,
      additiveBonuses: [],
      independentMultipliers: multipliers,
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    const res = DamagePipeline.calculate(ctx, 1.0);
    // Only first 3 gates taken, each clamped to 0.25:
    // 100 * 1.25 * 1.25 * 1.25 = 195.3125
    expect(res.steps.multiplicativeDmg).toBeCloseTo(195.3125, 4);
  });

  it('Adversarial 4: Exact floating-point crit rate boundary (0.749999 vs 0.750000)', () => {
    const weapon = makeDynamicWeapon(100);
    const enemy = makeDynamicEnemy(1000, 0);
    const ctx: DamageCalculationContext = {
      attacker: weapon,
      target: enemy,
      skillMultiplier: 1.0,
      additiveBonuses: [],
      independentMultipliers: [],
      critRateBonus: 0.9999, // Exceeds 0.75
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    // Roll 0.749999 is < 0.75 -> Crit
    const hitCrit = DamagePipeline.calculate(ctx, 0.749999);
    expect(hitCrit.isCrit).toBe(true);

    // Roll 0.750000 is not < 0.75 -> No crit
    const hitNoCrit = DamagePipeline.calculate(ctx, 0.75);
    expect(hitNoCrit.isCrit).toBe(false);
  });

  it('Adversarial 5: Sunder flat and percentage cannot produce negative armor damage amplification', () => {
    const weapon = makeDynamicWeapon(100);
    const enemy = makeDynamicEnemy(1000, 20); // 20 armor
    const ctx: DamageCalculationContext = {
      attacker: weapon,
      target: enemy,
      skillMultiplier: 1.0,
      additiveBonuses: [],
      independentMultipliers: [],
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 500, // 500 flat sunder on 20 armor
      sunderRate: 2.0, // 200% sunder
      vulnerability: 0,
      specialReduction: 0
    };

    const res = DamagePipeline.calculate(ctx, 1.0);
    expect(res.effectiveArmor).toBe(0);
    expect(res.steps.armorDmg).toBe(100); // 100% passes through, NO negative-armor amplification!
  });

  it('Adversarial 6: Damage floor (>= 1.0) under extreme armor and 99.9% special reduction', () => {
    const weapon = makeDynamicWeapon(0.001); // Negligible base attack
    const enemy = makeDynamicEnemy(1000, 10000000); // 10 million armor
    const ctx: DamageCalculationContext = {
      attacker: weapon,
      target: enemy,
      skillMultiplier: 0.1,
      additiveBonuses: [],
      independentMultipliers: [],
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0.999
    };

    const res = DamagePipeline.calculate(ctx, 1.0);
    expect(res.finalDamage).toBe(1.0);
    expect(res.actualHpDeducted).toBe(1.0);
  });

  it('Adversarial 7: Target HP never drops below 0 when damaged beyond remaining HP', () => {
    const weapon = makeDynamicWeapon(9999);
    const enemy = makeDynamicEnemy(0.3, 0); // Only 0.3 HP remaining
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
    expect(result.finalDamage).toBe(9999);
    expect(result.actualHpDeducted).toBe(0.3);
    expect(enemy.currentHp).toBe(0);
    expect(targetDied).toBe(true);

    // Second hit on dead entity
    const secondHit = DamagePipeline.applyDamage(ctx, 1.0);
    expect(secondHit.result.actualHpDeducted).toBe(0);
    expect(enemy.currentHp).toBe(0);
    expect(secondHit.targetDied).toBe(true);
  });

  it('Adversarial 8: Nullish and undefined parameter tolerance in DamageCalculationContext', () => {
    const weapon = makeDynamicWeapon(50);
    const enemy = makeDynamicEnemy(200, 0);
    const dirtyCtx = {
      attacker: weapon,
      target: enemy,
      skillMultiplier: undefined,
      additiveBonuses: undefined,
      independentMultipliers: undefined,
      critRateBonus: undefined,
      critDmgBonus: undefined,
      sunderFlat: undefined,
      sunderRate: undefined,
      vulnerability: undefined,
      specialReduction: undefined
    } as unknown as DamageCalculationContext;

    expect(() => DamagePipeline.calculate(dirtyCtx)).not.toThrow();
    const res = DamagePipeline.calculate(dirtyCtx, 1.0);
    expect(res.finalDamage).toBe(50);
  });
});

describe('M3 Adversarial Review: Commander State Machine & Ultimates', () => {
  it('Adversarial 9: Rage drain and rage overflow saturation', () => {
    const cmd = new Commander('wang_shouren');
    cmd.addRage(50);
    expect(cmd.rage).toBe(50);

    // Overflow by 9999
    cmd.addRage(9999);
    expect(cmd.rage).toBe(100);

    // Drain below zero
    cmd.addRage(-1000);
    expect(cmd.rage).toBe(0);
  });

  it('Adversarial 10: Strict 100-rage threshold gate for ultimate', () => {
    const cmd = new Commander('wang_shouren');
    cmd.setRage(99.99);
    expect(cmd.canCastUltimate()).toBe(false);
    const failRes = cmd.castUltimate();
    expect(failRes.success).toBe(false);
    expect(cmd.rage).toBe(99.99); // Rage preserved

    cmd.setRage(100);
    expect(cmd.canCastUltimate()).toBe(true);
    const successRes = cmd.castUltimate();
    expect(successRes.success).toBe(true);
    expect(cmd.rage).toBe(0);
    expect(cmd.isUltimateActive).toBe(true);
  });

  it('Adversarial 11: Qin Huali barrier absorption and multi-stage damage overflow', () => {
    const cmd = new Commander('qin_huali');
    cmd.setRage(100);
    cmd.castUltimate();

    expect(cmd.barrierHp).toBe(2000);

    // Absorbs 750
    const hit1 = cmd.absorbBarrierDamage(750);
    expect(hit1.absorbed).toBe(750);
    expect(hit1.remainingDamage).toBe(0);
    expect(cmd.barrierHp).toBe(1250);

    // Absorbs 1250 with 500 overflow
    const hit2 = cmd.absorbBarrierDamage(1750);
    expect(hit2.absorbed).toBe(1250);
    expect(hit2.remainingDamage).toBe(500);
    expect(cmd.barrierHp).toBe(0);

    // Further damage when barrier is 0 passes 100% through
    const hit3 = cmd.absorbBarrierDamage(300);
    expect(hit3.absorbed).toBe(0);
    expect(hit3.remainingDamage).toBe(300);
  });

  it('Adversarial 12: Micro-frame delta ticking accurately expires ultimate duration', () => {
    const cmd = new Commander('wang_shouren');
    cmd.setRage(100);
    cmd.castUltimate(); // 5.0s duration

    // 60fps simulation: 16.666ms per frame -> 300 frames = 5.0 seconds
    const dt = 1 / 60;
    for (let frame = 0; frame < 299; frame++) {
      cmd.tick(dt);
      expect(cmd.isUltimateActive).toBe(true);
    }

    // 301st frame pushes past 5.0s
    cmd.tick(dt * 2);
    expect(cmd.isUltimateActive).toBe(false);
    expect(cmd.ultimateRemainingDuration).toBe(0);
  });

  it('Adversarial 13: Fallback safety on invalid commander ID', () => {
    const cmd = new Commander('non_existent_commander');
    expect(cmd.config.id).toBe('wang_shouren');
    expect(cmd.config.name).toBe('王守仁');
  });
});

describe('M3 Adversarial Review: Spatial Targeting & Ballistics Robustness', () => {
  it('Adversarial 14: Targeting with empty, null, or out-of-range candidate arrays', () => {
    const weapon = makeDynamicWeapon(50);
    expect(SpatialTargetingSystem.selectTarget(weapon, [])).toBeNull();

    const deadEnemy = makeDynamicEnemy(0, 0);
    expect(SpatialTargetingSystem.selectTarget(weapon, [deadEnemy])).toBeNull();

    const farEnemy = makeDynamicEnemy(500, 0);
    farEnemy.distanceToWall = 999.0;
    expect(SpatialTargetingSystem.selectTarget(weapon, [farEnemy])).toBeNull();
  });

  it('Adversarial 15: Projectile manager handles zero travel time or instant fast-forward', () => {
    const pm = new ProjectileManager();
    const weapon = makeDynamicWeapon(100);
    const enemy = makeDynamicEnemy(500, 0);
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

    const proj = pm.spawn(weapon, enemy, ctx, { speed: 1000.0 });
    // Simulate to hit immediately
    const hit = pm.simulateToHit(proj.id);
    expect(hit).not.toBeNull();
    expect(hit?.primaryTarget.currentHp).toBe(400);
    expect(pm.getActiveCount()).toBe(0);

    // Simulating non-existent ID returns null safely
    expect(pm.simulateToHit('unknown_id')).toBeNull();
  });
});
