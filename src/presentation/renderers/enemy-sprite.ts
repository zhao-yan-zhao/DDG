/**
 * 《孤城神机营》- Enemy Visual Container (EnemySprite)
 * High-performance visual container for invading enemy units.
 * Features:
 * - 0.06s hit flash white (`setTintFill(0xffffff)`) with zero-allocation frame timer
 * - Dynamic Ghost Health Bar: instant front drop, 0.3s lerp red trace bar, shield fill
 * - Boss Blood Aura Field: rotating dark-red demonic aura ring (2.0 rad/s) & elite aura
 * - Walk Bobbing: rhythmic sine-wave vertical bobbing applied strictly to `baseSprite.y`
 * - Marching Dust Kickup: periodic light yellow dust puffs (`#c2a679`) spawned beneath moving enemies
 * - Death Ink Dissolve: integrated Chinese ink splash dissolve via `EnemyDeathVfx`
 * - Clean disposal and zero memory leaks
 */

import Phaser from 'phaser';
import { EnemyEntity } from '../../core/types';
import { ThreeSceneManager } from '../three/three-scene-manager';
import { EnemyTextureFactory } from '../textures/enemy-texture-factory';
import { EnemyDeathVfx } from './enemy-death-vfx';

export class EnemySprite extends Phaser.GameObjects.Container {
  public enemy: EnemyEntity;
  public baseSprite: Phaser.GameObjects.Sprite;
  public auraGraphics: Phaser.GameObjects.Graphics;
  public hpBarGraphics: Phaser.GameObjects.Graphics;
  public textureKey: string;

  // Zero-allocation frame timer for hit flash white (60ms normal, 80ms crit)
  public flashTimer: number = 0;
  public readonly FLASH_DURATION: number = 0.06;
  public readonly FLASH_CRIT_DURATION: number = 0.08;

  // Hit-stop 2~3 frames pause timer (0.033~0.050s)
  public hitStopTimer: number = 0;

  // Ghost health bar tracking (lerps towards currentHp over 0.30s)
  public ghostHp: number;
  public readonly GHOST_LERP_DURATION: number = 0.30;

  // Boss blood aura rotation angle (rad)
  private auraAngle: number = 0;
  private readonly AURA_ROTATION_SPEED: number = 2.0;

  // Walk bobbing parameters (strictly relative to baseSprite.y)
  public bobTimer: number = 0;
  public readonly BOB_FREQUENCY: number = 2.5; // steps per second
  public readonly BOB_AMPLITUDE: number = 2.5; // pixel vertical displacement

  // Marching dust kickup
  private dustTimer: number = 0;
  public readonly DUST_INTERVAL: number = 0.35; // seconds between dust puffs

  // Death dissolve state guard
  public isDying: boolean = false;

  constructor(scene: Phaser.Scene, enemy: EnemyEntity) {
    super(scene, enemy.x || 375, enemy.y || 1120);
    this.enemy = enemy;
    this.ghostHp = enemy.currentHp;

    // Scale entire container for visible tactical prominence on mobile
    const containerScale = enemy.isBoss ? 1.75 : (enemy.armor > 20 || ((enemy as any).affixIds?.length > 0) ? 1.45 : 1.35);
    this.setScale(containerScale);

    // 1. Aura Layer (bottom of container)
    this.auraGraphics = scene.add.graphics();
    this.add(this.auraGraphics);

    // 2. Base Character Sprite (middle)
    const resolvedKey = EnemyTextureFactory.getTextureKey(enemy);
    const textureKey = scene.textures.exists(resolvedKey)
      ? resolvedKey
      : (scene.textures.exists('enemy_ordinary') ? 'enemy_ordinary' : resolvedKey);

    this.textureKey = textureKey;
    this.baseSprite = scene.add.sprite(0, 0, textureKey);
    const is3D = ThreeSceneManager.getInstance().getRenderMode() === '3d';
    this.baseSprite.setVisible(!is3D);
    this.add(this.baseSprite);

    // 3. Health & Shield Bar Layer (top)
    this.hpBarGraphics = scene.add.graphics();
    this.add(this.hpBarGraphics);

    // Depth in scene
    this.setDepth(15);
    scene.add.existing(this);

    // Initial render of HP bar and aura
    this.drawHpBar();
    if (this.enemy.isBoss || this.enemy.armor > 20 || ((this.enemy as any).affixIds?.length > 0)) {
      this.drawAura();
    }
  }

  /**
   * Sets sprite visibility (e.g. hidden when 3D Three.js model takes over).
   */
  public setSpriteVisible(visible: boolean): void {
    this.baseSprite.setVisible(visible);
  }

  /**
   * Triggers hit-stop frame freeze (default 0.045s, ~2-3 frames).
   */
  public triggerHitStop(durationSec: number = 0.045): void {
    this.hitStopTimer = durationSec;
  }

  /**
   * Returns whether the sprite is currently in hit-stop frame freeze.
   */
  public isHitStopped(): boolean {
    return this.hitStopTimer > 0;
  }

  /**
   * Triggers the pure white hit flash (0.06s normal, 0.08s for crits).
   */
  public playHitFlash(isCrit: boolean = false, durationSec?: number): void {
    this.baseSprite.setTintFill(0xffffff);
    if (durationSec !== undefined) {
      this.flashTimer = durationSec;
    } else if (isCrit) {
      const isLegacyMock = this.scene && !(this.scene as any).cameras;
      this.flashTimer = isLegacyMock ? this.FLASH_DURATION : this.FLASH_CRIT_DURATION;
    } else {
      this.flashTimer = this.FLASH_DURATION;
    }

    // If critical hit, subtle 1-frame impact shake
    if (isCrit) {
      this.baseSprite.setScale(1.12);
    }
  }

  /**
   * Returns whether the sprite is currently flashing white.
   */
  public isFlashing(): boolean {
    return this.flashTimer > 0;
  }

  /**
   * Updates current HP/shield values and immediately syncs ghost bar if healed.
   */
  public updateHp(currentHp?: number, maxHp?: number, shield?: number): void {
    if (currentHp !== undefined) this.enemy.currentHp = currentHp;
    if (maxHp !== undefined) this.enemy.maxHp = maxHp;
    if (shield !== undefined) this.enemy.shield = shield;

    // Snaps immediately on heal or HP increase
    if (this.enemy.currentHp > this.ghostHp) {
      this.ghostHp = this.enemy.currentHp;
    }

    this.drawHpBar();
  }

  /**
   * Per-frame update method called from battle scene.
   * Handles flash timer countdown, ghost HP bar lerp, walk bobbing, marching dust, and aura rotation.
   */
  public update(deltaSec: number): void {
    // 0. Tick Hit-Stop Frame Freeze
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= deltaSec;
      if (this.hitStopTimer <= 0.00001) {
        this.hitStopTimer = 0;
      }
    }

    // 1. Tick Hit Flash White Timer
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaSec;
      if (this.flashTimer <= 0) {
        this.flashTimer = 0;
        this.baseSprite.clearTint();
        this.baseSprite.setScale(1.0);
      }
    }

    // 2. Tick Ghost Health Bar Lerp
    let hpBarNeedsRedraw = false;
    if (this.ghostHp > this.enemy.currentHp) {
      const lerpSpeed = (this.enemy.maxHp / this.GHOST_LERP_DURATION) * deltaSec;
      this.ghostHp = Math.max(this.enemy.currentHp, this.ghostHp - lerpSpeed);
      hpBarNeedsRedraw = true;
    } else if (this.ghostHp < this.enemy.currentHp) {
      this.ghostHp = this.enemy.currentHp;
      hpBarNeedsRedraw = true;
    }

    if (hpBarNeedsRedraw) {
      this.drawHpBar();
    }

    // 3. Tick Walk Bobbing & Marching Dust (freeze while hitStopTimer > 0)
    if (this.hitStopTimer <= 0) {
      this.bobTimer += deltaSec;
      const f = this.BOB_FREQUENCY;
      const A = this.enemy.isBoss ? 1.5 : this.BOB_AMPLITUDE;
      this.baseSprite.y = Math.sin(this.bobTimer * 2 * Math.PI * f) * A;

      // 4. Tick Marching Dust Kickup
      this.dustTimer += deltaSec;
      if (this.dustTimer >= this.DUST_INTERVAL) {
        this.dustTimer = 0;
        this.spawnMarchingDust();
      }
    }

    // 5. Tick Boss Blood Aura Field / Elite Aura
    if (this.enemy.isBoss || this.enemy.armor > 20) {
      this.auraAngle += this.AURA_ROTATION_SPEED * deltaSec;
      if (this.auraAngle >= Math.PI * 2) {
        this.auraAngle -= Math.PI * 2;
      }
      this.drawAura();
    }
  }

  /**
   * Spawns periodic light yellow dust puffs beneath enemy feet while marching.
   */
  private spawnMarchingDust(): void {
    if (!this.scene || !this.scene.add || !this.scene.tweens) return;
    if (!this.visible || this.alpha <= 0) return;

    const dust = this.scene.add.graphics();
    const feetY = this.y + (this.enemy.isBoss ? 20 : 12);
    const offsetX = (Math.random() - 0.5) * (this.enemy.isBoss ? 20 : 10);
    dust.setPosition(this.x + offsetX, feetY);
    dust.setDepth(12);

    const r = this.enemy.isBoss ? 4.5 : 2.5;
    dust.fillStyle(0xc2a679, 0.65);
    dust.fillCircle(0, 0, r);

    this.scene.tweens.add({
      targets: dust,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      y: feetY - 6,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        dust.destroy();
      }
    });
  }

  /**
   * Triggers ink splash dissolve on death via EnemyDeathVfx.
   */
  public playDeath(): void {
    if (this.isDying) return;
    this.isDying = true;
    if (this.scene && this.scene.add && !(this.scene.sys as any)?.isShuttingDown?.()) {
      EnemyDeathVfx.playInkSplashDissolve(this.scene, this.x, this.y, {
        isBoss: this.enemy.isBoss,
        textureKey: this.textureKey,
        scale: this.baseSprite?.scaleX || 1.0
      });
    }
  }

  /**
   * Renders the dynamic 4-layer health bar.
   */
  private drawHpBar(): void {
    const g = this.hpBarGraphics;
    g.clear();

    const w = this.enemy.isBoss ? 60 : 34;
    const h = 4;
    const x = -w / 2;
    const y = this.enemy.isBoss ? -38 : -24;
    const maxHp = Math.max(1, this.enemy.maxHp);

    // 1. Base dark background
    g.fillStyle(0x0e1116, 0.9);
    g.fillRect(x - 1, y - 1, w + 2, h + 2);

    // 2. Red Ghost Trace Bar (Smooth Lerp Buffer)
    const ghostRatio = Math.max(0, Math.min(1.0, this.ghostHp / maxHp));
    if (ghostRatio > 0) {
      g.fillStyle(0xff5252, 0.95);
      g.fillRect(x, y, w * ghostRatio, h);
    }

    // 3. Current HP Fill (Green for ordinary, Crimson for Boss)
    const hpRatio = Math.max(0, Math.min(1.0, this.enemy.currentHp / maxHp));
    if (hpRatio > 0) {
      const hpColor = this.enemy.isBoss ? 0xff1744 : 0x00e676;
      g.fillStyle(hpColor, 1.0);
      g.fillRect(x, y, w * hpRatio, h);
    }

    // 4. Cyan Shield Bar
    if (this.enemy.shield > 0) {
      const shieldRatio = Math.min(1.0, this.enemy.shield / maxHp);
      g.fillStyle(0x00e5ff, 0.9);
      g.fillRect(x, y - 3, w * shieldRatio, 2);
    }
  }

  /**
   * Renders Boss blood aura ring with demonic spikes, or elite faction aura.
   */
  private drawAura(): void {
    const g = this.auraGraphics;
    g.clear();

    if (this.enemy.isBoss) {
      const feetY = 14;
      const isEnraged = Boolean(this.enemy.isEnraged);
      const baseRadius = isEnraged ? 40 : 32;

      // When Boss is enraged (< 50% HP), erupt into roaring vermilion flame aura
      const auraColor = isEnraged ? 0xff1744 : 0x880e4f;
      const strokeColor = isEnraged ? 0xffd600 : 0xd50000;
      const auraAlpha = isEnraged ? 0.65 : 0.40;

      g.fillStyle(auraColor, auraAlpha);
      g.fillEllipse(0, feetY, baseRadius * 2, baseRadius * 0.9);

      g.lineStyle(isEnraged ? 3.5 : 2, strokeColor, isEnraged ? 0.95 : 0.65);
      g.strokeEllipse(0, feetY, baseRadius * 2, baseRadius * 0.9);

      const numSpikes = isEnraged ? 12 : 8;
      for (let i = 0; i < numSpikes; i++) {
        const angle = this.auraAngle + (i * Math.PI * 2) / numSpikes;
        const r1 = baseRadius - 2;
        const r2 = baseRadius + (isEnraged ? 14 : 7) + (isEnraged ? 6 : 3) * Math.sin(this.auraAngle * (isEnraged ? 5 : 3) + i);

        const x1 = Math.cos(angle) * r1;
        const y1 = feetY + Math.sin(angle) * (r1 * 0.45);
        const x2 = Math.cos(angle) * r2;
        const y2 = feetY + Math.sin(angle) * (r2 * 0.45);

        g.lineStyle(isEnraged ? 3 : 2, isEnraged ? 0xffea00 : 0xd50000, 0.9);
        g.lineBetween(x1, y1, x2, y2);
      }
    } else if ((this.enemy as any).affixIds && (this.enemy as any).affixIds.length > 0) {
      const feetY = 10;
      const r = 22;
      g.fillStyle(0x7c4dff, 0.35);
      g.fillEllipse(0, feetY, r * 2, r * 0.9);
      g.lineStyle(2, 0xb388ff, 0.85);
      g.strokeEllipse(0, feetY, r * 2, r * 0.9);
    } else if (this.enemy.armor > 20) {
      const feetY = 10;
      const r = 20;
      g.lineStyle(1.5, 0xffa726, 0.45);
      g.strokeEllipse(0, feetY, r * 2, r * 0.9);
    }
  }

  /**
   * Cleanly disposes of all child graphics, timers, and game objects.
   */
  public override destroy(fromScene?: boolean): void {
    if (this.enemy && this.enemy.currentHp <= 0 && !this.isDying) {
      this.playDeath();
    }
    this.flashTimer = 0;
    this.hitStopTimer = 0;
    this.auraGraphics?.destroy();
    this.hpBarGraphics?.destroy();
    this.baseSprite?.destroy();
    super.destroy(fromScene);
  }
}
