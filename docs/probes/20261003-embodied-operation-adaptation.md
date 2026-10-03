# 感知—操作 Demo 适配探查（2026-10-03）

状态：进行中。核心生产代码仍为 `708afc5`，当前核心 HEAD `ed6be38` 只增加文档；M1′ 243/243、#25/#246、降周期 #245、M2 和两项 strict markerless 均有既存证据。Demo HEAD `14f1b7d`，本批 Demo 工作树仍有未提交改动与尚待重建的生成产物。**不要把临时 harness 的 HEAD 字段当成 dirty-source 的实际代码身份。**

## 机制与实验判据

OpenNARS 的可靠操作实验要同时有复合感知、复合目标、条件操作因果规则、注册操作算子和环境反馈。临时规则是明确的预置知识，不声称从零学习；`source=NARS` 且 babble 设为 0、对应世界状态确实改变，才算这里的非 babble 操作证据。短窗口证明能执行，不证明持续学习。候选先用 `scripts/profile-demo-worker.mjs` 的真实构建 Worker 与 TypeScript 世界模型探索，再用 Chrome 页面验证，最终提交固定 Demo SHA。

## 已得到的直接事实

| Demo | 输入/规则状态 | 同输入 Worker 结果 | 浏览器结果与限制 |
| --- | --- | --- | --- |
| Hunt | 四个方向相对感知 + 预置条件规则；默认 cycles 从 1 调到 2 | 30 刻、babble 0：NARS 3 次，首个第 14 刻 `^up`；末 10 刻 38.874 TPS、143 概念 | Chrome 30 秒、目标 5 TPS：实际 4.992 TPS、NARS 3 次、babble 0；目标 20 TPS 时平均 8.654、末窗 5.591 TPS，尚不能宣称 20 TPS 或持续操作。已在十游戏 smoke 中确认 Hunt 操作。 |
| Pong | `right/left --> [on]` 结合 `^Right/^Left` 的两条预置规则；保持 10 cycles | 30 刻、babble 0：NARS 2 次，首个第 2 刻 `^Right`，221 概念；未改前 20 刻 0 次 | 当前产品改动尚未完成 Chrome 重建/复测。 |
| Alien | 自身在左/右/居中感知映射移动/射击；三条预置规则 | 20 刻、babble 0：NARS 2 次，首个第 1 刻 `^shoot`，世界改变并反馈 `HIT`、reward 1；229 概念 | 当前产品改动尚未完成 Chrome 重建/复测。 |
| FighterPlane | 先前已有 `enemy_ahead + ^fire => survive` 预置规则 | 20 刻、babble 0：NARS 2 次，首个第 12 刻 `^fire`；3890 概念、末 5 刻 1.289 TPS | 短 smoke 未观察到，需延长有界浏览器操作窗口；性能仍差。 |
| BandRobot | 试验中的六条分阶段规则；绝对位置感知改为 `pickup/delivery_{left/right/aligned}`，目标随阶段变化，接近目标反馈 | 原绝对位置版 25 刻无 NARS 操作、3334 概念、末 5 刻 2.282 TPS；相对版 60 刻 babble 0 有两次 `^right`，332 概念、末 10 刻 21.861 TPS | 只走到 position 2/target 3，尚未抓取/交付；相对感知直接测试已通过，但**不能宣布该 Demo 的完整搬运闭环已完成**。 |

2026-10-03 后续核对：BandRobot 直接合同已更新，Demo typecheck 与 32/32 单测通过；静态构建和真实 Chrome smoke 通过，babble 0 时十个普通 Demo 中 9 个观察到 NARS 操作（包括 Pong、Alien、BandRobot、Hunt、FighterPlane），CartPole 是唯一未观察到的普通 Demo。BandRobot 的完整搬运限制仍存在；Microworld 是独立 Worker，尚无非 babble 操作证明。

CartPole 机制探针：原编码每刻输入 `good` 目标，同时在杆角绝对值 ≤0.5 时**无论是否执行操作**都输入 `good` 判断。额外加一条 `angle4 + ^left => good` 先验，20 刻 × 5 cycles、babble 0 仍 `NARS 0`、概念 `2310`；只在 harness 中抑制这条无条件反馈后，相同先验触发 `NARS 4`、首个第 5 刻 `^left`，概念降至 `1150`。说明“已满足目标”的持续输入可能抑制操作并制造大量概念，但这还只是因果假设，需在产品代码中改成**世界行动后才产生的结果反馈**，同时核对固定方向力矩、正负倾角感知与默认 cycles 的行为。对应忽略的 JSON 为 `test-results/cartpole-operation-angle-prior{,-no-feedback}-20261003.json`。不能直接把关闭所有反馈的诊断方案发布。

CartPole 产品候选现已批量改为 `tilt_left/tilt_right` 相对感知、两条反向力矩的预置因果规则、固定方向 ±0.12 力矩；`good` 只在操作后杆的绝对偏角减小时输入，而世界的直立奖励仍单独保留。30 刻 × 默认 10 cycles、babble 0 得到 `NARS 4`、208 概念、末 10 刻 21.78 TPS。相同 seed 的 67 刻 × 5 cycles、默认 babble 0.08，与旧 Worker/旧世界模型的基线相比，概念终点 `7218 → 702`、末段 TPS `1.334 → 13.0`、峰值 RSS `867250176 → 248508416 bytes`，新模型有 NARS 4 次、babble 4 次。此对比**同时改变了 Demo 表征、反馈与物理动作含义**，不是纯核心优化 A/B，不能用它支持 M1′/M2 的推理器提速声明；还需当前浏览器 30 秒窗口与直接测试验收。原始新结果 `test-results/cartpole-native-tilt-outcome-feedback-67-cycles5-20261003.json`。

当前 CartPole 的 Chrome 30 秒同配置样本平均 `9.910 TPS`、末窗 `7.577 TPS`，4 次 NARS 操作、1831 概念；旧样本平均 `2.229 TPS`、末窗 `1.595 TPS`、7232 概念。仍未达到目标 20 TPS 或其半速 10 TPS，且本次浏览器基准退出码 1：唯一 `consoleErrors` 为 `INFO ProcessGoal Executed based on...` 被项目 Logger 误写到 `console.error`，没有 page/Worker fault。核心已针对 INFO→`console.info` 做生产修改与直接合同，TS-only M2 `512 passed / 2 skipped / 0 failed`，含 Java M2 正在串行跑；这会要求新提交上的最终 M1′/markerless/浏览器重验。不能用诊断性 Chrome 样本宣称通过发布门。

Microworld 的 6 路感知是好食物 0/1/2 三个视野扇区与坏食物 3/4/5 三个扇区，`simulation.ts` 中前者偏角由负到正。`SimNAR.java` 第 335–340 行**注释掉**两条候选因果规则：`{0}` 感知配 `^Right`、`{2}` 配 `^Left` 预测 `satisfied`。它们不是原版默认执行的规则。TS 若启用 starter knowledge，必须显式标注其来源与“预置”身份；先在同输入 Worker harness 以可选先验试验，确认当前世界状态真的呈现对应扇区和非 babble 操作，再决定是否产品化，不能写成 Java 原版已有功能。

只读世界探针显示，默认复现实验 seed `3040304` 在**零操作**的前 200 刻六路有效感知计数全为 0，因此关闭 babble 后靠该 seed 很难测试感知条件规则；这只是场景初态，不是 NARS 无操作的证明。小范围 seed 搜索找到 seed `5` 初态好食物扇区 0、`19` 扇区 1、`48` 扇区 2。下一步使用这三个固定场景、babble 0，分别在真实 Microworld Worker 的可选先验接口下验证方向操作；再用随机种子和原默认路径检查性能与原版行为。当前 `src/microworld-worker.ts` 仅添加可选 `priorRules` 输入，页面尚未传入，产品默认行为未变；等待当前核心 M1′ 单进程结束后才重建 Worker 跑测试。

固定核心 `083d7b8`、构建 Worker 与真实 TS 世界模型的同输入实验已完成。seed `19`、babble 0、30 刻×10 cycles：空白规则组 `NARS 0`、中间好食物感知 30/30；加入三条起点规则后第 16 刻感知中间食物、由 NARS 执行 `^Forward` 1 次，外部 babble 仍 0。三条规则中左右两条取自 `SimNAR.java` 第 335–340 行**已注释的候选**，中间 `^Forward` 是本项目新增的实验先验。seed `5` 虽有 2 次 `^Forward`，却不是它的左扇区对应操作；seed `48` 右扇区 30/30 而 NARS 0。因此只能把 seed19+中间规则认作当前可复现的演示场景，不能宣称三条规则都被验证、也不能说是 Java 原版默认知识。原始 JSON 分别为 `test-results/microworld-seed19-{no-prior,starter-priors}-no-babble-20261003.json`、`microworld-seed{5,48}-starter-priors-no-babble-20261003.json`。

产品化方向：页面显式提供“起点知识/经典空白”切换，重置 NARS 后生效；Lab 导航入口可用 `?seed=19&knowledge=starter` 提供可复现的示例，直接打开的经典路径仍能选择空白探索。只给用户展示已经证实的中间感知→`^Forward` 规则；左右规则保留在研究实验资料，待独立验证后再决定是否默认装入。必须在真实 Chrome、babble 0 条件下验证 source=NARS、操作改变世界、无 page/Worker fault，并独立测量当前核心下 30 秒 TPS。

该方向已落入**未提交的 Demo 候选**：`src/microworld/nars-priors.ts` 只装入项目新增的中间扇区规则；页面灯泡按钮和 URL `knowledge=starter` 在重置时把规则传给 Worker，`knowledge=classic` 不装入；首页和目录的 Microworld 入口选用 seed19 示例场景。说明折叠区与中英 README 明确披露预置与经典空白的区别。绑定核心 `083d7b8` 后，Demo `npm run check` 通过（32/32 单测、Astro/TS、静态产物），Chrome smoke：10 个普通 Demo 在 babble 0 均有 NARS 操作；Microworld seed19 starter 也有 NARS 操作，切到 classic 后最新 Worker reset 的 `priorRules.length=0`，首页仍 0 Worker、pageErrors 0。原始 smoke JSON `test-results/browser-smoke-starter-083d7b8-20261003.json`；脚本后续增补显式字段，固定提交需重跑。

Chrome 154，同 seed19、babble 0、同步目标 20 TPS、10 cycles、30 秒：starter 平均 `15.775 TPS`，六个 5 秒窗口 `19.945/19.940/16.189/14.587/12.783/11.194`，概念到 `1550`，NARS `^Forward` 4 次、外部 babble 0；classic 平均 `19.627 TPS`，窗口 `20.146/19.941/18.383/19.783/19.743/19.766`，概念到 `2056`，NARS 0 次。两者均无 console/page/Worker fault。原始 JSON 分别在 `test-results/microworld-{starter,classic}-seed19-20tps-083d7b8-20261003.json`。**不能把 classic 的近 20 TPS 归给 starter 的具身闭环**；starter 的末窗 11.194 TPS 仍未满足持续 20 TPS 目标。当前 Demo 源码/产物尚未固定提交，这两项是诊断证据，不是发布门。

固定 Demo `2b888c8` 与核心 `083d7b8` 的 Chrome smoke 原始 `test-results/browser-smoke-fixed-2b888c8-20261003.json` SHA-256 `4858C661D153FB8A352C3671ACDA26690313E67BA2FBE569E274ECBA97CB5268`：10 个普通 Demo 的非 babble 操作均可观测；Microworld 示例模式操作为真、切回空白后规则数 0、首页 Worker 数 0、页面错误 0。相同固定提交的 30 秒 Microworld starter 平均 `15.805`、末窗 `11.360 TPS`，NARS 4 次，原始 JSON SHA-256 `D0BE6F1564D6A38866D8410E54016428F035EAE8CEBFC025641A412192188BC9`。CartPole 20 TPS 压测平均 `9.947`、末窗 `7.588 TPS`，仍未过半速；正常目标 5 TPS、10 cycles 时平均 `4.923`、末窗 `5.195`，NARS 7 次，原始 JSON SHA-256 `409DAA089DB6CEEB4EB0C30A31C5DCD74CC8B6EB0A07FA35842466C2A29CD298`。全部无 page/console/Worker fault，JSON 的两仓库 tracked-source-clean 均为真。

普通 Demo 正常目标 5 TPS、默认周期、30 秒的固定提交矩阵（Chrome 154、seed3040304）显示明显分层：Pong `4.988/4.989`、Alien `4.659/4.991`、BandRobot `4.956/4.990`、CartPole `4.923/5.195`、Hunt `4.957/4.798`（数值为平均/末窗 TPS）；TicTacToe `1.264/0.598`、Shot `3.327/1.399`、TestChamber `0.665/0.399`、FighterPlane `0.998/0.800`、Echo Relay `1.431/1.197`。十项无页面/控制台/Worker fault，NARS 操作计数依次为 `4/1/123/7/4/6/1/1/1/30`；操作计数不能代替有效行动。原始文件 `test-results/<game>-default30-fixed-2b888c8-20261003.json`，CartPole 为 `cartpole-fixed-2b888c8-default-20261003.json`，哈希可对这些原始 JSON 现算。

BandRobot 的 123 次 NARS 操作大多是被夹在位置 0 后反复 `^left`，固定 150 刻没有抓取或交付。补错向/失败抓取的负反馈后仍反复无效操作，概念涨到 `2534`，故**该负反馈候选已撤销**，原始 `test-results/bandrobot-explicit-action-outcomes-150-20261003.json` 与 patch `bandrobot-negative-feedback-rejected-20261003.patch` 保留。`profile-demo-worker.mjs` 原来的 `worldChanged` 把反馈队列变化误算成世界变化；现改为与同 tick、同 seed 的“无动作”反事实世界比较，排除 tick、reward 与反馈队列，仅记录真实物理影响。BandRobot 的完整搬运闭环仍未证明。

TestChamber 的输入频率试验仅在 harness 内进行，产品源码未改：原每刻四条感知与一条目标，25 刻概念 `4401`、末五刻 `0.351 TPS`、NARS 1 次有效动作；仅在状态变化或每 5 刻刷新时概念 `1848`、末 `6.160 TPS`，但 NARS 0 次；每 2 刻刷新时概念 `3258`、末 `1.205 TPS`，NARS 1 次有效动作，但首操作从第 4 刻 `^right` 变为第 15 刻 `^up`。这是改变时序输入的**行为实验**，不能作为同语义性能优化接受。下一可证伪实验是先完整输入 5 刻用于形成初始反应，再改为变化驱动加 5 刻刷新，检查操作时机、有效性、概念增长与末窗 TPS。

该下一实验已完成：TestChamber 的“前 5 刻完整输入，之后变化即报、每 5 刻刷新”在 25 刻同输入 Worker 中保留了第 4 刻同一 `^right` 有效操作，概念 `4401 → 2866`、末段 `0.351 → 3.558 TPS`、峰值 RSS `822026240 → 343150592 bytes`。对其余四个扩展环境做同样短探针，都仍有至少一次真正改变物理世界的 NARS 操作：TicTacToe 首次第 3 刻 `^cell4`、末段 `10.289 TPS`；Shot 第 2 刻 `^shoot`、末段 `53.239 TPS`；FighterPlane 第 15 刻 `^fire`、末段 `5.049 TPS`；Echo Relay 第 2 刻 `^ping`、末段 `15.626 TPS`。这只是 Node Worker 25 刻筛选。产品候选在 `src/games/perception-cadence.ts` 实现共同状态事件节奏，并只对五个扩展 Demo 装配；反馈每刻保留。Node 22.17 的 `--experimental-strip-types` 不接受 TypeScript 构造器参数属性，改为可擦除的字段赋值后，直接合同、全套 34/34 单测、TS/Astro 和 build/artifact 均通过；真实 Chrome smoke 继续观察到普通十 Demo 与 Microworld 示例模式的 NARS 操作。随后再补固定提交的 30 秒性能证据如下。

固定 Demo `80ec4da`、核心 `083d7b8` 的真实 Chrome smoke 再次通过：普通十 Demo 在 babble 0 下全部有 NARS 操作，Microworld 示例模式操作为真、空白模式规则数 0、首页 Worker 0、pageErrors 0。随后五个扩展环境在同 seed3040304、同步目标5TPS、10 cycles、默认 babble、30秒下测得：

| 环境 | 旧输入平均/末窗 TPS | 变化节奏平均/末窗 TPS | 变化节奏末概念 | NARS 操作 | SHA-256（新原始 JSON） |
| --- | ---: | ---: | ---: | ---: | --- |
| TicTacToe | 1.264 / 0.598 | 2.995 / 1.399 | 4295 | 9 | `4AD2985F04F43971D981704114D237FEA5DF1CDBDC89572AECD74ED4AA1FFEF7` |
| Shot | 3.327 / 1.399 | 4.855 / 4.594 | 1526 | 1 | `BF85506ED3452F657FC602D2C895029B913AD006FA5ECED71BCA8D75860B7A28` |
| TestChamber | 0.665 / 0.399 | 2.097 / 1.399 | 5710 | 2 | `2183F51907D08CD237A7DF3734D71D87150D3FA2FA7BDAF49209D0B0662AD916` |
| FighterPlane | 0.998 / 0.800 | 2.995 / 2.396 | 3792 | 6 | `630139838B3A31EF604FCEB685AD7028776344131A60CE0BBA7A3AAC809430AE` |
| Echo Relay | 1.431 / 1.197 | 2.763 / 1.798 | 6280 | 7 | `1CAB3693AD9CA049DCA10C0C149D098A1A8B8D1193CA7A799BA7D5AA8BFB4F3A` |

新原始文件均为忽略的 `test-results/<game>-cadence-default30-fixed-80ec4da-20261003.json`，两仓库 `trackedSourceClean=true`，页面/控制台/Worker 故障均 0。平均吞吐改善约 45.9%–215.2%，但输入时序改变导致世界经历不同步数，不能作为核心同语义 A/B 或“持续学习已证实”。Shot 的末窗接近5TPS；另外四项末窗仍低于目标，尤其 TicTacToe/TestChamber。下一步独立修正 HUD：当前 `RuntimeTelemetryView.inference` 用最近一次操作的 `cycles / elapsedMs` 显示 RPS，空窗不归零，Microworld 曾显示两千多 RPS 而实际墙钟约158 RPS；必须改为已完成周期的墙钟窗口，并让进度条相对于目标TPS×每刻周期数。

随后的 Demo typecheck、32/32 单测、静态 build/artifact 与真实 Chrome smoke 均通过；十个普通 Demo 在 babble 0 的有界观察窗口中全部出现 NARS 操作。CartPole 的 Chrome 30 秒压力样本（目标 20 TPS、5 cycles、默认 babble）平均 `9.910 TPS`、末窗 `7.577 TPS`、概念终点 `1831`、NARS 4 次，较旧模型同设置平均 `2.229 TPS`、末窗 `1.595 TPS`、概念 `7232` 明显改善，但仍低于目标半速 `10 TPS` 的门。该基准退出码为 1，仅因为 `Logger.log("INFO", ...)` 被核心 `Logger` 错投到 `console.error`，并非 Worker/page fault；原始 `test-results/cartpole-browser-tilt-outcome-20tps-20261003.json` 同时保存 `consoleErrors` 字段。核心 `Logger` 已开始把 INFO 路由到 `console.info`，直接合同与 typecheck 通过；**核心 M2/M1′/重建后的浏览器复测尚未完成**。这次生产核心更改使先前 `708afc5` 门禁不能自动覆盖最终提交。

原始结果位于忽略的 `test-results/*operation*20261003.json`、`hunt-browser-*-20261003.json` 和 `bandrobot-*-20261003.json`。最新源码事实高于此段描述；改动或验收后立刻同步本文件。

## 当前工作树与下一步

1. 更新 `test/game-models.test.ts` 中 BandRobot 的感知断言，保护相对方向、分阶段目标和实际搬运反馈；检查是否应保留当前 BandRobot 方案。仅有两次向右移动不足以证明完整搬运。
2. 串行运行 Demo typecheck、32 项单测、build/artifact、真实 Chrome smoke；针对 Pong、Alien、Hunt、FighterPlane、BandRobot 分别在 babble 0 下核对操作来源及世界变化。勿从短 smoke 的空结果推断永远不会操作。
3. 对 CartPole 与 Microworld 单独分析环境物理/感受通道、目标与规则，确认没有把 ONA 表征直接移植；修改后对齐相同测试口径。
4. 记录默认目标 TPS 与实际/目标比，以及 20 TPS 压力场景的晚期窗口。NARS 操作出现和性能达标是两个独立门，不能互相代替。

