# niigata-data-viz

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

桥上飞叶为**一阵连续增强、向右下飘落的风**：逐渐增多、加速，跨入鸟居后自然退场，不再上扬、分两阵或中途留白。2.2 秒之后两方案共用同一动画；林中神社景别、缆车、看海结尾、全部镜头时间与 25.2 秒总长保持不变。交通补充小字为“至弥彦站 换乘等待另计”。

检查（Node 22+，本机需有 Chrome/Chromium）：

```sh
node viz/tools/check-yahiko-v11-refined.cjs
```

默认使用 macOS Chrome 或 `/usr/bin/chromium`；其他位置通过 `BROWSER_EXE` 指定。检查使用 headless 浏览器与独立临时配置，不操作用户鼠标键盘或连接日常浏览器。可通过 `PREVIOUS_HTML` 指向前一版 HTML，额外检查 2.2 秒后 14 个采样画面不变，并生成 A 的修改前后对照。