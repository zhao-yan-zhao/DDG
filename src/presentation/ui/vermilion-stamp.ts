/**
 * 《孤城神机营》- Xuande Vermilion Seal Stamp Landing VFX Component
 * Animates a vermilion cinnabar seal dropping from 2.2x to 1.0x with Back.easeOut,
 * tilt correction from -8° to 0°, panel micro-shake (y+3px, 40ms yoyo),
 * ink splatter particle emission, and heavy impact audio.
 */

import Phaser from 'phaser';
import { SoundManager } from '../audio/sound-manager';
import { UI_COLORS } from './ui-theme';

export interface VermilionStampOptions {
  targetPanel?: Phaser.GameObjects.Components.Transform | Phaser.GameObjects.Container | Phaser.GameObjects.Graphics;
  targetDepth?: number;
  finalScale?: number;
  onComplete?: (stamp: Phaser.GameObjects.Image) => void;
}

export class VermilionStamp {
  /**
   * Spawns an authentic Xuande vermilion seal with dropping, tilt-correction,
   * panel micro-shake, ink splatter particles, and audio feedback.
   */
  public static stampAt(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stampKey: string,
    options?: VermilionStampOptions
  ): Phaser.GameObjects.Image {
    const finalScale = options?.finalScale ?? 1.0;
    const depth = options?.targetDepth ?? 160;

    const stamp = scene.add.image(x, y, stampKey)
      .setScale(finalScale * 2.2)
      .setAngle(-8)
      .setAlpha(0)
      .setDepth(depth);

    scene.tweens.add({
      targets: stamp,
      scale: finalScale,
      angle: 0,
      alpha: 0.98,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 1. Audio impact thud
        SoundManager.getInstance().playVermilionStamp();

        // 2. Micro-shake target panel
        if (options?.targetPanel && 'y' in options.targetPanel) {
          const panel = options.targetPanel as any;
          const origY = panel.y;
          scene.tweens.add({
            targets: panel,
            y: origY + 3,
            duration: 40,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              panel.y = origY;
            }
          });
        }

        // 3. Emit ink splatter particles
        this.emitInkSplatter(scene, x, y, depth - 1);

        // 4. Callback
        options?.onComplete?.(stamp);
      }
    });

    return stamp;
  }

  private static emitInkSplatter(scene: Phaser.Scene, x: number, y: number, depth: number): void {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const distance = 25 + Math.random() * 35;
      const p = scene.add.circle(
        x + Math.cos(angle) * 10,
        y + Math.sin(angle) * 10,
        1.5 + Math.random() * 1.5,
        UI_COLORS.vermilionCinnabarNum,
        0.9
      ).setDepth(depth);

      scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.4,
        duration: 220 + Math.random() * 60,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          p.destroy();
        }
      });
    }
  }
}
