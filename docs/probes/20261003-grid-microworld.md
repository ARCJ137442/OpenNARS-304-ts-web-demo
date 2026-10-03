# Grid Microworld：拓扑与操作短期记忆（2026-10-03）

关联 Core spec 046。用户新要求：经典 Microworld `left` = 虫体逆时针、`right` = 顺时针；一个新的离散格 Demo 内切换正方形、正三角形、正六边形，世界有限无边缘，左右前和六路感知沿用 Microworld 的 NARS 接口。

## 已查明

- 当前 `src/microworld/simulation.ts` 的屏幕坐标为 `x += cos(angle)`、`y += sin(angle)`，所以角度**增加**在画面上顺时针。当前代码的 `ACTION.LEFT` 是 `+0.5`、`ACTION.RIGHT` 是 `-0.5`，手动 `turn-right` 是 `+0.2`、`turn-left` 是 `-0.2`，与用户的身体相对语义相反。
- Java `SimNAR.java` 第 560–564 行同样以 action2 `+0.5`、action1 `-0.5` 处理角度。这次若反转符号应明确为 Demo 语义修正，而非声称像素级 Java parity；核心 M1′/M2 不应受影响。
- 现有 `src/microworld-worker.ts` 接收 6 个传感值、reward、seed、周期、babble，返回 `^Left/^Right/^Forward` 或 idle/babble，并给出 NARS 时间与内部袋快照。新网格可复用 Worker 协议，需另建离散世界几何与页面控制。
- 方格和六角格可用 4/6 个方向的环面坐标；三角形若真以**三角形单元格**而非格点为位置，必须用朝上/朝下交替三角格，每格 3 个边邻居。不能只画三角形背景而仍按方格移动。下一步先固定邻接/朝向和 wrap 的纯函数合同，再画画面。

## 可证伪下一步

1. 修改经典 Microworld 的 NARS 与手动转向符号，新增朝东初态的直接合同（左朝上、右朝下）；确认六路感知左右顺序仍按相对角度正确分区。
2. 写 `gridworld` 的方/三角/六角拓扑纯函数与 seed 环境合同，先测试邻接、左右前、环面、食物反馈，再接共享 Worker。
3. 单页拓扑选择器与 Lab 卡片；三种画面均用真实离散状态绘制，视觉检查虫体/食物处在格内，切换会重置 Worker。
4. 真实浏览器逐拓扑验证六路感知、操作、HUD、减少动效和无首页 Worker；任何不足实录，不用新环境成绩替代连续 Microworld。
