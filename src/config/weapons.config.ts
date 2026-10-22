/**
 * 《孤城神机营》- 16 Weapon Archetypes Configuration Matrix
 * Full numerical specifications for ★1, ★2, ★3, ★4 across 4 Factions.
 * Pure headless domain contracts (Zero DOM / Zero Phaser dependencies).
 */

import { StarLevel, WeaponArchetypeConfig, WeaponStarConfig } from '../core/types';

export const WEAPON_CONFIGS: Record<string, WeaponArchetypeConfig> = {
  // =========================================================================
  // 1. 神机火器 (Fire)
  // =========================================================================
  fire_lance: {
    id: 'fire_lance',
    name: '神机火铳',
    faction: 'fire',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 40,
        attackInterval: 1.2, // ~0.83 /s (沉稳点射)
        range: 99.0,
        footprint: { width: 1, height: 1 },
        cost: 15,
        description: '全屏单体精确点射'
      },
      2: {
        star: 2,
        baseAtk: 72,
        attackInterval: 1.08,
        range: 99.0,
        footprint: { width: 1, height: 1 },
        cost: 30,
        description: '双管强化点射'
      },
      3: {
        star: 3,
        baseAtk: 130,
        attackInterval: 0.96,
        range: 99.0,
        footprint: { width: 1, height: 1 },
        cost: 60,
        description: '每次射击连续喷射3颗爆裂弹丸，单发造成70%伤害',
        evolutionName: '三管连射'
      },
      4: {
        star: 4,
        baseAtk: 240,
        attackInterval: 0.80,
        range: 99.0,
        footprint: { width: 1, height: 1 },
        cost: 120,
        description: '弹丸命中发生高爆破片，无视重甲护盾直接造成破甲并溅射全场',
        evolutionName: '穿甲爆裂弹'
      }
    }
  },

  rocket_box: {
    id: 'rocket_box',
    name: '一窝蜂火箭',
    faction: 'fire',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 108, // 18 x 6
        attackInterval: 3.2, // ~0.31 /s
        range: 8.0,
        footprint: { width: 1, height: 1 },
        cost: 20,
        description: '中远程扇形弹幕'
      },
      2: {
        star: 2,
        baseAtk: 192,
        attackInterval: 2.8,
        range: 8.5,
        footprint: { width: 1, height: 1 },
        cost: 40,
        description: '密集箭雨覆盖'
      },
      3: {
        star: 3,
        baseAtk: 350,
        attackInterval: 2.6,
        range: 9.0,
        footprint: { width: 1, height: 1 },
        cost: 80,
        description: '每次发射12发火箭，落地全额附带3.0秒灼烧',
        evolutionName: '十二连珠'
      },
      4: {
        star: 4,
        baseAtk: 615,
        attackInterval: 2.3,
        range: 10.0,
        footprint: { width: 1, height: 1 },
        cost: 160,
        description: '额外发射贯穿全屏的巨型火龙，在飞行路径残留持续5.0秒烈焰火海',
        evolutionName: '火龙出水'
      }
    }
  },

  thunder_thrower: {
    id: 'thunder_thrower',
    name: '震天雷投手',
    faction: 'fire',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 126,
        attackInterval: 3.8, // ~0.26 /s
        range: 7.0,
        footprint: { width: 1, height: 1 },
        cost: 20,
        description: '锁定最高血量精英投掷高爆铁雷'
      },
      2: {
        star: 2,
        baseAtk: 230,
        attackInterval: 3.5,
        range: 7.5,
        footprint: { width: 1, height: 1 },
        cost: 40,
        description: '烈性震天雷'
      },
      3: {
        star: 3,
        baseAtk: 415,
        attackInterval: 3.2,
        range: 8.0,
        footprint: { width: 1, height: 1 },
        cost: 80,
        description: '一次投掷2颗震天雷，对浸油目标100%触发猛火轰爆',
        evolutionName: '双雷连掷'
      },
      4: {
        star: 4,
        baseAtk: 745,
        attackInterval: 2.7,
        range: 8.5,
        footprint: { width: 1, height: 1 },
        cost: 160,
        description: '投掷巨型震天神雷，造成400%范围重击并使大范围敌军眩晕2.5秒',
        evolutionName: '九天神雷'
      }
    }
  },

  red_cannon: {
    id: 'red_cannon',
    name: '红衣大炮',
    faction: 'fire',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 208,
        attackInterval: 5.2, // ~0.19 /s (轰鸣重炮)
        range: 99.0,
        footprint: { width: 1, height: 2 },
        cost: 30,
        description: '全屏高抛重型开花实心弹'
      },
      2: {
        star: 2,
        baseAtk: 380,
        attackInterval: 4.7,
        range: 99.0,
        footprint: { width: 1, height: 2 },
        cost: 60,
        description: '巨型重装火炮'
      },
      3: {
        star: 3,
        baseAtk: 685,
        attackInterval: 4.2,
        range: 99.0,
        footprint: { width: 1, height: 2 },
        cost: 120,
        description: '炮弹触地爆炸后分裂出4枚子母雷，对处于灼烧状态的目标必定暴击',
        evolutionName: '子母开花弹'
      },
      4: {
        star: 4,
        baseAtk: 1185,
        attackInterval: 3.6,
        range: 99.0,
        footprint: { width: 1, height: 2 },
        cost: 240,
        description: '炮弹落地撕裂地面形成永久熔岩裂隙，全图敌军产生0.8秒强烈受击震退顿挫',
        evolutionName: '洪武巨炮'
      }
    }
  },

  // =========================================================================
  // 2. 墨家机关 (Mohist)
  // =========================================================================
  flame_beast: {
    id: 'flame_beast',
    name: '机关喷火兽',
    faction: 'mohist',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 33,
        attackInterval: 0.3, // ~3.33 /s
        range: 4.5,
        footprint: { width: 1, height: 1 },
        cost: 20,
        description: '前向90度近距扇形火柱持续喷射'
      },
      2: {
        star: 2,
        baseAtk: 60,
        attackInterval: 0.3,
        range: 4.7,
        footprint: { width: 1, height: 1 },
        cost: 40,
        description: '增压烈焰喷射'
      },
      3: {
        star: 3,
        baseAtk: 108,
        attackInterval: 0.3,
        range: 4.9,
        footprint: { width: 1, height: 1 },
        cost: 80,
        description: '升级为双龙头反向喷射，喷射角扩大至180度半圆全覆盖',
        evolutionName: '双头喷火'
      },
      4: {
        star: 4,
        baseAtk: 195,
        attackInterval: 0.3,
        range: 5.2,
        footprint: { width: 1, height: 1 },
        cost: 160,
        description: '周期性喷射持续3秒的贯穿型麒麟真火，引燃沿途毒瘴并造成百分比扣血',
        evolutionName: '麒麟吞天'
      }
    }
  },

  repeating_crossbow: {
    id: 'repeating_crossbow',
    name: '诸葛连弩',
    faction: 'mohist',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 65, // ~21 x 3
        attackInterval: 1.35,
        range: 6.0,
        footprint: { width: 1, height: 1 },
        cost: 15,
        description: '直线高速点杀3联发'
      },
      2: {
        star: 2,
        baseAtk: 115,
        attackInterval: 1.20,
        range: 6.5,
        footprint: { width: 1, height: 1 },
        cost: 30,
        description: '五联连弩齐射'
      },
      3: {
        star: 3,
        baseAtk: 215,
        attackInterval: 1.10,
        range: 7.0,
        footprint: { width: 1, height: 1 },
        cost: 60,
        description: '每次射出7支扇形穿透箭，每支箭矢可穿透1名敌军',
        evolutionName: '扇面穿透'
      },
      4: {
        star: 4,
        baseAtk: 385,
        attackInterval: 0.55, // ~1.82 /s
        range: 7.5,
        footprint: { width: 1, height: 1 },
        cost: 120,
        description: '攻速大幅提升，箭矢命中自带微型击退，触碰战场边界可反弹1次',
        evolutionName: '暴雨梨花'
      }
    }
  },

  bed_crossbow: {
    id: 'bed_crossbow',
    name: '八牛床弩',
    faction: 'mohist',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 250,
        attackInterval: 4.4, // ~0.23 /s (沉重贯甲)
        range: 99.0,
        footprint: { width: 2, height: 1 },
        cost: 30,
        description: '巨型铁箭直线贯通全屏，破盾'
      },
      2: {
        star: 2,
        baseAtk: 455,
        attackInterval: 4.0,
        range: 99.0,
        footprint: { width: 2, height: 1 },
        cost: 60,
        description: '重弦贯甲巨箭'
      },
      3: {
        star: 3,
        baseAtk: 815,
        attackInterval: 3.6,
        range: 99.0,
        footprint: { width: 2, height: 1 },
        cost: 120,
        description: '同时发射2支平行巨箭，且附带向内牵引聚拢周遭小兵效果',
        evolutionName: '双生巨箭'
      },
      4: {
        star: 4,
        baseAtk: 1440,
        attackInterval: 3.2,
        range: 99.0,
        footprint: { width: 2, height: 1 },
        cost: 240,
        description: '破盾伤害提升至500%，巨箭击杀敌军立即返还50%装填冷却，一箭清线',
        evolutionName: '弑神破城'
      }
    }
  },

  catapult: {
    id: 'catapult',
    name: '襄阳发石机',
    faction: 'mohist',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 305,
        attackInterval: 5.8, // ~0.17 /s (巨石高抛重击)
        range: 99.0,
        footprint: { width: 2, height: 2 },
        cost: 35,
        description: '高抛投掷巨石造成超广域范围轰砸'
      },
      2: {
        star: 2,
        baseAtk: 560,
        attackInterval: 5.2,
        range: 99.0,
        footprint: { width: 2, height: 2 },
        cost: 70,
        description: '巨型滚石轰砸'
      },
      3: {
        star: 3,
        baseAtk: 1005,
        attackInterval: 4.7,
        range: 99.0,
        footprint: { width: 2, height: 2 },
        cost: 140,
        description: '投掷寒冰巨石，落点直接施加2.5秒群体冰封硬控',
        evolutionName: '寒冰陨石'
      },
      4: {
        star: 4,
        baseAtk: 1810,
        attackInterval: 4.2,
        range: 99.0,
        footprint: { width: 2, height: 2 },
        cost: 280,
        description: '同时抛出3块巨石，巨石触地向前翻滚碾压两次，触发碎冰崩裂伤害翻倍',
        evolutionName: '泰山压顶'
      }
    }
  },

  // =========================================================================
  // 3. 城防工事 (Fortress, Row 0 only)
  // =========================================================================
  barricade: {
    id: 'barricade',
    name: '铁索拒马',
    faction: 'fortress',
    isFortressOnly: true,
    stars: {
      1: {
        star: 1,
        baseAtk: 15,
        attackInterval: 1.0,
        range: 1.0,
        footprint: { width: 1, height: 1 },
        cost: 15,
        description: '城墙获得+250护盾，敌军撞城时承受40%反伤与减速'
      },
      2: {
        star: 2,
        baseAtk: 28,
        attackInterval: 1.0,
        range: 1.0,
        footprint: { width: 1, height: 1 },
        cost: 30,
        description: '坚固铁索拒马，反伤提升至60%'
      },
      3: {
        star: 3,
        baseAtk: 50,
        attackInterval: 1.0,
        range: 2.0,
        footprint: { width: 1, height: 1 },
        cost: 60,
        description: '向城外延伸出2米铁刺带，敌军骑兵冲锋撞击强制坠马并眩晕2秒',
        evolutionName: '铁藜蒺藜带'
      },
      4: {
        star: 4,
        baseAtk: 90,
        attackInterval: 1.0,
        range: 3.0,
        footprint: { width: 1, height: 1 },
        cost: 120,
        description: '敌军撞击城墙时弹出巨型机关铁锚向前重击，将整排敌军横扫击退3米',
        evolutionName: '机关铁锚'
      }
    }
  },

  oil_cabinet: {
    id: 'oil_cabinet',
    name: '猛火油柜',
    faction: 'fortress',
    isFortressOnly: true,
    stars: {
      1: {
        star: 1,
        baseAtk: 13,
        attackInterval: 2.6, // ~0.38 /s
        range: 3.0,
        footprint: { width: 1, height: 1 },
        cost: 20,
        description: '向城外泼洒大范围黏稠沥青，敌军移速-30%并挂载浸油'
      },
      2: {
        star: 2,
        baseAtk: 23,
        attackInterval: 2.3,
        range: 3.5,
        footprint: { width: 1, height: 1 },
        cost: 40,
        description: '加压猛火油柜，浸油范围扩大'
      },
      3: {
        star: 3,
        baseAtk: 42,
        attackInterval: 2.1,
        range: 4.0,
        footprint: { width: 1, height: 1 },
        cost: 80,
        description: '一次性向前、左前、右前泼洒3罐高烈度沥青油污，附带破甲效果',
        evolutionName: '三罐连投'
      },
      4: {
        star: 4,
        baseAtk: 77,
        attackInterval: 1.8,
        range: 4.5,
        footprint: { width: 1, height: 1 },
        cost: 160,
        description: '油污中混入剧毒铁菱角，敌军踏入每秒扣血40点并陷入易伤+50%',
        evolutionName: '毒菱火油'
      }
    }
  },

  electric_grid: {
    id: 'electric_grid',
    name: '陷马电网',
    faction: 'fortress',
    isFortressOnly: true,
    stars: {
      1: {
        star: 1,
        baseAtk: 23,
        attackInterval: 1.3,
        range: 2.5,
        footprint: { width: 1, height: 1 },
        cost: 20,
        description: '持续释放环形电磁脉冲，敌军接触附加感电（承伤+25%）'
      },
      2: {
        star: 2,
        baseAtk: 43,
        attackInterval: 1.2,
        range: 3.0,
        footprint: { width: 1, height: 1 },
        cost: 40,
        description: '强力脉冲电网'
      },
      3: {
        star: 3,
        baseAtk: 73,
        attackInterval: 1.0,
        range: 3.5,
        footprint: { width: 1, height: 1 },
        cost: 80,
        description: '脉冲范围提升+50%，有50%概率直接引爆接触的浸油目标',
        evolutionName: '高压电弧'
      },
      4: {
        star: 4,
        baseAtk: 135,
        attackInterval: 0.9,
        range: 4.0,
        footprint: { width: 1, height: 1 },
        cost: 160,
        description: '电弧产生全屏连锁跳跃，在城门外形成永久电磁圈，永久瘫痪冲车引擎',
        evolutionName: '九天雷池'
      }
    }
  },

  spear_camp: {
    id: 'spear_camp',
    name: '白杆长枪营',
    faction: 'fortress',
    isFortressOnly: true,
    stars: {
      1: {
        star: 1,
        baseAtk: 130, // ~32 x 4
        attackInterval: 1.3,
        range: 2.0,
        footprint: { width: 1, height: 1 },
        cost: 25,
        description: '召唤4名白杆枪兵驻守城下阻截敌军'
      },
      2: {
        star: 2,
        baseAtk: 240,
        attackInterval: 1.2,
        range: 2.0,
        footprint: { width: 1, height: 1 },
        cost: 50,
        description: '枪阵严整，精锐枪兵'
      },
      3: {
        star: 3,
        baseAtk: 400,
        attackInterval: 1.0,
        range: 2.5,
        footprint: { width: 1, height: 1 },
        cost: 100,
        description: '枪兵晋升为重甲陌刀卫，生命提升至800，挥刀附带半月弧光群体劈砍',
        evolutionName: '重甲陌刀卫'
      },
      4: {
        star: 4,
        baseAtk: 750,
        attackInterval: 0.9,
        range: 3.0,
        footprint: { width: 1, height: 1 },
        cost: 200,
        description: '阵亡后化作不灭英灵作战5秒，彻底消散时自爆造成巨额范围火伤与2秒眩晕',
        evolutionName: '神威背鬼军'
      }
    }
  },

  // =========================================================================
  // 4. 奇门辅佐 (Qimen)
  // =========================================================================
  powder_bureau: {
    id: 'powder_bureau',
    name: '火药局',
    faction: 'qimen',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 0,
        attackInterval: 2.0,
        range: 1.5,
        footprint: { width: 1, height: 1 },
        cost: 20,
        description: '九宫格范围内所有友军器械攻击力+20%，且攻击附带35%概率施加灼烧'
      },
      2: {
        star: 2,
        baseAtk: 0,
        attackInterval: 1.8,
        range: 1.5,
        footprint: { width: 1, height: 1 },
        cost: 40,
        description: '精制火药局，九宫格攻击+30%'
      },
      3: {
        star: 3,
        baseAtk: 0,
        attackInterval: 1.6,
        range: 1.5,
        footprint: { width: 1, height: 1 },
        cost: 80,
        description: '攻击加成提升至+45%，且九宫格内所有器械攻击100%必定附加灼烧',
        evolutionName: '烈性火药'
      },
      4: {
        star: 4,
        baseAtk: 120,
        attackInterval: 1.4,
        range: 5.0,
        footprint: { width: 1, height: 1 },
        cost: 160,
        description: '九宫格内器械每累计攻击5次，火药局自动升空射出一发天火神鸦轰击敌群',
        evolutionName: '天火神机'
      }
    }
  },

  war_drum: {
    id: 'war_drum',
    name: '聚义战鼓',
    faction: 'qimen',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 0,
        attackInterval: 2.0,
        range: 5.0,
        footprint: { width: 2, height: 1 },
        cost: 25,
        description: '同排所有友军器械攻速提升+35%'
      },
      2: {
        star: 2,
        baseAtk: 0,
        attackInterval: 1.8,
        range: 5.0,
        footprint: { width: 2, height: 1 },
        cost: 50,
        description: '雄壮鼓声，同排攻速提升+45%'
      },
      3: {
        star: 3,
        baseAtk: 0,
        attackInterval: 1.6,
        range: 5.0,
        footprint: { width: 2, height: 1 },
        cost: 100,
        description: '攻速光环辐射扩大至上下相邻两排，且增幅保持+25%',
        evolutionName: '八面威风'
      },
      4: {
        star: 4,
        baseAtk: 0,
        attackInterval: 1.4,
        range: 5.0,
        footprint: { width: 2, height: 1 },
        cost: 200,
        description: '战鼓敲响时，全城所有器械每隔10秒进入持续2.5秒的必定暴击状态',
        evolutionName: '威震华夏'
      }
    }
  },

  stargazer: {
    id: 'stargazer',
    name: '观星祭坛',
    faction: 'qimen',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 0,
        attackInterval: 2.0,
        range: 2.0,
        footprint: { width: 1, height: 1 },
        cost: 25,
        description: '十字相邻所有器械暴击率+18%，且武器命中附带减速寒气'
      },
      2: {
        star: 2,
        baseAtk: 0,
        attackInterval: 1.8,
        range: 2.0,
        footprint: { width: 1, height: 1 },
        cost: 50,
        description: '通灵祭坛，十字暴击率+25%'
      },
      3: {
        star: 3,
        baseAtk: 0,
        attackInterval: 1.6,
        range: 2.0,
        footprint: { width: 1, height: 1 },
        cost: 100,
        description: '十字暴击率提升至+35%，寒气叠加3层直接使敌军陷入冰封定身2秒',
        evolutionName: '极寒天象'
      },
      4: {
        star: 4,
        baseAtk: 0,
        attackInterval: 1.4,
        range: 2.0,
        footprint: { width: 1, height: 1 },
        cost: 200,
        description: '十字相邻器械的所有武器装填时间与主动技能冷却时间缩短50%',
        evolutionName: '斗转星移'
      }
    }
  },

  luban_workshop: {
    id: 'luban_workshop',
    name: '鲁班工坊',
    faction: 'qimen',
    isFortressOnly: false,
    stars: {
      1: {
        star: 1,
        baseAtk: 0,
        attackInterval: 5.0,
        range: 0.0,
        footprint: { width: 1, height: 1 },
        cost: 30,
        description: '经济机关，每波战斗胜利后稳定产出12银两'
      },
      2: {
        star: 2,
        baseAtk: 0,
        attackInterval: 5.0,
        range: 0.0,
        footprint: { width: 1, height: 1 },
        cost: 60,
        description: '机关重工，每波稳定产出20银两'
      },
      3: {
        star: 3,
        baseAtk: 0,
        attackInterval: 5.0,
        range: 0.0,
        footprint: { width: 1, height: 1 },
        cost: 120,
        description: '每波产出提升至30银两，且每隔3波在备战席免费生成1尊随机★1器械',
        evolutionName: '天工造化'
      },
      4: {
        star: 4,
        baseAtk: 0,
        attackInterval: 5.0,
        range: 0.0,
        footprint: { width: 1, height: 1 },
        cost: 240,
        description: '每波产出60银两，并使全城所有已升星器械的基础攻击面板永久提升+50%',
        evolutionName: '万机归一'
      }
    }
  }
};

/**
 * Common Alias mapping to support backwards compatibility and alternative naming
 */
export const WEAPON_CONFIG_ALIASES: Record<string, string> = {
  iron_barricade: 'barricade',
  cannon: 'red_cannon',
  grid_trap: 'electric_grid'
};

/**
 * Resolves canonical config ID from aliases or direct keys
 */
export function resolveConfigId(configId: string): string {
  return WEAPON_CONFIG_ALIASES[configId] || configId;
}

/**
 * Retrieves archetype configuration by config ID (supports aliases)
 */
export function getWeaponConfig(configId: string): WeaponArchetypeConfig | undefined {
  const canonicalId = resolveConfigId(configId);
  return WEAPON_CONFIGS[canonicalId];
}

/**
 * Retrieves specific star configuration for a weapon archetype
 */
export function getWeaponStarConfig(configId: string, star: StarLevel): WeaponStarConfig | undefined {
  const arch = getWeaponConfig(configId);
  if (!arch) return undefined;
  return arch.stars[star];
}

/**
 * Returns all 16 weapon archetype configurations
 */
export function getAllWeaponConfigs(): WeaponArchetypeConfig[] {
  return Object.values(WEAPON_CONFIGS);
}
