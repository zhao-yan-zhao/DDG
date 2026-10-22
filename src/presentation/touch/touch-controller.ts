/**
 * 《孤城神机营》- Touch Y-Offset Coordinate Mapping & Touch Controller
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - Sand Table Grid: X in [185, 565], Y in [160, 540], Cell: 76x76 px
 * - Bench: Y in [0, 160], 5 Slots (80x80 px each)
 * - Touch Y-Offset: Visual drag node shifted upwards by ΔY = +80px (screen Y - 80)
 * - Single-touch ID 0 locking, secondary pointer suppression
 */

import { GridPosition, GridFootprint } from '../../core/types';

export const SCREEN_WIDTH = 750;
export const SCREEN_HEIGHT = 1334;

export const TOUCH_Y_OFFSET = 80; // px upwards (screen Y - 80)

export const GRID_CONFIG = {
  startX: 195,
  endX: 555,
  startY: 320,
  endY: 620,
  cellSize: 72,
  rows: 5,
  cols: 5,
  courtyardTop: 320,
  courtyardBottom: 620,
  gateFrontY: 860,
  gateFrontH: 72,
  // Trapezoidal width by row (2.5D Chinese fortress perspective)
  rowWidths: [360, 450, 420, 390, 360],
  rowScales: [1.00, 1.06, 1.00, 0.95, 0.90]
};

export const BENCH_CONFIG = {
  startY: 1145,
  endY: 1235,
  slotCount: 5,
  slotSize: 80,
  slotGap: 16,
  startX: 143 // (750 - (5 * 80 + 4 * 16)) / 2 = 143
};

export const RECYCLE_ZONE_CONFIG = {
  x: 200,
  y: 1255,
  width: 350,
  height: 68,
  centerX: 375,
  centerY: 1289
};

export interface ScreenPoint {
  x: number;
  y: number;
}

export type DragSourceType = 'grid' | 'bench';

export interface DragState {
  isDragging: boolean;
  activePointerId: number | null;
  sourceType: DragSourceType | null;
  weaponId: string | null;
  startTouch: ScreenPoint | null;
  currentTouch: ScreenPoint | null;
  visualPosition: ScreenPoint | null;
  hitTestPoint: ScreenPoint | null;
  sourceGridPos?: GridPosition;
  sourceBenchSlot?: number;
}

export class TouchCoordinateMapper {
  /**
   * Returns total row width in pixels according to 2.5D perspective.
   */
  public static getRowWidth(row: number): number {
    return GRID_CONFIG.rowWidths[row] ?? 360;
  }

  /**
   * Returns starting X (left edge) for a given row, centered at X=375.
   */
  public static getRowStartX(row: number): number {
    return 375 - this.getRowWidth(row) / 2;
  }

  /**
   * Returns cell width for a given row.
   */
  public static getRowCellWidth(row: number): number {
    return this.getRowWidth(row) / GRID_CONFIG.cols;
  }

  /**
   * Returns 2.5D perspective scale factor for a given row (0.90x rear to 1.06x front).
   */
  public static getRowPerspectiveScale(row: number): number {
    return GRID_CONFIG.rowScales[row] ?? 1.00;
  }

  /**
   * Converts screen touch coordinate to visual drag node position.
   * Node is shifted upwards by 80px: Y_visual = Touch.Y - 80
   */
  public static touchToVisualPosition(touch: ScreenPoint): ScreenPoint {
    return {
      x: touch.x,
      y: touch.y - TOUCH_Y_OFFSET
    };
  }

  /**
   * Projects visual center position to HitTest point on screen.
   * Hit-test coordinates align directly with visual node center.
   */
  public static visualToHitTestPoint(visual: ScreenPoint): ScreenPoint {
    return {
      x: visual.x,
      y: visual.y
    };
  }

  /**
   * Convenience: converts touch coordinate directly to hit-test point
   * When using visual offset, hit-test point is the visual center (touch.y - 80).
   */
  public static touchToHitTestPoint(touch: ScreenPoint, useVisualOffset: boolean = true): ScreenPoint {
    if (!useVisualOffset) {
      return { x: touch.x, y: touch.y };
    }
    return this.touchToVisualPosition(touch);
  }

  /**
   * Maps 5x5 grid row & col (and optional multi-cell footprint) to screen center pixel coordinates with 2.5D perspective.
   * - When footprint is provided (e.g. 2x1, 1x2, 2x2), returns the exact geometric center of the occupied multi-cell bounding box.
   * - Row 0: Front-of-gate barricade line (Y = 896, X in [195, 555], cellW = 72)
   * - Rows 1..4: Courtyard spread across Y in [320, 620]
   *   Row 1: width 450px (X in [150, 600]), cellW = 90px, Y = 583
   *   Row 2: width 420px (X in [165, 585]), cellW = 84px, Y = 508
   *   Row 3: width 390px (X in [180, 570]), cellW = 78px, Y = 433
   *   Row 4: width 360px (X in [195, 555]), cellW = 72px, Y = 358
   */
  public static gridToScreen(row: number, col: number, footprint?: GridFootprint): ScreenPoint {
    const fp = footprint || { width: 1, height: 1 };
    if (row === 0) {
      const cellW = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
      const x = Math.round(GRID_CONFIG.startX + (col + fp.width / 2) * cellW);
      const y = Math.round(GRID_CONFIG.gateFrontY + GRID_CONFIG.gateFrontH / 2);
      return { x, y };
    }

    const startX = this.getRowStartX(row);
    const cellW = this.getRowCellWidth(row);
    const x = Math.round(startX + (col + fp.width / 2) * cellW);

    const cellH = (GRID_CONFIG.courtyardBottom - GRID_CONFIG.courtyardTop) / 4;
    const y = Math.round(GRID_CONFIG.courtyardBottom - (row - 1 + fp.height / 2) * cellH);
    return { x, y };
  }

  /**
   * Maps screen pixel point (X, Y) to 5x5 grid coordinates with trapezoidal hit testing.
   * - Row 0: Y in [860, 932), X in [195, 555)
   * - Rows 1..4: Y in [320, 620), X inside row's trapezoidal span
   */
  public static screenToGrid(point: ScreenPoint): GridPosition | null {
    // Check Row 0: Gate-front barricade line [860, 932)
    if (point.y >= GRID_CONFIG.gateFrontY && point.y < GRID_CONFIG.gateFrontY + GRID_CONFIG.gateFrontH) {
      if (point.x < GRID_CONFIG.startX || point.x >= GRID_CONFIG.endX) {
        return null;
      }
      const cellW = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
      const col = Math.floor((point.x - GRID_CONFIG.startX) / cellW);
      if (col >= 0 && col < GRID_CONFIG.cols) {
        return { row: 0, col };
      }
      return null;
    }

    // Check Rows 1..4: Courtyard tactical positions [320, 620)
    if (point.y >= GRID_CONFIG.courtyardTop && point.y < GRID_CONFIG.courtyardBottom) {
      const cellH = (GRID_CONFIG.courtyardBottom - GRID_CONFIG.courtyardTop) / 4;
      const rowOffset = Math.floor((GRID_CONFIG.courtyardBottom - point.y) / cellH);
      const row = 1 + rowOffset;
      if (row >= 1 && row <= 4) {
        const startX = this.getRowStartX(row);
        const cellW = this.getRowCellWidth(row);
        const totalW = this.getRowWidth(row);

        if (point.x >= startX && point.x < startX + totalW) {
          const col = Math.floor((point.x - startX) / cellW);
          if (col >= 0 && col < GRID_CONFIG.cols) {
            return { row, col };
          }
        }
      }
    }

    return null;
  }

  /**
   * Maps bench slot index (0..4) to screen center pixel coordinates.
   */
  public static benchSlotToScreen(slotIndex: number): ScreenPoint {
    const x =
      BENCH_CONFIG.startX +
      slotIndex * (BENCH_CONFIG.slotSize + BENCH_CONFIG.slotGap) +
      BENCH_CONFIG.slotSize / 2;
    const y = BENCH_CONFIG.startY + (BENCH_CONFIG.endY - BENCH_CONFIG.startY) / 2;
    return { x, y };
  }

  /**
   * Maps screen pixel point to bench slot index (0..4).
   * Returns -1 if point is outside any bench slot.
   */
  public static screenToBenchSlot(point: ScreenPoint): number {
    if (point.y < BENCH_CONFIG.startY || point.y >= BENCH_CONFIG.endY) {
      return -1;
    }

    for (let i = 0; i < BENCH_CONFIG.slotCount; i++) {
      const slotX =
        BENCH_CONFIG.startX + i * (BENCH_CONFIG.slotSize + BENCH_CONFIG.slotGap);
      if (
        point.x >= slotX &&
        point.x <= slotX + BENCH_CONFIG.slotSize
      ) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Checks whether a screen pixel point falls inside the Recycle/Discard zone.
   */
  public static isPointInRecycleZone(point: ScreenPoint): boolean {
    return (
      point.x >= RECYCLE_ZONE_CONFIG.x &&
      point.x <= RECYCLE_ZONE_CONFIG.x + RECYCLE_ZONE_CONFIG.width &&
      point.y >= RECYCLE_ZONE_CONFIG.y &&
      point.y <= RECYCLE_ZONE_CONFIG.y + RECYCLE_ZONE_CONFIG.height
    );
  }
}

/**
 * Touch Interaction State Controller
 * Manages single-finger touch locking and drag life-cycle.
 */
export class TouchController {
  private state: DragState;

  constructor() {
    this.state = {
      isDragging: false,
      activePointerId: null,
      sourceType: null,
      weaponId: null,
      startTouch: null,
      currentTouch: null,
      visualPosition: null,
      hitTestPoint: null
    };
  }

  public getDragState(): Readonly<DragState> {
    return this.state;
  }

  /**
   * Starts drag interaction. Locks to primary active pointer.
   * If already dragging, secondary fingers are rejected while drag is active.
   */
  public onPointerDown(
    pointerId: number,
    touchX: number,
    touchY: number,
    sourceType: DragSourceType,
    weaponId: string,
    sourceGridPos?: GridPosition,
    sourceBenchSlot?: number
  ): boolean {
    // If already dragging with an active pointer, ignore any secondary pointer
    if (this.state.isDragging) {
      return false;
    }

    const touch = { x: touchX, y: touchY };
    const visual = TouchCoordinateMapper.touchToVisualPosition(touch);
    const hitTest = TouchCoordinateMapper.visualToHitTestPoint(visual);

    this.state = {
      isDragging: true,
      activePointerId: pointerId,
      sourceType,
      weaponId,
      startTouch: touch,
      currentTouch: touch,
      visualPosition: visual,
      hitTestPoint: hitTest,
      sourceGridPos: sourceGridPos ? { ...sourceGridPos } : undefined,
      sourceBenchSlot
    };

    return true;
  }

  /**
   * Updates pointer position. Ignored if pointer ID doesn't match active pointer.
   */
  public onPointerMove(pointerId: number, touchX: number, touchY: number): boolean {
    if (!this.state.isDragging || this.state.activePointerId !== pointerId) {
      return false;
    }

    const touch = { x: touchX, y: touchY };
    const visual = TouchCoordinateMapper.touchToVisualPosition(touch);
    const hitTest = TouchCoordinateMapper.visualToHitTestPoint(visual);

    this.state.currentTouch = touch;
    this.state.visualPosition = visual;
    this.state.hitTestPoint = hitTest;

    return true;
  }

  /**
   * Finishes pointer interaction and returns target drop location.
   */
  public onPointerUp(pointerId: number): {
    ended: boolean;
    hitTestPoint: ScreenPoint | null;
    targetGridPos: GridPosition | null;
    targetBenchSlot: number;
    isRecycleDrop: boolean;
    state: Readonly<DragState>;
  } {
    if (!this.state.isDragging || this.state.activePointerId !== pointerId) {
      return {
        ended: false,
        hitTestPoint: null,
        targetGridPos: null,
        targetBenchSlot: -1,
        isRecycleDrop: false,
        state: this.state
      };
    }

    const hitTest = this.state.hitTestPoint;
    const targetGridPos = hitTest ? TouchCoordinateMapper.screenToGrid(hitTest) : null;
    const targetBenchSlot = hitTest ? TouchCoordinateMapper.screenToBenchSlot(hitTest) : -1;
    const isRecycleDrop = hitTest ? TouchCoordinateMapper.isPointInRecycleZone(hitTest) : false;
    const previousState = { ...this.state };

    // Reset drag state
    this.state = {
      isDragging: false,
      activePointerId: null,
      sourceType: null,
      weaponId: null,
      startTouch: null,
      currentTouch: null,
      visualPosition: null,
      hitTestPoint: null
    };

    return {
      ended: true,
      hitTestPoint: hitTest,
      targetGridPos,
      targetBenchSlot,
      isRecycleDrop,
      state: previousState
    };
  }

  /**
   * Cancels active drag and resets state.
   */
  public cancelDrag(): void {
    this.state = {
      isDragging: false,
      activePointerId: null,
      sourceType: null,
      weaponId: null,
      startTouch: null,
      currentTouch: null,
      visualPosition: null,
      hitTestPoint: null
    };
  }
}
