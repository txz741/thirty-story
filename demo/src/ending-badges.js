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
export function endingBagPose(frame=-1){
  if(!Number.isFinite(frame)||frame<0)return {...ENDING_BAG_REST};
  const f=Math.min(240,frame);let i=0;
  while(i<ENDING_BAG_TRACK.length-2&&ENDING_BAG_TRACK[i+1][0]<f)i++;
  const a=ENDING_BAG_TRACK[Math.max(0,i-1)],b=ENDING_BAG_TRACK[i],c=ENDING_BAG_TRACK[i+1],d=ENDING_BAG_TRACK[Math.min(ENDING_BAG_TRACK.length-1,i+2)],t=clamp((f-b[0])/(c[0]-b[0]));
  const fade=clamp((f-152)/56),opacity=1-fade*fade*(3-2*fade);
  return {x:cubic(a[1],b[1],c[1],d[1],t),y:cubic(a[2],b[2],c[2],d[2],t),scale:b[3]+(c[3]-b[3])*t,opacity};
}
export const ENDING_MOUTH_OFFSET={x:9,y:-54};
export function endingMouthPose(frame=-1){const pose=endingBagPose(frame);return {...pose,x:pose.x+ENDING_MOUTH_OFFSET.x*pose.scale,y:pose.y+ENDING_MOUTH_OFFSET.y*pose.scale};}
const point=(x,y)=>({x,y});
const bezier=(p,t)=>{const u=1-t;return point(u*u*u*p[0].x+3*u*u*t*p[1].x+3*u*t*t*p[2].x+t*t*t*p[3].x,u*u*u*p[0].y+3*u*u*t*p[1].y+3*u*t*t*p[2].y+t*t*t*p[3].y);};
export function pointOnEndingRibbon(curve,t){const at=clamp(t)*curve.length,index=Math.min(curve.length-1,Math.floor(at));return bezier(curve[index],at-index);}
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const ribbonSpline=fn=>{
  const tangent=t=>{const a=Math.max(0,t-.0001),b=Math.min(1,t+.0001),pa=fn(a),pb=fn(b);return point((pb.x-pa.x)/(b-a),(pb.y-pa.y)/(b-a));};
  return Array.from({length:12},(_,i)=>{const a=i/12,b=(i+1)/12,p=fn(a),q=fn(b),da=tangent(a),db=tangent(b);return [p,point(p.x+da.x/36,p.y+da.y/36),point(q.x-db.x/36,q.y-db.y/36),q];});
};
export function endingRibbonGeometry(frame=-1,clock=null,count=10){
  const pose=endingMouthPose(frame),time=Number.isFinite(clock?.duration)&&Number.isFinite(clock?.currentTime)?clock.currentTime-(clock.duration-10):Math.max(0,frame)/24.1;
  const past=endingMouthPose(frame<0?-1:Math.max(0,frame-8)),normal=Math.max(.22,pose.scale);
  const dragX=Math.max(-80,Math.min(80,(past.x-pose.x)/normal))*.7,dragY=Math.max(-90,Math.min(90,(past.y-pose.y)/normal))*.6;
  const wave=Math.sin(time*1.1)*12,tailWave=Math.sin(time*1.1-1)*26,waveY=Math.cos(time*.8-.4)*10;
  const p0=point(0,0),p1=point(-105+dragX*.14,12+dragY*.1),p2=point(-200+wave+dragX*.55,175+waveY*.3+dragY*.3),join=point(-180+wave+dragX*.65,335+waveY*.4+dragY*.5);
  const p3=point(join.x+(join.x-p2.x),join.y+(join.y-p2.y)),p4=point(-105+tailWave+dragX*.9,650+waveY*.7+dragY*.8),tail=point(-150+tailWave*1.3+dragX,790+waveY+dragY);
  const rest=[[p0,p1,p2,join],[join,p3,p4,tail]],lift=smooth(Math.max(0,frame)/24),gust=Math.sin(Math.PI*lift)**2;
  // The virtual strand catches the wind in the first second. No line is drawn.
  // It first lifts into the open sky, then streams behind the departing bag.
  const width=Math.max(185,Math.min(730,(pose.x-60)/Math.max(.04,pose.scale)-50)),height=Math.min(620,Math.sqrt(Math.max(120**2,680**2-width**2))),length=Math.hypot(width,height);
  const wind=t=>{const envelope=1-Math.exp(-6*t),ripple=82*envelope*Math.sin(3*Math.PI*t-time*3);return point(-width*t+height/length*ripple,-height*t-width/length*ripple);};
  const curve=ribbonSpline(t=>{const a=pointOnEndingRibbon(rest,t),b=wind(t),bow=Math.sin(Math.PI*t);return point(a.x*(1-lift)+b.x*lift+gust*(320*bow*bow-150*Math.sin(2*Math.PI*t)),a.y*(1-lift)+b.y*lift+gust*400*bow);});
  const points=Array.from({length:129},(_,i)=>({...pointOnEndingRibbon(curve,i/128),t:i/128})),lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  const sizes=Array.from({length:count},(_,i)=>((count>10?88:96)-(count>10?30:32)*i/Math.max(1,count-1))*(1-.22*lift)),total=sizes.reduce((a,b)=>a+b,0)+4*Math.max(0,count-1)+48;let used=24;
  const beads=sizes.map((size,i)=>{const distance=(used+size/2)/total*lengths.at(-1);used+=size+4;let j=1;while(j<lengths.length-1&&lengths[j]<distance)j++;const ratio=(distance-lengths[j-1])/Math.max(.00001,lengths[j]-lengths[j-1]),t=points[j-1].t+(points[j].t-points[j-1].t)*ratio,p=pointOnEndingRibbon(curve,t);return {dx:p.x,dy:p.y,size,t,delay:0};});
  return {pose,curve,points,beads,time,lift};
}
export function endingBadgeFormation(ids,frame=-1,clock=null){const unique=[...new Set(ids)],geometry=endingRibbonGeometry(frame,clock,unique.length);return unique.map((id,i)=>({id,...geometry.beads[i]}));}
export function positionEndingBadges(overlay,frame=-1,clock=null){
  overlay._endingFrameIndex=frame;if(clock)overlay._endingRibbonClock=clock;
  const pose=endingMouthPose(frame);
  for(const [name,value] of Object.entries({'--ending-bag-x':pose.x/941*20+'em','--ending-bag-y':pose.y/941*20+'em','--ending-bag-scale':String(pose.scale),'--ending-bag-opacity':String(pose.opacity)}))overlay.style.setProperty?.(name,value);
  overlay.classList?.toggle('ending-in-flight',frame>=0);
  const root=overlay.querySelector?.('.ending-badge-ribbon');
  if(root){
    let nodes=overlay._endingRibbonNodes;if(nodes?.root!==root){const beads=[...root.querySelectorAll('[data-ribbon-bead]')];nodes=overlay._endingRibbonNodes={root,beads,images:beads.map(node=>node.querySelector('img'))};}
    const geometry=endingRibbonGeometry(frame,overlay._endingRibbonClock,nodes.beads.length);
    nodes.beads.forEach((node,i)=>{const bead=geometry.beads[i];node.style.left=bead.dx/941*20+'em';node.style.top=bead.dy/941*20+'em';nodes.images[i].style.width=nodes.images[i].style.height=bead.size/941*20+'em';});
  }
  return pose;
}
