# 帆船战术对抗模拟器（tactical-start）

把帆船比赛搬上大屏的实时模拟器：1-4 名玩家用蓝牙帆船模型手柄（或键盘）各控一条船同屏对抗。风摆、阵风、水流、Layline、禁航角全部可视化，自动裁判用自然语言解释每一次判罚。

## 快速开始

```bash
npm install
npm run dev      # 打开 http://localhost:5173
npm test         # 跑全部单元测试（改完代码必跑）
npm run build    # 生产构建
```

键盘操控：P1 `A/D`，P2 `←/→`，P3 `J/L`，P4 小键盘 `4/6`；`Space` 暂停，`R` 重开，`H` 隐藏/显示界面。

## 给学生：先读这两份

1. **[docs/student-guide.md](docs/student-guide.md)** —— 哪里能改、哪里别碰、怎么验证、卡了怎么办。
2. **[docs/dev-status.md](docs/dev-status.md)** —— 已经做完什么、还剩什么、适合你们做的任务清单。

完整产品文档在 [docs/](docs/)（PRD、风帆模型、规则系统、UI 框架等）。

## 代码结构（一张图）

```
src/
  sim/          ★ 共享模拟核心（headless、确定性、有测试锁着）
    simulation.ts   固定步长主循环 stepSimulation
    boat/           舵效物理、换舷、自动调帆
    polar/          OP/Topper 船速极曲线
    wind/           风场：风摆/阵风/风区叠加
    course/         4 个场地数据（学生安全区 ✎）
    race/           起航合法性 OCS、绕标方向、完赛
    rules/          自动裁判：规则 10-13 + 15/16
    environment.ts  难度×环境预设（学生安全区 ✎）
  store/        Zustand 编排层（页面状态机 + 驱动 sim）
  app/          页面：首页/介绍/设置向导/比赛/结果
  lessons/      交互式教学：风角实验台/风摆分屏/你来当裁判
  components/   比赛 HUD 面板
  game/         Pixi 渲染层 + 键盘/手柄输入
```
