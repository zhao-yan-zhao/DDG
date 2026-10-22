/**
 * 《孤城神机营》- Regular & Elite Invader Procedural Textures
 * High-fidelity Canvas 2D procedural textures for 8 invading regular/elite enemy archetypes:
 * 1. enemy_light_infantry (流寇轻步兵, 40x40)  2. enemy_war_dog (狂暴战犬, 44x44)
 * 3. enemy_light_cavalry (轻装游骑兵, 48x48)   4. enemy_shield_guard (玄甲刀盾兵, 48x48)
 * 5. enemy_iron_pagoda (铁浮屠重骑, 56x56)     6. enemy_ranged_bowman (黑山投矛/弓手, 44x44)
 * 7. enemy_bomb_carrier (背篓火药死士, 44x44)  8. enemy_siege_ram (攻城木冲车, 64x54)
 */

import Phaser from 'phaser';

export const REGULAR_ENEMY_TEXTURE_KEYS = {
  LIGHT_INFANTRY: 'enemy_light_infantry',
  WAR_DOG: 'enemy_war_dog',
  LIGHT_CAVALRY: 'enemy_light_cavalry',
  SHIELD_GUARD: 'enemy_shield_guard',
  IRON_PAGODA: 'enemy_iron_pagoda',
  RANGED_BOWMAN: 'enemy_ranged_bowman',
  BOMB_CARRIER: 'enemy_bomb_carrier',
  SIEGE_RAM: 'enemy_siege_ram'
} as const;

function createEnemyCanvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): void {
  if (scene.textures.exists(key)) return;
  const canvasTex = scene.textures.createCanvas(key, w, h);
  if (!canvasTex) return;
  draw(canvasTex.context, w, h);
  canvasTex.refresh();
}

export function generateRegularEnemyTextures(scene: Phaser.Scene): void {
  createEnemyLightInfantry(scene);
  createEnemyWarDog(scene);
  createEnemyLightCavalry(scene);
  createEnemyShieldGuard(scene);
  createEnemyIronPagoda(scene);
  createEnemyRangedBowman(scene);
  createEnemyBombCarrier(scene);
  createEnemySiegeRam(scene);
}

// 1. Light Infantry (流寇轻步兵) - Conical hat, iron dagger, red sash
export function createEnemyLightInfantry(scene: Phaser.Scene): void {
  createEnemyCanvas(scene, REGULAR_ENEMY_TEXTURE_KEYS.LIGHT_INFANTRY, 40, 40, (ctx, w, h) => {
    const cx = w / 2; const cy = h / 2;
    ctx.fillStyle = '#455a64'; ctx.beginPath(); ctx.arc(cx, cy + 2, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c62828'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + 2, 14, 0.4, 2.6); ctx.stroke();
    // Conical Hat (斗笠)
    ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx + 16, cy - 2); ctx.lineTo(cx - 16, cy - 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1.5; ctx.stroke();
    // Spear shaft & tassel
    ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 10, cy + 14); ctx.lineTo(cx + 18, cy - 14); ctx.stroke();
    ctx.fillStyle = '#ff1744'; ctx.fillRect(cx + 16, cy - 8, 4, 4);
  });
}

// 2. War Dog (狂暴战犬) - Feral hound, spiked bronze collar, crimson eyes
export function createEnemyWarDog(scene: Phaser.Scene): void {
  createEnemyCanvas(scene, REGULAR_ENEMY_TEXTURE_KEYS.WAR_DOG, 44, 44, (ctx, w, h) => {
    const cx = w / 2; const cy = h / 2;
    ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 16, 11, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 11, cy - 5, 8, 7, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 9, cy - 12); ctx.lineTo(cx + 14, cy - 6); ctx.lineTo(cx + 6, cy - 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c78f3e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + 6, cy - 2, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff1744'; ctx.fillRect(cx + 13, cy - 7, 3, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 17, cy - 3, 3, 2);
  });
}

// 3. Light Cavalry (轻装游骑兵) - Horse silhouette, pennant, saber
export function createEnemyLightCavalry(scene: Phaser.Scene): void {
  createEnemyCanvas(scene, REGULAR_ENEMY_TEXTURE_KEYS.LIGHT_CAVALRY, 48, 48, (ctx, w, h) => {
    const cx = w / 2; const cy = h / 2;
    ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.ellipse(cx - 2, cy + 4, 18, 12, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 6, cy + 6); ctx.lineTo(cx + 16, cy - 10); ctx.lineTo(cx + 10, cy - 12); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(cx - 2, cy - 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 18); ctx.lineTo(cx - 20, cy - 12); ctx.lineTo(cx - 6, cy - 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 6, cy + 8); ctx.lineTo(cx - 6, cy - 20); ctx.stroke();
  });
}

// 4. Shield Guard (玄甲刀盾兵) - Heavy riveted tower shield, dao broadsword
export function createEnemyShieldGuard(scene: Phaser.Scene): void {
  createEnemyCanvas(scene, REGULAR_ENEMY_TEXTURE_KEYS.SHIELD_GUARD, 48, 48, (ctx, w, h) => {
    const cx = w / 2; const cy = h / 2;
    ctx.fillStyle = '#1c2833'; ctx.fillRect(cx - 15, cy - 18, 22, 36);
    ctx.strokeStyle = '#566573'; ctx.lineWidth = 2; ctx.strokeRect(cx - 15, cy - 18, 22, 36);
    ctx.fillStyle = '#d4ac0d'; ctx.beginPath(); ctx.arc(cx - 4, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - 13, cy - 16, 3, 3); ctx.fillRect(cx + 2, cy - 16, 3, 3);
    ctx.fillRect(cx - 13, cy + 13, 3, 3); ctx.fillRect(cx + 2, cy + 13, 3, 3);
    ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.moveTo(cx + 8, cy + 12); ctx.lineTo(cx + 17, cy - 14); ctx.lineTo(cx + 12, cy - 16); ctx.lineTo(cx + 6, cy + 10); ctx.closePath(); ctx.fill();
  });
}

// 5. Iron Pagoda (铁浮屠重骑) - Black lamellar cataphract, bronze mask, spiked mace
export function createEnemyIronPagoda(scene: Phaser.Scene): void {
  createEnemyCanvas(scene, REGULAR_ENEMY_TEXTURE_KEYS.IRON_PAGODA, 56, 56, (ctx, w, h) => {
    const cx = w / 2; const cy = h / 2;
    ctx.fillStyle = '#17202a'; ctx.beginPath(); ctx.ellipse(cx, cy + 6, 22, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5d6d7e'; ctx.lineWidth = 1.5;
    for (let r = -12; r <= 12; r += 6) { ctx.strokeRect(cx - 14, cy + r, 28, 5); }
    ctx.fillStyle = '#b7950b'; ctx.beginPath(); ctx.arc(cx + 4, cy - 12, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00e5ff'; ctx.fillRect(cx + 6, cy - 14, 7, 3);
    ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(cx - 16, cy - 8, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd700'; ctx.fillRect(cx - 17, cy - 16, 2, 4);
  });
}

// 6. Ranged Bowman (黑山投矛/弓手) - Recurve horn bow, feathered arrows
export function createEnemyRangedBowman(scene: Phaser.Scene): void {
  createEnemyCanvas(scene, REGULAR_ENEMY_TEXTURE_KEYS.RANGED_BOWMAN, 44, 44, (ctx, w, h) => {
    const cx = w / 2; const cy = h / 2;
    ctx.fillStyle = '#2e4053'; ctx.beginPath(); ctx.arc(cx - 2, cy + 2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6e2c00'; ctx.fillRect(cx - 14, cy - 10, 6, 18);
    ctx.fillStyle = '#f4d03f'; ctx.fillRect(cx - 13, cy - 15, 2, 6); ctx.fillRect(cx - 10, cy - 14, 2, 5);
    ctx.strokeStyle = '#ba4a00'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx + 8, cy, 14, -Math.PI * 0.45, Math.PI * 0.45, false); ctx.stroke();
    ctx.strokeStyle = '#eaeded'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 13, cy - 12); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx + 13, cy + 12); ctx.stroke();
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 18, cy); ctx.stroke();
  });
}

// 7. Bomb Carrier (背篓火药死士) - Explosive casks, glowing sparks, suicide torch
export function createEnemyBombCarrier(scene: Phaser.Scene): void {
  createEnemyCanvas(scene, REGULAR_ENEMY_TEXTURE_KEYS.BOMB_CARRIER, 44, 44, (ctx, w, h) => {
    const cx = w / 2; const cy = h / 2;
    ctx.fillStyle = '#78281f'; ctx.beginPath(); ctx.arc(cx + 4, cy + 4, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#17202a'; ctx.fillRect(cx - 14, cy - 12, 14, 22);
    ctx.strokeStyle = '#b7950b'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 14, cy - 12, 14, 22);
    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.moveTo(cx - 7, cy - 8); ctx.lineTo(cx - 2, cy + 2); ctx.lineTo(cx - 12, cy + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 7, cy - 12); ctx.quadraticCurveTo(cx - 4, cy - 18, cx - 1, cy - 15); ctx.stroke();
    ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(cx - 1, cy - 15, 3.5, 0, Math.PI * 2); ctx.fill();
  });
}

// 8. Siege Ram (攻城木冲车) - Spiked bronze dragon head ram, armored timber chassis
export function createEnemySiegeRam(scene: Phaser.Scene): void {
  createEnemyCanvas(scene, REGULAR_ENEMY_TEXTURE_KEYS.SIEGE_RAM, 64, 54, (ctx, w, h) => {
    const cx = w / 2; const cy = h / 2;
    ctx.fillStyle = '#4a235a'; ctx.fillRect(cx - 26, cy - 12, 44, 28);
    ctx.strokeStyle = '#7d3c98'; ctx.lineWidth = 2; ctx.strokeRect(cx - 26, cy - 12, 44, 28);
    ctx.fillStyle = '#784212'; ctx.fillRect(cx - 20, cy - 5, 42, 12);
    ctx.fillStyle = '#b7950b'; ctx.beginPath(); ctx.moveTo(cx + 22, cy - 8); ctx.lineTo(cx + 31, cy + 1); ctx.lineTo(cx + 22, cy + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1c2833'; ctx.beginPath(); ctx.arc(cx - 18, cy + 18, 6, 0, Math.PI * 2); ctx.arc(cx + 10, cy + 18, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d4ac0d'; ctx.lineWidth = 1.5; ctx.stroke();
  });
}
