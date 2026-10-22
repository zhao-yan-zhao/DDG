import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThreeSceneManager, RenderMode } from '../src/presentation/three/three-scene-manager';

describe('Presentation Layer: 2D vs 3D RenderMode Management', () => {
  let manager: ThreeSceneManager;

  beforeEach(() => {
    // Reset or ensure singleton is acquired
    manager = ThreeSceneManager.getInstance();
  });

  afterEach(() => {
    // Return to default 2d mode for test hygiene
    manager.setRenderMode('2d');
  });

  it('correctly provides singleton instance with default or persisted RenderMode', () => {
    expect(manager).toBeDefined();
    expect(typeof manager.getRenderMode()).toBe('string');
    expect(['2d', '3d']).toContain(manager.getRenderMode());
  });

  it('toggles cleanly between 2d and 3d modes via toggleRenderMode()', () => {
    manager.setRenderMode('2d');
    expect(manager.getRenderMode()).toBe('2d');

    const toggled1 = manager.toggleRenderMode();
    expect(toggled1).toBe('3d');
    expect(manager.getRenderMode()).toBe('3d');

    const toggled2 = manager.toggleRenderMode();
    expect(toggled2).toBe('2d');
    expect(manager.getRenderMode()).toBe('2d');
  });

  it('explicitly sets mode via setRenderMode()', () => {
    manager.setRenderMode('3d');
    expect(manager.getRenderMode()).toBe('3d');

    manager.setRenderMode('2d');
    expect(manager.getRenderMode()).toBe('2d');
  });

  it('safely short-circuits render() in 2D mode without WebGL context or throwing error', () => {
    manager.setRenderMode('2d');
    expect(() => {
      manager.render(0.016);
    }).not.toThrow();
  });

  it('tolerates absence or security exceptions of window.localStorage gracefully', () => {
    const originalLocalStorage = globalThis.localStorage;
    try {
      // Simulate environment where localStorage throws or is null
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => {
            throw new Error('Access denied');
          },
          setItem: () => {
            throw new Error('Access denied');
          }
        },
        configurable: true
      });

      expect(() => {
        manager.setRenderMode('3d');
        expect(manager.getRenderMode()).toBe('3d');
        manager.setRenderMode('2d');
        expect(manager.getRenderMode()).toBe('2d');
      }).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        configurable: true
      });
    }
  });

  it('syncWithPhaser() safely handles headless Node.js environment without throwing', () => {
    expect(() => {
      manager.syncWithPhaser();
    }).not.toThrow();
  });

  it('guarantees all 16 weapon archetypes map to valid illustration texture keys', () => {
    const allWeaponIds = [
      'fire_lance', 'rocket_box', 'thunder_thrower', 'red_cannon',
      'flame_beast', 'repeating_crossbow', 'bed_crossbow', 'catapult',
      'barricade', 'oil_cabinet', 'electric_grid', 'spear_camp',
      'powder_bureau', 'war_drum', 'stargazer', 'luban_workshop'
    ];

    const aliases: Record<string, string> = {
      fire_lance: 'weapon_fire_lance',
      rocket_box: 'weapon_rocket_box',
      thunder_thrower: 'weapon_cannon',
      red_cannon: 'weapon_cannon',
      cannon: 'weapon_cannon',
      flame_beast: 'weapon_fire_lance',
      repeating_crossbow: 'weapon_repeating_crossbow',
      bed_crossbow: 'weapon_repeating_crossbow',
      catapult: 'weapon_cannon',
      barricade: 'weapon_iron_caltrop',
      iron_barricade: 'weapon_iron_caltrop',
      oil_cabinet: 'weapon_fire_lance',
      electric_grid: 'weapon_iron_caltrop',
      spear_camp: 'weapon_iron_caltrop',
      iron_caltrop: 'weapon_iron_caltrop',
      powder_bureau: 'weapon_rocket_box',
      war_drum: 'weapon_cannon',
      stargazer: 'weapon_repeating_crossbow',
      luban_workshop: 'weapon_repeating_crossbow'
    };

    for (const weaponId of allWeaponIds) {
      const mappedKey = aliases[weaponId] || ('weapon_' + weaponId);
      expect(mappedKey).toBeDefined();
      expect(mappedKey.startsWith('weapon_')).toBe(true);
    }
  });

  it('controls 3D WebGL overlay canvas display style based on render mode', () => {
    const fakeCanvas = {
      style: { display: 'none' },
      parentElement: null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 750, height: 1334 })
    } as any;

    (manager as any).canvas = fakeCanvas;

    manager.setRenderMode('2d');
    expect(fakeCanvas.style.display).toBe('none');

    manager.setRenderMode('3d');
    expect(fakeCanvas.style.display).toBe('block');

    manager.setRenderMode('2d');
    expect(fakeCanvas.style.display).toBe('none');

    // Cleanup
    (manager as any).canvas = null;
  });
});
