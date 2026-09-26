// Hero panel (M22): full-height side panel next to the map, or a sheet below the map on
// portrait screens. Upgrade, target, rotate, sell and details. Buttons are updated in place so
// focus survives game events. The game keeps running while the panel is open.
import { CLASS_ROLES, worldToLocal } from "../ui.js";
import type { PageContext } from "./context";
import { classIcon } from "../assets.js";
import { AWAKEN_TEXT, PATH_INFO, RING_INFO } from "../skills.js";

// Layout: "push" narrows the stage so the whole map sits beside the panel, as long as the map
// keeps at least PUSH_MIN_MAP px of width. Narrower stages overlay the map on the side away from
// the hero; portrait stages dock a sheet below the map (at least SHEET_MIN px tall).
const PUSH_MIN_MAP = 520;
const SHEET_MIN = 220;
const HERO_RADIUS = 36; // world units kept clear around the selected hero

export function createPopover(ctx: PageContext) {
  const { q, state, data, maxLevel, heroById } = ctx;
  const stageEl = q("[data-td-stage]");
  const popover = q("[data-td-popover]");
  const popBody = q(".td-popover-body");
  const popName = q("[data-pop-name]");
  const popLevel = q("[data-pop-level]");
  const popPortrait = q<HTMLImageElement>("[data-pop-portrait]");
  const popClassIcon = q<HTMLImageElement>("[data-pop-class-icon]");
  const popHpBar = q<HTMLProgressElement>("[data-pop-hp-bar]");
  const popHp = q("[data-pop-hp]");
  const popAtk = q("[data-pop-atk]");
  const popAps = q("[data-pop-aps]");
  const popRange = q("[data-pop-range]");
  const popCrit = q("[data-pop-crit]");
  const popUpgrade = q<HTMLButtonElement>("[data-pop-upgrade]");
  const popUpgradeLabel = q("[data-pop-upgrade-label]");
  const popCost = q("[data-pop-cost]");
  const popPreview = q("[data-pop-preview]");
  const popDetailsButton = q<HTMLButtonElement>("[data-pop-details]");
  const popDetails = q("[data-pop-details-body]");
  const popFocus = q("[data-pop-focus]");
  const popSell = q<HTMLButtonElement>("[data-pop-sell]");
  const popPath = q("[data-pop-path]");
  const pathButtons = [...popPath.querySelectorAll<HTMLButtonElement>("[data-path-option]")];
  const popTarget = q("[data-pop-target]");
  const popTargetLabel = q("[data-pop-target-label]");
  const targetButtons = [...popTarget.querySelectorAll<HTMLButtonElement>("[data-target]")];
  let sellArmed = false; // selling needs a second tap to confirm
  const TARGET_NAMES: Record<string, string> = { first: "First enemy", last: "Last enemy", strongest: "Highest health", weakest: "Lowest health", fastest: "Fastest enemy", ground: "Ground first", flying: "Flyers first", boss: "Boss first" };
  // What "auto" does per class (targetOrder / dashTarget in sim.js).
  const CLASS_TARGETS: Record<string, string> = { Archer: "highest health", Assassin: "loose enemies, then lowest health", Support: "heal first, then first enemy" };
  const FOCUS_NAMES: Record<string, string> = { attack: "Attack", health: "Health", range: "Range" };
  let focusOpen = false; // level-focus picker shown under the upgrade button
  let detailsOpen = true; // Details section state, kept between selections
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
    popDetails.hidden = !detailsOpen;
    popDetailsButton.setAttribute("aria-expanded", String(detailsOpen));
    focusOpen = false;
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
    popRange.textContent = String(Math.round(unit.range));
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
    if (popPortrait.dataset.hero !== unit.id) { popPortrait.dataset.hero = unit.id; popPortrait.hidden = !image; if (image) popPortrait.src = image; }
    if (popClassIcon.dataset.cls !== unit.class) { popClassIcon.src = classIcon(unit.class); popClassIcon.dataset.cls = unit.class; }
    const trainings = Object.values(unit.trained || {}).reduce((sum: number, n: any) => sum + n, 0);
    popLevel.textContent = `${unit.class} - Level ${unit.level} of ${maxLevel}${unit.focus ? ` - ${FOCUS_NAMES[unit.focus]} focus` : ""}${unit.path ? ` - ${PATH_INFO[unit.class]?.[unit.path]?.name ?? unit.path}` : ""}${unit.awakened ? " - Awakened" : ""}${trainings ? ` - Trained ${trainings}x` : ""}`;
    const refund = game.sellValue(unit.entityId);
    popSell.textContent = sellArmed ? `Confirm +${refund}` : "Sell";
    popSell.classList.toggle("is-armed", sellArmed);
    popSell.title = `Remove ${unit.name} from the field for ${refund} gold (half of what it cost).`;
    updateHealth(unit);
    updateStats(unit);
    updateTargeting(unit);
    const info = game.upgradeInfo(unit.entityId);
    const awakenText = AWAKEN_TEXT[unit.variant] ? ` ${unit.skillName ?? "Ultimate"}: ${AWAKEN_TEXT[unit.variant]}.` : "";
    if (info.train) {
      // Training after Awakening: the button opens the attack/health/range picker again.
      const t = data.tuning.training;
      popUpgrade.disabled = !info.ok;
      popUpgradeLabel.textContent = "Train";
      popCost.textContent = `${info.cost} gold`;
      const boost = unit.atk ? game.attackValue(unit) / unit.atk : 1;
      const options = info.focusOptions;
      const texts: Record<string, string> = {
        attack: `Attack ${Math.round(unit.atk * boost)} to ${Math.round(options.attack.nextAtk * boost)}`,
        health: `Health ${unit.hp} to ${options.health.nextHp}`,
        range: options.range ? `Range ${Math.round(unit.range)} to ${options.range.nextRange} (${unit.trained?.range || 0} of ${t.rangeCap})` : `Range fully trained (${t.rangeCap} of ${t.rangeCap})`,
      };
      for (const [stat, text] of Object.entries(texts)) q(`[data-focus-text="${stat}"]`).textContent = text;
      for (const stat of Object.keys(texts)) q(`[data-focus-bonus="${stat}"]`).textContent = `+${Math.round(t[stat] * 100)}%`;
      q<HTMLButtonElement>('[data-focus="range"]').disabled = !options.range;
      popPreview.textContent = !info.ok ? info.reason
        : focusOpen ? "Pick one. Every training makes the next one pricier." : "Awakened heroes can keep training attack, health or range.";
    } else if (info.awaken) {
      popUpgrade.disabled = !info.ok;
      popUpgradeLabel.textContent = "Awaken";
      popCost.textContent = `${info.cost} gold`;
      popPreview.textContent = info.ok
        ? `Attack ${unit.atk} to ${info.nextAtk}, health ${unit.hp} to ${info.nextHp}.${awakenText}`
        : `Needs ${info.cost} gold, you have ${game.gold}.${awakenText}`;
    } else if (info.ok && info.needsPath) {
      // Class path (M12): the upgrade button opens the class's three paths.
      popUpgrade.disabled = false;
      popUpgradeLabel.textContent = `Upgrade to level ${unit.level + 1}`;
      popCost.textContent = `${info.cost} gold`;
      info.pathOptions.forEach((id: string, i: number) => {
        const button = pathButtons[i];
        const path = PATH_INFO[unit.class]?.[id];
        button.dataset.pathOption = id;
        button.querySelector("strong")!.textContent = path?.name ?? id;
        button.querySelector("small")!.textContent = path?.text ?? "";
      });
      popPreview.textContent = focusOpen ? "Pick one. The path stays for this unit until it falls." : `Level ${unit.level + 1} also picks a path that changes how ${unit.name} fights.`;
    } else if (info.ok && info.needsFocus) {
      // Level focus: the upgrade button opens three options, each previews its own gain.
      popUpgrade.disabled = false;
      popUpgradeLabel.textContent = `Upgrade to level ${unit.level + 1}`;
      popCost.textContent = `${info.cost} gold`;
      q<HTMLButtonElement>('[data-focus="range"]').disabled = false;
      const boost = unit.atk ? game.attackValue(unit) / unit.atk : 1;
      const f = data.tuning.upgrades.focus;
      const texts: Record<string, string> = {
        attack: `Attack ${Math.round(unit.atk * boost)} to ${Math.round(info.focusOptions.attack.nextAtk * boost)} (${Math.round(info.nextAtk * boost)} without focus)`,
        health: `Health ${unit.hp} to ${info.focusOptions.health.nextHp} (${info.nextHp} without focus)`,
        range: `Range ${Math.round(unit.range)} to ${info.focusOptions.range.nextRange}`,
      };
      for (const [focus, text] of Object.entries(texts)) q(`[data-focus-text="${focus}"]`).textContent = text;
      for (const focus of Object.keys(texts)) q(`[data-focus-bonus="${focus}"]`).textContent = `+${Math.round(f[focus] * 100)}%`;
      popPreview.textContent = focusOpen ? "Pick one. The focus stays for this unit until it falls." : `Level ${f.level} adds a focus of your choice: attack, health or range.`;
    } else if (info.ok) {
      popUpgrade.disabled = false;
      popUpgradeLabel.textContent = `Upgrade to level ${unit.level + 1}`;
      popCost.textContent = `${info.cost} gold`;
      // Same multiplier as the Attack stat so the preview matches the number shown above it.
      const boost = unit.atk ? game.attackValue(unit) / unit.atk : 1;
      popPreview.textContent = `Attack ${Math.round(unit.atk * boost)} to ${Math.round(info.nextAtk * boost)}, health ${unit.hp} to ${info.nextHp}.`;
    } else if (unit.level >= maxLevel) {
      popUpgrade.disabled = true;
      popUpgradeLabel.textContent = unit.awakened ? "Awakened" : "Max level";
      popCost.textContent = "";
      popPreview.textContent = unit.awakened ? `Fully upgraded.${awakenText}` : "This hero is at the level cap.";
    } else if (Number.isFinite(info.cost)) {
      popUpgrade.disabled = true;
      popUpgradeLabel.textContent = `Upgrade to level ${unit.level + 1}`;
      popCost.textContent = `${info.cost} gold`;
      popPreview.textContent = `Needs ${info.cost} gold, you have ${game.gold}.`;
    } else {
      popUpgrade.disabled = true;
      popUpgradeLabel.textContent = "Upgrade unavailable";
      popCost.textContent = "";
      popPreview.textContent = info.reason || "";
    }
    const showFocus = focusOpen && info.ok && !!info.needsFocus;
    const showPath = focusOpen && info.ok && !!info.needsPath;
    popFocus.hidden = !showFocus;
    popPath.hidden = !showPath;
    popUpgrade.setAttribute("aria-controls", info.needsPath ? "td-pop-path" : "td-pop-focus");
    popUpgrade.setAttribute("aria-expanded", String(showFocus || showPath));
    if (!popDetails.hidden) popDetails.innerHTML = detailsHtml(unit);
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
      lines.push(`<p class="td-aura-line">${unit.skillName ?? "Ultimate"}: revives the most recently fallen hero on its free ring at level 1 with ${unit.awakened ? "full" : "half"} health. Heals nearby allies when nobody can be revived.</p>`);
    }
    if (unit.variant === "soul_drain") {
      lines.push(`<p class="td-aura-line">${unit.skillName ?? "Ultimate"}: heavy hit on the weakest enemy in range that stuns it for ${unit.awakened ? 3 : 2} seconds. A kill refunds ${unit.awakened ? 80 : 60}% of the charge.</p>`);
    }
    const ring = (RING_INFO as Record<string, { name: string; text: string }>)[game.ringKind(unit.slotType, unit.slotIndex)];
    if (ring) lines.push(`<p class="td-aura-line">Standing on ${ring.name}: ${ring.text}</p>`);
    lines.push(`<p>Levels and Awakening belong to this deployed unit. A fallen hero re-enters at level 1.</p>`);
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

  popUpgrade.addEventListener("click", () => {
    const session = state.session;
    if (!session || state.selectedEntityId === null) return;
    const pending = session.game.upgradeInfo(state.selectedEntityId);
    if (pending.needsFocus || pending.needsPath) {
      focusOpen = !focusOpen;
      const unit = findUnit(state.selectedEntityId);
      if (unit) update(unit);
      if (focusOpen) (pending.needsPath ? pathButtons[0] : popFocus.querySelector<HTMLButtonElement>("[data-focus]"))?.focus();
      return;
    }
    const result = session.game.upgrade(state.selectedEntityId);
    if (result.ok) ctx.notice(result.awaken ? `${result.hero.name} has awakened.` : `${result.hero.name} reached level ${result.hero.level}.`);
    else ctx.notice(result.reason || "Upgrade unavailable.");
  });
  popFocus.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-focus]");
    const session = state.session;
    if (!button || !session || state.selectedEntityId === null) return;
    const result = session.game.upgrade(state.selectedEntityId, button.dataset.focus);
    focusOpen = false;
    if (result.ok) {
      ctx.notice(result.train ? `${result.hero.name} trained ${FOCUS_NAMES[button.dataset.focus!].toLowerCase()}.`
        : `${result.hero.name} reached level ${result.hero.level} with ${FOCUS_NAMES[result.hero.focus].toLowerCase()} focus.`);
      popUpgrade.focus();
    } else ctx.notice(result.reason || "Upgrade unavailable.");
    const unit = findUnit(state.selectedEntityId);
    if (unit) update(unit);
  });
  popTarget.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-target]");
    const session = state.session;
    if (!button || !session || state.selectedEntityId === null) return;
    session.game.setTargeting(state.selectedEntityId, button.dataset.target);
    const unit = findUnit(state.selectedEntityId);
    if (unit) updateTargeting(unit);
  });
  popPath.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-path-option]");
    const session = state.session;
    if (!button || !session || state.selectedEntityId === null) return;
    const result = session.game.upgrade(state.selectedEntityId, button.dataset.pathOption);
    focusOpen = false;
    if (result.ok) {
      ctx.notice(`${result.hero.name} reached level ${result.hero.level} on the ${PATH_INFO[result.hero.class]?.[result.hero.path]?.name ?? result.hero.path} path.`);
      popUpgrade.focus();
    } else ctx.notice(result.reason || "Upgrade unavailable.");
    const unit = findUnit(state.selectedEntityId);
    if (unit) update(unit);
  });
  q("[data-pop-rotate]").addEventListener("click", () => {
    if (state.session && state.selectedEntityId !== null) state.session.game.rotate(state.selectedEntityId);
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
    if (result.ok) ctx.notice(`${result.hero.name} sold for ${result.refund} gold. The ring is free again.`);
  });
  q("[data-pop-close]").addEventListener("click", () => close());
  popDetailsButton.addEventListener("click", () => {
    const unit = findUnit(state.selectedEntityId);
    if (!unit) return;
    detailsOpen = !detailsOpen;
    popDetails.hidden = !detailsOpen;
    popDetailsButton.setAttribute("aria-expanded", String(detailsOpen));
    if (detailsOpen) popDetails.innerHTML = detailsHtml(unit);
  });

  return { select, close, refresh, position, tick, isOpen: () => !popover.hidden };
}
