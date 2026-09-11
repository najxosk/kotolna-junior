import type { LevelScore, SaveData } from "./types";

const KEY = "kotolna-junior-v1";
const SAVE_VERSION = 1;

export const defaultSave = (): SaveData => ({
  version: SAVE_VERSION,
  playerName: "",
  unlockedLevel: 1,
  completed: {},
  soundOn: true,
});

function migrate(raw: SaveData): SaveData {
  const s = { ...defaultSave(), ...raw };
  s.version = SAVE_VERSION;
  s.completed = raw.completed ?? {};
  s.unlockedLevel = Math.max(1, Math.min(13, Number(s.unlockedLevel) || 1));
  s.playerName = typeof s.playerName === "string" ? s.playerName.slice(0, 32) : "";
  s.soundOn = s.soundOn !== false;
  return s;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (!parsed || typeof parsed !== "object") return defaultSave();
    return migrate(parsed);
  } catch {
    return defaultSave();
  }
}

export function writeSave(save: SaveData) {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(`${KEY}.bak`, prev);
    localStorage.setItem(KEY, JSON.stringify({ ...save, version: SAVE_VERSION }));
  } catch {
    /* súkromný režim / kvóta — hra ide ďalej v pamäti */
  }
}

export function recordWin(save: SaveData, levelId: number, score: LevelScore): SaveData {
  const key = String(levelId);
  const prev = save.completed[key];
  const best =
    !prev || score.total >= prev.total
      ? score
      : prev;
  const unlockedLevel = Math.max(save.unlockedLevel, Math.min(13, levelId + 1));
  return { ...save, completed: { ...save.completed, [key]: best }, unlockedLevel };
}

export function resetProgress(save: SaveData): SaveData {
  return { ...defaultSave(), playerName: save.playerName, soundOn: save.soundOn };
}
