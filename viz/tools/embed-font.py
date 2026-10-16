#!/usr/bin/env python3
"""生成可以单独打开的页面：嵌入系列公共代码（viz/common/series.js），再把用到的字体裁剪后嵌进 HTML。

1. 公共代码：页面里写 <script src="../common/series.js"></script>（或者已经嵌过的 /*SERIES-START*/ … /*SERIES-END*/），
   脚本把它换成 series.js 当前的内容。这样一个 HTML 文件就能单独打开、单独发给别人（不嵌的话单独打开是黑屏）。
   公共代码只改 series.js，改完对每一集重新跑一次这个脚本。
2. 字体：

页面里要有一段占位，写明要哪几种字体（名字见下面的 FAMILIES）：
    /*FONTS-START Source Han Sans SC|LXGW WenKai*/ ... /*FONTS-END*/
脚本会把占位内容替换成 `const FONT_DATA = [[字体名, 字重, unicodeRange, base64], ...];`，
页面再用 FontFace 加载。改了页面里的文字之后要重新跑一次，新加的字才会有字形。

用法：python3 viz/tools/embed-font.py viz/summer/nagaoka-hanabi-a.html
依赖：pip install fonttools brotli；字体从 npm 下载（都是 SIL Open Font License 1.1）。
"""
import base64, io, os, re, subprocess, sys, tarfile
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import logging
logging.getLogger("fontTools").setLevel(logging.ERROR)   # LXGW 里有几张用不到的表，裁剪时会提示，忽略

# 字体名 → [(npm 包, 包里的 css, 字重), ...]
FAMILIES = {
    'Source Han Sans SC':  [('@fontsource-variable/noto-sans-sc@5.3.1', 'wght.css', '100 900')],   # 思源黑体（简体）
    'Source Han Sans TC':  [('@fontsource-variable/noto-sans-tc@5.3.1', 'wght.css', '100 900')],   # 思源黑体（繁体，台湾字形）
    'Source Han Serif SC': [('@fontsource-variable/noto-serif-sc@5.3.1', 'wght.css', '200 900')],  # 思源宋体
    'LXGW WenKai':         [('lxgw-wenkai-webfont@1.7.0', 'lxgwwenkai-bold.css', '700')],          # 霞鹜文楷（粗）
    'Oswald':              [('@fontsource-variable/oswald@5.3.0', 'wght.css', '200 700')],          # 英文窄体
    'Sora':                [('@fontsource-variable/sora@5.3.0', 'wght.css', '100 800')],            # 现代几何无衬线（数字、英文）
}
CACHE = Path(os.environ.get('NIIGATA_FONT_CACHE', Path.home() / '.cache' / 'niigata-fonts'))


def package(spec):
    root = CACHE / re.sub(r'[^\w.-]', '_', spec)
    if not (root / 'package').exists():
        root.mkdir(parents=True, exist_ok=True)
        tgz = subprocess.run(['npm', 'pack', spec, '--silent'], cwd=root, check=True,
                             capture_output=True, text=True).stdout.strip().splitlines()[-1]
        with tarfile.open(root / tgz) as t:
            t.extractall(root, filter='data')
    return root / 'package'


def parse_ranges(spec):
    out = []
    for part in spec.split(','):
        part = part.strip().removeprefix('U+')
        lo, _, hi = part.partition('-')
        out.append((int(lo, 16), int(hi or lo, 16)))
    return out


def used_chars(html):
    html = re.sub(r'/\*FONTS-START.*?/\*FONTS-END\*/', '', html, flags=re.S)
    html = re.sub(r'/\*SERIES-START.*?/\*SERIES-END\*/', '', html, flags=re.S)   # 公共代码里没有画面上的中文
    html = re.sub(r'/\*.*?\*/', '', html, flags=re.S)           # 注释里的字不需要字形
    html = re.sub(r'(^|\s)//[^\n]*', r'\1', html)
    chars = {ord(c) for c in html if ord(c) > 0x7e}
    return chars | set(range(0x20, 0x7f))                        # 数字和英文全部保留


def faces(family, chars):
    for spec, css_name, weight in FAMILIES[family]:
        yield from faces_of(family, chars, spec, css_name, weight)


def faces_of(family, chars, spec, css_name, weight):
    pkg = package(spec)
    css = (pkg / css_name).read_text()
    for fname, rng in re.findall(r"src: url\('?\./files/([^)']+)'?\).*?unicode-range: ([^;}]+)", css, flags=re.S):
        rng = rng.strip()
        need = sorted(c for c in chars if any(lo <= c <= hi for lo, hi in parse_ranges(rng)))
        if not need:
            continue
        font = TTFont(pkg / 'files' / fname)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.name_IDs = ['*']            # 保留版权和 OFL 许可信息
        opts.layout_features = ['*']
        s = subset.Subsetter(opts)
        s.populate(unicodes=need)
        s.subset(font)
        buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
        yield [family, weight, rng.replace(' ', ''), base64.b64encode(buf.getvalue()).decode()]


SERIES = Path(__file__).resolve().parent.parent / 'common' / 'series.js'


def inline_series(html):
    js = SERIES.read_text(encoding='utf-8')
    block = '<script>\n/*SERIES-START 系列公共代码，由 viz/tools/embed-font.py 从 viz/common/series.js 嵌入，不要在这里改*/\n' + js + '/*SERIES-END*/\n</script>'
    html = re.sub(r'<script src="\.\./common/series\.js"></script>', lambda _: block, html)
    return re.sub(r'<script>\n/\*SERIES-START.*?/\*SERIES-END\*/\n</script>', lambda _: block, html, flags=re.S)


def main(path):
    page = Path(path)
    html = inline_series(page.read_text(encoding='utf-8'))
    m = re.search(r'/\*FONTS-START ([^*]+)\*/', html)
    if not m:
        sys.exit('页面里没有找到 /*FONTS-START 字体名|字体名*/ ... /*FONTS-END*/ 占位')
    families = [f.strip() for f in m.group(1).split('|')]
    chars = used_chars(html)
    data = [f for fam in families for f in faces(fam, chars)]
    rows = ',\n'.join("['%s','%s','%s','%s']" % tuple(d) for d in data)
    block = f'/*FONTS-START {m.group(1)}*/\nconst FONT_DATA = [\n{rows}\n];\n/*FONTS-END*/'
    html = re.sub(r'/\*FONTS-START [^*]+\*/.*?/\*FONTS-END\*/', lambda _: block, html, flags=re.S)
    page.write_text(html, encoding='utf-8')
    kb = sum(len(d[3]) for d in data) / 1024
    print(f'{page}: {len(chars)} chars, {len(families)} families, {len(data)} slices, {kb:.0f} KB base64')


if __name__ == '__main__':
    main(sys.argv[1])
