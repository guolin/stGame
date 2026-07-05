# 帆船战术对抗模拟器文档

这个目录用于沉淀《帆船战术对抗模拟器》的产品背景、Demo 叙事、硬件手柄、比赛规则、学生分工和开发路线图。

## 当前项目是干什么的

当前仓库是一个基于 Vite、React、PixiJS、Zustand 和 Vitest 的 2D 帆船战术对抗模拟器脚手架，包名为 `tactical-start`。

项目目标不是做一个普通小游戏，而是做一个黑客松 Demo：在大电视或 iPad 上展示 1-4 条帆船如何根据风向、风速、水流、风区和竞赛规则完成战术对抗。观众应该能直观看到“为什么这条船更快”“为什么这条船犯规”“规则提示如何帮助学习帆船比赛”。

现有代码已经具备一些基础雏形：

- 双人同屏操控：玩家 1 使用 `A/D`、`W/S` 或手柄轴，玩家 2 使用方向键。
- 游戏循环：通过固定页面状态驱动船体更新、风场更新、水流影响和比赛进度。
- 环境系统：全局风、局部风区、水流区。
- 物理系统：基于风角和水流的简化船体运动。
- 赛程系统：起航倒计时、单个上风标、终点线和胜负判定。
- 可视化图层：风、水流、航迹、Layline、禁航角和 HUD 面板。
- 测试：覆盖部分船体物理、极曲线、风区、水流、比赛进度和手柄输入逻辑。

它还不是完整的竞赛训练游戏。当前重点应从“能开船的原型”升级为“能解释帆船战术和竞赛规则的训练工具”。

## 先读这两份（2026-07 更新）

- [dev-status.md](./dev-status.md)：代码当前真实状态——六阶段已完成一轮，还剩什么、关键约定、验证方式。
- [student-guide.md](./student-guide.md)：学生上手指南——安全区/危险区文件清单、分工建议、验证流程。

下面的文档写于项目早期，产品定义仍然有效，但"当前代码现状"类描述以 dev-status.md 为准。

## 文档结构

文档按几层组织，方便学生分工和 Demo 准备：

1. 项目背景层
   - [project-background.md](./project-background.md)：项目是什么、为什么做、黑客松演示要达成什么效果。
2. 产品与体验层
   - [product-prd.md](./product-prd.md)：完整产品定义、目标用户、核心玩法、界面和验收标准。
   - [wind-sail-model.md](./wind-sail-model.md)：船型 Polar Data、帆角效率、阵风、风摆、水流和教学演示。
   - [ui-interaction-framework.md](./ui-interaction-framework.md)：网页入口、Demo/讲解/教学/比赛流程、设置页和比赛 HUD 框架。
   - [shared-simulation-components.md](./shared-simulation-components.md)：比赛、讲解和项目介绍共用的底层模拟组件。
   - [demo-runbook.md](./demo-runbook.md)：大电视 Demo 的讲解流程、教学环节、多人比赛和收尾话术。
   - [demo-collateral.md](./demo-collateral.md)：海报、传单、项目网站等 Demo 副产品清单。
3. 硬件与配置层
   - [hardware-and-game-config.md](./hardware-and-game-config.md)：蓝牙帆船模型手柄、1-4 船配置、场地和环境参数。
4. 规则与裁判层
   - [rules-system.md](./rules-system.md)：MVP 竞赛规则、判罚、标位和自动裁判设计。
5. 团队执行层
   - [student-workstreams.md](./student-workstreams.md)：4 个学生、两人一组的分工、交付物和 Demo 优先级。
   - [integration-process.md](./integration-process.md)：A/B 组独立开发、每天或半天集成一次的流程。
   - [implementation-roadmap.md](./implementation-roadmap.md)：从现有原型到 MVP 的阶段拆解和技术落地建议。

## 关键产品方向

产品优先选择：

> 以 B「帆船竞赛训练工具」为核心，以 A「娱乐竞技游戏」作为表现形式。

黑客松 Demo 版本进一步收敛为：

> 用大电视、四个孩子和四个帆船模型手柄，把帆船比赛中的战术和规则变成观众一眼能看懂的互动演示。

也就是说，Demo 的第一优先级不是完整拟真，而是“能讲清楚、能玩起来、能被评委记住”。基础脚手架要先跑通：项目介绍 -> 手柄教学 -> 规则教学 -> 1-4 船比赛 -> 犯规提示 -> 赛后总结。
