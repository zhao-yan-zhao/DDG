/**
 * 《孤城神机营》- Procedural SFX Generator
 * 18+ High-fidelity procedural battlefield and UI sound effects using Web Audio API:
 * - Weapon Fire: Arquebus, Heavy Cannon, Nest of Bees Rocket Volley, Repeating Crossbow.
 * - Hit & Impact: Sword Slash Clank, Shield Bash Thud, Crit Gong Crash, Wall Hit, Ink Dissolve Death.
 * - 4 Elemental Reactions: Fire Blast, Thunderfire Judgement, Ice Shatter, Nether Poison Flame.
 * - UI & Economy: Bronze Button Click, Vermilion Stamp Thud, Copper Coin Jingle, Iron Clink, Merge Chime.
 * - Fanfare & Specials: Victory Fanfare, Defeat Jingle, Commander Ultimate War Cry, Light Click.
 */

import { AudioContextManager } from './audio-context-manager';
import { AudioBus } from './audio-bus';
import { MusicalInstruments } from './musical-instruments';

export class ProceduralSfx {
  private static instance: ProceduralSfx | null = null;

  public static getInstance(): ProceduralSfx {
    if (!ProceduralSfx.instance) {
      ProceduralSfx.instance = new ProceduralSfx();
    }
    return ProceduralSfx.instance;
  }

  public static resetForTesting(): void {
    ProceduralSfx.instance = null;
  }

  private getContextAndBus(): { ctx: AudioContext | null; dest: AudioNode | null } {
    const bus = AudioBus.getInstance();
    if (bus.isSfxSilenced()) {
      return { ctx: null, dest: null };
    }
    const ctx = AudioContextManager.getInstance().getContext();
    if (!ctx) return { ctx: null, dest: null };

    const dest = bus.getSfxBusNode() || ctx.destination;
    return { ctx, dest };
  }

  // =========================================================================
  // 1. 军械开火音效 (Weapon Fire)
  // =========================================================================

  /**
   * 神机火铳 / 火绳枪 (Arquebus / Fire Lance Shot)
   * 0.015s 3.2kHz bandpass noise ignition + sawtooth 420Hz->55Hz crackle in 0.09s + muzzle pop
   */
  public playArquebusShot(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    // A. Powder ignition spark (high frequency noise)
    const noiseBuffer = MusicalInstruments.createNoiseBuffer(ctx, 0.02);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3200, t);
    noiseFilter.Q.setValueAtTime(2.5, t);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.02);

    // B. Barrel shockwave (sawtooth sweep 420 -> 55 Hz)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);

    oscGain.gain.setValueAtTime(0.75, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  /**
   * 红衣大炮重炮轰鸣 (Heavy Cannon Blast)
   * 120Hz -> 28Hz sub-bass thump in 0.45s + lowpass filtered noise explosion + room rumble
   */
  public playCannonBlast(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    // A. Sub-bass shockwave
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.45);

    oscGain.gain.setValueAtTime(0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.45);

    // B. Lowpass noise blast
    const noiseBuffer = MusicalInstruments.createNoiseBuffer(ctx, 0.35);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.35);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.35);
  }

  /**
   * 一窝蜂连发火箭啸叫 (Nest of Bees Rocket Volley)
   * 4 overlapping 300Hz->1300Hz chirps spaced 35ms apart + rocket propellant hiss
   */
  public playRocketVolley(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const count = 4;
    const spacing = 0.035;

    for (let i = 0; i < count; i++) {
      const startTime = t + i * spacing;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300 + i * 40, startTime);
      osc.frequency.exponentialRampToValueAtTime(1300 + i * 60, startTime + 0.08);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }

    // Trailing propellant burn hiss
    const noiseBuffer = MusicalInstruments.createNoiseBuffer(ctx, 0.28);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(2.0, t);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.4, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);

    noiseSrc.start(t);
    noiseSrc.stop(t + 0.28);
  }

  /**
   * 机括连弩击发 (Repeating Crossbow Mechanical Twang)
   * Ratchet click pulses (0ms, 12ms) + triangle bow snap 600Hz->200Hz in 0.07s
   */
  public playCrossbowTwang(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    // Ratchet click double pulse
    [0, 0.012].forEach((offset) => {
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(1500, t + offset);
      clickGain.gain.setValueAtTime(0.3, t + offset);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.008);

      click.connect(clickGain);
      clickGain.connect(dest);
      click.start(t + offset);
      click.stop(t + offset + 0.008);
    });

    // Bowstring release snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.07);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // =========================================================================
  // 2. 受击与打击音效 (Hit & Impact)
  // =========================================================================

  /**
   * 刀剑劈砍金铁交鸣 (Sword Slash Metal Clank)
   * Dual sine resonant peaks (2200Hz, 3450Hz), 0ms attack, 0.14s fast decay
   */
  public playBladeClank(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    [2200, 3450].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  /**
   * 盾牌重击沉闷撞响 (Shield Bash Thud)
   * Sine 95Hz->30Hz low thud in 0.16s + 200Hz muffled absorption noise
   */
  public playShieldBash(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.16);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.16);

    // Muffled wood/bronze impact
    const noise = MusicalInstruments.createNoiseBuffer(ctx, 0.08);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.5, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.08);
  }

  /**
   * 破阵暴击铜锣脆响 (Crit Gong Crash)
   * FM gong (carrier 680Hz, modulator 960Hz, index 3.8) + 4.5kHz sparkling shimmer
   */
  public playCritGong(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    // FM Gong core
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const masterGain = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(680, t);
    mod.type = 'sine';
    mod.frequency.setValueAtTime(960, t);

    modGain.gain.setValueAtTime(960 * 3.8, t);
    modGain.gain.exponentialRampToValueAtTime(1.0, t + 0.18);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    masterGain.gain.setValueAtTime(0.001, t);
    masterGain.gain.linearRampToValueAtTime(0.8, t + 0.005);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    carrier.connect(masterGain);
    masterGain.connect(dest);

    carrier.start(t);
    mod.start(t);
    carrier.stop(t + 0.6);
    mod.stop(t + 0.6);

    // Golden shimmer sparkle
    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(4500, t);
    sGain.gain.setValueAtTime(0.3, t);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    shimmer.connect(sGain);
    sGain.connect(dest);
    shimmer.start(t);
    shimmer.stop(t + 0.25);
  }

  /**
   * 城防受击砖石震裂 (City Wall Hit Impact)
   * 60Hz rumble + brick/mortar crumble lowpass noise
   */
  public playWallHit(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.22);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * 敌军水墨消散 / 阵亡融解 (Enemy Death / Ink Splash Dissolve)
   * Soft airy whoosh (400Hz->80Hz) + dissolving ink hiss
   */
  public playEnemyDeath(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.25);

    const noise = MusicalInstruments.createNoiseBuffer(ctx, 0.25);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(1.5, t);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.25, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.25);
  }

  // =========================================================================
  // 3. 四大元素反应专属爆炸 (Elemental Reactions)
  // =========================================================================

  /**
   * 猛火轰爆 (Fire Blast Reaction)
   * 70Hz flame shockwave + 2200Hz->160Hz wideband noise sweep detonation + crackling embers
   */
  public playFireBlastReaction(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    // Sub-bass shockwave
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.3);
    oscGain.gain.setValueAtTime(0.85, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.3);

    // Wideband flame blast
    const noise = MusicalInstruments.createNoiseBuffer(ctx, 0.32);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(160, t + 0.28);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.8, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.32);
  }

  /**
   * 雷火天劫 (Thunderfire Judgement Reaction)
   * 4.8kHz high-voltage arc snap + 950Hz->40Hz air-tearing thunderbolt + 40Hz electrical hum
   */
  public playThunderJudgementReaction(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    // 1. High-voltage electrostatic snap
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(4800, t);
    snapGain.gain.setValueAtTime(0.9, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    snap.connect(snapGain);
    snapGain.connect(dest);
    snap.start(t);
    snap.stop(t + 0.015);

    // 2. Thunderbolt air-rip crash
    const thunder = ctx.createOscillator();
    const thunderGain = ctx.createGain();
    thunder.type = 'sawtooth';
    thunder.frequency.setValueAtTime(950, t);
    thunder.frequency.exponentialRampToValueAtTime(40, t + 0.45);

    thunderGain.gain.setValueAtTime(0.95, t);
    thunderGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    thunder.connect(thunderGain);
    thunderGain.connect(dest);
    thunder.start(t);
    thunder.stop(t + 0.45);

    // 3. Electrical hum
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(45, t);
    humGain.gain.setValueAtTime(0.6, t);
    humGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    hum.connect(humGain);
    humGain.connect(dest);
    hum.start(t);
    hum.stop(t + 0.35);
  }

  /**
   * 碎冰崩裂 (Ice Shatter Reaction)
   * 5 inharmonic high crystal bursts (2.4k, 3.2k, 4.5k, 5.8k, 7.1kHz) with brittle micro-decays
   */
  public playIceShatterReaction(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const freqs = [2400, 3200, 4500, 5800, 7100];
    freqs.forEach((freq, idx) => {
      const delay = idx * 0.006;
      const startTime = t + delay;
      const decay = 0.06 + idx * 0.018;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + decay);
    });
  }

  /**
   * 幽冥毒火 (Nether Poison Flame Reaction)
   * 1.8kHz corrosive hiss noise + 3 random descending bubble pops (400->180Hz)
   */
  public playNetherPoisonReaction(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    // Corrosive hiss
    const noise = MusicalInstruments.createNoiseBuffer(ctx, 0.35);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(2.8, t);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.65, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.35);

    // Bubble pops
    const bubbles = [
      { start: 420, end: 180, delay: 0.04 },
      { start: 360, end: 150, delay: 0.12 },
      { start: 480, end: 200, delay: 0.2 }
    ];

    bubbles.forEach((b) => {
      const bTime = t + b.delay;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();

      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(b.start, bTime);
      bOsc.frequency.exponentialRampToValueAtTime(b.end, bTime + 0.04);

      bGain.gain.setValueAtTime(0.4, bTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.04);

      bOsc.connect(bGain);
      bGain.connect(dest);
      bOsc.start(bTime);
      bOsc.stop(bTime + 0.04);
    });
  }

  // =========================================================================
  // 4. 界面与交互音效 (UI & Economy)
  // =========================================================================

  /**
   * 青铜浮雕按键机械卡扣 (Bronze Button Click)
   * Dual heavy metallic clicks (1250Hz, 380Hz, 0.035s)
   */
  public playBronzeButtonClick(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    [1250, 380].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.035);
    });
  }

  /**
   * 宣德朱砂印章沉重盖落咚响 (Vermilion Seal Stamp Thud)
   * 85Hz->20Hz heavy drop impact 0.2s + desktop resonance
   */
  public playVermilionStamp(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.2);

    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.2);

    // Desktop wood resonance
    const wood = ctx.createOscillator();
    const woodGain = ctx.createGain();
    wood.type = 'sine';
    wood.frequency.setValueAtTime(120, t);
    woodGain.gain.setValueAtTime(0.5, t);
    woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    wood.connect(woodGain);
    woodGain.connect(dest);
    wood.start(t);
    wood.stop(t + 0.15);
  }

  /**
   * 大明通宝铜钱清脆入袋 (Copper Coin Jingle)
   * Dual high-pitched coin clinks (2180Hz, 3250Hz) + shimmer
   */
  public playCoinJingle(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    [
      { freq: 2180, delay: 0 },
      { freq: 3250, delay: 0.045 }
    ].forEach((coin) => {
      const startTime = t + coin.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(coin.freq, startTime);

      gain.gain.setValueAtTime(0.55, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  /**
   * 玄铁开采与锻造撞击 (Iron Clink)
   * 880Hz hard anvil strike + 160Hz dense solid iron absorption
   */
  public playIronClink(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    // High metal anvil strike
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, t);
    gain1.gain.setValueAtTime(0.65, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc1.connect(gain1);
    gain1.connect(dest);
    osc1.start(t);
    osc1.stop(t + 0.16);

    // Low solid block thud
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(160, t);
    gain2.gain.setValueAtTime(0.5, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc2.connect(gain2);
    gain2.connect(dest);
    osc2.start(t);
    osc2.stop(t + 0.12);
  }

  /**
   * 器械二合一升星金色和弦 (Merge Chime)
   * Ascending pentatonic chime (C5, E5, G5, C6) with golden bell harmonics
   */
  public playMergeChime(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.32);
    });
  }

  // =========================================================================
  // 5. 局末与主帅特殊音效 (Fanfare & Specials)
  // =========================================================================

  /**
   * 通关大捷凯旋乐 (Victory Fanfare)
   */
  public playVictoryFanfare(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;

    const melody = [
      { freq: 261.63, dur: 0.15 }, // C4
      { freq: 329.63, dur: 0.15 }, // E4
      { freq: 392.0, dur: 0.15 },  // G4
      { freq: 523.25, dur: 0.45 }  // C5
    ];

    let t = ctx.currentTime;
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, t);

      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + note.dur);
      t += note.dur;
    });
  }

  /**
   * 守城失守哀鸣 (Defeat Sound)
   */
  public playDefeatSound(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;

    const notes = [329.63, 293.66, 261.63, 220.0]; // E4, D4, C4, A3
    let t = ctx.currentTime;

    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + 0.28);
      t += 0.24;
    });
  }

  /**
   * 主帅怒气大招知行合一 (Commander Ultimate War Cry)
   */
  public playUltimateVoice(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(120, t);
    osc1.frequency.linearRampToValueAtTime(360, t + 0.2);
    osc1.frequency.exponentialRampToValueAtTime(60, t + 0.85);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(240, t);
    osc2.frequency.linearRampToValueAtTime(720, t + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(120, t + 0.85);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.85);
    osc2.stop(t + 0.85);
  }

  /**
   * 轻微点击 (Simple UI Click)
   */
  public playClick(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * 战鼓齐鸣出征号令 (War Drums Cadence)
   * Two rapid heavy war drum thumps (0.0s and 0.16s) with sub-bass resonance to signal wave start
   */
  public playWarDrums(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    MusicalInstruments.playWarDrum(0.9, dest, 0);
    MusicalInstruments.playWarDrum(1.0, dest, 0.16);
  }

  /**
   * 守关首领警报号角 (Boss Alert Horn & War Drums)
   * Heavy gong crash + consecutive war drums to signal boss emergence
   */
  public playBossAlert(): void {
    const { ctx, dest } = this.getContextAndBus();
    if (!ctx || !dest) return;
    MusicalInstruments.playGong(1.0, 0.8, dest, 0);
    MusicalInstruments.playWarDrum(1.0, dest, 0.05);
    MusicalInstruments.playWarDrum(1.0, dest, 0.22);
  }
}
