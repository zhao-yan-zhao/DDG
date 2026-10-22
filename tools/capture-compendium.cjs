const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DIST_DIR = path.resolve(__dirname, '../dist');
const ARTIFACT_DIR = 'C:/Users/zhaoyan/.gemini/antigravity/brain/ff1d7d75-25eb-4beb-82bf-966eb8615bfa';
const OUT_IMAGE = path.join(ARTIFACT_DIR, 'compendium_fixed.png');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  if (req.url === '/save-screen' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      const base64Data = data.image.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(OUT_IMAGE, base64Data, 'base64');
      console.log('Successfully saved screenshot to:', OUT_IMAGE);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    });
    return;
  }

  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';
  
  if (ext === '.html') {
    let content = fs.readFileSync(filePath, 'utf8');
    // Inject auto-trigger compendium modal script
    const injectScript = `
      <script>
        window.addEventListener('load', () => {
          let checkInterval = setInterval(() => {
            if (window.__HOME_SCENE__) {
              clearInterval(checkInterval);
              console.log('HomeScene found, opening CompendiumModal...');
              setTimeout(() => {
                window.__HOME_SCENE__.openCompendiumModal();
                setTimeout(async () => {
                  const canvas = document.querySelector('canvas');
                  if (canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    await fetch('/save-screen', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ image: dataUrl })
                    });
                  }
                }, 1200);
              }, 600);
            }
          }, 200);
        });
      </script>
    `;
    content = content.replace('</body>', injectScript + '</body>');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return;
  }

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 9088;
server.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  const args = [
    '--headless=new',
    '--user-data-dir=' + path.resolve(__dirname, '../.tmp_chrome_preview'),
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=750,1334',
    `http://localhost:${PORT}/`
  ];

  const cp = spawn(chromePath, args, { stdio: 'ignore' });
  cp.on('error', err => {
    console.error('Failed to spawn Chrome:', err);
    process.exit(1);
  });
});
