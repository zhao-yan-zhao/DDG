/**
 * 《孤城神机营》- Platform Bridge Factory & Index
 * Automatic detection, singleton provider, and cross-platform facade.
 */

import { IPlatform } from './platform-interface';
import { WebPlatform } from './web-platform';
import { DouyinPlatform } from './douyin-platform';
import { WechatPlatform } from './wechat-platform';

// Global declarations for ByteDance and WeChat namespace checks
declare const tt: any;
declare const wx: any;

export class PlatformBridge {
  private static instance: IPlatform | null = null;

  /**
   * Retrieves or lazily creates the platform singleton instance.
   * Auto-detects ByteDance Mini Game runtime via global 'tt',
   * or WeChat Mini Game runtime via global 'wx'.
   */
  public static getPlatform(): IPlatform {
    if (!this.instance) {
      if (typeof tt !== 'undefined' && tt !== null && typeof tt.getSystemInfoSync === 'function') {
        this.instance = new DouyinPlatform();
      } else if (typeof wx !== 'undefined' && wx !== null && (typeof wx.getSystemInfoSync === 'function' || typeof wx.getWindowInfo === 'function')) {
        this.instance = new WechatPlatform();
      } else {
        this.instance = new WebPlatform();
      }
    }
    return this.instance;
  }

  /**
   * Overrides the current platform instance (primarily for automated testing).
   */
  public static setPlatform(platform: IPlatform | null): void {
    this.instance = platform;
  }

  /**
   * Resets the singleton instance, forcing re-detection on next getPlatform().
   */
  public static reset(): void {
    this.instance = null;
  }
}

/**
 * Convenience helper to get the active platform instance
 */
export const getPlatform = (): IPlatform => PlatformBridge.getPlatform();

export * from './platform-interface';
export * from './web-platform';
export * from './douyin-platform';
export * from './wechat-platform';
