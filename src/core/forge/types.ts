/**
 * 《孤城神机营》- Blueprint Workshop & Equipment Forging Types (神机天工坊·图纸锻造)
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 * Authoritative: GDD V3.0 §11.3, Equipment Forging Spec
 */

export type ComponentSlot = 'barrel' | 'receiver' | 'fuze';

export type ComponentQuality = 'rare' | 'epic' | 'legendary';

export interface ComponentBonuses {
  /** 攻击力加成百分比 (如 0.12 表示 +12% ATK) */
  atkBonus?: number;
  /** 攻击间隔缩减百分比 (如 0.15 表示 -15% 冷却，攻击变快) */
  cooldownReduction?: number;
  /** 射程增加像素 (如 40 表示 +40px 射程) */
  rangeBonus?: number;
  /** 暴击率额外加成 (如 0.08 表示 +8% 暴击率) */
  critRateBonus?: number;
  /** 暴击伤害倍率额外加成 (如 0.25 表示 +0.25 暴伤) */
  critDmgBonus?: number;
  /** 护甲穿透固定值 (如 30 表示忽视目标 30 点护甲) */
  armorPierce?: number;
  /** 反伤比例加成 (如 0.15 表示受击反伤 +15%) */
  reflectBonus?: number;
  /** 元素反应独立增伤 (如 0.15 表示反应伤害 +15%) */
  reactionDamageBonus?: number;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  slot: ComponentSlot;
  quality: ComponentQuality;
  desc: string;
  bonuses: ComponentBonuses;
  blueprintCost: number;
  ironCost: number;
  sourceBoss?: string;
}

export type AffixTier = 'C' | 'B' | 'A' | 'S';

export type ForgeAffixType = 
  | 'atk_pct'
  | 'cooldown_pct'
  | 'crit_rate'
  | 'crit_dmg'
  | 'armor_pierce'
  | 'range'
  | 'reaction_dmg'
  | 'reflect_pct';

export interface ComponentAffix {
  id: string;               // e.g. 'affix_1'
  type: ForgeAffixType;     // e.g. 'atk_pct'
  name: string;             // e.g. '烈火锋芒'
  value: number;            // e.g. 0.065
  tier: AffixTier;          // 'C' | 'B' | 'A' | 'S'
  isLocked?: boolean;       // whether this affix is locked from rerolls
}

export interface ForgedComponentItem {
  uid: string;              // Unique instance ID (e.g. comp_copper_barrel_1697000000_1)
  componentId: string;      // Matches ComponentDefinition.id
  acquiredAt: number;       // Timestamp
  affixes?: ComponentAffix[]; // Rolled random affixes
  gearScore?: number;       // Evaluated combat power rating (e.g. 450 ~ 1250)
  refineCount?: number;     // Number of times refined (for pity guarantee tracking)
}

export interface RefineResult {
  success: boolean;
  item?: ForgedComponentItem;
  cost?: number;
  pityTriggered?: boolean;
  scoreDelta?: number;
  error?: string;
}

export interface WeaponEquippedSlots {
  barrel?: string;          // inventory item uid
  receiver?: string;        // inventory item uid
  fuze?: string;            // inventory item uid
}

export interface ForgeProfileData {
  /** Inventory of forged components */
  inventory: ForgedComponentItem[];
  /** Equipped components mapped by weaponConfigId -> slots */
  equipped: Record<string, WeaponEquippedSlots>;
  /** Total items forged */
  totalForged: number;
}

export interface WeaponForgeBonuses {
  atkBonus: number;
  cooldownReduction: number;
  rangeBonus: number;
  critRateBonus: number;
  critDmgBonus: number;
  armorPierce: number;
  reflectBonus: number;
  reactionDamageBonus: number;
  activeComponentNames: string[];
}

export interface BossDropResult {
  blueprints: number;
  iron: number;
  componentDropped?: ComponentDefinition;
  isFirstClearBonus: boolean;
  message: string;
}
