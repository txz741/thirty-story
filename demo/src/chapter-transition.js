import {CHAPTER_TRANSITION} from './chapter-config.js';

// A separate viewport layer fades the art, captions, controls and page margins together.
export function createChapterTransition({document,window,book}){
  const screen=document.getElementById('chapter-transition');let phase=null;
  const locked=()=>phase==='chapterTransition'||phase==='chapterEntering';
  const block=event=>{
    if(!locked())return;
    event.preventDefault();event.stopImmediatePropagation();
  };
  for(const type of ['pointerdown','pointermove','pointerup','click','dblclick','wheel','touchstart','touchmove','touchend','keydown','keyup','input','change']){
    window.addEventListener(type,block,{capture:true,passive:false});
  }
  const visibility=()=>{screen.style.animationPlayState=document.hidden?'paused':'running';};
  document.addEventListener?.('visibilitychange',visibility);
  return state=>{
    const next=['chapterTransition','chapterEntering'].includes(state.phase)?state.phase:'';
    if(next===phase)return;
    phase=next;book.inert=locked();screen.hidden=!locked();
    screen.classList.toggle('chapter-white-out',phase==='chapterTransition');
    screen.classList.toggle('chapter-white-in',phase==='chapterEntering');
    screen.style.animationDuration=(phase==='chapterEntering'?CHAPTER_TRANSITION.fadeInMs:CHAPTER_TRANSITION.fadeOutMs)+'ms';
    visibility();
  };
}
