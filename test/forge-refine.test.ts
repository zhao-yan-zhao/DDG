/**
 * 《孤城神机营》- Forge Refinement & Affix Re-rolling Test Suite
 * 
 * Verifies:
 * 1. Random affix generation for rare (1), epic (2), legendary (3) qualities.
 * 2. Distinct affix types per item and tier rating calculation (C / B / A / S).
 * 3. Gear Score (战力评分) calculation and dynamic title ranks.
 * 4. Iron cost scaling with locked affixes (Base 15, +15 per lock).
 * 5. Affix locking restrictions (Epic max 1, Legendary max 2, cannot lock all).
 * 6. Pity guarantee (5th roll without S-tier forces guaranteed S-tier).
 * 7. ForgeManager aggregates rolled affixes into combat bonuses adhering to caps.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ForgeRefineEngine } from '../src/core/forge/forge-refine';
import { ForgeManager } from '../src/core/forge/forge-manager';
import { PlayerProfile } from '../src/core/meta/types';
import { createDefaultProfile } from '../src/core/meta/profile-storage';
import { ForgedComponentItem } from '../src/core/forge/types';

describe('Forge Refinement & Affix Re-rolling Suite', () => {
  let profile: PlayerProfile;

  beforeEach(() => {
    profile = createDefaultProfile();
    profile.currencies.iron = 500;
  });

  describe('1. Random Affix Slot & Tier Distribution', () => {
    it('TC-REF-01: rolls exact slot counts per quality (Rare: 1, Epic: 2, Legendary: 3)', () => {
      const rareAffixes = ForgeRefineEngine.rollAffixesForQuality('rare');
      const epicAffixes = ForgeRefineEngine.rollAffixesForQuality('epic');
      const legAffixes = ForgeRefineEngine.rollAffixesForQuality('legendary');

      expect(rareAffixes.length).toBe(1);
      expect(epicAffixes.length).toBe(2);
      expect(legAffixes.length).toBe(3);
    });

    it('TC-REF-02: generates distinct affix types on multi-slot items', () => {
      const legAffixes = ForgeRefineEngine.rollAffixesForQuality('legendary');
      const typeSet = new Set(legAffixes.map(a => a.type));

      expect(typeSet.size).toBe(3);
    });

    it('TC-REF-03: guarantees S-tier affix when forceSTier is requested', () => {
      const affixes = ForgeRefineEngine.rollAffixesForQuality('legendary', true);
      const hasSTier = affixes.some(a => a.tier === 'S');

      expect(hasSTier).toBe(true);
    });
  });

  describe('2. Gear Score (战力评分) Evaluation', () => {
    it('TC-REF-04: evaluates score and assigned rank for legendary component', () => {
      const item: ForgedComponentItem = {
        uid: 'test_leg_1',
        componentId: 'flame_dragon_barrel',
        acquiredAt: Date.now(),
        affixes: [
          { id: '1', type: 'atk_pct', name: '烈火锋芒', value: 0.075, tier: 'S', isLocked: false },
          { id: '2', type: 'crit_rate', name: '贯甲精准', value: 0.048, tier: 'S', isLocked: false },
          { id: '3', type: 'crit_dmg', name: '天罡重创', value: 0.16, tier: 'S', isLocked: false }
        ]
      };

      const result = ForgeRefineEngine.calculateGearScore(item);
      expect(result.score).toBeGreaterThanOrEqual(1200);
      expect(result.rankText).toBe('冠绝天工 (S+)');
      expect(result.rankColor).toBe('#ffd700');
    });

    it('TC-REF-05: evaluates base score for unrefined rare item', () => {
      const item: ForgedComponentItem = {
        uid: 'test_rare_1',
        componentId: 'iron_barrel',
        acquiredAt: Date.now()
      };

      const result = ForgeRefineEngine.calculateGearScore(item);
      expect(result.score).toBe(200);
      expect(result.rankText).toBe('良铁初成 (C)');
    });
  });

  describe('3. Refinement Cost & Affix Locking Rules', () => {
    it('TC-REF-06: scales iron cost accurately with number of locked affixes', () => {
      expect(ForgeRefineEngine.calculateRefineCost(0)).toBe(15);
      expect(ForgeRefineEngine.calculateRefineCost(1)).toBe(30);
      expect(ForgeRefineEngine.calculateRefineCost(2)).toBe(45);
    });

    it('TC-REF-07: restricts locking to quality thresholds (Rare: 0, Epic: 1, Legendary: 2)', () => {
      expect(ForgeRefineEngine.getMaxLockSlots('rare')).toBe(0);
      expect(ForgeRefineEngine.getMaxLockSlots('epic')).toBe(1);
      expect(ForgeRefineEngine.getMaxLockSlots('legendary')).toBe(2);
    });

    it('TC-REF-08: toggleAffixLock prevents locking more than maximum allowed slots', () => {
      const epicItem: ForgedComponentItem = {
        uid: 'epic_comp_1',
        componentId: 'boss_bear_barrel', // Epic
        acquiredAt: Date.now(),
        affixes: [
          { id: 'affix_1', type: 'atk_pct', name: '烈火锋芒', value: 0.04, tier: 'B', isLocked: false },
          { id: 'affix_2', type: 'crit_rate', name: '贯甲精准', value: 0.03, tier: 'B', isLocked: false }
        ]
      };

      // Lock first affix
      const res1 = ForgeRefineEngine.toggleAffixLock(epicItem, 'affix_1');
      expect(res1.success).toBe(true);
      expect(res1.isLocked).toBe(true);

      // Attempt to lock second affix (rejected, max 1 for Epic)
      const res2 = ForgeRefineEngine.toggleAffixLock(epicItem, 'affix_2');
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('最多只可锁定 1 条');
    });
  });

  describe('4. Refinement Execution & Pity Guarantee', () => {
    it('TC-REF-09: preserves locked affixes and rolls new unlocked affixes', () => {
      const forgeRes = ForgeManager.forgeComponent(profile, 'flame_dragon_barrel');
      const item = forgeRes.item!;
      ForgeRefineEngine.ensureItemAffixes(item);

      // Lock first affix
      const lockedAffix = item.affixes![0];
      lockedAffix.isLocked = true;
      const initialLockedValue = lockedAffix.value;
      const initialLockedType = lockedAffix.type;

      const refineRes = ForgeRefineEngine.refineItem(profile, item.uid);
      expect(refineRes.success).toBe(true);
      // initial 500 iron - 150 (forging cost) - 30 (15 base + 15 lock) = 320
      expect(profile.currencies.iron).toBe(320);

      // Check preserved affix
      const preserved = refineRes.item?.affixes?.find(a => a.id === lockedAffix.id);
      expect(preserved).toBeDefined();
      expect(preserved?.type).toBe(initialLockedType);
      expect(preserved?.value).toBe(initialLockedValue);
      expect(preserved?.isLocked).toBe(true);
    });

    it('TC-REF-10: triggers pity guaranteed S-tier when 5 consecutive rolls occur without S-tier', () => {
      const forgeRes = ForgeManager.forgeComponent(profile, 'flame_dragon_barrel');
      const item = forgeRes.item!;
      ForgeRefineEngine.ensureItemAffixes(item);

      // Pre-set refine count to 4 (pity threshold is 5)
      item.refineCount = 4;
      // Strip any S-tier affixes to test pity trigger
      item.affixes = [
        { id: '1', type: 'atk_pct', name: '烈火锋芒', value: 0.03, tier: 'C', isLocked: false },
        { id: '2', type: 'crit_rate', name: '贯甲精准', value: 0.02, tier: 'C', isLocked: false },
        { id: '3', type: 'range', name: '百步穿杨', value: 12, tier: 'C', isLocked: false }
      ];

      const refineRes = ForgeRefineEngine.refineItem(profile, item.uid);
      expect(refineRes.success).toBe(true);
      expect(refineRes.pityTriggered).toBe(true);

      const hasSTier = refineRes.item?.affixes?.some(a => a.tier === 'S');
      expect(hasSTier).toBe(true);
      expect(refineRes.item?.refineCount).toBe(0); // Reset pity counter
    });

    it('TC-REF-11: rejects refinement if iron is insufficient', () => {
      const forgeRes = ForgeManager.forgeComponent(profile, 'iron_barrel');
      const item = forgeRes.item!;

      // Drop iron below refine cost (15)
      profile.currencies.iron = 5;

      const res = ForgeRefineEngine.refineItem(profile, item.uid);
      expect(res.success).toBe(false);
      expect(res.error).toContain('天外玄铁不足');
    });
  });

  describe('5. Combat Integration & Bonus Aggregation', () => {
    it('TC-REF-12: ForgeManager incorporates refined item affixes into weapon bonuses', () => {
      const forgeRes = ForgeManager.forgeComponent(profile, 'flame_dragon_barrel');
      const item = forgeRes.item!;
      item.affixes = [
        { id: 'a1', type: 'atk_pct', name: '烈火锋芒', value: 0.08, tier: 'S', isLocked: false },
        { id: 'a2', type: 'crit_rate', name: '贯甲精准', value: 0.05, tier: 'S', isLocked: false }
      ];

      ForgeManager.equipComponent(profile, 'red_cannon', item.uid);
      const bonuses = ForgeManager.calculateWeaponForgeBonuses(profile, 'red_cannon');

      // Base flame_dragon_barrel: atkBonus: 0.22, rangeBonus: 45, reactionDamageBonus: 0.15
      // Plus affixes: atk_pct: +0.08, crit_rate: +0.05
      expect(bonuses.atkBonus).toBeCloseTo(0.30, 2); // 0.22 + 0.08
      expect(bonuses.critRateBonus).toBeCloseTo(0.05, 2);
      expect(bonuses.rangeBonus).toBe(45);
      expect(bonuses.reactionDamageBonus).toBeCloseTo(0.15, 2);
    });
  });
});
