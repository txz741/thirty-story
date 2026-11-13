export function createAssetLoader({Image=globalThis.Image,concurrency=3,timeoutMs=20000,setTimeout=globalThis.setTimeout,clearTimeout=globalThis.clearTimeout}={}){
  const limit=Math.max(2,concurrency),entries=new Map(),listeners=new Set();let active=0,backgroundActive=0,order=0;
  const snapshot=()=>{const all=[...entries.values()];return {total:all.length,loaded:all.filter(e=>e.status==='ready').length,failed:all.filter(e=>e.status==='failed').length,active,queued:all.filter(e=>e.status==='queued').length};};
  function notify(){const state=snapshot();for(const listener of listeners)listener(state);}
  function pump(){
    while(active<limit){
      const queue=[...entries.values()].filter(e=>e.status==='queued').sort((a,b)=>Number(b.urgent)-Number(a.urgent)||a.order-b.order);
      const entry=queue.find(e=>e.urgent||backgroundActive<limit-1);if(!entry)break;
      start(entry);
    }
  }
  function start(entry){
    entry.status='loading';active++;const background=!entry.urgent;if(background)backgroundActive++;
    const image=new Image();entry.image=image;image.decoding='async';image.fetchPriority=entry.urgent?'high':'low';let timer=null,settled=false;
    function done(ok){
      if(settled)return;settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;entry.image=null;
      entry.status=ok?'ready':'failed';active--;if(background)backgroundActive--;entry.resolve(ok);notify();pump();
    }
    image.onload=()=>done(true);image.onerror=()=>done(false);timer=setTimeout(()=>{done(false);try{image.src='';}catch{}},timeoutMs);
    try{image.src=entry.src;}catch{done(false);}
    notify();
  }
  function load(src,{urgent=false,retry=true}={}){
    if(!src)return Promise.resolve(false);
    let entry=entries.get(src);
    if(entry?.status==='ready')return Promise.resolve(true);
    if(entry&&entry.status!=='failed'){
      if(urgent){entry.urgent=true;if(entry.image)entry.image.fetchPriority='high';pump();}
      return entry.promise;
    }
    if(entry?.status==='failed'&&!retry)return Promise.resolve(false);
    let resolve;const promise=new Promise(done=>resolve=done);entry={src,status:'queued',urgent,order:order++,promise,resolve,image:null};entries.set(src,entry);pump();notify();return promise;
  }
  function warm(sources){return Promise.all([...new Set(sources)].map(src=>load(src,{retry:false})));}
  function subscribe(listener){listeners.add(listener);listener(snapshot());return ()=>listeners.delete(listener);}
  function invalidate(src){const entry=entries.get(src);if(entry?.status==='ready'){entry.status='failed';notify();}}
  return {load,warm,subscribe,invalidate,isReady:src=>entries.get(src)?.status==='ready',get state(){return snapshot();}};
}
