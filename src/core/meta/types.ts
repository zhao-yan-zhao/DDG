/**
 * 《孤城神机营》- Meta Progression & Profile Domain Types
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 * Authoritative: GDD V3.0 §11, SCOPE.md (GL-1), meta_spec.md
 */

import { StarLevel, CommanderId, VALID_COMMANDER_IDS, isValidCommanderId } from '../types';
export type { CommanderId };
export { VALID_COMMANDER_IDS, isValidCommanderId };

/**
 * Three core currencies in the meta game loop
 */
export interface Currencies {
  /** 金币: Used for Armory weapon upgrades */
  gold: number;
  /** 玄铁: Used for Tech Tree (武经总要) upgrades */
  iron: number;
  /** 军械图纸: Used for Armory weapon tier advancements */
  blueprints: number;
}

/**
 * Armory level mapping: weaponConfigId -> level (1..20)
 * 16 weapon archetypes initialized at level 1.
 */
export type ArmoryData = Record<string, number>;

/**
 * Three branches of the WuJingZongYao (武经总要) Tech Tree
 * - martial (攻伐): Fire damage, crit rate, crit damage multiplier
 * - defense (坚守): Wall max HP, thorns/reflect damage, wall damage reduction
 * - artifice (巧变): Starting silver, interest cap, wave stipend
 */
export type TechBranch = 'martial' | 'defense' | 'artifice';

export interface TechTreeData {
  martial: number;  // Level 0..30
  defense: number;  // Level 0..30
  artifice: number; // Level 0..30
}

/**
 * Campaign and Stage progression record
 */
export interface CampaignProgress {
  unlockedChapter: number;            // 1..5
  unlockedStage: number;              // 1..20
  stageStars: Record<number, number>; // stageId (1..20) -> stars (0..3)
  stageHighScores: Record<number, number>; // stageId -> high score
}

/**
 * Daily Rewarded Video Ad Claims tracking (YYYY-MM-DD per feature)
 */
export interface DailyAdClaims {
  workshopDate?: string; // YYYY-MM-DD
  martialDate?: string;  // YYYY-MM-DD
  sidebarDate?: string;  // YYYY-MM-DD
}

/**
 * Endless Mode progression & personal records
 */
export interface EndlessProfileData {
  highestWave: number;
  highestScore: number;
  totalRuns: number;
  militaryTitle: string;
  lastCityName?: string;
}

import { ForgeProfileData, WeaponForgeBonuses } from '../forge/types';
export type { ForgeProfileData, WeaponForgeBonuses };

/**
 * Complete Player Profile persisted via IPlatform
 */
export interface PlayerProfile {
  version: number;
  currencies: Currencies;
  armory: ArmoryData;
  techTree: TechTreeData;
  campaign: CampaignProgress;
  selectedCommander: CommanderId;
  dailyAdClaims?: DailyAdClaims;
  endless?: EndlessProfileData;
  forge?: ForgeProfileData;
}

/**
 * Stat bonus payloads injected into Combat Engine
 */
export interface MartialBonuses {
  fireAdditiveBonus: number;       // +0.008 * T (Additive bonus for fire faction)
  critRateBonus: number;           // +0.005 * T (Additive crit rate bonus)
  critDmgMultiplierBonus: number;  // +0.01 * T (Additive crit damage multiplier bonus)
}

export interface DefenseBonuses {
  extraWallMaxHp: number;          // +30 * T (Additive max HP for wall)
  thornsRateBonus: number;         // +0.02 * T (Thorns/reflect multiplier)
  wallDamageReduction: number;     // +0.005 * T (Percentage wall damage reduction)
}

export interface ArtificeBonuses {
  startingSilverBonus: number;     // +1 * T (Extra starting silver)
  interestCapBonus: number;        // Math.floor(T / 10) (Extra interest cap)
  waveStipendBonus: number;        // +1 * T (Extra wave stipend)
}

/**
 * Immutable combat snapshot injected at battle start
 */
export interface CombatMetaSnapshot {
  /** Weapon base attack multipliers: configId -> 1 + 0.04 * (L - 1) */
  weaponAtkMultipliers: Record<string, number>;
  /** Max allowed merge star level per weapon: 2 (L<5) | 3 (5<=L<10) | 4 (L>=10) */
  weaponMaxAllowedStars: Record<string, 2 | 3 | 4>;
  martial: MartialBonuses;
  defense: DefenseBonuses;
  artifice: ArtificeBonuses;
  /** Forge equipment component bonuses per weapon */
  weaponForgeBonuses?: Record<string, WeaponForgeBonuses>;
}

/**
 * Armory Upgrade Operations
 */
export interface ArmoryUpgradeCost {
  gold: number;
  blueprints: number;
}

export type ArmoryUpgradeErrorCode =
  | 'MAX_LEVEL_REACHED'
  | 'INSUFFICIENT_GOLD'
  | 'INSUFFICIENT_BLUEPRINTS'
  | 'INVALID_WEAPON';

export interface ArmoryUpgradeResult {
  success: boolean;
  weaponId?: string;
  newLevel?: number;
  cost?: ArmoryUpgradeCost;
  error?: ArmoryUpgradeErrorCode;
  message?: string;
}

/**
 * Tech Tree Upgrade Operations
 */
export interface TechTreeUpgradeCost {
  iron: number;
}

export type TechTreeUpgradeErrorCode =
  | 'MAX_LEVEL_REACHED'
  | 'INSUFFICIENT_IRON'
  | 'INVALID_BRANCH';

export interface TechTreeUpgradeResult {
  success: boolean;
  branch?: TechBranch;
  newLevel?: number;
  cost?: TechTreeUpgradeCost;
  error?: TechTreeUpgradeErrorCode;
  message?: string;
}
