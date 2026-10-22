/**
 * 《孤城神机营》- SoundManager (Facade & Unified Audio Interface)
 * Facade pattern providing 100% backward-compatible API for existing presentation code
 * while exposing the complete new procedural Web Audio suite:
 *  - 3-Tier Audio Bus mixing & equal-power crossfader
 *  - Lookahead BGM music sequencer (Lobby, Battle, Boss)
 *  - 18+ High-fidelity procedural battlefield and UI SFX
 *  - Platform storage persistence and mute controls
 */

import { AudioContextManager } from './audio-context-manager';
import { AudioBus } from './audio-bus';
import { MusicSequencer } from './music-sequencer';
import { ProceduralSfx } from './procedural-sfx';
import { ALL_BGM_TRACKS, BgmTrackConfig } from './bgm-tracks';

export class SoundManager {
  private static instance: SoundManager | null = null;

  private contextManager: AudioContextManager;
  private audioBus: AudioBus;
  private sequencer: MusicSequencer;
  private sfx: ProceduralSfx;

  private currentBgmId: 'lobby' | 'battle' | 'boss' | 'none' = 'none';

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Resets all singletons for test isolation
   */
  public static resetForTesting(): void {
    if (SoundManager.instance) {
      SoundManager.instance.stopBgm();
    }
    MusicSequencer.resetForTesting();
    AudioBus.resetForTesting();
    ProceduralSfx.resetForTesting();
    AudioContextManager.resetForTesting();
    SoundManager.instance = null;
  }

  constructor() {
    this.contextManager = AudioContextManager.getInstance();
    this.audioBus = AudioBus.getInstance();
    this.sequencer = MusicSequencer.getInstance();
    this.sfx = ProceduralSfx.getInstance();
  }

  /**
   * Resumes AudioContext on user interaction if suspended (browser autoplay policy)
   */
  public resume(): void {
    this.contextManager.resume().catch(() => {});
  }

  // =========================================================================
  // Master & Track Volume Controls
  // =========================================================================

  public setMasterVolume(val: number): void {
    this.audioBus.setMasterVolume(val);
  }

  public getMasterVolume(): number {
    return this.audioBus.getMasterVolume();
  }

  public setBgmVolume(val: number): void {
    this.audioBus.setBgmVolume(val);
  }

  public getBgmVolume(): number {
    return this.audioBus.getBgmVolume();
  }

  public setSfxVolume(val: number): void {
    this.audioBus.setSfxVolume(val);
  }

  public getSfxVolume(): number {
    return this.audioBus.getSfxVolume();
  }

  // =========================================================================
  // Mute Controls (100% Backward Compatible)
  // =========================================================================

  public setMuted(muted: boolean): void {
    this.audioBus.setMuted(muted);
  }

  public toggleMute(): boolean {
    return this.audioBus.toggleMute();
  }

  public getIsMuted(): boolean {
    return this.audioBus.isMuted();
  }

  public setBgmMuted(muted: boolean): void {
    this.audioBus.setBgmMuted(muted);
  }

  public toggleBgmMute(): boolean {
    return this.audioBus.toggleBgmMute();
  }

  public isBgmMuted(): boolean {
    return this.audioBus.isBgmSilenced();
  }

  public setSfxMuted(muted: boolean): void {
    this.audioBus.setSfxMuted(muted);
  }

  public toggleSfxMute(): boolean {
    return this.audioBus.toggleSfxMute();
  }

  public isSfxMuted(): boolean {
    return this.audioBus.isSfxSilenced();
  }

  // =========================================================================
  // BGM Playback & Crossfading Controls
  // =========================================================================

  public playLobbyBgm(): void {
    this.fadeBgmTo('lobby');
  }

  public playBattleBgm(): void {
    this.fadeBgmTo('battle');
  }

  public playBossBgm(): void {
    this.fadeBgmTo('boss');
  }

  /**
   * Smoothly crossfades to target track over durationSec
   */
  public fadeBgmTo(trackId: 'lobby' | 'battle' | 'boss', durationSec: number = 1.2): void {
    if (this.currentBgmId === trackId && this.sequencer.isPlaying()) {
      return;
    }

    this.resume();
    const trackConfig: BgmTrackConfig = ALL_BGM_TRACKS[trackId];
    if (!trackConfig) return;

    if (!this.sequencer.isPlaying()) {
      // Direct start on active track bus
      const active = this.audioBus.getActiveTrack();
      this.sequencer.playTrack(trackConfig, active);
      this.currentBgmId = trackId;
      return;
    }

    // Crossfade: start new track on the inactive track bus, then crossfade
    const targetBus = this.audioBus.getInactiveTrack();
    this.audioBus.crossfadeTo(targetBus, durationSec);
    this.sequencer.setTargetTrackBus(targetBus);
    this.sequencer.playTrack(trackConfig, targetBus);
    this.currentBgmId = trackId;
  }

  public stopBgm(): void {
    this.sequencer.stop();
    this.currentBgmId = 'none';
  }

  public pauseBgm(): void {
    this.sequencer.pause();
  }

  public resumeBgm(): void {
    this.sequencer.resume();
  }

  public getCurrentBgm(): 'lobby' | 'battle' | 'boss' | 'none' {
    return this.currentBgmId;
  }

  // =========================================================================
  // Procedural SFX Methods (Backward-compatible & New additions)
  // =========================================================================

  /**
   * Gunshot / Arquebus shot (Fire Lance / Shenji gun)
   */
  public playGunshot(): void {
    this.resume();
    this.sfx.playArquebusShot();
  }

  public playArquebusShot(): void {
    this.playGunshot();
  }

  /**
   * Heavy Cannon blast
   */
  public playCannonBlast(): void {
    this.resume();
    this.sfx.playCannonBlast();
  }

  /**
   * Bow twang / Crossbow shot
   */
  public playBowTwang(): void {
    this.resume();
    this.sfx.playCrossbowTwang();
  }

  public playCrossbowTwang(): void {
    this.playBowTwang();
  }

  /**
   * Nest of Bees rocket volley whistle
   */
  public playRocketVolley(): void {
    this.resume();
    this.sfx.playRocketVolley();
  }

  /**
   * Sword / blade clash metal clank
   */
  public playBladeClank(): void {
    this.resume();
    this.sfx.playBladeClank();
  }

  /**
   * Shield bash thud
   */
  public playShieldBash(): void {
    this.resume();
    this.sfx.playShieldBash();
  }

  /**
   * Critical strike gong crash
   */
  public playCritGong(): void {
    this.resume();
    this.sfx.playCritGong();
  }

  /**
   * Wall hit impact
   */
  public playWallHit(): void {
    this.resume();
    this.sfx.playWallHit();
  }

  /**
   * Enemy ink death dissolve
   */
  public playEnemyDeath(): void {
    this.resume();
    this.sfx.playEnemyDeath();
  }

  // --- Elemental Reactions ---

  public playFireBlastReaction(): void {
    this.resume();
    this.sfx.playFireBlastReaction();
  }

  public playThunderJudgementReaction(): void {
    this.resume();
    this.sfx.playThunderJudgementReaction();
  }

  public playIceShatterReaction(): void {
    this.resume();
    this.sfx.playIceShatterReaction();
  }

  public playNetherPoisonReaction(): void {
    this.resume();
    this.sfx.playNetherPoisonReaction();
  }

  // --- UI & Economy ---

  public playBronzeButtonClick(): void {
    this.resume();
    this.sfx.playBronzeButtonClick();
  }

  public playVermilionStamp(): void {
    this.resume();
    this.sfx.playVermilionStamp();
  }

  public playCoinJingle(): void {
    this.resume();
    this.sfx.playCoinJingle();
  }

  public playIronClink(): void {
    this.resume();
    this.sfx.playIronClink();
  }

  public playMergeChime(): void {
    this.resume();
    this.sfx.playMergeChime();
  }

  public playVictoryFanfare(): void {
    this.resume();
    this.sfx.playVictoryFanfare();
  }

  public playDefeatSound(): void {
    this.resume();
    this.sfx.playDefeatSound();
  }

  public playUltimateVoice(): void {
    this.resume();
    this.sfx.playUltimateVoice();
  }

  public playClick(): void {
    this.resume();
    this.sfx.playClick();
  }

  public playWarDrums(): void {
    this.resume();
    this.sfx.playWarDrums();
  }

  public playBossAlert(): void {
    this.resume();
    this.sfx.playBossAlert();
  }

  // =========================================================================
  // Architectural Accessors
  // =========================================================================

  public getContextManager(): AudioContextManager {
    return this.contextManager;
  }

  public getAudioBus(): AudioBus {
    return this.audioBus;
  }

  public getSequencer(): MusicSequencer {
    return this.sequencer;
  }

  public getProceduralSfx(): ProceduralSfx {
    return this.sfx;
  }
}
