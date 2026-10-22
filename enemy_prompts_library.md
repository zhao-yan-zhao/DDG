# 《孤城神机营》全十三类敌军写实生图提示词终极指南 (Enemy Prompt Library)

> 本提示词库专为 **Midjourney v6+ / FLUX.1 / Stable Diffusion XL** 量身定制，严格继承沙盘十六型军械的“暗黑硬核写实大明古战场”世界观。
> 统一采用 **2.5D 轴测大俯视角（Top-Down 45°~60°）**、**纯白背景隔离（便于一键自动化羽化抠图）**、**高清晰度剪影（High Silhouette Readability）** 与 **冷兵器战场真实质感（锻铁、厚牛皮、狼皮、青铜与血渍硝烟）**。

---

## 一、全局通用规则与最佳生成参数

### 1. 通用画风前缀基底 (Universal Style Prefix)
在生成任何敌军单位时，建议在具体描述前添加以下核心基底词：
```text
2.5D isometric top-down game asset sprite, dark realistic Ming Dynasty historical siege battlefield, invading enemy unit charging upwards towards the fortress gate. Gritty historical military concept art, hand-painted digital illustration, battle-worn lamellar iron armor, weathered raw leather, fur trims, dried bloodstains and mud spatter. Atmospheric cinematic lighting, dramatic rim light, subtle ground contact drop shadow beneath feet, isolated on clean pure solid white background, no card frame, no UI border, sharp silhouette, 8k resolution
```

### 2. 通用负面提示词 (Universal Negative Prompt)
适用于 Stable Diffusion / WebUI / ComfyUI / NovelAI：
```text
card frame, UI borders, player health bar, modern soldiers, sci-fi elements, cartoon, anime, chibi, plastic toy, low poly, blurry, oversaturated colors, flat vector, text, watermark, signature, cropped limbs, perspective distortion, side view, multiple angles, complex background
```

### 3. 生成平台参数推荐
* **Midjourney v6.1**:
  * 常规小兵/精英怪（1~7号）：`--ar 1:1 --v 6.1 --style raw`
  * 巨型攻城冲车（8号）：`--ar 1:1 --v 6.1 --style raw`（或 `--ar 4:3`）
  * 章节终极 Boss（9~13号）：`--ar 1:1 --v 6.1 --style raw`
* **FLUX.1 [dev] / [schnell]**: 建议 Guidance 3.0~3.5，步数 28~35，纯白背景提示词权重加强。
* **Stable Diffusion XL**: 采样器 DPM++ 2M Karras，步数 30，CFG 7.0。

---

## 二、八大常规与精英侵略军提示词 (Regular & Elite Invaders)

### 1. 流寇轻步兵 (Light Infantry / enemy_light_infantry)
* **战场定位**：先锋消耗兵，行动迅速敏捷，面容凶狠。
* **视觉特征**：头戴破损编织竹斗笠（边缘带磨损），粗麻短褐战袍裹身，腰系褪色朱砂红布绑带，草鞋绑腿。双手紧握一柄带锈迹与血痕的生铁短矛，向前俯身冲锋。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a savage nomadic light infantry raider, charging upwards towards fortress wall. Wearing a weathered conical woven bamboo hat, ragged dark grey linen tunic tied with a faded crimson waist sash, rough straw sandals and leg wraps. Grasping a crude iron-tipped spear with a frayed red tassel in both hands. Gritty historical realism, fierce scowl, dirt and mud stains, dynamic charging posture, subtle ground contact shadow beneath feet, isolated on pure solid white background, no card frame, no UI --ar 1:1 --v 6.1 --style raw
```

---

### 2. 狂暴战犬 (War Dog / enemy_war_dog)
* **战场定位**：极速突进单位，撕咬干扰防线。
* **视觉特征**：凶硕健壮的漠北战獒与荒原恶狼杂交战犬，黑褐粗糙毛发，颈戴生铁锻打带尖刺项圈，下颚惨白獠牙滴涎，猩红狂暴双眼，低伏贴地奔袭。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a ferocious steppe war mastiff hound, sprinting aggressively upwards. Muscular build, coarse dark brindle fur stained with snow and mud, heavy forged iron collar studded with sharp bronze spikes around its neck. Snarling jaws baring vicious white fangs, glowing crimson feral eyes, low hunting sprint pose. Hand-painted dark historical fantasy realism, ground contact shadow, isolated on pure solid white background, no UI border, sharp silhouette --ar 1:1 --v 6.1 --style raw
```

---

### 3. 轻装游骑兵 (Light Cavalry / enemy_light_cavalry)
* **战场定位**：中速机动突防，马刀冲阵。
* **视觉特征**：彪悍游牧骑兵跨乘精壮矮种蒙古战马，身披硬牛皮缝制扎甲，头戴毛皮包沿铁盔，右手高扬一柄雪亮反曲马刀（Scimitar），马鬃飞扬，四蹄翻泥冲杀。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a fierce steppe light cavalry raider riding a sturdy Mongolian war horse, galloping upwards into battle. The rider wears hardened boiled leather lamellar armor and a fur-trimmed steel cap, brandishing a curved steel scimitar saber overhead. Galloping war horse with flying dark mane and authentic nomadic bridle gear. Dark gritty historical realism, dynamic combat charge, subtle ground contact shadow, isolated on pure solid white background, no borders --ar 1:1 --v 6.1 --style raw
```

---

### 4. 玄甲刀盾兵 (Shield Guard / enemy_shield_guard)
* **战场定位**：重装推进前排，掩护后方部队推进。
* **视觉特征**：魁梧甲士身披冷锻生铁札甲与护心镜，左手持一扇八角重型铁皮木芯巨塔盾（盾面密布刀痕箭创与铜铆钉），右手反握一柄厚背阔刃雁翎开山刀，压低重心沉稳推进。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of an armored shield guard warrior advancing upwards. Wearing heavy cold-forged black iron lamellar cuirass and spiked bronze-rimmed kettle helmet. Left arm locks into a massive octagonal iron-banded tower shield pitted with arrow scars and battle dents; right hand grips a heavy broad-bladed Ming Yanlingdao saber ready to hack. Imposing defensive stance, battle-tested steel textures, grounded contact shadow, isolated on pure solid white background, no card frame --ar 1:1 --v 6.1 --style raw
```

---

### 5. 铁浮屠重骑 (Iron Pagoda / enemy_iron_pagoda)
* **战场定位**：极高护甲精英，全身重铠钢铁战车。
* **视觉特征**：具装重骑死士，人马皆披挂数层墨黑鱼鳞冷锻重甲，骑手戴精铸冷铁面具（仅露两道阴冷眼孔），双手紧攥八棱重型透甲狼牙铁棒，气势逼人，如移动钢铁堡垒。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a terrifying Iron Pagoda (Tie Fu Tu) super-heavy cataphract knight. Both warrior and warhorse are fully encased in dense overlapping black steel scale barding. The rider wears an ominous cold-forged iron face mask revealing only piercing cold eyes, wielding a heavy octagonal spiked iron mace (Langyabang). Ominous indomitable juggernaut presence, dark weathered metallic luster, subtle ground shadow, isolated on pure solid white background, no UI --ar 1:1 --v 6.1 --style raw
```

---

### 6. 黑山神射手 (Ranged Bowman / enemy_ranged_bowman)
* **战场定位**：远程压制，抛射冷箭。
* **视觉特征**：深褐狼皮背心裹身，腰挂皮革箭壶插满白羽雕翎箭，手拉一张反曲筋角大复合弓，弓如满月，箭镞淬冷铁锋刃，侧步沉肩瞄向城堞。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a lethal steppe master archer, aiming upwards towards ramparts. Wearing dark tanned wolf-fur vest over weathered leather tunic, brass-studded bracers, and a hip quiver bristling with white-fletched heavy arrows. Fully drawing a powerful recurve horn composite bow with an iron broadhead arrow nocked. Focused sniper stance, intricate bow sinew textures, subtle contact shadow, isolated on pure solid white background, no card frame --ar 1:1 --v 6.1 --style raw
```

---

### 7. 背篓火药死士 (Bomb Carrier / enemy_bomb_carrier)
* **战场定位**：自爆突袭兵，高危炸城目标。
* **视觉特征**：赤膊缠绕防火生皮带的疯狂敢死队，后背用粗麻绳绑缚两枚装满火药的大号黑铁炸药木桶，右手举着燃烧的沥青火把，引信火花迸溅并飘散白烟，神情狂热向前疾冲。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a frantic suicide bomb carrier charging upwards at full sprint. Bare-chested with tight raw hide straps binding two heavy wooden gunpowder kegs with dark iron hoops to his back. Holding aloft a blazing tar torch in one hand; sparking glowing fuses hiss with glowing embers and faint smoke. Fanatical rushing pose, hand-painted dark historical realism, ground contact shadow, isolated on pure solid white background, no card frame, no borders --ar 1:1 --v 6.1 --style raw
```

---

### 8. 攻城木冲车 (Siege Ram / enemy_siege_ram)
* **战场定位**：重型破门攻城机械，针对城门与城防工事。
* **视觉特征**：斜面人字形重木棚顶战车，覆满湿生牛皮与防火箭泥浆，下承四只铁箍大木轮。车架内部铁索悬挂一根合抱粗老硬木撞槌，槌头包裹着怒目獠牙的狰狞青铜龙头撞角。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a massive historical timber siege battering ram carriage rolling upwards. A-frame heavy timber canopy draped in wet protective ox hides with iron reinforcement plates, rolling on four heavy iron-rimmed wooden wheels. Suspended on heavy iron chains inside is a colossal tree-trunk ram tipped with a snarling cast bronze dragon-head battering cap. Gritty realistic war engine, deep wood splinters, oxidized bronze patina, ground contact drop shadow, isolated on pure solid white background, no UI --ar 1:1 --v 6.1 --style raw
```

---

## 三、五大章节终极首领提示词 (5 Chapter Supreme Bosses)

### 9. 第一章：铁塔熊王 (Boss Bear / enemy_boss_bear)
* **战场定位**：第一章终极 Boss，远古嗜血巨熊，撕碎阵线。
* **视觉特征**：山岳般庞大的狂暴魔煞巨熊，通体黑褐色厚密杂毛，挂满冰凌与干涸血痕。肩部与脖颈钉死着粗大带刺的黑色生铁肩铠与重刑铁链，双目如地狱红炭，铁爪探出撕咬怒吼。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of the Chapter 1 supreme boss "Iron Mountain War Bear". A gargantuan demonic primordial cave bear standing in aggressive forward charge, matted dark brindle fur caked in frost and bloodstains. Its massive shoulders and neck are bolted with jagged black iron armor plates and heavy spiked slave chains. Blazing crimson ember eyes, razor-sharp steel-like claws raking the earth, roaring maw with steam. Colossal intimidating boss silhouette, realistic monster anatomy, ground contact drop shadow, isolated on pure solid white background, no card frame --ar 1:1 --v 6.1 --style raw
```

---

### 10. 第二章：玄武巨舰 / 机关巨鳌 (Boss Xuanwu / enemy_boss_xuanwu)
* **战场定位**：第二章终极 Boss，青铜机关移动要塞，全屏火力。
* **视觉特征**：青铜与玄铁铸就的巨型机关玄武神龟。龟壳是层层叠叠的青铜石楼与箭楼城寨，两肋装配双联粗壮黑铁轰天巨炮（炮口隐隐冒出橙红火光与蒸汽），龟首嵌青铜饕餮面具，重如移山。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of the Chapter 2 supreme boss "Xuanwu Iron Fortress Ship". A colossal mechanical tortoise war-engine constructed from dark iron and verdigris bronze plates. The towering carapace is engineered into an ancient multi-tiered pagoda citadel fortress with crenels. Sponson gun decks on both flanks house twin heavy bronze siege mortar cannons with glowing heated muzzles. Bronze dragon-turtle prow head with steam vents. Gigantic steampunk-ancient Chinese war automaton, drop shadow beneath, isolated on pure solid white background, no borders --ar 1:1 --v 6.1 --style raw
```

---

### 11. 第三章：金帐天可汗 (Boss Khan / enemy_boss_khan)
* **战场定位**：第三章终极 Boss，塞外霸主统帅，双刀战神。
* **视觉特征**：骑乘披挂金甲的重装汗血宝马，头戴双角黄金王冠战盔，身穿玄铁嵌金丝重鳞札甲，肩披苍狼雪貂巨氅。一手紧握雕饰九游白旄大纛的黄金骑枪，腰悬双柄嵌红宝石弯刀，王者之气压迫全场。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of the Chapter 3 supreme boss "Golden Horde Supreme Khan". Imperial warlord commanding from atop an armored crimson Akhal-Teke war stallion. Wearing an ornate horned golden battle crown helmet and dark gold-inlaid damascus steel lamellar cuirass, draped in a sweeping grey wolf-pelt cape. Gripping a golden lance topped with imperial white horse-tail pennants, twin gem-encrusted golden scimitars at his hip. Supreme royal conqueror aura, museum-grade armor details, grounded contact shadow, isolated on pure solid white background, no UI --ar 1:1 --v 6.1 --style raw
```

---

### 12. 第四章：万蛊尸魔 (Boss Wangu / enemy_boss_wangu)
* **战场定位**：第四章终极 Boss，邪异萨满巫神，腐蚀与召唤。
* **视觉特征**：高大枯槁的魔化巫祭，身披残破深紫与墨绿丝缎长袍，胸前包裹着苍白生灵肋骨外骨骼。头戴双角鹿颅骨巫面，手拄一根盘绕毒蛇、顶端镶嵌羊头骨的枯木法杖，胸腔核心处悬浮着幽绿剧毒灵珠，周身缭绕腐蚀死气。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of the Chapter 4 supreme boss "Wangu Corpse Demon Shaman". A towering gaunt demonic necromancer in tattered ritual robes of poisoned violet and moss silk, chest encased in a cage of bleached skeletal beast ribs. Wearing an antlered stag-skull ritual mask, holding a gnarled staff entwined with serpents and crowned with an inverted ram skull. A pulsating emerald-green toxic jade core glows within its exposed ribcage. Sinister dark fantasy sorcery realism, eerie rim lighting, ground shadow, isolated on pure solid white background, no card frame --ar 1:1 --v 6.1 --style raw
```

---

### 13. 第五章：饕餮巨炮 / 熔火魔神攻城车 (Boss Taotie / enemy_boss_taotie)
* **战场定位**：终极决战 Boss，地狱熔岩巨型攻城炮车。
* **视觉特征**：八轮重型生铁战车与凶兽饕餮合为一体。车头是一张青铜铸造的巨大饕餮兽面血口，利齿森森，血盆大口内赫然是一门蓄势待发的万钧熔岩破城重炮；铠甲缝隙中流动着暗红熔浆，铜角烟囱喷射出滚滚黑烟与烈焰火星。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of the Chapter 5 final boss "Taotie Molten Siege Cannon". A gargantuan eight-wheeled siege behemoth fusing demonic bronze beasts with industrial machinery. The entire armored prow is shaped into a snarling ferocious Taotie demon beast face with jagged bronze fangs, gaping open to reveal an apocalyptic super-heavy molten lava cannon barrel inside its throat. Molten magma veins glow through dark iron armor seams, twin horned smokestacks spewing black ash and embers. Ultimate apocalyptic war titan, ground contact drop shadow, isolated on pure solid white background, no UI --ar 1:1 --v 6.1 --style raw
```

---

## 四、生图与后续导入工程说明

1. **生图关键**：
   - 确保包含 `isolated on pure solid white background`（纯白背景隔离），避免产生复杂的地面地皮或装饰框，这样可以无缝应用我们现有的 Canvas 羽化脚本完成一键透明抠图。
   - 敌人的朝向均设定为 `charging upwards towards fortress` 或 `advancing upwards`，与我们自下而上进攻城门的战场动态完全契合。

2. **后续接入流程**（与 16 型军械相同）：
   - 将生成的图片放入本地目录（如 `c:\Users\zhaoyan\Downloads\敌人图`）。
   - 运行工程的批量透明羽化脚本，将透明 PNG 输出至 `d:\Projects\DDG\public\assets\enemies/`。
   - 在 `BootScene` 预加载并在 `EnemySprite` 中替换掉 Canvas 临时图形即可！
