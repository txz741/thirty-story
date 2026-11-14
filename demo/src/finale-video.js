// One cached, silent media element. The image underneath remains a loading/error fallback.
export function createFinaleVideo({video,button,document,src,poster}){
  let active=false,ended=false,manualPause=false,generation=0,pending=null,loadFailed=false;
  function silence(){video.defaultMuted=true;if(!video.muted)video.muted=true;if(video.volume!==0)video.volume=0;}
  silence();video.loop=false;video.controls=false;video.playsInline=true;video.preload='auto';video.poster=poster;
  video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
  video.hidden=true;button.hidden=true;video.src=src;video.load?.();
  async function play(){
    if(!active||ended||manualPause||document.hidden||pending)return;
    silence();const token=generation;
    pending=Promise.resolve().then(()=>video.play()).then(()=>{
      if(token!==generation||!active||manualPause||document.hidden){if(!active||manualPause||document.hidden)video.pause();return;}
      video.hidden=false;button.hidden=true;loadFailed=false;
    }).catch(()=>{if(token===generation&&active){video.hidden=true;button.hidden=false;}}).finally(()=>{
      pending=null;
      if(token!==generation&&active&&!ended&&!manualPause&&!document.hidden)void play();
    });
    return pending;
  }
  video.addEventListener('volumechange',silence);
  video.addEventListener('ended',()=>{ended=true;button.hidden=true;});
  video.addEventListener('error',()=>{loadFailed=true;if(active){video.hidden=true;button.hidden=false;}});
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden)video.pause();else void play();});
  button.addEventListener('click',()=>{if(!active)return;if(loadFailed){video.load?.();loadFailed=false;}void play();});
  return {
    setActive(value){
      value=!!value;if(value===active)return;active=value;generation++;manualPause=false;button.hidden=true;
      if(!active){video.pause();video.hidden=true;return;}
      ended=false;silence();try{video.currentTime=0;}catch{}video.hidden=false;void play();
    },
    setPaused(value){manualPause=!!value;if(manualPause)video.pause();else void play();},
    get active(){return active;},
  };
}
