// Saved progress (localStorage td:v1) and the save code / save file export and import.
import type { PageContext } from "./context";
import { legacyRefund, repriceCredit, spentByCurrency, TREE } from "../favor.js";
import { sanitizeChallenges } from "../challenges.js";
import { dailyDate, sanitizeDaily } from "../daily.js";
import { newQuestRecord, sanitizeQuests } from "../quests.js";
import { sanitizeExpedition } from "../expedition.js";
import { newCampaignProgress, sanitizeCampaign } from "../campaign.js";
import campaignData from "../../../data/tdCampaign.json" with { type: "json" };

// Expedition (M21) in progress: stage order, current stage, roster, relics, veterans,
// lives carried over and the pending camp cards (expedition.js).
export type ExpeditionState = { seed: number; stages: string[]; stage: number; roster: string[]; relics: string[]; veterans: string[]; lives: number; camp: any[] | null };

// Campaign progress (M26, campaign.js): owned heroes, cleared stages with their best
// lives, the last squad, currencies, hero levels and the summon count; versioned on its own so it can
// migrate without touching Free Play.
export type CampaignProgress = { version: number; owned: string[]; cleared: Record<string, { clears: number; bestLives: number }>; lastSquad: string[]; currencies: Record<string, number>; levels: Record<string, number>; summons: number; copies?: Record<string, number>; skillLevels?: Record<string, Record<string, number>>; milestones?: Record<string, number[]>; heroic?: Record<string, { clears: number; bestLives: number }> };

// Daily Trial (M19) record per UTC day; bestDefeated counts enemies defeated.
export type DailyRecord = { date: string; bestDefeated: number; bestScore: number; goalReached: boolean };

// Daily Quests (R10) record per UTC day; tasks map task id to { done, claimed } and
// milestones lists the claimed chest thresholds (quests.js).
export type QuestRecord = { date: string; activity: number; tasks: Record<string, { done?: boolean; claimed?: boolean }>; milestones: number[] };

// `mutators`: Daily Trial mutators active in that run, kept with the record.
export type MapRun = { score: number; defeated: number; duration: number; lives: number; leaks: number; mutators?: string[] };

// Mode picked on the home screen's mode rail; Play launches it. A finished run sets it to
// that run's mode, so Play means "again" or "next".
export type HomeMode = "campaign" | "daily" | "expedition" | "free";
export const HOME_MODES: HomeMode[] = ["campaign", "daily", "expedition", "free"];
export const isHomeMode = (value: unknown): value is HomeMode => HOME_MODES.includes(value as HomeMode);

// Pending run-end shard (6C) for the next run; cleared when that run starts.
export type RunBoost = { type: "placement"; placement: number } | { type: "virtue"; virtue: string };

export type SaveData = {
  bestScore: number;
  bestDefeated: number; // most enemies defeated in one Free Play run (the legacy bestWave field is dropped on load)
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
  mapTop: Record<string, { score: number; defeated: number; mutators?: string[] }>;
  challenges: Record<string, Record<string, RunTier>>; // M20: challengeKey -> challenge id -> highest tier cleared (challenges.js)
  nextRunBoost: RunBoost | null;
  daily: DailyRecord[]; // Daily Trial records, newest first, last 7 days (daily.js)
  quests: QuestRecord; // Daily Quests record for the UTC day (quests.js)
  expedition: ExpeditionState | null; // Expedition in progress (M21)
  expeditionBest: { stages: number; completed: number }; // most stages cleared in one expedition, expeditions finished
  campaign: CampaignProgress; // Campaign (M26), its own progression
  ui: { homeMode: HomeMode }; // menu choices that follow the save (home screen mode rail)
};

// persist() returns false when the browser refused the write (storage full, blocked site data);
// onPersistError, set by the page, tells the player once so they can export their progress.
export type SaveStore = { data: SaveData; persist(): boolean; onPersistError?: () => void; onPersist?: () => void };

export type RunTier = "normal" | "heroic" | "mythic";
export const RUN_TIERS: RunTier[] = ["normal", "heroic", "mythic"];
export const isRunTier = (value: unknown): value is RunTier => RUN_TIERS.includes(value as RunTier);

// mapBests/mapTop key: Normal runs keep the plain map id (older saves), Heroic or Mythic append the tier
// ("moonlit-pass#heroic"). Keys of the removed run lengths ("moonlit-pass@long", "...@endless") are merged into
// these when a save loads (mergeLegacyRunKeys).
export const runKey = (mapId: string, tier: RunTier = "normal") => (tier === "normal" ? mapId : `${mapId}#${tier}`);

function parseTier(key: string): RunTier {
  const tier = key.split("#")[1];
  return isRunTier(tier) ? tier : "normal";
}

// Best score of a tier across all maps. bestScore stays the Normal record.
export function tierBest(save: SaveData, tier: RunTier = "normal"): number {
  const scores = Object.entries(save.mapTop).filter(([key]) => parseTier(key) === tier).map(([, top]) => top.score);
  return Math.max(tier === "normal" ? save.bestScore : 0, 0, ...scores);
}

// Saves from before October 5, 2026 keyed records by run length ("map@long#heroic"). The run lengths are gone: such
// records fold into the plain key, keeping the higher score, and `wave` (not comparable) becomes `defeated: 0`.
function mergeLegacyRunKeys<T extends { score: number }>(runs: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, run] of Object.entries(runs)) {
    const [base, tier] = key.split("#");
    const plain = tier ? `${base.split("@")[0]}#${tier}` : base.split("@")[0];
    const next = { ...run, defeated: Number(run.defeated) || 0 };
    delete next.wave;
    if (!out[plain] || next.score > out[plain].score) out[plain] = next;
  }
  return out;
}

// mapIds and relicIds check the Expedition state; without them it is not validated as strictly.
type SaveRules = { heroIds: Set<string>; mapIds?: Set<string>; relicIds?: Set<string> };

export const SAVE_KEY = "td:v1";
export const SAVE_CODE_PREFIX = "TD1:";
export const SAVE_FILE_VERSION = 1;

// Matches clearing Tower Defense site data in the browser without touching preferences
// used by the rest of the database site.
export function resetTdAccount(storage: Pick<Storage, "length" | "key" | "removeItem">) {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith("td:")) storage.removeItem(key);
  }
}

const isRecord = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
const hasScore = (run: unknown): run is { score: number } => isRecord(run) && Number.isFinite(run.score);
// Non-negative whole numbers keyed by id (node levels, Insight per class).
const pickCounts = (value: unknown): Record<string, number> => isRecord(value)
  ? Object.fromEntries(Object.entries(value).filter(([, n]) => Number.isFinite(n) && n > 0).map(([id, n]) => [id, Math.floor(n as number)]))
  : {};
const pickRuns = (value: unknown) => isRecord(value) ? Object.fromEntries(Object.entries(value).filter(([, run]) => hasScore(run))) : {};

export function emptySave(): SaveData {
  return { bestScore: 0, bestDefeated: 0, lastTeam: [], perfectDefense: false, favor: 0, favLevels: {}, insight: {}, resetSpent: 0, refundNotice: 0, treeVersion: TREE.version, repriceNotice: false, mapBests: {}, mapTop: {}, challenges: {}, nextRunBoost: null, daily: [], quests: newQuestRecord(dailyDate()), expedition: null, expeditionBest: { stages: 0, completed: 0 }, campaign: newCampaignProgress(campaignData) as CampaignProgress, ui: { homeMode: "campaign" } };
}

function sanitizeBoost(value: unknown): RunBoost | null {
  if (!isRecord(value)) return null;
  if (value.type === "placement" && Number.isFinite(value.placement) && value.placement > 0) return { type: "placement", placement: value.placement };
  if (value.type === "virtue" && typeof value.virtue === "string") return { type: "virtue", virtue: value.virtue };
  return null;
}

// Hero ids before October 1, 2026 were the database ids; saves from then load under the
// mythic ids (zeus -> odin, ...).
export const LEGACY_HERO_IDS: Record<string, string> = {
  nuwa: "atlas", prometheus: "ymir", momus: "heimdall", demeter: "gaia", poseidon: "aegir", amunra: "helios",
  set: "surtr", jormungandr: "fenrir", nyx: "nott", bastet: "hecate", horus: "vidar", anubis: "thanatos",
  zeus: "odin", phoenix: "hephaestus", fengyi: "boreas", diana: "skadi", artemis: "atalanta", medusa: "stheno",
  caishen: "plutus", yuelao: "harmonia", freya: "asclepius",
};
const heroId = (id: unknown) => (typeof id === "string" ? LEGACY_HERO_IDS[id] ?? id : id);
const heroList = (list: unknown) => (Array.isArray(list) ? list.map(heroId) : list);
const heroKeys = (obj: unknown) => (isRecord(obj) ? Object.fromEntries(Object.entries(obj).map(([id, v]) => [heroId(id), v])) : obj);

function renameLegacyHeroes(save: Record<string, any>): Record<string, any> {
  const campaign = isRecord(save.campaign) ? { ...save.campaign } : save.campaign;
  if (isRecord(campaign)) {
    for (const key of ["owned", "lastSquad"]) campaign[key] = heroList(campaign[key]);
    for (const key of ["levels", "copies", "stars", "evolution", "skillLevels"]) campaign[key] = heroKeys(campaign[key]);
  }
  const expedition = isRecord(save.expedition) ? { ...save.expedition } : save.expedition;
  if (isRecord(expedition)) {
    expedition.roster = heroList(expedition.roster);
    expedition.veterans = heroList(expedition.veterans);
    if (Array.isArray(expedition.camp)) expedition.camp = expedition.camp.map((card: any) => (!isRecord(card) ? card
      : card.type === "hero" ? { ...card, id: heroId(card.id) }
      : card.type === "veteran" ? { ...card, ids: heroList(card.ids) } : card));
  }
  // Blessing node ids carried the hero id too (zeus_dominion -> odin_dominion).
  const nodeId = (id: unknown) => (typeof id === "string" ? id.replace(/^([a-z]+)_/, (m, hero) => (LEGACY_HERO_IDS[hero] ? `${LEGACY_HERO_IDS[hero]}_` : m)) : id);
  const favLevels = isRecord(save.favLevels) ? Object.fromEntries(Object.entries(save.favLevels).map(([id, n]) => [nodeId(id), n])) : save.favLevels;
  const favTree = Array.isArray(save.favTree) ? save.favTree.map(nodeId) : save.favTree;
  return { ...save, lastTeam: heroList(save.lastTeam), campaign, expedition, favLevels, favTree };
}

// Shared by the localStorage load and the save-code import. Returns null when the data is not a td:v1 save.
export function sanitizeSave(raw: unknown, rules: SaveRules): SaveData | null {
  if (!isRecord(raw) || !Number.isFinite(raw.bestScore)) return null;
  const candidate = renameLegacyHeroes(raw);
  const clean: SaveData = {
    bestScore: candidate.bestScore,
    bestDefeated: Math.max(0, Math.floor(Number(candidate.bestDefeated) || 0)),
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
    mapBests: mergeLegacyRunKeys(pickRuns(candidate.mapBests)),
    mapTop: mergeLegacyRunKeys(pickRuns(candidate.mapTop)),
    challenges: sanitizeChallenges(candidate.challenges),
    nextRunBoost: sanitizeBoost(candidate.nextRunBoost),
    daily: sanitizeDaily(candidate.daily),
    quests: sanitizeQuests(candidate.quests, dailyDate()),
    expedition: sanitizeExpedition(candidate.expedition, { heroIds: rules.heroIds, mapIds: rules.mapIds ?? new Set(candidate.expedition?.stages ?? []), relicIds: rules.relicIds ?? new Set(candidate.expedition?.relics ?? []) }) as ExpeditionState | null,
    expeditionBest: {
      stages: Math.max(0, Math.floor(Number(candidate.expeditionBest?.stages) || 0)),
      completed: Math.max(0, Math.floor(Number(candidate.expeditionBest?.completed) || 0)),
    },
    campaign: sanitizeCampaign(candidate.campaign, campaignData, rules.heroIds) as CampaignProgress,
    ui: { homeMode: isHomeMode(candidate.ui?.homeMode) ? candidate.ui.homeMode : "campaign" },
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
    if (!clean.mapTop[id]) clean.mapTop[id] = { score: run.score, defeated: Number(run.defeated) || 0 };
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
  let warned = false; // one warning per run of failed writes
  const store: SaveStore = {
    data,
    persist() {
      let ok = true;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(store.data)); } catch { ok = false; }
      if (!ok && !warned) { warned = true; store.onPersistError?.(); }
      if (ok) warned = false;
      store.onPersist?.(); // the app bar wallet follows every change to the save
      // Ask once, only after there is progress, so the browser is less likely to evict it.
      if (!persistRequested) {
        persistRequested = true;
        navigator.storage?.persist?.().catch(() => {});
      }
      return ok;
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
    const saved = store.persist();
    ctx.actions.renderLobby();
    render();
    setStatus(saved ? "Save loaded." : "Save loaded for this visit, but this browser could not store it. It is lost when you close the page.", !saved);
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
