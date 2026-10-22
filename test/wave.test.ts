/**
 * 《孤城神机营》- Milestone M4: Wave Combat System & Economy Test Suite
 * Validates:
 * 1. Wave Combat FSM: 5 sequential states, transitions, city wall model, defeat and victory conditions.
 * 2. Enemy Archetypes: Ordinary, Charging, Heavy, Boss, factory, movement, armor, shield, wall attack, suicide, and enrage.
 * 3. Wave Spawner: Timeline queues, lane dispersion, active registry, dead collection, and wave completion.
 * 4. CC Decay & Tenacity Engine: 0.70^k diminishing returns, 0.20s floor, 1.5s tenacity immunity, Boss stun limits.
 * 5. Economy & Wallet: Guaranteed stipends W1..W10+, base interest cap 5, TunTian cap 8, recycling rates, and transaction safety.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WaveFSM,
  InvalidStateTransitionError,
  WaveState,
  EnemyFactory,
  createEnemyEntity,
  EnemyEntityLogic,
  WaveSpawner,
  createChapter1WaveConfig,
  CCDecayEngine,
  EconomyEngine,
  PlayerWallet,
  WAVE_STIPENDS,
  DEFAULT_WALL_Y,
  DEFAULT_SPAWN_Y
} from '../src/core/types';

describe('Milestone M4: Wave Combat System & Economy Tests', () => {

  // ==========================================
  // Area 1: Wave Combat FSM & City Wall Model
  // ==========================================
  describe('Area 1: Wave Combat FSM & City Wall Model', () => {
    let fsm: WaveFSM;

    beforeEach(() => {
      fsm = new WaveFSM({
        initialWave: 1,
        maxWaves: 15,
        initialWallHp: 1000,
        maxWallHp: 1000,
        chapterId: 1
      });
    });

    it('TC-WAVE-FSM-01: Happy path 5-state sequential cycle', () => {
      expect(fsm.getState()).toBe('Prep');
      expect(fsm.getCurrentWave()).toBe(1);

      fsm.startWave();
      expect(fsm.getState()).toBe('WaveActive');

      fsm.onAllEnemiesDefeated();
      expect(fsm.getState()).toBe('WaveClear');

      fsm.openDecreeReward();
      expect(fsm.getState()).toBe('DecreeReward');

      fsm.onDecreePicked('T11');
      expect(fsm.getState()).toBe('Income');

      fsm.onIncomeCollected();
      expect(fsm.getState()).toBe('Prep');
      expect(fsm.getCurrentWave()).toBe(2);
    });

    it('TC-WAVE-FSM-02: Strict InvalidStateTransitionError on illegal transitions', () => {
      // Cannot jump from Prep to DecreeReward
      expect(() => fsm.transitionTo('DecreeReward')).toThrow(InvalidStateTransitionError);

      fsm.startWave(); // In WaveActive
      expect(() => fsm.startWave()).toThrow(InvalidStateTransitionError);
      expect(() => fsm.claimDecree()).toThrow(InvalidStateTransitionError);
      expect(() => fsm.finishIncome()).toThrow(InvalidStateTransitionError);
    });

    it('TC-WAVE-FSM-03: City wall damage, clamping, and repair logic', () => {
      const onWallDmg = vi.fn();
      fsm.onWallDamage = onWallDmg;

      expect(fsm.getWallHp()).toBe(1000);
      expect(fsm.getMaxWallHp()).toBe(1000);

      // Damage 300
      fsm.damageWall(300);
      expect(fsm.getWallHp()).toBe(700);
      expect(onWallDmg).toHaveBeenCalledWith(300, 700, 1000);

      // Negative or zero damage ignored
      fsm.damageWall(0);
      fsm.damageWall(-50);
      expect(fsm.getWallHp()).toBe(700);

      // Repair wall 200
      fsm.repairWall(200);
      expect(fsm.getWallHp()).toBe(900);

      // Repair cannot exceed maxWallHp
      fsm.repairWall(500);
      expect(fsm.getWallHp()).toBe(1000);

      // Set max wall HP with healDelta
      fsm.damageWall(200); // 800/1000
      fsm.setMaxWallHp(1400, true);
      expect(fsm.getMaxWallHp()).toBe(1400);
      expect(fsm.getWallHp()).toBe(1200);
    });

    it('TC-WAVE-FSM-04: Defeat condition triggers immediately when wallHp <= 0', () => {
      const onDefeat = vi.fn();
      fsm.onDefeat = onDefeat;

      fsm.startWave();
      expect(fsm.getState()).toBe('WaveActive');

      // Inflict fatal damage to wall
      fsm.damageWall(1500);
      expect(fsm.getWallHp()).toBe(0);
      expect(fsm.isWallBroken()).toBe(true);
      expect(fsm.getState()).toBe('Defeat');
      expect(onDefeat).toHaveBeenCalledWith(1);

      // Cannot transition out of Defeat normally
      expect(() => fsm.startWave()).toThrow(InvalidStateTransitionError);

      // Revive returns to Prep
      fsm.revive(500);
      expect(fsm.getState()).toBe('Prep');
      expect(fsm.getWallHp()).toBe(500);
      expect(fsm.isWallBroken()).toBe(false);
    });

    it('TC-WAVE-FSM-05: 15 waves campaign progression concluding in Victory', () => {
      const onVictory = vi.fn();
      fsm.onVictory = onVictory;

      for (let w = 1; w <= 14; w++) {
        expect(fsm.getCurrentWave()).toBe(w);
        fsm.startWave();
        fsm.completeBattle();
        fsm.openDecreeReward();
        fsm.claimDecree();
        fsm.finishIncome();
        expect(fsm.getState()).toBe('Prep');
      }

      // Wave 15 (Final wave)
      expect(fsm.getCurrentWave()).toBe(15);
      fsm.startWave();
      fsm.completeBattle();
      fsm.openDecreeReward();
      fsm.claimDecree();
      fsm.finishIncome();

      expect(fsm.getState()).toBe('Victory');
      expect(onVictory).toHaveBeenCalled();
    });
  });

  // ==========================================
  // Area 2: Enemy Archetypes & Entity Logic
  // ==========================================
  describe('Area 2: Enemy Archetypes & Entity Logic', () => {
    it('TC-WAVE-ENEMY-01: Four archetypes stat differentiation', () => {
      const lightInfantry = EnemyFactory.createOrdinary();
      const warDog = EnemyFactory.createCharging();
      const shieldGuard = EnemyFactory.createHeavy();
      const bossBear = EnemyFactory.createBoss();

      // Speeds: war_dog (1.6) > light_infantry (0.75) > shield_guard (0.5) > boss_bear (0.45)
      expect(warDog.moveSpeed).toBe(1.6);
      expect(lightInfantry.moveSpeed).toBe(0.75);
      expect(shieldGuard.moveSpeed).toBe(0.5);
      expect(bossBear.moveSpeed).toBe(0.45);
      expect(warDog.moveSpeed).toBeGreaterThan(lightInfantry.moveSpeed);

      // Armors: shield_guard (100) & boss_bear (150) > light_infantry (0)
      expect(shieldGuard.armor).toBe(100);
      expect(lightInfantry.armor).toBe(0);
      expect(shieldGuard.armor).toBeGreaterThan(lightInfantry.armor);

      // Boss attributes
      expect(bossBear.isBoss).toBe(true);
      expect(bossBear.maxHp).toBe(135000);
      expect(bossBear.currentHp).toBe(135000);
      expect(shieldGuard.frontalDr).toBe(0.40);
    });

    it('TC-WAVE-ENEMY-02: Additional archetypes (bomb_carrier, iron_pagoda, light_cavalry)', () => {
      const bomber = EnemyFactory.create('bomb_carrier');
      expect(bomber.isSuicide).toBe(true);
      expect(bomber.suicideDamage).toBe(150);

      const pagoda = EnemyFactory.create('iron_pagoda');
      expect(pagoda.armor).toBe(150);
      expect(pagoda.frontalDr).toBe(0.60);
      expect(pagoda.maxHp).toBe(2160);

      const cavalry = EnemyFactory.create('light_cavalry');
      expect(cavalry.moveSpeed).toBe(1.4);
    });

    it('TC-WAVE-ENEMY-03: Enemy movement toward wall and wall attack cadence', () => {
      const enemy = createEnemyEntity('light_infantry', {
        moveSpeed: 1.0,
        wallDamage: 10,
        attackInterval: 1.0,
        y: DEFAULT_SPAWN_Y // 1240
      });

      // Advance by 1 second -> moves 1.0m (68px)
      const res1 = EnemyEntityLogic.updateMovement(enemy, 1.0, 1.0, DEFAULT_WALL_Y);
      expect(res1.reachedWall).toBe(false);
      expect(res1.dealtWallDamage).toBe(0);
      expect(enemy.y).toBeCloseTo(DEFAULT_SPAWN_Y - 68, 1);

      // Transport to wall: distanceToWall = 0
      enemy.distanceToWall = 0;
      enemy.y = DEFAULT_WALL_Y;

      // First contact attack
      const res2 = EnemyEntityLogic.updateMovement(enemy, 0.1, 2.0, DEFAULT_WALL_Y);
      expect(res2.reachedWall).toBe(true);
      expect(res2.dealtWallDamage).toBe(10);

      // Subsequent tick within attackInterval (0.5s later) -> no attack yet
      const res3 = EnemyEntityLogic.updateMovement(enemy, 0.1, 2.5, DEFAULT_WALL_Y);
      expect(res3.reachedWall).toBe(true);
      expect(res3.dealtWallDamage).toBe(0);

      // Subsequent tick past attackInterval (1.0s later) -> attack triggers
      const res4 = EnemyEntityLogic.updateMovement(enemy, 0.1, 3.1, DEFAULT_WALL_Y);
      expect(res4.reachedWall).toBe(true);
      expect(res4.dealtWallDamage).toBe(10);
    });

    it('TC-WAVE-ENEMY-04: Suicide bomber explodes and destroys self upon wall contact', () => {
      const bomber = createEnemyEntity('bomb_carrier', {
        distanceToWall: 0.1,
        y: DEFAULT_WALL_Y + 7
      });

      // Move into wall
      const res = EnemyEntityLogic.updateMovement(bomber, 0.5, 1.0, DEFAULT_WALL_Y);
      expect(res.reachedWall).toBe(true);
      expect(res.isSuicide).toBe(true);
      expect(res.dealtWallDamage).toBe(150);
      expect(bomber.currentHp).toBe(0); // Suicide destroys entity
    });

    it('TC-WAVE-ENEMY-05: Shield guard 40% frontal physical mitigation vs true damage', () => {
      const shieldGuard = EnemyFactory.createHeavy({ maxHp: 500, currentHp: 500 });

      // 100 physical damage from front -> 40% reduced = 60 damage
      const resFront = EnemyEntityLogic.applyDamage(shieldGuard, 100, true);
      expect(resFront.actualDeducted).toBe(60);
      expect(shieldGuard.currentHp).toBe(440);

      // 100 non-physical or flanking damage -> full 100 damage
      const resNonFront = EnemyEntityLogic.applyDamage(shieldGuard, 100, false);
      expect(resNonFront.actualDeducted).toBe(100);
      expect(shieldGuard.currentHp).toBe(340);
    });

    it('TC-WAVE-ENEMY-06: Boss Bear Enrage triggers at <= 50% HP boosting speed by 1.80x', () => {
      const boss = EnemyFactory.createBoss({ maxHp: 10000, currentHp: 10000, moveSpeed: 0.7 });
      expect(boss.isEnraged).toBe(false);

      // Deal 4000 damage (60% HP remaining) -> no enrage
      EnemyEntityLogic.applyDamage(boss, 4000);
      expect(boss.currentHp).toBe(6000);
      expect(boss.isEnraged).toBe(false);
      expect(boss.moveSpeed).toBe(0.7);

      // Deal 1500 damage (45% HP remaining) -> enrage triggers
      const res = EnemyEntityLogic.applyDamage(boss, 1500);
      expect(boss.currentHp).toBe(4500);
      expect(boss.isEnraged).toBe(true);
      expect(res.isEnragedTriggered).toBe(true);
      expect(boss.moveSpeed).toBeCloseTo(0.7 * 1.80, 2); // 1.26 m/s
    });

    it('TC-WAVE-ENEMY-07: Movement halts when frozen or paralyzed', () => {
      const enemy = createEnemyEntity('war_dog', {
        moveSpeed: 2.8,
        y: 1000,
        distanceToWall: (1000 - 540) / 68
      });

      enemy.isFrozen = true;
      const initialDist = enemy.distanceToWall;
      EnemyEntityLogic.updateMovement(enemy, 1.0, 1.0, 540);
      expect(enemy.distanceToWall).toBe(initialDist); // Position unchanged
    });
  });

  // ==========================================
  // Area 3: Wave Spawner Timeline & Registry
  // ==========================================
  describe('Area 3: Wave Spawner Timeline & Registry', () => {
    let spawner: WaveSpawner;

    beforeEach(() => {
      spawner = new WaveSpawner();
    });

    it('TC-WAVE-SPAWN-01: Timeline batch queueing, intervals, and active registry', () => {
      const spawnLog: string[] = [];
      spawner.onEnemySpawn = (e) => spawnLog.push(e.typeId);

      spawner.startWave({
        chapterId: 1,
        waveIndex: 1,
        duration: 10,
        baseSalary: 35,
        batches: [
          { timeOffset: 0, enemyId: 'light_infantry', count: 3, spawnInterval: 0.5, xDistribution: 'CenterValley' },
          { timeOffset: 2.0, enemyId: 'war_dog', count: 2, spawnInterval: 1.0, xDistribution: 'LeftWing' }
        ]
      });

      expect(spawner.getActiveEnemyCount()).toBe(0);
      expect(spawner.isAllSpawned()).toBe(false);

      // Tick dt = 0.6s -> should spawn first 2 light_infantry (t=0, t=0.5)
      spawner.update(0.6);
      expect(spawner.getActiveEnemyCount()).toBe(2);
      expect(spawnLog).toEqual(['light_infantry', 'light_infantry']);

      // Tick dt = 0.5s (t = 1.1s) -> spawns 3rd light_infantry (t=1.0)
      spawner.update(0.5);
      expect(spawner.getActiveEnemyCount()).toBe(3);

      // Tick dt = 1.0s (t = 2.1s) -> spawns first war_dog (t=2.0)
      spawner.update(1.0);
      expect(spawner.getActiveEnemyCount()).toBe(4);
      expect(spawnLog).toContain('war_dog');

      // Tick dt = 1.0s (t = 3.1s) -> spawns 2nd war_dog (t=3.0)
      spawner.update(1.0);
      expect(spawner.getActiveEnemyCount()).toBe(5);
      expect(spawner.isAllSpawned()).toBe(true);
      expect(spawner.isWaveCompleted()).toBe(false); // Enemies still alive
    });

    it('TC-WAVE-SPAWN-02: Dead enemy collection and wave completion check', () => {
      spawner.startWave({
        chapterId: 1,
        waveIndex: 1,
        duration: 5,
        baseSalary: 35,
        batches: [
          { timeOffset: 0, enemyId: 'light_infantry', count: 2, spawnInterval: 0.1, xDistribution: 'RandomFull' }
        ]
      });

      spawner.update(1.0);
      expect(spawner.getActiveEnemyCount()).toBe(2);

      const enemies = spawner.getActiveEnemies();
      expect(enemies.length).toBe(2);

      // Kill first enemy
      spawner.recordKill(enemies[0].id);
      expect(spawner.getActiveEnemyCount()).toBe(1);
      expect(spawner.getTotalKilled()).toBe(1);
      expect(spawner.isWaveCompleted()).toBe(false);

      // Kill second enemy via damage in update
      enemies[1].currentHp = 0;
      spawner.update(0.1);
      expect(spawner.getActiveEnemyCount()).toBe(0);
      expect(spawner.getTotalKilled()).toBe(2);
      expect(spawner.isWaveCompleted()).toBe(true);
    });

    it('TC-WAVE-SPAWN-03: Chapter 1 preset wave generator produces valid configs', () => {
      const w1 = createChapter1WaveConfig(1);
      expect(w1.waveIndex).toBe(1);
      expect(w1.baseSalary).toBe(45);
      expect(w1.batches[0].count).toBe(12);

      const w2 = createChapter1WaveConfig(2);
      expect(w2.waveIndex).toBe(2);
      expect(w2.baseSalary).toBe(50);
      expect(w2.batches.some(b => b.enemyId === 'war_dog')).toBe(true);

      const w10 = createChapter1WaveConfig(10);
      expect(w10.waveIndex).toBe(10);
      expect(w10.baseSalary).toBe(150);
      expect(w10.batches[0].enemyId).toBe('boss_bear');
      expect(w10.batches[0].count).toBe(1);
    });
  });

  // ==========================================
  // Area 4: CC Decay & Tenacity Engine
  // ==========================================
  describe('Area 4: CC Decay & Tenacity Engine', () => {
    it('TC-WAVE-CC-01: Diminishing returns curve: Duration * 0.70^k >= 0.20s', () => {
      const baseDuration = 2.0;

      // Regular enemy
      expect(CCDecayEngine.calculateCCDuration(baseDuration, 0, false)).toBe(2.0);
      expect(CCDecayEngine.calculateCCDuration(baseDuration, 1, false)).toBeCloseTo(1.40, 2);
      expect(CCDecayEngine.calculateCCDuration(baseDuration, 2, false)).toBeCloseTo(0.98, 2);
      expect(CCDecayEngine.calculateCCDuration(baseDuration, 10, false)).toBe(0.20); // Clamped to floor

      // Boss enemy (50% natural tenacity)
      expect(CCDecayEngine.calculateCCDuration(baseDuration, 0, true)).toBe(1.00);
      expect(CCDecayEngine.calculateCCDuration(baseDuration, 1, true)).toBeCloseTo(0.70, 2);
      expect(CCDecayEngine.calculateCCDuration(baseDuration, 2, true)).toBeCloseTo(0.49, 2);
      expect(CCDecayEngine.calculateCCDuration(baseDuration, 5, true)).toBe(0.20); // Floored
    });

    it('TC-WAVE-CC-02: Tenacity window: 1.5s post-CC immunity period', () => {
      const target = createEnemyEntity('shield_guard');

      // Initially no tenacity -> can apply CC
      expect(CCDecayEngine.canApplyCC(target, 5.0)).toBe(true);

      // CC applied, then expires at t = 5.0 -> enters tenacity window until t = 6.5
      CCDecayEngine.onCCExpired(target, 5.0, 1.5);
      expect(target.isTenacious).toBe(true);
      expect(target.tenacityTimer).toBe(6.5);

      // At t = 6.0 (inside window) -> immune!
      expect(CCDecayEngine.canApplyCC(target, 6.0)).toBe(false);

      // At t = 6.5 (elapsed) -> immune ends
      expect(CCDecayEngine.canApplyCC(target, 6.5)).toBe(true);
      expect(CCDecayEngine.canApplyCC(target, 7.0)).toBe(true);
    });

    it('TC-WAVE-CC-03: applyCC validates tenacity, mutates ccCount, and rejects when immune', () => {
      const target = createEnemyEntity('light_infantry');

      // First CC application
      const res1 = CCDecayEngine.applyCC(target, 2.0, 1.0);
      expect(res1.success).toBe(true);
      expect(res1.appliedDuration).toBe(2.0);
      expect(target.ccCount).toBe(1);

      // Expiry puts into tenacity
      CCDecayEngine.onCCExpired(target, 3.0);

      // Second CC attempt during tenacity window fails
      const res2 = CCDecayEngine.applyCC(target, 2.0, 3.5);
      expect(res2.success).toBe(false);
      expect(res2.reason).toBe('TENACIOUS_IMMUNITY');
      expect(target.ccCount).toBe(1); // Not incremented

      // Third CC attempt after tenacity window succeeds with decayed duration
      const res3 = CCDecayEngine.applyCC(target, 2.0, 5.0);
      expect(res3.success).toBe(true);
      expect(res3.appliedDuration).toBeCloseTo(1.40, 2);
      expect(target.ccCount).toBe(2);
    });

    it('TC-WAVE-CC-04: Boss hard stun limit (3 stuns) is strictly enforced', () => {
      const boss = createEnemyEntity('boss_bear', { isBoss: true });

      // Apply 3 stuns
      for (let i = 0; i < 3; i++) {
        const res = CCDecayEngine.applyCC(boss, 2.0, 10.0 + i * 5, { isStun: true, maxBossStuns: 3 });
        expect(res.success).toBe(true);
        CCDecayEngine.onCCExpired(boss, 10.0 + i * 5 + 1.0);
      }
      expect(boss.ccCount).toBe(3);

      // 4th stun is rejected
      const res4 = CCDecayEngine.applyCC(boss, 2.0, 30.0, { isStun: true, maxBossStuns: 3 });
      expect(res4.success).toBe(false);
      expect(res4.reason).toBe('BOSS_STUN_LIMIT_EXCEEDED');
    });
  });

  // ==========================================
  // Area 5: Economy Engine & Player Wallet
  // ==========================================
  describe('Area 5: Economy Engine & Player Wallet', () => {
    it('TC-WAVE-ECON-01: Guaranteed stipends for W1 through W10+', () => {
      expect(EconomyEngine.calculateStipend(1)).toBe(35);
      expect(EconomyEngine.calculateStipend(2)).toBe(40);
      expect(EconomyEngine.calculateStipend(3)).toBe(45);
      expect(EconomyEngine.calculateStipend(4)).toBe(50);
      expect(EconomyEngine.calculateStipend(5)).toBe(55);
      expect(EconomyEngine.calculateStipend(6)).toBe(60);
      expect(EconomyEngine.calculateStipend(7)).toBe(65);
      expect(EconomyEngine.calculateStipend(8)).toBe(70);
      expect(EconomyEngine.calculateStipend(9)).toBe(80);
      expect(EconomyEngine.calculateStipend(10)).toBe(100);
      expect(EconomyEngine.calculateStipend(15)).toBe(100);
      expect(EconomyEngine.calculateStipend(-1)).toBe(35); // Safe clamp
    });

    it('TC-WAVE-ECON-02: Base interest vs TunTian interest caps', () => {
      // Base: min(floor(silver * 0.10), 5)
      expect(EconomyEngine.calculateInterest(0, false)).toBe(0);
      expect(EconomyEngine.calculateInterest(9, false)).toBe(0);
      expect(EconomyEngine.calculateInterest(10, false)).toBe(1);
      expect(EconomyEngine.calculateInterest(49, false)).toBe(4);
      expect(EconomyEngine.calculateInterest(50, false)).toBe(5);
      expect(EconomyEngine.calculateInterest(100, false)).toBe(5); // Capped at 5

      // TunTian: min(floor(silver * 0.20), 8)
      expect(EconomyEngine.calculateInterest(0, true)).toBe(0);
      expect(EconomyEngine.calculateInterest(9, true)).toBe(1);
      expect(EconomyEngine.calculateInterest(10, true)).toBe(2);
      expect(EconomyEngine.calculateInterest(39, true)).toBe(7);
      expect(EconomyEngine.calculateInterest(40, true)).toBe(8);
      expect(EconomyEngine.calculateInterest(100, true)).toBe(8); // Capped at 8
    });

    it('TC-WAVE-ECON-03: Weapon recycle refunds (75% standard, 100% JingBing)', () => {
      // 20 silver invested
      expect(EconomyEngine.calculateRecycleRefund(20, false)).toBe(15);
      expect(EconomyEngine.calculateRecycleRefund(20, true)).toBe(20);

      // 15 silver invested (floor(15 * 0.75) = floor(11.25) = 11)
      expect(EconomyEngine.calculateRecycleRefund(15, false)).toBe(11);
      expect(EconomyEngine.calculateRecycleRefund(15, true)).toBe(15);
    });

    it('TC-WAVE-ECON-04: PlayerWallet balance management, safety guards, and audit trail', () => {
      const wallet = new PlayerWallet(50);
      expect(wallet.getSilver()).toBe(50);

      // Spend valid amount
      expect(wallet.canAfford(20)).toBe(true);
      expect(wallet.spend(20, 'Buy Weapon')).toBe(true);
      expect(wallet.getSilver()).toBe(30);

      // Spend exceeding balance fails atomically
      expect(wallet.canAfford(40)).toBe(false);
      expect(wallet.spend(40, 'Too expensive')).toBe(false);
      expect(wallet.getSilver()).toBe(30); // Preserved!

      // Negative spend fails
      expect(wallet.spend(-10)).toBe(false);
      expect(wallet.getSilver()).toBe(30);

      // Earn silver
      wallet.earn(15, 'Enemy drop');
      expect(wallet.getSilver()).toBe(45);

      // Settle wave income for Wave 1: stipend 35, interest floor(45 * 0.1) = 4, total +39
      const incomeRes = wallet.settleWaveIncome(1, false);
      expect(incomeRes.stipend).toBe(35);
      expect(incomeRes.interest).toBe(4);
      expect(incomeRes.totalIncome).toBe(39);
      expect(wallet.getSilver()).toBe(84);

      // Recycle weapon
      const refund = wallet.recycleWeapon(20, false);
      expect(refund).toBe(15);
      expect(wallet.getSilver()).toBe(99);

      // Audit history verification
      const history = wallet.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(5);
      expect(history.some(h => h.type === 'SPEND')).toBe(true);
      expect(history.some(h => h.type === 'EARN')).toBe(true);
      expect(history.some(h => h.type === 'STIPEND')).toBe(true);
      expect(history.some(h => h.type === 'INTEREST')).toBe(true);
      expect(history.some(h => h.type === 'RECYCLE')).toBe(true);
    });
  });

});
