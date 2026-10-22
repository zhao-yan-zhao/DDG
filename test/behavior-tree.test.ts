import { describe, it, expect, vi } from 'vitest';
import {
  ConditionNode,
  ActionNode,
  SelectorNode,
  SequenceNode,
  ParallelNode,
  InverterNode,
  CooldownNode
} from '../src/core/behavior/behavior-tree';
import {
  WeaponBehaviorTree,
  WeaponBehaviorContext
} from '../src/core/behavior/weapon-behavior';
import {
  EnemyBehaviorTree,
  EnemyBehaviorContext
} from '../src/core/behavior/enemy-behavior';
import {
  createEnemyEntity,
  EnemyFactory,
  DEFAULT_WALL_Y,
  DEFAULT_SPAWN_Y,
  PIXELS_PER_METER
} from '../src/core/enemy/enemy-entity';
import { EnemyEntity } from '../src/core/types';

describe('Core Behavior Tree Engine (Headless Architecture)', () => {
  it('ConditionNode returns SUCCESS on truthy condition and FAILURE on falsy', () => {
    const trueNode = new ConditionNode<{ flag: boolean }>('TrueCond', (ctx) => ctx.flag);
    const falseNode = new ConditionNode<{ flag: boolean }>('FalseCond', (ctx) => ctx.flag);

    expect(trueNode.tick({ flag: true })).toBe('SUCCESS');
    expect(falseNode.tick({ flag: false })).toBe('FAILURE');
  });

  it('ActionNode executes action function and returns its status', () => {
    let callCount = 0;
    const action = new ActionNode<any>('IncrementAction', () => {
      callCount++;
      return 'SUCCESS';
    });

    const status = action.tick({});
    expect(status).toBe('SUCCESS');
    expect(callCount).toBe(1);
  });

  it('SelectorNode executes children until first SUCCESS or RUNNING', () => {
    const selector = new SelectorNode<any>('TestSelector');
    selector.addChild(new ConditionNode('Fail1', () => false));
    selector.addChild(new ConditionNode('Fail2', () => false));
    selector.addChild(new ConditionNode('Pass', () => true));
    selector.addChild(new ActionNode('Unreachable', () => 'SUCCESS'));

    expect(selector.tick({})).toBe('SUCCESS');

    const allFailSelector = new SelectorNode<any>('AllFail');
    allFailSelector.addChild(new ConditionNode('Fail1', () => false));
    allFailSelector.addChild(new ConditionNode('Fail2', () => false));
    expect(allFailSelector.tick({})).toBe('FAILURE');
  });

  it('SequenceNode executes children until first FAILURE or RUNNING', () => {
    const sequence = new SequenceNode<any>('TestSequence');
    sequence.addChild(new ConditionNode('Pass1', () => true));
    sequence.addChild(new ConditionNode('Pass2', () => true));
    sequence.addChild(new ActionNode('ActionSuccess', () => 'SUCCESS'));

    expect(sequence.tick({})).toBe('SUCCESS');

    const failingSequence = new SequenceNode<any>('FailingSeq');
    failingSequence.addChild(new ConditionNode('Pass', () => true));
    failingSequence.addChild(new ConditionNode('Fail', () => false));
    failingSequence.addChild(new ActionNode('Unreachable', () => 'SUCCESS'));
    expect(failingSequence.tick({})).toBe('FAILURE');
  });

  it('ParallelNode with require-all policy succeeds only when all children succeed', () => {
    const parallel = new ParallelNode<any>('TestParallel', 'require-all');
    parallel.addChild(new ConditionNode('Pass1', () => true));
    parallel.addChild(new ConditionNode('Pass2', () => true));

    expect(parallel.tick({})).toBe('SUCCESS');

    parallel.addChild(new ConditionNode('Fail', () => false));
    expect(parallel.tick({})).toBe('FAILURE');
  });

  it('InverterNode flips SUCCESS to FAILURE and FAILURE to SUCCESS', () => {
    const inverterSuccess = new InverterNode<any>('InvertSuccess', new ConditionNode('True', () => true));
    const inverterFailure = new InverterNode<any>('InvertFail', new ConditionNode('False', () => false));
    const inverterRunning = new InverterNode<any>('InvertRunning', new ActionNode('Run', () => 'RUNNING'));

    expect(inverterSuccess.tick({})).toBe('FAILURE');
    expect(inverterFailure.tick({})).toBe('SUCCESS');
    expect(inverterRunning.tick({})).toBe('RUNNING');
  });

  it('CooldownNode throttles execution based on timestamp and interval', () => {
    const action = new ActionNode<{ time: number }>('Work', () => 'SUCCESS');
    const cooldown = new CooldownNode<{ time: number }>(
      'CooldownGate',
      action,
      1.0,
      (ctx) => ctx.time
    );

    // First execution: ready
    expect(cooldown.tick({ time: 0.0 })).toBe('SUCCESS');
    // Immediate subsequent execution: cooldown active
    expect(cooldown.tick({ time: 0.5 })).toBe('FAILURE');
    // After interval: ready again
    expect(cooldown.tick({ time: 1.1 })).toBe('SUCCESS');
  });
});

describe('WeaponBehaviorTree (Friendly Weapon Tactical AI)', () => {
  const tree = new WeaponBehaviorTree();

  it('Support Aura branch: passive Qimen building maintains aura and does not fire projectile', () => {
    const auraUpdateSpy = vi.fn();
    const fireSpy = vi.fn();

    const ctx: WeaponBehaviorContext = {
      weapon: {
        id: 'w_powder_01',
        configId: 'powder_keg',
        name: '火药局',
        star: 1,
        anchor: { row: 1, col: 2 },
        footprint: { width: 1, height: 1 },
        baseAtk: 0,
        attackInterval: 1.0,
        range: 1.0,
        faction: 'qimen',
        isFortressOnly: false
      },
      enemies: [
        createEnemyEntity('light_infantry', { distanceToWall: 2.0 })
      ],
      dt: 1.0,
      timer: 0.5,
      currentTime: 10.0,
      callbacks: {
        onAuraPulse: auraUpdateSpy,
        onFire: fireSpy
      }
    };

    const status = tree.tick(ctx);
    expect(status).toBe('SUCCESS');
    expect(auraUpdateSpy).toHaveBeenCalledWith(ctx.weapon, 4);
    expect(fireSpy).not.toHaveBeenCalled();
    expect(ctx.hasFired).toBeUndefined();
  });

  it('Barrier Defense branch: Fortress weapon on Row 0 holds defensive barrier', () => {
    const barrierSpy = vi.fn();
    const fireSpy = vi.fn();

    const enemy = createEnemyEntity('light_infantry', {
      x: 375,
      y: 860,
      distanceToWall: 0.1
    });

    const ctx: WeaponBehaviorContext = {
      weapon: {
        id: 'w_caltrop_01',
        configId: 'caltrop_barrier',
        name: '铁索拒马',
        star: 2,
        anchor: { row: 0, col: 2 },
        footprint: { width: 1, height: 1 },
        baseAtk: 20,
        attackInterval: 1.0,
        range: 3.0,
        faction: 'fortress',
        isFortressOnly: true
      },
      weaponPos: { x: 375, y: 840 },
      wallY: 860,
      enemies: [enemy],
      dt: 1.0,
      timer: 0.5,
      currentTime: 10.0,
      callbacks: {
        onDefenseTrigger: barrierSpy,
        onFire: fireSpy
      }
    };

    const status = tree.tick(ctx);
    expect(status).toBe('SUCCESS');
    expect(barrierSpy).toHaveBeenCalledWith(ctx.weapon, enemy, 20);
    expect(fireSpy).toHaveBeenCalledWith(ctx.weapon, enemy);
    expect(ctx.hasFired).toBe(true);
    expect(ctx.selectedTarget?.id).toBe(enemy.id);
  });

  it('Offensive Ballistics: fires at in-range target and triggers cooldown', () => {
    const fireSpy = vi.fn();
    const enemy = createEnemyEntity('light_infantry', {
      x: 375,
      y: 900,
      distanceToWall: (900 - DEFAULT_WALL_Y) / PIXELS_PER_METER,
      currentHp: 50
    });

    const ctx: WeaponBehaviorContext = {
      weapon: {
        id: 'w_cannon_01',
        configId: 'red_cannon',
        name: '红衣大炮',
        star: 1,
        anchor: { row: 2, col: 2 },
        footprint: { width: 1, height: 2 },
        baseAtk: 160,
        attackInterval: 4.0,
        range: 15.0, // 15 meters
        faction: 'fire',
        isFortressOnly: false
      },
      weaponPos: { x: 375, y: 720 },
      enemies: [enemy],
      dt: 4.5,
      timer: 0.0,
      currentTime: 5.0,
      callbacks: {
        onFire: fireSpy
      }
    };

    const status1 = tree.tick(ctx);
    expect(status1).toBe('SUCCESS');
    expect(ctx.hasFired).toBe(true);
    expect(ctx.selectedTarget?.id).toBe(enemy.id);
    expect(fireSpy).toHaveBeenCalledWith(ctx.weapon, enemy);
    expect(ctx.newTimer).toBe(0);

    // Immediate second tick within attackInterval (timer 0 + dt 0.5 < 4.0): should NOT fire
    ctx.dt = 0.5;
    ctx.timer = 0;
    ctx.hasFired = false;
    ctx.selectedTarget = null;
    const status2 = tree.tick(ctx);
    expect(status2).toBe('RUNNING');
    expect(ctx.hasFired).toBe(false);
  });

  it('Offensive Ballistics: fails when all targets are out of tactical range', () => {
    const farEnemy = createEnemyEntity('light_infantry', {
      x: 375,
      y: 1200,
      distanceToWall: (1200 - DEFAULT_WALL_Y) / PIXELS_PER_METER
    });

    const ctx: WeaponBehaviorContext = {
      weapon: {
        id: 'w_musket_01',
        configId: 'divine_gun',
        name: '神机火铳',
        star: 1,
        anchor: { row: 2, col: 2 },
        footprint: { width: 1, height: 1 },
        baseAtk: 28,
        attackInterval: 1.0,
        range: 2.0, // Short range: 2.0m = 136px
        faction: 'fire',
        isFortressOnly: false
      },
      weaponPos: { x: 375, y: 720 }, // dist = 1200 - 720 = 480px = ~7.0m > 2.0m
      enemies: [farEnemy],
      dt: 1.5,
      timer: 0.0,
      currentTime: 1.0
    };

    const status = tree.tick(ctx);
    expect(status).toBe('FAILURE');
    expect(ctx.hasFired).toBeUndefined();
  });
});

describe('EnemyBehaviorTree (Hostile AI Hierarchy)', () => {
  const enemyBT = new EnemyBehaviorTree();

  it('Branch 0: Dead / neutralized enemy deals 0 damage and does not reach wall', () => {
    const deadEnemy = EnemyFactory.createOrdinary({ currentHp: 0 });
    const ctx: EnemyBehaviorContext = {
      enemy: deadEnemy,
      dt: 1.0,
      currentTime: 1.0,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false
    };

    const status = enemyBT.tick(ctx);
    expect(status).toBe('SUCCESS');
    expect(ctx.reachedWall).toBe(false);
    expect(ctx.dealtWallDamage).toBe(0);
    expect(ctx.isSuicide).toBe(false);
  });

  it('Branch 1: Frozen / paralyzed enemy holds position and deals 0 damage', () => {
    const frozenEnemy = EnemyFactory.createOrdinary({
      isFrozen: true,
      distanceToWall: 3.0,
      y: DEFAULT_WALL_Y + 3.0 * PIXELS_PER_METER
    });
    const ctx: EnemyBehaviorContext = {
      enemy: frozenEnemy,
      dt: 1.0,
      currentTime: 1.0,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false
    };

    const status = enemyBT.tick(ctx);
    expect(status).toBe('RUNNING');
    expect(ctx.reachedWall).toBe(false);
    expect(ctx.dealtWallDamage).toBe(0);
    // Position must NOT advance while frozen
    expect(frozenEnemy.distanceToWall).toBe(3.0);
  });

  it('Branch 2: Boss enrage triggers when HP <= 50%, accelerating moveSpeed and boosting attack', () => {
    const boss = EnemyFactory.createBoss({
      maxHp: 10000,
      currentHp: 4500, // <= 50%
      moveSpeed: 0.7,
      wallDamage: 50
    });
    const enrageSpy = vi.fn();

    const ctx: EnemyBehaviorContext = {
      enemy: boss,
      dt: 0.1,
      currentTime: 1.0,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false,
      callbacks: {
        onBossEnraged: enrageSpy
      }
    };

    enemyBT.tick(ctx);
    expect(boss.isEnraged).toBe(true);
    expect(ctx.isEnragedTriggered).toBe(true);
    expect(boss.moveSpeed).toBeCloseTo(0.7 * 1.8, 1);
    expect(boss.wallDamage).toBe(75); // 50 * 1.5
    expect(enrageSpy).toHaveBeenCalledWith(boss);
  });

  it('Branch 3: Suicide bomber marches and self-destructs upon wall contact', () => {
    const bomber = EnemyFactory.create('bomb_carrier', {
      distanceToWall: 0.05,
      y: DEFAULT_WALL_Y + 0.05 * PIXELS_PER_METER,
      moveSpeed: 2.2,
      suicideDamage: 150
    });
    const suicideSpy = vi.fn();

    const ctx: EnemyBehaviorContext = {
      enemy: bomber,
      dt: 0.1,
      currentTime: 1.0,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false,
      callbacks: {
        onSuicideExplode: suicideSpy
      }
    };

    const status = enemyBT.tick(ctx);
    expect(status).toBe('SUCCESS');
    expect(ctx.reachedWall).toBe(true);
    expect(ctx.isSuicide).toBe(true);
    expect(ctx.dealtWallDamage).toBe(150);
    expect(bomber.currentHp).toBe(0); // Self-eliminated!
    expect(suicideSpy).toHaveBeenCalledWith(bomber, 150);
  });

  it('Branch 4: Ranged siege unit halts at attackRange and fires projectiles at wall', () => {
    const bowman = EnemyFactory.createRanged({
      distanceToWall: 4.8, // within 5.0m attack range
      wallDamage: 12,
      attackInterval: 1.5
    });
    const rangedSpy = vi.fn();

    const ctx: EnemyBehaviorContext = {
      enemy: bowman,
      dt: 0.1,
      currentTime: 2.0,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false,
      callbacks: {
        onRangedAttack: rangedSpy
      }
    };

    const status = enemyBT.tick(ctx);
    expect(status).toBe('SUCCESS');
    expect(ctx.hasRangedFired).toBe(true);
    expect(ctx.dealtWallDamage).toBe(Math.round(12 * 0.8));
    expect(bowman.lastAttackTime).toBe(2.0);
    expect(rangedSpy).toHaveBeenCalled();
    // Bowman should hold position rather than rushing to 0m
    expect(bowman.distanceToWall).toBe(4.8);
  });

  it('Branch 5: Melee unit marches toward wall and attacks on cooldown when touching wall', () => {
    const infantry = EnemyFactory.createOrdinary({
      distanceToWall: 2.0,
      moveSpeed: 1.2,
      wallDamage: 10,
      attackInterval: 1.0
    });
    const wallImpactSpy = vi.fn();

    // Tick 1: Marching (dt = 0.5s -> moves 0.6m)
    const ctx1: EnemyBehaviorContext = {
      enemy: infantry,
      dt: 0.5,
      currentTime: 1.0,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false
    };
    enemyBT.tick(ctx1);
    expect(ctx1.reachedWall).toBe(false);
    expect(infantry.distanceToWall).toBeCloseTo(1.4, 2);

    // Transport to wall
    infantry.distanceToWall = 0;
    infantry.y = DEFAULT_WALL_Y;

    // Tick 2: Wall impact
    const ctx2: EnemyBehaviorContext = {
      enemy: infantry,
      dt: 0.1,
      currentTime: 2.0,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false,
      callbacks: {
        onWallImpact: wallImpactSpy
      }
    };
    enemyBT.tick(ctx2);
    expect(ctx2.reachedWall).toBe(true);
    expect(ctx2.dealtWallDamage).toBe(10);
    expect(wallImpactSpy).toHaveBeenCalledWith(infantry, 10);
  });

  it('Frontline Lane Interception: Melee unit is physically intercepted at frontline stop line (Y=926) when Row 0 unit is active', () => {
    const infantry = EnemyFactory.createOrdinary({
      laneIndex: 2,
      x: 375,
      y: 1000,
      moveSpeed: 2.0, // 2 m/s -> 136 px/s
      wallDamage: 25,
      attackInterval: 1.0
    });
    const wallImpactSpy = vi.fn();

    // Lane 2 has an active Row 0 barricade at Y=926; other lanes breached to 840
    const frontlineStopYByLane = [840, 840, 926, 840, 840];

    // Tick 1: dt = 1.0s -> moves 136px downwards from 1000 to 864, but capped at 926
    const ctx: EnemyBehaviorContext = {
      enemy: infantry,
      dt: 1.0,
      currentTime: 1.0,
      wallY: 840,
      frontlineStopYByLane,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false,
      callbacks: {
        onWallImpact: wallImpactSpy
      }
    };

    enemyBT.tick(ctx);
    // Physically blocked at 926
    expect(infantry.y).toBe(926);
    expect(ctx.reachedWall).toBe(true);
    expect(ctx.dealtWallDamage).toBe(25);
    expect(wallImpactSpy).toHaveBeenCalledWith(infantry, 25);

    // Tick 2: Frontline broken! Stop line for Lane 2 becomes 840 (city wall)
    const frontlineBreachedByLane = [840, 840, 840, 840, 840];
    const ctx2: EnemyBehaviorContext = {
      enemy: infantry,
      dt: 0.5, // 0.5s -> 68px
      currentTime: 2.0,
      wallY: 840,
      frontlineStopYByLane: frontlineBreachedByLane,
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false
    };

    enemyBT.tick(ctx2);
    // Unblocked, advances towards 840: 926 - 68 = 858
    expect(infantry.y).toBe(858);
    expect(ctx2.reachedWall).toBe(false);
  });

  it('Suicide unit explodes early upon contacting frontline barrier stop line', () => {
    const bomber = EnemyFactory.create('bomb_carrier', {
      laneIndex: 3,
      x: 447,
      y: 950,
      moveSpeed: 1.0,
      isSuicide: true,
      suicideDamage: 200
    });
    const explodeSpy = vi.fn();

    const ctx: EnemyBehaviorContext = {
      enemy: bomber,
      dt: 1.0, // Moves 68px -> reaches 926
      currentTime: 1.0,
      wallY: 840,
      frontlineStopYByLane: [840, 840, 840, 926, 840],
      reachedWall: false,
      dealtWallDamage: 0,
      isSuicide: false,
      callbacks: {
        onSuicideExplode: explodeSpy
      }
    };

    enemyBT.tick(ctx);
    expect(bomber.y).toBe(926);
    expect(ctx.reachedWall).toBe(true);
    expect(ctx.isSuicide).toBe(true);
    expect(ctx.dealtWallDamage).toBe(200);
    expect(bomber.currentHp).toBe(0);
    expect(explodeSpy).toHaveBeenCalledWith(bomber, 200);
  });
});
