/**
 * 《孤城神机营》- Milestone M4: 60s FTUE Choreography & Floating Text Test Suite
 * Validates:
 * 1. FTUEManager: 4-step golden tutorial sequence, input guards, prompts & hints, veteran skip, persistent storage.
 * 2. FloatingTextManager: Damage numbers, crit text, elemental text, hit flashes, zero-GC pool recycling, DrawCall <= 45 budget.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FTUEManager,
  FTUEStep,
  MemoryStorageAdapter,
  FTUE_STORAGE_KEY,
  FloatingTextManager,
  FLOATING_TEXT_POOL_CAPACITY,
  MAX_TOTAL_SCENE_DRAWCALLS,
  WeaponInstance,
  DamageResult,
  EnemyEntity
} from '../src/core/types';
import { GridModel } from '../src/core/grid/grid-model';

describe('Milestone M4: 60s FTUE Choreography & Floating Text Tests', () => {

  // ==========================================
  // Area 1: 60s FTUE Choreography & Guards
  // ==========================================
  describe('Area 1: 60s FTUE Choreography & Guards', () => {
    let ftue: FTUEManager;
    let storage: MemoryStorageAdapter;

    beforeEach(() => {
      storage = new MemoryStorageAdapter();
      ftue = new FTUEManager(storage);
    });

    it('TC-FTUE-01: Step 1 (MERGE_FIRE_LANCE) prompt hints and valid drag permission', () => {
      expect(ftue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);
      expect(ftue.isCompleted()).toBe(false);

      const prompt = ftue.getCurrentPrompt();
      expect(prompt.step).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);
      expect(prompt.allowPlayerInteraction).toBe(true);
      expect(prompt.showSkipButton).toBe(true);
      expect(prompt.highlightArea?.type).toBe('grid_cell');
      expect(prompt.highlightArea?.gridCells).toEqual([
        { row: 2, col: 1 },
        { row: 2, col: 2 }
      ]);
      expect(prompt.gestureHint?.type).toBe('drag');
      expect(prompt.gestureHint?.from?.screenX).toBe(299);
      expect(prompt.gestureHint?.to?.screenX).toBe(375);

      // Valid drag from (2,1) to (2,2)
      expect(ftue.isActionPermitted('DRAG', {
        from: { row: 2, col: 1 },
        to: { row: 2, col: 2 }
      })).toBe(true);

      // Reverse drag from (2,2) to (2,1) also permitted
      expect(ftue.isActionPermitted('DRAG', {
        from: { row: 2, col: 2 },
        to: { row: 2, col: 1 }
      })).toBe(true);
    });

    it('TC-FTUE-02: Step 1 suppresses illegal drags and actions', () => {
      // Dragging unrelated cells is blocked
      expect(ftue.isActionPermitted('DRAG', {
        from: { row: 0, col: 0 },
        to: { row: 0, col: 1 }
      })).toBe(false);

      // Tapping decree cards or shop actions blocked during Step 1
      expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T11' })).toBe(false);
      expect(ftue.isActionPermitted('BUY_SHOP', { slotIndex: 0 })).toBe(false);
    });

    it('TC-FTUE-03: Merge completion transitions to Step 2 (AUTO_MOW_INFANTRY) spectator mode', () => {
      const mergedLance: WeaponInstance = {
        id: 'lance_2',
        configId: 'fire_lance',
        star: 2,
        faction: 'fire',
        footprint: { width: 1, height: 1 },
        anchor: { row: 2, col: 2 },
        isFortressOnly: false,
        baseAtk: 40,
        attackInterval: 0.8,
        range: 10
      };

      // Illegal weapon merge does not advance
      const wrongMerge = ftue.onMergeCompleted({ row: 2, col: 2 }, { ...mergedLance, configId: 'repeating_crossbow' });
      expect(wrongMerge).toBe(false);
      expect(ftue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);

      // Valid ★2 fire_lance merge advances to Step 2
      const success = ftue.onMergeCompleted({ row: 2, col: 2 }, mergedLance);
      expect(success).toBe(true);
      expect(ftue.getStep()).toBe(FTUEStep.STEP_2_AUTO_MOW_INFANTRY);

      // Step 2 is hands-off spectator mode
      const prompt = ftue.getCurrentPrompt();
      expect(prompt.allowPlayerInteraction).toBe(false);
      expect(ftue.isActionPermitted('DRAG', { from: { row: 2, col: 1 }, to: { row: 2, col: 2 } })).toBe(false);
      expect(ftue.isActionPermitted('TAP_DECREE')).toBe(false);
    });

    it('TC-FTUE-04: Clearing Wave 1 advances to Step 3 (PICK_THREE_VOLLEY_DECREE)', () => {
      // Advance to step 2 first
      ftue.onMergeCompleted({ row: 2, col: 2 }, {
        id: 'lance_2',
        configId: 'fire_lance',
        star: 2,
        faction: 'fire',
        footprint: { width: 1, height: 1 },
        anchor: { row: 2, col: 2 },
        isFortressOnly: false,
        baseAtk: 40,
        attackInterval: 0.8,
        range: 10
      });

      // Wave 2 clear while in Step 2 is ignored
      expect(ftue.onWaveCleared(2)).toBe(false);

      // Wave 1 clear advances to Step 3
      expect(ftue.onWaveCleared(1)).toBe(true);
      expect(ftue.getStep()).toBe(FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE);

      const prompt = ftue.getCurrentPrompt();
      expect(prompt.step).toBe(FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE);
      expect(prompt.allowPlayerInteraction).toBe(true);
      expect(prompt.highlightArea?.cardId).toBe('T11');
    });

    it('TC-FTUE-05: Step 3 only allows selecting 《三段击阵法》 (T11)', () => {
      // Set to step 3 directly
      ftue['currentStep'] = FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE;

      // Reject non-T11 cards
      expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T01' })).toBe(false);
      expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T04' })).toBe(false);
      expect(ftue.onDecreePicked('T01')).toBe(false);

      // Permit T11
      expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T11' })).toBe(true);
      expect(ftue.onDecreePicked('T11')).toBe(true);
      expect(ftue.getStep()).toBe(FTUEStep.STEP_4_ALIGN_ROW_SYNERGY);
    });

    it('TC-FTUE-06: Step 4 row synergy detection and Wave 2 completion to COMPLETED', () => {
      ftue['currentStep'] = FTUEStep.STEP_4_ALIGN_ROW_SYNERGY;

      const grid = new GridModel();

      // Place only 2 fire weapons on Row 2 -> synergy not active
      const w1: WeaponInstance = {
        id: 'w1', configId: 'fire_lance', star: 1, faction: 'fire',
        footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 0 },
        isFortressOnly: false, baseAtk: 20, attackInterval: 1.0, range: 10
      };
      const w2: WeaponInstance = {
        id: 'w2', configId: 'fire_lance', star: 2, faction: 'fire',
        footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
        isFortressOnly: false, baseAtk: 40, attackInterval: 0.8, range: 10
      };
      grid.placeWeapon(w1, { row: 2, col: 0 });
      grid.placeWeapon(w2, { row: 2, col: 2 });

      expect(ftue.onRowSynergyChecked(grid, 2)).toBe(false);

      // Place 3rd fire weapon on Row 2 -> row synergy satisfied!
      const w3: WeaponInstance = {
        id: 'w3', configId: 'fire_lance', star: 1, faction: 'fire',
        footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 4 },
        isFortressOnly: false, baseAtk: 20, attackInterval: 1.0, range: 10
      };
      grid.placeWeapon(w3, { row: 2, col: 4 });

      expect(ftue.onRowSynergyChecked(grid, 2)).toBe(true);

      // Clear Wave 2 -> finishes FTUE!
      expect(ftue.onWaveCleared(2)).toBe(true);
      expect(ftue.getStep()).toBe(FTUEStep.COMPLETED);
      expect(ftue.isCompleted()).toBe(true);
      expect(storage.getItem(FTUE_STORAGE_KEY)).toBe('true');
    });

    it('TC-FTUE-07: Veteran skip and persistent storage reload', () => {
      // Veteran skip button
      ftue.skipFTUE();
      expect(ftue.getStep()).toBe(FTUEStep.COMPLETED);
      expect(ftue.isCompleted()).toBe(true);
      expect(storage.getItem(FTUE_STORAGE_KEY)).toBe('true');

      // Next session with same storage initializes directly to COMPLETED
      const nextSessionFTUE = new FTUEManager(storage);
      expect(nextSessionFTUE.getStep()).toBe(FTUEStep.COMPLETED);
      expect(nextSessionFTUE.isCompleted()).toBe(true);

      // Reset clears storage and restarts
      nextSessionFTUE.reset();
      expect(nextSessionFTUE.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);
      expect(nextSessionFTUE.isCompleted()).toBe(false);
      expect(storage.getItem(FTUE_STORAGE_KEY)).toBeNull();
    });
  });

  // ==========================================
  // Area 2: FloatingTextManager & DrawCall Budget
  // ==========================================
  describe('Area 2: FloatingTextManager & DrawCall Budget', () => {
    let ftm: FloatingTextManager;

    beforeEach(() => {
      ftm = new FloatingTextManager(FLOATING_TEXT_POOL_CAPACITY);
    });

    it('TC-FLOAT-01: Normal damage floating text creation and styling', () => {
      const item = ftm.spawnDamage(48.6, false, { x: 375, y: 600 });
      expect(item.value).toBe(49);
      expect(item.text).toBe('-49');
      expect(item.isCrit).toBe(false);
      expect(item.color).toBe('#ffffff');
      expect(item.scale).toBe(1.0);
      expect(item.isActive).toBe(true);
      expect(ftm.getActiveCount()).toBe(1);
    });

    it('TC-FLOAT-02: Critical damage floating text and golden styling', () => {
      const item = ftm.spawnDamage(150, true, { x: 300, y: 700 });
      expect(item.value).toBe(150);
      expect(item.text).toBe('暴击 -150!');
      expect(item.isCrit).toBe(true);
      expect(item.color).toBe('#ffd700');
      expect(item.scale).toBe(1.5);
      expect(item.lifetime).toBe(1.0);
    });

    it('TC-FLOAT-03: Elemental text and hit flash spawning', () => {
      const elem = ftm.spawnElementalText('猛火轰爆!', '#ff4500', { x: 375, y: 600 });
      expect(elem.text).toBe('猛火轰爆!');
      expect(elem.color).toBe('#ff4500');
      expect(elem.type).toBe('ELEMENTAL_TEXT');

      const flash = ftm.spawnHitFlash('enemy_1', true);
      expect(flash.targetId).toBe('enemy_1');
      expect(flash.duration).toBe(0.15);
      expect(flash.intensity).toBe(1.0);
      expect(ftm.getActiveFlashes().length).toBe(1);
    });

    it('TC-FLOAT-04: Spawn from DamageResult integration', () => {
      const target: EnemyEntity = {
        id: 'target_1',
        typeId: 'shield_guard',
        name: '刀盾兵',
        isBoss: false,
        maxHp: 200,
        currentHp: 150,
        armor: 100,
        shield: 0,
        moveSpeed: 0.8,
        x: 375,
        y: 650
      };

      const damageResult: DamageResult = {
        finalDamage: 75,
        isCrit: true,
        actualHpDeducted: 75,
        effectiveArmor: 100,
        steps: {
          baseAtk: 50,
          skillDmg: 50,
          additiveDmg: 50,
          multiplicativeDmg: 50,
          critDmg: 75,
          armorDmg: 75,
          finalDmg: 75
        }
      };

      const item = ftm.spawnFromDamageResult(target, damageResult);
      expect(item.value).toBe(75);
      expect(item.isCrit).toBe(true);
      expect(item.x).toBe(375);
      expect(item.y).toBe(650);
      expect(ftm.getActiveFlashes().length).toBe(1);
    });

    it('TC-FLOAT-05: Physics simulation and alpha fade out over dt', () => {
      const item = ftm.spawnDamage(50, false, { x: 375, y: 600 });
      const initialY = item.y;

      // Update 0.4s (lifetime = 0.8s) -> half elapsed
      ftm.update(0.4);
      expect(item.y).toBeLessThan(initialY); // Moved upwards
      expect(item.alpha).toBeLessThan(1.0);
      expect(item.alpha).toBeGreaterThan(0.0);
      expect(item.isActive).toBe(true);

      // Update remaining 0.5s -> exceeds lifetime, recycled into pool
      ftm.update(0.5);
      expect(ftm.getActiveCount()).toBe(0);
    });

    it('TC-FLOAT-06: Zero-GC pool recycling when exceeding 150 capacity', () => {
      // Spawn 160 items with 150 capacity
      for (let i = 0; i < 160; i++) {
        ftm.spawnDamage(10 + i, false, { x: 300, y: 500 });
      }

      // Max active is capped at 150, oldest 10 were culled without error
      const report = ftm.getDrawCallBudgetReport();
      expect(report.activeTextCount).toBe(150);
      expect(report.culledCount).toBe(10);
      expect(report.isWithinBudget).toBe(true);
    });

    it('TC-FLOAT-07: DrawCall batch metadata strictly satisfies DrawCall <= 45', () => {
      // Empty state
      const emptyReport = ftm.getDrawCallBudgetReport();
      expect(emptyReport.textLayerDrawCalls).toBe(0);
      expect(emptyReport.estimatedTotalSceneDrawCalls).toBe(25);
      expect(emptyReport.isWithinBudget).toBe(true);

      // Active state with 50 texts
      for (let i = 0; i < 50; i++) {
        ftm.spawnDamage(50, false, { x: 375, y: 600 });
      }

      const activeReport = ftm.getDrawCallBudgetReport();
      // Bitmap font atlas renders all texts in exactly 1 batch/drawcall
      expect(activeReport.textLayerDrawCalls).toBe(1);
      expect(activeReport.estimatedTotalSceneDrawCalls).toBe(26);
      expect(activeReport.maxDrawCallBudget).toBe(45);
      expect(activeReport.isWithinBudget).toBe(true);
      expect(activeReport.batches.length).toBe(1);
      expect(activeReport.batches[0].atlasKey).toBe('bitmap_font_damage');
      expect(activeReport.batches[0].itemCount).toBe(50);
      expect(activeReport.batches[0].vertexCount).toBe(200); // 50 * 4 vertices
    });

    it('TC-FLOAT-08: Bulk clear returns all active items to pool', () => {
      for (let i = 0; i < 20; i++) {
        ftm.spawnDamage(20, false, { x: 375, y: 600 });
      }
      expect(ftm.getActiveCount()).toBe(20);

      ftm.clear();
      expect(ftm.getActiveCount()).toBe(0);
      expect(ftm.getActiveFlashes().length).toBe(0);
    });
  });

});
