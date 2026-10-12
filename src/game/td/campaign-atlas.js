// Authored campaign-map presentation data. Progress and unlock rules stay in campaign.js.
export function campaignAtlasFor(atlases, chapter) {
  const atlas = atlases.find((entry) => Number(entry.chapterId) === Number(chapter.id));
  if (!atlas) throw new Error(`Missing campaign atlas for chapter ${chapter.id}`);
  if (atlas.stages.length !== chapter.stages.length) {
    throw new Error(`Campaign atlas chapter ${chapter.id} has ${atlas.stages.length} markers for ${chapter.stages.length} stages`);
  }
  atlas.stages.forEach((point, index) => {
    const stage = chapter.stages[index];
    if (point.id !== stage.id) throw new Error(`Campaign atlas chapter ${chapter.id} expected ${stage.id}, found ${point.id}`);
    if (![point.x, point.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
      throw new Error(`Campaign atlas stage ${point.id} has invalid coordinates`);
    }
  });
  return atlas;
}

export function atlasRoutePath(from, to) {
  const controlX = (from.x + to.x) / 2;
  const controlY = (from.y + to.y) / 2 + (to.bend ?? 0);
  return `M${from.x} ${from.y} Q${controlX} ${controlY} ${to.x} ${to.y}`;
}
