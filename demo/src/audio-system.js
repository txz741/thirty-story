import {SOUND_FILES,AUDIO_DEFAULTS} from './audio-config.js';
import {createBgmPlayer} from './bgm-player.js';
const clamp=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(1,Number(value))):0;
export function createAudioSystem({window=globalThis.window,document=globalThis.document,fetcher=globalThis.fetch,files=SOUND_FILES,defaults=AUDIO_DEFAULTS}={}){
  let context=null,master=null,sfx=null,bgm=null,duck=null,music=null,musicDefinitions=[],muted=!!defaults.muted,sfxVolume=defaults.sfxVolume,bgmVolume=defaults.bgmVolume,bgmSrc=defaults.bgmSrc;
  let unlockPromise=null,error='',destroyed=false,bound=false,hidden=!!document?.hidden,lastPlayed=null;
  let bgmSelection=bgmSrc?{id:bgmSrc,src:bgmSrc,loop:true}:null;
  const raw=new Map(),buffers=new Map(),fetching=new Map(),decoding=new Map(),voices=new Set(),subscribers=new Set();
  const Context=window?.AudioContext||window?.webkitAudioContext;
  const snapshot=()=>({supported:!!Context,contextState:context?.state||'locked',sampleRate:context?.sampleRate||null,ready:context?.state==='running',muted,sfxVolume,bgmVolume,bgmAvailable:!!bgmSrc||musicDefinitions.length>0,bgm:music?.state||{status:'locked',id:null},loaded:buffers.size,total:Object.keys(files).length,error:error||music?.state.error||'',lastPlayed});
  function notify(){for(const fn of subscribers){try{fn(snapshot());}catch{}}}
  function gain(param,value,seconds=.025){if(!param||!context)return;try{param.cancelScheduledValues(context.currentTime);param.setTargetAtTime(value,context.currentTime,Math.max(.001,seconds/3));}catch{param.value=value;}}
  function updateDuck(){gain(duck?.gain,voices.size ? .62 : 1,voices.size ? .07 : .4);}
  function setup(){
    if(context||!Context||destroyed)return !!context;
    try{
      context=new Context({latencyHint:'interactive'});master=context.createGain();sfx=context.createGain();bgm=context.createGain();duck=context.createGain();
      master.gain.value=muted?0:1;sfx.gain.value=sfxVolume;bgm.gain.value=bgmVolume;duck.gain.value=1;
      sfx.connect(master);bgm.connect(duck);duck.connect(master);
      if(context.createDynamicsCompressor){const limiter=context.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=4;limiter.ratio.value=12;limiter.attack.value=.005;limiter.release.value=.12;master.connect(limiter);limiter.connect(context.destination);}else master.connect(context.destination);
      music=createBgmPlayer({context,destination:bgm,Audio:window?.Audio,notify});music.prepare(musicDefinitions);
      if(bgmSelection)music.choose(bgmSelection);
      context.onstatechange=()=>{syncMusic();notify();};return true;
    }catch{error='此浏览器暂时无法开启声音';context=null;notify();return false;}
  }
  function decode(id){
    if(buffers.has(id))return Promise.resolve(true);if(decoding.has(id))return decoding.get(id);if(!context||!raw.has(id))return Promise.resolve(false);
    const task=new Promise((resolve,reject)=>{try{const result=context.decodeAudioData(raw.get(id).slice(0),resolve,reject);if(result?.then)result.then(resolve,reject);}catch(e){reject(e);}})
      .then(buffer=>{buffers.set(id,buffer);notify();return true;}).catch(()=>{error='有一段声音暂时未能载入';notify();return false;}).finally(()=>decoding.delete(id));
    decoding.set(id,task);return task;
  }
  function load(id){
    if(raw.has(id))return context?decode(id):Promise.resolve(true);if(fetching.has(id))return fetching.get(id);
    const task=Promise.resolve().then(()=>fetcher(files[id].src)).then(response=>{if(!response.ok)throw Error('audio HTTP '+response.status);return response.arrayBuffer();})
      .then(bytes=>{raw.set(id,bytes);return context?decode(id):true;}).catch(()=>{error='有一段声音暂时未能载入';notify();return false;}).finally(()=>fetching.delete(id));
    fetching.set(id,task);return task;
  }
  const prime=()=>destroyed?Promise.resolve(false):Promise.all(Object.keys(files).map(load)).then(results=>{const ready=results.every(Boolean);if(ready){error='';notify();}return ready;});
  function syncMusic(){music?.setAllowed(context?.state==='running'&&!muted&&!hidden);}
  function unlock(){
    if(destroyed||!setup())return Promise.resolve(false);
    // Prime each cached media element in this actual gesture, including future chapters.
    music?.unlockFromGesture();
    // resume() is invoked synchronously inside the actual user event, before fetching.
    let resume;try{resume=context.state==='running'?Promise.resolve():context.resume();}catch{resume=Promise.resolve();}
    if(!unlockPromise){
      try{const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,context.sampleRate);source.connect(master);source.onended=()=>source.disconnect();source.start(context.currentTime);}catch{}
      unlockPromise=Promise.resolve(resume).then(()=>{syncMusic();return prime();}).then(()=>{notify();return context.state==='running';}).catch(()=>{error='轻触声音按钮以开启声音';notify();return false;}).finally(()=>unlockPromise=null);
    }
    return unlockPromise;
  }
  function finish(voice){if(!voices.delete(voice))return;try{voice.source.disconnect();voice.gain.disconnect();}catch{}voice.resolve();updateDuck();}
  function stopVoice(voice){
    if(!voices.has(voice))return;
    try{gain(voice.gain.gain,0,.018);voice.source.stop(context.currentTime+.025);}catch{finish(voice);}
  }
  function stopGroup(group){for(const voice of [...voices])if(voice.group===group)stopVoice(voice);}
  function stopEffects(){for(const voice of [...voices])stopVoice(voice);}
  function play(id,{group=id,replace=false,maxDuration}={}){
    if(destroyed||muted||sfxVolume<=0||hidden||!context||context.state!=='running'||!buffers.has(id))return null;
    const prior=[...voices].filter(v=>v.group===group);
    if(prior.length&&!replace)return null;if(replace)prior.forEach(stopVoice);
    if(voices.size>=3)stopVoice([...voices][0]);
    const source=context.createBufferSource(),voiceGain=context.createGain(),buffer=buffers.get(id);source.buffer=buffer;voiceGain.gain.value=1;source.connect(voiceGain);voiceGain.connect(sfx);
    let resolve;const ended=new Promise(done=>resolve=done),voice={id,group,source,gain:voiceGain,resolve,ended};voices.add(voice);source.onended=()=>finish(voice);updateDuck();
    const start=context.currentTime+.005,duration=Math.min(buffer.duration,Number.isFinite(maxDuration)?Math.max(.03,maxDuration):buffer.duration);
    if(duration<buffer.duration){voiceGain.gain.setValueAtTime(1,start);voiceGain.gain.setValueAtTime(1,start+Math.max(0,duration-.03));voiceGain.gain.linearRampToValueAtTime(0,start+duration);}
    try{source.start(start,0,duration);}catch{finish(voice);return null;}
    lastPlayed=id;notify();return {ended,duration,stop:()=>stopVoice(voice)};
  }
  function setMuted(value){muted=!!value;gain(master?.gain,muted?0:1);if(muted)stopEffects();syncMusic();notify();}
  function setSfxVolume(value){sfxVolume=clamp(value);gain(sfx?.gain,sfxVolume);notify();}
  function setBgmVolume(value){bgmVolume=clamp(value);gain(bgm?.gain,bgmVolume);notify();}
  function prepareBgm(tracks){musicDefinitions=tracks.map(track=>({...track}));music?.prepare(musicDefinitions);notify();}
  function setBgmSource(value,options={}){
    bgmSrc=value||null;
    bgmSelection=bgmSrc?{id:options.id||value,src:value,loop:true,...options}:null;
    if(!bgmSrc)music?.clear(options);
    else music?.choose(bgmSelection);
    syncMusic();notify();
  }
  const gesture=()=>{if(context?.state!=='running'||buffers.size<Object.keys(files).length||music?.state.needsGesture||music?.state.status==='error')void unlock();};
  function visibility(){hidden=!!document?.hidden;if(hidden){stopEffects();syncMusic();if(context?.state==='running')void context.suspend().catch(()=>{});}else if(context){void context.resume().then(()=>{syncMusic();notify();}).catch(()=>{error='轻触声音按钮以继续播放';notify();});}notify();}
  function bindUnlock(){if(bound||!document)return;bound=true;for(const event of ['pointerdown','pointerup','touchend','keydown'])document.addEventListener(event,gesture,{capture:true,passive:true});document.addEventListener('visibilitychange',visibility);}
  function subscribe(fn){subscribers.add(fn);fn(snapshot());return ()=>subscribers.delete(fn);}
  async function destroy(){destroyed=true;stopEffects();music?.destroy();if(bound){for(const event of ['pointerdown','pointerup','touchend','keydown'])document.removeEventListener(event,gesture,{capture:true});document.removeEventListener('visibilitychange',visibility);}subscribers.clear();try{await context?.close();}catch{}}
  return {prime,unlock,play,stopGroup,stopEffects,setMuted,setSfxVolume,setBgmVolume,prepareBgm,setBgmSource,bindUnlock,subscribe,destroy,get state(){return snapshot();}};
}
