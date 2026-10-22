/**
 * 《孤城神机营》- Boss Drop Engine (首领专属掉落引擎)
 * Handles deterministic and probability-based drop calculation for blueprints and rare components.
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 */

import { BossDropResult, ComponentDefinition } from './types';
import { COMPONENT_DEFINITIONS } from './forge-config';

export class BossDropEngine {
  /**
   * Stage to Boss Component blueprint mapping
   */
  private static readonly STAGE_BOSS_COMPONENTS: Record<number, string> = {
    4: 'boss_bear_barrel',     // Ch1 Boss: 铁塔熊王
    8: 'boss_xuanwu_chassis',   // Ch2 Boss: 玄武巨舰
    12: 'boss_khan_receiver',   // Ch3 Boss: 金帐可汗
    16: 'boss_corpse_fuze',     // Ch4 Boss: 万蛊尸魔
    20: 'boss_taotie_fuze'      // Ch5 Boss: 饕餮攻城机
  };

  /**
   * Evaluates campaign stage drop upon victory.
   */
  public static evaluateCampaignBossDrop(
    stageId: number,
    isFirstClear: boolean,
    rollRandom: number = Math.random()
  ): BossDropResult | null {
    const compId = this.STAGE_BOSS_COMPONENTS[stageId];
    if (!compId) {
      // Non-boss stage: no special boss drop
      return null;
    }

    const componentDef = COMPONENT_DEFINITIONS[compId];

    if (isFirstClear) {
      // First clear: Guaranteed generous drop
      const blueprints = stageId >= 16 ? 3 : stageId >= 8 ? 2 : 1;
      const iron = stageId * 5 + 20;
      return {
        blueprints,
        iron,
        componentDropped: componentDef,
        isFirstClearBonus: true,
        message: `首破据点首领！缴获 ${componentDef?.name || '神机'} 图纸与稀有辎重！`
      };
    }

    // Repeat clear: 40% drop rate for blueprints
    const dropRate = 0.40;
    if (rollRandom <= dropRate) {
      const blueprints = stageId >= 12 ? 2 : 1;
      const iron = 15 + Math.floor(stageId * 2);
      return {
        blueprints,
        iron,
        componentDropped: componentDef,
        isFirstClearBonus: false,
        message: `力克据点首领！缴获【神机图纸】卷轴！`
      };
    }

    // Missed blueprint drop, still awards minor iron bonus
    return {
      blueprints: 0,
      iron: 10,
      isFirstClearBonus: false,
      message: `击退守关首领，缴获常规军备辎重。`
    };
  }

  /**
   * Evaluates endless mode boss drop (triggered every 5 waves).
   */
  public static evaluateEndlessBossDrop(
    waveIndex: number,
    rollRandom: number = Math.random()
  ): BossDropResult | null {
    if (waveIndex <= 0 || waveIndex % 5 !== 0) {
      return null;
    }

    // 50% drop rate, but wave >= 20 is guaranteed
    const dropRate = waveIndex >= 20 ? 1.0 : 0.50;
    if (rollRandom <= dropRate) {
      // Pick cycling boss component
      const bossKeys = Object.keys(this.STAGE_BOSS_COMPONENTS);
      const idx = (Math.floor(waveIndex / 5) - 1) % bossKeys.length;
      const stageKey = Number(bossKeys[idx]);
      const compId = this.STAGE_BOSS_COMPONENTS[stageKey];
      const componentDef = COMPONENT_DEFINITIONS[compId];

      const blueprints = waveIndex >= 25 ? 3 : waveIndex >= 15 ? 2 : 1;
      const iron = 20 + Math.floor(waveIndex * 3);

      return {
        blueprints,
        iron,
        componentDropped: componentDef,
        isFirstClearBonus: false,
        message: `演武荡平第 ${waveIndex} 波大首领！缴获【${componentDef?.name || '神机'}图纸】！`
      };
    }

    return {
      blueprints: 0,
      iron: 15 + Math.floor(waveIndex * 1.5),
      isFirstClearBonus: false,
      message: `击溃演武第 ${waveIndex} 波首领，斩获前线辎重。`
    };
  }
}
