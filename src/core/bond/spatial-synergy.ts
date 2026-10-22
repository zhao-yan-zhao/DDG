/**
 * 《孤城神机营》- Spatial Synergy Engine (阵略篇·空间相邻羁绊推演引擎)
 * Strictly conforms to GDD V3.0 §2.4 & §7.1 and Compendium Matrix (COMPENDIUM_SYNERGIES).
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 *
 * Implements the 6 Classic Spatial Formations:
 * 1. 【齐射列阵】 (volley_fire): Horizontal Fire Lance chain -> ASPD +18% (+30% if >=3 in row)
 * 2. 【雁行弩阵】 (wild_goose_crossbow): Diagonal Repeating Crossbow pair -> Crit Rate +15%
 * 3. 【九宫火药库 / 火鸦助势】 (nine_palace_powder): Powder Bureau 3x3 Moore Moore -> Fire Atk +20%, 35% Burn, Rocket +4 arrows
 * 4. 【引火烧身】 (oil_combustion): Row 0 Oil Cabinet + Row 1 Heavy Cannon -> Heavy Cannon Crit Rate +30%
 * 5. 【闻鼓进军】 (march_drum): War Drum same row -> All row weapons ASPD +35%, Spear Camp in col gains wall lifesteal
 * 6. 【极寒星芒】 (polar_starlight): Stargazer orthogonal cross 4 cells -> Crit Rate +18%, bullets apply chill/freeze
 */

import { WeaponInstance, GridPosition } from '../types';
import { getOccupiedCells } from './adjacency';

export interface SpatialSynergyBonus {
  aspdBonus: number;
  additiveDmgBonus: number;
  critRateBonus: number;
  critDmgBonus: number;
  applyBurnChance?: number;
  applyFreeze?: boolean;
  wallLifestealOnHit?: number;
  extraProjectiles?: number;
  activeSynergies: string[];
}

export interface SpatialSynergyLink {
  synergyId: string;
  synergyName: string;
  fromWeaponId: string;
  toWeaponId: string;
  fromPos: GridPosition;
  toPos: GridPosition;
}

export class SpatialSynergyEngine {
  /**
   * Calculates all active spatial synergy bonuses for every weapon on the grid.
   */
  public static evaluateAllWeapons(weapons: WeaponInstance[]): Map<string, SpatialSynergyBonus> {
    const resultMap = new Map<string, SpatialSynergyBonus>();

    for (const w of weapons) {
      resultMap.set(w.id, {
        aspdBonus: 0,
        additiveDmgBonus: 0,
        critRateBonus: 0,
        critDmgBonus: 0,
        applyBurnChance: 0,
        applyFreeze: false,
        wallLifestealOnHit: 0,
        extraProjectiles: 0,
        activeSynergies: []
      });
    }

    // 1. 【齐射列阵】 (volley_fire)
    this.evaluateVolleyFire(weapons, resultMap);

    // 2. 【雁行弩阵】 (wild_goose_crossbow)
    this.evaluateWildGooseCrossbow(weapons, resultMap);

    // 3. 【九宫火药库 / 火鸦助势】 (nine_palace_powder)
    this.evaluateNinePalacePowder(weapons, resultMap);

    // 4. 【引火烧身】 (oil_combustion)
    this.evaluateOilCombustion(weapons, resultMap);

    // 5. 【闻鼓进军】 (march_drum)
    this.evaluateMarchDrum(weapons, resultMap);

    // 6. 【极寒星芒】 (polar_starlight)
    this.evaluatePolarStarlight(weapons, resultMap);

    return resultMap;
  }

  /**
   * Generates visual links for UI/Sandbox rendering (golden bond beams).
   */
  public static getActiveLinks(weapons: WeaponInstance[]): SpatialSynergyLink[] {
    const links: SpatialSynergyLink[] = [];
    const weaponMap = new Map<string, WeaponInstance>(weapons.map(w => [w.id, w]));

    // 1. Volley Fire links
    const fireLances = weapons.filter(w => w.configId.includes('fire_lance'));
    for (let i = 0; i < fireLances.length; i++) {
      for (let j = i + 1; j < fireLances.length; j++) {
        const a = fireLances[i];
        const b = fireLances[j];
        if (a.anchor.row === b.anchor.row && Math.abs(a.anchor.col - b.anchor.col) === 1) {
          links.push({
            synergyId: 'volley_fire',
            synergyName: '齐射列阵',
            fromWeaponId: a.id,
            toWeaponId: b.id,
            fromPos: { ...a.anchor },
            toPos: { ...b.anchor }
          });
        }
      }
    }

    // 2. Wild Goose Crossbow links
    const crossbows = weapons.filter(w => w.configId.includes('repeating_crossbow'));
    for (let i = 0; i < crossbows.length; i++) {
      for (let j = i + 1; j < crossbows.length; j++) {
        const a = crossbows[i];
        const b = crossbows[j];
        if (Math.abs(a.anchor.row - b.anchor.row) === 1 && Math.abs(a.anchor.col - b.anchor.col) === 1) {
          links.push({
            synergyId: 'wild_goose_crossbow',
            synergyName: '雁行弩阵',
            fromWeaponId: a.id,
            toWeaponId: b.id,
            fromPos: { ...a.anchor },
            toPos: { ...b.anchor }
          });
        }
      }
    }

    // 3. Nine Palace Powder Bureau links
    const powderBureaus = weapons.filter(w => w.configId.includes('powder_bureau'));
    for (const pb of powderBureaus) {
      for (const w of weapons) {
        if (w.id === pb.id) continue;
        if (w.faction === 'fire') {
          const chebyshev = Math.max(Math.abs(w.anchor.row - pb.anchor.row), Math.abs(w.anchor.col - pb.anchor.col));
          if (chebyshev <= 1) {
            links.push({
              synergyId: 'nine_palace_powder',
              synergyName: '九宫火药库',
              fromWeaponId: pb.id,
              toWeaponId: w.id,
              fromPos: { ...pb.anchor },
              toPos: { ...w.anchor }
            });
          }
        }
      }
    }

    // 4. Oil Combustion links
    const oilCabinets = weapons.filter(w => w.configId.includes('oil_cabinet') && w.anchor.row === 0);
    for (const oil of oilCabinets) {
      for (const w of weapons) {
        if (w.anchor.row === 1 && w.anchor.col === oil.anchor.col) {
          if (w.configId.includes('thunder_thrower') || w.configId.includes('cannon') || w.configId.includes('red_cannon')) {
            links.push({
              synergyId: 'oil_combustion',
              synergyName: '引火烧身',
              fromWeaponId: oil.id,
              toWeaponId: w.id,
              fromPos: { ...oil.anchor },
              toPos: { ...w.anchor }
            });
          }
        }
      }
    }

    // 5. War Drum links
    const drums = weapons.filter(w => w.configId.includes('war_drum'));
    for (const drum of drums) {
      for (const w of weapons) {
        if (w.id === drum.id) continue;
        if (w.anchor.row === drum.anchor.row) {
          links.push({
            synergyId: 'march_drum',
            synergyName: '闻鼓进军',
            fromWeaponId: drum.id,
            toWeaponId: w.id,
            fromPos: { ...drum.anchor },
            toPos: { ...w.anchor }
          });
        }
      }
    }

    // 6. Polar Starlight links
    const stargazers = weapons.filter(w => w.configId.includes('stargazer'));
    for (const sg of stargazers) {
      for (const w of weapons) {
        if (w.id === sg.id) continue;
        const manhattan = Math.abs(w.anchor.row - sg.anchor.row) + Math.abs(w.anchor.col - sg.anchor.col);
        if (manhattan === 1) {
          links.push({
            synergyId: 'polar_starlight',
            synergyName: '极寒星芒',
            fromWeaponId: sg.id,
            toWeaponId: w.id,
            fromPos: { ...sg.anchor },
            toPos: { ...w.anchor }
          });
        }
      }
    }

    return links;
  }

  // =========================================================================
  // Private Sub-evaluators
  // =========================================================================

  private static evaluateVolleyFire(weapons: WeaponInstance[], map: Map<string, SpatialSynergyBonus>): void {
    const fireLances = weapons.filter(w => w.configId.includes('fire_lance'));
    if (fireLances.length < 2) return;

    // Group by row
    const rowGroups = new Map<number, WeaponInstance[]>();
    for (const lance of fireLances) {
      const row = lance.anchor.row;
      if (!rowGroups.has(row)) {
        rowGroups.set(row, []);
      }
      rowGroups.get(row)!.push(lance);
    }

    for (const [_, lancesInRow] of rowGroups) {
      if (lancesInRow.length < 2) continue;
      lancesInRow.sort((a, b) => a.anchor.col - b.anchor.col);

      // Check contiguous horizontal chains
      for (let i = 0; i < lancesInRow.length; i++) {
        const cur = lancesInRow[i];
        let hasNeighbor = false;

        if (i > 0 && lancesInRow[i - 1].anchor.col === cur.anchor.col - 1) {
          hasNeighbor = true;
        }
        if (i < lancesInRow.length - 1 && lancesInRow[i + 1].anchor.col === cur.anchor.col + 1) {
          hasNeighbor = true;
        }

        if (hasNeighbor) {
          const bonus = map.get(cur.id);
          if (bonus) {
            // >= 3 contiguous in row grants +30%, otherwise +18%
            const aspdGain = lancesInRow.length >= 3 ? 0.30 : 0.18;
            bonus.aspdBonus += aspdGain;
            if (!bonus.activeSynergies.includes('volley_fire')) {
              bonus.activeSynergies.push('volley_fire');
            }
          }
        }
      }
    }
  }

  private static evaluateWildGooseCrossbow(weapons: WeaponInstance[], map: Map<string, SpatialSynergyBonus>): void {
    const crossbows = weapons.filter(w => w.configId.includes('repeating_crossbow'));
    if (crossbows.length < 2) return;

    for (let i = 0; i < crossbows.length; i++) {
      for (let j = i + 1; j < crossbows.length; j++) {
        const a = crossbows[i];
        const b = crossbows[j];
        const dr = Math.abs(a.anchor.row - b.anchor.row);
        const dc = Math.abs(a.anchor.col - b.anchor.col);

        if (dr === 1 && dc === 1) {
          // Both gain +15% Crit Rate
          const bonusA = map.get(a.id);
          const bonusB = map.get(b.id);
          if (bonusA) {
            bonusA.critRateBonus += 0.15;
            if (!bonusA.activeSynergies.includes('wild_goose_crossbow')) {
              bonusA.activeSynergies.push('wild_goose_crossbow');
            }
          }
          if (bonusB) {
            bonusB.critRateBonus += 0.15;
            if (!bonusB.activeSynergies.includes('wild_goose_crossbow')) {
              bonusB.activeSynergies.push('wild_goose_crossbow');
            }
          }
        }
      }
    }
  }

  private static evaluateNinePalacePowder(weapons: WeaponInstance[], map: Map<string, SpatialSynergyBonus>): void {
    const powderBureaus = weapons.filter(w => w.configId.includes('powder_bureau'));
    if (powderBureaus.length === 0) return;

    for (const pb of powderBureaus) {
      for (const w of weapons) {
        if (w.id === pb.id) continue;
        if (w.faction !== 'fire') continue;

        const dr = Math.abs(w.anchor.row - pb.anchor.row);
        const dc = Math.abs(w.anchor.col - pb.anchor.col);

        if (dr <= 1 && dc <= 1) {
          const bonus = map.get(w.id);
          if (bonus) {
            bonus.additiveDmgBonus += 0.20;
            bonus.applyBurnChance = Math.max(bonus.applyBurnChance ?? 0, 0.35);

            // Special: Rocket Box in vertical direct alignment (up or down)
            if (w.configId.includes('rocket_box') && dc === 0 && dr === 1) {
              bonus.extraProjectiles = (bonus.extraProjectiles || 0) + 4;
              bonus.additiveDmgBonus += 0.15;
            }

            if (!bonus.activeSynergies.includes('nine_palace_powder')) {
              bonus.activeSynergies.push('nine_palace_powder');
            }
          }
        }
      }
    }
  }

  private static evaluateOilCombustion(weapons: WeaponInstance[], map: Map<string, SpatialSynergyBonus>): void {
    const oilCabinets = weapons.filter(w => w.configId.includes('oil_cabinet') && w.anchor.row === 0);
    if (oilCabinets.length === 0) return;

    for (const oil of oilCabinets) {
      for (const w of weapons) {
        // Must be in Row 1 directly behind Oil Cabinet (same col)
        if (w.anchor.row === 1 && w.anchor.col === oil.anchor.col) {
          if (
            w.configId.includes('thunder_thrower') ||
            w.configId.includes('cannon') ||
            w.configId.includes('red_cannon')
          ) {
            const bonus = map.get(w.id);
            if (bonus) {
              bonus.critRateBonus += 0.30;
              if (!bonus.activeSynergies.includes('oil_combustion')) {
                bonus.activeSynergies.push('oil_combustion');
              }
            }
          }
        }
      }
    }
  }

  private static evaluateMarchDrum(weapons: WeaponInstance[], map: Map<string, SpatialSynergyBonus>): void {
    const drums = weapons.filter(w => w.configId.includes('war_drum'));
    if (drums.length === 0) return;

    for (const drum of drums) {
      for (const w of weapons) {
        if (w.id === drum.id) continue;
        // Same row
        if (w.anchor.row === drum.anchor.row) {
          const bonus = map.get(w.id);
          if (bonus) {
            bonus.aspdBonus += 0.35;
            if (!bonus.activeSynergies.includes('march_drum')) {
              bonus.activeSynergies.push('march_drum');
            }
          }
        }
        // Same col and is Spear Camp
        if (w.configId.includes('spear_camp') && w.anchor.col === drum.anchor.col) {
          const bonus = map.get(w.id);
          if (bonus) {
            bonus.wallLifestealOnHit = (bonus.wallLifestealOnHit || 0) + 15;
            if (!bonus.activeSynergies.includes('march_drum')) {
              bonus.activeSynergies.push('march_drum');
            }
          }
        }
      }
    }
  }

  private static evaluatePolarStarlight(weapons: WeaponInstance[], map: Map<string, SpatialSynergyBonus>): void {
    const stargazers = weapons.filter(w => w.configId.includes('stargazer'));
    if (stargazers.length === 0) return;

    for (const sg of stargazers) {
      for (const w of weapons) {
        if (w.id === sg.id) continue;
        const manhattan = Math.abs(w.anchor.row - sg.anchor.row) + Math.abs(w.anchor.col - sg.anchor.col);
        if (manhattan === 1) {
          const bonus = map.get(w.id);
          if (bonus) {
            bonus.critRateBonus += 0.18;
            bonus.applyFreeze = true;
            if (!bonus.activeSynergies.includes('polar_starlight')) {
              bonus.activeSynergies.push('polar_starlight');
            }
          }
        }
      }
    }
  }
}
