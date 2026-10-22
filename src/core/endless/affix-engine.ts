/**
 * 《孤城神机营》- Enemy Elite Affix Engine
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 * Implements GDD V3.0 §11.3:
 * - 6 Core Affixes: Swift, Stone Skin, Enraged, Throes Explode, Regeneration, Shielded
 * - Handles on-spawn mutation, per-tick lifecycle, and on-death explosion events.
 */

import { EnemyEntity } from '../types';
import { EnemyAffixId, ENEMY_AFFIX_REGISTRY, EnemyAffix } from './types';

export interface AffixExplosionEvent {
  x: number;
  y: number;
  radius: number;
  damage: number;
}

export class AffixEngine {
  /**
   * Applies one or more affixes to an enemy upon spawn.
   */
  public static applyAffixes(enemy: EnemyEntity, affixIds: EnemyAffixId[]): void {
    if (!affixIds || affixIds.length === 0) return;

    // Attach affixes list to entity
    (enemy as any).affixIds = [...affixIds];

    for (const affixId of affixIds) {
      switch (affixId) {
        case 'swift':
          // +30% movement speed
          enemy.moveSpeed = Number((enemy.moveSpeed * 1.30).toFixed(2));
          break;

        case 'stone_skin':
          // +100 physical armor
          enemy.armor += 100;
          break;

        case 'shielded':
          // +40% max HP absorption shield
          const bonusShield = Math.round(enemy.maxHp * 0.40);
          enemy.shield = (enemy.shield || 0) + bonusShield;
          break;

        case 'enraged':
        case 'regeneration':
        case 'throes_explode':
          // Evaluated during runtime tick or death
          break;
      }
    }
  }

  /**
   * Ticks active affixes for an enemy (e.g. Regeneration, Enraged triggers).
   * Returns true if enemy was healed or altered.
   */
  public static tick(enemy: EnemyEntity, dt: number): { healed: number; enragedTriggered: boolean } {
    const affixIds: EnemyAffixId[] = (enemy as any).affixIds || [];
    let healed = 0;
    let enragedTriggered = false;

    if (enemy.currentHp <= 0) {
      return { healed: 0, enragedTriggered: false };
    }

    // 1. Regeneration: 3% max HP per second
    if (affixIds.includes('regeneration') && enemy.currentHp < enemy.maxHp) {
      const healAmount = enemy.maxHp * 0.03 * dt;
      const actualHeal = Math.min(enemy.maxHp - enemy.currentHp, healAmount);
      enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + actualHeal);
      healed = actualHeal;
    }

    // 2. Enraged: Low health (<50%) triggers frenzy
    if (affixIds.includes('enraged') && !(enemy as any).affixEnragedActive && enemy.currentHp <= enemy.maxHp * 0.50) {
      (enemy as any).affixEnragedActive = true;
      enemy.moveSpeed = Number((enemy.moveSpeed * 1.40).toFixed(2));
      const currentInterval = enemy.attackInterval ?? 1.0;
      enemy.attackInterval = Number(Math.max(0.4, currentInterval * 0.67).toFixed(2));
      enragedTriggered = true;
    }

    return { healed, enragedTriggered };
  }

  /**
   * Resolves on-death affix consequences (e.g. Throes Explode).
   */
  public static onEnemyDeath(enemy: EnemyEntity): AffixExplosionEvent | null {
    const affixIds: EnemyAffixId[] = (enemy as any).affixIds || [];

    if (affixIds.includes('throes_explode')) {
      return {
        x: enemy.x ?? 375,
        y: enemy.y ?? 800,
        radius: 102, // 1.5 meters = 102 px
        damage: Math.round(enemy.maxHp * 0.25 + 50)
      };
    }

    return null;
  }

  /**
   * Gets descriptive objects for all affixes attached to this enemy.
   */
  public static getEnemyAffixObjects(enemy: EnemyEntity): EnemyAffix[] {
    const affixIds: EnemyAffixId[] = (enemy as any).affixIds || [];
    return affixIds.map(id => ENEMY_AFFIX_REGISTRY[id]).filter(Boolean);
  }
}
