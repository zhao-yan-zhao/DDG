/**
 * 《孤城神机营》- Combat Particle Manager (CombatParticleManager)
 * High-performance pooled particle system for combat impacts, explosions, and artillery juice.
 * Features:
 * - Spark Emitter: 'particle_spark' texture, ADD blend mode, 60~180 speed, 180~280ms lifespan, depth 37
 * - Smoke Emitter: 'particle_smoke' texture, NORMAL blend mode, vertical rise, 300~450ms lifespan, depth 36
 * - emitImpactSparks: 4 particles normal, 8 on crit
 * - emitImpactSmoke: 2 smoke puffs
 * - Safe teardown and zero memory leaks
 */

import Phaser from 'phaser';

export class CombatParticleManager {
  public sparkEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  public smokeEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    if (!scene?.add?.particles) {
      return;
    }

    try {
      // 1. Spark Emitter (Gunpowder sparks & critical impact splinters)
      this.sparkEmitter = scene.add.particles(0, 0, 'particle_spark', {
        lifespan: { min: 180, max: 280 },
        speed: { min: 60, max: 180 },
        scale: { start: 1.0, end: 0.1 },
        alpha: { start: 1.0, end: 0.0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
        maxAliveParticles: 80
      });
      if (this.sparkEmitter && typeof (this.sparkEmitter as any).setDepth === 'function') {
        (this.sparkEmitter as any).setDepth(37);
      }

      // 2. Smoke Emitter (Impact dissipation & artillery smoke puffs)
      this.smokeEmitter = scene.add.particles(0, 0, 'particle_smoke', {
        lifespan: { min: 300, max: 450 },
        speedY: { min: -40, max: -15 },
        speedX: { min: -20, max: 20 },
        scale: { start: 0.5, end: 1.3 },
        alpha: { start: 0.45, end: 0.0 },
        blendMode: Phaser.BlendModes.NORMAL,
        emitting: false,
        maxAliveParticles: 30
      });
      if (this.smokeEmitter && typeof (this.smokeEmitter as any).setDepth === 'function') {
        (this.smokeEmitter as any).setDepth(36);
      }
    } catch (_err) {
      // Fallback if textures are not yet registered in headless/unit-test environments
    }
  }

  /**
   * Emits spark particles at impact coordinate (4 normal, 8 on crit).
   */
  public emitImpactSparks(x: number, y: number, isCrit: boolean = false): void {
    if (!this.sparkEmitter || (this.sparkEmitter as any).isDestroyed) return;
    const count = isCrit ? 8 : 4;
    if (typeof this.sparkEmitter.emitParticleAt === 'function') {
      this.sparkEmitter.emitParticleAt(x, y, count);
    }
  }

  /**
   * Emits 2 gunpowder smoke puffs at impact coordinate.
   */
  public emitImpactSmoke(x: number, y: number): void {
    if (!this.smokeEmitter || (this.smokeEmitter as any).isDestroyed) return;
    if (typeof this.smokeEmitter.emitParticleAt === 'function') {
      this.smokeEmitter.emitParticleAt(x, y, 2);
    }
  }

  /**
   * Safely disposes and cleans up particle emitters.
   */
  public destroy(): void {
    if (this.sparkEmitter) {
      if (typeof this.sparkEmitter.destroy === 'function') {
        this.sparkEmitter.destroy();
      }
      this.sparkEmitter = undefined;
    }
    if (this.smokeEmitter) {
      if (typeof this.smokeEmitter.destroy === 'function') {
        this.smokeEmitter.destroy();
      }
      this.smokeEmitter = undefined;
    }
  }
}
