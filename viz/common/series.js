// 新潟系列的公共部分：四季每一集都用同一套文字层、标题、旁白和导出接口，保证系列视觉统一。
// 页面的写法（照着 viz/summer/nagaoka-hanabi-a.html）：
//   canvas#c（1080×1920）→ 字体占位的 script → 引入这个文件的 script → 页面自己的场景 script（最后调用 boot(render)）。
// 跑 viz/tools/embed-font.py 时，这个文件的内容会被直接嵌进页面，页面就能单独打开。
// 页面需要定义：T（循环秒数）。画面上的中文都写在页面里（字体按页面里的字裁剪，繁体版也只转换页面）。
// 改了这里的样式，四集一起变；改完把每一集都重新检查、重新导出。

// ======== 文字配色（全系列统一，换方案只改这里）========
// 雾蓝和白为主；金色只标数字，珊瑚色只用于提醒
const TYPE = { text:'#f4f7fb', soft:'rgba(232,239,249,.78)', accent:'#9dbde8', bar:'#6f97d2', gold:'#f3c776', coral:'#ff8f7a' };
const NARRATION = 'rgba(222,230,244,.68)';      // 左上角讲故事的小字
const WHITE = TYPE.text, SOFT = 'rgba(232,239,249,.74)';

const W = 1080, H = 1920;
const cv = document.getElementById('c');
let g = cv.getContext('2d');          // 当前画在哪张画布上（画倒影等时可以临时换成别的画布）
const params = new URLSearchParams(location.search);
const TAU = Math.PI * 2;
const fract = x => x - Math.floor(x);
const rnd = (a, b = 0) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = x => x * x * (3 - 2 * x);
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const since = (t, t0) => fract((t - t0) / T) * T;      // 距离 t0 过去了多久（跨循环首尾）
const lerp = (a, b, k) => a + (b - a) * k;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).concat(255);

// ======== 光斑和渐变 ========
// 大面积的「光」都不用浏览器的渐变来画：浏览器画渐变时会用细小的方格做抖动，几十层叠在一起就成了看得见的正方形格子。
// 改成先用像素逐点算好一张平滑的光斑图（没有抖动），用的时候缩放贴上去。
const sprites = {};
function radialSprite(rgb, falloff = 1.6) {          // 圆形光斑：中心不透明，往外平滑变透明
  const key = rgb.join(',') + '|' + falloff;
  if (sprites[key]) return sprites[key];
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const r = Math.hypot(i + .5 - N / 2, j + .5 - N / 2) / (N / 2), k = (j * N + i) * 4;
    d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - r), falloff));
  }
  x.putImageData(img, 0, 0); return sprites[key] = c;
}
function verticalSprite(key, stops) {                 // 竖直方向的渐变条：stops = [[位置0~1, [r,g,b,a]], ...]
  if (sprites[key]) return sprites[key];
  const N = 512, c = document.createElement('canvas'); c.width = 1; c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(1, N), d = img.data;
  for (let j = 0; j < N; j++) {
    const u = (j + .5) / N; let k = 0; while (k < stops.length - 2 && u > stops[k + 1][0]) k++;
    const [u0, a] = stops[k], [u1, b] = stops[k + 1], f = clamp((u - u0) / (u1 - u0));
    for (let n = 0; n < 4; n++) d[j * 4 + n] = Math.round(a[n] + (b[n] - a[n]) * f);
  }
  x.putImageData(img, 0, 0); return sprites[key] = c;
}
function glowAt(rgb, alpha, x, y, rx, ry = rx, falloff) {
  if (alpha <= .002) return;
  g.globalAlpha = Math.min(1, alpha); g.drawImage(radialSprite(rgb, falloff), x - rx, y - ry, rx * 2, ry * 2); g.globalAlpha = 1;
}
const hsl2rgb = (h, s, l) => {
  s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map(n => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
};

// ======== 字体：中文用思源黑体，数字和英文用 Sora（几何感的现代无衬线），靠字重拉开层次 ========
// 繁体版（<html lang="zh-TW">）自动换成思源黑体繁体
const TC = document.documentElement.lang === 'zh-TW';
const FONTS = TC ? {
  cjk:   '"Source Han Sans TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif',
  latin: '"Sora","Source Han Sans TC",sans-serif',
} : {
  cjk:   '"Source Han Sans SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
  latin: '"Sora","Source Han Sans SC",sans-serif',
};
// ---- 文字工具 ----
const latinOnly = s => /^[\x20-\x7e]+$/.test(s);
function setFont(size, weight = 400, spacing = 0, fam = 'cjk') {
  g.font = `${weight} ${size}px ${FONTS[fam]}`;
  if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
}
function resetSpacing(c = g) { if ('letterSpacing' in c) c.letterSpacing = '0px'; }
function measure(s, size, weight = 400, spacing = 0, fam = latinOnly(s) ? 'latin' : 'cjk') {
  setFont(size, weight, spacing, fam); const w = g.measureText(s).width - spacing; resetSpacing(); return w;
}
function text(s, x, y, size, color, weight = 400, align = 'left', spacing = 0, fam = latinOnly(s) ? 'latin' : 'cjk') {
  const w = measure(s, size, weight, spacing, fam);
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  setFont(size, weight, spacing, fam); g.textAlign = 'left'; g.fillStyle = color; g.fillText(s, left, y); resetSpacing();
  return w;
}
// 一行里几段字，整体居中；计数的数字按最终值的宽度排版、右对齐，避免整行抖动
// parts: [文字, 字号, 颜色, 字重, 字距, 最终值]
function line(parts, y) {
  const ws = parts.map(([s, size, , wt = 400, sp = 0, slot]) => measure(slot || s, size, wt, sp));
  let x = (W - ws.reduce((a, b) => a + b, 0)) / 2;
  parts.forEach(([s, size, color, wt = 400, sp = 0, slot], i) => {
    text(s, slot ? x + ws[i] : x, y, size, color, wt, slot ? 'right' : 'left', sp); x += ws[i];
  });
  return ws.reduce((a, b) => a + b, 0);
}
function roundRect(x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// 一段文字的出场/退场：从下往上浮起，结束时淡出
function scene(t, from, to) {
  const age = since(t, from), dur = since(to, from);
  if (age > dur) return 0;
  return {p: from > to && t < to ? 1 : easeOut(age / .55), out: clamp((dur - age) / .35), age};
}
function rise(s, draw) {
  if (!s) return;
  g.save(); g.globalAlpha = s.out * s.p; g.translate(0, (1 - s.p) * 40); draw(); g.restore();
}

// ---- 字号和字重：极简风格，靠大小和粗细拉开层次 ----
// [字号, 字重, 字距]
const TS = () => ({num: [140, 200, -4], name: [68, 300, 8], word: [112, 200, 30], unit: [40, 300, 2], sub: [30, 300, 2]});

// ======== 左上角：讲故事的小字 ========
// 小字是「背景知识」：比大字小、细、灰，前面一根竖细线；一个字一个字慢慢浮现，说完淡出。
// story: [[开始秒, 结束秒, 一句话], ...]，一次只放一行
function drawStory(t, story, color = NARRATION, bar = TYPE.accent, shadow = null) {
  story.forEach(([from, to, s]) => {
    if (t < from || t > to) return;
    const out = clamp((to - t) / .5), y = 480;
    g.globalAlpha = out * clamp((t - from) / .3);
    g.fillStyle = bar; g.fillRect(80, y - 30, 2, 38);          // 竖细线：提示「这是旁白」
    setFont(32, 400, 1.5); g.textAlign = 'left';
    if (shadow) { g.shadowColor = shadow; g.shadowBlur = 12; g.shadowOffsetY = 1; }   // 背景亮的时候（如雪地）给小字一层深色的柔和字影
    let x = 100;
    [...s].forEach((c, i) => {
      const p = clamp((t - from - i * .05) / .45);           // 每个字晚 0.05 秒出现
      if (p > 0) { g.globalAlpha = ease(p) * out; g.fillStyle = color; g.fillText(c, x, y + 8 * (1 - ease(p))); if (shadow) g.fillText(c, x, y + 8 * (1 - ease(p))); }   // 有字影时叠两次，字影更实
      x += g.measureText(c).width;
    });
    g.globalAlpha = 1; g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; resetSpacing();
  });
}

// ======== 标题：镜面金属字（全系列统一）========
//  - 底色是接近白色的哑光银，从上到下平滑地由亮变暗（不要中间一道暗色「地平线」，在大字上会看成一条横线）
//  - 字面映出此刻的场景：截一块画面、上下翻转、缩到很小（相当于金属表面的模糊），以「柔光」叠上去，是一层光泽而不是清晰的倒影
//  - 倒角：上沿一道亮边、下沿一道暗边，让字有厚度；字外一圈外浮雕；下面一层很轻的投影
//  - 被场景里的光照出一块柔和的高光，位置、颜色跟着光源走，亮度有上限
// 不变的几层只画一次；每帧只在一张小画布上贴几次图
const TX = 30, TB = 190;                 // 标题在缓存画布里的位置
const titleLayers = {};
let titleText = '';
function titleLayer(key, paint) {
  if (!titleLayers[key]) {
    const c = document.createElement('canvas'); c.width = 860; c.height = 300;
    const x = c.getContext('2d');
    x.font = `800 132px ${FONTS.cjk}`; if ('letterSpacing' in x) x.letterSpacing = '6px';
    paint(x); titleLayers[key] = c;
  }
  return titleLayers[key];
}
const titleWork = document.createElement('canvas'); titleWork.width = 860; titleWork.height = 300;
const mask = () => titleLayer('mask', x => { x.fillStyle = '#fff'; x.fillText(titleText, TX, TB); });
const titleShadow = () => titleLayer('shadow', x => {
  x.shadowColor = 'rgba(0,0,0,.42)'; x.shadowBlur = 26; x.shadowOffsetY = 6; x.shadowOffsetX = 5000; x.fillStyle = '#000'; x.fillText(titleText, TX - 5000, TB);
});
const silver = () => titleLayer('silver', x => {
  const top = TB - 112, m = x.createLinearGradient(0, top, 0, TB + 12);
  m.addColorStop(0, '#f8fafd'); m.addColorStop(.55, '#dce2eb'); m.addColorStop(1, '#b2bdcd');
  x.fillStyle = m; x.fillText(titleText, TX, TB);
});
const bevel = () => titleLayer('bevel', x => {
  x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(titleText, TX, TB - 2);          // 上沿亮边
  x.globalCompositeOperation = 'destination-out'; x.fillText(titleText, TX, TB);
  x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(18,26,44,.45)'; x.fillText(titleText, TX, TB + 2.5);   // 下沿暗边
  x.globalCompositeOperation = 'destination-in'; x.fillText(titleText, TX, TB);
});
// 外浮雕：把字形模糊一下当成高度，按「光从左上方照下来」算字外一圈的明暗：
// 左上方贴着字边一道细亮边，右下方一道柔和的暗边，字像从背景里微微凸出来。字面本身不变。
// 只在第一次用到时算一次，之后每帧贴图
function blurF(a, w, h, r) {                   // 三次盒式模糊 ≈ 高斯模糊
  const tmp = new Float32Array(w * h), n = 2 * r + 1;
  for (let k = 0; k < 3; k++) {
    for (let y = 0; y < h; y++) {
      let acc = 0; const o = y * w;
      for (let x = -r; x <= r; x++) acc += a[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { tmp[o + x] = acc / n; acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { a[y * w + x] = acc / n; acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
    }
  }
  return a;
}
const RELIEF = {r: 2, k: 7, hi: .55, lo: .85};     // 坡宽、坡度、亮边和暗边的强度
const relief = () => titleLayer('relief', x => {
  const w = 860, h = 300, m = mask().getContext('2d').getImageData(0, 0, w, h).data;
  const Hm = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) Hm[i] = m[i * 4 + 3] / 255;
  blurF(Hm, w, h, RELIEF.r);
  const L = [-.5, -.7, .5], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const img = x.createImageData(w, h), d = img.data;
  for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
    const i = y * w + xx, out = 1 - m[i * 4 + 3] / 255;
    if (!out) continue;
    const gx = (Hm[i + 1] - Hm[i - 1]) / 2 * RELIEF.k, gy = (Hm[i + w] - Hm[i - w]) / 2 * RELIEF.k;
    const sh = (-gx * L[0] - gy * L[1] + L[2]) / Math.hypot(gx, gy, 1) - L[2];
    if (Math.abs(sh) < .004) continue;
    const j = i * 4, v = Math.min(1, Math.abs(sh) * 1.6);
    if (sh > 0) { d[j] = d[j + 1] = d[j + 2] = 255; d[j + 3] = v * RELIEF.hi * out * 255; }
    else { d[j] = 6; d[j + 1] = 8; d[j + 2] = 14; d[j + 3] = v * RELIEF.lo * out * 255; }
  }
  x.putImageData(img, 0, 0);
});
const sheen = document.createElement('canvas'); sheen.width = 96; sheen.height = 24;
// 标题区：NIIGATA + 地名 / 金属大标题 / 讲故事的小字
// header = {title, place, story, sheen: [x, y, w, h]（字面映出的那块画面，只取天空，不要深色的山）,
//           可选 storyColor / accent：小字和 NIIGATA、竖线的颜色（固定值或 t => 颜色）；
//           storyShadow: 旁白小字的字影颜色（背景亮时用）；
//           reflect: false 关掉字面的反射和高光（如冬季标题上已经有落雪，再反光就太花）}
// L = {light: 光的强度, lc: [r,g,b] 光的颜色, x: 光的水平位置}
function drawHeader(t, L, header) {
  titleText = header.title;
  const pick = v => typeof v === 'function' ? v(t) : v;      // 颜色可以是固定值，也可以随时间变（如跟着故事由冷变暖）
  const narr = pick(header.storyColor) || NARRATION, accent = pick(header.accent) || TYPE.accent;
  const ew = text('NIIGATA', 80, 262, 26, accent, 500, 'left', 8);
  text(header.place, 80 + ew + 22, 262, 26, narr, 400, 'left', 4);
  const X = 74 - TX, Y = 404 - TB;
  g.drawImage(titleShadow(), X, Y);
  g.drawImage(relief(), X, Y);
  const w = titleWork.getContext('2d');
  w.setTransform(1, 0, 0, 1, 0, 0); w.globalCompositeOperation = 'source-over'; w.globalAlpha = 1; w.clearRect(0, 0, 860, 300);
  w.drawImage(silver(), 0, 0);
  const reflect = header.reflect !== false;
  if (reflect) {                                             // 字面映出场景的光泽
    const sc = sheen.getContext('2d');
    sc.setTransform(1, 0, 0, -1, 0, 24);
    sc.drawImage(cv, ...header.sheen, 0, 0, 96, 24);
    w.imageSmoothingEnabled = true; w.imageSmoothingQuality = 'high';
    w.globalCompositeOperation = 'soft-light'; w.drawImage(sheen, TX - 20, TB - 130, 660, 160);
    w.globalCompositeOperation = 'lighter'; w.globalAlpha = .35; w.drawImage(sheen, TX - 20, TB - 130, 660, 160);
    w.globalAlpha = 1;
  }
  if (reflect && L.light > .03) {                                       // 高光：跟着光源的位置和颜色
    const hx = TX + clamp(L.x / W) * 600;
    w.globalCompositeOperation = 'source-over'; w.globalAlpha = Math.min(.5, L.light * .38);
    w.drawImage(radialSprite(L.lc, 1.3), hx - 280, TB - 190, 560, 240);
    w.globalAlpha = 1;
  }
  w.globalCompositeOperation = 'destination-in'; w.drawImage(mask(), 0, 0);
  w.globalCompositeOperation = 'source-over';
  w.drawImage(bevel(), 0, 0);
  g.drawImage(titleWork, X, Y);
  drawStory(t, header.story, narr, accent, header.storyShadow);
}
// 文字层底下的压暗：上面托住标题，下面托住大字（y0 ~ y0+h 的中间最暗）
function scrims(bandY = 1300, bandH = 320, top = 204, band = 158) {
  g.drawImage(verticalSprite('topscrim' + top, [[0, [1, 3, 12, top]], [1, [1, 3, 12, 0]]]), 0, 0, W, 600);
  g.drawImage(verticalSprite('band' + band, [[0, [1, 3, 12, 0]], [.5, [1, 3, 12, band]], [1, [1, 3, 12, 0]]]), 0, bandY, W, bandH);
}

// ======== 播放和导出 ========
// render(t) 必须是确定性的：同一个 t 永远画出同一帧（逐帧录制靠这个）。?record 时不自动播放，等录制脚本调用。
async function loadFonts() {
  if (typeof FONT_DATA === 'undefined' || !window.FontFace) return;
  await Promise.all(FONT_DATA.map(([family, weight, range, b64]) => {
    const f = new FontFace(family, `url(data:font/woff2;base64,${b64})`, {weight, unicodeRange: range});
    document.fonts.add(f); return f.load();
  }));
}
function boot(render) {
  window.render = render;
  window.LOOP_SECONDS = T;
  const ready = loadFonts().catch(() => {});
  if (!params.has('record')) {
    ready.then(() => {
      const start = performance.now();
      const tick = () => { render((performance.now() - start) / 1000); requestAnimationFrame(tick); };
      tick();
    });
  } else ready.then(() => { render(0); window.READY = true; });
}
