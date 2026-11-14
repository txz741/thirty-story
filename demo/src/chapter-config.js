export const CHAPTER_TRANSITION={exitSteps:4,fadeOutMs:2000,fadeInMs:1000};
export const CHAPTERS=[
  {id:'chapter1',number:1,title:'第一乐章 · 青春之路',firstEvent:0,lastEvent:3,background:'assets/maps/chapter1/chapter1_scroll_v2.jpg?v=20',map:{width:720,viewportHeight:1280,step:640,sceneAnchor:640}},
  {id:'chapter2',number:2,title:'第二乐章',firstEvent:4,lastEvent:6,background:'assets/maps/chapter2/chapter2_scroll_v2.jpg?v=20',map:{width:720,viewportHeight:1280,step:640,sceneAnchor:640}},
  {id:'chapter3',number:3,title:'第三乐章',firstEvent:7,lastEvent:9,background:'assets/maps/chapter3/chapter3_scroll_v2.jpg?v=20',map:{width:720,viewportHeight:1280,step:640,sceneAnchor:640}},
];
export const chapterForEvent=index=>CHAPTERS.find(c=>index>=c.firstEvent&&index<=c.lastEvent)||CHAPTERS[0];
export const endsChapter=index=>CHAPTERS.some(c=>c.lastEvent===index&&c.number<3);
export function chapterRoadFrame(state,width,height){
  const chapter=chapterForEvent(state.eventIndex),localEvent=state.eventIndex-chapter.firstEvent,side=chapter.map&&localEvent%2===1?'left':'right';
  if(!chapter.background||!chapter.map)return {chapter,side,mapped:false};
  const scale=width/chapter.map.width;
  const step=state.chapterExit?(chapter.lastEvent-chapter.firstEvent+1)*4+state.distance+(state.phase==='walking'?1:0):localEvent*4+state.distance+(state.phase==='walking'?1:0);
  const cameraY=Math.max(0,step*chapter.map.step+chapter.map.sceneAnchor-height/(2*scale));
  const centerY=(localEvent+1)*4*chapter.map.step+chapter.map.sceneAnchor;
  return {chapter,side,mapped:true,scale,cameraY,offset:cameraY*scale,markerX:side==='left'?136:584,markerY:(centerY-70-cameraY)*scale};
}
