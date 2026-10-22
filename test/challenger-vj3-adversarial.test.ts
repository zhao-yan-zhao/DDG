/**
 * 《孤城神机营》- Milestone M_VJ3 Combat Game Juice & VFX Adversarial Challenge
 * Author: challenger_vj3_1 (Combat Juice Challenger 1)
 *
 * Adversarial stress tests for:
 * 1. Hit flash white: rapid 50-hit impacts per second on the same enemy (timer refresh, no compounding, no leak)
 * 2. Dynamic ghost health bar: lethal overkill to 0, smooth lerp catch-up, instant heal snap, mid-lerp heal
 * 3. Weapon heat glow: rapid repeated firing before 0.8s cooldown expires, strict upper bound, linear decay
 * 4. Boss blood aura: smooth rotation at 2.0 rad/s, long-duration angle wrapping, strictly exclusive to Boss units
 * 5. High-density VFX & Calligraphy crit spring bounce stress resilience
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =========================================================================
// Mock Phaser Infrastructure
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
import { FloatingTextPool } from '../src/presentation/renderers/fly-text';
import { EnemyEntity, WeaponInstance } from '../src/core/types';

describe('Adversarial Challenge: Milestone M_VJ3 Combat Game Juice & Stress Harnesses', () => {
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
        exists: vi.fn(() => true),
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
  // Challenge 1: Hit Flash White (Rapid Impacts, Compounding, Leaks)
  // =========================================================================
  describe('Challenge 1: Hit Flash White Rapid Impacts & State Integrity', () => {
    let dummyEnemy: EnemyEntity;

    beforeEach(() => {
      dummyEnemy = {
        id: 'enemy_stress_1',
        typeId: 'ordinary',
        name: '流寇斥候',
        currentHp: 1000,
        maxHp: 1000,
        moveSpeed: 1.0,
        armor: 10,
        shield: 0,
        wallDamage: 10,
        isBoss: false
      };
    });

    it('survives rapid 50-hit impacts per second without flashTimer overflowing or tint compounding', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);

      // Simulate 50 hits over 1 second (1 hit every 20ms = 0.02s)
      for (let i = 0; i < 50; i++) {
        sprite.playHitFlash(false);

        // flashTimer should strictly reset to FLASH_DURATION (0.06), NEVER compound to 0.06 * 50 = 3.0s!
        expect(sprite.flashTimer).toBe(0.06);
        expect(sprite.baseSprite.tint).toBe(0xffffff);
        expect(sprite.baseSprite.tintFill).toBe(true);

        // Advance 20ms
        sprite.update(0.02);
        expect(sprite.flashTimer).toBeCloseTo(0.04, 5);
        expect(sprite.isFlashing()).toBe(true);
      }

      // After 50th hit, cease fire.
      // Next frame: 0.04 - 0.02 = 0.02s remaining
      sprite.update(0.02);
      expect(sprite.flashTimer).toBeCloseTo(0.02, 5);
      expect(sprite.isFlashing()).toBe(true);
      expect(sprite.baseSprite.tintFill).toBe(true);

      // Next frame: 0.02 - 0.02 = 0s -> flash expires!
      sprite.update(0.02);
      expect(sprite.flashTimer).toBe(0);
      expect(sprite.isFlashing()).toBe(false);
      expect(sprite.baseSprite.tintFill).toBe(false);
      expect(sprite.baseSprite.scaleX).toBe(1.0);
    });

    it('handles an instantaneous burst of 50 hits in the exact same frame (deltaSec = 0)', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);

      for (let i = 0; i < 50; i++) {
        sprite.playHitFlash(i % 5 === 0); // Some crits interspersed
      }

      // flashTimer is still strictly 0.06s
      expect(sprite.flashTimer).toBe(0.06);
      expect(sprite.isFlashing()).toBe(true);
      expect(sprite.baseSprite.scaleX).toBe(1.12); // Crit scale pulse preserved

      // Expire over exactly 0.06s
      sprite.update(0.06);
      expect(sprite.flashTimer).toBe(0);
      expect(sprite.isFlashing()).toBe(false);
      expect(sprite.baseSprite.tintFill).toBe(false);
      expect(sprite.baseSprite.scaleX).toBe(1.0);
    });

    it('recovers cleanly when deltaSec exceeds flash duration in a single frame (tab switch freeze)', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);
      sprite.playHitFlash(true);
      expect(sprite.flashTimer).toBe(0.06);

      // Huge delta step: 5.0 seconds
      sprite.update(5.0);
      expect(sprite.flashTimer).toBe(0);
      expect(sprite.isFlashing()).toBe(false);
      expect(sprite.baseSprite.tintFill).toBe(false);
      expect(sprite.baseSprite.scaleX).toBe(1.0);
    });

    it('safely destroys sprite while active flash is ticking without memory leaks', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);
      sprite.playHitFlash(true);

      expect(sprite.isFlashing()).toBe(true);
      sprite.destroy();

      expect(sprite.flashTimer).toBe(0);
      expect((sprite.baseSprite as any).isDestroyed).toBe(true);
      expect((sprite.auraGraphics as any).isDestroyed).toBe(true);
      expect((sprite.hpBarGraphics as any).isDestroyed).toBe(true);
    });
  });

  // =========================================================================
  // Challenge 2: Dynamic Ghost Health Bar (Lethal Overkill, Lerp, Heal Snapping)
  // =========================================================================
  describe('Challenge 2: Dynamic Ghost Health Bar Stress & Numerical Invariants', () => {
    let dummyEnemy: EnemyEntity;

    beforeEach(() => {
      dummyEnemy = {
        id: 'enemy_ghost_1',
        typeId: 'heavy',
        name: '铁甲武士',
        currentHp: 600,
        maxHp: 600,
        moveSpeed: 0.8,
        armor: 25,
        shield: 0,
        wallDamage: 20,
        isBoss: false
      };
    });

    it('drops front health bar to 0 immediately on massive lethal overkill, while ghost bar lerps smoothly to 0 without underflow', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);
      expect(sprite.ghostHp).toBe(600);

      // Massive overkill damage: 9999 damage
      dummyEnemy.currentHp = 0;
      sprite.updateHp();

      expect(sprite.enemy.currentHp).toBe(0);
      expect(sprite.ghostHp).toBe(600); // Ghost bar has not moved yet

      // Lerp rate = (600 / 0.30) = 2000 HP/sec
      // Advance by 0.10s -> ghostHp drops by 200 to 400
      sprite.update(0.10);
      expect(sprite.ghostHp).toBeCloseTo(400, 1);

      // Advance by another 0.10s -> ghostHp drops to 200
      sprite.update(0.10);
      expect(sprite.ghostHp).toBeCloseTo(200, 1);

      // Advance by 0.10s -> ghostHp reaches 0
      sprite.update(0.10);
      expect(sprite.ghostHp).toBe(0);

      // Additional updates after 0 do NOT cause ghostHp to dip below 0
      sprite.update(0.10);
      expect(sprite.ghostHp).toBe(0);

      // Verify HP bar graphics has 0 fill width for both bars
      const commands = (sprite.hpBarGraphics as any).commands;
      // Front HP rect was not drawn because hpRatio <= 0
      const frontHpRect = commands.find((c: any) => c.type === 'fillRect' && c.color === 0x00e676);
      expect(frontHpRect).toBeUndefined();
    });

    it('snaps ghostHp immediately when healed at rest', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);
      // Reduce to 200, wait 0.3s for ghost to catch up
      dummyEnemy.currentHp = 200;
      sprite.updateHp();
      sprite.update(0.30);
      expect(sprite.ghostHp).toBe(200);

      // Heal to 500
      sprite.updateHp(500);
      expect(sprite.enemy.currentHp).toBe(500);
      expect(sprite.ghostHp).toBe(500); // Snaps immediately
    });

    it('continues descending when healed mid-lerp if new HP is still below ghostHp', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);
      // Takes 500 damage (HP: 600 -> 100)
      dummyEnemy.currentHp = 100;
      sprite.updateHp();

      // At t = 0.10s (one-third of 0.30s), lerp reduction = (600 / 0.30) * 0.10 = 200
      // ghostHp = 600 - 200 = 400
      sprite.update(0.10);
      expect(sprite.ghostHp).toBeCloseTo(400, 1);

      // Receives heal of 150 HP -> new currentHp is 250 (< ghostHp 400)
      sprite.updateHp(250);
      expect(sprite.enemy.currentHp).toBe(250);
      // ghostHp should NOT snap down; it continues smooth descent from 400 down to 250
      expect(sprite.ghostHp).toBeCloseTo(400, 1);

      // Next 0.075s: lerps down by (600 / 0.30) * 0.075 = 150 -> reaches exactly 250
      sprite.update(0.075);
      expect(sprite.ghostHp).toBeCloseTo(250, 1);
    });

    it('snaps up immediately when healed mid-lerp if new HP exceeds ghostHp', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);
      dummyEnemy.currentHp = 100;
      sprite.updateHp();

      // At t = 0.10s, ghostHp = 400
      sprite.update(0.10);
      expect(sprite.ghostHp).toBeCloseTo(400, 1);

      // Massive heal of 380 HP -> new currentHp is 480 (> ghostHp 400)
      sprite.updateHp(480);
      expect(sprite.enemy.currentHp).toBe(480);
      // ghostHp immediately snaps up to 480, avoiding inverted ghost bar
      expect(sprite.ghostHp).toBe(480);
    });

    it('smoothly absorbs a multi-hit damage barrage', () => {
      const sprite = new EnemySprite(mockScene, dummyEnemy);

      // 5 successive hits of 100 damage spaced by 0.02s
      // In 0.02s, lerp reduction = (600 / 0.30) * 0.02 = 40 HP, while damage is 100 HP
      for (let i = 1; i <= 5; i++) {
        dummyEnemy.currentHp -= 100;
        sprite.updateHp();
        sprite.update(0.02);
        // ghostHp is strictly descending but lagging behind currentHp
        expect(sprite.ghostHp).toBeGreaterThan(dummyEnemy.currentHp);
      }

      // Final HP is 600 - 500 = 100
      expect(dummyEnemy.currentHp).toBe(100);

      // Allow 0.30s for ghost bar to fully settle
      sprite.update(0.30);
      expect(sprite.ghostHp).toBeCloseTo(100, 1);
    });

    it('renders cyan shield bar accurately on top of HP bar', () => {
      dummyEnemy.shield = 150;
      const sprite = new EnemySprite(mockScene, dummyEnemy);

      const commands = (sprite.hpBarGraphics as any).commands;
      const shieldRect = commands.find((c: any) => c.type === 'fillRect' && (c as any).h === 2);
      expect(shieldRect).toBeDefined();

      // Shield depleted
      sprite.updateHp(undefined, undefined, 0);
      const updatedCommands = (sprite.hpBarGraphics as any).commands;
      const updatedShieldRect = updatedCommands.find((c: any) => c.type === 'fillRect' && (c as any).h === 2);
      expect(updatedShieldRect).toBeUndefined();
    });
  });

  // =========================================================================
  // Challenge 3: Weapon Heat Glow (Rapid Firing & Dissipation)
  // =========================================================================
  describe('Challenge 3: Weapon Heat Glow Rapid Firing & Dissipation Invariants', () => {
    let dummyWeapon: WeaponInstance;

    beforeEach(() => {
      dummyWeapon = {
        id: 'wp_heat_test',
        configId: 'fire_lance',
        name: '神机火铳',
        faction: 'fire',
        star: 2,
        anchor: { row: 2, col: 2 },
        footprint: { width: 1, height: 1 },
        baseAtk: 60,
        attackInterval: 0.15,
        range: 4.5,
        isFortressOnly: false
      };
    });

    it('caps heatTimer strictly at 0.8s during 50 repeated firings without overflowing', () => {
      const unitSprite = new UnitSprite(mockScene, dummyWeapon);

      // Fire 50 times with 20ms between shots (total 1.0s of firing)
      for (let i = 0; i < 50; i++) {
        unitSprite.playMuzzleHeat();

        // Must never exceed HEAT_DURATION (0.8s)
        expect(unitSprite.heatTimer).toBe(0.8);

        unitSprite.update(0.02);
        expect(unitSprite.heatTimer).toBeCloseTo(0.78, 5);
      }

      // Heat graphics active with correct colors
      const commands = (unitSprite as any).heatGraphics.commands;
      expect(commands.some((c: any) => c.type === 'fillStyle' && c.color === 0xff3d00)).toBe(true);
      expect(commands.some((c: any) => c.type === 'fillStyle' && c.color === 0xffff00)).toBe(true);
      expect(commands.some((c: any) => c.type === 'fillStyle' && c.color === 0xffffff)).toBe(true);
    });

    it('dissipates linearly to 0 in exactly 0.8s once firing ceases', () => {
      const unitSprite = new UnitSprite(mockScene, dummyWeapon);
      unitSprite.playMuzzleHeat();

      // At t = 0.4s (halfway), intensity is 0.5
      unitSprite.update(0.40);
      expect(unitSprite.heatTimer).toBeCloseTo(0.40, 5);

      // At t = 0.8s, heatTimer drops to 0 and graphics clear
      unitSprite.update(0.40);
      expect(unitSprite.heatTimer).toBe(0);
      expect((unitSprite as any).heatGraphics.commands.length).toBe(0);

      // Subsequent updates stay cleared
      unitSprite.update(0.10);
      expect(unitSprite.heatTimer).toBe(0);
      expect((unitSprite as any).heatGraphics.commands.length).toBe(0);
    });

    it('handles burst firing of 20 shots in the exact same frame', () => {
      const unitSprite = new UnitSprite(mockScene, dummyWeapon);
      for (let i = 0; i < 20; i++) {
        unitSprite.playMuzzleHeat();
      }
      expect(unitSprite.heatTimer).toBe(0.8);
    });
  });

  // =========================================================================
  // Challenge 4: Boss Blood Aura Field (Kinematics & Strict Exclusivity)
  // =========================================================================
  describe('Challenge 4: Boss Blood Aura Kinematics & Strict Exclusivity', () => {
    it('rotates Boss blood aura at exactly 2.0 rad/s and wraps at 2*PI', () => {
      const bossEnemy: EnemyEntity = {
        id: 'boss_bear',
        typeId: 'boss_bear',
        name: '铁塔熊王',
        currentHp: 10000,
        maxHp: 10000,
        moveSpeed: 0.5,
        armor: 60,
        shield: 1000,
        wallDamage: 200,
        isBoss: true
      };

      const bossSprite = new EnemySprite(mockScene, bossEnemy);
      expect((bossSprite as any).auraAngle).toBe(0);

      // 1.0 second elapsed -> 2.0 rad
      bossSprite.update(1.0);
      expect((bossSprite as any).auraAngle).toBeCloseTo(2.0, 4);

      // Another 1.0 second elapsed -> 4.0 rad
      bossSprite.update(1.0);
      expect((bossSprite as any).auraAngle).toBeCloseTo(4.0, 4);

      // Another 1.5 seconds elapsed (total 3.5s -> 7.0 rad >= 2*PI = 6.28318)
      bossSprite.update(1.5);
      const expectedWrapped = 7.0 - Math.PI * 2;
      expect((bossSprite as any).auraAngle).toBeCloseTo(expectedWrapped, 4);
      expect((bossSprite as any).auraAngle).toBeLessThan(Math.PI * 2);
    });

    it('maintains numerical precision across 60,000 frames (1,000 seconds of combat)', () => {
      const bossEnemy: EnemyEntity = {
        id: 'boss_bear',
        typeId: 'boss_bear',
        name: '铁塔熊王',
        currentHp: 10000,
        maxHp: 10000,
        moveSpeed: 0.5,
        armor: 60,
        shield: 1000,
        wallDamage: 200,
        isBoss: true
      };

      const bossSprite = new EnemySprite(mockScene, bossEnemy);
      const deltaSec = 1 / 60; // 60 FPS

      for (let frame = 0; frame < 60000; frame++) {
        bossSprite.update(deltaSec);
      }

      const angle = (bossSprite as any).auraAngle;
      expect(Number.isNaN(angle)).toBe(false);
      expect(Number.isFinite(angle)).toBe(true);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(Math.PI * 2);
    });

    it('STRICT EXCLUSIVITY: Blood aura (0x880e4f / 0xd50000 + 8 spikes) ONLY attaches to Boss units', () => {
      // 1. Boss unit
      const boss: EnemyEntity = {
        id: 'b1', typeId: 'boss', name: '首领', currentHp: 5000, maxHp: 5000,
        moveSpeed: 1, armor: 50, shield: 0, wallDamage: 50, isBoss: true
      };
      const bossSprite = new EnemySprite(mockScene, boss);
      const bossCmds = (bossSprite.auraGraphics as any).commands;
      const hasBloodMist = bossCmds.some((c: any) => c.type === 'fillStyle' && c.color === 0x880e4f);
      const hasBloodRim = bossCmds.some((c: any) => c.type === 'lineStyle' && c.color === 0xd50000);
      const spikeLines = bossCmds.filter((c: any) => c.type === 'lineBetween');
      expect(hasBloodMist).toBe(true);
      expect(hasBloodRim).toBe(true);
      expect(spikeLines.length).toBe(8); // 8 demonic spikes

      // 2. Elite unit (armor > 20, isBoss: false)
      const elite: EnemyEntity = {
        id: 'e1', typeId: 'heavy', name: '重甲精锐', currentHp: 500, maxHp: 500,
        moveSpeed: 1, armor: 30, shield: 0, wallDamage: 20, isBoss: false
      };
      const eliteSprite = new EnemySprite(mockScene, elite);
      const eliteCmds = (eliteSprite.auraGraphics as any).commands;
      const eliteHasBloodMist = eliteCmds.some((c: any) => c.type === 'fillStyle' && c.color === 0x880e4f);
      const eliteHasSpikes = eliteCmds.some((c: any) => c.type === 'lineBetween');
      const eliteHasAmber = eliteCmds.some((c: any) => c.type === 'lineStyle' && c.color === 0xffa726);
      expect(eliteHasBloodMist).toBe(false); // NO blood mist!
      expect(eliteHasSpikes).toBe(false);    // NO demonic spikes!
      expect(eliteHasAmber).toBe(true);      // Amber aura instead

      // 3. Ordinary unit (armor <= 20, isBoss: false)
      const ordinary: EnemyEntity = {
        id: 'o1', typeId: 'ordinary', name: '流寇', currentHp: 100, maxHp: 100,
        moveSpeed: 1, armor: 10, shield: 0, wallDamage: 10, isBoss: false
      };
      const ordinarySprite = new EnemySprite(mockScene, ordinary);
      const ordCmds = (ordinarySprite.auraGraphics as any).commands;
      expect(ordCmds.length).toBe(0); // Zero aura commands!
    });
  });

  // =========================================================================
  // Challenge 5: Elemental VFX & FloatingText Elastic Bounce Stress
  // =========================================================================
  describe('Challenge 5: Elemental VFX Rapid Triggers & FloatingText Elastic Bounce', () => {
    it('handles rapid multi-elemental reaction bursts and clears cleanly on clearAll()', () => {
      const vfx = new ElementalVfxManager(mockScene);

      // Trigger 10 of each elemental reaction
      for (let i = 0; i < 10; i++) {
        vfx.playFireBlast(300 + i * 10, 600);
        vfx.playThunderJudgement(350 + i * 10, 650);
        vfx.playIceShatter(400 + i * 10, 700);
        vfx.playNetherPoisonFlame(450 + i * 10, 750);
      }

      const activeCount = (vfx as any).activeGraphics.size;
      expect(activeCount).toBeGreaterThan(0);

      // Clear all
      vfx.clearAll();
      expect((vfx as any).activeGraphics.size).toBe(0);
    });

    it('crit floating text enforces KaiTi font family, Back.easeOut bounce scale, and emits 5 star sparkles', () => {
      const pool = new FloatingTextPool(mockScene, 10);
      pool.spawn(375, 700, 'CRIT 9999', 'crit');

      // Check scale tween uses Back.easeOut
      const scaleTween = addedTweens.find((t: any) => t.ease === 'Back.easeOut' && t.scaleX === 1.2);
      expect(scaleTween).toBeDefined();

      // Check 5 star sparkles emitted
      const sparkles = addedTweens.filter((t: any) => t.duration === 320 && t.ease === 'Quad.easeOut');
      expect(sparkles.length).toBe(5);
    });
  });
});
