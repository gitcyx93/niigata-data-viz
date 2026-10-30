# niigata-data-viz

## 弥彦 V11 精修

本分支 `gpt/yahiko-v11-refine` 从原 V11 `d2d2c18` 分出，原版保留。

- **新版 HTML**：[yahiko-v11-refined.html](viz/autumn/yahiko-v11-refined.html)
- **原 V11**：[yahiko-reviewed-v11.html](viz/autumn/yahiko-reviewed-v11.html)
- **修改前后对照图**：[comparison.png](reference/yahiko-v11-refined/comparison.png)
- **改动与检查记录**：[yahiko-v11-refined.md](stories/yahiko-v11-refined.md)

HTML 下载后可直接打开，字体与动画均内嵌。GitHub 文件页展示的是源码，不是动画预览。

保留地图、林中神社景别、看海结尾、全部镜头时间与 25.2 秒总长；精修杉林画法和升起时的前后视差，并明确交通终点。最新按用户反馈将桥上飞叶改为**一阵连续增强的风：逐渐增多、逐渐加速，跨入鸟居后自然退场**，不再使用两阵风或中途留白。交通补充小字统一为“至弥彦站 换乘等待另计”。

检查（Node 22+，本机需有 Chrome/Chromium）：

```sh
node viz/tools/check-yahiko-v11-refined.cjs
```

默认使用 macOS Chrome 或 `/usr/bin/chromium`；其他位置通过 `BROWSER_EXE` 指定。