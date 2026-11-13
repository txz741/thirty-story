import {createOfflineCache} from './demo/src/offline-cache.js?v=13';
const RELEASE='v13-e3e9991ec24f';
const ROOT=new URL('./',self.location.href),META='memory-story-manifest-'+RELEASE;
let enginePromise=null;
function engine(){
  if(!enginePromise)enginePromise=(async()=>{
    const url=new URL('demo/offline-manifest.json',ROOT),cache=await caches.open(META);let response=await cache.match(url.href);
    if(!response){url.searchParams.set('release',RELEASE);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{response=await fetch(url,{cache:'reload',signal:controller.signal});}finally{clearTimeout(timer);}if(!response.ok)throw Error('离线版本尚未就绪');const data=await response.clone().json();if(data.version!==RELEASE)throw Error('离线版本正在更新');url.search='';await cache.put(url.href,response.clone());}
    const manifest=await response.json();return createOfflineCache({manifest,baseURL:ROOT.href});
  })().catch(error=>{enginePromise=null;throw error;});
  return enginePromise;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{await engine();await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  event.respondWith(engine().then(cache=>cache.respond(event.request,{waitUntil:promise=>event.waitUntil(promise)})));
});
self.addEventListener('message',event=>{
  if(!['OFFLINE_STATUS','OFFLINE_DOWNLOAD'].includes(event.data?.type))return;
  const port=event.ports[0];if(!port)return;const send=data=>{try{port.postMessage(data);}catch{}};
  event.waitUntil((async()=>{try{const cache=await engine();if(event.data.type==='OFFLINE_DOWNLOAD'){const state=await cache.download(progress=>send({type:'progress',state:progress}));send({type:'done',state});}else send({type:'done',state:await cache.status()});}catch{send({type:'error',message:'暂未完成保存，请保持联网并重试。'});}})());
});
