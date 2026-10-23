# 把 yahiko-shrine3d.js（神社立体场景）嵌进用到它的页面：替换 /*SHRINE3D-START*/ ... /*SHRINE3D-END*/ 之间的内容。
# 用法：python3 viz/autumn/build-yahiko.py
import pathlib, re
here = pathlib.Path(__file__).parent
js = (here / 'yahiko-shrine3d.js').read_text(encoding='utf-8')
for name in ['yahiko-transition-lab.html']:
    p = here / name
    h = p.read_text(encoding='utf-8')
    h2, n = re.subn(r'/\*SHRINE3D-START\*/.*?/\*SHRINE3D-END\*/', lambda _: '/*SHRINE3D-START*/\n' + js + '/*SHRINE3D-END*/', h, flags=re.S)
    if n != 1: raise SystemExit(f'{name}: 没找到 SHRINE3D 占位')
    p.write_text(h2, encoding='utf-8'); print(name, 'ok')
