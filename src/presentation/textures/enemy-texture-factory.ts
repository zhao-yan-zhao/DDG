/**
 * 《孤城神机营》- Enemy Procedural Texture Factory
 * Centralized registry for all enemy procedural canvas textures:
 * - 8 Regular / Elite Invaders (enemy_light_infantry, enemy_war_dog, enemy_light_cavalry,
 *   enemy_shield_guard, enemy_iron_pagoda, enemy_ranged_bowman, enemy_bomb_carrier, enemy_siege_ram)
 * - 5 Chapter Supreme Bosses (enemy_boss_bear, enemy_boss_xuanwu, enemy_boss_khan,
 *   enemy_boss_wangu, enemy_boss_taotie)
 * - Backward compatibility aliases (enemy_ordinary, enemy_charging, enemy_heavy, enemy_boss, enemy_siege_ballista)
 */

import Phaser from 'phaser';
import {
  REGULAR_ENEMY_TEXTURE_KEYS,
  generateRegularEnemyTextures
} from './enemy-regular-textures';
import {
  BOSS_ENEMY_TEXTURE_KEYS,
  generateBossEnemyTextures
} from './enemy-boss-textures';

export const BACKWARD_COMPAT_ENEMY_ALIASES: Record<string, string> = {
  enemy_ordinary: REGULAR_ENEMY_TEXTURE_KEYS.LIGHT_INFANTRY,
  enemy_charging: REGULAR_ENEMY_TEXTURE_KEYS.WAR_DOG,
  enemy_heavy: REGULAR_ENEMY_TEXTURE_KEYS.SHIELD_GUARD,
  enemy_boss: BOSS_ENEMY_TEXTURE_KEYS.BOSS_BEAR,
  enemy_siege_ballista: REGULAR_ENEMY_TEXTURE_KEYS.SIEGE_RAM
};

export class EnemyTextureFactory {
  /**
   * Generates all enemy textures (regular, boss, aliases) if not already registered.
   */
  public static generateAll(scene: Phaser.Scene): void {
    if (!scene || !scene.textures) return;

    // 1. Generate 8 Regular/Elite Invader Textures
    generateRegularEnemyTextures(scene);

    // 2. Generate 5 Chapter Supreme Boss Textures
    generateBossEnemyTextures(scene);

    // 3. Register Backward Compatibility Aliases
    this.registerCompatibilityAliases(scene);
  }

  /**
   * Registers backward compatibility canvas textures for legacy keys.
   */
  private static registerCompatibilityAliases(scene: Phaser.Scene): void {
    for (const [aliasKey, targetKey] of Object.entries(BACKWARD_COMPAT_ENEMY_ALIASES)) {
      if (scene.textures.exists(aliasKey)) continue;

      let w = 48;
      let h = 48;
      let sourceImage: any = null;

      if (scene.textures.exists(targetKey)) {
        const targetTex = scene.textures.get(targetKey);
        sourceImage = (targetTex as any)?.getSourceImage?.();
        if (sourceImage && sourceImage.width && sourceImage.height) {
          w = sourceImage.width;
          h = sourceImage.height;
        }
      }

      const canvasTex = scene.textures.createCanvas(aliasKey, w, h);
      if (!canvasTex) continue;

      if (sourceImage) {
        canvasTex.context.drawImage(sourceImage, 0, 0);
      }
      canvasTex.refresh();
    }
  }

  /**
   * Maps an EnemyEntity / archetype attributes to its canonical procedural texture key.
   */
  public static getTextureKey(enemy: { typeId?: string; isBoss?: boolean; armor?: number }): string {
    const typeId = (enemy?.typeId || '').toLowerCase();

    // 1. Chapter Supreme Bosses
    if (enemy?.isBoss || typeId.startsWith('boss_') || typeId.startsWith('enemy_boss')) {
      if (typeId.includes('xuanwu')) return BOSS_ENEMY_TEXTURE_KEYS.BOSS_XUANWU;
      if (typeId.includes('khan')) return BOSS_ENEMY_TEXTURE_KEYS.BOSS_KHAN;
      if (typeId.includes('wangu') || typeId.includes('corpse_demon')) return BOSS_ENEMY_TEXTURE_KEYS.BOSS_WANGU;
      if (typeId.includes('taotie')) return BOSS_ENEMY_TEXTURE_KEYS.BOSS_TAOTIE;
      return BOSS_ENEMY_TEXTURE_KEYS.BOSS_BEAR;
    }

    // 2. Regular / Elite Enemy Archetypes
    if (typeId.includes('infantry') || typeId === 'ordinary' || typeId === 'enemy_ordinary') {
      return REGULAR_ENEMY_TEXTURE_KEYS.LIGHT_INFANTRY;
    }
    if (typeId.includes('dog') || typeId === 'war_dog') {
      return REGULAR_ENEMY_TEXTURE_KEYS.WAR_DOG;
    }
    if (typeId.includes('cavalry') || typeId === 'light_cavalry') {
      return REGULAR_ENEMY_TEXTURE_KEYS.LIGHT_CAVALRY;
    }
    if (typeId.includes('shield') || typeId === 'shield_guard') {
      return REGULAR_ENEMY_TEXTURE_KEYS.SHIELD_GUARD;
    }
    if (typeId.includes('pagoda') || typeId === 'iron_pagoda') {
      return REGULAR_ENEMY_TEXTURE_KEYS.IRON_PAGODA;
    }
    if (typeId.includes('bowman') || typeId.includes('spearman') || typeId.includes('archer') || typeId === 'ranged_bowman') {
      return REGULAR_ENEMY_TEXTURE_KEYS.RANGED_BOWMAN;
    }
    if (typeId.includes('bomb') || typeId === 'bomb_carrier') {
      return REGULAR_ENEMY_TEXTURE_KEYS.BOMB_CARRIER;
    }
    if (typeId.includes('ram') || typeId === 'siege_ram') {
      return REGULAR_ENEMY_TEXTURE_KEYS.SIEGE_RAM;
    }
    if (typeId.includes('ballista') || typeId === 'siege_ballista') {
      return REGULAR_ENEMY_TEXTURE_KEYS.SIEGE_RAM;
    }
    if (typeId === 'charging') {
      return REGULAR_ENEMY_TEXTURE_KEYS.WAR_DOG;
    }
    if (typeId === 'heavy') {
      return REGULAR_ENEMY_TEXTURE_KEYS.SHIELD_GUARD;
    }

    // 3. Fallback based on armor
    if (enemy?.armor && enemy.armor > 20) {
      return REGULAR_ENEMY_TEXTURE_KEYS.SHIELD_GUARD;
    }

    return REGULAR_ENEMY_TEXTURE_KEYS.LIGHT_INFANTRY;
  }
}
