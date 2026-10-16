const fs=require('fs');const dir=process.argv[2];
const calcs={};global.dash={calc:(id,o)=>calcs[id]=o,onData:()=>{},colors:[]};
global.document={getElementById:()=>({addEventListener(){}}),querySelectorAll:()=>[],querySelector:()=>({lang:'x'})};global.d3={format:()=>x=>x};
global.getComputedStyle=()=>({getPropertyValue:()=>''});
eval(fs.readFileSync(dir+'/page.js','utf8'));
const out={};const L=n=>out[n]||JSON.parse(fs.readFileSync(dir+'/'+n+'.json','utf8'));
for(const [id,o] of Object.entries(calcs)){out[id]=o.fn(...o.inputs.map(L));}
console.log(JSON.stringify(out.c_pref_sum));
const n=out.c_pref.find(r=>r.code==='p15');console.log(JSON.stringify(n));
console.log(out.c_pref.filter(r=>r.share_rank<=3||r.share_rank>=46).map(r=>r.share_rank+':'+r.name+' '+r.share).join(' | '));
