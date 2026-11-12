import {events,badges,eventFor,panelsFor,pendingBadges,finale} from './journey-data.js';
export const SCHEMA=2;
export const initialState=()=>({schema:SCHEMA,phase:'cover',eventIndex:0,distance:0,panelIndex:0,badges:[],branchChoice:null,collectionStage:'expect'});
export function transition(state,action){
  const s={...state,badges:[...state.badges]},event=eventFor(s);
  switch(action.type){
    case 'RESET':return initialState();
    case 'ADVANCE':
      if(s.phase==='cover')s.phase='roadIdle';
      else if(s.phase==='roadIdle')s.phase='walking';
      else if(s.phase==='discovered'){s.phase='story';s.panelIndex=0;}
      else if(s.phase==='story'){
        if(event.branch&&!s.branchChoice&&s.panelIndex===event.branch.afterPanel)s.phase='branchChoice';
        else if(s.panelIndex<panelsFor(s).length-1)s.panelIndex++;
        else if(event.exit==='finale'){
          if(!s.badges.includes(event.badge))s.badges.push(event.badge);
          s.phase='finale';s.panelIndex=0;
        }else{s.phase='collecting';s.collectionStage='expect';}
      }else if(s.phase==='finale'){
        if(s.panelIndex<finale.panels.length-1)s.panelIndex++;
        else s.phase='finished';
      }
      return s;
    case 'BACK':
      if(['story','finale'].includes(s.phase)&&s.panelIndex>0)s.panelIndex--;
      else if(s.phase==='finished'){s.phase='finale';s.panelIndex=finale.panels.length-2;}
      return s;
    case 'SELECT_BRANCH':
      if(s.phase!=='branchChoice'||!event.branch||s.branchChoice||!['if','reality'].includes(action.choice))return state;
      s.branchChoice=action.choice;s.phase='story';s.panelIndex=event.branch.afterPanel+1;return s;
    case 'WALK_DONE':
      if(s.phase!=='walking')return state;s.distance++;s.phase=s.distance>=4?'discovered':'roadIdle';return s;
    case 'COLLECTION_STAGE':
      if(s.phase!=='collecting')return state;s.collectionStage=action.stage;return s;
    case 'COLLECT_DONE':
      if(s.phase!=='collecting'||event.exit==='finale')return state;
      s.badges.push(...pendingBadges(s));s.eventIndex=Math.min(events.length-1,s.eventIndex+1);
      s.phase='roadIdle';s.distance=0;s.panelIndex=0;s.collectionStage='expect';return s;
    default:return state;
  }
}
export function restoreState(value){
  if(!value||value.schema!==SCHEMA)return initialState();
  const phases=['cover','roadIdle','walking','discovered','story','branchChoice','collecting','finale','finished'];
  if(!phases.includes(value.phase))return initialState();
  const s={...initialState(),...value};
  s.eventIndex=Number.isInteger(s.eventIndex)?Math.min(events.length-1,Math.max(0,s.eventIndex)):0;
  s.distance=Number.isInteger(s.distance)?Math.min(4,Math.max(0,s.distance)):0;
  s.branchChoice=['if','reality'].includes(s.branchChoice)?s.branchChoice:null;
  s.badges=[...new Set(Array.isArray(s.badges)?s.badges.filter(id=>Object.hasOwn(badges,id)):[])];
  if(s.branchChoice!=='if')s.badges=s.badges.filter(id=>id!=='paper-plane');
  if(s.phase==='walking')s.phase='roadIdle';
  if(['finale','finished'].includes(s.phase))s.eventIndex=events.length-1;
  const count=panelsFor(s).length;
  s.panelIndex=Number.isInteger(s.panelIndex)?Math.min(count-1,Math.max(0,s.panelIndex)):0;
  if(s.phase==='finished')s.panelIndex=finale.panels.length-1;
  if(s.phase==='branchChoice'&&(!eventFor(s).branch||s.branchChoice)){
    s.phase='story';if(eventFor(s).branch)s.panelIndex=eventFor(s).branch.afterPanel+1;
  }
  if(s.phase==='collecting'){
    s.collectionStage='expect';
    if(!pendingBadges(s).length){s.phase='roadIdle';s.eventIndex=Math.min(events.length-1,s.eventIndex+1);s.panelIndex=0;s.distance=0;}
  }
  return s;
}
