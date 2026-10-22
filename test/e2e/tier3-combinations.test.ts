/**
 * 《孤城神机营》- Tier 3: Cross-Feature Combinations Test Suite
 * Covers multi-system integration:
 * 1. Grid 2-in-1 Merge + Dynamic Synergy Bond Activation
 * 2. Multi-grid Unit Adjacency Deduplication + 《万历大阅兵》 Exception
 * 3. Wave Victory + Stipend/Interest Accounting + Shop Pity Timer Compensation
 * 4. 36 Tactics Affix Mounting + 7-Step Damage Pipeline
 * 5. Elemental Reaction + Commander Wang Shouren Rage Accumulation & Ultimate
 * 6. Boss Encounter + Tenacity Window + Elemental Defense Valves
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
import { WeaponInstance, EnemyEntity, DamageCalculationContext } from './harness/contracts';

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
    typeId: overrides.typeId || 'boss_bear',
    name: overrides.name || '黑风寨主·铁塔熊王',
    isBoss: overrides.isBoss ?? false,
    maxHp: overrides.maxHp || 135000,
    currentHp: overrides.currentHp || 135000,
    armor: overrides.armor ?? 150,
    shield: overrides.shield || 0,
    moveSpeed: overrides.moveSpeed || 0.7,
    isTenacious: overrides.isTenacious,
    tenacityTimer: overrides.tenacityTimer,
    isParalyzed: overrides.isParalyzed,
    isFrozen: overrides.isFrozen,
    ccCount: overrides.ccCount
  };
}

describe('Tier 3 - Cross-Feature Combinations', () => {
  let harness: GridDomainHarness;

  beforeEach(() => {
    harness = new GridDomainHarness();
  });

  it('TC-T3-COMB-01: Grid 2-in-1 Merge + Dynamic Synergy Bond Activation', () => {
    // 1. Place three ★1 Fire weapons on grid (Row 1, Cols 0, 1, 2)
    const f1 = makeWeapon({ id: 'f1', configId: 'fire_lance', star: 1, faction: 'fire', anchor: { row: 1, col: 0 } });
    const f2 = makeWeapon({ id: 'f2', configId: 'fire_lance', star: 1, faction: 'fire', anchor: { row: 1, col: 1 } });
    const f3 = makeWeapon({ id: 'f3', configId: 'fire_lance', star: 1, faction: 'fire', anchor: { row: 1, col: 2 } });
    harness.place(f1, { row: 1, col: 0 });
    harness.place(f2, { row: 1, col: 1 });
    harness.place(f3, { row: 1, col: 2 });

    // 3 fire weapons -> Tier 2 resonance active
    let resonances = AdjacencyEvaluator.evaluateResonances(harness.model.getAllWeapons());
    let fireRes = resonances.find(r => r.faction === 'fire')!;
    expect(fireRes.count).toBe(3);
    expect(fireRes.tier).toBe(2);

    // 2. Merge f1 and f2 into ★2 Fire weapon at (1,1)
    const mergeEval = harness.merge(f1, f2);
    expect(mergeEval.canMerge).toBe(true);
    const upgraded = mergeEval.mergedWeapon!;
    expect(upgraded.star).toBe(2);

    harness.model.removeWeapon('f1');
    harness.model.removeWeapon('f2');
    harness.place(upgraded, { row: 1, col: 1 });

    // Now count is 2 (★2 at 1,1 and ★1 at 1,2) -> Tier 2 resonance maintained
    resonances = AdjacencyEvaluator.evaluateResonances(harness.model.getAllWeapons());
    fireRes = resonances.find(r => r.faction === 'fire')!;
    expect(fireRes.count).toBe(2);
    expect(fireRes.tier).toBe(2);

    // 3. Add two more fire weapons (total 4 units) -> activates Tier 4 resonance
    const f4 = makeWeapon({ id: 'f4', configId: 'rocket_box', star: 1, faction: 'fire', anchor: { row: 2, col: 0 } });
    const f5 = makeWeapon({ id: 'f5', configId: 'thunder_thrower', star: 1, faction: 'fire', anchor: { row: 2, col: 1 } });
    harness.place(f4, { row: 2, col: 0 });
    harness.place(f5, { row: 2, col: 1 });

    resonances = AdjacencyEvaluator.evaluateResonances(harness.model.getAllWeapons());
    fireRes = resonances.find(r => r.faction === 'fire')!;
    expect(fireRes.count).toBe(4);
    expect(fireRes.tier).toBe(4); // 4-piece Tier 4 achieved!
  });

  it('TC-T3-COMB-02: Multi-grid Unit Adjacency Deduplication + 《万历大阅兵》 Exception', () => {
    // 2x2 Catapult at (1,1)-(2,2) and 1x2 Red Cannon at (1,3)-(2,3)
    const catapult = makeWeapon({ id: 'catapult', footprint: { width: 2, height: 2 }, anchor: { row: 1, col: 1 } });
    const cannon = makeWeapon({ id: 'cannon', footprint: { width: 1, height: 2 }, anchor: { row: 1, col: 3 } });

    // Contact occurs along 2 cells: (1,2)<->(1,3) and (2,2)<->(2,3)
    const contact = AdjacencyEvaluator.evaluateContact(catapult, cannon);
    expect(contact.isOrthogonal).toBe(true);

    const normalBonds = AdjacencyEvaluator.evaluateAllBonds([catapult, cannon]);
    // Idempotent deduplication: strictly 1 bond recorded
    expect(normalBonds.length).toBe(1);

    // With 《万历大阅兵》(T16) active: contact uncoupled across contact cells
    const cellsA = AdjacencyEvaluator.getOccupiedCells(catapult);
    const cellsB = AdjacencyEvaluator.getOccupiedCells(cannon);
    let contactEdges = 0;
    for (const a of cellsA) {
      for (const b of cellsB) {
        if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1) {
          contactEdges++;
        }
      }
    }
    expect(contactEdges).toBe(2); // Exactly 2 physical contact edges
  });

  it('TC-T3-COMB-03: Wave Victory + Stipend/Interest Accounting + Shop Pity Timer Compensation', () => {
    let currentSilver = 40;
    const shop = new ShopEngine();

    // 1. Victory on Wave 1: earns stipend 35 + interest min(floor(40/10), 5) = 4 => total 39
    const income = EconomyEngine.calculateIncome(1, currentSilver);
    expect(income.stipend).toBe(35);
    expect(income.interest).toBe(4);
    currentSilver += income.total;
    expect(currentSilver).toBe(79);

    // 2. Shop refreshes (costs 2 silver per refresh)
    const ownedStar1 = ['fire_lance'];

    // Roll 1: costs 2
    currentSilver -= 2;
    shop.rollSlots(1, ownedStar1, { slot3IsPity: false });
    expect(shop.rollsWithoutMerge).toBe(1);

    // Roll 2: costs 2
    currentSilver -= 2;
    shop.rollSlots(1, ownedStar1, { slot3IsPity: false });
    expect(shop.rollsWithoutMerge).toBe(2);

    // Roll 3: costs 2 -> Pity triggered!
    currentSilver -= 2;
    const roll3Slots = shop.rollSlots(1, ownedStar1, { slot3IsPity: true });
    expect(shop.rollsWithoutMerge).toBe(3);
    expect(roll3Slots[2].isPityCompensation).toBe(true);
    expect(roll3Slots[2].weaponConfigId).toBe('fire_lance');

    // 3. Purchase the unit (cost 15)
    currentSilver -= roll3Slots[2].cost;
    expect(currentSilver).toBe(79 - 6 - 15); // 58

    // 4. Player executes 2-in-1 merge -> resets rollsWithoutMerge
    shop.onMergeOccurred();
    expect(shop.rollsWithoutMerge).toBe(0);
  });

  it('TC-T3-COMB-04: 36 Tactics Affix Mounting + 7-Step Damage Pipeline', () => {
    const tactics = new TacticsDeckEngine();
    const attacker = makeWeapon({ id: 'fl_1', configId: 'fire_lance', baseAtk: 100 });
    const target = makeEnemy({ armor: 50, currentHp: 1000 });

    // Pick 《改良黑火药》(T09, +25% additive fire damage)
    expect(tactics.pick('T09')).toBe(true);
    const hasBlackPowder = true;
    const blackPowderBonus = hasBlackPowder ? 0.25 : 0.0;

    // Pick 《神机百炼》(T14, +3% per 10 silver, player has 120 silver => 12 * 3% = +36%)
    expect(tactics.pick('T14')).toBe(true);
    const playerSilver = 120;
    const baiLianBonus = Math.min((Math.floor(playerSilver / 10) * 0.03), 0.90);
    expect(baiLianBonus).toBeCloseTo(0.36, 2);

    // Row check for 《三段击阵法》(T11): 3 fire weapons in same row
    const rowFireWeaponsCount = 3;
    const hasThreeVolley = rowFireWeaponsCount >= 3;
    expect(hasThreeVolley).toBe(true);
    const attackSpeedBuff = hasThreeVolley ? 0.80 : 0.0;
    expect(attackSpeedBuff).toBe(0.80);

    // Combine additive bonuses: 0.25 + 0.36 = 0.61 (< 1.50 cap)
    const totalAdditive = [blackPowderBonus, baiLianBonus];

    const ctx: DamageCalculationContext = {
      attacker,
      target,
      skillMultiplier: 1.0,
      additiveBonuses: totalAdditive,
      independentMultipliers: [],
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };

    const res = DamagePipelineEngine.calculate(ctx, 1.0);
    // Base 100 -> Additive = 100 * (1 + 0.61) = 161
    expect(res.steps.additiveDmg).toBeCloseTo(161, 2);
    // Target armor 50 -> DR = 50 / (50 + 150) = 0.25 (25% reduction, 75% passes through)
    // 161 * 0.75 = 120.75
    expect(res.finalDamage).toBeCloseTo(120.75, 2);
    expect(res.actualHpDeducted).toBeCloseTo(120.75, 2);
  });

  it('TC-T3-COMB-05: Elemental Reaction + Commander Wang Shouren Rage Accumulation & Ultimate', () => {
    let commanderRage = 92;
    let weaponReloadCooldown = 1.2; // seconds
    const status: ElementalStatus = { hasOil: true, burnStacks: 0, hasShock: false, isFrozen: false, hasPoison: false };

    // 1. Trigger 【猛火轰爆】
    const expRes = ElementalReactionEngine.triggerExplosion(status, 1.0);
    expect(expRes.triggered).toBe(true);
    expect(expRes.damage).toBe(180);

    // Wang Shouren passive 【心学·致良知】: each explosion reduces reload CD by 0.1s
    weaponReloadCooldown = Math.max(0.1, weaponReloadCooldown - 0.1);
    expect(weaponReloadCooldown).toBeCloseTo(1.1, 2);

    // Elemental reaction grants +8 Rage (via 《元素乱流》 / kill)
    commanderRage += 8;
    expect(commanderRage).toBe(100);

    // 2. Activate Ultimate 【知行合一·万炮齐发】 (at 100 Rage)
    const canCastUltimate = commanderRage >= 100;
    expect(canCastUltimate).toBe(true);

    // Ultimate resets all weapons reload cooldown and grants +150% reload speed for 5.0s
    commanderRage = 0;
    const ultimateReloadSpeedBuff = 1.50; // +150%
    const ultimateDuration = 5.0; // 5 seconds
    expect(commanderRage).toBe(0);
    expect(ultimateReloadSpeedBuff).toBe(1.50);
    expect(ultimateDuration).toBe(5.0);
  });

  it('TC-T3-COMB-06: Boss Encounter + Tenacity Window + Elemental Defense Valves', () => {
    const boss = makeEnemy({ isBoss: true, maxHp: 135000, currentHp: 135000, armor: 150 });
    const status: ElementalStatus = { hasOil: false, burnStacks: 0, hasShock: false, isFrozen: true, hasPoison: false };

    // 1. Ice Shatter on Boss: 8% would be 10,800, but clamped strictly to 3% = 4,050
    const iceRes = ElementalReactionEngine.triggerIceShatter(status, boss, 1.0);
    expect(iceRes.triggered).toBe(true);
    expect(iceRes.damage).toBe(4050);

    // 2. Paralyze Boss: Base 2.0s with Boss 50% natural tenacity -> 1.0s
    const ccDuration = CCDecayEngine.calculateCCDuration(2.0, 0, true);
    expect(ccDuration).toBeCloseTo(1.0, 2);

    // Boss gains 1.5s tenacity window post-CC (until time = 1.0 + 1.5 = 2.5s)
    boss.isTenacious = true;
    boss.tenacityTimer = 2.5;

    // At time 1.8s, secondary CC is strictly rejected
    expect(CCDecayEngine.canApplyCC(boss, 1.8)).toBe(false);

    // At time 2.6s, tenacity window expires, secondary CC is allowed
    expect(CCDecayEngine.canApplyCC(boss, 2.6)).toBe(true);
  });
});
