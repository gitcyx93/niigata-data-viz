#!/usr/bin/env python3
"""从简体版页面生成繁体版（台湾用词），再嵌入繁体字体。

简体是唯一的原稿：改文字只改简体版，然后重新跑这个脚本，不要直接改生成的繁体版。
  python3 viz/tools/make-tw.py viz/summer/nagaoka-hanabi-a.html
  → viz/summer/nagaoka-hanabi-a-tw.html

转换用 OpenCC 的 s2twp（简体 → 台湾正体，含常用词替换），之后再套用下面的 FIXES：
OpenCC 会转错的专有名词，以及它不处理的两岸用词差异。每次生成后要人工看一遍输出的文字清单。
依赖：pip install opencc
"""
import re, subprocess, sys
from pathlib import Path
import opencc

FIXES = {
    '大麴': '大曲',          # 秋田大曲（地名），OpenCC 会当成酒麴
    '質量': '品質',
    '打車': '搭計程車',
    '地鐵': '捷運',
    '視訊': '影片',
    '坐大巴': '搭巴士',      # 大巴是大陆说法
    '約 10 米': '約 10 公尺', # 台湾长度用公尺
}
FONT_SWAP = [
    ('Source Han Sans SC', 'Source Han Sans TC'),
    ('Noto Sans SC', 'Noto Sans TC'),
    ('PingFang SC', 'PingFang TC'),
    ('Microsoft YaHei', 'Microsoft JhengHei'),
    ('lang="zh-CN"', 'lang="zh-TW"'),
]


def main(src):
    src = Path(src)
    out = src.with_name(src.stem + '-tw' + src.suffix)
    html = src.read_text(encoding='utf-8')
    html = re.sub(r'(/\*FONTS-START [^*]+\*/).*?(/\*FONTS-END\*/)', r'\1\n\2', html, flags=re.S)   # 字体数据之后重新嵌入
    html = opencc.OpenCC('s2twp').convert(html)
    for a, b in list(FIXES.items()) + FONT_SWAP:
        html = html.replace(a, b)
    html = html.replace('<script>', '<script>\n// 由 viz/tools/make-tw.py 从简体版自动生成，不要直接修改', 1)
    out.write_text(html, encoding='utf-8')
    subprocess.run([sys.executable, str(Path(__file__).with_name('embed-font.py')), str(out)], check=True)
    # 列出画面上的中文，方便人工检查两岸用词
    body = re.sub(r'/\*FONTS-START.*?/\*FONTS-END\*/', '', html, flags=re.S)
    seen = []
    for m in re.finditer(r"(['`])((?:(?!\1).)*[一-鿿](?:(?!\1).)*)\1", body):
        if m.group(2) not in seen:
            seen.append(m.group(2))
    print('画面文字（请人工检查）：')
    for t in seen:
        print('  ' + t)


if __name__ == '__main__':
    main(sys.argv[1])
