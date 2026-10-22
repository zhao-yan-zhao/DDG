/**
 * 《孤城神机营》- Compendium Configuration Matrix (神机万象·图鉴数据矩阵)
 * Pure Headless Domain Config (Zero DOM / Zero Phaser dependencies).
 * Fully data-driven specifications for:
 * 1. 16 Ming Dynasty Firearm & Mechanical Weapon Archetypes (大明神机谱)
 * 2. 13 Frontier Invaders & Chapter Supreme Bosses (塞外敌寇鉴)
 */

import { StarLevel } from '../core/types';

// =========================================================================
// 1. 大明神机谱 (Weapon Compendium)
// =========================================================================

export type CompendiumFaction = 'fire' | 'mohist' | 'fortress' | 'qimen';

export interface WeaponEvolutionInfo {
  star: StarLevel;
  name: string;
  atk: number;
  interval: number;
  description: string;
  specialEffect?: string;
}

export interface CompendiumWeaponItem {
  id: string;
  textureKey: string;
  name: string;
  alias: string;
  faction: CompendiumFaction;
  factionName: string;
  footprint: string; // e.g. '1×1', '2×2'
  rangeDisplay: string; // e.g. '全屏点射', '前排2格'
  attackType: '单体穿刺' | '范围轰爆' | '散射覆盖' | '近程阻截' | '全场增益' | '控场击退';
  historicalNote: string; // 兵经典故
  loreQuote: string; // 军营赞誉
  synergyTags: string[]; // 关联羁绊标签
  fusionWeapon?: string; // 赤金觉醒融合关联
  evolutions: Record<StarLevel, WeaponEvolutionInfo>;
}

export const COMPENDIUM_WEAPONS: CompendiumWeaponItem[] = [
  // -------------------------------------------------------------------------
  // 1. 神机火器 (Fire)
  // -------------------------------------------------------------------------
  {
    id: 'fire_lance',
    textureKey: 'weapon_fire_lance',
    name: '神机火铳',
    alias: '飞火神铳',
    faction: 'fire',
    factionName: '神机火器',
    footprint: '1×1',
    rangeDisplay: '全屏追踪',
    attackType: '单体穿刺',
    historicalNote: '明成祖永乐年间始设神机营，专习火器。火铳枪管精铁打造，膛线深沉，装填铅弹与火药，弹道平直，百步穿杨。',
    loreQuote: '“神机铳发，声如震雷，所当无不披靡。” ——《武备志》',
    synergyTags: ['神机火器', '单体绝杀', '穿甲'],
    fusionWeapon: '与【百虎齐奔】双三星合璧可唤醒赤金觉醒【九天神火飞鸦】',
    evolutions: {
      1: { star: 1, name: '初铸火铳', atk: 40, interval: 1.2, description: '全屏单体精确点射，稳定狙杀先锋敌寇。' },
      2: { star: 2, name: '双管精铳', atk: 72, interval: 1.08, description: '双管膛线改良，射速提升10%，伤害显著增强。' },
      3: { star: 3, name: '三管连珠', atk: 130, interval: 0.96, description: '每次射击连续喷射3颗爆裂弹丸，单发造成70%伤害。', specialEffect: '连续三连发' },
      4: { star: 4, name: '破甲神火', atk: 240, interval: 0.80, description: '弹丸命中发生高爆破片，无视重铠护甲直接造成破甲，弹丸破片溅射周围。', specialEffect: '无视防御·高爆破片' }
    }
  },
  {
    id: 'rocket_box',
    textureKey: 'weapon_rocket_box',
    name: '一窝蜂',
    alias: '百虎齐奔',
    faction: 'fire',
    factionName: '神机火器',
    footprint: '1×1',
    rangeDisplay: '扇形全场',
    attackType: '散射覆盖',
    historicalNote: '明代集束火箭之极致，一个木筒内分层装载三十二支药线相连的火箭。点燃引信，数秒内齐射蔽日，啸声震天。',
    loreQuote: '“群蜂出巢，烈焰漫天，骑兵战马闻其啸叫皆骇乱倒戈。”',
    synergyTags: ['神机火器', '多段群伤', '猛火引燃'],
    fusionWeapon: '与【神机火铳】融合同场激化【九天神火飞鸦】',
    evolutions: {
      1: { star: 1, name: '三十二矢蜂筒', atk: 18, interval: 2.2, description: '单次齐射喷发6枚火箭，覆盖前方扇形区域。' },
      2: { star: 2, name: '强化连珠筒', atk: 32, interval: 1.98, description: '火箭填药量加倍，单轮喷射8枚火箭，攻击间隔缩短。' },
      3: { star: 3, name: '百虎奔腾', atk: 58, interval: 1.76, description: '单次齐射狂暴喷射16枚火箭，覆盖全坡道中下半场。', specialEffect: '16枚暴风箭雨' },
      4: { star: 4, name: '万木齐鸣', atk: 108, interval: 1.50, description: '每枚火箭命中追加【点燃】与击退效果，对密集冲锋怪潮形成绝对火力封锁。', specialEffect: '全弹点燃·群体重退' }
    }
  },
  {
    id: 'thunder_thrower',
    textureKey: 'weapon_thunder_thrower',
    name: '震天雷投掷机',
    alias: '轰天火炮',
    faction: 'fire',
    factionName: '神机火器',
    footprint: '1×1',
    rangeDisplay: '坡道中远',
    attackType: '范围轰爆',
    historicalNote: '宋代金人围汴京用震天雷，明代加以机械化投石弹射。铸铁为壳，内填烈性黑火药与硫磺，炸裂时壳碎如星，声震数十里。',
    loreQuote: '“火发于百步之外，落处方圆数丈人马皆碎为齑粉。”',
    synergyTags: ['神机火器', '范围破片', '击晕断法'],
    evolutions: {
      1: { star: 1, name: '单发雷掷', atk: 85, interval: 2.5, description: '抛射一枚铁壳震天雷，落地引发半径1.5格爆轰。' },
      2: { star: 2, name: '重铁雷丸', atk: 153, interval: 2.25, description: '爆炸半径扩大至2格，并有30%几率击晕敌寇1秒。' },
      3: { star: 3, name: '子母天雷', atk: 275, interval: 2.0, description: '母雷炸裂后二次分裂为3枚子雷散落爆轰，造成连续二段冲击。', specialEffect: '子母二次碎裂' },
      4: { star: 4, name: '天崩地裂', atk: 510, interval: 1.75, description: '天雷炸裂必眩晕中心敌寇1.5秒，炸碎重甲并留下长达4秒的炽炎熔岩坑。', specialEffect: '强控眩晕·炽热熔坑' }
    }
  },
  {
    id: 'red_cannon',
    textureKey: 'weapon_red_cannon',
    name: '红夷大炮',
    alias: '镇国神机将军',
    faction: 'fire',
    factionName: '神机火器',
    footprint: '2×2',
    rangeDisplay: '全图超远',
    attackType: '范围轰爆',
    historicalNote: '明末自欧洲传入并自主仿造之重型前装滑膛炮。炮身铸铜铁千斤，射程达数里，为宁远大捷击退强虏的镇国重器。',
    loreQuote: '“一炮击出，糜烂数十里，虽重甲巨象亦无完躯。”',
    synergyTags: ['神机火器', '2×2重器', '超强毁伤', '首领克星'],
    evolutions: {
      1: { star: 1, name: '千斤红夷', atk: 220, interval: 4.0, description: '超远距离轰击，对弹着点区域造成巨量物理轰爆。' },
      2: { star: 2, name: '双引信重炮', atk: 396, interval: 3.6, description: '填装优化，爆炸冲击波直接击退敌军阵型。' },
      3: { star: 3, name: '四门开花', atk: 715, interval: 3.2, description: '炮弹破片范围翻倍，对巨型首领与攻城车造成额外100%破坏伤害。', specialEffect: '攻城破霸·对Boss双倍' },
      4: { star: 4, name: '镇国元戎', atk: 1320, interval: 2.8, description: '发射实心钨钢开山弹，弹道沿途直线贯穿碾压，触地引发全屏震颤！', specialEffect: '直线贯穿·全场震颤' }
    }
  },

  // -------------------------------------------------------------------------
  // 2. 墨家机关 (Mohist)
  // -------------------------------------------------------------------------
  {
    id: 'flame_beast',
    textureKey: 'weapon_flame_beast',
    name: '猛火油兽',
    alias: '机关火猊',
    faction: 'mohist',
    factionName: '墨家机关',
    footprint: '1×1',
    rangeDisplay: '前方锥形',
    attackType: '散射覆盖',
    historicalNote: '墨家机关秘术制造之青铜兽俑，内设双向活塞火柜与猛火油囊，遇火即发，喷射炽烈火浪，遇水愈炽。',
    loreQuote: '“铜首如狮，开阖吐烈火，逆风不回，敌阵焦黑。”',
    synergyTags: ['墨家机关', '烈焰灼烧', '快速清杂'],
    evolutions: {
      1: { star: 1, name: '青铜火兽', atk: 35, interval: 1.0, description: '向正前扇形持续喷射灼热火舌，对群怪施加点燃状态。' },
      2: { star: 2, name: '玄铜火猊', atk: 63, interval: 0.9, description: '喷火距离提升至3格，灼烧状态持续叠加减速。' },
      3: { star: 3, name: '双头怒猊', atk: 114, interval: 0.8, description: '机关进化为双向旋转喷口，前侧180度烈火炼狱无死角。', specialEffect: '180度扇面烈焰' },
      4: { star: 4, name: '焚天神兽', atk: 210, interval: 0.7, description: '喷射墨家秘炼蓝焰，对被点燃敌寇造成百分比最大生命真实伤害。', specialEffect: '天火真伤·遇水不熄' }
    }
  },
  {
    id: 'repeating_crossbow',
    textureKey: 'weapon_repeating_crossbow',
    name: '诸葛连弩',
    alias: '元戎神弩',
    faction: 'mohist',
    factionName: '墨家机关',
    footprint: '1×1',
    rangeDisplay: '中程平射',
    attackType: '单体穿刺',
    historicalNote: '相传诸葛武侯所创，明代工部改良为连珠木匣弩。十矢俱发，装填极速，为阻击轻骑冲锋之神兵。',
    loreQuote: '“机巧神速，矢如飞蝗，敌骑未及张弓已落马下。”',
    synergyTags: ['墨家机关', '高频点射', '快速击破'],
    evolutions: {
      1: { star: 1, name: '十连发机弩', atk: 25, interval: 0.6, description: '极速射出单发强弩，攻速为全阵营之冠。' },
      2: { star: 2, name: '淬毒连弩', atk: 45, interval: 0.54, description: '弩矢浸透川蜀乌头毒，命中敌军削弱其20%移速。' },
      3: { star: 3, name: '连珠穿云', atk: 81, interval: 0.48, description: '弩矢具备直线穿透特性，一矢贯穿前后两名敌寇。', specialEffect: '穿透多重目标' },
      4: { star: 4, name: '万矢神机', atk: 150, interval: 0.40, description: '进入【疾风狂暴】状态，射速再度狂暴翻倍，箭雨如同银河倒泻。', specialEffect: '疾风狂射·弹幕如雨' }
    }
  },
  {
    id: 'bed_crossbow',
    textureKey: 'weapon_bed_crossbow',
    name: '八牛弩',
    alias: '三弓床弩',
    faction: 'mohist',
    factionName: '墨家机关',
    footprint: '2×1',
    rangeDisplay: '超长直线',
    attackType: '单体穿刺',
    historicalNote: '古代床子弩之巅峰，需百人张弦或八牛并力而开。弩箭如长枪巨木，钉入敌垒城墙可作攻城云梯。',
    loreQuote: '“铁羽巨枪，直贯三重重铠，敌将闻声裂胆，千军莫挡。”',
    synergyTags: ['墨家机关', '2×1占格', '直线击退', '强力穿透'],
    evolutions: {
      1: { star: 1, name: '三弓床机', atk: 110, interval: 2.2, description: '发射巨型重木长箭，强力击退命中敌寇。' },
      2: { star: 2, name: '双弦精铁弩', atk: 198, interval: 1.98, description: '长箭贯穿整条防线前排直线，击退距离大幅增加。' },
      3: { star: 3, name: '穿甲裂地枪', atk: 358, interval: 1.76, description: '箭尖包裹陨铁三棱刃，对重甲铁浮屠造成双倍破甲撕裂。', specialEffect: '三棱破甲·深度撕裂' },
      4: { star: 4, name: '踏白破阵煞', atk: 660, interval: 1.50, description: '巨箭发射音爆轰鸣，对同列敌军造成贯穿震晕，首领霸体护盾强行撕碎！', specialEffect: '同列贯穿·霸体破碎' }
    }
  },
  {
    id: 'catapult',
    textureKey: 'weapon_catapult',
    name: '襄阳投石机',
    alias: '回回炮',
    faction: 'mohist',
    factionName: '墨家机关',
    footprint: '2×2',
    rangeDisplay: '坡道中后',
    attackType: '范围轰爆',
    historicalNote: '配重式大型杠杆抛石机，攻宋襄阳时威震天下。明代工匠将力臂与精钢滑轮结合，抛掷数百斤巨石如雨。',
    loreQuote: '“机发石出，声若雷霆，机纽飞转，所至城楼皆平。”',
    synergyTags: ['墨家机关', '2×2重器', '碎石击晕', '范围压制'],
    evolutions: {
      1: { star: 1, name: '巨石抛索机', atk: 190, interval: 3.5, description: '向坡道中段抛掷重石，造成圆形大范围重力压制。' },
      2: { star: 2, name: '滑轮配重炮', atk: 342, interval: 3.15, description: '配重机构改良，巨石落地碎裂产生弹跳，二次砸伤后排。' },
      3: { star: 3, name: '天外飞星', atk: 618, interval: 2.8, description: '换装燃烧沥青火石，落地引发碎石风暴并持续引燃大地。', specialEffect: '沥青火石·碎石风暴' },
      4: { star: 4, name: '泰山压顶', atk: 1140, interval: 2.4, description: '投掷千钧玄铁陨石，中心区域敌寇陷入3秒绝对瘫痪断骨。', specialEffect: '千钧陨铁·绝对瘫痪' }
    }
  },

  // -------------------------------------------------------------------------
  // 3. 边关要塞 (Fortress)
  // -------------------------------------------------------------------------
  {
    id: 'barricade',
    textureKey: 'weapon_barricade',
    name: '铁蒺藜鹿角',
    alias: '阻马拒马桩',
    faction: 'fortress',
    factionName: '边关要塞',
    footprint: '1×1',
    rangeDisplay: '城门前线',
    attackType: '近程阻截',
    historicalNote: '铁铸八角菱刺与交叉粗木鹿角构筑之城前第一道工事。马蹄踏之立倒，步卒踩之穿靴贯甲。',
    loreQuote: '“布于要隘，敌骑飞奔莫敢前，蹄穿骨裂，进退失据。”',
    synergyTags: ['边关要塞', '前排阻截', '反弹反伤', '流血割裂'],
    evolutions: {
      1: { star: 1, name: '坚木鹿角', atk: 15, interval: 0.5, description: '前线工事，敌寇每次撞击受到反伤与25%减速阻截。' },
      2: { star: 2, name: '铁甲拒马', atk: 27, interval: 0.5, description: '包覆精铁尖刺，反弹伤害提升至50%，阻滞效果加倍。' },
      3: { star: 3, name: '淬毒蒺藜', atk: 49, interval: 0.5, description: '地铺毒菱刺，令踩踏敌寇受到持续流血伤害且无法冲锋。', specialEffect: '流血割裂·禁止冲锋' },
      4: { star: 4, name: '金汤拒马营', atk: 90, interval: 0.5, description: '城墙根基永久强化，鹿角损毁后自动吸收玄铁重生！', specialEffect: '工事自愈·荆棘反甲' }
    }
  },
  {
    id: 'oil_cabinet',
    textureKey: 'weapon_oil_cabinet',
    name: '猛火油柜',
    alias: '火龙柜',
    faction: 'fortress',
    factionName: '边关要塞',
    footprint: '1×2',
    rangeDisplay: '城门近距',
    attackType: '散射覆盖',
    historicalNote: '以铜柜储猛火油，抽打机柄以压强将石脑油喷出为数丈火舌。遇水不灭，敌以水沃之，火势愈炽。',
    loreQuote: '“烟焰冲天，城堞俱赤，蛮夷肉躯遇之无不立毙。”',
    synergyTags: ['边关要塞', '1×2横置', '横向火墙', '燃油残留'],
    evolutions: {
      1: { star: 1, name: '双抽火柜', atk: 60, interval: 1.8, description: '横向封锁两格通道，向城门下方喷洒火油火瀑。' },
      2: { star: 2, name: '精炼石脑柜', atk: 108, interval: 1.62, description: '火油持续时间增加至4秒，在地面形成炽热火海地毯。' },
      3: { star: 3, name: '赤焰火龙', atk: 195, interval: 1.44, description: '火势扩散至全横排，对所有穿越火线的敌寇造成融甲致残。', specialEffect: '整排火瀑·融甲致残' },
      4: { star: 4, name: '火神祝融', atk: 360, interval: 1.25, description: '油火引发二次爆燃，敌军阵亡时尸爆连环，烈焰永不熄灭。', specialEffect: '尸爆连锁·永恒业火' }
    }
  },
  {
    id: 'electric_grid',
    textureKey: 'weapon_electric_grid',
    name: '震天雷网',
    alias: '引雷磁网',
    faction: 'fortress',
    factionName: '边关要塞',
    footprint: '1×1',
    rangeDisplay: '坡道全域',
    attackType: '控场击退',
    historicalNote: '古代奇人将地磁玄铁与铜丝相交织，悬于阵前。一旦雷雨天或摩擦生电，触之者浑身麻痹僵直，骨骼寸裂。',
    loreQuote: '“银蛇飞舞，雷光绕野，敌寇触网如陷泥淖，寸步难移。”',
    synergyTags: ['边关要塞', '群体麻痹', '感电传导', '雷火反应'],
    evolutions: {
      1: { star: 1, name: '铜丝雷网', atk: 30, interval: 2.0, description: '在坡道布设雷电链，对3名敌寇造成微麻痹减速。' },
      2: { star: 2, name: '玄铁导电网', atk: 54, interval: 1.8, description: '雷电传导人数增加至6人，麻痹几率提升至60%。' },
      3: { star: 3, name: '狂雷天牢', atk: 98, interval: 1.6, description: '雷网交织成囚笼，使大批敌寇原地禁锢停留1.5秒。', specialEffect: '群体禁锢·连锁感电' },
      4: { star: 4, name: '紫霄神雷阵', atk: 180, interval: 1.4, description: '天降狂雷引发引力力场，将全场散乱敌寇强行牵引聚拢！', specialEffect: '黑洞聚怪·天雷天劫' }
    }
  },
  {
    id: 'spear_camp',
    textureKey: 'weapon_spear_camp',
    name: '铁壁长枪营',
    alias: '戚家军狼筅营',
    faction: 'fortress',
    factionName: '边关要塞',
    footprint: '2×1',
    rangeDisplay: '城门正面',
    attackType: '近程阻截',
    historicalNote: '戚继光鸳鸯阵中之长枪与狼筅手。枝叶繁茂敷以剧毒，长枪精钢打磨，专克蛮族长刀与凶猛骑兵。',
    loreQuote: '“狼筅当先遮蔽，长枪随后攒刺，阵法如山，敌骑莫入。”',
    synergyTags: ['边关要塞', '2×1竖置', '护墙重盾', '强力拒止'],
    evolutions: {
      1: { star: 1, name: '坚阵枪卒', atk: 50, interval: 1.2, description: '挺枪迎敌，对迫近女墙的敌军造成突刺并击退。' },
      2: { star: 2, name: '鸳鸯长枪阵', atk: 90, interval: 1.08, description: '长枪手协同防御，城门受到冲撞伤害减少20%。' },
      3: { star: 3, name: '破军狼筅营', atk: 162, interval: 0.96, description: '狼筅带毒横扫，击落骑兵坐骑并使其瘫倒无法移动。', specialEffect: '长兵扫落·破骑瘫倒' },
      4: { star: 4, name: '铁血戚家军', atk: 300, interval: 0.80, description: '全员进入无畏军魂姿态，长枪攒刺形成钢铁风暴，绝对拒止！', specialEffect: '无畏军魂·绝对拒止' }
    }
  },

  // -------------------------------------------------------------------------
  // 4. 奇门玄甲 (Qimen)
  // -------------------------------------------------------------------------
  {
    id: 'powder_bureau',
    textureKey: 'weapon_powder_bureau',
    name: '火药局',
    alias: '大明王恭厂火药司',
    faction: 'qimen',
    factionName: '奇门玄甲',
    footprint: '1×1',
    rangeDisplay: '相邻八格',
    attackType: '全场增益',
    historicalNote: '工部盔甲厂与王恭厂所辖，专司研制黑色火药、硝石提纯与提炼猛火药油。乃整个神机营之火力源泉。',
    loreQuote: '“硝磺交合，工巧至精，全城火器皆赖其滋养而发威。”',
    synergyTags: ['奇门玄甲', '弹药补给', '攻击提升', '连击激化'],
    evolutions: {
      1: { star: 1, name: '工部药司', atk: 0, interval: 3.0, description: '为相邻火器提供优质火药，提升其15%基础攻击力。' },
      2: { star: 2, name: '提纯硝石局', atk: 0, interval: 2.7, description: '相邻器械攻击力提升提升至25%，暴击率增加10%。' },
      3: { star: 3, name: '高爆烈性药', atk: 0, interval: 2.4, description: '每隔10秒令相邻全部火器下一次攻击必定触发暴击与最大范围爆轰。', specialEffect: '全员满暴·烈爆激化' },
      4: { star: 4, name: '神工天药库', atk: 0, interval: 2.0, description: '增益光环覆盖全场所有火器，并使其技能冷却时间缩短25%！', specialEffect: '全图光环·极速冷却' }
    }
  },
  {
    id: 'war_drum',
    textureKey: 'weapon_war_drum',
    name: '战鼓台',
    alias: '闻天鼍龙鼓',
    faction: 'qimen',
    factionName: '奇门玄甲',
    footprint: '1×1',
    rangeDisplay: '全场军阵',
    attackType: '全场增益',
    historicalNote: '取深海鼍龙之皮，施以朱漆金钉制成天鼓。鼓声沉雄，如苍龙怒吟，三军闻之热血沸腾，杀气冲霄。',
    loreQuote: '“一通鼓，将士奋勇；二通鼓，气吞山河；三通鼓，胡虏授首！”',
    synergyTags: ['奇门玄甲', '全场攻速', '士气狂暴', '战勋收益'],
    evolutions: {
      1: { star: 1, name: '牛皮战鼓', atk: 0, interval: 2.5, description: '擂动战鼓，使全场防守器械攻速提升12%。' },
      2: { star: 2, name: '金错铜鼓', atk: 0, interval: 2.25, description: '鼓声激昂，全场攻速提升增加至20%，击杀奖励金币+1。' },
      3: { star: 3, name: '夔牛雷鼓', atk: 0, interval: 2.0, description: '战鼓附带震魂之威，每次击鼓有几率震散坡道敌寇的集结冲锋。', specialEffect: '战吼震魂·冲锋瓦解' },
      4: { star: 4, name: '苍龙吞日台', atk: 0, interval: 1.8, description: '开启全军【血战狂暴】，攻速与伤害全额飙升40%，战无不胜！', specialEffect: '全军狂暴·气贯长虹' }
    }
  },
  {
    id: 'stargazer',
    textureKey: 'weapon_stargazer',
    name: '观星祭坛',
    alias: '钦天监灵台',
    faction: 'qimen',
    factionName: '奇门玄甲',
    footprint: '1×1',
    rangeDisplay: '九宫天象',
    attackType: '控场击退',
    historicalNote: '钦天监秘传八卦九宫灵台，仰观北斗七星之变，俯察地脉风水走势。可呼风唤雨，借天威神力助守孤城。',
    loreQuote: '“顺天应人，斗转星移，借借东风烈火，焚尽百万匈奴。”',
    synergyTags: ['奇门玄甲', '元素共鸣', '天气改换', '弱点洞悉'],
    evolutions: {
      1: { star: 1, name: '浑天仪台', atk: 45, interval: 3.0, description: '引北斗星辉标记敌寇，使其受到所有伤害提升15%。' },
      2: { star: 2, name: '占星罗盘', atk: 81, interval: 2.7, description: '召唤太阴寒霜降临坡道，使全体行军敌寇冰冻减速25%。' },
      3: { star: 3, name: '奇门八卦阵', atk: 146, interval: 2.4, description: '在坡道中央布设八卦逆转虚空，将前排敌寇瞬间逆向回溯5秒行军路程！', specialEffect: '空间逆转·敌踪回溯' },
      4: { star: 4, name: '天象九耀仪', atk: 270, interval: 2.0, description: '引九天陨星雨与极昼雷光倾盆而下，全场元素反应伤害增幅100%！', specialEffect: '天象骤变·元素翻倍' }
    }
  },
  {
    id: 'luban_workshop',
    textureKey: 'weapon_luban_workshop',
    name: '鲁班工坊',
    alias: '巧匠机关阁',
    faction: 'qimen',
    factionName: '奇门玄甲',
    footprint: '1×1',
    rangeDisplay: '城防全盘',
    attackType: '全场增益',
    historicalNote: '巧夺天工之机关秘阁，内藏无尽齿轮、精钢轴承与工匠巧器。源源不断维修加固城垣，重构破损器械。',
    loreQuote: '“锯木为鸟，三日不落；运筹工坊，虽残垣断壁立可重修如初。”',
    synergyTags: ['奇门玄甲', '城墙修复', '机关维修', '金铁再生'],
    evolutions: {
      1: { star: 1, name: '墨工木坊', atk: 0, interval: 4.0, description: '自动修缮城墙，每隔数秒为女墙恢复微量生命值。' },
      2: { star: 2, name: '机关齿轮楼', atk: 0, interval: 3.6, description: '城墙受损时立刻激发生命护盾，并提升全场器械10%射程。' },
      3: { star: 3, name: '天工开物阁', atk: 0, interval: 3.2, description: '每波战斗胜利后，额外获得1张免费商店刷新券与金币加成。', specialEffect: '百宝财库·免费军备' },
      4: { star: 4, name: '墨圣鬼斧殿', atk: 0, interval: 2.8, description: '沙盘所有墨家与要塞器械获得【金刚之躯】，城墙免死一次并回复50%血量！', specialEffect: '金刚不坏·绝境重生' }
    }
  }
];

// =========================================================================
// 2. 塞外敌寇鉴 (Invaders & Bosses Compendium)
// =========================================================================

export type EnemyCategory = 'regular' | 'elite' | 'boss';

export interface CompendiumEnemyItem {
  id: string;
  textureKey: string;
  name: string;
  title: string;
  category: EnemyCategory;
  categoryName: string;
  dangerRating: string; // e.g. '★☆☆☆☆', '★★★★★'
  hpRating: string;     // e.g. '低', '中等', '高', '超巨额'
  speedRating: string;  // e.g. '0.8 m/s (迟缓)', '1.6 m/s (极快)'
  armorRating: string;  // e.g. '0 (无甲)', '150 (重铠)', '300 (不可撼动)'
  threatDescription: string; // 核心威胁机制
  tacticalCounter: string;   // 官方【破阵秘策】
  loreBio: string;           // 背景来历传记
  recommendedWeapons: string[]; // 推荐克制神机器械
}

export const COMPENDIUM_ENEMIES: CompendiumEnemyItem[] = [
  // -------------------------------------------------------------------------
  // 8 大常规与精锐敌寇
  // -------------------------------------------------------------------------
  {
    id: 'light_infantry',
    textureKey: 'enemy_light_infantry',
    name: '塞外游勇',
    title: '塞外刀盾步卒',
    category: 'regular',
    categoryName: '常规先锋',
    dangerRating: '★☆☆☆☆',
    hpRating: '中低 (约120~400)',
    speedRating: '0.90 m/s (匀速行军)',
    armorRating: '20 (轻木盾与皮甲)',
    threatDescription: '散漫但数量庞大，常作为前锋炮灰掩护后方重骑兵或攻城器械，能吸收大量初始火力。',
    tacticalCounter: '【破阵秘策】：神机火铳超远距离单体点名狙杀；配置一窝蜂或猛火油兽快速范围清场，绝不可让其耗尽重型器械弹药。',
    loreBio: '塞外各部落裹挟之亡命之徒，身披破旧羊皮与熟牛皮甲，左手执轻木盾，右手持生锈弯刀，以战养战，为财帛冲锋。',
    recommendedWeapons: ['神机火铳', '一窝蜂', '猛火油兽']
  },
  {
    id: 'war_dog',
    textureKey: 'enemy_war_dog',
    name: '狂暴战獒',
    title: '雪域赤目凶犬',
    category: 'regular',
    categoryName: '极速突袭',
    dangerRating: '★★☆☆☆',
    hpRating: '极低 (约60~180)',
    speedRating: '1.65 m/s (全场极速)',
    armorRating: '0 (无甲无防)',
    threatDescription: '以全军最快速度狂奔突刺，身形矮小灵动，专门趁守军火力间隙强扑女墙，造成城防磨损。',
    tacticalCounter: '【破阵秘策】：部署铁蒺藜鹿角于前线，战獒撞击锋利尖刺将遭受致命反伤；诸葛连弩超高攻速可瞬间点爆獒群。',
    loreBio: '自高寒雪山猎获之野獒杂交驯养，以生肉饲养，战前被灌下烈性草药，双目赤红，不畏生死，只知撕咬。',
    recommendedWeapons: ['铁蒺藜鹿角', '诸葛连弩', '一窝蜂']
  },
  {
    id: 'light_cavalry',
    textureKey: 'enemy_light_cavalry',
    name: '游牧轻骑',
    title: '漠北苍狼先锋骑',
    category: 'regular',
    categoryName: '冲锋穿透',
    dangerRating: '★★☆☆☆',
    hpRating: '中等 (约250~800)',
    speedRating: '1.35 m/s (疾驰冲锋)',
    armorRating: '35 (锁子甲与轻马甲)',
    threatDescription: '骑乘塞外快马，短时间内具备狂暴冲锋加速度，能快速突破中场封锁线直接逼近女墙根基。',
    tacticalCounter: '【破阵秘策】：边关长枪营正是克骑无上利器！搭配观星祭坛寒霜减速，将其移速拉低即可令其彻底失去冲锋破阵优势。',
    loreBio: '生长于大漠马背上的游牧健儿，骑术精绝，擅长在高速移动中控马冲阵，战阵如疾风掠草，难以捉摸。',
    recommendedWeapons: ['铁壁长枪营', '观星祭坛', '八牛弩']
  },
  {
    id: 'shield_guard',
    textureKey: 'enemy_shield_guard',
    name: '重盾铁卫',
    title: '突厥精铁大盾营',
    category: 'elite',
    categoryName: '精锐抗线',
    dangerRating: '★★★☆☆',
    hpRating: '高 (约600~2000)',
    speedRating: '0.65 m/s (沉重推进)',
    armorRating: '80 (正面巨盾，高物理格挡)',
    threatDescription: '手持半人高厚重铁盾，正面承受直线弹道伤害削减40%，牢牢护卫后排远程弓手与自爆兵推进。',
    tacticalCounter: '【破阵秘策】：红夷大炮或震天雷投掷机曲射范围轰爆，可绕过正面大盾直接炸伤其本体；猛火油柜燃油烈焰亦无视物理盾格挡。',
    loreBio: '蛮王亲卫营精选之魁梧力士，专练步阵抗盾之术，一人一盾如铜墙铁壁，沉重步伐声令守军胆寒。',
    recommendedWeapons: ['红夷大炮', '震天雷投掷机', '猛火油柜']
  },
  {
    id: 'iron_pagoda',
    textureKey: 'enemy_iron_pagoda',
    name: '金国铁浮屠',
    title: '无当具装重甲铁骑',
    category: 'elite',
    categoryName: '重装霸体',
    dangerRating: '★★★★☆',
    hpRating: '极高 (约1200~4500)',
    speedRating: '0.75 m/s (坚毅推进)',
    armorRating: '160 (全身百炼冷锻铁铠)',
    threatDescription: '全副武装到战马铁鼻，完全免疫击退效果，对冰冻减速具备50%高额抗性，一旦接近女墙将造成巨大坍塌性破坏！',
    tacticalCounter: '【破阵秘策】：八牛弩三棱穿甲箭破防撕裂；天外火石高爆破甲；配合震天雷网强控麻痹强制刹停！',
    loreBio: '名震青史的金国至强重骑，人披重铠，马着皮甲，三骑一组用铁索连结，冲阵之时犹如活动的长城，势不可挡。',
    recommendedWeapons: ['八牛弩', '震天雷网', '红夷大炮']
  },
  {
    id: 'ranged_bowman',
    textureKey: 'enemy_ranged_bowman',
    name: '塞外神射手',
    title: '射雕羽林神弓手',
    category: 'elite',
    categoryName: '远程袭扰',
    dangerRating: '★★★☆☆',
    hpRating: '中低 (约200~600)',
    speedRating: '0.80 m/s (谨慎走位)',
    armorRating: '15 (皮甲)',
    threatDescription: '驻足于坡道中后段，拉开巨弓向城头防线抛射密集火箭，无视前排直接威胁女墙守城器械耐久。',
    tacticalCounter: '【破阵秘策】：神机火铳与红夷大炮拥有超远全屏射程，应优先将狙杀准星锁定在后方神射手身上，拔除其火力点。',
    loreBio: '大漠草原上传奇的射雕者，能于百步之外引弓射中飞雁之目，箭镞涂抹塞外毒草，专司猎杀守城工匠。',
    recommendedWeapons: ['神机火铳', '红夷大炮', '襄阳投石机']
  },
  {
    id: 'bomb_carrier',
    textureKey: 'enemy_bomb_carrier',
    name: '死士自爆兵',
    title: '火雷教狂热死士',
    category: 'elite',
    categoryName: '绝命自爆',
    dangerRating: '★★★★☆',
    hpRating: '低 (约150~450)',
    speedRating: '1.40 m/s (亡命狂奔)',
    armorRating: '0 (无甲)',
    threatDescription: '背负烈性火药炸药包急速冲锋，一旦接触女墙或被击毙，瞬间引发剧烈自爆，对周围造成毁灭性爆轰！',
    tacticalCounter: '【破阵秘策】：绝对不能让其靠近女墙半步！使用诸葛连弩或神机火铳在半山腰将其提早击杀，引爆其药包炸伤周围其他敌寇。',
    loreBio: '被塞外妖道洗脑之狂热死士，胸前紧缚硝石火油筒，口含毒火，视死亡如飞升，乃守城将士最忌惮之梦魇。',
    recommendedWeapons: ['神机火铳', '诸葛连弩', '震天雷投掷机']
  },
  {
    id: 'siege_ram',
    textureKey: 'enemy_siege_ram',
    name: '重型攻城车',
    title: '破城巨木撞城巨兽',
    category: 'elite',
    categoryName: '攻城巨械',
    dangerRating: '★★★★☆',
    hpRating: '超高 (约3000~10000)',
    speedRating: '0.40 m/s (极慢碾压)',
    armorRating: '140 (覆铁生牛皮重木架)',
    threatDescription: '移动极缓但拥有钢铁之躯，装载百人合力推动的包铁撞角，一旦撞击女墙将一次性扣除巨额城防值！',
    tacticalCounter: '【破阵秘策】：集结红夷大炮与襄阳投石机实施集火饱和轰炸；猛火油兽与火龙柜点燃牛皮引燃木架，使其迅速焚毁。',
    loreBio: '塞外联军工匠仿制中原图纸打造之庞然大物，巨木裹以多层浸水生牛皮以防火矢，前置锋锐狼牙铁撞头，专破重城铁闸。',
    recommendedWeapons: ['红夷大炮', '襄阳投石机', '猛火油柜']
  },

  // -------------------------------------------------------------------------
  // 5 大章节霸主级首领 (Supreme Bosses)
  // -------------------------------------------------------------------------
  {
    id: 'boss_bear',
    textureKey: 'enemy_boss_bear',
    name: '北境铁塔熊王',
    title: '第一章关底首领 · 黑风寨霸主',
    category: 'boss',
    categoryName: '霸主首领',
    dangerRating: '★★★★☆',
    hpRating: '135,000 (极厚重血牛)',
    speedRating: '0.45 m/s (狂暴时1.8倍)',
    armorRating: '150 (巨熊厚皮与百炼铁甲)',
    threatDescription: '①【地动山摇】：震击大地，使女墙第0排城防工事陷入3秒瘫痪；②【狂暴战吼】：血量低于50%时移动速度与攻击力暴增80%；③【狼群召集】：持续召唤雪地战獒从两翼包抄。',
    tacticalCounter: '【破阵秘策】：在其血量降至半血前留存红夷大炮与火药局技能；利用八牛弩强行击退拉扯，并用铁蒺藜鹿角彻底锁死被其召唤出的一波波狂暴战獒。',
    loreBio: '长白山深处的变异凶兽，高逾两丈，被黑风寨首领以玄铁重锁拘禁饲养，披挂百斤生铁板，一掌之力可折断城楼悬梁。',
    recommendedWeapons: ['红夷大炮', '八牛弩', '铁蒺藜鹿角']
  },
  {
    id: 'boss_xuanwu',
    textureKey: 'enemy_boss_xuanwu',
    name: '玄武巨甲机兽',
    title: '第二章关底首领 · 塞外玄甲战舰',
    category: 'boss',
    categoryName: '霸主首领',
    dangerRating: '★★★★★',
    hpRating: '364,000 (机关重甲巨构)',
    speedRating: '0.38 m/s (沉重履带)',
    armorRating: '200 (墨家失落合金护甲)',
    threatDescription: '①【玄武铁幕】：展开高能磁力护盾，正面吸收所有平射弹道；②【侧舷齐射】：八门重炮齐射轰击城墙，造成瞬间40点城防崩坏；③【火油肆虐】：沿路倾倒高热油海，点燃地面封锁阵线。',
    tacticalCounter: '【破阵秘策】：平射火铳与连弩会被其铁幕彻底吸收！必须全盘依仗【襄阳投石机】与【红夷大炮】等高抛曲射火力越过铁幕直击其动力炉！',
    loreBio: '西域机关师盗掘上古墨家密卷残篇造出的履带战兽，外形如神话玄武巨龟，以内燃火油为动力，喷吐黑烟，所过之处寸草不生。',
    recommendedWeapons: ['襄阳投石机', '红夷大炮', '震天雷投掷机']
  },
  {
    id: 'boss_khan',
    textureKey: 'enemy_boss_khan',
    name: '漠北黄金大汗',
    title: '第三章关底首领 · 塞外金帐霸主',
    category: 'boss',
    categoryName: '霸主首领',
    dangerRating: '★★★★★',
    hpRating: '1,080,000 (百万级血海)',
    speedRating: '0.50 m/s (金顶御驾)',
    armorRating: '180 (大汗黄金铠甲与狼神护体)',
    threatDescription: '①【天狼军威】：咆哮战场，使全场所有小怪护甲+50并获得4秒绝对免控霸体；②【玄冰狼矢】：射出冰霜箭雨，随机冻结沙盘整行或整列器械3秒！',
    tacticalCounter: '【破阵秘策】：在其释放玄冰冻结后，需由鲁班工坊提供净化加成；使用奇门观星祭坛【奇门八卦】将其回溯，打乱其狼威光环节奏。',
    loreBio: '统一塞外七十二部的当代雄主，手握传国玉玺残片与金狼权杖，麾下雄兵百万，誓要踏平山海关饮马江南。',
    recommendedWeapons: ['观星祭坛', '鲁班工坊', '神机火铳']
  },
  {
    id: 'boss_wangu',
    textureKey: 'enemy_boss_wangu',
    name: '五毒万蛊尸王',
    title: '第四章关底首领 · 幽冥腐血魔君',
    category: 'boss',
    categoryName: '霸主首领',
    dangerRating: '★★★★★',
    hpRating: '2,970,000 (尸魔不死之躯)',
    speedRating: '0.40 m/s (漂浮阴风)',
    armorRating: '120 (血肉甲胄，抗物免毒)',
    threatDescription: '①【碧落瘴气】：毒气笼罩城头，每秒对城墙造成腐蚀伤害；②【吞噬血肉】：每隔数秒吞噬周围敌寇小怪，每吞一只瞬间回复自身10%巨额最大生命；③【假死还魂】：首度濒死时进入3秒无敌假死，随后以35%血量复活并暴走！',
    tacticalCounter: '【破阵秘策】：幽冥毒火与烈焰是其天敌！必须在其进食前用一窝蜂或猛火油兽彻底清除其周围小怪，断其回血之源！复活后立即开全军战鼓集火秒杀。',
    loreBio: '西南苗疆百蛮宗借千年尸煞炼成的无相魔怪，周身缠绕赤练飞蜈与碧鳞蛇毒，凡吸入其尸气者五脏俱烂，死后皆沦为其傀儡。',
    recommendedWeapons: ['猛火油兽', '一窝蜂', '战鼓台']
  },
  {
    id: 'boss_taotie',
    textureKey: 'enemy_boss_taotie',
    name: '魔尊·饕餮巨兽',
    title: '终章终焉首领 · 上古吞天魔神',
    category: 'boss',
    categoryName: '霸主首领',
    dangerRating: '★★★★★+',
    hpRating: '8,800,000 (灭世级极巨血槽)',
    speedRating: '0.30 m/s (每步地动山摇)',
    armorRating: '300 (混沌魔鳞，极难撼动)',
    threatDescription: '①【吞天漩涡】：张开黑洞巨口，吸收全场一切远程弹道并化为虚无；②【灭世破城蓄力】：凝聚毁灭光柱持续蓄力6秒，蓄力完成将直接对女墙造成1000点毁灭性破城秒杀！③【弱点打断机制】：蓄力期间巨兽胸前暴露赤红弱点，必须在6秒内造成3次重型击打或累计50,000点巨额伤害方可打断其蓄力并使其陷入5秒易伤反噬！',
    tacticalCounter: '【破阵秘策】：生死存亡在此一举！必须在城头上保留至少两门★3以上红夷大炮或八牛弩等【重型破城器械】。在其蓄力6秒倒计时中，集中全城所有重炮精准轰击胸口弱点，造成反噬后趁其瘫痪并附加200%易伤时开启战鼓全军速杀！',
    loreBio: '被封印在长城极北古地脉之下的四凶之一，食人无数，贪得无厌。因大明边防地脉动荡而破封重临人间，誓要吞噬一切文明与生灵。',
    recommendedWeapons: ['红夷大炮', '八牛弩', '襄阳投石机', '战鼓台']
  }
];

// =========================================================================
// 3. 空间相邻羁绊 (Spatial Adjacency Synergies)
// =========================================================================

export interface CompendiumSynergyItem {
  id: string;
  name: string;
  subTitle: string;
  formation: string; // 阵位要求，如 "左右正交相邻", "九宫格3×3"
  primaryWeapon: { id: string; name: string; textureKey: string };
  partnerWeapon: { id: string; name: string; textureKey: string };
  bonusValue: string; // 数值增益标签
  description: string; // 机制详情
  tacticalTip: string; // 战术布阵心法
}

export const COMPENDIUM_SYNERGIES: CompendiumSynergyItem[] = [
  {
    id: 'volley_fire',
    name: '齐射列阵',
    subTitle: '神机排枪轮射链',
    formation: '左右正交水平相邻',
    primaryWeapon: { id: 'fire_lance', name: '神机火铳', textureKey: 'weapon_fire_lance' },
    partnerWeapon: { id: 'fire_lance', name: '神机火铳', textureKey: 'weapon_fire_lance' },
    bonusValue: '攻速 +18%',
    description: '左右水平相邻同为神机火铳时，两尊火铳的射击攻速同时提升 +18%；若横向排成一整排，可激活连续不绝的【排枪轮射链】，弹道密集如暴雨。',
    tacticalTip: '适合在城楼后排（Row 3 或 Row 4）水平横向连续铺开 3~5 门火铳，形成不间断的全屏单体狙杀交织网。'
  },
  {
    id: 'wild_goose_crossbow',
    name: '雁行弩阵',
    subTitle: '交错斜向交叉死角',
    formation: '对角线（斜向）相邻',
    primaryWeapon: { id: 'repeating_crossbow', name: '诸葛连弩', textureKey: 'weapon_repeating_crossbow' },
    partnerWeapon: { id: 'repeating_crossbow', name: '诸葛连弩', textureKey: 'weapon_repeating_crossbow' },
    bonusValue: '暴击率 +15%',
    description: '两架诸葛连弩呈对角线（斜向）邻接摆放时，激活武侯奇门雁行阵势，两架连弩的暴击几率直接提升 +15%。',
    tacticalTip: '利用斜向交叉射界覆盖坡道拐角，配合高频射速可让暴击数字频繁跳动，快速蒸发冲锋而来的战獒与轻骑。'
  },
  {
    id: 'nine_palace_powder',
    name: '九宫火药库 / 火鸦助势',
    subTitle: '核心母港全域赋能',
    formation: '九宫格 3×3 范围相邻',
    primaryWeapon: { id: 'powder_bureau', name: '火药局', textureKey: 'weapon_powder_bureau' },
    partnerWeapon: { id: 'rocket_box', name: '一窝蜂 / 任意火器', textureKey: 'weapon_rocket_box' },
    bonusValue: '攻击力 +20% · 灼烧 35%',
    description: '火药局周围九宫格（3×3）范围内的所有友军火器，基础攻击力直接提升 +20%，且攻击附带 35% 概率施加【灼烧】；若一窝蜂火箭在火药局正上方或正下方，火箭齐射弹道额外 +4 发！',
    tacticalTip: '将火药局安插在沙盘黄金中心（如 Row 2, Col 2），周围环绕布置一窝蜂与神机火铳，可最大化全阵营火力爆发。'
  },
  {
    id: 'oil_combustion',
    name: '引火烧身',
    subTitle: '前沿油火烈焰轰鸣',
    formation: 'Row 0 女墙前沿 + Row 1 正后方',
    primaryWeapon: { id: 'oil_cabinet', name: '猛火油柜', textureKey: 'weapon_oil_cabinet' },
    partnerWeapon: { id: 'thunder_thrower', name: '震天雷 / 红夷大炮', textureKey: 'weapon_thunder_thrower' },
    bonusValue: '暴击率 +30%',
    description: '猛火油柜布置在 Row 0 女墙前沿，其正后方（Row 1）紧邻布置震天雷投掷机或红夷大炮时，后方重炮的暴击率狂飙提升 +30%！',
    tacticalTip: '前排喷洒猛火油给来犯敌群挂上【浸油】，后排重炮落地瞬间必定引爆【猛火轰爆】，造成巨额范围真伤与撕裂破甲。'
  },
  {
    id: 'march_drum',
    name: '闻鼓进军',
    subTitle: '同排号令军魂震天',
    formation: '同一横排任意相邻/在列',
    primaryWeapon: { id: 'war_drum', name: '聚义战鼓', textureKey: 'weapon_war_drum' },
    partnerWeapon: { id: 'spear_camp', name: '铁壁长枪营 / 全横排', textureKey: 'weapon_spear_camp' },
    bonusValue: '装填攻速 +35%',
    description: '战鼓所在的整一横排，所有防守器械装填攻速统一狂飙 +35%；若与白杆长枪营同列部署，长枪勇士每次突刺还将获得吸血护城效果。',
    tacticalTip: '将战鼓与八牛弩、发石机等长装填时间重器排在同一行，能将其慢速劣势转化为狂暴的高频重型压制火力。'
  },
  {
    id: 'polar_starlight',
    name: '极寒星芒',
    subTitle: '正交十字天象共鸣',
    formation: '上下左右十字正交 4 格',
    primaryWeapon: { id: 'stargazer', name: '观星祭坛', textureKey: 'weapon_stargazer' },
    partnerWeapon: { id: 'catapult', name: '襄阳投石机 / 任意器械', textureKey: 'weapon_catapult' },
    bonusValue: '暴击 +18% · 附带寒气',
    description: '十字正交相邻的 4 格器械，暴击率提升 +18%，且全部射击弹道附带寒气冰冻减速，持续阻滞敌军进军步伐。',
    tacticalTip: '与襄阳投石机或诸葛连弩十字邻接，投石落地不仅砸碎敌骨，更令周围大片敌群附带 3 层寒气直接触发【碎冰崩裂】。'
  }
];

// =========================================================================
// 4. 四大元素连锁反应 (Elemental Reaction Matrix)
// =========================================================================

export interface CompendiumReactionItem {
  id: string;
  name: string;
  formula: string; // 组合公式
  elementA: string;
  elementB: string;
  weaponA: { name: string; textureKey: string };
  weaponB: { name: string; textureKey: string };
  triggerMechanism: string; // 触发机制
  combatEffect: string;     // 实战效果
  recommendedPartners: string; // 推荐搭档
  tacticalNote: string;     // 战术精要
}

export const COMPENDIUM_REACTIONS: CompendiumReactionItem[] = [
  {
    id: 'fire_blast',
    name: '猛火轰爆',
    formula: '火油【浸油】 + 火器【火伤】',
    elementA: '🔥 猛火油',
    elementB: '💥 烈火爆',
    weaponA: { name: '猛火油柜', textureKey: 'weapon_oil_cabinet' },
    weaponB: { name: '震天雷投掷机', textureKey: 'weapon_thunder_thrower' },
    triggerMechanism: '猛火油柜或喷火兽挂上【浸油】状态，火铳/火箭/震天雷造成火伤时瞬间引爆。',
    combatEffect: '瞬间清除浸油，引发以目标为中心的 2.0 米大范围烈焰轰爆，造成 200% 范围火伤并破甲！',
    recommendedPartners: '猛火油柜 + 震天雷投掷机 / 一窝蜂',
    tacticalNote: '单目标内置 CD 为 1.5 秒（防级联崩坏保护），面对大批量重盾兵与密集狼群时拥有毁天灭地的融化清场效率。'
  },
  {
    id: 'thunder_heaven',
    name: '雷火天劫',
    formula: '陷马电网【感电】 + 火器【火伤】',
    elementA: '⚡ 感电网',
    elementB: '🔥 霹雳火',
    weaponA: { name: '震天雷网', textureKey: 'weapon_electric_grid' },
    weaponB: { name: '红夷大炮', textureKey: 'weapon_red_cannon' },
    triggerMechanism: '震天雷网施加【感电】状态，火器命中造成火伤时瞬间引下九天紫霄狂雷。',
    combatEffect: '引下霹雳狂雷，对目标造成大额贯穿雷伤，并使周围全部敌军陷入 1.2 秒绝对麻痹硬控！',
    recommendedPartners: '震天雷网 + 红夷大炮 / 神机火铳',
    tacticalNote: '攻打金国铁浮屠与各关底 Boss 的神级控场技，打断霸体蓄力，令敌军寸步难移。'
  },
  {
    id: 'ice_shatter',
    name: '碎冰崩裂',
    formula: '观星寒气【冰封】 + 重钝击【重型破甲】',
    elementA: '❄️ 玄冰封',
    elementB: '🪨 泰山压',
    weaponA: { name: '观星祭坛', textureKey: 'weapon_stargazer' },
    weaponB: { name: '襄阳投石机', textureKey: 'weapon_catapult' },
    triggerMechanism: '观星祭坛叠加 3 层寒气使敌军陷入绝对【冰封】，随后由投石机或八牛弩巨木重击。',
    combatEffect: '巨石碾碎玄冰，对普通怪造成 300% 破冰重伤；对首领 Boss 造成最大生命值 3% 的截断重创！',
    recommendedPartners: '观星祭坛 + 襄阳投石机 / 八牛弩',
    tacticalNote: '百分比生命截断对付百万甚至千万血量的北境熊王、金帐大汗与饕餮巨兽效果拔群，是越级打 Boss 的核心底牌。'
  },
  {
    id: 'nether_poison_fire',
    name: '幽冥毒火',
    formula: '火油残留 + 毒瘴侵蚀',
    elementA: '🧪 幽魂毒',
    elementB: '🔥 业火燃',
    weaponA: { name: '铁蒺藜鹿角', textureKey: 'weapon_barricade' },
    weaponB: { name: '猛火油兽', textureKey: 'weapon_flame_beast' },
    triggerMechanism: '火油沟与淬毒蒺藜或毒系兵法在坡道交织，点燃后形成不灭的幽绿毒焰地毯。',
    combatEffect: '燃起幽绿毒火，持续 4.0 秒，期间每 0.5 秒按百分比深度腐蚀敌军护甲与生命！',
    recommendedPartners: '淬毒蒺藜鹿角 + 猛火油兽 / 猛火油柜',
    tacticalNote: '完克第四章关底首领【万蛊尸王】，毒火能彻底瓦解其尸毒护体并断绝其吞噬回血之源。'
  }
];

// =========================================================================
// 5. 赤金融合觉醒 (Red-Gold Dual-Weapon Awakenings)
// =========================================================================

export interface CompendiumFusionItem {
  id: string;
  name: string;
  unlockCondition: string; // 解锁门槛
  weaponA: { name: string; star: string; textureKey: string };
  weaponB: { name: string; star: string; textureKey: string };
  ultimateCardName: string; // 觉醒肉鸽神卡名
  cardQuality: string;
  visualVFX: string;        // 战场毁灭视觉
  tacticalRole: string;     // 终局定位
  detailedEffect: string;   // 终极机制
}

export const COMPENDIUM_FUSIONS: CompendiumFusionItem[] = [
  {
    id: 'fire_dragon_water',
    name: '真·火龙出水',
    unlockCondition: '同场在阵：★3 一窝蜂 + ★3 猛火油柜',
    weaponA: { name: '一窝蜂', star: '★3 百虎齐奔', textureKey: 'weapon_rocket_box' },
    weaponB: { name: '猛火油柜', star: '★3 赤焰火龙', textureKey: 'weapon_oil_cabinet' },
    ultimateCardName: '赤金神策 ·【真·火龙出水】',
    cardQuality: '赤金神品 (Red-Gold)',
    visualVFX: '火箭齐射化作双向呼啸咆哮的赤焰火龙，掠过全场并在地面留下长达 5 秒的爆燃焦土裂谷！',
    tacticalRole: '全场清杂收割 · 脆皮怪潮绝对终结者',
    detailedEffect: '双 ★3 器械在场时，肉鸽兵法卡池强制刷出该赤金卡。选定后，一窝蜂火箭弹幕与猛火油柜合二为一，齐射化为真火神龙，全屏留下一条持续 5 秒的爆燃焦土，对范围内一切敌寇施加毁灭性连环爆轰与融甲！'
  },
  {
    id: 'nine_heaven_thunder_pool',
    name: '九天雷池轰',
    unlockCondition: '同场在阵：★3 红夷大炮 + ★3 震天雷网',
    weaponA: { name: '红夷大炮', star: '★3 四门开花', textureKey: 'weapon_red_cannon' },
    weaponB: { name: '震天雷网', star: '★3 狂雷天牢', textureKey: 'weapon_electric_grid' },
    ultimateCardName: '赤金神策 ·【九天雷池轰】',
    cardQuality: '赤金神品 (Red-Gold)',
    visualVFX: '红夷重炮炮弹破空引下万道天劫雷光，炮弹落点撕开永久雷磁力场，电芒如狂蛟乱舞！',
    tacticalRole: '重甲特攻 · 极速破甲与群体永久瘫痪',
    detailedEffect: '双 ★3 器械同场在阵解锁。红夷大炮每次炮击着弹点撕开一道半径 3 格的永久雷磁力场，冲锋而来的金国铁浮屠、战车与首领踏入雷池瞬间遭受 50% 破甲与每秒强力麻痹瘫痪，彻底废除敌军冲锋能力！'
  },
  {
    id: 'mount_tai_ice_meteor',
    name: '泰山陨冰劫',
    unlockCondition: '同场在阵：★3 襄阳投石机 + ★3 观星祭坛',
    weaponA: { name: '襄阳投石机', star: '★3 天外飞星', textureKey: 'weapon_catapult' },
    weaponB: { name: '观星祭坛', star: '★3 奇门八卦', textureKey: 'weapon_stargazer' },
    ultimateCardName: '赤金神策 ·【泰山陨冰劫】',
    cardQuality: '赤金神品 (Red-Gold)',
    visualVFX: '投石机抛臂扬起千钧绝对零度幽蓝陨冰，呼啸破空砸入敌阵，全屏冻结并引发连锁碎冰雪崩！',
    tacticalRole: '斩杀首领 · 全屏控制与百分比最大生命崩裂',
    detailedEffect: '双 ★3 器械同场在阵解锁。投石机抛掷的巨石化作绝对零度万载玄冰，触地瞬间引发全屏 2.5 秒绝对冰冻并自动引爆全额【碎冰崩裂】，直接对全场全部霸主 Boss 造成最大生命值 6% 的截断巨创！'
  }
];

// =========================================================================
// 6. Helper Accessors
// =========================================================================

export function getCompendiumWeaponsByFaction(faction?: CompendiumFaction | 'all'): CompendiumWeaponItem[] {
  if (!faction || faction === 'all') {
    return [...COMPENDIUM_WEAPONS];
  }
  return COMPENDIUM_WEAPONS.filter(w => w.faction === faction);
}

export function getCompendiumEnemiesByCategory(category?: EnemyCategory | 'all'): CompendiumEnemyItem[] {
  if (!category || category === 'all') {
    return [...COMPENDIUM_ENEMIES];
  }
  return COMPENDIUM_ENEMIES.filter(e => e.category === category);
}

export function getCompendiumWeaponById(id: string): CompendiumWeaponItem | undefined {
  return COMPENDIUM_WEAPONS.find(w => w.id === id);
}

export function getCompendiumEnemyById(id: string): CompendiumEnemyItem | undefined {
  return COMPENDIUM_ENEMIES.find(e => e.id === id);
}

export function getCompendiumSynergyById(id: string): CompendiumSynergyItem | undefined {
  return COMPENDIUM_SYNERGIES.find(s => s.id === id);
}

export function getCompendiumReactionById(id: string): CompendiumReactionItem | undefined {
  return COMPENDIUM_REACTIONS.find(r => r.id === id);
}

export function getCompendiumFusionById(id: string): CompendiumFusionItem | undefined {
  return COMPENDIUM_FUSIONS.find(f => f.id === id);
}
