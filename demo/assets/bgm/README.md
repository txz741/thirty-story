# 四阶段背景音乐

四首 MP3 从用户的 `material/bgm/` 原样复制到本目录，没有重新生成、转码、裁剪或修改。均为 MPEG-1 Layer III、48 kHz、双声道、可变码率。时长为帧扫描近似值，实际播放使用浏览器读取的时长；原始路径与 SHA-256 见 `manifest.json`。

| 原始文件（material/bgm/） | 发布文件（demo/assets/bgm/） | 约时长 | 阶段 |
| --- | --- | --- | --- |
| 1Everyday Adventures.mp3 | 1Everyday Adventures.mp3 | 1:50 | 主路开始，事件 1–4，循环 |
| 2Autumn Afternoon.mp3 | 2Autumn Afternoon.mp3 | 1:30 | 首次进入第五事件，事件 5–7，循环 |
| 3Soft Welcome.mp3 | 3Soft Welcome.mp3 | 1:50 | 首次进入第八事件，包含 IF 与事件 9、10，循环 |
| 4Un Voyage Lumineux.mp3 | 4Un Voyage Lumineux.mp3 | 0:55 | 终章第一幕乘风之翼出现，单次播放 |

独立 `src/music-manager.js` 观察已完成的故事状态提交，只接受首次向前推进。主路首次出现、事件索引首次到 4 和 7、终章第一幕获得 wings，分别升级四个阶段。回看、选择 IF、立绘切换或重复访问不调用切歌。音乐不存储到本地，每次刷新从封面开始。

`src/bgm-player.js` 缓存四个媒体元素和四个独立增益节点，音频流接入现有 BGM 总线、音效压低总线及统一静音总线。新文件实际播放后才交叉淡化；使用互补的余弦曲线，旧新曲不会同时处于完整音量。切换中暂停会保存播放位置和淡化剩余时间。加载失败不阻塞故事，保留仍在播放的旧曲；真实触摸可重试。

前三首使用原生循环。终章不循环，在原曲最后 2.5 秒平滑淡出，不剪短原文件；到自然结束后锁定已结束状态，回看、重复进入、静音开关或前后台恢复都不重新启动。只有刷新或明确重置整次体验才清除该状态。

配置：`src/music-config.js` 中 `MUSIC_SETTINGS.crossfadeSeconds` 控制各阶段交叉淡化，`finaleFadeSeconds` 控制终章末尾淡出，默认均为 2.5 秒。`MUSIC_TRACKS` 修改对应文件和循环设置。默认 BGM 音量为 `src/audio-config.js` 的 `AUDIO_DEFAULTS.bgmVolume`（0.22），音效为 `sfxVolume`（0.55）；页面滑杆实时调整，静音开关同时作用于两者。

移动端首次有效触摸时在手势调用栈内解锁 AudioContext 和缓存的媒体元素，避免后续定时切歌失去授权。切后台暂停，回前台尝试恢复；若系统或浏览器阻止自动恢复，页面提示轻触声音按钮。兼容 WebKit 前缀；缺少 cancelAndHoldAtTime 时清理旧自动化并从计算出的当前音量继续，避免曲线重叠。浏览器策略仍须在具体手机上试听确认。

[四阶段音乐试听页](../../music-preview.html?v=10) 可模拟前进、回看和重复进入，检查时间是否连续，测试统一静音、独立音量与终章自然结束。该页只影响自己的试听会话。
