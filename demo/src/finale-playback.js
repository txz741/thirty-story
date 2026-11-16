// Times are BGM 4 media seconds, not time spent viewing each illustration.
export const FINALE_PAGE_WINDOWS=Object.freeze([
  Object.freeze({panelIndex:0,open:5,close:7}),
  Object.freeze({panelIndex:1,open:13,close:14}),
  Object.freeze({panelIndex:2,open:24,close:26}),
  Object.freeze({panelIndex:3,open:31,close:32}),
]);

export function createFinalePlayback({getState,music,advance,document,canTick=()=>true,onWindowChange=()=>{},available=()=>true,setInterval=globalThis.setInterval,clearInterval=globalThis.clearInterval}){
  let furthest=-1,timer=null,pending=false,epoch=0,signature='';
  const isFinale=state=>['finale','finished'].includes(state.phase);
  const unavailable=clock=>!available()||!clock||clock.status==='error';
  function canAdvance(){
    const state=getState(),window=FINALE_PAGE_WINDOWS[state.panelIndex];
    if(!isFinale(state)||!window)return true;
    const clock=music();
    // Keep the existing manual story usable if audio is unsupported or fails to load.
    if(unavailable(clock)||clock.id==='finale'&&clock.ended)return true;
    return clock.id==='finale'&&Number.isFinite(clock.currentTime)&&clock.currentTime>=window.open&&clock.currentTime<=window.close;
  }
  function canBack(){const clock=music();return !isFinale(getState())||unavailable(clock)||clock.id==='finale'&&clock.ended;}
  function notify(){const state=getState(),next=`${state.phase}:${state.panelIndex}:${canAdvance()}:${canBack()}`;if(next!==signature){signature=next;onWindowChange();}}
  function stop(){if(timer!==null){clearInterval(timer);timer=null;}}
  async function tick(){
    notify();
    const state=getState(),window=FINALE_PAGE_WINDOWS[state.panelIndex],clock=music();
    if(pending||document?.hidden||!canTick()||!isFinale(state)||!window||unavailable(clock)||clock.id!=='finale'||!Number.isFinite(clock.currentTime)||clock.currentTime<window.close||clock.ended)return;
    const token=epoch;pending=true;
    try{await advance();}finally{if(token===epoch)pending=false;}
  }
  function sync(){
    const state=getState();
    if(!isFinale(state)){furthest=-1;epoch++;pending=false;stop();}
    else{furthest=Math.max(furthest,state.panelIndex);if(furthest<4&&timer===null)timer=setInterval(()=>void tick(),50);else if(furthest>=4)stop();}
    notify();
  }
  return {sync,tick,canAdvance,canBack,destroy(){epoch++;stop();},get state(){return {furthest,pending};}};
}
