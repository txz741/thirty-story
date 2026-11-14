export const ENDING_FRAME_SOURCE={src:'assets/stories/finale/fly-away-frames.json?v=23',count:241,width:941,height:1672,seconds:10};
export function frameForMusic(music,count=ENDING_FRAME_SOURCE.count,seconds=10){
  if(music?.id!=='finale'||!Number.isFinite(music.duration)||music.duration<=0||!Number.isFinite(music.currentTime))return -1;
  const elapsed=music.currentTime-(music.duration-seconds);
  if(elapsed<0&&!music.ended)return -1;
  return Math.min(count-1,Math.max(0,Math.floor((music.ended?1:elapsed/seconds)*count)));
}
export function unpackFrameZip(buffer){
  const bytes=new Uint8Array(buffer),view=new DataView(buffer),frames=[];let p=0;
  while(p+30<=bytes.length&&view.getUint32(p,true)===0x04034b50){
    const flags=view.getUint16(p+6,true),method=view.getUint16(p+8,true),size=view.getUint32(p+18,true),nameLength=view.getUint16(p+26,true),extraLength=view.getUint16(p+28,true),start=p+30+nameLength+extraLength;
    if(flags&9||method!==0||start+size>bytes.length)throw Error('Invalid frame package');
    const name=new TextDecoder().decode(bytes.subarray(p+30,p+30+nameLength));
    if(!/^\d{4}\.webp$/.test(name))throw Error('Unexpected frame');
    frames.push({name,blob:new Blob([bytes.subarray(start,start+size)],{type:'image/webp'})});p=start+size;
  }
  return frames.sort((a,b)=>a.name.localeCompare(b.name));
}
async function decodeFrame(blob){
  if(globalThis.createImageBitmap)return createImageBitmap(blob);
  const url=URL.createObjectURL(blob),image=new Image();
  try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});return image;}finally{URL.revokeObjectURL(url);}
}
export function createEndingFrames({canvas,button,music,document,requestFrame=globalThis.requestAnimationFrame,fetcher=globalThis.fetch,decode=decodeFrame,onShow=()=>{},onFrame=()=>{},source=ENDING_FRAME_SOURCE}){
  const context=canvas.getContext?.('2d');if(!context)return {setActive(){},warm:()=>Promise.resolve(false)};
  canvas.width=source.width;canvas.height=source.height;canvas.hidden=true;button.hidden=true;
  let active=false,epoch=0,manifest=null,download=null,failed=false,target=0,drawn=-1,decoding=0;
  const frames=Array(source.count).fill(null);
  const cache=new Map(),pending=new Set(),queue=[];
  function trim(){for(const [index,bitmap] of cache)if(index<target||index>=target+6){bitmap.close?.();cache.delete(index);}}
  function pump(){
    while(decoding<2&&queue.length){
      const index=queue.shift();if(index<target||index>=target+6){pending.delete(index);continue;}decoding++;
      Promise.resolve(decode(frames[index].blob)).then(bitmap=>{if(index>=target&&index<target+6)cache.set(index,bitmap);else bitmap.close?.();}).catch(()=>{}).finally(()=>{decoding--;pending.delete(index);trim();pump();});
    }
  }
  function prepare(index){
    target=index;trim();
    for(let i=index;i<Math.min(frames.length,index+6);i++)if(frames[i]&&!cache.has(i)&&!pending.has(i)){pending.add(i);queue.push(i);}
    pump();
  }
  function warm(){
    if(frames.every(Boolean))return Promise.resolve(true);if(download)return download;
    failed=false;download=Promise.resolve().then(async()=>{
      if(!manifest){const r=await fetcher(source.src,{priority:'low'});if(!r.ok)throw Error('Frame manifest HTTP '+r.status);const value=await r.json();if(value.count!==source.count||!Array.isArray(value.packages))throw Error('Invalid frame manifest');manifest=value;}
      const parts=manifest.packages.filter(part=>!frames[part.first]);let cursor=0;
      async function worker(){while(cursor<parts.length){const part=parts[cursor++];try{
        const r=await fetcher(part.src,{priority:'low'});if(!r.ok)throw Error('Frame HTTP '+r.status);const result=unpackFrameZip(await r.arrayBuffer());if(result.length!==part.count||part.first+part.count>source.count)throw Error('Incomplete frame package');
        if(result.some((frame,i)=>frame.name!==String(part.first+i).padStart(4,'0')+'.webp'))throw Error('Unexpected frame order');result.forEach((frame,i)=>{frames[part.first+i]=frame;});prepare(target);
      }catch{failed=true;}}}
      await Promise.all([worker(),worker()]);return frames.every(Boolean);
    }).catch(()=>{failed=true;return false;}).finally(()=>{download=null;});return download;
  }
  function tick(token){
    if(!active||token!==epoch)return;
    if(!document.hidden){
      const index=frameForMusic(music(),source.count,source.seconds);prepare(Math.max(0,index));
      if(index<0){const changed=drawn!==-1||!canvas.hidden;canvas.hidden=true;button.hidden=true;drawn=-1;if(changed)onFrame(-1);}
      else{
        button.hidden=!failed;
        const bitmap=cache.get(index);
        if(bitmap&&drawn!==index){context.drawImage(bitmap,0,0,source.width,source.height);drawn=index;onFrame(index);if(canvas.hidden){canvas.hidden=false;onShow();}}
      }
    }
    requestFrame(()=>tick(token));
  }
  button.addEventListener('click',()=>void warm());
  void warm();
  return {warm,setActive(value){value=!!value;if(value===active)return;active=value;epoch++;button.hidden=true;if(!active){canvas.hidden=true;drawn=-1;onFrame(-1);return;}void warm();tick(epoch);}};
}
