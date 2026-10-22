/**
 * 《孤城神机营》- Opaque E2E Test Contracts
 * Derived directly from PROJECT.md § Interface Contracts & GDD V3.0
 */

export type Faction = 'fire' | 'mohist' | 'fortress' | 'qimen';
export type StarLevel = 1 | 2 | 3 | 4;

export interface GridPosition {
  row: number; // 0..4
  col: number; // 0..4
}

export interface GridFootprint {
  width: number;  // 1 or 2
  height: number; // 1 or 2
}

export interface WeaponInstance {
  id: string;
  configId: string;
  name?: string;
  star: StarLevel;
  faction: Faction;
  footprint: GridFootprint;
  anchor: GridPosition;
  isFortressOnly: boolean;
  baseAtk: number;
  attackInterval: number; // in seconds
  range: number;          // in meters (1m = 68px)
}

export interface BondContact {
  weaponAId: string;
  weaponBId: string;
  isOrthogonal: boolean; // Cross adjacent (Manhattan == 1)
  isChebyshev: boolean;  // Moore 3x3 adjacent (Chebyshev == 1)
}

export interface FactionResonance {
  faction: Faction;
  count: number;
  tier: 0 | 2 | 4;
}

export interface EnemyEntity {
  id: string;
  typeId: string;
  name: string;
  isBoss: boolean;
  maxHp: number;
  currentHp: number;
  armor: number;
  shield: number;
  moveSpeed: number; // m/s
  isParalyzed?: boolean;
  isFrozen?: boolean;
  isTenacious?: boolean;
  tenacityTimer?: number;
  ccCount?: number;
}

export interface DamageCalculationContext {
  attacker: WeaponInstance;
  target: EnemyEntity;
  skillMultiplier: number;
  additiveBonuses: number[];        // Clamped to sum <= 1.50 (150%)
  independentMultipliers: number[];   // Whitelisted, max 3, each <= 0.25 (25%)
  critRateBonus: number;            // Total Crit Rate clamped <= 0.75 (75%)
  critDmgBonus: number;             // Total Crit Dmg clamped <= 2.00
  sunderFlat: number;               // Flat armor reduction
  sunderRate: number;               // Percentage armor reduction
  vulnerability: number;            // Damage amp on target
  specialReduction: number;         // Barrier / special defense
}

export interface DamageResult {
  finalDamage: number;              // Clamped >= 1.0 (minimum guarantee)
  isCrit: boolean;
  actualHpDeducted: number;
  effectiveArmor: number;
  steps: {
    baseAtk: number;
    skillDmg: number;
    additiveDmg: number;
    multiplicativeDmg: number;
    critDmg: number;
    armorDmg: number;
    finalDmg: number;
  };
}

export interface ArmoryCardSlot {
  slotIndex: number;
  weaponConfigId: string;
  faction: Faction;
  quality: 'common' | 'fine' | 'heavy';
  cost: number;
  isPityCompensation: boolean;
}

export type TacticQuality = 'blue' | 'purple' | 'gold' | 'red_gold';
export type TacticCategory = 'general' | 'fire' | 'mohist' | 'fortress' | 'fusion';

export interface TacticCard {
  id: string;
  name: string;
  quality: TacticQuality;
  category: TacticCategory;
  maxPicksPerRun: 1 | 2;
  currentPicks: number;
  prerequisites?: {
    unitA: { configId: string; star: number };
    unitB: { configId: string; star: number };
  };
}

export interface IPlatform {
  isByteDanceMiniGame(): boolean;
  getSystemInfo(): { screenWidth: number; screenHeight: number; pixelRatio: number };
  onTouchStart(callback: (e: any) => void): void;
  onTouchMove(callback: (e: any) => void): void;
  onTouchEnd(callback: (e: any) => void): void;
  playAudio(src: string, loop?: boolean): void;
  showRewardedAd(adUnitId: string): Promise<boolean>;
  shareAppMessage(title: string, query?: string): void;
}
