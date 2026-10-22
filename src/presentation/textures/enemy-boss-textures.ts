/**
 * 《孤城神机营》- Chapter Boss Procedural Textures
 * High-fidelity Canvas 2D procedural textures for 5 chapter supreme bosses:
 * 1. enemy_boss_bear (Ch1 铁塔熊王, 64x64)
 * 2. enemy_boss_xuanwu (Ch2 玄武巨舰, 72x72)
 * 3. enemy_boss_khan (Ch3 金帐可汗, 64x64)
 * 4. enemy_boss_wangu (Ch4 万蛊尸魔, 68x68)
 * 5. enemy_boss_taotie (Ch5 饕餮巨炮, 72x72)
 */

import Phaser from 'phaser';

export const BOSS_ENEMY_TEXTURE_KEYS = {
  BOSS_BEAR: 'enemy_boss_bear',
  BOSS_XUANWU: 'enemy_boss_xuanwu',
  BOSS_KHAN: 'enemy_boss_khan',
  BOSS_WANGU: 'enemy_boss_wangu',
  BOSS_TAOTIE: 'enemy_boss_taotie'
} as const;

function createBossCanvas(
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

export function generateBossEnemyTextures(scene: Phaser.Scene): void {
  createEnemyBossBear(scene);
  createEnemyBossXuanwu(scene);
  createEnemyBossKhan(scene);
  createEnemyBossWangu(scene);
  createEnemyBossTaotie(scene);
}

// 1. Ch1 铁塔熊王 (Boss Bear) - Massive demonic war bear, black iron armor, crimson eyes
export function createEnemyBossBear(scene: Phaser.Scene): void {
  createBossCanvas(scene, BOSS_ENEMY_TEXTURE_KEYS.BOSS_BEAR, 64, 64, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    // Massive Dark Fur Body
    ctx.fillStyle = '#1b120c';
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 24, 0, Math.PI * 2);
    ctx.fill();
    // Iron Shoulder Spaulders with Gold Rim
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(cx - 26, cy - 8, 14, 16);
    ctx.fillRect(cx + 12, cy - 8, 14, 16);
    ctx.strokeStyle = '#d4ac0d';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 26, cy - 8, 14, 16);
    ctx.strokeRect(cx + 12, cy - 8, 14, 16);
    // Demonic Bear Head & Snarl
    ctx.fillStyle = '#2e1c14';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 16, 0, Math.PI * 2);
    ctx.fill();
    // Bear Ears with Iron Caps
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(cx - 12, cy - 22, 6, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy - 22, 6, 0, Math.PI * 2);
    ctx.fill();
    // Spiked Collar
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 14, 0, Math.PI);
    ctx.stroke();
    // Glowing Crimson Eyes & Fangs
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(cx - 8, cy - 12, 4, 3);
    ctx.fillRect(cx + 4, cy - 12, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, cy - 4, 3, 4);
    ctx.fillRect(cx + 1, cy - 4, 3, 4);
  });
}

// 2. Ch2 玄武巨舰 (Boss Xuanwu) - Mechanical fortress ship, bronze dragon/turtle turret
export function createEnemyBossXuanwu(scene: Phaser.Scene): void {
  createBossCanvas(scene, BOSS_ENEMY_TEXTURE_KEYS.BOSS_XUANWU, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    // Heavy Iron Armored Ship Hull
    ctx.fillStyle = '#1c2833';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx + 30, cy + 18);
    ctx.lineTo(cx - 30, cy + 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#48c9b0'; // Verdigris Bronze Trim
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Central Pagoda Turret Castle
    ctx.fillStyle = '#16a085';
    ctx.fillRect(cx - 14, cy - 8, 28, 22);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 14, cy - 8, 28, 22);
    // Dual Heavy Cannon Barrels
    ctx.fillStyle = '#566573';
    ctx.fillRect(cx - 20, cy + 4, 8, 20);
    ctx.fillRect(cx + 12, cy + 4, 8, 20);
    // Glowing Furnace Core Vent
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.arc(cx, cy + 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(cx, cy + 3, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 3. Ch3 金帐可汗 (Boss Khan) - Steppe supreme warlord, horned golden crown, twin curved scimitars
export function createEnemyBossKhan(scene: Phaser.Scene): void {
  createBossCanvas(scene, BOSS_ENEMY_TEXTURE_KEYS.BOSS_KHAN, 64, 64, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    // Gilded Wolf Pelt Cloak
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Heavy Golden Lamellar Cuirass
    ctx.fillStyle = '#d4ac0d';
    ctx.fillRect(cx - 14, cy - 6, 28, 24);
    ctx.strokeStyle = '#7d6608';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 14, cy - 6, 28, 24);
    // Golden Double-Horned Crown Helmet
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 22);
    ctx.lineTo(cx - 18, cy - 30);
    ctx.lineTo(cx - 6, cy - 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 22);
    ctx.lineTo(cx + 18, cy - 30);
    ctx.lineTo(cx + 6, cy - 18);
    ctx.closePath();
    ctx.fill();
    // Glowing Amber Eyes
    ctx.fillStyle = '#ff9800';
    ctx.fillRect(cx - 6, cy - 16, 3, 3);
    ctx.fillRect(cx + 3, cy - 16, 3, 3);
    // Twin Gilded Curved Scimitars
    ctx.strokeStyle = '#f9e79f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx - 18, cy + 6, 14, -0.6, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 18, cy + 6, 14, 1.9, 3.7);
    ctx.stroke();
  });
}

// 4. Ch4 万蛊尸魔 (Boss Wangu) - Toxic skeletal demon, purple miasma, glowing jade core
export function createEnemyBossWangu(scene: Phaser.Scene): void {
  createBossCanvas(scene, BOSS_ENEMY_TEXTURE_KEYS.BOSS_WANGU, 68, 68, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    // Toxic Purple/Viridian Miasma Cloud
    ctx.fillStyle = '#4a235a';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 26, 0, Math.PI * 2);
    ctx.fill();
    // Demon Ribcage & Exoskeleton
    ctx.strokeStyle = '#d7bde2';
    ctx.lineWidth = 2.5;
    for (let i = -12; i <= 12; i += 6) {
      ctx.beginPath();
      ctx.arc(cx, cy + i, 16 - Math.abs(i) * 0.4, 0, Math.PI);
      ctx.stroke();
    }
    // Horned Skull Head
    ctx.fillStyle = '#f5eef8';
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 12, 0, Math.PI * 2);
    ctx.fill();
    // Demonic Horns
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 24);
    ctx.lineTo(cx - 18, cy - 32);
    ctx.lineTo(cx - 4, cy - 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 24);
    ctx.lineTo(cx + 18, cy - 32);
    ctx.lineTo(cx + 4, cy - 18);
    ctx.closePath();
    ctx.fill();
    // Toxic Glowing Jade Heart Core
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a9dfbf';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 5. Ch5 饕餮巨炮 (Boss Taotie) - Ferocious bronze Taotie maw swallowing giant siege cannon
export function createEnemyBossTaotie(scene: Phaser.Scene): void {
  createBossCanvas(scene, BOSS_ENEMY_TEXTURE_KEYS.BOSS_TAOTIE, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    // Heavy Siege Carriage Chassis
    ctx.fillStyle = '#1c2833';
    ctx.fillRect(cx - 28, cy - 16, 56, 38);
    ctx.strokeStyle = '#b7950b';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 28, cy - 16, 56, 38);
    // Massive Cannon Barrel Muzzle
    ctx.fillStyle = '#0e1111';
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Taotie Beast Maw Fangs (饕餮兽面利齿)
    ctx.fillStyle = '#f39c12';
    // Upper fangs
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 18);
    ctx.lineTo(cx - 7, cy - 10);
    ctx.lineTo(cx - 2, cy - 18);
    ctx.lineTo(cx + 3, cy - 10);
    ctx.lineTo(cx + 8, cy - 18);
    ctx.lineTo(cx + 12, cy - 10);
    ctx.closePath();
    ctx.fill();
    // Glowing Demonic Molten Core
    ctx.fillStyle = '#ff5722';
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 8, 0, Math.PI * 2);
    ctx.fill();
    // Dragon Horn Vents
    ctx.fillStyle = '#b7950b';
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 20);
    ctx.lineTo(cx - 32, cy - 32);
    ctx.lineTo(cx - 16, cy - 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy - 20);
    ctx.lineTo(cx + 32, cy - 32);
    ctx.lineTo(cx + 16, cy - 22);
    ctx.closePath();
    ctx.fill();
  });
}
