/**
 * 《孤城神机营》- Forge System & Boss Drops Test Suite
 * Tests pure headless domain contracts for blueprint crafting, component equipping,
 * stat bonuses calculation, and boss drop algorithms.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { COMPONENT_DEFINITIONS, getComponentDefinition, getComponentsBySlot } from '../src/core/forge/forge-config';
import { ForgeManager } from '../src/core/forge/forge-manager';
import { BossDropEngine } from '../src/core/forge/boss-drop-engine';
import { PlayerProfile } from '../src/core/meta/types';
import { createDefaultProfile, ProfileStorage, sanitizeProfile } from '../src/core/meta/profile-storage';
import { TechTreeManager } from '../src/core/meta/tech-tree-manager';

describe('Forge & Blueprint Workshop Domain Suite', () => {
  let profile: PlayerProfile;

  beforeEach(() => {
    profile = createDefaultProfile();
    // Default profile starts with 500 gold, 100 iron, 5 blueprints
  });

  describe('1. Component Configuration Registry', () => {
    it('contains all 9 canonical components across 3 slots', () => {
      expect(Object.keys(COMPONENT_DEFINITIONS).length).toBe(9);
      const barrels = getComponentsBySlot('barrel');
      const receivers = getComponentsBySlot('receiver');
      const fuzes = getComponentsBySlot('fuze');

      expect(barrels.length).toBe(3);
      expect(receivers.length).toBe(3);
      expect(fuzes.length).toBe(3);
    });

    it('contains 5 boss-specific signature components', () => {
      const bear = getComponentDefinition('boss_bear_barrel');
      const xuanwu = getComponentDefinition('boss_xuanwu_chassis');
      const khan = getComponentDefinition('boss_khan_receiver');
      const corpse = getComponentDefinition('boss_corpse_fuze');
      const taotie = getComponentDefinition('boss_taotie_fuze');

      expect(bear?.sourceBoss).toBe('铁塔熊王');
      expect(xuanwu?.sourceBoss).toBe('玄武巨舰');
      expect(khan?.sourceBoss).toBe('金帐可汗');
      expect(corpse?.sourceBoss).toBe('万蛊尸魔');
      expect(taotie?.sourceBoss).toBe('饕餮攻城机');
    });
  });

  describe('2. Crafting & Currencies Deduction (ForgeManager.forgeComponent)', () => {
    it('validates sufficient currencies before forging', () => {
      // iron_barrel costs 1 blueprint, 25 iron
      const check = ForgeManager.canForge(profile, 'iron_barrel');
      expect(check.canForge).toBe(true);
      expect(check.cost).toEqual({ blueprints: 1, iron: 25 });
    });

    it('rejects forging when blueprints are insufficient', () => {
      profile.currencies.blueprints = 0;
      const check = ForgeManager.canForge(profile, 'iron_barrel');
      expect(check.canForge).toBe(false);
      expect(check.reason).toContain('神机图纸不足');
    });

    it('rejects forging when iron is insufficient', () => {
      profile.currencies.iron = 10;
      const check = ForgeManager.canForge(profile, 'iron_barrel');
      expect(check.canForge).toBe(false);
      expect(check.reason).toContain('天外玄铁不足');
    });

    it('atomically deducts currencies and adds forged item to inventory', () => {
      const initialBlueprints = profile.currencies.blueprints;
      const initialIron = profile.currencies.iron;

      const result = ForgeManager.forgeComponent(profile, 'boss_bear_barrel');
      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.componentId).toBe('boss_bear_barrel');

      // boss_bear_barrel costs 2 blueprints, 60 iron
      expect(profile.currencies.blueprints).toBe(initialBlueprints - 2);
      expect(profile.currencies.iron).toBe(initialIron - 60);
      expect(profile.forge?.inventory.length).toBe(1);
      expect(profile.forge?.totalForged).toBe(1);
    });
  });

  describe('3. Equipping & Unequipping Components', () => {
    it('equips a barrel component into the weapon archetype barrel slot', () => {
      const forgeRes = ForgeManager.forgeComponent(profile, 'iron_barrel');
      const uid = forgeRes.item!.uid;

      const equipRes = ForgeManager.equipComponent(profile, 'red_cannon', uid);
      expect(equipRes.success).toBe(true);
      expect(equipRes.slot).toBe('barrel');
      expect(profile.forge?.equipped['red_cannon']?.barrel).toBe(uid);
    });

    it('automatically unhooks component from previous weapon if equipped to a new one', () => {
      const forgeRes = ForgeManager.forgeComponent(profile, 'iron_barrel');
      const uid = forgeRes.item!.uid;

      ForgeManager.equipComponent(profile, 'red_cannon', uid);
      expect(profile.forge?.equipped['red_cannon']?.barrel).toBe(uid);

      // Re-equip onto flame_beast
      ForgeManager.equipComponent(profile, 'flame_beast', uid);
      expect(profile.forge?.equipped['flame_beast']?.barrel).toBe(uid);
      expect(profile.forge?.equipped['red_cannon']?.barrel).toBeUndefined();
    });

    it('unequips component cleanly', () => {
      const forgeRes = ForgeManager.forgeComponent(profile, 'spring_receiver');
      const uid = forgeRes.item!.uid;

      ForgeManager.equipComponent(profile, 'rocket_box', uid);
      expect(profile.forge?.equipped['rocket_box']?.receiver).toBe(uid);

      const unequipRes = ForgeManager.unequipComponent(profile, 'rocket_box', 'receiver');
      expect(unequipRes.success).toBe(true);
      expect(unequipRes.unequippedUid).toBe(uid);
      expect(profile.forge?.equipped['rocket_box']?.receiver).toBeUndefined();
    });
  });

  describe('4. Bonus Aggregation & Hard Caps', () => {
    it('returns zeroes when no components are equipped', () => {
      const bonuses = ForgeManager.calculateWeaponForgeBonuses(profile, 'red_cannon');
      expect(bonuses.atkBonus).toBe(0);
      expect(bonuses.critRateBonus).toBe(0);
      expect(bonuses.activeComponentNames).toEqual([]);
    });

    it('accurately aggregates stats from 3 slots equipped simultaneously', () => {
      // 1. Barrel: boss_bear_barrel (atk +14%, range +30, armorPierce 15)
      // 2. Receiver: boss_xuanwu_chassis (atk +6%, reflect +15%)
      // 3. Fuze: boss_taotie_fuze (critRate +10%, critDmg +0.30, armorPierce 30)
      profile.currencies.blueprints = 20;
      profile.currencies.iron = 1000;

      const item1 = ForgeManager.forgeComponent(profile, 'boss_bear_barrel').item!;
      const item2 = ForgeManager.forgeComponent(profile, 'boss_xuanwu_chassis').item!;
      const item3 = ForgeManager.forgeComponent(profile, 'boss_taotie_fuze').item!;

      ForgeManager.equipComponent(profile, 'red_cannon', item1.uid);
      ForgeManager.equipComponent(profile, 'red_cannon', item2.uid);
      ForgeManager.equipComponent(profile, 'red_cannon', item3.uid);

      const bonuses = ForgeManager.calculateWeaponForgeBonuses(profile, 'red_cannon');

      expect(bonuses.atkBonus).toBeCloseTo(0.20, 2); // 0.14 + 0.06
      expect(bonuses.rangeBonus).toBe(30);
      expect(bonuses.armorPierce).toBe(45); // 15 + 30
      expect(bonuses.critRateBonus).toBeCloseTo(0.10, 2);
      expect(bonuses.critDmgBonus).toBeCloseTo(0.30, 2);
      expect(bonuses.reflectBonus).toBeCloseTo(0.15, 2);
      expect(bonuses.activeComponentNames.length).toBe(3);
    });

    it('injects forge bonuses into CombatMetaSnapshot via TechTreeManager', () => {
      const item = ForgeManager.forgeComponent(profile, 'iron_barrel').item!;
      ForgeManager.equipComponent(profile, 'fire_lance', item.uid);

      const snapshot = TechTreeManager.createCombatSnapshot(profile);
      expect(snapshot.weaponForgeBonuses).toBeDefined();
      expect(snapshot.weaponForgeBonuses?.['fire_lance']?.atkBonus).toBe(0.08);
      expect(snapshot.weaponForgeBonuses?.['fire_lance']?.rangeBonus).toBe(20);
    });
  });

  describe('5. Boss Drop Engine Algorithm', () => {
    it('returns null for non-boss campaign stages', () => {
      expect(BossDropEngine.evaluateCampaignBossDrop(1, false)).toBeNull();
      expect(BossDropEngine.evaluateCampaignBossDrop(5, true)).toBeNull();
    });

    it('guarantees generous blueprint and iron drop on first clear of boss stage', () => {
      const drop = BossDropEngine.evaluateCampaignBossDrop(4, true); // Ch1 Boss: 铁塔熊王
      expect(drop).not.toBeNull();
      expect(drop?.isFirstClearBonus).toBe(true);
      expect(drop?.blueprints).toBeGreaterThanOrEqual(1);
      expect(drop?.componentDropped?.id).toBe('boss_bear_barrel');
    });

    it('respects probability roll for repeat clears of boss stage', () => {
      // roll <= 0.40 triggers drop
      const luckyDrop = BossDropEngine.evaluateCampaignBossDrop(8, false, 0.20);
      expect(luckyDrop?.blueprints).toBeGreaterThan(0);

      // roll > 0.40 misses blueprint but gives consolation iron
      const unluckyDrop = BossDropEngine.evaluateCampaignBossDrop(8, false, 0.80);
      expect(unluckyDrop?.blueprints).toBe(0);
      expect(unluckyDrop?.iron).toBeGreaterThan(0);
    });

    it('evaluates endless mode drops strictly on multiples of wave 5', () => {
      expect(BossDropEngine.evaluateEndlessBossDrop(3)).toBeNull();
      expect(BossDropEngine.evaluateEndlessBossDrop(7)).toBeNull();

      const dropW5 = BossDropEngine.evaluateEndlessBossDrop(5, 0.1);
      expect(dropW5).not.toBeNull();
      expect(dropW5?.blueprints).toBeGreaterThanOrEqual(1);

      // Wave 20+ guarantees drop regardless of random roll
      const dropW25 = BossDropEngine.evaluateEndlessBossDrop(25, 0.99);
      expect(dropW25?.blueprints).toBe(3);
    });
  });

  describe('6. Profile Storage & Persistence Sanitization', () => {
    it('initializes default forge profile structure safely', () => {
      const def = createDefaultProfile();
      expect(def.forge).toBeDefined();
      expect(def.forge?.inventory).toEqual([]);
      expect(def.forge?.equipped).toEqual({});
      expect(def.forge?.totalForged).toBe(0);
    });

    it('recovers gracefully from malformed forge data in storage', () => {
      const malformedRaw = {
        currencies: { gold: 100, iron: 50, blueprints: 2 },
        forge: {
          inventory: 'corrupt-string',
          equipped: null,
          totalForged: 'NaN'
        }
      };

      const sanitized = sanitizeProfile(malformedRaw);
      expect(Array.isArray(sanitized.forge?.inventory)).toBe(true);
      expect(sanitized.forge?.inventory).toEqual([]);
      expect(typeof sanitized.forge?.equipped).toBe('object');
      expect(sanitized.forge?.totalForged).toBe(0);
    });
  });
});
