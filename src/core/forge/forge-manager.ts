/**
 * 《孤城神机营》- Forge Manager (神机天工坊·锻造与装配管理器)
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 * Authoritative: GDD V3.0 §11.3
 */

import { PlayerProfile } from '../meta/types';
import {
  ComponentSlot,
  ComponentDefinition,
  ForgedComponentItem,
  WeaponForgeBonuses,
  ForgeProfileData
} from './types';
import { COMPONENT_DEFINITIONS, getComponentDefinition } from './forge-config';
import { ForgeRefineEngine } from './forge-refine';

export class ForgeManager {
  /**
   * Initializes or normalizes forge profile data if not present.
   */
  public static ensureForgeProfile(profile: PlayerProfile): ForgeProfileData {
    if (!profile.forge) {
      profile.forge = {
        inventory: [],
        equipped: {},
        totalForged: 0
      };
    }
    if (!profile.forge.inventory) profile.forge.inventory = [];
    if (!profile.forge.equipped) profile.forge.equipped = {};
    if (typeof profile.forge.totalForged !== 'number') profile.forge.totalForged = 0;
    return profile.forge;
  }

  /**
   * Checks if player has sufficient blueprints and iron to forge target component.
   */
  public static canForge(
    profile: PlayerProfile,
    componentId: string
  ): { canForge: boolean; reason?: string; cost?: { blueprints: number; iron: number } } {
    const compDef = getComponentDefinition(componentId);
    if (!compDef) {
      return { canForge: false, reason: '未知的部件图纸' };
    }

    const cost = {
      blueprints: compDef.blueprintCost,
      iron: compDef.ironCost
    };

    if ((profile.currencies.blueprints ?? 0) < cost.blueprints) {
      return { canForge: false, reason: `神机图纸不足，需要 ${cost.blueprints} 张图纸`, cost };
    }

    if ((profile.currencies.iron ?? 0) < cost.iron) {
      return { canForge: false, reason: `天外玄铁不足，需要 ${cost.iron} 玄铁`, cost };
    }

    return { canForge: true, cost };
  }

  /**
   * Forges a new component and places it into inventory.
   */
  public static forgeComponent(
    profile: PlayerProfile,
    componentId: string
  ): { success: boolean; item?: ForgedComponentItem; error?: string } {
    const check = this.canForge(profile, componentId);
    if (!check.canForge || !check.cost) {
      return { success: false, error: check.reason || '无法锻造' };
    }

    const forge = this.ensureForgeProfile(profile);

    // Atomic currency deduction
    profile.currencies.blueprints -= check.cost.blueprints;
    profile.currencies.iron -= check.cost.iron;

    // Create item
    const uid = `comp_${componentId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const newItem: ForgedComponentItem = {
      uid,
      componentId,
      acquiredAt: Date.now()
    };

    forge.inventory.push(newItem);
    forge.totalForged++;

    return { success: true, item: newItem };
  }

  /**
   * Equips a component onto a weapon archetype slot.
   * If this component is equipped elsewhere, it is unequipped from the old location first.
   */
  public static equipComponent(
    profile: PlayerProfile,
    weaponConfigId: string,
    itemUid: string
  ): { success: boolean; slot?: ComponentSlot; error?: string } {
    const forge = this.ensureForgeProfile(profile);
    const item = forge.inventory.find(i => i.uid === itemUid);
    if (!item) {
      return { success: false, error: '部件不存在于军械库中' };
    }

    const compDef = getComponentDefinition(item.componentId);
    if (!compDef) {
      return { success: false, error: '部件定义损坏' };
    }

    const targetSlot = compDef.slot;

    // Remove this item if already equipped on any other weapon slot
    for (const [wId, slots] of Object.entries(forge.equipped)) {
      if (slots.barrel === itemUid) slots.barrel = undefined;
      if (slots.receiver === itemUid) slots.receiver = undefined;
      if (slots.fuze === itemUid) slots.fuze = undefined;
    }

    // Equip to target weapon
    if (!forge.equipped[weaponConfigId]) {
      forge.equipped[weaponConfigId] = {};
    }

    forge.equipped[weaponConfigId][targetSlot] = itemUid;

    return { success: true, slot: targetSlot };
  }

  /**
   * Unequips a component from a weapon archetype slot.
   */
  public static unequipComponent(
    profile: PlayerProfile,
    weaponConfigId: string,
    slot: ComponentSlot
  ): { success: boolean; unequippedUid?: string } {
    const forge = this.ensureForgeProfile(profile);
    const slots = forge.equipped[weaponConfigId];
    if (!slots || !slots[slot]) {
      return { success: false };
    }

    const unequippedUid = slots[slot];
    slots[slot] = undefined;

    return { success: true, unequippedUid };
  }

  /**
   * Calculates aggregate forge bonuses for a specific weapon archetype.
   */
  public static calculateWeaponForgeBonuses(
    profile: PlayerProfile,
    weaponConfigId: string
  ): WeaponForgeBonuses {
    const emptyResult: WeaponForgeBonuses = {
      atkBonus: 0,
      cooldownReduction: 0,
      rangeBonus: 0,
      critRateBonus: 0,
      critDmgBonus: 0,
      armorPierce: 0,
      reflectBonus: 0,
      reactionDamageBonus: 0,
      activeComponentNames: []
    };

    if (!profile.forge || !profile.forge.equipped || !profile.forge.equipped[weaponConfigId]) {
      return emptyResult;
    }

    const slots = profile.forge.equipped[weaponConfigId];
    const itemUids = [slots.barrel, slots.receiver, slots.fuze].filter(Boolean) as string[];

    if (itemUids.length === 0) {
      return emptyResult;
    }

    const invMap = new Map<string, ForgedComponentItem>();
    for (const item of profile.forge.inventory) {
      invMap.set(item.uid, item);
    }

    let atkBonus = 0;
    let cooldownReduction = 0;
    let rangeBonus = 0;
    let critRateBonus = 0;
    let critDmgBonus = 0;
    let armorPierce = 0;
    let reflectBonus = 0;
    let reactionDamageBonus = 0;
    const activeNames: string[] = [];

    for (const uid of itemUids) {
      const item = invMap.get(uid);
      if (!item) continue;
      const def = getComponentDefinition(item.componentId);
      if (!def) continue;

      activeNames.push(def.name);
      if (def.bonuses.atkBonus) atkBonus += def.bonuses.atkBonus;
      if (def.bonuses.cooldownReduction) cooldownReduction += def.bonuses.cooldownReduction;
      if (def.bonuses.rangeBonus) rangeBonus += def.bonuses.rangeBonus;
      if (def.bonuses.critRateBonus) critRateBonus += def.bonuses.critRateBonus;
      if (def.bonuses.critDmgBonus) critDmgBonus += def.bonuses.critDmgBonus;
      if (def.bonuses.armorPierce) armorPierce += def.bonuses.armorPierce;
      if (def.bonuses.reflectBonus) reflectBonus += def.bonuses.reflectBonus;
      if (def.bonuses.reactionDamageBonus) reactionDamageBonus += def.bonuses.reactionDamageBonus;

      // Aggregated rolled refinement affixes
      if (item.affixes) {
        for (const affix of item.affixes) {
          switch (affix.type) {
            case 'atk_pct': atkBonus += affix.value; break;
            case 'cooldown_pct': cooldownReduction += affix.value; break;
            case 'range': rangeBonus += affix.value; break;
            case 'crit_rate': critRateBonus += affix.value; break;
            case 'crit_dmg': critDmgBonus += affix.value; break;
            case 'armor_pierce': armorPierce += affix.value; break;
            case 'reflect_pct': reflectBonus += affix.value; break;
            case 'reaction_dmg': reactionDamageBonus += affix.value; break;
          }
        }
      }
    }

    // Apply safety caps
    return {
      atkBonus: Number(Math.min(1.0, atkBonus).toFixed(3)),
      cooldownReduction: Number(Math.min(0.40, cooldownReduction).toFixed(3)),
      rangeBonus: Math.min(100, rangeBonus),
      critRateBonus: Number(Math.min(0.30, critRateBonus).toFixed(3)),
      critDmgBonus: Number(Math.min(0.75, critDmgBonus).toFixed(3)),
      armorPierce: Math.min(100, armorPierce),
      reflectBonus: Number(Math.min(0.50, reflectBonus).toFixed(3)),
      reactionDamageBonus: Number(Math.min(0.50, reactionDamageBonus).toFixed(3)),
      activeComponentNames: activeNames
    };
  }

  /**
   * Generates a dictionary of forge bonuses for all weapons.
   */
  public static calculateAllForgeBonuses(
    profile: PlayerProfile
  ): Record<string, WeaponForgeBonuses> {
    const result: Record<string, WeaponForgeBonuses> = {};
    if (!profile.forge || !profile.forge.equipped) {
      return result;
    }

    for (const weaponId of Object.keys(profile.forge.equipped)) {
      result[weaponId] = this.calculateWeaponForgeBonuses(profile, weaponId);
    }

    return result;
  }
}
