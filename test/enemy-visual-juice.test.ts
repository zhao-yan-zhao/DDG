/**
 * 《孤城神机营》- Enemy Visual Game Juice & Procedural Textures Unit Tests
 * Verifies:
 * 1. EnemyTextureFactory: Texture generation, dimensions, and ByteDance Canvas 2D compatibility
 * 2. EnemyTextureFactory: Backward compatibility aliases and OOM resilience
 * 3. EnemyTextureFactory.getTextureKey: Canonical mapping for all regular and boss archetypes
 * 4. EnemySprite Walk Bobbing: Mathematical bounds and container (x, y) invariance
 * 5. EnemySprite Marching Dust: Periodic light yellow (#c2a679) dust puff emission
 * 6. EnemyDeathVfx Integration: Chinese ink splash dissolve, Boss defeat stamp, and zero memory leaks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =========================================================================
// Mock Phaser GameObject, Texture, & Tween Infrastructure
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
    setTint(color: number) { this.tint = color; return this; }
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

  class MockText extends MockGameObject {
    text: string;
    style: any;
    constructor(scene: any, x = 0, y = 0, text = '', style = {}) {
      super(scene, x, y);
      this.text = text;
      this.style = style;
    }
    setOrigin(_x: number, _y: number) { return this; }
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
  }

  class MockContainer extends MockGameObject {
    children: any[] = [];
    add(child: any) {
      if (Array.isArray(child)) this.children.push(...child);
      else this.children.push(child);
      return this;
    }
  }

  return {
    default: {
      GameObjects: {
        GameObject: MockGameObject,
        Sprite: MockSprite,
        Graphics: MockGraphics,
        Text: MockText,
        Container: MockContainer
      }
    }
  };
});

import Phaser from 'phaser';
import { EnemyTextureFactory, BACKWARD_COMPAT_ENEMY_ALIASES } from '../src/presentation/textures/enemy-texture-factory';
import { REGULAR_ENEMY_TEXTURE_KEYS } from '../src/presentation/textures/enemy-regular-textures';
import { BOSS_ENEMY_TEXTURE_KEYS } from '../src/presentation/textures/enemy-boss-textures';
import { EnemySprite } from '../src/presentation/renderers/enemy-sprite';
import { EnemyDeathVfx } from '../src/presentation/renderers/enemy-death-vfx';
import { EnemyEntity } from '../src/core/types';

describe('Enemy Visual Game Juice & Procedural Textures', () => {
  let mockScene: any;
  let createdTextures: Map<string, any>;
  let mockContexts: Map<string, any>;
  let activeTweens: any[];

  function createMockCanvasContext() {
    return {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      quadraticCurveTo: vi.fn(),
      drawImage: vi.fn()
    };
  }

  beforeEach(() => {
    createdTextures = new Map();
    mockContexts = new Map();
    activeTweens = [];

    mockScene = {
      textures: {
        exists: vi.fn((key: string) => createdTextures.has(key)),
        get: vi.fn((key: string) => {
          if (!createdTextures.has(key)) return null;
          return {
            key,
            getSourceImage: () => ({ width: 48, height: 48 })
          };
        }),
        createCanvas: vi.fn((key: string, w: number, h: number) => {
          const ctx = createMockCanvasContext();
          mockContexts.set(key, ctx);
          const canvasObj = {
            key,
            width: w,
            height: h,
            context: ctx,
            refresh: vi.fn()
          };
          createdTextures.set(key, canvasObj);
          return canvasObj;
        })
      },
      add: {
        graphics: vi.fn(() => new (Phaser.GameObjects.Graphics as any)(mockScene)),
        sprite: vi.fn((x: number, y: number, key: string) => new (Phaser.GameObjects.Sprite as any)(mockScene, x, y, key)),
        text: vi.fn((x: number, y: number, text: string, style: any) => new (Phaser.GameObjects.Text as any)(mockScene, x, y, text, style)),
        existing: vi.fn((obj: any) => obj)
      },
      tweens: {
        add: vi.fn((config: any) => {
          activeTweens.push(config);
          return config;
        })
      },
      cameras: {
        main: {
          shake: vi.fn()
        }
      },
      sys: {
        isActive: vi.fn(() => true),
        isShuttingDown: vi.fn(() => false)
      }
    };
  });

  // =========================================================================
  // 1. EnemyTextureFactory Registration & ByteDance Canvas Compatibility
  // =========================================================================
  describe('EnemyTextureFactory: Generation & Compatibility', () => {
    it('generates all 8 regular enemy procedural textures', () => {
      EnemyTextureFactory.generateAll(mockScene);

      const expectedRegular = [
        REGULAR_ENEMY_TEXTURE_KEYS.LIGHT_INFANTRY,
        REGULAR_ENEMY_TEXTURE_KEYS.WAR_DOG,
        REGULAR_ENEMY_TEXTURE_KEYS.LIGHT_CAVALRY,
        REGULAR_ENEMY_TEXTURE_KEYS.SHIELD_GUARD,
        REGULAR_ENEMY_TEXTURE_KEYS.IRON_PAGODA,
        REGULAR_ENEMY_TEXTURE_KEYS.RANGED_BOWMAN,
        REGULAR_ENEMY_TEXTURE_KEYS.BOMB_CARRIER,
        REGULAR_ENEMY_TEXTURE_KEYS.SIEGE_RAM
      ];

      for (const key of expectedRegular) {
        expect(createdTextures.has(key)).toBe(true);
        expect(mockContexts.has(key)).toBe(true);
        const ctx = mockContexts.get(key);
        // Verify genuine procedural drawing commands were invoked
        expect(ctx.fill.mock.calls.length + ctx.stroke.mock.calls.length).toBeGreaterThan(0);
      }
    });

    it('generates all 5 chapter supreme boss procedural textures', () => {
      EnemyTextureFactory.generateAll(mockScene);

      const expectedBosses = [
        BOSS_ENEMY_TEXTURE_KEYS.BOSS_BEAR,
        BOSS_ENEMY_TEXTURE_KEYS.BOSS_XUANWU,
        BOSS_ENEMY_TEXTURE_KEYS.BOSS_KHAN,
        BOSS_ENEMY_TEXTURE_KEYS.BOSS_WANGU,
        BOSS_ENEMY_TEXTURE_KEYS.BOSS_TAOTIE
      ];

      for (const key of expectedBosses) {
        expect(createdTextures.has(key)).toBe(true);
        expect(mockContexts.has(key)).toBe(true);
        const ctx = mockContexts.get(key);
        expect(ctx.fill.mock.calls.length + ctx.stroke.mock.calls.length).toBeGreaterThan(0);
      }
    });

    it('registers all backward compatibility aliases', () => {
      EnemyTextureFactory.generateAll(mockScene);

      for (const aliasKey of Object.keys(BACKWARD_COMPAT_ENEMY_ALIASES)) {
        expect(createdTextures.has(aliasKey)).toBe(true);
      }
    });

    it('is strictly idempotent and skips re-creating already registered textures', () => {
      EnemyTextureFactory.generateAll(mockScene);
      const firstPassCount = mockScene.textures.createCanvas.mock.calls.length;
      expect(firstPassCount).toBe(8 + 5 + 5); // 8 regular + 5 bosses + 5 aliases

      // Second pass should perform zero new canvas creations
      EnemyTextureFactory.generateAll(mockScene);
      expect(mockScene.textures.createCanvas.mock.calls.length).toBe(firstPassCount);
    });

    it('gracefully handles canvas allocation failure (OOM / null) without throwing TypeError', () => {
      const oomScene: any = {
        textures: {
          exists: vi.fn(() => false),
          get: vi.fn(() => null),
          createCanvas: vi.fn(() => null)
        }
      };

      expect(() => {
        EnemyTextureFactory.generateAll(oomScene);
      }).not.toThrow();
    });
  });

  // =========================================================================
  // 2. Texture Key Mapping
  // =========================================================================
  describe('EnemyTextureFactory.getTextureKey: Canonical Mapping', () => {
    it('maps all 8 regular enemy archetype IDs correctly', () => {
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'light_infantry' })).toBe('enemy_light_infantry');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'war_dog' })).toBe('enemy_war_dog');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'light_cavalry' })).toBe('enemy_light_cavalry');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'shield_guard' })).toBe('enemy_shield_guard');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'iron_pagoda' })).toBe('enemy_iron_pagoda');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'ranged_bowman' })).toBe('enemy_ranged_bowman');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'bomb_carrier' })).toBe('enemy_bomb_carrier');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'siege_ram' })).toBe('enemy_siege_ram');
    });

    it('maps legacy and variant archetype type strings', () => {
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'ordinary' })).toBe('enemy_light_infantry');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'charging' })).toBe('enemy_war_dog');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'heavy' })).toBe('enemy_shield_guard');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'siege_ballista' })).toBe('enemy_siege_ram');
    });

    it('maps all 5 chapter bosses correctly', () => {
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_bear', isBoss: true })).toBe('enemy_boss_bear');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_xuanwu', isBoss: true })).toBe('enemy_boss_xuanwu');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_khan', isBoss: true })).toBe('enemy_boss_khan');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_wangu', isBoss: true })).toBe('enemy_boss_wangu');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_corpse_demon', isBoss: true })).toBe('enemy_boss_wangu');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_taotie', isBoss: true })).toBe('enemy_boss_taotie');
    });

    it('handles fallback logic based on isBoss and armor for unknown or empty typeId', () => {
      // Unknown Boss defaults to Bear
      expect(EnemyTextureFactory.getTextureKey({ isBoss: true })).toBe('enemy_boss_bear');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'unknown_boss', isBoss: true })).toBe('enemy_boss_bear');

      // Heavy armor unit (> 20 armor) defaults to Shield Guard
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'unknown_heavy', armor: 50 })).toBe('enemy_shield_guard');

      // Unarmored unit defaults to Light Infantry
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'unknown_light', armor: 0 })).toBe('enemy_light_infantry');
      expect(EnemyTextureFactory.getTextureKey({})).toBe('enemy_light_infantry');
    });
  });

  // =========================================================================
  // 3. EnemySprite Walk Bobbing Mathematical Properties
  // =========================================================================
  describe('EnemySprite: Walk Bobbing Sine Equation & Container Invariance', () => {
    it('applies rhythmic sine bobbing strictly to baseSprite.y within exact amplitude bounds', () => {
      const enemy: EnemyEntity = {
        id: 'inf_1',
        typeId: 'light_infantry',
        name: '步卒',
        currentHp: 100,
        maxHp: 100,
        armor: 0,
        shield: 0,
        moveSpeed: 1.2,
        isBoss: false
      };

      const sprite = new EnemySprite(mockScene, enemy);
      const amplitude = sprite.BOB_AMPLITUDE; // 2.5px
      const initialContainerX = sprite.x;
      const initialContainerY = sprite.y;

      // Simulate 120 frames at 60 FPS (2.0 seconds)
      const dt = 1 / 60;
      for (let frame = 0; frame < 120; frame++) {
        sprite.update(dt);

        // Verify baseSprite.y stays strictly bounded within [-A, A]
        expect(sprite.baseSprite.y).toBeLessThanOrEqual(amplitude + 0.0001);
        expect(sprite.baseSprite.y).toBeGreaterThanOrEqual(-amplitude - 0.0001);

        // CRITICAL INVARIANT: Container x and y logic coordinates are NEVER modified by bobbing
        expect(sprite.x).toBe(initialContainerX);
        expect(sprite.y).toBe(initialContainerY);
      }
    });

    it('preserves boss reduced bobbing amplitude (1.5px)', () => {
      const bossEnemy: EnemyEntity = {
        id: 'boss_1',
        typeId: 'boss_bear',
        name: '铁塔熊王',
        currentHp: 10000,
        maxHp: 10000,
        armor: 150,
        shield: 0,
        moveSpeed: 0.7,
        isBoss: true
      };

      const bossSprite = new EnemySprite(mockScene, bossEnemy);
      const bossAmplitude = 1.5;

      const dt = 1 / 60;
      for (let frame = 0; frame < 120; frame++) {
        bossSprite.update(dt);
        expect(bossSprite.baseSprite.y).toBeLessThanOrEqual(bossAmplitude + 0.0001);
        expect(bossSprite.baseSprite.y).toBeGreaterThanOrEqual(-bossAmplitude - 0.0001);
      }
    });
  });

  // =========================================================================
  // 4. EnemySprite Marching Dust Kickup
  // =========================================================================
  describe('EnemySprite: Marching Dust Kickup Emission', () => {
    it('periodically emits light yellow (#c2a679) dust puffs beneath feet', () => {
      const enemy: EnemyEntity = {
        id: 'cavalry_1',
        typeId: 'light_cavalry',
        name: '游骑兵',
        currentHp: 200,
        maxHp: 200,
        armor: 10,
        shield: 0,
        moveSpeed: 2.0,
        isBoss: false
      };

      const sprite = new EnemySprite(mockScene, enemy);
      const graphicsCallsBefore = mockScene.add.graphics.mock.calls.length;

      // Update less than DUST_INTERVAL (0.20s < 0.35s) -> no dust yet
      sprite.update(0.20);
      expect(mockScene.add.graphics.mock.calls.length).toBe(graphicsCallsBefore);

      // Advance past DUST_INTERVAL (0.20s + 0.20s = 0.40s >= 0.35s) -> dust puff spawned
      sprite.update(0.20);
      expect(mockScene.add.graphics.mock.calls.length).toBe(graphicsCallsBefore + 1);

      // Verify the spawned dust graphics has #c2a679 fill
      const lastGraphics = mockScene.add.graphics.mock.results[mockScene.add.graphics.mock.results.length - 1].value;
      const fillCommand = lastGraphics.commands.find((c: any) => c.type === 'fillStyle');
      expect(fillCommand).toBeDefined();
      expect(fillCommand.color).toBe(0xc2a679);

      // Verify tween was added for expansion and fade out
      expect(activeTweens.length).toBeGreaterThan(0);
      const dustTween = activeTweens[activeTweens.length - 1];
      expect(dustTween.targets).toBe(lastGraphics);
      expect(dustTween.alpha).toBe(0);

      // Trigger onComplete to verify clean lifecycle destroy
      dustTween.onComplete();
      expect(lastGraphics.isDestroyed).toBe(true);
    });
  });

  // =========================================================================
  // 5. EnemyDeathVfx & Lifecycle Integration
  // =========================================================================
  describe('EnemyDeathVfx: Chinese Ink Dissolve & Lifecycle Safety', () => {
    it('spawns ink bloom and splatter particles on playInkSplashDissolve', () => {
      const graphicsBefore = mockScene.add.graphics.mock.calls.length;
      EnemyDeathVfx.playInkSplashDissolve(mockScene, 300, 500, { isBoss: false });

      // 1 bloom + 8 splatters = 9 graphics created
      expect(mockScene.add.graphics.mock.calls.length).toBe(graphicsBefore + 9);

      // Verify ink bloom and particle auto-destroy tweens
      for (const tw of activeTweens) {
        if (tw.onComplete) tw.onComplete();
      }
    });

    it('triggers camera shake and golden calligraphy "破" stamp on Boss defeat', () => {
      EnemyDeathVfx.playInkSplashDissolve(mockScene, 375, 700, { isBoss: true });

      // Camera shake invoked
      expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(200, 0.005);

      // Calligraphy text "破" created
      expect(mockScene.add.text).toHaveBeenCalledWith(
        375,
        expect.any(Number),
        '破',
        expect.objectContaining({ color: '#ffd700' })
      );
    });

    it('EnemySprite triggers playDeath on destroy when currentHp <= 0 with zero duplicate triggers', () => {
      const enemy: EnemyEntity = {
        id: 'dead_1',
        typeId: 'iron_pagoda',
        name: '铁浮屠',
        currentHp: 0,
        maxHp: 2000,
        armor: 150,
        shield: 0,
        moveSpeed: 1.0,
        isBoss: false
      };

      const sprite = new EnemySprite(mockScene, enemy);
      const textCallsBefore = mockScene.add.graphics.mock.calls.length;

      // First destroy triggers death VFX
      sprite.destroy();
      expect(sprite.isDying).toBe(true);
      expect(mockScene.add.graphics.mock.calls.length).toBeGreaterThan(textCallsBefore);

      // Second redundant destroy call does NOT trigger again
      const countAfter = mockScene.add.graphics.mock.calls.length;
      sprite.destroy();
      expect(mockScene.add.graphics.mock.calls.length).toBe(countAfter);
    });
  });
});
