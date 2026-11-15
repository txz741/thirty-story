import {createEndingFrames} from './ending-frames.js';
import {renderFinale} from './finale.js';
import {positionEndingBadges} from './ending-badges.js';
import {events} from './journey-data.js';
import {MUSIC_TRACKS} from './music-config.js';
const $=id=>document.getElementById(id),book=$('preview-stage'),image=$('preview-art'),canvas=$('ending-frames'),overlay=$('preview-overlay'),audio=$('ending-music');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,state={panelIndex:4,badges:[...events.slice(0,9).map(e=>e.badge),'wings']};
function draw(){renderFinale({book,image:canvas.hidden?image:canvas,overlay,state,reduced});}
const musicClock=()=>({id:'finale',currentTime:audio.currentTime,duration:audio.duration,ended:audio.ended});
const player=createEndingFrames({canvas,button:$('retry-ending-frames'),document,music:musicClock,canAnimate:()=>!audio.muted,onShow:draw,onFrame:(frame,clock)=>positionEndingBadges(overlay,frame,clock),onMotion:(frame,clock)=>positionEndingBadges(overlay,frame,clock),onStill:clock=>positionEndingBadges(overlay,-1,clock)});
let ready=false,wasPlaying=false;
audio.src=MUSIC_TRACKS[3].src;audio.volume=.22;
function readyNote(){const ok=ready&&Number.isFinite(audio.duration);$('play-ending').disabled=!ok;$('ready-note').textContent=ok?'音乐还剩10秒时开始飞向远方，字幕保持原来的节奏。':'正在准备谢幕画面…';}
audio.addEventListener('loadedmetadata',readyNote);void player.warm().then(ok=>{ready=ok;readyNote();});
$('play-ending').addEventListener('click',()=>{audio.currentTime=Math.max(0,audio.duration-15);positionEndingBadges(overlay,-1,musicClock());overlay._finaleRenderKey=null;draw();void audio.play().catch(()=>{$('ready-note').textContent='轻触音乐播放按钮后继续。';});});
document.addEventListener('visibilitychange',()=>{if(document.hidden){wasPlaying=!audio.paused;audio.pause();}else if(wasPlaying)void audio.play().catch(()=>{});});
image.addEventListener('load',draw);window.addEventListener('resize',draw);player.setActive(true);draw();
