#!/usr/bin/env node
// Node >=22; no npm dependencies. BROWSER_EXE may point to Chrome/Chromium.
// Compare original V11 and the refinement; then run an actual animation loop.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../..');
const output = process.env.CHECK_OUTPUT || path.join(root, 'reference/yahiko-v11-refined');
const executable = process.env.BROWSER_EXE || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/chromium');
const quick = process.argv.includes('--quick');
fs.mkdirSync(output, {recursive: true});
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'yahiko-cdp-'));
  const chrome = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'],
    {stdio: ['ignore', 'ignore', 'pipe']});
  let ws;
  const pending = new Map(), errors = [], requests = [];
  const exited = new Promise(resolve => chrome.once('exit', resolve));
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let log = '';
      const timer = setTimeout(() => reject(new Error('Chrome startup timeout')), 20000);
      chrome.once('error', e => {clearTimeout(timer); reject(e);});
      chrome.once('exit', code => {clearTimeout(timer); reject(new Error('Chrome exited ' + code));});
      chrome.stderr.on('data', data => {
        log = (log + data).slice(-12000);
        const m = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (m) {clearTimeout(timer); resolve(m[1]);}
      });
    });
    ws = new WebSocket(endpoint);
    await new Promise((resolve, reject) => {ws.onopen = resolve; ws.onerror = reject;});
    let seq = 0, session;
    ws.onmessage = ({data}) => {
      const msg = JSON.parse(data);
      if (msg.id) {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id); clearTimeout(p.timer);
          msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
        }
      } else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
      else if (msg.method === 'Network.requestWillBeSent') {
        const url = msg.params.request.url;
        if (/^https?:/.test(url)) requests.push(url);
      }
    };
    const send = (method, params = {}, timeout = 90000) => new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {pending.delete(id); reject(new Error(method + ' timeout'));}, timeout);
      pending.set(id, {resolve, reject, timer});
      ws.send(JSON.stringify({id, method, params, ...(session ? {sessionId: session} : {})}));
    });
    const target = await send('Target.createTarget', {url: 'about:blank'});
    session = (await send('Target.attachToTarget', {targetId: target.targetId, flatten: true})).sessionId;
    await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const viewport = (width, height) => send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: false});
    const navigate = async filename => {
      await send('Page.navigate', {url: pathToFileURL(path.join(root, 'viz/autumn', filename)).href + '?record'});
      // Wait in the new document (the previous page may still have READY during navigation).
      await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{
        if(location.pathname.endsWith(${JSON.stringify(filename)})&&window.READY){clearInterval(timer);resolve(true)}
        else if(++n>800){clearInterval(timer);reject(new Error('Ready timeout'))}},100)})`);
    };
    const image = async (t, width = 360) => evaluate(`(()=>{render(${t});const c=document.createElement('canvas');
      c.width=${width};c.height=${width}*16/9;c.getContext('2d').drawImage(cv,0,0,c.width,c.height);return c.toDataURL('image/png')})()`);
    const saveImage = (name, data) => fs.writeFileSync(path.join(output, name), Buffer.from(data.split(',')[1], 'base64'));
    const contact = async (name, frames, cols = 4, width = 270) => {
      const data = await evaluate(`(async()=>{const frames=${JSON.stringify(frames)},w=${width},h=w*16/9,cols=${cols};
        const c=document.createElement('canvas');c.width=w*cols;c.height=Math.ceil(frames.length/cols)*(h+27);
        const g=c.getContext('2d');g.fillStyle='#101b22';g.fillRect(0,0,c.width,c.height);
        for(let i=0;i<frames.length;i++){const im=new Image();im.src=frames[i].image;await im.decode();
          const x=i%cols*w,y=Math.floor(i/cols)*(h+27);g.drawImage(im,x,y,w,h);
          g.fillStyle='#f6ead4';g.font='14px sans-serif';g.fillText(frames[i].label,x+7,y+h+19)}
        return c.toDataURL('image/png')})()`);
      saveImage(name, data);
    };
    await viewport(390, 844);
    await navigate('yahiko-reviewed-v11.html');
    const unchangedTimes = [11.4, 12.8, 14.59, 18.4, 20.5, 24.8];
    const baseline = {};
    for (const t of unchangedTimes) baseline[t]=sha(await image(t,540));
    const before = [];
    for (const t of [3.8, 8.9, 9.9, 10.3, 10.7]) before.push({t, label: 'V11 / ' + t + 's', image: await image(t)});
    const originalPlan = await evaluate('JSON.stringify(PLAN)');
    await navigate('yahiko-v11-refined.html');
    const checks = await evaluate(`(()=>{
      const fontMissing=[...new Set(STORY_C.map(s=>s[2]).join('')+'至弥彦站 换乘等待另计')].filter(c=>!FONT_DATA.some(([family,,range])=>
        family==='Source Han Sans SC'&&range.split(',').some(r=>{const[a,b=a]=r.trim().replace('U+','').split('-').map(v=>parseInt(v,16));
          return c.codePointAt(0)>=a&&c.codePointAt(0)<=b})));
      const rates=STORY_C.map(([from,,text],i)=>{const seconds=(STORY_C[i+1]?.[0]??T)-Math.max(0,from);return{text,seconds,rate:[...text].length/seconds}});
      const original=refinedCabin,track=[];let current;
      refinedCabin=function(b,x,y,s){const m=b.getTransform();current={x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,sx:m.a*s,sy:m.d*s};return original(b,x,y,s)};
      try{for(const t of [9.8,10.3,10.8,11.39,11.4,11.41,12.4,13.4,14.59]){render(t);track.push({t,...current})}}finally{refinedCabin=original}
      render(10.1);const first=cv.toDataURL();render(24);render(10.1);const deterministic=first===cv.toDataURL();
      const leafDraw=flyingLeaf;
      const leafFrame=t=>{const a=[];flyingLeaf=(b,x,y,size,spin,color,alpha)=>a.push({x,y,size,spin,color,alpha});try{windLeaves(g,t)}finally{flyingLeaf=leafDraw}return a};
      const wind=[2.2,2.8,3.3,3.8,4.2,4.45,4.9,5.3,5.59,5.6,5.61,6.3,7.8].map(t=>{
        const leaves=leafFrame(t);
        return {t,count:leaves.length,visible:leaves.filter(p=>p.x+p.size>0&&p.x-p.size<W&&p.y+p.size>0&&p.y-p.size<H).length,
          speed:(windTravel(t+.001)-windTravel(t-.001))/.002};
      });
      const crossCut=gust.map(l=>[windLeafState(l,5.599),windLeafState(l,5.601)]).filter(([a,b])=>a&&b);
      const acceleration=[2.8,3.3,3.8,4.2,4.9,5.3].map(t=>{
        const l=gust[0],a=windLeafState(l,t-.001),b=windLeafState(l,t+.001);
        return {t,vx:a&&b?(b.x-a.x)/.002:null,vy:a&&b?(b.y-a.y)/.002:null};
      });
      return{duration:T,plan:PLAN,fonts:document.fonts.status,fontMissing,rates,track,deterministic,wind,acceleration,
        windCrossCutContinuous:crossCut.length>250&&crossCut.every(([a,b])=>b.x>a.x&&b.y>a.y&&Math.hypot(b.x-a.x,b.y-a.y)<8),
        allLeavesFall:gust.every(l=>[3,4,5,5.6,6.3,7].every(t=>{const a=windLeafState(l,t),b=windLeafState(l,t+.001);return !a||!b||(b.x>a.x&&b.y>a.y)})),
        overflow:document.documentElement.scrollWidth>innerWidth,
        narrationWidth:measure(STORY_C[5][2],38,500,1.5),
        // Camera/temple geometry and all scene boundaries intentionally stay V11.
        templeCenter:GLADE_HC,templeScale:GLADE_S
      };
    })()`);
    assert.equal(checks.duration, 25.2);
    assert.equal(JSON.stringify(checks.plan), originalPlan);
    assert.equal(checks.fonts, 'loaded'); assert.deepEqual(checks.fontMissing, []);
    assert(checks.rates.every(r => r.rate <= 4.1));
    assert(checks.narrationWidth < 900); assert(checks.deterministic); assert(!checks.overflow);
    assert.equal(checks.templeScale, .25); assert.deepEqual(checks.templeCenter, [540, 1230]);
    assert(checks.track.every((p, i, a) => !i || p.x > a[i-1].x && p.y < a[i-1].y));
    assert(checks.track.every(p => Math.abs(p.sx-p.sy) < 1e-5));
    assert(checks.windCrossCutContinuous); assert(checks.wind.find(w=>w.t===5.6).count > 250);
    const build=checks.wind.filter(w=>w.t<=5.59);
    assert(build.every((w,i)=>!i||(w.visible>build[i-1].visible&&w.speed>build[i-1].speed)),
      'Wind must grow in visible density and speed, without a mid-bridge lull: '+JSON.stringify(build));
    const speeds=checks.acceleration.filter(p=>p.vx!==null);
    assert(speeds.length>=3&&speeds.every((p,i)=>p.vy>0&&(!i||p.vx>speeds[i-1].vx)),'Individual leaves must accelerate and fall');
    assert(checks.allLeavesFall,'No foreground leaves should rise from the pond');
    assert(checks.wind.find(w=>w.t===7.8).count<checks.wind.find(w=>w.t===5.6).count,
      'Existing leaves should exit after the peak, not start a second burst');
    checks.unchangedFrames = [];
    for (const t of unchangedTimes) {
      const data=await image(t,540);
      const same = baseline[t] === sha(data);
      checks.unchangedFrames.push({t, same}); assert(same, 'Unintended change at ' + t);
    }
    // Compare both opening studies in the same page. Switching must reset
    // time, preserve pause state, and leave every later scene identical.
    const openingFrames=[],afterOpening={},openingHashes={};
    for(const kind of ['A','C']){
      await evaluate(`document.querySelector('[data-opening="${kind}"]').click()`);
      const state=await evaluate(`({kind:openingVariant,t:playTime,playing,pressed:document.querySelector('[data-opening="${kind}"]').getAttribute('aria-pressed')})`);
      assert.equal(state.kind,kind);assert.equal(state.t,0);assert.equal(state.playing,false);assert.equal(state.pressed,'true');
      for(const t of [0,.8,1.6,2.1])openingFrames.push({label:kind+' / '+t+'s',image:await image(t,360)});
      openingHashes[kind]=sha(await image(0,540));
      saveImage('opening-'+kind+'.png',await image(0,1080));
      for(const t of [2.2,3.8,5.599,5.6,8.9,10.3,12.8,16,24.8]){
        const hash=sha(await image(t,540));if(kind==='A')afterOpening[t]=hash;else assert.equal(hash,afterOpening[t],'Opening selection leaked into later scene at '+t);
      }
    }
    assert.notEqual(openingHashes.A,openingHashes.C);
    checks.openings={distinct:true,sharedLaterScenes:true,switchResetsTime:true};
    await contact('openings.png',openingFrames,4,270);
    await evaluate(`document.querySelector('[data-opening="A"]').click()`);
    const paired = [];
    for (const frame of before) paired.push(frame, {label: 'REFINED / '+frame.t+'s', image: await image(frame.t)});
    await contact('comparison.png', paired, 2, 360);
    const frames = [];
    for (const t of [0,2.2,2.8,3.3,3.8,4.2,4.9,5.3,5.59,5.6,6.3,6.9,7.8,8.9,9.9,10.3,11.4,16,20.5,24.8]) {
      frames.push({label:t+'s',image:await image(t,360)});
    }
    await contact('keyframes.png',frames,4,270);
    if(process.argv.includes('--full-frames'))for(const t of [3.8,8.9,10.3,16])saveImage('frame-'+t+'.png',await image(t,1080));
    const layouts=[];
    for(const [width,height]of [[390,844],[768,1024],[1440,1000]]){
      await viewport(width,height);
      layouts.push(await evaluate(`({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth})`));
    }
    assert(layouts.every(v=>!v.overflow));checks.layouts=layouts;
    await viewport(390,844);
    checks.controls=await evaluate(`(()=>{
      document.querySelector('[data-time="8"]').click();const chapter=Math.abs(playTime-8)<1e-8&&!playing;
      seek.value='10.3';seek.dispatchEvent(new Event('input'));const scrub=Math.abs(playTime-10.3)<1e-8&&!playing;
      cv.click();const playToggle=playing;cv.click();const pauseToggle=!playing;
      return{chapter,scrub,playToggle,pauseToggle};})()`);
    assert(Object.values(checks.controls).every(Boolean),JSON.stringify(checks.controls));
    const playbacks={};
    if(!quick)for(const kind of ['A','C']){
      await evaluate(`document.querySelector('[data-opening="${kind}"]').click()`);
      const playback=await evaluate(`new Promise(resolve=>{
        const intervals=[],samples=[];update(0);playing=true;lastTime=0;
        let prev=performance.now(),start=prev,previousT=0,next=0,looped=false;
        const capture=()=>{const c=document.createElement('canvas');c.width=180;c.height=320;c.getContext('2d').drawImage(cv,0,0,180,320);
          samples.push({t:playTime,label:playTime.toFixed(2)+'s',image:c.toDataURL('image/jpeg',.85)})};
        function observe(now){intervals.push(now-prev);prev=now;
          if(playTime<previousT-.5)looped=true;
          if(!looped&&playTime>=next){capture();next=playTime+.18}previousT=playTime;
          if(looped||now-start>35000){playing=false;status();intervals.sort((a,b)=>a-b);
            resolve({looped,elapsedMs:now-start,rafMedianMs:intervals[Math.floor(intervals.length*.5)],
              rafP95Ms:intervals[Math.floor(intervals.length*.95)],samples});return;}requestAnimationFrame(observe)
        }requestAnimationFrame(observe);
      })`);
      assert(playback.looped,'Animation did not complete a real-time loop');
      for(let i=0;i<playback.samples.length;i+=36) await contact('playback-'+(kind==='C'?'C-':'')+(i/36+1)+'.png',playback.samples.slice(i,i+36),6,180);
      playback.sampleTimes=playback.samples.map(s=>s.t);delete playback.samples;
      playback.scope='Actual requestAnimationFrame loop with sequential contact sheets; not human continuous viewing or phone hardware validation.';
      playbacks[kind]=playback;
    }
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify({errors,externalRequests:requests,checks,playbacks},null,2)+'\n');
    console.log(JSON.stringify({passed:true,quick,output,loopSeconds:checks.duration,unchangedFrames:checks.unchangedFrames,
      maxStoryRate:Math.max(...checks.rates.map(r=>r.rate)),wind:checks.wind,playbacks:Object.fromEntries(Object.entries(playbacks).map(([kind,p])=>[kind,{looped:p.looped,rafP95Ms:p.rafP95Ms}]))},null,2));
  } finally {
    for(const p of pending.values())clearTimeout(p.timer);
    if(ws)ws.close();chrome.kill();
    await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,3000).unref())]);
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
