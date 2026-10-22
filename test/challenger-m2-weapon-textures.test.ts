/**
 * 《孤城神机营》- Empirical Challenger Verification Suite: Weapon Textures & Aliasing
 *
 * MISSION:
 * Adversarial stress-testing of WeaponTextureFactory and all 4 faction procedural texture generators:
 * 1. Canonical weapon key resolution (all 16 weapons in WEAPON_CONFIGS)
 * 2. Backward compatibility aliases (e.g. cannon, weapon_cannon, iron_caltrop, oil_cabinet, etc.)
 * 3. Exact multi-cell footprint dimensions (1x1: 72x72, 1x2: 72x144, 2x1: 144x72, 2x2: 144x144)
 * 4. Procedural drawing verification (ensures authentic Canvas 2D drawing calls, not empty stubs)
 * 5. Idempotence & stress testing (repeated generateAll execution, existing texture collision)
 * 6. Edge cases & defensive programming (null/undefined scene, invalid keys, spaces)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =========================================================================
// Mock Phaser Environment for Headless Vitest
// =========================================================================
vi.mock('phaser', () => {
  return {
    default: {
      GameObjects: {
        GameObject: class {},
        Container: class {},
        Sprite: class {},
        Image: class {},
        Graphics: class {},
        Text: class {}
      }
    }
  };
});

import {
  WeaponTextureFactory,
  ALL_WEAPON_TEXTURE_KEYS,
  BACKWARD_COMPAT_WEAPON_ALIASES
} from '../src/presentation/textures/weapon-texture-factory';
import {
  SHENJI_WEAPON_TEXTURE_KEYS,
  generateShenjiTextures,
  createWeaponCanvas,
  createFireLance,
  createRocketBox,
  createThunderThrower,
  createRedCannon
} from '../src/presentation/textures/weapon-shenji-textures';
import {
  MOHIST_WEAPON_TEXTURE_KEYS,
  generateMohistTextures,
  createFlameBeast,
  createRepeatingCrossbow,
  createBedCrossbow,
  createCatapult
} from '../src/presentation/textures/weapon-mohist-textures';
import {
  FORTRESS_WEAPON_TEXTURE_KEYS,
  generateFortressTextures,
  createBarricade,
  createOilCabinet,
  createElectricGrid,
  createSpearCamp
} from '../src/presentation/textures/weapon-fortress-textures';
import {
  QIMEN_WEAPON_TEXTURE_KEYS,
  generateQimenTextures,
  createPowderBureau,
  createWarDrum,
  createStargazer,
  createLubanWorkshop
} from '../src/presentation/textures/weapon-qimen-textures';
import { WEAPON_CONFIGS } from '../src/config/weapons.config';

describe('Challenger M2_1: Empirical Verification of Weapon Textures & Aliasing', () => {
  let createdCanvases: Map<string, { width: number; height: number; context: any; commands: any[] }>;
  let mockScene: any;

  function createMockCanvas(w: number, h: number) {
    const commands: any[] = [];
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      fillRect: vi.fn((x, y, w, h) => commands.push({ type: 'fillRect', x, y, w, h })),
      strokeRect: vi.fn((x, y, w, h) => commands.push({ type: 'strokeRect', x, y, w, h })),
      beginPath: vi.fn(() => commands.push({ type: 'beginPath' })),
      closePath: vi.fn(() => commands.push({ type: 'closePath' })),
      arc: vi.fn((x, y, r, sa, ea) => commands.push({ type: 'arc', x, y, r, sa, ea })),
      ellipse: vi.fn((x, y, rx, ry, rot, sa, ea) => commands.push({ type: 'ellipse', x, y, rx, ry, rot, sa, ea })),
      moveTo: vi.fn((x, y) => commands.push({ type: 'moveTo', x, y })),
      lineTo: vi.fn((x, y) => commands.push({ type: 'lineTo', x, y })),
      quadraticCurveTo: vi.fn((cpx, cpy, x, y) => commands.push({ type: 'quadraticCurveTo', cpx, cpy, x, y })),
      stroke: vi.fn(() => commands.push({ type: 'stroke' })),
      fill: vi.fn(() => commands.push({ type: 'fill' })),
      drawImage: vi.fn((img, dx, dy) => commands.push({ type: 'drawImage', img, dx, dy })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
    };

    return {
      width: w,
      height: h,
      context: ctx,
      commands,
      refresh: vi.fn(),
      getSourceImage: () => ({ width: w, height: h })
    };
  }

  beforeEach(() => {
    createdCanvases = new Map();
    mockScene = {
      textures: {
        exists: vi.fn((key: string) => createdCanvases.has(key)),
        createCanvas: vi.fn((key: string, w: number, h: number) => {
          const c = createMockCanvas(w, h);
          createdCanvases.set(key, c);
          return c;
        }),
        get: vi.fn((key: string) => createdCanvases.get(key) || null)
      }
    };
  });

  // =========================================================================
  // Section 1: Canonical 16 Weapon Configuration Matrix
  // =========================================================================
  describe('1. Canonical Weapon Key Resolution & Coverage', () => {
    const canonicalWeaponIds = Object.keys(WEAPON_CONFIGS);

    it('verifies exact count of 16 canonical weapons in WEAPON_CONFIGS', () => {
      expect(canonicalWeaponIds).toHaveLength(16);
    });

    it('maps every canonical weapon configId to a valid texture key starting with weapon_', () => {
      for (const configId of canonicalWeaponIds) {
        const textureKey = WeaponTextureFactory.getTextureKey(configId);
        expect(textureKey).toBeDefined();
        expect(typeof textureKey).toBe('string');
        expect(textureKey.startsWith('weapon_')).toBe(true);
        expect(textureKey).toBe(`weapon_${configId}`);
      }
    });

    it('resolves all 16 weapon IDs when already prefixed with weapon_', () => {
      for (const configId of canonicalWeaponIds) {
        const prefixedId = `weapon_${configId}`;
        const textureKey = WeaponTextureFactory.getTextureKey(prefixedId);
        expect(textureKey).toBe(`weapon_${configId}`);
      }
    });

    it('resolves all 4 Shenji weapon keys accurately', () => {
      expect(WeaponTextureFactory.getTextureKey('fire_lance')).toBe(SHENJI_WEAPON_TEXTURE_KEYS.FIRE_LANCE);
      expect(WeaponTextureFactory.getTextureKey('rocket_box')).toBe(SHENJI_WEAPON_TEXTURE_KEYS.ROCKET_BOX);
      expect(WeaponTextureFactory.getTextureKey('thunder_thrower')).toBe(SHENJI_WEAPON_TEXTURE_KEYS.THUNDER_THROWER);
      expect(WeaponTextureFactory.getTextureKey('red_cannon')).toBe(SHENJI_WEAPON_TEXTURE_KEYS.RED_CANNON);
    });

    it('resolves all 4 Mohist weapon keys accurately', () => {
      expect(WeaponTextureFactory.getTextureKey('flame_beast')).toBe(MOHIST_WEAPON_TEXTURE_KEYS.FLAME_BEAST);
      expect(WeaponTextureFactory.getTextureKey('repeating_crossbow')).toBe(MOHIST_WEAPON_TEXTURE_KEYS.REPEATING_CROSSBOW);
      expect(WeaponTextureFactory.getTextureKey('bed_crossbow')).toBe(MOHIST_WEAPON_TEXTURE_KEYS.BED_CROSSBOW);
      expect(WeaponTextureFactory.getTextureKey('catapult')).toBe(MOHIST_WEAPON_TEXTURE_KEYS.CATAPULT);
    });

    it('resolves all 4 Fortress weapon keys accurately', () => {
      expect(WeaponTextureFactory.getTextureKey('barricade')).toBe(FORTRESS_WEAPON_TEXTURE_KEYS.BARRICADE);
      expect(WeaponTextureFactory.getTextureKey('oil_cabinet')).toBe(FORTRESS_WEAPON_TEXTURE_KEYS.OIL_CABINET);
      expect(WeaponTextureFactory.getTextureKey('electric_grid')).toBe(FORTRESS_WEAPON_TEXTURE_KEYS.ELECTRIC_GRID);
      expect(WeaponTextureFactory.getTextureKey('spear_camp')).toBe(FORTRESS_WEAPON_TEXTURE_KEYS.SPEAR_CAMP);
    });

    it('resolves all 4 Qimen weapon keys accurately', () => {
      expect(WeaponTextureFactory.getTextureKey('powder_bureau')).toBe(QIMEN_WEAPON_TEXTURE_KEYS.POWDER_BUREAU);
      expect(WeaponTextureFactory.getTextureKey('war_drum')).toBe(QIMEN_WEAPON_TEXTURE_KEYS.WAR_DRUM);
      expect(WeaponTextureFactory.getTextureKey('stargazer')).toBe(QIMEN_WEAPON_TEXTURE_KEYS.STARGAZER);
      expect(WeaponTextureFactory.getTextureKey('luban_workshop')).toBe(QIMEN_WEAPON_TEXTURE_KEYS.LUBAN_WORKSHOP);
    });
  });

  // =========================================================================
  // Section 2: Backward Compatibility Aliases & Robustness
  // =========================================================================
  describe('2. Backward Compatibility Aliases & Input Robustness', () => {
    it('maps legacy cannon aliases cleanly to red_cannon without errors', () => {
      expect(WeaponTextureFactory.getTextureKey('cannon')).toBe('weapon_red_cannon');
      expect(WeaponTextureFactory.getTextureKey('weapon_cannon')).toBe('weapon_red_cannon');
    });

    it('maps legacy iron_caltrop aliases cleanly to barricade without errors', () => {
      expect(WeaponTextureFactory.getTextureKey('iron_caltrop')).toBe('weapon_barricade');
      expect(WeaponTextureFactory.getTextureKey('weapon_iron_caltrop')).toBe('weapon_barricade');
      expect(WeaponTextureFactory.getTextureKey('iron_barricade')).toBe('weapon_barricade');
      expect(WeaponTextureFactory.getTextureKey('weapon_iron_barricade')).toBe('weapon_barricade');
    });

    it('maps oil_cabinet and weapon_oil_cabinet cleanly without errors', () => {
      expect(WeaponTextureFactory.getTextureKey('oil_cabinet')).toBe('weapon_oil_cabinet');
      expect(WeaponTextureFactory.getTextureKey('weapon_oil_cabinet')).toBe('weapon_oil_cabinet');
    });

    it('tolerates leading and trailing whitespace', () => {
      expect(WeaponTextureFactory.getTextureKey('  cannon  ')).toBe('weapon_red_cannon');
      expect(WeaponTextureFactory.getTextureKey('   iron_caltrop\t')).toBe('weapon_barricade');
      expect(WeaponTextureFactory.getTextureKey('\n  catapult  \n')).toBe('weapon_catapult');
    });

    it('handles empty, null, and undefined inputs with fallback to weapon_fire_lance', () => {
      expect(WeaponTextureFactory.getTextureKey('')).toBe('weapon_fire_lance');
      expect(WeaponTextureFactory.getTextureKey(null as any)).toBe('weapon_fire_lance');
      expect(WeaponTextureFactory.getTextureKey(undefined as any)).toBe('weapon_fire_lance');
    });

    it('empirically reveals edge case: whitespace-only input returns "weapon_" due to pre-trim check', () => {
      // NOTE (Challenger finding): if (!configId) check occurs before configId.trim(),
      // so '   ' passes truthy check, trims to '', and hits default: 'weapon_' + ''
      expect(WeaponTextureFactory.getTextureKey('   ')).toBe('weapon_');
    });

    it('falls back to weapon_ + rawId for unregistered weapon keys', () => {
      expect(WeaponTextureFactory.getTextureKey('flying_dagger')).toBe('weapon_flying_dagger');
      expect(WeaponTextureFactory.getTextureKey('weapon_mystic_staff')).toBe('weapon_mystic_staff');
    });
  });

  // =========================================================================
  // Section 3: Procedural Generation & Multi-Cell Footprint Invariants
  // =========================================================================
  describe('3. Multi-Cell Footprint Invariants & Canvas Allocation', () => {
    it('generates all 16 canonical textures and all 5 alias canvases on generateAll()', () => {
      WeaponTextureFactory.generateAll(mockScene);

      // Verify all 16 canonical keys exist
      for (const key of Object.values(ALL_WEAPON_TEXTURE_KEYS)) {
        expect(createdCanvases.has(key)).toBe(true);
      }

      // Verify all 5 alias keys exist
      for (const aliasKey of Object.keys(BACKWARD_COMPAT_WEAPON_ALIASES)) {
        expect(createdCanvases.has(aliasKey)).toBe(true);
      }

      // Exactly 16 + 5 = 21 textures
      expect(createdCanvases.size).toBe(21);
    });

    it('validates 1x1 footprints match 72x72 px', () => {
      WeaponTextureFactory.generateAll(mockScene);

      const oneByOneKeys = [
        'weapon_fire_lance',
        'weapon_rocket_box',
        'weapon_thunder_thrower',
        'weapon_flame_beast',
        'weapon_repeating_crossbow',
        'weapon_barricade',
        'weapon_oil_cabinet',
        'weapon_electric_grid',
        'weapon_spear_camp',
        'weapon_powder_bureau',
        'weapon_stargazer',
        'weapon_luban_workshop'
      ];

      for (const key of oneByOneKeys) {
        const canvas = createdCanvases.get(key)!;
        expect(canvas).toBeDefined();
        expect(canvas.width).toBe(72);
        expect(canvas.height).toBe(72);
      }
    });

    it('validates 1x2 red_cannon and its aliases match 72x144 px', () => {
      WeaponTextureFactory.generateAll(mockScene);

      const redCannon = createdCanvases.get('weapon_red_cannon')!;
      expect(redCannon.width).toBe(72);
      expect(redCannon.height).toBe(144);

      // Aliases to red_cannon should inherit 72x144 dimensions from target
      const weaponCannonAlias = createdCanvases.get('weapon_cannon')!;
      expect(weaponCannonAlias.width).toBe(72);
      expect(weaponCannonAlias.height).toBe(144);

      const cannonAlias = createdCanvases.get('cannon')!;
      expect(cannonAlias.width).toBe(72);
      expect(cannonAlias.height).toBe(144);
    });

    it('validates 2x1 bed_crossbow and war_drum match 144x72 px', () => {
      WeaponTextureFactory.generateAll(mockScene);

      const bedCrossbow = createdCanvases.get('weapon_bed_crossbow')!;
      expect(bedCrossbow.width).toBe(144);
      expect(bedCrossbow.height).toBe(72);

      const warDrum = createdCanvases.get('weapon_war_drum')!;
      expect(warDrum.width).toBe(144);
      expect(warDrum.height).toBe(72);
    });

    it('validates 2x2 catapult matches 144x144 px', () => {
      WeaponTextureFactory.generateAll(mockScene);

      const catapult = createdCanvases.get('weapon_catapult')!;
      expect(catapult.width).toBe(144);
      expect(catapult.height).toBe(144);
    });

    it('verifies strict alignment between WEAPON_CONFIGS footprint and generated texture dimensions', () => {
      WeaponTextureFactory.generateAll(mockScene);

      for (const [id, config] of Object.entries(WEAPON_CONFIGS)) {
        const textureKey = WeaponTextureFactory.getTextureKey(id);
        const canvas = createdCanvases.get(textureKey);
        expect(canvas).toBeDefined();

        const fp = config.stars[1].footprint;
        const expectedW = fp.width * 72;
        const expectedH = fp.height * 72;

        expect(canvas!.width).toBe(expectedW);
        expect(canvas!.height).toBe(expectedH);
      }
    });
  });

  // =========================================================================
  // Section 4: Individual Faction Procedural Drawing Verification
  // =========================================================================
  describe('4. Authentic Procedural Drawing Execution (Non-Empty Stubs)', () => {
    it('executes Shenji faction drawing operations with real Canvas 2D calls', () => {
      generateShenjiTextures(mockScene);

      const fireLance = createdCanvases.get(SHENJI_WEAPON_TEXTURE_KEYS.FIRE_LANCE)!;
      expect(fireLance.commands.length).toBeGreaterThan(5);
      expect(fireLance.commands.some(c => c.type === 'stroke')).toBe(true);
      expect(fireLance.commands.some(c => c.type === 'fill')).toBe(true);

      const redCannon = createdCanvases.get(SHENJI_WEAPON_TEXTURE_KEYS.RED_CANNON)!;
      expect(redCannon.commands.some(c => c.type === 'ellipse')).toBe(true); // Bore ellipse
      expect(redCannon.commands.some(c => c.type === 'fillRect')).toBe(true);
    });

    it('executes Mohist faction drawing operations with real Canvas 2D calls', () => {
      generateMohistTextures(mockScene);

      const flameBeast = createdCanvases.get(MOHIST_WEAPON_TEXTURE_KEYS.FLAME_BEAST)!;
      expect(flameBeast.commands.some(c => c.type === 'arc')).toBe(true);
      expect(flameBeast.commands.some(c => c.type === 'fillRect')).toBe(true);

      const catapult = createdCanvases.get(MOHIST_WEAPON_TEXTURE_KEYS.CATAPULT)!;
      expect(catapult.commands.some(c => c.type === 'strokeRect')).toBe(true);
      expect(catapult.commands.some(c => c.type === 'lineTo')).toBe(true);
    });

    it('executes Fortress faction drawing operations with real Canvas 2D calls', () => {
      generateFortressTextures(mockScene);

      const barricade = createdCanvases.get(FORTRESS_WEAPON_TEXTURE_KEYS.BARRICADE)!;
      expect(barricade.commands.some(c => c.type === 'lineTo')).toBe(true);

      const electricGrid = createdCanvases.get(FORTRESS_WEAPON_TEXTURE_KEYS.ELECTRIC_GRID)!;
      expect(electricGrid.commands.some(c => c.type === 'strokeRect')).toBe(true);
    });

    it('executes Qimen faction drawing operations with real Canvas 2D calls', () => {
      generateQimenTextures(mockScene);

      const warDrum = createdCanvases.get(QIMEN_WEAPON_TEXTURE_KEYS.WAR_DRUM)!;
      expect(warDrum.commands.some(c => c.type === 'arc')).toBe(true); // Bagua symbol
      expect(warDrum.commands.some(c => c.type === 'fillRect')).toBe(true);

      const stargazer = createdCanvases.get(QIMEN_WEAPON_TEXTURE_KEYS.STARGAZER)!;
      expect(stargazer.commands.some(c => c.type === 'ellipse')).toBe(true); // Armillary rings
    });

    it('executes individual standalone generator functions safely', () => {
      const standaloneScene = {
        textures: {
          exists: vi.fn((k: string) => createdCanvases.has(k)),
          createCanvas: vi.fn((k: string, w: number, h: number) => {
            const c = createMockCanvas(w, h);
            createdCanvases.set(k, c);
            return c;
          })
        }
      };

      createFireLance(standaloneScene as any);
      createRocketBox(standaloneScene as any);
      createThunderThrower(standaloneScene as any);
      createRedCannon(standaloneScene as any);
      createFlameBeast(standaloneScene as any);
      createRepeatingCrossbow(standaloneScene as any);
      createBedCrossbow(standaloneScene as any);
      createCatapult(standaloneScene as any);
      createBarricade(standaloneScene as any);
      createOilCabinet(standaloneScene as any);
      createElectricGrid(standaloneScene as any);
      createSpearCamp(standaloneScene as any);
      createPowderBureau(standaloneScene as any);
      createWarDrum(standaloneScene as any);
      createStargazer(standaloneScene as any);
      createLubanWorkshop(standaloneScene as any);

      expect(createdCanvases.size).toBe(16);
    });
  });

  // =========================================================================
  // Section 5: Idempotence & Stress Testing
  // =========================================================================
  describe('5. Idempotence & Collision Resistance', () => {
    it('is strictly idempotent when generateAll is called multiple times in rapid succession', () => {
      WeaponTextureFactory.generateAll(mockScene);
      const initialSize = createdCanvases.size;
      const initialCreateCalls = mockScene.textures.createCanvas.mock.calls.length;

      // Repeat 5 times
      for (let i = 0; i < 5; i++) {
        WeaponTextureFactory.generateAll(mockScene);
      }

      expect(createdCanvases.size).toBe(initialSize);
      // No additional createCanvas calls should have been made
      expect(mockScene.textures.createCanvas.mock.calls.length).toBe(initialCreateCalls);
    });

    it('does not overwrite pre-existing textures created before generateAll', () => {
      // Pre-seed an existing texture
      const preExisting = createMockCanvas(64, 64);
      createdCanvases.set('weapon_fire_lance', preExisting);

      WeaponTextureFactory.generateAll(mockScene);

      // The pre-existing canvas must remain untouched
      const current = createdCanvases.get('weapon_fire_lance');
      expect(current).toBe(preExisting);
      expect(current!.width).toBe(64); // preserved original width
    });
  });

  // =========================================================================
  // Section 6: Defensive Programming & Null-Safety
  // =========================================================================
  describe('6. Defensive Programming & Failure Isolation', () => {
    it('safely handles null or undefined scene without crashing', () => {
      expect(() => WeaponTextureFactory.generateAll(null as any)).not.toThrow();
      expect(() => WeaponTextureFactory.generateAll(undefined as any)).not.toThrow();
    });

    it('safely handles scene with missing textures manager without crashing', () => {
      expect(() => WeaponTextureFactory.generateAll({} as any)).not.toThrow();
      expect(() => WeaponTextureFactory.generateAll({ textures: null } as any)).not.toThrow();
    });

    it('safely handles createCanvas returning null (e.g. out of memory)', () => {
      const failingScene = {
        textures: {
          exists: vi.fn(() => false),
          createCanvas: vi.fn(() => null),
          get: vi.fn(() => null)
        }
      };

      expect(() => WeaponTextureFactory.generateAll(failingScene as any)).not.toThrow();
    });

    it('createWeaponCanvas safely no-ops on null scene or existing texture', () => {
      expect(() => createWeaponCanvas(null as any, 'dummy', 72, 72, () => {})).not.toThrow();

      createdCanvases.set('existing_key', createMockCanvas(72, 72));
      const drawFn = vi.fn();
      createWeaponCanvas(mockScene, 'existing_key', 72, 72, drawFn);
      expect(drawFn).not.toHaveBeenCalled();
    });
  });
});
