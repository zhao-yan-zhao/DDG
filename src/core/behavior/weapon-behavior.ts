/**
 * 《孤城神机营》- Friendly Weapon Combat Behavior Tree
 * Implements 5-Phase Attack Lifecycle & Archetype Dispatch:
 * 1. Status Evaluation (Active, Bench check, CC/Stun)
 * 2. Qimen Support & Aura Dispatch (Powder Bureau, War Drum, Stargazer, Workshop)
 * 3. Fortress Frontline Melee/Barrier Reactions (Barricades, Caltrops, Oil, Spears)
 * 4. Offensive Ballistic Aim & Fire (Fire Lances, Cannons, Crossbows, Catapults)
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { WeaponInstance, EnemyEntity, GridPosition } from '../types';
import { SpatialTargetingSystem } from '../combat/targeting';
import {
  BehaviorNode,
  NodeStatus,
  SelectorNode,
  SequenceNode,
  ConditionNode,
  ActionNode
} from './behavior-tree';

export interface WeaponBehaviorCallbacks {
  onFire?: (weapon: WeaponInstance, target: EnemyEntity) => void;
  onAuraPulse?: (weapon: WeaponInstance, affectedAlliesCount: number) => void;
  onDefenseTrigger?: (weapon: WeaponInstance, targetEnemy: EnemyEntity, damageDealt: number) => void;
}

export interface WeaponBehaviorContext {
  weapon: WeaponInstance;
  enemies: EnemyEntity[];
  dt: number;
  currentTime: number;
  timer: number;
  aspdBonus?: number;
  weaponPos?: { x: number; y: number };
  wallY?: number;
  callbacks?: WeaponBehaviorCallbacks;
  // Output state
  newTimer?: number;
  selectedTarget?: EnemyEntity | null;
  hasFired?: boolean;
}

export class WeaponBehaviorTree {
  private root: SelectorNode<WeaponBehaviorContext>;

  constructor() {
    this.root = this.buildTree();
  }

  public tick(context: WeaponBehaviorContext): NodeStatus {
    return this.root.tick(context);
  }

  private buildTree(): SelectorNode<WeaponBehaviorContext> {
    const root = new SelectorNode<WeaponBehaviorContext>('WeaponRootSelector');

    // =========================================================================
    // Branch 1: Qimen Aura & Support Dispatch (奇门辅佐类光环脉冲)
    // =========================================================================
    const qimenSequence = new SequenceNode<WeaponBehaviorContext>('QimenAuraBranch');
    qimenSequence.addChild(new ConditionNode<WeaponBehaviorContext>('IsSupportAura', (ctx) => {
      return ctx.weapon.faction === 'qimen' || ctx.weapon.baseAtk === 0;
    }));
    qimenSequence.addChild(new ActionNode<WeaponBehaviorContext>('DispatchAura', (ctx) => {
      const interval = ctx.weapon.attackInterval || 2.0;
      let timer = ctx.timer + ctx.dt;

      if (timer >= interval) {
        timer = 0;
        ctx.newTimer = 0;
        ctx.callbacks?.onAuraPulse?.(ctx.weapon, 4);
        return 'SUCCESS';
      }

      ctx.newTimer = timer;
      return 'RUNNING';
    }));

    // =========================================================================
    // Branch 2: Frontline Fortress Barrier Reaction (城防要塞近身阻截)
    // =========================================================================
    const fortressSequence = new SequenceNode<WeaponBehaviorContext>('FortressBarrierBranch');
    fortressSequence.addChild(new ConditionNode<WeaponBehaviorContext>('IsFrontlineFortress', (ctx) => {
      return Boolean(ctx.weapon.isFortressOnly && ctx.weapon.anchor.row === 0);
    }));
    fortressSequence.addChild(new ActionNode<WeaponBehaviorContext>('TriggerBarrierReaction', (ctx) => {
      const interval = ctx.weapon.attackInterval || 1.0;
      let timer = ctx.timer + ctx.dt;

      if (timer < interval) {
        ctx.newTimer = timer;
        return 'RUNNING';
      }

      // Check enemies within barrier range (e.g. 1.0m ~ 3.5m)
      const options = {
        weaponPos: ctx.weaponPos,
        wallY: ctx.wallY ?? 860
      };
      const candidate = SpatialTargetingSystem.selectTarget(ctx.weapon, ctx.enemies, 'First', options);

      if (candidate) {
        ctx.newTimer = 0;
        ctx.selectedTarget = candidate;
        ctx.hasFired = true;
        ctx.callbacks?.onDefenseTrigger?.(ctx.weapon, candidate, ctx.weapon.baseAtk || 15);
        ctx.callbacks?.onFire?.(ctx.weapon, candidate);
        return 'SUCCESS';
      }

      ctx.newTimer = timer;
      return 'FAILURE';
    }));

    // =========================================================================
    // Branch 3: Standard Offensive Ballistics (常规远程/直射火力攻击)
    // =========================================================================
    const offensiveSequence = new SequenceNode<WeaponBehaviorContext>('OffensiveBallisticBranch');
    offensiveSequence.addChild(new ActionNode<WeaponBehaviorContext>('ExecuteAttackCycle', (ctx) => {
      const aspdBonus = ctx.aspdBonus ?? 0;
      // Calculate effective interval
      const effectiveInterval = Math.max(0.10, ctx.weapon.attackInterval / (1 + aspdBonus));
      let timer = ctx.timer + ctx.dt;

      if (timer < effectiveInterval) {
        ctx.newTimer = timer;
        return 'RUNNING';
      }

      const options = {
        weaponPos: ctx.weaponPos,
        wallY: ctx.wallY ?? 860
      };
      const candidate = SpatialTargetingSystem.selectTarget(ctx.weapon, ctx.enemies, 'First', options);

      if (candidate) {
        ctx.newTimer = 0;
        ctx.selectedTarget = candidate;
        ctx.hasFired = true;
        ctx.callbacks?.onFire?.(ctx.weapon, candidate);
        return 'SUCCESS';
      }

      // Timer caps at interval to be immediately ready when an enemy enters range
      ctx.newTimer = effectiveInterval;
      return 'FAILURE';
    }));

    root.addChild(qimenSequence);
    root.addChild(fortressSequence);
    root.addChild(offensiveSequence);

    return root;
  }
}
