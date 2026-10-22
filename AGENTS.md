# 《孤城神机营》Agent 协作开发与代码规范 (AGENTS.md)

> 本文档是本项目所有 AI Agent（包括代码助手、审查者、重构者与测试者）的最高行为准则。在对项目进行任何代码阅读、修改、测试与构建时，必须严格遵守以下规范与红线。

---

## 1. 项目概览与核心基准

- **项目名称**：《孤城神机营》(The Lonely City Divine Engine Camp)
- **技术栈**：Vite 5.x + Phaser 3 (3.87+) + TypeScript 5.6+
- **目标平台**：Web 浏览器原型 + 抖音/字节跳动小游戏（ByteDance Mini Game / `tt.*`） + 微信小游戏（WeChat Mini Game / `wx.*`）
- **屏幕与坐标基准**：
  - 竖屏标准分辨率：`750 × 1334 px`（`Phaser.Scale.FIT`, `CENTER_BOTH`）。
  - 逻辑坐标换算：$1.0\text{ m} = 68\text{ px}$。
  - 5 大纵向分区：顶部状态栏 (0~160px)、5×5 城头沙盘 (160~540px)、女墙隔断 (540~560px)、坡道战场 (560~1240px)、底部备战席与操作栏 (1240~1334px)。
  - 人机触控偏移：拖拽时视觉锚点相对触控接触点向上偏移 `+80px`（Touch Y-Offset），防止手指遮挡沙盘视线。

---

## 2. 权威参考文档优先级

进行任何开发或平衡调整时，遵循以下优先级：
1. **[GDD V3.0 执行设计书](file:///d:/Projects/DDG/孤城神机营_完整工业级执行设计书_GDD_V3.0.md)**：玩法机制、全十六型军械配表、36 张肉鸽兵法、元素反应机制与数值源头（最高业务权威）。
2. **[PROJECT.md](file:///d:/Projects/DDG/PROJECT.md)**：系统解耦架构、模块接口契约（Interface Contracts）、数据类型定义与里程碑划分。
3. **[TEST_INFRA.md](file:///d:/Projects/DDG/TEST_INFRA.md)**：端到端与自动化测试基础设施指南。
4. **[DOUYIN_MINIGAME_GUIDE.md](file:///d:/Projects/DDG/DOUYIN_MINIGAME_GUIDE.md)**：字节小游戏打包适配与开发者工具导入规范。
5. **[WECHAT_MINIGAME_GUIDE.md](file:///d:/Projects/DDG/WECHAT_MINIGAME_GUIDE.md)**：微信小游戏打包适配与开发者工具导入规范。

---

## 3. 核心架构与隔离红线（绝对不可违背）

项目采用严格的**分层解耦架构**，各层级职责边界严禁混淆：

```text
d:\Projects\DDG\src/
├── core/         # 【纯逻辑领域层】Strictly Headless, Zero DOM, Zero Phaser
├── presentation/ # 【表现与交互层】Phaser 3 Scenes, Renderers, Particles, UI
├── bridge/       # 【平台抽象桥接层】IPlatform (Web vs Douyin tt.* vs WeChat wx.*)
└── config/       # 【静态配置与数值表】Weapons, Tactics, Enemies, Shop
```

### 🔴 铁律一：`src/core/` 零 DOM / 零 Phaser 依赖（Headless）
- `src/core/` 内包含所有战斗计算、网格算法、合成升星、羁绊判定、元素反应、波次状态机与肉鸽卡池。
- **严禁**在 `src/core/` 中导入任何 Phaser 相关的类（如 `Phaser.Scene`、`Phaser.GameObjects`、`Phaser.Math`）、浏览器全局对象（`window`、`document`、`HTMLElement`）或 Canvas 上下文。
- **检验标准**：`src/core/` 必须能够纯粹在 Node.js / Vitest 环境下以毫秒级完成纯逻辑无头仿真与 100% 单元测试。

### 🔴 铁律二：`src/presentation/` 仅负责表现与视图驱动
- Phaser 3 场景（`BattleScene`、`UIScene` 等）、渲染器（`GridRenderer`、`UnitSprite` 等）以及对象池（`FlyText` 伤害跳字、粒子系统）仅用于将 Core 层的状态可视化，并向 Core 层派发触控/点击意图。
- **严禁**在表现层或场景中直接编写核心数值计算、伤害扣减公式、羁绊推演或发牌伪随机逻辑。

### 🔴 铁律三：平台抽象通过 `IPlatform` 桥接
- 凡涉及屏幕尺寸探测、震动、音频播放、激励视频广告、分享及本地存储，必须通过 `src/bridge/platform.ts` 定义的 `IPlatform` 接口调用。
- 严禁在业务逻辑中直接硬编码 `tt.*`、`wx.*` 或浏览器特定 API，确保 Web 原型、抖音小游戏与微信小游戏多端平滑切换。

---

## 4. 领域数值硬上限与算法不变量

Agent 在修改或扩展业务逻辑时，必须严格遵守 GDD 规定的数值硬上限与数学防崩保护阀门：

### 1) 严格 7 步伤害计算流水线 (`src/core/combat/damage-pipeline.ts`)
伤害计算必须严格按照以下 7 步流水线执行，严禁颠倒计算顺序：
1. **基础攻击力 (Base ATK)**
2. **技能倍率 (Skill Multiplier)**
3. **通用加算区 (Additive Bonuses)**：所有加算词条累加后，**硬上限封顶 $\le +150\%$**。
4. **独立乘算区 (Multiplicative Bonuses)**：仅限白名单特定词条，**最多 3 门，单门上限 $\le 25\%$**。
5. **暴击判定 (Crit Evaluation)**：**暴击率硬上限 $\le 75\%$，暴击伤害倍率硬上限 $\le 2.0$**。
6. **护甲与破甲计算 (Armor Mitigation)**：非线性折算，考虑固定破甲与百分比破甲。
7. **伤害保底 (Damage Floor)**：最终扣减血量**保底必须 $\ge 1.0$**。

### 2) 元素反应控制阀门 (`src/core/reaction/reaction-valve.ts`)
- **猛火轰爆**：单目标内置 CD 强制为 `1.5s`，防止高攻速多段伤害引发指数级轰爆级联。
- **雷火天劫**：Boss 眩晕衰减与计数保护，防崩截断。
- **碎冰崩裂**：对 Boss 最大生命值百分比伤害**封顶为 $3\%$**。
- **幽冥毒火**：持续时间锁死为 `4.0s`。

### 3) 控制抗性与衰减曲线 (`src/core/enemy/cc-decay.ts`)
- 敌军脱控后享有 `1.5s` 霸体窗口。
- 首领（Boss）天生享有 `50%` 免控率。
- 连续受控时间衰减公式：$Duration \times 0.70^k \ge 0.2\text{s}$。

### 4) 网格几何与沙盘交互 (`src/core/grid/`)
- **前排女墙专属性**：城防工事类器械（如滚木礌石、铁蒺藜）仅限落子于 `Row 0`，放入 `Row 1~4` 严格弹回拒止。
- **多格器械锚点**：支持 1×1、1×2、2×1、2×2 器械，以左上角（Top-Left）作为主锚点（Anchor）进行碰撞与落子合法性校验。
- **智能挤位 (Smart Swap)**：目标格已被占据时，自动按曼哈顿距离就近寻找合法空位滑移；若全场空间不足，安全弹回原位。
- **二合一升星**：同名且同星级器械发生拖拽重叠（面积 $\ge 50\%$）触发合成质变（★1 $\rightarrow$ ★2 $\rightarrow$ ★3 $\rightarrow$ ★4）。

### 5) 军备商店与肉鸽兵法 (`src/core/shop/` & `src/core/tactics/`)
- **对子保底防脸黑 (Pity Timer)**：当玩家连续刷新商店未进行任何合成的次数 $\ge 3$ 时，商店槽位 3 强制以 65% 概率刷出场上已有的 ★1 器械对子。
- **兵法智能标签加权**：每波战胜三选一，场上主力阵营流派加权 `1.85x`，完全缺失流派降权 `0.15x`。
- **赤金双系融合觉醒**：必须达成指定双 ★3 器械同场在阵，方可解锁进入卡池。

---

## 5. 质量保证与测试红线 (QA & CI Gates)

在交付任何代码改动前，Agent 必须通过以下验证流程：

1. **全量单元测试通过**：
   ```bash
   npm test
   ```
   - 必须保持 100% 通过（当前工程覆盖 580+ 用例）。
   - 任何新增的核心算法或逻辑必须同步在 `test/` 目录下补充对应的单元测试。
2. **TypeScript 类型安全与编译零报错**：
   ```bash
   npm run build
   ```
   - 执行 `tsc --noEmit && vite build`，严禁出现任何 TypeScript 类型报错或打包警告未处理。
3. **抖音小游戏打包流程验证**：
   ```bash
   npm run build:douyin
   ```
   - 确保产物能正确输出至 `dist-douyin/`，且生成合规的 `game.json` 与 `project.config.json`。
4. **微信小游戏打包流程验证**：
   ```bash
   npm run build:wechat
   ```
   - 确保产物能正确输出至 `dist-wechat/`，且生成合规的 `game.json`、`project.config.json`（`compileType: "game"`）与 `adapter.js`。

---

## 6. 开发环境常用指令

| 命令 | 用途 |
| :--- | :--- |
| `npm run dev` | 启动本地 Web 端 Vite 开发服务器（支持热重载 HMR） |
| `npm test` | 运行 Vitest 自动化单元测试集 |
| `npm run build` / `npm run build:web` | TypeScript 语法校验并构建 Web 生产环境产物（输出至 `dist/`） |
| `npm run build:douyin` | 构建 Web 产物并打包为抖音小游戏工程（输出至 `dist-douyin/`） |
| `npm run build:wechat` | 构建 Web 产物并打包为微信小游戏工程（输出至 `dist-wechat/`） |
| `npm run preview` | 本地预览构建完成的 Web 产物 |

---

## 7. 变更管理与文档追溯铁律 (Change Management & Traceability)

所有在此项目中工作的 AI Agent 必须无条件执行以下三条过程管控准则：

### 1) 重大修改前置通报 (Major Change Notification)
- 凡涉及**核心玩法机制调整、数值底层公式重构、破坏性架构改动、新增系统/兵种/兵法、或删除既有功能**等重大变更，Agent **必须首先向用户主动陈述改动原因、方案考量与潜在影响**，征询用户意见或达成共识后再行实施，严禁暗自进行破坏性大改。

### 2) 工业级设计文档闭环同步 (Design Document Synchronization)
- 严禁“代码已变而文档停滞”。
- 每次在代码中修改或补充任何业务逻辑、器械参数、兵法词条、波次规则或系统机制时，**必须同步修改更新对应的高阶工业级设计文档**（首要维护：[《孤城神机营_完整工业级执行设计书_GDD_V3.0.md》](file:///d:/Projects/DDG/孤城神机营_完整工业级执行设计书_GDD_V3.0.md)，次要维护：[`PROJECT.md`](file:///d:/Projects/DDG/PROJECT.md)）。
- 确保文档始终与实际代码保持像素级对应，作为唯一的生产级真相源。

### 3) 单一全局日志集中记录 (Centralized Cumulative Log: `DEV_LOG.md`)
- 本项目设立唯一的全局开发与变更追溯文件：[`DEV_LOG.md`](file:///d:/Projects/DDG/DEV_LOG.md)。
- **所有对话、任务迭代、需求演进、Bug 修复与代码修改记录，必须统一追加 (Append) 到此单个日志文件中**，绝对禁止另起碎片化日志文件。
- 每次任务交付或对话结束前，必须在 [`DEV_LOG.md`](file:///d:/Projects/DDG/DEV_LOG.md) 中追加本次会话的结构化记录：
  - 会话时间与核心诉求
  - 重大决策与用户确认事项
  - 实施的具体修改清单（对应代码文件与 GDD 文档章节）
  - 质量验证结果（测试用例数、构建状态）

