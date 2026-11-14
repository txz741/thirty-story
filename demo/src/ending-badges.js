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
export function endingBadgeFormation(ids){
  const unique=[...new Set(ids)],ordered=[...unique.filter(id=>id==='wings'),...unique.filter(id=>id!=='wings')];
  return ordered.map((id,i)=>{const angle=(-80-180*i/Math.max(1,ordered.length-1))*Math.PI/180;
    return {id,dx:145*Math.cos(angle),dy:-55+145*Math.sin(angle),size:id==='wings'?(ordered.length>10?48:52):(ordered.length>10?42:46),delay:i*.17};
  });
}
export function positionEndingBadges(overlay,frame=-1){
  overlay._endingFrameIndex=frame;const pose=endingBagPose(frame);
  for(const [name,value] of Object.entries({'--ending-bag-x':pose.x/941*20+'em','--ending-bag-y':pose.y/941*20+'em','--ending-bag-scale':String(pose.scale),'--ending-bag-opacity':String(pose.opacity)}))overlay.style.setProperty?.(name,value);
  overlay.classList?.toggle('ending-in-flight',frame>=0);return pose;
}
