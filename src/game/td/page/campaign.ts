// Campaign (M26) on the page: the Stages screen (chapter tabs, stages with lock and clear
// state and their rewards, opened from the home screen's Play), the Squad screen (pick up to squadSize owned heroes),
// the Heroes screen (level heroes with Gold and Hero XP), the Summon screen (Divine Seals
// buy one or ten heroes not owned yet; the reveal stage is ./summon-reveal.ts) and recording a finished stage for the result screen. Rules
// live in ../campaign.js, stage data in src/data/tdCampaign.json, the banner in
// src/data/tdSummon.json.
import { mapSceneFor } from "../map-scene.js";
import { shownLives } from "../board.js";
import { environmentFor } from "../environments.js";
import { mapPreviewModel, routePreviewPoints } from "../map-preview.js";
import { CLASS_PASSIVE_SKILLS, SKILL_TEXT } from "../skills.js";
import { classGlyph, classIconImg } from "../assets.js";
import { ROLE_HINTS } from "../ui.js";
import { heroicRewards, heroicUnlocked, isHeroicCleared } from "../campaign.js";
import { chapterLaurels, laurelLives, stageLaurels, currentChapter, heroRewardStage, summonableHeroes, autoFodder, buyCopiesWithDust, canAfford, canLevelUp, canSkillUp, canSummon, convertCopies, CURRENCY_NAMES, evolutionCopyCost, evolutionMaterial, evolve, exchangeDust, featuredChance, featuredHeroId, finishCampaignStage, heroEvolution, heroLevel, heroLevelCap, heroMight, heroSkillLevel, levelCap, levelStepGain, heroStars, isCleared, isUnlocked, levelScale, levelUp, levelUpCost, multiSummonCount, nextStage, pendingRewards, repeatRewards, rewardText, skillUp, skillUpCost, stageById, starScale, starUp, starUpCost, summonMany, summonPool, summonRates, validSquad, starReachSteps } from "../campaign.js";
import campaignData from "../../../data/tdCampaign.json" with { type: "json" };
import summonData from "../../../data/tdSummon.json" with { type: "json" };
import { notifyQuest } from "../quests.js";
import type { PageContext } from "./context";
import type { CampaignProgress, SaveData } from "./save";
import { resetTdAccount } from "./save";
import { roman } from "./route";
import { bondsOf, bondText } from "../bonds.js";
import { POWER_INFO } from "./powers";
import { currencyAmount, currencyList } from "../currency-icons.js";
import { createSummonReveal } from "./summon-reveal";

// Lives as shown in battle (board.js shownLives, laurels.lifeUnit internal lives per shown life).
const livesShown = (lives: number) => shownLives(lives, (campaignData as any).laurels?.lifeUnit ?? 1);

export type CampaignRun = { stageId: string; squad: string[]; heroic?: boolean };

const campaign: any = campaignData;
const summonCfg: any = summonData;
const banner: any = summonCfg.banners[0]; // one banner for now
// Heroes screen tiles crop the full-body portrait to the face; heads sit lower on these.
const FACE_FOCUS: Record<string, string> = { fenrir: "18%", atlas: "5%", odin: "4%", nott: "3%", aegir: "3%" }; // Fenrir, Atlas, Odin, Nott, Aegir
const UPCOMING_CHAPTERS = 3; // chapter tabs shown, unauthored ones as "Coming soon"

// Records a finished stage (skipped for debug runs) and returns the result screen line.
// The caller persists the save.
export function finishCampaignRun(save: SaveData, game: any, run: CampaignRun, heroName: (id: string) => string, record: boolean) {
  const stage = stageById(campaign, run.stageId);
  const result = finishCampaignStage(campaign, save.campaign, run.stageId, { won: !!game.won, lives: game.lives ?? 0, heroic: !!run.heroic });
  if (record) {
    save.campaign = result.progress as CampaignProgress;
    if (game.won) notifyQuest(save, run.heroic ? "heroic-clear" : "campaign-clear"); // R10 daily quests #1 and #2
  }
  const label = `${run.heroic ? "Heroic " : ""}Stage ${run.stageId} ${stage?.name ?? ""}`.trim();
  // Follow-up for the result screen: the same stage's squad after a loss, else the next open stage.
  if (!game.won) return { text: `${label} lost. Try another squad, or level your heroes on the Heroes screen.`, won: false, followUp: run.stageId, paid: [] as any[] };
  const parts = [`${label} ${result.firstClear ? "cleared for the first time" : "cleared again"}.`];
  const currencies = result.granted.filter((reward: any) => reward.type === "currency");
  if (currencies.length) parts.push(`${rewardText(currencies)}.`);
  for (const reward of result.granted) if (reward.type === "hero") parts.push(`${heroName(reward.id)} joins your heroes!`);
  if (result.laurels && result.laurels.after > result.laurels.before) parts.push(`Stage rating ${result.laurels.after} of 3${result.laurels.before ? " (new best)" : ""}.`);
  for (const milestone of result.milestones ?? []) parts.push(`Chapter reward for ${milestone.laurels} rating points: ${rewardText(milestone.rewards)}.`);
  if (result.unlocked) parts.push(`Stage ${result.unlocked.id} ${result.unlocked.name} unlocked.`);
  // Divine Interventions unlock with their stage's first clear (tuning.interventions.<id>.unlockAfter).
  if (result.firstClear && !run.heroic) {
    for (const [id, cfg] of Object.entries(game.tuning?.interventions ?? {}) as [string, any][]) {
      if (cfg.unlockAfter === run.stageId) parts.push(`Divine Intervention unlocked: ${POWER_INFO[id]?.name ?? id}. ${POWER_INFO[id]?.text ?? ""}`);
    }
  }
  if (!record) parts.push("Debug run: progress was not recorded.");
  // Currencies paid by the clear and its chapter milestones, for the Stage Clear reward cards.
  const paid = record ? [...currencies, ...(result.milestones ?? []).flatMap((milestone: any) => milestone.rewards.filter((reward: any) => reward.type === "currency"))] : [];
  return { text: parts.join(" "), won: true, followUp: nextStage(campaign, result.progress)?.id ?? null, paid };
}

// Stage rating (M26 sprint 10, internally "laurels"): a laurel wreath per point, no
// player-facing name. Earned ones are gold, the rest hollow (also the Stage Clear rating).
const LEAVES = [[7.4, 18, -60], [5.4, 15.2, -35], [4.6, 11.8, -12], [5, 8.4, 12], [6.6, 5.4, 35]]
  .flatMap(([x, y, a]) => [[x, y, a], [24 - x, y, -a]])
  .map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="2.1" ry="1.05" transform="rotate(${a} ${x} ${y})" />`).join("");
export const laurelIcon = (earned: boolean) => `<svg class="td-laurel${earned ? " is-earned" : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5c-4.2-.8-7.4-4.6-7.4-9.8M12 20.5c4.2-.8 7.4-4.6 7.4-9.8" fill="none" />${LEAVES}</svg>`;

export function createCampaign(ctx: PageContext) {
  const { root, q, store, data, heroById } = ctx;
  const stagesEl = q("[data-td-camp-stages]");
  const chapterEl = q("[data-td-camp-chapter]");
  const progressEl = q("[data-td-camp-progress]");
  const laurelTrackEl = q("[data-td-camp-laurels]");
  const squadListEl = q("[data-td-squad-list]");
  const squadStart = q<HTMLButtonElement>("[data-td-squad-start]");
  const heroListEl = q("[data-td-camp-heroes]");
  const summonBannerEl = q("[data-td-summon-banner]");
  const summonCopyEl = q("[data-td-summon-copy]");
  const summonWalletEl = q("[data-td-summon-wallet]");
  const summonButton = q<HTMLButtonElement>("[data-td-summon-button]");
  const summonMultiButton = q<HTMLButtonElement>("[data-td-summon-multi]");
  const summonSkipInput = q<HTMLInputElement>("[data-td-summon-skip]");
  const SKIP_KEY = "td:summonSkip"; // per-browser convenience, not part of the save
  try { summonSkipInput.checked = localStorage.getItem(SKIP_KEY) === "1"; } catch { /* storage blocked */ }
  let lastCount = 1; // the reveal stage's Summon again repeats the last summon size
  const summonReveal = createSummonReveal(ctx, () => doSummon(lastCount));
  let stageId: string | null = null; // stage picked on the Campaign screen
  let squad: string[] = [];
  let chapterId: string | null = null; // chapter tab on the Stages screen (defaults to the next stage's)
  let drawerId: string | null = null; // stage shown in the details drawer
  let heroicRun = false; // the picked stage is played in its Heroic version
  let allStagesPlayable = false; // debug-only access override; never changes campaign progress
  let selectedHeroId: string | null = null;
  let heroTab: "level" | "stars" | "evolution" | "skills" = "level"; // Heroes screen detail tab
  let heroDetailKey = ""; // hero + tab last drawn, to keep scroll when an upgrade redraws it
  let fodder: Record<string, number> = {}; // Stars: spare copies picked for the next star
  let evoTarget: number | null = null; // Evolution tier currently being prepared (1 based)
  let evoCopies: number[] = []; // Physical duplicate indexes placed into the target tier's slots
  let evoPicker = false; // The hero stage becomes the material picker while true
  let evoPick: "dust" | null = null; // Existing alternative material path
  const resetEvolutionDraft = () => { evoTarget = null; evoCopies = []; evoPicker = false; evoPick = null; };

  const progress = () => store.data.campaign;
  const mapOf = (id: string) => data.maps.find((map: any) => map.id === id);
  // A stage's battlefield: its map, with the stage's own `boss` (optional) replacing the map's.
  const stageMap = (stage: any) => {
    const map = mapOf(stage.mapId);
    return map && stage.boss ? { ...map, boss: stage.boss } : map;
  };
  const heroName = (id: string) => heroById.get(id)?.name ?? id;
  // Rewards as icon + value chips; hero rewards as a named hero chip.
  const rewardHtml = (rewards: any[]) => `<span class="td-cur-list">${rewards.map((reward) => reward.type === "currency"
    ? currencyAmount(reward.id, reward.amount, { plus: true })
    : `<span class="td-cur td-cur--hero">${heroById.get(reward.id)?.portrait ? `<img src="${heroById.get(reward.id).portrait}" alt="">` : ""}<b>${heroName(reward.id)}</b></span>`).join("")}</span>`;

  // Squad Might vs. a stage's recommendation: a legible readout of the same hpScale
  // knob the simulator uses to scale enemy HP, not a separate invented difficulty axis.
  const avgHeroBase = data.heroes.reduce((sum: number, hero: any) => sum + hero.atk + hero.hp, 0) / data.heroes.length;
  const might = (hero: any) => heroMight(campaign, progress(), hero);
  const recommendedPower = (stage: any) => Math.round(avgHeroBase * campaign.squadSize * (stage.hpScale ?? 1));

  const chaptersEl = q("[data-td-camp-chapters]");
  const drawerEl = q<HTMLDialogElement>("[data-td-camp-drawer]");
  const drawerBody = q("[data-td-camp-drawer-body]");
  const lineupEl = q("[data-td-squad-lineup]");
  const feedbackEl = q("[data-td-squad-feedback]");
  const hasEnemy = (stage: any, kind: string) => stage.waves.some((wave: any) => wave.spawns.some((spawn: any) => spawn.kind === kind));
  const terrain = (stage: any) => mapSceneFor(mapOf(stage.mapId))?.assets.terrain ?? "";
  // Corner badge on a stage card: check when cleared, lock when locked, a play mark on the next one.
  const BADGE_PATHS: Record<string, string> = {
    done: '<path d="M5 12.5l4.5 4.5L19 7.5" />',
    locked: '<rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" />',
    next: '<path d="M9 6.5l8 5.5-8 5.5z" />',
  };
  const stageBadge = (state: string) => state
    ? `<span class="td-camp-stage-badge is-${state}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${BADGE_PATHS[state]}</svg></span>`
    : "";

  const laurelRow = (n: number, label = true) => `<span class="td-laurels"${label ? ` role="img" aria-label="Rating ${n} of 3"` : ' aria-hidden="true"'}>${[0, 1, 2].map((i) => laurelIcon(i < n)).join("")}</span>`;

  // Battlefield preview (as on the map select): terrain, lane routes, spawn gates and base.
  function mapPreview(map: any) {
    if (!map) return "";
    const preview = mapPreviewModel(map);
    const art = preview.art;
    // Dark casing under a gold core: the road reads on bright sand and dark stone alike.
    const routes = preview.routes.map((points: number[][]) => `<polyline class="td-map-preview-path-edge" points="${routePreviewPoints(points)}" /><polyline class="td-map-preview-path" points="${routePreviewPoints(points)}" />`).join("");
    const spawns = art ? preview.spawns.map((spawn: any) => `<image href="${art.spawn}" x="${spawn.x - 48}" y="${spawn.y - 55}" width="96" height="110" />`).join("") : "";
    return `<svg class="td-map-preview td-camp-drawer-map" viewBox="0 0 960 540" role="img" aria-label="${map.name} battlefield">
      ${art ? `<image href="${art.terrain}" width="960" height="540" opacity="0.9" preserveAspectRatio="none" />` : ""}${routes}${spawns}
      ${art && preview.base ? `<image href="${art.base}" x="${preview.base.x - 59}" y="${preview.base.y - 62}" width="118" height="125" />` : ""}</svg>`;
  }

  function render() {
    renderStages();
  }

  // Play on the home screen: the stage list opens on the chapter of the next stage.
  function focusNextStage() {
    chapterId = null;
    renderStages();
  }

  // Home screen data (home.ts): the next stage with its chapter progress, and whether a
  // summon or a hero upgrade can be bought right now (dock badges).
  function homeSummary() {
    const p = progress();
    const next = nextStage(campaign, p);
    const chapter = currentChapter(campaign, p);
    const stages: any[] = chapter.stages;
    return {
      next: next ? { id: next.id as string, name: next.name as string } : null,
      chapter: { id: String(chapter.id), name: chapter.name as string },
      cleared: stages.filter((stage: any) => isCleared(p, stage.id)).length,
      total: stages.length,
      started: Object.keys(p.cleared).length > 0,
      canSummon: canSummon(summonCfg, banner.id, p, allHeroIds()),
      canLevelUp: p.owned.some((id) => canLevelUp(campaign, p, id)),
    };
  }

  // Stages screen: chapter tabs, the chapter's route and stage cards; tapping a card opens
  // the details drawer (renderDrawer), whose button commits to the stage.
  function renderStages() {
    const p = progress();
    const next = nextStage(campaign, p);
    const chapters: any[] = campaign.chapters;
    const chapter = chapters.find((entry) => String(entry.id) === chapterId)
      ?? chapters.find((entry) => entry.stages.some((stage: any) => stage.id === next?.id))
      ?? chapters.at(-1);
    chapterId = String(chapter.id);
    const stages: any[] = chapter.stages;
    const cleared = stages.filter((stage) => isCleared(p, stage.id)).length;
    chapterEl.textContent = `Chapter ${chapter.id}: ${chapter.name}`;
    progressEl.textContent = `${cleared} of ${stages.length} stages cleared - ${p.owned.length} of ${data.heroes.length} heroes`;
    stagesEl.innerHTML = stages.map((stage) => {
      const open = isUnlocked(p, stage, allStagesPlayable);
      const done = p.cleared[stage.id];
      const status = !open ? `Clear ${stage.unlockAfter} to unlock` : done ? `Cleared · ${livesShown(done.bestLives)}/${livesShown(stage.lives)} lives` : "Ready to play";
      return `<button type="button" class="td-camp-stage${done ? " is-cleared" : ""}${!open ? " is-locked" : ""}${stage.id === next?.id ? " is-next" : ""}${stage.id === drawerId ? " is-featured" : ""}" data-camp-stage="${stage.id}" aria-haspopup="dialog"${stage.id === next?.id ? " data-td-autofocus" : ""}${open ? "" : " disabled"}>
        <img class="td-camp-stage-art" src="${terrain(stage)}" alt="" loading="lazy">
        ${stageBadge(done ? "done" : !open ? "locked" : stage.id === next?.id ? "next" : "")}
        <span class="td-camp-stage-id">${stage.id}</span><span class="td-camp-stage-copy"><strong>${stage.name}</strong>
        <small>${stage.waves.length} waves${hasEnemy(stage, "boss") ? " · Boss battle" : ""}</small><small class="td-camp-stage-status">${status}</small>${open ? laurelRow(stageLaurels(campaign, p, stage)) : ""}</span></button>`;
    }).join("");
    // The stage row scrolls sideways: bring the next stage into view.
    const nextCard = stagesEl.querySelector<HTMLElement>(".is-next");
    stagesEl.scrollLeft = nextCard ? Math.max(0, nextCard.offsetLeft - (stagesEl.clientWidth - nextCard.offsetWidth) / 2) : 0;
    // Authored chapters first; later ones show as locked until their stages exist.
    const tabs = chapters.map((entry) => {
      const unlocked = entry.stages.some((stage: any) => isUnlocked(p, stage, allStagesPlayable));
      const current = String(entry.id) === chapterId;
      return `<button type="button" class="td-camp-chapter-tab${current ? " is-current" : ""}" data-camp-chapter="${entry.id}"${current ? ' aria-current="true"' : ""}${unlocked ? "" : " disabled"}>Chapter ${entry.id}</button>`;
    });
    const lastId = Number(chapters.at(-1)?.id) || chapters.length;
    for (let id = lastId + 1; tabs.length < UPCOMING_CHAPTERS; id++) {
      tabs.push(`<button type="button" class="td-camp-chapter-tab" disabled>Chapter ${id}<small>Coming soon</small></button>`);
    }
    chaptersEl.innerHTML = tabs.join("");
    // Chapter rating track: points earned and the milestone rewards (paid automatically).
    const track = chapterLaurels(campaign, p, chapter.id);
    laurelTrackEl.hidden = !track.milestones.length;
    laurelTrackEl.innerHTML = `<div class="td-camp-laurel-total">${laurelIcon(true)}<strong>${track.earned}</strong><span>/ ${track.max}</span></div>
      <div class="td-camp-laurel-meter"><span style="width:${track.max ? Math.round((track.earned / track.max) * 100) : 0}%"></span></div>
      <ol class="td-camp-laurel-goals">${track.milestones.map((m: any) => `<li class="${m.paid ? "is-paid" : ""}">
        <span class="td-camp-laurel-need">${laurelIcon(m.paid)}${m.laurels}</span>${rewardHtml(m.rewards)}${m.paid ? '<span class="td-camp-laurel-done">Received</span>' : ""}</li>`).join("")}</ol>`;
  }

  function renderDrawer() {
    const stage = drawerId ? stageById(campaign, drawerId) : null;
    if (!stage) return;
    const p = progress();
    const done = p.cleared[stage.id];
    const replay = !!done;
    const first = pendingRewards(stage, p);
    const repeat = repeatRewards(campaign, stage);
    const heroic = heroicRewards(campaign, stage, p);
    const recommended = recommendedPower(stage);
    const last = p.lastSquad.map((id) => heroById.get(id)).filter((hero: any) => hero && p.owned.includes(hero.id));
    const lastPower = last.reduce((sum: number, hero: any) => sum + might(hero), 0);
    const boss = hasEnemy(stage, "boss") ? ctx.bossFor(stageMap(stage)).name : "";
    drawerBody.innerHTML = `<header class="td-camp-drawer-head">
        <button class="td-camp-drawer-close" type="button" data-camp-drawer-close aria-label="Close stage details">×</button>
        <span class="td-label">Stage ${stage.id}${replay ? " · Cleared" : stage.id === nextStage(campaign, p)?.id ? " · Your next defense" : ""}</span>
        <h2 id="td-camp-drawer-title">${stage.name}</h2>
      </header>
      <div class="td-camp-drawer-content">
        ${mapPreview(mapOf(stage.mapId))}
        <section><p class="td-camp-drawer-about">${stage.text}</p>
          ${environmentFor(mapOf(stage.mapId)) ? `<p class="td-camp-drawer-about"><strong>${environmentFor(mapOf(stage.mapId))!.rule}:</strong> ${environmentFor(mapOf(stage.mapId))!.text}</p>` : ""}
          <dl class="td-camp-drawer-facts">
            <div><dt>Battlefield</dt><dd>${mapOf(stage.mapId)?.name ?? ""}</dd></div>
            <div><dt>Waves</dt><dd>${stage.waves.length}</dd></div>
            <div><dt>Lives</dt><dd>${livesShown(stage.lives)}</dd></div>
            ${boss ? `<div><dt>Boss</dt><dd>${boss}</dd></div>` : ""}
            ${done ? `<div><dt>Best</dt><dd>${livesShown(done.bestLives)}/${livesShown(stage.lives)} lives</dd></div>` : ""}
          </dl></section>
        <section><h3 class="td-label">Goals</h3>
          <ul class="td-camp-drawer-goals">${laurelLives(campaign, stage).map((lives: number, i: number) => {
            const earned = i < stageLaurels(campaign, p, stage);
            return `<li class="${earned ? "is-earned" : ""}">${laurelIcon(earned)}<span>${i === 0 ? "Clear the stage" : `Keep ${livesShown(lives)} of ${livesShown(stage.lives)} lives`}</span></li>`;
          }).join("")}</ul></section>
        <section><h3 class="td-label">Rewards</h3>
          ${first.length && !replay ? `<div class="td-camp-drawer-reward"><span>First clear</span>${rewardHtml(first)}</div>` : ""}
          ${repeat.length ? `<div class="td-camp-drawer-reward is-repeat"><span>Replay</span>${rewardHtml(repeat)}</div>` : ""}</section>
        ${heroicUnlocked(campaign, p, stage) ? `<section><h3 class="td-label">Heroic</h3>
          <p class="td-camp-drawer-about">Enemies have ${data.tuning.tiers.heroic.enemyHp}x health and ${data.tuning.tiers.heroic.enemyAttack}x attack. Heroic clears do not count for the chapter rating; the first one pays Divine Seals.</p>
          ${heroic.length ? `<div class="td-camp-drawer-reward"><span>Heroic first clear</span>${rewardHtml(heroic)}</div>` : `<p class="td-camp-drawer-about">Heroic cleared${p.heroic?.[stage.id] ? ` (best ${livesShown(p.heroic[stage.id].bestLives)}/${livesShown(stage.lives)} lives)` : ""}.</p>`}</section>` : ""}
        <section><h3 class="td-label">Recommended Might</h3>
          <p class="td-camp-drawer-power">${recommended.toLocaleString()}</p>
          ${last.length ? `<p class="td-camp-drawer-power-note ${lastPower >= recommended ? "is-strong" : "is-weak"}">Your last squad: ${lastPower.toLocaleString()}</p>` : ""}</section>
      </div>
      <footer class="td-camp-drawer-foot">
        ${heroicUnlocked(campaign, p, stage) ? `<button class="action-button" type="button" data-camp-drawer-start="${stage.id}" data-camp-heroic>${isHeroicCleared(p, stage.id) ? "Replay Heroic" : "Play Heroic"}</button>` : ""}
        <button class="action-button action-button--primary" type="button" data-camp-drawer-start="${stage.id}">${replay ? "Replay stage" : "Choose squad"}</button>
      </footer>`;
  }

  function openDrawer(id: string) {
    drawerId = id;
    renderDrawer();
    renderStages();
    if (!drawerEl.open) drawerEl.showModal();
    drawerEl.querySelector<HTMLElement>("[data-camp-drawer-start]")?.focus();
  }

  function closeDrawer() {
    if (!drawerEl.open) return;
    const returnTo = drawerId;
    drawerEl.close();
    drawerId = null;
    renderStages();
    if (returnTo) stagesEl.querySelector<HTMLElement>(`[data-camp-stage="${returnTo}"]`)?.focus({ preventScroll: true });
  }

  function renderSquad() {
    const stage = stageId ? stageById(campaign, stageId) : null;
    if (!stage) return false;
    const p = progress();
    const selected = squad.map((id) => heroById.get(id));
    const antiAir = selected.filter((hero) => hero.class === "Mage" || hero.class === "Archer").length;
    const powerEl = q("[data-td-squad-power]");
    powerEl.hidden = !selected.length;
    if (selected.length) {
      const squadPower = selected.reduce((sum, hero) => sum + might(hero), 0);
      const recommended = recommendedPower(stage);
      // Crossed swords + value; the recommendation is in the label and tooltip only.
      powerEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 4l11 11M20 4L9 15M13 17l4 4M7 21l4-4M17 13l4 4M3 17l4-4"/></svg><span>${squadPower.toLocaleString()}</span>`;
      powerEl.title = `Squad Might ${squadPower.toLocaleString()} / recommended ${recommended.toLocaleString()}`;
      powerEl.setAttribute("aria-label", powerEl.title);
      powerEl.classList.toggle("is-strong", squadPower >= recommended);
      powerEl.classList.toggle("is-weak", squadPower < recommended);
    }
    const noAir = hasEnemy(stage, "flyer") && !antiAir;
    feedbackEl.textContent = noAir ? "Flyers in this stage: bring a Mage or Archer for air damage."
      : "Drag a hero onto a slot to swap, or tap a slot to free it.";
    feedbackEl.classList.toggle("is-warning", noAir);
    // Pantheon bonds the squad brings (they count once the heroes stand on the field).
    const bondsEl = q("[data-td-squad-bonds]");
    const bonds = bondsOf(data.tuning.bonds, selected.map((hero) => hero.id)).filter((bond) => bond.count > 0);
    bondsEl.hidden = !bonds.length;
    bondsEl.innerHTML = bonds.map((bond) => {
      const goal = bond.next ? `${bond.count}/${bond.next.count}` : `${bond.count}`;
      const text = bond.tier ? bondText(bond.tier) : `${bond.next!.count} for ${bondText(bond.next)}`;
      return `<span class="td-bond${bond.tier ? " is-active" : ""}" title="${bond.name} bond: ${text}"><b>${bond.name} ${goal}</b> ${text}</span>`;
    }).join("");
    const slotLabel = (hero: any) => hero.slot === "road" ? "Road" : "Platform";
    // Slots: portrait card only, class icon on the art, placement cost above. Tap or drag out to remove.
    lineupEl.innerHTML = Array.from({ length: campaign.squadSize }, (_, i) => {
      const hero = selected[i];
      if (!hero) return `<span class="td-squad-slot is-empty" data-squad-slot="${i}"><span class="td-squad-slot-card"><strong aria-hidden="true">+</strong></span><span class="td-squad-slot-cost" aria-hidden="true"></span></span>`;
      return `<button type="button" class="td-squad-slot" data-class="${hero.class.toLowerCase()}" data-squad-slot="${i}" data-squad-remove="${hero.id}" aria-label="${hero.name}, ${hero.class}, ${hero.cost} placement. Remove from squad">
        <span class="td-squad-slot-card"><img class="td-squad-slot-portrait" src="${hero.image}" alt=""><span class="td-squad-slot-class">${classGlyph(hero.class, 16)}</span></span>
        <span class="td-squad-slot-cost" aria-hidden="true">◈ ${hero.cost}</span></button>`;
    }).join("");
    // Roster: 50 x 75 art cards, class icon on the art, level and stars over its foot; name and (for
    // locked heroes) the unlock source are in the tooltip and label. Locked heroes trail the owned ones, dimmed.
    const mightOf = new Map<string, number>(data.heroes.map((hero: any) => [hero.id, might(hero)]));
    const heroes = [...data.heroes].sort((a: any, b: any) =>
      Number(!p.owned.includes(a.id)) - Number(!p.owned.includes(b.id)) ||
      (mightOf.get(b.id) ?? 0) - (mightOf.get(a.id) ?? 0) ||
      a.name.localeCompare(b.name));
    const tile = (hero: any) => {
      const owned = p.owned.includes(hero.id), picked = squad.includes(hero.id);
      const unlock = owned ? null : heroRewardStage(campaign, hero.id);
      const skill = data.tuning.heroSkills?.[hero.id];
      const heroMight = mightOf.get(hero.id) ?? 0;
      const tip = owned ? `${hero.name} · ${heroMight.toLocaleString()} Might · ${hero.class} · ${slotLabel(hero)}. ${ROLE_HINTS[hero.class] ?? ""}${skill ? ` Skill: ${skill.skillName}.` : ""}`
        : `${hero.name}: ${unlock ? `clear stage ${unlock.id}` : "obtain through Summon"}`;
      return `<button type="button" class="td-squad-tile${picked ? " is-picked" : ""}${owned ? "" : " is-locked"}" data-class="${hero.class.toLowerCase()}" data-squad-hero="${hero.id}" aria-pressed="${picked}" aria-label="${hero.name}, ${hero.class}${owned ? `, ${heroMight.toLocaleString()} Might, level ${heroLevel(p, hero.id)}, ${heroStars(p, hero.id)} of ${campaign.heroStars?.max ?? 5} stars` : `, locked: ${unlock ? `clear stage ${unlock.id}` : "obtain through Summon"}`}" title="${tip}"${owned ? "" : " disabled"}>
        <img class="td-squad-tile-portrait" src="${hero.image}" alt="" loading="lazy">
        <span class="td-squad-tile-class">${classGlyph(hero.class, 14)}</span>
        ${picked ? `<span class="td-squad-tile-check" aria-hidden="true">✓</span>` : ""}
        ${owned ? `<span class="td-squad-tile-foot" aria-hidden="true"><small>Lv ${heroLevel(p, hero.id)}</small>${stars(heroStars(p, hero.id))}</span>` : ""}</button>`;
    };
    const ownedHeroes = heroes.filter((h: any) => p.owned.includes(h.id));
    squadListEl.innerHTML = [...ownedHeroes, ...heroes.filter((h: any) => !p.owned.includes(h.id))].map(tile).join("");
    squadStart.disabled = !isUnlocked(p, stage, allStagesPlayable) || !validSquad(campaign, p, squad);
    squadStart.textContent = heroicRun ? "Start Heroic" : "Start";
    return true;
  }

  // Heroes screen: owned heroes and their three campaign upgrades, one tab each:
  // Level (Gold + Hero XP), Stars (duplicates of that hero + Gold: attack and health) and
  // Evolution (tier-specific duplicate costs or Seal Dust: ultimate and crit).
  function renderHeroes() {
    const p = progress();
    q("[data-td-heroes-copy]").textContent = "Level, Stars, Evolution and Skills apply in every mode.";
    const order = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
    // Owned heroes by Might (strongest first), then the ones still to earn by class.
    const mightOf = new Map<string, number>(p.owned.map((id: string) => [id, heroById.get(id) ? might(heroById.get(id)) : 0]));
    const heroes = [...data.heroes].sort((a: any, b: any) => Number(!p.owned.includes(a.id)) - Number(!p.owned.includes(b.id)) || (mightOf.get(b.id) ?? 0) - (mightOf.get(a.id) ?? 0) || order.indexOf(a.class) - order.indexOf(b.class) || a.cost - b.cost);
    const owned = heroes.filter((hero: any) => p.owned.includes(hero.id));
    if (!selectedHeroId || !p.owned.includes(selectedHeroId)) selectedHeroId = owned[0]?.id ?? null;
    q("[data-td-heroes-count]").textContent = `${p.owned.length} / ${heroes.length}`;
    heroListEl.innerHTML = heroes.map((hero: any) => {
      const isOwned = p.owned.includes(hero.id);
      const isRecruit = hero.id.startsWith("recruit-");
      const unlock = heroRewardStage(campaign, hero.id);
      const tier = heroEvolution(p, hero.id);
      const source = unlock ? `Stage ${unlock.id}` : "Summon";
      const ready = isOwned && (canLevelUp(campaign, p, hero.id) || evolutionMaterial(campaign, p, hero.id) === "copy");
      // Portrait card: the face fills the tile; class top left, evolution top right, level and
      // stars over the bottom fade. The name is the accessible label and tooltip.
      const label = isOwned
        ? `${hero.name}, ${hero.class}, level ${heroLevel(p, hero.id)}, ${heroStars(p, hero.id)} stars${tier ? `, Evolved ${roman(tier)}` : ""}, ${(mightOf.get(hero.id) ?? 0).toLocaleString()} Might${ready ? ", upgrade available" : ""}`
        : `${hero.name}, ${hero.class}, unlocks from ${source}`;
      return `<button type="button" class="td-hero-tile${isRecruit ? " is-recruit" : ""}${hero.id === selectedHeroId ? " is-selected" : ""}${isOwned ? "" : " is-locked"}" data-camp-hero-select="${hero.id}" aria-pressed="${hero.id === selectedHeroId}" aria-label="${label}" title="${hero.name}"${isOwned ? "" : " disabled"}>
        <img src="${hero.portrait ?? hero.image}" alt="" loading="lazy"${FACE_FOCUS[hero.id] ? ` style="--td-face-y: ${FACE_FOCUS[hero.id]}"` : ""}>
        <span class="td-hero-tile-class" aria-hidden="true">${classIconImg(hero.class, 16)}</span>
        ${tier ? `<span class="td-hero-tile-evo" aria-hidden="true">${roman(tier)}</span>` : ""}
        ${ready ? `<i class="td-hero-tile-dot" aria-hidden="true"></i>` : ""}
        <span class="td-hero-tile-foot" aria-hidden="true">${isOwned
          ? `<span class="td-hero-tile-lv"><small>Lv.</small>${heroLevel(p, hero.id)}</span>${stars(heroStars(p, hero.id))}`
          : `<span class="td-hero-tile-source">${unlock ? `<small>Stage</small>${unlock.id}` : source}</span>`}</span></button>`;
    }).join("");
    const hero = heroById.get(selectedHeroId ?? "");
    if (!hero) { q("[data-td-hero-detail]").innerHTML = ""; return; }
    const skill = data.tuning.heroSkills?.[hero.id];
    const tabLabels = { level: "Level", stars: "Stars", evolution: "Evolution", skills: "Skills" } as const;
    const tabIcons = { level: "M7 13l5-5 5 5M7 19l5-5 5 5", stars: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z", evolution: "M12 3l8 9-8 9-8-9zM8 12h8", skills: "M13 2L5 13h6l-1 9 8-11h-6z" } as const;
    const tabs = (Object.keys(tabLabels) as (keyof typeof tabLabels)[]).map((id) => `<button type="button" role="tab" class="td-hero-tab${heroTab === id ? " is-active" : ""}" id="td-hero-tab-${id}" data-camp-hero-tab="${id}" aria-selected="${heroTab === id}" aria-controls="td-hero-panel" tabindex="${heroTab === id ? "0" : "-1"}"><svg class="td-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${tabIcons[id]}" fill="none" stroke-linejoin="round" /></svg>${tabLabels[id]}</button>`).join("");
    const body = heroTab === "stars" ? starsPanel(p, hero) : heroTab === "evolution" ? evolutionPanel(p, hero) : heroTab === "skills" ? skillsPanel(p, hero, skill) : levelPanel(p, hero);
    // Identity sits over the hero art on every tab; the upgrade flyout beside it only
    // holds the active tab.
    const evo = heroEvolution(p, hero.id);
    const summary = `<div class="td-hero-summary"><h2>${hero.name}</h2>
      <p class="td-hero-role">${classIconImg(hero.class, 16)}${hero.class} · ${hero.slot === "road" ? "Road defender" : "Platform defender"}</p>
      <p class="td-hero-might"><strong>${might(hero).toLocaleString()}</strong> Might</p>
      <p class="td-hero-badges">${stars(heroStars(p, hero.id))}${evo ? `<span class="td-evo-badge">Evolved ${roman(evo)}</span>` : ""}${p.copies?.[hero.id] ? `<span>${p.copies[hero.id]} spare ${p.copies[hero.id] === 1 ? "copy" : "copies"}</span>` : ""}</p></div>`;
    // Redrawing replaces the scroll containers: keep their offsets when the same hero and tab
    // redraw (an upgrade), so the button just pressed stays under the pointer.
    const detailEl = q("[data-td-hero-detail]");
    const scrollSel = ".td-hero-profile-copy, .td-hero-tab-panel";
    const detailKey = `${hero.id}:${heroTab}`;
    const scrolls = detailKey === heroDetailKey ? [...detailEl.querySelectorAll<HTMLElement>(scrollSel)].map((el) => el.scrollTop) : [];
    heroDetailKey = detailKey;
    const pickerOpen = heroTab === "evolution" && evoPicker && evoTarget !== null;
    const art = pickerOpen ? evolutionPicker(p, hero) : `<img src="${hero.portrait ?? hero.image}" alt="${hero.name}">${summary}`;
    detailEl.innerHTML = `<article class="td-hero-profile${hero.id.startsWith("recruit-") ? " is-recruit" : ""}">
      <div class="td-hero-profile-art${pickerOpen ? " is-picker" : ""}">${art}</div>
      <div class="td-hero-profile-copy">
      <div class="td-hero-tab-panel" id="td-hero-panel" role="tabpanel" aria-labelledby="td-hero-tab-${heroTab}">${body}</div>
      </div>
      <nav class="td-hero-tabs" role="tablist" aria-label="Hero upgrades">${tabs}</nav>
      </article>`;
    detailEl.querySelectorAll<HTMLElement>(scrollSel).forEach((el, i) => { if (scrolls[i]) el.scrollTop = scrolls[i]; });
  }

  function skillsPanel(p: any, hero: any, skill: any) {
    const max = campaign.heroSkillLevels?.max ?? 1;
    const perUltimate = Math.round((campaign.heroSkillLevels?.ultimatePowerPerLevel ?? 0) * 100);
    const perPassive = Math.round((campaign.heroSkillLevels?.passiveStatPerLevel ?? 0) * 100);
    const passiveSkills = (CLASS_PASSIVE_SKILLS as Record<string, Array<{ id: string; name: string; text: string }>>)[hero.class] ?? [];
    const entries = [
      ...(skill ? [{ id: "ultimate", kind: "Ultimate", glyph: "✦", name: skill.skillName, text: SKILL_TEXT[skill.variant] ?? ROLE_HINTS[hero.class] ?? "", gain: `+${perUltimate}% Ultimate power per level` }] : []),
      ...passiveSkills.map((entry, index) => ({ ...entry, kind: "Passive", glyph: index ? "◇" : "◆", gain: `+${perPassive}% ${entry.id === "passiveAttack" ? "attack" : "health"} per level` })),
    ];
    if (!entries.length) return `<div class="td-hero-skill td-hero-skill--empty"><span class="td-label">Skills</span><p>${hero.name} does not have any skills yet.</p></div>`;
    const rows = entries.map((entry) => {
      const level = heroSkillLevel(p, hero.id, entry.id);
      const cost = skillUpCost(campaign, p, hero.id, entry.id);
      const action = cost
        ? `<button type="button" class="action-button action-button--primary td-skill-up" data-camp-skillup="${entry.id}"${canSkillUp(campaign, p, hero.id, entry.id) ? "" : " disabled"}>Upgrade <small>${currencyList(cost)}</small></button>`
        : `<span class="td-skill-max">Max level</span>`;
      return `<div class="td-skill-row">
        <span class="td-skill-glyph" aria-hidden="true">${entry.glyph}</span>
        <div class="td-skill-copy"><span class="td-label">${entry.kind}</span><strong>${entry.name}</strong><p>${entry.text}</p><small>${entry.gain}</small></div>
        <div class="td-skill-rank"><span>Level ${level} / ${max}</span>${action}</div>
      </div>`;
    }).join("");
    return `<div class="td-hero-skill"><header><span class="td-label">Skill training</span><p>Upgrade each skill separately. The final rank also costs Seal Dust.</p></header>${rows}</div>`;
  }

  // Attack and health in every mode: base x level x stars.
  const heroScale = (p: any, id: string, level = heroLevel(p, id), starCount = heroStars(p, id)) => levelScale(campaign, level) * starScale(campaign, starCount);

  const statRows = (hero: any, now: number, next: number | null) => {
    const row = (label: string, base: number) => `<div><dt>${label}</dt><dd>${Math.round(base * now).toLocaleString()}${next ? ` <span class="td-camp-gain">→ ${Math.round(base * next).toLocaleString()}</span>` : ""}</dd></div>`;
    return `<dl class="td-camp-stats td-hero-profile-stats">${row("Attack", hero.atk)}${row("Health", hero.hp)}<div><dt>Placement cost</dt><dd>${hero.cost}</dd></div></dl>`;
  };

  // Level: capped by stars (10 per star band). Pips show the current band of 10 levels.
  function levelPanel(p: any, hero: any) {
    const cap = heroLevelCap(campaign, p, hero.id);
    const level = heroLevel(p, hero.id);
    const cost = levelUpCost(campaign, level, cap);
    const nextCap = levelCap(campaign, heroStars(p, hero.id) + 1);
    const maxed = level >= (campaign.heroLevels?.max ?? 1);
    const button = cost
      ? `<button type="button" class="action-button action-button--primary td-camp-levelup" data-camp-levelup="${hero.id}"${canLevelUp(campaign, p, hero.id) ? "" : " disabled"}>Level up <small>${currencyList(cost)}</small></button>`
      : `<span class="td-camp-maxed">${maxed ? "Maximum level reached" : `Level cap ${cap} reached. Star up to raise it to ${nextCap}.`}</span>`;
    const band = campaign.heroLevels?.bandSize ?? 10;
    const bandStart = cap - band;
    const gain = Math.round(levelStepGain(campaign, Math.min(level + 1, cap)) * 1000) / 10;
    return `<p class="td-hero-tab-copy">Levels in this band add ${gain}% attack and health each. Stars raise the level cap by ${band}.</p>
      <div class="td-hero-level-head"><strong>Campaign level ${level}</strong><span>${level} / ${cap}</span></div>
      <span class="td-camp-pips" aria-hidden="true">${Array.from({ length: band }, (_, n) => `<i${bandStart + n < level ? " class=\"is-on\"" : ""}></i>`).join("")}</span>
      ${statRows(hero, heroScale(p, hero.id), cost ? heroScale(p, hero.id, level + 1) : null)}
      <div class="td-hero-upgrade">${button}</div>`;
  }

  // Stars: pick exactly the cost's number of duplicate copies of this hero. Stars and
  // Evolution share that supply; tap the duplicate to add it or a filled slot to remove it.
  const fodderCount = () => Object.values(fodder).reduce((sum, n) => sum + n, 0);
  function starsPanel(p: any, hero: any) {
    const starCount = heroStars(p, hero.id);
    const max = campaign.heroStars?.max ?? 5;
    const cost = starUpCost(campaign, starCount);
    const per = Math.round((campaign.heroStars?.statPerStar ?? 0) * 100);
    // Reach grows outside battle only: one attack-pattern step at set star counts.
    const reachNow = starReachSteps(campaign, starCount);
    const reachNext = Object.keys(campaign.heroStars?.reachSteps ?? {}).map(Number).sort((a, b) => a - b).find((at) => at > starCount);
    const reachLine = `<p class="td-hero-tab-copy">Reach: ${reachNow ? `+${reachNow} step${reachNow > 1 ? "s" : ""}` : "class pattern"}${reachNext ? `, +${starReachSteps(campaign, reachNext)} at ${reachNext} stars` : ""}.</p>`;
    if (!cost) return `<p class="td-hero-tab-copy">Each star adds ${per}% attack and health.</p>${reachLine}${statRows(hero, heroScale(p, hero.id), null)}<span class="td-camp-maxed">Maximum stars reached</span>`;
    const slots = Object.entries(fodder).flatMap(([id, n]) => Array.from({ length: n }, () => id));
    const slotHtml = Array.from({ length: cost.copies }, (_, i) => {
      const id = slots[i];
      const h = id ? heroById.get(id) : null;
      return h ? `<button type="button" class="td-fodder-slot is-filled" data-camp-fodder-remove="${id}" aria-label="Remove ${h.name} copy"><img src="${h.portrait ?? h.image}" alt=""><small>${h.name}</small></button>` : `<span class="td-fodder-slot" aria-hidden="true">+</span>`;
    }).join("");
    const copies = p.copies?.[hero.id] ?? 0;
    const free = copies - (fodder[hero.id] ?? 0);
    const pickHtml = copies > 0
      ? `<button type="button" class="td-fodder-pick" data-camp-fodder-add="${hero.id}"${free > 0 && fodderCount() < cost.copies ? "" : " disabled"}><img src="${hero.portrait ?? hero.image}" alt=""><span><strong>${hero.name}</strong><small>${free} ${free === 1 ? "copy" : "copies"} available</small></span><b>${free > 0 && fodderCount() < cost.copies ? "Add" : "Selected"}</b></button>`
      : `<p class="td-hero-tab-copy">No duplicate of ${hero.name} yet. Summon another copy to raise this hero's stars.</p>`;
    const selectedCopies = fodderCount();
    const full = selectedCopies === cost.copies;
    const goldOk = (p.currencies.gold || 0) >= cost.gold;
    const now = heroScale(p, hero.id);
    const next = heroScale(p, hero.id, undefined, starCount + 1);
    const previewRow = (label: string, base: number) => `<div><dt>${label}</dt><dd>${Math.round(base * now).toLocaleString()} <span>→ ${Math.round(base * next).toLocaleString()}</span></dd></div>`;
    const preview = selectedCopies ? `<section class="td-star-preview"><div class="td-star-preview-head"><strong>Next star preview</strong><span>Star ${starCount + 1}</span></div><dl>${previewRow("Attack", hero.atk)}${previewRow("Health", hero.hp)}<div><dt>Level cap</dt><dd><span>→ ${levelCap(campaign, starCount + 1)}</span></dd></div></dl></section>` : "";
    const quickAdd = !full && copies >= cost.copies
      ? `<button type="button" class="action-button action-button--quiet td-fodder-auto" data-camp-fodder-auto>Fill all slots</button>` : "";
    return `<div class="td-star-heading"><span><small>Star rank</small><strong>${stars(starCount)}</strong></span><b>${starCount} / ${max}</b></div>
      ${reachLine}
      <div class="td-fodder"><div class="td-fodder-head"><span class="td-label">Upgrade materials</span><span>${selectedCopies} / ${cost.copies}</span></div>
      <div class="td-fodder-slots">${slotHtml}</div>
      <div class="td-fodder-picks">${pickHtml}</div>${quickAdd}</div>
      ${preview}
      <div class="td-hero-upgrade">
        <button type="button" class="action-button action-button--primary td-camp-levelup" data-camp-starup="${hero.id}"${full && goldOk ? "" : " disabled"}>Star up <small>${currencyAmount("gold", cost.gold)}</small></button>
      </div>`;
  }

  function evolutionPicker(p: any, hero: any) {
    const available = p.copies?.[hero.id] ?? 0;
    const need = evoTarget === null ? 0 : evolutionCopyCost(campaign, evoTarget - 1);
    const cards = Array.from({ length: available }, (_, i) => {
      const selected = evoCopies.includes(i);
      const disabled = !selected && evoCopies.length >= need;
      return `<button type="button" class="td-evo-picker-card${selected ? " is-selected" : ""}" data-camp-evo-material-index="${i}" aria-pressed="${selected}"${disabled ? " disabled" : ""}>
        <img src="${hero.portrait ?? hero.image}" alt=""><strong>${hero.name}</strong><small>Copy ${i + 1}</small><span aria-hidden="true">${selected ? "✓" : "+"}</span>
      </button>`;
    }).join("");
    return `<section class="td-evo-picker" aria-label="Select evolution materials">
      <header class="td-evo-picker-head"><span><small>Upgrade materials</small><strong>Select ${need} ${need === 1 ? "copy" : "copies"}</strong></span><button type="button" data-camp-evo-picker-close aria-label="Close material picker">×</button></header>
      <p>${evoCopies.length} of ${need} selected. Tap a selected copy to remove it.</p>
      <div class="td-evo-picker-grid">${cards || `<p class="td-evo-picker-empty">No spare copies of ${hero.name} available.</p>`}</div>
    </section>`;
  }

  // Evolution starts in a tier overview. Preparing the next tier reveals its copy slots;
  // tapping a slot opens the copy picker in the large hero-art area.
  function evolutionPanel(p: any, hero: any) {
    const tier = heroEvolution(p, hero.id);
    const tiers = campaign.heroEvolution?.tiers ?? [];
    const copies = p.copies?.[hero.id] ?? 0;
    const dustPrice = campaign.heroEvolution?.dustPrice ?? 0;
    const dust = p.currencies.sealDust || 0;
    const dustOk = dustPrice > 0 && dust >= dustPrice;
    if (evoPick === "dust" && !dustOk) evoPick = null;
    const maxed = tier >= tiers.length;
    if (evoTarget !== null && evoTarget !== tier + 1) resetEvolutionDraft();
    if (evoTarget === null) {
      const list = tiers.map((entry: any, i: number) => {
        const state = i < tier ? "is-done" : i === tier ? "is-next" : "is-locked";
        return `<li class="${state}"><button type="button" data-camp-evo-start="${i + 1}"${i === tier ? "" : " disabled"}><span class="td-evo-mark" aria-hidden="true">${i < tier ? "✓" : roman(i + 1)}</span><span><strong>${entry.name}</strong><small>${entry.text}</small></span></button></li>`;
      }).join("");
      return `<div class="td-evo-overview"><header><small>Evolution rank</small><strong>${tier ? `Evolved ${roman(tier)}` : "Not evolved"}</strong></header><ol class="td-evo-tiers">${list}</ol></div>
        <div class="td-hero-upgrade">${maxed ? `<span class="td-camp-maxed">Fully evolved</span>` : `<button type="button" class="action-button action-button--primary td-camp-levelup" data-camp-evo-start="${tier + 1}">Evolve to ${roman(tier + 1)}</button>`}</div>`;
    }

    const target = tiers[evoTarget - 1];
    const need = evolutionCopyCost(campaign, evoTarget - 1);
    const dustPer = summonCfg.dust?.perCopy ?? 0;
    evoCopies = evoCopies.filter((index) => index < copies).slice(0, need);
    const slots = Array.from({ length: need }, (_, i) => i < evoCopies.length
      ? `<button type="button" class="td-evo-copy-slot is-filled" data-camp-evo-slot="${i}" aria-label="Remove selected copy"><img src="${hero.portrait ?? hero.image}" alt=""><span aria-hidden="true">×</span></button>`
      : `<button type="button" class="td-evo-copy-slot" data-camp-evo-slot="${i}" aria-label="Choose a copy"><span aria-hidden="true">+</span>${i < copies ? `<i class="td-evo-copy-dot" aria-hidden="true"></i>` : ""}</button>`).join("");
    const ready = evoCopies.length === need || evoPick === "dust";
    return `<div class="td-evo-detail">
      <header class="td-evo-detail-head"><button type="button" data-camp-evo-back aria-label="Back to evolution overview">‹</button><span><small>Evolve to ${roman(evoTarget)}</small><strong>${target?.name ?? "Evolution"}</strong></span></header>
      <p class="td-hero-tab-copy">${target?.text ?? ""}</p>
      <div class="td-evo-material-head"><strong>Upgrade materials</strong><span>${evoPick === "dust" ? "Dust selected" : `${evoCopies.length} / ${need}`}</span></div>
      <div class="td-evo-copy-slots">${slots}</div>
      ${dustPrice ? `<button type="button" class="td-evo-dust-option${evoPick === "dust" ? " is-selected" : ""}" data-camp-evo-dust aria-pressed="${evoPick === "dust"}"${dustOk ? "" : " disabled"}>${currencyAmount("sealDust", dustPrice)}<span>${evoPick === "dust" ? "Using Seal Dust" : `Use Seal Dust · ${dust} owned`}</span></button>` : ""}
      ${copies && dustPer ? `<button type="button" class="td-evo-convert" data-camp-dust="${hero.id}">Convert 1 spare copy to ${currencyAmount("sealDust", dustPer)}</button>` : ""}
      </div>
      <div class="td-hero-upgrade"><button type="button" class="action-button action-button--primary td-camp-levelup" data-camp-evolve="${hero.id}"${ready ? "" : " disabled"}>Evolve to ${roman(evoTarget)}</button></div>`;
  }

  // Summon screen: the banner, its cost, the player's Divine Seals and Seal Dust, x1 / x10.
  // `fresh` (entering the screen) closes the last reveal.
  // Summonable roster (campaign.js summonableHeroes): every campaign hero is available.
  const allHeroIds = (): string[] => summonableHeroes(campaign, progress(), data.heroes);
  const stars = (n: number, max = campaign.heroStars?.max ?? 5) => `<span class="td-stars" aria-label="${n} of ${max} stars">${"★".repeat(n)}<span aria-hidden="true">${"★".repeat(Math.max(0, max - n))}</span></span>`;
  function renderSummon(fresh = false) {
    const p = progress();
    const ids = allHeroIds();
    const left = summonPool(p, ids).length;
    const seals = p.currencies.divineSeals || 0;
    const dust = p.currencies.sealDust || 0;
    const featuredId = featuredHeroId(banner);
    const featured = heroById.get(featuredId);
    const featuredOwned = !!featuredId && p.owned.includes(featuredId);
    const chance = featuredChance(banner, p, ids);
    const epoch = Date.parse(banner.rotationEpoch ?? "");
    const duration = Math.max(1, Number(banner.rotationDays) || 14) * 86400000;
    const elapsed = Number.isFinite(epoch) ? Math.max(0, Date.now() - epoch) : 0;
    const rotationEnd = Number.isFinite(epoch) ? epoch + (Math.floor(elapsed / duration) + 1) * duration : Date.now() + duration;
    const daysLeft = Math.max(1, Math.ceil((rotationEnd - Date.now()) / 86400000));
    summonBannerEl.textContent = banner.name;
    summonCopyEl.textContent = featuredOwned
      ? "You own the featured hero. More copies raise its Stars and Evolution on the Heroes screen."
      : "The featured hero has boosted odds. Heroes you already own come back as spare copies.";
    q<HTMLImageElement>("[data-td-summon-feature-art]").src = featured?.portrait ?? featured?.image ?? "";
    q<HTMLImageElement>("[data-td-summon-feature-art]").alt = featured?.name ?? "Featured hero";
    q("[data-td-summon-feature-name]").textContent = featured?.name ?? "Featured hero";
    q("[data-td-summon-feature-title]").textContent = featured ? `${featured.title ?? ROLE_HINTS[featured.class] ?? ""} · ${featured.class}` : "";
    q("[data-td-summon-feature-rate]").textContent = `${Math.round(chance * 100)}%`;
    q("[data-td-summon-rotation]").textContent = `Rotates in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    summonWalletEl.innerHTML = currencyAmount("divineSeals", seals);
    const ok = canSummon(summonCfg, banner.id, p, ids);
    summonButton.disabled = !ok;
    summonButton.toggleAttribute("data-td-autofocus", ok);
    summonButton.innerHTML = `Summon x1 ${currencyAmount("divineSeals", banner.cost.divineSeals)}`;
    const multi = Number(banner.multiCount) || 10;
    summonMultiButton.disabled = !multiSummonCount(summonCfg, banner.id, p, ids);
    summonMultiButton.innerHTML = `Summon x${multi} ${currencyAmount("divineSeals", banner.cost.divineSeals * multi)}`;
    q("[data-td-summon-price]").innerHTML = `${currencyList(banner.cost)} per summon`;
    q("[data-td-summon-pool-count]").textContent = left ? `${left} not owned yet` : "All owned";
    const rates = summonRates(banner, p, ids);
    const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
    q("[data-td-summon-rates]").textContent = `Legendary ${pct(rates.legendary)} · Epic ${pct(rates.epic)} · Common ${pct(rates.common)}`;
    q("[data-td-summon-pity]").textContent = banner.pityNewInMulti && left
      ? `Summon x${multi} guarantees at least one hero you don't own yet.`
      : "";
    const pool = data.heroes.filter((hero: any) => ids.includes(hero.id) && hero.id !== featuredId);
    q("[data-td-summon-pool]").innerHTML = pool.map((hero: any) => {
      const isOwned = p.owned.includes(hero.id);
      const copies = p.copies?.[hero.id] ?? 0;
      return `<div class="td-summon-pool-hero${isOwned ? " is-owned" : ""}"><img src="${hero.portrait ?? hero.image}" alt="" loading="lazy"><strong>${hero.name}</strong><small>${hero.class}</small><span>${isOwned ? `${stars(heroStars(p, hero.id))}${copies ? ` · ${copies} spare` : ""}` : "New"}</span></div>`;
    }).join("");
    q("[data-td-summon-source]").textContent = nextStage(campaign, p)
      ? "Divine Seals come from Campaign stages (first clears pay full, replays a quarter), the Daily Trial goal and finished Expeditions. Featured heroes rotate every two weeks. All Legendary heroes are in the pool."
      : "All current campaign stages are cleared. Divine Seals still come from replays (a quarter of first-clear), the Daily Trial goal, finished Expeditions and Seal Dust.";
    // Seal Dust: spare copies turned to dust on the Heroes screen buy Divine Seals.
    const d = summonCfg.dust ?? {};
    q("[data-td-dust-wallet]").innerHTML = currencyList({ sealDust: dust });
    const sealsFor = Math.floor(dust / (d.perSeal || Infinity));
    const sealsButton = q<HTMLButtonElement>("[data-td-dust-seals]");
    sealsButton.disabled = sealsFor < 1;
    sealsButton.innerHTML = `${currencyAmount("sealDust", (sealsFor || 1) * d.perSeal)} → ${currencyAmount("divineSeals", sealsFor || 1)}`;
    // Dust → spare copies of an owned hero (feeds Stars and Evolution).
    const copySelect = q<HTMLSelectElement>("[data-td-dust-copy-hero]");
    const prevPick = copySelect.value;
    copySelect.innerHTML = p.owned.map((id: string) => {
      const hero = heroById.get(id);
      return `<option value="${id}">${hero?.name ?? id} (${p.copies?.[id] ?? 0} spare)</option>`;
    }).join("");
    if (prevPick && p.owned.includes(prevPick)) copySelect.value = prevPick;
    const copyButton = q<HTMLButtonElement>("[data-td-dust-copy]");
    copyButton.disabled = !p.owned.length || dust < d.copyPrice;
    copyButton.innerHTML = `${currencyAmount("sealDust", d.copyPrice)} → 1 copy`;
    if (fresh) summonReveal.close();
  }

  function selectStage(id: string) {
    const stage = stageById(campaign, id);
    if (!stage || !isUnlocked(progress(), stage, allStagesPlayable)) return false;
    stageId = id;
    // Start from the last squad, keeping only heroes still owned.
    squad = progress().lastSquad.filter((heroId) => progress().owned.includes(heroId)).slice(0, campaign.squadSize);
    return true;
  }

  function openStage(id: string, heroic = false) {
    if (!selectStage(id)) return;
    heroicRun = heroic && heroicUnlocked(campaign, progress(), stageById(campaign, id));
    renderSquad();
    ctx.actions.showScreen("squad");
  }

  function start() {
    const stage = stageId ? stageById(campaign, stageId) : null;
    if (!stage || !isUnlocked(progress(), stage, allStagesPlayable) || !validSquad(campaign, progress(), squad)) return;
    store.data.campaign = { ...progress(), lastSquad: [...squad] };
    store.persist();
    const map = stageMap(stage);
    if (map) ctx.actions.startSession(map, { campaign: { stageId: stage.id, squad: [...squad], ...(heroicRun && { heroic: true }) } });
  }

  // The stage rail hides its scrollbar to fit the landscape menu. A mouse wheel only
  // tries to move the vertical screen body, so chapters with more than five stages had
  // no practical desktop path to the cards off-screen. Keep native horizontal trackpad
  // and touch scrolling, and translate a predominantly vertical wheel over the rail.
  stagesEl.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const maxScroll = stagesEl.scrollWidth - stagesEl.clientWidth;
    if (maxScroll <= 0) return;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? stagesEl.clientWidth
      : 1;
    const before = stagesEl.scrollLeft;
    stagesEl.scrollLeft = Math.max(0, Math.min(maxScroll, before + event.deltaY * unit));
    if (stagesEl.scrollLeft !== before) event.preventDefault();
  }, { passive: false });

  ctx.root.querySelector<HTMLElement>('[data-td-screen="stages"]')!.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const chapterButton = target.closest<HTMLButtonElement>("[data-camp-chapter]");
    if (chapterButton && !chapterButton.disabled) { chapterId = chapterButton.dataset.campChapter!; renderStages(); return; }
    // Tapping a stage card opens its details drawer; "Choose squad" there commits to it.
    const button = target.closest<HTMLButtonElement>("[data-camp-stage]");
    if (button && !button.disabled) openDrawer(button.dataset.campStage!);
  });
  drawerEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    // A click on the dialog itself (not its panel) is the backdrop.
    if (target === drawerEl || target.closest("[data-camp-drawer-close]")) { closeDrawer(); return; }
    const startButton = target.closest<HTMLButtonElement>("[data-camp-drawer-start]");
    if (startButton) { const id = startButton.dataset.campDrawerStart!; const heroic = startButton.hasAttribute("data-camp-heroic"); closeDrawer(); openStage(id, heroic); }
  });
  // Escape closes the drawer only; the menu's own Escape (one screen up) must not see it.
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !drawerEl.open) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeDrawer();
  }, true);
  squadListEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-squad-hero]");
    if (!button || button.disabled) return;
    const id = button.dataset.squadHero!;
    if (squad.includes(id)) squad = squad.filter((entry) => entry !== id);
    else if (squad.length < campaign.squadSize) squad = [...squad, id];
    else { feedbackEl.textContent = `Squad full. Remove a selected hero before adding ${heroName(id)}.`; return; }
    renderSquad();
    squadListEl.querySelector<HTMLButtonElement>(`[data-squad-hero="${id}"]`)?.focus({ preventScroll: true });
  });
  lineupEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-squad-remove]");
    if (!button) return;
    const id = button.dataset.squadRemove!;
    squad = squad.filter((entry) => entry !== id);
    renderSquad();
    squadListEl.querySelector<HTMLButtonElement>(`[data-squad-hero="${id}"]`)?.focus({ preventScroll: true });
  });
  // Drag and drop (pointer events, so touch works too): roster tile -> slot places or
  // replaces, slot -> slot swaps, slot -> anywhere outside the lineup removes. Taps keep
  // working; a drag swallows the click that follows it. Roster tiles only start a drag on
  // a mostly vertical move (touch-action: pan-x), so horizontal swipes still scroll.
  let drag: { id: string; from: number; x: number; y: number; ghost?: HTMLElement; over?: HTMLElement | null; pointerId: number; source: HTMLElement } | null = null;
  let swallowClick = false;
  const slotAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-squad-slot]") ?? null;
  const dropOn = (id: string, from: number, slot: HTMLElement | null) => {
    const next = [...squad];
    if (!slot) { if (from >= 0) next.splice(from, 1); squad = next; return; }
    const to = Math.min(Number(slot.dataset.squadSlot), from >= 0 ? next.length - 1 : next.length);
    const at = next.indexOf(id);
    if (at >= 0) { next[at] = next[to]; next[to] = id; }
    else if (to < next.length) next[to] = id;
    else if (next.length < campaign.squadSize) next.push(id);
    squad = next.filter(Boolean);
  };
  const beginDrag = (event: PointerEvent) => {
    const target = event.target as HTMLElement;
    const tile = target.closest<HTMLButtonElement>("[data-squad-hero]");
    const slot = target.closest<HTMLButtonElement>("[data-squad-remove]");
    const source = tile ?? slot;
    if (!source || (tile && tile.disabled) || event.button !== 0) return;
    const id = tile ? tile.dataset.squadHero! : slot!.dataset.squadRemove!;
    drag = { id, from: slot ? squad.indexOf(id) : -1, x: event.clientX, y: event.clientY, pointerId: event.pointerId, source };
  };
  squadListEl.addEventListener("pointerdown", beginDrag);
  lineupEl.addEventListener("pointerdown", beginDrag);
  window.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.ghost) {
      if (Math.hypot(dx, dy) < 8) return;
      if (drag.from < 0 && event.pointerType !== "mouse" && Math.abs(dx) > Math.abs(dy)) { drag = null; return; }
      const img = drag.source.querySelector("img");
      const ghost = document.createElement("div");
      ghost.className = "td-squad-ghost";
      ghost.innerHTML = img ? `<img src="${img.getAttribute("src")}" alt="">` : "";
      document.body.append(ghost);
      drag.ghost = ghost;
      drag.source.classList.add("is-dragging");
      lineupEl.classList.add("is-drop-target");
      try { drag.source.setPointerCapture(event.pointerId); } catch {}
    }
    event.preventDefault();
    drag.ghost.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    const over = slotAt(event.clientX, event.clientY);
    if (over !== drag.over) { drag.over?.classList.remove("is-drop-over"); over?.classList.add("is-drop-over"); drag.over = over; }
  }, { passive: false });
  const endDrag = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag;
    drag = null;
    if (!current.ghost) return;
    current.ghost.remove();
    current.source.classList.remove("is-dragging");
    current.over?.classList.remove("is-drop-over");
    lineupEl.classList.remove("is-drop-target");
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 0);
    if (event.type === "pointercancel") return;
    const slot = slotAt(event.clientX, event.clientY);
    // A roster tile dropped outside the lineup changes nothing.
    if (!slot && current.from < 0) return;
    dropOn(current.id, current.from, slot);
    renderSquad();
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  ctx.root.addEventListener("click", (event) => { if (swallowClick) { event.stopPropagation(); event.preventDefault(); swallowClick = false; } }, true);
  squadStart.addEventListener("click", start);
  ctx.root.querySelector<HTMLElement>('[data-td-screen="heroes"]')!.addEventListener("click", (event) => {
    const select = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-camp-hero-select]");
    if (select && !select.disabled) {
      if (selectedHeroId !== select.dataset.campHeroSelect) { fodder = {}; resetEvolutionDraft(); }
      selectedHeroId = select.dataset.campHeroSelect!;
      renderHeroes();
      heroListEl.querySelector<HTMLButtonElement>(`[data-camp-hero-select="${selectedHeroId}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (upgradeClick(event.target as HTMLElement)) return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-camp-levelup]");
    if (!button || button.disabled || !button.dataset.campLevelup) return;
    const id = button.dataset.campLevelup!;
    const next = levelUp(campaign, progress(), id);
    if (!next) return;
    notifyQuest(store.data, "hero-upgrade"); // R10 daily quest #10: a bought hero level
    store.data.campaign = next;
    store.persist();
    renderHeroes();
    render();
    ctx.notice(`${heroName(id)} reached level ${heroLevel(next, id)}.`);
    (q("[data-td-hero-detail]").querySelector<HTMLButtonElement>(`[data-camp-levelup="${id}"]:not([disabled])`) ?? heroListEl.querySelector<HTMLButtonElement>(`[data-camp-hero-select="${id}"]`))?.focus({ preventScroll: true });
  });

  // Heroes screen: tabs, Star up (fodder picking), Evolve and copy to dust. Returns true
  // when the click was one of these.
  function commit(next: any, message: string, focus: string) {
    store.data.campaign = next as CampaignProgress;
    store.persist();
    renderHeroes();
    render();
    ctx.notice(message);
    q("[data-td-hero-detail]").querySelector<HTMLButtonElement>(`${focus}:not([disabled])`)?.focus({ preventScroll: true });
  }
  function upgradeClick(target: HTMLElement) {
    const el = target.closest<HTMLButtonElement>("[data-camp-hero-tab], [data-camp-skillup], [data-camp-evo-start], [data-camp-evo-back], [data-camp-evo-slot], [data-camp-evo-material-index], [data-camp-evo-picker-close], [data-camp-evo-dust], [data-camp-fodder-add], [data-camp-fodder-remove], [data-camp-fodder-auto], [data-camp-starup], [data-camp-evolve], [data-camp-dust]");
    if (!el || el.disabled || !selectedHeroId) return !!el;
    const id = selectedHeroId;
    const d = el.dataset;
    const p = progress();
    if (d.campHeroTab) {
      heroTab = d.campHeroTab as typeof heroTab;
      fodder = {};
      resetEvolutionDraft();
      renderHeroes();
      q("[data-td-hero-detail]").querySelector<HTMLButtonElement>(`[data-camp-hero-tab="${heroTab}"]`)?.focus({ preventScroll: true });
    } else if (d.campSkillup) {
      const next = skillUp(campaign, p, id, d.campSkillup);
      if (!next) return true;
      commit(next, `${heroName(id)}'s skill reached level ${heroSkillLevel(next, id, d.campSkillup)}.`, `[data-camp-skillup="${d.campSkillup}"]`);
    } else if (d.campEvoStart) {
      evoTarget = Number(d.campEvoStart);
      evoCopies = [];
      evoPicker = false;
      evoPick = null;
      renderHeroes();
      q("[data-td-hero-detail]").querySelector<HTMLButtonElement>("[data-camp-evo-slot]")?.focus({ preventScroll: true });
    } else if (el.hasAttribute("data-camp-evo-back")) {
      resetEvolutionDraft();
      renderHeroes();
      q("[data-td-hero-detail]").querySelector<HTMLButtonElement>("[data-camp-evo-start]")?.focus({ preventScroll: true });
    } else if (d.campEvoSlot !== undefined) {
      const index = Number(d.campEvoSlot);
      if (index < evoCopies.length) evoCopies = evoCopies.filter((_, slot) => slot !== index);
      else evoPicker = true;
      evoPick = null;
      renderHeroes();
    } else if (d.campEvoMaterialIndex !== undefined) {
      const index = Number(d.campEvoMaterialIndex);
      const need = evoTarget === null ? 0 : evolutionCopyCost(campaign, evoTarget - 1);
      if (evoCopies.includes(index)) evoCopies = evoCopies.filter((copy) => copy !== index);
      else if (evoCopies.length < need) evoCopies = [...evoCopies, index];
      evoPick = null;
      renderHeroes();
    } else if (el.hasAttribute("data-camp-evo-picker-close")) {
      evoPicker = false;
      renderHeroes();
      q("[data-td-hero-detail]").querySelector<HTMLButtonElement>("[data-camp-evo-slot]")?.focus({ preventScroll: true });
    } else if (el.hasAttribute("data-camp-evo-dust")) {
      evoPick = evoPick === "dust" ? null : "dust";
      if (evoPick) { evoCopies = []; evoPicker = false; }
      renderHeroes();
    } else if (d.campFodderAdd || d.campFodderRemove || el.hasAttribute("data-camp-fodder-auto")) {
      const need = starUpCost(campaign, heroStars(p, id))?.copies ?? 0;
      if (d.campFodderAdd) fodder = { ...fodder, [d.campFodderAdd]: (fodder[d.campFodderAdd] ?? 0) + 1 };
      else if (d.campFodderRemove) { fodder = { ...fodder, [d.campFodderRemove]: fodder[d.campFodderRemove] - 1 }; if (!fodder[d.campFodderRemove]) delete fodder[d.campFodderRemove]; }
      else {
        const auto = autoFodder(campaign, p, need, id);
        if (auto) fodder = auto;
        else ctx.notice(`Not enough duplicates of ${heroName(id)}.`);
      }
      renderHeroes();
      const again = d.campFodderAdd ? `[data-camp-fodder-add="${d.campFodderAdd}"]` : "[data-camp-starup]";
      (q("[data-td-hero-detail]").querySelector<HTMLButtonElement>(`${again}:not([disabled])`) ?? q("[data-td-hero-detail]").querySelector<HTMLButtonElement>("[data-camp-starup]"))?.focus({ preventScroll: true });
    } else if (d.campStarup) {
      const next = starUp(campaign, p, id, fodder);
      if (!next) return true;
      notifyQuest(store.data, "hero-upgrade"); // R10 daily quest #10: a star promotion
      fodder = {};
      commit(next, `${heroName(id)} reached ${heroStars(next, id)} stars.`, "[data-camp-fodder-auto]");
    } else if (d.campEvolve) {
      if (evoTarget === null) return true;
      const need = evolutionCopyCost(campaign, evoTarget - 1);
      if (evoPick !== "dust" && evoCopies.length !== need) return true;
      const next = evolve(campaign, p, id, evoPick === "dust");
      if (!next) return true;
      notifyQuest(store.data, "hero-upgrade"); // R10 daily quest #10: an evolution
      resetEvolutionDraft();
      commit(next, `${heroName(id)} evolved to ${roman(heroEvolution(next, id))}.`, "[data-camp-evo-start]");
    } else if (d.campDust) {
      const next = convertCopies(summonCfg, p, id, 1);
      if (!next) return true;
      commit(next, `1 copy of ${heroName(id)} became ${summonCfg.dust.perCopy} Seal Dust.`, "[data-camp-dust]");
    }
    return true;
  }

  // Seal Dust exchange on the Summon screen.
  q("[data-td-dust-seals]").addEventListener("click", () => {
    const p = progress();
    const n = Math.floor((p.currencies.sealDust || 0) / (summonCfg.dust?.perSeal || Infinity));
    const next = exchangeDust(summonCfg, p, "seals", n);
    if (!next) return;
    store.data.campaign = next as CampaignProgress;
    store.persist();
    renderSummon();
    render();
    ctx.notice(`+${n} Divine Seals from Seal Dust.`);
  });
  q("[data-td-dust-copy]").addEventListener("click", () => {
    const id = q<HTMLSelectElement>("[data-td-dust-copy-hero]").value;
    const next = buyCopiesWithDust(summonCfg, progress(), id, 1);
    if (!next) return;
    store.data.campaign = next as CampaignProgress;
    store.persist();
    renderSummon();
    render();
    ctx.notice(`1 copy of ${heroName(id)} for ${summonCfg.dust.copyPrice} Seal Dust.`);
  });

  // Pays and saves first, then opens the reveal stage (closing it mid-reveal loses nothing).
  function doSummon(count: number) {
    const result = summonMany(summonCfg, banner.id, progress(), allHeroIds(), count);
    if (!result) return;
    lastCount = count;
    notifyQuest(store.data, "summon"); // R10 daily quest #7: a completed pull
    store.data.campaign = result.progress as CampaignProgress;
    store.persist();
    renderSummon();
    render();
    const again = count === 1 ? canSummon(summonCfg, banner.id, progress(), allHeroIds()) : multiSummonCount(summonCfg, banner.id, progress(), allHeroIds()) === count;
    summonReveal.open(result.heroIds, {
      featuredId: featuredHeroId(banner),
      isNew: result.isNew,
      skip: summonSkipInput.checked,
      again: { label: `Summon x${count} ${currencyAmount("divineSeals", banner.cost.divineSeals * count)}`, enabled: again },
      wallet: currencyAmount("divineSeals", progress().currencies.divineSeals || 0),
    });
  }

  summonButton.addEventListener("click", () => doSummon(1));
  summonMultiButton.addEventListener("click", () => doSummon(multiSummonCount(summonCfg, banner.id, progress(), allHeroIds())));
  summonSkipInput.addEventListener("change", () => {
    try { localStorage.setItem(SKIP_KEY, summonSkipInput.checked ? "1" : "0"); } catch { /* storage blocked */ }
  });

  // Debug panel (dev builds only): adds campaign currencies to the save for testing.
  const DEBUG_GRANTS: Record<string, number> = { gold: 10000, heroXp: 10000, divineSeals: 600, sealDust: 1000 };
  const debugEl = root.querySelector<HTMLElement>("[data-td-camp-debug]");
  const debugToggle = root.querySelector<HTMLButtonElement>("[data-td-camp-debug-toggle]");
  if (debugEl && debugToggle) {
    debugToggle.addEventListener("click", () => {
      debugEl.hidden = !debugEl.hidden;
      debugToggle.setAttribute("aria-pressed", String(!debugEl.hidden));
    });
    debugEl.querySelector<HTMLInputElement>("[data-camp-debug-stages]")?.addEventListener("change", (event) => {
      allStagesPlayable = (event.currentTarget as HTMLInputElement).checked;
      renderStages();
      if (root.dataset.screen === "squad") renderSquad();
      ctx.notice(`Debug: all stages ${allStagesPlayable ? "playable" : "use normal unlocks"}.`);
    });
    debugEl.addEventListener("click", (event) => {
      const id = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-camp-debug]")?.dataset.campDebug;
      if (!id) return;
      if (id === "resetAccount") {
        if (!window.confirm("Reset all Tower Defense progress and settings stored in this browser?")) return;
        resetTdAccount(localStorage);
        window.location.reload();
        return;
      }
      const grants = id === "all" ? DEBUG_GRANTS : { [id]: DEBUG_GRANTS[id] ?? 0 };
      const p = progress();
      const currencies = { ...p.currencies };
      for (const [key, amount] of Object.entries(grants)) currencies[key] = (currencies[key] || 0) + amount;
      store.data.campaign = { ...p, currencies };
      store.persist();
      // Redraw whichever campaign screen is open so wallets and upgrade buttons update.
      const screen = root.dataset.screen;
      render();
      if (screen === "heroes") renderHeroes();
      if (screen === "summon") renderSummon();
      if (screen === "squad") renderSquad();
      ctx.notice(`Debug: ${Object.entries(grants).map(([key, amount]) => `+${amount.toLocaleString()} ${(CURRENCY_NAMES as Record<string, string>)[key] ?? key}`).join(", ")}.`);
    });
  }

  return { render, renderSquad, renderHeroes, renderSummon, selectStage, homeSummary, focusNextStage };
}
