#!/usr/bin/env node
// Node 22+, installed Chrome/Chromium. No npm dependencies.
// Hardware output is muted during tests; this is NOT a listening certification.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
const audioPage=process.env.AUDIO_PAGE||'yahiko-v11-ambient.html';
if(!/^[a-z0-9-]+\.html$/.test(audioPage))throw new Error('AUDIO_PAGE must be an HTML basename');
const output=process.env.CHECK_OUTPUT||path.join(root,'reference',path.basename(audioPage,'.html'));
fs.mkdirSync(output,{recursive:true});
const browser=process.env.BROWSER_EXE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/chromium');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'yahiko-audio-check-'));
 const proc=spawn(browser,['--headless=new','--disable-gpu','--mute-audio','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 const exited=new Promise(resolve=>proc.once('exit',resolve));
 let ws;const pending=new Map(),errors=[],network=[],warnings=[];
 try{
  const endpoint=await new Promise((resolve,reject)=>{
   let s='';const timer=setTimeout(()=>reject(new Error('Browser startup timeout')),20000);
   proc.once('error',e=>{clearTimeout(timer);reject(e)});
   proc.stderr.on('data',b=>{s=(s+b).slice(-12000);const m=s.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1])}});
   proc.once('exit',code=>{clearTimeout(timer);reject(new Error('Chrome exited '+code))});
  });
  ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  let id=0,session;
  ws.onmessage=({data})=>{const m=JSON.parse(data);
   if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}}
   else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
   else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='warning')warnings.push(m.params.args.map(x=>x.value).join(' '));
   else if(m.method==='Network.requestWillBeSent'&&/^https?:/.test(m.params.request.url))network.push(m.params.request.url);
  };
  const send=(method,params={},timeout=90000)=>new Promise((resolve,reject)=>{
   const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(new Error(method+' timeout'))},timeout);
   pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params,...(session?{sessionId:session}:{})}));
  });
  const target=await send('Target.createTarget',{url:'about:blank'});
  session=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  const evaluate=async(expression,gesture=false)=>{
   const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:gesture});
   if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;
  };
  const wait=async(expression,ms=6000)=>evaluate(`new Promise((resolve,reject)=>{const start=performance.now(),timer=setInterval(()=>{
    if(${expression}){clearInterval(timer);resolve(true)}else if(performance.now()-start>${ms}){clearInterval(timer);reject(new Error('Condition timeout'))}},20)})`);
  const delay=ms=>evaluate(`new Promise(r=>setTimeout(r,${ms}))`);
  const navigate=async(name,query='?record')=>{
   await send('Page.navigate',{url:pathToFileURL(path.join(root,'viz/autumn',name)).href+query});
   await wait(`location.pathname.endsWith(${JSON.stringify(name)})&&window.READY`,80000);
  };
  const click=async selector=>{
   const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
   await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
  };
  const frame=async t=>evaluate(`(()=>{render(${t});const c=document.createElement('canvas');c.width=540;c.height=960;c.getContext('2d').drawImage(cv,0,0,540,960);return c.toDataURL()})()`);
  const times=[0,2.8,4.2,5.59,5.6,6.9,8.9,10.3,11.4,12.8,16,20.5,24.8],baseline={};
  await navigate('yahiko-v11-refined.html');for(const t of times)baseline[t]=hash(await frame(t));
  const baselineC={};await navigate('yahiko-v11-refined.html','?opening=C&record');
  for(const t of [0,1,2.19])baselineC[t]=hash(await frame(t));
  await navigate(audioPage);
  const checks={};
  checks.initial=await evaluate('ambience.snapshot()');
  assert.equal(checks.initial.contextState,'uncreated');assert(!checks.initial.enabled);
  checks.visualIdentity=[];
  for(const t of times){const same=baseline[t]===hash(await frame(t));assert(same,'Pixels changed at '+t);checks.visualIdentity.push({t,same})}
  await click('[data-opening="C"]');checks.openingC=[];
  for(const t of [0,1,2.19]){const same=baselineC[t]===hash(await frame(t));assert(same,'C pixels changed at '+t);checks.openingC.push({t,same})}
  await click('[data-opening="A"]');assert.equal(await evaluate('openingVariant'),'A');
  // Real input click unlocks Web Audio. Turn on and then pause while decode is in flight.
  const firstAuditionOffset=await evaluate("soundButton.textContent==='从头试听'?0:5");
  await evaluate('update(5)');await click('#sound');await click('#play');
  await wait('ambience.snapshot().ready');await delay(100);
  checks.pauseDuringLoad=await evaluate('({playing,t:playTime,...ambience.snapshot()})');
  assert(!checks.pauseDuringLoad.playing);assert(!checks.pauseDuringLoad.hasVoice);
  // Resume from the paused timestamp rather than the click's stale offset.
  await click('#play');await wait('ambience.snapshot().hasVoice');await delay(200);
  checks.resumed=await evaluate('({playing,t:playTime,...ambience.snapshot()})');
  assert(checks.resumed.position>firstAuditionOffset&&checks.resumed.position<firstAuditionOffset+1);assert.equal(checks.resumed.voices,1);
  checks.firstAuditionOffset=firstAuditionOffset;
  assert(Math.abs(checks.resumed.t-checks.resumed.position)<.1);
  assert(Math.abs(checks.resumed.decodedDuration-25.2)<1/44100);
  // Stop, scrub and restart must not leave a hidden voice running.
  await click('#play');await delay(80);const paused=await evaluate('playTime');await delay(200);
  assert(Math.abs(await evaluate('playTime')-paused)<.001);
  assert.equal(await evaluate('ambience.snapshot().voices'),0);
  await evaluate(`seek.value='12.4';seek.dispatchEvent(new Event('input'))`);
  assert(Math.abs(await evaluate('playTime')-12.4)<.001);
  await click('#play');await delay(150);
  checks.scrub=await evaluate('({t:playTime,...ambience.snapshot()})');
  assert(checks.scrub.position>=12.4&&checks.scrub.position<13);assert.equal(checks.scrub.voices,1);
  // Mute retains picture playback; unmute rejoins the CURRENT picture time.
  await click('#sound');await delay(80);const mutedTime=await evaluate('playTime');await delay(200);
  assert(await evaluate('playTime')>mutedTime);assert.equal(await evaluate('ambience.snapshot().voices'),0);
  await click('#sound');await wait('ambience.snapshot().hasVoice');await delay(50);
  checks.unmute=await evaluate('({t:playTime,...ambience.snapshot()})');
  assert(Math.abs(checks.unmute.t-checks.unmute.position)<.1);
  // Repeated transport commands, with short fades, settle to one active voice.
  await evaluate(`for(let i=0;i<8;i++)document.getElementById('restart').click()`);await delay(100);
  assert.equal(await evaluate('ambience.snapshot().voices'),1);
  await click('[data-time="8"]');await delay(80);
  assert.equal(await evaluate('ambience.snapshot().voices'),0);
  assert(Math.abs(await evaluate('playTime')-8)<.001);
  await click('#watch-end');await delay(150);
  assert(await evaluate('playTime')>11.4&&await evaluate('playTime')<12);
  await click('[data-opening="C"]');await delay(100);
  assert.equal(await evaluate('openingVariant'),'C');assert(await evaluate('ambience.snapshot().position')<.5);
  assert(await evaluate('playing&&ambience.snapshot().hasVoice'));
  await click('[data-opening="A"]');await delay(100);
  assert.equal(await evaluate('openingVariant'),'A');assert(await evaluate('ambience.snapshot().position')<.5);
  checks.openingSoundSync=true;
  // Simulated visibility events exercise the same handler; not mobile hardware testing.
  await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))`);
  await delay(100);const hiddenTime=await evaluate('playTime');await delay(200);
  assert(Math.abs(await evaluate('playTime')-hiddenTime)<.001);assert.equal(await evaluate('ambience.snapshot().voices'),0);
  await evaluate(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`);await wait('ambience.snapshot().hasVoice');
  await delay(100);assert(await evaluate('playTime')>hiddenTime);
  checks.visibilityPauseResume=true;
  // Actual HTML playback for one complete loop with Web Audio as master clock.
  await click('#restart');
  checks.playback=await evaluate(`new Promise(resolve=>{
   let previous=playTime,start=performance.now(),maxDrift=0,maxVoices=0,looped=false;
   const timer=setInterval(()=>{const a=ambience.snapshot();const d=Math.abs(playTime-a.position);
    maxDrift=Math.max(maxDrift,Math.min(d,T-d));maxVoices=Math.max(maxVoices,a.voices);
    if(playTime<previous-.5)looped=true;previous=playTime;
    if(looped||performance.now()-start>33000){clearInterval(timer);resolve({looped,elapsedMs:performance.now()-start,maxDrift,maxVoices})}
   },40);
  })`);
  assert(checks.playback.looped);assert(checks.playback.maxDrift<.12);assert.equal(checks.playback.maxVoices,1);
  await click('#play');await delay(100);
  checks.controls=true;
  // Independent instance: double-toggle cancellation and decode failure fallback.
  checks.cancelLoad=await evaluate(`(async()=>{
    let p=createAmbiencePlayer({base64:AMBIENCE_DATA,duration:T,getTime:()=>2,shouldPlay:()=>true});
    const first=p.setEnabled(true);await p.setEnabled(false);await first;
    const result=p.snapshot();await p.destroy();return result;
  })()`,true);
  assert(!checks.cancelLoad.enabled&&!checks.cancelLoad.hasVoice);
  checks.decodeFailure=await evaluate(`(async()=>{
    let handled=false;const p=createAmbiencePlayer({base64:'invalid!',duration:T,getTime:()=>0,shouldPlay:()=>true,onError:()=>handled=true});
    await p.setEnabled(true);const result={...p.snapshot(),handled};await p.destroy();return result;
  })()`,true);
  assert(checks.decodeFailure.handled&&!checks.decodeFailure.enabled&&!checks.decodeFailure.hasVoice);
  checks.interruption=await evaluate(`(async()=>{
    const Native=window.AudioContext;let captured,p;
    try{
      window.AudioContext=function(...args){captured=new Native(...args);return captured};
      p=createAmbiencePlayer({base64:AMBIENCE_DATA,duration:T,getTime:()=>4,shouldPlay:()=>true});
      await p.setEnabled(true);await new Promise(r=>setTimeout(r,70));
      await captured.suspend();const before=p.clock(99);await new Promise(r=>setTimeout(r,150));
      const frozen=p.clock(99);await captured.resume();await new Promise(r=>setTimeout(r,100));
      return{frozen:Math.abs(before-frozen)<.001,resumed:p.clock(99)>frozen,voices:p.snapshot().voices};
    }finally{window.AudioContext=Native;if(p)await p.destroy()}
  })()`,true);
  assert(checks.interruption.frozen&&checks.interruption.resumed&&checks.interruption.voices===1);
  checks.unsupported=await evaluate(`(async()=>{
    const Native=window.AudioContext,Webkit=window.webkitAudioContext;let p,handled=false;
    try{window.AudioContext=undefined;window.webkitAudioContext=undefined;
      p=createAmbiencePlayer({base64:AMBIENCE_DATA,duration:T,getTime:()=>0,shouldPlay:()=>true,onError:()=>handled=true});
      await p.setEnabled(true);return{...p.snapshot(),handled};
    }finally{window.AudioContext=Native;window.webkitAudioContext=Webkit;if(p)await p.destroy()}
  })()`,true);
  assert(checks.unsupported.handled&&!checks.unsupported.enabled&&checks.unsupported.contextState==='uncreated');
  checks.layouts=[];
  for(const [width,height]of [[390,844],[768,1024],[1440,1000]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   const item=await evaluate('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth})');
   checks.layouts.push(item);assert(!item.overflow);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate(`window.scrollTo(0,0);playing=false;update(5.6)`);
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'player.png'),Buffer.from(shot.data,'base64'));
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate(audioPage,'');
  checks.reducedMotion=await evaluate('({playing,...ambience.snapshot()})');assert(!checks.reducedMotion.playing);assert.equal(checks.reducedMotion.contextState,'uncreated');
  await send('Emulation.setEmulatedMedia',{features:[]});await navigate(audioPage,'');await delay(200);
  checks.defaultPlayback=await evaluate('({playing,t:playTime,...ambience.snapshot()})');
  assert(checks.defaultPlayback.playing);assert(!checks.defaultPlayback.enabled);assert.equal(checks.defaultPlayback.contextState,'uncreated');
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify({checks,errors,externalRequests:network,warnings,
   scope:'Automated Chrome Web Audio/transport/pixel verification; hardware output muted. Not a listening test or Safari/phone certification.'},null,2)+'\n');
  console.log(JSON.stringify({passed:true,visualFrames:times.length,duration:checks.resumed.decodedDuration,playback:checks.playback,
   initialAudio:checks.initial.contextState,externalRequests:network.length,errors:errors.length,output},null,2));
 }finally{
  for(const p of pending.values())clearTimeout(p.timer);
  if(ws)ws.close();proc.kill();await Promise.race([exited,new Promise(r=>setTimeout(r,3000).unref())]);
  fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});
 }
})().catch(e=>{console.error(e);process.exitCode=1});
