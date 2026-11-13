import {createAudioSystem} from './audio-system.js';
import {SOUND_FILES} from './audio-config.js';
const audio=createAudioSystem(),$=id=>document.getElementById(id);let token=0,bgmUrl=null,message='请轻触按钮开启声音。';
audio.bindUnlock();void audio.prime();
const descriptions={discovery:'两枚柔和钟琴音，带一点金色闪光。','memory-enter':'轻柔纸页翻动与一缕风。','badge-fly':'掠过空气的细碎晶莹颗粒。','badge-collect':'温暖清脆、和谐上行的三音符。','finale-sparkle':'逐渐汇聚的钟琴与星光，柔和消散。'};
for(const [id,clip]of Object.entries(SOUND_FILES)){
  const card=document.createElement('section');card.className='sound';card.id='clip-'+id;
  card.innerHTML=`<span class="duration">约 ${clip.duration.toFixed(2)} 秒</span><h2>${clip.title}</h2><p>${descriptions[id]}</p><button type="button">试听 ${id}</button><a href="${clip.src}" download>下载 WAV</a>`;
  card.querySelector('button').addEventListener('click',()=>void playOne(id));$('sounds').append(card);
}
function display(){const state=audio.state;$('status').textContent=`${message}\n音频状态：${state.contextState} · 已解码 ${state.loaded}/${state.total} 个文件${state.sampleRate?' · '+state.sampleRate+' Hz':''}${state.error?'\n'+state.error:''}`;}
audio.subscribe(state=>{$('mute').textContent=state.muted?'开启全部声音':'静音全部';$('sfx-value').textContent=Math.round(state.sfxVolume*100)+'%';$('bgm-value').textContent=Math.round(state.bgmVolume*100)+'%';display();});
function clearActive(){for(const card of document.querySelectorAll('.sound'))card.classList.remove('active');}
async function ready(){const ok=await audio.unlock();if(!ok){message='声音尚未开启，请再次轻触“开启声音”。';display();return false;}if(audio.state.muted){message='当前已静音，请先开启全部声音。';display();return false;}return true;}
async function playOne(id){const current=++token;audio.stopEffects();clearActive();if(!await ready()||current!==token)return;const voice=audio.play(id,{group:'preview',replace:true});if(!voice){message='这段声音尚未准备好，请重试。';display();return;}$('clip-'+id).classList.add('active');message='正在试听：'+SOUND_FILES[id].title;display();await voice.ended;if(current===token){clearActive();message='试听完成。';display();}}
$('enable').addEventListener('click',async()=>{const ok=await audio.unlock();message=ok&&audio.state.loaded===5?'播放自检通过：声音已解锁，五个 WAV 已成功解码。':'尚未完全就绪，请稍后重试。';if(ok&&!audio.state.muted)audio.play('discovery',{group:'preview',replace:true});display();});
$('mute').addEventListener('click',()=>{void audio.unlock();audio.setMuted(!audio.state.muted);});
$('sfx-volume').addEventListener('input',()=>audio.setSfxVolume(Number($('sfx-volume').value)/100));
$('bgm-volume').addEventListener('input',()=>audio.setBgmVolume(Number($('bgm-volume').value)/100));
$('stop').addEventListener('click',()=>{token++;audio.stopEffects();clearActive();message='已停止试听。';display();});
$('play-all').addEventListener('click',async()=>{
  const current=++token;audio.stopEffects();clearActive();if(!await ready()||current!==token)return;
  for(const id of Object.keys(SOUND_FILES)){if(current!==token)return;const voice=audio.play(id,{group:'preview',replace:true});if(!voice)break;clearActive();$('clip-'+id).classList.add('active');message='正在试听：'+SOUND_FILES[id].title;display();await voice.ended;await new Promise(resolve=>setTimeout(resolve,350));}
  if(current===token){clearActive();message='五个音效试听完成。';display();}
});
$('bgm-file').addEventListener('change',()=>{const file=$('bgm-file').files?.[0];if(!file)return;audio.setBgmSource(null);if(bgmUrl)URL.revokeObjectURL(bgmUrl);bgmUrl=URL.createObjectURL(file);audio.setBgmSource(bgmUrl);void audio.unlock();message='本机音乐已接入，可比较独立音量与统一静音。';display();});
fetch('assets/audio/manifest.json').then(r=>r.json()).then(manifest=>{for(const clip of manifest.files){const label=$('clip-'+clip.id)?.querySelector('.duration');if(label)label.textContent=clip.duration.toFixed(2)+' 秒';}}).catch(()=>{});
