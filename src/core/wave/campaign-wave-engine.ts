/**
 * 《孤城神机营》- Decoupled Campaign Wave Engine
 * Implements GDD V3.0 §8.2, §9.1, §9.2, §16.3, §19 & SCOPE.md (GL-F07):
 * - Ingests StageConfig and StageWaveConfig (data-driven models)
 * - Decoupled orchestration of WaveFSM, WaveSpawner, Boss Combat Runtime AI & EnvironmentEngine
 * - Zero Phaser, Zero DOM, 100% headless, fully Vitest testable
 * - Rich Boss state machines:
 *   * Xuanwu Iron Curtain (linear projectile shield) & broadside artillery barrage
 *   * Khan Wolf Howl minion aura (+armor, +tenacity) & ice arrow freeze / summon
 *   * Corpse Demon wall corrosion, devour minions (anti-heal by Nether Poison Fire), feign death & revive
 *   * Taotie swallow vortex, 6.0s siege bombardment charge (1000 wall damage), weakpoint interrupt (backfire stun + 200% vuln)
 */

import { WaveFSM, WaveState, CityWallState } from './wave-fsm';
import { WaveSpawner, WaveConfig, WaveBatchItem } from './wave-spawner';
import { EnemyEntity } from '../types';
import { EnemyEntityLogic, EnemyFactory, DEFAULT_WALL_Y, DEFAULT_SPAWN_Y } from '../enemy/enemy-entity';
import { StageConfig } from '../../config/campaign.config';
import {
  StageWaveConfig,
  StageWaveDefinition,
  BossWaveConfig,
  BossSkillConfig,
  WaveSpawnItem
} from '../../config/campaign-waves.config';
import { EnvironmentEngine, EnvironmentCombatModifiers } from './environment-engine';

export interface BossSkillRuntimeState {
  config: BossSkillConfig;
  cooldownTimer: number;
  hasTriggeredHpThreshold: boolean;
}

export interface BossCombatRuntimeState {
  config: BossWaveConfig;
  bossEntityId: string;
  currentPhase: number; // 1 or 2
  isEnraged: boolean;
  skills: BossSkillRuntimeState[];

  // Advanced runtime states
  isLinearShieldActive?: boolean;
  linearShieldTimer?: number;

  isChargingSkill?: boolean;
  chargingSkillId?: string;
  chargingSkillConfig?: BossSkillConfig;
  chargingTimer?: number;
  chargeDuration?: number;
  chargeHeavyHitsReceived?: number;
  chargeDamageReceived?: number;

  hasRevivedFromFeignDeath?: boolean;
  isFeignDeathActive?: boolean;
  feignDeathTimer?: number;

  vulnerabilityBonus?: number;
  vulnerabilityTimer?: number;
  stunTimer?: number;
  corrosionTimer?: number;
  isPoisonFireBurning?: boolean;
}

export interface StageCombatSummary {
  stageId: number;
  chapterId: number;
  cleared: boolean;
  wavesCleared: number;
  totalWaves: number;
  finalWallHp: number;
  maxWallHp: number;
  revivesUsed: number;
  totalKilled: number;
  totalDamageDealt: number;
  elapsedTimeSec: number;
  isBossDefeated: boolean;
}

export interface SettlementInputPayload {
  stageId: number;
  cleared: boolean;
  wavesCleared: number;
  totalWaves: number;
  finalWallHp: number;
  maxWallHp: number;
  revivesUsed: number;
  hasDoubleStar4Awakening: boolean;
  isFirstClear: boolean;
}

export interface CampaignWaveEngineOptions {
  extraWallMaxHp?: number;
  waveStipendBonus?: number;
  wallY?: number;
}

export class CampaignWaveEngine {
  private stageConfig: StageConfig;
  private stageWaveConfig: StageWaveConfig;
  private waveFSM: WaveFSM;
  private waveSpawner: WaveSpawner;
  private environmentModifiers: EnvironmentCombatModifiers;

  // Boss Combat Runtime State
  private bossRuntimeState: BossCombatRuntimeState | null = null;

  // Runtime Tracking & Statistics
  private revivesUsed: number = 0;
  private totalKilled: number = 0;
  private totalDamageDealt: number = 0;
  private elapsedTimeSec: number = 0;
  private isBossDefeated: boolean = false;
  private waveStipendBonus: number = 0;
  private wallY: number;

  // Public Callbacks for Presentation & Monitoring Binding
  public onWaveStart?: (waveNumber: number, waveDef: StageWaveDefinition) => void;
  public onEnemySpawn?: (enemy: EnemyEntity) => void;
  public onEnemyDeath?: (enemy: EnemyEntity, dropSilver: number) => void;
  public onWallDamage?: (damage: number, currentHp: number, maxHp: number) => void;
  public onBossSkillCast?: (skillId: string, skillName: string, boss: EnemyEntity) => void;
  public onBossPhaseChange?: (newPhase: number, boss: EnemyEntity) => void;
  public onWaveClear?: (waveNumber: number, isFinalWave: boolean) => void;
  public onStageVictory?: (stageId: number, summary: StageCombatSummary) => void;
  public onStageDefeat?: (stageId: number, waveReached: number) => void;

  // Advanced Boss State Machine Callbacks
  public onBossSkillChargeStart?: (skillId: string, durationSec: number, boss: EnemyEntity) => void;
  public onBossSkillInterrupt?: (boss: EnemyEntity, reason: string) => void;
  public onBossShieldChange?: (isActive: boolean, boss: EnemyEntity) => void;
  public onBossFeignDeath?: (boss: EnemyEntity) => void;
  public onBossRevive?: (boss: EnemyEntity) => void;
  public onBossMinionDevoured?: (minionCount: number, healedHp: number, boss: EnemyEntity) => void;

  constructor(
    stageConfig: StageConfig,
    stageWaveConfig: StageWaveConfig,
    options?: CampaignWaveEngineOptions
  ) {
    this.stageConfig = stageConfig;
    this.stageWaveConfig = stageWaveConfig;
    this.waveStipendBonus = options?.waveStipendBonus ?? 0;
    this.wallY = options?.wallY ?? DEFAULT_WALL_Y;

    // Initialize environment modifiers
    const chapterTheme = EnvironmentEngine.getThemeForChapter(stageConfig.chapterId);
    this.environmentModifiers = EnvironmentEngine.getModifiers(chapterTheme, stageConfig.stageId);

    const baseWallHp = stageConfig.wallBaseHp + (options?.extraWallMaxHp ?? 0);

    // Initialize WaveFSM
    this.waveFSM = new WaveFSM({
      initialWave: 1,
      maxWaves: stageConfig.totalWaves,
      initialWallHp: baseWallHp,
      maxWallHp: baseWallHp,
      chapterId: stageConfig.chapterId
    });

    // Initialize WaveSpawner
    this.waveSpawner = new WaveSpawner();

    this.bindInternalEvents();
  }

  // =========================================================================
  // Internal Event Bindings
  // =========================================================================

  private bindInternalEvents(): void {
    this.waveSpawner.onEnemySpawn = (enemy: EnemyEntity) => {
      // Check if this newly spawned entity is the Boss
      if (enemy.isBoss && this.bossRuntimeState) {
        this.bossRuntimeState.bossEntityId = enemy.id;
      }
      this.onEnemySpawn?.(enemy);
    };

    this.waveSpawner.onEnemyDeath = (enemy: EnemyEntity, dropSilver: number) => {
      this.totalKilled++;
      if (enemy.isBoss) {
        this.isBossDefeated = true;
      }
      this.onEnemyDeath?.(enemy, dropSilver);
    };

    this.waveSpawner.onWallDamage = (damage: number, _enemy?: EnemyEntity) => {
      this.waveFSM.damageWall(damage);
      const wallState = this.waveFSM.getWallState();
      this.onWallDamage?.(damage, wallState.currentHp, wallState.maxHp);
    };

    this.waveFSM.onDefeat = (wave: number) => {
      this.onStageDefeat?.(this.stageConfig.stageId, wave);
    };

    this.waveFSM.onVictory = () => {
      this.onStageVictory?.(this.stageConfig.stageId, this.getSummary());
    };
  }

  // =========================================================================
  // Wave Lifecycle Operations
  // =========================================================================

  /**
   * Starts the current wave (transitions from 'Prep' to 'WaveActive').
   */
  public startWave(): void {
    const currentWave = this.waveFSM.getCurrentWave();
    const waveDef = this.getCurrentWaveDefinition();

    if (!waveDef) {
      throw new Error(`[CampaignWaveEngine] Missing wave definition for wave ${currentWave} in stage ${this.stageConfig.stageId}.`);
    }

    // 1. Transition FSM to WaveActive
    if (this.waveFSM.getState() === 'Prep') {
      this.waveFSM.startWave();
    }

    // 2. Setup Boss Runtime State if this is a Boss wave
    if (waveDef.isBossWave && waveDef.bossConfig) {
      this.bossRuntimeState = {
        config: waveDef.bossConfig,
        bossEntityId: '',
        currentPhase: 1,
        isEnraged: false,
        skills: waveDef.bossConfig.skills.map((skill: BossSkillConfig) => ({
          config: skill,
          cooldownTimer: skill.initialDelaySec ?? skill.intervalSec ?? 10.0,
          hasTriggeredHpThreshold: false
        })),
        isLinearShieldActive: false,
        linearShieldTimer: 0,
        isChargingSkill: false,
        chargingTimer: 0,
        chargeDuration: 0,
        chargeHeavyHitsReceived: 0,
        chargeDamageReceived: 0,
        hasRevivedFromFeignDeath: false,
        isFeignDeathActive: false,
        feignDeathTimer: 0,
        vulnerabilityBonus: 0,
        vulnerabilityTimer: 0,
        stunTimer: 0,
        corrosionTimer: 0,
        isPoisonFireBurning: false
      };
    } else {
      this.bossRuntimeState = null;
    }

    // 3. Map WaveSpawnItem[] into WaveSpawner's WaveConfig format
    const convertedBatches: WaveBatchItem[] = waveDef.spawns.map((spawn: WaveSpawnItem) => ({
      timeOffset: spawn.delayMs / 1000.0,
      enemyId: spawn.enemyType,
      count: spawn.count,
      spawnInterval: spawn.intervalMs / 1000.0,
      xDistribution: spawn.xDistribution,
      laneIndex: spawn.laneIndex,
      hpMultiplier: spawn.hpMultiplier
    }));

    const spawnerConfig: WaveConfig = {
      chapterId: this.stageConfig.chapterId,
      waveIndex: currentWave,
      duration: waveDef.durationSec,
      baseSalary: waveDef.stipend + this.waveStipendBonus,
      batches: convertedBatches
    };

    // 4. Start Spawner
    this.waveSpawner.startWave(spawnerConfig);

    // 5. Emit onWaveStart
    this.onWaveStart?.(currentWave, waveDef);
  }

  /**
   * Main game tick: advances spawner, updates enemies, ticks Boss AI, and checks wave completion.
   * @param dt Elapsed delta time in seconds
   * @param frontlineStopYByLane Optional lane-specific stopping coordinates for Row 0 fortress interception
   */
  public update(dt: number, frontlineStopYByLane?: number[]): void {
    if (this.waveFSM.getState() !== 'WaveActive') {
      return;
    }

    this.elapsedTimeSec += dt;

    // 1. Advance Spawner
    this.waveSpawner.update(dt, this.wallY, frontlineStopYByLane);

    // 2. Process Boss Combat AI and Skill Timers
    if (this.bossRuntimeState && this.bossRuntimeState.bossEntityId) {
      this.updateBossCombatAI(dt);
    }

    // 3. Check for Wave Completion
    if (this.waveSpawner.isWaveCompleted()) {
      const currentWave = this.waveFSM.getCurrentWave();
      const isFinalWave = currentWave >= this.stageConfig.totalWaves;

      this.waveFSM.onAllEnemiesDefeated();
      this.onWaveClear?.(currentWave, isFinalWave);
    }
  }

  /**
   * Internal Boss combat runtime evaluation: ticks skill cooldowns, handles charging,
   * feign death revive, shield timers, stun, and evaluates HP triggers.
   */
  private updateBossCombatAI(dt: number): void {
    if (!this.bossRuntimeState) {
      return;
    }

    const bossEntity = this.waveSpawner
      .getActiveEnemies()
      .find((e: EnemyEntity) => e.id === this.bossRuntimeState!.bossEntityId);

    if (!bossEntity || bossEntity.currentHp <= 0) {
      return;
    }

    // A. Handle Feign Death (Corpse Demon revive state)
    if (this.bossRuntimeState.isFeignDeathActive) {
      this.bossRuntimeState.feignDeathTimer = (this.bossRuntimeState.feignDeathTimer || 0) - dt;
      if (this.bossRuntimeState.feignDeathTimer <= 0) {
        this.bossRuntimeState.isFeignDeathActive = false;
        this.bossRuntimeState.hasRevivedFromFeignDeath = true;

        const reviveHpPercent = 35;
        bossEntity.currentHp = Math.round(bossEntity.maxHp * (reviveHpPercent / 100.0));
        bossEntity.isParalyzed = false;

        // Spawn revive reinforcement minions (20 war dogs)
        this.spawnDynamicMinions('war_dog', 20);

        this.onBossRevive?.(bossEntity);
        this.onBossSkillCast?.('feign_death_revive', '蜕壳涅槃·百蛊复生', bossEntity);
      }
      return; // Cannot act while in feign death
    }

    // B. Handle Stun / Backfire paralysis
    if ((this.bossRuntimeState.stunTimer || 0) > 0) {
      this.bossRuntimeState.stunTimer = Math.max(0, (this.bossRuntimeState.stunTimer || 0) - dt);
      bossEntity.isParalyzed = this.bossRuntimeState.stunTimer > 0;
      if (this.bossRuntimeState.stunTimer <= 0) {
        bossEntity.isParalyzed = false;
      }
    }

    // C. Handle Vulnerability window countdown
    if ((this.bossRuntimeState.vulnerabilityTimer || 0) > 0) {
      this.bossRuntimeState.vulnerabilityTimer = Math.max(0, (this.bossRuntimeState.vulnerabilityTimer || 0) - dt);
      if (this.bossRuntimeState.vulnerabilityTimer <= 0) {
        this.bossRuntimeState.vulnerabilityBonus = 0;
      }
    }

    // D. Handle Linear Projectile Shield (Xuanwu Iron Curtain / Taotie Swallow Vortex)
    if (this.bossRuntimeState.isLinearShieldActive) {
      this.bossRuntimeState.linearShieldTimer = (this.bossRuntimeState.linearShieldTimer || 0) - dt;
      if ((this.bossRuntimeState.linearShieldTimer || 0) <= 0) {
        this.bossRuntimeState.isLinearShieldActive = false;
        this.onBossShieldChange?.(false, bossEntity);
      }
    }

    // E. Handle Charging Skill (Taotie Siege Bombardment)
    if (this.bossRuntimeState.isChargingSkill) {
      // If stunned during charging, cancel charging
      if ((this.bossRuntimeState.stunTimer || 0) > 0) {
        this.bossRuntimeState.isChargingSkill = false;
      } else {
        this.bossRuntimeState.chargingTimer = (this.bossRuntimeState.chargingTimer || 0) + dt;
        const totalDuration = this.bossRuntimeState.chargeDuration || 6.0;

        if ((this.bossRuntimeState.chargingTimer || 0) >= totalDuration) {
          // Charge completed without interruption! Unleash fatal wall damage!
          this.bossRuntimeState.isChargingSkill = false;
          const fatalDmg = this.bossRuntimeState.chargingSkillConfig?.effects.chargeFatalWallDamage ?? 1000;
          this.waveFSM.damageWall(fatalDmg);
          const wallState = this.waveFSM.getWallState();
          this.onWallDamage?.(fatalDmg, wallState.currentHp, wallState.maxHp);
          this.onBossSkillCast?.(
            this.bossRuntimeState.chargingSkillId || 'siege_bombardment',
            '神机天劫轰城炮·轰击',
            bossEntity
          );
        }
        return; // While charging, boss does not evaluate other skills
      }
    }

    // If currently stunned, boss cannot evaluate other skills
    if ((this.bossRuntimeState.stunTimer || 0) > 0) {
      return;
    }

    const hpPercent = (bossEntity.currentHp / bossEntity.maxHp) * 100.0;

    // F. Phase 2 Enrage Check (<= 50% HP)
    if (!this.bossRuntimeState.isEnraged && hpPercent <= 50.0) {
      this.bossRuntimeState.isEnraged = true;
      this.bossRuntimeState.currentPhase = 2;
      this.onBossPhaseChange?.(2, bossEntity);
    }

    // G. Evaluate Skills
    for (const skillState of this.bossRuntimeState.skills) {
      const skill = skillState.config;

      // Phase filter
      if (skill.phase > this.bossRuntimeState.currentPhase) {
        continue;
      }

      // Type 1: Charging skill (Taotie)
      if (skill.triggerType === 'charging') {
        skillState.cooldownTimer -= dt;
        if (skillState.cooldownTimer <= 0) {
          skillState.cooldownTimer = skill.intervalSec ?? 20.0;
          this.startBossCharging(skill, bossEntity);
        }
      }

      // Type 2: Interval cooldown skills (Earth Slam, Iron Curtain, Howl, Miasma, Devour)
      else if (skill.triggerType === 'interval') {
        skillState.cooldownTimer -= dt;
        if (skillState.cooldownTimer <= 0) {
          skillState.cooldownTimer = skill.intervalSec ?? 10.0;
          this.executeBossSkill(skill, bossEntity);
        }
      }

      // Type 3: HP threshold skills (Enrage, Summons, Ice Arrows, Feign Death)
      else if (skill.triggerType === 'hp_percent' && !skillState.hasTriggeredHpThreshold) {
        // Hp 0 threshold is reserved for lethal damage feign death trigger
        if (skill.triggerHpPercent !== undefined && skill.triggerHpPercent > 0 && hpPercent <= skill.triggerHpPercent) {
          skillState.hasTriggeredHpThreshold = true;
          this.executeBossSkill(skill, bossEntity);
        }
      }
    }
  }

  /**
   * Puts Boss into charging mode for fatal siege bombardment.
   */
  private startBossCharging(skill: BossSkillConfig, bossEntity: EnemyEntity): void {
    if (!this.bossRuntimeState) return;

    const chargeDuration = skill.effects.chargeUpDurationSec ?? 6.0;
    this.bossRuntimeState.isChargingSkill = true;
    this.bossRuntimeState.chargingSkillId = skill.id;
    this.bossRuntimeState.chargingSkillConfig = skill;
    this.bossRuntimeState.chargingTimer = 0;
    this.bossRuntimeState.chargeDuration = chargeDuration;
    this.bossRuntimeState.chargeHeavyHitsReceived = 0;
    this.bossRuntimeState.chargeDamageReceived = 0;

    this.onBossSkillChargeStart?.(skill.id, chargeDuration, bossEntity);
    this.onBossSkillCast?.(skill.id, `${skill.name}·蓄力`, bossEntity);
  }

  /**
   * Records a hit against the Boss during charging and evaluates weakpoint interrupts.
   */
  public recordBossHit(isHeavy: boolean, damage: number): { interrupted: boolean } {
    if (!this.bossRuntimeState || !this.bossRuntimeState.isChargingSkill) {
      return { interrupted: false };
    }

    if (isHeavy) {
      this.bossRuntimeState.chargeHeavyHitsReceived =
        (this.bossRuntimeState.chargeHeavyHitsReceived || 0) + 1;
    }
    this.bossRuntimeState.chargeDamageReceived =
      (this.bossRuntimeState.chargeDamageReceived || 0) + damage;

    const skillConfig = this.bossRuntimeState.chargingSkillConfig;
    const heavyThreshold = skillConfig?.effects.weakpointHeavyHitsThreshold ?? 3;
    const damageThreshold = skillConfig?.effects.weakpointDamageThreshold ?? 50000;

    if (
      (this.bossRuntimeState.chargeHeavyHitsReceived || 0) >= heavyThreshold ||
      (this.bossRuntimeState.chargeDamageReceived || 0) >= damageThreshold
    ) {
      // Weakpoint interrupt triggered! Backfire stun & vulnerability!
      this.bossRuntimeState.isChargingSkill = false;
      const stunSec = skillConfig?.effects.backfireStunDurationSec ?? 5.0;
      const vulBonus = skillConfig?.effects.backfireVulnerabilityBonus ?? 2.0;

      this.bossRuntimeState.stunTimer = stunSec;
      this.bossRuntimeState.vulnerabilityBonus = vulBonus;
      this.bossRuntimeState.vulnerabilityTimer = 6.0;

      const bossEntity = this.waveSpawner
        .getActiveEnemies()
        .find((e: EnemyEntity) => e.id === this.bossRuntimeState!.bossEntityId);

      if (bossEntity) {
        bossEntity.isParalyzed = true;
        this.onBossSkillInterrupt?.(bossEntity, 'backfire');
      }

      return { interrupted: true };
    }

    return { interrupted: false };
  }

  /**
   * Executes a Boss skill action and applies runtime mechanical effects.
   */
  private executeBossSkill(skill: BossSkillConfig, bossEntity: EnemyEntity): void {
    // 1. Apply Speed Multiplier effect
    if (skill.effects.speedMultiplier) {
      const baseSpeed = this.bossRuntimeState?.config.moveSpeed ?? 0.7;
      const targetSpeed = baseSpeed * skill.effects.speedMultiplier;
      if (bossEntity.moveSpeed < targetSpeed) {
        bossEntity.moveSpeed = targetSpeed;
      }
    }

    // 2. Apply Wall Damage Multiplier effect
    if (skill.effects.wallDamageMultiplier) {
      const baseWallDamage = this.bossRuntimeState?.config.wallDamage ?? 50;
      const targetWallDamage = Math.round(baseWallDamage * skill.effects.wallDamageMultiplier);
      if ((bossEntity.wallDamage || 0) < targetWallDamage) {
        bossEntity.wallDamage = targetWallDamage;
      }
    }

    // 3. Apply Summon effect
    if (skill.effects.summonEnemyId && skill.effects.summonCount) {
      this.spawnDynamicMinions(skill.effects.summonEnemyId, skill.effects.summonCount);
    }

    // 4. Linear Projectile Shield (Xuanwu Iron Curtain / Taotie Swallow Vortex)
    if (skill.effects.shieldLinearProjectilesDurationSec) {
      if (this.bossRuntimeState) {
        this.bossRuntimeState.isLinearShieldActive = true;
        this.bossRuntimeState.linearShieldTimer = skill.effects.shieldLinearProjectilesDurationSec;
        this.onBossShieldChange?.(true, bossEntity);
      }
    }

    // 5. Broadside Barrage Wall Damage (Xuanwu)
    if (skill.effects.broadsideBarrageWallDamage) {
      this.waveFSM.damageWall(skill.effects.broadsideBarrageWallDamage);
      const wallState = this.waveFSM.getWallState();
      this.onWallDamage?.(skill.effects.broadsideBarrageWallDamage, wallState.currentHp, wallState.maxHp);
    }

    // 6. Minion Aura (Khan Wolf Howl)
    if (skill.effects.auraArmorBonus !== undefined || skill.effects.auraTenacitySec !== undefined) {
      const activeEnemies = this.waveSpawner.getActiveEnemies();
      for (const enemy of activeEnemies) {
        if (!enemy.isBoss && enemy.currentHp > 0) {
          if (skill.effects.auraArmorBonus) {
            enemy.armor += skill.effects.auraArmorBonus;
          }
          if (skill.effects.auraTenacitySec) {
            enemy.isTenacious = true;
            enemy.tenacityTimer = skill.effects.auraTenacitySec;
          }
        }
      }
    }

    // 7. Wall Corrosion Miasma (Corpse Demon)
    if (skill.effects.wallCorrosionDamagePerSec) {
      this.waveFSM.damageWall(skill.effects.wallCorrosionDamagePerSec);
      const wallState = this.waveFSM.getWallState();
      this.onWallDamage?.(skill.effects.wallCorrosionDamagePerSec, wallState.currentHp, wallState.maxHp);
    }

    // 8. Devour Minions (Corpse Demon)
    if (skill.effects.devourMinionsHealPercent) {
      if (this.bossRuntimeState?.isPoisonFireBurning) {
        // Countered by Nether Poison Fire: Devour fails, healing blocked, boss suffers 4% maxHp backlash!
        const backlashDamage = Math.round(bossEntity.maxHp * 0.04);
        bossEntity.currentHp = Math.max(1, bossEntity.currentHp - backlashDamage);
        this.onBossSkillInterrupt?.(bossEntity, 'poison_fire_backlash');
      } else {
        // Valid devour: devour active minions and restore 10% maxHp per minion
        const minions = this.waveSpawner
          .getActiveEnemies()
          .filter((e: EnemyEntity) => !e.isBoss && e.currentHp > 0);

        if (minions.length > 0) {
          const healPerMinion = Math.round(bossEntity.maxHp * (skill.effects.devourMinionsHealPercent / 100.0));
          const totalHeal = healPerMinion * minions.length;
          bossEntity.currentHp = Math.min(bossEntity.maxHp, bossEntity.currentHp + totalHeal);

          // Despawn devoured minions
          for (const minion of minions) {
            minion.currentHp = 0;
            this.waveSpawner.recordKill(minion.id);
          }

          this.onBossMinionDevoured?.(minions.length, totalHeal, bossEntity);
        }
      }
    }

    // Emit callback to presentation
    this.onBossSkillCast?.(skill.id, skill.name, bossEntity);
  }

  /**
   * Dynamically spawns minion reinforcements during Boss combat.
   */
  public spawnDynamicMinions(enemyType: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const laneIndex = i % 5;
      const minion = EnemyFactory.create(enemyType, {
        laneIndex,
        y: DEFAULT_SPAWN_Y + Math.floor(i / 5) * 40
      });
      this.waveSpawner.injectEnemy(minion);
      this.onEnemySpawn?.(minion);
    }
  }

  // =========================================================================
  // Post-Battle & FSM Transitions
  // =========================================================================

  /**
   * Opens the decree reward selection panel (transitions from WaveClear to DecreeReward).
   */
  public openDecreeReward(): void {
    this.waveFSM.openDecreeReward();
  }

  /**
   * Claims a chosen decree card (transitions from DecreeReward to Income).
   */
  public claimDecree(cardId?: string): void {
    this.waveFSM.claimDecree(cardId);
  }

  /**
   * Collects wave stipend and advances to next wave or stage victory.
   * @param bonusInterest Optional interest silver to add
   * @returns Total silver collected
   */
  public collectIncome(bonusInterest: number = 0): number {
    const waveDef = this.getCurrentWaveDefinition();
    const stipend = (waveDef?.stipend ?? 35) + this.waveStipendBonus;
    const totalCollected = stipend + bonusInterest;

    this.waveFSM.finishIncome();
    return totalCollected;
  }

  /**
   * Triggers a revive on defeat (e.g. from Rewarded Video Ad).
   * Restores city gate health to maxGateHp * restoreHpPercent and increments revivesUsed.
   * @param restoreHpPercent Ratio of max wall HP to restore (default 0.5)
   * @returns Current wall HP after revival
   */
  public revive(restoreHpPercent: number = 0.5): number {
    this.revivesUsed++;
    const restoreHp = Math.round(this.waveFSM.getMaxWallHp() * restoreHpPercent);
    this.waveFSM.revive(restoreHp);
    return this.waveFSM.getWallHp();
  }

  /**
   * Applies damage to a specific enemy entity (called by weapon/combat systems).
   */
  public applyDamageToEnemy(
    enemyId: string,
    rawDamage: number,
    isFrontalPhysical: boolean = false,
    options?: { isHeavy?: boolean; isLinearProjectile?: boolean }
  ): { actualDeducted: number; isDead: boolean } {
    const enemy = this.waveSpawner.getActiveEnemies().find((e: EnemyEntity) => e.id === enemyId);
    if (!enemy) {
      return { actualDeducted: 0, isDead: true };
    }

    // 1. Check Feign Death Invulnerability
    if (enemy.isBoss && this.bossRuntimeState?.isFeignDeathActive) {
      return { actualDeducted: 0, isDead: false };
    }

    // 2. Check Xuanwu Iron Curtain / Taotie Swallow Vortex Linear Projectile Block
    if (
      enemy.isBoss &&
      this.bossRuntimeState?.isLinearShieldActive &&
      options?.isLinearProjectile
    ) {
      return { actualDeducted: 0, isDead: false };
    }

    // 3. Check Boss Damage Vulnerability Bonus (e.g. +200% on Backfire Stun)
    let effectiveDamage = rawDamage;
    if (enemy.isBoss && (this.bossRuntimeState?.vulnerabilityBonus || 0) > 0) {
      effectiveDamage = Math.round(rawDamage * (1.0 + (this.bossRuntimeState!.vulnerabilityBonus || 0)));
    }

    // 4. Record hit for charging Boss weakpoint interrupt
    if (enemy.isBoss && this.bossRuntimeState?.isChargingSkill) {
      this.recordBossHit(options?.isHeavy ?? false, effectiveDamage);
    }

    // 5. Check Corpse Demon Feign Death & Revive threshold on lethal damage
    if (
      enemy.isBoss &&
      this.bossRuntimeState &&
      !this.bossRuntimeState.hasRevivedFromFeignDeath
    ) {
      const hasReviveSkill = this.bossRuntimeState.config.skills.some(
        (s: BossSkillConfig) => s.id === 'feign_death_revive'
      );

      if (hasReviveSkill && enemy.currentHp <= effectiveDamage) {
        // Trigger Feign Death! Clamp HP to 1 and enter invulnerable cocoon for 3.0s
        const deducted = enemy.currentHp - 1;
        enemy.currentHp = 1;
        enemy.isParalyzed = true;
        this.bossRuntimeState.isFeignDeathActive = true;
        this.bossRuntimeState.feignDeathTimer = 3.0;

        this.onBossFeignDeath?.(enemy);
        this.totalDamageDealt += deducted;

        return {
          actualDeducted: deducted,
          isDead: false
        };
      }
    }

    // 6. Normal damage application
    const result = EnemyEntityLogic.applyDamage(enemy, effectiveDamage, isFrontalPhysical);
    this.totalDamageDealt += result.actualDeducted;

    if (result.isDead) {
      this.waveSpawner.recordKill(enemyId);
    }

    return {
      actualDeducted: result.actualDeducted,
      isDead: result.isDead
    };
  }

  // =========================================================================
  // State Queries & Boss Helper APIs
  // =========================================================================

  public isBossLinearShieldActive(): boolean {
    return this.bossRuntimeState?.isLinearShieldActive ?? false;
  }

  public isBossCharging(): boolean {
    return this.bossRuntimeState?.isChargingSkill ?? false;
  }

  public getBossChargeProgress(): number {
    if (!this.bossRuntimeState || !this.bossRuntimeState.isChargingSkill) {
      return 0;
    }
    const current = this.bossRuntimeState.chargingTimer || 0;
    const max = this.bossRuntimeState.chargeDuration || 6.0;
    return Math.min(1.0, current / max);
  }

  public isBossInFeignDeath(): boolean {
    return this.bossRuntimeState?.isFeignDeathActive ?? false;
  }

  public getBossVulnerabilityBonus(): number {
    return this.bossRuntimeState?.vulnerabilityBonus ?? 0;
  }

  public isBossStunned(): boolean {
    return (this.bossRuntimeState?.stunTimer || 0) > 0;
  }

  public setBossPoisonFireBurning(isBurning: boolean): void {
    if (this.bossRuntimeState) {
      this.bossRuntimeState.isPoisonFireBurning = isBurning;
    }
  }

  public isBossPoisonFireBurning(): boolean {
    return this.bossRuntimeState?.isPoisonFireBurning ?? false;
  }

  public getEnvironmentModifiers(): EnvironmentCombatModifiers {
    return this.environmentModifiers;
  }

  public getCurrentWaveDefinition(): StageWaveDefinition | undefined {
    const currentWave = this.waveFSM.getCurrentWave();
    return this.stageWaveConfig.waves.find((w: StageWaveDefinition) => w.waveNumber === currentWave);
  }

  /**
   * Checks whether the current or specified wave contains a Boss encounter.
   */
  public isBossWave(waveNumber?: number): boolean {
    const targetWave = waveNumber ?? this.waveFSM.getCurrentWave();
    const waveDef = this.stageWaveConfig.waves.find((w: StageWaveDefinition) => w.waveNumber === targetWave);
    return Boolean(waveDef?.bossConfig);
  }

  /**
   * Checks whether the current or specified wave is an elite wave.
   */
  public isEliteWave(waveNumber?: number): boolean {
    const targetWave = waveNumber ?? this.waveFSM.getCurrentWave();
    const waveDef = this.stageWaveConfig.waves.find((w: StageWaveDefinition) => w.waveNumber === targetWave);
    return Boolean(waveDef?.isEliteWave);
  }

  public getState(): WaveState {
    return this.waveFSM.getState();
  }

  public getCurrentWave(): number {
    return this.waveFSM.getCurrentWave();
  }

  public getTotalWaves(): number {
    return this.stageConfig.totalWaves;
  }

  public getWallHp(): number {
    return this.waveFSM.getWallHp();
  }

  public getWaveFSM(): WaveFSM {
    return this.waveFSM;
  }

  public getWaveSpawner(): WaveSpawner {
    return this.waveSpawner;
  }

  public getMaxWallHp(): number {
    return this.waveFSM.getMaxWallHp();
  }

  public getWallState(): CityWallState {
    return this.waveFSM.getWallState();
  }

  public getActiveEnemies(): EnemyEntity[] {
    return this.waveSpawner.getActiveEnemies();
  }

  public getActiveEnemyCount(): number {
    return this.waveSpawner.getActiveEnemyCount();
  }

  public getBossRuntimeState(): BossCombatRuntimeState | null {
    return this.bossRuntimeState;
  }

  public getStageConfig(): StageConfig {
    return this.stageConfig;
  }

  public getStageWaveConfig(): StageWaveConfig {
    return this.stageWaveConfig;
  }

  /**
   * Generates the immutable StageCombatSummary.
   */
  public getSummary(): StageCombatSummary {
    const currentWave = this.waveFSM.getCurrentWave();
    const isVictory = this.waveFSM.getState() === 'Victory';
    const wavesCleared = isVictory ? this.stageConfig.totalWaves : Math.max(0, currentWave - 1);

    return {
      stageId: this.stageConfig.stageId,
      chapterId: this.stageConfig.chapterId,
      cleared: isVictory,
      wavesCleared,
      totalWaves: this.stageConfig.totalWaves,
      finalWallHp: this.waveFSM.getWallHp(),
      maxWallHp: this.waveFSM.getMaxWallHp(),
      revivesUsed: this.revivesUsed,
      totalKilled: this.totalKilled,
      totalDamageDealt: this.totalDamageDealt,
      elapsedTimeSec: Math.round(this.elapsedTimeSec * 10) / 10,
      isBossDefeated: this.isBossDefeated
    };
  }

  /**
   * Generates a SettlementInput payload ready for Star & Tactical Settlement Evaluator.
   */
  public createSettlementInput(options?: {
    hasDoubleStar4Awakening?: boolean;
    isFirstClear?: boolean;
  }): SettlementInputPayload {
    const summary = this.getSummary();
    return {
      stageId: summary.stageId,
      cleared: summary.cleared,
      wavesCleared: summary.wavesCleared,
      totalWaves: summary.totalWaves,
      finalWallHp: summary.finalWallHp,
      maxWallHp: summary.maxWallHp,
      revivesUsed: summary.revivesUsed,
      hasDoubleStar4Awakening: options?.hasDoubleStar4Awakening ?? false,
      isFirstClear: options?.isFirstClear ?? false
    };
  }

  /**
   * Cleanly resets all runtime state for a new stage or restart.
   */
  public reset(newStageConfig?: StageConfig, newStageWaveConfig?: StageWaveConfig): void {
    if (newStageConfig) {
      this.stageConfig = newStageConfig;
      const chapterTheme = EnvironmentEngine.getThemeForChapter(this.stageConfig.chapterId);
      this.environmentModifiers = EnvironmentEngine.getModifiers(chapterTheme, this.stageConfig.stageId);
    }
    if (newStageWaveConfig) {
      this.stageWaveConfig = newStageWaveConfig;
    }

    this.bossRuntimeState = null;
    this.revivesUsed = 0;
    this.totalKilled = 0;
    this.totalDamageDealt = 0;
    this.elapsedTimeSec = 0;
    this.isBossDefeated = false;

    this.waveSpawner.reset();
    this.waveFSM.reset({
      initialWave: 1,
      maxWaves: this.stageConfig.totalWaves,
      initialWallHp: this.stageConfig.wallBaseHp,
      maxWallHp: this.stageConfig.wallBaseHp,
      chapterId: this.stageConfig.chapterId
    });
  }
}
