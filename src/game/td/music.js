// Which music track a run plays: Daily Trial and Expedition have their own, a campaign
// stage plays its chapter's track (stage ids are "chapter-stage", e.g. "4-3"). Anything
// else, and any chapter without a track, falls back to the map's own track.
import musicData from "../../data/tdMusic.json" with { type: "json" };

/** Track for every menu screen (home, lobby, stage list, ...). */
export function trackForMenu() {
  return musicData.menu || "";
}

/** @param {{ daily?: unknown, expedition?: unknown, god?: unknown, stageId?: string | null, map?: { music?: string } }} run */
export function trackForRun({ daily, expedition, god, stageId, map }) {
  if (daily) return musicData.daily;
  if (god) return /** @type {Record<string, string>} */ (musicData).god || musicData.daily; // no track of its own yet
  if (expedition) return musicData.expedition;
  const chapter = stageId ? String(stageId).split("-")[0] : "";
  return /** @type {Record<string, string>} */ (musicData.chapters)[chapter] || map?.music || "";
}
