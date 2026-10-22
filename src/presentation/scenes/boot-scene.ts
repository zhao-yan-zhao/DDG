/**
 * 《孤城神机营》- Boot & Procedural Asset Preload Scene
 * Generates procedural canvas textures for all 16 weapon types, 4 enemy archetypes,
 * projectiles, wall/tiles, and initializes audio.
 */

import Phaser from 'phaser';
import { SoundManager } from '../audio/sound-manager';
import { FACTION_COLORS } from '../renderers/unit-sprite';
import { UITextureFactory } from '../textures/ui-texture-factory';
import { EnvironmentTextureFactory } from '../textures/environment-texture-factory';
import { EnemyTextureFactory } from '../textures/enemy-texture-factory';
import { WeaponTextureFactory } from '../textures/weapon-texture-factory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Non-blocking asset load error handler: ensure game continues even if an individual asset fails
    this.load.on('loaderror', (fileObj: any) => {
      console.warn('[BootScene] Asset failed to load, will use procedural fallback:', fileObj?.key, fileObj?.src);
    });

    this.load.image('bg_fortress_battlefield', 'assets/bg_fortress_battlefield.jpg');

    // 16 Realistic Ming Dynasty Weapon Sprites
    // Shenji Faction (Fire)
    this.load.image('weapon_fire_lance', 'assets/weapons/weapon_fire_lance.png');
    this.load.image('weapon_rocket_box', 'assets/weapons/weapon_rocket_box.png');
    this.load.image('weapon_thunder_thrower', 'assets/weapons/weapon_thunder_thrower.png');
    this.load.image('weapon_red_cannon', 'assets/weapons/weapon_red_cannon.png');
    this.load.image('weapon_cannon', 'assets/weapons/weapon_red_cannon.png'); // legacy alias

    // Mohist Faction (Mechanical)
    this.load.image('weapon_flame_beast', 'assets/weapons/weapon_flame_beast.png');
    this.load.image('weapon_repeating_crossbow', 'assets/weapons/weapon_repeating_crossbow.png');
    this.load.image('weapon_bed_crossbow', 'assets/weapons/weapon_bed_crossbow.png');
    this.load.image('weapon_catapult', 'assets/weapons/weapon_catapult.png');

    // Fortress Faction (Defense)
    this.load.image('weapon_barricade', 'assets/weapons/weapon_barricade.png');
    this.load.image('weapon_iron_caltrop', 'assets/weapons/weapon_barricade.png'); // legacy alias
    this.load.image('weapon_oil_cabinet', 'assets/weapons/weapon_oil_cabinet.png');
    this.load.image('weapon_electric_grid', 'assets/weapons/weapon_electric_grid.png');
    this.load.image('weapon_spear_camp', 'assets/weapons/weapon_spear_camp.png');

    // Qimen Faction (Auxiliary)
    this.load.image('weapon_powder_bureau', 'assets/weapons/weapon_powder_bureau.png');
    this.load.image('weapon_war_drum', 'assets/weapons/weapon_war_drum.png');
    this.load.image('weapon_stargazer', 'assets/weapons/weapon_stargazer.png');
    this.load.image('weapon_luban_workshop', 'assets/weapons/weapon_luban_workshop.png');

    // 13 Realistic Invading Enemy Sprites (Battle Sprites: standard 48~96px footprint)
    // 8 Regular & Elite Invaders
    this.load.image('enemy_light_infantry', 'assets/enemies/enemy_light_infantry.png');
    this.load.image('enemy_war_dog', 'assets/enemies/enemy_war_dog.png');
    this.load.image('enemy_light_cavalry', 'assets/enemies/enemy_light_cavalry.png');
    this.load.image('enemy_shield_guard', 'assets/enemies/enemy_shield_guard.png');
    this.load.image('enemy_iron_pagoda', 'assets/enemies/enemy_iron_pagoda.png');
    this.load.image('enemy_ranged_bowman', 'assets/enemies/enemy_ranged_bowman.png');
    this.load.image('enemy_bomb_carrier', 'assets/enemies/enemy_bomb_carrier.png');
    this.load.image('enemy_siege_ram', 'assets/enemies/enemy_siege_ram.png');

    // 5 Chapter Supreme Bosses
    this.load.image('enemy_boss_bear', 'assets/enemies/enemy_boss_bear.png');
    this.load.image('enemy_boss_xuanwu', 'assets/enemies/enemy_boss_xuanwu.png');
    this.load.image('enemy_boss_khan', 'assets/enemies/enemy_boss_khan.png');
    this.load.image('enemy_boss_wangu', 'assets/enemies/enemy_boss_wangu.png');
    this.load.image('enemy_boss_taotie', 'assets/enemies/enemy_boss_taotie.png');

    // 13 High-Definition Compendium Portraits (256x256 Full HD)
    this.load.image('hd_enemy_light_infantry', 'assets/enemies_hd/enemy_light_infantry.png');
    this.load.image('hd_enemy_war_dog', 'assets/enemies_hd/enemy_war_dog.png');
    this.load.image('hd_enemy_light_cavalry', 'assets/enemies_hd/enemy_light_cavalry.png');
    this.load.image('hd_enemy_shield_guard', 'assets/enemies_hd/enemy_shield_guard.png');
    this.load.image('hd_enemy_iron_pagoda', 'assets/enemies_hd/enemy_iron_pagoda.png');
    this.load.image('hd_enemy_ranged_bowman', 'assets/enemies_hd/enemy_ranged_bowman.png');
    this.load.image('hd_enemy_bomb_carrier', 'assets/enemies_hd/enemy_bomb_carrier.png');
    this.load.image('hd_enemy_siege_ram', 'assets/enemies_hd/enemy_siege_ram.png');
    this.load.image('hd_enemy_boss_bear', 'assets/enemies_hd/enemy_boss_bear.png');
    this.load.image('hd_enemy_boss_xuanwu', 'assets/enemies_hd/enemy_boss_xuanwu.png');
    this.load.image('hd_enemy_boss_khan', 'assets/enemies_hd/enemy_boss_khan.png');
    this.load.image('hd_enemy_boss_wangu', 'assets/enemies_hd/enemy_boss_wangu.png');
    this.load.image('hd_enemy_boss_taotie', 'assets/enemies_hd/enemy_boss_taotie.png');
  }

  public create(): void {
    // Generate procedural Ming Dynasty heavy-color weapon textures (all 16 weapons + aliases)
    WeaponTextureFactory.generateAll(this);

    // Generate fallback textures only for weapons/enemies without disk assets
    this.generateProceduralAssets();

    // Generate procedural national tide enemy textures (8 regular/elite + 5 chapter bosses)
    EnemyTextureFactory.generateAll(this);

    // Generate high-fidelity national tide UI textures (NineSlices, icons, buttons, seals)
    UITextureFactory.generateAll(this);

    // Generate procedural battlefield environment textures (banners, braziers, decals, parapets, terrain)
    EnvironmentTextureFactory.generateAll(this);

    // Warm up sound manager
    SoundManager.getInstance();

    // Start HomeScene (主城大厅)
    this.scene.start('HomeScene');
  }

  private generateProceduralAssets(): void {
    // =========================================================================
    // 1. Enemy Textures (4 archetypes + variants)
    // =========================================================================
    // Ordinary (Light Infantry)
    this.createTextureIfMissing('enemy_ordinary', 40, 40, (g) => {
      g.fillStyle(0x546e7a, 1);
      g.fillCircle(20, 20, 16);
      g.lineStyle(2, 0xd32f2f, 1);
      g.strokeCircle(20, 20, 16);
      // Spear line
      g.lineStyle(2, 0xffffff, 1);
      g.lineBetween(12, 28, 28, 12);
    });

    // Charging (War Dog / Cavalry)
    this.createTextureIfMissing('enemy_charging', 44, 44, (g) => {
      g.fillStyle(0xc62828, 1);
      g.fillTriangle(22, 4, 40, 38, 4, 38);
      g.lineStyle(2, 0xffeb3b, 1);
      g.strokeTriangle(22, 4, 40, 38, 4, 38);
      // Speed arrow
      g.fillStyle(0xffeb3b, 1);
      g.fillTriangle(22, 16, 30, 30, 14, 30);
    });

    // Heavy (Shield Guard / Iron Pagoda)
    this.createTextureIfMissing('enemy_heavy', 48, 48, (g) => {
      g.fillStyle(0x263238, 1);
      g.fillRoundedRect(4, 4, 40, 40, 6);
      g.lineStyle(3, 0x00e5ff, 1);
      g.strokeRoundedRect(4, 4, 40, 40, 6);
      // Shield emblem
      g.fillStyle(0x37474f, 1);
      g.fillRoundedRect(12, 12, 24, 24, 4);
      g.lineStyle(2, 0xffd700, 1);
      g.strokeRoundedRect(12, 12, 24, 24, 4);
    });

    // Boss (Boss Bear / General)
    this.createTextureIfMissing('enemy_boss', 64, 64, (g) => {
      g.fillStyle(0x880e4f, 1);
      g.fillRoundedRect(4, 4, 56, 56, 12);
      g.lineStyle(4, 0xffd700, 1);
      g.strokeRoundedRect(4, 4, 56, 56, 12);
      // Golden Crown / Crest
      g.fillStyle(0xffd700, 1);
      g.fillTriangle(32, 10, 48, 26, 16, 26);
      g.fillCircle(32, 8, 4);
    });

    // Alias mappings for enemy type IDs
    const enemyAliases: Record<string, string> = {
      light_infantry: 'enemy_ordinary',
      war_dog: 'enemy_charging',
      light_cavalry: 'enemy_charging',
      shield_guard: 'enemy_heavy',
      iron_pagoda: 'enemy_heavy',
      bomb_carrier: 'enemy_charging',
      boss_bear: 'enemy_boss',
      boss_general: 'enemy_boss'
    };

    for (const [id, targetKey] of Object.entries(enemyAliases)) {
      if (!this.textures.exists(id) && this.textures.exists(targetKey)) {
        // Can reference same key
      }
    }

    // =========================================================================
    // 2. Weapon Textures (16 archetypes)
    // =========================================================================
    const weaponDefinitions: Array<{ id: string; faction: keyof typeof FACTION_COLORS; symbol: string }> = [
      // Fire
      { id: 'fire_lance', faction: 'fire', symbol: '铳' },
      { id: 'rocket_box', faction: 'fire', symbol: '蜂' },
      { id: 'thunder_thrower', faction: 'fire', symbol: '雷' },
      { id: 'red_cannon', faction: 'fire', symbol: '炮' },
      // Mohist
      { id: 'flame_beast', faction: 'mohist', symbol: '兽' },
      { id: 'repeating_crossbow', faction: 'mohist', symbol: '弩' },
      { id: 'bed_crossbow', faction: 'mohist', symbol: '床' },
      { id: 'catapult', faction: 'mohist', symbol: '石' },
      // Fortress
      { id: 'barricade', faction: 'fortress', symbol: '拒' },
      { id: 'oil_cabinet', faction: 'fortress', symbol: '油' },
      { id: 'electric_grid', faction: 'fortress', symbol: '电' },
      { id: 'spear_camp', faction: 'fortress', symbol: '枪' },
      // Qimen
      { id: 'powder_bureau', faction: 'qimen', symbol: '药' },
      { id: 'war_drum', faction: 'qimen', symbol: '鼓' },
      { id: 'stargazer', faction: 'qimen', symbol: '星' },
      { id: 'luban_workshop', faction: 'qimen', symbol: '班' }
    ];

    for (const w of weaponDefinitions) {
      const colors = FACTION_COLORS[w.faction];
      this.createTextureIfMissing(`weapon_${w.id}`, 72, 72, (g) => {
        g.fillStyle(colors.bg, 1);
        g.fillRoundedRect(2, 2, 68, 68, 8);
        g.lineStyle(2, colors.border, 1);
        g.strokeRoundedRect(2, 2, 68, 68, 8);
        // Inner accent ring
        g.lineStyle(1.5, colors.accent, 0.7);
        g.strokeCircle(36, 36, 26);
      });
    }

    // =========================================================================
    // 3. Projectile & Particle Textures
    // =========================================================================
    this.createTextureIfMissing('proj_bullet', 12, 12, (g) => {
      g.fillStyle(0xfff176, 1);
      g.fillCircle(6, 6, 5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 2);
    });

    this.createTextureIfMissing('proj_cannonball', 18, 18, (g) => {
      g.fillStyle(0x37474f, 1);
      g.fillCircle(9, 9, 8);
      g.lineStyle(1.5, 0xff7043, 1);
      g.strokeCircle(9, 9, 8);
    });

    this.createTextureIfMissing('particle_spark', 8, 8, (g) => {
      g.fillStyle(0xffd700, 1);
      g.fillCircle(4, 4, 3);
    });

    this.createTextureIfMissing('particle_smoke', 24, 24, (g) => {
      g.fillStyle(0x78909c, 0.5);
      g.fillCircle(12, 12, 10);
    });

    // =========================================================================
    // 4. Ground and Wall Tiles
    // =========================================================================
    this.createTextureIfMissing('tile_ground', 64, 64, (g) => {
      g.fillStyle(0x181a1d, 1);
      g.fillRect(0, 0, 64, 64);
      g.lineStyle(1, 0x242830, 0.5);
      g.strokeRect(0, 0, 64, 64);
    });

    this.createTextureIfMissing('wall_brick', 60, 20, (g) => {
      g.fillStyle(0x42382f, 1);
      g.fillRect(0, 0, 60, 20);
      g.lineStyle(1.5, 0x6d5742, 1);
      g.strokeRect(0, 0, 60, 20);
    });
  }

  private createTextureIfMissing(key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}
