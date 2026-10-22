import { describe, it, expect, beforeEach } from 'vitest';
import { GridModel } from '../src/core/grid/grid-model';
import { createWeaponInstance } from '../src/core/weapon/weapon-instance';
import { FrontlineDefenseManager } from '../src/core/defense/frontline-manager';

describe('Frontline Fortification & Lane Defense System Suite', () => {
  let grid: GridModel;

  beforeEach(() => {
    grid = new GridModel();
  });

  describe('1. Bidirectional Row 0 Placement Exclusivity', () => {
    it('allows fortress weapon on Row 0 and assigns independent HP', () => {
      grid.enforceBidirectionalRow0 = true;
      const barricade = createWeaponInstance('barricade', 1);
      const placed = grid.placeWeapon(barricade, { row: 0, col: 2 });

      expect(placed).toBe(true);
      expect(barricade.anchor).toEqual({ row: 0, col: 2 });
      expect(barricade.maxHp).toBe(300);
      expect(barricade.currentHp).toBe(300);
      expect(barricade.isBroken).toBe(false);
    });

    it('rejects fortress weapon on Rows 1~4', () => {
      grid.enforceBidirectionalRow0 = true;
      const barricade = createWeaponInstance('barricade', 1);

      for (let r = 1; r <= 4; r++) {
        const val = grid.validatePlacement(barricade, { row: r, col: 2 });
        expect(val.valid).toBe(false);
        expect(val.code).toBe('FORTRESS_ROW_INVALID');
      }
    });

    it('rejects non-fortress weapon on Row 0 when enforceBidirectionalRow0 is enabled', () => {
      grid.enforceBidirectionalRow0 = true;
      const gun = createWeaponInstance('fire_lance', 1);

      const val = grid.validatePlacement(gun, { row: 0, col: 2 });
      expect(val.valid).toBe(false);
      expect(val.code).toBe('NON_FORTRESS_ROW_INVALID');

      // But valid on Row 1~4
      expect(grid.validatePlacement(gun, { row: 1, col: 2 }).valid).toBe(true);
      expect(grid.validatePlacement(gun, { row: 4, col: 2 }).valid).toBe(true);
    });

    it('flame_beast range rebalanced to 4.5m for Row 1 reach', () => {
      const beast1 = createWeaponInstance('flame_beast', 1);
      expect(beast1.range).toBe(4.5);
      const beast4 = createWeaponInstance('flame_beast', 4);
      expect(beast4.range).toBe(5.2);
    });
  });

  describe('2. Frontline Independent HP & Per-Lane Interception', () => {
    it('intercepts enemy attack in matching column', () => {
      const b0 = createWeaponInstance('barricade', 1, { row: 0, col: 1 });
      const b1 = createWeaponInstance('oil_cabinet', 2, { row: 0, col: 3 });
      grid.placeWeapon(b0, { row: 0, col: 1 });
      grid.placeWeapon(b1, { row: 0, col: 3 });

      const frontline = grid.getAllWeapons().filter(w => w.anchor.row === 0);
      // Enemy attack at X in col 1 (around 267px)
      const target1 = FrontlineDefenseManager.findInterceptingWeapon(frontline, 267);
      expect(target1?.id).toBe(b0.id);

      // Enemy attack at X in col 3 (around 411px)
      const target2 = FrontlineDefenseManager.findInterceptingWeapon(frontline, 411);
      expect(target2?.id).toBe(b1.id);
    });

    it('applies damage and breaks weapon when HP reaches 0', () => {
      const b0 = createWeaponInstance('barricade', 1, { row: 0, col: 2 });
      grid.placeWeapon(b0, { row: 0, col: 2 });
      expect(b0.currentHp).toBe(300);

      // Deal 120 damage
      const res1 = FrontlineDefenseManager.applyDamage(b0, 120);
      expect(res1.actualDeducted).toBe(120);
      expect(b0.currentHp).toBe(180);
      expect(b0.isBroken).toBe(false);

      // Deal 200 damage -> breaks
      const res2 = FrontlineDefenseManager.applyDamage(b0, 200);
      expect(res2.actualDeducted).toBe(180);
      expect(b0.currentHp).toBe(0);
      expect(b0.isBroken).toBe(true);
      expect(res2.isNowBroken).toBe(true);

      // Broken weapon cannot intercept anymore
      const frontline = [b0];
      const target = FrontlineDefenseManager.findInterceptingWeapon(frontline, 375);
      expect(target).toBeNull();
    });

    it('restores all frontline weapons to 100% HP upon wave clear', () => {
      const b0 = createWeaponInstance('barricade', 1, { row: 0, col: 0 });
      const b1 = createWeaponInstance('spear_camp', 1, { row: 0, col: 4 });
      grid.placeWeapon(b0, { row: 0, col: 0 });
      grid.placeWeapon(b1, { row: 0, col: 4 });

      // Damage both
      FrontlineDefenseManager.applyDamage(b0, 300); // broken
      FrontlineDefenseManager.applyDamage(b1, 100); // damaged

      expect(b0.isBroken).toBe(true);
      expect(b1.currentHp).toBe(180);

      // Wave Clear restore
      FrontlineDefenseManager.restoreAllAtWaveClear([b0, b1]);

      expect(b0.currentHp).toBe(300);
      expect(b0.isBroken).toBe(false);
      expect(b1.currentHp).toBe(280);
      expect(b1.isBroken).toBe(false);
    });
  });

  describe('3. Frontline Fortification Resonance Set Bonuses', () => {
    it('activates 2-unit resonance: +20% HP', () => {
      const w1 = createWeaponInstance('barricade', 1, { row: 0, col: 0 });
      const w2 = createWeaponInstance('barricade', 1, { row: 0, col: 1 });
      const res = FrontlineDefenseManager.calculateResonance([w1, w2]);

      expect(res.activeCount).toBe(2);
      expect(res.maxHpBonusMultiplier).toBe(0.20);
      expect(res.damageReduction).toBe(0);
      expect(res.thornsReflectRatio).toBe(0);
    });

    it('activates 3-unit resonance: +20% HP and 15% Damage Reduction', () => {
      const weapons = [
        createWeaponInstance('barricade', 1, { row: 0, col: 0 }),
        createWeaponInstance('oil_cabinet', 1, { row: 0, col: 1 }),
        createWeaponInstance('electric_grid', 1, { row: 0, col: 2 })
      ];
      const res = FrontlineDefenseManager.calculateResonance(weapons);

      expect(res.activeCount).toBe(3);
      expect(res.damageReduction).toBe(0.15);

      // Test damage reduction in application
      const w = weapons[0];
      const dmgRes = FrontlineDefenseManager.applyDamage(w, 100, res);
      // 100 * (1 - 0.15) = 85 damage deducted
      expect(dmgRes.actualDeducted).toBe(85);
    });

    it('activates 4-unit resonance: +35% HP and 20% Thorns Reflect', () => {
      const weapons = [
        createWeaponInstance('barricade', 1, { row: 0, col: 0 }),
        createWeaponInstance('oil_cabinet', 1, { row: 0, col: 1 }),
        createWeaponInstance('electric_grid', 1, { row: 0, col: 2 }),
        createWeaponInstance('spear_camp', 1, { row: 0, col: 3 })
      ];
      const res = FrontlineDefenseManager.calculateResonance(weapons);

      expect(res.activeCount).toBe(4);
      expect(res.maxHpBonusMultiplier).toBe(0.35);
      expect(res.thornsReflectRatio).toBe(0.20);

      const w = weapons[0];
      const dmgRes = FrontlineDefenseManager.applyDamage(w, 100, res);
      // 85 deducted * 0.20 = 17 reflected
      expect(dmgRes.reflectedDamage).toBe(17);
    });

    it('activates 5-unit resonance: +50% HP and 30% Wall Ranged DR', () => {
      const weapons = [
        createWeaponInstance('barricade', 1, { row: 0, col: 0 }),
        createWeaponInstance('oil_cabinet', 1, { row: 0, col: 1 }),
        createWeaponInstance('electric_grid', 1, { row: 0, col: 2 }),
        createWeaponInstance('spear_camp', 1, { row: 0, col: 3 }),
        createWeaponInstance('barricade', 2, { row: 0, col: 4 })
      ];
      const res = FrontlineDefenseManager.calculateResonance(weapons);

      expect(res.activeCount).toBe(5);
      expect(res.maxHpBonusMultiplier).toBe(0.50);
      expect(res.wallRangedDr).toBe(0.30);
    });
  });

  describe('4. Lane-Based Physical Interception & Barrier Stop Lines', () => {
    it('generates frontlineStopYByLane based on active Row 0 weapon positions', () => {
      const b0 = createWeaponInstance('barricade', 1, { row: 0, col: 1 });
      const b1 = createWeaponInstance('barricade', 1, { row: 0, col: 3 });
      FrontlineDefenseManager.initFrontlineWeapon(b0);
      FrontlineDefenseManager.initFrontlineWeapon(b1);
      const frontlineWeapons = [b0, b1];

      const frontlineStopYByLane = [840, 840, 840, 840, 840];
      for (const w of frontlineWeapons) {
        if (!w.isBroken && (w.currentHp ?? 0) > 0) {
          const startCol = w.anchor.col;
          const endCol = startCol + (w.footprint?.width || 1);
          for (let c = startCol; c < endCol; c++) {
            if (c >= 0 && c < 5) {
              frontlineStopYByLane[c] = 926;
            }
          }
        }
      }

      // Lanes 1 & 3 blocked at 926, others open to 840
      expect(frontlineStopYByLane).toEqual([840, 926, 840, 926, 840]);

      // When barricade at col 1 breaks
      b0.isBroken = true;
      b0.currentHp = 0;

      const updatedStopY = [840, 840, 840, 840, 840];
      for (const w of frontlineWeapons) {
        if (!w.isBroken && (w.currentHp ?? 0) > 0) {
          const startCol = w.anchor.col;
          const endCol = startCol + (w.footprint?.width || 1);
          for (let c = startCol; c < endCol; c++) {
            if (c >= 0 && c < 5) {
              updatedStopY[c] = 926;
            }
          }
        }
      }

      // Lane 1 unblocked and recovered to 840
      expect(updatedStopY).toEqual([840, 840, 840, 926, 840]);
    });
  });
});
