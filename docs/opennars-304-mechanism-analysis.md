# OpenNARS 3.0.4 机制与感知运动适配记录

本文回答一个具体问题：为什么 NARust-o/ONA 的 demo 不能把原始 Narsese 原封不动搬进 OpenNARS 3.0.4 TS。

本文的版本证据分三层：

1. 3.0.4 一手版本资料：官方 Core v3.0.4 release、Lab v3.0.4 release，以及固定在 v3.0.4 tag 的 Core README。
2. 当前实现证据：本仓库与 OpenNARS-304-ts 的实际源码、测试和浏览器 smoke。
3. 历史机制背景：Hammer、Lofthouse、Wang 的 2016 OpenNARS 论文。论文明确写的是 OpenNARS v1.7.0，因此不能冒充 3.0.4 专文。

## 版本边界

| 资料 | 可以证明什么 | 不能证明什么 |
| --- | --- | --- |
| [Core v3.0.4 release](https://github.com/opennars/opennars/releases/tag/v3.0.4) | 2020-01-26 的稳定版本、global buffer、multistep metrics、^system、NarNode raw packets 与若干反馈修复 | 不是独立架构论文 |
| [Lab v3.0.4 release](https://github.com/opennars/opennars-lab/releases/tag/v3.0.4) | 同版本 Lab 与 Microworld、Pong、Test Chamber 等入口 | 不是 TS 实现规范 |
| [Core README at v3.0.4](https://github.com/opennars/opennars/blob/v3.0.4/README.md) | 固定 tag 的架构概览：memory + inference engine + control；五步工作周期；Lab 入口 | 没有逐条解释每个 demo 的语义 |
| [OpenNARS implementation paper](https://www.cis.temple.edu/~pwang/Publication/OpenNARS.pdf) | NARS 的 memory、Curve Bag、temporal chaining、Decision、operation-executed feedback 历史机制 | 不是 3.0.4 专文，正文明确是 v1.7.0 |

本地论文 OpenNARS.pdf 的 SHA-256 是 1DBC6C11714257EB6A6A93DC351DE846A66086F379A586A323F1CB148B583892，10 页，创建于 2016-05-12。它适合做机制背景引用，不应被写成“OpenNARS 3.0.4 架构论文”。

## 从世界到 Narsese

一个感知运动 demo 不是把变量名拼进字符串，而是经过四层转换：

    世界状态
      |
      v
    可观察的离散事件/属性
      |
      v
    带主体、属性、时刻和真值的 Narsese 陈述
      |
      v
    目标进入欲望（desire）表，操作进入 Decision/Operator 路径
      |
      v
    环境执行后把结果作为新的输入事件

Microworld 是当前最可靠的适配样例。它把六个视野通道写成：

    <{0} --> [on]>. :|:

把满足和健康写成主体目标：

    <{SELF} --> [satisfied]>! :|:
    <{SELF} --> [healthy]>! :|:

操作则由 Worker 注册 ^Right、^Left、^Forward，执行时设置动作并关闭同一周期的重复执行。每个环境步提交输入后运行 10 个 cycles；Babble 只作为没有 NARS 操作时的受限探索。食物碰撞产生正/负反馈，反馈进入下一轮推理。

这套结构对应 NAL 二版第 12 章“Operations and Goals as Events”和第 13 章“Sensorimotor and Perception”的思路，也对应历史论文第 8 页的 Decision：满足阈值的 operation goal 执行后，operation was executed 事件重新输入系统，使后续 temporal chaining 能学习动作后果。

## 为什么单原子目标不够

在本项目的 OpenNARS 3.0.4 实测中，下面这种 ONA 风格输入不能作为可靠的目标接口：

    G!
    good!
    s0!

它们缺少稳定的概念主体和属性结构，不能给 OpenNARS 3.0.4 建立与感知、操作相连的概念网络。适配后的目标至少要表达“谁希望什么”：

    <{SELF} --> [good]>! :|:
    <{SELF} --> [shoot]>! :|:
    <{SELF} --> [delivered]>! :|:

动作结果也应使用同样的可观察复合属性：

    <{SELF} --> [hit]>. :|:
    <{SELF} --> [delivered]>. :|:

这里的“复合”不是为了让字符串更长，而是为了让目标、感知和操作共享可连接的概念节点。真正是否能形成操作，仍必须检查 Worker 收到 EXECUTION 事件，而不能仅看按钮或预测字符串。

## 五个搬迁 demo 的适配

| Demo | 世界含义 | OpenNARS 3.0.4 适配 |
| --- | --- | --- |
| Pong | 球相对球拍的位置、击球和漏球 | 位置写成主体属性，目标使用 SELF 的 good，击球反馈进入后续时序学习 |
| Alien | 防守者与目标的相对位置、射击命中 | left/right/center 作为 SELF 属性，shoot 是复合目标，命中反馈为 SELF hit |
| BandRobot | 位置、拾取状态、目标位置、放置成功 | 不使用 ONA 的 |->；改成可解析的离散位置属性与 SELF 的 picked/delivered |
| CartPole | 角度离散桶、左右推力、稳定反馈 | 角度编码成 SELF angleN，稳定目标为 SELF good |
| Hunt | 目标相对玩家的上下左右关系与捕获 | 方向写成 SELF ball_left 等，目标和捕获反馈使用 SELF good |

五个环境共享 Worker 合同，但环境模型仍各自负责“这个属性到底代表什么”。不能把 ONA 里的 good_nar、s0 或裸数字直接当作 OpenNARS 的目标。

## 当前代码溯源

当前 web-demo 工作树基线为：

    835202318fee68d34fb8c91ed27396cfd461c5b5

关键实现：

- src/microworld-worker.ts：Microworld 感知、目标、奖励、10 cycles、Babble 和 ^Right/^Left/^Forward。
- src/games/worlds/*.ts：五个环境的独立状态、Narsese 感知/目标/反馈和动作转移。
- src/games/shared.ts：selfBelief 与 selfGoal 复合词项辅助合同。
- src/diagnostics/reasoner-snapshot.ts：只读取 Bag.size() 的概念袋/任务袋快照。
- test/game-models.test.ts：目标不能退化为单原子词项、BandRobot 不再使用 |-> 的直接合同。
- scripts/browser-smoke.mjs：首页零 Worker、五个游戏 Worker、Microworld、FPS、暂停/单步和移动宽度验证。

## 论文引文与中文释义

以下为本地论文中与本项目最相关的短引文，保留英文原文并给出中文释义。引文来自 v1.7.0 历史实现论文，不能当作 3.0.4 的独立版本承诺。

> “The working process of NARS can be considered as unbounded repetitions of an inference cycle.”

中文释义：NARS 的工作过程可以理解为不断重复的推理周期。每个周期从记忆选择概念和任务，依据相关信念派生新任务，再把参与项和新任务放回相应的 Bag。

> “If the goal task is an operation ... the system executes this operation.”

中文释义：当目标任务指向可执行操作，并且欲望值超过决策阈值时，系统执行该操作。对 Demo 来说，感知、目标、操作和反馈必须处在同一条可连接的概念链上。

> “After the execution, an event, stating that this operation was executed, is input into the system.”

中文释义：操作执行后，系统再次输入一个“操作已经执行”的事件，让后续时序推理学习动作和结果之间的联系。

## 研究资料

- NAL 二版 PDF：本地 H:/A137442/Develop/AGI/2025-07 理论学习/NAL_2nd_241214.pdf，重点是第 7、12、13 章。该文件首页标注 2024-12-14 Second Edition 和限制评论使用，不随项目分发。
- 《智能论 - 适应的逻辑》：本地 H:/A137442/Develop/AGI/ACA/ACA-theory/12-参考/《智能论 - 适应的逻辑》第二稿-240707 - 林嘉濠、吴震宇样式修改版.md。其中目标、行动、知识、复合词项和感知运动接口的说明，用于帮助解释适配理由。
- NAL 与《智能论》是理论学习资料，不替代 3.0.4 源码和可运行测试。
