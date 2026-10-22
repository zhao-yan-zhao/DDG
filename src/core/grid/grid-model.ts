/**
 * 《孤城神机营》- 5x5 Battlements Grid & 5-slot Bench Model
 * Pure headless domain logic (Zero DOM / Zero Phaser dependencies).
 */

import {
  GridPosition,
  GridFootprint,
  WeaponInstance,
  PlacementValidationResult
} from '../types';
import { FrontlineDefenseManager } from '../defense/frontline-manager';

export const GRID_ROWS = 5;
export const GRID_COLS = 5;
export const BENCH_SLOTS = 5;

export class GridModel {
  /**
   * Optional flag to strictly enforce bidirectional Row 0 exclusivity.
   * When enabled, non-fortress weapons are forbidden on Row 0.
   * Default is true in active gameplay, while allowing legacy tests or specific setups to configure.
   */
  public enforceBidirectionalRow0: boolean = false;
  /**
   * 5x5 matrix cells.
   * Row 0 = bottom battlement (女墙), Row 4 = top tower (城楼).
   * Col 0 = leftmost, Col 4 = rightmost.
   */
  private matrix: (WeaponInstance | null)[][];

  /**
   * 5-slot bench array.
   */
  private bench: (WeaponInstance | null)[];

  constructor() {
    this.matrix = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );
    this.bench = Array.from({ length: BENCH_SLOTS }, () => null);
  }

  /**
   * Resets both grid matrix and bench to empty state.
   */
  public clear(): void {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        this.matrix[r][c] = null;
      }
    }
    for (let i = 0; i < BENCH_SLOTS; i++) {
      this.bench[i] = null;
    }
  }

  /**
   * Returns list of occupied cell coordinates for a weapon at a given anchor.
   */
  public getOccupiedCells(
    footprint: GridFootprint,
    anchor: GridPosition
  ): GridPosition[] {
    const cells: GridPosition[] = [];
    for (let dr = 0; dr < footprint.height; dr++) {
      for (let dc = 0; dc < footprint.width; dc++) {
        cells.push({
          row: anchor.row + dr,
          col: anchor.col + dc
        });
      }
    }
    return cells;
  }

  /**
   * Validates if a weapon with given anchor and footprint is structurally and rule-compliant.
   */
  public validatePlacement(
    weapon: WeaponInstance,
    anchor: GridPosition
  ): PlacementValidationResult {
    const { width, height } = weapon.footprint;

    // 1. Footprint bounds check
    if (width < 1 || width > 2 || height < 1 || height > 2) {
      return {
        valid: false,
        code: 'INVALID_FOOTPRINT',
        error: `无效器械占地规格: ${width}x${height}`
      };
    }

    // 2. Sand table boundaries check
    if (
      anchor.row < 0 ||
      anchor.col < 0 ||
      anchor.row + height > GRID_ROWS ||
      anchor.col + width > GRID_COLS
    ) {
      return {
        valid: false,
        code: 'OUT_OF_BOUNDS',
        error: '放置位置超出沙盘 5x5 网格边界！'
      };
    }

    // 3. Row 0 Battlement exclusive validation
    // 城防工事类 (isFortressOnly == true) 强制约束 row = 0 且 height = 1
    if (weapon.isFortressOnly) {
      if (anchor.row !== 0 || height !== 1) {
        return {
          valid: false,
          code: 'FORTRESS_ROW_INVALID',
          error: '城防工事仅可布置于最前排女墙！'
        };
      }
    } else if (this.enforceBidirectionalRow0) {
      // 开启双向互斥时，非城防工事类武器禁止占用 Row 0
      if (anchor.row === 0) {
        return {
          valid: false,
          code: 'NON_FORTRESS_ROW_INVALID',
          error: '女墙前哨仅限城防工事部署，火器重炮请布置于城楼内场！'
        };
      }
    }

    return { valid: true, code: 'VALID' };
  }

  /**
   * Check if a single cell is occupied.
   */
  public isCellOccupied(row: number, col: number): boolean {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      return true;
    }
    return this.matrix[row][col] !== null;
  }

  /**
   * Gets weapon instance at specified cell coordinate.
   */
  public getWeaponAt(row: number, col: number): WeaponInstance | null {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      return null;
    }
    return this.matrix[row][col];
  }

  /**
   * Finds all distinct weapons overlapping target anchor (excluding self weaponId).
   */
  public getOverlappingWeapons(
    footprint: GridFootprint,
    targetAnchor: GridPosition,
    excludeWeaponId?: string
  ): WeaponInstance[] {
    const overlappingMap = new Map<string, WeaponInstance>();
    const cells = this.getOccupiedCells(footprint, targetAnchor);

    for (const cell of cells) {
      if (
        cell.row >= 0 &&
        cell.row < GRID_ROWS &&
        cell.col >= 0 &&
        cell.col < GRID_COLS
      ) {
        const existing = this.matrix[cell.row][cell.col];
        if (existing && existing.id !== excludeWeaponId) {
          overlappingMap.set(existing.id, existing);
        }
      }
    }

    return Array.from(overlappingMap.values());
  }

  /**
   * Places a weapon on the grid at anchor.
   * If any cells are already occupied, returns false unless force is specified.
   */
  public placeWeapon(
    weapon: WeaponInstance,
    anchor: GridPosition,
    force: boolean = false
  ): boolean {
    const validation = this.validatePlacement(weapon, anchor);
    if (!validation.valid) {
      return false;
    }

    const cells = this.getOccupiedCells(weapon.footprint, anchor);

    if (!force) {
      for (const cell of cells) {
        const existing = this.matrix[cell.row][cell.col];
        if (existing !== null && existing.id !== weapon.id) {
          return false;
        }
      }
    }

    // If weapon is already on grid at a different position, remove it first
    this.removeWeapon(weapon.id);

    // Update weapon anchor
    weapon.anchor = { ...anchor };

    // Initialize frontline fortress HP if placed on Row 0
    if (weapon.anchor.row === 0) {
      FrontlineDefenseManager.initFrontlineWeapon(weapon);
    }

    // Fill cells
    for (const cell of cells) {
      this.matrix[cell.row][cell.col] = weapon;
    }

    return true;
  }

  /**
   * Removes a weapon from the grid by ID.
   */
  public removeWeapon(weaponId: string): WeaponInstance | null {
    let foundWeapon: WeaponInstance | null = null;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.matrix[r][c]?.id === weaponId) {
          foundWeapon = this.matrix[r][c];
          this.matrix[r][c] = null;
        }
      }
    }
    return foundWeapon;
  }

  /**
   * Returns all distinct weapons currently on the 5x5 grid.
   */
  public getAllWeapons(): WeaponInstance[] {
    const weaponMap = new Map<string, WeaponInstance>();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const weapon = this.matrix[r][c];
        if (weapon) {
          weaponMap.set(weapon.id, weapon);
        }
      }
    }
    return Array.from(weaponMap.values());
  }

  /**
   * Returns all unoccupied coordinates on the 5x5 grid.
   */
  public getEmptyCells(): GridPosition[] {
    const emptyCells: GridPosition[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.matrix[r][c] === null) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }
    return emptyCells;
  }

  // ================= Bench (备战席) Operations =================

  /**
   * Places weapon in specific bench slot.
   */
  public placeOnBench(weapon: WeaponInstance, slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= BENCH_SLOTS) {
      return false;
    }
    // Remove from grid if it was there
    this.removeWeapon(weapon.id);
    // Remove from previous bench slot if any
    this.removeBenchWeapon(weapon.id);

    this.bench[slotIndex] = weapon;
    return true;
  }

  /**
   * Adds weapon to the first available bench slot.
   */
  public addToFirstEmptyBenchSlot(weapon: WeaponInstance): number | -1 {
    const emptyIndex = this.getFirstEmptyBenchSlotIndex();
    if (emptyIndex === -1) {
      return -1;
    }
    this.placeOnBench(weapon, emptyIndex);
    return emptyIndex;
  }

  /**
   * Removes weapon from bench by weapon ID.
   */
  public removeBenchWeapon(weaponId: string): WeaponInstance | null {
    for (let i = 0; i < BENCH_SLOTS; i++) {
      if (this.bench[i]?.id === weaponId) {
        const weapon = this.bench[i];
        this.bench[i] = null;
        return weapon;
      }
    }
    return null;
  }

  /**
   * Gets bench slot by index.
   */
  public getBenchSlot(slotIndex: number): WeaponInstance | null {
    if (slotIndex < 0 || slotIndex >= BENCH_SLOTS) {
      return null;
    }
    return this.bench[slotIndex];
  }

  /**
   * Returns bench slot index containing weapon ID, or -1 if not on bench.
   */
  public findBenchSlotByWeaponId(weaponId: string): number {
    for (let i = 0; i < BENCH_SLOTS; i++) {
      if (this.bench[i]?.id === weaponId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Returns count of currently empty bench slots.
   */
  public getEmptyBenchSlotsCount(): number {
    return this.bench.filter(slot => slot === null).length;
  }

  /**
   * Returns all empty bench slot indices.
   */
  public getEmptyBenchSlotIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < BENCH_SLOTS; i++) {
      if (this.bench[i] === null) {
        indices.push(i);
      }
    }
    return indices;
  }

  /**
   * Returns first empty bench slot index or -1 if full.
   */
  public getFirstEmptyBenchSlotIndex(): number {
    for (let i = 0; i < BENCH_SLOTS; i++) {
      if (this.bench[i] === null) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Returns all weapons currently on bench.
   */
  public getAllBenchWeapons(): WeaponInstance[] {
    return this.bench.filter((w): w is WeaponInstance => w !== null);
  }

  /**
   * Full snapshot for state rollback / debugging.
   */
  public getSnapshot(): {
    grid: (WeaponInstance | null)[][];
    bench: (WeaponInstance | null)[];
  } {
    return {
      grid: this.matrix.map(row => [...row]),
      bench: [...this.bench]
    };
  }
}
