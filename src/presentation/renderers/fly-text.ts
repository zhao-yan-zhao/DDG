/**
 * 《孤城神机营》- Floating Text (Damage Number & Reactions) Object Pool
 * High-performance batched floating damage numbers, calligraphy crits, and reaction labels.
 * Features:
 * - Gold calligraphy bouncy crit flytext (KaiTi font, #ffd700 fill, #7f0000 stroke thickness 4)
 * - Elastic spring bounce scale animation (1.8x -> 1.2x via Back.easeOut over 250ms, float 55px over 800ms)
 * - Emits 4~6 golden star sparkles bursting radially around crit origin
 * - Specialized styling presets for elemental reaction announcements
 */

import Phaser from 'phaser';

export type FloatingTextStyle = 'normal' | 'crit' | 'fire' | 'ice' | 'shock' | 'poison' | 'heal' | 'sunder';

export const STYLE_COLORS: Record<FloatingTextStyle, { color: string; stroke: string; size: string; fontFamily?: string }> = {
  normal: { color: '#ffffff', stroke: '#1a1a1a', size: '16px', fontFamily: 'sans-serif' },
  crit: { color: '#ffd700', stroke: '#7f0000', size: '24px', fontFamily: 'KaiTi, STKaiti, SimKai, "Songti SC", serif' },
  fire: { color: '#ff3d00', stroke: '#3e2723', size: '20px', fontFamily: 'sans-serif' },
  ice: { color: '#00e5ff', stroke: '#01579b', size: '20px', fontFamily: 'sans-serif' },
  shock: { color: '#ffff00', stroke: '#212121', size: '20px', fontFamily: 'sans-serif' },
  poison: { color: '#00e676', stroke: '#1b5e20', size: '20px', fontFamily: 'sans-serif' },
  heal: { color: '#69f0ae', stroke: '#1b5e20', size: '18px', fontFamily: 'sans-serif' },
  sunder: { color: '#ff1744', stroke: '#212121', size: '18px', fontFamily: 'sans-serif' }
};

export interface DamageCluster {
  targetId: string;
  startX: number;
  startY: number;
  totalDamage: number;
  hitCount: number;
  hasCrit: boolean;
  isBoss: boolean;
  style: FloatingTextStyle;
  windowEndTime: number;
  textObj: Phaser.GameObjects.Text;
  floatTween?: Phaser.Tweens.Tween;
  popTween?: Phaser.Tweens.Tween;
}

export class FloatingTextPool {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Text[] = [];
  private activeClusters: Map<string, DamageCluster> = new Map();
  public static readonly CLUSTER_WINDOW_MS = 150;

  constructor(scene: Phaser.Scene, initialCapacity: number = 30) {
    this.scene = scene;
    for (let i = 0; i < initialCapacity; i++) {
      const text = this.scene.add.text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        strokeThickness: 3
      }).setVisible(false).setDepth(40);
      this.pool.push(text);
    }
  }

  /**
   * Spawns general text or notification with anti-occlusion anchor (y - 42 for normal, y - 75 for boss).
   */
  public spawn(
    x: number,
    y: number,
    content: string,
    style: FloatingTextStyle = 'normal',
    isBoss: boolean = false
  ): void {
    let textObj = this.pool.find(t => !t.visible);
    if (!textObj) {
      textObj = this.scene.add.text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        strokeThickness: 3
      }).setDepth(40);
      this.pool.push(textObj);
    }

    const conf = STYLE_COLORS[style] || STYLE_COLORS.normal;
    // Sanitize any raw IEEE-754 decimal numbers leaking into floating text (e.g. "-45.337599999964" -> "-45")
    const sanitizedContent = typeof content === 'string'
      ? content.replace(/([+-]?\d+)\.\d+/g, '$1')
      : String(content);
    textObj.setText(sanitizedContent);
    textObj.setFontSize(conf.size);
    textObj.setColor(conf.color);
    const offsetY = isBoss ? 75 : 42;
    textObj.setPosition(x + (Math.random() * 20 - 10), y - offsetY);
    textObj.setAlpha(1.0);
    textObj.setVisible(true);

    if (style === 'crit') {
      textObj.setFontFamily(conf.fontFamily || 'KaiTi, STKaiti, SimKai, "Songti SC", serif');
      textObj.setStroke(conf.stroke, 4);
      textObj.setScale(1.8);

      // 1. Elastic spring bounce scale animation (1.8x down to 1.2x)
      this.scene.tweens.add({
        targets: textObj,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 250,
        ease: 'Back.easeOut'
      });

      // 2. Upward float & fade (55px over 800ms)
      this.scene.tweens.add({
        targets: textObj,
        y: textObj.y - 55,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          textObj.setVisible(false);
        }
      });

      // 3. Emits 4~6 golden star sparkles bursting radially around crit origin
      this.emitCritSparkles(x, y);
    } else {
      textObj.setFontFamily(conf.fontFamily || 'sans-serif');
      textObj.setStroke(conf.stroke, 3);
      textObj.setScale(1.0);

      this.scene.tweens.add({
        targets: textObj,
        y: textObj.y - 45,
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          textObj.setVisible(false);
        }
      });
    }
  }

  /**
   * Spawns damage text with 150ms per-entity window clustering, scale pop (1.25x),
   * crit promotion, and anti-occlusion anchor (y - 42 for normal, y - 75 for boss).
   */
  public spawnDamage(
    targetId: string,
    x: number,
    y: number,
    damage: number,
    isCrit: boolean = false,
    isBoss: boolean = false,
    style?: FloatingTextStyle
  ): void {
    const key = targetId || `${Math.round(x / 40)}_${Math.round(y / 40)}`;
    const now = Date.now();
    const existing = this.activeClusters.get(key);

    if (existing && now < existing.windowEndTime && existing.textObj && existing.textObj.visible) {
      // 1. Accumulate damage
      existing.totalDamage += damage;
      existing.hitCount++;
      if (isCrit) {
        existing.hasCrit = true;
        existing.style = 'crit';
      }
      existing.windowEndTime = now + FloatingTextPool.CLUSTER_WINDOW_MS;

      // 2. Update text content
      existing.textObj.setText(Math.round(existing.totalDamage).toString());

      // 3. Promote to crit visual style if any hit in cluster is a crit
      if (existing.hasCrit) {
        const conf = STYLE_COLORS.crit;
        existing.textObj.setFontFamily(conf.fontFamily || 'KaiTi, STKaiti, SimKai, "Songti SC", serif');
        existing.textObj.setColor(conf.color);
        existing.textObj.setStroke(conf.stroke, 4);
        existing.textObj.setFontSize(conf.size);
      }

      // 4. Pop scale to 1.25x briefly
      const baseScale = existing.hasCrit ? 1.2 : 1.0;
      existing.textObj.setScale(baseScale * 1.25);
      if (this.scene.tweens) {
        if (existing.popTween && (existing.popTween as any).stop) {
          existing.popTween.stop();
        }
        existing.popTween = this.scene.tweens.add({
          targets: existing.textObj,
          scaleX: baseScale,
          scaleY: baseScale,
          duration: 80,
          ease: 'Quad.easeOut'
        });
      }

      if (isCrit) {
        this.emitCritSparkles(x, y);
      }

      // 5. Extend float & fade tween
      if (this.scene.tweens) {
        if (existing.floatTween && (existing.floatTween as any).stop) {
          existing.floatTween.stop();
        }
        const floatDist = existing.hasCrit ? 55 : 45;
        const floatDuration = existing.hasCrit ? 800 : 700;
        existing.floatTween = this.scene.tweens.add({
          targets: existing.textObj,
          y: existing.startY - floatDist,
          alpha: 0,
          delay: FloatingTextPool.CLUSTER_WINDOW_MS,
          duration: floatDuration,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            existing.textObj.setVisible(false);
            if (this.activeClusters.get(key)?.textObj === existing.textObj) {
              this.activeClusters.delete(key);
            }
          }
        });
      }
      return;
    }

    // New cluster item
    let textObj = this.pool.find(t => !t.visible);
    if (!textObj) {
      textObj = this.scene.add.text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        strokeThickness: 3
      }).setDepth(40);
      this.pool.push(textObj);
    }

    const finalStyle = isCrit ? 'crit' : (style || 'normal');
    const conf = STYLE_COLORS[finalStyle] || STYLE_COLORS.normal;
    const anchorOffset = isBoss ? 75 : 42;
    const startY = y - anchorOffset;
    const startX = x + (Math.random() * 16 - 8);

    textObj.setText(Math.round(damage).toString());
    textObj.setFontSize(conf.size);
    textObj.setColor(conf.color);
    textObj.setFontFamily(conf.fontFamily || (finalStyle === 'crit' ? 'KaiTi, STKaiti, SimKai, "Songti SC", serif' : 'sans-serif'));
    textObj.setStroke(conf.stroke, finalStyle === 'crit' ? 4 : 3);
    textObj.setPosition(startX, startY);
    textObj.setAlpha(1.0);
    textObj.setVisible(true);

    const baseScale = finalStyle === 'crit' ? 1.2 : 1.0;
    textObj.setScale(baseScale * 1.25);

    let popTween: Phaser.Tweens.Tween | undefined;
    if (this.scene.tweens) {
      popTween = this.scene.tweens.add({
        targets: textObj,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: finalStyle === 'crit' ? 250 : 80,
        ease: finalStyle === 'crit' ? 'Back.easeOut' : 'Quad.easeOut'
      });
    }

    if (finalStyle === 'crit') {
      this.emitCritSparkles(x, y);
    }

    let floatTween: Phaser.Tweens.Tween | undefined;
    if (this.scene.tweens) {
      const floatDist = finalStyle === 'crit' ? 55 : 45;
      const floatDuration = finalStyle === 'crit' ? 800 : 700;
      floatTween = this.scene.tweens.add({
        targets: textObj,
        y: startY - floatDist,
        alpha: 0,
        delay: FloatingTextPool.CLUSTER_WINDOW_MS,
        duration: floatDuration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          textObj.setVisible(false);
          if (this.activeClusters.get(key)?.textObj === textObj) {
            this.activeClusters.delete(key);
          }
        }
      });
    }

    this.activeClusters.set(key, {
      targetId: key,
      startX,
      startY,
      totalDamage: damage,
      hitCount: 1,
      hasCrit: isCrit,
      isBoss,
      style: finalStyle,
      windowEndTime: now + FloatingTextPool.CLUSTER_WINDOW_MS,
      textObj,
      floatTween,
      popTween
    });
  }

  /**
   * Emits 5 golden star sparkles bursting radially around critical hit point.
   */
  private emitCritSparkles(x: number, y: number): void {
    const numSparkles = 5;
    for (let i = 0; i < numSparkles; i++) {
      const angle = (i * Math.PI * 2) / numSparkles + (Math.random() * 0.4 - 0.2);
      const dist = 22 + Math.random() * 16;
      const targetX = x + Math.cos(angle) * dist;
      const targetY = y + Math.sin(angle) * dist;

      const spark = this.scene.add.graphics().setDepth(45);
      spark.setPosition(x, y);
      spark.fillStyle(0xffd700, 1.0);
      spark.fillCircle(0, 0, 2.5);
      spark.fillStyle(0xffffff, 0.9);
      spark.fillCircle(0, 0, 1.2);

      this.scene.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => {
          spark.destroy();
        }
      });
    }
  }

  public getActiveCluster(key: string): DamageCluster | undefined {
    return this.activeClusters.get(key);
  }

  public getActiveClusterCount(): number {
    return this.activeClusters.size;
  }

  public clear(): void {
    for (const cluster of this.activeClusters.values()) {
      if (cluster.floatTween && (cluster.floatTween as any).stop) {
        cluster.floatTween.stop();
      }
      if (cluster.popTween && (cluster.popTween as any).stop) {
        cluster.popTween.stop();
      }
    }
    this.activeClusters.clear();
    for (const text of this.pool) {
      text.setVisible(false);
    }
  }

  public destroy(): void {
    this.clear();
    for (const text of this.pool) {
      text.destroy();
    }
    this.pool = [];
  }
}
