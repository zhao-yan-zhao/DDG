/**
 * 《孤城神机营》- WeChat Mini Game Platform Adapter & Build Packaging Automated Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { IPlatform } from '../src/platform/platform-interface';
import { WechatPlatform } from '../src/platform/wechat-platform';
import { PlatformBridge, getPlatform } from '../src/platform';
import { buildWechat } from '../scripts/build-wechat.js';

describe('WechatPlatform Implementation', () => {
  let platform: WechatPlatform;

  beforeEach(() => {
    platform = new WechatPlatform();
  });

  it('correctly identifies as WeChat platform', () => {
    expect(platform.type).toBe('wechat');
    expect(platform.isByteDance()).toBe(false);
    expect(platform.isByteDanceMiniGame()).toBe(false);
    expect(platform.isWechat()).toBe(true);
  });

  it('provides default 750x1334 portrait system metrics when wx is absent', () => {
    const info = platform.getSystemInfo();
    expect(info.screenWidth).toBe(750);
    expect(info.screenHeight).toBe(1334);
    expect(info.pixelRatio).toBe(2);
    expect(info.platform).toBe('devtools');
    expect(info.brand).toBe('WeChat');
  });

  it('safely handles storage when wx is absent', () => {
    expect(platform.getStorageSync('key')).toBeNull();
    expect(() => platform.setStorageSync('key', 'val')).not.toThrow();
    expect(() => platform.removeStorageSync('key')).not.toThrow();
    expect(() => platform.clearStorageSync()).not.toThrow();
  });

  it('safely handles haptic vibrations when wx is absent', () => {
    expect(() => platform.vibrateShort('light')).not.toThrow();
    expect(() => platform.vibrateShort('medium')).not.toThrow();
    expect(() => platform.vibrateShort('heavy')).not.toThrow();
    expect(() => platform.vibrateLong()).not.toThrow();
  });

  it('returns null for getGameRecorder as WeChat does not provide game recorder manager', () => {
    expect(platform.getGameRecorder()).toBeNull();
  });

  it('returns false for checkScene and navigateToScene', async () => {
    expect(await platform.checkScene('sidebar')).toBe(false);
    expect(await platform.navigateToScene('sidebar')).toBe(false);
  });
});

describe('WechatPlatform Implementation with Mock wx', () => {
  let mockWx: any;
  let platform: WechatPlatform;
  let mockStorage: Map<string, any>;

  beforeEach(() => {
    mockStorage = new Map();

    mockWx = {
      getSystemInfoSync: vi.fn(() => ({
        screenWidth: 390,
        screenHeight: 844,
        windowWidth: 390,
        windowHeight: 844,
        pixelRatio: 3,
        platform: 'ios',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        system: 'iOS 16.0',
        statusBarHeight: 47,
        safeArea: {
          top: 47,
          bottom: 810,
          left: 0,
          right: 390,
          width: 390,
          height: 763
        }
      })),
      getStorageSync: vi.fn((key: string) => mockStorage.get(key) || null),
      setStorageSync: vi.fn((key: string, val: any) => mockStorage.set(key, val)),
      removeStorageSync: vi.fn((key: string) => mockStorage.delete(key)),
      clearStorageSync: vi.fn(() => mockStorage.clear()),
      vibrateShort: vi.fn(),
      vibrateLong: vi.fn(),
      shareAppMessage: vi.fn((opts) => opts.success && opts.success()),
      onShareAppMessage: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
      createInnerAudioContext: vi.fn(() => ({
        src: '',
        startTime: 0,
        autoplay: false,
        loop: false,
        volume: 1,
        duration: 5,
        currentTime: 0,
        paused: true,
        play: vi.fn(),
        pause: vi.fn(),
        stop: vi.fn(),
        seek: vi.fn(),
        destroy: vi.fn(),
        onCanplay: vi.fn((cb) => cb()),
        onPlay: vi.fn((cb) => cb()),
        onPause: vi.fn((cb) => cb()),
        onStop: vi.fn((cb) => cb()),
        onEnded: vi.fn((cb) => cb()),
        onError: vi.fn()
      })),
      createRewardedVideoAd: vi.fn(() => {
        let closeCb: ((res: { isEnded: boolean }) => void) | null = null;
        let errCb: ((err: any) => void) | null = null;
        return {
          show: vi.fn().mockImplementation(() => {
            if (closeCb) closeCb({ isEnded: true });
            return Promise.resolve();
          }),
          load: vi.fn().mockResolvedValue(undefined),
          onClose: vi.fn((cb) => { closeCb = cb; }),
          offClose: vi.fn(() => { closeCb = null; }),
          onError: vi.fn((cb) => { errCb = cb; }),
          offError: vi.fn(() => { errCb = null; }),
          destroy: vi.fn()
        };
      })
    };

    (globalThis as any).wx = mockWx;
    platform = new WechatPlatform();
  });

  afterEach(() => {
    delete (globalThis as any).wx;
    PlatformBridge.reset();
  });

  it('accurately parses safeArea and metrics from wx.getSystemInfoSync', () => {
    const info = platform.getSystemInfo();
    expect(info.screenWidth).toBe(390);
    expect(info.screenHeight).toBe(844);
    expect(info.statusBarHeight).toBe(47);
    expect(info.platform).toBe('ios');

    const insets = platform.getSafeAreaInsets();
    expect(insets.top).toBe(47);
    expect(insets.bottom).toBe(34); // 844 - 810
    expect(insets.left).toBe(0);
    expect(insets.right).toBe(0);
  });

  it('manages key-value persistence through wx.getStorageSync & wx.setStorageSync', () => {
    platform.setStorageSync('wx_test_key', { hero: 'Shenji', level: 5 });
    const stored = platform.getStorageSync<{ hero: string; level: number }>('wx_test_key');
    expect(stored).toEqual({ hero: 'Shenji', level: 5 });

    platform.removeStorageSync('wx_test_key');
    expect(platform.getStorageSync('wx_test_key')).toBeNull();
  });

  it('dispatches haptic feedback via wx.vibrateShort & wx.vibrateLong', () => {
    platform.vibrateShort('heavy');
    expect(mockWx.vibrateShort).toHaveBeenCalledWith(expect.objectContaining({ type: 'heavy' }));

    platform.vibrateLong();
    expect(mockWx.vibrateLong).toHaveBeenCalled();
  });

  it('creates audio context with playAudio helper', () => {
    const audio = platform.playAudio('assets/audio/cannon.mp3', { loop: true, volume: 0.8 });
    expect(audio.src).toBe('assets/audio/cannon.mp3');
    expect(audio.loop).toBe(true);
    expect(audio.volume).toBe(0.8);
    expect(mockWx.createInnerAudioContext).toHaveBeenCalled();
  });

  it('handles social sharing via wx.shareAppMessage and passive menu hook', async () => {
    const res = await platform.shareAppMessage({ title: '援军速来！', query: 'room=123' });
    expect(res.success).toBe(true);
    expect(mockWx.shareAppMessage).toHaveBeenCalledWith(expect.objectContaining({ title: '援军速来！' }));

    const dummyHandler = () => ({ title: '被动分享' });
    platform.onShareAppMessage(dummyHandler);
    expect(mockWx.onShareAppMessage).toHaveBeenCalled();
  });

  it('completes rewarded video ad watch flow successfully', async () => {
    const result = await platform.showRewardedVideoAd('ad_reward_test');
    expect(result.isEnded).toBe(true);
    expect(result.error).toBeUndefined();

    const boolResult = await platform.showRewardedAd('ad_reward_test');
    expect(boolResult).toBe(true);
  });

  it('forwards touch event listeners', () => {
    const dummyCb = vi.fn();
    platform.onTouchStart(dummyCb);
    platform.onTouchMove(dummyCb);
    platform.onTouchEnd(dummyCb);

    expect(mockWx.onTouchStart).toHaveBeenCalledWith(dummyCb);
    expect(mockWx.onTouchMove).toHaveBeenCalledWith(dummyCb);
    expect(mockWx.onTouchEnd).toHaveBeenCalledWith(dummyCb);
  });
});

describe('PlatformBridge Auto-Detection for WeChat', () => {
  beforeEach(() => {
    PlatformBridge.reset();
  });

  afterEach(() => {
    delete (globalThis as any).wx;
    delete (globalThis as any).tt;
    PlatformBridge.reset();
  });

  it('automatically detects WeChat runtime when wx is defined and tt is absent', () => {
    (globalThis as any).wx = {
      getSystemInfoSync: () => ({ platform: 'devtools' })
    };
    delete (globalThis as any).tt;

    const detected = PlatformBridge.getPlatform();
    expect(detected.type).toBe('wechat');
    expect(detected.isByteDance()).toBe(false);
  });

  it('prefers tt if tt is present over wx', () => {
    (globalThis as any).tt = {
      getSystemInfoSync: () => ({ platform: 'devtools' })
    };
    (globalThis as any).wx = {
      getSystemInfoSync: () => ({ platform: 'devtools' })
    };

    const detected = PlatformBridge.getPlatform();
    expect(detected.type).toBe('douyin');
    expect(detected.isByteDance()).toBe(true);
  });
});

describe('WeChat Packaging Script (build-wechat)', () => {
  const tempSourceDir = path.resolve(process.cwd(), 'test-temp-dist-wx');
  const testOutputDir = path.resolve(process.cwd(), 'test-dist-wechat');

  beforeEach(() => {
    if (fs.existsSync(tempSourceDir)) fs.rmSync(tempSourceDir, { recursive: true, force: true });
    if (fs.existsSync(testOutputDir)) fs.rmSync(testOutputDir, { recursive: true, force: true });

    // Mock dist output
    fs.mkdirSync(path.join(tempSourceDir, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(tempSourceDir, 'index.html'), '<script src="./assets/index-testwx123.js"></script>', 'utf-8');
    fs.writeFileSync(path.join(tempSourceDir, 'assets', 'index-testwx123.js'), 'console.log("WeChat test bundle");', 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(tempSourceDir)) fs.rmSync(tempSourceDir, { recursive: true, force: true });
    if (fs.existsSync(testOutputDir)) fs.rmSync(testOutputDir, { recursive: true, force: true });
  });

  it('throws helpful error if source dist directory does not exist', () => {
    expect(() => {
      buildWechat({
        sourceDir: path.resolve(process.cwd(), 'non-existent-dist-dir-wx'),
        targetDir: testOutputDir
      });
    }).toThrow(/Source directory not found/);
  });

  it('packages dist into valid WeChat Mini Game structure', () => {
    const res = buildWechat({
      sourceDir: tempSourceDir,
      targetDir: testOutputDir,
      appId: 'wx_test_appid_456',
      projectName: 'test-wechat-gucheng'
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
    expect(projectConfig.appid).toBe('wx_test_appid_456');
    expect(projectConfig.projectname).toBe('test-wechat-gucheng');
    expect(projectConfig.compileType).toBe('game');
    expect(projectConfig.libVersion).toBe('3.17.4');
    expect(projectConfig.setting.es6).toBe(true);

    // 3. Check adapter.js
    const adapterPath = path.resolve(testOutputDir, 'adapter.js');
    expect(fs.existsSync(adapterPath)).toBe(true);
    const adapterContent = fs.readFileSync(adapterPath, 'utf-8');
    expect(adapterContent).toContain('createCanvas');
    expect(adapterContent).toContain('createInnerAudioContext');
    expect(adapterContent).toContain('localStorage');
    expect(adapterContent).toContain('onTouchStart');
    expect(adapterContent).toContain("safeSet(global, 'screen', screenObj);");
    expect(adapterContent).toContain('XMLHttpRequest');
    expect(adapterContent).toContain('DummyElement.prototype.nodeType = 1;');

    // 4. Check game.js and game-bundle.js
    const bundlePath = path.resolve(testOutputDir, 'game-bundle.js');
    expect(fs.existsSync(bundlePath)).toBe(true);
    const gameJsPath = path.resolve(testOutputDir, 'game.js');
    expect(fs.existsSync(gameJsPath)).toBe(true);
    const gameJsContent = fs.readFileSync(gameJsPath, 'utf-8');
    expect(gameJsContent).toContain("require('./adapter.js');");
    expect(gameJsContent).toContain("require('./game-bundle.js');");

    // 5. Check assets directory
    const assetsDir = path.resolve(testOutputDir, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);
    const assets = fs.readdirSync(assetsDir);
    expect(assets.some(a => a.startsWith('index-') && a.endsWith('.js'))).toBe(true);
  });
});
