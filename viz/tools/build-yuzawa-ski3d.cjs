#!/usr/bin/env node
// Build a pinned, offline Three.js scene into the existing standalone HTML.
// Dependencies: three@0.180.0, esbuild@0.25.10; NODE_PATH may point at a
// separate dependency directory. No npm install scripts are needed.
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');
const file=path.join(root,'viz/winter/yuzawa-yukiguni.html');
const start='/*YUZAWA-SKI3D-START: generated from yuzawa-ski-3d.js; do not edit*/';
const end='/*YUZAWA-SKI3D-END*/';
(async()=>{
 const result=await esbuild.build({entryPoints:[path.join(root,'viz/winter/yuzawa-ski-3d.js')],bundle:true,write:false,format:'iife',globalName:'YuzawaSkiThree',platform:'browser',target:'es2020',minify:true,legalComments:'inline',nodePaths:(process.env.NODE_PATH||'').split(path.delimiter).filter(Boolean)});
 const code=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script').replace(/[ \t]+$/gm,'');
 let html=fs.readFileSync(file,'utf8');
 if(html.includes(start)){const a=html.indexOf(start),b=html.indexOf(end,a);if(b<0)throw new Error('Missing embed terminator');html=html.slice(0,a)+start+'\n'+code+'\n'+end+html.slice(b+end.length)}
 else{const anchor='const SKI3D = (() => {';if(!html.includes(anchor))throw new Error('Missing ski entry point');html=html.replace(anchor,start+'\n'+code+'\n'+end+'\n'+anchor)}
 fs.writeFileSync(file,html);console.log('Embedded '+code.length+' characters into '+file);
})().catch(e=>{console.error(e);process.exitCode=1});
