/**
 * 《孤城神机营》- Elemental State & Target Tracking
 * Status interface, lifecycle management, application, decay, and clearing.
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { ElementalStatus } from '../types';

/**
 * Creates an initial clean elemental status container.
 */
export function createElementalStatus(): ElementalStatus {
  return {
    hasOil: false,
    burnStacks: 0,
    hasShock: false,
    isFrozen: false,
    hasPoison: false,
    lastExplosionTime: undefined,
    lastIceShatterTime: undefined,
    thunderStrikeCountOnBoss: 0,
    poisonFireDurationRemaining: 0
  };
}

/**
 * Applies oil to target status.
 */
export function applyOil(status: ElementalStatus): void {
  status.hasOil = true;
}

/**
 * Clears oil from target status.
 */
export function clearOil(status: ElementalStatus): void {
  status.hasOil = false;
}

/**
 * Applies burn stacks up to maxStacks (default 4, or 8 with Fire 2-piece resonance).
 */
export function applyBurn(
  status: ElementalStatus,
  stacks: number = 1,
  maxStacks: number = 4
): number {
  status.burnStacks = Math.min(status.burnStacks + stacks, maxStacks);
  return status.burnStacks;
}

/**
 * Clears burn stacks from target status.
 */
export function clearBurn(status: ElementalStatus): void {
  status.burnStacks = 0;
}

/**
 * Applies shock status to target.
 */
export function applyShock(status: ElementalStatus): void {
  status.hasShock = true;
}

/**
 * Clears shock status from target.
 */
export function clearShock(status: ElementalStatus): void {
  status.hasShock = false;
}

/**
 * Applies frozen status to target.
 */
export function applyFreeze(status: ElementalStatus): void {
  status.isFrozen = true;
}

/**
 * Clears frozen status from target.
 */
export function clearFreeze(status: ElementalStatus): void {
  status.isFrozen = false;
}

/**
 * Applies poison status to target.
 */
export function applyPoison(status: ElementalStatus): void {
  status.hasPoison = true;
}

/**
 * Clears poison status from target.
 */
export function clearPoison(status: ElementalStatus): void {
  status.hasPoison = false;
}

/**
 * Clears all elemental statuses from target.
 */
export function clearAllStatus(status: ElementalStatus): void {
  status.hasOil = false;
  status.burnStacks = 0;
  status.hasShock = false;
  status.isFrozen = false;
  status.hasPoison = false;
  status.poisonFireDurationRemaining = 0;
}

/**
 * Decays time-based statuses (e.g. poison fire duration) by deltaTime (seconds).
 */
export function decayStatus(status: ElementalStatus, dt: number): void {
  if (status.poisonFireDurationRemaining && status.poisonFireDurationRemaining > 0) {
    status.poisonFireDurationRemaining = Math.max(0, status.poisonFireDurationRemaining - dt);
  }
}

/**
 * Elemental State Manager for entity tracking
 */
export class ElementStateManager {
  private statuses: Map<string, ElementalStatus> = new Map();

  public getOrCreateStatus(entityId: string): ElementalStatus {
    let s = this.statuses.get(entityId);
    if (!s) {
      s = createElementalStatus();
      this.statuses.set(entityId, s);
    }
    return s;
  }

  public getStatus(entityId: string): ElementalStatus | undefined {
    return this.statuses.get(entityId);
  }

  public removeEntity(entityId: string): boolean {
    return this.statuses.delete(entityId);
  }

  public tick(dt: number): void {
    for (const status of this.statuses.values()) {
      decayStatus(status, dt);
    }
  }

  public clear(): void {
    this.statuses.clear();
  }
}
