/**
 * 《孤城神机营》- Four Grand Commanders Configuration
 * Based on GDD V3.0 Section 5 & Milestone M3 Specifications
 */

import { CommanderConfig, CommanderId } from '../core/types';

export const COMMANDERS_CONFIG: Record<CommanderId, CommanderConfig> = {
  wang_shouren: {
    id: 'wang_shouren',
    name: '王守仁',
    title: '阳明先生',
    factionAffinity: 'fire',
    passive: {
      description: '【心学·致良知】全城神机火器攻击力+20%；每触发1次【猛火轰爆】，全军装填时间缩短0.1秒。',
      fireAtkBonus: 0.20,
      explosionCdReduction: 0.1
    },
    ultimate: {
      name: '知行合一·万炮齐发',
      description: '全城所有器械立即重置装填冷却；在接下来的5.0秒内装填速度提高150%，火器必出多重连射！',
      rageCost: 100,
      duration: 5.0,
      reloadSpeedBonus: 1.50,
      resetAllWeaponCooldowns: true,
      firearmsMultiShot: true
    }
  },

  qin_huali: {
    id: 'qin_huali',
    name: '禽滑厘',
    title: '墨家巨子',
    factionAffinity: 'mohist',
    passive: {
      description: '【兼爱非攻】墨家器械射程+15%，城防工事单位生命值+30%。',
      mohistRangeBonus: 0.15,
      fortressHpBonus: 0.30
    },
    ultimate: {
      name: '兼爱非攻·铁壁天幕',
      description: '城墙升起6.0秒机关铁幕，吸收2000点伤害并反弹100%近战伤害。',
      rageCost: 100,
      duration: 6.0,
      barrierHp: 2000,
      reflectMeleeRatio: 1.00
    }
  },

  qin_liangyu: {
    id: 'qin_liangyu',
    name: '秦良玉',
    title: '白杆巾帼',
    factionAffinity: 'fortress',
    passive: {
      description: '【白杆巾帼】城防工事反伤效果+50%，城墙近处敌军攻击速度-20%。',
      fortressReflectBonus: 0.50,
      enemyAtkSpeedReductionNearWall: 0.20
    },
    ultimate: {
      name: '铁骑勤王·八面合围',
      description: '召唤8名精锐白杆骑兵向城外发起冲锋，对路径敌军造成500点伤害与击退。',
      rageCost: 100,
      duration: 0,
      damage: 500,
      cavalryCount: 8,
      knockbackDistance: 3.0
    }
  },

  liu_bowen: {
    id: 'liu_bowen',
    name: '刘伯温',
    title: '诚意国师',
    factionAffinity: 'qimen',
    passive: {
      description: '【神机妙算】奇门光环辐射范围+1，全元素反应伤害+30%。',
      qimenAuraRangeBonus: 1,
      reactionDmgBonus: 0.30
    },
    ultimate: {
      name: '奇门遁甲·天雷九烈',
      description: '全屏降下9道天雷连击，每道造成300点伤害并施加感电。',
      rageCost: 100,
      duration: 0,
      damage: 300,
      lightningStrikes: 9,
      inflictsShock: true
    }
  }
};

/**
 * Array list of all commanders
 */
export const ALL_COMMANDERS: CommanderConfig[] = Object.values(COMMANDERS_CONFIG);

/**
 * Gets a commander config by ID, falling back to Wang Shouren
 */
export function getCommanderConfig(id: CommanderId | string): CommanderConfig {
  return COMMANDERS_CONFIG[id as CommanderId] || COMMANDERS_CONFIG['wang_shouren'];
}
