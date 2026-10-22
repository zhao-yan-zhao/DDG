/**
 * 《孤城神机营》- Settlement & Evaluation Unit Tests
 * Validates GDD V3.0 §11.1 & ORIGINAL_REQUEST R3:
 * - 3-Star Rating logic (⭐, ⭐⭐, ⭐⭐⭐)
 * - Tactical Performance Grades (SSS, S, A, B, C) and gold multipliers
 * - Reward payouts (Gold, Iron, Blueprints) with first-clear bonuses and new star increments
 */

import { describe, it, expect } from 'vitest';
import {
  SettlementEvaluator,
  StarEvaluationResult,
  TacticalGrade
} from '../src/core/campaign/settlement-evaluator';
import { SettlementInputPayload } from '../src/core/wave/campaign-wave-engine';

describe('SettlementEvaluator (战后星级与战术评分结算器)', () => {
  describe('evaluateStars (三星评定逻辑)', () => {
    it('TC-STAR-01: Defeat yields 0 stars regardless of wall HP', () => {
      const res = SettlementEvaluator.evaluateStars(false, 950, 1000, 0);
      expect(res.stars).toBe(0);
      expect(res.star1Earned).toBe(false);
      expect(res.star2Earned).toBe(false);
      expect(res.star3Earned).toBe(false);
    });

    it('TC-STAR-02: 1-Star (坚守孤城) awarded when cleared but wall HP < 60%', () => {
      const res = SettlementEvaluator.evaluateStars(true, 500, 1000, 0);
      expect(res.stars).toBe(1);
      expect(res.star1Earned).toBe(true);
      expect(res.star2Earned).toBe(false);
      expect(res.star3Earned).toBe(false);
    });

    it('TC-STAR-03: 2-Star (城防完好) awarded when cleared and wall HP >= 60% but < 90%', () => {
      const res = SettlementEvaluator.evaluateStars(true, 750, 1000, 0);
      expect(res.stars).toBe(2);
      expect(res.star1Earned).toBe(true);
      expect(res.star2Earned).toBe(true);
      expect(res.star3Earned).toBe(false);
    });

    it('TC-STAR-04: 3-Star (固若金汤) awarded when cleared, wall HP >= 90%, and 0 revives used', () => {
      const res = SettlementEvaluator.evaluateStars(true, 920, 1000, 0);
      expect(res.stars).toBe(3);
      expect(res.star1Earned).toBe(true);
      expect(res.star2Earned).toBe(true);
      expect(res.star3Earned).toBe(true);
    });

    it('TC-STAR-05: 3-Star disqualified if player used revives, even with wall HP >= 90%', () => {
      const res = SettlementEvaluator.evaluateStars(true, 950, 1000, 1);
      expect(res.stars).toBe(2);
      expect(res.star1Earned).toBe(true);
      expect(res.star2Earned).toBe(true);
      expect(res.star3Earned).toBe(false);
    });
  });

  describe('evaluateTacticalGrade (战术评分与金币倍率)', () => {
    it('TC-TAC-01: Defeat always yields Grade C (败军之将) with 0.30x multiplier', () => {
      const stars: StarEvaluationResult = { stars: 0, star1Earned: false, star2Earned: false, star3Earned: false };
      const res = SettlementEvaluator.evaluateTacticalGrade(false, stars, 0, 1000, false);
      expect(res.grade).toBe('C');
      expect(res.title).toBe('败军之将');
      expect(res.multiplier).toBe(0.30);
    });

    it('TC-TAC-02: 1-Star yields Grade B (惨胜守御) with 1.00x multiplier', () => {
      const stars: StarEvaluationResult = { stars: 1, star1Earned: true, star2Earned: false, star3Earned: false };
      const res = SettlementEvaluator.evaluateTacticalGrade(true, stars, 500, 1000, false);
      expect(res.grade).toBe('B');
      expect(res.title).toBe('惨胜守御');
      expect(res.multiplier).toBe(1.00);
    });

    it('TC-TAC-03: 2-Star yields Grade A (劳苦功高) with 1.15x multiplier', () => {
      const stars: StarEvaluationResult = { stars: 2, star1Earned: true, star2Earned: true, star3Earned: false };
      const res = SettlementEvaluator.evaluateTacticalGrade(true, stars, 750, 1000, false);
      expect(res.grade).toBe('A');
      expect(res.title).toBe('劳苦功高');
      expect(res.multiplier).toBe(1.15);
    });

    it('TC-TAC-04: 3-Star yields Grade S (算无遗策) with 1.30x multiplier', () => {
      const stars: StarEvaluationResult = { stars: 3, star1Earned: true, star2Earned: true, star3Earned: true };
      const res = SettlementEvaluator.evaluateTacticalGrade(true, stars, 950, 1000, false);
      expect(res.grade).toBe('S');
      expect(res.title).toBe('算无遗策');
      expect(res.multiplier).toBe(1.30);
    });

    it('TC-TAC-05: 100% Wall HP + Double ★4 Awakening yields Grade SSS (镇国神帅) with 1.50x multiplier', () => {
      const stars: StarEvaluationResult = { stars: 3, star1Earned: true, star2Earned: true, star3Earned: true };
      const res = SettlementEvaluator.evaluateTacticalGrade(true, stars, 1000, 1000, true);
      expect(res.grade).toBe('SSS');
      expect(res.title).toBe('镇国神帅');
      expect(res.multiplier).toBe(1.50);
    });

    it('TC-TAC-06: 100% Wall HP without Double ★4 yields Grade S (算无遗策)', () => {
      const stars: StarEvaluationResult = { stars: 3, star1Earned: true, star2Earned: true, star3Earned: true };
      const res = SettlementEvaluator.evaluateTacticalGrade(true, stars, 1000, 1000, false);
      expect(res.grade).toBe('S');
      expect(res.multiplier).toBe(1.30);
    });
  });

  describe('computeSettlement (完整结算产出计算)', () => {
    it('TC-SET-01: First-clear Stage 1 with 3-Star Grade S applies first-clear bonuses and 3 new stars', () => {
      const input: SettlementInputPayload = {
        stageId: 1,
        cleared: true,
        wavesCleared: 6,
        totalWaves: 6,
        finalWallHp: 950,
        maxWallHp: 1000,
        revivesUsed: 0,
        hasDoubleStar4Awakening: false,
        isFirstClear: true
      };

      const result = SettlementEvaluator.computeSettlement(input, 0); // Previous best = 0 stars

      expect(result.cleared).toBe(true);
      expect(result.stars.stars).toBe(3);
      expect(result.newStarsEarned).toBe(3);
      expect(result.grade).toBe('S');
      expect(result.goldMultiplier).toBe(1.30);

      // Base first clear: 500 gold * 1.30 = 650 gold
      expect(result.rewards.gold).toBe(650);
      // Base iron: 150 + 3 * 50 = 300 iron
      expect(result.rewards.iron).toBe(300);
      // Base blueprints: 2 + 3 * 1 = 5 blueprints
      expect(result.rewards.blueprints).toBe(5);
      expect(result.firstClearBonusApplied).toBe(true);
    });

    it('TC-SET-02: Repeat clear Stage 1 with no new stars awards repeat base rewards only', () => {
      const input: SettlementInputPayload = {
        stageId: 1,
        cleared: true,
        wavesCleared: 6,
        totalWaves: 6,
        finalWallHp: 950,
        maxWallHp: 1000,
        revivesUsed: 0,
        hasDoubleStar4Awakening: false,
        isFirstClear: false
      };

      const result = SettlementEvaluator.computeSettlement(input, 3); // Already had 3 stars

      expect(result.newStarsEarned).toBe(0);
      expect(result.grade).toBe('S');
      // Repeat base: 100 gold * 1.30 = 130 gold
      expect(result.rewards.gold).toBe(130);
      // Repeat base iron: 25 + 0 = 25 iron
      expect(result.rewards.iron).toBe(25);
      // Repeat base blueprints: 0 + 0 = 0
      expect(result.rewards.blueprints).toBe(0);
    });

    it('TC-SET-03: Defeat on Wave 4 of Stage 4 grants consolation gold proportional to waves cleared', () => {
      const input: SettlementInputPayload = {
        stageId: 4,
        cleared: false,
        wavesCleared: 4,
        totalWaves: 10,
        finalWallHp: 0,
        maxWallHp: 1000,
        revivesUsed: 0,
        hasDoubleStar4Awakening: false,
        isFirstClear: false
      };

      const result = SettlementEvaluator.computeSettlement(input, 0);

      expect(result.cleared).toBe(false);
      expect(result.stars.stars).toBe(0);
      expect(result.grade).toBe('C');
      expect(result.goldMultiplier).toBe(0.30);

      // Consolation: repeatRewards.gold (400) * (4/10) * 0.30 = 48 gold
      expect(result.rewards.gold).toBe(48);
      expect(result.rewards.iron).toBe(0);
      expect(result.rewards.blueprints).toBe(0);
    });
  });
});
