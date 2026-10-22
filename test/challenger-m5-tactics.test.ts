import { describe, it, expect, beforeEach } from 'vitest';
import {
  TacticsDeck,
  SmartWeightEngine,
  FusionUnlockEngine,
  AffixMountEngine,
  getTacticCardConfig,
  getAllTacticCards,
  TACTICS_CONFIG,
  DOMINANT_WEIGHT_MULTIPLIER,
  ABSENT_WEIGHT_MULTIPLIER,
  NEUTRAL_WEIGHT_MULTIPLIER,
  FUSION_UNLOCKED_WEIGHT_MULTIPLIER,
  WeaponInstance,
  EnemyEntity,
  Faction,
  DamageCalculationContext
} from '../src/core/types';
import { DamagePipeline } from '../src/core/combat/damage-pipeline';

describe('Adversarial Challenger Suite: M5 Tactics, Weights, Fusion & Clamps', () => {
  let deck: TacticsDeck;
  let affixEngine: AffixMountEngine;

  const createWeapon = (
    id: string,
    configId: string,
    star: 1 | 2 | 3 | 4,
    faction: Faction,
    width: number = 1,
    height: number = 1,
    row: number = 0,
    col: number = 0,
    baseAtk: number = 100
  ): WeaponInstance => ({
    id,
    configId,
    name: '测试军械',
    star,
    faction,
    footprint: { width, height },
    anchor: { row, col },
    isFortressOnly: false,
    baseAtk,
    attackInterval: 1.0,
    range: 10.0
  });

  const createEnemy = (hp: number = 1000, armor: number = 50): EnemyEntity => ({
    id: 'e_adversarial',
    typeId: 'normal',
    name: '测试木桩',
    isBoss: false,
    maxHp: hp,
    currentHp: hp,
    armor,
    shield: 0,
    moveSpeed: 1.0
  });

  const createDamageContext = (
    overrides: Partial<DamageCalculationContext> & { attacker: WeaponInstance; target: EnemyEntity }
  ): DamageCalculationContext => ({
    skillMultiplier: 1.0,
    additiveBonuses: [],
    independentMultipliers: [],
    critRateBonus: 0,
    critDmgBonus: 0,
    sunderFlat: 0,
    sunderRate: 0,
    vulnerability: 0,
    specialReduction: 0,
    ...overrides
  });

  beforeEach(() => {
    deck = new TacticsDeck();
    affixEngine = new AffixMountEngine();
  });

  // =========================================================================
  // 1. 36 Tactics Deck & Pick Limits Adversarial Stress
  // =========================================================================
  describe('1. 36 Tactics Deck & Pick Limits', () => {
    it('TC-ADV-TAC-01: Exhausting all 36 cards to their exact pick limits handles pool exhaustion gracefully without crash', () => {
      const allCards = deck.getAllCards();
      expect(allCards.length).toBe(36);

      // Verify and perform all allowable picks
      let totalPicksPerformed = 0;
      for (const card of allCards) {
        const allowed = card.maxPicksPerRun;
        for (let i = 0; i < allowed; i++) {
          expect(deck.canPick(card.id)).toBe(true);
          const ok = deck.pick(card.id);
          expect(ok).toBe(true);
          totalPicksPerformed++;
        }
        // Further pick must be rejected
        expect(deck.canPick(card.id)).toBe(false);
        expect(deck.pick(card.id)).toBe(false);
      }

      // Exactly 3 cards have max 2 picks (T01, T02, T07), remaining 33 have max 1 pick
      // Total picks allowed: 3 * 2 + 33 * 1 = 39 picks
      expect(totalPicksPerformed).toBe(39);

      // Now draw from fully exhausted deck -> must return empty array without error or hanging
      const exhaustedDraw = deck.drawCandidates({
        wave: 3,
        weaponsOnGrid: []
      });
      expect(Array.isArray(exhaustedDraw)).toBe(true);
      expect(exhaustedDraw.length).toBe(0);

      // Wave 1, 5, 10 guarantees must also degrade gracefully to empty without throw
      expect(() => deck.drawCandidates({ wave: 1, weaponsOnGrid: [] })).not.toThrow();
      expect(() => deck.drawCandidates({ wave: 5, weaponsOnGrid: [] })).not.toThrow();
      expect(() => deck.drawCandidates({ wave: 10, weaponsOnGrid: [] })).not.toThrow();
      expect(deck.drawCandidates({ wave: 1, weaponsOnGrid: [] })).toEqual([]);
      expect(deck.drawCandidates({ wave: 5, weaponsOnGrid: [] })).toEqual([]);
      expect(deck.drawCandidates({ wave: 10, weaponsOnGrid: [] })).toEqual([]);
    });

    it('TC-ADV-TAC-02: Partial exhaustion boundary: returns remaining available cards when available < count', () => {
      // Pick all cards except T04 (purple) and T14 (gold)
      const all = deck.getAllCards();
      for (const c of all) {
        if (c.id !== 'T04' && c.id !== 'T14') {
          for (let i = 0; i < c.maxPicksPerRun; i++) {
            deck.pick(c.id);
          }
        }
      }

      // Exactly 2 cards remain available
      const candidates = deck.drawCandidates({
        wave: 3,
        weaponsOnGrid: [],
        count: 3
      });

      expect(candidates.length).toBe(2);
      const ids = candidates.map(c => c.id).sort();
      expect(ids).toEqual(['T04', 'T14']);
    });

    it('TC-ADV-TAC-03: Candidate uniqueness: verify across 1000 draws that no single draw offers duplicate cards', () => {
      // Run 1000 independent draws across varied waves (1 to 15) and random board states
      for (let run = 0; run < 1000; run++) {
        const testDeck = new TacticsDeck();
        const wave = (run % 15) + 1;

        // Simulate some random prior picks (0 to 10 picks)
        const allCards = testDeck.getAllCards();
        const priorPicksCount = run % 10;
        for (let p = 0; p < priorPicksCount; p++) {
          const cardToPick = allCards[(run * 7 + p) % allCards.length];
          if (testDeck.canPick(cardToPick.id)) {
            testDeck.pick(cardToPick.id);
          }
        }

        const drawn = testDeck.drawCandidates({
          wave,
          weaponsOnGrid: [],
          count: 3
        });

        // Each draw of 3 cards must have 3 distinct IDs
        const uniqueIds = new Set(drawn.map(c => c.id));
        expect(uniqueIds.size).toBe(drawn.length);
        expect(drawn.length).toBeLessThanOrEqual(3);
      }
    });

    it('TC-ADV-TAC-04: Quality guarantee Wave 1: 100% of draws offer 3 Purple cards', () => {
      for (let seed = 0; seed < 200; seed++) {
        const testDeck = new TacticsDeck();
        const drawn = testDeck.drawCandidates({
          wave: 1,
          weaponsOnGrid: [],
          isFtue: false
        });

        expect(drawn.length).toBe(3);
        for (const card of drawn) {
          expect(card.quality).toBe('purple');
        }
      }
    });

    it('TC-ADV-TAC-05: FTUE Wave 1 guarantee: Slot 0 is strictly T11 (三段击阵法) and all 3 are Purple', () => {
      for (let seed = 0; seed < 50; seed++) {
        const testDeck = new TacticsDeck();
        const drawn = testDeck.drawCandidates({
          wave: 1,
          weaponsOnGrid: [],
          isFtue: true
        });

        expect(drawn.length).toBe(3);
        expect(drawn[0].id).toBe('T11');
        expect(drawn[0].name).toBe('三段击阵法');
        expect(drawn[0].quality).toBe('purple');
        expect(drawn[1].quality).toBe('purple');
        expect(drawn[2].quality).toBe('purple');

        const unique = new Set(drawn.map(c => c.id));
        expect(unique.size).toBe(3);
      }
    });

    it('TC-ADV-TAC-06: Quality guarantee Wave 5: >= 1 Gold card across 200 random draws', () => {
      for (let seed = 0; seed < 200; seed++) {
        const testDeck = new TacticsDeck();
        const drawn = testDeck.drawCandidates({
          wave: 5,
          weaponsOnGrid: []
        });

        expect(drawn.length).toBe(3);
        const goldCount = drawn.filter(c => c.quality === 'gold').length;
        expect(goldCount).toBeGreaterThanOrEqual(1);

        const unique = new Set(drawn.map(c => c.id));
        expect(unique.size).toBe(3);
      }
    });

    it('TC-ADV-TAC-07: Quality guarantee Wave 10: >= 2 Gold or Red-Gold cards across 200 random draws', () => {
      // Test without fusion unlocked (only Gold cards satisfy)
      for (let seed = 0; seed < 100; seed++) {
        const testDeck = new TacticsDeck();
        const drawn = testDeck.drawCandidates({
          wave: 10,
          weaponsOnGrid: [] // No weapons, fusions locked
        });

        expect(drawn.length).toBe(3);
        const highTierCount = drawn.filter(c => c.quality === 'gold' || c.quality === 'red_gold').length;
        expect(highTierCount).toBeGreaterThanOrEqual(2);
        const unique = new Set(drawn.map(c => c.id));
        expect(unique.size).toBe(3);
      }

      // Test with all 4 fusions unlocked
      const weaponsAllFusions: WeaponInstance[] = [
        createWeapon('w1', 'red_cannon', 3, 'fire'),
        createWeapon('w2', 'electric_grid', 3, 'fortress'),
        createWeapon('w3', 'repeating_crossbow', 3, 'mohist'),
        createWeapon('w4', 'rocket_box', 3, 'fire'),
        createWeapon('w5', 'spear_camp', 3, 'fortress'),
        createWeapon('w6', 'oil_cabinet', 3, 'fortress'),
        createWeapon('w7', 'catapult', 3, 'mohist'),
        createWeapon('w8', 'stargazer', 3, 'qimen')
      ];

      for (let seed = 0; seed < 100; seed++) {
        const testDeck = new TacticsDeck();
        const drawn = testDeck.drawCandidates({
          wave: 10,
          weaponsOnGrid: weaponsAllFusions
        });

        expect(drawn.length).toBe(3);
        const highTierCount = drawn.filter(c => c.quality === 'gold' || c.quality === 'red_gold').length;
        expect(highTierCount).toBeGreaterThanOrEqual(2);
        const unique = new Set(drawn.map(c => c.id));
        expect(unique.size).toBe(3);
      }
    });

    it('TC-ADV-TAC-08: Wave 10 high-tier scarcity edge case: only 1 Gold card left in deck', () => {
      // Pick all Gold cards except T14, leave Red-Golds locked
      const all = deck.getAllCards();
      for (const c of all) {
        if (c.quality === 'gold' && c.id !== 'T14') {
          for (let i = 0; i < c.maxPicksPerRun; i++) {
            deck.pick(c.id);
          }
        }
      }

      // Draw Wave 10: asks for 2 high-tier cards, but only 1 exists
      const drawn = deck.drawCandidates({
        wave: 10,
        weaponsOnGrid: [] // fusions locked
      });

      expect(drawn.length).toBe(3);
      expect(drawn.some(c => c.id === 'T14')).toBe(true);
      const unique = new Set(drawn.map(c => c.id));
      expect(unique.size).toBe(3);
    });
  });

  // =========================================================================
  // 2. Smart Faction Weighting Adversarial Stress
  // =========================================================================
  describe('2. Smart Faction Weighting', () => {
    it('TC-ADV-TAC-09: Dominant faction receives strictly 1.85x weight, absent factions receive 0.15x weight', () => {
      expect(DOMINANT_WEIGHT_MULTIPLIER).toBe(1.85);
      expect(ABSENT_WEIGHT_MULTIPLIER).toBe(0.15);
      expect(NEUTRAL_WEIGHT_MULTIPLIER).toBe(1.00);

      // Place 3 fire weapons (3 cells total), 0 for mohist, fortress, qimen
      const fireWeapons: WeaponInstance[] = [
        createWeapon('w1', 'musket', 1, 'fire', 1, 1),
        createWeapon('w2', 'musket', 1, 'fire', 1, 1),
        createWeapon('w3', 'musket', 1, 'fire', 1, 1)
      ];

      const board = SmartWeightEngine.analyzeBoard(fireWeapons);
      expect(board.dominantFaction).toBe('fire');
      expect(board.areaMap.fire).toBe(3);
      expect(board.areaMap.mohist).toBe(0);
      expect(board.areaMap.fortress).toBe(0);
      expect(board.areaMap.qimen).toBe(0);

      expect(board.absentFactions).toContain('mohist');
      expect(board.absentFactions).toContain('fortress');
      expect(board.absentFactions).toContain('qimen');
      expect(board.absentFactions).not.toContain('fire');

      // Test multipliers for card categories
      const generalCard = getTacticCardConfig('T01')!;
      const fireCard = getTacticCardConfig('T09')!;
      const mohistCard = getTacticCardConfig('T17')!;
      const fortressCard = getTacticCardConfig('T25')!;

      expect(SmartWeightEngine.calculateMultiplier(generalCard, board)).toBe(1.00);
      expect(SmartWeightEngine.calculateMultiplier(fireCard, board)).toBe(1.85);
      expect(SmartWeightEngine.calculateMultiplier(mohistCard, board)).toBe(0.15);
      expect(SmartWeightEngine.calculateMultiplier(fortressCard, board)).toBe(0.15);
    });

    it('TC-ADV-TAC-10: Multi-grid footprint area calculation for dominant faction determination', () => {
      // 1x2 Red Cannon (fire) = 2 cells
      // 2x2 Catapult (mohist) = 4 cells
      // 2x1 Bed Crossbow (mohist) = 2 cells
      // 1x1 Muskets (fire) = 1 cell each
      const weapons: WeaponInstance[] = [
        createWeapon('w1', 'catapult', 1, 'mohist', 2, 2), // 4 cells
        createWeapon('w2', 'bed_crossbow', 1, 'mohist', 2, 1), // 2 cells
        createWeapon('w3', 'red_cannon', 1, 'fire', 1, 2), // 2 cells
        createWeapon('w4', 'musket', 1, 'fire', 1, 1) // 1 cell
      ];

      const board = SmartWeightEngine.analyzeBoard(weapons);
      expect(board.areaMap.mohist).toBe(6); // 4 + 2
      expect(board.areaMap.fire).toBe(3);   // 2 + 1
      expect(board.dominantFaction).toBe('mohist');

      const mohistCard = getTacticCardConfig('T17')!;
      const fireCard = getTacticCardConfig('T09')!;

      expect(SmartWeightEngine.calculateMultiplier(mohistCard, board)).toBe(1.85);
      // Fire is present but not dominant -> 1.00x
      expect(SmartWeightEngine.calculateMultiplier(fireCard, board)).toBe(1.00);
    });

    it('TC-ADV-TAC-11: Tie-breaking when two factions have equal occupied area: unit count tie-breaker', () => {
      // Fire: two 1x1 units -> Area = 2 cells, Unit count = 2
      // Mohist: one 2x1 unit -> Area = 2 cells, Unit count = 1
      const weapons: WeaponInstance[] = [
        createWeapon('w1', 'musket', 1, 'fire', 1, 1),
        createWeapon('w2', 'musket', 1, 'fire', 1, 1),
        createWeapon('w3', 'bed_crossbow', 1, 'mohist', 2, 1)
      ];

      const board = SmartWeightEngine.analyzeBoard(weapons);
      expect(board.areaMap.fire).toBe(2);
      expect(board.areaMap.mohist).toBe(2);
      expect(board.unitMap.fire).toBe(2);
      expect(board.unitMap.mohist).toBe(1);

      // Fire wins tie-breaker because unit count (2) > unit count (1)
      expect(board.dominantFaction).toBe('fire');
      expect(SmartWeightEngine.calculateMultiplier(getTacticCardConfig('T09')!, board)).toBe(1.85);
      // Mohist is present non-dominant -> 1.00x
      expect(SmartWeightEngine.calculateMultiplier(getTacticCardConfig('T17')!, board)).toBe(1.00);
    });

    it('TC-ADV-TAC-12: Completely empty board edge case: all 4 factions absent (0.15x), general cards 1.00x', () => {
      const emptyBoard = SmartWeightEngine.analyzeBoard([]);

      expect(emptyBoard.totalOccupiedCells).toBe(0);
      expect(emptyBoard.dominantFaction).toBeNull();
      expect(emptyBoard.presentFactions.length).toBe(0);
      expect(emptyBoard.absentFactions.length).toBe(4);
      expect(emptyBoard.absentFactions).toEqual(['fire', 'mohist', 'fortress', 'qimen']);

      // All faction cards are absent -> 0.15x
      expect(SmartWeightEngine.calculateMultiplier(getTacticCardConfig('T09')!, emptyBoard)).toBe(0.15);
      expect(SmartWeightEngine.calculateMultiplier(getTacticCardConfig('T17')!, emptyBoard)).toBe(0.15);
      expect(SmartWeightEngine.calculateMultiplier(getTacticCardConfig('T25')!, emptyBoard)).toBe(0.15);

      // General cards remain 1.00x
      expect(SmartWeightEngine.calculateMultiplier(getTacticCardConfig('T01')!, emptyBoard)).toBe(1.00);
      expect(SmartWeightEngine.calculateMultiplier(getTacticCardConfig('T08')!, emptyBoard)).toBe(1.00);

      // Locked fusion cards remain 0.00x
      expect(SmartWeightEngine.calculateMultiplier(getTacticCardConfig('T33')!, emptyBoard, false)).toBe(0.00);

      // Candidate draw runs without errors
      const drawn = deck.drawCandidates({ wave: 2, weaponsOnGrid: [] });
      expect(drawn.length).toBe(3);
    });
  });

  // =========================================================================
  // 3. Red-Gold Fusion Unlock & Weighting Adversarial Stress
  // =========================================================================
  describe('3. Red-Gold Fusion Unlock & Weighting', () => {
    it('TC-ADV-TAC-13: T33, T34, T35, T36 require dual ★3+ units placed on grid', () => {
      // 1. T33 (红夷雷火炮): red_cannon ★3 + electric_grid ★3
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [])).toBe(false);
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [
        createWeapon('w1', 'red_cannon', 2, 'fire'),
        createWeapon('w2', 'electric_grid', 3, 'fortress')
      ])).toBe(false); // red_cannon only ★2
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [
        createWeapon('w1', 'red_cannon', 3, 'fire'),
        createWeapon('w2', 'electric_grid', 2, 'fortress')
      ])).toBe(false); // electric_grid only ★2
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [
        createWeapon('w1', 'red_cannon', 3, 'fire'),
        createWeapon('w2', 'electric_grid', 3, 'fortress')
      ])).toBe(true); // both ★3!
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [
        createWeapon('w1', 'red_cannon', 4, 'fire'),
        createWeapon('w2', 'electric_grid', 4, 'fortress')
      ])).toBe(true); // both ★4!

      // 2. T34 (暴雨火箭车): repeating_crossbow ★3 + rocket_box ★3
      expect(FusionUnlockEngine.isFusionUnlocked('T34', [
        createWeapon('w1', 'repeating_crossbow', 3, 'mohist'),
        createWeapon('w2', 'rocket_box', 2, 'fire')
      ])).toBe(false);
      expect(FusionUnlockEngine.isFusionUnlocked('T34', [
        createWeapon('w1', 'repeating_crossbow', 3, 'mohist'),
        createWeapon('w2', 'rocket_box', 3, 'fire')
      ])).toBe(true);

      // 3. T35 (铁浮屠火牛阵): spear_camp ★3 + oil_cabinet ★3
      expect(FusionUnlockEngine.isFusionUnlocked('T35', [
        createWeapon('w1', 'spear_camp', 3, 'fortress'),
        createWeapon('w2', 'oil_cabinet', 2, 'fortress')
      ])).toBe(false);
      expect(FusionUnlockEngine.isFusionUnlocked('T35', [
        createWeapon('w1', 'spear_camp', 3, 'fortress'),
        createWeapon('w2', 'oil_cabinet', 3, 'fortress')
      ])).toBe(true);

      // 4. T36 (九天星陨石): catapult ★3 + stargazer ★3
      expect(FusionUnlockEngine.isFusionUnlocked('T36', [
        createWeapon('w1', 'catapult', 3, 'mohist'),
        createWeapon('w2', 'stargazer', 2, 'qimen')
      ])).toBe(false);
      expect(FusionUnlockEngine.isFusionUnlocked('T36', [
        createWeapon('w1', 'catapult', 3, 'mohist'),
        createWeapon('w2', 'stargazer', 3, 'qimen')
      ])).toBe(true);
    });

    it('TC-ADV-TAC-14: Shorthand alias compatibility for T33 (cannon <-> red_cannon, grid_trap <-> electric_grid)', () => {
      // Combination A: cannon + grid_trap
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [
        createWeapon('w1', 'cannon', 3, 'fire'),
        createWeapon('w2', 'grid_trap', 3, 'fortress')
      ])).toBe(true);

      // Combination B: red_cannon + grid_trap
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [
        createWeapon('w1', 'red_cannon', 3, 'fire'),
        createWeapon('w2', 'grid_trap', 3, 'fortress')
      ])).toBe(true);

      // Combination C: cannon + electric_grid
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [
        createWeapon('w1', 'cannon', 3, 'fire'),
        createWeapon('w2', 'electric_grid', 3, 'fortress')
      ])).toBe(true);

      // Combination D: red_cannon + electric_grid
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [
        createWeapon('w1', 'red_cannon', 3, 'fire'),
        createWeapon('w2', 'electric_grid', 3, 'fortress')
      ])).toBe(true);
    });

    it('TC-ADV-TAC-15: Locked fusion cards have 0 weight and can NEVER be drawn', () => {
      const emptyBoard = SmartWeightEngine.analyzeBoard([]);
      for (const cardId of ['T33', 'T34', 'T35', 'T36']) {
        const card = getTacticCardConfig(cardId)!;
        expect(SmartWeightEngine.calculateMultiplier(card, emptyBoard, false)).toBe(0.0);
        expect(SmartWeightEngine.calculateWeight(card, emptyBoard, false)).toBe(0.0);
      }

      // Draw 500 times across various waves without prerequisites -> verify ZERO fusion cards ever drawn
      for (let i = 0; i < 500; i++) {
        const testDeck = new TacticsDeck();
        const wave = (i % 15) + 1;
        const drawn = testDeck.drawCandidates({ wave, weaponsOnGrid: [] });
        for (const card of drawn) {
          expect(card.category).not.toBe('fusion');
          expect(['T33', 'T34', 'T35', 'T36']).not.toContain(card.id);
        }
      }
    });

    it('TC-ADV-TAC-16: Unlocked fusion cards receive strictly 1.40x targeted weight', () => {
      expect(FUSION_UNLOCKED_WEIGHT_MULTIPLIER).toBe(1.40);

      const weapons: WeaponInstance[] = [
        createWeapon('w1', 'red_cannon', 3, 'fire'),
        createWeapon('w2', 'electric_grid', 3, 'fortress')
      ];
      const board = SmartWeightEngine.analyzeBoard(weapons);

      const t33 = getTacticCardConfig('T33')!;
      const isUnlocked = FusionUnlockEngine.isFusionUnlocked('T33', weapons);
      expect(isUnlocked).toBe(true);

      const mult = SmartWeightEngine.calculateMultiplier(t33, board, isUnlocked);
      expect(mult).toBe(1.40);

      const weight = SmartWeightEngine.calculateWeight(t33, board, isUnlocked);
      expect(weight).toBe(100 * 1.40); // baseWeight is 100 * 1.40 = 140
    });
  });

  // =========================================================================
  // 4. AffixMountEngine Boundary Clamps Adversarial Stress
  // =========================================================================
  describe('4. AffixMountEngine Boundary Clamps', () => {
    it('TC-ADV-TAC-17: Additive damage bonuses: stack +500% -> strictly clamped to <= 150% (1.50)', () => {
      // Test clampAdditive directly
      expect(affixEngine.clampAdditive([0.50, 0.50, 0.50])).toBe(1.50);
      expect(affixEngine.clampAdditive([1.00, 2.00, 2.00])).toBe(1.50); // 500% -> 1.50
      expect(affixEngine.clampAdditive([5.00])).toBe(1.50);
      expect(affixEngine.clampAdditive([-0.50, -0.20])).toBe(0.00); // Floor at 0

      // Pipeline integration verification
      const attacker = createWeapon('w1', 'musket', 1, 'fire', 1, 1, 0, 0, 100);
      const target = createEnemy(10000, 0); // 0 armor for pure additive measurement

      const res = DamagePipeline.calculate({
        attacker,
        target,
        skillMultiplier: 1.0,
        additiveBonuses: [1.00, 2.00, 2.00], // +500%
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      }, 1.0); // forced non-crit

      // Base 100 * (1 + 1.50) = 250
      expect(res.steps.additiveDmg).toBe(250);
      expect(res.finalDamage).toBe(250);
    });

    it('TC-ADV-TAC-18: Independent multipliers: pass 10 gates with +50% each -> max 3 gates, each clamped to <= 25% (0.25)', () => {
      const tenGates = [0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50];
      const clampedGates = affixEngine.clampIndependent(tenGates);

      // Must be truncated to max 3 gates
      expect(clampedGates.length).toBe(3);
      // Each gate must be clamped to <= 0.25
      for (const g of clampedGates) {
        expect(g).toBe(0.25);
      }

      // Pipeline calculation check
      const attacker = createWeapon('w1', 'musket', 1, 'fire', 1, 1, 0, 0, 100);
      const target = createEnemy(10000, 0);

      const res = DamagePipeline.calculate(createDamageContext({
        attacker,
        target,
        skillMultiplier: 1.0,
        additiveBonuses: [0], // 0%
        independentMultipliers: tenGates,
        critRateBonus: 0,
        critDmgBonus: 0
      }), 1.0); // non-crit

      // Base 100 * (1 + 0.25)^3 = 100 * 1.953125 = 195.3125
      expect(res.steps.multiplicativeDmg).toBeCloseTo(195.3125, 4);
      expect(res.finalDamage).toBeCloseTo(195.3125, 4);
    });

    it('TC-ADV-TAC-19: Crit rate bonus of 200% clamped to <= 75% (0.75)', () => {
      expect(affixEngine.clampCritRate(2.00)).toBe(0.75);
      expect(affixEngine.clampCritRate(0.99)).toBe(0.75);
      expect(affixEngine.clampCritRate(0.50)).toBe(0.50);
      expect(affixEngine.clampCritRate(-0.10)).toBe(0.00);

      // Verify pipeline behavior: roll at 0.7499 is crit, roll at 0.7501 is non-crit
      const attacker = createWeapon('w1', 'musket', 1, 'fire', 1, 1, 0, 0, 100);
      const target = createEnemy(1000, 0);

      const critRes = DamagePipeline.calculate(createDamageContext({
        attacker,
        target,
        skillMultiplier: 1.0,
        critRateBonus: 2.00 // Stacked 200%
      }), 0.7499);
      expect(critRes.isCrit).toBe(true);

      const nonCritRes = DamagePipeline.calculate(createDamageContext({
        attacker,
        target,
        skillMultiplier: 1.0,
        critRateBonus: 2.00 // Stacked 200%
      }), 0.7501);
      expect(nonCritRes.isCrit).toBe(false);
    });

    it('TC-ADV-TAC-20: Crit damage bonus of 500% clamped to <= 2.00x', () => {
      expect(affixEngine.clampCritDmg(5.00)).toBe(2.00);
      expect(affixEngine.clampCritDmg(2.50)).toBe(2.00);
      expect(affixEngine.clampCritDmg(1.80)).toBe(1.80);
      expect(affixEngine.clampCritDmg(0.50)).toBe(1.00); // Floor at 1.0

      // In DamagePipeline, base crit multiplier is 1.50 + critDmgBonus, capped at 2.00
      const attacker = createWeapon('w1', 'musket', 1, 'fire', 1, 1, 0, 0, 100);
      const target = createEnemy(1000, 0);

      const res = DamagePipeline.calculate(createDamageContext({
        attacker,
        target,
        skillMultiplier: 1.0,
        critRateBonus: 0.50,
        critDmgBonus: 5.00 // +500%
      }), 0.1); // forced crit

      // Base 100 * 2.00 = 200
      expect(res.isCrit).toBe(true);
      expect(res.steps.critDmg).toBe(200);
      expect(res.finalDamage).toBe(200);
    });

    it('TC-ADV-TAC-21: Attack interval: attack speed bonus of +10000% clamped to interval >= 0.10s', () => {
      // baseInterval = 1.0s, aspdBonus = 100.0 (+10000%)
      // raw interval = 1.0 / (1 + 100) = 0.0099s -> clamped to 0.10s
      const clampedInterval = affixEngine.calculateEffectiveInterval(1.0, 100.0);
      expect(clampedInterval).toBe(0.10);

      expect(affixEngine.clampInterval(0.0001)).toBe(0.10);
      expect(affixEngine.clampInterval(0.099)).toBe(0.10);
      expect(affixEngine.clampInterval(0.10)).toBe(0.10);
      expect(affixEngine.clampInterval(0.25)).toBe(0.25);

      // Extreme negative ASPD (-99%) must not divide by zero or go negative
      const extremeSlowInterval = affixEngine.calculateEffectiveInterval(1.0, -0.99);
      expect(extremeSlowInterval).toBeGreaterThan(0);
      expect(extremeSlowInterval).toBeCloseTo(10.0, 4); // -90% floor -> 1.0 / 0.10 = 10.0s
    });

    it('TC-ADV-TAC-22: Minimum damage floor: verify damage cannot drop below 1.0', () => {
      expect(affixEngine.clampDamage(0.0001)).toBe(1.0);
      expect(affixEngine.clampDamage(-100)).toBe(1.0);
      expect(affixEngine.clampDamage(0.999)).toBe(1.0);
      expect(affixEngine.clampDamage(1.5)).toBe(1.5);

      // Verify through full DamagePipeline with extreme 100,000 armor & 99% damage reduction
      const attacker = createWeapon('w1', 'musket', 1, 'fire', 1, 1, 0, 0, 1); // 1 base ATK
      const superTank = createEnemy(100000, 100000); // 100,000 armor

      const res = DamagePipeline.calculate(createDamageContext({
        attacker,
        target: superTank,
        skillMultiplier: 0.01,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        specialReduction: 0.99 // 99% special reduction
      }), 1.0);

      expect(res.finalDamage).toBe(1.0);
      expect(res.actualHpDeducted).toBe(1.0);
    });

    it('TC-ADV-TAC-23: Dynamic affix mount calculations: T14, T30, T08, T11, T32, T31', () => {
      // 1. T14 《神机百炼》: +3% per 10 silver, max 300 silver (+90% max)
      affixEngine.mountCard('T14');
      const fireWeapon = createWeapon('w1', 'musket', 1, 'fire');
      
      // 100 silver -> +30%
      let bonuses = affixEngine.getAdditiveDamageBonuses(fireWeapon, { currentSilver: 100 });
      expect(bonuses).toContain(0.30);

      // 500 silver -> capped at +90%
      bonuses = affixEngine.getAdditiveDamageBonuses(fireWeapon, { currentSilver: 500 });
      expect(bonuses).toContain(0.90);

      // 2. T30 《固若金汤》: 25% max wall durability -> flat ATK
      affixEngine.mountCard('T30');
      const flatAtk = affixEngine.getFlatAtkBonus({ wallMaxHp: 2000 });
      expect(flatAtk).toBe(500);

      // 3. T08 《多多益善》: +4% ASPD per weapon, +40% final dmg when 25 cells occupied
      affixEngine.mountCard('T08');
      const weaponsList = [fireWeapon, fireWeapon, fireWeapon]; // 3 weapons
      const aspdBonus = affixEngine.getAttackSpeedBonus(fireWeapon, { placedWeapons: weaponsList });
      expect(aspdBonus).toBe(3 * 0.04); // +12%

      const fullBoardMults = affixEngine.getIndependentMultipliers({ totalOccupiedCells: 25 });
      expect(fullBoardMults).toEqual([0.25, 0.15]); // 40% split into <= 0.25 gates

      // 4. T11 《三段击阵法》: >= 3 fire weapons in same row -> +80% ASPD
      affixEngine.mountCard('T11');
      const row2Weapons = [
        createWeapon('w_r2_1', 'musket', 1, 'fire', 1, 1, 2, 0),
        createWeapon('w_r2_2', 'musket', 1, 'fire', 1, 1, 2, 1),
        createWeapon('w_r2_3', 'musket', 1, 'fire', 1, 1, 2, 2)
      ];
      const fireAspd = affixEngine.getAttackSpeedBonus(row2Weapons[0], { placedWeapons: row2Weapons });
      // Includes T08 (3 * 0.04 = 0.12) + T11 (0.80) = 0.92
      expect(fireAspd).toBeCloseTo(0.92, 4);

      // 5. T31 《元素乱流》: +8 rage per reaction, max 10 stacks (+50% ASPD)
      affixEngine.mountCard('T31');
      for (let i = 0; i < 15; i++) {
        const { rageGained, turbulenceStacks } = affixEngine.onReaction();
        expect(rageGained).toBe(8);
      }
      expect(affixEngine.getTurbulenceStacks()).toBe(10); // Capped at 10
      const turbAspd = affixEngine.getAttackSpeedBonus(fireWeapon, {});
      expect(turbAspd).toBe(10 * 0.05); // +50%
    });

    it('TC-ADV-TAC-24: Monte Carlo statistical validation of dominant (1.85x) vs absent (0.15x) draw distribution ratio', () => {
      // Setup fire dominant board (fire has 4 cells, mohist/fortress/qimen have 0)
      const fireWeapons = [
        createWeapon('w1', 'musket', 1, 'fire', 2, 2)
      ];

      const counts: Record<string, number> = { fire: 0, mohist: 0, fortress: 0, general: 0 };
      const trials = 3000;

      for (let i = 0; i < trials; i++) {
        const testDeck = new TacticsDeck();
        // Wave 3: no forced quality guarantee
        const drawn = testDeck.drawCandidates({ wave: 3, weaponsOnGrid: fireWeapons, count: 1 });
        expect(drawn.length).toBe(1);
        counts[drawn[0].category] = (counts[drawn[0].category] || 0) + 1;
      }

      // Dominant fire cards (8 cards * 185 = 1480 weight)
      // Absent mohist cards (8 cards * 15 = 120 weight)
      // Theoretical ratio = 1480 / 120 = 12.33x
      expect(counts.fire).toBeGreaterThan(counts.mohist * 6); // Robust empirical statistical bound
      expect(counts.fire).toBeGreaterThan(counts.fortress * 6);
      expect(counts.fire).toBeGreaterThan(1200); // Dominant should be ~58% of 3000 draws (~1760)
    });

    it('TC-ADV-TAC-25: Instant effects callbacks and unmounting lifecycle integrity', () => {
      let silverGranted = 0;
      let wallMaxHpAdded = 0;
      let cellsUnlocked = 0;
      let starTokensGranted = 0;

      const callbacks = {
        grantSilver: (amt: number) => { silverGranted += amt; },
        addWallMaxHp: (amt: number) => { wallMaxHpAdded += amt; },
        healWall: (_amt: number) => {},
        unlockCells: (cnt: number) => { cellsUnlocked += cnt; },
        grantStarUpgradeTokens: (cnt: number) => { starTokensGranted += cnt; }
      };

      // T01: grant 35 silver
      expect(affixEngine.mountCard('T01', callbacks)).toBe(true);
      expect(silverGranted).toBe(35);

      // T02: add 300 wall max hp
      expect(affixEngine.mountCard('T02', callbacks)).toBe(true);
      expect(wallMaxHpAdded).toBe(300);

      // T05: unlock 3 cells
      expect(affixEngine.mountCard('T05', callbacks)).toBe(true);
      expect(cellsUnlocked).toBe(3);

      // T07: grant 1 star token
      expect(affixEngine.mountCard('T07', callbacks)).toBe(true);
      expect(starTokensGranted).toBe(1);
      expect(affixEngine.getStarUpgradeTokens()).toBe(1);
      expect(affixEngine.consumeStarUpgradeToken()).toBe(true);
      expect(affixEngine.getStarUpgradeTokens()).toBe(0);
      expect(affixEngine.consumeStarUpgradeToken()).toBe(false);

      // Test unmount lifecycle
      expect(affixEngine.mountCard('T14')).toBe(true);
      expect(affixEngine.isCardActive('T14')).toBe(true);
      const fireW = createWeapon('w1', 'musket', 1, 'fire');
      expect(affixEngine.getAdditiveDamageBonuses(fireW, { currentSilver: 200 })).toContain(0.60);

      // Unmount T14 -> bonus drops immediately
      expect(affixEngine.unmountCard('T14')).toBe(true);
      expect(affixEngine.isCardActive('T14')).toBe(false);
      expect(affixEngine.getAdditiveDamageBonuses(fireW, { currentSilver: 200 }).length).toBe(0);

      // Non-existent card unmount returns false
      expect(affixEngine.unmountCard('T999')).toBe(false);
      expect(affixEngine.mountCard('T999')).toBe(false);
    });

    it('TC-ADV-TAC-26: TacticsDeck boundary edge cases: invalid IDs, extreme counts, empty deck', () => {
      expect(deck.canPick('UNKNOWN_CARD')).toBe(false);
      expect(deck.pick('UNKNOWN_CARD')).toBe(false);
      expect(deck.getPicks('UNKNOWN_CARD')).toBe(0);

      // Count 0 returns empty array
      const zeroDrawn = deck.drawCandidates({ wave: 2, weaponsOnGrid: [], count: 0 });
      expect(zeroDrawn).toEqual([]);

      // Count greater than available pool (e.g. 50 requested from 32 available cards)
      const bigDraw = deck.drawCandidates({ wave: 2, weaponsOnGrid: [], count: 50 });
      // 36 total cards - 4 locked fusions = 32 available cards
      expect(bigDraw.length).toBe(32);
      const uniqueBig = new Set(bigDraw.map(c => c.id));
      expect(uniqueBig.size).toBe(32);
    });

    it('TC-ADV-TAC-27: Fusion unlock multi-unit star hierarchy & dynamic grid mutations', () => {
      // Multiple units on grid with mixed star levels:
      // Red cannon has a ★1 and a ★3
      // Electric grid has a ★2 and a ★3
      const mixedWeapons: WeaponInstance[] = [
        createWeapon('rc1', 'red_cannon', 1, 'fire'),
        createWeapon('rc2', 'red_cannon', 3, 'fire'),
        createWeapon('eg1', 'electric_grid', 2, 'fortress'),
        createWeapon('eg2', 'electric_grid', 3, 'fortress')
      ];

      expect(FusionUnlockEngine.isFusionUnlocked('T33', mixedWeapons)).toBe(true);

      // Remove the ★3 red cannon (leaving only ★1)
      const degradedWeapons = mixedWeapons.filter(w => w.id !== 'rc2');
      expect(FusionUnlockEngine.isFusionUnlocked('T33', degradedWeapons)).toBe(false);

      // Query unlocked IDs list
      const unlockedList = FusionUnlockEngine.getUnlockedFusionIds(mixedWeapons);
      expect(unlockedList).toContain('T33');
      expect(unlockedList).not.toContain('T34');

      // Invalid card query returns false
      expect(FusionUnlockEngine.isFusionUnlocked('T999', mixedWeapons)).toBe(false);
    });

    it('TC-ADV-TAC-28: Complex end-to-end 7-step damage calculation pipeline with multi-affix integration and clamps', () => {
      // Set up complex scenario:
      // Weapon: Musket (baseAtk = 100, faction = fire)
      const attacker = createWeapon('w_m', 'musket', 1, 'fire', 1, 1, 0, 0, 100);
      const target = createEnemy(5000, 200); // 200 raw armor

      // Mount affixes:
      // T30: 2000 wall max hp -> +500 flat ATK
      // T14: 300 silver -> +90% fire additive
      // T09: +25% fire additive
      // T08: 25 cells occupied -> [0.25, 0.15] independent multipliers
      // T18: Mohist crit bonus -> must NOT affect fire weapon
      affixEngine.mountCard('T30');
      affixEngine.mountCard('T14');
      affixEngine.mountCard('T09');
      affixEngine.mountCard('T08');
      affixEngine.mountCard('T18'); // Mohist only!

      const ctx = affixEngine.populateDamageContext(attacker, target, {
        wallMaxHp: 2000,
        currentSilver: 300,
        totalOccupiedCells: 25
      });

      // Inject sunder to test Step 6
      ctx.sunderRate = 0.25; // 25% sunder
      ctx.sunderFlat = 50;   // 50 flat sunder

      // Calculate damage through 7-step pipeline (forced non-crit roll 1.0)
      const result = DamagePipeline.calculate(ctx, 1.0);

      // Step 1: Base ATK (100 + 500 flat from T30 = 600)
      expect(result.steps.baseAtk).toBe(600);
      expect(result.steps.skillDmg).toBe(600);

      // Step 3: Additive (0.90 from T14 + 0.25 from T09 = 1.15)
      // 600 * (1 + 1.15) = 1290
      expect(result.steps.additiveDmg).toBe(1290);

      // Step 4: Multiplicative (1290 * 1.25 * 1.15 = 1854.375)
      expect(result.steps.multiplicativeDmg).toBeCloseTo(1854.375, 4);

      // Step 5: Crit (Attacker is Fire, T18 applies to Mohist only, so crit rate = 0 -> non-crit)
      expect(result.isCrit).toBe(false);
      expect(result.steps.critDmg).toBeCloseTo(1854.375, 4);

      // Step 6: Armor (200 * (1 - 0.25) - 50 = 100 effective armor)
      // DR = 100 / (100 + 150) = 0.40
      // 1854.375 * (1 - 0.40) = 1112.625
      expect(result.effectiveArmor).toBe(100);
      expect(result.steps.armorDmg).toBeCloseTo(1112.625, 4);

      // Step 7: Final Damage floor check (>= 1.0)
      expect(result.finalDamage).toBeCloseTo(1112.625, 4);
      expect(result.actualHpDeducted).toBeCloseTo(1112.625, 4);
    });
  });
});

