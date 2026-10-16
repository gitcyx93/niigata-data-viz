// 把 viz/ 里的循环动画逐帧录成 MP4。
// 用法：node viz/tools/record.js <页面.html> <输出.mp4> [秒数，默认一个循环] [fps，默认 30]
// 页面需要提供 window.render(t) 和 window.LOOP_SECONDS，并支持 ?record 参数。
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [src, out, secArg, fpsArg] = process.argv.slice(2);
  const fps = Number(fpsArg) || 30;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(src) + '?record');
  await page.waitForFunction('window.READY === true');
  const seconds = Number(secArg) || await page.evaluate('window.LOOP_SECONDS');
  const frames = Math.round(seconds * fps);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < frames; i++) {
    const data = await page.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/png'); }, i / fps);
    if (!ff.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log(`${out}: ${frames} frames @ ${fps}fps`);
})();
