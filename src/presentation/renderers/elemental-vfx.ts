/**
 * 《孤城神机营》- Elemental Reactions VFX Manager
 * Presentation-layer procedural VFX renderer for the four GDD V3.0 elemental reactions:
 * 1. 【猛火轰爆】 (Fire Blast): Expanding fiery shockwave ring + radial fiery sparks + ground scorch decal + flytext
 * 2. 【雷火天劫】 (Thunderfire Judgement): Sky-to-ground cyan vertical lightning bolt + electric spiderweb ground arcs + shield shatter + flytext
 * 3. 【碎冰崩裂】 (Ice Shatter): 10 polyhedral flying ice shards + expanding frost mist ring + flytext
 * 4. 【幽冥毒火】 (Nether Poison Flame): Rising emerald flame pillar + floating toxic sulfur bubbles + flytext
 *
 * Zero-GC implementation using lightweight native Phaser Graphics and self-disposing tweens.
 */

import Phaser from 'phaser';

export interface FloatingTextSpawner {
  spawn(x: number, y: number, content: string, style?: any): void;
}

export class ElementalVfxManager {
  private scene: Phaser.Scene;
  private activeGraphics: Set<Phaser.GameObjects.Graphics> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Helper to register a graphics object for bulk cleanup tracking.
   */
  private createManagedGraphics(depth: number = 36): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics().setDepth(depth);
    this.activeGraphics.add(g);
    return g;
  }

  private releaseGraphics(g: Phaser.GameObjects.Graphics): void {
    this.activeGraphics.delete(g);
    g.destroy();
  }

  /**
   * 1. 【猛火轰爆】 (Fire Blast - Oil + Fire)
   * Expanding fiery circular shockwave ring + 12 radial flying fiery sparks + ground scorch decal.
   */
  public playFireBlast(x: number, y: number): void {
    // A. Expanding shockwave ring
    const shockwave = this.createManagedGraphics(36);
    shockwave.setPosition(x, y);
    shockwave.lineStyle(4, 0xff3d00, 1.0);
    shockwave.strokeCircle(0, 0, 12);
    shockwave.lineStyle(2, 0xffea00, 0.9);
    shockwave.strokeCircle(0, 0, 8);

    this.scene.tweens.add({
      targets: shockwave,
      scaleX: 6.0,
      scaleY: 6.0,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => this.releaseGraphics(shockwave)
    });

    // B. 12 radial flying fiery sparks
    const numSparks = 12;
    for (let i = 0; i < numSparks; i++) {
      const angle = (i * Math.PI * 2) / numSparks + (Math.random() * 0.4 - 0.2);
      const distance = 45 + Math.random() * 35;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      const spark = this.createManagedGraphics(37);
      spark.setPosition(x, y);
      spark.fillStyle(i % 2 === 0 ? 0xff3d00 : 0xffff00, 1.0);
      spark.fillCircle(0, 0, 3);

      this.scene.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 380 + Math.random() * 80,
        ease: 'Quad.easeOut',
        onComplete: () => this.releaseGraphics(spark)
      });
    }

    // C. Ground scorch decal (lingers for 3.5s per GDD V3.0)
    const scorch = this.createManagedGraphics(12);
    scorch.setPosition(x, y);
    scorch.fillStyle(0x1a0f08, 0.65);
    scorch.fillEllipse(0, 0, 48, 26);
    scorch.lineStyle(1.5, 0xff5722, 0.4);
    scorch.strokeEllipse(0, 0, 42, 22);

    this.scene.tweens.add({
      targets: scorch,
      alpha: 0,
      duration: 3500,
      ease: 'Linear',
      onComplete: () => this.releaseGraphics(scorch)
    });

    // D. FlyText notification
    this.spawnFlyText(x, y - 25, '猛火轰爆!', 'fire');
  }

  /**
   * 2. 【雷火天劫】 (Thunderfire Judgement - Shock + Burn >= 3)
   * Sky-to-ground cyan vertical lightning bolt + ground electric spiderweb shock arcs + shield shatter.
   */
  public playThunderJudgement(x: number, y: number): void {
    // A. Sky-to-ground vertical lightning bolt
    const bolt = this.createManagedGraphics(38);
    const startY = 0;
    const segments = 8;
    const dy = (y - startY) / segments;

    // Draw jagged electric bolt path
    let curX = x;
    let curY = startY;
    const points: { x: number; y: number }[] = [{ x: curX, y: curY }];

    for (let i = 1; i < segments; i++) {
      curY += dy;
      const jitter = (Math.random() - 0.5) * 22;
      points.push({ x: x + jitter, y: curY });
    }
    points.push({ x, y });

    // Outer cyan electric glow
    bolt.lineStyle(6, 0x00e5ff, 0.85);
    bolt.beginPath();
    bolt.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      bolt.lineTo(points[i].x, points[i].y);
    }
    bolt.strokePath();

    // Inner bright white lightning core
    bolt.lineStyle(2.5, 0xffffff, 1.0);
    bolt.beginPath();
    bolt.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      bolt.lineTo(points[i].x, points[i].y);
    }
    bolt.strokePath();

    // Fast strobe flash animation
    this.scene.tweens.add({
      targets: bolt,
      alpha: { from: 1.0, to: 0 },
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => this.releaseGraphics(bolt)
    });

    // B. Ground electric spiderweb shock arcs (radial jagged branches)
    const spiderweb = this.createManagedGraphics(36);
    spiderweb.setPosition(x, y);
    const numArcs = 7;
    for (let i = 0; i < numArcs; i++) {
      const angle = (i * Math.PI * 2) / numArcs + (Math.random() * 0.3 - 0.15);
      const arcLen = 35 + Math.random() * 20;

      spiderweb.lineStyle(2, 0x80d8ff, 0.9);
      let ax = 0;
      let ay = 0;
      spiderweb.beginPath();
      spiderweb.moveTo(0, 0);

      const steps = 3;
      for (let s = 1; s <= steps; s++) {
        const stepDist = (arcLen / steps) * s;
        const perp = (Math.random() - 0.5) * 12;
        ax = Math.cos(angle) * stepDist - Math.sin(angle) * perp;
        ay = (Math.sin(angle) * stepDist + Math.cos(angle) * perp) * 0.5; // isometric oval
        spiderweb.lineTo(ax, ay);
      }
      spiderweb.strokePath();
    }

    this.scene.tweens.add({
      targets: spiderweb,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => this.releaseGraphics(spiderweb)
    });

    // C. Shield shatter effect (expanding diamond fracture fragments)
    const shatter = this.createManagedGraphics(37);
    shatter.setPosition(x, y);
    shatter.lineStyle(2.5, 0x00e5ff, 1.0);
    shatter.strokeCircle(0, 0, 16);
    shatter.lineBetween(-14, -14, 14, 14);
    shatter.lineBetween(14, -14, -14, 14);

    this.scene.tweens.add({
      targets: shatter,
      scaleX: 2.4,
      scaleY: 2.4,
      alpha: 0,
      duration: 240,
      ease: 'Cubic.easeOut',
      onComplete: () => this.releaseGraphics(shatter)
    });

    // D. FlyText notification
    this.spawnFlyText(x, y - 25, '雷火天劫!', 'shock');
  }

  /**
   * 3. 【碎冰崩裂】 (Ice Shatter - Frozen + Blunt)
   * 10 polyhedral flying ice shards + expanding frost mist ring.
   */
  public playIceShatter(x: number, y: number): void {
    // A. Expanding frost mist ring
    const mist = this.createManagedGraphics(35);
    mist.setPosition(x, y);
    mist.fillStyle(0xb3e5fc, 0.55);
    mist.fillEllipse(0, 0, 30, 18);
    mist.lineStyle(2, 0xe0f7fa, 0.8);
    mist.strokeEllipse(0, 0, 30, 18);

    this.scene.tweens.add({
      targets: mist,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => this.releaseGraphics(mist)
    });

    // B. 10 polyhedral flying ice shards
    const numShards = 10;
    for (let i = 0; i < numShards; i++) {
      const angle = (i * Math.PI * 2) / numShards + (Math.random() * 0.3 - 0.15);
      const dist = 35 + Math.random() * 30;
      const targetX = x + Math.cos(angle) * dist;
      const targetY = y + Math.sin(angle) * dist * 0.6; // isometric depth

      const shard = this.createManagedGraphics(37);
      shard.setPosition(x, y);

      // Draw diamond / triangular faceted crystal
      shard.fillStyle(0x80d8ff, 0.9);
      shard.lineStyle(1.2, 0xffffff, 1.0);
      shard.beginPath();
      shard.moveTo(0, -6);
      shard.lineTo(4, 0);
      shard.lineTo(0, 6);
      shard.lineTo(-4, 0);
      shard.closePath();
      shard.fillPath();
      shard.strokePath();

      this.scene.tweens.add({
        targets: shard,
        x: targetX,
        y: targetY,
        rotation: (Math.random() - 0.5) * 6,
        alpha: 0,
        scaleX: 0.4,
        scaleY: 0.4,
        duration: 450 + Math.random() * 100,
        ease: 'Cubic.easeOut',
        onComplete: () => this.releaseGraphics(shard)
      });
    }

    // C. FlyText notification
    this.spawnFlyText(x, y - 25, '碎冰崩裂!', 'ice');
  }

  /**
   * 4. 【幽冥毒火】 (Nether Poison Flame - Poison + Fire)
   * Rising emerald flame pillar + 6 floating toxic sulfur/phosphorus bubbles.
   */
  public playNetherPoisonFlame(x: number, y: number): void {
    // A. Rising emerald flame pillar
    const flame = this.createManagedGraphics(36);
    flame.setPosition(x, y);

    // Draw flame teardrop silhouette
    flame.fillStyle(0x00e676, 0.75);
    flame.fillEllipse(0, -10, 26, 42);
    flame.fillStyle(0x69f0ae, 0.90);
    flame.fillEllipse(0, -8, 14, 26);
    flame.fillStyle(0xffffff, 0.95);
    flame.fillCircle(0, -4, 4);

    this.scene.tweens.add({
      targets: flame,
      y: y - 48,
      scaleY: 1.5,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => this.releaseGraphics(flame)
    });

    // B. 6 floating toxic sulfur/phosphorus bubbles
    const numBubbles = 6;
    for (let i = 0; i < numBubbles; i++) {
      const bubble = this.createManagedGraphics(37);
      const startOffsetX = (Math.random() - 0.5) * 20;
      bubble.setPosition(x + startOffsetX, y);

      const r = 3 + Math.random() * 3;
      bubble.fillStyle(i % 2 === 0 ? 0x76ff03 : 0x00e676, 0.85);
      bubble.fillCircle(0, 0, r);
      bubble.lineStyle(1, 0xffffff, 0.9);
      bubble.strokeCircle(0, 0, r);

      const driftX = x + startOffsetX + (Math.random() - 0.5) * 24;
      const driftY = y - (30 + Math.random() * 35);

      this.scene.tweens.add({
        targets: bubble,
        x: driftX,
        y: driftY,
        alpha: 0,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 520 + Math.random() * 120,
        ease: 'Sine.easeOut',
        onComplete: () => this.releaseGraphics(bubble)
      });
    }

    // C. FlyText notification
    this.spawnFlyText(x, y - 25, '幽冥毒火!', 'poison');
  }

  /**
   * Spawns floating reaction announcement text if floatingTextPool is present on scene.
   */
  private spawnFlyText(x: number, y: number, text: string, style: string): void {
    const pool = (this.scene as any).floatingTextPool as FloatingTextSpawner | undefined;
    if (pool && typeof pool.spawn === 'function') {
      pool.spawn(x, y, text, style);
    }
  }

  /**
   * Per-frame update if continuous procedural updates are required.
   */
  public update(_time: number, _delta: number): void {
    // Currently all elemental reactions are driven by high-performance self-disposing tweens
  }

  /**
   * Clear all active visual effects and graphics immediately.
   */
  public clearAll(): void {
    for (const g of this.activeGraphics) {
      g.destroy();
    }
    this.activeGraphics.clear();
  }

  /**
   * Cleanly dispose of manager.
   */
  public destroy(): void {
    this.clearAll();
  }
}
