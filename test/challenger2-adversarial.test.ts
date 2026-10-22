/**
<<<<<<< SEARCH
=======
/**
 * 《孤城神机营》- Adversarial Challenger 2 Test Suite (Milestone M1)
 * Rigorous empirical stress-testing for:
 * 1. 2-in-1 Star Upgrade State Machine:
 *    - Full progression (★1 -> ★2, ★2 -> ★3, ★3 -> ★4)
 *    - Strict rejection at MAX_STAR_LEVEL (★4 cap)
 *    - Strict rejection on configId mismatch or star mismatch
 *    - Partial overlap collision (<50% overlap rejects merge) across 1x1, 1x2, 2x1, 2x2
 * 2. Row 0 Battlements Exclusive Validation:
 *    - isFortressOnly == true on Row 0 (Valid)
 *    - isFortressOnly == true on Rows 1..4 (Strict rejection with bounce-back)
 *    - Fortress height constraint (height must be 1)
 *    - Offensive arms (isFortressOnly == false) on Rows 0..4 (All valid)
 *    - Displaced fortress weapon during Smart Swap constrained strictly to Row 0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GridModel, GRID_ROWS, GRID_COLS, BENCH_SLOTS } from '../src/core/grid/grid-model';
import {
  StarUpgradeStateMachine,
  MAX_STAR_LEVEL
} from '../src/core/grid/star-upgrade';
import { SmartSwapController } from '../src/core/grid/smart-swap';
import { WeaponInstance, GridFootprint, StarLevel } from '../src/core/types';

function createWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: overrides.id || `adv_w_${Math.random().toString(36).substring(2, 8)}`,
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

describe('Challenger 2 — Adversarial: 2-in-1 Star Upgrade State Machine', () => {
  let grid: GridModel;

  beforeEach(() => {
    grid = new GridModel();
  });

  describe('1.1 Star Progression Transitions (★1 -> ★2 -> ★3 -> ★4)', () => {
    it('progresses through all star tiers with exact 1.8x baseAtk scaling', () => {
      const baseAtk = 100;
      // ★1 + ★1 -> ★2
      const w1A = createWeapon({ id: 'w1a', configId: 'repeating_crossbow', star: 1, baseAtk });
      const w1B = createWeapon({ id: 'w1b', configId: 'repeating_crossbow', star: 1, baseAtk });
      const w2 = StarUpgradeStateMachine.executeMerge(w1A, w1B);
      expect(w2.star).toBe(2);
      expect(w2.baseAtk).toBe(Math.round(baseAtk * 1.8)); // 180

      // ★2 + ★2 -> ★3
      const w2B = createWeapon({ id: 'w2b', configId: 'repeating_crossbow', star: 2, baseAtk: w2.baseAtk });
      const w3 = StarUpgradeStateMachine.executeMerge(w2, w2B);
      expect(w3.star).toBe(3);
      expect(w3.baseAtk).toBe(Math.round(180 * 1.8)); // 324

      // ★3 + ★3 -> ★4
      const w3B = createWeapon({ id: 'w3b', configId: 'repeating_crossbow', star: 3, baseAtk: w3.baseAtk });
      const w4 = StarUpgradeStateMachine.executeMerge(w3, w3B);
      expect(w4.star).toBe(4);
      expect(w4.baseAtk).toBe(Math.round(324 * 1.8)); // 583
    });

    it('evaluates merge successfully via evaluateMerge with matching coordinates', () => {
      const w1 = createWeapon({ id: 'w1', configId: 'cannon', star: 2, footprint: { width: 1, height: 2 }, anchor: { row: 1, col: 1 } });
      const w2 = createWeapon({ id: 'w2', configId: 'cannon', star: 2, footprint: { width: 1, height: 2 }, anchor: { row: 1, col: 1 } });

      const res = StarUpgradeStateMachine.evaluateMerge(w1, w2, { row: 1, col: 1 }, w2.anchor);
      expect(res.canMerge).toBe(true);
      expect(res.mergedWeapon?.star).toBe(3);
      expect(res.overlapRatio).toBe(1.0);
    });

    it('preserves all non-star properties of target weapon during merge', () => {
      const original: WeaponInstance = {
        id: 'w_orig',
        configId: 'fire_lance',
        name: '神机火铳',
        star: 1,
        faction: 'fire',
        footprint: { width: 1, height: 1 },
        anchor: { row: 2, col: 3 },
        isFortressOnly: false,
        baseAtk: 75,
        attackInterval: 0.9,
        range: 6.5
      };
      const source: WeaponInstance = { ...original, id: 'w_src', anchor: { row: 1, col: 1 } };

      const upgraded = StarUpgradeStateMachine.executeMerge(source, original);
      expect(upgraded.star).toBe(2);
      expect(upgraded.baseAtk).toBe(Math.round(75 * 1.8));
      expect(upgraded.configId).toBe('fire_lance');
      expect(upgraded.name).toBe('神机火铳');
      expect(upgraded.faction).toBe('fire');
      expect(upgraded.footprint).toEqual({ width: 1, height: 1 });
      expect(upgraded.isFortressOnly).toBe(false);
      expect(upgraded.attackInterval).toBe(0.9);
      expect(upgraded.range).toBe(6.5);
    });

    it('verifies all 16 archetypes can progress ★1 -> ★2 -> ★3 -> ★4 and are capped at ★4', () => {
      const archetypes = [
        // Fire
        { configId: 'fire_lance', faction: 'fire', w: 1, h: 1, isFortressOnly: false },
        { configId: 'rocket_box', faction: 'fire', w: 1, h: 1, isFortressOnly: false },
        { configId: 'thunder_thrower', faction: 'fire', w: 1, h: 1, isFortressOnly: false },
        { configId: 'red_cannon', faction: 'fire', w: 1, h: 2, isFortressOnly: false },
        // Mohist
        { configId: 'flame_beast', faction: 'mohist', w: 1, h: 1, isFortressOnly: false },
        { configId: 'repeating_crossbow', faction: 'mohist', w: 1, h: 1, isFortressOnly: false },
        { configId: 'bed_crossbow', faction: 'mohist', w: 2, h: 1, isFortressOnly: false },
        { configId: 'catapult', faction: 'mohist', w: 2, h: 2, isFortressOnly: false },
        // Fortress
        { configId: 'iron_barricade', faction: 'fortress', w: 1, h: 1, isFortressOnly: true },
        { configId: 'oil_cabinet', faction: 'fortress', w: 1, h: 1, isFortressOnly: true },
        { configId: 'electric_grid', faction: 'fortress', w: 1, h: 1, isFortressOnly: true },
        { configId: 'spear_camp', faction: 'fortress', w: 1, h: 1, isFortressOnly: true },
        // Qimen
        { configId: 'powder_bureau', faction: 'qimen', w: 1, h: 1, isFortressOnly: false },
        { configId: 'war_drum', faction: 'qimen', w: 2, h: 1, isFortressOnly: false },
        { configId: 'stargazer', faction: 'qimen', w: 1, h: 1, isFortressOnly: false },
        { configId: 'luban_workshop', faction: 'qimen', w: 1, h: 1, isFortressOnly: false }
      ];

      for (const arch of archetypes) {
        let cur = createWeapon({
          configId: arch.configId,
          faction: arch.faction as any,
          footprint: { width: arch.w, height: arch.h },
          isFortressOnly: arch.isFortressOnly,
          star: 1,
          baseAtk: 60
        });

        for (let nextStar = 2; nextStar <= 4; nextStar++) {
          const partner = createWeapon({ ...cur, id: `p_${nextStar}` });
          const check = StarUpgradeStateMachine.canMergeWeapons(cur, partner);
          expect(check.canMerge).toBe(true);
          cur = StarUpgradeStateMachine.executeMerge(cur, partner);
          expect(cur.star).toBe(nextStar);
        }

        // At star 4, further merge MUST fail
        const partner4 = createWeapon({ ...cur, id: 'p_4_overflow' });
        const check4 = StarUpgradeStateMachine.canMergeWeapons(cur, partner4);
        expect(check4.canMerge).toBe(false);
        expect(check4.reason).toBe('MAX_STAR_REACHED');
      }
    });

    it('executes drag-and-drop merge from grid cleanly and updates grid state', () => {
      const wA = createWeapon({ id: 'wa', configId: 'fire_lance', star: 1, anchor: { row: 2, col: 2 } });
      const wB = createWeapon({ id: 'wb', configId: 'fire_lance', star: 1, anchor: { row: 3, col: 3 } });

      grid.placeWeapon(wA, { row: 2, col: 2 });
      grid.placeWeapon(wB, { row: 3, col: 3 });

      const dropRes = SmartSwapController.tryDropFromGrid(grid, wA, { row: 3, col: 3 });
      expect(dropRes.success).toBe(true);
      expect(dropRes.type).toBe('MERGE');
      expect(dropRes.mergedWeapon?.star).toBe(2);

      // Old position vacated, new position occupied by ★2
      expect(grid.getWeaponAt(2, 2)).toBeNull();
      const mergedAtGrid = grid.getWeaponAt(3, 3);
      expect(mergedAtGrid?.star).toBe(2);
      expect(grid.getAllWeapons().length).toBe(1);
    });
  });

  describe('1.2 Rejecting Merge at MAX_STAR_LEVEL (★4)', () => {
    it('rejects merge when source or target is ★4', () => {
      const w4A = createWeapon({ id: 'w4a', configId: 'fire_lance', star: 4 });
      const w4B = createWeapon({ id: 'w4b', configId: 'fire_lance', star: 4 });

      const check = StarUpgradeStateMachine.canMergeWeapons(w4A, w4B);
      expect(check.canMerge).toBe(false);
      expect(check.reason).toBe('MAX_STAR_REACHED');

      expect(() => StarUpgradeStateMachine.executeMerge(w4A, w4B)).toThrowError(/MAX_STAR_REACHED/);

      const evalRes = StarUpgradeStateMachine.evaluateMerge(w4A, w4B, { row: 0, col: 0 }, { row: 0, col: 0 });
      expect(evalRes.canMerge).toBe(false);
      expect(evalRes.reason).toBe('MAX_STAR_REACHED');
    });

    it('does not merge two ★4 units in drag and drop, falls through to swap or bounce', () => {
      const w4A = createWeapon({ id: 'w4a', configId: 'fire_lance', star: 4, anchor: { row: 1, col: 1 } });
      const w4B = createWeapon({ id: 'w4b', configId: 'fire_lance', star: 4, anchor: { row: 2, col: 2 } });

      grid.placeWeapon(w4A, { row: 1, col: 1 });
      grid.placeWeapon(w4B, { row: 2, col: 2 });

      const dropRes = SmartSwapController.tryDropFromGrid(grid, w4A, { row: 2, col: 2 });
      // Cannot merge! Should perform smart swap instead of merge
      expect(dropRes.type).not.toBe('MERGE');
      expect(dropRes.type).toBe('SMART_SWAP');
      expect(grid.getWeaponAt(2, 2)?.id).toBe('w4a');
      expect(grid.getWeaponAt(2, 2)?.star).toBe(4);
      expect(grid.getAllWeapons().length).toBe(2);
    });
  });

  describe('1.3 Rejecting Merge on Mismatch (configId or star level)', () => {
    it('rejects merge with different configIds across all stars', () => {
      const configs = ['fire_lance', 'repeating_crossbow', 'red_cannon', 'catapult'];
      for (let s: StarLevel = 1; s <= 3; s = (s + 1) as StarLevel) {
        for (let i = 0; i < configs.length; i++) {
          for (let j = 0; j < configs.length; j++) {
            if (i === j) continue;
            const wA = createWeapon({ configId: configs[i], star: s });
            const wB = createWeapon({ configId: configs[j], star: s });

            const check = StarUpgradeStateMachine.canMergeWeapons(wA, wB);
            expect(check.canMerge).toBe(false);
            expect(check.reason).toBe('CONFIG_MISMATCH');
          }
        }
      }
    });

    it('rejects merge with same configId but differing star levels', () => {
      const starPairs: [StarLevel, StarLevel][] = [
        [1, 2], [1, 3], [1, 4],
        [2, 1], [2, 3], [2, 4],
        [3, 1], [3, 2], [3, 4]
      ];

      for (const [sA, sB] of starPairs) {
        const wA = createWeapon({ configId: 'thunder_thrower', star: sA });
        const wB = createWeapon({ configId: 'thunder_thrower', star: sB });

        const check = StarUpgradeStateMachine.canMergeWeapons(wA, wB);
        expect(check.canMerge).toBe(false);
        // Note: when one is star 4, star 4 check or star mismatch check
        expect(['STAR_MISMATCH', 'MAX_STAR_REACHED']).toContain(check.reason);
      }
    });
  });

  describe('1.4 Partial Overlap Collision (< 50% overlap rejection)', () => {
    it('calculates overlap ratios correctly across geometric configurations', () => {
      // 1x1 on 1x1 at same position: 100%
      const o1 = StarUpgradeStateMachine.calculateOverlapRatio(
        { row: 1, col: 1 }, { width: 1, height: 1 },
        { row: 1, col: 1 }, { width: 1, height: 1 }
      );
      expect(o1.overlapCells).toBe(1);
      expect(o1.ratioA).toBe(1.0);
      expect(o1.ratioB).toBe(1.0);

      // 1x1 on 1x1 adjacent: 0%
      const o2 = StarUpgradeStateMachine.calculateOverlapRatio(
        { row: 1, col: 1 }, { width: 1, height: 1 },
        { row: 1, col: 2 }, { width: 1, height: 1 }
      );
      expect(o2.overlapCells).toBe(0);
      expect(o2.ratioA).toBe(0);

      // 1x2 on 1x2 overlapping 1 cell: 50%
      const o3 = StarUpgradeStateMachine.calculateOverlapRatio(
        { row: 1, col: 0 }, { width: 1, height: 2 },
        { row: 2, col: 0 }, { width: 1, height: 2 }
      );
      expect(o3.overlapCells).toBe(1);
      expect(o3.ratioA).toBe(0.5);

      // 2x2 on 2x2 overlapping 1 cell (corner): 25%
      const o4 = StarUpgradeStateMachine.calculateOverlapRatio(
        { row: 1, col: 1 }, { width: 2, height: 2 },
        { row: 0, col: 0 }, { width: 2, height: 2 }
      );
      expect(o4.overlapCells).toBe(1);
      expect(o4.ratioA).toBe(0.25);

      // 2x2 on 2x2 overlapping 2 cells (edge): 50%
      const o5 = StarUpgradeStateMachine.calculateOverlapRatio(
        { row: 1, col: 0 }, { width: 2, height: 2 },
        { row: 0, col: 0 }, { width: 2, height: 2 }
      );
      expect(o5.overlapCells).toBe(2);
      expect(o5.ratioA).toBe(0.50);
    });

    it('rejects merge when overlap is < 50% (INSUFFICIENT_OVERLAP)', () => {
      const c1 = createWeapon({ configId: 'catapult', star: 1, footprint: { width: 2, height: 2 } });
      const c2 = createWeapon({ configId: 'catapult', star: 1, footprint: { width: 2, height: 2 }, anchor: { row: 0, col: 0 } });

      // Corner overlap: 1 cell (25% < 50%)
      const evalCorner = StarUpgradeStateMachine.evaluateMerge(
        c1, c2, { row: 1, col: 1 }, { row: 0, col: 0 }, 0.50
      );
      expect(evalCorner.canMerge).toBe(false);
      expect(evalCorner.reason).toBe('INSUFFICIENT_OVERLAP');
      expect(evalCorner.overlapRatio).toBe(0.25);

      // Edge overlap: 2 cells (50% >= 50%)
      const evalEdge = StarUpgradeStateMachine.evaluateMerge(
        c1, c2, { row: 1, col: 0 }, { row: 0, col: 0 }, 0.50
      );
      expect(evalEdge.canMerge).toBe(true);
      expect(evalEdge.overlapRatio).toBe(0.50);
      expect(evalEdge.mergedWeapon?.star).toBe(2);
    });

    it('handles drag-and-drop corner overlap without triggering merge', () => {
      const catapultA = createWeapon({ id: 'cat_a', configId: 'catapult', star: 1, footprint: { width: 2, height: 2 }, anchor: { row: 3, col: 3 } });
      const catapultB = createWeapon({ id: 'cat_b', configId: 'catapult', star: 1, footprint: { width: 2, height: 2 }, anchor: { row: 0, col: 0 } });

      grid.placeWeapon(catapultA, { row: 3, col: 3 });
      grid.placeWeapon(catapultB, { row: 0, col: 0 });

      // Drag catapultA to (1, 1), overlapping catapultB at (0, 0) by only 1 cell (25%)
      const dropRes = SmartSwapController.tryDropFromGrid(grid, catapultA, { row: 1, col: 1 });
      // Must NOT be MERGE
      expect(dropRes.type).not.toBe('MERGE');
      // Neither unit should be upgraded to ★2
      const allWeapons = grid.getAllWeapons();
      expect(allWeapons.every(w => w.star === 1)).toBe(true);
    });
  });
});

describe('Challenger 2 — Adversarial: Row 0 Battlements Exclusive Validation', () => {
  let grid: GridModel;

  beforeEach(() => {
    grid = new GridModel();
  });

  describe('2.1 Fortress Weapon on Row 0 is Valid', () => {
    it('validates and places 1x1 fortress weapon across all columns on Row 0', () => {
      for (let col = 0; col < GRID_COLS; col++) {
        const barricade = createWeapon({
          id: `barricade_${col}`,
          configId: 'iron_barricade',
          faction: 'fortress',
          isFortressOnly: true,
          footprint: { width: 1, height: 1 }
        });

        const validation = grid.validatePlacement(barricade, { row: 0, col });
        expect(validation.valid).toBe(true);
        expect(validation.code).toBe('VALID');

        expect(grid.placeWeapon(barricade, { row: 0, col })).toBe(true);
        expect(grid.getWeaponAt(0, col)?.id).toBe(`barricade_${col}`);
      }
    });

    it('validates 2x1 (width 2, height 1) fortress weapon on Row 0', () => {
      const wideBarrier = createWeapon({
        id: 'wide_barrier',
        configId: 'stone_wall',
        faction: 'fortress',
        isFortressOnly: true,
        footprint: { width: 2, height: 1 }
      });

      for (let col = 0; col <= 3; col++) {
        const validation = grid.validatePlacement(wideBarrier, { row: 0, col });
        expect(validation.valid).toBe(true);
        expect(validation.code).toBe('VALID');
      }
    });

    it('drops fortress weapon from Bench onto Row 0 successfully', () => {
      const benchFortress = createWeapon({
        id: 'bench_fortress',
        configId: 'oil_cabinet',
        faction: 'fortress',
        isFortressOnly: true,
        footprint: { width: 1, height: 1 }
      });

      grid.placeOnBench(benchFortress, 0);
      expect(grid.getBenchSlot(0)?.id).toBe('bench_fortress');

      const dropRes = SmartSwapController.tryDropFromBench(grid, benchFortress, 0, { row: 0, col: 2 });
      expect(dropRes.success).toBe(true);
      expect(dropRes.type).toBe('PLACE');
      expect(grid.getBenchSlot(0)).toBeNull();
      expect(grid.getWeaponAt(0, 2)?.id).toBe('bench_fortress');
    });
  });

  describe('2.2 Fortress Weapon on Rows 1~4 Strictly Rejected & Bounced Back', () => {
    it('strictly rejects placement of fortress weapon on all cells of Rows 1, 2, 3, 4', () => {
      const fortress = createWeapon({
        configId: 'spear_camp',
        faction: 'fortress',
        isFortressOnly: true,
        footprint: { width: 1, height: 1 }
      });

      for (let row = 1; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const val = grid.validatePlacement(fortress, { row, col });
          expect(val.valid).toBe(false);
          expect(val.code).toBe('FORTRESS_ROW_INVALID');
          expect(val.error).toBe('城防工事仅可布置于最前排女墙！');
          expect(grid.placeWeapon(fortress, { row, col })).toBe(false);
        }
      }
    });

    it('rejects fortress weapon with height > 1 even on Row 0', () => {
      const invalidTallFortress = createWeapon({
        configId: 'tall_fortress',
        faction: 'fortress',
        isFortressOnly: true,
        footprint: { width: 1, height: 2 } // height = 2
      });

      const val = grid.validatePlacement(invalidTallFortress, { row: 0, col: 0 });
      expect(val.valid).toBe(false);
      expect(val.code).toBe('FORTRESS_ROW_INVALID');
    });

    it('drops fortress weapon from grid onto Row 1~4 triggers BOUNCE_BACK without state mutation', () => {
      const fortress = createWeapon({
        id: 'fortress_pinned',
        configId: 'iron_barricade',
        faction: 'fortress',
        isFortressOnly: true,
        anchor: { row: 0, col: 1 }
      });
      grid.placeWeapon(fortress, { row: 0, col: 1 });

      for (let targetRow = 1; targetRow <= 4; targetRow++) {
        const dropRes = SmartSwapController.tryDropFromGrid(grid, fortress, { row: targetRow, col: 1 });
        expect(dropRes.success).toBe(false);
        expect(dropRes.type).toBe('BOUNCE_BACK');
        expect(dropRes.message).toBe('城防工事仅可布置于最前排女墙！');

        // Fortress remains at original position
        expect(grid.getWeaponAt(0, 1)?.id).toBe('fortress_pinned');
        expect(grid.getWeaponAt(targetRow, 1)).toBeNull();
      }
    });

    it('drops fortress weapon from bench onto Row 1~4 triggers BOUNCE_BACK and stays on bench', () => {
      const fortress = createWeapon({
        id: 'bench_fortress_test',
        configId: 'oil_cabinet',
        faction: 'fortress',
        isFortressOnly: true
      });
      grid.placeOnBench(fortress, 2);

      const dropRes = SmartSwapController.tryDropFromBench(grid, fortress, 2, { row: 2, col: 3 });
      expect(dropRes.success).toBe(false);
      expect(dropRes.type).toBe('BOUNCE_BACK');
      expect(dropRes.message).toBe('城防工事仅可布置于最前排女墙！');

      // Stays on bench slot 2
      expect(grid.getBenchSlot(2)?.id).toBe('bench_fortress_test');
      expect(grid.getWeaponAt(2, 3)).toBeNull();
    });
  });

  describe('2.3 Offensive Arms Valid on All Rows 0~4', () => {
    it('verifies offensive arms (isFortressOnly == false) can be placed on every row [0..4]', () => {
      const offensiveFactions: Array<'fire' | 'mohist' | 'qimen'> = ['fire', 'mohist', 'qimen'];

      for (const faction of offensiveFactions) {
        for (let row = 0; row < GRID_ROWS; row++) {
          const weapon = createWeapon({
            id: `off_${faction}_${row}`,
            faction,
            isFortressOnly: false,
            footprint: { width: 1, height: 1 }
          });

          const val = grid.validatePlacement(weapon, { row, col: 2 });
          expect(val.valid).toBe(true);
          expect(val.code).toBe('VALID');
        }
      }
    });

    it('places offensive 1x1 arms across all 25 grid cells successfully', () => {
      grid.clear();
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const gun = createWeapon({
            id: `gun_${r}_${c}`,
            configId: 'fire_lance',
            isFortressOnly: false
          });
          const ok = grid.placeWeapon(gun, { row: r, col: c });
          expect(ok).toBe(true);
        }
      }
      expect(grid.getAllWeapons().length).toBe(25);
      expect(grid.getEmptyCells().length).toBe(0);
    });

    it('allows multi-grid offensive weapons (1x2, 2x1, 2x2) overlapping Row 0 and Row 1', () => {
      // 1x2 cannon anchored at Row 0 occupies Row 0 and Row 1
      const cannon = createWeapon({
        id: 'cannon_0',
        configId: 'red_cannon',
        footprint: { width: 1, height: 2 },
        isFortressOnly: false
      });

      const val = grid.validatePlacement(cannon, { row: 0, col: 0 });
      expect(val.valid).toBe(true);
      expect(grid.placeWeapon(cannon, { row: 0, col: 0 })).toBe(true);
      expect(grid.getWeaponAt(0, 0)?.id).toBe('cannon_0');
      expect(grid.getWeaponAt(1, 0)?.id).toBe('cannon_0');
    });
  });

  describe('2.4 Adversarial Displacement: Displaced Fortress Constrained Strictly to Row 0', () => {
    it('restricts displaced fortress-only weapon to Row 0 during Smart Swap', () => {
      // Fortress at (0, 0), another fortress at (0, 1).
      // Rest of Row 0 is occupied by other fortresses: (0, 2), (0, 3). Cell (0, 4) is empty.
      // Rows 1~4 are empty.
      grid.placeWeapon(createWeapon({ id: 'f0', configId: 'iron_barricade', isFortressOnly: true, anchor: { row: 0, col: 0 } }), { row: 0, col: 0 });
      grid.placeWeapon(createWeapon({ id: 'f1', configId: 'oil_cabinet', isFortressOnly: true, anchor: { row: 0, col: 1 } }), { row: 0, col: 1 });
      grid.placeWeapon(createWeapon({ id: 'f2', configId: 'electric_grid', isFortressOnly: true, anchor: { row: 0, col: 2 } }), { row: 0, col: 2 });
      grid.placeWeapon(createWeapon({ id: 'f3', configId: 'spear_camp', isFortressOnly: true, anchor: { row: 0, col: 3 } }), { row: 0, col: 3 });

      // Offensive weapon at (2, 2) is dropped onto (0, 0)
      const offensive = createWeapon({ id: 'gun', configId: 'fire_lance', isFortressOnly: false, anchor: { row: 2, col: 2 } });
      grid.placeWeapon(offensive, { row: 2, col: 2 });

      // Drop gun at (0, 0) displacing f0. Available cells on Row 0: only (0, 4).
      // Available cells on Row 1..4: many!
      const swapRes = SmartSwapController.tryDropFromGrid(grid, offensive, { row: 0, col: 0 });
      expect(swapRes.success).toBe(true);
      expect(swapRes.type).toBe('SMART_SWAP');

      // The displaced fortress MUST be placed at Row 0 (col 4), NEVER on row 1..4!
      const displacedFortress = grid.getWeaponAt(0, 4);
      expect(displacedFortress?.id).toBe('f0');
      expect(displacedFortress?.anchor.row).toBe(0);

      // Verify no fortress weapon is on row 1..4
      for (let r = 1; r <= 4; r++) {
        for (let c = 0; c < 5; c++) {
          const w = grid.getWeaponAt(r, c);
          if (w) {
            expect(w.isFortressOnly).toBe(false);
          }
        }
      }
    });

    it('bounces back when Row 0 has no space for displaced fortress, even if Rows 1~4 are empty', () => {
      // Completely fill Row 0 with 5 fortress units
      for (let c = 0; c < 5; c++) {
        grid.placeWeapon(createWeapon({ id: `f_${c}`, configId: `fort_${c}`, isFortressOnly: true, anchor: { row: 0, col: c } }), { row: 0, col: c });
      }

      // Offensive weapon at (1, 1). Rows 1..4 are all empty (20 empty cells)!
      const offensive = createWeapon({ id: 'off_gun', configId: 'fire_lance', isFortressOnly: false, anchor: { row: 1, col: 1 } });
      grid.placeWeapon(offensive, { row: 1, col: 1 });

      // Drag offensive to (0, 0). Displaced f_0 needs a new cell.
      // But Row 0 has 0 empty cells!
      // Fortress cannot be displaced to Row 1..4, so Smart Swap MUST FAIL and BOUNCE BACK!
      const swapRes = SmartSwapController.tryDropFromGrid(grid, offensive, { row: 0, col: 0 });
      expect(swapRes.success).toBe(false);
      expect(swapRes.type).toBe('BOUNCE_BACK');
      expect(swapRes.message).toContain('可用空间不足');

      // Verify grid state was NOT corrupted
      expect(grid.getWeaponAt(0, 0)?.id).toBe('f_0');
      expect(grid.getWeaponAt(1, 1)?.id).toBe('off_gun');
      for (let c = 0; c < 5; c++) {
        expect(grid.getWeaponAt(0, c)?.isFortressOnly).toBe(true);
      }
    });
  });
});
