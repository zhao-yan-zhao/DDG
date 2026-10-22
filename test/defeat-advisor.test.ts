import { describe, it, expect } from 'vitest';
import { DefeatAdvisor, DefeatAnalysisContext } from '../src/core/campaign/defeat-advisor';

describe('DefeatAdvisor (Headless Strategic Defeat Root-Cause Analyzer)', () => {
  it('identifies early lack of weapons on field (Wave 1, <=2 weapons)', () => {
    const ctx: DefeatAnalysisContext = {
      stageId: 1,
      waveReached: 1,
      totalWaves: 8,
      wallMaxHp: 1000,
      wallRemainingHp: 0,
      weaponsOnField: [{ type: 'fire_lance', star: 1 }]
    };

    const advice = DefeatAdvisor.analyze(ctx);
    expect(advice.primaryCause).toBe('early_defense_lacking');
    expect(advice.title).toContain('阵地空虚');
    expect(advice.tacticalTip).toContain('军备工坊');
  });

  it('identifies un-merged star 1 weapons in early waves', () => {
    const ctx: DefeatAnalysisContext = {
      stageId: 1,
      waveReached: 2,
      totalWaves: 8,
      wallMaxHp: 1000,
      wallRemainingHp: 0,
      weaponsOnField: [
        { type: 'fire_lance', star: 1 },
        { type: 'fire_lance', star: 1 },
        { type: 'bow_corps', star: 1 }
      ]
    };

    const advice = DefeatAdvisor.analyze(ctx);
    expect(advice.primaryCause).toBe('low_star_weapons');
    expect(advice.title).toContain('未及升星');
    expect(advice.tacticalTip).toContain('二合一升星');
  });

  it('identifies unused rage during boss wave', () => {
    const ctx: DefeatAnalysisContext = {
      stageId: 4,
      waveReached: 10,
      totalWaves: 10,
      wallMaxHp: 1500,
      wallRemainingHp: 0,
      weaponsOnField: [
        { type: 'fire_lance', star: 2 },
        { type: 'heavy_crossbow', star: 2 }
      ],
      isBossWave: true,
      bossName: '铁塔熊王',
      commanderRage: 100
    };

    const advice = DefeatAdvisor.analyze(ctx);
    expect(advice.primaryCause).toBe('rage_unused');
    expect(advice.title).toContain('绝技未发');
    expect(advice.analysis).toContain('铁塔熊王');
  });

  it('identifies boss overwhelmed when rage was not full', () => {
    const ctx: DefeatAnalysisContext = {
      stageId: 4,
      waveReached: 10,
      totalWaves: 10,
      wallMaxHp: 1500,
      wallRemainingHp: 0,
      weaponsOnField: [
        { type: 'fire_lance', star: 2 },
        { type: 'heavy_crossbow', star: 2 }
      ],
      isBossWave: true,
      bossName: '铁塔熊王',
      commanderRage: 40
    };

    const advice = DefeatAdvisor.analyze(ctx);
    expect(advice.primaryCause).toBe('boss_overwhelmed');
    expect(advice.title).toContain('首领强袭');
    expect(advice.tacticalTip).toContain('城防工事');
  });

  it('identifies heavy armor block when no piercing weapons exist in later waves', () => {
    const ctx: DefeatAnalysisContext = {
      stageId: 3,
      waveReached: 6,
      totalWaves: 10,
      wallMaxHp: 1200,
      wallRemainingHp: 0,
      weaponsOnField: [
        { type: 'fire_lance', star: 2 },
        { type: 'fire_arrow', star: 2 },
        { type: 'bow_corps', star: 2 }
      ],
      isBossWave: false
    };

    const advice = DefeatAdvisor.analyze(ctx);
    expect(advice.primaryCause).toBe('heavy_armor_blocked');
    expect(advice.title).toContain('铁甲难破');
    expect(advice.tacticalTip).toContain('破甲');
  });

  it('provides general overrun fallback when balanced setup fails', () => {
    const ctx: DefeatAnalysisContext = {
      stageId: 2,
      waveReached: 5,
      totalWaves: 8,
      wallMaxHp: 1000,
      wallRemainingHp: 0,
      weaponsOnField: [
        { type: 'heavy_crossbow', star: 2 },
        { type: 'fire_lance', star: 2 },
        { type: 'rolling_log', star: 2 }
      ],
      isBossWave: false
    };

    const advice = DefeatAdvisor.analyze(ctx);
    expect(advice.primaryCause).toBe('general_overrun');
    expect(advice.title).toContain('阵型散乱');
    expect(advice.tacticalTip).toContain('羁绊');
  });
});
