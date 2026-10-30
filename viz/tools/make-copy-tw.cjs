#!/usr/bin/env node
// Update only embedded fonts and generate Taiwan-localised copies.
// Unlike embed-font.py this never replaces SERIES or any scene/Three.js code.
// Dependencies: @fontsource-variable/noto-sans-sc@5.3.1,
// @fontsource-variable/noto-sans-tc@5.3.1, opencc-js@1.0.5 (NODE_PATH allowed).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {Converter}=require('opencc-js');
const convert=Converter({from:'cn',to:'twp'});
const marker=/\/\*FONTS-START[\s\S]*?\/\*FONTS-END\*\//;
const supplemental=/FONT_DATA\.push\(\[[\s\S]*?\]\);/g;
const protectedBlock=/\/\*(?:SERIES-START|YUZAWA-SKI3D-START)[\s\S]*?\/\*(?:SERIES-END|YUZAWA-SKI3D-END)\*\//g;
function embed(html,tw){
 const block=html.match(marker)?.[0];if(!block)throw new Error('Missing font marker');
 const sandbox={};vm.runInNewContext(block+';this.faces=FONT_DATA;',sandbox,{timeout:2000});
 const faces=Array.from(sandbox.faces).filter(f=>f[0]==='Sora').map(f=>Array.from(f));
 if(!faces.length)throw new Error('Keep the existing Sora font data');
 html=html.replace(supplemental,'');
 const source=html.replace(marker,'').replace(protectedBlock,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 const chars=new Set([...source].map(c=>c.codePointAt(0)));
 const family=tw?'Source Han Sans TC':'Source Han Sans SC';
 const cssPath=require.resolve('@fontsource-variable/noto-sans-'+(tw?'tc':'sc')+'/wght.css');
 for(const m of fs.readFileSync(cssPath,'utf8').matchAll(/@font-face\s*\{([\s\S]*?)\}/g)){
  const range=m[1].match(/unicode-range:\s*([^;]+)/)?.[1],url=m[1].match(/url\(([^)]+)\)/)?.[1];if(!range||!url)continue;
  const ranges=range.split(',').map(r=>r.trim().replace(/^U\+/i,'').split('-').map(v=>parseInt(v,16)));
  if(![...chars].some(c=>ranges.some(([a,b=a])=>c>=a&&c<=b)))continue;
  faces.push([family,'100 900',range,fs.readFileSync(path.resolve(path.dirname(cssPath),url.replace(/^['"]|['"]$/g,''))).toString('base64')]);
 }
 const fontBlock='/*FONTS-START '+family+'|Sora*/\nconst FONT_DATA = '+JSON.stringify(faces)+';\n/*FONTS-END*/';
 return html.replace(marker,()=>fontBlock);
}
function taiwan(html){
 const blocks=[];const protect=b=>{const token='__NIIGATA_PROTECTED_'+blocks.length+'__';blocks.push(b);return token};
 html=html.replace(marker,protect).replace(protectedBlock,protect);
 html=convert(html);
 for(const [a,b]of [
  ['高田辦觀櫻會','高田舉辦觀櫻會'],['1926 年辦起，一百多屆了。','1926 年開辦，已逾百屆。'],
  ['坐電車','搭電車'],['坐上越新幹線','搭上越新幹線'],['坐新幹線','搭新幹線'],['坐纜車','搭纜車'],['坐大巴','搭巴士'],
  ['約 10 米','約 10 公尺'],['634 米','634 公尺'],['高田站走過去約 15 分鐘。','從高田站步行約 15 分鐘。']
 ])html=html.split(a).join(b);
 html=html.replace(/__NIIGATA_PROTECTED_(\d+)__/g,(_,i)=>blocks[Number(i)]);
 for(const [a,b]of [['lang="zh-CN"','lang="zh-TW"'],['Source Han Sans SC','Source Han Sans TC'],['Noto Sans SC','Noto Sans TC'],['PingFang SC','PingFang TC'],['Microsoft YaHei','Microsoft JhengHei']])html=html.split(a).join(b);
 return html;
}
for(const arg of process.argv.slice(2)){
 const file=path.resolve(arg);let html=embed(fs.readFileSync(file,'utf8'),false);fs.writeFileSync(file,html);
 const out=file.replace(/\.html$/,'-tw.html');fs.writeFileSync(out,embed(taiwan(html),true));
 console.log(path.basename(file)+' + '+path.basename(out));
}
