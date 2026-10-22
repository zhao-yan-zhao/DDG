/**
 * 《孤城神机营》- Weapon Instance Entity & Runtime State
 * Headless weapon instance factory and runtime mutations.
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import {
  GridPosition,
  StarLevel,
  WeaponInstance,
  WeaponArchetypeConfig,
  WeaponStarConfig
} from '../types';
import {
  getWeaponConfig,
  getWeaponStarConfig,
  resolveConfigId
} from '../../config/weapons.config';

let instanceCounter = 0;

/**
 * Creates a unique identifier for weapon instances
 */
export function generateWeaponId(configId: string): string {
  instanceCounter++;
  return `w_${configId}_${Date.now()}_${instanceCounter}`;
}

/**
 * Factory function to create a fully configured WeaponInstance entity.
 * Resolves static configuration, star-level attributes, footprint, and anchor.
 */
export function createWeaponInstance(
  configId: string,
  star: StarLevel = 1,
  anchor: GridPosition = { row: 0, col: 0 },
  id?: string
): WeaponInstance {
  const canonicalId = resolveConfigId(configId);
  const archetype: WeaponArchetypeConfig | undefined = getWeaponConfig(canonicalId);

  if (!archetype) {
    throw new Error(`[WeaponInstance] Unknown weapon configId: "${configId}"`);
  }

  const starConfig: WeaponStarConfig | undefined = getWeaponStarConfig(canonicalId, star);
  if (!starConfig) {
    throw new Error(`[WeaponInstance] Invalid star ${star} for configId: "${configId}"`);
  }

  return {
    id: id || generateWeaponId(canonicalId),
    configId: canonicalId,
    name: archetype.name,
    star,
    faction: archetype.faction,
    footprint: { ...starConfig.footprint },
    anchor: { ...anchor },
    isFortressOnly: archetype.isFortressOnly,
    baseAtk: starConfig.baseAtk,
    attackInterval: starConfig.attackInterval,
    range: starConfig.range
  };
}

/**
 * Mutates/upgrades an existing weapon instance to the next star level,
 * loading updated attributes from configuration matrix.
 */
export function upgradeWeaponInstance(weapon: WeaponInstance): WeaponInstance {
  if (weapon.star >= 4) {
    throw new Error(`[WeaponInstance] Weapon "${weapon.id}" is already at max star level (★4)`);
  }

  const nextStar = (weapon.star + 1) as StarLevel;
  const starConfig = getWeaponStarConfig(weapon.configId, nextStar);

  if (!starConfig) {
    throw new Error(`[WeaponInstance] Missing config for ${weapon.configId} at star ${nextStar}`);
  }

  return {
    ...weapon,
    star: nextStar,
    baseAtk: starConfig.baseAtk,
    attackInterval: starConfig.attackInterval,
    range: starConfig.range,
    footprint: { ...starConfig.footprint }
  };
}

/**
 * Runtime state wrapper for tracking attack timers, cooldowns, and status modifications.
 */
export class WeaponRuntimeState {
  public weapon: WeaponInstance;
  public cooldownRemaining: number;
  public totalAttacks: number = 0;
  public lastAttackTimestamp: number = 0;

  constructor(weapon: WeaponInstance) {
    this.weapon = weapon;
    this.cooldownRemaining = 0;
  }

  /**
   * Checks whether the weapon is ready to attack
   */
  public isReady(): boolean {
    return this.cooldownRemaining <= 0;
  }

  /**
   * Advances cooldown timer by deltaTime (seconds)
   */
  public tick(deltaTime: number): void {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaTime);
    }
  }

  /**
   * Resets cooldown timer after firing an attack, considering optional reload speed modifier
   */
  public triggerAttack(timestamp: number = 0, reloadSpeedMultiplier: number = 1.0): void {
    const effectiveInterval = Math.max(0.1, this.weapon.attackInterval / reloadSpeedMultiplier);
    this.cooldownRemaining = effectiveInterval;
    this.lastAttackTimestamp = timestamp;
    this.totalAttacks++;
  }

  /**
   * Manually sets cooldown remaining
   */
  public setCooldown(seconds: number): void {
    this.cooldownRemaining = Math.max(0, seconds);
  }
}
