/**
 * 《孤城神机营》- Battlefield Threat Radar & Unit Counter Pre-warning (波次战术推演雷达与兵种克制系统)
 * 
 * Implements GDD V3.0 §8.2, §9.1, §16.3 & Tier 3 Tactical Micro-ops:
 * - 4-Axis Wave Threat Radar: Armor (坚甲), Speed (疾风), Siege (攻城), Boss (凶煞) [0~100]
 * - Threat Danger Tiers: LOW | MID | HIGH | LETHAL
 * - Player Defensive Readiness & Counter Matrix (破甲火力, 阻滞减速, 远距截击, 斩首爆发)
 * - Military Counselor Directives (军师密策) and actionable unit counter advice
 * 
 * Strictly Headless domain module (Zero DOM / Zero Phaser dependencies).
 */

import { ENEMY_ARCHETYPES, EnemyArchetypeDefinition } from '../enemy/enemy-entity';

export type ThreatDangerLevel = 'LOW' | 'MID' | 'HIGH' | 'LETHAL';
export type ReadinessRank = 'S' | 'A' | 'B' | 'C';
export type CounterStatus = 'EXCELLENT' | 'ADEQUATE' | 'DEFICIENT';

export interface EnemySpawnInfo {
  enemyType: string;
  count: number;
  hpMultiplier?: number;
  affixIds?: string[];
}

export interface TacticalWaveContext {
  waveIndex: number;
  totalWaves?: number;
  isBossWave?: boolean;
  isEliteWave?: boolean;
  spawns?: EnemySpawnInfo[];
  bossConfig?: {
    name?: string;
    archetype?: string;
    skills?: Array<{ id: string; name: string }>;
  };
}

export interface TacticalWeaponInfo {
  id: string;
  configId: string;
  star: number;
  anchor?: { row: number; col: number };
  currentHp?: number;
  maxHp?: number;
}

export interface TacticalPlayerContext {
  weapons: TacticalWeaponInfo[];
  wallHp?: number;
  wallMaxHp?: number;
  commanderId?: string;
}

export interface EnemyRosterItem {
  enemyId: string;
  name: string;
  count: number;
  archetype: string;
  isBoss: boolean;
  threatTags: string[];
}

export interface CounterEvaluation {
  rating: number; // 0 ~ 100
  status: CounterStatus;
  keyWeapons: string[];
  description: string;
}

export interface ThreatBadge {
  tag: string;
  color: string;
  icon: string;
}

export interface TacticalThreatReport {
  waveIndex: number;
  isBossWave: boolean;
  isEliteWave: boolean;
  radarRatings: {
    armor: number; // 0 ~ 100
    speed: number;
    siege: number;
    boss: number;
  };
  radarDangerLevels: {
    armor: ThreatDangerLevel;
    speed: ThreatDangerLevel;
    siege: ThreatDangerLevel;
    boss: ThreatDangerLevel;
  };
  enemyRoster: EnemyRosterItem[];
  keyThreatBadges: ThreatBadge[];
  playerReadiness: {
    score: number; // 0 ~ 100
    rank: ReadinessRank;
    rankTitle: string;
    counters: {
      armor: CounterEvaluation;
      speed: CounterEvaluation;
      siege: CounterEvaluation;
      boss: CounterEvaluation;
    };
  };
  headlineAdvice: string;
  detailedDirectives: string[];
}

export class TacticalThreatAnalyzer {
  /**
   * Evaluates the comprehensive tactical threat report for an upcoming wave.
   */
  public static analyzeThreat(
    waveCtx: TacticalWaveContext,
    playerCtx?: TacticalPlayerContext
  ): TacticalThreatReport {
    // 1. Compile enemy roster and count totals
    const rosterMap = new Map<string, EnemyRosterItem>();
    const spawns = waveCtx.spawns || [];

    for (const spawn of spawns) {
      const def = ENEMY_ARCHETYPES[spawn.enemyType];
      const name = def?.name || spawn.enemyType;
      const archetype = def?.archetype || 'ordinary';
      const isBoss = Boolean(def?.isBoss || spawn.enemyType.startsWith('boss_'));

      if (!rosterMap.has(spawn.enemyType)) {
        const tags = this.getEnemyThreatTags(spawn.enemyType, def);
        rosterMap.set(spawn.enemyType, {
          enemyId: spawn.enemyType,
          name,
          count: spawn.count,
          archetype,
          isBoss,
          threatTags: tags
        });
      } else {
        const existing = rosterMap.get(spawn.enemyType)!;
        existing.count += spawn.count;
      }
    }

    // If boss wave but boss wasn't in explicit spawns, register boss item
    if (waveCtx.isBossWave && waveCtx.bossConfig) {
      const bossArch = waveCtx.bossConfig.archetype || 'boss_bear';
      const bossDef = ENEMY_ARCHETYPES[bossArch];
      const bossName = waveCtx.bossConfig.name || bossDef?.name || '守关大将';
      if (!rosterMap.has(bossArch)) {
        rosterMap.set(bossArch, {
          enemyId: bossArch,
          name: bossName,
          count: 1,
          archetype: 'boss',
          isBoss: true,
          threatTags: ['领袖凶威', '决战破阵']
        });
      }
    }

    const enemyRoster = Array.from(rosterMap.values());

    // 2. Calculate 4-Axis Threat Radar Metrics
    let rawArmor = 0;
    let rawSpeed = 0;
    let rawSiege = 0;
    let rawBoss = 0;

    for (const item of enemyRoster) {
      const def = ENEMY_ARCHETYPES[item.enemyId];
      const count = item.count;

      if (def) {
        // Armor threat
        if (def.armor >= 100 || (def.frontalDr && def.frontalDr >= 0.40)) {
          rawArmor += count * (def.armor >= 150 ? 12 : 7);
        } else if (def.armor >= 40) {
          rawArmor += count * 4;
        }

        // Speed threat
        if (def.moveSpeed >= 1.4) {
          rawSpeed += count * (def.moveSpeed >= 1.6 ? 10 : 7);
        } else if (def.moveSpeed >= 1.0) {
          rawSpeed += count * 5;
        }

        // Siege / Wall Destruction threat
        if (def.isSuicide || def.wallDamage >= 100) {
          rawSiege += count * 18;
        } else if (def.wallDamage >= 30 || def.isRanged) {
          rawSiege += count * 6;
        }

        // Boss threat
        if (def.isBoss) {
          rawBoss += 70 + (waveCtx.bossConfig?.skills?.length || 0) * 10;
        }
      } else {
        // Fallback for custom endless enemies
        if (item.enemyId.includes('shield') || item.enemyId.includes('pagoda')) rawArmor += count * 8;
        if (item.enemyId.includes('dog') || item.enemyId.includes('cavalry')) rawSpeed += count * 8;
        if (item.enemyId.includes('bomb') || item.enemyId.includes('ram')) rawSiege += count * 15;
        if (item.isBoss) rawBoss += 75;
      }
    }

    if (waveCtx.isBossWave) {
      rawBoss = Math.max(rawBoss, 75);
    }
    if (waveCtx.isEliteWave) {
      rawArmor += 20;
      rawSpeed += 15;
    }

    const armorRating = Math.min(100, Math.round(rawArmor));
    const speedRating = Math.min(100, Math.round(rawSpeed));
    const siegeRating = Math.min(100, Math.round(rawSiege));
    const bossRating = Math.min(100, Math.round(rawBoss));

    const radarRatings = {
      armor: armorRating,
      speed: speedRating,
      siege: siegeRating,
      boss: bossRating
    };

    const radarDangerLevels = {
      armor: this.getDangerTier(armorRating),
      speed: this.getDangerTier(speedRating),
      siege: this.getDangerTier(siegeRating),
      boss: this.getDangerTier(bossRating)
    };

    // 3. Assemble Key Threat Badges
    const keyThreatBadges: ThreatBadge[] = [];
    if (radarRatings.boss >= 60) {
      keyThreatBadges.push({ tag: '首领亲临', color: '#ff1744', icon: '👑' });
    }
    if (radarRatings.armor >= 45) {
      keyThreatBadges.push({ tag: '重甲铁盾', color: '#ffb74d', icon: '🛡️' });
    }
    if (radarRatings.speed >= 45) {
      keyThreatBadges.push({ tag: '疾风奔袭', color: '#00e5ff', icon: '⚡' });
    }
    if (radarRatings.siege >= 40) {
      keyThreatBadges.push({ tag: '爆破攻城', color: '#ff5252', icon: '💣' });
    }
    if (keyThreatBadges.length === 0) {
      keyThreatBadges.push({ tag: '流寇先遣', color: '#90a4ae', icon: '⚔️' });
    }

    // 4. Evaluate Player Defensive Counters
    const weapons = playerCtx?.weapons || [];
    const armorCounter = this.evaluateArmorCounter(weapons, armorRating);
    const speedCounter = this.evaluateSpeedCounter(weapons, speedRating);
    const siegeCounter = this.evaluateSiegeCounter(weapons, siegeRating);
    const bossCounter = this.evaluateBossCounter(weapons, bossRating, playerCtx?.commanderId);

    // Calculate threat-weighted readiness score
    const totalThreat = armorRating + speedRating + siegeRating + bossRating;
    let readinessScore = 85;

    if (totalThreat > 0) {
      const weightedSum =
        armorCounter.rating * armorRating +
        speedCounter.rating * speedRating +
        siegeCounter.rating * siegeRating +
        bossCounter.rating * bossRating;
      readinessScore = Math.min(100, Math.max(10, Math.round(weightedSum / totalThreat)));
    } else {
      readinessScore = weapons.length > 0 ? 95 : 50;
    }

    const { rank, rankTitle } = this.getReadinessRank(readinessScore);

    // 5. Generate Headline Advice & Detailed Directives
    const { headlineAdvice, detailedDirectives } = this.generateDirectives(
      radarRatings,
      radarDangerLevels,
      { armor: armorCounter, speed: speedCounter, siege: siegeCounter, boss: bossCounter },
      rank
    );

    return {
      waveIndex: waveCtx.waveIndex,
      isBossWave: Boolean(waveCtx.isBossWave),
      isEliteWave: Boolean(waveCtx.isEliteWave),
      radarRatings,
      radarDangerLevels,
      enemyRoster,
      keyThreatBadges,
      playerReadiness: {
        score: readinessScore,
        rank,
        rankTitle,
        counters: {
          armor: armorCounter,
          speed: speedCounter,
          siege: siegeCounter,
          boss: bossCounter
        }
      },
      headlineAdvice,
      detailedDirectives
    };
  }

  // =========================================================================
  // Counter Evaluation Algorithms
  // =========================================================================

  private static evaluateArmorCounter(weapons: TacticalWeaponInfo[], armorThreat: number): CounterEvaluation {
    let score = 0;
    const keyWeapons: string[] = [];

    for (const w of weapons) {
      if (w.configId === 'red_cannon') {
        score += 45 + w.star * 15;
        if (!keyWeapons.includes('红夷大炮')) keyWeapons.push('红夷大炮');
      } else if (w.configId === 'oil_cabinet') {
        score += 35 + w.star * 10;
        if (!keyWeapons.includes('猛火油柜')) keyWeapons.push('猛火油柜');
      } else if (w.configId === 'fire_lance') {
        score += 25 + w.star * 8;
        if (!keyWeapons.includes('梨花枪')) keyWeapons.push('梨花枪');
      } else if (w.configId === 'powder_bureau') {
        score += 20;
        if (!keyWeapons.includes('火药局')) keyWeapons.push('火药局');
      }
    }

    const rating = Math.min(100, score);
    let status: CounterStatus = 'ADEQUATE';
    let description = '火力均衡，常规穿甲应对';

    if (armorThreat <= 25) {
      status = 'ADEQUATE';
      description = '敌军少甲，常规火力即可轻松洞穿';
    } else if (rating >= Math.max(50, armorThreat * 0.70)) {
      status = 'EXCELLENT';
      description = `重炮烈火齐聚 (${keyWeapons.join('、')})，敌军重甲形同虚设！`;
    } else if (rating >= Math.max(30, armorThreat * 0.40)) {
      status = 'ADEQUATE';
      description = '具备基础破甲火力，可勉力破除护甲';
    } else {
      status = 'DEFICIENT';
      description = '缺少破甲重炮与灼热烈火，敌军坚盾极难击破！';
    }

    return { rating, status, keyWeapons, description };
  }

  private static evaluateSpeedCounter(weapons: TacticalWeaponInfo[], speedThreat: number): CounterEvaluation {
    let score = 0;
    const keyWeapons: string[] = [];

    for (const w of weapons) {
      if (w.configId === 'electric_grid') {
        score += 45 + w.star * 15;
        if (!keyWeapons.includes('陷马电网')) keyWeapons.push('陷马电网');
      } else if (w.configId === 'spear_camp') {
        score += 35 + w.star * 10;
        if (!keyWeapons.includes('白杆长枪营')) keyWeapons.push('白杆长枪营');
      } else if (w.configId === 'catapult') {
        score += 25 + w.star * 8;
        if (!keyWeapons.includes('抛石机')) keyWeapons.push('抛石机');
      } else if (w.configId === 'barricade') {
        score += 25 + w.star * 8;
        if (!keyWeapons.includes('铁索拒马')) keyWeapons.push('铁索拒马');
      }
    }

    const rating = Math.min(100, score);
    let status: CounterStatus = 'ADEQUATE';
    let description = '前排具备常规阻击能力';

    if (speedThreat <= 25) {
      status = 'ADEQUATE';
      description = '敌军推进平缓，无需刻意加装阻滞工事';
    } else if (rating >= Math.max(50, speedThreat * 0.70)) {
      status = 'EXCELLENT';
      description = `电网与长枪森严 (${keyWeapons.join('、')})，强力封堵敌骑冲锋！`;
    } else if (rating >= Math.max(30, speedThreat * 0.40)) {
      status = 'ADEQUATE';
      description = '阵线具备一定缓速能力，可延缓奔袭速度';
    } else {
      status = 'DEFICIENT';
      description = '前沿防线空虚！敌军疾骑与战犬极易瞬破城防！';
    }

    return { rating, status, keyWeapons, description };
  }

  private static evaluateSiegeCounter(weapons: TacticalWeaponInfo[], siegeThreat: number): CounterEvaluation {
    let score = 0;
    const keyWeapons: string[] = [];

    // Long-range snipers or frontline tanks to absorb suicide bombs
    for (const w of weapons) {
      if (w.configId === 'bed_crossbow') {
        score += 45 + w.star * 15;
        if (!keyWeapons.includes('八牛弩')) keyWeapons.push('八牛弩');
      } else if (w.configId === 'rocket_box' || w.configId === 'repeating_crossbow') {
        score += 25 + w.star * 8;
        const name = w.configId === 'rocket_box' ? '一窝蜂' : '诸葛连弩';
        if (!keyWeapons.includes(name)) keyWeapons.push(name);
      } else if (w.anchor?.row === 0) {
        // Any healthy unit at row 0 protects wall from direct siege contact
        score += 20 + w.star * 6;
        const name = w.configId === 'barricade' ? '铁索拒马' : w.configId === 'oil_cabinet' ? '猛火油柜' : '前排城防工事';
        if (!keyWeapons.includes(name)) keyWeapons.push(name);
      }
    }

    const rating = Math.min(100, score);
    let status: CounterStatus = 'ADEQUATE';
    let description = '常规远近火力防御体系';

    if (siegeThreat <= 20) {
      status = 'ADEQUATE';
      description = '敌军无烈性攻城器械，城墙稳固';
    } else if (rating >= Math.max(50, siegeThreat * 0.65)) {
      status = 'EXCELLENT';
      description = `远距狙击与前排工事齐备 (${keyWeapons.join('、')})，严防死士抵近！`;
    } else if (rating >= Math.max(30, siegeThreat * 0.35)) {
      status = 'ADEQUATE';
      description = '防线有一定吸收能力，需提防中段漏兵';
    } else {
      status = 'DEFICIENT';
      description = '缺乏远距点杀与0排掩体，自爆死士将对城门造成毁灭打击！';
    }

    return { rating, status, keyWeapons, description };
  }

  private static evaluateBossCounter(
    weapons: TacticalWeaponInfo[],
    bossThreat: number,
    commanderId?: string
  ): CounterEvaluation {
    let score = 25; // Base baseline
    const keyWeapons: string[] = [];

    for (const w of weapons) {
      if (w.star >= 3) {
        score += w.star === 4 ? 30 : 20;
        keyWeapons.push(`★${w.star} 器械`);
      }
      if (['war_drum', 'powder_bureau', 'stargazer', 'luban_workshop'].includes(w.configId)) {
        score += 15;
        if (!keyWeapons.includes('奇门阵法')) keyWeapons.push('奇门阵法');
      }
    }

    if (commanderId) {
      score += 25;
    }

    const rating = Math.min(100, score);
    let status: CounterStatus = 'ADEQUATE';
    let description = '常备军力，可支撑战局推演';

    if (bossThreat <= 20) {
      status = 'ADEQUATE';
      description = '本波次无首领大将，常规压制即可';
    } else if (rating >= 65) {
      status = 'EXCELLENT';
      description = '高星神兵列阵，奇门遁甲圆融，具备极强斩将能力！';
    } else if (rating >= 40) {
      status = 'ADEQUATE';
      description = '阵型初具规模，紧密配合主帅绝技方可战胜强敌';
    } else {
      status = 'DEFICIENT';
      description = '场上缺乏高星级主战火力，极易在首领狂暴阶段崩盘！';
    }

    return { rating, status, keyWeapons, description };
  }

  // =========================================================================
  // Directive & Advice Generation
  // =========================================================================

  private static generateDirectives(
    threats: { armor: number; speed: number; siege: number; boss: number },
    danger: { armor: ThreatDangerLevel; speed: ThreatDangerLevel; siege: ThreatDangerLevel; boss: ThreatDangerLevel },
    counters: { armor: CounterEvaluation; speed: CounterEvaluation; siege: CounterEvaluation; boss: CounterEvaluation },
    rank: ReadinessRank
  ): { headlineAdvice: string; detailedDirectives: string[] } {
    const directives: string[] = [];
    let headlineAdvice = '';

    // Check critical vulnerabilities first
    if (threats.boss >= 60 && counters.boss.status === 'DEFICIENT') {
      headlineAdvice = '⚠️ 守关大将凶悍来犯！当前高星火力不足，须合成升星并留存主将绝技！';
      directives.push('• 守关首领拥有极高血量与狂暴技能，建议立即在备战席二合一合成 ★3/★4 神兵！');
      directives.push('• 主帅绝技务必留待首领进入射程或蓄力时定向轰炸，打断致命战技！');
    } else if (threats.siege >= 45 && counters.siege.status === 'DEFICIENT') {
      headlineAdvice = '⚠️ 发现自爆火药死士与攻城木冲车！速在后排布设【八牛弩】远距狙杀！';
      directives.push('• 敌军携带烈性攻城炸药，一旦触碰城墙将造成巨额伤害！');
      directives.push('• 建议在 3~4 排部署长射程【八牛弩】或【诸葛连弩】，在坡道中远距离提前点爆！');
      directives.push('• 0 排务必放置【铁索拒马】或【猛火油柜】阻挡第一波冲击，吸收爆炸威力！');
    } else if (threats.speed >= 45 && counters.speed.status === 'DEFICIENT') {
      headlineAdvice = '⚠️ 敌方疾风铁骑与凶暴战犬突阵！前排急需布置【陷马电网】阻截缓速！';
      directives.push('• 敌军冲锋移速极快，缺乏减速阻滞将导致后排重炮无法及时装填瞄准！');
      directives.push('• 建议在 0 排紧急布设【陷马电网】使敌军麻痹，或布置【白杆长枪营】强力拒马刺杀！');
    } else if (threats.armor >= 45 && counters.armor.status === 'DEFICIENT') {
      headlineAdvice = '⚠️ 敌方重甲盾兵重装压境！建议部署【红夷大炮】破除坚盾！';
      directives.push('• 敌军玄甲盾兵享有高额护甲与正面免伤，普通箭矢伤害极微！');
      directives.push('• 推荐部署【红夷大炮】破甲，或在前排安置【猛火油柜】引燃烈火熔蚀敌甲！');
    } else {
      // Well-rounded state
      if (rank === 'S') {
        headlineAdvice = '✅ 军师推演：我军阵型严整，破甲、阻滞与远攻浑然一体，胜券在握！';
        directives.push('• 全面克制本波敌军编制，可放心迎敌或趁机调整备战席合成对子！');
        directives.push('• 奇门法阵连线加持全场，火炮射速与伤害已达极致！');
      } else if (rank === 'A') {
        headlineAdvice = '🟢 军师推演：我军防线总体从容，建议微调阵位确保辅佐光环全覆盖！';
        directives.push('• 防线克制良好，优先集火前锋精英，城防可保无虞。');
        directives.push('• 注意检查 0 排城防神兵耐久度，避免出现局部缺口。');
      } else {
        headlineAdvice = '🟡 军师推演：双方势均力敌，请沉着操纵主帅绝技以定乾坤！';
        directives.push('• 敌我交锋焦灼，建议在战场中段敌群密集处施展战术拖拽瞄准轰杀！');
        directives.push('• 商店刷新时积极搜寻已持有的 ★1 军械凑成对子质变升星！');
      }
    }

    return { headlineAdvice, detailedDirectives: directives };
  }

  // =========================================================================
  // Helper Utilities
  // =========================================================================

  private static getEnemyThreatTags(enemyId: string, def?: EnemyArchetypeDefinition): string[] {
    const tags: string[] = [];
    if (!def) {
      if (enemyId.includes('boss')) tags.push('领袖凶威');
      if (enemyId.includes('shield')) tags.push('重甲防线');
      return tags;
    }

    if (def.isBoss) tags.push('领袖凶威');
    if (def.isSuicide) tags.push('烈火自爆');
    if (def.armor >= 100) tags.push('坚甲重铠');
    else if (def.armor >= 40) tags.push('轻甲护身');

    if (def.moveSpeed >= 1.4) tags.push('疾风冲锋');
    if (def.wallDamage >= 100) tags.push('毁灭破城');
    if (def.isRanged) tags.push('远程投掷');
    if (def.frontalDr && def.frontalDr >= 0.40) tags.push('正面减伤');

    return tags.slice(0, 3);
  }

  private static getDangerTier(rating: number): ThreatDangerLevel {
    if (rating >= 75) return 'LETHAL';
    if (rating >= 50) return 'HIGH';
    if (rating >= 25) return 'MID';
    return 'LOW';
  }

  private static getReadinessRank(score: number): { rank: ReadinessRank; rankTitle: string } {
    if (score >= 80) return { rank: 'S', rankTitle: '神机妙算 · 完克敌阵' };
    if (score >= 60) return { rank: 'A', rankTitle: '从容应对 · 胜算沛然' };
    if (score >= 40) return { rank: 'B', rankTitle: '势均力敌 · 略有破绽' };
    return { rank: 'C', rankTitle: '战局危急 · 急需变阵' };
  }
}
