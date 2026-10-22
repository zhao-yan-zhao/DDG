/**
 * 《孤城神机营》- Battlefield Environment & Atmosphere Immersion Renderer
 * Milestone M_VJ2:
 * - Pre-baked ramp loess terrain with dual heavy cart ruts, gravel, and arrows (depth 0.5)
 * - Weathered stone parapet & crenels with arrow slits and Row 0 timber/iron capping (depth 0.8)
 * - Dual animated Ming Sun-Moon Red Flags on corner watchtowers using Phaser.GameObjects.Rope
 *   driven by dual-harmonic sine wave physics: y(u,t) = [A1*sin(w1*t - k1*u) + A2*sin(w2*t - k2*u)] * u^1.3
 * - Dual ancient verdigris bronze tripod braziers with 3-layer additive flames and native particle emitters
 * - 16-slot ring buffer pool for dynamic artillery scorch crater decals (depth 0.6)
 * - Complete lifecycle management (update, setVisible, destroy)
 */

import Phaser from 'phaser';
import { EnvironmentTextureFactory, ENV_TEXTURE_KEYS } from '../textures/environment-texture-factory';

export interface BattlefieldEnvironmentConfig {
  terrainY?: number;
  wallY?: number;
  hideParapetOverlay?: boolean; // When true (e.g. in BattleScene with background illustration), suppresses the procedural stone wall & terrain overlay so the fortress gate is visible
  leftTowerX?: number;
  rightTowerX?: number;
  leftBrazierX?: number;
  rightBrazierX?: number;
  brazierY?: number;
  decalPoolSize?: number;
}

export class BattlefieldEnvironment {
  private scene: Phaser.Scene;
  private isDestroyed: boolean = false;

  // Background Terrain & Wall
  private terrainImage: Phaser.GameObjects.Image | null = null;
  private wallImage: Phaser.GameObjects.Image | null = null;

  // Watchtower Flagpoles & Animated Ropes
  private flagpoleGraphics: Phaser.GameObjects.Graphics | null = null;
  private leftFlagRope: Phaser.GameObjects.Rope | null = null;
  private rightFlagRope: Phaser.GameObjects.Rope | null = null;
  private flagPointsLeft: Array<{ x: number; y: number }> = [];
  private flagPointsRight: Array<{ x: number; y: number }> = [];

  // Bronze Tripod Braziers & Flames
  private leftBrazierImage: Phaser.GameObjects.Image | null = null;
  private rightBrazierImage: Phaser.GameObjects.Image | null = null;
  private brazierGlows: Phaser.GameObjects.Graphics | null = null;
  private flameGraphics: Phaser.GameObjects.Graphics | null = null;
  private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private smokeEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private flameTweens: Phaser.Tweens.Tween[] = [];

  // Dynamic Crater Decal Ring Buffer Pool (16 slots)
  private decalPool: Phaser.GameObjects.Image[] = [];
  private decalHead: number = 0;
  private readonly maxDecals: number = 16;

  // Wave dynamics constants
  public static readonly SEGMENT_COUNT = 14; // 14 segments = 15 points
  public static readonly POINT_COUNT = 15;
  public static readonly A1 = 14.0;
  public static readonly W1 = 4.5;
  public static readonly K1 = 5.2;
  public static readonly A2 = 5.0;
  public static readonly W2 = 10.8;
  public static readonly K2 = 12.0;

  constructor(scene: Phaser.Scene, config?: BattlefieldEnvironmentConfig) {
    this.scene = scene;
    this.maxDecals = config?.decalPoolSize ?? 16;

    // Ensure all environment procedural textures exist
    EnvironmentTextureFactory.generateAll(scene);

    const terrainY = config?.terrainY ?? 1060; // Center Y for 440px height: covers 840~1280
    const wallY = config?.wallY ?? 855;       // Center Y for 90px height: covers 810~900
    const hideParapetOverlay = config?.hideParapetOverlay ?? false;
    const leftTowerX = config?.leftTowerX ?? 52;
    const rightTowerX = config?.rightTowerX ?? 698;
    const leftBrazierX = config?.leftBrazierX ?? 96;
    const rightBrazierX = config?.rightBrazierX ?? 654;
    const brazierY = config?.brazierY ?? 816;

    this.initTerrainAndWall(terrainY, wallY, hideParapetOverlay);
    this.initWatchtowerFlags(leftTowerX, rightTowerX);
    this.initBraziersAndFlames(leftBrazierX, rightBrazierX, brazierY);
    this.initDecalPool();
  }

  // =========================================================================
  // 1. Terrain & Wall Initialization
  // =========================================================================
  private initTerrainAndWall(terrainY: number, wallY: number, hideParapetOverlay: boolean = false): void {
    // If hideParapetOverlay is true, the authentic Ming fortress gate in 'bg_fortress_battlefield' is clearly visible.
    if (hideParapetOverlay) {
      return;
    }

    // 1.1 Pre-baked Loess Ramp Terrain (Depth 0.5)
    if (this.scene.textures.exists(ENV_TEXTURE_KEYS.TEX_RAMP_TERRAIN_BAKED)) {
      this.terrainImage = this.scene.add.image(375, terrainY, ENV_TEXTURE_KEYS.TEX_RAMP_TERRAIN_BAKED)
        .setDisplaySize(750, 440)
        .setDepth(0.5);
    }

    // 1.2 Weathered Stone Parapet & Crenels (Depth 0.8)
    if (this.scene.textures.exists(ENV_TEXTURE_KEYS.WALL_PARAPET)) {
      this.wallImage = this.scene.add.image(375, wallY, ENV_TEXTURE_KEYS.WALL_PARAPET)
        .setDisplaySize(750, 90)
        .setDepth(0.8);
    }
  }

  // =========================================================================
  // 2. Watchtower Flagpoles & Ming Sun-Moon Rope Flags
  // =========================================================================
  private initWatchtowerFlags(leftX: number, rightX: number): void {
    // 2.1 Lacquered Flagpoles Graphics (Depth 0.83)
    this.flagpoleGraphics = this.scene.add.graphics().setDepth(0.83);
    const g = this.flagpoleGraphics;

    // Draw Left & Right Heavy Flagpoles
    for (const px of [leftX, rightX]) {
      // Dark lacquer pole
      g.fillStyle(0x1a120c, 1);
      g.fillRect(px - 2, 665, 4, 140);
      g.lineStyle(1, 0x3d2716, 0.8);
      g.strokeRect(px - 2, 665, 4, 140);

      // Bronze spearhead finial & red silk tassel
      g.fillStyle(0xffd700, 1);
      g.fillTriangle(px, 650, px + 4, 665, px - 4, 665);
      g.fillStyle(0xb71c1c, 1);
      g.fillCircle(px, 666, 3);
    }

    // 2.2 Ropes for Ming Sun-Moon Flags (14 segments = 15 points)
    const pointsCount = BattlefieldEnvironment.POINT_COUNT;
    const flagW = 128;
    const halfW = flagW / 2;
    const segW = flagW / (pointsCount - 1);

    // Initialize point positions centered on Rope origin ([-64, +64])
    this.flagPointsLeft = [];
    this.flagPointsRight = [];
    for (let i = 0; i < pointsCount; i++) {
      const lx = -halfW + i * segW;
      this.flagPointsLeft.push({ x: lx, y: 0 });
      this.flagPointsRight.push({ x: lx, y: 0 });
    }

    // Left Flag Rope (Anchor hoist at leftX=52 -> center is at 52 + 64 = 116)
    if (this.scene.add.rope) {
      try {
        this.leftFlagRope = this.scene.add.rope(
          leftX + halfW,
          730,
          ENV_TEXTURE_KEYS.FLAG_MING_SUN_MOON,
          undefined,
          this.flagPointsLeft,
          true
        ).setDepth(0.85);

        // Right Flag Rope (Anchor hoist at rightX=698, waved inward with flipX -> center at 698 - 64 = 634)
        this.rightFlagRope = this.scene.add.rope(
          rightX - halfW,
          730,
          ENV_TEXTURE_KEYS.FLAG_MING_SUN_MOON,
          undefined,
          this.flagPointsRight,
          true
        ).setDepth(0.85);

        this.rightFlagRope.setFlipX(true);
      } catch (err) {
        // Fallback for headless environments without WebGL Rope pipeline
        this.leftFlagRope = null;
        this.rightFlagRope = null;
      }
    }
  }

  // =========================================================================
  // 3. Bronze Tripod Braziers & Particle Flames
  // =========================================================================
  private initBraziersAndFlames(leftX: number, rightX: number, y: number): void {
    // 3.1 Tripod Brazier Basins (Depth 0.86)
    if (this.scene.textures.exists(ENV_TEXTURE_KEYS.BRAZIER_BASIN)) {
      this.leftBrazierImage = this.scene.add.image(leftX, y, ENV_TEXTURE_KEYS.BRAZIER_BASIN)
        .setDisplaySize(44, 32)
        .setDepth(0.86);

      this.rightBrazierImage = this.scene.add.image(rightX, y, ENV_TEXTURE_KEYS.BRAZIER_BASIN)
        .setDisplaySize(44, 32)
        .setDepth(0.86);
    }

    // 3.2 Ambient Fire Glow Halo (Depth 0.84, Additive blending for luminous radiance)
    this.brazierGlows = this.scene.add.graphics().setDepth(0.84);
    this.brazierGlows.setBlendMode(Phaser.BlendModes.ADD);
    this.renderAmbientGlows(leftX, rightX, y - 6, 0.16);

    // Pulse ambient glow with subtle breathing tween
    const glowDummy = { alphaVal: 0.18 };
    const glowTween = this.scene.tweens.add({
      targets: glowDummy,
      alphaVal: 0.24,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!this.isDestroyed && this.brazierGlows) {
          this.renderAmbientGlows(leftX, rightX, y - 6, glowDummy.alphaVal);
        }
      }
    });
    this.flameTweens.push(glowTween);

    // 3.3 Three-Layer Additive Flickering Flames (Depth 0.87)
    this.flameGraphics = this.scene.add.graphics().setDepth(0.87);
    this.flameGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.renderFlames(leftX, rightX, y - 10, 1.0);

    const flameDummy = { jitter: 1.0 };
    const flameTween = this.scene.tweens.add({
      targets: flameDummy,
      jitter: 1.25,
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        if (!this.isDestroyed && this.flameGraphics) {
          this.renderFlames(leftX, rightX, y - 10, flameDummy.jitter);
        }
      }
    });
    this.flameTweens.push(flameTween);

    // 3.4 Native Particle Emitters for Floating Embers & Smoke (Depth 0.88 & 0.89)
    if (this.scene.add.particles) {
      try {
        // Floating Sparks / Embers (36 total particles, 18 per basin)
        if (this.scene.textures.exists('particle_spark')) {
          this.sparkEmitter = this.scene.add.particles(0, 0, 'particle_spark', {
            x: { onEmit: () => (Math.random() < 0.5 ? leftX : rightX) + (Math.random() - 0.5) * 16 },
            y: y - 12,
            speedX: { min: 15, max: 35 },
            speedY: { min: -120, max: -70 },
            lifespan: { min: 1100, max: 1700 },
            scale: { start: 1.2, end: 0.1 },
            alpha: { start: 1.0, end: 0.0 },
            color: [0xffd700, 0xff5722, 0xff9800],
            blendMode: Phaser.BlendModes.ADD,
            maxAliveParticles: 36,
            frequency: 75
          }).setDepth(0.88);
        }

        // Rising Light Smoke (12 total particles, 6 per basin)
        if (this.scene.textures.exists('particle_smoke')) {
          this.smokeEmitter = this.scene.add.particles(0, 0, 'particle_smoke', {
            x: { onEmit: () => (Math.random() < 0.5 ? leftX : rightX) + (Math.random() - 0.5) * 12 },
            y: y - 16,
            speedX: { min: 10, max: 25 },
            speedY: { min: -45, max: -25 },
            lifespan: { min: 2200, max: 2800 },
            scale: { start: 0.4, end: 1.5 },
            alpha: { start: 0.25, end: 0.0 },
            blendMode: Phaser.BlendModes.NORMAL,
            maxAliveParticles: 12,
            frequency: 380
          }).setDepth(0.89);
        }
      } catch (err) {
        // Graceful fallback if particle system not supported in test mocks
        this.sparkEmitter = null;
        this.smokeEmitter = null;
      }
    }
  }

  private renderAmbientGlows(leftX: number, rightX: number, y: number, alpha: number): void {
    const g = this.brazierGlows;
    if (!g) return;
    g.clear();
    for (const bx of [leftX, rightX]) {
      g.fillStyle(0xff6f00, alpha * 0.35);
      g.fillCircle(bx, y, 52);
      g.fillStyle(0xffa000, alpha * 0.6);
      g.fillCircle(bx, y, 32);
      g.fillStyle(0xffd54f, alpha * 0.85);
      g.fillCircle(bx, y, 14);
    }
  }

  private renderFlames(leftX: number, rightX: number, y: number, jitter: number): void {
    const g = this.flameGraphics;
    if (!g) return;
    g.clear();

    for (const bx of [leftX, rightX]) {
      // 1. Outer Flame (深赤橙)
      g.fillStyle(0xff5722, 0.75);
      g.fillTriangle(bx, y - 26 * jitter, bx + 12 * jitter, y, bx - 12 * jitter, y);

      // 2. Middle Flame (烈阳金黄)
      g.fillStyle(0xffca28, 0.85);
      g.fillTriangle(bx, y - 20 * jitter, bx + 8 * jitter, y, bx - 8 * jitter, y);

      // 3. Inner Core (极热白芯)
      g.fillStyle(0xffffff, 0.95);
      g.fillTriangle(bx, y - 12 * jitter, bx + 4, y, bx - 4, y);
    }
  }

  // =========================================================================
  // 4. Dynamic Crater Decal Pool (16-Slot Ring Buffer)
  // =========================================================================
  private initDecalPool(): void {
    this.decalPool = [];
    this.decalHead = 0;
  }

  /**
   * Stamps a scorch crater decal dynamically on the battlefield.
   * Employs a 16-slot ring buffer pool to ensure zero memory leaks.
   */
  public stampScorchCrater(x: number, y: number, radius?: number): Phaser.GameObjects.Image | null {
    if (this.isDestroyed || !this.scene.textures.exists(ENV_TEXTURE_KEYS.DECAL_CRATER)) {
      return null;
    }

    const rad = radius ?? 24;
    const targetScale = (rad * 2) / 64; // Base decal texture is 64x64
    let decal: Phaser.GameObjects.Image;

    if (this.decalPool.length < this.maxDecals) {
      // Create new decal image
      decal = this.scene.add.image(x, y, ENV_TEXTURE_KEYS.DECAL_CRATER)
        .setDepth(0.6)
        .setScale(targetScale)
        .setRotation(Math.random() * Math.PI * 2)
        .setAlpha(0.9);
      this.decalPool.push(decal);
    } else {
      // Reuse oldest decal from ring buffer
      decal = this.decalPool[this.decalHead];
      this.decalHead = (this.decalHead + 1) % this.maxDecals;

      decal.setPosition(x, y)
        .setScale(targetScale)
        .setRotation(Math.random() * Math.PI * 2)
        .setAlpha(0.9)
        .setVisible(true);
    }

    return decal;
  }

  public getDecalCount(): number {
    return this.decalPool.length;
  }

  public getDecals(): readonly Phaser.GameObjects.Image[] {
    return this.decalPool;
  }

  // =========================================================================
  // 5. Wave Physics Simulation & Lifecycle
  // =========================================================================

  /**
   * Pure mathematical calculation of vertical displacement for normalized distance u and time t:
   * y(u, t) = [A1 * sin(w1*t - k1*u) + A2 * sin(w2*t - k2*u + phi)] * u^1.3
   */
  public static calculateRopeWaveY(u: number, t: number, phi: number = 0): number {
    if (u <= 0) return 0;
    const clampedU = Math.min(1.0, Math.max(0, u));
    const wave1 = BattlefieldEnvironment.A1 * Math.sin(BattlefieldEnvironment.W1 * t - BattlefieldEnvironment.K1 * clampedU);
    const wave2 = BattlefieldEnvironment.A2 * Math.sin(BattlefieldEnvironment.W2 * t - BattlefieldEnvironment.K2 * clampedU + phi);
    return (wave1 + wave2) * Math.pow(clampedU, 1.3);
  }

  /**
   * Updates wave simulation on animated cloth ropes every frame.
   */
  public update(time: number, _delta: number): void {
    if (this.isDestroyed) return;

    const t = time / 1000;
    const pointsCount = BattlefieldEnvironment.POINT_COUNT;

    // Update Left Flag Rope Vertices
    if (this.leftFlagRope && this.leftFlagRope.points) {
      for (let i = 0; i < pointsCount; i++) {
        const u = i / (pointsCount - 1);
        const yDisp = BattlefieldEnvironment.calculateRopeWaveY(u, t, 0);
        if (this.leftFlagRope.points[i]) {
          this.leftFlagRope.points[i].y = yDisp;
        }
      }
      if (typeof this.leftFlagRope.setDirty === 'function') {
        this.leftFlagRope.setDirty();
      }
    }

    // Update Right Flag Rope Vertices (with subtle organic phase offset)
    if (this.rightFlagRope && this.rightFlagRope.points) {
      for (let i = 0; i < pointsCount; i++) {
        const u = i / (pointsCount - 1);
        const yDisp = BattlefieldEnvironment.calculateRopeWaveY(u, t, 0.85);
        if (this.rightFlagRope.points[i]) {
          this.rightFlagRope.points[i].y = yDisp;
        }
      }
      if (typeof this.rightFlagRope.setDirty === 'function') {
        this.rightFlagRope.setDirty();
      }
    }
  }

  /**
   * Sets visibility on all environment visual entities (e.g. for 2D vs 3D mode switching).
   */
  public setVisible(visible: boolean): void {
    this.terrainImage?.setVisible(visible);
    this.wallImage?.setVisible(visible);
    this.flagpoleGraphics?.setVisible(visible);
    this.leftFlagRope?.setVisible(visible);
    this.rightFlagRope?.setVisible(visible);
    this.leftBrazierImage?.setVisible(visible);
    this.rightBrazierImage?.setVisible(visible);
    this.brazierGlows?.setVisible(visible);
    this.flameGraphics?.setVisible(visible);
    this.sparkEmitter?.setVisible(visible);
    this.smokeEmitter?.setVisible(visible);

    for (const decal of this.decalPool) {
      decal.setVisible(visible);
    }
  }

  /**
   * Safe disposal of all graphics, textures, particle emitters, tweens, and decal pool.
   */
  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Kill tweens
    for (const tw of this.flameTweens) {
      tw.stop();
      tw.remove();
    }
    this.flameTweens = [];

    // Destroy terrain & wall
    this.terrainImage?.destroy();
    this.terrainImage = null;
    this.wallImage?.destroy();
    this.wallImage = null;

    // Destroy flagpoles & ropes
    this.flagpoleGraphics?.destroy();
    this.flagpoleGraphics = null;
    this.leftFlagRope?.destroy();
    this.leftFlagRope = null;
    this.rightFlagRope?.destroy();
    this.rightFlagRope = null;
    this.flagPointsLeft = [];
    this.flagPointsRight = [];

    // Destroy braziers & flames
    this.leftBrazierImage?.destroy();
    this.leftBrazierImage = null;
    this.rightBrazierImage?.destroy();
    this.rightBrazierImage = null;
    this.brazierGlows?.destroy();
    this.brazierGlows = null;
    this.flameGraphics?.destroy();
    this.flameGraphics = null;

    // Destroy particle emitters
    this.sparkEmitter?.destroy();
    this.sparkEmitter = null;
    this.smokeEmitter?.destroy();
    this.smokeEmitter = null;

    // Destroy decals
    for (const decal of this.decalPool) {
      decal.destroy();
    }
    this.decalPool = [];
    this.decalHead = 0;
  }
}
