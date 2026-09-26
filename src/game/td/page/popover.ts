// Hero popover: anchored next to the selected unit (sheet fallback), upgrade,
// rotate and details. Buttons are updated in place so focus survives game events.
import { CLASS_ROLES, placePopover, worldToLocal } from "../ui.js";
import type { PageContext } from "./context";
import { classIcon } from "../assets.js";
import { AWAKEN_TEXT, PATH_INFO } from "../skills.js";

export function createPopover(ctx: PageContext) {
  const { q, state, data, maxLevel } = ctx;
  const stageEl = q("[data-td-stage]");
  const popover = q("[data-td-popover]");
  const popName = q("[data-pop-name]");
  const popLevel = q("[data-pop-level]");
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
  let lastHealthUpdate = 0;

  const findUnit = (entityId: number | null) => state.session?.game.heroes.find((unit: any) => unit.entityId === entityId);

  function select(unit: any) {
    const session = state.session;
    if (!session) return;
    ctx.actions.cancelDeploy();
    ctx.actions.closeSheet(false);
    state.selectedEntityId = unit.entityId;
    session.game.uiSelected = unit.entityId;
    popDetails.hidden = true;
    popDetailsButton.setAttribute("aria-expanded", "false");
    focusOpen = false;
    sellArmed = false;
    popover.hidden = false;
    update(unit);
    position();
    ctx.actions.renderDeck();
  }

  function close(restoreFocus = true) {
    if (state.selectedEntityId === null && popover.hidden) return;
    const hadFocus = popover.contains(document.activeElement);
    popover.hidden = true;
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
    if (popFocus.hidden === showFocus) { popFocus.hidden = !showFocus; position(); }
    if (popPath.hidden === showPath) { popPath.hidden = !showPath; position(); }
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
    lines.push(`<p>Levels and Awakening belong to this deployed unit. A fallen hero re-enters at level 1.</p>`);
    return lines.join("");
  }

  function position() {
    const session = state.session;
    if (popover.hidden || !session) return;
    const unit = findUnit(state.selectedEntityId);
    if (!unit) return;
    const canvasRect = session.canvas.getBoundingClientRect();
    const stageRect = stageEl.getBoundingClientRect();
    popover.classList.remove("is-sheet");
    const scale = canvasRect.width / 960;
    const size = { width: popover.offsetWidth, height: popover.offsetHeight };
    // A short map would be mostly covered by an anchored popover; use the space below it instead.
    const dockBelow = canvasRect.height < size.height * 1.5 && ctx.actions.spaceBelowMap() >= size.height + 16;
    const placement = dockBelow ? { mode: "sheet" as const } : placePopover({
      anchor: worldToLocal(canvasRect, stageRect, unit),
      size,
      bounds: { width: stageRect.width, height: stageRect.height },
      gap: 32 * scale + 8,
    });
    if (placement.mode === "sheet") {
      popover.classList.add("is-sheet");
      popover.dataset.side = "sheet";
      return;
    }
    popover.style.setProperty("--td-pop-x", `${placement.x}px`);
    popover.style.setProperty("--td-pop-y", `${placement.y}px`);
    popover.dataset.side = placement.side;
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
    popDetails.hidden = !popDetails.hidden;
    popDetailsButton.setAttribute("aria-expanded", String(!popDetails.hidden));
    if (!popDetails.hidden) popDetails.innerHTML = detailsHtml(unit);
    position();
  });

  return { select, close, refresh, position, tick, isOpen: () => !popover.hidden };
}
