# Project: 《孤城神机营》 (The Lonely City Divine Engine Camp)

## Architecture Overview
- **Core Technology Stack**: Vite 5.x + Phaser 3 (3.80+) + TypeScript 5.x
- **Decoupled Architecture**: 
  - **Headless Domain Model (`src/core/`)**: Pure TypeScript, Zero DOM / Zero Phaser dependencies, 100% unit-testable in Node/Vitest, supporting headless simulations.
  - **Presentation & Interaction Layer (`src/presentation/`)**: Phaser 3 Scenes, Canvas/WebGL Renderers, Particle & Floating Text Pools, Audio Manager, and Touch Controller.
  - **Platform Adapter Bridge (`src/bridge/`)**: Unified interface (`IPlatform`) bridging Web Browsers, ByteDance Mini Game runtime (`tt.*`), and WeChat Mini Game runtime (`wx.*`).
- **Screen & Coordinate Standard**:
  - Vertical Portrait 750×1334 px (`Phaser.Scale.FIT`, `CENTER_BOTH`).
  - Coordinate scaling: $1.0\text{ m} = 68\text{ px}$.
  - 5 Vertical Zones: Top Header (0~160px), 5×5 Battlements Sandbox (160~540px), Wall Partition (540~560px), Battlefield Slope (560~1140px), Bottom Bench & Command Bar (1145~1334px: Staging Bench 1145~1235px, Command Bar 1240~1334px).
  - Touch Y-Offset: Dragging visual nodes shift $+80\text{px}$ upwards relative to touch contact point to prevent finger obstruction.

---

## Code Layout
```text
d:\Projects\DDG\
├── package.json                   # Project scripts and dependencies
├── tsconfig.json                  # Strict TypeScript configuration
├── vite.config.ts                 # Vite bundler configuration
├── index.html                     # Web entry container
├── scripts/
│   ├── build-douyin.js            # ByteDance Mini Game packaging script
│   ├── build-wechat.js            # WeChat Mini Game packaging script
│   └── test-balance.ts            # Monte Carlo balance simulator
├── src/
│   ├── index.ts                   # Application bootstrap
│   ├── config/                    # Global balance data & tables
│   │   ├── weapons.config.ts      # 16 weapon archetypes ★1~★4 full stats
│   │   ├── tactics.config.ts      # 36 roguelike tactics definitions
│   │   ├── enemies.config.ts      # 12 enemy types + 5 chapter bosses
│   │   ├── shop.config.ts         # Wave ladder weights and pity thresholds
│   │   └── campaign-waves.config.ts # 20 stages wave spawn configurations
│   ├── core/                      # Headless Pure Logic (Zero Phaser/DOM)
│   │   ├── types.ts               # Shared interfaces, enums, type definitions
│   │   ├── grid/
│   │   │   ├── grid-model.ts      # 5×5 Matrix and 5-slot bench data structures
│   │   │   ├── smart-swap.ts      # Manhattan nearest-slide algorithm & bounce back
│   │   │   └── star-upgrade.ts    # 2-in-1 merge state machine (★1~★4)
│   │   ├── weapon/
│   │   │   ├── weapon-instance.ts # Weapon entity state & runtime attributes
│   │   │   └── weapon-manager.ts  # Weapon registry and lifecycle
│   │   ├── bond/
│   │   │   ├── adjacency.ts       # Cross and 3×3 Moore geometric deduplication
│   │   │   └── synergy.ts         # Faction synergies (2-piece, 4-piece)
│   │   ├── reaction/
│   │   │   ├── element-state.ts   # Oil, Fire, Shock, Frozen, Poison state masks
│   │   │   └── reaction-valve.ts  # 4 Elemental reactions and anti-crash protection
│   │   ├── combat/
│   │   │   ├── damage-pipeline.ts # Strict 7-step damage calculation pipeline
│   │   │   ├── combat-stats-tracker.ts # Post-battle weapon DPS, kill & frontline intercept tracker
│   │   │   ├── targeting.ts       # Spatial targeting rules (First, Strongest, AOE)
│   │   │   └── projectile.ts      # Headless ballistic calculations
│   │   ├── defense/
│   │   │   └── frontline-manager.ts # Row 0 Fortress HP matrix, lane interception & 2~5 unit resonance
│   │   ├── behavior/
│   │   │   ├── behavior-tree.ts   # Core BT nodes (Selector, Sequence, Parallel, Inverter, Cooldown, Action)
│   │   │   ├── weapon-behavior.ts # Friendly weapon 5-phase attack lifecycle & archetype dispatcher
│   │   │   └── enemy-behavior.ts  # Enemy 6-tiered tactical AI (Dead, CC, Enrage, Suicide, Ranged, Melee)
│   │   ├── commander/
│   │   │   └── commander.ts       # Wang Shouren passive & 100 Rage ultimate
│   │   ├── enemy/
│   │   │   ├── enemy-entity.ts    # Enemy state, speed, armor, shields
│   │   │   └── cc-decay.ts        # Control diminishing returns (0.70^k) & tenacity
│   │   ├── wave/
│   │   │   ├── wave-fsm.ts        # Finite state machine (Prep, WaveActive, WaveClear)
│   │   │   ├── wave-spawner.ts    # Wave enemy queue timeline spawner
│   │   │   ├── campaign-wave-engine.ts # 20 stages data-driven wave orchestrator
│   │   │   ├── environment-engine.ts  # 5 chapters environmental weather modifiers
│   │   │   └── tactical-radar.ts  # 4-axis threat radar, enemy roster, S/A/B/C defensive readiness & counselor directives
│   │   ├── forge/
│   │   │   ├── types.ts           # Boss drop and forged components type system
│   │   │   ├── forge-config.ts    # 16-weapon exclusive forge components & recipe configs
│   │   │   ├── boss-drop-engine.ts # Boss kill drop roll engine & pity guarantees
│   │   │   ├── forge-manager.ts   # Forged component inventory, crafting & affix stat integration
│   │   │   └── forge-refine.ts    # Heavenly craft affix re-rolling, locking & pity system
│   │   ├── economy/
│   │   │   └── economy.ts         # Silver ledger, stipend, and interest calculation
│   │   ├── shop/
│   │   │   ├── shop-manager.ts    # 3-slot armory shop, refresh economy
│   │   │   └── pity-timer.ts      # RollsWithoutMerge counter & pair compensation
│   │   ├── tactics/
│   │   │   ├── tactics-deck.ts    # 36 cards pool, uniqueness rules, pity tiers
│   │   │   ├── smart-weight.ts    # Tag-based dynamic weighting (1.85x / 0.15x)
│   │   │   ├── fusion-unlock.ts   # Red-Gold dual-faction fusion unlock checkers
│   │   │   └── affix-mount.ts     # Dynamic pipeline modifier & hook injectors
│   │   └── ftue/
│   │       └── ftue-manager.ts    # 60s 4-step tutorial state machine
│   ├── bridge/                    # Platform Abstraction Layer
│   │   ├── platform.ts            # IPlatform interface
│   │   ├── web-platform.ts        # Desktop / Mobile Browser implementation
│   │   └── douyin-platform.ts     # ByteDance Mini Game adapter implementation
│   └── presentation/              # Phaser 3 View & Presentation Layer
│       ├── game.ts                # Phaser.Game lifecycle wrapper
│       ├── ui/                    # National Tide Industrial UI System
│       │   ├── ui-theme.ts        # Color codes, fonts, NineSlice presets, texture keys
│       │   ├── bronze-button.ts   # 3D cast bronze relief button with breathing glow & 2px press displacement
│       │   ├── vermilion-stamp.ts # Xuande vermilion seal dropping, micro-shake & ink splatter
│       │   ├── revival-modal.ts   # Guochao Cinnabar Revival Modal
│       │   ├── pause-menu-modal.ts # In-game pause & tactical command menu modal
│       │   ├── forge-modal.ts     # 3-tab forging, assembly & affix re-rolling modal with anvil sparks
│       │   └── tactical-radar-modal.ts # Xuan paper & bronze modal with 4-axis threat radar, roster & directives
│       ├── audio/                 # Procedural Web Audio Engine
│       │   └── sound-manager.ts   # Pure Web Audio procedural audio bus, 6 instruments, 18+ SFX
│       ├── textures/
│       │   ├── ui-texture-factory.ts # Procedural Canvas 2D NineSlice panels, icons & Xuande seals
│       │   └── enemy-texture-factory.ts # Procedural Canvas 2D 13 enemy & boss textures
│       ├── scenes/
│       │   ├── boot-scene.ts      # Asset loader & UITextureFactory generator
│       │   ├── home-scene.ts      # Main city hall, commander card, portals, armory/tech modals
│       │   ├── stage-select-scene.ts # 5 Chapters 20 Stages campaign selection & prep modal
│       │   ├── battle-scene.ts    # Main battlefield scene & game loop (RenderMode switcher)
│       │   ├── ui-scene.ts        # HUD, shop modal, decree selection modal, 2D/3D button
│       │   ├── settlement-modal.ts # 3-Star settlement, vermilion seal stamps, loot preview
│       │   └── ftue-overlay.ts    # Tutorial finger hints and highlight masks
│       ├── renderers/
│       │   ├── grid-renderer.ts   # 5×5 and bench visual tile rendering
│       │   ├── unit-sprite.ts     # Weapon sprite animations, pedestal styling & 2D/3D toggle
│       │   ├── enemy-sprite.ts    # Enemy sprite, walk bobbing, dust kickup
│       │   ├── ultimate-aim-indicator.ts # Tactical drag-aiming, firing cone, Bagua reticle & lock-on markers
│       │   ├── enemy-death-vfx.ts # Ink death dissolve and ink splatter
│       │   ├── projectile-view.ts # Ballistic rendering and particle effects
│       │   └── fly-text.ts        # Bitmap font damage numbers object pool
│       ├── three/                 # Optional 3D WebGL Overlay (Procedural Models & Lighting)
│       │   ├── three-scene-manager.ts # RenderMode ('2d'|'3d'), canvas sync & lifecycle
│       │   └── models/            # Procedural PBR models for 16 weapons and 4 enemy archetypes
│       └── touch/
│           └── touch-controller.ts# Touch Y-Offset +80px drag handler
└── test/                          # Comprehensive Automated Test Suites
    ├── grid.test.ts               # R1 Grid, Smart Swap, Merge, Row 0 validation
    ├── bond.test.ts               # R2 Adjacency deduplication & faction bonds
    ├── reaction.test.ts           # R2 Elemental reactions & anti-crash valves
    ├── pipeline.test.ts           # R3 7-Step damage pipeline, caps & clamps
    ├── combat.test.ts             # R3 Commander ultimate & combat mechanics
    ├── wave.test.ts               # R4 Wave combat FSM & economy interest
    ├── enemy.test.ts              # R4 Enemy behavior & CC diminishing returns
    ├── ftue.test.ts               # R4 60s FTUE choreography verification
    ├── shop.test.ts               # R5 Shop ladder weights & pity timer
    ├── tactics.test.ts            # R5 36 Tactics catalog, smart tags, fusion
    ├── render-mode.test.ts        # R6 2D/3D RenderMode toggling, canvas sync & storage resilience
    ├── audio-system.test.ts       # Track A Web Audio synthesis and instruments
    ├── enemy-visual-juice.test.ts # Track B Enemy procedural textures and animations
    ├── campaign-stages-bosses.test.ts # Track C 20 stages, environment & bosses
    └── system-integration.test.ts # Track D Full system integration test suite
```

---

## Feature Inventory
Every feature from the Survey phase is mapped to its assigned milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F-R1-01 视口与网格布局 | 750×1334 竖屏基准、5×5 城头沙盘与 5 槽备战席像素映射与坐标换算 | M1 | Survey 1 (R1.1) |
| 2 | F-R1-02 多格器械占位 | 支持 1×1, 1×2, 2×1, 2×2 多格占位判定与左上主锚点规范 | M1 | Survey 1 (R1.2) |
| 3 | F-R1-03 触控防遮挡偏移 | 拖拽时显示节点相对触控点向上偏移 80px，HitTest 投影校准 | M1 | Survey 1 (R1.3) |
| 4 | F-R1-04 二合一升星状态机 | 同名同星级碰撞（重叠面积 ≥ 50%）合成为高星（★1~★4） | M1 | Survey 1 (R1.4) |
| 5 | F-R1-05 智能挤位 (Smart Swap) | 曼哈顿就近滑移挤位，空余空间不足时安全弹回 | M1 | Survey 1 (R1.5) |
| 6 | F-R1-06 前排女墙专属性 | 城防工事类仅限放置于 Row 0，拖入 Row 1~4 严格弹回拒止 | M1 | Survey 1 (R1.6) |
| 7 | F-R2-01 四系十六型军械配置 | 四大阵营各 4 型军械 ★1~★4 全维度参数（火器/墨家/城防/奇门） | M2 | Survey 1 (R2.1) |
| 8 | F-R2-02 正交十字相邻结算 | 几何相邻判定与幂等性去重，多接触面仅单次生效 | M2 | Survey 1 (R2.2) |
| 9 | F-R2-03 九宫格相邻结算 | 切比雪夫相邻判定与环绕光环几何去重 | M2 | Survey 1 (R2.3) |
| 10 | F-R2-04 阵营羁绊共鸣 | 2 件套与 4 件套激活全局被动（神机/墨家/城防/奇门） | M2 | Survey 1 (R2.4) |
| 11 | F-R2-05 四大元素连锁反应 | 猛火轰爆、雷火天劫、碎冰崩裂、幽冥毒火触发与状态演算 | M2 | Survey 1 (R2.5) |
| 12 | F-R2-06 元素反应防崩控制阀门 | 轰爆 1.5s CD、雷火 Boss 衰减限 3 次、碎冰 Boss 封顶 3%、冥火锁死 4s | M2 | Survey 1 (R2.6) |
| 13 | F-R3-01 七步伤害结算流水线 | 面板→倍率→加算→乘算→暴击→护甲破甲→伤害保底 | M3 | Survey 2 (R3.1) |
| 14 | F-R3-02 通用与独立乘区硬封顶 | 通用加算区硬上限 +150%；独立乘区限白名单最多 3 门，单门 ≤ 25% | M3 | Survey 2 (R3.2) |
| 15 | F-R3-03 暴击与护甲易伤折算 | 暴击率 ≤ 75%、暴伤 ≤ 2.0；护甲减伤非线性折算公式 | M3 | Survey 2 (R3.3) |
| 16 | F-R3-04 主帅怒气与军策绝技 | 王守仁被动火器攻击 +20% / 轰爆减 CD；100 怒气主动大招重置 CD + 攻速 +150% | M3 | Survey 2 (R3.4) |
| 17 | F-R3-05 四大主帅全维度配置 | 王守仁、禽滑厘、秦良玉、刘伯温四位主帅配表与绝技机制 | M3 | Survey 2 (R3.5) |
| 18 | F-R4-01 波次战斗状态机 (FSM) | 备战、出怪、索敌、受击飘字、波次清场、兵法发放、俸禄结算 | M4 | Survey 2 (R4.1) |
| 19 | F-R4-02 自动索敌与空间哈希 | 最前排、血量最高、密集中心三种索敌规则与轻量空间哈希 | M4 | Survey 2 (R4.2) |
| 20 | F-R4-03 受击飘字与视觉表现 | 命中闪白、位图字体伤害跳字、DrawCall ≤ 45 合批 | M4 | Survey 2 (R4.3) |
| 21 | F-R4-04 俸禄与储蓄利息结算 | W1~W10+ 保底俸禄 35~100 递增；利息 $\min(\lfloor Silver/10 \rfloor, 5)$ | M4 | Survey 2 (R4.4) |
| 22 | F-R4-05 敌军四大原型与怪潮 | 普通、冲锋、重装、首领四类敌军推进与盾击/自爆/炸膛机制 | M4 | Survey 2 (R4.5) |
| 23 | F-R4-06 控制抗性与递减曲线 | 脱控 1.5s 霸体；Boss 天生免控 50%，受控衰减 $Duration \times 0.70^k \ge 0.2s$ | M4 | Survey 2 (R4.6) |
| 24 | F-R4-07 60 秒黄金新手引导 (FTUE) | 4 步强制+弱手势脚本闭环（合成火铳→自动割草→必出三段击→排阵连线） | M4 | Survey 2 (R4.7) |
| 25 | F5.1 军备商店波次阶梯发牌 | 3 槽位 ★1 器械动态波次概率（W1~2, W3~5, W6~8, W9~15 凡/良/重器阶梯） | M5 | Survey 3 (R5.1) |
| 26 | F5.2 防卡手对子补偿 (Pity Timer) | 连刷未合成计数器 $\ge 3$ 时槽位 3 强制 65% 概率出现场上已有的 ★1 器械 | M5 | Survey 3 (R5.2) |
| 27 | F5.3 军备商店经济与刷新控制 | 基础刷新消耗 2 银两，支持军策与兵法免费减费叠加 | M5 | Survey 3 (R5.3) |
| 28 | F5.4 36 张肉鸽兵法全编目 | 规范五大类 36 张兵法卡池元数据（通用8、火器8、墨家8、城防8、赤金融合4） | M5 | Survey 3 (R5.4) |
| 29 | F5.5 兵法竹简智能标签流派加权 | 每波战胜后弹出三选一，最大面积流派 1.85x，场上缺失流派 0.15x | M5 | Survey 3 (R5.5) |
| 30 | F5.6 赤金双系融合觉醒解锁 | 双 ★3 指定器械同场达成解锁准入，并赋予 +40% 定向出现加权 | M5 | Survey 3 (R5.6) |
| 31 | F5.7 兵法保底与单局唯一性 | 33 张单局限选 1 次，3 张限选 2 次；W1 必出紫、W5 必出金、W10 必出金/赤金 | M5 | Survey 3 (R5.7) |
| 32 | F5.8 兵法词条动态挂载与截断 | 4 类词条（即时型、静态面板修饰、事件钩子、实体变异）动态生效与防崩限幅 | M5 | Survey 3 (R5.8) |
| 33 | F6.1 Vite + Phaser 3 + TS 脚手架 | 竖屏 Web 端到端可执行游戏工程，支持 HMR 与轻量构建 | M1/M6 | Survey 3 (R6.1) |
| 34 | F6.2 Model/Logic Headless 解耦 | 纯逻辑层与渲染表现层解耦，100% 支持无 DOM 单元测试与平衡仿真 | M1/M6 | Survey 3 (R6.2) |
| 35 | F6.3 750×1334 竖屏自适应 | 基准竖屏映射、黑边自适应填充、坐标缩放、5 大功能分区绝对锚定 | M6 | Survey 3 (R6.3) |
| 36 | F6.4 触控防遮挡与人机工效 | 触控拖拽 80px 偏移、首指锁定 (Pointer ID 0)、多指安全抑制 | M1/M6 | Survey 3 (R6.4) |
| 37 | F6.5 字节小游戏适配桥接 | 封装 `tt` API，提供 Canvas/Audio/Touch 垫片，支持双模式自动感知 | M6 | Survey 3 (R6.5) |
| 38 | F6.6 双目标打包流水线与指引 | `npm run build:web` 与 `npm run build:douyin` 打包配置及完整接入文档 | M6 | Survey 3 (R6.6) |
| 39 | F-AUD-01 纯 Web Audio 程序化声音合成引擎 | 零外部音频文件，AudioContextManager 统一接管 Web/Douyin/无头降级 | M_AUD | Track A |
| 40 | F-AUD-02 三级音频母线与等功率交叉淡化 | Master/BGM/SFX 独立增益分轨，1.2s Equal-Power Cross-Fade | M_AUD | Track A |
| 41 | F-AUD-03 六大国潮乐器声学物理模型 | 编钟(双载波非谐波)、古琴/琵琶(拨弦滤波)、堂鼓(膜受击双曲扫频)、铜锣(FM)、唢呐(双共振峰颤音)、低音Drone | M_AUD | Track A |
| 42 | F-AUD-04 九州战役三大国潮 BGM 音序器 | 大厅 65 BPM (编钟古琴堂鼓)、战局 110 BPM (战鼓琵琶交织)、首领 128 BPM (双底鼓锁呐压迫) | M_AUD | Track A |
| 43 | F-AUD-05 拟真战场全品类打击与反应 SFX | 火器开火(火铳/重炮/一窝蜂/连弩)、受击金铁钝响、暴击破阵铜锣、四大元素反应专属音效(轰爆/雷火/碎冰/毒火) | M_AUD | Track A |
| 44 | F-AUD-06 UI 拟物质感与全端一键静音 | 青铜浮雕按钮卡扣声、朱砂重印下坠震响、铜钱玄铁撞击音、UIScene/HomeScene 国风静音控制 | M_AUD | Track A |
| 45 | F-ART-01 EnemyTextureFactory 全兵种造型 | Canvas 2D 程序化绘制 13 种明代国潮重工造型 (流寇、战犬、游骑、刀盾、铁浮屠、投矛、火药死士、冲车 + 5大首领) | M_ART | Track B |
| 46 | F-ART-02 五大章节守关首领专属威武造型 | Ch1 铁塔熊王、Ch2 玄武巨舰、Ch3 金帐可汗、Ch4 万蛊尸魔、Ch5 饕餮巨炮 独立精绘 | M_ART | Track B |
| 47 | F-ART-03 步频正弦起伏 (Walk Bobbing) | baseSprite.y 独立正弦踏步振动（轻步兵/骑兵/重器/首领差异化），绝对不干扰容器逻辑坐标与判定 | M_ART | Track B |
| 48 | F-ART-04 行军地面微粒扬尘 (Dust Kickup) | 移动过程中在足底后方周期性喷发微粒黄土扬尘 | M_ART | Track B |
| 49 | F-ART-05 阵亡水墨消散特效 (Ink Splash Dissolve) | 墨晕扩散、放射飞墨微粒、剪影暗化升腾融解、Boss 专属微震与烫金书法“破”字印鉴 | M_ART | Track B |
| 50 | F-WAV-01 九州战役全 5 章 20 关数据驱动时序 | Ch1~Ch5 stages 1~20 完整时序数据驱动化配置 (campaign-waves.config.ts) | M_WAV | Track C |
| 51 | F-WAV-02 纯无头环境气象系统 (EnvironmentEngine) | 水战水雾(远程微衰减/奇门导电+30%)、塞外暴雪(碎冰双倍)、巴蜀毒瘴(毒火+50%)、京师龙脉(怒气+50%) | M_WAV | Track C |
| 52 | F-WAV-03 五大首领专属技能轴与状态机 | 熊王(撼地/狂暴/召唤)、玄武(铁壁护盾/舷侧排炮/烈油)、可汗(狼嚎光环/冰箭/铁浮屠)、尸魔(腐蚀/吞噬/假死复苏)、饕餮(吞天/轰城蓄力弱点打断) | M_WAV | Track C |
| 53 | F-INT-01 表现层全场景无缝接入与一键静音 | BattleScene/UIScene/HomeScene/StageSelectScene/SettlementModal 全场景音效与美术装配 | M_INT | Track D |
| 54 | F-INT-02 2D/3D 平滑切换与无内存泄漏保障 | 保持 2D/3D 模式双向切换不崩溃，对象池及纹理安全注销 | M_INT | Track D |
| 55 | F-INT-03 规范文档闭环与全局开发日志同步 | 同步更新 GDD V3.0、PROJECT.md，严格追加全局日志 DEV_LOG.md | M_INT | Track D |
| 56 | F-INT-04 900+ 单元测试与双端打包门禁 | 扩充测试用例至 900+ (100% PASS)，npm run build 0 错误，npm run build:douyin 成功 | M_INT | Track D |

---

## Milestones
Target 6 sequential milestones for implementation, accompanied by the parallel E2E testing track.

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| **M1** | 工程脚手架与沙盘网格触控交互 | F6.1, F6.2, F-R1-01~06, F6.4 (Vite/TS/Phaser3 基础工程, 5×5 沙盘, 备战席, 多格占位, Touch Y-80px, 2合1升星, Smart Swap 挤位, Row 0 女墙校验) | None | DONE |
| **M2** | 四系军械、相邻羁绊与四大元素反应 | F-R2-01~06 (四大系十六型军械 ★1~★4, 正交十字/九宫格去重相邻, 阵营共鸣, 猛火轰爆/雷火天劫/碎冰崩裂/幽冥毒火与防崩控制阀门) | M1 | DONE |
| **M3** | 七步伤害结算流水线与主帅系统 | F-R3-01~05 (严格 7 步伤害流水线, 通用加算 ≤150%, 独立乘区 ≤3门各25%, 暴击 ≤75%/2.0, 护甲折算, 伤害保底 ≥1.0, 王守仁等主帅怒气大招) | M2 | DONE |
| **M4** | 波次战斗循环、敌军怪潮与 60s FTUE | F-R4-01~07 (波次状态机, 4类敌军原型与推进, 控制抗性衰减, 俸禄与利息, 60s FTUE, 飘字合批) | M3 | DONE |
| **M5** | 军备商店伪随机与 36 张肉鸽兵法 | F5.1~5.8 (商店动态波次发牌, Pity 对子防黑, 36 张兵法全编目, 智能标签加权 1.85x/0.15x, 赤金双★3融合觉醒, 词条动态挂载与防崩截断) | M4 | DONE |
| **M6** | Phaser 3 渲染联调、抖音适配与全体验收 | F6.3, F6.5, F6.6, 全量 100% 单元测试与 E2E 验证 (Phaser 3 视觉表现与音效粒子, 抖音小游戏构建打包适配, 接入文档, npm run build/dev 零报错) | M5 | DONE |
| **M_VJ1** | UI 国潮重工与宣德朱砂印章视觉体系重塑 | F-VJ-01 ~ F-VJ-05 (宣纸/竹简 NineSlice、三大拟物图标、BronzeButton、VermilionStamp 印鉴盖印与飞溅) | M6 | DONE |
| **M_VJ2** | 战场环境与氛围沉浸感重塑 | F-VJ-06 ~ F-VJ-09 (青砖石砌女墙、大明日月赤旗正弦波 Rope、三足烽火盆与粒子、预烘焙地表与 16 槽弹坑池) | M_VJ1 | DONE |
| **M_VJ3** | 军械/敌军材质细节、开火热量发光、打击感与四大元素反应 | F-VJ-10 ~ F-VJ-17 (EnemySprite 0.06s 白闪/动态残影血条/首领血煞力场、UnitSprite 炮口发热/★3★4星级流光、ElementalVfxManager 四大反应、烫金书法跳字) | M_VJ2 | DONE |
| **M_AUD** | 纯 Web Audio 国潮声音合成引擎与全场景音效 | F-AUD-01 ~ F-AUD-06 (纯程序化 Web Audio 合成、三级母线等功率交叉淡化、六大国潮乐器、三大音序器 BGM、打击/反应/UI 音效) | M_VJ3 | DONE |
| **M_ART** | 纯程序化 Canvas 敌军全兵种造型、步频振动与水墨消散 | F-ART-01 ~ F-ART-05 (EnemyTextureFactory 13 种明代造型、Walk Bobbing 正弦步态、Dust Kickup 踏步扬尘、Ink Splash 水墨消散) | M_VJ3 | DONE |
| **M_WAV** | 九州战役 20 关数据驱动波次、环境引擎与五大首领状态机 | F-WAV-01 ~ F-WAV-03 (全 5 章 20 关数据驱动波次、EnvironmentEngine 战场环境法则、五大首领战斗 AI 状态机与技能轴) | M_VJ3 | DONE |
| **M_INT** | 场景联动集成、2D/3D 无缝切换、全量集成测试与工程闭环 | F-INT-01 ~ F-INT-04 (音效与材质全场景接入、2D/3D 平滑无缝热切、918+ 自动化测试通过、GDD/PROJECT/DEV_LOG 像素级同步、双端打包验证) | M_AUD, M_ART, M_WAV | DONE |

---

## Interface Contracts

### 1. `GridModel` ↔ `WeaponInstance`
```typescript
export interface GridPosition {
  row: number; // 0 (bottom battlement) to 4 (top tower)
  col: number; // 0 (left) to 4 (right)
}

export interface GridFootprint {
  width: number;  // 1 or 2
  height: number; // 1 or 2
}

export interface WeaponInstance {
  id: string;
  configId: string;
  star: 1 | 2 | 3 | 4;
  faction: 'fire' | 'mohist' | 'fortress' | 'qimen';
  footprint: GridFootprint;
  anchor: GridPosition;
  isFortressOnly: boolean;
  baseAtk: number;
  attackInterval: number; // in seconds
  range: number;          // in meters (1m = 68px)
}
```

### 2. `Adjacency` & `BondEvaluator`
```typescript
export interface BondContact {
  weaponAId: string;
  weaponBId: string;
  isOrthogonal: boolean; // Cross adjacent (Manhattan == 1)
  isChebyshev: boolean;  // Moore 3x3 adjacent (Chebyshev == 1)
}

export interface FactionResonance {
  faction: 'fire' | 'mohist' | 'fortress' | 'qimen';
  count: number;
  tier: 0 | 2 | 4;
}
```

### 3. `DamagePipeline`
```typescript
export interface DamageCalculationContext {
  attacker: WeaponInstance;
  target: EnemyEntity;
  skillMultiplier: number;
  additiveBonuses: number[];      // Clamped to sum <= 1.50 (150%)
  independentMultipliers: number[]; // Whitelisted, max 3, each <= 0.25 (25%)
  critRateBonus: number;          // Total Crit Rate clamped <= 0.75 (75%)
  critDmgBonus: number;           // Total Crit Dmg clamped <= 2.00
  sunderFlat: number;             // Flat armor reduction
  sunderRate: number;             // Percentage armor reduction
  vulnerability: number;          // Damage amp on target
  specialReduction: number;       // Barrier / special defense
}

export interface DamageResult {
  finalDamage: number;            // Clamped >= 1.0 (minimum guarantee)
  isCrit: boolean;
  actualHpDeducted: number;
  effectiveArmor: number;
  steps: {
    baseAtk: number;
    skillDmg: number;
    additiveDmg: number;
    multiplicativeDmg: number;
    critDmg: number;
    armorDmg: number;
    finalDmg: number;
  };
}
```

### 4. `Shop` & `Tactics`
```typescript
export interface ArmoryCardSlot {
  slotIndex: number;
  weaponConfigId: string;
  cost: number;
  isPityCompensation: boolean;
}

export interface TacticCard {
  id: string;
  name: string;
  quality: 'blue' | 'purple' | 'gold' | 'red_gold';
  category: 'general' | 'fire' | 'mohist' | 'fortress' | 'fusion';
  maxPicksPerRun: 1 | 2;
  currentPicks: number;
  prerequisites?: {
    unitA: { configId: string; star: number };
    unitB: { configId: string; star: number };
  };
}
```

### 5. `PlatformBridge`
```typescript
export interface IPlatform {
  isByteDanceMiniGame(): boolean;
  getSystemInfo(): { screenWidth: number; screenHeight: number; pixelRatio: number };
  onTouchStart(callback: (e: TouchEvent) => void): void;
  onTouchMove(callback: (e: TouchEvent) => void): void;
  onTouchEnd(callback: (e: TouchEvent) => void): void;
  playAudio(src: string, loop?: boolean): void;
  showRewardedAd(adUnitId: string): Promise<boolean>;
  shareAppMessage(title: string, query?: string): void;
}
```

### 6. `SoundManager` & Procedural Web Audio Engine
```typescript
export interface SoundSettings {
  muted: boolean;
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
}

export interface ISoundManager {
  playLobbyBgm(): void;
  playBattleBgm(): void;
  playBossBgm(): void;
  stopBgm(fadeDuration?: number): void;
  toggleMute(): boolean;
  isMuted(): boolean;
  playArquebusShot(): void;
  playCannonBlast(): void;
  playRocketVolley(): void;
  playCrossbowTwang(): void;
  playBladeClank(): void;
  playShieldBash(): void;
  playCritGong(): void;
  playFireBlastReaction(): void;
  playThunderJudgementReaction(): void;
  playIceShatterReaction(): void;
  playNetherPoisonReaction(): void;
  playBronzeButtonClick(): void;
  playVermilionStamp(): void;
  playCoinJingle(): void;
  playIronClink(): void;
}
```

### 7. `EnemyTextureFactory` & Visual Archetypes
```typescript
export type EnemyVisualArchetype =
  | 'enemy_militia'
  | 'enemy_spearman'
  | 'enemy_shield'
  | 'enemy_archer'
  | 'enemy_suicide'
  | 'enemy_cavalry'
  | 'enemy_assassin'
  | 'enemy_shaman'
  | 'boss_iron_bear'
  | 'boss_xuanwu_ship'
  | 'boss_khan'
  | 'boss_corpse_emperor'
  | 'boss_taotie';

export class EnemyTextureFactory {
  static generateAllTextures(scene: Phaser.Scene): void;
  static getTextureKey(enemyType: string, isBoss?: boolean): string;
}
```

### 8. `CampaignWaveEngine` & `EnvironmentEngine`
```typescript
export interface EnvironmentModifiers {
  speedMultiplier: number;
  fireDurationMultiplier: number;
  thunderDamageMultiplier: number;
  shatterDamageMultiplier: number;
  targetingRangeMultiplier: number;
  reloadCooldownMultiplier: number;
  creepRegenPercentPerSec: number;
  wallReflectBonus: number;
  hasBloodMoonRevive: boolean;
}

export class EnvironmentEngine {
  static getThemeForChapter(chapterId: number): EnvironmentThemeId;
  static getModifiers(theme: string, stageId?: number): EnvironmentCombatModifiers;
}

export class CampaignWaveEngine {
  constructor(stageConfig: StageConfig, stageWaveConfig: StageWaveConfig);
  isBossWave(waveNumber?: number): boolean;
  isEliteWave(waveNumber?: number): boolean;
  getCurrentWaveDefinition(): StageWaveDefinition | undefined;
  getEnvironmentModifiers(): EnvironmentCombatModifiers;
  revive(restoreHpPercent?: number): number;
}

export class DefeatAdvisor {
  static analyze(context: DefeatAnalysisContext): DefeatAdvice;
}
```

### 9. `IPlatform` & Mini-Game Monetization Bridge
```typescript
export interface IGameRecorder {
  start(options?: { duration?: number }): void;
  pause(): void;
  resume(): void;
  stop(): void;
  onStart(callback: () => void): void;
  onStop(callback: (res: { videoPath: string }) => void): void;
  onError(callback: (err: any) => void): void;
  isRecording(): boolean;
}

export interface IPlatform {
  readonly type: 'web' | 'douyin' | 'wechat';
  isByteDance(): boolean;
  isWechat?(): boolean;
  getSystemInfo(): SystemInfo;
  getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number };
  showRewardedVideoAd(adUnitId: string): Promise<RewardedVideoAdResult>;
  getGameRecorder(): IGameRecorder | null;
  shareVideo(options: { videoPath: string; title?: string; topics?: string[]; query?: string }): Promise<ShareResult>;
  checkScene(scene: 'sidebar' | 'desktop'): Promise<boolean>;
  navigateToScene(scene: 'sidebar' | 'desktop'): Promise<boolean>;
}
```

### 10. `EndlessMode` & Leaderboard Engine Contracts
```typescript
export interface EnemyAffix {
  id: EnemyAffixId; // 'swift' | 'stone_skin' | 'enraged' | 'throes_explode' | 'regeneration' | 'shielded'
  name: string;
  desc: string;
  badge: string;
  color: number;
}

export class AffixEngine {
  static applyAffixes(enemy: EnemyEntity, affixIds: EnemyAffixId[]): void;
  static tick(enemy: EnemyEntity, dt: number): { healed: number; enragedTriggered: boolean };
  static onEnemyDeath(enemy: EnemyEntity): AffixExplosionEvent | null;
}

export class EndlessWaveGenerator {
  static generateWave(waveIndex: number): EndlessWaveGenerationResult;
}

export class EndlessManager {
  static calculateWaveScaling(waveIndex: number): EndlessWaveScaling;
  static getMilitaryRankTier(highestWave: number): MilitaryRankTier;
  static evaluateSettlement(stats: EndlessSessionStats, personalBestWave: number): EndlessSettlementResult;
  static generateRunChecksum(stats: EndlessSessionStats, score: number): string;
}

export class LeaderboardManager {
  getEntries(tab: 'national' | 'city', playerEntry?: LeaderboardEntry): LeaderboardEntry[];
  getPlayerRank(tab: 'national' | 'city', score: number): { rank: number; total: number; percentile: number };
}
```

### 11. `ForgeSystem` & Boss Drop Engine Contracts
```typescript
export type ComponentSlot = 'barrel' | 'receiver' | 'fuze';
export type ComponentQuality = 'rare' | 'epic' | 'legendary';

export interface ComponentDefinition {
  id: string;
  name: string;
  slot: ComponentSlot;
  quality: ComponentQuality;
  compatibleArchetypes: WeaponArchetypeId[];
  desc: string;
  lore: string;
  statBonuses: WeaponForgeBonuses;
  craftCost: { blueprints: number; iron: number };
  bossSignature?: BossId;
}

export class BossDropEngine {
  static evaluateCampaignBossDrops(stageId: string, isFirstClear: boolean): BossDropResult;
  static evaluateEndlessBossDrops(waveIndex: number): BossDropResult;
}

export class ForgeManager {
  static canForge(profile: PlayerProfile, defId: string): boolean;
  static forgeComponent(profile: PlayerProfile, defId: string): { success: boolean; componentId?: string; reason?: string };
  static equipComponent(profile: PlayerProfile, weaponId: WeaponArchetypeId, componentId: string): boolean;
  static unequipComponent(profile: PlayerProfile, weaponId: WeaponArchetypeId, slot: ComponentSlot): boolean;
  static calculateWeaponForgeBonuses(profile: PlayerProfile, weaponId: WeaponArchetypeId): WeaponForgeBonuses;
  static calculateAllForgeBonuses(profile: PlayerProfile): Record<WeaponArchetypeId, WeaponForgeBonuses>;
}

export class ForgeRefineEngine {
  static rollAffixesForQuality(quality: ComponentQuality, forceSTier?: boolean): ComponentAffix[];
  static calculateGearScore(item: ForgedComponentItem, def?: ComponentDefinition): { score: number; rankText: string; rankColor: string };
  static calculateRefineCost(lockedCount: number): number;
  static canRefine(profile: PlayerProfile, item: ForgedComponentItem): { canRefine: boolean; reason?: string; cost: number; lockedCount: number };
  static ensureItemAffixes(item: ForgedComponentItem): void;
  static toggleAffixLock(item: ForgedComponentItem, affixId: string): { success: boolean; isLocked?: boolean; error?: string };
  static refineItem(profile: PlayerProfile, itemUid: string): RefineResult;
}
```

---

## Acceptance Verification Criteria
1. **100% Automated Unit Test Pass**: All core mathematical modules (`grid`, `swap`, `bonds`, `reaction`, `pipeline`, `shop`, `tactics`, `ftue`, `daily-welfare`, `monetization`, `commander`, `defeat-advisor`, `stage-polishing`, `endless-mode`, `forge-system`, `forge-refine`, `retry-and-wall-damage`, `pause-menu-modal`, `frontline-defense`, `commander-drag-aiming`, `campaign-wave`, `campaign-stages-bosses`) validated with pure headless unit tests (79 suites, 1317 tests).
2. **Bounds & Hard Caps Rigor**: Additive ≤ 150%, independent multipliers ≤ 3 gates at 25%, crit rate ≤ 75%, crit multiplier ≤ 2.0, damage floor ≥ 1.0, CC decay curve 0.70^k with 1.5s tenacity.
3. **Smooth Interactive Sandbox**: Drag-and-drop with 80px touch offset, multi-grid anchor alignment, 2-in-1 merge collision, Smart Swap nearest-slide fallback, Row 0 battlement rejection.
4. **Complete FTUE & Roguelike Combat Loop**: 60s FTUE script closes smoothly; wave stipend + interest economy functions; shop pity counter triggers at 3 rolls; 36 tactics dynamically alter stats.
5. **Monetization & Viral Loop**: Single-use in-battle revival with 50% wall restore & 250px enemy knockback; 3x settlement loot multiplier; TikTok highlight video recording & hashtag sharing; sidebar reward claim & scene navigation; dynamic safe-area insets padding across notches.
6. **Multi-Commander System & Grand General Altar**: 4 Grand Commanders (Wang Shouren, Qin Huali, Qin Liangyu, Liu Bowen) with unique passives and full-screen ultimates (reset & reload burst, barrier & melee reflect, cavalry charge knockback, lightning storm shock), dynamic portrait & stamp adaptation, and persistent altar selection.
7. **Comprehensive Stage Polishing & Combat Feedback**:
   - Animated wave announcement banners with procedural war drums (`playWarDrums`) and boss alert gong/horns (`playBossAlert`) + red screen vignette.
   - Live 3-Star objectives HUD monitor (★1, ★2, ★3 active/grey status) with 60% and 90% wall HP bar tick marks.
   - Interactive Weather Pill in HUD with detailed tactical advantages tooltip; environmental damage & rage modifiers piped into combat.
   - Defeat Root-Cause Analyzer (`DefeatAdvisor`) presenting tailored military counsel and retry guidance on defeat.
8. **In-Game Tactical Command & Pause Menu (军机巡阅 · 战歇)**:
   - Dedicated pause button in top HUD (`⏸️ 军机菜单`) and keyboard shortcut (`ESC` / `P`).
   - Guochao Ming-dynasty NineSlice panel with Battle Briefing (Stage, Wave, Wall HP, Kills, Silver), Active Tactics Deck with quality chip borders, live Settings Toggles (Audio mute, 1x/2x Speed, 2D/3D Mode), and 3 Action Decisions (Resume, 2-step safe Restart, 2-step safe Return Home).
9. **Endless Mode & Dual-Tab Leaderboard (神机演武 · 战功榜)**:
   - Mathematical infinite difficulty scaling ($HP_{mult} = 1.0 + 0.12(W-1) + 0.005(W-1)^2$), 6 elite affix mutations (`swift`, `stone_skin`, `enraged`, `throes_explode`, `regeneration`, `shielded`), and 5-wave cycling Grand Bosses with multi-affix escalation.
   - 8-tier Ming Dynasty Military Rank Title system (神机营卒 -> 定国公·太师) with dedicated honor badges.
   - GDD §17.2/§17.3 deterministic FNV-1a checksum anti-cheat validation and dual-tab leaderboard (`全国风云榜` / `同省战功榜`).
   - National-tide modal (`EndlessModal`), purple glowing aura elite enemy rendering, customized endless defeat settlement, and dynamic top HUD / banner adapting to endless mode.
11. **Frontline Physical Interception & Recoil Anchor Stability**:
    - Lane-based independent barrier stop-lines (`frontlineStopYByLane`, 926px for active Row 0 units, 840px for breach) prevent enemies from bypassing live barricades.
    - Ground units halt before barricades and melee them down; suicide units detonate on barricades; ranged units preserve parabolic siege trajectory.
    - `UnitSprite.playRecoil()` strictly anchored to immutable `baseY` with clean tween lifecycle kill to eliminate multi-hit positional drift.
12. **Early-Wave Onboarding & Smooth Progression Ramp-up**:
    - Wave 1 reconstructed for smooth onboarding (12 Light Infantry at 1.2s intervals in CenterValley with 45 silver stipend).
    - Chapter 1 waves 2~5 smoothly scaled (W2: 24 units, W3: 28 units, W4: 28 units, W5: 32 units) preventing difficulty spikes.
    - Enhanced silver drop economy (Dogs/Bowmen +2 silver, Shields +3 silver, Pagodas/Rams/Bombers +5 silver) and stepped stipends (45->150).
13. **Stages 1~20 Progressive Escalation & Specialty Mechanics**:
    - Wave 1 across Chapters 1~5 starts smoothly ($12 + 2(\text{ch}-1)$ units, 1.2s~0.8s interval) for build warmup.
    - Chapter mechanics gradient: Ch2 Heavy Shield & Ranged Bowman, Ch3 Fast Light Cavalry & Flanking Dogs, Ch4 Bomb Carrier Suicide & Miasma, Ch5 Iron Pagoda Armored Assault & Siege Ram.
    - Exponential base HP multiplier scaling ($40 \to 1100$) paired with scaled silver stipend ($45 + 15(\text{ch}-1) + 6w$) to sustain ★3/★4 merges and forge refinements in late game.


