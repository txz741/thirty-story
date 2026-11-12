// Physical down-swipe and wheel-down both mean ADVANCE. Never native scrolling.
export function swipeDirection(dx,dy) {
  if(Math.abs(dy)<56 || Math.abs(dy)<Math.abs(dx)*1.35)return null;
  return dy>0?'ADVANCE':'BACK';
}
export class WheelGesture {
  constructor(){this.last=-Infinity;this.total=0;this.latched=false;this.sign=0;}
  consume(delta,now) {
    const sign=Math.sign(delta);
    if(now-this.last>260){this.total=0;this.latched=false;this.sign=sign;}
    this.last=now;
    if(this.latched)return null;
    if(this.sign && sign!==this.sign){this.total=0;this.sign=sign;}
    this.sign=sign; this.total+=delta;
    if(Math.abs(this.total)<45)return null;
    this.latched=true;return this.total>0?'ADVANCE':'BACK';
  }
}
export function bindInput(element,consume) {
  let start=null; const wheel=new WheelGesture();
  const down=e=>{
    if(e.target.closest('button,a,input') || (e.pointerType==='mouse' && e.button!==0))return;
    if(start){start=null;return;}
    start={x:e.clientX,y:e.clientY,id:e.pointerId};
    element.setPointerCapture?.(e.pointerId);
  };
  const up=e=>{
    if(!start || start.id!==e.pointerId)return;
    const direction=swipeDirection(e.clientX-start.x,e.clientY-start.y); start=null;
    if(direction)consume(direction);
  };
  const cancel=()=>{start=null;};
  const scroll=e=>{
    if(e.ctrlKey)return;
    e.preventDefault();
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    const multiplier=e.deltaMode===1?16:e.deltaMode===2?element.clientHeight:1;
    const direction=wheel.consume(e.deltaY*multiplier,performance.now());
    if(direction)consume(direction);
  };
  element.addEventListener('pointerdown',down);
  element.addEventListener('pointerup',up);
  element.addEventListener('pointercancel',cancel);
  element.addEventListener('wheel',scroll,{passive:false});
  return ()=>{element.removeEventListener('pointerdown',down);element.removeEventListener('pointerup',up);
    element.removeEventListener('pointercancel',cancel);element.removeEventListener('wheel',scroll);};
}
