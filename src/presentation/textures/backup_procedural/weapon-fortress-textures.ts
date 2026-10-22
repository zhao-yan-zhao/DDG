/**
 * 《孤城神机营》- Fortress Faction Weapon Procedural Textures
 * High-fidelity Canvas 2D Gongbi procedural textures for 4 Fortress war machines:
 * 1. weapon_barricade (铁索拒马, 72x72)
 * 2. weapon_oil_cabinet (猛火油柜, 72x72)
 * 3. weapon_electric_grid (陷马电网, 72x72)
 * 4. weapon_spear_camp (白杆长枪营, 72x72)
 */

import Phaser from 'phaser';
import { createWeaponCanvas } from './weapon-shenji-textures';

export const FORTRESS_WEAPON_TEXTURE_KEYS = {
  BARRICADE: 'weapon_barricade',
  OIL_CABINET: 'weapon_oil_cabinet',
  ELECTRIC_GRID: 'weapon_electric_grid',
  SPEAR_CAMP: 'weapon_spear_camp'
} as const;

export function generateFortressTextures(scene: Phaser.Scene): void {
  createBarricade(scene);
  createOilCabinet(scene);
  createElectricGrid(scene);
  createSpearCamp(scene);
}

// 1. Barricade (铁索拒马) - Crossed sharpened oak logs, iron caltrop spikes, wrapped chains & anchor pegs
export function createBarricade(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, FORTRESS_WEAPON_TEXTURE_KEYS.BARRICADE, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Ground anchor pegs
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 26); ctx.lineTo(cx - 18, cy + 12);
    ctx.moveTo(cx + 24, cy + 26); ctx.lineTo(cx + 18, cy + 12);
    ctx.stroke();

    // Crossed heavy oak logs (X-frame)
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy + 20); ctx.lineTo(cx + 26, cy - 20);
    ctx.moveTo(cx + 26, cy + 20); ctx.lineTo(cx - 26, cy - 20);
    ctx.stroke();

    // Sharpened spear tips on top
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 20); ctx.lineTo(cx - 31, cy - 26); ctx.lineTo(cx - 21, cy - 26); ctx.closePath(); ctx.fill();
    ctx.moveTo(cx + 26, cy - 20); ctx.lineTo(cx + 21, cy - 26); ctx.lineTo(cx + 31, cy - 26); ctx.closePath(); ctx.fill();

    // Wrapped heavy iron chains at intersection
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(cx - 8, cy - 8, 16, 16);
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Iron caltrop spikes protruding
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 22);
    ctx.moveTo(cx, cy); ctx.lineTo(cx - 20, cy + 2);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + 20, cy + 2);
    ctx.stroke();
  });
}

// 2. Oil Cabinet (猛火油柜) - Square cast-bronze reservoir, cloud-thunder patterns, pump lever, duckbill nozzle
export function createOilCabinet(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, FORTRESS_WEAPON_TEXTURE_KEYS.OIL_CABINET, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Bronze tank body
    const tankGrad = ctx.createLinearGradient(cx - 20, 0, cx + 20, 0);
    tankGrad.addColorStop(0, '#795548');
    tankGrad.addColorStop(0.5, '#a1887f');
    tankGrad.addColorStop(1, '#5d4037');
    ctx.fillStyle = tankGrad;
    ctx.fillRect(cx - 22, cy - 8, 44, 32);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx - 22, cy - 8, 44, 32);

    // Cloud-thunder decorative patterns (雷纹)
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 16, cy - 2, 32, 20);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 8); ctx.lineTo(cx + 10, cy + 8);
    ctx.stroke();

    // Twin cylinder pump mechanism on top
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(cx - 16, cy - 20, 10, 14);
    ctx.fillRect(cx + 6, cy - 20, 10, 14);

    // Pump lever handle
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 24); ctx.lineTo(cx + 22, cy - 14);
    ctx.stroke();

    // Duckbill nozzle pointing forward (up)
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 18); ctx.lineTo(cx - 12, cy - 30); ctx.lineTo(cx + 12, cy - 30); ctx.lineTo(cx + 6, cy - 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fire spurt
    ctx.fillStyle = '#ff3d00';
    ctx.beginPath();
    ctx.arc(cx, cy - 32, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 3. Electric Grid (陷马电网) - Bronze ground spikes with porcelain insulators, taut copper mesh, blue electric arcs
export function createElectricGrid(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, FORTRESS_WEAPON_TEXTURE_KEYS.ELECTRIC_GRID, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Corner bronze ground spikes
    const drawSpike = (sx: number, sy: number) => {
      ctx.fillStyle = '#c5a059';
      ctx.fillRect(sx - 4, sy - 8, 8, 16);
      // White porcelain insulator ring
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy - 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#90a4ae';
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    drawSpike(cx - 22, cy - 18);
    drawSpike(cx + 22, cy - 18);
    drawSpike(cx - 22, cy + 18);
    drawSpike(cx + 22, cy + 18);

    // Taut copper mesh wire grid
    ctx.strokeStyle = '#ffb74d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 20, cy - 16, 40, 32);
    ctx.beginPath();
    // Horizontal & vertical mesh wires
    ctx.moveTo(cx - 20, cy - 6); ctx.lineTo(cx + 20, cy - 6);
    ctx.moveTo(cx - 20, cy + 6); ctx.lineTo(cx + 20, cy + 6);
    ctx.moveTo(cx - 7, cy - 16); ctx.lineTo(cx - 7, cy + 16);
    ctx.moveTo(cx + 7, cy - 16); ctx.lineTo(cx + 7, cy + 16);
    // Diagonal cross wires
    ctx.moveTo(cx - 20, cy - 16); ctx.lineTo(cx + 20, cy + 16);
    ctx.moveTo(cx + 20, cy - 16); ctx.lineTo(cx - 20, cy + 16);
    ctx.stroke();

    // Crackling blue electric arcs
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 10);
    ctx.lineTo(cx - 4, cy - 4);
    ctx.lineTo(cx + 2, cy - 12);
    ctx.lineTo(cx + 10, cy - 4);
    ctx.lineTo(cx + 16, cy + 8);
    ctx.stroke();

    ctx.fillStyle = '#e0f7fa';
    ctx.fillRect(cx - 2, cy - 6, 4, 4);
    ctx.fillRect(cx + 8, cy - 6, 3, 3);
  });
}

// 4. Spear Camp (白杆长枪营) - Dense bristling forest of Ming spearheads, red tassels, wicker barrier shield
export function createSpearCamp(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, FORTRESS_WEAPON_TEXTURE_KEYS.SPEAR_CAMP, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Wicker barrier shields (藤牌 base)
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(cx - 26, cy + 10, 52, 16);
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 26, cy + 10, 52, 16);
    // Woven wicker crosshatches
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -24; x <= 24; x += 8) {
      ctx.moveTo(cx + x, cy + 10); ctx.lineTo(cx + x + 6, cy + 26);
    }
    ctx.stroke();

    // Bristling forest of long white-wax-wood spear shafts
    const spearCols = [-20, -12, -4, 4, 12, 20];
    spearCols.forEach((sx, i) => {
      const topY = cy - 24 - (i % 2) * 6;
      // Shaft
      ctx.strokeStyle = '#cfd8dc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + sx, cy + 16);
      ctx.lineTo(cx + sx, topY);
      ctx.stroke();

      // Red silk tassel
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(cx + sx - 3, topY + 6, 6, 5);

      // Steel spearhead with side hook
      ctx.fillStyle = '#eceff1';
      ctx.beginPath();
      ctx.moveTo(cx + sx, topY - 6);
      ctx.lineTo(cx + sx - 3, topY + 6);
      ctx.lineTo(cx + sx + 3, topY + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#455a64';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  });
}
