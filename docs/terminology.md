# NARS 与 Narsese 术语表

本表以《智能论 - 适应的逻辑》为理论语境，以项目 Narsese.rs 的结构定义和 OpenNARS 3.0.4 源码为实现语境。代码标识符保持英文原名，中文说明使用下列固定译法。

| English | 固定中文 | 使用边界 |
| --- | --- | --- |
| Term | 词项 | Narsese 的原子词项、复合词项和陈述的上位结构，不译作“术语” |
| Compound term | 复合词项 | 由连接词和多个词项组成的结构 |
| Statement | 陈述 | 词项之间的主项、系词、谓项结构 |
| Sentence | 语句 | 陈述加标点、时间戳和真值 |
| Task | 任务 | 语句加预算值，进入 NARS 处理流程 |
| Judgement | 判断 | 对陈述给出真值的语句类型 |
| Goal | 目标 | NARS 希望实现的语句类型 |
| Question | 问题 | 请求 NARS 给出答案的语句类型 |
| Quest | 请求 | 请求系统确认或否定的语句类型 |
| Belief | 信念 | NARS 对判断任务的内部信念 |
| Desire | 欲望值 / 欲望 | 目标在决策中的期望与强度，不把 Goal 译成“欲望” |
| Truth value | 真值 | 由 frequency 和 confidence 组成 |
| Frequency | 频率 | 真值的正向比例成分 |
| Confidence | 信度 | 真值的证据可靠程度，避免和一般 UI 的“置信度”混用 |
| Expectation | 期望值 | 用于排序和决策的派生量，不等同于信度 |
| Budget | 预算值 | priority、durability、quality 的资源控制元数据 |
| Stamp | 时间戳 | 记录时间与证据来源的元数据 |
| Concept | 概念 | 以词项为中心连接任务、信念、任务链和词项链的记忆单元 |
| Bag | Bag / 袋 | 按优先级选择和遗忘的资源容器，中文说明用“概念袋”“任务袋” |
| Inference | 推理 | 从任务和信念派生新任务的过程 |
| Operation | 操作 | Narsese 中可执行的操作项，例如 ^Left |
| Operator | 操作符 | 注册并执行 Operation 的实现；不要在产品文案中只写“算子” |
| Action | 行动 / 动作 | 环境层发生的动作，由 NARS 操作触发 |
| Event | 事件 | 带时间的可观察输入或操作执行结果 |
| Experience | 经验 | 行动、感知和结果积累后形成的行为依据 |
| Perception | 感知 | 环境状态被编码为 Narsese 输入的过程 |
| Sensation | 感觉 | 原始感知信号；面向用户的面板可统一写“感知输入” |
| Sensor | 传感器 / 感知器 | 产生或编码感觉输入的环境组件 |
| Sensorimotor | 感知运动 | 感知、目标、推理、操作和环境反馈的闭环 |

理论依据：

- Narsese.rs README 与源码把 Narsese 结构明确分为词项、陈述、语句、任务，并将操作符列为词项结构的一部分。
- 《智能论》将智能系统的核心关系表述为“目标、行动、知识”：行动是系统可控制的事件，知识联系目标与行动，经验塑造后续行为。
- 因此本项目严格区分 NARS 的 Operation“操作”和环境的 Action“行动/动作”。Operator 固定译为“操作符”，避免“算子插件”这种中英混杂的产品文案。
