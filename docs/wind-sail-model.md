# 风、帆与 Polar Data 模型

本文档定义帆船运动中最核心的底层模型：船型 Polar Data、风速风向、阵风、风摆、水流和教学演示。

## 1. 核心原则

比赛、讲解模式和项目介绍必须使用同一套风帆模型：

- 比赛中用它决定船速和航线优势。
- 讲解模式用它解释为什么某个角度更快。
- 项目介绍用它做交互式动画。

不能只把风、阵风和水流做成视觉效果。它们必须影响船的实际运动。

## 2. Polar Data

每种船型都有自己的 Polar Data。Polar Data 描述：

```text
在某个真风速 TWS 和真风角 TWA 下，这条船理论上能达到多少相对水速度 STW。
```

### 2.1 输入

Polar Data 至少使用两个输入：

- TWS：True Wind Speed，真风速。
- TWA：True Wind Angle，船头与真风之间的夹角。

可选输入：

- 船型。
- 帆角效率。
- 是否正在换舷。
- 舵角阻力。
- 犯规减速状态。

### 2.2 输出

Polar Data 输出目标相对水速度：

```text
targetSTW = polarSpeed(boatType, TWS, TWA)
```

后续再叠加：

```text
actualSTW =
targetSTW
* sailEfficiency
* rudderDragFactor
* tackPenaltyFactor
* penaltySlowdownFactor
```

对地速度再加水流：

```text
SOG = actualSTW vector + current vector
```

### 2.3 船型

系统底层应预留船型配置：

| 船型 | 用途 | 特点 |
| --- | --- | --- |
| OP | 青少年教学和 Demo | 速度慢、反应清晰、适合讲解 |
| Topper | 青少年训练和 Demo | 比 OP 更快，仍然容易理解 |
| 高性能艇 | 后续扩展 | 更快、更敏感、更难控 |

黑客松阶段默认只在 OP 和 Topper 之间选择。配置结构保留扩展能力，但 Demo 不需要更多船型。

### 2.4 禁航角

船不能正顶风。Polar Data 在禁航角内应给出很低速度或接近 0：

```text
TWA < noGoAngle -> speed ≈ 0
```

建议初始值：

- OP / 教学艇：40-45 度。
- 高性能艇：可后续按船型调整。

### 2.5 插值

真实 Polar Data 通常是表格。实现时可以：

- 用简化函数生成速度曲线。
- 或用二维表格按 TWS 和 TWA 插值。

Demo 阶段建议先用简化表格或函数，重点是让玩家明显感受到：

- 顶风走不动。
- 迎风角度太小会慢。
- 横风或合适迎风角速度更好。
- 顺风和偏顺风速度不同。

## 3. 帆角效率

帆角不是装饰，它影响速度。

理想帆角由 TWA 决定：

```text
idealSailAngle = f(TWA)
```

效率由当前帆角和理想帆角差值决定：

```text
sailEfficiency = g(abs(currentSailAngle - idealSailAngle))
```

黑客松 Demo 不需要玩家手动调帆，只需要调方向。系统统一使用自动调帆：

- 入门难度：完全自动调帆。
- 标准难度：自动调帆 + 显示理想帆角。
- 竞赛难度：仍然自动调帆，后续训练版本再考虑手动调帆。

## 4. 阵风

阵风不是全场统一变化，而是一块小面积区域。

### 4.1 阵风区域

阵风区域具有：

```text
position
radius or polygon
windSpeedDelta
windDirectionDelta
movementVector
duration
falloff
```

阵风可以是：

- 强风阵：风速变大。
- 弱风洞：风速变小。
- 偏风阵：风向左摆或右摆。
- 复合阵：风速和风向同时变化。

### 4.2 移动

阵风区域可以移动：

```text
gust.position += gust.movementVector * dt
```

教学和 Demo 中，阵风移动要足够慢，让观众能看见船为什么选择某一边。

### 4.3 叠加方式

局部风计算：

```text
localWind =
baseWind
+ globalOscillation
+ gustDeltaAtPosition
+ windZoneDeltaAtPosition
```

如果多个阵风重叠，先用加权叠加，后续再限制最大风速和最大风向偏移。

## 5. 风摆

风摆至少分两种，不能混成一个概念。

### 5.1 持续风摆

持续风摆是风向一点点往一侧变化。

特点：

- 不是来回摆，而是持续左摆或持续右摆一段时间。
- 适合讲解“风慢慢偏向一边，所以某一条航线突然更顺”。
- 玩家需要判断是否继续当前航向，还是换舷。

示例：

```text
windDirection = baseDirection + shiftRate * time
```

配置项：

```text
shiftDirection: left | right
shiftRateDegPerSec
maxShiftDeg
```

### 5.2 钟摆式风摆

钟摆式风摆是围绕基准风向周期性左右摆动。

特点：

- 风向像钟摆一样来回变化。
- 适合讲解“等风向摆到有利角度再起航或换舷”。
- 玩家可以利用周期获得更好的上风角度。

示例：

```text
windDirection = baseDirection + amplitude * sin(time / period)
```

配置项：

```text
amplitudeDeg
periodSec
phase
```

## 6. 水流关系

水流不改变 Polar Data。Polar Data 计算的是相对水速度 STW。

水流只影响对地速度 SOG：

```text
SOG = STW vector + current vector
```

MVP 可以不把水流作为核心必做项。水流可以交给学生作为扩展任务，或者先做一个固定、边界清晰可见的水流区域。

如果启用水流，教学里需要讲清楚：

- 船相对水的速度没有因为水流变快。
- 但船对地的航迹被水流推偏。
- Layline、绕标和冲线都会受水流影响。

## 7. 教学模式

场地组需要负责风帆教学内容，至少包含以下教学 Demo。

### 7.1 Polar Data 教学

目标：让玩家理解“角度不同，速度不同”。

演示：

- 固定风速。
- 让玩家或脚本改变船头角度。
- 显示 TWA 和速度条。
- 顶风时显示“禁航角，船速下降”。

### 7.2 帆角教学

目标：让玩家理解“帆调错会慢”。

演示：

- 显示理想帆角。
- 改变当前帆角。
- 显示效率变化。

Demo 阶段使用自动调帆，只演示原理，不要求玩家操作。

### 7.3 持续风摆教学

目标：演示风向持续变化时，哪一边更有利。

演示：

- 让风持续左摆或右摆。
- 两条船走不同航线。
- 显示哪条船更接近上风标。

讲解重点：

```text
风不是固定不变的，持续风摆会改变哪条航线更有利。
```

### 7.4 钟摆式风摆教学

目标：演示周期性风摆如何影响起航和换舷。

演示：

- 风向左右周期摆动。
- 显示当前是左摆还是右摆。
- 让玩家观察什么时候换舷更好。

讲解重点：

```text
等到有利风摆时换舷，可能少走很多距离。
```

### 7.5 阵风教学

目标：演示移动阵风带来的路线选择。

演示：

- 一个强风阵从赛场一侧移动到另一侧。
- 一条船进入阵风，另一条船错过阵风。
- 显示速度差和航迹差。

## 8. MVP 决策

当前已确定：

1. Demo 船型只在 OP 和 Topper 之间选择。
2. 黑客松 Demo 不做玩家手动调帆，只调方向。
3. 蓝牙硬件每个连接器只有一个轴，用于控制一条船的舵。
4. 风摆教学使用直观中文，不直接堆专业术语。
5. 水流不是 MVP 核心必做项，可交给学生扩展；如果先做，只做固定且边界清晰的水流区。
6. 规则教学和风摆教学都要做，因为形式类似，都是游戏内互动讲解加少量 PPT 文案。
