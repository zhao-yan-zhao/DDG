/**
 * 《孤城神机营》- Endless Mode & Leaderboard Comprehensive Unit Tests
 * 100% Headless Unit Tests (Zero DOM, Zero Phaser).
 * Tests:
 * 1. EndlessWaveGenerator difficulty curve, boss wave cadence, and deterministic affixes
 * 2. AffixEngine mutation, runtime ticks (regeneration, enrage), and death explosions
 * 3. EndlessManager rank tier promotions, score formula, and anti-cheat checksum
 * 4. LeaderboardManager national & city ladder rankings and live player insertion
 * 5. ProfileStorage persistence and sanitization of endless records
 */

import { describe, it, expect } from 'vitest';
import { EndlessWaveGenerator } from '../src/core/endless/endless-wave-generator';
import { AffixEngine } from '../src/core/endless/affix-engine';
import { EndlessManager } from '../src/core/endless/endless-manager';
import { LeaderboardManager } from '../src/core/endless/leaderboard-manager';
import { MILITARY_RANK_TIERS } from '../src/core/endless/types';
import { EnemyFactory } from '../src/core/enemy/enemy-entity';
import { createDefaultProfile, sanitizeProfile } from '../src/core/meta/profile-storage';

describe('Endless Mode & Leaderboard Domain Suite', () => {
  describe('1. EndlessWaveGenerator', () => {
    it('computes correct mathematical HP multipliers', () => {
      // W=1: 1.0 + 0 + 0 = 1.0
      expect(EndlessWaveGenerator.calculateHpMultiplier(1)).toBe(1.0);
      // W=2: 1.0 + 0.12*1 + 0.005*1 = 1.125
      expect(EndlessWaveGenerator.calculateHpMultiplier(2)).toBe(1.125);
      // W=10: 1.0 + 0.12*9 + 0.005*81 = 1.0 + 1.08 + 0.405 = 2.485
      expect(EndlessWaveGenerator.calculateHpMultiplier(10)).toBe(2.485);
      // W=20: 1.0 + 0.12*19 + 0.005*361 = 1.0 + 2.28 + 1.805 = 5.085
      expect(EndlessWaveGenerator.calculateHpMultiplier(20)).toBe(5.085);
    });

    it('correctly identifies Boss waves every 5 waves', () => {
      expect(EndlessWaveGenerator.generateWave(1).isBossWave).toBe(false);
      expect(EndlessWaveGenerator.generateWave(4).isBossWave).toBe(false);
      expect(EndlessWaveGenerator.generateWave(5).isBossWave).toBe(true);
      expect(EndlessWaveGenerator.generateWave(9).isBossWave).toBe(false);
      expect(EndlessWaveGenerator.generateWave(10).isBossWave).toBe(true);
      expect(EndlessWaveGenerator.generateWave(25).isBossWave).toBe(true);
    });

    it('cycles through the 5 Grand Bosses sequentially', () => {
      const w5 = EndlessWaveGenerator.generateWave(5);
      expect(w5.bossType).toBe('boss_bear');

      const w10 = EndlessWaveGenerator.generateWave(10);
      expect(w10.bossType).toBe('boss_xuanwu');

      const w15 = EndlessWaveGenerator.generateWave(15);
      expect(w15.bossType).toBe('boss_khan');

      const w20 = EndlessWaveGenerator.generateWave(20);
      expect(w20.bossType).toBe('boss_corpse_demon');

      const w25 = EndlessWaveGenerator.generateWave(25);
      expect(w25.bossType).toBe('boss_taotie');

      // Cycles after wave 25
      const w30 = EndlessWaveGenerator.generateWave(30);
      expect(w30.bossType).toBe('boss_bear');
    });

    it('scales the number of boss affixes with depth (1 -> 2 -> 3)', () => {
      const w5 = EndlessWaveGenerator.generateWave(5);
      expect(w5.bossAffixes).toBeDefined();
      expect(w5.bossAffixes!.length).toBe(1);

      const w15 = EndlessWaveGenerator.generateWave(15);
      expect(w15.bossAffixes!.length).toBe(2);

      const w25 = EndlessWaveGenerator.generateWave(25);
      expect(w25.bossAffixes!.length).toBe(3);
    });

    it('picks distinct deterministic affixes with seed', () => {
      const affixes = EndlessWaveGenerator.pickDistinctAffixes(3, 12345);
      expect(affixes.length).toBe(3);
      // Must be unique
      const unique = new Set(affixes);
      expect(unique.size).toBe(3);
    });
  });

  describe('2. AffixEngine', () => {
    it('applies Swift (+30% move speed)', () => {
      const enemy = EnemyFactory.createOrdinary();
      const originalSpeed = enemy.moveSpeed;
      AffixEngine.applyAffixes(enemy, ['swift']);
      expect(enemy.moveSpeed).toBeCloseTo(originalSpeed * 1.30, 2);
    });

    it('applies Stone Skin (+100 armor)', () => {
      const enemy = EnemyFactory.createOrdinary();
      const originalArmor = enemy.armor;
      AffixEngine.applyAffixes(enemy, ['stone_skin']);
      expect(enemy.armor).toBe(originalArmor + 100);
    });

    it('applies Shielded (+40% max HP shield)', () => {
      const enemy = EnemyFactory.createOrdinary();
      expect(enemy.shield).toBe(0);
      AffixEngine.applyAffixes(enemy, ['shielded']);
      expect(enemy.shield).toBe(Math.round(enemy.maxHp * 0.40));
    });

    it('ticks Regeneration (3% max HP per second)', () => {
      const enemy = EnemyFactory.createOrdinary();
      AffixEngine.applyAffixes(enemy, ['regeneration']);
      enemy.currentHp = 20; // Damaged

      const res = AffixEngine.tick(enemy, 1.0);
      expect(res.healed).toBeCloseTo(enemy.maxHp * 0.03, 1);
      expect(enemy.currentHp).toBeCloseTo(20 + enemy.maxHp * 0.03, 1);
    });

    it('triggers Enraged frenzy below 50% HP', () => {
      const enemy = EnemyFactory.createOrdinary();
      const baseSpeed = enemy.moveSpeed;
      AffixEngine.applyAffixes(enemy, ['enraged']);
      enemy.currentHp = enemy.maxHp * 0.40; // Under 50%

      const res = AffixEngine.tick(enemy, 0.1);
      expect(res.enragedTriggered).toBe(true);
      expect(enemy.moveSpeed).toBeCloseTo(baseSpeed * 1.40, 2);
    });

    it('triggers Throes Explode on death with area damage', () => {
      const enemy = EnemyFactory.createOrdinary({ x: 300, y: 700 });
      AffixEngine.applyAffixes(enemy, ['throes_explode']);

      const explosion = AffixEngine.onEnemyDeath(enemy);
      expect(explosion).not.toBeNull();
      expect(explosion!.x).toBe(300);
      expect(explosion!.y).toBe(700);
      expect(explosion!.radius).toBe(102); // 1.5m
      expect(explosion!.damage).toBeGreaterThan(0);
    });
  });

  describe('3. EndlessManager', () => {
    it('promotes military rank titles across wave brackets', () => {
      expect(EndlessManager.getMilitaryRankTier(1).title).toBe('神机营卒');
      expect(EndlessManager.getMilitaryRankTier(4).title).toBe('神机营卒');
      expect(EndlessManager.getMilitaryRankTier(5).title).toBe('把总·哨官');
      expect(EndlessManager.getMilitaryRankTier(10).title).toBe('千总·守备');
      expect(EndlessManager.getMilitaryRankTier(15).title).toBe('游击将军');
      expect(EndlessManager.getMilitaryRankTier(20).title).toBe('参将·副总兵');
      expect(EndlessManager.getMilitaryRankTier(30).title).toBe('神机营提督');
      expect(EndlessManager.getMilitaryRankTier(40).title).toBe('兵部尚书');
      expect(EndlessManager.getMilitaryRankTier(50).title).toBe('定国公·太师');
      expect(EndlessManager.getMilitaryRankTier(100).title).toBe('定国公·太师');
    });

    it('calculates score according to GDD formula', () => {
      const stats = {
        waveReached: 10,
        totalKills: 80,
        eliteKills: 10,
        bossKills: 2,
        wallRemainingHp: 800,
        wallMaxHp: 1000,
        elapsedTimeSec: 180
      };
      // Wave: 10 * 1000 = 10000
      // Kills: 80 * 60 = 4800
      // Elite: 10 * 250 = 2500
      // Boss: 2 * 800 = 1600
      // Wall: floor(0.8 * 15000) = 12000
      // Total = 30900
      expect(EndlessManager.calculateScore(stats)).toBe(30900);
    });

    it('calculates gold and iron rewards', () => {
      const rewards = EndlessManager.calculateRewards(10);
      expect(rewards.gold).toBe(100 + 10 * 40); // 500
      expect(rewards.iron).toBe(20 + 60);       // 80
    });

    it('generates reproducible 8-character hex checksum', () => {
      const stats = {
        waveReached: 12,
        totalKills: 110,
        eliteKills: 15,
        bossKills: 2,
        wallRemainingHp: 650,
        wallMaxHp: 1000,
        elapsedTimeSec: 240,
        seed: 123456
      };
      const cs1 = EndlessManager.generateChecksum(stats, 45000);
      const cs2 = EndlessManager.generateChecksum(stats, 45000);
      expect(cs1).toHaveLength(8);
      expect(cs1).toBe(cs2);
    });

    it('evaluates settlement result accurately', () => {
      const stats = {
        waveReached: 15,
        totalKills: 120,
        eliteKills: 18,
        bossKills: 3,
        wallRemainingHp: 900,
        wallMaxHp: 1000,
        elapsedTimeSec: 320
      };
      const result = EndlessManager.evaluateSettlement(stats, 10);
      expect(result.waveReached).toBe(15);
      expect(result.isNewPersonalRecord).toBe(true);
      expect(result.militaryTitle).toBe('游击将军');
      expect(result.goldEarned).toBeGreaterThan(0);
      expect(result.ironEarned).toBeGreaterThan(0);
      expect(result.checksum).toHaveLength(8);
    });
  });

  describe('4. LeaderboardManager', () => {
    it('returns top 10 national and city rankings with ranks 1..N', () => {
      const lm = new LeaderboardManager();
      const national = lm.getRankings('national');
      expect(national.entries.length).toBe(10);
      expect(national.entries[0].rank).toBe(1);
      expect(national.entries[0].maxWave).toBeGreaterThanOrEqual(national.entries[1].maxWave);

      const city = lm.getRankings('city');
      expect(city.entries.length).toBeGreaterThanOrEqual(5);
      expect(city.entries[0].rank).toBe(1);
    });

    it('inserts player record and calculates live rank position', () => {
      const lm = new LeaderboardManager();
      // Player reaches wave 60 (surpasses #1 at wave 58)
      const res = lm.getRankings('national', {
        openId: 'player_test_001',
        nickname: '大明战神',
        maxWave: 60,
        score: 200000,
        commanderId: 'wang_shouren'
      });
      expect(res.playerRank).toBe(1);
      expect(res.entries[0].nickname).toBe('大明战神');
      expect(res.entries[0].militaryTitle).toBe('定国公·太师');
    });

    it('positions mid-tier player accurately in city ladder', () => {
      const lm = new LeaderboardManager();
      const res = lm.getRankings('city', {
        openId: 'player_test_002',
        nickname: '朝阳神枪手',
        cityName: '北京市朝阳区',
        maxWave: 25,
        score: 65000,
        commanderId: 'liu_bowen'
      });
      expect(res.playerRank).not.toBeNull();
      // Behind wave 27, ahead of wave 22
      expect(res.playerRank).toBe(4);
    });
  });

  describe('5. ProfileStorage Integration', () => {
    it('initializes default profile with clean endless data', () => {
      const profile = createDefaultProfile();
      expect(profile.endless).toBeDefined();
      expect(profile.endless?.highestWave).toBe(0);
      expect(profile.endless?.militaryTitle).toBe('神机营卒');
    });

    it('sanitizes corrupt endless profile safely', () => {
      const raw = {
        version: 1,
        currencies: { gold: 100, iron: 10, blueprints: 1 },
        endless: {
          highestWave: '25abc',
          highestScore: -50,
          totalRuns: null
        }
      };
      const sanitized = sanitizeProfile(raw);
      expect(sanitized.endless?.highestWave).toBe(0); // NaN fallback
      expect(sanitized.endless?.highestScore).toBe(0); // Neg fallback
      expect(sanitized.endless?.totalRuns).toBe(0);
      expect(sanitized.endless?.militaryTitle).toBe('神机营卒');
    });
  });
});
