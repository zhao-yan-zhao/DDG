/**
 * 《孤城神机营》- Musical Instruments
 * High-fidelity acoustic synthesis for 6 traditional Chinese instruments using pure Web Audio API nodes:
 * 1. Bianzhong (编钟 / Chimes): Dual-carrier beat frequency (0.8Hz) + 5 inharmonic overtone ratios + 1.8s decay.
 * 2. Guqin / Pipa (古琴 / 琵琶): Karplus-Strong plucked string with recursive delay feedback loop + damping filter.
 * 3. War Drums (堂鼓 / 大鼓 / Tanggu / Dagu): Hyperbolic sweep (160Hz -> 45Hz) + bandpass noise transient (550Hz) + sub-bass resonance.
 * 4. Gong (铜锣 / Luo): FM synthesis (carrier 580Hz, modulator 840Hz, modulation index 4.2 decaying) + metallic bandpass.
 * 5. Suona (绝境唢呐): Sawtooth excitation + dual nasal formants (1650Hz, 3200Hz) + 5.8Hz vibrato LFO + portamento.
 * 6. Drone Bass (低音震鸣): Detuned dual saw (38Hz, 38.7Hz) + sweeping 4-pole lowpass filter.
 */

import { AudioContextManager } from './audio-context-manager';
import { AudioBus } from './audio-bus';

export class MusicalInstruments {
  // --- Instrument Constants & Formulas for Verification ---
  public static readonly BIANZHONG_OVERTONES = [1.0, 1.51, 2.12, 2.76, 3.82] as const;
  public static readonly BIANZHONG_BEAT_FREQ = 0.8; // Hz
  public static readonly BIANZHONG_DECAY = 1.8;     // Seconds

  public static readonly WAR_DRUM_SWEEP_START = 160; // Hz
  public static readonly WAR_DRUM_SWEEP_END = 45;    // Hz
  public static readonly WAR_DRUM_NOISE_FC = 550;    // Hz
  public static readonly WAR_DRUM_SUB_BASS = 42;     // Hz

  public static readonly GONG_CARRIER_FREQ = 580;    // Hz
  public static readonly GONG_MODULATOR_FREQ = 840;  // Hz
  public static readonly GONG_MODULATION_INDEX = 4.2;
  public static readonly GONG_BANDPASS_FC = 1800;    // Hz

  public static readonly SUONA_FORMANT_1 = 1650;     // Hz
  public static readonly SUONA_FORMANT_2 = 3200;     // Hz
  public static readonly SUONA_VIBRATO_RATE = 5.8;   // Hz
  public static readonly SUONA_PORTAMENTO_TIME = 0.05; // Seconds

  public static readonly DRONE_FREQ_1 = 38.0;        // Hz
  public static readonly DRONE_FREQ_2 = 38.7;        // Hz
  public static readonly DRONE_CUTOFF_MIN = 75;      // Hz
  public static readonly DRONE_CUTOFF_MAX = 210;     // Hz

  /**
   * Generates white noise AudioBuffer for percussion transients and Karplus-Strong seeds
   */
  public static createNoiseBuffer(ctx: AudioContext, durationSec: number = 0.05): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const frameCount = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Generates a Karplus-Strong plucked string AudioBuffer
   * Algorithm:
   *   y[n] = alpha * 0.5 * (y[n - P] + y[n - P - 1])
   *   P = round(sampleRate / freq)
   */
  public static generateKarplusStrongBuffer(
    ctx: AudioContext,
    freq: number,
    durationSec: number = 1.2,
    dampingAlpha: number = 0.985
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const P = Math.max(2, Math.round(sampleRate / Math.max(20, freq)));
    const totalSamples = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Seed initial period P with white noise
    for (let i = 0; i < P; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }

    // Karplus-Strong feedback loop
    for (let n = P; n < totalSamples; n++) {
      const prev1 = data[n - P];
      const prev2 = n - P - 1 >= 0 ? data[n - P - 1] : data[P - 1];
      data[n] = dampingAlpha * 0.5 * (prev1 + prev2);
    }

    return buffer;
  }

  /**
   * Creates a soft-saturation overdrive WaveShaper curve
   */
  public static makeDistortionCurve(amount: number = 20, nSamples: number = 256): Float32Array {
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  // =========================================================================
  // 1. 编钟 (Bianzhong - Ancient Imperial Bronze Chimes)
  // =========================================================================
  public static playBianzhong(
    freq: number,
    velocity: number = 0.7,
    destination?: AudioNode,
    timeOffset: number = 0
  ): void {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;
    const targetDest = destination || AudioBus.getInstance().getActiveTrackNode() || ctx.destination;

    const t = ctx.currentTime + Math.max(0, timeOffset);
    const beat = MusicalInstruments.BIANZHONG_BEAT_FREQ / 2; // +/- 0.4 Hz
    const decay = MusicalInstruments.BIANZHONG_DECAY;

    // Amplitude weights for the 5 overtones
    const overtoneGains = [0.65, 0.38, 0.22, 0.14, 0.08];

    // Dual-carrier beating at fundamental
    const carriers = [freq - beat, freq + beat];
    for (const cFreq of carriers) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(cFreq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(velocity * 0.5, t + 0.005); // 5ms attack
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

      osc.connect(gain);
      gain.connect(targetDest);

      osc.start(t);
      osc.stop(t + decay);
    }

    // Inharmonic overtones
    for (let i = 1; i < MusicalInstruments.BIANZHONG_OVERTONES.length; i++) {
      const ratio = MusicalInstruments.BIANZHONG_OVERTONES[i];
      const partialFreq = freq * ratio;
      const partialDecay = decay / (1 + 0.35 * i);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(partialFreq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(velocity * overtoneGains[i], t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + partialDecay);

      osc.connect(gain);
      gain.connect(targetDest);

      osc.start(t);
      osc.stop(t + partialDecay);
    }
  }

  // =========================================================================
  // 2. 古琴 / 琵琶 (Guqin & Pipa - Karplus-Strong Plucked String)
  // =========================================================================
  public static playGuqin(
    freq: number,
    velocity: number = 0.6,
    destination?: AudioNode,
    timeOffset: number = 0
  ): void {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;
    const targetDest = destination || AudioBus.getInstance().getActiveTrackNode() || ctx.destination;

    const t = ctx.currentTime + Math.max(0, timeOffset);
    const duration = 1.5;
    const buffer = MusicalInstruments.generateKarplusStrongBuffer(ctx, freq, duration, 0.985);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Filter to simulate wooden body resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(targetDest);

    source.start(t);
    source.stop(t + duration);
  }

  public static playPipa(
    freq: number,
    velocity: number = 0.65,
    destination?: AudioNode,
    timeOffset: number = 0
  ): void {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;
    const targetDest = destination || AudioBus.getInstance().getActiveTrackNode() || ctx.destination;

    const t = ctx.currentTime + Math.max(0, timeOffset);
    const duration = 0.6;
    const buffer = MusicalInstruments.generateKarplusStrongBuffer(ctx, freq, duration, 0.962);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Pipa has crisp, bright, metallic string timbre
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.8, t);
    filter.Q.setValueAtTime(2.2, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(targetDest);

    source.start(t);
    source.stop(t + duration);
  }

  /**
   * Pipa Tremolo / Roll (琵琶轮指): 4 rapid successive plucks with micro-timing
   */
  public static playPipaRoll(
    freq: number,
    velocity: number = 0.7,
    destination?: AudioNode,
    timeOffset: number = 0
  ): void {
    const plucks = 4;
    const spacing = 0.038; // 38ms between strokes
    for (let i = 0; i < plucks; i++) {
      const v = velocity * (0.65 + 0.1 * i);
      MusicalInstruments.playPipa(freq, v, destination, timeOffset + i * spacing);
    }
  }

  // =========================================================================
  // 3. 重工战鼓 (War Drum / Tanggu / Dagu)
  // =========================================================================
  public static playWarDrum(
    intensity: number = 0.8,
    destination?: AudioNode,
    timeOffset: number = 0
  ): void {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;
    const targetDest = destination || AudioBus.getInstance().getActiveTrackNode() || ctx.destination;

    const t = ctx.currentTime + Math.max(0, timeOffset);

    // A. Strike transient: bandpass noise at 550Hz simulating mallet impact on skin
    const noiseBuffer = MusicalInstruments.createNoiseBuffer(ctx, 0.025);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(MusicalInstruments.WAR_DRUM_NOISE_FC, t);
    noiseFilter.Q.setValueAtTime(3.8, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(intensity * 0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(targetDest);

    noiseSource.start(t);
    noiseSource.stop(t + 0.025);

    // B. Drum membrane vibration: hyperbolic sweep 160Hz -> 45Hz
    const drumOsc = ctx.createOscillator();
    const drumGain = ctx.createGain();

    drumOsc.type = 'triangle';
    drumOsc.frequency.setValueAtTime(MusicalInstruments.WAR_DRUM_SWEEP_START, t);
    drumOsc.frequency.exponentialRampToValueAtTime(MusicalInstruments.WAR_DRUM_SWEEP_END, t + 0.045);

    drumGain.gain.setValueAtTime(intensity * 0.95, t);
    drumGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    drumOsc.connect(drumGain);
    drumGain.connect(targetDest);

    drumOsc.start(t);
    drumOsc.stop(t + 0.28);

    // C. Sub-bass resonance (42Hz) for massive ground vibration
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(MusicalInstruments.WAR_DRUM_SUB_BASS, t);

    subGain.gain.setValueAtTime(intensity * 0.8, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    subOsc.connect(subGain);
    subGain.connect(targetDest);

    subOsc.start(t);
    subOsc.stop(t + 0.35);
  }

  // =========================================================================
  // 4. 铜锣 (Gong / Luo - FM Synthesis Metal Resonance)
  // =========================================================================
  public static playGong(
    intensity: number = 0.75,
    pitchMultiplier: number = 1.0,
    destination?: AudioNode,
    timeOffset: number = 0
  ): void {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;
    const targetDest = destination || AudioBus.getInstance().getActiveTrackNode() || ctx.destination;

    const t = ctx.currentTime + Math.max(0, timeOffset);
    const duration = 0.85;

    const carrierFreq = MusicalInstruments.GONG_CARRIER_FREQ * pitchMultiplier;
    const modFreq = MusicalInstruments.GONG_MODULATOR_FREQ * pitchMultiplier;
    const modIndex = MusicalInstruments.GONG_MODULATION_INDEX;

    // Carrier Oscillator
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(carrierFreq, t);

    // Modulator Oscillator
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(modFreq, t);

    // Modulation Gain
    const modGain = ctx.createGain();
    const initialModDepth = modFreq * modIndex;
    modGain.gain.setValueAtTime(initialModDepth, t);
    modGain.gain.exponentialRampToValueAtTime(0.1, t + 0.2); // FM index decays quickly

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Metallic Bandpass Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(MusicalInstruments.GONG_BANDPASS_FC, t);
    filter.Q.setValueAtTime(2.5, t);

    // Output Gain Envelope
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, t);
    masterGain.gain.linearRampToValueAtTime(intensity * 0.85, t + 0.008);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    carrier.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(targetDest);

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + duration);
    modulator.stop(t + duration);
  }

  // =========================================================================
  // 5. 绝境唢呐 (Suona - High-Energy Double-Reed Aerophone)
  // =========================================================================
  public static playSuona(
    freq: number,
    durationSec: number = 0.35,
    velocity: number = 0.7,
    destination?: AudioNode,
    timeOffset: number = 0,
    prevFreq?: number
  ): void {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;
    const targetDest = destination || AudioBus.getInstance().getActiveTrackNode() || ctx.destination;

    const t = ctx.currentTime + Math.max(0, timeOffset);

    // Excitation source: rich harmonic sawtooth
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';

    if (prevFreq && prevFreq > 0) {
      // Portamento legato glide
      osc.frequency.setValueAtTime(prevFreq, t);
      osc.frequency.linearRampToValueAtTime(freq, t + MusicalInstruments.SUONA_PORTAMENTO_TIME);
    } else {
      osc.frequency.setValueAtTime(freq, t);
    }

    // Vibrato LFO at 5.8Hz
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(MusicalInstruments.SUONA_VIBRATO_RATE, t);
    const vibratoDepth = freq * 0.016; // ~28 cents
    lfoGain.gain.setValueAtTime(vibratoDepth, t);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Dual Formant Peaking Filters
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'peaking';
    formant1.frequency.setValueAtTime(MusicalInstruments.SUONA_FORMANT_1, t);
    formant1.Q.setValueAtTime(3.2, t);
    formant1.gain.setValueAtTime(7.0, t);

    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'peaking';
    formant2.frequency.setValueAtTime(MusicalInstruments.SUONA_FORMANT_2, t);
    formant2.Q.setValueAtTime(4.0, t);
    formant2.gain.setValueAtTime(9.0, t);

    // Envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(velocity * 0.75, t + 0.02);
    gain.gain.setValueAtTime(velocity * 0.75, t + durationSec - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);

    osc.connect(formant1);
    formant1.connect(formant2);
    formant2.connect(gain);
    gain.connect(targetDest);

    osc.start(t);
    lfo.start(t);
    osc.stop(t + durationSec);
    lfo.stop(t + durationSec);
  }

  // =========================================================================
  // 6. 低音震鸣 (Drone Bass - Dual Detuned Saw + Sweeping Filter)
  // =========================================================================
  public static startDroneBass(destination?: AudioNode): { stop: () => void } {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return { stop: () => {} };
    const targetDest = destination || AudioBus.getInstance().getActiveTrackNode() || ctx.destination;

    const t = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(MusicalInstruments.DRONE_FREQ_1, t);
    osc2.frequency.setValueAtTime(MusicalInstruments.DRONE_FREQ_2, t);

    // Sweeping 4-pole lowpass filter (cascaded BiquadFilters)
    const filter1 = ctx.createBiquadFilter();
    const filter2 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter2.type = 'lowpass';
    filter1.Q.setValueAtTime(2.5, t);
    filter2.Q.setValueAtTime(2.5, t);

    // LFO to sweep cutoff between 75Hz and 210Hz over 6.5s
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1 / 6.5, t);
    const midFreq = (MusicalInstruments.DRONE_CUTOFF_MAX + MusicalInstruments.DRONE_CUTOFF_MIN) / 2;
    const dev = (MusicalInstruments.DRONE_CUTOFF_MAX - MusicalInstruments.DRONE_CUTOFF_MIN) / 2;
    filter1.frequency.setValueAtTime(midFreq, t);
    filter2.frequency.setValueAtTime(midFreq, t);
    lfoGain.gain.setValueAtTime(dev, t);

    lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);
    lfoGain.connect(filter2.frequency);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, t);
    masterGain.gain.linearRampToValueAtTime(0.5, t + 1.0); // Fade in over 1s

    osc1.connect(filter1);
    osc2.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(masterGain);
    masterGain.connect(targetDest);

    osc1.start(t);
    osc2.start(t);
    lfo.start(t);

    return {
      stop: () => {
        try {
          const stopTime = ctx.currentTime + 0.8;
          masterGain.gain.linearRampToValueAtTime(0.001, stopTime);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              lfo.stop();
              osc1.disconnect();
              osc2.disconnect();
              filter1.disconnect();
              filter2.disconnect();
              masterGain.disconnect();
            } catch {
              // Ignore node stop errors
            }
          }, 900);
        } catch {
          // Ignore
        }
      }
    };
  }

  public static playDroneBurst(
    durationSec: number = 2.5,
    destination?: AudioNode,
    timeOffset: number = 0
  ): void {
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return;
    const targetDest = destination || AudioBus.getInstance().getActiveTrackNode() || ctx.destination;

    const t = ctx.currentTime + Math.max(0, timeOffset);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(MusicalInstruments.DRONE_FREQ_1, t);
    osc2.frequency.setValueAtTime(MusicalInstruments.DRONE_FREQ_2, t);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(MusicalInstruments.DRONE_CUTOFF_MAX, t);
    filter.frequency.exponentialRampToValueAtTime(MusicalInstruments.DRONE_CUTOFF_MIN, t + durationSec);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.55, t + 0.3);
    gain.gain.setValueAtTime(0.55, t + durationSec - 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(targetDest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + durationSec);
    osc2.stop(t + durationSec);
  }
}
