/**
 * 《孤城神机营》- ByteDance Mini Game Platform Adapter Implementation
 * Encapsulates ByteDance 'tt' runtime APIs.
 */

import {
  IPlatform,
  SystemInfo,
  IInnerAudioContext,
  HapticFeedbackType,
  ShareOptions,
  ShareResult,
  RewardedVideoAdResult,
  IGameRecorder
} from './platform-interface';

// Declare ByteDance global namespace
declare const tt: any;

class DouyinInnerAudioContext implements IInnerAudioContext {
  private rawContext: any;

  constructor() {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.createInnerAudioContext === 'function') {
      this.rawContext = tt.createInnerAudioContext();
    } else {
      // Mock stub for fallback
      this.rawContext = {
        play: () => {},
        pause: () => {},
        stop: () => {},
        seek: () => {},
        destroy: () => {},
        onCanplay: () => {},
        onPlay: () => {},
        onPause: () => {},
        onStop: () => {},
        onEnded: () => {},
        onError: () => {}
      };
    }
  }

  public get src(): string {
    return this.rawContext.src || '';
  }
  public set src(val: string) {
    this.rawContext.src = val;
  }

  public get startTime(): number {
    return this.rawContext.startTime || 0;
  }
  public set startTime(val: number) {
    this.rawContext.startTime = val;
  }

  public get autoplay(): boolean {
    return !!this.rawContext.autoplay;
  }
  public set autoplay(val: boolean) {
    this.rawContext.autoplay = val;
  }

  public get loop(): boolean {
    return !!this.rawContext.loop;
  }
  public set loop(val: boolean) {
    this.rawContext.loop = val;
  }

  public get volume(): number {
    return typeof this.rawContext.volume === 'number' ? this.rawContext.volume : 1.0;
  }
  public set volume(val: number) {
    this.rawContext.volume = Math.max(0, Math.min(1, val));
  }

  public get duration(): number {
    return this.rawContext.duration || 0;
  }

  public get currentTime(): number {
    return this.rawContext.currentTime || 0;
  }

  public get paused(): boolean {
    return this.rawContext.paused !== undefined ? this.rawContext.paused : true;
  }

  public play(): void {
    this.rawContext.play();
  }

  public pause(): void {
    this.rawContext.pause();
  }

  public stop(): void {
    this.rawContext.stop();
  }

  public seek(position: number): void {
    this.rawContext.seek(position);
  }

  public destroy(): void {
    if (typeof this.rawContext.destroy === 'function') {
      this.rawContext.destroy();
    }
  }

  public onCanplay(callback: () => void): void {
    if (typeof this.rawContext.onCanplay === 'function') {
      this.rawContext.onCanplay(callback);
    }
  }

  public onPlay(callback: () => void): void {
    if (typeof this.rawContext.onPlay === 'function') {
      this.rawContext.onPlay(callback);
    }
  }

  public onPause(callback: () => void): void {
    if (typeof this.rawContext.onPause === 'function') {
      this.rawContext.onPause(callback);
    }
  }

  public onStop(callback: () => void): void {
    if (typeof this.rawContext.onStop === 'function') {
      this.rawContext.onStop(callback);
    }
  }

  public onEnded(callback: () => void): void {
    if (typeof this.rawContext.onEnded === 'function') {
      this.rawContext.onEnded(callback);
    }
  }

  public onError(callback: (err: { errMsg: string; errCode?: number }) => void): void {
    if (typeof this.rawContext.onError === 'function') {
      this.rawContext.onError(callback);
    }
  }
}

export class DouyinGameRecorder implements IGameRecorder {
  private rawRecorder: any = null;
  private recording: boolean = false;
  private startCallbacks: Array<() => void> = [];
  private stopCallbacks: Array<(res: { videoPath: string }) => void> = [];
  private errorCallbacks: Array<(err: any) => void> = [];

  constructor() {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.getGameRecorderManager === 'function') {
      try {
        this.rawRecorder = tt.getGameRecorderManager();
        if (this.rawRecorder) {
          if (typeof this.rawRecorder.onStart === 'function') {
            this.rawRecorder.onStart(() => {
              this.recording = true;
              this.startCallbacks.forEach(cb => cb());
            });
          }
          if (typeof this.rawRecorder.onStop === 'function') {
            this.rawRecorder.onStop((res: { videoPath: string }) => {
              this.recording = false;
              this.stopCallbacks.forEach(cb => cb(res));
            });
          }
          if (typeof this.rawRecorder.onError === 'function') {
            this.rawRecorder.onError((err: any) => {
              this.recording = false;
              this.errorCallbacks.forEach(cb => cb(err));
            });
          }
        }
      } catch (e) {
        console.warn('[DouyinGameRecorder] Initialization error:', e);
      }
    }
  }

  public start(options?: { duration?: number }): void {
    if (this.rawRecorder && typeof this.rawRecorder.start === 'function') {
      try {
        this.rawRecorder.start(options);
      } catch (e) {
        console.warn('[DouyinGameRecorder] start error:', e);
      }
    }
    this.recording = true;
  }

  public pause(): void {
    if (this.rawRecorder && typeof this.rawRecorder.pause === 'function') {
      try {
        this.rawRecorder.pause();
      } catch (e) {}
    }
  }

  public resume(): void {
    if (this.rawRecorder && typeof this.rawRecorder.resume === 'function') {
      try {
        this.rawRecorder.resume();
      } catch (e) {}
    }
  }

  public stop(): void {
    if (this.rawRecorder && typeof this.rawRecorder.stop === 'function') {
      try {
        this.rawRecorder.stop();
      } catch (e) {}
    }
    this.recording = false;
  }

  public onStart(cb: () => void): void {
    this.startCallbacks.push(cb);
  }

  public onStop(cb: (res: { videoPath: string }) => void): void {
    this.stopCallbacks.push(cb);
  }

  public onError(cb: (err: any) => void): void {
    this.errorCallbacks.push(cb);
  }

  public isRecording(): boolean {
    return this.recording;
  }
}

export class DouyinPlatform implements IPlatform {
  public readonly type = 'douyin' as const;

  // Cached RewardedVideoAd instances by adUnitId to avoid redundant creation
  private adInstances: Map<string, any> = new Map();
  private gameRecorder: DouyinGameRecorder | null = null;

  public isByteDance(): boolean {
    return true;
  }

  public isByteDanceMiniGame(): boolean {
    return true;
  }

  public isWechat(): boolean {
    return false;
  }

  public getGameRecorder(): IGameRecorder | null {
    if (!this.gameRecorder) {
      this.gameRecorder = new DouyinGameRecorder();
    }
    return this.gameRecorder;
  }

  public getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    try {
      if (typeof tt !== 'undefined' && tt !== null && typeof tt.getSystemInfoSync === 'function') {
        const info = tt.getSystemInfoSync();
        const screenHeight = info.screenHeight || info.windowHeight || 1334;
        const screenWidth = info.screenWidth || info.windowWidth || 750;

        let top = 0;
        let bottom = 0;
        let left = 0;
        let right = 0;

        if (info.safeArea) {
          top = Math.max(0, info.safeArea.top ?? 0);
          bottom = Math.max(0, screenHeight - (info.safeArea.bottom ?? screenHeight));
          left = Math.max(0, info.safeArea.left ?? 0);
          right = Math.max(0, screenWidth - (info.safeArea.right ?? screenWidth));
        } else if (typeof info.statusBarHeight === 'number') {
          top = info.statusBarHeight;
        }

        return { top, bottom, left, right };
      }
    } catch (e) {
      console.warn('[DouyinPlatform] getSafeAreaInsets error:', e);
    }

    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  public getSystemInfo(): SystemInfo {
    const insets = this.getSafeAreaInsets();
    try {
      if (typeof tt !== 'undefined' && tt !== null && typeof tt.getSystemInfoSync === 'function') {
        const info = tt.getSystemInfoSync();
        const screenWidth = info.screenWidth || 750;
        const screenHeight = info.screenHeight || 1334;
        const windowWidth = info.windowWidth || screenWidth;
        const windowHeight = info.windowHeight || screenHeight;

        return {
          screenWidth,
          screenHeight,
          windowWidth,
          windowHeight,
          pixelRatio: info.pixelRatio || 1,
          platform: info.platform || 'devtools',
          brand: info.brand || 'ByteDance',
          model: info.model || 'MiniGameDevice',
          system: info.system,
          statusBarHeight: typeof info.statusBarHeight === 'number' ? info.statusBarHeight : insets.top,
          safeArea: info.safeArea ? {
            top: info.safeArea.top,
            left: info.safeArea.left,
            right: info.safeArea.right,
            bottom: info.safeArea.bottom,
            width: info.safeArea.width,
            height: info.safeArea.height
          } : {
            top: insets.top,
            left: insets.left,
            right: windowWidth - insets.right,
            bottom: windowHeight - insets.bottom,
            width: Math.max(0, windowWidth - insets.left - insets.right),
            height: Math.max(0, windowHeight - insets.top - insets.bottom)
          },
          safeAreaInsets: insets
        };
      }
    } catch (e) {
      console.error('[DouyinPlatform] getSystemInfoSync error:', e);
    }

    return {
      screenWidth: 750,
      screenHeight: 1334,
      windowWidth: 750,
      windowHeight: 1334,
      pixelRatio: 2,
      platform: 'devtools',
      brand: 'ByteDance',
      model: 'MiniGameDevice',
      statusBarHeight: insets.top,
      safeArea: {
        top: insets.top,
        left: insets.left,
        right: 750 - insets.right,
        bottom: 1334 - insets.bottom,
        width: Math.max(0, 750 - insets.left - insets.right),
        height: Math.max(0, 1334 - insets.top - insets.bottom)
      },
      safeAreaInsets: insets
    };
  }

  public createInnerAudioContext(): IInnerAudioContext {
    return new DouyinInnerAudioContext();
  }

  public playAudio(src: string, loopOrOptions?: boolean | { loop?: boolean; volume?: number }): IInnerAudioContext {
    const audio = this.createInnerAudioContext();
    audio.src = src;

    if (typeof loopOrOptions === 'boolean') {
      audio.loop = loopOrOptions;
    } else if (typeof loopOrOptions === 'object') {
      if (loopOrOptions.loop !== undefined) audio.loop = loopOrOptions.loop;
      if (loopOrOptions.volume !== undefined) audio.volume = loopOrOptions.volume;
    }

    audio.play();
    return audio;
  }

  public vibrateShort(type: HapticFeedbackType = 'medium'): void {
    if (typeof tt === 'undefined' || tt === null || typeof tt.vibrateShort !== 'function') return;

    try {
      tt.vibrateShort({
        type,
        fail: () => {
          try {
            tt.vibrateShort({});
          } catch {}
        }
      });
    } catch {
      try {
        tt.vibrateShort({});
      } catch {}
    }
  }

  public vibrateLong(): void {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.vibrateLong === 'function') {
      try {
        tt.vibrateLong({});
      } catch (e) {
        console.warn('[DouyinPlatform] vibrateLong failed:', e);
      }
    }
  }

  public async shareAppMessage(options: ShareOptions | string, query?: string): Promise<ShareResult> {
    const opts: ShareOptions = typeof options === 'string'
      ? { title: options, query }
      : options;

    if (typeof tt !== 'undefined' && tt !== null && typeof tt.shareAppMessage === 'function') {
      return new Promise<ShareResult>((resolve) => {
        tt.shareAppMessage({
          title: opts.title,
          imageUrl: opts.imageUrl,
          query: opts.query,
          desc: opts.desc,
          success: () => resolve({ success: true }),
          fail: (err: any) => resolve({ success: false, errMsg: err?.errMsg || 'Share failed' })
        });
      });
    }

    return { success: true };
  }

  public onShareAppMessage(handler: () => ShareOptions): void {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.onShareAppMessage === 'function') {
      tt.onShareAppMessage(() => {
        const opts = handler();
        return {
          title: opts.title,
          imageUrl: opts.imageUrl,
          query: opts.query,
          desc: opts.desc
        };
      });
    }
  }

  public async shareVideo(options: {
    videoPath: string;
    title?: string;
    topics?: string[];
    query?: string;
  }): Promise<ShareResult> {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.shareAppMessage === 'function') {
      return new Promise<ShareResult>((resolve) => {
        try {
          tt.shareAppMessage({
            channel: 'video',
            title: options.title || '我在《孤城神机营》防守大捷，快来与我并肩作战！',
            query: options.query,
            extra: {
              videoPath: options.videoPath,
              videoTopics: options.topics || ['#孤城神机营']
            },
            success: () => resolve({ success: true }),
            fail: (err: any) => resolve({ success: false, errMsg: err?.errMsg || 'Video share failed' })
          });
        } catch (e: any) {
          resolve({ success: false, errMsg: e?.message || 'Video share exception' });
        }
      });
    }

    return { success: true };
  }

  public async checkScene(scene: 'sidebar' | 'desktop'): Promise<boolean> {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.checkScene === 'function') {
      return new Promise<boolean>((resolve) => {
        try {
          tt.checkScene({
            scene,
            success: (res: any) => resolve(!!res?.isExist),
            fail: () => resolve(false)
          });
        } catch {
          resolve(false);
        }
      });
    }
    return false;
  }

  public async navigateToScene(scene: 'sidebar' | 'desktop'): Promise<boolean> {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.navigateToScene === 'function') {
      return new Promise<boolean>((resolve) => {
        try {
          tt.navigateToScene({
            scene,
            success: () => resolve(true),
            fail: () => resolve(false)
          });
        } catch {
          resolve(false);
        }
      });
    }
    return false;
  }

  public async showRewardedVideoAd(adUnitId: string): Promise<RewardedVideoAdResult> {
    if (typeof tt === 'undefined' || tt === null || typeof tt.createRewardedVideoAd !== 'function') {
      console.warn('[DouyinPlatform] RewardedVideoAd API not available in current environment');
      return { isEnded: false, error: 'API_NOT_SUPPORTED' };
    }

    let ad = this.adInstances.get(adUnitId);
    if (!ad) {
      try {
        ad = tt.createRewardedVideoAd({ adUnitId });
        this.adInstances.set(adUnitId, ad);
      } catch (e: any) {
        console.error('[DouyinPlatform] createRewardedVideoAd failed:', e);
        return { isEnded: false, error: e?.errMsg || 'CREATE_AD_FAILED' };
      }
    }

    return new Promise<RewardedVideoAdResult>((resolve) => {
      let resolved = false;

      const cleanup = () => {
        if (ad && typeof ad.offClose === 'function') {
          ad.offClose(onCloseCallback);
        }
        if (ad && typeof ad.offError === 'function') {
          ad.offError(onErrorCallback);
        }
      };

      const onCloseCallback = (res: { isEnded?: boolean }) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve({ isEnded: !!res?.isEnded });
      };

      const onErrorCallback = (err: any) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        console.error('[DouyinPlatform] RewardedVideoAd error:', err);
        // Error recovery: invalidate cached instance so subsequent calls re-create
        this.adInstances.delete(adUnitId);
        try {
          if (ad && typeof ad.destroy === 'function') {
            ad.destroy();
          }
        } catch {}
        resolve({ isEnded: false, error: err?.errMsg || 'AD_LOAD_OR_SHOW_ERROR' });
      };

      ad.onClose(onCloseCallback);
      ad.onError(onErrorCallback);

      ad.show().catch(() => {
        ad.load()
          .then(() => ad.show())
          .catch((loadErr: any) => {
            onErrorCallback(loadErr);
          });
      });
    });
  }

  public async showRewardedAd(adUnitId: string): Promise<boolean> {
    const res = await this.showRewardedVideoAd(adUnitId);
    return res.isEnded;
  }

  public getStorageSync<T = any>(key: string): T | null {
    if (typeof tt === 'undefined' || tt === null || typeof tt.getStorageSync !== 'function') {
      return null;
    }
    try {
      const res = tt.getStorageSync(key);
      if (res === '' || res === undefined || res === null) {
        return null;
      }
      if (typeof res === 'string') {
        try {
          return JSON.parse(res);
        } catch {
          return res as unknown as T;
        }
      }
      return res as T;
    } catch (e) {
      console.warn('[DouyinPlatform] getStorageSync error:', e);
      return null;
    }
  }

  public setStorageSync<T = any>(key: string, data: T): void {
    if (typeof tt === 'undefined' || tt === null || typeof tt.setStorageSync !== 'function') {
      return;
    }
    try {
      const val = typeof data === 'object' && data !== null ? JSON.stringify(data) : data;
      tt.setStorageSync(key, val);
    } catch (e) {
      console.error('[DouyinPlatform] setStorageSync error:', e);
    }
  }

  public removeStorageSync(key: string): void {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.removeStorageSync === 'function') {
      try {
        tt.removeStorageSync(key);
      } catch (e) {
        console.warn('[DouyinPlatform] removeStorageSync error:', e);
      }
    }
  }

  public clearStorageSync(): void {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.clearStorageSync === 'function') {
      try {
        tt.clearStorageSync();
      } catch (e) {
        console.warn('[DouyinPlatform] clearStorageSync error:', e);
      }
    }
  }

  public onTouchStart(callback: (e: any) => void): void {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.onTouchStart === 'function') {
      tt.onTouchStart(callback);
    }
  }

  public onTouchMove(callback: (e: any) => void): void {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.onTouchMove === 'function') {
      tt.onTouchMove(callback);
    }
  }

  public onTouchEnd(callback: (e: any) => void): void {
    if (typeof tt !== 'undefined' && tt !== null && typeof tt.onTouchEnd === 'function') {
      tt.onTouchEnd(callback);
    }
  }
}
