#!/usr/bin/env node
// Headless, independent browser profile; never attaches to a user's browser.
// Node 22+. No npm dependencies. Retiming regression against copy baseline b8d9dc9.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=process.env.CHECK_OUTPUT||path.join(root,'reference/yahiko-timing-21s');
const exe=process.env.BROWSER_EXE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/chromium');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'yahiko-timing-'));
 const before=path.join(tmp,'yahiko-before.html');
 fs.writeFileSync(before,execFileSync('git',['show','b8d9dc9:viz/autumn/yahiko-v11-refined.html'],{cwd:root,maxBuffer:8*1024*1024}));
 const chrome=spawn(exe,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+path.join(tmp,'profile'),'about:blank'],{stdio:['ignore','ignore','pipe']});
 const exited=new Promise(resolve=>chrome.once('exit',resolve));
 let ws,seq=0,session;const pending=new Map(),errors=[],requests=[];
 try{
  const endpoint=await new Promise((resolve,reject)=>{
   let log='';const timer=setTimeout(()=>reject(new Error('Browser startup timeout')),20000);
   chrome.once('error',e=>{clearTimeout(timer);reject(e)});
   chrome.stderr.on('data',d=>{log=(log+d).slice(-12000);const m=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1])}});
  });
  ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  ws.onmessage=({data})=>{
   const m=JSON.parse(data);
   if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}}
   else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
   else if(m.method==='Network.requestWillBeSent'&&/^https?:/.test(m.params.request.url))requests.push(m.params.request.url);
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(new Error(method+' timeout')),90000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}))});
  const target=await send('Target.createTarget',{url:'about:blank'});
  session=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value};
  const navigate=async file=>{
   const url=pathToFileURL(file).href+'?record';await send('Page.navigate',{url});
   await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(location.href===${JSON.stringify(url)}&&window.READY){clearInterval(timer);resolve(true)}else if(++n>600){clearInterval(timer);reject(new Error('READY timeout'))}},100)})`);
  };
  const image=async(t,w=360)=>evaluate(`(()=>{render(${t});const c=document.createElement('canvas');c.width=${w};c.height=${w}*16/9;c.getContext('2d').drawImage(cv,0,0,c.width,c.height);return c.toDataURL('image/png')})()`);
  const save=(name,data)=>fs.writeFileSync(path.join(out,name),Buffer.from(data.split(',')[1],'base64'));
  const sheet=async(name,frames,cols=4)=>{
   const data=await evaluate(`(async()=>{const f=${JSON.stringify(frames)},cols=${cols},w=270,h=480,c=document.createElement('canvas');c.width=cols*w;c.height=Math.ceil(f.length/cols)*(h+26);const b=c.getContext('2d');b.fillStyle='#101725';b.fillRect(0,0,c.width,c.height);for(let i=0;i<f.length;i++){const im=new Image();im.src=f[i].image;await im.decode();let x=i%cols*w,y=Math.floor(i/cols)*(h+26);b.drawImage(im,x,y,w,h);b.fillStyle='#fff';b.font='13px sans-serif';b.fillText(f[i].label,x+7,y+h+18)}return c.toDataURL('image/png')})()`);save(name,data);
  };
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  const mapping=t=>Math.round((t<5.6?t:t<8.8?(()=>{const u=(t-5.6)/3.2;return 5.6+3.2*(u-.75*u*u+.5*u*u*u)})():t<15.4?t-.8:14.6+(t-15.4)*10.6/6)*1e9)/1e9;
  const times=[0,1,2.2,3.8,5.599,5.6,6.6,8.79,8.8,10.7,12.2,13.6,15.39,15.4,17.4,19.4,21.39];
  const shotImage=async t=>evaluate(`(()=>{paintShot(screenA,shotAt(${t}),${t});const c=document.createElement('canvas');c.width=540;c.height=960;c.getContext('2d').drawImage(screenA,0,0,540,960);return c.toDataURL()})()`);
  const copyMeta=()=>evaluate(`({story:STORY_C.map(s=>s[2]),headlineStrings:titlesC.toString().match(/'[^']*'/g),endCardStrings:endCardC.toString().match(/'[^']*'/g),fonts:FONT_DATA})`);
  await navigate(before);const oldCopy=await copyMeta(),baseline={};
  for(const t of times)baseline[t]=hash(await shotImage(mapping(t)));
  await navigate(path.join(root,'viz/autumn/yahiko-v11-refined.html'));
  assert.deepEqual(await copyMeta(),oldCopy,'Approved copy, font data, or headline wording changed');
  const checks=await evaluate(`(()=>{
    render(17.4);const a=cv.toDataURL();render(5.6);render(17.4);
    return{duration:T,plan:PLAN,deterministic:a===cv.toDataURL(),fonts:document.fonts.status,
      sourceTimes:[5.6,8.8,12.2,15.4,21.4].map(t=>({t,source:sourceTime(t)})),
      gateSpeed:[5.6,8.8].map(t=>(sourceTime(t+.0001)-sourceTime(t-.0001))/.0002),
      narration:STORY_C.map(([from,to,text],i)=>({from,to,text,seconds:(STORY_C[i+1]?.[0]??T)-Math.max(0,from)}))};
  })()`);
  assert.equal(checks.duration,21.4);assert(checks.deterministic);assert.equal(checks.fonts,'loaded');
  assert.deepEqual(checks.plan,[['overview',0,2.2],['night',2.2,5.6],['torii',5.6,8.8],['glade',8.8,12.2],['ascent',12.2,15.4],['sunset',15.4,21.4]]);
  assert(checks.gateSpeed.every(v=>Math.abs(v-1)<.001),'Gate time warp should retain entry/exit velocity');
  checks.sceneFrames=[];
  for(const t of times){const same=baseline[t]===hash(await shotImage(t));checks.sceneFrames.push({t,source:mapping(t),same});assert(same,'Drawing changed instead of retiming at '+t)}
  checks.controls=await evaluate(`(()=>{const targets=[...document.querySelectorAll('[data-time]')].map(b=>{b.click();return {expected:Number(b.dataset.time),actual:playTime,paused:!playing}});document.getElementById('watch-end').click();const watchEnd=playTime;playing=false;update(21.39);return {targets,watchEnd,seekMax:Number(seek.max),loop:window.LOOP_SECONDS,clock:clock.textContent}})()`);
  assert(checks.controls.targets.every(p=>Math.abs(p.expected-p.actual)<1e-8&&p.paused));assert(Math.abs(checks.controls.watchEnd-12.2)<1e-8);assert.equal(checks.controls.seekMax,21.39);assert.equal(checks.controls.loop,21.4);
  const frames=[];for(const t of [0,3.8,5.6,6.6,7.8,8.79,8.8,10.7,12.2,13.6,15.39,15.4,16.4,17.8,18.8,19.8,20.8,21.39])frames.push({label:t+'s',image:await image(t)});await sheet('keyframes.png',frames,4);
  checks.layouts=[];for(const [width,height]of [[390,844],[768,1024],[1440,1000]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});const p=await evaluate('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth})');assert(!p.overflow);checks.layouts.push(p)}
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  let playback=null;
  if(!process.argv.includes('--quick')){
    playback=await evaluate(`new Promise(resolve=>{const samples=[],start=performance.now();let next=0,prevT=0,looped=false;update(0);playing=true;lastTime=0;function observe(now){if(playTime<prevT-.5)looped=true;prevT=playTime;if(!looped&&playTime>=next){const c=document.createElement('canvas');c.width=180;c.height=320;c.getContext('2d').drawImage(cv,0,0,180,320);samples.push({label:playTime.toFixed(2)+'s',image:c.toDataURL('image/jpeg',.85)});next=playTime+.25}if(looped||now-start>30000){playing=false;status();resolve({elapsed:(now-start)/1000,looped,samples})}else requestAnimationFrame(observe)}requestAnimationFrame(observe)})`);
    assert(playback.looped);for(let i=0;i<playback.samples.length;i+=24)await sheet('playback-'+(i/24+1)+'.png',playback.samples.slice(i,i+24),4);playback.sampleCount=playback.samples.length;delete playback.samples;
    playback.scope='Actual native playback loop and sequential samples; not phone hardware or human continuous-video validation.';
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({baseline:'b8d9dc9',copyUnchanged:true,errors,externalRequests:requests,checks,playback},null,2)+'\n');
  console.log(JSON.stringify({passed:true,output:out,duration:checks.duration,plan:checks.plan,copyUnchanged:true,sceneSamples:checks.sceneFrames.length,controls:checks.controls,playback},null,2));
 }finally{for(const p of pending.values())clearTimeout(p.timer);if(ws)ws.close();chrome.kill();await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,3000).unref())]);fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
})().catch(e=>{console.error(e);process.exitCode=1});
