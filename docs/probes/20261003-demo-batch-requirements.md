# 2026-10-03 Demo 批次需求总账（短期记忆）

📌【2026-10-03 14:47:53】人类补充：
```
E:\OpenNARS-304-ts-local-archive-20260930\pages-checkout\ARCJ137442.github.io-release-20260930\JuNarsese-demo\opennars-logo-with-julia.svg
E:\OpenNARS-304-ts-local-archive-20260930\pages-checkout\ARCJ137442.github.io-release-20260930\Narsese-structure-illustrator+\opennars-logo-modified-with-rust.svg
后续我们可以参考这俩logo，把里边的Julia/Rust图标改成TypeScript图标（青色方块+TS，就是VSCode/官网的那种svg，大小与这里的Julia图标相同）作为我们的项目的正式logo，放在项目官网以及demo网站中，作为「一图胜千言」原则贯彻的一部分，加入到我们的路线图中
```

本文件只跟踪用户新需求与真实实施状态，随每个批次更新。压缩上下文后先读 Core `docs/active-goal-20261002.md`、本文件和相应 spec/probe，并把记忆中更新的事实落盘。**目标值、已实现、已测通过分开写。** 不删除历史未跟踪证据，不因 Demo UI 改动重复跑核心 M1′；各测试保持串行。

Core spec 050 的 Logo 已通过最小差异实现：以用户 Julia SVG 为底稿，保留天平主体，仅用右托盘同范围圆角青色 `TS` 方块替换 Julia 三圆。Core `ed71f77` 是唯一源；Demo 构建复制同一文件。Core release test、Demo check、Chrome smoke 均通过；Demo 侧改动待本次提交推送，Pages 未更新。

| 需求 | 状态 | 具体出口 |
| --- | --- | --- |
| 停止重复低收益核心性能试探 | 已执行并推送 Core `9aef817` | 三条失败候选反证、源码撤销，Microworld 20 TPS 仍未达，不称收敛 |
| 首页 Microworld 预览素材在无尾斜杠 URL 消失 | Demo `aa06eb6` 已提交推送，Chrome 已测 | Astro 统一 `<base>`；五个 sprite 均 200、食物像素可见；Pages 尚未更新 |
| 终端无效链接与独立页面 | Demo `aa06eb6` 已迁移推送，Chrome 已测 | `src/pages/terminal.astro`、共享 Astro 构建与目录卡片；Worker 判断/复合目标/周期/重置可运行，桌面与窄屏通过；Pages 尚未更新 |
| 「一图胜千言」设计原则 | 已落盘，实施中 | `docs/design-principle-one-image.md`；图标、折叠、情境色、真实事件 FX、移动/减少动效审核 |
| 终端和其他 NARS 面板的游戏级语义 FX | 首批已提交，浏览器功能门已过 | Worker 忙碌才有扫描；输入/输出短动效；普通 Demo/Microworld 的自主操作、babble、奖励、代价按真实事件闪现，减少动效下保留颜色边框；逐事件视觉验收仍可完善 |
| Microworld HUD 文案导致其他指标抖动 | 已提交，Chrome 几何回归通过 | 固定网格槽位与短状态，浏览器把状态文本换成长文案后相邻延迟/FPS/TPS/RPS 与速率条坐标完全一致 |
| NARS 内部经验、预期、操作经验可视化 | Core spec 045 已完成 | 普通 Demo、Microworld、终端共用有界经验时间线；真实 NARS 事件标记 `NARS 内部`，预置/输入/babble 不计入自主经验；Chrome 与 `npm run check` 已通过 |
| 经典 Microworld 左逆时针、右顺时针 | 已提交，直接测试与 Demo check/Chrome 通过 | 屏幕 y 向下，朝东左转朝上、右转朝下；与 Java 旧符号差异显式披露，最终发布门待复核 |
| 离散 Grid Microworld | Core spec 046；主线未实现 | 独立 Demo；方/三角/六角类型与数量在内部调整。试验分支 `codex/gridworld-foundation-wip` 提供 9/9 直接合同通过的纯拓扑模型、未验收渲染器与非发布页草稿；主线无空壳入口 |
| NARS × 2048 | Core spec 047 已写，尚未实现 | 借鉴用户 MIT `jev-2048`，纯规则、自动重开棋盘、默认保留同一 NARS 记忆，另有记忆重置与跨局学习对照；不复制 Jev API/密钥 |
| Pong 玩法对照与增强 | Core spec 048 / 源码已调查，尚未实现模式 | NARust-o 共十类函数，含单 NARS、双控制者、对抗与双挡板；同一个 Pong 页面内切换，独立 Worker/HUD 证明多 NARS，见 `20261003-pong-playmodes.md` |
| NARust-o Shot 完整移植 | Core spec 049 / 源码已调查，尚未实现 | 当前单玩家移动靶版只是简化实验；须覆盖源目录六入口、瞬时射线、玩家重生、绝对/相对感知、多 Worker、进化克隆/淘汰及统计；OpenNARS Narsese/FX 本土化，见 `20261003-shot-full-port.md` |
| 所有 Demo 目标 TPS 至少 20 | 已提交默认/最小20，Chrome 功能门通过，持续实际速率未验证 | 普通 Demo 滑块目标20–60，Microworld 原已目标20；新目标值不代表硬件能持续达到。记录实际/目标比、RPS、概念增长与有效操作；保持早先“低收益后停止”的事实 |
| 发布 v1.0.5、Pages、公开评估 | 中期暂缓，尚未发布 | 当前只收尾性能与 044/经典 Microworld/HUD 已完成部分；045–049 功能范围交下一位 Agent，之后在最终版本上重新验收、部署和发行 |
| OpenNARS TypeScript 正式 Logo | Core spec 050 本地验收完成；Demo 变更待提交推送 | Core `ed71f77` 是唯一 SVG 源；Demo 复制同一字节，Core 包测试、Demo check、Chrome smoke 通过；Pages 待最终发行 |

## 已知工具/测试分类

- LeanSpec `search` 遇中文会因 UTF-8 字节边界 panic；`link` 子命令不可用。只将 `board/search` 的实际输出与仓库 spec 原文作为事实，不伪造依赖状态。
- 一次 Chrome smoke 在新终端卡片加入后因测试选择器匹配两个“NARS 终端”链接而报 `strict mode violation`，属于测试选择器歧义；已改 `exact: true`。20 TPS 更改后旧测试又错误预期 50 RPS，实际标题正确显示 200 RPS，已修订断言。Core 文档后继 `ba0c096` 时再次完成 Chrome smoke，原始 `test-results/midterm-browser-smoke-ba0c096-20261003.log` SHA-256 `F61B9B86C206FE1BC6EF6EB970077CEBA6977996076A9C286C2A3712F40BF2C1`；终端、素材、HUD 坐标、十个普通 Demo 和 Microworld 均通过。这是功能 smoke，不证明 20 TPS 实际达成。
- Demo `npm run check` 最终中期批次退出码 0，TypeScript/Astro、36 项单测、静态构建与产物检查通过，原始 `test-results/midterm-final-demo-check-dbf62ae-20261003.log` SHA-256 `0867AED0BE10E14B10B6EBC35E2667D5327AD101CFE42DD13E0C9E5D9BDC8256`；生成 Worker 绑定 Core 文档后继 `dbf62ae`，其生产 `src` 树与受保护 `083d7b8` 同哈希。此次最终构建后未重复运行无源码变化的整套 Chrome smoke。
- 核心 TS-only M2 在 v1.0.5 发行候选上 `512 passed / 2 skipped / 0 failed`，原始 `reports/evidence/v1.0.5-ts-only-m2-20261003.tap`；Java M2 和 M1′ 复用的受保护生产 `src` 树哈希 `a36ce31778f25e74340fe4406847bacd7bb3c949`，不能写成新提交上重新跑过。

## 当前下一步

044 入口/终端已提交推送，经典 Microworld 左右语义、HUD 固定槽位和 20 TPS **目标配置**也已通过本地直接/Chrome 门；045 内部经验已在 Demo 主线实现并通过 38 项检查与真实浏览器。046 Grid、047 2048、048 Pong 模式、049 Shot 仍交下一批。共享多 Worker/经验观察合同应统筹 Pong/Shot，Grid/2048 先有纯世界合同再接 Worker。最终在一个冻结版本上跑 Demo/核心发行门；所有未实现项持续标“尚未实现”。
