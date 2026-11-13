import {badgeGeometry} from './badge-presentation.js';
export const BAG_OPEN_PROGRESS=.82;
export function bagPosition(book,character,anchor) {
  const stage=book.getBoundingClientRect(),body=character.getBoundingClientRect();
  return {x:body.left-stage.left+body.width*anchor.x,y:body.top-stage.top+body.height*anchor.y};
}
export async function flyBadge({book,character,badge,anchor,reduced,isCurrent=()=>true,onApproach=()=>{},requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}) {
  const p=bagPosition(book,character,anchor),rect=book.getBoundingClientRect();
  const {size,start}=badgeGeometry(book);
  badge.style.width=`${size}px`;badge.style.height=`${size}px`;badge.hidden=false;
  const frames=[];
  for(let i=0;i<=32;i++){
    const t=i/32,u=1-t,scale=1-.94*(t*t*(3-2*t));
    const x=reduced?p.x-size/2:u*u*start.x+2*u*t*rect.width*.91+t*t*(p.x-size/2);
    const y=reduced?p.y-size/2:u*u*start.y+2*u*t*rect.height*.48+t*t*(p.y-size/2);
    frames.push({transform:`translate(${x}px,${y}px) rotate(${reduced?0:-6*Math.sin(Math.PI*t)}deg) scale(${scale})`,opacity:t>.82?(1-t)/.18:1,offset:t});
  }
  const animation=badge.animate(frames,{duration:reduced?220:1200,easing:'cubic-bezier(.32,.1,.35,1)',fill:'forwards'});
  let opened=false,settled=false,frame=null,completed=false;
  const approach=()=>{if(!opened&&isCurrent()){opened=true;onApproach();}};
  const watch=()=>{
    if(settled||!isCurrent())return;
    const progress=animation.effect?.getComputedTiming?.().progress;
    if(progress!==null&&progress>=BAG_OPEN_PROGRESS)approach();
    if(!opened&&animation.effect?.getComputedTiming&&requestFrame)frame=requestFrame(watch);
  };
  watch();
  try { await animation.finished;completed=true; }
  catch { /* Cancellation during a reset is expected. */ }
  finally {
    settled=true;if(frame!==null)cancelFrame?.(frame);
    if(completed&&isCurrent())approach();
    if(isCurrent()){badge.hidden=true;badge.getAnimations().forEach(a=>a.cancel());}
  }
  return completed&&isCurrent();
}
