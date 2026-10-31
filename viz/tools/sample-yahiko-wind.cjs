#!/usr/bin/env node
// Export the visible wind mass from the actual V11 particle equations, not
// invented timing cues. No browser, canvas, audio generation or external requests.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const file=path.join(root,'viz/autumn/yahiko-v11-refined.html');
const html=fs.readFileSync(file,'utf8');
const start=html.indexOf('const gust=Array.from('),end=html.indexOf('function windLeaves(',start);
if(start<0||end<0)throw new Error('Wind renderer changed; review sampling adapter');
const functions=html.slice(start,end);
const randomDeclaration=html.match(/^const rnd\s*=.*;$/m)?.[0];
if(!randomDeclaration)throw new Error('Random generator changed; inspect sampling adapter');
const samples=vm.runInNewContext(`
 const W=1080,H=1920,TAU=Math.PI*2;
 const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
 const fract=x=>x-Math.floor(x);
 ${randomDeclaration}
 ${functions}
 const result=[];
 for(let i=0;i<=2520;i++){
  const t=i/100;let area=0,weightedX=0,count=0;
  // Only the overview/night/torii render this gust. No sounds for off-screen leaves.
  if(t<8)for(const leaf of gust){
   const p=windLeafState(leaf,t);if(!p)continue;
   const edge=clamp(p.x/80)*clamp((W-p.x)/80)*clamp(p.y/80)*clamp((H-p.y)/80);
   if(!edge)continue;
   const a=p.size*p.size*p.alpha*edge*(.28+.72*Math.abs(Math.cos(p.spin*.71)));
   area+=a;weightedX+=p.x*a;count++;
  }
  result.push({t,area,count,x:area?weightedX/area:W/2});
 }
 result;
`,{}, {timeout:10000});
console.log(JSON.stringify({visualSourceSha256:crypto.createHash('sha256').update(html).digest('hex'),sampleRate:100,samples}));
