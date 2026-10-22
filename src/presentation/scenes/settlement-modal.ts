/**
 * 《孤城神机营》- Settlement Modal View (战后星级与战利品结算弹窗)
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - Visual presentation of 3-star conditions, tactical rating (SSS~C), and currency rewards.
 * - Profile persistence via ProfileStorage, unlocking subsequent stages on victory.
 * - Clean teardown and scene routing: "返回主城" -> HomeScene, "再次挑战" -> BattleScene restart.
 */

import Phaser from 'phaser';
import { SettlementResult } from '../../core/campaign/settlement-evaluator';
import { ProfileStorage } from '../../core/meta/profile-storage';
import { PlatformBridge } from '../../bridge/platform';
import { SoundManager } from '../audio/sound-manager';
import { getStageConfig } from '../../config/campaign.config';
import { DefeatAdvisor, DefeatAnalysisContext } from '../../core/campaign/defeat-advisor';
import { EndlessSettlementResult } from '../../core/endless/types';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from '../ui/ui-theme';
import { BronzeButton } from '../ui/bronze-button';
import { VermilionStamp } from '../ui/vermilion-stamp';
import { WeaponCombatStat } from '../../core/combat/combat-stats-tracker';

export interface SettlementModalCallbacks {
  onReturnHome: () => void;
  onRetry: () => void;
}

export interface SettlementModalOptions {
  videoPath?: string | null;
  defeatContext?: DefeatAnalysisContext;
  endlessResult?: EndlessSettlementResult;
}

export class SettlementModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private profileStorage: ProfileStorage;
  private lootValTexts: Phaser.GameObjects.Text[] = [];
  private hasClaimed3xLoot: boolean = false;
  private currentTab: 'overview' | 'stats' = 'overview';
  private overviewContainer: Phaser.GameObjects.Container | null = null;
  private statsContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.profileStorage = new ProfileStorage(PlatformBridge.getPlatform());
  }

  /**
   * Displays the settlement modal on top of the battlefield.
   */
  public show(
    result: SettlementResult,
    callbacks: SettlementModalCallbacks,
    options?: SettlementModalOptions
  ): void {
    if (this.container) {
      this.container.destroy();
    }

    this.hasClaimed3xLoot = false;
    this.lootValTexts = [];

    // If this is an Endless Mode settlement, route to dedicated endless view
    if (options?.endlessResult) {
      this.container = this.scene.add.container(0, 0).setDepth(200);

      const scrim = this.scene.add.graphics();
      scrim.fillStyle(0x0a0c10, 0.88);
      scrim.fillRect(0, 0, 750, 1334);
      scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
      this.container.add(scrim);

      const panelX = 45;
      const panelY = 160;
      const panelW = 660;
      const panelH = 1000;

      const panel = this.scene.add.nineslice(
        panelX + panelW / 2,
        panelY + panelH / 2,
        UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
        undefined,
        panelW,
        panelH,
        40, 40, 40, 40
      );
      this.container.add(panel);

      this.renderEndlessSettlement(panelX, panelY, panelW, panelH, options.endlessResult, callbacks);
      return;
    }

    // Persist progress and rewards to player profile
    this.persistSettlement(result);

    const stageConfig = getStageConfig(result.stageId);

    this.container = this.scene.add.container(0, 0).setDepth(200);

    // 1. Fullscreen Dark Scrim with Fade-in
    const scrim = this.scene.add.graphics();
    scrim.fillStyle(0x0a0c10, 0.88);
    scrim.fillRect(0, 0, 750, 1334);
    scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.container.add(scrim);

    // 2. Main Decorative Dialog Panel (Xuan Paper & Bronze NineSlice)
    const panelX = 45;
    const panelY = 160;
    const panelW = 660;
    const panelH = 1000;

    const panel = this.scene.add.nineslice(
      panelX + panelW / 2,
      panelY + panelH / 2,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      panelW,
      panelH,
      40, 40, 40, 40
    );
    this.container.add(panel);

    const isVictory = result.cleared;
    const borderColor = isVictory ? UI_COLORS.goldBrightNum : 0xb71c1c;

    // 3. Victory / Defeat Header Crest
    const crestBg = this.scene.add.graphics();
    crestBg.fillStyle(isVictory ? 0x2e7d32 : 0x7f0000, 1.0);
    crestBg.fillRoundedRect(225, 125, 300, 70, 12);
    crestBg.lineStyle(2, borderColor, 1.0);
    crestBg.strokeRoundedRect(225, 125, 300, 70, 12);
    this.container.add(crestBg);

    const crestText = this.scene.add.text(375, 160, isVictory ? '★ 守 关 大 捷 ★' : '城 垣 失 守', {
      fontFamily: UI_FONTS.primary,
      fontSize: '28px',
      color: isVictory ? UI_COLORS.goldBright : '#ffcdd2',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(crestText);

    // Xuande Vermilion Seals Stamping on Victory
    if (isVictory) {
      const victoryStampKey = result.stars.star3Earned
        ? UI_TEXTURE_KEYS.STAMP_JIN_TANG
        : UI_TEXTURE_KEYS.STAMP_DAJIE;
      VermilionStamp.stampAt(this.scene, 580, 165, victoryStampKey, {
        targetPanel: this.container,
        targetDepth: 250,
        finalScale: 0.82
      });

      // Grade Stamp
      const gradeStampKey =
        result.grade === 'SSS'
          ? UI_TEXTURE_KEYS.STAMP_WUSHUANG
          : (result.grade === 'S' || result.grade === 'A'
            ? UI_TEXTURE_KEYS.STAMP_JIA_DENG
            : null);
      if (gradeStampKey) {
        this.scene.time.delayedCall(220, () => {
          if (this.container) {
            VermilionStamp.stampAt(this.scene, 550, 335, gradeStampKey, {
              targetPanel: this.container,
              targetDepth: 250,
              finalScale: 0.78
            });
          }
        });
      }
    }

    // 4. Stage Title & Subtitle
    const stageTitle = this.scene.add.text(375, 230, `第 ${result.chapterId} 章 · 第 ${stageConfig.stageIndexInChapter} 关`, {
      fontFamily: 'sans-serif',
      fontSize: '17px',
      color: '#90a4ae'
    }).setOrigin(0.5);

    const stageName = this.scene.add.text(375, 262, stageConfig.name, {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add([stageTitle, stageName]);

    // 5. Tactical Rating Badge (SSS ~ C)
    const gradeColor = this.getGradeColor(result.grade);
    const gradeBox = this.scene.add.graphics();
    gradeBox.fillStyle(0x21252f, 1.0);
    gradeBox.fillRoundedRect(265, 305, 220, 64, 8);
    gradeBox.lineStyle(2, gradeColor, 0.8);
    gradeBox.strokeRoundedRect(265, 305, 220, 64, 8);
    this.container.add(gradeBox);

    const gradeLabel = this.scene.add.text(340, 337, result.grade, {
      fontFamily: 'sans-serif',
      fontSize: '34px',
      color: `#${gradeColor.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const gradeTitleText = this.scene.add.text(420, 337, `${result.gradeTitle}\n(${result.goldMultiplier.toFixed(2)}x)`, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#eceff1',
      align: 'center'
    }).setOrigin(0.5);
    this.container.add([gradeLabel, gradeTitleText]);

    // 6. Tab Navigation: 【战况总览】 vs 【军械功勋】
    this.createTabSwitcher(panelX, panelW, result);

    // 7. Sub-containers for Tab Switching
    this.overviewContainer = this.scene.add.container(0, 0);
    this.statsContainer = this.scene.add.container(0, 0);
    this.container.add([this.overviewContainer, this.statsContainer]);

    // Populate Overview
    this.renderOverviewTab(panelX, panelW, isVictory, result, options);

    // Populate Stats
    this.renderStatsTab(panelX, panelW, result.weaponStats || []);

    // Initial state: Show Overview
    this.switchTab('overview');

    // 10. Action Buttons (3倍战利品, 抖音分享, 返回主城, 再次挑战)
    this.createActionButtons(callbacks, isVictory, result, options);

    // Audio SFX
    if (isVictory) {
      SoundManager.getInstance().playVictoryFanfare();
    } else {
      SoundManager.getInstance().playDefeatSound();
    }
  }

  private tabOverviewBtn!: Phaser.GameObjects.Container;
  private tabStatsBtn!: Phaser.GameObjects.Container;

  private createTabSwitcher(panelX: number, panelW: number, result: SettlementResult): void {
    const tabY = 385;
    const tabW = 260;
    const tabH = 38;

    // Overview Tab
    this.tabOverviewBtn = this.scene.add.container(panelX + 80, tabY);
    const bgO = this.scene.add.graphics();
    bgO.setName('bg');
    const textO = this.scene.add.text(tabW / 2, tabH / 2, '战 况 胜 负', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tabOverviewBtn.add([bgO, textO]);
    this.tabOverviewBtn.setSize(tabW, tabH);
    this.tabOverviewBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, tabW, tabH), Phaser.Geom.Rectangle.Contains);
    this.tabOverviewBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      PlatformBridge.getPlatform().vibrateShort('light');
      this.switchTab('overview');
    });

    // Stats Tab
    this.tabStatsBtn = this.scene.add.container(panelX + 360, tabY);
    const bgS = this.scene.add.graphics();
    bgS.setName('bg');
    const textS = this.scene.add.text(tabW / 2, tabH / 2, '军 械 功 勋 (DPS)', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#b0bec5',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tabStatsBtn.add([bgS, textS]);
    this.tabStatsBtn.setSize(tabW, tabH);
    this.tabStatsBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, tabW, tabH), Phaser.Geom.Rectangle.Contains);
    this.tabStatsBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      PlatformBridge.getPlatform().vibrateShort('light');
      this.switchTab('stats');
    });

    this.container!.add([this.tabOverviewBtn, this.tabStatsBtn]);
  }

  private switchTab(tab: 'overview' | 'stats'): void {
    this.currentTab = tab;
    if (this.overviewContainer) {
      this.overviewContainer.setVisible(tab === 'overview');
    }
    if (this.statsContainer) {
      this.statsContainer.setVisible(tab === 'stats');
    }

    // Update Tab Styles
    const bgO = this.tabOverviewBtn.getByName('bg') as Phaser.GameObjects.Graphics;
    const bgS = this.tabStatsBtn.getByName('bg') as Phaser.GameObjects.Graphics;

    if (bgO && bgS) {
      bgO.clear();
      bgS.clear();

      if (tab === 'overview') {
        bgO.fillStyle(0x3e2723, 1.0);
        bgO.fillRoundedRect(0, 0, 260, 38, 6);
        bgO.lineStyle(2, UI_COLORS.goldBrightNum, 0.9);
        bgO.strokeRoundedRect(0, 0, 260, 38, 6);

        bgS.fillStyle(0x181e28, 0.8);
        bgS.fillRoundedRect(0, 0, 260, 38, 6);
        bgS.lineStyle(1, 0x455a64, 0.5);
        bgS.strokeRoundedRect(0, 0, 260, 38, 6);
      } else {
        bgO.fillStyle(0x181e28, 0.8);
        bgO.fillRoundedRect(0, 0, 260, 38, 6);
        bgO.lineStyle(1, 0x455a64, 0.5);
        bgO.strokeRoundedRect(0, 0, 260, 38, 6);

        bgS.fillStyle(0x3e2723, 1.0);
        bgS.fillRoundedRect(0, 0, 260, 38, 6);
        bgS.lineStyle(2, UI_COLORS.goldBrightNum, 0.9);
        bgS.strokeRoundedRect(0, 0, 260, 38, 6);
      }
    }
  }

  private renderOverviewTab(
    panelX: number,
    panelW: number,
    isVictory: boolean,
    result: SettlementResult,
    options?: SettlementModalOptions
  ): void {
    if (!this.overviewContainer) return;

    if (isVictory) {
      this.renderStarBadges(panelX + 30, 440, result, this.overviewContainer);
    } else {
      const defeatNotice = this.scene.add.text(375, 470, `惜败于第 ${result.wavesCleared} 波怪潮\n强化军械、研习科技后再来一战！`, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ef9a9a',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5);
      this.overviewContainer.add(defeatNotice);
    }

    // Divider Line
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x455a64, 0.6);
    divider.lineBetween(panelX + 40, 620, panelX + panelW - 40, 620);
    this.overviewContainer.add(divider);

    // Battle Performance Metrics
    const metricsY = 645;
    const hpColor = result.wallHpPercent >= 60 ? '#00e676' : '#ff5252';
    const hpText = this.scene.add.text(panelX + 50, metricsY, `城垣耐久残余: ${result.wallHpPercent.toFixed(1)}%`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: hpColor
    });

    const waveText = this.scene.add.text(panelX + 360, metricsY, `击退怪潮: ${result.wavesCleared} / ${result.totalWaves} 波`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#cfd8dc'
    });

    const reviveText = this.scene.add.text(panelX + 50, metricsY + 36, `战地起死复生: ${result.revivesUsed} 次`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: result.revivesUsed === 0 ? '#81c784' : '#ffb74d'
    });
    this.overviewContainer.add([hpText, waveText, reviveText]);

    // Rewards Loot or Defeat Advice Section
    if (isVictory) {
      this.renderLootRewards(panelX, 735, result, this.overviewContainer);
    } else {
      this.renderDefeatAdvice(panelX, 710, options?.defeatContext, result, this.overviewContainer);
    }
  }

  private renderStatsTab(panelX: number, panelW: number, stats: WeaponCombatStat[]): void {
    if (!this.statsContainer) return;

    const startY = 440;
    const cardW = 600;
    const cardX = panelX + 30;

    // Header description
    const headerText = this.scene.add.text(375, startY, '— 各型军械实战输出与承伤结算 —', {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.statsContainer.add(headerText);

    if (stats.length === 0) {
      const emptyText = this.scene.add.text(375, startY + 120, '本场暂无军械交战数据', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#78909c'
      }).setOrigin(0.5);
      this.statsContainer.add(emptyText);
      return;
    }

    const maxDamage = Math.max(1, ...stats.map(s => s.totalDamage));
    const maxEntries = Math.min(6, stats.length);

    stats.slice(0, maxEntries).forEach((item, idx) => {
      const y = startY + 32 + idx * 62;
      const rowBg = this.scene.add.graphics();
      rowBg.fillStyle(idx === 0 ? 0x2e2318 : 0x181f28, 0.9);
      rowBg.fillRoundedRect(cardX, y, cardW, 54, 8);
      rowBg.lineStyle(1.5, idx === 0 ? UI_COLORS.goldBrightNum : 0x37474f, idx === 0 ? 0.9 : 0.6);
      rowBg.strokeRoundedRect(cardX, y, cardW, 54, 8);
      this.statsContainer!.add(rowBg);

      // Rank or MVP Medal
      const rankText = idx === 0 ? '👑 MVP' : `#${idx + 1}`;
      const rankLabel = this.scene.add.text(cardX + 40, y + 27, rankText, {
        fontFamily: UI_FONTS.primary,
        fontSize: idx === 0 ? '16px' : '15px',
        color: idx === 0 ? '#ffd700' : '#b0bec5',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Weapon Name & Star
      const nameText = this.scene.add.text(cardX + 85, y + 16, `${item.name} ★${item.star}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      // Damage bar
      const barX = cardX + 85;
      const barY = y + 33;
      const barMaxW = 280;
      const barRatio = item.totalDamage / maxDamage;
      const barW = Math.max(4, barMaxW * barRatio);

      const barG = this.scene.add.graphics();
      barG.fillStyle(0x0f141c, 0.8);
      barG.fillRoundedRect(barX, barY, barMaxW, 8, 3);
      barG.fillStyle(idx === 0 ? 0xffa000 : 0x00bcd4, 0.9);
      barG.fillRoundedRect(barX, barY, barW, 8, 3);
      this.statsContainer!.add(barG);

      // Numerical Stats: Damage, DPS, and Intercept
      const statDetail = item.damageIntercepted > 0
        ? `输出: ${item.totalDamage} | 阻截: ${item.damageIntercepted}`
        : `输出: ${item.totalDamage} (DPS: ${item.dps})`;

      const detailText = this.scene.add.text(cardX + 575, y + 27, statDetail, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: idx === 0 ? UI_COLORS.goldBright : '#eceff1',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      this.statsContainer!.add([rankLabel, nameText, detailText]);
    });
  }

  private renderStarBadges(
    startX: number,
    startY: number,
    result: SettlementResult,
    targetContainer?: Phaser.GameObjects.Container
  ): void {
    const parent = targetContainer || this.container;
    if (!parent) return;

    const conditions = [
      { achieved: result.stars.star1Earned, title: '坚守孤城', desc: '成功击退全波怪潮' },
      { achieved: result.stars.star2Earned, title: '城防完好', desc: '通关时城墙耐久 ≥ 60%' },
      { achieved: result.stars.star3Earned, title: '固若金汤', desc: '耐久 ≥ 90% 且 0 复活' }
    ];

    conditions.forEach((cond, idx) => {
      const y = startY + idx * 56;
      const row = this.scene.add.graphics();
      row.fillStyle(cond.achieved ? 0x263238 : 0x1c2024, 0.8);
      row.fillRoundedRect(startX, y, 600, 48, 8);
      if (cond.achieved) {
        row.lineStyle(1.5, 0xffd700, 0.7);
        row.strokeRoundedRect(startX, y, 600, 48, 8);
      }
      parent.add(row);

      const starIcon = this.scene.add.text(startX + 24, y + 24, cond.achieved ? '⭐' : '☆', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: cond.achieved ? '#ffd700' : '#78909c'
      }).setOrigin(0.5);

      const title = this.scene.add.text(startX + 60, y + 24, cond.title, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: cond.achieved ? '#ffd700' : '#90a4ae',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const desc = this.scene.add.text(startX + 220, y + 24, cond.desc, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: cond.achieved ? '#eceff1' : '#607d8b'
      }).setOrigin(0, 0.5);

      const statusTag = this.scene.add.text(startX + 560, y + 24, cond.achieved ? '达成' : '未达', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: cond.achieved ? '#00e676' : '#78909c',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      parent.add([starIcon, title, desc, statusTag]);
    });
  }

  private renderLootRewards(
    panelX: number,
    startY: number,
    result: SettlementResult,
    targetContainer?: Phaser.GameObjects.Container
  ): void {
    const parent = targetContainer || this.container;
    if (!parent) return;

    const lootHeader = this.scene.add.text(375, startY, '— 战利品缴获 —', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffd54f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    parent.add(lootHeader);

    // Audio SFX for silver and iron loot collection
    SoundManager.getInstance().playCoinJingle();
    SoundManager.getInstance().playIronClink();

    if (result.firstClearBonusApplied) {
      const firstClearBadge = this.scene.add.text(375, startY + 28, '【首通犒赏加倍生效】', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ff80ab',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      parent.add(firstClearBadge);
    }

    const items = [
      { iconKey: UI_TEXTURE_KEYS.ICON_COIN_TONGBAO, label: '金币', value: `+${result.rewards.gold}`, color: UI_COLORS.goldBright },
      { iconKey: UI_TEXTURE_KEYS.ICON_ORE_IRON, label: '玄铁', value: `+${result.rewards.iron}`, color: UI_COLORS.ironCyanGlow },
      { iconKey: UI_TEXTURE_KEYS.ICON_BLUEPRINT_SCROLL, label: '图纸', value: `+${result.rewards.blueprints}`, color: '#ea80fc' }
    ];

    const cardW = 180;
    const cardH = 90;
    const spacing = 16;
    const totalW = items.length * cardW + (items.length - 1) * spacing;
    const leftX = (750 - totalW) / 2;

    items.forEach((item, idx) => {
      const cx = leftX + idx * (cardW + spacing);
      const cy = startY + 60;

      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(0x212732, 1.0);
      cardBg.fillRoundedRect(cx, cy, cardW, cardH, 8);
      cardBg.lineStyle(1.5, 0x455a64, 0.8);
      cardBg.strokeRoundedRect(cx, cy, cardW, cardH, 8);
      parent.add(cardBg);

      const iconImg = this.scene.add.image(cx + 36, cy + 30, item.iconKey).setDisplaySize(32, 32);

      const labelText = this.scene.add.text(cx + 60, cy + 30, item.label, {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: '#cfd8dc'
      }).setOrigin(0, 0.5);

      const valText = this.scene.add.text(cx + cardW / 2, cy + 64, item.value, {
        fontFamily: UI_FONTS.primary,
        fontSize: '20px',
        color: item.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.lootValTexts.push(valText);
      parent.add([iconImg, labelText, valText]);
    });
  }

  private renderDefeatAdvice(
    panelX: number,
    startY: number,
    defeatContext: DefeatAnalysisContext | undefined,
    result: SettlementResult,
    targetContainer?: Phaser.GameObjects.Container
  ): void {
    const parent = targetContainer || this.container;
    if (!parent) return;

    const ctx: DefeatAnalysisContext = defeatContext || {
      stageId: result.stageId,
      waveReached: result.wavesCleared + 1,
      totalWaves: result.totalWaves,
      wallMaxHp: 1000,
      wallRemainingHp: 0,
      weaponsOnField: []
    };

    const advice = DefeatAdvisor.analyze(ctx);

    const cardX = panelX + 30;
    const cardY = startY;
    const cardW = 600;
    const cardH = 240;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x1a1215, 0.95);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    cardBg.lineStyle(2, 0xd32f2f, 0.85);
    cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);
    parent.add(cardBg);

    // Title banner
    const titleBanner = this.scene.add.text(cardX + 24, cardY + 20, `【 神 机 军 师 · 破 敌 锦 囊 】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '18px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    });

    const causeText = this.scene.add.text(cardX + 24, cardY + 52, `败因剖析：${advice.title}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#ff8a80',
      fontStyle: 'bold'
    });

    const analysisText = this.scene.add.text(cardX + 24, cardY + 84, advice.analysis, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#eceff1',
      wordWrap: { width: 550 }
    });

    const tipBox = this.scene.add.graphics();
    tipBox.fillStyle(0x2c1d20, 0.9);
    tipBox.fillRoundedRect(cardX + 16, cardY + 135, cardW - 32, 85, 8);
    tipBox.lineStyle(1.2, 0xffa000, 0.6);
    tipBox.strokeRoundedRect(cardX + 16, cardY + 135, cardW - 32, 85, 8);
    parent.add(tipBox);

    const tipText = this.scene.add.text(cardX + 28, cardY + 146, `💡 破敌良谋：${advice.tacticalTip}`, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffe082',
      wordWrap: { width: 520 },
      lineSpacing: 4
    });

    parent.add([titleBanner, causeText, analysisText, tipText]);
  }

  private createActionButtons(
    callbacks: SettlementModalCallbacks,
    isVictory: boolean,
    result: SettlementResult,
    options?: SettlementModalOptions
  ): void {
    if (!this.container) return;

    if (isVictory) {
      // 1. "观看战报·3倍战利品" Button with 3D cast bronze gold glow
      const tripleBtn = new BronzeButton(this.scene, {
        x: 230,
        y: 955,
        width: 250,
        height: 52,
        variant: 'bronze',
        enableGlow: true,
        title: '观看战报·3倍战利品',
        subtitle: '观看广告 · 战利品×3',
        onClick: async () => {
          if (this.hasClaimed3xLoot) return;
          const platform = PlatformBridge.getPlatform();
          const res = await platform.showRewardedVideoAd('ad_settlement_3x');
          if (res && res.isEnded && !this.hasClaimed3xLoot) {
            this.hasClaimed3xLoot = true;
            const extraGold = result.rewards.gold * 2;
            const extraIron = result.rewards.iron * 2;
            const extraBlueprints = result.rewards.blueprints * 2;
            this.profileStorage.modifyProfile(p => {
              p.currencies.gold += extraGold;
              p.currencies.iron += extraIron;
              p.currencies.blueprints += extraBlueprints;
            });

            if (this.lootValTexts[0]) {
              this.lootValTexts[0].setText(`+${result.rewards.gold * 3}`).setColor(UI_COLORS.goldBright);
            }
            if (this.lootValTexts[1]) {
              this.lootValTexts[1].setText(`+${result.rewards.iron * 3}`).setColor(UI_COLORS.goldBright);
            }
            if (this.lootValTexts[2]) {
              this.lootValTexts[2].setText(`+${result.rewards.blueprints * 3}`).setColor(UI_COLORS.goldBright);
            }

            SoundManager.getInstance().playCoinJingle();

            const floatText = this.scene.add.text(375, 900, '★ 战利品翻倍 ×3 ★', {
              fontFamily: UI_FONTS.primary,
              fontSize: '26px',
              color: UI_COLORS.goldBright,
              fontStyle: 'bold',
              stroke: '#3e2723',
              strokeThickness: 4
            }).setOrigin(0.5).setDepth(260);

            this.scene.tweens.add({
              targets: floatText,
              y: 850,
              alpha: 0,
              duration: 1400,
              ease: 'Cubic.easeOut',
              onComplete: () => floatText.destroy()
            });

            tripleBtn.setTitle('已领3倍战利品');
            tripleBtn.setSubtitle('军饷充盈 · 犒赏已发');
            tripleBtn.setEnabled(false);
          }
        }
      });

      // 2. "一键发抖音带话题 #孤城神机营" Button
      const hasVideo = Boolean(options?.videoPath);
      const shareBtn = new BronzeButton(this.scene, {
        x: 520,
        y: 955,
        width: 250,
        height: 52,
        variant: 'bronze',
        enableGlow: hasVideo,
        title: '一键发抖音',
        subtitle: '#孤城神机营 #守城绝杀',
        onClick: async () => {
          const platform = PlatformBridge.getPlatform();
          SoundManager.getInstance().playBronzeButtonClick();
          await platform.shareVideo({
            videoPath: options?.videoPath || '',
            title: '《孤城神机营》我的守城绝杀时刻！',
            topics: ['#孤城神机营', '#抖音小游戏', '#国潮明代重工']
          });
        }
      });

      const btnY = 1045;

      // 3. "返回主城" Button with 3D cast bronze relief
      const homeBtn = new BronzeButton(this.scene, {
        x: 230,
        y: btnY,
        width: 240,
        height: 56,
        variant: 'bronze',
        title: '返回主城',
        onClick: () => {
          callbacks.onReturnHome();
        }
      });

      // 4. "再次挑战" Button with 3D cast bronze red relief and breathing glow
      const retryBtn = new BronzeButton(this.scene, {
        x: 520,
        y: btnY,
        width: 240,
        height: 56,
        variant: 'red',
        enableGlow: true,
        title: '重温关卡',
        onClick: () => {
          callbacks.onRetry();
        }
      });

      this.container.add([tripleBtn, shareBtn, homeBtn, retryBtn]);
    } else {
      // Defeat: Centered Home and Retry action buttons
      const btnY = 970;

      const homeBtn = new BronzeButton(this.scene, {
        x: 230,
        y: btnY,
        width: 240,
        height: 58,
        variant: 'bronze',
        title: '返回主城',
        subtitle: '修整军备 · 升级科技',
        onClick: () => {
          callbacks.onReturnHome();
        }
      });

      const retryBtn = new BronzeButton(this.scene, {
        x: 520,
        y: btnY,
        width: 240,
        height: 58,
        variant: 'red',
        enableGlow: true,
        title: '再整旗鼓·迎战',
        subtitle: '调整阵型 · 再次破敌',
        onClick: () => {
          callbacks.onRetry();
        }
      });

      this.container.add([homeBtn, retryBtn]);
    }
  }

  private persistSettlement(result: SettlementResult): void {
    this.profileStorage.modifyProfile(p => {
      // 1. Grant currencies
      p.currencies.gold += result.rewards.gold;
      p.currencies.iron += result.rewards.iron;
      p.currencies.blueprints += result.rewards.blueprints;

      // 2. Record stage stars (keep max)
      const prevStars = p.campaign.stageStars[result.stageId] || 0;
      if (result.stars.stars > prevStars) {
        p.campaign.stageStars[result.stageId] = result.stars.stars;
      }

      // 3. Unlock subsequent stage upon victory
      if (result.cleared) {
        const nextStage = result.stageId + 1;
        if (nextStage <= 20 && nextStage > p.campaign.unlockedStage) {
          p.campaign.unlockedStage = nextStage;
          const nextChapter = Math.floor((nextStage - 1) / 4) + 1;
          if (nextChapter > p.campaign.unlockedChapter) {
            p.campaign.unlockedChapter = nextChapter;
          }
        }
      }
    });
  }

  private renderEndlessSettlement(
    panelX: number,
    panelY: number,
    panelW: number,
    panelH: number,
    endless: EndlessSettlementResult,
    callbacks: SettlementModalCallbacks
  ): void {
    SoundManager.getInstance().playVictoryFanfare();
    SoundManager.getInstance().playCoinJingle();

    // 1. Header Crest: "★ 神机演武 · 终局 ★"
    const crestBg = this.scene.add.graphics();
    crestBg.fillStyle(0x1a212b, 1.0);
    crestBg.fillRoundedRect(225, 125, 300, 70, 12);
    crestBg.lineStyle(2, UI_COLORS.goldBrightNum, 1.0);
    crestBg.strokeRoundedRect(225, 125, 300, 70, 12);
    this.container!.add(crestBg);

    const crestText = this.scene.add.text(375, 160, '★ 神机演武 · 终局 ★', {
      fontFamily: UI_FONTS.primary,
      fontSize: '26px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container!.add(crestText);

    // Xuande Vermilion Seal
    const stampKey = endless.waveReached >= 20 ? UI_TEXTURE_KEYS.STAMP_WUSHUANG : UI_TEXTURE_KEYS.STAMP_DAJIE;
    VermilionStamp.stampAt(this.scene, 580, 165, stampKey, {
      targetPanel: this.container!,
      targetDepth: 250,
      finalScale: 0.82
    });

    // 2. Military Rank Title Header
    const titleHeader = this.scene.add.text(375, 230, `大明官阶：【${endless.militaryTitle}】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const badgeText = this.scene.add.text(375, 268, `战功印绶：${endless.honorBadge}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#80cbc4'
    }).setOrigin(0.5);
    this.container!.add([titleHeader, badgeText]);

    // 3. Performance Big Card
    const cardY = 310;
    const cardH = 260;
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x151b22, 0.95);
    cardBg.fillRoundedRect(panelX + 30, cardY, panelW - 60, cardH, 12);
    cardBg.lineStyle(1.5, 0x37474f, 0.8);
    cardBg.strokeRoundedRect(panelX + 30, cardY, panelW - 60, cardH, 12);
    this.container!.add(cardBg);

    // Wave Depth & Personal Record
    const waveReachedText = this.scene.add.text(panelX + 60, cardY + 28, `🛡️ 坚守防线：第 ${endless.waveReached} 波`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '22px',
      color: '#00e5ff',
      fontStyle: 'bold'
    });

    if (endless.isNewPersonalRecord) {
      const newRecTag = this.scene.add.text(panelX + panelW - 60, cardY + 30, '🏆 刷新个人纪录！', {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: '#ffd700',
        fontStyle: 'bold'
      }).setOrigin(1, 0);
      this.container!.add(newRecTag);
    }

    // Score
    const scoreText = this.scene.add.text(panelX + 60, cardY + 74, `⭐ 综合战功：${endless.score.toLocaleString()} 分`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '18px',
      color: '#ffb74d',
      fontStyle: 'bold'
    });

    // Kills detail
    const killsText = this.scene.add.text(panelX + 60, cardY + 118, `⚔️ 斩获战果：全歼 ${endless.totalKills} 众敌军`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#eceff1'
    });

    const eliteDetailText = this.scene.add.text(panelX + 80, cardY + 152, `• 诛杀精锐词缀敌将: ${endless.eliteKills} 名\n• 击破守关大首领: ${endless.bossKills} 尊`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#b0bec5',
      lineSpacing: 6
    });

    // Wall hp
    const wallRatio = endless.maxWallHp > 0 ? (endless.remainingWallHp / endless.maxWallHp * 100).toFixed(0) : '0';
    const wallText = this.scene.add.text(panelX + 60, cardY + 218, `🏰 城垣终局耐久残余: ${wallRatio}%`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: Number(wallRatio) > 0 ? '#69f0ae' : '#ff5252'
    });

    this.container!.add([waveReachedText, scoreText, killsText, eliteDetailText, wallText]);

    // 4. Rewards Section
    const rewardY = 600;
    const rewardHeader = this.scene.add.text(375, rewardY, '— 兵部朝廷犒赏辎重 —', {
      fontFamily: UI_FONTS.primary,
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container!.add(rewardHeader);

    const items = [
      { iconKey: UI_TEXTURE_KEYS.ICON_COIN_TONGBAO, label: '通宝', value: `+${endless.goldEarned}`, color: UI_COLORS.goldBright },
      { iconKey: UI_TEXTURE_KEYS.ICON_ORE_IRON, label: '玄铁', value: `+${endless.ironEarned}`, color: UI_COLORS.ironCyanGlow }
    ];

    const rewardCardW = 200;
    const rewardCardH = 88;
    const spacing = 30;
    const totalW = items.length * rewardCardW + (items.length - 1) * spacing;
    const leftX = (750 - totalW) / 2;

    items.forEach((item, idx) => {
      const cx = leftX + idx * (rewardCardW + spacing);
      const cy = rewardY + 28;

      const cBg = this.scene.add.graphics();
      cBg.fillStyle(0x212732, 1.0);
      cBg.fillRoundedRect(cx, cy, rewardCardW, rewardCardH, 8);
      cBg.lineStyle(1.5, 0x455a64, 0.8);
      cBg.strokeRoundedRect(cx, cy, rewardCardW, rewardCardH, 8);
      this.container!.add(cBg);

      const iconImg = this.scene.add.image(cx + 42, cy + 30, item.iconKey).setDisplaySize(34, 34);
      const labelText = this.scene.add.text(cx + 72, cy + 30, item.label, {
        fontFamily: UI_FONTS.primary,
        fontSize: '16px',
        color: '#cfd8dc'
      }).setOrigin(0, 0.5);

      const valText = this.scene.add.text(cx + rewardCardW / 2, cy + 62, item.value, {
        fontFamily: UI_FONTS.primary,
        fontSize: '20px',
        color: item.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.container!.add([iconImg, labelText, valText]);
    });

    // 5. Action Buttons (Return Home & Try Again)
    const btnY = panelY + panelH - 95;
    new BronzeButton(this.scene, {
      x: 230,
      y: btnY,
      width: 210,
      height: 58,
      variant: 'bronze',
      title: '返回大营',
      subtitle: '整理军备',
      onClick: () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.hide();
        callbacks.onReturnHome();
      }
    });

    new BronzeButton(this.scene, {
      x: 485,
      y: btnY,
      width: 230,
      height: 58,
      variant: 'red',
      enableGlow: true,
      title: '重整旗鼓',
      subtitle: '再次演武出征',
      onClick: () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.hide();
        callbacks.onRetry();
      }
    });
  }

  private drawCornerBrackets(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number): void {
    g.lineStyle(2.5, color, 1.0);
    const size = 16;
    // Top-left
    g.lineBetween(x + 6, y + 6 + size, x + 6, y + 6);
    g.lineBetween(x + 6, y + 6, x + 6 + size, y + 6);
    // Top-right
    g.lineBetween(x + w - 6 - size, y + 6, x + w - 6, y + 6);
    g.lineBetween(x + w - 6, y + 6, x + w - 6, y + 6 + size);
    // Bottom-left
    g.lineBetween(x + 6, y + h - 6 - size, x + 6, y + h - 6);
    g.lineBetween(x + 6, y + h - 6, x + 6 + size, y + h - 6);
    // Bottom-right
    g.lineBetween(x + w - 6 - size, y + h - 6, x + w - 6, y + h - 6);
    g.lineBetween(x + w - 6, y + h - 6, x + w - 6, y + h - 6 - size);
  }

  private getGradeColor(grade: string): number {
    switch (grade) {
      case 'SSS': return 0xffd700;
      case 'S': return 0xff9100;
      case 'A': return 0x00e676;
      case 'B': return 0x29b6f6;
      case 'C':
      default: return 0x90a4ae;
    }
  }

  public hide(): void {
    this.destroy();
  }

  public destroy(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
