/**
 * 《孤城神机营》- Milestone M3 Adversarial Challenge & Stress Tests
 * Challenger 2: Empirical Verification of Spatial Targeting, Ballistics, and Commander Rage Systems
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialTargetingSystem, selectTarget } from '../src/core/combat/targeting';
import { ProjectileManager } from '../src/core/combat/projectile';
import { Commander } from '../src/core/commander/commander';
import { getCommanderConfig, ALL_COMMANDERS } from '../src/config/commanders.config';
import { WeaponInstance, EnemyEntity, DamageCalculationContext } from '../src/core/types';

function createWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: 'w_test_cannon',
    configId: 'cannon',
    name: '虎蹲炮',
    star: 2,
    faction: 'fire',
    footprint: { width: 1, height: 1 },
    anchor: { row: 0, col: 2 }, // Row 0 center (x = 375px, y = 502px)
    isFortressOnly: false,
    baseAtk: 120,
    attackInterval: 2.0,
    range: 10.0, // 10 meters default
    ...overrides
  };
}

function createEnemy(overrides: Partial<EnemyEntity> = {}): EnemyEntity {
  return {
    id: `e_${Math.random().toString(36).substring(2, 8)}`,
    typeId: 'armored_infantry',
    name: '精锐步兵',
    isBoss: false,
    maxHp: 1000,
    currentHp: 1000,
    armor: 40,
    shield: 0,
    moveSpeed: 1.0,
    distanceToWall: 5.0,
    ...overrides
  };
}

describe('Challenger 2 M3: Spatial Targeting Adversarial Stress Tests', () => {
  const weapon = createWeapon({ range: 8.0 });

  describe('Out of Range Filtering & Boundary Conditions', () => {
    it('strictly rejects enemies outside weapon range (> weapon.range)', () => {
      // 1D track enemies
      const inRange1 = createEnemy({ id: 'in_1', distanceToWall: 7.9 });
      const atBoundary = createEnemy({ id: 'boundary', distanceToWall: 8.0 });
      const justOut = createEnemy({ id: 'just_out', distanceToWall: 8.1 });
      const farOut = createEnemy({ id: 'far_out', distanceToWall: 25.0 });

      const filtered = SpatialTargetingSystem.filterInRange(weapon, [inRange1, atBoundary, justOut, farOut]);
      const ids = filtered.map(e => e.id);

      expect(ids).toContain('in_1');
      expect(ids).not.toContain('just_out');
      expect(ids).not.toContain('far_out');
    });

    it('returns null when all enemies in the pool are outside weapon range', () => {
      const out1 = createEnemy({ id: 'out1', distanceToWall: 8.5 });
      const out2 = createEnemy({ id: 'out2', distanceToWall: 12.0 });
      const out3 = createEnemy({ id: 'out3', distanceToWall: 30.0 });

      expect(selectTarget(weapon, [out1, out2, out3], 'First')).toBeNull();
      expect(selectTarget(weapon, [out1, out2, out3], 'Strongest')).toBeNull();
      expect(selectTarget(weapon, [out1, out2, out3], 'ClusterAOE')).toBeNull();
    });

    it('accounts for weapon row depth: Row 4 weapon cannot reach enemies reachable by Row 0 weapon', () => {
      // Weapon on Row 0 (frontline wall): anchor.row = 0
      const frontlineWeapon = createWeapon({ anchor: { row: 0, col: 2 }, range: 5.0 });
      // Weapon on Row 4 (back row): anchor.row = 4 (adds depth)
      const backlineWeapon = createWeapon({ anchor: { row: 4, col: 2 }, range: 5.0 });

      // Enemy at 4.6m from wall
      const enemy = createEnemy({ id: 'mid_enemy', distanceToWall: 4.6 });

      const frontlineTargets = SpatialTargetingSystem.filterInRange(frontlineWeapon, [enemy]);
      const backlineTargets = SpatialTargetingSystem.filterInRange(backlineWeapon, [enemy]);

      // Frontline weapon rowOffset = 0.5 * 76/68 = 0.558m -> dist = sqrt(4.6^2 + 0.558^2) = 4.63m <= 5.0m
      expect(frontlineTargets.length).toBe(1);
      // Backline weapon rowOffset = 4.5 * 76/68 = 5.029m -> dist = sqrt(4.6^2 + 5.029^2) = 6.81m > 5.0m
      expect(backlineTargets.length).toBe(0);
    });
  });

  describe('Empty Enemy Pool & Dead Enemy Immunity', () => {
    it('returns null safely for empty enemy array [] across all strategies without throwing', () => {
      expect(selectTarget(weapon, [], 'First')).toBeNull();
      expect(selectTarget(weapon, [], 'Strongest')).toBeNull();
      expect(selectTarget(weapon, [], 'ClusterAOE')).toBeNull();
    });

    it('returns null safely when all enemies have currentHp <= 0', () => {
      const dead1 = createEnemy({ id: 'd1', currentHp: 0, distanceToWall: 2.0 });
      const dead2 = createEnemy({ id: 'd2', currentHp: -100, distanceToWall: 3.0 });
      const dead3 = createEnemy({ id: 'd3', currentHp: 0, distanceToWall: 1.0 });

      expect(selectTarget(weapon, [dead1, dead2, dead3], 'First')).toBeNull();
      expect(selectTarget(weapon, [dead1, dead2, dead3], 'Strongest')).toBeNull();
      expect(selectTarget(weapon, [dead1, dead2, dead3], 'ClusterAOE')).toBeNull();
    });
  });

  describe('ClusterAOE: Overlapping Clusters & Maximum Density Identification', () => {
    it('selects the true maximum density candidate in overlapping clusters within weapon range', () => {
      // Weapon range = 10.0m. Place weapon at custom origin (0, 0)
      const w = createWeapon({ range: 10.0 });
      const customPos = { x: 0, y: 0 }; // Meter coordinates

      // Cluster A: Sparse cluster centered around (2.0, 4.0) with 2 enemies in radius 1.5m
      const a1 = createEnemy({ id: 'a1', x: 2.0, y: 4.0, distanceToWall: 4.0, currentHp: 500 });
      const a2 = createEnemy({ id: 'a2', x: 2.2, y: 4.3, distanceToWall: 4.3, currentHp: 500 });

      // Cluster B: Dense cluster around (0.0, 5.0) with 5 enemies in radius 1.5m
      const bCenter = createEnemy({ id: 'b_center', x: 0.0, y: 5.0, distanceToWall: 5.0, currentHp: 500 });
      const b1 = createEnemy({ id: 'b1', x: 0.3, y: 5.2, distanceToWall: 5.2, currentHp: 500 });
      const b2 = createEnemy({ id: 'b2', x: -0.4, y: 4.8, distanceToWall: 4.8, currentHp: 500 });
      const b3 = createEnemy({ id: 'b3', x: 0.2, y: 4.6, distanceToWall: 4.6, currentHp: 500 });
      const b4 = createEnemy({ id: 'b4', x: -0.2, y: 5.4, distanceToWall: 5.4, currentHp: 500 });

      const all = [a1, a2, bCenter, b1, b2, b3, b4];
      const target = SpatialTargetingSystem.selectTarget(w, all, 'ClusterAOE', {
        weaponPos: customPos,
        aoeRadius: 1.5
      });

      expect(target).not.toBeNull();
      // Must be one of the Cluster B members, never Cluster A
      expect(['b_center', 'b1', 'b2', 'b3', 'b4']).toContain(target?.id);
    });

    it('rejects high-density clusters outside weapon range in favor of in-range clusters', () => {
      const w = createWeapon({ range: 6.0 }); // 6m range
      const customPos = { x: 0, y: 0 };

      // Huge out-of-range cluster at y = 12m (10 enemies)
      const outEnemies: EnemyEntity[] = [];
      for (let i = 0; i < 10; i++) {
        outEnemies.push(createEnemy({
          id: `out_swarm_${i}`,
          x: 0.1 * i,
          y: 12.0 + 0.1 * i,
          distanceToWall: 12.0,
          currentHp: 400
        }));
      }

      // Small in-range cluster at y = 3m (2 enemies)
      const in1 = createEnemy({ id: 'in_1', x: 0.0, y: 3.0, distanceToWall: 3.0, currentHp: 500 });
      const in2 = createEnemy({ id: 'in_2', x: 0.2, y: 3.1, distanceToWall: 3.1, currentHp: 500 });

      const target = SpatialTargetingSystem.selectTarget(w, [...outEnemies, in1, in2], 'ClusterAOE', {
        weaponPos: customPos,
        aoeRadius: 1.5
      });

      expect(target).not.toBeNull();
      expect(['in_1', 'in_2']).toContain(target?.id);
    });

    it('resolves density ties by selecting the candidate closer to the city wall', () => {
      const w = createWeapon({ range: 10.0 });
      const customPos = { x: 0, y: 0 };

      // Cluster 1: 3 enemies at distance 3.0m from wall
      const c1_center = createEnemy({ id: 'c1_close', x: 1.0, y: 3.0, distanceToWall: 3.0, currentHp: 500 });
      const c1_a = createEnemy({ id: 'c1_a', x: 1.2, y: 3.1, distanceToWall: 3.1, currentHp: 500 });
      const c1_b = createEnemy({ id: 'c1_b', x: 0.9, y: 2.9, distanceToWall: 2.9, currentHp: 500 });

      // Cluster 2: 3 enemies at distance 6.0m from wall
      const c2_center = createEnemy({ id: 'c2_far', x: -1.0, y: 6.0, distanceToWall: 6.0, currentHp: 500 });
      const c2_a = createEnemy({ id: 'c2_a', x: -1.2, y: 6.1, distanceToWall: 6.1, currentHp: 500 });
      const c2_b = createEnemy({ id: 'c2_b', x: -0.8, y: 5.9, distanceToWall: 5.9, currentHp: 500 });

      const target = SpatialTargetingSystem.selectTarget(
        w,
        [c2_center, c2_a, c2_b, c1_center, c1_a, c1_b],
        'ClusterAOE',
        { weaponPos: customPos, aoeRadius: 1.5 }
      );

      expect(target).not.toBeNull();
      // Both clusters have count = 3, but Cluster 1 is closer to wall (y ~ 3.0 vs 6.0)
      expect(['c1_close', 'c1_a', 'c1_b']).toContain(target?.id);
    });

    it('correctly calculates distance and collects splash targets for close-proximity pixel coordinate enemies', () => {
      // Enemy 1 at (375, 700) px (screen center, battlefield)
      // Enemy 2 at (395, 700) px (20 pixels away, which is 20/68 = 0.294 meters in physical space)
      const e1 = createEnemy({ id: 'px1', x: 375, y: 700 });
      const e2 = createEnemy({ id: 'px2', x: 395, y: 700 });

      const dist = SpatialTargetingSystem.getDistanceBetweenEnemies(e1, e2);
      // Coordinate space detection recognizes pixel coordinates (> 50px), properly dividing by 68
      expect(dist).toBeCloseTo(20 / 68, 4);
      
      // With aoeRadius = 2.0 meters, e2 is well within splash range (0.294m <= 2.0m),
      // and getSplashTargets properly collects e2!
      const splashTargets = SpatialTargetingSystem.getSplashTargets(e1, [e1, e2], 2.0);
      expect(splashTargets.length).toBe(1);
      expect(splashTargets[0].id).toBe('px2');
    });
  });
});

describe('Challenger 2 M3: Ballistics & Trajectory Resolution Stress Tests', () => {
  let projectileManager: ProjectileManager;
  let weapon: WeaponInstance;
  let target: EnemyEntity;
  let damageCtx: DamageCalculationContext;

  beforeEach(() => {
    projectileManager = new ProjectileManager();
    weapon = createWeapon({ baseAtk: 150 });
    target = createEnemy({ armor: 0, currentHp: 1000, x: 5, y: 15 });
    damageCtx = {
      attacker: weapon,
      target,
      skillMultiplier: 1.0,
      additiveBonuses: [],
      independentMultipliers: [],
      critRateBonus: 0,
      critDmgBonus: 0,
      sunderFlat: 0,
      sunderRate: 0,
      vulnerability: 0,
      specialReduction: 0
    };
  });

  describe('Flight Time Precision ($travelTime = distance / speed$)', () => {
    it('calculates exact flight time matching distance / speed in meter coordinate space', () => {
      const customStart = { x: 0, y: 0 };  // weapon at origin
      const customTarget = { x: 0, y: 20 }; // target 20 meters away
      const speed = 10.0; // 10 m/s -> travelTime should be exactly 2.0s

      const proj = projectileManager.spawn(
        weapon,
        target,
        damageCtx,
        { speed },
        customStart,
        customTarget
      );

      // Distance = 20, speed = 10 -> travelTime = 2.0s
      expect(proj.travelTime).toBeCloseTo(2.0, 4);
    });

    it('enforces flight time minimum floor of 0.04s for point-blank targets', () => {
      const customStart = { x: 10, y: 10 };
      const customTarget = { x: 10, y: 10.1 }; // 0.1m away, speed 20m/s -> 0.005s
      const proj = projectileManager.spawn(
        weapon,
        target,
        damageCtx,
        { speed: 20.0 },
        customStart,
        customTarget
      );

      expect(proj.travelTime).toBe(0.04);
    });
  });

  describe('Linear & Parabolic Projectile Arc Trajectory at 0.0, 0.5, 1.0 Progress', () => {
    it('computes exact parabolic arc heights at 0.0, 0.25, 0.5, 0.75, 1.0 progress', () => {
      const customStart = { x: 100, y: 500 };
      const customTarget = { x: 100, y: 900 };
      const arcHeight = 120; // 120 px arc height

      const proj = projectileManager.spawn(
        weapon,
        target,
        damageCtx,
        { speed: 10.0, isHighArc: true, arcHeight },
        customStart,
        customTarget
      );

      // At progress 0.0 (launch)
      expect(proj.progress).toBe(0.0);
      expect(proj.currentY).toBe(500);
      expect(proj.visualY).toBe(500); // arcOffset = 4 * 120 * 0 * 1 = 0

      // Advance to progress 0.25
      projectileManager.update(proj.travelTime * 0.25);
      expect(proj.progress).toBeCloseTo(0.25, 3);
      // currentY = 500 + 400 * 0.25 = 600
      expect(proj.currentY).toBeCloseTo(600, 2);
      // arcOffset = 4 * 120 * 0.25 * 0.75 = 90
      // visualY = 600 - 90 = 510
      expect(proj.visualY).toBeCloseTo(510, 2);

      // Advance to progress 0.50 (peak of parabolic arc)
      projectileManager.update(proj.travelTime * 0.25);
      expect(proj.progress).toBeCloseTo(0.50, 3);
      // currentY = 500 + 400 * 0.50 = 700
      expect(proj.currentY).toBeCloseTo(700, 2);
      // arcOffset = 4 * 120 * 0.5 * 0.5 = 120 (full arcHeight!)
      // visualY = 700 - 120 = 580
      expect(proj.visualY).toBeCloseTo(580, 2);

      // Advance to progress 0.75
      projectileManager.update(proj.travelTime * 0.25);
      expect(proj.progress).toBeCloseTo(0.75, 3);
      // currentY = 500 + 400 * 0.75 = 800
      expect(proj.currentY).toBeCloseTo(800, 2);
      // arcOffset = 4 * 120 * 0.75 * 0.25 = 90
      // visualY = 800 - 90 = 710
      expect(proj.visualY).toBeCloseTo(710, 2);

      // Advance to progress 1.0 (impact)
      const events = projectileManager.update(proj.travelTime * 0.25 + 0.01);
      expect(events.length).toBe(1);
      const impactProj = events[0].projectile;
      expect(impactProj.progress).toBe(1.0);
      expect(impactProj.currentY).toBe(900);
      expect(impactProj.visualY).toBe(900); // arcOffset = 0 at impact
      expect(events[0].hit).toBe(true);
    });

    it('linear trajectory maintains visualY === currentY throughout whole flight', () => {
      const customStart = { x: 50, y: 100 };
      const customTarget = { x: 50, y: 500 };

      const proj = projectileManager.spawn(
        weapon,
        target,
        damageCtx,
        { speed: 10.0, isHighArc: false },
        customStart,
        customTarget
      );

      // 0.0
      expect(proj.visualY).toBe(proj.currentY);

      // 0.5
      projectileManager.update(proj.travelTime * 0.5);
      expect(proj.progress).toBeCloseTo(0.5, 3);
      expect(proj.visualY).toBe(proj.currentY);
      expect(proj.visualY).toBeCloseTo(300, 2);

      // 1.0
      const events = projectileManager.update(proj.travelTime * 0.5 + 0.01);
      expect(events[0].projectile.visualY).toBe(events[0].projectile.currentY);
      expect(events[0].projectile.visualY).toBe(500);
    });
  });

  describe('Splash Radius Hit Collection & Isolation', () => {
    it('deals splash damage only to enemies within aoeRadius while distant enemies take 0', () => {
      // Primary target at (0, 4) in meters
      const primary = createEnemy({ id: 'primary', armor: 0, currentHp: 1000, x: 0.0, y: 4.0 });
      // Near enemy within 2.0m splash radius (dist = 1.0m)
      const near1 = createEnemy({ id: 'near1', armor: 0, currentHp: 600, x: 1.0, y: 4.0 });
      // Near enemy within 2.0m splash radius (dist = 1.414m)
      const near2 = createEnemy({ id: 'near2', armor: 0, currentHp: 600, x: -1.0, y: 5.0 });
      // Distant enemy outside 2.0m splash radius (dist = 3.0m)
      const far1 = createEnemy({ id: 'far1', armor: 0, currentHp: 600, x: 3.0, y: 4.0 });
      // Distant enemy far away (dist = 10m)
      const far2 = createEnemy({ id: 'far2', armor: 0, currentHp: 600, x: 0.0, y: 14.0 });
      // Dead enemy in blast zone
      const deadNear = createEnemy({ id: 'dead_near', armor: 0, currentHp: 0, x: 0.2, y: 4.1 });

      const ctx: DamageCalculationContext = { ...damageCtx, target: primary };
      const proj = projectileManager.spawn(weapon, primary, ctx, { speed: 20.0, aoeRadius: 2.0 });

      const allEnemies = [primary, near1, near2, far1, far2, deadNear];
      const events = projectileManager.update(proj.travelTime + 0.05, allEnemies);

      expect(events.length).toBe(1);
      const hitEvent = events[0];

      // Primary took 150 damage (baseAtk = 150, armor = 0)
      expect(primary.currentHp).toBe(850);
      // Near enemies took 150 splash damage
      expect(near1.currentHp).toBe(450);
      expect(near2.currentHp).toBe(450);
      // Distant enemies took 0 damage
      expect(far1.currentHp).toBe(600);
      expect(far2.currentHp).toBe(600);
      // Dead enemy remained at 0
      expect(deadNear.currentHp).toBe(0);

      // Verify splashTargets list excludes primary and dead
      const splashIds = hitEvent.splashTargets?.map(e => e.id) || [];
      expect(splashIds).toContain('near1');
      expect(splashIds).toContain('near2');
      expect(splashIds).not.toContain('primary');
      expect(splashIds).not.toContain('far1');
      expect(splashIds).not.toContain('far2');
      expect(splashIds).not.toContain('dead_near');
    });
  });
});

describe('Challenger 2 M3: Commander Rage & Ultimate Stress Tests', () => {
  describe('Wang Shouren: Rage Gating & Ultimate Effects', () => {
    it('strictly rejects ultimate cast at 99 rage, succeeds at 100 rage, and resets rage to 0', () => {
      const wang = new Commander('wang_shouren');
      expect(wang.rage).toBe(0);

      // Attempt at 99 rage
      wang.setRage(99);
      expect(wang.canCastUltimate()).toBe(false);
      const rejected = wang.castUltimate();
      expect(rejected.success).toBe(false);
      expect(rejected.reason).toBe('NOT_ENOUGH_RAGE');
      expect(wang.rage).toBe(99); // Rage not consumed on failure
      expect(wang.isUltimateActive).toBe(false);

      // Add 1 rage to reach 100
      wang.addRage(1);
      expect(wang.rage).toBe(100);
      expect(wang.canCastUltimate()).toBe(true);

      // Cast at 100 rage
      const success = wang.castUltimate();
      expect(success.success).toBe(true);
      expect(wang.rage).toBe(0); // Strictly consumed
      expect(wang.isUltimateActive).toBe(true);
      expect(wang.ultimateRemainingDuration).toBe(5.0);

      // Validate config specifications
      const ult = success.ultimate!;
      expect(ult.reloadSpeedBonus).toBe(1.50); // +150% reload speed buff
      expect(ult.resetAllWeaponCooldowns).toBe(true);
      expect(ult.firearmsMultiShot).toBe(true);
    });

    it('ticks delta cleanly: decrements duration and expires active ultimate state', () => {
      const wang = new Commander('wang_shouren');
      wang.setRage(100);
      wang.castUltimate();

      // Tick 1.5 seconds
      wang.tick(1.5);
      expect(wang.ultimateRemainingDuration).toBeCloseTo(3.5, 3);
      expect(wang.isUltimateActive).toBe(true);

      // Tick 2.0 seconds
      wang.tick(2.0);
      expect(wang.ultimateRemainingDuration).toBeCloseTo(1.5, 3);
      expect(wang.isUltimateActive).toBe(true);

      // Tick 1.5 seconds (exact expiration)
      wang.tick(1.5);
      expect(wang.ultimateRemainingDuration).toBe(0);
      expect(wang.isUltimateActive).toBe(false);

      // Extra tick does not underflow
      wang.tick(2.0);
      expect(wang.ultimateRemainingDuration).toBe(0);
      expect(wang.isUltimateActive).toBe(false);
    });
  });

  describe('Barrier Absorption (Qin Huali)', () => {
    it('absorbs incoming damage without leaking until barrier HP is fully depleted', () => {
      const qin = new Commander('qin_huali');
      qin.setRage(100);
      qin.castUltimate();

      expect(qin.barrierHp).toBe(2000);
      expect(qin.isUltimateActive).toBe(true);

      // Hit 1: 600 damage -> fully absorbed, 0 leaks
      const res1 = qin.absorbBarrierDamage(600);
      expect(res1.absorbed).toBe(600);
      expect(res1.remainingDamage).toBe(0);
      expect(qin.barrierHp).toBe(1400);

      // Hit 2: 900 damage -> fully absorbed, 0 leaks
      const res2 = qin.absorbBarrierDamage(900);
      expect(res2.absorbed).toBe(900);
      expect(res2.remainingDamage).toBe(0);
      expect(qin.barrierHp).toBe(500);

      // Hit 3: 800 damage -> absorbs remaining 500, leaks 300
      const res3 = qin.absorbBarrierDamage(800);
      expect(res3.absorbed).toBe(500);
      expect(res3.remainingDamage).toBe(300);
      expect(qin.barrierHp).toBe(0);

      // Hit 4: 400 damage -> barrier depleted, 0 absorbed, all 400 leaks
      const res4 = qin.absorbBarrierDamage(400);
      expect(res4.absorbed).toBe(0);
      expect(res4.remainingDamage).toBe(400);
      expect(qin.barrierHp).toBe(0);
    });

    it('barrier HP drops to 0 immediately if ultimate duration expires before depletion', () => {
      const qin = new Commander('qin_huali');
      qin.setRage(100);
      qin.castUltimate();

      // Absorb 500 damage -> 1500 barrier remaining
      qin.absorbBarrierDamage(500);
      expect(qin.barrierHp).toBe(1500);

      // Tick entire 6.0s duration
      qin.tick(6.1);
      expect(qin.ultimateRemainingDuration).toBe(0);
      expect(qin.isUltimateActive).toBe(false);
      expect(qin.barrierHp).toBe(0); // Barrier expired

      // Further damage takes full effect
      const res = qin.absorbBarrierDamage(500);
      expect(res.absorbed).toBe(0);
      expect(res.remainingDamage).toBe(500);
    });
  });

  describe('Instant Cast Ultimates: Qin Liangyu & Liu Bowen', () => {
    it('Qin Liangyu: executes instant ultimate at 100 rage without lingering duration state', () => {
      const qin = new Commander('qin_liangyu');
      qin.setRage(100);
      expect(qin.canCastUltimate()).toBe(true);

      const res = qin.castUltimate();
      expect(res.success).toBe(true);
      expect(qin.rage).toBe(0);
      expect(res.ultimate?.damage).toBe(500);
      expect(res.ultimate?.cavalryCount).toBe(8);
      // Instant ultimate has duration = 0, so isUltimateActive remains false
      expect(qin.isUltimateActive).toBe(false);
      expect(qin.ultimateRemainingDuration).toBe(0);
    });

    it('Liu Bowen: executes instant ultimate at 100 rage inflicting shock without lingering duration', () => {
      const liu = new Commander('liu_bowen');
      liu.setRage(100);
      expect(liu.canCastUltimate()).toBe(true);

      const res = liu.castUltimate();
      expect(res.success).toBe(true);
      expect(liu.rage).toBe(0);
      expect(res.ultimate?.damage).toBe(300);
      expect(res.ultimate?.lightningStrikes).toBe(9);
      expect(res.ultimate?.inflictsShock).toBe(true);
      expect(liu.isUltimateActive).toBe(false);
      expect(liu.ultimateRemainingDuration).toBe(0);
    });

    it('strict rage bounds: handles negative and extreme rage inputs safely', () => {
      const commander = new Commander('wang_shouren');
      commander.addRage(-999);
      expect(commander.rage).toBe(0);

      commander.addRage(999);
      expect(commander.rage).toBe(100);

      commander.setRage(-50);
      expect(commander.rage).toBe(0);

      commander.setRage(500);
      expect(commander.rage).toBe(100);
    });
  });

  describe('Ballistics 60 FPS Multi-step Simulation & Armored Splash', () => {
    it('accurately resolves impact through multi-frame 16ms delta steps', () => {
      const projMgr = new ProjectileManager();
      const w = createWeapon({ baseAtk: 200 });
      const t = createEnemy({ armor: 0, currentHp: 800, x: 0, y: 10 });
      const ctx: DamageCalculationContext = {
        attacker: w,
        target: t,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      // Speed 20m/s, distance 10m -> travelTime = 0.5s
      const proj = projMgr.spawn(w, t, ctx, { speed: 20.0 }, { x: 0, y: 0 }, { x: 0, y: 10 });
      expect(proj.travelTime).toBeCloseTo(0.5, 3);

      const dt = 0.01667; // ~60 FPS (16.67ms)
      let totalSteps = 0;
      let hitEvents: any[] = [];

      // Step until hit (approx 30 steps)
      while (hitEvents.length === 0 && totalSteps < 40) {
        hitEvents = projMgr.update(dt);
        totalSteps++;
      }

      expect(hitEvents.length).toBe(1);
      expect(hitEvents[0].hit).toBe(true);
      expect(t.currentHp).toBe(600);
      expect(projMgr.getActiveCount()).toBe(0);
      expect(totalSteps).toBe(30); // 30 frames * 0.01667s = 0.5001s
    });

    it('calculates armor damage reduction independently for each splash target', () => {
      const projMgr = new ProjectileManager();
      const w = createWeapon({ baseAtk: 300 });
      const primary = createEnemy({ id: 'prim', armor: 0, currentHp: 1000, x: 0, y: 5 });
      // Splash target with heavy armor (150 armor -> 50% DR)
      const armoredSplash = createEnemy({ id: 'armored', armor: 150, currentHp: 1000, x: 0.5, y: 5.0 });
      // Splash target with unarmored (0 armor -> 0% DR)
      const unarmoredSplash = createEnemy({ id: 'unarmored', armor: 0, currentHp: 1000, x: -0.5, y: 5.0 });

      const ctx: DamageCalculationContext = {
        attacker: w,
        target: primary,
        skillMultiplier: 1.0,
        additiveBonuses: [],
        independentMultipliers: [],
        critRateBonus: 0,
        critDmgBonus: 0,
        sunderFlat: 0,
        sunderRate: 0,
        vulnerability: 0,
        specialReduction: 0
      };

      const proj = projMgr.spawn(w, primary, ctx, { speed: 20.0, aoeRadius: 2.0 });
      const allEnemies = [primary, armoredSplash, unarmoredSplash];
      const events = projMgr.update(proj.travelTime + 0.05, allEnemies);

      expect(events.length).toBe(1);
      // Primary: 300 damage (0 armor) -> HP 700
      expect(primary.currentHp).toBe(700);
      // Armored splash: armor = 150 -> DR = 150/(150+150) = 50% -> 150 damage -> HP 850
      expect(armoredSplash.currentHp).toBe(850);
      // Unarmored splash: 300 damage -> HP 700
      expect(unarmoredSplash.currentHp).toBe(700);
    });
  });
});
