/**
 * 《孤城神机营》- Commander Ultimate Drag-Aiming & Target Area Indicator
 * 
 * Provides interactive visual feedback when dragging the commander ultimate button:
 * - Trajectory beam / firing cone from castle battlement to target point.
 * - Commander-specific tactical targeting reticles (AOE circle, crosshair, corridor, barrier).
 * - Real-time enemy lock-on indicators within target radius.
 * - Seamless cancellation zone detection at bottom control bar.
 */

import Phaser from 'phaser';

export interface AimTargetPoint {
  x: number;
  y: number;
  isCancel: boolean;
}

export class UltimateAimIndicator {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private trajectoryGfx: Phaser.GameObjects.Graphics;
  private reticleGfx: Phaser.GameObjects.Graphics;
  private lockOnGfx: Phaser.GameObjects.Graphics;
  
  private labelContainer: Phaser.GameObjects.Container;
  private labelBg: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private subLabelText: Phaser.GameObjects.Text;

  private cancelBanner: Phaser.GameObjects.Container;
  private cancelBannerBg: Phaser.GameObjects.Graphics;
  private cancelBannerText: Phaser.GameObjects.Text;

  private isActive: boolean = false;
  private cmdId: string = 'wang_shouren';
  private currentX: number = 375;
  private currentY: number = 800;
  private isCancel: boolean = false;
  private animTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(78).setVisible(false);

    this.trajectoryGfx = scene.add.graphics();
    this.reticleGfx = scene.add.graphics();
    this.lockOnGfx = scene.add.graphics();
    this.container.add([this.trajectoryGfx, this.reticleGfx, this.lockOnGfx]);

    // Target information badge
    this.labelContainer = scene.add.container(0, 0);
    this.labelBg = scene.add.graphics();
    this.labelText = scene.add.text(0, -12, '', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.subLabelText = scene.add.text(0, 10, '', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#ffd54f'
    }).setOrigin(0.5);
    this.labelContainer.add([this.labelBg, this.labelText, this.subLabelText]);
    this.container.add(this.labelContainer);

    // Cancel warning banner at bottom
    this.cancelBanner = scene.add.container(375, 1260);
    this.cancelBannerBg = scene.add.graphics();
    this.cancelBannerBg.fillStyle(0xd32f2f, 0.9);
    this.cancelBannerBg.fillRoundedRect(-140, -20, 280, 40, 8);
    this.cancelBannerBg.lineStyle(2, 0xffcdd2, 1.0);
    this.cancelBannerBg.strokeRoundedRect(-140, -20, 280, 40, 8);
    this.cancelBannerText = scene.add.text(0, 0, '✖ 松开取消释放 ✖', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.cancelBanner.add([this.cancelBannerBg, this.cancelBannerText]);
    this.cancelBanner.setVisible(false);
    this.container.add(this.cancelBanner);
  }

  public show(cmdId: string, x: number, y: number): void {
    this.cmdId = cmdId;
    this.currentX = x;
    this.currentY = y;
    this.isActive = true;
    this.isCancel = false;
    this.animTimer = 0;
    this.container.setVisible(true);
    this.updateVisuals([]);
  }

  public updatePosition(x: number, y: number, isCancel: boolean, targetedEnemies: { x: number; y: number }[] = []): void {
    this.currentX = x;
    this.currentY = y;
    this.isCancel = isCancel;
    this.updateVisuals(targetedEnemies);
  }

  public update(dt: number, targetedEnemies: { x: number; y: number }[] = []): void {
    if (!this.isActive) return;
    this.animTimer += dt;
    this.updateVisuals(targetedEnemies);
  }

  public hide(): void {
    this.isActive = false;
    this.container.setVisible(false);
    this.trajectoryGfx.clear();
    this.reticleGfx.clear();
    this.lockOnGfx.clear();
  }

  public destroy(): void {
    this.hide();
    this.container.destroy();
  }

  private updateVisuals(targetedEnemies: { x: number; y: number }[]): void {
    this.trajectoryGfx.clear();
    this.reticleGfx.clear();
    this.lockOnGfx.clear();

    const startX = 375;
    const startY = 540; // Castle battlement wall line
    const targetX = Math.max(60, Math.min(690, this.currentX));
    const targetY = Math.max(540, Math.min(1220, this.currentY));

    if (this.isCancel) {
      // Draw cancel state
      this.cancelBanner.setVisible(true);
      this.labelContainer.setVisible(false);

      this.trajectoryGfx.lineStyle(2, 0xd32f2f, 0.45);
      this.trajectoryGfx.lineBetween(startX, startY, this.currentX, this.currentY);

      this.reticleGfx.lineStyle(2, 0xd32f2f, 0.5);
      this.reticleGfx.strokeCircle(this.currentX, this.currentY, 40);
      this.reticleGfx.lineBetween(this.currentX - 25, this.currentY - 25, this.currentX + 25, this.currentY + 25);
      this.reticleGfx.lineBetween(this.currentX + 25, this.currentY - 25, this.currentX - 25, this.currentY + 25);
      return;
    }

    this.cancelBanner.setVisible(false);
    this.labelContainer.setVisible(true);

    const pulse = Math.sin(this.animTimer * 6) * 0.15 + 0.85;

    switch (this.cmdId) {
      case 'liu_bowen':
        this.renderLiuBowenAim(startX, startY, targetX, targetY, pulse);
        break;
      case 'qin_liangyu':
        this.renderQinLiangyuAim(startX, startY, targetX, targetY, pulse);
        break;
      case 'qin_huali':
        this.renderQinHualiAim(startX, startY, targetX, targetY, pulse);
        break;
      case 'wang_shouren':
      default:
        this.renderWangShourenAim(startX, startY, targetX, targetY, pulse);
        break;
    }

    // Render lock-on reticles for targeted enemies
    this.renderLockOnTargets(targetedEnemies);

    // Position label badge above reticle
    const badgeY = Math.max(580, targetY - 150);
    this.labelContainer.setPosition(targetX, badgeY);
  }

  /**
   * 1. 刘伯温：奇门遁甲·天雷九烈
   * 苍蓝八卦聚雷阵，九曜太极法纹，旋转雷芒
   */
  private renderLiuBowenAim(startX: number, startY: number, targetX: number, targetY: number, pulse: number): void {
    // Electric trajectory beam with jagged lightning offsets
    this.trajectoryGfx.lineStyle(2.5, 0x00e5ff, 0.85 * pulse);
    this.trajectoryGfx.beginPath();
    this.trajectoryGfx.moveTo(startX, startY);
    const steps = 6;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const lx = startX + (targetX - startX) * t + (Math.sin(this.animTimer * 20 + i) * 8);
      const ly = startY + (targetY - startY) * t;
      this.trajectoryGfx.lineTo(lx, ly);
    }
    this.trajectoryGfx.lineTo(targetX, targetY);
    this.trajectoryGfx.strokePath();

    const radius = 140;

    // Outer Bagua circular aura
    this.reticleGfx.fillStyle(0x00e5ff, 0.12 * pulse);
    this.reticleGfx.fillCircle(targetX, targetY, radius);

    this.reticleGfx.lineStyle(2.5, 0x00e5ff, 0.95);
    this.reticleGfx.strokeCircle(targetX, targetY, radius);

    this.reticleGfx.lineStyle(1.5, 0xba68c8, 0.85);
    this.reticleGfx.strokeCircle(targetX, targetY, radius * 0.72);

    // 8 Bagua trigram markers
    const rot = this.animTimer * 1.5;
    for (let a = 0; a < 8; a++) {
      const angle = rot + (a * Math.PI) / 4;
      const x1 = targetX + Math.cos(angle) * (radius - 12);
      const y1 = targetY + Math.sin(angle) * (radius - 12);
      const x2 = targetX + Math.cos(angle) * (radius + 6);
      const y2 = targetY + Math.sin(angle) * (radius + 6);
      this.reticleGfx.lineStyle(2, 0xffd54f, 0.9);
      this.reticleGfx.lineBetween(x1, y1, x2, y2);
    }

    // Inner rotating lightning spark
    this.reticleGfx.lineStyle(3, 0xffffff, 0.95);
    this.reticleGfx.lineBetween(targetX - 16, targetY, targetX + 16, targetY);
    this.reticleGfx.lineBetween(targetX, targetY - 16, targetX, targetY + 16);

    // Update label text
    this.labelText.setText('【九曜苍雷打击区】');
    this.subLabelText.setText('覆盖 2.0m 集中雷暴 · 附加感电');
    this.drawLabelPill(180, 50, 0x4a148c);
  }

  /**
   * 2. 王守仁：知行合一·万炮齐发
   * 金色准星、火炮弹幕集火夹角、扇形辐射
   */
  private renderWangShourenAim(startX: number, startY: number, targetX: number, targetY: number, pulse: number): void {
    // Golden converging firing cone from castle battlement
    this.trajectoryGfx.lineStyle(1.8, 0xffd700, 0.75 * pulse);
    this.trajectoryGfx.lineBetween(startX - 120, startY, targetX - 50, targetY);
    this.trajectoryGfx.lineBetween(startX + 120, startY, targetX + 50, targetY);
    this.trajectoryGfx.lineStyle(2.5, 0xffea00, 0.9 * pulse);
    this.trajectoryGfx.lineBetween(startX, startY, targetX, targetY);

    const radius = 120;

    // Semi-transparent impact zone
    this.reticleGfx.fillStyle(0xffd700, 0.15 * pulse);
    this.reticleGfx.fillCircle(targetX, targetY, radius);

    this.reticleGfx.lineStyle(2.5, 0xffd700, 0.95);
    this.reticleGfx.strokeCircle(targetX, targetY, radius);

    // 4 Corner artillery crosshair brackets
    const bSize = 22;
    this.reticleGfx.lineStyle(3, 0xff9100, 1.0);
    // Top-left
    this.reticleGfx.lineBetween(targetX - radius, targetY - radius + bSize, targetX - radius, targetY - radius);
    this.reticleGfx.lineBetween(targetX - radius, targetY - radius, targetX - radius + bSize, targetY - radius);
    // Top-right
    this.reticleGfx.lineBetween(targetX + radius, targetY - radius + bSize, targetX + radius, targetY - radius);
    this.reticleGfx.lineBetween(targetX + radius, targetY - radius, targetX + radius - bSize, targetY - radius);
    // Bottom-left
    this.reticleGfx.lineBetween(targetX - radius, targetY + radius - bSize, targetX - radius, targetY + radius);
    this.reticleGfx.lineBetween(targetX - radius, targetY + radius, targetX - radius + bSize, targetY + radius);
    // Bottom-right
    this.reticleGfx.lineBetween(targetX + radius, targetY + radius - bSize, targetX + radius, targetY + radius);
    this.reticleGfx.lineBetween(targetX + radius, targetY + radius, targetX + radius - bSize, targetY + radius);

    // Center crosshair
    this.reticleGfx.lineStyle(2, 0xff3d00, 0.9);
    this.reticleGfx.strokeCircle(targetX, targetY, 20);
    this.reticleGfx.lineBetween(targetX - 30, targetY, targetX + 30, targetY);
    this.reticleGfx.lineBetween(targetX, targetY - 30, targetX, targetY + 30);

    // Update label text
    this.labelText.setText('【万炮齐发轰炸点】');
    this.subLabelText.setText('重炮集火轰炸 400 伤害 · 全军重置装填');
    this.drawLabelPill(200, 50, 0xe65100);
  }

  /**
   * 3. 秦良玉：铁骑勤王·八面合围
   * 白杆战马冲锋走廊，向下推进箭头
   */
  private renderQinLiangyuAim(_startX: number, startY: number, targetX: number, targetY: number, pulse: number): void {
    const corridorW = 240;
    const leftX = Math.max(30, targetX - corridorW * 0.5);
    const rightX = Math.min(720, targetX + corridorW * 0.5);

    // Charging corridor shaded box
    this.trajectoryGfx.fillStyle(0xff8f00, 0.12 * pulse);
    this.trajectoryGfx.fillRect(leftX, startY, corridorW, 1220 - startY);

    // Corridor side guide rails
    this.trajectoryGfx.lineStyle(2.5, 0xffb300, 0.85);
    this.trajectoryGfx.lineBetween(leftX, startY, leftX, 1220);
    this.trajectoryGfx.lineBetween(rightX, startY, rightX, 1220);

    // Animated downward chevron arrows
    const offset = (this.animTimer * 180) % 70;
    this.reticleGfx.lineStyle(3, 0xffffff, 0.85 * pulse);
    for (let cy = startY + offset; cy <= 1200; cy += 70) {
      this.reticleGfx.beginPath();
      this.reticleGfx.moveTo(targetX - 45, cy);
      this.reticleGfx.lineTo(targetX, cy + 25);
      this.reticleGfx.lineTo(targetX + 45, cy);
      this.reticleGfx.strokePath();
    }

    // Focal breach point marker
    this.reticleGfx.fillStyle(0xd50000, 0.9);
    this.reticleGfx.fillTriangle(targetX, targetY + 30, targetX - 30, targetY - 15, targetX + 30, targetY - 15);
    this.reticleGfx.lineStyle(2, 0xffd700, 1.0);
    this.reticleGfx.strokeTriangle(targetX, targetY + 30, targetX - 30, targetY - 15, targetX + 30, targetY - 15);

    // Update label text
    this.labelText.setText('【白杆铁骑冲锋走廊】');
    this.subLabelText.setText('8列骑兵纵向贯穿 · 击退 3.5m 破阵');
    this.drawLabelPill(200, 50, 0x880e4f);
  }

  /**
   * 4. 禽滑厘：兼爱非攻·铁壁天幕
   * 墨家青金铁幕投射区与机关脉冲
   */
  private renderQinHualiAim(_startX: number, _startY: number, targetX: number, targetY: number, pulse: number): void {
    if (targetY <= 600) {
      // Wall defense mode
      this.trajectoryGfx.fillStyle(0x00e5ff, 0.28 * pulse);
      this.trajectoryGfx.fillRect(0, 538, 750, 32);
      this.trajectoryGfx.lineStyle(2.5, 0xffd700, 0.95);
      this.trajectoryGfx.strokeRect(0, 538, 750, 32);

      this.labelText.setText('【兼爱非攻·城防铁幕】');
      this.subLabelText.setText('吸收 2000 伤害 · 反弹 100% 近战');
      this.drawLabelPill(200, 50, 0x006064);
    } else {
      // Battlefield kinetic shockwave mode
      const radius = 150;
      this.reticleGfx.fillStyle(0x26a69a, 0.16 * pulse);
      this.reticleGfx.fillCircle(targetX, targetY, radius);

      this.reticleGfx.lineStyle(2.5, 0x00e5ff, 0.95);
      this.reticleGfx.strokeCircle(targetX, targetY, radius);

      // Expanding kinetic pulse ring
      const pulseR = (radius * 0.3) + ((this.animTimer * 120) % (radius * 0.7));
      this.reticleGfx.lineStyle(1.8, 0xffd700, 0.7);
      this.reticleGfx.strokeCircle(targetX, targetY, pulseR);

      this.labelText.setText('【墨门机关震荡波】');
      this.subLabelText.setText('击退 2.0m · 减速 40% 持续 4秒');
      this.drawLabelPill(190, 50, 0x004d40);
    }
  }

  /**
   * Draws lock-on reticles for enemies caught within targeting radius
   */
  private renderLockOnTargets(targetedEnemies: { x: number; y: number }[]): void {
    if (!targetedEnemies || targetedEnemies.length === 0) return;

    this.lockOnGfx.lineStyle(1.8, 0xff1744, 0.95);
    for (const enemy of targetedEnemies) {
      const ex = enemy.x;
      const ey = enemy.y;
      const s = 14;

      // Red target diamond
      this.lockOnGfx.strokeRect(ex - s, ey - s, s * 2, s * 2);
      this.lockOnGfx.fillStyle(0xff1744, 0.85);
      this.lockOnGfx.fillCircle(ex, ey, 3);
    }
  }

  private drawLabelPill(w: number, h: number, tintColor: number): void {
    this.labelBg.clear();
    this.labelBg.fillStyle(tintColor, 0.88);
    this.labelBg.fillRoundedRect(-w * 0.5, -h * 0.5, w, h, 8);
    this.labelBg.lineStyle(1.5, 0xffd54f, 0.95);
    this.labelBg.strokeRoundedRect(-w * 0.5, -h * 0.5, w, h, 8);
  }
}
