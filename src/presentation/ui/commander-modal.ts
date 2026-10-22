/**
 * 《孤城神机营》- 帅帐拜将台 (Commander Selection & Grand General Appointment Modal)
 * Standards & Specs:
 * - Extends Phaser.GameObjects.Container
 * - NineSlice Xuan Paper & Cast Bronze Panel (PANEL_XUAN_BRONZE, 680 x 1120 px, centered)
 * - Header: 烫金大字“帅 帐 拜 将 · 节 制 三 军”，右上角关闭按键
 * - Four Grand Commanders: 王守仁 (神火), 禽滑厘 (墨家), 秦良玉 (城防), 刘伯温 (奇门)
 * - Displays avatar badges, faction labels, passives, ultimates, and current active status
 * - Interactive "命为主帅" button with Vermilion stamp SFX, ProfileStorage persistence, and Gold Toast
 */

import Phaser from 'phaser';
import { ProfileStorage } from '../../core/meta/profile-storage';
import { PlayerProfile, CommanderId } from '../../core/meta/types';
import { COMMANDERS_CONFIG } from '../../config/commanders.config';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from './ui-theme';
import { SoundManager } from '../audio/sound-manager';
import { BronzeButton } from './bronze-button';

export interface CommanderModalOptions {
  profileStorage: ProfileStorage;
  profile: PlayerProfile;
  onCommanderSelected?: (commanderId: CommanderId | string) => void;
  onClose?: () => void;
}

interface CommanderCardViewConfig {
  id: CommanderId;
  name: string;
  title: string;
  factionLabel: string;
  factionColor: string;
  factionBgColor: number;
  factionBorderColor: number;
  stampKey: string;
  avatarKey: string;
  passiveTitle: string;
  passiveDesc: string;
  ultimateTitle: string;
  ultimateDesc: string;
}

export class CommanderModal extends Phaser.GameObjects.Container {
  private profileStorage: ProfileStorage;
  private profile: PlayerProfile;
  private onCommanderSelected?: (commanderId: string) => void;
  private onCloseCallback?: () => void;

  private cardsContainer!: Phaser.GameObjects.Container;
  private toastContainer?: Phaser.GameObjects.Container;

  private static readonly COMMANDER_DATA: CommanderCardViewConfig[] = [
    {
      id: 'wang_shouren',
      name: '王守仁',
      title: '阳明先生',
      factionLabel: '【神火】',
      factionColor: '#ff5252',
      factionBgColor: 0x8a1c1c,
      factionBorderColor: 0xffd700,
      stampKey: UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN,
      avatarKey: UI_TEXTURE_KEYS.AVATAR_WANG_SHOUREN,
      passiveTitle: '心法·致良知',
      passiveDesc: COMMANDERS_CONFIG.wang_shouren?.passive?.description || '全城神机火器攻击力+20%；每触发1次【猛火轰爆】，全军装填时间缩短0.1秒。',
      ultimateTitle: '绝技·知行合一',
      ultimateDesc: COMMANDERS_CONFIG.wang_shouren?.ultimate?.description || '全城所有器械立即重置装填冷却；在接下来的5.0秒内装填速度提高150%，火器必出多重连射！'
    },
    {
      id: 'qin_huali',
      name: '禽滑厘',
      title: '墨家巨子',
      factionLabel: '【墨家】',
      factionColor: '#00e5ff',
      factionBgColor: 0x182c35,
      factionBorderColor: 0x00e5ff,
      stampKey: UI_TEXTURE_KEYS.STAMP_QIN_HUALI,
      avatarKey: UI_TEXTURE_KEYS.AVATAR_QIN_HUALI,
      passiveTitle: '心法·兼爱非攻',
      passiveDesc: COMMANDERS_CONFIG.qin_huali?.passive?.description || '墨家器械射程+15%，城防工事单位生命值+30%。',
      ultimateTitle: '绝技·铁壁天幕',
      ultimateDesc: COMMANDERS_CONFIG.qin_huali?.ultimate?.description || '城墙升起6.0秒机关铁幕，吸收2000点伤害并反弹100%近战伤害。'
    },
    {
      id: 'qin_liangyu',
      name: '秦良玉',
      title: '白杆巾帼',
      factionLabel: '【城防】',
      factionColor: '#ffb74d',
      factionBgColor: 0x3d2b20,
      factionBorderColor: 0xffb74d,
      stampKey: UI_TEXTURE_KEYS.STAMP_QIN_LIANGYU,
      avatarKey: UI_TEXTURE_KEYS.AVATAR_QIN_LIANGYU,
      passiveTitle: '心法·白杆巾帼',
      passiveDesc: COMMANDERS_CONFIG.qin_liangyu?.passive?.description || '城防工事反伤效果+50%，城墙近处敌军攻击速度-20%。',
      ultimateTitle: '绝技·铁骑勤王',
      ultimateDesc: COMMANDERS_CONFIG.qin_liangyu?.ultimate?.description || '召唤8名精锐白杆骑兵向城外发起冲锋，对路径敌军造成500点伤害与击退。'
    },
    {
      id: 'liu_bowen',
      name: '刘伯温',
      title: '诚意国师',
      factionLabel: '【奇门】',
      factionColor: '#b388ff',
      factionBgColor: 0x221e3d,
      factionBorderColor: 0xb388ff,
      stampKey: UI_TEXTURE_KEYS.STAMP_LIU_BOWEN,
      avatarKey: UI_TEXTURE_KEYS.AVATAR_LIU_BOWEN,
      passiveTitle: '心法·神机妙算',
      passiveDesc: COMMANDERS_CONFIG.liu_bowen?.passive?.description || '奇门光环辐射范围+1，全元素反应伤害+30%。',
      ultimateTitle: '绝技·天雷九烈',
      ultimateDesc: COMMANDERS_CONFIG.liu_bowen?.ultimate?.description || '全屏降下9道天雷连击，每道造成300点伤害并施加感电。'
    }
  ];

  constructor(scene: Phaser.Scene, options: CommanderModalOptions) {
    super(scene, 0, 0);

    this.profileStorage = options.profileStorage;
    this.profile = options.profile;
    this.onCommanderSelected = options.onCommanderSelected;
    this.onCloseCallback = options.onClose;

    this.setDepth(150);
    this.setVisible(false);

    this.buildModal();
    scene.add.existing(this);
  }

  private buildModal(): void {
    // 1. Fullscreen Dark Scrim (blocks interaction underneath)
    const scrim = this.scene.add.graphics();
    scrim.fillStyle(0x000000, 0.85);
    scrim.fillRect(0, 0, 750, 1334);
    scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.add(scrim);

    // 2. Centered NineSlice Xuan Paper & Bronze Panel (680 x 1120)
    const panelW = 680;
    const panelH = 1120;
    const panelX = 375;
    const panelY = 667;

    const panel = this.scene.add.nineslice(
      panelX,
      panelY,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      panelW,
      panelH,
      40, 40, 40, 40
    );
    this.add(panel);

    // 3. Header Title Crest & Close Button
    const headerTitle = this.scene.add.text(panelX, panelY - panelH / 2 + 45, '帅 帐 拜 将 · 节 制 三 军', {
      fontFamily: UI_FONTS.primary,
      fontSize: '25px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold',
      stroke: '#2c1e13',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.add(headerTitle);

    const subTitle = this.scene.add.text(panelX, panelY - panelH / 2 + 75, '— 筑台拜将 · 掌神机枢纽 · 节制天下之师 —', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#b0bec5'
    }).setOrigin(0.5);
    this.add(subTitle);

    const closeBtn = this.scene.add.text(panelX + panelW / 2 - 40, panelY - panelH / 2 + 45, '✕', {
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
      this.hide();
    });
    this.add(closeBtn);

    // 4. Cards Container
    this.cardsContainer = this.scene.add.container(0, 0);
    this.add(this.cardsContainer);

    this.renderCards();
  }

  /**
   * Renders or refreshes the 4 commander cards based on current profile.selectedCommander
   */
  public renderCards(): void {
    this.cardsContainer.removeAll(true);

    const currentSelectedId = this.profile.selectedCommander || 'wang_shouren';
    const cardW = 620;
    const cardH = 215;
    const cardStartX = 375 - cardW / 2; // 65
    const cardStartY = 205;
    const cardSpacing = 227;

    CommanderModal.COMMANDER_DATA.forEach((cmd, idx) => {
      const topY = cardStartY + idx * cardSpacing;
      const isSelected = currentSelectedId === cmd.id;

      // Card Container
      const cardBox = this.scene.add.container(cardStartX, topY);

      // Card Background Plate
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(0x1a1612, 0.94);
      cardBg.fillRoundedRect(0, 0, cardW, cardH, 10);

      if (isSelected) {
        cardBg.lineStyle(2.5, UI_COLORS.goldBrightNum, 1.0);
        cardBg.strokeRoundedRect(0, 0, cardW, cardH, 10);
        // Golden highlight wash on selected card
        cardBg.fillStyle(UI_COLORS.goldBrightNum, 0.05);
        cardBg.fillRoundedRect(0, 0, cardW, cardH, 10);
      } else {
        cardBg.lineStyle(1.5, 0x4e3820, 0.8);
        cardBg.strokeRoundedRect(0, 0, cardW, cardH, 10);
      }
      cardBox.add(cardBg);

      // Left Avatar Badge
      const avatarCenterX = 56;
      const avatarCenterY = 56;

      if (this.scene.textures.exists(cmd.avatarKey)) {
        const avatarImg = this.scene.add.image(avatarCenterX, avatarCenterY, cmd.avatarKey);
        avatarImg.setDisplaySize(72, 72);
        cardBox.add(avatarImg);
      } else {
        // Fallback procedural circle
        const avatarG = this.scene.add.graphics();
        avatarG.fillStyle(cmd.factionBgColor, 1.0);
        avatarG.fillCircle(avatarCenterX, avatarCenterY, 36);
        avatarG.lineStyle(2.5, cmd.factionBorderColor, 1.0);
        avatarG.strokeCircle(avatarCenterX, avatarCenterY, 36);

        const avatarTxt = this.scene.add.text(avatarCenterX, avatarCenterY, cmd.name.slice(0, 2), {
          fontFamily: UI_FONTS.primary,
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        cardBox.add([avatarG, avatarTxt]);
      }

      // Faction Tag Pill under Avatar
      const pillW = 68;
      const pillH = 22;
      const pillX = avatarCenterX - pillW / 2;
      const pillY = 104;

      const pillG = this.scene.add.graphics();
      pillG.fillStyle(cmd.factionBgColor, 0.95);
      pillG.fillRoundedRect(pillX, pillY, pillW, pillH, 4);
      pillG.lineStyle(1.2, cmd.factionBorderColor, 1.0);
      pillG.strokeRoundedRect(pillX, pillY, pillW, pillH, 4);

      const pillTxt = this.scene.add.text(avatarCenterX, pillY + pillH / 2, cmd.factionLabel, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: cmd.factionColor,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      cardBox.add([pillG, pillTxt]);

      // Commander Name & Title
      const nameTxt = this.scene.add.text(112, 18, `${cmd.title} · ${cmd.name}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '19px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#1b120c',
        strokeThickness: 2
      });
      cardBox.add(nameTxt);

      // Passive Aura Line
      const passiveTitleTxt = this.scene.add.text(112, 48, `【${cmd.passiveTitle}】`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: cmd.factionColor,
        fontStyle: 'bold'
      });
      const passiveDescTxt = this.scene.add.text(112, 70, cmd.passiveDesc, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: '#e0d6c8',
        wordWrap: { width: 375 }
      });
      cardBox.add([passiveTitleTxt, passiveDescTxt]);

      // Ultimate Skill Line
      const ultTitleTxt = this.scene.add.text(112, 126, `【${cmd.ultimateTitle}】`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: UI_COLORS.goldBright,
        fontStyle: 'bold'
      });
      const ultDescTxt = this.scene.add.text(112, 148, cmd.ultimateDesc, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: '#b0bec5',
        wordWrap: { width: 375 }
      });
      cardBox.add([ultTitleTxt, ultDescTxt]);

      // Right Side Status or Button
      const actionCenterX = cardW - 65;
      const actionCenterY = cardH / 2;

      if (isSelected) {
        // Active Commander Stamp & Golden Label
        if (this.scene.textures.exists(cmd.stampKey)) {
          const stampImg = this.scene.add.image(actionCenterX, actionCenterY - 14, cmd.stampKey);
          stampImg.setDisplaySize(68, 68).setAlpha(0.92);
          cardBox.add(stampImg);
        }

        const activeTag = this.scene.add.text(actionCenterX, actionCenterY + 44, '【现任主帅】', {
          fontFamily: UI_FONTS.primary,
          fontSize: '13px',
          color: UI_COLORS.goldBright,
          fontStyle: 'bold'
        }).setOrigin(0.5);
        cardBox.add(activeTag);
      } else {
        // Appointment Bronze Button "命为主帅"
        const selectBtn = new BronzeButton(this.scene, {
          x: actionCenterX,
          y: actionCenterY,
          width: 104,
          height: 44,
          title: '命为主帅',
          variant: 'bronze',
          enableGlow: false,
          onClick: () => {
            this.handleSelectCommander(cmd);
          }
        });
        cardBox.add(selectBtn);
      }

      this.cardsContainer.add(cardBox);
    });
  }

  private handleSelectCommander(cmd: CommanderCardViewConfig): void {
    // 1. Update Profile & Persist
    this.profile.selectedCommander = cmd.id;
    this.profileStorage.saveProfile(this.profile);

    // 2. Play vermilion cinnabar seal sound
    SoundManager.getInstance().playVermilionStamp();

    // 3. Show Golden Toast notification
    this.showToast(`已拜【${cmd.name}】为三军统帅！`);

    // 4. Callback to caller
    this.onCommanderSelected?.(cmd.id);

    // 5. Refresh card layout to reflect new selection
    this.renderCards();
  }

  /**
   * Displays a prominent gold-rimmed Toast message
   */
  public showToast(message: string): void {
    if (this.toastContainer) {
      this.toastContainer.destroy();
    }

    this.toastContainer = this.scene.add.container(375, 620).setDepth(200);

    const text = this.scene.add.text(0, 0, message, {
      fontFamily: UI_FONTS.primary,
      fontSize: '18px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold',
      align: 'center',
      stroke: '#1a120c',
      strokeThickness: 3
    }).setOrigin(0.5);

    const textBounds = text.getBounds();
    const padX = 40;
    const padY = 22;
    const w = textBounds.width + padX;
    const h = textBounds.height + padY;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0c0907, 0.92);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, UI_COLORS.goldBrightNum, 1.0);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    this.toastContainer.add([bg, text]);
    this.add(this.toastContainer);

    this.scene.tweens.add({
      targets: this.toastContainer,
      y: 560,
      alpha: { from: 1, to: 0 },
      duration: 2200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.toastContainer?.destroy();
        this.toastContainer = undefined;
      }
    });
  }

  public show(): void {
    this.renderCards();
    this.setVisible(true);
    this.setAlpha(0);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 180,
      ease: 'Quad.easeOut'
    });
  }

  public hide(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.setVisible(false);
        this.onCloseCallback?.();
      }
    });
  }
}
