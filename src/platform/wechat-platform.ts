/**
 * 《孤城神机营》- WeChat Mini Game Platform Adapter Implementation
 * Encapsulates WeChat 'wx' runtime APIs for cross-platform compliance.
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

// Declare WeChat global namespace
declare const wx: any;

class WechatInnerAudioContext implements IInnerAudioContext {
  private rawContext: any;

  constructor() {
    if (typeof wx !== 'undefined' && wx !== null && typeof wx.createInnerAudioContext === 'function') {
      try {
        this.rawContext = wx.createInnerAudioContext();
      } catch {
        this.rawContext = null;
      }
    }
    if (!this.rawContext) {
      // Mock fallback stub
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
    if (typeof this.rawContext.play === 'function') {
      this.rawContext.play();
    }
  }

  public pause(): void {
    if (typeof this.rawContext.pause === 'function') {
      this.rawContext.pause();
    }
  }

  public stop(): void {
    if (typeof this.rawContext.stop === 'function') {
      this.rawContext.stop();
    }
  }

  public seek(position: number): void {
    if (typeof this.rawContext.seek === 'function') {
      this.rawContext.seek(position);
    }
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

export class WechatPlatform implements IPlatform {
  public readonly type = 'wechat' as const;

  // Cached RewardedVideoAd instances by adUnitId to avoid redundant creation
  private adInstances: Map<string, any> = new Map();

  public isByteDance(): boolean {
    return false;
  }

  public isByteDanceMiniGame(): boolean {
    return false;
  }

  public isWechat(): boolean {
    return true;
  }

  public getGameRecorder(): IGameRecorder | null {
    // WeChat Mini Game does not provide native continuous screen recording manager like ByteDance
    return null;
  }

  public getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    try {
      if (typeof wx !== 'undefined' && wx !== null) {
        let info: any = null;
        if (typeof wx.getSystemInfoSync === 'function') {
          info = wx.getSystemInfoSync();
        } else if (typeof wx.getWindowInfo === 'function') {
          info = wx.getWindowInfo();
        }

        if (info) {
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
      }
    } catch (e) {
      console.warn('[WechatPlatform] getSafeAreaInsets error:', e);
    }

    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  public getSystemInfo(): SystemInfo {
    const insets = this.getSafeAreaInsets();
    try {
      if (typeof wx !== 'undefined' && wx !== null) {
        let info: any = null;
        if (typeof wx.getSystemInfoSync === 'function') {
          info = wx.getSystemInfoSync();
        } else if (typeof wx.getWindowInfo === 'function') {
          info = wx.getWindowInfo();
        }

        if (info) {
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
            brand: info.brand || 'WeChat',
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
      }
    } catch (e) {
      console.error('[WechatPlatform] getSystemInfo error:', e);
    }

    return {
      screenWidth: 750,
      screenHeight: 1334,
      windowWidth: 750,
      windowHeight: 1334,
      pixelRatio: 2,
      platform: 'devtools',
      brand: 'WeChat',
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
    return new WechatInnerAudioContext();
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
    if (typeof wx === 'undefined' || wx === null || typeof wx.vibrateShort !== 'function') return;

    try {
      wx.vibrateShort({
        type,
        fail: () => {
          try {
            wx.vibrateShort({});
          } catch {}
        }
      });
    } catch {
      try {
        wx.vibrateShort({});
      } catch {}
    }
  }

  public vibrateLong(): void {
    if (typeof wx !== 'undefined' && wx !== null && typeof wx.vibrateLong === 'function') {
      try {
        wx.vibrateLong({});
      } catch (e) {
        console.warn('[WechatPlatform] vibrateLong failed:', e);
      }
    }
  }

  public async shareAppMessage(options: ShareOptions | string, query?: string): Promise<ShareResult> {
    const opts: ShareOptions = typeof options === 'string'
      ? { title: options, query }
      : options;

    if (typeof wx !== 'undefined' && wx !== null && typeof wx.shareAppMessage === 'function') {
      return new Promise<ShareResult>((resolve) => {
        try {
          wx.shareAppMessage({
            title: opts.title,
            imageUrl: opts.imageUrl,
            query: opts.query,
            success: () => resolve({ success: true }),
            fail: (err: any) => resolve({ success: false, errMsg: err?.errMsg || 'Share failed' })
          });
        } catch (e: any) {
          resolve({ success: false, errMsg: e?.message || 'Share exception' });
        }
      });
    }

    return { success: true };
  }

  public onShareAppMessage(handler: () => ShareOptions): void {
    if (typeof wx !== 'undefined' && wx !== null && typeof wx.onShareAppMessage === 'function') {
      wx.onShareAppMessage(() => {
        const opts = handler();
        return {
          title: opts.title,
          imageUrl: opts.imageUrl,
          query: opts.query
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
    // Fallback to social share on WeChat
    return this.shareAppMessage({
      title: options.title || '我在《孤城神机营》防守大捷，快来与我并肩作战！',
      query: options.query
    });
  }

  public async checkScene(_scene: 'sidebar' | 'desktop'): Promise<boolean> {
    return false;
  }

  public async navigateToScene(_scene: 'sidebar' | 'desktop'): Promise<boolean> {
    return false;
  }

  public async showRewardedVideoAd(adUnitId: string): Promise<RewardedVideoAdResult> {
    if (typeof wx === 'undefined' || wx === null || typeof wx.createRewardedVideoAd !== 'function') {
      console.warn('[WechatPlatform] RewardedVideoAd API not available in current environment');
      return { isEnded: false, error: 'API_NOT_SUPPORTED' };
    }

    let ad = this.adInstances.get(adUnitId);
    if (!ad) {
      try {
        ad = wx.createRewardedVideoAd({ adUnitId });
        this.adInstances.set(adUnitId, ad);
      } catch (e: any) {
        console.error('[WechatPlatform] createRewardedVideoAd failed:', e);
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
        console.error('[WechatPlatform] RewardedVideoAd error:', err);
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
    if (typeof wx === 'undefined' || wx === null || typeof wx.getStorageSync !== 'function') {
      return null;
    }
    try {
      const res = wx.getStorageSync(key);
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
      console.warn('[WechatPlatform] getStorageSync error:', e);
      return null;
    }
  }

  public setStorageSync<T = any>(key: string, data: T): void {
    if (typeof wx === 'undefined' || wx === null || typeof wx.setStorageSync !== 'function') {
      return;
    }
    try {
      const val = typeof data === 'object' && data !== null ? JSON.stringify(data) : data;
      wx.setStorageSync(key, val);
    } catch (e) {
      console.error('[WechatPlatform] setStorageSync error:', e);
    }
  }

  public removeStorageSync(key: string): void {
    if (typeof wx !== 'undefined' && wx !== null && typeof wx.removeStorageSync === 'function') {
      try {
        wx.removeStorageSync(key);
      } catch (e) {
        console.warn('[WechatPlatform] removeStorageSync error:', e);
      }
    }
  }

  public clearStorageSync(): void {
    if (typeof wx !== 'undefined' && wx !== null && typeof wx.clearStorageSync === 'function') {
      try {
        wx.clearStorageSync();
      } catch (e) {
        console.warn('[WechatPlatform] clearStorageSync error:', e);
      }
    }
  }

  public onTouchStart(callback: (e: any) => void): void {
    if (typeof wx !== 'undefined' && wx !== null && typeof wx.onTouchStart === 'function') {
      wx.onTouchStart(callback);
    }
  }

  public onTouchMove(callback: (e: any) => void): void {
    if (typeof wx !== 'undefined' && wx !== null && typeof wx.onTouchMove === 'function') {
      wx.onTouchMove(callback);
    }
  }

  public onTouchEnd(callback: (e: any) => void): void {
    if (typeof wx !== 'undefined' && wx !== null && typeof wx.onTouchEnd === 'function') {
      wx.onTouchEnd(callback);
    }
  }
}
