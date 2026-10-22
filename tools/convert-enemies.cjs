const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const INPUT_DIR = 'C:/Users/zhaoyan/Downloads/敌人';
const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/enemies');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const ENEMIES = [
  { src: '流寇轻步兵.jfif', dest: 'enemy_light_infantry.png', w: 256, h: 256 },
  { src: '狂暴战犬.jfif', dest: 'enemy_war_dog.png', w: 256, h: 256 },
  { src: '轻装游骑兵.jfif', dest: 'enemy_light_cavalry.png', w: 256, h: 256 },
  { src: '玄甲刀盾兵.jfif', dest: 'enemy_shield_guard.png', w: 256, h: 256 },
  { src: '铁浮屠重骑.jfif', dest: 'enemy_iron_pagoda.png', w: 256, h: 256 },
  { src: '黑山神射手.jfif', dest: 'enemy_ranged_bowman.png', w: 256, h: 256 },
  { src: '背篓火药死士.jfif', dest: 'enemy_bomb_carrier.png', w: 256, h: 256 },
  { src: '攻城木冲车.jfif', dest: 'enemy_siege_ram.png', w: 256, h: 256 },
  { src: '铁塔熊王.jfif', dest: 'enemy_boss_bear.png', w: 256, h: 256 },
  { src: '玄武巨舰机关巨鳌.jfif', dest: 'enemy_boss_xuanwu.png', w: 256, h: 256 },
  { src: '金帐天可汗.jfif', dest: 'enemy_boss_khan.png', w: 256, h: 256 },
  { src: '万蛊尸魔.jfif', dest: 'enemy_boss_wangu.png', w: 256, h: 256 },
  { src: '饕餮巨炮熔火魔神攻城车.jpg', dest: 'enemy_boss_taotie.png', w: 256, h: 256 }
];

let savedCount = 0;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
  } else if (req.url.startsWith('/image/')) {
    const filename = decodeURIComponent(req.url.substring(7));
    const filePath = path.join(INPUT_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found: ' + filePath);
    }
  } else if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, dataUrl } = JSON.parse(body);
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const targetPath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
        savedCount++;
        console.log(`[${savedCount}/${ENEMIES.length}] Saved transparent enemy PNG: ${filename}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));

        if (savedCount >= ENEMIES.length) {
          console.log('All 13 enemies processed successfully!');
          setTimeout(() => {
            server.close();
            process.exit(0);
          }, 1000);
        }
      } catch (err) {
        console.error('Error saving image:', err);
        res.writeHead(500);
        res.end(err.message);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 9002;
server.listen(PORT, () => {
  console.log(`Enemy conversion server running on http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  const args = [
    '--headless=new',
    '--user-data-dir=' + path.resolve(__dirname, '../.tmp_chrome_enemy'),
    '--no-sandbox',
    '--disable-gpu',
    `http://localhost:${PORT}/`
  ];

  const cp = spawn(chromePath, args, { stdio: 'ignore' });
  cp.on('error', err => {
    console.error('Failed to start Chrome:', err);
  });
});

function getHtml() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<h1>Processing Enemies...</h1>
<div id="log"></div>
<script>
const enemies = ${JSON.stringify(ENEMIES)};

async function processAll() {
  for (const item of enemies) {
    await processEnemy(item);
  }
}

function processEnemy(item) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/image/' + encodeURIComponent(item.src);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // High-precision background removal (White to Transparent with soft feathered edge)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const minVal = Math.min(r, g, b);
        const maxVal = Math.max(r, g, b);
        const isNearNeutral = (maxVal - minVal) < 18;

        if (minVal > 246 && isNearNeutral) {
          data[i + 3] = 0;
        } else if (minVal > 220 && isNearNeutral) {
          const factor = (246 - minVal) / (246 - 220);
          data[i + 3] = Math.round(data[i + 3] * Math.min(1.0, factor * 1.25));
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Bounding box detection
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const a = data[(y * canvas.width + x) * 4 + 3];
          if (a > 12) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const margin = 10;
      minX = Math.max(0, minX - margin);
      minY = Math.max(0, minY - margin);
      maxX = Math.min(canvas.width, maxX + margin);
      maxY = Math.min(canvas.height, maxY + margin);
      const contentW = maxX - minX;
      const contentH = maxY - minY;

      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = item.w;
      targetCanvas.height = item.h;
      const tCtx = targetCanvas.getContext('2d');
      tCtx.imageSmoothingEnabled = true;
      tCtx.imageSmoothingQuality = 'high';

      const scale = Math.min((item.w - 12) / contentW, (item.h - 12) / contentH);
      const drawW = contentW * scale;
      const drawH = contentH * scale;
      const drawX = (item.w - drawW) / 2;
      const drawY = (item.h - drawH) / 2;

      tCtx.drawImage(canvas, minX, minY, contentW, contentH, drawX, drawY, drawW, drawH);

      const dataUrl = targetCanvas.toDataURL('image/png');

      await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: item.dest, dataUrl })
      });

      document.getElementById('log').innerText += 'Done: ' + item.dest + '\\n';
      resolve();
    };
  });
}

window.onload = () => {
  processAll();
};
</script>
</body>
</html>`;
}
