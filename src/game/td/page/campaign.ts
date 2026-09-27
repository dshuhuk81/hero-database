// Campaign (M26) on the page: the Campaign screen (chapter, currencies, stages with lock
// and clear state and their rewards), the Squad screen (pick up to squadSize owned heroes),
// the Heroes screen (level heroes with Gold and Hero XP), the Summon screen (Divine Seals
// buy a hero not owned yet) and recording a finished stage for the result screen. Rules
// live in ../campaign.js, stage data in src/data/tdCampaign.json, the banner in
// src/data/tdSummon.json.
import { classIconImg } from "../assets.js";
import { allStages, stageRewardHeroes, canAfford, canLevelUp, canSummon, CURRENCIES, CURRENCY_NAMES, finishCampaignStage, heroLevel, isCleared, isUnlocked, levelScale, levelUp, levelUpCost, nextStage, pendingRewards, repeatRewards, rewardText, stageById, summon, summonPool, validSquad } from "../campaign.js";
import campaignData from "../../../data/tdCampaign.json" with { type: "json" };
import summonData from "../../../data/tdSummon.json" with { type: "json" };
import type { PageContext } from "./context";
import type { CampaignProgress, SaveData } from "./save";

export type CampaignRun = { stageId: string; squad: string[] };

const campaign: any = campaignData;
const summonCfg: any = summonData;
const banner: any = summonCfg.banners[0]; // one banner for now

// Records a finished stage (skipped for debug runs) and returns the result screen line.
// The caller persists the save.
export function finishCampaignRun(save: SaveData, game: any, run: CampaignRun, heroName: (id: string) => string, record: boolean) {
  const stage = stageById(campaign, run.stageId);
  const result = finishCampaignStage(campaign, save.campaign, run.stageId, { won: !!game.won, lives: game.lives ?? 0 });
  if (record) save.campaign = result.progress as CampaignProgress;
  const label = `Stage ${run.stageId} ${stage?.name ?? ""}`.trim();
  if (!game.won) return { text: `${label} lost. Try another squad, or level your heroes on the Heroes screen.`, won: false };
  const parts = [`${label} ${result.firstClear ? "cleared for the first time" : "cleared again"}.`];
  const currencies = result.granted.filter((reward: any) => reward.type === "currency");
  if (currencies.length) parts.push(`${rewardText(currencies)}.`);
  for (const reward of result.granted) if (reward.type === "hero") parts.push(`${heroName(reward.id)} joins your heroes!`);
  if (result.unlocked) parts.push(`Stage ${result.unlocked.id} ${result.unlocked.name} unlocked.`);
  if (!record) parts.push("Debug run: progress was not recorded.");
  return { text: parts.join(" "), won: true };
}

export function createCampaign(ctx: PageContext) {
  const { q, store, data, heroById } = ctx;
  const stagesEl = q("[data-td-camp-stages]");
  const chapterEl = q("[data-td-camp-chapter]");
  const progressEl = q("[data-td-camp-progress]");
  const summaryTitleEl = q("[data-td-camp-summary-title]");
  const summaryEl = q("[data-td-camp-summary]");
  const squadTitleEl = q("[data-td-squad-stage]");
  const squadCopyEl = q("[data-td-squad-copy]");
  const squadCountEl = q("[data-td-squad-count]");
  const squadListEl = q("[data-td-squad-list]");
  const squadStart = q<HTMLButtonElement>("[data-td-squad-start]");
  const walletEls = [...ctx.root.querySelectorAll<HTMLElement>("[data-td-camp-wallet]")];
  const heroListEl = q("[data-td-camp-heroes]");
  const summonBannerEl = q("[data-td-summon-banner]");
  const summonCopyEl = q("[data-td-summon-copy]");
  const summonWalletEl = q("[data-td-summon-wallet]");
  const summonNoteEl = q("[data-td-summon-note]");
  const summonRevealEl = q("[data-td-summon-reveal]");
  const summonButton = q<HTMLButtonElement>("[data-td-summon-button]");
  let stageId: string | null = null; // stage picked on the Campaign screen
  let squad: string[] = [];

  const progress = () => store.data.campaign;
  const mapOf = (id: string) => data.maps.find((map: any) => map.id === id);
  const heroName = (id: string) => heroById.get(id)?.name ?? id;
  const stageRewards = (stage: any) => {
    const first = pendingRewards(stage, progress());
    if (!isCleared(progress(), stage.id)) return first.length ? `First clear: ${rewardText(first, heroName)}` : "";
    const replay = repeatRewards(campaign, stage);
    return replay.length ? `Replay: ${rewardText(replay)}` : "";
  };
  const wallet = () => CURRENCIES.map((id) => `${(progress().currencies[id] || 0).toLocaleString()} ${(CURRENCY_NAMES as Record<string, string>)[id]}`).join(" - ");
  const costText = (cost: Record<string, number>) => Object.entries(cost).map(([id, n]) => `${n} ${(CURRENCY_NAMES as Record<string, string>)[id] ?? id}`).join(", ");

  function render() {
    const p = progress();
    const stages = allStages(campaign);
    const cleared = stages.filter((stage: any) => isCleared(p, stage.id)).length;
    const next = nextStage(campaign, p);
    summaryTitleEl.textContent = next ? `Stage ${next.id}: ${next.name}` : "Chapter complete";
    summaryEl.textContent = `${cleared} of ${stages.length} stages cleared, ${p.owned.length} heroes.`;
    const chapter = campaign.chapters[0];
    chapterEl.textContent = `Chapter ${chapter.id}: ${chapter.name}`;
    progressEl.textContent = `${cleared} of ${stages.length} stages cleared - ${p.owned.length} of ${data.heroes.length} heroes`;
    walletEls.forEach((el) => { el.textContent = wallet(); });
    stagesEl.innerHTML = stages.map((stage: any) => {
      const open = isUnlocked(p, stage);
      const done = p.cleared[stage.id];
      const map = mapOf(stage.mapId);
      const status = !open ? `Locked - clear ${stage.unlockAfter} first` : done ? `Cleared - best ${done.bestLives} of ${stage.lives} lives` : "New";
      const reward = open ? stageRewards(stage) : "";
      return `<button type="button" class="td-camp-stage${done ? " is-cleared" : ""}${!open ? " is-locked" : ""}${stage.id === next?.id ? " is-next" : ""}" data-camp-stage="${stage.id}"${open ? "" : " disabled"}>` +
        `<span class="td-camp-stage-id">${stage.id}</span>` +
        `<span class="td-camp-stage-copy"><strong>${stage.name}</strong><small>${map?.name ?? stage.mapId} - ${stage.waves.length} waves - ${stage.lives} lives</small>` +
        `<small class="td-camp-stage-text">${open ? stage.text : ""}</small>` +
        `<small class="td-camp-stage-status">${status}${reward ? ` - ${reward}` : ""}</small></span></button>`;
    }).join("");
    stagesEl.querySelector<HTMLElement>(".is-next, [data-camp-stage]:not([disabled])")?.setAttribute("data-td-autofocus", "");
  }

  function renderSquad() {
    const stage = stageId ? stageById(campaign, stageId) : null;
    if (!stage) return false;
    const p = progress();
    const map = mapOf(stage.mapId);
    squadTitleEl.textContent = `Stage ${stage.id}: ${stage.name}`;
    squadCopyEl.textContent = `${map?.name ?? stage.mapId}, boss: ${ctx.bossFor(map).name}. ${stage.waves.length} waves, ${stage.lives} lives. Only your squad can be deployed; pick road heroes to block and platform heroes for flyers.`;
    squadCountEl.textContent = `Squad ${squad.length} of ${campaign.squadSize}`;
    const order = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
    // Owned heroes first (by class), locked ones after, so the choice is on top on phones.
    const heroes = [...data.heroes].sort((a: any, b: any) => Number(!p.owned.includes(a.id)) - Number(!p.owned.includes(b.id)) || order.indexOf(a.class) - order.indexOf(b.class) || a.cost - b.cost);
    squadListEl.innerHTML = heroes.map((hero: any) => {
      const owned = p.owned.includes(hero.id);
      const picked = squad.includes(hero.id);
      const unlock = allStages(campaign).find((entry: any) => (entry.rewards ?? []).some((reward: any) => reward.type === "hero" && reward.id === hero.id));
      const note = owned ? `Lv ${heroLevel(p, hero.id)} ${hero.class} - ${hero.slot === "road" ? "road" : "platform"} - ${hero.cost} gold` : unlock ? `Locked - clear stage ${unlock.id} or summon` : "Locked - summon";
      return `<button type="button" class="td-hero-card td-squad-hero${picked ? " is-picked" : ""}${owned ? "" : " is-unavailable"}" data-squad-hero="${hero.id}" aria-pressed="${picked}"${owned ? "" : " disabled"}>` +
        `<img src="${hero.image}" alt="" width="44" height="44" loading="lazy">` +
        `<span class="td-card-copy"><strong>${classIconImg(hero.class, 16)}${hero.name}</strong><small>${note}</small></span></button>`;
    }).join("");
    squadStart.disabled = !validSquad(campaign, p, squad);
    squadStart.textContent = squad.length ? `Start stage ${stage.id}` : "Pick at least one hero";
    return true;
  }

  // Heroes screen: owned heroes with level, attack and health in campaign stages, Level up.
  function renderHeroes() {
    const p = progress();
    walletEls.forEach((el) => { el.textContent = wallet(); });
    const order = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
    const heroes = data.heroes.filter((hero: any) => p.owned.includes(hero.id)).sort((a: any, b: any) => order.indexOf(a.class) - order.indexOf(b.class) || a.cost - b.cost);
    heroListEl.innerHTML = heroes.map((hero: any) => {
      const level = heroLevel(p, hero.id);
      const cost = levelUpCost(campaign, level);
      const now = levelScale(campaign, level), next = levelScale(campaign, level + 1);
      const stats = `Attack ${Math.round(hero.atk * now)}, health ${Math.round(hero.hp * now)}`;
      const gain = cost ? ` - next: ${Math.round(hero.atk * next)} / ${Math.round(hero.hp * next)}` : "";
      const button = cost
        ? `<button type="button" class="action-button action-button--quiet td-camp-levelup" data-camp-levelup="${hero.id}"${canLevelUp(campaign, p, hero.id) ? "" : " disabled"}>Level up<small>${costText(cost)}</small></button>`
        : `<span class="td-camp-maxed">Max level</span>`;
      return `<div class="td-camp-hero"><img src="${hero.image}" alt="" width="48" height="48" loading="lazy">` +
        `<span class="td-card-copy"><strong>${classIconImg(hero.class, 16)}${hero.name} <span class="td-camp-level">Lv ${level}</span></strong><small>${hero.class} - ${stats}${gain}</small></span>${button}</div>`;
    }).join("");
    heroListEl.querySelector<HTMLElement>("[data-camp-levelup]:not([disabled])")?.setAttribute("data-td-autofocus", "");
  }

  // Summon screen: the banner, its cost, the player's Divine Seals, heroes left, one button.
  // `fresh` (entering the screen) hides the last reveal.
  // Summonable roster: stage reward heroes are left out (they come from their stage's first clear).
  const reserved = new Set(stageRewardHeroes(campaign));
  const allHeroIds = () => data.heroes.map((hero: any) => hero.id as string).filter((id: string) => !reserved.has(id));
  function renderSummon(fresh = false) {
    const p = progress();
    const left = summonPool(p, allHeroIds()).length;
    const seals = p.currencies.divineSeals || 0;
    summonBannerEl.textContent = banner.name;
    summonCopyEl.textContent = left
      ? `Each summon brings a hero you do not own yet. ${left} ${left === 1 ? "hero" : "heroes"} left to find. The first clear of a campaign stage pays Divine Seals.`
      : "You own every hero. Nothing is left to summon.";
    summonWalletEl.textContent = `${seals.toLocaleString()} ${CURRENCY_NAMES.divineSeals}`;
    const ok = canSummon(summonCfg, banner.id, p, allHeroIds());
    summonButton.disabled = !ok;
    summonButton.toggleAttribute("data-td-autofocus", ok);
    summonButton.textContent = "Summon";
    summonNoteEl.textContent = !left ? "Every hero is yours." : canAfford(p, banner.cost) ? `${costText(banner.cost)} per summon` : `Needs ${costText(banner.cost)}`;
    if (fresh) { summonRevealEl.hidden = true; summonRevealEl.innerHTML = ""; }
  }

  function reveal(id: string) {
    const hero = heroById.get(id);
    if (!hero) return;
    summonRevealEl.innerHTML = `<div class="td-summon-card">` +
      `<div class="td-summon-art"><img src="${hero.portrait ?? hero.image}" alt="" width="240" height="240" decoding="async"></div>` +
      `<div class="td-summon-copy"><span class="td-label">New hero</span>` +
      `<strong>${classIconImg(hero.class, 18)}${hero.name}</strong>` +
      (hero.title ? `<small class="td-summon-title">${hero.title}</small>` : "") +
      `<small>${hero.class} - ${hero.slot === "road" ? "road" : "platform"} - ${hero.cost} gold</small></div></div>` +
      `<div class="td-summon-hint"><p>Build squad: ${hero.name} is ready. Pick a stage and add ${hero.name} to your squad.</p>` +
      `<button type="button" class="action-button action-button--quiet" data-td-go="campaign">Build squad</button></div>`;
    summonRevealEl.hidden = false;
    // Restart the reveal animation on a second summon.
    const card = summonRevealEl.querySelector<HTMLElement>(".td-summon-card");
    if (card) { card.style.animation = "none"; void card.offsetWidth; card.style.animation = ""; }
  }

  function openStage(id: string) {
    const stage = stageById(campaign, id);
    if (!stage || !isUnlocked(progress(), stage)) return;
    stageId = id;
    // Start from the last squad, keeping only heroes still owned.
    squad = progress().lastSquad.filter((heroId) => progress().owned.includes(heroId)).slice(0, campaign.squadSize);
    renderSquad();
    ctx.actions.showScreen("squad");
  }

  function start() {
    const stage = stageId ? stageById(campaign, stageId) : null;
    if (!stage || !validSquad(campaign, progress(), squad)) return;
    store.data.campaign = { ...progress(), lastSquad: [...squad] };
    store.persist();
    const map = mapOf(stage.mapId);
    if (map) ctx.actions.startSession(map, { campaign: { stageId: stage.id, squad: [...squad] } });
  }

  stagesEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-camp-stage]");
    if (button && !button.disabled) openStage(button.dataset.campStage!);
  });
  squadListEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-squad-hero]");
    if (!button || button.disabled) return;
    const id = button.dataset.squadHero!;
    if (squad.includes(id)) squad = squad.filter((entry) => entry !== id);
    else if (squad.length < campaign.squadSize) squad = [...squad, id];
    else { ctx.notice(`A squad has at most ${campaign.squadSize} heroes. Remove one first.`); return; }
    renderSquad();
    squadListEl.querySelector<HTMLButtonElement>(`[data-squad-hero="${id}"]`)?.focus({ preventScroll: true });
  });
  squadStart.addEventListener("click", start);
  heroListEl.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-camp-levelup]");
    if (!button || button.disabled) return;
    const id = button.dataset.campLevelup!;
    const next = levelUp(campaign, progress(), id);
    if (!next) return;
    store.data.campaign = next;
    store.persist();
    renderHeroes();
    render();
    ctx.notice(`${heroName(id)} reached level ${heroLevel(next, id)}.`);
    (heroListEl.querySelector<HTMLButtonElement>(`[data-camp-levelup="${id}"]:not([disabled])`) ?? heroListEl.querySelector<HTMLButtonElement>("[data-camp-levelup]:not([disabled])"))?.focus({ preventScroll: true });
  });

  summonButton.addEventListener("click", () => {
    const result = summon(summonCfg, banner.id, progress(), allHeroIds());
    if (!result) return;
    store.data.campaign = result.progress as CampaignProgress;
    store.persist();
    renderSummon();
    render();
    reveal(result.heroId);
    ctx.notice(`${heroName(result.heroId)} joins your heroes!`);
    if (summonButton.disabled) summonRevealEl.querySelector<HTMLButtonElement>("[data-td-go]")?.focus({ preventScroll: true });
  });

  return { render, renderSquad, renderHeroes, renderSummon };
}
