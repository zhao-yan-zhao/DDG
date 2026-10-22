/**
 * 《孤城神机营》- Weapon Info Popup / Card Detail Modal
 * Displays weapon attributes, star level, attack interval, damage, range, and evolution skills
 * on mobile single tap / click.
 */

import Phaser from 'phaser';
import { WeaponInstance } from '../../core/types';
import { WEAPON_CONFIGS } from '../../config/weapons.config';

export class WeaponInfoPopup extends Phaser.GameObjects.Container {
  private bgGraphics: Phaser.GameObjects.Graphics;
  private contentContainer: Phaser.GameObjects.Container;
  private closeBtnText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 375, 667); // Centered on 750x1334 screen
    this.setDepth(200);
    this.setVisible(false);

    // Dark modal overlay
    const backdrop = scene.add.rectangle(0, 0, 750, 1334, 0x000000, 0.65);
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => this.hide());
    this.add(backdrop);

    this.bgGraphics = scene.add.graphics();
    this.add(this.bgGraphics);

    this.contentContainer = scene.add.container(0, 0);
    this.add(this.contentContainer);

    this.closeBtnText = scene.add.text(190, -170, '✕', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#cfd8dc'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.closeBtnText.on('pointerdown', () => this.hide());
    this.add(this.closeBtnText);

    scene.add.existing(this);
  }

  public show(weapon: WeaponInstance): void {
    this.contentContainer.removeAll(true);
    this.setVisible(true);

    const w = 460;
    const h = 380;
    const x = -w / 2;
    const y = -h / 2;

    this.bgGraphics.clear();
    // Modal card background - dark bronze lacquer with gold filigree
    this.bgGraphics.fillStyle(0x1a1c23, 0.96);
    this.bgGraphics.fillRoundedRect(x, y, w, h, 14);

    this.bgGraphics.lineStyle(2.5, 0xd4af37, 0.9);
    this.bgGraphics.strokeRoundedRect(x, y, w, h, 14);

    // Inner bronze trim
    this.bgGraphics.lineStyle(1, 0x8d6e63, 0.5);
    this.bgGraphics.strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, 10);

    const cfg = WEAPON_CONFIGS[weapon.configId];
    const starTier = (cfg?.stars as any)?.[weapon.star];

    const weaponName = weapon.name || cfg?.name || weapon.configId;
    const starDisplay = '★'.repeat(weapon.star) + '☆'.repeat(4 - weapon.star);

    // Faction label colors
    let factionColor = '#ffb74d';
    let factionName = '神机';
    if (weapon.faction === 'fire') { factionColor = '#ff5722'; factionName = '天火营'; }
    else if (weapon.faction === 'mohist') { factionColor = '#00e5ff'; factionName = '墨家机变'; }
    else if (weapon.faction === 'fortress') { factionColor = '#ffb300'; factionName = '城防固守'; }
    else if (weapon.faction === 'qimen') { factionColor = '#ba68c8'; factionName = '奇门玄甲'; }

    // Header Title
    const title = this.scene.add.text(0, y + 36, weaponName, {
      fontFamily: 'serif, SimHei, sans-serif',
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Faction & Star info
    const subInfo = this.scene.add.text(0, y + 68, `【${factionName}】 ${starDisplay}`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: factionColor
    }).setOrigin(0.5);

    // Stats Grid
    const atkVal = weapon.baseAtk;
    const intervalVal = weapon.attackInterval ? `${weapon.attackInterval}s` : '0.0s';
    const rangeVal = weapon.range > 50 ? '全图' : `${weapon.range}m`;
    const footprintVal = `${weapon.footprint?.width || 1}×${weapon.footprint?.height || 1} 格`;

    let statsStr = `攻击力: ${atkVal}    攻速: ${intervalVal}\n射程: ${rangeVal}      占位: ${footprintVal}`;
    if (weapon.anchor.row === 0 || weapon.isFortressOnly) {
      const curHp = Math.round(weapon.currentHp ?? weapon.maxHp ?? 300);
      const maxHp = Math.round(weapon.maxHp ?? 300);
      const statusStr = weapon.isBroken ? ' (损坏维修中)' : ' (坚挺)';
      statsStr += `\n城防耐久: ${curHp} / ${maxHp}${statusStr}`;
    }

    const statsText = this.scene.add.text(0, y + 128, statsStr, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#e0e0e0',
      lineSpacing: 6,
      align: 'center'
    }).setOrigin(0.5);

    // Divider Line
    const dividerY = y + 185;
    const lineG = this.scene.add.graphics();
    lineG.lineStyle(1, 0x6d4c41, 0.7);
    lineG.lineBetween(x + 20, dividerY, x + w - 20, dividerY);

    // Skill / Evolution Description
    const skillName = starTier?.evolutionName ? `【${starTier.evolutionName}】` : '【特性效果】';
    const skillDesc = starTier?.description || '明代军械重工，破阵杀敌。';

    const skillTitle = this.scene.add.text(0, dividerY + 24, skillName, {
      fontFamily: 'serif, SimHei, sans-serif',
      fontSize: '16px',
      color: '#ffb74d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const descText = this.scene.add.text(0, dividerY + 70, skillDesc, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#b0bec5',
      wordWrap: { width: w - 50 },
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);

    // Mobile tap instruction tip
    const hintText = this.scene.add.text(0, y + h - 24, '长按拖拽卡牌上阵 / 点击任意处关闭', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#78909c'
    }).setOrigin(0.5);

    this.contentContainer.add([title, subInfo, statsText, lineG, skillTitle, descText, hintText]);
  }

  public hide(): void {
    this.setVisible(false);
  }
}
