# 感知—操作 Demo 当前探查（2026-10-03）

这是本批 Demo 的短期记忆。事实身份：核心生产提交 `083d7b8`；Demo 最新监测/测试提交 `8a147f4`，其推理与世界模型自 `80ec4da` 后未变。两仓库已跟踪文件在本记录更新前干净；历史忽略的 `test-results/` 原始数据保留。核心同提交 M1′ 主体 243/243、#25/#246、#245 降载 65536、TS/Java M2 与两项 strict markerless 均通过；原始 200 万周期仍 `not_run`。Demo 自身是否发版另受性能与行为门限制。

## 已证明的功能与边界

- 固定浏览器 smoke：普通 10 个 Demo 在 babble 0 下都出现 `source=NARS` 的操作；Microworld 的 `?seed=19&knowledge=starter` 也出现 NARS `^Forward`，切回 classic 后 Worker 收到 0 条先验规则；首页不启动 Worker，pageErrors 为 0。原始 `test-results/browser-smoke-fixed-2b888c8-20261003.json` SHA-256 `4858C661D153FB8A352C3671ACDA26690313E67BA2FBE569E274ECBA97CB5268`。后续 HUD 回归还验证 Pong 暂停后 RPS 归零。
- 预置条件规则由 Demo 明确披露，证明“有先验时的目标推理和操作执行”，**不证明从空白学会规则**。Microworld 的左右规则仅见 `SimNAR.java` 第 335–340 行注释，本项目公开示例只装入自己撰写、已在 seed19 证实的中间食物→前进规则。
- BandRobot 的 NARS 操作次数**不是**交付成功率：默认 30 秒曾有 123 次 NARS 操作，绝大多数在位置 0 反复 `^left`；150 刻仍未抓取/交付。错向与失败抓取负反馈候选继续陷入无效操作并使概念数升至 2534，已经撤销。原始 `test-results/bandrobot-explicit-action-outcomes-150-20261003.json` 与 `bandrobot-negative-feedback-rejected-20261003.patch` 保留。完整搬运闭环不能宣称完成。
- `profile-demo-worker.mjs` 对 NARS 操作的“改变世界”改用同 seed、同 tick 无动作反事实世界比较，排除反馈队列与时钟变化；其结果只用于筛选，真实浏览器仍是产品门。

## 固定配置的 30 秒速率

Chrome 154、seed `3040304`、同步、普通 Demo 目标 5 TPS（Hunt 2 cycles，其余各 10）、默认 babble；数值为平均 / 最后 5 秒世界 TPS。下表是 `80ec4da` 的扩展输入节奏版和此前 `2b888c8` 的五个常规模型版；`8a147f4` 只更改 HUD 计算，未更改推理输入或世界模型。

| 环境 | 平均 / 末窗 TPS | 完成周期/秒 | 概念终点 | NARS 操作 | 后段判定 |
| --- | ---: | ---: | ---: | ---: | --- |
| Pong | 4.988 / 4.989 | 49.881 | 721 | 4 | 接近目标 |
| Alien | 4.659 / 4.991 | 46.590 | 1376 | 1 | 接近目标 |
| BandRobot | 4.956 / 4.990 | 49.557 | 607 | 123 | 速度达标，行为无效 |
| CartPole | 4.923 / 5.195 | 49.226 | 1680 | 7 | 正常目标达标；20 TPS 压测未达半速 |
| Hunt | 4.957 / 4.798 | 9.913 | 1494 | 4 | 接近目标 |
| TicTacToe | 2.995 / 1.399 | 29.947 | 4295 | 9 | 后段不足 |
| Shot | 4.855 / 4.594 | 48.545 | 1526 | 1 | 接近目标 |
| TestChamber | 2.097 / 1.399 | 20.973 | 5710 | 2 | 后段不足 |
| FighterPlane | 2.995 / 2.396 | 29.953 | 3792 | 6 | 后段低于半速 |
| Echo Relay | 2.763 / 1.798 | 27.631 | 6280 | 7 | 后段不足 |

普通 Demo 原始 JSON 命名：`test-results/<game>-default30-fixed-2b888c8-20261003.json`，CartPole 为 `cartpole-fixed-2b888c8-default-20261003.json`；五个扩展 Demo 新版为 `<game>-cadence-default30-fixed-80ec4da-20261003.json`。全部页面/控制台/Worker 故障为 0。扩展输入节奏使五项平均 TPS 比逐刻重复输入高 45.9%–215.2%，但它改变了**Demo 的时间性输入**，不是核心同语义性能提升。Shot 后段接近 5；其余四项仍需优化。

Microworld seed19、babble0、目标20TPS、10 cycles：固定 `2b888c8` 示例模式平均 `15.805`、末窗 `11.360 TPS`，NARS 4 次；classic 空白平均 `19.627`、末窗 `19.766`，但 NARS 0 次。前者原始 SHA-256 `D0BE6F1564D6A38866D8410E54016428F035EAE8CEBFC025641A412192188BC9`。不能用空白模式的近20 TPS 充当有效具身场景的达标证据。`8a147f4` 的 HUD 修正后，同配置示例模式平均 `15.875`、末窗 `11.776 TPS`，5秒末窗墙钟 `117.755 RPS`，末次约1秒 HUD `78.9 RPS`，不再显示以前的两千多活跃推理 RPS；原始 SHA-256 `67377C1C1F638C0E042C3323CE1DBE07D9BAC637364C64EC83CE1D7E84F24EFD`。墙钟窗口长度不同，两个数字不能要求逐位相等。

## 已走过的适配实验

- CartPole 旧版每刻都把“已经直立”当成 `good` 判断喂给 NARS，同时重复 `good` 目标。新版本用左右倾斜感知、固定方向 ±0.12 力矩，只在操作后偏角减小时反馈 `good`；同 seed 的 67 刻/5 cycles Worker 概念 `7218→702`、末段 `1.334→13.0 TPS`。Chrome 20 TPS 压测平均 `9.947`、末窗 `7.588`，仍未达半速。该批同时改变物理与输入，不可算作核心优化。
- BandRobot 从绝对位置改成相对方位和分阶段目标：25 刻概念 `3334→280`、末段 `2.282→27.28 TPS`，但固定无 babble 只向右移动两次，未完成搬运。
- 五个扩展 Demo 前 5 刻完整输入，随后状态变化立即报告、稳定状态每 5 刻刷新，反馈逐条保留。TestChamber 25 刻实验保留第4刻同一有效 `^right`，概念 `4401→2866`、末段 `0.351→3.558 TPS`；单纯每5刻刷新却丢失 NARS 操作，故未采用。模型直接合同、35项单测、TypeScript/Astro、构建与 Chrome smoke 已通过。
- RPS HUD 改为约一秒墙钟完成周期，空窗归零，色条参考目标 TPS×周期数；Pong 暂停浏览器回归已通过。这只修正观测值，不提高推理吞吐。

## 下一步可证伪实验

1. 本轮性能试探已按用户要求停止。TicTacToe、TestChamber、FighterPlane、Echo Relay 的 30 秒末窗 TPS 未达预期；保留这些限制与已有原始数据，不再启动新的吞吐候选。不得靠进一步减周期、隐藏目标或异步世界 TPS 冒充核心优化。
2. BandRobot 已在首页摘要和 Demo 先验说明中标为“多步任务实验”，明确当前固定场景未证明自主完整交付；未来若调整因果/反馈语义，须以无外部 babble 的抓取—运输—交付实测重新解除该标记。
3. Microworld **示例知识**模式真实同步 20 TPS 目标未达成；下一版发布资料必须披露 30 秒平均 `15.875`、末窗 `11.776 TPS`，不能用 classic 空白模式、短时峰值或 Worker harness 的近 20 TPS 替代。
4. 最终完成 Node/API、页面与发布资产审计，更新 Pages、推送修订发行；当前 `/goal` 与 spec 042 仍进行中。

2026-10-03 后续核心性能反证：在同输入 Microworld 474 刻中，临时计数确证 Bag 有 29202388 次同类键扫描，但两版具备改名观察的原生名称索引在 Microworld 仅约 3%–5% 端到端收益；TestChamber 要么收益约 1% 且多占约 71 MB RSS，要么快约 5% 却多占约 44 MB。其后的几何对象快路两版也没有端到端收益，RSS 上升。所有候选核心源码和实验 bundle 均已撤销。原始 bundle/JSON 的固定身份及 patch 哈希在核心仓库 `docs/probes/20261002-bag-term-equality.md`。当前 Demo 的生产代码未因这些核心试验改变；`profile-demo-worker.mjs` 新增可选 `--bundle`，便于复用保存在 `test-results/` 的基线 Worker 字节进行交叉测量。用户已要求重复无明显优化时停止，本轮不再安排新的性能实验；这不等于严格收敛或目标 TPS 达标。

发行候选在核心 `48b764c`（v1.0.5，`src` 树与受保护 `083d7b8` 相同）上重建 Worker。Demo `npm run check` 的 TypeScript/Astro、35 项单测、静态构建及产物检查通过，日志 `test-results/demo-check-v1.0.5-20261003.log` SHA-256 `DFC60CD744F5E92BDBD3ED6ACA32A9641D2854B8C54084FA382D0474988D53D3`。真实 Chrome smoke 须用 `/opennars-304-ts-lab/` 子路径；首次误用根路径得到 404，归类为测试配置错误。纠正后 10 个普通 Demo、Microworld 示例、空白模式先验数、首页 canvas/零 Worker 与零页面错误均通过，日志 `test-results/browser-smoke-v1.0.5-20261003.log` SHA-256 `F61B9B86C206FE1BC6EF6EB970077CEBA6977996076A9C286C2A3712F40BF2C1`。这证明“出现 NARS 操作”，不证明 BandRobot 完整交付；它已在目录和先验说明中公开标为实验。

