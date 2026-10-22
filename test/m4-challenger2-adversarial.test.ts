/**
 * 《孤城神机营》- Milestone M4: Challenger 2 Adversarial Stress Test Suite
 *
 * Exhaustively stress-tests:
 * 1. EconomyEngine & PlayerWallet:
 *    - Guaranteed wave stipends W1..W10+ and boundary/negative waves.
 *    - Interest calculation boundaries (Base & TunTian) across the full [0..100] range and extreme balances.
 *    - Overdraft protection, zero balance guards, negative spending & earning rejections, balance invariants.
 *    - Weapon recycling economics: 75% standard floor vs 100% JingBing refund.
 *    - Audit history ledger immutability and transactional consistency.
 *
 * 2. FTUEManager Choreography:
 *    - Full 4-step input action validation matrix across all gestures and unauthorized actions.
 *    - Out-of-order transition rejections and golden path progression to COMPLETED.
 *    - Row synergy validation on Row 2 with fire faction filtering.
 *    - Veteran skip and reset idempotency with storage persistence.
 *
 * 3. FloatingTextManager Pooling & Performance Budgets:
 *    - High-throughput burst spawning (>250-500 events) strictly bounded by 150 pool capacity.
 *    - Zero-GC object reuse, FIFO culling of oldest active items, memory leak prevention.
 *    - Multi-frame simulation with dt updates and complete pool recovery upon idle.
 *    - DrawCall batch metadata verification strictly proving total scene DrawCalls <= 45.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EconomyEngine,
  PlayerWallet,
  WAVE_STIPENDS,
  WAVE_10_PLUS_STIPEND,
  BASE_INTEREST_CAP,
  TUNTIAN_INTEREST_CAP,
  FTUEManager,
  FTUEStep,
  FTUE_STORAGE_KEY,
  MemoryStorageAdapter,
  FloatingTextManager,
  FLOATING_TEXT_POOL_CAPACITY,
  MAX_TOTAL_SCENE_DRAWCALLS,
  WeaponInstance,
  DamageResult,
  EnemyEntity
} from '../src/core/types';
import { GridModel } from '../src/core/grid/grid-model';

describe('Milestone M4 Challenger 2 Adversarial Stress Testing', () => {

  // =========================================================================
  // SECTION 1: EconomyEngine & PlayerWallet Adversarial Testing
  // =========================================================================
  describe('1. EconomyEngine & PlayerWallet Boundary & Stress Tests', () => {
    let wallet: PlayerWallet;

    beforeEach(() => {
      wallet = new PlayerWallet(0);
    });

    describe('1.1 Wave Stipend Curve Verification', () => {
      it('EMP-ECON-01: W1..W10+ stipends strictly match GDD V3.0 §3.5', () => {
        const expectedStipends: Record<number, number> = {
          1: 35,
          2: 40,
          3: 45,
          4: 50,
          5: 55,
          6: 60,
          7: 65,
          8: 70,
          9: 80,
          10: 100
        };

        for (let wave = 1; wave <= 10; wave++) {
          const stipend = EconomyEngine.calculateStipend(wave);
          expect(stipend).toBe(expectedStipends[wave]);
        }

        // Post-wave 10 clamped to 100
        expect(EconomyEngine.calculateStipend(11)).toBe(100);
        expect(EconomyEngine.calculateStipend(15)).toBe(100);
        expect(EconomyEngine.calculateStipend(20)).toBe(100);
        expect(EconomyEngine.calculateStipend(100)).toBe(100);
      });

      it('EMP-ECON-02: Negative, zero, and float wave numbers fallback safely to W1', () => {
        expect(EconomyEngine.calculateStipend(0)).toBe(35);
        expect(EconomyEngine.calculateStipend(-1)).toBe(35);
        expect(EconomyEngine.calculateStipend(-999)).toBe(35);
        expect(EconomyEngine.calculateStipend(1.5)).toBe(35);
      });
    });

    describe('1.2 Interest Calculation Boundary Spectrum (Base & TunTian)', () => {
      it('EMP-ECON-03: Base interest boundaries: 0..9->0, 10..19->1, 49->4, 50..100->5', () => {
        // Range 0..9 -> 0
        for (let s = 0; s <= 9; s++) {
          expect(EconomyEngine.calculateInterest(s, false)).toBe(0);
        }

        // Range 10..19 -> 1
        for (let s = 10; s <= 19; s++) {
          expect(EconomyEngine.calculateInterest(s, false)).toBe(1);
        }

        // Specific boundary points
        expect(EconomyEngine.calculateInterest(20, false)).toBe(2);
        expect(EconomyEngine.calculateInterest(29, false)).toBe(2);
        expect(EconomyEngine.calculateInterest(30, false)).toBe(3);
        expect(EconomyEngine.calculateInterest(39, false)).toBe(3);
        expect(EconomyEngine.calculateInterest(40, false)).toBe(4);
        expect(EconomyEngine.calculateInterest(49, false)).toBe(4);
        expect(EconomyEngine.calculateInterest(50, false)).toBe(5);

        // Cap at 5 above 50 silver
        for (let s = 50; s <= 100; s += 5) {
          expect(EconomyEngine.calculateInterest(s, false)).toBe(BASE_INTEREST_CAP);
        }

        // Extreme values clamped to 5
        expect(EconomyEngine.calculateInterest(500, false)).toBe(5);
        expect(EconomyEngine.calculateInterest(10000, false)).toBe(5);
        expect(EconomyEngine.calculateInterest(1000000, false)).toBe(5);

        // Negative silver returns 0
        expect(EconomyEngine.calculateInterest(-10, false)).toBe(0);
      });

      it('EMP-ECON-04: TunTian interest boundaries: 0..4->0, 5..9->1, 39->7, 40..100->8', () => {
        // TunTian rate is 20%, cap 8
        // 0..4 -> 0
        for (let s = 0; s <= 4; s++) {
          expect(EconomyEngine.calculateInterest(s, true)).toBe(0);
        }

        // 5..9 -> 1
        for (let s = 5; s <= 9; s++) {
          expect(EconomyEngine.calculateInterest(s, true)).toBe(1);
        }

        // 10..14 -> 2
        for (let s = 10; s <= 14; s++) {
          expect(EconomyEngine.calculateInterest(s, true)).toBe(2);
        }

        // Boundaries 15, 20, 25, 30, 35, 39, 40
        expect(EconomyEngine.calculateInterest(15, true)).toBe(3);
        expect(EconomyEngine.calculateInterest(20, true)).toBe(4);
        expect(EconomyEngine.calculateInterest(25, true)).toBe(5);
        expect(EconomyEngine.calculateInterest(30, true)).toBe(6);
        expect(EconomyEngine.calculateInterest(35, true)).toBe(7);
        expect(EconomyEngine.calculateInterest(39, true)).toBe(7);
        expect(EconomyEngine.calculateInterest(40, true)).toBe(8);

        // Cap at 8 for 40..100
        for (let s = 40; s <= 100; s += 5) {
          expect(EconomyEngine.calculateInterest(s, true)).toBe(TUNTIAN_INTEREST_CAP);
        }

        // Extreme values clamped to 8
        expect(EconomyEngine.calculateInterest(500, true)).toBe(8);
        expect(EconomyEngine.calculateInterest(999999, true)).toBe(8);

        // Negative silver returns 0
        expect(EconomyEngine.calculateInterest(-50, true)).toBe(0);
      });
    });

    describe('1.3 PlayerWallet Overdraft Protection & Negative Value Guards', () => {
      it('EMP-ECON-05: Spending balance + 1 returns false and strictly preserves balance', () => {
        wallet.reset(50);
        expect(wallet.getSilver()).toBe(50);

        // Attempt overdraft
        const result = wallet.spend(51, 'Illegal Overdraft');
        expect(result).toBe(false);
        expect(wallet.getSilver()).toBe(50); // Balance unaltered

        // Massive overdraft
        expect(wallet.spend(10000, 'Massive Overdraft')).toBe(false);
        expect(wallet.getSilver()).toBe(50);

        // Exact spending succeeds and drains to 0
        expect(wallet.spend(50, 'Exact Spend')).toBe(true);
        expect(wallet.getSilver()).toBe(0);

        // Spending 1 when balance is 0 fails
        expect(wallet.spend(1, 'Spend at Zero')).toBe(false);
        expect(wallet.getSilver()).toBe(0);
      });

      it('EMP-ECON-06: Negative spending and negative earning attempts are rejected', () => {
        wallet.reset(30);

        // Negative spend
        expect(wallet.spend(-1, 'Negative Spend 1')).toBe(false);
        expect(wallet.spend(-100, 'Negative Spend 2')).toBe(false);
        expect(wallet.getSilver()).toBe(30);

        // Negative earn
        expect(wallet.earn(-10, 'Negative Earn 1')).toBe(30);
        expect(wallet.earn(-500, 'Negative Earn 2')).toBe(30);
        expect(wallet.getSilver()).toBe(30);

        // Zero earn leaves balance untouched
        expect(wallet.earn(0, 'Zero Earn')).toBe(30);
        expect(wallet.getSilver()).toBe(30);

        // Fractional earn is floored
        expect(wallet.earn(15.8, 'Fractional Earn')).toBe(45);
        expect(wallet.getSilver()).toBe(45);
      });

      it('EMP-ECON-07: Invariant check over 1,000 randomized transactions', () => {
        wallet.reset(100);
        let expectedBalance = 100;

        for (let i = 0; i < 1000; i++) {
          const op = Math.random();
          if (op < 0.4) {
            // Random earn
            const earnAmt = Math.floor(Math.random() * 20);
            wallet.earn(earnAmt);
            expectedBalance += earnAmt;
          } else if (op < 0.8) {
            // Random spend
            const spendAmt = Math.floor(Math.random() * 30);
            const success = wallet.spend(spendAmt);
            if (success) {
              expectedBalance -= spendAmt;
            }
          } else {
            // Wave settlement
            const wave = Math.floor(Math.random() * 10) + 1;
            const res = wallet.settleWaveIncome(wave, false);
            expectedBalance += res.totalIncome;
          }
          expect(wallet.getSilver()).toBe(expectedBalance);
          expect(wallet.getSilver()).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('1.4 Weapon Recycling Economics (75% Standard vs 100% JingBing)', () => {
      it('EMP-ECON-08: Standard recycling floors at 75% across values 1..20', () => {
        for (let invested = 1; invested <= 20; invested++) {
          const expected = Math.floor(invested * 0.75);
          expect(EconomyEngine.calculateRecycleRefund(invested, false)).toBe(expected);
        }

        // Specific fractional checks
        expect(EconomyEngine.calculateRecycleRefund(1, false)).toBe(0); // floor(0.75) = 0
        expect(EconomyEngine.calculateRecycleRefund(2, false)).toBe(1); // floor(1.50) = 1
        expect(EconomyEngine.calculateRecycleRefund(3, false)).toBe(2); // floor(2.25) = 2
        expect(EconomyEngine.calculateRecycleRefund(4, false)).toBe(3); // floor(3.00) = 3
        expect(EconomyEngine.calculateRecycleRefund(15, false)).toBe(11); // floor(11.25) = 11
        expect(EconomyEngine.calculateRecycleRefund(20, false)).toBe(15); // floor(15.00) = 15
        expect(EconomyEngine.calculateRecycleRefund(35, false)).toBe(26); // floor(26.25) = 26
      });

      it('EMP-ECON-09: JingBing 《精兵简政》 provides 100% full refund', () => {
        for (let invested = 1; invested <= 20; invested++) {
          expect(EconomyEngine.calculateRecycleRefund(invested, true)).toBe(invested);
        }
        expect(EconomyEngine.calculateRecycleRefund(35, true)).toBe(35);
      });

      it('EMP-ECON-10: Non-positive invested values return 0 refund and do not mutate wallet', () => {
        expect(EconomyEngine.calculateRecycleRefund(0, false)).toBe(0);
        expect(EconomyEngine.calculateRecycleRefund(-10, false)).toBe(0);
        expect(EconomyEngine.calculateRecycleRefund(0, true)).toBe(0);
        expect(EconomyEngine.calculateRecycleRefund(-5, true)).toBe(0);

        wallet.reset(20);
        expect(wallet.recycleWeapon(0)).toBe(0);
        expect(wallet.recycleWeapon(-10)).toBe(0);
        expect(wallet.getSilver()).toBe(20);
      });

      it('EMP-ECON-11: PlayerWallet audit ledger records all transactions with exact balance arithmetic', () => {
        wallet.reset(10);
        wallet.earn(20, 'kill_bounty');
        wallet.spend(15, 'buy_lance');
        wallet.recycleWeapon(15, false); // +11
        wallet.settleWaveIncome(1, false); // +35 stipend + 2 interest (balance was 26)

        const history = wallet.getHistory();
        expect(history.length).toBe(5);

        for (const entry of history) {
          expect(entry.balanceAfter).toBe(entry.balanceBefore + (
            entry.type === 'SPEND' ? -entry.amount : entry.amount
          ));
        }
      });
    });
  });

  // =========================================================================
  // SECTION 2: FTUEManager Choreography & State Machine Guards
  // =========================================================================
  describe('2. FTUEManager Choreography & Action Guard Stress Tests', () => {
    let ftue: FTUEManager;
    let storage: MemoryStorageAdapter;

    beforeEach(() => {
      storage = new MemoryStorageAdapter();
      ftue = new FTUEManager(storage);
    });

    describe('2.1 Input Action Guard Matrix Across All Steps', () => {
      it('EMP-FTUE-01: Step 1 (MERGE_FIRE_LANCE) strictly blocks unauthorized gestures', () => {
        expect(ftue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);

        // Valid gestures: (2,1)->(2,2) and (2,2)->(2,1)
        expect(ftue.isActionPermitted('DRAG', { from: { row: 2, col: 1 }, to: { row: 2, col: 2 } })).toBe(true);
        expect(ftue.isActionPermitted('DRAG', { from: { row: 2, col: 2 }, to: { row: 2, col: 1 } })).toBe(true);

        // Illegal DRAG positions
        expect(ftue.isActionPermitted('DRAG', { from: { row: 2, col: 1 }, to: { row: 2, col: 3 } })).toBe(false);
        expect(ftue.isActionPermitted('DRAG', { from: { row: 1, col: 1 }, to: { row: 2, col: 2 } })).toBe(false);
        expect(ftue.isActionPermitted('DRAG', { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } })).toBe(false);
        expect(ftue.isActionPermitted('DRAG', undefined)).toBe(false);
        expect(ftue.isActionPermitted('DRAG', {})).toBe(false);

        // Non-DRAG actions rejected during Step 1
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T11' })).toBe(false);
        expect(ftue.isActionPermitted('BUY_SHOP', { slotIndex: 0 })).toBe(false);
      });

      it('EMP-FTUE-02: Step 2 (AUTO_MOW_INFANTRY) is strict hands-off spectator mode', () => {
        // Advance to Step 2
        ftue.onMergeCompleted({ row: 2, col: 2 }, {
          id: 'w_test',
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
        expect(ftue.getStep()).toBe(FTUEStep.STEP_2_AUTO_MOW_INFANTRY);

        // All interactions blocked
        expect(ftue.isActionPermitted('DRAG', { from: { row: 2, col: 1 }, to: { row: 2, col: 2 } })).toBe(false);
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T11' })).toBe(false);
        expect(ftue.isActionPermitted('BUY_SHOP', { slotIndex: 0 })).toBe(false);

        const prompt = ftue.getCurrentPrompt();
        expect(prompt.allowPlayerInteraction).toBe(false);
        expect(prompt.showSkipButton).toBe(true);
      });

      it('EMP-FTUE-03: Step 3 (PICK_THREE_VOLLEY_DECREE) only allows selecting 《三段击阵法》', () => {
        // Fast-forward to Step 3
        ftue.onMergeCompleted({ row: 2, col: 2 }, {
          id: 'w_test', configId: 'fire_lance', star: 2, faction: 'fire',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
          isFortressOnly: false, baseAtk: 40, attackInterval: 0.8, range: 10
        });
        ftue.onWaveCleared(1);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE);

        // DRAG and SHOP rejected
        expect(ftue.isActionPermitted('DRAG', { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } })).toBe(false);
        expect(ftue.isActionPermitted('BUY_SHOP', { slotIndex: 0 })).toBe(false);

        // Wrong cards rejected
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T01' })).toBe(false);
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T02' })).toBe(false);
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T36' })).toBe(false);
        expect(ftue.isActionPermitted('TAP_DECREE', undefined)).toBe(false);

        // T11 or three_volley_tactic permitted
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'T11' })).toBe(true);
        expect(ftue.isActionPermitted('TAP_DECREE', { cardId: 'three_volley_tactic' })).toBe(true);
      });

      it('EMP-FTUE-04: Step 4 permits layout interactions and COMPLETED allows full freedom', () => {
        // Advance to Step 4
        ftue.onMergeCompleted({ row: 2, col: 2 }, {
          id: 'w_test', configId: 'fire_lance', star: 2, faction: 'fire',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
          isFortressOnly: false, baseAtk: 40, attackInterval: 0.8, range: 10
        });
        ftue.onWaveCleared(1);
        ftue.onDecreePicked('T11');
        expect(ftue.getStep()).toBe(FTUEStep.STEP_4_ALIGN_ROW_SYNERGY);

        // Step 4 permits interactions
        expect(ftue.isActionPermitted('DRAG', { from: { row: 0, col: 0 }, to: { row: 2, col: 0 } })).toBe(true);
        expect(ftue.isActionPermitted('BUY_SHOP', { slotIndex: 1 })).toBe(true);

        // Complete FTUE
        ftue.onWaveCleared(2);
        expect(ftue.getStep()).toBe(FTUEStep.COMPLETED);

        // All permitted in COMPLETED
        expect(ftue.isActionPermitted('DRAG')).toBe(true);
        expect(ftue.isActionPermitted('BUY_SHOP')).toBe(true);
        expect(ftue.isActionPermitted('TAP_DECREE')).toBe(true);
      });
    });

    describe('2.2 Step Progression Sequence Fuzzing & Happy Path', () => {
      it('EMP-FTUE-05: Out-of-order transitions are strictly rejected', () => {
        // In Step 1: cannot trigger wave clear or decree pick
        expect(ftue.onWaveCleared(1)).toBe(false);
        expect(ftue.onWaveCleared(2)).toBe(false);
        expect(ftue.onDecreePicked('T11')).toBe(false);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);

        // Cannot advance Step 1 with wrong weapon or low star
        expect(ftue.onMergeCompleted({ row: 2, col: 2 }, {
          id: 'w1', configId: 'repeating_crossbow', star: 2, faction: 'mohist',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
          isFortressOnly: false, baseAtk: 30, attackInterval: 0.5, range: 10
        })).toBe(false);
        expect(ftue.onMergeCompleted({ row: 2, col: 2 }, {
          id: 'w2', configId: 'fire_lance', star: 1, faction: 'fire',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
          isFortressOnly: false, baseAtk: 20, attackInterval: 1.0, range: 10
        })).toBe(false);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);

        // Advance to Step 2
        ftue.onMergeCompleted({ row: 2, col: 2 }, {
          id: 'w3', configId: 'fire_lance', star: 2, faction: 'fire',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
          isFortressOnly: false, baseAtk: 40, attackInterval: 0.8, range: 10
        });

        // In Step 2: cannot trigger merge or wave 2 clear
        expect(ftue.onMergeCompleted({ row: 2, col: 2 }, {
          id: 'w4', configId: 'fire_lance', star: 2, faction: 'fire',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
          isFortressOnly: false, baseAtk: 40, attackInterval: 0.8, range: 10
        })).toBe(false);
        expect(ftue.onWaveCleared(2)).toBe(false);
        expect(ftue.onDecreePicked('T11')).toBe(false);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_2_AUTO_MOW_INFANTRY);

        // Advance to Step 3
        ftue.onWaveCleared(1);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE);

        // In Step 3: cannot trigger wave clear or wrong decree
        expect(ftue.onWaveCleared(1)).toBe(false);
        expect(ftue.onWaveCleared(2)).toBe(false);
        expect(ftue.onDecreePicked('T01')).toBe(false);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE);

        // Advance to Step 4
        ftue.onDecreePicked('T11');
        expect(ftue.getStep()).toBe(FTUEStep.STEP_4_ALIGN_ROW_SYNERGY);

        // In Step 4: wave 1 does not complete FTUE
        expect(ftue.onWaveCleared(1)).toBe(false);
        expect(ftue.getStep()).toBe(FTUEStep.STEP_4_ALIGN_ROW_SYNERGY);

        // Wave 2 completes FTUE
        expect(ftue.onWaveCleared(2)).toBe(true);
        expect(ftue.getStep()).toBe(FTUEStep.COMPLETED);
        expect(ftue.isCompleted()).toBe(true);
        expect(storage.getItem(FTUE_STORAGE_KEY)).toBe('true');
      });

      it('EMP-FTUE-06: Row synergy validation requires >= 3 fire faction weapons specifically', () => {
        ftue['currentStep'] = FTUEStep.STEP_4_ALIGN_ROW_SYNERGY;
        const grid = new GridModel();

        // Add 2 fire weapons and 1 mo weapon on Row 2
        const f1: WeaponInstance = {
          id: 'f1', configId: 'fire_lance', star: 1, faction: 'fire',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 0 },
          isFortressOnly: false, baseAtk: 20, attackInterval: 1.0, range: 10
        };
        const f2: WeaponInstance = {
          id: 'f2', configId: 'fire_lance', star: 2, faction: 'fire',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 1 },
          isFortressOnly: false, baseAtk: 40, attackInterval: 0.8, range: 10
        };
        const m1: WeaponInstance = {
          id: 'm1', configId: 'repeating_crossbow', star: 1, faction: 'mohist',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
          isFortressOnly: false, baseAtk: 30, attackInterval: 0.5, range: 10
        };

        grid.placeWeapon(f1, { row: 2, col: 0 });
        grid.placeWeapon(f2, { row: 2, col: 1 });
        grid.placeWeapon(m1, { row: 2, col: 2 });

        // Total 3 weapons, but only 2 fire weapons -> synergy returns false
        expect(ftue.onRowSynergyChecked(grid, 2)).toBe(false);

        // Replace mo weapon with 3rd fire weapon
        grid.removeWeapon('m1');
        const f3: WeaponInstance = {
          id: 'f3', configId: 'fire_lance', star: 1, faction: 'fire',
          footprint: { width: 1, height: 1 }, anchor: { row: 2, col: 2 },
          isFortressOnly: false, baseAtk: 20, attackInterval: 1.0, range: 10
        };
        grid.placeWeapon(f3, { row: 2, col: 2 });

        // Exactly 3 fire weapons on row 2 -> returns true!
        expect(ftue.onRowSynergyChecked(grid, 2)).toBe(true);
      });
    });

    describe('2.3 Veteran Skip & Reset Invariants', () => {
      it('EMP-FTUE-07: Skip immediately completes and persists; reset restores initial state', () => {
        expect(ftue.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);
        expect(ftue.isCompleted()).toBe(false);

        // Skip
        ftue.skipFTUE();
        expect(ftue.getStep()).toBe(FTUEStep.COMPLETED);
        expect(ftue.isCompleted()).toBe(true);
        expect(storage.getItem(FTUE_STORAGE_KEY)).toBe('true');

        // New session starts at COMPLETED
        const resumedSession = new FTUEManager(storage);
        expect(resumedSession.getStep()).toBe(FTUEStep.COMPLETED);
        expect(resumedSession.isCompleted()).toBe(true);

        // Reset
        resumedSession.reset();
        expect(resumedSession.getStep()).toBe(FTUEStep.STEP_1_MERGE_FIRE_LANCE);
        expect(resumedSession.isCompleted()).toBe(false);
        expect(storage.getItem(FTUE_STORAGE_KEY)).toBeNull();
      });
    });
  });

  // =========================================================================
  // SECTION 3: FloatingTextManager Pooling & DrawCall <= 45 Stress Testing
  // =========================================================================
  describe('3. FloatingTextManager Pooling & Performance Redlines', () => {
    let ftm: FloatingTextManager;

    beforeEach(() => {
      ftm = new FloatingTextManager(FLOATING_TEXT_POOL_CAPACITY);
    });

    it('EMP-FLOAT-01: High-throughput burst (>250 damage events) caps strictly at 150 items with FIFO recycling', () => {
      const burstCount = 300;
      const spawnedIds: string[] = [];

      for (let i = 0; i < burstCount; i++) {
        const item = ftm.spawnDamage(100 + i, i % 5 === 0, { x: 375, y: 600 });
        spawnedIds.push(item.id);
      }

      // Active items count strictly equals capacity (150)
      expect(ftm.getActiveCount()).toBe(FLOATING_TEXT_POOL_CAPACITY);
      expect(ftm.getActiveTexts().length).toBe(FLOATING_TEXT_POOL_CAPACITY);

      // Culled count is exactly burstCount - capacity = 150
      const report = ftm.getDrawCallBudgetReport();
      expect(report.culledCount).toBe(burstCount - FLOATING_TEXT_POOL_CAPACITY);
      expect(report.activeTextCount).toBe(FLOATING_TEXT_POOL_CAPACITY);
      expect(report.maxCapacity).toBe(FLOATING_TEXT_POOL_CAPACITY);

      // Verify FIFO: oldest 150 items (indices 0..149) were culled, remaining 150 (indices 150..299) are active
      const activeIds = new Set(ftm.getActiveTexts().map(t => t.id));
      for (let i = 0; i < 150; i++) {
        expect(activeIds.has(spawnedIds[i])).toBe(false); // Culled
      }
      for (let i = 150; i < 300; i++) {
        expect(activeIds.has(spawnedIds[i])).toBe(true); // Active
      }
    });

    it('EMP-FLOAT-02: Zero-GC conservation invariant across 600-frame (10s) heavy battle simulation', () => {
      const totalFrames = 600; // 10s at 60 FPS
      const dt = 1 / 60; // ~0.0166s

      for (let frame = 0; frame < totalFrames; frame++) {
        // Spawn 0~3 damage events per frame
        const spawnCount = Math.floor(Math.random() * 4);
        for (let s = 0; s < spawnCount; s++) {
          ftm.spawnDamage(50, Math.random() < 0.25, { x: 300 + Math.random() * 150, y: 600 });
        }

        // Periodically spawn elemental text
        if (frame % 30 === 0) {
          ftm.spawnElementalText('猛火轰爆!', '#ff4500', { x: 375, y: 580 });
        }

        // Update physics & lifetimes
        ftm.update(dt);

        // Core Invariants:
        // 1. Active count never exceeds pool capacity
        expect(ftm.getActiveCount()).toBeLessThanOrEqual(FLOATING_TEXT_POOL_CAPACITY);

        // 2. Internal pool + active items strictly conserves 150 total items
        const poolSize = (ftm as any).pool.length;
        const activeSize = (ftm as any).activeItems.length;
        expect(poolSize + activeSize).toBe(FLOATING_TEXT_POOL_CAPACITY);

        // 3. DrawCall budget strictly satisfied in every frame
        const frameReport = ftm.getDrawCallBudgetReport();
        expect(frameReport.isWithinBudget).toBe(true);
        expect(frameReport.estimatedTotalSceneDrawCalls).toBeLessThanOrEqual(MAX_TOTAL_SCENE_DRAWCALLS);
      }

      // Let battle subside: run 2 seconds of dt without spawning
      for (let frame = 0; frame < 120; frame++) {
        ftm.update(dt);
      }

      // All texts expired and returned to pool without memory leaks
      expect(ftm.getActiveCount()).toBe(0);
      expect((ftm as any).pool.length).toBe(FLOATING_TEXT_POOL_CAPACITY);
    });

    it('EMP-FLOAT-03: DrawCall batch metadata strictly satisfies DrawCall <= 45 under all loads', () => {
      // 1. Zero load
      const emptyReport = ftm.getDrawCallBudgetReport();
      expect(emptyReport.textLayerDrawCalls).toBe(0);
      expect(emptyReport.estimatedTotalSceneDrawCalls).toBe(25);
      expect(emptyReport.isWithinBudget).toBe(true);
      expect(emptyReport.batches.length).toBe(0);

      // 2. Partial load (50 items)
      for (let i = 0; i < 50; i++) {
        ftm.spawnDamage(40, false, { x: 375, y: 600 });
      }
      const partialReport = ftm.getDrawCallBudgetReport();
      expect(partialReport.textLayerDrawCalls).toBe(1);
      expect(partialReport.estimatedTotalSceneDrawCalls).toBe(26);
      expect(partialReport.isWithinBudget).toBe(true);
      expect(partialReport.batches.length).toBe(1);
      expect(partialReport.batches[0].itemCount).toBe(50);
      expect(partialReport.batches[0].vertexCount).toBe(200); // 50 * 4
      expect(partialReport.batches[0].primitiveCount).toBe(100); // 50 * 2
      expect(partialReport.batches[0].atlasKey).toBe('bitmap_font_damage');

      // 3. Maximum saturation load (150 items)
      for (let i = 0; i < 150; i++) {
        ftm.spawnDamage(80, true, { x: 375, y: 600 });
      }
      const maxReport = ftm.getDrawCallBudgetReport();
      expect(maxReport.activeTextCount).toBe(150);
      expect(maxReport.textLayerDrawCalls).toBe(1); // Single bitmap atlas
      expect(maxReport.estimatedTotalSceneDrawCalls).toBe(26); // 25 base + 1 text layer
      expect(maxReport.maxDrawCallBudget).toBe(45);
      expect(maxReport.isWithinBudget).toBe(true);
      expect(maxReport.batches[0].vertexCount).toBe(600); // 150 * 4
      expect(maxReport.batches[0].primitiveCount).toBe(300); // 150 * 2
    });

    it('EMP-FLOAT-04: Hit flashes correctly fade and clear() drains everything cleanly', () => {
      const flash1 = ftm.spawnHitFlash('enemy_1', true);
      const flash2 = ftm.spawnHitFlash('enemy_2', false);
      expect(ftm.getActiveFlashes().length).toBe(2);

      // Update 0.10s: non-crit (0.08s) should expire, crit (0.15s) still active
      ftm.update(0.10);
      expect(ftm.getActiveFlashes().length).toBe(1);
      expect(ftm.getActiveFlashes()[0].id).toBe(flash1.id);

      // Update another 0.10s: both expired
      ftm.update(0.10);
      expect(ftm.getActiveFlashes().length).toBe(0);

      // Spawn text and flashes, then call clear()
      ftm.spawnDamage(100, false, { x: 300, y: 400 });
      ftm.spawnHitFlash('enemy_3', true);
      expect(ftm.getActiveCount()).toBe(1);
      expect(ftm.getActiveFlashes().length).toBe(1);

      ftm.clear();
      expect(ftm.getActiveCount()).toBe(0);
      expect(ftm.getActiveFlashes().length).toBe(0);
      expect((ftm as any).pool.length).toBe(FLOATING_TEXT_POOL_CAPACITY);
    });
  });

});
