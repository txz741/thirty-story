export const SCHEMA = 1;
export const initialState = () => ({ schema:SCHEMA, phase:'cover', distance:0, panelIndex:0,
  badges:[], completed:false, collectionStage:'expect', branchChoice:null });
const contains = state => state.badges.includes('badminton');
export function transition(state, action) {
  const s = { ...state, badges:[...state.badges] };
  switch(action.type) {
    case 'RESET': return initialState();
    case 'ADVANCE':
      if(s.phase==='cover') s.phase='roadIdle';
      else if(s.phase==='roadIdle') s.phase='walking';
      else if(s.phase==='discovered') { s.phase='story'; s.panelIndex=0; }
      else if(s.phase==='story') {
        if(s.panelIndex<3) s.panelIndex++;
        else { s.phase='collecting'; s.collectionStage='expect'; }
      }
      return s;
    case 'BACK':
      if(s.phase==='story' && s.panelIndex>0) s.panelIndex--;
      return s;
    case 'WALK_DONE':
      if(s.phase!=='walking')return state;
      s.distance++;
      s.phase=!s.completed && s.distance>=4 ? 'discovered':'roadIdle';
      return s;
    case 'COLLECTION_STAGE':
      if(s.phase!=='collecting')return state;
      s.collectionStage=action.stage; return s;
    case 'COLLECT_DONE':
      if(s.phase!=='collecting')return state;
      if(!contains(s))s.badges.push('badminton');
      s.completed=true; s.phase='roadIdle'; s.distance=0; s.collectionStage='expect'; return s;
    default:return state;
  }
}
export function restoreState(value) {
  if(!value || value.schema!==SCHEMA)return initialState();
  const phases=['cover','roadIdle','walking','discovered','story','collecting'];
  if(!phases.includes(value.phase))return initialState();
  const s={...initialState(),...value, badges:[...new Set(Array.isArray(value.badges)?value.badges.filter(v=>v==='badminton'):[])]};
  s.distance=Number.isInteger(s.distance)?Math.max(0,s.distance):0;
  s.panelIndex=Number.isInteger(s.panelIndex)?Math.min(3,Math.max(0,s.panelIndex)):0;
  s.completed=s.badges.includes('badminton');
  if(s.phase==='walking')s.phase='roadIdle';
  if(s.phase==='collecting') {s.collectionStage='expect';if(s.completed)s.phase='roadIdle';}
  if(s.completed && ['story','discovered'].includes(s.phase))s.phase='roadIdle';
  return s;
}
