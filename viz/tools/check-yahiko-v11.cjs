#!/usr/bin/env node
// Requires playwright through normal resolution or NODE_PATH.
// BROWSER_EXE may point to a local Chrome/Edge; otherwise uses Playwright Chromium.
const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'../..'),out=path.join(root,'reference/yahiko-reviewed-v11');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXE?{executablePath:process.env.BROWSER_EXE}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
 await page.goto(pathToFileURL(path.join(root,'viz/autumn/yahiko-reviewed-v11.html')).href+'?record',{timeout:180000});await page.waitForFunction(()=>window.READY,null,{timeout:180000});
 const checks=await page.evaluate(()=>{
  const original=refinedCabin,track=[];let current;refinedCabin=function(b,x,y,s){const m=b.getTransform();current={x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,sx:m.a*s,sy:m.d*s};return original(b,x,y,s)};
  try{for(const t of [9.8,10.8,11.39,11.4,11.41,12.4,13.4,14.59]){render(t);track.push({t,...current})}}finally{refinedCabin=original}
  const velocities=track.slice(1).map((a,i)=>({vx:(a.x-track[i].x)/(a.t-track[i].t),vy:(a.y-track[i].y)/(a.t-track[i].t)}));
  render(6.9);const first=cv.toDataURL();render(24);render(6.9);const deterministic=first===cv.toDataURL();
  const speed=t=>{const a=cameraState(t,'reveal'),b=cameraState(t+.01,'reveal');return (b.x-a.x)/.01};
  const copy=[...STORY_C.map(s=>s[2]),'十一月 来看红叶','日落约16:25—16:50','新潟市日落参考 · 山顶略有差异','JR弥彦线 约33—42分钟','弥彦神社'];
  const missing=[...new Set(copy.join(''))].filter(c=>!FONT_DATA.some(([family,,range])=>family==='Source Han Sans SC'&&range.split(',').some(r=>{const [a,b]=r.trim().replace('U+','').split('-').map(v=>parseInt(v,16));return c.codePointAt(0)>=a&&c.codePointAt(0)<=(b||a)})));
  return {track,velocities,continuousUphill:velocities.every(v=>v.vx>0&&v.vy<0),uniformCabinScale:track.every(p=>Math.abs(p.sx-p.sy)<1e-5),deterministic,nightCameraSpeedEarly:speed(2.5),nightCameraSpeedLate:speed(5.3),fonts:document.fonts.status,missingGlyphCoverage:missing,overflow:document.documentElement.scrollWidth>innerWidth,storyRates:STORY_C.map(([from,,s],i)=>({s,seconds:(STORY_C[i+1]?.[0]??T)-Math.max(0,from),characters:[...s].length,rate:[...s].length/((STORY_C[i+1]?.[0]??T)-Math.max(0,from))})),cardWidths:[measure('日落约16:25—16:50',60,300,3),measure('新潟市日落参考 · 山顶略有差异',36,400,2)]};
 });
 // Diagnostic closeups: rendered after FontFace loading, at the actual gate pose.
 for(const [name,t,x,y,w,h] of [['plaque',6.9,420,690,210,170],['couple',3.8,535,930,125,160]]){
  const data=await page.evaluate(({t,x,y,w,h})=>{render(t);const c=document.createElement('canvas');c.width=w*3;c.height=h*3;c.getContext('2d').drawImage(cv,x,y,w,h,0,0,w*3,h*3);return c.toDataURL()}, {t,x,y,w,h});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));
 }
 // One whole actual requestAnimationFrame playback, not sequential render(t) calls.
 const playback=await page.evaluate(()=>new Promise(resolve=>{
  const samples=[],intervals=[];update(0);playing=true;lastTime=0;let prev=performance.now(),start=prev,next=0,previousT=0,looped=false;
  const capture=()=>{const c=document.createElement('canvas');c.width=180;c.height=320;c.getContext('2d').drawImage(cv,0,0,180,320);samples.push({t:playTime,image:c.toDataURL()})};capture();next=.2;
  function observe(now){intervals.push(now-prev);prev=now;if(playTime<previousT-.5)looped=true;
   if(!looped&&playTime>=next){capture();next=playTime+.2;}previousT=playTime;
   if(looped||now-start>35000){playing=false;status();intervals.sort((a,b)=>a-b);resolve({samples,looped,elapsedMs:now-start,rafMedianMs:intervals[Math.floor(intervals.length*.5)],rafP95Ms:intervals[Math.floor(intervals.length*.95)],note:'Real-time automated browser playback; contact sheets inspected in time order. This is not a human continuous video-viewing or phone performance certification.'});return;}requestAnimationFrame(observe);
  }requestAnimationFrame(observe);
 }));
 for(let i=0;i<playback.samples.length;i+=36){const group=playback.samples.slice(i,i+36);const data=await page.evaluate(async group=>{const c=document.createElement('canvas');c.width=1080;c.height=Math.ceil(group.length/6)*342;const g=c.getContext('2d');g.fillStyle='#16202b';g.fillRect(0,0,c.width,c.height);for(let i=0;i<group.length;i++){const im=new Image();im.src=group[i].image;await im.decode();const x=(i%6)*180,y=Math.floor(i/6)*342;g.drawImage(im,x,y);g.fillStyle='white';g.font='14px sans-serif';g.fillText(group[i].t.toFixed(2)+'s',x+5,y+337)}return c.toDataURL()},group);fs.writeFileSync(path.join(out,'playback-'+(i/36+1)+'.png'),Buffer.from(data.split(',')[1],'base64'));}
 const sampleTimes=playback.samples.map(s=>s.t);delete playback.samples;
 fs.writeFileSync(path.join(out,'full-validation.json'),JSON.stringify({errors,checks,playback,sampleTimes},null,2));
 if(errors.length||!checks.continuousUphill||!checks.uniformCabinScale||!checks.deterministic||checks.missingGlyphCoverage.length||!playback.looped||checks.storyRates.some(r=>r.rate>4.1))process.exitCode=1;
 }finally{await browser.close()}
})();
