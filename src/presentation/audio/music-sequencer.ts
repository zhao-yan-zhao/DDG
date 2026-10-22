/**
 * 《孤城神机营》- Music Sequencer
 * High-precision Web Audio lookahead clock scheduler for BGM playback.
 * Eliminates JavaScript timer jitter by scheduling Web Audio events 100ms ahead
 * in 25ms timer ticks, ensuring sample-accurate BPM timing.
 */

import { AudioContextManager } from './audio-context-manager';
import { AudioBus } from './audio-bus';
import { MusicalInstruments } from './musical-instruments';
import { BgmTrackConfig, BgmNoteEvent } from './bgm-tracks';

export class MusicSequencer {
  private static instance: MusicSequencer | null = null;

  // Sequencer timing constants
  public static readonly TICK_INTERVAL_MS = 25;       // Clock tick interval
  public static readonly SCHEDULE_AHEAD_TIME = 0.100; // 100ms lookahead window

  private timerId: any = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private currentTrack: BgmTrackConfig | null = null;
  private currentStep: number = 0;
  private nextNoteTime: number = 0;
  private targetTrackBus: 'A' | 'B' = 'A';

  // Active continuous drone bass handle (for Boss BGM)
  private activeDroneHandle: { stop: () => void } | null = null;

  private constructor() {}

  public static getInstance(): MusicSequencer {
    if (!MusicSequencer.instance) {
      MusicSequencer.instance = new MusicSequencer();
    }
    return MusicSequencer.instance;
  }

  public static resetForTesting(): void {
    if (MusicSequencer.instance) {
      MusicSequencer.instance.stop();
    }
    MusicSequencer.instance = null;
  }

  /**
   * Starts playing a BGM track with optional target bus channel ('A' or 'B')
   */
  public playTrack(track: BgmTrackConfig, bus: 'A' | 'B' = 'A'): void {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;

    // Stop current track cleanly
    this.stopDrone();
    this.currentTrack = track;
    this.targetTrackBus = bus;
    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05; // Short 50ms pre-roll
    this.isPaused = false;
    this.isRunning = true;

    // If track features continuous drone bass, start it immediately
    if (track.droneBassEnabled) {
      const destNode = bus === 'A'
        ? AudioBus.getInstance().getTrackAGainNode()
        : AudioBus.getInstance().getTrackBGainNode();
      this.activeDroneHandle = MusicalInstruments.startDroneBass(destNode || undefined);
    }

    if (!this.timerId) {
      this.timerId = setInterval(() => this.schedulerTick(), MusicSequencer.TICK_INTERVAL_MS);
    }
  }

  /**
   * Main lookahead scheduling loop running every 25ms
   */
  private schedulerTick(): void {
    if (!this.isRunning || this.isPaused || !this.currentTrack) return;

    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx || ctx.state === 'suspended') return;

    // Step duration in seconds for a 16th note: (60 / BPM) / 4
    const stepDuration = 15.0 / this.currentTrack.bpm;

    // While there are notes that will play inside our lookahead window
    while (this.nextNoteTime < ctx.currentTime + MusicSequencer.SCHEDULE_AHEAD_TIME) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % this.currentTrack.totalSteps;
    }
  }

  /**
   * Schedules all note events at currentStep to trigger at exact time noteTime
   */
  private scheduleStep(step: number, noteTime: number): void {
    if (!this.currentTrack) return;

    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;

    const timeOffset = Math.max(0, noteTime - ctx.currentTime);
    const bus = AudioBus.getInstance();
    const dest = this.targetTrackBus === 'A'
      ? bus.getTrackAGainNode()
      : bus.getTrackBGainNode();
    const targetDest = dest || bus.getBgmBusNode() || undefined;

    // Find all events assigned to this step
    const events = this.currentTrack.events.filter((ev) => ev.step === step);
    for (const ev of events) {
      this.playInstrumentEvent(ev, targetDest, timeOffset);
    }
  }

  /**
   * Dispatches a single note event to the appropriate musical instrument synthesizer
   */
  public playInstrumentEvent(ev: BgmNoteEvent, dest?: AudioNode, timeOffset: number = 0): void {
    switch (ev.instrument) {
      case 'bianzhong':
        if (ev.freq) {
          MusicalInstruments.playBianzhong(ev.freq, ev.velocity ?? 0.7, dest, timeOffset);
        }
        break;
      case 'guqin':
        if (ev.freq) {
          MusicalInstruments.playGuqin(ev.freq, ev.velocity ?? 0.65, dest, timeOffset);
        }
        break;
      case 'pipa':
        if (ev.freq) {
          MusicalInstruments.playPipa(ev.freq, ev.velocity ?? 0.65, dest, timeOffset);
        }
        break;
      case 'pipaRoll':
        if (ev.freq) {
          MusicalInstruments.playPipaRoll(ev.freq, ev.velocity ?? 0.7, dest, timeOffset);
        }
        break;
      case 'warDrum':
        MusicalInstruments.playWarDrum(ev.intensity ?? 0.8, dest, timeOffset);
        break;
      case 'gong':
        MusicalInstruments.playGong(ev.intensity ?? 0.75, ev.pitchMultiplier ?? 1.0, dest, timeOffset);
        break;
      case 'suona':
        if (ev.freq) {
          MusicalInstruments.playSuona(
            ev.freq,
            ev.durationSec ?? 0.4,
            ev.velocity ?? 0.75,
            dest,
            timeOffset,
            ev.prevFreq
          );
        }
        break;
      case 'droneBurst':
        MusicalInstruments.playDroneBurst(ev.durationSec ?? 2.5, dest, timeOffset);
        break;
    }
  }

  /**
   * Pauses the sequencer (e.g. game paused or tab switched to background)
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * Resumes playback
   */
  public resume(): void {
    if (this.isPaused && this.currentTrack) {
      const ctx = AudioContextManager.getInstance().getContext();
      if (ctx) {
        this.nextNoteTime = ctx.currentTime + 0.05;
      }
      this.isPaused = false;
    }
  }

  /**
   * Stops the sequencer and clears all timers
   */
  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.stopDrone();
    this.currentTrack = null;
    this.currentStep = 0;
  }

  private stopDrone(): void {
    if (this.activeDroneHandle) {
      this.activeDroneHandle.stop();
      this.activeDroneHandle = null;
    }
  }

  public setTargetTrackBus(bus: 'A' | 'B'): void {
    this.targetTrackBus = bus;
  }

  public getTargetTrackBus(): 'A' | 'B' {
    return this.targetTrackBus;
  }

  public isPlaying(): boolean {
    return this.isRunning && !this.isPaused;
  }

  public getCurrentTrack(): BgmTrackConfig | null {
    return this.currentTrack;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }
}
