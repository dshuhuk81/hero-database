// Free Play plays a map's own timeline, or the timeline of the campaign stage built on that map.
export function timelineForMap(map, campaign) {
  if (map?.timeline?.length) return map.timeline;
  const stage = campaign.chapters.flatMap((chapter) => chapter.stages).find((entry) => entry.mapId === map?.id);
  if (stage?.timeline?.length) return stage.timeline;
  throw new Error(`Map ${map?.id} has no timeline`);
}
