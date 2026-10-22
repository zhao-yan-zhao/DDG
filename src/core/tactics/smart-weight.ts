/**
 * 《孤城神机营》- Smart Faction Weighting Engine
 * Strictly conforms to GDD V3.0 §4.3:
 * - Dynamically extracts dominant faction by sand table occupied cell area.
 * - Dominant faction cards receive 1.85x weight.
 * - Absent faction cards (0 presence on grid) are suppressed to 0.15x weight.
 * - Neutral general cards remain 1.00x.
 * - Unlocked fusion cards receive 1.40x targeted weight; locked fusion cards receive 0.00x.
 */

import { Faction, WeaponInstance } from '../types';
import { TacticCardConfig } from '../../config/tactics.config';

export const DOMINANT_WEIGHT_MULTIPLIER = 1.85;
export const ABSENT_WEIGHT_MULTIPLIER = 0.15;
export const NEUTRAL_WEIGHT_MULTIPLIER = 1.00;
export const FUSION_UNLOCKED_WEIGHT_MULTIPLIER = 1.40;

export const ALL_FACTIONS: readonly Faction[] = ['fire', 'mohist', 'fortress', 'qimen'];

export interface BoardFactionAnalysis {
  areaMap: Record<Faction, number>;
  unitMap: Record<Faction, number>;
  totalOccupiedCells: number;
  dominantFaction: Faction | null;
  absentFactions: Faction[];
  presentFactions: Faction[];
}

export class SmartWeightEngine {
  /**
   * Analyzes player's placed weapons to extract occupied cell counts and unit counts by faction.
   */
  public static analyzeBoard(weapons: WeaponInstance[]): BoardFactionAnalysis {
    const areaMap: Record<Faction, number> = { fire: 0, mohist: 0, fortress: 0, qimen: 0 };
    const unitMap: Record<Faction, number> = { fire: 0, mohist: 0, fortress: 0, qimen: 0 };

    for (const w of weapons) {
      if (areaMap[w.faction] !== undefined) {
        const footprintCells = (w.footprint?.width || 1) * (w.footprint?.height || 1);
        areaMap[w.faction] += footprintCells;
        unitMap[w.faction] += 1;
      }
    }

    const totalOccupiedCells = Object.values(areaMap).reduce((acc, val) => acc + val, 0);

    // Dominant faction: largest occupied area
    let maxArea = 0;
    for (const f of ALL_FACTIONS) {
      if (areaMap[f] > maxArea) {
        maxArea = areaMap[f];
      }
    }

    let dominantFaction: Faction | null = null;
    if (maxArea > 0) {
      const candidates = ALL_FACTIONS.filter(f => areaMap[f] === maxArea);
      if (candidates.length === 1) {
        dominantFaction = candidates[0];
      } else {
        // Tie-breaker 1: highest unit count
        let maxUnits = -1;
        let bestCandidate = candidates[0];
        for (const c of candidates) {
          if (unitMap[c] > maxUnits) {
            maxUnits = unitMap[c];
            bestCandidate = c;
          }
        }
        dominantFaction = bestCandidate;
      }
    }

    const absentFactions = ALL_FACTIONS.filter(f => areaMap[f] === 0);
    const presentFactions = ALL_FACTIONS.filter(f => areaMap[f] > 0);

    return {
      areaMap,
      unitMap,
      totalOccupiedCells,
      dominantFaction,
      absentFactions,
      presentFactions
    };
  }

  /**
   * Computes the effective weight multiplier for a given card based on board analysis.
   */
  public static calculateMultiplier(
    card: TacticCardConfig,
    board: BoardFactionAnalysis,
    isFusionUnlocked: boolean = false
  ): number {
    if (card.category === 'fusion') {
      return isFusionUnlocked ? FUSION_UNLOCKED_WEIGHT_MULTIPLIER : 0.0;
    }

    if (card.category === 'general') {
      return NEUTRAL_WEIGHT_MULTIPLIER;
    }

    // Faction-specific cards
    const faction = card.category as Faction;
    if (board.dominantFaction && faction === board.dominantFaction) {
      return DOMINANT_WEIGHT_MULTIPLIER;
    }

    if (board.absentFactions.includes(faction)) {
      return ABSENT_WEIGHT_MULTIPLIER;
    }

    return NEUTRAL_WEIGHT_MULTIPLIER;
  }

  /**
   * Computes final numerical weight for draw pool selection.
   */
  public static calculateWeight(
    card: TacticCardConfig,
    board: BoardFactionAnalysis,
    isFusionUnlocked: boolean = false
  ): number {
    const base = card.baseWeight ?? 100;
    const mult = this.calculateMultiplier(card, board, isFusionUnlocked);
    return Math.max(0, base * mult);
  }
}
