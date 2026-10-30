# niigata-data-viz

## 弥彦 V11 精修

本分支 `gpt/yahiko-v11-refine` 从原 V11 `d2d2c18` 分出，原版保留。

- **新版 HTML**：[yahiko-v11-refined.html](viz/autumn/yahiko-v11-refined.html)
- **开场 A/C 对照图**：[openings.png](reference/yahiko-v11-refined/openings.png)
- **原 V11**：[yahiko-reviewed-v11.html](viz/autumn/yahiko-reviewed-v11.html)
- **修改前后对照图**：[comparison.png](reference/yahiko-v11-refined/comparison.png)
- **改动与检查记录**：[yahiko-v11-refined.md](stories/yahiko-v11-refined.md)

HTML 下载后可直接打开，字体与动画均内嵌。GitHub 文件页展示的是源码，不是动画预览。

开场提供 **A · 风景导览** 与 **C · 山海全景** 两个候选，在页面按钮中切换；切换回到第 0 秒，保留当前播放/暂停状态，也可用 `?opening=C` 直接打开 C。A 以桥为主角交代山海与景点关系，C 用近景红叶、层叠山坡和远海表达全景，两者均为风格化构图，不是精确导航图或同一实景机位复刻。

桥上飞叶为**一阵连续增强、向右下飘落的风**：逐渐增多、加速，跨入鸟居后自然退场，不再上扬、分两阵或中途留白。2.2 秒之后两方案共用同一动画；林中神社景别、缆车、看海结尾、全部镜头时间与 25.2 秒总长保持不变。交通补充小字为“至弥彦站 换乘等待另计”。

检查（Node 22+，本机需有 Chrome/Chromium）：

```sh
node viz/tools/check-yahiko-v11-refined.cjs
```

默认使用 macOS Chrome 或 `/usr/bin/chromium`；其他位置通过 `BROWSER_EXE` 指定。