#!/usr/bin/env python3
"""把思源黑体（Noto Sans SC，即 Google 发行的思源黑体）按页面实际用到的字裁剪后，嵌进 HTML。

页面里要有一段占位：
    /*FONTS-START*/ ... /*FONTS-END*/
脚本会把它替换成 `const FONT_DATA = [[unicodeRange, base64], ...];`，页面再用 FontFace 加载。
改了页面里的文字之后要重新跑一次，新加的字才会有字形。

用法：python3 viz/tools/embed-font.py viz/summer/nagaoka-hanabi-a.html
依赖：pip install fonttools brotli；字体来自 npm 包 @fontsource-variable/noto-sans-sc（可变字重 100–900，SIL OFL 1.1）。
"""
import base64, io, os, re, subprocess, sys, tarfile
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

PKG = '@fontsource-variable/noto-sans-sc@5.3.1'
CACHE = Path(os.environ.get('NIIGATA_FONT_CACHE', Path.home() / '.cache' / 'niigata-fonts'))


def font_package():
    pkg = CACHE / 'package'
    if not (pkg / 'wght.css').exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        tgz = subprocess.run(['npm', 'pack', PKG, '--silent'], cwd=CACHE, check=True,
                             capture_output=True, text=True).stdout.strip().splitlines()[-1]
        with tarfile.open(CACHE / tgz) as t:
            t.extractall(CACHE, filter='data')
    return pkg


def parse_ranges(spec):
    out = []
    for part in spec.split(','):
        part = part.strip().removeprefix('U+')
        lo, _, hi = part.partition('-')
        out.append((int(lo, 16), int(hi or lo, 16)))
    return out


def used_chars(html):
    html = re.sub(r'/\*FONTS-START\*/.*?/\*FONTS-END\*/', '', html, flags=re.S)
    html = re.sub(r'/\*.*?\*/', '', html, flags=re.S)           # 去掉注释，注释里的字不需要字形
    html = re.sub(r'(^|\s)//[^\n]*', r'\1', html)
    chars = {ord(c) for c in html if ord(c) > 0x7e}
    return chars | set(range(0x20, 0x7f))                        # 数字和英文全部保留


def main(path):
    page = Path(path)
    html = page.read_text(encoding='utf-8')
    chars = used_chars(html)
    pkg = font_package()
    css = (pkg / 'wght.css').read_text()
    faces = re.findall(r"src: url\(\./files/([^)]+)\).*?unicode-range: ([^;]+);", css, flags=re.S)
    data, total = [], 0
    for fname, spec in faces:
        ranges = parse_ranges(spec)
        need = sorted(c for c in chars if any(lo <= c <= hi for lo, hi in ranges))
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
        b64 = base64.b64encode(buf.getvalue()).decode()
        total += len(b64)
        data.append(f"['{spec}','{b64}']")
    block = '/*FONTS-START*/\nconst FONT_DATA = [\n' + ',\n'.join(data) + '\n];\n/*FONTS-END*/'
    html, n = re.subn(r'/\*FONTS-START\*/.*?/\*FONTS-END\*/', lambda m: block, html, flags=re.S)
    if n != 1:
        sys.exit('页面里没有找到 /*FONTS-START*/ ... /*FONTS-END*/ 占位')
    page.write_text(html, encoding='utf-8')
    print(f'{page}: {len(chars)} chars, {len(data)} font slices, {total / 1024:.0f} KB base64')


if __name__ == '__main__':
    main(sys.argv[1])
