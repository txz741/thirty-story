export function mountAudioControls({document=globalThis.document,audio}){
  const launcher=document.getElementById('audio-toggle'),panel=document.getElementById('audio-panel'),mute=document.getElementById('audio-mute'),sfx=document.getElementById('audio-sfx-volume'),bgm=document.getElementById('audio-bgm-volume'),note=document.getElementById('audio-note');
  if(!launcher||!panel)return ()=>{};
  launcher.addEventListener('click',()=>{void audio.unlock();panel.hidden=!panel.hidden;launcher.setAttribute('aria-expanded',String(!panel.hidden));});
  mute.addEventListener('click',()=>{void audio.unlock();audio.setMuted(!audio.state.muted);});
  sfx.addEventListener('input',()=>audio.setSfxVolume(Number(sfx.value)/100));
  bgm.addEventListener('input',()=>audio.setBgmVolume(Number(bgm.value)/100));
  document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!event.target.closest?.('[data-audio-controls]')){panel.hidden=true;launcher.setAttribute('aria-expanded','false');}},{capture:true});
  return audio.subscribe(state=>{
    launcher.setAttribute('aria-label',state.muted?'声音已静音，打开声音设置':'打开声音设置');launcher.setAttribute('data-muted',String(state.muted));
    mute.textContent=state.muted?'开启全部声音':'静音全部声音';mute.setAttribute('aria-pressed',String(state.muted));
    sfx.value=String(Math.round(state.sfxVolume*100));bgm.value=String(Math.round(state.bgmVolume*100));bgm.disabled=!state.bgmAvailable;
    document.getElementById('audio-sfx-value').textContent=sfx.value+'%';document.getElementById('audio-bgm-value').textContent=bgm.value+'%';
    note.textContent=!state.supported?'此浏览器暂不支持声音，仍可继续翻阅。':state.error||(!state.ready?'轻触声音按钮开启声音。':!state.bgmAvailable?'当前播放音效，暂未添加背景音乐。':'音效与音乐共用静音开关。');
  });
}
