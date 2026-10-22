/**
 * 《孤城神机营》- FTUE Visual Guidance Overlay Scene
 * Renders non-blocking finger guidance, hint banner, and skip button.
 */

import Phaser from 'phaser';
import { BattleScene } from './battle-scene';
import { FTUEStep } from '../../core/ftue/ftue-manager';

export class FTUEOverlay extends Phaser.Scene {
  private battleScene!: BattleScene;
  private bannerContainer!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerDesc!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;
  private hintHand!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'FTUEOverlay' });
  }

  public create(): void {
    this.battleScene = this.scene.get('BattleScene') as BattleScene;

    this.createBanner();
    this.createHintHand();
    this.bindEvents();
    this.updatePrompt();
  }

  private createBanner(): void {
    this.bannerContainer = this.add.container(375, 80);
    this.bannerContainer.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a24, 0.9);
    bg.fillRoundedRect(-300, -35, 600, 70, 8);
    bg.lineStyle(2, 0xd4af37, 1);
    bg.strokeRoundedRect(-300, -35, 600, 70, 8);
    this.bannerContainer.add(bg);

    this.bannerText = this.add.text(0, -18, '', {
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.bannerContainer.add(this.bannerText);

    this.bannerDesc = this.add.text(0, 8, '', {
      fontSize: '14px',
      color: '#e0e0e0'
    }).setOrigin(0.5);
    this.bannerContainer.add(this.bannerDesc);

    // Skip FTUE Button
    this.skipButton = this.add.text(250, 0, '跳过', {
      fontSize: '14px',
      color: '#888888',
      backgroundColor: '#2b2b36',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.skipButton.on('pointerdown', () => {
      if (this.battleScene && this.battleScene.ftueManager) {
        this.battleScene.ftueManager.skipFTUE();
        this.bannerContainer.setVisible(false);
        this.hintHand.setVisible(false);
      }
    });
    this.bannerContainer.add(this.skipButton);
  }

  private createHintHand(): void {
    this.hintHand = this.add.graphics();
    this.hintHand.setDepth(99);
    this.hintHand.fillStyle(0xffeb3b, 0.85);
    this.hintHand.fillCircle(0, 0, 18);
    this.hintHand.lineStyle(3, 0xff9800, 1);
    this.hintHand.strokeCircle(0, 0, 18);
    this.hintHand.setVisible(false);
  }

  private bindEvents(): void {
    if (!this.battleScene) return;

    this.battleScene.events.on('ftueStepCompleted', () => {
      this.updatePrompt();
    });

    this.events.on('shutdown', () => {
      if (this.battleScene) {
        this.battleScene.events.off('ftueStepCompleted');
      }
    });
  }

  private updatePrompt(): void {
    if (!this.battleScene || !this.battleScene.ftueManager) return;
    const ftue = this.battleScene.ftueManager;
    const currentStep = ftue.getStep();

    if (currentStep === FTUEStep.COMPLETED || ftue.isCompleted()) {
      this.bannerContainer.setVisible(false);
      this.hintHand.setVisible(false);
      return;
    }

    const hint = ftue.getCurrentPrompt();
    if (!hint) {
      this.bannerContainer.setVisible(false);
      return;
    }

    this.bannerContainer.setVisible(true);
    this.bannerText.setText(hint.title);
    this.bannerDesc.setText(hint.description);
    this.skipButton.setVisible(hint.showSkipButton);

    // Position helper gesture
    this.tweens.killTweensOf(this.hintHand);
    if (hint.gestureHint && hint.gestureHint.from && hint.gestureHint.to) {
      this.hintHand.setVisible(true);
      const from = hint.gestureHint.from;
      const to = hint.gestureHint.to;
      this.hintHand.setPosition(from.screenX, from.screenY);

      this.tweens.add({
        targets: this.hintHand,
        x: to.screenX,
        y: to.screenY,
        alpha: { from: 1, to: 0.2 },
        duration: 1200,
        repeat: -1,
        ease: 'Cubic.easeInOut'
      });
    } else {
      this.hintHand.setVisible(false);
    }
  }
}
