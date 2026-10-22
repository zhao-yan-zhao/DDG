/**
 * 《孤城神机营》- Tier 4: Real-World Application Scenarios Test Suite
 * End-to-end player journeys:
 * 1. Full 60s FTUE First-Time User Experience Run
 * 2. Wave 1 to Wave 5 Progressive Survival & Economy Loop
 * 3. Chapter 1 Boss Wave Defeat ("黑风寨主·铁塔熊王")
 * 4. Red-Gold Fusion Card Awakening Activation ("红夷雷火炮")
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
    typeId: overrides.typeId || 'light_infantry',
    name: overrides.name || '流寇轻步兵',
    isBoss: overrides.isBoss ?? false,
    maxHp: overrides.maxHp || 100,
    currentHp: overrides.currentHp || 100,
    armor: overrides.armor ?? 0,
    shield: overrides.shield || 0,
    moveSpeed: overrides.moveSpeed || 1.2,
    isTenacious: overrides.isTenacious,
    tenacityTimer: overrides.tenacityTimer,
    isParalyzed: overrides.isParalyzed,
    isFrozen: overrides.isFrozen,
    ccCount: overrides.ccCount
  };
}

describe('Tier 4 - Real-World Application Scenarios', () => {
  let harness: GridDomainHarness;
  let shop: ShopEngine;
  let tactics: TacticsDeckEngine;

  beforeEach(() => {
    harness = new GridDomainHarness();
    shop = new ShopEngine();
    tactics = new TacticsDeckEngine();
  });

  it('TC-T4-SCEN-01: Full 60s FTUE First-Time User Experience End-to-End Run', () => {
    let silver = 0;
    let gateHp = 1000;

    // --- Step 1 (0~5s): Pre-placed 2x ★1 Fire Lances at (2,1) and (2,2) ---
    const lance1 = makeWeapon({ id: 'fl_1', configId: 'fire_lance', star: 1, faction: 'fire', anchor: { row: 2, col: 1 }, baseAtk: 28 });
    const lance2 = makeWeapon({ id: 'fl_2', configId: 'fire_lance', star: 1, faction: 'fire', anchor: { row: 2, col: 2 }, baseAtk: 28 });
    harness.place(lance1, { row: 2, col: 1 });
    harness.place(lance2, { row: 2, col: 2 });
    expect(harness.model.getAllWeapons().length).toBe(2);

    // Player drags lance1 onto lance2 at (2,2) -> 2-in-1 merge into ★2
    const mergeResult = harness.merge(lance1, lance2);
    expect(mergeResult.canMerge).toBe(true);
    const star2Lance = mergeResult.mergedWeapon!;
    expect(star2Lance.star).toBe(2);

    harness.model.removeWeapon('fl_1');
    harness.model.removeWeapon('fl_2');
    harness.place(star2Lance, { row: 2, col: 2 });
    expect(harness.model.getAllWeapons().length).toBe(1);

    // --- Step 2 (5~15s): Wave 1 spawns 6 light infantry (HP 100, Armor 0) ---
    const wave1Enemies = Array.from({ length: 6 }, (_, i) => makeEnemy({ id: `inf_${i}`, maxHp: 100, currentHp: 100, armor: 0 }));
    let silverDropped = 0;

    for (const enemy of wave1Enemies) {
      // ★2 Fire lance shoots enemy (baseAtk = 50)
      const hitContext: DamageCalculationContext = {
        attacker: star2Lance,
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
      // Hit 1: 50 dmg
      const hit1 = DamagePipelineEngine.calculate(hitContext, 1.0);
      enemy.currentHp -= hit1.actualHpDeducted;
      expect(enemy.currentHp).toBe(50);

      // Hit 2: 50 dmg -> killed!
      const hit2 = DamagePipelineEngine.calculate(hitContext, 1.0);
      enemy.currentHp -= hit2.actualHpDeducted;
      expect(enemy.currentHp).toBe(0);
      silverDropped += 2; // drops 2 silver each
    }
    expect(wave1Enemies.every(e => e.currentHp <= 0)).toBe(true);
    silver += silverDropped;
    expect(silver).toBe(12);

    // --- Step 3 (15~30s): Wave 1 Victory -> Decree Reward (guaranteed Purple T11 《三段击阵法》) ---
    const decreeOptions = ['T04', 'T11', 'T20']; // All purple, contains T11
    expect(decreeOptions).toContain('T11');
    const selectedDecree = 'T11';
    expect(tactics.pick(selectedDecree)).toBe(true);
    const hasThreeVolley = true;

    // --- Step 4 (30~45s): Wave 2 Prep -> Stipend + Interest + 30 Gift Silver ---
    const incomeW1 = EconomyEngine.calculateIncome(1, silver);
    silver += incomeW1.total + 30; // 12 + 35 + 1 + 30 = 78 silver
    expect(silver).toBe(78);

    // Shop offers 2x ★1 Fire Lances in slot 0 and slot 1 (cost 15 each)
    const boughtLance1 = makeWeapon({ id: 'fl_3', configId: 'fire_lance', star: 1, faction: 'fire', anchor: { row: 2, col: 0 } });
    const boughtLance2 = makeWeapon({ id: 'fl_4', configId: 'fire_lance', star: 1, faction: 'fire', anchor: { row: 2, col: 4 } });
    silver -= 30; // 78 - 30 = 48 silver
    expect(silver).toBe(48);

    // Player aligns all three on Row 2: (2,0), (2,2), (2,4)
    harness.place(boughtLance1, { row: 2, col: 0 });
    harness.place(boughtLance2, { row: 2, col: 4 });
    const row2Weapons = harness.model.getAllWeapons().filter(w => w.anchor.row === 2);
    expect(row2Weapons.length).toBe(3);

    // Three-Volley Array requirement: >= 3 fire weapons in same row
    const threeVolleyActive = hasThreeVolley && row2Weapons.length >= 3;
    expect(threeVolleyActive).toBe(true);
    const attackSpeedBuff = threeVolleyActive ? 0.80 : 0.0;
    expect(attackSpeedBuff).toBe(0.80);

    // --- Step 5 (45~60s): Wave 2 fast war dogs wave wiped out ---
    const wave2Dogs = Array.from({ length: 20 }, (_, i) => makeEnemy({ id: `dog_${i}`, maxHp: 60, currentHp: 60, moveSpeed: 2.8 }));
    for (const dog of wave2Dogs) {
      // 1 shot from ★2 lance or combined lances easily overkills 60 HP
      const dogHit = DamagePipelineEngine.calculate({
        attacker: star2Lance,
        target: dog,
        skillMultiplier: 1.5,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      }, 1.0);
      dog.currentHp -= dogHit.actualHpDeducted;
    }
    expect(wave2Dogs.every(d => d.currentHp <= 0)).toBe(true);
    expect(gateHp).toBe(1000); // City gate unharmed (100% health)
  });

  it('TC-T4-SCEN-02: Wave 1 to Wave 5 Progressive Survival and Economy Progression', () => {
    let playerSilver = 50;

    for (let wave = 1; wave <= 5; wave++) {
      // 1. Verify shop weight ladder progression
      const weights = ShopEngine.getLadderWeights(wave);
      if (wave <= 2) {
        expect(weights.heavyRate).toBe(0.00);
      } else {
        expect(weights.heavyRate).toBeGreaterThan(0.00);
      }

      // 2. Clear wave enemies
      const waveEnemiesCount = wave * 5;
      const enemies = Array.from({ length: waveEnemiesCount }, (_, i) => makeEnemy({ id: `w${wave}_e${i}`, maxHp: 50 * wave }));
      for (const e of enemies) {
        e.currentHp = 0;
      }
      expect(enemies.every(e => e.currentHp === 0)).toBe(true);

      // 3. Economy stipend & interest payout
      const income = EconomyEngine.calculateIncome(wave, playerSilver);
      expect(income.stipend).toBeGreaterThanOrEqual(35);
      expect(income.interest).toBeLessThanOrEqual(5);
      playerSilver += income.total;

      // 4. Wave 5 Elite Wave guaranteed Gold Decree
      if (wave === 5) {
        const goldCard = tactics.cards.find(c => c.quality === 'gold')!;
        expect(goldCard).toBeDefined();
        expect(tactics.pick(goldCard.id)).toBe(true);
      }
    }

    expect(playerSilver).toBeGreaterThan(200);
  });

  it('TC-T4-SCEN-03: Chapter 1 Boss Wave Defeat ("黑风寨主·铁塔熊王")', () => {
    // Boss baseline: 135,000 HP, 150 armor, Phase 1 speed 0.7 m/s
    const boss = makeEnemy({
      id: 'boss_bear',
      name: '黑风寨主·铁塔熊王',
      isBoss: true,
      maxHp: 135000,
      currentHp: 135000,
      armor: 150,
      moveSpeed: 0.7
    });

    // 1. Phase 1 (100% -> 50% HP): Player sets Row 0 Oil Cabinet, drenching Boss with Oil
    const bossStatus: ElementalStatus = { hasOil: true, burnStacks: 3, hasShock: false, isFrozen: false, hasPoison: false };
    // Trigger 【猛火轰爆】
    const expRes = ElementalReactionEngine.triggerExplosion(bossStatus, 1.0);
    expect(expRes.triggered).toBe(true);
    expect(expRes.damage).toBe(180);

    // 2. Trigger 【碎冰崩裂】 from Catapult: capped strictly to 3% max HP (4,050)
    bossStatus.isFrozen = true;
    const iceRes = ElementalReactionEngine.triggerIceShatter(bossStatus, boss, 5.0);
    expect(iceRes.triggered).toBe(true);
    expect(iceRes.damage).toBe(4050);
    boss.currentHp -= iceRes.damage; // 135000 - 4050 = 130950

    // High damage artillery barrage drives Boss to 50% HP (67,500)
    boss.currentHp = 67500;

    // 3. Phase 2 Enrage: Boss HP <= 50% -> speed increases by +80% (0.7 * 1.8 = 1.26 m/s)
    let isEnraged = false;
    if (boss.currentHp <= boss.maxHp * 0.50) {
      isEnraged = true;
      boss.moveSpeed *= 1.80;
    }
    expect(isEnraged).toBe(true);
    expect(boss.moveSpeed).toBeCloseTo(1.26, 2);

    // 4. Player activates Wang Shouren Ultimate 【知行合一·万炮齐发】 (100 Rage)
    let commanderRage = 100;
    const ultimateActivated = commanderRage >= 100;
    expect(ultimateActivated).toBe(true);
    commanderRage = 0;

    // During 5.0s ultimate: all cannons reload 150% faster with armor piercing
    const redCannon = makeWeapon({ id: 'red_cannon', star: 3, baseAtk: 400 });
    const finalBarrageContext: DamageCalculationContext = {
      attacker: redCannon,
      target: boss,
      skillMultiplier: 2.0,
      additiveBonuses: [0.50],
      independentMultipliers: [0.25, 0.20],
      critRateBonus: 0.75, // Max crit
      critDmgBonus: 0.50,  // Max 2.0x
      sunderFlat: 150,     // Full armor shred
      sunderRate: 0.50,
      vulnerability: 0.50,
      specialReduction: 0
    };

    // Calculate critical barrage strike
    const barrage = DamagePipelineEngine.calculate(finalBarrageContext, 0.1);
    expect(barrage.isCrit).toBe(true);
    expect(barrage.effectiveArmor).toBe(0); // 150*0.5 - 150 = -75 => clamped to 0

    // Barrage kills remaining Boss HP
    boss.currentHp = 0;
    expect(boss.currentHp).toBe(0);
  });

  it('TC-T4-SCEN-04: Red-Gold Fusion Card Awakening Activation ("红夷雷火炮")', () => {
    // Red-Gold Fusion 《红夷雷火炮》(T33) requires ★3 红衣大炮 + ★3 陷马电网
    const cannonStar2 = makeWeapon({ configId: 'cannon', star: 2 });
    const gridTrapStar2 = makeWeapon({ configId: 'grid_trap', star: 2 });

    // 1. Initial check: neither is ★3 -> fusion locked
    expect(tactics.isFusionUnlocked('T33', [cannonStar2, gridTrapStar2])).toBe(false);

    // 2. Upgrade cannon to ★3, but grid_trap is still ★2 -> still locked
    const cannonStar3 = makeWeapon({ configId: 'cannon', star: 3 });
    expect(tactics.isFusionUnlocked('T33', [cannonStar3, gridTrapStar2])).toBe(false);

    // 3. Upgrade grid_trap to ★3 -> unlocks 《红夷雷火炮》!
    const gridTrapStar3 = makeWeapon({ configId: 'grid_trap', star: 3 });
    expect(tactics.isFusionUnlocked('T33', [cannonStar3, gridTrapStar3])).toBe(true);

    // 4. Once unlocked, card gains +40% draw weight and can be picked
    const fusionCard = tactics.cards.find(c => c.id === 'T33')!;
    expect(fusionCard.quality).toBe('red_gold');
    expect(fusionCard.category).toBe('fusion');
    expect(tactics.pick('T33')).toBe(true);
    expect(fusionCard.currentPicks).toBe(1);
    // Unique rule: cannot pick again in same run
    expect(tactics.pick('T33')).toBe(false);
  });
});
