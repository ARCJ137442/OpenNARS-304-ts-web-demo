# 2026-10-05 后续批示备忘

## 已确认的边界

- Shot 的 NARS 长期行为等价与记忆克隆等价暂不作为当前总体目标的阻塞条件，继续在公开说明中标为未证明实验边界。
- Microworld 有操作场景持续 20 TPS 未达成；重复低收益优化后不再启动新的核心性能候选，这一性能差额不阻塞当前门禁收口。
- 公开开源审查尽量自动完成；GitHub 设置、历史资产授权和最终可见性仍需仓库所有者人工确认。

## 本轮 Shot 适配进展

- 相对接口使用九宫格感知：`left_ahead`、`mid_ahead`、`right_ahead`、`left_mid`、`mid_mid`、`right_mid`、`left_back`、`mid_back`、`right_back`。
- 感知按 NARust-o 语义差分输入；首个观察、目标/朝向变化立即输入，静止时维持输入，移动且扇区未变时不重复输入。
- 相对模式使用 OpenNARS 可解析的 `^Forward`，世界层仍归一化为 `forward`；复合目标和操作规则保持 OpenNARS 3.0.4 兼容。
- 进化克隆深复制可变速度状态，并重置新 Worker 的感知缓存。

## 验证

- Demo `npm test`：76/76 passed。
- Demo `npm run typecheck`：通过。
- 生产子路径浏览器 smoke：10 个普通 Demo、Pong 9 模式、Shot 7 模式、Microworld、Grid、2048 均通过，页面错误 0。
