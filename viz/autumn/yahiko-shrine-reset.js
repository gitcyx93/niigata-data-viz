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
// Oblique foreground gate: a visual compression of the turning approach,
// not a claim that the torii and haiden occupy one straight real-world axis.
const shrineSideTorii=layer(b=>{
 // Contact shadows and stone shoes keep both feet anchored to the courtyard.
 for(const [x,y,rx] of [[112,1718,58],[368,1550,40]]){
  glow(b,x+20,y+9,rx*1.5,18,[17,31,26],.27);
  poly(b,[[x-rx*.55,y-22],[x+rx*.55,y-25],[x+rx*.7,y+6],[x-rx*.7,y+9]],'#465047','#273a32',2);
 }
 // Receding posts have different projected heights, with warm edge lighting.
 for(const [x,top,foot,w] of [[112,855,1716,42],[368,948,1549,28]]){
  const wood=b.createLinearGradient(x-w/2,0,x+w/2,0);
  wood.addColorStop(0,'#49382d');wood.addColorStop(.28,'#ac7752');
  wood.addColorStop(.58,'#8b5d40');wood.addColorStop(1,'#493b2f');
  poly(b,[[x-w*.36,top],[x+w*.36,top+3],[x+w*.52,foot],[x-w*.52,foot]],wood,'#4c3e30',1.5);
  b.strokeStyle='rgba(222,177,116,.32)';b.lineWidth=2;
  b.beginPath();b.moveTo(x-w*.24,top+25);b.lineTo(x-w*.35,foot-32);b.stroke();
  poly(b,[[x-w*.52,foot-35],[x+w*.52,foot-35],[x+w*.56,foot],[x-w*.56,foot]],'#303d33');
 }
 // Curved kasagi and its lit lower beam, seen from beside the path.
 b.beginPath();b.moveTo(35,801);b.bezierCurveTo(153,865,316,928,430,919);
 b.lineTo(420,947);b.bezierCurveTo(308,951,151,894,44,836);b.closePath();
 b.fillStyle='#263e36';b.fill();b.strokeStyle='#627059';b.lineWidth=3;b.stroke();
 b.beginPath();b.moveTo(45,836);b.bezierCurveTo(159,898,310,951,420,947);
 b.lineTo(415,966);b.bezierCurveTo(309,971,157,919,50,858);b.closePath();
 b.fillStyle='#a27650';b.fill();
 poly(b,[[75,986],[398,1059],[397,1080],[75,1015]],'#80583d','#4e3c2c',2);
 poly(b,[[75,986],[398,1059],[398,1064],[75,992]],'#c39969');
 poly(b,[[242,931],[257,936],[257,1027],[242,1023]],'#946a46');
 // Quiet brass joint plates; no floating sign or decorative lettering.
 for(const [x,y] of [[112,999],[368,1065]]){b.fillStyle='#514535';b.fillRect(x-9,y-8,18,18);b.fillStyle='#bca176';b.beginPath();b.arc(x,y,2,0,TAU);b.fill();}
});
function shrineShot(b,t){
 if(variant==='V6'){shrineShotV6(b,t);return;}
 const u=clamp((t-4)/4),e=ease(u);
 b.save();camera(b,1+.018*e,540+7*e,960);b.drawImage(shrineBackdrop,0,0,W,H);b.restore();
 b.save();camera(b,1.015+.065*e,540+23*e,960-12*e);b.drawImage(shrineArchitecture,0,0,W,H);b.restore();
 // A rightward approach sends the close gate left faster than the distant hall.
 b.save();b.translate(-160*e,18*e);b.translate(112,1718);b.scale(1+.09*e,1+.09*e);b.translate(-112,-1718);b.drawImage(shrineSideTorii,0,0,W,H);b.restore();
}
