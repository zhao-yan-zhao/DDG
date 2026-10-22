/**
 * 《孤城神机营》- Affix Mounting & Combat Integration Engine
 * Strictly conforms to GDD V3.0 §4.3 & §7.2, and PROJECT.md §3:
 * - 4 Affix Categories: INSTANT_EFFECT, STATIC_MODIFIER, EVENT_HOOK, ENTITY_MUTATION.
 * - Dynamic real-time calculation:
 *   - T14 (神机百炼): Silver / 10 * 3%, capped at 300 silver (max +90%)
 *   - T30 (固若金汤): 25% current max wall durability converted to weapon ATK
 *   - T08 (多多益善): +4% ASPD per placed weapon; +40% final dmg when all 25 cells filled
 *   - T11 (三段击阵法): >= 3 fire weapons in same row -> +80% ASPD for row fire weapons
 *   - T32 (阵列同心): 1x1 weapon surrounded on all 4 orthogonal sides -> +100% ATK, +50% ASPD
 *   - T31 (元素乱流): +8 rage per reaction, +5% ASPD per stack up to 10 stacks (max +50%)
 * - Strict mathematical safety clamps:
 *   - Additive sum <= 150% (1.50)
 *   - Independent multipliers: whitelisted, max 3 gates, each <= 25% (0.25)
 *   - Crit rate <= 75% (0.75)
 *   - Crit multiplier <= 2.00
 *   - Attack interval floor >= 0.10s
 *   - Final damage floor >= 1.0
 */

import {
  WeaponInstance,
  EnemyEntity,
  DamageCalculationContext
} from '../types';
import {
  TacticCardConfig,
  getTacticCardConfig
} from '../../config/tactics.config';

export interface AffixCalculationContext {
  currentSilver?: number;
  wallMaxHp?: number;
  wallCurrentHp?: number;
  unlockedCellsCount?: number;
  placedWeapons?: WeaponInstance[];
  gridMatrix?: (WeaponInstance | null)[][];
  totalOccupiedCells?: number;
}

export interface InstantEffectCallbacks {
  grantSilver?: (amount: number) => void;
  healWall?: (amount: number) => void;
  addWallMaxHp?: (amount: number) => void;
  unlockCells?: (count: number) => void;
  grantStarUpgradeTokens?: (count: number) => void;
}

export class AffixMountEngine {
  private activeCards: Set<string> = new Set();
  private turbulenceStacks: number = 0; // T31 stacks (max 10)
  private starUpgradeTokens: number = 0; // T07 tokens
  private killCountForDrop: number = 0; // T06 kill tracker

  constructor(activeCardIds?: string[]) {
    if (activeCardIds) {
      for (const id of activeCardIds) {
        this.activeCards.add(id);
      }
    }
  }

  /**
   * Mounts a card and triggers instant effects if applicable.
   */
  public mountCard(cardId: string, callbacks?: InstantEffectCallbacks): boolean {
    const config = getTacticCardConfig(cardId);
    if (!config) return false;

    this.activeCards.add(cardId);

    // Process instant effects
    if (config.affixTypes.includes('INSTANT_EFFECT') && config.params) {
      if (config.params.grantSilver && callbacks?.grantSilver) {
        callbacks.grantSilver(config.params.grantSilver);
      }
      if (config.params.healWallRatio && callbacks?.healWall && callbacks.addWallMaxHp) {
        if (config.params.addWallMaxHp) {
          callbacks.addWallMaxHp(config.params.addWallMaxHp);
        }
      }
      if (config.params.unlockCells && callbacks?.unlockCells) {
        callbacks.unlockCells(config.params.unlockCells);
      }
      if (config.params.grantStarUpgradeTokens) {
        this.starUpgradeTokens += config.params.grantStarUpgradeTokens;
        if (callbacks?.grantStarUpgradeTokens) {
          callbacks.grantStarUpgradeTokens(config.params.grantStarUpgradeTokens);
        }
      }
    }

    return true;
  }

  public unmountCard(cardId: string): boolean {
    return this.activeCards.delete(cardId);
  }

  private static readonly ALIAS_MAP: Record<string, string> = {
    'nine_heaven_thunder_pool': 'T33',
    'storm_rocket_cart': 'T34',
    'fire_dragon_water': 'T35',
    'iron_buddha_ox': 'T35',
    'mount_tai_ice_meteor': 'T36'
  };

  public isCardActive(cardId: string): boolean {
    if (this.activeCards.has(cardId)) return true;
    const mapped = AffixMountEngine.ALIAS_MAP[cardId];
    if (mapped && this.activeCards.has(mapped)) return true;
    for (const [alias, canonical] of Object.entries(AffixMountEngine.ALIAS_MAP)) {
      if (canonical === cardId && this.activeCards.has(alias)) return true;
    }
    return false;
  }

  public getActiveCards(): string[] {
    return Array.from(this.activeCards);
  }

  public reset(): void {
    this.activeCards.clear();
    this.turbulenceStacks = 0;
    this.starUpgradeTokens = 0;
    this.killCountForDrop = 0;
  }

  // =========================================================================
  // Dynamic Real-Time Calculations
  // =========================================================================

  /**
   * Calculates dynamic additive damage bonuses for an attacking weapon.
   */
  public getAdditiveDamageBonuses(
    attacker: WeaponInstance,
    context?: AffixCalculationContext
  ): number[] {
    const bonuses: number[] = [];

    // T09 《改良黑火药》: +25% additive fire damage
    if (this.isCardActive('T09') && attacker.faction === 'fire') {
      bonuses.push(0.25);
    }

    // T14 《神机百炼》: +3% fire damage per 10 silver, max silver 300 (+90% max)
    if (this.isCardActive('T14') && attacker.faction === 'fire') {
      const silver = Math.min(context?.currentSilver ?? 0, 300);
      const rawBonus = Math.floor(silver / 10) * 0.03;
      const bonus = Math.min(Math.round(rawBonus * 10000) / 10000, 0.90);
      if (bonus > 0) {
        bonuses.push(bonus);
      }
    }

    // T05 《鲁班括地》: +2% all weapon damage per unlocked cell
    if (this.isCardActive('T05') && (context?.unlockedCellsCount ?? 0) > 0) {
      const bonus = (context?.unlockedCellsCount ?? 0) * 0.02;
      bonuses.push(bonus);
    }

    // T32 《阵列同心》: 1x1 weapon surrounded on all 4 orthogonal sides gains +100% ATK
    if (this.isCardActive('T32') && context?.gridMatrix && this.isSurrounded1x1(attacker, context.gridMatrix)) {
      bonuses.push(1.00);
    }

    // T35 《真·火龙出水 / 铁浮屠火牛阵》: Fire weapons gain +40% additive damage
    if (this.isCardActive('T35') && attacker.faction === 'fire') {
      bonuses.push(0.40);
    }

    // T36 《九天星陨石 / 泰山陨冰劫》: Catapult gains +50% additive damage
    if (this.isCardActive('T36') && attacker.configId === 'catapult') {
      bonuses.push(0.50);
    }

    return bonuses;
  }

  /**
   * Calculates dynamic flat ATK bonus added to base ATK (e.g. T30 固若金汤).
   */
  public getFlatAtkBonus(context?: AffixCalculationContext): number {
    let flat = 0;
    // T30 《固若金汤》: 25% of current max wall durability converted to flat ATK
    if (this.isCardActive('T30') && (context?.wallMaxHp ?? 0) > 0) {
      flat += (context?.wallMaxHp ?? 0) * 0.25;
    }
    return flat;
  }

  /**
   * Calculates total attack speed bonus for a weapon.
   */
  public getAttackSpeedBonus(
    weapon: WeaponInstance,
    context?: AffixCalculationContext
  ): number {
    let aspd = 0;

    // T08 《多多益善》: +4% ASPD per placed weapon
    if (this.isCardActive('T08') && context?.placedWeapons) {
      aspd += context.placedWeapons.length * 0.04;
    }

    // T11 《三段击阵法》: If horizontal row has >= 3 fire weapons, +80% ASPD
    if (this.isCardActive('T11') && weapon.faction === 'fire' && context?.placedWeapons) {
      if (this.hasThreeFireInRow(weapon, context.placedWeapons)) {
        aspd += 0.80;
      }
    }

    // T24 《泰山压顶》: Catapult ASPD -20%
    if (this.isCardActive('T24') && weapon.configId === 'catapult') {
      aspd -= 0.20;
    }

    // T31 《元素乱流》: +5% ASPD per turbulence stack (max +50%)
    if (this.isCardActive('T31') && this.turbulenceStacks > 0) {
      aspd += this.turbulenceStacks * 0.05;
    }

    // T32 《阵列同心》: 1x1 weapon surrounded on all 4 orthogonal sides gains +50% ASPD
    if (this.isCardActive('T32') && context?.gridMatrix && this.isSurrounded1x1(weapon, context.gridMatrix)) {
      aspd += 0.50;
    }

    // T34 《暴雨火箭车》: Repeating Crossbow攻速暴涨 +100%, Rocket Box +50%
    if (this.isCardActive('T34')) {
      if (weapon.configId === 'repeating_crossbow') {
        aspd += 1.00;
      } else if (weapon.configId === 'rocket_box') {
        aspd += 0.50;
      }
    }

    return aspd;
  }

  /**
   * Calculates crit rate bonus for a weapon.
   */
  public getCritRateBonus(weapon: WeaponInstance): number {
    let rate = 0;
    // T18 《牛筋绞弦》: Mohist crit rate +15%
    if (this.isCardActive('T18') && weapon.faction === 'mohist') {
      rate += 0.15;
    }
    // T33 《红夷雷火炮 / 九天雷池轰》: Red Cannon Crit Rate +25%
    if (this.isCardActive('T33') && (weapon.configId === 'red_cannon' || weapon.configId === 'cannon')) {
      rate += 0.25;
    }
    // T36 《九天星陨石 / 泰山陨冰劫》: Catapult Crit Rate +20%
    if (this.isCardActive('T36') && weapon.configId === 'catapult') {
      rate += 0.20;
    }
    return rate;
  }

  /**
   * Calculates crit damage multiplier bonus for a weapon.
   */
  public getCritDmgBonus(weapon: WeaponInstance, target?: EnemyEntity): number {
    let bonus = 0;
    // T18 《牛筋绞弦》: Mohist crit dmg +30%
    if (this.isCardActive('T18') && weapon.faction === 'mohist') {
      bonus += 0.30;
    }
    // T29 《极寒星象》: +80% crit dmg vs frozen targets
    if (this.isCardActive('T29') && target?.isFrozen) {
      bonus += 0.80;
    }
    return bonus;
  }

  /**
   * Calculates independent multipliers (whitelisted, max 3 gates, each <= 0.25).
   */
  public getIndependentMultipliers(context?: AffixCalculationContext): number[] {
    const mults: number[] = [];

    // T08 《多多益善》 full board bonus: when all 25 cells occupied, +40% final dmg
    // Clamped per gate to <= 0.25
    if (this.isCardActive('T08') && (context?.totalOccupiedCells ?? 0) >= 25) {
      mults.push(0.25); // gate 1
      mults.push(0.15); // gate 2 (0.25 + 0.15 = 0.40)
    }

    return this.clampIndependent(mults);
  }

  /**
   * Calculates effective weapon attack interval clamped to >= 0.10s safety floor.
   */
  public calculateEffectiveInterval(baseInterval: number, aspdBonus: number): number {
    const effectiveAspd = Math.max(-0.90, aspdBonus);
    const interval = baseInterval / (1 + effectiveAspd);
    return Math.max(0.10, interval);
  }

  /**
   * Populates a DamageCalculationContext with all dynamic affixes and mathematical clamps applied.
   */
  public populateDamageContext(
    attacker: WeaponInstance,
    target: EnemyEntity,
    context?: AffixCalculationContext,
    extraAdditive: number[] = [],
    extraIndependent: number[] = []
  ): DamageCalculationContext {
    const affixAdditive = this.getAdditiveDamageBonuses(attacker, context);
    const combinedAdditive = [...affixAdditive, ...extraAdditive];

    const affixIndependent = this.getIndependentMultipliers(context);
    const combinedIndependent = this.clampIndependent([...affixIndependent, ...extraIndependent]);

    const critRateBonus = this.clampCritRate(this.getCritRateBonus(attacker));
    const critDmgBonus = this.getCritDmgBonus(attacker, target);

    // Apply flat ATK bonus to attacker copy if T30 active
    const flatAtk = this.getFlatAtkBonus(context);
    const effectiveAttacker: WeaponInstance = flatAtk > 0
      ? { ...attacker, baseAtk: attacker.baseAtk + flatAtk }
      : attacker;

    let sunderRate = 0;
    // T33 《红夷雷火炮 / 九天雷池轰》: 50% armor sunder rate on red cannon hits
    if (this.isCardActive('T33') && (attacker.configId === 'red_cannon' || attacker.configId === 'cannon')) {
      sunderRate = 0.50;
    }

    return {
      attacker: effectiveAttacker,
      target,
      skillMultiplier: 1.0,
      additiveBonuses: combinedAdditive,
      independentMultipliers: combinedIndependent,
      critRateBonus,
      critDmgBonus,
      sunderFlat: 0,
      sunderRate,
      vulnerability: 0,
      specialReduction: 0
    };
  }

  // =========================================================================
  // Mathematical Clamps & Protection Valves
  // =========================================================================

  public clampAdditive(bonuses: number[]): number {
    const sum = bonuses.reduce((acc, b) => acc + b, 0);
    return Math.min(1.50, Math.max(0, sum));
  }

  public clampIndependent(multipliers: number[]): number[] {
    return multipliers.slice(0, 3).map(m => Math.min(0.25, Math.max(0, m)));
  }

  public clampCritRate(rate: number): number {
    return Math.min(0.75, Math.max(0, rate));
  }

  public clampCritDmg(dmg: number): number {
    return Math.min(2.00, Math.max(1.0, dmg));
  }

  public clampInterval(interval: number): number {
    return Math.max(0.10, interval);
  }

  public clampDamage(dmg: number): number {
    return Math.max(1.0, dmg);
  }

  // =========================================================================
  // Event Hooks & Lifecycle Handlers
  // =========================================================================

  /**
   * Called on every elemental reaction (T31 元素乱流).
   * Returns rage gained for commander (+8).
   */
  public onReaction(): { rageGained: number; turbulenceStacks: number } {
    let rage = 0;
    if (this.isCardActive('T31')) {
      rage = 8;
      if (this.turbulenceStacks < 10) {
        this.turbulenceStacks++;
      }
    }
    return { rageGained: rage, turbulenceStacks: this.turbulenceStacks };
  }

  public getTurbulenceStacks(): number {
    return this.turbulenceStacks;
  }

  public resetTurbulence(): void {
    this.turbulenceStacks = 0;
  }

  public getStarUpgradeTokens(): number {
    return this.starUpgradeTokens;
  }

  public consumeStarUpgradeToken(): boolean {
    if (this.starUpgradeTokens > 0) {
      this.starUpgradeTokens--;
      return true;
    }
    return false;
  }

  /**
   * Called on enemy death. Returns drop info for T06 以战养战.
   */
  public onEnemyKill(): { droppedWeapon: boolean } {
    if (!this.isCardActive('T06')) {
      return { droppedWeapon: false };
    }
    this.killCountForDrop++;
    if (this.killCountForDrop >= 40) {
      this.killCountForDrop -= 40;
      return { droppedWeapon: true };
    }
    return { droppedWeapon: false };
  }

  // =========================================================================
  // Helper Grid Checkers
  // =========================================================================

  private hasThreeFireInRow(weapon: WeaponInstance, placedWeapons: WeaponInstance[]): boolean {
    const row = weapon.anchor.row;
    const fireInRow = placedWeapons.filter(w => {
      if (w.faction !== 'fire') return false;
      const wRowStart = w.anchor.row;
      const wRowEnd = w.anchor.row + (w.footprint?.height || 1) - 1;
      return row >= wRowStart && row <= wRowEnd;
    });
    return fireInRow.length >= 3;
  }

  private isSurrounded1x1(
    weapon: WeaponInstance,
    gridMatrix: (WeaponInstance | null)[][]
  ): boolean {
    if (weapon.footprint.width !== 1 || weapon.footprint.height !== 1) {
      return false;
    }
    const r = weapon.anchor.row;
    const c = weapon.anchor.col;

    // Surrounded on all 4 orthogonal sides requires r in 1..3 and c in 1..3
    if (r <= 0 || r >= 4 || c <= 0 || c >= 4) {
      return false;
    }

    const up = gridMatrix[r - 1]?.[c];
    const down = gridMatrix[r + 1]?.[c];
    const left = gridMatrix[r]?.[c - 1];
    const right = gridMatrix[r]?.[c + 1];

    return Boolean(up && down && left && right);
  }

  // =========================================================================
  // Red-Gold Dual-Weapon Awakening Accessors
  // =========================================================================

  public isT33ThunderPoolActive(): boolean {
    return this.isCardActive('T33');
  }

  public isT34StormRocketActive(): boolean {
    return this.isCardActive('T34');
  }

  public isT35FireDragonActive(): boolean {
    return this.isCardActive('T35');
  }

  public isT36IceMeteorActive(): boolean {
    return this.isCardActive('T36');
  }
}

export const AffixMountManager = AffixMountEngine;
export type AffixMountManager = AffixMountEngine;
