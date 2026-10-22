/**
 * 《孤城神机营》- 3D Cast Bronze Relief Interactive Button
 * Features a procedural NineSlice cast bronze plate, breathing golden aura,
 * tactile 2px pressed displacement, and sound feedback.
 */

import Phaser from 'phaser';
import { SoundManager } from '../audio/sound-manager';
import { UI_COLORS, UI_FONTS, UI_TEXTURE_KEYS, NINESLICE_PRESETS } from './ui-theme';

export interface BronzeButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  title: string;
  subtitle?: string;
  icon?: string;
  variant?: 'bronze' | 'red';
  enableGlow?: boolean;
  onClick?: () => void;
}

export class BronzeButton extends Phaser.GameObjects.Container {
  private bgNineSlice: Phaser.GameObjects.NineSlice;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private contentContainer: Phaser.GameObjects.Container;
  private titleText: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;
  private iconImage?: Phaser.GameObjects.Image;
  private glowTween?: Phaser.Tweens.Tween;

  private defaultTextureKey: string;
  private btnWidth: number;
  private btnHeight: number;
  private isEnabled = true;

  constructor(scene: Phaser.Scene, config: BronzeButtonConfig) {
    super(scene, config.x, config.y);

    this.btnWidth = config.width ?? NINESLICE_PRESETS.BUTTON_BRONZE.width;
    this.btnHeight = config.height ?? NINESLICE_PRESETS.BUTTON_BRONZE.height;
    this.defaultTextureKey =
      config.variant === 'red'
        ? UI_TEXTURE_KEYS.BTN_BRONZE_RED
        : UI_TEXTURE_KEYS.BTN_BRONZE_NORMAL;

    // 1. Bottom Breathing Gold Aura Glow
    this.glowGraphics = scene.add.graphics();
    this.drawGlow(0.3);
    this.add(this.glowGraphics);

    if (config.enableGlow) {
      this.startBreathingGlow();
    } else {
      this.glowGraphics.setVisible(false);
    }

    // 2. NineSlice Cast Bronze Background
    const margins = NINESLICE_PRESETS.BUTTON_BRONZE;
    this.bgNineSlice = scene.add.nineslice(
      0,
      0,
      this.defaultTextureKey,
      undefined,
      this.btnWidth,
      this.btnHeight,
      margins.leftWidth,
      margins.rightWidth,
      margins.topHeight,
      margins.bottomHeight
    );
    this.add(this.bgNineSlice);

    // 3. Content Container (displaced 2px on press)
    this.contentContainer = scene.add.container(0, 0);
    this.add(this.contentContainer);

    const hasSub = !!config.subtitle;
    const titleY = hasSub ? -9 : 0;

    // Optional Leading Icon
    if (config.icon) {
      this.iconImage = scene.add.image(-this.btnWidth / 2 + 32, 0, config.icon);
      this.iconImage.setDisplaySize(32, 32);
      this.contentContainer.add(this.iconImage);
    }

    // Title Text
    this.titleText = scene.add.text(0, titleY, config.title, {
      fontFamily: UI_FONTS.primary,
      fontSize: hasSub ? '20px' : '22px',
      color: UI_COLORS.goldBright,
      fontStyle: 'bold',
      stroke: '#2c1e13',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.contentContainer.add(this.titleText);

    // Subtitle Text
    if (hasSub && config.subtitle) {
      this.subtitleText = scene.add.text(0, 14, config.subtitle, {
        fontFamily: UI_FONTS.primary,
        fontSize: '13px',
        color: '#d7ccc8'
      }).setOrigin(0.5);
      this.contentContainer.add(this.subtitleText);
    }

    // 4. Interactive Hitbox & Pointer Handlers
    this.setSize(this.btnWidth, this.btnHeight);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => {
      if (!this.isEnabled) return;
      this.bgNineSlice.setTexture(UI_TEXTURE_KEYS.BTN_BRONZE_HOVER);
      this.glowGraphics.setVisible(true);
      this.titleText.setColor('#ffffff');
    });

    this.on('pointerout', () => {
      if (!this.isEnabled) return;
      this.bgNineSlice.setTexture(this.defaultTextureKey);
      if (!config.enableGlow) {
        this.glowGraphics.setVisible(false);
      }
      this.titleText.setColor(UI_COLORS.goldBright);
      this.contentContainer.y = 0;
    });

    this.on('pointerdown', () => {
      if (!this.isEnabled) return;
      this.bgNineSlice.setTexture(UI_TEXTURE_KEYS.BTN_BRONZE_PRESSED);
      this.contentContainer.y = 2;
      SoundManager.getInstance().resume();
      SoundManager.getInstance().playBronzeButtonClick();
    });

    this.on('pointerup', () => {
      if (!this.isEnabled) return;
      this.bgNineSlice.setTexture(this.defaultTextureKey);
      this.contentContainer.y = 0;
      if (config.onClick) {
        config.onClick();
      }
    });

    scene.add.existing(this);
  }

  private drawGlow(alpha: number): void {
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(UI_COLORS.goldBrightNum, alpha);
    this.glowGraphics.fillRoundedRect(
      -this.btnWidth / 2 - 4,
      -this.btnHeight / 2 - 4,
      this.btnWidth + 8,
      this.btnHeight + 8,
      12
    );
  }

  public startBreathingGlow(): void {
    this.glowGraphics.setVisible(true);
    if (this.glowTween) this.glowTween.stop();

    this.glowTween = this.scene.tweens.add({
      targets: this.glowGraphics,
      alpha: { from: 0.25, to: 0.75 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  public stopBreathingGlow(): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = undefined;
    }
    this.glowGraphics.setVisible(false);
  }

  public setTitle(title: string): this {
    this.titleText.setText(title);
    return this;
  }

  public setSubtitle(sub: string): this {
    if (this.subtitleText) {
      this.subtitleText.setText(sub);
    }
    return this;
  }

  public setEnabled(enabled: boolean): this {
    this.isEnabled = enabled;
    this.setAlpha(enabled ? 1.0 : 0.5);
    if (this.input) {
      this.input.enabled = enabled;
    }
    if (!enabled) {
      this.stopBreathingGlow();
    }
    return this;
  }

  public override destroy(fromScene?: boolean): void {
    this.stopBreathingGlow();
    super.destroy(fromScene);
  }
}
