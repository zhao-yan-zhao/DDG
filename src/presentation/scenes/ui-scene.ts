/**
 * 《孤城神机营》- UI Scene (HUD, Armory Shop Modal, Decree Selection Modal)
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - Top Header: City Wall HP, Silver, Wave, Game Speed
 * - Bottom Command Bar: Commander Portrait, 100 Rage Bar, Ultimate Skill, Armory Button
 * - Pop-up Modals: Armory 3-Slot Shop & 3-Choose-1 Roguelike Bamboo Slips Modal
 */

import Phaser from 'phaser';
import { BattleScene } from './battle-scene';
import { ArmoryCardSlot, TacticCardConfig } from '../../core/types';
import { getWeaponConfig } from '../../config/weapons.config';
import { FACTION_COLORS } from '../renderers/unit-sprite';
import { FTUEStep } from '../../core/ftue/ftue-manager';
import { wrapCJKText } from '../utils/text-wrap';
import { ThreeSceneManager } from '../three/three-scene-manager';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from '../ui/ui-theme';
import { BronzeButton } from '../ui/bronze-button';
import { SoundManager } from '../audio/sound-manager';
import { PlatformBridge } from '../../bridge/platform';
import { EnvironmentEngine } from '../../core/wave/environment-engine';
import { PauseMenuModal } from '../ui/pause-menu-modal';
import { TacticalRadarModal } from '../ui/tactical-radar-modal';
import { WeaponTextureFactory } from '../textures/weapon-texture-factory';

interface CommanderUIBarTheme {
  shortName: string;
  avatarBg: number;
  avatarBorder: number;
  ultimateName: string;
  glowColor: number;
}

const COMMANDER_UI_THEMES: Record<string, CommanderUIBarTheme> = {
  wang_shouren: {
    shortName: '守仁',
    avatarBg: 0xd32f2f,
    avatarBorder: 0xffd700,
    ultimateName: '万炮齐发',
    glowColor: 0xffa000
  },
  qin_huali: {
    shortName: '滑厘',
    avatarBg: 0x1b2830,
    avatarBorder: 0x00e5ff,
    ultimateName: '铁壁天幕',
    glowColor: 0x00e5ff
  },
  qin_liangyu: {
    shortName: '良玉',
    avatarBg: 0x4e342e,
    avatarBorder: 0xffb74d,
    ultimateName: '铁骑勤王',
    glowColor: 0xffb74d
  },
  liu_bowen: {
    shortName: '伯温',
    avatarBg: 0x1a237e,
    avatarBorder: 0xb388ff,
    ultimateName: '天雷九烈',
    glowColor: 0x7c4dff
  }
};

export class UIScene extends Phaser.Scene {
  private battleScene!: BattleScene;
  private topOffset: number = 0;
  private bottomShift: number = 0;

  // Top HUD Elements
  private wallHpText!: Phaser.GameObjects.Text;
  private wallHpBar!: Phaser.GameObjects.Graphics;
  private silverText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private viewModeButton!: Phaser.GameObjects.Text;
  private speedButton!: Phaser.GameObjects.Text;
  private muteButton!: Phaser.GameObjects.Text;
  private pauseMenuButton!: Phaser.GameObjects.Text;
  private pauseMenuModal!: PauseMenuModal;
  private tacticalRadarButton!: Phaser.GameObjects.Text;
  private tacticalRadarModal!: TacticalRadarModal;

  // Bottom Command Bar Elements
  private rageBar!: Phaser.GameObjects.Graphics;
  private rageText!: Phaser.GameObjects.Text;
  private ultimateButton!: Phaser.GameObjects.Container;
  private ultimateText!: Phaser.GameObjects.Text;
  private shopButton!: Phaser.GameObjects.Container;
  private commanderAvatarGraphics!: Phaser.GameObjects.Graphics;
  private commanderAvatarText!: Phaser.GameObjects.Text;

  // Modals
  private shopModalContainer!: Phaser.GameObjects.Container;
  private decreeModalContainer!: Phaser.GameObjects.Container;

  // Sub-HUD Live 3-Star & Weather
  private liveStar1Text!: Phaser.GameObjects.Text;
  private liveStar2Text!: Phaser.GameObjects.Text;
  private liveStar3Text!: Phaser.GameObjects.Text;
  private weatherPillContainer!: Phaser.GameObjects.Container;
  private weatherTooltipContainer?: Phaser.GameObjects.Container;
  private waveBannerContainer?: Phaser.GameObjects.Container;
  private bossWarningVignette?: Phaser.GameObjects.Graphics;
  private bossSkillAlertContainer?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  private resetUIReferences(): void {
    this.liveStar1Text = undefined as any;
    this.liveStar2Text = undefined as any;
    this.liveStar3Text = undefined as any;
    this.wallHpBar = undefined as any;
    this.wallHpText = undefined as any;
    this.silverText = undefined as any;
    this.waveText = undefined as any;
    this.speedButton = undefined as any;
    this.muteButton = undefined as any;
    this.viewModeButton = undefined as any;
    this.pauseMenuButton = undefined as any;
    this.tacticalRadarButton = undefined as any;
    this.rageBar = undefined as any;
    this.rageText = undefined as any;
    this.commanderAvatarGraphics = undefined as any;
    this.commanderAvatarText = undefined as any;
    this.ultimateButton = undefined as any;
    this.ultimateText = undefined as any;
    this.shopButton = undefined as any;
    this.waveBannerContainer = undefined;
    this.weatherTooltipContainer = undefined;
    this.weatherPillContainer = undefined as any;
    this.bossWarningVignette = undefined;
    this.bossSkillAlertContainer = undefined;
  }

  public create(): void {
    this.resetUIReferences();
    this.battleScene = this.scene.get('BattleScene') as BattleScene;

    const insets = PlatformBridge.getPlatform().getSafeAreaInsets();
    this.topOffset = insets.top;
    this.bottomShift = Math.min(insets.bottom, 24);

    this.createTopHUD();
    this.createBottomCommandBar();
    this.createShopModal();
    this.createDecreeModal();

    this.pauseMenuModal = new PauseMenuModal(this, this.battleScene);
    this.tacticalRadarModal = new TacticalRadarModal(this, {
      getReport: () => this.battleScene.getTacticalReport()
    });

    // Keyboard bindings for pause menu (ESC / P)
    this.input.keyboard?.on('keydown-ESC', () => {
      this.togglePauseMenu();
    });
    this.input.keyboard?.on('keydown-P', () => {
      this.togglePauseMenu();
    });

    this.events.once('shutdown', () => {
      this.pauseMenuModal?.destroy();
      this.input.keyboard?.off('keydown-ESC');
      this.input.keyboard?.off('keydown-P');
      this.battleScene?.events?.off('currencyChanged');
      this.battleScene?.events?.off('wallHpChanged');
      this.battleScene?.events?.off('rageChanged');
      this.battleScene?.events?.off('waveStarted');
      this.battleScene?.events?.off('bossSkillCast');
      this.battleScene?.events?.off('openDecreeModal');
      this.battleScene?.events?.off('renderModeChanged');
      this.resetUIReferences();
    });

    this.bindBattleSceneEvents();
  }

  private createTopHUD(): void {
    const bg = this.add.graphics().setDepth(60);
    bg.fillStyle(0x121417, 0.85);
    bg.fillRect(0, 0, 750, 48 + this.topOffset);

    // 1. City Wall HP
    this.wallHpBar = this.add.graphics().setDepth(61);

    this.wallHpText = this.add.text(14, 16 + this.topOffset, '城防: 1000/1000', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setDepth(62);

    // 2. Silver Coins (大明通宝)
    this.add.image(146, 24 + this.topOffset, UI_TEXTURE_KEYS.ICON_COIN_TONGBAO)
      .setDisplaySize(20, 20)
      .setDepth(62);

    this.silverText = this.add.text(162, 16 + this.topOffset, '50 银两', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setDepth(62);

    // 3. Wave Display
    const isEndless = this.battleScene?.battleMode === 'endless';
    const totalWaves = this.battleScene?.totalWaves || 10;
    this.waveText = this.add.text(236, 16 + this.topOffset, isEndless ? '演武 · 第 1 波' : `第 1 / ${totalWaves} 波`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#90caf9',
      fontStyle: 'bold'
    }).setDepth(62);

    // 4. Render Mode Toggle (2D / 3D)
    const initialMode = ThreeSceneManager.getInstance().getRenderMode();
    this.viewModeButton = this.add.text(308, 13 + this.topOffset, initialMode === '3d' ? '⚔️ 3D (V)' : '🎨 2D (V)', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: initialMode === '3d' ? '#b71c1c' : '#37474f',
      padding: { x: 5, y: 4 }
    }).setDepth(62).setInteractive({ useHandCursor: true });

    this.viewModeButton.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      const newMode = this.battleScene.toggleRenderMode();
      this.updateViewModeButton(newMode);
    });

    // 5. Game Speed Toggle
    this.speedButton = this.add.text(388, 13 + this.topOffset, '1x 速度', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#263238',
      padding: { x: 5, y: 4 }
    }).setDepth(62).setInteractive({ useHandCursor: true });

    this.speedButton.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      const newSpeed = this.battleScene.toggleGameSpeed();
      this.speedButton.setText(`${newSpeed}x 速度`);
    });

    // 6. Guochao Mute / Unmute Button
    const isMuted = SoundManager.getInstance().getIsMuted();
    this.muteButton = this.add.text(464, 13 + this.topOffset, isMuted ? '🔇 静音' : '🎵 战乐', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#263238',
      padding: { x: 5, y: 4 }
    }).setDepth(62).setInteractive({ useHandCursor: true });

    this.muteButton.on('pointerdown', () => {
      const newMuted = SoundManager.getInstance().toggleMute();
      this.muteButton.setText(newMuted ? '🔇 静音' : '🎵 战乐');
      SoundManager.getInstance().playBronzeButtonClick();
    });

    // 7. Pause Menu Button (军机调控)
    this.pauseMenuButton = this.add.text(536, 13 + this.topOffset, '⏸️ 军机', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffd54f',
      backgroundColor: '#37474f',
      padding: { x: 6, y: 4 }
    }).setDepth(62).setInteractive({ useHandCursor: true });

    this.pauseMenuButton.on('pointerdown', () => {
      this.togglePauseMenu();
    });

    // 8. Battlefield Threat Radar & Unit Counter Pre-warning Button (敌情推演)
    this.tacticalRadarButton = this.add.text(616, 13 + this.topOffset, '📜 敌情推演', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffd700',
      backgroundColor: '#1b2838',
      padding: { x: 6, y: 4 }
    }).setDepth(62).setInteractive({ useHandCursor: true });

    this.tacticalRadarButton.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.tacticalRadarModal.show();
    });

    // Add responsive hover feedback to Top HUD controls
    [this.viewModeButton, this.speedButton, this.muteButton, this.pauseMenuButton, this.tacticalRadarButton].forEach(btn => {
      btn.on('pointerover', () => {
        btn.setAlpha(0.85);
        btn.setScale(1.05);
      });
      btn.on('pointerout', () => {
        btn.setAlpha(1.0);
        btn.setScale(1.0);
      });
    });

    // Sub-HUD Bar: Live 3-Star Badges & Weather Pill
    const subBg = this.add.graphics().setDepth(60);
    subBg.fillStyle(0x0e1115, 0.85);
    subBg.fillRect(0, 48 + this.topOffset, 750, 28);
    subBg.lineStyle(1, 0x263238, 0.7);
    subBg.lineBetween(0, 76 + this.topOffset, 750, 76 + this.topOffset);

    const starY = 62 + this.topOffset;
    this.liveStar1Text = this.add.text(18, starY, isEndless ? '🏛️ 神机演武' : '⭐ 坚守孤城', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(62);

    this.liveStar2Text = this.add.text(125, starY, isEndless ? '⚔️ 浴血死守' : '⭐ 城垣完好(≥60%)', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(62);

    this.liveStar3Text = this.add.text(285, starY, isEndless ? '🏆 冲刺战功' : '⭐ 固若金汤(≥90%)', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(62);

    this.createWeatherPill(starY);

    // Initial update of Wall HP Bar now that all live star texts are instantiated
    this.updateWallHpBar(1000, 1000);
  }

  private createBottomCommandBar(): void {
    const baseY = 1240 - this.bottomShift;
    const barH = 1334 - baseY;
    const centerY = 1285 - this.bottomShift;

    const bg = this.add.graphics().setDepth(60);
    bg.fillStyle(0x1a1e24, 0.95);
    bg.fillRect(0, baseY, 750, barH);
    bg.lineStyle(2, 0x4a433a, 0.8);
    bg.lineBetween(0, baseY, 750, baseY);

    // 1. Commander Avatar & Name
    this.commanderAvatarGraphics = this.add.graphics().setDepth(61);

    this.commanderAvatarText = this.add.text(50, centerY, '守仁', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(62);

    // 2. Rage Bar
    this.rageBar = this.add.graphics().setDepth(61);

    this.rageText = this.add.text(175, centerY, '怒气 0 / 100', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(62);

    // 3. Ultimate Button
    this.ultimateButton = this.add.container(360, centerY).setDepth(62);
    const ultBg = this.add.graphics();
    ultBg.fillStyle(0x424242, 1.0);
    ultBg.fillRoundedRect(-70, -22, 140, 44, 8);
    this.ultimateText = this.add.text(0, 0, '万炮齐发', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#9e9e9e',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.ultimateButton.add([ultBg, this.ultimateText]);

    this.ultimateButton.setSize(140, 44).setInteractive({ useHandCursor: true });
    
    let isAiming = false;
    let startX = 0;
    let startY = 0;
    let hasDraggedOut = false;

    this.ultimateButton.on('pointerover', () => {
      if (!isAiming) this.ultimateButton.setScale(1.05);
    });
    this.ultimateButton.on('pointerout', () => {
      if (!isAiming) this.ultimateButton.setScale(1.0);
    });
    this.ultimateButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.battleScene?.commander?.canCastUltimate()) {
        SoundManager.getInstance().playBronzeButtonClick();
        this.battleScene?.showTacticalFloatingNotice('怒气未满，暂不可释放');
        return;
      }

      SoundManager.getInstance().playBronzeButtonClick();
      isAiming = true;
      startX = pointer.x;
      startY = pointer.y;
      hasDraggedOut = false;

      const cmdId = this.battleScene.commander.config.id;
      const autoTarget = this.battleScene.getAutoAimTarget();
      this.battleScene.startUltimateAim(cmdId, autoTarget.x, autoTarget.y);
    });

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (!isAiming) return;
      const dist = Math.hypot(pointer.x - startX, pointer.y - startY);
      if (dist > 20 || pointer.y < 1220) {
        hasDraggedOut = true;
      }
      this.battleScene?.updateUltimateAim(pointer.x, pointer.y);
    };

    const onPointerUp = (pointer: Phaser.Input.Pointer) => {
      if (!isAiming) return;
      isAiming = false;
      this.ultimateButton.setScale(1.0);
      this.battleScene?.endUltimateAim();

      if (hasDraggedOut) {
        if (pointer.y >= 1230 || pointer.y < 480) {
          // Dragged into cancellation zone: abort
          this.battleScene?.showTacticalFloatingNotice('已取消绝技施放');
          return;
        }
        // Valid target drop on battlefield
        const target = {
          x: Math.max(60, Math.min(690, pointer.x)),
          y: Math.max(540, Math.min(1200, pointer.y))
        };
        if (this.battleScene?.castCommanderUltimate(target)) {
          this.updateRageBar(0, 100);
        }
      } else {
        // Quick tap without dragging: auto-aim!
        const autoTarget = this.battleScene?.getAutoAimTarget();
        if (this.battleScene?.castCommanderUltimate(autoTarget)) {
          this.updateRageBar(0, 100);
        }
      }
    };

    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', onPointerUp);

    this.events.once('shutdown', () => {
      this.input.off('pointermove', onPointerMove);
      this.input.off('pointerup', onPointerUp);
    });

    // 4. Armory Shop Button
    this.shopButton = this.add.container(620, centerY).setDepth(62);
    const shopBg = this.add.graphics();
    shopBg.fillStyle(0xf57c00, 1.0);
    shopBg.fillRoundedRect(-70, -22, 140, 44, 8);
    const shopText = this.add.text(0, 0, '军备工坊', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.shopButton.add([shopBg, shopText]);

    this.shopButton.setSize(140, 44).setInteractive({ useHandCursor: true });
    this.shopButton.on('pointerover', () => {
      this.shopButton.setScale(1.05);
    });
    this.shopButton.on('pointerout', () => {
      this.shopButton.setScale(1.0);
    });
    this.shopButton.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.openShopModal();
    });

    // Adapt Commander UI to current commander
    this.updateCommanderBar();

    // Initialize rage bar appearance now that all UI elements are created
    this.updateRageBar(0, 100);
  }

  public updateCommanderBar(): void {
    const cmdId = this.battleScene?.commander?.config?.id || 'wang_shouren';
    const theme = COMMANDER_UI_THEMES[cmdId] || COMMANDER_UI_THEMES.wang_shouren;
    const centerY = 1285 - this.bottomShift;

    if (this.commanderAvatarGraphics) {
      this.commanderAvatarGraphics.clear();
      this.commanderAvatarGraphics.fillStyle(theme.avatarBg, 1.0);
      this.commanderAvatarGraphics.fillCircle(50, centerY, 26);
      this.commanderAvatarGraphics.lineStyle(2.5, theme.avatarBorder, 1.0);
      this.commanderAvatarGraphics.strokeCircle(50, centerY, 26);
    }

    if (this.commanderAvatarText) {
      this.commanderAvatarText.setText(theme.shortName);
    }

    if (this.ultimateText) {
      this.ultimateText.setText(theme.ultimateName);
    }
  }

  private updateWallHpBar(current: number, max: number): void {
    if (!this.wallHpBar || !this.wallHpBar.active) return;
    this.wallHpBar.clear();
    const w = 110;
    const h = 8;
    const x = 20;
    const y = 34 + this.topOffset;

    this.wallHpBar.fillStyle(0x212121, 0.8);
    this.wallHpBar.fillRect(x, y, w, h);

    const ratio = Math.max(0, current / max);
    this.wallHpBar.fillStyle(ratio > 0.3 ? 0x00e676 : 0xff1744, 1.0);
    this.wallHpBar.fillRect(x, y, w * ratio, h);

    // 60% (Silver Star) and 90% (Gold Star) threshold markers
    this.wallHpBar.lineStyle(1.5, 0xffca28, 0.85);
    const x60 = x + w * 0.60;
    this.wallHpBar.lineBetween(x60, y - 2, x60, y + h + 2);

    this.wallHpBar.lineStyle(1.5, 0xffd700, 1.0);
    const x90 = x + w * 0.90;
    this.wallHpBar.lineBetween(x90, y - 2, x90, y + h + 2);

    this.updateLiveStars(current, max);
  }

  private updateRageBar(current: number, max: number): void {
    if (!this.rageBar || !this.rageBar.active) return;
    this.rageBar.clear();
    const w = 150;
    const h = 36;
    const x = 100;
    const y = 1267 - this.bottomShift;

    this.rageBar.fillStyle(0x212121, 0.8);
    this.rageBar.fillRoundedRect(x, y, w, h, 6);

    const ratio = Math.min(1.0, Math.max(0, current / max));
    const isFull = ratio >= 1.0;

    this.rageBar.fillStyle(isFull ? 0xffd700 : 0xd32f2f, 1.0);
    this.rageBar.fillRoundedRect(x, y, w * ratio, h, 6);

    if (this.rageText) {
      this.rageText.setText(`怒气 ${Math.floor(current)} / ${max}`);
    }

    // Update ultimate button appearance safely
    const cmdId = this.battleScene?.commander?.config?.id || 'wang_shouren';
    const theme = COMMANDER_UI_THEMES[cmdId] || COMMANDER_UI_THEMES.wang_shouren;

    if (this.ultimateButton && this.ultimateButton.list && this.ultimateButton.list.length >= 2) {
      const ultBg = this.ultimateButton.getAt(0) as Phaser.GameObjects.Graphics;
      const ultText = this.ultimateButton.getAt(1) as Phaser.GameObjects.Text;
      ultBg.clear();
      if (isFull) {
        ultBg.fillStyle(theme.glowColor, 1.0);
        ultBg.fillRoundedRect(-70, -22, 140, 44, 8);
        ultBg.lineStyle(2, theme.avatarBorder, 1.0);
        ultBg.strokeRoundedRect(-70, -22, 140, 44, 8);
        ultText.setColor('#ffffff');
      } else {
        ultBg.fillStyle(0x424242, 1.0);
        ultBg.fillRoundedRect(-70, -22, 140, 44, 8);
        ultText.setColor('#9e9e9e');
      }
      ultText.setText(theme.ultimateName);
    }
  }

  private bindBattleSceneEvents(): void {
    this.battleScene.events.on('currencyChanged', (balance: number) => {
      if (this.silverText?.active) {
        this.silverText.setText(`${balance} 银两`);
      }
    });

    this.battleScene.events.on('wallHpChanged', (current: number, max: number) => {
      if (this.wallHpText?.active) {
        this.wallHpText.setText(`城防: ${current}/${max}`);
      }
      this.updateWallHpBar(current, max);
    });

    this.battleScene.events.on('rageChanged', (rage: number) => {
      this.updateRageBar(rage, 100);
    });

    this.battleScene.events.on('waveStarted', (waveIndex: number, totalWaves?: number, isBossWave?: boolean, isEliteWave?: boolean) => {
      if (!this.waveText?.active) return;
      const isEndless = this.battleScene?.battleMode === 'endless';
      if (isEndless) {
        this.waveText.setText(`演武 · 第 ${waveIndex} 波`);
      } else {
        const total = totalWaves || this.battleScene?.totalWaves || 10;
        this.waveText.setText(`第 ${waveIndex} / ${total} 波`);
      }
      this.showWaveAnnouncementBanner(waveIndex, isEndless ? 999999 : (totalWaves || 10), Boolean(isBossWave), Boolean(isEliteWave));
    });

    this.battleScene.events.on('bossSkillCast', (skillName: string) => {
      this.showBossSkillWarning(skillName);
    });

    this.battleScene.events.on('openDecreeModal', (waveIndex: number) => {
      this.openDecreeModal(waveIndex);
    });

    this.battleScene.events.on('renderModeChanged', (mode: '2d' | '3d') => {
      this.updateViewModeButton(mode);
    });
  }

  // =========================================================================
  // Sub-HUD: Weather Pill & Live 3-Stars
  // =========================================================================

  private createWeatherPill(centerY: number): void {
    const stageId = this.battleScene?.stageId || 1;
    const chapterId = this.battleScene?.stageConfig?.chapterId || 1;
    const theme = EnvironmentEngine.getThemeForChapter(chapterId);
    const envMods = EnvironmentEngine.getModifiers(theme, stageId);

    const pillX = 640;
    const pillW = 190;
    const pillH = 20;

    this.weatherPillContainer = this.add.container(pillX, centerY).setDepth(62);

    const pillBg = this.add.graphics();
    pillBg.fillStyle(0x182430, 0.9);
    pillBg.fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 5);
    pillBg.lineStyle(1.2, 0x00bcd4, 0.7);
    pillBg.strokeRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 5);

    const themeIcons: Record<string, string> = {
      plain_valley: '🌾',
      river_water: '🌧️',
      snow_tundra: '❄️',
      night_mountain: '🧪',
      imperial_city: '🐉'
    };
    const icon = themeIcons[theme] || '🌾';

    const pillText = this.add.text(0, 0, `${icon} ${envMods.themeName.split('·')[0]} ⓘ`, {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#80deea'
    }).setOrigin(0.5);

    this.weatherPillContainer.add([pillBg, pillText]);
    this.weatherPillContainer.setSize(pillW, pillH).setInteractive({ useHandCursor: true });

    this.weatherPillContainer.on('pointerdown', () => {
      SoundManager.getInstance().playClick();
      this.toggleWeatherTooltip(envMods);
    });
  }

  private toggleWeatherTooltip(envMods: any): void {
    if (this.weatherTooltipContainer) {
      this.weatherTooltipContainer.destroy();
      this.weatherTooltipContainer = undefined;
      return;
    }

    this.weatherTooltipContainer = this.add.container(375, 116 + this.topOffset).setDepth(150);

    const tipW = 710;
    const tipH = 72;
    const tipBg = this.add.graphics();
    tipBg.fillStyle(0x0e1722, 0.96);
    tipBg.fillRoundedRect(-tipW / 2, -tipH / 2, tipW, tipH, 8);
    tipBg.lineStyle(1.5, 0x00e5ff, 0.85);
    tipBg.strokeRoundedRect(-tipW / 2, -tipH / 2, tipW, tipH, 8);

    const titleText = this.add.text(-tipW / 2 + 16, -tipH / 2 + 12, `天时地利：【${envMods.themeName}】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#00e5ff',
      fontStyle: 'bold'
    });

    const descText = this.add.text(-tipW / 2 + 16, -tipH / 2 + 32, envMods.description, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#eceff1',
      wordWrap: { width: tipW - 32 }
    });

    this.weatherTooltipContainer.add([tipBg, titleText, descText]);
    this.weatherTooltipContainer.setSize(tipW, tipH).setInteractive({ useHandCursor: true });
    this.weatherTooltipContainer.on('pointerdown', () => {
      this.weatherTooltipContainer?.destroy();
      this.weatherTooltipContainer = undefined;
    });

    // Auto dismiss after 3.5s
    this.time.delayedCall(3500, () => {
      if (this.weatherTooltipContainer) {
        this.weatherTooltipContainer.destroy();
        this.weatherTooltipContainer = undefined;
      }
    });
  }

  private updateLiveStars(current: number, max: number): void {
    if (!this.liveStar2Text || !this.liveStar3Text) return;
    if (!this.liveStar2Text.active || !this.liveStar3Text.active) return;
    if (!this.liveStar2Text.scene || !this.liveStar3Text.scene) return;
    if (this.battleScene?.battleMode === 'endless') return;
    const ratio = max > 0 ? current / max : 0;
    const hasRevived = (this.battleScene as any)?.hasRevivedThisBattle ?? false;

    // Star 2: Wall HP >= 60%
    if (ratio >= 0.60) {
      this.liveStar2Text.setColor('#ffd700');
    } else {
      this.liveStar2Text.setColor('#546e7a');
    }

    // Star 3: Wall HP >= 90% and 0 revives
    if (ratio >= 0.90 && !hasRevived) {
      this.liveStar3Text.setColor('#ffd700');
    } else {
      this.liveStar3Text.setColor('#546e7a');
    }
  }

  // =========================================================================
  // Battlefield Alerts: Wave Banners, Boss Vignette & Skill Warning
  // =========================================================================

  public showWaveAnnouncementBanner(
    waveIndex: number,
    totalWaves: number,
    isBossWave: boolean,
    isEliteWave: boolean
  ): void {
    if (this.waveBannerContainer) {
      this.tweens.killTweensOf(this.waveBannerContainer);
      this.waveBannerContainer.destroy();
      this.waveBannerContainer = undefined;
    }

    const bossName = this.battleScene?.stageConfig?.bossName ||
      this.battleScene?.stageWaveConfig?.waves?.find(w => w.waveNumber === waveIndex)?.bossConfig?.name ||
      '守关大将';

    if (isBossWave) {
      this.triggerBossWarningVignette();
    }

    const bannerY = 280;
    this.waveBannerContainer = this.add.container(375, bannerY).setDepth(140);

    const tacticalReport = this.battleScene?.getTacticalReport ? this.battleScene.getTacticalReport() : undefined;

    const bannerW = 640;
    const bannerH = tacticalReport ? 94 : 76;
    const bg = this.add.graphics();

    const bgColor = isBossWave ? 0x24060a : isEliteWave ? 0x061520 : 0x0c0f14;
    const borderColor = isBossWave ? 0xff1744 : isEliteWave ? 0x00e5ff : 0xffd700;

    bg.fillStyle(bgColor, 0.96);
    bg.fillRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 10);
    bg.lineStyle(2, borderColor, 0.95);
    bg.strokeRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 10);

    // Inner delicate antique accent
    bg.lineStyle(1, borderColor, 0.35);
    bg.strokeRoundedRect(-bannerW / 2 + 3, -bannerH / 2 + 3, bannerW - 6, bannerH - 6, 8);

    const isEndless = this.battleScene?.battleMode === 'endless';
    let mainTitle = isEndless ? `「 演武第 ${waveIndex} 波 · 凶煞降临 」` : `「 第 ${waveIndex} 波 · 敌 军 突 袭 」`;
    let subTitle = isEndless ? `无尽怪潮 · 浴血坚守！(第 ${waveIndex} 波)` : `全营备战 · 严守关隘！(${waveIndex}/${totalWaves})`;
    let titleColor: string = UI_COLORS.goldBright;

    if (isBossWave) {
      mainTitle = `⚠️ 决 战 · 守 关 首 领 亲 临 ⚠️`;
      subTitle = `【${bossName}】大举破阵！全员集火打断绝技！`;
      titleColor = '#ff5252';
    } else if (isEliteWave) {
      mainTitle = `⚡ 强 敌 压 境 · 精 锐 冲 锋 ⚡`;
      subTitle = `重装铁甲前锋来犯，严防正面突防！`;
      titleColor = '#00e5ff';
    }

    const titleY = tacticalReport ? -24 : -14;
    const subY = tacticalReport ? 0 : 14;

    const titleText = this.add.text(0, titleY, mainTitle, {
      fontFamily: UI_FONTS.primary,
      fontSize: '18px',
      color: titleColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subText = this.add.text(0, subY, subTitle, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#cfd8dc'
    }).setOrigin(0.5);

    const bannerChildren: Phaser.GameObjects.GameObject[] = [bg, titleText, subText];

    if (tacticalReport) {
      const rankColors: Record<string, string> = {
        S: '#ffd700',
        A: '#00e5ff',
        B: '#ffb74d',
        C: '#ff5252'
      };
      const rankColor = rankColors[tacticalReport.playerReadiness.rank] || '#ffd700';
      const adviceSnippet = tacticalReport.headlineAdvice.length > 28
        ? tacticalReport.headlineAdvice.substring(0, 26) + '...'
        : tacticalReport.headlineAdvice;

      const tacticalTicker = this.add.text(0, 24, `[推演评级: ${tacticalReport.playerReadiness.rank}] 📜 军师谏言: ${adviceSnippet}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '11px',
        color: rankColor,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      bannerChildren.push(tacticalTicker);
    }

    this.waveBannerContainer.add(bannerChildren);

    // Animate banner: pop in -> linger -> glide up & fade
    this.waveBannerContainer.setAlpha(0);
    this.waveBannerContainer.setScale(0.85);

    this.tweens.add({
      targets: this.waveBannerContainer,
      alpha: 1,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1600, () => {
          if (this.waveBannerContainer) {
            this.tweens.add({
              targets: this.waveBannerContainer,
              alpha: 0,
              scaleX: 0.85,
              scaleY: 0.85,
              y: bannerY - 30,
              duration: 350,
              ease: 'Cubic.easeIn',
              onComplete: () => {
                if (this.waveBannerContainer) {
                  this.waveBannerContainer.destroy();
                  this.waveBannerContainer = undefined;
                }
              }
            });
          }
        });
      }
    });

  }

  private triggerBossWarningVignette(): void {
    if (!this.bossWarningVignette) {
      this.bossWarningVignette = this.add.graphics().setDepth(139);
    }
    this.bossWarningVignette.clear();
    this.bossWarningVignette.lineStyle(24, 0xd50000, 0.6);
    this.bossWarningVignette.strokeRect(0, 0, 750, 1334);
    this.bossWarningVignette.setAlpha(1);

    this.tweens.add({
      targets: this.bossWarningVignette,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.bossWarningVignette?.clear();
      }
    });
  }

  public showBossSkillWarning(skillName: string): void {
    if (this.bossSkillAlertContainer) {
      this.bossSkillAlertContainer.destroy();
    }
    const alertY = 120 + this.topOffset;
    this.bossSkillAlertContainer = this.add.container(375, alertY).setDepth(145);

    const alertW = 580;
    const alertH = 40;
    const bg = this.add.graphics();
    bg.fillStyle(0x7f0000, 0.92);
    bg.fillRoundedRect(-alertW / 2, -alertH / 2, alertW, alertH, 6);
    bg.lineStyle(1.5, 0xff1744, 1.0);
    bg.strokeRoundedRect(-alertW / 2, -alertH / 2, alertW, alertH, 6);

    const text = this.add.text(0, 0, `⚠️ 敌将正在蓄力绝技：【${skillName}】！`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.bossSkillAlertContainer.add([bg, text]);

    this.tweens.add({
      targets: this.bossSkillAlertContainer,
      alpha: { from: 0, to: 1 },
      duration: 150,
      yoyo: true,
      hold: 2000,
      onComplete: () => {
        this.bossSkillAlertContainer?.destroy();
        this.bossSkillAlertContainer = undefined;
      }
    });
  }

  public updateViewModeButton(mode: '2d' | '3d'): void {
    if (!this.viewModeButton) return;
    if (mode === '3d') {
      this.viewModeButton.setText('⚔️ 3D (V)');
      this.viewModeButton.setStyle({ backgroundColor: '#b71c1c' });
    } else {
      this.viewModeButton.setText('🎨 2D (V)');
      this.viewModeButton.setStyle({ backgroundColor: '#37474f' });
    }
  }

  public updateSpeedButton(speed: number): void {
    if (this.speedButton) {
      this.speedButton.setText(`${speed}x 速度`);
    }
  }

  public updateMuteButton(isMuted: boolean): void {
    if (this.muteButton) {
      this.muteButton.setText(isMuted ? '🔇 静音' : '🎵 战乐');
    }
  }

  public togglePauseMenu(): void {
    if (this.pauseMenuModal?.isOpen()) {
      this.pauseMenuModal.resume();
    } else {
      this.openPauseMenu();
    }
  }

  public openPauseMenu(): void {
    if (this.shopModalContainer.visible) {
      this.closeShopModal();
    }
    this.pauseMenuModal?.show();
  }

  // ==========================================
  // Armory Shop Modal
  // ==========================================

  private createShopModal(): void {
    this.shopModalContainer = this.add.container(0, 0).setDepth(80).setVisible(false);

    // Dim Background
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.7);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.shopModalContainer.add(dim);

    // Dialog Panel (Xuan Paper & Bronze NineSlice)
    const panel = this.add.nineslice(
      375,
      600,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      650,
      600,
      40, 40, 40, 40
    );
    this.shopModalContainer.add(panel);

    // Title
    const title = this.add.text(375, 335, '神机营军备司', {
      fontFamily: UI_FONTS.primary,
      fontSize: '24px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.shopModalContainer.add(title);

    // Pause status indicator subtitle
    const pauseNotice = this.add.text(375, 365, '⏸️ 战局暂歇中 · 从容调遣军备 · 购毕即刻出战', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#90caf9',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.shopModalContainer.add(pauseNotice);

    // Close button
    const closeBtn = this.add.text(655, 335, '✕', {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      padding: { x: 10, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => {
      closeBtn.setColor(UI_COLORS.goldBright);
      closeBtn.setScale(1.1);
    });
    closeBtn.on('pointerout', () => {
      closeBtn.setColor('#ffffff');
      closeBtn.setScale(1.0);
    });
    closeBtn.on('pointerdown', () => {
      this.closeShopModal();
    });
    this.shopModalContainer.add(closeBtn);

    dim.on('pointerdown', () => {
      this.closeShopModal();
    });
  }

  public openShopModal(): void {
    this.battleScene.pauseBattle();
    ThreeSceneManager.getInstance().setVisible(false);
    this.shopModalContainer.setVisible(true);
    this.renderShopSlots();
  }

  public closeShopModal(): void {
    SoundManager.getInstance().playBronzeButtonClick();
    this.shopModalContainer.setVisible(false);
    this.battleScene.resumeBattle();
    if (!this.decreeModalContainer.visible) {
      ThreeSceneManager.getInstance().setVisible(true);
    }
  }

  private renderShopSlots(): void {
    // Clear old slot items inside modal (keep background, panel, title, pauseNotice, close)
    while (this.shopModalContainer.length > 5) {
      const item = this.shopModalContainer.getAt(5);
      item.destroy();
    }

    const currentWave = this.battleScene.waveFSM.getCurrentWave();
    const ownedConfigs = this.battleScene.shopManager.getOwnedStar1Configs();

    // Roll / get slots from shop manager
    let slots = this.battleScene.shopManager.getSlots();
    if (slots.length === 0) {
      slots = this.battleScene.shopManager.rollSlots(currentWave, ownedConfigs);
    }

    // Render 3 slots
    const allFieldWeapons = [
      ...this.battleScene.gridModel.getAllWeapons(),
      ...this.battleScene.gridModel.getAllBenchWeapons()
    ];

    slots.forEach((slot, index) => {
      const slotX = 90 + index * 200;
      const slotY = 420;

      const card = this.add.container(slotX, slotY);
      const bg = this.add.graphics();
      const theme = FACTION_COLORS[slot.faction] || FACTION_COLORS.fire;

      // Check if player has this weapon on grid/bench to form a pair
      const hasPair = allFieldWeapons.some(w => w.configId === slot.weaponConfigId && w.star === 1);

      bg.fillStyle(theme.bg, 0.95);
      bg.fillRoundedRect(0, 0, 170, 280, 8);

      const borderColor = slot.isPityCompensation ? 0xffd700 : (hasPair ? 0x00e676 : theme.border);
      const borderWidth = (slot.isPityCompensation || hasPair) ? 3 : 2;
      bg.lineStyle(borderWidth, borderColor, 1.0);
      bg.strokeRoundedRect(0, 0, 170, 280, 8);

      // Pair breathing glow tag if pair exists
      let pairBadge: Phaser.GameObjects.Text | null = null;
      if (hasPair && !slot.isPurchased) {
        pairBadge = this.add.text(85, 12, '★ 可合成对子 ★', {
          fontFamily: UI_FONTS.primary,
          fontSize: '11px',
          color: '#ffffff',
          backgroundColor: '#2e7d32ee',
          padding: { x: 5, y: 2 },
          fontStyle: 'bold'
        }).setOrigin(0.5);

        // Breathing pulse animation
        this.tweens.add({
          targets: pairBadge,
          scale: 1.08,
          alpha: 0.85,
          yoyo: true,
          repeat: -1,
          duration: 600,
          ease: 'Sine.easeInOut'
        });
      }

      const weaponCfg = getWeaponConfig(slot.weaponConfigId);
      const displayName = weaponCfg ? weaponCfg.name : slot.weaponConfigId;

      const nameText = this.add.text(85, 35, displayName, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const factionTag = this.add.text(85, 60, `【${theme.name}】`, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#ffd700'
      }).setOrigin(0.5);

      // Weapon Illustration Preview
      const cardChildren: Phaser.GameObjects.GameObject[] = [bg, nameText, factionTag];
      if (pairBadge) {
        cardChildren.push(pairBadge);
      }

      let texKey = WeaponTextureFactory.getTextureKey(slot.weaponConfigId);
      if (!this.textures.exists(texKey)) {
        const fallbackKey = 'weapon_' + slot.weaponConfigId;
        if (this.textures.exists(fallbackKey)) {
          texKey = fallbackKey;
        }
      }

      if (this.textures.exists(texKey)) {
        const weaponImg = this.add.image(85, 115, texKey);
        const tex = this.textures.get(texKey);
        const texSource = tex ? tex.getSourceImage() : null;
        const origW = (texSource && texSource.width) || 72;
        const origH = (texSource && texSource.height) || 72;
        const scale = Math.min(90 / origW, 65 / origH);
        weaponImg.setDisplaySize(origW * scale, origH * scale);
        cardChildren.push(weaponImg);
      }

      const costIcon = this.add.image(42, 170, UI_TEXTURE_KEYS.ICON_COIN_TONGBAO).setDisplaySize(18, 18);
      const costText = this.add.text(56, 170, `${slot.cost} 银两`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: '#ffeb3b',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      // Buy Button
      const buyBtn = this.add.container(85, 230);
      const btnBg = this.add.graphics();
      const canAfford = this.battleScene.wallet.getBalance() >= slot.cost;
      btnBg.fillStyle(canAfford && !slot.isPurchased ? 0x2e7d32 : 0x616161, 1.0);
      btnBg.fillRoundedRect(-60, -18, 120, 36, 6);

      const btnText = this.add.text(0, 0, slot.isPurchased ? '已购' : '征调', {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      buyBtn.add([btnBg, btnText]);

      if (!slot.isPurchased) {
        buyBtn.setSize(120, 36).setInteractive({ useHandCursor: true });
        buyBtn.on('pointerover', () => {
          buyBtn.setScale(1.05);
        });
        buyBtn.on('pointerout', () => {
          buyBtn.setScale(1.0);
        });
        buyBtn.on('pointerdown', () => {
          this.buyShopSlot(index, slot);
        });
      }

      cardChildren.push(costIcon, costText, buyBtn);
      card.add(cardChildren);
      this.shopModalContainer.add(card);
    });

    // Refresh Button with 3D cast bronze relief
    const refreshBtn = new BronzeButton(this, {
      x: 375,
      y: 790,
      width: 220,
      height: 46,
      variant: 'bronze',
      title: '军情重勘 (2 银两)',
      onClick: () => {
        const res = this.battleScene.shopManager.refresh();
        if (res.success) {
          SoundManager.getInstance().playCoinJingle();
          this.renderShopSlots();
        } else {
          SoundManager.getInstance().playBronzeButtonClick();
          this.battleScene.floatingTextPool.spawn(375, 750, res.error || '银两不足！', 'sunder');
        }
      }
    });

    this.shopModalContainer.add(refreshBtn);
  }

  private buyShopSlot(index: number, slot: ArmoryCardSlot): void {
    const res = this.battleScene.shopManager.purchaseSlot(index);

    if (res.success) {
      SoundManager.getInstance().playCoinJingle();
      slot.isPurchased = true;
      this.battleScene.refreshAllUnitSprites();
      this.renderShopSlots();
      const weaponCfg = getWeaponConfig(slot.weaponConfigId);
      const displayName = weaponCfg ? weaponCfg.name : slot.weaponConfigId;
      this.battleScene.floatingTextPool.spawn(375, 500, `征调成功: ${displayName}`, 'crit');
    } else {
      SoundManager.getInstance().playBronzeButtonClick();
      this.battleScene.floatingTextPool.spawn(375, 500, res.error || '无法征调！', 'sunder');
    }
  }

  // ==========================================
  // Decree / Tactics 3-Choose-1 Modal
  // ==========================================

  private createDecreeModal(): void {
    this.decreeModalContainer = this.add.container(0, 0).setDepth(90).setVisible(false);

    // Dim Background
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.85);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.decreeModalContainer.add(dim);

    // Title
    const title = this.add.text(375, 230, '战功犒赏 · 兵法心得', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.decreeModalContainer.add(title);

    // Subtitle
    const subTitle = this.add.text(375, 275, '研读兵法心得，强化我军战力（三选一）', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#b0bec5'
    }).setOrigin(0.5);
    this.decreeModalContainer.add(subTitle);
  }

  public openDecreeModal(waveIndex: number): void {
    // Audio notification for decree modal
    SoundManager.getInstance().playBronzeButtonClick();

    // Hide 3D canvas so 3D weapons/enemies do not render over the modal
    ThreeSceneManager.getInstance().setVisible(false);
    this.decreeModalContainer.setVisible(true);

    // Clear previous cards (elements 0=dim, 1=title, 2=subTitle)
    while (this.decreeModalContainer.length > 3) {
      const item = this.decreeModalContainer.getAt(3);
      item.destroy();
    }

    const weaponsOnGrid = this.battleScene.gridModel.getAllWeapons();
    const isFtue = this.battleScene.ftueManager.getStep() === FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE;

    const cards = this.battleScene.tacticsDeck.drawCandidates({
      wave: waveIndex,
      weaponsOnGrid,
      count: 3,
      isFtue
    });

    const TACTIC_CATEGORIES: Record<string, { name: string; color: string }> = {
      general: { name: '【通用兵法】', color: '#ffd54f' },
      fire: { name: '【神机火器】', color: '#ff8a65' },
      mohist: { name: '【墨家机关】', color: '#64b5f6' },
      fortress: { name: '【城防要塞】', color: '#81c784' },
      fusion: { name: '【双系觉醒】', color: '#f06292' }
    };

    const QUALITY_INFO: Record<string, { label: string; color: number; hex: string; bgTint: number }> = {
      blue: { label: '精良', color: 0x1e88e5, hex: '#42a5f5', bgTint: 0x142536 },
      purple: { label: '稀有', color: 0x8e24aa, hex: '#ba68c8', bgTint: 0x271638 },
      gold: { label: '史诗', color: 0xfbc02d, hex: '#ffd54f', bgTint: 0x362b14 },
      red_gold: { label: '传世觉醒', color: 0xd32f2f, hex: '#ef5350', bgTint: 0x381717 }
    };

    cards.forEach((card, index) => {
      // 3 cards nicely spaced across 750px width: 30 margin, 210 card, 30 gap
      const cardX = 30 + index * 240;
      const cardY = 330;

      const container = this.add.container(cardX, cardY);

      const quality = QUALITY_INFO[card.quality] || QUALITY_INFO.blue;
      const category = TACTIC_CATEGORIES[card.category] || {
        name: `【${card.category}】`,
        color: '#ffcc80'
      };

      // Bamboo Slip / Lacquer NineSlice Card Body
      const bg = this.add.nineslice(
        105,
        240,
        UI_TEXTURE_KEYS.CARD_BAMBOO,
        undefined,
        210,
        480,
        24, 24, 24, 24
      );

      // Top Quality Accent Ribbon
      const ribbon = this.add.graphics();
      ribbon.fillStyle(quality.bgTint, 0.9);
      ribbon.fillRoundedRect(3, 3, 204, 34, { tl: 10, tr: 10, bl: 0, br: 0 });

      // Quality Badge
      const qualityText = this.add.text(105, 20, `◆ ${quality.label} ◆`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: quality.hex,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Card Name
      const name = this.add.text(105, 62, card.name, {
        fontFamily: UI_FONTS.primary,
        fontSize: '19px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Category Tag
      const catText = this.add.text(105, 94, category.name, {
        fontFamily: UI_FONTS.primary,
        fontSize: '14px',
        color: category.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Divider Line
      ribbon.lineStyle(1, quality.color, 0.4);
      ribbon.lineBetween(20, 116, 190, 116);

      // Description with custom CJK wrap to prevent text overflow
      const wrappedDesc = wrapCJKText(card.description, 174, { fontSize: 13.5 });
      const desc = this.add.text(105, 136, wrappedDesc, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13.5px',
        color: '#eceff1',
        lineSpacing: 8,
        align: 'center'
      }).setOrigin(0.5, 0);

      // Pick Button with 3D cast bronze relief
      const btn = new BronzeButton(this, {
        x: 105,
        y: 430,
        width: 140,
        height: 42,
        variant: 'bronze',
        title: '参悟',
        onClick: () => {
          this.decreeModalContainer.setVisible(false);
          if (!this.shopModalContainer.visible) {
            ThreeSceneManager.getInstance().setVisible(true);
          }
          this.battleScene.onDecreePicked(card.id);

          if (this.battleScene.ftueManager.getStep() === FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE) {
            this.battleScene.ftueManager.onDecreePicked(card.id);
            this.battleScene.events.emit('ftueStepCompleted', FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE);
          }
        }
      });

      container.add([bg, ribbon, qualityText, name, catText, desc, btn]);
      this.decreeModalContainer.add(container);
    });
  }
}
