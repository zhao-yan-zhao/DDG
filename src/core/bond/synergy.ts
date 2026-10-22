/**
 * 《孤城神机营》- Faction Synergy Resonance Engine
 * Evaluates 2-piece and 4-piece activation tiers for all 4 factions:
 * Fire (神机), Mohist (墨家), Fortress (城防), Qimen (奇门).
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { Faction, FactionResonance, FactionSynergyBuffs, WeaponInstance } from '../types';

export const ALL_FACTIONS: Faction[] = ['fire', 'mohist', 'fortress', 'qimen'];

/**
 * Counts weapons of each faction and determines 0/2/4 activation tiers.
 */
export function evaluateResonances(weapons: WeaponInstance[]): FactionResonance[] {
  const counts: Record<Faction, number> = {
    fire: 0,
    mohist: 0,
    fortress: 0,
    qimen: 0
  };

  for (const w of weapons) {
    if (w.faction && counts[w.faction] !== undefined) {
      counts[w.faction]++;
    }
  }

  return ALL_FACTIONS.map(faction => {
    const count = counts[faction];
    const tier = count >= 4 ? 4 : count >= 2 ? 2 : 0;
    return { faction, count, tier };
  });
}

/**
 * Calculates concrete mathematical buffs provided by active faction resonances.
 */
export function calculateSynergyBuffs(
  weapons: WeaponInstance[],
  resonances?: FactionResonance[]
): FactionSynergyBuffs {
  const activeResonances = resonances || evaluateResonances(weapons);
  const resonanceMap = new Map<Faction, FactionResonance>();
  for (const r of activeResonances) {
    resonanceMap.set(r.faction, r);
  }

  const fireRes = resonanceMap.get('fire');
  const mohistRes = resonanceMap.get('mohist');
  const fortressRes = resonanceMap.get('fortress');
  const qimenRes = resonanceMap.get('qimen');

  const fireTier = fireRes ? fireRes.tier : 0;
  const mohistTier = mohistRes ? mohistRes.tier : 0;
  const fortressTier = fortressRes ? fortressRes.tier : 0;
  const qimenTier = qimenRes ? qimenRes.tier : 0;
  const qimenCount = qimenRes ? qimenRes.count : 0;

  return {
    fire: {
      reloadSpeedBonus: fireTier >= 2 ? 0.20 : 0,
      maxBurnStacks: fireTier >= 2 ? 8 : 4,
      burstChance: fireTier >= 4 ? 0.20 : 0,
      explosionDmgMultiplier: fireTier >= 4 ? 2.0 : 1.0
    },
    mohist: {
      critRateBonus: mohistTier >= 2 ? 0.20 : 0,
      pierceBonus: mohistTier >= 2 ? 1 : 0,
      armorSunderRate: mohistTier >= 4 ? 0.05 : 0,
      multiGridBonus: mohistTier >= 4 ? 0.40 : 0
    },
    fortress: {
      wallHpBonus: fortressTier >= 2 ? 400 : 0,
      wallReflectBonus: fortressTier >= 2 ? 0.50 : 0,
      wallRepairRate: fortressTier >= 4 ? 15 : 0,
      caltropsThreshold: fortressTier >= 4 ? 200 : 0
    },
    qimen: {
      dmgBonusPerQimen: qimenTier >= 2 ? 0.10 : 0,
      totalDmgBonus: qimenTier >= 2 ? qimenCount * 0.10 : 0,
      auraGlobal5x5: qimenTier >= 4
    }
  };
}

/**
 * Synergy Evaluator class providing static methods.
 */
export class FactionSynergyEvaluator {
  public static evaluateResonances = evaluateResonances;
  public static calculateSynergyBuffs = calculateSynergyBuffs;
}

export const SynergyEvaluator = FactionSynergyEvaluator;
export type SynergyEvaluator = FactionSynergyEvaluator;
