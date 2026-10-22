import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockScene {
    constructor(public config?: any) {}
  }
  return {
    default: {
      Scene: MockScene,
      GameObjects: {
        Container: class {},
        Graphics: class {},
        Sprite: class {}
      }
    }
  };
});

import { BENCH_CONFIG, TouchCoordinateMapper } from '../src/presentation/touch/touch-controller';
import { BattleScene } from '../src/presentation/scenes/battle-scene';

describe('Armory Pause & Bottom Bench Staging Suite', () => {
  it('BENCH_CONFIG is configured in the bottom tactical zone above the command bar (1145..1235)', () => {
    expect(BENCH_CONFIG.startY).toBe(1145);
    expect(BENCH_CONFIG.endY).toBe(1235);
    expect(BENCH_CONFIG.slotCount).toBe(5);
    expect(BENCH_CONFIG.slotSize).toBe(80);
    expect(BENCH_CONFIG.slotGap).toBe(16);
    expect(BENCH_CONFIG.startX).toBe(143);
  });

  it('TouchCoordinateMapper maps all 5 bench slots to bottom screen coordinates centered at Y=1190', () => {
    const expectedCenters = [183, 279, 375, 471, 567]; // startX + i * 96 + 40
    for (let i = 0; i < 5; i++) {
      const pos = TouchCoordinateMapper.benchSlotToScreen(i);
      expect(pos.y).toBe(1190);
      expect(pos.x).toBe(expectedCenters[i]);

      const resolved = TouchCoordinateMapper.screenToBenchSlot(pos);
      expect(resolved).toBe(i);
    }
  });

  it('screenToBenchSlot rejects touches outside the bottom bench area', () => {
    // Top area where bench was previously erroneously placed
    expect(TouchCoordinateMapper.screenToBenchSlot({ x: 375, y: 80 })).toBe(-1);
    expect(TouchCoordinateMapper.screenToBenchSlot({ x: 375, y: 150 })).toBe(-1);
    // Sand table area
    expect(TouchCoordinateMapper.screenToBenchSlot({ x: 375, y: 500 })).toBe(-1);
    // Ramp slope area
    expect(TouchCoordinateMapper.screenToBenchSlot({ x: 375, y: 900 })).toBe(-1);
    // Bottom command bar area
    expect(TouchCoordinateMapper.screenToBenchSlot({ x: 375, y: 1280 })).toBe(-1);
  });

  it('BattleScene exposes pauseBattle, resumeBattle, and isPaused methods', () => {
    const scene = new BattleScene();
    expect(scene.isPaused()).toBe(false);

    scene.pauseBattle();
    expect(scene.isPaused()).toBe(true);

    scene.resumeBattle();
    expect(scene.isPaused()).toBe(false);
  });

  it('BattleScene update early-returns immediately when isPaused is true', () => {
    const scene = new BattleScene();
    scene.pauseBattle();

    // Mock an update call with dummy time/delta
    let envTicked = false;
    (scene as any).battlefieldEnv = {
      update: () => { envTicked = true; }
    };
    (scene as any).commander = {
      tick: vi.fn(),
      isUltimateActive: false,
      barrierHp: 0
    };
    (scene as any).unitSprites = new Map();
    (scene as any).projectileManager = {
      updateProjectiles: vi.fn()
    };
    (scene as any).waveSpawner = {
      update: vi.fn(),
      getActiveEnemies: () => []
    };
    (scene as any).waveFSM = {
      getState: () => 'Prep'
    };
    (scene as any).weaponManager = {
      getActiveWeapons: () => []
    };

    scene.update(1000, 16);
    expect(envTicked).toBe(false); // Does not tick any subsystem when paused!

    scene.resumeBattle();
    scene.update(1000, 16);
    expect(envTicked).toBe(true); // Resumes normal ticking!
  });
});
