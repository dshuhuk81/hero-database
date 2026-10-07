// Hero panel (M22): full-height side panel next to the map, or a sheet below the map on
// portrait screens. Permanent progress, target, relocate, sell and details. Buttons are updated
// in place so focus survives game events. The game keeps running while the panel is open.
import { CLASS_ROLES, heroProgress, worldToLocal } from "../ui.js";
import { patternSvg } from "../board.js";
import type { PageContext } from "./context";
import { classGlyph } from "../assets.js";
import { RING_INFO } from "../skills.js";
import { roman } from "./route";
import campaignData from "../../../data/tdCampaign.json" with { type: "json" };

// Layout: "push" narrows the stage so the whole map sits beside the panel, as long as the map
// keeps at least PUSH_MIN_MAP px of width. Narrower stages overlay the map on the right (desktop)
// or, on touch landscape, on the side away from the hero; portrait stages dock a sheet below the
// map (at least SHEET_MIN px tall).
const PUSH_MIN_MAP = 520;
const SHEET_MIN = 220;
const STAR_MAX = (campaignData as any).heroStars?.max ?? 5;
const SKILL_SHORT: Record<string, string> = { ultimate: "Ultimate", passiveAttack: "Attack", passiveHealth: "Health" };
const HERO_RADIUS = 36; // world units kept clear around the selected hero

export function createPopover(ctx: PageContext) {
  const { q, state, data, heroById } = ctx;
  const stageEl = q("[data-td-stage]");
  const popover = q("[data-td-popover]");
  const popBody = q(".td-popover-body");
  const popName = q("[data-pop-name]");
  const popLevel = q("[data-pop-level]");
  const popBadges = q("[data-pop-badges]");
  const popPortrait = q<HTMLImageElement>("[data-pop-portrait]");
  const popClassIcon = q<HTMLElement>("[data-pop-class-icon]");
  const popHpBar = q<HTMLProgressElement>("[data-pop-hp-bar]");
  const popHp = q("[data-pop-hp]");
  const popAtk = q("[data-pop-atk]");
  const popAps = q("[data-pop-aps]");
  const popRange = q("[data-pop-range]");
  const popRangeLabel = q("[data-pop-range-label]");
  const popCrit = q("[data-pop-crit]");
  const popProgress = q("[data-pop-progress]");
  const popRelocate = q<HTMLButtonElement>("[data-pop-relocate]");
  const popRelocateCost = q("[data-pop-relocate-cost]");
  const popPreview = q("[data-pop-preview]");
  const popDetailsButton = q<HTMLButtonElement>("[data-pop-details]");
  const popDetails = q("[data-pop-details-body]");
  const popSell = q<HTMLButtonElement>("[data-pop-sell]");
  const popTarget = q("[data-pop-target]");
  const popTargetLabel = q("[data-pop-target-label]");
  const targetButtons = [...popTarget.querySelectorAll<HTMLButtonElement>("[data-target]")];
  let sellArmed = false; // selling needs a second tap to confirm
  const TARGET_NAMES: Record<string, string> = { first: "First enemy", last: "Last enemy", strongest: "Highest health", weakest: "Lowest health", fastest: "Fastest enemy", ground: "Ground first", flying: "Flyers first", boss: "Boss first" };
  // What "auto" does per class (targetOrder / dashTarget in sim.js).
  const CLASS_TARGETS: Record<string, string> = { Archer: "highest health", Assassin: "loose enemies, then lowest health", Support: "heal first, then first enemy" };
  const coarsePointer = window.matchMedia?.("(pointer: coarse)");
  let forcedPush = false; // overlay fitted on neither side of this hero: push instead (no flip-flop)
  let lastHealthUpdate = 0;

  const findUnit = (entityId: number | null) => state.session?.game.heroes.find((unit: any) => unit.entityId === entityId);

  function select(unit: any) {
    const session = state.session;
    if (!session) return;
    ctx.actions.cancelDeploy();
    ctx.actions.closeSheet(false);
    state.selectedEntityId = unit.entityId;
    session.game.uiSelected = unit.entityId;
    setSection(popDetailsButton, popDetails, false); // always starts collapsed
    sellArmed = false;
    forcedPush = false;
    popover.hidden = false;
    popBody.scrollTop = 0;
    update(unit);
    position();
    ctx.actions.renderDeck();
  }

  function close(restoreFocus = true) {
    if (state.selectedEntityId === null && popover.hidden) return;
    const hadFocus = popover.contains(document.activeElement);
    popover.hidden = true;
    setLayout(null);
    state.selectedEntityId = null;
    if (state.session) state.session.game.uiSelected = null;
    ctx.actions.renderDeck();
    if (restoreFocus && hadFocus) state.session?.canvas.focus({ preventScroll: true });
  }

  // Closes on stale selection (hero died, run over), otherwise refreshes values.
  function refresh() {
    if (state.selectedEntityId === null) return;
    const unit = findUnit(state.selectedEntityId);
    if (!unit || state.session?.game.complete) { close(); return; }
    update(unit);
  }

  function updateHealth(unit: any) {
    popHpBar.max = unit.hp;
    popHpBar.value = Math.max(0, unit.hpLeft);
    popHp.textContent = `${Math.ceil(Math.max(0, unit.hpLeft))} / ${unit.hp} health`;
  }

  // Attack is the effective value (aura, synergy, ultimate buff, run modifiers), so it moves with positions.
  function updateStats(unit: any) {
    const atk = Math.round(state.session!.game.attackValue(unit));
    popAtk.textContent = String(atk);
    popAtk.classList.toggle("is-buffed", atk > unit.atk);
    popAtk.title = atk > unit.atk ? `Base ${unit.atk}, boosted by auras, synergy or buffs` : "";
    popAps.textContent = `${Math.round(unit.aps * 100) / 100}/s`;
    // Board maps: the attack pattern as a grid instead of the range number.
    const pattern = state.session!.game.patternOf(unit);
    if (pattern) popRange.innerHTML = patternSvg(pattern, 6);
    else popRange.textContent = String(Math.round(unit.range));
    popRangeLabel.textContent = pattern ? "Reach" : "Range";
    popCrit.textContent = `${Math.round(unit.critChance * 1000) / 10}%`;
  }

  // Target priority icons (M1). Road heroes cannot hit flyers, so that option is hidden.
  function updateTargeting(unit: any) {
    const mode = unit.targeting ?? "auto";
    for (const button of targetButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.target === mode));
      if (button.dataset.target === "flying") button.hidden = unit.slotType === "road";
    }
    popTargetLabel.textContent = mode === "auto" ? `Class rule: ${CLASS_TARGETS[unit.class] ?? "first enemy"}` : TARGET_NAMES[mode];
  }

  function update(unit: any) {
    const game = state.session!.game;
    popName.textContent = unit.name;
    const image = heroById.get(unit.id)?.image ?? "";
    if (popPortrait.dataset.hero !== unit.id) { popPortrait.dataset.hero = unit.id; popPortrait.dataset.rarity = heroById.get(unit.id)?.rarity ?? ""; popPortrait.hidden = !image; if (image) popPortrait.src = image; }
    if (popClassIcon.dataset.cls !== unit.class) { popClassIcon.innerHTML = classGlyph(unit.class, 14); popClassIcon.dataset.cls = unit.class; popClassIcon.dataset.class = String(unit.class || "").toLowerCase(); }
    // Collection stars, Evolution and skill levels (every mode; they are already in the stats).
    const progress = heroProgress(unit);
    const { stars, evolution: evo } = progress;
    const badgeKey = `${unit.id}:${stars}:${evo}`;
    if (popBadges.dataset.key !== badgeKey) {
      popBadges.dataset.key = badgeKey;
      popBadges.hidden = false;
      popBadges.innerHTML =
        `<span class="td-stars" aria-label="${stars} of ${STAR_MAX} stars">${"★".repeat(stars)}<span aria-hidden="true">${"★".repeat(Math.max(0, STAR_MAX - stars))}</span></span>` +
        (evo ? `<span class="td-evo-badge">Evolved ${roman(evo)}</span>` : "");
    }
    popLevel.textContent = unit.class;
    popProgress.textContent = `Level ${progress.level} · Skills: ${progress.skills.map((skill) => `${SKILL_SHORT[skill.id] ?? skill.id} ${skill.level}`).join(", ")}`;
    const refund = game.sellValue(unit.entityId);
    popSell.textContent = sellArmed ? `Confirm +${refund}` : "Sell";
    popSell.classList.toggle("is-armed", sellArmed);
    popSell.title = `Remove ${unit.name} from the field and refund its ${refund} Nectar.`;
    updateHealth(unit);
    updateStats(unit);
    updateTargeting(unit);
    // Relocation (R4): any time (a short cooldown per hero), to an empty tile of the same type, for a share of the deployment cost.
    const move = game.relocationInfo(unit.entityId);
    popRelocate.disabled = !move.ok || game.placement < (move.cost ?? Infinity);
    popRelocateCost.textContent = Number.isFinite(move.cost) ? (move.cost === 0 ? "Free" : `${move.cost} Nectar`) : "";
    popPreview.textContent = !move.ok ? move.reason || ""
      : game.placement < move.cost ? `Needs ${move.cost} Nectar to relocate, you have ${game.placement}.`
      : `Move ${unit.name} to an empty ${unit.slotType} tile. Health, charge and cooldowns stay.`;
    if (!popDetails.hidden) popDetails.innerHTML = detailsHtml(unit);
  }

  function setSection(button: HTMLButtonElement, body: HTMLElement, open: boolean) {
    body.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  function detailsHtml(unit: any) {
    const game = state.session!.game;
    const lines: string[] = [];
    const role = (CLASS_ROLES as Record<string, string>)[unit.class];
    if (role) lines.push(`<p class="td-aura-line">${unit.class}: ${role}</p>`);
    const auraPct = Math.round((data.tuning.support?.passiveAuraBonus ?? 0.1) * 100);
    if (unit.ability === "aura") {
      const allies = game.heroes.filter((ally: any) => ally !== unit && Math.hypot(unit.x - ally.x, unit.y - ally.y) <= unit.range);
      lines.push(allies.length
        ? `<p class="td-aura-line">Aura: ${allies.map((ally: any) => ally.name).join(", ")} gain${allies.length === 1 ? "s" : ""} +${auraPct}% attack inside the ring.</p>`
        : `<p class="td-aura-line">Aura: no allies inside the ring. The +${auraPct}% attack bonus is positional.</p>`);
    } else {
      const aura = game.supportAuraFor(unit);
      if (aura) lines.push(`<p class="td-aura-line">Receiving +${auraPct}% attack from ${aura.source.name}'s aura.</p>`);
    }
    const links = game.synergyLinksFor(unit);
    if (links.length) {
      const parts = links.map((link: any) => `${link.hero.name} (${link.shared.length} tag${link.shared.length !== 1 ? "s" : ""})`).join(", ");
      lines.push(`<p class="td-aura-line">Synergy +${Math.round(game.synergyBonusFor(unit) * 100)}% attack with ${parts}.</p>`);
    }
    if (unit.variant === "valkyrie_call") {
      lines.push(`<p class="td-aura-line">${unit.skillName ?? "Ultimate"}: revives the most recently fallen hero on its free tile with ${unit.awakenedUlt ? "full" : "half"} health. Heals nearby allies when nobody can be revived.</p>`);
    }
    if (unit.variant === "soul_drain") {
      lines.push(`<p class="td-aura-line">${unit.skillName ?? "Ultimate"}: heavy hit on the weakest enemy in range that stuns it for ${unit.awakenedUlt ? 3 : 2} seconds. A kill refunds ${unit.awakenedUlt ? 80 : 60}% of the charge.</p>`);
    }
    const ring = (RING_INFO as Record<string, { name: string; text: string }>)[game.ringKind(unit.slotType, unit.slotIndex)];
    if (ring) lines.push(`<p class="td-aura-line">Standing on ${ring.name}: ${ring.text}</p>`);
    lines.push(`<p>Level, stars, Evolution and skill levels come from your collection and are already included in this hero's stats. Upgrade heroes in the lobby; the upgrades apply in every mode.</p>`);
    return lines.join("");
  }

  // Layout state lives on the stage (data-hero-panel + CSS variables) so the map, notices and
  // chips can make room. In push mode the stage gets a right padding of the panel width; the
  // renderer refits the map into the rest (ResizeObserver in session.ts) and calls position() again.
  function setLayout(mode: "push" | "left" | "right" | "sheet" | null, width = 0, top = 0) {
    popover.dataset.side = mode === "push" || mode === null ? "right" : mode;
    if (mode) stageEl.dataset.heroPanel = mode;
    else delete stageEl.dataset.heroPanel;
    if (mode && mode !== "sheet") stageEl.style.setProperty("--td-hero-panel-w", `${width}px`);
    else stageEl.style.removeProperty("--td-hero-panel-w");
    if (mode === "sheet") stageEl.style.setProperty("--td-pop-top", `${top}px`);
    else stageEl.style.removeProperty("--td-pop-top");
  }

  function position() {
    const session = state.session;
    if (popover.hidden || !session) return;
    const unit = findUnit(state.selectedEntityId);
    if (!unit) return;
    const stageRect = stageEl.getBoundingClientRect();
    const wasPush = stageEl.dataset.heroPanel === "push";
    if (stageRect.height > stageRect.width) {
      // Portrait: sheet from the map's bottom edge down. The map is width-bound here, so the
      // hero stays above the sheet unless the stage is too short for SHEET_MIN.
      if (wasPush) { setLayout(null); return; } // the map refits first, then this runs again
      const canvasRect = session.canvas.getBoundingClientRect();
      const top = Math.min(canvasRect.bottom - stageRect.top, stageRect.height - SHEET_MIN);
      setLayout("sheet", 0, Math.max(0, Math.round(top)));
      return;
    }
    const side = popover.dataset.side === "left" ? "left" : "right";
    popover.dataset.side = side; // measure the side width, not the sheet width
    const panelWidth = popover.offsetWidth;
    if (forcedPush || stageRect.width - panelWidth >= PUSH_MIN_MAP) { setLayout("push", panelWidth); return; }
    if (wasPush) { setLayout(null); return; } // leaving push mode: wait for the map to refit
    // Overlay: dock on the side away from the hero, keeping the current side while it fits.
    const canvasRect = session.canvas.getBoundingClientRect();
    const hero = worldToLocal(canvasRect, stageRect, unit);
    const clear = HERO_RADIUS * canvasRect.width / 960 + 4;
    const fitsRight = hero.x + clear <= stageRect.width - panelWidth;
    const fitsLeft = hero.x - clear >= panelWidth;
    // Desktop keeps the panel on the right: overlay when the hero stays visible, else push.
    // Only touch landscape (short phones) swaps sides to keep the hero in view.
    if (!coarsePointer?.matches) {
      if (fitsRight) setLayout("right", panelWidth);
      else { forcedPush = true; setLayout("push", panelWidth); }
      return;
    }
    if (side === "left" && fitsLeft) setLayout("left", panelWidth);
    else if (fitsRight) setLayout("right", panelWidth);
    else if (fitsLeft) setLayout("left", panelWidth);
    else { forcedPush = true; setLayout("push", panelWidth); }
  }

  // Called from the frame loop; health changes every tick but the text only needs 4 updates a second.
  function tick(now: number) {
    if (popover.hidden || now - lastHealthUpdate <= 250) return;
    lastHealthUpdate = now;
    const unit = findUnit(state.selectedEntityId);
    if (!unit) return;
    updateHealth(unit);
    updateStats(unit);
  }

  popRelocate.addEventListener("click", () => {
    const session = state.session;
    if (!session || state.selectedEntityId === null) return;
    const info = session.game.relocationInfo(state.selectedEntityId);
    if (!info.ok) { ctx.notice(info.reason || "Relocation unavailable."); return; }
    ctx.actions.beginRelocation(state.selectedEntityId);
  });
  popTarget.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-target]");
    const session = state.session;
    if (!button || !session || state.selectedEntityId === null) return;
    session.game.setTargeting(state.selectedEntityId, button.dataset.target);
    const unit = findUnit(state.selectedEntityId);
    if (unit) updateTargeting(unit);
  });
  popSell.addEventListener("click", () => {
    const session = state.session;
    if (!session || state.selectedEntityId === null) return;
    if (!sellArmed) {
      sellArmed = true;
      const unit = findUnit(state.selectedEntityId);
      if (unit) update(unit);
      return;
    }
    sellArmed = false;
    const result = session.game.sell(state.selectedEntityId);
    if (result.ok) ctx.notice(`${result.hero.name} sold for ${result.refund} Nectar. The tile is free again.`);
  });
  q("[data-pop-close]").addEventListener("click", () => close());
  popDetailsButton.addEventListener("click", () => {
    const unit = findUnit(state.selectedEntityId);
    if (!unit) return;
    const open = !!popDetails.hidden; // hidden may also be "until-found" in the DOM types
    setSection(popDetailsButton, popDetails, open);
    if (open) popDetails.innerHTML = detailsHtml(unit);
  });

  return { select, close, refresh, position, tick, isOpen: () => !popover.hidden };
}
