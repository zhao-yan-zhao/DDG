/**
 * 《孤城神机营》- Forge Component Configuration Registry
 * Authoritative registry of all forgeable weapon components.
 */

import { ComponentDefinition } from './types';

export const COMPONENT_DEFINITIONS: Record<string, ComponentDefinition> = {
  // === 身管 / 炮管 (Barrel) ===
  iron_barrel: {
    id: 'iron_barrel',
    name: '精铸生铁身管',
    slot: 'barrel',
    quality: 'rare',
    desc: '工部兵器监标准身管，镗线均匀，略微提升炮口初速与射程。',
    bonuses: {
      atkBonus: 0.08,
      rangeBonus: 20
    },
    blueprintCost: 1,
    ironCost: 25
  },
  boss_bear_barrel: {
    id: 'boss_bear_barrel',
    name: '狂熊重钢身管',
    slot: 'barrel',
    quality: 'epic',
    desc: '熔铸铁塔熊王撼地巨锤精钢所制，厚重无比，极大增强直射威力与破甲。',
    bonuses: {
      atkBonus: 0.14,
      rangeBonus: 30,
      armorPierce: 15
    },
    blueprintCost: 2,
    ironCost: 60,
    sourceBoss: '铁塔熊王'
  },
  flame_dragon_barrel: {
    id: 'flame_dragon_barrel',
    name: '赤龙焚天重膛',
    slot: 'barrel',
    quality: 'legendary',
    desc: '赤金铸造的传世炮膛，刻有大明神机火龙咒文，烈火出膛声震十里。',
    bonuses: {
      atkBonus: 0.22,
      rangeBonus: 45,
      reactionDamageBonus: 0.15
    },
    blueprintCost: 4,
    ironCost: 150
  },

  // === 机匣 / 底座 (Receiver) ===
  spring_receiver: {
    id: 'spring_receiver',
    name: '精钢发条机匣',
    slot: 'receiver',
    quality: 'rare',
    desc: '鲁班锁扣传动结构，优化火门复进，略微缩减装填与冷却时间。',
    bonuses: {
      cooldownReduction: 0.08
    },
    blueprintCost: 1,
    ironCost: 25
  },
  boss_xuanwu_chassis: {
    id: 'boss_xuanwu_chassis',
    name: '玄武重甲底座',
    slot: 'receiver',
    quality: 'epic',
    desc: '借鉴玄武巨舰两舷防弹铁幕所制，重心稳如磐石，反震强韧。',
    bonuses: {
      atkBonus: 0.06,
      reflectBonus: 0.15
    },
    blueprintCost: 2,
    ironCost: 60,
    sourceBoss: '玄武巨舰'
  },
  boss_khan_receiver: {
    id: 'boss_khan_receiver',
    name: '天狼速动机匣',
    slot: 'receiver',
    quality: 'legendary',
    desc: '融合漠北天狼轻骑射术奥义，装填机械极为轻灵迅捷，攻速显著提升。',
    bonuses: {
      cooldownReduction: 0.16,
      rangeBonus: 25
    },
    blueprintCost: 4,
    ironCost: 150,
    sourceBoss: '金帐可汗'
  },

  // === 火门 / 引信 (Fuze) ===
  flint_fuze: {
    id: 'flint_fuze',
    name: '优质燧石火门',
    slot: 'fuze',
    quality: 'rare',
    desc: '选用上等打火燧石，发火率极大提升，增强暴击概率。',
    bonuses: {
      critRateBonus: 0.05
    },
    blueprintCost: 1,
    ironCost: 25
  },
  boss_corpse_fuze: {
    id: 'boss_corpse_fuze',
    name: '百毒燃灵引信',
    slot: 'fuze',
    quality: 'epic',
    desc: '以南疆万蛊妖火淬炼的磷毒引药，引信燃尽瞬间伴随幽绿火光，助长元素轰鸣。',
    bonuses: {
      critRateBonus: 0.08,
      reactionDamageBonus: 0.12
    },
    blueprintCost: 2,
    ironCost: 60,
    sourceBoss: '万蛊尸魔'
  },
  boss_taotie_fuze: {
    id: 'boss_taotie_fuze',
    name: '饕餮天劫重核',
    slot: 'fuze',
    quality: 'legendary',
    desc: '饕餮攻城机的微缩动力核心，开火引发毁灭性共鸣，穿云破石无往不利。',
    bonuses: {
      critRateBonus: 0.10,
      critDmgBonus: 0.30,
      armorPierce: 30
    },
    blueprintCost: 4,
    ironCost: 150,
    sourceBoss: '饕餮攻城机'
  }
};

export const ALL_COMPONENT_IDS = Object.keys(COMPONENT_DEFINITIONS);

export function getComponentDefinition(id: string): ComponentDefinition | undefined {
  return COMPONENT_DEFINITIONS[id];
}

export function getComponentsBySlot(slot: string): ComponentDefinition[] {
  return Object.values(COMPONENT_DEFINITIONS).filter(c => c.slot === slot);
}
