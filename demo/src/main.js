import {mountStorybook} from './journey.js';
import {createAudioSystem} from './audio-system.js';
import {mountAudioControls} from './audio-controls.js';
const audio=createAudioSystem();
audio.bindUnlock();void audio.prime();mountAudioControls({audio});
mountStorybook({audio});
