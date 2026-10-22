# 《孤城神机营》微信小游戏开发、打包与接入全指南 (WeChat Mini-Game Guide)

> **版本**：v1.0.0  
> **适用平台**：微信小游戏 (WeChat Mini Game / 微信小程序小游戏类目) & Web (HTML5) & 抖音小游戏  
> **基准分辨率**：750×1334 px (竖屏单手操作, 比例适配 `Phaser.Scale.FIT`, `CENTER_BOTH`)  
> **相关规范**：GDD V3.0 执行设计书 (§12.1, §12.3, §13.1) 与 PROJECT.md (F6.5, F6.6)

---

## 一、 架构总览与多端跨平台流水线

《孤城神机营》采用严格的纯逻辑解耦架构（Headless Domain Model）与跨平台桥接层（Platform Bridge）：
- **纯逻辑领域层 (`src/core/`)**：100% 纯 TypeScript，零 DOM / 零 Phaser 依赖，支持毫秒级无头仿真与 100% 单元测试覆盖。
- **渲染表现层 (`src/presentation/`)**：Phaser 3.87+ 视口自适应、2.5D 重彩工笔画风绘制、对象池化与渲染管线。
- **平台抽象桥 (`src/platform/`)**：统一抽象 `IPlatform` 契约，支持 `WebPlatform` (标准 HTML5)、`DouyinPlatform` (字节 `tt.*`) 与 `WechatPlatform` (微信 `wx.*`)，并通过 `PlatformBridge` 自动感知当前宿主环境。

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
            typeof tt !== 'undefined'   typeof wx !== 'undefined'
                           │            │
            ┌──────────────▼──┐      ┌──▼──────────────┐
            │  DouyinPlatform  │      │  WechatPlatform │
            │  (tt.* 原生能力) │      │  (wx.* 原生能力)│
            └──────────────────┘      └─────────────────┘
                                        │ (默认 fallback)
                                      ┌─▼───────────────┐
                                      │   WebPlatform   │
                                      │ (DOM/Audio/Web) │
                                      └─────────────────┘
```

### 多端构建目标与指令速查

| npm 指令 | 执行逻辑 | 目标产物目录 | 运行载体 |
| :--- | :--- | :--- | :--- |
| `npm run build:wechat` | `tsc --noEmit && vite build && node scripts/build-wechat.js` | `dist-wechat/` | 微信开发者工具 / 微信小游戏真机 |
| `npm run build:douyin` | `tsc --noEmit && vite build && node scripts/build-douyin.js` | `dist-douyin/` | 抖音开发者工具 / 抖音小游戏真机 |
| `npm run build:web` | `tsc --noEmit && vite build` | `dist/` | 桌面与移动端 Web 浏览器 |
| `npm test` | `vitest run` | 控制台 | 70+ 测试套件，1200+ 单元测试 |
| `npm run preview` | `vite preview` | 本地端口 | Web 本地预览与功能调试 |

---

## 二、 微信小游戏开发环境准备

### 1. 基础环境
- **Node.js**：`>= 18.0.0` (推荐 LTS 20.x 或 22.x)
- **npm**：`>= 9.0.0`
- **代码编辑器**：VS Code 或 Cursor

### 2. 下载与安装【微信开发者工具】
- 官方下载入口：[微信官方开发工具下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 根据系统选择 **Windows 64位** 或 **macOS** 稳定版（Stable）安装包；
- 安装完毕后，使用已实名绑定的 **微信 App** 扫码登录。

---

## 三、 微信小游戏一键打包全流程

### 1. 执行微信小游戏构建命令
在工程根目录下执行：
```bash
npm run build:wechat
```

该命令将严格执行三个阶段：
1. **TypeScript 严格类型检查 (`tsc --noEmit`)**：零类型报错，保证领域模型与适配器类型安全。
2. **Vite 生产打包 (`vite build`)**：将 TypeScript 核心逻辑与 Phaser 引擎编译打包入 `dist/`。
3. **微信打包器执行 (`node scripts/build-wechat.js`)**：
   - 提取 Vite 产物并同步到 `dist-wechat/assets/`；
   - 生成微信小游戏规范的 `game.json`（竖屏 750×1334、关闭系统状态栏、网络超时配置）；
   - 生成微信小游戏专用工程描述文件 `project.config.json`（`compileType: "game"`、AppID 与 ES6 配置）；
   - 生成运行时适配垫片 `adapter.js`（polyfill `window`、`document`、`canvas`、`Audio`、`Image`、`localStorage` 与多点触控分发）；
   - 生成微信小游戏入口引导文件 `game.js`。

### 2. 微信小游戏构建产物目录结构 (`dist-wechat/`)
```text
dist-wechat/
├── game.json                 # 微信小游戏全局配置 (竖屏方向、网络超时等)
├── game.js                   # 微信小游戏入口引导 (加载 adapter 垫片并启动游戏)
├── adapter.js                # 微信小游戏 DOM/Canvas/Audio/Touch 兼容垫片
├── project.config.json       # 微信开发者工具工程配置 (AppID、编译类型 minigame)
└── assets/
    ├── index-[hash].js       # 编译打包后的全量游戏核心逻辑与 Phaser 渲染层
    └── ...                   # 音频、字体与贴图资产
```

---

## 四、 导入微信开发者工具与项目运行

### 1. 导入项目步骤
1. 打开 **微信开发者工具**；
2. 在左侧栏或启动页选择 **【小程序】/【小游戏】** 项目；
3. 点击 **【导入】** 按钮；
4. 填写项目导入参数：
   - **项目目录**：选择打包输出的 `d:\Projects\DDG\dist-wechat` 目录（**切记：必须选择 `dist-wechat` 目录，不可选择整个 DDG 项目根目录！**）；
   - **AppID**：
     - 若已有在微信公众平台申请的小游戏 AppID，直接填入（例如您配置的 `wxd4d2600b1a9e5af2`）；
     - 若临时体验或无线上 AppID，可选择 **【测试号】**；
   - **项目名称**：填写 `孤城神机营`；
5. 点击 **【确定】** 载入工程。

### 2. 模拟器配置与调试建议
1. **机型选择**：
   - 在模拟器上方下拉菜单中，推荐选择 **iPhone 13** 或自定义 **750 × 1334** 竖屏分辨率；
   - 缩放比例设置为 **100%**。
2. **控制台校验**：
   - 打开底部 **Console (控制台)**，确认输出以下标志性日志：
     ```text
     [WechatAdapter] Runtime polyfills injected successfully.
     《孤城神机营》已成功启动！
     ```
3. **本地设置检查**：
   - 点击右上角 **【详情】** -> **【本地设置】**；
   - 确保勾选 **ES6 转 ES5**、**增强编译**；
   - 调试基础库建议选择稳定版本（`>= 3.4.0`）。

---

## 五、 真机预览与调试 (Mobile Preview & Remote Debug)

### 1. 生成二维码预览
1. 在微信开发者工具顶部工具栏点击 **【预览】** 按钮；
2. 工具自动编译并弹出带有二维码的弹窗；
3. 使用手机 **微信 App** 扫描二维码，即可在真机全屏游玩。

### 2. 移动端核心体验验收清单
- [ ] **触控操作防遮挡**：长按拖拽器械时，视觉锚点自动向上偏移 `+80px`，手指绝不遮挡沙盘落子格。
- [ ] **二合一合成与轻微震动**：同星同名器械合成质变（如 ★1 $\rightarrow$ ★2）时，手机触发短震动反馈 (`wx.vibrateShort`)。
- [ ] **音频与生命周期**：背景音效正常播放，微信切后台或锁屏时自动静音暂停，切回前台恢复。
- [ ] **流畅度与功耗**：敌兵怪潮推进时，全程 60 FPS 稳定运行，DrawCall 控制在 45 以内。

---

## 六、 微信激励视频广告 (IAA) 接入指南

根据 GDD V3.0 §12.1 规范，《孤城神机营》规划了 4 处高转化激励广告点位：

### 1. 微信公众平台广告位配置
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)；
2. 进入：**【流量主】** -> **【广告位管理】**；
3. 新建 **激励视频广告**，获取广告位代码 `adUnitId`：

| 广告位代码 | 场景名称 | 触发时机与玩家权益 (GDD §12.1) |
| :--- | :--- | :--- |
| `ad_revive` | **绝境逆转·破城复活** | 城墙耐久归零失败时弹出；观看后立即恢复 50% 城墙 HP，全屏清空小兵，附带 4.0 秒冰封霸体（单局限 1 次） |
| `ad_double_reward` | **胜局大捷·双倍俸禄** | 通关第 5 波、第 10 波首领时弹出；本波银两与图纸收益 $\times 200\%$ |
| `ad_tactics_hint` | **残局锦囊·战术提示** | 【墨门残局】连败 2 次触发；观看后高亮唯一解关键位置或给予局内撤回机会 |
| `ad_start_silver` | **战备补给·开局福利** | 开局军备商店提供 1 次观看视频免费获得 20 银两起始储备 |

### 2. 代码调用范式
平台层已通过 `PlatformBridge.getPlatform()` 自动桥接 WeChat 原生 `wx.createRewardedVideoAd`：
```typescript
import { PlatformBridge } from './platform';

async function handlePlayerRevive() {
  const platform = PlatformBridge.getPlatform();
  
  // 唤起微信原生激励视频广告
  const result = await platform.showRewardedVideoAd('ad_revive');
  
  if (result.isEnded) {
    // 玩家完整观看完视频，发放绝境复活奖励
    console.log('微信广告播放完毕，执行破城复活逻辑');
    wallManager.restoreWallHpPercent(0.50);
    battleField.freezeAllEnemies(4.0);
  } else {
    // 玩家中途关闭或跳过广告，不予发放奖励
    console.log('玩家中途跳过广告，无复活奖励');
  }
}
```

---

## 七、 微信小游戏社交分享与转发 (GDD §12.3)

`WechatPlatform` 原生支持微信主动分享与被动“右上角转发”：

```typescript
import { PlatformBridge } from './platform';

const platform = PlatformBridge.getPlatform();

// 1. 主动唤起分享
await platform.shareAppMessage({
  title: '明代黑科技神机营！谁能守住第10波？',
  imageUrl: 'assets/share_banner.png',
  query: 'inviterId=wx_user_12345&chapter=1'
});

// 2. 注册右上角“...”菜单转发监听
platform.onShareAppMessage(() => ({
  title: '城头告急！快来助我摆布墨家神机火炮！',
  imageUrl: 'assets/share_banner.png',
  query: 'channel=top_menu'
}));
```

---

## 八、 上线发布前检查清单 (Pre-Release Checklist)

1. **合法域名配置**：
   - 登录微信公众平台 -> **【开发管理】** -> **【开发设置】** -> **【服务器域名】**；
   - 将游戏涉及的 CDN 域名、埋点上报域名及后端 API 域名添加至 `request合法域名` 与 `downloadFile合法域名`。
2. **包体大小限制**：
   - 微信小游戏首包体积强制要求 $\le 4\text{ MB}$（当前构建产物压缩后为 $< 1\text{ MB}$，完全符合规范）；
   - 总包体限制 $\le 20\text{ MB}$。
3. **资质合规要求**：
   - 按照合规指引准备游戏自审自查报告、版号/软著证明文件；
   - 完善用户隐私保护指引并向用户明示。
4. **性能评分自测**：
   - 使用微信开发者工具内置的 **Audits (体验评分)** 进行自动化体检；
   - 确保无内存泄漏、DrawCall 达标、真机首屏渲染耗时 $< 2.5\text{s}$。
