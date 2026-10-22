/**
 * 《孤城神机营》- Battlefield Threat Radar & Unit Counter Modal (战局推演与敌情密报弹窗)
 * 
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - National Tide Xuan Paper & Bronze Rivet aesthetics
 * - 4-Axis Threat Radar Metrics (坚甲重御, 疾风突袭, 攻城破门, 领袖凶威)
 * - Enemy Wave Roster with Archetype Badges & Threat Tags
 * - Defensive Readiness Rating (S/A/B/C) with Counter Matrix
 * - Military Counselor Tactical Directives (军师密策)
 */

import Phaser from 'phaser';
import { TacticalThreatReport, TacticalThreatAnalyzer } from '../../core/wave/tactical-radar';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from './ui-theme';
import { BronzeButton } from './bronze-button';
import { SoundManager } from '../audio/sound-manager';

export interface TacticalRadarModalOptions {
  getReport: () => TacticalThreatReport;
  onClose?: () => void;
}

export class TacticalRadarModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private getReport: () => TacticalThreatReport;
  private onClose?: () => void;
  private contentContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, options: TacticalRadarModalOptions) {
    this.scene = scene;
    this.getReport = options.getReport;
    this.onClose = options.onClose;

    this.container = this.scene.add.container(0, 0).setDepth(165).setVisible(false);
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
    const modalH = 1040;
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

    const topY = centerY - modalH / 2;

    // 3. Header Title & Subtitle
    const title = this.scene.add.text(centerX, topY + 45, '【📜 兵法战术推演 · 敌情密报】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subTitle = this.scene.add.text(centerX, topY + 76, '— 知己知彼 · 百战不殆 · 阵法克制 —', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#90a4ae'
    }).setOrigin(0.5);

    // 4. Close Button
    const closeBtn = this.scene.add.text(centerX + modalW / 2 - 38, topY + 35, '✕', {
      fontFamily: UI_FONTS.primary,
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setColor(UI_COLORS.goldBright).setScale(1.1));
    closeBtn.on('pointerout', () => closeBtn.setColor('#ffffff').setScale(1.0));
    closeBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.hide();
    });

    this.container.add([title, subTitle, closeBtn]);

    // 5. Dynamic Content Container
    this.contentContainer = this.scene.add.container(0, 0);
    this.container.add(this.contentContainer);
  }

  public show(): void {
    this.container.setVisible(true);
    this.renderReport();
  }

  public hide(): void {
    this.container.setVisible(false);
    if (this.onClose) {
      this.onClose();
    }
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  private renderReport(): void {
    this.contentContainer.removeAll(true);
    const report = this.getReport();

    const centerX = 375;
    const topY = 667 - 1040 / 2;

    // Wave indicator bar
    const waveBadgeText = report.isBossWave
      ? `👑 决战第 ${report.waveIndex} 波 · 守关大将亲临！`
      : report.isEliteWave
      ? `⚡ 第 ${report.waveIndex} 波 · 精锐前锋突袭！`
      : `⚔️ 第 ${report.waveIndex} 波 · 敌军阵线集结`;

    const waveBanner = this.scene.add.text(centerX, topY + 110, waveBadgeText, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: report.isBossWave ? '#ff5252' : report.isEliteWave ? '#00e5ff' : '#ffd54f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.contentContainer.add(waveBanner);

    // =========================================================================
    // Section 1: 四维敌情威胁雷达 (4-Axis Threat Radar)
    // =========================================================================
    const s1Card = this.scene.add.container(centerX, topY + 225);
    const s1W = 610;
    const s1H = 185;

    const s1Bg = this.scene.add.graphics();
    s1Bg.fillStyle(0x13171e, 0.95);
    s1Bg.fillRoundedRect(-s1W / 2, -s1H / 2, s1W, s1H, 8);
    s1Bg.lineStyle(1.5, UI_COLORS.bronzeBodyNum, 0.8);
    s1Bg.strokeRoundedRect(-s1W / 2, -s1H / 2, s1W, s1H, 8);
    s1Card.add(s1Bg);

    const s1Title = this.scene.add.text(-s1W / 2 + 18, -s1H / 2 + 14, '📊 【四维敌情威胁指数】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    s1Card.add(s1Title);

    // 4 Threat Metrics Bars
    const metrics: Array<{ label: string; icon: string; value: number; danger: string; color: number; hex: string }> = [
      {
        label: '坚甲重御',
        icon: '🛡️',
        value: report.radarRatings.armor,
        danger: report.radarDangerLevels.armor,
        color: 0xffb74d,
        hex: '#ffb74d'
      },
      {
        label: '疾风奔袭',
        icon: '⚡',
        value: report.radarRatings.speed,
        danger: report.radarDangerLevels.speed,
        color: 0x00e5ff,
        hex: '#00e5ff'
      },
      {
        label: '攻城破坏',
        icon: '💣',
        value: report.radarRatings.siege,
        danger: report.radarDangerLevels.siege,
        color: 0xff5252,
        hex: '#ff5252'
      },
      {
        label: '领袖凶威',
        icon: '👑',
        value: report.radarRatings.boss,
        danger: report.radarDangerLevels.boss,
        color: 0xe040fb,
        hex: '#e040fb'
      }
    ];

    const startBarY = -s1H / 2 + 46;
    const barRowH = 32;
    const barW = 280;
    const barH = 14;

    metrics.forEach((m, idx) => {
      const my = startBarY + idx * barRowH;

      // Label & Icon
      const lbl = this.scene.add.text(-s1W / 2 + 20, my, `${m.icon} ${m.label}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: '#eceff1'
      });

      // Background Track
      const barBg = this.scene.add.graphics();
      const bx = -s1W / 2 + 140;
      barBg.fillStyle(0x263238, 1.0);
      barBg.fillRoundedRect(bx, my + 1, barW, barH, 4);

      // Value Fill
      const fillW = Math.max(0, Math.min(barW, Math.round((m.value / 100) * barW)));
      if (fillW > 0) {
        barBg.fillStyle(m.color, 1.0);
        barBg.fillRoundedRect(bx, my + 1, fillW, barH, 4);
      }
      s1Card.add(barBg);

      // Score Text
      const valText = this.scene.add.text(bx + barW + 15, my, `${m.value}/100`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: m.hex,
        fontStyle: 'bold'
      });

      // Danger Tier Badge
      const dangerBadge = m.danger === 'LETHAL' ? '【致命】' : m.danger === 'HIGH' ? '【严峻】' : m.danger === 'MID' ? '【中等】' : '【轻微】';
      const dangerColor = m.danger === 'LETHAL' ? '#ff1744' : m.danger === 'HIGH' ? '#ff9800' : m.danger === 'MID' ? '#ffd54f' : '#81c784';
      const tierText = this.scene.add.text(s1W / 2 - 20, my, dangerBadge, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: dangerColor,
        fontStyle: 'bold'
      }).setOrigin(1, 0);

      s1Card.add([lbl, valText, tierText]);
    });

    this.contentContainer.add(s1Card);

    // =========================================================================
    // Section 2: 敌军编制名册 (Enemy Roster)
    // =========================================================================
    const s2Card = this.scene.add.container(centerX, topY + 410);
    const s2W = 610;
    const s2H = 145;

    const s2Bg = this.scene.add.graphics();
    s2Bg.fillStyle(0x13171e, 0.95);
    s2Bg.fillRoundedRect(-s2W / 2, -s2H / 2, s2W, s2H, 8);
    s2Bg.lineStyle(1.5, UI_COLORS.bronzeBodyNum, 0.8);
    s2Bg.strokeRoundedRect(-s2W / 2, -s2H / 2, s2W, s2H, 8);
    s2Card.add(s2Bg);

    const s2Title = this.scene.add.text(-s2W / 2 + 18, -s2H / 2 + 12, '📋 【敌军来犯编制一览】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    s2Card.add(s2Title);

    const roster = report.enemyRoster.slice(0, 4);
    if (roster.length === 0) {
      const emptyRoster = this.scene.add.text(0, 10, '暂无敌军集结情报', {
        fontFamily: UI_FONTS.primary,
        fontSize: '14px',
        color: '#78909c'
      }).setOrigin(0.5);
      s2Card.add(emptyRoster);
    } else {
      const rosterStartY = -s2H / 2 + 42;
      const rRowH = 26;

      roster.forEach((r, idx) => {
        const ry = rosterStartY + idx * rRowH;
        const icon = r.isBoss ? '👑' : r.archetype === 'heavy' ? '🛡️' : r.archetype === 'charging' ? '⚡' : '⚔️';
        const color = r.isBoss ? '#ff5252' : r.archetype === 'heavy' ? '#ffb74d' : r.archetype === 'charging' ? '#00e5ff' : '#eceff1';

        const rowText = this.scene.add.text(-s2W / 2 + 20, ry, `${icon} ${r.name}  × ${r.count} 名`, {
          fontFamily: UI_FONTS.primary,
          fontSize: '13px',
          color,
          fontStyle: r.isBoss ? 'bold' : 'normal'
        });

        const tagsText = this.scene.add.text(s2W / 2 - 20, ry, r.threatTags.map(t => `[${t}]`).join(' '), {
          fontFamily: UI_FONTS.primary,
          fontSize: '12px',
          color: '#80cbc4'
        }).setOrigin(1, 0);

        s2Card.add([rowText, tagsText]);
      });
    }

    this.contentContainer.add(s2Card);

    // =========================================================================
    // Section 3: 我方防线克制评级 (Readiness Rating)
    // =========================================================================
    const s3Card = this.scene.add.container(centerX, topY + 585);
    const s3W = 610;
    const s3H = 165;

    const s3Bg = this.scene.add.graphics();
    s3Bg.fillStyle(0x13171e, 0.95);
    s3Bg.fillRoundedRect(-s3W / 2, -s3H / 2, s3W, s3H, 8);
    s3Bg.lineStyle(1.5, UI_COLORS.bronzeBodyNum, 0.8);
    s3Bg.strokeRoundedRect(-s3W / 2, -s3H / 2, s3W, s3H, 8);
    s3Card.add(s3Bg);

    const s3Title = this.scene.add.text(-s3W / 2 + 18, -s3H / 2 + 12, '🎯 【我方阵线克制与胜算推演】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    const rank = report.playerReadiness.rank;
    const rankColor = rank === 'S' ? '#ffd700' : rank === 'A' ? '#00e5ff' : rank === 'B' ? '#ffd54f' : '#ff5252';

    const rankBadge = this.scene.add.text(s3W / 2 - 20, -s3H / 2 + 12, `【${rank}阶 · ${report.playerReadiness.rankTitle}】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: rankColor,
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    s3Card.add([s3Title, rankBadge]);

    // 4 Counter Items
    const counters = [
      { label: '破甲火力', eval: report.playerReadiness.counters.armor },
      { label: '阻滞减速', eval: report.playerReadiness.counters.speed },
      { label: '远距截杀', eval: report.playerReadiness.counters.siege },
      { label: '斩首战力', eval: report.playerReadiness.counters.boss }
    ];

    const cStartRowY = -s3H / 2 + 42;
    const cRowH = 28;

    counters.forEach((c, idx) => {
      const cy = cStartRowY + idx * cRowH;
      const statusTag = c.eval.status === 'EXCELLENT' ? '🟢 [充分克制]' : c.eval.status === 'ADEQUATE' ? '🟡 [足以应对]' : '🔴 [防线匮乏]';
      const statusColor = c.eval.status === 'EXCELLENT' ? '#69f0ae' : c.eval.status === 'ADEQUATE' ? '#ffd54f' : '#ff5252';

      const cText = this.scene.add.text(-s3W / 2 + 20, cy, `• ${c.label}: ${statusTag}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: statusColor,
        fontStyle: 'bold'
      });

      const desc = this.scene.add.text(-s3W / 2 + 190, cy, c.eval.description, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: '#b0bec5',
        wordWrap: { width: 400 }
      });

      s3Card.add([cText, desc]);
    });

    this.contentContainer.add(s3Card);

    // =========================================================================
    // Section 4: 军师密策锦囊 (Counselor Directives)
    // =========================================================================
    const s4Card = this.scene.add.container(centerX, topY + 770);
    const s4W = 610;
    const s4H = 160;

    const s4Bg = this.scene.add.graphics();
    s4Bg.fillStyle(0x19202a, 0.95);
    s4Bg.fillRoundedRect(-s4W / 2, -s4H / 2, s4W, s4H, 8);
    s4Bg.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.8);
    s4Bg.strokeRoundedRect(-s4W / 2, -s4H / 2, s4W, s4H, 8);
    s4Card.add(s4Bg);

    const s4Title = this.scene.add.text(-s4W / 2 + 18, -s4H / 2 + 12, '💡 【军师锦囊破敌密策】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    s4Card.add(s4Title);

    const headline = this.scene.add.text(-s4W / 2 + 20, -s4H / 2 + 38, report.headlineAdvice, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#ffd54f',
      fontStyle: 'bold',
      wordWrap: { width: 570 }
    });
    s4Card.add(headline);

    const dirStartY = -s4H / 2 + 70;
    report.detailedDirectives.slice(0, 3).forEach((dir, idx) => {
      const dText = this.scene.add.text(-s4W / 2 + 20, dirStartY + idx * 26, dir, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: '#eceff1',
        wordWrap: { width: 570 }
      });
      s4Card.add(dText);
    });

    this.contentContainer.add(s4Card);

    // =========================================================================
    // Bottom Action: Return to Battlefield
    // =========================================================================
    const returnBtn = new BronzeButton(this.scene, {
      x: centerX,
      y: topY + 910,
      width: 280,
      height: 48,
      title: '领命迎敌 (返回沙盘)',
      variant: 'red',
      onClick: () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.hide();
      }
    });
    this.contentContainer.add(returnBtn);
  }
}
