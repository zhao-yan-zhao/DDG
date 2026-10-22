import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';
import {
  COMPENDIUM_WEAPONS,
  COMPENDIUM_ENEMIES,
  COMPENDIUM_SYNERGIES,
  COMPENDIUM_REACTIONS,
  COMPENDIUM_FUSIONS,
  getCompendiumWeaponsByFaction,
  getCompendiumEnemiesByCategory,
  getCompendiumWeaponById,
  getCompendiumEnemyById,
  getCompendiumSynergyById,
  getCompendiumReactionById,
  getCompendiumFusionById
} from '../src/config/compendium.config';
import { CompendiumModal } from '../src/presentation/ui/compendium-modal';

// Mock Phaser & SoundManager for Headless Vitest Environment
vi.mock('phaser', () => {
  class MockGameObject {
    public x = 0;
    public y = 0;
    public alpha = 1;
    public visible = true;
    public depth = 0;
    public list: any[] = [];
    public active = true;
    public width = 100;
    public height = 50;

    constructor(public scene?: any) {}

    setDepth(d: number) { this.depth = d; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setDisplaySize() { return this; }
    setOrigin() { return this; }
    setAlpha(a: number) { this.alpha = a; return this; }
    setVisible(v: boolean) { this.visible = v; return this; }
    setInteractive(shape?: any, callback?: any) {
      (this as any).hitArea = shape;
      (this as any).hitAreaCallback = callback;
      return this;
    }
    setSize(w = 0, h = 0) { this.width = w; this.height = h; return this; }
    setColor() { return this; }
    setStyle() { return this; }
    setText(t: string) { (this as any).text = t; return this; }
    on() { return this; }
    off() { return this; }
    emit() { return this; }
    clear() { return this; }
    fillStyle() { return this; }
    fillRect() { return this; }
    fillRoundedRect() { return this; }
    fillCircle() { return this; }
    lineStyle() { return this; }
    strokeRoundedRect() { return this; }
    strokeCircle() { return this; }
    add(item: any) {
      if (Array.isArray(item)) this.list.push(...item);
      else this.list.push(item);
      return this;
    }
    removeAll(_destroy = false) {
      this.list = [];
      return this;
    }
    destroy() { this.active = false; }
  }

  class MockScene {
    public add = {
      container: (x = 0, y = 0) => new MockGameObject().setPosition(x, y),
      graphics: () => new MockGameObject(),
      text: (x = 0, y = 0, text = '') => {
        const obj = new MockGameObject().setPosition(x, y);
        (obj as any).text = text;
        return obj;
      },
      nineslice: () => new MockGameObject(),
      image: (x = 0, y = 0) => new MockGameObject().setPosition(x, y),
      zone: (x = 0, y = 0, w = 0, h = 0) => new MockGameObject().setPosition(x, y).setSize(w, h),
      existing: (obj: any) => obj
    };

    public tweens = {
      add: (config: any) => {
        if (config.onComplete) {
          config.onComplete();
        }
        return { stop: () => {} };
      }
    };
  }

  return {
    default: {
      Scene: MockScene,
      GameObjects: {
        Container: MockGameObject,
        Graphics: MockGameObject,
        Text: MockGameObject,
        Image: MockGameObject,
        Zone: MockGameObject
      },
      Geom: {
        Rectangle: class {
          constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
          static Contains() { return true; }
        }
      }
    }
  };
});

vi.mock('../src/presentation/audio/sound-manager', () => {
  return {
    SoundManager: {
      getInstance: () => ({
        playBronzeButtonClick: vi.fn(),
        playSelect: vi.fn(),
        resume: vi.fn()
      })
    }
  };
});

describe('Compendium Config Matrix & Presentation Verification', () => {
  describe('1. Weapons Compendium (大明神机谱)', () => {
    it('should configure exactly 16 Ming Dynasty weapons across 4 factions', () => {
      expect(COMPENDIUM_WEAPONS).toHaveLength(16);

      const fireWeapons = getCompendiumWeaponsByFaction('fire');
      const mohistWeapons = getCompendiumWeaponsByFaction('mohist');
      const fortressWeapons = getCompendiumWeaponsByFaction('fortress');
      const qimenWeapons = getCompendiumWeaponsByFaction('qimen');

      expect(fireWeapons).toHaveLength(4);
      expect(mohistWeapons).toHaveLength(4);
      expect(fortressWeapons).toHaveLength(4);
      expect(qimenWeapons).toHaveLength(4);
    });

    it('each weapon should have complete data including ★1~★4 evolutions and lore', () => {
      COMPENDIUM_WEAPONS.forEach(w => {
        expect(w.id).toBeTruthy();
        expect(w.textureKey).toMatch(/^weapon_/);
        expect(w.name).toBeTruthy();
        expect(w.alias).toBeTruthy();
        expect(w.footprint).toBeTruthy();
        expect(w.rangeDisplay).toBeTruthy();
        expect(w.historicalNote.length).toBeGreaterThan(15);
        expect(w.loreQuote.length).toBeGreaterThan(5);
        expect(w.synergyTags.length).toBeGreaterThan(0);

        // 4 Star Evolutions
        expect(w.evolutions[1]).toBeDefined();
        expect(w.evolutions[2]).toBeDefined();
        expect(w.evolutions[3]).toBeDefined();
        expect(w.evolutions[4]).toBeDefined();

        expect(w.evolutions[4].specialEffect).toBeDefined();
      });
    });

    it('helper functions should return expected weapons', () => {
      const redCannon = getCompendiumWeaponById('red_cannon');
      expect(redCannon).toBeDefined();
      expect(redCannon?.name).toBe('红夷大炮');
      expect(redCannon?.footprint).toBe('2×2');

      const all = getCompendiumWeaponsByFaction('all');
      expect(all).toHaveLength(16);
    });
  });

  describe('2. Enemies Compendium (塞外敌寇鉴)', () => {
    it('should configure exactly 13 invaders: 8 regular/elite + 5 supreme bosses', () => {
      expect(COMPENDIUM_ENEMIES).toHaveLength(13);

      const regulars = getCompendiumEnemiesByCategory('regular');
      const elites = getCompendiumEnemiesByCategory('elite');
      const bosses = getCompendiumEnemiesByCategory('boss');

      expect(regulars.length + elites.length).toBe(8);
      expect(bosses).toHaveLength(5);
    });

    it('all 5 Supreme Chapter Bosses must have unique deadly mechanics and counters', () => {
      const bossIds = ['boss_bear', 'boss_xuanwu', 'boss_khan', 'boss_wangu', 'boss_taotie'];

      bossIds.forEach(id => {
        const boss = getCompendiumEnemyById(id);
        expect(boss).toBeDefined();
        expect(boss?.category).toBe('boss');
        expect(boss?.threatDescription).toBeTruthy();
        expect(boss?.tacticalCounter).toContain('【破阵秘策】');
        expect(boss?.recommendedWeapons.length).toBeGreaterThanOrEqual(3);
      });

      // Special Boss Verification: Taotie
      const taotie = getCompendiumEnemyById('boss_taotie');
      expect(taotie?.name).toContain('饕餮');
      expect(taotie?.threatDescription).toContain('弱点打断机制');
    });

    it('regular & elite enemies must have danger ratings and tactical counters', () => {
      const warDog = getCompendiumEnemyById('war_dog');
      expect(warDog).toBeDefined();
      expect(warDog?.tacticalCounter).toContain('铁蒺藜鹿角');

      const bombCarrier = getCompendiumEnemyById('bomb_carrier');
      expect(bombCarrier).toBeDefined();
      expect(bombCarrier?.threatDescription).toContain('自爆');
    });
  });

  describe('3. Tactics & Formations Compendium (神机阵略篇)', () => {
    it('should configure 6 spatial adjacency synergies with proper formations', () => {
      expect(COMPENDIUM_SYNERGIES).toHaveLength(6);

      const volleyFire = getCompendiumSynergyById('volley_fire');
      expect(volleyFire).toBeDefined();
      expect(volleyFire?.name).toBe('齐射列阵');
      expect(volleyFire?.formation).toContain('水平相邻');
      expect(volleyFire?.bonusValue).toContain('+18%');

      const ninePalace = getCompendiumSynergyById('nine_palace_powder');
      expect(ninePalace?.bonusValue).toContain('+20%');

      const oilCombustion = getCompendiumSynergyById('oil_combustion');
      expect(oilCombustion?.formation).toContain('Row 0');
    });

    it('should configure 4 elemental reactions with combination formulas', () => {
      expect(COMPENDIUM_REACTIONS).toHaveLength(4);

      const fireBlast = getCompendiumReactionById('fire_blast');
      expect(fireBlast).toBeDefined();
      expect(fireBlast?.name).toBe('猛火轰爆');
      expect(fireBlast?.combatEffect).toContain('200%');

      const thunderHeaven = getCompendiumReactionById('thunder_heaven');
      expect(thunderHeaven?.name).toBe('雷火天劫');
      expect(thunderHeaven?.combatEffect).toContain('麻痹');

      const iceShatter = getCompendiumReactionById('ice_shatter');
      expect(iceShatter?.name).toBe('碎冰崩裂');
      expect(iceShatter?.combatEffect).toContain('3%');
    });

    it('should configure 3 red-gold dual-weapon awakenings with dual ★3 unlock requirements', () => {
      expect(COMPENDIUM_FUSIONS).toHaveLength(3);

      const fireDragon = getCompendiumFusionById('fire_dragon_water');
      expect(fireDragon).toBeDefined();
      expect(fireDragon?.name).toBe('真·火龙出水');
      expect(fireDragon?.unlockCondition).toContain('★3 一窝蜂');
      expect(fireDragon?.unlockCondition).toContain('★3 猛火油柜');

      const thunderPool = getCompendiumFusionById('nine_heaven_thunder_pool');
      expect(thunderPool?.name).toBe('九天雷池轰');

      const iceMeteor = getCompendiumFusionById('mount_tai_ice_meteor');
      expect(iceMeteor?.name).toBe('泰山陨冰劫');
    });
  });

  describe('4. CompendiumModal Lifecycle & Interaction', () => {
    let mockScene: any;
    let modal: CompendiumModal;

    beforeEach(() => {
      mockScene = new Phaser.Scene();
      modal = new CompendiumModal(mockScene);
    });

    it('should initialize hidden and toggle visibility on show/hide', () => {
      expect(modal.isVisible()).toBe(false);

      modal.show('weapons');
      expect(modal.isVisible()).toBe(true);

      modal.hide();
      expect(modal.isVisible()).toBe(false);
    });

    it('should switch between weapons, enemies, and tactics tabs smoothly', () => {
      modal.show('weapons');
      expect(modal.isVisible()).toBe(true);

      modal.show('enemies');
      expect(modal.isVisible()).toBe(true);

      modal.show('tactics');
      expect(modal.isVisible()).toBe(true);
    });
  });
});
