import {badges} from './journey-data.js';
export function artBounds(book,image){
  const stage=book.getBoundingClientRect(),box=image.getBoundingClientRect();
  const iw=image.naturalWidth||900,ih=image.naturalHeight||1600,scale=Math.min(box.width/iw,box.height/ih);
  return {left:box.left-stage.left+(box.width-iw*scale)/2,top:box.top-stage.top+(box.height-ih*scale)/2,width:iw*scale,height:ih*scale};
}
export function finaleLayout(panelIndex,ids,width,height){
  const unique=[...new Set(ids)].filter(id=>Object.hasOwn(badges,id));
  if(panelIndex===0)return [{id:'wings',x:width*.66,y:height*.2,size:width*.24}];
  if(panelIndex===3)return [];
  if(panelIndex===2){
    const outer=unique.filter(id=>id!=='wings'),radius=Math.min(width*.34,height*.27),cx=width*.5,cy=height*.4;
    return [{id:'wings',x:cx,y:cy,size:width*.25},...outer.map((id,i)=>{const angle=-Math.PI/2+i*2*Math.PI/outer.length;return {id,x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius,size:width*.155};})];
  }
  return unique.map((id,i)=>{
    const t=unique.length>1?i/(unique.length-1):0;
    if(panelIndex===1)return {id,x:width*(.14+.72*t),y:height*(.22+.13*(1-Math.sin(Math.PI*t))),size:width*.145,delay:i*.09};
    return {id,x:width*(.38-.25*t),y:height*(.43+.43*t-.09*Math.sin(Math.PI*t)),size:width*(.14-.05*t),delay:i*.12};
  });
}
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export function renderFinale({book,image,overlay,state,reduced}){
  const bounds=artBounds(book,image),items=finaleLayout(state.panelIndex,state.badges,bounds.width,bounds.height);
  overlay.style.left=bounds.left+'px';overlay.style.top=bounds.top+'px';overlay.style.width=bounds.width+'px';overlay.style.height=bounds.height+'px';
  overlay.className=`finale-overlay scene-${state.panelIndex}${reduced?' reduced':''}`;
  const ring=state.panelIndex===2?`<div class="memory-ring" style="left:50%;top:40%;width:${Math.min(bounds.width*.68,bounds.height*.54)}px"></div>`:'';
  const trail=state.panelIndex===4?'<svg class="memory-trail" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M38 43Q14 56 13 86" fill="none" stroke="#fff0b8" stroke-width=".7"/></svg>':'';
  overlay.innerHTML=ring+trail+items.map((item,i)=>{
    const fromX=bounds.width*.39-item.x,fromY=bounds.height*.64-item.y;
    return `<img class="memory-badge" data-badge="${item.id}" src="${badges[item.id].image}" alt="${escape(badges[item.id].title)}" style="left:${item.x}px;top:${item.y}px;width:${item.size}px;height:${item.size}px;--from-x:${fromX}px;--from-y:${fromY}px;--delay:${item.delay||i*.07}s">`;
  }).join('');
  return items;
}
