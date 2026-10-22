/**
 * 《孤城神机营》- Web Platform Adapter Implementation
 * Standard HTML5 Browser / Node fallback implementation for IPlatform.
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

class WebInnerAudioContext implements IInnerAudioContext {
  public src: string = '';
  public startTime: number = 0;
  public autoplay: boolean = false;
  public loop: boolean = false;
  public volume: number = 1.0;
  public duration: number = 0;
  public currentTime: number = 0;
  public paused: boolean = true;

  private audioElement: HTMLAudioElement | null = null;
  private canplayHandlers: Array<() => void> = [];
  private playHandlers: Array<() => void> = [];
  private pauseHandlers: Array<() => void> = [];
  private stopHandlers: Array<() => void> = [];
  private endedHandlers: Array<() => void> = [];
  private errorHandlers: Array<(err: { errMsg: string; errCode?: number }) => void> = [];

  constructor() {
    if (typeof Audio !== 'undefined') {
      try {
        this.audioElement = new Audio();
        this.bindEvents();
      } catch {
        this.audioElement = null;
      }
    }
  }

  private bindEvents(): void {
    if (!this.audioElement) return;

    this.audioElement.addEventListener('canplay', () => {
      this.duration = this.audioElement?.duration || 0;
      this.canplayHandlers.forEach(cb => cb());
    });

    this.audioElement.addEventListener('play', () => {
      this.paused = false;
      this.playHandlers.forEach(cb => cb());
    });

    this.audioElement.addEventListener('pause', () => {
      this.paused = true;
      this.pauseHandlers.forEach(cb => cb());
    });

    this.audioElement.addEventListener('ended', () => {
      this.paused = true;
      this.endedHandlers.forEach(cb => cb());
    });

    this.audioElement.addEventListener('error', () => {
      this.errorHandlers.forEach(cb => cb({ errMsg: 'Audio playback error', errCode: -1 }));
    });
  }

  public play(): void {
    if (this.audioElement) {
      if (this.src && this.audioElement.src !== this.src) {
        this.audioElement.src = this.src;
      }
      this.audioElement.loop = this.loop;
      this.audioElement.volume = Math.max(0, Math.min(1, this.volume));
      if (this.startTime > 0) {
        this.audioElement.currentTime = this.startTime;
      }

      const promise = this.audioElement.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err) => {
          console.warn('[WebInnerAudioContext] Audio play was prevented:', err.message);
        });
      }
    }
    this.paused = false;
    this.playHandlers.forEach(cb => cb());
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.paused = true;
    this.pauseHandlers.forEach(cb => cb());
  }

  public stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.currentTime = 0;
    this.paused = true;
    this.stopHandlers.forEach(cb => cb());
  }

  public seek(position: number): void {
    this.currentTime = position;
    if (this.audioElement) {
      this.audioElement.currentTime = position;
    }
  }

  public destroy(): void {
    this.stop();
    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this.canplayHandlers = [];
    this.playHandlers = [];
    this.pauseHandlers = [];
    this.stopHandlers = [];
    this.endedHandlers = [];
    this.errorHandlers = [];
  }

  public onCanplay(callback: () => void): void {
    this.canplayHandlers.push(callback);
  }

  public onPlay(callback: () => void): void {
    this.playHandlers.push(callback);
  }

  public onPause(callback: () => void): void {
    this.pauseHandlers.push(callback);
  }

  public onStop(callback: () => void): void {
    this.stopHandlers.push(callback);
  }

  public onEnded(callback: () => void): void {
    this.endedHandlers.push(callback);
  }

  public onError(callback: (err: { errMsg: string; errCode?: number }) => void): void {
    this.errorHandlers.push(callback);
  }
}

export class MockGameRecorder implements IGameRecorder {
  private recording: boolean = false;
  private startCallbacks: Array<() => void> = [];
  private stopCallbacks: Array<(res: { videoPath: string }) => void> = [];
  private errorCallbacks: Array<(err: any) => void> = [];
  public mockVideoPath: string = 'mock_video_path.mp4';
  public shouldSimulateError: boolean = false;
  public mockErrorMessage: string = 'Simulated recording error';

  public start(options?: { duration?: number }): void {
    if (this.shouldSimulateError) {
      this.recording = false;
      this.errorCallbacks.forEach(cb => cb(new Error(this.mockErrorMessage)));
      return;
    }
    this.recording = true;
    this.startCallbacks.forEach(cb => cb());
  }

  public pause(): void {
    // pause recording
  }

  public resume(): void {
    // resume recording
  }

  public stop(): void {
    if (this.recording) {
      this.recording = false;
      this.stopCallbacks.forEach(cb => cb({ videoPath: this.mockVideoPath }));
    }
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

export class WebPlatform implements IPlatform {
  public readonly type = 'web' as const;

  // Fallback in-memory storage for headless or restricted environments
  private memoryStorage: Map<string, string> = new Map();
  private shareHandler: (() => ShareOptions) | null = null;
  private gameRecorder: MockGameRecorder | null = null;

  // Test hooks to configure mock outcomes
  public static mockAdWatchSuccess: boolean = true;
  public static mockShareVideoSuccess: boolean = true;
  public static mockCheckSceneResult: Record<string, boolean> = {
    sidebar: true,
    desktop: true
  };
  public static mockNavigateToSceneSuccess: boolean = true;
  public static mockSafeAreaInsets: { top: number; bottom: number; left: number; right: number } = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  };

  public isByteDance(): boolean {
    return false;
  }

  public isByteDanceMiniGame(): boolean {
    return false;
  }

  public isWechat(): boolean {
    return false;
  }

  public getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    return { ...WebPlatform.mockSafeAreaInsets };
  }

  public getGameRecorder(): IGameRecorder | null {
    if (!this.gameRecorder) {
      this.gameRecorder = new MockGameRecorder();
    }
    return this.gameRecorder;
  }

  public async shareVideo(options: {
    videoPath: string;
    title?: string;
    topics?: string[];
    query?: string;
  }): Promise<ShareResult> {
    console.log('[WebPlatform] Simulated Video Share:', options);
    if (!WebPlatform.mockShareVideoSuccess) {
      return { success: false, errMsg: 'Mock video share rejected' };
    }
    return { success: true };
  }

  public async checkScene(scene: 'sidebar' | 'desktop'): Promise<boolean> {
    return WebPlatform.mockCheckSceneResult[scene] ?? true;
  }

  public async navigateToScene(scene: 'sidebar' | 'desktop'): Promise<boolean> {
    console.log(`[WebPlatform] Simulated navigateToScene: ${scene}`);
    return WebPlatform.mockNavigateToSceneSuccess;
  }

  public getSystemInfo(): SystemInfo {
    const isBrowser = typeof window !== 'undefined';
    const screenWidth = isBrowser && window.screen ? window.screen.width : 750;
    const screenHeight = isBrowser && window.screen ? window.screen.height : 1334;
    const windowWidth = isBrowser ? window.innerWidth : 750;
    const windowHeight = isBrowser ? window.innerHeight : 1334;
    const pixelRatio = isBrowser ? (window.devicePixelRatio || 1) : 1;
    const insets = this.getSafeAreaInsets();

    return {
      screenWidth,
      screenHeight,
      windowWidth,
      windowHeight,
      pixelRatio,
      platform: 'web',
      brand: 'StandardBrowser',
      model: isBrowser && typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Vitest',
      statusBarHeight: insets.top,
      safeArea: {
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

  public createInnerAudioContext(): IInnerAudioContext {
    return new WebInnerAudioContext();
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
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const duration = type === 'heavy' ? 25 : type === 'light' ? 10 : 15;
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignore vibration errors
      }
    }
  }

  public vibrateLong(): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(400);
      } catch {
        // Ignore vibration errors
      }
    }
  }

  public async shareAppMessage(options: ShareOptions | string, query?: string): Promise<ShareResult> {
    const opts: ShareOptions = typeof options === 'string'
      ? { title: options, query }
      : options;

    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: opts.title,
          text: opts.desc || opts.title,
          url: opts.query ? `${window.location.origin}${window.location.pathname}?${opts.query}` : window.location.href
        });
        return { success: true };
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return { success: false, errMsg: 'User cancelled share' };
        }
      }
    }

    console.log('[WebPlatform] Simulated Share:', opts);
    return { success: true };
  }

  public onShareAppMessage(handler: () => ShareOptions): void {
    this.shareHandler = handler;
  }

  public async showRewardedVideoAd(adUnitId: string): Promise<RewardedVideoAdResult> {
    console.log(`[WebPlatform] Simulated Rewarded Video Ad (Unit: ${adUnitId})`);
    return {
      isEnded: WebPlatform.mockAdWatchSuccess
    };
  }

  public async showRewardedAd(adUnitId: string): Promise<boolean> {
    const res = await this.showRewardedVideoAd(adUnitId);
    return res.isEnded;
  }

  public getStorageSync<T = any>(key: string): T | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return raw as unknown as T;
        }
      }
    } catch {
      // localStorage disabled or security error
    }

    const memVal = this.memoryStorage.get(key);
    if (memVal === undefined) return null;
    try {
      return JSON.parse(memVal);
    } catch {
      return memVal as unknown as T;
    }
  }

  public setStorageSync<T = any>(key: string, data: T): void {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, serialized);
        return;
      }
      this.memoryStorage.set(key, serialized);
    } catch {
      // localStorage disabled, quota exceeded, or circular serialization error
      this.memoryStorage.set(key, String(data));
    }
  }

  public removeStorageSync(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
    this.memoryStorage.delete(key);
  }

  public clearStorageSync(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch {}
    this.memoryStorage.clear();
  }

  public onTouchStart(callback: (e: any) => void): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('touchstart', callback, { passive: false });
    }
  }

  public onTouchMove(callback: (e: any) => void): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('touchmove', callback, { passive: false });
    }
  }

  public onTouchEnd(callback: (e: any) => void): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('touchend', callback, { passive: false });
    }
  }
}
