/**
 * 《孤城神机营》- Tech Tree Manager (武经总要科技树)
 * Manages 3 branches (Martial, Defense, Artifice) across levels 0 to 30.
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 * Authoritative: GDD V3.0 §11.2, ORIGINAL_REQUEST R4, meta_spec.md §5
 */

import {
  PlayerProfile,
  TechBranch,
  TechTreeUpgradeCost,
  TechTreeUpgradeResult,
  TechTreeUpgradeErrorCode,
  MartialBonuses,
  DefenseBonuses,
  ArtificeBonuses,
  CombatMetaSnapshot
} from './types';
import { ArmoryManager, ALL_WEAPON_CONFIG_IDS } from './armory-manager';
import { ForgeManager } from '../forge/forge-manager';

export const MIN_TECH_LEVEL = 0;
export const MAX_TECH_LEVEL = 30;

export const TECH_BRANCHES: readonly TechBranch[] = [
  'martial',
  'defense',
  'artifice'
];

export type { TechBranch };

export class TechTreeManager {
  /**
   * Alias for upgradeTech
   */
  public static upgradeBranch = TechTreeManager.upgradeTech;
  /**
   * Calculates upgrade cost from currentLevel to currentLevel + 1.
   * Formula:
   *   Iron = 50 * (T + 1) + 10 * T^2
   * Returns null if currentLevel >= MAX_TECH_LEVEL (30).
   */
  public static getUpgradeCost(currentLevel: number): TechTreeUpgradeCost | null {
    if (currentLevel < MIN_TECH_LEVEL || currentLevel >= MAX_TECH_LEVEL) {
      return null;
    }
    const iron = 50 * (currentLevel + 1) + 10 * currentLevel * currentLevel;
    return { iron };
  }

  /**
   * Calculates cumulative upgrade cost from fromLevel to toLevel.
   * Total iron for full branch (0 -> 30) = 108,800 iron.
   */
  public static getCumulativeCost(fromLevel: number, toLevel: number): TechTreeUpgradeCost {
    let totalIron = 0;
    const start = Math.max(MIN_TECH_LEVEL, fromLevel);
    const end = Math.min(MAX_TECH_LEVEL, toLevel);

    for (let lvl = start; lvl < end; lvl++) {
      const cost = this.getUpgradeCost(lvl);
      if (cost) {
        totalIron += cost.iron;
      }
    }

    return { iron: totalIron };
  }

  /**
   * Checks whether branch identifier is a valid tech branch.
   */
  public static isValidBranch(branch: string): branch is TechBranch {
    return TECH_BRANCHES.includes(branch as TechBranch);
  }

  /**
   * Retrieves current branch level from profile, defaulting to 0.
   */
  public static getBranchLevel(profile: PlayerProfile, branch: TechBranch): number {
    const lvl = profile.techTree?.[branch];
    if (typeof lvl !== 'number' || isNaN(lvl)) {
      return MIN_TECH_LEVEL;
    }
    return Math.max(MIN_TECH_LEVEL, Math.min(MAX_TECH_LEVEL, Math.floor(lvl)));
  }

  /**
   * Computes Martial (攻伐) branch bonuses at level T ∈ [0, 30]:
   * - fireAdditiveBonus: +0.8% / level (max +24.0%)
   * - critRateBonus: +0.5% / level (max +15.0%)
   * - critDmgMultiplierBonus: +0.01 / level (max +0.30)
   */
  public static getMartialBonuses(level: number): MartialBonuses {
    const clamped = Math.max(MIN_TECH_LEVEL, Math.min(MAX_TECH_LEVEL, level));
    return {
      fireAdditiveBonus: Number((0.008 * clamped).toFixed(4)),
      critRateBonus: Number((0.005 * clamped).toFixed(4)),
      critDmgMultiplierBonus: Number((0.01 * clamped).toFixed(4))
    };
  }

  /**
   * Computes Defense (坚守) branch bonuses at level T ∈ [0, 30]:
   * - extraWallMaxHp: +30 HP / level (max +900 HP)
   * - thornsRateBonus: +2.0% / level (max +60.0%)
   * - wallDamageReduction: +0.5% / level (max +15.0%)
   */
  public static getDefenseBonuses(level: number): DefenseBonuses {
    const clamped = Math.max(MIN_TECH_LEVEL, Math.min(MAX_TECH_LEVEL, level));
    return {
      extraWallMaxHp: 30 * clamped,
      thornsRateBonus: Number((0.02 * clamped).toFixed(4)),
      wallDamageReduction: Number((0.005 * clamped).toFixed(4))
    };
  }

  /**
   * Computes Artifice (巧变) branch bonuses at level T ∈ [0, 30]:
   * - startingSilverBonus: +1 silver / level (max +30 silver)
   * - interestCapBonus: floor(T / 10) (0, 1, 2, or 3)
   * - waveStipendBonus: +1 silver / level (max +30 silver)
   */
  public static getArtificeBonuses(level: number): ArtificeBonuses {
    const clamped = Math.max(MIN_TECH_LEVEL, Math.min(MAX_TECH_LEVEL, level));
    return {
      startingSilverBonus: 1 * clamped,
      interestCapBonus: Math.floor(clamped / 10),
      waveStipendBonus: 1 * clamped
    };
  }

  /**
   * Evaluates if a tech branch upgrade can be performed.
   */
  public static canUpgrade(
    profile: PlayerProfile,
    branch: TechBranch
  ): { canUpgrade: boolean; error?: TechTreeUpgradeErrorCode; cost?: TechTreeUpgradeCost } {
    if (!this.isValidBranch(branch)) {
      return { canUpgrade: false, error: 'INVALID_BRANCH' };
    }

    const currentLevel = this.getBranchLevel(profile, branch);
    if (currentLevel >= MAX_TECH_LEVEL) {
      return { canUpgrade: false, error: 'MAX_LEVEL_REACHED' };
    }

    const cost = this.getUpgradeCost(currentLevel)!;

    if ((profile.currencies?.iron ?? 0) < cost.iron) {
      return { canUpgrade: false, error: 'INSUFFICIENT_IRON', cost };
    }

    return { canUpgrade: true, cost };
  }

  /**
   * Upgrades a tech branch by 1 level in the profile, atomically deducting iron.
   */
  public static upgradeTech(
    profile: PlayerProfile,
    branch: TechBranch
  ): TechTreeUpgradeResult {
    const check = this.canUpgrade(profile, branch);

    if (!check.canUpgrade) {
      const messages: Record<TechTreeUpgradeErrorCode, string> = {
        MAX_LEVEL_REACHED: `该科技分支已达到最高等级 (${MAX_TECH_LEVEL}级)`,
        INSUFFICIENT_IRON: `玄铁不足，需要 ${check.cost?.iron ?? 0} 玄铁`,
        INVALID_BRANCH: `无效的科技分支: ${branch}`
      };
      return {
        success: false,
        branch,
        error: check.error,
        cost: check.cost,
        message: check.error ? messages[check.error] : '升级失败'
      };
    }

    const currentLevel = this.getBranchLevel(profile, branch);
    const cost = check.cost!;

    // Atomic iron deduction
    profile.currencies.iron -= cost.iron;

    // Increment level
    if (!profile.techTree) {
      profile.techTree = { martial: 0, defense: 0, artifice: 0 };
    }
    const newLevel = currentLevel + 1;
    profile.techTree[branch] = newLevel;

    return {
      success: true,
      branch,
      newLevel,
      cost,
      message: `科技升级成功: Lv.${currentLevel} -> Lv.${newLevel}`
    };
  }

  /**
   * Generates a frozen CombatMetaSnapshot from the player's profile
   * for pure headless injection into the combat systems (DamagePipeline, WaveFSM, PlayerWallet).
   */
  public static createCombatSnapshot(profile: PlayerProfile): CombatMetaSnapshot {
    const weaponAtkMultipliers: Record<string, number> = {};
    const weaponMaxAllowedStars: Record<string, 2 | 3 | 4> = {};

    // Populate for all 16 canonical weapons
    for (const weaponId of ALL_WEAPON_CONFIG_IDS) {
      const level = ArmoryManager.getWeaponLevel(profile, weaponId);
      weaponAtkMultipliers[weaponId] = ArmoryManager.getAtkMultiplier(level);
      weaponMaxAllowedStars[weaponId] = ArmoryManager.getMaxAllowedStar(level);
    }

    // Populate for any additional customized weapon keys in armory
    if (profile.armory) {
      for (const [key] of Object.entries(profile.armory)) {
        if (!weaponAtkMultipliers[key]) {
          const level = ArmoryManager.getWeaponLevel(profile, key);
          weaponAtkMultipliers[key] = ArmoryManager.getAtkMultiplier(level);
          weaponMaxAllowedStars[key] = ArmoryManager.getMaxAllowedStar(level);
        }
      }
    }

    const martialLevel = this.getBranchLevel(profile, 'martial');
    const defenseLevel = this.getBranchLevel(profile, 'defense');
    const artificeLevel = this.getBranchLevel(profile, 'artifice');

    const weaponForgeBonuses = ForgeManager.calculateAllForgeBonuses(profile);

    return {
      weaponAtkMultipliers,
      weaponMaxAllowedStars,
      martial: this.getMartialBonuses(martialLevel),
      defense: this.getDefenseBonuses(defenseLevel),
      artifice: this.getArtificeBonuses(artificeLevel),
      weaponForgeBonuses
    };
  }
}
