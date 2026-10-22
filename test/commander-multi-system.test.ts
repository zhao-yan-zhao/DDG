/**
 * 《孤城神机营》- Four Grand Commanders Multi-System Unit Tests
 * 
 * Tests the domain model, state machine, passive aura bonuses, ultimate abilities,
 * barrier absorption, reflect calculations, duration ticking, and profile storage integration
 * for the Four Grand Commanders:
 * - 王守仁 (Wang Shouren): Fire weapon ATK bonus, CD reduction, all-weapon CD reset, +150% reload speed
 * - 禽滑厘 (Qin Huali): Mohist range bonus, fortress HP bonus, 2000 HP barrier, 100% melee reflect
 * - 秦良玉 (Qin Liangyu): Fortress reflect bonus, enemy ASPD reduction, 8 cavalry charge with knockback
 * - 刘伯温 (Liu Bowen): Qimen aura range bonus, reaction DMG bonus, 9-strike thunder shock
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Commander } from '../src/core/commander/commander';
import {
  COMMANDERS_CONFIG,
  ALL_COMMANDERS,
  getCommanderConfig
} from '../src/config/commanders.config';
import {
  CommanderId,
  VALID_COMMANDER_IDS,
  isValidCommanderId
} from '../src/core/types';
import {
  ProfileStorage,
  createDefaultProfile,
  sanitizeProfile
} from '../src/core/meta/profile-storage';
import { WebPlatform } from '../src/bridge/web-platform';

describe('Four Grand Commanders Multi-System Suite', () => {
  // =========================================================================
  // 1. Config & Registry Verification
  // =========================================================================
  describe('1. Configuration & ID Verification', () => {
    it('verifies all 4 commanders exist in COMMANDERS_CONFIG with correct affinities', () => {
      expect(VALID_COMMANDER_IDS).toEqual([
        'wang_shouren',
        'qin_huali',
        'qin_liangyu',
        'liu_bowen'
      ]);
      expect(ALL_COMMANDERS.length).toBe(4);

      expect(COMMANDERS_CONFIG.wang_shouren.name).toBe('王守仁');
      expect(COMMANDERS_CONFIG.wang_shouren.factionAffinity).toBe('fire');

      expect(COMMANDERS_CONFIG.qin_huali.name).toBe('禽滑厘');
      expect(COMMANDERS_CONFIG.qin_huali.factionAffinity).toBe('mohist');

      expect(COMMANDERS_CONFIG.qin_liangyu.name).toBe('秦良玉');
      expect(COMMANDERS_CONFIG.qin_liangyu.factionAffinity).toBe('fortress');

      expect(COMMANDERS_CONFIG.liu_bowen.name).toBe('刘伯温');
      expect(COMMANDERS_CONFIG.liu_bowen.factionAffinity).toBe('qimen');
    });

    it('fallback mechanism returns Wang Shouren on unknown commander IDs', () => {
      const fallbackConfig = getCommanderConfig('non_existent_id');
      expect(fallbackConfig.id).toBe('wang_shouren');

      const cmd = new Commander('invalid_id');
      expect(cmd.config.id).toBe('wang_shouren');
      expect(cmd.config.name).toBe('王守仁');
    });

    it('validates commander IDs using isValidCommanderId helper', () => {
      expect(isValidCommanderId('wang_shouren')).toBe(true);
      expect(isValidCommanderId('qin_huali')).toBe(true);
      expect(isValidCommanderId('qin_liangyu')).toBe(true);
      expect(isValidCommanderId('liu_bowen')).toBe(true);

      expect(isValidCommanderId('zhuge_liang')).toBe(false);
      expect(isValidCommanderId('')).toBe(false);
      expect(isValidCommanderId(null)).toBe(false);
      expect(isValidCommanderId(undefined)).toBe(false);
      expect(isValidCommanderId(123)).toBe(false);
    });
  });

  // =========================================================================
  // 2. Passive Bonus Calculations
  // =========================================================================
  describe('2. Passive Aura Bonus Getters', () => {
    it('Wang Shouren: provides +20% fire ATK bonus and -0.1s explosion CD reduction', () => {
      const wang = new Commander('wang_shouren');

      expect(wang.getFireAtkBonus()).toBe(0.20);
      expect(wang.getExplosionCdReduction()).toBe(0.1);

      // Verify no cross-contamination from other commanders
      expect(wang.getMohistRangeBonus()).toBe(0);
      expect(wang.getFortressHpBonus()).toBe(0);
      expect(wang.getFortressReflectBonus()).toBe(0);
      expect(wang.getEnemyAtkSpeedReductionNearWall()).toBe(0);
      expect(wang.getQimenAuraRangeBonus()).toBe(0);
      expect(wang.getReactionDmgBonus()).toBe(0);
    });

    it('Qin Huali: provides +15% Mohist range bonus and +30% fortress HP bonus', () => {
      const qin = new Commander('qin_huali');

      expect(qin.getMohistRangeBonus()).toBe(0.15);
      expect(qin.getFortressHpBonus()).toBe(0.30);

      expect(qin.getFireAtkBonus()).toBe(0);
      expect(qin.getExplosionCdReduction()).toBe(0);
      expect(qin.getFortressReflectBonus()).toBe(0);
      expect(qin.getEnemyAtkSpeedReductionNearWall()).toBe(0);
      expect(qin.getQimenAuraRangeBonus()).toBe(0);
      expect(qin.getReactionDmgBonus()).toBe(0);
    });

    it('Qin Liangyu: provides +50% fortress reflect bonus and -20% near-wall enemy ASPD', () => {
      const qin = new Commander('qin_liangyu');

      expect(qin.getFortressReflectBonus()).toBe(0.50);
      expect(qin.getEnemyAtkSpeedReductionNearWall()).toBe(0.20);

      expect(qin.getFireAtkBonus()).toBe(0);
      expect(qin.getExplosionCdReduction()).toBe(0);
      expect(qin.getMohistRangeBonus()).toBe(0);
      expect(qin.getFortressHpBonus()).toBe(0);
      expect(qin.getQimenAuraRangeBonus()).toBe(0);
      expect(qin.getReactionDmgBonus()).toBe(0);
    });

    it('Liu Bowen: provides +1 Qimen aura range bonus and +30% elemental reaction DMG bonus', () => {
      const liu = new Commander('liu_bowen');

      expect(liu.getQimenAuraRangeBonus()).toBe(1);
      expect(liu.getReactionDmgBonus()).toBe(0.30);

      expect(liu.getFireAtkBonus()).toBe(0);
      expect(liu.getExplosionCdReduction()).toBe(0);
      expect(liu.getMohistRangeBonus()).toBe(0);
      expect(liu.getFortressHpBonus()).toBe(0);
      expect(liu.getFortressReflectBonus()).toBe(0);
      expect(liu.getEnemyAtkSpeedReductionNearWall()).toBe(0);
    });
  });

  // =========================================================================
  // 3. Ultimate Ability Casting & State Machine
  // =========================================================================
  describe('3. Ultimate Ability Resolution & Parameters', () => {
    it('Wang Shouren: triggers 5.0s ultimate, resets cooldowns, and grants +150% reload speed', () => {
      const wang = new Commander('wang_shouren');

      expect(wang.canCastUltimate()).toBe(false);
      const fail = wang.castUltimate();
      expect(fail.success).toBe(false);
      expect(fail.reason).toBe('NOT_ENOUGH_RAGE');

      wang.setRage(100);
      expect(wang.canCastUltimate()).toBe(true);

      const res = wang.castUltimate();
      expect(res.success).toBe(true);
      expect(wang.rage).toBe(0);
      expect(wang.isUltimateActive).toBe(true);
      expect(wang.ultimateRemainingDuration).toBe(5.0);

      expect(res.resetAllWeaponCooldowns).toBe(true);
      expect(res.reloadSpeedBonus).toBe(1.50);
      expect(res.activeDuration).toBe(5.0);
      expect(wang.getReloadSpeedBonus()).toBe(1.50);

      // Advance time by 5.0s
      wang.update(5.0);
      expect(wang.isUltimateActive).toBe(false);
      expect(wang.ultimateRemainingDuration).toBe(0);
      expect(wang.getReloadSpeedBonus()).toBe(0);
    });

    it('Qin Huali: deploys 6.0s iron barrier with 2000 HP and 100% melee damage reflection', () => {
      const qin = new Commander('qin_huali');
      qin.setRage(100);

      const res = qin.castUltimate();
      expect(res.success).toBe(true);
      expect(qin.rage).toBe(0);
      expect(qin.isUltimateActive).toBe(true);
      expect(qin.ultimateRemainingDuration).toBe(6.0);
      expect(qin.barrierHp).toBe(2000);
      expect(res.barrierHp).toBe(2000);
      expect(res.reflectMeleeRatio).toBe(1.00);

      // Barrier damage absorption sequence
      // Absorption 1: 500 damage
      const abs1 = qin.absorbBarrierDamage(500);
      expect(abs1.absorbed).toBe(500);
      expect(abs1.remainingDamage).toBe(0);
      expect(qin.barrierHp).toBe(1500);

      // Absorption 2: 1200 damage
      const abs2 = qin.absorbBarrierDamage(1200);
      expect(abs2.absorbed).toBe(1200);
      expect(abs2.remainingDamage).toBe(0);
      expect(qin.barrierHp).toBe(300);

      // Absorption 3: 500 damage (exceeds remaining 300 HP)
      const abs3 = qin.absorbBarrierDamage(500);
      expect(abs3.absorbed).toBe(300);
      expect(abs3.remainingDamage).toBe(200);
      expect(qin.barrierHp).toBe(0);

      // Absorption 4: Further damage after barrier is exhausted
      const abs4 = qin.absorbBarrierDamage(400);
      expect(abs4.absorbed).toBe(0);
      expect(abs4.remainingDamage).toBe(400);

      // Melee reflection while ultimate is active
      const reflected = qin.calculateReflectDamage(350);
      expect(reflected).toBe(350); // 100% reflect

      // Expire duration
      qin.update(6.0);
      expect(qin.isUltimateActive).toBe(false);
      expect(qin.calculateReflectDamage(350)).toBe(0);
    });

    it('Qin Liangyu: casts instant cavalry charge (500 dmg, 8 cavalry, 3.0m knockback) and passive reflect', () => {
      const qin = new Commander('qin_liangyu');
      qin.setRage(100);

      const res = qin.castUltimate();
      expect(res.success).toBe(true);
      expect(qin.rage).toBe(0);
      // Instant cast does not enter lingering duration
      expect(qin.isUltimateActive).toBe(false);
      expect(qin.ultimateRemainingDuration).toBe(0);

      expect(res.damage).toBe(500);
      expect(res.cavalryCount).toBe(8);
      expect(res.knockbackDistance).toBe(3.0);
      expect(res.activeDuration).toBe(0);

      // Passive melee reflect calculation (+50% from fortressReflectBonus)
      expect(qin.calculateReflectDamage(200)).toBe(100);
      expect(qin.calculateReflectDamage(0)).toBe(0);
      expect(qin.calculateReflectDamage(-50)).toBe(0);
    });

    it('Liu Bowen: casts instant Tianlei Jiulie (300 dmg, 9 lightning strikes, inflicts shock)', () => {
      const liu = new Commander('liu_bowen');
      liu.setRage(100);

      const res = liu.castUltimate();
      expect(res.success).toBe(true);
      expect(liu.rage).toBe(0);
      expect(liu.isUltimateActive).toBe(false);
      expect(liu.ultimateRemainingDuration).toBe(0);

      expect(res.damage).toBe(300);
      expect(res.lightningStrikes).toBe(9);
      expect(res.inflictsShock).toBe(true);
      expect(res.activeDuration).toBe(0);
    });
  });

  // =========================================================================
  // 4. Duration Ticking, Expiration & State Safety
  // =========================================================================
  describe('4. Duration Ticking & State Machine Transitions', () => {
    it('update(dt) ticks duration down and cleanly resets isUltimateActive and barrierHp', () => {
      const cmd = new Commander('qin_huali');
      cmd.setRage(100);
      cmd.castUltimate();

      expect(cmd.isUltimateActive).toBe(true);
      expect(cmd.ultimateRemainingDuration).toBe(6.0);
      expect(cmd.barrierHp).toBe(2000);

      // Step 1: Advance by 2.5s
      cmd.update(2.5);
      expect(cmd.ultimateRemainingDuration).toBeCloseTo(3.5, 3);
      expect(cmd.isUltimateActive).toBe(true);

      // Step 2: Negative or zero dt does not alter state
      cmd.update(0);
      cmd.update(-1.0);
      expect(cmd.ultimateRemainingDuration).toBeCloseTo(3.5, 3);

      // Step 3: Advance past remaining duration
      cmd.update(4.0);
      expect(cmd.ultimateRemainingDuration).toBe(0);
      expect(cmd.isUltimateActive).toBe(false);
      expect(cmd.barrierHp).toBe(0);
    });

    it('tick(delta) legacy alias behaves identically to update(dt)', () => {
      const cmd = new Commander('wang_shouren');
      cmd.setRage(100);
      cmd.castUltimate();

      expect(cmd.isUltimateActive).toBe(true);
      cmd.tick(2.0);
      expect(cmd.ultimateRemainingDuration).toBeCloseTo(3.0, 3);

      cmd.tick(3.5);
      expect(cmd.ultimateRemainingDuration).toBe(0);
      expect(cmd.isUltimateActive).toBe(false);
    });

    it('getState() returns snapshot and reset() restores default state', () => {
      const cmd = new Commander('qin_huali');
      cmd.addRage(85);
      expect(cmd.rage).toBe(85);

      const state1 = cmd.getState();
      expect(state1.configId).toBe('qin_huali');
      expect(state1.rage).toBe(85);
      expect(state1.maxRage).toBe(100);
      expect(state1.isUltimateActive).toBe(false);

      cmd.setRage(100);
      cmd.castUltimate();
      const state2 = cmd.getState();
      expect(state2.isUltimateActive).toBe(true);
      expect(state2.barrierHp).toBe(2000);

      cmd.reset();
      expect(cmd.rage).toBe(0);
      expect(cmd.isUltimateActive).toBe(false);
      expect(cmd.ultimateRemainingDuration).toBe(0);
      expect(cmd.barrierHp).toBe(0);
    });

    it('strict rage bounds: handles negative and extreme rage inputs safely', () => {
      const cmd = new Commander('wang_shouren');
      cmd.addRage(-100);
      expect(cmd.rage).toBe(0);

      cmd.addRage(999);
      expect(cmd.rage).toBe(100);

      cmd.setRage(-50);
      expect(cmd.rage).toBe(0);

      cmd.setRage(500);
      expect(cmd.rage).toBe(100);
    });
  });

  // =========================================================================
  // 5. ProfileStorage Persistence & Sanitization
  // =========================================================================
  describe('5. ProfileStorage & Selected Commander Persistence', () => {
    let platform: WebPlatform;
    let storage: ProfileStorage;

    beforeEach(() => {
      platform = new WebPlatform();
      storage = new ProfileStorage(platform);
    });

    it('initializes default profile with Wang Shouren as selectedCommander', () => {
      const def = createDefaultProfile();
      expect(def.selectedCommander).toBe('wang_shouren');

      const loaded = storage.loadProfile();
      expect(loaded.selectedCommander).toBe('wang_shouren');
    });

    it('persists and loads each of the four valid commanders correctly', () => {
      const commanders: CommanderId[] = ['wang_shouren', 'qin_huali', 'qin_liangyu', 'liu_bowen'];

      for (const cmdId of commanders) {
        storage.modifyProfile((prof) => {
          prof.selectedCommander = cmdId;
        });

        const loaded = storage.loadProfile();
        expect(loaded.selectedCommander).toBe(cmdId);
      }
    });

    it('sanitizes invalid or malicious commander IDs safely back to wang_shouren', () => {
      const invalidCases = [
        'invalid_commander',
        'cao_cao',
        'zhuge_liang',
        '',
        '   ',
        null,
        undefined,
        12345,
        { custom: 'obj' },
        true
      ];

      for (const invalid of invalidCases) {
        const sanitized = sanitizeProfile({
          version: 1,
          selectedCommander: invalid
        });
        expect(sanitized.selectedCommander).toBe('wang_shouren');
      }
    });

    it('trims whitespace around valid commander IDs during sanitization', () => {
      const sanitized = sanitizeProfile({
        version: 1,
        selectedCommander: '   qin_liangyu   '
      });
      expect(sanitized.selectedCommander).toBe('qin_liangyu');
    });

    it('creates a battle-ready Commander instance directly from persisted profile', () => {
      storage.modifyProfile((p) => {
        p.selectedCommander = 'liu_bowen';
      });

      const profile = storage.loadProfile();
      const battleCommander = new Commander(profile.selectedCommander);

      expect(battleCommander.config.id).toBe('liu_bowen');
      expect(battleCommander.config.name).toBe('刘伯温');
      expect(battleCommander.getQimenAuraRangeBonus()).toBe(1);
      expect(battleCommander.getReactionDmgBonus()).toBe(0.30);
    });
  });
});
