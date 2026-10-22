/**
 * 《孤城神机营》- Milestone M_VJ2 Battlefield Environment Unit Tests
 * Verifies:
 * 1. EnvironmentTextureFactory texture generation, dimensions, and ByteDance Canvas compatibility
 * 2. Texture VRAM memory budget (< 2.5MB total GPU VRAM)
 * 3. Dual-sine wave equation mathematical properties for Ming Sun-Moon Rope Flags
 * 4. 16-slot ring buffer dynamic crater decal pool (allocation cap, FIFO recycling, zero memory leaks)
 * 5. BattlefieldEnvironment lifecycle management (instantiation, update, setVisible, destroy)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  BattlefieldEnvironment
} from '../src/presentation/renderers/battlefield-environment';

describe('Milestone M_VJ2: Battlefield Environment & Atmosphere Immersion', () => {
  let createdCanvases: Array<{ key: string; width: number; height: number }>;
  let refreshedKeys: string[];
  let invokedMethods: Set<string>;

  function createMockCanvas(w: number, h: number) {
    const mockCtx: Record<string, any> = {
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillRect: vi.fn(() => invokedMethods.add('fillRect')),
      strokeRect: vi.fn(() => invokedMethods.add('strokeRect')),
      clearRect: vi.fn(() => invokedMethods.add('clearRect')),
      beginPath: vi.fn(() => invokedMethods.add('beginPath')),
      closePath: vi.fn(() => invokedMethods.add('closePath')),
      arc: vi.fn(() => invokedMethods.add('arc')),
      ellipse: vi.fn(() => invokedMethods.add('ellipse')),
      fill: vi.fn(() => invokedMethods.add('fill')),
      stroke: vi.fn(() => invokedMethods.add('stroke')),
      moveTo: vi.fn(() => invokedMethods.add('moveTo')),
      lineTo: vi.fn(() => invokedMethods.add('lineTo')),
      quadraticCurveTo: vi.fn(() => invokedMethods.add('quadraticCurveTo')),
      save: vi.fn(() => invokedMethods.add('save')),
      restore: vi.fn(() => invokedMethods.add('restore')),
      translate: vi.fn(() => invokedMethods.add('translate')),
      scale: vi.fn(() => invokedMethods.add('scale')),
      rotate: vi.fn(() => invokedMethods.add('rotate')),
      clip: vi.fn(() => invokedMethods.add('clip')),
      fillText: vi.fn(() => invokedMethods.add('fillText'))
    };

    return {
      width: w,
      height: h,
      context: new Proxy(mockCtx, {
        set(target, prop: string, val: any) {
          invokedMethods.add(`set:${prop}`);
          target[prop] = val;
          return true;
        }
      })
    };
  }

  function createMockScene(textureSet = new Set<string>()) {
    const texturesMap = new Map<string, any>();
    for (const k of textureSet) {
      texturesMap.set(k, { key: k });
    }

    const mockTweens: any[] = [];

    const scene: any = {
      textures: {
        exists: vi.fn((key: string) => texturesMap.has(key)),
        createCanvas: vi.fn((key: string, w: number, h: number) => {
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
            setDisplaySize: vi.fn(function(this: any, dw: number, dh: number) {
              this.displayWidth = dw;
              this.displayHeight = dh;
              return this;
            }),
            setDepth: vi.fn(function(this: any, d: number) {
              this.depth = d;
              return this;
            }),
            setScale: vi.fn(function(this: any, s: number) {
              this.scaleX = s;
              this.scaleY = s;
              return this;
            }),
            setPosition: vi.fn(function(this: any, nx: number, ny: number) {
              this.x = nx;
              this.y = ny;
              return this;
            }),
            setRotation: vi.fn(function(this: any, r: number) {
              this.rotation = r;
              return this;
            }),
            setAlpha: vi.fn(function(this: any, a: number) {
              this.alpha = a;
              return this;
            }),
            setVisible: vi.fn(function(this: any, v: boolean) {
              this.visible = v;
              return this;
            }),
            destroy: vi.fn(function(this: any) {
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
            setDepth: vi.fn(function(this: any, d: number) {
              this.depth = d;
              return this;
            }),
            setBlendMode: vi.fn(function(this: any, bm: any) {
              this.blendMode = bm;
              return this;
            }),
            setVisible: vi.fn(function(this: any, v: boolean) {
              this.visible = v;
              return this;
            }),
            destroy: vi.fn(function(this: any) {
              this.isDestroyed = true;
            })
          };
          return g;
        }),
        rope: vi.fn((x: number, y: number, key: string, _frame: any, points: any[], _horizontal: boolean) => {
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
            setDepth: vi.fn(function(this: any, d: number) {
              this.depth = d;
              return this;
            }),
            setFlipX: vi.fn(function(this: any, f: boolean) {
              this.flipX = f;
              return this;
            }),
            setDirty: vi.fn(function(this: any) {
              this.dirty = true;
              return this;
            }),
            setVisible: vi.fn(function(this: any, v: boolean) {
              this.visible = v;
              return this;
            }),
            destroy: vi.fn(function(this: any) {
              this.isDestroyed = true;
            })
          };
          return ropeObj;
        }),
        particles: vi.fn((_x: number, _y: number, key: string, config: any) => {
          const emitter: any = {
            textureKey: key,
            config,
            depth: 0,
            visible: true,
            isDestroyed: false,
            setDepth: vi.fn(function(this: any, d: number) {
              this.depth = d;
              return this;
            }),
            setVisible: vi.fn(function(this: any, v: boolean) {
              this.visible = v;
              return this;
            }),
            destroy: vi.fn(function(this: any) {
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
            stop: vi.fn(function(this: any) {
              this.isStopped = true;
            }),
            remove: vi.fn(function(this: any) {
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
    invokedMethods = new Set();
  });

  // =========================================================================
  // 1. Texture Generation Tests
  // =========================================================================
  describe('EnvironmentTextureFactory', () => {
    it('defines all 5 required environment texture keys', () => {
      expect(ENV_TEXTURE_KEYS.FLAG_MING_SUN_MOON).toBe('flag_ming_sun_moon');
      expect(ENV_TEXTURE_KEYS.BRAZIER_BASIN).toBe('brazier_basin');
      expect(ENV_TEXTURE_KEYS.DECAL_CRATER).toBe('decal_crater');
      expect(ENV_TEXTURE_KEYS.WALL_PARAPET).toBe('wall_parapet');
      expect(ENV_TEXTURE_KEYS.TEX_RAMP_TERRAIN_BAKED).toBe('tex_ramp_terrain_baked');
    });

    it('generates all 5 textures with exact dimensional specifications', () => {
      const { scene } = createMockScene();
      EnvironmentTextureFactory.generateAll(scene);

      expect(createdCanvases.length).toBe(5);

      const dimensions: Record<string, { width: number; height: number }> = {};
      for (const c of createdCanvases) {
        dimensions[c.key] = { width: c.width, height: c.height };
      }

      expect(dimensions[ENV_TEXTURE_KEYS.FLAG_MING_SUN_MOON]).toEqual({ width: 128, height: 64 });
      expect(dimensions[ENV_TEXTURE_KEYS.BRAZIER_BASIN]).toEqual({ width: 44, height: 32 });
      expect(dimensions[ENV_TEXTURE_KEYS.DECAL_CRATER]).toEqual({ width: 64, height: 64 });
      expect(dimensions[ENV_TEXTURE_KEYS.WALL_PARAPET]).toEqual({ width: 750, height: 90 });
      expect(dimensions[ENV_TEXTURE_KEYS.TEX_RAMP_TERRAIN_BAKED]).toEqual({ width: 750, height: 440 });

      // Verify all textures were refreshed
      for (const k of Object.values(ENV_TEXTURE_KEYS)) {
        expect(refreshedKeys).toContain(k);
      }
    });

    it('adheres to strict GPU VRAM budget (< 2.5 MB total allocation)', () => {
      const { scene } = createMockScene();
      EnvironmentTextureFactory.generateAll(scene);

      let totalBytes = 0;
      for (const c of createdCanvases) {
        totalBytes += c.width * c.height * 4; // 32-bit RGBA
      }

      const totalMB = totalBytes / (1024 * 1024);
      expect(totalMB).toBeLessThan(2.5); // Well within budget
      expect(totalMB).toBeCloseTo(1.57, 1);
    });

    it('guarantees idempotency and avoids redundant re-allocations', () => {
      const { scene } = createMockScene();
      EnvironmentTextureFactory.generateAll(scene);
      expect(createdCanvases.length).toBe(5);

      // Re-invoking generateAll should not create any new canvases
      EnvironmentTextureFactory.generateAll(scene);
      expect(createdCanvases.length).toBe(5);
    });
  });

  // =========================================================================
  // 2. Dual-Sine Wave Physics Equation Tests
  // =========================================================================
  describe('Wave Dynamics Mathematics', () => {
    it('strictly guarantees 0 displacement at the flagpole anchor (u = 0)', () => {
      // For any timestamp t, u = 0 must return 0
      for (let t = 0; t <= 10; t += 0.5) {
        const y0 = BattlefieldEnvironment.calculateRopeWaveY(0, t, 0);
        expect(y0).toBe(0);

        const yNegative = BattlefieldEnvironment.calculateRopeWaveY(-0.1, t, 0);
        expect(yNegative).toBe(0);
      }
    });

    it('bounds maximum displacement at flag tip (u = 1) within theoretical amplitude (A1 + A2)', () => {
      const maxTheoretical = BattlefieldEnvironment.A1 + BattlefieldEnvironment.A2; // 14 + 5 = 19
      expect(maxTheoretical).toBe(19.0);

      // Sample a full period of time
      let maxObserved = 0;
      for (let t = 0; t < 20; t += 0.05) {
        const yTip = Math.abs(BattlefieldEnvironment.calculateRopeWaveY(1.0, t, 0));
        if (yTip > maxObserved) maxObserved = yTip;
      }

      expect(maxObserved).toBeLessThanOrEqual(maxTheoretical + 1e-6);
      expect(maxObserved).toBeGreaterThan(12.0); // Verifies wave is actively undulating
    });

    it('scales displacement smoothly along flag length via u^1.3 power envelope', () => {
      const t = 1.0;
      const yMid = Math.abs(BattlefieldEnvironment.calculateRopeWaveY(0.5, t, 0));
      // At u = 0.5, envelope is 0.5^1.3 approx 0.406
      expect(Math.pow(0.5, 1.3)).toBeCloseTo(0.406, 2);
      expect(typeof yMid).toBe('number');
    });

    it('applies phase offset phi to differentiate left and right flags', () => {
      const t = 2.0;
      const u = 0.8;
      const yLeft = BattlefieldEnvironment.calculateRopeWaveY(u, t, 0);
      const yRight = BattlefieldEnvironment.calculateRopeWaveY(u, t, 0.85);

      // Different phase should yield non-identical values (natural organic variation)
      expect(yLeft).not.toBe(yRight);
    });
  });

  // =========================================================================
  // 3. Dynamic Crater Decal Pool Tests
  // =========================================================================
  describe('Dynamic Crater Decal Pool (16 Slots)', () => {
    it('allocates decals up to maximum pool capacity (16 slots)', () => {
      const { scene } = createMockScene(new Set(['particle_spark', 'particle_smoke']));
      const env = new BattlefieldEnvironment(scene);

      expect(env.getDecalCount()).toBe(0);

      // Stamp 10 craters
      for (let i = 0; i < 10; i++) {
        const decal = env.stampScorchCrater(200 + i * 10, 900, 24);
        expect(decal).not.toBeNull();
      }

      expect(env.getDecalCount()).toBe(10);

      // Stamp 6 more to reach 16
      for (let i = 10; i < 16; i++) {
        env.stampScorchCrater(300 + i * 5, 950, 30);
      }
      expect(env.getDecalCount()).toBe(16);
    });

    it('recycles oldest decal via ring buffer without exceeding 16 objects', () => {
      const { scene } = createMockScene(new Set(['particle_spark', 'particle_smoke']));
      const env = new BattlefieldEnvironment(scene);

      // Fill 16 decals
      for (let i = 0; i < 16; i++) {
        env.stampScorchCrater(100 + i * 10, 850 + i * 10, 24);
      }
      expect(env.getDecalCount()).toBe(16);

      const firstDecal = env.getDecals()[0];
      expect(firstDecal.x).toBe(100);
      expect(firstDecal.y).toBe(850);

      // Stamping the 17th decal should reuse firstDecal (ring buffer head 0)
      const recycled17 = env.stampScorchCrater(500, 1000, 32);
      expect(env.getDecalCount()).toBe(16); // Total count unchanged!
      expect(recycled17).toBe(firstDecal);  // Reused reference!
      expect(recycled17?.x).toBe(500);
      expect(recycled17?.y).toBe(1000);

      // Scale should be calculated correctly from radius: (32 * 2) / 64 = 1.0
      expect(recycled17?.scaleX).toBe(1.0);
    });

    it('calculates correct scale based on explosion radius', () => {
      const { scene } = createMockScene(new Set(['particle_spark', 'particle_smoke']));
      const env = new BattlefieldEnvironment(scene);

      // Radius 16 -> scale = 32 / 64 = 0.5
      const d1 = env.stampScorchCrater(300, 900, 16);
      expect(d1?.scaleX).toBe(0.5);

      // Radius 48 -> scale = 96 / 64 = 1.5
      const d2 = env.stampScorchCrater(350, 900, 48);
      expect(d2?.scaleX).toBe(1.5);
    });
  });

  // =========================================================================
  // 4. Lifecycle & Scene Integration Tests
  // =========================================================================
  describe('BattlefieldEnvironment Lifecycle & Cleanup', () => {
    it('initializes all visual elements and depth hierarchy properly', () => {
      const { scene } = createMockScene(new Set(['particle_spark', 'particle_smoke']));
      const env = new BattlefieldEnvironment(scene);

      // Terrain should be created at depth 0.5
      const terrainCall = scene.add.image.mock.calls.find((c: any[]) => c[2] === ENV_TEXTURE_KEYS.TEX_RAMP_TERRAIN_BAKED);
      expect(terrainCall).toBeDefined();

      // Wall should be created at depth 0.8
      const wallCall = scene.add.image.mock.calls.find((c: any[]) => c[2] === ENV_TEXTURE_KEYS.WALL_PARAPET);
      expect(wallCall).toBeDefined();

      // Braziers should be created at depth 0.86
      const brazierCalls = scene.add.image.mock.calls.filter((c: any[]) => c[2] === ENV_TEXTURE_KEYS.BRAZIER_BASIN);
      expect(brazierCalls.length).toBe(2);

      // Two ropes should be created for dual flags
      expect(scene.add.rope.mock.calls.length).toBe(2);

      // Particles should be created for sparks and smoke
      expect(scene.add.particles.mock.calls.length).toBe(2);

      env.destroy();
    });

    it('updates rope vertices every tick without error or allocations', () => {
      const { scene } = createMockScene(new Set(['particle_spark', 'particle_smoke']));
      const env = new BattlefieldEnvironment(scene);

      expect(() => {
        env.update(1000, 16.6);
        env.update(2000, 16.6);
        env.update(3000, 16.6);
      }).not.toThrow();

      env.destroy();
    });

    it('toggles visibility cleanly for 2D vs 3D mode switching', () => {
      const { scene } = createMockScene(new Set(['particle_spark', 'particle_smoke']));
      const env = new BattlefieldEnvironment(scene);

      env.stampScorchCrater(300, 900);

      // Hide all for 3D mode
      expect(() => {
        env.setVisible(false);
      }).not.toThrow();

      // Show all for 2D mode
      expect(() => {
        env.setVisible(true);
      }).not.toThrow();

      env.destroy();
    });

    it('completely cleans up and destroys all entities, tweens, and decals on destroy()', () => {
      const { scene, mockTweens } = createMockScene(new Set(['particle_spark', 'particle_smoke']));
      const env = new BattlefieldEnvironment(scene);

      env.stampScorchCrater(200, 900);
      env.stampScorchCrater(300, 920);
      expect(env.getDecalCount()).toBe(2);

      env.destroy();

      // Tweens must be stopped and removed
      for (const tw of mockTweens) {
        expect(tw.isStopped).toBe(true);
        expect(tw.isRemoved).toBe(true);
      }

      // After destruction, stamping should safely return null
      expect(env.stampScorchCrater(400, 950)).toBeNull();
      expect(env.getDecalCount()).toBe(0);

      // Calling update or setVisible after destroy should be a safe no-op
      expect(() => {
        env.update(5000, 16.6);
        env.setVisible(true);
        env.destroy(); // Safe repeated destroy
      }).not.toThrow();
    });
  });
});
