/**
 * 《孤城神机营》- Home Scene (主城大厅与长线养成界面)
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - Top Header: Currencies (Gold, Iron, Blueprints) loaded from ProfileStorage
 * - Center: Commander card (王守仁), Campaign progress badge
 * - Action Entries: "九州战役" (StageSelectScene), "神机造办处" (Armory modal), "武经总要" (Tech Tree modal)
 * - Pure Presentation driving Headless Domain Models (ArmoryManager, TechTreeManager, ProfileStorage)
 */

import Phaser from 'phaser';
import { ProfileStorage } from '../../core/meta/profile-storage';
import { ArmoryManager, ALL_WEAPON_CONFIG_IDS, MAX_ARMORY_LEVEL } from '../../core/meta/armory-manager';
import { TechTreeManager, MAX_TECH_LEVEL, TechBranch } from '../../core/meta/tech-tree-manager';
import { canClaimDailyAd, claimDailyAd } from '../../core/meta/daily-welfare';
import { PlayerProfile } from '../../core/meta/types';
import { PlatformBridge } from '../../bridge/platform';
import { SoundManager } from '../audio/sound-manager';
import { getChapterConfig, CAMPAIGN_CHAPTERS_CONFIG } from '../../config/campaign.config';
import { getCommanderConfig } from '../../config/commanders.config';
import { getWeaponConfig } from '../../config/weapons.config';
import { FACTION_COLORS } from '../renderers/unit-sprite';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from '../ui/ui-theme';
import { BronzeButton } from '../ui/bronze-button';
import { CommanderModal } from '../ui/commander-modal';
import { EndlessModal } from '../ui/endless-modal';
import { ForgeModal } from '../ui/forge-modal';
import { CompendiumModal } from '../ui/compendium-modal';

export class HomeScene extends Phaser.Scene {
  private profileStorage!: ProfileStorage;
  private profile!: PlayerProfile;
  private topOffset: number = 0;

  // Header Elements
  private goldText!: Phaser.GameObjects.Text;
  private ironText!: Phaser.GameObjects.Text;
  private blueprintsText!: Phaser.GameObjects.Text;
  private sidebarBtn?: BronzeButton;

  // Commander Card Elements
  private commanderCardContainer!: Phaser.GameObjects.Container;
  private commanderModal!: CommanderModal;
  private endlessModal!: EndlessModal;
  private forgeModal!: ForgeModal;
  private compendiumModal!: CompendiumModal;

  // Campaign Card Elements
  private campaignTitleText!: Phaser.GameObjects.Text;
  private campaignStarsText!: Phaser.GameObjects.Text;

  // Modals
  private armoryModalContainer!: Phaser.GameObjects.Container;
  private armoryCardsContainer!: Phaser.GameObjects.Container;
  private armoryFactionFilter: string = 'all';
  private dailyWorkshopBtn?: BronzeButton;

  private techModalContainer!: Phaser.GameObjects.Container;
  private techCardsContainer!: Phaser.GameObjects.Container;
  private dailyMartialBtn?: BronzeButton;

  private sidebarPromptModalContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'HomeScene' });
  }

  public create(): void {
    this.profileStorage = new ProfileStorage(PlatformBridge.getPlatform());
    this.profile = this.profileStorage.loadProfile();

    const insets = PlatformBridge.getPlatform().getSafeAreaInsets();
    this.topOffset = insets.top;

    // Start Lobby BGM on creation/resume
    SoundManager.getInstance().playLobbyBgm();
    this.events.on('wake', () => {
      SoundManager.getInstance().playLobbyBgm();
      this.updateHeaderCurrencies();
      this.updateSidebarButton();
    });
    this.events.on('resume', () => {
      SoundManager.getInstance().playLobbyBgm();
      this.updateHeaderCurrencies();
      this.updateSidebarButton();
    });

    // 1. Fortress Backdrop & Aesthetic Vignette
    this.createBackground();

    // 2. Top Currency Header
    this.createTopHeader();

    // 3. Commander Showcase Card
    this.createCommanderCard();

    // 4. Campaign Progress Summary Card
    this.createCampaignSummaryCard();

    // 5. Main Action Portals
    this.createActionPortals();

    // 6. Armory Modal (神机造办处)
    this.createArmoryModal();

    // 7. Tech Tree Modal (武经总要)
    this.createTechTreeModal();

    // 8. Sidebar Welfare Prompt Modal
    this.createSidebarPromptModal();

    // 9. Commander Selection Modal (帅帐拜将台)
    this.createCommanderModal();

    // 10. Endless Mode & Leaderboard Modal (神机演武)
    this.createEndlessModal();

    // 11. Forge Modal (神机天工坊·图纸打造)
    this.createForgeModal();

    // 12. Compendium Modal (神机万象·图鉴系统)
    this.createCompendiumModal();

    // 13. Footer Info & Save Reset Utility
    this.createFooter();

    if (typeof window !== 'undefined') {
      (window as any).__HOME_SCENE__ = this;
    }
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    // Deep Ming bronze & ink slate gradient simulation
    bg.fillGradientStyle(0x111317, 0x111317, 0x1a212b, 0x1a212b, 1);
    bg.fillRect(0, 0, 750, 1334);

    // Decorative wall lattice & border lines
    bg.lineStyle(1.5, 0x37474f, 0.4);
    bg.strokeRect(16, 16, 718, 1302);
    bg.lineStyle(1, 0x263238, 0.6);
    bg.strokeRect(24, 24, 702, 1286);

    // Title Banner
    const titleBanner = this.add.text(375, 115 + this.topOffset, '孤 城 神 机 营', {
      fontFamily: 'sans-serif',
      fontSize: '36px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#3e2723',
      strokeThickness: 4
    }).setOrigin(0.5);

    const subTitle = this.add.text(375, 155 + this.topOffset, '— 大明火器守城 · 阵营羁绊肉鸽 —', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#b0bec5'
    }).setOrigin(0.5);
  }

  private createTopHeader(): void {
    const startY = 35 + this.topOffset;

    // 3.1 Header Banner with meander border and jade gradient
    this.add.image(375, startY, UI_TEXTURE_KEYS.HEADER_BANNER).setDepth(10);

    // 🪙 金币 (大明通宝)
    this.add.image(55, startY, UI_TEXTURE_KEYS.ICON_COIN_TONGBAO)
      .setDisplaySize(28, 28)
      .setDepth(11);
    this.goldText = this.add.text(76, startY, `${this.profile.currencies.gold}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '17px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(11);

    // ⛏️ 玄铁 (天外玄铁)
    this.add.image(295, startY, UI_TEXTURE_KEYS.ICON_ORE_IRON)
      .setDisplaySize(28, 28)
      .setDepth(11);
    this.ironText = this.add.text(316, startY, `${this.profile.currencies.iron}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '17px',
      color: UI_COLORS.ironCyanGlow,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(11);

    // 📜 图纸 (神机图纸卷轴 - 资源展示)
    this.add.image(515, startY, UI_TEXTURE_KEYS.ICON_BLUEPRINT_SCROLL)
      .setDisplaySize(28, 28)
      .setDepth(11);

    this.blueprintsText = this.add.text(536, startY, `${this.profile.currencies.blueprints}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '17px',
      color: '#ea80fc',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(11);

    // 🎵 国潮战乐一键静音/开启控制
    const isMuted = SoundManager.getInstance().getIsMuted();
    const muteBtn = this.add.text(675, startY, isMuted ? '🔇 静音' : '🎵 战乐', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold',
      backgroundColor: '#263238',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

    muteBtn.on('pointerover', () => {
      muteBtn.setScale(1.08);
    });
    muteBtn.on('pointerout', () => {
      muteBtn.setScale(1.0);
    });
    muteBtn.on('pointerdown', () => {
      const newMuted = SoundManager.getInstance().toggleMute();
      muteBtn.setText(newMuted ? '🔇 静音' : '🎵 战乐');
      SoundManager.getInstance().playBronzeButtonClick();
    });

    // 🎁 侧边栏专属福利入口按钮
    this.createSidebarButton();
  }

  private updateHeaderCurrencies(): void {
    this.goldText.setText(`${this.profile.currencies.gold}`);
    this.ironText.setText(`${this.profile.currencies.iron}`);
    this.blueprintsText.setText(`${this.profile.currencies.blueprints}`);
  }

  private createCommanderCard(): void {
    const cardX = 40;
    const cardY = 195 + this.topOffset;
    const cardW = 670;
    const cardH = 210;

    // Xuan Paper & Bronze Rivet NineSlice Panel
    this.add.nineslice(
      cardX + cardW / 2,
      cardY + cardH / 2,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      cardW,
      cardH,
      40, 40, 40, 40
    );

    // Interactive clickable hit area for invoking commander appointment modal
    const hitArea = this.add.rectangle(
      cardX + cardW / 2,
      cardY + cardH / 2,
      cardW,
      cardH,
      0x000000,
      0.001
    ).setDepth(12).setInteractive({ useHandCursor: true });

    hitArea.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.commanderModal.show();
    });

    // Decorative corner cue text: "【帅帐拜将 · 点击更替】"
    this.add.text(cardX + cardW - 20, cardY + cardH - 18, '【帅帐拜将 · 点击更替】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    this.commanderCardContainer = this.add.container(0, 0);

    this.updateCommanderCard();
  }

  public updateCommanderCard(): void {
    if (!this.commanderCardContainer) return;
    this.commanderCardContainer.removeAll(true);

    const cardX = 40;
    const cardY = 195 + this.topOffset;
    const cardW = 670;

    const commanderId = this.profile.selectedCommander || 'wang_shouren';
    const config = getCommanderConfig(commanderId);

    // Visual attributes per commander
    let stampKey: string = UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN;
    let factionBg = 0xb71c1c;
    let factionBorder = 0xffd700;
    let officialTitle = '官职：心学兵宗 · 两广提督兼巡抚 【神火】';
    let passiveShort = '【心法·致良知】全城神机火器攻击力+20%，轰爆缩减装填';
    let ultShort = '【绝技·知行合一】重置全军装填，5秒装填速度提高150%';

    if (commanderId === 'qin_huali') {
      stampKey = UI_TEXTURE_KEYS.STAMP_QIN_HUALI;
      factionBg = 0x182c35;
      factionBorder = 0x00e5ff;
      officialTitle = '宗门：墨家钜子 · 机关机巧绝世 【墨家】';
      passiveShort = '【心法·兼爱非攻】墨家器械射程+15%，城防生命+30%';
      ultShort = '【绝技·铁壁天幕】升起6秒机关铁幕，吸收2000反弹近战';
    } else if (commanderId === 'qin_liangyu') {
      stampKey = UI_TEXTURE_KEYS.STAMP_QIN_LIANGYU;
      factionBg = 0x3d2b20;
      factionBorder = 0xffb74d;
      officialTitle = '官职：白杆忠贞侯 · 督理南京都督 【城防】';
      passiveShort = '【心法·白杆巾帼】城防工事反伤+50%，城墙近处敌军攻速-20%';
      ultShort = '【绝技·铁骑勤王】召唤8名精锐白杆骑兵冲锋，击退3.0m';
    } else if (commanderId === 'liu_bowen') {
      stampKey = UI_TEXTURE_KEYS.STAMP_LIU_BOWEN;
      factionBg = 0x221e3d;
      factionBorder = 0xb388ff;
      officialTitle = '官职：诚意伯国师 · 神机妙算无双 【奇门】';
      passiveShort = '【心法·神机妙算】奇门光环辐射+1，全元素反应伤害+30%';
      ultShort = '【绝技·天雷九烈】全屏降下9道天雷连击，造成伤害并施加感电';
    }

    // 1. Xuande Vermilion Commander Seal in top right
    const stamp = this.add.image(cardX + cardW - 65, cardY + 65, stampKey)
      .setDisplaySize(72, 72)
      .setAlpha(0.88);
    this.commanderCardContainer.add(stamp);

    // 2. Left Avatar Badge
    const avatar = this.add.graphics();
    avatar.fillStyle(factionBg, 1.0);
    avatar.fillCircle(cardX + 75, cardY + 105, 50);
    avatar.lineStyle(3, factionBorder, 1.0);
    avatar.strokeCircle(cardX + 75, cardY + 105, 50);
    this.commanderCardContainer.add(avatar);

    const nameText = this.add.text(cardX + 75, cardY + 95, config.name, {
      fontFamily: UI_FONTS.primary,
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const titleText = this.add.text(cardX + 75, cardY + 125, config.title, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#ffe082'
    }).setOrigin(0.5);
    this.commanderCardContainer.add([nameText, titleText]);

    // 3. Right Details
    const mainTitleText = this.add.text(cardX + 155, cardY + 28, `主帅 · ${config.title} ${config.name}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '21px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const officialText = this.add.text(cardX + 155, cardY + 60, officialTitle, {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#ffb74d'
    });

    const passiveDescText = this.add.text(cardX + 155, cardY + 98, passiveShort, {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#ff8a80'
    });

    const ultDescText = this.add.text(cardX + 155, cardY + 138, ultShort, {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#ffd54f'
    });

    this.commanderCardContainer.add([mainTitleText, officialText, passiveDescText, ultDescText]);
  }

  private createCampaignSummaryCard(): void {
    const cardX = 40;
    const cardY = 425 + this.topOffset;
    const cardW = 670;
    const cardH = 150;

    // Xuan Paper & Bronze Rivet NineSlice Panel
    this.add.nineslice(
      cardX + cardW / 2,
      cardY + cardH / 2,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      cardW,
      cardH,
      40, 40, 40, 40
    );

    const chapterConfig = getChapterConfig(this.profile.campaign.unlockedChapter || 1);

    this.campaignTitleText = this.add.text(cardX + 30, cardY + 24, `九州战局 · ${chapterConfig.name}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '21px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    const currentStage = this.profile.campaign.unlockedStage || 1;
    this.add.text(cardX + 30, cardY + 62, `当前前线据点：第 ${currentStage} 关 (共 20 关)`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#eceff1'
    });

    // Total Stars Count
    let totalStars = 0;
    for (const s of Object.values(this.profile.campaign.stageStars)) {
      totalStars += s;
    }

    this.campaignStarsText = this.add.text(cardX + 30, cardY + 98, `⭐ 累计功勋星级: ${totalStars} / 60`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#ffca28',
      fontStyle: 'bold'
    });
  }

  private createActionPortals(): void {
    const btnW = 590;
    const btnH = 80;
    const btnX = 375;

    // 1. 九州战役 (Campaign Launch) - 3D Bronze Red Relief with breathing golden glow
    new BronzeButton(this, {
      x: btnX,
      y: 616 + this.topOffset,
      width: btnW,
      height: btnH,
      variant: 'red',
      enableGlow: true,
      title: '⚔️  出 征 · 九 州 战 役',
      subtitle: '率神机营迎战五大章节二十重关卡怪潮',
      onClick: () => {
        SoundManager.getInstance().resume();
        this.scene.start('StageSelectScene');
      }
    });

    // 2. 大明军备府 (造办强化 & 天工打造)
    new BronzeButton(this, {
      x: btnX,
      y: 718 + this.topOffset,
      width: btnW,
      height: btnH,
      variant: 'bronze',
      title: '⚒️  大 明 军 备 府',
      subtitle: '造办处·军械强化升级 | 天工坊·图纸部件锻造装配',
      onClick: () => {
        SoundManager.getInstance().resume();
        this.openArmoryModal();
      }
    });

    // 3. 武经总要 (Tech Tree)
    new BronzeButton(this, {
      x: btnX,
      y: 820 + this.topOffset,
      width: btnW,
      height: btnH,
      variant: 'bronze',
      title: '📜  武 经 总 要 · 兵 略',
      subtitle: '攻伐 · 坚守 · 巧变 三系军策研习',
      onClick: () => {
        SoundManager.getInstance().resume();
        this.openTechModal();
      }
    });

    // 4. 神机演武 · 战功榜 (Endless Mode & Leaderboard)
    new BronzeButton(this, {
      x: btnX,
      y: 922 + this.topOffset,
      width: btnW,
      height: btnH,
      variant: 'bronze',
      title: '🏛️  神 机 演 武 · 战 功 榜',
      subtitle: '无尽怪潮坚守 · 军阶晋升 · 同省风云排位',
      onClick: () => {
        SoundManager.getInstance().resume();
        this.openEndlessModal();
      }
    });

    // 5. 神机万象 · 图鉴 (Compendium Modal)
    new BronzeButton(this, {
      x: btnX,
      y: 1024 + this.topOffset,
      width: btnW,
      height: btnH,
      variant: 'bronze',
      title: '📖  神 机 万 象 · 图 鉴',
      subtitle: '大明十六型火器器械 · 塞外十三路来犯敌寇',
      onClick: () => {
        SoundManager.getInstance().resume();
        this.openCompendiumModal();
      }
    });
  }

  // =========================================================================
  // 侧边栏专属福利 (Sidebar Welfare Entrance & Prompt Modal)
  // =========================================================================

  private createSidebarButton(): void {
    this.sidebarBtn = new BronzeButton(this, {
      x: 635,
      y: 95 + this.topOffset,
      width: 170,
      height: 46,
      variant: 'red',
      enableGlow: true,
      title: '🎁 侧边栏福利',
      subtitle: '每日领500金',
      onClick: async () => {
        SoundManager.getInstance().resume();
        SoundManager.getInstance().playBronzeButtonClick();
        await this.handleSidebarClick();
      }
    }).setDepth(15);

    this.updateSidebarButton();
  }

  private updateSidebarButton(): void {
    if (!this.sidebarBtn) return;
    const canClaim = canClaimDailyAd(this.profile, 'sidebar');
    if (canClaim) {
      this.sidebarBtn.setTitle('🎁 侧边栏福利');
      this.sidebarBtn.setSubtitle('每日领500金+20铁');
      this.sidebarBtn.setEnabled(true);
      this.sidebarBtn.startBreathingGlow();
    } else {
      this.sidebarBtn.setTitle('✅ 侧边栏福利');
      this.sidebarBtn.setSubtitle('今日已领取');
      this.sidebarBtn.setEnabled(false);
      this.sidebarBtn.stopBreathingGlow();
    }
  }

  private async handleSidebarClick(): Promise<void> {
    const platform = PlatformBridge.getPlatform();
    const isInSidebar = await platform.checkScene('sidebar');
    const canClaim = canClaimDailyAd(this.profile, 'sidebar');

    if (isInSidebar) {
      if (canClaim) {
        const res = claimDailyAd(this.profile, 'sidebar');
        if (res.success) {
          this.profileStorage.saveProfile(this.profile);
          this.updateHeaderCurrencies();
          this.updateSidebarButton();
          SoundManager.getInstance().playVictoryFanfare();
          this.showToast('侧边栏专属福利领取成功！\n+500通宝  +20玄铁');
        }
      } else {
        this.showToast('今日侧边栏福利已领取，明日再来！');
      }
    } else {
      this.openSidebarPromptModal();
    }
  }

  private createSidebarPromptModal(): void {
    this.sidebarPromptModalContainer = this.add.container(0, 0).setDepth(150).setVisible(false);

    // Dim Background
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.85);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.sidebarPromptModalContainer.add(dim);

    // Xuan Paper & Bronze Rivet NineSlice Panel
    const panel = this.add.nineslice(
      375,
      667,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      630,
      520,
      40, 40, 40, 40
    );
    this.sidebarPromptModalContainer.add(panel);

    // Modal Title
    const title = this.add.text(375, 460, '侧 边 栏 专 享 辎 重', {
      fontFamily: UI_FONTS.primary,
      fontSize: '26px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Vermilion Commander Seal
    const seal = this.add.image(620, 460, UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN)
      .setDisplaySize(60, 60)
      .setAlpha(0.85);

    // Description
    const desc = this.add.text(375, 590,
      '从抖音小游戏【首页侧边栏】直接启动《孤城神机营》，\n' +
      '即可每日无门槛免费领取朝廷加急专享辎重：\n\n' +
      '  • 🪙 大明通宝 +500\n' +
      '  • ⛏️ 天外玄铁 +20\n\n' +
      '无需看广告，天天有俸禄！', {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#cfd8dc',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);

    // Go to sidebar button
    const goBtn = new BronzeButton(this, {
      x: 375,
      y: 740,
      width: 320,
      height: 56,
      variant: 'red',
      enableGlow: true,
      title: '🚀 前往侧边栏领取',
      subtitle: '一键跳转抖音侧边栏',
      onClick: async () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.sidebarPromptModalContainer.setVisible(false);
        const platform = PlatformBridge.getPlatform();
        const success = await platform.navigateToScene('sidebar');
        if (success) {
          this.showToast('正在前往侧边栏，从侧边栏启动游戏即可领取！');
        } else {
          this.showToast('已为您发起请求，若未跳转请从抖音首页侧边栏进入');
        }
      }
    });

    // Close button
    const closeBtn = this.add.text(645, 435, '✕', {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.sidebarPromptModalContainer.setVisible(false);
    });

    this.sidebarPromptModalContainer.add([title, seal, desc, goBtn, closeBtn]);
  }

  private openSidebarPromptModal(): void {
    this.sidebarPromptModalContainer.setVisible(true);
  }

  public showToast(message: string): void {
    const toastContainer = this.add.container(375, 600).setDepth(200);
    const text = this.add.text(0, 0, message, {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);

    const textBounds = text.getBounds();
    const padX = 36;
    const padY = 20;
    const w = textBounds.width + padX;
    const h = textBounds.height + padY;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.88);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.9);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    toastContainer.add([bg, text]);

    this.tweens.add({
      targets: toastContainer,
      y: 550,
      alpha: { from: 1, to: 0 },
      duration: 2500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        toastContainer.destroy();
      }
    });
  }

  private createPortalButton(
    x: number,
    y: number,
    w: number,
    h: number,
    bgColor: number,
    borderColor: number,
    title: string,
    subtitle: string,
    onClick: () => void
  ): void {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1.0);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(2.5, borderColor, 0.9);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    const titleText = this.add.text(0, -14, title, {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subText = this.add.text(0, 18, subtitle, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#cfd8dc'
    }).setOrigin(0.5);

    container.add([bg, titleText, subText]);
    container.setSize(w, h).setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(borderColor, 1.0);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      bg.lineStyle(2.5, 0xffd700, 1.0);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1.0);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      bg.lineStyle(2.5, borderColor, 0.9);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    });

    container.on('pointerdown', onClick);
  }

  private createCommanderModal(): void {
    this.commanderModal = new CommanderModal(this, {
      profileStorage: this.profileStorage,
      profile: this.profile,
      onCommanderSelected: (_commanderId) => {
        this.updateCommanderCard();
      }
    });
  }

  private createEndlessModal(): void {
    this.endlessModal = new EndlessModal(this, {
      profileStorage: this.profileStorage,
      profile: this.profile,
      onEmbark: () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.endlessModal.hide();
        this.scene.stop('HomeScene');
        this.scene.start('BattleScene', { mode: 'endless' });
        this.scene.launch('UIScene');
      }
    });
  }

  private openEndlessModal(): void {
    SoundManager.getInstance().playBronzeButtonClick();
    this.endlessModal.show();
  }

  private createForgeModal(): void {
    this.forgeModal = new ForgeModal(this, {
      profileStorage: this.profileStorage,
      profile: this.profile,
      onUpdated: () => {
        this.updateHeaderCurrencies();
      },
      onSwitchToArmory: () => {
        this.openArmoryModal();
      }
    });
  }

  private openForgeModal(): void {
    SoundManager.getInstance().playBronzeButtonClick();
    this.forgeModal.show();
  }

  private createCompendiumModal(): void {
    this.compendiumModal = new CompendiumModal(this);
  }

  public openCompendiumModal(): void {
    SoundManager.getInstance().playBronzeButtonClick();
    this.compendiumModal.show();
  }

  private createFooter(): void {
    const footerY = 1260;

    const versionText = this.add.text(375, footerY, '《孤城神机营》 V3.0 · 抖音小游戏商业闭环', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#546e7a'
    }).setOrigin(0.5);

    // Reset profile button for QA testing
    const resetBtn = this.add.text(375, footerY + 28, '【清除重置本地存档 (测试专用)】', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#78909c'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerdown', () => {
      this.profileStorage.resetProfile();
      this.profile = this.profileStorage.loadProfile();
      this.updateHeaderCurrencies();
      this.scene.restart();
    });
  }

  // =========================================================================
  // Armory Modal (神机造办处)
  // =========================================================================

  private createArmoryModal(): void {
    this.armoryModalContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

    // Dim Background
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.85);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.armoryModalContainer.add(dim);

    // Dialog Panel (Xuan Paper & Bronze NineSlice)
    const panel = this.add.nineslice(
      35 + 340,
      70 + 600,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      680,
      1200,
      40, 40, 40, 40
    );
    this.armoryModalContainer.add(panel);

    // Top-Level Hall Tabs: 【造办处·强化】 & 【天工坊·锻造】
    const hallTabW = 240;
    const hallTabH = 38;
    const hallTabY = 105;

    // 1. 造办处 Tab (Active in ArmoryModal)
    const armoryHallTab = this.add.container(375 - 130, hallTabY);
    const aBg = this.add.graphics();
    aBg.fillStyle(0x3e2723, 1.0);
    aBg.fillRoundedRect(-hallTabW / 2, -hallTabH / 2, hallTabW, hallTabH, 6);
    aBg.lineStyle(1.8, 0xffd700, 1.0);
    aBg.strokeRoundedRect(-hallTabW / 2, -hallTabH / 2, hallTabW, hallTabH, 6);
    const aText = this.add.text(0, 0, '⚒️ 【 造 办 处 · 强 化 】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    armoryHallTab.add([aBg, aText]);

    // 2. 天工坊 Tab (Inactive in ArmoryModal -> click to switch to Forge)
    const forgeHallTab = this.add.container(375 + 130, hallTabY);
    const fBg = this.add.graphics();
    fBg.fillStyle(0x1e272c, 0.9);
    fBg.fillRoundedRect(-hallTabW / 2, -hallTabH / 2, hallTabW, hallTabH, 6);
    fBg.lineStyle(1.2, 0x455a64, 0.9);
    fBg.strokeRoundedRect(-hallTabW / 2, -hallTabH / 2, hallTabW, hallTabH, 6);
    const fText = this.add.text(0, 0, '🔨 【 天 工 坊 · 锻 造 】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#90a4ae'
    }).setOrigin(0.5);
    forgeHallTab.add([fBg, fText]);
    forgeHallTab.setSize(hallTabW, hallTabH).setInteractive({ useHandCursor: true });

    forgeHallTab.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.armoryModalContainer.setVisible(false);
      this.openForgeModal();
    });

    // Close Button "✕"
    const closeBtn = this.add.text(675, 105, '✕', {
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
      SoundManager.getInstance().playBronzeButtonClick();
      this.armoryModalContainer.setVisible(false);
      this.updateHeaderCurrencies();
    });

    // 每日军械巡检 Button (Watch Ad -> 1000 Gold + 5 Blueprints)
    this.dailyWorkshopBtn = new BronzeButton(this, {
      x: 375,
      y: 150,
      width: 480,
      height: 42,
      variant: 'bronze',
      enableGlow: true,
      title: '🎬 每日军械巡检 (看广告领 1000金 + 5图纸)',
      onClick: async () => {
        SoundManager.getInstance().resume();
        SoundManager.getInstance().playBronzeButtonClick();
        if (!canClaimDailyAd(this.profile, 'workshop')) {
          this.showToast('今日已完成军械巡检，明日再来！');
          return;
        }
        const res = await PlatformBridge.getPlatform().showRewardedVideoAd('ad_daily_workshop');
        if (res.isEnded) {
          claimDailyAd(this.profile, 'workshop');
          this.profileStorage.saveProfile(this.profile);
          this.updateHeaderCurrencies();
          this.updateDailyWorkshopBtn();
          this.renderArmoryWeaponCards();
          SoundManager.getInstance().playVictoryFanfare();
          this.showToast('军械巡检完成！获得 1000通宝 + 5神机图纸');
        } else {
          this.showToast('需完整观看战报方可领取巡检物资');
        }
      }
    });
    this.armoryModalContainer.add(this.dailyWorkshopBtn);

    const sub = this.add.text(375, 184, '每级提升基础攻击力 +4% · 达 5/10 级解锁 ★3/★4 高星合成', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#b0bec5'
    }).setOrigin(0.5);

    this.armoryModalContainer.add([armoryHallTab, forgeHallTab, sub, closeBtn]);

    // Faction Filter Tabs (全部, 神火, 墨家, 守御, 奇门)
    this.createFactionFilterTabs();

    // Cards Container
    this.armoryCardsContainer = this.add.container(0, 0);
    this.armoryModalContainer.add(this.armoryCardsContainer);
  }

  private updateDailyWorkshopBtn(): void {
    if (!this.dailyWorkshopBtn) return;
    const canClaim = canClaimDailyAd(this.profile, 'workshop');
    if (canClaim) {
      this.dailyWorkshopBtn.setTitle('🎬 每日军械巡检 (看广告领 1000金 + 5图纸)');
      this.dailyWorkshopBtn.setEnabled(true);
      this.dailyWorkshopBtn.startBreathingGlow();
    } else {
      this.dailyWorkshopBtn.setTitle('✅ 今日军械巡检已完成 (明日再来)');
      this.dailyWorkshopBtn.setEnabled(false);
      this.dailyWorkshopBtn.stopBreathingGlow();
    }
  }

  private createFactionFilterTabs(): void {
    const tabs = [
      { id: 'all', label: '全部' },
      { id: 'fire', label: '神火' },
      { id: 'mohist', label: '墨家' },
      { id: 'fortress', label: '守御' },
      { id: 'qimen', label: '奇门' }
    ];

    const tabW = 120;
    const tabH = 38;
    const startX = 65;
    const tabY = 214;

    tabs.forEach((tab, idx) => {
      const tx = startX + idx * (tabW + 8);
      const btn = this.add.container(tx + tabW / 2, tabY);

      const bg = this.add.graphics();
      bg.fillStyle(0x263238, 1.0);
      bg.fillRoundedRect(-tabW / 2, -tabH / 2, tabW, tabH, 6);
      bg.lineStyle(1.5, 0x546e7a, 0.8);
      bg.strokeRoundedRect(-tabW / 2, -tabH / 2, tabW, tabH, 6);

      const text = this.add.text(0, 0, tab.label, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffffff'
      }).setOrigin(0.5);

      btn.add([bg, text]);
      btn.setSize(tabW, tabH).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.armoryFactionFilter = tab.id;
        this.renderArmoryWeaponCards();
      });

      this.armoryModalContainer.add(btn);
    });
  }

  private openArmoryModal(): void {
    this.profile = this.profileStorage.loadProfile();
    this.armoryModalContainer.setVisible(true);
    this.updateDailyWorkshopBtn();
    this.renderArmoryWeaponCards();
  }

  private renderArmoryWeaponCards(): void {
    this.armoryCardsContainer.removeAll(true);

    const weaponIds = ALL_WEAPON_CONFIG_IDS.filter(id => {
      if (this.armoryFactionFilter === 'all') return true;
      const cfg = getWeaponConfig(id);
      return cfg && cfg.faction === this.armoryFactionFilter;
    });

    const cardW = 630;
    const cardH = 90;
    const startX = 60;
    const startY = 250;
    const spacingY = 96;

    // Display first 9 cards (or scrollable in future iteration)
    const displayList = weaponIds.slice(0, 10);

    displayList.forEach((wId, idx) => {
      const cfg = getWeaponConfig(wId);
      if (!cfg) return;

      const level = ArmoryManager.getWeaponLevel(this.profile, wId);
      const atkMult = ArmoryManager.getAtkMultiplier(level);
      const maxStar = ArmoryManager.getMaxStarAllowed(level);
      const cost = ArmoryManager.getUpgradeCost(level);
      const isMax = level >= MAX_ARMORY_LEVEL;

      const cy = startY + idx * spacingY;
      const card = this.add.container(startX, cy);

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1f2732, 1.0);
      cardBg.fillRoundedRect(0, 0, cardW, cardH, 8);
      const factionColor = FACTION_COLORS[cfg.faction]?.border || 0xffd700;
      cardBg.lineStyle(1.5, factionColor, 0.7);
      cardBg.strokeRoundedRect(0, 0, cardW, cardH, 8);
      card.add(cardBg);

      // Weapon Icon / Symbol Box
      const iconBox = this.add.graphics();
      iconBox.fillStyle(FACTION_COLORS[cfg.faction]?.bg || 0x37474f, 1.0);
      iconBox.fillRoundedRect(10, 10, 72, 72, 8);
      card.add(iconBox);

      const nameText = this.add.text(95, 20, cfg.name, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      });

      const levelText = this.add.text(95, 52, `Lv. ${level} / ${MAX_ARMORY_LEVEL}`, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffca28',
        fontStyle: 'bold'
      });

      const atkBonusText = this.add.text(230, 22, `攻击加成: +${((atkMult - 1) * 100).toFixed(0)}%`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#81c784'
      });

      const starCapText = this.add.text(230, 52, `解锁合成: ★${maxStar}${maxStar < 4 ? ` (Lv.${maxStar === 2 ? 5 : 10}解★${maxStar + 1})` : ''}`, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#90caf9'
      });

      card.add([nameText, levelText, atkBonusText, starCapText]);

      // Upgrade Action Button
      const btnW = 140;
      const btnH = 60;
      const btnX = cardW - 80;
      const btnY = cardH / 2;
      const upBtn = this.add.container(btnX, btnY);

      const canAfford = cost && this.profile.currencies.gold >= cost.gold && this.profile.currencies.blueprints >= cost.blueprints;
      const btnBg = this.add.graphics();

      if (isMax) {
        btnBg.fillStyle(0x455a64, 1.0);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
        const maxText = this.add.text(0, 0, '已登峰造极', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#b0bec5'
        }).setOrigin(0.5);
        upBtn.add([btnBg, maxText]);
      } else {
        const bgCol = canAfford ? 0x2e7d32 : 0x37474f;
        btnBg.fillStyle(bgCol, 1.0);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
        btnBg.lineStyle(1.5, canAfford ? 0x81c784 : 0x546e7a, 1.0);
        btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);

        const btnTitle = this.add.text(0, -12, '研造强化', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        const costLabel = this.add.text(0, 12, `金:${cost?.gold} 图:${cost?.blueprints}`, {
          fontFamily: UI_FONTS.primary,
          fontSize: '12px',
          color: canAfford ? '#ffd54f' : '#ef9a9a'
        }).setOrigin(0.5);

        upBtn.add([btnBg, btnTitle, costLabel]);

        if (canAfford) {
          upBtn.setSize(btnW, btnH).setInteractive({ useHandCursor: true });
          upBtn.on('pointerdown', () => {
            const res = ArmoryManager.upgradeWeapon(this.profile, wId);
            if (res.success) {
              this.profileStorage.saveProfile(this.profile);
              SoundManager.getInstance().playCannonBlast();
              this.renderArmoryWeaponCards();
              this.updateHeaderCurrencies();
            }
          });
        }
      }

      card.add(upBtn);
      this.armoryCardsContainer.add(card);
    });
  }

  // =========================================================================
  // Tech Tree Modal (武经总要)
  // =========================================================================

  private createTechTreeModal(): void {
    this.techModalContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

    // Dim Scrim
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.85);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.techModalContainer.add(dim);

    // Panel (Xuan Paper & Bronze NineSlice)
    const panel = this.add.nineslice(
      35 + 340,
      120 + 550,
      UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
      undefined,
      680,
      1100,
      40, 40, 40, 40
    );
    this.techModalContainer.add(panel);

    // Title
    const title = this.add.text(375, 155, '武 经 总 要 · 兵 略 科 技 树', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#80cbc4',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Close Button "✕"
    const closeBtn = this.add.text(675, 150, '✕', {
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
      SoundManager.getInstance().playBronzeButtonClick();
      this.techModalContainer.setVisible(false);
      this.updateHeaderCurrencies();
    });

    // 每日玄铁精粹 Button (Watch Ad -> 100 Iron)
    this.dailyMartialBtn = new BronzeButton(this, {
      x: 375,
      y: 202,
      width: 480,
      height: 42,
      variant: 'bronze',
      enableGlow: true,
      title: '🎬 每日玄铁精粹 (看广告领 100 玄铁)',
      onClick: async () => {
        SoundManager.getInstance().resume();
        SoundManager.getInstance().playBronzeButtonClick();
        if (!canClaimDailyAd(this.profile, 'martial')) {
          this.showToast('今日玄铁精粹已领取完毕，明日再来！');
          return;
        }
        const res = await PlatformBridge.getPlatform().showRewardedVideoAd('ad_daily_martial');
        if (res.isEnded) {
          claimDailyAd(this.profile, 'martial');
          this.profileStorage.saveProfile(this.profile);
          this.updateHeaderCurrencies();
          this.updateDailyMartialBtn();
          this.renderTechTreeCards();
          SoundManager.getInstance().playVictoryFanfare();
          this.showToast('研习精进！获得 100 天外玄铁');
        } else {
          this.showToast('需完整观看战报方可汲取玄铁精粹');
        }
      }
    });
    this.techModalContainer.add(this.dailyMartialBtn);

    const sub = this.add.text(375, 236, '研习三系兵策 · 全局永久提升战力属性 (消耗玄铁)', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#b2dfdb'
    }).setOrigin(0.5);

    this.techModalContainer.add([title, sub, closeBtn]);

    this.techCardsContainer = this.add.container(0, 0);
    this.techModalContainer.add(this.techCardsContainer);
  }

  private updateDailyMartialBtn(): void {
    if (!this.dailyMartialBtn) return;
    const canClaim = canClaimDailyAd(this.profile, 'martial');
    if (canClaim) {
      this.dailyMartialBtn.setTitle('🎬 每日玄铁精粹 (看广告领 100 玄铁)');
      this.dailyMartialBtn.setEnabled(true);
      this.dailyMartialBtn.startBreathingGlow();
    } else {
      this.dailyMartialBtn.setTitle('✅ 今日玄铁精粹已汲取 (明日再来)');
      this.dailyMartialBtn.setEnabled(false);
      this.dailyMartialBtn.stopBreathingGlow();
    }
  }

  private openTechModal(): void {
    this.profile = this.profileStorage.loadProfile();
    this.techModalContainer.setVisible(true);
    this.updateDailyMartialBtn();
    this.renderTechTreeCards();
  }

  private renderTechTreeCards(): void {
    this.techCardsContainer.removeAll(true);

    const branches: Array<{
      branch: TechBranch;
      name: string;
      color: number;
      tag: string;
      desc: string;
      getStats: (lvl: number) => string[];
    }> = [
      {
        branch: 'martial',
        name: '攻伐之策 (Martial)',
        color: 0xe53935,
        tag: '火器增伤 · 暴击增幅',
        desc: '精研火器药理，提振全军杀伐之气',
        getStats: (lvl) => [
          `火器伤害加成: +${(lvl * 0.8).toFixed(1)}%`,
          `全军暴击率: +${(lvl * 0.5).toFixed(1)}%`,
          `暴击伤害倍率: +${(lvl * 1.0).toFixed(0)}%`
        ]
      },
      {
        branch: 'defense',
        name: '坚守之策 (Defense)',
        color: 0x1e88e5,
        tag: '城防耐久 · 铁壁反伤',
        desc: '加固关隘城垣，布设铁壁刺阵拒敌',
        getStats: (lvl) => [
          `城墙最大耐久: +${lvl * 30} HP`,
          `城墙荆棘反伤: +${(lvl * 2.0).toFixed(1)}%`,
          `全局减伤减免: +${(lvl * 0.5).toFixed(1)}%`
        ]
      },
      {
        branch: 'artifice',
        name: '巧变之策 (Artifice)',
        color: 0xfbc02d,
        tag: '初始军饷 · 俸禄利息',
        desc: '调配辎重库银，精打细算取利于敌',
        getStats: (lvl) => [
          `初始银两加成: +${lvl * 1} 银`,
          `波次俸禄加成: +${lvl * 1} 银`,
          `利息上限增益: +${Math.floor(lvl / 10)} 银`
        ]
      }
    ];

    const cardW = 630;
    const cardH = 260;
    const startX = 60;
    const startY = 265;

    branches.forEach((b, idx) => {
      const cy = startY + idx * 280;
      const card = this.add.container(startX, cy);

      const lvl = TechTreeManager.getBranchLevel(this.profile, b.branch);
      const isMax = lvl >= MAX_TECH_LEVEL;
      const cost = TechTreeManager.getUpgradeCost(lvl);
      const canAfford = cost && this.profile.currencies.iron >= cost.iron;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1b2824, 1.0);
      cardBg.fillRoundedRect(0, 0, cardW, cardH, 12);
      cardBg.lineStyle(2, b.color, 0.8);
      cardBg.strokeRoundedRect(0, 0, cardW, cardH, 12);
      card.add(cardBg);

      // Title & Level
      const titleText = this.add.text(24, 20, b.name, {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      });

      const levelBadge = this.add.text(cardW - 140, 20, `Lv. ${lvl} / ${MAX_TECH_LEVEL}`, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffd700',
        fontStyle: 'bold'
      });

      const tagText = this.add.text(24, 52, `【${b.tag}】 ${b.desc}`, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#80cbc4'
      });

      card.add([titleText, levelBadge, tagText]);

      // Stat Bullets
      const stats = b.getStats(lvl);
      stats.forEach((st, sIdx) => {
        const bullet = this.add.text(30, 95 + sIdx * 30, `• ${st}`, {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#eceff1'
        });
        card.add(bullet);
      });

      // Upgrade Action Button
      const btnW = 200;
      const btnH = 54;
      const btnX = cardW - 120;
      const btnY = cardH - 45;
      const upBtn = this.add.container(btnX, btnY);

      const btnBg = this.add.graphics();
      if (isMax) {
        btnBg.fillStyle(0x37474f, 1.0);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
        const t = this.add.text(0, 0, '兵略已臻大成', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#b0bec5'
        }).setOrigin(0.5);
        upBtn.add([btnBg, t]);
      } else {
        const btnCol = canAfford ? 0x00796b : 0x263238;
        btnBg.fillStyle(btnCol, 1.0);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
        btnBg.lineStyle(1.5, canAfford ? 0x4db6ac : 0x455a64, 1.0);
        btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);

        const btnTitle = this.add.text(0, -11, '推演研习', {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        const costLabel = this.add.text(0, 11, `玄铁: ${cost?.iron}`, {
          fontFamily: UI_FONTS.primary,
          fontSize: '13px',
          color: canAfford ? '#ffd700' : '#ef9a9a'
        }).setOrigin(0.5);

        upBtn.add([btnBg, btnTitle, costLabel]);

        if (canAfford) {
          upBtn.setSize(btnW, btnH).setInteractive({ useHandCursor: true });
          upBtn.on('pointerdown', () => {
            const res = TechTreeManager.upgradeBranch(this.profile, b.branch);
            if (res.success) {
              this.profileStorage.saveProfile(this.profile);
              SoundManager.getInstance().playCannonBlast();
              this.renderTechTreeCards();
              this.updateHeaderCurrencies();
            }
          });
        }
      }

      card.add(upBtn);
      this.techCardsContainer.add(card);
    });
  }
}
