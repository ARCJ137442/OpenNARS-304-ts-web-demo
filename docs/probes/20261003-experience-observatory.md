# Demo 内部经验观察：工作记忆（2026-10-03）

这是 spec 045 的短期探查文件。当前核心生产 `src` 树与受保护 `083d7b8` 一致；Demo 主线 `7612d9b` 已包含 Astro 终端、首页路径、设计规范、目录卡片、首批语义 FX 与 Microworld HUD 固定槽位，并已通过本地构建/Chrome。**045 的真实内部经验视图尚未实现**；历史未跟踪数据不得混入提交。

## 当前代码事实

- Demo `readReasonerSnapshot` 只返回概念袋容量/数量、三类任务袋数量和 NAR 时间；它**不**证明学到某条知识。
- Core `Concept` 保存 `beliefs`、`desires` 和操作相关的 `executable_preconditions`；`Memory.concepts` 最大可达 10000，逐刻全量扫描不符合当前 TPS 预算。
- Core `DerivationContext` 发出 `Events.TaskDerive`；`ConceptBeliefAdd` 事件带概念与任务；`Anticipate` 使用 `OutputHandler.ANTICIPATE`、`CONFIRM`、`DISAPPOINT` 事件。`Task.inputTask` 并不足以表示“外部输入”：`Anticipate.anticipationFeedback` 会把内部经验也构造为 `INPUT`。因此不能用这个布尔值独自判定是否学习。
- Demo Worker 现已通过 `nar.on` 监听 EXE/Answer 等事件。可复用同一订阅机制形成有界经验流；原始先验输入已有 `PRIOR` 日志，外部 babble 有 `BABBLE` 标识，不能计入自主推导。更高频的 `TaskDerive` 订阅应只在经验视图打开时捕获，并限制字符串化与消息量。
- Microworld `#rate-hud` 原用 `display:flex; justify-content:space-between`，长短状态文本挤动延迟与 FPS/TPS/RPS。已改固定网格槽位、短状态文案和窄屏双行排列；Chrome 在同帧替换长文案后，相邻指标与速率条坐标逐项相等。

## 下一步可证伪实验

1. 已有 044 当前功能门通过；下一 Agent 在加入经验视图后重新跑 Demo `npm run check` 和 Chrome，并检查首页 12 个卡片、Astro 终端、五张 sprite、Microworld HUD。
2. 在 Worker 增加**按需**经验观察消息，先只接低频 `ANTICIPATE/CONFIRM/DISAPPOINT` 和操作事件，记录 NAR 时间、原始词项和来源；UI 默认折叠，仅展示实际接收到的事件与空状态。
3. 固定 seed 与 prior/babble 参数实测普通 Demo 和 Microworld，比较观察开/关的实际 TPS、RSS 和事件数。若没有预期事件，不得填入演示数据；若影响吞吐，缩小订阅或撤销。
4. 后续再决定是否以有限窗口显示 `TaskDerive`、`ConceptBeliefAdd` 和操作条件信念；验证从“预置”到“内部经验”的可解释边界，避免把所有输入任务视作外部或把所有概念数增长视为学习。

## 设计约束

终端与控制面板可使用游戏级 FX，但每个色彩/运动必须映射真实事件。已提交的终端输入/输出、普通 Demo 操作与 Microworld 操作/奖励首批语义反馈在 `prefers-reduced-motion` 下仍保留颜色、图标、文本。禁止用永动粒子暗示推理进展。文档规范见 `docs/design-principle-one-image.md`。
