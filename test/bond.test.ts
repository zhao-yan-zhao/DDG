import { describe, it, expect, beforeEach } from 'vitest';
import {
  WEAPON_CONFIGS,
  getWeaponConfig,
  getWeaponStarConfig,
  getAllWeaponConfigs,
  resolveConfigId
} from '../src/config/weapons.config';
import {
  createWeaponInstance,
  upgradeWeaponInstance,
  WeaponRuntimeState
} from '../src/core/weapon/weapon-instance';
import { WeaponManager } from '../src/core/weapon/weapon-manager';
import {
  getOccupiedCells,
  evaluateContact,
  evaluateAllBonds,
  findOrthogonalNeighbors,
  findChebyshevNeighbors,
  AdjacencyEvaluator
} from '../src/core/bond/adjacency';
import {
  evaluateResonances,
  calculateSynergyBuffs,
  FactionSynergyEvaluator
} from '../src/core/bond/synergy';
import { Faction, StarLevel, WeaponInstance } from '../src/core/types';

describe('Milestone M2: Four Faction Weapons & Adjacency System', () => {
  describe('1. Weapon Configuration Matrix Integrity', () => {
    it('contains all 16 weapon archetypes exactly', () => {
      const allConfigs = getAllWeaponConfigs();
      expect(allConfigs).toHaveLength(16);
      expect(Object.keys(WEAPON_CONFIGS)).toHaveLength(16);
    });

    it('distributes 4 archetypes per faction across all 4 factions', () => {
      const allConfigs = getAllWeaponConfigs();
      const factionCounts: Record<Faction, number> = {
        fire: 0,
        mohist: 0,
        fortress: 0,
        qimen: 0
      };

      for (const cfg of allConfigs) {
        factionCounts[cfg.faction]++;
      }

      expect(factionCounts.fire).toBe(4);
      expect(factionCounts.mohist).toBe(4);
      expect(factionCounts.fortress).toBe(4);
      expect(factionCounts.qimen).toBe(4);
    });

    it('enforces Row 0 exclusivity for all 4 fortress weapons and only fortress weapons', () => {
      const allConfigs = getAllWeaponConfigs();
      for (const cfg of allConfigs) {
        if (cfg.faction === 'fortress') {
          expect(cfg.isFortressOnly).toBe(true);
        } else {
          expect(cfg.isFortressOnly).toBe(false);
        }
      }
    });

    it('has accurate footprints for multi-grid and single-grid archetypes', () => {
      // 1x2 vertical
      const redCannon = getWeaponConfig('red_cannon')!;
      expect(redCannon.stars[1].footprint).toEqual({ width: 1, height: 2 });

      // 2x1 horizontal
      const bedCrossbow = getWeaponConfig('bed_crossbow')!;
      expect(bedCrossbow.stars[1].footprint).toEqual({ width: 2, height: 1 });
      const warDrum = getWeaponConfig('war_drum')!;
      expect(warDrum.stars[1].footprint).toEqual({ width: 2, height: 1 });

      // 2x2田字
      const catapult = getWeaponConfig('catapult')!;
      expect(catapult.stars[1].footprint).toEqual({ width: 2, height: 2 });

      // 1x1 single cell
      const fireLance = getWeaponConfig('fire_lance')!;
      expect(fireLance.stars[1].footprint).toEqual({ width: 1, height: 1 });
    });

    it('validates ★1~★4 numerical configurations and evolution names for all 16 archetypes', () => {
      const allConfigs = getAllWeaponConfigs();
      const stars: StarLevel[] = [1, 2, 3, 4];

      for (const cfg of allConfigs) {
        expect(cfg.id).toBeTruthy();
        expect(cfg.name).toBeTruthy();

        for (const star of stars) {
          const starCfg = cfg.stars[star];
          expect(starCfg).toBeDefined();
          expect(starCfg.star).toBe(star);
          expect(starCfg.cost).toBeGreaterThan(0);
          expect(starCfg.attackInterval).toBeGreaterThan(0);
          expect(starCfg.range).toBeGreaterThanOrEqual(0);
          expect(starCfg.footprint.width).toBeGreaterThanOrEqual(1);
          expect(starCfg.footprint.height).toBeGreaterThanOrEqual(1);
          expect(starCfg.description.length).toBeGreaterThan(0);

          if (star >= 3) {
            expect(starCfg.evolutionName).toBeTruthy();
            expect(starCfg.evolutionName!.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('resolves aliases correctly (iron_barricade, cannon, grid_trap)', () => {
      expect(resolveConfigId('iron_barricade')).toBe('barricade');
      expect(resolveConfigId('cannon')).toBe('red_cannon');
      expect(resolveConfigId('grid_trap')).toBe('electric_grid');

      const barricadeCfg = getWeaponConfig('iron_barricade');
      expect(barricadeCfg).toBeDefined();
      expect(barricadeCfg!.id).toBe('barricade');

      const cannonCfg = getWeaponConfig('cannon');
      expect(cannonCfg).toBeDefined();
      expect(cannonCfg!.id).toBe('red_cannon');
    });
  });

  describe('2. Weapon Instance Entity & Manager', () => {
    it('creates a weapon instance with resolved config and default/custom ID', () => {
      const w1 = createWeaponInstance('fire_lance', 1, { row: 1, col: 2 });
      expect(w1.id).toContain('w_fire_lance');
      expect(w1.configId).toBe('fire_lance');
      expect(w1.name).toBe('神机火铳');
      expect(w1.star).toBe(1);
      expect(w1.faction).toBe('fire');
      expect(w1.anchor).toEqual({ row: 1, col: 2 });
      expect(w1.baseAtk).toBe(40);
      expect(w1.attackInterval).toBeCloseTo(1.2, 2);

      const customId = 'custom_lance_007';
      const wCustom = createWeaponInstance('fire_lance', 2, { row: 2, col: 3 }, customId);
      expect(wCustom.id).toBe(customId);
      expect(wCustom.star).toBe(2);
      expect(wCustom.baseAtk).toBe(72);
    });

    it('throws error for unknown configId or invalid star', () => {
      expect(() => createWeaponInstance('non_existent_weapon', 1, { row: 0, col: 0 })).toThrow();
      expect(() => createWeaponInstance('fire_lance', 5 as any, { row: 0, col: 0 })).toThrow();
    });

    it('upgrades weapon instance stats across ★1 -> ★2 -> ★3 -> ★4 and blocks ★5', () => {
      let weapon = createWeaponInstance('catapult', 1, { row: 2, col: 2 }, 'catapult_main');
      expect(weapon.star).toBe(1);
      expect(weapon.baseAtk).toBe(305);

      weapon = upgradeWeaponInstance(weapon);
      expect(weapon.star).toBe(2);
      expect(weapon.baseAtk).toBe(560);

      weapon = upgradeWeaponInstance(weapon);
      expect(weapon.star).toBe(3);
      expect(weapon.baseAtk).toBe(1005);

      weapon = upgradeWeaponInstance(weapon);
      expect(weapon.star).toBe(4);
      expect(weapon.baseAtk).toBe(1810);

      expect(() => upgradeWeaponInstance(weapon)).toThrow();
    });

    it('manages weapon runtime state and attack cooldowns', () => {
      const weapon = createWeaponInstance('fire_lance', 1, { row: 0, col: 0 });
      const runtime = new WeaponRuntimeState(weapon);

      expect(runtime.isReady()).toBe(true);

      runtime.triggerAttack(10.0, 1.0);
      expect(runtime.isReady()).toBe(false);
      expect(runtime.cooldownRemaining).toBeCloseTo(1.2, 2);
      expect(runtime.totalAttacks).toBe(1);

      runtime.tick(0.7);
      expect(runtime.isReady()).toBe(false);

      runtime.tick(0.6);
      expect(runtime.isReady()).toBe(true);
    });

    it('operates WeaponManager registry properly', () => {
      const manager = new WeaponManager();
      const lance = createWeaponInstance('fire_lance', 1, { row: 1, col: 1 }, 'lance_1');
      const cannon = createWeaponInstance('red_cannon', 1, { row: 1, col: 2 }, 'cannon_1');
      const barricade = createWeaponInstance('barricade', 1, { row: 0, col: 0 }, 'barricade_1');

      manager.registerWeapon(lance);
      manager.registerWeapon(cannon);
      manager.registerWeapon(barricade);

      expect(manager.getAllWeapons()).toHaveLength(3);
      expect(manager.getWeaponsByFaction('fire')).toHaveLength(2);
      expect(manager.getWeaponsByFaction('fortress')).toHaveLength(1);

      const upgraded = manager.upgradeWeapon('lance_1');
      expect(upgraded.star).toBe(2);
      expect(manager.getWeapon('lance_1')?.star).toBe(2);

      manager.unregisterWeapon('cannon_1');
      expect(manager.getAllWeapons()).toHaveLength(2);

      manager.clear();
      expect(manager.getAllWeapons()).toHaveLength(0);
    });
  });

  describe('3. Adjacency Geometry & Multi-Grid Deduplication', () => {
    it('computes occupied cells for various footprints', () => {
      const single = createWeaponInstance('fire_lance', 1, { row: 2, col: 3 });
      expect(getOccupiedCells(single)).toEqual([{ row: 2, col: 3 }]);

      const vertical = createWeaponInstance('red_cannon', 1, { row: 1, col: 2 });
      expect(getOccupiedCells(vertical)).toEqual([
        { row: 1, col: 2 },
        { row: 2, col: 2 }
      ]);

      const horizontal = createWeaponInstance('bed_crossbow', 1, { row: 3, col: 1 });
      expect(getOccupiedCells(horizontal)).toEqual([
        { row: 3, col: 1 },
        { row: 3, col: 2 }
      ]);

      const block2x2 = createWeaponInstance('catapult', 1, { row: 1, col: 1 });
      expect(getOccupiedCells(block2x2)).toEqual([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 }
      ]);
    });

    it('evaluates orthogonal cross and Chebyshev Moore adjacency for 1x1 units', () => {
      const center = createWeaponInstance('fire_lance', 1, { row: 2, col: 2 }, 'center');
      const right = createWeaponInstance('fire_lance', 1, { row: 2, col: 3 }, 'right');
      const top = createWeaponInstance('fire_lance', 1, { row: 3, col: 2 }, 'top');
      const diag = createWeaponInstance('fire_lance', 1, { row: 3, col: 3 }, 'diag');
      const far = createWeaponInstance('fire_lance', 1, { row: 0, col: 0 }, 'far');

      const contactRight = evaluateContact(center, right);
      expect(contactRight.isOrthogonal).toBe(true);
      expect(contactRight.isChebyshev).toBe(true);

      const contactTop = evaluateContact(center, top);
      expect(contactTop.isOrthogonal).toBe(true);
      expect(contactTop.isChebyshev).toBe(true);

      const contactDiag = evaluateContact(center, diag);
      expect(contactDiag.isOrthogonal).toBe(false);
      expect(contactDiag.isChebyshev).toBe(true); // Chebyshev 3x3 Moore

      const contactFar = evaluateContact(center, far);
      expect(contactFar.isOrthogonal).toBe(false);
      expect(contactFar.isChebyshev).toBe(false);
    });

    it('CRITICAL: Deduplicates multi-grid contacts sharing multiple adjacent cells to exactly ONE record', () => {
      // 2x2 catapult at (1, 1) occupies (1,1), (1,2), (2,1), (2,2)
      // 1x2 cannon at (1, 0) occupies (1,0), (2,0)
      // They share 2 contact edges: (1,1)-(1,0) and (2,1)-(2,0)
      const catapult = createWeaponInstance('catapult', 1, { row: 1, col: 1 }, 'catapult');
      const cannon = createWeaponInstance('red_cannon', 1, { row: 1, col: 0 }, 'cannon');

      const contact = evaluateContact(catapult, cannon);
      expect(contact.isOrthogonal).toBe(true);
      expect(contact.isChebyshev).toBe(true);

      const allBonds = evaluateAllBonds([catapult, cannon]);
      expect(allBonds).toHaveLength(1);
      expect(allBonds[0].weaponAId).toBe('catapult');
      expect(allBonds[0].weaponBId).toBe('cannon');
    });

    it('CRITICAL: Deduplicates two 2x2 catapults sharing a 2-cell boundary', () => {
      // Catapult A at (1, 0) occupies cols 0, 1; rows 1, 2
      // Catapult B at (1, 2) occupies cols 2, 3; rows 1, 2
      // Shared boundary cells: (1,1)<->(1,2) and (2,1)<->(2,2)
      const cataA = createWeaponInstance('catapult', 1, { row: 1, col: 0 }, 'cata_A');
      const cataB = createWeaponInstance('catapult', 1, { row: 1, col: 2 }, 'cata_B');

      const allBonds = evaluateAllBonds([cataA, cataB]);
      expect(allBonds).toHaveLength(1);
      expect(allBonds[0].isOrthogonal).toBe(true);
    });

    it('CRITICAL: Deduplicates two 2x1 bed crossbows sharing horizontal cells', () => {
      // Crossbow A at (2, 1) occupies rows 2, cols 1, 2
      // Crossbow B at (3, 1) occupies rows 3, cols 1, 2
      // Shared boundary cells: (2,1)<->(3,1) and (2,2)<->(3,2)
      const bowA = createWeaponInstance('bed_crossbow', 1, { row: 2, col: 1 }, 'bow_A');
      const bowB = createWeaponInstance('bed_crossbow', 1, { row: 3, col: 1 }, 'bow_B');

      const allBonds = evaluateAllBonds([bowA, bowB]);
      expect(allBonds).toHaveLength(1);
      expect(allBonds[0].isOrthogonal).toBe(true);
    });

    it('finds orthogonal and Chebyshev neighbors correctly', () => {
      const center = createWeaponInstance('fire_lance', 1, { row: 2, col: 2 }, 'center');
      const north = createWeaponInstance('fire_lance', 1, { row: 3, col: 2 }, 'north');
      const northEast = createWeaponInstance('fire_lance', 1, { row: 3, col: 3 }, 'northEast');
      const south = createWeaponInstance('fire_lance', 1, { row: 1, col: 2 }, 'south');
      const isolated = createWeaponInstance('fire_lance', 1, { row: 0, col: 0 }, 'isolated');

      const weapons = [center, north, northEast, south, isolated];

      const ortho = findOrthogonalNeighbors(center, weapons);
      expect(ortho.map(w => w.id).sort()).toEqual(['north', 'south'].sort());

      const cheby = findChebyshevNeighbors(center, weapons);
      expect(cheby.map(w => w.id).sort()).toEqual(['north', 'northEast', 'south'].sort());
    });
  });

  describe('4. Faction Synergy Resonance & Buff Calculations', () => {
    it('evaluates 0, 2-piece, and 4-piece activation tiers correctly', () => {
      // 0 weapons
      expect(evaluateResonances([])).toEqual([
        { faction: 'fire', count: 0, tier: 0 },
        { faction: 'mohist', count: 0, tier: 0 },
        { faction: 'fortress', count: 0, tier: 0 },
        { faction: 'qimen', count: 0, tier: 0 }
      ]);

      // 1 fire weapon -> count 1, tier 0
      const wFire1 = createWeaponInstance('fire_lance', 1, { row: 1, col: 1 }, 'f1');
      let res = evaluateResonances([wFire1]);
      expect(res.find(r => r.faction === 'fire')?.tier).toBe(0);

      // 2 fire weapons -> count 2, tier 2
      const wFire2 = createWeaponInstance('rocket_box', 1, { row: 1, col: 2 }, 'f2');
      res = evaluateResonances([wFire1, wFire2]);
      expect(res.find(r => r.faction === 'fire')?.tier).toBe(2);

      // 3 fire weapons -> count 3, tier 2
      const wFire3 = createWeaponInstance('thunder_thrower', 1, { row: 1, col: 3 }, 'f3');
      res = evaluateResonances([wFire1, wFire2, wFire3]);
      expect(res.find(r => r.faction === 'fire')?.tier).toBe(2);

      // 4 fire weapons -> count 4, tier 4
      const wFire4 = createWeaponInstance('red_cannon', 1, { row: 2, col: 0 }, 'f4');
      res = evaluateResonances([wFire1, wFire2, wFire3, wFire4]);
      expect(res.find(r => r.faction === 'fire')?.tier).toBe(4);

      // 5 fire weapons -> count 5, tier 4
      const wFire5 = createWeaponInstance('fire_lance', 1, { row: 3, col: 0 }, 'f5');
      res = evaluateResonances([wFire1, wFire2, wFire3, wFire4, wFire5]);
      expect(res.find(r => r.faction === 'fire')?.tier).toBe(4);
    });

    it('calculates full mathematical buffs for all 4 faction tiers', () => {
      // Case 1: All tier 0
      const buffs0 = calculateSynergyBuffs([]);
      expect(buffs0.fire.reloadSpeedBonus).toBe(0);
      expect(buffs0.fire.maxBurnStacks).toBe(4);
      expect(buffs0.fire.burstChance).toBe(0);
      expect(buffs0.fire.explosionDmgMultiplier).toBe(1.0);

      expect(buffs0.mohist.critRateBonus).toBe(0);
      expect(buffs0.mohist.pierceBonus).toBe(0);
      expect(buffs0.mohist.armorSunderRate).toBe(0);
      expect(buffs0.mohist.multiGridBonus).toBe(0);

      expect(buffs0.fortress.wallHpBonus).toBe(0);
      expect(buffs0.fortress.wallReflectBonus).toBe(0);
      expect(buffs0.fortress.wallRepairRate).toBe(0);
      expect(buffs0.fortress.caltropsThreshold).toBe(0);

      expect(buffs0.qimen.dmgBonusPerQimen).toBe(0);
      expect(buffs0.qimen.totalDmgBonus).toBe(0);
      expect(buffs0.qimen.auraGlobal5x5).toBe(false);

      // Case 2: 2-piece active for Fire and Mohist
      const weaponsTier2 = [
        createWeaponInstance('fire_lance', 1, { row: 1, col: 0 }),
        createWeaponInstance('rocket_box', 1, { row: 1, col: 1 }),
        createWeaponInstance('flame_beast', 1, { row: 2, col: 0 }),
        createWeaponInstance('repeating_crossbow', 1, { row: 2, col: 1 }),
        createWeaponInstance('powder_bureau', 1, { row: 3, col: 0 }),
        createWeaponInstance('war_drum', 1, { row: 3, col: 1 }),
        createWeaponInstance('barricade', 1, { row: 0, col: 0 }),
        createWeaponInstance('oil_cabinet', 1, { row: 0, col: 1 })
      ];

      const buffs2 = calculateSynergyBuffs(weaponsTier2);
      // Fire 2-piece
      expect(buffs2.fire.reloadSpeedBonus).toBe(0.20);
      expect(buffs2.fire.maxBurnStacks).toBe(8);
      expect(buffs2.fire.burstChance).toBe(0);
      expect(buffs2.fire.explosionDmgMultiplier).toBe(1.0);

      // Mohist 2-piece
      expect(buffs2.mohist.critRateBonus).toBe(0.20);
      expect(buffs2.mohist.pierceBonus).toBe(1);
      expect(buffs2.mohist.armorSunderRate).toBe(0);

      // Fortress 2-piece
      expect(buffs2.fortress.wallHpBonus).toBe(400);
      expect(buffs2.fortress.wallReflectBonus).toBe(0.50);
      expect(buffs2.fortress.wallRepairRate).toBe(0);

      // Qimen 2-piece
      expect(buffs2.qimen.dmgBonusPerQimen).toBe(0.10);
      expect(buffs2.qimen.totalDmgBonus).toBeCloseTo(0.20);
      expect(buffs2.qimen.auraGlobal5x5).toBe(false);

      // Case 3: 4-piece active
      const weaponsTier4 = [
        createWeaponInstance('fire_lance', 1, { row: 1, col: 0 }),
        createWeaponInstance('rocket_box', 1, { row: 1, col: 1 }),
        createWeaponInstance('thunder_thrower', 1, { row: 1, col: 2 }),
        createWeaponInstance('red_cannon', 1, { row: 1, col: 3 }),
        createWeaponInstance('flame_beast', 1, { row: 2, col: 0 }),
        createWeaponInstance('repeating_crossbow', 1, { row: 2, col: 1 }),
        createWeaponInstance('bed_crossbow', 1, { row: 2, col: 2 }),
        createWeaponInstance('catapult', 1, { row: 3, col: 0 }),
        createWeaponInstance('barricade', 1, { row: 0, col: 0 }),
        createWeaponInstance('oil_cabinet', 1, { row: 0, col: 1 }),
        createWeaponInstance('electric_grid', 1, { row: 0, col: 2 }),
        createWeaponInstance('spear_camp', 1, { row: 0, col: 3 }),
        createWeaponInstance('powder_bureau', 1, { row: 4, col: 0 }),
        createWeaponInstance('war_drum', 1, { row: 4, col: 1 }),
        createWeaponInstance('stargazer', 1, { row: 4, col: 3 }),
        createWeaponInstance('luban_workshop', 1, { row: 4, col: 4 })
      ];

      const buffs4 = calculateSynergyBuffs(weaponsTier4);
      expect(buffs4.fire.burstChance).toBe(0.20);
      expect(buffs4.fire.explosionDmgMultiplier).toBe(2.0);

      expect(buffs4.mohist.armorSunderRate).toBe(0.05);
      expect(buffs4.mohist.multiGridBonus).toBe(0.40);

      expect(buffs4.fortress.wallRepairRate).toBe(15);
      expect(buffs4.fortress.caltropsThreshold).toBe(200);

      expect(buffs4.qimen.totalDmgBonus).toBeCloseTo(0.40);
      expect(buffs4.qimen.auraGlobal5x5).toBe(true);
    });
  });
});
