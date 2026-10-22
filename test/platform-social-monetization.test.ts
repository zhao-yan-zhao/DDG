/**
 * 《孤城神机营》- Platform Social & Monetization Automated Test Suite
 * Covers:
 * 1. WebPlatform & MockGameRecorder (recording, video sharing, scenes, safeArea)
 * 2. DouyinPlatform & DouyinGameRecorder (native hooks, debouncing, error recovery)
 * 3. CampaignWaveEngine Revive & Star Settlement Impact
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebPlatform, MockGameRecorder } from '../src/platform/web-platform';
import { DouyinPlatform, DouyinGameRecorder } from '../src/platform/douyin-platform';
import { PlatformBridge } from '../src/platform';
import { CampaignWaveEngine } from '../src/core/wave/campaign-wave-engine';
import { SettlementEvaluator } from '../src/core/campaign/settlement-evaluator';
import { getStageConfig } from '../src/config/campaign.config';
import { getStageWaveConfig } from '../src/config/campaign-waves.config';

describe('Platform Social & Monetization Suite', () => {
  describe('Part 1: WebPlatform & MockGameRecorder', () => {
    let platform: WebPlatform;

    beforeEach(() => {
      platform = new WebPlatform();
      WebPlatform.mockShareVideoSuccess = true;
      WebPlatform.mockCheckSceneResult = { sidebar: true, desktop: true };
      WebPlatform.mockNavigateToSceneSuccess = true;
      WebPlatform.mockSafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    });

    it('manages MockGameRecorder recording lifecycle and callbacks', () => {
      const recorder = platform.getGameRecorder();
      expect(recorder).toBeDefined();
      expect(recorder?.isRecording()).toBe(false);

      let started = false;
      let stoppedPath = '';

      recorder?.onStart(() => {
        started = true;
      });

      recorder?.onStop((res) => {
        stoppedPath = res.videoPath;
      });

      recorder?.start({ duration: 30 });
      expect(started).toBe(true);
      expect(recorder?.isRecording()).toBe(true);

      recorder?.pause();
      recorder?.resume();

      recorder?.stop();
      expect(recorder?.isRecording()).toBe(false);
      expect(stoppedPath).toBe('mock_video_path.mp4');
    });

    it('simulates MockGameRecorder error dispatch', () => {
      const recorder = platform.getGameRecorder() as MockGameRecorder;
      recorder.shouldSimulateError = true;
      recorder.mockErrorMessage = 'Out of disk space';

      let receivedError: any = null;
      recorder.onError((err) => {
        receivedError = err;
      });

      recorder.start();
      expect(recorder.isRecording()).toBe(false);
      expect(receivedError).toBeDefined();
      expect(receivedError.message).toBe('Out of disk space');
    });

    it('executes shareVideo with configurable mock responses', async () => {
      const res1 = await platform.shareVideo({
        videoPath: 'test_path.mp4',
        title: '守城大捷',
        topics: ['#孤城神机营']
      });
      expect(res1.success).toBe(true);

      WebPlatform.mockShareVideoSuccess = false;
      const res2 = await platform.shareVideo({ videoPath: 'test_path.mp4' });
      expect(res2.success).toBe(false);
      expect(res2.errMsg).toBe('Mock video share rejected');
    });

    it('checks and navigates scenes with configurable mock values', async () => {
      expect(await platform.checkScene('sidebar')).toBe(true);
      expect(await platform.checkScene('desktop')).toBe(true);

      WebPlatform.mockCheckSceneResult = { sidebar: false, desktop: true };
      expect(await platform.checkScene('sidebar')).toBe(false);
      expect(await platform.checkScene('desktop')).toBe(true);

      expect(await platform.navigateToScene('sidebar')).toBe(true);
      WebPlatform.mockNavigateToSceneSuccess = false;
      expect(await platform.navigateToScene('sidebar')).toBe(false);
    });

    it('calculates safeAreaInsets and exposes safeArea in getSystemInfo', () => {
      WebPlatform.mockSafeAreaInsets = { top: 44, bottom: 34, left: 10, right: 10 };

      const insets = platform.getSafeAreaInsets();
      expect(insets).toEqual({ top: 44, bottom: 34, left: 10, right: 10 });

      const info = platform.getSystemInfo();
      expect(info.statusBarHeight).toBe(44);
      expect(info.safeAreaInsets).toEqual({ top: 44, bottom: 34, left: 10, right: 10 });
      expect(info.safeArea?.top).toBe(44);
      expect(info.safeArea?.bottom).toBe(info.windowHeight - 34);
    });
  });

  describe('Part 2: DouyinPlatform with Mock ByteDance tt', () => {
    let platform: DouyinPlatform;
    let mockRecorderCallbacks: {
      onStart?: () => void;
      onStop?: (res: { videoPath: string }) => void;
      onError?: (err: any) => void;
    };
    let mockRecorderStartCalls: any[];
    let mockShareCalls: any[];
    let mockCheckSceneCalls: any[];
    let mockNavigateToSceneCalls: any[];
    let mockAdCloseListeners: Array<(res: { isEnded: boolean }) => void> = [];
    let mockAdErrorListeners: Array<(err: any) => void> = [];
    let createAdCallCount = 0;
    let destroyAdCallCount = 0;

    beforeEach(() => {
      mockRecorderCallbacks = {};
      mockRecorderStartCalls = [];
      mockShareCalls = [];
      mockCheckSceneCalls = [];
      mockNavigateToSceneCalls = [];
      mockAdCloseListeners = [];
      mockAdErrorListeners = [];
      createAdCallCount = 0;
      destroyAdCallCount = 0;

      (globalThis as any).tt = {
        getSystemInfoSync: vi.fn(() => ({
          screenWidth: 390,
          screenHeight: 844,
          windowWidth: 390,
          windowHeight: 844,
          pixelRatio: 3,
          platform: 'ios',
          brand: 'Apple',
          model: 'iPhone 13',
          system: 'iOS 15.0',
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
        getGameRecorderManager: vi.fn(() => ({
          start: vi.fn((opts) => {
            mockRecorderStartCalls.push(opts);
            mockRecorderCallbacks.onStart?.();
          }),
          pause: vi.fn(),
          resume: vi.fn(),
          stop: vi.fn(() => {
            mockRecorderCallbacks.onStop?.({ videoPath: 'ttfile://recording123.mp4' });
          }),
          onStart: vi.fn((cb) => {
            mockRecorderCallbacks.onStart = cb;
          }),
          onStop: vi.fn((cb) => {
            mockRecorderCallbacks.onStop = cb;
          }),
          onError: vi.fn((cb) => {
            mockRecorderCallbacks.onError = cb;
          })
        })),
        shareAppMessage: vi.fn((options: any) => {
          mockShareCalls.push(options);
          if (options.fail && options._simulateFail) {
            options.fail({ errMsg: 'share cancelled' });
          } else if (options.success) {
            options.success();
          }
        }),
        checkScene: vi.fn((options: any) => {
          mockCheckSceneCalls.push(options);
          if (options.scene === 'sidebar') {
            options.success?.({ isExist: true });
          } else {
            options.success?.({ isExist: false });
          }
        }),
        navigateToScene: vi.fn((options: any) => {
          mockNavigateToSceneCalls.push(options);
          if (options._simulateFail) {
            options.fail?.({ errMsg: 'scene not supported' });
          } else {
            options.success?.();
          }
        }),
        createRewardedVideoAd: vi.fn(() => {
          createAdCallCount++;
          return {
            show: vi.fn().mockResolvedValue(undefined),
            load: vi.fn().mockResolvedValue(undefined),
            onClose: vi.fn((cb) => { mockAdCloseListeners.push(cb); }),
            offClose: vi.fn((cb) => {
              mockAdCloseListeners = mockAdCloseListeners.filter(l => l !== cb);
            }),
            onError: vi.fn((cb) => { mockAdErrorListeners.push(cb); }),
            offError: vi.fn((cb) => {
              mockAdErrorListeners = mockAdErrorListeners.filter(l => l !== cb);
            }),
            destroy: vi.fn(() => { destroyAdCallCount++; })
          };
        }),
        getStorageSync: vi.fn(),
        setStorageSync: vi.fn(),
        removeStorageSync: vi.fn(),
        clearStorageSync: vi.fn()
      };

      platform = new DouyinPlatform();
    });

    afterEach(() => {
      delete (globalThis as any).tt;
      PlatformBridge.reset();
    });

    it('hooks DouyinGameRecorder to native tt.getGameRecorderManager', () => {
      const recorder = platform.getGameRecorder();
      expect(recorder).toBeDefined();

      let started = false;
      let videoPath = '';

      recorder?.onStart(() => {
        started = true;
      });
      recorder?.onStop((res) => {
        videoPath = res.videoPath;
      });

      recorder?.start({ duration: 60 });
      expect(started).toBe(true);
      expect(recorder?.isRecording()).toBe(true);
      expect(mockRecorderStartCalls[0]).toEqual({ duration: 60 });

      recorder?.stop();
      expect(recorder?.isRecording()).toBe(false);
      expect(videoPath).toBe('ttfile://recording123.mp4');
    });

    it('handles DouyinGameRecorder error callback', () => {
      const recorder = platform.getGameRecorder();
      let errorHandled: any = null;
      recorder?.onError((err) => {
        errorHandled = err;
      });

      recorder?.start();
      expect(recorder?.isRecording()).toBe(true);

      mockRecorderCallbacks.onError?.({ errMsg: 'Record permission denied' });
      expect(recorder?.isRecording()).toBe(false);
      expect(errorHandled.errMsg).toBe('Record permission denied');
    });

    it('shares gameplay video via tt.shareAppMessage with channel video', async () => {
      const res = await platform.shareVideo({
        videoPath: 'ttfile://temp_video.mp4',
        title: '看我神机营破敌千万！',
        topics: ['#孤城神机营', '#抖音小游戏'],
        query: 'from=video_share'
      });

      expect(res.success).toBe(true);
      expect(mockShareCalls.length).toBe(1);
      expect(mockShareCalls[0].channel).toBe('video');
      expect(mockShareCalls[0].title).toBe('看我神机营破敌千万！');
      expect(mockShareCalls[0].query).toBe('from=video_share');
      expect(mockShareCalls[0].extra.videoPath).toBe('ttfile://temp_video.mp4');
      expect(mockShareCalls[0].extra.videoTopics).toEqual(['#孤城神机营', '#抖音小游戏']);
    });

    it('checks scene existence via tt.checkScene', async () => {
      const sidebarExists = await platform.checkScene('sidebar');
      expect(sidebarExists).toBe(true);

      const desktopExists = await platform.checkScene('desktop');
      expect(desktopExists).toBe(false);
      expect(mockCheckSceneCalls.length).toBe(2);
    });

    it('navigates to scene via tt.navigateToScene', async () => {
      const navSuccess = await platform.navigateToScene('sidebar');
      expect(navSuccess).toBe(true);
      expect(mockNavigateToSceneCalls.length).toBe(1);
      expect(mockNavigateToSceneCalls[0].scene).toBe('sidebar');
    });

    it('accurately calculates safeAreaInsets from safeArea and statusBarHeight', () => {
      const insets = platform.getSafeAreaInsets();
      // screenHeight: 844, safeArea.bottom: 810 => bottom inset: 34
      // safeArea.top: 47 => top inset: 47
      expect(insets).toEqual({
        top: 47,
        bottom: 34,
        left: 0,
        right: 0
      });

      const sys = platform.getSystemInfo();
      expect(sys.statusBarHeight).toBe(47);
      expect(sys.safeAreaInsets).toEqual({ top: 47, bottom: 34, left: 0, right: 0 });
    });

    it('reuses RewardedVideoAd instance and handles concurrent calls', async () => {
      // First ad show
      const p1 = platform.showRewardedVideoAd('ad_unit_revive');
      // Second concurrent ad show for the same ad unit
      const p2 = platform.showRewardedVideoAd('ad_unit_revive');

      // Both should reuse the same ad instance and register listeners
      expect(createAdCallCount).toBe(1);
      expect(mockAdCloseListeners.length).toBe(2);

      // Trigger user watching completion to all listeners
      mockAdCloseListeners.forEach(cb => cb({ isEnded: true }));

      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1.isEnded).toBe(true);
      expect(res2.isEnded).toBe(true);
      expect(mockAdCloseListeners.length).toBe(0);

      // Subsequent call after resolution reuses existing ad instance
      const p3 = platform.showRewardedVideoAd('ad_unit_revive');
      expect(createAdCallCount).toBe(1);
      expect(mockAdCloseListeners.length).toBe(1);
      mockAdCloseListeners.forEach(cb => cb({ isEnded: false }));
      const res3 = await p3;
      expect(res3.isEnded).toBe(false);
      expect(mockAdCloseListeners.length).toBe(0);
    });

    it('recovers from RewardedVideoAd errors by clearing corrupt instance', async () => {
      const p1 = platform.showRewardedVideoAd('ad_unit_error');
      expect(createAdCallCount).toBe(1);

      // Simulate ad error
      mockAdErrorListeners.forEach(cb => cb({ errMsg: 'Network error 1004' }));
      const res1 = await p1;
      expect(res1.isEnded).toBe(false);
      expect(res1.error).toBe('Network error 1004');
      expect(destroyAdCallCount).toBe(1);

      // Next call re-creates fresh instance because corrupted one was evicted
      const p2 = platform.showRewardedVideoAd('ad_unit_error');
      expect(createAdCallCount).toBe(2);
      mockAdCloseListeners.forEach(cb => cb({ isEnded: true }));
      const res2 = await p2;
      expect(res2.isEnded).toBe(true);
    });
  });

  describe('Part 3: CampaignWaveEngine Revive & Star Settlement Impact', () => {
    let engine: CampaignWaveEngine;

    beforeEach(() => {
      const stageConfig = getStageConfig(1);
      const stageWaveConfig = getStageWaveConfig(1);
      engine = new CampaignWaveEngine(stageConfig, stageWaveConfig);
    });

    it('revives after defeat, restores HP to specified ratio, and tracks revivesUsed', () => {
      expect(engine.getState()).toBe('Prep');
      expect(engine.getWallHp()).toBe(1000);
      expect(engine.getMaxWallHp()).toBe(1000);

      // Start wave
      engine.startWave();
      expect(engine.getState()).toBe('WaveActive');

      // Deplete wall HP to zero triggering Defeat
      engine.getWaveFSM().damageWall(1000);
      expect(engine.getWallHp()).toBe(0);
      expect(engine.getState()).toBe('Defeat');

      // Revive with 50% HP (default)
      const restoredHp = engine.revive(0.5);
      expect(restoredHp).toBe(500);
      expect(engine.getWallHp()).toBe(500);
      expect(engine.getState()).toBe('Prep');
      expect(engine.getSummary().revivesUsed).toBe(1);

      // Attempting to revive when not in Defeat throws Error
      expect(() => engine.revive(0.5)).toThrow(/Cannot revive/);
    });

    it('correctly passes revivesUsed to settlement payload and impacts star evaluation', () => {
      // Scenario A: Flawless victory without revives (>= 90% HP, revivesUsed == 0) -> 3 Stars
      const flawlessInput = {
        stageId: 1,
        cleared: true,
        wavesCleared: 5,
        totalWaves: 5,
        finalWallHp: 950,
        maxWallHp: 1000,
        revivesUsed: 0,
        hasDoubleStar4Awakening: false,
        isFirstClear: true
      };
      const flawlessSettlement = SettlementEvaluator.evaluate(flawlessInput);
      expect(flawlessSettlement.stars.stars).toBe(3);
      expect(flawlessSettlement.stars.star3Earned).toBe(true);

      // Scenario B: Victory after 1 Revive, even with high HP (revivesUsed == 1) -> 2 Stars Max
      const revivedInput = {
        stageId: 1,
        cleared: true,
        wavesCleared: 5,
        totalWaves: 5,
        finalWallHp: 950,
        maxWallHp: 1000,
        revivesUsed: 1,
        hasDoubleStar4Awakening: false,
        isFirstClear: true
      };
      const revivedSettlement = SettlementEvaluator.evaluate(revivedInput);
      expect(revivedSettlement.stars.stars).toBe(2);
      expect(revivedSettlement.stars.star3Earned).toBe(false);
      expect(revivedSettlement.revivesUsed).toBe(1);

      // Engine settlement generator test
      engine.startWave();
      engine.getWaveFSM().damageWall(1000);
      engine.revive(0.5);

      const generatedPayload = engine.createSettlementInput();
      expect(generatedPayload.revivesUsed).toBe(1);
      expect(generatedPayload.finalWallHp).toBe(500);
    });
  });
});
