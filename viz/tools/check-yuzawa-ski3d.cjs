#!/usr/bin/env node
// Headless, independent browser profile; never attaches to a user's browser.
// Node 22+. No npm dependencies. Verify Three.js output and protect all non-ski shots against 8184a23.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=process.env.CHECK_OUTPUT||path.join(root,'reference/yuzawa-ski3d');
const exe=process.env.BROWSER_EXE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/chromium');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'yuzawa-check-'));
 const before=path.join(tmp,'yuzawa-before.html');
 fs.writeFileSync(before,execFileSync('git',['show','8184a23:viz/winter/yuzawa-yukiguni.html'],{cwd:root,maxBuffer:8*1024*1024}));
 const chrome=spawn(exe,['--headless=new','--disable-gpu','--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+path.join(tmp,'profile'),'about:blank'],{stdio:['ignore','ignore','pipe']});
 const exited=new Promise(resolve=>chrome.once('exit',resolve));
 let ws,seq=0,session;const pending=new Map(),errors=[],requests=[],consoleErrors=[];
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
   else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value||a.description).join(' '));
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
  const currentFile=path.join(root,'viz/winter/yuzawa-yukiguni.html');
  const oldSource=fs.readFileSync(before,'utf8').replace(/\r\n/g,'\n'),newSource=fs.readFileSync(currentFile,'utf8').replace(/\r\n/g,'\n').replace(/\/\*YUZAWA-SKI3D-START:[\s\S]*?\/\*YUZAWA-SKI3D-END\*\/\n?/, '');
  const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
  assert.equal(section(oldSource,'// ---- 文字 ----','const SKI3D'),section(newSource,'// ---- 文字 ----','const SKI3D'),'Text content, style, positioning and timing must not change');
  assert.equal(section(oldSource,'/*FONTS-START','/*FONTS-END'),section(newSource,'/*FONTS-START','/*FONTS-END'),'Embedded fonts must not change');
  assert.equal(section(oldSource,'const KEYS =','// ======== 渲染 ========'),section(newSource,'const KEYS =','// ======== 渲染 ========'),'Loop camera choreography must not change');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  const unchangedTimes=[0,1.5,3.29,8.7,10.8,13,14.5,16.2,17.8,19.8,19.99],compareTimes=[3.3,4.5,7.5,8.69,8.7,10.8,12.2,13,14.5,16.2],baseline={},original=[];
  const metadata=()=>evaluate(`({duration:T,cheers:CHEERS,story:STORY,windows:TEXT_WINDOWS,headlines:HEADLINES.map(f=>f.toString()),camera:[0,3.3,8.7,13,14.5,16.2,19.99].map(t=>({t,...camAt(t)})),ski:[3.3,4.5,5.5,6.4,7.5,8.69].map(t=>({t,...SKI3D.at(t)}))})`);
  const exposure=()=>evaluate(`(()=>{const src=SKI3D.render(4.5),c=document.createElement('canvas');c.width=1080;c.height=1920;const b=c.getContext('2d');b.drawImage(src,0,0);return [[0,0,1080,550],[40,600,220,350],[350,1100,380,600]].map(([x,y,w,h])=>{const d=b.getImageData(x,y,w,h).data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];return sum/(w*h)})})()`);
  await navigate(before);
  const oldMeta=await metadata(),oldExposure=await exposure();
  for(const t of unchangedTimes)baseline[t]=hash(await image(t,540));
  for(const t of compareTimes)original.push({t,label:'BEFORE / '+t+'s',image:await image(t)});
  await navigate(currentFile);
  const newMeta=await metadata(),newExposure=await exposure();assert.deepEqual(newMeta,oldMeta,'Text, motion and loop metadata changed');
  const sceneInfo=await evaluate('SKI3D.getInfo()');assert(sceneInfo.webgl && sceneInfo.triangles>10000,'Three.js scene must actually render');assert(sceneInfo.triangles<400000,'Keep the scene within the lightweight geometry budget');
  const checks={textSourceIdentical:true,fontsIdentical:true,choreographyIdentical:true,metadata:newMeta,sceneInfo,exposure:{before:oldExposure,after:newExposure},unchangedFrames:[]};
  for(const t of unchangedTimes){const same=baseline[t]===hash(await image(t,540));checks.unchangedFrames.push({t,same});assert(same,'Changed protected opening/loop frame at '+t)}
  checks.deterministic=await evaluate(`(()=>{render(10.8);const a=cv.toDataURL();render(4.5);render(19.8);render(10.8);return a===cv.toDataURL()})()`);assert(checks.deterministic);
  checks.skiDeterministic=await evaluate(`(()=>{render(4.5);const a=cv.toDataURL();render(7.5);render(4.5);return a===cv.toDataURL()})()`);assert(checks.skiDeterministic);
  checks.groundContact=await evaluate(`[3.3,3.8,4.5,5.5,6.4,6.9,7.5,8.69].map(t=>{SKI3D.render(t);return SKI3D.getInfo()})`);
  assert(checks.groundContact.every(p=>p.contactGaps.every(gap=>Math.abs(gap)<.05)),'Skis must remain close to the terrain');
  assert(checks.groundContact.every(p=>p.screenBounds.left>-80&&p.screenBounds.right<1160&&p.screenBounds.bottom<1420),'Actor must not leave the frame or collide with the lower headline');
  checks.fonts=await evaluate('document.fonts.status');assert.equal(checks.fonts,'loaded');
  const motion=[];for(let i=0;i<=30;i++){const t=3.3+i*(5.39/30);motion.push({label:t.toFixed(2)+'s',image:await image(t)})}await sheet('ski-motion.png',motion,4);
  const pairs=[];for(const f of original)pairs.push(f,{label:'AFTER / '+f.t+'s',image:await image(f.t)});await sheet('comparison.png',pairs,2);
  const frames=[];for(const t of [0,3.3,4.5,5.5,6.7,7.5,8.69,8.7,9.8,10.8,12.2,13,14,15,16.2,19.8])frames.push({label:t+'s',image:await image(t)});await sheet('keyframes.png',frames);
  for(const t of [3.3,4.5,5.5,6.7,7.5,8.69])save('frame-'+t+'.png',await image(t,1080));
  checks.layouts=[];for(const [width,height]of [[390,844],[768,1024],[1440,1000]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});const layout=await evaluate('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth})');assert(!layout.overflow);checks.layouts.push(layout)}
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  let playback=null;
  if(!process.argv.includes('--quick')){
   playback=await evaluate(`new Promise(resolve=>{const start=performance.now(),samples=[];let next=0,frames=0;function tick(now){const elapsed=(now-start)/1000;render(elapsed);frames++;if(elapsed>=next&&elapsed<20){const c=document.createElement('canvas');c.width=180;c.height=320;c.getContext('2d').drawImage(cv,0,0,180,320);samples.push({label:elapsed.toFixed(2)+'s',image:c.toDataURL('image/jpeg',.85)});next=elapsed+.3}if(elapsed>=20.2)resolve({elapsed,frames,samples});else requestAnimationFrame(tick)}requestAnimationFrame(tick)})`);
   assert(playback.frames>20&&playback.elapsed>=20);
   for(let i=0;i<playback.samples.length;i+=24)await sheet('playback-'+(i/24+1)+'.png',playback.samples.slice(i,i+24),4);
   playback.sampleCount=playback.samples.length;delete playback.samples;
   playback.scope='Actual RAF-driven render(t) through the 20s loop; not human continuous video viewing or phone hardware validation.';
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.deepEqual(consoleErrors,[]);
  fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({baseline:'8184a23',errors,consoleErrors,externalRequests:requests,checks,playback},null,2)+'\n');
  console.log(JSON.stringify({passed:true,output:out,textUnchanged:true,choreographyUnchanged:true,exposure:checks.exposure,unchangedFrames:checks.unchangedFrames,playback},null,2));
 }finally{for(const p of pending.values())clearTimeout(p.timer);if(ws)ws.close();chrome.kill();await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,3000).unref())]);fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
})().catch(e=>{console.error(e);process.exitCode=1});
