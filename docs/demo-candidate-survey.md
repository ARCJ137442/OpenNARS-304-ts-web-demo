# Demo 候选审阅

截至 2026-09-30，扫描 H:/A137442/Develop/AGI/NARS 下的 OpenNARS Lab、NARust-o、NARS-FighterPlane、NARS-Embodied-Interface 与 canonical 3.0.4 NAL 资源。

## 本批次纳入

| 候选 | 来源 | OpenNARS 价值 | 主要适配工作 | 决定 |
| --- | --- | --- | --- | --- |
| TicTacToe | opennars-lab-3.0.4/src/main/java/org/opennars/lab/tictactoe/TicTacToe.java | 复合棋盘、多步目标、胜负反馈 | 重写 addO 和胜负反馈，禁止裸 win! | 纳入 |
| Shot | NARust-o/examples/_games/shot/ | 差分感知、多操作、连续奖励 | 将 ONA 的 good_nar 与操作宏改为复合属性/目标 | 纳入 |
| Grid2D TestChamber | opennars-lab-3.0.4/src/main/java/org/opennars/lab/grid2d/main/TestChamber.java | 导航、拾取、激活/停用、空间关系 | 重写 Grid2D 状态与 Goto/Pick/Activate/Deactivate 合同 | 纳入 |
| FighterPlane | NARS-FighterPlane-fork/NARS-FighterPlane_v2.i_alpha/ | 2D 运动、敌机、边界、攻击和惩罚 | 自制 Canvas 图形，借鉴感知/目标/操作管线 | 纳入 |

## 原创候选

Signal Garden 是本项目原创候选。它把多个连续传感器离散成带主体的属性词项，允许用户改变目标权重和环境扰动，观察 NARS 在可观察事件、目标与反馈之间形成偏好。

## 暂缓

- Vision/SymRecognizer：视觉通道和类 UI 依赖较重，先做静态 raster 感知实验。
- Giving/Evolution of Trust：多 Agent 社会博弈，适配价值高但需要独立的多 NAR Worker 合同。
- Predict：适合作为轻量时间序列面板。
- canonical toothbrush.nal、detective.nal、vision.nal：适合 NAL Gallery，不应伪装成环境游戏。

## 许可证和来源边界

- OpenNARS Lab 源码和原始精灵按 GPL-3.0-or-later 处理。
- NARust-o 为 MIT OR Apache-2.0，并含 ONA attribution。
- NARS-Embodied-Interface 的 Python/JuNEI 为 MIT，可借鉴 adapter 思路。
- FighterPlane 许可证与素材来源不完整，本项目只借鉴玩法与接口思想，使用自制图形和新实现。
- ONA C system_tests 只能作为对照，不能作为 OpenNARS 3.0.4 行为基线。

## 审阅规则

候选只有在以下条件同时满足时才能进入目录：

1. 模型状态与动作能用纯 TypeScript 可复现表达。
2. 感知、目标和反馈都能翻译成 OpenNARS 3.0.4 可解析的复合 Narsese。
3. Worker 能证明真实操作执行，或明确证明该 demo 是无操作预测/问答实验。
4. 来源、许可证和适配差异能在 demo 内渐进披露。
5. 浏览器 smoke 能验证在线、推进、暂停、单步、复位和无异常。
