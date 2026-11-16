import {artBounds} from './finale.js';
import {presentBadge,BADGE_HOLD_MS} from './badge-presentation.js';

export const FINALE_ENTRY_TIMING=Object.freeze({fadeOutMs:2000,badgeMs:BADGE_HOLD_MS,fadeInMs:1000});

// Only the actual illustration bounds turn white; the surrounding page keeps its layout.
export function createFinaleEntry({document,window,book,image,layer,medal,caption,delay}){
  let active=false,stage='';
  const block=event=>{if(active){event.preventDefault();event.stopImmediatePropagation();}};
  for(const type of ['pointerdown','pointermove','pointerup','click','dblclick','wheel','touchstart','touchmove','touchend','keydown','keyup','input','change'])window.addEventListener(type,block,{capture:true,passive:false});
  function visibility(){for(const node of [layer,medal,caption])node.style.animationPlayState=document.hidden?'paused':'running';}
  document.addEventListener?.('visibilitychange',visibility);
  function center(){const rect=layer.getBoundingClientRect(),size=Math.min(180,rect.width*.42,rect.height*.22);return {size,start:{x:(rect.width-size)/2,y:(rect.height-size)/2}};}
  function layout(){
    if(!active)return;const bounds=artBounds(book,image);
    for(const [name,value] of Object.entries({left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height}))layer.style[name]=value+'px';
    if(!medal.hidden){const {size,start}=center();medal.style.width=medal.style.height=size+'px';medal.style.transform=`translate(${start.x}px,${start.y}px) rotate(0deg) scale(1)`;}
  }
  window.addEventListener('resize',layout);
  function phase(next){
    stage=next;layer.setAttribute('data-stage',stage);
    layer.classList.toggle('finale-entry-out',next==='fade-out');layer.classList.toggle('finale-entry-in',next==='fade-in');
    caption.classList.toggle('finale-caption-out',next==='fade-out');caption.classList.toggle('finale-caption-in',next==='fade-in');
    layer.style.animationDuration=caption.style.animationDuration=(next==='fade-in'?FINALE_ENTRY_TIMING.fadeInMs:FINALE_ENTRY_TIMING.fadeOutMs)+'ms';visibility();
  }
  async function visibleDelay(ms,isCurrent){
    for(let remaining=ms;remaining>0;){const hidden=!!document.hidden;await delay(Math.min(100,remaining));if(!isCurrent())return false;if(!hidden&&!document.hidden)remaining-=Math.min(100,remaining);}
    return true;
  }
  return {get active(){return active;},get stage(){return stage;},layout,
    async run({isCurrent=()=>true,onFadeOut=()=>{},onPresent=()=>{},onReveal=()=>{}}={}){
      if(active||!isCurrent())return false;
      active=true;book.inert=true;book.setAttribute('aria-busy','true');medal.hidden=true;layer.hidden=false;caption.style.opacity='';layout();
      try{
        phase('fade-out');onFadeOut();
        if(!await visibleDelay(FINALE_ENTRY_TIMING.fadeOutMs,isCurrent))return false;
        caption.style.opacity='0';phase('badge');
        const shown=await presentBadge({book:layer,badge:medal,placement:center(),isCurrent,delay:ms=>visibleDelay(ms,isCurrent),onPresent});
        if(!shown||!isCurrent())return false;
        await onReveal();if(!isCurrent())return false;
        book.inert=true;book.setAttribute('aria-busy','true');layout();phase('fade-in');
        if(!await visibleDelay(FINALE_ENTRY_TIMING.fadeInMs,isCurrent))return false;
        return true;
      }finally{
        active=false;stage='';medal.hidden=true;medal.classList.remove('badge-presenting');layer.hidden=true;
        layer.classList.remove('finale-entry-out','finale-entry-in');caption.classList.remove('finale-caption-out','finale-caption-in');caption.style.opacity='';book.inert=false;book.setAttribute('aria-busy','false');
      }
    }
  };
}
