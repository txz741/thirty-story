const smooth=u=>(1-Math.cos(Math.PI*Math.max(0,Math.min(1,u))))/2;
export function createBgmPlayer({context,destination,Audio,notify=()=>{},setInterval=globalThis.setInterval,clearInterval=globalThis.clearInterval}){
  const entries=new Map();let requested=null,allowed=false,timer=null,destroyed=false,intentionallySilent=false;
  const current=()=>requested?entries.get(requested):null;
  function level(entry){const f=entry.fade;if(!f)return entry.level;return f.from+(f.to-f.from)*smooth((context.currentTime-f.start)/f.duration);}
  function hold(entry){
    const value=level(entry),param=entry.gain.gain;
    if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(context.currentTime);else param.cancelScheduledValues(0);
    param.setValueAtTime(value,context.currentTime);entry.level=value;entry.fade=null;return value;
  }
  function ramp(entry,to,duration){
    const from=hold(entry);duration=Math.max(.01,duration);
    const values=Float32Array.from({length:65},(_,i)=>from+(to-from)*smooth(i/64));
    if(entry.gain.gain.setValueCurveAtTime)entry.gain.gain.setValueCurveAtTime(values,context.currentTime,duration);
    else entry.gain.gain.linearRampToValueAtTime(to,context.currentTime+duration);
    entry.fade={start:context.currentTime,duration,from,to};
  }
  function stopTimer(){if(timer!==null){clearInterval(timer);timer=null;}}
  function ensureTimer(){if(timer===null)timer=setInterval(tick,125);}
  function ended(entry){
    if(entry.spec.loop||!entry.started)return;
    entry.ended=true;entry.retiring=false;entry.pendingFade=null;hold(entry);entry.gain.gain.setValueAtTime(0,context.currentTime);entry.level=0;entry.status='ended';entry.audio.pause();
    tick();notify();
  }
  function fail(entry,error){
    entry.blocked=error?.name==='NotAllowedError';entry.status=entry.blocked?'blocked':'error';
    entry.error=entry.blocked?'轻触声音按钮以继续音乐':'背景音乐暂时未能载入，可轻触声音按钮重试';notify();
  }
  function ensure(spec){
    if(!spec?.src)return null;
    const id=spec.id||spec.src;
    if(entries.has(id))return entries.get(id);
    if(!Audio)return null;
    try{
      const audio=new Audio();audio.preload='metadata';audio.loop=spec.loop!==false;audio.playsInline=true;audio.setAttribute?.('playsinline','');audio.src=spec.src;
      const source=context.createMediaElementSource(audio),gain=context.createGain();gain.gain.value=0;source.connect(gain);gain.connect(destination);
      const entry={id,spec:{fadeOutSeconds:2,fadeInSeconds:1,endFadeSeconds:2.5,...spec},audio,source,gain,level:0,fade:null,pendingFade:null,pendingStart:false,started:false,ended:false,retiring:false,blocked:false,error:'',status:'ready',unlocked:false,playPromise:null,tailStarted:false};
      entries.set(id,entry);
      audio.onended=()=>ended(entry);audio.onerror=()=>fail(entry,audio.error);
      audio.ontimeupdate=()=>{tick();};
      return entry;
    }catch{return null;}
  }
  function begin(entry){
    if(!allowed||entry.ended)return;
    entry.error='';entry.blocked=false;entry.status='playing';
    if(!entry.started&&entry.id===requested){
      entry.started=true;entry.retiring=false;
      ramp(entry,1,entry.spec.fadeInSeconds);
    }else if(entry.pendingFade){const fade=entry.pendingFade;entry.pendingFade=null;ramp(entry,fade.to,fade.duration);}
    ensureTimer();notify();
  }
  function play(entry,fromGesture=false){
    if(!entry||entry.ended||destroyed)return;
    if(entry.playPromise)return;
    if(!fromGesture&&!allowed)return;
    if(entry.status==='error'&&fromGesture){entry.audio.load?.();entry.error='';}
    let result;
    try{result=entry.audio.play();}catch(error){fail(entry,error);return;}
    entry.playPromise=Promise.resolve(result).then(()=>{
      entry.unlocked=true;entry.blocked=false;
      if(!allowed||entry.id===requested&&(intentionallySilent&&!entry.retiring||entry.pendingStart&&!canStart(entry))||entry.id!==requested&&!entry.retiring&&!(entry.started&&level(entry)>.0001)){entry.audio.pause();if(!entry.started)try{entry.audio.currentTime=0;}catch{}return;}
      if(entry.id===requested)entry.pendingStart=false;
      begin(entry);
    }).catch(error=>fail(entry,error)).finally(()=>{
      entry.playPromise=null;
      if(allowed&&!entry.ended&&!entry.blocked&&entry.status!=='error'&&entry.audio.paused&&(entry.id===requested&&!entry.pendingStart&&!intentionallySilent||entry.retiring||entry.started&&level(entry)>.0001))play(entry);
    });
  }
  function tick(){
    if(destroyed)return;
    for(const entry of entries.values()){
      const f=entry.fade;
      if(f&&context.currentTime>=f.start+f.duration){
        hold(entry);entry.level=f.to;
        if(entry.retiring&&f.to===0){entry.audio.pause();entry.retiring=false;entry.status='stopped';notify();}
      }
      if(allowed&&entry.started&&!entry.ended&&!entry.audio.paused&&entry.id===requested&&!entry.spec.loop&&!entry.tailStarted){
        const remaining=entry.audio.duration-entry.audio.currentTime;
        if(Number.isFinite(remaining)&&remaining>0&&remaining<=entry.spec.endFadeSeconds){entry.tailStarted=true;ramp(entry,0,remaining);notify();}
      }
    }
    maybeStart();
    if(![...entries.values()].some(entry=>entry.playPromise||entry.fade||entry.started&&!entry.ended&&!entry.audio.paused))stopTimer();
  }
  function prepare(tracks){for(const track of tracks)ensure(track);}
  function canStart(entry){return ![...entries.values()].some(other=>other!==entry&&(other.retiring||level(other)>.0001));}
  function maybeStart(){const entry=current();if(allowed&&!intentionallySilent&&entry?.pendingStart&&canStart(entry)){entry.pendingStart=false;entry.status='loading';play(entry);}}
  function retire(entry,seconds){
    if(entry.retiring&&(entry.fade?.to===0||entry.pendingFade?.to===0))return;
    entry.retiring=true;entry.pendingStart=false;
    if(allowed){entry.pendingFade=null;ramp(entry,0,seconds);ensureTimer();}
    else{hold(entry);entry.pendingFade={to:0,duration:seconds};}
  }
  function fadeOut(seconds=2){
    intentionallySilent=true;
    for(const entry of entries.values())if(entry.started&&!entry.ended&&(level(entry)>.0001||entry.fade||entry.pendingFade))retire(entry,seconds);
    notify();
  }
  function choose(spec){
    const entry=ensure(spec);if(!entry)return false;
    if(requested===entry.id)return false;
    requested=entry.id;intentionallySilent=false;entry.pendingStart=true;
    for(const other of entries.values())if(other!==entry){
      other.pendingStart=false;
      if(level(other)>.0001||other.fade||other.pendingFade||other.started&&!other.audio.paused&&!other.ended)retire(other,entry.spec.fadeOutSeconds);
    }
    if(!entry.started&&!entry.ended)try{entry.audio.currentTime=0;}catch{}
    maybeStart();notify();return true;
  }
  function setAllowed(value){
    value=!!value;if(allowed===value)return;allowed=value;
    if(!allowed){
      for(const entry of entries.values()){
        if(entry.fade){const f=entry.fade;entry.pendingFade={to:f.to,duration:Math.max(.01,f.start+f.duration-context.currentTime)};hold(entry);}
        entry.audio.pause();if(entry.started&&!entry.ended)entry.status='paused';
      }
      stopTimer();
    }else{
      for(const entry of entries.values())if(entry.id===requested&&!entry.pendingStart&&!intentionallySilent||entry.retiring||entry.started&&!entry.ended&&level(entry)>.0001)play(entry);
      maybeStart();
    }
    notify();
  }
  function unlockFromGesture(){
    for(const entry of entries.values())if(!entry.unlocked||entry.blocked||(entry.id===requested||entry.retiring)&&entry.status==='error')play(entry,true);
  }
  function clear({rewind=false}={}){
    requested=null;intentionallySilent=false;stopTimer();
    for(const entry of entries.values()){
      entry.audio.pause();hold(entry);entry.gain.gain.setValueAtTime(0,context.currentTime);entry.level=0;entry.pendingFade=null;entry.pendingStart=false;entry.retiring=false;entry.status='ready';
      if(rewind){entry.started=false;entry.ended=false;entry.tailStarted=false;try{entry.audio.currentTime=0;}catch{}}
    }
    notify();
  }
  function destroy(){destroyed=true;clear();for(const entry of entries.values()){entry.audio.onended=null;entry.audio.onerror=null;entry.audio.ontimeupdate=null;entry.source.disconnect();entry.gain.disconnect();}entries.clear();}
  const state=()=>{const entry=current(),problem=[...entries.values()].find(e=>(e.id===requested||e.retiring)&&(e.blocked||e.status==='error'));return {id:requested,status:entry?.status||'idle',currentTime:entry?.audio.currentTime||0,duration:Number.isFinite(entry?.audio.duration)?entry.audio.duration:null,loop:!!entry?.spec.loop,ended:!!entry?.ended,error:entry?.error||problem?.error||'',needsGesture:!!problem,objects:entries.size,levels:[...entries.values()].filter(e=>e.started&&!e.ended).map(e=>({id:e.id,gain:level(e),paused:e.audio.paused}))};};
  return {prepare,choose,fadeOut,setAllowed,unlockFromGesture,clear,destroy,get state(){return state();}};
}
