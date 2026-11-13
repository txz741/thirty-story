import {createAudioSystem} from './audio-system.js';
import {createMusicManager} from './music-manager.js';
import {MUSIC_TRACKS} from './music-config.js';
const audio=createAudioSystem(),music=createMusicManager({audio}),$=id=>document.getElementById(id);let message='等待开始。';
audio.bindUnlock();void audio.prime();
const stateFor=stage=>({eventIndex:[0,0,4,7,9][stage],phase:stage===4?'finale':'roadIdle',panelIndex:0,badges:stage===4?['wings']:[]});
function draw(){const state=audio.state,bgm=state.bgm,track=MUSIC_TRACKS[music.state.stage-1];$('status').textContent=`${message}\n当前：${track?.title||'尚未启动'}\n播放进度：${(bgm.currentTime||0).toFixed(1)} 秒${bgm.duration?' / '+bgm.duration.toFixed(1)+' 秒':''}\n${bgm.loop?'循环播放':bgm.ended?'已经结束，保持静音':'单次播放'} · ${bgm.status}${state.muted?' · 已静音':''}${state.error?'\n'+state.error:''}`;$('mute').textContent=state.muted?'开启全部声音':'静音全部';$('bgm-value').textContent=Math.round(state.bgmVolume*100)+'%';$('sfx-value').textContent=Math.round(state.sfxVolume*100)+'%';}
for(const button of document.querySelectorAll('[data-stage]'))button.addEventListener('click',()=>{void audio.unlock();const stage=Number(button.dataset.stage),changed=music.update(stateFor(stage),{type:'ADVANCE'});message=changed?'已触发首次向前进入；等待新音乐就绪后交叉淡化。':'该阶段已访问，保持当前音乐与进度。';draw();});
$('back').addEventListener('click',()=>{music.update(stateFor(Math.max(1,music.state.stage-1)),{type:'BACK'});message='已模拟回看，音乐阶段与进度保持。';draw();});
$('repeat').addEventListener('click',()=>{if(music.state.stage)music.update(stateFor(music.state.stage),{type:'ADVANCE'});message='已模拟重复进入，不重新播放。';draw();});
$('mute').addEventListener('click',()=>{void audio.unlock();audio.setMuted(!audio.state.muted);draw();});
$('bgm').addEventListener('input',()=>audio.setBgmVolume(Number($('bgm').value)/100));$('sfx').addEventListener('input',()=>audio.setSfxVolume(Number($('sfx').value)/100));
$('effect').addEventListener('click',async()=>{await audio.unlock();audio.play('discovery');});
$('reset').addEventListener('click',()=>{music.update({phase:'cover'},{type:'RESET'});message='已重置试听，可重新开始。';draw();});
for(const track of MUSIC_TRACKS){const item=document.createElement('li'),link=document.createElement('a');link.href=track.src;link.textContent=decodeURIComponent(track.src.split('/').at(-1));item.append(link);$('files').append(item);}
audio.subscribe(draw);const monitor=setInterval(draw,500);window.addEventListener('pagehide',()=>{clearInterval(monitor);void audio.destroy();});
