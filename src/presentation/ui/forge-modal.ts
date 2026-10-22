/**
 * 《孤城神机营》- Blueprint Workshop & Equipment Forging Modal (神机天工坊·图纸打造弹窗)
 * Standards:
 * - 750x1334 Vertical Portrait Viewport
 * - National Tide Xuan Paper & Bronze Rivet aesthetics
 * - Dual Tabs: "🔨 部件打造" (Crafting Anvil) & "⚙️ 军械装配" (Weapon Outfitting)
 * - Pure Presentation driving Headless Domain Models (ForgeManager, ProfileStorage)
 */

import Phaser from 'phaser';
import { PlayerProfile } from '../../core/meta/types';
import { ProfileStorage } from '../../core/meta/profile-storage';
import { ForgeManager } from '../../core/forge/forge-manager';
import { COMPONENT_DEFINITIONS, ALL_COMPONENT_IDS, getComponentDefinition } from '../../core/forge/forge-config';
import { ComponentSlot, ComponentDefinition, ForgedComponentItem, ComponentAffix } from '../../core/forge/types';
import { ForgeRefineEngine, AFFIX_TEMPLATES } from '../../core/forge/forge-refine';
import { ALL_WEAPON_CONFIG_IDS } from '../../core/meta/armory-manager';
import { getWeaponConfig } from '../../config/weapons.config';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS } from './ui-theme';
import { BronzeButton } from './bronze-button';
import { SoundManager } from '../audio/sound-manager';

export interface ForgeModalOptions {
  profileStorage: ProfileStorage;
  profile: PlayerProfile;
  onUpdated?: () => void;
  onSwitchToArmory?: () => void;
}

export class ForgeModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private profileStorage: ProfileStorage;
  private profile: PlayerProfile;
  private onUpdated?: () => void;
  private onSwitchToArmory?: () => void;

  private currentTab: 'craft' | 'equip' | 'refine' = 'craft';
  private contentContainer!: Phaser.GameObjects.Container;
  private currencyText!: Phaser.GameObjects.Text;
  private tabCraftBtn!: Phaser.GameObjects.Text;
  private tabEquipBtn!: Phaser.GameObjects.Text;
  private tabRefineBtn!: Phaser.GameObjects.Text;
  private tabIndicator!: Phaser.GameObjects.Graphics;

  // Equip tab state
  private selectedWeaponIndex: number = 0;
  private selectedSlotForEquip: ComponentSlot = 'barrel';

  // Refine tab state
  private selectedRefineIndex: number = 0;

  constructor(scene: Phaser.Scene, options: ForgeModalOptions) {
    this.scene = scene;
    this.profileStorage = options.profileStorage;
    this.profile = options.profile;
    this.onUpdated = options.onUpdated;
    this.onSwitchToArmory = options.onSwitchToArmory;

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

    // 3. Modal Top-Level Hall Tabs (造办处 & 天工坊)
    const topY = centerY - modalH / 2;
    const hallTabW = 240;
    const hallTabH = 38;

    // 1. 造办处 Tab (Inactive in ForgeModal -> click to switch to Armory)
    const armoryHallTab = this.scene.add.container(centerX - 130, topY + 46);
    const aBg = this.scene.add.graphics();
    aBg.fillStyle(0x1e272c, 0.9);
    aBg.fillRoundedRect(-hallTabW / 2, -hallTabH / 2, hallTabW, hallTabH, 6);
    aBg.lineStyle(1.2, 0x455a64, 0.9);
    aBg.strokeRoundedRect(-hallTabW / 2, -hallTabH / 2, hallTabW, hallTabH, 6);
    const aText = this.scene.add.text(0, 0, '⚒️ 【 造 办 处 · 强 化 】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#90a4ae'
    }).setOrigin(0.5);
    armoryHallTab.add([aBg, aText]);
    armoryHallTab.setSize(hallTabW, hallTabH).setInteractive({ useHandCursor: true });
    armoryHallTab.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.hide();
      if (this.onSwitchToArmory) {
        this.onSwitchToArmory();
      }
    });

    // 2. 天工坊 Tab (Active in ForgeModal)
    const forgeHallTab = this.scene.add.container(centerX + 130, topY + 46);
    const fBg = this.scene.add.graphics();
    fBg.fillStyle(0x3e2723, 1.0);
    fBg.fillRoundedRect(-hallTabW / 2, -hallTabH / 2, hallTabW, hallTabH, 6);
    fBg.lineStyle(1.8, 0xffd700, 1.0);
    fBg.strokeRoundedRect(-hallTabW / 2, -hallTabH / 2, hallTabW, hallTabH, 6);
    const fText = this.scene.add.text(0, 0, '🔨 【 天 工 坊 · 锻 造 】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    forgeHallTab.add([fBg, fText]);

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

    const subTitle = this.scene.add.text(centerX, topY + 76, '— 稀有图纸打造 · 军械部件装配 —', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#90a4ae'
    }).setOrigin(0.5);

    // 4. Currency Sub-header (Blueprints & Iron)
    this.currencyText = this.scene.add.text(centerX, topY + 106, '', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ffd54f',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.container.add([armoryHallTab, forgeHallTab, subTitle, closeBtn, this.currencyText]);

    // 5. Triple Tab Headers
    const tabY = topY + 140;
    this.tabCraftBtn = this.scene.add.text(centerX - 180, tabY, '🔨 【部件打造】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '17px',
      color: '#ffd700',
      fontStyle: 'bold',
      padding: { x: 6, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tabEquipBtn = this.scene.add.text(centerX, tabY, '⚙️ 【军械装配】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '17px',
      color: '#90a4ae',
      fontStyle: 'bold',
      padding: { x: 6, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tabRefineBtn = this.scene.add.text(centerX + 180, tabY, '✨ 【天工洗炼】', {
      fontFamily: UI_FONTS.primary,
      fontSize: '17px',
      color: '#90a4ae',
      fontStyle: 'bold',
      padding: { x: 6, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    [this.tabCraftBtn, this.tabEquipBtn, this.tabRefineBtn].forEach(btn => {
      btn.on('pointerover', () => {
        btn.setScale(1.05);
      });
      btn.on('pointerout', () => {
        btn.setScale(1.0);
      });
    });

    this.tabIndicator = this.scene.add.graphics();
    this.container.add([this.tabCraftBtn, this.tabEquipBtn, this.tabRefineBtn, this.tabIndicator]);

    this.tabCraftBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.currentTab = 'craft';
      this.refreshTabHeader();
      this.renderCurrentTab();
    });

    this.tabEquipBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.currentTab = 'equip';
      this.refreshTabHeader();
      this.renderCurrentTab();
    });

    this.tabRefineBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.currentTab = 'refine';
      this.refreshTabHeader();
      this.renderCurrentTab();
    });

    // 6. Content Container for tab views
    this.contentContainer = this.scene.add.container(0, 0);
    this.container.add(this.contentContainer);

    this.refreshTabHeader();
  }

  private refreshTabHeader(): void {
    const topY = 667 - 1040 / 2;
    const tabY = topY + 140;
    const centerX = 375;

    this.tabCraftBtn.setColor(this.currentTab === 'craft' ? '#ffd700' : '#78909c');
    this.tabEquipBtn.setColor(this.currentTab === 'equip' ? '#ffd700' : '#78909c');
    this.tabRefineBtn.setColor(this.currentTab === 'refine' ? '#ffd700' : '#78909c');

    this.tabIndicator.clear();
    this.tabIndicator.fillStyle(UI_COLORS.goldBrightNum, 1.0);
    let indX = centerX - 180;
    if (this.currentTab === 'equip') indX = centerX;
    else if (this.currentTab === 'refine') indX = centerX + 180;
    this.tabIndicator.fillRoundedRect(indX - 70, tabY + 16, 140, 3, 2);
  }

  private updateCurrencyDisplay(): void {
    const bps = this.profile.currencies.blueprints ?? 0;
    const iron = this.profile.currencies.iron ?? 0;
    this.currencyText.setText(`📜 神机图纸: ${bps} 张    ⛏️ 天外玄铁: ${iron}`);
  }

  public show(): void {
    this.container.setVisible(true);
    this.updateCurrencyDisplay();
    this.refreshTabHeader();
    this.renderCurrentTab();
  }

  public hide(): void {
    this.container.setVisible(false);
    if (this.onUpdated) {
      this.onUpdated();
    }
  }

  private renderCurrentTab(): void {
    this.contentContainer.removeAll(true);
    this.updateCurrencyDisplay();

    if (this.currentTab === 'craft') {
      this.renderCraftingTab();
    } else if (this.currentTab === 'equip') {
      this.renderEquipTab();
    } else {
      this.renderRefineTab();
    }
  }

  // =========================================================================
  // Tab 1: 部件锻造 (Crafting Anvil)
  // =========================================================================

  private renderCraftingTab(): void {
    this.contentContainer.removeAll(true);
    const startY = 400;
    const cardW = 610;
    const cardH = 140;
    const spacing = 14;

    const compIds = ALL_COMPONENT_IDS;
    const maxVisible = 4; // Display top 4 with page/scroll or list
    // We render a compact scroll/pagination or multi-item list
    const visibleComps = compIds.slice(0, 4);

    visibleComps.forEach((compId, idx) => {
      const compDef = getComponentDefinition(compId);
      if (!compDef) return;

      const cy = startY + idx * (cardH + spacing);
      const card = this.scene.add.container(375, cy);

      const qColor = compDef.quality === 'legendary' ? 0xffd700 : compDef.quality === 'epic' ? 0xe040fb : 0x00e5ff;
      const qColorHex = compDef.quality === 'legendary' ? '#ffd700' : compDef.quality === 'epic' ? '#e040fb' : '#00e5ff';
      const qTag = compDef.quality === 'legendary' ? '【传世】' : compDef.quality === 'epic' ? '【史诗】' : '【精良】';
      const slotTag = compDef.slot === 'barrel' ? '身管' : compDef.slot === 'receiver' ? '机匣' : '引信';

      // Background
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x181c24, 1.0);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
      bg.lineStyle(1.5, qColor, 0.7);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
      card.add(bg);

      // Name & Quality
      const title = this.scene.add.text(-cardW / 2 + 20, -cardH / 2 + 16, `${qTag} ${compDef.name} · 【${slotTag}】`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '18px',
        color: qColorHex,
        fontStyle: 'bold'
      });

      // Boss Source Tag if any
      if (compDef.sourceBoss) {
        const bossTag = this.scene.add.text(cardW / 2 - 20, -cardH / 2 + 16, `[${compDef.sourceBoss} 专属]`, {
          fontFamily: UI_FONTS.primary,
          fontSize: '13px',
          color: '#ffb74d'
        }).setOrigin(1, 0);
        card.add(bossTag);
      }

      // Description & stats
      const desc = this.scene.add.text(-cardW / 2 + 20, -cardH / 2 + 48, compDef.desc, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: '#90a4ae',
        wordWrap: { width: 380 }
      });

      // Bonus list
      const bonusStrs: string[] = [];
      if (compDef.bonuses.atkBonus) bonusStrs.push(`攻击 +${Math.round(compDef.bonuses.atkBonus * 100)}%`);
      if (compDef.bonuses.cooldownReduction) bonusStrs.push(`装填 -${Math.round(compDef.bonuses.cooldownReduction * 100)}%`);
      if (compDef.bonuses.rangeBonus) bonusStrs.push(`射程 +${compDef.bonuses.rangeBonus}px`);
      if (compDef.bonuses.critRateBonus) bonusStrs.push(`暴击 +${Math.round(compDef.bonuses.critRateBonus * 100)}%`);
      if (compDef.bonuses.critDmgBonus) bonusStrs.push(`暴伤 +${compDef.bonuses.critDmgBonus.toFixed(2)}`);
      if (compDef.bonuses.armorPierce) bonusStrs.push(`破甲 +${compDef.bonuses.armorPierce}`);
      if (compDef.bonuses.reflectBonus) bonusStrs.push(`反伤 +${Math.round(compDef.bonuses.reflectBonus * 100)}%`);

      const bonusText = this.scene.add.text(-cardW / 2 + 20, -cardH / 2 + 96, `★ 加成: ${bonusStrs.join('  ')}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: '#69f0ae',
        fontStyle: 'bold'
      });

      card.add([title, desc, bonusText]);

      // Right action area: Cost & Forge Button
      const check = ForgeManager.canForge(this.profile, compId);
      const costText = this.scene.add.text(cardW / 2 - 100, cardH / 2 - 58, `图纸: ${compDef.blueprintCost}  玄铁: ${compDef.ironCost}`, {
        fontFamily: UI_FONTS.primary,
        fontSize: '12px',
        color: check.canForge ? '#ffd54f' : '#ef5350'
      }).setOrigin(0.5);

      const forgeBtn = new BronzeButton(this.scene, {
        x: cardW / 2 - 100,
        y: cardH / 2 - 28,
        width: 140,
        height: 38,
        variant: check.canForge ? 'red' : 'bronze',
        title: '🔨 锤炼锻造',
        onClick: () => {
          this.executeForge(compId);
        }
      });
      forgeBtn.setEnabled(check.canForge);

      card.add([costText, forgeBtn]);
      this.contentContainer.add(card);
    });

    // Helper hint text
    const hint = this.scene.add.text(375, 970, '💡 提示：在首领战及无尽演武击溃大首领，可缴获更多专属神机图纸！', {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#78909c'
    }).setOrigin(0.5);
    this.contentContainer.add(hint);
  }

  private executeForge(componentId: string): void {
    const res = ForgeManager.forgeComponent(this.profile, componentId);
    if (res.success) {
      this.profileStorage.saveProfile(this.profile);
      SoundManager.getInstance().playCannonBlast();
      this.renderCurrentTab();
    }
  }

  // =========================================================================
  // Tab 2: 军械装配 (Weapon Outfitting)
  // =========================================================================

  private renderEquipTab(): void {
    this.contentContainer.removeAll(true);
    const weaponId = ALL_WEAPON_CONFIG_IDS[this.selectedWeaponIndex];
    const weaponCfg = getWeaponConfig(weaponId);

    // 1. Weapon Switcher Bar
    const switcherY = 345;
    const prevBtn = this.scene.add.text(120, switcherY, '◀ 上一军械', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#00e5ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    prevBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.selectedWeaponIndex = (this.selectedWeaponIndex - 1 + ALL_WEAPON_CONFIG_IDS.length) % ALL_WEAPON_CONFIG_IDS.length;
      this.renderEquipTab();
    });

    const weaponName = weaponCfg?.name || weaponId;
    const wNameText = this.scene.add.text(375, switcherY, `【 ${weaponName} 】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const nextBtn = this.scene.add.text(630, switcherY, '下一军械 ▶', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#00e5ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % ALL_WEAPON_CONFIG_IDS.length;
      this.renderEquipTab();
    });

    this.contentContainer.add([prevBtn, wNameText, nextBtn]);

    // 2. Three Equipment Slots
    const slots: { slot: ComponentSlot; title: string }[] = [
      { slot: 'barrel', title: '【身管 / 炮管】' },
      { slot: 'receiver', title: '【机匣 / 底座】' },
      { slot: 'fuze', title: '【火门 / 引信】' }
    ];

    const slotCardW = 196;
    const slotCardH = 170;
    const slotY = 460;

    const equippedSlots = this.profile.forge?.equipped?.[weaponId] || {};

    slots.forEach((s, idx) => {
      const cx = 175 + idx * 200;
      const card = this.scene.add.container(cx, slotY);

      const equippedUid = equippedSlots[s.slot];
      const equippedItem = equippedUid
        ? this.profile.forge?.inventory?.find(i => i.uid === equippedUid)
        : undefined;
      const compDef = equippedItem ? getComponentDefinition(equippedItem.componentId) : undefined;

      const isSelected = this.selectedSlotForEquip === s.slot;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x19202a, 1.0);
      bg.fillRoundedRect(-slotCardW / 2, -slotCardH / 2, slotCardW, slotCardH, 8);
      bg.lineStyle(1.5, isSelected ? 0xffd700 : 0x37474f, 1.0);
      bg.strokeRoundedRect(-slotCardW / 2, -slotCardH / 2, slotCardW, slotCardH, 8);
      card.add(bg);

      const slotTitle = this.scene.add.text(0, -slotCardH / 2 + 16, s.title, {
        fontFamily: UI_FONTS.primary,
        fontSize: '14px',
        color: '#b0bec5',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      card.add(slotTitle);

      if (compDef) {
        const qColor = compDef.quality === 'legendary' ? '#ffd700' : compDef.quality === 'epic' ? '#e040fb' : '#00e5ff';
        const nameText = this.scene.add.text(0, -15, compDef.name, {
          fontFamily: UI_FONTS.primary,
          fontSize: '14px',
          color: qColor,
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: 170 }
        }).setOrigin(0.5);

        // Unequip button
        const unequipText = this.scene.add.text(0, 48, '【 卸下 】', {
          fontFamily: UI_FONTS.primary,
          fontSize: '13px',
          color: '#ef5350'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        unequipText.on('pointerdown', () => {
          ForgeManager.unequipComponent(this.profile, weaponId, s.slot);
          this.profileStorage.saveProfile(this.profile);
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderEquipTab();
        });

        card.add([nameText, unequipText]);
      } else {
        const emptyLabel = this.scene.add.text(0, 5, '（空置）\n点击选配', {
          fontFamily: UI_FONTS.primary,
          fontSize: '13px',
          color: '#546e7a',
          align: 'center'
        }).setOrigin(0.5);
        card.add(emptyLabel);
      }

      card.setSize(slotCardW, slotCardH).setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        SoundManager.getInstance().playBronzeButtonClick();
        this.selectedSlotForEquip = s.slot;
        this.renderEquipTab();
      });

      this.contentContainer.add(card);
    });

    // 3. Available Inventory List for the Selected Slot
    const listY = 585;
    const slotTitleName = this.selectedSlotForEquip === 'barrel' ? '身管' : this.selectedSlotForEquip === 'receiver' ? '机匣' : '引信';
    const invHeader = this.scene.add.text(375, listY, `— 军备库中可选【${slotTitleName}】部件 —`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#ffd54f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.contentContainer.add(invHeader);

    const availableItems = (this.profile.forge?.inventory || []).filter(item => {
      const def = getComponentDefinition(item.componentId);
      return def && def.slot === this.selectedSlotForEquip;
    });

    if (availableItems.length === 0) {
      const emptyInv = this.scene.add.text(375, listY + 80, '暂无可用部件，前往【部件打造】消耗图纸锻造！', {
        fontFamily: UI_FONTS.primary,
        fontSize: '14px',
        color: '#78909c'
      }).setOrigin(0.5);
      this.contentContainer.add(emptyInv);
    } else {
      const maxRows = Math.min(3, availableItems.length);
      for (let i = 0; i < maxRows; i++) {
        const item = availableItems[i];
        const def = getComponentDefinition(item.componentId)!;
        const cy = listY + 45 + i * 58;

        const row = this.scene.add.container(375, cy);
        const rBg = this.scene.add.graphics();
        rBg.fillStyle(0x151b22, 1.0);
        rBg.fillRoundedRect(-300, -24, 600, 48, 6);
        rBg.lineStyle(1, 0x37474f, 0.8);
        rBg.strokeRoundedRect(-300, -24, 600, 48, 6);
        row.add(rBg);

        const qColor = def.quality === 'legendary' ? '#ffd700' : def.quality === 'epic' ? '#e040fb' : '#00e5ff';
        const nameT = this.scene.add.text(-280, 0, def.name, {
          fontFamily: UI_FONTS.primary,
          fontSize: '15px',
          color: qColor,
          fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const eqBtn = this.scene.add.text(260, 0, '【装配】', {
          fontFamily: UI_FONTS.primary,
          fontSize: '14px',
          color: '#00e676',
          fontStyle: 'bold'
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

        eqBtn.on('pointerdown', () => {
          ForgeManager.equipComponent(this.profile, weaponId, item.uid);
          this.profileStorage.saveProfile(this.profile);
          SoundManager.getInstance().playBronzeButtonClick();
          this.renderEquipTab();
        });

        row.add([nameT, eqBtn]);
        this.contentContainer.add(row);
      }
    }

    // 4. Cumulative Weapon Bonuses Summary Box
    const sumY = 855;
    const sumW = 610;
    const sumH = 130;
    const sumBox = this.scene.add.container(375, sumY);

    const sBg = this.scene.add.graphics();
    sBg.fillStyle(0x14181f, 1.0);
    sBg.fillRoundedRect(-sumW / 2, -sumH / 2, sumW, sumH, 8);
    sBg.lineStyle(1.5, UI_COLORS.goldBrightNum, 0.8);
    sBg.strokeRoundedRect(-sumW / 2, -sumH / 2, sumW, sumH, 8);
    sumBox.add(sBg);

    const b = ForgeManager.calculateWeaponForgeBonuses(this.profile, weaponId);

    const sTitle = this.scene.add.text(-sumW / 2 + 20, -sumH / 2 + 16, `【${weaponName}】天工部件实战增益总览：`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    const l1 = `• 火力加成: +${Math.round(b.atkBonus * 100)}%   • 装填提速: +${Math.round(b.cooldownReduction * 100)}%   • 射程: +${b.rangeBonus}px`;
    const l2 = `• 暴击率: +${Math.round(b.critRateBonus * 100)}%   • 暴伤倍率: +${b.critDmgBonus.toFixed(2)}   • 护甲穿透: +${b.armorPierce}`;

    const line1 = this.scene.add.text(-sumW / 2 + 20, -sumH / 2 + 48, l1, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#eceff1'
    });
    const line2 = this.scene.add.text(-sumW / 2 + 20, -sumH / 2 + 76, l2, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: '#80cbc4'
    });

    sumBox.add([sTitle, line1, line2]);
    this.contentContainer.add(sumBox);
  }

  // =========================================================================
  // Tab 3: 天工洗炼 (Component Refinement & Affix Re-rolling)
  // =========================================================================

  private renderRefineTab(): void {
    this.contentContainer.removeAll(true);
    const inventory = this.profile.forge?.inventory || [];

    if (inventory.length === 0) {
      const emptyBox = this.scene.add.container(375, 550);
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x19202a, 0.95);
      bg.fillRoundedRect(-280, -120, 560, 240, 12);
      bg.lineStyle(1.5, UI_COLORS.bronzeBodyNum, 0.8);
      bg.strokeRoundedRect(-280, -120, 560, 240, 12);

      const title = this.scene.add.text(0, -60, '⚔️ 暂无已锻造的军械部件', {
        fontFamily: UI_FONTS.primary,
        fontSize: '20px',
        color: '#ffd700',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const desc = this.scene.add.text(0, -10, '行囊中尚无部件可供洗炼。\n请先前往【🔨 部件打造】熔铸部件！', {
        fontFamily: UI_FONTS.primary,
        fontSize: '15px',
        color: '#b0bec5',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5);

      const goBtn = new BronzeButton(this.scene, {
        x: 0,
        y: 65,
        width: 200,
        height: 42,
        title: '前往部件打造',
        variant: 'red',
        onClick: () => {
          this.currentTab = 'craft';
          this.refreshTabHeader();
          this.renderCurrentTab();
        }
      });

      emptyBox.add([bg, title, desc, goBtn]);
      this.contentContainer.add(emptyBox);
      return;
    }

    if (this.selectedRefineIndex >= inventory.length) {
      this.selectedRefineIndex = 0;
    }
    const item = inventory[this.selectedRefineIndex];
    ForgeRefineEngine.ensureItemAffixes(item);
    const def = getComponentDefinition(item.componentId);
    if (!def) return;

    // 1. Component Switcher
    const switcherY = 345;
    const prevBtn = this.scene.add.text(120, switcherY, '◀ 上一部件', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#00e5ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    prevBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.selectedRefineIndex = (this.selectedRefineIndex - 1 + inventory.length) % inventory.length;
      this.renderRefineTab();
    });

    const itemLabel = `${def.name} (${this.selectedRefineIndex + 1}/${inventory.length})`;
    const nameText = this.scene.add.text(375, switcherY, `【 ${itemLabel} 】`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const nextBtn = this.scene.add.text(630, switcherY, '下一部件 ▶', {
      fontFamily: UI_FONTS.primary,
      fontSize: '15px',
      color: '#00e5ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      SoundManager.getInstance().playBronzeButtonClick();
      this.selectedRefineIndex = (this.selectedRefineIndex + 1) % inventory.length;
      this.renderRefineTab();
    });

    this.contentContainer.add([prevBtn, nameText, nextBtn]);

    // 2. Component Info & Gear Score Banner
    const gs = ForgeRefineEngine.calculateGearScore(item, def);
    const qColor = def.quality === 'legendary' ? 0xffd700 : def.quality === 'epic' ? 0xe040fb : 0x00e5ff;
    const qTag = def.quality === 'legendary' ? '【传世】' : def.quality === 'epic' ? '【史诗】' : '【精良】';
    const slotTag = def.slot === 'barrel' ? '身管' : def.slot === 'receiver' ? '机匣' : '引信';

    const infoY = 385;
    const infoText = this.scene.add.text(375, infoY, `${qTag} 品阶 · 槽位: ${slotTag}   |   战力评分: ${gs.score} (${gs.rankText})`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '14px',
      color: gs.rankColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.contentContainer.add(infoText);

    // 3. Affix Container Card
    const boxW = 620;
    const boxH = 250;
    const boxY = 530;
    const card = this.scene.add.container(375, boxY);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x13171e, 1.0);
    bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 10);
    bg.lineStyle(1.5, qColor, 0.7);
    bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 10);
    card.add(bg);

    const title = this.scene.add.text(-boxW / 2 + 20, -boxH / 2 + 16, '✨ 天工附魔词条盘：', {
      fontFamily: UI_FONTS.primary,
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    card.add(title);

    const maxLock = ForgeRefineEngine.getMaxLockSlots(def.quality);
    const lockInfo = this.scene.add.text(boxW / 2 - 20, -boxH / 2 + 18, `(最多锁定 ${maxLock} 条)`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: '#90a4ae'
    }).setOrigin(1, 0);
    card.add(lockInfo);

    const affixes = item.affixes || [];
    const maxSlots = ForgeRefineEngine.getMaxAffixSlots(def.quality);
    const startAffixY = -boxH / 2 + 52;
    const rowH = 60;

    for (let i = 0; i < maxSlots; i++) {
      const affix = affixes[i];
      const ry = startAffixY + i * rowH;

      const rowBg = this.scene.add.graphics();
      rowBg.fillStyle(0x1a212c, 0.9);
      rowBg.fillRoundedRect(-boxW / 2 + 16, ry, boxW - 32, 50, 6);
      card.add(rowBg);

      if (affix) {
        const tmpl = AFFIX_TEMPLATES[affix.type];
        const tierColor = affix.tier === 'S' ? '#ffd700' : affix.tier === 'A' ? '#ba68c8' : affix.tier === 'B' ? '#4fc3f7' : '#aed581';
        const tierBadge = `[${affix.tier}阶]`;
        const descStr = tmpl ? tmpl.format(affix.value) : `+${affix.value}`;

        const affixNameText = this.scene.add.text(-boxW / 2 + 30, ry + 15, `${tierBadge} ${affix.name} · ${descStr}`, {
          fontFamily: UI_FONTS.primary,
          fontSize: '15px',
          color: tierColor,
          fontStyle: 'bold'
        });
        card.add(affixNameText);

        const isLocked = !!affix.isLocked;
        const lockBtnText = isLocked ? '🔒 [已锁]' : '🔓 [未锁]';
        const lockColor = isLocked ? '#ffd700' : '#78909c';
        const lockBtn = this.scene.add.text(boxW / 2 - 32, ry + 15, lockBtnText, {
          fontFamily: UI_FONTS.primary,
          fontSize: '14px',
          color: lockColor,
          fontStyle: isLocked ? 'bold' : 'normal'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        lockBtn.on('pointerdown', () => {
          const res = ForgeRefineEngine.toggleAffixLock(item, affix.id);
          if (res.success) {
            SoundManager.getInstance().playBronzeButtonClick();
            this.profileStorage.saveProfile(this.profile);
            this.renderRefineTab();
          } else {
            this.showFloatingNotice(res.error || '无法锁定', true);
          }
        });
        card.add(lockBtn);
      } else {
        const emptySlotText = this.scene.add.text(-boxW / 2 + 30, ry + 15, '— 未激活词条槽位 —', {
          fontFamily: UI_FONTS.primary,
          fontSize: '14px',
          color: '#546e7a'
        });
        card.add(emptySlotText);
      }
    }

    this.contentContainer.add(card);

    // 4. Pity & Cost Calculation
    const check = ForgeRefineEngine.canRefine(this.profile, item);
    const pityCount = item.refineCount || 0;
    const pityLeft = Math.max(0, 5 - pityCount);
    const pityMsg = pityCount >= 4
      ? `⚡ 天命已至！本次重铸必定保底出现 [S阶·天级] 词条！`
      : `🛡️ 洗炼保底：再重铸 ${pityLeft} 次必出 [S阶·天级] 词条 (当前: ${pityCount}/5)`;

    const pityText = this.scene.add.text(375, 685, pityMsg, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: pityCount >= 4 ? '#ffd54f' : '#90a4ae',
      fontStyle: pityCount >= 4 ? 'bold' : 'normal'
    }).setOrigin(0.5);
    this.contentContainer.add(pityText);

    const costText = this.scene.add.text(375, 715, `重铸消耗: ⛏️ ${check.cost} 玄铁 (已锁 ${check.lockedCount} 条)   |   当前存量: ${this.profile.currencies.iron ?? 0} 玄铁`, {
      fontFamily: UI_FONTS.primary,
      fontSize: '13px',
      color: check.canRefine ? '#80cbc4' : '#ef5350'
    }).setOrigin(0.5);
    this.contentContainer.add(costText);

    // 5. Refine Button
    const refineBtn = new BronzeButton(this.scene, {
      x: 375,
      y: 765,
      width: 260,
      height: 48,
      title: `✨ 天工洗炼 (消耗 ${check.cost} 玄铁)`,
      variant: check.canRefine ? 'red' : 'bronze',
      onClick: () => {
        const res = ForgeRefineEngine.refineItem(this.profile, item.uid);
        if (res.success) {
          this.profileStorage.saveProfile(this.profile);
          SoundManager.getInstance().playCannonBlast();
          this.createAnvilSparks(375, 530);
          const delta = res.scoreDelta ?? 0;
          const msg = res.pityTriggered
            ? '✨ 天命保底触发！天级S词条降临！'
            : (delta > 0 ? `✨ 洗炼大成！战力评分 +${delta}` : '✨ 洗炼完成！');
          this.showFloatingNotice(msg, false);
          this.updateCurrencyDisplay();
          this.renderRefineTab();
        } else {
          this.showFloatingNotice(res.error || '洗炼失败', true);
        }
      }
    });
    refineBtn.setEnabled(check.canRefine);
    this.contentContainer.add(refineBtn);

    // 6. Rules hint
    const hintText = this.scene.add.text(375, 825, '💡 提示：洗炼会重新随机未锁定的词条类型与数值，锁定的词条将完整保留。', {
      fontFamily: UI_FONTS.primary,
      fontSize: '12px',
      color: '#78909c'
    }).setOrigin(0.5);
    this.contentContainer.add(hintText);
  }

  private showFloatingNotice(msg: string, isError: boolean = false): void {
    const notice = this.scene.add.text(375, 500, msg, {
      fontFamily: UI_FONTS.primary,
      fontSize: '18px',
      color: isError ? '#ff5252' : '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(180);

    this.scene.tweens.add({
      targets: notice,
      y: 440,
      alpha: { from: 1, to: 0 },
      duration: 1300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        notice.destroy();
      }
    });
  }

  private createAnvilSparks(x: number, y: number): void {
    const numSparks = 20;
    for (let i = 0; i < numSparks; i++) {
      const angle = (i * Math.PI * 2) / numSparks + (Math.random() * 0.5 - 0.25);
      const dist = 60 + Math.random() * 100;
      const spark = this.scene.add.graphics().setDepth(180);
      spark.setPosition(x, y);
      spark.fillStyle(i % 2 === 0 ? 0xffd700 : 0xff5722, 1.0);
      spark.fillCircle(0, 0, 3 + Math.random() * 2);
      spark.fillStyle(0xffffff, 0.9);
      spark.fillCircle(0, 0, 1.5);

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: { from: 1.0, to: 0.0 },
        scale: { from: 1.0, to: 0.2 },
        duration: 380 + Math.random() * 260,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          spark.destroy();
        }
      });
    }
  }
}
