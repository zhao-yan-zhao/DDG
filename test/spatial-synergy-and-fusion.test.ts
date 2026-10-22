/**
 * 《孤城神机营》- Spatial Synergy & Red-Gold Fusion Verification Suite
 * Tests 100% full coverage for:
 * 1. 6 Classic Spatial Formations (阵略篇·空间相邻羁绊):
 *    - volley_fire (齐射列阵)
 *    - wild_goose_crossbow (雁行弩阵)
 *    - nine_palace_powder (九宫火药库 / 火鸦助势)
 *    - oil_combustion (引火烧身)
 *    - march_drum (闻鼓进军)
 *    - polar_starlight (极寒星芒)
 * 2. Active Visual Link Beams generation for UI/Sandbox rendering
 * 3. 4 Red-Gold Dual-Weapon Awakenings (阵略篇·赤金融合觉醒 & T33~T36):
 *    - T33 (红夷雷火炮 / 九天雷池轰)
 *    - T34 (暴雨火箭车)
 *    - T35 (真·火龙出水 / 铁浮屠火牛阵)
 *    - T36 (九天星陨石 / 泰山陨冰劫)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialSynergyEngine } from '../src/core/bond/spatial-synergy';
import { createWeaponInstance } from '../src/core/weapon/weapon-instance';
import { FusionUnlockEngine, FUSION_REQUIREMENTS } from '../src/core/tactics/fusion-unlock';
import { AffixMountEngine } from '../src/core/tactics/affix-mount';
import { WeaponInstance, EnemyEntity } from '../src/core/types';

describe('Spatial Synergy & Red-Gold Fusion Mechanics (神机阵略篇实装验证)', () => {
  // =========================================================================
  // 1. 六大空间相邻羁绊 (Spatial Synergies)
  // =========================================================================
  describe('1. 空间相邻羁绊 (Spatial Formations)', () => {
    it('1.1 【齐射列阵】 (volley_fire): 2 horizontal Fire Lances gain +18% ASPD, >=3 gain +30%', () => {
      const lance1 = createWeaponInstance('fire_lance', 1, { row: 2, col: 1 });
      const lance2 = createWeaponInstance('fire_lance', 1, { row: 2, col: 2 });

      // Pair of 2
      let bonuses = SpatialSynergyEngine.evaluateAllWeapons([lance1, lance2]);
      expect(bonuses.get(lance1.id)?.aspdBonus).toBeCloseTo(0.18);
      expect(bonuses.get(lance2.id)?.aspdBonus).toBeCloseTo(0.18);
      expect(bonuses.get(lance1.id)?.activeSynergies).toContain('volley_fire');

      // Horizontal Row of 3
      const lance3 = createWeaponInstance('fire_lance', 1, { row: 2, col: 3 });
      bonuses = SpatialSynergyEngine.evaluateAllWeapons([lance1, lance2, lance3]);
      expect(bonuses.get(lance1.id)?.aspdBonus).toBeCloseTo(0.30);
      expect(bonuses.get(lance2.id)?.aspdBonus).toBeCloseTo(0.30);
      expect(bonuses.get(lance3.id)?.aspdBonus).toBeCloseTo(0.30);

      // Non-adjacent lances should NOT trigger
      const lanceFar = createWeaponInstance('fire_lance', 1, { row: 4, col: 4 });
      bonuses = SpatialSynergyEngine.evaluateAllWeapons([lance1, lanceFar]);
      expect(bonuses.get(lance1.id)?.aspdBonus).toBe(0);
      expect(bonuses.get(lanceFar.id)?.aspdBonus).toBe(0);
    });

    it('1.2 【雁行弩阵】 (wild_goose_crossbow): Diagonal Repeating Crossbows gain +15% Crit Rate', () => {
      const xbow1 = createWeaponInstance('repeating_crossbow', 1, { row: 2, col: 2 });
      const xbow2 = createWeaponInstance('repeating_crossbow', 1, { row: 3, col: 3 }); // diagonal
      const xbow3 = createWeaponInstance('repeating_crossbow', 1, { row: 1, col: 1 }); // diagonal

      const bonuses = SpatialSynergyEngine.evaluateAllWeapons([xbow1, xbow2, xbow3]);
      expect(bonuses.get(xbow1.id)?.critRateBonus).toBeGreaterThanOrEqual(0.15);
      expect(bonuses.get(xbow2.id)?.critRateBonus).toBeGreaterThanOrEqual(0.15);
      expect(bonuses.get(xbow3.id)?.critRateBonus).toBeGreaterThanOrEqual(0.15);
      expect(bonuses.get(xbow1.id)?.activeSynergies).toContain('wild_goose_crossbow');
    });

    it('1.3 【九宫火药库 / 火鸦助势】 (nine_palace_powder): Powder Bureau 3x3 buffs fire weapons +20% Atk & 35% Burn; vertical Rocket Box gains extra Atk & missiles', () => {
      const pb = createWeaponInstance('powder_bureau', 1, { row: 2, col: 2 });
      const lance = createWeaponInstance('fire_lance', 1, { row: 2, col: 3 }); // horizontal neighbor
      const rocket = createWeaponInstance('rocket_box', 1, { row: 1, col: 2 }); // vertical top neighbor

      const bonuses = SpatialSynergyEngine.evaluateAllWeapons([pb, lance, rocket]);
      // Fire Lance gets 3x3 Atk & Burn
      expect(bonuses.get(lance.id)?.additiveDmgBonus).toBeCloseTo(0.20);
      expect(bonuses.get(lance.id)?.applyBurnChance).toBeCloseTo(0.35);

      // Rocket Box gets vertical extra boost (+20% + 15% = 35%) and extra projectiles
      expect(bonuses.get(rocket.id)?.additiveDmgBonus).toBeCloseTo(0.35);
      expect(bonuses.get(rocket.id)?.extraProjectiles).toBe(4);
      expect(bonuses.get(rocket.id)?.activeSynergies).toContain('nine_palace_powder');
    });

    it('1.4 【引火烧身】 (oil_combustion): Row 0 Oil Cabinet buffs Row 1 Heavy Cannon/Thunder Thrower +30% Crit Rate', () => {
      const oil = createWeaponInstance('oil_cabinet', 1, { row: 0, col: 2 });
      const cannon = createWeaponInstance('thunder_thrower', 1, { row: 1, col: 2 }); // directly behind
      const cannonFar = createWeaponInstance('thunder_thrower', 1, { row: 3, col: 2 }); // far behind

      const bonuses = SpatialSynergyEngine.evaluateAllWeapons([oil, cannon, cannonFar]);
      expect(bonuses.get(cannon.id)?.critRateBonus).toBeCloseTo(0.30);
      expect(bonuses.get(cannon.id)?.activeSynergies).toContain('oil_combustion');
      expect(bonuses.get(cannonFar.id)?.critRateBonus).toBe(0);
    });

    it('1.5 【闻鼓进军】 (march_drum): War Drum row weapons gain +35% ASPD, col Spear Camp gains wall lifesteal', () => {
      const drum = createWeaponInstance('war_drum', 1, { row: 3, col: 2 });
      const cannon = createWeaponInstance('red_cannon', 1, { row: 3, col: 0 }); // same row
      const spear = createWeaponInstance('spear_camp', 1, { row: 0, col: 2 }); // same col, frontline

      const bonuses = SpatialSynergyEngine.evaluateAllWeapons([drum, cannon, spear]);
      expect(bonuses.get(cannon.id)?.aspdBonus).toBeCloseTo(0.35);
      expect(bonuses.get(cannon.id)?.activeSynergies).toContain('march_drum');

      expect(bonuses.get(spear.id)?.wallLifestealOnHit).toBe(15);
      expect(bonuses.get(spear.id)?.activeSynergies).toContain('march_drum');
    });

    it('1.6 【极寒星芒】 (polar_starlight): Stargazer cross neighbors gain +18% Crit Rate & apply freeze', () => {
      const sg = createWeaponInstance('stargazer', 1, { row: 2, col: 2 });
      const topWeapon = createWeaponInstance('catapult', 1, { row: 1, col: 2 }); // orthogonal top
      const rightWeapon = createWeaponInstance('fire_lance', 1, { row: 2, col: 3 }); // orthogonal right
      const diagonalWeapon = createWeaponInstance('repeating_crossbow', 1, { row: 1, col: 1 }); // diagonal

      const bonuses = SpatialSynergyEngine.evaluateAllWeapons([sg, topWeapon, rightWeapon, diagonalWeapon]);
      expect(bonuses.get(topWeapon.id)?.critRateBonus).toBeCloseTo(0.18);
      expect(bonuses.get(topWeapon.id)?.applyFreeze).toBe(true);

      expect(bonuses.get(rightWeapon.id)?.critRateBonus).toBeCloseTo(0.18);
      expect(bonuses.get(rightWeapon.id)?.applyFreeze).toBe(true);

      // Diagonal is not orthogonal cross
      expect(bonuses.get(diagonalWeapon.id)?.applyFreeze).toBe(false);
    });

    it('1.7 Visual Links: getActiveLinks properly creates link beams between active partners', () => {
      const lance1 = createWeaponInstance('fire_lance', 1, { row: 2, col: 1 });
      const lance2 = createWeaponInstance('fire_lance', 1, { row: 2, col: 2 });
      const sg = createWeaponInstance('stargazer', 1, { row: 1, col: 2 });

      const links = SpatialSynergyEngine.getActiveLinks([lance1, lance2, sg]);
      expect(links.length).toBeGreaterThan(0);

      const volleyLink = links.find(l => l.synergyId === 'volley_fire');
      expect(volleyLink).toBeDefined();
      expect(volleyLink?.synergyName).toBe('齐射列阵');

      const starlightLink = links.find(l => l.synergyId === 'polar_starlight');
      expect(starlightLink).toBeDefined();
    });
  });

  // =========================================================================
  // 2. 赤金融合觉醒 (Red-Gold Dual-Weapon Awakenings)
  // =========================================================================
  describe('2. 赤金融合觉醒 (Red-Gold Awakenings & Tactics T33~T36)', () => {
    let affix: AffixMountEngine;

    beforeEach(() => {
      affix = new AffixMountEngine();
    });

    it('2.1 FusionUnlockEngine recognizes dual ★3 requirements with Compendium ID aliases', () => {
      const redCannon = createWeaponInstance('red_cannon', 3, { row: 3, col: 0 });
      const gridTrap = createWeaponInstance('electric_grid', 3, { row: 0, col: 3 });

      // T33 / nine_heaven_thunder_pool
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [redCannon, gridTrap])).toBe(true);
      expect(FusionUnlockEngine.isFusionUnlocked('nine_heaven_thunder_pool', [redCannon, gridTrap])).toBe(true);

      // Incomplete: only ★2
      const redCannonStar2 = createWeaponInstance('red_cannon', 2, { row: 3, col: 0 });
      expect(FusionUnlockEngine.isFusionUnlocked('T33', [redCannonStar2, gridTrap])).toBe(false);

      // T35 / fire_dragon_water (rocket_box ★3 + oil_cabinet ★3)
      const rocket3 = createWeaponInstance('rocket_box', 3, { row: 2, col: 2 });
      const oil3 = createWeaponInstance('oil_cabinet', 3, { row: 0, col: 2 });
      expect(FusionUnlockEngine.isFusionUnlocked('T35', [rocket3, oil3])).toBe(true);
      expect(FusionUnlockEngine.isFusionUnlocked('fire_dragon_water', [rocket3, oil3])).toBe(true);
    });

    it('2.2 AffixMountEngine correctly supports Compendium alias IDs in isCardActive', () => {
      affix.mountCard('T33');
      expect(affix.isCardActive('T33')).toBe(true);
      expect(affix.isCardActive('nine_heaven_thunder_pool')).toBe(true);
      expect(affix.isT33ThunderPoolActive()).toBe(true);

      affix.mountCard('T35');
      expect(affix.isCardActive('fire_dragon_water')).toBe(true);
      expect(affix.isT35FireDragonActive()).toBe(true);

      affix.mountCard('T36');
      expect(affix.isCardActive('mount_tai_ice_meteor')).toBe(true);
      expect(affix.isT36IceMeteorActive()).toBe(true);
    });

    it('2.3 T33 (九天雷池轰) grants +25% Crit Rate and 50% armor sunder rate to Red Cannon', () => {
      affix.mountCard('T33');
      const cannon = createWeaponInstance('red_cannon', 3, { row: 3, col: 0 });
      const mockEnemy: any = {
        id: 'dummy',
        name: 'Target',
        maxHp: 1000,
        currentHp: 1000,
        armor: 100,
        shield: 0,
        moveSpeed: 1.0,
        isBoss: false
      };

      const ctx = affix.populateDamageContext(cannon, mockEnemy);
      expect(ctx.critRateBonus).toBeGreaterThanOrEqual(0.25);
      expect(ctx.sunderRate).toBe(0.50);
    });

    it('2.4 T34 (暴雨火箭车) dramatically boosts Repeating Crossbow (+100% ASPD) and Rocket Box (+50% ASPD)', () => {
      affix.mountCard('T34');
      const xbow = createWeaponInstance('repeating_crossbow', 3, { row: 2, col: 2 });
      const rocket = createWeaponInstance('rocket_box', 3, { row: 1, col: 2 });

      expect(affix.getAttackSpeedBonus(xbow)).toBeGreaterThanOrEqual(1.00);
      expect(affix.getAttackSpeedBonus(rocket)).toBeGreaterThanOrEqual(0.50);
    });

    it('2.5 T35 (真·火龙出水) grants +40% Additive Fire Damage to fire weapons', () => {
      affix.mountCard('T35');
      const rocket = createWeaponInstance('rocket_box', 3, { row: 2, col: 2 });
      const bonuses = affix.getAdditiveDamageBonuses(rocket);
      expect(bonuses).toContain(0.40);
    });

    it('2.6 T36 (泰山陨冰劫) grants +50% Additive Damage and +20% Crit Rate to Catapult', () => {
      affix.mountCard('T36');
      const catapult = createWeaponInstance('catapult', 3, { row: 3, col: 2 });
      const bonuses = affix.getAdditiveDamageBonuses(catapult);
      expect(bonuses).toContain(0.50);
      expect(affix.getCritRateBonus(catapult)).toBeGreaterThanOrEqual(0.20);
    });
  });
});
