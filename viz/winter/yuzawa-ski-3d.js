import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// A self-contained, deterministic replacement for the 3.3–8.7s ski shot.
// All choreography comes from the existing at(t); copy and the film loop
// remain in the original Canvas renderer. No network assets or animation RAF.
export function createSkiScene({width, height, getPose, settings}) {
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const rnd=(i,k=0)=>{const v=Math.sin(i*127.1+k*311.7)*43758.5453;return v-Math.floor(v)};
  const scene=new THREE.Scene();
  scene.fog=new THREE.Fog('#b5c9da',75,390);
  const sky=document.createElement('canvas');sky.width=2;sky.height=512;
  const sb=sky.getContext('2d'),sg=sb.createLinearGradient(0,0,0,512);
  sg.addColorStop(0,'#31516f');sg.addColorStop(.45,'#83acc8');sg.addColorStop(.78,'#d8e3e9');sg.addColorStop(1,'#edf0eb');
  sb.fillStyle=sg;sb.fillRect(0,0,2,512);
  const skyTexture=new THREE.CanvasTexture(sky);skyTexture.colorSpace=THREE.SRGBColorSpace;scene.background=skyTexture;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(width,height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const camera=new THREE.PerspectiveCamera(46,width/height,.15,1000);
  scene.add(new THREE.HemisphereLight('#d9edff','#a2b2c1',1.65));
  const sun=new THREE.DirectionalLight('#fff1d5',2.35);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-27;sun.shadow.camera.right=27;sun.shadow.camera.top=27;sun.shadow.camera.bottom=-27;
  sun.shadow.camera.near=1;sun.shadow.camera.far=150;sun.shadow.bias=-.00035;sun.shadow.normalBias=.035;
  scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#c4dcff',.65);fill.position.set(-50,60,-40);scene.add(fill);
  const runX=z=>-2+7*Math.sin((z-30)/45);
  const ground=(x,z)=>{
    const d=Math.abs(x-runX(z)),outside=smooth((d-9)/22);
    const drifts=smooth((d-5)/14)*(1.0+.8*Math.sin(z*.055+x*.09));
    return 10+.18*(z-30)+outside*(1.6*Math.sin(x*.055+z*.023)+.7*Math.sin(z*.075-x*.025))+drifts;
  };
  const normalAt=(x,z)=>new THREE.Vector3(-(ground(x+.1,z)-ground(x-.1,z))/.2,1,-(ground(x,z+.1)-ground(x,z-.1))/.2).normalize();
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.88,metalness:0,...extra});
  const snowMat=mat('#dce8f0');
  const snowGeo=new THREE.PlaneGeometry(300,640,100,180);snowGeo.rotateX(-Math.PI/2);snowGeo.translate(0,0,160);
  const sp=snowGeo.attributes.position;
  for(let i=0;i<sp.count;i++)sp.setY(i,ground(sp.getX(i),sp.getZ(i)));
  snowGeo.computeVertexNormals();
  const slope=new THREE.Mesh(snowGeo,snowMat);slope.receiveShadow=true;scene.add(slope);
  // Sparse surface texture: no outlined run or parallel roadway boundaries.
  const grain=document.createElement('canvas');grain.width=grain.height=128;const gb=grain.getContext('2d'),gi=gb.createImageData(128,128);
  for(let i=0;i<128*128;i++){const v=232+Math.floor(rnd(i,1)*23);gi.data.set([v,v,v,255],i*4)}gb.putImageData(gi,0,0);
  const grainTexture=new THREE.CanvasTexture(grain);grainTexture.wrapS=grainTexture.wrapT=THREE.RepeatWrapping;grainTexture.repeat.set(38,65);snowMat.roughnessMap=grainTexture;snowMat.bumpMap=grainTexture;snowMat.bumpScale=.018;

  function mountain(z,seed,color){
    const positions=[],indices=[],nx=38,nz=6;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const x=-410+i*820/nx,zz=z+j*24;
      const peak=20+28*Math.pow(Math.max(0,Math.sin(i*.31+seed)),2)+11*Math.sin(i*.77+seed);
      const y=10+.18*(z-30)+peak*Math.sin((j/nz)*Math.PI)+9*Math.sin(i*.19+seed);
      positions.push(x,y,zz);
    }
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo,mat(color,{side:THREE.DoubleSide})));
  }
  mountain(310,2,'#c6d8e6');mountain(430,5,'#b1c9dc');

  // Actual volumes, rendered in a few instanced batches. Tree groups are
  // deliberately set back from the skier instead of forming a narrow tunnel.
  const trees=[];
  for(let i=0;i<120;i++){
    const z=-15+rnd(i,12)*290,side=i%2?1:-1;
    const x=runX(z)+side*(9+rnd(i,13)*34);
    if(rnd(i,14)<.20&&z>35&&z<140)continue;
    trees.push({x,z,h:5.5+rnd(i,15)*6,seed:i,turn:rnd(i,16)*Math.PI*2});
  }
  const tierCount=trees.length*6;
  function boughGeometry(snow){
    const pos=[],indices=[],nr=4,ns=16;
    for(let j=0;j<=nr;j++)for(let k=0;k<=ns;k++){
      const u=j/nr,a=k/ns*Math.PI*2;
      const r=Math.pow(1-u,.9)*(1+.065*Math.sin(a*3+u*3)+.025*Math.sin(a*5+u));
      const y=u-.5+(1-u)*(snow?.035:.025)*Math.sin(a*3+1);
      pos.push(Math.cos(a)*r,y,Math.sin(a)*r);
    }
    for(let j=0;j<nr;j++)for(let k=0;k<ns;k++){const a=j*(ns+1)+k,b=a+ns+1;indices.push(a,b,a+1,a+1,b,b+1)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }
  const foliage=new THREE.InstancedMesh(boughGeometry(false),mat('#57737d',{side:THREE.DoubleSide}),tierCount);
  const caps=new THREE.InstancedMesh(boughGeometry(true),mat('#e7f0f4',{side:THREE.DoubleSide}),tierCount);
  const clumps=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,5),mat('#e7f0f4'),tierCount*2);clumps.castShadow=false;clumps.receiveShadow=true;
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.075,.12,1,8),mat('#66685d'),trees.length);
  foliage.castShadow=true;caps.castShadow=false;trunks.castShadow=true;
  foliage.receiveShadow=caps.receiveShadow=true;
  const dummy=new THREE.Object3D();let idx=0;
  trees.forEach((tr,i)=>{
    const y=ground(tr.x,tr.z);
    dummy.position.set(tr.x,y+tr.h*.2,tr.z);dummy.rotation.set(0,tr.turn,0);dummy.scale.set(1,tr.h*.4,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let k=0;k<6;k++){
      const u=k/5,rad=(tr.h*.24)*(1-u*.86)*( .87+rnd(k,tr.seed+20)*.18),hh=tr.h*(.30-u*.07);
      const xx=tr.x+(rnd(k,tr.seed+23)-.5)*rad*.2,zz=tr.z+(rnd(k,tr.seed+24)-.5)*rad*.25,yy=y+tr.h*(.24+u*.69);
      dummy.position.set(xx,yy,zz);dummy.rotation.set((rnd(k,tr.seed+25)-.5)*.07,tr.turn+k*.7,(rnd(k,tr.seed+26)-.5)*.06);dummy.scale.set(rad,hh,rad*(.8+rnd(k,tr.seed+27)*.25));dummy.updateMatrix();foliage.setMatrixAt(idx,dummy.matrix);
      dummy.position.y+=hh*.13;dummy.scale.set(rad*.94,hh*.77,rad*.89);dummy.updateMatrix();caps.setMatrixAt(idx,dummy.matrix);
      for(let m=0;m<2;m++){
        const a=tr.turn+k*1.3+m*2.6;
        dummy.position.set(xx+Math.cos(a)*rad*.49,yy-hh*.05,zz+Math.sin(a)*rad*.43);
        dummy.rotation.set(.1*Math.sin(a),a,.09*Math.cos(a));dummy.scale.set(rad*.43,hh*.14,rad*.32);dummy.updateMatrix();clumps.setMatrixAt(idx*2+m,dummy.matrix);
      }
      idx++;
    }
  });
  scene.add(foliage,caps,trunks,clumps);

  // Small, softened contact shadow makes the skis visibly sit on the slope.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const sh=shadowCanvas.getContext('2d'),rad=sh.createRadialGradient(64,64,5,64,64,64);rad.addColorStop(0,'rgba(25,46,70,.4)');rad.addColorStop(.5,'rgba(25,46,70,.15)');rad.addColorStop(1,'rgba(25,46,70,0)');sh.fillStyle=rad;sh.fillRect(0,0,128,128);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  contact.rotation.x=-Math.PI/2;contact.position.y=.003;

  const skier=new THREE.Group(),body=new THREE.Group();skier.add(body,contact);scene.add(skier);
  const jacket=mat('#dc592e',{roughness:.72}),jacketDark=mat('#b43e24'),pants=mat('#273b50'),bootMat=mat('#233342',{roughness:.55}),glove=mat('#243744'),helmetMat=mat('#edf0e9',{roughness:.52}),strapMat=mat('#3c5262'),cream=mat('#f6dc9f'),metal=mat('#78909e',{metalness:.65,roughness:.3});
  const roundGeo=new RoundedBoxGeometry(1,1,1,3,.15);
  const sphereGeo=new THREE.SphereGeometry(1,16,12),cylinderGeo=new THREE.CylinderGeometry(1,1,1,12);
  function mesh(geo,material,parent=body){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  function box(parent,material,size,pos){const m=mesh(roundGeo,material,parent);m.scale.set(...size);m.position.set(...pos);return m}
  function joint(material,r){const m=mesh(sphereGeo,material);m.scale.setScalar(r);return m}
  function limb(material,r1,r2){const r=(r1+r2)/2;return mesh(new THREE.CapsuleGeometry(r,1-2*r,4,12),material)}
  const torso=mesh(new THREE.LatheGeometry([new THREE.Vector2(.20,0),new THREE.Vector2(.25,.06),new THREE.Vector2(.285,.39),new THREE.Vector2(.20,.50)],20),jacket);torso.scale.z=.68;
  const waist=mesh(roundGeo,pants);waist.scale.set(.42,.19,.28);
  const collar=mesh(new THREE.CylinderGeometry(.10,.115,.13,16),jacketDark);
  const helmet=mesh(sphereGeo,helmetMat);helmet.scale.set(.165,.18,.18);
  const goggleFrame=box(body,strapMat,[.29,.115,.047],[0,0,0]);
  const visor=box(body,mat('#ca974e',{metalness:.6,roughness:.24}),[.25,.077,.024],[0,0,0]);
  const visorGlint=box(body,mat('#ffdf9c',{metalness:.3,roughness:.22}),[.13,.012,.006],[0,0,0]);
  const chin=mesh(sphereGeo,mat('#c99f80'));chin.scale.set(.08,.045,.08);
  const zipper=box(body,strapMat,[.012,.38,.014],[0,0,0]);
  // The chest band follows the coat's curved surface. A flat box floated
  // visibly off the jacket when the skier turned sideways in the first pass.
  const stripeGeo=new THREE.BufferGeometry(),stripePos=[],stripeIndices=[];
  for(let i=0;i<=24;i++){const x=-.235+i*.47/24,z=-Math.sqrt(.28*.28-x*x)-.004;stripePos.push(x,.322,z,x,.357,z);if(i<24){const a=i*2;stripeIndices.push(a,a+2,a+1,a+1,a+2,a+3)}}
  stripeGeo.setAttribute('position',new THREE.Float32BufferAttribute(stripePos,3));stripeGeo.setIndex(stripeIndices);stripeGeo.computeVertexNormals();
  const chestStripe=mesh(stripeGeo,mat('#f3dba7',{side:THREE.DoubleSide}),torso);
  const pocketL=box(body,jacketDark,[.115,.04,.015],[0,0,0]),pocketR=box(body,jacketDark,[.115,.04,.015],[0,0,0]);
  const limbs=[0,1].map(()=>({thigh:limb(pants,.095,.075),shin:limb(pants,.075,.065),knee:joint(pants,.082),upper:limb(jacket,.078,.06),fore:limb(jacket,.063,.049),elbow:joint(jacket,.061),hand:joint(glove,.06),pole:limb(strapMat,.008,.009),basket:mesh(new THREE.TorusGeometry(.035,.005,5,12),strapMat)}));
  const boots=[];
  for(const side of [-1,1]){
    const bg=new THREE.Group();bg.position.set(side*.19,.11,.025);body.add(bg);boots.push(bg);
    box(bg,bootMat,[.14,.18,.29],[0,0,-.025]);box(bg,bootMat,[.115,.20,.14],[0,.14,.04]);
    box(bg,metal,[.145,.018,.19],[0,.02,-.04]);box(bg,metal,[.13,.02,.14],[0,.13,.033]);
    box(bg,strapMat,[.16,.055,.35],[0,-.085,-.02]);
    const skiGeo=new THREE.BufferGeometry(),pos=[],ind=[];
    for(let k=0;k<=28;k++){
      const u=k/28,z=-1.02+u*1.86,tip=Math.pow(clamp((.15-u)/.15),2)*.105,tail=Math.pow(clamp((u-.92)/.08),2)*.025;
      const w=.047+.013*Math.pow(Math.abs(u-.52)*2,1.7);
      pos.push(-w,tip+tail,z,w,tip+tail,z);
      if(k<28){const a=k*2;ind.push(a,a+2,a+1,a+1,a+2,a+3)}
    }
    skiGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));skiGeo.setIndex(ind);skiGeo.computeVertexNormals();
    const ski=mesh(skiGeo,mat(side<0?'#274758':'#365965',{roughness:.46,side:THREE.DoubleSide}),body);ski.position.set(side*.19,.012,0);ski.receiveShadow=true;
    box(body,cream,[.045,.009,.56],[side*.19,.020,-.48]);box(body,jacket,[.09,.011,.12],[side*.19,.023,-.72]);
  }
  const up=new THREE.Vector3(0,1,0);
  function connect(m,a,b){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);m.position.copy(av.add(bv).multiplyScalar(.5));m.scale.set(1,delta.length(),1);m.quaternion.setFromUnitVectors(up,delta.normalize())}
  const headingForPose=p=>lerp(-Math.atan2(p.vx,Math.max(.1,p.vz)),-1.48,p.skid);
  function poseSkier(t){
    const p=getPose(t),tuck=smooth((t-settings.carve+.3)/.5)*(1-smooth((t-settings.tuck)/.5));
    const carve=p.amp/2.6,lean=-.22*Math.sin(p.ph)*carve-.12*p.skid*clamp(p.v/10),cheer=smooth((t-settings.tuck-.75)/.55);
    const hipY=.91-.21*tuck-.10*p.skid*clamp(p.v/8),hipX=lean*.7,hipZ=.06+.14*tuck;
    const shoulders=[hipX+lean*.3,hipY+.43-.06*tuck,hipZ-.16*tuck];
    torso.position.set(hipX,hipY-.04,hipZ);torso.rotation.set(-.28*tuck,0,-lean*.35);
    waist.position.set(hipX,hipY-.065,hipZ);collar.position.set(shoulders[0],shoulders[1]+.015,shoulders[2]);
    const head=[shoulders[0],shoulders[1]+.20,shoulders[2]-.025];helmet.position.set(...head);helmet.rotation.x=-.10*tuck;
    goggleFrame.position.set(head[0],head[1]-.005,head[2]-.165);visor.position.set(head[0],head[1]-.005,head[2]-.195);visorGlint.position.set(head[0]-.025,head[1]+.014,head[2]-.210);chin.position.set(head[0],head[1]-.12,head[2]-.10);
    zipper.position.set(hipX,hipY+.20,hipZ-.178);pocketL.position.set(hipX-.14,hipY+.11,hipZ-.17);pocketR.position.set(hipX+.14,hipY+.11,hipZ-.17);
    for(let i=0;i<2;i++){
      const side=i?1:-1,L=limbs[i],ankle=[side*.19,.27,.04],knee=[side*.18+lean*.24,.52-.09*tuck,-.17-.17*tuck],hip=[hipX+side*.13,hipY-.11,hipZ];
      connect(L.thigh,hip,knee);connect(L.shin,knee,ankle);L.knee.position.set(...knee);
      const shoulder=[shoulders[0]+side*.23,shoulders[1]-.05,shoulders[2]];
      const elbow=[hipX+side*lerp(.40,.27,tuck),hipY+.12,hipZ-.16-.13*tuck];
      const hand=[hipX+side*lerp(.43,.20,tuck),hipY-.05,hipZ-.36-.11*tuck];
      if(i){elbow[0]=lerp(elbow[0],hipX+.40,cheer);elbow[1]=lerp(elbow[1],hipY+.67,cheer);hand[0]=lerp(hand[0],hipX+.32,cheer);hand[1]=lerp(hand[1],hipY+1.05,cheer);hand[2]=lerp(hand[2],hipZ-.05,cheer)}
      connect(L.upper,shoulder,elbow);connect(L.fore,elbow,hand);L.elbow.position.set(...elbow);L.hand.position.set(...hand);
      const tip=[hand[0]+side*.15,Math.max(.025,hand[1]-.9),hand[2]+.65];if(i){tip[0]=lerp(tip[0],hand[0]+.10,cheer);tip[1]=lerp(tip[1],hand[1]+1.08,cheer);tip[2]=lerp(tip[2],hand[2]+.06,cheer)}
      connect(L.pole,hand,tip);L.basket.position.set(lerp(hand[0],tip[0],.91),lerp(hand[1],tip[1],.91),lerp(hand[2],tip[2],.91));L.basket.rotation.x=Math.PI/2;
    }
    const n=normalAt(p.x,p.z),q=new THREE.Quaternion().setFromUnitVectors(up,n);
    const heading=headingForPose(p);
    skier.position.set(p.x,ground(p.x,p.z)+.004,p.z);skier.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(up,heading));
    return p;
  }

  // Two narrow strips follow the actual preserved trajectory, not a road.
  const trailSegments=260,trailGeo=new THREE.BufferGeometry(),trailPos=new Float32Array(trailSegments*2*6*3);
  trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3).setUsage(THREE.DynamicDrawUsage));
  const trails=new THREE.Mesh(trailGeo,new THREE.MeshBasicMaterial({color:'#829eb2',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));trails.frustumCulled=false;scene.add(trails);
  function updateTrail(t){let ptr=0;for(const side of[-1,1])for(let i=0;i<trailSegments;i++){
    const ta=lerp(settings.t0,t,i/trailSegments),tb=lerp(settings.t0,t,(i+1)/trailSegments),a=getPose(ta),b=getPose(tb),w=.013;
    const edge=(p,o)=>{const h=headingForPose(p),x=p.x+Math.cos(h)*o,z=p.z-Math.sin(h)*o;return[x,ground(x,z)+.023,z]};
    const corners=[edge(a,side*.19-w),edge(a,side*.19+w),edge(b,side*.19-w),edge(b,side*.19+w)];
    for(const index of[0,2,1,1,2,3])for(const value of corners[index])trailPos[ptr++]=value;
  }trailGeo.attributes.position.needsUpdate=true;trailGeo.setDrawRange(0,ptr/3)}

  const count=650,pp=new Float32Array(count*3),aa=new Float32Array(count),ss=new Float32Array(count),pg=new THREE.BufferGeometry();
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3).setUsage(THREE.DynamicDrawUsage));pg.setAttribute('opacity',new THREE.BufferAttribute(aa,1).setUsage(THREE.DynamicDrawUsage));pg.setAttribute('size',new THREE.BufferAttribute(ss,1).setUsage(THREE.DynamicDrawUsage));
  const pm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{scale:{value:height/(2*Math.tan(THREE.MathUtils.degToRad(46/2))) }},vertexShader:'attribute float opacity; attribute float size; varying float a; uniform float scale; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*scale/max(.1,-p.z),1.0,32.0);a=opacity;}',fragmentShader:'varying float a;void main(){float r=length(gl_PointCoord-.5)*2.0;float edge=pow(max(0.0,1.0-r),1.7);gl_FragColor=vec4(.94,.98,1.0,a*edge);}'});
  const spray=new THREE.Points(pg,pm);spray.frustumCulled=false;scene.add(spray);
  const emitted=Array.from({length:count},(_,i)=>{
    const skid=i<430,te=skid?settings.tuck+.08+rnd(i,61)*(settings.end-settings.tuck-.1):settings.t0+.2+rnd(i,62)*(settings.carve-settings.t0-.2);
    return{i,te,life:skid?1.0:.68,skid,mist:i%8===0};
  });
  function updateSpray(t){for(const e of emitted){const {i,te,life,skid,mist}=e,age=t-te;aa[i]=0;ss[i]=.01;if(age<0||age>life){pp[i*3+1]=-1000;continue}
    const p=getPose(te),side=skid?1:(Math.sin(p.ph)>0?1:-1),v=clamp(p.v/12),vx=side*(1+rnd(i,63)*2.6)*(skid?v:1),vz=-.5-rnd(i,64),vy=(.7+rnd(i,65)*1.7)*(skid?v:1),x=p.x+vx*age,z=p.z+vz*age,y=ground(p.x,p.z)+.08+vy*age-4.9*age*age;
    pp.set([x,y,z],i*3);if(y<ground(x,z))continue;const u=age/life;aa[i]=(mist?.16:.8)*Math.sin(Math.PI*u)*v;ss[i]=mist?.14+.24*u:.018+rnd(i,66)*.035;
  }pg.attributes.position.needsUpdate=true;pg.attributes.opacity.needsUpdate=true;pg.attributes.size.needsUpdate=true}

  // SNS cut: three intentional angles inside the existing 5.4s slot.
  // No time warp, random shake, flashes, or camera changes to other shots.
  function actionCamera(t,p){
    const punch=x=>1-Math.pow(1-clamp(x),3);
    if(t<4.8){
      const k=punch((t-3.3)/.42);
      return {shot:'carve-push',distance:lerp(12,9.4,k),side:lerp(4.8,3.6,k)+.25*Math.sin(p.ph),height:1.65,target: .9,follow:.75,roll:-.018*Math.sin(p.ph)*(p.amp/2.6)};
    }
    if(t<6.5){
      const k=clamp((t-4.8)/1.7);
      return {shot:'side-follow',distance:lerp(8,8.8,k),side:lerp(8.5,6.5,k),height:1.3,target:.85,follow:.9,roll:-.012*(1-k)};
    }
    const k=punch((t-6.5)/.32),room=smooth((t-7.15)/.6),finish=clamp((t-7.8)/.9);
    return {shot:'brake-finish',distance:lerp(lerp(9.6,8.9,k),10.4,room)-.7*finish,side:lerp(lerp(3.4,2.8,k),5.6,room)-1.2*finish,height:lerp(1.5,1.65,room),target:lerp(.85,1.15,room),follow:.85,roll:.015*(1-room)*p.skid};
  }
  let lastInfo=null;
  function render(t){
    const p=poseSkier(t),shot=actionCamera(t,p);
    camera.position.set(p.base+shot.side,ground(p.x,p.z)+shot.height,p.z-shot.distance);
    camera.lookAt(p.base+(p.x-p.base)*shot.follow,ground(p.x,p.z)+shot.target,p.z+.7);
    camera.rotateZ(shot.roll);
    sun.position.set(p.x-35,ground(p.x,p.z)+58,p.z-30);sun.target.position.set(p.x,ground(p.x,p.z),p.z);sun.target.updateMatrixWorld();
    updateTrail(t);updateSpray(t);renderer.render(scene,camera);
    const contactGaps=[];
    for(const x of[-.19,.19])for(const z of[-.65,0,.55]){const v=new THREE.Vector3(x,.012,z).applyMatrix4(skier.matrixWorld);contactGaps.push(v.y-ground(v.x,v.z))}
    const bounds=new THREE.Box3().setFromObject(body),screenBounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
    for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z]){const v=new THREE.Vector3(x,y,z).project(camera),sx=(v.x*.5+.5)*width,sy=(.5-v.y*.5)*height;screenBounds.left=Math.min(screenBounds.left,sx);screenBounds.right=Math.max(screenBounds.right,sx);screenBounds.top=Math.min(screenBounds.top,sy);screenBounds.bottom=Math.max(screenBounds.bottom,sy)}
    lastInfo={time:t,cameraShot:shot.shot,cameraRoll:shot.roll,pose:{x:p.x,z:p.z,v:p.v},camera:camera.position.toArray(),skier:skier.position.toArray(),contactGaps,screenBounds,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,webgl:true};
    return renderer.domElement;
  }
  return {render,getInfo:()=>lastInfo,renderer};
}
