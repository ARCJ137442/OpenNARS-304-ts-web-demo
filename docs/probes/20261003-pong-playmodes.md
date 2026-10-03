# Pong 玩法对照短期记忆（2026-10-03）

对应 Core spec 048。来源：当前普通 Demo 的 `src/games/worlds/pong.ts`；本地 NARust-o 提交 `cd685cd` 的 `examples/_games/pong.rs`（Cargo `MIT OR Apache-2.0`）；OpenNARS Lab `Pong.java` 链接在现有 Demo 定义中。NARust-o Narsese 以 ONA 为原始目标语言，移入前必须适配 OpenNARS 3.0.4 的复合目标与条件操作。

## 已知玩法差异

- `pong_test`：单挡板，左右感知、左右操作。
- `pong_test2`：加中间感知、`^stop` 操作，挡板宽度/速度也变。
- `pong_test2x`：**两个 NARS** 分别控制同一挡板左/右，两个来源同时触发或都不触发时停下；不能用一个 Worker 冒充。
- `pong_test_gan`：**两个 NARS**，分别控制挡板与球，任务/奖励可能对抗；需要单独实验指标。
- `pong_test2_arguments`：带参数操作。
- `pong_test_2p`、`pong_test_2p_one`、`pong_test_2p_one_no_diff`：上下双挡板场景，推理器数与感知处理不同。
- `pong_test2_diff`、`pong_test_diff`、`pong_test_2p_diff`：差分感知（最后一项是双玩家对照）。

当前 Demo 是 OpenNARS Lab 风格的连续坐标 Pong，只注册一个 Worker 的 `^Left/^Right`，配置目标原为 5 TPS。Demo `aa06eb6` 已把普通 Demo 的目标范围改为 20–60、默认20；这仅改变**请求运行速率**，实际同步 TPS 仍须真实测量，不能凭滑块值宣布达标。历史 5 TPS 测量仍是历史证据，不回写。

## 实施路线

一个 Pong 页面包含“世界玩法”选择器：经典连续、离散原型、停止/参数、差分、双控制者、对抗、双挡板。把 NARust-o 的函数与少量可组合参数映射到选项，保持世界物理模型和感知/反馈协议独立。多 NARS 模式用每角色独立 Worker、独立操作/时间/RPS/概念袋 HUD，世界 TPS 单独计算。无实际 Worker 的模式不放可点击入口。先实现单控制者离散玩法并实测，再加双控制者调度；各模式保留源链接与行为差异。

## 当前未完成

没有一个 NARust-o 模式被移植或实测；多 NARS Worker 编排、角色隔离和对抗/双挡板 UI 未做。当前只有源码调查与目标 TPS 设置修改。发布说明不得把“玩法计划”写成上线功能。
