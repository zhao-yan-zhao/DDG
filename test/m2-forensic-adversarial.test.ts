/**
 * 《孤城神机营》- Forensic Integrity Stress & Boundary Test Suite for Milestone M2
 * Independent Verification by Forensic Auditor
 *
 * Mathematically validates:
 * 1. 5x5 Full Grid Topological Invariants: 40 Orthogonal + 32 Diagonal = 72 Chebyshev contacts.
 * 2. Multi-Grid Contact Deduplication with complex overlapping borders.
 * 3. Exact ICD Floating-Point Boundary Checks (1.49s vs 1.50s, 1.99s vs 2.00s).
 * 4. Boss CC Tenacity and 3-Strike Hard Ceiling under rapid fire.
 * 5. Ice Shatter Max HP Percentage Clamping (Regular 8% vs Boss 3%).
 * 6. Global Reaction Valve 20-Cap Saturation and Tick Reset.
 * 7. Poison Fire Ceiling Non-Accumulation (4.0s clamp).
 * 8. Weapon Upgrade ★1~★4 Monotonic Scaling & ★4 Cap Invariant.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WEAPON_CONFIGS,
  getWeaponConfig,
  getWeaponStarConfig,
  getAllWeaponConfigs
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
  findChebyshevNeighbors
} from '../src/core/bond/adjacency';
import {
  evaluateResonances,
  calculateSynergyBuffs
} from '../src/core/bond/synergy';
import {
  createElementalStatus,
  applyOil,
  applyBurn,
  applyShock,
  applyFreeze,
  applyPoison,
  decayStatus
} from '../src/core/reaction/element-state';
import {
  triggerExplosion,
  triggerThunderStrike,
  triggerIceShatter,
  triggerPoisonFire,
  ReactionValve,
  MAX_REACTIONS_PER_TICK,
  EXPLOSION_ICD,
  ICE_SHATTER_ICD
} from '../src/core/reaction/reaction-valve';
import { EnemyEntity, WeaponInstance } from '../src/core/types';

describe('Forensic Auditor Adversarial Challenge Suite: Milestone M2', () => {
  beforeEach(() => {
    ReactionValve.resetTick();
  });

  // =========================================================================
  // 1. Topological Invariant Test on 5x5 Full Grid
  // =========================================================================
  describe('Invariant 1: 5x5 Complete Grid Graph Theory Invariant', () => {
    it('verifies that a full 5x5 grid of 1x1 units yields EXACTLY 72 Chebyshev bonds and 40 Orthogonal bonds', () => {
      const fullGridWeapons: WeaponInstance[] = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          fullGridWeapons.push(
            createWeaponInstance('fire_lance', 1, { row: r, col: c }, `u_${r}_${c}`)
          );
        }
      }
      expect(fullGridWeapons).toHaveLength(25);

      const allBonds = evaluateAllBonds(fullGridWeapons);

      // Graph Theory Proof:
      // Grid graph 5x5:
      // Horizontal orthogonal edges: 5 rows * 4 connections = 20
      // Vertical orthogonal edges: 5 cols * 4 connections = 20
      // Total orthogonal edges = 40
      // Diagonal edges: 4 * 4 * 2 = 32
      // Total Chebyshev edges = 40 + 32 = 72.
      expect(allBonds).toHaveLength(72);

      const orthogonalBonds = allBonds.filter(b => b.isOrthogonal);
      expect(orthogonalBonds).toHaveLength(40);

      const diagonalOnlyBonds = allBonds.filter(b => !b.isOrthogonal && b.isChebyshev);
      expect(diagonalOnlyBonds).toHaveLength(32);

      // Every single contact must be unique in pair identity
      const pairKeys = new Set<string>();
      for (const b of allBonds) {
        const key = `${b.weaponAId}---${b.weaponBId}`;
        expect(pairKeys.has(key)).toBe(false);
        pairKeys.add(key);
      }
      expect(pairKeys.size).toBe(72);
    });
  });

  // =========================================================================
  // 2. Multi-Grid Geometric Contact Deduplication
  // =========================================================================
  describe('Invariant 2: Complex Multi-Grid Shared Boundary Deduplication', () => {
    it('deduplicates 2x2 Catapult surrounded by four 1x1 units on each side to exactly 4 distinct bonds', () => {
      // Catapult at (1, 1), occupies (1,1), (1,2), (2,1), (2,2)
      const catapult = createWeaponInstance('catapult', 1, { row: 1, col: 1 }, 'center_catapult');
      // North neighbor at (0, 1) touches (1, 1)
      const north = createWeaponInstance('fire_lance', 1, { row: 0, col: 1 }, 'north');
      // South neighbor at (3, 1) touches (2, 1)
      const south = createWeaponInstance('fire_lance', 1, { row: 3, col: 1 }, 'south');
      // West neighbor at (1, 0) touches (1, 1)
      const west = createWeaponInstance('fire_lance', 1, { row: 1, col: 0 }, 'west');
      // East neighbor at (1, 3) touches (1, 2)
      const east = createWeaponInstance('fire_lance', 1, { row: 1, col: 3 }, 'east');

      const weapons = [catapult, north, south, west, east];
      const bonds = evaluateAllBonds(weapons);

      // Bonds involving catapult
      const catapultBonds = bonds.filter(
        b => b.weaponAId === 'center_catapult' || b.weaponBId === 'center_catapult'
      );
      expect(catapultBonds).toHaveLength(4);

      for (const cb of catapultBonds) {
        expect(cb.isOrthogonal).toBe(true);
        expect(cb.isChebyshev).toBe(true);
      }
    });

    it('verifies corner diagonal touch for 2x2 catapults is Chebyshev=true, Orthogonal=false', () => {
      // Cata 1 at (0, 0), occupies (0,0), (0,1), (1,0), (1,1)
      // Cata 2 at (2, 2), occupies (2,2), (2,3), (3,2), (3,3)
      // Nearest cells: (1, 1) and (2, 2) -> delta row = 1, delta col = 1 -> Chebyshev = 1, Manhattan = 2
      const c1 = createWeaponInstance('catapult', 1, { row: 0, col: 0 }, 'c1');
      const c2 = createWeaponInstance('catapult', 1, { row: 2, col: 2 }, 'c2');

      const contact = evaluateContact(c1, c2);
      expect(contact.isChebyshev).toBe(true);
      expect(contact.isOrthogonal).toBe(false);

      const bonds = evaluateAllBonds([c1, c2]);
      expect(bonds).toHaveLength(1);
      expect(bonds[0].isChebyshev).toBe(true);
      expect(bonds[0].isOrthogonal).toBe(false);
    });
  });

  // =========================================================================
  // 3. Floating-Point Boundary & ICD Precision
  // =========================================================================
  describe('Invariant 3: Floating-Point Boundary & ICD Precision', () => {
    it('Explosion ICD strictly rejects t=1.49s and permits t=1.50s', () => {
      const s = createElementalStatus();
      applyOil(s);

      // t=0.0 -> First trigger
      const r1 = triggerExplosion(s, 0.0);
      expect(r1.triggered).toBe(true);

      // Re-apply oil
      applyOil(s);

      // t=1.49s -> Rejected (delta 1.49 < 1.5)
      const r2 = triggerExplosion(s, 1.49);
      expect(r2.triggered).toBe(false);
      expect(r2.reason).toBe('VALVE_COOLDOWN');

      // t=1.50s -> Accepted (delta 1.50 >= 1.5)
      const r3 = triggerExplosion(s, 1.50);
      expect(r3.triggered).toBe(true);
      expect(r3.damage).toBe(180);
    });

    it('Ice Shatter ICD strictly rejects t=1.99s and permits t=2.00s', () => {
      const s = createElementalStatus();
      applyFreeze(s);
      const enemy: EnemyEntity = {
        id: 'e1',
        typeId: 'dummy',
        name: 'Target',
        isBoss: false,
        maxHp: 1000,
        currentHp: 1000,
        armor: 0,
        shield: 0,
        moveSpeed: 1.0
      };

      // t=0.0 -> First trigger
      const r1 = triggerIceShatter(s, enemy, 0.0);
      expect(r1.triggered).toBe(true);

      applyFreeze(s);

      // t=1.99s -> Rejected
      const r2 = triggerIceShatter(s, enemy, 1.99);
      expect(r2.triggered).toBe(false);
      expect(r2.reason).toBe('VALVE_COOLDOWN');

      // t=2.00s -> Accepted
      const r3 = triggerIceShatter(s, enemy, 2.00);
      expect(r3.triggered).toBe(true);
    });
  });

  // =========================================================================
  // 4. Boss Tenacity and Hard Stun Cap Invariant
  // =========================================================================
  describe('Invariant 4: Boss CC Resistance and Stun Hard Cap', () => {
    it('enforces exact 50% tenacity and hard cutoff at exactly 3 stuns', () => {
      const boss: EnemyEntity = {
        id: 'boss_test',
        typeId: 'boss_wanyan',
        name: '完颜宗翰',
        isBoss: true,
        maxHp: 50000,
        currentHp: 50000,
        armor: 100,
        shield: 1000,
        moveSpeed: 0.5
      };

      const s = createElementalStatus();

      // Trigger 1
      applyShock(s);
      applyBurn(s, 3);
      const s1 = triggerThunderStrike(s, boss);
      expect(s1.triggered).toBe(true);
      expect(s1.paralysisDuration).toBe(1.0); // 50% of 2.0s
      expect(boss.shield).toBe(0);

      // Trigger 2
      boss.shield = 500;
      applyShock(s);
      applyBurn(s, 3);
      const s2 = triggerThunderStrike(s, boss);
      expect(s2.triggered).toBe(true);
      expect(boss.shield).toBe(0);

      // Trigger 3
      boss.shield = 500;
      applyShock(s);
      applyBurn(s, 3);
      const s3 = triggerThunderStrike(s, boss);
      expect(s3.triggered).toBe(true);
      expect(boss.shield).toBe(0);

      // Trigger 4 -> Strictly blocked
      boss.shield = 500;
      applyShock(s);
      applyBurn(s, 3);
      const s4 = triggerThunderStrike(s, boss);
      expect(s4.triggered).toBe(false);
      expect(s4.reason).toBe('BOSS_LIMIT_EXCEEDED');
      expect(boss.shield).toBe(500); // Shield untouched
    });
  });

  // =========================================================================
  // 5. Boss Ice Shatter 3% Hard Cap
  // =========================================================================
  describe('Invariant 5: Ice Shatter Percentage Clamping', () => {
    it('clamps damage to 3% max HP on Boss regardless of HP magnitude', () => {
      const bossColossus: EnemyEntity = {
        id: 'boss_colossus',
        typeId: 'colossus',
        name: '巨型攻城兽',
        isBoss: true,
        maxHp: 1000000, // 1 Million HP
        currentHp: 1000000,
        armor: 200,
        shield: 0,
        moveSpeed: 0.2
      };

      const s = createElementalStatus();
      applyFreeze(s);

      const res = triggerIceShatter(s, bossColossus, 1.0);
      expect(res.triggered).toBe(true);
      // 8% would be 80,000. 3% cap must clamp to exactly 30,000.
      expect(res.damage).toBe(30000);
      expect(res.slowRate).toBe(0.40);
    });
  });

  // =========================================================================
  // 6. Global Reaction Valve 20-Cap Saturation
  // =========================================================================
  describe('Invariant 6: Global Reaction Valve 20-Cap Saturation', () => {
    it('blocks exactly from reaction 21 onwards within same tick', () => {
      ReactionValve.resetTick();

      for (let i = 1; i <= MAX_REACTIONS_PER_TICK; i++) {
        const s = createElementalStatus();
        applyOil(s);
        const res = triggerExplosion(s, 0.0);
        expect(res.triggered).toBe(true);
        expect(ReactionValve.getReactionsThisTick()).toBe(i);
      }

      // 21st reaction MUST fail
      const s21 = createElementalStatus();
      applyOil(s21);
      const r21 = triggerExplosion(s21, 0.0);
      expect(r21.triggered).toBe(false);
      expect(r21.reason).toBe('GLOBAL_TICK_CAP_EXCEEDED');
      expect(ReactionValve.getReactionsThisTick()).toBe(20);
    });
  });

  // =========================================================================
  // 7. Poison Fire Ceiling Non-Accumulation
  // =========================================================================
  describe('Invariant 7: Poison Fire Refresh Invariant', () => {
    it('ensures poison fire duration never accumulates past 4.0s upon re-application', () => {
      const s = createElementalStatus();
      applyPoison(s);

      const r1 = triggerPoisonFire(s);
      expect(r1.triggered).toBe(true);
      expect(s.poisonFireDurationRemaining).toBe(4.0);

      // Decay 1 second
      decayStatus(s, 1.0);
      expect(s.poisonFireDurationRemaining).toBe(3.0);

      // Re-trigger poison fire
      const r2 = triggerPoisonFire(s);
      expect(r2.triggered).toBe(true);
      // Must NOT be 3.0 + 4.0 = 7.0! Must be reset to 4.0.
      expect(s.poisonFireDurationRemaining).toBe(4.0);
    });
  });

  // =========================================================================
  // 8. Weapon Upgrade Monotonicity and Cap
  // =========================================================================
  describe('Invariant 8: Weapon Star Upgrade Invariants', () => {
    it('verifies all 16 archetypes scale baseAtk strictly monotonically from ★1 to ★4', () => {
      const allConfigs = getAllWeaponConfigs();

      for (const cfg of allConfigs) {
        let prevAtk = cfg.stars[1].baseAtk;
        // Non-attacking utility buildings (baseAtk = 0 across ★1~★3)
        for (let star = 2 as const; star <= 4; star++) {
          const currentAtk = cfg.stars[star].baseAtk;
          if (prevAtk > 0) {
            expect(currentAtk).toBeGreaterThan(prevAtk);
          } else {
            expect(currentAtk).toBeGreaterThanOrEqual(prevAtk);
          }
          prevAtk = currentAtk;
        }
      }
    });

    it('strictly forbids upgrading past ★4 across all archetypes', () => {
      const allConfigs = getAllWeaponConfigs();
      for (const cfg of allConfigs) {
        const weaponAtStar4 = createWeaponInstance(cfg.id, 4);
        expect(weaponAtStar4.star).toBe(4);
        expect(() => upgradeWeaponInstance(weaponAtStar4)).toThrow(/max star level/);
      }
    });
  });
});
