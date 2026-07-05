# 学生上手指南（先读这个！）

这份文档回答四个问题：怎么跑起来、哪里能放心改、哪里千万别乱改、改完怎么确认没搞坏。

## 0. 开工前的三条纪律

1. **每天开工先 `git pull`，每完成一小步就 `git add -A && git commit -m "做了什么"`。** 不 commit 的代码等于不存在。
2. **改完任何代码，跑一遍 `npm test`。** 全绿才能提交；红了就是改坏了核心，回退或找负责人。
3. **两个人不要同时改同一个文件。** 分工见文末。

## 1. 跑起来

```bash
npm install        # 只需要第一次
npm run dev        # 浏览器开 http://localhost:5173
npm test           # 76 个测试，应该全绿
```

键盘：P1 `A/D`，P2 `←/→`，P3 `J/L`，P4 小键盘 `4/6`；`Space` 暂停，`R` 重开，`H` 隐藏界面。

## 2. ✅ 安全区：随便改，改坏了也容易恢复

| 你想改什么 | 改哪个文件 |
| --- | --- |
| 场地：航标位置、绕标方向、起航线、出生点 | `src/sim/course/courses.ts` |
| 难度/环境预设：风速、风摆、阵风、水流 | `src/sim/environment.ts` |
| 规则教学的情景剧本（船位、航向、话术） | `src/lessons/LessonRulesScreen.tsx` 顶部的 `SCENARIOS` 数组 |
| 教学课文案、讲解词 | `src/lessons/` 下各文件里的中文字符串 |
| 项目介绍 5 页轮播的文案 | `src/app/IntroScreen.tsx` 顶部的 `SLIDES` 数组 |
| 首页、设置向导、结果页文案 | `src/app/HomeScreen.tsx` / `SetupScreen.tsx` / `ResultsScreen.tsx` |
| 赛后战术点评的规则 | `src/app/ResultsScreen.tsx` 里的 `buildAdvice` 函数 |
| 颜色、字号、布局 | `src/styles.css` |
| 犯规提示的话术 | `src/sim/rules/rulesEngine.ts` 里的 `warningText` / `breachText`（只改字符串！） |

改场地/环境这类"数据"时照着旁边已有的条目抄格式，最稳。

## 3. ⛔ 危险区：碰之前必须找负责人

这些文件是整个模拟器的地基，有测试保护，但改错一个数字全场行为都会变：

- `src/sim/simulation.ts` —— 主循环
- `src/sim/boat/boatPhysics.ts` —— 船体物理（舵效、换舷、动量）
- `src/sim/polar/polar.ts` —— 船速表
- `src/sim/rules/rulesEngine.ts` —— 裁判逻辑（除了话术字符串）
- `src/sim/race/raceProgress.ts` —— 起航/绕标/完赛判定
- `src/store/gameStore.ts` —— 全局状态

想调"手感"（比如船太快/太慢、转向太灵/太钝）：告诉负责人你想要什么效果，改的是哪个常数由他定。

## 4. 改完怎么验证

1. `npm test` 全绿。
2. `npm run dev` 亲自把你改的那个页面走一遍。
3. 改了比赛相关的？完整打一局：设置向导 → 起航（试一次故意抢航看 OCS）→ 绕两个标 → 冲线 → 看结果页。
4. 提交前 `npm run build` 确认能构建。

## 5. 建议分工（5 人）

| 角色 | 干什么 | 主要文件 |
| --- | --- | --- |
| A 场地与环境 | 调 4 个场地布局、5 个环境预设，让每个都好玩好讲 | `courses.ts`、`environment.ts` |
| B 规则内容 | 补规则情景（如两船同时换舷）、打磨判罚话术 | `SCENARIOS`、`rulesEngine.ts` 话术 |
| C 教学体验 | 三个教学课的文案与节奏、加"手柄 30 秒上手"关卡 | `src/lessons/` |
| D 介绍与 Pitch | 介绍页轮播、首页、赛后页文案，演讲稿 | `IntroScreen.tsx` 等 + `docs/demo-runbook.md` |
| E 现场与硬件 | 真手柄实测通道映射、大电视排练、录兜底视频 | `src/game/loop/gamepadControls.ts`（实测后反馈） |

## 6. 卡住了怎么办

- 页面白屏：看浏览器控制台（F12）红字，通常是改出了语法错误，`git checkout -- 那个文件` 回退。
- `npm test` 红了：读失败信息第一行，是你改的文件就回退重来。
- 手柄没反应：先确认 Windows"游戏控制器"面板能看到它，再看 `gamepadControls.ts`。
- 一切失控：`git log` 找到最后一个能跑的 commit，`git reset --hard <那个commit>`（会丢未提交的改动，慎用）。
