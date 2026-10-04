# OpenNARS 3.0.4 TypeScript Demo Lab

<img src="public/assets/opennars-ts-logo.svg" width="260" alt="OpenNARS TypeScript logo" />

[English](README.en.md)

这是 https://arcj137442.github.io/opennars-304-ts-lab/ 的独立源码项目。GitHub Pages 仓库中的 opennars-304-ts-lab/ 只保存本项目生成的部署产物。

## Demo Lab

入口页面索引浏览器 NARS 终端、Microworld、Pong、Alien、BandRobot、CartPole、Hunt、TicTacToe、Shot、Grid2D TestChamber、FighterPlane 与 Echo Relay。普通游戏共用 NARS Worker 控制与日志界面，Microworld 使用独立的原版场景适配。项目使用 Astro 生成静态 HTML/CSS/JS，浏览器不加载 Astro runtime，也不需要后端。BandRobot 仍是多步任务实验，固定场景尚未证明自主完成整段交付。

Microworld 普通入口默认使用随机 seed 和“空白探索”，每次打开都会生成新的实验起点。需要复现实验或观察示例知识时，使用 `microworld.html?seed=19&knowledge=starter`；其中 `seed` 固定世界与 NARS 初始化，`knowledge=starter` 才会启用示例先验。页面的灯泡按钮可切换“示例知识”和“空白探索”；示例模式预置一条前方好食物与前进操作的因果假设，**不代表 NARS 从零学出该规则**。目前示例模式已在真实浏览器发出非 babble 操作，但持续 20 TPS 尚未达成，详见 [适配说明](docs/demo-adaptation-guide.md)。

克隆后先运行：

    npm ci
    npm run dev

打开终端输出的本地 URL。运行完整类型、Astro、模型测试和静态构建检查：

    npm run check

若运行的是静态构建预览（`npm run build` 后执行 `npm run preview`），页面位于项目子路径；CartPole 的本地预览入口是 [http://127.0.0.1:4321/opennars-304-ts-lab/demo.html?game=cartpole](http://127.0.0.1:4321/opennars-304-ts-lab/demo.html?game=cartpole)。直接访问 `/demo.html` 会返回 404。浏览器测试默认使用预览子路径；测试 `npm run dev` 的根路径时，显式设置 `DEMO_BASE_URL=http://127.0.0.1:4321/`。
首页在带尾斜杠和不带尾斜杠的子路径都能加载预览素材并进入终端；`terminal.html` 是 Astro 路由，Worker 只在进入后启动。

可直接把 dist/ 上传到任何静态主机。GitHub Pages 同步命令只复制生成目录内容：

    npm run deploy:pages -- "C:\\path\\to\\ARCJ137442.github.io"

架构边界、添加新 demo 的步骤、模型测试合同和浏览器验收项见 docs/maintainer-guide.md。
OpenNARS 3.0.4 的机制边界与 ONA demo 适配理由见 [机制分析](docs/opennars-304-mechanism-analysis.md) 和 [Demo 适配说明](docs/demo-adaptation-guide.md)。
指定 demo 的扩展计划和原创候选见 [扩展计划](docs/demo-expansion-plan.md)、[候选审阅](docs/demo-candidate-survey.md) 与 [原创提案](docs/original-demo-proposals.md)。
项目统一术语见 [NARS 与 Narsese 术语表](docs/terminology.md)。
发布前的界面原则见 [一图胜千言](docs/design-principle-one-image.md)；Java 3.0.4 Lab Launcher 与 Web Lab 的已实现/规划对应关系见 [功能索引](docs/java-lab-feature-map.md)。
2026-10-04 的后续功能状态见 [当前状态](https://github.com/ARCJ137442/OpenNARS-304-ts/blob/main/docs/current-status.md) 与 [Demo 需求总账](docs/probes/20261003-demo-batch-requirements.md)；主线已包含 Grid、NARS×2048、Pong 和 Shot 基础页面，完整 Shot 淘汰/进化仍在进行中。公网入口为 <https://arcj137442.github.io/opennars-304-ts-lab/>。
演示页的性能 HUD 严格区分 `FPS`（画面刷新）、`TPS`（世界刻）和 `RPS`（NARS 推理周期）；“性能诊断”面板默认折叠，可切换同步/异步节奏。实现边界见 [运行节奏计划](docs/demo-runtime-modes-plan.md)。
所有现有 Demo 的配置目标现在至少为 20 TPS；这不代表实际运行速率达到 20。同步场景尤其要看 HUD 的实际/目标比例和 RPS，已知持续瓶颈见 [实验记录](docs/probes/20261003-embodied-operation-adaptation.md)。
HUD 的 RPS 统计最近约一秒墙钟内**实际完成**的周期，推理无进展时归零；速率条以目标 TPS × 每刻周期数为参照，不把单次推理的活跃速度写成整场吞吐。
五个扩展环境使用“变化即报、稳定状态每五刻刷新”的输入节奏，结果反馈仍逐次提交；这是明确的 Demo 行为适配，不作为推理核心的同语义性能提升计算。

### 源码入口

- src/pages/：Astro 静态路由。
- src/components/DemoCard.astro：目录卡片。
- src/data/demo-catalog.ts：统一演示注册表与页面 ID 守卫。
- src/games/models.ts：纯 TypeScript 环境模型、感知/反馈合同。
- src/demo.ts 与 src/demo-worker.ts：共享游戏工作台与 NARS Worker 控制。
- src/microworld/simulation.ts：Microworld 独立模拟合同。
- src/microworld/nars-priors.ts：可选的 Microworld 示例起点知识。
- src/pages/terminal.astro 与 src/app.js：Astro 终端路由和 Worker 交互。
- scripts/prepare-site.mjs：准备 Microworld 的静态资源与许可文本。
- scripts/check-build.mjs：发布目录完整性检查。

## 交互合同

- `Enter` 发送当前输入；
- `Shift+Enter` 插入换行，可一次粘贴或编辑多条 Narsese 与 `:cycles` 命令；
- 批量输入在同一个 Worker 消息中按行顺序执行；
- 推理完成后输入框会重新获得焦点；
- 多行输入及多行输出均按原换行显示；
- 在多行文本的首行或末行使用 `↑` / `↓` 召回历史。
- `OUTPUT VOLUME` 通过 OpenNARS 原生命令调节 `0..100` 的派生任务输出门槛；数值越低，`OUT` 越少，Answer 等独立事件通道不受影响。
- Quick Input 内置来自 BabelNAR `test_simple_operation.nal` 的 NAL-8 `^left` 操作样本，并转换为本终端原生的 `:volume`、`:cycles` 命令。

## 构建与测试

    npm ci
    npm test
    npm run check

`npm run build` 使用 Astro 输出目录、终端与演示页，并准备 Microworld、Workers、精灵与许可文本到 `dist/`。构建脚本会核对核心源码提交并重建 Worker。需要 Node.js 22.19 或更新版本。

## 重新构建 Worker

默认从相邻的 `OpenNARS-304-ts` 读取源码；也可以指定干净工作区：

    $env:OPENNARS_TS_ROOT = "C:\path\to\clean\OpenNARS-304-ts"
    $env:OPENNARS_NODE_MODULES = "C:\path\to\OpenNARS-304-ts\node_modules"
    npm run build:worker

构建脚本拒绝带有已跟踪修改的 OpenNARS 工作区。生成的 `public/build-meta.json` 记录库版本、源码 commit 和 Worker 构建时间。

## 发布到 GitHub Pages

    npm run deploy:pages -- "H:\A137442\Develop\WEB\ARCJ137442.github.io"

发布命令会先构建并检查，然后把 dist/ 完整同步到 ARCJ137442.github.io/opennars-304-ts-lab/，包括 Astro 的 _astro/ 静态资源目录。检查站点仓库差异后，在站点仓库提交并推送即可部署。
