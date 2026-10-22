/**
 * 《孤城神机营》- Armory Manager (神机造办处)
 * Manages 16 weapon archetypes meta-progression across levels 1 to 20.
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 * Authoritative: GDD V3.0 §11.2, ORIGINAL_REQUEST R4, meta_spec.md §4
 */

import { StarLevel } from '../types';
import { WEAPON_CONFIGS, resolveConfigId } from '../../config/weapons.config';
import {
  PlayerProfile,
  ArmoryUpgradeCost,
  ArmoryUpgradeResult,
  ArmoryUpgradeErrorCode
} from './types';

export const MIN_ARMORY_LEVEL = 1;
export const MAX_ARMORY_LEVEL = 20;
export const STAR_3_UNLOCK_LEVEL = 5;
export const STAR_4_UNLOCK_LEVEL = 10;
export const ATK_BONUS_PER_LEVEL = 0.04;

export const ALL_WEAPON_CONFIG_IDS: readonly string[] = [
  'fire_lance',
  'rocket_box',
  'thunder_thrower',
  'red_cannon',
  'flame_beast',
  'repeating_crossbow',
  'bed_crossbow',
  'catapult',
  'barricade',
  'oil_cabinet',
  'electric_grid',
  'spear_camp',
  'powder_bureau',
  'war_drum',
  'stargazer',
  'luban_workshop'
];

export class ArmoryManager {
  /**
   * Calculates the upgrade cost from currentLevel to currentLevel + 1.
   * Formula:
   *   Gold = 100 * L^2
   *   Blueprints = floor(L / 2) + 1
   * Returns null if currentLevel >= MAX_ARMORY_LEVEL (20).
   */
  public static getUpgradeCost(currentLevel: number): ArmoryUpgradeCost | null {
    if (currentLevel < MIN_ARMORY_LEVEL || currentLevel >= MAX_ARMORY_LEVEL) {
      return null;
    }
    const gold = 100 * currentLevel * currentLevel;
    const blueprints = Math.floor(currentLevel / 2) + 1;
    return { gold, blueprints };
  }

  /**
   * Calculates cumulative upgrade cost from fromLevel to toLevel.
   * E.g. fromLevel=1, toLevel=20 sums costs for 1->2, 2->3, ..., 19->20.
   */
  public static getCumulativeCost(fromLevel: number, toLevel: number): ArmoryUpgradeCost {
    let totalGold = 0;
    let totalBlueprints = 0;

    const start = Math.max(MIN_ARMORY_LEVEL, fromLevel);
    const end = Math.min(MAX_ARMORY_LEVEL, toLevel);

    for (let lvl = start; lvl < end; lvl++) {
      const cost = this.getUpgradeCost(lvl);
      if (cost) {
        totalGold += cost.gold;
        totalBlueprints += cost.blueprints;
      }
    }

    return { gold: totalGold, blueprints: totalBlueprints };
  }

  /**
   * Computes base attack multiplier for a given armory level:
   * Multiplier = 1.0 + (L - 1) * 0.04 (+4% per level above 1).
   * Lv 1 -> 1.00 (+0%)
   * Lv 5 -> 1.16 (+16%)
   * Lv 10 -> 1.36 (+36%)
   * Lv 20 -> 1.76 (+76%)
   */
  public static getAtkMultiplier(level: number): number {
    const clampedLevel = Math.max(MIN_ARMORY_LEVEL, Math.min(MAX_ARMORY_LEVEL, level));
    const bonus = (clampedLevel - 1) * ATK_BONUS_PER_LEVEL;
    return Number((1.0 + bonus).toFixed(4));
  }

  /**
   * Determines the maximum merge star tier allowed for this weapon level:
   * Lv 1..4  => 2 (★1 -> ★2 allowed, ★3 locked)
   * Lv 5..9  => 3 (★3 allowed, ★4 locked)
   * Lv 10..20 => 4 (★4 allowed)
   */
  public static getMaxAllowedStar(level: number): 2 | 3 | 4 {
    if (level < STAR_3_UNLOCK_LEVEL) {
      return 2;
    }
    if (level < STAR_4_UNLOCK_LEVEL) {
      return 3;
    }
    return 4;
  }

  public static getMaxStarAllowed = ArmoryManager.getMaxAllowedStar;

  /**
   * Checks if target star tier is unlocked for a given armory level.
   */
  public static isStarUnlocked(level: number, targetStar: StarLevel): boolean {
    const maxStar = this.getMaxAllowedStar(level);
    return targetStar <= maxStar;
  }

  /**
   * Checks if weaponId is a valid weapon config ID or alias.
   */
  public static isValidWeaponId(weaponId: string): boolean {
    const canonical = resolveConfigId(weaponId);
    return canonical in WEAPON_CONFIGS;
  }

  /**
   * Retrieves weapon level from profile, defaulting to 1 if not present.
   */
  public static getWeaponLevel(profile: PlayerProfile, weaponId: string): number {
    const canonical = resolveConfigId(weaponId);
    const lvl = profile.armory?.[canonical];
    if (typeof lvl !== 'number' || isNaN(lvl)) {
      return MIN_ARMORY_LEVEL;
    }
    return Math.max(MIN_ARMORY_LEVEL, Math.min(MAX_ARMORY_LEVEL, Math.floor(lvl)));
  }

  /**
   * Evaluates if a weapon upgrade can be performed.
   */
  public static canUpgrade(
    profile: PlayerProfile,
    weaponId: string
  ): { canUpgrade: boolean; error?: ArmoryUpgradeErrorCode; cost?: ArmoryUpgradeCost } {
    const canonical = resolveConfigId(weaponId);
    if (!this.isValidWeaponId(canonical)) {
      return { canUpgrade: false, error: 'INVALID_WEAPON' };
    }

    const currentLevel = this.getWeaponLevel(profile, canonical);
    if (currentLevel >= MAX_ARMORY_LEVEL) {
      return { canUpgrade: false, error: 'MAX_LEVEL_REACHED' };
    }

    const cost = this.getUpgradeCost(currentLevel)!;

    if ((profile.currencies?.gold ?? 0) < cost.gold) {
      return { canUpgrade: false, error: 'INSUFFICIENT_GOLD', cost };
    }

    if ((profile.currencies?.blueprints ?? 0) < cost.blueprints) {
      return { canUpgrade: false, error: 'INSUFFICIENT_BLUEPRINTS', cost };
    }

    return { canUpgrade: true, cost };
  }

  /**
   * Upgrades a weapon by 1 level in the profile, atomically deducting currency.
   */
  public static upgradeWeapon(profile: PlayerProfile, weaponId: string): ArmoryUpgradeResult {
    const canonical = resolveConfigId(weaponId);
    const check = this.canUpgrade(profile, canonical);

    if (!check.canUpgrade) {
      const messages: Record<ArmoryUpgradeErrorCode, string> = {
        MAX_LEVEL_REACHED: `军械已达到最高强化等级 (${MAX_ARMORY_LEVEL}级)`,
        INSUFFICIENT_GOLD: `金币不足，需要 ${check.cost?.gold ?? 0} 金币`,
        INSUFFICIENT_BLUEPRINTS: `军械图纸不足，需要 ${check.cost?.blueprints ?? 0} 张图纸`,
        INVALID_WEAPON: `无效的军械配置ID: ${weaponId}`
      };
      return {
        success: false,
        weaponId: canonical,
        error: check.error,
        cost: check.cost,
        message: check.error ? messages[check.error] : '升级失败'
      };
    }

    const currentLevel = this.getWeaponLevel(profile, canonical);
    const cost = check.cost!;

    // Atomic currency deduction
    profile.currencies.gold -= cost.gold;
    profile.currencies.blueprints -= cost.blueprints;

    // Increment level
    if (!profile.armory) {
      profile.armory = {};
    }
    const newLevel = currentLevel + 1;
    profile.armory[canonical] = newLevel;

    return {
      success: true,
      weaponId: canonical,
      newLevel,
      cost,
      message: `军械强化成功: Lv.${currentLevel} -> Lv.${newLevel}`
    };
  }
}
