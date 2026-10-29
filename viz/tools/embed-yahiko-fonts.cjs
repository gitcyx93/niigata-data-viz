#!/usr/bin/env node
// Independent Yahiko builds: refresh font data without overwriting the local
// narration/animation code with series.js. Dependencies (external NODE_PATH is OK):
// @fontsource-variable/noto-sans-sc@5.3.1, @fontsource-variable/sora@5.2.6 (SIL OFL).
// Usage: node viz/tools/embed-yahiko-fonts.cjs viz/autumn/yahiko-reviewed-v11.html
// Embeds complete, published unicode chunks rather than subsetting glyphs.
const fs=require('node:fs'),path=require('node:path');
const file=process.argv[2];if(!file)throw new Error('Pass an HTML path');
const html=fs.readFileSync(file,'utf8'),marker=/\/\*FONTS-START[\s\S]*?\/\*FONTS-END\*\//;
if(!marker.test(html))throw new Error('No embedded font marker');
const source=html.replace(marker,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
const chars=new Set([...source].map(c=>c.codePointAt(0))),faces=[];
for(const [pkg,family,weight] of [['noto-sans-sc','Source Han Sans SC','100 900'],['sora','Sora','100 800']]){
 const cssPath=require.resolve('@fontsource-variable/'+pkg+'/wght.css');
 for(const match of fs.readFileSync(cssPath,'utf8').matchAll(/@font-face\s*\{([\s\S]*?)\}/g)){
  const block=match[1],range=block.match(/unicode-range:\s*([^;]+)/)?.[1],url=block.match(/url\(([^)]+)\)/)?.[1];if(!range||!url)continue;
  const ranges=range.split(',').map(r=>r.trim().replace(/^U\+/i,'').split('-').map(v=>parseInt(v,16)));
  if(![...chars].some(c=>ranges.some(([a,b=a])=>c>=a&&c<=b)))continue;
  faces.push([family,weight,range,fs.readFileSync(path.resolve(path.dirname(cssPath),url)).toString('base64')]);
 }
}
if(!faces.some(f=>f[0]==='Source Han Sans SC')||!faces.some(f=>f[0]==='Sora'))throw new Error('Missing font family');
const fontBlock='/*FONTS-START Source Han Sans SC|Sora*/\nconst FONT_DATA = '+JSON.stringify(faces,null,0)+';\n/*FONTS-END*/';
fs.writeFileSync(file,html.replace(marker,()=>fontBlock));console.log(`Embedded ${faces.length} complete unicode chunks into ${file}`);
