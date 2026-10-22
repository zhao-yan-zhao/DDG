/**
 * 《孤城神机营》- Enemy Combat Behavior Tree (BT)
 * Implements Multi-Tiered Tactical Enemy AI:
 * 1. Crowd Control Check (Frozen / Paralyzed check -> Immobilized)
 * 2. Boss Enrage & Skill Execution (HP <= 50% berserk acceleration)
 * 3. Suicide Bomb Detonation (Bomb carriers detonate at close range)
 * 4. Ranged Siege Attackers (Stop at attackRange and fire projectiles at wall)
 * 5. Melee Breach & March Movement (Advance along lane -> Deal wall damage on contact)
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { EnemyEntity } from '../types';
import {
  BehaviorNode,
  NodeStatus,
  SelectorNode,
  SequenceNode,
  ConditionNode,
  ActionNode
} from './behavior-tree';

const PIXELS_PER_METER = 68;
const DEFAULT_WALL_Y = 720;
const DEFAULT_SPAWN_Y = 1120;

export interface EnemyBehaviorCallbacks {
  onWallImpact?: (enemy: EnemyEntity, damage: number) => void;
  onSuicideExplode?: (enemy: EnemyEntity, damage: number) => void;
  onRangedAttack?: (enemy: EnemyEntity, damage: number) => void;
  onBossEnraged?: (boss: EnemyEntity) => void;
}

export interface EnemyBehaviorContext {
  enemy: EnemyEntity;
  dt: number;
  currentTime: number;
  wallY?: number;
  frontlineStopYByLane?: number[]; // Dynamic frontline barrier stop lines (e.g. 926px for active Row 0 fortress units, 840px for breach)
  callbacks?: EnemyBehaviorCallbacks;
  // Output fields
  reachedWall: boolean;
  dealtWallDamage: number;
  isSuicide: boolean;
  isEnragedTriggered?: boolean;
  hasRangedFired?: boolean;
}

function getEffectiveTargetY(ctx: EnemyBehaviorContext): number {
  const defaultWallY = ctx.wallY ?? DEFAULT_WALL_Y;
  if (!ctx.frontlineStopYByLane || ctx.frontlineStopYByLane.length === 0) {
    return defaultWallY;
  }
  let lane = ctx.enemy.laneIndex;
  if (lane === undefined && ctx.enemy.x !== undefined) {
    lane = Math.floor((ctx.enemy.x - 195) / 72);
  }
  lane = Math.max(0, Math.min(4, lane ?? 2));
  return ctx.frontlineStopYByLane[lane] ?? defaultWallY;
}

function getCurrentDistanceToWall(ctx: EnemyBehaviorContext, defaultWallY: number): number {
  if (ctx.enemy.y !== undefined && ctx.enemy.y !== DEFAULT_SPAWN_Y) {
    return (ctx.enemy.y - defaultWallY) / PIXELS_PER_METER;
  }
  return ctx.enemy.distanceToWall ?? ((DEFAULT_SPAWN_Y - defaultWallY) / PIXELS_PER_METER);
}

export class EnemyBehaviorTree {
  private root: SelectorNode<EnemyBehaviorContext>;

  constructor() {
    this.root = this.buildTree();
  }

  public tick(context: EnemyBehaviorContext): NodeStatus {
    return this.root.tick(context);
  }

  private buildTree(): SelectorNode<EnemyBehaviorContext> {
    const root = new SelectorNode<EnemyBehaviorContext>('EnemyRootSelector');

    // =========================================================================
    // Branch 0: Dead / Neutralized Entity Check (阵亡实体截断分支)
    // =========================================================================
    const deadSequence = new SequenceNode<EnemyBehaviorContext>('DeadCheckBranch');
    deadSequence.addChild(new ConditionNode<EnemyBehaviorContext>('IsDead', (ctx) => ctx.enemy.currentHp <= 0));
    deadSequence.addChild(new ActionNode<EnemyBehaviorContext>('RemainNeutralized', (ctx) => {
      ctx.reachedWall = false;
      ctx.dealtWallDamage = 0;
      ctx.isSuicide = false;
      return 'SUCCESS';
    }));

    // =========================================================================
    // Branch 1: Crowd Control & Incapacitation (硬控阻断分支)
    // =========================================================================
    const ccSequence = new SequenceNode<EnemyBehaviorContext>('CrowdControlBranch');
    ccSequence.addChild(new ConditionNode<EnemyBehaviorContext>('IsImmobilized', (ctx) => {
      return Boolean(ctx.enemy.isFrozen || ctx.enemy.isParalyzed);
    }));
    ccSequence.addChild(new ActionNode<EnemyBehaviorContext>('HoldPosition', (ctx) => {
      const wallY = ctx.wallY ?? DEFAULT_WALL_Y;
      ctx.reachedWall = (ctx.enemy.y ?? DEFAULT_SPAWN_Y) <= wallY;
      ctx.dealtWallDamage = 0;
      ctx.isSuicide = false;
      return 'RUNNING';
    }));

    // =========================================================================
    // Branch 2: Boss Enrage Check (首领血量低于50%狂暴)
    // =========================================================================
    const bossSequence = new SequenceNode<EnemyBehaviorContext>('BossEnrageBranch');
    bossSequence.addChild(new ConditionNode<EnemyBehaviorContext>('CheckBossEnrageThreshold', (ctx) => {
      return Boolean(
        ctx.enemy.isBoss &&
        !ctx.enemy.isEnraged &&
        ctx.enemy.currentHp <= ctx.enemy.maxHp * 0.5
      );
    }));
    bossSequence.addChild(new ActionNode<EnemyBehaviorContext>('TriggerEnrage', (ctx) => {
      ctx.enemy.isEnraged = true;
      ctx.enemy.moveSpeed = Math.round(ctx.enemy.moveSpeed * 1.80 * 10) / 10;
      ctx.enemy.wallDamage = Math.round((ctx.enemy.wallDamage || 50) * 1.5);
      ctx.isEnragedTriggered = true;
      ctx.callbacks?.onBossEnraged?.(ctx.enemy);
      // Return FAILURE so root selector proceeds to march / combat on the same frame
      return 'FAILURE';
    }));

    // =========================================================================
    // Branch 3: Suicide Bomber Detonation (自爆死士突刺引爆)
    // =========================================================================
    const suicideSequence = new SequenceNode<EnemyBehaviorContext>('SuicideDetonationBranch');
    suicideSequence.addChild(new ConditionNode<EnemyBehaviorContext>('IsSuicideUnit', (ctx) => {
      return Boolean(ctx.enemy.isSuicide);
    }));
    suicideSequence.addChild(new ActionNode<EnemyBehaviorContext>('ExecuteDetonationOrAdvance', (ctx) => {
      const defaultWallY = ctx.wallY ?? DEFAULT_WALL_Y;
      const targetY = getEffectiveTargetY(ctx);
      const currentDist = getCurrentDistanceToWall(ctx, defaultWallY);

      // Advance position toward target barrier or city wall
      const deltaMeters = ctx.enemy.moveSpeed * ctx.dt;
      const newDist = Math.max(0, currentDist - deltaMeters);
      const calculatedY = defaultWallY + newDist * PIXELS_PER_METER;
      const newY = Math.max(targetY, calculatedY);

      ctx.enemy.y = newY;
      ctx.enemy.distanceToWall = Math.max(0, (newY - defaultWallY) / PIXELS_PER_METER);

      const reachedWall = newY <= targetY;
      ctx.reachedWall = reachedWall;

      if (reachedWall) {
        ctx.isSuicide = true;
        ctx.dealtWallDamage = ctx.enemy.suicideDamage ?? 150;
        ctx.enemy.currentHp = 0; // Self-destruct
        ctx.callbacks?.onSuicideExplode?.(ctx.enemy, ctx.dealtWallDamage);
        return 'SUCCESS';
      }

      return 'RUNNING';
    }));

    // =========================================================================
    // Branch 4: Ranged Siege Attack (远程攻城齐射兵种)
    // =========================================================================
    const rangedSequence = new SequenceNode<EnemyBehaviorContext>('RangedSiegeBranch');
    rangedSequence.addChild(new ConditionNode<EnemyBehaviorContext>('IsRangedUnitInRange', (ctx) => {
      const attackRange = ctx.enemy.attackRange;
      if (!ctx.enemy.isRanged || !attackRange) return false;
      const currentDist = ctx.enemy.distanceToWall ?? 999;
      return currentDist <= attackRange;
    }));
    rangedSequence.addChild(new ActionNode<EnemyBehaviorContext>('ExecuteRangedSiegeAttack', (ctx) => {
      // Hold position and shoot at city wall from distance
      const interval = ctx.enemy.attackInterval ?? 1.5;
      const lastAttack = ctx.enemy.lastAttackTime ?? -999;

      if (ctx.currentTime - lastAttack >= interval) {
        ctx.enemy.lastAttackTime = ctx.currentTime;
        ctx.dealtWallDamage = Math.round((ctx.enemy.wallDamage || 10) * 0.8);
        ctx.hasRangedFired = true;
        ctx.callbacks?.onRangedAttack?.(ctx.enemy, ctx.dealtWallDamage);
        return 'SUCCESS';
      }

      return 'RUNNING';
    }));

    // =========================================================================
    // Branch 5: Default March & Melee Wall Breach (常规行军与近战破门)
    // =========================================================================
    const meleeMarchSequence = new SequenceNode<EnemyBehaviorContext>('MeleeMarchBranch');
    meleeMarchSequence.addChild(new ActionNode<EnemyBehaviorContext>('AdvanceAndImpactWall', (ctx) => {
      const defaultWallY = ctx.wallY ?? DEFAULT_WALL_Y;
      const targetY = getEffectiveTargetY(ctx);
      const currentDist = getCurrentDistanceToWall(ctx, defaultWallY);

      // Advance position toward target barrier or city wall
      const deltaMeters = ctx.enemy.moveSpeed * ctx.dt;
      const newDist = Math.max(0, currentDist - deltaMeters);
      const calculatedY = defaultWallY + newDist * PIXELS_PER_METER;
      const newY = Math.max(targetY, calculatedY);

      ctx.enemy.y = newY;
      ctx.enemy.distanceToWall = Math.max(0, (newY - defaultWallY) / PIXELS_PER_METER);

      const reachedWall = newY <= targetY;
      ctx.reachedWall = reachedWall;

      if (reachedWall) {
        const interval = ctx.enemy.attackInterval ?? 1.0;
        // First contact attack logic: if never attacked before, strike immediately on contact
        if (ctx.enemy.lastAttackTime === undefined) {
          ctx.enemy.lastAttackTime = ctx.currentTime;
          ctx.dealtWallDamage = ctx.enemy.wallDamage ?? 10;
          ctx.callbacks?.onWallImpact?.(ctx.enemy, ctx.dealtWallDamage);
        } else if (ctx.currentTime - ctx.enemy.lastAttackTime >= interval) {
          ctx.enemy.lastAttackTime = ctx.currentTime;
          ctx.dealtWallDamage = ctx.enemy.wallDamage ?? 10;
          ctx.callbacks?.onWallImpact?.(ctx.enemy, ctx.dealtWallDamage);
        }
      }

      return reachedWall ? 'SUCCESS' : 'RUNNING';
    }));

    root.addChild(deadSequence);
    root.addChild(ccSequence);
    root.addChild(bossSequence);
    root.addChild(suicideSequence);
    root.addChild(rangedSequence);
    root.addChild(meleeMarchSequence);

    return root;
  }
}
