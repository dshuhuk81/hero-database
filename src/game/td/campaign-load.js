import { TowerDefenseGame } from "./sim.js";

const finite = (value) => Number.isFinite(value) ? value : 0;
const stable = (value) => Math.round(finite(value) * 1e6) / 1e6;
const chapterOf = (stage) => String(stage.chapter ?? String(stage.id ?? "").split("-")[0] ?? "");
const boardLabel = (map) => map?.grid?.board ? `${map.grid.board.cols}x${map.grid.board.rows}` : "classic";
const gateCount = (map) => Math.max(1, map?.lanes?.length ?? 1);

function emptyRow(stage, map, diagnostics = []) {
  return {
    stageId: stage?.id ?? "",
    stageName: stage?.name ?? "",
    chapter: chapterOf(stage ?? {}),
    mapId: stage?.mapId ?? map?.id ?? "",
    theme: map?.theme ?? "",
    board: boardLabel(map),
    gates: gateCount(map),
    spawnGroups: 0,
    enemyCount: 0,
    enemyTypes: 0,
    firstSpawnMs: 0,
    lastSpawnMs: 0,
    spawnWindowMs: 0,
    enemiesPerSecond: 0,
    totalHp: 0,
    totalAtk: 0,
    avgArmor: 0,
    avgMres: 0,
    maxHp: 0,
    maxAtk: 0,
    hpLoad: 0,
    atkLoad: 0,
    compositeLoad: 0,
    hpScale: finite(stage?.hpScale ?? 1),
    lives: finite(stage?.lives),
    hasBoss: false,
    summonedKinds: [],
    diagnostics,
  };
}

export function stageLoad({ stage, map, tuning }) {
  const diagnostics = [];
  if (!stage) return emptyRow(null, map, ["missing stage"]);
  if (!map) return emptyRow(stage, null, [`missing map: ${stage.mapId}`]);
  const effectiveMap = stage.boss ? { ...map, boss: stage.boss } : map;
  const row = emptyRow(stage, effectiveMap, diagnostics);
  const kinds = new Set();
  const summonedKinds = new Set();
  let armorSum = 0;
  let mresSum = 0;

  row.spawnGroups = (stage.timeline ?? []).length;
  const game = new TowerDefenseGame({
    heroes: [],
    tuning,
    map: effectiveMap,
    timeline: stage.timeline ?? [],
    tier: "normal",
    seed: 1,
    lives: stage.lives,
    hpScale: stage.hpScale ?? 1,
    atkScale: stage.atkScale ?? 1,
  });
  if (!game.start()) {
    diagnostics.push("could not build the spawn queue");
    return row;
  }
  const queue = [...game.spawnQueue];
  for (const entry of queue) {
    if (!tuning?.enemies?.[entry.kind]) {
      diagnostics.push(`missing enemy kind ${entry.kind}`);
      continue;
    }
    const enemy = game.spawnEnemy(entry.kind, { statScale: entry.scale ?? 1, lane: entry.lane ?? 0, sway: entry.sway ?? 0 });
    kinds.add(entry.kind);
    row.enemyCount += 1;
    row.totalHp += finite(enemy.maxHp);
    row.totalAtk += finite(enemy.attack);
    armorSum += finite(enemy.armor);
    mresSum += finite(enemy.magicRes);
    row.maxHp = Math.max(row.maxHp, finite(enemy.maxHp));
    row.maxAtk = Math.max(row.maxAtk, finite(enemy.attack));
    if (entry.kind === "boss") {
      row.hasBoss = true;
      const childKind = game.bossTuning?.summon?.kind;
      if (childKind) summonedKinds.add(childKind);
    }
    const summonedKind = tuning.enemies[entry.kind]?.summon?.kind;
    if (summonedKind) summonedKinds.add(summonedKind);
  }

  const first = queue.length ? Math.min(...queue.map((entry) => entry.at)) : 0;
  const last = queue.length ? Math.max(...queue.map((entry) => entry.at)) : 0;
  row.enemyTypes = kinds.size;
  row.firstSpawnMs = Math.round(first * 1000);
  row.lastSpawnMs = Math.round(last * 1000);
  row.spawnWindowMs = Math.round((last - first) * 1000);
  row.enemiesPerSecond = stable(row.spawnWindowMs > 0 ? row.enemyCount / (row.spawnWindowMs / 1000) : row.enemyCount);
  row.totalHp = stable(row.totalHp);
  row.totalAtk = stable(row.totalAtk);
  row.avgArmor = stable(row.enemyCount ? armorSum / row.enemyCount : 0);
  row.avgMres = stable(row.enemyCount ? mresSum / row.enemyCount : 0);
  row.maxHp = stable(row.maxHp);
  row.maxAtk = stable(row.maxAtk);
  row.summonedKinds = [...summonedKinds].sort();
  return row;
}

export function campaignLoadRows({ campaign, maps, tuning }) {
  const mapById = new Map((maps ?? []).map((map) => [map.id, map]));
  const rows = (campaign?.chapters ?? []).flatMap((chapter) => (chapter.stages ?? []).map((stage) => {
    const normalizedStage = { ...stage, chapter: chapter.id };
    return stageLoad({ stage: normalizedStage, map: mapById.get(stage.mapId), tuning });
  }));
  const baseline = rows[0] ?? emptyRow(null, null);
  const baseHp = baseline.totalHp;
  const baseAtk = baseline.totalAtk;
  return rows.map((row) => {
    const hpLoad = baseHp > 0 ? row.totalHp / baseHp : 0;
    const atkLoad = baseAtk > 0 ? row.totalAtk / baseAtk : 0;
    return { ...row, hpLoad: stable(hpLoad), atkLoad: stable(atkLoad), compositeLoad: stable(Math.sqrt(hpLoad * atkLoad)) };
  });
}
