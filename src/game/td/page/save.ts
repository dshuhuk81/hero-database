// Saved progress (localStorage td:v1) and the save code / save file export and import.
import type { PageContext } from "./context";
import { legacyRefund, repriceCredit, spentByCurrency, TREE } from "../favor.js";
import { sanitizeChallenges } from "../challenges.js";
import { sanitizeDaily } from "../daily.js";

// Daily Trial (M19) record per UTC day; bestWave counts waves cleared.
export type DailyRecord = { date: string; bestWave: number; bestScore: number; goalReached: boolean };

// `mutators`: endless mutators (M15) chosen in that run, kept with the record.
export type MapRun = { score: number; wave: number; duration: number; lives: number; leaks: number; mutators?: string[] };

// Pending run-end shard (6C) for the next run; cleared when that run's first wave starts.
export type RunBoost = { type: "gold"; gold: number } | { type: "virtue"; virtue: string };

export type SaveData = {
  bestScore: number;
  bestWave: number;
  lastTeam: string[];
  perfectDefense: boolean;
  favor: number; // Favor earned in total; available = favor - spent on blessings - resetSpent
  favLevels: Record<string, number>; // Divine Blessings node levels (blessingTree.json)
  insight: Record<string, number>; // Insight earned in total per hero class
  resetSpent: number; // Favor paid for blessing resets
  refundNotice: number; // Favor refunded from the first tree, shown once in the Blessings panel
  treeVersion: number; // blessingTree.json version the prices were last settled with
  repriceNotice: boolean; // tree v3 price change and Surge -> Infusion, shown once
  mapBests: Record<string, MapRun>;
  mapTop: Record<string, { score: number; wave: number; mutators?: string[] }>;
  challenges: Record<string, Record<string, RunTier>>; // M20: challengeKey -> challenge id -> highest tier cleared (challenges.js)
  nextRunBoost: RunBoost | null;
  daily: DailyRecord[]; // Daily Trial records, newest first, last 7 days (daily.js)
};

export type SaveStore = { data: SaveData; persist(): void };

export type RunMode = "classic" | "long" | "endless";
export type RunTier = "normal" | "heroic" | "mythic";
export const RUN_TIERS: RunTier[] = ["normal", "heroic", "mythic"];
export const isRunTier = (value: unknown): value is RunTier => RUN_TIERS.includes(value as RunTier);
// Endless has its own ramp and always runs at Normal (sim.js).
export const tierFor = (mode: RunMode, tier: RunTier): RunTier => (mode === "endless" ? "normal" : tier);

// mapBests/mapTop key: classic runs keep the plain map id (older saves), other modes
// append the mode ("moonlit-pass@long"), and Heroic or Mythic append the tier
// ("moonlit-pass#heroic", "moonlit-pass@long#mythic"), so td:v1 stays readable by older builds.
export const runKey = (mapId: string, mode: RunMode, tier: RunTier = "normal") => {
  const base = mode === "classic" ? mapId : `${mapId}@${mode}`;
  const t = tierFor(mode, tier);
  return t === "normal" ? base : `${base}#${t}`;
};

function parseKey(key: string) {
  const [base, tier = "normal"] = key.split("#");
  const [, mode = "classic"] = base.split("@");
  return { mode, tier };
}

// Best score in a mode (and tier) across all maps. bestScore stays the classic Normal record.
export function modeBest(save: SaveData, mode: RunMode, tier: RunTier = "normal"): number {
  const t = tierFor(mode, tier);
  const scores = Object.entries(save.mapTop).filter(([key]) => { const k = parseKey(key); return k.mode === mode && k.tier === t; }).map(([, top]) => top.score);
  return Math.max(mode === "classic" && t === "normal" ? save.bestScore : 0, 0, ...scores);
}

type SaveRules = { heroIds: Set<string> };

export const SAVE_KEY = "td:v1";
export const SAVE_CODE_PREFIX = "TD1:";
export const SAVE_FILE_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
const hasScore = (run: unknown): run is { score: number } => isRecord(run) && Number.isFinite(run.score);
// Non-negative whole numbers keyed by id (node levels, Insight per class).
const pickCounts = (value: unknown): Record<string, number> => isRecord(value)
  ? Object.fromEntries(Object.entries(value).filter(([, n]) => Number.isFinite(n) && n > 0).map(([id, n]) => [id, Math.floor(n as number)]))
  : {};
const pickRuns = (value: unknown) => isRecord(value) ? Object.fromEntries(Object.entries(value).filter(([, run]) => hasScore(run))) : {};

export function emptySave(): SaveData {
  return { bestScore: 0, bestWave: 0, lastTeam: [], perfectDefense: false, favor: 0, favLevels: {}, insight: {}, resetSpent: 0, refundNotice: 0, treeVersion: TREE.version, repriceNotice: false, mapBests: {}, mapTop: {}, challenges: {}, nextRunBoost: null, daily: [] };
}

function sanitizeBoost(value: unknown): RunBoost | null {
  if (!isRecord(value)) return null;
  if (value.type === "gold" && Number.isFinite(value.gold) && value.gold > 0) return { type: "gold", gold: value.gold };
  if (value.type === "virtue" && typeof value.virtue === "string") return { type: "virtue", virtue: value.virtue };
  return null;
}

// Shared by the localStorage load and the save-code import. Returns null when the data is not a td:v1 save.
export function sanitizeSave(candidate: unknown, rules: SaveRules): SaveData | null {
  if (!isRecord(candidate) || !Number.isFinite(candidate.bestScore)) return null;
  const clean: SaveData = {
    bestScore: candidate.bestScore,
    bestWave: Number(candidate.bestWave) || 0,
    lastTeam: Array.isArray(candidate.lastTeam) ? [...new Set<string>(candidate.lastTeam)].filter((id) => rules.heroIds.has(id)) : [],
    perfectDefense: !!candidate.perfectDefense,
    favor: Number(candidate.favor) || 0,
    favLevels: pickCounts(candidate.favLevels),
    insight: pickCounts(candidate.insight),
    resetSpent: Math.max(0, Number(candidate.resetSpent) || 0),
    // The first tree (favTree: bought node ids) was replaced; its Favor is refunded once.
    refundNotice: Array.isArray(candidate.favTree) && !isRecord(candidate.favLevels)
      ? legacyRefund(candidate.favTree.filter((id: unknown) => typeof id === "string"))
      : Math.max(0, Number(candidate.refundNotice) || 0),
    treeVersion: Number(candidate.treeVersion) || 2,
    repriceNotice: !!candidate.repriceNotice,
    mapBests: pickRuns(candidate.mapBests),
    mapTop: pickRuns(candidate.mapTop),
    challenges: sanitizeChallenges(candidate.challenges),
    nextRunBoost: sanitizeBoost(candidate.nextRunBoost),
    daily: sanitizeDaily(candidate.daily),
  };
  // Tree v3 (M3): owned levels stay, the price increase is credited back once.
  if (clean.treeVersion < 3) {
    const credit = repriceCredit(clean.favLevels) as Record<string, number>;
    clean.favor += credit.favor || 0;
    for (const [cls, points] of Object.entries(credit)) if (cls !== "favor") clean.insight[cls] = (clean.insight[cls] || 0) + points;
    const hadSurge = Object.keys(clean.favLevels).some((id) => /^(tank|warrior|assassin|mage|archer|support)_surge$/.test(id));
    clean.repriceNotice = hadSurge || Object.keys(clean.favLevels).length > 0;
    clean.treeVersion = TREE.version;
  }
  // Older saves only kept the last run per map; it is a lower bound for the record.
  for (const [id, run] of Object.entries(clean.mapBests)) {
    if (!clean.mapTop[id]) clean.mapTop[id] = { score: run.score, wave: Number(run.wave) || 0 };
  }
  return clean;
}

const toBase64 = (text: string) => {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const fromBase64 = (code: string) => new TextDecoder().decode(Uint8Array.from(atob(code), (char) => char.charCodeAt(0)));

export function encodeSaveCode(save: SaveData) {
  return SAVE_CODE_PREFIX + toBase64(JSON.stringify(save));
}

export function saveFileText(save: SaveData) {
  return JSON.stringify({ version: SAVE_FILE_VERSION, save }, null, 2);
}

// Accepts a TD1 code or the contents of a downloaded save file.
export function parseSaveText(text: string, rules: SaveRules): SaveData | null {
  const trimmed = text.trim();
  try {
    if (trimmed.startsWith(SAVE_CODE_PREFIX)) return sanitizeSave(JSON.parse(fromBase64(trimmed.slice(SAVE_CODE_PREFIX.length).replace(/\s+/g, ""))), rules);
    const file = JSON.parse(trimmed);
    if (isRecord(file) && file.version === SAVE_FILE_VERSION) return sanitizeSave(file.save, rules);
  } catch {}
  return null;
}

export function createSaveStore(rules: SaveRules): SaveStore {
  let data = emptySave();
  try {
    data = sanitizeSave(JSON.parse(localStorage.getItem(SAVE_KEY) || "null"), rules) ?? data;
  } catch {}
  let persistRequested = false;
  const store: SaveStore = {
    data,
    persist() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(store.data)); } catch {}
      // Ask once, only after there is progress, so the browser is less likely to evict it.
      if (!persistRequested) {
        persistRequested = true;
        navigator.storage?.persist?.().catch(() => {});
      }
    },
  };
  return store;
}

// Save panel: export (code, file) and import (code, file). Import replaces td:v1.
export function createSavePanel(ctx: PageContext) {
  const { q, store } = ctx;
  const rules = { heroIds: new Set(ctx.heroById.keys()) };
  const exportEl = q<HTMLTextAreaElement>("[data-td-save-export]");
  const importEl = q<HTMLTextAreaElement>("[data-td-save-import]");
  const fileInput = q<HTMLInputElement>("[data-td-save-file-input]");
  const statusEl = q("[data-td-save-status]");

  function setStatus(message: string, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", isError);
  }

  function render() {
    exportEl.value = encodeSaveCode(store.data);
    importEl.value = "";
    setStatus("");
  }

  function importSave(text: string) {
    if (!text.trim()) { setStatus("Paste a save code first.", true); return; }
    const incoming = parseSaveText(text, rules);
    if (!incoming) { setStatus("This is not a valid save code. Your progress was not changed.", true); return; }
    const summary = (entry: SaveData) => `best ${entry.bestScore.toLocaleString()}, ${entry.favor.toLocaleString()} Favor earned`;
    if (!confirm(`Replace your progress on this device?\n\nCurrent: ${summary(store.data)}\nImported: ${summary(incoming)}`)) {
      setStatus("Import cancelled. Your progress was not changed.");
      return;
    }
    store.data = incoming;
    store.persist();
    ctx.actions.renderLobby();
    render();
    setStatus("Save loaded.");
  }

  q("[data-td-save-copy]").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(exportEl.value);
      setStatus("Code copied.");
    } catch {
      exportEl.select();
      setStatus("Copy failed. The code is selected - copy it manually.", true);
    }
  });
  q("[data-td-save-download]").addEventListener("click", () => {
    const blob = new Blob([saveFileText(store.data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "motto-td-save.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus("Save file downloaded.");
  });
  q("[data-td-save-load]").addEventListener("click", () => { importSave(importEl.value); });
  q("[data-td-save-file]").addEventListener("click", () => { fileInput.click(); });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = ""; // the same file can be picked again
    if (!file) return;
    try { importSave(await file.text()); } catch { setStatus("Could not read that file.", true); }
  });

  return { render };
}

// Favor earned minus blessing levels bought and resets paid.
export function availableFavor(save: SaveData) {
  return (save.favor || 0) - (spentByCurrency(save.favLevels).favor || 0) - (save.resetSpent || 0);
}

// Insight of one class earned minus what its branch cost.
export function availableInsight(save: SaveData, cls: string) {
  return (save.insight?.[cls] || 0) - ((spentByCurrency(save.favLevels) as Record<string, number>)[cls] || 0);
}
