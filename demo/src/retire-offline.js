// Update only a registration left by the withdrawn v13 offline edition.
// Ordinary online readers never register a service worker here.
export async function retireOfflineVersion({serviceWorker=globalThis.navigator?.serviceWorker,rootURL=new URL('../../',import.meta.url).href}={}){
  if(!serviceWorker?.getRegistrations)return;
  try{
    for(const registration of await serviceWorker.getRegistrations()){
      if(registration.scope===rootURL)await registration.update();
    }
  }catch{
    // Retirement must never interrupt the story or its audio.
  }
}
