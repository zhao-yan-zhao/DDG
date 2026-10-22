/**
 * 《孤城神机营》- Shenji Faction (Fire) Weapon Procedural Textures
 * High-fidelity Canvas 2D Gongbi & Ming Dynasty Military Textures:
 * 1. weapon_fire_lance (神机火铳, 72x72) - Octagonal forged barrel, walnut stock, brass filigree hoops, twin silk tassels
 * 2. weapon_rocket_box (一窝蜂火箭, 72x72) - Hardwood rocket hive cart, bronze corner plates, nested bamboo fire-arrows
 * 3. weapon_thunder_thrower (震天雷投手, 72x72) - Heavy A-frame timber trebuchet, counterweight chest, cast-iron explosive bomb
 * 4. weapon_red_cannon (红衣大炮, 72x144, 1x2) - Heavy Ming bronze/iron breech cannon, 4-tier relief rings, dual spoked cart
 */

import Phaser from 'phaser';

export const SHENJI_WEAPON_TEXTURE_KEYS = {
  FIRE_LANCE: 'weapon_fire_lance',
  ROCKET_BOX: 'weapon_rocket_box',
  THUNDER_THROWER: 'weapon_thunder_thrower',
  RED_CANNON: 'weapon_red_cannon'
} as const;

export function createWeaponCanvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): void {
  if (!scene || !scene.textures) return;
  if (scene.textures.exists(key)) return;
  const canvasTex = scene.textures.createCanvas(key, w, h);
  if (!canvasTex) return;
  draw(canvasTex.context, w, h);
  canvasTex.refresh();
}

export function generateShenjiTextures(scene: Phaser.Scene): void {
  createFireLance(scene);
  createRocketBox(scene);
  createThunderThrower(scene);
  createRedCannon(scene);
}

// =========================================================================
// 1. 神机火铳 (Fire Lance) - 72x72
// =========================================================================
export function createFireLance(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, SHENJI_WEAPON_TEXTURE_KEYS.FIRE_LANCE, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Contact soft shadow
    ctx.fillStyle = 'rgba(10, 10, 15, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy + 24, 22, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Bronze fork rest (三叉架/支架)
    const forkGrad = ctx.createLinearGradient(cx - 16, cy + 8, cx + 16, cy + 28);
    forkGrad.addColorStop(0, '#ffd54f');
    forkGrad.addColorStop(0.5, '#c5a059');
    forkGrad.addColorStop(1, '#6d4c1a');
    ctx.strokeStyle = forkGrad;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 26);
    ctx.lineTo(cx, cy + 12);
    ctx.lineTo(cx + 14, cy + 26);
    ctx.moveTo(cx, cy + 12);
    ctx.lineTo(cx + 2, cy + 28);
    ctx.stroke();

    // Fork bronze rivet & ink outline
    ctx.fillStyle = '#ffe082';
    ctx.beginPath();
    ctx.arc(cx, cy + 12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Red lacquer walnut wooden stock (朱漆雕花硬木枪托)
    const stockGrad = ctx.createLinearGradient(cx + 22, cy + 24, cx - 10, cy - 8);
    stockGrad.addColorStop(0, '#3e2723');
    stockGrad.addColorStop(0.3, '#7f0000');
    stockGrad.addColorStop(0.7, '#b71c1c');
    stockGrad.addColorStop(1, '#5d4037');
    ctx.strokeStyle = stockGrad;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy + 22);
    ctx.lineTo(cx - 6, cy - 4);
    ctx.stroke();

    // Wood ink contour outline
    ctx.strokeStyle = 'rgba(20, 10, 5, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy + 24);
    ctx.lineTo(cx - 8, cy - 6);
    ctx.stroke();

    // Brass buttplate & lockplate (黄铜枪托包金与火门药池)
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(cx + 16, cy + 18, 5, 5);
    ctx.fillRect(cx - 4, cy - 3, 6, 4);

    // Octagonal forged iron barrel (八棱冷锻淬火精铁枪管)
    const barrelGrad = ctx.createLinearGradient(cx - 24, cy - 26, cx + 8, cy + 6);
    barrelGrad.addColorStop(0, '#b0bec5');
    barrelGrad.addColorStop(0.2, '#cfd8dc');
    barrelGrad.addColorStop(0.4, '#546e7a');
    barrelGrad.addColorStop(0.8, '#263238');
    barrelGrad.addColorStop(1, '#102027');
    ctx.strokeStyle = barrelGrad;
    ctx.lineWidth = 9;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy + 4);
    ctx.lineTo(cx - 22, cy - 24);
    ctx.stroke();

    // Metallic specular ridge highlight (枪管八棱脊线高光)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy + 2);
    ctx.lineTo(cx - 20, cy - 22);
    ctx.stroke();

    // Barrel ink edge outline
    ctx.strokeStyle = '#12191d';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - 23, cy - 25, 4, 4);

    // Triple raised brass reinforcement hoops (三道泥金青铜加强箍)
    const drawHoop = (hx: number, hy: number) => {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy + 3);
      ctx.lineTo(hx + 3, hy - 4);
      ctx.stroke();
      // Gilt highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy + 2);
      ctx.lineTo(hx + 2, hy - 3);
      ctx.stroke();
    };
    drawHoop(cx - 16, cy - 18);
    drawHoop(cx - 8, cy - 10);
    drawHoop(cx, cy - 2);

    // Flared muzzle ring & iron bore (喇叭形铳口与内膛黑洞)
    ctx.fillStyle = '#c5a059';
    ctx.beginPath();
    ctx.arc(cx - 22, cy - 24, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(cx - 23, cy - 25, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Front sight bead (青铜准星)
    ctx.fillStyle = '#ffe082';
    ctx.fillRect(cx - 21, cy - 28, 2.5, 2.5);

    // Flowing vermilion silk tassels (双股工笔朱砂红缨流苏)
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 8);
    ctx.quadraticCurveTo(cx - 6, cy + 2, cx - 2, cy + 14);
    ctx.quadraticCurveTo(cx - 8, cy + 8, cx - 12, cy - 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 7);
    ctx.quadraticCurveTo(cx - 4, cy + 4, cx, cy + 18);
    ctx.quadraticCurveTo(cx - 6, cy + 10, cx - 11, cy - 5);
    ctx.closePath();
    ctx.fill();

    // Fine tassel strands (丝缕细节)
    ctx.strokeStyle = '#ff8a80';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 6); ctx.quadraticCurveTo(cx - 4, cy + 6, cx - 1, cy + 17);
    ctx.moveTo(cx - 11, cy - 6); ctx.quadraticCurveTo(cx - 6, cy + 6, cx - 3, cy + 15);
    ctx.stroke();

    // Muzzle sparks (铳口余热金星)
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(cx - 26, cy - 29, 2.5, 2.5);
    ctx.fillStyle = '#ff9100';
    ctx.fillRect(cx - 29, cy - 25, 2, 2);
    ctx.fillRect(cx - 24, cy - 32, 1.5, 1.5);
  });
}

// =========================================================================
// 2. 一窝蜂火箭 (Rocket Box) - 72x72
// =========================================================================
export function createRocketBox(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, SHENJI_WEAPON_TEXTURE_KEYS.ROCKET_BOX, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Contact ground shadow
    ctx.fillStyle = 'rgba(15, 12, 10, 0.40)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 26, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wooden cart dual wheels with iron rim (明式双轮推车铁箍辐条轮)
    const drawSpokeWheel = (wx: number, wy: number) => {
      // Outer tire rim
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 4;
      ctx.strokeRect(wx - 4, wy - 14, 8, 28);
      // Wood body
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(wx - 4, wy - 14, 8, 28);
      // Spoke struts
      ctx.strokeStyle = '#c5a059';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wx, wy - 12); ctx.lineTo(wx, wy + 12);
      ctx.stroke();
      // Bronze hub
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(wx, wy, 3, 0, Math.PI * 2);
      ctx.fill();
    };
    drawSpokeWheel(cx - 24, cy + 12);
    drawSpokeWheel(cx + 24, cy + 12);

    // Wooden axle beam
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy + 12);
    ctx.lineTo(cx + 22, cy + 12);
    ctx.stroke();

    // Rocket box timber chassis (沉香木梯形斜置火箭匣体)
    const boxGrad = ctx.createLinearGradient(cx - 18, cy - 24, cx + 18, cy + 16);
    boxGrad.addColorStop(0, '#8d6e63');
    boxGrad.addColorStop(0.3, '#6d4c41');
    boxGrad.addColorStop(0.8, '#4e342e');
    boxGrad.addColorStop(1, '#271c19');
    ctx.fillStyle = boxGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 19, cy - 22);
    ctx.lineTo(cx + 19, cy - 22);
    ctx.lineTo(cx + 16, cy + 16);
    ctx.lineTo(cx - 16, cy + 16);
    ctx.closePath();
    ctx.fill();

    // Gongbi ink contour outline
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Two wide brass binding hoops (两道宽幅错金雷纹铜箍)
    const drawBrassHoop = (hy: number, hw: number) => {
      const hoopGrad = ctx.createLinearGradient(cx - hw, hy, cx + hw, hy);
      hoopGrad.addColorStop(0, '#c5a059');
      hoopGrad.addColorStop(0.5, '#ffd54f');
      hoopGrad.addColorStop(1, '#8d6e63');
      ctx.fillStyle = hoopGrad;
      ctx.fillRect(cx - hw, hy - 2.5, hw * 2, 5);

      // Ink trim
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - hw, hy - 2.5, hw * 2, 5);

      // Gold rivets
      ctx.fillStyle = '#ffffff';
      for (let rx = -hw + 4; rx < hw; rx += 7) {
        ctx.fillRect(cx + rx, hy - 1, 2, 2);
      }
    };
    drawBrassHoop(cy - 10, 18);
    drawBrassHoop(cy + 6, 16);

    // Honeycomb launch tubes matrix (19-Hole 蜂窝密集发射巢)
    ctx.fillStyle = '#111619';
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 0.8;
    const tubeRows = [
      { y: cy - 16, count: 4, spacing: 7.5, offset: -11.25 },
      { y: cy - 9, count: 5, spacing: 6.8, offset: -13.6 },
      { y: cy - 2, count: 4, spacing: 7.5, offset: -11.25 }
    ];

    tubeRows.forEach(row => {
      for (let i = 0; i < row.count; i++) {
        const tx = cx + row.offset + i * row.spacing;
        ctx.beginPath();
        ctx.arc(tx, row.y, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // Protruding vermilion rocket tips with feathers (探出匣口的朱砂火箭尖与羽翎)
    const rocketTips = [-12, -6, 0, 6, 12];
    rocketTips.forEach((rx, idx) => {
      const tipY = cy - 24 - (idx % 2) * 3;
      // Purple bamboo shaft (紫竹箭杆)
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + rx, cy - 16);
      ctx.lineTo(cx + rx, tipY);
      ctx.stroke();

      // Sharp steel arrowhead with vermilion incendiary coating (涂抹朱砂火药的破甲锋刃)
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.moveTo(cx + rx, tipY - 5);
      ctx.lineTo(cx + rx - 2.5, tipY);
      ctx.lineTo(cx + rx + 2.5, tipY);
      ctx.closePath();
      ctx.fill();

      // Sharp iron tip
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(cx + rx - 0.7, tipY - 6, 1.4, 2);
    });

    // Rear ignition master fuse & bronze carry handle (尾部并联引信与提梁)
    ctx.strokeStyle = '#ffa000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 16);
    ctx.quadraticCurveTo(cx - 2, cy + 22, cx + 8, cy + 20);
    ctx.stroke();
  });
}

// =========================================================================
// 3. 震天雷投手 (Thunder Thrower) - 72x72
// =========================================================================
export function createThunderThrower(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, SHENJI_WEAPON_TEXTURE_KEYS.THUNDER_THROWER, 72, 72, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Contact ground shadow
    ctx.fillStyle = 'rgba(10, 10, 15, 0.40)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 26, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy timber bottom skid base (重型底梁)
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(cx - 24, cy + 21, 48, 6);
    ctx.strokeStyle = '#1b1008';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 24, cy + 21, 48, 6);

    // Heavy A-frame timber trestles (交叉双重 A 型硬木桁架)
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + 22);
    ctx.lineTo(cx - 3, cy + 2);
    ctx.lineTo(cx + 14, cy + 22);
    ctx.stroke();

    // Back leg shadow & cross brace
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 13);
    ctx.lineTo(cx + 8, cy + 13);
    ctx.stroke();

    // Bronze corner brackets with studs (桁架青铜包角加固板)
    ctx.fillStyle = '#c5a059';
    ctx.beginPath();
    ctx.arc(cx - 3, cy + 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(cx - 3, cy + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Long throwing lever arm (倾斜长木旋风悬臂)
    const armGrad = ctx.createLinearGradient(cx + 24, cy + 16, cx - 18, cy - 22);
    armGrad.addColorStop(0, '#4e342e');
    armGrad.addColorStop(0.5, '#795548');
    armGrad.addColorStop(1, '#a1887f');
    ctx.strokeStyle = armGrad;
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy + 16);
    ctx.lineTo(cx - 18, cy - 18);
    ctx.stroke();

    // Lever arm iron bands
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx - 6, cy - 7);
    ctx.stroke();

    // Cast-iron counterweight chest (生铁重力配重铁箱)
    ctx.fillStyle = '#263238';
    ctx.fillRect(cx + 14, cy + 8, 14, 15);
    ctx.strokeStyle = '#102027';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 14, cy + 8, 14, 15);
    // Iron banding cross
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy + 15); ctx.lineTo(cx + 28, cy + 15);
    ctx.moveTo(cx + 21, cy + 8); ctx.lineTo(cx + 21, cy + 23);
    ctx.stroke();

    // Leather & hemp sling cord (悬垂麻绳与皮兜)
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 18);
    ctx.lineTo(cx - 24, cy - 6);
    ctx.stroke();

    // Cast-iron Thunder Bomb (生铁铸造合范瓜棱“震天雷”)
    const bombGrad = ctx.createRadialGradient(cx - 25, cy - 4, 2, cx - 24, cy - 2, 10);
    bombGrad.addColorStop(0, '#78909c');
    bombGrad.addColorStop(0.4, '#37474f');
    bombGrad.addColorStop(0.8, '#212121');
    bombGrad.addColorStop(1, '#111111');
    ctx.fillStyle = bombGrad;
    ctx.beginPath();
    ctx.arc(cx - 24, cy - 2, 9.5, 0, Math.PI * 2);
    ctx.fill();

    // Cast parting line & iron contour (生铁铸造合模凸棱与深墨线)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx - 24, cy - 2, 7, -Math.PI / 2, 0);
    ctx.stroke();

    // Iron eyelet cap (雷体吊环铁扣)
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(cx - 26, cy - 12, 4, 3);

    // Burning fuse cord with smoke & fire particles (燃灼引信与硝烟金火)
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 12);
    ctx.quadraticCurveTo(cx - 30, cy - 17, cx - 27, cy - 22);
    ctx.stroke();

    // Bright flash ember (火花核心)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 27, cy - 22, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(cx - 27, cy - 22, 4.5, 0, Math.PI * 2);
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });
}

// =========================================================================
// 4. 红衣大炮 (Red Cannon) - 72x144 (1x2 Footprint)
// =========================================================================
export function createRedCannon(scene: Phaser.Scene): void {
  createWeaponCanvas(scene, SHENJI_WEAPON_TEXTURE_KEYS.RED_CANNON, 72, 144, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2 + 10;

    // Contact diffuse ground shadow
    ctx.fillStyle = 'rgba(12, 14, 18, 0.50)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 30, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy carriage timbers (重装防后坐红木炮车身架)
    const cartGrad = ctx.createLinearGradient(cx - 24, 0, cx + 24, 0);
    cartGrad.addColorStop(0, '#3e2723');
    cartGrad.addColorStop(0.3, '#5d4037');
    cartGrad.addColorStop(0.7, '#6d4c41');
    cartGrad.addColorStop(1, '#271c19');
    ctx.fillStyle = cartGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 14);
    ctx.lineTo(cx + 22, cy - 14);
    ctx.lineTo(cx + 25, cy + 38);
    ctx.lineTo(cx - 25, cy + 38);
    ctx.closePath();
    ctx.fill();

    // Carriage ink outline
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bronze reinforced cheek plates & trail transom (侧面青铜耳轴衬板)
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(cx - 23, cy - 6, 6, 20);
    ctx.fillRect(cx + 17, cy - 6, 6, 20);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 23, cy - 6, 6, 20);
    ctx.strokeRect(cx + 17, cy - 6, 6, 20);

    // Giant 4-spoke iron-tired heavy wooden wheels (双侧巨型四辐条铁箍战车大轮)
    const drawCannonWheel = (wx: number) => {
      // Iron tire rim
      ctx.strokeStyle = '#1a2327';
      ctx.lineWidth = 5.5;
      ctx.strokeRect(wx - 4.5, cy - 16, 9, 52);

      // Wood felloes
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(wx - 4.5, cy - 16, 9, 52);

      // Bronze axle hub with bolts
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(wx, cy + 10, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Outer rim gold studs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx - 1, cy - 14, 2, 3);
      ctx.fillRect(wx - 1, cy + 31, 2, 3);
    };
    drawCannonWheel(cx - 27);
    drawCannonWheel(cx + 27);

    // =========================================================================
    // The Massive Ming Bronze/Forged Iron Cannon Barrel (万历重装红夷大将军炮)
    // =========================================================================
    // Tapered barrel: muzzle top (y: cy - 64) -> breech bottom (y: cy + 22)
    const barrelGrad = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0);
    barrelGrad.addColorStop(0, '#263238');
    barrelGrad.addColorStop(0.2, '#546e7a');
    barrelGrad.addColorStop(0.45, '#90a4ae');
    barrelGrad.addColorStop(0.65, '#cfd8dc');
    barrelGrad.addColorStop(0.85, '#455a64');
    barrelGrad.addColorStop(1, '#1b2327');

    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 64); // muzzle left
    ctx.lineTo(cx + 11, cy - 64); // muzzle right
    ctx.lineTo(cx + 16, cy + 20); // breech right
    ctx.lineTo(cx - 16, cy + 20); // breech left
    ctx.closePath();
    ctx.fill();

    // Heavy ink contour
    ctx.strokeStyle = '#10171a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Longitudinal metallic light ridge highlight (炮身纵向高光锐线)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 62);
    ctx.lineTo(cx + 5, cy + 18);
    ctx.stroke();

    // 4 Raised Relief Gilt Bronze Hoops (四道立体鎏金雷纹加强箍)
    const drawReliefHoop = (hy: number, hw: number) => {
      const hoopGrad = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
      hoopGrad.addColorStop(0, '#c5a059');
      hoopGrad.addColorStop(0.3, '#ffd700');
      hoopGrad.addColorStop(0.7, '#fff176');
      hoopGrad.addColorStop(1, '#8d6e63');

      ctx.fillStyle = hoopGrad;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(cx - hw - 1, hy - 3.5, (hw + 1) * 2, 7, 2);
        ctx.fill();
      } else {
        ctx.fillRect(cx - hw - 1, hy - 3.5, (hw + 1) * 2, 7);
      }

      // Deep ink boundary
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(cx - hw - 1, hy - 3.5, (hw + 1) * 2, 7);

      // Golden rivets
      ctx.fillStyle = '#ffffff';
      for (let rx = -hw + 3; rx <= hw - 3; rx += 5) {
        ctx.fillRect(cx + rx, hy - 1, 1.5, 2);
      }
    };

    drawReliefHoop(cy - 56, 11.5); // Muzzle ring
    drawReliefHoop(cy - 30, 12.8); // Second reinforce
    drawReliefHoop(cy - 4, 14.2);  // Trunnion reinforce
    drawReliefHoop(cy + 16, 15.8); // Breech ring

    // Dual Bronze Trunnions (双侧青铜承重兽面炮耳)
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(cx - 18, cy - 7, 5, 8);
    ctx.fillRect(cx + 13, cy - 7, 5, 8);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 18, cy - 7, 5, 8);
    ctx.strokeRect(cx + 13, cy - 7, 5, 8);

    // Muzzle Face & Deep Caliber Bore (深邃炮膛与加厚青铜炮唇)
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 64, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#050708';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 64, 7.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cascabel spherical button & touch-hole vent (葡萄形炮尾提钮与火门药引池)
    const cascabelGrad = ctx.createRadialGradient(cx - 2, cy + 26, 2, cx, cy + 28, 8);
    cascabelGrad.addColorStop(0, '#90a4ae');
    cascabelGrad.addColorStop(0.6, '#37474f');
    cascabelGrad.addColorStop(1, '#1b2327');
    ctx.fillStyle = cascabelGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + 28, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10171a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Touch-hole vent plate (黄铜火门盖)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 3, cy + 10, 6, 4);

    // Gilt Imperial Inscription Seal (明代“敕造大将军”泥金朱砂印记)
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(cx - 5, cy - 18, 10, 11);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(cx - 5, cy - 18, 10, 11);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 3, cy - 16, 6, 2);
    ctx.fillRect(cx - 3, cy - 12, 6, 3);
  });
}
