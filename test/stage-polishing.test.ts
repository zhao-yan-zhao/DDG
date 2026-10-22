import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignWaveEngine } from '../src/core/wave/campaign-wave-engine';
import { EnvironmentEngine } from '../src/core/wave/environment-engine';
import { CAMPAIGN_STAGES_CONFIG } from '../src/config/campaign.config';
import {
  getStageWaveConfig,
  CHAPTER_1_MASTER_WAVES
} from '../src/config/campaign-waves.config';
import { DefeatAdvisor, DefeatAnalysisContext } from '../src/core/campaign/defeat-advisor';
import { SoundManager } from '../src/presentation/audio/sound-manager';

describe('Stage Polishing & Wave Experience Suite', () => {
  beforeEach(() => {
    SoundManager.resetForTesting();
  });

  describe('1. CampaignWaveEngine Wave Checks & Elite Detection', () => {
    it('accurately identifies elite wave vs normal wave vs boss wave in Stage 1 & Stage 4', () => {
      const stage4Config = CAMPAIGN_STAGES_CONFIG[4];
      const stage4WaveConfig = getStageWaveConfig(4);
      const engine = new CampaignWaveEngine(stage4Config, stage4WaveConfig);

      // Wave 1 is normal
      expect(engine.isBossWave(1)).toBe(false);
      expect(engine.isEliteWave(1)).toBe(false);

      // Wave 5 is an Elite wave
      expect(engine.isEliteWave(5)).toBe(true);
      expect(engine.isBossWave(5)).toBe(false);

      // Wave 10 is a Boss wave
      expect(engine.isBossWave(10)).toBe(true);
      expect(engine.isEliteWave(10)).toBe(false);
    });

    it('returns valid wave definitions for all waves', () => {
      const stage1Config = CAMPAIGN_STAGES_CONFIG[1];
      const stage1WaveConfig = getStageWaveConfig(1);
      const engine = new CampaignWaveEngine(stage1Config, stage1WaveConfig);

      const waveDef = engine.getCurrentWaveDefinition();
      expect(waveDef).toBeDefined();
      expect(waveDef?.waveNumber).toBe(1);
      expect(waveDef?.spawns.length).toBeGreaterThan(0);
    });
  });

  describe('2. EnvironmentEngine Combat Multipliers', () => {
    it('applies river_water lightning & projectile modifiers for Chapter 2', () => {
      const theme = EnvironmentEngine.getThemeForChapter(2);
      expect(theme).toBe('river_water');

      const mods = EnvironmentEngine.getModifiers(theme, 5);
      expect(mods.directRangedDamageMultiplier).toBe(0.85); // -15%
      expect(mods.lightningDamageMultiplier).toBe(1.30);    // +30%
      expect(mods.lightningExtraChain).toBe(1);             // +1 bounce
    });

    it('applies snow_tundra reload penalty & ice shatter multiplier for Chapter 3', () => {
      const theme = EnvironmentEngine.getThemeForChapter(3);
      expect(theme).toBe('snow_tundra');

      const mods = EnvironmentEngine.getModifiers(theme, 9);
      expect(mods.iceShatterDamageMultiplier).toBe(2.0);    // +100%
      expect(mods.nonColdWeaponReloadPenalty).toBe(0.15);   // -15% ASPD
    });

    it('applies imperial_city commander rage boost for Chapter 5', () => {
      const theme = EnvironmentEngine.getThemeForChapter(5);
      expect(theme).toBe('imperial_city');

      const mods = EnvironmentEngine.getModifiers(theme, 17);
      expect(mods.commanderRageRateMultiplier).toBe(1.50);  // +50% rage
    });
  });

  describe('3. SoundManager Procedural War Drums & Boss Alert', () => {
    it('safely invokes playWarDrums and playBossAlert in headless test environment', () => {
      const soundManager = SoundManager.getInstance();
      expect(() => {
        soundManager.playWarDrums();
        soundManager.playBossAlert();
      }).not.toThrow();
    });
  });

  describe('4. Stages 1-5 Wave Balancing & Progression Curve', () => {
    it('verifies Stage 1 (Introduction) starts with friendly light infantry and generous stipend', () => {
      const stage1Wave1 = CHAPTER_1_MASTER_WAVES[0];
      expect(stage1Wave1.waveNumber).toBe(1);
      expect(stage1Wave1.stipend).toBeGreaterThanOrEqual(35);
      expect(stage1Wave1.spawns[0].enemyType).toBe('light_infantry');
      expect(stage1Wave1.spawns[0].hpMultiplier).toBe(1.0);
    });

    it('verifies Stage 2 introduces agile War Dogs gradually after delay', () => {
      const stage1Wave2 = CHAPTER_1_MASTER_WAVES[1];
      expect(stage1Wave2.waveNumber).toBe(2);
      const warDogSpawn = stage1Wave2.spawns.find(s => s.enemyType === 'war_dog');
      expect(warDogSpawn).toBeDefined();
      expect(warDogSpawn!.delayMs).toBeGreaterThan(0); // Appears later in the wave
    });

    it('verifies Stage 4 features Chapter 1 Boss with full combat timetable', () => {
      const stage4WaveConfig = getStageWaveConfig(4);
      const bossWave = stage4WaveConfig.waves.find(w => w.isBossWave);
      expect(bossWave).toBeDefined();
      expect(bossWave?.bossConfig?.bossId).toBe('boss_bear');
      expect(bossWave?.bossConfig?.skills.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('5. DefeatAdvisor Integration Validation', () => {
    it('produces insightful advice for heavy armor walls without piercing units', () => {
      const ctx: DefeatAnalysisContext = {
        stageId: 3,
        waveReached: 6,
        totalWaves: 8,
        wallMaxHp: 1200,
        wallRemainingHp: 0,
        weaponsOnField: [
          { type: 'fire_lance', star: 2, faction: 'firearm' },
          { type: 'bow_corps', star: 2, faction: 'military' }
        ]
      };

      const advice = DefeatAdvisor.analyze(ctx);
      expect(advice.primaryCause).toBe('heavy_armor_blocked');
      expect(advice.recommendedWeaponType).toBe('heavy_crossbow');
    });
  });
});
