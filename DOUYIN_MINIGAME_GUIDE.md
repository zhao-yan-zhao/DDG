# 《孤城神机营》抖音小游戏开发、打包与接入全指南 (ByteDance Mini-Game Guide)

> **版本**：v1.0.0  
> **适用平台**：抖音小游戏 (ByteDance Mini Game / 抖音 / 今日头条 / 西瓜视频) & Web (HTML5)  
> **基准分辨率**：750×1334 px (竖屏单手操作, 比例适配 `Phaser.Scale.FIT`, `CENTER_BOTH`)  
> **相关规范**：GDD V3.0 执行设计书 (§12.1, §12.3, §13.1) 与 PROJECT.md (F6.5, F6.6)

---

## 一、 架构总览与双目标编译流水线

《孤城神机营》采用纯逻辑解耦架构（Headless Domain Model）与跨平台桥接层（Platform Bridge）：
- **纯逻辑核心 (`src/core/`)**：100% 纯 TypeScript，零 DOM / 零 Phaser 依赖，支持 Vitest 单元测试与极速仿真。
- **渲染表现层 (`src/presentation/`)**：Phaser 3.87+ 视口自适应、对象池化与渲染管线。
- **平台适配桥 (`src/platform/`)**：定义统一 `IPlatform` 契约，提供 `WebPlatform` (标准 HTML5) 与 `DouyinPlatform` (字节 `tt` 运行时) 实现，并通过 `PlatformBridge` 自动感知当前运行宿主。

```
                    ┌─────────────────────────┐
                    │      游戏业务与表现层    │
                    │   (Phaser 3 / Scenes)   │
                    └────────────┬────────────┘
                                 │ 调用
                    ┌────────────▼────────────┐
                    │     PlatformBridge      │
                    │      (IPlatform)        │
                    └──────┬────────────┬─────┘
                           │            │
            typeof tt !== 'undefined'   浏览器环境
                           │            │
           ┌───────────────▼──┐      ┌──▼──────────────┐
           │  DouyinPlatform  │      │   WebPlatform   │
           │  (tt.* 原生能力)  │      │ (DOM/Audio/Web) │
           └──────────────────┘      └─────────────────┘
```

### 构建目标说明

| npm 命令 | 执行逻辑 | 目标产物目录 | 运行载体 |
| :--- | :--- | :--- | :--- |
| `npm run build:web` | `tsc --noEmit && vite build` | `dist/` | 桌面与移动端 Web 浏览器 |
| `npm run build:douyin` | `tsc --noEmit && vite build && node scripts/build-douyin.js` | `dist-douyin/` | 抖音开发者工具 / 抖音真机小游戏 |
| `npm run preview` | `vite preview` | 本地 Web 预览服务器 (`localhost:4173`) | 浏览器全流程调试 |

---

## 二、 研发环境与开发者工具准备

### 1. 基础环境
- **Node.js**：`>= 18.0.0` (推荐 LTS 20.x 或 22.x)
- **npm**：`>= 9.0.0`
- **代码编辑器**：VS Code 或 WebStorm

### 2. 下载与安装【抖音开发者工具】
- 官方下载入口：[抖音开放平台 - 开发者工具下载中心](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/developer-instrument/download/developer-instrument-update-log)
- 请根据操作系统选择：
  - Windows 64位 安装包 (`.exe`)
  - macOS (Apple Silicon / Intel) 安装包 (`.dmg`)
- 安装完毕后，使用已实名绑定的 **抖音 App** 扫码登录开发者工具。

---

## 三、 打包构建全流程

### 1. 安装项目依赖
在工程根目录 `d:\Projects\DDG` 下执行：
```bash
npm install
```

### 2. 执行抖音小游戏专属打包命令
```bash
npm run build:douyin
```

打包流水线将自动执行以下三个阶段：
1. **TypeScript 类型校验 (`tsc --noEmit`)**：严密检查所有核心模块与平台桥接代码的类型一致性。
2. **Vite 生产构建 (`vite build`)**：将 TypeScript 与 Phaser 资源编译打包入 `dist/` 目录。
3. **字节打包器执行 (`node scripts/build-douyin.js`)**：
   - 提取 Vite 输出的 JS 块与静态资源并同步至 `dist-douyin/assets/`；
   - 生成符合字节小游戏规范的 `game.json`（竖屏 750×1334、关闭系统状态栏、网络超时配置）；
   - 生成开发工具工程描述配置 `project.config.json`；
   - 生成运行时垫片 `adapter.js`（polyfill `window`、`document`、`canvas`、`Audio`、`Image`、`localStorage` 与触控事件分发）；
   - 生成入口文件 `game.js`。

### 3. 构建产物结构 (`dist-douyin/`)
```text
dist-douyin/
├── game.json                 # 小游戏全局配置文件 (设备方向/网络配置)
├── game.js                   # 小游戏根入口 (引入 adapter 并启动游戏)
├── adapter.js                # 字节小程序环境 DOM/Canvas/Audio 兼容层
├── project.config.json       # 抖音开发者工具工程配置 (AppID/ES6转译)
└── assets/
    ├── index-[hash].js       # 游戏编译打包后的全量逻辑与渲染层
    └── ...                   # 音频、精灵图集与字体资产
```

---

## 四、 导入抖音开发者工具与工程配置

### 1. 新建/导入项目
1. 打开 **抖音开发者工具**；
2. 在顶部或左侧导航栏中选择 **【小游戏】** 标签页（切勿选成小程序）；
3. 点击 **【导入项目】**（或 **【+ 新建】**）；
4. 填写项目参数：
   - **项目目录**：选择打包产物所在目录 `d:\Projects\DDG\dist-douyin`（注意：指向 `dist-douyin`，而非项目根目录！）；
   - **AppID**：
     - 若已有在抖音开放平台申请的小游戏 AppID，直接输入（如 `ttxxxxxxxxxxxxxxxx`）；
     - 若处于本地原型开发/验收阶段，选择 **【测试号】** 或输入默认测试 AppID `tt709f0622eee64ce502`；
   - **项目名称**：填写 `孤城神机营` 或 `gucheng-shenjiying`；
5. 点击 **【确定】** 载入工程。

### 2. 模拟器视口与调试配置
1. **机型选择**：
   - 在模拟器上方下拉机型菜单中选择 **iPhone 13** 或自定义 **750 × 1334** 分辨率；
   - 确认缩放比例为 **100%**。
2. **控制台日志确认**：
   - 打开底部 **Console** 面板；
   - 确认输出包含：
     ```text
     [ByteDanceAdapter] Runtime polyfills injected successfully.
     《孤城神机营》已成功启动！
     ```
3. **工程设置校验**：
   - 点击右上角 **【详情】** -> **【本地设置】**；
   - 确保勾选 **ES6 转 ES5**、**增强编译**；
   - 调试基础库版本选择当前最新稳定版本（`>= 2.30.0`）。

---

## 五、 真机预览与远程调试 (Mobile Preview & Remote Debug)

### 1. 二维码真机预览
1. 在开发者工具顶部工具栏点击 **【预览】** 按钮；
2. 工具将对代码包进行校验并在屏幕上生成二维码；
3. 使用手机端 **抖音 App**（需已加入该 AppID 体验成员或管理员名单）扫描二维码，即可在手机中全屏体验游戏。

### 2. 真机性能与体验关键验收清单
- [ ] **触控防遮挡 (Touch Y-Offset)**：手指按压拖拽沙盘器械时，器械中心自动向上偏移 80px，手指绝无遮挡。
- [ ] **二合一合成与震动反馈**：同名同星器械碰撞触发合成时，手机产生轻快震动反馈 (`tt.vibrateShort`)。
- [ ] **音频同步**：背景音乐与发射火炮音效正常，切后台时自动静音暂停，切回前台恢复。
- [ ] **同屏流畅度**：敌军怪潮推进时，保持 60 帧稳定，DrawCall 锁定在 $\le 45$。

---

## 六、 商业化激励视频广告 (IAA) 接入与测试

根据 GDD V3.0 §12.1 规范，《孤城神机营》规划了 4 处高转化黄金广告位。

### 1. 开放平台广告位配置
1. 登录 [抖音开放平台控制台](https://developer.open-douyin.com/)；
2. 进入：**【功能管理】** -> **【流量主】** -> **【广告位管理】**；
3. 新建 **激励视频广告**，获取各广告位的 `adUnitId`：

| 广告位代码 | 场景名称 | 触发时机与玩家权益 (GDD §12.1) |
| :--- | :--- | :--- |
| `ad_revive` | **绝境逆转·破城复活** | 城墙耐久归零失败时弹出；观看后立即恢复 50% 城墙 HP，全屏清空小兵，附带 4.0 秒冰封霸体（单局限 1 次） |
| `ad_double_reward` | **胜局大捷·双倍俸禄** | 通关第 5 波、第 10 波首领时弹出；本波银两与图纸收益 $\times 200\%$ |
| `ad_tactics_hint` | **残局锦囊·战术提示** | 【墨门残局】连败 2 次触发；观看后高亮唯一解关键位置或给予局内撤回机会 |
| `ad_start_silver` | **战备补给·开局福利** | 开局军备商店提供 1 次观看视频免费获得 20 银两起始储备 |

### 2. 代码调用范式
通过 `PlatformBridge.getPlatform()` 发起激励视频请求：
```typescript
import { PlatformBridge } from './platform';

async function onPlayerReviveClick() {
  const platform = PlatformBridge.getPlatform();
  
  // 唤起激励视频广告
  const result = await platform.showRewardedVideoAd('ad_revive');
  
  if (result.isEnded) {
    // 玩家完整观看完视频，发放绝境复活奖励
    console.log('广告播放完毕，执行复活逻辑');
    wallManager.restoreWallHpPercent(0.50);
    battleField.freezeAllEnemies(4.0);
  } else {
    // 玩家中途关闭或跳过广告，不予发放奖励
    console.log('玩家中途跳过广告，无复活奖励');
  }
}
```

---

## 七、 抖音裂变与社交功能接入 (GDD §12.3)

### 1. 社交转发分享
```typescript
import { PlatformBridge } from './platform';

const platform = PlatformBridge.getPlatform();

// 主动调用分享
await platform.shareAppMessage({
  title: '明代黑科技神机营！谁能守住第10波？',
  imageUrl: 'assets/share_banner.png',
  query: 'inviterId=user_12345&chapter=1'
});

// 监听右上角“...”被动分享
platform.onShareAppMessage(() => ({
  title: '城头告急！快来助我摆布墨家神机火炮！',
  imageUrl: 'assets/share_banner.png',
  query: 'channel=top_menu'
}));
```

---

## 八、 上线发布检查清单 (Release Checklist)

在正式提交抖音小游戏审核前，请逐一核验以下合规与技术指标：

1. **域名白名单配置**：
   - 登录抖音开放平台 -> **【开发配置】** -> **【服务器域名】**；
   - 将游戏涉及的资源 CDN 域名、数据埋点域名及后端 API 域名添加至 `request` 和 `downloadFile` 白名单。
2. **分包与包体体积红线**：
   - 初始主包大小必须 $\le 4\text{ MB}$（当前打包产物经压缩后为 $< 1\text{ MB}$，完全达标）；
   - 总包体大小不得超过 $20\text{ MB}$。
3. **软著与版号资质**：
   - 按照 GDD §14 提供的合规功能文本准备软件著作权证书材料；
   - 配置用户隐私政策与儿童个人信息保护指引。
4. **性能红线自测 (GDD §13.1)**：
   - 使用开发者工具内置的 **Audits (体验评分)** 进行自动化诊断；
   - 确认内存占用稳定无泄漏，首屏加载时间 $< 2.5\text{s}$。
