import {MUSIC_TRACKS,MUSIC_SETTINGS} from './music-config.js';
const forwardActions=new Set(['ADVANCE','WALK_DONE','COLLECT_DONE']);
export function createMusicManager({audio,tracks=MUSIC_TRACKS,settings=MUSIC_SETTINGS}){
  let stage=0,finalePrepared=false;
  const definitions=tracks.map(track=>({...track,fadeOutSeconds:settings.fadeOutSeconds,fadeInSeconds:settings.fadeInSeconds,endFadeSeconds:settings.finaleFadeSeconds}));
  audio.prepareBgm(definitions);
  function update(state,action={}){
    if(action.type==='RESET'){stage=0;finalePrepared=false;audio.setBgmSource(null,{rewind:true});return true;}
    if(action.type==='ADVANCE'&&state.phase==='story'&&state.eventIndex===9&&state.panelIndex===3&&stage===3&&!finalePrepared){
      finalePrepared=true;audio.fadeOutBgm(settings.fadeOutSeconds);return true;
    }
    let next=stage;
    if(action.type==='COLLECTION_WINK_DONE'&&state.phase==='collecting')next=state.eventIndex===3?2:state.eventIndex===6?3:stage;
    else if(forwardActions.has(action.type)&&state.phase!=='cover'){
      if(['finale','finished'].includes(state.phase)&&state.badges?.includes('wings'))next=4;
      else if(stage===0)next=1;
    }else return false;
    if(next<=stage)return false;
    stage=next;
    const track=definitions[stage-1];
    if(track)audio.setBgmSource(track.src,track);
    return true;
  }
  return {update,get state(){return {stage,id:definitions[stage-1]?.id||null,finalePrepared};}};
}
