/**
 * 《孤城神机营》- Milestone M_VJ1 UI Adversarial Challenger Test Suite
 * Focus: ByteDance / Douyin Mini Game Canvas Compatibility, Texture Memory Budget & Packaging Integrity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { UITextureFactory } from '../src/presentation/textures/ui-texture-factory';
import { UI_TEXTURE_KEYS, NINESLICE_PRESETS } from '../src/presentation/ui/ui-theme';

describe('Adversarial Challenge: Douyin Mini-Game Canvas Compatibility & Memory Budget', () => {
  let createdCanvases: Array<{ key: string; width: number; height: number }>;
  let invokedContextMethods: Set<string>;
  let domAccessDetected: boolean;

  beforeEach(() => {
    createdCanvases = [];
    invokedContextMethods = new Set();
    domAccessDetected = false;
  });

  function createMockByteDanceCanvas(w: number, h: number) {
    // A strict ByteDance Mini Game offscreen Canvas mock:
    // It has NO DOM properties (no appendChild, no style, no parentNode, etc.)
    const mockCtx: Record<string, any> = {
      createRadialGradient: vi.fn((x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) => {
        invokedContextMethods.add('createRadialGradient');
        return {
          addColorStop: vi.fn(() => {
            invokedContextMethods.add('addColorStop');
          })
        };
      }),
      createLinearGradient: vi.fn((x0: number, y0: number, x1: number, y1: number) => {
        invokedContextMethods.add('createLinearGradient');
        return {
          addColorStop: vi.fn(() => {
            invokedContextMethods.add('addColorStop');
          })
        };
      }),
      fillRect: vi.fn(() => invokedContextMethods.add('fillRect')),
      strokeRect: vi.fn(() => invokedContextMethods.add('strokeRect')),
      clearRect: vi.fn(() => invokedContextMethods.add('clearRect')),
      beginPath: vi.fn(() => invokedContextMethods.add('beginPath')),
      closePath: vi.fn(() => invokedContextMethods.add('closePath')),
      arc: vi.fn(() => invokedContextMethods.add('arc')),
      fill: vi.fn(() => invokedContextMethods.add('fill')),
      stroke: vi.fn(() => invokedContextMethods.add('stroke')),
      moveTo: vi.fn(() => invokedContextMethods.add('moveTo')),
      lineTo: vi.fn(() => invokedContextMethods.add('lineTo')),
      quadraticCurveTo: vi.fn(() => invokedContextMethods.add('quadraticCurveTo')),
      save: vi.fn(() => invokedContextMethods.add('save')),
      restore: vi.fn(() => invokedContextMethods.add('restore')),
      translate: vi.fn(() => invokedContextMethods.add('translate')),
      scale: vi.fn(() => invokedContextMethods.add('scale')),
      rotate: vi.fn(() => invokedContextMethods.add('rotate')),
      clip: vi.fn(() => invokedContextMethods.add('clip')),
      fillText: vi.fn(() => invokedContextMethods.add('fillText'))
    };

    // Trap any DOM-like properties or method accesses on context
    const ctxProxy = new Proxy(mockCtx, {
      get(target, prop: string) {
        if (['ownerDocument', 'parentElement', 'parentNode', 'innerHTML'].includes(prop)) {
          domAccessDetected = true;
          throw new Error(`DOM property "${prop}" accessed on Canvas Context in ByteDance runtime!`);
        }
        return target[prop];
      },
      set(target, prop: string, value: any) {
        invokedContextMethods.add(`set:${prop}`);
        target[prop] = value;
        return true;
      }
    });

    return {
      width: w,
      height: h,
      getContext: vi.fn((type: string) => {
        if (type === '2d') return ctxProxy;
        return null;
      }),
      context: ctxProxy
    };
  }

  it('generates all procedural textures using strictly 2D Canvas methods compatible with ByteDance tt.createCanvas', () => {
    const textureRegistry = new Map<string, any>();
    const refreshedKeys: string[] = [];

    const mockScene = {
      textures: {
        exists: vi.fn((key: string) => textureRegistry.has(key)),
        createCanvas: vi.fn((key: string, w: number, h: number) => {
          createdCanvases.push({ key, width: w, height: h });
          const canvasObj = createMockByteDanceCanvas(w, h);
          const textureEntry = {
            key,
            width: w,
            height: h,
            context: canvasObj.context,
            refresh: vi.fn(() => {
              refreshedKeys.push(key);
            })
          };
          textureRegistry.set(key, textureEntry);
          return textureEntry;
        })
      }
    } as any;

    expect(() => {
      UITextureFactory.generateAll(mockScene);
    }).not.toThrow();

    expect(domAccessDetected).toBe(false);

    // Verify all expected keys are registered
    const allExpectedKeys = Object.values(UI_TEXTURE_KEYS);
    expect(allExpectedKeys.length).toBe(Object.values(UI_TEXTURE_KEYS).length);

    for (const expectedKey of allExpectedKeys) {
      expect(textureRegistry.has(expectedKey)).toBe(true);
      expect(refreshedKeys).toContain(expectedKey);
    }

    // Verify that standard 2D drawing methods were utilized
    expect(invokedContextMethods.has('fillRect')).toBe(true);
    expect(invokedContextMethods.has('strokeRect')).toBe(true);
    expect(invokedContextMethods.has('createRadialGradient')).toBe(true);
    expect(invokedContextMethods.has('createLinearGradient')).toBe(true);
    expect(invokedContextMethods.has('beginPath')).toBe(true);
    expect(invokedContextMethods.has('arc')).toBe(true);
    expect(invokedContextMethods.has('save')).toBe(true);
    expect(invokedContextMethods.has('restore')).toBe(true);
    expect(invokedContextMethods.has('fillText')).toBe(true);
  });

  it('strictly adheres to texture memory budget (< 5MB total GPU VRAM)', () => {
    const textureRegistry = new Map<string, any>();

    const mockScene = {
      textures: {
        exists: vi.fn((key: string) => textureRegistry.has(key)),
        createCanvas: vi.fn((key: string, w: number, h: number) => {
          createdCanvases.push({ key, width: w, height: h });
          const canvasObj = createMockByteDanceCanvas(w, h);
          const entry = {
            context: canvasObj.context,
            refresh: vi.fn()
          };
          textureRegistry.set(key, entry);
          return entry;
        })
      }
    } as any;

    UITextureFactory.generateAll(mockScene);

    let totalPixels = 0;
    let totalBytesVRAM = 0;

    for (const canvas of createdCanvases) {
      const pixels = canvas.width * canvas.height;
      const bytes = pixels * 4; // 32-bit RGBA = 4 bytes/pixel
      totalPixels += pixels;
      totalBytesVRAM += bytes;
    }

    const totalKiloBytes = totalBytesVRAM / 1024;
    const totalMegaBytes = totalBytesVRAM / (1024 * 1024);

    // Memory budget assertions
    expect(totalMegaBytes).toBeLessThan(5.0); // Strict requirement: under 5MB
    expect(totalMegaBytes).toBeLessThan(1.5); // In fact under 1.5MB (measured ~1.1MB)
    expect(totalKiloBytes).toBeCloseTo(1142.64, 0);

    // Assert each individual texture has reasonable dimensions
    for (const canvas of createdCanvases) {
      expect(canvas.width).toBeLessThanOrEqual(750);
      expect(canvas.height).toBeLessThanOrEqual(200);
      expect(canvas.width * canvas.height * 4).toBeLessThan(250 * 1024); // max single texture < 250KB
    }
  });

  it('guarantees complete idempotency on repeated scene boots / restarts', () => {
    const textureRegistry = new Map<string, any>();
    const totalExpectedKeys = Object.values(UI_TEXTURE_KEYS).length;

    const mockScene = {
      textures: {
        exists: vi.fn((key: string) => textureRegistry.has(key)),
        createCanvas: vi.fn((key: string, w: number, h: number) => {
          createdCanvases.push({ key, width: w, height: h });
          const canvasObj = createMockByteDanceCanvas(w, h);
          const entry = {
            context: canvasObj.context,
            refresh: vi.fn()
          };
          textureRegistry.set(key, entry);
          return entry;
        })
      }
    } as any;

    // First boot
    UITextureFactory.generateAll(mockScene);
    const canvasCountPass1 = createdCanvases.length;
    expect(canvasCountPass1).toBe(totalExpectedKeys);

    // Second boot (e.g. restart scene)
    UITextureFactory.generateAll(mockScene);
    expect(createdCanvases.length).toBe(totalExpectedKeys); // Zero extra allocations!

    // Third boot
    UITextureFactory.generateAll(mockScene);
    expect(createdCanvases.length).toBe(totalExpectedKeys);
  });
});

describe('Adversarial Challenge: ByteDance Mini-Game dist-douyin Output Verification', () => {
  const distDouyinDir = path.resolve(process.cwd(), 'dist-douyin');

  it('confirms dist-douyin exists with all required ByteDance runtime files', () => {
    expect(fs.existsSync(distDouyinDir)).toBe(true);

    const gameJsonPath = path.resolve(distDouyinDir, 'game.json');
    const projectConfigPath = path.resolve(distDouyinDir, 'project.config.json');
    const adapterPath = path.resolve(distDouyinDir, 'adapter.js');
    const gameJsPath = path.resolve(distDouyinDir, 'game.js');
    const assetsDir = path.resolve(distDouyinDir, 'assets');

    expect(fs.existsSync(gameJsonPath)).toBe(true);
    expect(fs.existsSync(projectConfigPath)).toBe(true);
    expect(fs.existsSync(adapterPath)).toBe(true);
    expect(fs.existsSync(gameJsPath)).toBe(true);
    expect(fs.existsSync(assetsDir)).toBe(true);
  });

  it('validates game.json compliance with ByteDance Mini-Game requirements', () => {
    const gameJson = JSON.parse(fs.readFileSync(path.resolve(distDouyinDir, 'game.json'), 'utf-8'));

    expect(gameJson.deviceOrientation).toBe('portrait');
    expect(gameJson.showStatusBar).toBe(false);
    expect(gameJson.networkTimeout).toBeDefined();
    expect(gameJson.networkTimeout.request).toBe(10000);
    expect(Array.isArray(gameJson.subpackages)).toBe(true);
  });

  it('validates project.config.json compliance with ByteDance Developer Tools', () => {
    const config = JSON.parse(fs.readFileSync(path.resolve(distDouyinDir, 'project.config.json'), 'utf-8'));

    expect(config.appid).toMatch(/^tt[a-f0-9]+$/);
    expect(config.projectname).toBe('孤城神机营');
    expect(config.bundleType).toBe('game');
    expect(config.setting.es6).toBe(true);
  });

  it('validates game.js bootstrap sequence and target asset bundle', () => {
    const gameJsContent = fs.readFileSync(path.resolve(distDouyinDir, 'game.js'), 'utf-8');

    // Adapter must be imported before game chunk
    const adapterIndex = gameJsContent.indexOf("import './adapter.js'");
    const assetIndex = gameJsContent.indexOf("import './assets/index-");

    expect(adapterIndex).toBeGreaterThanOrEqual(0);
    expect(assetIndex).toBeGreaterThan(adapterIndex);

    // Extract asset file and verify it exists and is non-empty
    const assetMatch = gameJsContent.match(/import\s+['"]\.\/assets\/(index-[^'"]+\.js)['"]/);
    expect(assetMatch).not.toBeNull();
    const assetFilename = assetMatch![1];

    const assetPath = path.resolve(distDouyinDir, 'assets', assetFilename);
    expect(fs.existsSync(assetPath)).toBe(true);

    const stat = fs.statSync(assetPath);
    expect(stat.size).toBeGreaterThan(500 * 1024); // Bundle should be substantial (>500KB)
  });
});
