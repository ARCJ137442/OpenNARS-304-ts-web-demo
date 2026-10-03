# 一图胜千言：OpenNARS Demo Lab 发布前设计规范

本规范来自项目所有者 2026-10-03 的明确设计指令，适用于首页、终端、Microworld 和每个 Demo。目标是在第一次访问时让人**看见世界、操作、推理之间的因果关系**，并让熟练用户逐步获得深度信息。视觉表达必须准确，不得把尚未证明的 NARS 行为包装成已完成。

## 表达优先级

1. 能以熟悉的图标说明动作时，先用图标；首次使用、歧义操作和辅助技术仍有短标签、`title` 或可访问名称。图标不替代必要的错误与安全信息。
2. 能通过点击、悬停、展开、操作后的反馈理解的内容，不长期平铺成说明段落。默认画面只留下当下行动所需的信息；细节进入可发现的纵深层级。
3. 用户通过几次使用就能形成持久认知的提示，初次出现后可收起或仅在需要时再展示；不要每一步重复教育。
4. 随时间变化的 TPS/RPS/FPS、内存、概念增长与操作结果优先用小图、轨迹、色条或空间关系表达，数字作精确读数，表格只用于需要逐项核对的审计视图。
5. 动效只在它能表达时间、方向、因果或状态变化时使用。保留暂停、低功耗与 `prefers-reduced-motion` 路径；慢速 NARS 不应被顺滑画面掩盖。
   - 游戏级反馈可以用于终端和 NARS 控制面板，但每种 FX 必须由真实事件触发：推理进行中、推理完成、NARS 自主操作、babble、获得奖励、代价或异常。不得让常驻装饰动画暗示推理正在发生。
6. 有世界模型或真实素材时，使用预览图、标题图和直接可见的世界对象，不让抽象文字代替演示主体。任何素材缺失都应视为功能故障。
7. 颜色从数据与场景意义出发：感知、目标、操作、反馈、告警和不同世界应可区分。颜色需与形状、位置或文字冗余编码，照顾色觉差异；不可全站一味套同一单调色。

## 项目实施口径

- 首页是导航和静态预览，不启动推理器。一个显眼的 Microworld 场景、清楚的终端入口、各 Demo 的独有动态图形承担解释；不堆叠版本、技术术语和长段销售文案。
- 终端保留可靠的纯文本输入和输出，这是精确阅读 Narsese 的必要形式；用图标处理停止、清空、配置、音量、展开等辅助动作，用结构化时间线与事件颜色区分输入、输出、答案、错误和操作。
- 语义 FX 使用可辨的事件调色板：青绿表示 NARS 自主操作，琥珀表示 babble/探索，嫩绿表示正向结果，珊瑚红表示代价或错误。推理中的扫描只在 Worker 忙碌时运动，完成立即停止；减少动效模式保留边框和文字，不依赖动画传递唯一信息。
- Demo 的主要画面展示世界变化；HUD 同时呈现 FPS、世界 TPS、完成的推理 RPS 与目标差距。内存、概念袋、队列、延迟进入可展开的性能追踪。NARS 操作要能追溯到实际反馈，不以漂亮动效代替有效实验。
- Microworld 的状态、延迟与三个速率各有独立槽位；文字变化只改变自身槽位，不推动相邻 HUD。预期/确认/失望和操作经验若显示，必须读取 NARS 内部真实事件或信念，标明预置、推导、外部 babble 与观察窗口。
- 每个画面选择清楚的重点。文字删除前先问：删除后首次访问者会误解什么？新增图表前先问：它呈现的是实测、设定值还是推断？

## 发布验收

- 在桌面和窄屏各检查首页、终端、Microworld 与至少一个普通 Demo；关键动作可用键盘与屏幕阅读器定位。
- 无尾斜杠、带尾斜杠及 GitHub Pages 公开子路径的素材、链接、Worker 都加载成功；首页的虫子、食物与其他预览对象可见。
- 对照真实运行数据核对颜色、速度条、动效和文案，不得将低 TPS、缺失操作或 BandRobot 未完成交付隐藏在视觉包装里。
- 设计借鉴跨行业的地图、仪表、游戏 HUD 与编辑式索引时，记录所借的是哪种**信息表达机制**，而非照搬外观；优先通过实际用户任务验证是否更易理解。

## English summary

“One image is worth a thousand words” is the project owner's pre-release Demo Lab rule: prefer clear icons, interaction, charts, motion, previews, and meaningful color over persistent explanatory text when they convey the same truth. Preserve labels for ambiguity and accessibility. Reveal detail progressively, keep terminal text where exact Narsese matters, and never let visual polish hide incomplete behavior or measured performance gaps.
