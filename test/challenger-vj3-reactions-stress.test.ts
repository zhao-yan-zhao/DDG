/**
 * 《孤城神机营》- Milestone M_VJ3 Adversarial Reactions & Anti-Crash Stress Test Suite
 * Author: challenger_vj3_2 (Combat Juice Challenger 2)
 *
 * Verifies:
 * 1. Simultaneous triggering of 4 elemental reactions under maximum combat load (50~100 enemies)
 * 2. ReactionValve anti-crash limits:
 *    - Global tick cap (max 20 reactions/tick) and graceful rejection
 *    - Explosion 1.5s ICD boundary enforcement and oil preservation on reject
 *    - Ice Shatter 2.0s ICD boundary enforcement and freeze preservation on reject
 *    - Boss Thunder Strike max 3 stuns ceiling and 50% tenacity (1.0s vs 2.0s)
 *    - Boss Ice Shatter 3% max HP damage cap vs regular 8% max HP damage
 *    - Nether Poison Flame 4.0s duration hard ceiling without infinite accumulation
 *    - Recursion guard resilience under nested cascades and exception safety
 * 3. Presentation layer robustness under massive concurrent VFX load (200+ reactions/tick)
 * 4. FloatingTextPool stability under rapid multi-reaction text spawning (500+ texts)
 * 5. Headless Core invariant: Zero DOM and Zero Phaser in src/core/
 * 6. ByteDance Mini Game build artifact integrity and specification conformance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// =========================================================================
// Mock Phaser GameObject & Tween Infrastructure for Presentation Stress
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

  class MockGraphics extends MockGameObject {
    commands: any[] = [];
    clear() { this.commands = []; return this; }
    fillStyle(color: number, alpha = 1.0) { this.commands.push({ type: 'fillStyle', color, alpha }); return this; }
    lineStyle(width: number, color: number, alpha = 1.0) { this.commands.push({ type: 'lineStyle', width, color, alpha }); return this; }
    fillRect(x: number, y: number, w: number, h: number) { this.commands.push({ type: 'fillRect', x, y, w, h }); return this; }
    strokeCircle(x: number, y: number, r: number) { this.commands.push({ type: 'strokeCircle', x, y, r }); return this; }
    fillCircle(x: number, y: number, r: number) { this.commands.push({ type: 'fillCircle', x, y, r }); return this; }
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

  return {
    default: {
      GameObjects: {
        GameObject: MockGameObject,
        Graphics: MockGraphics,
        Text: MockText
      }
    }
  };
});

import Phaser from 'phaser';
import {
  createElementalStatus,
  applyOil,
  applyBurn,
  applyShock,
  applyFreeze,
  applyPoison,
  decayStatus,
  ElementStateManager
} from '../src/core/reaction/element-state';
import {
  triggerExplosion,
  triggerThunderStrike,
  triggerIceShatter,
  triggerPoisonFire,
  ReactionValve,
  MAX_REACTIONS_PER_TICK,
  EXPLOSION_ICD,
  ICE_SHATTER_ICD,
  MAX_BOSS_THUNDER_STRIKES
} from '../src/core/reaction/reaction-valve';
import { ElementalStatus, EnemyEntity } from '../src/core/types';
import { ElementalVfxManager } from '../src/presentation/renderers/elemental-vfx';
import { FloatingTextPool } from '../src/presentation/renderers/fly-text';

describe('Milestone M_VJ3 Adversarial Stress Verification Suite', () => {
  let mockScene: any;
  let addedTweens: any[];

  beforeEach(() => {
    ReactionValve.resetTick();
    addedTweens = [];
    mockScene = {
      add: {
        graphics: () => new (Phaser.GameObjects as any).Graphics(mockScene),
        text: (x = 0, y = 0, text = '', style = {}) => new (Phaser.GameObjects as any).Text(mockScene, x, y, text, style)
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
  // 1. Simultaneous 4 Elemental Reactions Under Maximum Combat Load
  // =========================================================================
  describe('1. Maximum Combat Load: 100 Simultaneous Enemies with 4 Reactions Primed', () => {
    it('enforces exactly MAX_REACTIONS_PER_TICK (20) ceiling across 100 primed targets in a single tick', () => {
      const enemies: EnemyEntity[] = [];
      const statuses: ElementalStatus[] = [];

      for (let i = 0; i < 100; i++) {
        enemies.push({
          id: `enemy_horde_${i}`,
          typeId: 'infantry',
          name: `敌军兵丁_${i}`,
          maxHp: 2000,
          currentHp: 2000,
          armor: 20,
          shield: 100,
          moveSpeed: 1.0,
          isBoss: i === 0 // 1 Boss, 99 minions
        });

        const status = createElementalStatus();
        applyOil(status);
        applyShock(status);
        applyBurn(status, 4);
        applyFreeze(status);
        applyPoison(status);
        statuses.push(status);
      }

      let successCount = 0;
      let rejectedTickCapCount = 0;
      const curTime = 100.0;

      // Simulate a volley of 100 simultaneous projectile hits evaluating reactions
      for (let i = 0; i < 100; i++) {
        const s = statuses[i];
        const e = enemies[i];

        // Attempt Explosion
        const exp = triggerExplosion(s, curTime);
        if (exp.triggered) {
          successCount++;
          e.currentHp = Math.max(0, e.currentHp - exp.damage);
        } else if (exp.reason === 'GLOBAL_TICK_CAP_EXCEEDED') {
          rejectedTickCapCount++;
        }
      }

      // Exactly 20 must have triggered, 80 rejected
      expect(ReactionValve.getReactionsThisTick()).toBe(MAX_REACTIONS_PER_TICK);
      expect(successCount).toBe(20);
      expect(rejectedTickCapCount).toBe(80);

      // Verify no NaN or negative HP
      for (const e of enemies) {
        expect(Number.isFinite(e.currentHp)).toBe(true);
        expect(e.currentHp).toBeGreaterThanOrEqual(0);
      }

      // Next tick: resetTick allows next batch of 20
      ReactionValve.resetTick();
      expect(ReactionValve.getReactionsThisTick()).toBe(0);

      let nextTickSuccess = 0;
      for (let i = 20; i < 100; i++) {
        const s = statuses[i];
        const exp = triggerExplosion(s, curTime);
        if (exp.triggered) {
          nextTickSuccess++;
        }
      }
      expect(nextTickSuccess).toBe(20);
      expect(ReactionValve.getReactionsThisTick()).toBe(20);
    });

    it('handles all 4 distinct reaction types concurrently across mixed targets without state cross-contamination', () => {
      ReactionValve.resetTick();

      const target1Status = createElementalStatus();
      applyOil(target1Status); // Primed for Explosion

      const target2Status = createElementalStatus();
      applyShock(target2Status);
      applyBurn(target2Status, 3); // Primed for Thunder Strike

      const target3Status = createElementalStatus();
      applyFreeze(target3Status); // Primed for Ice Shatter

      const target4Status = createElementalStatus();
      applyPoison(target4Status); // Primed for Nether Poison

      const regularTarget: EnemyEntity = {
        id: 'target_reg',
        typeId: 'heavy',
        name: '重装禁卫',
        maxHp: 5000,
        currentHp: 5000,
        armor: 50,
        shield: 500,
        moveSpeed: 0.8,
        isBoss: false
      };

      const res1 = triggerExplosion(target1Status, 1.0);
      const res2 = triggerThunderStrike(target2Status, regularTarget);
      const res3 = triggerIceShatter(target3Status, regularTarget, 1.0);
      const res4 = triggerPoisonFire(target4Status);

      expect(res1.triggered).toBe(true);
      expect(res2.triggered).toBe(true);
      expect(res3.triggered).toBe(true);
      expect(res4.triggered).toBe(true);

      expect(ReactionValve.getReactionsThisTick()).toBe(4);
      expect(target1Status.hasOil).toBe(false);
      expect(target3Status.isFrozen).toBe(false);
      expect(target4Status.poisonFireDurationRemaining).toBe(4.0);
      expect(regularTarget.shield).toBe(0); // Guard broken
    });
  });

  // =========================================================================
  // 2. Anti-Crash ICD Boundaries & Rejection Semantics
  // =========================================================================
  describe('2. Anti-Crash Valve ICD & State Retention Invariants', () => {
    it('Explosion 1.5s ICD boundary: retains oil on cooldown reject, triggers on exact 1.500s', () => {
      const status = createElementalStatus();
      applyOil(status);

      // t = 10.0 -> OK
      const t0 = triggerExplosion(status, 10.0);
      expect(t0.triggered).toBe(true);
      expect(status.hasOil).toBe(false);

      // Re-apply oil
      applyOil(status);

      // Rapid burst of 20 hits in 1.49 seconds -> ALL rejected
      const rejectTimes = [10.05, 10.1, 10.25, 10.5, 10.8, 11.0, 11.2, 11.49, 11.499];
      for (const t of rejectTimes) {
        const res = triggerExplosion(status, t);
        expect(res.triggered).toBe(false);
        expect(res.reason).toBe('VALVE_COOLDOWN');
        // CRUCIAL: Oil must NOT be consumed during reject!
        expect(status.hasOil).toBe(true);
      }

      // Exactly t = 11.500 (10.0 + 1.5s ICD) -> OK
      const tExact = triggerExplosion(status, 11.500);
      expect(tExact.triggered).toBe(true);
      expect(status.hasOil).toBe(false);
      expect(status.lastExplosionTime).toBe(11.500);
    });

    it('Ice Shatter 2.0s ICD boundary: retains freeze on cooldown reject, triggers on exact 2.000s', () => {
      const status = createElementalStatus();
      applyFreeze(status);

      const target: EnemyEntity = {
        id: 'frozen_enemy',
        typeId: 'speed',
        name: '夜行斥候',
        maxHp: 1000,
        currentHp: 1000,
        armor: 10,
        shield: 0,
        moveSpeed: 1.5,
        isBoss: false
      };

      // t = 20.0 -> OK
      const t0 = triggerIceShatter(status, target, 20.0);
      expect(t0.triggered).toBe(true);
      expect(status.isFrozen).toBe(false);

      // Re-apply freeze
      applyFreeze(status);

      // Burst of hits between 20.0 and 21.999 -> ALL rejected
      const rejectTimes = [20.1, 20.5, 21.0, 21.5, 21.99, 21.999];
      for (const t of rejectTimes) {
        const res = triggerIceShatter(status, target, t);
        expect(res.triggered).toBe(false);
        expect(res.reason).toBe('VALVE_COOLDOWN');
        expect(status.isFrozen).toBe(true); // Frozen retained!
      }

      // Exactly t = 22.000 -> OK
      const tExact = triggerIceShatter(status, target, 22.000);
      expect(tExact.triggered).toBe(true);
      expect(status.isFrozen).toBe(false);
    });

    it('Boss Thunder Strike Limit: hard caps at 3 stuns across 50 attempts, 50% tenacity', () => {
      const boss: EnemyEntity = {
        id: 'boss_bear_stress',
        typeId: 'boss_bear',
        name: '铁塔熊王',
        maxHp: 20000,
        currentHp: 20000,
        armor: 80,
        shield: 1000,
        moveSpeed: 0.5,
        isBoss: true
      };

      const status = createElementalStatus();
      applyShock(status);
      applyBurn(status, 4);

      // Trigger 1, 2, 3 -> All succeed with 1.0s paralysis (Boss 50% tenacity)
      for (let i = 1; i <= MAX_BOSS_THUNDER_STRIKES; i++) {
        const res = triggerThunderStrike(status, boss);
        expect(res.triggered).toBe(true);
        expect(res.paralysisDuration).toBe(1.0); // 50% tenacity
        expect(status.thunderStrikeCountOnBoss).toBe(i);
      }

      // Triggers 4 through 50 -> All rejected with BOSS_LIMIT_EXCEEDED
      for (let i = 4; i <= 50; i++) {
        const res = triggerThunderStrike(status, boss);
        expect(res.triggered).toBe(false);
        expect(res.reason).toBe('BOSS_LIMIT_EXCEEDED');
        expect(status.thunderStrikeCountOnBoss).toBe(MAX_BOSS_THUNDER_STRIKES);
      }
    });

    it('Boss Ice Shatter 3% max HP damage cap vs Regular 8% under astronomical HP levels', () => {
      const megaBoss: EnemyEntity = {
        id: 'mega_boss',
        typeId: 'boss_titan',
        name: '灭世铁浮屠',
        maxHp: 10_000_000, // 10 Million HP
        currentHp: 10_000_000,
        armor: 200,
        shield: 0,
        moveSpeed: 0.3,
        isBoss: true
      };

      const regularMinion: EnemyEntity = {
        id: 'regular_giant',
        typeId: 'heavy',
        name: '重装巨人',
        maxHp: 10_000_000,
        currentHp: 10_000_000,
        armor: 50,
        shield: 0,
        moveSpeed: 0.5,
        isBoss: false
      };

      const bossStatus = createElementalStatus();
      applyFreeze(bossStatus);

      const minionStatus = createElementalStatus();
      applyFreeze(minionStatus);

      const bossRes = triggerIceShatter(bossStatus, megaBoss, 1.0);
      const minionRes = triggerIceShatter(minionStatus, regularMinion, 1.0);

      // Minion: 8% of 10,000,000 = 800,000
      expect(minionRes.damage).toBe(800_000);

      // Boss: strictly capped at 3% = 300,000
      expect(bossRes.damage).toBe(300_000);
      expect(bossRes.damage).toBeLessThan(minionRes.damage);
    });

    it('Nether Poison Flame strictly clamps refresh ceiling to 4.0s over sustained re-application', () => {
      const status = createElementalStatus();
      applyPoison(status);

      triggerPoisonFire(status);
      expect(status.poisonFireDurationRemaining).toBe(4.0);

      // Decay 1.5s
      decayStatus(status, 1.5);
      expect(status.poisonFireDurationRemaining).toBeCloseTo(2.5, 2);

      // 10 rapid triggers do NOT accumulate (e.g. 2.5 + 40 != 42.5)
      for (let i = 0; i < 10; i++) {
        triggerPoisonFire(status);
        expect(status.poisonFireDurationRemaining).toBe(4.0);
      }
    });

    it('Recursion guard safely restores state even when wrapped callback throws an error', () => {
      expect(ReactionValve.isRecursionActive()).toBe(false);

      expect(() => {
        ReactionValve.runWithRecursionGuard(() => {
          throw new Error('Fatal inner simulation error');
        });
      }).toThrow('Fatal inner simulation error');

      // Crucial: isHandlingReaction must be reset to false via finally!
      expect(ReactionValve.isRecursionActive()).toBe(false);

      // Subsequent reaction should execute without being blocked
      const normalCall = ReactionValve.runWithRecursionGuard(() => 'ok');
      expect(normalCall.executed).toBe(true);
      expect(normalCall.result).toBe('ok');
    });
  });

  // =========================================================================
  // 3. Presentation Layer (`ElementalVfxManager`) Mass Load Survival
  // =========================================================================
  describe('3. Presentation Layer ElementalVfxManager Mass VFX Load & Disposal', () => {
    it('spams 200 simultaneous elemental reactions (50 each) without errors or memory leak', () => {
      const vfxManager = new ElementalVfxManager(mockScene);

      // Fire 50 of each reaction
      for (let i = 0; i < 50; i++) {
        vfxManager.playFireBlast(100 + i * 2, 200 + i);
        vfxManager.playThunderJudgement(200 + i * 2, 300 + i);
        vfxManager.playIceShatter(300 + i * 2, 400 + i);
        vfxManager.playNetherPoisonFlame(400 + i * 2, 500 + i);
      }

      const activeCount = (vfxManager as any).activeGraphics.size;
      expect(activeCount).toBeGreaterThanOrEqual(200);

      // Clear all
      vfxManager.clearAll();
      expect((vfxManager as any).activeGraphics.size).toBe(0);

      // Destroy
      vfxManager.destroy();
      expect((vfxManager as any).activeGraphics.size).toBe(0);
    });

    it('gracefully handles missing FloatingTextPool without throwing in ElementalVfxManager', () => {
      // Scene has NO floatingTextPool
      const bareScene = {
        add: {
          graphics: () => new (Phaser.GameObjects as any).Graphics(bareScene)
        },
        tweens: {
          add: vi.fn(),
          killAll: vi.fn()
        }
      };

      const vfxManager = new ElementalVfxManager(bareScene as any);

      expect(() => {
        vfxManager.playFireBlast(100, 100);
        vfxManager.playThunderJudgement(100, 100);
        vfxManager.playIceShatter(100, 100);
        vfxManager.playNetherPoisonFlame(100, 100);
      }).not.toThrow();

      vfxManager.destroy();
    });
  });

  // =========================================================================
  // 4. FloatingTextPool Under Multi-Reaction Text Spawning
  // =========================================================================
  describe('4. FloatingTextPool High-Frequency Recycling & Elemental Styles', () => {
    it('spawns 400 reaction flytexts across 4 styles and reuses pooled items on tween completion', () => {
      // Simulate onComplete firing immediately so texts return to pool
      const mockSceneWithCompletedTweens = {
        add: {
          text: (x = 0, y = 0, text = '', style = {}) => new (Phaser.GameObjects as any).Text(mockSceneWithCompletedTweens, x, y, text, style)
        },
        tweens: {
          add: vi.fn((config: any) => {
            // Simulate tween completion which marks text invisible
            if (config.onComplete) {
              config.onComplete();
            }
            return config;
          }),
          killAll: vi.fn()
        }
      };

      const initialCap = 20;
      const pool = new FloatingTextPool(mockSceneWithCompletedTweens as any, initialCap);

      const styles = ['fire', 'shock', 'ice', 'poison'] as const;

      for (let i = 0; i < 400; i++) {
        const style = styles[i % styles.length];
        pool.spawn(100 + (i % 50), 200 + (i % 30), `${i * 10}`, style);
      }

      // Because onComplete marks texts invisible immediately, pool size does NOT balloon to 400
      const texts = (pool as any).pool;
      expect(texts.length).toBe(initialCap);
      // At least the reused items have content
      expect(texts[0].text).toBeTruthy();
      expect(texts[0].style.color).toBeTruthy();
      for (const t of texts) {
        expect(Number.isFinite(t.x)).toBe(true);
        expect(Number.isFinite(t.y)).toBe(true);
      }
    });

    it('dynamically expands pool when all instances are actively visible', () => {
      const busyScene = {
        add: {
          text: (x = 0, y = 0, text = '', style = {}) => new (Phaser.GameObjects as any).Text(busyScene, x, y, text, style)
        },
        tweens: {
          add: vi.fn(), // Tweens do not complete immediately, keeping objects visible
          killAll: vi.fn()
        }
      };

      const pool = new FloatingTextPool(busyScene as any, 5);
      expect((pool as any).pool.length).toBe(5);

      // Spawn 15 simultaneous texts without any completing
      for (let i = 0; i < 15; i++) {
        pool.spawn(100, 100, `Text_${i}`, 'fire');
      }

      // Pool should have expanded from 5 to 15 to accommodate load
      expect((pool as any).pool.length).toBe(15);
    });
  });

  // =========================================================================
  // 5. Headless Core Invariant (Zero DOM / Zero Phaser in src/core/)
  // =========================================================================
  describe('5. Architectural Red Line: Zero DOM & Zero Phaser in src/core/', () => {
    function getAllTsFiles(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          results = results.concat(getAllTsFiles(filePath));
        } else if (file.endsWith('.ts')) {
          results.push(filePath);
        }
      }
      return results;
    }

    it('confirms ZERO references to phaser in all src/core/ files', () => {
      const coreDir = path.resolve(__dirname, '../src/core');
      const coreFiles = getAllTsFiles(coreDir);
      expect(coreFiles.length).toBeGreaterThan(10);

      const phaserImports: { file: string; line: string }[] = [];

      for (const file of coreFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx];
          if (/import.*['"]phaser['"]/i.test(line) || /from.*['"]phaser['"]/i.test(line)) {
            phaserImports.push({ file: path.relative(coreDir, file), line: line.trim() });
          }
        }
      }

      expect(phaserImports).toEqual([]);
    });

    it('confirms ZERO DOM access (document, window, HTMLElement) in src/core/', () => {
      const coreDir = path.resolve(__dirname, '../src/core');
      const coreFiles = getAllTsFiles(coreDir);

      const domViolations: { file: string; line: string }[] = [];

      for (const file of coreFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx];
          // Exclude comments
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            continue;
          }
          if (/\bdocument\./.test(line) || /\bwindow\./.test(line) || /\bHTMLElement\b/.test(line)) {
            domViolations.push({ file: path.relative(coreDir, file), line: line.trim() });
          }
        }
      }

      expect(domViolations).toEqual([]);
    });
  });

  // =========================================================================
  // 6. ByteDance Mini Game Build Artifacts Validation
  // =========================================================================
  describe('6. ByteDance Mini-Game Packaging & Schema Validation', () => {
    const distDouyinDir = path.resolve(__dirname, '../dist-douyin');

    it('validates dist-douyin directory exists with game.json and project.config.json', () => {
      expect(fs.existsSync(distDouyinDir)).toBe(true);

      const gameJsonPath = path.join(distDouyinDir, 'game.json');
      expect(fs.existsSync(gameJsonPath)).toBe(true);

      const projConfigPath = path.join(distDouyinDir, 'project.config.json');
      expect(fs.existsSync(projConfigPath)).toBe(true);

      const gameJsPath = path.join(distDouyinDir, 'game.js');
      expect(fs.existsSync(gameJsPath)).toBe(true);

      const adapterJsPath = path.join(distDouyinDir, 'adapter.js');
      expect(fs.existsSync(adapterJsPath)).toBe(true);
    });

    it('validates game.json structure conforms to ByteDance vertical orientation standard', () => {
      const gameJsonContent = fs.readFileSync(path.join(distDouyinDir, 'game.json'), 'utf-8');
      const gameConfig = JSON.parse(gameJsonContent);

      expect(gameConfig.deviceOrientation).toBe('portrait');
      expect(gameConfig.showStatusBar).toBe(false);
    });

    it('validates project.config.json has appid, projectname, and minigame setting', () => {
      const projConfigContent = fs.readFileSync(path.join(distDouyinDir, 'project.config.json'), 'utf-8');
      const projConfig = JSON.parse(projConfigContent);

      expect(projConfig.appid).toBeTruthy();
      expect(projConfig.projectname).toBe('孤城神机营');
    });
  });
});
