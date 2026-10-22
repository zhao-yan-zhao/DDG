/**
 * 《孤城神机营》- Grid & Bench Visual Renderer
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - 5x5 Grid: X in [185, 565], Y in [160, 540], Cell size 76x76
 * - Bench: 5 slots (80x80 px), X starts at 135, Y in [0, 160] (centered at Y=80)
 * - Wall Partition (Rampart): Y in [540, 560]
 */

import Phaser from 'phaser';
import { GRID_CONFIG, BENCH_CONFIG, RECYCLE_ZONE_CONFIG, ScreenPoint, TouchCoordinateMapper } from '../touch/touch-controller';
import { GridPosition, GridFootprint } from '../../core/types';
import { SpatialSynergyLink } from '../../core/bond/spatial-synergy';

export interface DropHighlightOptions {
  isValid: boolean;
  isMerge?: boolean;
  footprint?: GridFootprint;
}

export class GridRenderer {
  private scene: Phaser.Scene;
  private backgroundGraphics: Phaser.GameObjects.Graphics;
  private lockedZoneGraphics: Phaser.GameObjects.Graphics;
  private highlightGraphics: Phaser.GameObjects.Graphics;
  private synergyLinkGraphics: Phaser.GameObjects.Graphics;
  private recycleContainer?: Phaser.GameObjects.Container;
  private recycleBg?: Phaser.GameObjects.Graphics;
  private recycleText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.backgroundGraphics = this.scene.add.graphics().setDepth(1);
    this.lockedZoneGraphics = this.scene.add.graphics().setDepth(3);
    this.highlightGraphics = this.scene.add.graphics().setDepth(5);
    this.synergyLinkGraphics = this.scene.add.graphics().setDepth(4);

    this.renderStaticGrid();
    this.renderWallPartition();
    this.renderBench();
    this.createRecycleZoneVisual();
  }

  /**
   * Renders the natural fortress courtyard grid and front-of-gate barricade positions.
   * Free from rigid bounding cages ("不要规规矩矩的") and shaped by 2.5D perspective.
   */
  private renderStaticGrid(): void {
    const g = this.backgroundGraphics;
    const courtH = (GRID_CONFIG.courtyardBottom - GRID_CONFIG.courtyardTop) / 4;

    // 1. Courtyard Rows 1..4 (城池内校场战位: Y in [320, 620]，梯形透视铺开)
    for (let r = 1; r <= 4; r++) {
      const startX = TouchCoordinateMapper.getRowStartX(r);
      const cellW = TouchCoordinateMapper.getRowCellWidth(r);
      const y = GRID_CONFIG.courtyardBottom - r * courtH;
      const scale = TouchCoordinateMapper.getRowPerspectiveScale(r);
      const cLen = Math.max(5, Math.round(6 * scale));

      for (let c = 0; c < GRID_CONFIG.cols; c++) {
        const x = startX + c * cellW;

        // Soft translucent stone paver wash - natural integration with Ming stone ground
        const cellFillColor = (r + c) % 2 === 0 ? 0x222a36 : 0x161c26;
        g.fillStyle(cellFillColor, 0.12);
        g.fillRoundedRect(x + 2, y + 2, cellW - 4, courtH - 4, 4);

        g.lineStyle(1, 0x5a6372, 0.25);
        g.strokeRoundedRect(x + 2, y + 2, cellW - 4, courtH - 4, 4);

        // Ming antique corner accents
        g.lineStyle(1.5, 0xc49a45, 0.38);
        g.lineBetween(x + 3, y + 3, x + 3 + cLen, y + 3);
        g.lineBetween(x + 3, y + 3, x + 3, y + 3 + cLen);
        g.lineBetween(x + cellW - 3, y + 3, x + cellW - 3 - cLen, y + 3);
        g.lineBetween(x + cellW - 3, y + 3, x + cellW - 3, y + 3 + cLen);
        g.lineBetween(x + 3, y + courtH - 3, x + 3 + cLen, y + courtH - 3);
        g.lineBetween(x + 3, y + courtH - 3, x + 3, y + courtH - 3 - cLen);
        g.lineBetween(x + cellW - 3, y + courtH - 3, x + cellW - 3 - cLen, y + courtH - 3);
        g.lineBetween(x + cellW - 3, y + courtH - 3, x + cellW - 3, y + courtH - 3 - cLen);
      }
    }

    // 2. Front of Gate Row 0 (城门前拒马/铁蒺藜工事位: Y in [860, 932])
    const row0Y = GRID_CONFIG.gateFrontY;
    const row0H = GRID_CONFIG.gateFrontH;
    const colW0 = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;

    // Subtle wooden/stone defensive line base
    g.fillStyle(0x0e1116, 0.35);
    g.fillRoundedRect(GRID_CONFIG.startX - 4, row0Y - 3, (GRID_CONFIG.endX - GRID_CONFIG.startX) + 8, row0H + 6, 6);
    g.lineStyle(1, 0x795548, 0.4);
    g.strokeRoundedRect(GRID_CONFIG.startX - 4, row0Y - 3, (GRID_CONFIG.endX - GRID_CONFIG.startX) + 8, row0H + 6, 6);

    for (let c = 0; c < GRID_CONFIG.cols; c++) {
      const x = GRID_CONFIG.startX + c * colW0;

      // Warm bronze/iron fortified barricade slot
      g.fillStyle(0x3e2723, 0.28);
      g.fillRoundedRect(x + 2, row0Y + 2, colW0 - 4, row0H - 4, 4);

      g.lineStyle(1.5, 0xd4af37, 0.55);
      g.strokeRoundedRect(x + 2, row0Y + 2, colW0 - 4, row0H - 4, 4);

      // Corner rivets / brass accents
      const cLen = 7;
      g.lineStyle(2, 0xffb300, 0.7);
      g.lineBetween(x + 3, row0Y + 3, x + 3 + cLen, row0Y + 3);
      g.lineBetween(x + 3, row0Y + 3, x + 3, row0Y + 3 + cLen);
      g.lineBetween(x + colW0 - 3, row0Y + 3, x + colW0 - 3 - cLen, row0Y + 3);
      g.lineBetween(x + colW0 - 3, row0Y + 3, x + colW0 - 3, row0Y + 3 + cLen);
      g.lineBetween(x + 3, row0Y + row0H - 3, x + 3 + cLen, row0Y + row0H - 3);
      g.lineBetween(x + 3, row0Y + row0H - 3, x + 3, row0Y + row0H - 3 - cLen);
      g.lineBetween(x + colW0 - 3, row0Y + row0H - 3, x + colW0 - 3 - cLen, row0Y + row0H - 3);
      g.lineBetween(x + colW0 - 3, row0Y + row0H - 3, x + colW0 - 3, row0Y + row0H - 3 - cLen);
    }
  }

  /**
   * Renders the wall rampart separating sand table from battlefield.
   * Milestone M_VJ2: Authentically rendered by BattlefieldEnvironment (`wall_parapet`) at Depth 0.8,
   * featuring 7 merlons, 6 crenels with arrow slits, and Row 0 timber/iron reinforcement.
   * Kept cleanly decoupled to prevent duplicate geometry or draw call inflation.
   */
  private renderWallPartition(): void {
    // Handled by BattlefieldEnvironment at depth 0.8 for unified historical Ming parapet presentation.
  }

  /**
   * Renders the 5 bench slots in the bottom staging area.
   */
  private renderBench(): void {
    const g = this.backgroundGraphics;

    const trayW = BENCH_CONFIG.slotCount * (BENCH_CONFIG.slotSize + BENCH_CONFIG.slotGap) - BENCH_CONFIG.slotGap + 20;
    const trayH = BENCH_CONFIG.endY - BENCH_CONFIG.startY;
    const trayX = BENCH_CONFIG.startX - 10;
    const trayY = BENCH_CONFIG.startY;

    // Bench container banner with dark bronze lacquer
    g.fillStyle(0x13171d, 0.94);
    g.fillRoundedRect(trayX, trayY, trayW, trayH, 8);
    g.lineStyle(1.5, 0x4a433a, 0.9);
    g.strokeRoundedRect(trayX, trayY, trayW, trayH, 8);

    // Inner bronze accent line
    g.lineStyle(1, 0x8d6e63, 0.4);
    g.strokeRoundedRect(trayX + 2, trayY + 2, trayW - 4, trayH - 4, 6);

    // Individual bench slots
    const slotY = BENCH_CONFIG.startY + 5;
    for (let i = 0; i < BENCH_CONFIG.slotCount; i++) {
      const x = BENCH_CONFIG.startX + i * (BENCH_CONFIG.slotSize + BENCH_CONFIG.slotGap);

      g.fillStyle(0x1d222a, 0.95);
      g.fillRoundedRect(x, slotY, BENCH_CONFIG.slotSize, BENCH_CONFIG.slotSize, 6);

      g.lineStyle(1.5, 0x546e7a, 0.7);
      g.strokeRoundedRect(x, slotY, BENCH_CONFIG.slotSize, BENCH_CONFIG.slotSize, 6);

      // Subtle antique brass corner rivets
      const cLen = 6;
      g.lineStyle(1.5, 0xc49a45, 0.5);
      g.lineBetween(x + 2, slotY + 2, x + 2 + cLen, slotY + 2);
      g.lineBetween(x + 2, slotY + 2, x + 2, slotY + 2 + cLen);
      g.lineBetween(x + BENCH_CONFIG.slotSize - 2, slotY + 2, x + BENCH_CONFIG.slotSize - 2 - cLen, slotY + 2);
      g.lineBetween(x + BENCH_CONFIG.slotSize - 2, slotY + 2, x + BENCH_CONFIG.slotSize - 2, slotY + 2 + cLen);
    }
  }

  /**
   * Initializes the slide-out Recycle / Discard zone at screen bottom.
   */
  private createRecycleZoneVisual(): void {
    const container = this.scene.add.container(0, 0).setDepth(6).setVisible(false);
    this.recycleBg = this.scene.add.graphics();
    this.recycleText = this.scene.add.text(
      RECYCLE_ZONE_CONFIG.centerX,
      RECYCLE_ZONE_CONFIG.centerY,
      '🔥 拖入此区域熔铸分解 (返还银两)',
      {
        fontFamily: 'serif, SimHei, sans-serif',
        fontSize: '15px',
        color: '#ffb74d',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    container.add([this.recycleBg, this.recycleText]);
    this.recycleContainer = container;
  }

  /**
   * Shows or hides the dynamic Recycle zone, updating its highlight state and refund amount text.
   */
  public updateRecycleZone(visible: boolean, isHovered: boolean = false, refundSilver: number = 0): void {
    if (!this.recycleContainer || !this.recycleBg || !this.recycleText) return;

    if (!visible) {
      this.recycleContainer.setVisible(false);
      return;
    }

    this.recycleContainer.setVisible(true);
    this.recycleBg.clear();

    const cfg = RECYCLE_ZONE_CONFIG;
    const fillColor = isHovered ? 0xb71c1c : 0x212121;
    const strokeColor = isHovered ? 0xff5252 : 0xff9800;

    this.recycleBg.fillStyle(fillColor, isHovered ? 0.92 : 0.82);
    this.recycleBg.fillRoundedRect(cfg.x, cfg.y, cfg.width, cfg.height, 10);

    this.recycleBg.lineStyle(isHovered ? 2.5 : 1.5, strokeColor, 0.95);
    this.recycleBg.strokeRoundedRect(cfg.x, cfg.y, cfg.width, cfg.height, 10);

    if (isHovered) {
      this.recycleText.setText(`🔥 松手熔铸分解：返还 +${refundSilver} 银两`);
      this.recycleText.setColor('#ffeb3b');
    } else {
      this.recycleText.setText(`🔥 拖入此区域分解 (预计返还 +${refundSilver} 银)`);
      this.recycleText.setColor('#ffb74d');
    }
  }

  /**
   * Highlights hover target during drag.
   */
  public showHighlightGrid(pos: GridPosition, options: DropHighlightOptions): void {
    const g = this.highlightGraphics;
    g.clear();

    const courtH = (GRID_CONFIG.courtyardBottom - GRID_CONFIG.courtyardTop) / 4;
    const fp = options.footprint || { width: 1, height: 1 };

    let x: number;
    let y: number;
    let w: number;
    let h: number;

    if (pos.row === 0) {
      // Row 0 in front of city gate
      const colW0 = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
      x = GRID_CONFIG.startX + pos.col * colW0;
      y = GRID_CONFIG.gateFrontY;
      w = fp.width * colW0;
      h = GRID_CONFIG.gateFrontH;
    } else {
      // Rows 1..4 inside courtyard with trapezoidal width
      const startX = TouchCoordinateMapper.getRowStartX(pos.row);
      const cellW = TouchCoordinateMapper.getRowCellWidth(pos.row);
      const topRow = pos.row + fp.height - 1;
      x = startX + pos.col * cellW;
      y = GRID_CONFIG.courtyardBottom - topRow * courtH;
      w = fp.width * cellW;
      h = fp.height * courtH;
    }

    let fillColor = 0x2e7d32; // Green
    let strokeColor = 0x4caf50;

    if (options.isMerge) {
      fillColor = 0xf57f17; // Gold/Amber
      strokeColor = 0xffd600;
    } else if (!options.isValid) {
      fillColor = 0xc62828; // Red
      strokeColor = 0xff5252;
    }

    g.fillStyle(fillColor, 0.35);
    g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 6);

    g.lineStyle(3, strokeColor, 0.95);
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 6);
  }

  /**
   * Highlights bench slot hover.
   */
  public showHighlightBench(slotIndex: number, isValid: boolean): void {
    const g = this.highlightGraphics;
    g.clear();

    if (slotIndex < 0 || slotIndex >= BENCH_CONFIG.slotCount) return;

    const x = BENCH_CONFIG.startX + slotIndex * (BENCH_CONFIG.slotSize + BENCH_CONFIG.slotGap);
    const y = BENCH_CONFIG.startY + 5;

    const fillColor = isValid ? 0x2e7d32 : 0xc62828;
    const strokeColor = isValid ? 0x4caf50 : 0xff5252;

    g.fillStyle(fillColor, 0.35);
    g.fillRoundedRect(x, y, BENCH_CONFIG.slotSize, BENCH_CONFIG.slotSize, 6);

    g.lineStyle(3, strokeColor, 0.95);
    g.strokeRoundedRect(x, y, BENCH_CONFIG.slotSize, BENCH_CONFIG.slotSize, 6);
  }

  /**
   * Shows dimmed / locked dark-red overlay on forbidden grid rows during drag.
   * - If dragged weapon is fortress: Rows 1..4 are forbidden/locked.
   * - If dragged weapon is non-fortress: Row 0 is forbidden/locked.
   */
  public showForbiddenRows(isFortressOnly: boolean): void {
    const g = this.lockedZoneGraphics;
    g.clear();

    const courtH = (GRID_CONFIG.courtyardBottom - GRID_CONFIG.courtyardTop) / 4;

    if (isFortressOnly) {
      // Fortress weapon: Rows 1..4 locked
      for (let r = 1; r <= 4; r++) {
        const startX = TouchCoordinateMapper.getRowStartX(r);
        const cellW = TouchCoordinateMapper.getRowCellWidth(r);
        const y = GRID_CONFIG.courtyardBottom - r * courtH;
        const totalW = cellW * GRID_CONFIG.cols;

        g.fillStyle(0x000000, 0.45);
        g.fillRoundedRect(startX + 2, y + 2, totalW - 4, courtH - 4, 4);

        g.lineStyle(1.5, 0xef5350, 0.5);
        g.strokeRoundedRect(startX + 2, y + 2, totalW - 4, courtH - 4, 4);
      }
    } else {
      // Non-fortress weapon: Row 0 locked
      const colW0 = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
      for (let c = 0; c < GRID_CONFIG.cols; c++) {
        const x = GRID_CONFIG.startX + c * colW0;
        const y = GRID_CONFIG.gateFrontY;

        g.fillStyle(0x3e1010, 0.55);
        g.fillRoundedRect(x + 2, y + 2, colW0 - 4, GRID_CONFIG.gateFrontH - 4, 4);

        g.lineStyle(2, 0xd32f2f, 0.7);
        g.strokeRoundedRect(x + 2, y + 2, colW0 - 4, GRID_CONFIG.gateFrontH - 4, 4);
      }
    }
  }

  /**
   * Clears locked rows overlay.
   */
  public clearForbiddenRows(): void {
    this.lockedZoneGraphics.clear();
  }

  /**
   * Clears all temporary drag highlight overlays.
   */
  public clearHighlight(): void {
    this.highlightGraphics.clear();
    this.clearForbiddenRows();
    this.updateRecycleZone(false);
  }

  /**
   * Renders shimmering golden bond link beams connecting weapons in spatial synergies.
   */
  public renderSpatialSynergyLinks(links: SpatialSynergyLink[]): void {
    const g = this.synergyLinkGraphics;
    g.clear();
    if (!links || links.length === 0) return;

    for (const link of links) {
      const from = TouchCoordinateMapper.gridToScreen(link.fromPos.row, link.fromPos.col);
      const to = TouchCoordinateMapper.gridToScreen(link.toPos.row, link.toPos.col);

      // Outer golden glow
      g.lineStyle(6, 0xffd700, 0.40);
      g.lineBetween(from.x, from.y, to.x, to.y);

      // Core electric white-gold beam
      g.lineStyle(2.5, 0xffffff, 0.90);
      g.lineBetween(from.x, from.y, to.x, to.y);

      // Node rings
      g.fillStyle(0xffd700, 0.85);
      g.fillCircle(from.x, from.y, 6);
      g.fillCircle(to.x, to.y, 6);
    }
  }

  public clearSpatialSynergyLinks(): void {
    this.synergyLinkGraphics.clear();
  }
}
