/**
 * 《孤城神机营》- Mohist Faction Weapon Procedural Textures
 * High-fidelity Canvas 2D Gongbi procedural textures for 4 Mohist war machines:
 * 1. weapon_flame_beast (机关喷火兽, 72x72)
 * 2. weapon_repeating_crossbow (诸葛连弩, 72x72)
 * 3. weapon_bed_crossbow (八牛床弩, 144x72, 2x1 footprint)
 * 4. weapon_catapult (襄阳发石机, 144x144, 2x2 footprint)
 */

import Phaser from 'phaser';
import { createWeaponCanvas } from './weapon-shenji-textures';

export const MOHIST_WEAPON_TEXTURE_KEYS = {
  FLAME_BEAST: 'weapon_flame_beast',
  REPEATING_CROSSBOW: 'weapon_repeating_crossbow',
  BED_CROSSBOW: 'weapon_bed_crossbow',
  CATAPULT: 'weapon_catapult'
} as const;

export function generateMohistTextures(scene: Phaser.Scene): void {
  createFlameBeast(scene);
  createRepeatingCrossbow(scene);
  createBedCrossbow(scene);
  createCatapult(scene);
}

// 1. Flame Beast (机关喷火兽) - Bronze Taotie beast head furnace, twin copper nozzles, bellows, embers
export function createFlameBeast(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, MOHIST_WEAPON_TEXTURE_KEYS.FLAME_BEAST, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Bronze furnace body
    const bodyGrad = ctx.createLinearGradient(cx - 20, cy, cx + 20, cy);
    bodyGrad.addColorStop(0, '#004d40');
    bodyGrad.addColorStop(0.5, '#00796b');
    bodyGrad.addColorStop(1, '#004d40');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Taotie Beast Horns / Crest
    ctx.fillStyle = '#c5a059';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 10); ctx.lineTo(cx - 26, cy - 24); ctx.lineTo(cx - 12, cy - 18); ctx.fill();
    ctx.moveTo(cx + 16, cy - 10); ctx.lineTo(cx + 26, cy - 24); ctx.lineTo(cx + 12, cy - 18); ctx.fill();

    // Fierce glowing eyes
    ctx.fillStyle = '#ff3d00';
    ctx.fillRect(cx - 12, cy - 8, 6, 5);
    ctx.fillRect(cx + 6, cy - 8, 6, 5);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(cx - 10, cy - 7, 3, 3);
    ctx.fillRect(cx + 8, cy - 7, 3, 3);

    // Gaping mouth with twin copper nozzles
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cx - 10, cy + 2, 20, 14);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 10, cy + 2, 20, 14);

    // Twin copper nozzles
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(cx - 8, cy + 12, 5, 8);
    ctx.fillRect(cx + 3, cy + 12, 5, 8);

    // Jet flame and embers
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 20); ctx.lineTo(cx, cy + 32); ctx.lineTo(cx + 8, cy + 20); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 20); ctx.lineTo(cx, cy + 28); ctx.lineTo(cx + 4, cy + 20); ctx.closePath();
    ctx.fill();
  });
}

// 2. Repeating Crossbow (诸葛连弩) - Top wooden magazine hopper, composite bow limbs, cocking lever
export function createRepeatingCrossbow(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, MOHIST_WEAPON_TEXTURE_KEYS.REPEATING_CROSSBOW, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Curved composite bow limbs
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy - 10);
    ctx.quadraticCurveTo(cx, cy - 24, cx + 28, cy - 10);
    ctx.stroke();

    // Bowstring
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy - 10);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx + 28, cy - 10);
    ctx.stroke();

    // Main stock
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(cx - 4, cy - 20, 8, 44);
    ctx.strokeStyle = '#271c19';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 4, cy - 20, 8, 44);

    // Top wooden magazine hopper (竖向木质箭匣)
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(cx - 10, cy - 12, 20, 26);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 10, cy - 12, 20, 26);

    // Bronze slide guide & cocking lever
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy + 8);
    ctx.lineTo(cx + 22, cy + 18);
    ctx.stroke();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(cx + 22, cy + 18, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 3. Bed Crossbow (八牛床弩) - 2x1 footprint (144x72) - Triple composite bow limbs, winches, heavy chisel bolt
export function createBedCrossbow(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, MOHIST_WEAPON_TEXTURE_KEYS.BED_CROSSBOW, 144, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Heavy trestle bed carriage (horizontal timber bed)
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(cx - 56, cy - 8, 112, 20);
    ctx.strokeStyle = '#1b0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 56, cy - 8, 112, 20);

    // Twin Winch Winnowing Wheels on both sides
    const drawWinch = (wx: number) => {
      ctx.fillStyle = '#c5a059';
      ctx.beginPath();
      ctx.arc(wx, cy + 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx - 10, cy + 2); ctx.lineTo(wx + 10, cy + 2);
      ctx.moveTo(wx, cy - 8); ctx.lineTo(wx, cy + 12);
      ctx.stroke();
    };
    drawWinch(cx - 50);
    drawWinch(cx + 50);

    // Triple Composite Bow Limbs (front)
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 58, cy - 20);
    ctx.quadraticCurveTo(cx, cy - 34, cx + 58, cy - 20);
    ctx.stroke();

    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 48, cy - 14);
    ctx.quadraticCurveTo(cx, cy - 26, cx + 48, cy - 14);
    ctx.stroke();

    // Heavy Taut Bowstrings
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 58, cy - 20); ctx.lineTo(cx, cy - 2); ctx.lineTo(cx + 58, cy - 20);
    ctx.stroke();

    // Heavy Armor-Piercing Chisel Bolt (一枪三剑箭)
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 16);
    ctx.lineTo(cx, cy - 32);
    ctx.stroke();
    // Iron arrowhead
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 24); ctx.lineTo(cx, cy - 35); ctx.lineTo(cx + 6, cy - 24); ctx.closePath();
    ctx.fill();
  });
}

// 4. Catapult (襄阳发石机) - 2x2 footprint (144x144) - A-frame timber truss, counterweight box, throwing arm
export function createCatapult(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, MOHIST_WEAPON_TEXTURE_KEYS.CATAPULT, 144, 144, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Heavy timber base frame
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(cx - 54, cy + 34, 108, 18);
    ctx.strokeStyle = '#1b0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 54, cy + 34, 108, 18);

    // A-frame timber trusses
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 44, cy + 34); ctx.lineTo(cx - 8, cy - 16); ctx.lineTo(cx + 28, cy + 34);
    ctx.moveTo(cx - 28, cy + 34); ctx.lineTo(cx + 8, cy - 16); ctx.lineTo(cx + 44, cy + 34);
    ctx.stroke();

    // Cross brace
    ctx.strokeStyle = '#271c19';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy + 12); ctx.lineTo(cx + 36, cy + 12);
    ctx.stroke();

    // Central axle bearing with bronze plates
    ctx.fillStyle = '#c5a059';
    ctx.beginPath();
    ctx.arc(cx, cy - 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Giant Stone Counterweight Box (right side, lower)
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(cx + 22, cy - 8, 28, 32);
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx + 22, cy - 8, 28, 32);
    // Iron banding on box
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy + 8); ctx.lineTo(cx + 50, cy + 8);
    ctx.stroke();

    // Long Throwing Arm (lever arm reaching high up-left)
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx + 36, cy); // near counterweight
    ctx.lineTo(cx - 48, cy - 54); // high tip
    ctx.stroke();

    // Sling basket & Boulder
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 48, cy - 54);
    ctx.lineTo(cx - 38, cy - 40);
    ctx.stroke();

    // Boulder
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath();
    ctx.arc(cx - 36, cy - 38, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}
