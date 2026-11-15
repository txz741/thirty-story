// Bag-body centers measured every 8 frames in the 941 x 1672 sequence.
export const ENDING_BAG_REST={x:277,y:763,scale:1,opacity:1};
export const ENDING_BAG_TRACK=[
  [0,277,763,1],[8,290,766,.99],[16,315,766,.98],[24,337,782,.96],
  [32,330,779,.94],[40,339,773,.90],[48,387,787,.86],[56,387,787,.80],
  [64,415,773,.76],[72,422,778,.70],[80,467,774,.65],[88,484,761,.59],
  [96,498,772,.52],[104,518,777,.45],[112,537,774,.39],[120,551,792,.34],
  [128,560,789,.30],[136,581,804,.26],[144,601,831,.22],[152,612,860,.185],
  [160,630,903,.15],[168,652,956,.115],[176,675,1004,.085],[184,695,1048,.06],
  [192,705,1106,.04],[200,713,1130,.02],[208,718,1142,0],[240,718,1142,0],
];
const clamp=value=>Math.max(0,Math.min(1,value));
const cubic=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
export function endingBagPose(frame=-1,config=ENDING_STAR_CONFIG){
  if(!Number.isFinite(frame)||frame<0)return {...ENDING_BAG_REST};
  const f=Math.min(240,frame);let i=0;
  while(i<ENDING_BAG_TRACK.length-2&&ENDING_BAG_TRACK[i+1][0]<f)i++;
  const a=ENDING_BAG_TRACK[Math.max(0,i-1)],b=ENDING_BAG_TRACK[i],c=ENDING_BAG_TRACK[i+1],d=ENDING_BAG_TRACK[Math.min(ENDING_BAG_TRACK.length-1,i+2)],t=clamp((f-b[0])/(c[0]-b[0]));
  const fade=clamp((f-config.fadeStartFrame)/(config.fadeEndFrame-config.fadeStartFrame)),opacity=1-fade*fade*(3-2*fade);
  return {x:cubic(a[1],b[1],c[1],d[1],t),y:cubic(a[2],b[2],c[2],d[2],t),scale:b[3]+(c[3]-b[3])*t,opacity};
}
export const ENDING_MOUTH_OFFSET={x:9,y:-54};
export function endingMouthPose(frame=-1,config){const pose=endingBagPose(frame,config);return {...pose,x:pose.x+ENDING_MOUTH_OFFSET.x*pose.scale,y:pose.y+ENDING_MOUTH_OFFSET.y*pose.scale};}


// Fixed hanging positions; slow-flight velocity always points toward the current bag.
export const ENDING_STREAM_CONFIG=Object.freeze({
  launchRemainingSeconds:8,completionRemainingSeconds:5,timingDelaySeconds:3,launchGapSeconds:.09,fastFlightSeconds:.8,
  firstSlowSeconds:.65,maxFastGapSeconds:.6,fastGapStartWeight:1.6,fastGapEndWeight:.4,
  slowFollowRateHead:.24,slowFollowRateTail:.12,slowSpeedMultiplier:2.6,slowRampSeconds:.05,slowSampleHz:120,slowEndScale:.8,
  hangingTopDistance:52,hangingBottomDistance:833,
  hoverStrength:1,hoverRotationDegrees:.8,rotationDegrees:2.2,
  sunX:718,sunY:1142,trailSeconds:.12,trailOpacity:.09,trailWidth:1.15,
  glowStrength:.48,starSize:40,morphStartProgress:.83,morphEndProgress:1,
  fadeStartFrame:184,fadeEndFrame:208,defaultMusicDuration:54.81,
});
export const ENDING_STAR_CONFIG=ENDING_STREAM_CONFIG;
export const ENDING_HANGING_GUIDE=Object.freeze([
  Object.freeze({x:318,y:710}),Object.freeze({x:225,y:850}),
  Object.freeze({x:184,y:1220}),Object.freeze({x:150,y:1565}),
]);
const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
const hash=(n,seed)=>{let x=Math.imul(n^seed,1597334677);x=Math.imul(x^(x>>>16),2246822519);return ((x^(x>>>13))>>>0)/2147483647.5-1;};
const noise=(time,seed)=>{const n=Math.floor(time),u=smooth(time-n);return hash(n,seed)*(1-u)+hash(n+1,seed)*u;};
const sizes=[58,54,52,56,52,58,50,54,50,56,48];
const point=(x,y)=>({x,y});
const worldOrigin=()=>({x:0,y:0,scale:1,opacity:1});
const schedules=new WeakMap(),plans=new WeakMap(),warmJobs=new WeakMap();
const bezier=(c,u)=>{const v=1-u;return point(v*v*v*c[0].x+3*v*v*u*c[1].x+3*v*u*u*c[2].x+u*u*u*c[3].x,v*v*v*c[0].y+3*v*v*u*c[1].y+3*v*u*u*c[2].y+u*u*u*c[3].y);};
function arcTable(guide){
  const samples=[{t:0,length:0}],steps=320;let prior=bezier(guide,0),length=0;
  for(let i=1;i<=steps;i++){const t=i/steps,p=bezier(guide,t);length+=Math.hypot(p.x-prior.x,p.y-prior.y);samples.push({t,length});prior=p;}
  return {guide,samples,length};
}
const blueArc=arcTable(ENDING_HANGING_GUIDE);
function arcAt(arc,distance){
  const d=Math.max(0,Math.min(arc.length,distance));let a=0,b=arc.samples.length-1;
  while(b-a>1){const mid=(a+b)>>1;if(arc.samples[mid].length<d)a=mid;else b=mid;}
  const left=arc.samples[a],right=arc.samples[b],mix=(d-left.length)/(right.length-left.length||1);
  return bezier(arc.guide,left.t+(right.t-left.t)*mix);
}
function cacheFor(weak,config){let cache=weak.get(config);if(!cache){cache=new Map();weak.set(config,cache);}return cache;}
export const endingLaunchTime=(index,config=ENDING_STREAM_CONFIG,duration=config.defaultMusicDuration)=>duration-config.launchRemainingSeconds+config.timingDelaySeconds+index*config.launchGapSeconds;
export function endingRouteSchedule(count=10,config=ENDING_STREAM_CONFIG,duration=config.defaultMusicDuration){
  const cache=cacheFor(schedules,config),key=duration+':'+count;if(cache.has(key))return cache.get(key);
  const firstLaunch=endingLaunchTime(0,config,duration),finishTime=duration-config.completionRemainingSeconds+config.timingDelaySeconds,span=finishTime-config.fastFlightSeconds-firstLaunch-config.firstSlowSeconds;
  if(span<0)throw RangeError('The slow and fast phases must fit before the requested finish time.');
  const gaps=Math.max(0,count-1),weights=Array.from({length:gaps},(_,i)=>config.fastGapStartWeight+(config.fastGapEndWeight-config.fastGapStartWeight)*(gaps>1?i/(gaps-1):0)),total=weights.reduce((a,b)=>a+b,0);
  const cap=total?Math.min(1,config.maxFastGapSeconds/(span*Math.max(...weights)/total)):1;
  const fastGaps=weights.map(w=>span*w/total*cap),fastOffsets=[0];for(const gap of fastGaps)fastOffsets.push(fastOffsets.at(-1)+gap);
  const firstFast=finishTime-config.fastFlightSeconds-fastOffsets.at(-1);
  const schedule={count,top:config.hangingTopDistance,bottom:Math.min(config.hangingBottomDistance,blueArc.length-20),firstLaunch,finishTime,firstFast,fastGaps,fastOffsets,fastGapSeconds:Math.max(0,...fastGaps),maxFastGapSeconds:config.maxFastGapSeconds,launchGapSeconds:config.launchGapSeconds,fastFlightSeconds:config.fastFlightSeconds};
  cache.set(key,schedule);return schedule;
}
function waiting(index,time,duration,count,config){
  const schedule=endingRouteSchedule(count,config,duration),distance=schedule.top+(schedule.bottom-schedule.top)*(count>1?index/(count-1):0),p=arcAt(blueArc,distance),u=distance/blueArc.length,relative=time-schedule.firstLaunch+config.timingDelaySeconds,amplitude=(1.5+u*u*8)*config.hoverStrength;
  return {x:p.x+noise(relative*.17-u*.6,271)*amplitude+noise(relative*.21-index*.09,391)*config.hoverStrength,y:p.y+noise(relative*.15-u*.5,811)*1.8*u*config.hoverStrength,scale:1};
}
export function endingBagTarget(time,duration=ENDING_STREAM_CONFIG.defaultMusicDuration,config=ENDING_STREAM_CONFIG){
  const frame=(time-duration+10)*24.1;return endingMouthPose(frame<0?-1:Math.min(240,frame),config);
}
function planFor(index,duration,count,config){
  const cache=cacheFor(plans,config),key=duration+':'+count+':'+index;if(cache.has(key))return cache.get(key);
  const schedule=endingRouteSchedule(count,config,duration),launch=endingLaunchTime(index,config,duration),fastStart=schedule.firstFast+schedule.fastOffsets[index];
  const arrival=index===count-1?schedule.finishTime:fastStart+config.fastFlightSeconds;
  const plan={launch,fastStart,arrival,slowSeconds:fastStart-launch,start:waiting(index,launch,duration,count,config),followRate:config.slowFollowRateHead+(config.slowFollowRateTail-config.slowFollowRateHead)*(count>1?index/(count-1):0),path:null,builder:null};
  if(plan.slowSeconds<=0)throw RangeError('Each medal needs a slow phase before accelerating.');cache.set(key,plan);return plan;
}
function velocity(plan,time,x,y,duration,config){
  const bag=endingBagTarget(time,duration,config),rate=plan.followRate*config.slowSpeedMultiplier*smooth((time-plan.launch)/config.slowRampSeconds);
  return point((bag.x-x)*rate,(bag.y-y)*rate);
}
function* buildPursuit(plan,duration,config){
  const steps=Math.ceil(plan.slowSeconds*config.slowSampleHz),dt=plan.slowSeconds/steps,values=new Float64Array((steps+1)*4);
  let x=plan.start.x,y=plan.start.y;values[0]=x;values[1]=y;
  for(let i=1;i<=steps;i++){
    const time=plan.launch+(i-1)*dt,k1=velocity(plan,time,x,y,duration,config),k2=velocity(plan,time+dt/2,x+k1.x*dt/2,y+k1.y*dt/2,duration,config),k3=velocity(plan,time+dt/2,x+k2.x*dt/2,y+k2.y*dt/2,duration,config),k4=velocity(plan,time+dt,x+k3.x*dt,y+k3.y*dt,duration,config);
    x+=dt/6*(k1.x+2*k2.x+2*k3.x+k4.x);y+=dt/6*(k1.y+2*k2.y+2*k3.y+k4.y);
    const v=velocity(plan,plan.launch+i*dt,x,y,duration,config),p=i*4;values[p]=x;values[p+1]=y;values[p+2]=v.x;values[p+3]=v.y;
    if(i%64===0)yield;
  }
  return {values,steps,dt};
}
function buildChunk(plan,duration,config){if(plan.path)return true;if(!plan.builder)plan.builder=buildPursuit(plan,duration,config);const next=plan.builder.next();if(next.done){plan.path=next.value;plan.builder=null;}return next.done;}
function warmPursuits(count,duration,config){
  if(typeof window==='undefined'||count===0)return;const cache=cacheFor(warmJobs,config),key=duration+':'+count;if(cache.has(key))return;cache.set(key,true);
  const list=Array.from({length:count},(_,i)=>planFor(i,duration,count,config));let cursor=0;
  const schedule=fn=>globalThis.requestIdleCallback?requestIdleCallback(fn,{timeout:1000}):setTimeout(()=>fn(null),40);
  const run=deadline=>{const started=performance.now();while(cursor<list.length){if(buildChunk(list[cursor],duration,config))cursor++;if(performance.now()-started>3||deadline&&deadline.timeRemaining()<2){schedule(run);return;}}};schedule(run);
}
function slowAt(plan,time,duration,config){
  while(!plan.path)buildChunk(plan,duration,config);
  const {values,steps,dt}=plan.path,at=clamp((time-plan.launch)/plan.slowSeconds)*steps,i=Math.min(steps-1,Math.floor(at)),u=at-i,a=i*4,b=(i+1)*4;
  const u2=u*u,u3=u2*u,h0=2*u3-3*u2+1,h1=u3-2*u2+u,h2=-2*u3+3*u2,h3=u3-u2;
  return {x:h0*values[a]+h1*dt*values[a+2]+h2*values[b]+h3*dt*values[b+2],y:h0*values[a+1]+h1*dt*values[a+3]+h2*values[b+1]+h3*dt*values[b+3]};
}
function sceneAt(time,duration,count,config){
  return Array.from({length:count},(_,index)=>{
    const plan=planFor(index,duration,count,config),age=time-plan.launch,baseSize=sizes[index%sizes.length],state=time<plan.launch?'waiting':time<plan.fastStart?'slow':time<plan.arrival?'flying':'dissolved';
    const flight=clamp((time-plan.fastStart)/config.fastFlightSeconds);let position,travel=0;
    if(state==='waiting')position=waiting(index,time,duration,count,config);
    else if(state==='slow')position=slowAt(plan,time,duration,config);
    else if(state==='dissolved'){position=point(config.sunX,config.sunY);travel=1;}
    else{
      const from=slowAt(plan,plan.fastStart,duration,config),v=velocity(plan,plan.fastStart,from.x,from.y,duration,config),distance=Math.hypot(config.sunX-from.x,config.sunY-from.y),slope=Math.min(.65,Math.hypot(v.x,v.y)*config.fastFlightSeconds/(distance||1));
      travel=clamp((slope-2)*flight*flight*flight+(3-2*slope)*flight*flight+slope*flight);position=point(from.x+(config.sunX-from.x)*travel,from.y+(config.sunY-from.y)*travel);
    }
    const slowScale=1-(1-config.slowEndScale)*smooth(age/plan.slowSeconds);
    const perspective=state==='dissolved'?0:state==='flying'?config.slowEndScale*Math.pow(1-travel,.8):state==='slow'?slowScale:1,opacity=state==='dissolved'?0:1-smooth((flight-.62)/.38),morph=smooth((travel-config.morphStartProgress)/(config.morphEndProgress-config.morphStartProgress));
    const phase=(time-endingLaunchTime(0,config,duration))*.17+index*.51,rotationRange=state==='flying'?config.rotationDegrees:config.hoverRotationDegrees;
    return {dx:position.x,dy:position.y,baseSize,size:baseSize*perspective,scale:perspective,opacity,
      brightness:.97+noise(phase,index*59+431)*.025,rotation:noise(phase*.8,index*61+457)*rotationRange,
      imageAlpha:1-morph,starAlpha:morph,starSize:config.starSize*perspective,soften:morph*1.2,
      glow:config.glowStrength*(.9+noise(phase,index*67+479)*.1),launchTime:plan.launch,endTime:plan.arrival,
      launchX:plan.start.x,launchY:plan.start.y,fastStartTime:plan.fastStart,purpleStartTime:plan.fastStart,slowSeconds:plan.slowSeconds,
      flightProgress:clamp(age/(plan.arrival-plan.launch)),travelProgress:travel,state,queuePosition:index,
      trailPoints:[],trailPath:'',trailOpacity:0,trailWidth:config.trailWidth*Math.max(.1,perspective)};
  });
}
const number=value=>Number(value.toFixed(2));
function trailPath(points){if(points.length<2)return '';return 'M '+points.map(p=>number(p.x)+' '+number(p.y)).join(' L ');}
export function endingProcessionGeometry(frame=-1,clock=null,count=10,config=ENDING_STREAM_CONFIG){
  const duration=Number.isFinite(clock?.duration)&&clock.duration>0?clock.duration:config.defaultMusicDuration;
  const current=Number.isFinite(clock?.currentTime)?clock.currentTime:0,musicTime=frame<0?Math.min(current,duration-10):Number.isFinite(clock?.animationTime)?clock.animationTime:duration-10+Math.min(240,frame)/24.1;
  warmPursuits(count,duration,config);
  const beads=sceneAt(musicTime,duration,count,config),history=[];
  if(beads.some(b=>b.state==='flying'))for(let i=5;i>=0;i--){const time=musicTime-config.trailSeconds*i/5;history.push({time,beads:i===0?beads:sceneAt(time,duration,count,config)});}
  beads.forEach((b,index)=>{if(b.state!=='flying')return;const points=history.filter(h=>h.time>=b.fastStartTime).map(h=>point(h.beads[index].dx,h.beads[index].dy));b.trailPoints=points;b.trailPath=trailPath(points);b.trailOpacity=config.trailOpacity*b.opacity*b.brightness*smooth((musicTime-b.fastStartTime)/.08);});
  return {pose:worldOrigin(),anchor:endingBagTarget(musicTime,duration,config),beads,musicTime,time:musicTime-duration+10};
}

export const endingStarGeometry=endingProcessionGeometry;
export const endingRibbonGeometry=endingProcessionGeometry;
export function endingBadgeFormation(ids,frame=-1,clock=null){const unique=[...new Set(ids)],geometry=endingProcessionGeometry(frame,clock,unique.length);return unique.map((id,i)=>({id,...geometry.beads[i]}));}
export function positionEndingBadges(overlay,frame=-1,clock=null){
  overlay._endingFrameIndex=frame;if(clock)overlay._endingRibbonClock=clock;
  const root=overlay.querySelector?.('.ending-badge-ribbon');let nodes=overlay._endingRibbonNodes;
  if(root&&nodes?.root!==root){const beads=[...root.querySelectorAll('[data-ribbon-bead]')];nodes=overlay._endingRibbonNodes={root,beads,images:beads.map(node=>node.querySelector('img')),trails:[...root.querySelectorAll('[data-flow-trail]')],halos:[...root.querySelectorAll('[data-flow-halo]')]};beads.forEach((node,i)=>{node.style.left=node.style.top='0';nodes.images[i].style.width=nodes.images[i].style.height=sizes[i%sizes.length]/941*20+'em';node.style.setProperty('--memory-star-size',ENDING_STREAM_CONFIG.starSize/941*20+'em');});}
  const geometry=endingProcessionGeometry(frame,overlay._endingRibbonClock,root?nodes.beads.length:0),pose=geometry.pose;
  for(const [name,value] of Object.entries({'--ending-bag-x':'0em','--ending-bag-y':'0em','--ending-bag-scale':'1','--ending-bag-opacity':'1'}))overlay.style.setProperty?.(name,value);
  overlay.classList?.toggle('ending-in-flight',frame>=0);
  if(root)nodes.beads.forEach((node,i)=>{const b=geometry.beads[i];node.style.transform='translate3d('+b.dx/941*20+'em,'+b.dy/941*20+'em,0) rotate('+b.rotation+'deg) scale('+b.scale+')';node.style.opacity=String(b.opacity*b.brightness);node.style.setProperty('--memory-image-alpha',String(b.imageAlpha));node.style.setProperty('--memory-star-alpha',String(b.starAlpha));node.style.setProperty('--memory-soften',b.soften/941*20+'em');node.style.setProperty('--memory-star-glow',String(b.glow));for(const [path,halo] of [[nodes.trails[i],false],[nodes.halos[i],true]])if(path){path.setAttribute('d',b.trailPath);path.setAttribute('opacity',String(b.trailOpacity*(halo?.27:1)));path.setAttribute('stroke-width',String(b.trailWidth*(halo?2.8:1)));}});
  return pose;
}
