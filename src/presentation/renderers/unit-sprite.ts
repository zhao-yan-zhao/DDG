/**
 * 《孤城神机营》- Weapon Unit Visual Container
 * Visual representation of weapon instances on the sand table grid or bench.
 * Supports:
 * - 2.5D Physical Base: Diffuse drop shadow, tiered plinth, beveled edge, corner rivets
 * - Star Level Progression: ★1 clean timber/bronze, ★2 reinforced brackets, ★3 dragon/beast crests, ★4 golden celestial aura
 * - Multi-cell footprint dimensions (1x1, 1x2, 2x1, 2x2)
 * - Faction aesthetic themes (Fire, Mohist, Fortress, Qimen)
 * - Dynamic Y-depth sorting: 10 + floor(y * 0.1), drag depth override 100
 * - Firing recoil, muzzle heat glow, high-star rune aura animations
 */

import Phaser from 'phaser';
import { WeaponInstance, Faction, StarLevel } from '../../core/types';
import { GRID_CONFIG } from '../touch/touch-controller';
import { ThreeSceneManager } from '../three/three-scene-manager';
import { WeaponTextureFactory } from '../textures/weapon-texture-factory';

export const FACTION_COLORS: Record<Faction, { bg: number; border: number; accent: number; name: string }> = {
  fire: { bg: 0x541818, border: 0xffa000, accent: 0xffd54f, name: '神机' },
  mohist: { bg: 0x0c343d, border: 0x00e5ff, accent: 0x80deea, name: '墨家' },
  fortress: { bg: 0x3e2723, border: 0xffb74d, accent: 0xffe082, name: '城防' },
  qimen: { bg: 0x2c134d, border: 0xba68c8, accent: 0xe1bee7, name: '奇门' }
};

export class UnitSprite extends Phaser.GameObjects.Container {
  public weapon: WeaponInstance;
  private bgGraphics: Phaser.GameObjects.Graphics;
  private runeGraphics: Phaser.GameObjects.Graphics;
  private heatGraphics: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private starText: Phaser.GameObjects.Text;
  private cooldownBar: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private brokenIconText?: Phaser.GameObjects.Text;
  private isDraggingVisual: boolean = false;
  private baseY: number = 0;
  private recoilTween?: Phaser.Tweens.Tween;

  // Muzzle heat glow timer (0.8s linear cooldown)
  public heatTimer: number = 0;
  public readonly HEAT_DURATION: number = 0.8;

  constructor(scene: Phaser.Scene, weapon: WeaponInstance) {
    super(scene, 0, 0);
    this.weapon = weapon;

    this.bgGraphics = scene.add.graphics();
    this.add(this.bgGraphics);

    this.runeGraphics = scene.add.graphics();
    this.add(this.runeGraphics);

    this.cooldownBar = scene.add.graphics();
    this.add(this.cooldownBar);

    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);

    this.heatGraphics = scene.add.graphics();
    this.add(this.heatGraphics);

    const displayName = weapon.name || weapon.configId;
    this.nameText = scene.add.text(0, -6, displayName.substring(0, 4), {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    this.add(this.nameText);

    const starsString = '★'.repeat(weapon.star);
    this.starText = scene.add.text(0, 14, starsString, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffd700',
      align: 'center'
    }).setOrigin(0.5);
    this.add(this.starText);

    this.drawBody();
    this.updateHealthBar();
    this.updateDepth();
    scene.add.existing(this);
  }

  private baseScale: number = 1.0;

  public setPerspectiveScale(scale: number): void {
    this.baseScale = scale;
    if (!this.isDraggingVisual) {
      this.setScale(this.baseScale);
    }
  }

  public getPerspectiveScale(): number {
    return this.baseScale;
  }

  public updateWeaponData(weapon: WeaponInstance): void {
    this.weapon = weapon;
    const displayName = weapon.name || weapon.configId;
    this.nameText.setText(displayName.substring(0, 4));
    this.starText.setText('★'.repeat(weapon.star));
    this.drawBody();
  }

  public updateDepth(): void {
    if (this.isDraggingVisual) {
      this.setDepth(100);
    } else {
      this.setDepth(10 + Math.floor(this.y * 0.1));
    }
  }

  public override setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    if (y !== undefined) {
      this.baseY = y;
    }
    this.updateDepth();
    return this;
  }

  public override setY(value?: number): this {
    super.setY(value);
    if (value !== undefined) {
      this.baseY = value;
    }
    this.updateDepth();
    return this;
  }

  public setDragging(dragging: boolean, customScale?: number): void {
    this.isDraggingVisual = dragging;
    if (dragging) {
      this.setScale(customScale ?? (this.baseScale * 1.1));
      this.setAlpha(0.9);
      this.setDepth(100);
    } else {
      this.setScale(this.baseScale);
      this.setAlpha(1.0);
      this.updateDepth();
    }
  }

  /**
   * Recoil shake effect anchored strictly to baseY to prevent accumulated positional drift.
   */
  public playRecoil(): void {
    if (this.recoilTween) {
      this.recoilTween.stop();
      this.recoilTween = undefined;
    }
    this.scene.tweens.killTweensOf(this);
    this.y = this.baseY;

    this.recoilTween = this.scene.tweens.add({
      targets: this,
      y: this.baseY + 4,
      duration: 45,
      yoyo: true,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.y = this.baseY;
        this.recoilTween = undefined;
      }
    });
  }

  public updateCooldown(progress: number): void {
    this.cooldownBar.clear();
    if (progress <= 0 || progress >= 1.0) return;

    const cellW = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
    const cellH = (GRID_CONFIG.endY - GRID_CONFIG.startY) / GRID_CONFIG.rows;
    const w = (this.weapon.footprint.width * cellW) - 12;
    const h = 3;
    const x = -w / 2;
    const y = (this.weapon.footprint.height * cellH) / 2 - 6;

    this.cooldownBar.fillStyle(0x00e676, 0.8);
    this.cooldownBar.fillRect(x, y, w * (1 - progress), h);
  }

  private spriteImage?: Phaser.GameObjects.Image;

  private drawBody(): void {
    this.bgGraphics.clear();

    const fp = this.weapon.footprint;
    const cellW = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
    const cellH = (GRID_CONFIG.endY - GRID_CONFIG.startY) / GRID_CONFIG.rows;
    // The background color block stretches to encompass the multi-cell footprint (w x h)
    const w = fp.width * cellW - 6;
    const h = fp.height * cellH - 6;
    const x = -w / 2;
    const y = -h / 2;

    const theme = FACTION_COLORS[this.weapon.faction] || FACTION_COLORS.fire;
    const is3D = ThreeSceneManager.getInstance().getRenderMode() === '3d';

    // =========================================================================
    // 1. 2.5D Physical Base: Drop shadow + Tiered plinth + Beveled edge
    // =========================================================================

    // 1.1 Diffuse contact ground shadow
    this.bgGraphics.fillStyle(0x000000, 0.35);
    this.bgGraphics.fillRoundedRect(x + 2, y + 6, w, h, 8);

    // 1.2 Beveled vertical chamfer lip (adds solid downward 3D mechanical thickness)
    this.bgGraphics.fillStyle(0x1a1a1a, 0.75);
    this.bgGraphics.fillRoundedRect(x, y + 4, w, h, 8);

    // 1.3 Main tiered stone plinth top surface (subtle translucent tone to integrate with stone tiles)
    this.bgGraphics.fillStyle(theme.bg, 0.28);
    this.bgGraphics.fillRoundedRect(x, y, w, h - 2, 8);

    // 1.4 Top surface highlight catch-line
    this.bgGraphics.lineStyle(1.5, 0xffffff, 0.20);
    this.bgGraphics.lineBetween(x + 6, y + 1, x + w - 6, y + 1);

    // 1.5 Outer metallic frame & Star level progression
    const star = this.weapon.star || 1;
    const borderWidth = star >= 3 ? 3 : 2;
    const borderColor = star === 4 ? 0xffd700 : theme.border;
    this.bgGraphics.lineStyle(borderWidth, borderColor, star >= 3 ? 0.75 : 0.40);
    this.bgGraphics.strokeRoundedRect(x, y, w, h - 2, 8);

    // 1.6 Star tier decorations & corner structural rivets
    if (star === 1) {
      // ★1: Clean timber/bronze with crisp corner rivets
      this.bgGraphics.fillStyle(theme.accent, 0.85);
      this.bgGraphics.fillCircle(x + 6, y + 6, 2.5);
      this.bgGraphics.fillCircle(x + w - 6, y + 6, 2.5);
      this.bgGraphics.fillCircle(x + 6, y + h - 8, 2.5);
      this.bgGraphics.fillCircle(x + w - 6, y + h - 8, 2.5);

      // Fine hairline inner inlay
      this.bgGraphics.lineStyle(1, theme.accent, 0.25);
      this.bgGraphics.strokeRoundedRect(x + 3, y + 3, w - 6, h - 8, 6);
    } else if (star === 2) {
      // ★2: Reinforced bronze brackets & corner angle plates
      this.bgGraphics.fillStyle(theme.accent, 0.95);
      this.bgGraphics.fillCircle(x + 6, y + 6, 2.5);
      this.bgGraphics.fillCircle(x + w - 6, y + 6, 2.5);
      this.bgGraphics.fillCircle(x + 6, y + h - 8, 2.5);
      this.bgGraphics.fillCircle(x + w - 6, y + h - 8, 2.5);

      // Reinforced L-angle brackets on all 4 corners
      this.bgGraphics.lineStyle(2, theme.accent, 0.85);
      this.bgGraphics.lineBetween(x + 2, y + 12, x + 12, y + 2);
      this.bgGraphics.lineBetween(x + w - 12, y + 2, x + w - 2, y + 12);
      this.bgGraphics.lineBetween(x + 2, y + h - 14, x + 12, y + h - 4);
      this.bgGraphics.lineBetween(x + w - 12, y + h - 4, x + w - 2, y + h - 14);

      // Inner inlay border
      this.bgGraphics.lineStyle(1.5, theme.accent, 0.40);
      this.bgGraphics.strokeRoundedRect(x + 3, y + 3, w - 6, h - 8, 6);
    } else if (star === 3) {
      // ★3: Dragon / beast corner crests & ornate bronze inlay
      this.bgGraphics.fillStyle(theme.accent, 1.0);
      this.bgGraphics.fillRect(x + 2, y + 2, 7, 7);
      this.bgGraphics.fillRect(x + w - 9, y + 2, 7, 7);
      this.bgGraphics.fillRect(x + 2, y + h - 10, 7, 7);
      this.bgGraphics.fillRect(x + w - 9, y + h - 10, 7, 7);

      // Inner studs
      this.bgGraphics.fillStyle(0xffffff, 0.9);
      this.bgGraphics.fillCircle(x + 5.5, y + 5.5, 2);
      this.bgGraphics.fillCircle(x + w - 5.5, y + 5.5, 2);
      this.bgGraphics.fillCircle(x + 5.5, y + h - 6.5, 2);
      this.bgGraphics.fillCircle(x + w - 5.5, y + h - 6.5, 2);

      // Double inner inlay
      this.bgGraphics.lineStyle(1.5, 0x00e5ff, 0.65);
      this.bgGraphics.strokeRoundedRect(x + 3.5, y + 3.5, w - 7, h - 9, 6);
    } else {
      // ★4: Golden celestial aura & gilt corner seals
      this.bgGraphics.fillStyle(0xffd700, 1.0);
      this.bgGraphics.fillRect(x + 2, y + 2, 8, 8);
      this.bgGraphics.fillRect(x + w - 10, y + 2, 8, 8);
      this.bgGraphics.fillRect(x + 2, y + h - 11, 8, 8);
      this.bgGraphics.fillRect(x + w - 10, y + h - 11, 8, 8);

      // Brilliant diamond core
      this.bgGraphics.fillStyle(0xffffff, 1.0);
      this.bgGraphics.fillCircle(x + 6, y + 6, 2.5);
      this.bgGraphics.fillCircle(x + w - 6, y + 6, 2.5);
      this.bgGraphics.fillCircle(x + 6, y + h - 7, 2.5);
      this.bgGraphics.fillCircle(x + w - 6, y + h - 7, 2.5);

      // Celestial golden border inlay
      this.bgGraphics.lineStyle(1.5, 0xffea00, 0.75);
      this.bgGraphics.strokeRoundedRect(x + 3.5, y + 3.5, w - 7, h - 9, 6);
    }

    // 1.3 If 3D mode, draw central pedestal crosshair/bracket for mounting 3D model
    if (is3D) {
      this.bgGraphics.lineStyle(1.5, theme.accent, 0.35);
      this.bgGraphics.strokeCircle(0, 0, Math.min(w, h) * 0.28);
    }

    // =========================================================================
    // 2. Weapon visual sprite image (only shown in 2D mode; 3D models render via Three.js)
    // =========================================================================
    let targetTextureKey = WeaponTextureFactory.getTextureKey(this.weapon.configId);
    if (!this.scene.textures.exists(targetTextureKey)) {
      const fallbackKey = 'weapon_' + this.weapon.configId;
      if (this.scene.textures.exists(fallbackKey)) {
        targetTextureKey = fallbackKey;
      }
    }

    const hasTexture = this.scene.textures.exists(targetTextureKey);

    if (!is3D && hasTexture) {
      if (!this.spriteImage) {
        this.spriteImage = this.scene.add.image(0, 0, targetTextureKey);
        this.addAt(this.spriteImage, 1);
      } else {
        this.spriteImage.setTexture(targetTextureKey);
      }

      // Maximize realistic presence on grid footprint while preserving aspect ratio
      const tex = this.scene.textures.get(targetTextureKey);
      const texSource = tex ? (tex as any).getSourceImage?.() : null;
      const origW = (texSource && texSource.width) || 72;
      const origH = (texSource && texSource.height) || 72;
      const maxW = w + 4;
      const maxH = h + 8;
      const imgScale = Math.min(maxW / origW, maxH / origH);

      this.spriteImage.setDisplaySize(origW * imgScale, origH * imgScale);
      this.spriteImage.setPosition(0, -4);
      this.spriteImage.setVisible(true);
      this.spriteImage.setAlpha(1.0);
    } else if (this.spriteImage) {
      this.spriteImage.setVisible(false);
    }

    // Ensure strict layer ordering:
    // [0] bgGraphics -> [1] runeGraphics -> [2] spriteImage -> [3] cooldownBar -> [4] starText -> [5] nameText -> [6] heatGraphics
    this.sendToBack(this.bgGraphics);
    if (this.runeGraphics) {
      this.moveTo(this.runeGraphics, 1);
    }
    if (this.spriteImage) {
      this.moveTo(this.spriteImage, 2);
    }
    this.bringToTop(this.cooldownBar);
    this.bringToTop(this.starText);
    this.bringToTop(this.nameText);
    this.bringToTop(this.heatGraphics);

    // 3. Nameplate & Star Placements: Clean calligraphic pill and micro star
    this.nameText.setY(h / 2 - 12);
    this.nameText.setStyle({
      fontFamily: 'serif, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#12100edd',
      padding: { x: 4, y: 1 }
    });
    this.starText.setY(-h / 2 + 10);
    this.starText.setStyle({
      fontSize: '11px',
      color: '#ffd700'
    });
  }

  /**
   * Updates health bar for Row 0 Frontline Fortress weapons.
   */
  public updateHealthBar(): void {
    this.healthBar.clear();

    // Only draw health bar if placed on Row 0 and has maxHp
    if (this.weapon.anchor.row !== 0 || !this.weapon.maxHp) {
      if (this.brokenIconText) {
        this.brokenIconText.setVisible(false);
      }
      return;
    }

    const fp = this.weapon.footprint;
    const cellW = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
    const w = Math.min(fp.width * cellW - 12, 54);
    const barH = 5;
    const x = -w / 2;
    const y = -28; // Placed at top edge of base

    const maxHp = this.weapon.maxHp || 300;
    const currentHp = Math.max(0, this.weapon.currentHp ?? maxHp);
    const hpRatio = Math.min(1.0, currentHp / maxHp);

    if (this.weapon.isBroken || currentHp <= 0) {
      // Broken state: Draw dark cracked slot + red/gray skull or break indicator
      this.healthBar.fillStyle(0x222222, 0.85);
      this.healthBar.fillRoundedRect(x, y, w, barH, 2);
      this.healthBar.lineStyle(1, 0xd50000, 0.9);
      this.healthBar.strokeRoundedRect(x, y, w, barH, 2);

      if (!this.brokenIconText) {
        this.brokenIconText = this.scene.add.text(0, y - 6, '✖ 破损', {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          color: '#ff5252',
          fontStyle: 'bold',
          backgroundColor: '#000000aa',
          padding: { x: 3, y: 1 }
        }).setOrigin(0.5);
        this.add(this.brokenIconText);
      }
      this.brokenIconText.setVisible(true);
      this.bringToTop(this.brokenIconText);
      this.setAlpha(0.45);
      return;
    }

    // Active state: Hide broken icon and reset alpha
    if (this.brokenIconText) {
      this.brokenIconText.setVisible(false);
    }
    this.setAlpha(1.0);

    // Background track
    this.healthBar.fillStyle(0x111111, 0.8);
    this.healthBar.fillRoundedRect(x, y, w, barH, 2);

    // Color gradient based on HP ratio: Healthy = cyan/green (0x00e676), Mid = amber (0xffb300), Critical = red (0xff1744)
    let barColor = 0x00e676;
    if (hpRatio < 0.3) {
      barColor = 0xff1744;
    } else if (hpRatio < 0.6) {
      barColor = 0xffb300;
    }

    if (hpRatio > 0) {
      this.healthBar.fillStyle(barColor, 0.95);
      this.healthBar.fillRoundedRect(x, y, Math.max(2, w * hpRatio), barH, 2);
    }

    // Outer border
    this.healthBar.lineStyle(1, 0x000000, 0.9);
    this.healthBar.strokeRoundedRect(x, y, w, barH, 2);
    this.bringToTop(this.healthBar);
  }

  /**
   * Activates muzzle heat glow on weapon firing. Cooldown fades linearly over 0.8s.
   */
  public playMuzzleHeat(): void {
    this.heatTimer = this.HEAT_DURATION;
  }

  /**
   * Per-frame update for muzzle heat dissipation and high-star rune glow animations.
   */
  public update(deltaSec: number, time?: number): void {
    const fp = this.weapon.footprint;
    const cellW = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
    const cellH = (GRID_CONFIG.endY - GRID_CONFIG.startY) / GRID_CONFIG.rows;
    const w = fp.width * cellW - 6;
    const h = fp.height * cellH - 6;
    const x = -w / 2;
    const y = -h / 2;
    const t = time ?? Date.now();

    // 1. Muzzle Heat Glow (Emissive orange-red fading over 0.8s)
    if (this.heatTimer > 0) {
      this.heatTimer = Math.max(0, this.heatTimer - deltaSec);
      const intensity = this.heatTimer / this.HEAT_DURATION;

      this.heatGraphics.clear();
      if (intensity > 0) {
        const muzzleY = y + 4;
        // Outer emissive orange-red glow
        this.heatGraphics.fillStyle(0xff3d00, 0.65 * intensity);
        this.heatGraphics.fillCircle(0, muzzleY, 14);

        // Inner bright yellow hot core
        this.heatGraphics.fillStyle(0xffff00, 0.85 * intensity);
        this.heatGraphics.fillCircle(0, muzzleY, 7);

        // White-hot center
        this.heatGraphics.fillStyle(0xffffff, 1.0 * intensity);
        this.heatGraphics.fillCircle(0, muzzleY, 3);
      }
    } else {
      this.heatGraphics.clear();
    }

    // 2. High-Star Rune Glow (★3 cyan pulsation, ★4 radiant golden micro-sparkles)
    if (this.weapon.star === 3) {
      // ★3: Pulsating cyan border glow (0x00e5ff, alpha oscillating 0.4~0.8)
      const pulseAlpha = 0.60 + 0.20 * Math.sin(t * 0.003);
      this.runeGraphics.clear();
      this.runeGraphics.lineStyle(3, 0x00e5ff, pulseAlpha);
      this.runeGraphics.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 10);
    } else if (this.weapon.star === 4) {
      // ★4: Radiant golden border glow (0xffd700) with circulating golden rune micro-sparkles
      this.runeGraphics.clear();
      this.runeGraphics.lineStyle(3.5, 0xffd700, 0.85);
      this.runeGraphics.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 10);

      // Circulating golden rune micro-sparkles along card edges
      const perimeter = 2 * (w + h);
      const numSparkles = 4;
      for (let i = 0; i < numSparkles; i++) {
        const dist = ((t * 0.08) + i * (perimeter / numSparkles)) % perimeter;
        let px = x;
        let py = y;

        if (dist < w) {
          px = x + dist;
          py = y;
        } else if (dist < w + h) {
          px = x + w;
          py = y + (dist - w);
        } else if (dist < 2 * w + h) {
          px = x + w - (dist - (w + h));
          py = y + h;
        } else {
          px = x;
          py = y + h - (dist - (2 * w + h));
        }

        this.runeGraphics.fillStyle(0xffffff, 0.95);
        this.runeGraphics.fillCircle(px, py, 2.0);
        this.runeGraphics.fillStyle(0xffd700, 0.55);
        this.runeGraphics.fillCircle(px, py, 4.0);
      }
    } else {
      this.runeGraphics.clear();
    }
  }

  public override destroy(fromScene?: boolean): void {
    this.heatTimer = 0;
    this.bgGraphics?.destroy();
    this.runeGraphics?.destroy();
    this.heatGraphics?.destroy();
    this.cooldownBar?.destroy();
    this.healthBar?.destroy();
    this.brokenIconText?.destroy();
    this.nameText?.destroy();
    this.starText?.destroy();
    this.spriteImage?.destroy();
    super.destroy(fromScene);
  }
}
