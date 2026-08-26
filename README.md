# OpenNARS 3.0.4 TypeScript Web Terminal

这是 `https://arcj137442.github.io/opennars-304-ts/` 的独立源码项目。GitHub Pages 仓库中的 `opennars-304-ts/` 只保存本项目生成的部署产物。

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

    npm install
    npm test
    npm run check

`npm run build` 将 `src/` 与已生成的 `public/nars-worker.js` 组装到 `dist/`。因此只修改网页壳时，不需要重新构建 OpenNARS Worker。

## 重新构建 Worker

默认从相邻的 `OpenNARS-304-ts` 读取源码；也可以指定干净工作区：

    $env:OPENNARS_TS_ROOT = "C:\path\to\clean\OpenNARS-304-ts"
    $env:OPENNARS_NODE_MODULES = "C:\path\to\OpenNARS-304-ts\node_modules"
    npm run build:worker

构建脚本拒绝带有已跟踪修改的 OpenNARS 工作区。生成的 `public/build-meta.json` 记录库版本、源码 commit 和 Worker 构建时间。

## 发布到 GitHub Pages

    npm run deploy:pages -- "H:\A137442\Develop\WEB\ARCJ137442.github.io"

发布命令会先构建并检查，然后只同步 `ARCJ137442.github.io/opennars-304-ts/` 中的七个已知文件。检查站点仓库差异后，在站点仓库提交并推送即可部署。
