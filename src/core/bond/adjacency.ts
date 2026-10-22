/**
 * 《孤城神机营》- Adjacency Geometry & Deduplication Engine
 * Orthogonal Cross (Manhattan == 1) and Chebyshev 3x3 Moore (Chebyshev == 1) calculations.
 * Multi-grid weapon pairs sharing multiple cells are deduplicated to exactly 1 contact record.
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { BondContact, GridPosition, WeaponInstance } from '../types';

/**
 * Returns all grid coordinates occupied by a weapon instance given its anchor and footprint.
 */
export function getOccupiedCells(weapon: WeaponInstance): GridPosition[] {
  const cells: GridPosition[] = [];
  const height = weapon.footprint?.height ?? 1;
  const width = weapon.footprint?.width ?? 1;

  for (let dr = 0; dr < height; dr++) {
    for (let dc = 0; dc < width; dc++) {
      cells.push({
        row: weapon.anchor.row + dr,
        col: weapon.anchor.col + dc
      });
    }
  }
  return cells;
}

/**
 * Evaluates geometric adjacency contact between two weapon instances.
 * Checks Manhattan distance == 1 (orthogonal cross) and Chebyshev distance == 1 (3x3 Moore).
 */
export function evaluateContact(weaponA: WeaponInstance, weaponB: WeaponInstance): BondContact {
  const cellsA = getOccupiedCells(weaponA);
  const cellsB = getOccupiedCells(weaponB);

  let isOrthogonal = false;
  let isChebyshev = false;

  for (const a of cellsA) {
    for (const b of cellsB) {
      const manhattan = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
      const chebyshev = Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));

      if (manhattan === 1) {
        isOrthogonal = true;
      }
      if (chebyshev === 1) {
        isChebyshev = true;
      }
    }
  }

  return {
    weaponAId: weaponA.id,
    weaponBId: weaponB.id,
    isOrthogonal,
    isChebyshev
  };
}

/**
 * Evaluates all unique adjacent weapon pairs across a set of weapons.
 * Deduplicates multi-grid contacts so each weapon pair has at most ONE BondContact record.
 */
export function evaluateAllBonds(weapons: WeaponInstance[]): BondContact[] {
  const contacts: BondContact[] = [];

  for (let i = 0; i < weapons.length; i++) {
    for (let j = i + 1; j < weapons.length; j++) {
      const contact = evaluateContact(weapons[i], weapons[j]);
      if (contact.isOrthogonal || contact.isChebyshev) {
        contacts.push(contact);
      }
    }
  }

  return contacts;
}

/**
 * Finds all weapon instances that are orthogonally (cross) adjacent to target weapon.
 */
export function findOrthogonalNeighbors(
  target: WeaponInstance,
  allWeapons: WeaponInstance[]
): WeaponInstance[] {
  return allWeapons.filter(w => {
    if (w.id === target.id) return false;
    const contact = evaluateContact(target, w);
    return contact.isOrthogonal;
  });
}

/**
 * Finds all weapon instances that are Chebyshev (3x3 Moore) adjacent to target weapon.
 */
export function findChebyshevNeighbors(
  target: WeaponInstance,
  allWeapons: WeaponInstance[]
): WeaponInstance[] {
  return allWeapons.filter(w => {
    if (w.id === target.id) return false;
    const contact = evaluateContact(target, w);
    return contact.isChebyshev;
  });
}

/**
 * Adjacency Evaluator class providing static methods matching contract specifications.
 */
export class AdjacencyEvaluator {
  public static getOccupiedCells = getOccupiedCells;
  public static evaluateContact = evaluateContact;
  public static evaluateAllBonds = evaluateAllBonds;
  public static findOrthogonalNeighbors = findOrthogonalNeighbors;
  public static findChebyshevNeighbors = findChebyshevNeighbors;
}
