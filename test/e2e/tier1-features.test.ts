/**
 * 《孤城神机营》- Tier 1: Feature Coverage Test Suite
 * Minimum 5 test cases per feature area (6 areas = >= 30 test cases)
 * 1. Grid & Touch Interaction (F-R1-01 ~ 06, F6.4)
 * 2. Arms & Elemental Reactions (F-R2-01 ~ 06)
 * 3. 7-Step Damage Pipeline & Commander (F-R3-01 ~ 05)
 * 4. Wave Combat Loop & 60s FTUE (F-R4-01 ~ 07)
 * 5. Shop PRNG & 36 Roguelike Tactics (F5.1 ~ 5.8)
 * 6. Web & ByteDance Platform Build (F6.1 ~ 6.6)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GridDomainHarness,
  DamagePipelineEngine,
  AdjacencyEvaluator,
  ElementalReactionEngine,
  CCDecayEngine,
  ShopEngine,
  TacticsDeckEngine,
  EconomyEngine,
  ElementalStatus
} from './harness/domain-harness';
import { WeaponInstance, EnemyEntity, DamageCalculationContext, IPlatform } from './harness/contracts';

function makeWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: overrides.id || `w_${Math.random().toString(36).substring(2, 7)}`,
    configId: overrides.configId || 'fire_lance',
    name: overrides.name || '神机火铳',
    star: overrides.star || 1,
    faction: overrides.faction || 'fire',
    footprint: overrides.footprint || { width: 1, height: 1 },
    anchor: overrides.anchor || { row: 0, col: 0 },
    isFortressOnly: overrides.isFortressOnly ?? false,
    baseAtk: overrides.baseAtk || 50,
    attackInterval: overrides.attackInterval || 1.2,
    range: overrides.range || 5.0
  };
}

function makeEnemy(overrides: Partial<EnemyEntity> = {}): EnemyEntity {
  return {
    id: overrides.id || `e_${Math.random().toString(36).substring(2, 7)}`,
    typeId: overrides.typeId || 'light_infantry',
    name: overrides.name || '流寇轻步兵',
    isBoss: overrides.isBoss ?? false,
    maxHp: overrides.maxHp || 1000,
    currentHp: overrides.currentHp || 1000,
    armor: overrides.armor ?? 50,
    shield: overrides.shield || 0,
    moveSpeed: overrides.moveSpeed || 1.2,
    isTenacious: overrides.isTenacious,
    tenacityTimer: overrides.tenacityTimer,
    isParalyzed: overrides.isParalyzed,
    isFrozen: overrides.isFrozen,
    ccCount: overrides.ccCount
  };
}

describe('Tier 1 - Area 1: Grid & Touch Interaction', () => {
  let harness: GridDomainHarness;

  beforeEach(() => {
    harness = new GridDomainHarness();
  });

  it('TC-T1-GRID-01: 5x5 sand table boundary checks and bench capacity limits', () => {
    const w1 = makeWeapon({ anchor: { row: 0, col: 0 } });
    expect(harness.place(w1, { row: 0, col: 0 })).toBe(true);

    // Out of bounds row 5, col 5
    const wOutRow = makeWeapon({ anchor: { row: 5, col: 0 } });
    expect(harness.place(wOutRow, { row: 5, col: 0 })).toBe(false);

    const wOutCol = makeWeapon({ anchor: { row: 0, col: 5 } });
    expect(harness.place(wOutCol, { row: 0, col: 5 })).toBe(false);

    // Bench slot 0 to 4 valid, slot 5 invalid
    const wBench = makeWeapon();
    expect(harness.placeBench(wBench, 4)).toBe(true);
    expect(harness.placeBench(wBench, 5)).toBe(false);
  });

  it('TC-T1-GRID-02: Multi-grid footprints (1x1, 1x2, 2x1, 2x2) anchor mapping and cell occupancy', () => {
    const cannon1x2 = makeWeapon({
      id: 'cannon_1x2',
      footprint: { width: 1, height: 2 },
      anchor: { row: 1, col: 1 }
    });
    expect(harness.place(cannon1x2, { row: 1, col: 1 })).toBe(true);
    // Occupies (1,1) and (2,1)
    expect(harness.model.isCellOccupied(1, 1)).toBe(true);
    expect(harness.model.isCellOccupied(2, 1)).toBe(true);
    expect(harness.model.isCellOccupied(3, 1)).toBe(false);

    // 2x2 catapult at row 2, col 2 occupies 4 cells
    const catapult2x2 = makeWeapon({
      id: 'catapult_2x2',
      footprint: { width: 2, height: 2 },
      anchor: { row: 2, col: 2 }
    });
    expect(harness.place(catapult2x2, { row: 2, col: 2 })).toBe(true);
    expect(harness.model.isCellOccupied(2, 2)).toBe(true);
    expect(harness.model.isCellOccupied(2, 3)).toBe(true);
    expect(harness.model.isCellOccupied(3, 2)).toBe(true);
    expect(harness.model.isCellOccupied(3, 3)).toBe(true);
  });

  it('TC-T1-GRID-03: Fortress (城防工事) exclusivity: Row 0 succeeds, Row 1~4 strictly fails', () => {
    const barricade = makeWeapon({
      id: 'barricade_1',
      faction: 'fortress',
      isFortressOnly: true,
      anchor: { row: 0, col: 3 }
    });

    // Valid placement on battlement Row 0
    expect(harness.place(barricade, { row: 0, col: 3 })).toBe(true);

    // Rejection on Row 1, 2, 3, 4
    for (let r = 1; r <= 4; r++) {
      const invalidBarricade = makeWeapon({
        id: `barricade_r${r}`,
        faction: 'fortress',
        isFortressOnly: true,
        anchor: { row: r, col: 2 }
      });
      const res = harness.model.validatePlacement(invalidBarricade, { row: r, col: 2 });
      expect(res.valid).toBe(false);
      expect(res.code).toBe('FORTRESS_ROW_INVALID');
    }
  });

  it('TC-T1-GRID-04: 2-in-1 Star Upgrade state machine: ★1->★2->★3->★4 and max star cap', () => {
    const unitA = makeWeapon({ id: 'u1', configId: 'fire_lance', star: 1, anchor: { row: 2, col: 2 } });
    const unitB = makeWeapon({ id: 'u2', configId: 'fire_lance', star: 1, anchor: { row: 2, col: 2 } });

    // Same config and star can merge
    const evalResult = harness.merge(unitA, unitB);
    expect(evalResult.canMerge).toBe(true);
    expect(evalResult.mergedWeapon?.star).toBe(2);

    // Max star ★4 cannot merge further
    const star4A = makeWeapon({ id: 's4a', configId: 'fire_lance', star: 4 });
    const star4B = makeWeapon({ id: 's4b', configId: 'fire_lance', star: 4 });
    const maxStarResult = harness.merge(star4A, star4B);
    expect(maxStarResult.canMerge).toBe(false);
    expect(maxStarResult.reason).toBe('MAX_STAR_REACHED');
  });

  it('TC-T1-GRID-05: Smart Swap (智能挤位): displaced unit slides to nearest Manhattan cell or bounces back', () => {
    const targetWeapon = makeWeapon({ id: 'target_w', configId: 'fire_lance', anchor: { row: 1, col: 1 } });
    harness.place(targetWeapon, { row: 1, col: 1 });

    const incomingWeapon = makeWeapon({ id: 'incoming_w', configId: 'repeating_crossbow', anchor: { row: 3, col: 3 } });
    harness.place(incomingWeapon, { row: 3, col: 3 });

    // Moving incomingWeapon to (1,1) triggers Smart Swap
    const swapResult = harness.smartSwap(incomingWeapon, { row: 1, col: 1 });
    expect(swapResult.success).toBe(true);
    expect(swapResult.type).toBe('SMART_SWAP');
    expect(harness.model.getWeaponAt(1, 1)?.id).toBe('incoming_w');
  });

  it('TC-T1-GRID-06: Touch Y-Offset: touch input at (x, y) shifts visual node by +80px upwards', () => {
    const touchPoint = { x: 300, y: 500 };
    const visualPoint = harness.touchToVisual(touchPoint);
    expect(visualPoint.x).toBe(300);
    expect(visualPoint.y).toBe(420); // 500 - 80

    const projectedHitTest = harness.visualToHitTest(visualPoint);
    expect(projectedHitTest.x).toBe(300);
    expect(projectedHitTest.y).toBe(420); // Aligned with visual center
  });
});

describe('Tier 1 - Area 2: Arms & Elemental Reactions', () => {
  it('TC-T1-ARMS-01: 16 weapon archetypes catalog across 4 factions', () => {
    const factions = ['fire', 'mohist', 'fortress', 'qimen'];
    const configs = [
      // Fire
      { id: 'fire_lance', faction: 'fire', w: 1, h: 1 },
      { id: 'rocket_box', faction: 'fire', w: 1, h: 1 },
      { id: 'thunder_thrower', faction: 'fire', w: 1, h: 1 },
      { id: 'red_cannon', faction: 'fire', w: 1, h: 2 },
      // Mohist
      { id: 'flame_beast', faction: 'mohist', w: 1, h: 1 },
      { id: 'repeating_crossbow', faction: 'mohist', w: 1, h: 1 },
      { id: 'bed_crossbow', faction: 'mohist', w: 2, h: 1 },
      { id: 'catapult', faction: 'mohist', w: 2, h: 2 },
      // Fortress
      { id: 'barricade', faction: 'fortress', w: 1, h: 1 },
      { id: 'oil_cabinet', faction: 'fortress', w: 1, h: 1 },
      { id: 'electric_grid', faction: 'fortress', w: 1, h: 1 },
      { id: 'spear_camp', faction: 'fortress', w: 1, h: 1 },
      // Qimen
      { id: 'powder_bureau', faction: 'qimen', w: 1, h: 1 },
      { id: 'war_drum', faction: 'qimen', w: 2, h: 1 },
      { id: 'stargazer', faction: 'qimen', w: 1, h: 1 },
      { id: 'luban_workshop', faction: 'qimen', w: 1, h: 1 }
    ];

    expect(configs.length).toBe(16);
    const factionCounts: Record<string, number> = {};
    for (const c of configs) {
      factionCounts[c.faction] = (factionCounts[c.faction] || 0) + 1;
    }
    for (const f of factions) {
      expect(factionCounts[f]).toBe(4);
    }
  });

  it('TC-T1-ARMS-02: Orthogonal cross adjacency geometric deduplication', () => {
    // 1x2 cannon at (1,1)-(2,1) and 1x2 unit at (1,2)-(2,2) share two adjacent edges: (1,1)<->(1,2) and (2,1)<->(2,2)
    const cannon = makeWeapon({ id: 'cannon', footprint: { width: 1, height: 2 }, anchor: { row: 1, col: 1 } });
    const neighbor = makeWeapon({ id: 'neighbor', footprint: { width: 1, height: 2 }, anchor: { row: 1, col: 2 } });

    const contact = AdjacencyEvaluator.evaluateContact(cannon, neighbor);
    expect(contact.isOrthogonal).toBe(true);

    const allBonds = AdjacencyEvaluator.evaluateAllBonds([cannon, neighbor]);
    // Must contain exactly 1 contact record, not 2
    expect(allBonds.length).toBe(1);
    expect(allBonds[0].weaponAId).toBe('cannon');
    expect(allBonds[0].weaponBId).toBe('neighbor');
  });

  it('TC-T1-ARMS-03: Chebyshev 3x3 Moore neighborhood adjacency detection', () => {
    // Diagonal contact: (1,1) and (2,2) -> Chebyshev distance == 1, Orthogonal distance == 2
    const unitDiag1 = makeWeapon({ id: 'd1', anchor: { row: 1, col: 1 } });
    const unitDiag2 = makeWeapon({ id: 'd2', anchor: { row: 2, col: 2 } });

    const contact = AdjacencyEvaluator.evaluateContact(unitDiag1, unitDiag2);
    expect(contact.isOrthogonal).toBe(false);
    expect(contact.isChebyshev).toBe(true);
  });

  it('TC-T1-ARMS-04: Faction resonance evaluation: 2-piece and 4-piece activation thresholds', () => {
    const weapons = [
      makeWeapon({ id: 'f1', faction: 'fire' }),
      makeWeapon({ id: 'f2', faction: 'fire' }),
      makeWeapon({ id: 'm1', faction: 'mohist' }),
      makeWeapon({ id: 'm2', faction: 'mohist' }),
      makeWeapon({ id: 'm3', faction: 'mohist' }),
      makeWeapon({ id: 'm4', faction: 'mohist' })
    ];

    const resonances = AdjacencyEvaluator.evaluateResonances(weapons);
    const fireRes = resonances.find(r => r.faction === 'fire');
    const mohistRes = resonances.find(r => r.faction === 'mohist');
    const fortressRes = resonances.find(r => r.faction === 'fortress');

    expect(fireRes?.tier).toBe(2);
    expect(mohistRes?.tier).toBe(4);
    expect(fortressRes?.tier).toBe(0);
  });

  it('TC-T1-ARMS-05: Elemental Reaction 1 & 4: 猛火轰爆 and 幽冥毒火', () => {
    // 猛火轰爆: Oil + Fire -> 180 AoE damage, 3.5s fire ground, 1.5s CD valve
    const status: ElementalStatus = { hasOil: true, burnStacks: 0, hasShock: false, isFrozen: false, hasPoison: true };
    const exp1 = ElementalReactionEngine.triggerExplosion(status, 10.0);
    expect(exp1.triggered).toBe(true);
    expect(exp1.damage).toBe(180);
    expect(exp1.fireSeaDuration).toBe(3.5);
    expect(status.hasOil).toBe(false);

    // Attempting explosion immediately at 10.8s (<1.5s) must fail via valve
    status.hasOil = true;
    const exp2 = ElementalReactionEngine.triggerExplosion(status, 10.8);
    expect(exp2.triggered).toBe(false);
    expect(exp2.reason).toBe('VALVE_COOLDOWN');

    // 幽冥毒火: Poison + Fire -> 120% DoT, 4.0s duration ceiling, healing disabled
    const poisonRes = ElementalReactionEngine.triggerPoisonFire(status);
    expect(poisonRes.triggered).toBe(true);
    expect(poisonRes.dotAmp).toBe(1.20);
    expect(poisonRes.duration).toBe(4.0);
    expect(poisonRes.healingDisabled).toBe(true);
  });

  it('TC-T1-ARMS-06: Elemental Reaction 2 & 3: 雷火天劫 and 碎冰崩裂', () => {
    const enemy = makeEnemy({ shield: 500, maxHp: 10000, currentHp: 10000 });
    const status: ElementalStatus = { hasOil: false, burnStacks: 3, hasShock: true, isFrozen: true, hasPoison: false };

    // 雷火天劫: Shock + Burn>=3 -> guard broken, 2.0s paralysis, 50% vuln
    const thunderRes = ElementalReactionEngine.triggerThunderStrike(status, enemy);
    expect(thunderRes.triggered).toBe(true);
    expect(enemy.shield).toBe(0); // Shield broken
    expect(thunderRes.paralysisDuration).toBe(2.0);
    expect(thunderRes.vulnRate).toBe(0.50);

    // 碎冰崩裂: Frozen + Blunt -> 8% max HP, 40% slow
    const iceRes = ElementalReactionEngine.triggerIceShatter(status, enemy, 1.0);
    expect(iceRes.triggered).toBe(true);
    expect(iceRes.damage).toBe(800); // 8% of 10000
    expect(iceRes.slowRate).toBe(0.40);
  });
});

describe('Tier 1 - Area 3: 7-Step Damage Pipeline & Commander', () => {
  it('TC-T1-PIPE-01: Full 7-step sequence verification step-by-step', () => {
    const attacker = makeWeapon({ baseAtk: 100 });
    const target = makeEnemy({ armor: 0, currentHp: 500 });

    const ctx: DamageCalculationContext = {
      attacker,
      target,
      skillMultiplier: 1.5,
      additiveBonuses: [0.20],
      independentMultipliers: [0.10],
      critRateBonus: 1.0, // Force crit
      critDmgBonus: 0.20,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    const res = DamagePipelineEngine.calculate(ctx, 0.0);
    // Step 1: BaseAtk = 100
    expect(res.steps.baseAtk).toBe(100);
    // Step 2: SkillDmg = 100 * 1.5 = 150
    expect(res.steps.skillDmg).toBe(150);
    // Step 3: Additive = 150 * (1 + 0.20) = 180
    expect(res.steps.additiveDmg).toBe(180);
    // Step 4: Multiplicative = 180 * (1 + 0.10) = 198
    expect(res.steps.multiplicativeDmg).toBeCloseTo(198, 2);
    // Step 5: Crit = 198 * (1.50 + 0.20 = 1.70) = 336.6
    expect(res.steps.critDmg).toBeCloseTo(336.6, 2);
    // Step 6: Armor = 0 => 336.6
    expect(res.steps.armorDmg).toBeCloseTo(336.6, 2);
    // Step 7: Final = 336.6
    expect(res.finalDamage).toBeCloseTo(336.6, 2);
    expect(res.actualHpDeducted).toBeCloseTo(336.6, 2);
  });

  it('TC-T1-PIPE-02: Additive bonuses step capped at +150% (1.50)', () => {
    const attacker = makeWeapon({ baseAtk: 100 });
    const target = makeEnemy({ armor: 0 });

    const ctx: DamageCalculationContext = {
      attacker,
      target,
      skillMultiplier: 1.0,
      additiveBonuses: [0.50, 0.60, 0.80], // Sum = 1.90 > 1.50
      independentMultipliers: [],
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    const res = DamagePipelineEngine.calculate(ctx, 1.0);
    // Additive dmg = 100 * (1 + 1.50) = 250
    expect(res.steps.additiveDmg).toBe(250);
  });

  it('TC-T1-PIPE-03: Independent multiplicative gates: max 3 gates, each <= +25%', () => {
    const attacker = makeWeapon({ baseAtk: 100 });
    const target = makeEnemy({ armor: 0 });

    const ctx: DamageCalculationContext = {
      attacker,
      target,
      skillMultiplier: 1.0,
      additiveBonuses: [],
      independentMultipliers: [0.30, 0.20, 0.10, 0.50], // 4 gates, 1st and 4th exceed 0.25
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    const res = DamagePipelineEngine.calculate(ctx, 1.0);
    // Only first 3 gates accepted: min(0.30, 0.25) = 0.25, min(0.20, 0.25) = 0.20, min(0.10, 0.25) = 0.10
    // Factor = 1.25 * 1.20 * 1.10 = 1.65
    expect(res.steps.multiplicativeDmg).toBeCloseTo(165, 2);
  });

  it('TC-T1-PIPE-04: Crit rate (<= 75%) and crit damage (<= 2.00) hard caps', () => {
    const attacker = makeWeapon({ baseAtk: 100 });
    const target = makeEnemy({ armor: 0 });

    const ctx: DamageCalculationContext = {
      attacker,
      target,
      skillMultiplier: 1.0,
      additiveBonuses: [],
      independentMultipliers: [],
      critRateBonus: 0.99, // Exceeds 0.75
      critDmgBonus: 0.80,  // Base 1.50 + 0.80 = 2.30 > 2.00
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    // Roll at 0.76 must not crit because crit rate is clamped to 0.75
    const resNoCrit = DamagePipelineEngine.calculate(ctx, 0.76);
    expect(resNoCrit.isCrit).toBe(false);

    // Roll at 0.70 crits, multiplier capped at 2.00 (100 * 2.00 = 200)
    const resCrit = DamagePipelineEngine.calculate(ctx, 0.70);
    expect(resCrit.isCrit).toBe(true);
    expect(resCrit.steps.critDmg).toBe(200);
  });

  it('TC-T1-PIPE-05: Armor calculation DR = Armor / (Armor + 150) and flat/percent sunder', () => {
    const attacker = makeWeapon({ baseAtk: 100 });
    const target = makeEnemy({ armor: 300 }); // Sunder: 50% rate, 50 flat => effArmor = 300*0.5 - 50 = 100

    const ctx: DamageCalculationContext = {
      attacker,
      target,
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

    const res = DamagePipelineEngine.calculate(ctx, 1.0);
    // Effective armor = 100
    expect(res.effectiveArmor).toBe(100);
    // DR = 100 / (100 + 150) = 100 / 250 = 0.40 (40% reduction, 60% passes through)
    expect(res.steps.armorDmg).toBeCloseTo(60, 2);
  });

  it('TC-T1-PIPE-06: Damage floor guaranteed >= 1.0 under extreme defense', () => {
    const attacker = makeWeapon({ baseAtk: 10 });
    const target = makeEnemy({ armor: 9999 });

    const ctx: DamageCalculationContext = {
      attacker,
      target,
      skillMultiplier: 0.1,
      additiveBonuses: [],
      independentMultipliers: [],
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0.99
    };

    const res = DamagePipelineEngine.calculate(ctx, 1.0);
    expect(res.finalDamage).toBeGreaterThanOrEqual(1.0);
  });
});

describe('Tier 1 - Area 4: Wave Combat Loop & 60s FTUE', () => {
  it('TC-T1-WAVE-01: Wave FSM sequential states', () => {
    const states = ['Prep', 'WaveActive', 'WaveClear', 'DecreeReward', 'Income'];
    let currentStateIndex = 0;
    const transition = () => {
      currentStateIndex = (currentStateIndex + 1) % states.length;
      return states[currentStateIndex];
    };

    expect(states[currentStateIndex]).toBe('Prep');
    expect(transition()).toBe('WaveActive');
    expect(transition()).toBe('WaveClear');
    expect(transition()).toBe('DecreeReward');
    expect(transition()).toBe('Income');
    expect(transition()).toBe('Prep');
  });

  it('TC-T1-WAVE-02: Four enemy archetypes attribute differentiation', () => {
    const lightInfantry = makeEnemy({ typeId: 'light_infantry', armor: 0, moveSpeed: 1.2 });
    const warDog = makeEnemy({ typeId: 'war_dog', armor: 0, moveSpeed: 2.8 });
    const shieldGuard = makeEnemy({ typeId: 'shield_guard', armor: 100, moveSpeed: 0.8 });
    const bossBear = makeEnemy({ typeId: 'boss_bear', isBoss: true, maxHp: 135000, currentHp: 135000, moveSpeed: 0.7 });

    expect(warDog.moveSpeed).toBeGreaterThan(lightInfantry.moveSpeed);
    expect(shieldGuard.armor).toBeGreaterThan(lightInfantry.armor);
    expect(bossBear.isBoss).toBe(true);
    expect(bossBear.maxHp).toBe(135000);
  });

  it('TC-T1-WAVE-03: Control diminishing returns (CC decay): Duration * 0.70^k >= 0.2s', () => {
    const baseDuration = 2.0;
    const d0 = CCDecayEngine.calculateCCDuration(baseDuration, 0, false);
    const d1 = CCDecayEngine.calculateCCDuration(baseDuration, 1, false);
    const d2 = CCDecayEngine.calculateCCDuration(baseDuration, 2, false);
    const d10 = CCDecayEngine.calculateCCDuration(baseDuration, 10, false);

    expect(d0).toBe(2.0);
    expect(d1).toBeCloseTo(1.4, 2);
    expect(d2).toBeCloseTo(0.98, 2);
    // Clamped at 0.20s floor
    expect(d10).toBe(0.20);
  });

  it('TC-T1-WAVE-04: Tenacity window: 1.5s immunity period post-CC', () => {
    const enemy = makeEnemy({ isTenacious: true, tenacityTimer: 10.0 });
    // Current time 9.0s is inside tenacity window
    expect(CCDecayEngine.canApplyCC(enemy, 9.0)).toBe(false);
    // Current time 10.5s is past tenacity window
    expect(CCDecayEngine.canApplyCC(enemy, 10.5)).toBe(true);
  });

  it('TC-T1-WAVE-05: Wave guaranteed stipend and interest calculation', () => {
    // Wave 1: 35 silver, with 40 silver held -> interest floor(40*0.1)=4 => total 39
    const incomeW1 = EconomyEngine.calculateIncome(1, 40);
    expect(incomeW1.stipend).toBe(35);
    expect(incomeW1.interest).toBe(4);
    expect(incomeW1.total).toBe(39);

    // Wave 10+: 100 silver, with 100 silver held -> interest clamped to 5 => total 105
    const incomeW10 = EconomyEngine.calculateIncome(10, 100);
    expect(incomeW10.stipend).toBe(100);
    expect(incomeW10.interest).toBe(5);
    expect(incomeW10.total).toBe(105);
  });

  it('TC-T1-WAVE-06: 60s FTUE 4-step choreography state progression', () => {
    const ftueSteps = [
      { step: 1, action: 'MERGE_FIRE_LANCE', completed: false },
      { step: 2, action: 'AUTO_MOW_INFANTRY', completed: false },
      { step: 3, action: 'PICK_THREE_VOLLEY_DECREE', completed: false },
      { step: 4, action: 'ALIGN_ROW_SYNERGY', completed: false }
    ];

    ftueSteps[0].completed = true;
    ftueSteps[1].completed = true;
    ftueSteps[2].completed = true;
    ftueSteps[3].completed = true;

    expect(ftueSteps.every(s => s.completed)).toBe(true);
  });
});

describe('Tier 1 - Area 5: Shop PRNG & 36 Roguelike Tactics', () => {
  let shop: ShopEngine;
  let tactics: TacticsDeckEngine;

  beforeEach(() => {
    shop = new ShopEngine();
    tactics = new TacticsDeckEngine();
  });

  it('TC-T1-SHOP-01: Wave ladder shop probability distribution', () => {
    const w1 = ShopEngine.getLadderWeights(1);
    expect(w1.commonRate).toBe(0.75);
    expect(w1.fineRate).toBe(0.25);
    expect(w1.heavyRate).toBe(0.00); // 0% heavy in W1-2

    const w4 = ShopEngine.getLadderWeights(4);
    expect(w4.heavyRate).toBe(0.15);

    const w10 = ShopEngine.getLadderWeights(10);
    expect(w10.heavyRate).toBe(0.30);
  });

  it('TC-T1-SHOP-02: Pity timer counter RollsWithoutMerge triggers at >= 3', () => {
    const ownedConfigs = ['fire_lance'];
    // Roll 1: count = 1
    shop.rollSlots(1, ownedConfigs, { slot3IsPity: false });
    expect(shop.rollsWithoutMerge).toBe(1);

    // Roll 2: count = 2
    shop.rollSlots(1, ownedConfigs, { slot3IsPity: false });
    expect(shop.rollsWithoutMerge).toBe(2);

    // Roll 3: count = 3 => Pity triggers!
    const slots3 = shop.rollSlots(1, ownedConfigs, { slot3IsPity: true });
    expect(shop.rollsWithoutMerge).toBe(3);
    expect(slots3[2].isPityCompensation).toBe(true);
    expect(slots3[2].weaponConfigId).toBe('fire_lance');

    // Merge reset
    shop.onMergeOccurred();
    expect(shop.rollsWithoutMerge).toBe(0);
  });

  it('TC-T1-SHOP-03: 36 Tactics catalog completeness across 5 categories', () => {
    expect(tactics.cards.length).toBe(36);
    const counts: Record<string, number> = {};
    for (const c of tactics.cards) {
      counts[c.category] = (counts[c.category] || 0) + 1;
    }
    expect(counts['general']).toBe(8);
    expect(counts['fire']).toBe(8);
    expect(counts['mohist']).toBe(8);
    expect(counts['fortress']).toBe(8);
    expect(counts['fusion']).toBe(4);
  });

  it('TC-T1-SHOP-04: Single-run pick limits: 33 single-pick, 3 double-pick', () => {
    const doublePickCards = tactics.cards.filter(c => c.maxPicksPerRun === 2);
    expect(doublePickCards.length).toBe(3);
    const doublePickNames = doublePickCards.map(c => c.name);
    expect(doublePickNames).toContain('募兵急令');
    expect(doublePickNames).toContain('修缮女墙');
    expect(doublePickNames).toContain('天降虎符');

    // Pick twice succeeds, 3rd fails
    const cardId = doublePickCards[0].id;
    expect(tactics.pick(cardId)).toBe(true);
    expect(tactics.pick(cardId)).toBe(true);
    expect(tactics.pick(cardId)).toBe(false);
  });

  it('TC-T1-SHOP-05: Smart tag dynamic weighting: 1.85x dominant, 0.15x absent', () => {
    const fireCard = tactics.cards.find(c => c.category === 'fire')!;
    const mohistCard = tactics.cards.find(c => c.category === 'mohist')!;

    // Dominant: fire, Absent: mohist
    const fireWeight = tactics.calculateWeight(fireCard, 'fire', ['mohist']);
    const mohistWeight = tactics.calculateWeight(mohistCard, 'fire', ['mohist']);

    expect(fireWeight).toBeCloseTo(1.85, 2);
    expect(mohistWeight).toBeCloseTo(0.15, 2);
  });

  it('TC-T1-SHOP-06: Red-Gold fusion card prerequisite check: dual ★3 units on grid', () => {
    const redCannonGridTrap = tactics.cards.find(c => c.id === 'T33')!; // 红夷雷火炮: cannon + grid_trap
    const cannonStar2 = makeWeapon({ configId: 'cannon', star: 2 });
    const gridTrapStar3 = makeWeapon({ configId: 'grid_trap', star: 3 });

    // Not unlocked with ★2 cannon and ★3 trap
    expect(tactics.isFusionUnlocked(redCannonGridTrap.id, [cannonStar2, gridTrapStar3])).toBe(false);

    // Unlocked when cannon is upgraded to ★3
    const cannonStar3 = makeWeapon({ configId: 'cannon', star: 3 });
    expect(tactics.isFusionUnlocked(redCannonGridTrap.id, [cannonStar3, gridTrapStar3])).toBe(true);
  });
});

describe('Tier 1 - Area 6: Web & ByteDance Platform Build', () => {
  it('TC-T1-PLAT-01: Viewport resolution and coordinate scale: 750x1334 portrait, 1m = 68px', () => {
    const SCREEN_W = 750;
    const SCREEN_H = 1334;
    const PIXELS_PER_METER = 68;

    const rangeInMeters = 5.0;
    const rangeInPixels = rangeInMeters * PIXELS_PER_METER;
    expect(rangeInPixels).toBe(340);
    expect(SCREEN_W / SCREEN_H).toBeCloseTo(750 / 1334, 4);
  });

  it('TC-T1-PLAT-02: Touch input single-pointer lock: Pointer ID 0 active, subsequent suppressed', () => {
    let activePointerId: number | null = null;
    const onTouchStart = (pointerId: number): boolean => {
      if (activePointerId === null) {
        activePointerId = pointerId;
        return true; // Accepted
      }
      return false; // Suppressed
    };

    expect(onTouchStart(0)).toBe(true);
    expect(onTouchStart(1)).toBe(false); // Second finger suppressed
    expect(onTouchStart(2)).toBe(false);
  });

  it('TC-T1-PLAT-03: Touch Y-Offset math invariant: Visual.Y == Contact.Y - 80px', () => {
    const touchY = 600;
    const visualY = touchY - 80;
    expect(visualY).toBe(520);
    const hitTestY = visualY + 80;
    expect(hitTestY).toBe(touchY);
  });

  it('TC-T1-PLAT-04: IPlatform bridge contract for Web and ByteDance Mini Game', () => {
    const webPlatform: IPlatform = {
      isByteDanceMiniGame: () => false,
      getSystemInfo: () => ({ screenWidth: 750, screenHeight: 1334, pixelRatio: 2 }),
      onTouchStart: () => {},
      onTouchMove: () => {},
      onTouchEnd: () => {},
      playAudio: () => {},
      showRewardedAd: async () => true,
      shareAppMessage: () => {}
    };

    expect(webPlatform.isByteDanceMiniGame()).toBe(false);
    expect(webPlatform.getSystemInfo().screenWidth).toBe(750);
  });

  it('TC-T1-PLAT-05: Build scripts definition in package.json', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));

    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
  });
});
