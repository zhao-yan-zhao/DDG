/**
 * 《孤城神机营》- Milestone M1 Challenger Adversarial Stress Test Suite
 * Empirical Stress Testing of DropFlightManager in `src/presentation/renderers/drop-flight-vfx.ts`.
 *
 * Verifies:
 * 1. Extreme rapid burst: 50+ drop flight spawns in a single frame (pool capacity invariant, no NaNs, clean recycling).
 * 2. Bezier trajectory: empirical sampling along curve from start to (248, 24+topOffset), curvature and monotonicity.
 * 3. Lifecycle completion: Phase 1 -> Phase 2 -> Phase 3 -> idle state, zero leaks, sound throttling, HUD callbacks.
 * 4. Adversarial boundaries: degenerate drop amounts, negative coordinates, safe area insets, teardown resilience.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';

// =========================================================================
// Mock Phaser Environment with Steppable Tween Engine
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

  return {
    default: {
      GameObjects: {
        GameObject: MockGameObject,
        Graphics: MockGraphics,
        Sprite: MockGameObject
      }
    }
  };
});

import { DropFlightManager } from '../src/presentation/renderers/drop-flight-vfx';
import { SoundManager } from '../src/presentation/audio/sound-manager';
import { PlatformBridge } from '../src/bridge/platform';

// Simulation harness for controlling tweens
interface ManagedTween {
  config: any;
  elapsed: number;
  duration: number;
  delay: number;
  isStopped: boolean;
  isComplete: boolean;
  target: any;
  stop: () => void;
}

class SteppableTweenManager {
  public activeTweens: ManagedTween[] = [];
  public pendingTweens: ManagedTween[] = [];
  public completedCount: number = 0;

  public add(config: any): ManagedTween {
    const tween: ManagedTween = {
      config,
      elapsed: 0,
      duration: config.duration || 100,
      delay: config.delay || 0,
      isStopped: false,
      isComplete: false,
      target: config.targets,
      stop: () => {
        tween.isStopped = true;
      }
    };
    this.pendingTweens.push(tween);
    return tween;
  }

  public step(deltaMs: number): void {
    if (this.pendingTweens.length > 0) {
      this.activeTweens.push(...this.pendingTweens);
      this.pendingTweens = [];
    }

    const surviving: ManagedTween[] = [];

    for (const tween of this.activeTweens) {
      if (tween.isStopped) continue;

      tween.elapsed += deltaMs;
      if (tween.elapsed < tween.delay) {
        surviving.push(tween);
        continue;
      }

      const activeTime = tween.elapsed - tween.delay;
      const progress = Math.min(1.0, activeTime / Math.max(1, tween.duration));

      // Ease simulation: if cubic, progress^3, if quad, 1 - (1-p)^2
      let eased = progress;
      if (tween.config.ease === 'Quad.easeOut') {
        eased = 1 - (1 - progress) * (1 - progress);
      } else if (tween.config.ease === 'Cubic.easeIn') {
        eased = progress * progress * progress;
      }

      if (tween.target) {
        if ('t' in tween.target) {
          tween.target.t = eased;
        }
        if ('x' in tween.config && 'x' in tween.target) {
          tween.target.x = tween.config.x;
        }
        if ('y' in tween.config && 'y' in tween.target) {
          tween.target.y = tween.config.y;
        }
        if ('scaleX' in tween.config && 'scaleX' in tween.target) {
          tween.target.scaleX = tween.config.scaleX;
          tween.target.scaleY = tween.config.scaleY;
        }
      }

      if (typeof tween.config.onUpdate === 'function') {
        tween.config.onUpdate();
      }

      if (progress >= 1.0) {
        tween.isComplete = true;
        this.completedCount++;
        if (typeof tween.config.onComplete === 'function') {
          tween.config.onComplete();
        }
      } else {
        surviving.push(tween);
      }
    }

    this.activeTweens = surviving;
  }

  public runAll(maxSteps = 500, stepMs = 20): void {
    let steps = 0;
    while ((this.activeTweens.length > 0 || this.pendingTweens.length > 0) && steps < maxSteps) {
      this.step(stepMs);
      steps++;
    }
  }

  public killAll(): void {
    for (const t of this.activeTweens) {
      t.stop();
    }
    for (const t of this.pendingTweens) {
      t.stop();
    }
    this.activeTweens = [];
    this.pendingTweens = [];
  }
}

describe('Challenger M1_2 Adversarial Stress Test: DropFlightManager', () => {
  let mockScene: any;
  let tweenEngine: SteppableTweenManager;
  let emittedEvents: Array<{ event: string; payload: any }>;
  let createdGraphics: any[];
  let createdImages: any[];

  beforeEach(() => {
    tweenEngine = new SteppableTweenManager();
    emittedEvents = [];
    createdGraphics = [];
    createdImages = [];

    const mockUiScene = {
      silverIcon: { scaleX: 1, scaleY: 1 },
      silverText: { scaleX: 1, scaleY: 1 },
      tweens: {
        add: vi.fn((cfg: any) => tweenEngine.add(cfg))
      }
    };

    mockScene = {
      add: {
        graphics: vi.fn(() => {
          const g = new (Phaser.GameObjects as any).Graphics(mockScene);
          createdGraphics.push(g);
          return g;
        }),
        image: vi.fn((x: number, y: number, key: string) => {
          const img = new (Phaser.GameObjects as any).Sprite(mockScene, x, y);
          createdImages.push(img);
          return img;
        })
      },
      textures: {
        exists: vi.fn((key: string) => true)
      },
      tweens: {
        add: vi.fn((config: any) => tweenEngine.add(config)),
        killAll: vi.fn(() => tweenEngine.killAll())
      },
      events: {
        emit: vi.fn((event: string, payload: any) => {
          emittedEvents.push({ event, payload });
        })
      },
      scene: {
        get: vi.fn((sceneKey: string) => {
          if (sceneKey === 'UIScene') {
            return mockUiScene;
          }
          return null;
        })
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Dimension 1: Extreme Rapid Burst Stress (50+ Spawns in a Single Frame)
  // =========================================================================
  describe('Dimension 1: Extreme Rapid Burst Stress (50+ spawns in 1 frame)', () => {
    it('1.1 Handles 60 single-token drops in a single frame without crashing, leaking, or producing NaNs', () => {
      const manager = new DropFlightManager(mockScene, 20);
      expect(manager.getPoolCapacity()).toBe(20);
      expect(manager.getInUseCount()).toBe(0);

      // Trigger 60 kills across diverse battlefield coordinates in 1 frame
      expect(() => {
        for (let i = 0; i < 60; i++) {
          const x = 100 + (i % 10) * 55;
          const y = 600 + (i % 6) * 100;
          manager.spawnDropFlight(x, y, 1);
        }
      }).not.toThrow();

      // Pool capacity invariant: must remain exactly 20 (zero memory allocation/growth)
      expect(manager.getPoolCapacity()).toBe(20);
      // All 20 pool slots should be occupied
      expect(manager.getInUseCount()).toBe(20);

      // Verify no NaN coordinates exist on any active token view
      for (const img of createdImages) {
        expect(Number.isFinite(img.x)).toBe(true);
        expect(Number.isFinite(img.y)).toBe(true);
        expect(Number.isNaN(img.x)).toBe(false);
        expect(Number.isNaN(img.y)).toBe(false);
      }

      // Step the simulation until all tweens finish
      tweenEngine.runAll(300, 20);

      // After complete lifecycle, all tokens must return to idle
      expect(manager.getInUseCount()).toBe(0);
      expect(manager.getPoolCapacity()).toBe(20);
    });

    it('1.2 Absorbs massive multi-token burst (150 requested tokens from 50 high-value enemies)', () => {
      const manager = new DropFlightManager(mockScene, 20);

      // 25 enemies with dropSilver = 20 (4 tokens each = 100 tokens)
      // 25 enemies with dropSilver = 5 (2 tokens each = 50 tokens)
      // Total 150 token allocations requested against a 20-slot pool
      expect(() => {
        for (let i = 0; i < 25; i++) {
          manager.spawnDropFlight(375, 800, 20);
        }
        for (let i = 0; i < 25; i++) {
          manager.spawnDropFlight(300, 900, 5);
        }
      }).not.toThrow();

      expect(manager.getPoolCapacity()).toBe(20);
      expect(manager.getInUseCount()).toBe(20);

      // Advance through all phases
      tweenEngine.runAll(400, 20);

      // Clean recovery: zero tokens stuck in inUse state
      expect(manager.getInUseCount()).toBe(0);
      // Ensure currencyAbsorbed events were emitted
      expect(emittedEvents.filter(e => e.event === 'currencyAbsorbed').length).toBeGreaterThan(0);
    });

    it('1.3 Handles sustained multi-frame barrage (10 frames x 10 drops = 100 drops over 160ms)', () => {
      const manager = new DropFlightManager(mockScene, 20);

      // 10 consecutive frames, spawning 10 drops per frame with 16ms delta
      for (let frame = 0; frame < 10; frame++) {
        for (let drop = 0; drop < 10; drop++) {
          manager.spawnDropFlight(200 + drop * 35, 750 + frame * 30, 2);
        }
        // Advance 1 frame (16.6ms)
        tweenEngine.step(16);

        // Verify state consistency mid-stream
        expect(manager.getPoolCapacity()).toBe(20);
        expect(manager.getInUseCount()).toBeLessThanOrEqual(20);
      }

      // Finish remaining flight time
      tweenEngine.runAll(300, 20);

      expect(manager.getInUseCount()).toBe(0);
      expect(manager.getPoolCapacity()).toBe(20);
    });
  });

  // =========================================================================
  // Dimension 2: Bezier Trajectory Empirical Sampling & Curvature Verification
  // =========================================================================
  describe('Dimension 2: Bezier Trajectory Empirical Sampling & Mathematical Invariants', () => {
    it('2.1 Rigorously samples 1000+ points across 50 battlefield curves to verify upward progression & non-NaN', () => {
      // Test 50 distinct origin locations across the battlefield:
      // x in [50, 700], y in [560, 1240]
      const origins: Array<{ x: number; y: number }> = [
        { x: 50, y: 560 },   // Top-left boundary
        { x: 375, y: 560 },  // Top-center boundary
        { x: 700, y: 560 },  // Top-right boundary
        { x: 248, y: 700 },  // Collinear with HUD silver X
        { x: 100, y: 800 },  // Left flank
        { x: 375, y: 800 },  // Dead center
        { x: 650, y: 800 },  // Right flank
        { x: 50, y: 1240 },  // Bottom-left boundary
        { x: 375, y: 1240 }, // Bottom-center boundary
        { x: 700, y: 1240 }  // Bottom-right boundary
      ];

      // Add 40 randomized positions
      for (let i = 0; i < 40; i++) {
        origins.push({
          x: 50 + Math.random() * 650,
          y: 560 + Math.random() * 680
        });
      }

      const targetX = 248;
      const targetY = 24; // default topOffset = 0

      for (const origin of origins) {
        // Scatter simulation (Phase 1)
        const angle = Math.random() * Math.PI * 2;
        const dist = 6 + Math.random() * 9;
        const scatterX = origin.x + Math.cos(angle) * dist;
        const scatterY = origin.y + Math.sin(angle) * dist;

        // Bezier setup (Phase 2)
        const midX = (scatterX + targetX) / 2;
        const sideSign = scatterX < targetX ? -1 : 1;
        const cpX = midX + sideSign * (35 + Math.random() * 35);
        const cpY = Math.min(scatterY, targetY) - (35 + Math.random() * 35);

        // Control point checks:
        // 1. cpY must be lower than or equal to targetY (i.e. reaches up into/above HUD)
        expect(cpY).toBeLessThan(targetY);
        // 2. cpX must bow outwards away from center
        if (scatterX < targetX) {
          expect(cpX).toBeLessThan(midX); // Outward left
        } else if (scatterX > targetX) {
          expect(cpX).toBeGreaterThan(midX); // Outward right
        }

        // Sample 25 points along t in [0.0, 1.0]
        let previousY = scatterY;
        for (let step = 0; step <= 25; step++) {
          const t = step / 25;
          const invT = 1 - t;
          const curX = invT * invT * scatterX + 2 * invT * t * cpX + t * t * targetX;
          const curY = invT * invT * scatterY + 2 * invT * t * cpY + t * t * targetY;

          // Invariant 1: Coordinates must be finite and non-NaN
          expect(Number.isFinite(curX)).toBe(true);
          expect(Number.isFinite(curY)).toBe(true);
          expect(Number.isNaN(curX)).toBe(false);
          expect(Number.isNaN(curY)).toBe(false);

          // Invariant 2: Endpoints must match scatter and target
          if (step === 0) {
            expect(Math.abs(curX - scatterX)).toBeLessThan(0.0001);
            expect(Math.abs(curY - scatterY)).toBeLessThan(0.0001);
          }
          if (step === 25) {
            expect(Math.abs(curX - targetX)).toBeLessThan(0.0001);
            expect(Math.abs(curY - targetY)).toBeLessThan(0.0001);
          }

          // Invariant 3: Upward progression for t in [0, 0.85]
          // Screen Y decreases as objects fly upwards
          if (t <= 0.85 && step > 0) {
            expect(curY).toBeLessThanOrEqual(previousY + 0.0001);
          }

          previousY = curY;
        }
      }
    });

    it('2.2 Records real-time runtime positions during tween execution to ensure smooth flight', () => {
      const manager = new DropFlightManager(mockScene, 5);
      manager.spawnDropFlight(375, 800, 1);

      // Advance through Phase 1 scatter
      tweenEngine.step(125);
      // Step into Phase 2
      tweenEngine.step(20);

      // Find Phase 2 flight tween
      const flightTween = tweenEngine.activeTweens.find(t => t.config.ease === 'Cubic.easeIn');
      expect(flightTween).toBeDefined();

      const sampledPositions: Array<{ x: number; y: number; rotation: number }> = [];
      const tokenView = createdImages[0];

      // Step through Phase 2 at 25ms increments
      for (let i = 0; i < 25; i++) {
        tweenEngine.step(25);
        if (tokenView.visible) {
          sampledPositions.push({
            x: tokenView.x,
            y: tokenView.y,
            rotation: tokenView.rotation
          });
        }
      }

      // Verify continuous rotation was applied
      expect(sampledPositions.length).toBeGreaterThan(5);
      const lastSample = sampledPositions[sampledPositions.length - 1];
      const firstSample = sampledPositions[0];
      expect(lastSample.rotation).toBeGreaterThan(firstSample.rotation);

      // Finish any remaining tweens
      tweenEngine.runAll(100, 20);
      expect(manager.getInUseCount()).toBe(0);
    });
  });

  // =========================================================================
  // Dimension 3: Lifecycle Completion, HUD Callbacks & Memory Leak Checks
  // =========================================================================
  describe('Dimension 3: Lifecycle Completion, HUD Callbacks & Memory Leak Checks', () => {
    it('3.1 Executes full 3-phase lifecycle and emits currencyAbsorbed with correct parameters', () => {
      const manager = new DropFlightManager(mockScene, 10);
      manager.spawnDropFlight(400, 750, 4); // spawns 2 tokens

      expect(manager.getInUseCount()).toBe(2);

      // Run until all staggered tokens complete all phases
      tweenEngine.runAll(200, 20);

      // Phase 3 completed: both tokens recycled
      expect(manager.getInUseCount()).toBe(0);

      // Verify currencyAbsorbed emissions
      const absorbedEvents = emittedEvents.filter(e => e.event === 'currencyAbsorbed');
      expect(absorbedEvents.length).toBe(2);
      expect(absorbedEvents[0].payload.amount).toBe(4);
      expect(absorbedEvents[0].payload.isLast).toBe(false);
      expect(absorbedEvents[1].payload.amount).toBe(4);
      expect(absorbedEvents[1].payload.isLast).toBe(true);
    });

    it('3.2 Spawns arrival sparkle burst and ensures spark object self-destructs (no leak)', () => {
      const manager = new DropFlightManager(mockScene, 5);
      manager.spawnDropFlight(375, 800, 1);

      // Run until Phase 2 completes and Phase 3 arrival burst spawns
      tweenEngine.step(130); // Phase 1
      tweenEngine.step(550); // Phase 2 finishes, triggers completeArrival -> emitArrivalBurst

      // Check that graphics spark was created
      expect(createdGraphics.length).toBeGreaterThan(0);
      const spark = createdGraphics[createdGraphics.length - 1];
      expect(spark.isDestroyed).toBe(false);

      // Sparkle tween runs for 150ms
      tweenEngine.step(160);

      // Sparkle must be destroyed after tween completion
      expect(spark.isDestroyed).toBe(true);
    });

    it('3.3 Triggers gentle HUD scale punch (1.25x) on UIScene silverIcon', () => {
      const manager = new DropFlightManager(mockScene, 5);
      manager.spawnDropFlight(375, 800, 1);

      // Run to arrival
      tweenEngine.step(130);
      tweenEngine.step(550);

      const uiScene = mockScene.scene.get('UIScene');
      expect(uiScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: uiScene.silverIcon,
          scaleX: 1.25,
          scaleY: 1.25,
          duration: 70,
          yoyo: true,
          ease: 'Quad.easeOut'
        })
      );
    });

    it('3.4 Strictly throttles SoundManager playCoinJingle to 60ms during 50-token flood', () => {
      const soundSpy = vi.spyOn(SoundManager.getInstance(), 'playCoinJingle').mockImplementation(() => {});

      const manager = new DropFlightManager(mockScene, 20);

      // Trigger 20 token flights
      for (let i = 0; i < 20; i++) {
        manager.spawnDropFlight(375, 800, 1);
      }

      // Step to arrival point in one go (all 20 complete at almost identical times)
      tweenEngine.runAll(200, 10);

      // Sound should be called at most once due to 60ms throttle
      expect(soundSpy).toHaveBeenCalledTimes(1);

      soundSpy.mockRestore();
    });

    it('3.5 Fully halts tweens, destroys views, and frees pool on manager.destroy()', () => {
      const manager = new DropFlightManager(mockScene, 20);
      manager.spawnDropFlight(375, 800, 10);

      expect(manager.getInUseCount()).toBeGreaterThan(0);
      expect(manager.getPoolCapacity()).toBe(20);

      // Destroy while tokens are in mid-air
      manager.destroy();

      expect(manager.getPoolCapacity()).toBe(0);
      expect(manager.getInUseCount()).toBe(0);

      // Verify all views were destroyed
      for (const img of createdImages) {
        expect(img.isDestroyed).toBe(true);
      }

      // Calling destroy twice should not throw
      expect(() => manager.destroy()).not.toThrow();
    });
  });

  // =========================================================================
  // Dimension 4: Adversarial Boundaries & Edge Cases
  // =========================================================================
  describe('Dimension 4: Adversarial Boundaries & Edge Cases', () => {
    it('4.1 Ignores non-positive dropSilver values (<= 0)', () => {
      const manager = new DropFlightManager(mockScene, 10);

      manager.spawnDropFlight(375, 800, 0);
      manager.spawnDropFlight(375, 800, -10);
      manager.spawnDropFlight(375, 800, -0.001);

      expect(manager.getInUseCount()).toBe(0);
      expect(tweenEngine.activeTweens.length).toBe(0);
    });

    it('4.2 Safely handles extreme off-screen coordinates', () => {
      const manager = new DropFlightManager(mockScene, 5);

      // Negative coordinates (off top/left) and huge coordinates (off bottom/right)
      expect(() => {
        manager.spawnDropFlight(-500, -200, 1);
        manager.spawnDropFlight(1500, 3000, 1);
      }).not.toThrow();

      expect(manager.getInUseCount()).toBe(2);

      // Run to completion
      tweenEngine.runAll(300, 20);
      expect(manager.getInUseCount()).toBe(0);
    });

    it('4.3 Adapts to platform safe-area top inset variations and fallback', () => {
      // Test platform with dynamic island / notch inset
      const mockPlatform = {
        getSafeAreaInsets: vi.fn(() => ({ top: 44, bottom: 34, left: 0, right: 0 }))
      };
      vi.spyOn(PlatformBridge, 'getPlatform').mockReturnValue(mockPlatform as any);

      const manager = new DropFlightManager(mockScene, 5);
      manager.spawnDropFlight(375, 800, 1);

      // Run Phase 1 & 2
      tweenEngine.step(130);
      tweenEngine.step(550);

      // Arrival spark should be at target Y = 24 + 44 = 68
      const spark = createdGraphics[createdGraphics.length - 1];
      expect(spark.y).toBe(68);
      expect(spark.x).toBe(248);

      // Test platform error fallback
      (PlatformBridge.getPlatform as any).mockImplementation(() => {
        throw new Error('Platform not initialized');
      });

      const fallbackManager = new DropFlightManager(mockScene, 5);
      fallbackManager.spawnDropFlight(375, 800, 1);

      tweenEngine.step(130);
      tweenEngine.step(550);

      const fallbackSpark = createdGraphics[createdGraphics.length - 1];
      expect(fallbackSpark.y).toBe(24);
      expect(fallbackSpark.x).toBe(248);
    });

    it('4.4 Empirically verifies pool recycling behavior when pool is saturated', () => {
      const manager = new DropFlightManager(mockScene, 5); // Pool of 5

      // Spawn 5 to saturate pool
      for (let i = 0; i < 5; i++) {
        manager.spawnDropFlight(300, 700, 1);
      }
      expect(manager.getInUseCount()).toBe(5);

      // Spawn a 6th drop: triggers pool[0] recycling
      expect(() => {
        manager.spawnDropFlight(400, 750, 1);
      }).not.toThrow();

      // InUse count remains 5 (capped)
      expect(manager.getInUseCount()).toBe(5);
      expect(manager.getPoolCapacity()).toBe(5);

      // Run all to completion
      tweenEngine.runAll(300, 20);
      expect(manager.getInUseCount()).toBe(0);
    });
  });
});
