/**
 * 《孤城神机营》- UI Procedural Texture Factory
 * Generates high-fidelity Canvas 2D procedural textures and registers them
 * into Phaser's TextureManager for NineSlice panels, skeumorphic resource icons,
 * 3D cast bronze relief buttons, and authentic Xuande vermilion seals.
 */

import Phaser from 'phaser';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from '../ui/ui-theme';

export class UITextureFactory {
  /**
   * Generates all procedural UI textures if they do not already exist in the TextureManager.
   */
  public static generateAll(scene: Phaser.Scene): void {
    this.createPanelXuanBronze(scene);
    this.createCardBamboo(scene);
    this.createHeaderBanner(scene);
    this.createCoinTongbaoIcon(scene);
    this.createOreIronIcon(scene);
    this.createBlueprintScrollIcon(scene);
    this.createBronzeButtons(scene);
    this.createXuandeStamps(scene);
    this.createCommanderAvatars(scene);
  }

  // =========================================================================
  // 1. Xuan Paper & Bronze NineSlice Panel (160x160, Margins: 40,40,40,40)
  // =========================================================================
  private static createPanelXuanBronze(scene: Phaser.Scene): void {
    const key = UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE;
    if (scene.textures.exists(key)) return;

    const w = 160;
    const h = 160;
    const canvasTex = scene.textures.createCanvas(key, w, h);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    // 1.1 Xuan Paper Mottled Dark Base Gradient
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 90);
    bgGrad.addColorStop(0, '#221c17');
    bgGrad.addColorStop(0.7, '#1b1612');
    bgGrad.addColorStop(1, '#120f0c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle paper fibrous mottling
    ctx.fillStyle = 'rgba(212, 185, 140, 0.035)';
    for (let i = 0; i < 90; i++) {
      const rx = (i * 37) % w;
      const ry = (i * 53) % h;
      const rw = 2 + (i % 3);
      const rh = 1 + ((i * 2) % 2);
      ctx.fillRect(rx, ry, rw, rh);
    }

    // 1.2 Bronze Meander Double-Line Border
    // Outer border
    ctx.strokeStyle = '#8c6d3b';
    ctx.lineWidth = 2;
    ctx.strokeRect(3.5, 3.5, w - 7, h - 7);

    // Inner fine border
    ctx.strokeStyle = '#4e3820';
    ctx.lineWidth = 1;
    ctx.strokeRect(7.5, 7.5, w - 15, h - 15);

    // Meander / Cloud Ticks along borders
    ctx.strokeStyle = '#a67c2e';
    ctx.lineWidth = 1;
    // Top & Bottom border ticks
    for (let x = 45; x <= w - 45; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x + 4, 7);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, h - 4);
      ctx.lineTo(x + 4, h - 7);
      ctx.stroke();
    }
    // Left & Right border ticks
    for (let y = 45; y <= h - 45; y += 14) {
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(7, y + 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w - 4, y);
      ctx.lineTo(w - 7, y + 4);
      ctx.stroke();
    }

    // 1.3 Dark Gold Beast Face (Taotie) Corner Motifs (in 40x40 corners)
    const drawBeastCorner = (cx: number, cy: number, flipX: boolean, flipY: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

      // Beast Horn / Brow Curvature
      ctx.strokeStyle = '#c59b27';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(8, 28);
      ctx.quadraticCurveTo(12, 12, 28, 8);
      ctx.quadraticCurveTo(24, 18, 18, 20);
      ctx.stroke();

      // Golden Spiral Accent
      ctx.strokeStyle = '#e6c687';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(22, 22, 6, Math.PI * 0.2, Math.PI * 1.5, false);
      ctx.stroke();

      // Taotie Eye Dot
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(22, 22, 2, 0, Math.PI * 2);
      ctx.fill();

      // Corner Fang / Flare
      ctx.strokeStyle = '#936e1c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(10, 36);
      ctx.lineTo(16, 26);
      ctx.lineTo(26, 16);
      ctx.lineTo(36, 10);
      ctx.stroke();

      ctx.restore();
    };

    drawBeastCorner(0, 0, false, false);
    drawBeastCorner(w, 0, true, false);
    drawBeastCorner(0, h, false, true);
    drawBeastCorner(w, h, true, true);

    // 1.4 Bronze Rivets (4 corners + 4 edge centers)
    const drawRivet = (rx: number, ry: number) => {
      // Drop Shadow
      ctx.fillStyle = '#0f0b08';
      ctx.beginPath();
      ctx.arc(rx + 0.8, ry + 0.8, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Raised Metallic Dome
      const dome = ctx.createRadialGradient(rx - 1, ry - 1, 0.5, rx, ry, 3.5);
      dome.addColorStop(0, '#f5deb3');
      dome.addColorStop(0.35, '#d4af37');
      dome.addColorStop(0.75, '#8c6b1c');
      dome.addColorStop(1, '#3b2811');
      ctx.fillStyle = dome;
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Specular Highlight Dot
      ctx.fillStyle = 'rgba(255, 255, 235, 0.85)';
      ctx.beginPath();
      ctx.arc(rx - 1.2, ry - 1.2, 1, 0, Math.PI * 2);
      ctx.fill();
    };

    // 4 Corner Rivets
    drawRivet(14, 14);
    drawRivet(w - 14, 14);
    drawRivet(14, h - 14);
    drawRivet(w - 14, h - 14);

    // 4 Edge Rivets
    drawRivet(w / 2, 7);
    drawRivet(w / 2, h - 7);
    drawRivet(7, h / 2);
    drawRivet(w - 7, h / 2);

    canvasTex.refresh();
  }

  // =========================================================================
  // 2. Bamboo Slip Lacquer Board NineSlice (128x128, Margins: 24,24,24,24)
  // =========================================================================
  private static createCardBamboo(scene: Phaser.Scene): void {
    const key = UI_TEXTURE_KEYS.CARD_BAMBOO;
    if (scene.textures.exists(key)) return;

    const w = 128;
    const h = 128;
    const canvasTex = scene.textures.createCanvas(key, w, h);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    // 2.1 Dark Chestnut Base
    const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
    bgGrad.addColorStop(0, '#1f130c');
    bgGrad.addColorStop(0.5, '#291b12');
    bgGrad.addColorStop(1, '#1f130c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2.2 Vertical Striated Bamboo Slat Grooves
    const slatWidth = 16;
    for (let x = 0; x < w; x += slatWidth) {
      // Slat shadow line
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x, 0, 1.5, h);
      // Slat highlight line
      ctx.fillStyle = 'rgba(230, 190, 140, 0.08)';
      ctx.fillRect(x + 1.5, 0, 1, h);

      // Organic bamboo grain lines inside slat
      ctx.fillStyle = 'rgba(210, 160, 110, 0.03)';
      ctx.fillRect(x + 5, 0, 1, h);
      ctx.fillRect(x + 10, 0, 1, h);
    }

    // 2.3 Vermilion Edge Border
    ctx.strokeStyle = UI_COLORS.vermilionDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(5.5, 5.5, w - 11, h - 11);

    // 2.4 Bronze Clasps (Top and Bottom Centers)
    const drawClasp = (cx: number, cy: number) => {
      ctx.fillStyle = '#6b4f23';
      ctx.fillRect(cx - 16, cy - 4, 32, 8);
      ctx.strokeStyle = '#c59b27';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 16, cy - 4, 32, 8);

      // Tiny rivets on clasp
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(cx - 10, cy, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 10, cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    };

    drawClasp(w / 2, 4);
    drawClasp(w / 2, h - 4);

    canvasTex.refresh();
  }

  // =========================================================================
  // 3. Header Banner (750x70)
  // =========================================================================
  private static createHeaderBanner(scene: Phaser.Scene): void {
    const key = UI_TEXTURE_KEYS.HEADER_BANNER;
    if (scene.textures.exists(key)) return;

    const w = 750;
    const h = 70;
    const canvasTex = scene.textures.createCanvas(key, w, h);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    // 3.1 Jade-Black Gradient Body
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#151d21');
    bgGrad.addColorStop(0.5, '#0e1418');
    bgGrad.addColorStop(1, '#070a0c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 3.2 Top & Bottom Bronze Borders
    ctx.strokeStyle = '#a67c2e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 1.5);
    ctx.lineTo(w, 1.5);
    ctx.moveTo(0, h - 1.5);
    ctx.lineTo(w, h - 1.5);
    ctx.stroke();

    // Inner bronze line
    ctx.strokeStyle = '#543d22';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(w, 5);
    ctx.moveTo(0, h - 5);
    ctx.lineTo(w, h - 5);
    ctx.stroke();

    // Meander pattern repeat on bottom border
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 1;
    for (let x = 60; x <= w - 60; x += 16) {
      ctx.strokeRect(x, h - 8, 8, 4);
    }

    // 3.3 Corner Taotie Cloud Terminals (Left & Right Ends)
    const drawTerminal = (startX: number, flip: boolean) => {
      ctx.save();
      ctx.translate(startX, h / 2);
      if (flip) ctx.scale(-1, 1);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(24, 0, 14, Math.PI * 0.5, Math.PI * 1.8, false);
      ctx.stroke();

      ctx.strokeStyle = '#8c6b1c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(34, 0, 8, Math.PI * 0.8, Math.PI * 2.1, false);
      ctx.stroke();

      // Terminal jewel
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.arc(14, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    drawTerminal(0, false);
    drawTerminal(w, true);

    canvasTex.refresh();
  }

  // =========================================================================
  // 4. Da Ming Tongbao Bronze Coin Icon (48x48)
  // =========================================================================
  private static createCoinTongbaoIcon(scene: Phaser.Scene): void {
    const key = UI_TEXTURE_KEYS.ICON_COIN_TONGBAO;
    if (scene.textures.exists(key)) return;

    const size = 48;
    const canvasTex = scene.textures.createCanvas(key, size, size);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    const cx = size / 2;
    const cy = size / 2;
    const outerR = 21;

    // 4.1 Outer Beveled Bronze Rim
    const rimGrad = ctx.createRadialGradient(cx - 5, cy - 5, 4, cx, cy, outerR);
    rimGrad.addColorStop(0, '#fae19c');
    rimGrad.addColorStop(0.35, '#c59b27');
    rimGrad.addColorStop(0.7, '#855e1b');
    rimGrad.addColorStop(1, '#3b280c');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Verdigris Patina in Outer Groove
    ctx.strokeStyle = '#275245';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Sunken Bronze Field
    const innerGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, outerR - 3.5);
    innerGrad.addColorStop(0, '#664716');
    innerGrad.addColorStop(1, '#422c0b');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 4.2 Central Square Hole (12x12)
    const holeSize = 11;
    const hx = cx - holeSize / 2;
    const hy = cy - holeSize / 2;

    // Hole interior (transparent / background shadow)
    ctx.clearRect(hx, hy, holeSize, holeSize);
    ctx.fillStyle = 'rgba(10, 8, 6, 0.95)';
    ctx.fillRect(hx, hy, holeSize, holeSize);

    // Raised Square Lip
    ctx.strokeStyle = '#e6c687';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hx - 0.5, hy - 0.5, holeSize + 1, holeSize + 1);

    // 4.3 Four Seal Script Characters: 大, 明, 通, 宝
    ctx.fillStyle = '#fce4a6';
    ctx.font = 'bold 8px KaiTi, STKaiti, SimKai, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top: 大
    ctx.fillText('大', cx, cy - 13);
    // Bottom: 明
    ctx.fillText('明', cx, cy + 13);
    // Right: 通
    ctx.fillText('通', cx + 13, cy);
    // Left: 宝
    ctx.fillText('宝', cx - 13, cy);

    // 4.4 Diagonal Metallic Specular Glint
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 235, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 6);
    ctx.lineTo(cx + 6, cy - 20);
    ctx.stroke();

    ctx.restore();

    canvasTex.refresh();
  }

  // =========================================================================
  // 5. Extraterrestrial Xuan Iron Raw Ore Icon (48x48)
  // =========================================================================
  private static createOreIronIcon(scene: Phaser.Scene): void {
    const key = UI_TEXTURE_KEYS.ICON_ORE_IRON;
    if (scene.textures.exists(key)) return;

    const size = 48;
    const canvasTex = scene.textures.createCanvas(key, size, size);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    const cx = size / 2;
    const cy = size / 2;

    // Hexagonal faceted crystalline vertices
    const verts = [
      { x: cx, y: 5 },          // 0: top
      { x: 42, y: 15 },         // 1: top-right
      { x: 43, y: 32 },         // 2: right
      { x: 34, y: 43 },         // 3: bottom-right
      { x: 14, y: 43 },         // 4: bottom-left
      { x: 5, y: 32 },          // 5: left
      { x: 6, y: 15 }           // 6: top-left
    ];
    const centerVert = { x: cx - 2, y: cy + 1 };

    // Shading per triangular facet
    const facetShades = [
      '#1b435e', // 0-1
      '#0e2230', // 1-2
      '#143347', // 2-3
      '#0b1a24', // 3-4
      '#102838', // 4-5
      '#245a7d', // 5-6
      '#327b9c'  // 6-0 (top-left highlight)
    ];

    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];

      ctx.fillStyle = facetShades[i];
      ctx.beginPath();
      ctx.moveTo(centerVert.x, centerVert.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.closePath();
      ctx.fill();
    }

    // Outer crystalline boundary stroke
    ctx.strokeStyle = '#1b435e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Metallic Specular Ridge Lines
    ctx.strokeStyle = '#80deea';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < verts.length; i++) {
      ctx.beginPath();
      ctx.moveTo(centerVert.x, centerVert.y);
      ctx.lineTo(verts[i].x, verts[i].y);
      ctx.stroke();
    }

    // Extra highlight edge on top-left
    ctx.strokeStyle = '#e0f7fa';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(verts[5].x, verts[5].y);
    ctx.lineTo(verts[6].x, verts[6].y);
    ctx.lineTo(verts[0].x, verts[0].y);
    ctx.stroke();

    // Cyan Ionizing Glowing Core (radial glow at center)
    const coreGlow = ctx.createRadialGradient(centerVert.x, centerVert.y, 1, centerVert.x, centerVert.y, 9);
    coreGlow.addColorStop(0, '#ffffff');
    coreGlow.addColorStop(0.3, '#00e5ff');
    coreGlow.addColorStop(0.7, 'rgba(0, 229, 255, 0.4)');
    coreGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(centerVert.x, centerVert.y, 9, 0, Math.PI * 2);
    ctx.fill();

    canvasTex.refresh();
  }

  // =========================================================================
  // 6. Divine Blueprint Silk Scroll Icon (48x48)
  // =========================================================================
  private static createBlueprintScrollIcon(scene: Phaser.Scene): void {
    const key = UI_TEXTURE_KEYS.ICON_BLUEPRINT_SCROLL;
    if (scene.textures.exists(key)) return;

    const size = 48;
    const canvasTex = scene.textures.createCanvas(key, size, size);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    // Diagonal Silk Scroll from bottom-left (8, 38) to top-right (38, 8)
    ctx.save();
    ctx.translate(24, 24);
    ctx.rotate(-Math.PI / 4);

    const sw = 16;
    const sh = 34;

    // Silk Brocade Scroll Body
    const silkGrad = ctx.createLinearGradient(-sw / 2, 0, sw / 2, 0);
    silkGrad.addColorStop(0, '#10293d');
    silkGrad.addColorStop(0.4, '#1a4968');
    silkGrad.addColorStop(0.7, '#246187');
    silkGrad.addColorStop(1, '#0c1e2b');
    ctx.fillStyle = silkGrad;
    ctx.fillRect(-sw / 2, -sh / 2, sw, sh);

    // Subtle Gold Grid Blueprint lines
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 0.8;
    for (let y = -sh / 2 + 5; y < sh / 2; y += 6) {
      ctx.beginPath();
      ctx.moveTo(-sw / 2 + 2, y);
      ctx.lineTo(sw / 2 - 2, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, -sh / 2 + 2);
    ctx.lineTo(0, sh / 2 - 2);
    ctx.stroke();

    // Rosewood Rollers with Brass Caps (Top and Bottom)
    const drawRoller = (y: number) => {
      // Rosewood bar
      ctx.fillStyle = '#4e2717';
      ctx.fillRect(-sw / 2 - 3, y - 2, sw + 6, 4);
      // Brass Caps on ends
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-sw / 2 - 4.5, y - 2.5, 2, 5);
      ctx.fillRect(sw / 2 + 2.5, y - 2.5, 2, 5);
    };

    drawRoller(-sh / 2);
    drawRoller(sh / 2);

    // Vermilion Ribbon tied around waist
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(-sw / 2 - 1, -2, sw + 2, 4);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(-sw / 2 - 1, -2, sw + 2, 4);

    // Hanging Cinnabar Tag
    ctx.fillStyle = '#c62828';
    ctx.fillRect(sw / 2 + 1, -1, 7, 10);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(sw / 2 + 1, -1, 7, 10);

    ctx.restore();

    canvasTex.refresh();
  }

  // =========================================================================
  // 7. 3D Cast Bronze Relief Buttons (180x56, Margins: 16,16,16,16)
  // =========================================================================
  private static createBronzeButtons(scene: Phaser.Scene): void {
    const w = 180;
    const h = 56;

    // Helper for rendering button state
    const generateBtn = (
      key: string,
      topBevelColor: string,
      bottomBevelColor: string,
      bodyGradient: [string, string, string],
      borderColor: string,
      innerHighlight: boolean
    ) => {
      if (scene.textures.exists(key)) return;
      const canvasTex = scene.textures.createCanvas(key, w, h);
      if (!canvasTex) return;
      const ctx = canvasTex.context;

      // Outer Bevel Rim
      ctx.fillStyle = bottomBevelColor;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = topBevelColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w - 3, 3);
      ctx.lineTo(3, 3);
      ctx.lineTo(3, h - 3);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Main Bronze Plate Face
      const bodyGrad = ctx.createLinearGradient(0, 3, 0, h - 3);
      bodyGrad.addColorStop(0, bodyGradient[0]);
      bodyGrad.addColorStop(0.5, bodyGradient[1]);
      bodyGrad.addColorStop(1, bodyGradient[2]);
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(3, 3, w - 6, h - 6);

      // Fine brushed bronze texture
      ctx.fillStyle = 'rgba(255, 230, 180, 0.04)';
      for (let y = 5; y < h - 5; y += 3) {
        ctx.fillRect(4, y, w - 8, 1);
      }

      // Gold Foil Border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(4.5, 4.5, w - 9, h - 9);

      // Corner notch accents (铸造角榫)
      ctx.fillStyle = borderColor;
      ctx.fillRect(5, 5, 4, 1.5);
      ctx.fillRect(5, 5, 1.5, 4);
      ctx.fillRect(w - 9, 5, 4, 1.5);
      ctx.fillRect(w - 6.5, 5, 1.5, 4);
      ctx.fillRect(5, h - 6.5, 4, 1.5);
      ctx.fillRect(5, h - 9, 1.5, 4);
      ctx.fillRect(w - 9, h - 6.5, 4, 1.5);
      ctx.fillRect(w - 6.5, h - 9, 1.5, 4);

      // Top Inner Highlight Wire
      if (innerHighlight) {
        ctx.strokeStyle = 'rgba(255, 240, 200, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, 7);
        ctx.lineTo(w - 8, 7);
        ctx.stroke();
      }

      canvasTex.refresh();
    };

    // 7.1 Normal Button
    generateBtn(
      UI_TEXTURE_KEYS.BTN_BRONZE_NORMAL,
      '#8c6d3b', // top bevel
      '#1c1209', // bottom bevel
      ['#523d29', '#3e2c1c', '#291c11'],
      '#c59b27', // gold foil border
      true
    );

    // 7.2 Hover Button (Golden Glow & Foil)
    generateBtn(
      UI_TEXTURE_KEYS.BTN_BRONZE_HOVER,
      '#ffd700', // bright gold top
      '#302010', // bottom bevel
      ['#755535', '#573e25', '#3d2816'],
      '#ffd700', // radiant gold border
      true
    );

    // 7.3 Pressed Button (Inverted Bevel & Darker)
    generateBtn(
      UI_TEXTURE_KEYS.BTN_BRONZE_PRESSED,
      '#140c06', // inverted top shadow
      '#75582e', // inverted bottom highlight
      ['#23180f', '#2f1f13', '#3d2819'],
      '#99731d',
      false
    );

    // 7.4 Red CTA Button (Vermilion Cinnabar Lacquered Bronze)
    generateBtn(
      UI_TEXTURE_KEYS.BTN_BRONZE_RED,
      '#e57373', // top bevel
      '#370808', // bottom bevel
      ['#9a2222', '#721515', '#480c0c'],
      '#ffd700', // gold border
      true
    );
  }

  // =========================================================================
  // 8. Authentic Xuande Vermilion Seals (大捷, 固若金汤, 甲等, 无双, 阳明先生)
  // =========================================================================
  private static createXuandeStamps(scene: Phaser.Scene): void {
    // Helper to generate a vermilion seal stamp
    const generateStamp = (
      key: string,
      size: number,
      lines: string[],
      fontSize: number,
      isDoubleBorder: boolean
    ) => {
      if (scene.textures.exists(key)) return;
      const canvasTex = scene.textures.createCanvas(key, size, size);
      if (!canvasTex) return;
      const ctx = canvasTex.context;

      const pad = 6;
      const w = size;
      const h = size;

      // 8.1 Faint Cinnabar Wash inside seal area
      ctx.fillStyle = 'rgba(183, 28, 28, 0.08)';
      ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);

      // 8.2 Weathered Vermilion Border (with organic notches and porous gaps)
      ctx.strokeStyle = '#b71c1c';
      ctx.lineWidth = isDoubleBorder ? 4 : 5;
      ctx.strokeRect(pad + 1, pad + 1, w - (pad + 1) * 2, h - (pad + 1) * 2);

      if (isDoubleBorder) {
        ctx.strokeStyle = '#c62828';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pad + 6, pad + 6, w - (pad + 6) * 2, h - (pad + 6) * 2);
      }

      // Porous ink notches around border
      ctx.fillStyle = '#b71c1c';
      const notches = [
        { x: pad + 8, y: pad, r: 1.5 },
        { x: w - pad - 12, y: pad + 1, r: 1.2 },
        { x: w - pad, y: pad + 16, r: 1.4 },
        { x: pad, y: h - pad - 14, r: 1.5 },
        { x: pad + 18, y: h - pad, r: 1.2 },
        { x: w - pad - 8, y: h - pad, r: 1.6 }
      ];
      for (const n of notches) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8.3 Seal Script Typography (Yang Seal / 朱文阳刻)
      ctx.fillStyle = '#b71c1c';
      ctx.font = `bold ${fontSize}px ${UI_FONTS.seal}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const totalLines = lines.length;
      const lineHeight = fontSize * 1.15;
      const startY = h / 2 - ((totalLines - 1) * lineHeight) / 2;

      for (let i = 0; i < totalLines; i++) {
        ctx.fillText(lines[i], w / 2, startY + i * lineHeight);
      }

      // Subtle cinnabar spatter / porosity on characters
      ctx.fillStyle = 'rgba(255, 245, 235, 0.15)';
      for (let s = 0; s < 12; s++) {
        const sx = pad + 10 + (s * 29) % (w - pad * 2 - 20);
        const sy = pad + 10 + (s * 37) % (h - pad * 2 - 20);
        ctx.fillRect(sx, sy, 1.2, 1.2);
      }

      canvasTex.refresh();
    };

    // 8.1 【大捷】120x120
    generateStamp(UI_TEXTURE_KEYS.STAMP_DAJIE, 120, ['大', '捷'], 38, true);

    // 8.2 【固若金汤】120x120 (九叠篆 2x2 grid)
    generateStamp(UI_TEXTURE_KEYS.STAMP_JIN_TANG, 120, ['固若', '金汤'], 30, true);

    // 8.3 【甲等】100x100
    generateStamp(UI_TEXTURE_KEYS.STAMP_JIA_DENG, 100, ['甲', '等'], 30, false);

    // 8.4 【无双】120x120 (SSS Rating)
    generateStamp(UI_TEXTURE_KEYS.STAMP_WUSHUANG, 120, ['无', '双'], 38, true);

    // 8.5 【阳明先生】100x100 (Wang Shouren Commander Seal)
    generateStamp(UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN, 100, ['阳明', '先生'], 24, false);

    // 8.6 【墨家巨子】100x100 (Qin Huali Commander Seal)
    generateStamp(UI_TEXTURE_KEYS.STAMP_QIN_HUALI, 100, ['墨家', '巨子'], 24, false);

    // 8.7 【白杆巾帼】100x100 (Qin Liangyu Commander Seal)
    generateStamp(UI_TEXTURE_KEYS.STAMP_QIN_LIANGYU, 100, ['白杆', '巾帼'], 24, false);

    // 8.8 【诚意国师】100x100 (Liu Bowen Commander Seal)
    generateStamp(UI_TEXTURE_KEYS.STAMP_LIU_BOWEN, 100, ['诚意', '国师'], 24, false);
  }

  // =========================================================================
  // 9. Commander Procedural Avatar Badges (120x120)
  // =========================================================================
  private static createCommanderAvatars(scene: Phaser.Scene): void {
    const avatars = [
      { key: UI_TEXTURE_KEYS.AVATAR_WANG_SHOUREN, name: '守仁', bg: '#b71c1c', border: '#ffd700' },
      { key: UI_TEXTURE_KEYS.AVATAR_QIN_HUALI, name: '滑厘', bg: '#212121', border: '#00e5ff' },
      { key: UI_TEXTURE_KEYS.AVATAR_QIN_LIANGYU, name: '良玉', bg: '#5d4037', border: '#ffb74d' },
      { key: UI_TEXTURE_KEYS.AVATAR_LIU_BOWEN, name: '伯温', bg: '#1565c0', border: '#b388ff' }
    ];

    for (const item of avatars) {
      if (scene.textures.exists(item.key)) continue;
      const size = 120;
      const canvasTex = scene.textures.createCanvas(item.key, size, size);
      if (!canvasTex) continue;
      const ctx = canvasTex.context;

      // Outer metallic relief ring
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = item.border;
      ctx.fill();

      // Inner disc
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
      ctx.fillStyle = item.bg;
      ctx.fill();

      // Delicate inner ring
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Calligraphic name text
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 32px ${UI_FONTS.primary}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.name, size / 2, size / 2);

      canvasTex.refresh();
    }
  }
}

