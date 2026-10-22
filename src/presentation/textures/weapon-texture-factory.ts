/**
 * 《孤城神机营》- Weapon Procedural Texture Factory
 * Centralized registry for all 16 Ming Dynasty weapon procedural canvas textures:
 * - 4 Shenji Weapons (Fire): fire_lance, rocket_box, thunder_thrower, red_cannon (1x2)
 * - 4 Mohist Weapons: flame_beast, repeating_crossbow, bed_crossbow (2x1), catapult (2x2)
 * - 4 Fortress Weapons: barricade, oil_cabinet, electric_grid, spear_camp
 * - 4 Qimen Weapons: powder_bureau, war_drum (2x1), stargazer, luban_workshop
 * - Backward compatibility aliases (weapon_cannon -> weapon_red_cannon, weapon_iron_caltrop -> weapon_barricade)
 */

import Phaser from 'phaser';
import {
  SHENJI_WEAPON_TEXTURE_KEYS,
  generateShenjiTextures
} from './weapon-shenji-textures';
import {
  MOHIST_WEAPON_TEXTURE_KEYS,
  generateMohistTextures
} from './weapon-mohist-textures';
import {
  FORTRESS_WEAPON_TEXTURE_KEYS,
  generateFortressTextures
} from './weapon-fortress-textures';
import {
  QIMEN_WEAPON_TEXTURE_KEYS,
  generateQimenTextures
} from './weapon-qimen-textures';

export const ALL_WEAPON_TEXTURE_KEYS = {
  ...SHENJI_WEAPON_TEXTURE_KEYS,
  ...MOHIST_WEAPON_TEXTURE_KEYS,
  ...FORTRESS_WEAPON_TEXTURE_KEYS,
  ...QIMEN_WEAPON_TEXTURE_KEYS
} as const;

export const BACKWARD_COMPAT_WEAPON_ALIASES: Record<string, string> = {
  weapon_cannon: SHENJI_WEAPON_TEXTURE_KEYS.RED_CANNON,
  weapon_iron_caltrop: FORTRESS_WEAPON_TEXTURE_KEYS.BARRICADE,
  cannon: SHENJI_WEAPON_TEXTURE_KEYS.RED_CANNON,
  iron_barricade: FORTRESS_WEAPON_TEXTURE_KEYS.BARRICADE,
  iron_caltrop: FORTRESS_WEAPON_TEXTURE_KEYS.BARRICADE
};

export class WeaponTextureFactory {
  /**
   * Generates all 16 weapon textures across all 4 factions and registers aliases.
   */
  public static generateAll(scene: Phaser.Scene): void {
    if (!scene || !scene.textures) return;

    // 1. Shenji Faction (Fire)
    generateShenjiTextures(scene);

    // 2. Mohist Faction
    generateMohistTextures(scene);

    // 3. Fortress Faction
    generateFortressTextures(scene);

    // 4. Qimen Faction
    generateQimenTextures(scene);

    // 5. Register backward compatibility aliases
    this.registerCompatibilityAliases(scene);
  }

  /**
   * Registers backward compatibility canvas textures for legacy keys.
   */
  private static registerCompatibilityAliases(scene: Phaser.Scene): void {
    for (const [aliasKey, targetKey] of Object.entries(BACKWARD_COMPAT_WEAPON_ALIASES)) {
      if (scene.textures.exists(aliasKey)) continue;

      let w = 72;
      let h = 72;
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
   * Resolves any weapon configId, alias or texture key to the canonical procedural texture key.
   */
  public static getTextureKey(configId: string): string {
    if (!configId) return SHENJI_WEAPON_TEXTURE_KEYS.FIRE_LANCE;

    // Normalize
    const id = configId.trim();

    // Check direct alias
    if (BACKWARD_COMPAT_WEAPON_ALIASES[id]) {
      return BACKWARD_COMPAT_WEAPON_ALIASES[id];
    }

    // Direct match against known texture keys
    const rawId = id.startsWith('weapon_') ? id.substring(7) : id;

    // Check normalized alias
    if (BACKWARD_COMPAT_WEAPON_ALIASES[rawId]) {
      return BACKWARD_COMPAT_WEAPON_ALIASES[rawId];
    }

    // Check canonical 16 weapons
    switch (rawId) {
      // Fire
      case 'fire_lance':
        return SHENJI_WEAPON_TEXTURE_KEYS.FIRE_LANCE;
      case 'rocket_box':
        return SHENJI_WEAPON_TEXTURE_KEYS.ROCKET_BOX;
      case 'thunder_thrower':
        return SHENJI_WEAPON_TEXTURE_KEYS.THUNDER_THROWER;
      case 'red_cannon':
        return SHENJI_WEAPON_TEXTURE_KEYS.RED_CANNON;

      // Mohist
      case 'flame_beast':
        return MOHIST_WEAPON_TEXTURE_KEYS.FLAME_BEAST;
      case 'repeating_crossbow':
        return MOHIST_WEAPON_TEXTURE_KEYS.REPEATING_CROSSBOW;
      case 'bed_crossbow':
        return MOHIST_WEAPON_TEXTURE_KEYS.BED_CROSSBOW;
      case 'catapult':
        return MOHIST_WEAPON_TEXTURE_KEYS.CATAPULT;

      // Fortress
      case 'barricade':
        return FORTRESS_WEAPON_TEXTURE_KEYS.BARRICADE;
      case 'oil_cabinet':
        return FORTRESS_WEAPON_TEXTURE_KEYS.OIL_CABINET;
      case 'electric_grid':
        return FORTRESS_WEAPON_TEXTURE_KEYS.ELECTRIC_GRID;
      case 'spear_camp':
        return FORTRESS_WEAPON_TEXTURE_KEYS.SPEAR_CAMP;

      // Qimen
      case 'powder_bureau':
        return QIMEN_WEAPON_TEXTURE_KEYS.POWDER_BUREAU;
      case 'war_drum':
        return QIMEN_WEAPON_TEXTURE_KEYS.WAR_DRUM;
      case 'stargazer':
        return QIMEN_WEAPON_TEXTURE_KEYS.STARGAZER;
      case 'luban_workshop':
        return QIMEN_WEAPON_TEXTURE_KEYS.LUBAN_WORKSHOP;

      default:
        return 'weapon_' + rawId;
    }
  }
}
