/**
 * 《孤城神机营》- Leaderboard Manager (全国 / 同省战功风云榜)
 * Implements GDD V3.0 §11.3 & §17.2:
 * - Dual-tab rankings: National (全国风云榜) and Provincial/City (同省战功榜)
 * - Local-first fallback with cloud-ready API sync interface
 * - Integrates player's personal high score, calculating live rank placement
 * 
 * Pure headless domain model (Zero DOM / Zero Phaser dependencies).
 */

import { LeaderboardEntry } from './types';
import { EndlessManager } from './endless-manager';
import { CommanderId } from '../types';

export const DEFAULT_PLAYER_CITY = '北京市朝阳区';

// Baseline competitive benchmarks across the nation
const INITIAL_NATIONAL_BOARD: Omit<LeaderboardEntry, 'rank'>[] = [
  {
    openId: 'douyin_bot_01',
    nickname: '关宁铁骑大统领',
    cityName: '辽宁省沈阳市',
    maxWave: 58,
    score: 184500,
    militaryTitle: '定国公·太师',
    commanderId: 'wang_shouren',
    timestamp: 1729200000
  },
  {
    openId: 'douyin_bot_02',
    nickname: '江南神机第一铳',
    cityName: '浙江省杭州市',
    maxWave: 52,
    score: 162300,
    militaryTitle: '定国公·太师',
    commanderId: 'liu_bowen',
    timestamp: 1729190000
  },
  {
    openId: 'douyin_bot_03',
    nickname: '白杆女营破阵子',
    cityName: '重庆市渝中区',
    maxWave: 47,
    score: 141800,
    militaryTitle: '兵部尚书',
    commanderId: 'qin_liangyu',
    timestamp: 1729185000
  },
  {
    openId: 'douyin_bot_04',
    nickname: '墨门九段机关宗',
    cityName: '北京市朝阳区',
    maxWave: 43,
    score: 129000,
    militaryTitle: '兵部尚书',
    commanderId: 'qin_huali',
    timestamp: 1729170000
  },
  {
    openId: 'douyin_bot_05',
    nickname: '天火流星飞鸦客',
    cityName: '广东省广州市',
    maxWave: 38,
    score: 108400,
    militaryTitle: '神机营提督',
    commanderId: 'wang_shouren',
    timestamp: 1729160000
  },
  {
    openId: 'douyin_bot_06',
    nickname: '紫禁城头敲战鼓',
    cityName: '北京市东城区',
    maxWave: 34,
    score: 95600,
    militaryTitle: '神机营提督',
    commanderId: 'liu_bowen',
    timestamp: 1729150000
  },
  {
    openId: 'douyin_bot_07',
    nickname: '塞外孤烟铁浮屠',
    cityName: '陕西省西安市',
    maxWave: 29,
    score: 79200,
    militaryTitle: '参将·副总兵',
    commanderId: 'qin_liangyu',
    timestamp: 1729140000
  },
  {
    openId: 'douyin_bot_08',
    nickname: '锦衣卫百户大人',
    cityName: '江苏省南京市',
    maxWave: 25,
    score: 66800,
    militaryTitle: '参将·副总兵',
    commanderId: 'wang_shouren',
    timestamp: 1729130000
  },
  {
    openId: 'douyin_bot_09',
    nickname: '巴蜀霹雳火炮手',
    cityName: '四川省成都市',
    maxWave: 21,
    score: 54900,
    militaryTitle: '参将·副总兵',
    commanderId: 'qin_huali',
    timestamp: 1729120000
  },
  {
    openId: 'douyin_bot_10',
    nickname: '山海关一介火夫',
    cityName: '河北省秦皇岛市',
    maxWave: 18,
    score: 46200,
    militaryTitle: '游击将军',
    commanderId: 'wang_shouren',
    timestamp: 1729110000
  }
];

// Baseline city-level benchmarks
const INITIAL_CITY_BOARD: Omit<LeaderboardEntry, 'rank'>[] = [
  {
    openId: 'douyin_city_01',
    nickname: '墨门九段机关宗',
    cityName: '北京市朝阳区',
    maxWave: 43,
    score: 129000,
    militaryTitle: '兵部尚书',
    commanderId: 'qin_huali',
    timestamp: 1729170000
  },
  {
    openId: 'douyin_city_02',
    nickname: '紫禁城头敲战鼓',
    cityName: '北京市东城区',
    maxWave: 34,
    score: 95600,
    militaryTitle: '神机营提督',
    commanderId: 'liu_bowen',
    timestamp: 1729150000
  },
  {
    openId: 'douyin_city_03',
    nickname: '望京守夜人',
    cityName: '北京市朝阳区',
    maxWave: 27,
    score: 72100,
    militaryTitle: '参将·副总兵',
    commanderId: 'wang_shouren',
    timestamp: 1729135000
  },
  {
    openId: 'douyin_city_04',
    nickname: '国贸三期火神营',
    cityName: '北京市朝阳区',
    maxWave: 22,
    score: 58400,
    militaryTitle: '参将·副总兵',
    commanderId: 'qin_liangyu',
    timestamp: 1729125000
  },
  {
    openId: 'douyin_city_05',
    nickname: '中关村造办学士',
    cityName: '北京市海淀区',
    maxWave: 19,
    score: 48900,
    militaryTitle: '游击将军',
    commanderId: 'qin_huali',
    timestamp: 1729115000
  },
  {
    openId: 'douyin_city_06',
    nickname: '三里屯重炮手',
    cityName: '北京市朝阳区',
    maxWave: 15,
    score: 37600,
    militaryTitle: '游击将军',
    commanderId: 'wang_shouren',
    timestamp: 1729105000
  },
  {
    openId: 'douyin_city_07',
    nickname: '奥森连珠铳客',
    cityName: '北京市朝阳区',
    maxWave: 12,
    score: 29800,
    militaryTitle: '千总·守备',
    commanderId: 'liu_bowen',
    timestamp: 1729095000
  },
  {
    openId: 'douyin_city_08',
    nickname: '通州大运河百户',
    cityName: '北京市通州区',
    maxWave: 8,
    score: 18700,
    militaryTitle: '把总·哨官',
    commanderId: 'qin_liangyu',
    timestamp: 1729085000
  }
];

export class LeaderboardManager {
  private nationalList: Omit<LeaderboardEntry, 'rank'>[];
  private cityList: Omit<LeaderboardEntry, 'rank'>[];

  constructor() {
    this.nationalList = [...INITIAL_NATIONAL_BOARD];
    this.cityList = [...INITIAL_CITY_BOARD];
  }

  /**
   * Returns sorted rankings for a given tab ('national' or 'city'),
   * seamlessly inserting the player's best record into the ladder.
   */
  public getRankings(
    tab: 'national' | 'city',
    playerData?: {
      openId: string;
      nickname: string;
      cityName?: string;
      maxWave: number;
      score: number;
      commanderId: CommanderId;
    }
  ): { entries: LeaderboardEntry[]; playerRank: number | null } {
    const rawList = tab === 'national' ? [...this.nationalList] : [...this.cityList];

    // If player has a valid record (>0 wave), merge or update their entry
    if (playerData && playerData.maxWave > 0) {
      const existingIdx = rawList.findIndex(e => e.openId === playerData.openId);
      const title = EndlessManager.getMilitaryRankTier(playerData.maxWave).title;
      const playerEntry: Omit<LeaderboardEntry, 'rank'> = {
        openId: playerData.openId,
        nickname: playerData.nickname,
        cityName: playerData.cityName || DEFAULT_PLAYER_CITY,
        maxWave: playerData.maxWave,
        score: playerData.score,
        militaryTitle: title,
        commanderId: playerData.commanderId,
        timestamp: Date.now()
      };

      if (existingIdx !== -1) {
        if (playerData.maxWave >= rawList[existingIdx].maxWave) {
          rawList[existingIdx] = playerEntry;
        }
      } else {
        rawList.push(playerEntry);
      }
    }

    // Sort descending by maxWave first, then score
    rawList.sort((a, b) => {
      if (b.maxWave !== a.maxWave) return b.maxWave - a.maxWave;
      return b.score - a.score;
    });

    // Assign rank 1..N
    const entries: LeaderboardEntry[] = rawList.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    // Find player rank if provided
    let playerRank: number | null = null;
    if (playerData && playerData.maxWave > 0) {
      const found = entries.find(e => e.openId === playerData.openId);
      if (found) {
        playerRank = found.rank;
      }
    }

    return {
      entries: entries.slice(0, 10), // Top 10 display
      playerRank
    };
  }
}
