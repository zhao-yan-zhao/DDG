/**
 * 《孤城神机营》- Headless Behavior Tree (BT) Core Framework
 * Strictly conforms to GDD V3.0 and PROJECT.md:
 * - Pure TypeScript, Zero DOM, Zero Phaser dependencies.
 * - Standard Node States: SUCCESS, FAILURE, RUNNING.
 * - Composite Nodes: Selector, Sequence, Parallel.
 * - Decorator Nodes: Inverter, Condition, Cooldown.
 * - Action Leaf Nodes: Custom functional actions.
 */

export type NodeStatus = 'SUCCESS' | 'FAILURE' | 'RUNNING';

/**
 * Base abstract node for all behavior tree entities
 */
export abstract class BehaviorNode<TContext = any> {
  public name: string;

  constructor(name: string = 'BehaviorNode') {
    this.name = name;
  }

  public abstract tick(context: TContext): NodeStatus;

  /**
   * Optional reset hook for stateful nodes
   */
  public reset(): void {}
}

// ============================================================================
// 1. Composite Nodes (组合节点)
// ============================================================================

/**
 * Selector Node (Fallback / OR logic):
 * Executes children sequentially until one returns SUCCESS or RUNNING.
 * Returns FAILURE only if all children fail.
 */
export class SelectorNode<TContext = any> extends BehaviorNode<TContext> {
  protected children: BehaviorNode<TContext>[];

  constructor(name: string, children: BehaviorNode<TContext>[] = []) {
    super(name);
    this.children = children;
  }

  public addChild(child: BehaviorNode<TContext>): this {
    this.children.push(child);
    return this;
  }

  public tick(context: TContext): NodeStatus {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== 'FAILURE') {
        return status;
      }
    }
    return 'FAILURE';
  }

  public override reset(): void {
    for (const child of this.children) {
      child.reset();
    }
  }
}

/**
 * Sequence Node (AND logic):
 * Executes children sequentially until one returns FAILURE or RUNNING.
 * Returns SUCCESS only if all children succeed.
 */
export class SequenceNode<TContext = any> extends BehaviorNode<TContext> {
  protected children: BehaviorNode<TContext>[];

  constructor(name: string, children: BehaviorNode<TContext>[] = []) {
    super(name);
    this.children = children;
  }

  public addChild(child: BehaviorNode<TContext>): this {
    this.children.push(child);
    return this;
  }

  public tick(context: TContext): NodeStatus {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== 'SUCCESS') {
        return status;
      }
    }
    return 'SUCCESS';
  }

  public override reset(): void {
    for (const child of this.children) {
      child.reset();
    }
  }
}

/**
 * Parallel Node:
 * Ticks all children concurrently in a single tick.
 */
export class ParallelNode<TContext = any> extends BehaviorNode<TContext> {
  protected children: BehaviorNode<TContext>[];
  protected policy: 'RequireAll' | 'RequireOne';

  constructor(
    name: string,
    policy: 'RequireAll' | 'RequireOne' | 'require-all' | 'require-one' = 'RequireAll',
    children: BehaviorNode<TContext>[] = []
  ) {
    super(name);
    this.policy = (policy as string).toLowerCase().includes('one') ? 'RequireOne' : 'RequireAll';
    this.children = children;
  }

  public addChild(child: BehaviorNode<TContext>): this {
    this.children.push(child);
    return this;
  }

  public tick(context: TContext): NodeStatus {
    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;

    for (const child of this.children) {
      const status = child.tick(context);
      if (status === 'SUCCESS') successCount++;
      else if (status === 'FAILURE') failureCount++;
      else if (status === 'RUNNING') runningCount++;
    }

    if (this.policy === 'RequireOne') {
      if (successCount > 0) return 'SUCCESS';
      if (runningCount > 0) return 'RUNNING';
      return 'FAILURE';
    } else {
      // RequireAll
      if (failureCount > 0) return 'FAILURE';
      if (runningCount > 0) return 'RUNNING';
      return 'SUCCESS';
    }
  }

  public override reset(): void {
    for (const child of this.children) {
      child.reset();
    }
  }
}

// ============================================================================
// 2. Decorator Nodes (装饰节点)
// ============================================================================

/**
 * Inverter Node:
 * Inverts SUCCESS to FAILURE, and FAILURE to SUCCESS. RUNNING stays RUNNING.
 */
export class InverterNode<TContext = any> extends BehaviorNode<TContext> {
  protected child: BehaviorNode<TContext>;

  constructor(name: string, child: BehaviorNode<TContext>) {
    super(name);
    this.child = child;
  }

  public tick(context: TContext): NodeStatus {
    const status = this.child.tick(context);
    if (status === 'SUCCESS') return 'FAILURE';
    if (status === 'FAILURE') return 'SUCCESS';
    return 'RUNNING';
  }

  public override reset(): void {
    this.child.reset();
  }
}

/**
 * Condition Node:
 * Executes predicate function on context. Returns SUCCESS if true, FAILURE if false.
 */
export class ConditionNode<TContext = any> extends BehaviorNode<TContext> {
  protected predicate: (context: TContext) => boolean;

  constructor(name: string, predicate: (context: TContext) => boolean) {
    super(name);
    this.predicate = predicate;
  }

  public tick(context: TContext): NodeStatus {
    return this.predicate(context) ? 'SUCCESS' : 'FAILURE';
  }
}

/**
 * Cooldown Decorator Node:
 * Enforces minimum elapsed time between executions of its child node.
 */
export class CooldownNode<TContext = any> extends BehaviorNode<TContext> {
  protected child: BehaviorNode<TContext>;
  protected cooldownSeconds: number;
  protected lastExecutionTime: number = -999999;
  protected getTime: (context: TContext) => number;

  constructor(
    name: string,
    childOrCooldown: BehaviorNode<TContext> | number,
    cooldownOrChild: number | BehaviorNode<TContext>,
    getTime?: (context: TContext) => number
  ) {
    super(name);
    if (typeof childOrCooldown === 'number') {
      this.cooldownSeconds = childOrCooldown;
      this.child = cooldownOrChild as BehaviorNode<TContext>;
    } else {
      this.child = childOrCooldown;
      this.cooldownSeconds = cooldownOrChild as number;
    }
    this.getTime = getTime ?? ((ctx: any) => ctx.currentTime ?? ctx.time ?? 0);
  }

  public tick(context: TContext): NodeStatus {
    const now = this.getTime(context);
    if (now - this.lastExecutionTime < this.cooldownSeconds) {
      return 'FAILURE';
    }

    const status = this.child.tick(context);
    if (status === 'SUCCESS' || status === 'RUNNING') {
      this.lastExecutionTime = now;
    }
    return status;
  }

  public override reset(): void {
    this.lastExecutionTime = -999999;
    this.child.reset();
  }
}

// ============================================================================
// 3. Action Leaf Node (动作叶子节点)
// ============================================================================

/**
 * Action Node:
 * Executes an arbitrary stateful or stateless action.
 */
export class ActionNode<TContext = any> extends BehaviorNode<TContext> {
  protected action: (context: TContext) => NodeStatus;

  constructor(name: string, action: (context: TContext) => NodeStatus) {
    super(name);
    this.action = action;
  }

  public tick(context: TContext): NodeStatus {
    return this.action(context);
  }
}
