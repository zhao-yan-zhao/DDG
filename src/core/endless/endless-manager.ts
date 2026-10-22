/**
 * 《孤城神机营》- Endless Mode Session Manager & Military Rank Engine
 * Implements GDD V3.0 §11.3 & §17.3:
 * - Military Rank Tiers (神机营卒 -> 定国公·太师) evaluation
 * - Dynamic Score Formula & Gold/Iron reward calculation
 * - Anti-cheat Combat Checksum generator (CRC-like deterministic validation)
 * 
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 */

import {
  MilitaryRankTier,
  MILITARY_RANK_TIERS,
  EndlessSettlementResult
} from './types';

export interface EndlessSessionStats {
  waveReached: number;
  totalKills: number;
  eliteKills: number;
  bossKills: number;
  wallRemainingHp: number;
  wallMaxHp: number;
  elapsedTimeSec: number;
  seed?: number;
}

export class EndlessManager {
  /**
   * Resolves the player's military rank tier based on highest wave reached.
   */
  public static getMilitaryRankTier(wave: number): MilitaryRankTier {
    const w = Math.max(1, wave);
    for (const tier of MILITARY_RANK_TIERS) {
      if (w >= tier.minWave && w <= tier.maxWave) {
        return tier;
      }
    }
    return MILITARY_RANK_TIERS[MILITARY_RANK_TIERS.length - 1];
  }

  /**
   * Calculates comprehensive battle score based on wave depth, kill counts, and wall integrity.
   * GDD V3.0 §17.2: Score = Wave*1000 + Kills*60 + EliteKills*250 + BossKills*800 + WallHp%*150
   */
  public static calculateScore(stats: EndlessSessionStats): number {
    const wallRatio = stats.wallMaxHp > 0
      ? Math.max(0, Math.min(1.0, stats.wallRemainingHp / stats.wallMaxHp))
      : 0;

    const waveScore = stats.waveReached * 1000;
    const killScore = stats.totalKills * 60;
    const eliteScore = stats.eliteKills * 250;
    const bossScore = stats.bossKills * 800;
    const wallScore = Math.floor(wallRatio * 15000);

    return waveScore + killScore + eliteScore + bossScore + wallScore;
  }

  /**
   * Computes Gold and Iron currency rewards upon endless run conclusion.
   * Gold = 100 + Wave * 40
   * Iron = 20 + floor(Wave * 6)
   */
  public static calculateRewards(waveReached: number): { gold: number; iron: number } {
    const w = Math.max(1, waveReached);
    const gold = 100 + w * 40;
    const iron = 20 + Math.floor(w * 6);
    return { gold, iron };
  }

  /**
   * Generates a deterministic anti-cheat checksum string (GDD §17.3).
   */
  public static generateChecksum(stats: EndlessSessionStats, score: number): string {
    const seed = stats.seed ?? 1729000000;
    const raw = `${stats.waveReached}_${stats.totalKills}_${stats.eliteKills}_${stats.bossKills}_${score}_${Math.floor(stats.elapsedTimeSec)}_${seed}`;
    
    // Pure headless hash (FNV-1a 32-bit variant)
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Evaluates the final settlement result of an endless run.
   */
  public static evaluateSettlement(
    stats: EndlessSessionStats,
    personalBestWave: number = 0
  ): EndlessSettlementResult {
    const score = this.calculateScore(stats);
    const rewards = this.calculateRewards(stats.waveReached);
    const rankTier = this.getMilitaryRankTier(stats.waveReached);
    const isNewPersonalRecord = stats.waveReached > personalBestWave;
    const checksum = this.generateChecksum(stats, score);

    return {
      waveReached: stats.waveReached,
      score,
      totalKills: stats.totalKills,
      eliteKills: stats.eliteKills,
      bossKills: stats.bossKills,
      remainingWallHp: stats.wallRemainingHp,
      maxWallHp: stats.wallMaxHp,
      goldEarned: rewards.gold,
      ironEarned: rewards.iron,
      militaryTitle: rankTier.title,
      honorBadge: rankTier.honorBadge,
      isNewPersonalRecord,
      checksum
    };
  }
}
