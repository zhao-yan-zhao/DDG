/**
 * 《孤城神机营》- Milestone M4 Adversarial Stress Test Suite
 * Challenger 1: WaveFSM, Enemy Archetypes, Shield Guard DR, Boss Enrage, and CCDecayEngine
 *
 * Exhaustive empirical challenge verifying:
 * 1. WaveFSM State Transitions & Wall Defeat:
 *    - All 49 (7x7) state transition permutations, validating legal transitions and throwing InvalidStateTransitionError on illegal ones.
 *    - Terminal states (Defeat, Victory) strict exit lockdown.
 *    - Wall HP drop to <= 0 during active combat triggering immediate Defeat, dropping further damage, and blocking battle completion.
 *    - Campaign victory boundary at Wave 15 (and custom wave limits).
 *    - Wall damage clamping, repair limits, and revive semantics.
 * 2. Enemy Archetypes & Mitigation Mechanics:
 *    - Shield Guard 40% frontal physical DR vs flanking / non-physical volleys.
 *    - Iron Pagoda 60% frontal physical DR.
 *    - Ordinary / Charging / Boss archetype absence of frontal DR.
 *    - Shield absorption interaction with frontal DR.
 *    - Boss Bear enrage at <= 50% HP (0.7 -> 1.26 m/s, 1.80x speed boost) with idempotency under repeated attacks.
 *    - Suicide Bomber 150 wall damage, instant self-destruction, and zero damage on pre-mortem kills or status paralysis.
 * 3. CCDecayEngine Mathematical Rigor:
 *    - Exact k=0..10 decay curve on ordinary units and bosses, strictly floored at 0.20s.
 *    - Zero/negative base duration handling.
 *    - 1.5s post-CC tenacity window with millisecond-level boundary checks (t = 11.499s reject vs t = 11.500s accept).
 *    - ccCount immutability during rejected attempts.
 *    - Boss hard stun cap (strictly 3 stuns maximum) vs ordinary units (uncapped).
 *    - Dead target rejection ('TARGET_DEAD').
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WaveFSM,
  InvalidStateTransitionError,
  WaveState,
  EnemyFactory,
  createEnemyEntity,
  EnemyEntityLogic,
  CCDecayEngine,
  DEFAULT_WALL_Y,
  DEFAULT_SPAWN_Y,
  PIXELS_PER_METER,
  EnemyEntity
} from '../src/core/types';

describe('Challenger M4.1 Adversarial Stress Harness: WaveFSM, Enemy Archetypes & CC Decay', () => {

  // =========================================================================
  // Section 1: WaveFSM State Transitions & Wall Defeat
  // =========================================================================
  describe('1. WaveFSM State Transitions & Wall Defeat Adversarial Challenges', () => {
    let fsm: WaveFSM;
    const ALL_STATES: WaveState[] = [
      'Prep',
      'WaveActive',
      'WaveClear',
      'DecreeReward',
      'Income',
      'Defeat',
      'Victory'
    ];

    beforeEach(() => {
      fsm = new WaveFSM({
        initialWave: 1,
        maxWaves: 15,
        initialWallHp: 1000,
        maxWallHp: 1000,
        chapterId: 1
      });
    });

    it('ADV-WAVE-01: Exhaustive 7x7 state transition permutation matrix validation', () => {
      // Define legal transitions: Map<fromState, Set<toState>>
      // Note: Defeat can be reached from any non-terminal state.
      const legalTransitions: Record<WaveState, Set<WaveState>> = {
        Prep: new Set<WaveState>(['WaveActive', 'Defeat']),
        WaveActive: new Set<WaveState>(['WaveClear', 'Defeat']),
        WaveClear: new Set<WaveState>(['DecreeReward', 'Defeat']),
        DecreeReward: new Set<WaveState>(['Income', 'Defeat']),
        Income: new Set<WaveState>(['Prep', 'Victory', 'Defeat']),
        Defeat: new Set<WaveState>([]), // Terminal: no transitions out via transitionTo
        Victory: new Set<WaveState>([]) // Terminal: no transitions out
      };

      for (const fromState of ALL_STATES) {
        for (const toState of ALL_STATES) {
          // Initialize fresh FSM and walk to fromState
          const testFsm = new WaveFSM({ initialWave: 1, maxWaves: 15 });

          // Helper to bring testFsm to fromState
          if (fromState === 'WaveActive') {
            testFsm.startWave();
          } else if (fromState === 'WaveClear') {
            testFsm.startWave();
            testFsm.completeBattle();
          } else if (fromState === 'DecreeReward') {
            testFsm.startWave();
            testFsm.completeBattle();
            testFsm.openDecreeReward();
          } else if (fromState === 'Income') {
            testFsm.startWave();
            testFsm.completeBattle();
            testFsm.openDecreeReward();
            testFsm.claimDecree();
          } else if (fromState === 'Defeat') {
            testFsm.triggerDefeat();
          } else if (fromState === 'Victory') {
            // Fast-forward to Wave 15 Income then Victory
            const victoryFsm = new WaveFSM({ initialWave: 15, maxWaves: 15 });
            victoryFsm.startWave();
            victoryFsm.completeBattle();
            victoryFsm.openDecreeReward();
            victoryFsm.claimDecree();
            victoryFsm.finishIncome();
            expect(victoryFsm.getState()).toBe('Victory');
            // Test transitions from Victory
            const isLegal = legalTransitions['Victory'].has(toState);
            expect(victoryFsm.canTransitionTo(toState)).toBe(isLegal);
            if (!isLegal) {
              expect(() => victoryFsm.transitionTo(toState)).toThrow(InvalidStateTransitionError);
            }
            continue;
          }

          expect(testFsm.getState()).toBe(fromState);

          const shouldBeLegal = legalTransitions[fromState].has(toState);
          const canTransition = testFsm.canTransitionTo(toState);
          expect(
            canTransition,
            `canTransitionTo from '${fromState}' to '${toState}' was expected to be ${shouldBeLegal}`
          ).toBe(shouldBeLegal);

          if (shouldBeLegal) {
            expect(() => testFsm.transitionTo(toState)).not.toThrow();
            expect(testFsm.getState()).toBe(toState);
          } else {
            expect(() => testFsm.transitionTo(toState)).toThrow(InvalidStateTransitionError);
          }
        }
      }
    });

    it('ADV-WAVE-02: Simultaneous enemy wall attacks drop remaining events after wall reaches 0', () => {
      const onDefeat = vi.fn();
      const onWallDamage = vi.fn();
      fsm.onDefeat = onDefeat;
      fsm.onWallDamage = onWallDamage;

      fsm.startWave();
      expect(fsm.getState()).toBe('WaveActive');

      // Wall starts with 50 HP
      fsm.damageWall(950); // 1000 -> 50
      expect(fsm.getWallHp()).toBe(50);
      expect(fsm.getState()).toBe('WaveActive');

      // First heavy hit of 100 damage: wipes remaining 50 HP -> Defeat!
      const remainingHp1 = fsm.damageWall(100);
      expect(remainingHp1).toBe(0);
      expect(fsm.getWallHp()).toBe(0);
      expect(fsm.getState()).toBe('Defeat');
      expect(onDefeat).toHaveBeenCalledTimes(1);
      expect(onDefeat).toHaveBeenCalledWith(1);
      expect(onWallDamage).toHaveBeenCalledWith(50, 0, 1000);

      // Second simultaneous enemy attack arrives with 200 damage:
      // Must be safely dropped, not trigger duplicate Defeat or negative HP!
      const remainingHp2 = fsm.damageWall(200);
      expect(remainingHp2).toBe(0);
      expect(fsm.getWallHp()).toBe(0);
      expect(onDefeat).toHaveBeenCalledTimes(1); // STILL exactly 1 call
      expect(onWallDamage).toHaveBeenCalledTimes(2); // Only the initial 950 and 50 calls
    });

    it('ADV-WAVE-03: Battle completion during Defeat throws InvalidStateTransitionError', () => {
      fsm.startWave();
      fsm.damageWall(1000); // Defeat!
      expect(fsm.getState()).toBe('Defeat');

      // Attempting to resolve battle when wall is broken must fail
      expect(() => fsm.completeBattle()).toThrow(InvalidStateTransitionError);
      expect(() => fsm.onAllEnemiesDefeated()).toThrow(InvalidStateTransitionError);
      expect(() => fsm.openDecreeReward()).toThrow(InvalidStateTransitionError);
    });

    it('ADV-WAVE-04: Campaign victory boundary triggers exactly on Wave 15 finishIncome', () => {
      const onVictory = vi.fn();
      fsm.onVictory = onVictory;

      // Start directly at Wave 15
      const wave15Fsm = new WaveFSM({ initialWave: 15, maxWaves: 15 });
      wave15Fsm.onVictory = onVictory;

      wave15Fsm.startWave();
      wave15Fsm.completeBattle();
      wave15Fsm.openDecreeReward();
      wave15Fsm.claimDecree();
      expect(wave15Fsm.getState()).toBe('Income');

      wave15Fsm.finishIncome();
      expect(wave15Fsm.getState()).toBe('Victory');
      expect(onVictory).toHaveBeenCalledTimes(1);

      // Post-victory calls throw InvalidStateTransitionError
      expect(() => wave15Fsm.startWave()).toThrow(InvalidStateTransitionError);
      expect(() => wave15Fsm.completeBattle()).toThrow(InvalidStateTransitionError);
    });

    it('ADV-WAVE-05: 1-Wave custom mini-campaign boundary validation', () => {
      const miniFsm = new WaveFSM({ initialWave: 1, maxWaves: 1 });
      miniFsm.startWave();
      miniFsm.completeBattle();
      miniFsm.openDecreeReward();
      miniFsm.claimDecree();
      miniFsm.finishIncome();

      expect(miniFsm.getState()).toBe('Victory');
    });

    it('ADV-WAVE-06: Wall repairs and setMaxWallHp boundaries and clamp constraints', () => {
      // Normal damage and repair
      fsm.damageWall(400); // 600 / 1000
      expect(fsm.getWallHp()).toBe(600);

      // Repair cannot overshoot maxWallHp
      fsm.repairWall(800);
      expect(fsm.getWallHp()).toBe(1000);

      // Negative or zero repair does nothing
      expect(fsm.repairWall(-100)).toBe(1000);
      expect(fsm.repairWall(0)).toBe(1000);

      // setMaxWallHp with healDelta = false
      fsm.damageWall(500); // 500 / 1000
      fsm.setMaxWallHp(1500, false);
      expect(fsm.getMaxWallHp()).toBe(1500);
      expect(fsm.getWallHp()).toBe(500); // HP unchanged

      // setMaxWallHp with healDelta = true
      fsm.setMaxWallHp(2000, true);
      expect(fsm.getMaxWallHp()).toBe(2000);
      expect(fsm.getWallHp()).toBe(1000); // 500 + (2000 - 1500) = 1000

      // setMaxWallHp downward clamps wallHp
      fsm.setMaxWallHp(800, false);
      expect(fsm.getMaxWallHp()).toBe(800);
      expect(fsm.getWallHp()).toBe(800); // Clamped from 1000 to 800

      // setMaxWallHp with 0 or negative clamps to 1
      fsm.setMaxWallHp(-50);
      expect(fsm.getMaxWallHp()).toBe(1);
      expect(fsm.getWallHp()).toBe(1);
    });

    it('ADV-WAVE-07: Revive mechanics and illegal revive protection', () => {
      // Revive while healthy throws
      expect(() => fsm.revive()).toThrow(/Cannot revive when state is 'Prep'/);

      fsm.startWave();
      expect(() => fsm.revive()).toThrow(/Cannot revive when state is 'WaveActive'/);

      fsm.damageWall(1000);
      expect(fsm.getState()).toBe('Defeat');

      // Default revive restores 50% HP
      fsm.revive();
      expect(fsm.getState()).toBe('Prep');
      expect(fsm.getWallHp()).toBe(500);
      expect(fsm.isWallBroken()).toBe(false);

      // Revive with explicit HP
      fsm.damageWall(500);
      expect(fsm.getState()).toBe('Defeat');
      fsm.revive(800);
      expect(fsm.getWallHp()).toBe(800);

      // Revive cannot exceed maxWallHp
      fsm.damageWall(800);
      expect(fsm.getState()).toBe('Defeat');
      fsm.revive(9999);
      expect(fsm.getWallHp()).toBe(1000);
    });
  });

  // =========================================================================
  // Section 2: Enemy Archetypes & Shield Guard 40% Frontal Physical DR
  // =========================================================================
  describe('2. Enemy Archetypes & Damage Mitigation Adversarial Challenges', () => {

    it('ADV-ENEMY-01: Shield Guard 40% Frontal Physical DR vs Flanking / Non-Physical', () => {
      const shieldGuard = EnemyFactory.createHeavy({ maxHp: 1000, currentHp: 1000 });
      expect(shieldGuard.frontalDr).toBe(0.40);

      // 1. Frontal physical: 40% DR -> 100 * (1 - 0.40) = 60 deducted
      const resFrontal = EnemyEntityLogic.applyDamage(shieldGuard, 100, true);
      expect(resFrontal.actualDeducted).toBe(60);
      expect(shieldGuard.currentHp).toBe(940);

      // 2. Flanking physical (isFrontalPhysical = false): 0% DR -> 100 full damage
      const resFlanking = EnemyEntityLogic.applyDamage(shieldGuard, 100, false);
      expect(resFlanking.actualDeducted).toBe(100);
      expect(shieldGuard.currentHp).toBe(840);

      // 3. Fractional / boundary values: 33 damage frontal -> 33 * 0.60 = 19.8
      const resFractional = EnemyEntityLogic.applyDamage(shieldGuard, 33, true);
      expect(resFractional.actualDeducted).toBeCloseTo(19.8, 4);
      expect(shieldGuard.currentHp).toBeCloseTo(840 - 19.8, 4);
    });

    it('ADV-ENEMY-02: Shield Guard Shield buffer absorbs mitigated frontal damage first', () => {
      const shieldGuard = EnemyFactory.createHeavy({
        maxHp: 1000,
        currentHp: 1000,
        shield: 50
      });

      // 100 frontal physical damage -> reduced by 40% to 60.
      // Shield has 50: absorbs 50 -> shield = 0, remaining 10 damage hits HP!
      const res = EnemyEntityLogic.applyDamage(shieldGuard, 100, true);
      expect(shieldGuard.shield).toBe(0);
      expect(res.actualDeducted).toBe(10);
      expect(shieldGuard.currentHp).toBe(990);
    });

    it('ADV-ENEMY-03: Iron Pagoda 60% Frontal Physical DR vs unmitigated archetypes', () => {
      const ironPagoda = EnemyFactory.create('iron_pagoda', { maxHp: 1000, currentHp: 1000 });
      expect(ironPagoda.frontalDr).toBe(0.60);

      // Frontal damage on Iron Pagoda: 60% DR -> 100 * 0.40 = 40
      const resPagoda = EnemyEntityLogic.applyDamage(ironPagoda, 100, true);
      expect(resPagoda.actualDeducted).toBe(40);
      expect(ironPagoda.currentHp).toBe(960);

      // Ordinary, charging, and boss have undefined frontalDr -> 0% DR even if isFrontalPhysical = true
      const ordinary = EnemyFactory.createOrdinary({ maxHp: 100, currentHp: 100 });
      const warDog = EnemyFactory.createCharging({ maxHp: 100, currentHp: 100 });
      const boss = EnemyFactory.createBoss({ maxHp: 1000, currentHp: 1000 });

      expect(EnemyEntityLogic.applyDamage(ordinary, 50, true).actualDeducted).toBe(50);
      expect(EnemyEntityLogic.applyDamage(warDog, 50, true).actualDeducted).toBe(50);
      expect(EnemyEntityLogic.applyDamage(boss, 200, true).actualDeducted).toBe(200);
    });

    it('ADV-ENEMY-04: Boss Bear Enrage trigger threshold, speed boost (1.80x), and idempotency', () => {
      const boss = EnemyFactory.createBoss({
        maxHp: 10000,
        currentHp: 10000,
        moveSpeed: 0.7
      });

      // Damage taking Boss to 50.01% HP (5001 HP remaining) -> NO enrage
      const res1 = EnemyEntityLogic.applyDamage(boss, 4999, false);
      expect(boss.currentHp).toBe(5001);
      expect(boss.isEnraged).toBe(false);
      expect(res1.isEnragedTriggered).toBe(false);
      expect(boss.moveSpeed).toBe(0.7);

      // Damage taking Boss to exactly 50.00% HP (5000 HP remaining) -> ENRAGE TRIGGERS!
      const res2 = EnemyEntityLogic.applyDamage(boss, 1, false);
      expect(boss.currentHp).toBe(5000);
      expect(boss.isEnraged).toBe(true);
      expect(res2.isEnragedTriggered).toBe(true);
      expect(boss.moveSpeed).toBeCloseTo(0.7 * 1.80, 4); // 1.26 m/s

      // Further damage while enraged -> isEnraged remains true, but does NOT boost speed again!
      const enragedSpeed = boss.moveSpeed;
      const res3 = EnemyEntityLogic.applyDamage(boss, 2000, false);
      expect(boss.currentHp).toBe(3000);
      expect(boss.isEnraged).toBe(true);
      expect(res3.isEnragedTriggered).toBe(false); // Already enraged!
      expect(boss.moveSpeed).toBe(enragedSpeed); // Speed not multiplied a second time!
    });

    it('ADV-ENEMY-05: Suicide Bomber self-destruction, wall damage, and neutralization under CC or death', () => {
      // 1. Normal contact: deals 150 wall damage and self-destructs
      const bomber = EnemyFactory.create('bomb_carrier', {
        distanceToWall: 0.05,
        y: DEFAULT_WALL_Y + 0.05 * PIXELS_PER_METER
      });

      const resContact = EnemyEntityLogic.updateMovement(bomber, 0.5, 1.0, DEFAULT_WALL_Y);
      expect(resContact.reachedWall).toBe(true);
      expect(resContact.isSuicide).toBe(true);
      expect(resContact.dealtWallDamage).toBe(150);
      expect(bomber.currentHp).toBe(0); // Self-eliminated!

      // Subsequent tick on exploded bomber: no further damage!
      const resSubsequent = EnemyEntityLogic.updateMovement(bomber, 0.5, 1.5, DEFAULT_WALL_Y);
      expect(resSubsequent.reachedWall).toBe(false);
      expect(resSubsequent.dealtWallDamage).toBe(0);

      // 2. Pre-mortem neutralization: bomber killed before reaching wall
      const neutralizedBomber = EnemyFactory.create('bomb_carrier', {
        distanceToWall: 5.0,
        y: DEFAULT_WALL_Y + 5.0 * PIXELS_PER_METER
      });
      neutralizedBomber.currentHp = 0; // Killed by arrow volleys

      const resDead = EnemyEntityLogic.updateMovement(neutralizedBomber, 1.0, 2.0, DEFAULT_WALL_Y);
      expect(resDead.reachedWall).toBe(false);
      expect(resDead.dealtWallDamage).toBe(0);
      expect(resDead.isSuicide).toBe(false);

      // 3. Frozen bomber at wall: frozen prevents damage trigger
      const frozenBomber = EnemyFactory.create('bomb_carrier', {
        distanceToWall: 0,
        y: DEFAULT_WALL_Y
      });
      frozenBomber.isFrozen = true;

      const resFrozen = EnemyEntityLogic.updateMovement(frozenBomber, 1.0, 3.0, DEFAULT_WALL_Y);
      expect(resFrozen.dealtWallDamage).toBe(0);
      expect(frozenBomber.currentHp).toBe(60); // Still alive!
    });

    it('ADV-ENEMY-06: Overkill damage and dead entity protection', () => {
      const enemy = EnemyFactory.createOrdinary({ maxHp: 50, currentHp: 50 });

      // Deal 500 damage to 50 HP enemy
      const res = EnemyEntityLogic.applyDamage(enemy, 500);
      expect(res.actualDeducted).toBe(50);
      expect(res.isDead).toBe(true);
      expect(enemy.currentHp).toBe(0);

      // Calling applyDamage on already dead enemy
      const resOverkill = EnemyEntityLogic.applyDamage(enemy, 100);
      expect(resOverkill.actualDeducted).toBe(0);
      expect(resOverkill.isDead).toBe(true);
    });
  });

  // =========================================================================
  // Section 3: CCDecayEngine Mathematical Rigor & Tenacity Window
  // =========================================================================
  describe('3. CCDecayEngine Mathematical Rigor & Tenacity Window Adversarial Challenges', () => {

    it('ADV-CC-01: Full k=0..10 decay curve on ordinary enemy and boss strictly floored at 0.20s', () => {
      const baseDuration = 2.0;

      // Mathematical ground truth:
      // Ordinary: max(0.20, 2.0 * 0.70^k)
      // Boss: max(0.20, 1.0 * 0.70^k)
      const expectedOrdinary = [
        2.0,                           // k=0: 2.0
        1.40,                          // k=1: 2.0 * 0.70
        0.98,                          // k=2: 2.0 * 0.49
        0.686,                         // k=3: 2.0 * 0.343
        0.4802,                        // k=4: 2.0 * 0.2401
        0.33614,                       // k=5: 2.0 * 0.16807
        0.235298,                      // k=6: 2.0 * 0.117649
        0.20,                          // k=7: 2.0 * 0.0823543 = 0.1647 -> floored to 0.20
        0.20,                          // k=8: floored to 0.20
        0.20,                          // k=9: floored to 0.20
        0.20                           // k=10: floored to 0.20
      ];

      const expectedBoss = [
        1.0,                           // k=0: 1.0
        0.70,                          // k=1: 1.0 * 0.70
        0.49,                          // k=2: 1.0 * 0.49
        0.343,                         // k=3: 1.0 * 0.343
        0.2401,                        // k=4: 1.0 * 0.2401
        0.20,                          // k=5: 1.0 * 0.16807 = 0.168 -> floored to 0.20
        0.20,                          // k=6: floored
        0.20,                          // k=7: floored
        0.20,                          // k=8: floored
        0.20,                          // k=9: floored
        0.20                           // k=10: floored
      ];

      for (let k = 0; k <= 10; k++) {
        const ordDuration = CCDecayEngine.calculateCCDuration(baseDuration, k, false);
        const bossDuration = CCDecayEngine.calculateCCDuration(baseDuration, k, true);

        expect(ordDuration, `Ordinary k=${k} mismatch`).toBeCloseTo(expectedOrdinary[k], 4);
        expect(bossDuration, `Boss k=${k} mismatch`).toBeCloseTo(expectedBoss[k], 4);

        // Floor redline: strictly >= 0.20
        expect(ordDuration).toBeGreaterThanOrEqual(0.20);
        expect(bossDuration).toBeGreaterThanOrEqual(0.20);
      }
    });

    it('ADV-CC-02: Edge cases in duration calculation: zero, negative, small base, and negative k', () => {
      // 0 or negative baseDuration returns 0.0 (never floors to 0.20!)
      expect(CCDecayEngine.calculateCCDuration(0, 0, false)).toBe(0.0);
      expect(CCDecayEngine.calculateCCDuration(-1.5, 0, false)).toBe(0.0);

      // Base duration already smaller than floor (e.g. 0.10s) -> floored up to 0.20s
      expect(CCDecayEngine.calculateCCDuration(0.10, 0, false)).toBe(0.20);

      // Negative k behaves as k=0
      expect(CCDecayEngine.calculateCCDuration(2.0, -5, false)).toBe(2.0);
    });

    it('ADV-CC-03: 1.5s post-CC Tenacity window millisecond boundary precision', () => {
      const target = EnemyFactory.createOrdinary();

      // CC expires at t = 10.000s -> tenacity window lasts until t = 11.500s
      CCDecayEngine.onCCExpired(target, 10.000, 1.5);
      expect(target.isTenacious).toBe(true);
      expect(target.tenacityTimer).toBe(11.500);

      // Boundary tests:
      // t = 10.001s: inside window -> REJECT
      expect(CCDecayEngine.canApplyCC(target, 10.001)).toBe(false);

      // t = 11.000s: inside window -> REJECT
      expect(CCDecayEngine.canApplyCC(target, 11.000)).toBe(false);

      // t = 11.499s: 1ms before window closes -> REJECT
      expect(CCDecayEngine.canApplyCC(target, 11.499)).toBe(false);

      // t = 11.500s: exactly at boundary -> ACCEPT
      expect(CCDecayEngine.canApplyCC(target, 11.500)).toBe(true);

      // t = 11.501s: after window -> ACCEPT
      expect(CCDecayEngine.canApplyCC(target, 11.501)).toBe(true);

      // Periodic tick: updateTenacity clears flags at t >= 11.500
      CCDecayEngine.updateTenacity(target, 11.500);
      expect(target.isTenacious).toBe(false);
      expect(target.tenacityTimer).toBeUndefined();
    });

    it('ADV-CC-04: Rejected CC attempts preserve ccCount immutability', () => {
      const target = EnemyFactory.createOrdinary();

      // First CC: success -> ccCount becomes 1
      const res1 = CCDecayEngine.applyCC(target, 2.0, 1.0);
      expect(res1.success).toBe(true);
      expect(target.ccCount).toBe(1);

      // CC expires at t = 3.0 -> tenacity active until 4.5
      CCDecayEngine.onCCExpired(target, 3.0);

      // 5 repeated attempts during tenacity window: ALL FAIL and ccCount remains 1!
      for (let t = 3.1; t < 4.5; t += 0.2) {
        const resFailed = CCDecayEngine.applyCC(target, 2.0, t);
        expect(resFailed.success).toBe(false);
        expect(resFailed.reason).toBe('TENACIOUS_IMMUNITY');
        expect(target.ccCount).toBe(1); // IMMUTABLE
      }

      // After window at t = 4.6: succeeds and increments ccCount to 2
      const res2 = CCDecayEngine.applyCC(target, 2.0, 4.6);
      expect(res2.success).toBe(true);
      expect(target.ccCount).toBe(2);
      expect(res2.appliedDuration).toBeCloseTo(1.40, 2);
    });

    it('ADV-CC-05: Boss hard stun cap (3 stuns max) vs ordinary unit uncapped stuns', () => {
      const boss = EnemyFactory.createBoss({ isBoss: true });
      const ordinary = EnemyFactory.createOrdinary({ isBoss: false });

      // Apply 3 stuns to both
      for (let i = 0; i < 3; i++) {
        const time = 10.0 + i * 5;
        const resBoss = CCDecayEngine.applyCC(boss, 2.0, time, { isStun: true, maxBossStuns: 3 });
        const resOrd = CCDecayEngine.applyCC(ordinary, 2.0, time, { isStun: true, maxBossStuns: 3 });

        expect(resBoss.success).toBe(true);
        expect(resOrd.success).toBe(true);

        CCDecayEngine.onCCExpired(boss, time + 1.0);
        CCDecayEngine.onCCExpired(ordinary, time + 1.0);
      }

      expect(boss.ccCount).toBe(3);
      expect(ordinary.ccCount).toBe(3);

      // 4th stun attempt at t = 30.0s:
      // Boss: STRICTLY REJECTED with BOSS_STUN_LIMIT_EXCEEDED
      const resBoss4 = CCDecayEngine.applyCC(boss, 2.0, 30.0, { isStun: true, maxBossStuns: 3 });
      expect(resBoss4.success).toBe(false);
      expect(resBoss4.reason).toBe('BOSS_STUN_LIMIT_EXCEEDED');
      expect(boss.ccCount).toBe(3); // Preserved at 3

      // Ordinary unit: PERMITTED!
      const resOrd4 = CCDecayEngine.applyCC(ordinary, 2.0, 30.0, { isStun: true, maxBossStuns: 3 });
      expect(resOrd4.success).toBe(true);
      expect(ordinary.ccCount).toBe(4);
    });

    it('ADV-CC-06: Dead target rejects CC immediately with TARGET_DEAD', () => {
      const deadTarget = EnemyFactory.createOrdinary({ maxHp: 50, currentHp: 0 });

      const res = CCDecayEngine.applyCC(deadTarget, 2.0, 1.0);
      expect(res.success).toBe(false);
      expect(res.reason).toBe('TARGET_DEAD');
      expect(res.appliedDuration).toBe(0);
    });

    it('ADV-CC-07: resetCCState completely restores entity CC readiness', () => {
      const target = EnemyFactory.createBoss({ isBoss: true });
      target.ccCount = 5;
      target.isTenacious = true;
      target.tenacityTimer = 999;
      target.isFrozen = true;
      target.isParalyzed = true;

      CCDecayEngine.resetCCState(target);
      expect(target.ccCount).toBe(0);
      expect(target.isTenacious).toBe(false);
      expect(target.tenacityTimer).toBeUndefined();
      expect(target.isFrozen).toBe(false);
      expect(target.isParalyzed).toBe(false);
    });
  });

});
