import {mountStorybook} from './journey.js';
import {createAudioSystem} from './audio-system.js';
import {mountAudioControls} from './audio-controls.js';
import {createMusicManager} from './music-manager.js';
const audio=createAudioSystem();
const music=createMusicManager({audio});
audio.bindUnlock();void audio.prime();mountAudioControls({audio});
mountStorybook({audio,onStateChange:music.update});
