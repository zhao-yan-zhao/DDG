/**
 * 《孤城神机营》- Compendium Modal (神机万象·图鉴弹窗系统)
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - Ming Dynasty Xuan Paper, Bronze Rivet & Vermilion Stamp Aesthetics
 * - Clean Component Lifecycle: Complete disposal and recreation on state mutations to eliminate ghosting
 * - Triple Master Tabs:
 *   1. 【大明神机谱 (16)】: 16 Firearm & Mechanical Weapon Archetypes (★1~★4 Interactive Evolutions)
 *   2. 【塞外敌寇鉴 (13)】: 8 Regular/Elite Invaders + 5 Supreme Chapter Bosses (Tactical Counter Scrolls)
 *   3. 【神机阵略篇 (13)】: 6 Spatial Adjacency Synergies + 4 Elemental Reactions + 3 Red-Gold Dual-Weapon Awakenings
 * - Complete Sound & Interactive Feedback via SoundManager
 */

import Phaser from 'phaser';
import {
  CompendiumWeaponItem,
  CompendiumEnemyItem,
  CompendiumSynergyItem,
  CompendiumReactionItem,
  CompendiumFusionItem,
  CompendiumFaction,
  EnemyCategory,
  COMPENDIUM_SYNERGIES,
  COMPENDIUM_REACTIONS,
  COMPENDIUM_FUSIONS,
  getCompendiumWeaponsByFaction,
  getCompendiumEnemiesByCategory
} from '../../config/compendium.config';
import { StarLevel } from '../../core/types';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from './ui-theme';
import { SoundManager } from '../audio/sound-manager';

export type CompendiumMasterTab = 'weapons' | 'enemies' | 'tactics';
export type TacticsSubTab = 'synergy' | 'reaction' | 'fusion';

export class CompendiumModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Active States
  private currentTab: CompendiumMasterTab = 'weapons';
  private selectedWeaponFaction: CompendiumFaction | 'all' = 'all';
  private selectedEnemyCategory: EnemyCategory | 'all' = 'all';
  private selectedTacticsSubTab: TacticsSubTab = 'synergy';

  private selectedWeaponIndex: number = 0;
  private selectedEnemyIndex: number = 0;
  private selectedTacticsIndex: number = 0;
  private selectedStarLevel: StarLevel = 1;

  // UI Component Containers (Strictly Cleared on mutations)
  private contentContainer!: Phaser.GameObjects.Container;
  private tabsContainer!: Phaser.GameObjects.Container;
  private filterContainer!: Phaser.GameObjects.Container;
  private gridContainer!: Phaser.GameObjects.Container;
  private detailContainer!: Phaser.GameObjects.Container;

  // Header Tab Texts & Indicator
  private tabWeaponsText!: Phaser.GameObjects.Text;
  private tabEnemiesText!: Phaser.GameObjects.Text;
  private tabTacticsText!: Phaser.GameObjects.Text;
  private tabIndicator!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0).setDepth(170).setVisible(false);
    this.createModal();
  }

  public show(initialTab: CompendiumMasterTab = 'weapons'): void {
    this.currentTab = initialTab;
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Cubic.easeOut'
    });

    SoundManager.getInstance().playBronzeButtonClick();
    this.renderActiveTab();
  }

  public hide(): void {
    SoundManager.getInstance().playBronzeButtonClick();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 160,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
      }
    });
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  // =========================================================================
  // Modal Base Frame Construction
  // =========================================================================

  private createModal(): void {
    // 1. Dark semi-transparent backdrop
    const dim = this.scene.add.graphics();
    dim.fillStyle(0x000000, 0.90);
    dim.fillRect(0, 0, 750, 1334);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.container.add(dim);

    // 2. Xuan Paper & Bronze Rivet NineSlice Panel
    const modalW = 690;
    const modalH = 1130;
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

    // 3. Modal Header
    const topY = centerY - modalH / 2; // ~102px
    const titleText = this.scene.add.text(centerX, topY + 40, '神 机 万 象 · 图 鉴', {
      fontFamily: UI_FONTS.primary,
      fontSize: '28px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(titleText);

    const subTitle = this.scene.add.text(centerX, topY + 68, '大明十六型火器器械 · 塞外十三路敌寇 · 三大神机阵略', {
      fontFamily: UI_FONTS.sans,
      fontSize: '12px',
      color: UI_COLORS.textDim
    }).setOrigin(0.5);
    this.container.add(subTitle);

    // 4. Close Button (Top-Right)
    const closeBtnBg = this.scene.add.graphics();
    closeBtnBg.fillStyle(UI_COLORS.bronzeBodyNum, 1);
    closeBtnBg.lineStyle(2, UI_COLORS.goldBrightNum, 0.9);
    closeBtnBg.fillCircle(centerX + 300, topY + 44, 20);
    closeBtnBg.strokeCircle(centerX + 300, topY + 44, 20);

    const closeBtnText = this.scene.add.text(centerX + 300, topY + 44, '✕', {
      fontFamily: UI_FONTS.sans,
      fontSize: '18px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const closeHit = this.scene.add.zone(centerX + 300, topY + 44, 44, 44)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => this.hide());

    this.container.add([closeBtnBg, closeBtnText, closeHit]);

    // 5. Triple Master Tabs (神机谱 vs 敌寇鉴 vs 阵略篇)
    this.createMasterTabs(centerX, topY + 106);

    // 6. Sub-containers for dynamic content
    this.filterContainer = this.scene.add.container(0, 0);
    this.gridContainer = this.scene.add.container(0, 0);
    this.detailContainer = this.scene.add.container(0, 0);
    this.contentContainer = this.scene.add.container(0, 0);

    this.contentContainer.add([
      this.filterContainer,
      this.gridContainer,
      this.detailContainer
    ]);
    this.container.add(this.contentContainer);
  }

  private createMasterTabs(centerX: number, tabY: number): void {
    this.tabsContainer = this.scene.add.container(0, 0);

    const tabW = 196;
    const tabH = 36;
    const tab1X = centerX - 200;
    const tab2X = centerX;
    const tab3X = centerX + 200;

    // Background Bar
    const bgBar = this.scene.add.graphics();
    bgBar.fillStyle(0x13181f, 0.85);
    bgBar.fillRoundedRect(centerX - 305, tabY - 18, 610, tabH, 6);
    bgBar.lineStyle(1.5, UI_COLORS.bronzeLightNum, 0.6);
    bgBar.strokeRoundedRect(centerX - 305, tabY - 18, 610, tabH, 6);
    this.tabsContainer.add(bgBar);

    // Tab Indicator
    this.tabIndicator = this.scene.add.graphics();
    this.tabsContainer.add(this.tabIndicator);

    // Tab 1: 大明神机谱 (16)
    this.tabWeaponsText = this.scene.add.text(tab1X, tabY, '⚔️ 神机谱 (16)', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tabWeaponsText.on('pointerdown', () => {
      if (this.currentTab !== 'weapons') {
        this.currentTab = 'weapons';
        this.selectedWeaponIndex = 0;
        this.selectedStarLevel = 1;
        SoundManager.getInstance().playBronzeButtonClick();
        this.renderActiveTab();
      }
    });

    // Tab 2: 塞外敌寇鉴 (13)
    this.tabEnemiesText = this.scene.add.text(tab2X, tabY, '🐺 敌寇鉴 (13)', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: UI_COLORS.textDim,
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tabEnemiesText.on('pointerdown', () => {
      if (this.currentTab !== 'enemies') {
        this.currentTab = 'enemies';
        this.selectedEnemyIndex = 0;
        SoundManager.getInstance().playBronzeButtonClick();
        this.renderActiveTab();
      }
    });

    // Tab 3: 神机阵略篇 (13)
    this.tabTacticsText = this.scene.add.text(tab3X, tabY, '📜 阵略篇 (13)', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: UI_COLORS.textDim,
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tabTacticsText.on('pointerdown', () => {
      if (this.currentTab !== 'tactics') {
        this.currentTab = 'tactics';
        this.selectedTacticsIndex = 0;
        SoundManager.getInstance().playBronzeButtonClick();
        this.renderActiveTab();
      }
    });

    this.tabsContainer.add([this.tabWeaponsText, this.tabEnemiesText, this.tabTacticsText]);
    this.container.add(this.tabsContainer);
  }

  private updateTabIndicators(): void {
    const centerX = 375;
    const tabY = 208; // topY + 106
    const tab1X = centerX - 200;
    const tab2X = centerX;
    const tab3X = centerX + 200;
    const tabW = 196;

    this.tabIndicator.clear();
    let targetX = tab1X;

    if (this.currentTab === 'weapons') {
      targetX = tab1X;
      this.tabWeaponsText.setColor(UI_COLORS.goldBright);
      this.tabEnemiesText.setColor(UI_COLORS.textDim);
      this.tabTacticsText.setColor(UI_COLORS.textDim);
    } else if (this.currentTab === 'enemies') {
      targetX = tab2X;
      this.tabWeaponsText.setColor(UI_COLORS.textDim);
      this.tabEnemiesText.setColor(UI_COLORS.goldBright);
      this.tabTacticsText.setColor(UI_COLORS.textDim);
    } else {
      targetX = tab3X;
      this.tabWeaponsText.setColor(UI_COLORS.textDim);
      this.tabEnemiesText.setColor(UI_COLORS.textDim);
      this.tabTacticsText.setColor(UI_COLORS.goldBright);
    }

    this.tabIndicator.fillStyle(UI_COLORS.vermilionBrightNum, 0.9);
    this.tabIndicator.fillRoundedRect(targetX - tabW / 2 + 4, tabY - 16, tabW - 8, 32, 5);
    this.tabIndicator.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.9);
    this.tabIndicator.strokeRoundedRect(targetX - tabW / 2 + 4, tabY - 16, tabW - 8, 32, 5);
  }

  // =========================================================================
  // Master Render Engine (Zero Ghosting Guaranteed)
  // =========================================================================

  private renderActiveTab(): void {
    this.updateTabIndicators();

    if (this.currentTab === 'weapons') {
      this.renderWeaponTab();
    } else if (this.currentTab === 'enemies') {
      this.renderEnemyTab();
    } else {
      this.renderTacticsTab();
    }
  }

  // =========================================================================
  // 1. 大明神机谱 Tab
  // =========================================================================

  private renderWeaponTab(): void {
    this.filterContainer.removeAll(true);
    this.gridContainer.removeAll(true);
    this.detailContainer.removeAll(true);

    this.renderWeaponFilterChips();
    this.renderWeaponGrid();
    this.renderWeaponDetail();
  }

  private renderWeaponFilterChips(): void {
    const startY = 248;
    const filters: { label: string; value: CompendiumFaction | 'all' }[] = [
      { label: '全部 (16)', value: 'all' },
      { label: '🔥 火器 (4)', value: 'fire' },
      { label: '⚙️ 机关 (4)', value: 'mohist' },
      { label: '🛡️ 要塞 (4)', value: 'fortress' },
      { label: '☯️ 奇门 (4)', value: 'qimen' }
    ];

    const totalW = 630;
    const btnW = totalW / filters.length - 6;
    const startX = 375 - totalW / 2 + btnW / 2;

    filters.forEach((filter, index) => {
      const x = startX + index * (btnW + 6);
      const isSelected = this.selectedWeaponFaction === filter.value;

      const chipBg = this.scene.add.graphics();
      chipBg.fillStyle(isSelected ? UI_COLORS.bronzeLightNum : 0x1b2028, 0.9);
      chipBg.fillRoundedRect(x - btnW / 2, startY - 13, btnW, 26, 4);
      chipBg.lineStyle(1, isSelected ? UI_COLORS.goldBrightNum : 0x3e4756, 0.8);
      chipBg.strokeRoundedRect(x - btnW / 2, startY - 13, btnW, 26, 4);

      const chipText = this.scene.add.text(x, startY, filter.label, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: isSelected ? UI_COLORS.goldBright : UI_COLORS.textMuted
      }).setOrigin(0.5);

      const hit = this.scene.add.zone(x, startY, btnW, 26)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        if (this.selectedWeaponFaction !== filter.value) {
          this.selectedWeaponFaction = filter.value;
          this.selectedWeaponIndex = 0;
          this.selectedStarLevel = 1;
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderWeaponTab();
        }
      });

      this.filterContainer.add([chipBg, chipText, hit]);
    });
  }

  private renderWeaponGrid(): void {
    const list = getCompendiumWeaponsByFaction(this.selectedWeaponFaction);
    if (this.selectedWeaponIndex >= list.length) {
      this.selectedWeaponIndex = 0;
    }

    const isFullList = list.length > 8;
    const startY = isFullList ? 296 : 314;
    const cols = Math.min(list.length, 8);
    const spacingX = 72;
    const gridW = (cols - 1) * spacingX;
    const startX = 375 - gridW / 2;

    list.forEach((weapon, index) => {
      const col = index % 8;
      const row = Math.floor(index / 8);
      const x = startX + col * spacingX;
      const y = startY + row * 58;
      const isSelected = index === this.selectedWeaponIndex;

      const box = this.scene.add.graphics();
      box.fillStyle(0x1a1510, 0.95);
      box.fillRoundedRect(x - 26, y - 24, 52, 48, 5);
      box.lineStyle(isSelected ? 2 : 1, isSelected ? UI_COLORS.goldBrightNum : 0x4a3b2c, isSelected ? 1 : 0.6);
      box.strokeRoundedRect(x - 26, y - 24, 52, 48, 5);

      const icon = this.scene.add.image(x, y - 5, weapon.textureKey)
        .setDisplaySize(36, 36);

      const name = this.scene.add.text(x, y + 16, weapon.name.substring(0, 4), {
        fontFamily: UI_FONTS.primary,
        fontSize: '9px',
        color: isSelected ? UI_COLORS.goldBright : UI_COLORS.textDim
      }).setOrigin(0.5);

      const hit = this.scene.add.zone(x, y, 52, 48)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        if (this.selectedWeaponIndex !== index) {
          this.selectedWeaponIndex = index;
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderWeaponTab();
        }
      });

      this.gridContainer.add([box, icon, name, hit]);
    });
  }

  private renderWeaponDetail(): void {
    const list = getCompendiumWeaponsByFaction(this.selectedWeaponFaction);
    const weapon = list[this.selectedWeaponIndex];
    if (!weapon) return;

    const topY = 388;
    const centerX = 375;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x161310, 0.94);
    cardBg.fillRoundedRect(centerX - 320, topY, 640, 680, 8);
    cardBg.lineStyle(1.5, UI_COLORS.goldDeepNum, 0.5);
    cardBg.strokeRoundedRect(centerX - 320, topY, 640, 680, 8);
    this.detailContainer.add(cardBg);

    // Left Portrait (140x140)
    const portraitBg = this.scene.add.graphics();
    portraitBg.fillStyle(0x231d16, 0.9);
    portraitBg.fillRoundedRect(centerX - 305, topY + 16, 140, 140, 6);
    portraitBg.lineStyle(2, UI_COLORS.goldBevelNum, 0.7);
    portraitBg.strokeRoundedRect(centerX - 305, topY + 16, 140, 140, 6);

    const bigImg = this.scene.add.image(centerX - 235, topY + 86, weapon.textureKey)
      .setDisplaySize(125, 125);

    const badgeBg = this.scene.add.graphics();
    badgeBg.fillStyle(UI_COLORS.vermilionBrightNum, 0.9);
    badgeBg.fillRoundedRect(centerX - 305, topY + 16, 68, 22, { tl: 6, tr: 0, bl: 0, br: 6 });
    const badgeText = this.scene.add.text(centerX - 271, topY + 27, weapon.factionName, {
      fontFamily: UI_FONTS.primary,
      fontSize: '11px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.detailContainer.add([portraitBg, bigImg, badgeBg, badgeText]);

    // Right Info Specs
    const infoX = centerX - 145;
    const nameText = this.scene.add.text(infoX, topY + 18, weapon.name, {
      fontFamily: UI_FONTS.primary,
      fontSize: '22px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    });

    const aliasText = this.scene.add.text(infoX + nameText.width + 10, topY + 23, `【${weapon.alias}】`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '13px',
      color: UI_COLORS.goldBevel
    });

    const spec1 = this.scene.add.text(infoX, topY + 52, `📐 占格规制: ${weapon.footprint}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '12px',
      color: UI_COLORS.textMuted
    });
    const spec2 = this.scene.add.text(infoX + 160, topY + 52, `🎯 战术定位: ${weapon.attackType}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '12px',
      color: UI_COLORS.textMuted
    });
    const spec3 = this.scene.add.text(infoX, topY + 74, `🔭 射程范围: ${weapon.rangeDisplay}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '12px',
      color: UI_COLORS.textMuted
    });

    const synText = this.scene.add.text(infoX, topY + 98, `🔗 羁绊: ${weapon.synergyTags.join(' · ')}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: UI_COLORS.ironCyanRidge
    });

    let fusionText: Phaser.GameObjects.Text | undefined;
    if (weapon.fusionWeapon) {
      fusionText = this.scene.add.text(infoX, topY + 122, `✨ 觉醒: ${weapon.fusionWeapon}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '11px',
        color: '#ffb300',
        wordWrap: { width: 420 }
      });
    }

    this.detailContainer.add([nameText, aliasText, spec1, spec2, spec3, synText]);
    if (fusionText) this.detailContainer.add(fusionText);

    // Star Level Evolution Preview (★1 ~ ★4)
    this.renderWeaponStarEvolutionSection(centerX, topY + 172, weapon);

    // Historical Lore
    const loreBoxY = topY + 412;
    const loreBox = this.scene.add.graphics();
    loreBox.fillStyle(0x0e0c09, 0.75);
    loreBox.fillRoundedRect(centerX - 305, loreBoxY, 610, 195, 6);
    loreBox.lineStyle(1, 0x3d3023, 0.5);
    loreBox.strokeRoundedRect(centerX - 305, loreBoxY, 610, 195, 6);

    const loreTitle = this.scene.add.text(centerX - 290, loreBoxY + 14, '📜 兵经武备考 (典故渊源):', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: UI_COLORS.goldBevel,
      fontStyle: 'bold'
    });

    const loreContent = this.scene.add.text(centerX - 290, loreBoxY + 38, weapon.historicalNote, {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: UI_COLORS.textMuted,
      lineSpacing: 5,
      wordWrap: { width: 580 }
    });

    const loreQuote = this.scene.add.text(centerX, loreBoxY + 160, weapon.loreQuote, {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: UI_COLORS.goldBright,
      fontStyle: 'italic'
    }).setOrigin(0.5, 0);

    this.detailContainer.add([loreBox, loreTitle, loreContent, loreQuote]);

    // Bottom Navigation
    this.renderBottomNavigation(centerX, topY + 636, list.length, this.selectedWeaponIndex, (newIdx) => {
      this.selectedWeaponIndex = newIdx;
      SoundManager.getInstance().playBronzeButtonClick();
      this.renderWeaponTab();
    });
  }

  private renderWeaponStarEvolutionSection(centerX: number, startY: number, weapon: CompendiumWeaponItem): void {
    const starLevels: StarLevel[] = [1, 2, 3, 4];
    const starLabels = ['★1 初铸', '★2 进阶', '★3 质变', '★4 绝品神工'];
    const tabW = 145;

    starLevels.forEach((star, idx) => {
      const x = centerX - 305 + idx * (tabW + 10) + tabW / 2;
      const isSelected = this.selectedStarLevel === star;

      const starBg = this.scene.add.graphics();
      starBg.fillStyle(isSelected ? UI_COLORS.vermilionBrightNum : 0x1f1a14, 0.9);
      starBg.fillRoundedRect(x - tabW / 2, startY, tabW, 28, 4);
      starBg.lineStyle(1.5, isSelected ? UI_COLORS.goldBrightNum : 0x4d3d2e, 0.8);
      starBg.strokeRoundedRect(x - tabW / 2, startY, tabW, 28, 4);

      const starText = this.scene.add.text(x, startY + 14, starLabels[idx], {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: isSelected ? UI_COLORS.goldBright : UI_COLORS.textDim,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const hit = this.scene.add.zone(x, startY + 14, tabW, 28)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        if (this.selectedStarLevel !== star) {
          this.selectedStarLevel = star;
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderWeaponTab();
        }
      });

      this.detailContainer.add([starBg, starText, hit]);
    });

    const curEvo = weapon.evolutions[this.selectedStarLevel];
    const evoBoxY = startY + 36;

    const evoBox = this.scene.add.graphics();
    evoBox.fillStyle(0x1d1712, 0.85);
    evoBox.fillRoundedRect(centerX - 305, evoBoxY, 610, 185, 6);
    evoBox.lineStyle(1.5, UI_COLORS.goldDeepNum, 0.6);
    evoBox.strokeRoundedRect(centerX - 305, evoBoxY, 610, 185, 6);

    const evoTitle = this.scene.add.text(centerX - 290, evoBoxY + 14, `【${curEvo.name}】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    });

    const statAtk = this.scene.add.text(centerX - 90, evoBoxY + 15, `⚔️ 基础攻击: ${curEvo.atk > 0 ? curEvo.atk : '辅助增益'}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '13px',
      color: UI_COLORS.goldBevel
    });

    const statSpeed = this.scene.add.text(centerX + 90, evoBoxY + 15, `⏱️ 射击间隔: ${curEvo.interval}s`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '13px',
      color: UI_COLORS.textMuted
    });

    const descText = this.scene.add.text(centerX - 290, evoBoxY + 46, `威力机制: ${curEvo.description}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: UI_COLORS.textLight,
      lineSpacing: 5,
      wordWrap: { width: 580 }
    });

    let specFeatureText: Phaser.GameObjects.Text | undefined;
    if (curEvo.specialEffect) {
      specFeatureText = this.scene.add.text(centerX - 290, evoBoxY + 140, `⚡ 核心质变特性: 【${curEvo.specialEffect}】`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: '#ffca28',
        fontStyle: 'bold'
      });
    }

    this.detailContainer.add([evoBox, evoTitle, statAtk, statSpeed, descText]);
    if (specFeatureText) this.detailContainer.add(specFeatureText);
  }

  // =========================================================================
  // 2. 塞外敌寇鉴 Tab
  // =========================================================================

  private renderEnemyTab(): void {
    this.filterContainer.removeAll(true);
    this.gridContainer.removeAll(true);
    this.detailContainer.removeAll(true);

    this.renderEnemyFilterChips();
    this.renderEnemyGrid();
    this.renderEnemyDetail();
  }

  private renderEnemyFilterChips(): void {
    const startY = 248;
    const filters: { label: string; value: EnemyCategory | 'all' }[] = [
      { label: '全部敌寇 (13)', value: 'all' },
      { label: '🗡️ 先锋 (3)', value: 'regular' },
      { label: '🛡️ 精锐 (5)', value: 'elite' },
      { label: '👑 霸主首领 (5)', value: 'boss' }
    ];

    const totalW = 630;
    const btnW = totalW / filters.length - 8;
    const startX = 375 - totalW / 2 + btnW / 2;

    filters.forEach((filter, index) => {
      const x = startX + index * (btnW + 8);
      const isSelected = this.selectedEnemyCategory === filter.value;

      const chipBg = this.scene.add.graphics();
      chipBg.fillStyle(isSelected ? UI_COLORS.vermilionCinnabarNum : 0x1b2028, 0.9);
      chipBg.fillRoundedRect(x - btnW / 2, startY - 13, btnW, 26, 4);
      chipBg.lineStyle(1, isSelected ? UI_COLORS.goldBrightNum : 0x3e4756, 0.8);
      chipBg.strokeRoundedRect(x - btnW / 2, startY - 13, btnW, 26, 4);

      const chipText = this.scene.add.text(x, startY, filter.label, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: isSelected ? UI_COLORS.goldBright : UI_COLORS.textMuted
      }).setOrigin(0.5);

      const hit = this.scene.add.zone(x, startY, btnW, 26)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        if (this.selectedEnemyCategory !== filter.value) {
          this.selectedEnemyCategory = filter.value;
          this.selectedEnemyIndex = 0;
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderEnemyTab();
        }
      });

      this.filterContainer.add([chipBg, chipText, hit]);
    });
  }

  private renderEnemyGrid(): void {
    const list = getCompendiumEnemiesByCategory(this.selectedEnemyCategory);
    if (this.selectedEnemyIndex >= list.length) {
      this.selectedEnemyIndex = 0;
    }

    const isFullList = list.length > 8;
    const startY = isFullList ? 296 : 314;
    const cols = Math.min(list.length, 8);
    const spacingX = 72;
    const gridW = (cols - 1) * spacingX;
    const startX = 375 - gridW / 2;

    list.forEach((enemy, index) => {
      const col = index % 8;
      const row = Math.floor(index / 8);
      const x = startX + col * spacingX;
      const y = startY + row * 58;
      const isSelected = index === this.selectedEnemyIndex;

      const box = this.scene.add.graphics();
      box.fillStyle(0x181210, 0.95);
      box.fillRoundedRect(x - 26, y - 24, 52, 48, 5);
      box.lineStyle(isSelected ? 2 : 1, isSelected ? UI_COLORS.vermilionBrightNum : 0x4a3b2c, isSelected ? 1 : 0.6);
      box.strokeRoundedRect(x - 26, y - 24, 52, 48, 5);

      const icon = this.scene.add.image(x, y - 5, enemy.textureKey)
        .setDisplaySize(38, 38);

      if (enemy.category === 'boss') {
        const crown = this.scene.add.text(x - 16, y - 23, '👑', { fontSize: '10px' });
        this.gridContainer.add(crown);
      }

      const name = this.scene.add.text(x, y + 16, enemy.name.substring(0, 4), {
        fontFamily: UI_FONTS.primary,
        fontSize: '9px',
        color: isSelected ? UI_COLORS.goldBright : UI_COLORS.textDim
      }).setOrigin(0.5);

      const hit = this.scene.add.zone(x, y, 52, 48)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        if (this.selectedEnemyIndex !== index) {
          this.selectedEnemyIndex = index;
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderEnemyTab();
        }
      });

      this.gridContainer.add([box, icon, name, hit]);
    });
  }

  private renderEnemyDetail(): void {
    const list = getCompendiumEnemiesByCategory(this.selectedEnemyCategory);
    const enemy = list[this.selectedEnemyIndex];
    if (!enemy) return;

    const topY = 388;
    const centerX = 375;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x17120e, 0.94);
    cardBg.fillRoundedRect(centerX - 320, topY, 640, 680, 8);
    cardBg.lineStyle(1.5, UI_COLORS.vermilionCinnabarNum, 0.6);
    cardBg.strokeRoundedRect(centerX - 320, topY, 640, 680, 8);
    this.detailContainer.add(cardBg);

    // Left Portrait (140x140)
    const portraitBg = this.scene.add.graphics();
    portraitBg.fillStyle(0x241812, 0.9);
    portraitBg.fillRoundedRect(centerX - 305, topY + 16, 140, 140, 6);
    portraitBg.lineStyle(2, UI_COLORS.goldDeepNum, 0.7);
    portraitBg.strokeRoundedRect(centerX - 305, topY + 16, 140, 140, 6);

    const hdKey = 'hd_' + enemy.textureKey;
    const detailTextureKey = (this.scene.textures && this.scene.textures.exists(hdKey)) ? hdKey : enemy.textureKey;
    const bigImg = this.scene.add.image(centerX - 235, topY + 86, detailTextureKey)
      .setDisplaySize(130, 130);

    const badgeBg = this.scene.add.graphics();
    badgeBg.fillStyle(enemy.category === 'boss' ? UI_COLORS.vermilionBrightNum : 0x3e2723, 0.9);
    badgeBg.fillRoundedRect(centerX - 305, topY + 16, 68, 22, { tl: 6, tr: 0, bl: 0, br: 6 });
    const badgeText = this.scene.add.text(centerX - 271, topY + 27, enemy.categoryName, {
      fontFamily: UI_FONTS.primary,
      fontSize: '11px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.detailContainer.add([portraitBg, bigImg, badgeBg, badgeText]);

    // Right Specs
    const infoX = centerX - 145;
    const nameText = this.scene.add.text(infoX, topY + 18, enemy.name, {
      fontFamily: UI_FONTS.primary,
      fontSize: '22px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    });

    const titleText = this.scene.add.text(infoX, topY + 46, enemy.title, {
      fontFamily: UI_FONTS.sans,
      fontSize: '12px',
      color: '#ff8a80'
    });

    const dangerText = this.scene.add.text(infoX, topY + 66, `☠️ 危险评级: ${enemy.dangerRating}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '12px',
      color: '#ff5252',
      fontStyle: 'bold'
    });

    const attr1 = this.scene.add.text(infoX, topY + 88, `❤️ 生命强度: ${enemy.hpRating}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '11px',
      color: UI_COLORS.textMuted
    });
    const attr2 = this.scene.add.text(infoX, topY + 107, `🛡️ 护甲防御: ${enemy.armorRating}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '11px',
      color: UI_COLORS.textMuted
    });
    const attr3 = this.scene.add.text(infoX, topY + 126, `🏃 行军速度: ${enemy.speedRating}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '11px',
      color: UI_COLORS.textMuted
    });

    const recText = this.scene.add.text(infoX, topY + 145, `🎯 推荐克制: ${enemy.recommendedWeapons.join(' · ')}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '11px',
      color: UI_COLORS.goldBright
    });

    this.detailContainer.add([nameText, titleText, dangerText, attr1, attr2, attr3, recText]);

    // Threat Mechanisms
    const threatBoxY = topY + 172;
    const threatBox = this.scene.add.graphics();
    threatBox.fillStyle(0x211411, 0.85);
    threatBox.fillRoundedRect(centerX - 305, threatBoxY, 610, 160, 6);
    threatBox.lineStyle(1.5, UI_COLORS.vermilionBrightNum, 0.5);
    threatBox.strokeRoundedRect(centerX - 305, threatBoxY, 610, 160, 6);

    const threatTitle = this.scene.add.text(centerX - 290, threatBoxY + 14, '⚠️ 核心威胁机制与技能:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ff8a80',
      fontStyle: 'bold'
    });

    const threatContent = this.scene.add.text(centerX - 290, threatBoxY + 38, enemy.threatDescription, {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: UI_COLORS.textLight,
      lineSpacing: 5,
      wordWrap: { width: 580 }
    });

    this.detailContainer.add([threatBox, threatTitle, threatContent]);

    // Official Tactical Counter
    const counterBoxY = topY + 342;
    const counterBox = this.scene.add.graphics();
    counterBox.fillStyle(0x1a2118, 0.88);
    counterBox.fillRoundedRect(centerX - 305, counterBoxY, 610, 150, 6);
    counterBox.lineStyle(1.5, 0x4caf50, 0.7);
    counterBox.strokeRoundedRect(centerX - 305, counterBoxY, 610, 150, 6);

    const counterTitle = this.scene.add.text(centerX - 290, counterBoxY + 14, '🛡️ 守城破阵秘策 (兵法克制战术):', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#81c784',
      fontStyle: 'bold'
    });

    const counterContent = this.scene.add.text(centerX - 290, counterBoxY + 38, enemy.tacticalCounter, {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: '#e8f5e9',
      lineSpacing: 5,
      wordWrap: { width: 580 }
    });

    this.detailContainer.add([counterBox, counterTitle, counterContent]);

    // Lore Biography
    const loreBoxY = topY + 502;
    const loreBox = this.scene.add.graphics();
    loreBox.fillStyle(0x0e0c0a, 0.75);
    loreBox.fillRoundedRect(centerX - 305, loreBoxY, 610, 110, 6);
    loreBox.lineStyle(1, 0x3d3023, 0.5);
    loreBox.strokeRoundedRect(centerX - 305, loreBoxY, 610, 110, 6);

    const loreTitle = this.scene.add.text(centerX - 290, loreBoxY + 10, '📜 敌寇传记:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.goldBevel,
      fontStyle: 'bold'
    });

    const loreContent = this.scene.add.text(centerX - 290, loreBoxY + 32, enemy.loreBio, {
      fontFamily: UI_FONTS.primary,
      fontSize: '11px',
      color: UI_COLORS.textDim,
      lineSpacing: 4,
      wordWrap: { width: 580 }
    });

    this.detailContainer.add([loreBox, loreTitle, loreContent]);

    // Bottom Navigation
    this.renderBottomNavigation(centerX, topY + 636, list.length, this.selectedEnemyIndex, (newIdx) => {
      this.selectedEnemyIndex = newIdx;
      SoundManager.getInstance().playBronzeButtonClick();
      this.renderEnemyTab();
    });
  }

  // =========================================================================
  // 3. 神机阵略篇 Tab (相邻羁绊 · 元素反应 · 赤金觉醒)
  // =========================================================================

  private renderTacticsTab(): void {
    this.filterContainer.removeAll(true);
    this.gridContainer.removeAll(true);
    this.detailContainer.removeAll(true);

    this.renderTacticsFilterChips();
    this.renderTacticsGrid();

    if (this.selectedTacticsSubTab === 'synergy') {
      this.renderSynergyDetail();
    } else if (this.selectedTacticsSubTab === 'reaction') {
      this.renderReactionDetail();
    } else {
      this.renderFusionDetail();
    }
  }

  private renderTacticsFilterChips(): void {
    const startY = 248;
    const filters: { label: string; value: TacticsSubTab }[] = [
      { label: '🧩 空间相邻羁绊 (6)', value: 'synergy' },
      { label: '⚡ 元素连锁反应 (4)', value: 'reaction' },
      { label: '🌟 赤金融合觉醒 (3)', value: 'fusion' }
    ];

    const totalW = 630;
    const btnW = totalW / filters.length - 8;
    const startX = 375 - totalW / 2 + btnW / 2;

    filters.forEach((filter, index) => {
      const x = startX + index * (btnW + 8);
      const isSelected = this.selectedTacticsSubTab === filter.value;

      const chipBg = this.scene.add.graphics();
      chipBg.fillStyle(isSelected ? UI_COLORS.vermilionBrightNum : 0x1b2028, 0.9);
      chipBg.fillRoundedRect(x - btnW / 2, startY - 13, btnW, 26, 4);
      chipBg.lineStyle(1, isSelected ? UI_COLORS.goldBrightNum : 0x3e4756, 0.8);
      chipBg.strokeRoundedRect(x - btnW / 2, startY - 13, btnW, 26, 4);

      const chipText = this.scene.add.text(x, startY, filter.label, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: isSelected ? UI_COLORS.goldBright : UI_COLORS.textMuted,
        fontStyle: isSelected ? 'bold' : 'normal'
      }).setOrigin(0.5);

      const hit = this.scene.add.zone(x, startY, btnW, 26)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        if (this.selectedTacticsSubTab !== filter.value) {
          this.selectedTacticsSubTab = filter.value;
          this.selectedTacticsIndex = 0;
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderTacticsTab();
        }
      });

      this.filterContainer.add([chipBg, chipText, hit]);
    });
  }

  private renderTacticsGrid(): void {
    let listLength = 0;
    let getLabel = (idx: number) => '';
    let getSubLabel = (idx: number) => '';

    if (this.selectedTacticsSubTab === 'synergy') {
      listLength = COMPENDIUM_SYNERGIES.length;
      getLabel = idx => COMPENDIUM_SYNERGIES[idx].name;
      getSubLabel = idx => COMPENDIUM_SYNERGIES[idx].bonusValue;
    } else if (this.selectedTacticsSubTab === 'reaction') {
      listLength = COMPENDIUM_REACTIONS.length;
      getLabel = idx => COMPENDIUM_REACTIONS[idx].name;
      getSubLabel = idx => COMPENDIUM_REACTIONS[idx].formula.split('+')[0].trim();
    } else {
      listLength = COMPENDIUM_FUSIONS.length;
      getLabel = idx => COMPENDIUM_FUSIONS[idx].name;
      getSubLabel = idx => '赤金神品';
    }

    if (this.selectedTacticsIndex >= listLength) {
      this.selectedTacticsIndex = 0;
    }

    const startY = 300;
    const btnW = Math.min(100, Math.floor(630 / listLength) - 8);
    const totalW = listLength * (btnW + 8);
    const startX = 375 - totalW / 2 + btnW / 2;

    for (let index = 0; index < listLength; index++) {
      const x = startX + index * (btnW + 8);
      const y = startY;
      const isSelected = index === this.selectedTacticsIndex;

      const box = this.scene.add.graphics();
      box.fillStyle(isSelected ? 0x2b1e16 : 0x161310, 0.95);
      box.fillRoundedRect(x - btnW / 2, y - 20, btnW, 40, 5);
      box.lineStyle(isSelected ? 2 : 1, isSelected ? UI_COLORS.goldBrightNum : 0x4a3b2c, isSelected ? 1 : 0.6);
      box.strokeRoundedRect(x - btnW / 2, y - 20, btnW, 40, 5);

      const title = this.scene.add.text(x, y - 6, getLabel(index), {
        fontFamily: UI_FONTS.primary,
        fontSize: '11px',
        color: isSelected ? UI_COLORS.goldBright : UI_COLORS.textMuted,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const sub = this.scene.add.text(x, y + 9, getSubLabel(index), {
        fontFamily: UI_FONTS.sans,
        fontSize: '9px',
        color: isSelected ? '#ffb300' : UI_COLORS.textDim
      }).setOrigin(0.5);

      const hit = this.scene.add.zone(x, y, btnW, 40)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        if (this.selectedTacticsIndex !== index) {
          this.selectedTacticsIndex = index;
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderTacticsTab();
        }
      });

      this.gridContainer.add([box, title, sub, hit]);
    }
  }

  // --- 3.1 空间相邻羁绊详情 ---
  private renderSynergyDetail(): void {
    const item = COMPENDIUM_SYNERGIES[this.selectedTacticsIndex];
    if (!item) return;

    const topY = 356;
    const centerX = 375;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x161310, 0.94);
    cardBg.fillRoundedRect(centerX - 320, topY, 640, 710, 8);
    cardBg.lineStyle(1.5, UI_COLORS.goldDeepNum, 0.5);
    cardBg.strokeRoundedRect(centerX - 320, topY, 640, 710, 8);
    this.detailContainer.add(cardBg);

    // Title Header
    const titleText = this.scene.add.text(centerX, topY + 28, `【 ${item.name} 】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '24px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subText = this.scene.add.text(centerX, topY + 56, item.subTitle, {
      fontFamily: UI_FONTS.sans,
      fontSize: '13px',
      color: UI_COLORS.goldBevel
    }).setOrigin(0.5);

    // Adjacency Weapons Showcase Row (Weapon A + Link Symbol + Weapon B)
    const showcaseY = topY + 125;

    // Weapon A Box
    const boxA = this.scene.add.graphics();
    boxA.fillStyle(0x231d16, 0.9);
    boxA.fillRoundedRect(centerX - 240, showcaseY - 50, 110, 100, 6);
    boxA.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.7);
    boxA.strokeRoundedRect(centerX - 240, showcaseY - 50, 110, 100, 6);

    const imgA = this.scene.add.image(centerX - 185, showcaseY - 12, item.primaryWeapon.textureKey)
      .setDisplaySize(64, 64);
    const nameA = this.scene.add.text(centerX - 185, showcaseY + 34, item.primaryWeapon.name, {
      fontFamily: UI_FONTS.primary,
      fontSize: '11px',
      color: UI_COLORS.goldBright
    }).setOrigin(0.5);

    // Central Formation Link
    const linkBg = this.scene.add.graphics();
    linkBg.fillStyle(UI_COLORS.vermilionCinnabarNum, 0.95);
    linkBg.fillRoundedRect(centerX - 90, showcaseY - 32, 180, 64, 6);
    linkBg.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.9);
    linkBg.strokeRoundedRect(centerX - 90, showcaseY - 32, 180, 64, 6);

    const linkIcon = this.scene.add.text(centerX, showcaseY - 14, '⚡ 金色阵位连线 ⚡', {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: '#ffd54f',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const formatText = this.scene.add.text(centerX, showcaseY + 10, item.formation, {
      fontFamily: UI_FONTS.sans,
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Weapon B Box
    const boxB = this.scene.add.graphics();
    boxB.fillStyle(0x231d16, 0.9);
    boxB.fillRoundedRect(centerX + 130, showcaseY - 50, 110, 100, 6);
    boxB.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.7);
    boxB.strokeRoundedRect(centerX + 130, showcaseY - 50, 110, 100, 6);

    const imgB = this.scene.add.image(centerX + 185, showcaseY - 12, item.partnerWeapon.textureKey)
      .setDisplaySize(64, 64);
    const nameB = this.scene.add.text(centerX + 185, showcaseY + 34, item.partnerWeapon.name.substring(0, 7), {
      fontFamily: UI_FONTS.primary,
      fontSize: '11px',
      color: UI_COLORS.goldBright
    }).setOrigin(0.5);

    this.detailContainer.add([
      titleText, subText,
      boxA, imgA, nameA,
      linkBg, linkIcon, formatText,
      boxB, imgB, nameB
    ]);

    // Synergy Core Bonus Badge
    const bonusBoxY = topY + 200;
    const bonusBg = this.scene.add.graphics();
    bonusBg.fillStyle(0x1e271a, 0.9);
    bonusBg.fillRoundedRect(centerX - 290, bonusBoxY, 580, 48, 6);
    bonusBg.lineStyle(1.5, 0x4caf50, 0.8);
    bonusBg.strokeRoundedRect(centerX - 290, bonusBoxY, 580, 48, 6);

    const bonusLabel = this.scene.add.text(centerX - 265, bonusBoxY + 24, '🌟 核心增益属性:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#81c784',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const bonusValText = this.scene.add.text(centerX + 265, bonusBoxY + 24, item.bonusValue, {
      fontFamily: UI_FONTS.sans,
      fontSize: '17px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    this.detailContainer.add([bonusBg, bonusLabel, bonusValText]);

    // Description Box
    const descBoxY = topY + 265;
    const descBg = this.scene.add.graphics();
    descBg.fillStyle(0x191410, 0.85);
    descBg.fillRoundedRect(centerX - 290, descBoxY, 580, 160, 6);
    descBg.lineStyle(1.5, UI_COLORS.goldDeepNum, 0.6);
    descBg.strokeRoundedRect(centerX - 290, descBoxY, 580, 160, 6);

    const descTitle = this.scene.add.text(centerX - 270, descBoxY + 16, '📖 阵位联动机制与实战威力:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    });

    const descText = this.scene.add.text(centerX - 270, descBoxY + 44, item.description, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.textLight,
      lineSpacing: 6,
      wordWrap: { width: 540 }
    });

    this.detailContainer.add([descBg, descTitle, descText]);

    // Tactical Tip Box
    const tipBoxY = topY + 445;
    const tipBg = this.scene.add.graphics();
    tipBg.fillStyle(0x11161d, 0.9);
    tipBg.fillRoundedRect(centerX - 290, tipBoxY, 580, 140, 6);
    tipBg.lineStyle(1.5, UI_COLORS.ironCyanGlowNum, 0.7);
    tipBg.strokeRoundedRect(centerX - 290, tipBoxY, 580, 140, 6);

    const tipTitle = this.scene.add.text(centerX - 270, tipBoxY + 16, '💡 军师布阵心法与落子心得:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: UI_COLORS.ironCyanRidge,
      fontStyle: 'bold'
    });

    const tipContent = this.scene.add.text(centerX - 270, tipBoxY + 44, item.tacticalTip, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#e0f7fa',
      lineSpacing: 6,
      wordWrap: { width: 540 }
    });

    this.detailContainer.add([tipBg, tipTitle, tipContent]);

    // Bottom Navigation
    this.renderBottomNavigation(centerX, topY + 665, COMPENDIUM_SYNERGIES.length, this.selectedTacticsIndex, (newIdx) => {
      this.selectedTacticsIndex = newIdx;
      SoundManager.getInstance().playBronzeButtonClick();
      this.renderTacticsTab();
    });
  }

  // --- 3.2 元素连锁反应详情 ---
  private renderReactionDetail(): void {
    const item = COMPENDIUM_REACTIONS[this.selectedTacticsIndex];
    if (!item) return;

    const topY = 356;
    const centerX = 375;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x161310, 0.94);
    cardBg.fillRoundedRect(centerX - 320, topY, 640, 710, 8);
    cardBg.lineStyle(1.5, UI_COLORS.vermilionBrightNum, 0.5);
    cardBg.strokeRoundedRect(centerX - 320, topY, 640, 710, 8);
    this.detailContainer.add(cardBg);

    // Title Header
    const titleText = this.scene.add.text(centerX, topY + 28, `💥 元素连锁反应 ·【 ${item.name} 】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '23px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Combination Formula Row: [Element A] + [Element B] => [Reaction Name]
    const formulaY = topY + 95;
    const formulaBg = this.scene.add.graphics();
    formulaBg.fillStyle(0x241611, 0.9);
    formulaBg.fillRoundedRect(centerX - 290, formulaY - 32, 580, 64, 6);
    formulaBg.lineStyle(1.5, UI_COLORS.vermilionBrightNum, 0.8);
    formulaBg.strokeRoundedRect(centerX - 290, formulaY - 32, 580, 64, 6);

    const elemAText = this.scene.add.text(centerX - 160, formulaY, item.elementA, {
      fontFamily: UI_FONTS.sans,
      fontSize: '15px',
      color: '#ff8a80',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const plusSign = this.scene.add.text(centerX - 75, formulaY, '＋', {
      fontFamily: UI_FONTS.sans,
      fontSize: '20px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const elemBText = this.scene.add.text(centerX + 5, formulaY, item.elementB, {
      fontFamily: UI_FONTS.sans,
      fontSize: '15px',
      color: '#ffd54f',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const equalSign = this.scene.add.text(centerX + 90, formulaY, '➔', {
      fontFamily: UI_FONTS.sans,
      fontSize: '20px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const resultText = this.scene.add.text(centerX + 180, formulaY, item.name, {
      fontFamily: UI_FONTS.primary,
      fontSize: '17px',
      color: '#ff1744',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.detailContainer.add([titleText, formulaBg, elemAText, plusSign, elemBText, equalSign, resultText]);

    // Recommended Weapons Box (Dual Icons)
    const recBoxY = topY + 145;
    const recBg = this.scene.add.graphics();
    recBg.fillStyle(0x191410, 0.85);
    recBg.fillRoundedRect(centerX - 290, recBoxY, 580, 90, 6);
    recBg.lineStyle(1.5, UI_COLORS.goldDeepNum, 0.6);
    recBg.strokeRoundedRect(centerX - 290, recBoxY, 580, 90, 6);

    const recTitle = this.scene.add.text(centerX - 270, recBoxY + 16, '🎯 推荐神兵搭档组合:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.goldBevel,
      fontStyle: 'bold'
    });

    const imgA = this.scene.add.image(centerX - 100, recBoxY + 54, item.weaponA.textureKey)
      .setDisplaySize(48, 48);
    const labelA = this.scene.add.text(centerX - 60, recBoxY + 54, item.weaponA.name, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.goldBright
    }).setOrigin(0, 0.5);

    const imgB = this.scene.add.image(centerX + 110, recBoxY + 54, item.weaponB.textureKey)
      .setDisplaySize(48, 48);
    const labelB = this.scene.add.text(centerX + 150, recBoxY + 54, item.weaponB.name, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.goldBright
    }).setOrigin(0, 0.5);

    this.detailContainer.add([recBg, recTitle, imgA, labelA, imgB, labelB]);

    // Combat Effect Box
    const effectBoxY = topY + 250;
    const effectBg = this.scene.add.graphics();
    effectBg.fillStyle(0x261410, 0.9);
    effectBg.fillRoundedRect(centerX - 290, effectBoxY, 580, 160, 6);
    effectBg.lineStyle(1.5, 0xff5722, 0.8);
    effectBg.strokeRoundedRect(centerX - 290, effectBoxY, 580, 160, 6);

    const effectTitle = this.scene.add.text(centerX - 270, effectBoxY + 16, '⚡ 触发机制与实战破坏力:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#ff8a80',
      fontStyle: 'bold'
    });

    const mechText = this.scene.add.text(centerX - 270, effectBoxY + 44, `【触发前置】：${item.triggerMechanism}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '12px',
      color: '#ffccbc',
      lineSpacing: 4,
      wordWrap: { width: 540 }
    });

    const blastText = this.scene.add.text(centerX - 270, effectBoxY + 98, `【反应破坏】：${item.combatEffect}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#ffd700',
      lineSpacing: 5,
      wordWrap: { width: 540 },
      fontStyle: 'bold'
    });

    this.detailContainer.add([effectBg, effectTitle, mechText, blastText]);

    // Tactical Note (Valve Protection & Best Use)
    const noteBoxY = topY + 430;
    const noteBg = this.scene.add.graphics();
    noteBg.fillStyle(0x13171c, 0.9);
    noteBg.fillRoundedRect(centerX - 290, noteBoxY, 580, 155, 6);
    noteBg.lineStyle(1.5, UI_COLORS.ironCyanRidgeNum, 0.7);
    noteBg.strokeRoundedRect(centerX - 290, noteBoxY, 580, 155, 6);

    const noteTitle = this.scene.add.text(centerX - 270, noteBoxY + 16, '🛡️ 军略精要与首领克制法则:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: UI_COLORS.ironCyanRidge,
      fontStyle: 'bold'
    });

    const noteContent = this.scene.add.text(centerX - 270, noteBoxY + 46, item.tacticalNote, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#e0f2f1',
      lineSpacing: 6,
      wordWrap: { width: 540 }
    });

    this.detailContainer.add([noteBg, noteTitle, noteContent]);

    // Bottom Navigation
    this.renderBottomNavigation(centerX, topY + 665, COMPENDIUM_REACTIONS.length, this.selectedTacticsIndex, (newIdx) => {
      this.selectedTacticsIndex = newIdx;
      SoundManager.getInstance().playBronzeButtonClick();
      this.renderTacticsTab();
    });
  }

  // --- 3.3 赤金融合觉醒详情 ---
  private renderFusionDetail(): void {
    const item = COMPENDIUM_FUSIONS[this.selectedTacticsIndex];
    if (!item) return;

    const topY = 356;
    const centerX = 375;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x161310, 0.94);
    cardBg.fillRoundedRect(centerX - 320, topY, 640, 710, 8);
    cardBg.lineStyle(2, 0xffd700, 0.8);
    cardBg.strokeRoundedRect(centerX - 320, topY, 640, 710, 8);
    this.detailContainer.add(cardBg);

    // Title Header
    const titleText = this.scene.add.text(centerX, topY + 28, `🌟 双系赤金觉醒 ·【 ${item.name} 】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '23px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Dual ★3 Requirements Row
    const reqY = topY + 120;

    // Weapon A Box (★3)
    const boxA = this.scene.add.graphics();
    boxA.fillStyle(0x231d16, 0.9);
    boxA.fillRoundedRect(centerX - 240, reqY - 50, 110, 100, 6);
    boxA.lineStyle(2, 0xffd700, 0.85);
    boxA.strokeRoundedRect(centerX - 240, reqY - 50, 110, 100, 6);

    const imgA = this.scene.add.image(centerX - 185, reqY - 12, item.weaponA.textureKey)
      .setDisplaySize(64, 64);
    const starA = this.scene.add.text(centerX - 185, reqY + 34, item.weaponA.star, {
      fontFamily: UI_FONTS.primary,
      fontSize: '11px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Central Fusion Emblem
    const linkBg = this.scene.add.graphics();
    linkBg.fillStyle(UI_COLORS.vermilionBrightNum, 0.95);
    linkBg.fillRoundedRect(centerX - 90, reqY - 32, 180, 64, 6);
    linkBg.lineStyle(2, 0xffd700, 0.9);
    linkBg.strokeRoundedRect(centerX - 90, reqY - 32, 180, 64, 6);

    const linkTitle = this.scene.add.text(centerX, reqY - 14, '🔥 同场双三星解锁 🔥', {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: '#ffd54f',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const roleText = this.scene.add.text(centerX, reqY + 10, '极品觉醒神策', {
      fontFamily: UI_FONTS.sans,
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Weapon B Box (★3)
    const boxB = this.scene.add.graphics();
    boxB.fillStyle(0x231d16, 0.9);
    boxB.fillRoundedRect(centerX + 130, reqY - 50, 110, 100, 6);
    boxB.lineStyle(2, 0xffd700, 0.85);
    boxB.strokeRoundedRect(centerX + 130, reqY - 50, 110, 100, 6);

    const imgB = this.scene.add.image(centerX + 185, reqY - 12, item.weaponB.textureKey)
      .setDisplaySize(64, 64);
    const starB = this.scene.add.text(centerX + 185, reqY + 34, item.weaponB.star, {
      fontFamily: UI_FONTS.primary,
      fontSize: '11px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.detailContainer.add([
      titleText,
      boxA, imgA, starA,
      linkBg, linkTitle, roleText,
      boxB, imgB, starB
    ]);

    // Unlocked Card Banner
    const cardBannerY = topY + 195;
    const cardBgBanner = this.scene.add.graphics();
    cardBgBanner.fillStyle(0x2c1d10, 0.9);
    cardBgBanner.fillRoundedRect(centerX - 290, cardBannerY, 580, 46, 6);
    cardBgBanner.lineStyle(1.5, 0xffb300, 0.9);
    cardBgBanner.strokeRoundedRect(centerX - 290, cardBannerY, 580, 46, 6);

    const cardNameText = this.scene.add.text(centerX - 270, cardBannerY + 23, item.ultimateCardName, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const cardQualityText = this.scene.add.text(centerX + 270, cardBannerY + 23, item.cardQuality, {
      fontFamily: UI_FONTS.sans,
      fontSize: '13px',
      color: '#ff8a80',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    this.detailContainer.add([cardBgBanner, cardNameText, cardQualityText]);

    // Visual Destruction Description Box
    const vfxBoxY = topY + 258;
    const vfxBg = this.scene.add.graphics();
    vfxBg.fillStyle(0x20150e, 0.9);
    vfxBg.fillRoundedRect(centerX - 290, vfxBoxY, 580, 165, 6);
    vfxBg.lineStyle(1.5, 0xffa726, 0.8);
    vfxBg.strokeRoundedRect(centerX - 290, vfxBoxY, 580, 165, 6);

    const vfxTitle = this.scene.add.text(centerX - 270, vfxBoxY + 16, '🌪️ 全屏战局终极毁灭机制:', {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#ffb74d',
      fontStyle: 'bold'
    });

    const vfxContent = this.scene.add.text(centerX - 270, vfxBoxY + 44, item.detailedEffect, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#fff3e0',
      lineSpacing: 6,
      wordWrap: { width: 540 }
    });

    this.detailContainer.add([vfxBg, vfxTitle, vfxContent]);

    // Tactical Role & Boss Slaying Tip Box
    const roleBoxY = topY + 440;
    const roleBg = this.scene.add.graphics();
    roleBg.fillStyle(0x131a19, 0.9);
    roleBg.fillRoundedRect(centerX - 290, roleBoxY, 580, 145, 6);
    roleBg.lineStyle(1.5, 0x26a69a, 0.8);
    roleBg.strokeRoundedRect(centerX - 290, roleBoxY, 580, 145, 6);

    const roleTitle = this.scene.add.text(centerX - 270, roleBoxY + 16, `🎖️ 终局定位: 【${item.tacticalRole}】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: '#80cbc4',
      fontStyle: 'bold'
    });

    const roleContent = this.scene.add.text(centerX - 270, roleBoxY + 44, `震撼视觉表现: ${item.visualVFX}`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#e0f2f1',
      lineSpacing: 5,
      wordWrap: { width: 540 }
    });

    this.detailContainer.add([roleBg, roleTitle, roleContent]);

    // Bottom Navigation
    this.renderBottomNavigation(centerX, topY + 665, COMPENDIUM_FUSIONS.length, this.selectedTacticsIndex, (newIdx) => {
      this.selectedTacticsIndex = newIdx;
      SoundManager.getInstance().playBronzeButtonClick();
      this.renderTacticsTab();
    });
  }

  // =========================================================================
  // Bottom Page Turners
  // =========================================================================

  private renderBottomNavigation(
    centerX: number,
    navY: number,
    totalCount: number,
    currentIndex: number,
    onIndexChange: (index: number) => void
  ): void {
    const btnW = 130;
    const btnH = 32;

    // Prev Button
    const prevX = centerX - 180;
    const prevBg = this.scene.add.graphics();
    prevBg.fillStyle(UI_COLORS.bronzeBodyNum, 0.9);
    prevBg.fillRoundedRect(prevX - btnW / 2, navY - btnH / 2, btnW, btnH, 5);
    prevBg.lineStyle(1, UI_COLORS.goldBrightNum, 0.7);
    prevBg.strokeRoundedRect(prevX - btnW / 2, navY - btnH / 2, btnW, btnH, 5);

    const prevText = this.scene.add.text(prevX, navY, '◀ 上一个', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.goldBright
    }).setOrigin(0.5);

    const prevHit = this.scene.add.zone(prevX, navY, btnW, btnH)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    prevHit.on('pointerdown', () => {
      const nextIdx = (currentIndex - 1 + totalCount) % totalCount;
      onIndexChange(nextIdx);
    });

    // Page Indicator (e.g. 1 / 16)
    const pageText = this.scene.add.text(centerX, navY, `${currentIndex + 1} / ${totalCount}`, {
      fontFamily: UI_FONTS.sans,
      fontSize: '14px',
      color: UI_COLORS.goldBevel,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Next Button
    const nextX = centerX + 180;
    const nextBg = this.scene.add.graphics();
    nextBg.fillStyle(UI_COLORS.bronzeBodyNum, 0.9);
    nextBg.fillRoundedRect(nextX - btnW / 2, navY - btnH / 2, btnW, btnH, 5);
    nextBg.lineStyle(1, UI_COLORS.goldBrightNum, 0.7);
    nextBg.strokeRoundedRect(nextX - btnW / 2, navY - btnH / 2, btnW, btnH, 5);

    const nextText = this.scene.add.text(nextX, navY, '下一个 ▶', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: UI_COLORS.goldBright
    }).setOrigin(0.5);

    const nextHit = this.scene.add.zone(nextX, navY, btnW, btnH)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    nextHit.on('pointerdown', () => {
      const nextIdx = (currentIndex + 1) % totalCount;
      onIndexChange(nextIdx);
    });

    this.detailContainer.add([prevBg, prevText, prevHit, pageText, nextBg, nextText, nextHit]);
  }
}
