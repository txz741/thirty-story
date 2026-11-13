import {events,finale,character} from './journey-data.js';
import {renderFinale,FINALE_GATHER_START_MS} from './finale.js';
import {presentBadge} from './badge-presentation.js';
import {flyBadge} from './badge-animation.js';
import {createAudioSystem} from './audio-system.js';
const $=id=>document.getElementById(id),book=$('preview-stage'),image=$('preview-art'),overlay=$('preview-overlay'),badge=$('preview-badge'),audio=createAudioSystem();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));let token=0,paused=false;
audio.bindUnlock();void audio.prime();
const requestedScene=new URLSearchParams(location.search).get('scene');
if(['badge','0','1','2'].includes(requestedScene))$('scene').value=requestedScene;
audio.subscribe(state=>{$('mute').textContent=state.muted?'开启声音':'静音';});
async function show(sound=false){
  const current=++token;audio.stopEffects();for(const animation of book.getAnimations({subtree:true}))animation.cancel();paused=false;$('pause').textContent='暂停';overlay.innerHTML='';overlay._finaleRenderKey=null;badge.hidden=true;badge.classList.remove('badge-presenting');
  const scene=$('scene').value;book.classList.toggle('badge-scene',scene==='badge');image.hidden=scene==='badge';overlay.hidden=scene==='badge';
  $('pause').disabled=scene==='badge';
  $('preview-note').textContent=scene==='badge'?'静置闪光三秒 → 飞近时开包 → 入包后眨眼。轻触“重新播放”开启声音。':'先展示中心勋章，再由下方飞入，最后缓缓环绕。轻触“重新播放”开启声音。';
  if(scene==='badge'){
    await Promise.all([character.expect,character.bagOpen,character.wink].map(src=>new Promise(resolve=>{const pose=new Image();pose.onload=resolve;pose.onerror=resolve;pose.src=src;})));
    if(current!==token)return;$('preview-character').src=character.expect;
    if(!await presentBadge({book,badge,isCurrent:()=>current===token,onPresent:()=>{if(sound)audio.play('badge-shimmer',{group:'showcase'});}}))return;
    audio.stopGroup('showcase');if(sound)audio.play('badge-fly');
    const arrived=await flyBadge({book,character:$('preview-character'),badge,anchor:character.openBagMouth,reduced,isCurrent:()=>current===token,onApproach:()=>{$('preview-character').src=character.bagOpen;}});
    if(arrived&&current===token){$('preview-character').src=character.wink;if(sound)audio.play('badge-collect');}return;
  }
  const panelIndex=Number(scene),src=finale.panels[panelIndex].image;
  if(image.getAttribute('src')!==src){await new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;image.src=src;});}
  if(current!==token)return;
  const ids=[...events.slice(0,9).map(e=>e.badge),...($('with-if').checked?['paper-plane']:[]),'wings'];
  renderFinale({book,image,overlay,state:{panelIndex,badges:ids},reduced});
  if(sound){if(panelIndex===0)audio.play('badge-shimmer');else{if(panelIndex===2)await delay(reduced?0:FINALE_GATHER_START_MS);if(current===token&&!paused)audio.play('finale-sparkle');}}
}
async function replay(){await audio.unlock();void show(true);}
$('replay').addEventListener('click',replay);$('scene').addEventListener('change',replay);$('with-if').addEventListener('change',replay);
$('mute').addEventListener('click',()=>audio.setMuted(!audio.state.muted));
$('pause').addEventListener('click',()=>{paused=!paused;for(const animation of book.getAnimations({subtree:true}))paused?animation.pause():animation.play();if(paused)audio.stopEffects();$('pause').textContent=paused?'继续':'暂停';});
window.addEventListener('resize',()=>void show(false));void show();
