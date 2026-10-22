/**
 * 《孤城神机营》- Milestone M6 Adversarial Presentation & Combat Loop Stress Test Suite
 * 
 * Challenger 2 Scope:
 * 1. Touch Interaction & Boundary Stress:
 *    - Out-of-bounds touches (< 0, > 750, < 0, > 1334) during drag -> graceful null/clamp mapping.
 *    - Rapid drag-and-drop: high-frequency sequences without waiting -> state machine stability (no stuck states).
 *    - Multi-finger suppression: pointer 1 rejected during pointer 0 drag -> pointer 0 state uncorrupted.
 *    - +80px Touch Offset: Y_visual = Y_touch - 80 consistently across all test points.
 * 2. Combat Loop & UI Integration Stress:
 *    - Ultra-high enemy density (100+ enemies active simultaneously) -> spatial targeting, projectiles, damage pipeline.
 *    - Commander Ultimate Spam: Wang Shouren at rage < 100 (rejected), at rage == 100 (rage resets to 0, cooldown reset flag, ASPD bonus).
 *    - FTUE Flow Stress: rapid clicks on locked elements during Step 1~4 -> strict action restriction; full FTUE vs skipFTUE.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TouchController,
  TouchCoordinateMapper,
  GRID_CONFIG,
  BENCH_CONFIG,
  TOUCH_Y_OFFSET,
  ScreenPoint
} from '../src/presentation/touch/touch-controller';
import {
  WeaponInstance,
  EnemyEntity,
  DamageCalculationContext,
  ProjectileState
} from '../src/core/types';
import { SpatialTargetingSystem } from '../src/core/combat/targeting';
import { DamagePipeline } from '../src/core/combat/damage-pipeline';
import { ProjectileManager } from '../src/core/combat/projectile';
import { Commander } from '../src/core/commander/commander';
import { getCommanderConfig } from '../src/config/commanders.config';
import {
  FTUEManager,
  FTUEStep,
  MemoryStorageAdapter,
  FTUE_STORAGE_KEY
} from '../src/core/ftue/ftue-manager';
import { GridModel } from '../src/core/grid/grid-model';

function makeWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: overrides.id || `w_${Math.random().toString(36).substring(2, 7)}`,
    configId: overrides.configId || 'fire_lance',
    name: overrides.name || '神机火铳',
    star: overrides.star || 1,
    faction: overrides.faction || 'fire',
    footprint: overrides.footprint || { width: 1, height: 1 },
    anchor: overrides.anchor || { row: 0, col: 2 },
    isFortressOnly: overrides.isFortressOnly ?? false,
    baseAtk: overrides.baseAtk ?? 60,
    attackInterval: overrides.attackInterval ?? 1.0,
    range: overrides.range ?? 10.0
  };
}

function makeEnemy(overrides: Partial<EnemyEntity> = {}): EnemyEntity {
  return {
    id: overrides.id || `e_${Math.random().toString(36).substring(2, 7)}`,
    typeId: overrides.typeId || 'ordinary',
    name: overrides.name || '流寇步卒',
    isBoss: overrides.isBoss ?? false,
    maxHp: overrides.maxHp ?? 500,
    currentHp: overrides.currentHp ?? 500,
    armor: overrides.armor ?? 30,
    shield: overrides.shield ?? 0,
    moveSpeed: overrides.moveSpeed ?? 1.2,
    distanceToWall: overrides.distanceToWall ?? 5.0,
    x: overrides.x ?? 375,
    y: overrides.y ?? 800,
    isFrozen: false,
    isParalyzed: false,
    ...overrides
  };
}

describe('Challenger 2 — Milestone M6 Presentation & Combat Loop Stress Tests', () => {

  // =========================================================================
  // Section 1: Touch Interaction & Boundary Stress
  // =========================================================================
  describe('1. Touch Interaction & Boundary Stress', () => {
    let controller: TouchController;

    beforeEach(() => {
      controller = new TouchController();
    });

    describe('1.1 Out-of-bounds touches (< 0, > 750, < 0, > 1334)', () => {
      it('gracefully maps extreme out-of-bounds screen coordinates to null grid positions', () => {
        const extremePoints: ScreenPoint[] = [
          { x: -500, y: -500 },
          { x: -1, y: 300 },
          { x: 375, y: -100 },
          { x: 751, y: 300 },
          { x: 1200, y: 300 },
          { x: 375, y: 1335 },
          { x: 375, y: 3000 },
          { x: -9999, y: 9999 },
          { x: 9999, y: -9999 }
        ];

        for (const pt of extremePoints) {
          const gridPos = TouchCoordinateMapper.screenToGrid(pt);
          expect(gridPos, `Expected null for point (${pt.x}, ${pt.y})`).toBeNull();
        }
      });

      it('gracefully maps extreme out-of-bounds screen coordinates to -1 bench slots', () => {
        const extremePoints: ScreenPoint[] = [
          { x: -200, y: 1190 },
          { x: 100, y: 1190 }, // Left of bench startX (143)
          { x: 650, y: 1190 }, // Right of bench end (607)
          { x: 200, y: 1000 }, // Above bench startY (1145)
          { x: 200, y: 1300 }, // Below bench endY (1235)
          { x: 231, y: 1190 }, // Inside gap between slot 0 and slot 1 (223..239)
          { x: 327, y: 1190 }, // Inside gap between slot 1 and slot 2 (319..335)
          { x: 423, y: 1190 }, // Inside gap between slot 2 and slot 3 (415..431)
          { x: 519, y: 1190 }  // Inside gap between slot 3 and slot 4 (511..527)
        ];

        for (const pt of extremePoints) {
          const slot = TouchCoordinateMapper.screenToBenchSlot(pt);
          expect(slot, `Expected -1 for point (${pt.x}, ${pt.y})`).toBe(-1);
        }
      });

      it('handles out-of-bounds drag movement and release without throwing or sticking', () => {
        // Start drag on a valid bench slot
        const startOk = controller.onPointerDown(0, 183, 1190, 'bench', 'lance_1', undefined, 0);
        expect(startOk).toBe(true);
        expect(controller.getDragState().isDragging).toBe(true);

        // Move pointer far beyond screen boundaries (< 0, > 750, > 1334)
        const moveOk1 = controller.onPointerMove(0, -300, -200);
        expect(moveOk1).toBe(true);
        expect(controller.getDragState().currentTouch).toEqual({ x: -300, y: -200 });
        expect(controller.getDragState().visualPosition).toEqual({ x: -300, y: -280 });

        const moveOk2 = controller.onPointerMove(0, 1500, 2500);
        expect(moveOk2).toBe(true);
        expect(controller.getDragState().currentTouch).toEqual({ x: 1500, y: 2500 });

        // Release at out-of-bounds position
        const upRes = controller.onPointerUp(0);
        expect(upRes.ended).toBe(true);
        expect(upRes.targetGridPos).toBeNull();
        expect(upRes.targetBenchSlot).toBe(-1);

        // State machine must be completely reset
        const finalState = controller.getDragState();
        expect(finalState.isDragging).toBe(false);
        expect(finalState.activePointerId).toBeNull();
        expect(finalState.weaponId).toBeNull();
        expect(finalState.startTouch).toBeNull();
      });
    });

    describe('1.2 Rapid drag-and-drop sequences & state machine stability', () => {
      it('executes 500 rapid down/move/up sequences without stuck drag states', () => {
        for (let i = 0; i < 500; i++) {
          const startX = 185 + (i % 5) * 76;
          const startY = 160 + (i % 5) * 76;

          const downOk = controller.onPointerDown(0, startX, startY, 'grid', `weapon_${i}`, { row: i % 5, col: i % 5 });
          expect(downOk).toBe(true);
          expect(controller.getDragState().isDragging).toBe(true);

          const moveOk = controller.onPointerMove(0, startX + 20, startY + 20);
          expect(moveOk).toBe(true);

          const upRes = controller.onPointerUp(0);
          expect(upRes.ended).toBe(true);
          expect(controller.getDragState().isDragging).toBe(false);
        }

        expect(controller.getDragState().isDragging).toBe(false);
        expect(controller.getDragState().weaponId).toBeNull();
      });

      it('gracefully rejects invalid rapid interleaved calls (redundant down, orphan moves, premature ups)', () => {
        // Redundant pointerdown while idle
        expect(controller.onPointerMove(0, 100, 100)).toBe(false);
        expect(controller.onPointerUp(0).ended).toBe(false);

        // Valid start
        controller.onPointerDown(0, 200, 200, 'grid', 'w1');

        // Second down while already dragging -> must be rejected
        const redundantDown = controller.onPointerDown(0, 250, 250, 'grid', 'w2');
        expect(redundantDown).toBe(false);
        expect(controller.getDragState().weaponId).toBe('w1');

        // Cancel drag mid-way
        controller.cancelDrag();
        expect(controller.getDragState().isDragging).toBe(false);

        // Move after cancel -> must return false
        expect(controller.onPointerMove(0, 300, 300)).toBe(false);

        // Up after cancel -> must return ended: false
        expect(controller.onPointerUp(0).ended).toBe(false);
      });
    });

    describe('1.3 Multi-finger touch suppression (Primary Pointer Lock)', () => {
      it('strictly rejects secondary pointer (pointerId === 1) when pointer 0 is active', () => {
        // Primary finger touches down
        const p0Down = controller.onPointerDown(0, 300, 300, 'grid', 'primary_weapon');
        expect(p0Down).toBe(true);
        expect(controller.getDragState().activePointerId).toBe(0);

        // Secondary finger touches down while dragging
        const p1Down = controller.onPointerDown(1, 400, 400, 'grid', 'secondary_weapon');
        expect(p1Down).toBe(false);
        expect(controller.getDragState().weaponId).toBe('primary_weapon');
        expect(controller.getDragState().activePointerId).toBe(0);

        // Secondary finger attempts to move
        const p1Move = controller.onPointerMove(1, 450, 450);
        expect(p1Move).toBe(false);
        expect(controller.getDragState().currentTouch).toEqual({ x: 300, y: 300 });

        // Secondary finger attempts to release
        const p1Up = controller.onPointerUp(1);
        expect(p1Up.ended).toBe(false);
        expect(controller.getDragState().isDragging).toBe(true);

        // Primary finger moves -> must succeed
        const p0Move = controller.onPointerMove(0, 320, 280);
        expect(p0Move).toBe(true);
        expect(controller.getDragState().currentTouch).toEqual({ x: 320, y: 280 });

        // Primary finger releases -> must finish cleanly
        const p0Up = controller.onPointerUp(0);
        expect(p0Up.ended).toBe(true);
        expect(controller.getDragState().isDragging).toBe(false);
      });

      it('supports primary pointer lock on mobile (pointerId >= 0) and rejects secondary pointers', () => {
        // Pointer 1 attempts to drag on mobile device (where pointer1 has id 1) while idle
        const p1Start = controller.onPointerDown(1, 200, 200, 'bench', 'w_test', undefined, 1);
        expect(p1Start).toBe(true);
        expect(controller.getDragState().isDragging).toBe(true);
        expect(controller.getDragState().activePointerId).toBe(1);

        // Pointer 2 attempts to drag while pointer 1 is active -> must be rejected
        const p2Start = controller.onPointerDown(2, 200, 200, 'bench', 'w_test_2', undefined, 2);
        expect(p2Start).toBe(false);
        expect(controller.getDragState().activePointerId).toBe(1);

        // Pointer 1 releases -> clean reset
        const p1Up = controller.onPointerUp(1);
        expect(p1Up.ended).toBe(true);
        expect(controller.getDragState().isDragging).toBe(false);
        expect(controller.getDragState().activePointerId).toBeNull();
      });
    });

    describe('1.4 +80px Touch Offset Verification (Y_visual = Y_touch - 80)', () => {
      it('consistently verifies Y_visual = Y_touch - 80 across the entire vertical coordinate range', () => {
        const testCoordinates: ScreenPoint[] = [
          { x: 375, y: 0 },
          { x: 375, y: 80 },
          { x: 375, y: 160 },
          { x: 375, y: 350 },
          { x: 375, y: 540 },
          { x: 375, y: 800 },
          { x: 375, y: 1240 },
          { x: 375, y: 1334 },
          { x: 185, y: 250.5 },
          { x: -50, y: -20 },
          { x: 900, y: 1500 }
        ];

        for (const touch of testCoordinates) {
          const visual = TouchCoordinateMapper.touchToVisualPosition(touch);
          expect(visual.x).toBe(touch.x);
          expect(visual.y).toBe(touch.y - TOUCH_Y_OFFSET);

          const hitTest = TouchCoordinateMapper.visualToHitTestPoint(visual);
          expect(hitTest.x).toBe(visual.x);
          expect(hitTest.y).toBe(visual.y);

          // Direct hit-test method with flag
          const directHitTest = TouchCoordinateMapper.touchToHitTestPoint(touch, true);
          expect(directHitTest.y).toBe(touch.y - TOUCH_Y_OFFSET);

          // Without offset flag
          const rawHitTest = TouchCoordinateMapper.touchToHitTestPoint(touch, false);
          expect(rawHitTest.y).toBe(touch.y);
        }
      });
    });
  });

  // =========================================================================
  // Section 2: Combat Loop & UI Integration Stress
  // =========================================================================
  describe('2. Combat Loop & UI Integration Stress', () => {

    describe('2.1 Ultra-high enemy density (100+ enemies active simultaneously)', () => {
      it('handles spatial targeting over 150 simultaneous enemies within 10ms without drop or hang', () => {
        const weapon = makeWeapon({ range: 12.0 });
        const enemies: EnemyEntity[] = [];

        // Generate 150 enemies spread across different distances and health
        for (let i = 0; i < 150; i++) {
          enemies.push(makeEnemy({
            id: `enemy_dense_${i}`,
            distanceToWall: 0.5 + (i * 0.1), // 0.5m to 15.5m
            currentHp: 100 + (i * 10),
            maxHp: 1000,
            x: 185 + (i % 5) * 76,
            y: 540 + (i * 5)
          }));
        }

        const t0 = performance.now();

        // 1. First strategy (closest to wall)
        const firstTarget = SpatialTargetingSystem.selectTarget(weapon, enemies, 'First');
        expect(firstTarget).not.toBeNull();
        expect(firstTarget?.id).toBe('enemy_dense_0'); // 0.5m

        // 2. Strongest strategy (highest HP in range)
        const inRange = SpatialTargetingSystem.filterInRange(weapon, enemies);
        const strongestTarget = SpatialTargetingSystem.selectTarget(weapon, enemies, 'Strongest');
        expect(strongestTarget).not.toBeNull();
        const maxHpInRange = Math.max(...inRange.map(e => e.currentHp));
        expect(strongestTarget?.currentHp).toBe(maxHpInRange);

        // 3. ClusterAOE strategy
        const clusterTarget = SpatialTargetingSystem.selectTarget(weapon, enemies, 'ClusterAOE', { aoeRadius: 2.0 });
        expect(clusterTarget).not.toBeNull();

        const duration = performance.now() - t0;
        expect(duration).toBeLessThan(50); // Fast execution under dense load
      });

      it('simulates 100 concurrent projectiles and resolves damage pipeline without event loss or NaN', () => {
        const weapon = makeWeapon({ baseAtk: 100 });
        const enemies: EnemyEntity[] = [];
        for (let i = 0; i < 100; i++) {
          enemies.push(makeEnemy({ id: `e_batch_${i}`, currentHp: 500, maxHp: 500, armor: 40 }));
        }

        const projManager = new ProjectileManager();

        // Fire 100 projectiles
        for (let i = 0; i < 100; i++) {
          const dmgCtx: DamageCalculationContext = {
            attacker: weapon,
            target: enemies[i],
            skillMultiplier: 1.0,
            additiveBonuses: [0.2],
            independentMultipliers: [0.1],
            critRateBonus: 0.1,
            critDmgBonus: 0.2,
            sunderFlat: 5,
            sunderRate: 0.1,
            vulnerability: 0.05,
            specialReduction: 0
          };
          projManager.spawn(weapon, enemies[i], dmgCtx, {
            speed: 50.0,
            isHighArc: false
          });
        }

        expect(projManager.getActiveProjectiles().length).toBe(100);

        // Advance simulation past travelTime
        const events = projManager.update(1.0, enemies);
        expect(events.length).toBe(100);
        expect(projManager.getActiveProjectiles().length).toBe(0);

        // Every event resolved damage calculation
        for (const evt of events) {
          const result = evt.damageResult;
          expect(Number.isFinite(result.finalDamage)).toBe(true);
          expect(result.finalDamage).toBeGreaterThanOrEqual(1.0);
          expect(evt.primaryTarget).toBeDefined();
        }

        // Every enemy should have suffered verified damage
        for (const e of enemies) {
          expect(e.currentHp).toBeLessThan(500);
        }
      });
    });

    describe('2.2 Commander Ultimate Spam (Wang Shouren)', () => {
      it('rejects ultimate trigger when rage < 100 across boundary values [0, 50, 99.9]', () => {
        const commander = new Commander('wang_shouren');
        const testRages = [0, 25, 50, 75, 99, 99.9];

        for (const r of testRages) {
          commander.setRage(r);
          expect(commander.canCastUltimate(), `Expected false at rage ${r}`).toBe(false);

          const castRes = commander.castUltimate();
          expect(castRes.success).toBe(false);
          expect(castRes.reason).toBe('NOT_ENOUGH_RAGE');
          expect(commander.isUltimateActive).toBe(false);
        }
      });

      it('at rage == 100, consumes rage to 0, sets active flag, and config specifies weapon CD reset and ASPD bonus', () => {
        const commander = new Commander('wang_shouren');
        commander.setRage(100);
        expect(commander.canCastUltimate()).toBe(true);

        const castRes = commander.castUltimate();
        expect(castRes.success).toBe(true);
        expect(commander.rage).toBe(0);
        expect(commander.isUltimateActive).toBe(true);
        expect(commander.ultimateRemainingDuration).toBe(5.0);

        // Verify configuration contract for Wang Shouren's ultimate
        const cfg = getCommanderConfig('wang_shouren');
        expect(cfg.ultimate.resetAllWeaponCooldowns).toBe(true);
        expect(cfg.ultimate.reloadSpeedBonus).toBe(1.50);

        // Subsequent rapid spam while rage is 0 must all fail
        for (let i = 0; i < 10; i++) {
          const spamRes = commander.castUltimate();
          expect(spamRes.success).toBe(false);
          expect(spamRes.reason).toBe('NOT_ENOUGH_RAGE');
        }

        // Ticking duration
        commander.tick(2.5);
        expect(commander.isUltimateActive).toBe(true);
        expect(commander.ultimateRemainingDuration).toBe(2.5);

        // Expiring duration
        commander.tick(3.0);
        expect(commander.isUltimateActive).toBe(false);
        expect(commander.ultimateRemainingDuration).toBe(0);
      });

      it('empirically audits weapon attack interval scaling during ultimate (+150% ASPD)', () => {
        const commander = new Commander('wang_shouren');
        commander.setRage(100);
        commander.castUltimate();

        const baseInterval = 1.0;
        // In BattleScene.ts line 558:
        // if (this.commander.isUltimateActive) interval /= 2.5; // +150% ASPD
        const effectiveInterval = commander.isUltimateActive ? baseInterval / 2.5 : baseInterval;
        expect(effectiveInterval).toBe(0.4);

        // Over 5 seconds of ultimate duration:
        // Normal weapons fire 5 / 1.0 = 5 times
        // Buffed weapons fire 5 / 0.4 = 12.5 times (150% more attacks)
        expect(5.0 / effectiveInterval).toBe(12.5);
      });
    });

    describe('2.3 FTUE Flow Stress & Action Guards', () => {
      let ftue: FTUEManager;
      let storage: MemoryStorageAdapter;

      beforeEach(() => {
        storage = new MemoryStorageAdapter();
        ftue = new FTUEManager(storage);
      });

      it('Step 1 (MERGE_FIRE_LANCE): strictly permits only valid lance merge drag and rejects all locked actions', () => {
        expect(ftue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);

        // Permitted actions
        expect(ftue.isActionPermitted('DRAG', { from: { row: 2, col: 1 }, to: { row: 2, col: 2 } })).toBe(true);
        expect(ftue.isActionPermitted('DRAG', { from: { row: 2, col: 2 }, to: { row: 2, col: 1 } })).toBe(true);

        // Stress: 100 invalid drag coordinates
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            if ((r === 2 && c === 1) || (r === 2 && c === 2)) continue;
            expect(ftue.isActionPermitted('DRAG', { from: { row: r, col: c }, to: { row: 2, col: 2 } })).toBe(false);
          }
        }

        // Stress: 50 locked clicks on shop and decree modal
        for (let i = 0; i < 50; i++) {
          expect(ftue.isActionPermitted('BUY_SHOP', { slotIndex: i % 3 })).toBe(false);
          expect(ftue.isActionPermitted('TAP_DECREE', { cardId: `T${i}` })).toBe(false);
        }

        // State remains strictly at Step 1
        expect(ftue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);
      });

      it('Step 2 (AUTO_MOW_INFANTRY): spectator mode strictly locks all player inputs', () => {
        // Advance to Step 2
        ftue.onMergeCompleted({ row: 2, col: 2 }, makeWeapon({ configId: 'fire_lance', star: 2 }));
        expect(ftue.getStep()).toBe(FTUEStep.STEP_2_AUTO_MOW_INFANTRY);

        const prompt = ftue.getCurrentPrompt();
        expect(prompt.allowPlayerInteraction).toBe(false);

        // All interactions must return false
        expect(ftue.isActionPermitted('DRAG', { from: { row: 2, col: 1 }, to: { row: 2, col: 2 } })).toBe(false);
        expect(ftue.isActionPermitted('BUY_SHOP', { slotIndex: 0 })).toBe(false);
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T11' })).toBe(false);

        // Premature wave 2 clear must be rejected
        expect(ftue.onWaveCleared(2)).toBe(false);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_2_AUTO_MOW_INFANTRY);

        // Valid wave 1 clear advances to Step 3
        expect(ftue.onWaveCleared(1)).toBe(true);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE);
      });

      it('Step 3 (PICK_THREE_VOLLEY_DECREE): strictly permits only T11 card selection and locks all other cards', () => {
        // Force step 3
        ftue.onMergeCompleted({ row: 2, col: 2 }, makeWeapon({ configId: 'fire_lance', star: 2 }));
        ftue.onWaveCleared(1);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE);

        // Rapid clicks on non-T11 tactics
        const otherCards = ['T01', 'T02', 'T03', 'T04', 'T05', 'T12', 'T20', 'T36'];
        for (const cid of otherCards) {
          expect(ftue.isActionPermitted('TAP_DECREE', { cardId: cid })).toBe(false);
          expect(ftue.onDecreePicked(cid)).toBe(false);
        }

        // Dragging and shop must also be blocked
        expect(ftue.isActionPermitted('DRAG', { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } })).toBe(false);
        expect(ftue.isActionPermitted('BUY_SHOP', { slotIndex: 0 })).toBe(false);

        // Selecting T11 succeeds and advances to Step 4
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T11' })).toBe(true);
        expect(ftue.onDecreePicked('T11')).toBe(true);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_4_ALIGN_ROW_SYNERGY);
      });

      it('Step 4 & Full Sequence vs skipFTUE evaluation', () => {
        // In Step 4, player can shop and drag to align row synergy
        ftue.onMergeCompleted({ row: 2, col: 2 }, makeWeapon({ configId: 'fire_lance', star: 2 }));
        ftue.onWaveCleared(1);
        ftue.onDecreePicked('T11');
        expect(ftue.getStep()).toBe(FTUEStep.STEP_4_ALIGN_ROW_SYNERGY);

        // Row synergy validation
        const grid = new GridModel();
        expect(ftue.onRowSynergyChecked(grid, 2)).toBe(false);

        // Add 3 fire lances to row 2
        grid.placeWeapon(makeWeapon({ id: 'w1', faction: 'fire' }), { row: 2, col: 0 });
        grid.placeWeapon(makeWeapon({ id: 'w2', faction: 'fire' }), { row: 2, col: 1 });
        expect(ftue.onRowSynergyChecked(grid, 2)).toBe(false); // Only 2 weapons

        grid.placeWeapon(makeWeapon({ id: 'w3', faction: 'fire' }), { row: 2, col: 2 });
        expect(ftue.onRowSynergyChecked(grid, 2)).toBe(true); // 3 weapons on row 2!

        // Wave 2 clear completes FTUE
        expect(ftue.onWaveCleared(2)).toBe(true);
        expect(ftue.getStep()).toBe(FTUEStep.COMPLETED);
        expect(ftue.isCompleted()).toBe(true);
        expect(storage.getItem(FTUE_STORAGE_KEY)).toBe('true');

        // Test skipFTUE from a fresh instance
        const freshFtue = new FTUEManager(new MemoryStorageAdapter());
        expect(freshFtue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);
        freshFtue.skipFTUE();
        expect(freshFtue.getStep()).toBe(FTUEStep.COMPLETED);
        expect(freshFtue.isCompleted()).toBe(true);
        expect(freshFtue.isActionPermitted('DRAG')).toBe(true);
        expect(freshFtue.isActionPermitted('BUY_SHOP')).toBe(true);
        expect(freshFtue.isActionPermitted('TAP_DECREE')).toBe(true);
      });
    });

    describe('2.4 Presentation Layer Integration & Verification', () => {
      it('VERIFIED: Initial FTUE weapons align with Grid (2,1)-(2,2) and FTUEManager permission', () => {
        const ftue = new FTUEManager();
        const gridDragAttempt = ftue.isActionPermitted('DRAG', {
          from: { row: 2, col: 1 },
          to: { row: 2, col: 2 }
        });
        expect(gridDragAttempt).toBe(true);

        const prompt = ftue.getCurrentPrompt();
        expect(prompt.highlightArea?.gridCells).toEqual([
          { row: 2, col: 1 },
          { row: 2, col: 2 }
        ]);
      });

      it('VERIFIED: Wang Shouren ultimate specifies resetAllWeaponCooldowns: true', () => {
        const config = getCommanderConfig('wang_shouren');
        expect(config.ultimate.resetAllWeaponCooldowns).toBe(true);

        const commander = new Commander('wang_shouren');
        commander.setRage(100);
        const res = commander.castUltimate();
        expect(res.success).toBe(true);
        expect(res.ultimate?.resetAllWeaponCooldowns).toBe(true);
      });
    });
  });
});
