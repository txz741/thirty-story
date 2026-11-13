// OFFLINE_RETIRED_v14: retire the previous offline edition without installing a new one.
const ROOT=new URL('./',self.location.href);
const PACKAGE_PREFIX='memory-story-offline-'+encodeURIComponent(ROOT.pathname)+'-';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  try{
    for(const name of await caches.keys()){
      if(name.startsWith(PACKAGE_PREFIX))await caches.delete(name);
      else if(name.startsWith('memory-story-manifest-v13-')){
        const requests=await(await caches.open(name)).keys();
        if(requests.length&&requests.every(request=>request.url===new URL('demo/offline-manifest.json',ROOT).href))await caches.delete(name);
      }
    }
  }catch{
    // A cache error must not leave the old worker registered.
  }
  await self.registration.unregister();
  await Promise.allSettled(windows.map(client=>{
    const url=new URL(client.url);
    if(url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
    url.searchParams.set('v','14');
    return client.navigate(url.href);
  }));
})()));
