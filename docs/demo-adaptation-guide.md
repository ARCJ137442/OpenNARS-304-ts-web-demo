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

部分环境还预置了条件操作规则。例如 Hunt 的“球在右边”与 `^right` 操作共同指向 `good` 目标。规则是实验者给 NARS 的起点知识；NARS 在当前感知和目标下决定是否执行，并把世界反馈带回推理器。规则旁的“预置知识”说明可在演示页的来源折叠区查看。不能把按预置规则执行操作写成“从零学出了规则”。

CartPole 也说明反馈时机的重要性：如果杆一开始直立，就在**每个**世界刻向 NARS 提交 `good` 判断，同时又提交 `good` 目标，目标容易被视为已经满足。现行适配将左右倾斜作为相对感知，让左右操作施加固定方向的力矩；只有操作后杆更靠近直立，才把 `good` 作为行动结果送回。世界直立状态仍由环境独立计算。这个改变同时调整了 Demo 的感知、反馈和物理含义，不能当作推理核心自身的性能优化。

五个扩展环境采用相同的状态事件节奏：前 5 刻完整提交感知和目标，此后变化立即提交，未变化的状态每 5 刻刷新一次；操作后的结果反馈始终逐条提交。这避免把静止棋盘或未变的相对方位误当成每刻都发生的新事件。它**改变了 Demo 的输入时序**，属于具身接口设计，不是 NARS 核心的同语义加速。来源折叠区会说明这一点；需要比较学习效果时，应与原始逐刻输入对照。

## 如何验证操作与学习

1. 打开演示，先确认“NARS 在线”，并查看来源折叠区是否声明了预置规则。
2. 把 Babble 调到 0，观察推理记录中的 EXE 与“来源：NARS”。这证明操作算子执行了操作；只有随机 BABBLE 或手动按钮不算。
3. 暂停后单步，核对环境刻、NAR 时钟、操作改变的世界状态，以及下一次输入中的结果反馈。
4. 若要检验**学习**而非“能按先验执行”，还要观察新的感知和反馈是否改变后续选择，并与关闭先验、改变 seed 的实验对照。一次 EXE 或概念袋增长本身都不足以证明学习。

目前 BandRobot 已在 babble 关闭时由 NARS 自主移动，但固定实验尚未完成整个抓取—搬运—交付链。Microworld 的 seed19“示例知识”已在真实浏览器触发非 babble `^Forward`；同配置“空白探索”没有触发，因此示例知识证明的是**有先验时的目标推理和操作执行**，不是从零学习。示例模式 30 秒末窗仍低于 20 TPS。各项限制以当前 [实验记录](probes/20261003-embodied-operation-adaptation.md)为准。

首页只负责导航和轻量 Canvas 预览，不启动 NARS Worker。进入演示页后才会创建推理器。

## 来源边界

- Microworld 与 NARS Pong 的源代码来自 OpenNARS Lab，GPL-3.0-or-later。
- Alien、BandRobot、CartPole、Hunt 的环境灵感来自 NARust-o/ONA，保留 MIT/Apache-2.0 与 ONA attribution；Narsese 已按 OpenNARS 3.0.4 重新适配。
- 2016 OpenNARS 实现论文对应 v1.7.0，只用于机制背景。3.0.4 版本事实来自 [Core v3.0.4 release](https://github.com/opennars/opennars/releases/tag/v3.0.4)、[Lab v3.0.4 release](https://github.com/opennars/opennars-lab/releases/tag/v3.0.4) 和固定 tag 的 [Core README](https://github.com/opennars/opennars/blob/v3.0.4/README.md)。
