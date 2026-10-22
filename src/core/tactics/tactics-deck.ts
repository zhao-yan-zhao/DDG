/**
 * 《孤城神机营》- Roguelike Tactics Deck Manager
 * Strictly conforms to GDD V3.0 §4.3 & §7.2:
 * - Candidate draw (3 distinct cards, sampling without replacement)
 * - Wave quality guarantees:
 *   - Wave 1: 3 Purple cards (FTUE Step 3 guarantees T11 in Slot 0)
 *   - Wave 5: >= 1 Gold card
 *   - Wave 10: >= 2 Gold or Red-Gold cards
 * - Smart faction weighting & fusion unlock gates
 * - Pick limits: T01, T02, T07 max 2 picks; all remaining 33 cards max 1 pick.
 */

import { WeaponInstance } from '../types';
import {
  TacticCardConfig,
  TacticQuality,
  TACTICS_CONFIG
} from '../../config/tactics.config';
import { SmartWeightEngine } from './smart-weight';
import { FusionUnlockEngine } from './fusion-unlock';

export interface DrawCandidatesOptions {
  wave: number;
  weaponsOnGrid: WeaponInstance[];
  count?: number;                  // Default 3
  isFtue?: boolean;                // Forces T11 in Slot 0 for FTUE Step 3
  forcedQuality?: TacticQuality;   // Testing / debug override
  rng?: () => number;              // Deterministic PRNG injection
}

export class TacticsDeck {
  private cards: Map<string, { config: TacticCardConfig; currentPicks: number }>;

  constructor(customCatalog?: readonly TacticCardConfig[]) {
    this.cards = new Map();
    const catalog = customCatalog || TACTICS_CONFIG;
    for (const c of catalog) {
      this.cards.set(c.id, { config: { ...c }, currentPicks: 0 });
    }
  }

  public getAllCards(): TacticCardConfig[] {
    return Array.from(this.cards.values()).map(v => v.config);
  }

  public getCard(cardId: string): TacticCardConfig | undefined {
    return this.cards.get(cardId)?.config;
  }

  public getPicks(cardId: string): number {
    return this.cards.get(cardId)?.currentPicks ?? 0;
  }

  public canPick(cardId: string): boolean {
    const entry = this.cards.get(cardId);
    if (!entry) return false;
    return entry.currentPicks < entry.config.maxPicksPerRun;
  }

  public pick(cardId: string): boolean {
    const entry = this.cards.get(cardId);
    if (!entry || !this.canPick(cardId)) {
      return false;
    }
    entry.currentPicks += 1;
    return true;
  }

  public reset(): void {
    for (const entry of this.cards.values()) {
      entry.currentPicks = 0;
    }
  }

  /**
   * Returns all tactic cards that have been picked during the current run along with their count.
   */
  public getPickedCards(): Array<{ config: TacticCardConfig; count: number }> {
    const result: Array<{ config: TacticCardConfig; count: number }> = [];
    for (const entry of this.cards.values()) {
      if (entry.currentPicks > 0) {
        result.push({ config: entry.config, count: entry.currentPicks });
      }
    }
    return result;
  }

  /**
   * Draws distinct candidate tactic cards taking wave quality guarantees,
   * smart faction weights, and fusion unlock thresholds into account.
   */
  public drawCandidates(options: DrawCandidatesOptions): TacticCardConfig[] {
    const {
      wave,
      weaponsOnGrid,
      count = 3,
      isFtue = false,
      forcedQuality,
      rng = Math.random
    } = options;

    const board = SmartWeightEngine.analyzeBoard(weaponsOnGrid);

    // 1. Filter available candidates (not pick-exhausted and fusion unlocked)
    const availableEntries = Array.from(this.cards.values()).filter(entry => {
      if (entry.currentPicks >= entry.config.maxPicksPerRun) {
        return false;
      }
      if (entry.config.category === 'fusion') {
        return FusionUnlockEngine.isFusionUnlocked(entry.config.id, weaponsOnGrid);
      }
      return true;
    });

    if (availableEntries.length <= count) {
      return availableEntries.map(e => e.config);
    }

    const selectedCards: TacticCardConfig[] = [];
    const chosenIds = new Set<string>();

    // Helper: sample single card from a candidate pool with smart weights
    const sampleOne = (pool: typeof availableEntries): TacticCardConfig | null => {
      const candidates = pool.filter(e => !chosenIds.has(e.config.id));
      if (candidates.length === 0) return null;

      const weightedList = candidates.map(e => {
        const isFusion = e.config.category === 'fusion';
        const weight = SmartWeightEngine.calculateWeight(e.config, board, isFusion);
        return { entry: e, weight: Math.max(0.001, weight) };
      });

      const totalWeight = weightedList.reduce((sum, item) => sum + item.weight, 0);
      let r = rng() * totalWeight;

      for (const item of weightedList) {
        if (r <= item.weight) {
          chosenIds.add(item.entry.config.id);
          return item.entry.config;
        }
        r -= item.weight;
      }

      const fallback = weightedList[weightedList.length - 1].entry.config;
      chosenIds.add(fallback.id);
      return fallback;
    };

    // 2. Guarantee Rules Handling
    if (isFtue && wave === 1) {
      // FTUE Step 3 guarantees T11 (三段击阵法) in candidate slot
      const t11 = availableEntries.find(e => e.config.id === 'T11');
      if (t11 && !chosenIds.has(t11.config.id)) {
        selectedCards.push(t11.config);
        chosenIds.add(t11.config.id);
      }
    }

    if (forcedQuality) {
      // Manual debug/test override
      const qualityPool = availableEntries.filter(e => e.config.quality === forcedQuality);
      while (selectedCards.length < count && qualityPool.some(e => !chosenIds.has(e.config.id))) {
        const card = sampleOne(qualityPool);
        if (card) selectedCards.push(card);
        else break;
      }
    } else if (wave === 1) {
      // Wave 1 Guarantee: Fixed 3 Purple cards
      const purplePool = availableEntries.filter(e => e.config.quality === 'purple');
      while (selectedCards.length < count && purplePool.some(e => !chosenIds.has(e.config.id))) {
        const card = sampleOne(purplePool);
        if (card) selectedCards.push(card);
        else break;
      }
    } else if (wave === 5) {
      // Wave 5 Guarantee: At least 1 Gold card
      const goldPool = availableEntries.filter(e => e.config.quality === 'gold');
      if (goldPool.some(e => !chosenIds.has(e.config.id))) {
        const card = sampleOne(goldPool);
        if (card) selectedCards.push(card);
      }
    } else if (wave === 10) {
      // Wave 10 Guarantee: At least 2 Gold or Red-Gold cards
      const highTierPool = availableEntries.filter(
        e => e.config.quality === 'gold' || e.config.quality === 'red_gold'
      );
      while (selectedCards.length < 2 && highTierPool.some(e => !chosenIds.has(e.config.id))) {
        const card = sampleOne(highTierPool);
        if (card) selectedCards.push(card);
        else break;
      }
    }

    // 3. Fill remaining slots with smart weighted sampling across all remaining available cards
    while (selectedCards.length < count) {
      const card = sampleOne(availableEntries);
      if (card) {
        selectedCards.push(card);
      } else {
        break; // Pool exhausted
      }
    }

    return selectedCards;
  }
}
