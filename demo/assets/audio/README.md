# 乘风去往回忆里 · 音效

五个音效均为本项目通过确定性代码原创合成，未使用外部音乐、录音或付费服务。本轮无需 ElevenLabs；纸页与风声使用经过滤波和包络整形的噪声纹理。钟琴使用柔和基音、少量泛音与短反射，避免硬质提示音。

| 文件 | 实际时长 | 触发位置 |
| --- | ---: | --- |
| discovery.wav | 0.72 秒 | 小路步行结束，发现回忆信标 |
| memory-enter.wav | 0.70 秒 | 进入回忆或选择加班分支 |
| badge-fly.wav | 1.02 秒 | 勋章静置闪光 3 秒后开始飞行 |
| badge-collect.wav | 0.84 秒 | 飞行动画完成，勋章到达包口 |
| finale-sparkle.wav | 2.50 秒 | 终章勋章飞出或汇聚，连续翻页时避免重叠 |

格式为双声道 44.1 kHz / 16 bit PCM WAV，总计约 1.02 MB。统一有效段 RMS 约 −24 dBFS，峰值保留余量；这不是 LUFS 响度测量。所有文件已做首尾淡入淡出、静音裁切，没有削波。精确参数见 [manifest.json](manifest.json)。音效中的空气与纸张纹理属于设计内容。

播放器使用 Web Audio API 解码短音效。音频上下文仅在真实触摸、点击或按键时创建或恢复，提前下载文件；尚未解锁或文件未准备好时跳过当次声音，避免稍后补播造成音画错位。减少动态效果模式下，飞行声音同步缩短至 0.22 秒。隐藏页面时暂停声音，回到页面后需再次触摸。

统一静音位于总输出端，音效和音乐各有独立增益；音效播放时音乐轻微降低，结束后平滑恢复。默认音效 55%、预留音乐 22%。主页面当前没有 BGM 文件；在 `src/audio-config.js` 设置 `AUDIO_DEFAULTS.bgmSrc`，或在代码中调用 `audio.setBgmSource(src)` 后即可接入。音乐采用循环媒体元素，经同一声音总线输出。

完整的 [试听与自检页](../../audio-preview.html?v=6) 提供逐个试听、连续试听、文件下载和本机音乐通道试验。显示“已解码 5/5”仅证明解锁和解码成功；是否能听到，以及具体设备音色，仍应由该手机实际试听确认。

源码位于项目 `tools/generate-story-audio.mjs`。可在 Node.js 中执行：

```js
const fs = await import('node:fs/promises');
const {generateStoryAudio} = await import('./tools/generate-story-audio.mjs');
await generateStoryAudio({fs, root: process.cwd()});
```

`tests/audio-assets.test.mjs` 检查格式、时长、音量、首尾和削波；`tests/audio-system.test.mjs` 检查移动端解锁策略、静音、双通道、后台暂停和加载失败降级；实际故事控制器回归检查两个完整路线及音效触发顺序。这些脚本测试不替代真实手机听感和浏览器测试。
