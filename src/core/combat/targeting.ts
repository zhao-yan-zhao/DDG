/**
 * 《孤城神机营》- Spatial Targeting System
 * 
 * Implements weapon targeting strategies:
 * - First: Furthest along path / closest to city wall (minimum distance to Row 0)
 * - Strongest: Highest current HP
 * - ClusterAOE: Target with highest enemy concentration within weapon range
 * 
 * Enforces range filtering: distance <= weapon.range
 */

import { WeaponInstance, EnemyEntity, TargetingStrategy, TargetingOptions } from '../types';

const PIXELS_PER_METER = 68;
const DEFAULT_WALL_Y = 540;
const DEFAULT_AOE_RADIUS = 2.0; // meters

export class SpatialTargetingSystem {
  /**
   * Calculates the world position of a weapon based on its grid anchor
   */
  public static getWeaponWorldPosition(
    weapon: WeaponInstance,
    customPos?: { x: number; y: number }
  ): { x: number; y: number; inPixels: boolean } {
    if (customPos) {
      const inPixels = customPos.x > 50 || customPos.y > 50;
      return { x: customPos.x, y: customPos.y, inPixels };
    }

    // Grid center mapping: 5x5 board in 750px width, row 0 adjacent to wall (y=502px)
    const col = weapon.anchor.col;
    const row = weapon.anchor.row;
    const width = weapon.footprint?.width || 1;
    const height = weapon.footprint?.height || 1;

    // Center in pixel coordinates
    const pxX = 185 + (col + width / 2) * 76;
    const pxY = DEFAULT_WALL_Y - (row + height / 2) * 76;

    return { x: pxX, y: pxY, inPixels: true };
  }

  /**
   * Computes the distance in meters between an enemy and the city wall (Row 0)
   */
  public static getEnemyDistanceToWall(enemy: EnemyEntity, wallY: number = DEFAULT_WALL_Y): number {
    if (enemy.distanceToWall !== undefined) {
      return enemy.distanceToWall;
    }

    if (enemy.y !== undefined) {
      if (enemy.y > 100) {
        // Pixel coordinates (battlefield is y: 560~1240, approaching wall at y: 540)
        return Math.max(0, (enemy.y - wallY) / PIXELS_PER_METER);
      } else {
        // Meter coordinates
        return Math.max(0, enemy.y);
      }
    }

    // Default fallback to 0 if not specified
    return 0;
  }

  /**
   * Computes distance in meters between a weapon and an enemy
   */
  public static getDistanceToWeapon(
    weapon: WeaponInstance,
    enemy: EnemyEntity,
    options?: TargetingOptions
  ): number {
    const wallY = options?.wallY ?? DEFAULT_WALL_Y;

    // If enemy only has distanceToWall (1D track)
    if (enemy.x === undefined && enemy.y === undefined) {
      const distToWall = this.getEnemyDistanceToWall(enemy, wallY);
      // Weapon row offset (each row adds ~1.1m in depth)
      const rowOffset = (weapon.anchor.row + (weapon.footprint?.height || 1) / 2) * (76 / PIXELS_PER_METER);
      return Math.sqrt(distToWall * distToWall + rowOffset * rowOffset);
    }

    // 2D distance calculation
    const weaponPos = this.getWeaponWorldPosition(weapon, options?.weaponPos);
    let enemyX = enemy.x ?? 0;
    let enemyY = enemy.y ?? 0;

    if (weaponPos.inPixels) {
      // If enemy coordinates are in meters (e.g. <= 25), convert to pixels
      if (enemyX < 50 && enemyY < 50) {
        enemyX = enemyX * PIXELS_PER_METER;
        enemyY = enemyY * PIXELS_PER_METER + wallY;
      }
      const dx = enemyX - weaponPos.x;
      const dy = enemyY - weaponPos.y;
      return Math.sqrt(dx * dx + dy * dy) / PIXELS_PER_METER;
    } else {
      // Meter-based space
      if (enemyX > 100 || enemyY > 100) {
        enemyX = enemyX / PIXELS_PER_METER;
        enemyY = (enemyY - wallY) / PIXELS_PER_METER;
      }
      const dx = enemyX - weaponPos.x;
      const dy = enemyY - weaponPos.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }

  /**
   * Computes distance in meters between two enemies
   */
  public static getDistanceBetweenEnemies(e1: EnemyEntity, e2: EnemyEntity): number {
    if (e1.x !== undefined && e1.y !== undefined && e2.x !== undefined && e2.y !== undefined) {
      const dx = e1.x - e2.x;
      const dy = e1.y - e2.y;
      const isPixelSpace = (e1.x > 50 || e1.y > 50 || e2.x > 50 || e2.y > 50);
      const dist = Math.sqrt(dx * dx + dy * dy);
      return isPixelSpace ? dist / PIXELS_PER_METER : dist;
    }

    // 1D distance along track fallback
    const d1 = this.getEnemyDistanceToWall(e1);
    const d2 = this.getEnemyDistanceToWall(e2);
    return Math.abs(d1 - d2);
  }

  /**
   * Filters living enemies within weapon range
   */
  public static filterInRange(
    weapon: WeaponInstance,
    enemies: EnemyEntity[],
    options?: TargetingOptions
  ): EnemyEntity[] {
    const maxRange = weapon.range;
    return enemies.filter(enemy => {
      if (enemy.currentHp <= 0) return false;
      const dist = this.getDistanceToWeapon(weapon, enemy, options);
      return dist <= maxRange + 1e-4;
    });
  }

  /**
   * Selects an enemy according to the chosen strategy
   */
  public static selectTarget(
    weapon: WeaponInstance,
    enemies: EnemyEntity[],
    strategy: TargetingStrategy = 'First',
    options?: TargetingOptions
  ): EnemyEntity | null {
    const inRange = this.filterInRange(weapon, enemies, options);
    if (inRange.length === 0) {
      return null;
    }

    if (inRange.length === 1) {
      return inRange[0];
    }

    const wallY = options?.wallY ?? DEFAULT_WALL_Y;

    switch (strategy) {
      case 'First': {
        // Closest to the city wall / Row 0 (lowest distanceToWall)
        let best = inRange[0];
        let bestDist = this.getEnemyDistanceToWall(best, wallY);

        for (let i = 1; i < inRange.length; i++) {
          const candidate = inRange[i];
          const dist = this.getEnemyDistanceToWall(candidate, wallY);
          if (dist < bestDist - 1e-4) {
            best = candidate;
            bestDist = dist;
          } else if (Math.abs(dist - bestDist) <= 1e-4) {
            // Tie breaker: higher current HP
            if (candidate.currentHp > best.currentHp) {
              best = candidate;
              bestDist = dist;
            }
          }
        }
        return best;
      }

      case 'Strongest': {
        // Highest current HP
        let best = inRange[0];

        for (let i = 1; i < inRange.length; i++) {
          const candidate = inRange[i];
          if (candidate.currentHp > best.currentHp) {
            best = candidate;
          } else if (candidate.currentHp === best.currentHp) {
            // Tie breaker: closer to wall
            const distCandidate = this.getEnemyDistanceToWall(candidate, wallY);
            const distBest = this.getEnemyDistanceToWall(best, wallY);
            if (distCandidate < distBest) {
              best = candidate;
            }
          }
        }
        return best;
      }

      case 'ClusterAOE': {
        // Point with highest enemy concentration within weapon range
        const aoeRadius = options?.aoeRadius ?? DEFAULT_AOE_RADIUS;
        const livingEnemies = enemies.filter(e => e.currentHp > 0);

        let bestTarget = inRange[0];
        let maxCount = -1;
        let bestDistToWall = Infinity;

        for (const candidate of inRange) {
          // Count all alive enemies within aoeRadius of this candidate
          let count = 0;
          for (const other of livingEnemies) {
            const dist = this.getDistanceBetweenEnemies(candidate, other);
            if (dist <= aoeRadius + 1e-4) {
              count++;
            }
          }

          const distToWall = this.getEnemyDistanceToWall(candidate, wallY);
          if (count > maxCount) {
            maxCount = count;
            bestTarget = candidate;
            bestDistToWall = distToWall;
          } else if (count === maxCount) {
            // Tie breaker: closer to wall
            if (distToWall < bestDistToWall) {
              bestTarget = candidate;
              bestDistToWall = distToWall;
            }
          }
        }
        return bestTarget;
      }

      default:
        return inRange[0];
    }
  }

  /**
   * Finds all living enemies within a given AOE radius of an impact target
   */
  public static getSplashTargets(
    primaryTarget: EnemyEntity,
    allEnemies: EnemyEntity[],
    aoeRadius: number = DEFAULT_AOE_RADIUS
  ): EnemyEntity[] {
    return allEnemies.filter(enemy => {
      if (enemy.currentHp <= 0) return false;
      if (enemy.id === primaryTarget.id) return false; // Primary is separate
      const dist = this.getDistanceBetweenEnemies(primaryTarget, enemy);
      return dist <= aoeRadius + 1e-4;
    });
  }
}

/**
 * Functional wrapper for target selection
 */
export function selectTarget(
  weapon: WeaponInstance,
  enemies: EnemyEntity[],
  strategy: TargetingStrategy = 'First',
  options?: TargetingOptions
): EnemyEntity | null {
  return SpatialTargetingSystem.selectTarget(weapon, enemies, strategy, options);
}

export const SpatialTargeting = SpatialTargetingSystem;
export type SpatialTargeting = SpatialTargetingSystem;
