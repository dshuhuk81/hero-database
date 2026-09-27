// Campaign (M26) on the page: the Campaign screen (chapter, currencies, stages with lock
// and clear state and their rewards), the Squad screen (pick up to squadSize owned heroes),
// the Heroes screen (level heroes with Gold and Hero XP), the Summon screen (Divine Seals
// buy a hero not owned yet) and recording a finished stage for the result screen. Rules
// live in ../campaign.js, stage data in src/data/tdCampaign.json, the banner in
// src/data/tdSummon.json.
import { mapSceneFor } from "../map-scene.js";
import { SKILL_TEXT } from "../skills.js";
import { classIconImg } from "../assets.js";
import { allStages, stageRewardHeroes, canAfford, canLevelUp, canSummon, CURRENCIES, CURRENCY_NAMES, finishCampaignStage, heroLevel, isCleared, isUnlocked, levelScale, levelUp, levelUpCost, nextStage, pendingRewards, repeatRewards, rewardText, stageById, summon, summonPool, validSquad } from "../campaign.js";
import campaignData from "../../../data/tdCampaign.json" with { type: "json" };
import summonData from "../../../data/tdSummon.json" with { type: "json" };
import type { PageContext } from "./context";
import type { CampaignProgress, SaveData } from "./save";
import { roman, routeHtml } from "./route";

export type CampaignRun = { stageId: string; squad: string[] };

const campaign: any = campaignData;
const summonCfg: any = summonData;
const ROLE_HINTS: Record<string, string> = { Tank: "Holds 3 enemies. Protects the line.", Warrior: "Holds 2 enemies. Cleaves groups.", Assassin: "Catches enemies that slip through.", Mage: "Splash damage for packs and armor.", Archer: "Strong against flyers and tough targets.", Support: "Heals and boosts nearby allies." };
const banner: any = summonCfg.banners[0]; // one banner for now

// Records a finished stage (skipped for debug runs) and returns the result screen line.
// The caller persists the save.
export function finishCampaignRun(save: SaveData, game: any, run: CampaignRun, heroName: (id: string) => string, record: boolean) {
  const stage = stageById(campaign, run.stageId);
  const result = finishCampaignStage(campaign, save.campaign, run.stageId, { won: !!game.won, lives: game.lives ?? 0 });
  if (record) save.campaign = result.progress as CampaignProgress;
  const label = `Stage ${run.stageId} ${stage?.name ?? ""}`.trim();
  // Follow-up for the result screen: the same stage's squad after a loss, else the next open stage.
  if (!game.won) return { text: `${label} lost. Try another squad, or level your heroes on the Heroes screen.`, won: false, followUp: run.stageId };
  const parts = [`${label} ${result.firstClear ? "cleared for the first time" : "cleared again"}.`];
  const currencies = result.granted.filter((reward: any) => reward.type === "currency");
  if (currencies.length) parts.push(`${rewardText(currencies)}.`);
  for (const reward of result.granted) if (reward.type === "hero") parts.push(`${heroName(reward.id)} joins your heroes!`);
  if (result.unlocked) parts.push(`Stage ${result.unlocked.id} ${result.unlocked.name} unlocked.`);
  if (!record) parts.push("Debug run: progress was not recorded.");
  return { text: parts.join(" "), won: true, followUp: nextStage(campaign, result.progress)?.id ?? null };
}

export function createCampaign(ctx: PageContext) {
  const { q, store, data, heroById } = ctx;
  const stagesEl = q("[data-td-camp-stages]");
  const chapterEl = q("[data-td-camp-chapter]");
  const progressEl = q("[data-td-camp-progress]");
  const summaryTitleEl = q("[data-td-camp-summary-title]");
  const summaryEl = q("[data-td-camp-summary]");
  const summaryChapterEl = q("[data-td-camp-summary-chapter]");
  const summaryRouteEl = q("[data-td-camp-summary-route]");
  const summaryCtaEl = q("[data-td-camp-summary-cta]");
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

  const featureEl = q("[data-td-camp-feature]");
  const lineupEl = q("[data-td-squad-lineup]");
  const feedbackEl = q("[data-td-squad-feedback]");
  const hasEnemy = (stage: any, kind: string) => stage.waves.some((wave: any) => wave.spawns.some((spawn: any) => spawn.kind === kind));
  const terrain = (stage: any) => mapSceneFor(mapOf(stage.mapId))?.assets.terrain ?? "";

  function render() {
    const p = progress();
    const stages = allStages(campaign);
    const cleared = stages.filter((stage: any) => isCleared(p, stage.id)).length;
    const next = nextStage(campaign, p);
    const chapter = campaign.chapters[0];
    summaryTitleEl.textContent = next ? `Stage ${next.id}: ${next.name}` : "Chapter complete";
    summaryEl.textContent = `${cleared} / ${stages.length} stages cleared \u00b7 ${p.owned.length} heroes`;
    summaryChapterEl.textContent = `Chapter ${roman(Number(chapter.id) || 1)} \u00b7 ${chapter.name}`;
    summaryRouteEl.innerHTML = routeHtml(stages.map((stage: any) => ({ label: stage.id, state: isCleared(p, stage.id) ? "done" : stage.id === next?.id ? "current" : "ahead" })));
    summaryCtaEl.textContent = !cleared ? "Begin" : next ? "Continue" : "Replay";
    chapterEl.textContent = `Chapter ${chapter.id}: ${chapter.name}`;
    progressEl.textContent = `${cleared} of ${stages.length} stages cleared - ${p.owned.length} of ${data.heroes.length} heroes`;
    walletEls.forEach((el) => { el.textContent = wallet(); });
    const featured = next ?? stages.at(-1);
    featureEl.innerHTML = featured ? `<article class="td-camp-feature">
      <img src="${terrain(featured)}" alt="" class="td-camp-feature-art">
      <div class="td-camp-feature-copy"><span class="td-label">${next ? "Your next defense" : "Chapter complete · Play again"}</span>
      <h3>${featured.id} · ${featured.name}</h3><p>${featured.text}</p>
      <span class="td-camp-feature-meta">${mapOf(featured.mapId)?.name} · ${featured.waves.length} waves · ${featured.lives} lives${hasEnemy(featured, "boss") ? ` · Boss: ${ctx.bossFor(mapOf(featured.mapId)).name}` : ""}</span>
      <p class="td-camp-feature-reward">${stageRewards(featured)}</p>
      <button class="action-button action-button--primary" type="button" data-camp-stage="${featured.id}" data-td-autofocus>${next ? "Choose squad" : "Replay stage"}</button></div></article>` : "";
    stagesEl.innerHTML = stages.map((stage: any) => {
      const open = isUnlocked(p, stage);
      const done = p.cleared[stage.id];
      const status = !open ? `Clear ${stage.unlockAfter} to unlock` : done ? `Cleared · ${done.bestLives}/${stage.lives} lives` : "Ready to play";
      return `<button type="button" class="td-camp-stage${done ? " is-cleared" : ""}${!open ? " is-locked" : ""}${stage.id === next?.id ? " is-next" : ""}" data-camp-stage="${stage.id}"${open ? "" : " disabled"}>
        <img class="td-camp-stage-art" src="${terrain(stage)}" alt="" loading="lazy">
        <span class="td-camp-stage-id">${stage.id}</span><span class="td-camp-stage-copy"><strong>${stage.name}</strong>
        <small>${stage.waves.length} waves${hasEnemy(stage, "boss") ? " · Boss battle" : ""}</small><small class="td-camp-stage-status">${status}</small></span></button>`;
    }).join("");
  }

  function renderSquad() {
    const stage = stageId ? stageById(campaign, stageId) : null;
    if (!stage) return false;
    const p = progress();
    const map = mapOf(stage.mapId);
    squadTitleEl.textContent = `Stage ${stage.id}: ${stage.name}`;
    squadCopyEl.textContent = `${map?.name ?? stage.mapId} · ${stage.waves.length} waves · ${stage.lives} lives${hasEnemy(stage, "boss") ? ` · Boss: ${ctx.bossFor(map).name}` : ""}. ${stage.text}`;
    q("[data-td-squad-rewards]").textContent = stageRewards(stage);
    squadCountEl.textContent = `Squad ${squad.length} / ${campaign.squadSize}`;
    const selected = squad.map((id) => heroById.get(id));
    const road = selected.filter((hero) => hero.slot === "road").length;
    const antiAir = selected.filter((hero) => hero.class === "Mage" || hero.class === "Archer").length;
    q("[data-td-squad-coverage]").textContent = `${road} road · ${selected.length - road} platform · ${antiAir} anti-air damage`;
    feedbackEl.textContent = hasEnemy(stage, "flyer") && !antiAir ? "Flyers in this stage: bring a Mage or Archer for air damage."
      : squad.length === campaign.squadSize ? "Squad full. Select a chosen hero to remove them." : "Select a hero to add them. Select again to remove.";
    feedbackEl.classList.toggle("is-warning", hasEnemy(stage, "flyer") && !antiAir);
    lineupEl.innerHTML = Array.from({ length: campaign.squadSize }, (_, i) => selected[i]
      ? `<button type="button" data-squad-remove="${selected[i].id}" aria-label="Remove ${selected[i].name} from squad"><img src="${selected[i].image}" alt=""><span>${selected[i].name}</span><small>Remove ×</small></button>`
      : `<span class="td-squad-empty"><strong>${i + 1}</strong><small>Choose hero</small></span>`).join("");
    const order = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
    const heroes = [...data.heroes].sort((a: any, b: any) => order.indexOf(a.class) - order.indexOf(b.class) || a.cost - b.cost);
    const card = (hero: any) => {
      const owned = p.owned.includes(hero.id), picked = squad.includes(hero.id);
      const unlock = allStages(campaign).find((entry: any) => (entry.rewards ?? []).some((reward: any) => reward.type === "hero" && reward.id === hero.id));
      const skill = data.tuning.heroSkills?.[hero.id];
      const note = owned ? `Campaign Lv ${heroLevel(p, hero.id)} · ${hero.cost} battle gold` : unlock ? `Clear stage ${unlock.id}` : "Obtain through Summon";
      return `<article class="td-squad-card${picked ? " is-picked" : ""}"><button type="button" class="td-squad-hero" data-squad-hero="${hero.id}" aria-pressed="${picked}"${owned ? "" : " disabled"}>
        <img class="td-squad-portrait" src="${hero.portrait ?? hero.image}" alt="" loading="lazy">
        <span class="td-squad-choice">${picked ? "✓ Selected" : owned ? "Select" : "Locked"}</span>
        <span class="td-card-copy"><strong>${hero.name}</strong><small>${classIconImg(hero.class, 16)}${hero.class} · ${hero.slot === "road" ? "Road" : "Platform"}</small>
        <span>${ROLE_HINTS[hero.class] ?? ""}</span><small>${note}</small></span></button>
        ${owned && skill ? `<details class="td-squad-skill"><summary>${skill.skillName}</summary><p>${SKILL_TEXT[skill.variant] ?? ROLE_HINTS[hero.class] ?? ""}</p></details>` : ""}</article>`;
    };
    squadListEl.innerHTML = heroes.filter((h: any) => p.owned.includes(h.id)).map(card).join("");
    const locked = heroes.filter((h: any) => !p.owned.includes(h.id));
    q("[data-td-squad-locked]").innerHTML = locked.map(card).join("");
    q("[data-td-squad-locked-label]").textContent = `Heroes to discover · ${locked.length}`;
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
      ? "Invite a new defender to your campaign squad."
      : "Every hero in this banner is yours. Stage rewards can still unlock other heroes.";
    summonWalletEl.textContent = `${seals.toLocaleString()} ${CURRENCY_NAMES.divineSeals}`;
    const ok = canSummon(summonCfg, banner.id, p, allHeroIds());
    summonButton.disabled = !ok;
    summonButton.toggleAttribute("data-td-autofocus", ok);
    summonButton.textContent = left ? "Summon 1 hero" : "Banner complete";
    q("[data-td-summon-price]").textContent = `${costText(banner.cost)} per summon`;
    q("[data-td-summon-pool-count]").textContent = `${left} still to discover`;
    const pool = data.heroes.filter((hero: any) => !reserved.has(hero.id) && !campaign.starters.includes(hero.id));
    q("[data-td-summon-pool]").innerHTML = pool.map((hero: any) => `<div class="td-summon-pool-hero${p.owned.includes(hero.id) ? " is-owned" : ""}"><img src="${hero.portrait ?? hero.image}" alt="" loading="lazy"><strong>${hero.name}</strong><small>${hero.class}</small><span>${p.owned.includes(hero.id) ? "✓ Owned" : "Undiscovered"}</span></div>`).join("");
    q("[data-td-summon-source]").textContent = nextStage(campaign, p)
      ? "Earn Divine Seals from first clears in Campaign. Every remaining hero in this banner has an equal chance. Stage-reward heroes are earned only from their stages."
      : "All current campaign stages are cleared. Replays award Gold and Hero XP, but no Divine Seals. More seals need future campaign rewards.";
    summonNoteEl.textContent = !left ? "All banner heroes collected." : canAfford(p, banner.cost) ? `${costText(banner.cost)} per summon` : `Needs ${costText(banner.cost)}`;
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
    summonRevealEl.focus({ preventScroll: true });
    summonRevealEl.scrollIntoView({ block: "nearest" });
    // Restart the reveal animation on a second summon.
    const card = summonRevealEl.querySelector<HTMLElement>(".td-summon-card");
    if (card) { card.style.animation = "none"; void card.offsetWidth; card.style.animation = ""; }
  }

  function selectStage(id: string) {
    const stage = stageById(campaign, id);
    if (!stage || !isUnlocked(progress(), stage)) return false;
    stageId = id;
    // Start from the last squad, keeping only heroes still owned.
    squad = progress().lastSquad.filter((heroId) => progress().owned.includes(heroId)).slice(0, campaign.squadSize);
    return true;
  }

  function openStage(id: string) {
    if (!selectStage(id)) return;
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

  ctx.root.querySelector<HTMLElement>('[data-td-screen="campaign"]')!.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-camp-stage]");
    if (button && !button.disabled) openStage(button.dataset.campStage!);
  });
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
  q("[data-td-squad-preset]").addEventListener("click", () => {
    const owned = data.heroes.filter((hero: any) => progress().owned.includes(hero.id));
    squad = ["Warrior", "Mage", "Archer", "Support"].map((cls) => owned.find((hero: any) => hero.class === cls)?.id).filter(Boolean).slice(0, campaign.squadSize);
    renderSquad();
    feedbackEl.textContent = "Quick pick: a road fighter, splash damage, anti-air and healing. Swap any hero to try another approach.";
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

  });

  return { render, renderSquad, renderHeroes, renderSummon, selectStage };
}
