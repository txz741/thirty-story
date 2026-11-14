import {chapterRoadFrame} from './chapter-config.js';
export function createChapterRoad({document,book}){
  const road=document.getElementById('road'),image=document.getElementById('chapter-map-image'),beacon=document.getElementById('beacon'),girl=document.getElementById('character');let source='';
  return state=>{
    const rect=book.getBoundingClientRect(),frame=chapterRoadFrame(state,rect.width,rect.height);
    road.classList.toggle('chapter-map',frame.mapped);road.classList.toggle('chapter-fading',state.phase==='chapterTransition');road.classList.toggle('chapter-entering',state.phase==='chapterEntering');image.hidden=!frame.mapped;
    if(['chapterTransition','chapterEntering'].includes(state.phase))road.classList.remove('enter');
    girl.style.transform=state.phase==='discovered'&&frame.side==='left'?'scaleX(-1)':'scaleX(1)';
    if(frame.mapped){
      if(source!==frame.chapter.background){source=frame.chapter.background;image.src=source;}
      image.style.transform=`translateY(${-frame.offset}px)`;image.style.transition=state.phase==='walking'?'transform .6s cubic-bezier(.3,.1,.25,1)':'none';
      beacon.style.left=frame.markerX/720*100+'%';beacon.style.right='auto';beacon.style.top=frame.markerY/rect.height*100+'%';beacon.hidden=state.phase!=='discovered';
    }else{beacon.style.left='';beacon.style.right='';beacon.style.top='';beacon.hidden=!!state.chapterExit||['chapterTransition','chapterEntering'].includes(state.phase);}
    return frame;
  };
}
