const HASH_HEADER='x-story-sha256';
export const OFFLINE_PREFIX='memory-story-offline-';
export function canonicalURL(value,base){const url=new URL(typeof value==='string'?value:value.url,base);if(url.pathname.endsWith('/'))url.pathname+='index.html';url.search='';url.hash='';return url.href;}
export async function rangedResponse(response,range){
  const blob=await response.blob(),size=blob.size,match=/^bytes=(\d*)-(\d*)$/.exec(range||'');
  const headers=new Headers(response.headers);headers.set('Accept-Ranges','bytes');headers.delete('Content-Encoding');
  let start,end;
  if(match&&(match[1]||match[2])){start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){headers.set('Content-Range',`bytes */${size}`);headers.set('Content-Length','0');return new Response(null,{status:416,headers});}
  headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));return new Response(blob.slice(start,end+1),{status:206,headers});
}
export function createOfflineCache({manifest,baseURL,cacheStorage=globalThis.caches,fetcher=globalThis.fetch,crypto=globalThis.crypto,concurrency=2,timeoutMs=35000,setTimeout=globalThis.setTimeout,clearTimeout=globalThis.clearTimeout}){
  const namespace=OFFLINE_PREFIX+encodeURIComponent(new URL(baseURL).pathname)+'-',name=namespace+manifest.version,files=manifest.files.map(file=>({...file,key:canonicalURL(file.path,baseURL)})),byKey=new Map(files.map(file=>[file.key,file]));
  const cachePromise=cacheStorage.open(name),subscribers=new Set();let downloadPromise=null;
  async function cached(file){
    const current=await cachePromise;let response=await current.match(file.key);
    if(response?.headers.get(HASH_HEADER)===file.sha256)return response;
    for(const oldName of await cacheStorage.keys())if(oldName.startsWith(namespace)&&oldName!==name){response=await(await cacheStorage.open(oldName)).match(file.key);if(response?.headers.get(HASH_HEADER)===file.sha256)return response;}
    return null;
  }
  async function store(file,response,onBytes=()=>{}){
    if(!response.ok||response.status!==200)throw Error('资源下载未完成');
    let bytes;
    if(response.body?.getReader){const reader=response.body.getReader(),chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);size+=value.byteLength;onBytes(size);}bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}}
    else{bytes=new Uint8Array(await response.arrayBuffer());onBytes(bytes.byteLength);}
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),hash=[...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==file.sha256)throw Error('资源版本校验未通过，请稍后重试');
    const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.set('Content-Length',String(bytes.byteLength));headers.set(HASH_HEADER,hash);
    await(await cachePromise).put(file.key,new Response(bytes,{status:200,headers}));
  }
  async function status(){let completedFiles=0,completedBytes=0;for(const file of files)if(await cached(file)){completedFiles++;completedBytes+=file.bytes;}return {version:manifest.version,totalFiles:files.length,totalBytes:manifest.totalBytes,completedFiles,completedBytes,ready:completedFiles===files.length};}
  async function fetchFile(file,onBytes=()=>{}){
    const controller=new AbortController();let idle=null;
    const ping=()=>{clearTimeout(idle);idle=setTimeout(()=>controller.abort(),timeoutMs);};ping();
    const total=setTimeout(()=>controller.abort(),Math.max(timeoutMs,Math.min(240000,15000+file.bytes/12000*1000)));
    try{const url=new URL(file.path,baseURL);url.searchParams.set('offline-version',manifest.version);await store(file,await fetcher(url.href,{cache:'reload',signal:controller.signal}),bytes=>{ping();onBytes(bytes);});}
    finally{clearTimeout(idle);clearTimeout(total);}
  }
  async function cacheShell(){for(const file of files.filter(file=>file.shell))if(!await cached(file))await fetchFile(file);}
  function download(onProgress=()=>{}){
    subscribers.add(onProgress);
    if(!downloadPromise)downloadPromise=(async()=>{
      const initial=await status();let completedFiles=initial.completedFiles,completedBytes=initial.completedBytes,index=0,failed=0,lastSent=0;const inflight=new Map();
      const send=(force=true)=>{const now=Date.now();if(!force&&now-lastSent<200)return;lastSent=now;const receivedBytes=Math.min(initial.totalBytes,completedBytes+[...inflight.values()].reduce((a,b)=>a+b,0));const state={...initial,completedFiles,completedBytes,receivedBytes,failed,ready:completedFiles===files.length};for(const listener of subscribers)try{listener(state);}catch{}};send();
      const missing=[];for(const file of files){const found=await cached(file);if(!found)missing.push(file);else await(await cachePromise).put(file.key,found);}
      await Promise.all(Array.from({length:Math.min(concurrency,missing.length)},async()=>{while(index<missing.length){const file=missing[index++];let ok=false;for(let attempt=0;attempt<2&&!ok;attempt++)try{inflight.set(file.path,0);send();await fetchFile(file,bytes=>{inflight.set(file.path,bytes);send(false);});ok=true;}catch{}inflight.delete(file.path);if(ok){completedFiles++;completedBytes+=file.bytes;}else failed++;send();}}));
      const final=await status();if(final.ready)for(const old of await cacheStorage.keys())if(old.startsWith(namespace)&&old!==name)await cacheStorage.delete(old);
      return {...final,failed};
    })().finally(()=>{downloadPromise=null;});
    return downloadPromise.finally(()=>subscribers.delete(onProgress));
  }
  async function respond(request,{waitUntil}={}){
    if(request.method&&request.method!=='GET')return fetcher(request);
    const key=canonicalURL(request,baseURL),file=byKey.get(key);
    if(!file)return fetcher(request);
    const found=await cached(file);if(found)return request.headers?.get('range')?rangedResponse(found,request.headers.get('range')):found;
    const response=await fetcher(request);
    if(response.status===200){const saving=store(file,response.clone()).catch(()=>{});if(waitUntil)waitUntil(saving);else await saving;}
    return response;
  }
  return {status,download,cacheShell,respond,name};
}
