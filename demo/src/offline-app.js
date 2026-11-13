export function mountOfflineApp({document=globalThis.document,window=globalThis.window,navigator=globalThis.navigator,MessageChannel=globalThis.MessageChannel}={}){
  const $=id=>document.getElementById(id),panel=$('offline-panel'),download=$('offline-download'),install=$('offline-install'),status=$('offline-status'),progress=$('offline-progress');
  let worker=null,prompt=null,busy=false,complete=false,registration=null,installed=false;const pending=new Set();
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1,inApp=/MicroMessenger/i.test(navigator.userAgent);
  const standalone=()=>!!(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone);
  function paint(state){complete=!!state.ready;const percent=state.totalBytes?Math.round((state.receivedBytes??state.completedBytes)/state.totalBytes*100):0;progress.value=percent;progress.hidden=false;status.textContent=complete?'完整绘本已保存，可断网翻阅。清除网站数据会删除离线内容。':`下载进度 ${percent}%（${((state.receivedBytes??state.completedBytes)/1e6).toFixed(1)} / ${(state.totalBytes/1e6).toFixed(1)} MB）${state.failed?'，部分未完成，可继续下载。':'，下载期间请保持此页在前台。'}`;download.textContent=complete?'检查离线内容':'下载／继续完整绘本';install.disabled=installed||standalone();if(standalone())install.textContent='已在独立应用中打开';}
  function message(type,onProgress=()=>{}){return new Promise((resolve,reject)=>{const channel=new MessageChannel();let timer;const cancel=()=>finish(Error('连接暂时中断，已下载内容保留，可继续下载。'));const finish=(error,state)=>{clearTimeout(timer);channel.port1.close();pending.delete(cancel);error?reject(error):resolve(state);};const watch=()=>{clearTimeout(timer);timer=setTimeout(cancel,45000);};pending.add(cancel);watch();channel.port1.onmessage=event=>{watch();if(event.data.type==='progress')onProgress(event.data.state);else finish(event.data.type==='error'?Error(event.data.message):null,event.data.state);};try{worker.postMessage({type},[channel.port2]);}catch{cancel();}});}
  $('offline-toggle').addEventListener('click',()=>{panel.hidden=!panel.hidden;$('offline-toggle').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden&&worker&&!busy)void message('OFFLINE_STATUS').then(paint).catch(()=>{});});
  $('offline-close').addEventListener('click',()=>{panel.hidden=true;$('offline-toggle').setAttribute('aria-expanded','false');});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;install.textContent='安装到手机主屏幕';});
  window.addEventListener('appinstalled',()=>{installed=true;prompt=null;install.disabled=true;install.textContent='已添加到主屏幕';});
  install.addEventListener('click',async()=>{if(prompt){const currentPrompt=prompt;prompt=null;await currentPrompt.prompt();await currentPrompt.userChoice;}else $('offline-help').textContent=ios?'iPhone：在 Safari 点“分享”，选择“添加到主屏幕”，再确认添加。':'在浏览器菜单选择“安装应用”或“添加到主屏幕”。若没有此项，可继续在浏览器离线翻阅。';});
  download.addEventListener('click',async()=>{if(busy)return;if(!worker){void prepare();return;}busy=true;download.disabled=true;try{paint(await message(complete?'OFFLINE_STATUS':'OFFLINE_DOWNLOAD',paint));}catch(error){status.textContent=error.message;}finally{busy=false;download.disabled=false;}});
  if(inApp){status.textContent='请先通过右上角菜单，在 Safari 或系统浏览器打开，再下载离线绘本并添加到主屏幕。';download.disabled=true;return;}
  if(!navigator.serviceWorker){status.textContent='当前浏览器暂不支持离线保存，可继续在线翻阅；建议用 Safari 或 Chrome 打开。';download.disabled=true;return;}
  install.textContent=ios?'添加到主屏幕':'安装到手机主屏幕';install.disabled=standalone();
  $('offline-help').textContent=ios?'建议先在 Safari 通过“分享 → 添加到主屏幕”，再从桌面图标打开并下载完整绘本，避免重复下载。':'安装需要你主动确认。添加到主屏幕后，从图标打开并下载完整绘本即可离线翻阅。';
  navigator.serviceWorker.addEventListener('controllerchange',()=>{for(const cancel of [...pending])cancel();worker=navigator.serviceWorker.controller||registration?.active;if(worker)void message('OFFLINE_STATUS').then(paint).catch(()=>{});});
  async function prepare(){
    download.disabled=true;status.textContent='正在准备离线功能…';let timer;
    try{registration=await navigator.serviceWorker.register('../sw.js',{scope:'../',type:'module',updateViaCache:'none'});const ready=await Promise.race([navigator.serviceWorker.ready,new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),45000);})]);worker=navigator.serviceWorker.controller||ready.active;download.disabled=false;paint(await message('OFFLINE_STATUS'));}
    catch{status.textContent='离线功能暂未准备好，请保持联网后重试；在线绘本仍可使用。';download.disabled=false;download.textContent='重试离线准备';}
    finally{clearTimeout(timer);}
  }
  void prepare();
}
