// 改完页面后的检查：一条命令跑完，只输出几行结果。
// 用法：NODE_PATH=/opt/node22/lib/node_modules node viz/tools/check.js <页面.html> [选项]
//   --strip <输出.png>   全片缩略图（每 0.5 秒一格），用来看节奏、构图和文字
//   --at <秒,秒,...>     另外输出这几个时刻的全尺寸截图（<输出>-<秒>.png，和 --strip 一起用）
//   --compare <旧.html>  逐像素对比两个页面（改了 series.js 后，确认其他集没被改到）
// 检查内容：报错；字体是否加载；单独打开（复制到空目录）能否运行；首尾接缝是否和普通相邻两帧一样平滑；每帧耗时。
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');

const args = process.argv.slice(2), page = path.resolve(args[0]);
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null; };

async function open(browser, file) {
  const p = await browser.newPage({viewport: {width: 1080, height: 1920}});
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + file + '?record');
  await p.waitForFunction('window.READY === true', null, {timeout: 30000}).catch(() => errs.push('页面没有就绪（READY 没有变成 true）'));
  return {p, errs};
}

(async () => {
  const browser = await chromium.launch();
  // 1) 单独打开：复制到一个空目录，确认不依赖其他文件（series.js 和字体都已嵌入）
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-')), alone = path.join(dir, path.basename(page));
  fs.copyFileSync(page, alone);
  const {p, errs} = await open(browser, alone);
  const r = await p.evaluate(() => {
    const T = window.LOOP_SECONDS, c = document.getElementById('c'), x = c.getContext('2d');
    const grab = t => { render(t); return x.getImageData(0, 0, c.width, c.height).data; };
    const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 16) s += Math.abs(a[i] - b[i]); return s / (a.length / 16); };
    const d = 1 / 30, f0 = grab(T - d), f1 = grab(0), f2 = grab(d);
    const cost = [];
    for (let k = 0; k < 10; k++) { const t = T * k / 10, s = performance.now(); render(t); x.getImageData(0, 0, 1, 1); cost.push(performance.now() - s); }
    const fonts = [...document.fonts].map(f => f.family + ':' + f.status).filter((v, i, a) => a.indexOf(v) === i);
    return {T, seam: diff(f0, f1), step: diff(f1, f2), avg: cost.reduce((a, b) => a + b) / cost.length, max: Math.max(...cost), fonts};
  });
  const bad = r.fonts.filter(f => !f.endsWith(':loaded'));
  console.log(`报错：${errs.length ? errs.join(' | ') : '无'}（单独打开测试）`);
  console.log(`字体：${bad.length ? '未加载 ' + bad.join(', ') : '全部加载'}`);
  console.log(`首尾接缝：${r.seam.toFixed(2)}，普通相邻两帧 ${r.step.toFixed(2)}（${r.seam < r.step * 2.5 ? '无缝' : '有跳变'}）`);
  console.log(`每帧耗时：平均 ${r.avg.toFixed(0)} ms，最慢 ${r.max.toFixed(0)} ms`);

  // 2) 全片缩略图 + 指定时刻的截图
  const strip = opt('--strip');
  if (strip) {
    const png = await p.evaluate(T => {
      const c = document.getElementById('c'), n = Math.round(T / .5), cols = 10, w = 216, h = 384;
      const s = document.createElement('canvas'); s.width = cols * w; s.height = Math.ceil(n / cols) * (h + 24);
      const x = s.getContext('2d'); x.fillStyle = '#08090f'; x.fillRect(0, 0, s.width, s.height); x.font = '16px sans-serif';
      for (let i = 0; i < n; i++) {
        render(i * .5); const X = (i % cols) * w, Y = Math.floor(i / cols) * (h + 24);
        x.drawImage(c, X, Y + 24, w, h); x.fillStyle = '#dde4f0'; x.fillText((i * .5) + 's', X + 6, Y + 17);
      }
      return s.toDataURL('image/png');
    }, r.T);
    fs.writeFileSync(strip, Buffer.from(png.split(',')[1], 'base64'));
    console.log(`缩略图：${strip}`);
    for (const t of (opt('--at') || '').split(',').filter(Boolean)) {
      await p.evaluate(t => render(t), +t);
      const f = strip.replace(/\.png$/, '') + `-${t}.png`;
      await p.locator('#c').screenshot({path: f});
      console.log(`截图：${f}`);
    }
  }

  // 3) 和另一个页面逐像素对比
  const other = opt('--compare');
  if (other) {
    const q = await open(browser, path.resolve(other));
    const ts = [0, 1, 5, 9.4, 12.1, 16, 19.7].filter(t => t < r.T);
    const a = await p.evaluate(ts => ts.map(t => { render(t); return document.getElementById('c').toDataURL(); }), ts);
    const b = await q.p.evaluate(ts => ts.map(t => { render(t); return document.getElementById('c').toDataURL(); }), ts);
    const diffAt = ts.filter((t, i) => a[i] !== b[i]);
    console.log(`对比 ${path.basename(other)}：${diffAt.length ? '这些时刻不同 ' + diffAt.join(', ') : '完全一致'}`);
  }
  await browser.close();
  fs.rmSync(dir, {recursive: true, force: true});
})();
