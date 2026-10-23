# 弥彦：拜殿单镜头重设计（2026-10-23）

用户允许抽象与重置，明确不要把神社拆成两个镜头，认为此前建筑太小；授权完成后上传 GitHub。

入口：`viz/autumn/yahiko-shrine-reset.html`。自包含字体和绘图代码，可单独打开。保留 A/B 看海结尾与原 v6 对照，默认 A。神社绘图源码：`viz/autumn/yahiko-shrine-reset.js`；独立 HTML 中已嵌入这段源码，不需要加载 JS 文件。

4–8 秒为一个连续缓慢靠近的拜殿庭院镜头。重新绘制宽屋檐、中央曲面檐、柱梁、暗部和宽台阶；减少空地，扩大建筑。不画入口鸟居，不以假红花装饰杉树。参考实景结构但不声称测绘复原。开头、已调整为左向右上升的缆车、A/B 山海结尾延续本地方案。旧文件 `yahiko-autumn-night.html` 与原作不覆盖。

参考：
- 官方拜殿正面 https://www.yahiko-jinjya.or.jp/img/meguru/gosyaden/pic_main01.jpg
- 境内图 https://www.yahiko-jinjya.or.jp/meguru/index.html （一之鸟居经石桥、表参道转向二之鸟居、随神门再入拜殿庭院，非同一正面轴线）
- 秋季实拍 https://meguaoki.com/yahiko-aki/ （照片具体拍摄日期未注明；近处林木仍多为绿色）
- 看海构图参考 https://niigata-kankou.or.jp/spot/detail_7462.html （A组合山脊海景及山顶地面元素，不对应单一真实机位）

验证：内联脚本通过 Node vm.Script 语法检查；浏览器检查神社关键帧、持续播放及循环后的状态，未见脚本错误。未导出视频。只提交工作分支，不部署、不合并、不改变分享权限。用户尚未批准最终定稿。


## 后续更新：加回侧前景鸟居

用户认为删掉鸟居过头，已确认采用侧前景鸟居与略带横移的连续靠近。当前入口仍是 `viz/autumn/yahiko-shrine-reset.html`，本页上文的「不画入口鸟居」仅描述旧版；以[本次鸟居更新说明](yahiko-torii-review-2026-10-23.md)为准。
