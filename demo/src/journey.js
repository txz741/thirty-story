import {events,eventFor,panelsFor,pendingBadges,badges,character,finale,allAssets} from './journey-data.js';
import {transition,initialState} from './journey-state.js';
import {bindInput} from './input.js';
import {bagPosition,flyBadge} from './badge-animation.js';
import {presentBadge} from './badge-presentation.js';
import {renderFinale,FINALE_GATHER_START_MS} from './finale.js';
import {createAssetLoader} from './asset-loader.js';
import {createChapterRoad} from './chapter-road.js';
import {createChapterTransition} from './chapter-transition.js';
import {createFinaleVideo} from './finale-video.js';
import {chapterForEvent,CHAPTER_TRANSITION} from './chapter-config.js';

export function mountStorybook({document=globalThis.document,window=globalThis.window,location=globalThis.location,Image=globalThis.Image,requestAnimationFrame=globalThis.requestAnimationFrame,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),audio={play(){},stopGroup(){},stopEffects(){}},onStateChange=()=>{},assetLoader}={}){
  const $=id=>document.getElementById(id),book=$('book');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debug=new URLSearchParams(location.search).get('debug')==='1';
  let state=initialState(),generation=0,flipLock=false,shownKey='',shownLayer='',overlayKey='',activeMotion=false,finaleSoundToken=0,waitingAssets=false,queuedAction=null,failedAction=null;
  const assets=assetLoader||createAssetLoader({Image,concurrency:window.navigator?.connection?.saveData?2:3});
  const chapterRoad=createChapterRoad({document,book});
  const chapterTransition=createChapterTransition({document,window,book});
  const finaleVideo=createFinaleVideo({video:$('panel-video'),button:$('play-finale-video'),document,src:finale.panels.at(-1).video,poster:finale.panels.at(-1).image});
  const isFinale=s=>['finale','finished'].includes(s.phase);
  const pose=name=>{$('character').src=character[name]||character.idle;};
  const announce=text=>{$('announcement').textContent=text;};
  const preload=src=>assets.load(src);
  async function requireAssets(sources){
    const token=generation;
    const missing=sources.some(src=>!assets.isReady(src));
    if(missing){waitingAssets=true;book.setAttribute('aria-busy','true');$('hint-copy').textContent='正在准备下一幕，请稍等，不必重复滑动…';$('gesture-hint').classList.add('loading');}
    try{return (await Promise.all(sources.map(src=>assets.load(src,{urgent:true})))).every(Boolean);}
    finally{if(token===generation){waitingAssets=false;$('gesture-hint').classList.remove('loading');}}
  }
  function positionGlow(){const p=bagPosition(book,$('character'),state.collectionStage==='bag-open'?character.openBagMouth:character.bagMouth);$('bag-glow').style.left=p.x+'px';$('bag-glow').style.top=p.y+'px';}
  function drawFinale(){if(isFinale(state))renderFinale({book,image:$('panel-video').hidden?$('panel-image'):$('panel-video'),overlay:$('finale-overlay'),state,reduced});}
  function render(){
    chapterTransition(state);
    const event=eventFor(state),list=panelsFor(state),final=isFinale(state);
    const roadFrame=chapterRoad(state);
    const storyVisible=['story','branchChoice','finale','finished'].includes(state.phase);
    finaleVideo.setActive(final&&state.panelIndex===finale.panels.length-1);
    const layer=state.phase==='cover'?'cover':storyVisible?'story':'road';
    for(const id of ['cover','road','story'])$(id).hidden=id!==layer;
    if(layer!==shownLayer){$(layer).classList.remove('enter');void $(layer).offsetWidth;$(layer).classList.add('enter');shownLayer=layer;}
    $('road').classList.toggle('walking',state.phase==='walking');$('character-box').classList.toggle('walking',state.phase==='walking');
    $('beacon').classList.toggle('near',state.phase==='discovered');$('beacon').classList.toggle('spent',state.phase==='collecting');
    $('road-title').textContent=state.chapterExit?'带着回忆，继续向前':state.phase==='chapterEntering'?roadFrame.chapter.title:state.phase==='discovered'?event.title:state.phase==='collecting'?'把这一刻，好好收藏':'沿着日子，慢慢走';
    $('road-copy').textContent=state.chapterExit?`再走 ${Math.max(0,4-state.distance)} 步，去往下一段旅程。`:state.phase==='discovered'?`她停下来，望向${roadFrame.side==='left'?'左':'右'}侧的一束金光。`:state.phase==='collecting'?'把这一刻，轻轻收进包里。':'每一小步，都离回忆近一点。';
    if(state.phase==='discovered')pose('curious');
    else if(state.phase==='collecting')pose(state.collectionStage==='wink'?'wink':state.collectionStage==='idle'?'idle':state.collectionStage==='bag-open'?'bagOpen':'expect');
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
    const busy=['walking','collecting','chapterTransition','chapterEntering'].includes(state.phase);book.setAttribute('aria-busy',String(busy));
    $('gesture-hint').classList.toggle('busy',busy);
    const touch=window.matchMedia('(pointer: coarse)').matches;
    const forward=touch?'上划':'向下滚动',back=touch?'下划':'向上滚动';
    let hint=touch?'手指向上划，继续前进':'滚轮向下，继续前进';
    if(state.phase==='cover')hint=touch?'手指向上划，开启回忆':'滚轮向下，开启回忆';
    if(state.phase==='discovered')hint=touch?'再向上划，走进这段回忆':'再向下滚，走进这段回忆';
    if(state.phase==='story')hint=state.panelIndex===list.length-1?(event.exit==='finale'?`${forward}，迎接最后的惊喜`:`${back}回看 · ${forward}收藏这段回忆`):`${forward}翻页 · ${back}回看`;
    if(final)hint=state.panelIndex===finale.panels.length-1?`带着回忆，继续向前 · ${back}可回看`:`${forward}翻页 · ${back}回看`;
    if(state.phase==='walking')hint='她正在向前走…';
    if(state.chapterExit&&state.phase==='roadIdle')hint=`${forward}，继续走向下一乐章 · ${state.distance}/4`;
    if(state.phase==='chapterTransition')hint='这一段回忆，慢慢收进心里…';
    if(state.phase==='chapterEntering')hint=roadFrame.chapter.title;
    if(state.phase==='collecting')hint=state.collectionStage==='wink'?'又收藏了一份快乐':state.collectionStage==='showcase'?'让这一刻，闪闪发光':'让快乐，成为一枚纪念';
    if(state.phase==='branchChoice')hint='这一次，想走进哪一种可能？';
    $('hint-copy').textContent=hint;
    $('debug-state').textContent=`${state.phase} · 故事${state.eventIndex+1}/10 · ${state.distance}步 · 幕${state.panelIndex+1} · 勋章${state.badges.length}`;
    if(['roadIdle','discovered'].includes(state.phase))preload(event.panels[0].image);
    if(state.phase==='collecting')requestAnimationFrame(positionGlow);
  }
  function commit(action){
    const previous=state;state=transition(state,action);render();
    onStateChange(state,action,previous);
    if(previous.phase==='walking'&&state.phase==='discovered')audio.play('discovery',{group:'discovery',replace:true});
    if(previous.phase==='discovered'&&state.phase==='story')audio.play('memory-enter',{group:'memory-enter',replace:true});
    if(action.type==='SELECT_BRANCH'&&state.phase==='story')audio.play('memory-enter',{group:'memory-enter',replace:true});
    if((isFinale(state)||isFinale(previous))&&(state.phase!==previous.phase||state.panelIndex!==previous.panelIndex)){
      const token=++finaleSoundToken;audio.stopGroup('finale');audio.stopGroup('final-badge');
      if(isFinale(state)&&state.panelIndex===0)audio.play('badge-shimmer',{group:'final-badge',replace:true});
      if(isFinale(state)&&state.panelIndex===1)audio.play('finale-sparkle',{group:'finale',replace:true});
      if(isFinale(state)&&state.panelIndex===2){
        void delay(reduced?0:FINALE_GATHER_START_MS).then(()=>{
          if(token===finaleSoundToken&&isFinale(state)&&state.panelIndex===2)audio.play('finale-sparkle',{group:'finale',replace:true});
        });
      }
    }
  }
  async function motion(){
    if(activeMotion)return;activeMotion=true;const token=generation;
    try{
      if(state.phase==='walking'){
        for(const name of ['stepLeft','idle','stepRight','idle']){pose(name);await delay(reduced?45:150);if(token!==generation)return;}
        commit({type:'WALK_DONE'});if(state.phase==='discovered')announce('发现一段回忆：'+eventFor(state).title);
      }else if(state.phase==='collecting'){
        const queue=pendingBadges(state);
        const ready=await requireAssets([...queue.map(id=>badges[id].image),character.expect,character.bagOpen,character.wink]);
        if(token!==generation)return;if(!ready){render();$('asset-error').hidden=false;book.setAttribute('aria-busy','false');return;}
        await delay(reduced?100:350);if(token!==generation)return;
        for(const id of queue){
          $('bag-glow').classList.remove('visible');commit({type:'COLLECTION_STAGE',stage:'showcase'});
          $('flying-badge').src=badges[id].image;$('flying-badge').alt=badges[id].title+'纪念勋章';
          const current=()=>token===generation;
          if(!await presentBadge({book,badge:$('flying-badge'),delay,isCurrent:current,onPresent:()=>audio.play('badge-shimmer',{group:'badge-showcase',replace:true,maxDuration:3})}))return;
          audio.stopGroup('badge-showcase');
          commit({type:'COLLECTION_STAGE',stage:'bag-light'});positionGlow();$('bag-glow').classList.add('visible');
          audio.play('badge-fly',{group:'badge-flight',replace:true,maxDuration:reduced ? .22 : 1.2});
          const arrived=await flyBadge({book,character:$('character'),badge:$('flying-badge'),anchor:character.openBagMouth,reduced,isCurrent:current,requestFrame:requestAnimationFrame,onApproach:()=>{commit({type:'COLLECTION_STAGE',stage:'bag-open'});positionGlow();}});
          if(!arrived||token!==generation)return;
          audio.stopGroup('badge-flight');$('bag-glow').classList.remove('visible');
          commit({type:'COLLECTION_STAGE',stage:'wink'});audio.play('badge-collect',{group:'badge-reward',replace:true});
          await delay(reduced?160:650);if(token!==generation)return;
          if(id===queue.at(-1))onStateChange(state,{type:'COLLECTION_WINK_DONE'});
        }
        commit({type:'COLLECTION_STAGE',stage:'idle'});await delay(reduced?80:250);if(token!==generation)return;
        commit({type:'COLLECT_DONE'});announce('这段回忆已收藏，继续沿着小路往前走。');
      }
      if(state.phase==='chapterTransition'){
        for(let remaining=CHAPTER_TRANSITION.fadeOutMs;remaining>0;){const hidden=!!document.hidden;await delay(100);if(token!==generation)return;if(!hidden&&!document.hidden)remaining-=100;}
        if(token!==generation)return;commit({type:'CHAPTER_FADE_DONE'});
        for(let remaining=CHAPTER_TRANSITION.fadeInMs;remaining>0;){const hidden=!!document.hidden;await delay(100);if(token!==generation)return;if(!hidden&&!document.hidden)remaining-=100;}
        commit({type:'CHAPTER_ENTER_DONE'});announce(chapterForEvent(state.eventIndex).title);
      }
    }finally{if(token===generation)activeMotion=false;}
  }
  async function perform(action){
    if(activeMotion||['walking','collecting','chapterTransition','chapterEntering'].includes(state.phase))return;
    if(flipLock){if(!waitingAssets&&state.phase!=='branchChoice'&&['ADVANCE','BACK'].includes(action.type))queuedAction=action;return;}
    if(state.phase==='branchChoice'&&action.type!=='SELECT_BRANCH')return;
    const next=transition(state,action);
    if(next.phase===state.phase&&next.panelIndex===state.panelIndex&&next.eventIndex===state.eventIndex&&next.branchChoice===state.branchChoice)return;
    flipLock=true;const token=generation;let required=[];
    if(['story','branchChoice','finale','finished'].includes(next.phase))required=[panelsFor(next)[next.panelIndex].image];
    if(next.phase==='roadIdle')required=[character.idle,chapterForEvent(next.eventIndex).background].filter(Boolean);
    if(next.phase==='walking')required=[character.stepLeft,character.stepRight,character.idle,character.curious];
    // Finish loading the next map before the fourth exit step, so white-out lasts 2s.
    if(next.phase==='walking'&&next.chapterExit&&next.distance===CHAPTER_TRANSITION.exitSteps-1){
      const background=chapterForEvent(next.eventIndex+1).background;if(background)required.push(background);
    }
    if(next.phase==='collecting')required=[character.expect,character.bagOpen,character.wink,...pendingBadges(next).map(id=>badges[id].image)];
    if(isFinale(next))required.push(...next.badges.map(id=>badges[id].image));
    if(required.length){
      const ready=await requireAssets(required);
      if(token!==generation)return;if(!ready){failedAction=action;queuedAction=null;render();$('asset-error').hidden=false;book.setAttribute('aria-busy','false');flipLock=false;return;}
    }
    failedAction=null;$('asset-error').hidden=true;commit(action);motion();await delay(reduced?70:300);
    if(token===generation){flipLock=false;const queued=queuedAction;queuedAction=null;if(queued)void perform(queued);}
  }
  bindInput(book,type=>perform({type}));
  for(const image of document.querySelectorAll('img'))image.addEventListener('error',()=>{assets.invalidate(image.getAttribute?.('src')||image.src);$('asset-error').hidden=false;});
  $('panel-image').addEventListener('load',drawFinale);
  $('panel-video').addEventListener('loadedmetadata',drawFinale);
  const initialAssets=[...Object.values(character).filter(v=>typeof v==='string'),...events[0].panels.map(panel=>panel.image),badges[events[0].badge].image];
  const warming=assets.warm([...initialAssets,...allAssets]);
  assets.subscribe(progress=>{
    const percent=progress.total?Math.round(progress.loaded/progress.total*100):0;
    $('preload-status').textContent=progress.loaded===progress.total?'回忆已准备好，向上划开启':progress.active===0&&progress.queued===0?'大部分回忆已准备好，可向上划开始':`正在提前准备回忆 ${percent}% · 可以上划开始`;
  });
  window.addEventListener('resize',()=>{chapterRoad(state);if(state.phase==='collecting')positionGlow();drawFinale();});
  $('debug').hidden=!debug;
  function reset(){if(['chapterTransition','chapterEntering'].includes(state.phase))return;generation++;finaleSoundToken++;activeMotion=false;flipLock=false;waitingAssets=false;queuedAction=null;failedAction=null;shownKey='';overlayKey='';
    audio.stopEffects();
    $('gesture-hint').classList.remove('loading');
    $('flying-badge').getAnimations().forEach(a=>a.cancel());$('flying-badge').classList.remove('badge-presenting');$('flying-badge').hidden=true;$('bag-glow').classList.remove('visible');$('asset-error').hidden=true;
    state=initialState();render();onStateChange(state,{type:'RESET'});}
  $('reset').addEventListener('click',reset);
  $('retry-assets').addEventListener('click',async()=>{
    if(waitingAssets||activeMotion)return;$('asset-error').hidden=true;
    if(['collecting','chapterTransition'].includes(state.phase)){void motion();return;}
    if(failedAction){const action=failedAction;failedAction=null;void perform(action);return;}
    const required=['story','finale','finished'].includes(state.phase)?[panelsFor(state)[state.panelIndex].image]:[character.idle];
    if(await requireAssets(required)){shownKey='';render();}else $('asset-error').hidden=false;
  });
  $('choose-reality').addEventListener('click',()=>perform({type:'SELECT_BRANCH',choice:'reality'}));
  $('choose-if').addEventListener('click',()=>perform({type:'SELECT_BRANCH',choice:'if'}));
  const controls={get state(){return structuredClone(state);},get loading(){return assets.state;},ready:warming,advance:()=>perform({type:'ADVANCE'}),back:()=>perform({type:'BACK'}),selectBranch:choice=>perform({type:'SELECT_BRANCH',choice}),reset};
  if(debug)window.storyDebug=controls;
  render();motion();return controls;
}
