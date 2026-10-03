# 2026-10-03 Demo 批次需求总账（短期记忆）

本文件只跟踪用户新需求与真实实施状态，随每个批次更新。压缩上下文后先读 Core `docs/active-goal-20261002.md`、本文件和相应 spec/probe，并把记忆中更新的事实落盘。**目标值、已实现、已测通过分开写。** 不删除历史未跟踪证据，不因 Demo UI 改动重复跑核心 M1′；各测试保持串行。

| 需求 | 状态 | 具体出口 |
| --- | --- | --- |
| 停止重复低收益核心性能试探 | 已执行并推送 Core `9aef817` | 三条失败候选反证、源码撤销，Microworld 20 TPS 仍未达，不称收敛 |
| 首页 Microworld 预览素材在无尾斜杠 URL 消失 | Demo 工作区已修，Chrome 已测 | Astro 统一 `<base>`；五个 sprite 均 200、食物像素可见；最终提交/Pages 尚未做 |
| 终端无效链接与独立页面 | Demo 工作区已迁移、Chrome 已测 | `src/pages/terminal.astro`、共享 Astro 构建与目录卡片；Worker 判断/复合目标/周期/重置可运行，桌面与窄屏通过；最终提交/Pages 尚未做 |
| 「一图胜千言」设计原则 | 已落盘，实施中 | `docs/design-principle-one-image.md`；图标、折叠、情境色、真实事件 FX、移动/减少动效审核 |
| 终端和其他 NARS 面板的游戏级语义 FX | 工作区已实现首批，浏览器功能门已过 | Worker 忙碌才有扫描；输入/输出短动效；普通 Demo/Microworld 的自主操作、babble、奖励、代价按真实事件闪现，减少动效下保留颜色边框；仍需逐事件视觉验收 |
| Microworld HUD 文案导致其他指标抖动 | 工作区已改，Chrome 几何回归通过 | 固定网格槽位与短状态，浏览器把状态文本换成长文案后相邻延迟/FPS/TPS/RPS 与速率条坐标完全一致 |
| NARS 内部经验、预期、操作经验可视化 | Core spec 045 计划/调查中 | 真实事件与信念、区分预置/自主/babble；按需、有界、不拖垮 TPS；暂无已验收视图 |
| 经典 Microworld 左逆时针、右顺时针 | 工作区源码/直接测试已改，Demo check 与 Chrome 通过 | 屏幕 y 向下，朝东左转朝上、右转朝下；与 Java 旧符号差异显式披露，最终固定提交门待复核 |
| 离散 Grid Microworld | Core spec 046 已写，尚未实现 | 独立 Demo；方/三角/六角类型与数量在本 Demo 内调整；有限环面、格内食物与虫体、左右前/六点感知 |
| NARS × 2048 | Core spec 047 已写，尚未实现 | 借鉴用户 MIT `jev-2048`，纯规则、自动重开棋盘、默认保留同一 NARS 记忆，另有记忆重置与跨局学习对照；不复制 Jev API/密钥 |
| Pong 玩法对照与增强 | Core spec 048 / 源码已调查，尚未实现模式 | NARust-o 共十类函数，含单 NARS、双控制者、对抗与双挡板；同一个 Pong 页面内切换，独立 Worker/HUD 证明多 NARS，见 `20261003-pong-playmodes.md` |
| NARust-o Shot 完整移植 | Core spec 049 / 源码已调查，尚未实现 | 当前单玩家移动靶版只是简化实验；须覆盖源目录六入口、瞬时射线、玩家重生、绝对/相对感知、多 Worker、进化克隆/淘汰及统计；OpenNARS Narsese/FX 本土化，见 `20261003-shot-full-port.md` |
| 所有 Demo 目标 TPS 至少 20 | 工作区已改默认/最小20，Chrome 功能门通过，持续实际速率未验证 | 普通 Demo 滑块目标20–60，Microworld 原已目标20；新目标值不代表硬件能持续达到。记录实际/目标比、RPS、概念增长与有效操作；保持早先“低收益后停止”的事实 |
| 发布 v1.0.5、Pages、公开评估 | 暂缓，尚未发布 | 先完成 044–048 的发布前范围与实际浏览器/核心门，分内容提交推送，更新 Pages，再发行与人工公开检查 |

## 已知工具/测试分类

- LeanSpec `search` 遇中文会因 UTF-8 字节边界 panic；`link` 子命令不可用。只将 `board/search` 的实际输出与仓库 spec 原文作为事实，不伪造依赖状态。
- 一次 Chrome smoke 在新终端卡片加入后因测试选择器匹配两个“NARS 终端”链接而报 `strict mode violation`，属于测试选择器歧义；已改 `exact: true`。20 TPS 更改后旧测试又错误预期 50 RPS，实际标题正确显示 200 RPS，已修订断言。最终 Chrome smoke 退出码 0，原始 `test-results/browser-smoke-target20-20261003.log` SHA-256 `F61B9B86C206FE1BC6EF6EB970077CEBA6977996076A9C286C2A3712F40BF2C1`；它是功能 smoke，不证明 20 TPS 实际达成。
- Demo `npm run check` 当前批次退出码 0，TypeScript/Astro、36 项单测、静态构建与产物检查通过，原始 `test-results/demo-check-batch-20261003.log` SHA-256 `1AAF1DF1CF849C2F595EACEB694FBC9A17CBFE7B43607DA2E48C65BD8A3B2A2D`。构建中的核心绑定为 `fc11db4`，与受保护核心生产 `src` 树相同；Core 后续文档提交会改变元数据，需要最终重建。
- 核心 TS-only M2 在 v1.0.5 发行候选上 `512 passed / 2 skipped / 0 failed`，原始 `reports/evidence/v1.0.5-ts-only-m2-20261003.tap`；Java M2 和 M1′ 复用的受保护生产 `src` 树哈希 `a36ce31778f25e74340fe4406847bacd7bb3c949`，不能写成新提交上重新跑过。

## 当前下一步

044 入口与终端设计批次可提交，但 045 内部经验、046 Grid、047 2048、048 Pong 模式、049 Shot 仍须实现。接下来按共享多 Worker/经验观察合同统筹这些环境，避免同一问题在 Pong/Shot 各写一套；先为 Grid/2048 写纯世界合同，再接 Worker。最终在一个冻结版本上跑完整 Demo/核心发行门；所有未实现项持续标“尚未实现”。
