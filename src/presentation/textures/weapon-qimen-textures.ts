/**
 * 《孤城神机营》- Qimen Faction Weapon Procedural Textures
 * High-fidelity Canvas 2D Gongbi procedural textures for 4 Qimen war machines / altars:
 * 1. weapon_powder_bureau (火药局, 72x72)
 * 2. weapon_war_drum (聚义战鼓, 144x72, 2x1 footprint)
 * 3. weapon_stargazer (观星祭坛, 72x72)
 * 4. weapon_luban_workshop (鲁班工坊, 72x72)
 */

import Phaser from 'phaser';
import { createWeaponCanvas } from './weapon-shenji-textures';

export const QIMEN_WEAPON_TEXTURE_KEYS = {
  POWDER_BUREAU: 'weapon_powder_bureau',
  WAR_DRUM: 'weapon_war_drum',
  STARGAZER: 'weapon_stargazer',
  LUBAN_WORKSHOP: 'weapon_luban_workshop'
} as const;

export function generateQimenTextures(scene: Phaser.Scene): void {
  createPowderBureau(scene);
  createWarDrum(scene);
  createStargazer(scene);
  createLubanWorkshop(scene);
}

// 1. Powder Bureau (火药局) - Octagonal brick & crimson timber armory, powder kegs, winged fire-crow
export function createPowderBureau(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, QIMEN_WEAPON_TEXTURE_KEYS.POWDER_BUREAU, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Stone brick foundation
    ctx.fillStyle = '#455a64';
    ctx.fillRect(cx - 24, cy + 14, 48, 14);
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 24, cy + 14, 48, 14);

    // Crimson timber pavilion walls
    ctx.fillStyle = '#880e4f';
    ctx.fillRect(cx - 20, cy - 8, 40, 22);
    ctx.strokeStyle = '#4a148c';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 20, cy - 8, 40, 22);

    // Copper-banded powder kegs stacked outside
    const drawKeg = (kx: number, ky: number) => {
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(kx - 6, ky - 5, 12, 10);
      ctx.strokeStyle = '#c5a059';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(kx - 6, ky - 5, 12, 10);
    };
    drawKeg(cx - 12, cy + 8);
    drawKeg(cx + 12, cy + 8);

    // Pagoda hip roof (upturned eaves)
    ctx.fillStyle = '#311b92';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 24);
    ctx.lineTo(cx + 28, cy - 8);
    ctx.lineTo(cx - 28, cy - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bamboo winged Fire-Crow (神火飞鸦) on roof
    ctx.fillStyle = '#ff6f00';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx + 10, cy - 20);
    ctx.lineTo(cx, cy - 23);
    ctx.lineTo(cx - 10, cy - 20);
    ctx.closePath();
    ctx.fill();
  });
}

// 2. War Drum (聚义战鼓) - 2x1 footprint (144x72) - Rawhide drum, dragon brass drop rings, trigram stand
export function createWarDrum(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, QIMEN_WEAPON_TEXTURE_KEYS.WAR_DRUM, 144, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Carved eight-trigram trestle stand (crossed heavy wooden legs)
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 44, cy + 28); ctx.lineTo(cx - 18, cy + 2);
    ctx.moveTo(cx - 18, cy + 28); ctx.lineTo(cx - 44, cy + 2);
    ctx.moveTo(cx + 44, cy + 28); ctx.lineTo(cx + 18, cy + 2);
    ctx.moveTo(cx + 18, cy + 28); ctx.lineTo(cx + 44, cy + 2);
    ctx.stroke();

    // Central rawhide drum barrel (heavy red cylinder)
    const drumGrad = ctx.createLinearGradient(0, cy - 24, 0, cy + 18);
    drumGrad.addColorStop(0, '#b71c1c');
    drumGrad.addColorStop(0.5, '#d32f2f');
    drumGrad.addColorStop(1, '#7f0000');
    ctx.fillStyle = drumGrad;
    ctx.fillRect(cx - 42, cy - 20, 84, 34);
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx - 42, cy - 20, 84, 34);

    // Drum skin top & bottom rim hoops with gold studs
    const drawHoop = (hy: number) => {
      ctx.fillStyle = '#ffe082';
      ctx.fillRect(cx - 44, hy - 3, 88, 6);
      ctx.fillStyle = '#e65100';
      for (let x = -40; x <= 40; x += 10) {
        ctx.fillRect(cx + x - 2, hy - 2, 4, 4);
      }
    };
    drawHoop(cy - 18);
    drawHoop(cy + 12);

    // Twin dragon brass drop rings (左右青铜兽首吞环)
    const drawRing = (rx: number) => {
      ctx.strokeStyle = '#c5a059';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(rx, cy - 4, 8, 0, Math.PI * 2);
      ctx.stroke();
    };
    drawRing(cx - 44);
    drawRing(cx + 44);

    // Central Bagua / Taiji crest on drum face
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 10, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 3. Stargazer (观星祭坛) - Tiered white marble Bagua altar, floating bronze armillary sphere, star aura
export function createStargazer(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, QIMEN_WEAPON_TEXTURE_KEYS.STARGAZER, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Tier 1 White marble base (须弥座)
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(cx - 26, cy + 16, 52, 14);
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 26, cy + 16, 52, 14);

    // Tier 2 White marble platform with purple jade inlay
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(cx - 20, cy + 4, 40, 12);
    ctx.strokeStyle = '#7e57c2';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 20, cy + 4, 40, 12);

    // Starlight mystic aura
    const glow = ctx.createRadialGradient(cx, cy - 12, 4, cx, cy - 12, 22);
    glow.addColorStop(0, 'rgba(186, 104, 200, 0.7)');
    glow.addColorStop(0.5, 'rgba(74, 20, 140, 0.3)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 22, 0, Math.PI * 2);
    ctx.fill();

    // Floating Bronze Armillary Sphere Rings (浑天仪圆环)
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 12, 14, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 12, 14, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#80deea';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 12, 14, 6, -Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();

    // Central glowing starlight orb
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 4. Luban Workshop (鲁班工坊) - Timber drafting bench, interlocking bronze gears, blueprint scroll, ruler
export function createLubanWorkshop(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, QIMEN_WEAPON_TEXTURE_KEYS.LUBAN_WORKSHOP, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Drafting workbench (木质工作台)
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(cx - 26, cy - 6, 52, 30);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 26, cy - 6, 52, 30);

    // Table legs with corner brackets
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(cx - 24, cy + 24, 8, 8);
    ctx.fillRect(cx + 16, cy + 24, 8, 8);

    // Open blueprint scroll on bench (天工开物图纸)
    ctx.fillStyle = '#ffe082';
    ctx.fillRect(cx - 16, cy - 2, 32, 18);
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 16, cy - 2, 32, 18);
    // Blueprint blueprint diagram lines
    ctx.strokeStyle = '#0277bd';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 12, cy + 2, 10, 10);
    ctx.beginPath();
    ctx.arc(cx + 6, cy + 7, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Interlocking Bronze Gear Trains (上层悬浮齿轮)
    const drawGear = (gx: number, gy: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Gear teeth
      ctx.fillStyle = color;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.fillRect(gx + Math.cos(a) * r - 2, gy + Math.sin(a) * r - 2, 4, 4);
      }
      // Center hole
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    drawGear(cx - 8, cy - 16, 8, '#c5a059');
    drawGear(cx + 8, cy - 18, 6, '#ffd54f');

    // Caliper ruler on the table
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + 18);
    ctx.lineTo(cx - 4, cy + 22);
    ctx.stroke();
  });
}
