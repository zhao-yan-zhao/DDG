/**
 * 《孤城神机营》- Milestone M_VJ3 Combat Game Juice & VFX Unit Tests
 * Verifies:
 * 1. EnemySprite: 0.06s hit flash white timer and clearTint
 * 2. EnemySprite: Dynamic Ghost Health Bar lerp smoothing (0.3s) and instant snap on heal
 * 3. EnemySprite: Boss blood aura field (2.0 rad/s) and elite aura
 * 4. UnitSprite: Muzzle heat glow 0.8s linear cooldown dissipation
 * 5. UnitSprite: High-star rune glow (★3 cyan breathing, ★4 golden radiant & micro-sparkles)
 * 6. ElementalVfxManager: Four GDD V3.0 elemental reactions (Fire Blast, Thunderfire, Ice Shatter, Nether Poison)
 * 7. FloatingTextPool: Gold calligraphy crit bounce text, spring bounce scale, star sparkles, reaction styles
 * 8. ProjectileViewManager: 4-point starburst diamond muzzle flash and backward gunpowder smoke puff
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =========================================================================
// Mock Phaser GameObject & Tween Infrastructure
// =========================================================================
vi.mock('phaser', () => {
  class MockGameObject {
    scene: any;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    visible: boolean = true;
    alpha: number = 1.0;
    depth: number = 0;
    scaleX: number = 1.0;
    scaleY: number = 1.0;
    rotation: number = 0;
    isDestroyed: boolean = false;
    tint: number = 0;
    tintFill: boolean = false;

    constructor(scene: any, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }

    setDepth(d: number) { this.depth = d; return this; }
    setScale(s: number) { this.scaleX = s; this.scaleY = s; return this; }
    setVisible(v: boolean) { this.visible = v; return this; }
    setAlpha(a: number) { this.alpha = a; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setRotation(r: number) { this.rotation = r; return this; }
    setDisplaySize(w: number, h: number) { this.width = w; this.height = h; return this; }
    setTintFill(color: number) { this.tint = color; this.tintFill = true; return this; }
    clearTint() { this.tint = 0; this.tintFill = false; return this; }
    destroy() { this.isDestroyed = true; }
  }

  class MockSprite extends MockGameObject {
    textureKey: string;
    constructor(scene: any, x = 0, y = 0, key = '') {
      super(scene, x, y);
      this.textureKey = key;
    }
  }

  class MockGraphics extends MockGameObject {
    commands: any[] = [];
    clear() { this.commands = []; return this; }
    fillStyle(color: number, alpha = 1.0) { this.commands.push({ type: 'fillStyle', color, alpha }); return this; }
    lineStyle(width: number, color: number, alpha = 1.0) { this.commands.push({ type: 'lineStyle', width, color, alpha }); return this; }
    fillRect(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'fillRect', x, y, w, h }); return this; }
    fillRoundedRect(x: number, y: number, w: number, h: number, r: any) { this.commands.push({ type: 'fillRoundedRect', x, y, w, h, r }); return this; }
    strokeRoundedRect(x: number, y: number, w: number, h: number, r: any) { this.commands.push({ type: 'strokeRoundedRect', x, y, w, h, r }); return this; }
    fillCircle(x: number, y: number, r: number) { this.commands.push({ type: 'fillCircle', x, y, r }); return this; }
    strokeCircle(x: number, y: number, r: number) { this.commands.push({ type: 'strokeCircle', x, y, r }); return this; }
    fillEllipse(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'fillEllipse', x, y, w, h }); return this; }
    strokeEllipse(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'strokeEllipse', x, y, w, h }); return this; }
    lineBetween(x1: number, y1: number, x2: number, y2: number) { this.commands.push({ type: 'lineBetween', x1, y1, x2, y2 }); return this; }
    beginPath() { this.commands.push({ type: 'beginPath' }); return this; }
    moveTo(x: number, y: number) { this.commands.push({ type: 'moveTo', x, y }); return this; }
    lineTo(x: number, y: number) { this.commands.push({ type: 'lineTo', x, y }); return this; }
    closePath() { this.commands.push({ type: 'closePath' }); return this; }
    strokePath() { this.commands.push({ type: 'strokePath' }); return this; }
    fillPath() { this.commands.push({ type: 'fillPath' }); return this; }
  }

  class MockText extends MockGameObject {
    text: string = '';
    style: any = {};
    originX: number = 0;
    originY: number = 0;
    constructor(scene: any, x = 0, y = 0, text = '', style = {}) {
      super(scene, x, y);
      this.text = text;
      this.style = { ...style };
    }
    setText(t: string) { this.text = t; return this; }
    setStyle(s: any) { this.style = { ...this.style, ...s }; return this; }
    setFontSize(s: string) { this.style.fontSize = s; return this; }
    setColor(c: string) { this.style.color = c; return this; }
    setFontFamily(f: string) { this.style.fontFamily = f; return this; }
    setStroke(color: string, thickness: number) { this.style.stroke = color; this.style.strokeThickness = thickness; return this; }
    setOrigin(x = 0.5, y = 0.5) { this.originX = x; this.originY = y; return this; }
    setY(y: number) { this.y = y; return this; }
  }

  class MockContainer extends MockGameObject {
    list: any[] = [];
    add(item: any) {
      if (Array.isArray(item)) this.list.push(...item);
      else this.list.push(item);
      return this;
    }
    addAt(item: any, index: number) {
      this.list.splice(index, 0, item);
      return this;
    }
    sendToBack(item: any) {
      const idx = this.list.indexOf(item);
      if (idx > -1) {
        this.list.splice(idx, 1);
        this.list.unshift(item);
      }
      return this;
    }
    bringToTop(item: any) {
      const idx = this.list.indexOf(item);
      if (idx > -1) {
        this.list.splice(idx, 1);
        this.list.push(item);
      }
      return this;
    }
    moveTo(item: any, index: number) {
      const idx = this.list.indexOf(item);
      if (idx > -1) {
        this.list.splice(idx, 1);
        this.list.splice(index, 0, item);
      }
      return this;
    }
  }

  return {
    default: {
      GameObjects: {
        GameObject: MockGameObject,
        Container: MockContainer,
        Sprite: MockSprite,
        Image: MockSprite,
        Graphics: MockGraphics,
        Text: MockText
      }
    }
  };
});

import Phaser from 'phaser';
import { EnemySprite } from '../src/presentation/renderers/enemy-sprite';
import { UnitSprite } from '../src/presentation/renderers/unit-sprite';
import { ElementalVfxManager } from '../src/presentation/renderers/elemental-vfx';
import { FloatingTextPool, STYLE_COLORS } from '../src/presentation/renderers/fly-text';
import { ProjectileViewManager } from '../src/presentation/renderers/projectile-view';
import { EnemyEntity, WeaponInstance } from '../src/core/types';

describe('Milestone M_VJ3: Combat Game Juice & Elemental VFX Tests', () => {
  let mockScene: any;
  let addedTweens: any[] = [];

  beforeEach(() => {
    addedTweens = [];
    mockScene = {
      add: {
        graphics: () => new (Phaser.GameObjects as any).Graphics(mockScene),
        sprite: (x = 0, y = 0, key = '') => new (Phaser.GameObjects as any).Sprite(mockScene, x, y, key),
        image: (x = 0, y = 0, key = '') => new (Phaser.GameObjects as any).Sprite(mockScene, x, y, key),
        text: (x = 0, y = 0, text = '', style = {}) => new (Phaser.GameObjects as any).Text(mockScene, x, y, text, style),
        existing: (obj: any) => obj
      },
      textures: {
        exists: vi.fn((_key: string) => true),
        get: vi.fn(() => ({
          getSourceImage: () => ({ width: 72, height: 72 })
        }))
      },
      tweens: {
        add: vi.fn((config: any) => {
          addedTweens.push(config);
          return config;
        }),
        killAll: vi.fn()
      }
    };
  });

  // =========================================================================
  // 1. EnemySprite: Hit Flash White (0.06s)
  // =========================================================================
  describe('1. EnemySprite Hit Flash White (0.06s Zero-Allocation Frame Timer)', () => {
    it('initializes flashTimer to 0 and sprite without tint', () => {
      const enemy: EnemyEntity = {
        id: 'enemy_1',
        typeId: 'ordinary',
        name: '流寇先锋',
        currentHp: 100,
        maxHp: 100,
        moveSpeed: 1.0,
        armor: 10,
        shield: 0,
        wallDamage: 10,
        isBoss: false
      };

      const enemySprite = new EnemySprite(mockScene, enemy);
      expect(enemySprite.flashTimer).toBe(0);
      expect(enemySprite.isFlashing()).toBe(false);
      expect(enemySprite.baseSprite.tintFill).toBe(false);
    });

    it('sets tintFill to 0xffffff and flashTimer to 0.06s when playHitFlash is called', () => {
      const enemy: EnemyEntity = {
        id: 'enemy_1',
        typeId: 'ordinary',
        name: '流寇先锋',
        currentHp: 100,
        maxHp: 100,
        moveSpeed: 1.0,
        armor: 10,
        shield: 0,
        wallDamage: 10,
        isBoss: false
      };

      const enemySprite = new EnemySprite(mockScene, enemy);
      enemySprite.playHitFlash(false);

      expect(enemySprite.flashTimer).toBe(0.06);
      expect(enemySprite.isFlashing()).toBe(true);
      expect(enemySprite.baseSprite.tint).toBe(0xffffff);
      expect(enemySprite.baseSprite.tintFill).toBe(true);
    });

    it('clears tint precisely when 0.06s expires in update(deltaSec)', () => {
      const enemy: EnemyEntity = {
        id: 'enemy_1',
        typeId: 'ordinary',
        name: '流寇先锋',
        currentHp: 100,
        maxHp: 100,
        moveSpeed: 1.0,
        armor: 10,
        shield: 0,
        wallDamage: 10,
        isBoss: false
      };

      const enemySprite = new EnemySprite(mockScene, enemy);
      enemySprite.playHitFlash(false);

      // Advance frame by 0.03s (30ms) -> Still flashing
      enemySprite.update(0.03);
      expect(enemySprite.flashTimer).toBeCloseTo(0.03, 5);
      expect(enemySprite.isFlashing()).toBe(true);
      expect(enemySprite.baseSprite.tintFill).toBe(true);

      // Advance frame by another 0.03s -> Flash expires, tint cleared
      enemySprite.update(0.03);
      expect(enemySprite.flashTimer).toBe(0);
      expect(enemySprite.isFlashing()).toBe(false);
      expect(enemySprite.baseSprite.tintFill).toBe(false);
    });

    it('refreshes flash timer on consecutive hits without compounding state', () => {
      const enemy: EnemyEntity = {
        id: 'enemy_1',
        typeId: 'ordinary',
        name: '流寇先锋',
        currentHp: 100,
        maxHp: 100,
        moveSpeed: 1.0,
        armor: 10,
        shield: 0,
        wallDamage: 10,
        isBoss: false
      };

      const enemySprite = new EnemySprite(mockScene, enemy);
      enemySprite.playHitFlash(false);
      enemySprite.update(0.04);
      expect(enemySprite.flashTimer).toBeCloseTo(0.02, 5);

      // Hit again before timer expired
      enemySprite.playHitFlash(true);
      expect(enemySprite.flashTimer).toBe(0.06);
      expect(enemySprite.isFlashing()).toBe(true);
      expect(enemySprite.baseSprite.scaleX).toBe(1.12); // Crit impact scale pulse
    });
  });

  // =========================================================================
  // 2. EnemySprite: Dynamic Ghost Health Bar (0.3s Lerp & Instant Heal Snap)
  // =========================================================================
  describe('2. EnemySprite Dynamic Ghost Health Bar (0.3s Lerp & Instant Heal Snap)', () => {
    it('initializes ghostHp equal to currentHp', () => {
      const enemy: EnemyEntity = {
        id: 'enemy_1',
        typeId: 'ordinary',
        name: '流寇先锋',
        currentHp: 200,
        maxHp: 200,
        moveSpeed: 1.0,
        armor: 10,
        shield: 0,
        wallDamage: 10,
        isBoss: false
      };

      const enemySprite = new EnemySprite(mockScene, enemy);
      expect(enemySprite.ghostHp).toBe(200);
    });

    it('drops currentHp immediately while ghostHp smoothly lerps over 0.30s', () => {
      const enemy: EnemyEntity = {
        id: 'enemy_1',
        typeId: 'ordinary',
        name: '流寇先锋',
        currentHp: 300,
        maxHp: 300,
        moveSpeed: 1.0,
        armor: 10,
        shield: 0,
        wallDamage: 10,
        isBoss: false
      };

      const enemySprite = new EnemySprite(mockScene, enemy);

      // Take 150 damage (currentHp drops to 150)
      enemy.currentHp = 150;
      enemySprite.updateHp();

      expect(enemySprite.enemy.currentHp).toBe(150);
      expect(enemySprite.ghostHp).toBe(300); // Ghost bar has not moved yet

      // Advance by 0.10s (one-third of 0.30s lerp duration)
      // Lerp rate = (300 / 0.30) * 0.10 = 100 reduction
      enemySprite.update(0.10);
      expect(enemySprite.ghostHp).toBeCloseTo(200, 1);

      // Advance by another 0.20s -> fully catches up to 150
      enemySprite.update(0.20);
      expect(enemySprite.ghostHp).toBeCloseTo(150, 1);
    });

    it('snaps ghostHp immediately when healed or reset without lagging', () => {
      const enemy: EnemyEntity = {
        id: 'enemy_1',
        typeId: 'ordinary',
        name: '流寇先锋',
        currentHp: 100,
        maxHp: 300,
        moveSpeed: 1.0,
        armor: 10,
        shield: 0,
        wallDamage: 10,
        isBoss: false
      };

      const enemySprite = new EnemySprite(mockScene, enemy);
      enemySprite.ghostHp = 100;

      // Heal to 250
      enemySprite.updateHp(250);
      expect(enemySprite.enemy.currentHp).toBe(250);
      expect(enemySprite.ghostHp).toBe(250); // Snaps instantly!
    });
  });

  // =========================================================================
  // 3. EnemySprite: Boss Blood Aura Field & Elite Aura
  // =========================================================================
  describe('3. EnemySprite Boss Blood Aura Field & Elite Aura', () => {
    it('rotates Boss blood aura at 2.0 rad/s and renders demonic spikes', () => {
      const bossEnemy: EnemyEntity = {
        id: 'boss_1',
        typeId: 'boss_bear',
        name: '铁塔熊王',
        currentHp: 5000,
        maxHp: 5000,
        moveSpeed: 0.6,
        armor: 50,
        shield: 500,
        wallDamage: 100,
        isBoss: true
      };

      const bossSprite = new EnemySprite(mockScene, bossEnemy);
      const initialCommands = (bossSprite.auraGraphics as any).commands.length;
      expect(initialCommands).toBeGreaterThan(0);

      // Check fillStyle for blood dark red (0x880e4f)
      const hasBloodFill = (bossSprite.auraGraphics as any).commands.some(
        (c: any) => c.type === 'fillStyle' && c.color === 0x880e4f
      );
      expect(hasBloodFill).toBe(true);

      // Advance by 1.0s -> rotates by 2.0 rad
      bossSprite.update(1.0);
      expect((bossSprite as any).auraAngle).toBeCloseTo(2.0, 2);
    });

    it('renders elite amber aura for non-boss units with armor > 20', () => {
      const eliteEnemy: EnemyEntity = {
        id: 'elite_1',
        typeId: 'heavy',
        name: '金甲卫士',
        currentHp: 400,
        maxHp: 400,
        moveSpeed: 0.8,
        armor: 25,
        shield: 0,
        wallDamage: 20,
        isBoss: false
      };

      const eliteSprite = new EnemySprite(mockScene, eliteEnemy);
      const hasAmberLine = (eliteSprite.auraGraphics as any).commands.some(
        (c: any) => c.type === 'lineStyle' && c.color === 0xffa726
      );
      expect(hasAmberLine).toBe(true);
    });
  });

  // =========================================================================
  // 4. UnitSprite: Muzzle Heat Glow & High-Star Rune Glow
  // =========================================================================
  describe('4. UnitSprite Muzzle Heat Glow & High-Star Rune Glow', () => {
    let fireWeapon: WeaponInstance;

    beforeEach(() => {
      fireWeapon = {
        id: 'wp_1',
        configId: 'fire_lance',
        name: '梨花枪',
        faction: 'fire',
        star: 1,
        anchor: { row: 2, col: 2 },
        footprint: { width: 1, height: 1 },
        baseAtk: 50,
        attackInterval: 1.0,
        range: 4.0,
        isFortressOnly: false
      };
    });

    it('playMuzzleHeat() sets heatTimer to 0.8s and update fades it linearly', () => {
      const unitSprite = new UnitSprite(mockScene, fireWeapon);
      expect(unitSprite.heatTimer).toBe(0);

      unitSprite.playMuzzleHeat();
      expect(unitSprite.heatTimer).toBe(0.8);

      // Advance by 0.4s (halfway)
      unitSprite.update(0.4);
      expect(unitSprite.heatTimer).toBeCloseTo(0.4, 5);

      // Check heatGraphics has emissive orange-red (0xff3d00) and yellow (0xffff00) fills
      const heatCommands = (unitSprite as any).heatGraphics.commands;
      const hasOrangeRed = heatCommands.some((c: any) => c.type === 'fillStyle' && c.color === 0xff3d00);
      const hasYellow = heatCommands.some((c: any) => c.type === 'fillStyle' && c.color === 0xffff00);
      expect(hasOrangeRed).toBe(true);
      expect(hasYellow).toBe(true);

      // Advance by remaining 0.4s -> completely cools down
      unitSprite.update(0.4);
      expect(unitSprite.heatTimer).toBe(0);
      expect((unitSprite as any).heatGraphics.commands.length).toBe(0);
    });

    it('renders ★3 cyan pulsating border glow on unit card', () => {
      fireWeapon.star = 3;
      const unitSprite = new UnitSprite(mockScene, fireWeapon);

      unitSprite.update(0.016, 1000);
      const runeCommands = (unitSprite as any).runeGraphics.commands;
      const hasCyanLine = runeCommands.some((c: any) => c.type === 'lineStyle' && c.color === 0x00e5ff);
      expect(hasCyanLine).toBe(true);
    });

    it('renders ★4 golden radiant border glow with circulating micro-sparkles', () => {
      fireWeapon.star = 4;
      const unitSprite = new UnitSprite(mockScene, fireWeapon);

      unitSprite.update(0.016, 2000);
      const runeCommands = (unitSprite as any).runeGraphics.commands;
      const hasGoldLine = runeCommands.some((c: any) => c.type === 'lineStyle' && c.color === 0xffd700);
      const hasSparkleCircles = runeCommands.filter((c: any) => c.type === 'fillCircle').length >= 4;
      expect(hasGoldLine).toBe(true);
      expect(hasSparkleCircles).toBe(true);
    });
  });

  // =========================================================================
  // 5. ElementalVfxManager: Four GDD V3.0 Reactions
  // =========================================================================
  describe('5. ElementalVfxManager Four GDD V3.0 Reactions', () => {
    let vfxManager: ElementalVfxManager;
    let textSpawnCalls: any[] = [];

    beforeEach(() => {
      textSpawnCalls = [];
      mockScene.floatingTextPool = {
        spawn: vi.fn((x: number, y: number, content: string, style: string) => {
          textSpawnCalls.push({ x, y, content, style });
        })
      };
      vfxManager = new ElementalVfxManager(mockScene);
    });

    it('1. playFireBlast: shockwave ring + 12 fiery sparks + 3.5s scorch decal + 猛火轰爆!', () => {
      vfxManager.playFireBlast(400, 600);

      // Check flytext
      expect(textSpawnCalls).toHaveLength(1);
      expect(textSpawnCalls[0]).toEqual({
        x: 400,
        y: 575,
        content: '猛火轰爆!',
        style: 'fire'
      });

      // Check tweens: shockwave (1), 12 sparks, scorch decal (1) -> total 14 tweens
      expect(addedTweens.length).toBeGreaterThanOrEqual(14);
      const scorchTween = addedTweens.find((t: any) => t.duration === 3500);
      expect(scorchTween).toBeDefined();
    });

    it('2. playThunderJudgement: sky-to-ground vertical bolt + ground arcs + shield shatter + 雷火天劫!', () => {
      vfxManager.playThunderJudgement(350, 700);

      // Check flytext
      expect(textSpawnCalls).toHaveLength(1);
      expect(textSpawnCalls[0]).toEqual({
        x: 350,
        y: 675,
        content: '雷火天劫!',
        style: 'shock'
      });

      // Check tweens: lightning bolt (1), spiderweb (1), shatter (1)
      expect(addedTweens.length).toBeGreaterThanOrEqual(3);
    });

    it('3. playIceShatter: 10 polyhedral ice shards + frost mist ring + 碎冰崩裂!', () => {
      vfxManager.playIceShatter(300, 750);

      // Check flytext
      expect(textSpawnCalls).toHaveLength(1);
      expect(textSpawnCalls[0]).toEqual({
        x: 300,
        y: 725,
        content: '碎冰崩裂!',
        style: 'ice'
      });

      // Check 10 shards + 1 frost mist = 11 tweens
      expect(addedTweens.length).toBeGreaterThanOrEqual(11);
    });

    it('4. playNetherPoisonFlame: rising emerald flame pillar + 6 sulfur bubbles + 幽冥毒火!', () => {
      vfxManager.playNetherPoisonFlame(420, 800);

      // Check flytext
      expect(textSpawnCalls).toHaveLength(1);
      expect(textSpawnCalls[0]).toEqual({
        x: 420,
        y: 775,
        content: '幽冥毒火!',
        style: 'poison'
      });

      // Flame pillar (1) + 6 bubbles = 7 tweens
      expect(addedTweens.length).toBeGreaterThanOrEqual(7);
    });

    it('clearAll() disposes all managed graphics cleanly', () => {
      vfxManager.playFireBlast(400, 600);
      expect((vfxManager as any).activeGraphics.size).toBeGreaterThan(0);

      vfxManager.clearAll();
      expect((vfxManager as any).activeGraphics.size).toBe(0);
    });
  });

  // =========================================================================
  // 6. FloatingTextPool: Gold Calligraphy Crit Bounce & Elemental Styles
  // =========================================================================
  describe('6. FloatingTextPool Gold Calligraphy Crit Bounce & Elemental Styles', () => {
    it('crit text uses KaiTi font family, #ffd700 fill, #7f0000 stroke (thickness 4)', () => {
      const pool = new FloatingTextPool(mockScene, 5);
      pool.spawn(375, 800, '999', 'crit');

      const spawnedText = (pool as any).pool[0];
      expect(spawnedText.text).toBe('999');
      expect(spawnedText.style.color).toBe('#ffd700');
      expect(spawnedText.style.stroke).toBe('#7f0000');
      expect(spawnedText.style.strokeThickness).toBe(4);
      expect(spawnedText.style.fontFamily).toContain('KaiTi');
    });

    it('crit text animates spring bounce scale (1.8x -> 1.2x) and upward float (y - 55)', () => {
      const pool = new FloatingTextPool(mockScene, 5);
      pool.spawn(375, 800, '888', 'crit');

      const scaleTween = addedTweens.find((t: any) => t.scaleX === 1.2 && t.ease === 'Back.easeOut');
      const floatTween = addedTweens.find((t: any) => t.duration === 800 && t.ease === 'Cubic.easeOut');

      expect(scaleTween).toBeDefined();
      expect(scaleTween.duration).toBe(250);
      expect(floatTween).toBeDefined();

      // Emits 5 star sparkles around crit origin
      const sparkleTweens = addedTweens.filter((t: any) => t.duration === 320 && t.ease === 'Quad.easeOut');
      expect(sparkleTweens.length).toBe(5);
    });

    it('contains all specialized elemental reaction style presets', () => {
      expect(STYLE_COLORS.fire.color).toBe('#ff3d00');
      expect(STYLE_COLORS.ice.color).toBe('#00e5ff');
      expect(STYLE_COLORS.shock.color).toBe('#ffff00');
      expect(STYLE_COLORS.poison.color).toBe('#00e676');
      expect(STYLE_COLORS.heal.color).toBe('#69f0ae');
      expect(STYLE_COLORS.sunder.color).toBe('#ff1744');
    });
  });

  // =========================================================================
  // 7. ProjectileViewManager: 4-Point Starburst Diamond Flash & Smoke Puff
  // =========================================================================
  describe('7. ProjectileViewManager Starburst Muzzle Flash & Drifting Smoke Puff', () => {
    it('playMuzzleFlash produces 4-point starburst diamond flash and backward smoke puff', () => {
      const projManager = new ProjectileViewManager(mockScene);
      projManager.playMuzzleFlash(375, 500, -Math.PI / 2); // Firing upward

      // Expect 2 tweens: 1 for starburst flash (120ms), 1 for smoke puff (280ms)
      expect(addedTweens.length).toBe(2);

      const flashTween = addedTweens.find((t: any) => t.duration === 120 && t.scaleX === 1.6);
      const smokeTween = addedTweens.find((t: any) => t.duration === 280 && t.scaleX === 2.4);

      expect(flashTween).toBeDefined();
      expect(smokeTween).toBeDefined();
    });
  });
});
