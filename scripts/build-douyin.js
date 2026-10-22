/**
 * 《孤城神机营》- ByteDance Mini Game Packaging Script
 * Usage: node scripts/build-douyin.js
 * 
 * Packages Vite production build (dist/) into ByteDance Mini Game structure (dist-douyin/).
 * Generates:
 *   - dist-douyin/game.json
 *   - dist-douyin/project.config.json
 *   - dist-douyin/adapter.js (window, document, canvas, audio polyfills)
 *   - dist-douyin/game.js (Mini-game bootstrap entry)
 *   - dist-douyin/assets/ (bundled JavaScript, CSS, and media assets)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildDouyin(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const sourceDir = options.sourceDir || path.resolve(rootDir, 'dist');
  const targetDir = options.targetDir || path.resolve(rootDir, 'dist-douyin');

  const appId = options.appId || 'tt709f0622eee64ce502';
  const projectName = options.projectName || '孤城神机营';

  console.log('----------------------------------------------------');
  console.log(' [build-douyin] Packaging ByteDance Mini-Game');
  console.log(` [build-douyin] Source: ${sourceDir}`);
  console.log(` [build-douyin] Target: ${targetDir}`);
  console.log('----------------------------------------------------');

  // 1. Verify Vite build output exists
  if (!fs.existsSync(sourceDir)) {
    const errorMsg = `Source directory not found: ${sourceDir}. Please run "npm run build:web" first.`;
    console.error(` [build-douyin] Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // 2. Prepare clean target directory
  if (fs.existsSync(targetDir)) {
    try {
      fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (err) {
      // Fallback for Windows directory lock: clean contents instead of removing root
      for (const item of fs.readdirSync(targetDir)) {
        fs.rmSync(path.join(targetDir, item), { recursive: true, force: true });
      }
    }
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 3. Copy assets directory
  const sourceAssetsDir = path.resolve(sourceDir, 'assets');
  const targetAssetsDir = path.resolve(targetDir, 'assets');

  let copiedFilesCount = 0;
  let totalBytes = 0;

  function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach((childItemName) => {
        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
      });
    } else if (exists && stats.isFile()) {
      fs.copyFileSync(src, dest);
      copiedFilesCount++;
      totalBytes += stats.size;
    }
  }

  if (fs.existsSync(sourceAssetsDir)) {
    copyRecursiveSync(sourceAssetsDir, targetAssetsDir);
  }

  // Copy any other static non-html assets from root of dist
  const rootDistFiles = fs.readdirSync(sourceDir);
  for (const file of rootDistFiles) {
    if (file === 'index.html' || file === 'assets') continue;
    const srcFile = path.resolve(sourceDir, file);
    const dstFile = path.resolve(targetDir, file);
    const stat = fs.statSync(srcFile);

    if (stat.isFile()) {
      fs.copyFileSync(srcFile, dstFile);
      copiedFilesCount++;
      totalBytes += stat.size;
    }
  }

  // 4. Identify Entry JS Bundle
  let entryFile = '';
  const indexHtmlPath = path.resolve(sourceDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    const scriptMatch = htmlContent.match(/<script[^>]+src=["'](?:\/)?([^"']*\.js)["']/i);
    if (scriptMatch && scriptMatch[1]) {
      const cleanPath = scriptMatch[1].replace(/^(\.\/|\/)+/, '');
      entryFile = './' + cleanPath;
    }
  }

  // Fallback: search for index-*.js in assets
  if (!entryFile && fs.existsSync(targetAssetsDir)) {
    const files = fs.readdirSync(targetAssetsDir);
    const jsEntry = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
    if (jsEntry) {
      entryFile = `./assets/${jsEntry}`;
    }
  }

  if (!entryFile) {
    entryFile = './assets/index.js';
    console.warn(' [build-douyin] Warning: Could not detect entry JS chunk, using default:', entryFile);
  } else {
    console.log(` [build-douyin] Detected game entry chunk: ${entryFile}`);
  }

  // 5. Generate game.json
  const gameConfig = {
    deviceOrientation: 'portrait',
    showStatusBar: false,
    networkTimeout: {
      request: 10000,
      connectSocket: 10000,
      uploadFile: 10000,
      downloadFile: 10000
    },
    subpackages: []
  };

  if (options.openDataContext && typeof options.openDataContext === 'string' && options.openDataContext.trim().length > 0) {
    gameConfig.openDataContext = options.openDataContext.trim();
  }

  const gameJsonPath = path.resolve(targetDir, 'game.json');
  fs.writeFileSync(gameJsonPath, JSON.stringify(gameConfig, null, 2), 'utf-8');
  copiedFilesCount++;
  totalBytes += Buffer.byteLength(JSON.stringify(gameConfig));

  // 6. Generate project.config.json
  const projectConfig = {
    setting: {
      urlCheck: false,
      es6: true,
      postcss: false,
      minified: false
    },
    appid: appId,
    projectname: projectName,
    bundleType: 'game'
  };

  const projectConfigPath = path.resolve(targetDir, 'project.config.json');
  fs.writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2), 'utf-8');
  copiedFilesCount++;
  totalBytes += Buffer.byteLength(JSON.stringify(projectConfig));

  // 7. Generate adapter.js (ByteDance Mini-Game Runtime Polyfill)
  const adapterCode = `/**
 * 《孤城神机营》- ByteDance Mini Game Runtime Adapter Shim
 * Polyfills DOM, Window, Canvas, Image, and Audio for Phaser 3 runtime.
 */
(function() {
  if (typeof tt === 'undefined') return;

  var global = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
  if (typeof global.window === 'undefined') {
    global.window = global;
  }
  global.window.window = global.window;
  global.window.top = global.window;
  global.window.self = global.window;

  // 1. Safe Event Listener Polyfill for Window and Global
  var windowListeners = {};
  function addWindowListener(type, listener, options) {
    if (!windowListeners[type]) windowListeners[type] = [];
    windowListeners[type].push(listener);
  }
  function removeWindowListener(type, listener, options) {
    if (!windowListeners[type]) return;
    var idx = windowListeners[type].indexOf(listener);
    if (idx !== -1) windowListeners[type].splice(idx, 1);
  }
  function dispatchWindowEvent(evt) {
    var list = windowListeners[evt.type];
    if (list) {
      for (var i = 0; i < list.length; i++) {
        try {
          list[i].call(global.window, evt);
        } catch (err) {
          console.warn('[ByteDanceAdapter] Window listener error:', err);
        }
      }
    }
  }

  if (typeof global.window.addEventListener !== 'function') {
    global.window.addEventListener = addWindowListener;
  }
  if (typeof global.window.removeEventListener !== 'function') {
    global.window.removeEventListener = removeWindowListener;
  }
  if (typeof global.addEventListener !== 'function') {
    global.addEventListener = global.window.addEventListener;
  }
  if (typeof global.removeEventListener !== 'function') {
    global.removeEventListener = global.window.removeEventListener;
  }

  // 2. Prevent Illegal Invocation on window.focus / window.blur / window.matchMedia / scrollTo / getComputedStyle
  global.window.focus = function() {};
  global.window.blur = function() {};
  global.window.scrollTo = function() {};
  global.focus = global.window.focus;
  global.blur = global.window.blur;
  global.scrollTo = global.window.scrollTo;

  global.window.getComputedStyle = function(el) {
    return (el && el.style) ? el.style : {};
  };
  global.getComputedStyle = global.window.getComputedStyle;

  // 3. System and Screen Info
  var sysInfo = {};
  try {
    if (typeof tt.getSystemInfoSync === 'function') {
      sysInfo = tt.getSystemInfoSync() || {};
    }
  } catch (e) {}

  var screenW = sysInfo.windowWidth || sysInfo.screenWidth || 750;
  var screenH = sysInfo.windowHeight || sysInfo.screenHeight || 1334;
  var pixelRatio = sysInfo.pixelRatio || 1;

  global.window.innerWidth = screenW;
  global.window.innerHeight = screenH;
  global.window.devicePixelRatio = pixelRatio;
  global.window.screen = {
    width: screenW,
    height: screenH,
    availWidth: screenW,
    availHeight: screenH,
    orientation: {
      type: screenH >= screenW ? 'portrait-primary' : 'landscape-primary',
      angle: 0
    }
  };

  global.window.matchMedia = function(query) {
    var isPortrait = screenH >= screenW;
    var matches = false;
    if (query && query.indexOf('portrait') !== -1) {
      matches = isPortrait;
    } else if (query && query.indexOf('landscape') !== -1) {
      matches = !isPortrait;
    }
    return {
      matches: matches,
      media: query || '',
      addListener: function() {},
      removeListener: function() {},
      addEventListener: function() {},
      removeEventListener: function() {}
    };
  };
  global.matchMedia = global.window.matchMedia;

  if (typeof global.navigator === 'undefined') {
    global.navigator = {
      userAgent: 'ByteDanceMicroGame/' + (sysInfo.version || '1.0'),
      platform: sysInfo.platform || 'devtools',
      appVersion: sysInfo.version || '1.0'
    };
  }

  // 4. Global DOM Types Polyfill (prevent ReferenceError during instanceof checks)
  function DummyElement() {}
  DummyElement.prototype.style = {};
  DummyElement.prototype.appendChild = function() {};
  DummyElement.prototype.removeChild = function() {};
  DummyElement.prototype.addEventListener = function() {};
  DummyElement.prototype.removeEventListener = function() {};
  DummyElement.prototype.getBoundingClientRect = function() {
    return { top: 0, left: 0, width: screenW, height: screenH, right: screenW, bottom: screenH };
  };

  if (typeof global.Element === 'undefined') {
    global.Element = DummyElement;
    global.window.Element = DummyElement;
  }
  if (typeof global.HTMLElement === 'undefined') {
    global.HTMLElement = DummyElement;
    global.window.HTMLElement = DummyElement;
  }
  if (typeof global.HTMLCanvasElement === 'undefined') {
    global.HTMLCanvasElement = DummyElement;
    global.window.HTMLCanvasElement = DummyElement;
  }
  if (typeof global.HTMLImageElement === 'undefined') {
    global.HTMLImageElement = DummyElement;
    global.window.HTMLImageElement = DummyElement;
  }
  if (typeof global.HTMLAudioElement === 'undefined') {
    global.HTMLAudioElement = DummyElement;
    global.window.HTMLAudioElement = DummyElement;
  }
  if (typeof global.HTMLVideoElement === 'undefined') {
    global.HTMLVideoElement = DummyElement;
    global.window.HTMLVideoElement = DummyElement;
  }

  // 5. Create and enhance main screen canvas
  var mainCanvas = null;
  if (typeof tt.createCanvas === 'function') {
    mainCanvas = tt.createCanvas();
    if (!mainCanvas.style) mainCanvas.style = {};
    mainCanvas.style.width = screenW + 'px';
    mainCanvas.style.height = screenH + 'px';

    if (!mainCanvas.getBoundingClientRect) {
      mainCanvas.getBoundingClientRect = function() {
        return { top: 0, left: 0, width: screenW, height: screenH, right: screenW, bottom: screenH };
      };
    }

    var canvasListeners = {};
    if (!mainCanvas.addEventListener) {
      mainCanvas.addEventListener = function(type, listener) {
        if (!canvasListeners[type]) canvasListeners[type] = [];
        canvasListeners[type].push(listener);
      };
    }
    if (!mainCanvas.removeEventListener) {
      mainCanvas.removeEventListener = function(type, listener) {
        if (!canvasListeners[type]) return;
        var idx = canvasListeners[type].indexOf(listener);
        if (idx !== -1) canvasListeners[type].splice(idx, 1);
      };
    }
    if (!mainCanvas.dispatchEvent) {
      mainCanvas.dispatchEvent = function(evt) {
        var list = canvasListeners[evt.type];
        if (list) {
          for (var i = 0; i < list.length; i++) {
            try {
              list[i].call(mainCanvas, evt);
            } catch (err) {
              console.warn('[ByteDanceAdapter] Canvas event listener error:', err);
            }
          }
        }
      };
    }

    if (!mainCanvas.focus) mainCanvas.focus = function() {};
    if (!mainCanvas.blur) mainCanvas.blur = function() {};
    mainCanvas.parentElement = null;
    mainCanvas.parentNode = null;

    global.canvas = mainCanvas;
    global.window.canvas = mainCanvas;
  }

  // 6. Polyfill document
  if (typeof global.document === 'undefined' || !global.document.createElement) {
    var docListeners = {};
    var mockContainer = {
      tagName: 'DIV',
      id: 'game-container',
      style: { width: screenW + 'px', height: screenH + 'px' },
      clientWidth: screenW,
      clientHeight: screenH,
      offsetWidth: screenW,
      offsetHeight: screenH,
      appendChild: function() {},
      removeChild: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      getBoundingClientRect: function() {
        return { top: 0, left: 0, width: screenW, height: screenH, right: screenW, bottom: screenH };
      }
    };

    var mockBody = {
      tagName: 'BODY',
      style: {},
      clientWidth: screenW,
      clientHeight: screenH,
      appendChild: function() {},
      removeChild: function() {},
      addEventListener: function() {},
      removeEventListener: function() {}
    };

    global.document = {
      body: mockBody,
      head: { appendChild: function() {}, removeChild: function() {} },
      documentElement: { style: {}, clientWidth: screenW, clientHeight: screenH },
      readyState: 'complete',
      hidden: false,
      visibilityState: 'visible',
      createElement: function(tag) {
        tag = (tag || '').toLowerCase();
        if (tag === 'canvas') {
          var c = tt.createCanvas ? tt.createCanvas() : { getContext: function() { return null; } };
          if (!c.style) c.style = {};
          if (!c.getBoundingClientRect) {
            c.getBoundingClientRect = function() {
              return { top: 0, left: 0, width: screenW, height: screenH };
            };
          }
          return c;
        }
        if (tag === 'image' || tag === 'img') {
          return tt.createImage ? tt.createImage() : {};
        }
        if (tag === 'audio') {
          return tt.createInnerAudioContext ? tt.createInnerAudioContext() : {};
        }
        return {
          tagName: tag.toUpperCase(),
          style: {},
          appendChild: function() {},
          removeChild: function() {},
          addEventListener: function() {},
          removeEventListener: function() {},
          setAttribute: function() {},
          getAttribute: function() { return null; },
          getBoundingClientRect: function() {
            return { top: 0, left: 0, width: screenW, height: screenH };
          }
        };
      },
      getElementById: function(id) {
        if (id === 'game-container') return mockContainer;
        return null;
      },
      querySelector: function(sel) {
        if (sel === '#game-container') return mockContainer;
        return null;
      },
      querySelectorAll: function() { return []; },
      elementFromPoint: function() { return null; },
      exitPointerLock: function() {},
      getElementsByTagName: function(tag) {
        if ((tag || '').toLowerCase() === 'head') return [global.document.head];
        if ((tag || '').toLowerCase() === 'body') return [global.document.body];
        return [];
      },
      addEventListener: function(type, listener) {
        if (!docListeners[type]) docListeners[type] = [];
        docListeners[type].push(listener);
      },
      removeEventListener: function(type, listener) {
        if (!docListeners[type]) return;
        var idx = docListeners[type].indexOf(listener);
        if (idx !== -1) docListeners[type].splice(idx, 1);
      },
      dispatchEvent: function(evt) {
        var list = docListeners[evt.type];
        if (list) {
          for (var i = 0; i < list.length; i++) {
            list[i].call(global.document, evt);
          }
        }
      }
    };
    global.window.document = global.document;
  }

  // Ensure document.body.appendChild never throws TypeError on non-Node objects
  if (global.document && global.document.body) {
    var rawBodyAppend = global.document.body.appendChild;
    global.document.body.appendChild = function(child) {
      if (rawBodyAppend) {
        try {
          return rawBodyAppend.call(global.document.body, child);
        } catch (e) {
          return child;
        }
      }
      return child;
    };
  }

  if (typeof global.Image === 'undefined' && typeof tt.createImage === 'function') {
    global.Image = function() {
      return tt.createImage();
    };
  }

  if (typeof global.Audio === 'undefined' && typeof tt.createInnerAudioContext === 'function') {
    global.Audio = function(src) {
      var audio = tt.createInnerAudioContext();
      if (src) audio.src = src;
      return audio;
    };
  }

  if (typeof global.localStorage === 'undefined') {
    global.localStorage = {
      getItem: function(key) {
        try {
          return tt.getStorageSync(key) || null;
        } catch (e) {
          return null;
        }
      },
      setItem: function(key, val) {
        try {
          tt.setStorageSync(key, val);
        } catch (e) {}
      },
      removeItem: function(key) {
        try {
          tt.removeStorageSync(key);
        } catch (e) {}
      },
      clear: function() {
        try {
          tt.clearStorageSync();
        } catch (e) {}
      }
    };
  }

  if (typeof global.requestAnimationFrame === 'undefined') {
    global.requestAnimationFrame = tt.requestAnimationFrame || function(cb) {
      return setTimeout(cb, 16);
    };
  }
  if (typeof global.cancelAnimationFrame === 'undefined') {
    global.cancelAnimationFrame = tt.cancelAnimationFrame || function(id) {
      clearTimeout(id);
    };
  }

  // 7. Forward touch events from ByteDance runtime to canvas & window
  if (mainCanvas) {
    function synthesizeTouchEvent(type, e) {
      var touches = (e && e.touches) ? e.touches : [];
      var changedTouches = (e && e.changedTouches) ? e.changedTouches : [];

      function normalizeTouchList(list) {
        var res = [];
        for (var i = 0; i < list.length; i++) {
          var t = list[i];
          var cx = t.clientX !== undefined ? t.clientX : (t.x !== undefined ? t.x : 0);
          var cy = t.clientY !== undefined ? t.clientY : (t.y !== undefined ? t.y : 0);
          res.push({
            identifier: t.identifier !== undefined ? t.identifier : i,
            clientX: cx,
            clientY: cy,
            pageX: t.pageX !== undefined ? t.pageX : cx,
            pageY: t.pageY !== undefined ? t.pageY : cy,
            screenX: t.screenX !== undefined ? t.screenX : cx,
            screenY: t.screenY !== undefined ? t.screenY : cy,
            target: mainCanvas
          });
        }
        return res;
      }

      var normTouches = normalizeTouchList(touches);
      var normChangedTouches = normalizeTouchList(changedTouches);

      return {
        type: type,
        touches: normTouches,
        changedTouches: normChangedTouches,
        targetTouches: normTouches,
        timeStamp: (e && e.timeStamp) || Date.now(),
        preventDefault: function() {},
        stopPropagation: function() {},
        target: mainCanvas,
        currentTarget: mainCanvas
      };
    }

    function dispatchTouch(type, e) {
      var evt = synthesizeTouchEvent(type, e);
      if (mainCanvas && mainCanvas.dispatchEvent) {
        mainCanvas.dispatchEvent(evt);
      }
      dispatchWindowEvent(evt);
    }

    if (typeof tt.onTouchStart === 'function') {
      tt.onTouchStart(function(e) { dispatchTouch('touchstart', e); });
    }
    if (typeof tt.onTouchMove === 'function') {
      tt.onTouchMove(function(e) { dispatchTouch('touchmove', e); });
    }
    if (typeof tt.onTouchEnd === 'function') {
      tt.onTouchEnd(function(e) { dispatchTouch('touchend', e); });
    }
    if (typeof tt.onTouchCancel === 'function') {
      tt.onTouchCancel(function(e) { dispatchTouch('touchcancel', e); });
    }
  }

  if (typeof tt.onError === 'function') {
    tt.onError(function(err) {
      console.error('[ByteDanceMiniGame Runtime Error]', err);
    });
  }

  console.log('[ByteDanceAdapter] Runtime polyfills injected successfully.');
})();
`;

  const adapterPath = path.resolve(targetDir, 'adapter.js');
  fs.writeFileSync(adapterPath, adapterCode, 'utf-8');
  copiedFilesCount++;
  totalBytes += Buffer.byteLength(adapterCode);

  // 8. Generate game.js (Bootstrap Entry)
  const gameJsCode = `/**
 * 《孤城神机营》- ByteDance Mini Game Bootstrap Entry Point
 * Auto-generated by scripts/build-douyin.js
 */

// Step 1: Initialize ByteDance mini-game environment shims
import './adapter.js';

// Step 2: Bootstrap game engine and presentation layer
import '${entryFile}';
`;

  const gameJsPath = path.resolve(targetDir, 'game.js');
  fs.writeFileSync(gameJsPath, gameJsCode, 'utf-8');
  copiedFilesCount++;
  totalBytes += Buffer.byteLength(gameJsCode);

  const kbTotal = (totalBytes / 1024).toFixed(1);
  const mbTotal = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log('----------------------------------------------------');
  console.log(' [build-douyin] Packaging complete!');
  console.log(` [build-douyin] Total files: ${copiedFilesCount}`);
  console.log(` [build-douyin] Total package size: ${kbTotal} KB (${mbTotal} MB)`);
  console.log(` [build-douyin] Output ready for ByteDance Developer Tools: ${targetDir}`);
  console.log('----------------------------------------------------');

  return {
    success: true,
    targetDir,
    copiedFilesCount,
    totalBytes,
    entryFile
  };
}

// Auto-run if executed directly via CLI
const isDirectCli = process.argv[1] && (
  process.argv[1].replace(/\\/g, '/').endsWith('build-douyin.js') ||
  process.argv[1].replace(/\\/g, '/').endsWith('proposed_build_douyin.js')
);

if (isDirectCli) {
  try {
    buildDouyin();
  } catch (err) {
    console.error('[build-douyin] Fatal build error:', err);
    process.exit(1);
  }
}
