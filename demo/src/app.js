import {story,character} from './story-data.js';
import {transition,initialState} from './state-machine.js';
import {loadProgress,saveProgress} from './persistence.js';
import {bindInput} from './input.js';
import {bagPosition,flyBadge} from './badge-animation.js';

export function mountStorybook({document=globalThis.document,window=globalThis.window,location=globalThis.location,Image=globalThis.Image,requestAnimationFrame=globalThis.requestAnimationFrame}={}){
const $=id=>document.getElementById(id),book=$('book');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const debug=new URLSearchParams(location.search).get('debug')==='1';
let storage;try{storage=window.localStorage;}catch{storage=null;}
let state=loadProgress(storage),generation=0,flipLock=false,shownPanel=-1,shownLayer='';
let activeMotion=false;const imagePromises=new Map();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function preload(src){
  if(!imagePromises.has(src))imagePromises.set(src,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=src;}));
  return imagePromises.get(src);
}
function pose(name){$('character').src=character[name]||character.idle;}
function positionGlow(){const p=bagPosition(book,$('character'),character.bagMouth);$('bag-glow').style.left=p.x+'px';$('bag-glow').style.top=p.y+'px';}
function announce(text){$('announcement').textContent=text;}
function render(){
  const isStory=state.phase==='story',layer=state.phase==='cover'?'cover':isStory?'story':'road';
  for(const id of ['cover','road','story'])$(id).hidden=id!==layer;
  if(layer!==shownLayer){$(layer).classList.remove('enter');void $(layer).offsetWidth;$(layer).classList.add('enter');shownLayer=layer;}
  $('road').classList.toggle('walking',state.phase==='walking');
  $('character-box').classList.toggle('walking',state.phase==='walking');
  $('beacon').classList.toggle('near',state.phase==='discovered');
  $('beacon').classList.toggle('spent',state.completed||state.phase==='collecting');
  $('road-title').textContent=state.phase==='discovered'?'有一段回忆，在等她':state.completed?'带着快乐，继续往前':'沿着日子，慢慢走';
  $('road-copy').textContent=state.phase==='discovered'?'她停下来，望向右侧的一束金光。':state.phase==='collecting'?'把这一刻，轻轻收进包里。':state.completed?'快乐的片段，已经好好收藏。':'每一小步，都离回忆近一点。';
  if(state.phase==='discovered')pose('curious');
  else if(state.phase==='collecting')pose(state.collectionStage==='wink'?'wink':state.collectionStage==='idle'?'idle':'expect');
  else if(state.phase!=='walking')pose('idle');
  if(isStory && shownPanel!==state.panelIndex){
    shownPanel=state.panelIndex;const panel=story.panels[shownPanel];
    $('panel-image').src=panel.image;$('panel-image').alt=`羽毛球第 ${shownPanel+1} 幕：${panel.caption}`;
    $('story-wash').style.backgroundImage=`url("${panel.image}")`;
    $('caption').textContent=panel.caption;$('caption').classList.remove('reveal');void $('caption').offsetWidth;$('caption').classList.add('reveal');
    $('panel-number').textContent=`0${shownPanel+1} / 04`;announce(panel.caption);
    if(shownPanel<3)preload(story.panels[shownPanel+1].image);
  }
  const busy=['walking','collecting'].includes(state.phase);book.setAttribute('aria-busy',String(busy));
  $('gesture-hint').classList.toggle('busy',busy);
  const touch=window.matchMedia('(pointer: coarse)').matches;
  let hint=touch?'手指向下划，继续前进':'滚轮向下，继续前进';
  if(state.phase==='cover')hint=touch?'手指向下划，开启回忆':'滚轮向下，开启回忆';
  if(state.phase==='discovered')hint=touch?'再向下划，走进这段回忆':'再向下滚，走进这段回忆';
  if(isStory)hint=state.panelIndex===3?(touch?'上划回看 · 下划收藏这段回忆':'向上回看 · 向下收藏这段回忆'):(touch?'下划翻页 · 上划回看':'向下翻页 · 向上回看');
  if(state.phase==='walking')hint='她正在向前走…';
  if(state.phase==='collecting')hint=state.collectionStage==='wink'?'又收藏了一份快乐':'让快乐，成为一枚纪念';
  $('hint-copy').textContent=hint;
  $('debug-state').textContent=`${state.phase} · ${state.distance}步 · 幕${state.panelIndex+1} · 勋章${state.badges.length}`;
  if(state.phase==='roadIdle'||state.phase==='discovered')preload(story.panels[0].image);
  if(state.phase==='collecting'){requestAnimationFrame(positionGlow);}
}
function commit(action){state=transition(state,action);saveProgress(storage,state);render();}
async function motion(){
  if(activeMotion)return;activeMotion=true;const token=generation;
  try {
    if(state.phase==='walking'){
      for(const name of ['stepLeft','idle','stepRight','idle']){pose(name);await sleep(reduced?45:150);if(token!==generation)return;}
      commit({type:'WALK_DONE'});
    }else if(state.phase==='collecting'){
      await sleep(reduced?100:350);if(token!==generation)return;
      commit({type:'COLLECTION_STAGE',stage:'bag-light'});positionGlow();$('bag-glow').classList.add('visible');
      await sleep(reduced?90:350);if(token!==generation)return;
      await flyBadge({book,character:$('character'),badge:$('flying-badge'),anchor:character.bagMouth,reduced});if(token!==generation)return;
      commit({type:'COLLECTION_STAGE',stage:'closed'});await sleep(reduced?80:280);if(token!==generation)return;
      $('bag-glow').classList.remove('visible');commit({type:'COLLECTION_STAGE',stage:'wink'});
      await sleep(reduced?160:650);if(token!==generation)return;
      commit({type:'COLLECTION_STAGE',stage:'idle'});await sleep(reduced?80:250);if(token!==generation)return;
      commit({type:'COLLECT_DONE'});announce('羽毛球纪念勋章已收藏，继续沿着小路往前走。');
    }
  }finally{if(token===generation)activeMotion=false;}
}
async function consume(type){
  if(flipLock||activeMotion||['walking','collecting'].includes(state.phase))return;
  const next=transition(state,{type});
  if(next.phase===state.phase && next.panelIndex===state.panelIndex)return;
  flipLock=true;const token=generation;
  let required=[];
  if(next.phase==='story')required=[story.panels[next.panelIndex].image];
  if(next.phase==='roadIdle')required=[character.idle];
  if(next.phase==='walking')required=[character.stepLeft,character.stepRight,character.idle,character.curious];
  if(next.phase==='collecting')required=[character.expect,character.wink,'assets/badminton-badge.png'];
  if(required.length){
    book.setAttribute('aria-busy','true');const success=(await Promise.all(required.map(preload))).every(Boolean);
    if(token!==generation)return;if(!success){$('asset-error').hidden=false;book.setAttribute('aria-busy','false');flipLock=false;return;}
  }
  commit({type});motion();
  await sleep(reduced?70:300);if(token===generation)flipLock=false;
}
bindInput(book,consume);
for(const image of document.querySelectorAll('img'))image.addEventListener('error',()=>{$('asset-error').hidden=false;});
for(const src of Object.values(character).filter(v=>typeof v==='string'))preload(src);
preload('assets/badminton-badge.png');
window.addEventListener('resize',()=>{if(state.phase==='collecting')positionGlow();});
$('debug').hidden=!debug;
function reset(){generation++;activeMotion=false;flipLock=false;shownPanel=-1;
  $('flying-badge').getAnimations().forEach(a=>a.cancel());$('flying-badge').hidden=true;$('bag-glow').classList.remove('visible');
  state=initialState();saveProgress(storage,state);render();}
$('reset').addEventListener('click',reset);
const controls={get state(){return structuredClone(state);},advance:()=>consume('ADVANCE'),back:()=>consume('BACK'),reset};
if(debug)window.storyDebug=controls;
render();motion();
return controls;
}
