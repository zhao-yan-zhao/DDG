/**
 * 《孤城神机营》- 60s FTUE Choreography State Machine
 * Implements GDD V3.0 §1.2:
 * - 4-step sequence: Step 1 (MERGE_FIRE_LANCE), Step 2 (AUTO_MOW_INFANTRY), Step 3 (PICK_THREE_VOLLEY_DECREE), Step 4 (ALIGN_ROW_SYNERGY)
 * - Strict input guards and action validation
 * - Veteran skip (skipFTUE) and persistent storage adapter
 * - Screen and grid coordinate hints for presentation layer
 *
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { GridPosition, WeaponInstance } from '../types';
import { GridModel } from '../grid/grid-model';

export enum FTUEStep {
  NOT_STARTED = 'NOT_STARTED',
  STEP_1_MERGE_FIRE_LANCE = 'MERGE_FIRE_LANCE',
  STEP_2_AUTO_MOW_INFANTRY = 'AUTO_MOW_INFANTRY',
  STEP_3_PICK_THREE_VOLLEY_DECREE = 'PICK_THREE_VOLLEY_DECREE',
  STEP_4_ALIGN_ROW_SYNERGY = 'ALIGN_ROW_SYNERGY',
  COMPLETED = 'COMPLETED'
}

export interface FTUEPromptHint {
  step: FTUEStep;
  title: string;
  description: string;
  allowPlayerInteraction: boolean;
  showSkipButton: boolean;
  highlightArea?: {
    type: 'grid_cell' | 'grid_range' | 'shop_slot' | 'decree_card' | 'none';
    gridCells?: GridPosition[];
    slotIndices?: number[];
    cardId?: string;
  };
  gestureHint?: {
    type: 'drag' | 'tap' | 'none';
    from?: { row: number; col: number; screenX: number; screenY: number };
    to?: { row: number; col: number; screenX: number; screenY: number };
  };
}

export interface IStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorageAdapter implements IStorageAdapter {
  private data = new Map<string, string>();
  public getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  public setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  public removeItem(key: string): void {
    this.data.delete(key);
  }
}

export const FTUE_STORAGE_KEY = 'gucheng_ftue_completed';

export class FTUEManager {
  private currentStep: FTUEStep = FTUEStep.NOT_STARTED;
  private storage: IStorageAdapter;

  constructor(storage?: IStorageAdapter) {
    this.storage = storage ?? new MemoryStorageAdapter();
    if (this.isCompleted()) {
      this.currentStep = FTUEStep.COMPLETED;
    } else {
      this.currentStep = FTUEStep.STEP_1_MERGE_FIRE_LANCE;
    }
  }

  public getStep(): FTUEStep {
    return this.currentStep;
  }

  public isCompleted(): boolean {
    return this.storage.getItem(FTUE_STORAGE_KEY) === 'true';
  }

  public skipFTUE(): void {
    this.currentStep = FTUEStep.COMPLETED;
    this.storage.setItem(FTUE_STORAGE_KEY, 'true');
  }

  public reset(): void {
    this.storage.removeItem(FTUE_STORAGE_KEY);
    this.currentStep = FTUEStep.STEP_1_MERGE_FIRE_LANCE;
  }

  /**
   * Action validation guard for player operations.
   */
  public isActionPermitted(actionType: 'DRAG' | 'TAP_DECREE' | 'BUY_SHOP', payload?: any): boolean {
    if (this.currentStep === FTUEStep.COMPLETED) {
      return true;
    }

    if (this.currentStep === FTUEStep.STEP_1_MERGE_FIRE_LANCE) {
      if (actionType !== 'DRAG') {
        return false;
      }
      const { from, to } = payload || {};
      const isFromLance1 = (from?.row === 2 && from?.col === 1 && to?.row === 2 && to?.col === 2);
      const isFromLance2 = (from?.row === 2 && from?.col === 2 && to?.row === 2 && to?.col === 1);
      return Boolean(isFromLance1 || isFromLance2);
    }

    if (this.currentStep === FTUEStep.STEP_2_AUTO_MOW_INFANTRY) {
      return false; // Hands-off spectator mode
    }

    if (this.currentStep === FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE) {
      if (actionType !== 'TAP_DECREE') {
        return false;
      }
      return payload?.cardId === 'T11' || payload?.cardId === 'three_volley_tactic';
    }

    if (this.currentStep === FTUEStep.STEP_4_ALIGN_ROW_SYNERGY) {
      return true; // Allow shopping and placement on row
    }

    return true;
  }

  public onMergeCompleted(_targetAnchor: GridPosition, mergedWeapon: WeaponInstance): boolean {
    if (this.currentStep !== FTUEStep.STEP_1_MERGE_FIRE_LANCE) {
      return false;
    }
    if (mergedWeapon.configId === 'fire_lance' && mergedWeapon.star >= 2) {
      this.currentStep = FTUEStep.STEP_2_AUTO_MOW_INFANTRY;
      return true;
    }
    return false;
  }

  public onWaveCleared(waveNumber: number): boolean {
    if (this.currentStep === FTUEStep.STEP_2_AUTO_MOW_INFANTRY && waveNumber === 1) {
      this.currentStep = FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE;
      return true;
    }
    if (this.currentStep === FTUEStep.STEP_4_ALIGN_ROW_SYNERGY && waveNumber === 2) {
      this.currentStep = FTUEStep.COMPLETED;
      this.storage.setItem(FTUE_STORAGE_KEY, 'true');
      return true;
    }
    return false;
  }

  public onDecreePicked(cardId: string): boolean {
    if (this.currentStep !== FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE) {
      return false;
    }
    if (cardId === 'T11' || cardId === 'three_volley_tactic') {
      this.currentStep = FTUEStep.STEP_4_ALIGN_ROW_SYNERGY;
      return true;
    }
    return false;
  }

  public onRowSynergyChecked(grid: GridModel, targetRow: number = 2): boolean {
    if (this.currentStep !== FTUEStep.STEP_4_ALIGN_ROW_SYNERGY) {
      return false;
    }
    const weaponsOnRow = grid.getAllWeapons().filter(w => w.anchor.row === targetRow && w.faction === 'fire');
    if (weaponsOnRow.length >= 3) {
      return true;
    }
    return false;
  }

  public getCurrentPrompt(): FTUEPromptHint {
    switch (this.currentStep) {
      case FTUEStep.STEP_1_MERGE_FIRE_LANCE:
        return {
          step: FTUEStep.STEP_1_MERGE_FIRE_LANCE,
          title: '二合一升星',
          description: '拖拽神机火铳重叠，合成 ★2 火器！',
          allowPlayerInteraction: true,
          showSkipButton: true,
          highlightArea: {
            type: 'grid_cell',
            gridCells: [{ row: 2, col: 1 }, { row: 2, col: 2 }]
          },
          gestureHint: {
            type: 'drag',
            from: { row: 2, col: 1, screenX: 299, screenY: 510 },
            to: { row: 2, col: 2, screenX: 375, screenY: 510 }
          }
        };
      case FTUEStep.STEP_2_AUTO_MOW_INFANTRY:
        return {
          step: FTUEStep.STEP_2_AUTO_MOW_INFANTRY,
          title: '全自动御敌',
          description: '火器全自动齐射割草，静候大捷！',
          allowPlayerInteraction: false,
          showSkipButton: true
        };
      case FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE:
        return {
          step: FTUEStep.STEP_3_PICK_THREE_VOLLEY_DECREE,
          title: '兵法质变',
          description: '请选取兵法《三段击阵法》，同排火器攻速激增！',
          allowPlayerInteraction: true,
          showSkipButton: true,
          highlightArea: {
            type: 'decree_card',
            cardId: 'T11'
          },
          gestureHint: {
            type: 'tap'
          }
        };
      case FTUEStep.STEP_4_ALIGN_ROW_SYNERGY:
        return {
          step: FTUEStep.STEP_4_ALIGN_ROW_SYNERGY,
          title: '排兵布阵',
          description: '购买火铳并排于同一横排，点亮三段击金色连线！',
          allowPlayerInteraction: true,
          showSkipButton: true,
          highlightArea: {
            type: 'grid_range',
            gridCells: [{ row: 2, col: 0 }, { row: 2, col: 4 }]
          },
          gestureHint: {
            type: 'drag'
          }
        };
      case FTUEStep.COMPLETED:
      default:
        return {
          step: FTUEStep.COMPLETED,
          title: '指引完成',
          description: '将军已通晓军机，请自由布阵守城！',
          allowPlayerInteraction: true,
          showSkipButton: false
        };
    }
  }
}
