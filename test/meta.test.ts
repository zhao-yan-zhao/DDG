/**
 * 《孤城神机营》- Meta Progression & Storage Unit Tests
 * Verification of ArmoryManager, TechTreeManager, and ProfileStorage.
 * Pure headless domain tests (Zero DOM / Zero Phaser dependencies).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ArmoryManager,
  MIN_ARMORY_LEVEL,
  MAX_ARMORY_LEVEL,
  STAR_3_UNLOCK_LEVEL,
  STAR_4_UNLOCK_LEVEL,
  ALL_WEAPON_CONFIG_IDS
} from '../src/core/meta/armory-manager';
import {
  TechTreeManager,
  MIN_TECH_LEVEL,
  MAX_TECH_LEVEL,
  TECH_BRANCHES
} from '../src/core/meta/tech-tree-manager';
import {
  ProfileStorage,
  createDefaultProfile,
  sanitizeProfile,
  PROFILE_STORAGE_KEY,
  CURRENT_PROFILE_VERSION
} from '../src/core/meta/profile-storage';
import { PlayerProfile } from '../src/core/meta/types';
import { WebPlatform } from '../src/platform/web-platform';

describe('Milestone GL-1: Meta Progression & Storage Tests', () => {
  let mockPlatform: WebPlatform;
  let storage: ProfileStorage;
  let profile: PlayerProfile;

  beforeEach(() => {
    mockPlatform = new WebPlatform();
    storage = new ProfileStorage(mockPlatform, 'test_profile_key');
    profile = createDefaultProfile();
  });

  // =========================================================================
  // 1. ArmoryManager Tests (TC-ARM-01..06)
  // =========================================================================
  describe('ArmoryManager (神机造办处)', () => {
    it('TC-ARM-01: Correctly calculates single level upgrade costs for L=1..19 and returns null for L>=20 or L<1', () => {
      // L=1 -> 100 gold, 1 blueprint
      const cost1 = ArmoryManager.getUpgradeCost(1);
      expect(cost1).toEqual({ gold: 100, blueprints: 1 });

      // L=4 -> 1600 gold, 3 blueprints
      const cost4 = ArmoryManager.getUpgradeCost(4);
      expect(cost4).toEqual({ gold: 1600, blueprints: 3 });

      // L=9 -> 8100 gold, 5 blueprints
      const cost9 = ArmoryManager.getUpgradeCost(9);
      expect(cost9).toEqual({ gold: 8100, blueprints: 5 });

      // L=19 -> 36100 gold, 10 blueprints
      const cost19 = ArmoryManager.getUpgradeCost(19);
      expect(cost19).toEqual({ gold: 36100, blueprints: 10 });

      // Out of bounds
      expect(ArmoryManager.getUpgradeCost(20)).toBeNull();
      expect(ArmoryManager.getUpgradeCost(25)).toBeNull();
      expect(ArmoryManager.getUpgradeCost(0)).toBeNull();
      expect(ArmoryManager.getUpgradeCost(-1)).toBeNull();
    });

    it('TC-ARM-02: Cumulative upgrade cost for full progression (1 -> 20) matches exact mathematical constants (247,000 Gold, 109 Blueprints)', () => {
      const fullCost = ArmoryManager.getCumulativeCost(1, 20);
      expect(fullCost.gold).toBe(247000);
      expect(fullCost.blueprints).toBe(109);

      // Partial range (1 -> 5): sum of costs for 1, 2, 3, 4
      // 100*(1 + 4 + 9 + 16) = 100 * 30 = 3000 gold
      // (0+1) + (1+1) + (1+1) + (2+1) = 1 + 2 + 2 + 3 = 8 blueprints
      const partialCost = ArmoryManager.getCumulativeCost(1, 5);
      expect(partialCost.gold).toBe(3000);
      expect(partialCost.blueprints).toBe(8);
    });

    it('TC-ARM-03: Attack multiplier scaling increases by +4% per level and clamps cleanly', () => {
      expect(ArmoryManager.getAtkMultiplier(1)).toBe(1.0);
      expect(ArmoryManager.getAtkMultiplier(5)).toBe(1.16);
      expect(ArmoryManager.getAtkMultiplier(10)).toBe(1.36);
      expect(ArmoryManager.getAtkMultiplier(20)).toBe(1.76);

      // Clamping checks
      expect(ArmoryManager.getAtkMultiplier(0)).toBe(1.0);
      expect(ArmoryManager.getAtkMultiplier(-5)).toBe(1.0);
      expect(ArmoryManager.getAtkMultiplier(30)).toBe(1.76);
    });

    it('TC-ARM-04: Star unlock tier gates unlock Star 3 at Lv 5 and Star 4 at Lv 10', () => {
      // Levels 1..4: Max star 2
      for (let lvl = 1; lvl < STAR_3_UNLOCK_LEVEL; lvl++) {
        expect(ArmoryManager.getMaxAllowedStar(lvl)).toBe(2);
        expect(ArmoryManager.isStarUnlocked(lvl, 1)).toBe(true);
        expect(ArmoryManager.isStarUnlocked(lvl, 2)).toBe(true);
        expect(ArmoryManager.isStarUnlocked(lvl, 3)).toBe(false);
        expect(ArmoryManager.isStarUnlocked(lvl, 4)).toBe(false);
      }

      // Levels 5..9: Max star 3
      for (let lvl = STAR_3_UNLOCK_LEVEL; lvl < STAR_4_UNLOCK_LEVEL; lvl++) {
        expect(ArmoryManager.getMaxAllowedStar(lvl)).toBe(3);
        expect(ArmoryManager.isStarUnlocked(lvl, 2)).toBe(true);
        expect(ArmoryManager.isStarUnlocked(lvl, 3)).toBe(true);
        expect(ArmoryManager.isStarUnlocked(lvl, 4)).toBe(false);
      }

      // Levels 10..20: Max star 4
      for (let lvl = STAR_4_UNLOCK_LEVEL; lvl <= MAX_ARMORY_LEVEL; lvl++) {
        expect(ArmoryManager.getMaxAllowedStar(lvl)).toBe(4);
        expect(ArmoryManager.isStarUnlocked(lvl, 3)).toBe(true);
        expect(ArmoryManager.isStarUnlocked(lvl, 4)).toBe(true);
      }
    });

    it('TC-ARM-05: Atomic currency deduction prevents partial deductions on failure', () => {
      // 1. Give sufficient gold but insufficient blueprints
      profile.currencies.gold = 10000;
      profile.currencies.blueprints = 0;
      const initialGold = profile.currencies.gold;
      const initialBp = profile.currencies.blueprints;

      const resBp = ArmoryManager.upgradeWeapon(profile, 'fire_lance');
      expect(resBp.success).toBe(false);
      expect(resBp.error).toBe('INSUFFICIENT_BLUEPRINTS');
      // Assert zero deduction
      expect(profile.currencies.gold).toBe(initialGold);
      expect(profile.currencies.blueprints).toBe(initialBp);
      expect(ArmoryManager.getWeaponLevel(profile, 'fire_lance')).toBe(1);

      // 2. Give sufficient blueprints but insufficient gold
      profile.currencies.gold = 50; // Needs 100
      profile.currencies.blueprints = 10;
      const resGold = ArmoryManager.upgradeWeapon(profile, 'fire_lance');
      expect(resGold.success).toBe(false);
      expect(resGold.error).toBe('INSUFFICIENT_GOLD');
      // Assert zero deduction
      expect(profile.currencies.gold).toBe(50);
      expect(profile.currencies.blueprints).toBe(10);
      expect(ArmoryManager.getWeaponLevel(profile, 'fire_lance')).toBe(1);

      // 3. Successful upgrade
      profile.currencies.gold = 1000;
      profile.currencies.blueprints = 10;
      const resSuccess = ArmoryManager.upgradeWeapon(profile, 'fire_lance');
      expect(resSuccess.success).toBe(true);
      expect(resSuccess.newLevel).toBe(2);
      expect(profile.currencies.gold).toBe(900); // 1000 - 100
      expect(profile.currencies.blueprints).toBe(9); // 10 - 1
      expect(ArmoryManager.getWeaponLevel(profile, 'fire_lance')).toBe(2);
    });

    it('TC-ARM-06: Validates weapon IDs and enforces max level cap', () => {
      // Invalid weapon
      const invalidRes = ArmoryManager.upgradeWeapon(profile, 'plasma_gun_9000');
      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toBe('INVALID_WEAPON');

      // Max level cap
      profile.currencies.gold = 9999999;
      profile.currencies.blueprints = 9999;
      profile.armory['fire_lance'] = MAX_ARMORY_LEVEL;

      const maxRes = ArmoryManager.upgradeWeapon(profile, 'fire_lance');
      expect(maxRes.success).toBe(false);
      expect(maxRes.error).toBe('MAX_LEVEL_REACHED');
      expect(ArmoryManager.getWeaponLevel(profile, 'fire_lance')).toBe(MAX_ARMORY_LEVEL);
    });
  });

  // =========================================================================
  // 2. TechTreeManager Tests (TC-TECH-01..07)
  // =========================================================================
  describe('TechTreeManager (武经总要科技树)', () => {
    it('TC-TECH-01: Correctly calculates single level upgrade costs for T=0..29 and returns null for T>=30 or T<0', () => {
      // T=0 -> 50*(1) + 10*(0) = 50
      expect(TechTreeManager.getUpgradeCost(0)).toEqual({ iron: 50 });
      // T=1 -> 50*(2) + 10*(1) = 110
      expect(TechTreeManager.getUpgradeCost(1)).toEqual({ iron: 110 });
      // T=5 -> 50*(6) + 10*(25) = 550
      expect(TechTreeManager.getUpgradeCost(5)).toEqual({ iron: 550 });
      // T=10 -> 50*(11) + 10*(100) = 1550
      expect(TechTreeManager.getUpgradeCost(10)).toEqual({ iron: 1550 });
      // T=29 -> 50*(30) + 10*(841) = 1500 + 8410 = 9910
      expect(TechTreeManager.getUpgradeCost(29)).toEqual({ iron: 9910 });

      // Out of bounds
      expect(TechTreeManager.getUpgradeCost(30)).toBeNull();
      expect(TechTreeManager.getUpgradeCost(35)).toBeNull();
      expect(TechTreeManager.getUpgradeCost(-1)).toBeNull();
    });

    it('TC-TECH-02: Cumulative upgrade cost for full branch (0 -> 30) matches exact mathematical constants (108,800 Iron per branch)', () => {
      const branchCost = TechTreeManager.getCumulativeCost(0, 30);
      expect(branchCost.iron).toBe(108800);

      // All 3 branches
      expect(branchCost.iron * 3).toBe(326400);
    });

    it('TC-TECH-03: Martial (攻伐) branch scaling provides fire damage, crit rate, and crit dmg bonuses', () => {
      const b0 = TechTreeManager.getMartialBonuses(0);
      expect(b0.fireAdditiveBonus).toBe(0);
      expect(b0.critRateBonus).toBe(0);
      expect(b0.critDmgMultiplierBonus).toBe(0);

      const b10 = TechTreeManager.getMartialBonuses(10);
      expect(b10.fireAdditiveBonus).toBeCloseTo(0.08, 4);
      expect(b10.critRateBonus).toBeCloseTo(0.05, 4);
      expect(b10.critDmgMultiplierBonus).toBeCloseTo(0.10, 4);

      const b30 = TechTreeManager.getMartialBonuses(30);
      expect(b30.fireAdditiveBonus).toBeCloseTo(0.24, 4);
      expect(b30.critRateBonus).toBeCloseTo(0.15, 4);
      expect(b30.critDmgMultiplierBonus).toBeCloseTo(0.30, 4);

      // Clamping check
      const bMax = TechTreeManager.getMartialBonuses(50);
      expect(bMax.fireAdditiveBonus).toBeCloseTo(0.24, 4);
    });

    it('TC-TECH-04: Defense (坚守) branch scaling provides wall HP, thorns rate, and damage reduction', () => {
      const b0 = TechTreeManager.getDefenseBonuses(0);
      expect(b0.extraWallMaxHp).toBe(0);
      expect(b0.thornsRateBonus).toBe(0);
      expect(b0.wallDamageReduction).toBe(0);

      const b10 = TechTreeManager.getDefenseBonuses(10);
      expect(b10.extraWallMaxHp).toBe(300);
      expect(b10.thornsRateBonus).toBeCloseTo(0.20, 4);
      expect(b10.wallDamageReduction).toBeCloseTo(0.05, 4);

      const b30 = TechTreeManager.getDefenseBonuses(30);
      expect(b30.extraWallMaxHp).toBe(900);
      expect(b30.thornsRateBonus).toBeCloseTo(0.60, 4);
      expect(b30.wallDamageReduction).toBeCloseTo(0.15, 4);
    });

    it('TC-TECH-05: Artifice (巧变) branch scaling provides starting silver, interest cap, and wave stipend', () => {
      const b0 = TechTreeManager.getArtificeBonuses(0);
      expect(b0.startingSilverBonus).toBe(0);
      expect(b0.interestCapBonus).toBe(0);
      expect(b0.waveStipendBonus).toBe(0);

      // Interest cap step function: floor(T / 10)
      expect(TechTreeManager.getArtificeBonuses(9).interestCapBonus).toBe(0);
      expect(TechTreeManager.getArtificeBonuses(10).interestCapBonus).toBe(1);
      expect(TechTreeManager.getArtificeBonuses(19).interestCapBonus).toBe(1);
      expect(TechTreeManager.getArtificeBonuses(20).interestCapBonus).toBe(2);
      expect(TechTreeManager.getArtificeBonuses(30).interestCapBonus).toBe(3);

      const b30 = TechTreeManager.getArtificeBonuses(30);
      expect(b30.startingSilverBonus).toBe(30);
      expect(b30.interestCapBonus).toBe(3);
      expect(b30.waveStipendBonus).toBe(30);
    });

    it('TC-TECH-06: Atomic iron deduction prevents partial deduction and enforces max level cap', () => {
      profile.currencies.iron = 20; // Needs 50 for Lv 0->1
      const resFail = TechTreeManager.upgradeTech(profile, 'martial');
      expect(resFail.success).toBe(false);
      expect(resFail.error).toBe('INSUFFICIENT_IRON');
      expect(profile.currencies.iron).toBe(20);
      expect(TechTreeManager.getBranchLevel(profile, 'martial')).toBe(0);

      // Successful upgrade
      profile.currencies.iron = 100;
      const resSuccess = TechTreeManager.upgradeTech(profile, 'martial');
      expect(resSuccess.success).toBe(true);
      expect(resSuccess.newLevel).toBe(1);
      expect(profile.currencies.iron).toBe(50); // 100 - 50
      expect(TechTreeManager.getBranchLevel(profile, 'martial')).toBe(1);

      // Max level cap
      profile.currencies.iron = 999999;
      profile.techTree.martial = MAX_TECH_LEVEL;
      const resMax = TechTreeManager.upgradeTech(profile, 'martial');
      expect(resMax.success).toBe(false);
      expect(resMax.error).toBe('MAX_LEVEL_REACHED');

      // Invalid branch
      const resInvalid = TechTreeManager.upgradeTech(profile, 'alchemy' as any);
      expect(resInvalid.success).toBe(false);
      expect(resInvalid.error).toBe('INVALID_BRANCH');
    });

    it('TC-TECH-07: Generates an immutable CombatMetaSnapshot covering all 16 weapons and 3 branches', () => {
      profile.armory['fire_lance'] = 5;
      profile.armory['red_cannon'] = 10;
      profile.techTree.martial = 10;
      profile.techTree.defense = 10;
      profile.techTree.artifice = 10;

      const snapshot = TechTreeManager.createCombatSnapshot(profile);

      // 16 weapons populated
      for (const id of ALL_WEAPON_CONFIG_IDS) {
        expect(snapshot.weaponAtkMultipliers[id]).toBeDefined();
        expect(snapshot.weaponMaxAllowedStars[id]).toBeDefined();
      }

      // Check specific levels
      expect(snapshot.weaponAtkMultipliers['fire_lance']).toBe(1.16);
      expect(snapshot.weaponMaxAllowedStars['fire_lance']).toBe(3);

      expect(snapshot.weaponAtkMultipliers['red_cannon']).toBe(1.36);
      expect(snapshot.weaponMaxAllowedStars['red_cannon']).toBe(4);

      // Check branch bonuses in snapshot
      expect(snapshot.martial.fireAdditiveBonus).toBeCloseTo(0.08, 4);
      expect(snapshot.defense.extraWallMaxHp).toBe(300);
      expect(snapshot.artifice.startingSilverBonus).toBe(10);
    });
  });

  // =========================================================================
  // 3. ProfileStorage Tests (TC-STR-01..05)
  // =========================================================================
  describe('ProfileStorage (档案持久化存储适配器)', () => {
    it('TC-STR-01: Correctly constructs the default profile with starter currencies and initial unlocks', () => {
      const def = createDefaultProfile();
      expect(def.version).toBe(CURRENT_PROFILE_VERSION);
      expect(def.currencies).toEqual({ gold: 500, iron: 100, blueprints: 5 });
      expect(def.techTree).toEqual({ martial: 0, defense: 0, artifice: 0 });
      expect(def.campaign.unlockedChapter).toBe(1);
      expect(def.campaign.unlockedStage).toBe(1);
      expect(def.selectedCommander).toBe('wang_shouren');

      // All 16 weapons initialized at Lv 1
      for (const id of ALL_WEAPON_CONFIG_IDS) {
        expect(def.armory[id]).toBe(1);
      }
    });

    it('TC-STR-02: Round-trip persistence saves and reloads identical profile data', () => {
      profile.currencies.gold = 8888;
      profile.currencies.iron = 2222;
      profile.armory['red_cannon'] = 7;
      profile.techTree.defense = 12;
      profile.campaign.unlockedStage = 4;
      profile.campaign.stageStars[1] = 3;

      const saveOk = storage.saveProfile(profile);
      expect(saveOk).toBe(true);

      const loaded = storage.loadProfile();
      expect(loaded.currencies.gold).toBe(8888);
      expect(loaded.currencies.iron).toBe(2222);
      expect(loaded.armory['red_cannon']).toBe(7);
      expect(loaded.techTree.defense).toBe(12);
      expect(loaded.campaign.unlockedStage).toBe(4);
      expect(loaded.campaign.stageStars[1]).toBe(3);
    });

    it('TC-STR-03: Corrupt JSON recovery handles invalid storage gracefully and re-saves clean default profile', () => {
      mockPlatform.setStorageSync('test_profile_key', '{ invalid-corrupted-json...');
      const recovered = storage.loadProfile();

      expect(recovered).toBeDefined();
      expect(recovered.version).toBe(CURRENT_PROFILE_VERSION);
      expect(recovered.currencies.gold).toBe(500);

      // Verify that default profile was re-saved
      const rawInStorage = mockPlatform.getStorageSync('test_profile_key');
      expect(rawInStorage).toBeDefined();
      expect(typeof rawInStorage).toBe('object');
    });

    it('TC-STR-04: Sanitization clamps out-of-range values and backfills missing weapons', () => {
      const corruptRaw = {
        version: 1,
        currencies: { gold: -500, iron: 'not-a-number', blueprints: -10 },
        armory: { fire_lance: 999, barricade: -5 }, // Missing other 14 weapons
        techTree: { martial: 999, defense: -50, artifice: 'bad' },
        campaign: { unlockedChapter: 0, unlockedStage: 99, stageStars: { '1': 10, '2': -5 } }
      };

      const sanitized = sanitizeProfile(corruptRaw);

      // Currencies clamp to >= 0
      expect(sanitized.currencies.gold).toBe(0);
      expect(sanitized.currencies.iron).toBe(100); // Defaults back on NaN
      expect(sanitized.currencies.blueprints).toBe(0);

      // Armory clamps to [1, 20] and backfills all 16 weapons
      expect(sanitized.armory['fire_lance']).toBe(20);
      expect(sanitized.armory['barricade']).toBe(1);
      for (const id of ALL_WEAPON_CONFIG_IDS) {
        expect(sanitized.armory[id]).toBeGreaterThanOrEqual(1);
        expect(sanitized.armory[id]).toBeLessThanOrEqual(20);
      }

      // Tech tree clamps to [0, 30]
      expect(sanitized.techTree.martial).toBe(30);
      expect(sanitized.techTree.defense).toBe(0);
      expect(sanitized.techTree.artifice).toBe(0);

      // Campaign clamps
      expect(sanitized.campaign.unlockedStage).toBe(20);
      expect(sanitized.campaign.stageStars[1]).toBe(3);
      expect(sanitized.campaign.stageStars[2]).toBe(0);
    });

    it('TC-STR-05: Schema migration v0 -> v1 correctly transforms legacy keys to modern contracts', () => {
      const legacyV0Data = {
        currencies: {
          gold: 1200,
          meteoriteIron: 340, // Legacy key
          blueprints: 3
        },
        armory: {
          fire_lance: 2
        },
        techTree: {
          gongfa: 5,   // Legacy Chinese key
          jianshou: 3, // Legacy Chinese key
          qiaobian: 2  // Legacy Chinese key
        },
        campaign: {
          unlockedChapter: 1,
          unlockedStage: 2
        }
      };

      mockPlatform.setStorageSync('test_profile_key', legacyV0Data);
      const migrated = storage.loadProfile();

      expect(migrated.version).toBe(1);
      expect(migrated.currencies.iron).toBe(340);
      expect((migrated.currencies as any).meteoriteIron).toBeUndefined();

      expect(migrated.techTree.martial).toBe(5);
      expect(migrated.techTree.defense).toBe(3);
      expect(migrated.techTree.artifice).toBe(2);
      expect((migrated.techTree as any).gongfa).toBeUndefined();
    });
  });
});
