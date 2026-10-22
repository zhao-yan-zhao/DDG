/**
 * 《孤城神机营》- Ballistics & Projectile Hit Resolution
 * 
 * Manages projectile trajectories, travel times, parabolic arc calculations,
 * and headless hit detection and damage resolution.
 */

import {
  WeaponInstance,
  EnemyEntity,
  DamageCalculationContext,
  DamageResult,
  ProjectileConfig,
  ProjectileState,
  ProjectileHitEvent
} from '../types';
import { DamagePipeline } from './damage-pipeline';
import { SpatialTargetingSystem } from './targeting';

const DEFAULT_PROJECTILE_SPEED = 15.0; // meters per second
const DEFAULT_ARC_HEIGHT = 80;         // pixels (or ~1.2m)
const PIXELS_PER_METER = 68;

const DEFAULT_WALL_Y = 540;

export class ProjectileManager {
  private activeProjectiles: Map<string, ProjectileState> = new Map();
  private nextId: number = 1;

  /**
   * Spawns a new in-flight projectile
   */
  public spawn(
    attacker: WeaponInstance,
    target: EnemyEntity,
    damageContext: DamageCalculationContext,
    config?: Partial<ProjectileConfig>,
    customStart?: { x: number; y: number },
    customTarget?: { x: number; y: number }
  ): ProjectileState {
    const id = `proj_${this.nextId++}_${Date.now()}`;

    // Determine start position (weapon)
    const weaponPos = SpatialTargetingSystem.getWeaponWorldPosition(attacker, customStart);
    const startX = weaponPos.x;
    const startY = weaponPos.y;

    // Determine target position
    const defaultWallY = DEFAULT_WALL_Y;
    let targetX = customTarget?.x ?? target.x ?? startX;
    let targetY = customTarget?.y ?? target.y;
    if (targetY === undefined) {
      if (target.distanceToWall !== undefined) {
        targetY = weaponPos.inPixels
          ? defaultWallY + target.distanceToWall * PIXELS_PER_METER
          : target.distanceToWall;
      } else {
        targetY = startY + 300;
      }
    }

    // Coordinate space normalization
    if (weaponPos.inPixels && targetX < 50 && targetY < 50) {
      targetX = targetX * PIXELS_PER_METER;
      targetY = targetY * PIXELS_PER_METER + defaultWallY;
    }

    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Speed in units/sec
    const speedInUnits = weaponPos.inPixels
      ? (config?.speed ?? DEFAULT_PROJECTILE_SPEED) * PIXELS_PER_METER
      : (config?.speed ?? DEFAULT_PROJECTILE_SPEED);

    const travelTime = Math.max(0.04, distance / Math.max(1.0, speedInUnits));
    const isHighArc = config?.isHighArc ?? (attacker.configId === 'cannon' || attacker.configId === 'catapult');
    const arcHeight = config?.arcHeight ?? (weaponPos.inPixels ? DEFAULT_ARC_HEIGHT : DEFAULT_ARC_HEIGHT / PIXELS_PER_METER);

    const projectile: ProjectileState = {
      id,
      attackerId: attacker.id,
      targetId: target.id,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      visualY: startY,
      targetX,
      targetY,
      speed: config?.speed ?? DEFAULT_PROJECTILE_SPEED,
      progress: 0.0,
      travelTime,
      elapsedTime: 0.0,
      isHighArc,
      arcHeight,
      isHit: false,
      damageContext,
      aoeRadius: config?.aoeRadius
    };

    this.activeProjectiles.set(id, projectile);
    return projectile;
  }

  /**
   * Advances the simulation by deltaTime seconds and resolves any hits
   */
  public update(deltaTime: number, allEnemies?: EnemyEntity[]): ProjectileHitEvent[] {
    const hitEvents: ProjectileHitEvent[] = [];
    const completedIds: string[] = [];

    for (const [id, proj] of this.activeProjectiles.entries()) {
      proj.elapsedTime += deltaTime;
      proj.progress = Math.min(1.0, proj.elapsedTime / proj.travelTime);

      // Linear motion in 2D
      proj.currentX = proj.startX + (proj.targetX - proj.startX) * proj.progress;
      proj.currentY = proj.startY + (proj.targetY - proj.startY) * proj.progress;

      // Parabolic arc for high-arc ballistic paths (mortars, catapults)
      if (proj.isHighArc) {
        // Height formula: 4 * h * p * (1 - p) -> peaks at p = 0.5 with value h
        const arcOffset = 4.0 * proj.arcHeight * proj.progress * (1.0 - proj.progress);
        proj.visualY = proj.currentY - arcOffset;
      } else {
        proj.visualY = proj.currentY;
      }

      // Hit resolution when progress reaches 1.0 (impact)
      if (proj.progress >= 1.0) {
        proj.isHit = true;
        completedIds.push(id);

        const primaryTarget = proj.damageContext.target;
        const damageResult = DamagePipeline.calculate(proj.damageContext);
        primaryTarget.currentHp = Math.max(0, primaryTarget.currentHp - damageResult.actualHpDeducted);

        const hitEvent: ProjectileHitEvent = {
          hit: true,
          projectile: proj,
          primaryTarget,
          damageResult
        };

        // Splash AOE resolution
        if (proj.aoeRadius && proj.aoeRadius > 0 && allEnemies && allEnemies.length > 0) {
          const splashTargets = SpatialTargetingSystem.getSplashTargets(
            primaryTarget,
            allEnemies,
            proj.aoeRadius
          );

          if (splashTargets.length > 0) {
            const splashResults: DamageResult[] = [];
            for (const splashTarget of splashTargets) {
              const splashCtx: DamageCalculationContext = {
                ...proj.damageContext,
                target: splashTarget
              };
              const splashRes = DamagePipeline.calculate(splashCtx);
              splashTarget.currentHp = Math.max(0, splashTarget.currentHp - splashRes.actualHpDeducted);
              splashResults.push(splashRes);
            }
            hitEvent.splashTargets = splashTargets;
            hitEvent.splashDamageResults = splashResults;
          }
        }

        hitEvents.push(hitEvent);
      }
    }

    // Clean up finished projectiles
    for (const id of completedIds) {
      this.activeProjectiles.delete(id);
    }

    return hitEvents;
  }

  /**
   * Headless simulation helper: fast-forwards a projectile directly to impact
   */
  public simulateToHit(projectileId: string, allEnemies?: EnemyEntity[]): ProjectileHitEvent | null {
    const proj = this.activeProjectiles.get(projectileId);
    if (!proj) return null;

    const remainingTime = Math.max(0, proj.travelTime - proj.elapsedTime);
    const events = this.update(remainingTime + 0.001, allEnemies);
    return events.find(e => e.projectile.id === projectileId) || null;
  }

  public getProjectile(id: string): ProjectileState | undefined {
    return this.activeProjectiles.get(id);
  }

  public getActiveProjectiles(): ProjectileState[] {
    return Array.from(this.activeProjectiles.values());
  }

  public getActiveCount(): number {
    return this.activeProjectiles.size;
  }

  public clear(): void {
    this.activeProjectiles.clear();
  }
}
