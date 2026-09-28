// Campaign (M26) on the page: the Campaign screen (chapter, currencies, stages with lock
// and clear state and their rewards), the Squad screen (pick up to squadSize owned heroes),
// the Heroes screen (level heroes with Gold and Hero XP), the Summon screen (Divine Seals
// buy one or ten heroes not owned yet; the reveal stage is ./summon-reveal.ts) and recording a finished stage for the result screen. Rules
// live in ../campaign.js, stage data in src/data/tdCampaign.json, the banner in
// src/data/tdSummon.json.
import { mapSceneFor } from "../map-scene.js";
import { SKILL_TEXT } from "../skills.js";
import { classGlyph, classIconImg } from "../assets.js";
import { ROLE_HINTS } from "../ui.js";
import { allStages, stageRewardHeroes, autoFodder, buyCopiesWithDust, canAfford, canLevelUp, canSummon, convertCopies, CURRENCIES, CURRENCY_NAMES, evolutionMaterial, evolve, exchangeDust, featuredChance, featuredHeroId, finishCampaignStage, heroEvolution, heroLevel, heroStars, isCleared, isUnlocked, levelScale, levelUp, levelUpCost, multiSummonCount, nextStage, pendingRewards, repeatRewards, rewardText, stageById, starScale, starUp, starUpCost, summonMany, summonPool, validSquad } from "../campaign.js";
import campaignData from "../../../data/tdCampaign.json" with { type: "json" };
import summonData from "../../../data/tdSummon.json" with { type: "json" };
import type { PageContext } from "./context";
import type { CampaignProgress, SaveData } from "./save";
import { roman, routeHtml } from "./route";
import { createSummonReveal } from "./summon-reveal";

export type CampaignRun = { stageId: string; squad: string[] };

const campaign: any = campaignData;
const summonCfg: any = summonData;
const banner: any = summonCfg.banners[0]; // one banner for now
const UPCOMING_CHAPTERS = 3; // chapter tabs shown, unauthored ones as "Coming soon"

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
  let selectedHeroId: string | null = null;
  let heroTab: "level" | "stars" | "evolution" = "level"; // Heroes screen detail tab
  let fodder: Record<string, number> = {}; // Stars: spare copies picked for the next star
  let evoPick: "copy" | "essence" | null = null; // Evolution: material the player picked

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

  // Squad power vs. a stage's recommendation: a legible readout of the same hpScale
  // knob the simulator uses to scale enemy HP, not a separate invented difficulty axis.
  const avgHeroBase = data.heroes.reduce((sum: number, hero: any) => sum + hero.atk + hero.hp, 0) / data.heroes.length;
  const heroPower = (hero: any, level: number) => Math.round((hero.atk + hero.hp) * levelScale(campaign, level) * starScale(campaign, heroStars(progress(), hero.id)));
  const recommendedPower = (stage: any) => Math.round(avgHeroBase * campaign.squadSize * (stage.hpScale ?? 1));

  const chaptersEl = q("[data-td-camp-chapters]");
  const drawerEl = q<HTMLDialogElement>("[data-td-camp-drawer]");
  const drawerBody = q("[data-td-camp-drawer-body]");
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
    const resourceIcons: Record<string, string> = { gold: "◈", heroXp: "✦", divineSeals: "✧" };
    q("[data-td-camp-resources]").innerHTML = CURRENCIES.map((id) => `<span class="td-camp-resource" title="${(CURRENCY_NAMES as Record<string, string>)[id]}" aria-label="${(p.currencies[id] || 0).toLocaleString()} ${(CURRENCY_NAMES as Record<string, string>)[id]}"><span aria-hidden="true">${resourceIcons[id] ?? "✦"}</span><strong>${(p.currencies[id] || 0).toLocaleString()}</strong></span>`).join("");
    q("[data-td-camp-home-chapter]").textContent = `Chapter ${chapter.id} · ${chapter.name}`;
    q("[data-td-camp-home-progress]").textContent = next ? `${cleared} of ${stages.length} stages cleared · ${stages.length - cleared} ahead` : "Chapter complete · Revisit stages for Gold and Hero XP";
    const meter = q<HTMLProgressElement>("[data-td-camp-home-meter]");
    meter.max = stages.length;
    meter.value = cleared;
    const upgrades = p.owned.filter((id) => canLevelUp(campaign, p, id) || evolutionMaterial(campaign, p, id) === "copy").length;
    q("[data-td-camp-home-heroes]").textContent = `${p.owned.length} / ${data.heroes.length} collected · ${upgrades ? `${upgrades} ready to upgrade` : "Earn Gold and Hero XP to level up"}`;
    const remaining = summonPool(p, allHeroIds()).length;
    q("[data-td-camp-home-summon]").textContent = canSummon(summonCfg, banner.id, p, allHeroIds()) ? `Summon available${remaining ? ` · ${remaining} heroes not owned yet` : " · duplicates become copies"}` : `${costText(banner.cost)} per summon`;
    const company = (p.lastSquad.length ? p.lastSquad : p.owned.slice(0, campaign.squadSize)).filter((id) => p.owned.includes(id));
    q("[data-td-camp-company-note]").textContent = p.lastSquad.length ? "Last deployed squad" : "Your first defenders";
    q("[data-td-camp-company]").innerHTML = company.map((id) => {
      const hero = heroById.get(id);
      return hero ? `<div class="td-camp-companion"><img src="${hero.portrait ?? hero.image}" alt=""><div><strong>${hero.name}</strong><small>${hero.class} · Lv ${heroLevel(p, id)}</small></div></div>` : "";
    }).join("");
    summaryTitleEl.textContent = next ? `Stage ${next.id}: ${next.name}` : "Chapter complete";
    summaryEl.textContent = `${cleared} / ${stages.length} stages cleared \u00b7 ${p.owned.length} heroes`;
    summaryChapterEl.textContent = `Chapter ${roman(Number(chapter.id) || 1)} \u00b7 ${chapter.name}`;
    summaryRouteEl.innerHTML = routeHtml(stages.map((stage: any) => ({ label: stage.id, state: isCleared(p, stage.id) ? "done" : stage.id === next?.id ? "current" : "ahead" })));
    summaryCtaEl.textContent = !cleared ? "Begin" : next ? "Continue" : "Replay";
    renderStages();
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
    walletEls.forEach((el) => { el.textContent = wallet(); });
    q("[data-td-camp-route]").innerHTML = routeHtml(stages.map((stage) => ({
      label: stage.id,
      state: isCleared(p, stage.id) ? "done" : stage.id === next?.id ? "current" : "ahead",
    })));
    stagesEl.innerHTML = stages.map((stage) => {
      const open = isUnlocked(p, stage);
      const done = p.cleared[stage.id];
      const status = !open ? `Clear ${stage.unlockAfter} to unlock` : done ? `Cleared · ${done.bestLives}/${stage.lives} lives` : "Ready to play";
      return `<button type="button" class="td-camp-stage${done ? " is-cleared" : ""}${!open ? " is-locked" : ""}${stage.id === next?.id ? " is-next" : ""}${stage.id === drawerId ? " is-featured" : ""}" data-camp-stage="${stage.id}" aria-haspopup="dialog"${stage.id === next?.id ? " data-td-autofocus" : ""}${open ? "" : " disabled"}>
        <img class="td-camp-stage-art" src="${terrain(stage)}" alt="" loading="lazy">
        <span class="td-camp-stage-id">${stage.id}</span><span class="td-camp-stage-copy"><strong>${stage.name}</strong>
        <small>${stage.waves.length} waves${hasEnemy(stage, "boss") ? " · Boss battle" : ""}</small><small class="td-camp-stage-status">${status}</small></span></button>`;
    }).join("");
    // Authored chapters first; later ones show as locked until their stages exist.
    const tabs = chapters.map((entry) => {
      const unlocked = entry.stages.some((stage: any) => isUnlocked(p, stage));
      const current = String(entry.id) === chapterId;
      return `<button type="button" class="td-camp-chapter-tab${current ? " is-current" : ""}" data-camp-chapter="${entry.id}"${current ? ' aria-current="true"' : ""}${unlocked ? "" : " disabled"}>Chapter ${entry.id}</button>`;
    });
    const lastId = Number(chapters.at(-1)?.id) || chapters.length;
    for (let id = lastId + 1; tabs.length < UPCOMING_CHAPTERS; id++) {
      tabs.push(`<button type="button" class="td-camp-chapter-tab" disabled>Chapter ${id}<small>Coming soon</small></button>`);
    }
    chaptersEl.innerHTML = tabs.join("");
  }

  function renderDrawer() {
    const stage = drawerId ? stageById(campaign, drawerId) : null;
    if (!stage) return;
    const p = progress();
    const done = p.cleared[stage.id];
    const replay = !!done;
    const first = pendingRewards(stage, p);
    const repeat = repeatRewards(campaign, stage);
    const recommended = recommendedPower(stage);
    const last = p.lastSquad.map((id) => heroById.get(id)).filter((hero: any) => hero && p.owned.includes(hero.id));
    const lastPower = last.reduce((sum: number, hero: any) => sum + heroPower(hero, heroLevel(p, hero.id)), 0);
    const boss = hasEnemy(stage, "boss") ? ctx.bossFor(mapOf(stage.mapId)).name : "";
    drawerBody.innerHTML = `<header class="td-camp-drawer-head">
        <img src="${terrain(stage)}" alt="" class="td-camp-drawer-art">
        <button class="td-camp-drawer-close" type="button" data-camp-drawer-close aria-label="Close stage details">×</button>
        <span class="td-label">Stage ${stage.id}${replay ? " · Cleared" : stage.id === nextStage(campaign, p)?.id ? " · Your next defense" : ""}</span>
        <h2 id="td-camp-drawer-title">${stage.name}</h2>
      </header>
      <div class="td-camp-drawer-content">
        <section><h3 class="td-label">About the stage</h3><p>${stage.text}</p>
          <dl class="td-camp-drawer-facts">
            <div><dt>Battlefield</dt><dd>${mapOf(stage.mapId)?.name ?? ""}</dd></div>
            <div><dt>Waves</dt><dd>${stage.waves.length}</dd></div>
            <div><dt>Lives</dt><dd>${stage.lives}</dd></div>
            ${boss ? `<div><dt>Boss</dt><dd>${boss}</dd></div>` : ""}
            ${done ? `<div><dt>Best</dt><dd>${done.bestLives}/${stage.lives} lives</dd></div>` : ""}
          </dl></section>
        <section><h3 class="td-label">Rewards</h3>
          ${first.length ? `<p class="td-camp-drawer-reward"><span>First clear</span>${rewardText(first, heroName)}</p>` : ""}
          ${repeat.length ? `<p class="td-camp-drawer-reward is-repeat"><span>Replay</span>${rewardText(repeat)}</p>` : ""}</section>
        <section><h3 class="td-label">Recommended battle power</h3>
          <p class="td-camp-drawer-power">${recommended.toLocaleString()}</p>
          ${last.length ? `<p class="td-camp-drawer-power-note ${lastPower >= recommended ? "is-strong" : "is-weak"}">Your last squad: ${lastPower.toLocaleString()}</p>` : ""}</section>
      </div>
      <footer class="td-camp-drawer-foot">
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
    const map = mapOf(stage.mapId);
    squadTitleEl.textContent = `Stage ${stage.id}: ${stage.name}`;
    const bossText = hasEnemy(stage, "boss") ? ` · Boss: ${ctx.bossFor(map).name}` : "";
    squadCopyEl.textContent = `${map?.name ?? stage.mapId} · ${stage.waves.length} waves · ${stage.lives} lives${bossText}`;
    squadCopyEl.title = stage.text ?? "";
    q("[data-td-squad-rewards]").textContent = stageRewards(stage);
    squadCountEl.textContent = `Squad ${squad.length} / ${campaign.squadSize}`;
    const selected = squad.map((id) => heroById.get(id));
    const road = selected.filter((hero) => hero.slot === "road").length;
    const antiAir = selected.filter((hero) => hero.class === "Mage" || hero.class === "Archer").length;
    q("[data-td-squad-coverage]").textContent = `${road} road · ${selected.length - road} platform · ${antiAir} anti-air`;
    const powerEl = q("[data-td-squad-power]");
    powerEl.hidden = !selected.length;
    if (selected.length) {
      const squadPower = selected.reduce((sum, hero) => sum + heroPower(hero, heroLevel(p, hero.id)), 0);
      const recommended = recommendedPower(stage);
      powerEl.textContent = `Squad power ${squadPower.toLocaleString()} / recommended ${recommended.toLocaleString()}`;
      powerEl.classList.toggle("is-strong", squadPower >= recommended);
      powerEl.classList.toggle("is-weak", squadPower < recommended);
    }
    const noAir = hasEnemy(stage, "flyer") && !antiAir;
    feedbackEl.textContent = noAir ? "Flyers in this stage: bring a Mage or Archer for air damage."
      : squad.length === campaign.squadSize ? "Squad full. Drag a hero onto a slot to swap, or tap a slot to free it." : `Tap or drag up to ${campaign.squadSize} heroes into the slots. Campaign levels apply; Divine Blessings do not.`;
    feedbackEl.classList.toggle("is-warning", noAir);
    const slotLabel = (hero: any) => hero.slot === "road" ? "Road" : "Platform";
    // Slots: portrait card only, class icon on the art, battle gold cost above. Tap or drag out to remove.
    lineupEl.innerHTML = Array.from({ length: campaign.squadSize }, (_, i) => {
      const hero = selected[i];
      if (!hero) return `<span class="td-squad-slot is-empty" data-squad-slot="${i}"><span class="td-squad-slot-card"><strong aria-hidden="true">+</strong></span><span class="td-squad-slot-cost" aria-hidden="true"></span></span>`;
      return `<button type="button" class="td-squad-slot" data-class="${hero.class.toLowerCase()}" data-squad-slot="${i}" data-squad-remove="${hero.id}" aria-label="${hero.name}, ${hero.class}, ${hero.cost} battle gold. Remove from squad">
        <span class="td-squad-slot-card"><img class="td-squad-slot-portrait" src="${hero.image}" alt=""><span class="td-squad-slot-class">${classGlyph(hero.class, 16)}</span></span>
        <span class="td-squad-slot-cost" aria-hidden="true">◈ ${hero.cost}</span></button>`;
    }).join("");
    // Roster: portrait, name, class icon and level only. Locked heroes trail the owned ones, dimmed.
    const order = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
    const heroes = [...data.heroes].sort((a: any, b: any) => order.indexOf(a.class) - order.indexOf(b.class) || a.cost - b.cost);
    const tile = (hero: any) => {
      const owned = p.owned.includes(hero.id), picked = squad.includes(hero.id);
      const unlock = owned ? null : allStages(campaign).find((entry: any) => (entry.rewards ?? []).some((reward: any) => reward.type === "hero" && reward.id === hero.id));
      const skill = data.tuning.heroSkills?.[hero.id];
      const tip = owned ? `${hero.name} · ${hero.class} · ${slotLabel(hero)}. ${ROLE_HINTS[hero.class] ?? ""}${skill ? ` Skill: ${skill.skillName}.` : ""}`
        : `${hero.name}: ${unlock ? `clear stage ${unlock.id}` : "obtain through Summon"}`;
      return `<button type="button" class="td-squad-tile${picked ? " is-picked" : ""}${owned ? "" : " is-locked"}" data-class="${hero.class.toLowerCase()}" data-squad-hero="${hero.id}" aria-pressed="${picked}" title="${tip}"${owned ? "" : " disabled"}>
        <img class="td-squad-tile-portrait" src="${hero.image}" alt="" loading="lazy">
        <span class="td-squad-tile-class">${classGlyph(hero.class, 14)}</span>
        ${picked ? `<span class="td-squad-tile-check" aria-hidden="true">✓</span>` : ""}
        <span class="td-squad-tile-name">${hero.name}</span>
        <small>${owned ? `<span class="td-squad-tile-role">${hero.class}</span> · Lv ${heroLevel(p, hero.id)}` : unlock ? `Stage ${unlock.id}` : "Summon"}</small></button>`;
    };
    const ownedHeroes = heroes.filter((h: any) => p.owned.includes(h.id));
    squadListEl.innerHTML = [...ownedHeroes, ...heroes.filter((h: any) => !p.owned.includes(h.id))].map(tile).join("");
    q<HTMLButtonElement>("[data-td-squad-clear]").disabled = !squad.length;
    squadStart.disabled = !validSquad(campaign, p, squad);
    squadStart.textContent = squad.length ? `Start stage ${stage.id}` : "Pick at least one hero";
    return true;
  }

  // Heroes screen: owned heroes and their three campaign upgrades, one tab each:
  // Level (Gold + Hero XP), Stars (spare copies of any hero + Gold: attack and health) and
  // Evolution (a copy of the same hero or Divine Essence: ultimate and crit).
  function renderHeroes() {
    const p = progress();
    q("[data-td-heroes-copy]").textContent = "Level, Stars and Evolution apply in campaign stages only.";
    walletEls.forEach((el) => { el.textContent = wallet(); });
    const order = ["Tank", "Warrior", "Assassin", "Mage", "Archer", "Support"];
    const heroes = [...data.heroes].sort((a: any, b: any) => Number(!p.owned.includes(a.id)) - Number(!p.owned.includes(b.id)) || order.indexOf(a.class) - order.indexOf(b.class) || a.cost - b.cost);
    const owned = heroes.filter((hero: any) => p.owned.includes(hero.id));
    if (!selectedHeroId || !p.owned.includes(selectedHeroId)) selectedHeroId = owned[0]?.id ?? null;
    q("[data-td-heroes-count]").textContent = `${p.owned.length} / ${heroes.length}`;
    heroListEl.innerHTML = heroes.map((hero: any) => {
      const isOwned = p.owned.includes(hero.id);
      const unlock = allStages(campaign).find((entry: any) => (entry.rewards ?? []).some((reward: any) => reward.type === "hero" && reward.id === hero.id));
      const tier = heroEvolution(p, hero.id);
      const note = isOwned ? `Lv ${heroLevel(p, hero.id)} · ${heroStars(p, hero.id)}★${tier ? ` · ${roman(tier)}` : ""}` : unlock ? `Stage ${unlock.id}` : "Summon";
      const ready = isOwned && (canLevelUp(campaign, p, hero.id) || evolutionMaterial(campaign, p, hero.id) === "copy");
      return `<button type="button" class="td-hero-tile${hero.id === selectedHeroId ? " is-selected" : ""}${isOwned ? "" : " is-locked"}" data-camp-hero-select="${hero.id}" aria-pressed="${hero.id === selectedHeroId}"${isOwned ? "" : " disabled"}>
        ${ready ? `<i class="td-hero-tile-dot" role="img" aria-label="Upgrade available"></i>` : ""}
        <img src="${hero.portrait ?? hero.image}" alt="" loading="lazy"><span><strong>${hero.name}</strong><small>${note}</small></span></button>`;
    }).join("");
    const hero = heroById.get(selectedHeroId ?? "");
    if (!hero) { q("[data-td-hero-detail]").innerHTML = ""; return; }
    const skill = data.tuning.heroSkills?.[hero.id];
    const tabs = (["level", "stars", "evolution"] as const).map((id) => `<button type="button" class="td-hero-tab${heroTab === id ? " is-active" : ""}" data-camp-hero-tab="${id}" aria-pressed="${heroTab === id}">${{ level: "Level", stars: "Stars", evolution: "Evolution" }[id]}</button>`).join("");
    const body = heroTab === "stars" ? starsPanel(p, hero) : heroTab === "evolution" ? evolutionPanel(p, hero) : levelPanel(p, hero);
    q("[data-td-hero-detail]").innerHTML = `<article class="td-hero-profile">
      <div class="td-hero-profile-art"><img src="${hero.portrait ?? hero.image}" alt="${hero.name}"></div>
      <div class="td-hero-profile-copy"><span class="td-label">Selected hero</span><h2>${hero.name}</h2>
      <p class="td-hero-role">${classIconImg(hero.class, 18)}${hero.class} · ${hero.slot === "road" ? "Road defender" : "Platform defender"}</p>
      <p class="td-hero-badges">${stars(heroStars(p, hero.id))}${heroEvolution(p, hero.id) ? `<span class="td-evo-badge">Evolved ${roman(heroEvolution(p, hero.id))}</span>` : ""}${p.copies?.[hero.id] ? `<span>${p.copies[hero.id]} spare ${p.copies[hero.id] === 1 ? "copy" : "copies"}</span>` : ""}</p>
      <div class="td-hero-tabs">${tabs}</div>
      ${body}
      ${skill && heroTab !== "evolution" ? `<div class="td-hero-skill"><span class="td-label">Signature skill</span><strong>${skill.skillName}</strong><p>${SKILL_TEXT[skill.variant] ?? ROLE_HINTS[hero.class] ?? ""}</p></div>` : ""}
      </div></article>`;
  }

  // Attack and health in campaign stages: base x level x stars.
  const heroScale = (p: any, id: string, level = heroLevel(p, id), starCount = heroStars(p, id)) => levelScale(campaign, level) * starScale(campaign, starCount);
  const statRows = (hero: any, now: number, next: number | null) => {
    const row = (label: string, base: number) => `<div><dt>${label}</dt><dd>${Math.round(base * now).toLocaleString()}${next ? ` <span class="td-camp-gain">→ ${Math.round(base * next).toLocaleString()}</span>` : ""}</dd></div>`;
    return `<dl class="td-camp-stats td-hero-profile-stats">${row("Attack", hero.atk)}${row("Health", hero.hp)}<div><dt>Deploy cost</dt><dd>${hero.cost} Gold</dd></div></dl>`;
  };

  function levelPanel(p: any, hero: any) {
    const max = campaign.heroLevels?.max ?? 1;
    const level = heroLevel(p, hero.id);
    const cost = levelUpCost(campaign, level);
    const button = cost
      ? `<button type="button" class="action-button action-button--primary td-camp-levelup" data-camp-levelup="${hero.id}"${canLevelUp(campaign, p, hero.id) ? "" : " disabled"}>Level up <small>${costText(cost)}</small></button>`
      : `<span class="td-camp-maxed">Maximum level reached</span>`;
    return `<p class="td-hero-tab-copy">Each level adds ${Math.round((campaign.heroLevels?.statPerLevel ?? 0) * 100)}% attack and health.</p>
      <div class="td-hero-level-head"><strong>Campaign level ${level}</strong><span>${level} / ${max}</span></div>
      <span class="td-camp-pips" aria-hidden="true">${Array.from({ length: max }, (_, n) => `<i${n < level ? " class=\"is-on\"" : ""}></i>`).join("")}</span>
      ${statRows(hero, heroScale(p, hero.id), cost ? heroScale(p, hero.id, level + 1) : null)}
      <div class="td-hero-upgrade">${button}</div>`;
  }

  // Stars: pick exactly the cost's number of spare copies (any hero). Quick add only uses
  // copies no Evolution still needs; tap a copy to add it, tap a filled slot to remove it.
  const fodderCount = () => Object.values(fodder).reduce((sum, n) => sum + n, 0);
  function starsPanel(p: any, hero: any) {
    const starCount = heroStars(p, hero.id);
    const max = campaign.heroStars?.max ?? 5;
    const cost = starUpCost(campaign, starCount);
    const per = Math.round((campaign.heroStars?.statPerStar ?? 0) * 100);
    if (!cost) return `<p class="td-hero-tab-copy">Each star adds ${per}% attack and health.</p>${statRows(hero, heroScale(p, hero.id), null)}<span class="td-camp-maxed">Maximum stars reached</span>`;
    const slots = Object.entries(fodder).flatMap(([id, n]) => Array.from({ length: n }, () => id));
    const slotHtml = Array.from({ length: cost.copies }, (_, i) => {
      const id = slots[i];
      const h = id ? heroById.get(id) : null;
      return h ? `<button type="button" class="td-fodder-slot is-filled" data-camp-fodder-remove="${id}" aria-label="Remove ${h.name} copy"><img src="${h.portrait ?? h.image}" alt=""><small>${h.name}</small></button>` : `<span class="td-fodder-slot" aria-hidden="true">+</span>`;
    }).join("");
    // The hero's own copies are its Evolution material and are not offered here.
    const spare = Object.entries(p.copies ?? {}).filter(([id, n]) => id !== hero.id && (n as number) > 0);
    const pickHtml = spare.length ? spare.map(([id, n]) => {
      const h = heroById.get(id);
      const free = (n as number) - (fodder[id] ?? 0);
      return `<button type="button" class="td-fodder-pick" data-camp-fodder-add="${id}"${free > 0 && fodderCount() < cost.copies ? "" : " disabled"}><img src="${h?.portrait ?? h?.image}" alt=""><strong>${h?.name ?? id}</strong><small>${free} left</small></button>`;
    }).join("") : `<p class="td-hero-tab-copy">No spare copies of other heroes yet. Summon heroes you already own to get copies.</p>`;
    const full = fodderCount() === cost.copies;
    const goldOk = (p.currencies.gold || 0) >= cost.gold;
    return `<p class="td-hero-tab-copy">Each star adds ${per}% attack and health. Star up uses spare copies of other heroes; ${hero.name}'s own copies are kept for Evolution.</p>
      <div class="td-hero-level-head"><strong>${stars(starCount)}</strong><span>${starCount} / ${max}</span></div>
      ${statRows(hero, heroScale(p, hero.id), heroScale(p, hero.id, undefined, starCount + 1))}
      <div class="td-fodder"><div class="td-fodder-head"><span class="td-label">Copies needed</span><span>${fodderCount()} / ${cost.copies}</span></div>
      <div class="td-fodder-slots">${slotHtml}</div>
      <div class="td-fodder-picks">${pickHtml}</div></div>
      <div class="td-hero-upgrade td-hero-upgrade--split">
        <button type="button" class="action-button action-button--quiet" data-camp-fodder-auto${spare.length ? "" : " disabled"}>Quick add</button>
        <button type="button" class="action-button action-button--primary td-camp-levelup" data-camp-starup="${hero.id}"${full && goldOk ? "" : " disabled"}>Star up <small>${cost.gold} Gold</small></button>
      </div>`;
  }

  // Evolution: tiers I-V with their bonus; each costs a copy of this hero (used first) or
  // 1 Divine Essence. Spare copies can also become Seal Dust here.
  function evolutionPanel(p: any, hero: any) {
    const tier = heroEvolution(p, hero.id);
    const tiers = campaign.heroEvolution?.tiers ?? [];
    const copies = p.copies?.[hero.id] ?? 0;
    const essence = p.currencies.divineEssence || 0;
    if (evoPick === "copy" && !copies) evoPick = null;
    if (evoPick === "essence" && !essence) evoPick = null;
    const list = tiers.map((entry: any, i: number) => `<li class="${i < tier ? "is-done" : i === tier ? "is-next" : "is-locked"}"><span class="td-evo-mark" aria-hidden="true">${i < tier ? "✓" : roman(i + 1)}</span><span><strong>${entry.name}</strong><small>${entry.text}</small></span></li>`).join("");
    const maxed = tier >= tiers.length;
    // The player picks the material (tap a slot), then confirms with Evolve.
    const slot = (kind: "copy" | "essence", have: number, inner: string, label: string) => `<button type="button" class="td-evo-slot${kind === "essence" ? " td-evo-slot--essence" : ""}${have ? " is-ready" : ""}${evoPick === kind ? " is-picked" : ""}" data-camp-evo-pick="${kind}" aria-pressed="${evoPick === kind}" aria-label="${label}"${have ? "" : " disabled"}>${inner}</button>`;
    const materialHtml = maxed ? "" : `<div class="td-evo-material">
        ${slot("copy", copies, `<img src="${hero.portrait ?? hero.image}" alt=""><small>${copies} ${copies === 1 ? "copy" : "copies"}</small>`, `Use 1 copy of ${hero.name} (${copies} owned)`)}
        <span>or</span>
        ${slot("essence", essence, `<span aria-hidden="true">✦</span><small>${essence} Essence</small>`, `Use 1 Divine Essence (${essence} owned)`)}
        <p>${evoPick === "copy" ? `Uses 1 copy of ${hero.name}.` : evoPick === "essence" ? "Uses 1 Divine Essence." : copies || essence ? "Tap a material to use it." : `Needs a copy of ${hero.name} or 1 Divine Essence.`}</p>
      </div>`;
    const dustPer = summonCfg.dust?.perCopy ?? 0;
    return `<p class="td-hero-tab-copy">Evolution improves the ultimate and crit chance, one tier per copy of ${hero.name}.</p>
      <ol class="td-evo-tiers">${list}</ol>
      ${materialHtml}
      <div class="td-hero-upgrade td-hero-upgrade--split">
        ${copies && dustPer ? `<button type="button" class="action-button action-button--quiet" data-camp-dust="${hero.id}">1 copy → ${dustPer} Dust</button>` : ""}
        ${maxed ? `<span class="td-camp-maxed">Fully evolved</span>` : `<button type="button" class="action-button action-button--primary td-camp-levelup" data-camp-evolve="${hero.id}"${evoPick ? "" : " disabled"}>Evolve to ${roman(tier + 1)}</button>`}
      </div>`;
  }

  // Summon screen: the banner, its cost, the player's Divine Seals and Seal Dust, x1 / x10.
  // `fresh` (entering the screen) closes the last reveal.
  // Summonable roster: stage reward heroes join only once earned (their stage's first clear
  // gives them; a summon never takes it first). Owned heroes come back as spare copies.
  const reserved = new Set(stageRewardHeroes(campaign));
  const allHeroIds = () => data.heroes.map((hero: any) => hero.id as string).filter((id: string) => !reserved.has(id) || progress().owned.includes(id));
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
    summonWalletEl.textContent = `✧ ${seals.toLocaleString()} Divine Seals`;
    const ok = canSummon(summonCfg, banner.id, p, ids);
    summonButton.disabled = !ok;
    summonButton.toggleAttribute("data-td-autofocus", ok);
    summonButton.textContent = `Summon x1 · ${banner.cost.divineSeals} ✧`;
    const multi = Number(banner.multiCount) || 10;
    summonMultiButton.disabled = !multiSummonCount(summonCfg, banner.id, p, ids);
    summonMultiButton.textContent = `Summon x${multi} · ${(banner.cost.divineSeals * multi).toLocaleString()} ✧`;
    q("[data-td-summon-price]").textContent = `${costText(banner.cost)} per summon`;
    q("[data-td-summon-pool-count]").textContent = left ? `${left} not owned yet` : "All owned";
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
      ? "Divine Seals come from first clears in Campaign, the Daily Trial goal and finished Expeditions. Featured heroes rotate every two weeks. Stage-reward heroes join this banner once earned."
      : "All current campaign stages are cleared. Divine Seals still come from the Daily Trial goal, finished Expeditions and Seal Dust.";
    summonNoteEl.textContent = canAfford(p, banner.cost) ? "Summon available" : `${Math.max(0, banner.cost.divineSeals - seals)} more needed`;
    // Seal Dust: spare copies turned to dust on the Heroes screen buy Divine Seals or Essence.
    const d = summonCfg.dust ?? {};
    q("[data-td-dust-wallet]").textContent = `${dust.toLocaleString()} Seal Dust · ${(p.currencies.divineEssence || 0).toLocaleString()} Divine Essence`;
    const sealsFor = Math.floor(dust / (d.perSeal || Infinity));
    const sealsButton = q<HTMLButtonElement>("[data-td-dust-seals]");
    sealsButton.disabled = sealsFor < 1;
    sealsButton.textContent = sealsFor ? `${(sealsFor * d.perSeal).toLocaleString()} Dust → ${sealsFor.toLocaleString()} Divine Seals` : `${d.perSeal} Dust → 1 Divine Seal`;
    const essenceButton = q<HTMLButtonElement>("[data-td-dust-essence]");
    essenceButton.disabled = dust < d.perEssence;
    essenceButton.textContent = `${d.perEssence} Dust → 1 Divine Essence`;
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
    copyButton.textContent = `${d.copyPrice} Dust → 1 copy`;
    if (fresh) summonReveal.close();
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
    if (startButton) { const id = startButton.dataset.campDrawerStart!; closeDrawer(); openStage(id); }
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
  q("[data-td-squad-clear]").addEventListener("click", () => {
    squad = [];
    renderSquad();
  });
  q("[data-td-squad-preset]").addEventListener("click", () => {
    const owned = data.heroes.filter((hero: any) => progress().owned.includes(hero.id));
    squad = ["Warrior", "Mage", "Archer", "Support"].map((cls) => owned.find((hero: any) => hero.class === cls)?.id).filter(Boolean).slice(0, campaign.squadSize);
    renderSquad();
    feedbackEl.textContent = "Quick pick: a road fighter, splash damage, anti-air and healing. Swap any hero to try another approach.";
  });
  squadStart.addEventListener("click", start);
  ctx.root.querySelector<HTMLElement>('[data-td-screen="heroes"]')!.addEventListener("click", (event) => {
    const select = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-camp-hero-select]");
    if (select && !select.disabled) {
      if (selectedHeroId !== select.dataset.campHeroSelect) { fodder = {}; evoPick = null; }
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
    const el = target.closest<HTMLButtonElement>("[data-camp-hero-tab], [data-camp-evo-pick], [data-camp-fodder-add], [data-camp-fodder-remove], [data-camp-fodder-auto], [data-camp-starup], [data-camp-evolve], [data-camp-dust]");
    if (!el || el.disabled || !selectedHeroId) return !!el;
    const id = selectedHeroId;
    const d = el.dataset;
    const p = progress();
    if (d.campHeroTab) {
      heroTab = d.campHeroTab as typeof heroTab;
      fodder = {};
      evoPick = null;
      renderHeroes();
      q("[data-td-hero-detail]").querySelector<HTMLButtonElement>(`[data-camp-hero-tab="${heroTab}"]`)?.focus({ preventScroll: true });
    } else if (d.campEvoPick) {
      evoPick = evoPick === d.campEvoPick ? null : d.campEvoPick as typeof evoPick;
      renderHeroes();
      q("[data-td-hero-detail]").querySelector<HTMLButtonElement>(evoPick ? "[data-camp-evolve]" : `[data-camp-evo-pick="${d.campEvoPick}"]`)?.focus({ preventScroll: true });
    } else if (d.campFodderAdd || d.campFodderRemove || el.hasAttribute("data-camp-fodder-auto")) {
      const need = starUpCost(campaign, heroStars(p, id))?.copies ?? 0;
      if (d.campFodderAdd) fodder = { ...fodder, [d.campFodderAdd]: (fodder[d.campFodderAdd] ?? 0) + 1 };
      else if (d.campFodderRemove) { fodder = { ...fodder, [d.campFodderRemove]: fodder[d.campFodderRemove] - 1 }; if (!fodder[d.campFodderRemove]) delete fodder[d.campFodderRemove]; }
      else {
        const auto = autoFodder(campaign, p, need, id);
        if (auto) fodder = auto;
        else ctx.notice("Not enough spare copies of other heroes.");
      }
      renderHeroes();
      const again = d.campFodderAdd ? `[data-camp-fodder-add="${d.campFodderAdd}"]` : "[data-camp-starup]";
      (q("[data-td-hero-detail]").querySelector<HTMLButtonElement>(`${again}:not([disabled])`) ?? q("[data-td-hero-detail]").querySelector<HTMLButtonElement>("[data-camp-starup]"))?.focus({ preventScroll: true });
    } else if (d.campStarup) {
      const next = starUp(campaign, p, id, fodder);
      if (!next) return true;
      fodder = {};
      commit(next, `${heroName(id)} reached ${heroStars(next, id)} stars.`, "[data-camp-fodder-auto]");
    } else if (d.campEvolve) {
      if (!evoPick) return true;
      const next = evolve(campaign, p, id, evoPick === "essence");
      if (!next) return true;
      evoPick = null;
      commit(next, `${heroName(id)} evolved to ${roman(heroEvolution(next, id))}.`, "[data-camp-evo-pick]");
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
  q("[data-td-dust-essence]").addEventListener("click", () => {
    const next = exchangeDust(summonCfg, progress(), "essence", 1);
    if (!next) return;
    store.data.campaign = next as CampaignProgress;
    store.persist();
    renderSummon();
    render();
    ctx.notice("+1 Divine Essence from Seal Dust.");
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
    store.data.campaign = result.progress as CampaignProgress;
    store.persist();
    renderSummon();
    render();
    const again = count === 1 ? canSummon(summonCfg, banner.id, progress(), allHeroIds()) : multiSummonCount(summonCfg, banner.id, progress(), allHeroIds()) === count;
    summonReveal.open(result.heroIds, {
      featuredId: featuredHeroId(banner),
      isNew: result.isNew,
      skip: summonSkipInput.checked,
      again: { label: `Summon x${count} again · ${(banner.cost.divineSeals * count).toLocaleString()} ✧`, enabled: again },
    });
  }

  summonButton.addEventListener("click", () => doSummon(1));
  summonMultiButton.addEventListener("click", () => doSummon(multiSummonCount(summonCfg, banner.id, progress(), allHeroIds())));
  summonSkipInput.addEventListener("change", () => {
    try { localStorage.setItem(SKIP_KEY, summonSkipInput.checked ? "1" : "0"); } catch { /* storage blocked */ }
  });

  return { render, renderSquad, renderHeroes, renderSummon, selectStage };
}
