/**
 * 《孤城神机营》- Stage Select Scene (九州战役关卡选择界面)
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - 5 Major Chapters: 潼关初战, 赤壁火峡, 塞外雪原, 夜袭巴蜀, 京师保卫
 * - 20 Sequential Main Stages with wave counts, base wall HP, and 3-star status.
 * - Prep Modal with rewards preview, 3-star conditions, and "出征" button passing stageId to BattleScene.
 */

import Phaser from 'phaser';
import { ProfileStorage } from '../../core/meta/profile-storage';
import { PlayerProfile } from '../../core/meta/types';
import { PlatformBridge } from '../../bridge/platform';
import { SoundManager } from '../audio/sound-manager';
import {
  CAMPAIGN_CHAPTERS_CONFIG,
  getChapterConfig,
  getStagesByChapter,
  StageConfig
} from '../../config/campaign.config';
import { EnvironmentEngine } from '../../core/wave/environment-engine';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from '../ui/ui-theme';
import { BronzeButton } from '../ui/bronze-button';

export class StageSelectScene extends Phaser.Scene {
  private profileStorage!: ProfileStorage;
  private profile!: PlayerProfile;
  private topOffset: number = 0;

  private selectedChapterId: number = 1;
  private stageCardsContainer!: Phaser.GameObjects.Container;
  private chapterTitleText!: Phaser.GameObjects.Text;
  private chapterDescText!: Phaser.GameObjects.Text;

  // Prep Modal
  private prepModalContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'StageSelectScene' });
  }

  public create(): void {
    this.profileStorage = new ProfileStorage(PlatformBridge.getPlatform());
    this.profile = this.profileStorage.loadProfile();

    const insets = PlatformBridge.getPlatform().getSafeAreaInsets();
    this.topOffset = insets.top;

    this.selectedChapterId = Math.min(5, Math.max(1, this.profile.campaign.unlockedChapter || 1));

    // 1. Background
    this.createBackground();

    // 2. Top Header & Navigation
    this.createHeader();

    // 3. Chapter Switcher Bar
    this.createChapterSwitcher();

    // 4. Chapter Info Banner
    this.createChapterBanner();

    // 5. Stage Cards Container
    this.stageCardsContainer = this.add.container(0, 0);
    this.renderStageCards();

    // 6. Stage Prep / Launch Modal
    this.createStagePrepModal();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0e1117, 0x0e1117, 0x161d26, 0x161d26, 1);
    bg.fillRect(0, 0, 750, 1334);

    bg.lineStyle(1.5, 0x2e3c48, 0.5);
    bg.strokeRect(16, 16, 718, 1302);
  }

  private createHeader(): void {
    const startY = 35 + this.topOffset;

    // Header Banner with jade gradient & meander border
    this.add.image(375, startY, UI_TEXTURE_KEYS.HEADER_BANNER).setDepth(10);

    // Back to Home Button with cast bronze relief
    new BronzeButton(this, {
      x: 80,
      y: startY,
      width: 110,
      height: 42,
      title: '← 主城',
      onClick: () => {
        SoundManager.getInstance().resume();
        this.scene.start('HomeScene');
      }
    }).setDepth(11);

    // Scene Title
    this.add.text(375, startY, '九 州 战 役 · 讨 逆 平 寇', {
      fontFamily: UI_FONTS.primary,
      fontSize: '22px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(11);

    // Currencies indicator at top right (大明通宝)
    this.add.image(625, startY, UI_TEXTURE_KEYS.ICON_COIN_TONGBAO)
      .setDisplaySize(26, 26)
      .setDepth(11);
    this.add.text(644, startY, `${this.profile.currencies.gold}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(11);
  }

  private createChapterSwitcher(): void {
    const startY = 95 + this.topOffset;
    const tabW = 136;
    const tabH = 46;
    const startX = 26;

    for (let chId = 1; chId <= 5; chId++) {
      const chCfg = CAMPAIGN_CHAPTERS_CONFIG[chId];
      const isUnlocked = chId <= (this.profile.campaign.unlockedChapter || 1);
      const isSelected = chId === this.selectedChapterId;
      const tx = startX + (chId - 1) * (tabW + 6);

      const tab = this.add.container(tx + tabW / 2, startY + tabH / 2);
      const bg = this.add.graphics();

      const fillCol = isSelected ? 0xb71c1c : (isUnlocked ? 0x1f2933 : 0x141a20);
      const borderCol = isSelected ? 0xffd700 : (isUnlocked ? 0x455a64 : 0x263238);

      bg.fillStyle(fillCol, 1.0);
      bg.fillRoundedRect(-tabW / 2, -tabH / 2, tabW, tabH, 8);
      bg.lineStyle(isSelected ? 2 : 1, borderCol, 1.0);
      bg.strokeRoundedRect(-tabW / 2, -tabH / 2, tabW, tabH, 8);

      const shortName = chCfg.name.split('：')[1] || chCfg.name;
      const label = this.add.text(0, 0, isUnlocked ? shortName : '🔒 待解锁', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: isSelected ? '#ffffff' : (isUnlocked ? '#cfd8dc' : '#78909c'),
        fontStyle: isSelected ? 'bold' : 'normal'
      }).setOrigin(0.5);

      tab.add([bg, label]);

      if (isUnlocked) {
        tab.setSize(tabW, tabH).setInteractive({ useHandCursor: true });
        tab.on('pointerover', () => {
          tab.setScale(1.05);
        });
        tab.on('pointerout', () => {
          tab.setScale(1.0);
        });
        tab.on('pointerdown', () => {
          SoundManager.getInstance().playBronzeButtonClick();
          this.selectedChapterId = chId;
          this.refreshChapterView();
        });
      }
    }
  }

  private createChapterBanner(): void {
    const bannerX = 40;
    const bannerY = 160 + this.topOffset;
    const bannerW = 670;
    const bannerH = 100;

    const box = this.add.graphics();
    box.fillStyle(0x19212c, 0.95);
    box.fillRoundedRect(bannerX, bannerY, bannerW, bannerH, 10);
    box.lineStyle(1.5, 0xd84315, 0.8);
    box.strokeRoundedRect(bannerX, bannerY, bannerW, bannerH, 10);

    const chCfg = getChapterConfig(this.selectedChapterId);

    this.chapterTitleText = this.add.text(bannerX + 24, bannerY + 24, `${chCfg.name} · ${chCfg.subtitle}`, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    this.chapterDescText = this.add.text(bannerX + 24, bannerY + 58, chCfg.description, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#cfd8dc'
    });
  }

  private refreshChapterView(): void {
    const chCfg = getChapterConfig(this.selectedChapterId);
    this.chapterTitleText.setText(`${chCfg.name} · ${chCfg.subtitle}`);
    this.chapterDescText.setText(chCfg.description);

    this.createChapterSwitcher();
    this.renderStageCards();
  }

  private renderStageCards(): void {
    this.stageCardsContainer.removeAll(true);

    const stages = getStagesByChapter(this.selectedChapterId);
    const startX = 40;
    const startY = 280 + this.topOffset;
    const cardW = 670;
    const cardH = 220;
    const spacingY = 236;

    stages.forEach((stage, idx) => {
      const isUnlocked = stage.stageId <= (this.profile.campaign.unlockedStage || 1);
      const stars = this.profile.campaign.stageStars[stage.stageId] || 0;
      const cy = startY + idx * spacingY;

      const card = this.add.container(startX, cy);

      // Bamboo Slip Lacquer NineSlice Card Background
      const cardBg = this.add.nineslice(
        cardW / 2,
        cardH / 2,
        UI_TEXTURE_KEYS.CARD_BAMBOO,
        undefined,
        cardW,
        cardH,
        24, 24, 24, 24
      );
      if (!isUnlocked) {
        cardBg.setAlpha(0.6);
      }
      card.add(cardBg);

      // Boss Ribbon Badge
      if (stage.isBossStage) {
        const ribbon = this.add.graphics();
        ribbon.fillStyle(0xb71c1c, 1.0);
        ribbon.fillRoundedRect(cardW - 130, 12, 118, 30, 6);
        const rText = this.add.text(cardW - 71, 27, '守关首领', {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        card.add([ribbon, rText]);
      }

      // Stage Title
      const titleColor = isUnlocked ? '#ffffff' : '#78909c';
      const titleText = this.add.text(24, 20, `第 ${stage.stageIndexInChapter} 关 · ${stage.name}`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: titleColor,
        fontStyle: 'bold'
      });

      // Description
      const descText = this.add.text(24, 58, stage.description, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: isUnlocked ? '#b0bec5' : '#546e7a'
      });

      // Waves & Wall HP Badges
      const infoText = this.add.text(24, 96, `怪潮波数: ${stage.totalWaves} 波   |   基础城防: ${stage.wallBaseHp} HP`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: isUnlocked ? '#90caf9' : '#546e7a'
      });

      // Stars Display
      const starIcons = stars > 0
        ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars)
        : (isUnlocked ? '☆☆☆' : '🔒 未解锁');

      const starText = this.add.text(24, 135, `功勋评级: ${starIcons}`, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: stars > 0 ? '#ffd700' : '#78909c',
        fontStyle: 'bold'
      });

      card.add([titleText, descText, infoText, starText]);

      // Launch / Inspect Button
      if (isUnlocked) {
        const btnW = 160;
        const btnH = 48;
        const btnX = cardW - 100;
        const btnY = cardH - 42;

        const actionBtn = new BronzeButton(this, {
          x: btnX,
          y: btnY,
          width: btnW,
          height: btnH,
          variant: stage.isBossStage ? 'red' : 'bronze',
          title: '备战出征',
          onClick: () => {
            this.openStagePrepModal(stage);
          }
        });

        card.add(actionBtn);
      } else {
        const lockLabel = this.add.text(cardW - 100, cardH - 42, '通关前置解锁', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#78909c'
        }).setOrigin(0.5);
        card.add(lockLabel);
      }

      this.stageCardsContainer.add(card);
    });
  }

  // =========================================================================
  // Stage Prep & Launch Modal
  // =========================================================================

  private createStagePrepModal(): void {
    this.prepModalContainer = this.add.container(0, 0).setDepth(150).setVisible(false);

    // Dim Background
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.85);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.prepModalContainer.add(dim);
  }

  private openStagePrepModal(stage: StageConfig): void {
    // Clear and rebuild prep modal contents
    this.prepModalContainer.removeAll(true);

    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.88);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.prepModalContainer.add(dim);

    const panelX = 45;
    const panelY = 220;
    const panelW = 660;
    const panelH = 880;

    // Xuan Paper & Bronze Rivet NineSlice Panel
    const panel = this.add.nineslice(
      panelX + panelW / 2,
      panelY + panelH / 2,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      panelW,
      panelH,
      40, 40, 40, 40
    );
    this.prepModalContainer.add(panel);

    // Header Title
    const headerTitle = this.add.text(375, panelY + 45, `${stage.name} · 备 战 出 征`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '26px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const closeBtn = this.add.text(panelX + panelW - 40, panelY + 40, '✕', {
      fontFamily: UI_FONTS.primary,
      fontSize: '28px',
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
      SoundManager.getInstance().playBronzeButtonClick();
      this.prepModalContainer.setVisible(false);
    });

    this.prepModalContainer.add([headerTitle, closeBtn]);

    // Stage Info & Story
    const desc = this.add.text(panelX + 35, panelY + 90, `战局背景：${stage.description}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#cfd8dc',
      wordWrap: { width: 590 }
    });

    const waveInfo = this.add.text(panelX + 35, panelY + 148, `关卡敌情：全波怪潮 ${stage.totalWaves} 波   |   城墙初始耐久：${stage.wallBaseHp} HP`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#81d4fa'
    });

    this.prepModalContainer.add([desc, waveInfo]);

    let currentY = panelY + 182;
    if (stage.isBossStage && stage.bossName) {
      const bossNotice = this.add.text(panelX + 35, currentY, `⚠️ 守关重敌：${stage.bossName} 将于第 ${stage.totalWaves} 波亲临阵前！`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: '#ff8a80',
        fontStyle: 'bold'
      });
      this.prepModalContainer.add(bossNotice);
      currentY += 32;
    }

    // Weather & Terrain Intelligence Section
    const chapterTheme = EnvironmentEngine.getThemeForChapter(stage.chapterId);
    const envMods = EnvironmentEngine.getModifiers(chapterTheme, stage.stageId);

    const envBox = this.add.graphics();
    envBox.fillStyle(0x131f2a, 0.85);
    envBox.fillRoundedRect(panelX + 35, currentY, 590, 58, 8);
    envBox.lineStyle(1.5, 0x00bcd4, 0.7);
    envBox.strokeRoundedRect(panelX + 35, currentY, 590, 58, 8);
    this.prepModalContainer.add(envBox);

    const envTitle = this.add.text(panelX + 48, currentY + 12, `天时地利：【${envMods.themeName}】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#00e5ff',
      fontStyle: 'bold'
    });
    const envDesc = this.add.text(panelX + 48, currentY + 34, envMods.description, {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: '#b0bec5',
      wordWrap: { width: 560 }
    });
    this.prepModalContainer.add([envTitle, envDesc]);
    currentY += 72;

    // 3-Star Target Conditions List
    const starHeader = this.add.text(panelX + 35, currentY, '— 军令功勋三星目标 —', {
      fontFamily: UI_FONTS.primary,
      fontSize: '18px',
      color: '#ffd54f',
      fontStyle: 'bold'
    });
    this.prepModalContainer.add(starHeader);
    currentY += 32;

    const conditions = [
      '⭐  坚守孤城：成功击退全部波次怪潮',
      '⭐  城垣完好：战局结束时城防耐久 ≥ 60%',
      '⭐  固若金汤：耐久 ≥ 90% 且全程未复活'
    ];

    conditions.forEach((c) => {
      const condText = this.add.text(panelX + 45, currentY, c, {
        fontFamily: UI_FONTS.primary,
        fontSize: '14px',
        color: '#eceff1'
      });
      this.prepModalContainer.add(condText);
      currentY += 28;
    });

    currentY += 12;
    // Rewards Preview Section
    const rewardHeader = this.add.text(panelX + 35, currentY, '— 战利品犒赏预览 —', {
      fontFamily: UI_FONTS.primary,
      fontSize: '18px',
      color: '#ffd54f',
      fontStyle: 'bold'
    });
    this.prepModalContainer.add(rewardHeader);
    currentY += 30;

    const isFirstClear = (this.profile.campaign.stageStars[stage.stageId] || 0) === 0;
    const rewards = isFirstClear ? stage.firstClearRewards : stage.repeatRewards;

    const rewardNotice = this.add.text(panelX + 35, currentY, isFirstClear ? '【首通犒赏加成生效】' : '【通关常规犒赏】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: isFirstClear ? '#ff80ab' : '#90a4ae'
    });
    this.prepModalContainer.add(rewardNotice);
    currentY += 26;

    const rewardItems = [
      { iconKey: UI_TEXTURE_KEYS.ICON_COIN_TONGBAO, label: '金币', val: rewards.gold, col: UI_COLORS.goldBright },
      { iconKey: UI_TEXTURE_KEYS.ICON_ORE_IRON, label: '玄铁', val: rewards.iron, col: UI_COLORS.ironCyanGlow },
      { iconKey: UI_TEXTURE_KEYS.ICON_BLUEPRINT_SCROLL, label: '图纸', val: rewards.blueprints, col: '#ea80fc' }
    ];

    rewardItems.forEach((r, idx) => {
      const rx = panelX + 45 + idx * 200;
      const ry = currentY;

      const rBg = this.add.graphics();
      rBg.fillStyle(0x212b36, 1.0);
      rBg.fillRoundedRect(rx, ry, 180, 68, 8);
      rBg.lineStyle(1.5, 0x455a64, 0.8);
      rBg.strokeRoundedRect(rx, ry, 180, 68, 8);
      this.prepModalContainer.add(rBg);

      const rIcon = this.add.image(rx + 34, ry + 34, r.iconKey).setDisplaySize(30, 30);

      const rTitle = this.add.text(rx + 58, ry + 20, r.label, {
        fontFamily: UI_FONTS.primary,
        fontSize: '14px',
        color: '#cfd8dc'
      }).setOrigin(0, 0.5);

      const rVal = this.add.text(rx + 58, ry + 46, `+${r.val}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '18px',
        color: r.col,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      this.prepModalContainer.add([rIcon, rTitle, rVal]);
    });

    currentY += 90;

    // Big Deploy Action Button ("出征") - 3D Bronze Red Relief with breathing golden glow
    const deployBtn = new BronzeButton(this, {
      x: 375,
      y: currentY + 30,
      width: 360,
      height: 64,
      variant: 'red',
      enableGlow: true,
      title: '⚔️  出  征  拔  寨',
      onClick: () => {
        SoundManager.getInstance().resume();
        this.prepModalContainer.setVisible(false);

        // Transition to BattleScene with target stageId!
        this.scene.stop('StageSelectScene');
        this.scene.start('BattleScene', { stageId: stage.stageId });
        this.scene.launch('UIScene');
      }
    });

    this.prepModalContainer.add(deployBtn);
    this.prepModalContainer.setVisible(true);
  }
}
