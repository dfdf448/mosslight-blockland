// 存档只接受明确字段，损坏或旧格式数据不会直接进入运行状态。
import { parseAdventure } from './adventures.js';
export const SAVE_KEY = 'mosslight-v1';
export const SETTINGS_KEY = 'mosslight-settings-v2';
const finite = (v, fallback, min, max) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
const ids = v => [...new Set(Array.isArray(v) ? v.filter(n => Number.isInteger(n) && n >= 0 && n < 3) : [])];
export function parseProgress(value) {
  if (!value || typeof value !== 'object' || ![1, 2, 3].includes(value.version)) return null;
  const collected = ids(value.collected), visited = [...new Set([...ids(value.visited), ...collected])];
  const p = value.puzzles && typeof value.puzzles === 'object' ? value.puzzles : {};
  const wind = Array.isArray(p.wind) && p.wind.length <= 3 && p.wind.every((n, i) => n === [0, 2, 1][i]) ? [...p.wind] : [];
  const moss = ids(p.moss);
  const stars = Array.isArray(p.stars) && p.stars.length === 3 ? p.stars.map(n => Number.isInteger(n) && n >= 0 && n < 4 ? n : 0) : [0, 0, 0];
  // 旧版已获得的晶核保留，同时将对应机关置为解开。
  if (collected.includes(0)) wind.splice(0, wind.length, 0, 2, 1);
  if (collected.includes(1)) moss.splice(0, moss.length, 0, 1, 2);
  if (collected.includes(2)) stars.splice(0, stars.length, 1, 2, 3);
  const pos = value.player && typeof value.player === 'object' ? value.player : {};
  return { version: 3, collected, visited, memories: ids(value.memories), won: value.won === true && collected.length === 3, adventure:parseAdventure(value.adventure),
    elapsed: finite(value.elapsed, 0, 0, 31536000), puzzles: { wind, moss, stars },
    player: { x: finite(pos.x, 0, -58, 58), z: finite(pos.z, 21, -58, 58), yaw: finite(pos.yaw, 0, -1e6, 1e6) } };
}
export function readProgress(storage) {
  try { return parseProgress(JSON.parse(storage.getItem(SAVE_KEY))); } catch { return null; }
}
export function readSettings(storage) {
  let v = {}; try { v = JSON.parse(storage.getItem(SETTINGS_KEY)) || {}; } catch {}
  return { sensitivity: finite(v.sensitivity, 1, .35, 2), fov: finite(v.fov, 65, 55, 90), volume: finite(v.volume, .55, 0, 1),
    quality: [1.3, 2.6, 3.8].includes(v.quality) ? v.quality : 2.6, motion: v.motion === true, sound: v.sound === true,
    viewMode: v.viewMode === 'first' ? 'first' : 'third', autoQuality: v.autoQuality !== false };
}
