/**
 * 《孤城神机营》- Platform Bridge Interface Specification
 * Unified cross-platform abstraction for Web (HTML5) and ByteDance Mini-Game (tt).
 */

export interface SystemInfo {
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  pixelRatio: number;
  platform: 'ios' | 'android' | 'devtools' | 'web';
  brand?: string;
  model?: string;
  system?: string;
  safeArea?: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  statusBarHeight?: number;
  safeAreaInsets?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface IInnerAudioContext {
  src: string;
  startTime: number;
  autoplay: boolean;
  loop: boolean;
  volume: number;
  duration: number;
  currentTime: number;
  paused: boolean;
  play(): void;
  pause(): void;
  stop(): void;
  seek(position: number): void;
  destroy(): void;
  onCanplay(callback: () => void): void;
  onPlay(callback: () => void): void;
  onPause(callback: () => void): void;
  onStop(callback: () => void): void;
  onEnded(callback: () => void): void;
  onError(callback: (err: { errMsg: string; errCode?: number }) => void): void;
}

export type HapticFeedbackType = 'light' | 'medium' | 'heavy';

export interface ShareOptions {
  title: string;
  imageUrl?: string;
  query?: string;
  desc?: string;
}

export interface ShareResult {
  success: boolean;
  errMsg?: string;
}

export interface RewardedVideoAdResult {
  isEnded: boolean; // true = watched completely, reward granted; false = closed early
  error?: string;
}

export interface IGameRecorder {
  start(options?: { duration?: number }): void;
  pause(): void;
  resume(): void;
  stop(): void;
  onStart(cb: () => void): void;
  onStop(cb: (res: { videoPath: string }) => void): void;
  onError(cb: (err: any) => void): void;
  isRecording(): boolean;
}

export interface VideoShareOptions {
  videoPath: string;
  title?: string;
  topics?: string[];
  query?: string;
}

export interface IPlatform {
  readonly type: 'web' | 'douyin' | 'wechat';

  /**
   * Returns true if running in ByteDance Mini Game environment
   */
  isByteDance(): boolean;

  /**
   * Compatibility alias for PROJECT.md contract
   */
  isByteDanceMiniGame(): boolean;

  /**
   * Returns true if running in WeChat Mini Game environment
   */
  isWechat?(): boolean;

  /**
   * Retrieves screen and viewport metrics
   */
  getSystemInfo(): SystemInfo;

  /**
   * Returns calculated safe area insets (top, bottom, left, right)
   */
  getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number };

  /**
   * Creates an InnerAudioContext instance for music/SFX
   */
  createInnerAudioContext(): IInnerAudioContext;

  /**
   * Quick audio playback helper
   */
  playAudio(src: string, loop?: boolean | { loop?: boolean; volume?: number }): IInnerAudioContext;

  /**
   * Triggers haptic feedback
   */
  vibrateShort(type?: HapticFeedbackType): void;
  vibrateLong(): void;

  /**
   * Triggers social sharing
   */
  shareAppMessage(options: ShareOptions | string, query?: string): Promise<ShareResult>;

  /**
   * Registers passive share handler (top-right menu)
   */
  onShareAppMessage(handler: () => ShareOptions): void;

  /**
   * Game screen recorder management
   */
  getGameRecorder(): IGameRecorder | null;

  /**
   * Shares a recorded gameplay video to ByteDance / Social feed
   */
  shareVideo(options: { videoPath: string; title?: string; topics?: string[]; query?: string }): Promise<ShareResult>;

  /**
   * Checks whether the target scene (sidebar, desktop, etc.) exists / is supported
   */
  checkScene(scene: 'sidebar' | 'desktop'): Promise<boolean>;

  /**
   * Navigates or prompts the user to enter the target scene
   */
  navigateToScene(scene: 'sidebar' | 'desktop'): Promise<boolean>;

  /**
   * Shows rewarded video ad (IAA) and resolves with watch status
   */
  showRewardedVideoAd(adUnitId: string): Promise<RewardedVideoAdResult>;

  /**
   * Compatibility alias for PROJECT.md contract (returns boolean: true if rewarded)
   */
  showRewardedAd(adUnitId: string): Promise<boolean>;

  /**
   * Synchronous persistent key-value storage
   */
  getStorageSync<T = any>(key: string): T | null;
  setStorageSync<T = any>(key: string, data: T): void;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;

  /**
   * Touch event listeners (for platforms with native touch dispatch)
   */
  onTouchStart?(callback: (e: any) => void): void;
  onTouchMove?(callback: (e: any) => void): void;
  onTouchEnd?(callback: (e: any) => void): void;
}
