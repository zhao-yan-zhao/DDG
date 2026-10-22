/**
/**
 * 《孤城神机营》- Challenger M3_2 Empirical Verification
 * Camera Shake Throttle & Particle Pooling Adversarial Stress Test Suite
 *
 * Test Vectors:
 * 1. Camera Shake Burst Stress: 50 simultaneous hits in a single frame -> strictly 1 shake call.
 * 2. Throttle Gate Boundaries: t=0ms (fire), t=1ms..119ms (blocked), t=120ms (fire), t=130ms (blocked).
 * 3. Camera Shake Preset Parameters: heavy_cannon (90ms, 0.0028), crit_impact (70ms, 0.0020), elemental_blast (110ms, 0.0032).
 * 4. Camera Shake Defensive Robustness: missing cameras, undefined main, undefined shake function.
 * 5. Particle Manager Burst Load: 150+ rapid calls to emitImpactSparks & emitImpactSmoke -> zero crashes, exact particle count accounting.
 * 6. Particle Manager Pooling & Limits: maxAliveParticles constraints (80 spark, 30 smoke), depths (37/36), blend modes.
 * 7. Particle Manager Lifecycle: clean destruction, idempotent double-destroy, safe post-destroy no-ops, headless fallbacks.
 * 8. Full End-to-End BattleScene Hit Burst Simulation: 50 simultaneous projectile hits and elemental reactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';

// Mock Phaser environment for headless unit & stress testing
vi.mock('phaser', () => {
  class MockGameObject {
    scene: any;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    visible: boolean = true;
    alpha: number = 1.0;
    depth: number = 0;
    scaleX: number = 1.0;
    scaleY: number = 1.0;
    rotation: number = 0;
    isDestroyed: boolean = false;
    tint: number = 0;
    tintFill: boolean = false;

    constructor(scene: any, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }

    setDepth(d: number) { this.depth = d; return this; }
    setScale(s: number) { this.scaleX = s; this.scaleY = s; return this; }
    setVisible(v: boolean) { this.visible = v; return this; }
    setAlpha(a: number) { this.alpha = a; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setRotation(r: number) { this.rotation = r; return this; }
    setDisplaySize(w: number, h: number) { this.width = w; this.height = h; return this; }
    setTintFill(color: number) { this.tint = color; this.tintFill = true; return this; }
    clearTint() { this.tint = 0; this.tintFill = false; return this; }
    destroy() { this.isDestroyed = true; }
  }

  class MockSprite extends MockGameObject {
    textureKey: string;
    constructor(scene: any, x = 0, y = 0, key = '') {
      super(scene, x, y);
      this.textureKey = key;
    }
  }

  class MockGraphics extends MockGameObject {
    commands: any[] = [];
    clear() { this.commands = []; return this; }
    fillStyle(color: number, alpha = 1.0) { this.commands.push({ type: 'fillStyle', color, alpha }); return this; }
    fillRect(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'fillRect', x, y, w, h }); return this; }
    fillCircle(x: number, y: number, r: number) { this.commands.push({ type: 'fillCircle', x, y, r }); return this; }
    fillEllipse(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'fillEllipse', x, y, w, h }); return this; }
    strokeEllipse(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'strokeEllipse', x, y, w, h }); return this; }
    lineStyle(w: number, c: number, a = 1.0) { this.commands.push({ type: 'lineStyle', w, c, a }); return this; }
    lineBetween(x1: number, y1: number, x2: number, y2: number) { this.commands.push({ type: 'lineBetween', x1, y1, x2, y2 }); return this; }
  }

  class MockContainer extends MockGameObject {
    list: any[] = [];
    add(obj: any | any[]) {
      if (Array.isArray(obj)) {
        this.list.push(...obj);
      } else {
        this.list.push(obj);
      }
      return this;
    }
    remove(obj: any) {
      const idx = this.list.indexOf(obj);
      if (idx !== -1) this.list.splice(idx, 1);
      return this;
    }
  }

  class MockParticleEmitter {
    textureKey: string;
    config: any;
    depth: number = 0;
    isDestroyed: boolean = false;
    emittedParticles: Array<{ x: number; y: number; count: number }> = [];

    constructor(textureKey: string, config: any) {
      this.textureKey = textureKey;
      this.config = config;
    }

    setDepth(d: number) {
      this.depth = d;
      return this;
    }

    emitParticleAt(x: number, y: number, count: number = 1) {
      if (this.isDestroyed) return;
      this.emittedParticles.push({ x, y, count });
    }

    destroy() {
      this.isDestroyed = true;
    }
  }

  class MockScene {
    constructor(public config?: any) {}
  }

  return {
    default: {
      Scene: MockScene,
      BlendModes: {
        NORMAL: 0,
        ADD: 1
      },
      GameObjects: {
        GameObject: MockGameObject,
        Graphics: MockGraphics,
        Sprite: MockSprite,
        Container: MockContainer,
        Particles: {
          ParticleEmitter: MockParticleEmitter
        }
      }
    }
  };
});

import { BattleScene } from '../src/presentation/scenes/battle-scene';
import { CombatParticleManager } from '../src/presentation/renderers/combat-particle-manager';
import { EnemySprite } from '../src/presentation/renderers/enemy-sprite';
import { EnemyEntity } from '../src/core/types';

describe('Challenger M3_2: Camera Shake Throttle & Particle Pooling Adversarial Stress Tests', () => {
  let mockScene: any;
  let sparkEmitters: any[];
  let smokeEmitters: any[];

  beforeEach(() => {
    sparkEmitters = [];
    smokeEmitters = [];

    mockScene = {
      cameras: {
        main: {
          shake: vi.fn()
        }
      },
      time: {
        now: 1000
      },
      add: {
        graphics: () => new (Phaser.GameObjects as any).Graphics(mockScene),
        sprite: (x = 0, y = 0, key = '') => new (Phaser.GameObjects as any).Sprite(mockScene, x, y, key),
        particles: vi.fn((_x: number, _y: number, key: string, config: any) => {
          const emitter = new (Phaser.GameObjects as any).Particles.ParticleEmitter(key, config);
          if (key === 'particle_spark') {
            sparkEmitters.push(emitter);
          } else if (key === 'particle_smoke') {
            smokeEmitters.push(emitter);
          }
          return emitter;
        }),
        existing: (obj: any) => obj
      },
      textures: {
        exists: vi.fn(() => true),
        get: vi.fn(() => ({
          getSourceImage: () => ({ width: 72, height: 72 })
        }))
      },
      tweens: {
        add: vi.fn((c: any) => c),
        killAll: vi.fn()
      }
    };
  });

  // =========================================================================
  // Part 1: Camera Shake Burst Stress & Boundary Tests
  // =========================================================================
  describe('Part 1: Camera Shake Burst Stress & 120ms Throttle Gate', () => {
    it('BURST STRESS: 50 simultaneous hits in a single frame triggers shake strictly ONCE', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 1000 };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };

      const presets: Array<'heavy_cannon' | 'crit_impact' | 'elemental_blast'> = [
        'heavy_cannon',
        'crit_impact',
        'elemental_blast'
      ];

      // Fire 50 simultaneous hits within the exact same frame (t = 1000ms)
      for (let i = 0; i < 50; i++) {
        const preset = presets[i % presets.length];
        scene.triggerSubtleShake(preset);
      }

      // Strictly 1 shake call must have been executed
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);
      // The first call was 'heavy_cannon'
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(90, 0.0028);
      // Timestamp recorded correctly
      expect(scene.lastCameraShakeTime).toBe(1000);
    });

    it('THROTTLE BOUNDARY: precise millisecond boundary stress testing', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 1000 };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };

      // 1. Initial hit at t = 1000ms -> PASSES (#1)
      scene.triggerSubtleShake('crit_impact');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);
      expect(scene.cameras.main.shake).toHaveBeenLastCalledWith(70, 0.0020);

      // 2. Immediately at t = 1001ms (1ms elapsed) -> BLOCKED
      scene.time.now = 1001;
      scene.triggerSubtleShake('heavy_cannon');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);

      // 3. At t = 1050ms (50ms elapsed) -> BLOCKED
      scene.time.now = 1050;
      scene.triggerSubtleShake('elemental_blast');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);

      // 4. At t = 1119ms (119ms elapsed, 1ms before 120ms threshold) -> BLOCKED
      scene.time.now = 1119;
      scene.triggerSubtleShake('heavy_cannon');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);

      // 5. At t = 1120ms (exactly 120ms elapsed, 1120 - 1000 = 120 >= 120) -> PASSES (#2)
      scene.time.now = 1120;
      scene.triggerSubtleShake('elemental_blast');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(2);
      expect(scene.cameras.main.shake).toHaveBeenLastCalledWith(110, 0.0032);
      expect(scene.lastCameraShakeTime).toBe(1120);

      // 6. At t = 1121ms (1ms after reset) -> BLOCKED
      scene.time.now = 1121;
      scene.triggerSubtleShake('crit_impact');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(2);

      // 7. At t = 1239ms (119ms after second shake) -> BLOCKED
      scene.time.now = 1239;
      scene.triggerSubtleShake('heavy_cannon');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(2);

      // 8. At t = 1240ms (exactly 120ms after second shake) -> PASSES (#3)
      scene.time.now = 1240;
      scene.triggerSubtleShake('heavy_cannon');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(3);
      expect(scene.cameras.main.shake).toHaveBeenLastCalledWith(90, 0.0028);
      expect(scene.lastCameraShakeTime).toBe(1240);
    });

    it('PRESET VERIFICATION: all 3 shake presets conform to industrial GDD specs', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };

      // heavy_cannon: 90ms duration, 0.0028 intensity (~2-3px)
      scene.time = { now: 2000 };
      scene.lastCameraShakeTime = 0;
      scene.triggerSubtleShake('heavy_cannon');
      expect(scene.cameras.main.shake).toHaveBeenLastCalledWith(90, 0.0028);

      // crit_impact: 70ms duration, 0.0020 intensity (~1.5-2.5px)
      scene.time.now = 2200;
      scene.triggerSubtleShake('crit_impact');
      expect(scene.cameras.main.shake).toHaveBeenLastCalledWith(70, 0.0020);

      // elemental_blast: 110ms duration, 0.0032 intensity (~2.5-4px)
      scene.time.now = 2400;
      scene.triggerSubtleShake('elemental_blast');
      expect(scene.cameras.main.shake).toHaveBeenLastCalledWith(110, 0.0032);
    });

    it('DEFENSIVE ROBUSTNESS: survives missing camera structures and undefined time', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.lastCameraShakeTime = 0;

      // Case A: time is undefined (should fallback to Date.now())
      scene.time = undefined;
      scene.cameras = { main: { shake: vi.fn() } };
      expect(() => scene.triggerSubtleShake('heavy_cannon')).not.toThrow();
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);

      // Immediate second call uses Date.now() -> should be throttled
      scene.triggerSubtleShake('crit_impact');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);

      // Case B: cameras is undefined
      scene.cameras = undefined;
      scene.lastCameraShakeTime = 0;
      expect(() => scene.triggerSubtleShake('heavy_cannon')).not.toThrow();

      // Case C: cameras.main is undefined
      scene.cameras = {} as any;
      expect(() => scene.triggerSubtleShake('crit_impact')).not.toThrow();

      // Case D: cameras.main.shake is undefined
      scene.cameras = { main: {} } as any;
      expect(() => scene.triggerSubtleShake('elemental_blast')).not.toThrow();
    });
  });

  // =========================================================================
  // Part 2: Particle Manager Lifecycle & Extreme Load Stress
  // =========================================================================
  describe('Part 2: Particle Manager Lifecycle & Extreme Load Stress', () => {
    it('BURST LOAD: calling emitImpactSparks and emitImpactSmoke 150+ times executes safely without leaks or errors', () => {
      const manager = new CombatParticleManager(mockScene);
      const sparkEmitter = manager.sparkEmitter as any;
      const smokeEmitter = manager.smokeEmitter as any;

      expect(sparkEmitter).toBeDefined();
      expect(smokeEmitter).toBeDefined();

      let totalSparksExpected = 0;
      let totalSmokeExpected = 0;

      // 60 normal spark calls (4 particles each)
      for (let i = 0; i < 60; i++) {
        manager.emitImpactSparks(100 + i, 200 + i, false);
        totalSparksExpected += 4;
      }

      // 60 crit spark calls (8 particles each)
      for (let i = 0; i < 60; i++) {
        manager.emitImpactSparks(300 + i, 400 + i, true);
        totalSparksExpected += 8;
      }

      // 60 smoke calls (2 puffs each)
      for (let i = 0; i < 60; i++) {
        manager.emitImpactSmoke(500 + i, 600 + i);
        totalSmokeExpected += 2;
      }

      // Verify spark emissions
      expect(sparkEmitter.emittedParticles).toHaveLength(120);
      const sparkParticleSum = sparkEmitter.emittedParticles.reduce(
        (sum: number, p: any) => sum + p.count,
        0
      );
      expect(sparkParticleSum).toBe(totalSparksExpected); // 60*4 + 60*8 = 720 particles

      // Verify smoke emissions
      expect(smokeEmitter.emittedParticles).toHaveLength(60);
      const smokeParticleSum = smokeEmitter.emittedParticles.reduce(
        (sum: number, p: any) => sum + p.count,
        0
      );
      expect(smokeParticleSum).toBe(totalSmokeExpected); // 60*2 = 120 particles

      // Clean destruction
      manager.destroy();
      expect(sparkEmitter.isDestroyed).toBe(true);
      expect(smokeEmitter.isDestroyed).toBe(true);
    });

    it('POOLING CONSTRAINTS: verifies emitter configuration limits match performance budget', () => {
      const manager = new CombatParticleManager(mockScene);

      // Spark Emitter specifications
      const sparkConfig = (manager.sparkEmitter as any)?.config;
      expect(sparkConfig).toBeDefined();
      expect(sparkConfig.maxAliveParticles).toBe(80);
      expect(sparkConfig.blendMode).toBe(Phaser.BlendModes.ADD);
      expect(sparkConfig.emitting).toBe(false);
      expect(sparkConfig.lifespan).toEqual({ min: 180, max: 280 });
      expect(sparkConfig.speed).toEqual({ min: 60, max: 180 });
      expect(manager.sparkEmitter?.depth).toBe(37);

      // Smoke Emitter specifications
      const smokeConfig = (manager.smokeEmitter as any)?.config;
      expect(smokeConfig).toBeDefined();
      expect(smokeConfig.maxAliveParticles).toBe(30);
      expect(smokeConfig.blendMode).toBe(Phaser.BlendModes.NORMAL);
      expect(smokeConfig.emitting).toBe(false);
      expect(smokeConfig.lifespan).toEqual({ min: 300, max: 450 });
      expect(smokeConfig.speedY).toEqual({ min: -40, max: -15 });
      expect(smokeConfig.speedX).toEqual({ min: -20, max: 20 });
      expect(manager.smokeEmitter?.depth).toBe(36);

      manager.destroy();
    });

    it('LIFECYCLE TEARDOWN: double destroy is idempotent and post-destroy calls are safe no-ops', () => {
      const manager = new CombatParticleManager(mockScene);
      const sparkEmitter = manager.sparkEmitter as any;
      const smokeEmitter = manager.smokeEmitter as any;

      // 1. First destroy cleanly tears down
      manager.destroy();
      expect(sparkEmitter.isDestroyed).toBe(true);
      expect(smokeEmitter.isDestroyed).toBe(true);
      expect(manager.sparkEmitter).toBeUndefined();
      expect(manager.smokeEmitter).toBeUndefined();

      // 2. Second destroy call should be idempotent (no throw)
      expect(() => manager.destroy()).not.toThrow();

      // 3. Post-destroy emission calls should be safe no-ops
      expect(() => manager.emitImpactSparks(100, 200, false)).not.toThrow();
      expect(() => manager.emitImpactSparks(100, 200, true)).not.toThrow();
      expect(() => manager.emitImpactSmoke(100, 200)).not.toThrow();

      // Ensure no new particles were emitted after destroy
      expect(sparkEmitter.emittedParticles).toHaveLength(0);
      expect(smokeEmitter.emittedParticles).toHaveLength(0);
    });

    it('HEADLESS SAFETY: handles scenes missing add.particles or throwing during creation', () => {
      // Scene without add.particles
      const bareScene = {} as any;
      const manager1 = new CombatParticleManager(bareScene);
      expect(manager1.sparkEmitter).toBeUndefined();
      expect(manager1.smokeEmitter).toBeUndefined();
      expect(() => manager1.emitImpactSparks(10, 20)).not.toThrow();
      expect(() => manager1.emitImpactSmoke(10, 20)).not.toThrow();
      expect(() => manager1.destroy()).not.toThrow();

      // Scene where add.particles throws
      const throwingScene = {
        add: {
          particles: () => {
            throw new Error('Texture particle_spark not loaded');
          }
        }
      } as any;
      const manager2 = new CombatParticleManager(throwingScene);
      expect(manager2.sparkEmitter).toBeUndefined();
      expect(manager2.smokeEmitter).toBeUndefined();
      expect(() => manager2.emitImpactSparks(10, 20)).not.toThrow();
      expect(() => manager2.emitImpactSmoke(10, 20)).not.toThrow();
      expect(() => manager2.destroy()).not.toThrow();
    });
  });

  // =========================================================================
  // Part 3: Full BattleScene End-to-End Simulation of 50 Hits & Reactions
  // =========================================================================
  describe('Part 3: End-to-End BattleScene Hit Burst Simulation (50 Hits & Reactions)', () => {
    it('simulates 50 simultaneous projectile hits and elemental reactions: 1 shake, 50 flashes, 50 hit-stops, zero leaks', () => {
      // 1. Create simulated BattleScene environment
      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 5000, removeAllEvents: vi.fn() };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };
      scene.triggerSubtleShake = BattleScene.prototype.triggerSubtleShake.bind(scene);
      scene.tweens = { killAll: vi.fn() };
      scene.unitSprites = new Map();
      scene.enemySprites = new Map();
      scene.weaponAttackTimers = new Map();

      const particleManager = new CombatParticleManager(mockScene);
      scene.combatParticleManager = particleManager;

      // 2. Create 50 enemy entities & enemy sprites
      const enemies: EnemyEntity[] = [];
      const sprites: EnemySprite[] = [];
      for (let i = 0; i < 50; i++) {
        const enemy: EnemyEntity = {
          id: `enemy_burst_${i}`,
          typeId: 'ordinary',
          name: `敌兵_${i}`,
          currentHp: 100,
          maxHp: 100,
          moveSpeed: 1.0,
          armor: 5,
          shield: 0,
          wallDamage: 10,
          isBoss: false,
          x: 200 + (i % 5) * 60,
          y: 700 + Math.floor(i / 5) * 20
        };
        const sprite = new EnemySprite(mockScene, enemy);
        enemies.push(enemy);
        sprites.push(sprite);
        scene.enemySprites.set(enemy.id, sprite);
      }

      // 3. Simulate simultaneous impact burst in a single frame:
      // - 25 projectile crits
      // - 25 elemental reaction blasts
      for (let i = 0; i < 50; i++) {
        const sprite = sprites[i];
        const isReaction = i >= 25;
        const isCrit = !isReaction && i % 2 === 0;

        // Visual flash & hit stop
        sprite.playHitFlash(isCrit || isReaction);
        sprite.triggerHitStop(isReaction ? 0.050 : 0.033);

        // Camera shake attempt
        if (isReaction) {
          scene.triggerSubtleShake('elemental_blast');
        } else if (isCrit) {
          scene.triggerSubtleShake('crit_impact');
        } else {
          scene.triggerSubtleShake('heavy_cannon');
        }

        // Particle emissions
        scene.combatParticleManager.emitImpactSparks(sprite.x, sprite.y, isCrit || isReaction);
        if (isReaction || i % 3 === 0) {
          scene.combatParticleManager.emitImpactSmoke(sprite.x, sprite.y);
        }
      }

      // 4. VERIFY: Camera Shake was called strictly ONCE during this 50-hit burst!
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);
      // The first call was crit_impact (index 0 isCrit)
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(70, 0.0020);

      // 5. VERIFY: All 50 sprites received hit flash & hit stop
      for (let i = 0; i < 50; i++) {
        expect(sprites[i].isFlashing()).toBe(true);
        expect(sprites[i].isHitStopped()).toBe(true);
      }

      // 6. VERIFY: Particles were emitted for each hit
      const sparkEmitter = particleManager.sparkEmitter as any;
      expect(sparkEmitter.emittedParticles.length).toBe(50);

      // 7. Advance time past 120ms to verify next hit successfully triggers shake
      scene.time.now = 5125; // +125ms > 120ms
      scene.triggerSubtleShake('elemental_blast');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(2);
      expect(scene.cameras.main.shake).toHaveBeenLastCalledWith(110, 0.0032);

      // 8. VERIFY: Scene shutdown cleanly destroys particle manager and all resources
      scene.shutdown();
      expect(scene.combatParticleManager).toBeUndefined();
      expect(sparkEmitter.isDestroyed).toBe(true);
      for (const sprite of sprites) {
        expect(sprite.isHitStopped()).toBe(false);
      }
    });
  });
});
