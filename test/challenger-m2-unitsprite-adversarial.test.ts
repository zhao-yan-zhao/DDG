/**
 * 《孤城神机营》- Challenger M2 Adversarial Verification Suite
 *
 * EMPIRICAL ADVERSARIAL STRESS-TEST FOR UnitSprite (src/presentation/renderers/unit-sprite.ts):
 * 1. Dynamic Depth Sorting across boundary, intermediate, and off-screen Y positions.
 * 2. Drag Depth Override: Lock to 100 during dragging, maintain 100 while moving in drag, restore on release.
 * 3. Multi-Cell Dimensions: Accurate physical base dimensions for 1x1, 1x2, 2x1, and 2x2 footprints.
 * 4. Star Level Visuals: ★1, ★2, ★3, and ★4 distinct graphics drawing commands on bgGraphics & runeGraphics.
 * 5. Muzzle Heat Glow: playMuzzleHeat countdown, multi-ring heat circles, re-triggering, clamping, and decay.
 * 6. Edge cases: Rapid drag toggles, in-place star upgrades, layer ordering, and perspective scaling.
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

import { UnitSprite, FACTION_COLORS } from '../src/presentation/renderers/unit-sprite';
import { GRID_CONFIG } from '../src/presentation/touch/touch-controller';
import { WeaponInstance, StarLevel, Faction } from '../src/core/types';

describe('Adversarial Empirical Verification: UnitSprite 2.5D Physical Base & Depth Sorting', () => {
  let mockScene: any;

  function createMockWeapon(
    configId: string = 'fire_lance',
    star: StarLevel = 1,
    width: number = 1,
    height: number = 1,
    faction: Faction = 'fire'
  ): WeaponInstance {
    return {
      id: `wp_${configId}_${star}`,
      configId,
      name: configId === 'fire_lance' ? '神机火铳' : configId,
      faction,
      star,
      anchor: { row: 2, col: 2 },
      footprint: { width, height },
      baseAtk: 100,
      attackInterval: 1.0,
      range: 5.0,
      isFortressOnly: false
    };
  }

  beforeEach(() => {
    mockScene = {
      textures: {
        exists: vi.fn(() => false),
        get: vi.fn(() => null)
      },
      add: {
        graphics: () => {
          const commands: any[] = [];
          return {
            commands,
            isDestroyed: false,
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
            destroy: vi.fn(function(this: any) { this.isDestroyed = true; })
          };
        },
        text: (x: number, y: number, text: string, style: any) => ({
          x,
          y,
          text,
          style: { ...style },
          isDestroyed: false,
          setText: vi.fn(function(this: any, t: string) { this.text = t; return this; }),
          setOrigin: vi.fn().mockReturnThis(),
          setY: vi.fn(function(this: any, newY: number) { this.y = newY; return this; }),
          setStyle: vi.fn(function(this: any, s: any) { this.style = { ...this.style, ...s }; return this; }),
          destroy: vi.fn(function(this: any) { this.isDestroyed = true; })
        }),
        image: (_x: number, _y: number, key: string) => ({
          key,
          isDestroyed: false,
          setTexture: vi.fn(),
          setDisplaySize: vi.fn(),
          setPosition: vi.fn(),
          setVisible: vi.fn(),
          setAlpha: vi.fn(),
          destroy: vi.fn(function(this: any) { this.isDestroyed = true; })
        }),
        existing: vi.fn()
      },
      tweens: {
        add: vi.fn()
      }
    };
  });

  // =========================================================================
  // 1. Dynamic Depth Sorting across varying Y positions
  // =========================================================================
  describe('1. Dynamic Depth Sorting across varying Y positions', () => {
    it('accurately computes depth = 10 + floor(y * 0.1) for key game coordinates', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());

      // Top of sand table (y = 160) -> depth 10 + floor(16) = 26
      sprite.setPosition(300, 160);
      expect(sprite.depth).toBe(26);

      // Sand table / parapet boundary (y = 540) -> depth 10 + floor(54) = 64
      sprite.setPosition(300, 540);
      expect(sprite.depth).toBe(64);

      // Bench region (y = 1240) -> depth 10 + floor(124) = 134
      sprite.setPosition(300, 1240);
      expect(sprite.depth).toBe(134);

      // Top screen edge (y = 0) -> depth 10
      sprite.setPosition(300, 0);
      expect(sprite.depth).toBe(10);

      // Bottom screen edge (y = 1334) -> depth 10 + floor(133.4) = 143
      sprite.setPosition(300, 1334);
      expect(sprite.depth).toBe(143);
    });

    it('handles floating-point coordinate boundaries and rounding correctly', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());

      // 169.99 px -> floor(16.999) = 16 -> depth 26
      sprite.setPosition(200, 169.99);
      expect(sprite.depth).toBe(26);

      // 170.01 px -> floor(17.001) = 17 -> depth 27
      sprite.setPosition(200, 170.01);
      expect(sprite.depth).toBe(27);

      // 539.99 px -> floor(53.999) = 53 -> depth 63
      sprite.setPosition(200, 539.99);
      expect(sprite.depth).toBe(63);

      // 540.00 px -> floor(54.0) = 54 -> depth 64
      sprite.setPosition(200, 540.0);
      expect(sprite.depth).toBe(64);
    });

    it('handles negative Y coordinates gracefully without crashing', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());

      // y = -50 -> floor(-5.0) = -5 -> depth = 10 - 5 = 5
      sprite.setPosition(100, -50);
      expect(sprite.depth).toBe(5);

      // y = -100 -> floor(-10.0) = -10 -> depth = 10 - 10 = 0
      sprite.setPosition(100, -100);
      expect(sprite.depth).toBe(0);
    });

    it('updates depth via setY(y) as well as setPosition(x, y)', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());

      sprite.setY(350);
      expect(sprite.depth).toBe(10 + Math.floor(350 * 0.1)); // 45

      sprite.setY(820);
      expect(sprite.depth).toBe(10 + Math.floor(820 * 0.1)); // 92
    });
  });

  // =========================================================================
  // 2. Drag Depth Override & State Retention
  // =========================================================================
  describe('2. Drag Depth Override & State Retention', () => {
    it('sets depth to 100 on setDragging(true) and keeps depth at 100 during movement', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());
      sprite.setPosition(200, 160);
      expect(sprite.depth).toBe(26);

      // Start drag
      sprite.setDragging(true);
      expect(sprite.depth).toBe(100);
      expect(sprite.alpha).toBe(0.9);

      // Move while dragging across multiple Y coordinates
      sprite.setPosition(250, 540);
      expect(sprite.depth).toBe(100); // Must NOT drop back to 64!

      sprite.setY(1240);
      expect(sprite.depth).toBe(100); // Must NOT drop back to 134!

      sprite.setPosition(400, 300);
      expect(sprite.depth).toBe(100);

      // Release drag: restores dynamic depth based on the final current Y (300 -> 40)
      sprite.setDragging(false);
      expect(sprite.depth).toBe(40);
      expect(sprite.alpha).toBe(1.0);
    });

    it('supports customScale during drag and restores baseScale on drag release', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());
      sprite.setPerspectiveScale(0.95);
      expect(sprite.scaleX).toBe(0.95);

      // Drag with custom scale 1.25
      sprite.setDragging(true, 1.25);
      expect(sprite.scaleX).toBe(1.25);
      expect(sprite.depth).toBe(100);

      // Release drag: restores baseScale 0.95
      sprite.setDragging(false);
      expect(sprite.scaleX).toBe(0.95);
    });

    it('tolerates rapid sequential drag toggles without state leakage', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());
      sprite.setPosition(300, 500); // depth 60

      for (let i = 0; i < 5; i++) {
        sprite.setDragging(true);
        expect(sprite.depth).toBe(100);
        sprite.setDragging(false);
        expect(sprite.depth).toBe(60);
      }
    });
  });

  // =========================================================================
  // 3. Multi-Cell Footprint Dimensions & Layout
  // =========================================================================
  describe('3. Multi-Cell Footprint Dimensions (1x1, 1x2, 2x1, 2x2)', () => {
    const cellW = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols; // (555 - 195) / 5 = 72
    const cellH = (GRID_CONFIG.endY - GRID_CONFIG.startY) / GRID_CONFIG.rows; // (620 - 320) / 5 = 60

    function findFillRoundedRectAfterColor(commands: any[], color: number) {
      const idx = commands.findIndex((c: any, i: number) =>
        c.type === 'fillRoundedRect' && i > 0 && commands[i - 1].type === 'fillStyle' && commands[i - 1].color === color
      );
      return idx >= 0 ? commands[idx] : null;
    }

    it('calculates exact physical footprint dimensions for 1x1 weapon (72x60 cell)', () => {
      const weapon1x1 = createMockWeapon('fire_lance', 1, 1, 1);
      const sprite = new UnitSprite(mockScene, weapon1x1);

      const expectedW = 1 * cellW - 6; // 66
      const expectedH = 1 * cellH - 6; // 54

      const bgCmds = (sprite as any).bgGraphics.commands;

      // Contact drop shadow (0x000000)
      const shadow = findFillRoundedRectAfterColor(bgCmds, 0x000000);
      expect(shadow).toBeDefined();
      expect(shadow.w).toBe(expectedW);
      expect(shadow.h).toBe(expectedH);

      // Beveled vertical chamfer lip (0x1a1a1a)
      const chamfer = findFillRoundedRectAfterColor(bgCmds, 0x1a1a1a);
      expect(chamfer).toBeDefined();
      expect(chamfer.w).toBe(expectedW);
      expect(chamfer.h).toBe(expectedH);

      // Top plinth surface (theme.bg, h - 2)
      const plinth = findFillRoundedRectAfterColor(bgCmds, FACTION_COLORS.fire.bg);
      expect(plinth).toBeDefined();
      expect(plinth.w).toBe(expectedW);
      expect(plinth.h).toBe(expectedH - 2);

      // Text placements relative to h
      const nameText = (sprite as any).nameText;
      const starText = (sprite as any).starText;
      expect(nameText.y).toBe(expectedH / 2 - 12); // 27 - 12 = 15
      expect(starText.y).toBe(-expectedH / 2 + 10); // -27 + 10 = -17
    });

    it('calculates exact physical footprint dimensions for 1x2 weapon (e.g. Red Cannon)', () => {
      const weapon1x2 = createMockWeapon('red_cannon', 2, 1, 2);
      const sprite = new UnitSprite(mockScene, weapon1x2);

      const expectedW = 1 * cellW - 6; // 66
      const expectedH = 2 * cellH - 6; // 114

      const bgCmds = (sprite as any).bgGraphics.commands;

      const shadow = findFillRoundedRectAfterColor(bgCmds, 0x000000);
      expect(shadow).toBeDefined();
      expect(shadow.w).toBe(expectedW);
      expect(shadow.h).toBe(expectedH);

      const plinth = findFillRoundedRectAfterColor(bgCmds, FACTION_COLORS.fire.bg);
      expect(plinth).toBeDefined();
      expect(plinth.w).toBe(expectedW);
      expect(plinth.h).toBe(expectedH - 2);

      const nameText = (sprite as any).nameText;
      const starText = (sprite as any).starText;
      expect(nameText.y).toBe(expectedH / 2 - 12); // 57 - 12 = 45
      expect(starText.y).toBe(-expectedH / 2 + 10); // -57 + 10 = -47
    });

    it('calculates exact physical footprint dimensions for 2x1 weapon (e.g. Bed Crossbow)', () => {
      const weapon2x1 = createMockWeapon('bed_crossbow', 2, 2, 1, 'mohist');
      const sprite = new UnitSprite(mockScene, weapon2x1);

      const expectedW = 2 * cellW - 6; // 138
      const expectedH = 1 * cellH - 6; // 54

      const bgCmds = (sprite as any).bgGraphics.commands;

      const shadow = findFillRoundedRectAfterColor(bgCmds, 0x000000);
      expect(shadow).toBeDefined();
      expect(shadow.w).toBe(expectedW);
      expect(shadow.h).toBe(expectedH);

      const plinth = findFillRoundedRectAfterColor(bgCmds, FACTION_COLORS.mohist.bg);
      expect(plinth).toBeDefined();
      expect(plinth.w).toBe(expectedW);
      expect(plinth.h).toBe(expectedH - 2);

      const nameText = (sprite as any).nameText;
      const starText = (sprite as any).starText;
      expect(nameText.y).toBe(expectedH / 2 - 12); // 15
      expect(starText.y).toBe(-expectedH / 2 + 10); // -17
    });

    it('calculates exact physical footprint dimensions for 2x2 weapon (e.g. Catapult)', () => {
      const weapon2x2 = createMockWeapon('catapult', 3, 2, 2, 'mohist');
      const sprite = new UnitSprite(mockScene, weapon2x2);

      const expectedW = 2 * cellW - 6; // 138
      const expectedH = 2 * cellH - 6; // 114

      const bgCmds = (sprite as any).bgGraphics.commands;

      const shadow = findFillRoundedRectAfterColor(bgCmds, 0x000000);
      expect(shadow).toBeDefined();
      expect(shadow.w).toBe(expectedW);
      expect(shadow.h).toBe(expectedH);

      const plinth = findFillRoundedRectAfterColor(bgCmds, FACTION_COLORS.mohist.bg);
      expect(plinth).toBeDefined();
      expect(plinth.w).toBe(expectedW);
      expect(plinth.h).toBe(expectedH - 2);

      const nameText = (sprite as any).nameText;
      const starText = (sprite as any).starText;
      expect(nameText.y).toBe(expectedH / 2 - 12); // 45
      expect(starText.y).toBe(-expectedH / 2 + 10); // -47
    });

    it('scales cooldown bar dynamically to match multi-cell footprint width', () => {
      const weapon2x2 = createMockWeapon('catapult', 1, 2, 2, 'mohist');
      const sprite = new UnitSprite(mockScene, weapon2x2);

      sprite.updateCooldown(0.5); // 50% remaining
      const cdCmds = (sprite as any).cooldownBar.commands;
      const fillRect = cdCmds.find((c: any) => c.type === 'fillRect');

      const expectedBarW = (2 * cellW) - 12; // 144 - 12 = 132
      expect(fillRect).toBeDefined();
      expect(fillRect.w).toBeCloseTo(expectedBarW * 0.5, 3);
    });
  });

  // =========================================================================
  // 4. Star Level Visual Commands Progression (★1 to ★4)
  // =========================================================================
  describe('4. Star Level Visual Commands Progression', () => {
    it('★1 generates 4 clean corner rivets, 1 top highlight, 0 L-brackets, 0 crest rects', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon('fire_lance', 1));
      const bgCmds = (sprite as any).bgGraphics.commands;

      // Outer border width 2
      const border = bgCmds.find((c: any) => c.type === 'lineStyle' && c.color === FACTION_COLORS.fire.border);
      expect(border.width).toBe(2);

      // 4 corner rivets
      const fillCircles = bgCmds.filter((c: any) => c.type === 'fillCircle');
      expect(fillCircles.length).toBe(4);
      fillCircles.forEach((circle: any) => {
        expect(circle.r).toBe(2.5);
      });

      // Exactly 1 top highlight line, 0 corner brackets
      const lineBetweens = bgCmds.filter((c: any) => c.type === 'lineBetween');
      expect(lineBetweens.length).toBe(1);

      // 0 corner crest rects
      const fillRects = bgCmds.filter((c: any) => c.type === 'fillRect');
      expect(fillRects.length).toBe(0);

      // Rune graphics remains empty on update
      sprite.update(0.016, 1000);
      const runeCmds = (sprite as any).runeGraphics.commands;
      expect(runeCmds.length).toBe(0);
    });

    it('★2 generates 4 corner rivets + 4 reinforced L-bracket lines (total 5 lineBetween)', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon('fire_lance', 2));
      const bgCmds = (sprite as any).bgGraphics.commands;

      // Outer border width 2
      const border = bgCmds.find((c: any) => c.type === 'lineStyle' && c.color === FACTION_COLORS.fire.border);
      expect(border.width).toBe(2);

      // 4 corner rivets
      const fillCircles = bgCmds.filter((c: any) => c.type === 'fillCircle');
      expect(fillCircles.length).toBe(4);

      // 1 top highlight + 4 L-angle brackets = 5 lineBetween commands
      const lineBetweens = bgCmds.filter((c: any) => c.type === 'lineBetween');
      expect(lineBetweens.length).toBe(5);

      // 0 corner crest rects
      const fillRects = bgCmds.filter((c: any) => c.type === 'fillRect');
      expect(fillRects.length).toBe(0);

      // Rune graphics remains empty on update
      sprite.update(0.016, 1000);
      const runeCmds = (sprite as any).runeGraphics.commands;
      expect(runeCmds.length).toBe(0);
    });

    it('★3 generates 4 corner crest rects (7x7), 4 inner studs, cyan inner inlay, and pulsating cyan rune aura', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon('fire_lance', 3));
      const bgCmds = (sprite as any).bgGraphics.commands;

      // Outer border width 3
      const border = bgCmds.find((c: any) => c.type === 'lineStyle' && c.color === FACTION_COLORS.fire.border);
      expect(border.width).toBe(3);

      // 4 corner crest rects (7x7)
      const crestRects = bgCmds.filter((c: any) => c.type === 'fillRect' && c.w === 7 && c.h === 7);
      expect(crestRects.length).toBe(4);

      // 4 white inner studs (r = 2)
      const innerStuds = bgCmds.filter((c: any) => c.type === 'fillCircle' && c.r === 2);
      expect(innerStuds.length).toBe(4);

      // Cyan inner inlay line (0x00e5ff)
      const cyanInlay = bgCmds.find((c: any) => c.type === 'lineStyle' && c.color === 0x00e5ff);
      expect(cyanInlay).toBeDefined();

      // Rune graphics pulsating cyan border
      sprite.update(0.016, 1000);
      const runeCmds = (sprite as any).runeGraphics.commands;
      const cyanRune = runeCmds.find((c: any) => c.type === 'lineStyle' && c.color === 0x00e5ff);
      expect(cyanRune).toBeDefined();
      expect(cyanRune.width).toBe(3);
    });

    it('★4 generates golden outer border, 4 golden corner seals (8x8), diamond core studs, and circulating sparkles', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon('fire_lance', 4));
      const bgCmds = (sprite as any).bgGraphics.commands;

      // Gold outer border (0xffd700, width 3)
      const goldBorder = bgCmds.find((c: any) => c.type === 'lineStyle' && c.color === 0xffd700);
      expect(goldBorder).toBeDefined();
      expect(goldBorder.width).toBe(3);

      // 4 golden corner seal rects (8x8)
      const goldSeals = bgCmds.filter((c: any) => c.type === 'fillRect' && c.w === 8 && c.h === 8);
      expect(goldSeals.length).toBe(4);

      // 4 diamond core circles (white, r = 2.5)
      const diamondCores = bgCmds.filter((c: any) => c.type === 'fillCircle' && c.r === 2.5);
      expect(diamondCores.length).toBe(4);

      // Golden inner inlay (0xffea00)
      const goldInlay = bgCmds.find((c: any) => c.type === 'lineStyle' && c.color === 0xffea00);
      expect(goldInlay).toBeDefined();

      // Rune graphics golden border + 4 sparkles on update
      sprite.update(0.016, 2000);
      const runeCmds = (sprite as any).runeGraphics.commands;
      const goldRuneBorder = runeCmds.find((c: any) => c.type === 'lineStyle' && c.color === 0xffd700);
      expect(goldRuneBorder).toBeDefined();
      expect(goldRuneBorder.width).toBe(3.5);

      // Sparkles: white core + gold glow (4 of each -> 8 fillCircles)
      const sparkleCircles = runeCmds.filter((c: any) => c.type === 'fillCircle');
      expect(sparkleCircles.length).toBe(8);
    });

    it('dynamically adapts visual commands when star level is upgraded in-place via updateWeaponData', () => {
      const weapon = createMockWeapon('fire_lance', 1);
      const sprite = new UnitSprite(mockScene, weapon);

      const initialHighlight = (sprite as any).bgGraphics.commands.filter((c: any) => c.type === 'lineBetween');
      expect(initialHighlight.length).toBe(1);

      // Upgrade to ★2
      sprite.updateWeaponData({ ...weapon, star: 2 });
      let lineBetweens = (sprite as any).bgGraphics.commands.filter((c: any) => c.type === 'lineBetween');
      expect(lineBetweens.length).toBe(5);

      // Upgrade to ★3
      sprite.updateWeaponData({ ...weapon, star: 3 });
      let crestRects = (sprite as any).bgGraphics.commands.filter((c: any) => c.type === 'fillRect' && c.w === 7);
      expect(crestRects.length).toBe(4);

      // Upgrade to ★4
      sprite.updateWeaponData({ ...weapon, star: 4 });
      let goldSeals = (sprite as any).bgGraphics.commands.filter((c: any) => c.type === 'fillRect' && c.w === 8);
      expect(goldSeals.length).toBe(4);
    });
  });

  // =========================================================================
  // 5. Muzzle Heat Glow Lifecycle & Graphics Verification
  // =========================================================================
  describe('5. Muzzle Heat Glow Lifecycle & Graphics Verification', () => {
    it('manages 0.8s countdown, intensity scaling, and multi-ring heat circles', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());
      expect(sprite.heatTimer).toBe(0);

      // Activate muzzle heat
      sprite.playMuzzleHeat();
      expect(sprite.heatTimer).toBe(0.8);

      // Step 1: 0.2s elapsed -> heatTimer = 0.6, intensity = 0.75
      sprite.update(0.2);
      expect(sprite.heatTimer).toBeCloseTo(0.6, 5);

      const heatCmds1 = (sprite as any).heatGraphics.commands;
      expect(heatCmds1.length).toBeGreaterThan(0);

      // Verify outer emissive orange-red (0xff3d00, r = 14)
      const outerRing = heatCmds1.find((c: any) => c.type === 'fillCircle' && c.r === 14);
      expect(outerRing).toBeDefined();

      // Verify mid bright yellow (0xffff00, r = 7)
      const midRing = heatCmds1.find((c: any) => c.type === 'fillCircle' && c.r === 7);
      expect(midRing).toBeDefined();

      // Verify white-hot core (0xffffff, r = 3)
      const coreRing = heatCmds1.find((c: any) => c.type === 'fillCircle' && c.r === 3);
      expect(coreRing).toBeDefined();

      // Step 2: Advance past expiration (0.7s more -> total 0.9s > 0.8s)
      sprite.update(0.7);
      expect(sprite.heatTimer).toBe(0);
      const heatCmdsExpired = (sprite as any).heatGraphics.commands;
      expect(heatCmdsExpired.length).toBe(0);
    });

    it('clamps heatTimer strictly to 0 when overshooting update deltaSec', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());
      sprite.playMuzzleHeat();

      // Massive deltaSec (e.g. lag spike of 2.5 seconds)
      sprite.update(2.5);
      expect(sprite.heatTimer).toBe(0);
      expect((sprite as any).heatGraphics.commands.length).toBe(0);
    });

    it('refreshes heatTimer to 0.8s when re-fired while already glowing', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon());
      sprite.playMuzzleHeat();
      sprite.update(0.5); // Remaining 0.3s

      expect(sprite.heatTimer).toBeCloseTo(0.3, 5);

      // Rapid consecutive shot
      sprite.playMuzzleHeat();
      expect(sprite.heatTimer).toBe(0.8);

      sprite.update(0.1);
      expect(sprite.heatTimer).toBeCloseTo(0.7, 5);
    });
  });

  // =========================================================================
  // 6. Layer Ordering & Children Integrity
  // =========================================================================
  describe('6. Layer Ordering & Children Integrity', () => {
    it('ensures strict z-index stacking order inside container', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon('fire_lance', 1));

      // Container list order:
      // bgGraphics at index 0 (bottom)
      // runeGraphics at index 1
      // heatGraphics, nameText, starText, cooldownBar brought to top
      const list = sprite.list;
      const bgGraphics = (sprite as any).bgGraphics;
      const runeGraphics = (sprite as any).runeGraphics;
      const heatGraphics = (sprite as any).heatGraphics;
      const nameText = (sprite as any).nameText;
      const starText = (sprite as any).starText;

      expect(list.indexOf(bgGraphics)).toBe(0);
      expect(list.indexOf(runeGraphics)).toBe(1);

      // Foreground elements must be above background and runes
      expect(list.indexOf(heatGraphics)).toBeGreaterThan(list.indexOf(bgGraphics));
      expect(list.indexOf(nameText)).toBeGreaterThan(list.indexOf(bgGraphics));
      expect(list.indexOf(starText)).toBeGreaterThan(list.indexOf(bgGraphics));
    });

    it('cleans up all child graphics, text, and timers on destroy', () => {
      const sprite = new UnitSprite(mockScene, createMockWeapon('fire_lance', 1));
      sprite.playMuzzleHeat();
      expect(sprite.heatTimer).toBe(0.8);

      sprite.destroy();
      expect(sprite.heatTimer).toBe(0);
      expect((sprite as any).bgGraphics.isDestroyed).toBe(true);
      expect((sprite as any).runeGraphics.isDestroyed).toBe(true);
      expect((sprite as any).heatGraphics.isDestroyed).toBe(true);
      expect((sprite as any).nameText.isDestroyed).toBe(true);
      expect((sprite as any).starText.isDestroyed).toBe(true);
    });
  });
});
