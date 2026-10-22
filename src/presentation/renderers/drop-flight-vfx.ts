/**
 * 《孤城神机营》- Drop Item Arc Flight & Top HUD Absorption Animation Manager
 * Features:
 * - 20-token pre-allocated pool (zero runtime allocation)
 * - 3-phase physics animation:
 *   1. Ground pop scatter (±15px, 120ms Quad.easeOut)
 *   2. Quadratic Bezier trajectory flight to Top HUD Silver (248, 24+topOffset) (400~550ms Cubic.easeIn)
 *   3. Arrival absorption: gentle HUD scale punch (1.25x -> 1.0x), throttled coin jingle (60ms), token recycling
 */

import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../ui/ui-theme';
import { PlatformBridge } from '../../bridge/platform';
import { SoundManager } from '../audio/sound-manager';

export interface DropTokenItem {
  view: any;
  inUse: boolean;
  tween?: Phaser.Tweens.Tween;
}

export class DropFlightManager {
  private scene: Phaser.Scene;
  private pool: DropTokenItem[] = [];
  private static readonly MAX_POOL_CAPACITY = 20;
  private lastCoinSoundTime: number = 0;
  private static readonly SOUND_THROTTLE_MS = 60;
  private oldestTokenIndex: number = 0;

  constructor(scene: Phaser.Scene, initialCapacity: number = 20) {
    this.scene = scene;
    const capacity = Math.min(initialCapacity, DropFlightManager.MAX_POOL_CAPACITY);
    for (let i = 0; i < capacity; i++) {
      this.pool.push(this.createToken());
    }
  }

  private createToken(): DropTokenItem {
    const hasCoinTexture = this.scene.textures &&
      typeof this.scene.textures.exists === 'function' &&
      this.scene.textures.exists(UI_TEXTURE_KEYS.ICON_COIN_TONGBAO);

    let view: any;
    if (hasCoinTexture && this.scene.add?.image) {
      view = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.ICON_COIN_TONGBAO)
        .setDisplaySize(20, 20)
        .setDepth(65)
        .setVisible(false);
    } else if (this.scene.add?.graphics) {
      view = this.scene.add.graphics().setDepth(65).setVisible(false);
      view.fillStyle(0xffd700, 1.0);
      view.fillCircle(0, 0, 8);
      view.fillStyle(0xffeb3b, 1.0);
      view.fillCircle(0, 0, 4);
    } else {
      view = {
        x: 0,
        y: 0,
        visible: false,
        setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
        setVisible(v: boolean) { this.visible = v; return this; },
        setScale() { return this; },
        setAlpha() { return this; },
        setDepth() { return this; },
        destroy() {}
      };
    }

    return {
      view,
      inUse: false
    };
  }

  private getTargetPosition(): { x: number; y: number } {
    let topOffset = 0;
    try {
      const platform = PlatformBridge.getPlatform();
      if (platform && typeof platform.getSafeAreaInsets === 'function') {
        topOffset = platform.getSafeAreaInsets().top || 0;
      }
    } catch {
      topOffset = 0;
    }
    return {
      x: 248,
      y: 24 + topOffset
    };
  }

  /**
   * Spawns flying silver coin tokens from defeat position to HUD silver slot.
   */
  public spawnDropFlight(originX: number, originY: number, dropSilver: number = 1): void {
    if (dropSilver <= 0 || this.pool.length === 0) return;

    const tokenCount = dropSilver >= 16 ? 4 : (dropSilver >= 4 ? 2 : 1);
    const target = this.getTargetPosition();

    for (let i = 0; i < tokenCount; i++) {
      let token = this.pool.find(t => !t.inUse);
      if (!token) {
        // Recycle the oldest token in use via circular round-robin FIFO pointer
        token = this.pool[this.oldestTokenIndex % this.pool.length];
        this.oldestTokenIndex++;
        if (token.tween && (token.tween as any).stop) {
          token.tween.stop();
        }
      }

      token.inUse = true;
      const isLastToken = (i === tokenCount - 1);
      this.animateToken(token, originX, originY, target.x, target.y, dropSilver, isLastToken, i * 40);
    }
  }

  private animateToken(
    token: DropTokenItem,
    originX: number,
    originY: number,
    targetX: number,
    targetY: number,
    dropSilver: number,
    isLastToken: boolean,
    startDelay: number
  ): void {
    // Phase 1: Ground burst/scatter (±15px displacement, 120ms)
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 9;
    const scatterX = originX + Math.cos(angle) * dist;
    const scatterY = originY + Math.sin(angle) * dist;

    token.view.setPosition(originX, originY);
    if ((token.view as any).setScale) (token.view as any).setScale(0.6);
    if ((token.view as any).setAlpha) (token.view as any).setAlpha(1.0);
    token.view.setVisible(true);

    if (!this.scene.tweens) {
      // Immediate completion in headless environments
      this.completeArrival(token, targetX, targetY, dropSilver, isLastToken);
      return;
    }

    token.tween = this.scene.tweens.add({
      targets: token.view,
      x: scatterX,
      y: scatterY,
      scaleX: 1.0,
      scaleY: 1.0,
      delay: startDelay,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.launchPhase2(token, scatterX, scatterY, targetX, targetY, dropSilver, isLastToken);
      }
    });
  }

  private launchPhase2(
    token: DropTokenItem,
    scatterX: number,
    scatterY: number,
    targetX: number,
    targetY: number,
    dropSilver: number,
    isLastToken: boolean
  ): void {
    if (!this.scene.tweens) {
      this.completeArrival(token, targetX, targetY, dropSilver, isLastToken);
      return;
    }

    // Phase 2: Quadratic Bezier trajectory flight (400~550ms)
    const midX = (scatterX + targetX) / 2;
    const sideSign = scatterX < targetX ? -1 : 1;
    const cpX = midX + sideSign * (35 + Math.random() * 35);
    const cpY = Math.min(scatterY, targetY) - (35 + Math.random() * 35);
    const duration = 460;

    const proxy = { t: 0 };
    token.tween = this.scene.tweens.add({
      targets: proxy,
      t: 1.0,
      duration,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        const t = proxy.t;
        const invT = 1 - t;
        const curX = invT * invT * scatterX + 2 * invT * t * cpX + t * t * targetX;
        const curY = invT * invT * scatterY + 2 * invT * t * cpY + t * t * targetY;
        token.view.setPosition(curX, curY);
        if ((token.view as any).setRotation) {
          (token.view as any).setRotation(((token.view as any).rotation || 0) + 0.15);
        }
      },
      onComplete: () => {
        this.completeArrival(token, targetX, targetY, dropSilver, isLastToken);
      }
    });
  }

  private completeArrival(
    token: DropTokenItem,
    targetX: number,
    targetY: number,
    dropSilver: number,
    isLastToken: boolean
  ): void {
    // Phase 3: Arrival absorption
    token.view.setVisible(false);
    token.inUse = false;

    // 1. Arrival burst sparkles
    this.emitArrivalBurst(targetX, targetY);

    // 2. Throttled coin jingle sound
    this.playThrottledCoinSound();

    // 3. Gentle scale punch on HUD target
    this.triggerHudScalePunch();

    // 4. Emit currency absorbed event
    if (this.scene.events) {
      this.scene.events.emit('currencyAbsorbed', { amount: dropSilver, isLast: isLastToken });
    }
  }

  private emitArrivalBurst(x: number, y: number): void {
    if (!this.scene.add?.graphics || !this.scene.tweens) return;
    try {
      const spark = this.scene.add.graphics().setDepth(66);
      spark.setPosition(x, y);
      spark.fillStyle(0xffd700, 0.9);
      spark.fillCircle(0, 0, 7);
      spark.fillStyle(0xffffff, 0.9);
      spark.fillCircle(0, 0, 3.5);

      this.scene.tweens.add({
        targets: spark,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 150,
        ease: 'Quad.easeOut',
        onComplete: () => {
          spark.destroy();
        }
      });
    } catch {
      // Safe fallback
    }
  }

  private playThrottledCoinSound(): void {
    const now = Date.now();
    if (now - this.lastCoinSoundTime >= DropFlightManager.SOUND_THROTTLE_MS) {
      this.lastCoinSoundTime = now;
      try {
        SoundManager.getInstance().playCoinJingle();
      } catch {
        // Safe fallback in test environments
      }
    }
  }

  private triggerHudScalePunch(): void {
    try {
      const uiScene = this.scene.scene?.get('UIScene') as any;
      if (uiScene) {
        const hudItem = uiScene.silverIcon || uiScene.silverText;
        if (hudItem && uiScene.tweens) {
          uiScene.tweens.add({
            targets: hudItem,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 70,
            yoyo: true,
            ease: 'Quad.easeOut'
          });
        }
      }
    } catch {
      // Safe fallback
    }
  }

  public update(_delta: number, _time: number): void {
    // Drop tokens animated via tweens; hook preserved for future frame-based logic
  }

  public getInUseCount(): number {
    return this.pool.filter(t => t.inUse).length;
  }

  public getPoolCapacity(): number {
    return this.pool.length;
  }

  public clear(): void {
    for (const token of this.pool) {
      if (token.tween && (token.tween as any).stop) {
        token.tween.stop();
      }
      if (token.view && typeof token.view.setVisible === 'function') {
        token.view.setVisible(false);
      }
      token.inUse = false;
    }
    this.oldestTokenIndex = 0;
  }

  public destroy(): void {
    this.clear();
    for (const token of this.pool) {
      if (token.view && typeof token.view.destroy === 'function') {
        token.view.destroy();
      }
    }
    this.pool = [];
    this.oldestTokenIndex = 0;
  }
}
