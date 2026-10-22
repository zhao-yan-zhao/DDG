import { describe, it, expect, beforeEach } from 'vitest';
import {
  TacticsDeck,
  SmartWeightEngine,
  FusionUnlockEngine,
  AffixMountEngine,
  getTacticCardConfig,
  getAllTacticCards,
  TACTICS_CONFIG
} from '../src/core/types';
import { WeaponInstance, EnemyEntity, Faction } from '../src/core/types';

describe('36 Roguelike Tactics Test Suite (Milestone M5)', () => {
  let deck: TacticsDeck;

  const createWeapon = (
    id: string,
    configId: string,
    star: 1 | 2 | 3 | 4,
    faction: Faction,
    width: number = 1,
    height: number = 1,
    row: number = 0,
    col: number = 0
  ): WeaponInstance => ({
    id,
    configId,
    name: '测试军械',
    star,
    faction,
    footprint: { width, height },
    anchor: { row, col },
    isFortressOnly: false,
    baseAtk: 100,
    attackInterval: 1.0,
    range: 10.0
  });

  const createEnemy = (hp: number = 1000, armor: number = 50): EnemyEntity => ({
    id: 'e1',
    typeId: 'normal',
    name: '测试敌军',
    isBoss: false,
    maxHp: hp,
    currentHp: hp,
    armor,
    shield: 0,
    moveSpeed: 1.0
  });

  beforeEach(() => {
    deck = new TacticsDeck();
  });

  // =========================================================================
  // TC-TAC-01 ~ TC-TAC-05: Catalog Integrity & Pick Limits
  // =========================================================================

  it('TC-TAC-01: Complete 36 cards catalog verification across 5 categories', () => {
    const all = deck.getAllCards();
    expect(all.length).toBe(36);

    const generals = all.filter(c => c.category === 'general');
    const fires = all.filter(c => c.category === 'fire');
    const mohists = all.filter(c => c.category === 'mohist');
    const fortresses = all.filter(c => c.category === 'fortress');
    const fusions = all.filter(c => c.category === 'fusion');

    expect(generals.length).toBe(8);
    expect(fires.length).toBe(8);
    expect(mohists.length).toBe(8);
    expect(fortresses.length).toBe(8);
    expect(fusions.length).toBe(4);
  });

  it('TC-TAC-02: Quality distribution verification (9 Blue, 12 Purple, 11 Gold, 4 Red-Gold)', () => {
    const all = deck.getAllCards();
    const blue = all.filter(c => c.quality === 'blue');
    const purple = all.filter(c => c.quality === 'purple');
    const gold = all.filter(c => c.quality === 'gold');
    const redGold = all.filter(c => c.quality === 'red_gold');

    expect(blue.length).toBe(9);
    expect(purple.length).toBe(12);
    expect(gold.length).toBe(11);
    expect(redGold.length).toBe(4);
  });

  it('TC-TAC-03: 33 single-pick cards constraint (max 1 pick per run)', () => {
    const singlePickCards = deck.getAllCards().filter(c => c.maxPicksPerRun === 1);
    expect(singlePickCards.length).toBe(33);

    // Test with T11 《三段击阵法》
    expect(deck.canPick('T11')).toBe(true);
    expect(deck.pick('T11')).toBe(true);
    expect(deck.getPicks('T11')).toBe(1);
    expect(deck.canPick('T11')).toBe(false);
    expect(deck.pick('T11')).toBe(false);

    // Test with T03 《精兵简政》
    expect(deck.canPick('T03')).toBe(true);
    expect(deck.pick('T03')).toBe(true);
    expect(deck.canPick('T03')).toBe(false);
  });

  it('TC-TAC-04: Exactly 3 double-pick cards constraint (T01, T02, T07 max 2 picks)', () => {
    const doublePickCards = deck.getAllCards().filter(c => c.maxPicksPerRun === 2);
    expect(doublePickCards.length).toBe(3);
    const doublePickIds = doublePickCards.map(c => c.id).sort();
    expect(doublePickIds).toEqual(['T01', 'T02', 'T07']);

    // Pick T01 twice
    expect(deck.canPick('T01')).toBe(true);
    expect(deck.pick('T01')).toBe(true);
    expect(deck.canPick('T01')).toBe(true);
    expect(deck.pick('T01')).toBe(true);
    expect(deck.getPicks('T01')).toBe(2);
    expect(deck.canPick('T01')).toBe(false);
    expect(deck.pick('T01')).toBe(false);

    // Pick T02 twice
    expect(deck.pick('T02')).toBe(true);
    expect(deck.pick('T02')).toBe(true);
    expect(deck.pick('T02')).toBe(false);

    // Pick T07 twice
    expect(deck.pick('T07')).toBe(true);
    expect(deck.pick('T07')).toBe(true);
    expect(deck.pick('T07')).toBe(false);
  });

  it('TC-TAC-05: Pick exhausted cards are excluded from subsequent candidate draws', () => {
    // Pick T11 to exhaustion
    deck.pick('T11');

    // Draw 100 times for wave 1
    for (let i = 0; i < 50; i++) {
      const candidates = deck.drawCandidates({ wave: 1, weaponsOnGrid: [] });
      const ids = candidates.map(c => c.id);
      expect(ids).not.toContain('T11');
    }
  });

  // =========================================================================
  // TC-TAC-06 ~ TC-TAC-11: Smart Faction Weighting Engine
  // =========================================================================

  it('TC-TAC-06: Dominant faction receives 1.85x appearance weight', () => {
    const weapons: WeaponInstance[] = [
      createWeapon('w1', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('w2', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('w3', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('w4', 'repeating_crossbow', 1, 'mohist', 1, 1)
    ];

    const analysis = SmartWeightEngine.analyzeBoard(weapons);
    expect(analysis.dominantFaction).toBe('fire');
    expect(analysis.areaMap.fire).toBe(3);
    expect(analysis.areaMap.mohist).toBe(1);

    const fireCard = getTacticCardConfig('T09')!;
    const weight = SmartWeightEngine.calculateWeight(fireCard, analysis);
    expect(weight).toBeCloseTo(185, 2); // 100 * 1.85
  });

  it('TC-TAC-07: Absent faction cards are suppressed to 0.15x appearance weight', () => {
    const weapons: WeaponInstance[] = [
      createWeapon('w1', 'fire_lance', 1, 'fire', 1, 1)
    ];

    const analysis = SmartWeightEngine.analyzeBoard(weapons);
    expect(analysis.absentFactions).toContain('fortress');

    const fortressCard = getTacticCardConfig('T25')!;
    const weight = SmartWeightEngine.calculateWeight(fortressCard, analysis);
    expect(weight).toBeCloseTo(15, 2); // 100 * 0.15
  });

  it('TC-TAC-08: Neutral general cards always maintain 1.00x appearance weight', () => {
    const weapons: WeaponInstance[] = [
      createWeapon('w1', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('w2', 'fire_lance', 1, 'fire', 1, 1)
    ];

    const analysis = SmartWeightEngine.analyzeBoard(weapons);
    const generalCard = getTacticCardConfig('T01')!;
    const weight = SmartWeightEngine.calculateWeight(generalCard, analysis);
    expect(weight).toBeCloseTo(100, 2); // 100 * 1.00
  });

  it('TC-TAC-09: Present non-dominant factions maintain 1.00x appearance weight', () => {
    const weapons: WeaponInstance[] = [
      createWeapon('w1', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('w2', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('w3', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('w4', 'repeating_crossbow', 1, 'mohist', 1, 1),
      createWeapon('w5', 'repeating_crossbow', 1, 'mohist', 1, 1)
    ];

    const analysis = SmartWeightEngine.analyzeBoard(weapons);
    expect(analysis.dominantFaction).toBe('fire');
    expect(analysis.presentFactions).toContain('mohist');

    const mohistCard = getTacticCardConfig('T17')!;
    const weight = SmartWeightEngine.calculateWeight(mohistCard, analysis);
    expect(weight).toBeCloseTo(100, 2); // 100 * 1.00
  });

  it('TC-TAC-10: Completely empty board edge case suppresses all factions to 0.15x while general stays 1.00x', () => {
    const analysis = SmartWeightEngine.analyzeBoard([]);
    expect(analysis.dominantFaction).toBeNull();
    expect(analysis.absentFactions.length).toBe(4);

    const generalCard = getTacticCardConfig('T01')!;
    const fireCard = getTacticCardConfig('T09')!;

    expect(SmartWeightEngine.calculateWeight(generalCard, analysis)).toBeCloseTo(100, 2);
    expect(SmartWeightEngine.calculateWeight(fireCard, analysis)).toBeCloseTo(15, 2);
  });

  it('TC-TAC-11: Multi-grid footprint correctly accounts for cell area in dominant calculation', () => {
    // One 2×2 Catapult (Mohist, 4 cells) vs three 1×1 Fire Lance (Fire, 3 cells)
    const weapons: WeaponInstance[] = [
      createWeapon('cat_1', 'catapult', 1, 'mohist', 2, 2),
      createWeapon('fl_1', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('fl_2', 'fire_lance', 1, 'fire', 1, 1),
      createWeapon('fl_3', 'fire_lance', 1, 'fire', 1, 1)
    ];

    const analysis = SmartWeightEngine.analyzeBoard(weapons);
    expect(analysis.areaMap.mohist).toBe(4);
    expect(analysis.areaMap.fire).toBe(3);
    expect(analysis.dominantFaction).toBe('mohist'); // 4 cells > 3 cells
  });

  // =========================================================================
  // TC-TAC-12 ~ TC-TAC-19: Red-Gold Fusion Unlock Engine
  // =========================================================================

  it('TC-TAC-12: T33 《红夷雷火炮》 unlock conditions (★3 Red Cannon + ★3 Electric Grid and aliases)', () => {
    // Both ★2 -> locked
    expect(FusionUnlockEngine.isFusionUnlocked('T33', [
      createWeapon('c1', 'red_cannon', 2, 'fire'),
      createWeapon('g1', 'electric_grid', 2, 'fortress')
    ])).toBe(false);

    // One ★3, other ★2 -> locked
    expect(FusionUnlockEngine.isFusionUnlocked('T33', [
      createWeapon('c1', 'red_cannon', 3, 'fire'),
      createWeapon('g1', 'electric_grid', 2, 'fortress')
    ])).toBe(false);

    // Both ★3 -> unlocked
    expect(FusionUnlockEngine.isFusionUnlocked('T33', [
      createWeapon('c1', 'red_cannon', 3, 'fire'),
      createWeapon('g1', 'electric_grid', 3, 'fortress')
    ])).toBe(true);

    // Test with aliases: cannon + grid_trap
    expect(FusionUnlockEngine.isFusionUnlocked('T33', [
      createWeapon('c1', 'cannon', 3, 'fire'),
      createWeapon('g1', 'grid_trap', 3, 'fortress')
    ])).toBe(true);
  });

  it('TC-TAC-13: T34 《暴雨火箭车》 unlock conditions (★3 Repeating Crossbow + ★3 Rocket Box)', () => {
    expect(FusionUnlockEngine.isFusionUnlocked('T34', [
      createWeapon('rc', 'repeating_crossbow', 3, 'mohist'),
      createWeapon('rb', 'rocket_box', 3, 'fire')
    ])).toBe(true);
  });

  it('TC-TAC-14: T35 《铁浮屠火牛阵》 unlock conditions (★3 Spear Camp + ★3 Oil Cabinet)', () => {
    expect(FusionUnlockEngine.isFusionUnlocked('T35', [
      createWeapon('sc', 'spear_camp', 3, 'fortress'),
      createWeapon('oc', 'oil_cabinet', 3, 'fortress')
    ])).toBe(true);
  });

  it('TC-TAC-15: T36 《九天星陨石》 unlock conditions (★3 Catapult + ★3 Stargazer)', () => {
    expect(FusionUnlockEngine.isFusionUnlocked('T36', [
      createWeapon('cat', 'catapult', 3, 'mohist', 2, 2),
      createWeapon('sg', 'stargazer', 3, 'qimen')
    ])).toBe(true);
  });

  it('TC-TAC-16: Star level >= 3 boundary check (★4 satisfies requirement)', () => {
    expect(FusionUnlockEngine.isFusionUnlocked('T33', [
      createWeapon('c1', 'red_cannon', 4, 'fire'),
      createWeapon('g1', 'electric_grid', 3, 'fortress')
    ])).toBe(true);
  });

  it('TC-TAC-17: Sibling isolation: unlocking T33 does not unlock T34, T35, T36', () => {
    const weapons = [
      createWeapon('c1', 'red_cannon', 3, 'fire'),
      createWeapon('g1', 'electric_grid', 3, 'fortress')
    ];
    expect(FusionUnlockEngine.isFusionUnlocked('T33', weapons)).toBe(true);
    expect(FusionUnlockEngine.isFusionUnlocked('T34', weapons)).toBe(false);
    expect(FusionUnlockEngine.isFusionUnlocked('T35', weapons)).toBe(false);
    expect(FusionUnlockEngine.isFusionUnlocked('T36', weapons)).toBe(false);
  });

  it('TC-TAC-18: Locked fusion card weight is 0 and excluded from candidate draws', () => {
    const analysis = SmartWeightEngine.analyzeBoard([]);
    const t33 = getTacticCardConfig('T33')!;

    const weightLocked = SmartWeightEngine.calculateWeight(t33, analysis, false);
    expect(weightLocked).toBe(0);

    // Verify absent in candidate draws
    for (let i = 0; i < 20; i++) {
      const candidates = deck.drawCandidates({ wave: 10, weaponsOnGrid: [] });
      const ids = candidates.map(c => c.id);
      expect(ids).not.toContain('T33');
      expect(ids).not.toContain('T34');
      expect(ids).not.toContain('T35');
      expect(ids).not.toContain('T36');
    }
  });

  it('TC-TAC-19: Unlocked fusion card receives +40% (1.40x) targeted appearance weight', () => {
    const analysis = SmartWeightEngine.analyzeBoard([]);
    const t33 = getTacticCardConfig('T33')!;

    const weightUnlocked = SmartWeightEngine.calculateWeight(t33, analysis, true);
    expect(weightUnlocked).toBeCloseTo(140, 2); // 100 * 1.40
  });

  // =========================================================================
  // TC-TAC-20 ~ TC-TAC-25: Candidate Draws & Quality Guarantees
  // =========================================================================

  it('TC-TAC-20: Candidate uniqueness (always 3 distinct cards per draw)', () => {
    for (let i = 0; i < 30; i++) {
      const candidates = deck.drawCandidates({ wave: 3, weaponsOnGrid: [] });
      expect(candidates.length).toBe(3);
      const idSet = new Set(candidates.map(c => c.id));
      expect(idSet.size).toBe(3); // strictly distinct
    }
  });

  it('TC-TAC-21: Wave 1 guarantee: exactly 3 Purple cards', () => {
    for (let i = 0; i < 20; i++) {
      const candidates = deck.drawCandidates({ wave: 1, weaponsOnGrid: [] });
      expect(candidates.length).toBe(3);
      for (const card of candidates) {
        expect(card.quality).toBe('purple');
      }
    }
  });

  it('TC-TAC-22: FTUE Wave 1 guarantee: Slot 0 is strictly T11 (《三段击阵法》)', () => {
    for (let i = 0; i < 10; i++) {
      const d = new TacticsDeck();
      const candidates = d.drawCandidates({ wave: 1, weaponsOnGrid: [], isFtue: true });
      expect(candidates[0].id).toBe('T11');
      expect(candidates[0].quality).toBe('purple');
      expect(candidates[1].quality).toBe('purple');
      expect(candidates[2].quality).toBe('purple');
    }
  });

  it('TC-TAC-23: Wave 5 guarantee: at least 1 Gold card', () => {
    for (let i = 0; i < 20; i++) {
      const candidates = deck.drawCandidates({ wave: 5, weaponsOnGrid: [] });
      expect(candidates.length).toBe(3);
      const goldCount = candidates.filter(c => c.quality === 'gold').length;
      expect(goldCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('TC-TAC-24: Wave 10 guarantee: at least 2 Gold or Red-Gold cards', () => {
    const dualStar3Weapons = [
      createWeapon('c1', 'red_cannon', 3, 'fire'),
      createWeapon('g1', 'electric_grid', 3, 'fortress')
    ];

    for (let i = 0; i < 20; i++) {
      const candidates = deck.drawCandidates({ wave: 10, weaponsOnGrid: dualStar3Weapons });
      expect(candidates.length).toBe(3);
      const highTierCount = candidates.filter(
        c => c.quality === 'gold' || c.quality === 'red_gold'
      ).length;
      expect(highTierCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('TC-TAC-25: Deterministic PRNG reproducibility', () => {
    const seedRng = () => 0.42;
    const draw1 = deck.drawCandidates({ wave: 3, weaponsOnGrid: [], rng: seedRng });

    const deck2 = new TacticsDeck();
    const seedRng2 = () => 0.42;
    const draw2 = deck2.drawCandidates({ wave: 3, weaponsOnGrid: [], rng: seedRng2 });

    expect(draw1.map(c => c.id)).toEqual(draw2.map(c => c.id));
  });

  // =========================================================================
  // AffixMountEngine Combat Integration & Protection Valves
  // =========================================================================

  describe('AffixMountEngine Dynamic Calculations & Clamping', () => {
    let affix: AffixMountEngine;

    beforeEach(() => {
      affix = new AffixMountEngine();
    });

    it('T14 (神机百炼): calculates silver/10*3% capped at 300 silver (+90%)', () => {
      affix.mountCard('T14');
      const weapon = createWeapon('fl_1', 'fire_lance', 1, 'fire');

      // 120 silver -> 12 * 3% = 36%
      const bonuses120 = affix.getAdditiveDamageBonuses(weapon, { currentSilver: 120 });
      expect(bonuses120).toEqual([0.36]);

      // 500 silver -> capped at 300 silver (30 * 3% = 90%)
      const bonuses500 = affix.getAdditiveDamageBonuses(weapon, { currentSilver: 500 });
      expect(bonuses500).toEqual([0.90]);
    });

    it('T30 (固若金汤): converts 25% of max wall HP to flat ATK', () => {
      affix.mountCard('T30');
      const flat = affix.getFlatAtkBonus({ wallMaxHp: 1200 });
      expect(flat).toBe(300); // 1200 * 0.25 = 300
    });

    it('T11 (三段击阵法): horizontal row >= 3 fire weapons grants +80% ASPD', () => {
      affix.mountCard('T11');
      const placed = [
        createWeapon('fl_1', 'fire_lance', 1, 'fire', 1, 1, 1, 0),
        createWeapon('fl_2', 'fire_lance', 1, 'fire', 1, 1, 1, 1),
        createWeapon('fl_3', 'fire_lance', 1, 'fire', 1, 1, 1, 2)
      ];

      const aspdBonus = affix.getAttackSpeedBonus(placed[0], { placedWeapons: placed });
      expect(aspdBonus).toBe(0.80);
    });

    it('T31 (元素乱流): triggers rage +8 and stacks ASPD +5% up to 10 stacks (50% max)', () => {
      affix.mountCard('T31');
      const weapon = createWeapon('w1', 'fire_lance', 1, 'fire');

      for (let i = 1; i <= 12; i++) {
        const res = affix.onReaction();
        expect(res.rageGained).toBe(8);
      }
      expect(affix.getTurbulenceStacks()).toBe(10); // clamped at 10

      const aspdBonus = affix.getAttackSpeedBonus(weapon);
      expect(aspdBonus).toBe(0.50); // 10 * 5% = 50%
    });

    it('T32 (阵列同心): 1x1 weapon surrounded on all 4 orthogonal sides gains +100% ATK & +50% ASPD', () => {
      affix.mountCard('T32');
      const center = createWeapon('center', 'fire_lance', 1, 'fire', 1, 1, 2, 2);
      const up = createWeapon('up', 'fire_lance', 1, 'fire', 1, 1, 1, 2);
      const down = createWeapon('down', 'fire_lance', 1, 'fire', 1, 1, 3, 2);
      const left = createWeapon('left', 'fire_lance', 1, 'fire', 1, 1, 2, 1);
      const right = createWeapon('right', 'fire_lance', 1, 'fire', 1, 1, 2, 3);

      const matrix: (WeaponInstance | null)[][] = Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => null)
      );
      matrix[2][2] = center;
      matrix[1][2] = up;
      matrix[3][2] = down;
      matrix[2][1] = left;
      matrix[2][3] = right;

      const atkBonus = affix.getAdditiveDamageBonuses(center, { gridMatrix: matrix });
      expect(atkBonus).toContain(1.00);

      const aspdBonus = affix.getAttackSpeedBonus(center, { gridMatrix: matrix });
      expect(aspdBonus).toBe(0.50);
    });

    it('Safety Clamps: additive <= 1.50, independent <= 3 gates at 0.25, crit <= 0.75, interval >= 0.10s', () => {
      expect(affix.clampAdditive([0.5, 0.6, 0.8])).toBe(1.50);
      expect(affix.clampIndependent([0.30, 0.40, 0.50, 0.60])).toEqual([0.25, 0.25, 0.25]);
      expect(affix.clampCritRate(0.95)).toBe(0.75);
      expect(affix.clampCritDmg(2.50)).toBe(2.00);
      expect(affix.calculateEffectiveInterval(1.0, 20.0)).toBe(0.10); // clamped to 0.10s floor
      expect(affix.clampDamage(0.2)).toBe(1.0);
    });
  });
});
