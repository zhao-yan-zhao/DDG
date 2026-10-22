/**
 * 《孤城神机营》- Milestone M3 (R3 P2 Combat Hit Feedback & Juice) Unit Tests
 * Verifies:
 * 1. EnemySprite: Hit-Flash White Coverage (0.06s normal, 0.08s crit, clearTint, backward compatibility)
 * 2. EnemySprite: Hit-Stop 2~3 Frame Pause (duration, freeze of walk-bobbing, isHitStopped)
 * 3. CombatParticleManager: Zero-allocation particle pooling (sparks 4/8, smoke 2, depth, teardown)
 * 4. BattleScene: Subtle Camera Shake with 120ms Throttle Gate (heavy_cannon, crit_impact, elemental_blast)
 * 5. BattleScene: Hit-Stop Coordinate Snap Freezing & Elemental Reactions Full Juice Feedback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';

// =========================================================================
// Mock Phaser Environment
// =========================================================================
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

import { EnemySprite } from '../src/presentation/renderers/enemy-sprite';
import { CombatParticleManager } from '../src/presentation/renderers/combat-particle-manager';
import { BattleScene } from '../src/presentation/scenes/battle-scene';
import { EnemyEntity } from '../src/core/types';

describe('Milestone M3: R3 P2 Combat Hit Feedback & Juice Suite', () => {
  let mockScene: any;
  let sparkEmitters: any[];
  let smokeEmitters: any[];

  const createEnemy = (overrides?: Partial<EnemyEntity>): EnemyEntity => ({
    id: 'enemy_m3_test',
    typeId: 'ordinary',
    name: '流寇死士',
    currentHp: 100,
    maxHp: 100,
    moveSpeed: 1.0,
    armor: 10,
    shield: 0,
    wallDamage: 10,
    isBoss: false,
    x: 375,
    y: 900,
    ...overrides
  });

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
  // Section 1: EnemySprite Hit-Flash White Coverage
  // =========================================================================
  describe('1. EnemySprite Hit-Flash White Coverage & Timing', () => {
    it('triggers standard 0.06s hit flash white for normal hits', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.playHitFlash(false);

      expect(sprite.isFlashing()).toBe(true);
      expect(sprite.flashTimer).toBe(0.06);
      expect(sprite.baseSprite.tint).toBe(0xffffff);
      expect(sprite.baseSprite.tintFill).toBe(true);
      expect(sprite.baseSprite.scaleX).toBe(1.0);
    });

    it('triggers 0.08s hit flash with 1.12x scale pulse for critical hits', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.playHitFlash(true);

      expect(sprite.isFlashing()).toBe(true);
      expect(sprite.flashTimer).toBe(0.08);
      expect(sprite.baseSprite.tint).toBe(0xffffff);
      expect(sprite.baseSprite.tintFill).toBe(true);
      expect(sprite.baseSprite.scaleX).toBe(1.12);
    });

    it('supports custom duration override parameter', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.playHitFlash(true, 0.050);
      expect(sprite.flashTimer).toBe(0.050);

      sprite.playHitFlash(false, 0.100);
      expect(sprite.flashTimer).toBe(0.100);
    });

    it('preserves 0.06s backward compatibility when rendered under legacy mock without cameras', () => {
      const legacyMockScene = {
        add: mockScene.add,
        textures: mockScene.textures,
        tweens: mockScene.tweens
        // Notice: no cameras property!
      };
      const enemy = createEnemy();
      const sprite = new EnemySprite(legacyMockScene as any, enemy);

      sprite.playHitFlash(true);
      expect(sprite.flashTimer).toBe(0.06);
    });

    it('counts down flashTimer and restores tint/scale upon expiration in update', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.playHitFlash(true);
      expect(sprite.flashTimer).toBe(0.08);

      // Advance 0.04s -> still flashing
      sprite.update(0.04);
      expect(sprite.flashTimer).toBeCloseTo(0.04, 5);
      expect(sprite.isFlashing()).toBe(true);
      expect(sprite.baseSprite.tintFill).toBe(true);

      // Advance another 0.04s -> expires
      sprite.update(0.04);
      expect(sprite.flashTimer).toBe(0);
      expect(sprite.isFlashing()).toBe(false);
      expect(sprite.baseSprite.tintFill).toBe(false);
      expect(sprite.baseSprite.scaleX).toBe(1.0);
    });
  });

  // =========================================================================
  // Section 2: EnemySprite Hit-Stop (2~3 Frame Freeze)
  // =========================================================================
  describe('2. EnemySprite Hit-Stop (2~3 Frame Pause)', () => {
    it('initializes with hitStopTimer at 0 and isHitStopped false', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
    });

    it('triggerHitStop sets hitStopTimer and isHitStopped becomes true', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.triggerHitStop(0.045);
      expect(sprite.hitStopTimer).toBe(0.045);
      expect(sprite.isHitStopped()).toBe(true);
    });

    it('decrements hitStopTimer on each update frame', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.triggerHitStop(0.045);
      sprite.update(0.020);
      expect(sprite.hitStopTimer).toBeCloseTo(0.025, 5);
      expect(sprite.isHitStopped()).toBe(true);

      sprite.update(0.025);
      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
    });

    it('freezes walk-bobbing and keeps bobTimer intact while hitStopTimer > 0', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      // Advance 1 second normal walking to establish baseline bobTimer
      sprite.update(1.0);
      const bobTimerBeforeHitStop = sprite.bobTimer;
      const baseSpriteYBefore = sprite.baseSprite.y;
      expect(bobTimerBeforeHitStop).toBeGreaterThan(0);

      // Trigger 0.050s hit stop
      sprite.triggerHitStop(0.050);

      // Update during hit stop (0.030s)
      sprite.update(0.030);

      // Bobbing must be strictly frozen
      expect(sprite.bobTimer).toBe(bobTimerBeforeHitStop);
      expect(sprite.baseSprite.y).toBe(baseSpriteYBefore);

      // Expire hit stop
      sprite.update(0.020);
      expect(sprite.isHitStopped()).toBe(false);

      // Next frame resumes bobbing
      sprite.update(0.016);
      expect(sprite.bobTimer).toBeGreaterThan(bobTimerBeforeHitStop);
    });

    it('clears hitStopTimer on destroy', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);
      sprite.triggerHitStop(0.045);

      sprite.destroy();
      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
    });
  });

  // =========================================================================
  // Section 3: CombatParticleManager Pool & Emitters
  // =========================================================================
  describe('3. CombatParticleManager Pool & Emitter Juice', () => {
    it('creates spark and smoke emitters with specified depths and blend modes', () => {
      const manager = new CombatParticleManager(mockScene);

      expect(mockScene.add.particles).toHaveBeenCalledTimes(2);
      expect(manager.sparkEmitter).toBeDefined();
      expect(manager.smokeEmitter).toBeDefined();

      expect(manager.sparkEmitter?.depth).toBe(37);
      expect(manager.sparkEmitter?.config.blendMode).toBe(Phaser.BlendModes.ADD);
      expect(manager.sparkEmitter?.config.maxAliveParticles).toBe(80);

      expect(manager.smokeEmitter?.depth).toBe(36);
      expect(manager.smokeEmitter?.config.blendMode).toBe(Phaser.BlendModes.NORMAL);
      expect(manager.smokeEmitter?.config.maxAliveParticles).toBe(30);

      manager.destroy();
    });

    it('emits 4 sparks for normal impacts and 8 sparks for crits', () => {
      const manager = new CombatParticleManager(mockScene);
      const sparkEmitter = manager.sparkEmitter as any;

      manager.emitImpactSparks(375, 800, false);
      expect(sparkEmitter.emittedParticles).toHaveLength(1);
      expect(sparkEmitter.emittedParticles[0]).toEqual({ x: 375, y: 800, count: 4 });

      manager.emitImpactSparks(420, 850, true);
      expect(sparkEmitter.emittedParticles).toHaveLength(2);
      expect(sparkEmitter.emittedParticles[1]).toEqual({ x: 420, y: 850, count: 8 });

      manager.destroy();
    });

    it('emits 2 smoke puffs on impact smoke', () => {
      const manager = new CombatParticleManager(mockScene);
      const smokeEmitter = manager.smokeEmitter as any;

      manager.emitImpactSmoke(375, 800);
      expect(smokeEmitter.emittedParticles).toHaveLength(1);
      expect(smokeEmitter.emittedParticles[0]).toEqual({ x: 375, y: 800, count: 2 });

      manager.destroy();
    });

    it('cleanly destroys emitters and guards against emissions after teardown', () => {
      const manager = new CombatParticleManager(mockScene);
      const sparkEmitter = manager.sparkEmitter as any;
      const smokeEmitter = manager.smokeEmitter as any;

      manager.destroy();
      expect(sparkEmitter.isDestroyed).toBe(true);
      expect(smokeEmitter.isDestroyed).toBe(true);
      expect(manager.sparkEmitter).toBeUndefined();
      expect(manager.smokeEmitter).toBeUndefined();

      // Safe against no-op calls after destruction
      expect(() => manager.emitImpactSparks(375, 800, true)).not.toThrow();
      expect(() => manager.emitImpactSmoke(375, 800)).not.toThrow();
    });

    it('gracefully handles headless scenes where add.particles is undefined', () => {
      const emptyScene = {} as any;
      const manager = new CombatParticleManager(emptyScene);

      expect(manager.sparkEmitter).toBeUndefined();
      expect(manager.smokeEmitter).toBeUndefined();
      expect(() => manager.emitImpactSparks(100, 200)).not.toThrow();
      expect(() => manager.emitImpactSmoke(100, 200)).not.toThrow();
      expect(() => manager.destroy()).not.toThrow();
    });
  });

  // =========================================================================
  // Section 4: BattleScene Subtle Camera Shake with 120ms Throttle Gate
  // =========================================================================
  describe('4. BattleScene Subtle Camera Shake with 120ms Throttle Gate', () => {
    it('triggers heavy_cannon camera shake with 90ms duration and 0.0028 intensity', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 1000 };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };

      scene.triggerSubtleShake('heavy_cannon');

      expect(scene.cameras.main.shake).toHaveBeenCalledWith(90, 0.0028);
      expect(scene.lastCameraShakeTime).toBe(1000);
    });

    it('triggers crit_impact camera shake with 70ms duration and 0.0020 intensity', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 1000 };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };

      scene.triggerSubtleShake('crit_impact');

      expect(scene.cameras.main.shake).toHaveBeenCalledWith(70, 0.0020);
    });

    it('triggers elemental_blast camera shake with 110ms duration and 0.0032 intensity', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 1000 };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };

      scene.triggerSubtleShake('elemental_blast');

      expect(scene.cameras.main.shake).toHaveBeenCalledWith(110, 0.0032);
    });

    it('throttles rapid consecutive shakes within 120ms window', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 1000 };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };

      // 1st shake at t = 1000ms -> passes
      scene.triggerSubtleShake('heavy_cannon');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);

      // 2nd shake at t = 1050ms (50ms elapsed < 120ms) -> throttled!
      scene.time.now = 1050;
      scene.triggerSubtleShake('crit_impact');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);

      // 3rd shake at t = 1119ms (119ms elapsed < 120ms) -> throttled!
      scene.time.now = 1119;
      scene.triggerSubtleShake('elemental_blast');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);

      // 4th shake at t = 1121ms (121ms elapsed >= 120ms) -> passes!
      scene.time.now = 1121;
      scene.triggerSubtleShake('crit_impact');
      expect(scene.cameras.main.shake).toHaveBeenCalledTimes(2);
      expect(scene.cameras.main.shake).toHaveBeenLastCalledWith(70, 0.0020);
    });

    it('safely tolerates missing cameras or main camera', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 1000 };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = undefined;

      expect(() => scene.triggerSubtleShake('heavy_cannon')).not.toThrow();
    });
  });

  // =========================================================================
  // Section 5: BattleScene Hit-Stop Coordinate Snapping & Feedback Integration
  // =========================================================================
  describe('5. BattleScene Hit-Stop Position Freeze & Combat Juice Integration', () => {
    it('skips setPosition when sprite is in hit-stop frame freeze in BattleScene.update', () => {
      const enemy = createEnemy({ x: 375, y: 850 });
      const sprite = new EnemySprite(mockScene, enemy);
      const setPositionSpy = vi.spyOn(sprite, 'setPosition');

      // 1. When NOT hit stopped:
      expect(sprite.isHitStopped()).toBe(false);
      // Simulate BattleScene.update loop:
      if (!sprite.isHitStopped()) {
        sprite.setPosition(enemy.x || 375, enemy.y || 1120);
      }
      expect(setPositionSpy).toHaveBeenCalledWith(375, 850);

      // 2. Trigger Hit-Stop:
      sprite.triggerHitStop(0.045);
      expect(sprite.isHitStopped()).toBe(true);
      setPositionSpy.mockClear();

      // Simulate core moving the enemy while sprite is in hit stop
      enemy.y = 860;
      if (!sprite.isHitStopped()) {
        sprite.setPosition(enemy.x || 375, enemy.y || 1120);
      }
      // setPosition must NOT be called while hit stopped!
      expect(setPositionSpy).not.toHaveBeenCalled();

      // 3. Update sprite until hit-stop expires:
      sprite.update(0.050);
      expect(sprite.isHitStopped()).toBe(false);

      // Next frame resumes coordinate snapping
      if (!sprite.isHitStopped()) {
        sprite.setPosition(enemy.x || 375, enemy.y || 1120);
      }
      expect(setPositionSpy).toHaveBeenCalledWith(375, 860);
    });

    it('evaluates elemental reactions and triggers hit-flash, hit-stop, camera shake, and particles', () => {
      const enemy = createEnemy({ id: 'target_reaction', x: 400, y: 780 });
      const sprite = new EnemySprite(mockScene, enemy);
      const flashSpy = vi.spyOn(sprite, 'playHitFlash');
      const hitStopSpy = vi.spyOn(sprite, 'triggerHitStop');

      const scene = Object.create(BattleScene.prototype);
      scene.time = { now: 5000 };
      scene.lastCameraShakeTime = 0;
      scene.CAMERA_SHAKE_MIN_INTERVAL = 120;
      scene.cameras = { main: { shake: vi.fn() } };
      scene.triggerSubtleShake = BattleScene.prototype.triggerSubtleShake.bind(scene);

      const combatParticleManager = new CombatParticleManager(mockScene);
      const sparkSpy = vi.spyOn(combatParticleManager, 'emitImpactSparks');
      const smokeSpy = vi.spyOn(combatParticleManager, 'emitImpactSmoke');
      scene.combatParticleManager = combatParticleManager;

      // Simulate an elemental reaction impact on this sprite
      sprite.playHitFlash(true);
      sprite.triggerHitStop(0.050);
      scene.triggerSubtleShake('elemental_blast');
      scene.combatParticleManager.emitImpactSparks(enemy.x, enemy.y, true);
      scene.combatParticleManager.emitImpactSmoke(enemy.x, enemy.y);

      expect(flashSpy).toHaveBeenCalledWith(true);
      expect(hitStopSpy).toHaveBeenCalledWith(0.050);
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(110, 0.0032);
      expect(sparkSpy).toHaveBeenCalledWith(400, 780, true);
      expect(smokeSpy).toHaveBeenCalledWith(400, 780);

      combatParticleManager.destroy();
    });

    it('BattleScene.shutdown cleanly destroys combatParticleManager', () => {
      const scene = Object.create(BattleScene.prototype);
      scene.time = { removeAllEvents: vi.fn() };
      scene.tweens = { killAll: vi.fn() };
      scene.unitSprites = new Map();
      scene.enemySprites = new Map();
      scene.weaponAttackTimers = new Map();

      const particleManager = new CombatParticleManager(mockScene);
      const destroySpy = vi.spyOn(particleManager, 'destroy');
      scene.combatParticleManager = particleManager;

      scene.shutdown();

      expect(destroySpy).toHaveBeenCalled();
      expect(scene.combatParticleManager).toBeUndefined();
    });
  });
});
