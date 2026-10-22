/**
 * 《孤城神机营》- Milestone M1 Challenger Adversarial Test Suite
 * Empirical Verification of Damage Stacking / Clustering & Anti-Occlusion Anchors
 * in `src/presentation/renderers/fly-text.ts`.
 *
 * Verifies:
 * 1. Rapid multi-bullet hits within 150ms (accumulation accuracy, high-frequency stress, multi-target isolation).
 * 2. Crit escalation & styling upgrade (color, stroke, font size, KaiTi font, sparkle burst, non-downgrade).
 * 3. Temporal window expiry (>150ms separation spawns fresh text, cadence separation, tween lifecycle).
 * 4. Anti-occlusion anchors (y - 42 for normal, y - 75 for boss, strictly above health bars and heads).
 * 5. Spatial hash fallback, pool auto-expansion under heavy load, and teardown cleanup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';

// Mock Phaser Environment
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
    destroy() { this.isDestroyed = true; }
  }

  class MockGraphics extends MockGameObject {
    commands: any[] = [];
    clear() { this.commands = []; return this; }
    fillStyle(color: number, alpha = 1.0) { this.commands.push({ type: 'fillStyle', color, alpha }); return this; }
    fillCircle(x: number, y: number, r: number) { this.commands.push({ type: 'fillCircle', x, y, r }); return this; }
    lineStyle(w: number, color: number, alpha = 1.0) { this.commands.push({ type: 'lineStyle', w, color, alpha }); return this; }
    fillEllipse(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'fillEllipse', x, y, w, h }); return this; }
    strokeEllipse(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'strokeEllipse', x, y, w, h }); return this; }
  }

  class MockText extends MockGameObject {
    text: string = '';
    style: any = {};
    constructor(scene: any, x = 0, y = 0, text = '', style = {}) {
      super(scene, x, y);
      this.text = text;
      this.style = { ...style };
    }
    setText(t: string) { this.text = t; return this; }
    setFontSize(s: string) { this.style.fontSize = s; return this; }
    setColor(c: string) { this.style.color = c; return this; }
    setFontFamily(f: string) { this.style.fontFamily = f; return this; }
    setStroke(color: string, thickness: number) { this.style.stroke = color; this.style.strokeThickness = thickness; return this; }
  }

  return {
    default: {
      GameObjects: {
        GameObject: MockGameObject,
        Graphics: MockGraphics,
        Text: MockText,
        Sprite: MockGameObject
      }
    }
  };
});

import { FloatingTextPool } from '../src/presentation/renderers/fly-text';

describe('Challenger M1_1 Adversarial Suite: Damage Stacking & Anti-Occlusion', () => {
  let mockScene: any;
  let addedTweens: any[];
  let createdGraphics: any[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(100000); // T0 = 100,000ms

    addedTweens = [];
    createdGraphics = [];

    mockScene = {
      add: {
        graphics: () => {
          const g = new (Phaser.GameObjects as any).Graphics(mockScene);
          createdGraphics.push(g);
          return g;
        },
        text: (x = 0, y = 0, text = '', style = {}) => new (Phaser.GameObjects as any).Text(mockScene, x, y, text, style)
      },
      tweens: {
        add: vi.fn((config: any) => {
          const tweenHandle = {
            ...config,
            isStopped: false,
            stop: vi.fn(() => {
              tweenHandle.isStopped = true;
            })
          };
          addedTweens.push(tweenHandle);
          return tweenHandle;
        })
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. Rapid Multi-bullet Hits within 150ms Window
  // =========================================================================
  describe('1. Rapid Multi-bullet Hits Accumulation (< 150ms)', () => {
    it('1A: 10 rapid hits totaling 500 damage on the same enemy accumulate accurately to 500', () => {
      const pool = new FloatingTextPool(mockScene, 10);
      const enemyId = 'invader_orc_01';

      // 10 hits of 50 damage arriving every 10ms (t = 0 to 90ms, all within 150ms)
      for (let i = 0; i < 10; i++) {
        pool.spawnDamage(enemyId, 375, 800, 50, false, false);
        vi.advanceTimersByTime(10);
      }

      const cluster = pool.getActiveCluster(enemyId);
      expect(cluster).toBeDefined();
      expect(cluster!.hitCount).toBe(10);
      expect(cluster!.totalDamage).toBe(500);
      expect(cluster!.textObj.text).toBe('500');
      expect(cluster!.hasCrit).toBe(false);
      // Ensure only 1 active cluster exists (no duplicate overlapping text objects)
      expect(pool.getActiveClusterCount()).toBe(1);
    });

    it('1B: High-frequency stress test: 50 fractional hits sum with mathematical rounding precision', () => {
      const pool = new FloatingTextPool(mockScene, 20);
      const enemyId = 'boss_heavy_armor';
      let expectedSum = 0;

      // 50 rapid hits of various fractional damages
      for (let i = 0; i < 50; i++) {
        const dmg = 12.35 + (i % 5) * 1.5; // fractional damage values
        expectedSum += dmg;
        pool.spawnDamage(enemyId, 400, 750, dmg, false, true);
        vi.advanceTimersByTime(2); // 2ms interval -> total elapsed 100ms < 150ms
      }

      const cluster = pool.getActiveCluster(enemyId);
      expect(cluster).toBeDefined();
      expect(cluster!.hitCount).toBe(50);
      expect(cluster!.totalDamage).toBeCloseTo(expectedSum, 4);
      expect(cluster!.textObj.text).toBe(Math.round(expectedSum).toString());
      expect(pool.getActiveClusterCount()).toBe(1);
    });

    it('1C: Interleaved multi-target barrage: multiple enemies maintain independent clusters without pollution', () => {
      const pool = new FloatingTextPool(mockScene, 20);
      const enemyA = 'flank_left_01';
      const enemyB = 'flank_right_02';
      const enemyC = 'center_boss_03';

      let sumA = 0;
      let sumB = 0;
      let sumC = 0;

      // Interleave hits between A, B, and C
      for (let i = 0; i < 15; i++) {
        const dmgA = 40;
        const dmgB = 75;
        const dmgC = 120;

        sumA += dmgA;
        sumB += dmgB;
        sumC += dmgC;

        pool.spawnDamage(enemyA, 200, 800, dmgA, false, false);
        pool.spawnDamage(enemyB, 500, 800, dmgB, false, false);
        pool.spawnDamage(enemyC, 375, 700, dmgC, false, true);

        vi.advanceTimersByTime(8);
      }

      expect(pool.getActiveClusterCount()).toBe(3);

      const clusterA = pool.getActiveCluster(enemyA);
      const clusterB = pool.getActiveCluster(enemyB);
      const clusterC = pool.getActiveCluster(enemyC);

      expect(clusterA!.totalDamage).toBe(sumA);
      expect(clusterA!.textObj.text).toBe(sumA.toString());
      expect(clusterA!.isBoss).toBe(false);

      expect(clusterB!.totalDamage).toBe(sumB);
      expect(clusterB!.textObj.text).toBe(sumB.toString());
      expect(clusterB!.isBoss).toBe(false);

      expect(clusterC!.totalDamage).toBe(sumC);
      expect(clusterC!.textObj.text).toBe(sumC.toString());
      expect(clusterC!.isBoss).toBe(true);
    });
  });

  // =========================================================================
  // 2. Crit Promotion & Styling Escalation
  // =========================================================================
  describe('2. Crit Escalation & Styling Upgrade', () => {
    it('2A: Normal cluster promotes to crit style immediately upon receiving a crit, and does NOT downgrade on subsequent normal hits', () => {
      const pool = new FloatingTextPool(mockScene, 10);
      const enemyId = 'enemy_crit_escalate';

      // Hit 1: Normal hit (100)
      pool.spawnDamage(enemyId, 375, 800, 100, false, false);
      let cluster = pool.getActiveCluster(enemyId)!;
      expect(cluster.hasCrit).toBe(false);
      expect(cluster.style).toBe('normal');
      expect(cluster.textObj.style.color).toBe('#ffffff');
      expect(cluster.textObj.style.strokeThickness).toBe(3);
      expect(cluster.textObj.style.fontSize).toBe('16px');

      vi.advanceTimersByTime(20);

      // Hit 2: Normal hit (50)
      pool.spawnDamage(enemyId, 375, 800, 50, false, false);
      cluster = pool.getActiveCluster(enemyId)!;
      expect(cluster.hasCrit).toBe(false);
      expect(cluster.totalDamage).toBe(150);
      expect(cluster.textObj.text).toBe('150');

      vi.advanceTimersByTime(20);

      // Hit 3: Critical hit! (200) -> Must promote cluster to crit style
      const graphicsBefore = createdGraphics.length;
      pool.spawnDamage(enemyId, 375, 800, 200, true, false);
      cluster = pool.getActiveCluster(enemyId)!;
      expect(cluster.hasCrit).toBe(true);
      expect(cluster.style).toBe('crit');
      expect(cluster.totalDamage).toBe(350);
      expect(cluster.textObj.text).toBe('350');
      // Visual styling verification
      expect(cluster.textObj.style.color).toBe('#ffd700');
      expect(cluster.textObj.style.stroke).toBe('#7f0000');
      expect(cluster.textObj.style.strokeThickness).toBe(4);
      expect(cluster.textObj.style.fontSize).toBe('24px');
      expect(cluster.textObj.style.fontFamily).toContain('KaiTi');
      // Sparkle particles generated (5 radial star particles)
      expect(createdGraphics.length).toBe(graphicsBefore + 5);

      vi.advanceTimersByTime(20);

      // Hit 4: Normal hit (80) -> MUST NOT DOWNGRADE CRIT STATUS
      pool.spawnDamage(enemyId, 375, 800, 80, false, false);
      cluster = pool.getActiveCluster(enemyId)!;
      expect(cluster.hasCrit).toBe(true);
      expect(cluster.style).toBe('crit');
      expect(cluster.totalDamage).toBe(430);
      expect(cluster.textObj.text).toBe('430');
      expect(cluster.textObj.style.color).toBe('#ffd700');
      expect(cluster.textObj.style.strokeThickness).toBe(4);
      expect(cluster.textObj.style.fontSize).toBe('24px');
    });

    it('2B: Pop scale tween refreshes on every clustered hit with 1.25x scale punch', () => {
      const pool = new FloatingTextPool(mockScene, 10);
      const enemyId = 'enemy_pop_scale';

      // Initial hit
      pool.spawnDamage(enemyId, 300, 600, 60, false, false);
      const cluster = pool.getActiveCluster(enemyId)!;

      // Initial pop scale is 1.0 * 1.25 = 1.25
      expect(cluster.textObj.scaleX).toBe(1.25);
      expect(cluster.textObj.scaleY).toBe(1.25);

      vi.advanceTimersByTime(30);

      // Second hit triggers pop scale tween refresh
      pool.spawnDamage(enemyId, 300, 600, 70, false, false);
      expect(cluster.textObj.scaleX).toBe(1.25);

      vi.advanceTimersByTime(30);

      // Crit hit elevates base scale to 1.2, so punch is 1.2 * 1.25 = 1.50
      pool.spawnDamage(enemyId, 300, 600, 150, true, false);
      expect(cluster.textObj.scaleX).toBeCloseTo(1.50, 2);
    });
  });

  // =========================================================================
  // 3. Temporal Window Expiry (> 150ms) & Fresh Number Spawning
  // =========================================================================
  describe('3. Window Expiration & Cadence Separation (> 150ms)', () => {
    it('3A: Hits separated by >150ms spawn fresh floating numbers rather than infinitely stacking', () => {
      const pool = new FloatingTextPool(mockScene, 10);
      const enemyId = 'enemy_cadence_test';

      // Hit 1 at t = 0 (damage = 100)
      pool.spawnDamage(enemyId, 375, 800, 100, false, false);
      const cluster1 = pool.getActiveCluster(enemyId)!;
      const textObj1 = cluster1.textObj;
      expect(cluster1.totalDamage).toBe(100);
      expect(textObj1.text).toBe('100');

      // Advance time by 160ms (> 150ms clustering window)
      vi.advanceTimersByTime(160);

      // Hit 2 at t = 160 (damage = 150)
      pool.spawnDamage(enemyId, 375, 800, 150, false, false);
      const cluster2 = pool.getActiveCluster(enemyId)!;
      const textObj2 = cluster2.textObj;

      // Verification: Hit 2 must NOT be merged into textObj1 (which would be 250)
      expect(cluster2.totalDamage).toBe(150);
      expect(textObj2.text).toBe('150');
      expect(textObj1.text).toBe('100');
      // Must be two distinct text instances from the pool
      expect(textObj2).not.toBe(textObj1);
    });

    it('3B: Multi-burst rhythmic cadence: 2 distinct bursts of fire separated by 200ms form 2 distinct clusters', () => {
      const pool = new FloatingTextPool(mockScene, 15);
      const enemyId = 'enemy_burst_cadence';

      // Burst 1: 3 hits at t = 0, 30, 60ms (sum = 300)
      pool.spawnDamage(enemyId, 375, 800, 100, false, false);
      vi.advanceTimersByTime(30);
      pool.spawnDamage(enemyId, 375, 800, 100, false, false);
      vi.advanceTimersByTime(30);
      pool.spawnDamage(enemyId, 375, 800, 100, false, false);

      const clusterBurst1 = pool.getActiveCluster(enemyId)!;
      const textBurst1 = clusterBurst1.textObj;
      expect(clusterBurst1.totalDamage).toBe(300);
      expect(textBurst1.text).toBe('300');

      // Quiet interval: 200ms gap (> 150ms)
      vi.advanceTimersByTime(200);

      // Burst 2: 2 hits at t = 260, 290ms (sum = 250)
      pool.spawnDamage(enemyId, 375, 800, 150, false, false);
      vi.advanceTimersByTime(30);
      pool.spawnDamage(enemyId, 375, 800, 100, false, false);

      const clusterBurst2 = pool.getActiveCluster(enemyId)!;
      const textBurst2 = clusterBurst2.textObj;

      // Burst 2 accumulated only 150 + 100 = 250
      expect(clusterBurst2.totalDamage).toBe(250);
      expect(textBurst2.text).toBe('250');
      // Burst 1 preserved its 300 total
      expect(textBurst1.text).toBe('300');
      expect(textBurst1).not.toBe(textBurst2);
    });

    it('3C: Tween completion safely recycles text object and cleans up cluster entry', () => {
      const pool = new FloatingTextPool(mockScene, 10);
      const enemyId = 'enemy_recycle_test';

      pool.spawnDamage(enemyId, 375, 800, 88, false, false);
      const cluster = pool.getActiveCluster(enemyId)!;
      const textObj = cluster.textObj;
      expect(textObj.visible).toBe(true);
      expect(pool.getActiveClusterCount()).toBe(1);

      // Trigger floatTween onComplete callback (simulating animation finish)
      expect(cluster.floatTween).toBeDefined();
      expect((cluster.floatTween as any).onComplete).toBeTypeOf('function');
      (cluster.floatTween as any).onComplete();

      // Text object recycled (visible set to false)
      expect(textObj.visible).toBe(false);
      // Active cluster deleted
      expect(pool.getActiveCluster(enemyId)).toBeUndefined();
      expect(pool.getActiveClusterCount()).toBe(0);
    });

    it('3D: Overlapping lifecycle: when an earlier cluster tween completes, does it affect an active subsequent cluster?', () => {
      const pool = new FloatingTextPool(mockScene, 10);
      const enemyId = 'enemy_overlap_lifecycle';

      // Cluster 1 at t = 0
      pool.spawnDamage(enemyId, 375, 800, 100, false, false);
      const cluster1 = pool.getActiveCluster(enemyId)!;
      const tween1 = cluster1.floatTween;

      // Advance by 200ms (> 150ms window) -> Cluster 2 starts at t = 200
      vi.advanceTimersByTime(200);
      pool.spawnDamage(enemyId, 375, 800, 150, false, false);
      const cluster2 = pool.getActiveCluster(enemyId)!;
      expect(cluster2.totalDamage).toBe(150);

      // Keep Cluster 2 alive with a hit at t = 300
      vi.advanceTimersByTime(100);
      pool.spawnDamage(enemyId, 375, 800, 50, false, false);
      expect(cluster2.totalDamage).toBe(200);

      // Suppose tween1 finishes while cluster2 is still active.
      // If tween1's onComplete deletes key blindly:
      if (tween1 && (tween1 as any).onComplete) {
        (tween1 as any).onComplete();
      }

      // Check whether activeClusters still has cluster2 or was wiped out
      const clusterAfterTween1 = pool.getActiveCluster(enemyId);
      expect(clusterAfterTween1).toBeDefined();
      expect(clusterAfterTween1?.totalDamage).toBe(200);

      // Subsequent hit at t = 350 (within 150ms of hit at t = 300) should cluster with cluster2
      vi.advanceTimersByTime(50);
      pool.spawnDamage(enemyId, 375, 800, 50, false, false);
      const cluster3 = pool.getActiveCluster(enemyId);
      expect(cluster3?.totalDamage).toBe(250);
    });
  });

  // =========================================================================
  // 4. Anti-Occlusion Anchoring (y - 42 for normal, y - 75 for boss)
  // =========================================================================
  describe('4. Anti-Occlusion Anchor Positioning', () => {
    it('4A: Ordinary enemy anchor is strictly at y - 42 and floats upward only (never into torso or health bar)', () => {
      const pool = new FloatingTextPool(mockScene, 5);
      const enemyY = 800;
      const enemyX = 375;

      pool.spawnDamage('norm_enemy_pos', enemyX, enemyY, 120, false, false);
      const cluster = pool.getActiveCluster('norm_enemy_pos')!;

      // Anchor offset check: 800 - 42 = 758
      expect(cluster.startY).toBe(758);
      expect(cluster.textObj.y).toBe(758);

      // Horizontal jitter constraint: [-8, +8]
      expect(cluster.startX).toBeGreaterThanOrEqual(enemyX - 8);
      expect(cluster.startX).toBeLessThanOrEqual(enemyX + 8);

      // Float tween check: targets startY - 45 = 713 (floats upward away from enemy)
      expect(cluster.floatTween).toBeDefined();
      expect((cluster.floatTween as any).y).toBe(758 - 45); // 713

      // Enemy HP bar is at enemyY - 32 = 768.
      // Fly text starts at 758 (10px above HP bar) and ends at 713 (55px above HP bar).
      // At all times, flytext y <= 758 < 768. Torso and HP bar are completely unobstructed.
      expect(cluster.textObj.y).toBeLessThan(768);
    });

    it('4B: Boss enemy anchor is strictly at y - 75 and floats upward by 55px on crit', () => {
      const pool = new FloatingTextPool(mockScene, 5);
      const bossY = 700;
      const bossX = 375;

      pool.spawnDamage('boss_pos_test', bossX, bossY, 500, true, true);
      const cluster = pool.getActiveCluster('boss_pos_test')!;

      // Boss anchor offset check: 700 - 75 = 625
      expect(cluster.startY).toBe(625);
      expect(cluster.textObj.y).toBe(625);

      // Float tween check on crit: targets startY - 55 = 570
      expect(cluster.floatTween).toBeDefined();
      expect((cluster.floatTween as any).y).toBe(625 - 55); // 570

      // Boss HP bar is at bossY - 66.5 = 633.5.
      // Fly text starts at 625 (8.5px above Boss HP bar) and floats up to 570.
      expect(cluster.textObj.y).toBeLessThan(633.5);
    });

    it('4C: General spawn() method also enforces anti-occlusion offsets (42 for normal, 75 for boss)', () => {
      const pool = new FloatingTextPool(mockScene, 5);

      // Normal unit notification
      pool.spawn(375, 800, '破甲', 'sunder', false);
      const normalText = (pool as any).pool.find((t: any) => t.text === '破甲');
      expect(normalText).toBeDefined();
      expect(normalText.y).toBe(800 - 42); // 758

      // Boss unit notification
      pool.spawn(375, 700, '首领绝技', 'crit', true);
      const bossText = (pool as any).pool.find((t: any) => t.text === '首领绝技');
      expect(bossText).toBeDefined();
      expect(bossText.y).toBe(700 - 75); // 625
    });
  });

  // =========================================================================
  // 5. Robustness, Spatial Hashing & Teardown
  // =========================================================================
  describe('5. Robustness, Fallback & Lifecycle', () => {
    it('5A: Falls back to 40px spatial grid hashing when targetId is empty', () => {
      const pool = new FloatingTextPool(mockScene, 10);

      // Hit 1 with empty targetId at (360, 800) -> 360/40=9, 800/40=20 -> key "9_20"
      pool.spawnDamage('', 360, 800, 50, false, false);
      const clusterKey = '9_20';
      let cluster = pool.getActiveCluster(clusterKey);
      expect(cluster).toBeDefined();
      expect(cluster!.totalDamage).toBe(50);

      // Hit 2 near the same grid cell at (362, 798) -> 362/40=9, 798/40=20 -> key "9_20"
      pool.spawnDamage('', 362, 798, 70, false, false);
      cluster = pool.getActiveCluster(clusterKey);
      expect(cluster!.totalDamage).toBe(120);
      expect(cluster!.hitCount).toBe(2);
      expect(pool.getActiveClusterCount()).toBe(1);
    });

    it('5B: Auto-expands pool capacity when requests exceed initial capacity without throwing', () => {
      // Start with small capacity 3
      const pool = new FloatingTextPool(mockScene, 3);

      // Spawn 10 simultaneous hits on 10 different targets
      for (let i = 0; i < 10; i++) {
        expect(() => {
          pool.spawnDamage(`unique_target_${i}`, 100 + i * 20, 800, 50, false, false);
        }).not.toThrow();
      }

      expect(pool.getActiveClusterCount()).toBe(10);
      expect((pool as any).pool.length).toBeGreaterThanOrEqual(10);
    });

    it('5C: clear() and destroy() cleanly stop tweens and recycle all text objects', () => {
      const pool = new FloatingTextPool(mockScene, 10);
      pool.spawnDamage('t1', 200, 600, 100, false, false);
      pool.spawnDamage('t2', 300, 600, 200, true, false);

      expect(pool.getActiveClusterCount()).toBe(2);

      pool.clear();
      expect(pool.getActiveClusterCount()).toBe(0);

      pool.destroy();
      expect((pool as any).pool.length).toBe(0);
    });
  });
});
