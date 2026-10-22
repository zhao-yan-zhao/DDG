const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const HD_DIR = path.resolve(__dirname, '../public/assets/enemies_hd');
const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/enemies');

const ENEMIES_TO_RESIZE = [
  // Regular / Swarm / Fast (Target ~48x48)
  { file: 'enemy_light_infantry.png', targetW: 48, targetH: 48 },
  { file: 'enemy_war_dog.png', targetW: 48, targetH: 48 },
  { file: 'enemy_ranged_bowman.png', targetW: 48, targetH: 48 },
  { file: 'enemy_bomb_carrier.png', targetW: 48, targetH: 48 },

  // Elite / Cavalry / Heavy Shield (Target ~56x56 ~ 64x64)
  { file: 'enemy_light_cavalry.png', targetW: 56, targetH: 56 },
  { file: 'enemy_shield_guard.png', targetW: 54, targetH: 54 },
  { file: 'enemy_iron_pagoda.png', targetW: 64, targetH: 64 },
  { file: 'enemy_siege_ram.png', targetW: 68, targetH: 58 },

  // Supreme Bosses (Target ~88x88 ~ 96x96)
  { file: 'enemy_boss_bear.png', targetW: 88, targetH: 88 },
  { file: 'enemy_boss_xuanwu.png', targetW: 96, targetH: 96 },
  { file: 'enemy_boss_khan.png', targetW: 88, targetH: 88 },
  { file: 'enemy_boss_wangu.png', targetW: 88, targetH: 88 },
  { file: 'enemy_boss_taotie.png', targetW: 96, targetH: 96 }
];

let processedCount = 0;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
  } else if (req.url.startsWith('/image/')) {
    const filename = decodeURIComponent(req.url.substring(7));
    const filePath = path.join(HD_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
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
        processedCount++;
        console.log(`[${processedCount}/${ENEMIES_TO_RESIZE.length}] Rescaled enemy battle sprite: ${filename}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));

        if (processedCount >= ENEMIES_TO_RESIZE.length) {
          console.log('All 13 enemy battle sprites rescaled successfully!');
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

const PORT = 9005;
server.listen(PORT, () => {
  console.log(`Enemy resize server running on http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  const args = [
    '--headless=new',
    '--user-data-dir=' + path.resolve(__dirname, '../.tmp_chrome_resize'),
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
<script>
const items = ${JSON.stringify(ENEMIES_TO_RESIZE)};

async function processAll() {
  for (const item of items) {
    await processItem(item);
  }
}

function processItem(item) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = item.targetW;
      canvas.height = item.targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw centered with aspect ratio preservation
      const scale = Math.min(item.targetW / img.width, item.targetH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (item.targetW - drawW) / 2;
      const offsetY = (item.targetH - drawH) / 2;
      
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      
      const dataUrl = canvas.toDataURL('image/png');
      await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: item.file, dataUrl })
      });
      resolve();
    };
    img.src = '/image/' + encodeURIComponent(item.file);
  });
}

processAll();
</script>
</body>
</html>`;
}
