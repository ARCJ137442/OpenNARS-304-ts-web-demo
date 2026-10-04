# Grid Microworld：拓扑与操作验收（2026-10-04）

Grid Microworld 已从纯模型试验提升为真实 Astro 页面 `gridworld.html`。它是独立的新环境，不替代经典连续 Microworld 的 TPS、操作或 Java 画面证据。

## 已实现

- `src/gridworld/model.ts`：正方形 4 邻居、正三角形交替朝向 3 邻居、正六边形 6 邻居；所有位置在环面上 wrap。
- `src/gridworld/render.ts`：按当前拓扑绘制格形、好/坏食物、虫体朝向和六路感受弧。
- `src/gridworld.ts`：统一页面控制、拓扑/列/行/推理步/探索参数、同步/异步节奏、重置 Worker、经验观察、FPS/TPS/RPS 和手动左/前/右操作。
- 复用 `microworld-worker.js` 的真实 OpenNARS Worker 协议与 `MICROWORLD_STARTER_PRIORS`；不创建第二套推理器实现。
- 首页目录增加静态 Grid 卡片；首页仍不启动 NARS。

## 直接与构建证据

- `test/gridworld-model.test.ts`：方格、三角格、六角格各 3 项，共 9 项邻接/环面/旋转/确定性食物/六路感知/奖励合同通过。
- Demo `npm run check`：47 项单测、TypeScript、Astro、静态构建和产物检查通过，四个静态页面可生成。
- `npm run test:browser`：逐个切换 square/triangle/hexagon，画布非空、Worker 在线、经验面板出现 `NARS 内部` 事件；10 个普通 Demo 的既有非 babble 操作 smoke 仍通过，页面错误为 0。

## 证据边界

Grid 页面中的 `NARS`、`babble`、`IDLE` 来源直接来自 Worker 事件；短观察窗口若没有自主操作，页面保留 `IDLE`，不编造成功。Grid 的速率和经验数据只描述离散新环境，不能替代经典 Microworld 连续世界的持续 TPS 门。

## 后续

继续实现前先保持 Grid 页面与当前 Demo 构建门一致；若修改三角格几何或感知扇区，必须同时更新纯模型合同和逐拓扑浏览器 smoke。
