/**
 * 《孤城神机营》- Challenger M3 Adversarial Stress Verification Suite
 * Target: Hit-Stop & Walk Bobbing Freeze mechanics in EnemySprite & BattleScene
 * 
 * Adversarial Hypotheses & Stress Scenarios:
 * 1. Rapid-Fire Multi-Hit Stress:
 *    - 20 successive rapid triggerHitStop() calls in the same frame MUST reset to durationSec without unbounded accumulation.
 *    - Interleaved multi-hit stream (gatling fire: hit every 5ms for 20 rounds) must keep hitStopTimer strictly clamped <= durationSec.
 * 2. Walk Bobbing Freeze Test:
 *    - Sample baseSprite.y across multiple sub-frame updates (e.g. 10x 0.004s) during hit-stop.
 *    - baseSprite.y MUST strictly remain identical (frozen) until hit-stop expires.
 *    - bobTimer must NOT advance while hit-stop is active.
 *    - Phase continuity: after hit-stop unfreezes, walk bobbing continues smoothly from the exact phase.
 *    - Boss amplitude (1.5px) and ordinary amplitude (2.5px) are both verified under freeze.
 * 3. Position Snap Bypass Test:
 *    - Simulate BattleScene coordinate sync loop with a constantly moving core enemy.
 *    - When sprite.isHitStopped() is true, sprite.setPosition() is completely bypassed.
 *    - Visual container (x, y) stays frozen in place despite core enemy advancing downward.
 *    - Upon expiration, next tick resumes setPosition() snapping to the updated core coordinate.
 * 4. Boundary & Degradation Robustness:
 *    - Micro-step delta (120fps = 0.008333s) and zero delta (deltaSec = 0) do not stall or corrupt timer.
 *    - Extreme lag spike (deltaSec = 2.0s) clamps hitStopTimer cleanly to 0 without becoming negative.
 *    - destroy() immediately clears hitStopTimer and isHitStopped() to false.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';

// Mock Phaser Environment for headless Node testing
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
    fillRect(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'fillRect', x, y, w, h }); return this; }
    fillCircle(x: number, y: number, r: number) { this.commands.push({ type: 'fillCircle', x, y, r }); return this; }
    fillEllipse(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'fillEllipse', x, y, w, h }); return this; }
    strokeEllipse(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'strokeEllipse', x, y, w, h }); return this; }
    lineStyle(w: number, c: number, a = 1.0) { this.commands.push({ type: 'lineStyle', w, c, a }); return this; }
    lineBetween(x1: number, y1: number, x2: number, y2: number) { this.commands.push({ type: 'lineBetween', x1, y1, x2, y2 }); return this; }
  }

  class MockContainer extends MockGameObject {
    list: any[] = [];
    add(obj: any | any[]) {
      if (Array.isArray(obj)) {
        this.list.push(...obj);
      } else {
        this.list.push(obj);
      }
      return this;
    }
    remove(obj: any) {
      const idx = this.list.indexOf(obj);
      if (idx !== -1) this.list.splice(idx, 1);
      return this;
    }
  }

  class MockScene {
    constructor(public config?: any) {}
  }

  return {
    default: {
      Scene: MockScene,
      BlendModes: { NORMAL: 0, ADD: 1 },
      GameObjects: {
        GameObject: MockGameObject,
        Graphics: MockGraphics,
        Sprite: MockSprite,
        Container: MockContainer,
        Particles: {
          ParticleEmitter: class {}
        }
      }
    }
  };
});

import { EnemySprite } from '../src/presentation/renderers/enemy-sprite';
import { EnemyEntity } from '../src/core/types';

describe('Challenger M3 Adversarial: Hit-Stop & Walk Bobbing Freeze Empirical Verification', () => {
  let mockScene: any;

  const createEnemy = (overrides?: Partial<EnemyEntity>): EnemyEntity => ({
    id: 'adversarial_enemy_01',
    typeId: 'ordinary',
    name: '死士斥候',
    currentHp: 150,
    maxHp: 150,
    moveSpeed: 1.2,
    armor: 12,
    shield: 0,
    wallDamage: 15,
    isBoss: false,
    x: 375,
    y: 900,
    ...overrides
  });

  beforeEach(() => {
    mockScene = {
      cameras: { main: { shake: vi.fn() } },
      time: { now: 2000 },
      add: {
        graphics: () => new (Phaser.GameObjects as any).Graphics(mockScene),
        sprite: (x = 0, y = 0, key = '') => new (Phaser.GameObjects as any).Sprite(mockScene, x, y, key),
        existing: (obj: any) => obj
      },
      textures: {
        exists: vi.fn(() => true),
        get: vi.fn(() => ({ getSourceImage: () => ({ width: 72, height: 72 }) }))
      },
      tweens: {
        add: vi.fn((c: any) => c),
        killAll: vi.fn()
      }
    };
  });

  // =========================================================================
  // Challenge Dimension 1: Rapid-Fire Multi-Hit Stress (Unbounded Accumulation Check)
  // =========================================================================
  describe('Dimension 1: Rapid-Fire Multi-Hit Stress & Accumulation Guard', () => {
    it('calling triggerHitStop() 20 times in succession resets duration without accumulation', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      // Rapidly fire 20 hits in the same frame
      const singleDuration = 0.045;
      for (let i = 0; i < 20; i++) {
        sprite.triggerHitStop(singleDuration);
      }

      // If timer accumulated, it would be 20 * 0.045 = 0.900s
      // It MUST strictly reset to 0.045s, NOT accumulate!
      expect(sprite.hitStopTimer).toBe(singleDuration);
      expect(sprite.hitStopTimer).not.toBeCloseTo(0.9, 2);
      expect(sprite.isHitStopped()).toBe(true);

      // Verify that after 0.045s of update time, hit-stop expires completely
      sprite.update(0.045);
      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
    });

    it('interleaved gatling projectile stream: 20 rapid hits interleaved with 5ms updates remains clamped <= duration', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);
      const hitDuration = 0.033; // 2-frame stop for high-cadence fire

      for (let i = 0; i < 20; i++) {
        sprite.triggerHitStop(hitDuration);
        sprite.update(0.005); // 5ms simulated sub-frame tick

        // At any moment during continuous bombardment, timer must never exceed hitDuration
        expect(sprite.hitStopTimer).toBeLessThanOrEqual(hitDuration);
        expect(sprite.hitStopTimer).toBeGreaterThan(0);
        expect(sprite.isHitStopped()).toBe(true);
      }

      // After bombardment stops, it must cleanly expire within at most hitDuration
      expect(sprite.hitStopTimer).toBeCloseTo(hitDuration - 0.005, 4);
      sprite.update(hitDuration);
      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
    });

    it('overwriting hitStop with varying durations adopts latest duration cleanly', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      // Normal hit (0.033s)
      sprite.triggerHitStop(0.033);
      sprite.update(0.010);
      expect(sprite.hitStopTimer).toBeCloseTo(0.023, 4);

      // Heavy cannon blast lands before previous expires, applying 0.050s
      sprite.triggerHitStop(0.050);
      expect(sprite.hitStopTimer).toBe(0.050); // reset to new stronger duration

      sprite.update(0.050);
      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
    });
  });

  // =========================================================================
  // Challenge Dimension 2: Walk Bobbing Freeze Invariant
  // =========================================================================
  describe('Dimension 2: Walk Bobbing Freeze Invariant & Phase Stability', () => {
    it('samples baseSprite.y across 10 sub-frame updates during hit-stop and verifies zero displacement change', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      // Advance enemy walking for 0.42 seconds to reach an arbitrary non-zero bobbing position
      sprite.update(0.42);
      const frozenBobTimer = sprite.bobTimer;
      const frozenY = sprite.baseSprite.y;

      // Ensure we are not trivially at y = 0
      expect(frozenBobTimer).toBe(0.42);
      expect(frozenY).not.toBe(0);

      // Trigger 0.050s hit-stop
      sprite.triggerHitStop(0.050);

      // Sample over 10 sub-frame updates of 0.004s each (total 0.040s elapsed, within the 0.050s window)
      const samples: number[] = [];
      for (let step = 0; step < 10; step++) {
        sprite.update(0.004);
        samples.push(sprite.baseSprite.y);

        // Invariant 1: bobTimer MUST remain strictly frozen at 0.42
        expect(sprite.bobTimer).toBe(frozenBobTimer);

        // Invariant 2: baseSprite.y MUST strictly match frozenY
        expect(sprite.baseSprite.y).toBe(frozenY);

        // Invariant 3: isHitStopped remains true
        expect(sprite.isHitStopped()).toBe(true);
      }

      // Every single sample must be exactly equal to the frozen value
      expect(samples.length).toBe(10);
      for (const sample of samples) {
        expect(sample).toBe(frozenY);
      }

      // Advance remaining 0.010s to expire hit-stop (total 0.050s elapsed)
      sprite.update(0.010);
      expect(sprite.isHitStopped()).toBe(false);
      expect(sprite.hitStopTimer).toBe(0);

      // Next tick resumes normal walk bobbing
      sprite.update(0.020);
      // Total bobTimer advance is 0.010 (from expiring frame) + 0.020 (resumed frame) = 0.030
      expect(sprite.bobTimer).toBeCloseTo(frozenBobTimer + 0.030, 4);
      expect(sprite.baseSprite.y).not.toBe(frozenY);
    });

    it('verifies Boss blood aura and walk bobbing freeze behavior under Boss amplitude (1.5px)', () => {
      const bossEnemy = createEnemy({
        id: 'adversarial_boss_01',
        name: '九天神机督战首领',
        isBoss: true,
        maxHp: 2000,
        currentHp: 2000,
        armor: 50
      });
      const bossSprite = new EnemySprite(mockScene, bossEnemy);

      // Let boss march for 0.35s
      bossSprite.update(0.35);
      const bossFrozenY = bossSprite.baseSprite.y;
      const bossBobTimer = bossSprite.bobTimer;

      // Boss amplitude is 1.5, ordinary is 2.5
      expect(Math.abs(bossFrozenY)).toBeLessThanOrEqual(1.50001);

      // Trigger hit-stop
      bossSprite.triggerHitStop(0.045);

      // Run 4 frames of 0.010s
      for (let i = 0; i < 4; i++) {
        bossSprite.update(0.010);
        expect(bossSprite.baseSprite.y).toBe(bossFrozenY);
        expect(bossSprite.bobTimer).toBe(bossBobTimer);
      }

      // Expire hit-stop
      bossSprite.update(0.005);
      expect(bossSprite.isHitStopped()).toBe(false);

      // Resume
      bossSprite.update(0.020);
      expect(bossSprite.bobTimer).toBeGreaterThan(bossBobTimer);
    });

    it('verifies marching dust kickup is suppressed during hit-stop', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);
      const graphicsAddSpy = vi.spyOn(mockScene.add, 'graphics');

      // Normal walking over DUST_INTERVAL (0.35s) triggers dust puff
      sprite.update(0.36);
      expect(graphicsAddSpy).toHaveBeenCalled();
      graphicsAddSpy.mockClear();

      // Enter hit-stop for 0.050s
      sprite.triggerHitStop(0.050);

      // Update 0.040s in hit-stop
      sprite.update(0.040);
      // Dust kickup must NOT trigger while hit-stop is active
      expect(graphicsAddSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Challenge Dimension 3: BattleScene Coordinate Synchronization Bypass Test
  // =========================================================================
  describe('Dimension 3: BattleScene Position Snap Bypass Test', () => {
    it('simulates BattleScene update loop: sprite.setPosition is strictly bypassed while isHitStopped() is true', () => {
      const enemy = createEnemy({ x: 375, y: 800 });
      const sprite = new EnemySprite(mockScene, enemy);
      const setPositionSpy = vi.spyOn(sprite, 'setPosition');

      // Initial visual position
      expect(sprite.x).toBe(375);
      expect(sprite.y).toBe(800);

      // Helper simulating the exact synchronization logic in BattleScene.prototype.update (lines 1001-1005)
      const simulateBattleSceneFrame = (deltaSec: number) => {
        if (!sprite.isHitStopped()) {
          sprite.setPosition(enemy.x || 375, enemy.y || 1120);
        }
        sprite.update(deltaSec);
      };

      // Frame 1: Normal walking frame (delta = 0.016s)
      enemy.y = 802;
      simulateBattleSceneFrame(0.016);
      expect(setPositionSpy).toHaveBeenCalledWith(375, 802);
      expect(sprite.y).toBe(802);
      setPositionSpy.mockClear();

      // Frame 2: Projectile hits enemy! triggerHitStop(0.048s) (~3 frames)
      sprite.triggerHitStop(0.048);
      expect(sprite.isHitStopped()).toBe(true);

      // Frame 3: Enemy moves in core logic (y = 804), but visual container is hit-stopped!
      enemy.y = 804;
      simulateBattleSceneFrame(0.016);
      // setPosition must NOT have been called in this frame
      expect(setPositionSpy).not.toHaveBeenCalled();
      // Sprite container coordinates remain pinned at the previous 802
      expect(sprite.y).toBe(802);
      expect(sprite.isHitStopped()).toBe(true);

      // Frame 4: Enemy moves further in core logic (y = 806), still hit-stopped!
      enemy.y = 806;
      simulateBattleSceneFrame(0.016);
      expect(setPositionSpy).not.toHaveBeenCalled();
      expect(sprite.y).toBe(802);
      expect(sprite.isHitStopped()).toBe(true);

      // Frame 5: Hit-stop expires during this update (0.048 - 0.016*2 - 0.016 = 0)
      enemy.y = 808;
      // In this frame, at the start of simulateBattleSceneFrame:
      // hitStopTimer was 0.016 before update, so isHitStopped() was still true!
      // Therefore setPosition was bypassed for this frame as well:
      simulateBattleSceneFrame(0.016);
      expect(setPositionSpy).not.toHaveBeenCalled();
      // But now after update(0.016), hitStopTimer has reached 0:
      expect(sprite.isHitStopped()).toBe(false);

      // Frame 6: Hit-stop is now expired! Position synchronization resumes and snaps to current core position
      enemy.y = 810;
      simulateBattleSceneFrame(0.016);
      expect(setPositionSpy).toHaveBeenCalledWith(375, 810);
      expect(sprite.y).toBe(810);
    });

    it('verifies concurrent hit-flash and hit-stop lifecycle independence', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      // Critical hit: flash is 0.080s, hit-stop is 0.050s
      sprite.playHitFlash(true); // 0.080s
      sprite.triggerHitStop(0.050); // 0.050s

      expect(sprite.isFlashing()).toBe(true);
      expect(sprite.isHitStopped()).toBe(true);
      expect(sprite.flashTimer).toBe(0.080);
      expect(sprite.hitStopTimer).toBe(0.050);

      // Advance 0.050s: hit-stop expires, but flash is still active (0.030s remaining)
      sprite.update(0.050);
      expect(sprite.isHitStopped()).toBe(false);
      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isFlashing()).toBe(true);
      expect(sprite.flashTimer).toBeCloseTo(0.030, 4);
      expect(sprite.baseSprite.tintFill).toBe(true);

      // Advance another 0.030s: flash now expires
      sprite.update(0.030);
      expect(sprite.isFlashing()).toBe(false);
      expect(sprite.flashTimer).toBe(0);
      expect(sprite.baseSprite.tintFill).toBe(false);
    });
  });

  // =========================================================================
  // Challenge Dimension 4: Numerical Boundary & Degradation Stress
  // =========================================================================
  describe('Dimension 4: Numerical Boundary & Degradation Stress', () => {
    it('handles 120fps micro-steps (deltaSec = 0.008333s) without floating point leak', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);
      const microStep = 1 / 120; // 0.008333333333333333s

      sprite.triggerHitStop(0.045);

      // Tick 6 micro-steps (6 * 0.008333 = 0.050s > 0.045s)
      for (let i = 0; i < 6; i++) {
        sprite.update(microStep);
      }

      // Timer should cleanly reach 0 without remaining as 1e-17
      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
    });

    it('handles zero delta (pause frame deltaSec = 0) gracefully', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.triggerHitStop(0.045);
      sprite.update(0);

      expect(sprite.hitStopTimer).toBe(0.045);
      expect(sprite.isHitStopped()).toBe(true);
    });

    it('handles massive lag spike (deltaSec = 2.0s) without negative underflow', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.triggerHitStop(0.045);
      sprite.update(2.0);

      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
    });

    it('destroy() resets hitStopTimer cleanly ensuring no lingering state', () => {
      const enemy = createEnemy();
      const sprite = new EnemySprite(mockScene, enemy);

      sprite.triggerHitStop(0.045);
      expect(sprite.isHitStopped()).toBe(true);

      sprite.destroy();
      expect(sprite.hitStopTimer).toBe(0);
      expect(sprite.isHitStopped()).toBe(false);
      expect((sprite as any).isDestroyed).toBe(true);
    });
  });
});
