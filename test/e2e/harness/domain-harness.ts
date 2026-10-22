/**
 * 《孤城神机营》- Opaque E2E Domain Simulation Harness
 * Encapsulates public contracts, real domain models, and authoritative rule engines.
 */

import { GridModel } from '../../../src/core/grid/grid-model';
import { StarUpgradeStateMachine } from '../../../src/core/grid/star-upgrade';
import { SmartSwapController } from '../../../src/core/grid/smart-swap';
import { TouchCoordinateMapper } from '../../../src/presentation/touch/touch-controller';
import {
  Faction,
  GridPosition,
  WeaponInstance,
  BondContact,
  FactionResonance,
  EnemyEntity,
  DamageCalculationContext,
  DamageResult,
  ArmoryCardSlot,
  TacticCard,
  TacticQuality
} from './contracts';

// ==========================================
// 1. Grid & Interaction Helper
// ==========================================

export class GridDomainHarness {
  public model: GridModel;

  constructor() {
    this.model = new GridModel();
  }

  public place(weapon: WeaponInstance, anchor: GridPosition) {
    return this.model.placeWeapon(weapon, anchor);
  }

  public placeBench(weapon: WeaponInstance, slotIndex: number) {
    return this.model.placeOnBench(weapon, slotIndex);
  }

  public smartSwap(weapon: WeaponInstance, targetAnchor: GridPosition) {
    return SmartSwapController.tryDropFromGrid(this.model, weapon, targetAnchor);
  }

  public merge(source: WeaponInstance, target: WeaponInstance, dragAnchor?: GridPosition) {
    const hoverAnchor = dragAnchor || target.anchor;
    return StarUpgradeStateMachine.evaluateMerge(source, target, hoverAnchor, target.anchor);
  }

  public touchToVisual(touch: { x: number; y: number }) {
    return TouchCoordinateMapper.touchToVisualPosition(touch);
  }

  public visualToHitTest(visual: { x: number; y: number }) {
    return TouchCoordinateMapper.visualToHitTestPoint(visual);
  }
}

// ==========================================
// 2. Strict 7-Step Damage Pipeline Engine
// ==========================================

export class DamagePipelineEngine {
  public static calculate(ctx: DamageCalculationContext, forcedCritRoll?: number): DamageResult {
    // Step 1: Base panel attack
    const baseAtk = ctx.attacker.baseAtk;

    // Step 2: Skill multiplier
    const skillMultiplier = ctx.skillMultiplier || 1.0;
    const skillDmg = baseAtk * skillMultiplier;

    // Step 3: Additive bonus区 (Hard cap <= +150% = 1.50)
    const rawAdditiveSum = ctx.additiveBonuses.reduce((acc, b) => acc + b, 0);
    const clampedAdditive = Math.min(Math.max(0, rawAdditiveSum), 1.50);
    const additiveDmg = skillDmg * (1 + clampedAdditive);

    // Step 4: Independent multiplicative区 (Max 3 gates, each <= +25% = 0.25)
    const acceptedMultipliers = ctx.independentMultipliers.slice(0, 3);
    let multiProduct = 1.0;
    for (const m of acceptedMultipliers) {
      const clampedM = Math.min(Math.max(0, m), 0.25);
      multiProduct *= (1 + clampedM);
    }
    const multiplicativeDmg = additiveDmg * multiProduct;

    // Step 5: Crit determination (Crit rate <= 75%, Crit dmg <= 2.00)
    const critRate = Math.min(Math.max(0, ctx.critRateBonus), 0.75);
    const critDmgMultiplier = Math.min(Math.max(1.50, 1.50 + ctx.critDmgBonus), 2.00);
    const roll = forcedCritRoll !== undefined ? forcedCritRoll : Math.random();
    const isCrit = roll < critRate;
    const critDmg = isCrit ? multiplicativeDmg * critDmgMultiplier : multiplicativeDmg;

    // Step 6: Armor & Vulnerability calculation
    const effectiveArmor = Math.max(0, ctx.target.armor * (1 - (ctx.sunderRate || 0)) - (ctx.sunderFlat || 0));
    const drArmor = effectiveArmor / (effectiveArmor + 150);
    const vulnerability = Math.max(0, ctx.vulnerability || 0);
    const armorDmg = critDmg * (1 - drArmor) * (1 + vulnerability);

    // Step 7: Minimum damage floor (>= 1.0) and special reductions
    const specialReduction = Math.min(Math.max(0, ctx.specialReduction || 0), 1.0);
    const finalDmg = Math.max(1.0, armorDmg * (1 - specialReduction));
    const actualHpDeducted = Math.min(ctx.target.currentHp, finalDmg);

    return {
      finalDamage: finalDmg,
      isCrit,
      actualHpDeducted,
      effectiveArmor,
      steps: {
        baseAtk,
        skillDmg,
        additiveDmg,
        multiplicativeDmg,
        critDmg,
        armorDmg,
        finalDmg
      }
    };
  }
}

// ==========================================
// 3. Adjacency & Faction Resonance Evaluator
// ==========================================

export class AdjacencyEvaluator {
  public static getOccupiedCells(weapon: WeaponInstance): GridPosition[] {
    const cells: GridPosition[] = [];
    for (let dr = 0; dr < weapon.footprint.height; dr++) {
      for (let dc = 0; dc < weapon.footprint.width; dc++) {
        cells.push({ row: weapon.anchor.row + dr, col: weapon.anchor.col + dc });
      }
    }
    return cells;
  }

  public static evaluateContact(weaponA: WeaponInstance, weaponB: WeaponInstance): BondContact {
    const cellsA = this.getOccupiedCells(weaponA);
    const cellsB = this.getOccupiedCells(weaponB);

    let isOrthogonal = false;
    let isChebyshev = false;

    for (const a of cellsA) {
      for (const b of cellsB) {
        const manhattan = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
        const chebyshev = Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));

        if (manhattan === 1) {
          isOrthogonal = true;
        }
        if (chebyshev === 1) {
          isChebyshev = true;
        }
      }
    }

    return {
      weaponAId: weaponA.id,
      weaponBId: weaponB.id,
      isOrthogonal,
      isChebyshev
    };
  }

  public static evaluateAllBonds(weapons: WeaponInstance[]): BondContact[] {
    const contacts: BondContact[] = [];
    for (let i = 0; i < weapons.length; i++) {
      for (let j = i + 1; j < weapons.length; j++) {
        const contact = this.evaluateContact(weapons[i], weapons[j]);
        if (contact.isOrthogonal || contact.isChebyshev) {
          contacts.push(contact);
        }
      }
    }
    return contacts;
  }

  public static evaluateResonances(weapons: WeaponInstance[]): FactionResonance[] {
    const counts: Record<Faction, number> = {
      fire: 0,
      mohist: 0,
      fortress: 0,
      qimen: 0
    };

    for (const w of weapons) {
      counts[w.faction]++;
    }

    return (Object.keys(counts) as Faction[]).map(faction => {
      const count = counts[faction];
      const tier = count >= 4 ? 4 : count >= 2 ? 2 : 0;
      return { faction, count, tier };
    });
  }
}

// ==========================================
// 4. Elemental Reaction & Anti-Crash Valves
// ==========================================

export interface ElementalStatus {
  hasOil: boolean;
  burnStacks: number;
  hasShock: boolean;
  isFrozen: boolean;
  hasPoison: boolean;
  lastExplosionTime?: number;
  lastIceShatterTime?: number;
  thunderStrikeCountOnBoss?: number;
  poisonFireDurationRemaining?: number;
}

export class ElementalReactionEngine {
  public static triggerExplosion(
    status: ElementalStatus,
    currentTime: number
  ): { triggered: boolean; damage: number; fireSeaDuration: number; reason?: string } {
    if (!status.hasOil) {
      return { triggered: false, damage: 0, fireSeaDuration: 0, reason: 'NO_OIL' };
    }
    if (status.lastExplosionTime !== undefined && currentTime - status.lastExplosionTime < 1.5) {
      return { triggered: false, damage: 0, fireSeaDuration: 0, reason: 'VALVE_COOLDOWN' };
    }

    status.hasOil = false;
    status.lastExplosionTime = currentTime;
    return {
      triggered: true,
      damage: 180,
      fireSeaDuration: 3.5
    };
  }

  public static triggerThunderStrike(
    status: ElementalStatus,
    target: EnemyEntity
  ): { triggered: boolean; paralysisDuration: number; vulnRate: number; reason?: string } {
    if (!status.hasShock || status.burnStacks < 3) {
      return { triggered: false, paralysisDuration: 0, vulnRate: 0, reason: 'CONDITIONS_UNMET' };
    }

    if (target.isBoss && (status.thunderStrikeCountOnBoss || 0) >= 3) {
      return { triggered: false, paralysisDuration: 0, vulnRate: 0, reason: 'BOSS_LIMIT_EXCEEDED' };
    }

    if (target.isBoss) {
      status.thunderStrikeCountOnBoss = (status.thunderStrikeCountOnBoss || 0) + 1;
    }

    target.shield = 0; // Guard broken
    const baseDuration = target.isBoss ? 1.0 : 2.0; // Boss has 50% natural tenacity
    return {
      triggered: true,
      paralysisDuration: baseDuration,
      vulnRate: 0.50
    };
  }

  public static triggerIceShatter(
    status: ElementalStatus,
    target: EnemyEntity,
    currentTime: number
  ): { triggered: boolean; damage: number; slowRate: number; reason?: string } {
    if (!status.isFrozen) {
      return { triggered: false, damage: 0, slowRate: 0, reason: 'NOT_FROZEN' };
    }
    if (status.lastIceShatterTime !== undefined && currentTime - status.lastIceShatterTime < 2.0) {
      return { triggered: false, damage: 0, slowRate: 0, reason: 'VALVE_COOLDOWN' };
    }

    status.isFrozen = false;
    status.lastIceShatterTime = currentTime;

    let damage = target.maxHp * 0.08;
    if (target.isBoss) {
      damage = Math.min(damage, target.maxHp * 0.03); // Hard cap 3% on Boss
    }

    return {
      triggered: true,
      damage,
      slowRate: 0.40
    };
  }

  public static triggerPoisonFire(
    status: ElementalStatus
  ): { triggered: boolean; dotAmp: number; duration: number; healingDisabled: boolean } {
    if (!status.hasPoison) {
      return { triggered: false, dotAmp: 0, duration: 0, healingDisabled: false };
    }

    status.poisonFireDurationRemaining = 4.0; // Strictly capped at 4.0s without infinite refresh
    return {
      triggered: true,
      dotAmp: 1.20,
      duration: 4.0,
      healingDisabled: true
    };
  }
}

// ==========================================
// 5. CC Decay & Tenacity Engine
// ==========================================

export class CCDecayEngine {
  public static calculateCCDuration(
    baseDuration: number,
    ccCount: number,
    isBoss: boolean
  ): number {
    let duration = baseDuration;
    if (isBoss) {
      duration *= 0.50; // Boss 50% natural tenacity
    }
    const decayed = duration * Math.pow(0.70, ccCount);
    return Math.max(0.20, decayed); // Minimum floor 0.20s
  }

  public static canApplyCC(target: EnemyEntity, currentTime: number): boolean {
    if (target.isTenacious && target.tenacityTimer !== undefined) {
      if (currentTime < target.tenacityTimer) {
        return false; // Immune during 1.5s tenacity window
      }
    }
    return true;
  }
}

// ==========================================
// 6. Shop PRNG & Pity Timer Engine
// ==========================================

export interface ShopWeightLadder {
  commonRate: number;
  fineRate: number;
  heavyRate: number;
}

export class ShopEngine {
  public rollsWithoutMerge: number = 0;

  public static getLadderWeights(wave: number): ShopWeightLadder {
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

  public rollSlots(
    wave: number,
    ownedStar1Configs: string[],
    forcedRng?: { slot3IsPity?: boolean }
  ): ArmoryCardSlot[] {
    this.rollsWithoutMerge++;
    const isPityActive = this.rollsWithoutMerge >= 3 && ownedStar1Configs.length > 0;
    const weights = ShopEngine.getLadderWeights(wave);

    const slots: ArmoryCardSlot[] = [];
    for (let i = 0; i < 3; i++) {
      const isSlot3Pity = i === 2 && isPityActive;
      const willTriggerPity = isSlot3Pity && (forcedRng?.slot3IsPity !== undefined ? forcedRng.slot3IsPity : Math.random() < 0.65);

      if (willTriggerPity) {
        const pickedConfig = ownedStar1Configs[0];
        slots.push({
          slotIndex: i,
          weaponConfigId: pickedConfig,
          faction: 'fire',
          quality: 'common',
          cost: 15,
          isPityCompensation: true
        });
      } else {
        slots.push({
          slotIndex: i,
          weaponConfigId: `unit_random_${i}`,
          faction: 'fire',
          quality: weights.heavyRate > 0 ? 'fine' : 'common',
          cost: 20,
          isPityCompensation: false
        });
      }
    }
    return slots;
  }

  public onMergeOccurred(): void {
    this.rollsWithoutMerge = 0;
  }
}

// ==========================================
// 7. 36 Roguelike Tactics Deck Engine
// ==========================================

export class TacticsDeckEngine {
  public cards: TacticCard[] = [];

  constructor() {
    this.initCatalog();
  }

  private initCatalog() {
    // 8 General cards
    const generals: { id: string; name: string; q: TacticQuality; maxPicks: 1 | 2 }[] = [
      { id: 'T01', name: '募兵急令', q: 'blue', maxPicks: 2 },
      { id: 'T02', name: '修缮女墙', q: 'blue', maxPicks: 2 },
      { id: 'T03', name: '精兵简政', q: 'blue', maxPicks: 1 },
      { id: 'T04', name: '屯田生息', q: 'purple', maxPicks: 1 },
      { id: 'T05', name: '鲁班括地', q: 'purple', maxPicks: 1 },
      { id: 'T06', name: '以战养战', q: 'purple', maxPicks: 1 },
      { id: 'T07', name: '天降虎符', q: 'gold', maxPicks: 2 },
      { id: 'T08', name: '多多益善', q: 'gold', maxPicks: 1 }
    ];
    for (const g of generals) {
      this.cards.push({
        id: g.id,
        name: g.name,
        quality: g.q,
        category: 'general',
        maxPicksPerRun: g.maxPicks,
        currentPicks: 0
      });
    }

    // 8 Fire cards
    const fires = [
      { id: 'T09', name: '改良黑火药', q: 'blue' as TacticQuality },
      { id: 'T10', name: '散霰铁砂', q: 'blue' as TacticQuality },
      { id: 'T11', name: '三段击阵法', q: 'purple' as TacticQuality },
      { id: 'T12', name: '焦土火海', q: 'purple' as TacticQuality },
      { id: 'T13', name: '重炮开花弹', q: 'purple' as TacticQuality },
      { id: 'T14', name: '神机百炼', q: 'gold' as TacticQuality },
      { id: 'T15', name: '连环引爆', q: 'gold' as TacticQuality },
      { id: 'T16', name: '万历大阅兵', q: 'gold' as TacticQuality }
    ];
    for (const f of fires) {
      this.cards.push({ id: f.id, name: f.name, quality: f.q, category: 'fire', maxPicksPerRun: 1, currentPicks: 0 });
    }

    // 8 Mohist cards
    const mohists = [
      { id: 'T17', name: '淬毒弩簇', q: 'blue' as TacticQuality },
      { id: 'T18', name: '牛筋绞弦', q: 'blue' as TacticQuality },
      { id: 'T19', name: '分裂机关箭', q: 'purple' as TacticQuality },
      { id: 'T20', name: '巨石滚木', q: 'purple' as TacticQuality },
      { id: 'T21', name: '透甲重锤', q: 'purple' as TacticQuality },
      { id: 'T22', name: '墨门机巧心', q: 'gold' as TacticQuality },
      { id: 'T23', name: '万箭穿心', q: 'gold' as TacticQuality },
      { id: 'T24', name: '泰山压顶', q: 'gold' as TacticQuality }
    ];
    for (const m of mohists) {
      this.cards.push({ id: m.id, name: m.name, quality: m.q, category: 'mohist', maxPicksPerRun: 1, currentPicks: 0 });
    }

    // 8 Fortress cards
    const fortresses = [
      { id: 'T25', name: '猛火沥青', q: 'blue' as TacticQuality },
      { id: 'T26', name: '荆棘铁甲', q: 'blue' as TacticQuality },
      { id: 'T27', name: '雷火交加', q: 'purple' as TacticQuality },
      { id: 'T28', name: '陷阵死士', q: 'purple' as TacticQuality },
      { id: 'T29', name: '极寒星象', q: 'purple' as TacticQuality },
      { id: 'T30', name: '固若金汤', q: 'gold' as TacticQuality },
      { id: 'T31', name: '元素乱流', q: 'gold' as TacticQuality },
      { id: 'T32', name: '阵列同心', q: 'gold' as TacticQuality }
    ];
    for (const fo of fortresses) {
      this.cards.push({ id: fo.id, name: fo.name, quality: fo.q, category: 'fortress', maxPicksPerRun: 1, currentPicks: 0 });
    }

    // 4 Fusion Red-Gold cards
    const fusions = [
      { id: 'T33', name: '红夷雷火炮', unitA: 'cannon', unitB: 'grid_trap' },
      { id: 'T34', name: '暴雨火箭车', unitA: 'repeating_crossbow', unitB: 'rocket_box' },
      { id: 'T35', name: '铁浮屠火牛阵', unitA: 'spear_camp', unitB: 'oil_cabinet' },
      { id: 'T36', name: '九天星陨石', unitA: 'catapult', unitB: 'stargazer' }
    ];
    for (const fu of fusions) {
      this.cards.push({
        id: fu.id,
        name: fu.name,
        quality: 'red_gold',
        category: 'fusion',
        maxPicksPerRun: 1,
        currentPicks: 0,
        prerequisites: {
          unitA: { configId: fu.unitA, star: 3 },
          unitB: { configId: fu.unitB, star: 3 }
        }
      });
    }
  }

  public isFusionUnlocked(cardId: string, weaponsOnGrid: WeaponInstance[]): boolean {
    const card = this.cards.find(c => c.id === cardId);
    if (!card || !card.prerequisites) return false;

    const hasA = weaponsOnGrid.some(w => w.configId === card.prerequisites!.unitA.configId && w.star >= 3);
    const hasB = weaponsOnGrid.some(w => w.configId === card.prerequisites!.unitB.configId && w.star >= 3);
    return hasA && hasB;
  }

  public calculateWeight(card: TacticCard, dominantFaction: Faction | null, absentFactions: Faction[]): number {
    let weight = 1.0;
    if (dominantFaction && card.category === dominantFaction) {
      weight *= 1.85; // 1.85x for dominant faction
    }
    if (absentFactions.includes(card.category as Faction)) {
      weight *= 0.15; // 0.15x for absent faction
    }
    return weight;
  }

  public canPick(cardId: string): boolean {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) return false;
    return card.currentPicks < card.maxPicksPerRun;
  }

  public pick(cardId: string): boolean {
    const card = this.cards.find(c => c.id === cardId);
    if (!card || !this.canPick(cardId)) return false;
    card.currentPicks++;
    return true;
  }
}

// ==========================================
// 8. Wave Combat & Economy Simulator
// ==========================================

export class EconomyEngine {
  public static calculateIncome(wave: number, currentSilver: number, hasTunTian: boolean = false): { stipend: number; interest: number; total: number } {
    const stipends: Record<number, number> = {
      1: 35, 2: 40, 3: 45, 4: 50, 5: 55,
      6: 60, 7: 65, 8: 70, 9: 80
    };
    const stipend = wave >= 10 ? 100 : (stipends[wave] || 35);

    let interestRate = 0.10;
    let interestCap = 5;

    if (hasTunTian) {
      interestRate = 0.20;
      interestCap = 8;
    }

    const calculatedInterest = Math.floor(currentSilver * interestRate);
    const interest = Math.min(calculatedInterest, interestCap);

    return {
      stipend,
      interest,
      total: stipend + interest
    };
  }
}
