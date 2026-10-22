/**
 * 《孤城神机营》- Guochao Cinnabar Revival Modal Component (神机急援·军令召集复活弹窗)
 * Standards & Specs:
 * - 750x1334 Vertical Portrait Viewport
 * - Visual elements: Vermilion cinnabar stamp, Xuan paper parchment background,
 *   10-second countdown circular progress ring, gold-rimmed bronze button "看战报急令急援",
 *   and grey-bronze button "誓与城共存亡 (放弃)".
 * - Countdown automatically ticks from 10 down to 0, triggering onAbandon upon timeout.
 */

import Phaser from 'phaser';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from './ui-theme';
import { BronzeButton } from './bronze-button';
import { VermilionStamp } from './vermilion-stamp';
import { SoundManager } from '../audio/sound-manager';

export interface RevivalModalCallbacks {
  onWatchAd: () => void;
  onAbandon: () => void;
}

export class RevivalModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private remainingSeconds: number = 10;
  private progressGraphics: Phaser.GameObjects.Graphics | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private isCountingDown: boolean = false;
  private callbacks: RevivalModalCallbacks | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Displays the revival modal on top of the battlefield.
   */
  public show(callbacks: RevivalModalCallbacks): void {
    if (this.container) {
      this.destroy();
    }

    this.callbacks = callbacks;
    this.remainingSeconds = 10;
    this.isCountingDown = true;

    this.container = this.scene.add.container(0, 0).setDepth(300);

    // 1. Fullscreen Dark Scrim with Fade-in (blocks interactions behind)
    const scrim = this.scene.add.graphics();
    scrim.fillStyle(0x0a0c10, 0.90);
    scrim.fillRect(0, 0, 750, 1334);
    scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.container.add(scrim);

    // 2. Main Decorative Dialog Panel (Xuan Paper & Cast Bronze NineSlice)
    const panelX = 55;
    const panelY = 280;
    const panelW = 640;
    const panelH = 720;

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

    // 3. Header Banner / Title Crest (朱砂红底金边)
    const headerCrest = this.scene.add.graphics();
    headerCrest.fillStyle(UI_COLORS.vermilionCinnabarNum, 1.0);
    headerCrest.fillRoundedRect(175, 240, 400, 68, 12);
    headerCrest.lineStyle(2.5, UI_COLORS.goldBrightNum, 1.0);
    headerCrest.strokeRoundedRect(175, 240, 400, 68, 12);
    this.container.add(headerCrest);

    const titleText = this.scene.add.text(375, 274, '神 机 急 援 · 军 令 召 集', {
      fontFamily: UI_FONTS.primary,
      fontSize: '26px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold',
      stroke: '#2c1e13',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.container.add(titleText);

    // 4. Stamping Cinnabar Seal ("急" or "大捷" stamp)
    VermilionStamp.stampAt(this.scene, 610, 275, UI_TEXTURE_KEYS.STAMP_DAJIE, {
      targetPanel: this.container,
      targetDepth: 350,
      finalScale: 0.75
    });

    // 5. Emergency Subtitle & Lore Description
    const emergencySub = this.scene.add.text(375, 345, '【城垣垂危 · 破釜沉舟】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '20px',
      color: UI_COLORS.vermilionBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const loreText = this.scene.add.text(
      375,
      395,
      '城门耐久告急，外夷逼城！\n急发神机箭令召集后卫精锐，可挽狂澜于既倒！\n复活后城防恢复 50% 耐久，全场敌兵震退眩晕！',
      {
        fontFamily: UI_FONTS.primary,
        fontSize: '16px',
        color: '#e0d8c3',
        align: 'center',
        lineSpacing: 8
      }
    ).setOrigin(0.5);

    this.container.add([emergencySub, loreText]);

    // 6. 10s Countdown Circular Progress Ring
    const ringCenterX = 375;
    const ringCenterY = 530;
    const ringRadius = 55;

    // Background circle track
    const trackGraphics = this.scene.add.graphics();
    trackGraphics.lineStyle(6, 0x3e2e1e, 0.8);
    trackGraphics.strokeCircle(ringCenterX, ringCenterY, ringRadius);
    this.container.add(trackGraphics);

    // Dynamic countdown progress arc
    this.progressGraphics = this.scene.add.graphics();
    this.container.add(this.progressGraphics);

    // Center Countdown Digits
    this.timerText = this.scene.add.text(ringCenterX, ringCenterY - 4, `${this.remainingSeconds}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '44px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold',
      stroke: '#1b120c',
      strokeThickness: 4
    }).setOrigin(0.5);

    const unitText = this.scene.add.text(ringCenterX, ringCenterY + 28, '秒后失守', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.textDim
    }).setOrigin(0.5);

    this.container.add([this.timerText, unitText]);

    this.updateProgressRing(1.0);

    // 7. Action Buttons
    // A. "看战报急令急援 / 观看广告复活" (Bronze Gold Glowing Button)
    const watchAdBtn = new BronzeButton(this.scene, {
      x: 375,
      y: 690,
      width: 440,
      height: 64,
      variant: 'bronze',
      enableGlow: true,
      title: '看战报急令急援',
      subtitle: '观看完整军报 · 城防恢复50%耐久',
      onClick: () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.callbacks?.onWatchAd();
      }
    });

    // B. "誓与城共存亡 (放弃)" (Muted/Grey Bronze Button)
    const abandonBtn = new BronzeButton(this.scene, {
      x: 375,
      y: 785,
      width: 360,
      height: 52,
      variant: 'bronze',
      title: '誓与城共存亡 (放弃)',
      onClick: () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.triggerAbandon();
      }
    });

    this.container.add([watchAdBtn, abandonBtn]);

    // 8. Start 10s Ticking Timer
    this.startCountdownTimer();
  }

  private startCountdownTimer(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
    }

    const totalDurationMs = 10000;
    const intervalMs = 100;
    let elapsedMs = 0;

    this.timerEvent = this.scene.time.addEvent({
      delay: intervalMs,
      loop: true,
      callback: () => {
        if (!this.isCountingDown) return;

        elapsedMs += intervalMs;
        const progress = Math.max(0, 1 - elapsedMs / totalDurationMs);
        this.remainingSeconds = Math.max(0, Math.ceil((totalDurationMs - elapsedMs) / 1000));

        if (this.timerText) {
          this.timerText.setText(`${this.remainingSeconds}`);
          if (this.remainingSeconds <= 3) {
            this.timerText.setColor(UI_COLORS.vermilionBright);
          }
        }

        this.updateProgressRing(progress);

        if (elapsedMs >= totalDurationMs) {
          this.triggerAbandon();
        }
      }
    });
  }

  private updateProgressRing(progress: number): void {
    if (!this.progressGraphics) return;

    this.progressGraphics.clear();
    const ringCenterX = 375;
    const ringCenterY = 530;
    const ringRadius = 55;

    const startAngle = Phaser.Math.DegToRad(-90);
    const endAngle = Phaser.Math.DegToRad(-90 + 360 * progress);

    const strokeColor = progress > 0.3 ? UI_COLORS.goldBrightNum : UI_COLORS.vermilionBrightNum;

    this.progressGraphics.lineStyle(6, strokeColor, 1.0);
    this.progressGraphics.beginPath();
    this.progressGraphics.arc(ringCenterX, ringCenterY, ringRadius, startAngle, endAngle, false);
    this.progressGraphics.strokePath();
  }

  public pauseCountdown(): void {
    this.isCountingDown = false;
  }

  public resumeCountdown(): void {
    this.isCountingDown = true;
  }

  public resetCountdown(): void {
    this.remainingSeconds = 10;
    if (this.timerText) {
      this.timerText.setText('10');
      this.timerText.setColor(UI_COLORS.goldBright);
    }
    this.updateProgressRing(1.0);
    this.startCountdownTimer();
  }

  private triggerAbandon(): void {
    this.isCountingDown = false;
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
    this.hide();
    this.callbacks?.onAbandon();
  }

  public hide(): void {
    this.isCountingDown = false;
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
    if (this.container) {
      this.container.setVisible(false);
    }
  }

  public destroy(): void {
    this.isCountingDown = false;
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.progressGraphics = null;
    this.timerText = null;
    this.callbacks = null;
  }
}
