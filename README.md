# 《孤城神机营》(The Lonely City Divine Engine Camp)

> **大明神机营火器黑科技 × 墨家重工机关 × 2D 城头沙盘空间策略 × 自走棋合成升星 × 肉鸽兵法构筑守城小游戏**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![Phaser](https://img.shields.io/badge/Phaser-3.87+-yellow.svg)](https://phaser.io/)
[![Vitest](https://img.shields.io/badge/Vitest-1042%20Tests%20100%25%20PASS-brightgreen.svg)](https://vitest.dev/)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20ByteDance%20MiniGame-red.svg)](https://developer.open-douyin.com/)

---

## 一、 项目概览 (Overview)

《孤城神机营》是一款以明代抗击外敌入侵为历史舞台，融合中国传统火器科技（神机营）与先秦墨家机关术的竖屏单手策略守城小游戏。

- **核心特色**：
  - **5×5 城头沙盘网格**：1×1 至 2×2 多格器械自由布局，支持 Touch Y-Offset (+80px) 防指遮挡拖拽与曼哈顿智能挤位（Smart Swap）。
  - **二合一合成升星**：同星级器械重叠触发升星质变（★1 $\to$ ★2 $\to$ ★3 $\to$ ★4），★3 解锁形态进化，★4 触发终极质变觉醒。
  - **四系相邻羁绊**：神火、墨家、守御、奇门四大阵营十六型军械，正交十字与九宫格几何去重相邻共鸣。
  - **四大元素连锁反应**：【猛火轰爆】、【雷火天劫】、【碎冰崩裂】、【幽冥毒火】，内嵌数学防崩控制阀门。
  - **严格 7 步伤害计算流水线**：面板 $\to$ 倍率 $\to$ 通用加算 ($\le 150\%$) $\to$ 独立乘算 ($\le 3$ 门各 $25\%$) $\to$ 暴击判定 ($\le 75\% / 2.0$) $\to$ 破甲折算 $\to$ 伤害保底 ($\ge 1.0$)。
  - **36 张肉鸽兵法构筑**：每波战胜三选一兵法竹简，流派智能标签加权，赤金双 ★3 器械融合觉醒。
  - **多模式玩法矩阵**：九州战役全 5 章 20 关数据驱动关卡、四大守关大首领战、神机演武无限波次防守、六大精锐词缀、大明正统八阶军阶天梯与全国/同省双标签战功榜。
  - **神机天工坊与装备打造**：战役关底与无尽首领专属图纸掉落，三槽位（身管/机匣/引信）部件打造与十六型军械自由装配。

---

## 二、 全项目权威文档地图与导读索引 (Documentation Hierarchy)

本项目遵循严格的工业级文档同步与管理规范，所有核心 Markdown 文档职责分明、层级严密：

| 文档名称 | 定位与性质 | 权威等级 | 核心内容与阅读指引 |
| :--- | :--- | :---: | :--- |
| [**`README.md`**](file:///d:/Projects/DDG/README.md) | **项目门户主页** | 入门导航 | 项目全景概览、技术栈、快速上手、构建指引与全局文档索引（本文件）。 |
| [**《孤城神机营_完整工业级执行设计书_GDD_V3.0.md》**](file:///d:/Projects/DDG/孤城神机营_完整工业级执行设计书_GDD_V3.0.md) | **最高业务权威设计书** | ★★★★★<br/>最高生产源头 | 策划与数值最高权威，共 25 章。涵盖 16 型器械属性、36 兵法卡池、四大元素反应公式、20 关战役配置、残局解谜考题、商业化模型、无尽演武规范与天工坊装备图鉴。 |
| [**`PROJECT.md`**](file:///d:/Projects/DDG/PROJECT.md) | **系统架构与接口契约** | ★★★★☆<br/>技术实现基准 | 模块解耦分层架构、11 大核心系统公有接口契约（Interface Contracts）、数据类型定义与质量验收标准。 |
| [**`AGENTS.md`**](file:///d:/Projects/DDG/AGENTS.md) | **Agent 协作规范与红线** | ★★★★☆<br/>行为铁律准则 | AI Agent 协作开发、重构与测试的最高准则。确立三层解耦架构隔离红线、数值硬上限不变量、质量保证门禁及三大变更追溯铁律。 |
| [**`DEV_LOG.md`**](file:///d:/Projects/DDG/DEV_LOG.md) | **单一全局开发履历库** | ★★★★☆<br/>唯一追溯历史 | 全项目唯一的全局开发与变更追溯文件。所有会话、需求演进、Bug 修复与代码修改记录集中统一追加记录。 |
| [**`ROADMAP.md`**](file:///d:/Projects/DDG/ROADMAP.md) | **长远演进战略规划蓝图** | ★★★★☆<br/>演进灯塔 | 归集前期未尽研发构想（残局模式、淬炼洗炼、异步切磋、微触觉震动），划定阶段一（商业封测）、阶段二（赛季运营）与阶段三（多端衍生）战略蓝图。 |
| [**`TEST_INFRA.md`**](file:///d:/Projects/DDG/TEST_INFRA.md) | **自动化测试基础设施** | ★★★☆☆<br/>QA 指南 | 四层测试金字塔（Tiers 1~4）架构、不透明箱测试契约、测试运行指令与全量 1042 项测试防崩验证矩阵。 |
| [**`DOUYIN_MINIGAME_GUIDE.md`**](file:///d:/Projects/DDG/DOUYIN_MINIGAME_GUIDE.md) | **字节小游戏接入指引** | ★★★☆☆<br/>部署手册 | 抖音小游戏（ByteDance Mini Game / `tt.*`）打包产物说明、开发者工具导入流程、真机预览与上线审核避坑指南。 |

---

## 三、 核心架构与分层隔离原则 (Architecture)

工程坚持严格的**无头领域驱动分层架构 (Decoupled Headless Domain)**：

```text
d:\Projects\DDG\src/
├── core/         # 【纯逻辑领域层】Strictly Headless, Zero DOM, Zero Phaser (100% 独立单测)
│   ├── grid/     # 网格沙盘、多格占位、智能挤位 (Smart Swap)、二合一升星状态机
│   ├── weapon/   # 军械实体、索敌目标选择、攻击计时器
│   ├── bond/     # 十字/九宫相邻判定、流派羁绊共鸣
│   ├── reaction/ # 四大元素反应状态机与防崩保护阀门
│   ├── combat/   # 严格 7 步伤害计算流水线、投射物飞行、伤害跳字
│   ├── wave/     # 波次状态机、敌军怪潮时序、5大章节战役引擎、环境天气
│   ├── shop/     # 商店动态发牌权重、连续3刷对子保底防脸黑 (Pity Timer)
│   ├── tactics/  # 36 张肉鸽兵法卡池、智能标签加权、赤金双★3融合觉醒
│   ├── endless/  # 无尽防守指数膨胀曲线、6大精锐词缀引擎、8阶军阶天梯、防作弊哈希
│   ├── forge/    # 首领专属掉落引擎、三槽位部件打造、装备穿卸与实战增益
│   ├── meta/     # 军械升级 (Lv.1~20)、武经总要科技树 (Lv.0~30)、档案存储与损坏自愈
│   └── types.ts  # 全局领域数据类型定义
├── presentation/ # 【表现与交互层】Phaser 3 Scenes, Renderers, Particles, UI
│   ├── scenes/   # BattleScene, UIScene, HomeScene, BootScene, SettlementModal
│   ├── ui/       # EndlessModal, ForgeModal, RevivalModal, UITheme
│   ├── renderers/# UnitSprite, EnemySprite, GridRenderer, FlyText, ElementalVfx
│   └── touch/    # TouchController, TouchCoordinateMapper (+80px 防遮挡偏移)
├── bridge/       # 【平台抽象桥接层】IPlatform (Web vs Douyin tt.*)
└── config/       # 【静态配置与数值表】Weapons, Tactics, Enemies, Shop, Campaign
```

### 🔴 严守三大架构红线
1. **`src/core/` 绝对零 DOM / 零 Phaser 依赖**：纯逻辑领域层严禁引入任何浏览器全局对象、Canvas 或 Phaser 类，确保 100% 纯 Node 环境毫秒级单元测试与数值平衡仿真。
2. **`src/presentation/` 仅负责表现与视图驱动**：场景与渲染器严禁私自进行核心数值计算、伤害结算或发牌随机推演。
3. **平台抽象通过 `IPlatform` 统一桥接**：屏幕尺寸适配、广告激励视频、视频录制分享、震动与本地存储一律走抽象接口，确保 Web 原型与字节小游戏平滑无缝切换。

---

## 四、 快速上手与常用指令 (Getting Started)

### 1. 环境依赖
- **Node.js**: `v20.x` 或 `v22.x` / `v24.x`
- **包管理器**: `npm` (推荐) 或 `pnpm`

### 2. 本地开发与预览
```bash
# 安装依赖
npm install

# 启动本地 Web 端 Vite 开发服务器（支持 HMR 热重载）
npm run dev
# 浏览器访问 http://localhost:5173
```

### 3. 全量自动化测试 (QA Gates)
```bash
# 执行 Vitest 全量单元测试（59 套件，1042 项测试 100% PASS）
npm test

# 交互式监听模式
npx vitest

# 针对特定系统测试
npx vitest run test/endless-mode.test.ts
npx vitest run test/forge-system.test.ts
```

### 4. 生产构建与双端打包
```bash
# 1. TypeScript 静态语法校验并构建 Web 生产环境产物（输出至 dist/）
npm run build
# 或 npm run build:web

# 2. 构建 Web 产物并打包为抖音小游戏工程（输出至 dist-douyin/）
npm run build:douyin

# 3. 本地预览已构建的生产产物
npm run preview
```

---

## 五、 领域数值硬上限与算法不变量速查 (Hard Caps)

在开发与扩展业务逻辑时，必须无条件遵循以下数学硬上限阀门：

| 机制维度 | 硬上限规约 | 保护阀门与业务逻辑 |
| :--- | :--- | :--- |
| **通用加算区** | $\le +150\%$ ($1.50$) | 所有加算词条累加后硬封顶，防止多重羁绊指数爆炸。 |
| **独立乘算区** | 最多 3 门，单门 $\le 25\%$ ($0.25$) | 仅限白名单特定词条，超出门数自动截断。 |
| **暴击率与暴伤** | 暴击率 $\le 75\%$，暴伤倍率 $\le 2.00$ | 杜绝全暴击与无限暴伤秒怪。 |
| **伤害保底** | $Dmg_{final} \ge 1.0$ | 最终扣减血量保底为 1 点，杜绝 0 伤或负伤回血。 |
| **控制衰减 (CC)** | $Duration \times 0.70^k \ge 0.2\text{s}$ | 连续受控指数衰减，首领天生 50% 免控，脱控后享 1.5s 霸体。 |
| **猛火轰爆反应** | 单目标内置 CD 强制 $1.5\text{s}$ | 防止高频多段火器引发轰爆级联死循环。 |
| **碎冰崩裂反应** | 对 Boss 最大生命值百分比伤害封顶 $3\%$ | 每次触发内置 CD $2.0\text{s}$。 |
| **商店对子保底** | 连续 3 刷未合成，第 3 槽 $65\%$ 出对子 | 杜绝非洲人极端脸黑卡手。 |
| **前排女墙专属性** | 城防工事类器械仅限落子于 Row 0 | 放入 Row 1~4 严格弹回拒止。 |
| **人机触控偏移** | 视觉锚点相对触控接触点向上偏移 $+80\text{px}$ | 防止手机端手指遮挡落子视线。 |

---

## 六、 抖音小游戏导入说明

执行 `npm run build:douyin` 之后，产物将生成在 `dist-douyin/` 目录下：
1. 打开**抖音开发者工具**（ByteDance Developer Tools）；
2. 选择“导入小游戏工程”；
3. 工程目录选择 `d:\Projects\DDG\dist-douyin`；
4. AppID 填入测试 AppID 或正式小游戏 AppID，即可在模拟器中体验完整游戏，并支持手机扫码真机预览。
5. 详细接入规范与上线避坑请参考 [《抖音小游戏打包与开发者工具接入指南》](file:///d:/Projects/DDG/DOUYIN_MINIGAME_GUIDE.md)。
