# Demo 适配说明

## 给使用者的一句话

这些演示看起来像游戏，实际展示的是同一条链：

    感知 -> 目标 -> NARS 推理 -> 操作 -> 世界反馈 -> 新感知

ONA/NARust-o 的原始例子使用了适合它们自身接口的短词项。OpenNARS 3.0.4 TS 需要更明确的主体、属性和事件结构，所以这里的 Narsese 会有意不同。

## 为什么界面里的目标更长

OpenNARS 不把一个孤零零的 good! 当成稳定的感知运动目标。工作台会把它写成：

    <{SELF} --> [good]>! :|:

这句话可以读成“主体 SELF 希望处于 good 状态”。同理，动作结果会写成：

    <{SELF} --> [hit]>. :|:

这让 NARS 能把“我看见什么”“我想要什么”“我做了什么”“结果怎样”放进同一个概念网络。

## 如何看一个 demo 是否真的在学习

1. 打开一个演示，先看右侧 NARS 在线。
2. 看活动日志里是否出现 EXE，而不是只有 BABBLE 或按钮输入。
3. 展开 运行诊断，看概念袋是否增加，任务袋是否有输入/操作记录。
4. 暂停后单步，观察环境步、NAR 时钟和反馈是否一起变化。
5. 观察同一种感知再次出现时，NARS 是否持续产生可执行操作；这比单次命中更能说明动作结果被重新输入并参与后续推理。

首页只负责导航和轻量 Canvas 预览，不启动 NARS Worker。进入演示页后才会创建推理器。

## 来源边界

- Microworld 与 NARS Pong 的源代码来自 OpenNARS Lab，GPL-3.0-or-later。
- Alien、BandRobot、CartPole、Hunt 的环境灵感来自 NARust-o/ONA，保留 MIT/Apache-2.0 与 ONA attribution；Narsese 已按 OpenNARS 3.0.4 重新适配。
- 2016 OpenNARS 实现论文对应 v1.7.0，只用于机制背景。3.0.4 版本事实来自 [Core v3.0.4 release](https://github.com/opennars/opennars/releases/tag/v3.0.4)、[Lab v3.0.4 release](https://github.com/opennars/opennars-lab/releases/tag/v3.0.4) 和固定 tag 的 [Core README](https://github.com/opennars/opennars/blob/v3.0.4/README.md)。
