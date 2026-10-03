# Shot 完整移植短期记忆（2026-10-03）

Core spec 049。NARust-o 本地提交 `cd685cd` 的 `examples/_games/shot/` 有 `mod.rs`、`ai_trait.rs`、`ai_null.rs`、`ai_nar.rs`、`ai_nar2.rs`；Cargo 许可 `MIT OR Apache-2.0`。用户授权借鉴。当前 Web Demo 的 `src/games/worlds/shot.ts` 仅有一名左右移动者、一颗水平移动靶、`^left/^right/^shoot`、简单命中/漏射，是**不同于原作的简化版**。

## 原作已确认的世界规则

- 50×20 整数格世界。方向 `Up/Down/Left/Right`，顺/逆时针旋转与方向向量明确；玩家有名称、位置、速度、方向、射击状态、命中/漏射、距上次命中步数与平均命中间隔。
- 各步顺序：形成所有玩家位置的共享感知 → 每名 AI 根据 NARS 操作行动 → 绘制 → 处理射击与成功/失败反馈 → 移动玩家（边界停止、阻止同格重叠）→ 各 AI 推理周期 → 进化附加逻辑。
- 射击沿朝向同一行/列立即判断目标，被击者重生，射手统计命中或漏射；原文用同步 `sleep` 做命中停顿，浏览器不能照搬阻塞，应以不影响世界/推理时钟的动画表达。
- `shot_test`、`shot_test2` 为静态靶单 NARS，区别是绝对上下左右 vs 相对转向/前进；`shot_test_2p`、`shot_test_2p_2ai` 为双 NARS；`shot_test_evolve`、`shot_test_evolve2` 会按命中率/命中间隔排名，复制领先者、淘汰落后者并重生。最后模式起始含两种 AI，人数上限更高。
- `AiNar` 目标跟踪、差分感知、无位移时重报状态、防止环境边缘冻结、移动/射击反馈和动态推理周期，是玩法特征而非 UI 杂项；`AiNar2` 改用身体相对方向感知与 `left/right/forward/shot` 操作。

## 接下来必须验证

先从原作提炼纯世界模型与模式参数表，逐项测试命中、移动冲突、重生和进化。多 NARS Worker 的角色隔离应与 Pong spec 048 共用。再为两种 AI 分别改写 OpenNARS 可解析的复合 Narsese，固定 seed 实测每个模式的 NARS 非 babble 操作和反馈；没有真实事件不得用视觉效果伪装。最终把旧 Shot 卡片/页面升级为同一入口的模式切换，而不是新建六个重复页面。来源差异、许可与无法等价复制的 NARS 内存克隆要公开说明。
