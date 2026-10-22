/**
 * 《孤城神机营》- Milestone M6 Empirical Challenger Test Suite
 * Adversarial stress-testing of Platform Bridge layer and ByteDance mini-game build packaging pipeline.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { IPlatform, SystemInfo, RewardedVideoAdResult } from '../src/platform/platform-interface';
import { WebPlatform } from '../src/platform/web-platform';
import { DouyinPlatform } from '../src/platform/douyin-platform';
import { PlatformBridge, getPlatform } from '../src/platform';
import { buildDouyin } from '../scripts/build-douyin.js';

describe('Adversarial Challenge: Environment Detection & Resilience', () => {
  beforeEach(() => {
    PlatformBridge.reset();
    delete (globalThis as any).tt;
  });

  afterEach(() => {
    PlatformBridge.reset();
    delete (globalThis as any).tt;
  });

  it('falls back to WebPlatform when tt is undefined', () => {
    const platform = PlatformBridge.getPlatform();
    expect(platform.type).toBe('web');
    expect(platform).toBeInstanceOf(WebPlatform);
    expect(platform.isByteDance()).toBe(false);
  });

  it('falls back to WebPlatform when tt is an empty object', () => {
    (globalThis as any).tt = {};
    const platform = PlatformBridge.getPlatform();
    expect(platform.type).toBe('web');
    expect(platform).toBeInstanceOf(WebPlatform);
  });

  it('falls back to WebPlatform when tt has non-function getSystemInfoSync (string, number, boolean)', () => {
    (globalThis as any).tt = { getSystemInfoSync: 'not-a-func' };
    expect(PlatformBridge.getPlatform().type).toBe('web');

    PlatformBridge.reset();
    (globalThis as any).tt = { getSystemInfoSync: 12345 };
    expect(PlatformBridge.getPlatform().type).toBe('web');

    PlatformBridge.reset();
    (globalThis as any).tt = { getSystemInfoSync: true };
    expect(PlatformBridge.getPlatform().type).toBe('web');
  });

  it('safely falls back to WebPlatform when globalThis.tt is explicitly null without throwing TypeError', () => {
    (globalThis as any).tt = null;
    let platform: any = null;
    expect(() => {
      platform = PlatformBridge.getPlatform();
    }).not.toThrow();

    expect(platform).toBeDefined();
    expect(platform.type).toBe('web');
    expect(platform).toBeInstanceOf(WebPlatform);
  });

  it('safely executes DouyinPlatform methods without throwing TypeError when tt is null', () => {
    (globalThis as any).tt = null;
    const platform = new DouyinPlatform();

    expect(() => {
      platform.vibrateShort('light');
    }).not.toThrow();

    expect(() => {
      const res = platform.getStorageSync('test');
      expect(res).toBeNull();
    }).not.toThrow();

    expect(() => {
      platform.setStorageSync('test', { foo: 'bar' });
    }).not.toThrow();

    expect(() => {
      platform.removeStorageSync('test');
    }).not.toThrow();

    expect(() => {
      platform.clearStorageSync();
    }).not.toThrow();
  });

  it('auto-detects DouyinPlatform when tt.getSystemInfoSync is a valid function', () => {
    (globalThis as any).tt = {
      getSystemInfoSync: () => ({ screenWidth: 750, screenHeight: 1334, pixelRatio: 2 })
    };
    const platform = PlatformBridge.getPlatform();
    expect(platform.type).toBe('douyin');
    expect(platform).toBeInstanceOf(DouyinPlatform);
    expect(platform.isByteDance()).toBe(true);
  });

  it('DouyinPlatform safely handles throwing tt.getSystemInfoSync and returns fallback metrics', () => {
    (globalThis as any).tt = {
      getSystemInfoSync: () => {
        throw new Error('Fatal device info failure in ByteDance runtime');
      }
    };

    const platform = new DouyinPlatform();
    let sysInfo: SystemInfo | null = null;
    expect(() => {
      sysInfo = platform.getSystemInfo();
    }).not.toThrow();

    expect(sysInfo).toBeDefined();
    expect(sysInfo!.screenWidth).toBe(750);
    expect(sysInfo!.screenHeight).toBe(1334);
    expect(sysInfo!.platform).toBe('devtools');
    expect(sysInfo!.brand).toBe('ByteDance');
  });

  it('DouyinPlatform safely handles null or empty return from tt.getSystemInfoSync', () => {
    (globalThis as any).tt = {
      getSystemInfoSync: () => ({})
    };

    const platform = new DouyinPlatform();
    const info = platform.getSystemInfo();
    expect(info.screenWidth).toBe(750);
    expect(info.screenHeight).toBe(1334);
    expect(info.pixelRatio).toBe(1);
  });

  it('WebPlatform safely extracts system metrics when window is undefined or partial', () => {
    const platform = new WebPlatform();
    const info = platform.getSystemInfo();
    expect(info.screenWidth).toBeGreaterThan(0);
    expect(info.screenHeight).toBeGreaterThan(0);
    expect(info.platform).toBe('web');
  });
});

describe('Adversarial Challenge: Storage Edge Cases & Data Corruption', () => {
  let webPlatform: WebPlatform;
  let douyinPlatform: DouyinPlatform;
  let mockTtStorage: Map<string, any>;

  beforeEach(() => {
    webPlatform = new WebPlatform();
    mockTtStorage = new Map();
    (globalThis as any).tt = {
      getStorageSync: vi.fn((k: string) => mockTtStorage.get(k) ?? null),
      setStorageSync: vi.fn((k: string, v: any) => mockTtStorage.set(k, v)),
      removeStorageSync: vi.fn((k: string) => mockTtStorage.delete(k)),
      clearStorageSync: vi.fn(() => mockTtStorage.clear())
    };
    douyinPlatform = new DouyinPlatform();
  });

  afterEach(() => {
    delete (globalThis as any).tt;
  });

  it('WebPlatform handles quota exceeded error by falling back to in-memory storage', () => {
    const originalSetItem = (globalThis as any).localStorage?.setItem;
    if (typeof (globalThis as any).localStorage !== 'undefined') {
      (globalThis as any).localStorage.setItem = vi.fn(() => {
        const err = new Error('The quota has been exceeded.');
        err.name = 'QuotaExceededError';
        throw err;
      });
    }

    expect(() => {
      webPlatform.setStorageSync('large_payload', { data: 'x'.repeat(1000) });
    }).not.toThrow();

    const retrieved = webPlatform.getStorageSync<{ data: string }>('large_payload');
    expect(retrieved).toBeDefined();
    expect(retrieved?.data).toBe('x'.repeat(1000));

    if (originalSetItem && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem = originalSetItem;
    }
  });

  it('WebPlatform safely handles corrupted JSON strings in storage without throwing', () => {
    webPlatform.setStorageSync('corrupted_key', '{ bad json, missing quotes:');
    let res: any;
    expect(() => {
      res = webPlatform.getStorageSync('corrupted_key');
    }).not.toThrow();
    expect(res).toBe('{ bad json, missing quotes:');
  });

  it('WebPlatform handles diverse non-string primitive and complex data types', () => {
    webPlatform.setStorageSync('num', 42);
    expect(webPlatform.getStorageSync('num')).toBe(42);

    webPlatform.setStorageSync('bool', true);
    expect(webPlatform.getStorageSync('bool')).toBe(true);

    webPlatform.setStorageSync('array', [1, 'two', { three: 3 }]);
    expect(webPlatform.getStorageSync('array')).toEqual([1, 'two', { three: 3 }]);

    webPlatform.setStorageSync('chinese_key_★', { weapon: '神机箭', stars: 4 });
    expect(webPlatform.getStorageSync('chinese_key_★')).toEqual({ weapon: '神机箭', stars: 4 });
  });

  it('empirically tests circular reference handling across platforms', () => {
    const circularObj: any = { tag: 'circular' };
    circularObj.self = circularObj;

    // DouyinPlatform wraps JSON.stringify in try/catch -> survives without crash
    expect(() => {
      douyinPlatform.setStorageSync('circ', circularObj);
    }).not.toThrow();

    // WebPlatform safely handles circular reference in try/catch -> survives without crash
    expect(() => {
      webPlatform.setStorageSync('circ', circularObj);
    }).not.toThrow();

    const retrieved = webPlatform.getStorageSync('circ');
    expect(retrieved).toBeDefined();
  });

  it('DouyinPlatform safely handles throwing tt.setStorageSync (storage quota exceeded / disk full)', () => {
    (globalThis as any).tt.setStorageSync = vi.fn(() => {
      throw new Error('Disk full: setStorageSync failed');
    });

    expect(() => {
      douyinPlatform.setStorageSync('save_slot_1', { wave: 10, hp: 100 });
    }).not.toThrow();
  });

  it('DouyinPlatform safely handles corrupted JSON string returned by tt.getStorageSync', () => {
    mockTtStorage.set('malformed_json', '{"unclosed_brace": true');
    let val: any;
    expect(() => {
      val = douyinPlatform.getStorageSync('malformed_json');
    }).not.toThrow();
    expect(val).toBe('{"unclosed_brace": true');
  });

  it('DouyinPlatform correctly converts empty string, null, and undefined from storage to null', () => {
    mockTtStorage.set('empty_val', '');
    expect(douyinPlatform.getStorageSync('empty_val')).toBeNull();

    mockTtStorage.set('null_val', null);
    expect(douyinPlatform.getStorageSync('null_val')).toBeNull();

    expect(douyinPlatform.getStorageSync('non_existent')).toBeNull();
  });

  it('DouyinPlatform handles raw number and object stored in tt runtime without re-parsing errors', () => {
    mockTtStorage.set('raw_num', 999);
    expect(douyinPlatform.getStorageSync('raw_num')).toBe(999);

    mockTtStorage.set('raw_obj', { direct: true });
    expect(douyinPlatform.getStorageSync('raw_obj')).toEqual({ direct: true });
  });
});

describe('Adversarial Challenge: Rewarded Video Ad Edge Cases & Race Conditions', () => {
  let closeListeners: Array<(res: { isEnded?: boolean }) => void>;
  let errorListeners: Array<(err: any) => void>;
  let mockAdShow: any;
  let mockAdLoad: any;
  let mockOffClose: any;
  let mockOffError: any;

  beforeEach(() => {
    closeListeners = [];
    errorListeners = [];
    mockAdShow = vi.fn().mockResolvedValue(undefined);
    mockAdLoad = vi.fn().mockResolvedValue(undefined);
    mockOffClose = vi.fn((cb) => {
      const idx = closeListeners.indexOf(cb);
      if (idx !== -1) closeListeners.splice(idx, 1);
    });
    mockOffError = vi.fn((cb) => {
      const idx = errorListeners.indexOf(cb);
      if (idx !== -1) errorListeners.splice(idx, 1);
    });

    (globalThis as any).tt = {
      createRewardedVideoAd: vi.fn(() => ({
        load: mockAdLoad,
        show: mockAdShow,
        onClose: vi.fn((cb) => { closeListeners.push(cb); }),
        offClose: mockOffClose,
        onError: vi.fn((cb) => { errorListeners.push(cb); }),
        offError: mockOffError
      }))
    };
  });

  afterEach(() => {
    delete (globalThis as any).tt;
  });

  const triggerClose = (res: { isEnded?: boolean }) => {
    // Copy listeners array to allow unregister during iteration
    [...closeListeners].forEach(cb => cb(res));
  };

  const triggerError = (err: any) => {
    [...errorListeners].forEach(cb => cb(err));
  };

  it('handles user closing rewarded video ad midway (isEnded: false)', async () => {
    const platform = new DouyinPlatform();
    const adPromise = platform.showRewardedVideoAd('ad_unit_revive');

    expect(closeListeners.length).toBe(1);
    triggerClose({ isEnded: false });

    const result = await adPromise;
    expect(result.isEnded).toBe(false);
    expect(result.error).toBeUndefined();

    // Verify offClose and offError were called for cleanup
    expect(mockOffClose).toHaveBeenCalled();
    expect(mockOffError).toHaveBeenCalled();
    expect(closeListeners.length).toBe(0);
  });

  it('handles user closing ad with empty object or undefined isEnded (safe falsy conversion)', async () => {
    const platform = new DouyinPlatform();
    const adPromise = platform.showRewardedVideoAd('ad_unit_revive');

    triggerClose({} as any);

    const result = await adPromise;
    expect(result.isEnded).toBe(false);
  });

  it('handles ad loading failure via onError with error message extraction', async () => {
    const platform = new DouyinPlatform();
    const adPromise = platform.showRewardedVideoAd('ad_unit_revive');

    triggerError({ errMsg: '1004: Ad pool exhausted', errCode: 1004 });

    const result = await adPromise;
    expect(result.isEnded).toBe(false);
    expect(result.error).toContain('1004');
    expect(mockOffClose).toHaveBeenCalled();
    expect(mockOffError).toHaveBeenCalled();
  });

  it('handles ad show rejection followed by successful fallback load and show', async () => {
    mockAdShow.mockRejectedValueOnce(new Error('Ad not ready'));
    mockAdLoad.mockResolvedValueOnce(undefined);
    mockAdShow.mockResolvedValueOnce(undefined);

    const platform = new DouyinPlatform();
    const adPromise = platform.showRewardedVideoAd('ad_unit_revive');

    await new Promise(r => setTimeout(r, 10));

    expect(mockAdLoad).toHaveBeenCalled();
    triggerClose({ isEnded: true });

    const result = await adPromise;
    expect(result.isEnded).toBe(true);
  });

  it('handles ad show rejection followed by load rejection without hanging', async () => {
    mockAdShow.mockRejectedValueOnce(new Error('Show error'));
    mockAdLoad.mockRejectedValueOnce({ errMsg: 'Network timeout during ad load' });

    const platform = new DouyinPlatform();
    const adPromise = platform.showRewardedVideoAd('ad_unit_revive');

    const result = await adPromise;
    expect(result.isEnded).toBe(false);
    expect(result.error).toContain('Network timeout');
  });

  it('handles rapid concurrent clicks on the same ad unit without crashing or unhandled rejection', async () => {
    const platform = new DouyinPlatform();

    // User double-taps the watch ad button concurrently
    const call1 = platform.showRewardedVideoAd('ad_unit_rapid');
    const call2 = platform.showRewardedVideoAd('ad_unit_rapid');

    expect(call1).toBeInstanceOf(Promise);
    expect(call2).toBeInstanceOf(Promise);
    expect(closeListeners.length).toBe(2);

    // Mock ad completion event broadcast to both registered listeners
    triggerClose({ isEnded: true });

    const [res1, res2] = await Promise.all([call1, call2]);
    expect(res1.isEnded).toBe(true);
    expect(res2.isEnded).toBe(true);
    expect(closeListeners.length).toBe(0);
  });

  it('handles missing createRewardedVideoAd API gracefully', async () => {
    (globalThis as any).tt = {}; // No createRewardedVideoAd
    const platform = new DouyinPlatform();

    const res = await platform.showRewardedVideoAd('ad_unit_test');
    expect(res.isEnded).toBe(false);
    expect(res.error).toBe('API_NOT_SUPPORTED');

    const boolRes = await platform.showRewardedAd('ad_unit_test');
    expect(boolRes).toBe(false);
  });

  it('handles throwing createRewardedVideoAd gracefully with fallback error code', async () => {
    (globalThis as any).tt = {
      createRewardedVideoAd: () => {
        throw new Error('Device out of memory for video player');
      }
    };
    const platform = new DouyinPlatform();

    const res = await platform.showRewardedVideoAd('ad_unit_test');
    expect(res.isEnded).toBe(false);
    // Code catches and assigns e?.errMsg || 'CREATE_AD_FAILED'
    expect(res.error).toBe('CREATE_AD_FAILED');
  });
});

describe('Adversarial Challenge: Haptics High-Frequency Stress Testing', () => {
  beforeEach(() => {
    delete (globalThis as any).tt;
  });

  afterEach(() => {
    delete (globalThis as any).tt;
  });

  it('WebPlatform survives 100 rapid consecutive haptic vibration calls without throwing', () => {
    const platform = new WebPlatform();
    expect(() => {
      for (let i = 0; i < 100; i++) {
        const type = i % 3 === 0 ? 'light' : i % 3 === 1 ? 'medium' : 'heavy';
        platform.vibrateShort(type);
        if (i % 10 === 0) {
          platform.vibrateLong();
        }
      }
    }).not.toThrow();
  });

  it('DouyinPlatform survives 100 rapid consecutive haptic calls and dispatches to tt', () => {
    let vibrateShortCalls = 0;
    let vibrateLongCalls = 0;

    (globalThis as any).tt = {
      vibrateShort: vi.fn(() => { vibrateShortCalls++; }),
      vibrateLong: vi.fn(() => { vibrateLongCalls++; })
    };

    const platform = new DouyinPlatform();
    expect(() => {
      for (let i = 0; i < 100; i++) {
        platform.vibrateShort('heavy');
        platform.vibrateLong();
      }
    }).not.toThrow();

    expect(vibrateShortCalls).toBe(100);
    expect(vibrateLongCalls).toBe(100);
  });

  it('DouyinPlatform triggers fail fallback if tt.vibrateShort with type option fails', () => {
    let fallbackTriggered = false;
    (globalThis as any).tt = {
      vibrateShort: vi.fn((opts: any) => {
        if (opts.type) {
          opts.fail();
        } else {
          fallbackTriggered = true;
        }
      })
    };

    const platform = new DouyinPlatform();
    platform.vibrateShort('heavy');
    expect(fallbackTriggered).toBe(true);
  });
});

describe('Adversarial Challenge: ByteDance Build Packaging Pipeline', () => {
  const testRoot = path.resolve(process.cwd(), 'challenger-test-env');
  const missingDist = path.resolve(testRoot, 'dist-missing');
  const emptyDist = path.resolve(testRoot, 'dist-empty');
  const validDist = path.resolve(testRoot, 'dist-valid');
  const outputDir = path.resolve(testRoot, 'dist-douyin-out');

  beforeEach(() => {
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('throws meaningful error with action guidance when source build directory is missing', () => {
    expect(() => {
      buildDouyin({
        sourceDir: missingDist,
        targetDir: outputDir
      });
    }).toThrow(/Source directory not found.*Please run "npm run build:web" first/);
  });

  it('handles empty source directory gracefully without unhandled crash', () => {
    fs.mkdirSync(emptyDist, { recursive: true });

    let result: any;
    expect(() => {
      result = buildDouyin({
        sourceDir: emptyDist,
        targetDir: outputDir,
        appId: 'tt_challenger_test',
        projectName: 'empty-test'
      });
    }).not.toThrow();

    expect(result.success).toBe(true);
    expect(result.entryFile).toBe('./assets/index.js');
    expect(fs.existsSync(path.resolve(outputDir, 'game.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(outputDir, 'project.config.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(outputDir, 'adapter.js'))).toBe(true);
    expect(fs.existsSync(path.resolve(outputDir, 'game.js'))).toBe(true);
  });

  it('correctly packages a realistic production Vite bundle with hashed assets', () => {
    fs.mkdirSync(path.resolve(validDist, 'assets'), { recursive: true });
    fs.writeFileSync(
      path.resolve(validDist, 'index.html'),
      '<!DOCTYPE html><html><head></head><body><div id="game-container"></div><script type="module" crossorigin src="/assets/index-G7xK9p.js"></script></body></html>'
    );
    fs.writeFileSync(
      path.resolve(validDist, 'assets', 'index-G7xK9p.js'),
      'console.log("Realistic production bundle");'
    );
    fs.writeFileSync(
      path.resolve(validDist, 'assets', 'style-A1b2c3.css'),
      'body { margin: 0; background: #000; }'
    );
    fs.writeFileSync(
      path.resolve(validDist, 'favicon.ico'),
      'icon-binary-data'
    );

    const result = buildDouyin({
      sourceDir: validDist,
      targetDir: outputDir,
      appId: 'tt1234567890abcdef',
      projectName: 'gucheng-shenjiying-prod'
    });

    expect(result.success).toBe(true);
    expect(result.entryFile).toBe('./assets/index-G7xK9p.js');

    expect(fs.existsSync(path.resolve(outputDir, 'assets', 'index-G7xK9p.js'))).toBe(true);
    expect(fs.existsSync(path.resolve(outputDir, 'assets', 'style-A1b2c3.css'))).toBe(true);
    expect(fs.existsSync(path.resolve(outputDir, 'favicon.ico'))).toBe(true);

    const gameJsContent = fs.readFileSync(path.resolve(outputDir, 'game.js'), 'utf-8');
    expect(gameJsContent).toContain("import './adapter.js';");
    expect(gameJsContent).toContain("import './assets/index-G7xK9p.js';");
  });

  it('validates game.json against ByteDance mini-game specification schema', () => {
    fs.mkdirSync(emptyDist, { recursive: true });
    buildDouyin({ sourceDir: emptyDist, targetDir: outputDir });

    const gameJsonPath = path.resolve(outputDir, 'game.json');
    const raw = fs.readFileSync(gameJsonPath, 'utf-8');
    const config = JSON.parse(raw);

    expect(config.deviceOrientation).toBe('portrait');
    expect(['portrait', 'landscape']).toContain(config.deviceOrientation);
    expect(typeof config.showStatusBar).toBe('boolean');
    expect(config.showStatusBar).toBe(false);

    expect(config.networkTimeout).toBeDefined();
    expect(typeof config.networkTimeout.request).toBe('number');
    expect(config.networkTimeout.request).toBeGreaterThan(0);
    expect(typeof config.networkTimeout.connectSocket).toBe('number');
    expect(typeof config.networkTimeout.uploadFile).toBe('number');
    expect(typeof config.networkTimeout.downloadFile).toBe('number');

    expect(Array.isArray(config.subpackages)).toBe(true);
    // Must not be empty string to comply with ByteDance mini-game compiler rules
    expect(config.openDataContext).toBeUndefined();
  });

  it('validates project.config.json against ByteDance mini-game specification schema', () => {
    fs.mkdirSync(emptyDist, { recursive: true });
    buildDouyin({
      sourceDir: emptyDist,
      targetDir: outputDir,
      appId: 'tt_test_appid_999',
      projectName: 'spec-test'
    });

    const projectJsonPath = path.resolve(outputDir, 'project.config.json');
    const raw = fs.readFileSync(projectJsonPath, 'utf-8');
    const config = JSON.parse(raw);

    expect(config.appid).toBe('tt_test_appid_999');
    expect(config.projectname).toBe('spec-test');
    expect(config.bundleType).toBe('game');

    expect(config.setting).toBeDefined();
    expect(typeof config.setting.es6).toBe('boolean');
    expect(config.setting.es6).toBe(true);
    expect(typeof config.setting.minified).toBe('boolean');
    expect(typeof config.setting.urlCheck).toBe('boolean');
  });

  it('validates real workspace dist-douyin directory output integrity', () => {
    const realDouyinDir = path.resolve(process.cwd(), 'dist-douyin');
    expect(fs.existsSync(realDouyinDir)).toBe(true);

    const gameJsonPath = path.resolve(realDouyinDir, 'game.json');
    const projectConfigPath = path.resolve(realDouyinDir, 'project.config.json');
    const adapterPath = path.resolve(realDouyinDir, 'adapter.js');
    const gameJsPath = path.resolve(realDouyinDir, 'game.js');
    const assetsDir = path.resolve(realDouyinDir, 'assets');

    expect(fs.existsSync(gameJsonPath)).toBe(true);
    expect(fs.existsSync(projectConfigPath)).toBe(true);
    expect(fs.existsSync(adapterPath)).toBe(true);
    expect(fs.existsSync(gameJsPath)).toBe(true);
    expect(fs.existsSync(assetsDir)).toBe(true);

    expect(fs.statSync(gameJsonPath).size).toBeGreaterThan(50);
    expect(fs.statSync(projectConfigPath).size).toBeGreaterThan(50);
    expect(fs.statSync(adapterPath).size).toBeGreaterThan(1000);
    expect(fs.statSync(gameJsPath).size).toBeGreaterThan(50);

    const gameJsCode = fs.readFileSync(gameJsPath, 'utf-8');
    const match = gameJsCode.match(/import\s+['"]\.\/assets\/([^'"]+)['"]/);
    expect(match).not.toBeNull();
    const entryChunkFilename = match![1];
    expect(fs.existsSync(path.resolve(assetsDir, entryChunkFilename))).toBe(true);
  });
});
