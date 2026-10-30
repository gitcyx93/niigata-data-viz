# niigata-data-viz

## 当前试作：汤泽滑雪三维重做

分支 `gpt/yuzawa-ski-3d`，基线 `8184a23`。仅替换 `viz/winter/yuzawa-yukiguni.html` 的3.3–8.7秒滑雪场景，使用内嵌Three.js绘制立体人物、双板、地形和雪树。文字、其他镜头、动作阶段时序和20秒循环不改。HTML无需联网，推荐开启硬件加速的Chrome/Edge；WebGL2不可用时回退旧滑雪效果。

- [制作与自检记录](stories/yuzawa-ski3d.md)
- [修改前后对照](reference/yuzawa-ski3d/comparison.png) · [滑雪连续采样](reference/yuzawa-ski3d/ski-motion.png)
- [检查结果](reference/yuzawa-ski3d/validation.json)
- 后台检查：`node viz/tools/check-yuzawa-ski3d.cjs`（用 `BROWSER_EXE` 指定Chrome）。

## 当前弥彦：新文案 + 21.4秒

当前整合分支：`claude/adoring-darwin-982h4c`。保留 `e9b561a` 的弥彦/高田新稿和 `032bf6e` 的汤泽画面修改。

弥彦鸟居延长至3.2秒，看海收尾缩至6秒，全片21.4秒。其他镜头内容不变，新稿不删改，只同步出现时间。[时间表与检查说明](stories/yahiko-timing-21s.md)。三种译版尚未生成。

## 汤泽画面精修（当前分支）

分支 `gpt/yuzawa-visual-refine`，从 `a4c0381` 新建。只修改 `viz/winter/yuzawa-yukiguni.html` 的画面：滑雪环境提亮、雪痕与飞雪细化、温泉近景背景和持杯关系改善。

**文字全部不改，20秒循环、镜头时间、滑雪轨迹和回隧道运镜保留。** 其他三季未修改。

- [画面精修记录](stories/yuzawa-visual-refine.md)
- [修改前后对照](reference/yuzawa-visual-refine/comparison.png) · [关键帧](reference/yuzawa-visual-refine/keyframes.png)
- [验证结果](reference/yuzawa-visual-refine/validation.json)
- 后台检查：`node viz/tools/check-yuzawa-visual.cjs`，通过 `BROWSER_EXE` 指定Chrome。

## 高田夜樱：仅去掉重复全景

`viz/spring/takada-yozakura-v2.html` **恢复并保留原 13–20 秒的全景花吹雪/花筏高潮**；仅将 0–5 秒换成樱花框住三重橹的建筑近景，把完整护城河全景留到后半段。极乐桥、仰看樱花、文案、花瓣算法和 20 秒总长保留；19.9 秒不提前重现封面大字。之前的水面近景替换方案已撤回。

- [修改前后对照](reference/takada-dedup/comparison.png) · [检查记录](reference/takada-dedup/validation.json) · [制作记录](stories/takada.md)
- 后台验证：`node viz/tools/check-takada-dedup.cjs`（用 `BROWSER_EXE` 指定 Chrome）。

## 弥彦 V11 精修

本分支 `gpt/yahiko-v11-refine` 从原 V11 `d2d2c18` 分出，原版保留。

- **新版 HTML**：[yahiko-v11-refined.html](viz/autumn/yahiko-v11-refined.html)
- **A 空间关系修正前后**：[A-layout-comparison.png](reference/yahiko-v11-refined/A-layout-comparison.png)
- **A 日夜切镜**：[A-night-cut.png](reference/yahiko-v11-refined/A-night-cut.png)
- **开场 A/C 对照图**：[openings.png](reference/yahiko-v11-refined/openings.png)
- **原 V11**：[yahiko-reviewed-v11.html](viz/autumn/yahiko-reviewed-v11.html)
- **修改前后对照图**：[comparison.png](reference/yahiko-v11-refined/comparison.png)
- **改动与检查记录**：[yahiko-v11-refined.md](stories/yahiko-v11-refined.md)

HTML 下载后可直接打开，字体与动画均内嵌。GitHub 文件页展示的是源码，不是动画预览。

已选定 **A · 风景导览**；**C · 山海全景** 仅保留作历史对照。A 当前已将远海与公园水面分开，补齐桥台岸坡，将神社与索道设施分区，并让桥的主要轮廓在 2.2 秒日夜切镜时对齐，不再叠出两座桥。两者均为风格化构图，不是精确导航图或同一实景机位复刻。

页面按钮可切换历史对照；切换回到第 0 秒，保留当前播放/暂停状态，也可用 `?opening=C` 直接打开 C。

桥上飞叶为**一阵连续增强、向右下飘落的风**：逐渐增多、加速，跨入鸟居后自然退场，不再上扬、分两阵或中途留白。2.2 秒之后两方案共用同一动画。当前鸟居5.6–8.8秒、神社8.8–12.2秒、缆车12.2–15.4秒、日落15.4–21.4秒。文字采用e9b561a新稿，末三句旁白在压缩后的看海段内完整保留，阅读节奏比原25.2秒版紧。

检查（Node 22+，本机需有 Chrome/Chromium）：

```sh
node viz/tools/check-yahiko-timing.cjs
```

默认使用 macOS Chrome 或 `/usr/bin/chromium`；其他位置通过 `BROWSER_EXE` 指定。检查使用 headless 浏览器与独立临时配置，不操作用户鼠标键盘或连接日常浏览器。当前检查以 `b8d9dc9` 为基线，比对17个源时间场景帧、完整文案和21.4秒播放控制；旧的25.2秒检查脚本仅适用于历史版本。