/**
 * 《孤城神机营》- Combat DPS & Damage/Tanking Statistics Tracker
 * Tracks cumulative damage dealt, kills, and damage intercepted/mitigated by each weapon instance.
 * Pure headless domain model (Zero DOM / Zero Phaser).
 */

export interface WeaponCombatStat {
  weaponId: string;
  configId: string;
  name: string;
  star: number;
  faction: string;
  totalDamage: number;
  killCount: number;
  damageIntercepted: number; // For Row 0 frontline fortress units
  dps: number;
}

export class CombatStatsTracker {
  private stats: Map<string, WeaponCombatStat> = new Map();
  private battleStartTime: number = 0;
  private totalDamageDealt: number = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.stats.clear();
    this.battleStartTime = Date.now();
    this.totalDamageDealt = 0;
  }

  /**
   * Registers a weapon in the stats tracker if not already present.
   */
  public registerWeapon(weapon: {
    id: string;
    configId: string;
    name?: string;
    star: number;
    faction: string;
  }): void {
    if (!this.stats.has(weapon.id)) {
      this.stats.set(weapon.id, {
        weaponId: weapon.id,
        configId: weapon.configId,
        name: weapon.name || weapon.configId,
        star: weapon.star,
        faction: weapon.faction,
        totalDamage: 0,
        killCount: 0,
        damageIntercepted: 0,
        dps: 0
      });
    }
  }

  /**
   * Records damage dealt by a weapon.
   */
  public recordDamage(weaponId: string, damage: number, isKill: boolean = false): void {
    let stat = this.stats.get(weaponId);
    if (!stat) {
      stat = {
        weaponId,
        configId: weaponId,
        name: weaponId,
        star: 1,
        faction: 'fire',
        totalDamage: 0,
        killCount: 0,
        damageIntercepted: 0,
        dps: 0
      };
      this.stats.set(weaponId, stat);
    }

    stat.totalDamage += damage;
    this.totalDamageDealt += damage;
    if (isKill) {
      stat.killCount += 1;
    }

    const elapsedSec = Math.max(1, (Date.now() - this.battleStartTime) / 1000);
    stat.dps = Math.round(stat.totalDamage / elapsedSec);
  }

  /**
   * Records frontline damage intercepted by a Row 0 fortification weapon.
   */
  public recordInterception(weaponId: string, interceptedAmount: number): void {
    const stat = this.stats.get(weaponId);
    if (stat) {
      stat.damageIntercepted += interceptedAmount;
    }
  }

  /**
   * Returns a sorted list of all weapons sorted by total damage descending.
   */
  public getSortedStats(): WeaponCombatStat[] {
    const list = Array.from(this.stats.values());
    list.sort((a, b) => b.totalDamage - a.totalDamage);
    return list;
  }

  /**
   * Returns MVP weapon (highest damage output) or null if no damage dealt.
   */
  public getMvpWeapon(): WeaponCombatStat | null {
    const sorted = this.getSortedStats();
    if (sorted.length > 0 && sorted[0].totalDamage > 0) {
      return sorted[0];
    }
    return null;
  }

  /**
   * Returns total team damage dealt across all weapons.
   */
  public getTotalDamage(): number {
    return this.totalDamageDealt;
  }
}
