// Companion excerpt: shared helpers live in yahiko-shrine-reset.html.
// Generated from the HTML; edit the HTML first.

const T = 25;
const scenePlan=[
 {id:'reveal',start:0,end:4,source:0,span:4},
 {id:'gate',start:4,end:8,source:4,span:4},
 {id:'shrine',start:8,end:12.5,source:4,span:4},
 {id:'ascent',start:12.5,end:18,source:8,span:5},
 {id:'summit',start:18,end:25,source:13,span:7},
];
function duration(){return variant==='V6'?20:T;}

function drawApproachForest(b,includeHall){
 grad(b,0,0,W,H,[[0,'#0b1b25'],[.37,'#29413f'],[.63,'#566253'],[1,'#172b28']]);
 glow(b,710,851,430,520,[156,174,140],.16);
 // Distant trunks vary in spacing, lean and thickness; foliage is above eye level.
 for(let i=0;i<26;i++){let x=rnd(i,300)*1210-60,base=1165+rnd(i,301)*170;cedarTrunk(b,x,base,1050+rnd(i,302)*400,15+rnd(i,303)*21,310+i,['#293d36','#3c4f40','#2d4137']);}
 for(let i=0;i<36;i++){let x=rnd(i,340)*1300-110,y=130+rnd(i,341)*710;cedarBough(b,x,y,110+rnd(i,342)*240,350+i,i%3?'#1b3833':'#30473b');}
 grad(b,0,480,W,850,[[0,'rgba(116,142,127,0)'],[.65,'rgba(116,142,127,.13)'],[1,'rgba(116,142,127,0)']]);
 for(const [x,y,w,s] of [[267,1310,42,361],[915,1315,48,364],[1061,1380,62,365],[395,1195,22,366]])cedarTrunk(b,x,y,1390,w,s,['#202e29','#615f48','#283e32']);
 // Uneven woodland floor, stone approach bending gently toward the hall.
 grad(b,0,1270,W,650,[[0,'rgba(30,51,39,0)'],[.19,'#2b3b2d'],[1,'#152b26']]);
 for(let i=0;i<1250;i++){let x=rnd(i,380)*W,y=1280+rnd(i,381)*640;b.fillStyle=['#556248','#344d38','#7a7144','#263b2c'][i%4];b.globalAlpha=.15+rnd(i,382)*.4;b.beginPath();b.ellipse(x,y,3+rnd(i,383)*19,2+rnd(i,384)*5,0,0,TAU);b.fill();}b.globalAlpha=1;
 const center=u=>628-(includeHall?350:88)*u*u,width=u=>116+550*u;
 b.beginPath();for(let i=0;i<=35;i++){let u=i/35;b[i?'lineTo':'moveTo'](center(u)-width(u)/2,1255+u*665);}for(let i=35;i>=0;i--){let u=i/35;b.lineTo(center(u)+width(u)/2,1255+u*665);}b.closePath();
 b.fillStyle='#626c5c';b.fill();b.save();b.clip();
 grad(b,0,1255,W,665,[[0,'rgba(191,180,142,.18)'],[.35,'rgba(160,165,136,.1)'],[1,'rgba(13,36,33,.3)']]);
 for(let j=0;j<16;j++){let u0=(Math.exp(j/6)-1)/(Math.exp(16/6)-1),u1=(Math.exp((j+1)/6)-1)/(Math.exp(16/6)-1),y0=1255+u0*665,y1=1255+u1*665;
  for(let k=0;k<4;k++){let f0=k/4-.5,f1=(k+1)/4-.5,pts=[[center(u0)+width(u0)*f0+1,y0+1],[center(u0)+width(u0)*f1-1,y0+1],[center(u1)+width(u1)*f1-1,y1-2],[center(u1)+width(u1)*f0+1,y1-2]];poly(b,pts,['#757b66','#6b7462','#83846b','#626e5d'][(j*3+k)%4],'#45594b',1.1);b.strokeStyle='rgba(213,205,165,.19)';b.lineWidth=1;b.beginPath();b.moveTo(...pts[0]);b.lineTo(...pts[1]);b.stroke();}
 }
 for(let i=0;i<1800;i++){let y=1255+rnd(i,390)*665,x=rnd(i,391)*W;b.fillStyle=i%3?'rgba(202,198,164,.13)':'rgba(24,46,37,.18)';b.fillRect(x,y,1+rnd(i,392)*3,1);}
 // Soft branch shadows and warm light fall across the stone, rather than floating.
 for(let i=0;i<7;i++){b.strokeStyle='rgba(13,37,32,.20)';b.lineWidth=11+i*3;b.beginPath();b.moveTo(0,1350+i*85);b.bezierCurveTo(250,1440+i*70,550,1400+i*70,900,1490+i*60);b.stroke();}
 glow(b,493,1454,185,100,[244,192,109],.15);glow(b,705,1290,135,70,[251,193,109],.14);b.restore();
 // Irregular moss lips and leaf piles break the geometric path boundary.
 for(let i=0;i<420;i++){let u=rnd(i,395),side=i%2?-1:1,x=center(u)+side*(width(u)/2+7+rnd(i,396)*34),y=1255+u*665;b.fillStyle=['#52603a','#667048','#3b5538'][i%3];b.beginPath();b.ellipse(x,y,2+u*11,2+u*5,rnd(i,397),0,TAU);b.fill();if(i%2)maple(b,x+side*6,y+5,2+u*6,rnd(i,398)*TAU,reds[2+i%4]);}
 if(includeHall)shrineHall(b);
 stoneLantern(b,427,1457,.94);stoneLantern(b,854,1355,.68);
 // A restrained maple branch breaks the roof line without obscuring it.
 branch(b,1100,1210,205,-.24,13,2,408);
 [[1060,770,155,170,411,.62,530],[987,1000,114,88,414,.7,470],[1010,1120,86,90,415,.7,320]].forEach(a=>crown(b,...a));
}
const forest=layer(b=>drawApproachForest(b,true));
const gateForest=layer(b=>drawApproachForest(b,false));
const shrineForeground=layer(b=>{
 // Complete gate silhouette, with both lintel ends and both feet inside frame.
 b.save();
 for(const x of [243,837]){const gr=b.createLinearGradient(x-20,0,x+20,0);gr.addColorStop(0,'#57392e');gr.addColorStop(.35,'#a66847');gr.addColorStop(.7,'#925335');gr.addColorStop(1,'#49372c');poly(b,[[x-17,739],[x+17,739],[x+24,1456],[x-24,1456]],gr);b.fillStyle='#24382e';b.fillRect(x-25,1420,50,45);}
 b.beginPath();b.moveTo(151,704);b.quadraticCurveTo(540,749,929,704);b.lineTo(917,737);b.quadraticCurveTo(540,776,163,737);b.closePath();b.fillStyle='#294039';b.fill();
 b.beginPath();b.moveTo(164,733);b.quadraticCurveTo(540,769,916,733);b.lineTo(907,750);b.quadraticCurveTo(540,788,173,750);b.closePath();b.fillStyle='#a16946';b.fill();
 b.fillStyle='#875639';b.fillRect(198,829,684,26);b.fillStyle='#bd8960';b.fillRect(198,829,684,4);b.fillStyle='#785034';b.fillRect(529,763,22,66);
 b.restore();
 // Large, irregular cedar trunks and roots anchor the near plane.
 cedarTrunk(b,28,1820,1960,116,445,['#142923','#4a4c36','#20382b']);
 cedarTrunk(b,1039,1840,1980,144,449,['#142923','#5a5740','#263b2b']);
 for(let j=0;j<17;j++){let x=j%2?1034:23,y=1380+rnd(j,451)*360;b.fillStyle='#52613c';b.globalAlpha=.4;b.beginPath();b.ellipse(x+(rnd(j,453)-.5)*25,y,8+rnd(j,454)*12,18+rnd(j,455)*25,-.2,0,TAU);b.fill();}b.globalAlpha=1;
 cedarBough(b,115,540,430,465,'#122e2b');cedarBough(b,1003,565,340,466,'#17362d');
 branch(b,-45,1180,220,.5,12,2,470);
 [[-30,970,145,190,471,.67,600],[83,883,105,95,477,.73,450],[-5,1340,160,120,481,.72,630],[1120,1520,146,150,491,.72,580]].forEach(a=>crown(b,...a));
});


// A single frontal courtyard composition; abstracted from Yahiko's broad haiden.
const shrineBackdrop=layer(b=>{
 grad(b,0,0,W,H,[[0,'#203e4c'],[.38,'#a7b2a0'],[.68,'#6b7a55'],[1,'#364f3c']]);
 naturalRidge(b,[[-60,770],[80,720],[190,650],[330,700],[470,610],[590,635],[710,570],[830,650],[990,620],[1140,730]],932,['#53674b','#76805b','#908764','#a09166'],6500);
 for(let i=0;i<34;i++){let x=-80+rnd(i,935)*1240,top=450+rnd(i,936)*400;cedarTrunk(b,x,1230,1230-top,15+rnd(i,937)*23,940+i,['#263d31','#5d6046','#304935']);for(let j=0;j<160;j++){let y=top+rnd(j,i+960)*(1180-top),w=20+(y-top)*.18,xx=x+(rnd(j,i+990)-.5)*w*2;b.fillStyle=['#294b3a','#39573d','#486144','#60704b','#7b8054'][j%5];b.beginPath();b.ellipse(xx,y,5+rnd(j,i+1010)*15,3+rnd(j,i+1020)*7,0,0,TAU);b.fill();}}
 glow(b,810,760,430,430,[225,203,142],.16);
});
function broadHaiden(b){
 // Courtyard and wide shallow stone stairs.
 grad(b,0,1290,W,630,[[0,'#92927c'],[1,'#636c5d']]);
 for(let i=0;i<2600;i++){b.fillStyle=i%2?'rgba(219,209,173,.16)':'rgba(34,45,35,.18)';b.fillRect(rnd(i,1040)*W,1290+rnd(i,1041)*630,1+rnd(i,1042)*3,1);}
 poly(b,[[450,1460],[625,1460],[790,1920],[220,1920]],'#a8a48c');
 for(let i=0;i<9;i++){let y=1460+Math.pow(i/8,1.5)*460;b.strokeStyle='#717a69';b.lineWidth=2;b.beginPath();b.moveTo(450-(y-1460)*.5,y);b.lineTo(625+(y-1460)*.36,y);b.stroke();}
 for(let i=0;i<6;i++){let y=1370+i*20;poly(b,[[160-i*17,y],[920+i*17,y],[929+i*17,y+13],[151-i*17,y+13]],'#b0ad94');b.fillStyle='#687365';b.fillRect(151-i*17,y+13,778+i*34,7);}
 // Side corridors and recessed timber facade.
 poly(b,[[-70,1180],[200,1160],[200,1352],[-70,1375]],'#514a36');poly(b,[[880,1160],[1150,1180],[1150,1375],[880,1352]],'#484733');
 grad(b,140,1060,800,302,[[0,'#172b28'],[.55,'#343c2c'],[1,'#6f5d40']]);
 for(let i=0;i<8;i++){let x=167+i*95;b.fillStyle='#8a754f';b.fillRect(x,1130,70,184);for(let k=0;k<7;k++){b.fillStyle='#394232';b.fillRect(x+5+k*10,1130,3,184);}for(let y=1150;y<1310;y+=24){b.fillStyle='#424735';b.fillRect(x,y,70,3);}}
 grad(b,435,1110,210,236,[[0,'#0e2424'],[1,'#293a2c']]);
 for(const x of [145,250,360,430,650,720,830,935]){grad(b,x-8,1075,16,285,[[0,'#c2a373'],[.5,'#9f8358'],[1,'#675b40']]);b.fillStyle='#b59b6b';b.fillRect(x-15,1337,30,13);}
 b.fillStyle='#ab9064';b.fillRect(135,1100,810,13);b.fillStyle='#302f24';b.fillRect(135,1113,810,12);
 b.fillStyle='#87704d';b.fillRect(468,1290,145,55);poly(b,[[458,1283],[623,1283],[613,1296],[468,1296]],'#b69d70');
 // Main rear gable: a steep central peak, not a tall rectangular roof.
 poly(b,[[248,1002],[540,735],[832,1002]],'#3a4c45','#b99f6e',7);
 poly(b,[[295,990],[540,779],[785,990]],'#a48c5c');poly(b,[[328,982],[540,804],[752,982]],'#3e4635');
 for(let i=-7;i<=7;i++){b.strokeStyle='#9e895d';b.lineWidth=3;b.beginPath();b.moveTo(540,817);b.lineTo(540+i*26,976);b.stroke();}
 b.fillStyle='#ccb585';b.beginPath();b.arc(540,847,16,0,TAU);b.fill();
 // Broad wings with slightly lifted eaves.
 b.beginPath();b.moveTo(64,1017);b.bezierCurveTo(222,1044,319,1022,386,962);b.lineTo(694,962);b.bezierCurveTo(761,1022,858,1044,1016,1017);b.lineTo(973,1100);b.quadraticCurveTo(540,1140,107,1100);b.closePath();
 const r=b.createLinearGradient(0,960,0,1130);r.addColorStop(0,'#6b7869');r.addColorStop(.6,'#3d514a');r.addColorStop(1,'#1c3733');b.fillStyle=r;b.fill();b.strokeStyle='#b4a279';b.lineWidth=4;b.stroke();
 for(let i=0;i<57;i++){let x=112+i*15;b.strokeStyle=i%3?'#92866a':'#c2ac7b';b.lineWidth=3;b.beginPath();b.moveTo(x,1105);b.lineTo(x+2,1125);b.stroke();}
 // Forward karahafu canopy: broad shoulders, a soft central arch and deep underside.
 b.beginPath();b.moveTo(267,1065);b.bezierCurveTo(360,1110,388,1080,434,1010);b.bezierCurveTo(476,944,604,944,646,1010);b.bezierCurveTo(692,1080,720,1110,813,1065);b.lineTo(788,1130);b.bezierCurveTo(690,1150,655,1110,624,1063);b.bezierCurveTo(588,1017,492,1017,456,1063);b.bezierCurveTo(425,1110,390,1150,292,1130);b.closePath();b.fillStyle='#263d37';b.fill();b.strokeStyle='#bba574';b.lineWidth=6;b.stroke();
 b.strokeStyle='#77806a';b.lineWidth=10;b.beginPath();b.moveTo(272,1064);b.bezierCurveTo(360,1102,389,1069,435,1004);b.bezierCurveTo(478,941,602,941,645,1004);b.bezierCurveTo(690,1069,720,1102,808,1064);b.stroke();
 for(const x of [418,662]){grad(b,x-10,1110,20,257,[[0,'#c3a576'],[1,'#7c694a']]);b.fillStyle='#c1aa7d';b.fillRect(x-18,1350,36,13);}
 b.fillStyle='#bba36e';b.beginPath();b.arc(540,1039,14,0,TAU);b.fill();
 for(let i=0;i<5;i++){let x=466+i*37;poly(b,[[x,1135],[x+12,1145],[x+4,1155],[x+15,1166],[x+5,1180],[x-5,1167],[x+2,1156],[x-8,1147]],'#e0d7b7');}
 stoneLantern(b,110,1510,1.05);stoneLantern(b,970,1510,1.05);
}
const shrineArchitecture=layer(b=>broadHaiden(b));
// A complete frontal gate in its own cedar approach shot.
// The cut to the courtyard avoids inventing a shared axis with the haiden.
function gateShot(b,t){
 const e=ease(clamp((t-4)/4));
 b.save();camera(b,1+.018*e,540,960-3*e);b.drawImage(gateForest,0,0,W,H);leaves(b,t);b.restore();
 b.save();camera(b,1+.04*e,540,960-5*e);b.drawImage(shrineForeground,0,0,W,H);b.restore();
}
function shrineShot(b,t){
 if(variant==='V6'){shrineShotV6(b,t);return;}
 const u=clamp((t-4)/4),e=ease(u);
 b.save();camera(b,1+.018*e,540+7*e,960);b.drawImage(shrineBackdrop,0,0,W,H);b.restore();
 b.save();camera(b,1.015+.065*e,540+23*e,960-12*e);b.drawImage(shrineArchitecture,0,0,W,H);b.restore();

}


function paintShot(c,id,t){
 const b=c.getContext('2d');b.setTransform(1,0,0,1,0,0);b.clearRect(0,0,W,H);
 // Re-time only the lengthened shots. Opening, gate and sea keep real-time speed.
 if(variant!=='V6'){const s=scenePlan.find(s=>s.id===id);t=s.source+(t-s.start)*s.span/(s.end-s.start);}
 if(id==='gate')gateShot(b,t);else if(id==='shrine')shrineShot(b,t);else if(id==='ascent')ascentShot(b,t);else if(id==='summit')summitShot(b,t);else valleyShot(b,t,id);
}
function shotAt(t){
 if(variant!=='V6')return scenePlan.find(s=>t>=s.start&&t<s.end)?.id||'reveal';
 if(t<4)return 'reveal';if(t<8)return 'shrine';if(t<13)return 'ascent';return 'summit';
}
const transitions=[]; // Clean cuts between independent shots; no overlapping architecture.
