/**
 * 《孤城神机营》- Forge Equipment Refinement & Affix Re-rolling System (天工洗炼与词条重铸)
 * 
 * Pure headless domain model (Zero DOM / Zero Phaser).
 * Standards:
 * - 8 Random Affix Types with C / B / A / S Quality Tiers.
 * - Dynamic Gear Score (战力评分) evaluation.
 * - Affix Locking (词条锁) with dynamic Xuan Iron cost scaling.
 * - Pity Counter (保底防黑): 5 rolls without S-tier guarantees S-tier on 5th/6th roll.
 * - 100% testable in Vitest.
 */

import { PlayerProfile } from '../meta/types';
import {
  ComponentQuality,
  ComponentDefinition,
  ForgedComponentItem,
  ComponentAffix,
  ForgeAffixType,
  AffixTier,
  RefineResult
} from './types';
import { getComponentDefinition } from './forge-config';

export interface AffixTemplate {
  type: ForgeAffixType;
  name: string;
  minVal: number;
  maxVal: number;
  format: (val: number) => string;
  tiers: {
    C: [number, number];
    B: [number, number];
    A: [number, number];
    S: [number, number];
  };
}

export const AFFIX_TEMPLATES: Record<ForgeAffixType, AffixTemplate> = {
  atk_pct: {
    type: 'atk_pct',
    name: '烈火锋芒',
    minVal: 0.02,
    maxVal: 0.08,
    format: (v) => `+${(v * 100).toFixed(1)}% 攻击力`,
    tiers: {
      C: [0.020, 0.035],
      B: [0.035, 0.050],
      A: [0.050, 0.065],
      S: [0.065, 0.080]
    }
  },
  cooldown_pct: {
    type: 'cooldown_pct',
    name: '神机疾动',
    minVal: 0.02,
    maxVal: 0.06,
    format: (v) => `-${(v * 100).toFixed(1)}% 装填冷却`,
    tiers: {
      C: [0.020, 0.030],
      B: [0.030, 0.040],
      A: [0.040, 0.050],
      S: [0.050, 0.060]
    }
  },
  crit_rate: {
    type: 'crit_rate',
    name: '贯甲精准',
    minVal: 0.015,
    maxVal: 0.05,
    format: (v) => `+${(v * 100).toFixed(1)}% 暴击率`,
    tiers: {
      C: [0.015, 0.025],
      B: [0.025, 0.035],
      A: [0.035, 0.045],
      S: [0.045, 0.050]
    }
  },
  crit_dmg: {
    type: 'crit_dmg',
    name: '天罡重创',
    minVal: 0.05,
    maxVal: 0.18,
    format: (v) => `+${(v * 100).toFixed(0)}% 暴击伤害`,
    tiers: {
      C: [0.05, 0.08],
      B: [0.08, 0.12],
      A: [0.12, 0.15],
      S: [0.15, 0.18]
    }
  },
  armor_pierce: {
    type: 'armor_pierce',
    name: '金石摧折',
    minVal: 5,
    maxVal: 20,
    format: (v) => `+${Math.round(v)} 固定破甲`,
    tiers: {
      C: [5, 8],
      B: [8, 12],
      A: [12, 16],
      S: [16, 20]
    }
  },
  range: {
    type: 'range',
    name: '百步穿杨',
    minVal: 10,
    maxVal: 35,
    format: (v) => `+${Math.round(v)}px 射程`,
    tiers: {
      C: [10, 16],
      B: [16, 22],
      A: [22, 28],
      S: [28, 35]
    }
  },
  reaction_dmg: {
    type: 'reaction_dmg',
    name: '五雷同调',
    minVal: 0.03,
    maxVal: 0.10,
    format: (v) => `+${(v * 100).toFixed(1)}% 元素反应增伤`,
    tiers: {
      C: [0.03, 0.05],
      B: [0.05, 0.07],
      A: [0.07, 0.085],
      S: [0.085, 0.10]
    }
  },
  reflect_pct: {
    type: 'reflect_pct',
    name: '玄武逆刺',
    minVal: 0.04,
    maxVal: 0.12,
    format: (v) => `+${(v * 100).toFixed(1)}% 荆棘反弹`,
    tiers: {
      C: [0.04, 0.06],
      B: [0.06, 0.08],
      A: [0.08, 0.10],
      S: [0.10, 0.12]
    }
  }
};

export const ALL_AFFIX_TYPES: ForgeAffixType[] = Object.keys(AFFIX_TEMPLATES) as ForgeAffixType[];

export class ForgeRefineEngine {
  public static readonly BASE_REFINE_IRON_COST = 15;
  public static readonly LOCK_IRON_SURCHARGE = 15;
  public static readonly PITY_THRESHOLD = 5;

  /**
   * Maximum allowed affix slots per component quality.
   */
  public static getMaxAffixSlots(quality: ComponentQuality): number {
    switch (quality) {
      case 'legendary': return 3;
      case 'epic': return 2;
      case 'rare':
      default: return 1;
    }
  }

  /**
   * Maximum allowed locked affixes (must always leave at least 1 slot unlocked).
   */
  public static getMaxLockSlots(quality: ComponentQuality): number {
    const maxSlots = this.getMaxAffixSlots(quality);
    return Math.max(0, maxSlots - 1);
  }

  /**
   * Rolls a single random affix from the template pool.
   * Probability weights: C: 40%, B: 35%, A: 20%, S: 5%
   * If forceSTier is true, guarantees an S-tier roll!
   */
  public static rollSingleAffix(
    type: ForgeAffixType,
    forceSTier: boolean = false,
    affixIndex: number = 0
  ): ComponentAffix {
    const tmpl = AFFIX_TEMPLATES[type];
    let tier: AffixTier;

    if (forceSTier) {
      tier = 'S';
    } else {
      const roll = Math.random();
      if (roll < 0.05) {
        tier = 'S';
      } else if (roll < 0.25) {
        tier = 'A';
      } else if (roll < 0.60) {
        tier = 'B';
      } else {
        tier = 'C';
      }
    }

    const [rangeMin, rangeMax] = tmpl.tiers[tier];
    const rawVal = rangeMin + Math.random() * (rangeMax - rangeMin);
    const value = Number(rawVal.toFixed(3));

    return {
      id: `affix_${type}_${Date.now()}_${affixIndex}`,
      type,
      name: tmpl.name,
      value,
      tier,
      isLocked: false
    };
  }

  /**
   * Rolls a set of random distinct affixes for a given component quality.
   */
  public static rollAffixesForQuality(
    quality: ComponentQuality,
    forceSTier: boolean = false
  ): ComponentAffix[] {
    const slotCount = this.getMaxAffixSlots(quality);
    const availableTypes = [...ALL_AFFIX_TYPES];
    const results: ComponentAffix[] = [];

    // Shuffle types to guarantee distinct affix types on the same item
    for (let i = availableTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableTypes[i], availableTypes[j]] = [availableTypes[j], availableTypes[i]];
    }

    for (let i = 0; i < slotCount; i++) {
      const type = availableTypes[i];
      const isPityTarget = forceSTier && i === 0;
      results.push(this.rollSingleAffix(type, isPityTarget, i));
    }

    return results;
  }

  /**
   * Calculates comprehensive Gear Score (战力评分) for an item.
   */
  public static calculateGearScore(
    item: ForgedComponentItem,
    def?: ComponentDefinition
  ): { score: number; rankText: string; rankColor: string } {
    const compDef = def || getComponentDefinition(item.componentId);
    let baseScore = 200;
    if (compDef) {
      if (compDef.quality === 'legendary') baseScore = 800;
      else if (compDef.quality === 'epic') baseScore = 450;
      else baseScore = 200;
    }

    let affixScore = 0;
    if (item.affixes) {
      for (const affix of item.affixes) {
        switch (affix.tier) {
          case 'S': affixScore += 180; break;
          case 'A': affixScore += 120; break;
          case 'B': affixScore += 70; break;
          case 'C': affixScore += 35; break;
        }
        // Additional fractional bonus based on relative roll strength
        const tmpl = AFFIX_TEMPLATES[affix.type];
        if (tmpl) {
          const ratio = (affix.value - tmpl.minVal) / Math.max(0.001, tmpl.maxVal - tmpl.minVal);
          affixScore += Math.round(ratio * 30);
        }
      }
    }

    const totalScore = baseScore + affixScore;

    let rankText = '良铁初成 (C)';
    let rankColor = '#90caf9';
    if (totalScore >= 1200) {
      rankText = '冠绝天工 (S+)';
      rankColor = '#ffd700';
    } else if (totalScore >= 900) {
      rankText = '极品珍宝 (S)';
      rankColor = '#ff9800';
    } else if (totalScore >= 650) {
      rankText = '精炼无双 (A)';
      rankColor = '#ab47bc';
    } else if (totalScore >= 450) {
      rankText = '精工巧制 (B)';
      rankColor = '#42a5f5';
    }

    return { score: totalScore, rankText, rankColor };
  }

  /**
   * Calculates the iron cost to refine an item given how many affixes are locked.
   */
  public static calculateRefineCost(lockedCount: number): number {
    return this.BASE_REFINE_IRON_COST + lockedCount * this.LOCK_IRON_SURCHARGE;
  }

  /**
   * Checks if player has sufficient iron to re-roll this item.
   */
  public static canRefine(
    profile: PlayerProfile,
    item: ForgedComponentItem
  ): { canRefine: boolean; reason?: string; cost: number; lockedCount: number } {
    const def = getComponentDefinition(item.componentId);
    if (!def) {
      return { canRefine: false, reason: '未知的部件配置', cost: 0, lockedCount: 0 };
    }

    const lockedCount = (item.affixes || []).filter(a => a.isLocked).length;
    const maxLock = this.getMaxLockSlots(def.quality);

    if (lockedCount > maxLock) {
      return { canRefine: false, reason: `最多只能锁定 ${maxLock} 条词条`, cost: 0, lockedCount };
    }

    if (item.affixes && item.affixes.length > 0 && lockedCount === item.affixes.length) {
      return { canRefine: false, reason: '必须保留至少 1 条词条进行重铸', cost: 0, lockedCount };
    }

    const cost = this.calculateRefineCost(lockedCount);
    const currentIron = profile.currencies.iron ?? 0;

    if (currentIron < cost) {
      return { canRefine: false, reason: `天外玄铁不足，需要 ${cost} 玄铁 (当前: ${currentIron})`, cost, lockedCount };
    }

    return { canRefine: true, cost, lockedCount };
  }

  /**
   * Ensures an item has valid affixes and gear score generated.
   */
  public static ensureItemAffixes(item: ForgedComponentItem): void {
    if (!item.affixes || item.affixes.length === 0) {
      const def = getComponentDefinition(item.componentId);
      const quality = def?.quality || 'rare';
      item.affixes = this.rollAffixesForQuality(quality, false);
      item.refineCount = 0;
      item.gearScore = this.calculateGearScore(item, def).score;
    }
  }

  /**
   * Toggles the lock status of a specific affix on an item.
   */
  public static toggleAffixLock(
    item: ForgedComponentItem,
    affixId: string
  ): { success: boolean; isLocked?: boolean; error?: string } {
    this.ensureItemAffixes(item);
    const def = getComponentDefinition(item.componentId);
    if (!def) return { success: false, error: '部件定义损坏' };

    const affix = item.affixes?.find(a => a.id === affixId);
    if (!affix) return { success: false, error: '找不到指定词条' };

    const maxLock = this.getMaxLockSlots(def.quality);
    const currentlyLocked = (item.affixes || []).filter(a => a.isLocked && a.id !== affixId).length;

    if (!affix.isLocked && currentlyLocked >= maxLock) {
      return { success: false, error: `当前品质最多只可锁定 ${maxLock} 条词条` };
    }

    affix.isLocked = !affix.isLocked;
    return { success: true, isLocked: affix.isLocked };
  }

  /**
   * Executes refinement (天工洗炼) on a target forged item.
   */
  public static refineItem(
    profile: PlayerProfile,
    itemUid: string
  ): RefineResult {
    const item = profile.forge?.inventory.find(i => i.uid === itemUid);
    if (!item) {
      return { success: false, error: '部件不存在于行囊中' };
    }

    this.ensureItemAffixes(item);
    const check = this.canRefine(profile, item);
    if (!check.canRefine) {
      return { success: false, error: check.reason || '无法洗炼' };
    }

    const def = getComponentDefinition(item.componentId);
    if (!def) {
      return { success: false, error: '部件配置损坏' };
    }

    // Atomic iron deduction
    profile.currencies.iron -= check.cost;

    const oldScore = item.gearScore ?? this.calculateGearScore(item, def).score;
    item.refineCount = (item.refineCount || 0) + 1;

    // Check pity condition: 5 rolls without an S-tier triggers guaranteed S-tier
    let triggerPity = false;
    if (item.refineCount >= this.PITY_THRESHOLD) {
      triggerPity = true;
      item.refineCount = 0;
    }

    // Identify types currently locked to prevent duplicate roll types
    const lockedTypes = new Set<ForgeAffixType>();
    for (const affix of item.affixes || []) {
      if (affix.isLocked) {
        lockedTypes.add(affix.type);
      }
    }

    const availablePool = ALL_AFFIX_TYPES.filter(t => !lockedTypes.has(t));
    for (let i = availablePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePool[i], availablePool[j]] = [availablePool[j], availablePool[i]];
    }

    let rolledSTier = false;
    let poolIndex = 0;

    // Re-roll unlocked affixes
    item.affixes = (item.affixes || []).map((affix, idx) => {
      if (affix.isLocked) {
        if (affix.tier === 'S') rolledSTier = true;
        return affix;
      }

      const nextType = availablePool[poolIndex++] || affix.type;
      const forceS = triggerPity && !rolledSTier;
      const newAffix = this.rollSingleAffix(nextType, forceS, idx);

      if (newAffix.tier === 'S') {
        rolledSTier = true;
      }
      return newAffix;
    });

    // Reset pity if an S tier naturally appeared
    if (rolledSTier) {
      item.refineCount = 0;
    }

    const scoreResult = this.calculateGearScore(item, def);
    item.gearScore = scoreResult.score;
    const scoreDelta = item.gearScore - oldScore;

    return {
      success: true,
      item,
      cost: check.cost,
      pityTriggered: triggerPity,
      scoreDelta
    };
  }
}
