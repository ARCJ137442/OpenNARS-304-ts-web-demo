# Demo 内部经验观察：已验收记录（2026-10-04）

这是 Core spec 045 的 Demo 侧短期记忆。经验观察已在 Demo 主线实现；本文件只记录真实数据来源、边界和验收证据，不把概念数增长或预置规则包装成“学会”。

## 已实现

- `src/experience/contract.ts` 定义共享经验事件合同与有界缓冲：最多保留 96 条，单个 NARS 时间最多 8 条；超出条目计入丢弃数。
- `src/experience/worker-recorder.ts` 订阅真实 NARS 原始事件：预期、确认、失望、派生任务、信念/目标加入、答案和操作。事件附带 NAR 时间、环境步、原始文本和来源；它们只作为依据，不再直接冒充“内部经验”。
- Worker 阶段明确区分 `prior`、`input`、`babble` 与 `nars`。只有推理阶段的 `nars` 事件标记为 `autonomous=true`；先验、实验输入和 babble 不进入自主经验流。
- 普通 Demo、经典 Microworld、Astro 终端使用同一折叠式经验观察。默认关闭时不遍历概念袋；展开后按 `TruthValue.getExpectation()` 从概念袋读取 Top-N 信念，并同时展示频率、信度与 NAR 时刻。
- 主视图以信念为中心；派生任务、目标加入等原始事件收进二级“原始内部事件”折叠层。无信念时显示“尚未观察到”，不生成示例数据。
- 已补齐 `Brain`、`Eye`、`Lightbulb` Lucide 图标注册，经验面板不再产生缺失图标警告。

## 验收证据

- `npm run check`：TypeScript、Astro、38 项单测、Worker 构建、静态构建和产物检查均通过。
- `npm run test:browser`：终端和 Microworld 的经验面板显示概念袋信念及期望值，原始事件按需展开；普通 10 个 Demo 在 babble=0 时仍观察到 NARS 操作；页面错误为 0。
- `test/experience-contract.test.ts`：验证缓冲总量、单 NAR 时间突发上限和 reset 清空合同。
- Worker 浏览器事件实测包含 `goal`、`belief`、`derived` 等真实事件，并保留原始 Narsese/预算文本；先验和 babble 仍只出现在普通日志或操作来源中。

## 解释边界

Top-N 信念视图证明“当前概念袋中保留了哪些高期望信念”，不单独证明某条知识已在跨局任务中稳定泛化。要声称学习效果，仍需结合固定 seed、行为结果、跨局对照和 NARS 操作后果；原始事件只是追溯依据。概念袋快照是按需、有界的内容观察，不是全量导出。

## 后续

045 已完成；Grid、2048、Pong 多模式和 Shot 完整移植仍由相邻规格跟踪。若后续增加更重的经验字段，必须继续使用有界事件、按需快照，并重新比较观察开关对 TPS/RSS 的影响。
