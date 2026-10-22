/**
 * 《孤城神机营》- UI National Tide Industrial Visual Theme
 * Definitions for color palettes, typography, NineSlice margins, and texture key constants.
 */

export const UI_COLORS = {
  // Bronze & Gold
  goldBright: '#ffd700',
  goldBrightNum: 0xffd700,
  goldBevel: '#e6c687',
  goldBevelNum: 0xe6c687,
  goldDeep: '#c59b27',
  goldDeepNum: 0xc59b27,
  goldMuted: '#a37c22',
  goldMutedNum: 0xa37c22,
  bronzeBody: '#4a3728',
  bronzeBodyNum: 0x4a3728,
  bronzeLight: '#6d5138',
  bronzeLightNum: 0x6d5138,
  bronzeDark: '#2c1e13',
  bronzeDarkNum: 0x2c1e13,
  bronzeShadow: '#160e09',
  bronzeShadowNum: 0x160e09,

  // Vermilion & Cinnabar Seal
  vermilionBright: '#d32f2f',
  vermilionBrightNum: 0xd32f2f,
  vermilionCinnabar: '#b71c1c',
  vermilionCinnabarNum: 0xb71c1c,
  vermilionDark: '#8a2518',
  vermilionDarkNum: 0x8a2518,
  vermilionDeep: '#531010',
  vermilionDeepNum: 0x531010,

  // Xuan Paper & Ink
  xuanPaperLight: '#221c17',
  xuanPaperLightNum: 0x221c17,
  xuanPaperDark: '#171410',
  xuanPaperDarkNum: 0x171410,
  xuanInkBlack: '#0c0a08',
  xuanInkBlackNum: 0x0c0a08,

  // Xuan Iron Ore & Ionizing Glow
  ironCyanGlow: '#00e5ff',
  ironCyanGlowNum: 0x00e5ff,
  ironCyanRidge: '#80deea',
  ironCyanRidgeNum: 0x80deea,
  ironSlateBody: '#1b435e',
  ironSlateBodyNum: 0x1b435e,
  ironSlateDark: '#0e2230',
  ironSlateDarkNum: 0x0e2230,

  // Divine Blueprint Silk & Brocade
  scrollSilkNavy: '#1a4968',
  scrollSilkNavyNum: 0x1a4968,
  scrollSilkDark: '#122b3d',
  scrollSilkDarkNum: 0x122b3d,
  scrollWood: '#4e2717',
  scrollWoodNum: 0x4e2717,
  scrollRibbon: '#c62828',
  scrollRibbonNum: 0xc62828,

  // Jade Accent
  jadeBright: '#26a69a',
  jadeBrightNum: 0x26a69a,
  jadeDark: '#004d40',
  jadeDarkNum: 0x004d40,

  // Neutral UI text & lines
  textLight: '#ffffff',
  textMuted: '#cfd8dc',
  textDim: '#90a4ae',
  borderGold: '#ffd54f'
} as const;

export const UI_FONTS = {
  primary: 'KaiTi, STKaiti, SimKai, "Microsoft YaHei", sans-serif',
  seal: 'KaiTi, STKaiti, SimKai, serif',
  sans: 'sans-serif'
} as const;

export const UI_TEXTURE_KEYS = {
  PANEL_XUAN_BRONZE: 'ui_panel_xuan_bronze',
  CARD_BAMBOO: 'ui_card_bamboo',
  HEADER_BANNER: 'ui_header_banner',
  ICON_COIN_TONGBAO: 'icon_coin_tongbao',
  ICON_ORE_IRON: 'icon_ore_iron',
  ICON_BLUEPRINT_SCROLL: 'icon_blueprint_scroll',
  BTN_BRONZE_NORMAL: 'ui_btn_bronze_normal',
  BTN_BRONZE_HOVER: 'ui_btn_bronze_hover',
  BTN_BRONZE_PRESSED: 'ui_btn_bronze_pressed',
  BTN_BRONZE_RED: 'ui_btn_bronze_red',
  STAMP_DAJIE: 'stamp_dajie',
  STAMP_JIN_TANG: 'stamp_jin_tang',
  STAMP_JIA_DENG: 'stamp_jia_deng',
  STAMP_WUSHUANG: 'stamp_wushuang',
  STAMP_WANG_SHOUREN: 'stamp_wang_shouren',
  STAMP_QIN_HUALI: 'stamp_qin_huali',
  STAMP_QIN_LIANGYU: 'stamp_qin_liangyu',
  STAMP_LIU_BOWEN: 'stamp_liu_bowen',
  AVATAR_WANG_SHOUREN: 'avatar_wang_shouren',
  AVATAR_QIN_HUALI: 'avatar_qin_huali',
  AVATAR_QIN_LIANGYU: 'avatar_qin_liangyu',
  AVATAR_LIU_BOWEN: 'avatar_liu_bowen'
} as const;

export const NINESLICE_PRESETS = {
  PANEL_XUAN_BRONZE: {
    width: 160,
    height: 160,
    leftWidth: 40,
    rightWidth: 40,
    topHeight: 40,
    bottomHeight: 40
  },
  CARD_BAMBOO: {
    width: 128,
    height: 128,
    leftWidth: 24,
    rightWidth: 24,
    topHeight: 24,
    bottomHeight: 24
  },
  BUTTON_BRONZE: {
    width: 180,
    height: 56,
    leftWidth: 16,
    rightWidth: 16,
    topHeight: 16,
    bottomHeight: 16
  }
} as const;
