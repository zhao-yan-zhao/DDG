import { describe, it, expect } from 'vitest';
import {
  createWeaponInstance,
  WeaponRuntimeState
} from '../src/core/weapon/weapon-instance';
import {
  getOccupiedCells,
  evaluateContact,
  evaluateAllBonds,
  findOrthogonalNeighbors,
  findChebyshevNeighbors
} from '../src/core/bond/adjacency';
import {
  evaluateResonances,
  calculateSynergyBuffs,
  ALL_FACTIONS
} from '../src/core/bond/synergy';
import { Faction, GridPosition, WeaponInstance } from '../src/core/types';

describe('Challenger 1 Adversarial Suite: Adjacency Deduplication & Faction Synergies', () => {
  // =========================================================================
  // MISSION 1: MULTI-GRID WEAPON ADJACENCY DEDUPLICATION
  // =========================================================================
  describe('Mission 1: Multi-Grid Weapon Adjacency Deduplication', () => {
    it('verifies 2x2 Catapult at (1,1)-(2,2) and 1x2 Cannon at (1,3)-(2,3) sharing 2 adjacent edges return EXACTLY ONE BondContact', () => {
      // Catapult occupies (1,1), (1,2), (2,1), (2,2)
      // Red Cannon occupies (1,3), (2,3)
      // Shared boundary cells: (1,2)-(1,3) and (2,2)-(2,3)
      const catapult = createWeaponInstance('catapult', 1, { row: 1, col: 1 }, 'catapult_2x2');
      const cannon = createWeaponInstance('red_cannon', 1, { row: 1, col: 3 }, 'cannon_1x2');

      const cellsCatapult = getOccupiedCells(catapult);
      const cellsCannon = getOccupiedCells(cannon);
      expect(cellsCatapult).toHaveLength(4);
      expect(cellsCannon).toHaveLength(2);

      // Verify contact flags
      const contact = evaluateContact(catapult, cannon);
      expect(contact.isOrthogonal).toBe(true);
      expect(contact.isChebyshev).toBe(true);
      expect(contact.weaponAId).toBe('catapult_2x2');
      expect(contact.weaponBId).toBe('cannon_1x2');

      // Crucial: evaluateAllBonds must return EXACTLY ONE record
      const bonds = evaluateAllBonds([catapult, cannon]);
      expect(bonds).toHaveLength(1);
      expect(bonds[0]).toEqual({
        weaponAId: 'catapult_2x2',
        weaponBId: 'cannon_1x2',
        isOrthogonal: true,
        isChebyshev: true
      });
    });

    it('verifies 2x2 Catapult at (1,1)-(2,2) and 2x1 Bed Crossbow at (3,1)-(3,2) sharing 2 adjacent horizontal cells return EXACTLY ONE BondContact', () => {
      // Catapult occupies (1,1), (1,2), (2,1), (2,2)
      // Bed Crossbow occupies (3,1), (3,2)
      // Shared boundary cells: (2,1)-(3,1) and (2,2)-(3,2)
      const catapult = createWeaponInstance('catapult', 1, { row: 1, col: 1 }, 'catapult_2x2');
      const crossbow = createWeaponInstance('bed_crossbow', 1, { row: 3, col: 1 }, 'crossbow_2x1');

      const contact = evaluateContact(catapult, crossbow);
      expect(contact.isOrthogonal).toBe(true);
      expect(contact.isChebyshev).toBe(true);

      const bonds = evaluateAllBonds([catapult, crossbow]);
      expect(bonds).toHaveLength(1);
      expect(bonds[0].weaponAId).toBe('catapult_2x2');
      expect(bonds[0].weaponBId).toBe('crossbow_2x1');
      expect(bonds[0].isOrthogonal).toBe(true);
    });

    it('evaluates a 3-weapon multi-grid cluster with mixed orthogonal and diagonal relationships', () => {
      // 1. Catapult 2x2 at (1,1): (1,1), (1,2), (2,1), (2,2)
      // 2. Cannon 1x2 at (1,3): (1,3), (2,3) -> shares 2 orthogonal edges with Catapult
      // 3. Bed Crossbow 2x1 at (3,1): (3,1), (3,2) -> shares 2 orthogonal edges with Catapult
      // Relationship between Cannon and Bed Crossbow:
      // Cannon has (2,3); Crossbow has (3,2). Distance = |2-3| + |3-2| = 2 (diagonal). Chebyshev = 1.
      const catapult = createWeaponInstance('catapult', 1, { row: 1, col: 1 }, 'catapult');
      const cannon = createWeaponInstance('red_cannon', 1, { row: 1, col: 3 }, 'cannon');
      const crossbow = createWeaponInstance('bed_crossbow', 1, { row: 3, col: 1 }, 'crossbow');

      const bonds = evaluateAllBonds([catapult, cannon, crossbow]);
      // Total pairs among 3 items is 3: (catapult, cannon), (catapult, crossbow), (cannon, crossbow)
      expect(bonds).toHaveLength(3);

      const catapultCannon = bonds.find(b =>
        (b.weaponAId === 'catapult' && b.weaponBId === 'cannon') ||
        (b.weaponAId === 'cannon' && b.weaponBId === 'catapult')
      );
      expect(catapultCannon).toBeDefined();
      expect(catapultCannon!.isOrthogonal).toBe(true);
      expect(catapultCannon!.isChebyshev).toBe(true);

      const catapultCrossbow = bonds.find(b =>
        (b.weaponAId === 'catapult' && b.weaponBId === 'crossbow') ||
        (b.weaponAId === 'crossbow' && b.weaponBId === 'catapult')
      );
      expect(catapultCrossbow).toBeDefined();
      expect(catapultCrossbow!.isOrthogonal).toBe(true);
      expect(catapultCrossbow!.isChebyshev).toBe(true);

      const cannonCrossbow = bonds.find(b =>
        (b.weaponAId === 'cannon' && b.weaponBId === 'crossbow') ||
        (b.weaponAId === 'crossbow' && b.weaponBId === 'cannon')
      );
      expect(cannonCrossbow).toBeDefined();
      expect(cannonCrossbow!.isOrthogonal).toBe(false); // Diagonal only!
      expect(cannonCrossbow!.isChebyshev).toBe(true);
    });

    it('deduplicates two 2x2 weapons touching at corner diagonally (single-vertex contact)', () => {
      // Catapult A at (0,0): occupies (0,0), (0,1), (1,0), (1,1)
      // Catapult B at (2,2): occupies (2,2), (2,3), (3,2), (3,3)
      // Corner contact: (1,1) and (2,2).
      const cataA = createWeaponInstance('catapult', 1, { row: 0, col: 0 }, 'cata_A');
      const cataB = createWeaponInstance('catapult', 1, { row: 2, col: 2 }, 'cata_B');

      const contact = evaluateContact(cataA, cataB);
      expect(contact.isOrthogonal).toBe(false);
      expect(contact.isChebyshev).toBe(true);

      const bonds = evaluateAllBonds([cataA, cataB]);
      expect(bonds).toHaveLength(1);
      expect(bonds[0].isOrthogonal).toBe(false);
      expect(bonds[0].isChebyshev).toBe(true);
    });

    it('ensures findOrthogonalNeighbors and findChebyshevNeighbors return unique weapon instances without duplicates', () => {
      const catapult = createWeaponInstance('catapult', 1, { row: 1, col: 1 }, 'catapult');
      const cannon = createWeaponInstance('red_cannon', 1, { row: 1, col: 3 }, 'cannon');
      const crossbow = createWeaponInstance('bed_crossbow', 1, { row: 3, col: 1 }, 'crossbow');

      const orthoNeighbors = findOrthogonalNeighbors(catapult, [catapult, cannon, crossbow]);
      expect(orthoNeighbors).toHaveLength(2);
      const orthoIds = orthoNeighbors.map(w => w.id);
      expect(new Set(orthoIds).size).toBe(2);
      expect(orthoIds).toContain('cannon');
      expect(orthoIds).toContain('crossbow');

      const chebyNeighbors = findChebyshevNeighbors(cannon, [catapult, cannon, crossbow]);
      expect(chebyNeighbors).toHaveLength(2);
      const chebyIds = chebyNeighbors.map(w => w.id);
      expect(new Set(chebyIds).size).toBe(2);
      expect(chebyIds).toContain('catapult');
      expect(chebyIds).toContain('crossbow');
    });
  });

  // =========================================================================
  // MISSION 2: NON-ADJACENT UNITS (DIAGONAL > 1, MANHATTAN > 1)
  // =========================================================================
  describe('Mission 2: Non-Adjacent Units (No False Positive Bonds)', () => {
    it('verifies 1x1 units separated by 1 empty cell produce no bond', () => {
      // (0,0) and (0,2) separated by (0,1)
      const u1 = createWeaponInstance('fire_lance', 1, { row: 0, col: 0 }, 'u1');
      const u2 = createWeaponInstance('fire_lance', 1, { row: 0, col: 2 }, 'u2');

      const contact = evaluateContact(u1, u2);
      expect(contact.isOrthogonal).toBe(false);
      expect(contact.isChebyshev).toBe(false);
      expect(evaluateAllBonds([u1, u2])).toHaveLength(0);
    });

    it('verifies 1x1 units separated diagonally by distance 2 produce no bond', () => {
      // (0,0) and (2,2): Manhattan = 4, Chebyshev = 2
      const u1 = createWeaponInstance('fire_lance', 1, { row: 0, col: 0 }, 'u1');
      const u2 = createWeaponInstance('fire_lance', 1, { row: 2, col: 2 }, 'u2');

      const contact = evaluateContact(u1, u2);
      expect(contact.isOrthogonal).toBe(false);
      expect(contact.isChebyshev).toBe(false);
      expect(evaluateAllBonds([u1, u2])).toHaveLength(0);
    });

    it("verifies knight's move separation produces no bond", () => {
      // (0,0) and (1,2): Manhattan = 3, Chebyshev = 2
      const u1 = createWeaponInstance('fire_lance', 1, { row: 0, col: 0 }, 'u1');
      const u2 = createWeaponInstance('fire_lance', 1, { row: 1, col: 2 }, 'u2');

      const contact = evaluateContact(u1, u2);
      expect(contact.isOrthogonal).toBe(false);
      expect(contact.isChebyshev).toBe(false);
      expect(evaluateAllBonds([u1, u2])).toHaveLength(0);
    });

    it('verifies 2x2 weapons separated by 1 empty column produce no bond', () => {
      // Cata A: (0,0)-(1,1) [cols 0..1]
      // Cata B: (0,3)-(1,4) [cols 3..4]
      // Column 2 is empty. Closest distance between cells is col 1 to col 3 (delta = 2).
      const cataA = createWeaponInstance('catapult', 1, { row: 0, col: 0 }, 'cata_A');
      const cataB = createWeaponInstance('catapult', 1, { row: 0, col: 3 }, 'cata_B');

      const contact = evaluateContact(cataA, cataB);
      expect(contact.isOrthogonal).toBe(false);
      expect(contact.isChebyshev).toBe(false);
      expect(evaluateAllBonds([cataA, cataB])).toHaveLength(0);
    });

    it('verifies 4 extreme corners of 5x5 board yield zero bonds among all 6 pairs', () => {
      const cornerNW = createWeaponInstance('fire_lance', 1, { row: 0, col: 0 }, 'nw');
      const cornerNE = createWeaponInstance('fire_lance', 1, { row: 0, col: 4 }, 'ne');
      const cornerSW = createWeaponInstance('fire_lance', 1, { row: 4, col: 0 }, 'sw');
      const cornerSE = createWeaponInstance('fire_lance', 1, { row: 4, col: 4 }, 'se');

      const bonds = evaluateAllBonds([cornerNW, cornerNE, cornerSW, cornerSE]);
      expect(bonds).toHaveLength(0);
    });

    it('exhaustively tests center unit (2,2) against all 24 other cells: exactly 8 neighbors, 16 non-adjacent', () => {
      const center = createWeaponInstance('fire_lance', 1, { row: 2, col: 2 }, 'center');
      let orthogonalCount = 0;
      let chebyshevCount = 0;
      let nonAdjacentCount = 0;

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) continue;
          const other = createWeaponInstance('fire_lance', 1, { row: r, col: c }, `other_${r}_${c}`);
          const contact = evaluateContact(center, other);

          const manhattan = Math.abs(r - 2) + Math.abs(c - 2);
          const chebyshev = Math.max(Math.abs(r - 2), Math.abs(c - 2));

          if (manhattan === 1) {
            expect(contact.isOrthogonal).toBe(true);
            expect(contact.isChebyshev).toBe(true);
            orthogonalCount++;
          } else if (chebyshev === 1) {
            expect(contact.isOrthogonal).toBe(false);
            expect(contact.isChebyshev).toBe(true);
            chebyshevCount++;
          } else {
            expect(contact.isOrthogonal).toBe(false);
            expect(contact.isChebyshev).toBe(false);
            nonAdjacentCount++;
            expect(evaluateAllBonds([center, other])).toHaveLength(0);
          }
        }
      }

      expect(orthogonalCount).toBe(4); // 4 orthogonal cross
      expect(chebyshevCount).toBe(4);  // 4 diagonals
      expect(nonAdjacentCount).toBe(16); // 24 - 8 = 16 non-adjacent
    });
  });

  // =========================================================================
  // MISSION 3: FULL 5x5 BOARD FILLED WITH MULTI-GRID WEAPONS (ZERO DUPLICATES)
  // =========================================================================
  describe('Mission 3: Full 5x5 Board Filled with Multi-Grid Weapons', () => {
    it('tiles full 5x5 board (25 cells) with 9 multi-grid/single-grid weapons and verifies zero duplicate pairs (A,B) or (B,A)', () => {
      // 4x 2x2 Catapults:
      // Catapult 0: (0,0) -> (0,0), (0,1), (1,0), (1,1) [4 cells]
      // Catapult 1: (0,2) -> (0,2), (0,3), (1,2), (1,3) [4 cells]
      // Catapult 2: (2,0) -> (2,0), (2,1), (3,0), (3,1) [4 cells]
      // Catapult 3: (2,2) -> (2,2), (2,3), (3,2), (3,3) [4 cells]
      // 2x 1x2 Red Cannons:
      // Cannon 0: (0,4) -> (0,4), (1,4) [2 cells]
      // Cannon 1: (2,4) -> (2,4), (3,4) [2 cells]
      // 2x 2x1 Bed Crossbows:
      // Crossbow 0: (4,0) -> (4,0), (4,1) [2 cells]
      // Crossbow 1: (4,2) -> (4,2), (4,3) [2 cells]
      // 1x 1x1 Fire Lance:
      // Lance: (4,4) -> (4,4) [1 cell]
      // Total = 4*4 + 2*2 + 2*2 + 1 = 25 cells! 100% full board.
      const weapons = [
        createWeaponInstance('catapult', 1, { row: 0, col: 0 }, 'cata_0'),
        createWeaponInstance('catapult', 1, { row: 0, col: 2 }, 'cata_1'),
        createWeaponInstance('catapult', 1, { row: 2, col: 0 }, 'cata_2'),
        createWeaponInstance('catapult', 1, { row: 2, col: 2 }, 'cata_3'),
        createWeaponInstance('red_cannon', 1, { row: 0, col: 4 }, 'cannon_0'),
        createWeaponInstance('red_cannon', 1, { row: 2, col: 4 }, 'cannon_1'),
        createWeaponInstance('bed_crossbow', 1, { row: 4, col: 0 }, 'xbow_0'),
        createWeaponInstance('bed_crossbow', 1, { row: 4, col: 2 }, 'xbow_1'),
        createWeaponInstance('fire_lance', 1, { row: 4, col: 4 }, 'lance_0')
      ];

      // Verify complete 25-cell coverage with 0 overlapping cells
      const allOccupied = weapons.flatMap(w => getOccupiedCells(w));
      expect(allOccupied).toHaveLength(25);
      const cellSet = new Set(allOccupied.map(c => `${c.row},${c.col}`));
      expect(cellSet.size).toBe(25);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          expect(cellSet.has(`${r},${c}`)).toBe(true);
        }
      }

      // Execute evaluateAllBonds
      const contacts = evaluateAllBonds(weapons);
      expect(contacts.length).toBeGreaterThan(0);

      // RIGOROUS DEDUPLICATION INVARIANTS:
      // 1. Zero self-contacts
      for (const contact of contacts) {
        expect(contact.weaponAId).not.toBe(contact.weaponBId);
      }

      // 2. Zero duplicate pairs: neither (A, B) twice nor both (A, B) and (B, A)
      const seenUnorderedPairs = new Set<string>();
      const seenOrderedPairs = new Set<string>();

      for (const contact of contacts) {
        const orderedKey = `${contact.weaponAId} -> ${contact.weaponBId}`;
        const unorderedKey = [contact.weaponAId, contact.weaponBId].sort().join(' <-> ');

        // No ordered pair repeated
        expect(seenOrderedPairs.has(orderedKey)).toBe(false);
        seenOrderedPairs.add(orderedKey);

        // No unordered pair repeated (guarantees (B, A) never appears if (A, B) appeared)
        expect(seenUnorderedPairs.has(unorderedKey)).toBe(false);
        seenUnorderedPairs.add(unorderedKey);
      }

      // 3. Verify specific known adjacent contacts are present and deduplicated
      // cata_0 at (0,0) and cata_1 at (0,2) share 2 adjacent edges: (0,1)-(0,2) and (1,1)-(1,2)
      const cata0_1 = contacts.find(c =>
        (c.weaponAId === 'cata_0' && c.weaponBId === 'cata_1') ||
        (c.weaponAId === 'cata_1' && c.weaponBId === 'cata_0')
      );
      expect(cata0_1).toBeDefined();
      expect(cata0_1!.isOrthogonal).toBe(true);
      expect(cata0_1!.isChebyshev).toBe(true);

      // cata_0 at (0,0) and cata_3 at (2,2) share ONLY diagonal corner (1,1)-(2,2)
      const cata0_3 = contacts.find(c =>
        (c.weaponAId === 'cata_0' && c.weaponBId === 'cata_3') ||
        (c.weaponAId === 'cata_3' && c.weaponBId === 'cata_0')
      );
      expect(cata0_3).toBeDefined();
      expect(cata0_3!.isOrthogonal).toBe(false);
      expect(cata0_3!.isChebyshev).toBe(true);

      // cata_0 at (0,0) and lance_0 at (4,4) are far apart -> must NOT exist
      const cata0_lance = contacts.find(c =>
        (c.weaponAId === 'cata_0' && c.weaponBId === 'lance_0') ||
        (c.weaponAId === 'lance_0' && c.weaponBId === 'cata_0')
      );
      expect(cata0_lance).toBeUndefined();
    });

    it('tiles full 5x5 board with 13 multi-grid weapons (10x 2x1, 2x 1x2, 1x 1x1) and checks zero duplicates', () => {
      // 10 horizontal 2x1s:
      // Rows 0..3: cols 0..1 and cols 2..3 (8 units, 16 cells)
      // Row 4: cols 0..1 and cols 2..3 (2 units, 4 cells)
      // 2 vertical 1x2s:
      // Col 4: rows 0..1 and rows 2..3 (2 units, 4 cells)
      // 1 single 1x1:
      // (4, 4) (1 unit, 1 cell)
      // Total 13 units = 25 cells
      const weapons: WeaponInstance[] = [];
      let idx = 0;

      for (let r = 0; r < 5; r++) {
        weapons.push(createWeaponInstance('bed_crossbow', 1, { row: r, col: 0 }, `h_${idx++}`));
        weapons.push(createWeaponInstance('bed_crossbow', 1, { row: r, col: 2 }, `h_${idx++}`));
      }
      weapons.push(createWeaponInstance('red_cannon', 1, { row: 0, col: 4 }, 'v_0'));
      weapons.push(createWeaponInstance('red_cannon', 1, { row: 2, col: 4 }, 'v_1'));
      weapons.push(createWeaponInstance('fire_lance', 1, { row: 4, col: 4 }, 's_0'));

      expect(weapons).toHaveLength(13);
      const cells = weapons.flatMap(w => getOccupiedCells(w));
      expect(cells).toHaveLength(25);
      expect(new Set(cells.map(c => `${c.row},${c.col}`)).size).toBe(25);

      const contacts = evaluateAllBonds(weapons);
      const seen = new Set<string>();

      for (const c of contacts) {
        const pair = [c.weaponAId, c.weaponBId].sort().join('::');
        expect(seen.has(pair)).toBe(false);
        seen.add(pair);
      }
    });
  });

  // =========================================================================
  // MISSION 4: FACTION RESONANCE BOUNDARY COUNTS (0, 1, 2, 3, 4, 5+)
  // =========================================================================
  describe('Mission 4: Faction Resonance Boundary Counts & Buff Calculations', () => {
    it('evaluates exact boundary counts: 0 -> tier 0; 1 -> tier 0; 2 -> tier 2; 3 -> tier 2; 4 -> tier 4; 5+ -> tier 4 for all factions', () => {
      const factions: Faction[] = ['fire', 'mohist', 'fortress', 'qimen'];
      const archetypesByFaction: Record<Faction, string> = {
        fire: 'fire_lance',
        mohist: 'repeating_crossbow',
        fortress: 'barricade',
        qimen: 'powder_bureau'
      };

      for (const faction of factions) {
        const archetype = archetypesByFaction[faction];

        // 0 weapons
        const res0 = evaluateResonances([]);
        const r0 = res0.find(r => r.faction === faction)!;
        expect(r0.count).toBe(0);
        expect(r0.tier).toBe(0);

        // 1 weapon -> tier 0
        const w1 = [createWeaponInstance(archetype, 1, { row: 0, col: 0 }, `${faction}_1`)];
        const res1 = evaluateResonances(w1);
        const r1 = res1.find(r => r.faction === faction)!;
        expect(r1.count).toBe(1);
        expect(r1.tier).toBe(0);

        // 2 weapons -> tier 2
        const w2 = [
          ...w1,
          createWeaponInstance(archetype, 1, { row: 0, col: 1 }, `${faction}_2`)
        ];
        const res2 = evaluateResonances(w2);
        const r2 = res2.find(r => r.faction === faction)!;
        expect(r2.count).toBe(2);
        expect(r2.tier).toBe(2);

        // 3 weapons -> tier 2
        const w3 = [
          ...w2,
          createWeaponInstance(archetype, 1, { row: 0, col: 2 }, `${faction}_3`)
        ];
        const res3 = evaluateResonances(w3);
        const r3 = res3.find(r => r.faction === faction)!;
        expect(r3.count).toBe(3);
        expect(r3.tier).toBe(2);

        // 4 weapons -> tier 4
        const w4 = [
          ...w3,
          createWeaponInstance(archetype, 1, { row: 0, col: 3 }, `${faction}_4`)
        ];
        const res4 = evaluateResonances(w4);
        const r4 = res4.find(r => r.faction === faction)!;
        expect(r4.count).toBe(4);
        expect(r4.tier).toBe(4);

        // 5 weapons -> tier 4
        const w5 = [
          ...w4,
          createWeaponInstance(archetype, 1, { row: 0, col: 4 }, `${faction}_5`)
        ];
        const res5 = evaluateResonances(w5);
        const r5 = res5.find(r => r.faction === faction)!;
        expect(r5.count).toBe(5);
        expect(r5.tier).toBe(4);

        // 10 weapons -> tier 4
        const w10 = [...w5];
        for (let i = 6; i <= 10; i++) {
          w10.push(createWeaponInstance(archetype, 1, { row: 1, col: i - 6 }, `${faction}_${i}`));
        }
        const res10 = evaluateResonances(w10);
        const r10 = res10.find(r => r.faction === faction)!;
        expect(r10.count).toBe(10);
        expect(r10.tier).toBe(4);
      }
    });

    it('verifies exact mathematical buff transitions across count boundaries (0, 1, 2, 3, 4, 5+)', () => {
      // Test Qimen count scaling:
      // Count 0: totalDmgBonus = 0
      // Count 1: totalDmgBonus = 0 (tier 0)
      // Count 2: totalDmgBonus = 2 * 0.10 = 0.20 (tier 2)
      // Count 3: totalDmgBonus = 3 * 0.10 = 0.30 (tier 2)
      // Count 4: totalDmgBonus = 4 * 0.10 = 0.40, auraGlobal5x5 = true (tier 4)
      // Count 5: totalDmgBonus = 5 * 0.10 = 0.50, auraGlobal5x5 = true (tier 4)

      const qimenWeapons = [
        createWeaponInstance('powder_bureau', 1, { row: 0, col: 0 }),
        createWeaponInstance('war_drum', 1, { row: 0, col: 1 }),
        createWeaponInstance('stargazer', 1, { row: 0, col: 3 }),
        createWeaponInstance('luban_workshop', 1, { row: 0, col: 4 }),
        createWeaponInstance('powder_bureau', 1, { row: 1, col: 0 })
      ];

      // 0
      const b0 = calculateSynergyBuffs([]);
      expect(b0.qimen.totalDmgBonus).toBe(0);
      expect(b0.qimen.auraGlobal5x5).toBe(false);

      // 1
      const b1 = calculateSynergyBuffs([qimenWeapons[0]]);
      expect(b1.qimen.totalDmgBonus).toBe(0);
      expect(b1.qimen.auraGlobal5x5).toBe(false);

      // 2
      const b2 = calculateSynergyBuffs(qimenWeapons.slice(0, 2));
      expect(b2.qimen.dmgBonusPerQimen).toBe(0.10);
      expect(b2.qimen.totalDmgBonus).toBeCloseTo(0.20);
      expect(b2.qimen.auraGlobal5x5).toBe(false);

      // 3
      const b3 = calculateSynergyBuffs(qimenWeapons.slice(0, 3));
      expect(b3.qimen.dmgBonusPerQimen).toBe(0.10);
      expect(b3.qimen.totalDmgBonus).toBeCloseTo(0.30);
      expect(b3.qimen.auraGlobal5x5).toBe(false);

      // 4
      const b4 = calculateSynergyBuffs(qimenWeapons.slice(0, 4));
      expect(b4.qimen.dmgBonusPerQimen).toBe(0.10);
      expect(b4.qimen.totalDmgBonus).toBeCloseTo(0.40);
      expect(b4.qimen.auraGlobal5x5).toBe(true);

      // 5
      const b5 = calculateSynergyBuffs(qimenWeapons.slice(0, 5));
      expect(b5.qimen.dmgBonusPerQimen).toBe(0.10);
      expect(b5.qimen.totalDmgBonus).toBeCloseTo(0.50);
      expect(b5.qimen.auraGlobal5x5).toBe(true);
    });

    it('verifies multi-faction mixture with asymmetric boundary counts', () => {
      // 3 Fire (tier 2), 2 Mohist (tier 2), 4 Fortress (tier 4), 1 Qimen (tier 0)
      const mixedWeapons: WeaponInstance[] = [
        // 3 Fire
        createWeaponInstance('fire_lance', 1, { row: 1, col: 0 }),
        createWeaponInstance('rocket_box', 1, { row: 1, col: 1 }),
        createWeaponInstance('thunder_thrower', 1, { row: 1, col: 2 }),
        // 2 Mohist
        createWeaponInstance('repeating_crossbow', 1, { row: 2, col: 0 }),
        createWeaponInstance('flame_beast', 1, { row: 2, col: 1 }),
        // 4 Fortress
        createWeaponInstance('barricade', 1, { row: 0, col: 0 }),
        createWeaponInstance('oil_cabinet', 1, { row: 0, col: 1 }),
        createWeaponInstance('electric_grid', 1, { row: 0, col: 2 }),
        createWeaponInstance('spear_camp', 1, { row: 0, col: 3 }),
        // 1 Qimen
        createWeaponInstance('powder_bureau', 1, { row: 3, col: 0 })
      ];

      const resonances = evaluateResonances(mixedWeapons);
      const fireRes = resonances.find(r => r.faction === 'fire')!;
      const mohistRes = resonances.find(r => r.faction === 'mohist')!;
      const fortressRes = resonances.find(r => r.faction === 'fortress')!;
      const qimenRes = resonances.find(r => r.faction === 'qimen')!;

      expect(fireRes).toEqual({ faction: 'fire', count: 3, tier: 2 });
      expect(mohistRes).toEqual({ faction: 'mohist', count: 2, tier: 2 });
      expect(fortressRes).toEqual({ faction: 'fortress', count: 4, tier: 4 });
      expect(qimenRes).toEqual({ faction: 'qimen', count: 1, tier: 0 });

      const buffs = calculateSynergyBuffs(mixedWeapons, resonances);

      // Fire tier 2 active, tier 4 inactive
      expect(buffs.fire.reloadSpeedBonus).toBe(0.20);
      expect(buffs.fire.maxBurnStacks).toBe(8);
      expect(buffs.fire.burstChance).toBe(0);
      expect(buffs.fire.explosionDmgMultiplier).toBe(1.0);

      // Mohist tier 2 active, tier 4 inactive
      expect(buffs.mohist.critRateBonus).toBe(0.20);
      expect(buffs.mohist.pierceBonus).toBe(1);
      expect(buffs.mohist.armorSunderRate).toBe(0);
      expect(buffs.mohist.multiGridBonus).toBe(0);

      // Fortress tier 4 active
      expect(buffs.fortress.wallHpBonus).toBe(400);
      expect(buffs.fortress.wallReflectBonus).toBe(0.50);
      expect(buffs.fortress.wallRepairRate).toBe(15);
      expect(buffs.fortress.caltropsThreshold).toBe(200);

      // Qimen tier 0 inactive
      expect(buffs.qimen.dmgBonusPerQimen).toBe(0);
      expect(buffs.qimen.totalDmgBonus).toBe(0);
      expect(buffs.qimen.auraGlobal5x5).toBe(false);
    });

    it('handles unexpected or invalid factions gracefully without throwing', () => {
      const invalidWeapon = {
        ...createWeaponInstance('fire_lance', 1, { row: 0, col: 0 }),
        faction: 'unknown_alien_faction' as any
      };

      const resonances = evaluateResonances([invalidWeapon]);
      expect(resonances).toHaveLength(4);
      for (const r of resonances) {
        expect(r.count).toBe(0);
        expect(r.tier).toBe(0);
      }

      const buffs = calculateSynergyBuffs([invalidWeapon]);
      expect(buffs.fire.reloadSpeedBonus).toBe(0);
    });
  });

  // =========================================================================
  // MISSION 5: MONTE CARLO RANDOM STRESS HARNESS (500 RANDOM CONFIGURATIONS)
  // =========================================================================
  describe('Mission 5: Monte Carlo Random Stress Harness (500 Random Boards)', () => {
    it('generates 500 random non-overlapping weapon configurations and verifies all geometric and deduplication invariants', () => {
      const archetypes = [
        'fire_lance',       // 1x1
        'red_cannon',       // 1x2 vertical
        'bed_crossbow',     // 2x1 horizontal
        'catapult',         // 2x2田字
        'powder_bureau'     // 1x1
      ];

      for (let trial = 0; trial < 500; trial++) {
        const board = Array.from({ length: 5 }, () => Array(5).fill(false));
        const weapons: WeaponInstance[] = [];
        const weaponCount = 3 + Math.floor(Math.random() * 6); // 3 to 8 weapons

        for (let wIdx = 0; wIdx < weaponCount; wIdx++) {
          const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
          const dummy = createWeaponInstance(archetype, 1, { row: 0, col: 0 });
          const { width, height } = dummy.footprint;

          // Find candidate anchors that do not overlap existing placements
          const candidates: GridPosition[] = [];
          for (let r = 0; r <= 5 - height; r++) {
            for (let c = 0; c <= 5 - width; c++) {
              let canPlace = true;
              for (let dr = 0; dr < height; dr++) {
                for (let dc = 0; dc < width; dc++) {
                  if (board[r + dr][c + dc]) {
                    canPlace = false;
                    break;
                  }
                }
                if (!canPlace) break;
              }
              if (canPlace) {
                candidates.push({ row: r, col: c });
              }
            }
          }

          if (candidates.length === 0) break;

          const chosenAnchor = candidates[Math.floor(Math.random() * candidates.length)];
          for (let dr = 0; dr < height; dr++) {
            for (let dc = 0; dc < width; dc++) {
              board[chosenAnchor.row + dr][chosenAnchor.col + dc] = true;
            }
          }

          weapons.push(
            createWeaponInstance(archetype, 1, chosenAnchor, `trial_${trial}_w_${wIdx}`)
          );
        }

        if (weapons.length < 2) continue;

        // Invariant 1: evaluateAllBonds deduplication
        const contacts = evaluateAllBonds(weapons);
        const seenPairs = new Set<string>();

        for (const c of contacts) {
          // No self contact
          expect(c.weaponAId).not.toBe(c.weaponBId);

          // Unique unordered pair
          const unorderedKey = [c.weaponAId, c.weaponBId].sort().join('::');
          expect(seenPairs.has(unorderedKey)).toBe(false);
          seenPairs.add(unorderedKey);

          // Invariant 2: Orthogonal contact is always a subset of Chebyshev 3x3 contact
          if (c.isOrthogonal) {
            expect(c.isChebyshev).toBe(true);
          }

          // Invariant 3: Confirmed actual geometric adjacency
          const wA = weapons.find(w => w.id === c.weaponAId)!;
          const wB = weapons.find(w => w.id === c.weaponBId)!;
          const cellsA = getOccupiedCells(wA);
          const cellsB = getOccupiedCells(wB);

          let minManhattan = Infinity;
          let minChebyshev = Infinity;
          for (const a of cellsA) {
            for (const b of cellsB) {
              const m = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
              const ch = Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
              if (m < minManhattan) minManhattan = m;
              if (ch < minChebyshev) minChebyshev = ch;
            }
          }

          if (c.isOrthogonal) {
            expect(minManhattan).toBe(1);
          }
          if (c.isChebyshev) {
            expect(minChebyshev).toBe(1);
          }
        }

        // Invariant 4: Symmetry and Reciprocity in Neighbor Functions
        for (const w of weapons) {
          const ortho = findOrthogonalNeighbors(w, weapons);
          const cheby = findChebyshevNeighbors(w, weapons);

          // Never includes self
          expect(ortho.some(n => n.id === w.id)).toBe(false);
          expect(cheby.some(n => n.id === w.id)).toBe(false);

          // Orthogonal neighbors must be subset of Chebyshev neighbors
          for (const o of ortho) {
            expect(cheby.some(ch => ch.id === o.id)).toBe(true);
          }

          // Reciprocity
          for (const o of ortho) {
            const reciprocal = findOrthogonalNeighbors(o, weapons);
            expect(reciprocal.some(r => r.id === w.id)).toBe(true);
          }
        }

        // Invariant 5: Faction Resonance Monotonicity
        const resonances = evaluateResonances(weapons);
        const totalCount = resonances.reduce((acc, r) => acc + r.count, 0);
        expect(totalCount).toBe(weapons.length);
        for (const r of resonances) {
          if (r.count >= 4) {
            expect(r.tier).toBe(4);
          } else if (r.count >= 2) {
            expect(r.tier).toBe(2);
          } else {
            expect(r.tier).toBe(0);
          }
        }
      }
    });
  });
});
