# 《孤城神机营》16型写实军械生图提示词终极指南 (Prompt Library)

> 本提示词库专为 **Midjourney v6+ / FLUX.1 / Stable Diffusion XL** 量身定制，严格对标“硬核写实暗黑大明战场”参考图风格。统一设定 **2.5D 轴测俯视视角（Top-Down 30°~45°）**、**纯白背景隔离（便于一键抠图透明通道）** 以及 **真实沉香木、熟铁锻造、青铜铆钉与战火硝烟材质**。

---

## 一、全局通用规则与最佳参数设置

### 1. 通用正向画风基底 (Universal Style Prefix)
在生成任何器械时，建议在具体器械描述前加入以下画风基底：
```text
2.5D isometric top-down game asset sprite, dark realistic Ming Dynasty historical siege weapon, facing downwards towards the battlefield. Gritty historical military concept art, hand-painted digital illustration, textured aged timber with visible wood grain, forged cold dark iron, patinated oxidized bronze plates with rivets. Realistic lighting, subtle contact shadow beneath the base, isolated on clean pure white background, no card frame, no UI, high visual clarity, 8k resolution
```

### 2. 通用负面提示词 (Universal Negative Prompt)
用于 Stable Diffusion / WebUI / ComfyUI：
```text
card frame, UI border, modern weapon, sci-fi, cartoon, anime, chibi, 3d plastic toy, low poly, blurry, oversaturated colors, flat vector, text, watermark, signature, cut off, perspective distortion, side view
```

### 3. Midjourney 推荐参数
* 单格器械（1×1）：`--ar 1:1 --v 6.1 --style raw`
* 纵向长器械（如红衣大炮 1×2）：`--ar 1:2 --v 6.1 --style raw`
* 横向双格器械（如八牛床弩、聚义战鼓 2×1）：`--ar 2:1 --v 6.1 --style raw`
* 四格巨型器械（如襄阳发石机 2×2）：`--ar 1:1 --v 6.1 --style raw`

---

## 二、四大阵营 · 全十六型军械专属提示词

### 【一】神机火器 (Shenji Faction - Fire)

#### 1. 神机火铳 (Fire Lance) - 1×1 规格
* **中文描述**：明代重型三眼/单管神机火铳架设于青铜三叉架上，八棱冷锻淬火精铁枪管朝向前方下方，胡桃木枪托雕刻精美，枪口系有随风下垂的朱砂红丝流苏，前端微带金黄点火引信与硝烟，纯白背景透明精灵。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of an authentic Ming Dynasty Shenji fire lance mounted on a heavy bronze tripod fork rest, facing downwards towards battlefield. Long octagonal cold-forged black iron barrel, polished dark walnut stock with brass lockplate, flowing vermilion silk tassels hanging from the muzzle band, faint glowing ember at the matchlock vent. Gritty realistic historical concept art, realistic contact shadow on the ground, isolated on pure white background, no UI, no borders --ar 1:1 --v 6.1 --style raw
```

#### 2. 一窝蜂火箭 (Rocket Box) - 1×1 规格
* **中文描述**：明代多管一窝蜂火箭发射车，厚重老榆木六角形火箭机匣架在双轮木制手推推车上，朝前下方倾斜蓄势，前端密集蜂窝发射孔探出多排带朱砂火药涂装的紫竹羽翎火箭头，青铜包角铆钉加固，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a historical Ming Dynasty multi-rocket launcher box "Yi Wo Feng" (Beehive Rocket Box). Hexagonal heavy timber rocket hive mounted on a rugged two-wheeled wooden pushing barrow, tilted downwards towards battlefield. Front face shows a dense honeycomb array of launch tubes with protruding bamboo fire-arrows tipped with red powder heads. Weathered dark wood, bronze reinforcement corner plates and iron rivets. Hand-painted dark realism, ground contact shadow, isolated on pure white background, no card frame --ar 1:1 --v 6.1 --style raw
```

#### 3. 震天雷投手 (Thunder Thrower) - 1×1 规格
* **中文描述**：明代重木 A 字桁架旋风杠杆抛石机，粗壮圆木杠杆斜指前方，后端配重箱装满生铁块，前端皮绳兜中悬挂一颗浑圆带铸造模棱的生铁“震天雷”炸弹，引信闪耀火花微粒，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of an authentic Chinese traction trebuchet throwing an iron fragmentation bomb "Zhen Tian Lei". Sturdy A-frame timber trestle chassis, heavy wooden lever arm pivoting on bronze axle, rough iron box counterweight at the rear, rope sling holding a rough spherical cast-iron explosive bomb with glowing fuse spark. Gritty historical battle machine, realistic wood splinter textures, dark forged metal, isolated on pure white background, no borders --ar 1:1 --v 6.1 --style raw
```

#### 4. 红衣大炮 (Red Cannon) - 1×2 纵向长规格
* **中文描述**：明代万历重型红衣大将军炮，长炮身朝向斜下方，深铁黑带冷冽金属光泽，炮身环绕四道凸起浮雕青铜加强箍带与兽首炮耳，架设在巨型两轮防后坐铁木战车炮架上，炮尾带圆球提钮与火门药池，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a massive Ming Dynasty heavy siege cannon "Hongyi Cannon". Long tapered barrel cast in dark forged iron with subtle cold steel sheen, facing downwards towards battlefield. Four raised decorative relief bronze reinforcement hoops along the tube, twin trunnions resting on a heavy reinforced wooden wheeled chassis with iron-rimmed carriage wheels. Spherical cascabel button at breech, authentic historical military realism, contact drop shadow, isolated on pure white background, no UI frame --ar 1:2 --v 6.1 --style raw
```

---

### 【二】墨家机关 (Mohist Faction - Mechanical)

#### 5. 机关喷火兽 (Flame Beast) - 1×1 规格
* **中文描述**：商周与明代古青铜饕餮神兽造型的重型喷火炉，暗绿青铜绿锈与泥金勾角，双卷角冲天，张开的兽吻巨口内伸出双联紫铜喷嘴，正向前下方猛烈喷射出扇形灼热烈焰与火星，底部为红木机括风箱，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a Mohist mechanical bronze flame beast furnace. Heavy ancient Chinese Taotie beast-head cast in dark patinated bronze with verdigris rust and gilt horns, mouth agape with twin copper nozzles blasting a short cone of intense orange-yellow flame and glowing sparks downwards. Mounted on a heavy hardwood bellows platform with mechanical crank gears. Dark historical fantasy realism, ground shadow, isolated on pure white background, no UI frame --ar 1:1 --v 6.1 --style raw
```

#### 6. 诸葛连弩 (Repeating Crossbow) - 1×1 规格
* **中文描述**：明代改良版诸葛连弩攻防台，坚固硬木三脚底座，双层铁力木复合曲臂弩弓，上方立着垂直黄铜包边木制储箭匣，青铜推拉上膛连杆，发射槽正蓄势待发闪烁寒光的穿甲钢箭，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a defensive Zhuge Nu repeating siege crossbow. Mounted on a solid oak tripod mount facing downwards. Curved composite wood-and-horn double bow limbs, vertical top wooden magazine hopper bound with brass brackets, mechanical bronze cocking lever handle, razor-sharp steel quarrel ready in the groove. Fine woodworking, realistic mechanical linkages, isolated on pure white background, no card frame --ar 1:1 --v 6.1 --style raw
```

#### 7. 八牛床弩 (Bed Crossbow) - 2×1 横向长规格
* **中文描述**：明代三弓八牛重型攻城床弩，横跨双格的重型实木弩床，前二后一三张巨大合力复合弓臂，张紧的粗壮绞弦，两端带青铜棘轮绞盘与摇柄，中央导轨架着一根粗若标枪的“一枪三剑”凿子巨铁箭，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a massive Chinese triple-bow siege bed crossbow "Ba Niu Bed Crossbow". Wide horizontal heavy timber bench chassis spanning two cells, three layered massive recurve bow limbs tensioned with heavy sinew cord, dual side winch ratchets with bronze crank wheels. Central grooved stock loaded with a spear-sized armor-piercing iron chisel bolt. Gritty historical craftsmanship, realistic wood grain and metal tension, isolated on pure white background, no UI --ar 2:1 --v 6.1 --style raw
```

#### 8. 襄阳发石机 (Catapult) - 2×2 四格巨型规格
* **中文描述**：明代襄阳巨型配重式攻城抛石机，四根巨型原木十字交叉地梁，左右 A 型倾斜双立柱与青铜轴套，长长的重型方木投掷悬臂高耸指向斜前方，下部吊装巨大四方配重石箱，粗麻绳网兜兜住一颗打磨浑圆的巨型擂石，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a gargantuan Xiangyang counterweight trebuchet (Huihui Pao). Massive cross-braced timber timber framework occupying a 2x2 footprint, heavy timber A-frame supporting an immense iron axle. Long squared timber swinging arm pointing downwards towards the target, giant slatted wooden chest loaded with rough stone counterweights, heavy hemp rope sling holding a spherical dressed granite siege boulder. Dark military realism, detailed wood joints, isolated on pure white background, no borders --ar 1:1 --v 6.1 --style raw
```

---

### 【三】城防工事 (Fortress Faction - Fortification)

#### 9. 铁索拒马 (Barricade) - 1×1 规格
* **中文描述**：城防重型防骑兵铁索拒马，交叉坚固的削尖柞木圆桩，桩尖套有锋利生铁三棱尖头并经烈火燎烤炭黑硬化，木桩交叉处缠绕粗大生铁链条与密布的八角铁蒺藜挂刺，底部有深扎地面的铁地锚，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a heavy fortified barrier "Tie Suo Ju Ma" (Iron-chained cheval de frise). Crossed sharpened oak logs with fire-hardened blackened tips clad in pointed steel spikes, tightly wrapped with thick heavy forged iron chains and hanging iron caltrops. Fixed with iron ground anchor pegs into the stone. Gritty battlefield defense prop, realistic weathered wood and rust, isolated on pure white background, no UI frame --ar 1:1 --v 6.1 --style raw
```

#### 10. 猛火油柜 (Oil Cabinet) - 1×1 规格
* **中文描述**：明代水师防卫猛火油柜，正方体重型熟铜油柜，四壁带有精细浮雕云雷纹与兽面护角，柜顶并列双铜管活塞唧筒与木质推拉摇杆，前方探出龙头鸭嘴喷火铜管，管口带有微弱火焰与深黑黏稠沥青油污反光，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a historical Chinese flamethrower cabinet "Meng Huo You Gui" (Fierce Fire Oil Cabinet). Square cast-bronze reservoir tank embossed with traditional cloud-thunder patterns, twin bronze vertical pump cylinders on top connected to a wooden rocking lever, dragon-head duckbill spray nozzle pointing downwards. Wet petroleum sheen on metal, dark historical steampunk-alchemy realism, isolated on pure white background, no card frame --ar 1:1 --v 6.1 --style raw
```

#### 11. 陷马电网 (Electric Grid) - 1×1 规格
* **中文描述**：城墙前沿防御陷马地网，四角立有粗矮的青石立柱，柱顶固定白色瓷绝缘瓶与铜雷针，地面紧密铺设交错纵横的玄铁刺铁丝导电网，网孔中心镶嵌微型八卦铜镜，铁丝间跳跃着细碎凌厉的青白电弧火花，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of an electrified defense ground grid. Four short stone corner pillars topped with glazed porcelain insulators and bronze lightning rods, taut crisscrossed forged iron mesh wire grid laid across the ground with central bronze Bagua conduction disc. Crackling subtle cyan-blue electric arcs dancing between wires. Dark historical alchemy-mechanical realism, isolated on pure white background, no borders --ar 1:1 --v 6.1 --style raw
```

#### 12. 白杆长枪营 (Spear Camp) - 1×1 规格
* **中文描述**：明代石砫秦家军白杆长枪防御阵地，前排两面紧密拼接的川东蜀南藤甲圆盾（藤条编织纹理清晰，中间朱砂手绘怒目虎面），盾后整齐探出五根坚韧修长的白蜡木长枪，带倒刺镰钩精钢矛尖，枪颈系有飘扬的朱砂马尾红缨，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a Ming Dynasty Bai Gan Spear defense fortification. Front line fortified with two interlocking woven rattan tiger shields painted with crimson tiger faces, bristling with 5 long white-wax-wood spear shafts protruding downwards in tight formation. Steel spearheads with hooked blades and flowing bright red horsehair tassels. Gritty historical warrior equipment, realistic textures, isolated on pure white background, no card frame --ar 1:1 --v 6.1 --style raw
```

---

### 【四】奇门辅佐 (Qimen Faction - Auxiliary & Altars)

#### 13. 火药局 (Powder Bureau) - 1×1 规格
* **中文描述**：明代兵仗局军工火药分局，青砖黑瓦硬山顶防爆小武库，朱红大门紧闭贴有黄色朱砂“禁火”符篆，门旁整齐码放三只黄铜箍木质火药桶与封蜡陶罐，屋脊正中架设一具展翅欲飞的竹骨纸敷“神火飞鸦”火箭，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a Ming Dynasty military gunpowder storehouse "Huo Yao Ju". Heavy grey brick small bunker pavilion with dark tiled hip-and-gable roof, crimson door sealed with talismanic paper, stacked copper-banded black powder barrels and sealed ceramic pots outside, a bamboo-winged winged fire-crow rocket "Shen Huo Fei Ya" mounted on the roof ridge. Gritty historical military armory, isolated on pure white background, no UI frame --ar 1:1 --v 6.1 --style raw
```

#### 14. 聚义战鼓 (War Drum) - 2×1 横向长规格
* **中文描述**：明代重型聚义军中大堂战鼓，横跨双格的大型实木雕花暗红鼓架，中央架设浑圆饱满的鞣制熟牛皮大堂鼓，鼓面绘有太极与暗金祥云，鼓身镶嵌双排整齐闪亮的鎏金泡钉，两侧各有一只青铜兽首吞环，鼓架斜插一对系红绸的檀木鼓槌，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a massive Chinese military war drum "Ju Yi War Drum". Wide horizontal carved dark rosewood trestle stand spanning two cells, holding a giant crimson lacquer wooden barrel drum with stretched rawhide drum skin. Double row of polished gilt brass stud rivets around the rims, dual dragon beast drop-rings on the flanks, paired wooden drumsticks tied with red ribbon resting beside. Dark imperial military grandeur, isolated on pure white background, no UI --ar 2:1 --v 6.1 --style raw
```

#### 15. 观星祭坛 (Stargazer) - 1×1 规格
* **中文描述**：明代钦天监观星祭坛，双层八角汉白玉须弥座台基，刻有二十八宿星盘刻度，台面中央悬浮着三层互相倾斜交错缓缓自转的鎏金青铜浑天仪环，中心凝聚着一颗散发深邃湛蓝幽光的紫微星核晶石，带有工笔星尘微光，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of an ancient Chinese astrological altar "Guan Xing Ji Tan". Tiered octagonal white marble platform carved with constellation coordinates, supporting three nested floating tilt-axis bronze armillary sphere rings. Central glowing deep celestial blue starlight sphere radiating subtle mystic ether particles. Dark historical esoteric science aesthetic, clean marble chisel details, isolated on pure white background, no card frame --ar 1:1 --v 6.1 --style raw
```

#### 16. 鲁班工坊 (Luban Workshop) - 1×1 规格
* **中文描述**：明代榫卯重型机关军匠案台，厚重实木木工长桌，案面上摊开泛黄微卷的《天工开物》羊皮图纸与墨斗尺规，案台右侧架设一组精密啮合的纯铜大中小齿轮传动轴系，桌角停落一只精巧的木榫机关飞鸢，纯白背景。
* **Prompt**:
```text
2.5D isometric top-down game asset sprite of a Mohist master artisan workshop bench "Lu Ban Workshop". Heavy mortise-and-tenon timber workbench, open aged blueprint scroll on the surface showing mechanical diagrams, bronze caliper rules and ink marker, an interlocking brass gear train mechanism mounted on the bench corner, a miniature wooden mechanical glider bird perched on the rim. Gritty engineering realism, isolated on pure white background, no UI --ar 1:1 --v 6.1 --style raw
```

---

## 三、快速生成与应用工作流 (How to Use)

1. **直接复制 Prompt**：选择上方需要的军械英文 Prompt，粘贴至 Midjourney（输入 `/imagine prompt:`）或 SDXL / Flux 文本框中。
2. **批量扣背景**：因为 Prompt 中均强制包含了 `isolated on pure white background`，生成后可通过 Photoshop 的“快速选择/移除背景”或在线抠图工具（如 remove.bg / Clipdrop）直接得到干净透明的 PNG 精灵。
3. **放入项目替换**：将透明 PNG 放入 `src/presentation/textures/` 对应阵营，游戏将自动加载并与沙盘青砖实现像素级融合！
