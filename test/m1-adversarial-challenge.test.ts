/**
 * 《孤城神机营》- Adversarial Challenge Test Suite for Milestone M1
 * Empirical Stress Tests by Challenger 1
 *
 * Verifies:
 * 1. Crowded boards (e.g. 23/25 cells filled), dropping a 2x2 catapult into remaining space.
 * 2. Bench full condition (5/5 slots occupied) when attempting to displace a unit to the bench.
 * 3. Simultaneous displacement of multiple units (1x2 + 1x1 + 1x1, 4x 1x1, etc.).
 * 4. Safe rollback verification: ensure grid and bench states remain untouched upon bounce-back.
 * 5. Multi-cell displaced weapon footprint vacancy in Smart Swap.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GridModel, GRID_ROWS, GRID_COLS, BENCH_SLOTS } from '../src/core/grid/grid-model';
import { SmartSwapController, SmartSwapAlgorithm } from '../src/core/grid/smart-swap';
import { WeaponInstance } from '../src/core/types';

function makeWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: overrides.id || `w_${Math.random().toString(36).substring(2, 8)}`,
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

describe('Challenger 1 Adversarial Suite: M1 Boundary & Stress Verifications', () => {
  let grid: GridModel;

  beforeEach(() => {
    grid = new GridModel();
  });

  // =========================================================================
  // 1. Crowded boards (e.g. 23/25 cells filled) with 2x2 catapult
  // =========================================================================
  describe('Boundary Condition 1: Crowded Board (23/25 filled) & 2x2 Catapult', () => {
    it('1A: Dropping 2x2 Catapult from Bench to 23/25 crowded board with FULL bench (5/5 occupied) -> BOUNCE_BACK with zero state mutation', () => {
      // Setup: 23 cells occupied on grid, exactly (3,3) and (3,4) empty
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if ((r === 3 && c === 3) || (r === 3 && c === 4)) continue;
          grid.placeWeapon(
            makeWeapon({ id: `grid_${r}_${c}`, configId: `cfg_${r}_${c}`, anchor: { row: r, col: c } }),
            { row: r, col: c }
          );
        }
      }
      expect(grid.getAllWeapons().length).toBe(23);
      expect(grid.getEmptyCells().length).toBe(2);

      // Setup: Bench has 5/5 full slots, catapult at slot 0
      const catapult = makeWeapon({
        id: 'bench_catapult_2x2',
        configId: 'catapult_heavy',
        footprint: { width: 2, height: 2 }
      });
      grid.placeOnBench(catapult, 0);
      for (let i = 1; i < 5; i++) {
        grid.placeOnBench(makeWeapon({ id: `bench_filler_${i}`, configId: `bcfg_${i}` }), i);
      }
      expect(grid.getEmptyBenchSlotsCount()).toBe(0);

      // Snapshot before drop attempt
      const snapshotBefore = grid.getSnapshot();

      // Drop 2x2 Catapult onto (3, 3): occupies (3,3), (3,4), (4,3), (4,4)
      // (3,3) and (3,4) are empty; (4,3) and (4,4) are occupied by grid_4_3 and grid_4_4 (2 overlapping weapons).
      // Bench capacity = 0 empty slots + 1 vacated slot (catapult) = 1.
      // Overlapping weapons = 2. 2 > 1 -> MUST BOUNCE BACK!
      const dropResult = SmartSwapController.tryDropFromBench(grid, catapult, 0, { row: 3, col: 3 });

      expect(dropResult.success).toBe(false);
      expect(dropResult.type).toBe('BOUNCE_BACK');
      expect(dropResult.message).toContain('备战席槽位不足');

      // VERIFY SAFE ROLLBACK:
      // Grid state must be completely unchanged
      const snapshotAfter = grid.getSnapshot();
      expect(grid.getAllWeapons().length).toBe(23);
      expect(grid.getEmptyCells().length).toBe(2);
      expect(grid.getWeaponAt(4, 3)?.id).toBe('grid_4_3');
      expect(grid.getWeaponAt(4, 4)?.id).toBe('grid_4_4');
      expect(grid.getWeaponAt(3, 3)).toBeNull();
      expect(grid.getWeaponAt(3, 4)).toBeNull();

      // Bench state must be completely unchanged
      expect(grid.getBenchSlot(0)?.id).toBe('bench_catapult_2x2');
      for (let i = 1; i < 5; i++) {
        expect(grid.getBenchSlot(i)?.id).toBe(`bench_filler_${i}`);
      }
      expect(grid.getEmptyBenchSlotsCount()).toBe(0);
    });

    it('1B: Dropping 2x2 Catapult from Bench to 23/25 crowded board with 1 free bench slot -> SUCCEEDS and displaces 2 weapons to bench', () => {
      // Setup: 23 cells occupied on grid, (3,3) and (3,4) empty
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if ((r === 3 && c === 3) || (r === 3 && c === 4)) continue;
          grid.placeWeapon(
            makeWeapon({ id: `grid_${r}_${c}`, configId: `cfg_${r}_${c}`, anchor: { row: r, col: c } }),
            { row: r, col: c }
          );
        }
      }

      // Bench: Catapult at slot 0, slots 1..3 occupied, slot 4 EMPTY (1 empty bench slot)
      const catapult = makeWeapon({
        id: 'bench_catapult_2x2',
        configId: 'catapult_heavy',
        footprint: { width: 2, height: 2 }
      });
      grid.placeOnBench(catapult, 0);
      for (let i = 1; i < 4; i++) {
        grid.placeOnBench(makeWeapon({ id: `bench_filler_${i}`, configId: `bcfg_${i}` }), i);
      }
      expect(grid.getEmptyBenchSlotsCount()).toBe(1); // Slot 4 is empty

      // Drop onto (3, 3): overlaps grid_4_3 and grid_4_4 (2 weapons)
      // Available capacity = 1 empty + 1 vacated (catapult slot 0) = 2.
      // 2 overlapping <= 2 capacity -> SUCCEEDS!
      const dropResult = SmartSwapController.tryDropFromBench(grid, catapult, 0, { row: 3, col: 3 });

      expect(dropResult.success).toBe(true);
      expect(dropResult.type).toBe('BENCH_SWAP');
      expect(dropResult.displacedWeapons?.length).toBe(2);

      // Catapult placed at (3, 3) occupying 4 cells: (3,3), (3,4), (4,3), (4,4)
      expect(grid.getWeaponAt(3, 3)?.id).toBe('bench_catapult_2x2');
      expect(grid.getWeaponAt(3, 4)?.id).toBe('bench_catapult_2x2');
      expect(grid.getWeaponAt(4, 3)?.id).toBe('bench_catapult_2x2');
      expect(grid.getWeaponAt(4, 4)?.id).toBe('bench_catapult_2x2');

      // Grid is now 100% full (25 cells occupied)
      expect(grid.getEmptyCells().length).toBe(0);

      // Bench is now 100% full (displaced grid_4_3 and grid_4_4 took slots 0 and 4)
      expect(grid.getEmptyBenchSlotsCount()).toBe(0);
      const benchIds = grid.getAllBenchWeapons().map(w => w.id);
      expect(benchIds).toContain('grid_4_3');
      expect(benchIds).toContain('grid_4_4');
    });

    it('1C: Moving 2x2 Catapult within 23/25 crowded board -> Smart Swap successfully slides 2 displaced units to vacated cells', () => {
      // Board has 23 cells occupied:
      // Catapult at (0, 0) [4 cells: (0,0), (0,1), (1,0), (1,1)]
      // 19 1x1 units elsewhere
      // (3,3) and (3,4) empty
      const catapult = makeWeapon({
        id: 'catapult_grid',
        configId: 'catapult_grid_cfg',
        footprint: { width: 2, height: 2 },
        anchor: { row: 0, col: 0 }
      });
      grid.placeWeapon(catapult, { row: 0, col: 0 });

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if ((r < 2 && c < 2) || (r === 3 && c === 3) || (r === 3 && c === 4)) continue;
          grid.placeWeapon(
            makeWeapon({ id: `unit_${r}_${c}`, configId: `cfg_${r}_${c}`, anchor: { row: r, col: c } }),
            { row: r, col: c }
          );
        }
      }
      expect(grid.getEmptyCells().length).toBe(2);

      // Move catapult to (3, 3), covering empty (3,3), (3,4) and occupied unit_4_3, unit_4_4
      const result = SmartSwapController.tryDropFromGrid(grid, catapult, { row: 3, col: 3 });

      expect(result.success).toBe(true);
      expect(result.type).toBe('SMART_SWAP');
      expect(result.displacedWeapons?.length).toBe(2);

      // Catapult is at (3, 3)
      expect(grid.getWeaponAt(3, 3)?.id).toBe('catapult_grid');
      expect(grid.getWeaponAt(4, 4)?.id).toBe('catapult_grid');

      // Displaced units relocated into old vacated cells (0,0..1,1)
      const displaced1 = grid.getAllWeapons().find(w => w.id === 'unit_4_3');
      const displaced2 = grid.getAllWeapons().find(w => w.id === 'unit_4_4');
      expect(displaced1).toBeDefined();
      expect(displaced2).toBeDefined();
      expect(displaced1!.anchor.row).toBeLessThanOrEqual(1);
      expect(displaced2!.anchor.row).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // 2. Bench full condition (5/5 slots occupied) when attempting displacement
  // =========================================================================
  describe('Boundary Condition 2: Bench Full Condition (5/5 slots)', () => {
    it('2A: 1-to-1 swap from FULL bench with occupied grid unit succeeds via vacated slot', () => {
      // Bench is 5/5 full
      for (let i = 0; i < 5; i++) {
        grid.placeOnBench(makeWeapon({ id: `bench_unit_${i}`, configId: `b_${i}` }), i);
      }
      // Grid unit at (2, 2)
      const gridUnit = makeWeapon({ id: 'grid_unit_target', configId: 'g_target', anchor: { row: 2, col: 2 } });
      grid.placeWeapon(gridUnit, { row: 2, col: 2 });

      const benchWeapon = grid.getBenchSlot(2)!;
      const res = SmartSwapController.tryDropFromBench(grid, benchWeapon, 2, { row: 2, col: 2 });

      expect(res.success).toBe(true);
      expect(res.type).toBe('BENCH_SWAP');
      expect(grid.getWeaponAt(2, 2)?.id).toBe(benchWeapon.id);
      expect(grid.getBenchSlot(2)?.id).toBe('grid_unit_target');
      expect(grid.getEmptyBenchSlotsCount()).toBe(0);
    });

    it('2B: Dropping 1x2 unit from FULL bench covering 2 grid units bounces back cleanly without state corruption', () => {
      // Bench 5/5 full with 1x2 unit at slot 0
      const wideWeapon = makeWeapon({
        id: 'bench_wide_1x2',
        configId: 'wide_cfg',
        footprint: { width: 2, height: 1 }
      });
      grid.placeOnBench(wideWeapon, 0);
      for (let i = 1; i < 5; i++) {
        grid.placeOnBench(makeWeapon({ id: `bench_${i}`, configId: `b_${i}` }), i);
      }

      // Grid has 2 units covering (2, 1) and (2, 2)
      const g1 = makeWeapon({ id: 'grid_u1', configId: 'c1', anchor: { row: 2, col: 1 } });
      const g2 = makeWeapon({ id: 'grid_u2', configId: 'c2', anchor: { row: 2, col: 2 } });
      grid.placeWeapon(g1, { row: 2, col: 1 });
      grid.placeWeapon(g2, { row: 2, col: 2 });

      const res = SmartSwapController.tryDropFromBench(grid, wideWeapon, 0, { row: 2, col: 1 });

      expect(res.success).toBe(false);
      expect(res.type).toBe('BOUNCE_BACK');

      // State invariant verification
      expect(grid.getBenchSlot(0)?.id).toBe('bench_wide_1x2');
      expect(grid.getWeaponAt(2, 1)?.id).toBe('grid_u1');
      expect(grid.getWeaponAt(2, 2)?.id).toBe('grid_u2');
    });

    it('2C: Dropping 2x2 unit from FULL bench covering 4 grid units bounces back cleanly without state corruption', () => {
      const catapult = makeWeapon({
        id: 'catapult_0',
        configId: 'cata_cfg',
        footprint: { width: 2, height: 2 }
      });
      grid.placeOnBench(catapult, 0);
      for (let i = 1; i < 5; i++) {
        grid.placeOnBench(makeWeapon({ id: `bench_${i}`, configId: `b_${i}` }), i);
      }

      // 4 grid units covering (1,1) to (2,2)
      const u1 = makeWeapon({ id: 'u1', configId: 'c1', anchor: { row: 1, col: 1 } });
      const u2 = makeWeapon({ id: 'u2', configId: 'c2', anchor: { row: 1, col: 2 } });
      const u3 = makeWeapon({ id: 'u3', configId: 'c3', anchor: { row: 2, col: 1 } });
      const u4 = makeWeapon({ id: 'u4', configId: 'c4', anchor: { row: 2, col: 2 } });
      grid.placeWeapon(u1, { row: 1, col: 1 });
      grid.placeWeapon(u2, { row: 1, col: 2 });
      grid.placeWeapon(u3, { row: 2, col: 1 });
      grid.placeWeapon(u4, { row: 2, col: 2 });

      const res = SmartSwapController.tryDropFromBench(grid, catapult, 0, { row: 1, col: 1 });

      expect(res.success).toBe(false);
      expect(res.type).toBe('BOUNCE_BACK');
      expect(grid.getBenchSlot(0)?.id).toBe('catapult_0');
      expect(grid.getWeaponAt(1, 1)?.id).toBe('u1');
      expect(grid.getWeaponAt(1, 2)?.id).toBe('u2');
      expect(grid.getWeaponAt(2, 1)?.id).toBe('u3');
      expect(grid.getWeaponAt(2, 2)?.id).toBe('u4');
    });
  });

  // =========================================================================
  // 3. Simultaneous displacement of multiple units
  // =========================================================================
  describe('Boundary Condition 3: Simultaneous Displacement of Multiple Units', () => {
    it('3A: 2x2 Catapult simultaneously displaces 4 distinct 1x1 units to nearest Manhattan anchors', () => {
      const catapult = makeWeapon({
        id: 'catapult_mover',
        configId: 'catapult_mover_cfg',
        footprint: { width: 2, height: 2 },
        anchor: { row: 0, col: 0 }
      });
      grid.placeWeapon(catapult, { row: 0, col: 0 });

      // Place 4 target units at (2, 2), (2, 3), (3, 2), (3, 3)
      const targets = [
        makeWeapon({ id: 't1', configId: 'tc1', anchor: { row: 2, col: 2 } }),
        makeWeapon({ id: 't2', configId: 'tc2', anchor: { row: 2, col: 3 } }),
        makeWeapon({ id: 't3', configId: 'tc3', anchor: { row: 3, col: 2 } }),
        makeWeapon({ id: 't4', configId: 'tc4', anchor: { row: 3, col: 3 } })
      ];
      for (const t of targets) {
        grid.placeWeapon(t, t.anchor);
      }

      const res = SmartSwapController.tryDropFromGrid(grid, catapult, { row: 2, col: 2 });

      expect(res.success).toBe(true);
      expect(res.type).toBe('SMART_SWAP');
      expect(res.displacedWeapons?.length).toBe(4);

      // Verify catapult occupies all 4 cells at (2, 2)
      for (let r = 2; r <= 3; r++) {
        for (let c = 2; c <= 3; c++) {
          expect(grid.getWeaponAt(r, c)?.id).toBe('catapult_mover');
        }
      }

      // Verify all 4 target units are placed at distinct, valid, non-overlapping anchors
      const displacedSet = new Set<string>();
      for (const t of targets) {
        const found = grid.getAllWeapons().find(w => w.id === t.id);
        expect(found).toBeDefined();
        const posKey = `${found!.anchor.row},${found!.anchor.col}`;
        expect(displacedSet.has(posKey)).toBe(false);
        displacedSet.add(posKey);

        // Ensure displaced unit is placed in grid bounds
        expect(found!.anchor.row).toBeGreaterThanOrEqual(0);
        expect(found!.anchor.row).toBeLessThan(GRID_ROWS);
        expect(found!.anchor.col).toBeGreaterThanOrEqual(0);
        expect(found!.anchor.col).toBeLessThan(GRID_COLS);
      }
    });

    it('3B: 2x2 unit simultaneously displaces 1 1x2 unit and 2 1x1 units (mixed footprints)', () => {
      const catapult = makeWeapon({
        id: 'cata_hero',
        configId: 'cata_cfg',
        footprint: { width: 2, height: 2 },
        anchor: { row: 0, col: 0 }
      });
      grid.placeWeapon(catapult, { row: 0, col: 0 });

      // Target area: (2, 2) to (3, 3)
      // (2, 2) & (2, 3) covered by 1 1x2 unit
      const wide = makeWeapon({
        id: 'wide_cannon',
        configId: 'wide_cfg',
        footprint: { width: 2, height: 1 },
        anchor: { row: 2, col: 2 }
      });
      // (3, 2) and (3, 3) covered by 2 1x1 units
      const unitA = makeWeapon({ id: 'unit_a', configId: 'ua_cfg', anchor: { row: 3, col: 2 } });
      const unitB = makeWeapon({ id: 'unit_b', configId: 'ub_cfg', anchor: { row: 3, col: 3 } });

      grid.placeWeapon(wide, { row: 2, col: 2 });
      grid.placeWeapon(unitA, { row: 3, col: 2 });
      grid.placeWeapon(unitB, { row: 3, col: 3 });

      const res = SmartSwapController.tryDropFromGrid(grid, catapult, { row: 2, col: 2 });

      expect(res.success).toBe(true);
      expect(res.type).toBe('SMART_SWAP');
      expect(res.displacedWeapons?.length).toBe(3);

      // Verify wide unit was displaced to valid 1x2 anchor
      const foundWide = grid.getAllWeapons().find(w => w.id === 'wide_cannon');
      expect(foundWide).toBeDefined();
      expect(foundWide!.anchor.col + 2).toBeLessThanOrEqual(GRID_COLS);
      expect(grid.getWeaponAt(foundWide!.anchor.row, foundWide!.anchor.col)?.id).toBe('wide_cannon');
      expect(grid.getWeaponAt(foundWide!.anchor.row, foundWide!.anchor.col + 1)?.id).toBe('wide_cannon');
    });

    it('3C: Fortress-only unit displacement failure triggers clean safe rollback', () => {
      // Catapult at (1, 1) [4 cells: (1,1), (1,2), (2,1), (2,2)]
      const catapult = makeWeapon({
        id: 'cata_test',
        configId: 'cata_cfg',
        footprint: { width: 2, height: 2 },
        anchor: { row: 1, col: 1 }
      });
      grid.placeWeapon(catapult, { row: 1, col: 1 });

      // Fill Row 0 completely except (0, 1) and (0, 2)
      // At (0, 1) place a fortress-only unit
      const fortressUnit = makeWeapon({
        id: 'fortress_wall_gun',
        configId: 'fortress_cfg',
        isFortressOnly: true,
        footprint: { width: 1, height: 1 },
        anchor: { row: 0, col: 1 }
      });
      grid.placeWeapon(fortressUnit, { row: 0, col: 1 });

      // Fill remaining Row 0 cells with fortress units
      grid.placeWeapon(makeWeapon({ id: 'f0', isFortressOnly: true, anchor: { row: 0, col: 0 } }), { row: 0, col: 0 });
      grid.placeWeapon(makeWeapon({ id: 'f2', isFortressOnly: true, anchor: { row: 0, col: 2 } }), { row: 0, col: 2 });
      grid.placeWeapon(makeWeapon({ id: 'f3', isFortressOnly: true, anchor: { row: 0, col: 3 } }), { row: 0, col: 3 });
      grid.placeWeapon(makeWeapon({ id: 'f4', isFortressOnly: true, anchor: { row: 0, col: 4 } }), { row: 0, col: 4 });
      // Now Row 0 has ZERO empty cells!

      // Fill all other rows except catapult's cells
      for (let r = 1; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r >= 1 && r <= 2 && c >= 1 && c <= 2) continue; // catapult's area
          grid.placeWeapon(makeWeapon({ id: `fill_${r}_${c}`, anchor: { row: r, col: c } }), { row: r, col: c });
        }
      }

      // Catapult attempts to move to (0, 1), which overlaps fortressUnit at (0, 1)
      // Target anchor (0, 1) would place catapult at Row 0..1, Col 1..2
      // If catapult moves, fortressUnit MUST displace.
      // But fortressUnit can ONLY be placed on Row 0!
      // Catapult's vacated cells are at rows 1..2. Row 0 has no space.
      // Fortress unit CANNOT find a valid anchor on Row 0!
      const res = SmartSwapController.tryDropFromGrid(grid, catapult, { row: 0, col: 1 });

      expect(res.success).toBe(false);
      expect(res.type).toBe('BOUNCE_BACK');

      // State rollback verification
      expect(grid.getWeaponAt(0, 1)?.id).toBe('fortress_wall_gun');
      expect(grid.getWeaponAt(1, 1)?.id).toBe('cata_test');
    });
  });

  // =========================================================================
  // 4. Safe rollback verification: Grid & bench states remain untouched upon bounce-back
  // =========================================================================
  describe('Boundary Condition 4: Safe Rollback State Verification', () => {
    it('4A: tryDropFromGrid rollback preserves exact matrix references and empty cell count', () => {
      // Place 10 units on grid
      for (let i = 0; i < 10; i++) {
        const r = Math.floor(i / 5) + 1;
        const c = i % 5;
        grid.placeWeapon(makeWeapon({ id: `fixed_u_${i}`, anchor: { row: r, col: c } }), { row: r, col: c });
      }

      const activeWeapon = grid.getWeaponAt(1, 0)!;

      // Take deep snapshot
      const snapshotBefore = grid.getSnapshot();

      // Trigger illegal drop: out of bounds
      const oobResult = SmartSwapController.tryDropFromGrid(grid, activeWeapon, { row: 5, col: 0 });
      expect(oobResult.success).toBe(false);
      expect(oobResult.type).toBe('BOUNCE_BACK');

      // Verify grid untouched
      const snapshotAfterOOB = grid.getSnapshot();
      expect(snapshotAfterOOB).toEqual(snapshotBefore);

      // Trigger illegal drop: fortress-only weapon into Row 1
      const fortressWeapon = makeWeapon({
        id: 'fort_test',
        isFortressOnly: true,
        anchor: { row: 0, col: 0 }
      });
      grid.placeWeapon(fortressWeapon, { row: 0, col: 0 });

      const snapBeforeFortress = grid.getSnapshot();
      const fortressInvalidRes = SmartSwapController.tryDropFromGrid(grid, fortressWeapon, { row: 1, col: 0 });
      expect(fortressInvalidRes.success).toBe(false);
      expect(fortressInvalidRes.type).toBe('BOUNCE_BACK');
      expect(grid.getSnapshot()).toEqual(snapBeforeFortress);
    });

    it('4B: tryDropFromBench rollback preserves bench array and grid matrix without partial removals', () => {
      // 5 units on bench
      for (let i = 0; i < 5; i++) {
        grid.placeOnBench(makeWeapon({ id: `bench_rollback_${i}` }), i);
      }
      // Place 1 unit on grid at (0, 0)
      grid.placeWeapon(makeWeapon({ id: 'grid_u0', anchor: { row: 0, col: 0 } }), { row: 0, col: 0 });

      const snapBenchBefore = grid.getSnapshot();

      // Try drop out of bounds
      const outBenchWeapon = grid.getBenchSlot(0)!;
      const resOOB = SmartSwapController.tryDropFromBench(grid, outBenchWeapon, 0, { row: -1, col: 0 });
      expect(resOOB.success).toBe(false);
      expect(resOOB.type).toBe('BOUNCE_BACK');
      expect(grid.getSnapshot()).toEqual(snapBenchBefore);

      // Try drop fortress unit from bench to Row 2
      const fortBenchWeapon = makeWeapon({ id: 'fort_b', isFortressOnly: true });
      grid.placeOnBench(fortBenchWeapon, 1);
      const snapFortBefore = grid.getSnapshot();

      const resFort = SmartSwapController.tryDropFromBench(grid, fortBenchWeapon, 1, { row: 2, col: 0 });
      expect(resFort.success).toBe(false);
      expect(resFort.type).toBe('BOUNCE_BACK');
      expect(grid.getSnapshot()).toEqual(snapFortBefore);
    });
  });

  // =========================================================================
  // 5. Multi-cell Displaced Weapon Smart Swap Edge Case
  // =========================================================================
  describe('Boundary Condition 5: Multi-cell Displaced Unit Vacancy in Smart Swap', () => {
    it('5A: Displacing a multi-cell (1x2) weapon should succeed when an empty cell is contiguous with its own vacated cells', () => {
      // Setup:
      // Weapon A: 1x1 at (0, 0)
      // Weapon B: 1x2 at (2, 1), occupying (2, 1) and (2, 2)
      // Cell (2, 0) is empty!
      // All other cells on grid are filled with 1x1 fillers, so there are NO OTHER contiguous 1x2 empty spots!
      const weaponA = makeWeapon({ id: 'unit_a', configId: 'ua', anchor: { row: 0, col: 0 } });
      const weaponB = makeWeapon({
        id: 'unit_b_1x2',
        configId: 'ub_wide',
        footprint: { width: 2, height: 1 },
        anchor: { row: 2, col: 1 }
      });

      grid.placeWeapon(weaponA, { row: 0, col: 0 });
      grid.placeWeapon(weaponB, { row: 2, col: 1 });

      // Fill all other cells except (2, 0) and weaponA's old cell (0, 0)
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if ((r === 0 && c === 0) || (r === 2 && (c === 0 || c === 1 || c === 2))) continue;
          grid.placeWeapon(makeWeapon({ id: `filler_${r}_${c}`, anchor: { row: r, col: c } }), { row: r, col: c });
        }
      }

      // At this point:
      // (2, 0) is empty.
      // (2, 1) and (2, 2) occupied by weaponB.
      // (0, 0) occupied by weaponA.
      // Rest of grid is completely filled with 1x1 units.
      // Total empty cells on grid = 1 (at (2, 0)).
      expect(grid.getEmptyCells()).toEqual([{ row: 2, col: 0 }]);

      // Now drag weaponA to (2, 2)!
      // WeaponA occupies (2, 2).
      // WeaponB must displace.
      // WeaponB is 1x2. It could move 1 step left to anchor (2, 0), occupying (2, 0) [empty] and (2, 1) [its own vacated cell]!
      const res = SmartSwapController.tryDropFromGrid(grid, weaponA, { row: 2, col: 2 });

      // Defect verification: Under ideal Smart Swap, weaponB should shift left to (2, 0)
      // Currently fails because weaponB's own vacated cell (2, 1) is not added to availableCellsSet
      expect(res.success).toBe(true);
      expect(res.type).toBe('SMART_SWAP');
    });


    it('5B: Displacing a multi-cell (2x2) catapult when adjacent cells are empty', () => {
      // 2x2 catapult at (1, 1), occupying (1,1), (1,2), (2,1), (2,2)
      const catapult = makeWeapon({
        id: 'catapult_2x2',
        configId: 'cata_cfg',
        footprint: { width: 2, height: 2 },
        anchor: { row: 1, col: 1 }
      });
      // 1x1 weapon at (0, 0)
      const lance = makeWeapon({ id: 'lance_1x1', configId: 'lance_cfg', anchor: { row: 0, col: 0 } });

      grid.placeWeapon(catapult, { row: 1, col: 1 });
      grid.placeWeapon(lance, { row: 0, col: 0 });

      // Cells (1, 3) and (2, 3) are empty!
      // Fill all other cells except (0,0), catapult's cells, and (1,3), (2,3)
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if ((r === 0 && c === 0) || (r >= 1 && r <= 2 && c >= 1 && c <= 3)) continue;
          grid.placeWeapon(makeWeapon({ id: `fill_${r}_${c}`, anchor: { row: r, col: c } }), { row: r, col: c });
        }
      }

      // Drop lance onto (1, 1) (top-left of catapult)
      // Catapult could shift 1 column right to anchor (1, 2), occupying (1,2), (1,3), (2,2), (2,3)
      // Manhattan distance = 1!
      const res = SmartSwapController.tryDropFromGrid(grid, lance, { row: 1, col: 1 });
      
      // Defect verification: Under ideal Smart Swap, this should succeed by shifting right 1 step
      // Currently fails because catapult's own cells (1,2) and (2,2) are not added to availableCellsSet
      expect(res.success).toBe(true);
      expect(res.type).toBe('SMART_SWAP');
    });
  });
});


