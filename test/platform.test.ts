/**
 * 《孤城神机营》- Platform Bridge & Build Packaging Automated Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { IPlatform } from '../src/platform/platform-interface';
import { WebPlatform } from '../src/platform/web-platform';
import { DouyinPlatform } from '../src/platform/douyin-platform';
import { PlatformBridge, getPlatform } from '../src/platform';
import { buildDouyin } from '../scripts/build-douyin.js';

describe('WebPlatform Implementation', () => {
  let platform: WebPlatform;

  beforeEach(() => {
    platform = new WebPlatform();
  });

  it('correctly identifies as Web platform', () => {
    expect(platform.type).toBe('web');
    expect(platform.isByteDance()).toBe(false);
    expect(platform.isByteDanceMiniGame()).toBe(false);
  });

  it('provides default 750x1334 portrait system metrics in headless environment', () => {
    const info = platform.getSystemInfo();
    expect(info.screenWidth).toBeGreaterThan(0);
    expect(info.screenHeight).toBeGreaterThan(0);
    expect(info.pixelRatio).toBeGreaterThanOrEqual(1);
    expect(info.platform).toBe('web');
  });

  it('manages key-value storage with serialization and isolation', () => {
    platform.clearStorageSync();
    expect(platform.getStorageSync('non_existent')).toBeNull();

    platform.setStorageSync('user_level', 10);
    expect(platform.getStorageSync<number>('user_level')).toBe(10);

    const testConfig = { soundEnabled: true, highQuality: false, coins: 500 };
    platform.setStorageSync('settings', testConfig);
    expect(platform.getStorageSync('settings')).toEqual(testConfig);

    platform.removeStorageSync('user_level');
    expect(platform.getStorageSync('user_level')).toBeNull();
    expect(platform.getStorageSync('settings')).toEqual(testConfig);

    platform.clearStorageSync();
    expect(platform.getStorageSync('settings')).toBeNull();
  });

  it('safely handles haptic vibration without throwing exceptions', () => {
    expect(() => platform.vibrateShort('light')).not.toThrow();
    expect(() => platform.vibrateShort('medium')).not.toThrow();
    expect(() => platform.vibrateShort('heavy')).not.toThrow();
    expect(() => platform.vibrateLong()).not.toThrow();
  });

  it('creates inner audio context with full lifecycle callbacks', () => {
    const audio = platform.createInnerAudioContext();
    audio.src = 'assets/audio/fire_cannon.mp3';
    audio.loop = true;
    audio.volume = 0.8;

    let canplayCalled = false;
    let playCalled = false;
    let pauseCalled = false;
    let stopCalled = false;

    audio.onCanplay(() => { canplayCalled = true; });
    audio.onPlay(() => { playCalled = true; });
    audio.onPause(() => { pauseCalled = true; });
    audio.onStop(() => { stopCalled = true; });

    audio.play();
    expect(audio.paused).toBe(false);
    expect(playCalled).toBe(true);

    audio.pause();
    expect(audio.paused).toBe(true);
    expect(pauseCalled).toBe(true);

    audio.stop();
    expect(audio.paused).toBe(true);
    expect(stopCalled).toBe(true);
    expect(audio.currentTime).toBe(0);

    expect(() => audio.destroy()).not.toThrow();
  });

  it('simulates rewarded video ad lifecycle in web environment', async () => {
    WebPlatform.mockAdWatchSuccess = true;
    const resSuccess = await platform.showRewardedVideoAd('ad_revive_01');
    expect(resSuccess.isEnded).toBe(true);

    const booleanRes = await platform.showRewardedAd('ad_revive_01');
    expect(booleanRes).toBe(true);

    WebPlatform.mockAdWatchSuccess = false;
    const resSkipped = await platform.showRewardedVideoAd('ad_revive_01');
    expect(resSkipped.isEnded).toBe(false);
  });

  it('handles simulated social share', async () => {
    const result = await platform.shareAppMessage({
      title: '《孤城神机营》- 我已坚守至第10波！',
      query: 'challenge=w10_clear'
    });
    expect(result.success).toBe(true);
  });
});

describe('DouyinPlatform Implementation with Mock tt', () => {
  let mockStorage: Map<string, any>;
  let mockAdCloseCallback: ((res: { isEnded: boolean }) => void) | null = null;
  let mockAdErrorCallback: ((err: any) => void) | null = null;
  let mockVibrateShortCalls: any[] = [];
  let mockVibrateLongCalls: any[] = [];
  let mockShareCalls: any[] = [];

  beforeEach(() => {
    mockStorage = new Map();
    mockAdCloseCallback = null;
    mockAdErrorCallback = null;
    mockVibrateShortCalls = [];
    mockVibrateLongCalls = [];
    mockShareCalls = [];

    // Construct mock ByteDance global tt object
    (globalThis as any).tt = {
      getSystemInfoSync: vi.fn(() => ({
        screenWidth: 393,
        screenHeight: 852,
        windowWidth: 393,
        windowHeight: 852,
        pixelRatio: 3,
        platform: 'ios',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        system: 'iOS 16.5',
        version: '28.0.0'
      })),
      vibrateShort: vi.fn((opts: any) => {
        mockVibrateShortCalls.push(opts);
      }),
      vibrateLong: vi.fn((opts: any) => {
        mockVibrateLongCalls.push(opts);
      }),
      createInnerAudioContext: vi.fn(() => ({
        src: '',
        startTime: 0,
        autoplay: false,
        loop: false,
        volume: 1.0,
        play: vi.fn(),
        pause: vi.fn(),
        stop: vi.fn(),
        seek: vi.fn(),
        destroy: vi.fn(),
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onStop: vi.fn(),
        onEnded: vi.fn(),
        onError: vi.fn()
      })),
      createRewardedVideoAd: vi.fn((_config: { adUnitId: string }) => ({
        load: vi.fn().mockResolvedValue(undefined),
        show: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn((cb) => { mockAdCloseCallback = cb; }),
        offClose: vi.fn(),
        onError: vi.fn((cb) => { mockAdErrorCallback = cb; }),
        offError: vi.fn()
      })),
      shareAppMessage: vi.fn((opts: any) => {
        mockShareCalls.push(opts);
        if (opts && typeof opts.success === 'function') opts.success();
      }),
      onShareAppMessage: vi.fn(),
      getStorageSync: vi.fn((key: string) => mockStorage.get(key) ?? null),
      setStorageSync: vi.fn((key: string, val: any) => { mockStorage.set(key, val); }),
      removeStorageSync: vi.fn((key: string) => { mockStorage.delete(key); }),
      clearStorageSync: vi.fn(() => { mockStorage.clear(); })
    };
  });

  afterEach(() => {
    delete (globalThis as any).tt;
  });

  it('correctly identifies as Douyin platform', () => {
    const platform = new DouyinPlatform();
    expect(platform.type).toBe('douyin');
    expect(platform.isByteDance()).toBe(true);
    expect(platform.isByteDanceMiniGame()).toBe(true);
  });

  it('delegates system metrics extraction to tt.getSystemInfoSync', () => {
    const platform = new DouyinPlatform();
    const info = platform.getSystemInfo();
    expect(info.screenWidth).toBe(393);
    expect(info.screenHeight).toBe(852);
    expect(info.pixelRatio).toBe(3);
    expect(info.platform).toBe('ios');
    expect(info.brand).toBe('Apple');
    expect((globalThis as any).tt.getSystemInfoSync).toHaveBeenCalled();
  });

  it('delegates haptic feedback to tt.vibrateShort and tt.vibrateLong', () => {
    const platform = new DouyinPlatform();
    platform.vibrateShort('heavy');
    expect(mockVibrateShortCalls.length).toBe(1);
    expect(mockVibrateShortCalls[0].type).toBe('heavy');

    platform.vibrateLong();
    expect(mockVibrateLongCalls.length).toBe(1);
  });

  it('delegates persistent storage to tt synchronous storage APIs', () => {
    const platform = new DouyinPlatform();
    platform.setStorageSync('high_score', 12500);
    expect(platform.getStorageSync<number>('high_score')).toBe(12500);

    platform.setStorageSync('player_data', { chapter: 3, stars: 12 });
    expect(platform.getStorageSync('player_data')).toEqual({ chapter: 3, stars: 12 });

    platform.removeStorageSync('high_score');
    expect(platform.getStorageSync('high_score')).toBeNull();

    platform.clearStorageSync();
    expect(platform.getStorageSync('player_data')).toBeNull();
  });

  it('handles complete rewarded video ad flow when user finishes watching', async () => {
    const platform = new DouyinPlatform();
    const adPromise = platform.showRewardedVideoAd('ad_unit_gold_revive');

    expect((globalThis as any).tt.createRewardedVideoAd).toHaveBeenCalledWith({ adUnitId: 'ad_unit_gold_revive' });

    expect(mockAdCloseCallback).toBeDefined();
    mockAdCloseCallback!({ isEnded: true });

    const result = await adPromise;
    expect(result.isEnded).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('handles rewarded video ad flow when user skips ad early', async () => {
    const platform = new DouyinPlatform();
    const adPromise = platform.showRewardedVideoAd('ad_unit_gold_revive');

    mockAdCloseCallback!({ isEnded: false });

    const result = await adPromise;
    expect(result.isEnded).toBe(false);
  });

  it('handles rewarded video ad error when load/show fails', async () => {
    const platform = new DouyinPlatform();
    const adPromise = platform.showRewardedVideoAd('ad_unit_gold_revive');

    mockAdErrorCallback!({ errMsg: '1004: No advertisement fill available' });

    const result = await adPromise;
    expect(result.isEnded).toBe(false);
    expect(result.error).toContain('1004');
  });

  it('delegates social share to tt.shareAppMessage', async () => {
    const platform = new DouyinPlatform();
    const shareRes = await platform.shareAppMessage({
      title: '墨家机关神机营，诚邀诸位大统领破阵！',
      imageUrl: 'assets/share_banner.png',
      query: 'room=1001'
    });

    expect(shareRes.success).toBe(true);
    expect(mockShareCalls.length).toBe(1);
    expect(mockShareCalls[0].title).toContain('墨家机关');
  });
});

describe('PlatformBridge Factory & Auto-Detection', () => {
  beforeEach(() => {
    PlatformBridge.reset();
    delete (globalThis as any).tt;
  });

  afterEach(() => {
    PlatformBridge.reset();
    delete (globalThis as any).tt;
  });

  it('defaults to WebPlatform when tt is not defined', () => {
    const platform = PlatformBridge.getPlatform();
    expect(platform.type).toBe('web');
    expect(platform).toBeInstanceOf(WebPlatform);
    expect(getPlatform().type).toBe('web');
  });

  it('auto-detects DouyinPlatform when tt.getSystemInfoSync is present', () => {
    (globalThis as any).tt = {
      getSystemInfoSync: () => ({ screenWidth: 750, screenHeight: 1334, pixelRatio: 2 })
    };

    const platform = PlatformBridge.getPlatform();
    expect(platform.type).toBe('douyin');
    expect(platform).toBeInstanceOf(DouyinPlatform);
    expect(getPlatform().type).toBe('douyin');
  });

  it('maintains singleton instance across multiple getPlatform calls', () => {
    const p1 = PlatformBridge.getPlatform();
    const p2 = PlatformBridge.getPlatform();
    expect(p1).toBe(p2);
  });

  it('supports injecting custom platform instance via setPlatform', () => {
    const customMock: IPlatform = {
      type: 'web',
      isByteDance: () => false,
      isByteDanceMiniGame: () => false,
      getSystemInfo: () => ({ screenWidth: 1080, screenHeight: 1920, windowWidth: 1080, windowHeight: 1920, pixelRatio: 3, platform: 'web' }),
      createInnerAudioContext: () => ({} as any),
      playAudio: () => ({} as any),
      vibrateShort: () => {},
      vibrateLong: () => {},
      shareAppMessage: async () => ({ success: true }),
      onShareAppMessage: () => {},
      showRewardedVideoAd: async () => ({ isEnded: true }),
      showRewardedAd: async () => true,
      getSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      getGameRecorder: () => null,
      shareVideo: async () => ({ success: true }),
      checkScene: async () => true,
      navigateToScene: async () => true,
      getStorageSync: () => null,
      setStorageSync: () => {},
      removeStorageSync: () => {},
      clearStorageSync: () => {}
    };

    PlatformBridge.setPlatform(customMock);
    expect(PlatformBridge.getPlatform()).toBe(customMock);
    expect(PlatformBridge.getPlatform().getSystemInfo().screenWidth).toBe(1080);
  });
});

describe('ByteDance Packaging Script (build-douyin)', () => {
  const testOutputDir = path.resolve(process.cwd(), 'test-dist-douyin');
  const tempSourceDir = path.resolve(process.cwd(), 'test-temp-dist');

  beforeEach(() => {
    // Ensure mock source directory with assets exists for deterministic testing
    if (!fs.existsSync(tempSourceDir)) {
      fs.mkdirSync(path.resolve(tempSourceDir, 'assets'), { recursive: true });
      fs.writeFileSync(
        path.resolve(tempSourceDir, 'index.html'),
        '<!DOCTYPE html><html><body><script type="module" src="./assets/index-test123.js"></script></body></html>'
      );
      fs.writeFileSync(
        path.resolve(tempSourceDir, 'assets', 'index-test123.js'),
        'console.log("Mock Game Bundle");'
      );
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    if (fs.existsSync(tempSourceDir)) {
      fs.rmSync(tempSourceDir, { recursive: true, force: true });
    }
  });

  it('throws helpful error if source dist directory does not exist', () => {
    expect(() => {
      buildDouyin({
        sourceDir: path.resolve(process.cwd(), 'non-existent-dist-dir'),
        targetDir: testOutputDir
      });
    }).toThrow(/Source directory not found/);
  });

  it('packages dist into valid ByteDance Mini Game structure', () => {
    const res = buildDouyin({
      sourceDir: tempSourceDir,
      targetDir: testOutputDir,
      appId: 'tt_test_appid_123',
      projectName: 'test-gucheng'
    });

    expect(res.success).toBe(true);
    expect(fs.existsSync(testOutputDir)).toBe(true);

    // 1. Check game.json
    const gameJsonPath = path.resolve(testOutputDir, 'game.json');
    expect(fs.existsSync(gameJsonPath)).toBe(true);
    const gameConfig = JSON.parse(fs.readFileSync(gameJsonPath, 'utf-8'));
    expect(gameConfig.deviceOrientation).toBe('portrait');
    expect(gameConfig.showStatusBar).toBe(false);
    expect(gameConfig.networkTimeout).toBeDefined();
    expect(gameConfig.networkTimeout.request).toBe(10000);

    // 2. Check project.config.json
    const projectConfigPath = path.resolve(testOutputDir, 'project.config.json');
    expect(fs.existsSync(projectConfigPath)).toBe(true);
    const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf-8'));
    expect(projectConfig.appid).toBe('tt_test_appid_123');
    expect(projectConfig.projectname).toBe('test-gucheng');
    expect(projectConfig.setting.es6).toBe(true);

    // 3. Check adapter.js
    const adapterPath = path.resolve(testOutputDir, 'adapter.js');
    expect(fs.existsSync(adapterPath)).toBe(true);
    const adapterContent = fs.readFileSync(adapterPath, 'utf-8');
    expect(adapterContent).toContain('createCanvas');
    expect(adapterContent).toContain('createInnerAudioContext');
    expect(adapterContent).toContain('localStorage');
    expect(adapterContent).toContain('onTouchStart');

    // 4. Check game.js
    const gameJsPath = path.resolve(testOutputDir, 'game.js');
    expect(fs.existsSync(gameJsPath)).toBe(true);
    const gameJsContent = fs.readFileSync(gameJsPath, 'utf-8');
    expect(gameJsContent).toContain("import './adapter.js';");
    expect(gameJsContent).toContain("import './assets/index-test123.js';");

    // 5. Check assets directory
    const assetsDir = path.resolve(testOutputDir, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);
    const assets = fs.readdirSync(assetsDir);
    expect(assets.some(a => a.startsWith('index-') && a.endsWith('.js'))).toBe(true);
  });
});
