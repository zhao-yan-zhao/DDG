/**
 * 《孤城神机营》- Weapon Manager
 * Lifecycle, runtime state registry, cooldown timers, and upgrade management.
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { Faction, GridPosition, WeaponInstance } from '../types';
import { WeaponRuntimeState, upgradeWeaponInstance } from './weapon-instance';

export class WeaponManager {
  private weapons: Map<string, WeaponInstance> = new Map();
  private runtimeStates: Map<string, WeaponRuntimeState> = new Map();

  /**
   * Registers a weapon instance into the manager
   */
  public registerWeapon(weapon: WeaponInstance): void {
    this.weapons.set(weapon.id, weapon);
    this.runtimeStates.set(weapon.id, new WeaponRuntimeState(weapon));
  }

  /**
   * Unregisters/removes a weapon instance by ID
   */
  public unregisterWeapon(id: string): boolean {
    this.runtimeStates.delete(id);
    return this.weapons.delete(id);
  }

  /**
   * Gets a weapon instance by ID
   */
  public getWeapon(id: string): WeaponInstance | undefined {
    return this.weapons.get(id);
  }

  /**
   * Gets the runtime state for a weapon instance
   */
  public getRuntimeState(id: string): WeaponRuntimeState | undefined {
    return this.runtimeStates.get(id);
  }

  /**
   * Returns all registered weapon instances
   */
  public getAllWeapons(): WeaponInstance[] {
    return Array.from(this.weapons.values());
  }

  /**
   * Returns all weapons belonging to a specific faction
   */
  public getWeaponsByFaction(faction: Faction): WeaponInstance[] {
    return this.getAllWeapons().filter(w => w.faction === faction);
  }

  /**
   * Upgrades a weapon instance in-place, updating its attributes and runtime state
   */
  public upgradeWeapon(id: string): WeaponInstance {
    const existing = this.weapons.get(id);
    if (!existing) {
      throw new Error(`[WeaponManager] Weapon with id "${id}" not found`);
    }

    const upgraded = upgradeWeaponInstance(existing);
    this.weapons.set(id, upgraded);

    const runtime = this.runtimeStates.get(id);
    if (runtime) {
      runtime.weapon = upgraded;
    } else {
      this.runtimeStates.set(id, new WeaponRuntimeState(upgraded));
    }

    return upgraded;
  }

  /**
   * Advances cooldowns for all registered weapons by deltaTime (in seconds)
   */
  public tick(deltaTime: number): void {
    for (const runtime of this.runtimeStates.values()) {
      runtime.tick(deltaTime);
    }
  }

  /**
   * Returns weapons that are currently ready to attack
   */
  public getReadyWeapons(): WeaponInstance[] {
    const ready: WeaponInstance[] = [];
    for (const runtime of this.runtimeStates.values()) {
      if (runtime.isReady()) {
        ready.push(runtime.weapon);
      }
    }
    return ready;
  }

  /**
   * Clears all registered weapons
   */
  public clear(): void {
    this.weapons.clear();
    this.runtimeStates.clear();
  }
}
