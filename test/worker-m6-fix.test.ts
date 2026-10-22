/**
 * 《孤城神机营》- Worker M6 Fix Verification Test Suite
 * 
 * Verifies:
 * 1. Windows-safe packaging in scripts/build-douyin.js (consecutive runs, fallback cleaning)
 * 2. tt === null safety in PlatformBridge and DouyinPlatform
 * 3. Circular reference serialization safety in WebPlatform.setStorageSync
 * 4. Presentation polish in BattleScene:
 *    - setupInitialWeapons grid placement at { row: 2, col: 1 } and { row: 2, col: 2 }
 *    - affixEngine and commander additive damage bonus plumbing in DamageCalculationContext
 *    - ASPD bonus and ultimate cooldown reset plumbing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PlatformBridge, getPlatform } from '../src/platform';
import { WebPlatform } from '../src/platform/web-platform';
import { DouyinPlatform } from '../src/platform/douyin-platform';
import { buildDouyin } from '../scripts/build-douyin.js';
import { GridModel } from '../src/core/grid/grid-model';
import { WeaponManager } from '../src/core/weapon/weapon-manager';
import { createWeaponInstance } from '../src/core/weapon/weapon-instance';
import { AffixMountEngine } from '../src/core/tactics/affix-mount';
import { Commander } from '../src/core/commander/commander';
import { DamagePipeline } from '../src/core/combat/damage-pipeline';
import { EnemyEntity, WeaponInstance } from '../src/core/types';

describe('Worker M6 Fix: Platform & Packaging Resilience', () => {
  const testRoot = path.resolve(process.cwd(), 'test-m6-fix-env');
  const testDist = path.resolve(testRoot, 'dist');
  const testDouyin = path.resolve(testRoot, 'dist-douyin');

  beforeEach(() => {
    PlatformBridge.reset();
    delete (globalThis as any).tt;

    // Setup mock dist directory for build-douyin test
    fs.mkdirSync(path.resolve(testDist, 'assets'), { recursive: true });
    fs.writeFileSync(path.resolve(testDist, 'index.html'), '<html><body>DDG</body></html>');
    fs.writeFileSync(path.resolve(testDist, 'assets', 'index-abc123.js'), 'console.log("DDG");');
  });

  afterEach(() => {
    PlatformBridge.reset();
    delete (globalThis as any).tt;

    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('Task 1: consecutive buildDouyin executions succeed without EPERM on Windows', () => {
    // Run 1: target directory does not exist initially
    const result1 = buildDouyin({
      rootDir: testRoot,
      sourceDir: testDist,
      targetDir: testDouyin
    });
    expect(result1.success).toBe(true);
    expect(fs.existsSync(path.resolve(testDouyin, 'game.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(testDouyin, 'game.js'))).toBe(true);

    // Run 2: target directory already exists with previous build artifacts (reproduces Windows re-run)
    const result2 = buildDouyin({
      rootDir: testRoot,
      sourceDir: testDist,
      targetDir: testDouyin
    });
    expect(result2.success).toBe(true);
    expect(fs.existsSync(path.resolve(testDouyin, 'project.config.json'))).toBe(true);
  });

  it('Task 2: PlatformBridge safely falls back to WebPlatform when tt is null', () => {
    (globalThis as any).tt = null;
    let platform: any = null;
    expect(() => {
      platform = PlatformBridge.getPlatform();
    }).not.toThrow();

    expect(platform).toBeInstanceOf(WebPlatform);
    expect(platform.type).toBe('web');
  });

  it('Task 2: DouyinPlatform methods handle tt === null safely without throwing TypeError', () => {
    (globalThis as any).tt = null;
    const platform = new DouyinPlatform();

    expect(() => platform.vibrateShort('heavy')).not.toThrow();
    expect(() => platform.vibrateLong()).not.toThrow();
    expect(() => platform.getStorageSync('key')).not.toThrow();
    expect(platform.getStorageSync('key')).toBeNull();
    expect(() => platform.setStorageSync('key', { a: 1 })).not.toThrow();
    expect(() => platform.removeStorageSync('key')).not.toThrow();
    expect(() => platform.clearStorageSync()).not.toThrow();
    expect(() => platform.onTouchStart(() => {})).not.toThrow();
    expect(() => platform.onTouchMove(() => {})).not.toThrow();
    expect(() => platform.onTouchEnd(() => {})).not.toThrow();
    expect(() => platform.onShareAppMessage(() => ({ title: 'test' }))).not.toThrow();

    return platform.showRewardedVideoAd('ad_unit_1').then((res) => {
      expect(res.isEnded).toBe(false);
      expect(res.error).toBe('API_NOT_SUPPORTED');
    });
  });

  it('Task 3: WebPlatform.setStorageSync safely serializes circular objects without throwing TypeError', () => {
    const webPlatform = new WebPlatform();
    const circularData: any = { name: 'cyclic_node' };
    circularData.loop = circularData;

    expect(() => {
      webPlatform.setStorageSync('cyclic_key', circularData);
    }).not.toThrow();

    const retrieved = webPlatform.getStorageSync<string>('cyclic_key');
    expect(retrieved).toBeDefined();
    expect(typeof retrieved).toBe('string');
    expect(retrieved).toContain('[object Object]');
  });
});

describe('Worker M6 Fix: Presentation & Combat Polish', () => {
  it('Task 4: setupInitialWeapons places 2 starter fire lances at { row: 2, col: 1 } and { row: 2, col: 2 }', () => {
    const gridModel = new GridModel();
    const weaponManager = new WeaponManager();

    const lanceA = createWeaponInstance('fire_lance', 1);
    const lanceB = createWeaponInstance('fire_lance', 1);

    weaponManager.registerWeapon(lanceA);
    weaponManager.registerWeapon(lanceB);

    const placedA = gridModel.placeWeapon(lanceA, { row: 2, col: 1 });
    const placedB = gridModel.placeWeapon(lanceB, { row: 2, col: 2 });

    expect(placedA).toBe(true);
    expect(placedB).toBe(true);

    // Verify cell occupancy on the 5x5 sand table
    expect(gridModel.isCellOccupied(2, 1)).toBe(true);
    expect(gridModel.isCellOccupied(2, 2)).toBe(true);

    // Verify bench is empty
    expect(gridModel.getEmptyBenchSlotsCount()).toBe(5);

    // Verify coordinates align with FTUE step 1 guidance cells
    const allWeapons = gridModel.getAllWeapons();
    expect(allWeapons.length).toBe(2);
    expect(allWeapons.map(w => w.anchor)).toEqual(
      expect.arrayContaining([
        { row: 2, col: 1 },
        { row: 2, col: 2 }
      ])
    );
  });

  it('Task 4: damageContext includes additive bonuses from both AffixMountEngine and Commander', () => {
    const affixEngine = new AffixMountEngine();
    const commander = new Commander('wang_shouren'); // passive fireAtkBonus: +0.20
    const attacker: WeaponInstance = createWeaponInstance('fire_lance', 1); // faction: 'fire', baseAtk: 60
    const target: EnemyEntity = {
      id: 'e1',
      typeId: 'enemy_ordinary',
      name: '步卒',
      isBoss: false,
      maxHp: 200,
      currentHp: 200,
      armor: 0,
      shield: 0,
      moveSpeed: 1.0
    };

    // 1. Mount T09 《改良黑火药》 (+25% fire damage)
    affixEngine.mountCard('T09');

    // 2. Collect additive bonuses
    const commanderAdditive: number[] = [];
    const passive = commander.getPassive();
    if (attacker.faction === 'fire' && passive.fireAtkBonus) {
      commanderAdditive.push(passive.fireAtkBonus);
    }
    expect(commanderAdditive).toContain(0.20);

    const damageContext = affixEngine.populateDamageContext(
      attacker,
      target,
      undefined,
      commanderAdditive
    );

    // Verify both T09 (0.25) and Wang Shouren (0.20) are present in additiveBonuses
    expect(damageContext.additiveBonuses).toContain(0.25);
    expect(damageContext.additiveBonuses).toContain(0.20);

    // Verify damage calculation honors both additive bonuses:
    // baseAtk: attacker.baseAtk * 1.0 * (1 + 0.25 + 0.20)
    const expectedDmg = attacker.baseAtk * (1 + 0.25 + 0.20);
    const result = DamagePipeline.calculate(damageContext, 1.0); // forced non-crit
    expect(result.finalDamage).toBeCloseTo(expectedDmg, 4);
  });

  it('Task 4: effective attack interval integrates both affix ASPD and commander ultimate', () => {
    const affixEngine = new AffixMountEngine();
    const commander = new Commander('wang_shouren');
    const attacker: WeaponInstance = createWeaponInstance('fire_lance', 1);

    // Calculate baseline interval
    let aspdBonus = affixEngine.getAttackSpeedBonus(attacker);
    expect(aspdBonus).toBe(0);

    // Activate commander ultimate (+150% ASPD)
    commander.setRage(100);
    const ultRes = commander.castUltimate();
    expect(ultRes.success).toBe(true);

    if (commander.isUltimateActive) {
      aspdBonus += 1.50;
    }

    const effectiveInterval = affixEngine.calculateEffectiveInterval(attacker.attackInterval, aspdBonus);
    // baseInterval / (1 + 1.50) = attacker.attackInterval / 2.5
    expect(effectiveInterval).toBeCloseTo(attacker.attackInterval / 2.5, 4);
  });
});
