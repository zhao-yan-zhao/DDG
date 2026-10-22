import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UI_TEXTURE_KEYS } from '../src/presentation/ui/ui-theme';
import { UITextureFactory } from '../src/presentation/textures/ui-texture-factory';
import { ProfileStorage } from '../src/core/meta/profile-storage';
import { WebPlatform } from '../src/bridge/web-platform';
import { PlayerProfile } from '../src/core/meta/types';
import { getCommanderConfig, ALL_COMMANDERS } from '../src/config/commanders.config';
import { Commander } from '../src/core/commander/commander';

describe('Track 2: Commander Presentation & Texture Specifications Suite', () => {
  let mockPlatform: WebPlatform;
  let profileStorage: ProfileStorage;
  let testProfile: PlayerProfile;

  beforeEach(() => {
    mockPlatform = new WebPlatform();
    profileStorage = new ProfileStorage(mockPlatform);
    testProfile = profileStorage.loadProfile();
  });

  describe('Part 1: UI Texture Constants for Four Grand Commanders', () => {
    it('defines texture keys for all 4 authentic Xuande vermilion seals', () => {
      expect(UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN).toBe('stamp_wang_shouren');
      expect(UI_TEXTURE_KEYS.STAMP_QIN_HUALI).toBe('stamp_qin_huali');
      expect(UI_TEXTURE_KEYS.STAMP_QIN_LIANGYU).toBe('stamp_qin_liangyu');
      expect(UI_TEXTURE_KEYS.STAMP_LIU_BOWEN).toBe('stamp_liu_bowen');
    });

    it('defines texture keys for all 4 commander circular avatar badges', () => {
      expect(UI_TEXTURE_KEYS.AVATAR_WANG_SHOUREN).toBe('avatar_wang_shouren');
      expect(UI_TEXTURE_KEYS.AVATAR_QIN_HUALI).toBe('avatar_qin_huali');
      expect(UI_TEXTURE_KEYS.AVATAR_QIN_LIANGYU).toBe('avatar_qin_liangyu');
      expect(UI_TEXTURE_KEYS.AVATAR_LIU_BOWEN).toBe('avatar_liu_bowen');
    });

    it('generates procedural canvas textures for all stamps and avatars without throwing', () => {
      const generatedTextures = new Set<string>();
      const refreshedTextures = new Set<string>();

      const mockCtx = {
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        clip: vi.fn(),
        fillText: vi.fn(),
        set strokeStyle(_v: string) {},
        set fillStyle(_v: any) {},
        set lineWidth(_v: number) {},
        set font(_v: string) {},
        set textAlign(_v: string) {},
        set textBaseline(_v: string) {}
      };

      const mockScene = {
        textures: {
          exists: vi.fn((key: string) => generatedTextures.has(key)),
          createCanvas: vi.fn((key: string, _w: number, _h: number) => {
            generatedTextures.add(key);
            return {
              context: mockCtx,
              refresh: () => {
                refreshedTextures.add(key);
              }
            };
          })
        }
      } as any;

      UITextureFactory.generateAll(mockScene);

      // Verify all 4 stamps generated
      expect(generatedTextures.has(UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN)).toBe(true);
      expect(generatedTextures.has(UI_TEXTURE_KEYS.STAMP_QIN_HUALI)).toBe(true);
      expect(generatedTextures.has(UI_TEXTURE_KEYS.STAMP_QIN_LIANGYU)).toBe(true);
      expect(generatedTextures.has(UI_TEXTURE_KEYS.STAMP_LIU_BOWEN)).toBe(true);

      // Verify all 4 avatars generated
      expect(generatedTextures.has(UI_TEXTURE_KEYS.AVATAR_WANG_SHOUREN)).toBe(true);
      expect(generatedTextures.has(UI_TEXTURE_KEYS.AVATAR_QIN_HUALI)).toBe(true);
      expect(generatedTextures.has(UI_TEXTURE_KEYS.AVATAR_QIN_LIANGYU)).toBe(true);
      expect(generatedTextures.has(UI_TEXTURE_KEYS.AVATAR_LIU_BOWEN)).toBe(true);
    });
  });

  describe('Part 2: Commander Switching & Profile Storage Persistence', () => {
    it('initializes default profile with Wang Shouren as active commander', () => {
      expect(testProfile.selectedCommander).toBe('wang_shouren');
    });

    it('switches commander to Qin Huali and persists cleanly', () => {
      testProfile.selectedCommander = 'qin_huali';
      profileStorage.saveProfile(testProfile);

      const reloaded = profileStorage.loadProfile();
      expect(reloaded.selectedCommander).toBe('qin_huali');
    });

    it('switches commander to Qin Liangyu and persists cleanly', () => {
      testProfile.selectedCommander = 'qin_liangyu';
      profileStorage.saveProfile(testProfile);

      const reloaded = profileStorage.loadProfile();
      expect(reloaded.selectedCommander).toBe('qin_liangyu');
    });

    it('switches commander to Liu Bowen and persists cleanly', () => {
      testProfile.selectedCommander = 'liu_bowen';
      profileStorage.saveProfile(testProfile);

      const reloaded = profileStorage.loadProfile();
      expect(reloaded.selectedCommander).toBe('liu_bowen');
    });
  });

  describe('Part 3: Four Commanders Configuration & Ultimate Specifications', () => {
    it('verifies all 4 commanders are present in ALL_COMMANDERS', () => {
      expect(ALL_COMMANDERS.length).toBe(4);
      const ids = ALL_COMMANDERS.map(c => c.id);
      expect(ids).toContain('wang_shouren');
      expect(ids).toContain('qin_huali');
      expect(ids).toContain('qin_liangyu');
      expect(ids).toContain('liu_bowen');
    });

    it('Wang Shouren: 知行合一·万炮齐发 specifications match presentation expectations', () => {
      const cmd = getCommanderConfig('wang_shouren');
      expect(cmd.title).toBe('阳明先生');
      expect(cmd.factionAffinity).toBe('fire');
      expect(cmd.passive.fireAtkBonus).toBe(0.20);
      expect(cmd.ultimate.name).toContain('万炮齐发');
      expect(cmd.ultimate.reloadSpeedBonus).toBe(1.50);
      expect(cmd.ultimate.resetAllWeaponCooldowns).toBe(true);
    });

    it('Qin Huali: 兼爱非攻·铁壁天幕 specifications match presentation expectations', () => {
      const cmd = getCommanderConfig('qin_huali');
      expect(cmd.title).toBe('墨家巨子');
      expect(cmd.factionAffinity).toBe('mohist');
      expect(cmd.ultimate.name).toContain('铁壁天幕');
      expect(cmd.ultimate.duration).toBe(6.0);
      expect(cmd.ultimate.barrierHp).toBe(2000);
      expect(cmd.ultimate.reflectMeleeRatio).toBe(1.0);
    });

    it('Qin Liangyu: 铁骑勤王·八面合围 specifications match presentation expectations', () => {
      const cmd = getCommanderConfig('qin_liangyu');
      expect(cmd.title).toBe('白杆巾帼');
      expect(cmd.factionAffinity).toBe('fortress');
      expect(cmd.ultimate.name).toContain('铁骑勤王');
      expect(cmd.ultimate.damage).toBe(500);
      expect(cmd.ultimate.cavalryCount).toBe(8);
      expect(cmd.ultimate.knockbackDistance).toBe(3.0);
    });

    it('Liu Bowen: 奇门遁甲·天雷九烈 specifications match presentation expectations', () => {
      const cmd = getCommanderConfig('liu_bowen');
      expect(cmd.title).toBe('诚意国师');
      expect(cmd.factionAffinity).toBe('qimen');
      expect(cmd.ultimate.name).toContain('天雷九烈');
      expect(cmd.ultimate.damage).toBe(300);
      expect(cmd.ultimate.lightningStrikes).toBe(9);
      expect(cmd.ultimate.inflictsShock).toBe(true);
    });

    it('Commander entity properly models rage accumulation and ultimate execution', () => {
      const cmd = new Commander('liu_bowen');
      expect(cmd.canCastUltimate()).toBe(false);
      cmd.addRage(100);
      expect(cmd.canCastUltimate()).toBe(true);
      const res = cmd.castUltimate();
      expect(res.success).toBe(true);
      expect(cmd.rage).toBe(0);
    });
  });
});
