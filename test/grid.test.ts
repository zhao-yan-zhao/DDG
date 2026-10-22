/**
 * 《孤城神机营》- Comprehensive Automated Test Suite for Milestone M1
 * Covers:
 * - 5x5 Grid Model and Bench Model
 * - Multi-grid Footprints (1x1, 1x2, 2x1, 2x2) and Anchor Bounds
 * - Row 0 Fortress Exclusive Validation (isFortressOnly)
 * - 2-in-1 Star Upgrade State Machine (★1 -> ★2 -> ★3 -> ★4, Max Star Cap)
 * - Smart Swap Manhattan Distance Displacement and Bench Capacity Bounce Back
 * - Touch Y-Offset (+80px) and HitTest Coordinate Projections
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GridModel, GRID_ROWS, GRID_COLS, BENCH_SLOTS } from '../src/core/grid/grid-model';
import { StarUpgradeStateMachine, MAX_STAR_LEVEL } from '../src/core/grid/star-upgrade';
import { SmartSwapController, SmartSwapAlgorithm } from '../src/core/grid/smart-swap';
import {
  TouchCoordinateMapper,
  TouchController,
  TOUCH_Y_OFFSET,
  GRID_CONFIG,
  BENCH_CONFIG
} from '../src/presentation/touch/touch-controller';
import { WeaponInstance, GridFootprint } from '../src/core/types';

function createMockWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: overrides.id || `weapon_${Math.random().toString(36).substring(2, 9)}`,
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

describe('M1: 5x5 Grid & Bench Data Model', () => {
  let grid: GridModel;

  beforeEach(() => {
    grid = new GridModel();
  });

  it('should initialize empty 5x5 grid and 5 bench slots', () => {
    expect(grid.getAllWeapons().length).toBe(0);
    expect(grid.getEmptyCells().length).toBe(25);
    expect(grid.getEmptyBenchSlotsCount()).toBe(5);
    expect(grid.getAllBenchWeapons().length).toBe(0);
  });

  it('should place, retrieve and remove a 1x1 weapon', () => {
    const weapon = createMockWeapon({ id: 'w1', anchor: { row: 2, col: 2 } });
    const placed = grid.placeWeapon(weapon, { row: 2, col: 2 });
    expect(placed).toBe(true);
    expect(grid.isCellOccupied(2, 2)).toBe(true);
    expect(grid.getWeaponAt(2, 2)?.id).toBe('w1');
    expect(grid.getEmptyCells().length).toBe(24);

    const removed = grid.removeWeapon('w1');
    expect(removed?.id).toBe('w1');
    expect(grid.isCellOccupied(2, 2)).toBe(false);
    expect(grid.getEmptyCells().length).toBe(25);
  });

  it('should support bench operations: place, find, remove, count', () => {
    const weaponA = createMockWeapon({ id: 'bench_1' });
    const weaponB = createMockWeapon({ id: 'bench_2' });

    expect(grid.placeOnBench(weaponA, 0)).toBe(true);
    expect(grid.addToFirstEmptyBenchSlot(weaponB)).toBe(1);

    expect(grid.getBenchSlot(0)?.id).toBe('bench_1');
    expect(grid.getBenchSlot(1)?.id).toBe('bench_2');
    expect(grid.findBenchSlotByWeaponId('bench_2')).toBe(1);
    expect(grid.getEmptyBenchSlotsCount()).toBe(3);

    const removed = grid.removeBenchWeapon('bench_1');
    expect(removed?.id).toBe('bench_1');
    expect(grid.getBenchSlot(0)).toBeNull();
    expect(grid.getEmptyBenchSlotsCount()).toBe(4);
  });
});

describe('M1: Multi-grid Footprints (1x1, 1x2, 2x1, 2x2) & Bounds', () => {
  let grid: GridModel;

  beforeEach(() => {
    grid = new GridModel();
  });

  it('1x1: should occupy exactly 1 cell and obey bounds [0..4]', () => {
    const w1 = createMockWeapon({ footprint: { width: 1, height: 1 } });
    expect(grid.validatePlacement(w1, { row: 0, col: 0 }).valid).toBe(true);
    expect(grid.validatePlacement(w1, { row: 4, col: 4 }).valid).toBe(true);
    expect(grid.validatePlacement(w1, { row: 5, col: 0 }).valid).toBe(false);
    expect(grid.validatePlacement(w1, { row: 0, col: 5 }).valid).toBe(false);
    expect(grid.validatePlacement(w1, { row: -1, col: 0 }).valid).toBe(false);

    grid.placeWeapon(w1, { row: 3, col: 3 });
    const cells = grid.getOccupiedCells(w1.footprint, { row: 3, col: 3 });
    expect(cells).toEqual([{ row: 3, col: 3 }]);
  });

  it('1x2 (vertical): occupies 2 vertical cells, row anchor max 3', () => {
    const cannon = createMockWeapon({
      id: 'cannon_1',
      footprint: { width: 1, height: 2 } // 1x2
    });
    // Valid anchor row in [0..3]
    expect(grid.validatePlacement(cannon, { row: 3, col: 2 }).valid).toBe(true);
    // Invalid anchor row 4 (row 4 + height 2 = 6 > 5)
    const invalidRes = grid.validatePlacement(cannon, { row: 4, col: 2 });
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.code).toBe('OUT_OF_BOUNDS');

    grid.placeWeapon(cannon, { row: 1, col: 2 });
    expect(grid.getWeaponAt(1, 2)?.id).toBe('cannon_1');
    expect(grid.getWeaponAt(2, 2)?.id).toBe('cannon_1');
    expect(grid.getWeaponAt(0, 2)).toBeNull();
  });

  it('2x1 (horizontal): occupies 2 horizontal cells, col anchor max 3', () => {
    const ballista = createMockWeapon({
      id: 'ballista_1',
      footprint: { width: 2, height: 1 } // 2x1
    });
    // Valid anchor col in [0..3]
    expect(grid.validatePlacement(ballista, { row: 2, col: 3 }).valid).toBe(true);
    // Invalid anchor col 4 (col 4 + width 2 = 6 > 5)
    const invalidRes = grid.validatePlacement(ballista, { row: 2, col: 4 });
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.code).toBe('OUT_OF_BOUNDS');

    grid.placeWeapon(ballista, { row: 2, col: 1 });
    expect(grid.getWeaponAt(2, 1)?.id).toBe('ballista_1');
    expect(grid.getWeaponAt(2, 2)?.id).toBe('ballista_1');
    expect(grid.getWeaponAt(2, 3)).toBeNull();
  });

  it('2x2 (田字四格): occupies 4 cells, anchor row max 3, col max 3', () => {
    const catapult = createMockWeapon({
      id: 'catapult_1',
      footprint: { width: 2, height: 2 } // 2x2
    });
    expect(grid.validatePlacement(catapult, { row: 3, col: 3 }).valid).toBe(true);
    expect(grid.validatePlacement(catapult, { row: 4, col: 0 }).valid).toBe(false);
    expect(grid.validatePlacement(catapult, { row: 0, col: 4 }).valid).toBe(false);

    grid.placeWeapon(catapult, { row: 1, col: 1 });
    const cells = grid.getOccupiedCells(catapult.footprint, { row: 1, col: 1 });
    expect(cells).toHaveLength(4);
    expect(grid.getWeaponAt(1, 1)?.id).toBe('catapult_1');
    expect(grid.getWeaponAt(2, 1)?.id).toBe('catapult_1');
    expect(grid.getWeaponAt(1, 2)?.id).toBe('catapult_1');
    expect(grid.getWeaponAt(2, 2)?.id).toBe('catapult_1');
    expect(grid.getEmptyCells().length).toBe(21);
  });

  it('should reject invalid footprints such as 3x1 or 0x0', () => {
    const invalidWeapon = createMockWeapon({
      footprint: { width: 3, height: 1 } as GridFootprint
    });
    const result = grid.validatePlacement(invalidWeapon, { row: 0, col: 0 });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('INVALID_FOOTPRINT');
  });
});

describe('M1: Row 0 Battlements (女墙) Exclusive Validation', () => {
  let grid: GridModel;

  beforeEach(() => {
    grid = new GridModel();
  });

  it('Fortress weapon (isFortressOnly == true) on Row 0 is VALID', () => {
    const barricade = createMockWeapon({
      id: 'barricade_1',
      configId: 'iron_barricade',
      name: '铁索拒马',
      faction: 'fortress',
      isFortressOnly: true,
      footprint: { width: 1, height: 1 }
    });

    const res = grid.validatePlacement(barricade, { row: 0, col: 2 });
    expect(res.valid).toBe(true);
    expect(res.code).toBe('VALID');

    const placed = grid.placeWeapon(barricade, { row: 0, col: 2 });
    expect(placed).toBe(true);
  });

  it('Fortress weapon on Row 1~4 MUST be rejected with FORTRESS_ROW_INVALID', () => {
    const oilTank = createMockWeapon({
      id: 'oil_1',
      configId: 'fire_oil_tank',
      name: '猛火油柜',
      faction: 'fortress',
      isFortressOnly: true,
      footprint: { width: 1, height: 1 }
    });

    for (let r = 1; r <= 4; r++) {
      const res = grid.validatePlacement(oilTank, { row: r, col: 0 });
      expect(res.valid).toBe(false);
      expect(res.code).toBe('FORTRESS_ROW_INVALID');
      expect(res.error).toBe('城防工事仅可布置于最前排女墙！');
      expect(grid.placeWeapon(oilTank, { row: r, col: 0 })).toBe(false);
    }
  });

  it('Non-fortress weapons can be placed on Row 0 as well as Row 1~4', () => {
    const gun = createMockWeapon({
      configId: 'fire_lance',
      isFortressOnly: false
    });

    expect(grid.validatePlacement(gun, { row: 0, col: 0 }).valid).toBe(true);
    expect(grid.validatePlacement(gun, { row: 1, col: 0 }).valid).toBe(true);
    expect(grid.validatePlacement(gun, { row: 4, col: 4 }).valid).toBe(true);
  });

  it('Smart Swap bounces back when fortress weapon is dropped on Row 1~4', () => {
    const fortress = createMockWeapon({
      id: 'fortress_a',
      isFortressOnly: true,
      anchor: { row: 0, col: 0 }
    });
    grid.placeWeapon(fortress, { row: 0, col: 0 });

    const dropResult = SmartSwapController.tryDropFromGrid(grid, fortress, { row: 2, col: 0 });
    expect(dropResult.success).toBe(false);
    expect(dropResult.type).toBe('BOUNCE_BACK');
    expect(dropResult.message).toContain('城防工事仅可布置于最前排女墙');
    // State remains unchanged
    expect(grid.getWeaponAt(0, 0)?.id).toBe('fortress_a');
    expect(grid.getWeaponAt(2, 0)).toBeNull();
  });
});

describe('M1: 2-in-1 Star Upgrade State Machine', () => {
  it('merges two same-config, same-star weapons (★1 + ★1 -> ★2)', () => {
    const gunA = createMockWeapon({ id: 'gun_a', configId: 'fire_lance', star: 1, baseAtk: 50 });
    const gunB = createMockWeapon({ id: 'gun_b', configId: 'fire_lance', star: 1, baseAtk: 50, anchor: { row: 1, col: 1 } });

    const evalResult = StarUpgradeStateMachine.evaluateMerge(
      gunA,
      gunB,
      { row: 1, col: 1 },
      gunB.anchor
    );

    expect(evalResult.canMerge).toBe(true);
    expect(evalResult.mergedWeapon?.star).toBe(2);
    expect(evalResult.mergedWeapon?.baseAtk).toBe(Math.round(50 * 1.8));
  });

  it('advances through ★2 -> ★3 -> ★4', () => {
    const star2A = createMockWeapon({ configId: 'fire_lance', star: 2 });
    const star2B = createMockWeapon({ configId: 'fire_lance', star: 2 });
    const res3 = StarUpgradeStateMachine.executeMerge(star2A, star2B);
    expect(res3.star).toBe(3);

    const star3A = createMockWeapon({ configId: 'fire_lance', star: 3 });
    const star3B = createMockWeapon({ configId: 'fire_lance', star: 3 });
    const res4 = StarUpgradeStateMachine.executeMerge(star3A, star3B);
    expect(res4.star).toBe(4);
  });

  it('rejects merging beyond ★4 (boundary check)', () => {
    expect(MAX_STAR_LEVEL).toBe(4);
    const star4A = createMockWeapon({ configId: 'fire_lance', star: 4 });
    const star4B = createMockWeapon({ configId: 'fire_lance', star: 4 });

    const check = StarUpgradeStateMachine.canMergeWeapons(star4A, star4B);
    expect(check.canMerge).toBe(false);
    expect(check.reason).toBe('MAX_STAR_REACHED');

    expect(() => StarUpgradeStateMachine.executeMerge(star4A, star4B)).toThrow(
      '无法执行升星合成: MAX_STAR_REACHED'
    );
  });

  it('rejects merging different weapon types or different stars', () => {
    const gun = createMockWeapon({ configId: 'fire_lance', star: 1 });
    const cannon = createMockWeapon({ configId: 'red_cannon', star: 1 });
    const gunStar2 = createMockWeapon({ configId: 'fire_lance', star: 2 });

    expect(StarUpgradeStateMachine.canMergeWeapons(gun, cannon).reason).toBe('CONFIG_MISMATCH');
    expect(StarUpgradeStateMachine.canMergeWeapons(gun, gunStar2).reason).toBe('STAR_MISMATCH');
  });

  it('checks overlap ratio threshold >= 50% for multi-grid merge', () => {
    const catapultA = createMockWeapon({
      configId: 'catapult',
      star: 1,
      footprint: { width: 2, height: 2 }
    });
    const catapultB = createMockWeapon({
      configId: 'catapult',
      star: 1,
      footprint: { width: 2, height: 2 },
      anchor: { row: 0, col: 0 }
    });

    // 2x2 overlapping at (1, 1): overlap is (1, 1) cell only (1 / 4 = 25% < 50%)
    const partialOverlap = StarUpgradeStateMachine.evaluateMerge(
      catapultA,
      catapultB,
      { row: 1, col: 1 },
      catapultB.anchor,
      0.50
    );
    expect(partialOverlap.canMerge).toBe(false);
    expect(partialOverlap.reason).toBe('INSUFFICIENT_OVERLAP');

    // 2x2 overlapping at (0, 1): overlap is 2 cells (2 / 4 = 50% >= 50%)
    const halfOverlap = StarUpgradeStateMachine.evaluateMerge(
      catapultA,
      catapultB,
      { row: 0, col: 1 },
      catapultB.anchor,
      0.50
    );
    expect(halfOverlap.canMerge).toBe(true);
  });
});

describe('M1: Smart Swap (智能挤位滑移) Algorithm', () => {
  let grid: GridModel;

  beforeEach(() => {
    grid = new GridModel();
  });

  it('displaces covered unit to nearest empty cell using Manhattan distance', () => {
    // Weapon A at (1, 1), Weapon B at (2, 2)
    const weaponA = createMockWeapon({ id: 'unit_a', configId: 'lance_a', star: 1, anchor: { row: 1, col: 1 } });
    const weaponB = createMockWeapon({ id: 'unit_b', configId: 'lance_b', star: 1, anchor: { row: 2, col: 2 } });

    grid.placeWeapon(weaponA, { row: 1, col: 1 });
    grid.placeWeapon(weaponB, { row: 2, col: 2 });

    // Drag Weapon A to (2, 2) covering Weapon B
    const result = SmartSwapController.tryDropFromGrid(grid, weaponA, { row: 2, col: 2 });

    expect(result.success).toBe(true);
    expect(result.type).toBe('SMART_SWAP');
    expect(result.displacedWeapons).toBeDefined();
    expect(result.displacedWeapons?.[0].id).toBe('unit_b');

    // Weapon A is now at (2, 2)
    expect(grid.getWeaponAt(2, 2)?.id).toBe('unit_a');

    // Weapon B is displaced to a nearest valid cell (|r - 2| + |c - 2| = 1)
    const newPosB = grid.getAllWeapons().find(w => w.id === 'unit_b')?.anchor;
    expect(newPosB).toBeDefined();
    const distance = Math.abs(newPosB!.row - 2) + Math.abs(newPosB!.col - 2);
    expect(distance).toBe(1);
  });

  it('direct swap: two weapons swap places cleanly', () => {
    // Fill entire grid with filler units except (0, 0) and (4, 4)
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if ((r === 0 && c === 0) || (r === 4 && c === 4)) continue;
        grid.placeWeapon(
          createMockWeapon({
            id: `filler_${r}_${c}`,
            configId: `type_${r}_${c}`,
            anchor: { row: r, col: c }
          }),
          { row: r, col: c }
        );
      }
    }

    const weapon1 = createMockWeapon({ id: 'w1', configId: 'type_1', anchor: { row: 0, col: 0 } });
    const weapon2 = createMockWeapon({ id: 'w2', configId: 'type_2', anchor: { row: 4, col: 4 } });

    grid.placeWeapon(weapon1, { row: 0, col: 0 });
    grid.placeWeapon(weapon2, { row: 4, col: 4 });

    const res = SmartSwapAlgorithm.evaluateSmartSwap(grid, weapon1, { row: 4, col: 4 });
    expect(res.success).toBe(true);
    expect(grid.getWeaponAt(4, 4)?.id).toBe('w1');
    expect(grid.getWeaponAt(0, 0)?.id).toBe('w2');
  });

  it('bounces back safely without mutating grid state when grid has insufficient space', () => {
    // Fill entire 5x5 grid completely
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        grid.placeWeapon(
          createMockWeapon({
            id: `filler_${r}_${c}`,
            configId: `type_${r}_${c}`,
            anchor: { row: r, col: c }
          }),
          { row: r, col: c }
        );
      }
    }

    // Now attempt to drop a 2x2 weapon from outside onto (1, 1) without merge
    // Grid has 0 empty cells, 2x2 covers 4 1x1 units, but can only free up 4 cells which 2x2 takes!
    const bigWeapon = createMockWeapon({
      id: 'big_weapon',
      configId: 'unique_catapult',
      footprint: { width: 2, height: 2 },
      anchor: { row: 0, col: 0 }
    });

    const dropResult = SmartSwapController.tryDropFromGrid(grid, bigWeapon, { row: 1, col: 1 });
    expect(dropResult.success).toBe(false);
    expect(dropResult.type).toBe('BOUNCE_BACK');

    // All original 25 weapons are completely intact
    expect(grid.getAllWeapons().length).toBe(25);
    expect(grid.getWeaponAt(1, 1)?.id).toBe('filler_1_1');
  });

  it('swap from bench: displaces covered weapons to bench if slots are available', () => {
    const benchWeapon = createMockWeapon({ id: 'bench_weapon', configId: 'type_x' });
    const gridTarget = createMockWeapon({ id: 'grid_target', configId: 'type_y', anchor: { row: 2, col: 2 } });

    grid.placeOnBench(benchWeapon, 0);
    grid.placeWeapon(gridTarget, { row: 2, col: 2 });

    const res = SmartSwapController.tryDropFromBench(grid, benchWeapon, 0, { row: 2, col: 2 });
    expect(res.success).toBe(true);
    expect(res.type).toBe('BENCH_SWAP');

    // Bench weapon is now on grid
    expect(grid.getWeaponAt(2, 2)?.id).toBe('bench_weapon');
    // Grid target is displaced to bench
    expect(grid.getBenchSlot(0)?.id).toBe('grid_target');
  });

  it('swap from bench: bounces back if bench slots are insufficient', () => {
    // 2x2 weapon on bench
    const benchCatapult = createMockWeapon({
      id: 'bench_catapult',
      configId: 'catapult',
      footprint: { width: 2, height: 2 }
    });
    grid.placeOnBench(benchCatapult, 0);

    // Place 4 distinct units on grid covering (1, 1) to (2, 2)
    grid.placeWeapon(createMockWeapon({ id: 'g1', configId: 'c1' }), { row: 1, col: 1 });
    grid.placeWeapon(createMockWeapon({ id: 'g2', configId: 'c2' }), { row: 1, col: 2 });
    grid.placeWeapon(createMockWeapon({ id: 'g3', configId: 'c3' }), { row: 2, col: 1 });
    grid.placeWeapon(createMockWeapon({ id: 'g4', configId: 'c4' }), { row: 2, col: 2 });

    // Fill the remaining 4 bench slots (slots 1..4)
    for (let i = 1; i < BENCH_SLOTS; i++) {
      grid.placeOnBench(createMockWeapon({ id: `bench_fill_${i}`, configId: `bf_${i}` }), i);
    }

    // Now bench has 0 empty slots. Displacing 4 units requires 4 slots, but bench can only free 1 slot (benchCatapult's slot)
    const res = SmartSwapController.tryDropFromBench(grid, benchCatapult, 0, { row: 1, col: 1 });
    expect(res.success).toBe(false);
    expect(res.type).toBe('BOUNCE_BACK');
    expect(res.message).toContain('备战席槽位不足');

    // State remains unaltered
    expect(grid.getBenchSlot(0)?.id).toBe('bench_catapult');
    expect(grid.getWeaponAt(1, 1)?.id).toBe('g1');
  });
});

describe('M1: Touch Y-Offset (+80px) & Coordinate Mapping', () => {
  it('validates GRID_CONFIG and BENCH_CONFIG constants', () => {
    expect(GRID_CONFIG.rows).toBe(5);
    expect(GRID_CONFIG.cols).toBe(5);
    expect(GRID_CONFIG.cellSize).toBe(72);
    expect(BENCH_CONFIG.slotCount).toBe(5);
    expect(BENCH_CONFIG.slotSize).toBe(80);
  });

  it('touchToVisualPosition shifts Y coordinate upwards by 80px', () => {
    const touch = { x: 300, y: 400 };
    const visual = TouchCoordinateMapper.touchToVisualPosition(touch);
    expect(visual.x).toBe(300);
    expect(visual.y).toBe(400 - TOUCH_Y_OFFSET); // 320 px
  });

  it('visualToHitTestPoint aligns with visual center', () => {
    const visual = { x: 300, y: 320 };
    const hitTest = TouchCoordinateMapper.visualToHitTestPoint(visual);
    expect(hitTest.x).toBe(300);
    expect(hitTest.y).toBe(320);
  });

  it('gridToScreen and screenToGrid are accurate and consistent', () => {
    // Row 0, Col 0: Frontline cell in front of fortress gate
    // cellW = 72, cellH = 72: X = 195 + 36 = 231, Y = 860 + 36 = 896
    const screenPos00 = TouchCoordinateMapper.gridToScreen(0, 0);
    expect(screenPos00.x).toBe(231);
    expect(screenPos00.y).toBe(896);

    const gridPos00 = TouchCoordinateMapper.screenToGrid(screenPos00);
    expect(gridPos00).toEqual({ row: 0, col: 0 });

    // Row 4, Col 4: Top-right cell in courtyard (rear, narrower width 360px)
    // X = 195 + 4 * 72 + 36 = 519, Y = 620 - 3 * 75 - 37.5 = 358
    const screenPos44 = TouchCoordinateMapper.gridToScreen(4, 4);
    expect(screenPos44.x).toBe(519);
    expect(screenPos44.y).toBe(358);

    const gridPos44 = TouchCoordinateMapper.screenToGrid(screenPos44);
    expect(gridPos44).toEqual({ row: 4, col: 4 });

    // Row 1, Col 0: Bottom-left cell in courtyard (front, wider width 450px)
    // X = 150 + 45 = 195, Y = 620 - 37.5 = 583
    const screenPos10 = TouchCoordinateMapper.gridToScreen(1, 0);
    expect(screenPos10.x).toBe(195);
    expect(screenPos10.y).toBe(583);

    const gridPos10 = TouchCoordinateMapper.screenToGrid(screenPos10);
    expect(gridPos10).toEqual({ row: 1, col: 0 });
  });

  it('gridToScreen calculates exact geometric center for multi-cell footprints (2x1, 1x2, 2x2)', () => {
    // 2x1 weapon at Row 4, Col 2 (occupies cols 2 and 3)
    // Row 4 cellW = 72, startX = 195. Col 2: [339, 411], Col 3: [411, 483]. Center = 411
    const screenPos2x1 = TouchCoordinateMapper.gridToScreen(4, 2, { width: 2, height: 1 });
    expect(screenPos2x1.x).toBe(411);
    expect(screenPos2x1.y).toBe(358); // Row 4 Y center

    // 1x2 weapon at Row 1, Col 0 (occupies rows 1 and 2, col 0)
    // Row 1 cellW = 90, startX = 150. Col 0 center = 150 + 45 = 195.
    // Vertical span: cellH = 75. Row 1: [545, 620], Row 2: [470, 545]. Combined center Y = 620 - 75 = 545
    const screenPos1x2 = TouchCoordinateMapper.gridToScreen(1, 0, { width: 1, height: 2 });
    expect(screenPos1x2.x).toBe(195);
    expect(screenPos1x2.y).toBe(545);

    // 2x2 weapon at Row 2, Col 1
    // Row 2 cellW = 84, startX = 165. Cols 1 & 2 center: 165 + (1 + 1) * 84 = 333
    // Vertical center for rows 2 & 3: 620 - (2 - 1 + 1) * 75 = 470
    const screenPos2x2 = TouchCoordinateMapper.gridToScreen(2, 1, { width: 2, height: 2 });
    expect(screenPos2x2.x).toBe(333);
    expect(screenPos2x2.y).toBe(470);
  });

  it('returns null when screen position is outside the 5x5 grid', () => {
    expect(TouchCoordinateMapper.screenToGrid({ x: 50, y: 50 })).toBeNull();
    expect(TouchCoordinateMapper.screenToGrid({ x: 100, y: 500 })).toBeNull();
    expect(TouchCoordinateMapper.screenToGrid({ x: 700, y: 500 })).toBeNull();
    expect(TouchCoordinateMapper.screenToGrid({ x: 300, y: 200 })).toBeNull();
    expect(TouchCoordinateMapper.screenToGrid({ x: 300, y: 700 })).toBeNull();
    expect(TouchCoordinateMapper.screenToGrid({ x: 300, y: 800 })).toBeNull();
    expect(TouchCoordinateMapper.screenToGrid({ x: 300, y: 1000 })).toBeNull();
  });

  it('benchSlotToScreen and screenToBenchSlot map accurately', () => {
    for (let slot = 0; slot < 5; slot++) {
      const screenPos = TouchCoordinateMapper.benchSlotToScreen(slot);
      expect(screenPos.y).toBe(1190); // Midpoint of bottom bench [1145, 1235]
      const resolvedSlot = TouchCoordinateMapper.screenToBenchSlot(screenPos);
      expect(resolvedSlot).toBe(slot);
    }

    expect(TouchCoordinateMapper.screenToBenchSlot({ x: 10, y: 1190 })).toBe(-1);
    expect(TouchCoordinateMapper.screenToBenchSlot({ x: 300, y: 300 })).toBe(-1);
  });

  it('TouchController enforces single pointer ID 0 locking and rejects secondary touches', () => {
    const controller = new TouchController();

    // Primary touch down
    const startOk = controller.onPointerDown(0, 300, 500, 'grid', 'weapon_1', { row: 0, col: 0 });
    expect(startOk).toBe(true);
    expect(controller.getDragState().isDragging).toBe(true);
    expect(controller.getDragState().visualPosition?.y).toBe(500 - TOUCH_Y_OFFSET);

    // Secondary touch down while dragging MUST be rejected
    const secondOk = controller.onPointerDown(1, 400, 600, 'grid', 'weapon_2');
    expect(secondOk).toBe(false);

    // Move pointer 0 updates visual position
    controller.onPointerMove(0, 300, 400);
    expect(controller.getDragState().currentTouch?.y).toBe(400);
    expect(controller.getDragState().visualPosition?.y).toBe(320);

    // Move with pointer 1 is ignored
    const moveIgnored = controller.onPointerMove(1, 999, 999);
    expect(moveIgnored).toBe(false);

    // End drag with pointer 0
    const endResult = controller.onPointerUp(0);
    expect(endResult.ended).toBe(true);
    expect(controller.getDragState().isDragging).toBe(false);
  });
});
