/**
 * 《孤城神机营》- Enemy Archetypes and Runtime Entity System
 * Implements GDD V3.0 §8.1 & §8.2:
 * - 4 core archetypes: Ordinary (light_infantry), Charging (war_dog), Heavy (shield_guard), Boss (boss_bear)
 * - Additional archetypes: bomb_carrier, iron_pagoda, light_cavalry
 * - Coordinate standards: Spawn Y = 1240px, Wall Y = 540px, 1.0m = 68px, 5 lanes
 * - Status effect integration (freeze, paralyze, slow, enrage) and wall impact
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { EnemyEntity } from '../types';
export type { EnemyEntity };
import { EnemyBehaviorTree, EnemyBehaviorContext } from '../behavior/enemy-behavior';

export type EnemyArchetype = 'ordinary' | 'charging' | 'heavy' | 'boss';

export const PIXELS_PER_METER = 68;
export const DEFAULT_WALL_Y = 720;
export const DEFAULT_SPAWN_Y = 1120;

export const LANE_X_COORDINATES = [223, 299, 375, 451, 527] as const;

export interface EnemyArchetypeDefinition {
  typeId: string;
  name: string;
  archetype: EnemyArchetype;
  isBoss: boolean;
  baseHp: number;
  armor: number;
  shield: number;
  moveSpeed: number; // m/s
  wallDamage: number;
  attackInterval: number; // s
  frontalDr?: number;     // e.g. 0.40 for shield_guard
  isSuicide?: boolean;    // e.g. true for bomb_carrier
  suicideDamage?: number; // e.g. 150 for bomb_carrier
  isRanged?: boolean;     // e.g. true for ranged siege units
  attackRange?: number;   // attack range in meters (e.g. 5.0m for bowman)
}

export const ENEMY_ARCHETYPES: Record<string, EnemyArchetypeDefinition> = {
  light_infantry: {
    typeId: 'light_infantry',
    name: '流寇轻步兵',
    archetype: 'ordinary',
    isBoss: false,
    baseHp: 50,
    armor: 0,
    shield: 0,
    moveSpeed: 0.75,
    wallDamage: 10,
    attackInterval: 1.0
  },
  war_dog: {
    typeId: 'war_dog',
    name: '狂暴战犬',
    archetype: 'charging',
    isBoss: false,
    baseHp: 41,
    armor: 0,
    shield: 0,
    moveSpeed: 1.6,
    wallDamage: 15,
    attackInterval: 0.8
  },
  shield_guard: {
    typeId: 'shield_guard',
    name: '玄甲刀盾兵',
    archetype: 'heavy',
    isBoss: false,
    baseHp: 266,
    armor: 100,
    shield: 0,
    moveSpeed: 0.5,
    wallDamage: 25,
    attackInterval: 1.5,
    frontalDr: 0.40
  },
  boss_bear: {
    typeId: 'boss_bear',
    name: '黑风寨主·铁塔熊王',
    archetype: 'boss',
    isBoss: true,
    baseHp: 135000,
    armor: 150,
    shield: 0,
    moveSpeed: 0.45,
    wallDamage: 50,
    attackInterval: 2.0
  },
  bomb_carrier: {
    typeId: 'bomb_carrier',
    name: '背篓火药死士',
    archetype: 'charging',
    isBoss: false,
    baseHp: 60,
    armor: 0,
    shield: 0,
    moveSpeed: 1.3,
    wallDamage: 150,
    attackInterval: 0.5,
    isSuicide: true,
    suicideDamage: 150
  },
  iron_pagoda: {
    typeId: 'iron_pagoda',
    name: '铁浮屠重骑',
    archetype: 'heavy',
    isBoss: false,
    baseHp: 2160,
    armor: 150,
    shield: 0,
    moveSpeed: 0.8,
    wallDamage: 35,
    attackInterval: 1.5,
    frontalDr: 0.60
  },
  light_cavalry: {
    typeId: 'light_cavalry',
    name: '轻装游骑兵',
    archetype: 'charging',
    isBoss: false,
    baseHp: 175,
    armor: 40,
    shield: 0,
    moveSpeed: 1.4,
    wallDamage: 20,
    attackInterval: 1.0
  },
  ranged_bowman: {
    typeId: 'ranged_bowman',
    name: '黑山投矛手',
    archetype: 'ordinary',
    isBoss: false,
    baseHp: 70,
    armor: 0,
    shield: 0,
    moveSpeed: 0.65,
    wallDamage: 12,
    attackInterval: 1.5,
    isRanged: true,
    attackRange: 5.0
  },
  siege_ballista: {
    typeId: 'siege_ballista',
    name: '攻城弩车',
    archetype: 'heavy',
    isBoss: false,
    baseHp: 380,
    armor: 60,
    shield: 0,
    moveSpeed: 0.4,
    wallDamage: 30,
    attackInterval: 2.0,
    isRanged: true,
    attackRange: 7.0
  },
  siege_ram: {
    typeId: 'siege_ram',
    name: '攻城木冲车',
    archetype: 'heavy',
    isBoss: false,
    baseHp: 6850,
    armor: 100,
    shield: 0,
    moveSpeed: 0.25,
    wallDamage: 150,
    attackInterval: 3.0,
    frontalDr: 0.50
  },
  boss_xuanwu: {
    typeId: 'boss_xuanwu',
    name: '机关楼船·玄武巨舰',
    archetype: 'boss',
    isBoss: true,
    baseHp: 364000,
    armor: 200,
    shield: 0,
    moveSpeed: 0.35,
    wallDamage: 80,
    attackInterval: 2.5
  },
  boss_khan: {
    typeId: 'boss_khan',
    name: '漠北狼主·金帐可汗',
    archetype: 'boss',
    isBoss: true,
    baseHp: 1080000,
    armor: 180,
    shield: 0,
    moveSpeed: 1.0,
    wallDamage: 60,
    attackInterval: 1.5
  },
  boss_corpse_demon: {
    typeId: 'boss_corpse_demon',
    name: '五毒教主·万蛊尸魔',
    archetype: 'boss',
    isBoss: true,
    baseHp: 2970000,
    armor: 120,
    shield: 0,
    moveSpeed: 0.4,
    wallDamage: 70,
    attackInterval: 2.0
  },
  boss_taotie: {
    typeId: 'boss_taotie',
    name: '魔化巨兽·饕餮攻城机',
    archetype: 'boss',
    isBoss: true,
    baseHp: 8800000,
    armor: 300,
    shield: 0,
    moveSpeed: 0.28,
    wallDamage: 120,
    attackInterval: 3.0
  }
};

let enemyCounter = 1;

export class EnemyFactory {
  public static create(
    typeId: string,
    overrides?: Partial<EnemyEntity> & { hpMultiplier?: number; laneIndex?: number }
  ): EnemyEntity {
    const proto = ENEMY_ARCHETYPES[typeId] || ENEMY_ARCHETYPES.light_infantry;
    const hpMultiplier = overrides?.hpMultiplier ?? 1.0;
    const calculatedHp = Math.round(proto.baseHp * hpMultiplier);

    const laneIndex = overrides?.laneIndex !== undefined
      ? Math.max(0, Math.min(4, overrides.laneIndex))
      : 2;

    const xCoord = overrides?.x ?? LANE_X_COORDINATES[laneIndex];
    const yCoord = overrides?.y ?? DEFAULT_SPAWN_Y;
    const distanceToWall = overrides?.distanceToWall ?? (yCoord - DEFAULT_WALL_Y) / PIXELS_PER_METER;

    const id = overrides?.id ?? `enemy_${typeId}_${enemyCounter++}`;

    const entity: EnemyEntity = {
      id,
      typeId: proto.typeId,
      name: proto.name,
      isBoss: proto.isBoss,
      maxHp: calculatedHp,
      currentHp: calculatedHp,
      armor: proto.armor,
      shield: proto.shield,
      moveSpeed: proto.moveSpeed,
      isParalyzed: false,
      isFrozen: false,
      isTenacious: false,
      tenacityTimer: undefined,
      ccCount: 0,
      x: xCoord,
      y: yCoord,
      distanceToWall: Math.max(0, distanceToWall),
      frontalDr: proto.frontalDr,
      isSuicide: proto.isSuicide,
      suicideDamage: proto.suicideDamage,
      isRanged: proto.isRanged,
      attackRange: proto.attackRange,
      wallDamage: proto.wallDamage,
      attackInterval: proto.attackInterval,
      lastAttackTime: undefined,
      laneIndex,
      isEnraged: false,
      ...overrides
    };

    // Ensure HP consistency if caller specified maxHp or currentHp
    if (overrides?.maxHp !== undefined && overrides?.currentHp === undefined) {
      entity.currentHp = overrides.maxHp;
    }

    return entity;
  }

  public static createOrdinary(overrides?: Partial<EnemyEntity>): EnemyEntity {
    return this.create('light_infantry', overrides);
  }

  public static createCharging(overrides?: Partial<EnemyEntity>): EnemyEntity {
    return this.create('war_dog', overrides);
  }

  public static createHeavy(overrides?: Partial<EnemyEntity>): EnemyEntity {
    return this.create('shield_guard', overrides);
  }

  public static createBoss(overrides?: Partial<EnemyEntity>): EnemyEntity {
    return this.create('boss_bear', overrides);
  }

  public static createRanged(overrides?: Partial<EnemyEntity>): EnemyEntity {
    return this.create('ranged_bowman', overrides);
  }

  public static createSiegeRam(overrides?: Partial<EnemyEntity>): EnemyEntity {
    return this.create('siege_ram', overrides);
  }
}

/**
 * Global factory helper function
 */
export function createEnemyEntity(
  typeId: string,
  overrides?: Partial<EnemyEntity> & { hpMultiplier?: number; laneIndex?: number }
): EnemyEntity {
  return EnemyFactory.create(typeId, overrides);
}

let defaultEnemyBT: EnemyBehaviorTree | null = null;
function getEnemyBT(): EnemyBehaviorTree {
  if (!defaultEnemyBT) {
    defaultEnemyBT = new EnemyBehaviorTree();
  }
  return defaultEnemyBT;
}

export class EnemyEntityLogic {
  /**
   * Updates enemy position toward the wall and resolves wall contact / attack actions
   * driven by the multi-tiered EnemyBehaviorTree AI framework.
   */
  public static updateMovement(
    enemy: EnemyEntity,
    dt: number,
    currentTime: number,
    wallY: number = DEFAULT_WALL_Y,
    frontlineStopYByLane?: number[]
  ): {
    reachedWall: boolean;
    dealtWallDamage: number;
    isSuicide: boolean;
    isEnragedTriggered?: boolean;
    hasRangedFired?: boolean;
  } {
    const ctx: EnemyBehaviorContext = {
      enemy,
      dt,
      currentTime,
      wallY,
      frontlineStopYByLane,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false
    };

    getEnemyBT().tick(ctx);

    return {
      reachedWall: ctx.reachedWall,
      dealtWallDamage: ctx.dealtWallDamage,
      isSuicide: ctx.isSuicide,
      isEnragedTriggered: ctx.isEnragedTriggered,
      hasRangedFired: ctx.hasRangedFired
    };
  }

  /**
   * Applies damage to an enemy entity, handling frontal DR, shields, and Boss enrage.
   */
  public static applyDamage(
    enemy: EnemyEntity,
    rawAmount: number,
    isFrontalPhysical: boolean = false
  ): {
    actualDeducted: number;
    isDead: boolean;
    isEnragedTriggered: boolean;
  } {
    if (enemy.currentHp <= 0 || rawAmount <= 0) {
      return { actualDeducted: 0, isDead: enemy.currentHp <= 0, isEnragedTriggered: false };
    }

    let damage = rawAmount;
    if (isFrontalPhysical && enemy.frontalDr) {
      damage = damage * (1 - enemy.frontalDr);
    }

    let actualDeducted = 0;

    // Shield absorption
    if (enemy.shield > 0) {
      const shieldAbsorb = Math.min(enemy.shield, damage);
      enemy.shield -= shieldAbsorb;
      damage -= shieldAbsorb;
    }

    if (damage > 0) {
      actualDeducted = Math.min(enemy.currentHp, damage);
      enemy.currentHp -= actualDeducted;
    }

    let isEnragedTriggered = false;
    // Boss Enrage threshold check (<= 50% HP)
    if (enemy.isBoss && !enemy.isEnraged && enemy.currentHp <= enemy.maxHp * 0.50) {
      enemy.isEnraged = true;
      enemy.moveSpeed = enemy.moveSpeed * 1.80; // e.g. 0.7 -> 1.26 m/s
      isEnragedTriggered = true;
    }

    return {
      actualDeducted,
      isDead: enemy.currentHp <= 0,
      isEnragedTriggered
    };
  }
}
