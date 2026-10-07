// Which music track a run plays: Daily Trial and Expedition have their own, a campaign
// stage plays its chapter's track (stage ids are "chapter-stage", e.g. "4-3"). Anything
// else, and any chapter without a track, falls back to the map's own track.
import musicData from "../../data/tdMusic.json" with { type: "json" };

/** @param {{ daily?: unknown, expedition?: unknown, stageId?: string | null, map?: { music?: string } }} run */
export function trackForRun({ daily, expedition, stageId, map }) {
  if (daily) return musicData.daily;
  if (expedition) return musicData.expedition;
  const chapter = stageId ? String(stageId).split("-")[0] : "";
  return /** @type {Record<string, string>} */ (musicData.chapters)[chapter] || map?.music || "";
}
