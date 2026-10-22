/**
 * 《孤城神机营》- In-Game Pause Menu Modal (军机巡阅·战歇调控)
 * Standards & Specs:
 * - 750x1334 Vertical Portrait Viewport
 * - Visual elements:
 *   - Dark scrim (0x0a0c10, 0.90) with pointer event interception
 *   - Xuan paper & cast bronze NineSlice panel (660x900)
 *   - Cinnabar red & gold trim header crest: "军机巡阅 · 战歇"
 *   - Section 1: 战况巡阅 (Current Stage, Wave, Wall HP bar, Silver, Total Kills)
 *   - Section 2: 已纳兵法 (Current Tactics Deck Cards with quality border chips)
 *   - Section 3: 战术调控 (Audio Mute Toggle, Game Speed 1x/2x Toggle, Render Mode 2D/3D Toggle)
 *   - Section 4: 军机决策 (Resume Battle, Restart Stage, Return to Fortress)
 * - Safe interactive confirmation for Restart / Return Home to prevent accidental clicks.
 */

import Phaser from 'phaser';
import { BattleScene, BattlefieldStatus } from '../scenes/battle-scene';
import { UIScene } from '../scenes/ui-scene';
import { BronzeButton } from './bronze-button';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from './ui-theme';
import { SoundManager } from '../audio/sound-manager';
import { ThreeSceneManager } from '../three/three-scene-manager';

export class PauseMenuModal {
  private uiScene: UIScene;
  private battleScene: BattleScene;
  private container: Phaser.GameObjects.Container | null = null;
  private isModalOpen: boolean = false;
  private retryButton?: BronzeButton;
  private exitButton?: BronzeButton;

  constructor(uiScene: UIScene, battleScene: BattleScene) {
    this.uiScene = uiScene;
    this.battleScene = battleScene;
  }

  public isOpen(): boolean {
    return this.isModalOpen;
  }

  /**
   * Displays the pause menu modal on top of the battlefield.
   */
  public show(): void {
    if (this.isModalOpen) return;

    this.isModalOpen = true;

    // 1. Pause game loop and hide 3D canvas so Phaser UI is unobscured
    this.battleScene.pauseBattle();
    ThreeSceneManager.getInstance().setVisible(false);
    SoundManager.getInstance().playBronzeButtonClick();

    // 2. Fetch live battlefield status snapshot
    const status = this.battleScene.getBattlefieldStatus();

    // 3. Root container with high depth (depth 200)
    this.container = this.uiScene.add.container(0, 0).setDepth(200);

    // 4. Fullscreen Dark Scrim (blocks clicks from passing through)
    const scrim = this.uiScene.add.graphics();
    scrim.fillStyle(0x0a0c10, 0.90);
    scrim.fillRect(0, 0, 750, 1334);
    scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.container.add(scrim);

    // 5. Main NineSlice Cast Bronze & Xuan Paper Dialog Panel (660 x 890, centered at 375, 667)
    const panelW = 660;
    const panelH = 890;
    const panelCenterX = 375;
    const panelCenterY = 667;

    const panel = this.uiScene.add.nineslice(
      panelCenterX,
      panelCenterY,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      panelW,
      panelH,
      40, 40, 40, 40
    );
    this.container.add(panel);

    // 6. Header Crest (朱砂红金边军机扁额)
    const crestW = 440;
    const crestH = 64;
    const crestY = panelCenterY - panelH / 2 + 38;

    const headerCrest = this.uiScene.add.graphics();
    headerCrest.fillStyle(UI_COLORS.vermilionCinnabarNum, 0.98);
    headerCrest.fillRoundedRect(panelCenterX - crestW / 2, crestY - crestH / 2, crestW, crestH, 10);
    headerCrest.lineStyle(2.5, UI_COLORS.goldBrightNum, 1.0);
    headerCrest.strokeRoundedRect(panelCenterX - crestW / 2, crestY - crestH / 2, crestW, crestH, 10);
    // Inner fine gold accent border
    headerCrest.lineStyle(1.0, UI_COLORS.goldBrightNum, 0.45);
    headerCrest.strokeRoundedRect(panelCenterX - crestW / 2 + 3, crestY - crestH / 2 + 3, crestW - 6, crestH - 6, 8);
    this.container.add(headerCrest);

    const titleText = this.uiScene.add.text(panelCenterX, crestY - 10, '军 机 巡 阅 · 战 歇', {
      fontFamily: UI_FONTS.primary,
      fontSize: '24px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold',
      stroke: '#2c1e13',
      strokeThickness: 3
    }).setOrigin(0.5);

    const subtitleText = this.uiScene.add.text(panelCenterX, crestY + 16, '—— 筹谋划策 · 审时度势 ——', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffd54f'
    }).setOrigin(0.5);

    // Top-Right Close Button (✖)
    const closeX = panelCenterX + panelW / 2 - 36;
    const closeY = crestY;
    const closeBtn = this.uiScene.add.container(closeX, closeY);

    const closeBg = this.uiScene.add.graphics();
    const drawCloseBg = (isHover: boolean) => {
      closeBg.clear();
      closeBg.fillStyle(isHover ? 0xd32f2f : 0x37474f, 0.9);
      closeBg.fillCircle(0, 0, 18);
      closeBg.lineStyle(1.5, isHover ? 0xffea00 : UI_COLORS.goldBrightNum, 0.9);
      closeBg.strokeCircle(0, 0, 18);
    };
    drawCloseBg(false);

    const closeBtnText = this.uiScene.add.text(0, 0, '✕', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    closeBtn.add([closeBg, closeBtnText]);
    closeBtn.setSize(36, 36).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => {
      drawCloseBg(true);
      closeBtn.setScale(1.1);
    });

    closeBtn.on('pointerout', () => {
      drawCloseBg(false);
      closeBtn.setScale(1.0);
    });

    closeBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.resume();
    });

    this.container.add([titleText, subtitleText, closeBtn]);

    // 7. Section 1: 战况巡阅 (Battle Briefing Card)
    this.createBattleBriefingCard(status, panelCenterX, 345);

    // 8. Section 2: 已纳兵法 (Tactics Deck in Play)
    this.createTacticsDeckCard(status, panelCenterX, 525);

    // 9. Section 3: 战术调控 (Settings Toggles: Audio, Speed, Mode)
    this.createSettingsToggleCard(panelCenterX, 720);

    // 10. Section 4: 军机决策 (Action Buttons: Resume, Restart, Return Home)
    this.createActionButtons(panelCenterX, 825);
  }

  /**
   * Section 1: 战况巡阅 (Current Stage, Wave, Wall HP, Silver, Kills)
   */
  private createBattleBriefingCard(status: BattlefieldStatus, cx: number, cy: number): void {
    if (!this.container) return;

    const cardW = 600;
    const cardH = 114;
    const topY = cy - cardH / 2;

    const cardBg = this.uiScene.add.graphics();
    cardBg.fillStyle(0x131720, 0.94);
    cardBg.fillRoundedRect(cx - cardW / 2, topY, cardW, cardH, 8);
    cardBg.lineStyle(1.5, 0x8d6e63, 0.85);
    cardBg.strokeRoundedRect(cx - cardW / 2, topY, cardW, cardH, 8);

    // Section Badge
    cardBg.fillStyle(0x2c1e13, 1.0);
    cardBg.fillRoundedRect(cx - cardW / 2 + 16, topY - 10, 110, 22, 5);
    cardBg.lineStyle(1, UI_COLORS.goldBrightNum, 0.8);
    cardBg.strokeRoundedRect(cx - cardW / 2 + 16, topY - 10, 110, 22, 5);

    const sectionTitle = this.uiScene.add.text(cx - cardW / 2 + 71, topY + 1, '战 况 巡 阅', {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Row 1: Stage Name & Wave Progress
    const stageStr = status.battleMode === 'endless'
      ? `演武：${status.stageName}`
      : `关隘：${status.stageName} (第 ${status.stageId} 关)`;
    const stageText = this.uiScene.add.text(cx - cardW / 2 + 20, topY + 22, stageStr, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffd54f',
      fontStyle: 'bold'
    });

    const waveStr = status.battleMode === 'endless'
      ? `第 ${status.currentWave} 波 (演武)`
      : `波次：第 ${status.currentWave} / ${status.totalWaves} 波`;
    const waveText = this.uiScene.add.text(cx + cardW / 2 - 20, topY + 22, waveStr, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#80d8ff',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    // Row 2: Live Wall HP
    const hpRatio = status.wallMaxHp > 0 ? Math.max(0, status.wallHp / status.wallMaxHp) : 0;
    const hpColorHex = hpRatio > 0.6 ? 0x00e676 : hpRatio > 0.3 ? 0xffca28 : 0xff1744;
    const hpColorStr = hpRatio > 0.6 ? '#00e676' : hpRatio > 0.3 ? '#ffca28' : '#ff1744';

    const hpBarW = 260;
    const hpBarH = 10;
    const hpBarX = cx - cardW / 2 + 90;
    const hpBarY = topY + 54;

    const hpG = this.uiScene.add.graphics();
    hpG.fillStyle(0x212121, 0.9);
    hpG.fillRoundedRect(hpBarX, hpBarY, hpBarW, hpBarH, 4);
    hpG.fillStyle(hpColorHex, 1.0);
    hpG.fillRoundedRect(hpBarX, hpBarY, hpBarW * Math.min(1.0, hpRatio), hpBarH, 4);

    const hpLabel = this.uiScene.add.text(cx - cardW / 2 + 20, topY + 50, '城防坚固：', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#b0bec5'
    });

    const hpValue = this.uiScene.add.text(hpBarX + hpBarW + 12, topY + 50, `${status.wallHp} / ${status.wallMaxHp} (${Math.round(hpRatio * 100)}%)`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: hpColorStr,
      fontStyle: 'bold'
    });

    // Row 3: Total Kills & Available Silver
    const killText = this.uiScene.add.text(cx - cardW / 2 + 20, topY + 80, `⚔️ 累计歼敌：${status.totalKills} 众`, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#e0e0e0'
    });

    const silverText = this.uiScene.add.text(cx + cardW / 2 - 20, topY + 80, `🪙 军资存银：${status.silver} 银两`, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.container.add([cardBg, sectionTitle, stageText, waveText, hpLabel, hpG, hpValue, killText, silverText]);
  }

  /**
   * Section 2: 已纳兵法 (Tactics Deck in Play)
   */
  private createTacticsDeckCard(status: BattlefieldStatus, cx: number, cy: number): void {
    if (!this.container) return;

    const cardW = 600;
    const cardH = 224;
    const topY = cy - cardH / 2;

    const cardBg = this.uiScene.add.graphics();
    cardBg.fillStyle(0x131720, 0.94);
    cardBg.fillRoundedRect(cx - cardW / 2, topY, cardW, cardH, 8);
    cardBg.lineStyle(1.5, 0x455a64, 0.85);
    cardBg.strokeRoundedRect(cx - cardW / 2, topY, cardW, cardH, 8);

    // Section Badge
    cardBg.fillStyle(0x1a2634, 1.0);
    cardBg.fillRoundedRect(cx - cardW / 2 + 16, topY - 10, 130, 22, 5);
    cardBg.lineStyle(1, 0x90caf9, 0.8);
    cardBg.strokeRoundedRect(cx - cardW / 2 + 16, topY - 10, 130, 22, 5);

    const sectionTitle = this.uiScene.add.text(
      cx - cardW / 2 + 81,
      topY + 1,
      `已 纳 兵 法 (${status.pickedTactics.length} 卷)`,
      {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: '#90caf9',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    this.container.add([cardBg, sectionTitle]);

    if (status.pickedTactics.length === 0) {
      // Empty placeholder
      const emptyText = this.uiScene.add.text(
        cx,
        cy + 10,
        '当前尚未纳策\n（每波战胜后可从军机大典三选一纳策入阵）',
        {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: '#78909c',
          align: 'center',
          lineSpacing: 6
        }
      ).setOrigin(0.5);
      this.container.add(emptyText);
      return;
    }

    // Grid of up to 6 tactic cards (2 columns x 3 rows)
    const chipW = 280;
    const chipH = 54;
    const col0X = cx - cardW / 2 + 14;
    const col1X = cx + 8;
    const startY = topY + 24;

    const qualityColorMap: Record<string, { num: number; hex: string }> = {
      purple: { num: 0xba68c8, hex: '#ba68c8' },
      gold: { num: 0xffd54f, hex: '#ffd54f' },
      red_gold: { num: 0xff4081, hex: '#ff4081' },
      blue: { num: 0x4fc3f7, hex: '#4fc3f7' },
      green: { num: 0x81c784, hex: '#81c784' }
    };

    const displayCount = Math.min(6, status.pickedTactics.length);
    for (let i = 0; i < displayCount; i++) {
      const item = status.pickedTactics[i];
      const col = i % 2;
      const row = Math.floor(i / 2);

      const itemX = col === 0 ? col0X : col1X;
      const itemY = startY + row * (chipH + 8);

      const qInfo = qualityColorMap[item.config.quality] || qualityColorMap.blue;

      const chipBg = this.uiScene.add.graphics();
      chipBg.fillStyle(0x1a212d, 0.95);
      chipBg.fillRoundedRect(itemX, itemY, chipW, chipH, 6);
      chipBg.lineStyle(1.2, qInfo.num, 0.85);
      chipBg.strokeRoundedRect(itemX, itemY, chipW, chipH, 6);

      const titleStr = item.count > 1
        ? `【${item.config.name}】x${item.count}`
        : `【${item.config.name}】`;
      const itemTitle = this.uiScene.add.text(itemX + 8, itemY + 6, titleStr, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: qInfo.hex,
        fontStyle: 'bold'
      });

      const catBadge = this.uiScene.add.text(itemX + chipW - 8, itemY + 6, `[${item.config.category}]`, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: '#90a4ae'
      }).setOrigin(1, 0);

      // 1-line brief description truncated
      const rawDesc = item.config.description || '';
      const briefDesc = rawDesc.length > 20 ? rawDesc.substring(0, 19) + '...' : rawDesc;
      const descText = this.uiScene.add.text(itemX + 8, itemY + 28, briefDesc, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#b0bec5'
      });

      this.container.add([chipBg, itemTitle, catBadge, descText]);
    }

    if (status.pickedTactics.length > 6) {
      const overflowText = this.uiScene.add.text(
        cx,
        topY + cardH - 12,
        `...另有 ${status.pickedTactics.length - 6} 卷兵法全军生效中`,
        {
          fontFamily: 'sans-serif',
          fontSize: '11px',
          color: '#80deea'
        }
      ).setOrigin(0.5);
      this.container.add(overflowText);
    }
  }

  /**
   * Section 3: 战术调控 (Settings Toggles: Audio, Speed, Mode)
   */
  private createSettingsToggleCard(cx: number, cy: number): void {
    if (!this.container) return;

    const cardW = 600;
    const cardH = 82;
    const topY = cy - cardH / 2;

    const cardBg = this.uiScene.add.graphics();
    cardBg.fillStyle(0x131720, 0.94);
    cardBg.fillRoundedRect(cx - cardW / 2, topY, cardW, cardH, 8);
    cardBg.lineStyle(1.5, 0x546e7a, 0.85);
    cardBg.strokeRoundedRect(cx - cardW / 2, topY, cardW, cardH, 8);

    // Section Badge
    cardBg.fillStyle(0x212b36, 1.0);
    cardBg.fillRoundedRect(cx - cardW / 2 + 16, topY - 10, 110, 22, 5);
    cardBg.lineStyle(1, 0x80deea, 0.8);
    cardBg.strokeRoundedRect(cx - cardW / 2 + 16, topY - 10, 110, 22, 5);

    const sectionTitle = this.uiScene.add.text(cx - cardW / 2 + 71, topY + 1, '战 术 调 控', {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: '#80deea',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.container.add([cardBg, sectionTitle]);

    // 3 Buttons placed side by side: Sound, Speed, Mode
    const btnW = 180;
    const btnH = 42;
    const btnY = cy + 10;
    const spacing = 195;

    // 1. Audio Mute Toggle
    const audioBtnX = cx - spacing;
    const isMuted = SoundManager.getInstance().getIsMuted();
    const audioBtn = this.createTogglePill(
      audioBtnX,
      btnY,
      btnW,
      btnH,
      isMuted ? '🔇 全局静音' : '🎵 战乐开启',
      isMuted ? '#d32f2f' : '#2e7d32',
      () => {
        const nextMuted = SoundManager.getInstance().toggleMute();
        audioBtn.text.setText(nextMuted ? '🔇 全局静音' : '🎵 战乐开启');
        audioBtn.updateColor(nextMuted ? '#d32f2f' : '#2e7d32');
        this.uiScene.updateMuteButton(nextMuted);
      }
    );

    // 2. Speed Toggle
    const speedBtnX = cx;
    const curSpeed = this.battleScene.gameSpeed;
    const speedBtn = this.createTogglePill(
      speedBtnX,
      btnY,
      btnW,
      btnH,
      curSpeed === 2.0 ? '⚡ 2x 倍速' : '⏩ 1x 常速',
      curSpeed === 2.0 ? '#ef6c00' : '#37474f',
      () => {
        const nextSpeed = this.battleScene.toggleGameSpeed();
        speedBtn.text.setText(nextSpeed === 2.0 ? '⚡ 2x 倍速' : '⏩ 1x 常速');
        speedBtn.updateColor(nextSpeed === 2.0 ? '#ef6c00' : '#37474f');
        this.uiScene.updateSpeedButton(nextSpeed);
      }
    );

    // 3. Render Mode Toggle
    const modeBtnX = cx + spacing;
    const curMode = ThreeSceneManager.getInstance().getRenderMode();
    const modeBtn = this.createTogglePill(
      modeBtnX,
      btnY,
      btnW,
      btnH,
      curMode === '3d' ? '⚔️ 3D 纵深' : '🎨 2.5D 平面',
      curMode === '3d' ? '#b71c1c' : '#455a64',
      () => {
        const nextMode = this.battleScene.toggleRenderMode();
        modeBtn.text.setText(nextMode === '3d' ? '⚔️ 3D 纵深' : '🎨 2.5D 平面');
        modeBtn.updateColor(nextMode === '3d' ? '#b71c1c' : '#455a64');
        this.uiScene.updateViewModeButton(nextMode);
      }
    );

    this.container.add([audioBtn.container, speedBtn.container, modeBtn.container]);
  }

  /**
   * Helper to create styled toggle buttons for the settings section
   */
  private createTogglePill(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    colorHex: string,
    onClick: () => void
  ): { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; updateColor: (c: string) => void } {
    const cont = this.uiScene.add.container(x, y);
    const bg = this.uiScene.add.graphics();

    let currentBgCol = parseInt(colorHex.replace('#', '0x'), 16);
    const drawBg = (bgCol: number, isHover = false) => {
      bg.clear();
      bg.fillStyle(bgCol, 0.95);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      bg.lineStyle(isHover ? 2.0 : 1.5, isHover ? 0xffea00 : 0xffd54f, isHover ? 1.0 : 0.7);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    };

    drawBg(currentBgCol, false);

    const text = this.uiScene.add.text(0, 0, label, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    cont.add([bg, text]);
    cont.setSize(w, h);
    cont.setInteractive({ useHandCursor: true });

    cont.on('pointerover', () => {
      drawBg(currentBgCol, true);
      cont.setScale(1.04);
    });

    cont.on('pointerout', () => {
      drawBg(currentBgCol, false);
      cont.setScale(1.0);
    });

    cont.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      onClick();
    });

    return {
      container: cont,
      text,
      updateColor: (newColorHex: string) => {
        currentBgCol = parseInt(newColorHex.replace('#', '0x'), 16);
        drawBg(currentBgCol, false);
      }
    };
  }

  /**
   * Section 4: 军机决策 (Action Buttons: Resume, Restart, Return Home)
   */
  private createActionButtons(cx: number, cy: number): void {
    if (!this.container) return;

    // Button 1: ⚔️ 继续守城 (Resume) - Prominent hero button
    const resumeBtn = new BronzeButton(this.uiScene, {
      x: cx,
      y: cy,
      width: 580,
      height: 50,
      variant: 'bronze',
      title: '⚔️ 继 续 守 城',
      enableGlow: true,
      onClick: () => {
        this.resume();
      }
    });
    this.container.add(resumeBtn);

    // Button 2 & 3: Row with 🔄 重整旗鼓 and 🏛️ 鸣金收兵
    const subRowY = cy + 62;
    const subBtnW = 280;
    const subBtnH = 46;

    // Retry Button: Direct single-click immediate restart
    this.retryButton = new BronzeButton(this.uiScene, {
      x: cx - 150,
      y: subRowY,
      width: subBtnW,
      height: subBtnH,
      variant: 'bronze',
      title: '🔄 重 整 旗 鼓',
      onClick: () => {
        this.retryStage();
      }
    });
    this.container.add(this.retryButton);

    // Return to Home Button: Direct single-click immediate return
    this.exitButton = new BronzeButton(this.uiScene, {
      x: cx + 150,
      y: subRowY,
      width: subBtnW,
      height: subBtnH,
      variant: 'red',
      title: '🏛️ 鸣 金 收 兵',
      onClick: () => {
        this.returnToHome();
      }
    });
    this.container.add(this.exitButton);
  }

  /**
   * Closes the pause modal, restores 3D canvas visibility if needed, and resumes combat loop.
   */
  public resume(): void {
    if (!this.isModalOpen) return;

    SoundManager.getInstance().playBronzeButtonClick();
    this.destroy();
    this.battleScene.resumeBattle();

    if (ThreeSceneManager.getInstance().getRenderMode() === '3d') {
      ThreeSceneManager.getInstance().setVisible(true);
    }
  }

  /**
   * Restarts current stage from wave 1.
   */
  public retryStage(): void {
    SoundManager.getInstance().playBronzeButtonClick();
    this.destroy();
    this.battleScene.resumeBattle();
    this.battleScene.retryBattle();
  }

  /**
   * Safely exits current battle and returns to HomeScene.
   */
  public returnToHome(): void {
    SoundManager.getInstance().playBronzeButtonClick();
    this.destroy();
    this.battleScene.resumeBattle();
    this.battleScene.teardownAndExitToHome();
  }

  /**
   * Destroys all modal visual nodes and cleans up memory.
   */
  public destroy(): void {
    this.isModalOpen = false;

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
