/**
 * 《孤城神机营》- Profile Storage & Migration Adapter (档案持久化存储适配器)
 * Cross-platform persistence layer using IPlatform (Web localStorage / Douyin tt.*).
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 * Authoritative: GDD V3.0 §11, ORIGINAL_REQUEST R5.1, SCOPE.md (GL-1)
 */

import { IPlatform } from '../../bridge/platform';
import { WebPlatform } from '../../bridge/web-platform';
import {
  PlayerProfile,
  Currencies,
  ArmoryData,
  TechTreeData,
  CampaignProgress,
  DailyAdClaims,
  CommanderId,
  isValidCommanderId
} from './types';
import { ALL_WEAPON_CONFIG_IDS, MIN_ARMORY_LEVEL, MAX_ARMORY_LEVEL } from './armory-manager';
import { MIN_TECH_LEVEL, MAX_TECH_LEVEL } from './tech-tree-manager';

export const PROFILE_STORAGE_KEY = 'gucheng_player_profile';
export const CURRENT_PROFILE_VERSION = 1;

/**
 * Generates a clean default profile for new players or factory resets.
 */
export function createDefaultProfile(): PlayerProfile {
  const armory: ArmoryData = {};
  for (const id of ALL_WEAPON_CONFIG_IDS) {
    armory[id] = MIN_ARMORY_LEVEL; // Level 1
  }

  return {
    version: CURRENT_PROFILE_VERSION,
    currencies: {
      gold: 500,
      iron: 100,
      blueprints: 5
    },
    armory,
    techTree: {
      martial: MIN_TECH_LEVEL, // Level 0
      defense: MIN_TECH_LEVEL, // Level 0
      artifice: MIN_TECH_LEVEL // Level 0
    },
    campaign: {
      unlockedChapter: 1,
      unlockedStage: 1,
      stageStars: {},
      stageHighScores: {}
    },
    selectedCommander: 'wang_shouren',
    dailyAdClaims: {},
    endless: {
      highestWave: 0,
      highestScore: 0,
      totalRuns: 0,
      militaryTitle: '神机营卒',
      lastCityName: '北京市朝阳区'
    },
    forge: {
      inventory: [],
      equipped: {},
      totalForged: 0
    }
  };
}

/**
 * Migration registry handling version-to-version schema transformations
 */
export type ProfileMigrationStep = (raw: any) => any;

export const PROFILE_MIGRATIONS: Record<number, ProfileMigrationStep> = {
  // Migration to Version 1: Normalize legacy field names if any
  1: (raw: any) => {
    const data = { ...raw };
    // Compatibility: Support legacy meteoriteIron -> iron
    if (data.currencies && data.currencies.meteoriteIron !== undefined && data.currencies.iron === undefined) {
      data.currencies.iron = data.currencies.meteoriteIron;
      delete data.currencies.meteoriteIron;
    }
    // Compatibility: Support legacy Chinese branch names gongfa/jianshou/qiaobian
    if (data.techTree) {
      if (data.techTree.gongfa !== undefined && data.techTree.martial === undefined) {
        data.techTree.martial = data.techTree.gongfa;
        delete data.techTree.gongfa;
      }
      if (data.techTree.jianshou !== undefined && data.techTree.defense === undefined) {
        data.techTree.defense = data.techTree.jianshou;
        delete data.techTree.jianshou;
      }
      if (data.techTree.qiaobian !== undefined && data.techTree.artifice === undefined) {
        data.techTree.artifice = data.techTree.qiaobian;
        delete data.techTree.qiaobian;
      }
    }
    data.version = 1;
    return data;
  }
};

/**
 * Sanitizes and validates a profile object, ensuring no NaN, null, or out-of-range values.
 */
export function sanitizeProfile(raw: any): PlayerProfile {
  const defaultProfile = createDefaultProfile();
  if (!raw || typeof raw !== 'object') {
    return defaultProfile;
  }

  // 1. Currencies sanitization
  const currencies: Currencies = {
    gold: Math.max(0, Math.floor(Number(raw.currencies?.gold) || (raw.currencies?.gold === 0 ? 0 : defaultProfile.currencies.gold))),
    iron: Math.max(0, Math.floor(Number(raw.currencies?.iron) || (raw.currencies?.iron === 0 ? 0 : defaultProfile.currencies.iron))),
    blueprints: Math.max(0, Math.floor(Number(raw.currencies?.blueprints) || (raw.currencies?.blueprints === 0 ? 0 : defaultProfile.currencies.blueprints)))
  };

  // 2. Armory sanitization (ensure all 16 weapons are present and in [1, 20])
  const armory: ArmoryData = {};
  for (const id of ALL_WEAPON_CONFIG_IDS) {
    const rawLevel = raw.armory?.[id];
    const lvl = typeof rawLevel === 'number' && !isNaN(rawLevel) ? Math.floor(rawLevel) : MIN_ARMORY_LEVEL;
    armory[id] = Math.max(MIN_ARMORY_LEVEL, Math.min(MAX_ARMORY_LEVEL, lvl));
  }
  // Preserve any extra custom weapon IDs
  if (raw.armory && typeof raw.armory === 'object') {
    for (const [key, val] of Object.entries(raw.armory)) {
      if (!armory[key] && typeof val === 'number' && !isNaN(val)) {
        armory[key] = Math.max(MIN_ARMORY_LEVEL, Math.min(MAX_ARMORY_LEVEL, Math.floor(val)));
      }
    }
  }

  // 3. Tech Tree sanitization (ensure martial, defense, artifice in [0, 30])
  const sanitizeTechLevel = (val: any) => {
    const num = typeof val === 'number' && !isNaN(val) ? Math.floor(val) : MIN_TECH_LEVEL;
    return Math.max(MIN_TECH_LEVEL, Math.min(MAX_TECH_LEVEL, num));
  };

  const techTree: TechTreeData = {
    martial: sanitizeTechLevel(raw.techTree?.martial),
    defense: sanitizeTechLevel(raw.techTree?.defense),
    artifice: sanitizeTechLevel(raw.techTree?.artifice)
  };

  // 4. Campaign Progress sanitization
  const campaign: CampaignProgress = {
    unlockedChapter: Math.max(1, Math.floor(Number(raw.campaign?.unlockedChapter) || 1)),
    unlockedStage: Math.max(1, Math.min(20, Math.floor(Number(raw.campaign?.unlockedStage) || 1))),
    stageStars: {},
    stageHighScores: {}
  };

  if (raw.campaign?.stageStars && typeof raw.campaign.stageStars === 'object') {
    for (const [stageIdStr, stars] of Object.entries(raw.campaign.stageStars)) {
      const stageId = Number(stageIdStr);
      const starVal = Number(stars);
      if (!isNaN(stageId) && !isNaN(starVal)) {
        campaign.stageStars[stageId] = Math.max(0, Math.min(3, Math.floor(starVal)));
      }
    }
  }

  if (raw.campaign?.stageHighScores && typeof raw.campaign.stageHighScores === 'object') {
    for (const [stageIdStr, score] of Object.entries(raw.campaign.stageHighScores)) {
      const stageId = Number(stageIdStr);
      const scoreVal = Number(score);
      if (!isNaN(stageId) && !isNaN(scoreVal)) {
        campaign.stageHighScores[stageId] = Math.max(0, Math.floor(scoreVal));
      }
    }
  }

  // 5. Selected Commander (strictly validates against 4 valid commanders; falls back to 'wang_shouren')
  const rawCommander = typeof raw.selectedCommander === 'string' ? raw.selectedCommander.trim() : '';
  const selectedCommander: CommanderId = isValidCommanderId(rawCommander)
    ? rawCommander
    : 'wang_shouren';

  // 6. Daily Ad Claims
  const dailyAdClaims: DailyAdClaims = {
    workshopDate: typeof raw.dailyAdClaims?.workshopDate === 'string' ? raw.dailyAdClaims.workshopDate : undefined,
    martialDate: typeof raw.dailyAdClaims?.martialDate === 'string' ? raw.dailyAdClaims.martialDate : undefined,
    sidebarDate: typeof raw.dailyAdClaims?.sidebarDate === 'string' ? raw.dailyAdClaims.sidebarDate : undefined
  };

  // 7. Endless Mode Records
  const endless = {
    highestWave: Math.max(0, Math.floor(Number(raw.endless?.highestWave) || 0)),
    highestScore: Math.max(0, Math.floor(Number(raw.endless?.highestScore) || 0)),
    totalRuns: Math.max(0, Math.floor(Number(raw.endless?.totalRuns) || 0)),
    militaryTitle: typeof raw.endless?.militaryTitle === 'string' && raw.endless.militaryTitle ? raw.endless.militaryTitle : '神机营卒',
    lastCityName: typeof raw.endless?.lastCityName === 'string' && raw.endless.lastCityName ? raw.endless.lastCityName : '北京市朝阳区'
  };

  // 8. Forge Data
  const forge = {
    inventory: Array.isArray(raw.forge?.inventory)
      ? raw.forge.inventory.filter((item: any) => item && typeof item.uid === 'string' && typeof item.componentId === 'string')
      : [],
    equipped: raw.forge?.equipped && typeof raw.forge.equipped === 'object'
      ? { ...raw.forge.equipped }
      : {},
    totalForged: Math.max(0, Math.floor(Number(raw.forge?.totalForged) || 0))
  };

  return {
    version: CURRENT_PROFILE_VERSION,
    currencies,
    armory,
    techTree,
    campaign,
    selectedCommander,
    dailyAdClaims,
    endless,
    forge
  };
}

export class ProfileStorage {
  private platform: IPlatform;
  private storageKey: string;

  constructor(platform?: IPlatform, storageKey: string = PROFILE_STORAGE_KEY) {
    this.platform = platform || new WebPlatform();
    this.storageKey = storageKey;
  }

  /**
   * Loads player profile from storage, migrating and sanitizing data.
   * If not found or corrupted, creates, saves, and returns a default profile.
   */
  public loadProfile(): PlayerProfile {
    try {
      const raw = this.platform.getStorageSync(this.storageKey);
      if (!raw) {
        const defaultProf = createDefaultProfile();
        this.saveProfile(defaultProf);
        return defaultProf;
      }

      let parsed: any = raw;
      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch {
          console.warn('[ProfileStorage] Corrupt JSON string detected, resetting to default profile.');
          const defaultProf = createDefaultProfile();
          this.saveProfile(defaultProf);
          return defaultProf;
        }
      }

      // Execute version migrations if necessary
      let currentData = parsed;
      let currentVersion = typeof currentData?.version === 'number' ? currentData.version : 0;

      while (currentVersion < CURRENT_PROFILE_VERSION) {
        const nextVersion = currentVersion + 1;
        const migration = PROFILE_MIGRATIONS[nextVersion];
        if (migration) {
          currentData = migration(currentData);
        }
        currentVersion = nextVersion;
      }

      const sanitized = sanitizeProfile(currentData);
      return sanitized;
    } catch (e) {
      console.error('[ProfileStorage] loadProfile exception:', e);
      return createDefaultProfile();
    }
  }

  /**
   * Persists player profile to platform storage after sanitization.
   */
  public saveProfile(profile: PlayerProfile): boolean {
    try {
      const sanitized = sanitizeProfile(profile);
      this.platform.setStorageSync(this.storageKey, sanitized);
      return true;
    } catch (e) {
      console.error('[ProfileStorage] saveProfile failed:', e);
      return false;
    }
  }

  /**
   * Loads current profile, applies mutations, saves, and returns updated profile.
   */
  public modifyProfile(mutator: (profile: PlayerProfile) => void): PlayerProfile {
    const profile = this.loadProfile();
    mutator(profile);
    this.saveProfile(profile);
    return profile;
  }

  /**
   * Clears saved profile and restores pristine default state.
   */
  public resetProfile(): PlayerProfile {
    try {
      this.platform.removeStorageSync(this.storageKey);
    } catch (e) {
      console.warn('[ProfileStorage] removeStorageSync warning:', e);
    }

    const defaultProfile = createDefaultProfile();
    this.saveProfile(defaultProfile);
    return defaultProfile;
  }

  /**
   * Exports profile as formatted JSON string (for backups or debugging)
   */
  public exportProfileJson(profile: PlayerProfile): string {
    const sanitized = sanitizeProfile(profile);
    return JSON.stringify(sanitized, null, 2);
  }

  /**
   * Imports and restores profile from JSON string with validation
   */
  public importProfileJson(jsonStr: string): PlayerProfile {
    const parsed = JSON.parse(jsonStr);
    const sanitized = sanitizeProfile(parsed);
    this.saveProfile(sanitized);
    return sanitized;
  }
}
