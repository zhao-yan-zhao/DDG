import { describe, it, expect } from 'vitest';
import {
  TacticalThreatAnalyzer,
  TacticalWaveContext,
  TacticalPlayerContext
} from '../src/core/wave/tactical-radar';

describe('TacticalThreatAnalyzer (波次战术推演雷达与兵种克制系统)', () => {
  it('1. Correctly analyzes a low-threat ordinary infantry wave', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 1,
      totalWaves: 10,
      spawns: [
        { enemyType: 'light_infantry', count: 12 }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx);

    expect(report.waveIndex).toBe(1);
    expect(report.isBossWave).toBe(false);
    expect(report.enemyRoster).toHaveLength(1);
    expect(report.enemyRoster[0].name).toBe('流寇轻步兵');
    expect(report.enemyRoster[0].count).toBe(12);

    expect(report.radarRatings.armor).toBeLessThan(25);
    expect(report.radarRatings.speed).toBeLessThan(25);
    expect(report.radarRatings.siege).toBeLessThan(25);
    expect(report.radarRatings.boss).toBe(0);

    expect(report.radarDangerLevels.armor).toBe('LOW');
    expect(report.radarDangerLevels.speed).toBe('LOW');
  });

  it('2. Evaluates Heavy Armor wave and detects lack of armor pierce', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 3,
      spawns: [
        { enemyType: 'shield_guard', count: 8 },
        { enemyType: 'iron_pagoda', count: 4 }
      ]
    };

    // Player with zero armor piercing weapons
    const playerCtx: TacticalPlayerContext = {
      weapons: [
        { id: 'w1', configId: 'repeating_crossbow', star: 1 }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx, playerCtx);

    expect(report.radarRatings.armor).toBeGreaterThanOrEqual(75);
    expect(report.radarDangerLevels.armor).toBe('LETHAL');
    expect(report.keyThreatBadges.some(b => b.tag === '重甲铁盾')).toBe(true);

    expect(report.playerReadiness.counters.armor.status).toBe('DEFICIENT');
    expect(report.headlineAdvice).toContain('重甲');
    expect(report.headlineAdvice).toContain('红夷大炮');
  });

  it('3. Confirms Armor Counter flips to EXCELLENT when red cannon and oil cabinet are deployed', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 3,
      spawns: [
        { enemyType: 'shield_guard', count: 6 },
        { enemyType: 'iron_pagoda', count: 2 }
      ]
    };

    const playerCtx: TacticalPlayerContext = {
      weapons: [
        { id: 'w1', configId: 'red_cannon', star: 2 },
        { id: 'w2', configId: 'oil_cabinet', star: 1, anchor: { row: 0, col: 2 } }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx, playerCtx);

    expect(report.playerReadiness.counters.armor.status).toBe('EXCELLENT');
    expect(report.playerReadiness.counters.armor.keyWeapons).toContain('红夷大炮');
    expect(report.playerReadiness.counters.armor.keyWeapons).toContain('猛火油柜');
    expect(report.playerReadiness.score).toBeGreaterThanOrEqual(60);
  });

  it('4. Evaluates Fast Cavalry rush wave and warns to deploy electric grid', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 4,
      spawns: [
        { enemyType: 'war_dog', count: 10 },
        { enemyType: 'light_cavalry', count: 6 }
      ]
    };

    // Deficient speed defense
    const playerCtx: TacticalPlayerContext = {
      weapons: [
        { id: 'w1', configId: 'repeating_crossbow', star: 1 }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx, playerCtx);

    expect(report.radarRatings.speed).toBeGreaterThanOrEqual(75);
    expect(report.radarDangerLevels.speed).toBe('LETHAL');
    expect(report.keyThreatBadges.some(b => b.tag === '疾风奔袭')).toBe(true);
    expect(report.playerReadiness.counters.speed.status).toBe('DEFICIENT');
    expect(report.headlineAdvice).toContain('陷马电网');
  });

  it('5. Flips Speed Counter to EXCELLENT when electric grid and spear camp are present', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 4,
      spawns: [
        { enemyType: 'war_dog', count: 8 },
        { enemyType: 'light_cavalry', count: 4 }
      ]
    };

    const playerCtx: TacticalPlayerContext = {
      weapons: [
        { id: 'w1', configId: 'electric_grid', star: 2, anchor: { row: 0, col: 1 } },
        { id: 'w2', configId: 'spear_camp', star: 1, anchor: { row: 0, col: 2 } }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx, playerCtx);

    expect(report.playerReadiness.counters.speed.status).toBe('EXCELLENT');
    expect(report.playerReadiness.counters.speed.keyWeapons).toContain('陷马电网');
    expect(report.playerReadiness.counters.speed.keyWeapons).toContain('白杆长枪营');
  });

  it('6. Evaluates Suicide Bomb Carrier wave and warns to deploy long-range sniper', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 5,
      spawns: [
        { enemyType: 'bomb_carrier', count: 5 },
        { enemyType: 'siege_ram', count: 1 }
      ]
    };

    const playerCtx: TacticalPlayerContext = {
      weapons: [
        { id: 'w1', configId: 'fire_lance', star: 1 }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx, playerCtx);

    expect(report.radarRatings.siege).toBeGreaterThanOrEqual(75);
    expect(report.radarDangerLevels.siege).toBe('LETHAL');
    expect(report.keyThreatBadges.some(b => b.tag === '爆破攻城')).toBe(true);
    expect(report.playerReadiness.counters.siege.status).toBe('DEFICIENT');
    expect(report.headlineAdvice).toContain('自爆火药死士');
    expect(report.headlineAdvice).toContain('八牛弩');
  });

  it('7. Flips Siege Counter to EXCELLENT with Bed Crossbow and Row 0 barricade', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 5,
      spawns: [
        { enemyType: 'bomb_carrier', count: 4 }
      ]
    };

    const playerCtx: TacticalPlayerContext = {
      weapons: [
        { id: 'w1', configId: 'bed_crossbow', star: 2 },
        { id: 'w2', configId: 'barricade', star: 2, anchor: { row: 0, col: 2 } }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx, playerCtx);

    expect(report.playerReadiness.counters.siege.status).toBe('EXCELLENT');
    expect(report.playerReadiness.counters.siege.keyWeapons).toContain('八牛弩');
  });

  it('8. Evaluates Boss Wave and assigns high boss threat rating and badges', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 10,
      isBossWave: true,
      bossConfig: {
        name: '黑风寨主·铁塔熊王',
        archetype: 'boss_bear',
        skills: [
          { id: 'earth_slam', name: '地裂怒击' },
          { id: 'enrage', name: '狂暴怒嚎' }
        ]
      },
      spawns: [
        { enemyType: 'boss_bear', count: 1 },
        { enemyType: 'shield_guard', count: 4 }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx);

    expect(report.isBossWave).toBe(true);
    expect(report.radarRatings.boss).toBeGreaterThanOrEqual(80);
    expect(report.radarDangerLevels.boss).toBe('LETHAL');
    expect(report.keyThreatBadges.some(b => b.tag === '首领亲临')).toBe(true);
    expect(report.enemyRoster.some(r => r.isBoss)).toBe(true);
  });

  it('9. Correctly calculates overall S Rank when player defense counters all threats', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 6,
      spawns: [
        { enemyType: 'shield_guard', count: 4 },
        { enemyType: 'war_dog', count: 4 }
      ]
    };

    const playerCtx: TacticalPlayerContext = {
      weapons: [
        { id: 'w1', configId: 'red_cannon', star: 3 },
        { id: 'w2', configId: 'electric_grid', star: 3, anchor: { row: 0, col: 1 } },
        { id: 'w3', configId: 'bed_crossbow', star: 3 },
        { id: 'w4', configId: 'war_drum', star: 2 }
      ],
      commanderId: 'wang_shouren'
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx, playerCtx);

    expect(report.playerReadiness.rank).toBe('S');
    expect(report.playerReadiness.rankTitle).toContain('神机妙算');
    expect(report.headlineAdvice).toContain('胜券在握');
  });

  it('10. Aggregates duplicate enemy spawn batches accurately', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 2,
      spawns: [
        { enemyType: 'light_infantry', count: 5 },
        { enemyType: 'war_dog', count: 3 },
        { enemyType: 'light_infantry', count: 7 },
        { enemyType: 'war_dog', count: 4 }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx);

    expect(report.enemyRoster).toHaveLength(2);
    const infantry = report.enemyRoster.find(r => r.enemyId === 'light_infantry');
    const dog = report.enemyRoster.find(r => r.enemyId === 'war_dog');

    expect(infantry?.count).toBe(12);
    expect(dog?.count).toBe(7);
  });

  it('11. Gracefully handles empty wave spawns without throwing', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 1,
      spawns: []
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx);

    expect(report.radarRatings.armor).toBe(0);
    expect(report.radarRatings.speed).toBe(0);
    expect(report.radarRatings.siege).toBe(0);
    expect(report.radarRatings.boss).toBe(0);
    expect(report.enemyRoster).toHaveLength(0);
    expect(report.keyThreatBadges).toHaveLength(1);
    expect(report.keyThreatBadges[0].tag).toBe('流寇先遣');
  });

  it('12. Injects boss into roster if isBossWave is true but boss is omitted from explicit spawns', () => {
    const waveCtx: TacticalWaveContext = {
      waveIndex: 5,
      isBossWave: true,
      bossConfig: {
        name: '机关楼船·玄武巨舰',
        archetype: 'boss_xuanwu'
      },
      spawns: [
        { enemyType: 'shield_guard', count: 6 }
      ]
    };

    const report = TacticalThreatAnalyzer.analyzeThreat(waveCtx);

    expect(report.isBossWave).toBe(true);
    const boss = report.enemyRoster.find(r => r.enemyId === 'boss_xuanwu');
    expect(boss).toBeDefined();
    expect(boss?.name).toBe('机关楼船·玄武巨舰');
    expect(boss?.isBoss).toBe(true);
  });
});
