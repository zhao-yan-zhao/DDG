import { describe, it, expect, vi } from 'vitest';
import {
  UI_COLORS,
  UI_FONTS,
  UI_TEXTURE_KEYS,
  NINESLICE_PRESETS
} from '../src/presentation/ui/ui-theme';
import { UITextureFactory } from '../src/presentation/textures/ui-texture-factory';

describe('M_VJ1: National Tide Industrial UI Theme & Visual Specifications', () => {
  it('defines valid hex and numeric color constants for the national tide palette', () => {
    expect(UI_COLORS.goldBright).toBe('#ffd700');
    expect(UI_COLORS.goldBrightNum).toBe(0xffd700);
    expect(UI_COLORS.goldBevel).toBe('#e6c687');
    expect(UI_COLORS.goldDeep).toBe('#c59b27');
    expect(UI_COLORS.vermilionCinnabar).toBe('#b71c1c');
    expect(UI_COLORS.vermilionCinnabarNum).toBe(0xb71c1c);
    expect(UI_COLORS.vermilionDark).toBe('#8a2518');
    expect(UI_COLORS.xuanPaperLight).toBe('#221c17');
    expect(UI_COLORS.xuanPaperDark).toBe('#171410');
    expect(UI_COLORS.ironCyanGlow).toBe('#00e5ff');
    expect(UI_COLORS.ironSlateBody).toBe('#1b435e');
    expect(UI_COLORS.ironSlateDark).toBe('#0e2230');
    expect(UI_COLORS.scrollSilkNavy).toBe('#1a4968');
    expect(UI_COLORS.scrollWood).toBe('#4e2717');
  });

  it('defines authentic calligraphy and seal script font families', () => {
    expect(UI_FONTS.primary).toContain('KaiTi');
    expect(UI_FONTS.seal).toContain('KaiTi');
    expect(UI_FONTS.sans).toBe('sans-serif');
  });

  it('provides all required texture keys for M_VJ1 assets', () => {
    expect(UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE).toBe('ui_panel_xuan_bronze');
    expect(UI_TEXTURE_KEYS.CARD_BAMBOO).toBe('ui_card_bamboo');
    expect(UI_TEXTURE_KEYS.HEADER_BANNER).toBe('ui_header_banner');
    expect(UI_TEXTURE_KEYS.ICON_COIN_TONGBAO).toBe('icon_coin_tongbao');
    expect(UI_TEXTURE_KEYS.ICON_ORE_IRON).toBe('icon_ore_iron');
    expect(UI_TEXTURE_KEYS.ICON_BLUEPRINT_SCROLL).toBe('icon_blueprint_scroll');
    expect(UI_TEXTURE_KEYS.BTN_BRONZE_NORMAL).toBe('ui_btn_bronze_normal');
    expect(UI_TEXTURE_KEYS.BTN_BRONZE_HOVER).toBe('ui_btn_bronze_hover');
    expect(UI_TEXTURE_KEYS.BTN_BRONZE_PRESSED).toBe('ui_btn_bronze_pressed');
    expect(UI_TEXTURE_KEYS.BTN_BRONZE_RED).toBe('ui_btn_bronze_red');
    expect(UI_TEXTURE_KEYS.STAMP_DAJIE).toBe('stamp_dajie');
    expect(UI_TEXTURE_KEYS.STAMP_JIN_TANG).toBe('stamp_jin_tang');
    expect(UI_TEXTURE_KEYS.STAMP_JIA_DENG).toBe('stamp_jia_deng');
    expect(UI_TEXTURE_KEYS.STAMP_WUSHUANG).toBe('stamp_wushuang');
    expect(UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN).toBe('stamp_wang_shouren');
    expect(UI_TEXTURE_KEYS.STAMP_QIN_HUALI).toBe('stamp_qin_huali');
    expect(UI_TEXTURE_KEYS.STAMP_QIN_LIANGYU).toBe('stamp_qin_liangyu');
    expect(UI_TEXTURE_KEYS.STAMP_LIU_BOWEN).toBe('stamp_liu_bowen');
    expect(UI_TEXTURE_KEYS.AVATAR_WANG_SHOUREN).toBe('avatar_wang_shouren');
    expect(UI_TEXTURE_KEYS.AVATAR_QIN_HUALI).toBe('avatar_qin_huali');
    expect(UI_TEXTURE_KEYS.AVATAR_QIN_LIANGYU).toBe('avatar_qin_liangyu');
    expect(UI_TEXTURE_KEYS.AVATAR_LIU_BOWEN).toBe('avatar_liu_bowen');
  });

  it('defines correct NineSlice margin presets for panels, cards, and buttons', () => {
    expect(NINESLICE_PRESETS.PANEL_XUAN_BRONZE).toEqual({
      width: 160,
      height: 160,
      leftWidth: 40,
      rightWidth: 40,
      topHeight: 40,
      bottomHeight: 40
    });

    expect(NINESLICE_PRESETS.CARD_BAMBOO).toEqual({
      width: 128,
      height: 128,
      leftWidth: 24,
      rightWidth: 24,
      topHeight: 24,
      bottomHeight: 24
    });

    expect(NINESLICE_PRESETS.BUTTON_BRONZE).toEqual({
      width: 180,
      height: 56,
      leftWidth: 16,
      rightWidth: 16,
      topHeight: 16,
      bottomHeight: 16
    });
  });

  it('UITextureFactory registers all procedural textures through TextureManager without throw', () => {
    const existingTextures = new Set<string>();
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
      set strokeStyle(val: string) {},
      set fillStyle(val: any) {},
      set lineWidth(val: number) {},
      set font(val: string) {},
      set textAlign(val: string) {},
      set textBaseline(val: string) {}
    };

    const mockScene = {
      textures: {
        exists: vi.fn((key: string) => existingTextures.has(key)),
        createCanvas: vi.fn((key: string, _w: number, _h: number) => {
          existingTextures.add(key);
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

    // Verify all keys were generated and refreshed
    const requiredKeys = Object.values(UI_TEXTURE_KEYS);
    for (const key of requiredKeys) {
      expect(existingTextures.has(key)).toBe(true);
      expect(refreshedTextures.has(key)).toBe(true);
    }

    // Calling a second time should guard against re-creation
    const callCountBefore = mockScene.textures.createCanvas.mock.calls.length;
    UITextureFactory.generateAll(mockScene);
    const callCountAfter = mockScene.textures.createCanvas.mock.calls.length;
    expect(callCountAfter).toBe(callCountBefore);
  });
});
