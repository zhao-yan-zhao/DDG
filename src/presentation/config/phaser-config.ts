/**
 * 《孤城神机营》- Phaser 3 Global Game Configuration
 * Viewport standards: 750x1334 vertical portrait, Phaser.Scale.FIT, auto-centered.
 */

import Phaser from 'phaser';
import { BootScene } from '../scenes/boot-scene';
import { HomeScene } from '../scenes/home-scene';
import { StageSelectScene } from '../scenes/stage-select-scene';
import { BattleScene } from '../scenes/battle-scene';
import { UIScene } from '../scenes/ui-scene';
import { FTUEOverlay } from '../scenes/ftue-overlay';

export const GAME_VIEWPORT_WIDTH = 750;
export const GAME_VIEWPORT_HEIGHT = 1334;

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  autoFocus: false,
  backgroundColor: '#101216',
  width: GAME_VIEWPORT_WIDTH,
  height: GAME_VIEWPORT_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_VIEWPORT_WIDTH,
    height: GAME_VIEWPORT_HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, HomeScene, StageSelectScene, BattleScene, UIScene, FTUEOverlay],
  input: {
    activePointers: 2
  },
  audio: {
    noAudio: true
  },
  loader: {
    imageLoadType: 'HTMLImageElement'
  }
};
