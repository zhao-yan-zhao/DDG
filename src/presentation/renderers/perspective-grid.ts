/**
 * 《孤城神机营》- 2.5D Trapezoidal Pseudo-3D Perspective Grid
 * 
 * Standards:
 * - Viewport: 750 × 1334 px
 * - 5×5 Fortress Courtyard Sandbox in 2.5D Perspective
 * - Perspective: Narrower at top (Row 0, near fortress gate), wider at bottom (Row 4, near outer rampart)
 * - Inverse Bilinear / Perspective hit testing for touch pickup
 * - Y-Sorting depth injection
 */

export interface PerspectivePoint {
  x: number;
  y: number;
}

export interface CellProjection {
  x: number;
  y: number;
  scale: number;
  depth: number;
  polygon: PerspectivePoint[];
}

export interface PerspectiveGridConfig {
  centerX: number;
  topY: number;
  bottomY: number;
  topWidth: number;
  bottomWidth: number;
  rows: number;
  cols: number;
}

export const DEFAULT_PERSPECTIVE_CONFIG: PerspectiveGridConfig = {
  centerX: 375,
  topY: 340,       // Matches the spacious stone courtyard in the refined fortress background
  bottomY: 690,
  topWidth: 360,   // Top row width
  bottomWidth: 480,// Bottom row width
  rows: 5,
  cols: 5
};

export class PerspectiveGrid {
  private config: PerspectiveGridConfig;

  constructor(config: Partial<PerspectiveGridConfig> = {}) {
    this.config = { ...DEFAULT_PERSPECTIVE_CONFIG, ...config };
  }

  public getConfig(): PerspectiveGridConfig {
    return this.config;
  }

  public setConfig(config: Partial<PerspectiveGridConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Evaluates the 4 corner vertices of a cell (col, row).
   * Corners returned in clockwise order: Top-Left, Top-Right, Bottom-Right, Bottom-Left.
   */
  public getCellPolygon(col: number, row: number): PerspectivePoint[] {
    const { centerX, topY, bottomY, topWidth, bottomWidth, rows, cols } = this.config;

    const r0 = row / rows;
    const r1 = (row + 1) / rows;

    const y0 = topY + r0 * (bottomY - topY);
    const y1 = topY + r1 * (bottomY - topY);

    const w0 = topWidth + r0 * (bottomWidth - topWidth);
    const w1 = topWidth + r1 * (bottomWidth - topWidth);

    const c0 = col / cols;
    const c1 = (col + 1) / cols;

    // Row 0 X positions
    const leftX0 = centerX - w0 / 2;
    const x_tl = leftX0 + c0 * w0;
    const x_tr = leftX0 + c1 * w0;

    // Row 1 X positions
    const leftX1 = centerX - w1 / 2;
    const x_bl = leftX1 + c0 * w1;
    const x_br = leftX1 + c1 * w1;

    return [
      { x: x_tl, y: y0 },
      { x: x_tr, y: y0 },
      { x: x_br, y: y1 },
      { x: x_bl, y: y1 }
    ];
  }

  /**
   * Returns projected center coordinates, visual scale, depth, and polygon bounds.
   */
  public getCellProjection(col: number, row: number): CellProjection {
    const poly = this.getCellPolygon(col, row);
    const centerX = (poly[0].x + poly[1].x + poly[2].x + poly[3].x) / 4;
    const centerY = (poly[0].y + poly[1].y + poly[2].y + poly[3].y) / 4;

    const t = (row + 0.5) / this.config.rows;
    // Scale ranges smoothly from 0.82 (top) to 1.0 (bottom)
    const scale = 0.82 + t * 0.18;
    const depth = 100 + centerY;

    return {
      x: centerX,
      y: centerY,
      scale,
      depth,
      polygon: poly
    };
  }

  /**
   * Inverse perspective mapping: checks if screen (x, y) falls inside the 5x5 grid
   * and returns the { col, row }, or null if outside.
   */
  public screenToGrid(x: number, y: number): { col: number; row: number } | null {
    const { centerX, topY, bottomY, topWidth, bottomWidth, rows, cols } = this.config;

    if (y < topY || y > bottomY) {
      return null;
    }

    const t = (y - topY) / (bottomY - topY);
    const row = Math.min(rows - 1, Math.max(0, Math.floor(t * rows)));

    // Active width at this specific Y
    const currentW = topWidth + t * (bottomWidth - topWidth);
    const minX = centerX - currentW / 2;
    const maxX = centerX + currentW / 2;

    if (x < minX || x > maxX) {
      return null;
    }

    const u = (x - minX) / currentW;
    const col = Math.min(cols - 1, Math.max(0, Math.floor(u * cols)));

    return { col, row };
  }
}
