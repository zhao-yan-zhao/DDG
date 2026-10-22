/**
 * 《孤城神机营》- Daily Welfare & Rewarded Ad Claims Domain Tests
 * Pure headless domain tests (Zero DOM / Zero Phaser dependencies).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  canClaimDailyAd,
  claimDailyAd,
  getTodayDateString,
  DAILY_AD_REWARDS
} from '../src/core/meta/daily-welfare';
import { createDefaultProfile, sanitizeProfile, ProfileStorage } from '../src/core/meta/profile-storage';
import { PlayerProfile } from '../src/core/meta/types';
import { WebPlatform } from '../src/platform/web-platform';

describe('Daily Welfare & Ad Claims Domain Model', () => {
  let profile: PlayerProfile;

  beforeEach(() => {
    profile = createDefaultProfile();
  });

  describe('TC-WELFARE-01: canClaimDailyAd Eligibility Checking', () => {
    it('allows claims on pristine default profile', () => {
      const today = '2026-10-18';
      expect(canClaimDailyAd(profile, 'workshop', today)).toBe(true);
      expect(canClaimDailyAd(profile, 'martial', today)).toBe(true);
      expect(canClaimDailyAd(profile, 'sidebar', today)).toBe(true);
    });

    it('denies duplicate claim on the same date', () => {
      const today = '2026-10-18';
      profile.dailyAdClaims = {
        workshopDate: today,
        martialDate: undefined,
        sidebarDate: undefined
      };

      expect(canClaimDailyAd(profile, 'workshop', today)).toBe(false);
      expect(canClaimDailyAd(profile, 'martial', today)).toBe(true);
      expect(canClaimDailyAd(profile, 'sidebar', today)).toBe(true);
    });

    it('allows claim when previous claim was yesterday (cross-day reset)', () => {
      const yesterday = '2026-10-17';
      const today = '2026-10-18';

      profile.dailyAdClaims = {
        workshopDate: yesterday,
        martialDate: yesterday,
        sidebarDate: yesterday
      };

      expect(canClaimDailyAd(profile, 'workshop', today)).toBe(true);
      expect(canClaimDailyAd(profile, 'martial', today)).toBe(true);
      expect(canClaimDailyAd(profile, 'sidebar', today)).toBe(true);
    });

    it('handles undefined or corrupted dailyAdClaims object safely', () => {
      const corruptProfile = { ...profile, dailyAdClaims: undefined };
      expect(canClaimDailyAd(corruptProfile, 'workshop')).toBe(true);
      expect(canClaimDailyAd(null as any, 'workshop')).toBe(false);
    });
  });

  describe('TC-WELFARE-02: claimDailyAd Execution & Rewards Granted', () => {
    it('claims workshop reward: 1000 gold + 5 blueprints', () => {
      const today = '2026-10-18';
      const initialGold = profile.currencies.gold;
      const initialBlueprints = profile.currencies.blueprints;

      const res = claimDailyAd(profile, 'workshop', today);
      expect(res.success).toBe(true);
      expect(res.rewards).toEqual({ gold: 1000, blueprints: 5 });

      expect(profile.currencies.gold).toBe(initialGold + 1000);
      expect(profile.currencies.blueprints).toBe(initialBlueprints + 5);
      expect(profile.dailyAdClaims?.workshopDate).toBe(today);

      // Subsequent claim on same day is rejected
      const secondRes = claimDailyAd(profile, 'workshop', today);
      expect(secondRes.success).toBe(false);
      expect(secondRes.rewards).toEqual({});
      expect(profile.currencies.gold).toBe(initialGold + 1000);
    });

    it('claims martial reward: 100 iron', () => {
      const today = '2026-10-18';
      const initialIron = profile.currencies.iron;

      const res = claimDailyAd(profile, 'martial', today);
      expect(res.success).toBe(true);
      expect(res.rewards).toEqual({ iron: 100 });
      expect(profile.currencies.iron).toBe(initialIron + 100);
      expect(profile.dailyAdClaims?.martialDate).toBe(today);

      // Repeat claim blocked
      const repeat = claimDailyAd(profile, 'martial', today);
      expect(repeat.success).toBe(false);
    });

    it('claims sidebar reward: 500 gold + 20 iron', () => {
      const today = '2026-10-18';
      const initialGold = profile.currencies.gold;
      const initialIron = profile.currencies.iron;

      const res = claimDailyAd(profile, 'sidebar', today);
      expect(res.success).toBe(true);
      expect(res.rewards).toEqual({ gold: 500, iron: 20 });
      expect(profile.currencies.gold).toBe(initialGold + 500);
      expect(profile.currencies.iron).toBe(initialIron + 20);
      expect(profile.dailyAdClaims?.sidebarDate).toBe(today);
    });

    it('supports cross-day continuous claiming', () => {
      const day1 = '2026-10-18';
      const day2 = '2026-10-19';

      const res1 = claimDailyAd(profile, 'workshop', day1);
      expect(res1.success).toBe(true);
      expect(canClaimDailyAd(profile, 'workshop', day1)).toBe(false);

      // Next day comes
      expect(canClaimDailyAd(profile, 'workshop', day2)).toBe(true);
      const res2 = claimDailyAd(profile, 'workshop', day2);
      expect(res2.success).toBe(true);
      expect(profile.dailyAdClaims?.workshopDate).toBe(day2);
    });

    it('default todayStr uses formatted local date', () => {
      const dateStr = getTodayDateString();
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const res = claimDailyAd(profile, 'workshop');
      expect(res.success).toBe(true);
      expect(profile.dailyAdClaims?.workshopDate).toBe(dateStr);
    });
  });

  describe('TC-WELFARE-03: Storage & Profile Sanitization', () => {
    it('initializes dailyAdClaims in default profile and sanitizes properly', () => {
      const def = createDefaultProfile();
      expect(def.dailyAdClaims).toBeDefined();

      const sanitized = sanitizeProfile({
        dailyAdClaims: {
          workshopDate: '2026-10-18',
          martialDate: 12345, // invalid type should become undefined
          sidebarDate: '2026-10-17'
        }
      });

      expect(sanitized.dailyAdClaims?.workshopDate).toBe('2026-10-18');
      expect(sanitized.dailyAdClaims?.martialDate).toBeUndefined();
      expect(sanitized.dailyAdClaims?.sidebarDate).toBe('2026-10-17');
    });

    it('persists and restores daily welfare claims through ProfileStorage', () => {
      const webPlatform = new WebPlatform();
      const storage = new ProfileStorage(webPlatform, 'test_daily_welfare_storage');
      storage.resetProfile();

      storage.modifyProfile((p) => {
        claimDailyAd(p, 'workshop', '2026-10-18');
        claimDailyAd(p, 'sidebar', '2026-10-18');
      });

      const loaded = storage.loadProfile();
      expect(loaded.dailyAdClaims?.workshopDate).toBe('2026-10-18');
      expect(loaded.dailyAdClaims?.sidebarDate).toBe('2026-10-18');
      expect(loaded.dailyAdClaims?.martialDate).toBeUndefined();
      expect(canClaimDailyAd(loaded, 'workshop', '2026-10-18')).toBe(false);
      expect(canClaimDailyAd(loaded, 'martial', '2026-10-18')).toBe(true);
    });
  });
});
