import {initialState,restoreState} from './journey-state.js';
export const STORAGE_KEY='her-days:journey:progress:v2';
export function loadProgress(storage){try{return restoreState(JSON.parse(storage.getItem(STORAGE_KEY)));}catch{return initialState();}}
export function saveProgress(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
