/**
 * 《孤城神机营》- Wave Enemy Spawner and Horde Timeline System
 * Implements GDD V3.0 §9.2 & §16.3:
 * - Timeline wave configurations (timeOffset, enemyId, count, spawnInterval, xDistribution)
 * - Multi-lane coordinate dispersion and spatial distribution
 * - Active enemy registry (Map<string, EnemyEntity>), dead collection, silver drop events
 * - Wave completion detection (all batches exhausted AND zero active enemies)
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { EnemyEntity } from '../types';
import {
  EnemyFactory,
  EnemyEntityLogic,
  DEFAULT_WALL_Y,
  DEFAULT_SPAWN_Y,
  LANE_X_COORDINATES
} from '../enemy/enemy-entity';
import { AffixEngine, AffixExplosionEvent } from '../endless/affix-engine';

export type XDistribution = 'RandomFull' | 'LeftWing' | 'RightWing' | 'CenterValley';

export interface WaveBatchItem {
  timeOffset: number;         // Delay in seconds from wave start
  enemyId: string;            // Enemy archetype or typeId
  count: number;              // Total number of units to spawn
  spawnInterval: number;      // Seconds between consecutive spawns
  xDistribution: XDistribution;
  laneIndex?: number;         // Explicit lane 0..4 (overrides distribution)
  hpMultiplier?: number;      // Scaling factor
  affixIds?: string[];        // Optional elite affixes (e.g. swift, stone_skin)
}

export interface WaveConfig {
  chapterId: number;
  waveIndex: number;
  duration: number;
  baseSalary: number;
  batches: WaveBatchItem[];
  specialDrop?: {
    triggerEnemyId: string;
    itemType: 'Hammer' | 'TigerToken' | 'BluePrint';
  };
}

interface BatchRuntimeState {
  item: WaveBatchItem;
  spawnedCount: number;
  nextSpawnTime: number;
}

export class WaveSpawner {
  private activeEnemies: Map<string, EnemyEntity> = new Map();
  private deadEnemies: EnemyEntity[] = [];
  private currentConfig: WaveConfig | null = null;
  private currentTime: number = 0;
  private totalSpawned: number = 0;
  private totalKilled: number = 0;
  private batchStates: BatchRuntimeState[] = [];

  // Callbacks
  public onEnemySpawn?: (enemy: EnemyEntity) => void;
  public onEnemyDeath?: (enemy: EnemyEntity, dropSilver: number) => void;
  public onWallDamage?: (damage: number, enemy?: EnemyEntity) => void;
  public onBossEnrage?: (boss: EnemyEntity) => void;
  public onAffixExplosion?: (event: AffixExplosionEvent) => void;

  constructor() {}

  /**
   * Initializes and starts a new wave based on timeline configuration.
   */
  public startWave(config: WaveConfig): void {
    this.currentConfig = config;
    this.currentTime = 0;
    this.totalSpawned = 0;
    this.totalKilled = 0;
    this.activeEnemies.clear();
    this.deadEnemies = [];

    this.batchStates = config.batches.map(batch => ({
      item: batch,
      spawnedCount: 0,
      nextSpawnTime: Math.max(0, batch.timeOffset)
    }));
  }

  /**
   * Advances wave timeline by dt seconds, spawning batches and moving enemies.
   */
  public update(dt: number, wallY: number = DEFAULT_WALL_Y, frontlineStopYByLane?: number[]): {
    wallDamageDealt: number;
    spawnedEnemies: EnemyEntity[];
    killedEnemies: EnemyEntity[];
  } {
    if (!this.currentConfig) {
      return { wallDamageDealt: 0, spawnedEnemies: [], killedEnemies: [] };
    }

    this.currentTime += dt;
    const spawnedThisTick: EnemyEntity[] = [];
    const killedThisTick: EnemyEntity[] = [];
    let wallDamageDealt = 0;

    // 1. Spawning Pass
    for (const batch of this.batchStates) {
      while (
        batch.spawnedCount < batch.item.count &&
        this.currentTime >= batch.nextSpawnTime
      ) {
        const xCoord = this.computeSpawnX(batch.item.xDistribution, batch.item.laneIndex, batch.spawnedCount);
        const laneIndex = batch.item.laneIndex ?? this.findNearestLane(xCoord);

        const enemy = EnemyFactory.create(batch.item.enemyId, {
          hpMultiplier: batch.item.hpMultiplier,
          laneIndex,
          x: xCoord,
          y: DEFAULT_SPAWN_Y
        });

        if (batch.item.affixIds && batch.item.affixIds.length > 0) {
          AffixEngine.applyAffixes(enemy, batch.item.affixIds as any);
        }

        this.activeEnemies.set(enemy.id, enemy);
        this.totalSpawned++;
        batch.spawnedCount++;
        batch.nextSpawnTime += batch.item.spawnInterval;

        spawnedThisTick.push(enemy);
        this.onEnemySpawn?.(enemy);
      }
    }

    // 2. Movement, Wall Attack & Affix Ticks Pass
    for (const enemy of Array.from(this.activeEnemies.values())) {
      AffixEngine.tick(enemy, dt);
      const moveResult = EnemyEntityLogic.updateMovement(enemy, dt, this.currentTime, wallY, frontlineStopYByLane);

      if (moveResult.dealtWallDamage > 0) {
        wallDamageDealt += moveResult.dealtWallDamage;
        this.onWallDamage?.(moveResult.dealtWallDamage, enemy);
      }
    }

    // 3. Tombstone & Death Collection Pass
    for (const enemy of Array.from(this.activeEnemies.values())) {
      if (enemy.currentHp <= 0) {
        this.activeEnemies.delete(enemy.id);
        this.deadEnemies.push(enemy);
        this.totalKilled++;

        const explosion = AffixEngine.onEnemyDeath(enemy);
        if (explosion) {
          this.onAffixExplosion?.(explosion);
        }

        const drop = this.calculateSilverDrop(enemy);
        killedThisTick.push(enemy);
        this.onEnemyDeath?.(enemy, drop);
      }
    }

    return {
      wallDamageDealt,
      spawnedEnemies: spawnedThisTick,
      killedEnemies: killedThisTick
    };
  }

  /**
   * Checks whether all batches in the timeline have finished spawning.
   */
  public isAllSpawned(): boolean {
    if (!this.currentConfig) {
      return true;
    }
    return this.batchStates.every(b => b.spawnedCount >= b.item.count);
  }

  /**
   * Returns true when all batches have spawned and all active enemies are dead.
   */
  public isWaveCompleted(): boolean {
    if (!this.currentConfig) {
      return true;
    }
    return this.isAllSpawned() && this.activeEnemies.size === 0;
  }

  /**
   * Manually records a kill for an enemy (e.g. from direct combat pipeline).
   */
  public recordKill(enemyId: string): boolean {
    const enemy = this.activeEnemies.get(enemyId);
    if (!enemy) {
      return false;
    }

    enemy.currentHp = 0;
    this.activeEnemies.delete(enemyId);
    this.deadEnemies.push(enemy);
    this.totalKilled++;

    const drop = this.calculateSilverDrop(enemy);
    this.onEnemyDeath?.(enemy, drop);
    return true;
  }

  public getActiveEnemies(): EnemyEntity[] {
    return Array.from(this.activeEnemies.values());
  }

  public getActiveEnemyCount(): number {
    return this.activeEnemies.size;
  }

  public getTotalSpawned(): number {
    return this.totalSpawned;
  }

  public getTotalKilled(): number {
    return this.totalKilled;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public reset(): void {
    this.activeEnemies.clear();
    this.deadEnemies = [];
    this.currentConfig = null;
    this.currentTime = 0;
    this.totalSpawned = 0;
    this.totalKilled = 0;
    this.batchStates = [];
  }

  /**
   * Injects an already created enemy directly into active tracking (e.g. Boss summons).
   */
  public injectEnemy(enemy: EnemyEntity): void {
    this.activeEnemies.set(enemy.id, enemy);
    this.totalSpawned++;
  }

  /**
   * Calculates X spawn position according to distribution and lane configuration.
   */
  private computeSpawnX(distribution: XDistribution, laneIndex?: number, indexOffset: number = 0): number {
    if (laneIndex !== undefined && laneIndex >= 0 && laneIndex < LANE_X_COORDINATES.length) {
      return LANE_X_COORDINATES[laneIndex];
    }

    switch (distribution) {
      case 'LeftWing':
        return 180 + (indexOffset % 3) * 60; // 180, 240, 300
      case 'RightWing':
        return 450 + (indexOffset % 3) * 60; // 450, 510, 570
      case 'CenterValley':
        return 315 + (indexOffset % 3) * 60; // 315, 375, 435
      case 'RandomFull':
      default: {
        const lane = indexOffset % LANE_X_COORDINATES.length;
        return LANE_X_COORDINATES[lane];
      }
    }
  }

  private findNearestLane(x: number): number {
    let nearestIndex = 2;
    let minDiff = Infinity;
    for (let i = 0; i < LANE_X_COORDINATES.length; i++) {
      const diff = Math.abs(x - LANE_X_COORDINATES[i]);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  }

  private calculateSilverDrop(enemy: EnemyEntity): number {
    if (enemy.isBoss) {
      return 25;
    }
    if (enemy.typeId === 'iron_pagoda' || enemy.typeId === 'siege_ram' || enemy.typeId === 'bomb_carrier') {
      return 5;
    }
    if (enemy.typeId === 'shield_guard') {
      return 3;
    }
    if (enemy.typeId === 'war_dog' || enemy.typeId === 'light_cavalry' || enemy.typeId === 'ranged_bowman') {
      return 2;
    }
    return 1;
  }
}

/**
 * Generates preset Chapter 1 wave configurations (Waves 1 to 10+, up to 15).
 */
export function createChapter1WaveConfig(waveIndex: number): WaveConfig {
  const stipends: Record<number, number> = {
    1: 45, 2: 50, 3: 58, 4: 65, 5: 75,
    6: 85, 7: 95, 8: 105, 9: 120, 10: 150
  };
  const baseSalary = waveIndex >= 10 ? 150 : (stipends[waveIndex] || 45);

  const batches: WaveBatchItem[] = [];

  switch (waveIndex) {
    case 1:
      batches.push({
        timeOffset: 0,
        enemyId: 'light_infantry',
        count: 12,
        spawnInterval: 1.2,
        xDistribution: 'CenterValley'
      });
      return { chapterId: 1, waveIndex: 1, duration: 18, baseSalary, batches };

    case 2:
      batches.push(
        { timeOffset: 0, enemyId: 'light_infantry', count: 18, spawnInterval: 0.8, xDistribution: 'RandomFull' },
        { timeOffset: 8, enemyId: 'war_dog', count: 6, spawnInterval: 1.0, xDistribution: 'LeftWing' }
      );
      return { chapterId: 1, waveIndex: 2, duration: 22, baseSalary, batches };

    case 3:
      batches.push(
        { timeOffset: 0, enemyId: 'shield_guard', count: 8, spawnInterval: 1.5, xDistribution: 'CenterValley' },
        { timeOffset: 4, enemyId: 'light_infantry', count: 20, spawnInterval: 0.6, xDistribution: 'RandomFull' }
      );
      return { chapterId: 1, waveIndex: 3, duration: 25, baseSalary, batches };

    case 4:
      batches.push(
        { timeOffset: 0, enemyId: 'ranged_bowman', count: 12, spawnInterval: 1.2, xDistribution: 'CenterValley' },
        { timeOffset: 6, enemyId: 'war_dog', count: 16, spawnInterval: 0.6, xDistribution: 'RandomFull' }
      );
      return { chapterId: 1, waveIndex: 4, duration: 28, baseSalary, batches };

    case 5:
      batches.push(
        { timeOffset: 0, enemyId: 'iron_pagoda', count: 2, spawnInterval: 4.0, xDistribution: 'CenterValley' },
        { timeOffset: 2, enemyId: 'light_infantry', count: 24, spawnInterval: 0.5, xDistribution: 'RandomFull' },
        { timeOffset: 8, enemyId: 'bomb_carrier', count: 6, spawnInterval: 1.5, xDistribution: 'CenterValley' }
      );
      return { chapterId: 1, waveIndex: 5, duration: 30, baseSalary, batches };

    case 10:
      batches.push(
        { timeOffset: 0, enemyId: 'boss_bear', count: 1, spawnInterval: 1.0, xDistribution: 'CenterValley', laneIndex: 2 },
        { timeOffset: 5, enemyId: 'shield_guard', count: 40, spawnInterval: 0.6, xDistribution: 'RandomFull' },
        { timeOffset: 10, enemyId: 'light_infantry', count: 30, spawnInterval: 0.4, xDistribution: 'RandomFull' }
      );
      return { chapterId: 1, waveIndex: 10, duration: 60, baseSalary, batches };

    default: {
      const scale = 1.0 + Math.max(0, waveIndex - 10) * 0.20;
      batches.push(
        { timeOffset: 0, enemyId: 'shield_guard', count: 20, spawnInterval: 0.8, xDistribution: 'RandomFull', hpMultiplier: scale },
        { timeOffset: 3, enemyId: 'war_dog', count: 25, spawnInterval: 0.5, xDistribution: 'RandomFull', hpMultiplier: scale },
        { timeOffset: 6, enemyId: 'light_infantry', count: 50, spawnInterval: 0.3, xDistribution: 'RandomFull', hpMultiplier: scale }
      );
      return { chapterId: 1, waveIndex, duration: 35, baseSalary, batches };
    }
  }
}
