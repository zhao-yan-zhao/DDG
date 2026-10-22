/**
 * 《孤城神机营》- Armory Shop Configuration & Wave Ladder Probabilities
 * Strictly conforms to GDD V3.0 §4.1 and PROJECT.md contracts.
 */

export type ShopQualityTier = 'common' | 'fine' | 'heavy';

export interface ShopWeightLadder {
  commonRate: number;
  fineRate: number;
  heavyRate: number;
}

export const BASE_SHOP_REFRESH_COST = 2;
export const SHOP_SLOT_COUNT = 3;

export const PITY_CONFIG = {
  minRollsWithoutMerge: 3,
  pityChance: 0.65,
  pitySlotIndex: 2 // 0-indexed Slot 3
} as const;

/**
 * 16 weapon archetypes classified by quality tier:
 * - common (凡品，15银单格): 3 types
 * - fine (良品，20~25银单格): 8 types
 * - heavy (重器工坊，25~35银多格/工坊): 5 types
 */
export const SHOP_WEAPON_POOLS: Record<ShopQualityTier, readonly string[]> = {
  common: ['fire_lance', 'repeating_crossbow', 'barricade'],
  fine: [
    'rocket_box',
    'thunder_thrower',
    'flame_beast',
    'oil_cabinet',
    'electric_grid',
    'spear_camp',
    'powder_bureau',
    'stargazer'
  ],
  heavy: [
    'red_cannon',
    'bed_crossbow',
    'catapult',
    'war_drum',
    'luban_workshop'
  ]
};

/**
 * Shorthand alias dictionary to ensure cross-module compatibility
 * (e.g. cannon <-> red_cannon, grid_trap <-> electric_grid).
 */
export const WEAPON_ALIAS_MAP: Record<string, string> = {
  cannon: 'red_cannon',
  grid_trap: 'electric_grid'
};

/**
 * Returns wave ladder roll probabilities for a given wave number (W1..W15+).
 * Wave input is clamped to valid boundaries [1, 15+].
 */
export function getShopLadderWeights(wave: number): ShopWeightLadder {
  if (wave <= 2) {
    return { commonRate: 0.75, fineRate: 0.25, heavyRate: 0.00 };
  } else if (wave <= 5) {
    return { commonRate: 0.50, fineRate: 0.35, heavyRate: 0.15 };
  } else if (wave <= 8) {
    return { commonRate: 0.35, fineRate: 0.40, heavyRate: 0.25 };
  } else {
    return { commonRate: 0.25, fineRate: 0.45, heavyRate: 0.30 };
  }
}

/**
 * Resolves the quality tier for a weapon config ID (supporting aliases).
 */
export function getWeaponQualityTier(configId: string): ShopQualityTier {
  const canonicalId = WEAPON_ALIAS_MAP[configId] || configId;
  if (SHOP_WEAPON_POOLS.common.includes(canonicalId)) {
    return 'common';
  }
  if (SHOP_WEAPON_POOLS.heavy.includes(canonicalId)) {
    return 'heavy';
  }
  return 'fine';
}
