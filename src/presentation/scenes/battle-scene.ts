/**
 * 《孤城神机营》- Battle Scene & Game Loop
 * Viewport: 750x1334 Vertical Portrait
 * 
 * Full Headless Core Integration:
 * - GridModel, SmartSwapController, StarUpgradeStateMachine, WeaponManager
 * - DamagePipeline, SpatialTargetingSystem, Projectiles
 * - WaveFSM, WaveSpawner, EconomyEngine, ShopManager, TacticsDeck, AffixMountEngine
 * - Commander (Wang Shouren), FTUEManager
 * - TouchController with +80px touch offset & primary pointer lock
 */

import Phaser from 'phaser';
import {
  GridPosition,
  WeaponInstance,
  EnemyEntity,
  ProjectileState
} from '../../core/types';
import { GridModel } from '../../core/grid/grid-model';
import { StarUpgradeStateMachine } from '../../core/grid/star-upgrade';
import { SmartSwapController } from '../../core/grid/smart-swap';
import { WeaponManager } from '../../core/weapon/weapon-manager';
import { createWeaponInstance } from '../../core/weapon/weapon-instance';
import { DamagePipeline } from '../../core/combat/damage-pipeline';
import { SpatialTargetingSystem } from '../../core/combat/targeting';
import { WaveFSM, WaveState } from '../../core/wave/wave-fsm';
import { WaveSpawner, WaveConfig } from '../../core/wave/wave-spawner';
import { Commander } from '../../core/commander/commander';
import { UltimateCastResult } from '../../core/types';
import { PlayerWallet, EconomyEngine } from '../../core/economy/economy';
import { ShopManager } from '../../core/shop/shop-manager';
import { TacticsDeck } from '../../core/tactics/tactics-deck';
import { AffixMountEngine, AffixCalculationContext } from '../../core/tactics/affix-mount';
import { FTUEManager, FTUEStep } from '../../core/ftue/ftue-manager';
import { FrontlineDefenseManager, FrontlineResonanceBonus } from '../../core/defense/frontline-manager';
import { CombatStatsTracker } from '../../core/combat/combat-stats-tracker';
import { SpatialSynergyEngine, SpatialSynergyBonus, SpatialSynergyLink } from '../../core/bond/spatial-synergy';

import {
  TouchController,
  TouchCoordinateMapper,
  GRID_CONFIG
} from '../touch/touch-controller';
import { GridRenderer } from '../renderers/grid-renderer';
import { UnitSprite } from '../renderers/unit-sprite';
import { EnemySprite } from '../renderers/enemy-sprite';
import { ProjectileViewManager } from '../renderers/projectile-view';
import { FloatingTextPool } from '../renderers/fly-text';
import { DropFlightManager } from '../renderers/drop-flight-vfx';
import { WeaponInfoPopup } from '../ui/weapon-info-popup';
import { WEAPON_CONFIGS } from '../../config/weapons.config';
import { ElementalVfxManager } from '../renderers/elemental-vfx';
import { CombatParticleManager } from '../renderers/combat-particle-manager';
import { SoundManager } from '../audio/sound-manager';
import { ThreeSceneManager } from '../three/three-scene-manager';
import { BattlefieldEnvironment } from '../renderers/battlefield-environment';
import { UltimateAimIndicator } from '../renderers/ultimate-aim-indicator';
import { StageConfig, getStageConfig } from '../../config/campaign.config';
import { StageWaveConfig, getStageWaveConfig } from '../../config/campaign-waves.config';
import { CampaignWaveEngine, StageCombatSummary } from '../../core/wave/campaign-wave-engine';
import { SettlementEvaluator } from '../../core/campaign/settlement-evaluator';
import { SettlementModal } from './settlement-modal';
import { RevivalModal } from '../ui/revival-modal';
import { ProfileStorage } from '../../core/meta/profile-storage';
import { TechTreeManager } from '../../core/meta/tech-tree-manager';
import { PlayerProfile, CombatMetaSnapshot } from '../../core/meta/types';
import { PlatformBridge } from '../../bridge/platform';
import { ElementStateManager, applyBurn, applyOil, applyShock, applyFreeze, applyPoison } from '../../core/reaction/element-state';
import { triggerExplosion, triggerThunderStrike, triggerIceShatter, triggerPoisonFire, ReactionValve } from '../../core/reaction/reaction-valve';
import { EndlessWaveGenerator } from '../../core/endless/endless-wave-generator';
import { EndlessManager, EndlessSessionStats } from '../../core/endless/endless-manager';
import { ENEMY_AFFIX_REGISTRY } from '../../core/endless/types';
import { BossDropEngine } from '../../core/forge/boss-drop-engine';
import { UI_COLORS } from '../ui/ui-theme';
import { TacticalThreatAnalyzer, TacticalThreatReport, TacticalPlayerContext, TacticalWaveContext, EnemySpawnInfo } from '../../core/wave/tactical-radar';
import { TacticCardConfig } from '../../config/tactics.config';

export interface BattlefieldStatus {
  battleMode: 'campaign' | 'endless';
  stageId: number;
  stageName: string;
  chapterId: number;
  currentWave: number;
  totalWaves: number;
  wallHp: number;
  wallMaxHp: number;
  silver: number;
  totalKills: number;
  gameSpeed: number;
  renderMode: '2d' | '3d';
  isMuted: boolean;
  pickedTactics: Array<{ config: TacticCardConfig; count: number }>;
}

export class BattleScene extends Phaser.Scene {
  // Campaign & Meta State
  public battleMode: 'campaign' | 'endless' = 'campaign';
  public stageId: number = 1;
  public stageConfig!: StageConfig;
  public stageWaveConfig!: StageWaveConfig;
  public campaignWaveEngine!: CampaignWaveEngine;
  public profile!: PlayerProfile;
  public metaSnapshot!: CombatMetaSnapshot;
  public settlementModal!: SettlementModal;
  public revivalModal!: RevivalModal;

  private hasRevivedThisBattle: boolean = false;
  private isBattlePaused: boolean = false;
  private lastRecordedVideoPath: string | null = null;
  private endlessKills = { total: 0, elite: 0, boss: 0 };
  private endlessStartTime: number = 0;

  public get totalWaves(): number {
    if (this.battleMode === 'endless') return 999;
    return this.stageConfig?.totalWaves ?? 10;
  }

  // Headless Core Modules
  public gridModel!: GridModel;
  public weaponManager!: WeaponManager;
  public waveFSM!: WaveFSM;
  public waveSpawner!: WaveSpawner;
  public commander!: Commander;
  public wallet!: PlayerWallet;
  public shopManager!: ShopManager;
  public tacticsDeck!: TacticsDeck;
  public affixManager!: AffixMountEngine;
  public get affixEngine(): AffixMountEngine {
    return this.affixManager;
  }
  public ftueManager!: FTUEManager;

  // Presentation & Renderers
  public battlefieldEnv?: BattlefieldEnvironment;
  public gridRenderer!: GridRenderer;
  public unitSprites: Map<string, UnitSprite> = new Map();
  public projectileManager!: ProjectileViewManager;
  public floatingTextPool!: FloatingTextPool;
  public dropFlightManager!: DropFlightManager;
  public combatParticleManager!: CombatParticleManager;
  public rangeGraphics!: Phaser.GameObjects.Graphics;
  public barrierVisual?: Phaser.GameObjects.Container;

  // Camera Shake Throttle Gate (120ms)
  private lastCameraShakeTime: number = 0;
  private readonly CAMERA_SHAKE_MIN_INTERVAL: number = 120;

  // Enemy Visuals & Elemental Reaction Managers
  public enemySprites: Map<string, EnemySprite> = new Map();
  public elementalVfx!: ElementalVfxManager;
  public elementStateManager!: ElementStateManager;

  public get enemyContainers(): Map<string, {
    container: Phaser.GameObjects.Container;
    hpBar: Phaser.GameObjects.Graphics;
    entity: EnemyEntity;
  }> {
    const map = new Map<string, { container: Phaser.GameObjects.Container; hpBar: Phaser.GameObjects.Graphics; entity: EnemyEntity }>();
    for (const [id, sprite] of this.enemySprites.entries()) {
      map.set(id, { container: sprite, hpBar: sprite.hpBarGraphics, entity: sprite.enemy });
    }
    return map;
  }

  // Touch Controller & Interaction
  public combatStatsTracker: CombatStatsTracker = new CombatStatsTracker();
  public touchController!: TouchController;
  private draggedSprite: UnitSprite | null = null;
  private weaponAttackTimers: Map<string, number> = new Map();
  public weaponInfoPopup!: WeaponInfoPopup;

  // Touch Long-Press vs Tap Distinction
  private pendingPointerDown: {
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
    weapon: WeaponInstance;
    sourceType: 'grid' | 'bench';
    sourceGrid?: any;
    sourceBench?: number;
    timer?: any;
  } | null = null;
  private static readonly LONG_PRESS_THRESHOLD_MS: number = 220; // 220ms threshold for drag
  private static readonly DRAG_SLOP_PX: number = 10; // 10px slop threshold

  // Commander Drag-Aiming & Targeting System
  public ultimateAimIndicator?: UltimateAimIndicator;
  public isAimingUltimate: boolean = false;
  public currentAimPoint?: { x: number; y: number; isCancel: boolean };

  // Game Speed multiplier
  public gameSpeed: number = 1.0;
  private isProcessingWaveClear: boolean = false;
  private resizeHandler?: () => void;

  public pauseBattle(): void {
    this.isBattlePaused = true;
  }

  public resumeBattle(): void {
    this.isBattlePaused = false;
  }

  public isPaused(): boolean {
    return this.isBattlePaused;
  }

  public getBattlefieldStatus(): BattlefieldStatus {
    const wallState = this.waveFSM?.getWallState() ?? { currentHp: 1000, maxHp: 1000 };
    const currentWave = this.waveFSM?.getCurrentWave() ?? 1;
    const stageName = this.battleMode === 'endless'
      ? '演武 · 无尽试炼'
      : (this.stageConfig?.name ?? `第 ${this.stageId} 关`);
    const kills = this.battleMode === 'endless'
      ? this.endlessKills.total
      : (this.waveSpawner?.getTotalKilled() ?? 0);
    const pickedTactics = this.tacticsDeck?.getPickedCards() ?? [];
    const renderMode = ThreeSceneManager.getInstance().getRenderMode();
    const isMuted = SoundManager.getInstance().getIsMuted();

    return {
      battleMode: this.battleMode,
      stageId: this.stageId,
      stageName,
      chapterId: this.stageConfig?.chapterId ?? 1,
      currentWave,
      totalWaves: this.totalWaves,
      wallHp: Math.max(0, wallState.currentHp),
      wallMaxHp: wallState.maxHp,
      silver: this.wallet?.getBalance() ?? 0,
      totalKills: kills,
      gameSpeed: this.gameSpeed,
      renderMode,
      isMuted,
      pickedTactics
    };
  }

  public getTacticalReport(): TacticalThreatReport {
    const currentWave = this.waveFSM?.getCurrentWave() ?? 1;
    const wallState = this.waveFSM?.getWallState() ?? { currentHp: 1000, maxHp: 1000 };
    const weapons = this.gridModel ? this.gridModel.getAllWeapons() : [];

    const playerContext: TacticalPlayerContext = {
      weapons: weapons.map(w => ({
        id: w.id,
        configId: w.configId,
        star: w.star,
        anchor: w.anchor,
        currentHp: w.currentHp,
        maxHp: w.maxHp
      })),
      wallHp: Math.max(0, wallState.currentHp),
      wallMaxHp: wallState.maxHp,
      commanderId: this.commander?.config.id
    };

    let waveContext: TacticalWaveContext;

    if (this.battleMode === 'endless') {
      const endlessWave = EndlessWaveGenerator.generateWave(currentWave);
      const spawns: EnemySpawnInfo[] = endlessWave.batches.map(b => ({
        enemyType: b.enemyId,
        count: b.count,
        hpMultiplier: b.hpMultiplier,
        affixIds: b.affixIds
      }));

      waveContext = {
        waveIndex: currentWave,
        totalWaves: 999,
        isBossWave: endlessWave.isBossWave,
        isEliteWave: Boolean(endlessWave.batches.some(b => b.affixIds && b.affixIds.length > 0)),
        spawns,
        bossConfig: endlessWave.isBossWave ? {
          name: endlessWave.bossType || '无尽凶煞',
          archetype: 'cavalry'
        } : undefined
      };
    } else {
      const waveDef = this.stageWaveConfig?.waves?.find(w => w.waveNumber === currentWave);
      const spawns: EnemySpawnInfo[] = (waveDef?.spawns ?? []).map(s => ({
        enemyType: s.enemyType,
        count: s.count,
        hpMultiplier: s.hpMultiplier
      }));

      waveContext = {
        waveIndex: currentWave,
        totalWaves: this.totalWaves,
        isBossWave: Boolean(this.campaignWaveEngine?.isBossWave(currentWave) || waveDef?.bossConfig),
        isEliteWave: Boolean(this.campaignWaveEngine?.isEliteWave(currentWave) || waveDef?.isEliteWave),
        spawns,
        bossConfig: waveDef?.bossConfig ? {
          name: waveDef.bossConfig.name,
          archetype: waveDef.bossConfig.bossId
        } : undefined
      };
    }

    return TacticalThreatAnalyzer.analyzeThreat(waveContext, playerContext);
  }

  constructor() {
    super({ key: 'BattleScene' });
  }

  public init(data?: { stageId?: number; mode?: 'campaign' | 'endless' }): void {
    this.battleMode = data?.mode ?? 'campaign';
    this.stageId = data?.stageId ?? 1;
    this.stageConfig = getStageConfig(this.stageId);
    this.stageWaveConfig = getStageWaveConfig(this.stageId);
    this.profile = new ProfileStorage(PlatformBridge.getPlatform()).loadProfile();
    this.metaSnapshot = TechTreeManager.createCombatSnapshot(this.profile);
    this.combatStatsTracker.reset();
    this.endlessKills = { total: 0, elite: 0, boss: 0 };
    this.endlessStartTime = Date.now();
  }

  public create(): void {
    // 0. Render 2.5D Fortress Battlefield Background
    if (this.textures.exists('bg_fortress_battlefield')) {
      this.add.image(375, 667, 'bg_fortress_battlefield')
        .setDisplaySize(750, 1334)
        .setDepth(0);
    }

    // Ensure state initialized if init() wasn't triggered
    if (!this.stageConfig) {
      this.init({ stageId: 1 });
    }

    // 1. Initialize Headless Core Systems
    this.gridModel = new GridModel();
    this.weaponManager = new WeaponManager();

    if (this.battleMode === 'endless') {
      const extraWall = this.metaSnapshot.defense.extraWallMaxHp || 0;
      this.waveFSM = new WaveFSM({
        initialWave: 1,
        maxWaves: 999999,
        maxWallHp: 1000 + extraWall,
        initialWallHp: 1000 + extraWall,
        chapterId: 1
      });
      this.waveSpawner = new WaveSpawner();
    } else {
      this.campaignWaveEngine = new CampaignWaveEngine(
        this.stageConfig,
        this.stageWaveConfig,
        {
          extraWallMaxHp: this.metaSnapshot.defense.extraWallMaxHp,
          waveStipendBonus: this.metaSnapshot.artifice.waveStipendBonus,
          wallY: 840
        }
      );
      this.waveFSM = this.campaignWaveEngine.getWaveFSM();
      this.waveSpawner = this.campaignWaveEngine.getWaveSpawner();
    }
    this.commander = new Commander(this.profile.selectedCommander || 'wang_shouren');
    this.wallet = new PlayerWallet(50 + this.metaSnapshot.artifice.startingSilverBonus);
    this.shopManager = new ShopManager(this.wallet, this.gridModel);
    this.tacticsDeck = new TacticsDeck();
    this.affixManager = new AffixMountEngine();
    this.ftueManager = new FTUEManager();
    this.touchController = new TouchController();
    this.weaponInfoPopup = new WeaponInfoPopup(this);
    this.settlementModal = new SettlementModal(this);
    this.revivalModal = new RevivalModal(this);
    this.hasRevivedThisBattle = false;
    this.isBattlePaused = false;
    this.lastRecordedVideoPath = null;

    // 2. Initialize Presentation Renderers & Elemental VFX
    this.battlefieldEnv = new BattlefieldEnvironment(this, {
      hideParapetOverlay: true
    });
    this.gridRenderer = new GridRenderer(this);
    this.projectileManager = new ProjectileViewManager(this);
    this.floatingTextPool = new FloatingTextPool(this, 40);
    this.dropFlightManager = new DropFlightManager(this, 20);
    this.combatParticleManager = new CombatParticleManager(this);
    this.elementStateManager = new ElementStateManager();
    this.elementalVfx = new ElementalVfxManager(this);
    this.ultimateAimIndicator = new UltimateAimIndicator(this);
    this.rangeGraphics = this.add.graphics().setDepth(25);
    ThreeSceneManager.getInstance().init();
    if (ThreeSceneManager.getInstance().getRenderMode() === '3d') {
      ThreeSceneManager.getInstance().setVisible(true);
      ThreeSceneManager.getInstance().syncWithPhaser(this.game.canvas);
    }
    this.resizeHandler = () => {
      if (ThreeSceneManager.getInstance().getRenderMode() === '3d') {
        ThreeSceneManager.getInstance().syncWithPhaser(this.game.canvas);
      }
    };
    this.scale.on('resize', this.resizeHandler);

    // Start Battle BGM on battle initialization
    SoundManager.getInstance().playBattleBgm();

    // 3. Register Scene Lifecycle & Callbacks
    this.events.once('shutdown', this.shutdown, this);
    this.setupCoreCallbacks();

    // 4. Register Touch & Drag Listeners
    this.setupInputHandlers();

    // 5. Initial Weapon Setup (FTUE Starter Pack: 2x Fire Lance on Bench)
    this.setupInitialWeapons();

    // 6. Start Initial Wave
    this.startCurrentWave();
  }

  private setupCoreCallbacks(): void {
    if (this.battleMode === 'endless') {
      this.waveSpawner.onEnemySpawn = (enemy: EnemyEntity) => {
        this.createEnemyVisual(enemy);
        if (enemy.isBoss) {
          SoundManager.getInstance().playBossBgm();
        }
      };

      this.waveSpawner.onEnemyDeath = (enemy: EnemyEntity, dropSilver: number) => {
        this.endlessKills.total++;
        if (enemy.isBoss) {
          this.endlessKills.boss++;
        } else if ((enemy as any).affixIds && (enemy as any).affixIds.length > 0) {
          this.endlessKills.elite++;
        }
        this.removeEnemyVisual(enemy.id);
        this.wallet.earn(dropSilver, `Kill ${enemy.name}`);
        const baseRage = (enemy.isBoss ? 25 : 5);
        this.commander.addRage(baseRage);
        this.dropFlightManager.spawnDropFlight(enemy.x || 375, enemy.y || 800, dropSilver);
        this.events.emit('currencyChanged', this.wallet.getBalance());
        this.events.emit('rageChanged', this.commander.rage);
      };

      this.waveSpawner.onWallDamage = (damage: number, enemy?: EnemyEntity) => {
        this.handleWallDamage(damage, enemy?.x ?? 375);
        const wall = this.waveFSM.getWallState();
        if (wall.isBroken) {
          if (!this.hasRevivedThisBattle) {
            this.promptRevival(this.waveFSM.getCurrentWave());
          } else {
            this.handleStageDefeat(this.waveFSM.getCurrentWave());
          }
        }
      };

      this.waveSpawner.onAffixExplosion = (event) => {
        SoundManager.getInstance().playCannonBlast();
        this.floatingTextPool.spawn(event.x, event.y, '💥 同归自爆!', 'sunder');
        this.cameras.main.shake(200, 0.01);
        for (const other of this.waveSpawner.getActiveEnemies()) {
          const dx = (other.x ?? 0) - event.x;
          const dy = (other.y ?? 0) - event.y;
          if (Math.hypot(dx, dy) <= event.radius && other.currentHp > 0) {
            other.currentHp = Math.max(0, other.currentHp - event.damage);
            this.floatingTextPool.spawn(other.x ?? 375, other.y ?? 700, `-${event.damage}`, 'sunder');
            if (other.currentHp <= 0) {
              this.waveSpawner.recordKill(other.id);
            }
          }
        }
      };

      this.waveFSM.onStateChange = (_from: WaveState, to: WaveState) => {
        this.events.emit('waveStateChanged', to, this.waveFSM.getCurrentWave());
      };

      this.waveFSM.onWallDamage = (_damage: number, currentHp: number, maxHp: number) => {
        this.events.emit('wallHpChanged', currentHp, maxHp);
      };

      return;
    }

    this.campaignWaveEngine.onEnemySpawn = (enemy: EnemyEntity) => {
      this.createEnemyVisual(enemy);
      if (enemy.isBoss) {
        SoundManager.getInstance().playBossBgm();
      }
    };

    this.campaignWaveEngine.onEnemyDeath = (enemy: EnemyEntity, dropSilver: number) => {
      this.removeEnemyVisual(enemy.id);
      this.wallet.earn(dropSilver, `Kill ${enemy.name}`);
      const envMods = this.campaignWaveEngine?.getEnvironmentModifiers();
      const rageMultiplier = envMods?.commanderRageRateMultiplier ?? 1.0;
      const baseRage = (enemy.isBoss ? 25 : 5) * rageMultiplier;
      this.commander.addRage(baseRage);
      this.dropFlightManager.spawnDropFlight(enemy.x || 375, enemy.y || 800, dropSilver);
      this.events.emit('currencyChanged', this.wallet.getBalance());
      this.events.emit('rageChanged', this.commander.rage);
    };

    // Override waveSpawner.onWallDamage so barrier absorption and visual effects apply before waveFSM
    this.waveSpawner.onWallDamage = (damage: number, enemy?: EnemyEntity) => {
      this.handleWallDamage(damage, enemy?.x ?? 375);
    };

    this.campaignWaveEngine.onWallDamage = (_damage: number, currentHp: number, maxHp: number) => {
      this.events.emit('wallHpChanged', currentHp, maxHp);
    };

    this.campaignWaveEngine.onBossSkillCast = (_skillId: string, skillName: string, boss: EnemyEntity) => {
      SoundManager.getInstance().playWallHit();
      this.cameras.main.shake(300, 0.015);
      this.floatingTextPool.spawn(boss.x || 375, 620, `首领绝技：【${skillName}】！`, 'sunder');
      this.battlefieldEnv?.stampScorchCrater(boss.x || 375, 840, 32);
      this.events.emit('bossSkillCast', skillName, boss);
    };

    this.campaignWaveEngine.onWaveClear = (waveNumber: number, isFinalWave: boolean) => {
      if (!isFinalWave) {
        this.handleWaveClear();
      }
    };

    this.campaignWaveEngine.onStageVictory = (_stageId: number, summary: StageCombatSummary) => {
      this.handleStageVictory(summary);
    };

    this.campaignWaveEngine.onStageDefeat = (_stageId: number, waveReached: number) => {
      if (!this.hasRevivedThisBattle) {
        this.promptRevival(waveReached);
        return;
      }
      this.handleStageDefeat(waveReached);
    };

    this.waveFSM.onStateChange = (_from: WaveState, to: WaveState) => {
      this.events.emit('waveStateChanged', to, this.waveFSM.getCurrentWave());
    };

    this.waveFSM.onWallDamage = (_damage: number, currentHp: number, maxHp: number) => {
      this.events.emit('wallHpChanged', currentHp, maxHp);
    };
  }

  public handleWallDamage(damage: number, hitX: number = 375): void {
    if (damage <= 0 || this.waveFSM.isWallBroken()) {
      return;
    }

    // 0. Frontline Fortress Interception (Row 0 weapons take damage before city wall)
    const frontlineWeapons = this.gridModel.getAllWeapons().filter(w => w.anchor.row === 0);
    const resonance = FrontlineDefenseManager.calculateResonance(frontlineWeapons);
    const interceptor = FrontlineDefenseManager.findInterceptingWeapon(frontlineWeapons, hitX);

    if (interceptor) {
      const { actualDeducted, reflectedDamage, isNowBroken } = FrontlineDefenseManager.applyDamage(
        interceptor,
        damage,
        resonance
      );

      const interceptorPos = TouchCoordinateMapper.gridToScreen(
        interceptor.anchor.row,
        interceptor.anchor.col,
        interceptor.footprint
      );

      SoundManager.getInstance().playShieldBash();
      PlatformBridge.getPlatform().vibrateShort('light');
      this.combatStatsTracker.recordInterception(interceptor.id, actualDeducted);
      const roundedDeducted = Math.round(actualDeducted);
      if (roundedDeducted > 0) {
        this.floatingTextPool.spawn(interceptorPos.x, interceptorPos.y - 20, `-${roundedDeducted}`, 'crit');
      }

      // Frontline melee feedback: weapon recoil, sparks, and flame/spear vfx
      this.combatParticleManager?.emitImpactSparks(hitX, 850, true);
      const interceptorSprite = this.unitSprites.get(interceptor.id);
      if (interceptorSprite) {
        interceptorSprite.playRecoil();
        interceptorSprite.updateHealthBar();
      }

      // If oil_cabinet or spear_camp, play active counter-thrust visual
      if (interceptor.configId === 'oil_cabinet') {
        this.elementalVfx?.playFireBlast(hitX, 860);
      } else if (interceptor.configId === 'electric_grid') {
        this.elementalVfx?.playThunderJudgement(hitX, 860);
      }

      if (reflectedDamage > 0) {
        this.floatingTextPool.spawn(hitX, 865, `拒止反弹 ${reflectedDamage}`, 'sunder');
      }

      if (isNowBroken) {
        this.floatingTextPool.spawn(interceptorPos.x, interceptorPos.y, '【工事告破】', 'sunder');
        PlatformBridge.getPlatform().vibrateShort('heavy');
        SoundManager.getInstance().playWallHit();
        if (this.cameras?.main) {
          this.cameras.main.shake(120, 0.0035);
        }
        this.combatParticleManager?.emitImpactSparks(interceptorPos.x, interceptorPos.y, true);
        this.battlefieldEnv?.stampScorchCrater(interceptorPos.x, interceptorPos.y + 10, 24);
      }

      // Damage was intercepted by frontline unit, wall takes 0 damage
      return;
    }

    // 1. Commander Barrier absorption (e.g. Wang Shouren "铁幕")
    const { absorbed, remainingDamage } = this.commander.absorbBarrierDamage(damage);

    if (absorbed > 0) {
      this.floatingTextPool.spawn(hitX, 840, `铁幕抵消 -${absorbed}`, 'crit');
      SoundManager.getInstance().playShieldBash();

      // Reflect melee damage back to enemy
      const reflectRatio = this.commander.config.ultimate.reflectMeleeRatio ?? 1.0;
      const reflected = Math.round(absorbed * reflectRatio);
      if (reflected > 0) {
        this.floatingTextPool.spawn(hitX, 865, `反弹 ${reflected}`, 'sunder');
      }
      this.emitBarrierSparks(hitX, 840);
    }

    // 2. Remaining damage to Wall
    if (remainingDamage > 0) {
      SoundManager.getInstance().playWallHit();
      PlatformBridge.getPlatform().vibrateShort('heavy');
      this.floatingTextPool.spawn(hitX, 840, `-${remainingDamage}`, 'sunder');
      this.battlefieldEnv?.stampScorchCrater(hitX, 840, 28);

      // Visual feedback: Subtle camera shake and flash red tint on wall hit
      if (this.cameras?.main) {
        this.cameras.main.shake(80, 0.0025);
        this.cameras.main.flash(70, 180, 40, 40, true);
      }

      // Thorns reflect damage from Tech Tree
      if (this.metaSnapshot.defense.thornsRateBonus > 0) {
        const reflect = Math.round(remainingDamage * this.metaSnapshot.defense.thornsRateBonus);
        if (reflect > 0) {
          this.floatingTextPool.spawn(hitX, 865, `荆棘刺阵 -${reflect}`, 'crit');
        }
      }

      this.waveFSM.damageWall(remainingDamage);
    }

    const wall = this.waveFSM.getWallState();
    this.events.emit('wallHpChanged', wall.currentHp, wall.maxHp);
  }

  /**
   * Triggers subtle camera shake with 120ms throttle gate:
   * - heavy_cannon: 90ms duration, 0.0028 intensity (~2-3px)
   * - crit_impact: 70ms duration, 0.0020 intensity (~1.5-2.5px)
   * - elemental_blast: 110ms duration, 0.0032 intensity (~2.5-4px)
   */
  public triggerSubtleShake(preset: 'heavy_cannon' | 'crit_impact' | 'elemental_blast'): void {
    const now = this.time?.now ?? Date.now();
    if (now - this.lastCameraShakeTime < this.CAMERA_SHAKE_MIN_INTERVAL) {
      return;
    }
    this.lastCameraShakeTime = now;

    if (!this.cameras?.main?.shake) return;

    switch (preset) {
      case 'heavy_cannon':
        this.cameras.main.shake(90, 0.0028);
        break;
      case 'crit_impact':
        this.cameras.main.shake(70, 0.0020);
        break;
      case 'elemental_blast':
        this.cameras.main.shake(110, 0.0032);
        break;
    }
  }

  private setupInitialWeapons(): void {
    // FTUE Step 1 setup: two ★1 fire lances placed on grid at { row: 2, col: 1 } and { row: 2, col: 2 }
    const lanceA = createWeaponInstance('fire_lance', 1);
    const lanceB = createWeaponInstance('fire_lance', 1);

    this.weaponManager.registerWeapon(lanceA);
    this.weaponManager.registerWeapon(lanceB);

    this.gridModel.placeWeapon(lanceA, { row: 2, col: 1 });
    this.gridModel.placeWeapon(lanceB, { row: 2, col: 2 });

    this.refreshAllUnitSprites();
  }

  public startCurrentWave(): void {
    const waveIndex = this.waveFSM.getCurrentWave();
    this.isProcessingWaveClear = false;

    // Transition to WaveActive
    if (this.waveFSM.getState() === 'Prep') {
      this.waveFSM.startWave();
    }

    if (this.battleMode === 'endless') {
      const endlessWave = EndlessWaveGenerator.generateWave(waveIndex);
      const isBossWave = endlessWave.isBossWave;
      const isEliteWave = Boolean(endlessWave.batches.some(b => b.affixIds && b.affixIds.length > 0));

      if (isBossWave) {
        SoundManager.getInstance().playBossAlert();
        SoundManager.getInstance().playBossBgm();
        this.cameras.main.shake(400, 0.015);
        const affixNames = endlessWave.bossAffixes ? endlessWave.bossAffixes.map(a => `【${ENEMY_AFFIX_REGISTRY[a].badge}】`).join('') : '';
        this.floatingTextPool.spawn(375, 450, `⚠️ 守关大将降临！${affixNames}`, 'crit');
      } else {
        SoundManager.getInstance().playWarDrums();
        SoundManager.getInstance().playBattleBgm();
      }

      this.waveSpawner.startWave(endlessWave);
      this.events.emit('waveStarted', waveIndex, 999, isBossWave, isEliteWave);
      if (isBossWave) {
        this.events.emit('bossWarningVignette');
      }
      return;
    }

    const isBossWave = Boolean(
      this.campaignWaveEngine.isBossWave(waveIndex) ||
      this.stageWaveConfig?.waves?.find(w => w.waveNumber === waveIndex)?.bossConfig
    );
    const isEliteWave = Boolean(
      this.campaignWaveEngine.isEliteWave(waveIndex) ||
      this.stageWaveConfig?.waves?.find(w => w.waveNumber === waveIndex)?.isEliteWave
    );

    if (isBossWave) {
      SoundManager.getInstance().playBossAlert();
      SoundManager.getInstance().playBossBgm();
      this.cameras.main.shake(400, 0.015);
    } else {
      SoundManager.getInstance().playWarDrums();
      SoundManager.getInstance().playBattleBgm();
    }

    // High-light screen recording: start recorder at battle start or boss wave
    const recorder = PlatformBridge.getPlatform().getGameRecorder();
    if (recorder && !recorder.isRecording()) {
      try {
        recorder.start({ duration: 60 });
      } catch (e) {
        console.warn('[BattleScene] GameRecorder start failed:', e);
      }
    }

    this.campaignWaveEngine.startWave();
    this.events.emit('waveStarted', waveIndex, this.totalWaves, isBossWave, isEliteWave);
  }

  private startLongPressDrag(pending: NonNullable<typeof this.pendingPointerDown>): void {
    const ok = this.touchController.onPointerDown(
      pending.pointerId,
      pending.startX,
      pending.startY,
      pending.sourceType,
      pending.weapon.id,
      pending.sourceGrid,
      pending.sourceBench
    );

    if (ok) {
      const sprite = this.unitSprites.get(pending.weapon.id);
      if (sprite) {
        this.draggedSprite = sprite;
        const currentScale = sprite.getPerspectiveScale() * 1.1;
        sprite.setDragging(true, currentScale);
        const touchPoint = { x: pending.startX, y: pending.startY };
        const vis = TouchCoordinateMapper.touchToVisualPosition(touchPoint);
        sprite.setPosition(vis.x, vis.y);
        this.gridRenderer.showForbiddenRows(Boolean(pending.weapon.isFortressOnly));
        if (pending.weapon.range < 90) {
          this.drawRangeIndicator(pending.weapon, vis.x, vis.y);
        }

        // Show Recycle zone with estimated refund
        const hasJingBing = this.tacticsDeck?.getPicks('T03') > 0;
        const invested = this.getWeaponTotalInvestedCost(pending.weapon);
        const estRefund = EconomyEngine.calculateRecycleRefund(invested, hasJingBing);
        this.gridRenderer.updateRecycleZone(true, false, estRefund);
      }
    }
  }

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      SoundManager.getInstance().resume();

      // Enforce single-pointer lock: reject secondary pointer if already dragging or waiting
      if (this.draggedSprite || this.touchController.getDragState().isDragging || this.pendingPointerDown) return;

      const touchPoint = { x: pointer.x, y: pointer.y };
      const hitGrid = TouchCoordinateMapper.screenToGrid(touchPoint);
      const hitBench = TouchCoordinateMapper.screenToBenchSlot(touchPoint);

      let foundWeapon: WeaponInstance | null = null;
      let sourceType: 'grid' | 'bench' | null = null;

      if (hitGrid) {
        foundWeapon = this.gridModel.getWeaponAt(hitGrid.row, hitGrid.col);
        if (foundWeapon) sourceType = 'grid';
      } else if (hitBench !== -1) {
        foundWeapon = this.gridModel.getBenchSlot(hitBench);
        if (foundWeapon) sourceType = 'bench';
      }

      if (foundWeapon && sourceType) {
        const pending = {
          pointerId: pointer.id,
          startX: pointer.x,
          startY: pointer.y,
          startTime: Date.now(),
          weapon: foundWeapon,
          sourceType,
          sourceGrid: sourceType === 'grid' ? foundWeapon.anchor : undefined,
          sourceBench: sourceType === 'bench' ? hitBench : undefined,
          timer: setTimeout(() => {
            if (this.pendingPointerDown && this.pendingPointerDown.pointerId === pointer.id) {
              this.startLongPressDrag(this.pendingPointerDown);
              this.pendingPointerDown = null;
            }
          }, BattleScene.LONG_PRESS_THRESHOLD_MS)
        };
        this.pendingPointerDown = pending;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Check if pending long-press exceeded slop threshold -> immediate drag
      if (this.pendingPointerDown && this.pendingPointerDown.pointerId === pointer.id) {
        const dx = pointer.x - this.pendingPointerDown.startX;
        const dy = pointer.y - this.pendingPointerDown.startY;
        if (Math.hypot(dx, dy) > BattleScene.DRAG_SLOP_PX) {
          if (this.pendingPointerDown.timer) {
            clearTimeout(this.pendingPointerDown.timer);
          }
          this.startLongPressDrag(this.pendingPointerDown);
          this.pendingPointerDown = null;
        }
      }

      const dragState = this.touchController.getDragState();
      if (!this.draggedSprite || !dragState.isDragging || dragState.activePointerId !== pointer.id) return;

      const ok = this.touchController.onPointerMove(pointer.id, pointer.x, pointer.y);
      if (ok) {
        const touchPoint = { x: pointer.x, y: pointer.y };
        const vis = TouchCoordinateMapper.touchToVisualPosition(touchPoint);
        this.draggedSprite.setPosition(vis.x, vis.y);
        if (ThreeSceneManager.getInstance().getRenderMode() === '3d') {
          ThreeSceneManager.getInstance().addOrUpdateWeapon(this.draggedSprite.weapon, vis.x, vis.y, this.draggedSprite.scaleX);
        }

        if (this.draggedSprite.weapon.range < 90) {
          this.drawRangeIndicator(this.draggedSprite.weapon, vis.x, vis.y);
        }

        // Update highlight & recycle hover
        const hitTest = TouchCoordinateMapper.visualToHitTestPoint(vis);
        const gridPos = TouchCoordinateMapper.screenToGrid(hitTest);
        const benchSlot = TouchCoordinateMapper.screenToBenchSlot(hitTest);
        const isRecycleHover = TouchCoordinateMapper.isPointInRecycleZone(hitTest);

        const hasJingBing = this.tacticsDeck?.getPicks('T03') > 0;
        const invested = this.getWeaponTotalInvestedCost(this.draggedSprite.weapon);
        const estRefund = EconomyEngine.calculateRecycleRefund(invested, hasJingBing);
        this.gridRenderer.updateRecycleZone(true, isRecycleHover, estRefund);

        if (gridPos) {
          const targetRowScale = TouchCoordinateMapper.getRowPerspectiveScale(gridPos.row);
          this.draggedSprite.setScale(targetRowScale * 1.1);
          const draggedWeapon = this.draggedSprite.weapon;
          const targetWeapon = this.gridModel.getWeaponAt(gridPos.row, gridPos.col);
          const isMerge = targetWeapon && targetWeapon.id !== draggedWeapon.id &&
            targetWeapon.configId === draggedWeapon.configId && targetWeapon.star === draggedWeapon.star &&
            targetWeapon.star < 4;

          const validation = this.gridModel.validatePlacement(draggedWeapon, gridPos);
          const isValid = isMerge || validation.valid;

          this.gridRenderer.showHighlightGrid(gridPos, {
            isValid: Boolean(isValid),
            isMerge: Boolean(isMerge),
            footprint: draggedWeapon.footprint
          });
        } else if (benchSlot !== -1) {
          this.gridRenderer.showHighlightBench(benchSlot, true);
        } else {
          this.gridRenderer.clearHighlight();
          // Maintain recycle zone visible during drag
          this.gridRenderer.updateRecycleZone(true, isRecycleHover, estRefund);
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Check if this was a quick tap (< LONG_PRESS_THRESHOLD_MS) -> show detail info popup
      if (this.pendingPointerDown && this.pendingPointerDown.pointerId === pointer.id) {
        if (this.pendingPointerDown.timer) {
          clearTimeout(this.pendingPointerDown.timer);
        }
        const tappedWeapon = this.pendingPointerDown.weapon;
        this.pendingPointerDown = null;

        // Open weapon info popup
        SoundManager.getInstance().playMergeChime();
        this.weaponInfoPopup.show(tappedWeapon);
        return;
      }

      const dragState = this.touchController.getDragState();
      if (!this.draggedSprite || !dragState.isDragging || dragState.activePointerId !== pointer.id) return;

      const upRes = this.touchController.onPointerUp(pointer.id);
      this.gridRenderer.clearHighlight();
      this.rangeGraphics.clear();

      if (upRes.ended && this.draggedSprite) {
        this.resolveDrop(this.draggedSprite.weapon, upRes);
      }

      if (this.draggedSprite) {
        this.draggedSprite.setDragging(false);
        this.draggedSprite = null;
      }

      this.refreshAllUnitSprites();
      this.checkFrontlineResonanceBanner();
    });

    this.input.keyboard?.on('keydown-V', () => {
      const newMode = this.toggleRenderMode();
      this.floatingTextPool.spawn(375, 500, newMode === '3d' ? '已切换至 3D 战场视角' : '已切换至 2D 策略视角', 'crit');
    });
  }

  private drawRangeIndicator(weapon: WeaponInstance, x: number, y: number): void {
    this.rangeGraphics.clear();

    // If Qimen aura facility (powder_bureau, war_drum, stargazer, luban_workshop), draw 8-direction aura octagram
    if (weapon.faction === 'qimen') {
      const auraColor = 0xba68c8; // Qimen purple aura
      this.rangeGraphics.fillStyle(auraColor, 0.16);
      this.rangeGraphics.fillCircle(x, y, 120);

      // Rotating Bagua / Octagram Aura Ring
      this.rangeGraphics.lineStyle(2, auraColor, 0.85);
      this.rangeGraphics.strokeCircle(x, y, 120);

      this.rangeGraphics.lineStyle(1.5, 0xffd700, 0.7);
      this.rangeGraphics.strokeCircle(x, y, 80);

      // Connect aura beams to adjacent deployed units on grid
      for (const other of this.gridModel.getAllWeapons()) {
        if (other.id === weapon.id) continue;
        const otherPos = TouchCoordinateMapper.gridToScreen(other.anchor.row, other.anchor.col, other.footprint);
        const dist = Math.hypot(otherPos.x - x, otherPos.y - y);
        if (dist <= 150) {
          this.rangeGraphics.lineStyle(2, 0x00e5ff, 0.75);
          this.rangeGraphics.lineBetween(x, y, otherPos.x, otherPos.y);

          this.rangeGraphics.fillStyle(0x00e5ff, 0.5);
          this.rangeGraphics.fillCircle(otherPos.x, otherPos.y, 16);
        }
      }
      return;
    }

    const radius = Math.min(650, weapon.range * 68); // 68 px per meter
    this.rangeGraphics.fillStyle(0x00e5ff, 0.12);
    this.rangeGraphics.fillCircle(x, y, radius);
    this.rangeGraphics.lineStyle(2, 0x00e5ff, 0.6);
    this.rangeGraphics.strokeCircle(x, y, radius);
  }

  private resolveDrop(weapon: WeaponInstance, upRes: any): void {
    const targetGrid = upRes.targetGridPos;
    const targetBench = upRes.targetBenchSlot;
    const sourceGrid = upRes.state.sourceGridPos;
    const sourceBench = upRes.state.sourceBenchSlot;

    // 1. Drop on Grid
    if (targetGrid) {
      // Check Row 0 bidirectional exclusivity
      if (weapon.isFortressOnly && targetGrid.row !== 0) {
        this.floatingTextPool.spawn(pointerX(targetGrid.col), 400, '城防工事仅限前排女墙！', 'sunder');
        return; // Bounce back
      }
      if (!weapon.isFortressOnly && targetGrid.row === 0) {
        this.floatingTextPool.spawn(pointerX(targetGrid.col), 896, '女墙前哨仅限城防工事！', 'sunder');
        return; // Bounce back
      }

      const targetWeapon = this.gridModel.getWeaponAt(targetGrid.row, targetGrid.col);

      // Check 2-in-1 merge
      if (targetWeapon && targetWeapon.id !== weapon.id) {
        // Armory level max star check
        const maxAllowedStar = this.metaSnapshot?.weaponMaxAllowedStars?.[weapon.configId] || 4;
        if (targetWeapon.configId === weapon.configId && targetWeapon.star === weapon.star) {
          const nextStar = targetWeapon.star + 1;
          if (nextStar > maxAllowedStar) {
            const screenPos = TouchCoordinateMapper.gridToScreen(targetWeapon.anchor.row, targetWeapon.anchor.col, targetWeapon.footprint);
            this.floatingTextPool.spawn(screenPos.x, screenPos.y, `造办处等级不足，★${nextStar}未解锁！`, 'sunder');
            return;
          }
        }

        const mergeResult = StarUpgradeStateMachine.evaluateMerge(
          weapon,
          targetWeapon,
          targetGrid,
          targetWeapon.anchor
        );

        if (mergeResult.canMerge && mergeResult.mergedWeapon) {
          // Remove source and target from models
          this.removeWeaponFromSource(weapon, sourceGrid, sourceBench);
          this.gridModel.removeWeapon(targetWeapon.id);

          // Place merged upgraded weapon
          this.gridModel.placeWeapon(mergeResult.mergedWeapon, targetWeapon.anchor, true);
          this.weaponManager.registerWeapon(mergeResult.mergedWeapon);

          // Pity timer reset
          this.shopManager.onMergeOccurred();

          // Sound effect
          SoundManager.getInstance().playMergeChime();

          const mergeCenter = TouchCoordinateMapper.gridToScreen(targetWeapon.anchor.row, targetWeapon.anchor.col, targetWeapon.footprint);
          this.floatingTextPool.spawn(
            mergeCenter.x,
            mergeCenter.y,
            `升星成功 ★${mergeResult.mergedWeapon.star}!`,
            'crit'
          );

          // Notify FTUE step 1 completion if relevant
          if (this.ftueManager.getStep() === FTUEStep.STEP_1_MERGE_FIRE_LANCE) {
            this.ftueManager.onMergeCompleted(targetWeapon.anchor, mergeResult.mergedWeapon);
            this.events.emit('ftueStepCompleted', FTUEStep.STEP_1_MERGE_FIRE_LANCE);
          }
          return;
        }
      }

      // Check Smart Swap / Place
      if (sourceGrid) {
        const swapRes = SmartSwapController.tryDropFromGrid(this.gridModel, weapon, targetGrid);
        if (!swapRes.success) {
          this.floatingTextPool.spawn(pointerX(targetGrid.col), 400, '位置拥挤，归位！', 'sunder');
        }
      } else if (sourceBench !== undefined) {
        const swapRes = SmartSwapController.tryDropFromBench(this.gridModel, weapon, sourceBench, targetGrid);
        if (!swapRes.success) {
          this.floatingTextPool.spawn(pointerX(targetGrid.col), 400, '无法部署该位置！', 'sunder');
        }
      }
      return;
    }

    // 2. Drop on Bench
    if (targetBench !== undefined && targetBench !== -1) {
      if (sourceBench !== undefined && sourceBench === targetBench) {
        return;
      }
      this.removeWeaponFromSource(weapon, sourceGrid, sourceBench);
      this.gridModel.placeOnBench(weapon, targetBench);
      return;
    }

    // 3. Drop on Recycle / Discard Zone
    if (upRes.isRecycleDrop) {
      this.removeWeaponFromSource(weapon, sourceGrid, sourceBench);
      this.unitSprites.get(weapon.id)?.destroy();
      this.unitSprites.delete(weapon.id);

      const hasJingBing = this.tacticsDeck?.getPicks('T03') > 0;
      const investedSilver = this.getWeaponTotalInvestedCost(weapon);
      const refund = this.wallet.recycleWeapon(investedSilver, hasJingBing);

      SoundManager.getInstance().playCoinJingle();
      PlatformBridge.getPlatform().vibrateShort('medium');
      this.floatingTextPool.spawn(375, 1260, `熔铸分解：+${refund} 银两`, 'crit');
      this.events.emit('currencyChanged', this.wallet.getBalance());
      return;
    }
  }

  public getWeaponTotalInvestedCost(weapon: WeaponInstance): number {
    const cfg = WEAPON_CONFIGS[weapon.configId];
    if (!cfg) return 15;
    // Cumulative cost based on star: Star 1 = 1x base, Star 2 = 2x base, Star 3 = 4x base, Star 4 = 8x base
    const baseCost = (cfg.stars as any)?.[1]?.cost ?? 15;
    const multiplier = Math.pow(2, weapon.star - 1);
    return baseCost * multiplier;
  }

  private lastReportedResonanceTier: number = 0;

  private checkFrontlineResonanceBanner(): void {
    const frontlineWeapons = this.gridModel.getAllWeapons().filter(w => w.anchor.row === 0);
    const count = frontlineWeapons.length;

    if (count !== this.lastReportedResonanceTier) {
      this.lastReportedResonanceTier = count;
      if (count === 2) {
        SoundManager.getInstance().playCritGong();
        PlatformBridge.getPlatform().vibrateShort('medium');
        this.floatingTextPool.spawn(375, 870, '【坚壁共鸣】前排城防生命 +20%！', 'crit');
      } else if (count === 3) {
        SoundManager.getInstance().playCritGong();
        PlatformBridge.getPlatform().vibrateShort('medium');
        this.floatingTextPool.spawn(375, 870, '【铁壁共鸣】前排城防免伤 +15%！', 'crit');
      } else if (count === 4) {
        SoundManager.getInstance().playCritGong();
        PlatformBridge.getPlatform().vibrateShort('heavy');
        this.floatingTextPool.spawn(375, 870, '【拒止连环】生命+35% 荆棘反弹+20%！', 'crit');
      } else if (count >= 5) {
        SoundManager.getInstance().playVictoryFanfare();
        PlatformBridge.getPlatform().vibrateShort('heavy');
        this.floatingTextPool.spawn(375, 870, '【固若金汤】全前排+50% 城防远程免伤+30%！', 'crit');
      }
    }
  }

  private removeWeaponFromSource(weapon: WeaponInstance, sourceGrid?: GridPosition, sourceBench?: number): void {
    if (sourceGrid) {
      this.gridModel.removeWeapon(weapon.id);
    } else if (sourceBench !== undefined) {
      this.gridModel.removeBenchWeapon(weapon.id);
    }
  }

  public refreshAllUnitSprites(): void {
    const activeWeaponIds = new Set<string>();
    const is3D = ThreeSceneManager.getInstance().getRenderMode() === '3d';

    // Grid weapons
    for (const w of this.gridModel.getAllWeapons()) {
      activeWeaponIds.add(w.id);
      let sprite = this.unitSprites.get(w.id);
      const screenPos = TouchCoordinateMapper.gridToScreen(w.anchor.row, w.anchor.col, w.footprint);

      if (!sprite) {
        sprite = new UnitSprite(this, w);
        this.unitSprites.set(w.id, sprite);
      } else {
        sprite.updateWeaponData(w);
      }
      sprite.setPosition(screenPos.x, screenPos.y);
      const rowScale = TouchCoordinateMapper.getRowPerspectiveScale(w.anchor.row);
      sprite.setPerspectiveScale(rowScale);
      if (is3D) {
        ThreeSceneManager.getInstance().addOrUpdateWeapon(w, screenPos.x, screenPos.y, rowScale);
      } else {
        ThreeSceneManager.getInstance().removeWeapon(w.id);
      }
    }

    // Bench weapons
    for (let slotIdx = 0; slotIdx < 5; slotIdx++) {
      const weapon = this.gridModel.getBenchSlot(slotIdx);
      if (weapon) {
        activeWeaponIds.add(weapon.id);
        let sprite = this.unitSprites.get(weapon.id);
        const screenPos = TouchCoordinateMapper.benchSlotToScreen(slotIdx);

        if (!sprite) {
          sprite = new UnitSprite(this, weapon);
          this.unitSprites.set(weapon.id, sprite);
        } else {
          sprite.updateWeaponData(weapon);
        }
        sprite.setPosition(screenPos.x, screenPos.y);
        const benchScale = Math.min(1.0, 72 / Math.max(weapon.footprint.width * 72, weapon.footprint.height * 72));
        sprite.setPerspectiveScale(benchScale);
        if (is3D) {
          ThreeSceneManager.getInstance().addOrUpdateWeapon(weapon, screenPos.x, screenPos.y, 0.95 * benchScale);
        } else {
          ThreeSceneManager.getInstance().removeWeapon(weapon.id);
        }
      }
    }

    // Remove defunct sprites and 3D objects
    for (const [id, sprite] of this.unitSprites.entries()) {
      if (!activeWeaponIds.has(id)) {
        sprite.destroy();
        this.unitSprites.delete(id);
        ThreeSceneManager.getInstance().removeWeapon(id);
      }
    }

    // Update Spatial Synergy visual link beams on the sand table
    const links = SpatialSynergyEngine.getActiveLinks(this.gridModel.getAllWeapons());
    this.gridRenderer?.renderSpatialSynergyLinks(links);
  }

  public toggleRenderMode(): '2d' | '3d' {
    const nextMode = ThreeSceneManager.getInstance().toggleRenderMode();
    this.applyRenderMode(nextMode);
    return nextMode;
  }

  public setRenderMode(mode: '2d' | '3d'): void {
    ThreeSceneManager.getInstance().setRenderMode(mode);
    this.applyRenderMode(mode);
  }

  private applyRenderMode(mode: '2d' | '3d'): void {
    if (mode === '3d') {
      ThreeSceneManager.getInstance().syncWithPhaser(this.game.canvas);
    }
    this.battlefieldEnv?.setVisible(mode === '2d');
    this.refreshAllUnitSprites();
    this.refreshAllEnemiesVisual();
    this.events.emit('renderModeChanged', mode);
  }

  public refreshAllEnemiesVisual(): void {
    const is3D = ThreeSceneManager.getInstance().getRenderMode() === '3d';
    const enemies = this.waveSpawner.getActiveEnemies();

    for (const enemy of enemies) {
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        sprite.setSpriteVisible(!is3D);
      }
      if (is3D) {
        ThreeSceneManager.getInstance().addOrUpdateEnemy(enemy, enemy.x || 375, enemy.y || 1120);
      } else {
        ThreeSceneManager.getInstance().removeEnemy(enemy.id);
      }
    }
  }

  private createEnemyVisual(enemy: EnemyEntity): void {
    const sprite = new EnemySprite(this, enemy);
    const is3D = ThreeSceneManager.getInstance().getRenderMode() === '3d';
    sprite.setSpriteVisible(!is3D);
    this.enemySprites.set(enemy.id, sprite);

    if (is3D) {
      ThreeSceneManager.getInstance().addOrUpdateEnemy(enemy, enemy.x || 375, enemy.y || 1120);
    }
  }

  private removeEnemyVisual(id: string): void {
    const sprite = this.enemySprites.get(id);
    if (sprite) {
      sprite.destroy();
      this.enemySprites.delete(id);
    }
    this.elementStateManager?.removeEntity(id);
    ThreeSceneManager.getInstance().removeEnemy(id);
  }

  private updateEnemyHpBar(_g: Phaser.GameObjects.Graphics, enemy: EnemyEntity): void {
    const sprite = this.enemySprites.get(enemy.id);
    if (sprite) {
      sprite.updateHp();
    }
  }

  public update(time: number, delta: number): void {
    if (this.isBattlePaused) {
      return;
    }

    const deltaSec = (delta / 1000) * this.gameSpeed;

    // 0. Tick Battlefield Environment (wind wave rope flags & braziers)
    this.battlefieldEnv?.update(time, delta);

    // 0.1 Tick Elemental State & Anti-Crash Reaction Valves
    this.elementStateManager?.tick(deltaSec);
    ReactionValve.resetTick();
    this.elementalVfx?.update(time, delta);
    this.dropFlightManager?.update(deltaSec, time);

    // 0.2 Tick UnitSprites (muzzle heat dissipation & high-star rune glow)
    for (const sprite of this.unitSprites.values()) {
      sprite.update(deltaSec, time);
    }

    // 0.3 Tick Ultimate Aim Indicator
    this.ultimateAimIndicator?.update(deltaSec, this.getTargetedEnemiesForAim());

    // 1. Tick Commander state
    this.commander.tick(deltaSec);
    if (this.barrierVisual && (!this.commander.isUltimateActive || this.commander.barrierHp <= 0)) {
      this.dismissBarrierVisual();
    }

    // 2. Tick Projectile visuals
    this.projectileManager.updateProjectiles(deltaSec);

    // 3. Tick Wave Spawner & Combat
    if (this.waveFSM.getState() === 'WaveActive') {
      // 3.0 Frontline Fortification Self-Regen (Row 0 repair: 2%/s in-combat, 6%/s out-of-combat)
      const nowSec = time / 1000;
      const frontlineWeapons = this.gridModel.getAllWeapons().filter(w => w.anchor.row === 0);
      for (const w of frontlineWeapons) {
        const { healed, restoredFromBroken } = FrontlineDefenseManager.tickRegen(w, deltaSec, nowSec);
        if (restoredFromBroken) {
          const sprite = this.unitSprites.get(w.id);
          sprite?.updateHealthBar();
          const screenPos = TouchCoordinateMapper.gridToScreen(w.anchor.row, w.anchor.col, w.footprint);
          this.floatingTextPool.spawn(screenPos.x, screenPos.y - 30, '修整复原！', 'crit');
        } else if (healed > 0) {
          const sprite = this.unitSprites.get(w.id);
          sprite?.updateHealthBar();
        }
      }

      // Calculate dynamic frontline lane stop lines for Row 0 fortress units
      const frontlineStopYByLane: number[] = [840, 840, 840, 840, 840];
      for (const w of frontlineWeapons) {
        if (!w.isBroken && (w.currentHp ?? 0) > 0) {
          const startCol = w.anchor.col;
          const endCol = startCol + (w.footprint?.width || 1);
          for (let c = startCol; c < endCol; c++) {
            if (c >= 0 && c < 5) {
              frontlineStopYByLane[c] = 926; // Frontline barrier interception line
            }
          }
        }
      }

      const spawnerRes = this.waveSpawner.update(deltaSec, 840, frontlineStopYByLane);

      // Handle spawned & killed from spawner update
      for (const e of spawnerRes.killedEnemies) {
        this.removeEnemyVisual(e.id);
      }

      // Sync active enemy visuals
      const enemies = this.waveSpawner.getActiveEnemies();
      for (const enemy of enemies) {
        let sprite = this.enemySprites.get(enemy.id);
        if (!sprite) {
          this.createEnemyVisual(enemy);
          sprite = this.enemySprites.get(enemy.id);
        }
        if (sprite) {
          if (!sprite.isHitStopped()) {
            sprite.setPosition(enemy.x || 375, enemy.y || 1120);
          }
          sprite.update(deltaSec);
        }
        if (ThreeSceneManager.getInstance().getRenderMode() === '3d') {
          ThreeSceneManager.getInstance().addOrUpdateEnemy(enemy, enemy.x || 375, enemy.y || 1120);
        }
      }

      // Weapons attack loop
      this.processWeaponsCombat(deltaSec, enemies);

      // Check wave clear
      if (this.waveSpawner.isWaveCompleted() && !this.isProcessingWaveClear) {
        this.handleWaveClear();
      }
    }

    // 4. Render 3D WebGL Layer
    ThreeSceneManager.getInstance().render(deltaSec);
  }

  private getAffixCalculationContext(): AffixCalculationContext {
    const placedWeapons = this.gridModel.getAllWeapons();
    return {
      currentSilver: this.wallet.getSilver(),
      wallMaxHp: this.waveFSM.getMaxWallHp(),
      wallCurrentHp: this.waveFSM.getWallHp(),
      placedWeapons,
      gridMatrix: this.gridModel.getSnapshot().grid,
      totalOccupiedCells: placedWeapons.reduce(
        (sum, w) => sum + w.footprint.width * w.footprint.height,
        0
      )
    };
  }

  private processWeaponsCombat(deltaSec: number, enemies: EnemyEntity[]): void {
    if (enemies.length === 0) return;

    const affixCtx = this.getAffixCalculationContext();
    const allWeapons = this.gridModel.getAllWeapons();
    const spatialBonuses = SpatialSynergyEngine.evaluateAllWeapons(allWeapons);

    for (const weapon of allWeapons) {
      let timer = (this.weaponAttackTimers.get(weapon.id) || 0) + deltaSec;

      // Check attack interval (affected by affix bonuses, spatial synergies, Wang Shouren ultimate, environment, and forge equipment)
      let aspdBonus = this.affixManager.getAttackSpeedBonus(weapon, affixCtx);
      const spatialBonus = spatialBonuses.get(weapon.id);
      if (spatialBonus?.aspdBonus) {
        aspdBonus += spatialBonus.aspdBonus;
      }
      if (this.commander.isUltimateActive) {
        aspdBonus += 1.50; // +150% ASPD
      }
      const envMods = this.campaignWaveEngine?.getEnvironmentModifiers();
      if (envMods && envMods.nonColdWeaponReloadPenalty > 0 && weapon.faction !== 'qimen') {
        aspdBonus -= envMods.nonColdWeaponReloadPenalty;
      }
      const forgeBonus = this.metaSnapshot?.weaponForgeBonuses?.[weapon.configId];
      if (forgeBonus?.cooldownReduction) {
        aspdBonus += forgeBonus.cooldownReduction;
      }
      const interval = this.affixManager.calculateEffectiveInterval(weapon.attackInterval, aspdBonus);

      const sprite = this.unitSprites.get(weapon.id);
      if (sprite) {
        sprite.updateCooldown(Math.min(1.0, timer / interval));
      }

      if (timer >= interval) {
        const weaponScreenPos = TouchCoordinateMapper.gridToScreen(weapon.anchor.row, weapon.anchor.col, weapon.footprint);
        const targetingWeapon = forgeBonus?.rangeBonus
          ? { ...weapon, range: weapon.range + forgeBonus.rangeBonus }
          : weapon;
        const candidate = SpatialTargetingSystem.selectTarget(targetingWeapon, enemies, 'First', {
          weaponPos: weaponScreenPos,
          wallY: 860
        });

        if (candidate) {
          timer = 0;
          this.fireWeapon(weapon, weaponScreenPos, candidate, spatialBonus);
          if (sprite) {
            sprite.playRecoil();
            sprite.playMuzzleHeat();
          }
          ThreeSceneManager.getInstance().playWeaponRecoil(weapon.id);
        }
      }

      this.weaponAttackTimers.set(weapon.id, timer);
    }
  }

  private fireWeapon(
    weapon: WeaponInstance,
    fromPos: { x: number; y: number },
    target: EnemyEntity,
    spatialBonus?: SpatialSynergyBonus
  ): void {
    const fireAngle = Math.atan2((target.y || 800) - fromPos.y, (target.x || 375) - fromPos.x);
    this.projectileManager.playMuzzleFlash(fromPos.x, fromPos.y, fireAngle);

    // Audio SFX synthesis from new SoundManager
    if (weapon.configId.includes('cannon') || weapon.configId.includes('catapult')) {
      SoundManager.getInstance().playCannonBlast();
    } else if (weapon.configId.includes('rocket')) {
      SoundManager.getInstance().playRocketVolley();
    } else if (weapon.configId.includes('crossbow')) {
      SoundManager.getInstance().playCrossbowTwang();
    } else {
      SoundManager.getInstance().playArquebusShot();
    }

    const isHighArc = weapon.configId.includes('cannon') || weapon.configId.includes('catapult') || weapon.footprint.width > 1;

    const affixCtx = this.getAffixCalculationContext();

    // Include active additive bonuses from this.affixEngine, commander, and spatial synergy
    const commanderAdditive: number[] = [];
    const passive = this.commander.getPassive();
    if (weapon.faction === 'fire' && passive.fireAtkBonus) {
      commanderAdditive.push(passive.fireAtkBonus);
    }
    if (weapon.faction === 'fire' && (this.metaSnapshot?.martial?.fireAdditiveBonus ?? 0) > 0) {
      commanderAdditive.push(this.metaSnapshot.martial.fireAdditiveBonus);
    }
    if (spatialBonus?.additiveDmgBonus) {
      commanderAdditive.push(spatialBonus.additiveDmgBonus);
    }

    const forgeBonus = this.metaSnapshot?.weaponForgeBonuses?.[weapon.configId];
    let atkMultiplier = this.metaSnapshot?.weaponAtkMultipliers?.[weapon.configId] ?? 1.0;
    if (forgeBonus?.atkBonus) {
      atkMultiplier += forgeBonus.atkBonus;
    }
    const effectiveWeapon: WeaponInstance = atkMultiplier !== 1.0
      ? { ...weapon, baseAtk: Math.round(weapon.baseAtk * atkMultiplier) }
      : weapon;

    const damageContext = this.affixManager.populateDamageContext(
      effectiveWeapon,
      target,
      affixCtx,
      commanderAdditive
    );

    // Ensure baseline crit stats if not granted by tactics
    if (damageContext.critRateBonus === 0) {
      damageContext.critRateBonus = 0.15;
    }
    if (damageContext.critDmgBonus === 0) {
      damageContext.critDmgBonus = 0.20;
    }

    if (spatialBonus?.critRateBonus) {
      damageContext.critRateBonus = (damageContext.critRateBonus || 0) + spatialBonus.critRateBonus;
    }
    if (spatialBonus?.critDmgBonus) {
      damageContext.critDmgBonus = (damageContext.critDmgBonus || 0) + spatialBonus.critDmgBonus;
    }

    // Spatial synergy status effects (Burn / Freeze / Wall Lifesteal)
    if (spatialBonus?.applyBurnChance && Math.random() < spatialBonus.applyBurnChance) {
      target.burnStacks = Math.min(8, (target.burnStacks || 0) + 1);
      target.isBurning = true;
    }
    if (spatialBonus?.applyFreeze) {
      target.freezeStacks = Math.min(3, (target.freezeStacks || 0) + 1);
      if (target.freezeStacks >= 3) {
        target.isFrozen = true;
        target.frozenTimer = 1.5;
      }
    }
    if (spatialBonus?.wallLifestealOnHit && spatialBonus.wallLifestealOnHit > 0) {
      this.waveFSM.repairWall(spatialBonus.wallLifestealOnHit);
    }

    if (this.metaSnapshot?.martial?.critRateBonus) {
      damageContext.critRateBonus = (damageContext.critRateBonus || 0) + this.metaSnapshot.martial.critRateBonus;
    }
    if (this.metaSnapshot?.martial?.critDmgMultiplierBonus) {
      damageContext.critDmgBonus = (damageContext.critDmgBonus || 0) + this.metaSnapshot.martial.critDmgMultiplierBonus;
    }

    // Apply forge equipment crit & armor pierce bonuses
    if (forgeBonus?.critRateBonus) {
      damageContext.critRateBonus = (damageContext.critRateBonus || 0) + forgeBonus.critRateBonus;
    }
    if (forgeBonus?.critDmgBonus) {
      damageContext.critDmgBonus = (damageContext.critDmgBonus || 0) + forgeBonus.critDmgBonus;
    }
    if (forgeBonus?.armorPierce) {
      damageContext.sunderFlat = (damageContext.sunderFlat || 0) + forgeBonus.armorPierce;
    }

    const proj: ProjectileState = {
      id: `proj_${Date.now()}_${Math.random()}`,
      attackerId: weapon.id,
      targetId: target.id,
      startX: fromPos.x,
      startY: fromPos.y,
      currentX: fromPos.x,
      currentY: fromPos.y,
      visualY: fromPos.y,
      targetX: target.x || 375,
      targetY: target.y || 800,
      speed: 16.0,
      progress: 0,
      travelTime: isHighArc ? 0.7 : 0.4,
      elapsedTime: 0,
      isHighArc,
      arcHeight: isHighArc ? 90 : 0,
      isHit: false,
      damageContext,
      aoeRadius: weapon.footprint.width > 1 ? 2.0 : 0
    };

    this.projectileManager.addProjectile(proj);

    // Schedule hit resolution when projectile reaches target
    this.time.delayedCall(proj.travelTime * 1000 / this.gameSpeed, () => {
      this.resolveProjectileHit(proj, target);
    });
  }

  private resolveProjectileHit(proj: ProjectileState, target: EnemyEntity): void {
    if (!this.waveSpawner.getActiveEnemies().some(e => e.id === target.id)) return;

    // Strict 7-step pipeline calculation (with environment modifiers)
    const envMods = this.campaignWaveEngine?.getEnvironmentModifiers();
    if (envMods && envMods.directRangedDamageMultiplier !== 1.0 && proj.damageContext) {
      proj.damageContext.attacker.baseAtk *= envMods.directRangedDamageMultiplier;
    }
    const result = DamagePipeline.calculate(proj.damageContext);
    target.currentHp = Math.max(0, target.currentHp - result.actualHpDeducted);

    // Play impact SFX (shield bash for shielded/armored enemies, blade clank for regular)
    if ((target.shield && target.shield > 0) || (target.armor && target.armor > 20)) {
      SoundManager.getInstance().playShieldBash();
    } else {
      SoundManager.getInstance().playBladeClank();
    }

    // Critical hits: play crit gong SFX
    if (result.isCrit) {
      SoundManager.getInstance().playCritGong();
      PlatformBridge.getPlatform().vibrateShort('light');
    }

    // Record damage and check kill for combat stats
    const isKill = target.currentHp <= result.actualHpDeducted;
    this.combatStatsTracker.recordDamage(proj.attackerId, result.actualHpDeducted, isKill);

    // Visual hit reaction & ghost health bar update
    const enemySprite = this.enemySprites.get(target.id);
    if (enemySprite) {
      enemySprite.playHitFlash(result.isCrit);
      enemySprite.updateHp();
    }

    // Emit impact sparks
    this.combatParticleManager?.emitImpactSparks(target.x || 375, target.y || 800, result.isCrit);

    // Subtle camera shake & hit-stop for crits, high-arc artillery, or AoE explosions
    if (result.isCrit || proj.isHighArc || (proj.aoeRadius && proj.aoeRadius > 0)) {
      this.triggerSubtleShake(result.isCrit ? 'crit_impact' : 'heavy_cannon');
      enemySprite?.triggerHitStop(proj.isHighArc ? 0.050 : 0.033);
    }

    // Show floating damage number (with 150ms clustering & anti-occlusion anchor)
    this.floatingTextPool.spawnDamage(
      target.id,
      target.x || 375,
      target.y || 800,
      result.finalDamage,
      result.isCrit,
      target.isBoss
    );

    // Dynamic crater decal on heavy/artillery/aoe projectile impact
    if (proj.isHighArc || (proj.aoeRadius && proj.aoeRadius > 0)) {
      this.battlefieldEnv?.stampScorchCrater(target.x || 375, target.y || 800, 24);
    }

    // Elemental Reaction Evaluation
    this.evaluateElementalReactions(proj, target);

    // Red-Gold Dual-Weapon Awakening Evaluation
    this.evaluateRedGoldAwakenings(proj, target);

    // Check death
    if (target.currentHp <= 0) {
      this.waveSpawner.recordKill(target.id);
    }
  }

  private evaluateElementalReactions(proj: ProjectileState, target: EnemyEntity): void {
    if (!this.elementStateManager || !this.elementalVfx) return;

    const attackerWeapon = this.unitSprites.get(proj.attackerId)?.weapon ||
      this.gridModel.getAllWeapons().find(w => w.id === proj.attackerId);
    if (!attackerWeapon) return;

    const status = this.elementStateManager.getOrCreateStatus(target.id);
    const curTime = this.time.now / 1000;
    const targetX = target.x || 375;
    const targetY = target.y || 800;
    const enemySprite = this.enemySprites.get(target.id);

    const faction = attackerWeapon.faction;
    const configId = attackerWeapon.configId;

    // 1. Fire faction or fire weapons (fire_lance, rocket_box, thunder_thrower, red_cannon, flame_beast)
    if (faction === 'fire' || configId.includes('fire') || configId.includes('cannon') || configId.includes('rocket')) {
      applyBurn(status, 1);

      // Reaction 1: 【猛火轰爆】 (Oil + Fire)
      if (status.hasOil) {
        const expRes = triggerExplosion(status, curTime);
        if (expRes.triggered) {
          SoundManager.getInstance().playFireBlastReaction();
          this.elementalVfx.playFireBlast(targetX, targetY);
          target.currentHp = Math.max(0, target.currentHp - expRes.damage);
          this.floatingTextPool.spawn(targetX, targetY - 10, expRes.damage.toFixed(0), 'fire');
          if (enemySprite) {
            enemySprite.playHitFlash(true);
            enemySprite.triggerHitStop(0.050);
            enemySprite.updateHp();
          }
          this.triggerSubtleShake('elemental_blast');
          this.combatParticleManager?.emitImpactSparks(targetX, targetY, true);
          this.combatParticleManager?.emitImpactSmoke(targetX, targetY);
        }
      }

      // Reaction 2: 【雷火天劫】 (Shock + Burn >= 3)
      if (status.hasShock && status.burnStacks >= 3) {
        const thundRes = triggerThunderStrike(status, target);
        if (thundRes.triggered) {
          SoundManager.getInstance().playThunderJudgementReaction();
          this.elementalVfx.playThunderJudgement(targetX, targetY);
          if (enemySprite) {
            enemySprite.playHitFlash(true);
            enemySprite.triggerHitStop(0.050);
            enemySprite.updateHp();
          }
          this.triggerSubtleShake('elemental_blast');
          this.combatParticleManager?.emitImpactSparks(targetX, targetY, true);
          this.combatParticleManager?.emitImpactSmoke(targetX, targetY);
        }
      }

      // Reaction 4: 【幽冥毒火】 (Poison + Fire)
      if (status.hasPoison) {
        const poisRes = triggerPoisonFire(status);
        if (poisRes.triggered) {
          SoundManager.getInstance().playNetherPoisonReaction();
          this.elementalVfx.playNetherPoisonFlame(targetX, targetY);
          if (enemySprite) {
            enemySprite.playHitFlash(true);
            enemySprite.triggerHitStop(0.050);
            enemySprite.updateHp();
          }
          this.triggerSubtleShake('elemental_blast');
          this.combatParticleManager?.emitImpactSparks(targetX, targetY, true);
          this.combatParticleManager?.emitImpactSmoke(targetX, targetY);
        }
      }
    }

    // 2. Mohist / Blunt physical weapons (catapult, repeating_crossbow, iron_caltrop)
    if (faction === 'mohist' || configId.includes('catapult') || configId.includes('caltrop')) {
      // Reaction 3: 【碎冰崩裂】 (Frozen + Blunt)
      if (status.isFrozen) {
        const iceRes = triggerIceShatter(status, target, curTime);
        if (iceRes.triggered) {
          SoundManager.getInstance().playIceShatterReaction();
          this.elementalVfx.playIceShatter(targetX, targetY);
          target.currentHp = Math.max(0, target.currentHp - iceRes.damage);
          this.floatingTextPool.spawn(targetX, targetY - 10, iceRes.damage.toFixed(0), 'ice');
          if (enemySprite) {
            enemySprite.playHitFlash(true);
            enemySprite.triggerHitStop(0.050);
            enemySprite.updateHp();
          }
          this.triggerSubtleShake('elemental_blast');
          this.combatParticleManager?.emitImpactSparks(targetX, targetY, true);
          this.combatParticleManager?.emitImpactSmoke(targetX, targetY);
        }
      }
    }

    // 3. Fortress weapons apply elemental primers
    if (configId.includes('oil')) {
      applyOil(status);
    } else if (configId.includes('electric')) {
      applyShock(status);
    }

    // 4. Qimen weapons apply freeze or poison primers
    if (configId.includes('stargazer')) {
      applyFreeze(status);
    } else if (configId.includes('poison') || configId.includes('bureau')) {
      applyPoison(status);
    }
  }

  private evaluateRedGoldAwakenings(proj: ProjectileState, target: EnemyEntity): void {
    if (!this.affixManager) return;

    const attackerWeapon = this.unitSprites.get(proj.attackerId)?.weapon ||
      this.gridModel.getAllWeapons().find(w => w.id === proj.attackerId);
    if (!attackerWeapon) return;

    const targetX = target.x || 375;
    const targetY = target.y || 800;
    const activeEnemies = this.waveSpawner.getActiveEnemies();

    // 1. T33 【九天雷池轰 / 红夷雷火炮】 (red_cannon + electric_grid)
    if (
      this.affixManager.isT33ThunderPoolActive() &&
      (attackerWeapon.configId.includes('cannon') || attackerWeapon.configId.includes('red_cannon'))
    ) {
      this.floatingTextPool?.spawn(targetX, targetY - 45, '⚡ 九天雷池轰!', 'shock');
      this.elementalVfx?.playThunderJudgement(targetX, targetY);
      SoundManager.getInstance().playThunderJudgementReaction();
      this.triggerSubtleShake('heavy_cannon');

      // 2.5m radius ~ 170px shockwave
      const radiusPx = 170;
      for (const e of activeEnemies) {
        const dist = Math.hypot((e.x || 375) - targetX, (e.y || 800) - targetY);
        if (dist <= radiusPx) {
          // 50% armor shred and 1.2s paralyze
          e.armor = Math.round(e.armor * 0.50);
          e.isStunned = true;
          e.stunTimer = 1.2;
          const lightningDmg = Math.round(attackerWeapon.baseAtk * 0.8);
          e.currentHp = Math.max(0, e.currentHp - lightningDmg);
          this.floatingTextPool?.spawnDamage(e.id, e.x || 375, e.y || 800, lightningDmg, true, e.isBoss);
          const sprite = this.enemySprites.get(e.id);
          sprite?.playHitFlash(true);
          sprite?.updateHp();
        }
      }
    }

    // 2. T34 【暴雨火箭车】 (repeating_crossbow + rocket_box)
    if (
      this.affixManager.isT34StormRocketActive() &&
      attackerWeapon.configId.includes('crossbow')
    ) {
      // Secondary mini-explosive rockets
      const splashRadiusPx = 100;
      for (const e of activeEnemies) {
        if (e.id === target.id) continue;
        const dist = Math.hypot((e.x || 375) - targetX, (e.y || 800) - targetY);
        if (dist <= splashRadiusPx) {
          const splashDmg = Math.round(attackerWeapon.baseAtk * 0.5);
          e.currentHp = Math.max(0, e.currentHp - splashDmg);
          this.floatingTextPool?.spawnDamage(e.id, e.x || 375, e.y || 800, splashDmg, false, e.isBoss);
          this.combatParticleManager?.emitImpactSparks(e.x || 375, e.y || 800, false);
          const sprite = this.enemySprites.get(e.id);
          sprite?.updateHp();
        }
      }
    }

    // 3. T35 【真·火龙出水 / 铁浮屠火牛阵】 (rocket_box + oil_cabinet / spear_camp)
    if (
      this.affixManager.isT35FireDragonActive() &&
      attackerWeapon.configId.includes('rocket')
    ) {
      this.floatingTextPool?.spawn(targetX, targetY - 45, '🔥 真·火龙出水!', 'fire');
      this.elementalVfx?.playFireBlast(targetX, targetY);
      this.battlefieldEnv?.stampScorchCrater(targetX, targetY, 36);
      SoundManager.getInstance().playFireBlastReaction();

      // Ignite enemies and trigger instant oil fire reaction
      const fireDragonRadius = 140;
      for (const e of activeEnemies) {
        const dist = Math.hypot((e.x || 375) - targetX, (e.y || 800) - targetY);
        if (dist <= fireDragonRadius) {
          e.burnStacks = Math.min(8, (e.burnStacks || 0) + 2);
          e.isBurning = true;
          const dragonBurnDmg = Math.round(attackerWeapon.baseAtk * 0.9);
          e.currentHp = Math.max(0, e.currentHp - dragonBurnDmg);
          this.floatingTextPool?.spawnDamage(e.id, e.x || 375, e.y || 800, dragonBurnDmg, true, e.isBoss);
          const sprite = this.enemySprites.get(e.id);
          sprite?.updateHp();
        }
      }
    }

    // 4. T36 【泰山陨冰劫 / 九天星陨石】 (catapult + stargazer)
    if (
      this.affixManager.isT36IceMeteorActive() &&
      attackerWeapon.configId.includes('catapult')
    ) {
      this.floatingTextPool?.spawn(targetX, targetY - 45, '❄️ 泰山陨冰劫!', 'ice');
      this.elementalVfx?.playIceShatter(targetX, targetY);
      SoundManager.getInstance().playIceShatterReaction();
      this.triggerSubtleShake('heavy_cannon');

      // Freeze all active enemies for 2.5s
      for (const e of activeEnemies) {
        e.freezeStacks = 3;
        e.isFrozen = true;
        e.frozenTimer = 2.5;

        // If Boss: deal 6% max HP true shatter execution
        if (e.isBoss) {
          const bossCut = Math.max(10, Math.round(e.maxHp * 0.06));
          e.currentHp = Math.max(0, e.currentHp - bossCut);
          this.floatingTextPool?.spawn(e.x || 375, (e.y || 800) - 25, `破冰斩首 -${bossCut}!`, 'crit');
          const sprite = this.enemySprites.get(e.id);
          sprite?.playHitFlash(true);
          sprite?.updateHp();
        }
      }
    }
  }

  private handleWaveClear(): void {
    this.isProcessingWaveClear = true;
    const currentWave = this.waveFSM.getCurrentWave();

    // 1. Calculate stipend + interest
    const income = EconomyEngine.calculateIncome(currentWave, this.wallet.getBalance());
    this.wallet.earn(income.total, `Wave ${currentWave} Clear (Stipend ${income.stipend} + Interest ${income.interest})`);
    this.events.emit('currencyChanged', this.wallet.getBalance());

    SoundManager.getInstance().playVictoryFanfare();

    this.floatingTextPool.spawn(
      375,
      500,
      `第 ${currentWave} 波大捷！俸禄 +${income.stipend}，利息 +${income.interest}`,
      'crit'
    );

    // 2. Transition FSM
    this.waveFSM.completeBattle();
    this.waveFSM.openDecreeReward();

    // 2.5 Restore all frontline weapons to full HP and clear broken state
    FrontlineDefenseManager.restoreAllAtWaveClear(this.gridModel.getAllWeapons());
    this.refreshAllUnitSprites();

    // 3. Emit decree reward event for UI scene to pop up 3-choose-1 tactics
    this.events.emit('openDecreeModal', currentWave);

    // FTUE step 2 completion
    if (this.ftueManager.getStep() === FTUEStep.STEP_2_AUTO_MOW_INFANTRY) {
      this.ftueManager.onWaveCleared(currentWave);
      this.events.emit('ftueStepCompleted', FTUEStep.STEP_2_AUTO_MOW_INFANTRY);
    }
  }

  public onDecreePicked(cardId: string): void {
    this.tacticsDeck.pick(cardId);
    this.affixManager.mountCard(cardId, {
      grantSilver: (amt) => this.wallet.earn(amt),
      healWall: (amt) => this.waveFSM.repairWall(amt)
    });

    // Transition to Income -> Prep
    this.waveFSM.claimDecree(cardId);
    this.waveFSM.finishIncome();

    // Start next wave
    this.startCurrentWave();
  }

  public startUltimateAim(cmdId: string, screenX: number, screenY: number): void {
    this.isAimingUltimate = true;
    this.currentAimPoint = { x: screenX, y: screenY, isCancel: false };
    this.ultimateAimIndicator?.show(cmdId, screenX, screenY);
  }

  public updateUltimateAim(screenX: number, screenY: number): void {
    if (!this.isAimingUltimate) return;
    const isCancel = screenY >= 1230 || screenY < 480;
    this.currentAimPoint = { x: screenX, y: screenY, isCancel };
    const targets = this.getTargetedEnemiesForAim();
    this.ultimateAimIndicator?.updatePosition(screenX, screenY, isCancel, targets);
  }

  public endUltimateAim(): void {
    this.isAimingUltimate = false;
    this.currentAimPoint = undefined;
    this.ultimateAimIndicator?.hide();
  }

  public showTacticalFloatingNotice(msg: string): void {
    this.floatingTextPool?.spawn(375, 1180, msg, 'normal');
  }

  public getAutoAimTarget(): { x: number; y: number } {
    const activeEnemies = (this.waveSpawner?.getActiveEnemies() || []).filter(e => e.currentHp > 0);
    if (activeEnemies.length === 0) {
      return { x: 375, y: 800 };
    }
    let best = activeEnemies[0];
    let minWallDist = 99999;
    for (const enemy of activeEnemies) {
      if (enemy.isBoss) {
        return { x: enemy.x || 375, y: enemy.y || 800 };
      }
      const dist = enemy.y || 999;
      if (dist < minWallDist) {
        minWallDist = dist;
        best = enemy;
      }
    }
    return { x: best.x || 375, y: best.y || 800 };
  }

  public getTargetedEnemiesForAim(): { x: number; y: number }[] {
    if (!this.isAimingUltimate || !this.currentAimPoint || this.currentAimPoint.isCancel) {
      return [];
    }
    const enemies = (this.waveSpawner?.getActiveEnemies() || []).filter(e => e.currentHp > 0);
    const tx = this.currentAimPoint.x;
    const ty = this.currentAimPoint.y;
    const cmdId = this.commander?.config?.id || 'wang_shouren';

    if (cmdId === 'qin_liangyu') {
      return enemies
        .filter(e => Math.abs((e.x || 375) - tx) <= 120 && (e.y || 800) >= 540)
        .map(e => ({ x: e.x || 375, y: e.y || 800 }));
    }

    const radius = cmdId === 'liu_bowen' ? 140 : (cmdId === 'wang_shouren' ? 120 : 150);
    return enemies
      .filter(e => Math.hypot((e.x || 375) - tx, (e.y || 800) - ty) <= radius)
      .map(e => ({ x: e.x || 375, y: e.y || 800 }));
  }

  public castCommanderUltimate(target?: { x: number; y: number }): boolean {
    if (!this.commander.canCastUltimate()) return false;

    const res = this.commander.castUltimate(target);
    if (res.success) {
      this.events.emit('rageChanged', this.commander.rage);

      const cmdId = this.commander.config.id;
      switch (cmdId) {
        case 'qin_huali':
          this.castQinHualiUltimate(res, target);
          break;
        case 'qin_liangyu':
          this.castQinLiangyuUltimate(res, target);
          break;
        case 'liu_bowen':
          this.castLiuBowenUltimate(res, target);
          break;
        case 'wang_shouren':
        default:
          this.castWangShourenUltimate(res, target);
          break;
      }

      return true;
    }
    return false;
  }

  /**
   * 1. 王守仁【知行合一·万炮齐发】
   * 全城器械金色爆发，重置装填，攻速+150%，火器必出多重连射；
   * 若指定落点，4门重炮集火轰炸落点区域造成400点爆发伤害！
   */
  private castWangShourenUltimate(res: UltimateCastResult, target?: { x: number; y: number }): void {
    SoundManager.getInstance().playUltimateVoice();
    SoundManager.getInstance().playCannonBlast();
    const aim = target || this.getAutoAimTarget();
    this.floatingTextPool.spawn(375, 400, '绝技：知行合一·万炮齐发！全军攻速+150%！', 'crit');

    // Flash entire screen golden
    const flash = this.add.graphics().setDepth(100);
    flash.fillStyle(0xffd700, 0.4);
    flash.fillRect(0, 0, 750, 1334);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy()
    });

    if (res.ultimate?.resetAllWeaponCooldowns) {
      for (const weapon of this.gridModel.getAllWeapons()) {
        this.weaponAttackTimers.set(weapon.id, 999);
      }
    }

    // Golden blast ring burst on each weapon
    for (const sprite of this.unitSprites.values()) {
      const burst = this.add.graphics().setDepth(50);
      burst.setPosition(sprite.x, sprite.y);
      burst.lineStyle(3, 0xffd700, 1.0);
      burst.strokeCircle(0, 0, 12);
      burst.fillStyle(0xffea00, 0.85);
      burst.fillCircle(0, 0, 6);
      this.tweens.add({
        targets: burst,
        scaleX: 2.8,
        scaleY: 2.8,
        alpha: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => burst.destroy()
      });
    }

    // 4 Consecutive Concentrated Artillery Shell Explosions on Aim
    for (let s = 0; s < 4; s++) {
      this.time.delayedCall(s * 80, () => {
        const sx = aim.x + (Math.random() - 0.5) * 50;
        const sy = aim.y + (Math.random() - 0.5) * 50;

        const shell = this.add.graphics().setDepth(53);
        shell.setPosition(sx, sy);
        shell.fillStyle(0xff9100, 0.85);
        shell.fillCircle(0, 0, 24);
        shell.lineStyle(3, 0xffd700, 1.0);
        shell.strokeCircle(0, 0, 36);

        this.tweens.add({
          targets: shell,
          scaleX: 2.2,
          scaleY: 2.2,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeOut',
          onComplete: () => shell.destroy()
        });

        this.emitBombardSparks(sx, sy);
      });
    }

    // Apply 400 damage to enemies within 140px of aim point
    const activeEnemies = this.waveSpawner.getActiveEnemies();
    for (const enemy of activeEnemies) {
      if (enemy.currentHp <= 0) continue;
      const dist = Math.hypot((enemy.x || 375) - aim.x, (enemy.y || 800) - aim.y);
      if (dist <= 140) {
        enemy.currentHp -= 400;
        this.floatingTextPool.spawn(enemy.x || 375, enemy.y || 800, '-400 集火强袭', 'crit');
        this.combatStatsTracker.recordDamage('commander_wang_shouren', 400, enemy.currentHp <= 0);
        if (enemy.currentHp <= 0) {
          this.waveSpawner.recordKill(enemy.id);
          this.removeEnemyVisual(enemy.id);
        }
      }
    }

    this.cameras.main.shake(280, 0.010);
  }

  private emitBombardSparks(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const p = this.add.circle(x, y, 3, 0xffd54f, 1.0).setDepth(54);
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 40;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 300 + Math.random() * 100,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  /**
   * 2. 禽滑厘【兼爱非攻·铁壁天幕】
   * 城头前（Y: 540~560px）生成持续 6.0s 的青金八卦半透明结界光罩，吸收近战伤害并向攻击者回弹金光微粒；
   * 若指向坡道战场（Y > 580），在落点爆发墨家机关脉冲震荡波击退并减速敌军！
   */
  private castQinHualiUltimate(_res: UltimateCastResult, target?: { x: number; y: number }): void {
    SoundManager.getInstance().playShieldBash();
    const aim = target || { x: 375, y: 550 };
    this.floatingTextPool.spawn(375, 400, '绝技：兼爱非攻·铁壁天幕！6秒机关结界！', 'crit');

    // Shimmering cyan flash
    const flash = this.add.graphics().setDepth(100);
    flash.fillStyle(0x00e5ff, 0.28);
    flash.fillRect(0, 0, 750, 1334);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy()
    });

    // Destroy any prior barrier visual
    if (this.barrierVisual) {
      this.barrierVisual.destroy();
    }

    const barrier = this.add.container(0, 0).setDepth(45);
    this.barrierVisual = barrier;

    // Cyan energy barrier field across Y: 538 ~ 568 (height 30px)
    const bg = this.add.graphics();
    bg.fillStyle(0x00e5ff, 0.35);
    bg.fillRect(0, 538, 750, 30);
    bg.lineStyle(2, 0xffd700, 0.95);
    bg.strokeRect(0, 538, 750, 30);
    bg.lineStyle(1.2, 0x80deea, 0.7);
    bg.strokeRect(2, 541, 746, 24);

    // Eight Bagua energy nodes along the wall barrier
    for (let x = 40; x <= 710; x += 55) {
      bg.fillStyle(0xffd700, 0.9);
      bg.fillCircle(x, 553, 4.5);
      bg.lineStyle(1.2, 0x00e5ff, 0.9);
      bg.strokeCircle(x, 553, 9);
    }
    barrier.add(bg);

    // Breathing pulse tween
    this.tweens.add({
      targets: barrier,
      alpha: { from: 0.5, to: 0.95 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Auto-dismiss safety timer (6.0s duration)
    this.time.delayedCall(6000, () => {
      this.dismissBarrierVisual();
    });

    // If targeted out into battlefield (Y > 580): trigger kinetic shockwave
    if (aim.y > 580) {
      const shockwave = this.add.graphics().setDepth(52);
      shockwave.setPosition(aim.x, aim.y);
      shockwave.fillStyle(0x00e5ff, 0.25);
      shockwave.fillCircle(0, 0, 30);
      shockwave.lineStyle(3, 0xffd700, 1.0);
      shockwave.strokeCircle(0, 0, 30);

      this.tweens.add({
        targets: shockwave,
        scaleX: 4.8,
        scaleY: 4.8,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => shockwave.destroy()
      });

      const activeEnemies = this.waveSpawner.getActiveEnemies();
      for (const enemy of activeEnemies) {
        if (enemy.currentHp <= 0) continue;
        const dist = Math.hypot((enemy.x || 375) - aim.x, (enemy.y || 800) - aim.y);
        if (dist <= 150) {
          enemy.currentHp -= 350;
          enemy.y = Math.min(1200, (enemy.y || 1120) + 136);
          this.floatingTextPool.spawn(enemy.x || 375, enemy.y || 800, '-350 机关震击', 'crit');
          this.combatStatsTracker.recordDamage('commander_qin_huali', 350, enemy.currentHp <= 0);

          const sprite = this.enemySprites.get(enemy.id);
          if (sprite) {
            sprite.setPosition(enemy.x || 375, enemy.y);
          }
          if (ThreeSceneManager.getInstance().getRenderMode() === '3d') {
            ThreeSceneManager.getInstance().addOrUpdateEnemy(enemy, enemy.x || 375, enemy.y);
          }
          if (enemy.currentHp <= 0) {
            this.waveSpawner.recordKill(enemy.id);
            this.removeEnemyVisual(enemy.id);
          }
        }
      }
    }
  }

  public dismissBarrierVisual(): void {
    if (this.barrierVisual) {
      const b = this.barrierVisual;
      this.barrierVisual = undefined;
      this.tweens.add({
        targets: b,
        alpha: 0,
        duration: 250,
        onComplete: () => b.destroy()
      });
    }
  }

  public emitBarrierSparks(x: number, y: number): void {
    const numSparks = 10;
    for (let i = 0; i < numSparks; i++) {
      const p = this.add.circle(x, y, 2.5, 0xffd700, 1.0).setDepth(48);
      const angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
      const dist = 30 + Math.random() * 45;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 350 + Math.random() * 100,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  /**
   * 3. 秦良玉【铁骑勤王·八面合围】
   * 8 列精锐白杆骑兵向城外发起冲锋；若指定走廊瞄准点，战骑呈楔形阵向目标集结贯穿冲锋！
   */
  private castQinLiangyuUltimate(_res: UltimateCastResult, target?: { x: number; y: number }): void {
    SoundManager.getInstance().playCritGong();
    SoundManager.getInstance().playBladeClank();
    const aim = target || this.getAutoAimTarget();
    this.floatingTextPool.spawn(375, 400, '绝技：铁骑勤王·八面合围！破阵冲锋！', 'crit');
    this.cameras.main.shake(400, 0.014);

    const cols = 8;
    const centerColX = aim.x;
    for (let i = 0; i < cols; i++) {
      const colOffset = (i - 3.5) * 36;
      const colX = Math.max(60, Math.min(690, centerColX + colOffset));
      const cavalry = this.add.container(colX, 550).setDepth(48);

      const cg = this.add.graphics();
      // White lance spear tip
      cg.fillStyle(0xffffff, 1.0);
      cg.fillTriangle(0, 28, -6, 0, 6, 0);
      // Armored cavalry horse silhouette
      cg.fillStyle(0xffb74d, 0.75);
      cg.fillRect(-8, -25, 16, 25);
      cg.fillStyle(0x5d4037, 0.85);
      cg.fillRect(-12, -45, 24, 20);
      // Speed trail lines
      cg.lineStyle(2, 0xffd54f, 0.9);
      cg.lineBetween(0, -45, 0, -75);
      cavalry.add(cg);

      const delay = Math.abs(i - 3.5) * 25;
      this.tweens.add({
        targets: cavalry,
        y: 1240,
        delay,
        duration: 550,
        ease: 'Quad.easeIn',
        onComplete: () => cavalry.destroy()
      });
    }

    // Apply damage & knockback to active enemies:
    // Enemies in charging corridor (|enemy.x - centerColX| <= 140) take 650 damage and 3.5m (238px) knockback
    // Others take 400 damage and 2.0m (136px) knockback
    const activeEnemies = this.waveSpawner.getActiveEnemies();
    for (const enemy of activeEnemies) {
      if (enemy.currentHp <= 0) continue;
      const inCorridor = Math.abs((enemy.x || 375) - centerColX) <= 140;
      const dmg = inCorridor ? 650 : 400;
      const kb = inCorridor ? 238 : 136;

      enemy.currentHp -= dmg;
      enemy.y = Math.min(1200, (enemy.y || 1120) + kb);
      this.floatingTextPool.spawn(enemy.x || 375, enemy.y || 800, inCorridor ? `-${dmg} 破阵穿刺` : `-${dmg} 击退`, 'crit');
      this.combatStatsTracker.recordDamage('commander_qin_liangyu', dmg, enemy.currentHp <= 0);

      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        sprite.setPosition(enemy.x || 375, enemy.y);
      }
      if (ThreeSceneManager.getInstance().getRenderMode() === '3d') {
        ThreeSceneManager.getInstance().addOrUpdateEnemy(enemy, enemy.x || 375, enemy.y);
      }

      if (enemy.currentHp <= 0) {
        this.waveSpawner.recordKill(enemy.id);
        this.removeEnemyVisual(enemy.id);
      }
    }
  }

  /**
   * 4. 刘伯温【奇门遁甲·天雷九烈】
   * 苍穹贯穿降下 9 道苍蓝落雷霹雳；若指定落点，7 道暴雷集火聚歼目标区域并施加全员感电！
   */
  private castLiuBowenUltimate(_res: UltimateCastResult, target?: { x: number; y: number }): void {
    SoundManager.getInstance().playThunderJudgementReaction();
    const aim = target || this.getAutoAimTarget();
    this.floatingTextPool.spawn(375, 400, '绝技：奇门遁甲·天雷九烈！九曜苍雷！', 'crit');
    this.cameras.main.shake(600, 0.016);

    // Screen darkening scrim
    const darkScrim = this.add.graphics().setDepth(90);
    darkScrim.fillStyle(0x0a0c16, 0.72);
    darkScrim.fillRect(0, 0, 750, 1334);
    this.tweens.add({
      targets: darkScrim,
      alpha: { from: 0.72, to: 0 },
      duration: 650,
      ease: 'Linear',
      onComplete: () => darkScrim.destroy()
    });

    // Electric Grid Network across the battlefield
    const grid = this.add.graphics().setDepth(51);
    grid.lineStyle(1.6, 0x00e5ff, 0.85);
    for (let line = 0; line < 14; line++) {
      const x1 = 70 + Math.random() * 610;
      const y1 = 580 + Math.random() * 520;
      const x2 = x1 + (Math.random() - 0.5) * 120;
      const y2 = y1 + (Math.random() - 0.5) * 80;
      grid.lineBetween(x1, y1, x2, y2);
    }
    this.tweens.add({
      targets: grid,
      alpha: 0,
      duration: 750,
      onComplete: () => grid.destroy()
    });

    // 9 Sky-to-Ground Cyan/Blue Lightning Strikes: 7 clustered on aim
    const strikeCount = 9;
    for (let i = 0; i < strikeCount; i++) {
      this.time.delayedCall(i * 55, () => {
        let strikeX: number;
        let strikeY: number;

        if (i < 7) {
          strikeX = aim.x + (Math.random() - 0.5) * 80;
          strikeY = aim.y + (Math.random() - 0.5) * 80;
        } else {
          strikeX = 90 + ((i * 120) % 570);
          strikeY = 640 + ((i * 80) % 420);
        }

        this.spawnSkyLightningBolt(strikeX, strikeY);
      });
    }

    // Apply damage & Shock status: 550 to enemies in target radius, 250 splash to others
    const activeEnemies = this.waveSpawner.getActiveEnemies();
    for (const enemy of activeEnemies) {
      if (enemy.currentHp <= 0) continue;
      const dist = Math.hypot((enemy.x || 375) - aim.x, (enemy.y || 800) - aim.y);
      const isTargeted = dist <= 160;
      const dmg = isTargeted ? 550 : 250;

      enemy.currentHp -= dmg;
      this.floatingTextPool.spawn(enemy.x || 375, enemy.y || 800, isTargeted ? `-${dmg} 九曜天劫` : `-${dmg} 感电`, 'shock');
      this.combatStatsTracker.recordDamage('commander_liu_bowen', dmg, enemy.currentHp <= 0);

      if (this.elementStateManager) {
        const status = this.elementStateManager.getOrCreateStatus(enemy.id);
        applyShock(status);
      }

      if (enemy.currentHp <= 0) {
        this.waveSpawner.recordKill(enemy.id);
        this.removeEnemyVisual(enemy.id);
      }
    }
  }

  private spawnSkyLightningBolt(x: number, y: number): void {
    const bolt = this.add.graphics().setDepth(52);
    const segments = 8;
    const dy = y / segments;
    let curX = x;
    let curY = 0;

    bolt.lineStyle(4.5, 0x00e5ff, 1.0);
    bolt.beginPath();
    bolt.moveTo(curX, curY);

    for (let s = 1; s <= segments; s++) {
      const nextY = s * dy;
      const nextX = s === segments ? x : curX + (Math.random() - 0.5) * 36;
      bolt.lineTo(nextX, nextY);
      curX = nextX;
      curY = nextY;
    }
    bolt.stroke();

    // Hot white inner core
    bolt.lineStyle(2, 0xffffff, 1.0);
    bolt.stroke();

    // Ground impact shockwave & scorch decal
    const impactG = this.add.graphics().setDepth(53);
    impactG.setPosition(x, y);
    impactG.fillStyle(0xffffff, 1.0);
    impactG.fillCircle(0, 0, 14);
    impactG.lineStyle(3, 0x00e5ff, 0.9);
    impactG.strokeCircle(0, 0, 24);

    this.battlefieldEnv?.stampScorchCrater(x, y, 22);

    this.tweens.add({
      targets: [bolt, impactG],
      alpha: 0,
      duration: 250,
      onComplete: () => {
        bolt.destroy();
        impactG.destroy();
      }
    });
  }

  public toggleGameSpeed(): number {
    this.gameSpeed = this.gameSpeed === 1.0 ? 2.0 : 1.0;
    return this.gameSpeed;
  }

  public handleStageVictory(_summary: StageCombatSummary): void {
    SoundManager.getInstance().playVictoryFanfare();

    // High-light screen recording: stop recorder and collect videoPath
    const recorder = PlatformBridge.getPlatform().getGameRecorder();
    if (recorder && recorder.isRecording()) {
      recorder.onStop((res) => {
        this.lastRecordedVideoPath = res.videoPath;
      });
      try {
        recorder.stop();
      } catch (e) {
        console.warn('[BattleScene] Recorder stop failed:', e);
      }
    }

    const hasDoubleStar4 = this.gridModel.getAllWeapons().filter(w => w.star === 4).length >= 2;
    const prevStars = this.profile?.campaign?.stageStars?.[this.stageId] ?? 0;
    const isFirstClear = prevStars === 0;
    const bossDrop = BossDropEngine.evaluateCampaignBossDrop(this.stageId, isFirstClear);

    const settlementInput = this.campaignWaveEngine.createSettlementInput({
      hasDoubleStar4Awakening: hasDoubleStar4,
      isFirstClear
    });
    const result = SettlementEvaluator.evaluate(
      settlementInput,
      prevStars
    );

    if (bossDrop && bossDrop.blueprints > 0) {
      result.rewards.blueprints = (result.rewards.blueprints || 0) + bossDrop.blueprints;
      result.rewards.iron += bossDrop.iron;
    }
    result.weaponStats = this.combatStatsTracker.getSortedStats();
    this.settlementModal.show(
      result,
      {
        onReturnHome: () => this.teardownAndExitToHome(),
        onRetry: () => {
          this.retryBattle();
        }
      },
      { videoPath: this.lastRecordedVideoPath }
    );
  }

  public handleStageDefeat(_waveReached: number): void {
    SoundManager.getInstance().playDefeatSound();

    // High-light screen recording: stop recorder and collect videoPath
    const recorder = PlatformBridge.getPlatform().getGameRecorder();
    if (recorder && recorder.isRecording()) {
      recorder.onStop((res) => {
        this.lastRecordedVideoPath = res.videoPath;
      });
      try {
        recorder.stop();
      } catch (e) {
        console.warn('[BattleScene] Recorder stop failed:', e);
      }
    }

    if (this.battleMode === 'endless') {
      const currentWave = this.waveFSM.getCurrentWave();
      const wallState = this.waveFSM.getWallState();
      const stats: EndlessSessionStats = {
        waveReached: currentWave,
        totalKills: this.endlessKills.total,
        eliteKills: this.endlessKills.elite,
        bossKills: this.endlessKills.boss,
        wallRemainingHp: wallState.currentHp,
        wallMaxHp: wallState.maxHp,
        elapsedTimeSec: Math.max(1, (Date.now() - this.endlessStartTime) / 1000)
      };

      const personalBest = this.profile.endless?.highestWave || 0;
      const endlessResult = EndlessManager.evaluateSettlement(stats, personalBest);

      // Persist to ProfileStorage
      const storage = new ProfileStorage(PlatformBridge.getPlatform());
      const p = storage.loadProfile();
      if (!p.endless) {
        p.endless = { highestWave: 0, highestScore: 0, totalRuns: 0, militaryTitle: '神机营卒', lastCityName: '北京市朝阳区' };
      }
      // Boss drop roll for endless bosses cleared
      if (this.endlessKills.boss > 0) {
        const endlessBossDrop = BossDropEngine.evaluateEndlessBossDrop(currentWave);
        if (endlessBossDrop && endlessBossDrop.blueprints > 0) {
          endlessResult.ironEarned += endlessBossDrop.iron;
          p.currencies.blueprints += endlessBossDrop.blueprints;
        }
      }

      p.endless.highestWave = Math.max(p.endless.highestWave, endlessResult.waveReached);
      p.endless.highestScore = Math.max(p.endless.highestScore, endlessResult.score);
      p.endless.totalRuns++;
      p.endless.militaryTitle = endlessResult.militaryTitle;
      p.currencies.gold += endlessResult.goldEarned;
      p.currencies.iron += endlessResult.ironEarned;
      storage.saveProfile(p);
      this.profile = p;

      const dummySettlementResult = {
        stageId: 1,
        chapterId: 1,
        cleared: false,
        stars: { stars: 0, star1Earned: false, star2Earned: false, star3Earned: false },
        newStarsEarned: 0,
        grade: 'C' as const,
        gradeTitle: '城垣失守',
        rewards: { gold: endlessResult.goldEarned, iron: endlessResult.ironEarned, blueprints: 0 },
        wallHpPercent: 0,
        wavesCleared: currentWave,
        totalWaves: 999,
        revivesUsed: this.hasRevivedThisBattle ? 1 : 0,
        hasDoubleStar4Awakening: false,
        goldMultiplier: 1.0,
        firstClearBonusApplied: false
      };

      this.settlementModal.show(
        dummySettlementResult,
        {
          onReturnHome: () => this.teardownAndExitToHome(),
          onRetry: () => {
            this.retryBattle();
          }
        },
        { videoPath: this.lastRecordedVideoPath, endlessResult }
      );
      return;
    }

    const prevStars = this.profile?.campaign?.stageStars?.[this.stageId] ?? 0;
    const settlementInput = this.campaignWaveEngine.createSettlementInput({
      hasDoubleStar4Awakening: false,
      isFirstClear: false
    });
    const result = SettlementEvaluator.evaluate(
      settlementInput,
      prevStars
    );

    const placedWeapons = this.gridModel.getAllWeapons().map(w => ({
      type: w.configId,
      star: w.star,
      faction: w.faction
    }));
    const currentWave = this.waveFSM.getCurrentWave();
    const isBossWave = Boolean(
      this.campaignWaveEngine.isBossWave(currentWave) ||
      this.stageWaveConfig?.waves?.find(w => w.waveNumber === currentWave)?.bossConfig
    );
    const bossName = this.stageConfig?.bossName || this.stageWaveConfig?.waves?.find(w => w.waveNumber === currentWave)?.bossConfig?.name;

    const defeatContext = {
      stageId: this.stageId,
      waveReached: currentWave,
      totalWaves: this.totalWaves,
      wallMaxHp: this.waveFSM.getMaxWallHp(),
      wallRemainingHp: this.waveFSM.getWallHp(),
      weaponsOnField: placedWeapons,
      commanderId: this.commander.config.id,
      commanderRage: this.commander.rage,
      revivesUsed: this.hasRevivedThisBattle ? 1 : 0,
      isBossWave,
      bossName
    };

    this.settlementModal.show(
      result,
      {
        onReturnHome: () => this.teardownAndExitToHome(),
        onRetry: () => {
          this.retryBattle();
        }
      },
      { videoPath: this.lastRecordedVideoPath, defeatContext }
    );
  }

  public promptRevival(waveReached: number): void {
    this.isBattlePaused = true;
    this.revivalModal.show({
      onWatchAd: async () => {
        this.revivalModal.pauseCountdown();
        const platform = PlatformBridge.getPlatform();
        const res = await platform.showRewardedVideoAd('ad_revive_01');
        if (res && res.isEnded) {
          this.hasRevivedThisBattle = true;
          this.revivalModal.hide();
          if (this.battleMode === 'endless') {
            this.waveFSM.revive(Math.round(this.waveFSM.getMaxWallHp() * 0.5));
          } else {
            this.campaignWaveEngine.revive(0.5);
          }

          // Restore wave state if needed
          if (this.waveFSM.getState() === 'Prep') {
            this.waveFSM.startWave();
          }

          // Trigger full-screen shockwave + knockback + 3s stun
          this.triggerRevivalShockwave();

          // SFX and floating text
          SoundManager.getInstance().playCritGong();
          this.floatingTextPool.spawn(375, 450, '神机破釜·大明急援', 'crit');
          this.events.emit('wallHpChanged', this.waveFSM.getWallState().currentHp, this.waveFSM.getWallState().maxHp);

          // Resume battle!
          this.isBattlePaused = false;
        } else {
          this.floatingTextPool.spawn(375, 530, '未完整观看军报', 'sunder');
          this.revivalModal.resumeCountdown();
        }
      },
      onAbandon: () => {
        this.revivalModal.hide();
        this.isBattlePaused = false;
        this.handleStageDefeat(waveReached);
      }
    });
  }

  public triggerRevivalShockwave(): void {
    this.cameras.main.flash(400, 255, 215, 0, false);
    this.cameras.main.shake(300, 0.02);

    // Full-screen golden expanding shockwave
    const shockwave = this.add.circle(375, 750, 20, UI_COLORS.goldBrightNum, 0.9).setDepth(200);
    this.tweens.add({
      targets: shockwave,
      radius: 450,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        shockwave.destroy();
      }
    });

    // Knockback all on-field enemies 250px downward and stun for 3 seconds
    const enemies = this.waveSpawner.getActiveEnemies();
    for (const enemy of enemies) {
      const newY = Math.min(1200, (enemy.y || 840) + 250);
      enemy.y = newY;
      enemy.distanceToWall = Math.max(0, (newY - 720) / 68);
      enemy.isParalyzed = true;

      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        this.tweens.add({
          targets: sprite,
          y: newY,
          duration: 300,
          ease: 'Back.easeOut'
        });
      }
    }

    this.time.delayedCall(3000, () => {
      for (const enemy of this.waveSpawner.getActiveEnemies()) {
        enemy.isParalyzed = false;
      }
    });
  }

  public teardownAndExitToHome(): void {
    this.isBattlePaused = false;
    if (this.scene.isActive('FTUEOverlay')) {
      this.scene.stop('FTUEOverlay');
    }
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.stop('BattleScene');
    this.scene.start('HomeScene');
  }

  public retryBattle(): void {
    this.isBattlePaused = false;
    if (ThreeSceneManager.getInstance().getRenderMode() === '3d') {
      ThreeSceneManager.getInstance().setVisible(true);
    }
    if (this.scene.isActive('FTUEOverlay')) {
      this.scene.stop('FTUEOverlay');
    }
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    const currentMode = this.battleMode;
    const currentStageId = this.stageId;
    this.scene.stop('BattleScene');
    this.scene.start('BattleScene', { stageId: currentStageId, mode: currentMode });
    this.scene.launch('UIScene');
  }

  public shutdown(): void {
    // 0. Destroy elemental vfx manager & drop flight manager & floating text pool & combat particle manager
    this.elementalVfx?.destroy();
    this.dropFlightManager?.destroy();
    this.floatingTextPool?.destroy();
    this.combatParticleManager?.destroy();
    this.combatParticleManager = undefined as any;

    // 0. Destroy battlefield environment
    this.battlefieldEnv?.destroy();
    this.battlefieldEnv = undefined;
    this.ultimateAimIndicator?.destroy();
    this.ultimateAimIndicator = undefined;

    // 1. Clear timers and tweens
    this.time.removeAllEvents();
    this.tweens.killAll();

    // 2. Destroy and clear UnitSprites
    for (const sprite of this.unitSprites.values()) {
      sprite.destroy();
    }
    this.unitSprites.clear();

    // 3. Destroy and clear EnemySprites
    for (const sprite of this.enemySprites.values()) {
      sprite.destroy();
    }
    this.enemySprites.clear();
    this.elementStateManager?.clear();

    // 4. Clear 3D manager entities
    ThreeSceneManager.getInstance().clearAll();
    ThreeSceneManager.getInstance().setVisible(false);

    // 5. Destroy settlement & revival modals
    if (this.settlementModal) {
      this.settlementModal.destroy();
    }
    if (this.revivalModal) {
      this.revivalModal.destroy();
    }

    // 6. Cleanup graphics, projectileManager, timers, listeners
    this.rangeGraphics?.destroy();
    this.projectileManager?.clearAll();
    this.weaponAttackTimers?.clear();
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
  }
}

function pointerX(col: number): number {
  const cellW = (GRID_CONFIG.endX - GRID_CONFIG.startX) / GRID_CONFIG.cols;
  return GRID_CONFIG.startX + col * cellW + cellW / 2;
}
