/**
 * 《孤城神机营》- Settlement & Rating Evaluator (战后星级与战术评分结算器)
 * Implements GDD V3.0 §11.1 & ORIGINAL_REQUEST R3:
 * - 3-Star Rating (⭐ Clear, ⭐⭐ Wall HP >= 60%, ⭐⭐⭐ Wall HP >= 90% & 0 revives)
 * - Tactical Grade (SSS, S, A, B, C) and Gold Multipliers (1.50x, 1.30x, 1.15x, 1.00x, 0.30x)
 * - Currency loot calculation (Gold, Iron, Blueprints) with first-clear vs repeat-clear logic
 *
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 */

import { getStageConfig, StageConfig, StageRewards } from '../../config/campaign.config';
import { SettlementInputPayload } from '../wave/campaign-wave-engine';
import { Currencies } from '../meta/types';
import { WeaponCombatStat } from '../combat/combat-stats-tracker';

export type TacticalGrade = 'SSS' | 'S' | 'A' | 'B' | 'C';

export interface StarEvaluationResult {
  stars: number; // 0..3
  star1Earned: boolean; // 坚守孤城 (Cleared)
  star2Earned: boolean; // 城防完好 (Wall HP >= 60%)
  star3Earned: boolean; // 固若金汤 (Wall HP >= 90% and 0 revives)
}

export interface SettlementResult {
  stageId: number;
  chapterId: number;
  cleared: boolean;
  wavesCleared: number;
  totalWaves: number;
  wallHpPercent: number; // 0..100
  revivesUsed: number;
  stars: StarEvaluationResult;
  newStarsEarned: number; // Number of newly achieved stars (0..3)
  grade: TacticalGrade;
  gradeTitle: string;
  goldMultiplier: number;
  rewards: Currencies;
  firstClearBonusApplied: boolean;
  weaponStats?: WeaponCombatStat[];
}

export class SettlementEvaluator {
  /**
   * Evaluates 3-star conditions based on clear status, wall HP, and revives.
   */
  public static evaluateStars(
    cleared: boolean,
    finalWallHp: number,
    maxWallHp: number,
    revivesUsed: number
  ): StarEvaluationResult {
    if (!cleared || maxWallHp <= 0) {
      return {
        stars: 0,
        star1Earned: false,
        star2Earned: false,
        star3Earned: false
      };
    }

    const hpRatio = Math.max(0, finalWallHp) / maxWallHp;
    const star1 = cleared;
    const star2 = hpRatio >= 0.60;
    const star3 = hpRatio >= 0.90 && revivesUsed === 0;

    let starCount = 0;
    if (star1) starCount++;
    if (star2) starCount++;
    if (star3) starCount++;

    return {
      stars: starCount,
      star1Earned: star1,
      star2Earned: star2,
      star3Earned: star3
    };
  }

  /**
   * Evaluates tactical performance grade (SSS~C) and gold multiplier.
   * GDD §11.1:
   * - SSS: 100% Wall HP + at least 2 ★4 awakened weapons (+50% gold / 1.50x)
   * - S: 3-Star achieved (+30% gold / 1.30x)
   * - A: 2-Star achieved (+15% gold / 1.15x)
   * - B: 1-Star achieved (1.00x)
   * - C: Defeat (30% consolation / 0.30x)
   */
  public static evaluateTacticalGrade(
    cleared: boolean,
    stars: StarEvaluationResult,
    finalWallHp: number,
    maxWallHp: number,
    hasDoubleStar4Awakening: boolean
  ): { grade: TacticalGrade; title: string; multiplier: number } {
    if (!cleared) {
      return { grade: 'C', title: '败军之将', multiplier: 0.30 };
    }

    const hpRatio = maxWallHp > 0 ? finalWallHp / maxWallHp : 0;

    if (hpRatio >= 1.0 && hasDoubleStar4Awakening) {
      return { grade: 'SSS', title: '镇国神帅', multiplier: 1.50 };
    }

    if (stars.stars >= 3) {
      return { grade: 'S', title: '算无遗策', multiplier: 1.30 };
    }

    if (stars.stars === 2) {
      return { grade: 'A', title: '劳苦功高', multiplier: 1.15 };
    }

    return { grade: 'B', title: '惨胜守御', multiplier: 1.00 };
  }

  /**
   * Master settlement computation: calculates stars, tactical grade, and reward payout.
   * @param input Combat summary and stage context
   * @param previousBestStars Highest stars previously recorded for this stage (0..3)
   */
  public static computeSettlement(
    input: SettlementInputPayload,
    previousBestStars: number = 0
  ): SettlementResult {
    const stage = getStageConfig(input.stageId);
    const starEval = this.evaluateStars(
      input.cleared,
      input.finalWallHp,
      input.maxWallHp,
      input.revivesUsed
    );

    const gradeEval = this.evaluateTacticalGrade(
      input.cleared,
      starEval,
      input.finalWallHp,
      input.maxWallHp,
      input.hasDoubleStar4Awakening
    );

    const newStarsEarned = Math.max(0, starEval.stars - Math.max(0, previousBestStars));
    const hpPercent = input.maxWallHp > 0
      ? Math.round((Math.max(0, input.finalWallHp) / input.maxWallHp) * 1000) / 10
      : 0;

    let rewardGold = 0;
    let rewardIron = 0;
    let rewardBlueprints = 0;

    if (input.cleared) {
      const baseRewards = input.isFirstClear ? stage.firstClearRewards : stage.repeatRewards;
      rewardGold = Math.floor(baseRewards.gold * gradeEval.multiplier);

      // Iron payout: Base iron + 50 iron for each new star earned (GDD §11.1)
      rewardIron = baseRewards.iron + newStarsEarned * 50;

      // Blueprint payout: Base blueprints + 1 blueprint for each new star earned (GDD §11.1)
      rewardBlueprints = baseRewards.blueprints + newStarsEarned * 1;
    } else {
      // Consolation payout on defeat: proportional to waves cleared
      const progressRatio = stage.totalWaves > 0 ? input.wavesCleared / stage.totalWaves : 0;
      rewardGold = Math.max(10, Math.floor(stage.repeatRewards.gold * progressRatio * gradeEval.multiplier));
      rewardIron = 0;
      rewardBlueprints = 0;
    }

    return {
      stageId: input.stageId,
      chapterId: stage.chapterId,
      cleared: input.cleared,
      wavesCleared: input.wavesCleared,
      totalWaves: input.totalWaves,
      wallHpPercent: hpPercent,
      revivesUsed: input.revivesUsed,
      stars: starEval,
      newStarsEarned,
      grade: gradeEval.grade,
      gradeTitle: gradeEval.title,
      goldMultiplier: gradeEval.multiplier,
      rewards: {
        gold: rewardGold,
        iron: rewardIron,
        blueprints: rewardBlueprints
      },
      firstClearBonusApplied: input.isFirstClear
    };
  }

  public static evaluate = SettlementEvaluator.computeSettlement;
}
