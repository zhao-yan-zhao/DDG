/**
 * 《孤城神机营》- AudioBus
 * 3-Tier Audio Bus Mixing & Equal-Power Crossfader Architecture:
 *
 *   [Destination: ctx.destination]
 *             ▲
 *      [MasterGain] (Master Volume + Master Mute)
 *        ▲        ▲
 *        │        └── [SFX Bus Gain] (SFX Volume + SFX Mute)
 *        │
 *   [BGM Bus Gain] (BGM Volume + BGM Mute)
 *        ▲        ▲
 *        │        └── [Track B Gain] (Equal-power Sin/Cos Crossfader)
 *        └── [Track A Gain]
 */

import { AudioContextManager } from './audio-context-manager';
import { PlatformBridge } from '../../bridge/platform';

export interface AudioSettings {
  masterVolume: number; // 0.0 ~ 1.0
  bgmVolume: number;    // 0.0 ~ 1.0
  sfxVolume: number;    // 0.0 ~ 1.0
  isMuted: boolean;
  isBgmMuted: boolean;
  isSfxMuted: boolean;
}

const STORAGE_KEY = 'ddg_audio_settings';

export class AudioBus {
  private static instance: AudioBus | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmBusGain: GainNode | null = null;
  private sfxBusGain: GainNode | null = null;
  private trackAGain: GainNode | null = null;
  private trackBGain: GainNode | null = null;

  private activeTrack: 'A' | 'B' = 'A';
  private isCrossfading: boolean = false;

  // Audio settings state
  private masterVolume: number = 0.8;
  private bgmVolume: number = 0.7;
  private sfxVolume: number = 0.85;
  private isMasterMuted: boolean = false;
  private isBgmMuted: boolean = false;
  private isSfxMuted: boolean = false;

  private constructor() {
    this.loadSettings();
    this.initAudioGraph();
  }

  public static getInstance(): AudioBus {
    if (!AudioBus.instance) {
      AudioBus.instance = new AudioBus();
    }
    return AudioBus.instance;
  }

  /**
   * Resets singleton instance for test isolation
   */
  public static resetForTesting(): void {
    AudioBus.instance = null;
  }

  /**
   * Constructs the 3-tier Web Audio bus graph
   */
  public initAudioGraph(): void {
    this.ctx = AudioContextManager.getInstance().getContext();
    if (!this.ctx) return;

    try {
      // 1. Master Bus
      this.masterGain = this.ctx.createGain();
      const effMaster = this.isMasterMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(effMaster, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 2. SFX Bus -> Master
      this.sfxBusGain = this.ctx.createGain();
      const effSfx = this.isSfxMuted ? 0 : this.sfxVolume;
      this.sfxBusGain.gain.setValueAtTime(effSfx, this.ctx.currentTime);
      this.sfxBusGain.connect(this.masterGain);

      // 3. BGM Bus -> Master
      this.bgmBusGain = this.ctx.createGain();
      const effBgm = this.isBgmMuted ? 0 : this.bgmVolume;
      this.bgmBusGain.gain.setValueAtTime(effBgm, this.ctx.currentTime);
      this.bgmBusGain.connect(this.masterGain);

      // 4. BGM Track A & Track B -> BGM Bus
      this.trackAGain = this.ctx.createGain();
      this.trackBGain = this.ctx.createGain();

      // Initially Track A is active (1.0), Track B is silent (0.0)
      this.trackAGain.gain.setValueAtTime(this.activeTrack === 'A' ? 1.0 : 0.0, this.ctx.currentTime);
      this.trackBGain.gain.setValueAtTime(this.activeTrack === 'B' ? 1.0 : 0.0, this.ctx.currentTime);

      this.trackAGain.connect(this.bgmBusGain);
      this.trackBGain.connect(this.bgmBusGain);
    } catch (e) {
      console.warn('[AudioBus] Failed to initialize audio bus nodes:', e);
    }
  }

  /**
   * Calculates equal-power crossfade gain values for progress t in [0.0, 1.0].
   * Cosine/Sine equal-power panning formula ensures:
   *   gainA^2 + gainB^2 == 1.0 (constant acoustic power)
   */
  public static calculateEqualPowerGains(progress: number): { gainA: number; gainB: number } {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const angle = clampedProgress * (Math.PI / 2);
    const gainA = Math.cos(angle);
    const gainB = Math.sin(angle);
    return { gainA, gainB };
  }

  /**
   * Performs an equal-power crossfade to targetTrack ('A' | 'B') over durationSec
   */
  public crossfadeTo(targetTrack: 'A' | 'B', durationSec: number = 1.2): void {
    if (this.activeTrack === targetTrack && !this.isCrossfading) {
      return;
    }

    this.activeTrack = targetTrack;
    this.isCrossfading = true;

    if (!this.ctx || !this.trackAGain || !this.trackBGain) {
      this.isCrossfading = false;
      return;
    }

    const t = this.ctx.currentTime;
    const steps = 32;
    const curveA = new Float32Array(steps);
    const curveB = new Float32Array(steps);

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const { gainA, gainB } = AudioBus.calculateEqualPowerGains(progress);
      if (targetTrack === 'B') {
        // Fading from A to B
        curveA[i] = gainA; // cos: 1 -> 0
        curveB[i] = gainB; // sin: 0 -> 1
      } else {
        // Fading from B to A
        curveA[i] = gainB; // sin: 0 -> 1
        curveB[i] = gainA; // cos: 1 -> 0
      }
    }

    try {
      this.trackAGain.gain.cancelScheduledValues(t);
      this.trackBGain.gain.cancelScheduledValues(t);

      this.trackAGain.gain.setValueCurveAtTime(curveA, t, durationSec);
      this.trackBGain.gain.setValueCurveAtTime(curveB, t, durationSec);
    } catch {
      // Fallback if setValueCurveAtTime fails or is unsupported
      const finalA = targetTrack === 'A' ? 1.0 : 0.0;
      const finalB = targetTrack === 'B' ? 1.0 : 0.0;
      this.trackAGain.gain.setValueAtTime(finalA, t + durationSec);
      this.trackBGain.gain.setValueAtTime(finalB, t + durationSec);
    }

    setTimeout(() => {
      this.isCrossfading = false;
    }, durationSec * 1000);
  }

  // --- Volume Controls ---

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMasterMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setBgmVolume(val: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmBusGain && this.ctx && !this.isBgmMuted) {
      this.bgmBusGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setSfxVolume(val: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxBusGain && this.ctx && !this.isSfxMuted) {
      this.sfxBusGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  // --- Mute Toggles ---

  public setMuted(muted: boolean): void {
    this.isMasterMuted = muted;
    if (this.masterGain && this.ctx) {
      const val = muted ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMasterMuted);
    return this.isMasterMuted;
  }

  public isMuted(): boolean {
    return this.isMasterMuted;
  }

  public setBgmMuted(muted: boolean): void {
    this.isBgmMuted = muted;
    if (this.bgmBusGain && this.ctx) {
      const val = muted ? 0 : this.bgmVolume;
      this.bgmBusGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public toggleBgmMute(): boolean {
    this.setBgmMuted(!this.isBgmMuted);
    return this.isBgmMuted;
  }

  public isBgmSilenced(): boolean {
    return this.isBgmMuted || this.isMasterMuted;
  }

  public setSfxMuted(muted: boolean): void {
    this.isSfxMuted = muted;
    if (this.sfxBusGain && this.ctx) {
      const val = muted ? 0 : this.sfxVolume;
      this.sfxBusGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public toggleSfxMute(): boolean {
    this.setSfxMuted(!this.isSfxMuted);
    return this.isSfxMuted;
  }

  public isSfxSilenced(): boolean {
    return this.isSfxMuted || this.isMasterMuted;
  }

  // --- Bus Node Getters ---

  public getMasterGainNode(): GainNode | null {
    return this.masterGain;
  }

  public getBgmBusNode(): GainNode | null {
    return this.bgmBusGain;
  }

  public getSfxBusNode(): GainNode | null {
    return this.sfxBusGain;
  }

  public getTrackAGainNode(): GainNode | null {
    return this.trackAGain;
  }

  public getTrackBGainNode(): GainNode | null {
    return this.trackBGain;
  }

  public getActiveTrack(): 'A' | 'B' {
    return this.activeTrack;
  }

  public getInactiveTrack(): 'A' | 'B' {
    return this.activeTrack === 'A' ? 'B' : 'A';
  }

  public getActiveTrackNode(): GainNode | null {
    return this.activeTrack === 'A' ? this.trackAGain : this.trackBGain;
  }

  public getInactiveTrackNode(): GainNode | null {
    return this.activeTrack === 'A' ? this.trackBGain : this.trackAGain;
  }

  // --- Persistence ---

  private loadSettings(): void {
    try {
      const platform = PlatformBridge.getPlatform();
      const saved = platform.getStorageSync<AudioSettings>(STORAGE_KEY);
      if (saved && typeof saved === 'object') {
        if (typeof saved.masterVolume === 'number') this.masterVolume = saved.masterVolume;
        if (typeof saved.bgmVolume === 'number') this.bgmVolume = saved.bgmVolume;
        if (typeof saved.sfxVolume === 'number') this.sfxVolume = saved.sfxVolume;
        if (typeof saved.isMuted === 'boolean') this.isMasterMuted = saved.isMuted;
        if (typeof saved.isBgmMuted === 'boolean') this.isBgmMuted = saved.isBgmMuted;
        if (typeof saved.isSfxMuted === 'boolean') this.isSfxMuted = saved.isSfxMuted;
      }
    } catch {
      // Ignore storage loading errors
    }
  }

  private saveSettings(): void {
    try {
      const platform = PlatformBridge.getPlatform();
      const settings: AudioSettings = {
        masterVolume: this.masterVolume,
        bgmVolume: this.bgmVolume,
        sfxVolume: this.sfxVolume,
        isMuted: this.isMasterMuted,
        isBgmMuted: this.isBgmMuted,
        isSfxMuted: this.isSfxMuted
      };
      platform.setStorageSync(STORAGE_KEY, settings);
    } catch {
      // Ignore storage saving errors
    }
  }
}
