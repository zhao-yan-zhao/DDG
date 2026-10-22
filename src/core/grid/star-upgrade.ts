/**
 * 《孤城神机营》- 2-in-1 Star Upgrade State Machine
 * Two same-name, same-star weapons merge into higher star level (★1 -> ★2 -> ★3 -> ★4).
 * Pure headless domain logic (Zero DOM / Zero Phaser dependencies).
 */

import { WeaponInstance, StarLevel, GridPosition, GridFootprint } from '../types';
import { FrontlineDefenseManager } from '../defense/frontline-manager';

export const MAX_STAR_LEVEL: StarLevel = 4;

export type MergeFailReason =
  | 'CONFIG_MISMATCH'
  | 'STAR_MISMATCH'
  | 'MAX_STAR_REACHED'
  | 'INSUFFICIENT_OVERLAP'
  | 'FORTRESS_CONSTRAINT_VIOLATION';

export interface MergeEvaluationResult {
  canMerge: boolean;
  reason?: MergeFailReason;
  overlapRatio?: number;
  mergedWeapon?: WeaponInstance;
}

export class StarUpgradeStateMachine {
  /**
   * Calculates intersection area and overlap ratio between two footprint rectangles.
   */
  public static calculateOverlapRatio(
    anchorA: GridPosition,
    footprintA: GridFootprint,
    anchorB: GridPosition,
    footprintB: GridFootprint
  ): { overlapCells: number; ratioA: number; ratioB: number } {
    const rStart = Math.max(anchorA.row, anchorB.row);
    const rEnd = Math.min(anchorA.row + footprintA.height, anchorB.row + footprintB.height);
    const cStart = Math.max(anchorA.col, anchorB.col);
    const cEnd = Math.min(anchorA.col + footprintA.width, anchorB.col + footprintB.width);

    if (rEnd <= rStart || cEnd <= cStart) {
      return { overlapCells: 0, ratioA: 0, ratioB: 0 };
    }

    const overlapCells = (rEnd - rStart) * (cEnd - cStart);
    const areaA = footprintA.width * footprintA.height;
    const areaB = footprintB.width * footprintB.height;

    return {
      overlapCells,
      ratioA: overlapCells / areaA,
      ratioB: overlapCells / areaB
    };
  }

  /**
   * Checks whether two weapon instances can merge based on configuration, stars, and bounds.
   */
  public static canMergeWeapons(
    source: WeaponInstance,
    target: WeaponInstance
  ): { canMerge: boolean; reason?: MergeFailReason } {
    // 1. Same config ID check
    if (source.configId !== target.configId) {
      return { canMerge: false, reason: 'CONFIG_MISMATCH' };
    }

    // 2. Same star level check
    if (source.star !== target.star) {
      return { canMerge: false, reason: 'STAR_MISMATCH' };
    }

    // 3. Boundary check: Max star is 4
    if (source.star >= MAX_STAR_LEVEL || target.star >= MAX_STAR_LEVEL) {
      return { canMerge: false, reason: 'MAX_STAR_REACHED' };
    }

    return { canMerge: true };
  }

  /**
   * Evaluates merge attempt when dragging source to target anchor.
   * Min overlap threshold is 50% (0.50).
   */
  public static evaluateMerge(
    source: WeaponInstance,
    target: WeaponInstance,
    sourceAnchor: GridPosition,
    targetAnchor: GridPosition,
    minOverlapRatio: number = 0.50
  ): MergeEvaluationResult {
    const baseCheck = this.canMergeWeapons(source, target);
    if (!baseCheck.canMerge) {
      return { canMerge: false, reason: baseCheck.reason };
    }

    // Overlap calculation
    const overlap = this.calculateOverlapRatio(
      sourceAnchor,
      source.footprint,
      targetAnchor,
      target.footprint
    );

    // Either ratioA or ratioB >= minOverlapRatio (>= 50%)
    if (overlap.ratioB < minOverlapRatio && overlap.ratioA < minOverlapRatio) {
      return {
        canMerge: false,
        reason: 'INSUFFICIENT_OVERLAP',
        overlapRatio: Math.max(overlap.ratioA, overlap.ratioB)
      };
    }

    // Fortress validation: If fortress, must stay on row 0
    if (target.isFortressOnly && target.anchor.row !== 0) {
      return {
        canMerge: false,
        reason: 'FORTRESS_CONSTRAINT_VIOLATION'
      };
    }

    const nextStar = (target.star + 1) as StarLevel;

    // Calculate synthetic HP for Row 0 Fortress weapons
    let newMaxHp: number | undefined = undefined;
    let newCurrentHp: number | undefined = undefined;
    let newIsBroken: boolean | undefined = undefined;

    if (target.isFortressOnly || target.anchor.row === 0 || source.anchor.row === 0) {
      newMaxHp = FrontlineDefenseManager.getBaseHp(target.configId, nextStar);

      const srcMax = source.maxHp ?? FrontlineDefenseManager.getBaseHp(source.configId, source.star);
      const tgtMax = target.maxHp ?? FrontlineDefenseManager.getBaseHp(target.configId, target.star);

      const srcRatio = Math.max(0, Math.min(1.0, (source.currentHp ?? srcMax) / srcMax));
      const tgtRatio = Math.max(0, Math.min(1.0, (target.currentHp ?? tgtMax) / tgtMax));

      // Synthesized health ratio = average of both cards
      const avgRatio = (srcRatio + tgtRatio) / 2;
      newCurrentHp = Math.max(1, Math.round(newMaxHp * avgRatio));
      newIsBroken = false; // Synthesizing revives and repairs unit with at least 1 HP
    }

    const upgradedWeapon: WeaponInstance = {
      ...target,
      star: nextStar,
      baseAtk: Math.round(target.baseAtk * 1.8),
      maxHp: newMaxHp !== undefined ? newMaxHp : target.maxHp,
      currentHp: newCurrentHp !== undefined ? newCurrentHp : target.currentHp,
      isBroken: newIsBroken !== undefined ? newIsBroken : target.isBroken,
      // Star 3 or 4 activation / stat scalings
      anchor: { ...target.anchor }
    };

    return {
      canMerge: true,
      overlapRatio: Math.max(overlap.ratioA, overlap.ratioB),
      mergedWeapon: upgradedWeapon
    };
  }

  /**
   * Directly executes merge between two weapons, returning new upgraded instance.
   */
  public static executeMerge(
    source: WeaponInstance,
    target: WeaponInstance
  ): WeaponInstance {
    const check = this.canMergeWeapons(source, target);
    if (!check.canMerge) {
      throw new Error(`无法执行升星合成: ${check.reason}`);
    }

    const nextStar = (target.star + 1) as StarLevel;

    // Calculate synthetic HP for Row 0 Fortress weapons
    let newMaxHp: number | undefined = undefined;
    let newCurrentHp: number | undefined = undefined;
    let newIsBroken: boolean | undefined = undefined;

    if (target.isFortressOnly || target.anchor.row === 0 || source.anchor.row === 0) {
      newMaxHp = FrontlineDefenseManager.getBaseHp(target.configId, nextStar);

      const srcMax = source.maxHp ?? FrontlineDefenseManager.getBaseHp(source.configId, source.star);
      const tgtMax = target.maxHp ?? FrontlineDefenseManager.getBaseHp(target.configId, target.star);

      const srcRatio = Math.max(0, Math.min(1.0, (source.currentHp ?? srcMax) / srcMax));
      const tgtRatio = Math.max(0, Math.min(1.0, (target.currentHp ?? tgtMax) / tgtMax));

      const avgRatio = (srcRatio + tgtRatio) / 2;
      newCurrentHp = Math.max(1, Math.round(newMaxHp * avgRatio));
      newIsBroken = false;
    }

    return {
      ...target,
      star: nextStar,
      baseAtk: Math.round(target.baseAtk * 1.8),
      maxHp: newMaxHp !== undefined ? newMaxHp : target.maxHp,
      currentHp: newCurrentHp !== undefined ? newCurrentHp : target.currentHp,
      isBroken: newIsBroken !== undefined ? newIsBroken : target.isBroken
    };
  }
}
