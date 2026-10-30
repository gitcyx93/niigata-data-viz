#!/usr/bin/env node
// Headless, independent browser profile; never attaches to a user's browser.
// Node 22+. Script/font check only: no screenshots, pixel comparisons or playback.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=process.env.CHECK_OUTPUT||path.join(root,'reference/three-films-copy');
const exe=process.env.BROWSER_EXE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/chromium');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'yuzawa-check-'));
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
  const results=[];
  const pages=['viz/autumn/yahiko-v11-refined.html','viz/autumn/yahiko-v11-refined-tw.html','viz/spring/takada-yozakura-v2.html','viz/spring/takada-yozakura-v2-tw.html','viz/winter/yuzawa-yukiguni.html','viz/winter/yuzawa-yukiguni-tw.html'];
  for(const file of pages){
    await navigate(path.join(root,file));
    const result=await evaluate(`(()=>{
      let frames=0;for(let t=0;t<T;t+=.5){render(t);frames++}
      const story=typeof STORY_C!=='undefined'?STORY_C:STORY;
      const words=story.map(s=>s[2]);
      if(typeof HEADLINES!=='undefined')for(const row of HEADLINES){const a=typeof row==='function'?row(palette(5)):row;words.push(a[0].map(s=>s[0]).join(''),a[1])}
      if(typeof titlesC!=='undefined'){for(const m of titlesC.toString().matchAll(/'([^']*)'/g))words.push(m[1]);for(const m of endCardC.toString().matchAll(/'([^']*)'/g))words.push(m[1])}
      const ranges=FONT_DATA.flatMap(f=>f[2].split(',').map(r=>r.trim().replace(/^U\\+/i,'').split('-').map(v=>parseInt(v,16))));
      const missing=[...new Set(words.join(''))].filter(c=>c.codePointAt(0)>127&&!ranges.some(([a,b=a])=>c.codePointAt(0)>=a&&c.codePointAt(0)<=b));
      return{duration:T,frames,fonts:document.fonts.status,missing,lang:document.documentElement.lang,story:story.map(s=>({from:s[0],to:s[1],text:s[2]})),words};
    })()`);
    assert.equal(result.fonts,'loaded');assert.deepEqual(result.missing,[],file+' missing glyphs');results.push({file,...result});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(requests,[]);
  fs.writeFileSync(path.join(out,'script-check.json'),JSON.stringify({screenshots:false,fullPlayback:false,results,errors,consoleErrors,externalRequests:requests},null,2)+'\n');
  console.log(JSON.stringify({passed:true,screenshots:false,fullPlayback:false,pages:results.map(p=>({file:p.file,duration:p.duration,frames:p.frames,fonts:p.fonts,missing:p.missing}))},null,2));
 }finally{for(const p of pending.values())clearTimeout(p.timer);if(ws)ws.close();chrome.kill();await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,3000).unref())]);fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
})().catch(e=>{console.error(e);process.exitCode=1});
