/**
 * 《孤城神机营》- Projectile & Ballistics Visual Renderer
 * Renders flying projectiles, parabolic mortar arcs, muzzle flashes, and explosion effects.
 */

import Phaser from 'phaser';
import { ProjectileState } from '../../core/types';

export class ProjectileViewManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private activeProjectiles: Map<string, ProjectileState> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = this.scene.add.graphics().setDepth(30);
  }

  public addProjectile(proj: ProjectileState): void {
    this.activeProjectiles.set(proj.id, proj);
  }

  public removeProjectile(id: string): void {
    this.activeProjectiles.delete(id);
  }

  public clearAll(): void {
    this.activeProjectiles.clear();
    this.graphics.clear();
  }

  public updateProjectiles(deltaSec: number): void {
    this.graphics.clear();

    const toRemove: string[] = [];

    for (const [id, proj] of this.activeProjectiles.entries()) {
      proj.elapsedTime += deltaSec;
      proj.progress = Math.min(1.0, proj.elapsedTime / Math.max(0.05, proj.travelTime));

      // Calculate linear current position
      proj.currentX = proj.startX + (proj.targetX - proj.startX) * proj.progress;
      proj.currentY = proj.startY + (proj.targetY - proj.startY) * proj.progress;

      // Calculate high-arc visual offset: peak at progress = 0.5
      let arcOffset = 0;
      if (proj.isHighArc) {
        const peak = proj.arcHeight || 80;
        arcOffset = peak * 4 * proj.progress * (1 - proj.progress);
      }
      proj.visualY = proj.currentY - arcOffset;

      // Draw projectile body
      this.drawProjectile(proj);

      if (proj.progress >= 1.0) {
        toRemove.push(id);
        this.playImpactEffect(proj.targetX, proj.targetY, proj.aoeRadius);
      }
    }

    for (const id of toRemove) {
      this.activeProjectiles.delete(id);
    }
  }

  private drawProjectile(proj: ProjectileState): void {
    const g = this.graphics;

    // Glowing core
    if (proj.isHighArc) {
      // Mortar shell / boulder
      g.fillStyle(0xff7043, 1.0);
      g.fillCircle(proj.currentX, proj.visualY, 6);
      g.fillStyle(0xffeb3b, 0.8);
      g.fillCircle(proj.currentX, proj.visualY, 3);
    } else {
      // Fire bullet / arrow
      g.lineStyle(3, 0xffca28, 1.0);
      const angle = Math.atan2(proj.targetY - proj.startY, proj.targetX - proj.startX);
      const tailX = proj.currentX - Math.cos(angle) * 12;
      const tailY = proj.visualY - Math.sin(angle) * 12;
      g.lineBetween(tailX, tailY, proj.currentX, proj.visualY);

      g.fillStyle(0xffffff, 1.0);
      g.fillCircle(proj.currentX, proj.visualY, 3);
    }
  }

  public playImpactEffect(x: number, y: number, aoeRadius?: number): void {
    const targetRadius = (aoeRadius || 1.0) * 40;
    const baseRadius = 5;

    // Draw brief expanding impact shockwave circle centered in-place at (x, y)
    const shockwave = this.scene.add.graphics().setDepth(35);
    shockwave.setPosition(x, y);
    shockwave.lineStyle(3, 0xffab00, 1.0);
    shockwave.strokeCircle(0, 0, baseRadius);

    this.scene.tweens.add({
      targets: shockwave,
      alpha: 0,
      scaleX: targetRadius / baseRadius,
      scaleY: targetRadius / baseRadius,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        shockwave.destroy();
      }
    });
  }

  public playMuzzleFlash(x: number, y: number, angle?: number): void {
    // 1. Bright 4-point starburst diamond flash
    const flash = this.scene.add.graphics().setDepth(34);
    flash.setPosition(x, y);

    // Outer warm glow
    flash.fillStyle(0xffa000, 0.85);
    flash.beginPath();
    flash.moveTo(0, -14);
    flash.lineTo(3, -3);
    flash.lineTo(14, 0);
    flash.lineTo(3, 3);
    flash.lineTo(0, 14);
    flash.lineTo(-3, 3);
    flash.lineTo(-14, 0);
    flash.lineTo(-3, -3);
    flash.closePath();
    flash.fillPath();

    // Inner bright white-yellow core
    flash.fillStyle(0xfff59d, 1.0);
    flash.beginPath();
    flash.moveTo(0, -8);
    flash.lineTo(2, -2);
    flash.lineTo(8, 0);
    flash.lineTo(2, 2);
    flash.lineTo(0, 8);
    flash.lineTo(-2, 2);
    flash.lineTo(-8, 0);
    flash.lineTo(-2, -2);
    flash.closePath();
    flash.fillPath();

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy();
      }
    });

    // 2. Backward drifting gunpowder smoke puff
    const backAngle = angle !== undefined ? angle + Math.PI : Math.PI / 2;
    const startSmokeX = x + Math.cos(backAngle) * 6;
    const startSmokeY = y + Math.sin(backAngle) * 6;
    const endSmokeX = x + Math.cos(backAngle) * 22;
    const endSmokeY = y + Math.sin(backAngle) * 22;

    const smoke = this.scene.add.graphics().setDepth(33);
    smoke.setPosition(startSmokeX, startSmokeY);
    smoke.fillStyle(0x90a4ae, 0.75);
    smoke.fillCircle(0, 0, 5);

    this.scene.tweens.add({
      targets: smoke,
      x: endSmokeX,
      y: endSmokeY,
      alpha: 0,
      scaleX: 2.4,
      scaleY: 2.4,
      duration: 280,
      ease: 'Sine.easeOut',
      onComplete: () => {
        smoke.destroy();
      }
    });
  }
}
