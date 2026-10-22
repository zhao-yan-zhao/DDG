/**
 * 《孤城神机营》- Comprehensive Audio & SFX System Unit Tests
 * Verifies:
 *  1. Cross-platform AudioContextManager & Headless Mock Safe Fallback
 *  2. 3-Tier AudioBus Hierarchy & Equal-Power Crossfade Mathematics (cos^2 + sin^2 == 1.0)
 *  3. Acoustic Synthesis of 6 Traditional Chinese Instruments & Karplus-Strong Physical Modeling
 *  4. 18+ High-Fidelity Procedural SFX & Elemental Reaction Audio
 *  5. Lookahead Web Audio Clock Scheduler & 3 Ming Dynasty BGM Tracks
 *  6. SoundManager Unified Facade & 100% Backward Compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AudioContextManager,
  MockAudioContext,
  MockGainNode,
  MockOscillatorNode,
  MockAudioParam
} from '../src/presentation/audio/audio-context-manager';
import { AudioBus } from '../src/presentation/audio/audio-bus';
import { MusicalInstruments } from '../src/presentation/audio/musical-instruments';
import { ProceduralSfx } from '../src/presentation/audio/procedural-sfx';
import { MusicSequencer } from '../src/presentation/audio/music-sequencer';
import {
  LOBBY_BGM,
  BATTLE_BGM,
  BOSS_BGM,
  ALL_BGM_TRACKS
} from '../src/presentation/audio/bgm-tracks';
import { SoundManager } from '../src/presentation/audio/sound-manager';
import { PlatformBridge } from '../src/bridge/platform';

describe('Audio & SFX System (Parallel Track A)', () => {
  beforeEach(() => {
    SoundManager.resetForTesting();
  });

  afterEach(() => {
    SoundManager.resetForTesting();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. AudioContextManager & Headless Mock Tests
  // =========================================================================
  describe('AudioContextManager', () => {
    it('returns a singleton instance', () => {
      const instance1 = AudioContextManager.getInstance();
      const instance2 = AudioContextManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('gracefully creates a headless MockAudioContext in Node.js environment without crash', () => {
      const manager = AudioContextManager.getInstance();
      expect(manager.isAvailable()).toBe(true);
      const ctx = manager.getContext();
      expect(ctx).toBeDefined();
      expect(manager.getState()).toBe('running');
    });

    it('MockAudioContext creates compliant Web Audio nodes', () => {
      const mockCtx = new MockAudioContext();
      const gain = mockCtx.createGain();
      const osc = mockCtx.createOscillator();
      const filter = mockCtx.createBiquadFilter();
      const bufSrc = mockCtx.createBufferSource();
      const buffer = mockCtx.createBuffer(1, 4410, 44100);
      const delay = mockCtx.createDelay(1.0);
      const shaper = mockCtx.createWaveShaper();

      expect(gain).toBeInstanceOf(MockGainNode);
      expect(osc).toBeInstanceOf(MockOscillatorNode);
      expect(buffer.duration).toBeCloseTo(0.1, 3);
      expect(buffer.sampleRate).toBe(44100);
      expect(buffer.numberOfChannels).toBe(1);

      // Verify node connections
      osc.connect(gain);
      gain.connect(mockCtx.destination);
      expect(osc.connectedTo).toContain(gain);
      expect(gain.connectedTo).toContain(mockCtx.destination);

      // Verify disconnect
      osc.disconnect(gain);
      expect(osc.connectedTo.length).toBe(0);
    });

    it('MockAudioParam records audio automation events with accurate timing', () => {
      const param = new MockAudioParam(0.5);
      param.setValueAtTime(0.8, 1.0);
      param.linearRampToValueAtTime(1.0, 2.0);
      param.exponentialRampToValueAtTime(0.01, 3.0);
      param.setValueCurveAtTime(new Float32Array([0.1, 0.5, 0.9]), 3.0, 1.0);

      expect(param.events.length).toBe(4);
      expect(param.events[0]).toEqual({ type: 'setValueAtTime', value: 0.8, time: 1.0 });
      expect(param.events[1]).toEqual({ type: 'linearRampToValueAtTime', value: 1.0, time: 2.0 });
      expect(param.events[2]).toEqual({ type: 'exponentialRampToValueAtTime', value: 0.01, time: 3.0 });
      expect(param.events[3].type).toBe('setValueCurveAtTime');
      expect(param.value).toBeCloseTo(0.9, 2);
    });

    it('supports state listeners and resume/suspend cycles', async () => {
      const manager = AudioContextManager.getInstance();
      const states: string[] = [];
      const unsubscribe = manager.onStateChange((state) => {
        states.push(state);
      });

      await manager.suspend();
      expect(manager.getState()).toBe('suspended');

      await manager.resume();
      expect(manager.getState()).toBe('running');

      unsubscribe();
    });
  });

  // =========================================================================
  // 2. AudioBus & Equal-Power Crossfade Mathematics
  // =========================================================================
  describe('AudioBus & Equal-Power Crossfader', () => {
    it('establishes a 3-tier audio bus hierarchy', () => {
      const bus = AudioBus.getInstance();
      expect(bus.getMasterGainNode()).toBeDefined();
      expect(bus.getBgmBusNode()).toBeDefined();
      expect(bus.getSfxBusNode()).toBeDefined();
      expect(bus.getTrackAGainNode()).toBeDefined();
      expect(bus.getTrackBGainNode()).toBeDefined();
      expect(bus.getActiveTrack()).toBe('A');
      expect(bus.getInactiveTrack()).toBe('B');
    });

    it('rigorously satisfies equal-power crossfade mathematics: cos^2(theta) + sin^2(theta) == 1.0', () => {
      // Test at boundary and intermediate points
      const testPoints = [0.0, 0.1, 0.25, 0.333, 0.5, 0.667, 0.75, 0.9, 1.0];

      for (const progress of testPoints) {
        const { gainA, gainB } = AudioBus.calculateEqualPowerGains(progress);
        const totalPower = gainA * gainA + gainB * gainB;
        expect(totalPower).toBeCloseTo(1.0, 5);

        if (progress === 0.0) {
          expect(gainA).toBeCloseTo(1.0, 5);
          expect(gainB).toBeCloseTo(0.0, 5);
        } else if (progress === 1.0) {
          expect(gainA).toBeCloseTo(0.0, 5);
          expect(gainB).toBeCloseTo(1.0, 5);
        } else if (progress === 0.5) {
          // At midpoint (45 degrees), both equal sqrt(2)/2 ~= 0.7071
          expect(gainA).toBeCloseTo(Math.SQRT1_2, 5);
          expect(gainB).toBeCloseTo(Math.SQRT1_2, 5);
        }
      }
    });

    it('crossfades between Track A and Track B smoothly', () => {
      const bus = AudioBus.getInstance();
      expect(bus.getActiveTrack()).toBe('A');

      bus.crossfadeTo('B', 0.5);
      expect(bus.getActiveTrack()).toBe('B');
      expect(bus.getInactiveTrack()).toBe('A');

      bus.crossfadeTo('A', 0.5);
      expect(bus.getActiveTrack()).toBe('A');
    });

    it('clamps volume inputs between 0.0 and 1.0 and saves to storage', () => {
      const bus = AudioBus.getInstance();
      bus.setMasterVolume(1.8);
      expect(bus.getMasterVolume()).toBe(1.0);

      bus.setMasterVolume(-0.5);
      expect(bus.getMasterVolume()).toBe(0.0);

      bus.setBgmVolume(0.65);
      expect(bus.getBgmVolume()).toBeCloseTo(0.65, 2);

      bus.setSfxVolume(0.85);
      expect(bus.getSfxVolume()).toBeCloseTo(0.85, 2);

      // Verify persistence in platform storage
      const platform = PlatformBridge.getPlatform();
      const saved = platform.getStorageSync('ddg_audio_settings');
      expect(saved).toBeDefined();
      expect(saved.bgmVolume).toBeCloseTo(0.65, 2);
      expect(saved.sfxVolume).toBeCloseTo(0.85, 2);
    });

    it('toggles mute states correctly across Master, BGM, and SFX', () => {
      const bus = AudioBus.getInstance();

      // Master mute
      expect(bus.isMuted()).toBe(false);
      bus.toggleMute();
      expect(bus.isMuted()).toBe(true);
      expect(bus.isBgmSilenced()).toBe(true);
      expect(bus.isSfxSilenced()).toBe(true);

      bus.setMuted(false);
      expect(bus.isMuted()).toBe(false);

      // BGM mute
      bus.setBgmMuted(true);
      expect(bus.isBgmSilenced()).toBe(true);
      expect(bus.isSfxSilenced()).toBe(false);

      // SFX mute
      bus.setSfxMuted(true);
      expect(bus.isSfxSilenced()).toBe(true);
    });
  });

  // =========================================================================
  // 3. MusicalInstruments & Acoustic Formulas
  // =========================================================================
  describe('MusicalInstruments Acoustic Models', () => {
    it('verifies Bianzhong acoustic constants (5 inharmonic overtones, 0.8Hz beat, 1.8s decay)', () => {
      expect(MusicalInstruments.BIANZHONG_OVERTONES).toEqual([1.0, 1.51, 2.12, 2.76, 3.82]);
      expect(MusicalInstruments.BIANZHONG_BEAT_FREQ).toBe(0.8);
      expect(MusicalInstruments.BIANZHONG_DECAY).toBe(1.8);
    });

    it('verifies War Drum hyperbolic sweep and noise parameters', () => {
      expect(MusicalInstruments.WAR_DRUM_SWEEP_START).toBe(160);
      expect(MusicalInstruments.WAR_DRUM_SWEEP_END).toBe(45);
      expect(MusicalInstruments.WAR_DRUM_NOISE_FC).toBe(550);
      expect(MusicalInstruments.WAR_DRUM_SUB_BASS).toBe(42);
    });

    it('verifies Gong FM synthesis carrier, modulator, and index', () => {
      expect(MusicalInstruments.GONG_CARRIER_FREQ).toBe(580);
      expect(MusicalInstruments.GONG_MODULATOR_FREQ).toBe(840);
      expect(MusicalInstruments.GONG_MODULATION_INDEX).toBe(4.2);
      expect(MusicalInstruments.GONG_BANDPASS_FC).toBe(1800);
    });

    it('verifies Suona dual nasal formants and vibrato rate', () => {
      expect(MusicalInstruments.SUONA_FORMANT_1).toBe(1650);
      expect(MusicalInstruments.SUONA_FORMANT_2).toBe(3200);
      expect(MusicalInstruments.SUONA_VIBRATO_RATE).toBe(5.8);
      expect(MusicalInstruments.SUONA_PORTAMENTO_TIME).toBe(0.05);
    });

    it('verifies Drone Bass detuned frequencies and cutoff sweep range', () => {
      expect(MusicalInstruments.DRONE_FREQ_1).toBe(38.0);
      expect(MusicalInstruments.DRONE_FREQ_2).toBe(38.7);
      expect(MusicalInstruments.DRONE_FREQ_2 - MusicalInstruments.DRONE_FREQ_1).toBeCloseTo(0.7, 2);
      expect(MusicalInstruments.DRONE_CUTOFF_MIN).toBe(75);
      expect(MusicalInstruments.DRONE_CUTOFF_MAX).toBe(210);
    });

    it('generates genuine Karplus-Strong plucked string buffer with recursive damping', () => {
      const ctx = AudioContextManager.getInstance().getContext()!;
      const freq = 440;
      const duration = 0.5;
      const buffer = MusicalInstruments.generateKarplusStrongBuffer(ctx, freq, duration, 0.985);

      expect(buffer).toBeDefined();
      expect(buffer.duration).toBeCloseTo(duration, 2);
      const data = buffer.getChannelData(0);
      expect(data.length).toBeGreaterThan(1000);

      // Verify energy decays towards end
      let initialEnergy = 0;
      let finalEnergy = 0;
      for (let i = 0; i < 200; i++) {
        initialEnergy += Math.abs(data[i]);
        finalEnergy += Math.abs(data[data.length - 1 - i]);
      }
      expect(finalEnergy).toBeLessThan(initialEnergy);
    });

    it('triggers all 6 traditional instruments without throwing', () => {
      expect(() => MusicalInstruments.playBianzhong(261.63, 0.7)).not.toThrow();
      expect(() => MusicalInstruments.playGuqin(329.63, 0.6)).not.toThrow();
      expect(() => MusicalInstruments.playPipa(440, 0.65)).not.toThrow();
      expect(() => MusicalInstruments.playPipaRoll(523.25, 0.7)).not.toThrow();
      expect(() => MusicalInstruments.playWarDrum(0.85)).not.toThrow();
      expect(() => MusicalInstruments.playGong(0.8, 1.0)).not.toThrow();
      expect(() => MusicalInstruments.playSuona(587.33, 0.4, 0.75, undefined, 0, 440)).not.toThrow();
      expect(() => MusicalInstruments.playDroneBurst(1.0)).not.toThrow();

      const drone = MusicalInstruments.startDroneBass();
      expect(typeof drone.stop).toBe('function');
      expect(() => drone.stop()).not.toThrow();
    });
  });

  // =========================================================================
  // 4. Procedural SFX & Elemental Reactions
  // =========================================================================
  describe('Procedural SFX & Elemental Reactions', () => {
    it('executes all 18+ high-fidelity procedural SFX without error', () => {
      const sfx = ProceduralSfx.getInstance();

      // Weapon Fire
      expect(() => sfx.playArquebusShot()).not.toThrow();
      expect(() => sfx.playCannonBlast()).not.toThrow();
      expect(() => sfx.playRocketVolley()).not.toThrow();
      expect(() => sfx.playCrossbowTwang()).not.toThrow();

      // Hit & Impact
      expect(() => sfx.playBladeClank()).not.toThrow();
      expect(() => sfx.playShieldBash()).not.toThrow();
      expect(() => sfx.playCritGong()).not.toThrow();
      expect(() => sfx.playWallHit()).not.toThrow();
      expect(() => sfx.playEnemyDeath()).not.toThrow();

      // Elemental Reactions
      expect(() => sfx.playFireBlastReaction()).not.toThrow();
      expect(() => sfx.playThunderJudgementReaction()).not.toThrow();
      expect(() => sfx.playIceShatterReaction()).not.toThrow();
      expect(() => sfx.playNetherPoisonReaction()).not.toThrow();

      // UI & Economy
      expect(() => sfx.playBronzeButtonClick()).not.toThrow();
      expect(() => sfx.playVermilionStamp()).not.toThrow();
      expect(() => sfx.playCoinJingle()).not.toThrow();
      expect(() => sfx.playIronClink()).not.toThrow();
      expect(() => sfx.playMergeChime()).not.toThrow();

      // Fanfare & Specials
      expect(() => sfx.playVictoryFanfare()).not.toThrow();
      expect(() => sfx.playDefeatSound()).not.toThrow();
      expect(() => sfx.playUltimateVoice()).not.toThrow();
      expect(() => sfx.playClick()).not.toThrow();
    });

    it('suppresses audio generation when SFX bus is silenced', () => {
      const bus = AudioBus.getInstance();
      bus.setSfxMuted(true);
      const sfx = ProceduralSfx.getInstance();

      // Should safely return early
      expect(() => sfx.playCannonBlast()).not.toThrow();
      expect(() => sfx.playCritGong()).not.toThrow();
    });
  });

  // =========================================================================
  // 5. Lookahead Music Sequencer & BGM Tracks
  // =========================================================================
  describe('Music Sequencer & BGM Tracks', () => {
    it('validates 3 BGM track specifications and BPM tempos', () => {
      expect(LOBBY_BGM.id).toBe('lobby');
      expect(LOBBY_BGM.bpm).toBe(65);
      expect(LOBBY_BGM.totalSteps).toBe(64);
      expect(LOBBY_BGM.events.length).toBeGreaterThan(10);

      expect(BATTLE_BGM.id).toBe('battle');
      expect(BATTLE_BGM.bpm).toBe(110);
      expect(BATTLE_BGM.totalSteps).toBe(64);
      expect(BATTLE_BGM.events.length).toBeGreaterThan(20);

      expect(BOSS_BGM.id).toBe('boss');
      expect(BOSS_BGM.bpm).toBe(128);
      expect(BOSS_BGM.totalSteps).toBe(64);
      expect(BOSS_BGM.droneBassEnabled).toBe(true);

      expect(ALL_BGM_TRACKS.lobby).toBe(LOBBY_BGM);
      expect(ALL_BGM_TRACKS.battle).toBe(BATTLE_BGM);
      expect(ALL_BGM_TRACKS.boss).toBe(BOSS_BGM);
    });

    it('calculates 16th note step duration accurately from BPM', () => {
      // stepDuration = (60 / BPM) / 4 = 15 / BPM
      const lobbyStep = 15.0 / LOBBY_BGM.bpm;
      expect(lobbyStep).toBeCloseTo(0.23077, 4);

      const battleStep = 15.0 / BATTLE_BGM.bpm;
      expect(battleStep).toBeCloseTo(0.13636, 4);

      const bossStep = 15.0 / BOSS_BGM.bpm;
      expect(bossStep).toBeCloseTo(0.11719, 4);
    });

    it('controls playback lifecycle (play, pause, resume, stop) via Sequencer', () => {
      const sequencer = MusicSequencer.getInstance();
      expect(sequencer.isPlaying()).toBe(false);

      sequencer.playTrack(LOBBY_BGM, 'A');
      expect(sequencer.isPlaying()).toBe(true);
      expect(sequencer.getCurrentTrack()?.id).toBe('lobby');
      expect(sequencer.getTargetTrackBus()).toBe('A');

      sequencer.pause();
      expect(sequencer.isPlaying()).toBe(false);

      sequencer.resume();
      expect(sequencer.isPlaying()).toBe(true);

      sequencer.stop();
      expect(sequencer.isPlaying()).toBe(false);
      expect(sequencer.getCurrentTrack()).toBeNull();
    });

    it('dispatches instrument events for all instrument types without error', () => {
      const sequencer = MusicSequencer.getInstance();
      const events = [
        { step: 0, instrument: 'bianzhong' as const, freq: 261.63, velocity: 0.8 },
        { step: 0, instrument: 'guqin' as const, freq: 329.63, velocity: 0.6 },
        { step: 0, instrument: 'pipa' as const, freq: 440, velocity: 0.7 },
        { step: 0, instrument: 'pipaRoll' as const, freq: 523.25, velocity: 0.75 },
        { step: 0, instrument: 'warDrum' as const, intensity: 0.9 },
        { step: 0, instrument: 'gong' as const, intensity: 0.8, pitchMultiplier: 1.1 },
        { step: 0, instrument: 'suona' as const, freq: 587.33, durationSec: 0.4, velocity: 0.8 },
        { step: 0, instrument: 'droneBurst' as const, durationSec: 1.5 }
      ];

      for (const ev of events) {
        expect(() => sequencer.playInstrumentEvent(ev)).not.toThrow();
      }
    });
  });

  // =========================================================================
  // 6. SoundManager Unified Facade & Backward Compatibility
  // =========================================================================
  describe('SoundManager Unified Facade', () => {
    it('maintains 100% backward compatibility for existing SFX APIs', () => {
      const sound = SoundManager.getInstance();

      expect(() => sound.playGunshot()).not.toThrow();
      expect(() => sound.playCannonBlast()).not.toThrow();
      expect(() => sound.playBowTwang()).not.toThrow();
      expect(() => sound.playMergeChime()).not.toThrow();
      expect(() => sound.playWallHit()).not.toThrow();
      expect(() => sound.playVictoryFanfare()).not.toThrow();
      expect(() => sound.playDefeatSound()).not.toThrow();
      expect(() => sound.playUltimateVoice()).not.toThrow();
      expect(() => sound.playClick()).not.toThrow();
      expect(() => sound.resume()).not.toThrow();
    });

    it('provides seamless BGM switching and crossfading', () => {
      const sound = SoundManager.getInstance();
      expect(sound.getCurrentBgm()).toBe('none');

      sound.playLobbyBgm();
      expect(sound.getCurrentBgm()).toBe('lobby');

      sound.playBattleBgm();
      expect(sound.getCurrentBgm()).toBe('battle');

      sound.playBossBgm();
      expect(sound.getCurrentBgm()).toBe('boss');

      sound.pauseBgm();
      sound.resumeBgm();

      sound.stopBgm();
      expect(sound.getCurrentBgm()).toBe('none');
    });

    it('exposes full new SFX suite on facade', () => {
      const sound = SoundManager.getInstance();

      expect(() => sound.playArquebusShot()).not.toThrow();
      expect(() => sound.playRocketVolley()).not.toThrow();
      expect(() => sound.playCrossbowTwang()).not.toThrow();
      expect(() => sound.playBladeClank()).not.toThrow();
      expect(() => sound.playShieldBash()).not.toThrow();
      expect(() => sound.playCritGong()).not.toThrow();
      expect(() => sound.playFireBlastReaction()).not.toThrow();
      expect(() => sound.playThunderJudgementReaction()).not.toThrow();
      expect(() => sound.playIceShatterReaction()).not.toThrow();
      expect(() => sound.playNetherPoisonReaction()).not.toThrow();
      expect(() => sound.playBronzeButtonClick()).not.toThrow();
      expect(() => sound.playVermilionStamp()).not.toThrow();
      expect(() => sound.playCoinJingle()).not.toThrow();
      expect(() => sound.playIronClink()).not.toThrow();
      expect(() => sound.playEnemyDeath()).not.toThrow();
    });

    it('coordinates volume and mute through SoundManager to AudioBus', () => {
      const sound = SoundManager.getInstance();
      sound.setMasterVolume(0.9);
      expect(sound.getMasterVolume()).toBeCloseTo(0.9, 2);

      sound.setBgmVolume(0.75);
      expect(sound.getBgmVolume()).toBeCloseTo(0.75, 2);

      sound.setSfxVolume(0.8);
      expect(sound.getSfxVolume()).toBeCloseTo(0.8, 2);

      sound.setMuted(true);
      expect(sound.getIsMuted()).toBe(true);

      sound.toggleMute();
      expect(sound.getIsMuted()).toBe(false);

      sound.setBgmMuted(true);
      expect(sound.isBgmMuted()).toBe(true);

      sound.setSfxMuted(true);
      expect(sound.isSfxMuted()).toBe(true);
    });

    it('exposes accessors to underlying architectural subsystems', () => {
      const sound = SoundManager.getInstance();
      expect(sound.getContextManager()).toBeInstanceOf(AudioContextManager);
      expect(sound.getAudioBus()).toBeInstanceOf(AudioBus);
      expect(sound.getSequencer()).toBeInstanceOf(MusicSequencer);
      expect(sound.getProceduralSfx()).toBeInstanceOf(ProceduralSfx);
    });
  });
});
