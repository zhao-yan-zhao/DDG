/**
 * 《孤城神机营》- Smart Swap (智能挤位滑移) Algorithm & Drag-and-Drop Handler
 * Pure headless domain logic (Zero DOM / Zero Phaser dependencies).
 */

import {
  GridPosition,
  WeaponInstance,
  DragActionResult
} from '../types';
import { GridModel, GRID_ROWS, GRID_COLS } from './grid-model';
import { StarUpgradeStateMachine } from './star-upgrade';

export class SmartSwapController {
  /**
   * Manhattan distance between two coordinates: |r1 - r2| + |c1 - c2|
   */
  public static manhattanDistance(posA: GridPosition, posB: GridPosition): number {
    return Math.abs(posA.row - posB.row) + Math.abs(posA.col - posB.col);
  }

  /**
   * Encodes cell position into set key string "row,col"
   */
  public static cellKey(pos: GridPosition): string {
    return `${pos.row},${pos.col}`;
  }

  /**
   * Decodes set key string into cell position
   */
  public static parseCellKey(key: string): GridPosition {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
  }

  /**
   * Handles dropping a weapon that is currently on the grid to a new target anchor.
   */
  public static tryDropFromGrid(
    grid: GridModel,
    sourceWeapon: WeaponInstance,
    targetAnchor: GridPosition
  ): DragActionResult {
    // 1. Placement legality check (bounds, footprint, fortress row 0 rule)
    const validation = grid.validatePlacement(sourceWeapon, targetAnchor);
    if (!validation.valid) {
      return {
        success: false,
        type: 'BOUNCE_BACK',
        message: validation.error || '非法落子位置'
      };
    }

    // If dropped at exact same anchor, no-op success
    if (
      sourceWeapon.anchor.row === targetAnchor.row &&
      sourceWeapon.anchor.col === targetAnchor.col
    ) {
      return {
        success: true,
        type: 'PLACE',
        message: '落子原位'
      };
    }

    // 2. Identify overlapping weapons (excluding sourceWeapon)
    const overlappingWeapons = grid.getOverlappingWeapons(
      sourceWeapon.footprint,
      targetAnchor,
      sourceWeapon.id
    );

    // Case A: Target cells are completely free
    if (overlappingWeapons.length === 0) {
      grid.placeWeapon(sourceWeapon, targetAnchor);
      return {
        success: true,
        type: 'PLACE',
        message: '落子成功'
      };
    }

    // Case B: 2-in-1 Star Upgrade Merge check
    // If overlapping exactly 1 weapon and conditions are met (same configId, same star)
    if (overlappingWeapons.length === 1) {
      const targetWeapon = overlappingWeapons[0];
      const mergeEval = StarUpgradeStateMachine.evaluateMerge(
        sourceWeapon,
        targetWeapon,
        targetAnchor,
        targetWeapon.anchor
      );

      if (mergeEval.canMerge && mergeEval.mergedWeapon) {
        // Execute merge:
        // Remove source weapon from grid
        grid.removeWeapon(sourceWeapon.id);
        // Place upgraded weapon at target position
        grid.placeWeapon(mergeEval.mergedWeapon, targetWeapon.anchor, true);

        return {
          success: true,
          type: 'MERGE',
          message: `升星成功！升至 ★${mergeEval.mergedWeapon.star}`,
          mergedWeapon: mergeEval.mergedWeapon
        };
      }
    }

    // Case C: Smart Swap (内部挤位滑移)
    // Calculate available cells pool:
    // All current empty cells + old cells occupied by sourceWeapon - target cells occupied by sourceWeapon
    const availableCellsSet = new Set<string>();

    for (const emptyCell of grid.getEmptyCells()) {
      availableCellsSet.add(this.cellKey(emptyCell));
    }
    for (const oldCell of grid.getOccupiedCells(sourceWeapon.footprint, sourceWeapon.anchor)) {
      availableCellsSet.add(this.cellKey(oldCell));
    }

    // Add vacated cells from all displaced weapons into available pool
    for (const displaced of overlappingWeapons) {
      for (const cell of grid.getOccupiedCells(displaced.footprint, displaced.anchor)) {
        availableCellsSet.add(this.cellKey(cell));
      }
    }

    // Remove cells that sourceWeapon will occupy at targetAnchor
    const targetCells = grid.getOccupiedCells(sourceWeapon.footprint, targetAnchor);
    for (const targetCell of targetCells) {
      availableCellsSet.delete(this.cellKey(targetCell));
    }

    // Sort overlapping weapons: place larger footprint units first
    const sortedDisplaced = [...overlappingWeapons].sort((a, b) => {
      const areaA = a.footprint.width * a.footprint.height;
      const areaB = b.footprint.width * b.footprint.height;
      return areaB - areaA;
    });

    const displacementAssignments: Array<{ weapon: WeaponInstance; newAnchor: GridPosition }> = [];
    const tempAvailableSet = new Set<string>(availableCellsSet);

    // Try to find nearest Manhattan anchor for each displaced weapon
    let allDisplacedPlaced = true;
    for (const displaced of sortedDisplaced) {
      const bestAnchor = this.findNearestValidAnchor(
        displaced,
        displaced.anchor,
        tempAvailableSet
      );

      if (!bestAnchor) {
        allDisplacedPlaced = false;
        break;
      }

      displacementAssignments.push({
        weapon: displaced,
        newAnchor: bestAnchor
      });

      // Reserve the cells occupied by this displaced weapon
      const occupiedByDisplaced = grid.getOccupiedCells(displaced.footprint, bestAnchor);
      for (const cell of occupiedByDisplaced) {
        tempAvailableSet.delete(this.cellKey(cell));
      }
    }

    if (!allDisplacedPlaced) {
      // Rollback and bounce back safely without mutating grid state
      return {
        success: false,
        type: 'BOUNCE_BACK',
        message: '可用空间不足，挤位失败并安全弹回！'
      };
    }

    // Apply displacements
    // 1. Remove all displaced weapons temporarily
    for (const displaced of sortedDisplaced) {
      grid.removeWeapon(displaced.id);
    }
    // 2. Place source weapon at targetAnchor
    grid.placeWeapon(sourceWeapon, targetAnchor, true);

    // 3. Place displaced weapons at their newly assigned anchors
    const displacedWeaponsResult: WeaponInstance[] = [];
    for (const assignment of displacementAssignments) {
      const weaponCopy: WeaponInstance = {
        ...assignment.weapon,
        anchor: { ...assignment.newAnchor }
      };
      grid.placeWeapon(weaponCopy, assignment.newAnchor, true);
      displacedWeaponsResult.push(weaponCopy);
    }

    return {
      success: true,
      type: 'SMART_SWAP',
      message: '智能挤位成功！',
      displacedWeapons: displacedWeaponsResult
    };
  }

  /**
   * Handles dropping a weapon from the Bench onto the 5x5 Grid.
   */
  public static tryDropFromBench(
    grid: GridModel,
    sourceWeapon: WeaponInstance,
    benchSlotIndex: number,
    targetAnchor: GridPosition
  ): DragActionResult {
    // 1. Validation check
    const validation = grid.validatePlacement(sourceWeapon, targetAnchor);
    if (!validation.valid) {
      return {
        success: false,
        type: 'BOUNCE_BACK',
        message: validation.error || '非法落子位置'
      };
    }

    // 2. Identify overlapping weapons
    const overlappingWeapons = grid.getOverlappingWeapons(
      sourceWeapon.footprint,
      targetAnchor
    );

    // Case A: Target cells are completely free
    if (overlappingWeapons.length === 0) {
      grid.removeBenchWeapon(sourceWeapon.id);
      grid.placeWeapon(sourceWeapon, targetAnchor);
      return {
        success: true,
        type: 'PLACE',
        message: '备战席器械上阵成功'
      };
    }

    // Case B: 2-in-1 Star Upgrade Merge check
    if (overlappingWeapons.length === 1) {
      const targetWeapon = overlappingWeapons[0];
      const mergeEval = StarUpgradeStateMachine.evaluateMerge(
        sourceWeapon,
        targetWeapon,
        targetAnchor,
        targetWeapon.anchor
      );

      if (mergeEval.canMerge && mergeEval.mergedWeapon) {
        // Remove source weapon from bench
        grid.removeBenchWeapon(sourceWeapon.id);
        // Place upgraded weapon at target position on grid
        grid.placeWeapon(mergeEval.mergedWeapon, targetWeapon.anchor, true);

        return {
          success: true,
          type: 'MERGE',
          message: `备战席合成升星成功！升至 ★${mergeEval.mergedWeapon.star}`,
          mergedWeapon: mergeEval.mergedWeapon
        };
      }
    }

    // Case C: Swap with Bench (备战席上阵挤位)
    // Vacated bench slot provides +1 available slot
    const currentEmptyBenchSlots = grid.getEmptyBenchSlotsCount();
    const isSourceOnBench = grid.getBenchSlot(benchSlotIndex)?.id === sourceWeapon.id;
    const availableBenchCapacity = currentEmptyBenchSlots + (isSourceOnBench ? 1 : 0);

    // Need to displace overlappingWeapons to bench
    if (overlappingWeapons.length > availableBenchCapacity) {
      return {
        success: false,
        type: 'BOUNCE_BACK',
        message: '备战席槽位不足，无法挤退器械，弹回原位！'
      };
    }

    // Sufficient space: Execute bench displacement
    // 1. Remove source weapon from bench
    grid.removeBenchWeapon(sourceWeapon.id);

    // 2. Remove all overlapping weapons from grid
    const displacedWeapons: WeaponInstance[] = [];
    for (const displaced of overlappingWeapons) {
      grid.removeWeapon(displaced.id);
      grid.addToFirstEmptyBenchSlot(displaced);
      displacedWeapons.push(displaced);
    }

    // 3. Place source weapon on grid
    grid.placeWeapon(sourceWeapon, targetAnchor, true);

    return {
      success: true,
      type: 'BENCH_SWAP',
      message: '备战席器械上阵，原器械退回备战席！',
      displacedWeapons
    };
  }

  /**
   * Finds the best anchor for a weapon within availableCellsSet that minimizes
   * Manhattan distance |r_new - r_orig| + |c_new - c_orig|.
   */
  public static findNearestValidAnchor(
    weapon: WeaponInstance,
    originalAnchor: GridPosition,
    availableCellsSet: Set<string>
  ): GridPosition | null {
    const { width, height } = weapon.footprint;

    let bestAnchor: GridPosition | null = null;
    let minDistance = Infinity;

    // Search all possible grid anchors
    for (let r = 0; r <= GRID_ROWS - height; r++) {
      // Row 0 constraint for fortress-only weapons
      if (weapon.isFortressOnly && r !== 0) {
        continue;
      }

      for (let c = 0; c <= GRID_COLS - width; c++) {
        // Check if all cells needed by this anchor are in availableCellsSet
        let allCellsAvailable = true;
        for (let dr = 0; dr < height; dr++) {
          for (let dc = 0; dc < width; dc++) {
            const key = `${r + dr},${c + dc}`;
            if (!availableCellsSet.has(key)) {
              allCellsAvailable = false;
              break;
            }
          }
          if (!allCellsAvailable) break;
        }

        if (allCellsAvailable) {
          const dist = this.manhattanDistance(originalAnchor, { row: r, col: c });
          if (dist < minDistance) {
            minDistance = dist;
            bestAnchor = { row: r, col: c };
          } else if (dist === minDistance && bestAnchor !== null) {
            // Deterministic tie-breaker: closer row, then closer col
            if (r < bestAnchor.row || (r === bestAnchor.row && c < bestAnchor.col)) {
              bestAnchor = { row: r, col: c };
            }
          }
        }
      }
    }

    return bestAnchor;
  }
}

/**
 * Authoritative SmartSwapAlgorithm facade matching E2E domain contracts
 */
export class SmartSwapAlgorithm {
  public static evaluateSmartSwap(
    grid: GridModel,
    sourceWeapon: WeaponInstance,
    targetAnchor: GridPosition
  ): DragActionResult {
    return SmartSwapController.tryDropFromGrid(grid, sourceWeapon, targetAnchor);
  }
}
