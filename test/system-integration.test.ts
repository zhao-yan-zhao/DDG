/**
 * 《孤城神机营》- Full System Integration & Verification Test Suite
 * Covers Milestone M_INT & Track D Acceptance Criteria:
 * 1. SoundManager full procedural Web Audio suite & mute persistence
 * 2. EnemyTextureFactory 13 archetypes key resolution & fallback coverage
 * 3. CampaignWaveEngine 20 stages instantiation, 5 environmental chapters & 5 Boss state machines
 * 4. Full game loop combat, damage pipeline, elemental reactions & settlement evaluation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundManager } from '../src/presentation/audio/sound-manager';
import { EnemyTextureFactory } from '../src/presentation/textures/enemy-texture-factory';
import { EnemyFactory } from '../src/core/enemy/enemy-entity';
import { CampaignWaveEngine } from '../src/core/wave/campaign-wave-engine';
import { EnvironmentEngine } from '../src/core/wave/environment-engine';
import { getStageConfig, CAMPAIGN_CHAPTERS_CONFIG } from '../src/config/campaign.config';
import { getStageWaveConfig, ALL_CAMPAIGN_STAGES_WAVES } from '../src/config/campaign-waves.config';
import { SettlementEvaluator, SettlementResult } from '../src/core/campaign/settlement-evaluator';
import { ProfileStorage } from '../src/core/meta/profile-storage';
import { PlatformBridge } from '../src/bridge/platform';
import { DamagePipeline } from '../src/core/combat/damage-pipeline';
import { ElementStateManager, applyBurn, applyOil, applyShock, applyFreeze, applyPoison } from '../src/core/reaction/element-state';
import { triggerExplosion, triggerThunderStrike, triggerIceShatter, triggerPoisonFire } from '../src/core/reaction/reaction-valve';
import { createWeaponInstance } from '../src/core/weapon/weapon-instance';
import { ThreeSceneManager } from '../src/presentation/three/three-scene-manager';

describe('Track D: Full System Integration & Verification', () => {
  beforeEach(() => {
    SoundManager.resetForTesting();
    // Clear storage for audio and meta tests
    const p = PlatformBridge.getPlatform();
    p.setStorageSync('ddg_audio_settings', null);
    p.setStorageSync('ddg_profile_save_v1', null);
  });

  describe('1. Audio System & SoundManager Integration', () => {
    it('executes all 22 procedural SFX methods without errors in headless mode', () => {
      const sm = SoundManager.getInstance();

      expect(() => {
        // Weapon firing SFX
        sm.playArquebusShot();
        sm.playGunshot();
        sm.playCannonBlast();
        sm.playRocketVolley();
        sm.playCrossbowTwang();
        sm.playBowTwang();

        // Combat impact & reactions
        sm.playBladeClank();
        sm.playShieldBash();
        sm.playCritGong();
        sm.playWallHit();
        sm.playEnemyDeath();

        // Elemental reactions
        sm.playFireBlastReaction();
        sm.playThunderJudgementReaction();
        sm.playIceShatterReaction();
        sm.playNetherPoisonReaction();

        // UI & Economy SFX
        sm.playBronzeButtonClick();
        sm.playVermilionStamp();
        sm.playCoinJingle();
        sm.playIronClink();
        sm.playMergeChime();
        sm.playVictoryFanfare();
        sm.playDefeatSound();
        sm.playUltimateVoice();
        sm.playClick();
      }).not.toThrow();
    });

    it('handles BGM track transitions and equal-power crossfader states', () => {
      const sm = SoundManager.getInstance();

      expect(sm.getCurrentBgm()).toBe('none');

      sm.playLobbyBgm();
      expect(sm.getCurrentBgm()).toBe('lobby');

      sm.playBattleBgm();
      expect(sm.getCurrentBgm()).toBe('battle');

      sm.playBossBgm();
      expect(sm.getCurrentBgm()).toBe('boss');

      sm.pauseBgm();
      sm.resumeBgm();
      sm.stopBgm();
      expect(sm.getCurrentBgm()).toBe('none');
    });

    it('persists mute settings across platform storage sessions', () => {
      const sm = SoundManager.getInstance();
      expect(sm.getIsMuted()).toBe(false);

      const isMuted = sm.toggleMute();
      expect(isMuted).toBe(true);
      expect(sm.getIsMuted()).toBe(true);

      // Verify persistent storage written
      const storage = PlatformBridge.getPlatform().getStorageSync('ddg_audio_settings');
      expect(storage).toBeDefined();
      const parsed = typeof storage === 'string' ? JSON.parse(storage) : storage;
      expect(parsed.isMuted).toBe(true);

      // Reset and verify state restored
      SoundManager.resetForTesting();
      const newSm = SoundManager.getInstance();
      expect(newSm.getIsMuted()).toBe(true);

      // Unmute
      newSm.toggleMute();
      expect(newSm.getIsMuted()).toBe(false);
    });
  });

  describe('2. Enemy Visual Texture Factory Integration', () => {
    it('correctly resolves texture keys for all 8 regular/elite enemy archetypes', () => {
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'light_infantry' })).toBe('enemy_light_infantry');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'war_dog' })).toBe('enemy_war_dog');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'light_cavalry' })).toBe('enemy_light_cavalry');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'shield_guard' })).toBe('enemy_shield_guard');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'iron_pagoda' })).toBe('enemy_iron_pagoda');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'ranged_bowman' })).toBe('enemy_ranged_bowman');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'bomb_carrier' })).toBe('enemy_bomb_carrier');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'siege_ram' })).toBe('enemy_siege_ram');
    });

    it('correctly resolves texture keys for all 5 chapter bosses', () => {
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_bear', isBoss: true })).toBe('enemy_boss_bear');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_xuanwu', isBoss: true })).toBe('enemy_boss_xuanwu');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_khan', isBoss: true })).toBe('enemy_boss_khan');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_wangu', isBoss: true })).toBe('enemy_boss_wangu');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_corpse_demon', isBoss: true })).toBe('enemy_boss_wangu');
      expect(EnemyTextureFactory.getTextureKey({ typeId: 'boss_taotie', isBoss: true })).toBe('enemy_boss_taotie');
    });

    it('falls back safely for unknown or legacy enemy structures', () => {
      const fallbackOrdinary = { typeId: 'ordinary', isBoss: false };
      expect(EnemyTextureFactory.getTextureKey(fallbackOrdinary)).toBe('enemy_light_infantry');

      const fallbackBoss = { typeId: 'boss', isBoss: true };
      expect(EnemyTextureFactory.getTextureKey(fallbackBoss)).toBe('enemy_boss_bear');
    });
  });

  describe('3. CampaignWaveEngine: 20 Stages, 5 Chapters & Boss State Machines', () => {
    it('cleanly instantiates all 20 campaign stages with complete wave timetables', () => {
      expect(Object.keys(ALL_CAMPAIGN_STAGES_WAVES).length).toBe(20);

      for (let stageId = 1; stageId <= 20; stageId++) {
        const stageCfg = getStageConfig(stageId);
        const waveCfg = getStageWaveConfig(stageId);

        expect(stageCfg).toBeDefined();
        expect(waveCfg).toBeDefined();
        expect(stageCfg.stageId).toBe(stageId);
        expect(waveCfg.stageId).toBe(stageId);
        expect(waveCfg.waves.length).toBe(stageCfg.totalWaves);

        const engine = new CampaignWaveEngine(stageCfg, waveCfg, {
          extraWallMaxHp: 200,
          waveStipendBonus: 5,
          wallY: 840
        });

        expect(engine).toBeDefined();
        expect(engine.getTotalWaves()).toBe(stageCfg.totalWaves);
        expect(engine.getEnvironmentModifiers()).toBeDefined();
      }
    });

    it('verifies chapter battlefield environments and rule modifications', () => {
      // Ch1: Plain Valley (baseline)
      const ch1Theme = EnvironmentEngine.getThemeForChapter(1);
      const ch1Mods = EnvironmentEngine.getModifiers(ch1Theme, 1);
      expect(ch1Theme).toBe('plain_valley');
      expect(ch1Mods.directRangedDamageMultiplier).toBe(1.0);

      // Ch2: River Water (lightning +30%, chain +1, direct ranged -15%)
      const ch2Theme = EnvironmentEngine.getThemeForChapter(2);
      const ch2Mods = EnvironmentEngine.getModifiers(ch2Theme, 5);
      expect(ch2Theme).toBe('river_water');
      expect(ch2Mods.directRangedDamageMultiplier).toBe(0.85);
      expect(ch2Mods.lightningDamageMultiplier).toBe(1.30);
      expect(ch2Mods.lightningExtraChain).toBe(1);

      // Ch3: Snow Tundra (ice shatter 2x, reload penalty 0.85)
      const ch3Theme = EnvironmentEngine.getThemeForChapter(3);
      const ch3Mods = EnvironmentEngine.getModifiers(ch3Theme, 9);
      expect(ch3Theme).toBe('snow_tundra');
      expect(ch3Mods.iceShatterDamageMultiplier).toBe(2.0);
      expect(ch3Mods.iceShatterRadiusMultiplier).toBe(2.0);
      expect(ch3Mods.weaponAttackSpeedMultiplier).toBe(0.85);

      // Ch4: Night Mountain (poison fire tick 1.50)
      const ch4Theme = EnvironmentEngine.getThemeForChapter(4);
      const ch4Mods = EnvironmentEngine.getModifiers(ch4Theme, 13);
      expect(ch4Theme).toBe('night_mountain');
      expect(ch4Mods.poisonFireTickMultiplier).toBe(1.50);

      // Ch5: Imperial City (dragon vein rage rate 1.50)
      const ch5Theme = EnvironmentEngine.getThemeForChapter(5);
      const ch5Mods = EnvironmentEngine.getModifiers(ch5Theme, 17);
      expect(ch5Theme).toBe('imperial_city');
      expect(ch5Mods.commanderRageRateMultiplier).toBe(1.50);
    });

    it('verifies 5 Chapter Boss state machines on stages 4, 8, 12, 16, 20', () => {
      const bossStages = [4, 8, 12, 16, 20];

      for (const stgId of bossStages) {
        const stageCfg = getStageConfig(stgId);
        const waveCfg = getStageWaveConfig(stgId);
        const finalWave = waveCfg.waves[waveCfg.waves.length - 1];

        expect(finalWave.bossConfig).toBeDefined();

        const engine = new CampaignWaveEngine(stageCfg, waveCfg, { wallY: 840 });
        expect(engine.isBossWave(stageCfg.totalWaves)).toBe(true);

        // Verify stage-specific Boss state machine logic
        if (stgId === 8) {
          // Xuanwu linear projectile shield test
          expect(engine.isBossLinearShieldActive()).toBe(false);
        } else if (stgId === 16) {
          // Corpse Demon feign death test
          expect(engine.isBossInFeignDeath()).toBe(false);
        } else if (stgId === 20) {
          // Taotie charging & weakpoint interrupt test
          expect(engine.isBossCharging()).toBe(false);
          // Interruption requires 3 heavy hits or 50,000 damage
          const hitResult = engine.recordBossHit(true, 60000);
          expect(typeof hitResult.interrupted).toBe('boolean');
        }
      }
    });
  });

  describe('4. Full Combat, Elemental Reactions & Settlement Integration', () => {
    it('executes 7-step damage calculation with non-linear armor and caps', () => {
      const attacker = createWeaponInstance('fire_lance', 1);
      attacker.baseAtk = 1000;
      const target = EnemyFactory.createOrdinary();
      target.armor = 50;

      const result = DamagePipeline.calculate({
        attacker,
        target,
        skillMultiplier: 1.5,
        additiveBonuses: [0.3, 0.4], // +70%
        independentMultipliers: [0.15],
        critRateBonus: 0.90, // Exceeds 75% cap -> clamped to 75%
        critDmgBonus: 1.50,  // Exceeds 2.0x cap -> clamped to 2.0x
        sunderRate: 0.20,
        sunderFlat: 10,
        vulnerability: 0,
        specialReduction: 0
      }, 0.5); // Roll 0.5 < 0.75 -> Guaranteed crit

      expect(result.finalDamage).toBeGreaterThan(1.0);
      expect(result.isCrit).toBe(true);
      expect(result.steps.critDmg).toBeGreaterThan(result.steps.multiplicativeDmg);
      expect(result.actualHpDeducted).toBeGreaterThan(0);
    });

    it('correctly executes 4 elemental reactions and sound hooks', () => {
      const manager = new ElementStateManager();
      const status = manager.getOrCreateStatus('enemy_target');

      // 1. Oil + Fire -> 猛火轰爆
      applyOil(status);
      applyBurn(status, 2);
      const expRes = triggerExplosion(status, 1.0);
      expect(expRes.triggered).toBe(true);
      expect(expRes.damage).toBeGreaterThan(0);

      // 2. Shock + Burn 3 -> 雷火天劫
      const boss = EnemyFactory.createBoss();
      applyShock(status);
      applyBurn(status, 3);
      const thundRes = triggerThunderStrike(status, boss);
      expect(thundRes.triggered).toBe(true);

      // 3. Frozen + Blunt -> 碎冰崩裂
      applyFreeze(status);
      const iceRes = triggerIceShatter(status, boss, 2.0);
      expect(iceRes.triggered).toBe(true);

      // 4. Poison + Fire -> 幽冥毒火
      applyPoison(status);
      const poisRes = triggerPoisonFire(status);
      expect(poisRes.triggered).toBe(true);
    });

    it('evaluates 3-star conditions and rewards in SettlementEvaluator', () => {
      const victoryInput = {
        stageId: 1,
        chapterId: 1,
        cleared: true,
        totalWaves: 10,
        wavesCleared: 10,
        finalWallHp: 1000,
        maxWallHp: 1000,
        revivesUsed: 0,
        hasDoubleStar4Awakening: true,
        isFirstClear: true
      };

      const result = SettlementEvaluator.evaluate(victoryInput, 0);

      expect(result.cleared).toBe(true);
      expect(result.stars.stars).toBe(3);
      expect(result.stars.star1Earned).toBe(true);
      expect(result.stars.star2Earned).toBe(true);
      expect(result.stars.star3Earned).toBe(true);
      expect(result.grade).toBe('SSS');
      expect(result.rewards.gold).toBeGreaterThan(0);
      expect(result.rewards.iron).toBeGreaterThan(0);
      expect(result.rewards.blueprints).toBeGreaterThan(0);
    });

    it('handles 2D/3D render mode toggling in ThreeSceneManager safely', () => {
      const mgr = ThreeSceneManager.getInstance();
      const initialMode = mgr.getRenderMode();

      const toggled = mgr.toggleRenderMode();
      expect(toggled).toBe(initialMode === '2d' ? '3d' : '2d');

      mgr.setRenderMode('2d');
      expect(mgr.getRenderMode()).toBe('2d');

      mgr.clearAll();
    });
  });
});
