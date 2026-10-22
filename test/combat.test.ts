/**
 * 《孤城神机营》- Spatial Targeting, Ballistics & Commander System Unit Tests
 * 
 * Verifies:
 * - Spatial Targeting Strategies: First, Strongest, ClusterAOE, and Range Filtering
 * - Ballistics & Trajectory Resolution: Linear & Parabolic Arc, Headless Hit Detection, AOE Splash
 * - Four Grand Commanders System: Passives, Rage (0..100), Ultimates, Barriers, and Duration Ticking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialTargetingSystem, selectTarget } from '../src/core/combat/targeting';
import { ProjectileManager } from '../src/core/combat/projectile';
import { Commander } from '../src/core/commander/commander';
import { COMMANDERS_CONFIG, ALL_COMMANDERS, getCommanderConfig } from '../src/config/commanders.config';
import { WeaponInstance, EnemyEntity, DamageCalculationContext } from '../src/core/types';

function createWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    id: 'w_test_lance',
    configId: 'fire_lance',
    name: '神机火铳',
    star: 1,
    faction: 'fire',
    footprint: { width: 1, height: 1 },
    anchor: { row: 0, col: 2 }, // Row 0 is at battlement wall (y = 502px)
    isFortressOnly: false,
    baseAtk: 60,
    attackInterval: 1.0,
    range: 10.0, // 10 meters
    ...overrides
  };
}

function createEnemy(overrides: Partial<EnemyEntity> = {}): EnemyEntity {
  return {
    id: `e_${Math.random().toString(36).substring(2, 7)}`,
    typeId: 'light_infantry',
    name: '流寇轻步兵',
    isBoss: false,
    maxHp: 500,
    currentHp: 500,
    armor: 50,
    shield: 0,
    moveSpeed: 1.2,
    distanceToWall: 5.0, // 5 meters from wall
    ...overrides
  };
}

describe('Milestone M3: Spatial Targeting Strategies', () => {
  const weapon = createWeapon({ range: 8.0 });

  it('filters out enemies outside weapon range and dead enemies', () => {
    const aliveInRange = createEnemy({ id: 'e1', distanceToWall: 4.0 });
    const aliveOutOfRange = createEnemy({ id: 'e2', distanceToWall: 15.0 });
    const deadInRange = createEnemy({ id: 'e3', distanceToWall: 3.0, currentHp: 0 });

    const inRange = SpatialTargetingSystem.filterInRange(weapon, [aliveInRange, aliveOutOfRange, deadInRange]);
    expect(inRange.length).toBe(1);
    expect(inRange[0].id).toBe('e1');
  });

  it('First Strategy: selects the enemy closest to the city wall (Row 0)', () => {
    const far = createEnemy({ id: 'far', distanceToWall: 6.0, currentHp: 800 });
    const mid = createEnemy({ id: 'mid', distanceToWall: 3.5, currentHp: 300 });
    const closest = createEnemy({ id: 'closest', distanceToWall: 1.2, currentHp: 500 });
    const outOfRange = createEnemy({ id: 'out', distanceToWall: 10.0, currentHp: 100 });

    const target = SpatialTargetingSystem.selectTarget(weapon, [far, mid, closest, outOfRange], 'First');
    expect(target).not.toBeNull();
    expect(target?.id).toBe('closest');
  });

  it('Strongest Strategy: selects the enemy with highest current HP', () => {
    const weakClose = createEnemy({ id: 'weak_close', distanceToWall: 1.5, currentHp: 150 });
    const strongMid = createEnemy({ id: 'strong_mid', distanceToWall: 4.0, currentHp: 950 });
    const normalFar = createEnemy({ id: 'normal_far', distanceToWall: 5.5, currentHp: 400 });

    const target = SpatialTargetingSystem.selectTarget(weapon, [weakClose, strongMid, normalFar], 'Strongest');
    expect(target).not.toBeNull();
    expect(target?.id).toBe('strong_mid');
  });

  it('ClusterAOE Strategy: selects the enemy position with highest density within aoeRadius', () => {
    // Isolated enemy alone at x: 2.0, y: 3.0 (in meters)
    const isolated = createEnemy({ id: 'isolated', x: 2.0, y: 3.0, distanceToWall: 3.0, currentHp: 500 });

    // Cluster of 3 enemies tightly packed near x: 0.0, y: 4.0
    const cluster1 = createEnemy({ id: 'c1', x: 0.0, y: 4.0, distanceToWall: 4.0, currentHp: 500 });
    const cluster2 = createEnemy({ id: 'c2', x: 0.5, y: 4.2, distanceToWall: 4.2, currentHp: 500 });
    const cluster3 = createEnemy({ id: 'c3', x: -0.4, y: 3.8, distanceToWall: 3.8, currentHp: 500 });

    const enemies = [isolated, cluster1, cluster2, cluster3];
    const target = SpatialTargetingSystem.selectTarget(weapon, enemies, 'ClusterAOE', { aoeRadius: 1.5 });

    expect(target).not.toBeNull();
    // One of the cluster members must be selected because each has 3 enemies in radius, whereas isolated has only 1
    expect(['c1', 'c2', 'c3']).toContain(target?.id);
  });

  it('returns null when no enemies are in range or all enemies are dead', () => {
    const deadEnemy = createEnemy({ currentHp: 0, distanceToWall: 2.0 });
    const outEnemy = createEnemy({ currentHp: 500, distanceToWall: 50.0 });

    expect(selectTarget(weapon, [])).toBeNull();
    expect(selectTarget(weapon, [deadEnemy, outEnemy], 'First')).toBeNull();
    expect(selectTarget(weapon, [deadEnemy, outEnemy], 'Strongest')).toBeNull();
    expect(selectTarget(weapon, [deadEnemy, outEnemy], 'ClusterAOE')).toBeNull();
  });

  it('resolves tie-breaker in First strategy by selecting higher HP', () => {
    const tieLowHp = createEnemy({ id: 'tie_low', distanceToWall: 2.0, currentHp: 200 });
    const tieHighHp = createEnemy({ id: 'tie_high', distanceToWall: 2.0, currentHp: 600 });

    const target = selectTarget(weapon, [tieLowHp, tieHighHp], 'First');
    expect(target?.id).toBe('tie_high');
  });

  it('getSplashTargets correctly identifies secondary enemies in blast radius', () => {
    const center = createEnemy({ id: 'center', x: 0.0, y: 3.0, distanceToWall: 3.0 });
    const near1 = createEnemy({ id: 'near1', x: 0.8, y: 3.2, distanceToWall: 3.2 });
    const near2 = createEnemy({ id: 'near2', x: -0.5, y: 2.7, distanceToWall: 2.7 });
    const far = createEnemy({ id: 'far', x: 10.0, y: 15.0, distanceToWall: 15.0 });

    const splash = SpatialTargetingSystem.getSplashTargets(center, [center, near1, near2, far], 2.0);
    expect(splash.map(e => e.id)).toEqual(['near1', 'near2']);
  });
});

describe('Milestone M3: Ballistics & Projectile Hit Resolution', () => {
  let projectileManager: ProjectileManager;
  let weapon: WeaponInstance;
  let target: EnemyEntity;
  let damageCtx: DamageCalculationContext;

  beforeEach(() => {
    projectileManager = new ProjectileManager();
    weapon = createWeapon({ baseAtk: 100 });
    target = createEnemy({ armor: 0, currentHp: 500, distanceToWall: 5.0 });
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

  it('spawns a projectile with correct initial flight state and duration', () => {
    const proj = projectileManager.spawn(weapon, target, damageCtx, { speed: 20.0 });
    expect(proj.progress).toBe(0.0);
    expect(proj.isHit).toBe(false);
    expect(proj.travelTime).toBeGreaterThan(0);
    expect(projectileManager.getActiveCount()).toBe(1);
  });

  it('advances projectile trajectory over time and computes parabolic arc height', () => {
    const proj = projectileManager.spawn(
      weapon,
      target,
      damageCtx,
      { speed: 10.0, isHighArc: true, arcHeight: 100 },
      { x: 100, y: 500 },
      { x: 100, y: 900 }
    );

    // Halfway tick
    const halfTime = proj.travelTime / 2;
    projectileManager.update(halfTime);

    expect(proj.progress).toBeCloseTo(0.5, 2);
    // At progress = 0.5, linear Y = 700. Arc offset = 4 * 100 * 0.5 * 0.5 = 100
    // visualY = 700 - 100 = 600
    expect(proj.currentY).toBeCloseTo(700, 1);
    expect(proj.visualY).toBeCloseTo(600, 1);
    expect(proj.isHit).toBe(false);
  });

  it('triggers hit detection and executes damage pipeline on impact', () => {
    const proj = projectileManager.spawn(weapon, target, damageCtx, { speed: 15.0 });
    const events = projectileManager.update(proj.travelTime + 0.05);

    expect(events.length).toBe(1);
    expect(events[0].hit).toBe(true);
    expect(events[0].damageResult.finalDamage).toBe(100);
    // Target HP reduced from 500 to 400
    expect(target.currentHp).toBe(400);
    expect(projectileManager.getActiveCount()).toBe(0);
  });

  it('supports simulateToHit for instant headless resolution', () => {
    const proj = projectileManager.spawn(weapon, target, damageCtx, { speed: 10.0 });
    const event = projectileManager.simulateToHit(proj.id);

    expect(event).not.toBeNull();
    expect(event?.hit).toBe(true);
    expect(target.currentHp).toBe(400);
    expect(projectileManager.getActiveCount()).toBe(0);
  });

  it('resolves AOE splash damage against nearby enemies on explosive impact', () => {
    const primary = createEnemy({ id: 'primary', armor: 0, currentHp: 500, x: 0, y: 4 });
    const splash1 = createEnemy({ id: 'splash1', armor: 0, currentHp: 300, x: 0.5, y: 4.2 });
    const splash2 = createEnemy({ id: 'splash2', armor: 0, currentHp: 300, x: -0.5, y: 3.8 });
    const outSplash = createEnemy({ id: 'out', armor: 0, currentHp: 300, x: 5.0, y: 10.0 });

    const aoeCtx = { ...damageCtx, target: primary };
    const proj = projectileManager.spawn(weapon, primary, aoeCtx, { speed: 20.0, aoeRadius: 2.0 });

    const allEnemies = [primary, splash1, splash2, outSplash];
    const events = projectileManager.update(proj.travelTime + 0.05, allEnemies);

    expect(events.length).toBe(1);
    expect(primary.currentHp).toBe(400);
    expect(splash1.currentHp).toBe(200);
    expect(splash2.currentHp).toBe(200);
    expect(outSplash.currentHp).toBe(300); // Unharmed
    expect(events[0].splashTargets?.length).toBe(2);
  });

  it('accurately derives targetY from target.distanceToWall when target.y is undefined', () => {
    // 1. In pixel coordinate mode (default weapon position)
    const trackEnemy = createEnemy({ id: 'track_enemy', distanceToWall: 4.0, x: undefined, y: undefined });
    const projPixel = projectileManager.spawn(weapon, trackEnemy, damageCtx, { speed: 15.0 });
    // Default wall Y is 540, distanceToWall = 4.0m -> targetY should be 540 + 4.0 * 68 = 812px
    expect(projPixel.targetY).toBe(540 + 4.0 * 68);

    // 2. In meter coordinate mode (customStart in meters)
    const customMeterStart = { x: 5.0, y: 0.0 };
    const projMeter = projectileManager.spawn(weapon, trackEnemy, damageCtx, { speed: 15.0 }, customMeterStart);
    // When weapon position is in meters (<= 50), targetY equals target.distanceToWall = 4.0m
    expect(projMeter.targetY).toBe(4.0);
  });

  it('resolves AOE splash damage accurately for close-proximity enemies in pixel coordinates', () => {
    const primary = createEnemy({ id: 'px_primary', armor: 0, currentHp: 500, x: 300, y: 800 });
    const splash1 = createEnemy({ id: 'px_splash1', armor: 0, currentHp: 300, x: 320, y: 810 }); // dx=20, dy=10 -> ~0.329m
    const splash2 = createEnemy({ id: 'px_splash2', armor: 0, currentHp: 300, x: 340, y: 800 }); // dx=40, dy=0 -> ~0.588m
    const distant = createEnemy({ id: 'px_distant', armor: 0, currentHp: 300, x: 600, y: 800 }); // dx=300 -> ~4.41m

    const aoeCtx = { ...damageCtx, target: primary };
    const proj = projectileManager.spawn(weapon, primary, aoeCtx, { speed: 20.0, aoeRadius: 2.0 });

    const allEnemies = [primary, splash1, splash2, distant];
    const events = projectileManager.update(proj.travelTime + 0.05, allEnemies);

    expect(events.length).toBe(1);
    expect(primary.currentHp).toBe(400);
    expect(splash1.currentHp).toBe(200);
    expect(splash2.currentHp).toBe(200);
    expect(distant.currentHp).toBe(300); // Beyond 2.0m radius
    expect(events[0].splashTargets?.length).toBe(2);
    const splashIds = events[0].splashTargets!.map(e => e.id);
    expect(splashIds).toContain('px_splash1');
    expect(splashIds).toContain('px_splash2');
    expect(splashIds).not.toContain('px_distant');
  });
});

describe('Milestone M3: Four Grand Commanders System', () => {
  describe('Configuration Validation', () => {
    it('defines all 4 historical commanders with exact GDD specifications', () => {
      expect(ALL_COMMANDERS.length).toBe(4);

      // 1. 王守仁 (Wang Shouren)
      const wang = getCommanderConfig('wang_shouren');
      expect(wang.name).toBe('王守仁');
      expect(wang.factionAffinity).toBe('fire');
      expect(wang.passive.fireAtkBonus).toBe(0.20);
      expect(wang.passive.explosionCdReduction).toBe(0.1);
      expect(wang.ultimate.name).toBe('知行合一·万炮齐发');
      expect(wang.ultimate.rageCost).toBe(100);
      expect(wang.ultimate.duration).toBe(5.0);
      expect(wang.ultimate.reloadSpeedBonus).toBe(1.50);
      expect(wang.ultimate.resetAllWeaponCooldowns).toBe(true);
      expect(wang.ultimate.firearmsMultiShot).toBe(true);

      // 2. 禽滑厘 (Qin Huali)
      const qinH = getCommanderConfig('qin_huali');
      expect(qinH.name).toBe('禽滑厘');
      expect(qinH.factionAffinity).toBe('mohist');
      expect(qinH.passive.mohistRangeBonus).toBe(0.15);
      expect(qinH.passive.fortressHpBonus).toBe(0.30);
      expect(qinH.ultimate.name).toBe('兼爱非攻·铁壁天幕');
      expect(qinH.ultimate.duration).toBe(6.0);
      expect(qinH.ultimate.barrierHp).toBe(2000);
      expect(qinH.ultimate.reflectMeleeRatio).toBe(1.00);

      // 3. 秦良玉 (Qin Liangyu)
      const qinL = getCommanderConfig('qin_liangyu');
      expect(qinL.name).toBe('秦良玉');
      expect(qinL.factionAffinity).toBe('fortress');
      expect(qinL.passive.fortressReflectBonus).toBe(0.50);
      expect(qinL.passive.enemyAtkSpeedReductionNearWall).toBe(0.20);
      expect(qinL.ultimate.name).toBe('铁骑勤王·八面合围');
      expect(qinL.ultimate.damage).toBe(500);
      expect(qinL.ultimate.cavalryCount).toBe(8);

      // 4. 刘伯温 (Liu Bowen)
      const liu = getCommanderConfig('liu_bowen');
      expect(liu.name).toBe('刘伯温');
      expect(liu.factionAffinity).toBe('qimen');
      expect(liu.passive.qimenAuraRangeBonus).toBe(1);
      expect(liu.passive.reactionDmgBonus).toBe(0.30);
      expect(liu.ultimate.name).toBe('奇门遁甲·天雷九烈');
      expect(liu.ultimate.damage).toBe(300);
      expect(liu.ultimate.lightningStrikes).toBe(9);
      expect(liu.ultimate.inflictsShock).toBe(true);
    });
  });

  describe('Commander Entity State, Rage & Ultimates', () => {
    it('manages rage accumulation with strict 0..100 boundary clamping', () => {
      const commander = new Commander('wang_shouren');
      expect(commander.rage).toBe(0);

      commander.addRage(40);
      expect(commander.rage).toBe(40);

      // Clamping at ceiling 100
      commander.addRage(80);
      expect(commander.rage).toBe(100);

      // Clamping at floor 0
      commander.addRage(-150);
      expect(commander.rage).toBe(0);
    });

    it('validates ultimate cast prerequisite (100 rage required)', () => {
      const commander = new Commander('wang_shouren');
      commander.addRage(99);
      expect(commander.canCastUltimate()).toBe(false);

      const failCast = commander.castUltimate();
      expect(failCast.success).toBe(false);
      expect(failCast.reason).toBe('NOT_ENOUGH_RAGE');
      expect(commander.isUltimateActive).toBe(false);

      commander.addRage(1);
      expect(commander.canCastUltimate()).toBe(true);

      const successCast = commander.castUltimate();
      expect(successCast.success).toBe(true);
      expect(commander.rage).toBe(0); // 100 rage consumed
      expect(commander.isUltimateActive).toBe(true);
      expect(commander.ultimateRemainingDuration).toBe(5.0);
    });

    it('ticks duration and expires active ultimate buffs cleanly', () => {
      const commander = new Commander('wang_shouren');
      commander.addRage(100);
      commander.castUltimate();

      commander.tick(2.0);
      expect(commander.ultimateRemainingDuration).toBeCloseTo(3.0, 2);
      expect(commander.isUltimateActive).toBe(true);

      commander.tick(3.1);
      expect(commander.ultimateRemainingDuration).toBe(0);
      expect(commander.isUltimateActive).toBe(false);
    });

    it('Qin Huali: sets 2000 barrier HP on ultimate and absorbs incoming damage', () => {
      const qin = new Commander('qin_huali');
      qin.addRage(100);
      const castRes = qin.castUltimate();
      expect(castRes.success).toBe(true);
      expect(qin.barrierHp).toBe(2000);
      expect(qin.isUltimateActive).toBe(true);

      // Absorbs partial damage (500 damage)
      const abs1 = qin.absorbBarrierDamage(500);
      expect(abs1.absorbed).toBe(500);
      expect(abs1.remainingDamage).toBe(0);
      expect(qin.barrierHp).toBe(1500);

      // Absorbs excess damage (1800 damage against 1500 barrier)
      const abs2 = qin.absorbBarrierDamage(1800);
      expect(abs2.absorbed).toBe(1500);
      expect(abs2.remainingDamage).toBe(300);
      expect(qin.barrierHp).toBe(0);
    });

    it('resets commander state completely via reset()', () => {
      const commander = new Commander('qin_huali');
      commander.addRage(100);
      commander.castUltimate();
      expect(commander.isUltimateActive).toBe(true);

      commander.reset();
      expect(commander.rage).toBe(0);
      expect(commander.isUltimateActive).toBe(false);
      expect(commander.ultimateRemainingDuration).toBe(0);
      expect(commander.barrierHp).toBe(0);
    });
  });
});
