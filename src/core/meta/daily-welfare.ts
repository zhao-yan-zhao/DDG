/**
 * 《孤城神机营》- Daily Welfare & Rewarded Ad Claims Domain Logic
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 * Authoritative: GDD V3.0 §11 & IAA Monetization Specification
 */

import { PlayerProfile, Currencies, DailyAdClaims } from './types';

export type DailyClaimType = 'workshop' | 'martial' | 'sidebar';

/**
 * Standard daily reward definitions per claim type
 */
export const DAILY_AD_REWARDS: Record<DailyClaimType, Readonly<Partial<Currencies>>> = {
  /** 军械工坊每日福利: 1000 铜钱 + 5 军械图纸 */
  workshop: {
    gold: 1000,
    blueprints: 5
  },
  /** 武经总要每日福利: 100 玄铁 */
  martial: {
    iron: 100
  },
  /** 侧边栏/桌面入口专享每日福利: 500 铜钱 + 20 玄铁 */
  sidebar: {
    gold: 500,
    iron: 20
  }
};

/**
 * Returns the current date in YYYY-MM-DD format based on local time.
 */
export function getTodayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether the specified daily ad claim is available today for the player.
 */
export function canClaimDailyAd(
  profile: PlayerProfile,
  claimType: DailyClaimType,
  todayStr: string = getTodayDateString()
): boolean {
  if (!profile) return false;

  const claims = profile.dailyAdClaims;
  if (!claims) return true;

  switch (claimType) {
    case 'workshop':
      return claims.workshopDate !== todayStr;
    case 'martial':
      return claims.martialDate !== todayStr;
    case 'sidebar':
      return claims.sidebarDate !== todayStr;
    default:
      return false;
  }
}

/**
 * Claims the daily ad welfare reward, mutating the player profile with rewards and tracking date.
 * Returns whether the claim succeeded and the granted rewards.
 */
export function claimDailyAd(
  profile: PlayerProfile,
  claimType: DailyClaimType,
  todayStr: string = getTodayDateString()
): { success: boolean; rewards: Partial<Currencies> } {
  if (!profile) {
    return { success: false, rewards: {} };
  }

  if (!canClaimDailyAd(profile, claimType, todayStr)) {
    return { success: false, rewards: {} };
  }

  if (!profile.dailyAdClaims) {
    profile.dailyAdClaims = {};
  }

  // Update claim date
  switch (claimType) {
    case 'workshop':
      profile.dailyAdClaims.workshopDate = todayStr;
      break;
    case 'martial':
      profile.dailyAdClaims.martialDate = todayStr;
      break;
    case 'sidebar':
      profile.dailyAdClaims.sidebarDate = todayStr;
      break;
  }

  // Grant rewards
  const template = DAILY_AD_REWARDS[claimType];
  const grantedRewards: Partial<Currencies> = {};

  if (!profile.currencies) {
    profile.currencies = { gold: 0, iron: 0, blueprints: 0 };
  }

  if (template.gold) {
    profile.currencies.gold = (profile.currencies.gold || 0) + template.gold;
    grantedRewards.gold = template.gold;
  }
  if (template.iron) {
    profile.currencies.iron = (profile.currencies.iron || 0) + template.iron;
    grantedRewards.iron = template.iron;
  }
  if (template.blueprints) {
    profile.currencies.blueprints = (profile.currencies.blueprints || 0) + template.blueprints;
    grantedRewards.blueprints = template.blueprints;
  }

  return {
    success: true,
    rewards: grantedRewards
  };
}
