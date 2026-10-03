# OpenNARS 3.0.4 Lab 功能索引与 Web Lab 对照

本表依据本地 `opennars-lab-3.0.4` 提交 `b3c4b5b` 的 `src/main/java/org/opennars/lab/launcher/Launcher.java` 第 370–532 行。Launcher 是入口索引，不等于每个实验的完整规格；下表的“对应”只说明**入口与任务主题**，不能据此声称逐像素或实验语义等价。

| Java Launcher 入口 | 原动作 | Web Lab 当前入口 | 当前边界 |
| --- | --- | --- | --- |
| Main GUI | `NARSwing(new Nar())` | `terminal.html` | Worker 终端可输入 Narsese、推进周期、清空、重置、调音量、加载 XML；尚无完整的 Java GUI 记忆/概念视图 |
| NAR Pong | `Pong.main` | `demo.html?game=pong` | 已是可运行的感知运动演示；并非 Java UI 的逐像素移植 |
| Micro World | `SimNAR.main` | `microworld.html` | 2D 世界、感知与操作可运行；原版 2M 周期和持续 20 TPS 未证明 |
| Test Chamber | `TestChamber.main` | `demo.html?game=testchamber` | 当前是简化的 Grid2D 开关/交付任务，并非原版全部关卡和交互 |
| Language Lab | `LanguageGUI.main` | 尚无入口 | 应单独设计词项/Narsese/知识随时间变化的交互视图，不挂空按钮 |
| Perception | `SymRecognizerWithVisionChannel.main` | 尚无入口 | 需要先定义浏览器图像输入到 NARS 感知通道的可验证合同 |
| Prediction test | `Predict_NARS_Core.process` | 尚无入口 | 需要公开输入序列、预测时序与误差图，并验证实际 NARS 输出 |
| Vision | `RasterHierachy.main` | 尚无入口 | 需要确认多层栅格表征和性能预算，不以假动画充当推理结果 |
| Website / Wiki / IRC | 打开外部网址 | 项目源码、文档与来源链接 | 它们不是 NARS 运行功能；历史 IRC 地址不在首页复刻 |

Web Lab 另有 Alien、BandRobot、CartPole、Hunt、TicTacToe、Shot、FighterPlane、Echo Relay 等入口，来源和适配各在对应 Demo 页说明；它们与上表的 Java 来源没有上下等级。BandRobot 的自主整段交付尚未证明，页面明确标为实验。

## 后续复刻顺序

先把浏览器终端作为统一仪器：Astro 路由、同一 base path、可操作的 Worker、可靠的输入/输出和可折叠的构建详情。接着以**可见的数据接口**承接 Java Main GUI 中真正有研究价值的观察能力，例如概念数/任务袋的时间图和可追溯事件流。Language Lab、Perception、Prediction、Vision 需要各自的感知/预测合同与真实运行证据，再作为新 Demo 加入目录；未验证前保持文档路线，不加入首页卡片。

视觉与交互遵守 [一图胜千言规范](design-principle-one-image.md)：直接呈现世界或数据关系，文字只承担精确输入、状态解释和可访问名称。

## English summary

The original 3.0.4 Launcher indexed a main GUI, Pong, Microworld, Test Chamber, Language Lab, Perception, Prediction, Vision, and external links. The Web Lab currently provides a functional browser terminal and interactive counterparts for Pong, Microworld, and a simplified Test Chamber. Language, perception, prediction, and vision tools remain planned rather than empty public links. Matching an entry does not imply full behavioral or visual parity with the Java experiment.
