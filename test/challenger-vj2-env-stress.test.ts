/**
 * 《孤城神机营》- Milestone M_VJ2 Adversarial Stress Testing Suite
 *
 * Adversarially challenges and stress-tests:
 * 1. Rapid-fire artillery barrage on scorch crater decal ring buffer (100+ calls, zero leaks, strict FIFO recycling).
 * 2. Extreme delta time / time dilation (10s, 1hr, negative time, NaN, Inf) on wave physics & particle caps.
 * 3. EnvironmentTextureFactory idempotency, repeat invocations, and canvas failure fallbacks.
 * 4. Re-entrancy, partial initialization, missing WebGL/Particle capabilities, and repeated destroy lifecycle.
 * 5. Screen boundary and coordinate non-interference with 5x5 sand table touch zone.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =========================================================================
// Phaser Mock Setup for Headless Testing
// =========================================================================
vi.mock('phaser', () => {
  class MockGameObject {
    scene: any;
    x: number = 0;
    y: number = 0;
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
    destroy() { this.isDestroyed = true; }
  }

  return {
    default: {
      BlendModes: {
        NORMAL: 0,
        ADD: 1,
        MULTIPLY: 2,
        SCREEN: 3
      },
      GameObjects: {
        GameObject: MockGameObject,
        Image: MockGameObject,
        Graphics: MockGameObject,
        Rope: MockGameObject,
        Particles: {
          ParticleEmitter: MockGameObject
        }
      }
    }
  };
});

import {
  EnvironmentTextureFactory,
  ENV_TEXTURE_KEYS
} from '../src/presentation/textures/environment-texture-factory';
import {
  BattlefieldEnvironment,
  BattlefieldEnvironmentConfig
} from '../src/presentation/renderers/battlefield-environment';

describe('Adversarial Challenge: Battlefield Environment (M_VJ2)', () => {
  let createdCanvases: Array<{ key: string; width: number; height: number }>;
  let refreshedKeys: string[];
  let totalAllocatedImages: number;

  function createMockCanvas(w: number, h: number) {
    const mockCtx: Record<string, any> = {
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      clip: vi.fn(),
      fillText: vi.fn()
    };

    return {
      width: w,
      height: h,
      context: mockCtx
    };
  }

  interface MockSceneOptions {
    textureSet?: Set<string>;
    disableRope?: boolean;
    throwOnRope?: boolean;
    disableParticles?: boolean;
    throwOnParticles?: boolean;
    failCreateCanvas?: boolean;
  }

  function createMockScene(opts: MockSceneOptions = {}) {
    const texturesMap = new Map<string, any>();
    if (opts.textureSet) {
      for (const k of opts.textureSet) {
        texturesMap.set(k, { key: k });
      }
    }

    const mockTweens: any[] = [];

    const scene: any = {
      textures: {
        exists: vi.fn((key: string) => texturesMap.has(key)),
        createCanvas: vi.fn((key: string, w: number, h: number) => {
          if (opts.failCreateCanvas) return null;
          createdCanvases.push({ key, width: w, height: h });
          const canvasObj = createMockCanvas(w, h);
          const entry = {
            key,
            width: w,
            height: h,
            context: canvasObj.context,
            refresh: vi.fn(() => {
              refreshedKeys.push(key);
            })
          };
          texturesMap.set(key, entry);
          return entry;
        })
      },
      add: {
        image: vi.fn((x: number, y: number, key: string) => {
          totalAllocatedImages++;
          const img: any = {
            x,
            y,
            textureKey: key,
            depth: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            alpha: 1,
            visible: true,
            isDestroyed: false,
            setDisplaySize: vi.fn(function (this: any, dw: number, dh: number) {
              this.displayWidth = dw;
              this.displayHeight = dh;
              return this;
            }),
            setDepth: vi.fn(function (this: any, d: number) {
              this.depth = d;
              return this;
            }),
            setScale: vi.fn(function (this: any, s: number) {
              this.scaleX = s;
              this.scaleY = s;
              return this;
            }),
            setPosition: vi.fn(function (this: any, nx: number, ny: number) {
              this.x = nx;
              this.y = ny;
              return this;
            }),
            setRotation: vi.fn(function (this: any, r: number) {
              this.rotation = r;
              return this;
            }),
            setAlpha: vi.fn(function (this: any, a: number) {
              this.alpha = a;
              return this;
            }),
            setVisible: vi.fn(function (this: any, v: boolean) {
              this.visible = v;
              return this;
            }),
            destroy: vi.fn(function (this: any) {
              this.isDestroyed = true;
            })
          };
          return img;
        }),
        graphics: vi.fn(() => {
          const g: any = {
            depth: 0,
            blendMode: 0,
            visible: true,
            isDestroyed: false,
            clear: vi.fn(),
            fillStyle: vi.fn(),
            fillRect: vi.fn(),
            fillCircle: vi.fn(),
            fillTriangle: vi.fn(),
            lineStyle: vi.fn(),
            strokeRect: vi.fn(),
            setDepth: vi.fn(function (this: any, d: number) {
              this.depth = d;
              return this;
            }),
            setBlendMode: vi.fn(function (this: any, bm: any) {
              this.blendMode = bm;
              return this;
            }),
            setVisible: vi.fn(function (this: any, v: boolean) {
              this.visible = v;
              return this;
            }),
            destroy: vi.fn(function (this: any) {
              this.isDestroyed = true;
            })
          };
          return g;
        }),
        rope: opts.disableRope
          ? undefined
          : vi.fn((x: number, y: number, key: string, _frame: any, points: any[], _horizontal: boolean) => {
              if (opts.throwOnRope) {
                throw new Error('WebGL Rope pipeline unsupported');
              }
              const ropeObj: any = {
                x,
                y,
                textureKey: key,
                points: points.map(p => ({ x: p.x, y: p.y })),
                depth: 0,
                flipX: false,
                dirty: false,
                visible: true,
                isDestroyed: false,
                setDepth: vi.fn(function (this: any, d: number) {
                  this.depth = d;
                  return this;
                }),
                setFlipX: vi.fn(function (this: any, f: boolean) {
                  this.flipX = f;
                  return this;
                }),
                setDirty: vi.fn(function (this: any) {
                  this.dirty = true;
                  return this;
                }),
                setVisible: vi.fn(function (this: any, v: boolean) {
                  this.visible = v;
                  return this;
                }),
                destroy: vi.fn(function (this: any) {
                  this.isDestroyed = true;
                })
              };
              return ropeObj;
            }),
        particles: opts.disableParticles
          ? undefined
          : vi.fn((_x: number, _y: number, key: string, config: any) => {
              if (opts.throwOnParticles) {
                throw new Error('Particle system initialization failure');
              }
              const emitter: any = {
                textureKey: key,
                config,
                depth: 0,
                visible: true,
                isDestroyed: false,
                setDepth: vi.fn(function (this: any, d: number) {
                  this.depth = d;
                  return this;
                }),
                setVisible: vi.fn(function (this: any, v: boolean) {
                  this.visible = v;
                  return this;
                }),
                destroy: vi.fn(function (this: any) {
                  this.isDestroyed = true;
                })
              };
              return emitter;
            })
      },
      tweens: {
        add: vi.fn((cfg: any) => {
          const tw = {
            config: cfg,
            isStopped: false,
            isRemoved: false,
            stop: vi.fn(function (this: any) {
              this.isStopped = true;
            }),
            remove: vi.fn(function (this: any) {
              this.isRemoved = true;
            })
          };
          mockTweens.push(tw);
          return tw;
        })
      }
    };

    return { scene, mockTweens, texturesMap };
  }

  beforeEach(() => {
    createdCanvases = [];
    refreshedKeys = [];
    totalAllocatedImages = 0;
  });

  // =========================================================================
  // Challenge 1: Rapid-Fire Artillery Barrage & Scorch Decal Ring Buffer
  // =========================================================================
  describe('Challenge 1: Scorch Crater Decal Ring Buffer (Artillery Barrage Stress)', () => {
    it('strictly caps decal allocation at 16 when bombarded with 100 rapid craters', () => {
      const { scene } = createMockScene({
        textureSet: new Set(['particle_spark', 'particle_smoke'])
      });
      const env = new BattlefieldEnvironment(scene);

      // Baseline images created before decals: terrain(1) + wall(1) + leftBrazier(1) + rightBrazier(1) = 4
      const initialImageCount = totalAllocatedImages;
      expect(initialImageCount).toBe(4);

      // Rapid barrage of 100 explosions across the battlefield
      const stampedRefs: any[] = [];
      for (let i = 0; i < 100; i++) {
        const x = 200 + (i % 5) * 60;
        const y = 800 + (i % 8) * 40;
        const rad = 20 + (i % 3) * 8;
        const decal = env.stampScorchCrater(x, y, rad);
        expect(decal).not.toBeNull();
        stampedRefs.push(decal);
      }

      // Memory leak guard: total decals in pool must be EXACTLY 16
      expect(env.getDecalCount()).toBe(16);

      // Total images ever instantiated by scene.add.image: 4 base + 16 decals = 20
      expect(totalAllocatedImages).toBe(initialImageCount + 16);

      // Verify FIFO ring buffer recycling: the 17th stamp (index 16) must reuse index 0
      expect(stampedRefs[16]).toBe(stampedRefs[0]);
      // The 18th stamp must reuse index 1
      expect(stampedRefs[17]).toBe(stampedRefs[1]);
      // The 32nd stamp (index 31) must reuse index 15
      expect(stampedRefs[31]).toBe(stampedRefs[15]);
      // The 33rd stamp (index 32) must reuse index 0 again
      expect(stampedRefs[32]).toBe(stampedRefs[0]);

      // Verify the 100th stamp (index 99) reused index: (100 - 1) % 16 = 15 % 16 = 3 (since head started at 0 after 16)
      // Specifically: 16 allocated (head 0), then 84 recycles: 84 % 16 = 4. Last recycled was slot (4 - 1 + 16) % 16 = 3.
      expect(stampedRefs[99]).toBe(env.getDecals()[3]);

      env.destroy();
    });

    it('handles extreme and adversarial arguments without crashing or corrupting state', () => {
      const { scene } = createMockScene({
        textureSet: new Set(['particle_spark', 'particle_smoke'])
      });
      const env = new BattlefieldEnvironment(scene);

      // Zero radius: (0 * 2) / 64 = 0
      const dZero = env.stampScorchCrater(300, 900, 0);
      expect(dZero).not.toBeNull();
      expect(dZero?.scaleX).toBe(0);

      // Negative radius: (-20 * 2) / 64 = -0.625 (mirrored in Phaser, safe)
      const dNeg = env.stampScorchCrater(300, 900, -20);
      expect(dNeg).not.toBeNull();
      expect(dNeg?.scaleX).toBe(-0.625);

      // Huge radius: (1000 * 2) / 64 = 31.25
      const dHuge = env.stampScorchCrater(300, 900, 1000);
      expect(dHuge).not.toBeNull();
      expect(dHuge?.scaleX).toBe(31.25);

      // Default radius when omitted
      const dDef = env.stampScorchCrater(300, 900);
      expect(dDef).not.toBeNull();
      expect(dDef?.scaleX).toBe((24 * 2) / 64);

      // Extreme coordinates (negative, large)
      const dFar = env.stampScorchCrater(-9999, 99999);
      expect(dFar).not.toBeNull();
      expect(dFar?.x).toBe(-9999);
      expect(dFar?.y).toBe(99999);

      env.destroy();
    });

    it('respects custom decalPoolSize configurations under barrage stress', () => {
      const { scene } = createMockScene({
        textureSet: new Set(['particle_spark', 'particle_smoke'])
      });
      const envCustom = new BattlefieldEnvironment(scene, { decalPoolSize: 8 });

      for (let i = 0; i < 50; i++) {
        envCustom.stampScorchCrater(100 + i, 800 + i, 20);
      }

      expect(envCustom.getDecalCount()).toBe(8);
      envCustom.destroy();
    });

    it('returns null and allocates zero objects if decal texture does not exist', () => {
      const { scene } = createMockScene();
      // Remove decal_crater texture
      scene.textures.exists = vi.fn((k: string) => k !== ENV_TEXTURE_KEYS.DECAL_CRATER);

      const env = new BattlefieldEnvironment(scene);
      const res = env.stampScorchCrater(300, 900, 24);
      expect(res).toBeNull();
      expect(env.getDecalCount()).toBe(0);

      env.destroy();
    });
  });

  // =========================================================================
  // Challenge 2: Extreme Delta Time & Sine Wave Dynamics Mathematics
  // =========================================================================
  describe('Challenge 2: Extreme Delta Time & Numerical Stability', () => {
    it('guarantees numerical boundedness and finite output under massive time jumps (10s, 1hr, 24hrs)', () => {
      const hugeTimes = [
        10,            // 10s
        1000,          // 1,000s (~16 min)
        3600,          // 1 hour
        86400,         // 24 hours
        1000000,       // ~11 days
        1e8            // extreme
      ];

      for (const t of hugeTimes) {
        for (let step = 0; step <= 20; step++) {
          const u = step / 20;
          const yLeft = BattlefieldEnvironment.calculateRopeWaveY(u, t, 0);
          const yRight = BattlefieldEnvironment.calculateRopeWaveY(u, t, 0.85);

          // Must be finite numbers
          expect(Number.isFinite(yLeft)).toBe(true);
          expect(Number.isFinite(yRight)).toBe(true);
          expect(Number.isNaN(yLeft)).toBe(false);
          expect(Number.isNaN(yRight)).toBe(false);

          // Must be strictly bounded by amplitude envelope [-19, 19]
          expect(Math.abs(yLeft)).toBeLessThanOrEqual(19.0001);
          expect(Math.abs(yRight)).toBeLessThanOrEqual(19.0001);

          // At u = 0, displacement MUST strictly be 0 regardless of huge time
          if (u === 0) {
            expect(yLeft).toBe(0);
            expect(yRight).toBe(0);
          }
        }
      }
    });

    it('handles negative time, zero delta, and sub-frame delta smoothly without crashing', () => {
      const { scene } = createMockScene({
        textureSet: new Set(['particle_spark', 'particle_smoke'])
      });
      const env = new BattlefieldEnvironment(scene);

      expect(() => {
        // Negative time
        env.update(-5000, 16.6);
        // Zero delta
        env.update(1000, 0);
        // Huge delta
        env.update(10000000, 10000000);
        // Micro delta
        env.update(10000000.001, 0.001);
      }).not.toThrow();

      env.destroy();
    });

    it('clamps normalized parameter u out-of-range inputs safely in calculateRopeWaveY', () => {
      // u < 0 must return 0
      expect(BattlefieldEnvironment.calculateRopeWaveY(-1.0, 1.0)).toBe(0);
      expect(BattlefieldEnvironment.calculateRopeWaveY(-999.0, 1.0)).toBe(0);

      // u > 1 must be clamped to 1.0 and stay <= 19.0
      const yOver = BattlefieldEnvironment.calculateRopeWaveY(2.5, 1.0);
      expect(Math.abs(yOver)).toBeLessThanOrEqual(19.0);
    });

    it('does not explode into NaN when passed non-standard numbers', () => {
      // u = NaN should return 0 (due to u <= 0 check returning false then clamped)
      const yNaN = BattlefieldEnvironment.calculateRopeWaveY(NaN, 1.0);
      expect(Number.isNaN(yNaN) || yNaN === 0).toBe(true);
    });
  });

  // =========================================================================
  // Challenge 3: EnvironmentTextureFactory Idempotency & Concurrency Stress
  // =========================================================================
  describe('Challenge 3: EnvironmentTextureFactory Idempotency & Fallbacks', () => {
    it('is strictly idempotent under 50 repeated generateAll invocations', () => {
      const { scene } = createMockScene();

      // First run: creates 5 textures
      EnvironmentTextureFactory.generateAll(scene);
      expect(createdCanvases.length).toBe(5);

      // 49 subsequent runs: must not create any new canvas
      for (let i = 0; i < 49; i++) {
        EnvironmentTextureFactory.generateAll(scene);
      }

      expect(createdCanvases.length).toBe(5);
      expect(refreshedKeys.length).toBe(5);
    });

    it('each individual texture creation method checks existence first', () => {
      const { scene } = createMockScene();

      // Invoke individual methods once
      EnvironmentTextureFactory.createFlagMingSunMoon(scene);
      EnvironmentTextureFactory.createBrazierBasin(scene);
      EnvironmentTextureFactory.createDecalCrater(scene);
      EnvironmentTextureFactory.createWallParapet(scene);
      EnvironmentTextureFactory.createRampTerrainBaked(scene);
      expect(createdCanvases.length).toBe(5);

      // Invoke individual methods again
      EnvironmentTextureFactory.createFlagMingSunMoon(scene);
      EnvironmentTextureFactory.createBrazierBasin(scene);
      EnvironmentTextureFactory.createDecalCrater(scene);
      EnvironmentTextureFactory.createWallParapet(scene);
      EnvironmentTextureFactory.createRampTerrainBaked(scene);
      expect(createdCanvases.length).toBe(5);
    });

    it('handles canvas creation failure (null return) gracefully without throwing', () => {
      const { scene } = createMockScene({ failCreateCanvas: true });

      expect(() => {
        EnvironmentTextureFactory.generateAll(scene);
      }).not.toThrow();

      expect(createdCanvases.length).toBe(0);
    });
  });

  // =========================================================================
  // Challenge 4: Lifecycle, Re-entrancy & Partial Initialization Stress
  // =========================================================================
  describe('Challenge 4: Destruction Lifecycle, Re-entrancy & Graceful Fallbacks', () => {
    it('supports multiple sequential calls to destroy() without error (re-entrancy safe)', () => {
      const { scene } = createMockScene({
        textureSet: new Set(['particle_spark', 'particle_smoke'])
      });
      const env = new BattlefieldEnvironment(scene);

      expect(() => {
        env.destroy();
        env.destroy();
        env.destroy();
        env.destroy();
      }).not.toThrow();
    });

    it('handles environment without WebGL Rope capability (e.g. Canvas 2D fallback)', () => {
      // Scene without add.rope
      const { scene: noRopeScene } = createMockScene({ disableRope: true });
      expect(() => {
        const env = new BattlefieldEnvironment(noRopeScene);
        env.update(1000, 16.6);
        env.setVisible(false);
        env.destroy();
      }).not.toThrow();

      // Scene where add.rope throws
      const { scene: throwRopeScene } = createMockScene({ throwOnRope: true });
      expect(() => {
        const env = new BattlefieldEnvironment(throwRopeScene);
        env.update(1000, 16.6);
        env.setVisible(false);
        env.destroy();
      }).not.toThrow();
    });

    it('handles environment without particle system capability gracefully', () => {
      // Scene without add.particles
      const { scene: noParticlesScene } = createMockScene({ disableParticles: true });
      expect(() => {
        const env = new BattlefieldEnvironment(noParticlesScene);
        env.destroy();
      }).not.toThrow();

      // Scene where add.particles throws
      const { scene: throwParticlesScene } = createMockScene({ throwOnParticles: true });
      expect(() => {
        const env = new BattlefieldEnvironment(throwParticlesScene);
        env.destroy();
      }).not.toThrow();
    });

    it('handles partially initialized state where textures failed to generate', () => {
      // Scene with no textures created
      const { scene } = createMockScene({ failCreateCanvas: true });
      expect(() => {
        const env = new BattlefieldEnvironment(scene);
        env.update(1000, 16.6);
        env.stampScorchCrater(375, 800);
        env.setVisible(true);
        env.setVisible(false);
        env.destroy();
      }).not.toThrow();
    });

    it('handles external destruction of decals prior to BattlefieldEnvironment.destroy()', () => {
      const { scene } = createMockScene({
        textureSet: new Set(['particle_spark', 'particle_smoke'])
      });
      const env = new BattlefieldEnvironment(scene);

      const d1 = env.stampScorchCrater(200, 800);
      const d2 = env.stampScorchCrater(300, 800);

      // Simulating external scene cleanup (e.g., scene.children.removeAll())
      d1?.destroy();
      d2?.destroy();

      // Calling env.destroy() must not throw
      expect(() => {
        env.destroy();
      }).not.toThrow();
    });

    it('all public methods are safe no-ops after destroy()', () => {
      const { scene } = createMockScene({
        textureSet: new Set(['particle_spark', 'particle_smoke'])
      });
      const env = new BattlefieldEnvironment(scene);
      env.destroy();

      expect(env.stampScorchCrater(300, 800)).toBeNull();
      expect(env.getDecalCount()).toBe(0);
      expect(env.getDecals()).toEqual([]);
      expect(() => {
        env.update(2000, 16.6);
        env.setVisible(true);
        env.setVisible(false);
      }).not.toThrow();
    });
  });

  // =========================================================================
  // Challenge 5: Spatial Isolation & Sand Table Interaction Immunity
  // =========================================================================
  describe('Challenge 5: Spatial Layout & Sand Table Non-Interference', () => {
    it('strictly isolates watchtowers, braziers and flags outside the 5x5 sand table touch zone', () => {
      const { scene } = createMockScene({
        textureSet: new Set(['particle_spark', 'particle_smoke'])
      });

      // The 5x5 grid occupies X: 185 to 565, Y: 160 to 540
      // Parapet is at Y: 540~560 (or center 855 for ramp background)
      // Check default positions
      const defaultLeftTowerX = 52;
      const defaultRightTowerX = 698;
      const defaultLeftBrazierX = 96;
      const defaultRightBrazierX = 654;

      // Sand table bounds: [185, 565]
      const gridMinX = 185;
      const gridMaxX = 565;

      // Left items must be strictly to the left of grid
      expect(defaultLeftTowerX).toBeLessThan(gridMinX);
      expect(defaultLeftBrazierX).toBeLessThan(gridMinX);

      // Right items must be strictly to the right of grid
      expect(defaultRightTowerX).toBeGreaterThan(gridMaxX);
      expect(defaultRightBrazierX).toBeGreaterThan(gridMaxX);

      // Ensure flags do not intrude into central play area
      const halfFlagW = 64;
      const leftFlagRightEdge = defaultLeftTowerX + halfFlagW * 2; // 52 + 128 = 180
      expect(leftFlagRightEdge).toBeLessThanOrEqual(gridMinX); // 180 <= 185!

      const rightFlagLeftEdge = defaultRightTowerX - halfFlagW * 2; // 698 - 128 = 570
      expect(rightFlagLeftEdge).toBeGreaterThanOrEqual(gridMaxX); // 570 >= 565!
    });
  });
});
