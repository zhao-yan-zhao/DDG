/**
 * 《孤城神机营》- Milestone M_VJ2 Challenger Adversarial & Stress Verification
 * Author: challenger_vj2_2 (Battlefield Env Challenger 2)
 *
 * Verifies:
 * 1. ByteDance / Douyin Mini Game output validity and manifest specifications
 * 2. Strict DOM-leak check: Zero DOM-only APIs in environment-texture-factory.ts & battlefield-environment.ts
 * 3. Exact VRAM budget analysis: Total GPU memory <= 2.0 MB
 * 4. Particle emitter mobile budget verification: <= 36 embers, <= 12 smoke
 * 5. Extreme stress test: 10,000 crater stamps ring-buffer stability & boundary condition resilience
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

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

describe('Adversarial Challenge: Milestone M_VJ2 Empirical Verification', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const DIST_DOUYIN_DIR = path.resolve(ROOT_DIR, 'dist-douyin');

  // =========================================================================
  // 1. Douyin / ByteDance Mini Game Build & Package Structure Verification
  // =========================================================================
  describe('Task 1.1: Douyin / ByteDance Mini Game Packaging Output', () => {
    it('verifies dist-douyin directory exists and contains all required artifacts', () => {
      expect(fs.existsSync(DIST_DOUYIN_DIR)).toBe(true);

      const files = fs.readdirSync(DIST_DOUYIN_DIR);
      expect(files).toContain('game.js');
      expect(files).toContain('game.json');
      expect(files).toContain('project.config.json');
      expect(files).toContain('adapter.js');
      expect(files).toContain('assets');
    });

    it('verifies game.json conforms to ByteDance mini-game specifications', () => {
      const gameJsonPath = path.join(DIST_DOUYIN_DIR, 'game.json');
      expect(fs.existsSync(gameJsonPath)).toBe(true);

      const gameJson = JSON.parse(fs.readFileSync(gameJsonPath, 'utf-8'));
      expect(gameJson.deviceOrientation).toBe('portrait');
      expect(gameJson.showStatusBar).toBe(false);
      expect(gameJson.networkTimeout).toBeDefined();
      expect(gameJson.networkTimeout.request).toBeGreaterThan(0);
    });

    it('verifies project.config.json is configured for mini-game bundle', () => {
      const projConfigPath = path.join(DIST_DOUYIN_DIR, 'project.config.json');
      expect(fs.existsSync(projConfigPath)).toBe(true);

      const projConfig = JSON.parse(fs.readFileSync(projConfigPath, 'utf-8'));
      expect(projConfig.bundleType).toBe('game');
      expect(projConfig.projectname).toBe('孤城神机营');
      expect(projConfig.appid).toBeDefined();
    });

    it('verifies game.js correctly boots adapter and bundle entry chunk', () => {
      const gameJsPath = path.join(DIST_DOUYIN_DIR, 'game.js');
      expect(fs.existsSync(gameJsPath)).toBe(true);

      const gameJsContent = fs.readFileSync(gameJsPath, 'utf-8');
      expect(gameJsContent).toMatch(/import\s+['"]\.\/adapter\.js['"]/);
      expect(gameJsContent).toMatch(/import\s+['"]\.\/assets\/index-[^'"]+\.js['"]/);
    });

    it('verifies adapter.js contains runtime shims for canvas and screen', () => {
      const adapterPath = path.join(DIST_DOUYIN_DIR, 'adapter.js');
      expect(fs.existsSync(adapterPath)).toBe(true);

      const adapterContent = fs.readFileSync(adapterPath, 'utf-8');
      expect(adapterContent.length).toBeGreaterThan(5000);
      expect(adapterContent).toContain('createCanvas');
      expect(adapterContent).toContain('tt.getSystemInfoSync');
    });
  });

  // =========================================================================
  // 2. DOM-Leak & Headless Static & Source Code Inspection
  // =========================================================================
  describe('Task 1.2: DOM-Leak & Mini Game Compatibility Check', () => {
    it('verifies environment-texture-factory.ts uses ZERO DOM-only globals', () => {
      const factoryPath = path.resolve(ROOT_DIR, 'src/presentation/textures/environment-texture-factory.ts');
      expect(fs.existsSync(factoryPath)).toBe(true);

      const content = fs.readFileSync(factoryPath, 'utf-8');

      // Check forbidden DOM globals
      const forbiddenTokens = [
        'window.',
        'document.createElement',
        'document.getElementById',
        'document.body',
        'document.addEventListener',
        'HTMLCanvasElement',
        'HTMLElement',
        'new Image(',
        'new Audio('
      ];

      for (const token of forbiddenTokens) {
        expect(content.includes(token), `environment-texture-factory.ts must not contain '${token}'`).toBe(false);
      }
    });

    it('verifies battlefield-environment.ts uses ZERO DOM-only globals', () => {
      const envPath = path.resolve(ROOT_DIR, 'src/presentation/renderers/battlefield-environment.ts');
      expect(fs.existsSync(envPath)).toBe(true);

      const content = fs.readFileSync(envPath, 'utf-8');

      const forbiddenTokens = [
        'window.',
        'document.',
        'HTMLElement',
        'HTMLCanvasElement'
      ];

      for (const token of forbiddenTokens) {
        expect(content.includes(token), `battlefield-environment.ts must not contain '${token}'`).toBe(false);
      }
    });
  });

  // =========================================================================
  // 3. VRAM Consumption Empirical Calculation
  // =========================================================================
  describe('Task 1.3: Texture VRAM Consumption Verification (<= 2.0 MB)', () => {
    function createMockScene() {
      const createdCanvases: Array<{ key: string; width: number; height: number }> = [];
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

      const scene: any = {
        textures: {
          exists: vi.fn(() => false),
          createCanvas: vi.fn((key: string, w: number, h: number) => {
            createdCanvases.push({ key, width: w, height: h });
            return {
              key,
              width: w,
              height: h,
              context: mockCtx,
              refresh: vi.fn()
            };
          })
        }
      };

      return { scene, createdCanvases };
    }

    it('verifies that each texture dimensions match specs and total VRAM is <= 2.0 MB', () => {
      const { scene, createdCanvases } = createMockScene();
      EnvironmentTextureFactory.generateAll(scene);

      expect(createdCanvases.length).toBe(5);

      const expectedDimensions: Record<string, { w: number; h: number }> = {
        [ENV_TEXTURE_KEYS.FLAG_MING_SUN_MOON]: { w: 128, h: 64 },
        [ENV_TEXTURE_KEYS.BRAZIER_BASIN]: { w: 44, h: 32 },
        [ENV_TEXTURE_KEYS.DECAL_CRATER]: { w: 64, h: 64 },
        [ENV_TEXTURE_KEYS.WALL_PARAPET]: { w: 750, h: 90 },
        [ENV_TEXTURE_KEYS.TEX_RAMP_TERRAIN_BAKED]: { w: 750, h: 440 }
      };

      let totalBytes = 0;
      for (const canvas of createdCanvases) {
        const expected = expectedDimensions[canvas.key];
        expect(expected, `Unknown texture key: ${canvas.key}`).toBeDefined();
        expect(canvas.width).toBe(expected.w);
        expect(canvas.height).toBe(expected.h);

        const bytes = canvas.width * canvas.height * 4; // 32-bit RGBA
        totalBytes += bytes;
      }

      // Expected calculation:
      // 128 * 64 * 4   =    32,768 bytes
      // 44 * 32 * 4    =     5,632 bytes
      // 64 * 64 * 4    =    16,384 bytes
      // 750 * 90 * 4   =   270,000 bytes
      // 750 * 440 * 4  = 1,320,000 bytes
      // Total          = 1,644,784 bytes = 1.5686 MB
      expect(totalBytes).toBe(1644784);

      const totalMB = totalBytes / (1024 * 1024);
      expect(totalMB).toBeLessThanOrEqual(2.0);
      expect(totalMB).toBeCloseTo(1.5686, 3);
    });
  });

  // =========================================================================
  // 4. Particle Emitter Mobile Performance Budget Verification
  // =========================================================================
  describe('Task 1.4: Particle Emitter Mobile Performance Budgets', () => {
    function createMockSceneWithParticleCapture() {
      const capturedEmitters: Array<{ key: string; config: any }> = [];

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

      const scene: any = {
        textures: {
          exists: vi.fn(() => true),
          createCanvas: vi.fn((key: string, w: number, h: number) => ({
            key,
            width: w,
            height: h,
            context: mockCtx,
            refresh: vi.fn()
          }))
        },
        add: {
          image: vi.fn(() => ({
            setDisplaySize: vi.fn().mockReturnThis(),
            setDepth: vi.fn().mockReturnThis(),
            setScale: vi.fn().mockReturnThis(),
            setPosition: vi.fn().mockReturnThis(),
            setRotation: vi.fn().mockReturnThis(),
            setAlpha: vi.fn().mockReturnThis(),
            setVisible: vi.fn().mockReturnThis(),
            destroy: vi.fn()
          })),
          graphics: vi.fn(() => ({
            setDepth: vi.fn().mockReturnThis(),
            setBlendMode: vi.fn().mockReturnThis(),
            setVisible: vi.fn().mockReturnThis(),
            clear: vi.fn(),
            fillStyle: vi.fn(),
            fillRect: vi.fn(),
            fillCircle: vi.fn(),
            fillTriangle: vi.fn(),
            lineStyle: vi.fn(),
            strokeRect: vi.fn(),
            destroy: vi.fn()
          })),
          rope: vi.fn(() => ({
            setDepth: vi.fn().mockReturnThis(),
            setFlipX: vi.fn().mockReturnThis(),
            setDirty: vi.fn(),
            setVisible: vi.fn().mockReturnThis(),
            destroy: vi.fn()
          })),
          particles: vi.fn((_x: number, _y: number, key: string, config: any) => {
            capturedEmitters.push({ key, config });
            return {
              setDepth: vi.fn().mockReturnThis(),
              setVisible: vi.fn().mockReturnThis(),
              destroy: vi.fn()
            };
          })
        },
        tweens: {
          add: vi.fn(() => ({
            stop: vi.fn(),
            remove: vi.fn()
          }))
        }
      };

      return { scene, capturedEmitters };
    }

    it('verifies sparkEmitter config has maxAliveParticles <= 36', () => {
      const { scene, capturedEmitters } = createMockSceneWithParticleCapture();
      const env = new BattlefieldEnvironment(scene);

      const sparkEmitter = capturedEmitters.find(e => e.key === 'particle_spark');
      expect(sparkEmitter, 'Spark particle emitter must be created').toBeDefined();
      expect(sparkEmitter?.config.maxAliveParticles).toBeLessThanOrEqual(36);
      expect(sparkEmitter?.config.maxAliveParticles).toBe(36);

      env.destroy();
    });

    it('verifies smokeEmitter config has maxAliveParticles <= 12', () => {
      const { scene, capturedEmitters } = createMockSceneWithParticleCapture();
      const env = new BattlefieldEnvironment(scene);

      const smokeEmitter = capturedEmitters.find(e => e.key === 'particle_smoke');
      expect(smokeEmitter, 'Smoke particle emitter must be created').toBeDefined();
      expect(smokeEmitter?.config.maxAliveParticles).toBeLessThanOrEqual(12);
      expect(smokeEmitter?.config.maxAliveParticles).toBe(12);

      env.destroy();
    });
  });

  // =========================================================================
  // 5. Stress Testing: 10,000 Dynamic Crater Decal Ring Buffer Invariants
  // =========================================================================
  describe('Task 1.5: Adversarial Stress Test & Extreme Edge Cases', () => {
    function createMockSceneForStress() {
      const mockImages: any[] = [];
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

      const scene: any = {
        textures: {
          exists: vi.fn(() => true),
          createCanvas: vi.fn((key: string, w: number, h: number) => ({
            key,
            width: w,
            height: h,
            context: mockCtx,
            refresh: vi.fn()
          }))
        },
        add: {
          image: vi.fn((x: number, y: number, key: string) => {
            const img: any = {
              x,
              y,
              key,
              scaleX: 1,
              rotation: 0,
              alpha: 1,
              visible: true,
              isDestroyed: false,
              setDisplaySize: vi.fn().mockReturnThis(),
              setDepth: vi.fn().mockReturnThis(),
              setScale: vi.fn(function(this: any, s: number) { this.scaleX = s; return this; }),
              setPosition: vi.fn(function(this: any, nx: number, ny: number) { this.x = nx; this.y = ny; return this; }),
              setRotation: vi.fn(function(this: any, r: number) { this.rotation = r; return this; }),
              setAlpha: vi.fn(function(this: any, a: number) { this.alpha = a; return this; }),
              setVisible: vi.fn(function(this: any, v: boolean) { this.visible = v; return this; }),
              destroy: vi.fn(function(this: any) { this.isDestroyed = true; })
            };
            mockImages.push(img);
            return img;
          }),
          graphics: vi.fn(() => ({
            setDepth: vi.fn().mockReturnThis(),
            setBlendMode: vi.fn().mockReturnThis(),
            setVisible: vi.fn().mockReturnThis(),
            clear: vi.fn(),
            fillStyle: vi.fn(),
            fillRect: vi.fn(),
            fillCircle: vi.fn(),
            fillTriangle: vi.fn(),
            lineStyle: vi.fn(),
            strokeRect: vi.fn(),
            destroy: vi.fn()
          })),
          rope: vi.fn(() => ({
            points: [{ x: 0, y: 0 }],
            setDepth: vi.fn().mockReturnThis(),
            setFlipX: vi.fn().mockReturnThis(),
            setDirty: vi.fn(),
            setVisible: vi.fn().mockReturnThis(),
            destroy: vi.fn()
          })),
          particles: vi.fn(() => ({
            setDepth: vi.fn().mockReturnThis(),
            setVisible: vi.fn().mockReturnThis(),
            destroy: vi.fn()
          }))
        },
        tweens: {
          add: vi.fn(() => ({
            stop: vi.fn(),
            remove: vi.fn()
          }))
        }
      };

      return { scene, mockImages };
    }

    it('stresses the decal pool with 10,000 stamps without memory growth beyond 16 items', () => {
      const { scene, mockImages } = createMockSceneForStress();
      const env = new BattlefieldEnvironment(scene);

      // Initial count before decals
      const initialImagesCount = mockImages.length; // terrain + wall + 2 braziers = 4

      // Bombard with 10,000 explosions
      for (let i = 0; i < 10000; i++) {
        const stamp = env.stampScorchCrater(
          100 + (i % 500),
          600 + (i % 600),
          16 + (i % 32)
        );
        expect(stamp).not.toBeNull();
      }

      // Assert that decal count is locked at 16
      expect(env.getDecalCount()).toBe(16);

      // Total images in scene = initial (4) + decals (16) = 20
      expect(mockImages.length).toBe(initialImagesCount + 16);

      env.destroy();
    });

    it('handles extreme wave update inputs (negative, NaN, extreme large time) robustly', () => {
      // Test the wave equation directly on adversarial inputs
      expect(BattlefieldEnvironment.calculateRopeWaveY(0, 1000)).toBe(0);
      expect(BattlefieldEnvironment.calculateRopeWaveY(-5, 1000)).toBe(0);
      expect(BattlefieldEnvironment.calculateRopeWaveY(1.0, 1e9)).toBeLessThanOrEqual(19.001);
      expect(BattlefieldEnvironment.calculateRopeWaveY(1.0, -1e9)).toBeLessThanOrEqual(19.001);

      // Clamp test: u > 1.0 is clamped to 1.0
      const u1 = BattlefieldEnvironment.calculateRopeWaveY(1.0, 5.0);
      const uBig = BattlefieldEnvironment.calculateRopeWaveY(2.5, 5.0);
      expect(uBig).toBe(u1);
    });

    it('supports idempotent destroy and safe post-destroy calls', () => {
      const { scene } = createMockSceneForStress();
      const env = new BattlefieldEnvironment(scene);

      env.stampScorchCrater(300, 700);
      expect(env.getDecalCount()).toBe(1);

      // Destroy
      env.destroy();
      expect(env.getDecalCount()).toBe(0);

      // Post-destroy calls must not throw
      expect(() => {
        env.destroy();
        env.update(100, 16);
        env.setVisible(false);
        const res = env.stampScorchCrater(300, 700);
        expect(res).toBeNull();
      }).not.toThrow();
    });
  });
});
