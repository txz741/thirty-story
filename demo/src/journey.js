import {events,eventFor,panelsFor,pendingBadges,badges,character,finale} from './journey-data.js';
import {transition,initialState} from './journey-state.js';
import {loadProgress,saveProgress} from './progress.js';
import {bindInput} from './input.js';
import {bagPosition,flyBadge} from './badge-animation.js';
import {renderFinale} from './finale.js';

export function mountStorybook({document=globalThis.document,window=globalThis.window,location=globalThis.location,Image=globalThis.Image,requestAnimationFrame=globalThis.requestAnimationFrame,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  const $=id=>document.getElementById(id),book=$('book');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debug=new URLSearchParams(location.search).get('debug')==='1';
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  let state=loadProgress(storage),generation=0,flipLock=false,shownKey='',shownLayer='',overlayKey='',activeMotion=false;
  const imagePromises=new Map();
  const isFinale=s=>['finale','finished'].includes(s.phase);
  const pose=name=>{$('character').src=character[name]||character.idle;};
  const announce=text=>{$('announcement').textContent=text;};
  function preload(src){
    if(!imagePromises.has(src))imagePromises.set(src,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=src;}));
    return imagePromises.get(src);
  }
  function positionGlow(){const p=bagPosition(book,$('character'),character.bagMouth);$('bag-glow').style.left=p.x+'px';$('bag-glow').style.top=p.y+'px';}
  function drawFinale(){if(isFinale(state))renderFinale({book,image:$('panel-image'),overlay:$('finale-overlay'),state,reduced});}
  function render(){
    const event=eventFor(state),list=panelsFor(state),final=isFinale(state);
    const storyVisible=['story','branchChoice','finale','finished'].includes(state.phase);
    const layer=state.phase==='cover'?'cover':storyVisible?'story':'road';
    for(const id of ['cover','road','story'])$(id).hidden=id!==layer;
    if(layer!==shownLayer){$(layer).classList.remove('enter');void $(layer).offsetWidth;$(layer).classList.add('enter');shownLayer=layer;}
    $('road').classList.toggle('walking',state.phase==='walking');$('character-box').classList.toggle('walking',state.phase==='walking');
    $('beacon').classList.toggle('near',state.phase==='discovered');$('beacon').classList.toggle('spent',state.phase==='collecting');
    $('road-title').textContent=state.phase==='discovered'?event.title:state.phase==='collecting'?'把这一刻，好好收藏':'沿着日子，慢慢走';
    $('road-copy').textContent=state.phase==='discovered'?'她停下来，望向右侧的一束金光。':state.phase==='collecting'?'把这一刻，轻轻收进包里。':'每一小步，都离回忆近一点。';
    if(state.phase==='discovered')pose('curious');
    else if(state.phase==='collecting')pose(state.collectionStage==='wink'?'wink':state.collectionStage==='idle'?'idle':'expect');
    else if(state.phase!=='walking')pose('idle');
    const key=storyVisible?`${final?'finale':event.id}:${state.branchChoice||'unselected'}:${state.panelIndex}`:'';
    if(storyVisible&&key!==shownKey){
      shownKey=key;const panel=list[state.panelIndex];$('panel-image').src=panel.image;
      $('panel-image').alt=`${final?'终章':event.title}第 ${state.panelIndex+1} 幕：${panel.caption}`;
      $('story-wash').style.backgroundImage=`url("${panel.image}")`;
      $('caption').textContent=panel.caption;$('caption').classList.remove('reveal');void $('caption').offsetWidth;$('caption').classList.add('reveal');
      $('panel-number').textContent=`${String(state.panelIndex+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}`;
      announce(panel.caption);if(state.panelIndex<list.length-1)preload(list[state.panelIndex+1].image);
    }
    $('story-title').textContent=final?'终章 · 乘风去往回忆里':`${String(state.eventIndex+1).padStart(2,'0')} · ${event.title}`;
    $('story').setAttribute('aria-label',final?'终章五幕':event.title+'回忆分镜');
    $('branch-choice').hidden=state.phase!=='branchChoice';
    if(state.phase==='branchChoice')$('branch-title').textContent=event.branch.title;
    $('finale-overlay').hidden=!final;
    const nextOverlay=final?`${state.panelIndex}:${state.badges.join(',')}`:'';
    if(nextOverlay!==overlayKey){overlayKey=nextOverlay;if(final)requestAnimationFrame(drawFinale);else $('finale-overlay').innerHTML='';}
    const busy=['walking','collecting'].includes(state.phase);book.setAttribute('aria-busy',String(busy));
    $('gesture-hint').classList.toggle('busy',busy);
    const touch=window.matchMedia('(pointer: coarse)').matches;
    let hint=touch?'手指向下划，继续前进':'滚轮向下，继续前进';
    if(state.phase==='cover')hint=touch?'手指向下划，开启回忆':'滚轮向下，开启回忆';
    if(state.phase==='discovered')hint=touch?'再向下划，走进这段回忆':'再向下滚，走进这段回忆';
    if(state.phase==='story')hint=state.panelIndex===list.length-1?(event.exit==='finale'?'下划，迎接最后的惊喜':'上划回看 · 下划收藏这段回忆'):'下划翻页 · 上划回看';
    if(final)hint=state.panelIndex===finale.panels.length-1?'带着回忆，继续向前 · 上划可回看':'下划翻页 · 上划回看';
    if(state.phase==='walking')hint='她正在向前走…';
    if(state.phase==='collecting')hint=state.collectionStage==='wink'?'又收藏了一份快乐':'让快乐，成为一枚纪念';
    if(state.phase==='branchChoice')hint='这一次，想走进哪一种可能？';
    $('hint-copy').textContent=hint;
    $('debug-state').textContent=`${state.phase} · 故事${state.eventIndex+1}/10 · ${state.distance}步 · 幕${state.panelIndex+1} · 勋章${state.badges.length}`;
    if(['roadIdle','discovered'].includes(state.phase))preload(event.panels[0].image);
    if(state.phase==='collecting')requestAnimationFrame(positionGlow);
  }
  function commit(action){state=transition(state,action);saveProgress(storage,state);render();}
  async function motion(){
    if(activeMotion)return;activeMotion=true;const token=generation;
    try{
      if(state.phase==='walking'){
        for(const name of ['stepLeft','idle','stepRight','idle']){pose(name);await delay(reduced?45:150);if(token!==generation)return;}
        commit({type:'WALK_DONE'});if(state.phase==='discovered')announce('发现一段回忆：'+eventFor(state).title);
      }else if(state.phase==='collecting'){
        const queue=pendingBadges(state);
        const ready=(await Promise.all([...queue.map(id=>badges[id].image),character.expect,character.wink].map(preload))).every(Boolean);
        if(token!==generation)return;if(!ready){$('asset-error').hidden=false;return;}
        await delay(reduced?100:350);if(token!==generation)return;
        commit({type:'COLLECTION_STAGE',stage:'bag-light'});positionGlow();$('bag-glow').classList.add('visible');
        await delay(reduced?90:350);if(token!==generation)return;
        for(const id of queue){
          $('flying-badge').src=badges[id].image;$('flying-badge').alt=badges[id].title+'纪念勋章';
          await flyBadge({book,character:$('character'),badge:$('flying-badge'),anchor:character.bagMouth,reduced});if(token!==generation)return;
          await delay(reduced?40:160);if(token!==generation)return;
        }
        commit({type:'COLLECTION_STAGE',stage:'closed'});await delay(reduced?80:280);if(token!==generation)return;
        $('bag-glow').classList.remove('visible');commit({type:'COLLECTION_STAGE',stage:'wink'});
        await delay(reduced?160:650);if(token!==generation)return;
        commit({type:'COLLECTION_STAGE',stage:'idle'});await delay(reduced?80:250);if(token!==generation)return;
        commit({type:'COLLECT_DONE'});announce('这段回忆已收藏，继续沿着小路往前走。');
      }
    }finally{if(token===generation)activeMotion=false;}
  }
  async function perform(action){
    if(flipLock||activeMotion||['walking','collecting'].includes(state.phase))return;
    if(state.phase==='branchChoice'&&action.type!=='SELECT_BRANCH')return;
    const next=transition(state,action);
    if(next.phase===state.phase&&next.panelIndex===state.panelIndex&&next.eventIndex===state.eventIndex&&next.branchChoice===state.branchChoice)return;
    flipLock=true;const token=generation;let required=[];
    if(['story','branchChoice','finale','finished'].includes(next.phase))required=[panelsFor(next)[next.panelIndex].image];
    if(next.phase==='roadIdle')required=[character.idle];
    if(next.phase==='walking')required=[character.stepLeft,character.stepRight,character.idle,character.curious];
    if(next.phase==='collecting')required=[character.expect,character.wink,...pendingBadges(next).map(id=>badges[id].image)];
    if(isFinale(next))required.push(...next.badges.map(id=>badges[id].image));
    if(required.length){
      book.setAttribute('aria-busy','true');const ready=(await Promise.all(required.map(preload))).every(Boolean);
      if(token!==generation)return;if(!ready){$('asset-error').hidden=false;book.setAttribute('aria-busy','false');flipLock=false;return;}
    }
    commit(action);motion();await delay(reduced?70:300);if(token===generation)flipLock=false;
  }
  bindInput(book,type=>perform({type}));
  for(const image of document.querySelectorAll('img'))image.addEventListener('error',()=>{$('asset-error').hidden=false;});
  $('panel-image').addEventListener('load',drawFinale);
  for(const src of Object.values(character).filter(v=>typeof v==='string'))preload(src);
  window.addEventListener('resize',()=>{if(state.phase==='collecting')positionGlow();drawFinale();});
  $('debug').hidden=!debug;
  function reset(){generation++;activeMotion=false;flipLock=false;shownKey='';overlayKey='';
    $('flying-badge').getAnimations().forEach(a=>a.cancel());$('flying-badge').hidden=true;$('bag-glow').classList.remove('visible');$('asset-error').hidden=true;
    state=initialState();saveProgress(storage,state);render();}
  $('reset').addEventListener('click',reset);
  $('choose-reality').addEventListener('click',()=>perform({type:'SELECT_BRANCH',choice:'reality'}));
  $('choose-if').addEventListener('click',()=>perform({type:'SELECT_BRANCH',choice:'if'}));
  const controls={get state(){return structuredClone(state);},advance:()=>perform({type:'ADVANCE'}),back:()=>perform({type:'BACK'}),selectBranch:choice=>perform({type:'SELECT_BRANCH',choice}),reset};
  if(debug)window.storyDebug=controls;
  render();motion();return controls;
}
