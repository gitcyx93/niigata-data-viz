#!/usr/bin/env node
// 由简体版 viz/winter/yuzawa-yukiguni.html 生成日文版 yuzawa-yukiguni-ja.html。
// 只换画面上的字、lang 和字体（思源黑体日文 = Noto Sans JP，按用到的字裁剪内嵌；Sora 保留原数据），
// 不动场景代码和 Three.js 生成代码。简体版改了画面后重新跑一次即可。
// 依赖：@fontsource-variable/noto-sans-jp@5.3.1（可用 NODE_PATH 指到单独的依赖目录）。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const src=path.join(root,'viz/winter/yuzawa-yukiguni.html'),out=src.replace(/\.html$/,'-ja.html');
const marker=/\/\*FONTS-START[\s\S]*?\/\*FONTS-END\*\//;
const supplemental=/FONT_DATA\.push\(\[[\s\S]*?\]\);/g;
const protectedBlock=/\/\*(?:SERIES-START|YUZAWA-SKI3D-START)[\s\S]*?\/\*(?:SERIES-END|YUZAWA-SKI3D-END)\*\//g;

// [简体原文, 日文]：每条必须在页面里正好出现一次
const COPY=[
 ['<title>越后汤泽 雪国</title>','<title>越後湯沢 雪国</title>'],
 ["'《雪国》的舞台，就是这里。'","'『雪国』の舞台は、ここ。'"],
 ["'新干线直达雪场。'","'新幹線で、ゲレンデへ直行。'"],
 ["'这一站主要在雪季开。'","'この駅は、主に冬のあいだ開く。'"],
 ["'「驹子之汤」，名字取自《雪国》。'","'「駒子の湯」の名は『雪国』から。'"],
 ["'一个冬天的雪，加起来约 10 米。'","'ひと冬に降る雪は、約 10 メートル。'"],
 ["title: '越后汤泽', place: '新潟县汤泽町'","title: '越後湯沢', place: '新潟県湯沢町'"],
 ["[['穿过隧道 就是', 0], ['雪国', 1]], '——川端康成《雪国》'","[['トンネルを抜けると', 0], ['雪国', 1]], '——川端康成『雪国』'"],
 ["[['出站就是', 0], ['雪场', 1]], '不用转车 也不用坐大巴'","[['駅を出たら', 0], ['ゲレンデ', 1]], '乗り換えなし バスも要らない'"],
 ["[['一个町 约', 0], ['11', 1], ['座雪场', 0]]","[['町内に 約', 0], ['11', 1], ['のスキー場', 0]]"],
 ["[['滑完雪', 0], ['泡温泉', 1]], '泡在热水里 来一杯冰啤酒'","[['滑ったあとは', 0], ['温泉', 1]], '湯につかって 冷えたビールを一杯'"],
 ["[['一小时到', 0], ['雪国', 1]], '从东京坐上越新干线 最快 66 分钟'","[['約1時間で', 0], ['雪国', 1]], '東京から上越新幹線で 最速 66 分'"],
];
const FAMILY=[['lang="zh-CN"','lang="ja"'],['Source Han Sans SC','Source Han Sans JP'],['Noto Sans SC','Noto Sans JP'],['PingFang SC','Hiragino Sans'],['Microsoft YaHei','Yu Gothic']];

let html=fs.readFileSync(src,'utf8');
for(const [a,b] of COPY){const n=html.split(a).length-1;if(n!==1)throw new Error(`应出现 1 次，实际 ${n} 次：${a}`);html=html.replace(a,()=>b);}
for(const [a,b] of FAMILY)html=html.split(a).join(b);

// 字体：保留 Sora，按页面实际用到的字加 Noto Sans JP 的分片
const block=html.match(marker)?.[0];if(!block)throw new Error('Missing font marker');
const box={};vm.runInNewContext(block+';this.faces=FONT_DATA;',box,{timeout:2000});
const faces=Array.from(box.faces).filter(f=>f[0]==='Sora').map(f=>Array.from(f));
html=html.replace(supplemental,'');
const text=html.replace(marker,'').replace(protectedBlock,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
const chars=new Set([...text].map(c=>c.codePointAt(0)));
const css=require.resolve('@fontsource-variable/noto-sans-jp/wght.css');
for(const m of fs.readFileSync(css,'utf8').matchAll(/@font-face\s*\{([\s\S]*?)\}/g)){
 const range=m[1].match(/unicode-range:\s*([^;]+)/)?.[1],url=m[1].match(/url\(([^)]+)\)/)?.[1];if(!range||!url)continue;
 const ranges=range.split(',').map(r=>r.trim().replace(/^U\+/i,'').split('-').map(v=>parseInt(v,16)));
 if(![...chars].some(c=>ranges.some(([a,b=a])=>c>=a&&c<=b)))continue;
 faces.push(['Source Han Sans JP','100 900',range,fs.readFileSync(path.resolve(path.dirname(css),url.replace(/^['"]|['"]$/g,''))).toString('base64')]);
}
html=html.replace(marker,()=>'/*FONTS-START Source Han Sans JP|Sora*/\nconst FONT_DATA = '+JSON.stringify(faces)+';\n/*FONTS-END*/');
fs.writeFileSync(out,html);
console.log(path.relative(root,out)+': '+(faces.length-1)+' 个日文字体分片');
