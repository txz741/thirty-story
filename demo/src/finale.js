import {badges} from './journey-data.js';
import {endingMouthPose,endingBadgeFormation,positionEndingBadges} from './ending-badges.js';
export const FINALE_GATHER_START_MS=1000;
export const FINALE_GATHER_DURATION_MS=1450;
export const FINALE_STAGGER_MS=90;
export const FINALE_ORBIT_SECONDS=32;
export const ENDING_CREDITS=[['导演',['文邹邹']],['编剧',['文邹邹']],['主演',['文邹邹']],['客串',['妈妈','大鹅']]];
export const ENDING_TIMING={delayMs:1000,rollMs:18000,gapMs:500,riseMs:3200,breatheMs:4600};
export const ENDING_LINE='Still On The Way ...';
export const collectedMemories=ids=>[...new Set(ids)].filter(id=>id!=='wings'&&Object.hasOwn(badges,id));
export const finaleOrbitStart=count=>FINALE_GATHER_START_MS+Math.max(0,count-1)*FINALE_STAGGER_MS+FINALE_GATHER_DURATION_MS+150;
export function artBounds(book,image){
  const stage=book.getBoundingClientRect(),box=image.getBoundingClientRect();
  const iw=image.naturalWidth||image.width||900,ih=image.naturalHeight||image.height||1600,scale=Math.min(box.width/iw,box.height/ih);
  return {left:box.left-stage.left+(box.width-iw*scale)/2,top:box.top-stage.top+(box.height-ih*scale)/2,width:iw*scale,height:ih*scale};
}
export function finaleLayout(panelIndex,ids,width,height){
  const unique=[...new Set(ids)].filter(id=>Object.hasOwn(badges,id)),outer=collectedMemories(ids);
  if(panelIndex===0)return [{id:'wings',x:width*.66,y:height*.2,size:width*.24,role:'center'}];
  if(panelIndex===3)return [];
  if(panelIndex===4){const mouth=endingMouthPose();return endingBadgeFormation(unique).map(item=>({id:item.id,x:(mouth.x+item.dx)/941*width,y:(mouth.y+item.dy)/1672*height,size:item.size/941*width,delay:item.delay,role:'companion'}));}
  if(panelIndex===2){
    const radius=Math.min(width*.34,height*.27),cx=width*.5,cy=height*.4;
    return [{id:'wings',x:cx,y:cy,size:width*.25,role:'center'},...outer.map((id,i)=>{const angle=-Math.PI/2+i*2*Math.PI/outer.length;return {id,x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius,size:width*.155,role:'orbit',delay:(FINALE_GATHER_START_MS+i*FINALE_STAGGER_MS)/1000};})];
  }
  return (panelIndex===1?outer:unique).map((id,i,list)=>{
    const t=list.length>1?i/(list.length-1):0;
    if(panelIndex===1)return {id,x:width*(.14+.72*t),y:height*(.22+.13*(1-Math.sin(Math.PI*t))),size:width*.145,delay:i*.09,role:'bag'};
    return {id,x:width*(.38-.25*t),y:height*(.43+.43*t-.09*Math.sin(Math.PI*t)),size:width*(.14-.05*t),delay:i*.12,role:'trail'};
  });
}
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export function endingCreditsMarkup(){
  const t=ENDING_TIMING,titleAt=t.delayMs+t.rollMs+t.gapMs;
  return `<section class="ending-credits" aria-label="演职员表与谢幕" style="--credits-delay:${t.delayMs}ms;--credits-roll-duration:${t.rollMs}ms;--ending-title-at:${titleAt}ms;--ending-title-rise:${t.riseMs}ms;--ending-breathe-at:${titleAt+t.riseMs}ms;--ending-breathe-duration:${t.breatheMs}ms"><div class="ending-credits-window"><div class="ending-credits-travel"><dl class="ending-credits-list">${ENDING_CREDITS.map(([role,names])=>`<div class="ending-credit"><dt>${escape(role)}</dt><dd>${names.map(name=>`<span>${escape(name)}</span>`).join('')}</dd></div>`).join('')}</dl></div></div><div class="ending-title-position"><p class="ending-title"><span>${ENDING_LINE}</span></p></div></section>`;
}
export function renderFinale({book,image,overlay,state,reduced}){
  const bounds=artBounds(book,image),items=finaleLayout(state.panelIndex,state.badges,bounds.width,bounds.height);
  overlay.style.left=bounds.left+'px';overlay.style.top=bounds.top+'px';overlay.style.width=bounds.width+'px';overlay.style.height=bounds.height+'px';
  overlay.style.fontSize=bounds.width/20+'px';
  overlay.style.setProperty?.('--ending-center',((book.getBoundingClientRect().height/2-bounds.top)/bounds.height*100)+'%');
  const document=book.ownerDocument;
  if(document&&!overlay._finaleVisibilityBound){document.addEventListener('visibilitychange',()=>overlay.classList.toggle('finale-paused',document.hidden));overlay._finaleVisibilityBound=true;}
  overlay.className=`finale-overlay scene-${state.panelIndex}${reduced?' reduced':''}${document?.hidden?' finale-paused':''}`;
  if(state.panelIndex===4)positionEndingBadges(overlay,overlay._endingFrameIndex??-1);
  // Repeated image-load notifications must not restart the same choreography.
  // The final scene uses relative positions so resizing also preserves the credit roll.
  const key=`${state.panelIndex}:${state.badges.join(',')}:${state.panelIndex===4?'responsive':bounds.width+':'+bounds.height}:${reduced}`;
  if(overlay._finaleRenderKey===key&&overlay.innerHTML)return items;
  overlay._finaleRenderKey=key;
  if(state.panelIndex===4){
    const formation=endingBadgeFormation(items.map(item=>item.id),overlay._endingFrameIndex??-1,overlay._endingRibbonClock);
    overlay.innerHTML='<div class="ending-badge-flight ending-badge-ribbon" aria-label="从包口迎风飘起、如丝带般波动的回忆勋章">'+formation.map(item=>`<div class="memory-placement" data-ribbon-bead style="left:${item.dx/941*20}em;top:${item.dy/941*20}em"><img class="memory-badge" data-badge="${item.id}" data-origin="companion" src="${badges[item.id].image}" alt="${escape(badges[item.id].title)}" style="width:${item.size/941*20}em;height:${item.size/941*20}em"></div>`).join('')+'</div>'+endingCreditsMarkup();
    positionEndingBadges(overlay,overlay._endingFrameIndex??-1);
    return items;
  }
  const orbitAt=finaleOrbitStart(items.filter(item=>item.role==='orbit').length)/1000;
  const ring=state.panelIndex===2?`<div class="memory-ring" style="left:50%;top:40%;width:${Math.min(bounds.width*.68,bounds.height*.54)}px;--orbit-at:${orbitAt}s"></div>`:'';
  overlay.innerHTML=ring+items.map((item,i)=>{
    const size=state.panelIndex===4?(item.size/bounds.width*20)+'em':item.size+'px';
    const img=`<img class="memory-badge${item.role==='center'?' memory-center':''}" data-badge="${item.id}" data-origin="${item.role}" src="${badges[item.id].image}" alt="${escape(badges[item.id].title)}" style="width:${size};height:${size}">`;
    if(item.role==='orbit'){
      const dx=item.x-bounds.width*.5,dy=item.y-bounds.height*.4;
      const fromX=bounds.width*(.3+.4*(i%3)/2)-item.x;
      const fromY=book.getBoundingClientRect().height-bounds.top+item.size-item.y;
      return `<div class="memory-orbit" style="left:50%;top:40%;--orbit-at:${orbitAt}s;--orbit-seconds:${FINALE_ORBIT_SECONDS}s"><div class="memory-orbit-position" style="left:${dx}px;top:${dy}px"><div class="memory-upright"><div class="memory-gather" data-memory="${item.id}" data-origin="below" style="--rise-x:${fromX}px;--rise-y:${fromY}px;--rise-at:${item.delay}s;--rise-duration:${FINALE_GATHER_DURATION_MS/1000}s">${img}</div></div></div></div>`;
    }
    const fromX=bounds.width*.39-item.x,fromY=bounds.height*.64-item.y;
    const left=state.panelIndex===4?item.x/bounds.width*100+'%':item.x+'px',top=state.panelIndex===4?item.y/bounds.height*100+'%':item.y+'px';
    return `<div class="memory-placement ${item.role==='bag'?'memory-from-bag':item.role==='center'?'memory-center-placement':''}" style="left:${left};top:${top};--from-x:${fromX}px;--from-y:${fromY}px;--delay:${item.delay||0}s">${img}</div>`;
  }).join('')+(state.panelIndex===4?endingCreditsMarkup():'');
  return items;
}
