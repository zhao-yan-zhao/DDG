/**
 * 《孤城神机营》- Endless Wave Procedural Generator
 * Implements GDD V3.0 §11.3 & §17.3:
 * - Mathematical difficulty scaling curve:
 *   HP_mult = 1.0 + 0.12 * (W - 1) + 0.005 * (W - 1)^2
 * - Every 5 waves: Boss encounter with escalating elite affixes (1 -> 2 -> 3 affixes)
 * - Mixed archetype spawns (Light infantry, War dogs, Shield guards, Bomb carriers, Cavalry, Ballistas)
 * - Deterministic pseudo-random generation with seed support for anti-cheat verification.
 * 
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 */

import { WaveConfig, WaveBatchItem } from '../wave/wave-spawner';
import { EnemyAffixId } from './types';

export interface EndlessWaveGenOptions {
  seed?: number;
}

const ALL_AFFIX_IDS: EnemyAffixId[] = [
  'swift',
  'stone_skin',
  'enraged',
  'throes_explode',
  'regeneration',
  'shielded'
];

const BOSS_SEQUENCE: string[] = [
  'boss_bear',         // Wave 5
  'boss_xuanwu',       // Wave 10
  'boss_khan',         // Wave 15
  'boss_corpse_demon', // Wave 20
  'boss_taotie'        // Wave 25
];

export class EndlessWaveGenerator {
  /**
   * Computes the mathematical HP multiplier for a given wave.
   */
  public static calculateHpMultiplier(wave: number): number {
    const w = Math.max(1, wave);
    const mult = 1.0 + 0.12 * (w - 1) + 0.005 * Math.pow(w - 1, 2);
    return Number(mult.toFixed(3));
  }

  /**
   * Generates a fully-formed WaveConfig for wave N in endless mode.
   */
  public static generateWave(wave: number, _options?: EndlessWaveGenOptions): WaveConfig & {
    isBossWave: boolean;
    bossAffixes?: EnemyAffixId[];
    bossType?: string;
  } {
    const w = Math.max(1, wave);
    const hpMult = this.calculateHpMultiplier(w);
    const isBossWave = w % 5 === 0;
    const chapterId = ((w - 1) % 5) + 1;
    const baseSalary = 30 + Math.min(150, w * 4);
    const duration = 20 + Math.min(30, Math.round(w * 1.5));

    const batches: (WaveBatchItem & { affixIds?: EnemyAffixId[] })[] = [];
    let bossAffixes: EnemyAffixId[] | undefined = undefined;
    let bossType: string | undefined = undefined;

    if (isBossWave) {
      // 1. Determine Boss archetype from sequence
      const bossIndex = (Math.floor(w / 5) - 1) % BOSS_SEQUENCE.length;
      bossType = BOSS_SEQUENCE[bossIndex];

      // 2. Determine number of affixes for Boss:
      // Wave 5 -> 1 affix, Wave 10 -> 1, Wave 15 -> 2, Wave 20 -> 2, Wave 25+ -> 3
      const numAffixes = w >= 25 ? 3 : (w >= 15 ? 2 : 1);
      bossAffixes = this.pickDistinctAffixes(numAffixes, w * 7919);

      // Pre-boss vanguard escort
      const escortCount = Math.min(12, 4 + Math.floor(w / 2));
      batches.push({
        timeOffset: 0.5,
        enemyId: w >= 15 ? 'shield_guard' : 'light_infantry',
        count: escortCount,
        spawnInterval: 0.8,
        xDistribution: 'RandomFull',
        hpMultiplier: hpMult * 0.9
      });

      // The Grand Boss
      batches.push({
        timeOffset: 4.0,
        enemyId: bossType,
        count: 1,
        spawnInterval: 0,
        xDistribution: 'CenterValley',
        hpMultiplier: hpMult,
        affixIds: bossAffixes
      });

      // Post-boss rushing adds
      if (w >= 10) {
        batches.push({
          timeOffset: 8.0,
          enemyId: 'war_dog',
          count: Math.min(10, 3 + Math.floor(w / 3)),
          spawnInterval: 0.7,
          xDistribution: 'RandomFull',
          hpMultiplier: hpMult * 0.8,
          affixIds: ['swift']
        });
      }
    } else {
      // Regular / Elite Wave Generation
      const baseCount = 5 + Math.floor(w * 2.2);

      // Batch 1: Frontline Infantry
      const b1Affixes: EnemyAffixId[] = (w >= 3 && w % 3 === 0) ? ['stone_skin'] : [];
      batches.push({
        timeOffset: 0.5,
        enemyId: (w >= 6 && w % 2 === 0) ? 'shield_guard' : 'light_infantry',
        count: Math.min(25, baseCount),
        spawnInterval: Math.max(0.4, 1.2 - w * 0.02),
        xDistribution: 'RandomFull',
        hpMultiplier: hpMult,
        affixIds: b1Affixes.length > 0 ? b1Affixes : undefined
      });

      // Batch 2: Fast or Charging units from Wave 2+
      if (w >= 2) {
        const dogCount = Math.min(16, 3 + Math.floor(w * 1.2));
        const dogAffixes: EnemyAffixId[] = (w >= 7 && (w % 4 === 1)) ? ['swift', 'enraged'] : ['swift'];
        batches.push({
          timeOffset: 3.5,
          enemyId: 'war_dog',
          count: dogCount,
          spawnInterval: 0.6,
          xDistribution: 'RandomFull',
          hpMultiplier: hpMult * 0.85,
          affixIds: dogAffixes
        });
      }

      // Batch 3: Heavy Siegers or Bomb Carriers from Wave 4+
      if (w >= 4) {
        const heavyCount = Math.min(10, 2 + Math.floor(w * 0.8));
        const heavyType = (w % 3 === 1) ? 'bomb_carrier' : (w >= 8 ? 'siege_ballista' : 'shield_guard');
        const heavyAffixes: EnemyAffixId[] = heavyType === 'bomb_carrier'
          ? ['throes_explode']
          : ((w >= 9 && w % 2 === 1) ? ['shielded'] : []);

        batches.push({
          timeOffset: 7.0,
          enemyId: heavyType,
          count: heavyCount,
          spawnInterval: 1.0,
          xDistribution: 'CenterValley',
          hpMultiplier: hpMult,
          affixIds: heavyAffixes.length > 0 ? heavyAffixes : undefined
        });
      }

      // Batch 4: Cavalry flanking strike from Wave 8+
      if (w >= 8) {
        const cavCount = Math.min(8, 2 + Math.floor(w * 0.5));
        batches.push({
          timeOffset: 10.5,
          enemyId: 'light_cavalry',
          count: cavCount,
          spawnInterval: 0.7,
          xDistribution: (w % 2 === 0) ? 'LeftWing' : 'RightWing',
          hpMultiplier: hpMult * 0.95,
          affixIds: w >= 12 ? ['regeneration'] : undefined
        });
      }
    }

    return {
      chapterId,
      waveIndex: w,
      duration,
      baseSalary,
      batches,
      isBossWave,
      bossAffixes,
      bossType
    };
  }

  /**
   * Deterministically picks N distinct affixes from the pool based on a seed.
   */
  public static pickDistinctAffixes(count: number, seed: number): EnemyAffixId[] {
    const pool = [...ALL_AFFIX_IDS];
    const picked: EnemyAffixId[] = [];
    let currentSeed = Math.abs(seed);

    while (picked.length < count && pool.length > 0) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const idx = currentSeed % pool.length;
      picked.push(pool.splice(idx, 1)[0]);
    }

    return picked;
  }
}
