export const BADGE_HOLD_MS=3000;
export function badgeGeometry(book){
  const rect=book.getBoundingClientRect();
  const size=Math.min(180,rect.width*.42,rect.height*.22);
  return {size,start:{x:rect.width*.72-size/2,y:rect.height*.24-size/2}};
}
export async function presentBadge({book,badge,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),isCurrent=()=>true,onPresent=()=>{}}){
  if(!isCurrent())return false;
  const {size,start}=badgeGeometry(book);
  badge.style.width=`${size}px`;badge.style.height=`${size}px`;
  badge.style.transform=`translate(${start.x}px,${start.y}px) rotate(0deg) scale(1)`;
  badge.style.opacity='1';badge.hidden=false;badge.classList.add('badge-presenting');
  onPresent();
  await delay(BADGE_HOLD_MS);
  if(!isCurrent())return false;
  badge.classList.remove('badge-presenting');return true;
}
