// A visual-only page until the user explicitly enables sound. All pixels and
// scene times remain the refined V11; only the transport gains an audio clock.
let playing=!params.has('record'),playTime=Number(params.get('t')||0),lastTime=0;
window.render=render;window.LOOP_SECONDS=T;
const play=document.getElementById('play'),seek=document.getElementById('seek'),clock=document.getElementById('clock');
const soundButton=document.getElementById('sound'),soundNote=document.getElementById('sound-note');
const ambience=createAmbiencePlayer({
  base64:AMBIENCE_DATA,duration:T,getTime:()=>playTime,
  shouldPlay:()=>playing&&!document.hidden,
  onState:({enabled,loading,error})=>{
    soundButton.textContent=enabled?'静音':'有声播放';
    soundButton.setAttribute('aria-pressed',String(enabled));
    soundButton.setAttribute('aria-label',enabled?'关闭环境声':'开启环境声并播放');
    soundNote.textContent=error||(loading?'正在准备环境声…':enabled?'环境声已开启 · 无配乐':'环境声 · 默认静音 · 无配乐');
  },onError:error=>console.warn('Environment audio unavailable:',error.message)
});
function status(){play.textContent=playing?'暂停':'播放';play.setAttribute('aria-label',playing?'暂停动画':'播放动画');const d=duration();seek.max=d-.01;seek.value=(playTime%d).toFixed(2);clock.textContent=(playTime%d).toFixed(1)+' / '+d+' 秒';window.LOOP_SECONDS=d;document.getElementById('duration-note').textContent='弥彦 · 环境声版　/　'+d+' 秒';}
function captureClock(){playTime=ambience.clock(playTime);lastTime=0;}
function update(t){playTime=((t%duration())+duration())%duration();lastTime=0;ambience.sync(playTime,playing);render(playTime);status();}
play.onclick=()=>{captureClock();playing=!playing;ambience.sync(playTime,playing);status();};
soundButton.onclick=()=>{captureClock();const enable=!ambience.enabled;if(enable)playing=true;status();void ambience.setEnabled(enable);};
seek.oninput=()=>{playing=false;update(Number(seek.value));};
document.querySelectorAll('[data-time]').forEach(el=>el.onclick=()=>{playing=false;update(Number(el.dataset.time));});
document.getElementById('restart').onclick=()=>{playing=true;update(0);};
cv.onclick=()=>play.click();
/*OPENING-CONTROLS*/
document.getElementById('watch-end').onclick=()=>{playing=true;update(11.4);};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'&&e.target.tagName!=='BUTTON'){e.preventDefault();play.click();}});
document.addEventListener('visibilitychange',()=>{
  captureClock();if(document.hidden)ambience.pause();else ambience.sync(playTime,playing);
});
window.addEventListener('pagehide',()=>{captureClock();ambience.pause();});
window.addEventListener('pageshow',e=>{if(e.persisted){lastTime=0;ambience.sync(playTime,playing);}});
if(matchMedia('(prefers-reduced-motion: reduce)').matches&&!params.has('record'))playing=false;
loadFonts().catch(()=>{}).then(()=>{
  paintToriiPlaque();update(playTime);window.READY=true;soundButton.disabled=false;
  function tick(now){
    if(playing&&!document.hidden){
      const fallback=lastTime?(playTime+(now-lastTime)/1000)%duration():playTime;
      playTime=ambience.clock(fallback);render(playTime);status();
    }
    lastTime=now;requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});
