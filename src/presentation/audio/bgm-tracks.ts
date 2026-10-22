/**
 * 《孤城神机营》- BGM Tracks Configuration
 * Authentic Ming Dynasty national-tide war music scores:
 * 1. Lobby BGM (65 BPM): C-Gong (宫) Pentatonic mode (Bianzhong chimes, Guqin contemplative melody, gentle war drum).
 * 2. Battle BGM (110 BPM): D-Yu (羽) Pentatonic mode (driving relentless war drums, rapid Pipa rolls, punctuation gongs).
 * 3. Boss BGM (128 BPM): Tense battle mode (continuous Drone Bass, double-time kick drums, metal gongs, soaring piercing Suona climax).
 */

export type InstrumentType =
  | 'bianzhong'
  | 'guqin'
  | 'pipa'
  | 'pipaRoll'
  | 'warDrum'
  | 'gong'
  | 'suona'
  | 'droneBurst';

export interface BgmNoteEvent {
  step: number;             // 16th note step index (0..totalSteps-1)
  instrument: InstrumentType;
  freq?: number;            // Frequency in Hz for tonal instruments
  velocity?: number;        // Dynamic volume (0.0 ~ 1.0)
  durationSec?: number;     // Duration in seconds (for sustained notes like Suona)
  intensity?: number;       // Percussion impact intensity (0.0 ~ 1.0)
  pitchMultiplier?: number; // Pitch shift for Gong
  prevFreq?: number;        // Portamento glide source
}

export interface BgmTrackConfig {
  id: 'lobby' | 'battle' | 'boss';
  name: string;
  bpm: number;
  totalSteps: number;       // Usually 64 steps = 4 bars of 4/4
  droneBassEnabled: boolean;
  events: BgmNoteEvent[];
}

// Pentatonic Frequencies
const PENTATONIC = {
  // C Gong (宫) Scale
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,

  // D Yu (羽) Scale
  F4: 349.23,
  F5: 698.46,
  A5: 880.0,

  // Boss Scale
  G3: 196.0,
  Bb3: 233.08,
  Bb4: 466.16,
  Fs4: 369.99 // F#4 (Tritone / 变徵)
};

// =========================================================================
// 1. Lobby BGM (大明将营帅帐 - 65 BPM C-Gong)
// =========================================================================
export const LOBBY_BGM: BgmTrackConfig = {
  id: 'lobby',
  name: '大明将营 (Lobby Serenity)',
  bpm: 65,
  totalSteps: 64, // 4 bars
  droneBassEnabled: false,
  events: [
    // --- Bar 1 (Steps 0~15) ---
    { step: 0, instrument: 'bianzhong', freq: PENTATONIC.C4, velocity: 0.8 },
    { step: 0, instrument: 'warDrum', intensity: 0.45 },
    { step: 4, instrument: 'guqin', freq: PENTATONIC.C4, velocity: 0.65 },
    { step: 8, instrument: 'warDrum', intensity: 0.4 },
    { step: 8, instrument: 'guqin', freq: PENTATONIC.E4, velocity: 0.6 },
    { step: 12, instrument: 'guqin', freq: PENTATONIC.G4, velocity: 0.7 },
    { step: 14, instrument: 'warDrum', intensity: 0.3 },

    // --- Bar 2 (Steps 16~31) ---
    { step: 16, instrument: 'warDrum', intensity: 0.45 },
    { step: 18, instrument: 'guqin', freq: PENTATONIC.A4, velocity: 0.65 },
    { step: 24, instrument: 'warDrum', intensity: 0.4 },
    { step: 24, instrument: 'guqin', freq: PENTATONIC.G4, velocity: 0.6 },
    { step: 30, instrument: 'warDrum', intensity: 0.35 },

    // --- Bar 3 (Steps 32~47) ---
    { step: 32, instrument: 'bianzhong', freq: PENTATONIC.G4, velocity: 0.75 },
    { step: 32, instrument: 'warDrum', intensity: 0.5 },
    { step: 36, instrument: 'guqin', freq: PENTATONIC.D4, velocity: 0.6 },
    { step: 40, instrument: 'warDrum', intensity: 0.4 },
    { step: 40, instrument: 'guqin', freq: PENTATONIC.E4, velocity: 0.65 },
    { step: 44, instrument: 'guqin', freq: PENTATONIC.G4, velocity: 0.7 },
    { step: 46, instrument: 'warDrum', intensity: 0.3 },

    // --- Bar 4 (Steps 48~63) ---
    { step: 48, instrument: 'warDrum', intensity: 0.45 },
    { step: 50, instrument: 'guqin', freq: PENTATONIC.C5, velocity: 0.75 },
    { step: 56, instrument: 'warDrum', intensity: 0.4 },
    { step: 56, instrument: 'guqin', freq: PENTATONIC.A4, velocity: 0.6 },
    { step: 60, instrument: 'guqin', freq: PENTATONIC.G4, velocity: 0.55 },
    { step: 62, instrument: 'warDrum', intensity: 0.35 }
  ]
};

// =========================================================================
// 2. Battle BGM (城垣浴血攻防 - 110 BPM D-Yu)
// =========================================================================
export const BATTLE_BGM: BgmTrackConfig = {
  id: 'battle',
  name: '城垣冲锋 (Battle Charge)',
  bpm: 110,
  totalSteps: 64, // 4 bars
  droneBassEnabled: false,
  events: [
    // --- Bar 1 (Steps 0~15) ---
    { step: 0, instrument: 'gong', intensity: 0.75, pitchMultiplier: 1.0 },
    { step: 0, instrument: 'warDrum', intensity: 0.85 },
    { step: 0, instrument: 'pipaRoll', freq: PENTATONIC.D4, velocity: 0.75 },
    { step: 2, instrument: 'warDrum', intensity: 0.5 },
    { step: 4, instrument: 'warDrum', intensity: 0.8 },
    { step: 4, instrument: 'pipa', freq: PENTATONIC.F4, velocity: 0.65 },
    { step: 6, instrument: 'warDrum', intensity: 0.5 },
    { step: 6, instrument: 'pipa', freq: PENTATONIC.G4, velocity: 0.7 },
    { step: 8, instrument: 'warDrum', intensity: 0.85 },
    { step: 8, instrument: 'pipaRoll', freq: PENTATONIC.A4, velocity: 0.75 },
    { step: 10, instrument: 'warDrum', intensity: 0.5 },
    { step: 12, instrument: 'warDrum', intensity: 0.8 },
    { step: 12, instrument: 'pipa', freq: PENTATONIC.C5, velocity: 0.7 },
    { step: 14, instrument: 'warDrum', intensity: 0.65 },
    { step: 14, instrument: 'pipa', freq: PENTATONIC.D5, velocity: 0.75 },
    { step: 15, instrument: 'warDrum', intensity: 0.65 },

    // --- Bar 2 (Steps 16~31) ---
    { step: 16, instrument: 'warDrum', intensity: 0.85 },
    { step: 16, instrument: 'pipaRoll', freq: PENTATONIC.F5, velocity: 0.8 },
    { step: 18, instrument: 'warDrum', intensity: 0.5 },
    { step: 20, instrument: 'warDrum', intensity: 0.8 },
    { step: 20, instrument: 'pipa', freq: PENTATONIC.D5, velocity: 0.7 },
    { step: 22, instrument: 'warDrum', intensity: 0.5 },
    { step: 24, instrument: 'warDrum', intensity: 0.85 },
    { step: 24, instrument: 'pipa', freq: PENTATONIC.C5, velocity: 0.7 },
    { step: 26, instrument: 'warDrum', intensity: 0.5 },
    { step: 28, instrument: 'warDrum', intensity: 0.8 },
    { step: 28, instrument: 'pipa', freq: PENTATONIC.A4, velocity: 0.65 },
    { step: 30, instrument: 'warDrum', intensity: 0.7 },
    { step: 31, instrument: 'warDrum', intensity: 0.7 },

    // --- Bar 3 (Steps 32~47) ---
    { step: 32, instrument: 'gong', intensity: 0.7, pitchMultiplier: 1.1 },
    { step: 32, instrument: 'warDrum', intensity: 0.9 },
    { step: 32, instrument: 'pipaRoll', freq: PENTATONIC.D4, velocity: 0.75 },
    { step: 34, instrument: 'warDrum', intensity: 0.55 },
    { step: 36, instrument: 'warDrum', intensity: 0.8 },
    { step: 36, instrument: 'pipa', freq: PENTATONIC.F4, velocity: 0.65 },
    { step: 38, instrument: 'warDrum', intensity: 0.55 },
    { step: 38, instrument: 'pipa', freq: PENTATONIC.G4, velocity: 0.7 },
    { step: 40, instrument: 'warDrum', intensity: 0.85 },
    { step: 40, instrument: 'pipaRoll', freq: PENTATONIC.A4, velocity: 0.8 },
    { step: 42, instrument: 'warDrum', intensity: 0.55 },
    { step: 44, instrument: 'warDrum', intensity: 0.8 },
    { step: 44, instrument: 'pipa', freq: PENTATONIC.D5, velocity: 0.75 },
    { step: 46, instrument: 'warDrum', intensity: 0.65 },
    { step: 47, instrument: 'warDrum', intensity: 0.7 },

    // --- Bar 4 (Steps 48~63) ---
    { step: 48, instrument: 'gong', intensity: 0.65, pitchMultiplier: 1.3 },
    { step: 48, instrument: 'warDrum', intensity: 0.9 },
    { step: 48, instrument: 'pipa', freq: PENTATONIC.C5, velocity: 0.75 },
    { step: 50, instrument: 'warDrum', intensity: 0.6 },
    { step: 52, instrument: 'warDrum', intensity: 0.85 },
    { step: 52, instrument: 'pipa', freq: PENTATONIC.A4, velocity: 0.7 },
    { step: 54, instrument: 'warDrum', intensity: 0.6 },
    { step: 56, instrument: 'warDrum', intensity: 0.85 },
    { step: 56, instrument: 'pipa', freq: PENTATONIC.G4, velocity: 0.7 },
    { step: 58, instrument: 'warDrum', intensity: 0.65 },
    { step: 60, instrument: 'warDrum', intensity: 0.8 },
    { step: 60, instrument: 'pipaRoll', freq: PENTATONIC.D4, velocity: 0.85 },
    { step: 61, instrument: 'warDrum', intensity: 0.75 },
    { step: 62, instrument: 'warDrum', intensity: 0.85 },
    { step: 63, instrument: 'warDrum', intensity: 0.9 }
  ]
};

// =========================================================================
// 3. Boss BGM (绝境首领狂澜 - 128 BPM Tense Battle Mode)
// =========================================================================
export const BOSS_BGM: BgmTrackConfig = {
  id: 'boss',
  name: '绝境首领 (Boss Climax)',
  bpm: 128,
  totalSteps: 64, // 4 bars
  droneBassEnabled: true,
  events: [
    // --- Bar 1 (Steps 0~15) ---
    { step: 0, instrument: 'gong', intensity: 0.85, pitchMultiplier: 0.95 },
    { step: 0, instrument: 'warDrum', intensity: 0.95 },
    { step: 0, instrument: 'suona', freq: PENTATONIC.G4, durationSec: 0.45, velocity: 0.85 },
    { step: 2, instrument: 'warDrum', intensity: 0.7 },
    { step: 4, instrument: 'warDrum', intensity: 0.9 },
    { step: 6, instrument: 'warDrum', intensity: 0.75 },
    { step: 8, instrument: 'warDrum', intensity: 0.95 },
    { step: 8, instrument: 'suona', freq: PENTATONIC.Bb4, durationSec: 0.4, velocity: 0.85, prevFreq: PENTATONIC.G4 },
    { step: 10, instrument: 'warDrum', intensity: 0.7 },
    { step: 12, instrument: 'warDrum', intensity: 0.9 },
    { step: 14, instrument: 'warDrum', intensity: 0.8 },

    // --- Bar 2 (Steps 16~31) ---
    { step: 16, instrument: 'gong', intensity: 0.8, pitchMultiplier: 1.1 },
    { step: 16, instrument: 'warDrum', intensity: 0.95 },
    { step: 16, instrument: 'suona', freq: PENTATONIC.D5, durationSec: 0.5, velocity: 0.9, prevFreq: PENTATONIC.Bb4 },
    { step: 18, instrument: 'warDrum', intensity: 0.7 },
    { step: 20, instrument: 'warDrum', intensity: 0.9 },
    { step: 22, instrument: 'warDrum', intensity: 0.75 },
    { step: 24, instrument: 'warDrum', intensity: 0.95 },
    { step: 24, instrument: 'suona', freq: PENTATONIC.Fs4, durationSec: 0.4, velocity: 0.85, prevFreq: PENTATONIC.D5 },
    { step: 26, instrument: 'warDrum', intensity: 0.7 },
    { step: 28, instrument: 'gong', intensity: 0.65, pitchMultiplier: 1.25 },
    { step: 28, instrument: 'warDrum', intensity: 0.9 },
    { step: 30, instrument: 'warDrum', intensity: 0.85 },
    { step: 31, instrument: 'warDrum', intensity: 0.85 },

    // --- Bar 3 (Steps 32~47) ---
    { step: 32, instrument: 'gong', intensity: 0.9, pitchMultiplier: 0.9 },
    { step: 32, instrument: 'warDrum', intensity: 1.0 },
    { step: 32, instrument: 'suona', freq: PENTATONIC.G4, durationSec: 0.45, velocity: 0.85 },
    { step: 34, instrument: 'warDrum', intensity: 0.75 },
    { step: 36, instrument: 'warDrum', intensity: 0.95 },
    { step: 38, instrument: 'warDrum', intensity: 0.75 },
    { step: 40, instrument: 'warDrum', intensity: 1.0 },
    { step: 40, instrument: 'suona', freq: PENTATONIC.D5, durationSec: 0.5, velocity: 0.95, prevFreq: PENTATONIC.G4 },
    { step: 42, instrument: 'warDrum', intensity: 0.75 },
    { step: 44, instrument: 'warDrum', intensity: 0.95 },
    { step: 44, instrument: 'gong', intensity: 0.7, pitchMultiplier: 1.15 },
    { step: 46, instrument: 'warDrum', intensity: 0.85 },

    // --- Bar 4 (Steps 48~63) ---
    { step: 48, instrument: 'gong', intensity: 0.85, pitchMultiplier: 1.2 },
    { step: 48, instrument: 'warDrum', intensity: 1.0 },
    { step: 48, instrument: 'suona', freq: PENTATONIC.Fs4, durationSec: 0.45, velocity: 0.9, prevFreq: PENTATONIC.D5 },
    { step: 50, instrument: 'warDrum', intensity: 0.75 },
    { step: 52, instrument: 'warDrum', intensity: 0.95 },
    { step: 54, instrument: 'warDrum', intensity: 0.8 },
    { step: 56, instrument: 'gong', intensity: 0.75, pitchMultiplier: 1.3 },
    { step: 56, instrument: 'warDrum', intensity: 1.0 },
    { step: 56, instrument: 'suona', freq: PENTATONIC.G4, durationSec: 0.55, velocity: 0.95, prevFreq: PENTATONIC.Fs4 },
    { step: 58, instrument: 'warDrum', intensity: 0.85 },
    { step: 60, instrument: 'gong', intensity: 0.8, pitchMultiplier: 1.4 },
    { step: 60, instrument: 'warDrum', intensity: 1.0 },
    { step: 61, instrument: 'warDrum', intensity: 0.9 },
    { step: 62, instrument: 'warDrum', intensity: 0.95 },
    { step: 63, instrument: 'warDrum', intensity: 1.0 }
  ]
};

export const ALL_BGM_TRACKS: Record<'lobby' | 'battle' | 'boss', BgmTrackConfig> = {
  lobby: LOBBY_BGM,
  battle: BATTLE_BGM,
  boss: BOSS_BGM
};
