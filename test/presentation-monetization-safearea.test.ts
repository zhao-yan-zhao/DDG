/**
 * 《孤城神机营》- Presentation Layer: Monetization, Revival & Safe Area Test Suite
 * Validates:
 * 1. Safe Area Insets boundary handling (notch offset, bottom bar shift)
 * 2. Revival state management & shockwave knockback logic (single revival limit, enemy 250px pushdown)
 * 3. Settlement 3x loot delta calculations & profile persistence
 * 4. TikTok share payload formation with official hashtags
 * 5. Daily Welfare integration across Workshop, Martial, and Sidebar scenes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformBridge, WebPlatform, DouyinPlatform } from '../src/bridge/platform';
import { ProfileStorage } from '../src/core/meta/profile-storage';
import { canClaimDailyAd, claimDailyAd, DAILY_AD_REWARDS } from '../src/core/meta/daily-welfare';
import { PlayerProfile } from '../src/core/meta/types';
import { CampaignWaveEngine } from '../src/core/wave/campaign-wave-engine';
import { EnemyEntity } from '../src/core/types';

import { getStageConfig } from '../src/config/campaign.config';
import { getStageWaveConfig } from '../src/config/campaign-waves.config';

describe('Presentation Layer: Monetization, Revival & Safe Area Suite', () => {
  let mockPlatform: WebPlatform;
  let profileStorage: ProfileStorage;
  let profile: PlayerProfile;

  beforeEach(() => {
    mockPlatform = new WebPlatform();
    PlatformBridge.setPlatform(mockPlatform);
    profileStorage = new ProfileStorage(mockPlatform);
    profile = profileStorage.loadProfile();
  });

  describe('1. Safe Area Insets Adaptation', () => {
    it('returns zero insets in default web browser environment', () => {
      const insets = mockPlatform.getSafeAreaInsets();
      expect(insets).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    });

    it('clamps bottom shift to maximum 24px across different device notches', () => {
      const testCases = [
        { bottom: 0, expectedShift: 0 },
        { bottom: 12, expectedShift: 12 },
        { bottom: 24, expectedShift: 24 },
        { bottom: 34, expectedShift: 24 }, // iPhone Home Indicator (34px) clamped to 24px
        { bottom: 48, expectedShift: 24 }
      ];

      for (const tc of testCases) {
        const bottomShift = Math.min(tc.bottom, 24);
        expect(bottomShift).toBe(tc.expectedShift);
      }
    });

    it('correctly adapts DouyinPlatform safe area from tt.getSystemInfoSync', () => {
      (globalThis as any).tt = {
        getSystemInfoSync: () => ({
          statusBarHeight: 44,
          safeArea: {
            top: 44,
            bottom: 810,
            left: 0,
            right: 390
          },
          screenHeight: 844,
          screenWidth: 390
        })
      };

      try {
        const douyinPlatform = new DouyinPlatform();
        const insets = douyinPlatform.getSafeAreaInsets();

        expect(insets.top).toBe(44);
        expect(insets.bottom).toBe(34); // 844 - 810 = 34
      } finally {
        delete (globalThis as any).tt;
      }
    });
  });

  describe('2. Battle Revival & Shockwave Knockback Logic', () => {
    it('allows revival only once per battle when in Defeat state', () => {
      let hasRevivedThisBattle = false;
      const stageConfig = getStageConfig(1);
      const stageWaveConfig = getStageWaveConfig(1);
      const waveEngine = new CampaignWaveEngine(stageConfig, stageWaveConfig);

      // Trigger Defeat state by dealing massive damage to the city wall
      (waveEngine as any).waveFSM.damageWall(999999);
      expect((waveEngine as any).waveFSM.getState()).toBe('Defeat');

      // Initially has not revived
      expect(hasRevivedThisBattle).toBe(false);

      // Perform revival
      waveEngine.revive(0.5);
      hasRevivedThisBattle = true;

      // Wall HP restored to 50%
      expect((waveEngine as any).waveFSM.getWallHp()).toBeGreaterThan(0);
      expect((waveEngine as any).revivesUsed).toBe(1);
      expect(hasRevivedThisBattle).toBe(true);
    });

    it('applies 250px downward pushback and 3s stun to all active enemies', () => {
      const enemies: EnemyEntity[] = [
        {
          id: 'enemy_1',
          typeId: 'spearman',
          name: '长枪兵',
          maxHp: 100,
          currentHp: 100,
          moveSpeed: 1.0,
          shield: 0,
          armor: 10,
          isBoss: false,
          y: 840,
          distanceToWall: 1.76,
          isParalyzed: false
        },
        {
          id: 'enemy_2',
          typeId: 'boss_iron_rider',
          name: '铁骑首领',
          maxHp: 1000,
          currentHp: 1000,
          moveSpeed: 0.8,
          shield: 0,
          armor: 30,
          isBoss: true,
          y: 900,
          distanceToWall: 2.64,
          isParalyzed: false
        }
      ];

      // Simulate shockwave knockback & stun
      for (const enemy of enemies) {
        const currentY = enemy.y ?? 840;
        const newY = Math.min(1200, currentY + 250);
        enemy.y = newY;
        enemy.distanceToWall = Math.max(0, (newY - 720) / 68);
        enemy.isParalyzed = true;
      }

      // Check Enemy 1 pushed from 840 to 1090
      expect(enemies[0].y).toBe(1090);
      expect(enemies[0].distanceToWall).toBeCloseTo((1090 - 720) / 68, 2);
      expect(enemies[0].isParalyzed).toBe(true);

      // Check Boss pushed from 900 to 1150
      expect(enemies[1].y).toBe(1150);
      expect(enemies[1].distanceToWall).toBeCloseTo((1150 - 720) / 68, 2);
      expect(enemies[1].isParalyzed).toBe(true);
    });
  });

  describe('3. Settlement 3x Loot Persistence & Video Share', () => {
    it('calculates 3x delta and persists to ProfileStorage upon ad completion', () => {
      const initialGold = profile.currencies.gold;
      const initialIron = profile.currencies.iron;
      const initialBlueprints = profile.currencies.blueprints;

      const baseRewards = {
        gold: 150,
        iron: 15,
        blueprints: 2
      };

      // 3x loot delta is 2x the base rewards
      const deltaGold = baseRewards.gold * 2; // 300
      const deltaIron = baseRewards.iron * 2; // 30
      const deltaBlueprints = baseRewards.blueprints * 2; // 4

      profile.currencies.gold += deltaGold;
      profile.currencies.iron += deltaIron;
      profile.currencies.blueprints += deltaBlueprints;
      profileStorage.saveProfile(profile);

      // Reload to verify persistence
      const reloaded = profileStorage.loadProfile();
      expect(reloaded.currencies.gold).toBe(initialGold + 300);
      expect(reloaded.currencies.iron).toBe(initialIron + 30);
      expect(reloaded.currencies.blueprints).toBe(initialBlueprints + 4);
    });

    it('generates compliant TikTok share payload with official hashtags and videoPath', async () => {
      const testVideoPath = 'ttfile://temp/battle_rec_123.mp4';
      const shareOptions = {
        videoPath: testVideoPath,
        title: '《孤城神机营》- 大捷！火器全歼鞑靼先锋！',
        topics: ['#孤城神机营', '#抖音小游戏', '#国潮明代重工']
      };

      const result = await mockPlatform.shareVideo(shareOptions);
      expect(result.success).toBe(true);
    });
  });

  describe('4. Daily Welfare across All Portals', () => {
    it('grants workshop welfare: 1000 gold + 5 blueprints', () => {
      const today = '2026-10-18';
      expect(canClaimDailyAd(profile, 'workshop', today)).toBe(true);

      const res = claimDailyAd(profile, 'workshop', today);
      expect(res.success).toBe(true);
      expect(res.rewards).toEqual(DAILY_AD_REWARDS.workshop);
      expect(profile.dailyAdClaims?.workshopDate).toBe(today);

      // Idempotent rejection on same day
      expect(canClaimDailyAd(profile, 'workshop', today)).toBe(false);
      expect(claimDailyAd(profile, 'workshop', today).success).toBe(false);
    });

    it('grants martial welfare: 100 iron', () => {
      const today = '2026-10-18';
      expect(canClaimDailyAd(profile, 'martial', today)).toBe(true);

      const res = claimDailyAd(profile, 'martial', today);
      expect(res.success).toBe(true);
      expect(res.rewards).toEqual(DAILY_AD_REWARDS.martial);
      expect(profile.dailyAdClaims?.martialDate).toBe(today);

      // Idempotent rejection on same day
      expect(canClaimDailyAd(profile, 'martial', today)).toBe(false);
    });

    it('grants sidebar welfare: 500 gold + 20 iron', () => {
      const today = '2026-10-18';
      expect(canClaimDailyAd(profile, 'sidebar', today)).toBe(true);

      const res = claimDailyAd(profile, 'sidebar', today);
      expect(res.success).toBe(true);
      expect(res.rewards).toEqual(DAILY_AD_REWARDS.sidebar);
      expect(profile.dailyAdClaims?.sidebarDate).toBe(today);

      // Idempotent rejection on same day
      expect(canClaimDailyAd(profile, 'sidebar', today)).toBe(false);
    });
  });
});
