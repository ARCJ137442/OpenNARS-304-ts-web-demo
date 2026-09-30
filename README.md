# OpenNARS 3.0.4 TypeScript Demo Lab

[English](README.en.md)

这是 https://arcj137442.github.io/opennars-304-ts-lab/ 的独立源码项目。GitHub Pages 仓库中的 opennars-304-ts-lab/ 只保存本项目生成的部署产物。

## Demo Lab

入口页面索引 Microworld、Pong、Alien、BandRobot、CartPole、Hunt、TicTacToe、Shot、Grid2D TestChamber 与 FighterPlane。每个演示使用同一套 NARS Worker 控制与日志界面，但保留独立、可测试的环境模型。项目使用 Astro 生成静态 HTML/CSS/JS，浏览器不加载 Astro runtime，也不需要后端。

克隆后先运行：

    npm ci
    npm run dev

打开终端输出的本地 URL。运行完整类型、Astro、模型测试和静态构建检查：

    npm run check

可直接把 dist/ 上传到任何静态主机。GitHub Pages 同步命令只复制生成目录内容：

    npm run deploy:pages -- "C:\\path\\to\\ARCJ137442.github.io"

架构边界、添加新 demo 的步骤、模型测试合同和浏览器验收项见 docs/maintainer-guide.md。
OpenNARS 3.0.4 的机制边界与 ONA demo 适配理由见 [机制分析](docs/opennars-304-mechanism-analysis.md) 和 [Demo 适配说明](docs/demo-adaptation-guide.md)。
指定 demo 的扩展计划和原创候选见 [扩展计划](docs/demo-expansion-plan.md)、[候选审阅](docs/demo-candidate-survey.md) 与 [原创提案](docs/original-demo-proposals.md)。
项目统一术语见 [NARS 与 Narsese 术语表](docs/terminology.md)。
演示页的性能 HUD 严格区分 `FPS`（画面刷新）、`TPS`（世界刻）和 `RPS`（NARS 推理周期）；“性能诊断”面板默认折叠，可切换同步/异步节奏。实现边界见 [运行节奏计划](docs/demo-runtime-modes-plan.md)。

### 源码入口

- src/pages/：Astro 静态路由。
- src/components/DemoCard.astro：目录卡片。
- src/data/demo-catalog.ts：统一演示注册表与页面 ID 守卫。
- src/games/models.ts：纯 TypeScript 环境模型、感知/反馈合同。
- src/demo.ts 与 src/demo-worker.ts：共享游戏工作台与 NARS Worker 控制。
- src/microworld/simulation.ts：Microworld 独立模拟合同。
- scripts/prepare-site.mjs：准备静态资源和独立终端/Microworld 页面。
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

`npm run build` 使用 Astro 输出静态目录/演示页，并复制终端、Microworld、Workers、精灵与许可文本到 `dist/`。只修改网页壳时不需要重新构建 OpenNARS Worker。需要 Node.js 22.19 或更新版本。

## 重新构建 Worker

默认从相邻的 `OpenNARS-304-ts` 读取源码；也可以指定干净工作区：

    $env:OPENNARS_TS_ROOT = "C:\path\to\clean\OpenNARS-304-ts"
    $env:OPENNARS_NODE_MODULES = "C:\path\to\OpenNARS-304-ts\node_modules"
    npm run build:worker

构建脚本拒绝带有已跟踪修改的 OpenNARS 工作区。生成的 `public/build-meta.json` 记录库版本、源码 commit 和 Worker 构建时间。

## 发布到 GitHub Pages

    npm run deploy:pages -- "H:\A137442\Develop\WEB\ARCJ137442.github.io"

发布命令会先构建并检查，然后把 dist/ 完整同步到 ARCJ137442.github.io/opennars-304-ts-lab/，包括 Astro 的 _astro/ 静态资源目录。检查站点仓库差异后，在站点仓库提交并推送即可部署。
