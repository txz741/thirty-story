import { initialState, restoreState } from './state-machine.js';
export const STORAGE_KEY='her-days:m1:progress:v1';
export function loadProgress(storage) {
  try { return restoreState(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return initialState(); }
}
export function saveProgress(storage,state) {
  try { storage.setItem(STORAGE_KEY,JSON.stringify(state));return true; } catch { return false; }
}
