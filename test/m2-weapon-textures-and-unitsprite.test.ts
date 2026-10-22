/**
 * 《孤城神机营》- Milestone M2 Verification Suite
 * Tests:
 * 1. WeaponTextureFactory: All 16 Gongbi procedural weapon textures across 4 factions
 * 2. WeaponTextureFactory: Footprints (1x1, 1x2, 2x1, 2x2) and backward compatibility aliases
 * 3. WeaponTextureFactory.getTextureKey: Canonical and alias resolution
 * 4. UnitSprite: 2.5D physical base (diffuse drop shadow, beveled chamfer, plinth, highlight)
 * 5. UnitSprite: Star level visual progression (★1 clean, ★2 brackets, ★3 crests, ★4 celestial)
 * 6. UnitSprite: Dynamic Y-depth sorting (depth = 10 + floor(y * 0.1), drag override 100)
 * 7. UnitSprite: Muzzle heat glow & High-star rune animation backwards compatibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =========================================================================
// Mock Phaser Infrastructure for Headless Vitest
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
    setPosition(x = 0, y = 0) { this.x = x; this.y = y; return this; }
    setY(y = 0) { this.y = y; return this; }
    setDisplaySize(w: number, h: number) { this.width = w; this.height = h; return this; }
    setTexture(key: string) { return this; }
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
    override setY(y: number) { this.y = y; return this; }
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

import {
  WeaponTextureFactory,
  ALL_WEAPON_TEXTURE_KEYS,
  BACKWARD_COMPAT_WEAPON_ALIASES
} from '../src/presentation/textures/weapon-texture-factory';
import { SHENJI_WEAPON_TEXTURE_KEYS } from '../src/presentation/textures/weapon-shenji-textures';
import { MOHIST_WEAPON_TEXTURE_KEYS } from '../src/presentation/textures/weapon-mohist-textures';
import { FORTRESS_WEAPON_TEXTURE_KEYS } from '../src/presentation/textures/weapon-fortress-textures';
import { QIMEN_WEAPON_TEXTURE_KEYS } from '../src/presentation/textures/weapon-qimen-textures';
import { UnitSprite } from '../src/presentation/renderers/unit-sprite';
import { WeaponInstance, StarLevel } from '../src/core/types';

describe('Milestone M2: R2 2.5D Heavy-Color Weapon Rendering & UnitSprite Upgrade', () => {
  // =========================================================================
  // Part 1: Mock Texture Scene & Canvas Context
  // =========================================================================
  let createdCanvases: Map<string, { width: number; height: number; context: any }>;
  let mockScene: any;

  function createMockCanvas(w: number, h: number) {
    const commands: any[] = [];
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      fillRect: vi.fn((x, y, w, h) => commands.push({ type: 'fillRect', x, y, w, h })),
      strokeRect: vi.fn((x, y, w, h) => commands.push({ type: 'strokeRect', x, y, w, h })),
      beginPath: vi.fn(() => commands.push({ type: 'beginPath' })),
      closePath: vi.fn(() => commands.push({ type: 'closePath' })),
      arc: vi.fn((x, y, r, sa, ea) => commands.push({ type: 'arc', x, y, r, sa, ea })),
      ellipse: vi.fn((x, y, rx, ry, rot, sa, ea) => commands.push({ type: 'ellipse', x, y, rx, ry, rot, sa, ea })),
      moveTo: vi.fn((x, y) => commands.push({ type: 'moveTo', x, y })),
      lineTo: vi.fn((x, y) => commands.push({ type: 'lineTo', x, y })),
      quadraticCurveTo: vi.fn((cpx, cpy, x, y) => commands.push({ type: 'quadraticCurveTo', cpx, cpy, x, y })),
      stroke: vi.fn(() => commands.push({ type: 'stroke' })),
      fill: vi.fn(() => commands.push({ type: 'fill' })),
      drawImage: vi.fn((img, dx, dy) => commands.push({ type: 'drawImage', dx, dy })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
    };

    return {
      width: w,
      height: h,
      context: ctx,
      commands,
      refresh: vi.fn(),
      getSourceImage: () => ({ width: w, height: h })
    };
  }

  beforeEach(() => {
    createdCanvases = new Map();

    mockScene = {
      textures: {
        exists: vi.fn((key: string) => createdCanvases.has(key)),
        createCanvas: vi.fn((key: string, w: number, h: number) => {
          const c = createMockCanvas(w, h);
          createdCanvases.set(key, c);
          return c;
        }),
        get: vi.fn((key: string) => createdCanvases.get(key) || null)
      },
      add: {
        graphics: () => {
          const commands: any[] = [];
          return {
            commands,
            clear: vi.fn(() => { commands.length = 0; }),
            fillStyle: vi.fn((c, a) => commands.push({ type: 'fillStyle', color: c, alpha: a })),
            lineStyle: vi.fn((w, c, a) => commands.push({ type: 'lineStyle', width: w, color: c, alpha: a })),
            fillRect: vi.fn((x, y, w, h) => commands.push({ type: 'fillRect', x, y, w, h })),
            fillRoundedRect: vi.fn((x, y, w, h, r) => commands.push({ type: 'fillRoundedRect', x, y, w, h, r })),
            strokeRoundedRect: vi.fn((x, y, w, h, r) => commands.push({ type: 'strokeRoundedRect', x, y, w, h, r })),
            fillCircle: vi.fn((x, y, r) => commands.push({ type: 'fillCircle', x, y, r })),
            strokeCircle: vi.fn((x, y, r) => commands.push({ type: 'strokeCircle', x, y, r })),
            lineBetween: vi.fn((x1, y1, x2, y2) => commands.push({ type: 'lineBetween', x1, y1, x2, y2 })),
            beginPath: vi.fn(() => commands.push({ type: 'beginPath' })),
            moveTo: vi.fn((x, y) => commands.push({ type: 'moveTo', x, y })),
            lineTo: vi.fn((x, y) => commands.push({ type: 'lineTo', x, y })),
            closePath: vi.fn(() => commands.push({ type: 'closePath' })),
            fillPath: vi.fn(() => commands.push({ type: 'fillPath' })),
            strokePath: vi.fn(() => commands.push({ type: 'strokePath' })),
            destroy: vi.fn()
          };
        },
        text: () => ({
          setText: vi.fn().mockReturnThis(),
          setOrigin: vi.fn().mockReturnThis(),
          setY: vi.fn().mockReturnThis(),
          setStyle: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        }),
        image: (_x: number, _y: number, key: string) => ({
          key,
          setTexture: vi.fn(),
          setDisplaySize: vi.fn(),
          setPosition: vi.fn(),
          setVisible: vi.fn(),
          setAlpha: vi.fn(),
          destroy: vi.fn()
        }),
        existing: vi.fn()
      },
      tweens: {
        add: vi.fn()
      }
    };
  });

  // =========================================================================
  // Part 2: WeaponTextureFactory Generation Suite
  // =========================================================================
  describe('1. WeaponTextureFactory: All 16 Weapons & Aliases Generation', () => {
    it('generates all 16 canonical Gongbi war machine textures', () => {
      WeaponTextureFactory.generateAll(mockScene);

      // Shenji Faction (Fire)
      expect(createdCanvases.has(SHENJI_WEAPON_TEXTURE_KEYS.FIRE_LANCE)).toBe(true);
      expect(createdCanvases.has(SHENJI_WEAPON_TEXTURE_KEYS.ROCKET_BOX)).toBe(true);
      expect(createdCanvases.has(SHENJI_WEAPON_TEXTURE_KEYS.THUNDER_THROWER)).toBe(true);
      expect(createdCanvases.has(SHENJI_WEAPON_TEXTURE_KEYS.RED_CANNON)).toBe(true);

      // Mohist Faction
      expect(createdCanvases.has(MOHIST_WEAPON_TEXTURE_KEYS.FLAME_BEAST)).toBe(true);
      expect(createdCanvases.has(MOHIST_WEAPON_TEXTURE_KEYS.REPEATING_CROSSBOW)).toBe(true);
      expect(createdCanvases.has(MOHIST_WEAPON_TEXTURE_KEYS.BED_CROSSBOW)).toBe(true);
      expect(createdCanvases.has(MOHIST_WEAPON_TEXTURE_KEYS.CATAPULT)).toBe(true);

      // Fortress Faction
      expect(createdCanvases.has(FORTRESS_WEAPON_TEXTURE_KEYS.BARRICADE)).toBe(true);
      expect(createdCanvases.has(FORTRESS_WEAPON_TEXTURE_KEYS.OIL_CABINET)).toBe(true);
      expect(createdCanvases.has(FORTRESS_WEAPON_TEXTURE_KEYS.ELECTRIC_GRID)).toBe(true);
      expect(createdCanvases.has(FORTRESS_WEAPON_TEXTURE_KEYS.SPEAR_CAMP)).toBe(true);

      // Qimen Faction
      expect(createdCanvases.has(QIMEN_WEAPON_TEXTURE_KEYS.POWDER_BUREAU)).toBe(true);
      expect(createdCanvases.has(QIMEN_WEAPON_TEXTURE_KEYS.WAR_DRUM)).toBe(true);
      expect(createdCanvases.has(QIMEN_WEAPON_TEXTURE_KEYS.STARGAZER)).toBe(true);
      expect(createdCanvases.has(QIMEN_WEAPON_TEXTURE_KEYS.LUBAN_WORKSHOP)).toBe(true);
    });

    it('generates accurate multi-cell footprint texture dimensions', () => {
      WeaponTextureFactory.generateAll(mockScene);

      // 1x1 weapons: 72x72
      const fireLance = createdCanvases.get(SHENJI_WEAPON_TEXTURE_KEYS.FIRE_LANCE)!;
      expect(fireLance.width).toBe(72);
      expect(fireLance.height).toBe(72);

      // 1x2 red_cannon: 72x144
      const redCannon = createdCanvases.get(SHENJI_WEAPON_TEXTURE_KEYS.RED_CANNON)!;
      expect(redCannon.width).toBe(72);
      expect(redCannon.height).toBe(144);

      // 2x1 bed_crossbow: 144x72
      const bedCrossbow = createdCanvases.get(MOHIST_WEAPON_TEXTURE_KEYS.BED_CROSSBOW)!;
      expect(bedCrossbow.width).toBe(144);
      expect(bedCrossbow.height).toBe(72);

      // 2x1 war_drum: 144x72
      const warDrum = createdCanvases.get(QIMEN_WEAPON_TEXTURE_KEYS.WAR_DRUM)!;
      expect(warDrum.width).toBe(144);
      expect(warDrum.height).toBe(72);

      // 2x2 catapult: 144x144
      const catapult = createdCanvases.get(MOHIST_WEAPON_TEXTURE_KEYS.CATAPULT)!;
      expect(catapult.width).toBe(144);
      expect(catapult.height).toBe(144);
    });

    it('registers backward compatibility aliases without duplicating existing textures', () => {
      WeaponTextureFactory.generateAll(mockScene);

      expect(createdCanvases.has('weapon_cannon')).toBe(true);
      expect(createdCanvases.has('weapon_iron_caltrop')).toBe(true);

      // Running a second time is idempotent (safely early-returns)
      const canvasCountBefore = createdCanvases.size;
      WeaponTextureFactory.generateAll(mockScene);
      expect(createdCanvases.size).toBe(canvasCountBefore);
    });
  });

  // =========================================================================
  // Part 3: WeaponTextureFactory.getTextureKey Resolution Suite
  // =========================================================================
  describe('2. WeaponTextureFactory.getTextureKey Resolution', () => {
    it('resolves canonical weapon config IDs to their canonical texture keys', () => {
      expect(WeaponTextureFactory.getTextureKey('fire_lance')).toBe('weapon_fire_lance');
      expect(WeaponTextureFactory.getTextureKey('rocket_box')).toBe('weapon_rocket_box');
      expect(WeaponTextureFactory.getTextureKey('thunder_thrower')).toBe('weapon_thunder_thrower');
      expect(WeaponTextureFactory.getTextureKey('red_cannon')).toBe('weapon_red_cannon');

      expect(WeaponTextureFactory.getTextureKey('flame_beast')).toBe('weapon_flame_beast');
      expect(WeaponTextureFactory.getTextureKey('repeating_crossbow')).toBe('weapon_repeating_crossbow');
      expect(WeaponTextureFactory.getTextureKey('bed_crossbow')).toBe('weapon_bed_crossbow');
      expect(WeaponTextureFactory.getTextureKey('catapult')).toBe('weapon_catapult');

      expect(WeaponTextureFactory.getTextureKey('barricade')).toBe('weapon_barricade');
      expect(WeaponTextureFactory.getTextureKey('oil_cabinet')).toBe('weapon_oil_cabinet');
      expect(WeaponTextureFactory.getTextureKey('electric_grid')).toBe('weapon_electric_grid');
      expect(WeaponTextureFactory.getTextureKey('spear_camp')).toBe('weapon_spear_camp');

      expect(WeaponTextureFactory.getTextureKey('powder_bureau')).toBe('weapon_powder_bureau');
      expect(WeaponTextureFactory.getTextureKey('war_drum')).toBe('weapon_war_drum');
      expect(WeaponTextureFactory.getTextureKey('stargazer')).toBe('weapon_stargazer');
      expect(WeaponTextureFactory.getTextureKey('luban_workshop')).toBe('weapon_luban_workshop');
    });

    it('resolves legacy alias IDs correctly to canonical textures', () => {
      expect(WeaponTextureFactory.getTextureKey('cannon')).toBe('weapon_red_cannon');
      expect(WeaponTextureFactory.getTextureKey('weapon_cannon')).toBe('weapon_red_cannon');
      expect(WeaponTextureFactory.getTextureKey('iron_barricade')).toBe('weapon_barricade');
      expect(WeaponTextureFactory.getTextureKey('iron_caltrop')).toBe('weapon_barricade');
      expect(WeaponTextureFactory.getTextureKey('weapon_iron_caltrop')).toBe('weapon_barricade');
    });

    it('handles weapon_ prefix gracefully', () => {
      expect(WeaponTextureFactory.getTextureKey('weapon_fire_lance')).toBe('weapon_fire_lance');
      expect(WeaponTextureFactory.getTextureKey('weapon_red_cannon')).toBe('weapon_red_cannon');
      expect(WeaponTextureFactory.getTextureKey('weapon_catapult')).toBe('weapon_catapult');
    });

    it('returns default fallback when given empty or null string', () => {
      expect(WeaponTextureFactory.getTextureKey('')).toBe('weapon_fire_lance');
      expect(WeaponTextureFactory.getTextureKey(null as any)).toBe('weapon_fire_lance');
    });
  });

  // =========================================================================
  // Part 4: UnitSprite 2.5D Physical Base & Footprint Suite
  // =========================================================================
  describe('3. UnitSprite: 2.5D Physical Base & Multi-cell Footprint', () => {
    function makeWeapon(configId: string, star: StarLevel = 1, width = 1, height = 1, faction: any = 'fire'): WeaponInstance {
      return {
        id: 'wp_' + configId,
        configId,
        name: configId,
        faction,
        star,
        anchor: { row: 2, col: 2 },
        footprint: { width, height },
        baseAtk: 50,
        attackInterval: 1.0,
        range: 5.0,
        isFortressOnly: false
      };
    }

    it('renders 2.5D physical base with drop shadow, beveled chamfer, and top highlight', () => {
      const weapon = makeWeapon('fire_lance', 1);
      const unitSprite = new UnitSprite(mockScene, weapon);

      const bgCommands = (unitSprite as any).bgGraphics.commands;

      // 1. Contact drop shadow
      const hasShadow = bgCommands.some(
        (c: any) => c.type === 'fillStyle' && c.color === 0x000000 && c.alpha === 0.35
      );
      expect(hasShadow).toBe(true);

      // 2. Beveled vertical chamfer lip (dark shaded thickness)
      const hasChamfer = bgCommands.some(
        (c: any) => c.type === 'fillStyle' && c.color === 0x1a1a1a && c.alpha === 0.75
      );
      expect(hasChamfer).toBe(true);

      // 3. Top surface highlight catch-line
      const hasHighlightLine = bgCommands.some(
        (c: any) => c.type === 'lineBetween'
      );
      expect(hasHighlightLine).toBe(true);
    });

    it('renders ★1 clean timber/bronze with corner rivets', () => {
      const weapon = makeWeapon('fire_lance', 1);
      const unitSprite = new UnitSprite(mockScene, weapon);
      const bgCommands = (unitSprite as any).bgGraphics.commands;

      // Has 4 corner rivet circles
      const fillCircles = bgCommands.filter((c: any) => c.type === 'fillCircle');
      expect(fillCircles.length).toBeGreaterThanOrEqual(4);
    });

    it('renders ★2 reinforced brackets on all 4 corners', () => {
      const weapon = makeWeapon('fire_lance', 2);
      const unitSprite = new UnitSprite(mockScene, weapon);
      const bgCommands = (unitSprite as any).bgGraphics.commands;

      // Has highlight line + 4 L-angle bracket lines
      const lineBetweenCommands = bgCommands.filter((c: any) => c.type === 'lineBetween');
      expect(lineBetweenCommands.length).toBeGreaterThanOrEqual(5); // 1 highlight + 4 brackets
    });

    it('renders ★3 dragon/beast corner crests and ornate inlay', () => {
      const weapon = makeWeapon('fire_lance', 3);
      const unitSprite = new UnitSprite(mockScene, weapon);
      const bgCommands = (unitSprite as any).bgGraphics.commands;

      // Has corner crest rects and cyan/accent line
      const cornerRects = bgCommands.filter((c: any) => c.type === 'fillRect');
      expect(cornerRects.length).toBeGreaterThanOrEqual(4);

      const strokeRounded = bgCommands.filter((c: any) => c.type === 'strokeRoundedRect');
      expect(strokeRounded.length).toBeGreaterThanOrEqual(2);
    });

    it('renders ★4 golden celestial aura and diamond core studs', () => {
      const weapon = makeWeapon('fire_lance', 4);
      const unitSprite = new UnitSprite(mockScene, weapon);
      const bgCommands = (unitSprite as any).bgGraphics.commands;

      // Has gold outer border (0xffd700)
      const hasGoldBorder = bgCommands.some(
        (c: any) => c.type === 'lineStyle' && c.color === 0xffd700
      );
      expect(hasGoldBorder).toBe(true);

      // Has golden corner seal rects
      const goldFills = bgCommands.filter(
        (c: any) => c.type === 'fillStyle' && c.color === 0xffd700
      );
      expect(goldFills.length).toBeGreaterThanOrEqual(1);
    });

    it('supports 1x2, 2x1, and 2x2 multi-cell footprints seamlessly', () => {
      // 1x2 Red Cannon
      const cannonWeapon = makeWeapon('red_cannon', 2, 1, 2);
      const cannonSprite = new UnitSprite(mockScene, cannonWeapon);
      expect(cannonSprite).toBeDefined();

      // 2x1 Bed Crossbow
      const bedWeapon = makeWeapon('bed_crossbow', 2, 2, 1);
      const bedSprite = new UnitSprite(mockScene, bedWeapon);
      expect(bedSprite).toBeDefined();

      // 2x2 Catapult
      const catapultWeapon = makeWeapon('catapult', 3, 2, 2);
      const catapultSprite = new UnitSprite(mockScene, catapultWeapon);
      expect(catapultSprite).toBeDefined();
    });
  });

  // =========================================================================
  // Part 5: Dynamic Y-Depth Sorting Suite
  // =========================================================================
  describe('4. UnitSprite: Dynamic Y-Depth Sorting', () => {
    function makeWeapon(): WeaponInstance {
      return {
        id: 'wp_test',
        configId: 'fire_lance',
        name: '火铳',
        faction: 'fire',
        star: 1,
        anchor: { row: 1, col: 1 },
        footprint: { width: 1, height: 1 },
        baseAtk: 50,
        attackInterval: 1.0,
        range: 5.0,
        isFortressOnly: false
      };
    }

    it('sets initial depth according to Y coordinate: depth = 10 + floor(y * 0.1)', () => {
      const unitSprite = new UnitSprite(mockScene, makeWeapon());

      unitSprite.y = 250;
      unitSprite.updateDepth();
      expect(unitSprite.depth).toBe(10 + Math.floor(250 * 0.1)); // 35

      unitSprite.y = 600;
      unitSprite.updateDepth();
      expect(unitSprite.depth).toBe(10 + Math.floor(600 * 0.1)); // 70
    });

    it('automatically recalculates depth when setPosition or setY is called', () => {
      const unitSprite = new UnitSprite(mockScene, makeWeapon());

      unitSprite.setPosition(100, 320);
      expect(unitSprite.depth).toBe(10 + Math.floor(320 * 0.1)); // 42

      unitSprite.setY(480);
      expect(unitSprite.depth).toBe(10 + Math.floor(480 * 0.1)); // 58
    });

    it('elevates depth to 100 during dragging and restores on drag release', () => {
      const unitSprite = new UnitSprite(mockScene, makeWeapon());
      unitSprite.setPosition(100, 300);
      expect(unitSprite.depth).toBe(40);

      // Start dragging
      unitSprite.setDragging(true);
      expect(unitSprite.depth).toBe(100);

      // Drag to new coordinate
      unitSprite.setPosition(200, 500);
      expect(unitSprite.depth).toBe(100); // Stays at 100 while dragging

      // Release drag
      unitSprite.setDragging(false);
      expect(unitSprite.depth).toBe(10 + Math.floor(500 * 0.1)); // 60
    });
  });

  // =========================================================================
  // Part 6: Juice & Animation Backwards Compatibility Suite
  // =========================================================================
  describe('5. UnitSprite: Juice & Combat Animation Compatibility', () => {
    it('preserves muzzle heat timer countdown and fading graphics', () => {
      const weapon: WeaponInstance = {
        id: 'wp_test',
        configId: 'fire_lance',
        name: '火铳',
        faction: 'fire',
        star: 1,
        anchor: { row: 1, col: 1 },
        footprint: { width: 1, height: 1 },
        baseAtk: 50,
        attackInterval: 1.0,
        range: 5.0,
        isFortressOnly: false
      };
      const unitSprite = new UnitSprite(mockScene, weapon);

      expect(unitSprite.heatTimer).toBe(0);
      unitSprite.playMuzzleHeat();
      expect(unitSprite.heatTimer).toBe(0.8);

      unitSprite.update(0.4);
      expect(unitSprite.heatTimer).toBeCloseTo(0.4, 5);

      unitSprite.update(0.4);
      expect(unitSprite.heatTimer).toBe(0);

      const heatCmds = (unitSprite as any).heatGraphics.commands;
      expect(heatCmds.length).toBe(0);
    });

    it('preserves high-star rune glow pulsation on ★3 and ★4', () => {
      const weaponStar3: WeaponInstance = {
        id: 'wp_star3',
        configId: 'fire_lance',
        name: '火铳',
        faction: 'fire',
        star: 3,
        anchor: { row: 1, col: 1 },
        footprint: { width: 1, height: 1 },
        baseAtk: 50,
        attackInterval: 1.0,
        range: 5.0,
        isFortressOnly: false
      };
      const unitSprite3 = new UnitSprite(mockScene, weaponStar3);
      unitSprite3.update(0.016, 1000);
      const runeCmds3 = (unitSprite3 as any).runeGraphics.commands;
      expect(runeCmds3.some((c: any) => c.type === 'lineStyle' && c.color === 0x00e5ff)).toBe(true);

      const weaponStar4: WeaponInstance = {
        ...weaponStar3,
        id: 'wp_star4',
        star: 4
      };
      const unitSprite4 = new UnitSprite(mockScene, weaponStar4);
      unitSprite4.update(0.016, 1000);
      const runeCmds4 = (unitSprite4 as any).runeGraphics.commands;
      expect(runeCmds4.some((c: any) => c.type === 'lineStyle' && c.color === 0xffd700)).toBe(true);
    });
  });
});
