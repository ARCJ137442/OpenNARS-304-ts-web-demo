# Demo Lab 扩展批次计划

状态：验收完成，待提交
基线：现有五个感知运动 demo、Microworld、首页导航、NARS Worker、19 项模型测试和浏览器 smoke 已通过。
当前 web-demo 历史基线提交：160513e5d110135e524de56e7f6492c88a84973d；本批次改动尚未提交
当前 OpenNARS-304-ts 源码基线：835202318fee68d34fb8c91ed27396cfd461c5b5

## 批次目标

新增四个高价值演示：

1. TicTacToe：复合棋盘状态、多步目标、胜负反馈和自定义操作
2. Shot：差分感知、射击/规避、多操作序列和实时奖励
3. Grid2D TestChamber：导航、拾取、激活/停用、空间状态
4. FighterPlane：2D 飞机、敌机、边界、感知、攻击和惩罚
5. Echo Relay（原创）：部分可观测迷宫、探测脉冲、回声、有限能量与认知地图

Signal Garden、Tidal Commons、Split-Signal Workshop 和 Wayfinding Window 保留在原创提案中，本批次只实现 Echo Relay，以控制交付范围。

实现职责由一个新 Demo 模型层 Agent 统一负责，避免把同一适配合同拆成四个互不协调的实现。主 Agent 负责共享入口、Worker、页面、验收和文档。

## 共同合同

- 所有目标必须是可解析的复合目标，形如 <{SELF} --> [property]>! :|: 或更丰富的复合时序项。禁止裸 good!、s0!、G! 作为唯一目标。
- 所有感知必须明确主体、属性、时刻或可解释的离散桶。禁止直接搬运 ONA 专用 |->、宏或单原子目标。
- 操作必须在 Worker 中注册，并以 EXE/operation 事件证明实际执行。
- 环境反馈必须在下一步进入 NARS。
- 模型必须是纯 TypeScript、给定 seed 可复现、可单测，不依赖 DOM、Canvas 或 Worker。
- 每个 demo 必须提供来源、许可证、适配说明和与原始语义的差异。
- 首页只能运行轻量 Canvas 预览，不创建 NARS Worker。

## 执行顺序

    研究与规格冻结
          |
          v
    四个环境模型 Agent 并行实现
          |
          +--> TicTacToe
          +--> Shot
          +--> Grid2D TestChamber
          +--> FighterPlane
          +--> Echo Relay
          |
          v
    主 Agent 审核 Narsese 合同与模型测试
          |
          v
    主 Agent 串行整合共享类型、Worker、目录和页面
          |
          v
    typecheck -> model tests -> build -> browser smoke -> mobile

Agent 只拥有自己的环境模型与测试文件，不修改共享类型、models、Worker、目录或页面。主 Agent 在收到模型后统一接入。

## 出口

### P0 研究与规格

- [x] 原始状态、动作、目标、反馈和 ONA 特有接口已记录
- [x] 每个 demo 有 OpenNARS 3.0.4 复合 Narsese 方案
- [x] 许可证和素材策略已记录

### P1 模型

- [x] 五个模型可独立创建、推进、复位
- [x] 每个模型有初始状态、感知、目标、动作、反馈、边界测试
- [x] 所有目标通过复合目标合同测试
- [x] 没有 ONA 单原子目标或宏泄漏

### P2 整合

- [x] DemoId、状态联合、定义、工厂和分派完整
- [x] Worker 操作注册和事件日志完整
- [x] 目录、预览、来源折叠和手动控制完整
- [x] FPS、概念袋、任务袋和内存能力边界可观察

### P3 验收

- [x] npm run typecheck
- [x] npm test，24/24
- [x] npm run build
- [x] npm run check
- [x] npm run test:browser，9 个游戏 + Microworld
- [x] 现有五个 demo 无回归
- [x] 新四个指定 demo 和 Echo Relay 均能在线、推进、暂停、单步、重置并显示 EXE/反馈
- [x] 首页不启动 Worker，移动端无横向溢出

浏览器 smoke 输出：

    {"ok":true,"games":9,"microworld":true,"indexCanvas":true,"homeWorkers":0,"pageErrors":0}

Tidal Commons、Split-Signal Workshop 与 Wayfinding Window 尚未实现，Git 提交和 Pages 发布也尚未执行。

## 资源边界

- 单个环境步只提交一个 Worker 消息，不在动画帧内运行 NARS。
- 诊断只读取 Bag.size() 与公开容量，不遍历概念内容。
- Canvas 预览不启动推理器，不加载核心 NARS bundle。
- FighterPlane 使用项目自制 Canvas 图形。

## 披露

规划、整合、验收和文档由主 Agent 负责。实现 Agent 以 gpt-6-sol medium 执行独立模型编码。最终文档披露 GPT-6 Sol High 主 Agent 与 GPT-6 Sol Medium 子 Agent 协作完成。
