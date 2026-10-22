/**
 * 《孤城神机营》- Red-Gold Fusion Unlock Engine
 * Strictly conforms to GDD V3.0 §4.3 & §7.2:
 * - 4 Red-Gold dual-faction fusion tactics (T33 ~ T36) require simultaneous placement
 *   of two specified ★3+ units on the sand table to unlock into the candidate draw pool.
 * - Supports bidirectional alias mapping:
 *   - cannon <-> red_cannon
 *   - grid_trap <-> electric_grid
 *   - nine_heaven_thunder_pool <-> T33
 *   - storm_rocket_cart <-> T34
 *   - fire_dragon_water / iron_buddha_ox <-> T35
 *   - mount_tai_ice_meteor <-> T36
 */

import { WeaponInstance } from '../types';

export interface FusionRequirement {
  cardId: string;
  name: string;
  unitA: { configId: string; aliases: string[]; star: number };
  unitB: { configId: string; aliases: string[]; star: number };
}

export const FUSION_REQUIREMENTS: Record<string, FusionRequirement> = {
  T33: {
    cardId: 'T33',
    name: '红夷雷火炮 / 九天雷池轰',
    unitA: { configId: 'red_cannon', aliases: ['cannon', 'red_cannon'], star: 3 },
    unitB: { configId: 'electric_grid', aliases: ['grid_trap', 'electric_grid'], star: 3 }
  },
  T34: {
    cardId: 'T34',
    name: '暴雨火箭车',
    unitA: { configId: 'repeating_crossbow', aliases: ['repeating_crossbow'], star: 3 },
    unitB: { configId: 'rocket_box', aliases: ['rocket_box'], star: 3 }
  },
  T35: {
    cardId: 'T35',
    name: '真·火龙出水 / 铁浮屠火牛阵',
    unitA: { configId: 'rocket_box', aliases: ['rocket_box', 'spear_camp'], star: 3 },
    unitB: { configId: 'oil_cabinet', aliases: ['oil_cabinet'], star: 3 }
  },
  T36: {
    cardId: 'T36',
    name: '九天星陨石 / 泰山陨冰劫',
    unitA: { configId: 'catapult', aliases: ['catapult'], star: 3 },
    unitB: { configId: 'stargazer', aliases: ['stargazer'], star: 3 }
  }
};

// Aliases for Compendium Matrix IDs
FUSION_REQUIREMENTS.nine_heaven_thunder_pool = FUSION_REQUIREMENTS.T33;
FUSION_REQUIREMENTS.storm_rocket_cart = FUSION_REQUIREMENTS.T34;
FUSION_REQUIREMENTS.fire_dragon_water = FUSION_REQUIREMENTS.T35;
FUSION_REQUIREMENTS.mount_tai_ice_meteor = FUSION_REQUIREMENTS.T36;

export class FusionUnlockEngine {
  /**
   * Evaluates whether a specific fusion card's dual ★3 prerequisite is satisfied on the board.
   */
  public static isFusionUnlocked(cardId: string, weapons: WeaponInstance[]): boolean {
    const req = FUSION_REQUIREMENTS[cardId];
    if (!req) {
      return false;
    }

    const hasUnitA = weapons.some(w => 
      req.unitA.aliases.includes(w.configId) && w.star >= req.unitA.star
    );
    const hasUnitB = weapons.some(w => 
      req.unitB.aliases.includes(w.configId) && w.star >= req.unitB.star
    );

    return hasUnitA && hasUnitB;
  }

  /**
   * Returns list of all currently unlocked fusion card IDs.
   */
  public static getUnlockedFusionIds(weapons: WeaponInstance[]): string[] {
    const standardKeys = ['T33', 'T34', 'T35', 'T36'];
    return standardKeys.filter(cardId =>
      this.isFusionUnlocked(cardId, weapons)
    );
  }
}
