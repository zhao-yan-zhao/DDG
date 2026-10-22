/**
 * 《孤城神机营》- Battlefield Environment Procedural Texture Factory
 * Generates high-fidelity Canvas 2D procedural textures for:
 * - Ming Dynasty Sun-Moon Vermilion Silk Banner (`flag_ming_sun_moon`, 128x64)
 * - Ancient Verdigris Bronze Tripod Brazier Basin (`brazier_basin`, 44x32)
 * - Radial Scorch Crater Decal (`decal_crater`, 64x64)
 * - Weathered Stone Parapet & Crenels Wall (`wall_parapet`, 750x90)
 * - Pre-baked Ramp Battlefield Loess Terrain (`tex_ramp_terrain_baked`, 750x440)
 */

import Phaser from 'phaser';

export const ENV_TEXTURE_KEYS = {
  FLAG_MING_SUN_MOON: 'flag_ming_sun_moon',
  BRAZIER_BASIN: 'brazier_basin',
  DECAL_CRATER: 'decal_crater',
  WALL_PARAPET: 'wall_parapet',
  TEX_RAMP_TERRAIN_BAKED: 'tex_ramp_terrain_baked'
} as const;

export class EnvironmentTextureFactory {
  /**
   * Generates all procedural battlefield environment textures if they do not exist.
   */
  public static generateAll(scene: Phaser.Scene): void {
    this.createFlagMingSunMoon(scene);
    this.createBrazierBasin(scene);
    this.createDecalCrater(scene);
    this.createWallParapet(scene);
    this.createRampTerrainBaked(scene);
  }

  // =========================================================================
  // 1. Ming Sun-Moon Red Silk Banner (128x64)
  // =========================================================================
  public static createFlagMingSunMoon(scene: Phaser.Scene): void {
    const key = ENV_TEXTURE_KEYS.FLAG_MING_SUN_MOON;
    if (scene.textures.exists(key)) return;

    const w = 128;
    const h = 64;
    const canvasTex = scene.textures.createCanvas(key, w, h);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    // 1.1 Vermilion Silk Base Gradient
    const baseGrad = ctx.createLinearGradient(0, 0, w, 0);
    baseGrad.addColorStop(0, '#a71c1c');
    baseGrad.addColorStop(0.3, '#c62828');
    baseGrad.addColorStop(0.7, '#d32f2f');
    baseGrad.addColorStop(1, '#9a1818');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle horizontal silk weave grain
    ctx.fillStyle = 'rgba(255, 230, 200, 0.04)';
    for (let y = 3; y < h; y += 3) {
      ctx.fillRect(8, y, w - 16, 1);
    }

    // 1.2 Left Reinforced Hoist Header (旗杆套/护旗边)
    ctx.fillStyle = '#680f0f';
    ctx.fillRect(0, 0, 8, h);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 7, h - 1);

    // Brass Grommets (铜扣环)
    const drawGrommet = (gy: number) => {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(4, gy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(4, gy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    };
    drawGrommet(12);
    drawGrommet(h - 12);

    // 1.3 Sawtooth Flame Streamers (12 齿火焰飘带牙边)
    // 6 flame teeth on right fly edge + 3 top + 3 bottom = 12 teeth
    ctx.fillStyle = '#ffd700';

    // Right fly teeth (6 teeth)
    const toothH = h / 6;
    for (let i = 0; i < 6; i++) {
      const ty = i * toothH;
      ctx.beginPath();
      ctx.moveTo(w - 14, ty);
      ctx.lineTo(w, ty + toothH / 2);
      ctx.lineTo(w - 14, ty + toothH);
      ctx.closePath();
      ctx.fill();

      // Inner flame tongue
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.moveTo(w - 14, ty + 2);
      ctx.lineTo(w - 5, ty + toothH / 2);
      ctx.lineTo(w - 14, ty + toothH - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd700';
    }

    // Top teeth (3 teeth)
    for (let i = 0; i < 3; i++) {
      const tx = 24 + i * 28;
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx + 12, 6);
      ctx.lineTo(tx + 24, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Bottom teeth (3 teeth)
    for (let i = 0; i < 3; i++) {
      const tx = 24 + i * 28;
      ctx.beginPath();
      ctx.moveTo(tx, h);
      ctx.lineTo(tx + 12, h - 6);
      ctx.lineTo(tx + 24, h);
      ctx.closePath();
      ctx.fill();
    }

    // 1.4 Central Ming Sun-Moon Heraldry (大明神机营“日月”军徽)
    const cx = 56;
    const cy = 32;

    // Radiant Golden Solar Halo (太阳光芒)
    const sunR = 13;
    const rayCount = 12;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.8;
    for (let r = 0; r < rayCount; r++) {
      const angle = (r / rayCount) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * (sunR + 2);
      const y1 = cy + Math.sin(angle) * (sunR + 2);
      const x2 = cx + Math.cos(angle) * (sunR + 7);
      const y2 = cy + Math.sin(angle) * (sunR + 7);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Golden Sun Core (赤金红日)
    const sunGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, sunR);
    sunGrad.addColorStop(0, '#fff59d');
    sunGrad.addColorStop(0.5, '#fbc02d');
    sunGrad.addColorStop(1, '#f57f17');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
    ctx.fill();

    // White Crescent Moon (皓月交辉 - 象征“日月为明”)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 2, cy, sunR - 2.5, -Math.PI * 0.45, Math.PI * 0.45, false);
    ctx.quadraticCurveTo(cx - 3, cy, cx + 2, cy - (sunR - 2.5));
    ctx.closePath();
    ctx.fill();

    // Outer subtle gold ring around heraldry
    ctx.strokeStyle = '#ffe082';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, sunR + 1, 0, Math.PI * 2);
    ctx.stroke();

    canvasTex.refresh();
  }

  // =========================================================================
  // 2. Ancient Verdigris Bronze Tripod Brazier Basin (44x32)
  // =========================================================================
  public static createBrazierBasin(scene: Phaser.Scene): void {
    const key = ENV_TEXTURE_KEYS.BRAZIER_BASIN;
    if (scene.textures.exists(key)) return;

    const w = 44;
    const h = 32;
    const canvasTex = scene.textures.createCanvas(key, w, h);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    const cx = w / 2;

    // 2.1 Bronze Tripod Feet (三足兽蹄)
    ctx.fillStyle = '#1c2d24';
    ctx.strokeStyle = '#365444';
    ctx.lineWidth = 1;

    // Left foot
    ctx.beginPath();
    ctx.moveTo(cx - 12, 18);
    ctx.quadraticCurveTo(cx - 16, 26, cx - 18, 30);
    ctx.lineTo(cx - 13, 30);
    ctx.quadraticCurveTo(cx - 11, 24, cx - 8, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right foot
    ctx.beginPath();
    ctx.moveTo(cx + 12, 18);
    ctx.quadraticCurveTo(cx + 16, 26, cx + 18, 30);
    ctx.lineTo(cx + 13, 30);
    ctx.quadraticCurveTo(cx + 11, 24, cx + 8, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center foot
    ctx.beginPath();
    ctx.moveTo(cx - 3, 18);
    ctx.lineTo(cx - 4, 29);
    ctx.lineTo(cx + 4, 29);
    ctx.lineTo(cx + 3, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2.2 Verdigris Bronze Basin Bowl (青铜兽面腹身)
    const bowlGrad = ctx.createLinearGradient(0, 8, 0, 22);
    bowlGrad.addColorStop(0, '#365444');
    bowlGrad.addColorStop(0.4, '#243a2f');
    bowlGrad.addColorStop(1, '#15241d');
    ctx.fillStyle = bowlGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 19, 9);
    ctx.quadraticCurveTo(cx - 20, 20, cx, 21);
    ctx.quadraticCurveTo(cx + 20, 20, cx + 19, 9);
    ctx.closePath();
    ctx.fill();

    // Bronze highlights on bowl curvature
    ctx.strokeStyle = '#4e7d67';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2.3 Flared Bronze Lip & Rim (青铜盆沿)
    const rimGrad = ctx.createLinearGradient(cx - 20, 0, cx + 20, 0);
    rimGrad.addColorStop(0, '#2d473a');
    rimGrad.addColorStop(0.5, '#5c8d78');
    rimGrad.addColorStop(1, '#2d473a');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(cx - 21, 6, 42, 4);

    ctx.strokeStyle = '#76aa93';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(cx - 21, 6, 42, 4);

    // Decorative meander ticks on rim
    ctx.fillStyle = '#ffd700';
    for (let x = cx - 18; x <= cx + 18; x += 6) {
      ctx.fillRect(x, 7.5, 2, 1.5);
    }

    // 2.4 Glowing Charcoal Ember Bed (炭床内胆)
    const emberGrad = ctx.createRadialGradient(cx, 8, 2, cx, 8, 16);
    emberGrad.addColorStop(0, '#ffffff');
    emberGrad.addColorStop(0.2, '#ffab00');
    emberGrad.addColorStop(0.6, '#ff3d00');
    emberGrad.addColorStop(1, '#3e1308');
    ctx.fillStyle = emberGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 8, 17, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hot ember specks
    ctx.fillStyle = '#fff9c4';
    ctx.fillRect(cx - 6, 7.5, 2, 1);
    ctx.fillRect(cx + 5, 7.5, 2, 1);
    ctx.fillRect(cx - 1, 8, 2, 1);

    canvasTex.refresh();
  }

  // =========================================================================
  // 3. Radial Scorch Crater Decal (64x64)
  // =========================================================================
  public static createDecalCrater(scene: Phaser.Scene): void {
    const key = ENV_TEXTURE_KEYS.DECAL_CRATER;
    if (scene.textures.exists(key)) return;

    const size = 64;
    const canvasTex = scene.textures.createCanvas(key, size, size);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    const cx = size / 2;
    const cy = size / 2;

    // 3.1 Outer Soot Feather (外围辐射烟熏微粒)
    const sootGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 29);
    sootGrad.addColorStop(0, 'rgba(12, 10, 9, 0.95)');
    sootGrad.addColorStop(0.4, 'rgba(28, 22, 18, 0.75)');
    sootGrad.addColorStop(0.7, 'rgba(54, 40, 30, 0.35)');
    sootGrad.addColorStop(1, 'rgba(54, 40, 30, 0)');
    ctx.fillStyle = sootGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 29, 0, Math.PI * 2);
    ctx.fill();

    // 3.2 Deep Carbon Charred Core (深炭火炮弹坑核心)
    ctx.fillStyle = '#0a0807';
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();

    // 3.3 Upturned Charred Earth Rim (翻卷焦黑土石圈)
    ctx.strokeStyle = '#2c1e15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 13.5, 0, Math.PI * 2);
    ctx.stroke();

    // 3.4 Spall Fracture Blast Lines (辐射崩裂纹线 10 条)
    ctx.strokeStyle = '#18120e';
    ctx.lineWidth = 1.6;
    const spallAngles = [0.2, 0.8, 1.4, 2.1, 2.7, 3.4, 4.0, 4.6, 5.3, 5.9];
    for (const angle of spallAngles) {
      const rInner = 9 + (Math.sin(angle * 7) + 1) * 2;
      const rOuter = 23 + (Math.cos(angle * 5) + 1) * 4;
      const midR = (rInner + rOuter) / 2;
      const midAngle = angle + (Math.sin(angle * 3) * 0.15);

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
      ctx.lineTo(cx + Math.cos(midAngle) * midR, cy + Math.sin(midAngle) * midR);
      ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
      ctx.stroke();

      // Tiny glowing ember spark at fracture root
      ctx.fillStyle = 'rgba(255, 87, 34, 0.6)';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * (rInner + 2), cy + Math.sin(angle) * (rInner + 2), 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3.5 Scattered Charred Gravel Specks
    ctx.fillStyle = '#3e2723';
    for (let i = 0; i < 18; i++) {
      const gr = 13 + (i * 11) % 15;
      const ga = (i * 47) % (Math.PI * 2);
      ctx.fillRect(cx + Math.cos(ga) * gr, cy + Math.sin(ga) * gr, 1.5, 1.5);
    }

    canvasTex.refresh();
  }

  // =========================================================================
  // 4. Weathered Stone Parapet & Crenels Wall (750x90)
  // =========================================================================
  public static createWallParapet(scene: Phaser.Scene): void {
    const key = ENV_TEXTURE_KEYS.WALL_PARAPET;
    if (scene.textures.exists(key)) return;

    const w = 750;
    const h = 90;
    const canvasTex = scene.textures.createCanvas(key, w, h);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    // 4.1 Wall Foundation Stone Base (深青石底衬)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
    baseGrad.addColorStop(0, '#222830');
    baseGrad.addColorStop(0.5, '#2c333d');
    baseGrad.addColorStop(1, '#1b2026');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // 4.2 Merlons & Crenels (7 齿垛墙与 6 处垛口, Y: 0 ~ 36)
    // Left & Right watchtower wings: 0..114 and 636..750
    // Central parapet: 114..636 (522px total)
    // 7 Merlons (54px each) + 6 Crenels (24px each) = 378 + 144 = 522px
    const merlonW = 54;
    const crenelW = 24;
    const merlonH = 34;
    const startX = 114;

    // Outer crenel gaps cut-through shadow
    ctx.fillStyle = 'rgba(10, 14, 18, 0.7)';
    for (let c = 0; c < 6; c++) {
      const cx = startX + (c + 1) * merlonW + c * crenelW;
      ctx.fillRect(cx, 0, crenelW, merlonH - 6);
      // Mortar line at crenel bottom sill
      ctx.fillStyle = '#5a5852';
      ctx.fillRect(cx, merlonH - 6, crenelW, 2);
      ctx.fillStyle = 'rgba(10, 14, 18, 0.7)';
    }

    // 7 Merlons with Stone Capping & Arrow Slits
    for (let m = 0; m < 7; m++) {
      const mx = startX + m * (merlonW + crenelW);

      // Merlon body (风化青砖)
      ctx.fillStyle = '#373d45';
      ctx.fillRect(mx, 2, merlonW, merlonH - 2);

      // Top stone capping (垛顶檐砖)
      ctx.fillStyle = '#48505a';
      ctx.fillRect(mx - 1, 0, merlonW + 2, 4);
      ctx.strokeStyle = '#5a6472';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - 1, 0, merlonW + 2, 4);

      // Mortar seam in merlon
      ctx.fillStyle = '#5a5852';
      ctx.fillRect(mx, 18, merlonW, 1.5);

      // Arrow Slit / Embrasure (纵向瞭望射孔: 6x16 px)
      const slitX = mx + merlonW / 2 - 3;
      const slitY = 8;
      ctx.fillStyle = '#0a0d10';
      ctx.fillRect(slitX, slitY, 6, 16);
      ctx.strokeStyle = '#222830';
      ctx.lineWidth = 1;
      ctx.strokeRect(slitX, slitY, 6, 16);
      // White lintel highlight
      ctx.fillStyle = '#657180';
      ctx.fillRect(slitX - 1, slitY - 1, 8, 1.5);
    }

    // 4.3 Running Bond Brick Masonry (工部规制青砖咬砌, Y: 36 ~ 72)
    const brickW = 46;
    const brickH = 12;
    const brickColors = ['#373d45', '#32373f', '#3c434c', '#2c3138', '#424a54'];

    let rowIndex = 0;
    for (let y = 36; y <= 70; y += brickH) {
      const offsetX = (rowIndex % 2 === 0) ? 0 : -(brickW / 2);
      for (let x = offsetX; x < w + brickW; x += brickW) {
        const colorIdx = Math.abs(Math.floor(x * 13 + y * 7)) % brickColors.length;
        ctx.fillStyle = brickColors[colorIdx];
        ctx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);

        // Mortar joint (灰浆缝隙)
        ctx.fillStyle = '#5a5852';
        ctx.fillRect(x, y, brickW, 1);
        ctx.fillRect(x, y, 1, brickH);

        // Subtle brick surface weathering pitting
        ctx.fillStyle = 'rgba(20, 24, 28, 0.4)';
        ctx.fillRect(x + 8, y + 3, 2, 1.5);
        ctx.fillRect(x + 26, y + 6, 2.5, 1.5);
      }
      rowIndex++;
    }

    // 4.4 Row 0 Defensive Timber & Iron Capping (城防工事铁箍木梁封顶, Y: 72 ~ 90)
    // Dark heavy oak timber beam
    const woodGrad = ctx.createLinearGradient(0, 72, 0, 90);
    woodGrad.addColorStop(0, '#4e342e');
    woodGrad.addColorStop(0.3, '#3e2723');
    woodGrad.addColorStop(1, '#271714');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, 72, w, 18);

    // Wood grain lines
    ctx.fillStyle = 'rgba(255, 200, 150, 0.05)';
    ctx.fillRect(0, 76, w, 1);
    ctx.fillRect(0, 83, w, 1);

    // Cast Iron Reinforcement Straps (铁箍加强带)
    ctx.fillStyle = '#1c1c1c';
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 1;
    for (let x = 30; x < w; x += 60) {
      ctx.fillRect(x - 5, 72, 10, 18);
      ctx.strokeRect(x - 5, 72, 10, 18);

      // Bronze Rivets on iron strap (古铜铆钉)
      ctx.fillStyle = '#c59b27';
      ctx.beginPath();
      ctx.arc(x, 76, 2, 0, Math.PI * 2);
      ctx.arc(x, 85, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1c1c';
    }

    // Bottom shadow dividing from sand table
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 88, w, 2);

    canvasTex.refresh();
  }

  // =========================================================================
  // 5. Pre-baked Ramp Battlefield Loess Terrain (750x440)
  // =========================================================================
  public static createRampTerrainBaked(scene: Phaser.Scene): void {
    const key = ENV_TEXTURE_KEYS.TEX_RAMP_TERRAIN_BAKED;
    if (scene.textures.exists(key)) return;

    const w = 750;
    const h = 440;
    const canvasTex = scene.textures.createCanvas(key, w, h);
    if (!canvasTex) return;
    const ctx = canvasTex.context;

    // 5.1 Loess Soil Base (西北黄土坡道基底)
    const loessGrad = ctx.createLinearGradient(0, 0, 0, h);
    loessGrad.addColorStop(0, '#3e3124');
    loessGrad.addColorStop(0.3, '#4a3c2c');
    loessGrad.addColorStop(0.7, '#3d3023');
    loessGrad.addColorStop(1, '#2c2218');
    ctx.fillStyle = loessGrad;
    ctx.fillRect(0, 0, w, h);

    // Natural soil striations & organic patches
    ctx.fillStyle = 'rgba(28, 20, 14, 0.18)';
    for (let y = 10; y < h; y += 16) {
      for (let x = 20; x < w - 20; x += 40) {
        const patchW = 20 + ((x * 7) % 30);
        const patchH = 6 + ((y * 11) % 8);
        ctx.fillRect(x, y, patchW, patchH);
      }
    }

    // 5.2 Heavy Cart Ruts along 5 Attack Lanes (五路攻势历史重型车辙)
    // 5 Attack Lanes from enemy-entity: X in [223, 299, 375, 451, 527]
    const attackLanes = [223, 299, 375, 451, 527];
    const wheelTrackGap = 34; // Gap between left and right wheels
    const rutWidth = 6;

    for (const laneX of attackLanes) {
      const leftWheelX = laneX - wheelTrackGap / 2;
      const rightWheelX = laneX + wheelTrackGap / 2;

      for (const trackX of [leftWheelX, rightWheelX]) {
        // Deep rut furrow shadow
        ctx.strokeStyle = 'rgba(26, 18, 12, 0.65)';
        ctx.lineWidth = rutWidth;
        ctx.beginPath();
        ctx.moveTo(trackX, 0);
        for (let y = 0; y <= h; y += 40) {
          const wander = Math.sin((y + trackX) * 0.02) * 2.5;
          ctx.lineTo(trackX + wander, y);
        }
        ctx.stroke();

        // Compacted dirt rut rim highlight
        ctx.strokeStyle = 'rgba(122, 99, 68, 0.45)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(trackX + rutWidth / 2 + 1, 0);
        for (let y = 0; y <= h; y += 40) {
          const wander = Math.sin((y + trackX) * 0.02) * 2.5;
          ctx.lineTo(trackX + wander + rutWidth / 2 + 1, y);
        }
        ctx.stroke();
      }
    }

    // 5.3 80+ Pebbles & Gravel Stones (80+ 碎石砾石)
    const totalPebbles = 95;
    for (let i = 0; i < totalPebbles; i++) {
      const px = 40 + (i * 37 + (i * i * 13)) % (w - 80);
      const py = 15 + (i * 53 + (i * 17)) % (h - 30);
      const pr = 1.5 + (i % 4);

      // Stone bottom shadow
      ctx.fillStyle = '#140f0b';
      ctx.beginPath();
      ctx.arc(px + 0.8, py + 0.8, pr, 0, Math.PI * 2);
      ctx.fill();

      // Stone body
      ctx.fillStyle = (i % 2 === 0) ? '#635341' : '#4d3f30';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();

      // Stone top light catch
      ctx.fillStyle = '#8a755d';
      ctx.fillRect(px - pr * 0.5, py - pr * 0.5, pr, pr * 0.6);
    }

    // 5.4 20+ Residual Angled Arrows & Bolts (20+ 战前残存斜插折弩羽箭)
    const arrowCount = 24;
    for (let i = 0; i < arrowCount; i++) {
      const ax = 70 + (i * 71 + 33) % (w - 140);
      const ay = 25 + (i * 89 + 17) % (h - 50);
      const angle = (40 + (i * 19) % 35) * (Math.PI / 180); // 40 to 75 deg
      const len = 14 + (i % 5) * 2;

      ctx.save();
      ctx.translate(ax, ay);

      // Ground cast shadow
      ctx.strokeStyle = 'rgba(10, 8, 6, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * (len * 0.8), 2);
      ctx.stroke();

      // Arrow wooden shaft
      ctx.strokeStyle = '#4e3620';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * len, -Math.sin(angle) * len);
      ctx.stroke();

      // Arrow fletching feathers (白/红尾羽)
      const fletchColor = (i % 3 === 0) ? '#c62828' : '#e0e0e0';
      ctx.fillStyle = fletchColor;
      const tipX = Math.cos(angle) * len;
      const tipY = -Math.sin(angle) * len;
      ctx.fillRect(tipX - 2, tipY - 1, 4, 2.5);

      ctx.restore();
    }

    // 5.5 Ancient Faded Scorch Marks (历次战役遗留浅焦坑 5 处)
    const oldCraters = [
      { x: 160, y: 120, r: 26 },
      { x: 580, y: 180, r: 32 },
      { x: 340, y: 290, r: 24 },
      { x: 210, y: 380, r: 28 },
      { x: 620, y: 350, r: 22 }
    ];

    for (const c of oldCraters) {
      const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, c.r);
      g.addColorStop(0, 'rgba(20, 15, 12, 0.48)');
      g.addColorStop(0.5, 'rgba(35, 26, 20, 0.32)');
      g.addColorStop(1, 'rgba(50, 38, 28, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    canvasTex.refresh();
  }
}
