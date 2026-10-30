#!/usr/bin/env node
// Headless, independent browser profile; never attaches to a user's browser.
// Node 22+. No npm dependencies. Baseline is the pre-dedup repository version.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=process.env.CHECK_OUTPUT||path.join(root,'reference/takada-dedup');
const exe=process.env.BROWSER_EXE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/chromium');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'takada-check-'));
 const before=path.join(tmp,'takada-before.html');
 fs.writeFileSync(before,execFileSync('git',['show','1ee8c25:viz/spring/takada-yozakura-v2.html'],{cwd:root,maxBuffer:8*1024*1024}));
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
  await navigate(before);
  const unchangedTimes=[0,.5,2.5,4.99,5,6.5,8.99,9,11,12.99],baseline={},original=[];
  for(const t of unchangedTimes)baseline[t]=hash(await image(t,540));
  for(const t of [0,13,15,17,19.8,19.95])original.push({t,label:'BEFORE / '+t+'s',image:await image(t)});
  const metadata=await evaluate('({story:STORY,headlines:HEADLINES,duration:T})');
  await navigate(path.join(root,'viz/spring/takada-yozakura-v2.html'));
  const checks=await evaluate(`(()=>{
   const cameras=[13,14,15,16,17,18,19,19.99].map(t=>{const c=camAt(t);return{t,...c,top:c.y-H/(2*c.z),bottom:c.y+H/(2*c.z),left:c.x-W/(2*c.z),right:c.x+W/(2*c.z)}});
   render(18);const first=cv.toDataURL();render(14);render(18);
   return{story:STORY,headlines:HEADLINES,duration:T,fonts:document.fonts.status,cameras,deterministic:first===cv.toDataURL(),water:WATER,castleBase:CASTLE.base,castleX:CASTLE.x};
  })()`);
  assert.deepEqual({story:checks.story,headlines:checks.headlines,duration:checks.duration},metadata);
  assert.equal(checks.fonts,'loaded');assert(checks.deterministic);
  assert(checks.cameras.every((c,i)=>c.top>checks.castleBase&&c.left>=0&&c.right<checks.castleX-200&&c.bottom<=2900&&(!i||(c.z>checks.cameras[i-1].z&&c.y>checks.cameras[i-1].y))), 'Ending must stay off the castle and move toward the water');
  checks.unchangedFrames=[];
  for(const t of unchangedTimes){const same=baseline[t]===hash(await image(t,540));assert(same,'Unintended change before 13s at '+t);checks.unchangedFrames.push({t,same})}
  const pairs=[];for(const f of original)pairs.push(f,{label:'AFTER / '+f.t+'s',image:await image(f.t)});await sheet('comparison.png',pairs,2);
  const frames=[];for(const t of [0,4,6,10,12.99,13,14.5,16,17.5,18.5,19.5,19.95])frames.push({label:t+'s',image:await image(t)});await sheet('keyframes.png',frames);
  for(const t of [13,17,19.8])save('frame-'+t+'.png',await image(t,1080));
  // No cover caption should reappear over the ending just before loop reset.
  checks.noCoverPreroll=await evaluate(`(()=>{const fn=headline,called=[];headline=(s,segs,sub)=>{if(s)called.push(sub)};try{render(19.95)}finally{headline=fn}return !called.includes('高田城址公园 三重橹')})()`);assert(checks.noCoverPreroll);
  let playback=null;
  if(!process.argv.includes('--quick')){
   playback=await evaluate(`new Promise(resolve=>{const start=performance.now(),samples=[];let next=0,frames=0;function tick(now){const elapsed=(now-start)/1000;render(elapsed);frames++;if(elapsed>=next&&elapsed<20){const c=document.createElement('canvas');c.width=180;c.height=320;c.getContext('2d').drawImage(cv,0,0,180,320);samples.push({label:elapsed.toFixed(2)+'s',image:c.toDataURL('image/jpeg',.85)});next=elapsed+.35}if(elapsed>=20.2)resolve({elapsed,frames,samples});else requestAnimationFrame(tick)}requestAnimationFrame(tick)})`);
   assert(playback.frames>20&&playback.elapsed>=20);
   for(let i=0;i<playback.samples.length;i+=24)await sheet('playback-'+(i/24+1)+'.png',playback.samples.slice(i,i+24),4);
   playback.sampleCount=playback.samples.length;delete playback.samples;
   playback.scope='Real-time requestAnimationFrame-driven render(t) through a loop; not human continuous video viewing or phone hardware validation.';
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({baseline:'1ee8c25',errors,externalRequests:requests,checks,playback},null,2)+'\n');
  console.log(JSON.stringify({passed:true,output:out,unchangedFrames:checks.unchangedFrames,noCoverPreroll:checks.noCoverPreroll,playback},null,2));
 }finally{for(const p of pending.values())clearTimeout(p.timer);if(ws)ws.close();chrome.kill();await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,3000).unref())]);fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
})().catch(e=>{console.error(e);process.exitCode=1});
