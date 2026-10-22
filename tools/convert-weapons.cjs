const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const INPUT_DIR = 'C:/Users/zhaoyan/Downloads/图';
const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/weapons');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const WEAPONS = [
  { src: '神机火铳.jfif', dest: 'weapon_fire_lance.png', w: 256, h: 256 },
  { src: '一窝蜂火箭.jfif', dest: 'weapon_rocket_box.png', w: 256, h: 256 },
  { src: '震天雷投手.jfif', dest: 'weapon_thunder_thrower.png', w: 256, h: 256 },
  { src: '红衣大炮.jfif', dest: 'weapon_red_cannon.png', w: 256, h: 512 },
  { src: '机关喷火兽.jfif', dest: 'weapon_flame_beast.png', w: 256, h: 256 },
  { src: '诸葛连弩.jfif', dest: 'weapon_repeating_crossbow.png', w: 256, h: 256 },
  { src: '八牛床弩.jfif', dest: 'weapon_bed_crossbow.png', w: 512, h: 256 },
  { src: '襄阳发石机.jfif', dest: 'weapon_catapult.png', w: 384, h: 384 },
  { src: '铁索拒马.jfif', dest: 'weapon_barricade.png', w: 256, h: 256 },
  { src: '猛火油柜.jfif', dest: 'weapon_oil_cabinet.png', w: 256, h: 256 },
  { src: '陷马电网.jfif', dest: 'weapon_electric_grid.png', w: 256, h: 256 },
  { src: '白杆长枪营.jfif', dest: 'weapon_spear_camp.png', w: 256, h: 256 },
  { src: '火药局.jfif', dest: 'weapon_powder_bureau.png', w: 256, h: 256 },
  { src: '聚义战鼓.jfif', dest: 'weapon_war_drum.png', w: 512, h: 256 },
  { src: '观星祭坛.jfif', dest: 'weapon_stargazer.png', w: 256, h: 256 },
  { src: '鲁班工坊.jfif', dest: 'weapon_luban_workshop.png', w: 256, h: 256 }
];

let savedCount = 0;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    // Serve the processor HTML
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
  } else if (req.url.startsWith('/image/')) {
    // Serve source jfif
    const filename = decodeURIComponent(req.url.substring(7));
    const filePath = path.join(INPUT_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
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
        console.log(`[${savedCount}/${WEAPONS.length}] Saved transparent PNG: ${filename}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));

        if (savedCount >= WEAPONS.length) {
          console.log('All 16 weapons processed successfully!');
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

const PORT = 8999;
server.listen(PORT, () => {
  console.log(`Conversion server running on http://localhost:${PORT}`);
  
  // Launch Chrome headless to run the conversion
  const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  const args = [
    '--headless=new',
    '--user-data-dir=' + path.resolve(__dirname, '../.tmp_chrome'),
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
<h1>Processing Weapons...</h1>
<div id="log"></div>
<script>
const weapons = ${JSON.stringify(WEAPONS)};

async function processAll() {
  for (const item of weapons) {
    await processWeapon(item);
  }
}

function processWeapon(item) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/image/' + encodeURIComponent(item.src);
    img.onload = async () => {
      // 1. Draw to offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // 2. High-precision background removal (White to Transparent with smooth feathered edge)
      // The images have pure white/near-white backgrounds (#fcfcfc ~ #ffffff).
      // We want to turn white transparent while preserving the object's soft edges and slight ground shadow.
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate lightness & color distance from pure white
        const minVal = Math.min(r, g, b);
        const maxVal = Math.max(r, g, b);
        const isNearNeutral = (maxVal - minVal) < 16;

        if (minVal > 248 && isNearNeutral) {
          // Fully pure white background
          data[i + 3] = 0;
        } else if (minVal > 224 && isNearNeutral) {
          // Soft anti-aliased edge feathering
          const factor = (248 - minVal) / (248 - 224);
          data[i + 3] = Math.round(data[i + 3] * Math.min(1.0, factor * 1.2));
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // 3. Find content bounding box to trim excess empty margins
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const a = data[(y * canvas.width + x) * 4 + 3];
          if (a > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Add a 4% margin
      const margin = 12;
      minX = Math.max(0, minX - margin);
      minY = Math.max(0, minY - margin);
      maxX = Math.min(canvas.width, maxX + margin);
      maxY = Math.min(canvas.height, maxY + margin);
      const contentW = maxX - minX;
      const contentH = maxY - minY;

      // 4. Scale and center into target canvas
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = item.w;
      targetCanvas.height = item.h;
      const tCtx = targetCanvas.getContext('2d');
      tCtx.imageSmoothingEnabled = true;
      tCtx.imageSmoothingQuality = 'high';

      // Keep aspect ratio centered
      const scale = Math.min((item.w - 10) / contentW, (item.h - 10) / contentH);
      const drawW = contentW * scale;
      const drawH = contentH * scale;
      const drawX = (item.w - drawW) / 2;
      const drawY = (item.h - drawH) / 2;

      tCtx.drawImage(canvas, minX, minY, contentW, contentH, drawX, drawY, drawW, drawH);

      const dataUrl = targetCanvas.toDataURL('image/png');

      // 5. Send to server
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
