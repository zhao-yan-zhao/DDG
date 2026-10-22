/**
 * 《孤城神机营》- Endless Mode & Leaderboard Modal (神机演武·战功榜弹窗)
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - National Tide Xuan Paper & Bronze Rivet aesthetics
 * - Dual Tabs: "全国风云榜" & "同省战功榜"
 * - Displays Player's Current Military Title, Highest Wave Record, and Ladder placement
 * - Action button to embark into Endless Mode
 */

import Phaser from 'phaser';
import { LeaderboardManager } from '../../core/endless/leaderboard-manager';
import { EndlessManager } from '../../core/endless/endless-manager';
import { LeaderboardEntry } from '../../core/endless/types';
import { PlayerProfile } from '../../core/meta/types';
import { ProfileStorage } from '../../core/meta/profile-storage';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from './ui-theme';
import { BronzeButton } from './bronze-button';
import { SoundManager } from '../audio/sound-manager';

export interface EndlessModalOptions {
  profileStorage: ProfileStorage;
  profile: PlayerProfile;
  onEmbark: () => void;
}

export class EndlessModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private profileStorage: ProfileStorage;
  private profile: PlayerProfile;
  private onEmbark: () => void;
  private leaderboardManager: LeaderboardManager;

  private currentTab: 'national' | 'city' = 'national';
  private listContainer!: Phaser.GameObjects.Container;
  private tabNationalBtn!: Phaser.GameObjects.Text;
  private tabCityBtn!: Phaser.GameObjects.Text;
  private tabIndicator!: Phaser.GameObjects.Graphics;

  private playerTitleText!: Phaser.GameObjects.Text;
  private playerWaveText!: Phaser.GameObjects.Text;
  private playerRankText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, options: EndlessModalOptions) {
    this.scene = scene;
    this.profileStorage = options.profileStorage;
    this.profile = options.profile;
    this.onEmbark = options.onEmbark;
    this.leaderboardManager = new LeaderboardManager();

    this.container = this.scene.add.container(0, 0).setDepth(160).setVisible(false);
    this.createModal();
  }

  private createModal(): void {
    // 1. Dark semi-transparent backdrop
    const dim = this.scene.add.graphics();
    dim.fillStyle(0x000000, 0.88);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.container.add(dim);

    // 2. Xuan Paper & Bronze Rivet NineSlice Panel
    const modalW = 670;
    const modalH = 980;
    const centerX = 375;
    const centerY = 667;

    const panel = this.scene.add.nineslice(
      centerX,
      centerY,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      modalW,
      modalH,
      40, 40, 40, 40
    );
    this.container.add(panel);

    // 3. Modal Header Banner
    const topY = centerY - modalH / 2;
    const titleText = this.scene.add.text(centerX, topY + 48, '神 机 演 武 · 战 功 榜', {
      fontFamily: UI_FONTS.primary,
      fontSize: '26px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const seal = this.scene.add.image(centerX + 240, topY + 50, UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN)
      .setDisplaySize(58, 58)
      .setAlpha(0.85);

    // Close '✕' Button
    const closeBtn = this.scene.add.text(centerX + 285, topY + 45, '✕', {
      fontFamily: 'sans-serif',
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
      this.hide();
    });

    this.container.add([titleText, seal, closeBtn]);

    // 4. Personal Record Showcase Card
    this.createPlayerSummaryCard(centerX, topY + 115, modalW - 60);

    // 5. Dual-Tab Switcher
    this.createTabSwitcher(centerX, topY + 225, modalW - 60);

    // 6. Leaderboard List Container
    this.listContainer = this.scene.add.container(centerX - (modalW - 60) / 2, topY + 285);
    this.container.add(this.listContainer);

    // 7. Bottom Embark Action Button
    new BronzeButton(this.scene, {
      x: centerX,
      y: topY + modalH - 70,
      width: 480,
      height: 64,
      variant: 'red',
      enableGlow: true,
      title: '⚔️  出 征 · 神 机 演 武',
      subtitle: '无尽波次怪潮 · 斩获军功与玄铁',
      onClick: () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.hide();
        this.onEmbark();
      }
    });

    this.renderRankings();
  }

  private createPlayerSummaryCard(x: number, y: number, w: number): void {
    const cardH = 92;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a212b, 0.95);
    bg.fillRoundedRect(x - w / 2, y, w, cardH, 12);
    bg.lineStyle(2, UI_COLORS.goldBrightNum, 0.7);
    bg.strokeRoundedRect(x - w / 2, y, w, cardH, 12);
    this.container.add(bg);

    const highestWave = this.profile.endless?.highestWave || 0;
    const rankTier = EndlessManager.getMilitaryRankTier(highestWave);

    this.playerTitleText = this.scene.add.text(x - w / 2 + 24, y + 22, `大明官阶：【${rankTier.title}】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '19px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    const honorBadgeText = this.scene.add.text(x - w / 2 + 24, y + 54, `战功印绶：${rankTier.honorBadge}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#80cbc4'
    });

    this.playerWaveText = this.scene.add.text(x + w / 2 - 24, y + 22, `最高防守：${highestWave} 波`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.playerRankText = this.scene.add.text(x + w / 2 - 24, y + 54, '排名：计算中...', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#ffb74d'
    }).setOrigin(1, 0);

    this.container.add([this.playerTitleText, honorBadgeText, this.playerWaveText, this.playerRankText]);
  }

  private createTabSwitcher(x: number, y: number, w: number): void {
    const tabH = 44;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111317, 0.9);
    bg.fillRoundedRect(x - w / 2, y, w, tabH, 8);
    this.container.add(bg);

    const halfW = w / 2;
    this.tabIndicator = this.scene.add.graphics();
    this.updateTabIndicator(x - halfW / 2, y, halfW, tabH);
    this.container.add(this.tabIndicator);

    this.tabNationalBtn = this.scene.add.text(x - halfW / 2, y + tabH / 2, '🚩 全国风云榜', {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      padding: { x: 8, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tabNationalBtn.on('pointerdown', () => {
      if (this.currentTab === 'national') return;
      SoundManager.getInstance().playBronzeButtonClick();
      this.currentTab = 'national';
      this.updateTabIndicator(x - halfW / 2, y, halfW, tabH);
      this.tabNationalBtn.setColor('#ffffff');
      this.tabCityBtn.setColor('#90a4ae');
      this.renderRankings();
    });

    const cityName = this.profile.endless?.lastCityName || '北京市';
    this.tabCityBtn = this.scene.add.text(x + halfW / 2, y + tabH / 2, `📍 同省战功榜 (${cityName})`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#90a4ae',
      padding: { x: 8, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    [this.tabNationalBtn, this.tabCityBtn].forEach(btn => {
      btn.on('pointerover', () => {
        btn.setScale(1.05);
      });
      btn.on('pointerout', () => {
        btn.setScale(1.0);
      });
    });

    this.tabCityBtn.on('pointerdown', () => {
      if (this.currentTab === 'city') return;
      SoundManager.getInstance().playBronzeButtonClick();
      this.currentTab = 'city';
      this.updateTabIndicator(x + halfW / 2, y, halfW, tabH);
      this.tabCityBtn.setColor('#ffffff');
      this.tabNationalBtn.setColor('#90a4ae');
      this.renderRankings();
    });

    this.container.add([this.tabNationalBtn, this.tabCityBtn]);
  }

  private updateTabIndicator(x: number, y: number, w: number, h: number): void {
    this.tabIndicator.clear();
    this.tabIndicator.fillStyle(0x2e3c4e, 0.95);
    this.tabIndicator.fillRoundedRect(x - w / 2 + 4, y + 4, w - 8, h - 8, 6);
    this.tabIndicator.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.9);
    this.tabIndicator.strokeRoundedRect(x - w / 2 + 4, y + 4, w - 8, h - 8, 6);
  }

  private renderRankings(): void {
    this.listContainer.removeAll(true);

    const highestWave = this.profile.endless?.highestWave || 0;
    const highestScore = this.profile.endless?.highestScore || 0;

    const { entries, playerRank } = this.leaderboardManager.getRankings(this.currentTab, {
      openId: 'player_local_user',
      nickname: '我 (神机大统领)',
      cityName: this.profile.endless?.lastCityName || '北京市朝阳区',
      maxWave: highestWave,
      score: highestScore,
      commanderId: this.profile.selectedCommander || 'wang_shouren'
    });

    // Update player rank badge in summary card
    if (this.playerRankText) {
      if (playerRank) {
        this.playerRankText.setText(`榜单排名：第 ${playerRank} 名`);
        this.playerRankText.setColor(playerRank <= 3 ? '#ffd700' : '#4fc3f7');
      } else {
        this.playerRankText.setText('榜单排名：暂未入榜 (出征破纪录)');
        this.playerRankText.setColor('#90a4ae');
      }
    }

    const rowW = 610;
    const rowH = 54;
    const spacing = 7;

    entries.forEach((entry, idx) => {
      const row = this.scene.add.container(0, idx * (rowH + spacing));

      const isMe = entry.openId === 'player_local_user';
      const rowBg = this.scene.add.graphics();
      const bgColor = isMe ? 0x243447 : (idx % 2 === 0 ? 0x151b22 : 0x1a212b);
      rowBg.fillStyle(bgColor, 0.9);
      rowBg.fillRoundedRect(0, 0, rowW, rowH, 8);

      if (isMe) {
        rowBg.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.95);
        rowBg.strokeRoundedRect(0, 0, rowW, rowH, 8);
      } else if (entry.rank <= 3) {
        const medalBorder = entry.rank === 1 ? 0xffd700 : (entry.rank === 2 ? 0xcfd8dc : 0xb87333);
        rowBg.lineStyle(1, medalBorder, 0.6);
        rowBg.strokeRoundedRect(0, 0, rowW, rowH, 8);
      }
      row.add(rowBg);

      // Rank Medallion
      let rankColor = '#cfd8dc';
      let rankPrefix = `${entry.rank}`;
      if (entry.rank === 1) {
        rankColor = '#ffd700';
        rankPrefix = '🥇 1';
      } else if (entry.rank === 2) {
        rankColor = '#e0e0e0';
        rankPrefix = '🥈 2';
      } else if (entry.rank === 3) {
        rankColor = '#cd7f32';
        rankPrefix = '🥉 3';
      }

      const rankText = this.scene.add.text(26, rowH / 2, rankPrefix, {
        fontFamily: UI_FONTS.primary,
        fontSize: '18px',
        color: rankColor,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Nickname & City
      const nameText = this.scene.add.text(75, 12, entry.nickname, {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: isMe ? '#ffd700' : '#ffffff',
        fontStyle: isMe ? 'bold' : 'normal'
      });

      const cityText = this.scene.add.text(75, 32, `📍 ${entry.cityName}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: '#78909c'
      });

      // Military Title Pill
      const titlePill = this.scene.add.text(320, rowH / 2, `【${entry.militaryTitle}】`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: '#ffb74d'
      }).setOrigin(0, 0.5);

      // Wave & Score
      const waveText = this.scene.add.text(rowW - 20, 12, `第 ${entry.maxWave} 波`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: '#00e5ff',
        fontStyle: 'bold'
      }).setOrigin(1, 0);

      const scoreText = this.scene.add.text(rowW - 20, 32, `${entry.score.toLocaleString()} 分`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: '#b0bec5'
      }).setOrigin(1, 0);

      row.add([rankText, nameText, cityText, titlePill, waveText, scoreText]);
      this.listContainer.add(row);
    });
  }

  public show(): void {
    this.container.setVisible(true);
    // Refresh player stats from profile
    const highestWave = this.profile.endless?.highestWave || 0;
    const rankTier = EndlessManager.getMilitaryRankTier(highestWave);
    this.playerTitleText.setText(`大明官阶：【${rankTier.title}】`);
    this.playerWaveText.setText(`最高防守：${highestWave} 波`);
    this.renderRankings();
  }

  public hide(): void {
    this.container.setVisible(false);
  }
}
