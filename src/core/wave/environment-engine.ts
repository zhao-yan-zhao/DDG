/**
 * 《孤城神机营》- Headless Environment & Weather Modifier Engine
 * Implements GDD V3.0 §9.1 & §19:
 * - 5 Chapter Environmental Themes:
 *   1. plain_valley (Ch1): Standard baseline
 *   2. river_water (Ch2): River mist -> -15% standard projectile damage, +30% lightning shock damage & +1 chain
 *   3. snow_tundra (Ch3): Blizzard -> Ice shatter damage/radius +100% (2.0x), -15% reload speed for non-cold weapons
 *   4. night_mountain (Ch4): Poison miasma -> +50% poison fire tick damage
 *   5. imperial_city (Ch5): Dragon vein -> Commander rage accumulation speed +50%
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

export type EnvironmentThemeId =
  | 'plain_valley'
  | 'river_water'
  | 'snow_tundra'
  | 'night_mountain'
  | 'imperial_city';

export interface EnvironmentCombatModifiers {
  themeId: EnvironmentThemeId;
  themeName: string;
  description: string;

  // Combat multipliers
  directRangedDamageMultiplier: number; // Ch2 river_water: 0.85 (-15%)
  lightningDamageMultiplier: number;    // Ch2 river_water: 1.30 (+30%)
  lightningExtraChain: number;          // Ch2 river_water: +1
  iceShatterDamageMultiplier: number;   // Ch3 snow_tundra: 2.00 (+100%)
  iceShatterRadiusMultiplier: number;   // Ch3 snow_tundra: 2.00 (+100%)
  poisonFireTickMultiplier: number;     // Ch4 night_mountain: 1.50 (+50%)
  nonColdWeaponReloadPenalty: number;   // Ch3 snow_tundra: 0.15 (-15% attack speed)
  weaponAttackSpeedMultiplier: number;  // Ch3 snow_tundra: 0.85 for non-cold
  commanderRageRateMultiplier: number;  // Ch5 imperial_city: 1.50 (+50%)
  wallThornsMultiplier: number;         // Stage 19: 2.50 (+150%)
  enemySpeedMultiplier: number;         // Stage 6/10
  enemyPeriodicHealPercent: number;     // Stage 15 (0.03)
  allowWallRepair: boolean;             // Stage 19: false
}

export const DEFAULT_ENVIRONMENT_MODIFIERS: EnvironmentCombatModifiers = {
  themeId: 'plain_valley',
  themeName: '关中平原·无风',
  description: '标准平原战场，无特殊环境偏转。',
  directRangedDamageMultiplier: 1.0,
  lightningDamageMultiplier: 1.0,
  lightningExtraChain: 0,
  iceShatterDamageMultiplier: 1.0,
  iceShatterRadiusMultiplier: 1.0,
  poisonFireTickMultiplier: 1.0,
  nonColdWeaponReloadPenalty: 0.0,
  weaponAttackSpeedMultiplier: 1.0,
  commanderRageRateMultiplier: 1.0,
  wallThornsMultiplier: 1.0,
  enemySpeedMultiplier: 1.0,
  enemyPeriodicHealPercent: 0.0,
  allowWallRepair: true
};

export class EnvironmentEngine {
  /**
   * Resolves chapter ID to default environment theme.
   */
  public static getThemeForChapter(chapterId: number): EnvironmentThemeId {
    switch (chapterId) {
      case 1:
        return 'plain_valley';
      case 2:
        return 'river_water';
      case 3:
        return 'snow_tundra';
      case 4:
        return 'night_mountain';
      case 5:
        return 'imperial_city';
      default:
        return 'plain_valley';
    }
  }

  /**
   * Returns immutable combat modifiers for a given theme and optional stage ID.
   */
  public static getModifiers(theme: EnvironmentThemeId | string, stageId?: number): EnvironmentCombatModifiers {
    let mods: EnvironmentCombatModifiers;

    switch (theme) {
      case 'river_water':
        mods = {
          themeId: 'river_water',
          themeName: '赤壁水峡·水汽迷漫',
          description: '大江水雾降低常规弹道伤害15%，但水汽导电使雷电伤害+30%且跳跃次数+1。',
          directRangedDamageMultiplier: 0.85,
          lightningDamageMultiplier: 1.30,
          lightningExtraChain: 1,
          iceShatterDamageMultiplier: 1.0,
          iceShatterRadiusMultiplier: 1.0,
          poisonFireTickMultiplier: 1.0,
          nonColdWeaponReloadPenalty: 0.0,
          weaponAttackSpeedMultiplier: 1.0,
          commanderRageRateMultiplier: 1.0,
          wallThornsMultiplier: 1.0,
          enemySpeedMultiplier: 1.0,
          enemyPeriodicHealPercent: 0.0,
          allowWallRepair: true
        };
        break;

      case 'snow_tundra':
        mods = {
          themeId: 'snow_tundra',
          themeName: '塞外雪原·极寒暴雪',
          description: '刮骨寒风使非寒冰器械装填攻速-15%，但极寒冰晶使碎冰崩裂伤害与范围翻倍(+100%)。',
          directRangedDamageMultiplier: 1.0,
          lightningDamageMultiplier: 1.0,
          lightningExtraChain: 0,
          iceShatterDamageMultiplier: 2.00,
          iceShatterRadiusMultiplier: 2.00,
          poisonFireTickMultiplier: 1.0,
          nonColdWeaponReloadPenalty: 0.15,
          weaponAttackSpeedMultiplier: 0.85,
          commanderRageRateMultiplier: 1.0,
          wallThornsMultiplier: 1.0,
          enemySpeedMultiplier: 1.0,
          enemyPeriodicHealPercent: 0.0,
          allowWallRepair: true
        };
        break;

      case 'night_mountain':
        mods = {
          themeId: 'night_mountain',
          themeName: '夜袭巴蜀·毒瘴弥漫',
          description: '山谷毒瘴与火药剧烈反应，幽冥毒火每秒灼烧跳字伤害+50%。',
          directRangedDamageMultiplier: 1.0,
          lightningDamageMultiplier: 1.0,
          lightningExtraChain: 0,
          iceShatterDamageMultiplier: 1.0,
          iceShatterRadiusMultiplier: 1.0,
          poisonFireTickMultiplier: 1.50,
          nonColdWeaponReloadPenalty: 0.0,
          weaponAttackSpeedMultiplier: 1.0,
          commanderRageRateMultiplier: 1.0,
          wallThornsMultiplier: 1.0,
          enemySpeedMultiplier: 1.0,
          enemyPeriodicHealPercent: 0.0,
          allowWallRepair: true
        };
        break;

      case 'imperial_city':
        mods = {
          themeId: 'imperial_city',
          themeName: '京师保卫·国运龙脉',
          description: '九门禁卫与大明国运龙脉加护，主帅怒气累积速度提升+50%。',
          directRangedDamageMultiplier: 1.0,
          lightningDamageMultiplier: 1.0,
          lightningExtraChain: 0,
          iceShatterDamageMultiplier: 1.0,
          iceShatterRadiusMultiplier: 1.0,
          poisonFireTickMultiplier: 1.0,
          nonColdWeaponReloadPenalty: 0.0,
          weaponAttackSpeedMultiplier: 1.0,
          commanderRageRateMultiplier: 1.50,
          wallThornsMultiplier: 1.0,
          enemySpeedMultiplier: 1.0,
          enemyPeriodicHealPercent: 0.0,
          allowWallRepair: true
        };
        break;

      case 'plain_valley':
      default:
        mods = { ...DEFAULT_ENVIRONMENT_MODIFIERS };
        break;
    }

    // Stage-specific environmental nuances
    if (stageId !== undefined) {
      if (stageId === 6) {
        // Stage 6: Wind assist accelerates enemies by +15%
        mods = { ...mods, enemySpeedMultiplier: 1.15 };
      } else if (stageId === 10) {
        // Stage 10: Icy river accelerates enemies by +20%
        mods = { ...mods, enemySpeedMultiplier: 1.20 };
      } else if (stageId === 15) {
        // Stage 15: Poison swamp heals ordinary enemies 3%/s
        mods = { ...mods, enemyPeriodicHealPercent: 0.03 };
      } else if (stageId === 19) {
        // Stage 19: Last stand: wall repair prohibited, thorns damage +150% (2.5x)
        mods = { ...mods, allowWallRepair: false, wallThornsMultiplier: 2.50 };
      }
    }

    return mods;
  }

  /**
   * Applies direct ranged weapon damage modifiers (e.g. -15% in river mist).
   */
  public static applyDirectRangedDamage(
    rawDamage: number,
    theme: string,
    stageId?: number
  ): number {
    const mods = this.getModifiers(theme, stageId);
    return Math.round(rawDamage * mods.directRangedDamageMultiplier);
  }

  /**
   * Applies lightning shock modifiers (damage +30%, chain count +1 in river water).
   */
  public static applyLightningModifier(
    rawDamage: number,
    baseChains: number,
    theme: string,
    stageId?: number
  ): { damage: number; chains: number } {
    const mods = this.getModifiers(theme, stageId);
    return {
      damage: Math.round(rawDamage * mods.lightningDamageMultiplier),
      chains: baseChains + mods.lightningExtraChain
    };
  }

  /**
   * Applies ice shatter modifiers (damage +100%, radius +100% in blizzard).
   */
  public static applyIceShatterModifier(
    rawDamage: number,
    rawRadius: number,
    theme: string,
    stageId?: number
  ): { damage: number; radius: number } {
    const mods = this.getModifiers(theme, stageId);
    return {
      damage: Math.round(rawDamage * mods.iceShatterDamageMultiplier),
      radius: Math.round(rawRadius * mods.iceShatterRadiusMultiplier * 10) / 10
    };
  }

  /**
   * Applies poison fire tick damage modifiers (+50% in night mountain miasma).
   */
  public static applyPoisonFireTick(
    rawTickDamage: number,
    theme: string,
    stageId?: number
  ): number {
    const mods = this.getModifiers(theme, stageId);
    return Math.round(rawTickDamage * mods.poisonFireTickMultiplier);
  }

  /**
   * Applies weapon reload / attack interval modifier (in blizzard, non-cold weapons -15% speed -> +17.6% interval).
   */
  public static applyWeaponAttackInterval(
    intervalSec: number,
    isColdWeapon: boolean,
    theme: string,
    stageId?: number
  ): number {
    const mods = this.getModifiers(theme, stageId);
    if (!isColdWeapon && mods.weaponAttackSpeedMultiplier < 1.0) {
      return intervalSec / mods.weaponAttackSpeedMultiplier;
    }
    return intervalSec;
  }

  /**
   * Applies commander rage accumulation modifiers (+50% in imperial city).
   */
  public static applyRageAccumulation(
    rawRage: number,
    theme: string,
    stageId?: number
  ): number {
    const mods = this.getModifiers(theme, stageId);
    return Math.round(rawRage * mods.commanderRageRateMultiplier * 10) / 10;
  }

  /**
   * Applies wall thorns damage modifiers (e.g. 2.5x on Stage 19).
   */
  public static applyWallThornsModifier(
    thornsDamage: number,
    theme: string,
    stageId?: number
  ): number {
    const mods = this.getModifiers(theme, stageId);
    return Math.round(thornsDamage * mods.wallThornsMultiplier);
  }

  /**
   * Returns human-readable theme description.
   */
  public static describeTheme(theme: string): string {
    return this.getModifiers(theme).description;
  }
}
