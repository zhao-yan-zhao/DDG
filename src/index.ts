/**
 * 《孤城神机营》- Web Playable Game Entry Point
 * Mounts Phaser 3 game instance onto #game-container with 750x1334 portrait viewport.
 */

import Phaser from 'phaser';
import { phaserConfig, GAME_VIEWPORT_WIDTH, GAME_VIEWPORT_HEIGHT } from './presentation/config/phaser-config';

export const GAME_WIDTH = GAME_VIEWPORT_WIDTH;
export const GAME_HEIGHT = GAME_VIEWPORT_HEIGHT;

export function startGame(): Phaser.Game {
  const config = { ...phaserConfig };
  
  const hasWindow = typeof window !== 'undefined';
  const customCanvas = hasWindow ? (window as unknown as { canvas?: HTMLCanvasElement }).canvas : undefined;
  const isMiniGame = typeof (globalThis as unknown as { tt?: unknown }).tt !== 'undefined' ||
    typeof (globalThis as unknown as { wx?: unknown }).wx !== 'undefined' ||
    !!customCanvas;

  if (isMiniGame && customCanvas) {
    config.canvas = customCanvas;
    // In mini-game/custom environments with custom canvas, Phaser strictly forbids Phaser.AUTO.
    // It requires explicit Phaser.WEBGL or Phaser.CANVAS.
    config.type = Phaser.WEBGL;
    config.customEnvironment = true;
    // In mini-game adapters, #game-container is mocked with full screen dimensions.
    // Retaining 'game-container' enables ScaleManager to calculate proper parent bounds and display size (preventing 0x0 canvas).
    config.parent = 'game-container';
    config.loader = {
      imageLoadType: 'HTMLImageElement'
    };
  }

  const game = new Phaser.Game(config);
  if (typeof window !== 'undefined') {
    (window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
  }
  console.log('《孤城神机营》已成功启动！');
  return game;
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      startGame();
    });
  } else {
    startGame();
  }
}
