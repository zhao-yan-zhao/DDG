/**
 * 《孤城神机营》- Core Data Structures and Type Definitions
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

/**
 * Four major weapon/engineering factions
 * - fire: 神机火器
 * - mohist: 墨家机关
 * - fortress: 城防工事 (Exclusive to Row 0 battlements)
 * - qimen: 奇门辅佐
 */
export type Faction = 'fire' | 'mohist' | 'fortress' | 'qimen';

/**
 * 5x5 Matrix coordinate
 * - row: 0 (bottom battlement / 女墙) to 4 (top tower / 城楼)
 * - col: 0 (leftmost) to 4 (rightmost)
 */
export interface GridPosition {
  row: number; // 0..4
  col: number; // 0..4
}

/**
 * Footprint dimensions on grid
 * - width: horizontal span (number of columns, 1 or 2)
 * - height: vertical span (number of rows, 1 or 2)
 */
export interface GridFootprint {
  width: number;  // 1 or 2
  height: number; // 1 or 2
}

/**
 * Star upgrade tier (★1 ~ ★4)
 */
export type StarLevel = 1 | 2 | 3 | 4;

/**
 * Headless weapon instance entity
 */
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
  maxHp?: number;         // Frontline Fortress HP (Row 0)
  currentHp?: number;     // Remaining HP
  isBroken?: boolean;     // Whether frontline unit is broken/disabled
  lastDamageTimeSec?: number; // Last time unit took damage (for out-of-combat regen)
}

/**
 * Bench (备战席) slot model
 * Total 5 slots (index 0..4)
 */
export interface BenchSlot {
  slotIndex: number;
  weapon: WeaponInstance | null;
}

/**
 * Placement validation result
 */
export type PlacementValidationCode =
  | 'VALID'
  | 'OUT_OF_BOUNDS'
  | 'FORTRESS_ROW_INVALID'
  | 'NON_FORTRESS_ROW_INVALID'
  | 'CELL_OCCUPIED'
  | 'INVALID_FOOTPRINT';

export interface PlacementValidationResult {
  valid: boolean;
  code: PlacementValidationCode;
  error?: string;
}

/**
 * Interaction and Drag-and-Drop Action Types
 */
export type DragActionType =
  | 'PLACE'
  | 'MERGE'
  | 'SMART_SWAP'
  | 'BENCH_SWAP'
  | 'BOUNCE_BACK';

export interface DragActionResult {
  success: boolean;
  type: DragActionType;
  message?: string;
  mergedWeapon?: WeaponInstance;
  displacedWeapons?: WeaponInstance[];
}

/**
 * Adjacency Bond Contact between two weapon instances
 */
export interface BondContact {
  weaponAId: string;
  weaponBId: string;
  isOrthogonal: boolean; // Cross adjacent (Manhattan == 1)
  isChebyshev: boolean;  // Moore 3x3 adjacent (Chebyshev == 1)
}

/**
 * Faction Resonance Tier Activation
 */
export interface FactionResonance {
  faction: Faction;
  count: number;
  tier: 0 | 2 | 4;
}

/**
 * Enemy Entity Representation for Damage & Status Processing
 */
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
  x?: number;
  y?: number;
  distanceToWall?: number;
  // M4 wave & combat fields
  frontalDr?: number;
  isSuicide?: boolean;
  suicideDamage?: number;
  wallDamage?: number;
  attackInterval?: number;
  lastAttackTime?: number;
  laneIndex?: number;
  isEnraged?: boolean;
  isRanged?: boolean;
  attackRange?: number; // In meters (e.g. 6.0 ~ 8.0m for ranged siege attackers)
  // Elemental & Combat Status effects
  burnStacks?: number;
  isBurning?: boolean;
  freezeStacks?: number;
  frozenTimer?: number;
  isStunned?: boolean;
  stunTimer?: number;
}

/**
 * Elemental Status Mask & Timers on Combat Entities
 */
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

/**
 * Weapon Configuration per Star Level
 */
export interface WeaponStarConfig {
  star: StarLevel;
  baseAtk: number;
  attackInterval: number; // in seconds
  range: number;          // in meters (1m = 68px)
  footprint: GridFootprint;
  cost: number;
  description: string;
  evolutionName?: string;
}

/**
 * Weapon Archetype Static Configuration
 */
export interface WeaponArchetypeConfig {
  id: string;
  name: string;
  faction: Faction;
  isFortressOnly: boolean;
  stars: Record<StarLevel, WeaponStarConfig>;
}

/**
 * Faction Synergy Buff Structure
 */
export interface FactionSynergyBuffs {
  fire: {
    reloadSpeedBonus: number;      // e.g. 0.20
    maxBurnStacks: number;          // 4 or 8
    burstChance: number;            // e.g. 0.20
    explosionDmgMultiplier: number; // 1.0 or 2.0
  };
  mohist: {
    critRateBonus: number;          // e.g. 0.20
    pierceBonus: number;            // 0 or 1
    armorSunderRate: number;        // e.g. 0.05
    multiGridBonus: number;         // e.g. 0.40
  };
  fortress: {
    wallHpBonus: number;            // e.g. 400
    wallReflectBonus: number;       // e.g. 0.50
    wallRepairRate: number;         // e.g. 15
    caltropsThreshold: number;      // e.g. 200
  };
  qimen: {
    dmgBonusPerQimen: number;       // e.g. 0.10
    totalDmgBonus: number;          // count * 0.10
    auraGlobal5x5: boolean;         // false or true
  };
}

/**
 * Damage Calculation Context for 7-Step Pipeline
 */
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

/**
 * Result structure of the 7-Step Damage Pipeline
 */
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

/**
 * Spatial Targeting Strategies
 */
export type TargetingStrategy = 'First' | 'Strongest' | 'ClusterAOE';

export interface TargetingOptions {
  aoeRadius?: number;              // In meters (default: 2.0m)
  wallY?: number;                  // Y coordinate of city wall (default: 540)
  weaponPos?: { x: number; y: number };
}

/**
 * Ballistics & Projectile Specifications
 */
export interface ProjectileConfig {
  speed: number;                   // Speed in meters/sec (e.g. 15)
  isHighArc?: boolean;             // Parabolic trajectory (mortars, catapults)
  arcHeight?: number;              // Peak arc height in pixels/meters
  aoeRadius?: number;              // AOE impact explosion radius in meters
  pierceCount?: number;            // Number of enemies projectile can penetrate
}

export interface ProjectileState {
  id: string;
  attackerId: string;
  targetId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  visualY: number;                 // Y including arc offset for rendering
  targetX: number;
  targetY: number;
  speed: number;
  progress: number;                // 0.0 to 1.0
  travelTime: number;              // Total duration in seconds
  elapsedTime: number;             // Elapsed duration in seconds
  isHighArc: boolean;
  arcHeight: number;
  isHit: boolean;
  damageContext: DamageCalculationContext;
  aoeRadius?: number;
}

export interface ProjectileHitEvent {
  hit: boolean;
  projectile: ProjectileState;
  primaryTarget: EnemyEntity;
  damageResult: DamageResult;
  splashTargets?: EnemyEntity[];
  splashDamageResults?: DamageResult[];
}

/**
 * Commander System Interfaces
 */
export type CommanderId = 'wang_shouren' | 'qin_huali' | 'qin_liangyu' | 'liu_bowen';

export const VALID_COMMANDER_IDS: readonly CommanderId[] = [
  'wang_shouren',
  'qin_huali',
  'qin_liangyu',
  'liu_bowen'
] as const;

export function isValidCommanderId(id: unknown): id is CommanderId {
  return typeof id === 'string' && (VALID_COMMANDER_IDS as readonly string[]).includes(id);
}

export interface CommanderPassiveEffect {
  description: string;
  // Wang Shouren
  fireAtkBonus?: number;
  explosionCdReduction?: number;
  // Qin Huali
  mohistRangeBonus?: number;
  fortressHpBonus?: number;
  // Qin Liangyu
  fortressReflectBonus?: number;
  enemyAtkSpeedReductionNearWall?: number;
  // Liu Bowen
  qimenAuraRangeBonus?: number;
  reactionDmgBonus?: number;
}

export interface CommanderUltimateEffect {
  name: string;
  description: string;
  rageCost: number;                // 100
  duration?: number;               // In seconds (0 for instant)
  damage?: number;
  reloadSpeedBonus?: number;
  resetAllWeaponCooldowns?: boolean;
  firearmsMultiShot?: boolean;
  barrierHp?: number;
  reflectMeleeRatio?: number;
  cavalryCount?: number;
  knockbackDistance?: number;
  lightningStrikes?: number;
  inflictsShock?: boolean;
  targetX?: number;
  targetY?: number;
}

export interface CommanderConfig {
  id: CommanderId | string;
  name: string;
  title: string;
  factionAffinity?: Faction;
  passive: CommanderPassiveEffect;
  ultimate: CommanderUltimateEffect;
}

export interface CommanderState {
  configId: string;
  rage: number;                    // 0..100
  maxRage: number;                 // 100
  isUltimateActive: boolean;
  ultimateRemainingDuration: number;
  barrierHp: number;
}

export interface UltimateCastResult {
  success: boolean;
  reason?: string;
  ultimate?: CommanderUltimateEffect;
  activeDuration?: number;
  resetAllWeaponCooldowns?: boolean;
  reloadSpeedBonus?: number;
  barrierHp?: number;
  reflectMeleeRatio?: number;
  damage?: number;
  cavalryCount?: number;
  knockbackDistance?: number;
  lightningStrikes?: number;
  inflictsShock?: boolean;
  targetX?: number;
  targetY?: number;
}

// ==========================================
// M4: Wave, Enemy, Economy, FTUE & Combat Exports
// ==========================================

export * from './enemy/cc-decay';
export * from './enemy/enemy-entity';
export * from './economy/economy';
export * from './wave/wave-fsm';
export * from './wave/wave-spawner';
export * from './ftue/ftue-manager';
export * from './combat/floating-text';

// ==========================================
// M5: Shop PRNG, Pity Timer & 36 Tactics Exports
// ==========================================

export interface ArmoryCardSlot {
  slotIndex: number;
  weaponConfigId: string;
  faction: Faction;
  quality: 'common' | 'fine' | 'heavy';
  cost: number;
  isPityCompensation: boolean;
  isPurchased?: boolean;
}

export interface TacticCard {
  id: string;
  name: string;
  quality: 'blue' | 'purple' | 'gold' | 'red_gold';
  category: 'general' | 'fire' | 'mohist' | 'fortress' | 'fusion';
  maxPicksPerRun: 1 | 2;
  currentPicks: number;
  prerequisites?: {
    unitA: { configId: string; star: number };
    unitB: { configId: string; star: number };
  };
}

export { BASE_SHOP_REFRESH_COST } from './economy/economy';
export * from '../config/shop.config';
export * from '../config/tactics.config';
export * from './shop/pity-timer';
export * from './shop/shop-manager';
export * from './tactics/smart-weight';
export * from './tactics/fusion-unlock';
export * from './tactics/tactics-deck';
export * from './tactics/affix-mount';




