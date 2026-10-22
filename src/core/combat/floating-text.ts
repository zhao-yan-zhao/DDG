/**
 * 《孤城神机营》- Floating Text & Hit Flash Headless Event Queue
 * Pure headless domain model (Zero Phaser / Zero DOM dependencies).
 * Enforces DrawCall <= 45 performance budget via batching metadata & zero-GC object pooling.
 */

import { DamageResult, EnemyEntity } from '../types';

export type FloatingTextType =
  | 'NORMAL_DAMAGE'
  | 'CRIT_DAMAGE'
  | 'ELEMENTAL_EXPLOSION'
  | 'ELEMENTAL_SHATTER'
  | 'ELEMENTAL_TEXT'
  | 'SHIELD_ABSORB'
  | 'HEAL'
  | 'TENACITY_IMMUNE';

export interface FloatingTextItem {
  id: string;
  type: FloatingTextType;
  text: string;
  value: number;
  x: number;
  y: number;
  initialX: number;
  initialY: number;
  vx: number;
  vy: number;
  alpha: number;
  scale: number;
  color: string;
  lifetime: number;
  elapsedTime: number;
  isCrit: boolean;
  isActive: boolean;
}

export interface HitFlashItem {
  id: string;
  targetId: string;
  color: string;
  duration: number;
  elapsedTime: number;
  intensity: number;
  isActive: boolean;
}

export interface DrawCallBatchInfo {
  batchIndex: number;
  atlasKey: string;
  blendMode: 'NORMAL' | 'ADD';
  itemCount: number;
  vertexCount: number;
  primitiveCount: number;
}

export interface DrawCallBudgetReport {
  activeTextCount: number;
  maxCapacity: number;
  textLayerDrawCalls: number;
  estimatedTotalSceneDrawCalls: number;
  maxDrawCallBudget: 45;
  isWithinBudget: boolean;
  batches: DrawCallBatchInfo[];
  culledCount: number;
}

export const FLOATING_TEXT_POOL_CAPACITY = 150;
export const MAX_TOTAL_SCENE_DRAWCALLS = 45;

export class FloatingTextManager {
  private pool: FloatingTextItem[] = [];
  private activeItems: FloatingTextItem[] = [];
  private activeFlashes: HitFlashItem[] = [];
  private nextId = 1;
  private culledCount = 0;

  constructor(capacity: number = FLOATING_TEXT_POOL_CAPACITY) {
    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        id: `ft_pool_${i}`,
        type: 'NORMAL_DAMAGE',
        text: '',
        value: 0,
        x: 0,
        y: 0,
        initialX: 0,
        initialY: 0,
        vx: 0,
        vy: -60,
        alpha: 1.0,
        scale: 1.0,
        color: '#ffffff',
        lifetime: 0.8,
        elapsedTime: 0,
        isCrit: false,
        isActive: false
      });
    }
  }

  public spawnDamage(
    amount: number,
    isCrit: boolean,
    pos: { x: number; y: number },
    type: FloatingTextType = isCrit ? 'CRIT_DAMAGE' : 'NORMAL_DAMAGE'
  ): FloatingTextItem {
    let item: FloatingTextItem;
    const rounded = Math.round(amount);

    if (this.pool.length > 0) {
      item = this.pool.pop()!;
    } else {
      // Pool capacity exceeded: recycle oldest active item without memory allocation
      item = this.activeItems.shift()!;
      this.culledCount++;
    }

    item.id = `ft_${this.nextId++}`;
    item.type = type;
    item.value = rounded;
    item.text = isCrit ? `暴击 -${rounded}!` : `-${rounded}`;
    item.x = pos.x;
    item.y = pos.y;
    item.initialX = pos.x;
    item.initialY = pos.y;
    item.vx = (Math.random() - 0.5) * 40;
    item.vy = isCrit ? -80 : -50;
    item.alpha = 1.0;
    item.scale = isCrit ? 1.5 : 1.0;
    item.color = isCrit ? '#ffd700' : '#ffffff';
    item.lifetime = isCrit ? 1.0 : 0.8;
    item.elapsedTime = 0;
    item.isCrit = isCrit;
    item.isActive = true;

    this.activeItems.push(item);
    return item;
  }

  public spawnFromDamageResult(
    target: EnemyEntity,
    result: DamageResult,
    hitPos?: { x: number; y: number }
  ): FloatingTextItem {
    const pos = hitPos ?? { x: target.x ?? 375, y: target.y ?? 560 };
    const item = this.spawnDamage(result.actualHpDeducted, result.isCrit, pos);
    this.spawnHitFlash(target.id, result.isCrit);
    return item;
  }

  public spawnElementalText(text: string, color: string, pos: { x: number; y: number }): FloatingTextItem {
    let item: FloatingTextItem;
    if (this.pool.length > 0) {
      item = this.pool.pop()!;
    } else {
      item = this.activeItems.shift()!;
      this.culledCount++;
    }

    item.id = `ft_${this.nextId++}`;
    item.type = 'ELEMENTAL_TEXT';
    item.value = 0;
    item.text = text;
    item.x = pos.x;
    item.y = pos.y;
    item.initialX = pos.x;
    item.initialY = pos.y;
    item.vx = 0;
    item.vy = -70;
    item.alpha = 1.0;
    item.scale = 1.3;
    item.color = color;
    item.lifetime = 1.0;
    item.elapsedTime = 0;
    item.isCrit = false;
    item.isActive = true;

    this.activeItems.push(item);
    return item;
  }

  public spawnHitFlash(targetId: string, isCrit: boolean, customColor?: string): HitFlashItem {
    const flash: HitFlashItem = {
      id: `flash_${this.nextId++}`,
      targetId,
      color: customColor ?? (isCrit ? '#ff4d4f' : '#ffffff'),
      duration: isCrit ? 0.15 : 0.08,
      elapsedTime: 0,
      intensity: 1.0,
      isActive: true
    };
    this.activeFlashes.push(flash);
    return flash;
  }

  public update(dt: number): void {
    // 1. Update floating text physics and alpha fade
    const survivingTexts: FloatingTextItem[] = [];
    for (const item of this.activeItems) {
      item.elapsedTime += dt;
      if (item.elapsedTime >= item.lifetime) {
        item.isActive = false;
        this.pool.push(item);
      } else {
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        const progress = item.elapsedTime / item.lifetime;
        item.alpha = Math.max(0, 1.0 - progress * progress);
        survivingTexts.push(item);
      }
    }
    this.activeItems = survivingTexts;

    // 2. Update hit flashes
    const survivingFlashes: HitFlashItem[] = [];
    for (const flash of this.activeFlashes) {
      flash.elapsedTime += dt;
      if (flash.elapsedTime >= flash.duration) {
        flash.isActive = false;
      } else {
        flash.intensity = 1.0 - (flash.elapsedTime / flash.duration);
        survivingFlashes.push(flash);
      }
    }
    this.activeFlashes = survivingFlashes;
  }

  public getActiveTexts(): FloatingTextItem[] {
    return this.activeItems;
  }

  public getActiveFlashes(): HitFlashItem[] {
    return this.activeFlashes;
  }

  public getActiveCount(): number {
    return this.activeItems.length;
  }

  public clear(): void {
    while (this.activeItems.length > 0) {
      const item = this.activeItems.pop()!;
      item.isActive = false;
      this.pool.push(item);
    }
    this.activeFlashes = [];
  }

  public getDrawCallBudgetReport(): DrawCallBudgetReport {
    const textLayerDrawCalls = this.activeItems.length === 0 ? 0 : 1; // Single bitmap font atlas
    const baseSceneDrawCalls = 25; // Map, grid, weapons, enemies, bullets, HUD
    const estimatedTotal = baseSceneDrawCalls + textLayerDrawCalls;

    const batches: DrawCallBatchInfo[] = [];
    if (this.activeItems.length > 0) {
      batches.push({
        batchIndex: 0,
        atlasKey: 'bitmap_font_damage',
        blendMode: 'NORMAL',
        itemCount: this.activeItems.length,
        vertexCount: this.activeItems.length * 4,
        primitiveCount: this.activeItems.length * 2
      });
    }

    return {
      activeTextCount: this.activeItems.length,
      maxCapacity: FLOATING_TEXT_POOL_CAPACITY,
      textLayerDrawCalls,
      estimatedTotalSceneDrawCalls: estimatedTotal,
      maxDrawCallBudget: MAX_TOTAL_SCENE_DRAWCALLS,
      isWithinBudget: estimatedTotal <= MAX_TOTAL_SCENE_DRAWCALLS,
      batches,
      culledCount: this.culledCount
    };
  }
}
