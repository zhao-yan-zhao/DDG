/**
 * 《孤城神机营》- Defeat Advisor & Strategic Root-Cause Analyzer
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 * Analyzes combat telemetry upon defeat and generates tailored, actionable military advice.
 */

export interface DefeatAnalysisContext {
  stageId: number;
  waveReached: number;
  totalWaves: number;
  wallMaxHp: number;
  wallRemainingHp: number;
  weaponsOnField: Array<{
    type: string;
    star: number;
    faction?: string;
  }>;
  tacticsCount?: number;
  commanderId?: string;
  commanderRage?: number;
  revivesUsed?: number;
  isBossWave?: boolean;
  bossName?: string;
}

export type DefeatCause =
  | 'early_defense_lacking'
  | 'boss_overwhelmed'
  | 'heavy_armor_blocked'
  | 'rage_unused'
  | 'low_star_weapons'
  | 'general_overrun';

export interface DefeatAdvice {
  primaryCause: DefeatCause;
  title: string;
  analysis: string;
  tacticalTip: string;
  recommendedWeaponType?: string;
  recommendedFaction?: string;
}

export class DefeatAdvisor {
  /**
   * Evaluates combat telemetry at defeat time and produces structured military counsel.
   */
  public static analyze(context: DefeatAnalysisContext): DefeatAdvice {
    const {
      waveReached,
      totalWaves,
      weaponsOnField,
      commanderRage = 0,
      isBossWave = false,
      bossName
    } = context;

    const maxStar = weaponsOnField.length > 0
      ? Math.max(...weaponsOnField.map(w => w.star))
      : 1;

    // 1. Boss wave collapse
    if (isBossWave || waveReached >= totalWaves) {
      if (commanderRage >= 90) {
        return {
          primaryCause: 'rage_unused',
          title: '绝技未发·贻误战机',
          analysis: `守关重敌【${bossName || '首领'}】亲临城下时，主帅怒气已充盈却未释放大招！`,
          tacticalTip: '首领进犯破门威胁极大，进入 Boss 波后请密切关注底栏怒气，第一时间施展主帅终极绝技清屏控场！',
          recommendedFaction: 'firearm'
        };
      }

      return {
        primaryCause: 'boss_overwhelmed',
        title: '首领强袭·城垣失陷',
        analysis: `守关强敌【${bossName || '首领'}】拥有超强攻城破门能力，单体爆发力极高。`,
        tacticalTip: '建议在 Row 0 前排落子部署【滚木礌石】等城防工事吸引火力，后排集中升星高星火炮与巨弩集火弱点！',
        recommendedWeaponType: 'heavy_crossbow',
        recommendedFaction: 'mohist'
      };
    }

    // 2. Early wave collapse (Waves 1~3)
    if (waveReached <= 3) {
      if (weaponsOnField.length <= 2) {
        return {
          primaryCause: 'early_defense_lacking',
          title: '阵地空虚·军备未充',
          analysis: '战局初期防线兵力过少，未能及时抵挡首批流寇冲阵。',
          tacticalTip: '开局获得军饷后，请立即点击右下角【军备工坊】添购器械，迅速将沙盘防线铺满！',
          recommendedWeaponType: 'fire_lance',
          recommendedFaction: 'firearm'
        };
      }

      if (maxStar === 1) {
        return {
          primaryCause: 'low_star_weapons',
          title: '未及升星·威力受限',
          analysis: '场上皆为 ★1 基础器械，伤害输出与攻击范围受限。',
          tacticalTip: '两个同名、同星级的器械可拖拽重叠触发【二合一升星】，升星不仅属性质变，更能解锁强力特技！',
          recommendedWeaponType: 'fire_lance'
        };
      }
    }

    // 3. Mid-late waves: Heavy armor check
    const hasArmorPiercer = weaponsOnField.some(w =>
      w.type === 'heavy_crossbow' ||
      w.type === 'iron_flail' ||
      w.type === 'thunder_chariot' ||
      w.type === 'bed_crossbow'
    );

    if (!hasArmorPiercer) {
      return {
        primaryCause: 'heavy_armor_blocked',
        title: '铁甲难破·箭弹受阻',
        analysis: '中后期敌军重装步兵与铁骑护甲高耸，常规轻型弹道伤害被护甲严重折减。',
        tacticalTip: '建议配备具有穿透破甲特性的【机关巨弩】或【床弩】，或触发【猛火轰爆】/【碎冰崩裂】元素反应瓦解敌阵！',
        recommendedWeaponType: 'heavy_crossbow',
        recommendedFaction: 'mohist'
      };
    }

    // 4. General fallback
    return {
      primaryCause: 'general_overrun',
      title: '阵型散乱·防线被凿',
      analysis: '敌军多路分批冲锋突破城门，局部防线输出脱节。',
      tacticalTip: '善用【相邻连携】与【同行同列阵营羁绊】，将同派系器械并排布防，可激活强力伤害与攻速光环！',
      recommendedFaction: 'military'
    };
  }
}
