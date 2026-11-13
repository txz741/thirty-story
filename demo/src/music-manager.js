import {MUSIC_TRACKS,MUSIC_SETTINGS} from './music-config.js';
const forwardActions=new Set(['ADVANCE','WALK_DONE','COLLECT_DONE']);
export function musicStageFor(state){
  if(state.phase==='cover')return 0;
  if(['finale','finished'].includes(state.phase)&&state.badges?.includes('wings'))return 4;
  return state.eventIndex>=7?3:state.eventIndex>=4?2:1;
}
export function createMusicManager({audio,tracks=MUSIC_TRACKS,settings=MUSIC_SETTINGS}){
  let stage=0;
  const definitions=tracks.map(track=>({...track,fadeSeconds:settings.crossfadeSeconds,endFadeSeconds:settings.finaleFadeSeconds}));
  audio.prepareBgm(definitions);
  function update(state,action={}){
    if(action.type==='RESET'){stage=0;audio.setBgmSource(null,{rewind:true});return true;}
    if(!forwardActions.has(action.type))return false;
    const next=musicStageFor(state);
    if(next<=stage)return false;
    stage=next;
    const track=definitions[stage-1];
    if(track)audio.setBgmSource(track.src,track);
    return true;
  }
  return {update,get state(){return {stage,id:definitions[stage-1]?.id||null};}};
}
