/**
 * 《孤城神机营》- Milestone M1 Unit Tests
 * R1 Information De-noising & Drop Arc Absorption:
 * 1. FloatingTextPool: 150ms Damage Stacking / Clustering per enemy entity
 * 2. FloatingTextPool: Dynamic Pop Scale (1.25x) & Crit Promotion
 * 3. FloatingTextPool: Anti-Occlusion Anchor (y - 42 for normal, y - 75 for boss)
 * 4. DropFlightManager: 20-token object pool & 3-phase physics animation
 * 5. DropFlightManager: Sound throttling (60ms) and HUD currencyAbsorbed emission
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
    destroy() { this.isDestroyed = true; }
  }

  class MockGraphics extends MockGameObject {
    commands: any[] = [];
    clear() { this.commands = []; return this; }
    fillStyle(color: number, alpha = 1.0) { this.commands.push({ type: 'fillStyle', color, alpha }); return this; }
    fillCircle(x: number, y: number, r: number) { this.commands.push({ type: 'fillCircle', x, y, r }); return this; }
  }

  class MockText extends MockGameObject {
    text: string = '';
    style: any = {};
    constructor(scene: any, x = 0, y = 0, text = '', style = {}) {
      super(scene, x, y);
      this.text = text;
      this.style = { ...style };
    }
    setText(t: string) { this.text = t; return this; }
    setFontSize(s: string) { this.style.fontSize = s; return this; }
    setColor(c: string) { this.style.color = c; return this; }
    setFontFamily(f: string) { this.style.fontFamily = f; return this; }
    setStroke(color: string, thickness: number) { this.style.stroke = color; this.style.strokeThickness = thickness; return this; }
  }

  class MockScene {
    constructor(public config?: any) {}
  }

  return {
    default: {
      Scene: MockScene,
      GameObjects: {
        GameObject: MockGameObject,
        Graphics: MockGraphics,
        Text: MockText,
        Sprite: MockGameObject,
        Container: MockGameObject
      }
    }
  };
});

import { FloatingTextPool } from '../src/presentation/renderers/fly-text';
import { DropFlightManager } from '../src/presentation/renderers/drop-flight-vfx';
import { SoundManager } from '../src/presentation/audio/sound-manager';
import { BattleScene } from '../src/presentation/scenes/battle-scene';

describe('Milestone M1: R1 Information De-noising & Drop Arc Absorption', () => {
  let mockScene: any;
  let addedTweens: any[];
  let emittedEvents: any[];

  beforeEach(() => {
    addedTweens = [];
    emittedEvents = [];

    mockScene = {
      add: {
        graphics: () => new (Phaser.GameObjects as any).Graphics(mockScene),
        text: (x = 0, y = 0, text = '', style = {}) => new (Phaser.GameObjects as any).Text(mockScene, x, y, text, style),
        image: (x = 0, y = 0, key = '') => new (Phaser.GameObjects as any).Sprite(mockScene, x, y)
      },
      textures: {
        exists: vi.fn(() => true)
      },
      tweens: {
        add: vi.fn((config: any) => {
          addedTweens.push(config);
          return config;
        }),
        killAll: vi.fn()
      },
      events: {
        emit: vi.fn((event: string, payload: any) => {
          emittedEvents.push({ event, payload });
        })
      },
      scene: {
        get: vi.fn(() => null)
      }
    };
  });

  // =========================================================================
  // 1. FloatingTextPool: Anti-Occlusion Anchor
  // =========================================================================
  describe('1. FloatingTextPool: Anti-Occlusion Anchor', () => {
    it('anchors ordinary enemy flytext at y - 42 (above health bar and head)', () => {
      const pool = new FloatingTextPool(mockScene, 5);
      pool.spawnDamage('enemy_norm_1', 375, 800, 150, false, false);

      const cluster = pool.getActiveCluster('enemy_norm_1');
      expect(cluster).toBeDefined();
      expect(cluster!.startY).toBe(800 - 42); // 758
      expect(cluster!.textObj.y).toBe(800 - 42);
      expect(cluster!.textObj.text).toBe('150');
    });

    it('anchors Boss enemy flytext at y - 75 (above towering boss sprite and bar)', () => {
      const pool = new FloatingTextPool(mockScene, 5);
      pool.spawnDamage('boss_1', 375, 700, 500, false, true);

      const cluster = pool.getActiveCluster('boss_1');
      expect(cluster).toBeDefined();
      expect(cluster!.startY).toBe(700 - 75); // 625
      expect(cluster!.textObj.y).toBe(700 - 75);
      expect(cluster!.textObj.text).toBe('500');
    });
  });

  // =========================================================================
  // 2. FloatingTextPool: 150ms Damage Stacking / Clustering & Crit Promotion
  // =========================================================================
  describe('2. FloatingTextPool: 150ms Damage Stacking & Crit Promotion', () => {
    it('stacks consecutive damage on the same target within 150ms into a single text item', () => {
      const pool = new FloatingTextPool(mockScene, 10);

      // Hit 1: 120 damage
      pool.spawnDamage('target_a', 300, 600, 120, false, false);
      let cluster = pool.getActiveCluster('target_a');
      expect(cluster).toBeDefined();
      expect(cluster!.totalDamage).toBe(120);
      expect(cluster!.hitCount).toBe(1);
      expect(cluster!.textObj.text).toBe('120');

      // Hit 2: 180 damage arrives within 150ms window
      pool.spawnDamage('target_a', 300, 600, 180, false, false);
      cluster = pool.getActiveCluster('target_a');
      expect(cluster!.totalDamage).toBe(300);
      expect(cluster!.hitCount).toBe(2);
      expect(cluster!.textObj.text).toBe('300');

      // Hit 3: 200 damage arrives
      pool.spawnDamage('target_a', 300, 600, 200, false, false);
      expect(cluster!.totalDamage).toBe(500);
      expect(cluster!.hitCount).toBe(3);
      expect(cluster!.textObj.text).toBe('500');

      // Pool active cluster count remains 1 (no spamming of overlapping numbers)
      expect(pool.getActiveClusterCount()).toBe(1);
    });

    it('promotes cluster to crit style (KaiTi font, #ffd700, stroke 4) when any hit is crit', () => {
      const pool = new FloatingTextPool(mockScene, 10);

      // Hit 1: normal hit
      pool.spawnDamage('target_crit_test', 375, 650, 100, false, false);
      let cluster = pool.getActiveCluster('target_crit_test');
      expect(cluster!.hasCrit).toBe(false);
      expect(cluster!.textObj.style.color).toBe('#ffffff');

      // Hit 2: critical strike arrives!
      pool.spawnDamage('target_crit_test', 375, 650, 350, true, false);
      cluster = pool.getActiveCluster('target_crit_test');
      expect(cluster!.hasCrit).toBe(true);
      expect(cluster!.totalDamage).toBe(450);
      expect(cluster!.textObj.text).toBe('450');
      expect(cluster!.textObj.style.color).toBe('#ffd700');
      expect(cluster!.textObj.style.stroke).toBe('#7f0000');
      expect(cluster!.textObj.style.strokeThickness).toBe(4);
      expect(cluster!.textObj.style.fontFamily).toContain('KaiTi');
    });

    it('triggers scale pop (1.25x) tween on consecutive hits', () => {
      const pool = new FloatingTextPool(mockScene, 5);
      pool.spawnDamage('target_pop', 200, 500, 50, false, false);

      const initialTweensCount = addedTweens.length;
      // Second hit within 150ms triggers pop tween
      pool.spawnDamage('target_pop', 200, 500, 75, false, false);

      expect(addedTweens.length).toBeGreaterThan(initialTweensCount);
      const popTween = addedTweens.find((t: any) => t.duration === 80 && t.ease === 'Quad.easeOut');
      expect(popTween).toBeDefined();
    });
  });

  // =========================================================================
  // 3. DropFlightManager: Object Pool & 3-Phase Animation
  // =========================================================================
  describe('3. DropFlightManager: Object Pool & 3-Phase Animation', () => {
    it('initializes a pre-allocated pool of 20 tokens', () => {
      const manager = new DropFlightManager(mockScene, 20);
      expect(manager.getPoolCapacity()).toBe(20);
      expect(manager.getInUseCount()).toBe(0);
    });

    it('spawns drop flight tokens on spawnDropFlight and launches Phase 1 & 2 tweens', () => {
      const manager = new DropFlightManager(mockScene, 20);
      manager.spawnDropFlight(375, 800, 5);

      expect(manager.getInUseCount()).toBeGreaterThan(0);
      // Phase 1 ground scatter tween has duration 120ms
      const scatterTween = addedTweens.find((t: any) => t.duration === 120 && t.ease === 'Quad.easeOut');
      expect(scatterTween).toBeDefined();
    });

    it('recycles tokens and emits currencyAbsorbed upon completion', () => {
      // Create scene mock that automatically completes tweens
      const instantMockScene = {
        add: {
          graphics: () => new (Phaser.GameObjects as any).Graphics(instantMockScene),
          image: () => new (Phaser.GameObjects as any).Sprite(instantMockScene)
        },
        textures: { exists: () => true },
        tweens: {
          add: vi.fn((config: any) => {
            if (config.onComplete) {
              config.onComplete();
            }
            return config;
          }),
          killAll: vi.fn()
        },
        events: {
          emit: vi.fn()
        },
        scene: { get: vi.fn(() => null) }
      };

      const manager = new DropFlightManager(instantMockScene as any, 20);
      manager.spawnDropFlight(375, 800, 3);

      expect(instantMockScene.events.emit).toHaveBeenCalledWith(
        'currencyAbsorbed',
        expect.objectContaining({ amount: 3 })
      );
    });

    it('throttles SoundManager playCoinJingle calls to at least 60ms', () => {
      const jingleSpy = vi.spyOn(SoundManager.getInstance(), 'playCoinJingle').mockImplementation(() => {});

      const instantMockScene = {
        add: {
          graphics: () => new (Phaser.GameObjects as any).Graphics(instantMockScene),
          image: () => new (Phaser.GameObjects as any).Sprite(instantMockScene)
        },
        textures: { exists: () => true },
        tweens: {
          add: vi.fn((config: any) => {
            if (config.onComplete) config.onComplete();
            return config;
          })
        },
        events: { emit: vi.fn() },
        scene: { get: vi.fn(() => null) }
      };

      const manager = new DropFlightManager(instantMockScene as any, 20);

      // Multiple rapid kills in same frame
      manager.spawnDropFlight(200, 600, 1);
      manager.spawnDropFlight(250, 600, 1);
      manager.spawnDropFlight(300, 600, 1);

      // Even with 3 kills, throttle ensures playCoinJingle is called at most once within 60ms
      expect(jingleSpy).toHaveBeenCalledTimes(1);

      jingleSpy.mockRestore();
    });

    it('cleans up tokens on destroy', () => {
      const manager = new DropFlightManager(mockScene, 20);
      manager.spawnDropFlight(375, 800, 10);
      expect(manager.getPoolCapacity()).toBe(20);

      manager.destroy();
      expect(manager.getPoolCapacity()).toBe(0);
      expect(manager.getInUseCount()).toBe(0);
    });

    it('uses circular round-robin FIFO recycling when burst demand exceeds pool capacity', () => {
      const manager = new DropFlightManager(mockScene, 5); // Pool of 5 tokens

      // Fill the pool with 5 tokens
      for (let i = 0; i < 5; i++) {
        manager.spawnDropFlight(100 + i * 10, 200, 1);
      }
      expect(manager.getInUseCount()).toBe(5);

      const initialTweens = (manager as any).pool.map((t: any) => t.tween);

      // Trigger 3 overflow requests
      manager.spawnDropFlight(300, 400, 1); // Overflow 1: recycles index 0
      manager.spawnDropFlight(310, 400, 1); // Overflow 2: recycles index 1
      manager.spawnDropFlight(320, 400, 1); // Overflow 3: recycles index 2

      // Tokens 0, 1, 2 should have been recycled with new tweens
      expect((manager as any).pool[0].tween).not.toBe(initialTweens[0]);
      expect((manager as any).pool[1].tween).not.toBe(initialTweens[1]);
      expect((manager as any).pool[2].tween).not.toBe(initialTweens[2]);

      // Tokens 3 and 4 should still be running their initial tweens undisturbed
      expect((manager as any).pool[3].tween).toBe(initialTweens[3]);
      expect((manager as any).pool[4].tween).toBe(initialTweens[4]);
    });
  });

  // =========================================================================
  // 4. BattleScene Teardown & Lifecycle Integration
  // =========================================================================
  describe('4. BattleScene Teardown & Lifecycle Integration', () => {
    it('BattleScene.shutdown() cleanly invokes floatingTextPool.destroy() and dropFlightManager.destroy()', () => {
      const scene = new BattleScene();
      const mockTextPool = { destroy: vi.fn(), clear: vi.fn() };
      const mockDropManager = { destroy: vi.fn() };
      const mockElementalVfx = { destroy: vi.fn() };

      (scene as any).elementalVfx = mockElementalVfx;
      (scene as any).floatingTextPool = mockTextPool;
      (scene as any).dropFlightManager = mockDropManager;
      (scene as any).time = { removeAllEvents: vi.fn() };
      (scene as any).tweens = { killAll: vi.fn() };
      (scene as any).unitSprites = new Map();
      (scene as any).enemySprites = new Map();
      (scene as any).weaponAttackTimers = new Map();

      scene.shutdown();

      expect(mockElementalVfx.destroy).toHaveBeenCalledTimes(1);
      expect(mockTextPool.destroy).toHaveBeenCalledTimes(1);
      expect(mockDropManager.destroy).toHaveBeenCalledTimes(1);
    });

    it('BattleScene.shutdown() safely handles early termination when floatingTextPool is undefined', () => {
      const scene = new BattleScene();
      (scene as any).time = { removeAllEvents: vi.fn() };
      (scene as any).tweens = { killAll: vi.fn() };
      (scene as any).unitSprites = new Map();
      (scene as any).enemySprites = new Map();
      (scene as any).weaponAttackTimers = new Map();

      // floatingTextPool is undefined
      expect(() => scene.shutdown()).not.toThrow();
    });
  });
});
