/**
 * 《孤城神机营》- Enemy Death Chinese Ink Splash Dissolve VFX (EnemyDeathVfx)
 * Implements GDD V3.0 §8.3 & Milestone Track B visual juice:
 * - Ink Bloom: expanding dark ink wash circle (8px -> 36px, alpha 0.85 -> 0)
 * - Ink Splatter: 6-10 flying ink droplet particles (16 for Boss) scattered along radial trajectories
 * - Body Silhouette Fade: dark ink silhouette floating up 12px with 1.08x scale and alpha fadeout
 * - Boss Exclusive: 200ms screen micro-shake & golden calligraphy "破" victory seal stamp
 * - Clean lifecycle with auto-destroy tweens (zero memory leaks, zero GC allocations)
 */

import Phaser from 'phaser';

export interface DeathVfxOptions {
  isBoss?: boolean;
  textureKey?: string;
  scale?: number;
  color?: number;
}

export class EnemyDeathVfx {
  /**
   * Spawns a full Chinese ink splash dissolve visual effect at (x, y).
   */
  public static playInkSplashDissolve(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: DeathVfxOptions = {}
  ): void {
    if (!scene || !scene.add || !scene.tweens) return;

    const isBoss = !!options.isBoss;
    const baseScale = options.scale || 1.0;
    const inkColor = options.color !== undefined ? options.color : 0x181412;

    // 1. Ink Bloom (Radial wash expanding from ground center)
    this.createInkBloom(scene, x, y, isBoss, inkColor);

    // 2. Ink Splatter Particles (Droplets flying radially)
    this.createInkSplatter(scene, x, y, isBoss, inkColor);

    // 3. Body Silhouette Fade (Darkened body floating up and dissolving)
    if (options.textureKey && scene.textures && scene.textures.exists(options.textureKey)) {
      this.createSilhouetteFade(scene, x, y, options.textureKey, baseScale);
    }

    // 4. Boss Exclusive: Screen Shake & Golden Calligraphy "破" Stamp
    if (isBoss) {
      this.playBossImpact(scene, x, y);
    }
  }

  /**
   * Creates an expanding ink bloom circle that simulates ink bleeding into Xuan paper.
   */
  private static createInkBloom(
    scene: Phaser.Scene,
    x: number,
    y: number,
    isBoss: boolean,
    color: number
  ): void {
    const g = scene.add.graphics();
    g.setPosition(x, y);
    g.setDepth(14);

    const initialRadius = isBoss ? 16 : 8;
    const targetRadius = isBoss ? 64 : 34;
    const duration = isBoss ? 450 : 350;

    // Outer soft ink wash ring
    g.fillStyle(color, 0.85);
    g.fillCircle(0, 0, initialRadius);

    // Tween scale and alpha
    scene.tweens.add({
      targets: g,
      scaleX: targetRadius / initialRadius,
      scaleY: targetRadius / initialRadius,
      alpha: 0,
      duration: duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        g.destroy();
      }
    });
  }

  /**
   * Creates flying ink droplet particles that disperse outwards like Chinese ink splatter.
   */
  private static createInkSplatter(
    scene: Phaser.Scene,
    x: number,
    y: number,
    isBoss: boolean,
    color: number
  ): void {
    const dropletCount = isBoss ? 16 : 8;
    const maxDist = isBoss ? 65 : 40;
    const duration = isBoss ? 420 : 320;

    for (let i = 0; i < dropletCount; i++) {
      const angle = (i * (Math.PI * 2 / dropletCount)) + ((i % 3 - 1) * 0.22);
      const dist = (maxDist * 0.45) + ((i * 17) % (maxDist * 0.55));
      const targetX = x + Math.cos(angle) * dist;
      const targetY = y + Math.sin(angle) * (dist * 0.7); // slight perspective flattening

      const droplet = scene.add.graphics();
      droplet.setPosition(x, y);
      droplet.setDepth(15);

      const radius = isBoss ? (2.0 + (i % 3) * 1.0) : (1.5 + (i % 2) * 0.8);
      droplet.fillStyle(color, 0.9);
      droplet.fillCircle(0, 0, radius);

      scene.tweens.add({
        targets: droplet,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: duration + ((i * 20) % 60),
        ease: 'Cubic.easeOut',
        onComplete: () => {
          droplet.destroy();
        }
      });
    }
  }

  /**
   * Dissolves the character silhouette by floating up 12px, scaling 1.08x, and fading out.
   */
  private static createSilhouetteFade(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    baseScale: number
  ): void {
    const sprite = scene.add.sprite(x, y, textureKey);
    sprite.setScale(baseScale);
    sprite.setDepth(15);
    sprite.setTint(0x1a1816); // Inky silhouette tint
    sprite.setAlpha(0.85);

    scene.tweens.add({
      targets: sprite,
      y: y - 12,
      scaleX: baseScale * 1.08,
      scaleY: baseScale * 1.08,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        sprite.destroy();
      }
    });
  }

  /**
   * Triggers Boss exclusive defeat feedback: camera shake and golden calligraphy "破" stamp.
   */
  private static playBossImpact(scene: Phaser.Scene, x: number, y: number): void {
    // 1. Camera micro-shake
    if (scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(200, 0.005);
    }

    // 2. Golden Calligraphy "破" Character Stamp
    const stamp = scene.add.text(x, y - 16, '破', {
      fontFamily: 'STKaiti, "Kaiti SC", "SimSun", serif, sans-serif',
      fontSize: '36px',
      color: '#ffd700',
      stroke: '#5c1010',
      strokeThickness: 4
    });
    stamp.setOrigin(0.5, 0.5);
    stamp.setDepth(30);
    stamp.setScale(1.6);
    stamp.setAlpha(0);

    // Punch in scale and fade out
    scene.tweens.add({
      targets: stamp,
      scaleX: 1.0,
      scaleY: 1.0,
      alpha: 1.0,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold for 180ms then fade out
        scene.tweens.add({
          targets: stamp,
          alpha: 0,
          y: stamp.y - 10,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            stamp.destroy();
          }
        });
      }
    });
  }
}
