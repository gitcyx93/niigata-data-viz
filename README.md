# niigata-data-viz

## 高田夜樱：仅去掉重复全景

`viz/spring/takada-yozakura-v2.html` **恢复并保留原 13–20 秒的全景花吹雪/花筏高潮**；仅将 0–5 秒换成樱花框住三重橹的建筑近景，把完整护城河全景留到后半段。极乐桥、仰看樱花、文案、花瓣算法和 20 秒总长保留；19.9 秒不提前重现封面大字。之前的水面近景替换方案已撤回。

- [修改前后对照](reference/takada-dedup/comparison.png) · [检查记录](reference/takada-dedup/validation.json) · [制作记录](stories/takada.md)
- 后台验证：`node viz/tools/check-takada-dedup.cjs`（用 `BROWSER_EXE` 指定 Chrome）。

## 弥彦环境声第二版：风与留白（当前试作）

- **新版 HTML**：[yahiko-v11-ambient-v2.html](viz/autumn/yahiko-v11-ambient-v2.html) — 打开后点「从头试听」。
- **独立音轨**：[yahiko-v11-ambience-v2.mp3](output/autumn/audio-v2/yahiko-v11-ambience-v2.mp3)
- **改动与检查范围**：[yahiko-v11-ambient-v2.md](stories/yahiko-v11-ambient-v2.md)

去掉鞋拨干叶、索道站机器和田野风，改用一份风吹枝叶录音。主叶声跟随实际入画飞叶量；开场和缆车段留白，海景只有极轻空气层。原画面与时长不动。完成信号与播放同步测试，**尚未完成主观试听验收**。

```sh
python3 viz/tools/ambient-yahiko-v2.py
AUDIO_PAGE=yahiko-v11-ambient-v2.html node viz/tools/check-yahiko-ambient.cjs
```

## 弥彦环境声第一版（已被用户否定，仅作对照）

- **有声 HTML**：[yahiko-v11-ambient.html](viz/autumn/yahiko-v11-ambient.html) — 下载后打开，点「有声播放」；默认静音，无配乐。
- **独立音轨**：[yahiko-v11-ambience.mp3](output/autumn/audio/yahiko-v11-ambience.mp3)
- **声音设计与验证**：[yahiko-v11-ambient.md](stories/yahiko-v11-ambient.md)
- **录音来源与 CC0 许可**：[sources.json](data/audio/yahiko-v11/sources.json)

四份真实录音剪辑而成的林风、干叶、开阔处风声与轻微机械底声，不是弥彦现场录音。HTML 内嵌声音，可离线播放；暂停、拖动、重播与声音同步。画面与下方无声精修版一致，原版本保留。

```sh
python3 viz/tools/ambient-yahiko.py      # numpy/scipy + ffmpeg，重新混音并内嵌
node viz/tools/check-yahiko-ambient.cjs # Node 22+ / Chrome，自动检查声音同步
```

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