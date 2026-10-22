/**
 * 《孤城神机营》- WeChat Mini Game Packaging Script
 * Usage: node scripts/build-wechat.js
 * 
 * Packages Vite production build (dist/) into WeChat Mini Game structure (dist-wechat/).
 * Generates:
 *   - dist-wechat/game.json
 *   - dist-wechat/project.config.json
 *   - dist-wechat/adapter.js (window, document, canvas, audio, touch polyfills)
 *   - dist-wechat/game.js (Mini-game bootstrap entry)
 *   - dist-wechat/assets/ (bundled JavaScript, CSS, and media assets)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildWechat(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const sourceDir = options.sourceDir || path.resolve(rootDir, 'dist');
  const targetDir = options.targetDir || path.resolve(rootDir, 'dist-wechat');

  const appId = options.appId || 'wxd4d2600b1a9e5af2';
  const projectName = options.projectName || 'gucheng-shenjiying';

  console.log('----------------------------------------------------');
  console.log(' [build-wechat] Packaging WeChat Mini-Game');
  console.log(` [build-wechat] Source: ${sourceDir}`);
  console.log(` [build-wechat] Target: ${targetDir}`);
  console.log('----------------------------------------------------');

  // 1. Verify Vite build output exists
  if (!fs.existsSync(sourceDir)) {
    const errorMsg = `Source directory not found: ${sourceDir}. Please run "npm run build:web" first.`;
    console.error(` [build-wechat] Error: ${errorMsg}`);
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

  // Filter out non-essential raw materials or designer drafts from public/assets to guarantee < 4MB total bundle
  function isExcludedAsset(srcRelativePath) {
    const normalized = srcRelativePath.replace(/\\/g, '/');
    if (normalized.includes('enemies_raw')) return true;
    if (normalized.endsWith('icon_commander.jpg')) return true;
    if (normalized.endsWith('icon_dragon_cannon.jpg')) return true;
    if (normalized.endsWith('weapon_iron_caltrop.png')) return true;
    if (normalized.endsWith('weapon_cannon.png')) return true;
    return false;
  }

  function copyRecursiveSync(src, dest, baseDir) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
      const rel = path.relative(baseDir || path.dirname(src), src);
      if (isExcludedAsset(rel)) return;
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach((childItemName) => {
        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName), baseDir || src);
      });
    } else if (exists && stats.isFile()) {
      const rel = path.relative(baseDir || path.dirname(src), src);
      if (isExcludedAsset(rel)) {
        return; // Skip redundant/large raw asset
      }
      fs.copyFileSync(src, dest);
      copiedFilesCount++;
      totalBytes += stats.size;
    }
  }

  if (fs.existsSync(sourceAssetsDir)) {
    copyRecursiveSync(sourceAssetsDir, targetAssetsDir, sourceAssetsDir);
  }

  // Also check public/assets to ensure any additional subdirectories (e.g. enemies, weapons) are bundled
  const publicAssetsDir = path.resolve(rootDir, 'public', 'assets');
  if (fs.existsSync(publicAssetsDir)) {
    copyRecursiveSync(publicAssetsDir, targetAssetsDir, publicAssetsDir);
  }

  // Copy any other static non-html assets from root of dist
  const rootDistFiles = fs.readdirSync(sourceDir);
  for (const file of rootDistFiles) {
    if (file === 'index.html' || file === 'assets' || file === 'favicon.ico' || file === 'icon.jpg') continue;
    const srcFile = path.resolve(sourceDir, file);
    const dstFile = path.resolve(targetDir, file);
    const stat = fs.statSync(srcFile);

    if (stat.isFile()) {
      fs.copyFileSync(srcFile, dstFile);
      copiedFilesCount++;
      totalBytes += stat.size;
    }
  }

  // Purge any source map (.map) files to avoid bloat and missing source map errors in DevTools
  function removeSourceMaps(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        removeSourceMaps(full);
      } else if (item.endsWith('.map')) {
        try { fs.unlinkSync(full); } catch (e) {}
      }
    }
  }
  removeSourceMaps(targetDir);

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
    console.warn(' [build-wechat] Warning: Could not detect entry JS chunk, using default:', entryFile);
  } else {
    console.log(` [build-wechat] Detected game entry chunk: ${entryFile}`);
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
    }
  };

  if (options.openDataContext && typeof options.openDataContext === 'string' && options.openDataContext.trim().length > 0) {
    gameConfig.openDataContext = options.openDataContext.trim();
  }

  const gameJsonPath = path.resolve(targetDir, 'game.json');
  fs.writeFileSync(gameJsonPath, JSON.stringify(gameConfig, null, 2), 'utf-8');
  copiedFilesCount++;
  totalBytes += Buffer.byteLength(JSON.stringify(gameConfig));

  // 6. Generate project.config.json (Clean, standard WeChat Mini-Game format)
  const projectConfig = {
    description: 'WeChat Mini Game Configuration',
    setting: {
      urlCheck: false,
      es6: true,
      enhance: false,
      postcss: false,
      preloadBackgroundData: false,
      minified: false
    },
    compileType: 'game',
    libVersion: '3.17.4',
    appid: appId,
    projectname: projectName,
    packOptions: {
      ignore: [
        { type: 'file', value: '[object%200bject]' },
        { type: 'file', value: '[object Object]' }
      ]
    }
  };

  const projectConfigPath = path.resolve(targetDir, 'project.config.json');
  fs.writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2), 'utf-8');
  copiedFilesCount++;
  totalBytes += Buffer.byteLength(JSON.stringify(projectConfig));

  // 7. Generate adapter.js (WeChat Mini-Game Robust Runtime Polyfill)
  const adapterCode = `/**
 * 《孤城神机营》- WeChat Mini Game Runtime Adapter Shim
 * Robust polyfills for DOM, Window, Canvas, Image, and Audio under WeChat WAGame environment.
 */
(function() {
  if (typeof wx === 'undefined') return;

  var global = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
  if (typeof global.window === 'undefined') {
    global.window = global;
  }
  var win = global.window;

  // Safe property assigner: never throws on getter-only or read-only properties in strict mode
  function safeSet(target, prop, value) {
    if (!target) return;
    try {
      var current = target[prop];
      if (current === value) return;
    } catch (e0) {}
    try {
      target[prop] = value;
    } catch (e) {
      try {
        Object.defineProperty(target, prop, {
          value: value,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e2) {}
    }
  }

  // 1. Self-referencing window / top / self
  safeSet(win, 'window', win);
  safeSet(win, 'top', win);
  safeSet(win, 'self', win);
  safeSet(global, 'window', win);
  safeSet(global, 'top', win);
  safeSet(global, 'self', win);

  // 2. Safe Event Listener Polyfill for Window and Global
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
          list[i].call(win, evt);
        } catch (err) {
          console.warn('[WechatAdapter] Window listener error:', err);
        }
      }
    }
  }

  if (typeof win.addEventListener !== 'function') {
    safeSet(win, 'addEventListener', addWindowListener);
  }
  if (typeof win.removeEventListener !== 'function') {
    safeSet(win, 'removeEventListener', removeWindowListener);
  }
  if (typeof global.addEventListener !== 'function') {
    safeSet(global, 'addEventListener', win.addEventListener || addWindowListener);
  }
  if (typeof global.removeEventListener !== 'function') {
    safeSet(global, 'removeEventListener', win.removeEventListener || removeWindowListener);
  }

  // 3. Prevent Illegal Invocation on focus / blur / scrollTo / getComputedStyle
  safeSet(win, 'focus', function() {});
  safeSet(win, 'blur', function() {});
  safeSet(win, 'scrollTo', function() {});
  safeSet(global, 'focus', win.focus);
  safeSet(global, 'blur', win.blur);
  safeSet(global, 'scrollTo', win.scrollTo);

  safeSet(win, 'getComputedStyle', function(el) {
    return (el && el.style) ? el.style : {};
  });
  safeSet(global, 'getComputedStyle', win.getComputedStyle);

  // 4. System and Screen Info
  var sysInfo = {};
  try {
    if (typeof wx.getSystemInfoSync === 'function') {
      sysInfo = wx.getSystemInfoSync() || {};
    } else if (typeof wx.getWindowInfo === 'function') {
      sysInfo = wx.getWindowInfo() || {};
    }
  } catch (e) {}

  var screenW = sysInfo.windowWidth || sysInfo.screenWidth || 750;
  var screenH = sysInfo.windowHeight || sysInfo.screenHeight || 1334;
  var pixelRatio = sysInfo.pixelRatio || 1;

  safeSet(win, 'innerWidth', screenW);
  safeSet(global, 'innerWidth', screenW);
  safeSet(win, 'innerHeight', screenH);
  safeSet(global, 'innerHeight', screenH);
  safeSet(win, 'devicePixelRatio', pixelRatio);
  safeSet(global, 'devicePixelRatio', pixelRatio);

  // 4.1 Performance.now Polyfill
  var perfShim = {
    now: function() {
      if (typeof wx.getPerformance === 'function') {
        try {
          var p = wx.getPerformance();
          if (p && typeof p.now === 'function') return p.now();
        } catch (e) {}
      }
      return Date.now();
    }
  };
  safeSet(win, 'performance', perfShim);
  safeSet(global, 'performance', perfShim);

  var screenObj = {
    width: screenW,
    height: screenH,
    availWidth: screenW,
    availHeight: screenH,
    orientation: {
      type: screenH >= screenW ? 'portrait-primary' : 'landscape-primary',
      angle: 0,
      addEventListener: function() {},
      removeEventListener: function() {}
    }
  };
  safeSet(win, 'screen', screenObj);
  safeSet(global, 'screen', screenObj);

  safeSet(win, 'location', {
    href: 'http://localhost/index.html',
    protocol: 'http:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/index.html',
    search: '',
    hash: '',
    origin: 'http://localhost',
    reload: function() {}
  });
  safeSet(global, 'location', win.location);

  safeSet(win, 'matchMedia', function(query) {
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
  });
  safeSet(global, 'matchMedia', win.matchMedia);

  if (typeof global.navigator === 'undefined') {
    safeSet(global, 'navigator', {
      userAgent: 'WeChatMicroGame/' + (sysInfo.version || '1.0'),
      platform: sysInfo.platform || 'devtools',
      appVersion: sysInfo.version || '1.0'
    });
  }
  safeSet(win, 'navigator', global.navigator);

  // 5. MutationObserver Stub
  if (typeof global.MutationObserver === 'undefined') {
    function MockMutationObserver(callback) {
      this.callback = callback;
    }
    MockMutationObserver.prototype.observe = function() {};
    MockMutationObserver.prototype.disconnect = function() {};
    MockMutationObserver.prototype.takeRecords = function() { return []; };
    safeSet(global, 'MutationObserver', MockMutationObserver);
    safeSet(win, 'MutationObserver', MockMutationObserver);
  }

  // 6. Global DOM Types Polyfill (prevent ReferenceError during instanceof checks)
  function DummyElement(tag) {
    this.tagName = (tag || 'DIV').toUpperCase();
    this.nodeName = this.tagName;
    this.nodeType = 1;
    this.style = {};
    this.dataset = {};
    this.childNodes = [];
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.offsetWidth = screenW;
    this.offsetHeight = screenH;
    this.clientWidth = screenW;
    this.clientHeight = screenH;
    this.classList = {
      add: function() {},
      remove: function() {},
      contains: function() { return false; },
      toggle: function() {}
    };
  }
  DummyElement.prototype.nodeType = 1;
  DummyElement.prototype.appendChild = function(child) { return child; };
  DummyElement.prototype.removeChild = function(child) { return child; };
  DummyElement.prototype.insertBefore = function(newChild) { return newChild; };
  DummyElement.prototype.addEventListener = function() {};
  DummyElement.prototype.removeEventListener = function() {};
  DummyElement.prototype.setAttribute = function() {};
  DummyElement.prototype.getAttribute = function() { return null; };
  DummyElement.prototype.removeAttribute = function() {};
  DummyElement.prototype.contains = function() { return false; };
  DummyElement.prototype.getBoundingClientRect = function() {
    return { top: 0, left: 0, width: screenW, height: screenH, right: screenW, bottom: screenH, x: 0, y: 0 };
  };

  safeSet(global, 'Element', DummyElement);
  safeSet(win, 'Element', DummyElement);
  safeSet(global, 'HTMLElement', DummyElement);
  safeSet(win, 'HTMLElement', DummyElement);
  safeSet(global, 'HTMLCanvasElement', DummyElement);
  safeSet(win, 'HTMLCanvasElement', DummyElement);
  safeSet(global, 'HTMLImageElement', DummyElement);
  safeSet(win, 'HTMLImageElement', DummyElement);
  safeSet(global, 'HTMLAudioElement', DummyElement);
  safeSet(win, 'HTMLAudioElement', DummyElement);
  safeSet(global, 'HTMLVideoElement', DummyElement);
  safeSet(win, 'HTMLVideoElement', DummyElement);

  // 7. Create and enhance main screen canvas
  var mainCanvas = null;
  if (typeof wx.createCanvas === 'function') {
    mainCanvas = wx.createCanvas();
    safeSet(mainCanvas, 'tagName', 'CANVAS');
    safeSet(mainCanvas, 'nodeName', 'CANVAS');
    if (!mainCanvas.style) mainCanvas.style = {};
    mainCanvas.style.width = screenW + 'px';
    mainCanvas.style.height = screenH + 'px';
    safeSet(mainCanvas, 'clientWidth', screenW);
    safeSet(mainCanvas, 'clientHeight', screenH);
    safeSet(mainCanvas, 'offsetWidth', screenW);
    safeSet(mainCanvas, 'offsetHeight', screenH);

    if (!mainCanvas.getBoundingClientRect) {
      mainCanvas.getBoundingClientRect = function() {
        return { top: 0, left: 0, width: screenW, height: screenH, right: screenW, bottom: screenH, x: 0, y: 0 };
      };
    }

    if (mainCanvas.constructor) {
      safeSet(global, 'HTMLCanvasElement', mainCanvas.constructor);
      safeSet(win, 'HTMLCanvasElement', mainCanvas.constructor);
      safeSet(global, 'Canvas', mainCanvas.constructor);
      try {
        Object.defineProperty(mainCanvas.constructor, Symbol.hasInstance, {
          value: function(instance) {
            return !!(instance && (instance.getContext !== undefined || instance.tagName === 'CANVAS' || instance.nodeName === 'CANVAS'));
          }
        });
      } catch (e) {}
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
              console.warn('[WechatAdapter] Canvas event listener error:', err);
            }
          }
        }
      };
    }

    safeSet(mainCanvas, 'focus', function() {});
    safeSet(mainCanvas, 'blur', function() {});

    safeSet(global, 'canvas', mainCanvas);
    safeSet(win, 'canvas', mainCanvas);
  }

  // 8. Polyfill document
  var docListeners = {};
  var mockContainer = {
    tagName: 'DIV',
    nodeType: 1,
    id: 'game-container',
    style: { width: screenW + 'px', height: screenH + 'px' },
    clientWidth: screenW,
    clientHeight: screenH,
    offsetWidth: screenW,
    offsetHeight: screenH,
    appendChild: function(c) { return c; },
    removeChild: function(c) { return c; },
    addEventListener: function() {},
    removeEventListener: function() {},
    getBoundingClientRect: function() {
      return { top: 0, left: 0, width: screenW, height: screenH, right: screenW, bottom: screenH, x: 0, y: 0 };
    }
  };

  var mockBody = {
    tagName: 'BODY',
    nodeType: 1,
    style: {},
    clientWidth: screenW,
    clientHeight: screenH,
    offsetWidth: screenW,
    offsetHeight: screenH,
    appendChild: function(c) { return c; },
    removeChild: function(c) { return c; },
    addEventListener: function() {},
    removeEventListener: function() {},
    getBoundingClientRect: function() {
      return { top: 0, left: 0, width: screenW, height: screenH, right: screenW, bottom: screenH, x: 0, y: 0 };
    }
  };

  var mockDocument = {
    body: mockBody,
    head: { appendChild: function(c) { return c; }, removeChild: function(c) { return c; } },
    documentElement: { nodeType: 1, style: {}, clientWidth: screenW, clientHeight: screenH },
    readyState: 'complete',
    hidden: false,
    visibilityState: 'visible',
    location: win.location,
    createElement: function(tag) {
      tag = (tag || '').toLowerCase();
      if (tag === 'canvas') {
        var c = wx.createCanvas ? wx.createCanvas() : { getContext: function() { return null; } };
        safeSet(c, 'tagName', 'CANVAS');
        safeSet(c, 'nodeName', 'CANVAS');
        if (!c.style) c.style = {};
        if (!c.getBoundingClientRect) {
          c.getBoundingClientRect = function() {
            return { top: 0, left: 0, width: screenW, height: screenH, right: screenW, bottom: screenH, x: 0, y: 0 };
          };
        }
        if (!c.addEventListener) {
          c.addEventListener = function() {};
          c.removeEventListener = function() {};
        }
        return c;
      }
      if (tag === 'image' || tag === 'img') {
        return wx.createImage ? wx.createImage() : {};
      }
      if (tag === 'audio') {
        return wx.createInnerAudioContext ? wx.createInnerAudioContext() : {};
      }
      if (tag === 'link') {
        return {
          tagName: 'LINK',
          relList: {
            supports: function() { return true; }
          },
          setAttribute: function() {},
          getAttribute: function() { return null; }
        };
      }
      return new DummyElement(tag);
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
      if ((tag || '').toLowerCase() === 'head') return [mockDocument.head];
      if ((tag || '').toLowerCase() === 'body') return [mockDocument.body];
      return [];
    },
    createElementNS: function(ns, tag) {
      return mockDocument.createElement(tag);
    },
    createTextNode: function(text) {
      return { textContent: text, nodeValue: text };
    },
    createDocumentFragment: function() {
      return new DummyElement('#document-fragment');
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
          list[i].call(mockDocument, evt);
        }
      }
    }
  };

  safeSet(global, 'document', mockDocument);
  safeSet(win, 'document', mockDocument);

  // 9. Image & Audio Constructors
  if (typeof wx.createImage === 'function') {
    var dummyImg = null;
    try {
      dummyImg = wx.createImage();
    } catch (e) {}

    var ImageCtor = function() {
      var img = wx.createImage();
      if (!img.addEventListener) {
        var listeners = {};
        img.addEventListener = function(type, fn) {
          if (!listeners[type]) listeners[type] = [];
          listeners[type].push(fn);
        };
        img.removeEventListener = function(type, fn) {
          if (!listeners[type]) return;
          var idx = listeners[type].indexOf(fn);
          if (idx !== -1) listeners[type].splice(idx, 1);
        };
        var origOnload = img.onload;
        img.onload = function(e) {
          if (typeof origOnload === 'function') origOnload.call(img, e);
          if (listeners['load']) {
            listeners['load'].forEach(function(fn) { fn.call(img, e); });
          }
        };
        var origOnerror = img.onerror;
        img.onerror = function(e) {
          if (typeof origOnerror === 'function') origOnerror.call(img, e);
          if (listeners['error']) {
            listeners['error'].forEach(function(fn) { fn.call(img, e); });
          }
        };
      }
      return img;
    };
    if (dummyImg && dummyImg.constructor) {
      safeSet(global, 'HTMLImageElement', dummyImg.constructor);
      safeSet(win, 'HTMLImageElement', dummyImg.constructor);
    }
    try {
      Object.defineProperty(ImageCtor, Symbol.hasInstance, {
        value: function(instance) {
          return !!(instance && (instance.src !== undefined || (dummyImg && instance instanceof dummyImg.constructor)));
        }
      });
    } catch (e) {}
    safeSet(global, 'Image', ImageCtor);
    safeSet(win, 'Image', ImageCtor);
  }

  // 9.4 URL and createObjectURL Polyfill (Always ensure safe string conversion)
  var objectUrlCounter = 0;
  var objectUrlMap = {};
  var MockURL = function(url, base) {
    this.href = typeof url === 'string' ? url : (url && url.href ? url.href : '');
  };
  MockURL.createObjectURL = function(blob) {
    if (typeof blob === 'string') return blob;
    if (blob && typeof blob === 'object') {
      if (typeof blob.url === 'string') return blob.url;
      if (typeof blob.href === 'string') return blob.href;
    }
    if (typeof wx.getFileSystemManager === 'function' && typeof wx.env !== 'undefined' && wx.env.USER_DATA_PATH) {
      try {
        var tempPath = wx.env.USER_DATA_PATH + '/blob_' + (++objectUrlCounter) + '.png';
        var data = (blob && blob.data) ? blob.data : blob;
        if (data) {
          wx.getFileSystemManager().writeFileSync(tempPath, data);
          objectUrlMap[tempPath] = true;
          return tempPath;
        }
      } catch (e) {}
    }
    return '';
  };
  MockURL.revokeObjectURL = function(url) {
    if (url && objectUrlMap[url] && typeof wx.getFileSystemManager === 'function') {
      try {
        wx.getFileSystemManager().unlinkSync(url);
        delete objectUrlMap[url];
      } catch (e) {}
    }
  };
  safeSet(global, 'URL', MockURL);
  safeSet(win, 'URL', MockURL);

  // 9.5 XMLHttpRequest Polyfill
  if (typeof global.XMLHttpRequest === 'undefined') {
    function MockXHR() {
      this.readyState = 0;
      this.status = 200;
      this.responseText = '';
      this.response = '';
      this.responseType = '';
    }
    MockXHR.prototype.open = function(method, url) {
      if (url && typeof url === 'object') {
        this.url = url.href || url.url || url.src || '';
      } else {
        this.url = String(url || '');
      }
      if (this.url.indexOf('[object') !== -1) {
        this.url = '';
      }
    };
    MockXHR.prototype.send = function() {
      var self = this;
      var url = self.url || '';
      if (!url || url.indexOf('[object') !== -1) {
        self.status = 404;
        self.readyState = 4;
        if (self.onerror) self.onerror(new Error('Invalid URL'));
        return;
      }
      if (typeof wx.request === 'function' && (url.startsWith('http://') || url.startsWith('https://'))) {
        wx.request({
          url: url,
          responseType: self.responseType === 'arraybuffer' ? 'arraybuffer' : 'text',
          success: function(res) {
            self.status = res.statusCode || 200;
            self.responseText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            self.response = res.data;
            self.readyState = 4;
            if (self.onload) self.onload();
          },
          fail: function(err) {
            self.status = 0;
            if (self.onerror) self.onerror(err);
          }
        });
      } else if (typeof wx.getFileSystemManager === 'function' && url && !url.startsWith('http')) {
        var fs = wx.getFileSystemManager();
        var filePath = url;
        while (filePath.startsWith('./') || filePath.startsWith('/')) {
          if (filePath.startsWith('./')) filePath = filePath.slice(2);
          else if (filePath.startsWith('/')) filePath = filePath.slice(1);
        }
        fs.readFile({
          filePath: filePath,
          encoding: self.responseType === 'arraybuffer' ? undefined : (self.responseType === 'text' || !self.responseType ? 'utf8' : undefined),
          success: function(res) {
            self.status = 200;
            self.response = res.data;
            self.responseText = typeof res.data === 'string' ? res.data : '';
            self.readyState = 4;
            if (self.onload) self.onload();
          },
          fail: function(err) {
            self.status = 404;
            self.readyState = 4;
            if (self.onerror) self.onerror(err);
            else if (self.onload) self.onload();
          }
        });
      } else {
        setTimeout(function() {
          self.readyState = 4;
          self.status = 200;
          if (self.onload) self.onload();
        }, 0);
      }
    };
    MockXHR.prototype.setRequestHeader = function() {};
    safeSet(global, 'XMLHttpRequest', MockXHR);
    safeSet(win, 'XMLHttpRequest', MockXHR);
  }

  if (typeof wx.createInnerAudioContext === 'function') {
    var AudioCtor = function(src) {
      var audio = wx.createInnerAudioContext();
      if (src) audio.src = src;
      return audio;
    };
    safeSet(global, 'Audio', AudioCtor);
    safeSet(win, 'Audio', AudioCtor);
  }

  // 10. LocalStorage Shim
  var storageShim = {
    getItem: function(key) {
      try {
        var v = wx.getStorageSync(key);
        if (v === undefined || v === null || v === '') return null;
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      } catch (e) {
        return null;
      }
    },
    setItem: function(key, val) {
      try {
        wx.setStorageSync(key, val);
      } catch (e) {}
    },
    removeItem: function(key) {
      try {
        wx.removeStorageSync(key);
      } catch (e) {}
    },
    clear: function() {
      try {
        wx.clearStorageSync();
      } catch (e) {}
    }
  };
  safeSet(global, 'localStorage', storageShim);
  safeSet(win, 'localStorage', storageShim);

  // 11. Animation Frame Handlers
  var raf = (typeof wx.requestAnimationFrame === 'function')
    ? wx.requestAnimationFrame
    : function(cb) { return setTimeout(cb, 16); };
  var caf = (typeof wx.cancelAnimationFrame === 'function')
    ? wx.cancelAnimationFrame
    : function(id) { clearTimeout(id); };

  safeSet(win, 'requestAnimationFrame', raf);
  safeSet(global, 'requestAnimationFrame', raf);
  safeSet(win, 'cancelAnimationFrame', caf);
  safeSet(global, 'cancelAnimationFrame', caf);

  // 12. Forward touch events from WeChat runtime to canvas & window
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

    if (typeof wx.onTouchStart === 'function') {
      wx.onTouchStart(function(e) { dispatchTouch('touchstart', e); });
    }
    if (typeof wx.onTouchMove === 'function') {
      wx.onTouchMove(function(e) { dispatchTouch('touchmove', e); });
    }
    if (typeof wx.onTouchEnd === 'function') {
      wx.onTouchEnd(function(e) { dispatchTouch('touchend', e); });
    }
    if (typeof wx.onTouchCancel === 'function') {
      wx.onTouchCancel(function(e) { dispatchTouch('touchcancel', e); });
    }
  }

  if (typeof wx.onError === 'function') {
    wx.onError(function(err) {
      var msg = err;
      if (err instanceof Error) {
        msg = err.stack || err.message || String(err);
      } else if (typeof err === 'object' && err !== null) {
        try {
          msg = JSON.stringify(err, Object.getOwnPropertyNames(err));
        } catch (e) {
          msg = String(err);
        }
      }
      console.error('[WeChatMiniGame Runtime Error]', err, msg);
    });
  }

  if (typeof wx.onUnhandledRejection === 'function') {
    wx.onUnhandledRejection(function(res) {
      var reason = res && res.reason;
      var msg = reason;
      if (reason instanceof Error) {
        msg = reason.stack || reason.message || String(reason);
      } else if (typeof reason === 'object' && reason !== null) {
        try {
          msg = JSON.stringify(reason, Object.getOwnPropertyNames(reason));
        } catch (e) {
          msg = String(reason);
        }
      }
      console.error('[WeChatMiniGame Unhandled Rejection]', reason, msg);
    });
  }

  safeSet(win, 'onerror', function(msg, url, line, col, err) {
    console.error('[Window Error]', msg, url, line, col, err);
  });

  console.log('[WechatAdapter] Runtime polyfills injected successfully.');
})();
`;

  const adapterPath = path.resolve(targetDir, 'adapter.js');
  fs.writeFileSync(adapterPath, adapterCode, 'utf-8');
  copiedFilesCount++;
  totalBytes += Buffer.byteLength(adapterCode);

  // 8. Copy entry chunk to root as game-bundle.js (or split if > 2000KB to satisfy WeChat Developer Tools limit)
  const absoluteEntryFile = path.resolve(targetDir, entryFile);
  const bundleDestPath = path.resolve(targetDir, 'game-bundle.js');
  const bundlePart1Path = path.resolve(targetDir, 'game-bundle-part1.js');
  const bundlePart2Path = path.resolve(targetDir, 'game-bundle-part2.js');

  const WECHAT_MAX_JS_BYTES = 1900 * 1024; // 1.9MB safety margin (below 2048KB MAX_CODE_LENGTH)
  let isSplitBundle = false;

  if (fs.existsSync(absoluteEntryFile)) {
    let bundleCode = fs.readFileSync(absoluteEntryFile, 'utf-8');
    // Strip source map comment to prevent missing map warnings and errors
    bundleCode = bundleCode.replace(/\/\/#\s*sourceMappingURL=[^\s]+/g, '');

    if (bundleCode.length > WECHAT_MAX_JS_BYTES) {
      isSplitBundle = true;
      let splitIdx = -1;
      const idxThree = bundleCode.indexOf('Three.js Authors');
      if (idxThree !== -1) {
        const commentStart = bundleCode.lastIndexOf('/**', idxThree);
        if (commentStart > 0 && commentStart < WECHAT_MAX_JS_BYTES) {
          splitIdx = commentStart;
        }
      }
      if (splitIdx === -1) {
        splitIdx = bundleCode.lastIndexOf('\n', WECHAT_MAX_JS_BYTES);
      }

      const part1Code = bundleCode.substring(0, splitIdx);
      const part2Code = bundleCode.substring(splitIdx);

      fs.writeFileSync(bundlePart1Path, part1Code, 'utf-8');
      fs.writeFileSync(bundlePart2Path, part2Code, 'utf-8');

      copiedFilesCount += 2;
      totalBytes += fs.statSync(bundlePart1Path).size + fs.statSync(bundlePart2Path).size;

      console.log(` [build-wechat] Large bundle detected (${(bundleCode.length / 1024).toFixed(1)} KB > 1900 KB).`);
      console.log(` [build-wechat] Split bundle into part1 (${(part1Code.length / 1024).toFixed(1)} KB) and part2 (${(part2Code.length / 1024).toFixed(1)} KB) < 2000KB limit.`);
    } else {
      fs.writeFileSync(bundleDestPath, bundleCode, 'utf-8');
      copiedFilesCount++;
      totalBytes += fs.statSync(bundleDestPath).size;
      console.log(' [build-wechat] Copied and sanitized entry chunk to root: ./game-bundle.js');
    }

    // Clean up original entry file in assets/ when split to prevent WeChat DevTools from scanning duplicate 2MB+ files
    try {
      if (isSplitBundle && fs.existsSync(absoluteEntryFile)) {
        fs.unlinkSync(absoluteEntryFile);
        console.log(` [build-wechat] Removed duplicate web bundle from target assets: ${entryFile}`);
      }
    } catch (e) {
      console.warn(' [build-wechat] Could not delete original assets entry file:', e.message);
    }
  }

  // 9. Generate game.js (Bootstrap Entry with synchronous require sequence)
  const gameJsCode = isSplitBundle ? `/**
 * 《孤城神机营》- WeChat Mini Game Bootstrap Entry Point
 * Auto-generated by scripts/build-wechat.js (Split Bundle Mode)
 */

// Step 1: Initialize WeChat mini-game environment shims
require('./adapter.js');

// Step 2: Bootstrap engine part 1 (<2000KB)
require('./game-bundle-part1.js');

// Step 3: Bootstrap engine part 2 (<2000KB)
require('./game-bundle-part2.js');
` : `/**
 * 《孤城神机营》- WeChat Mini Game Bootstrap Entry Point
 * Auto-generated by scripts/build-wechat.js
 */

// Step 1: Initialize WeChat mini-game environment shims
require('./adapter.js');

// Step 2: Bootstrap game engine and presentation layer
require('./game-bundle.js');
`;

  const gameJsPath = path.resolve(targetDir, 'game.js');
  fs.writeFileSync(gameJsPath, gameJsCode, 'utf-8');

  // Accurately tally files and total size directly from target directory
  copiedFilesCount = 0;
  totalBytes = 0;
  function measureDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        measureDir(fullPath);
      } else if (stat.isFile()) {
        copiedFilesCount++;
        totalBytes += stat.size;
      }
    }
  }
  measureDir(targetDir);

  const kbTotal = (totalBytes / 1024).toFixed(1);
  const mbTotal = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log('----------------------------------------------------');
  console.log(' [build-wechat] Packaging complete!');
  console.log(` [build-wechat] Total files: ${copiedFilesCount}`);
  console.log(` [build-wechat] Total package size: ${kbTotal} KB (${mbTotal} MB)`);
  console.log(` [build-wechat] Output ready for WeChat Developer Tools: ${targetDir}`);
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
  process.argv[1].replace(/\\/g, '/').endsWith('build-wechat.js') ||
  process.argv[1].replace(/\\/g, '/').endsWith('proposed_build_wechat.js')
);

if (isDirectCli) {
  try {
    buildWechat();
  } catch (err) {
    console.error('[build-wechat] Fatal build error:', err);
    process.exit(1);
  }
}
