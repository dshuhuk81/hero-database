// Hero popover: anchored next to the selected unit (sheet fallback), upgrade,
// rotate and details. Buttons are updated in place so focus survives game events.
import { placePopover, worldToLocal } from "../ui.js";
import type { PageContext } from "./context";

export function createPopover(ctx: PageContext) {
  const { q, state, data, maxLevel } = ctx;
  const stageEl = q("[data-td-stage]");
  const popover = q("[data-td-popover]");
  const popName = q("[data-pop-name]");
  const popLevel = q("[data-pop-level]");
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

  function update(unit: any) {
    const game = state.session!.game;
    popName.textContent = unit.name;
    popLevel.textContent = `${unit.class} - Level ${unit.level} of ${maxLevel}`;
    updateHealth(unit);
    updateStats(unit);
    const info = game.upgradeInfo(unit.entityId);
    if (info.ok) {
      popUpgrade.disabled = false;
      popUpgradeLabel.textContent = `Upgrade to level ${unit.level + 1}`;
      popCost.textContent = `${info.cost} gold`;
      // Same multiplier as the Attack stat so the preview matches the number shown above it.
      const boost = unit.atk ? game.attackValue(unit) / unit.atk : 1;
      popPreview.textContent = `Attack ${Math.round(unit.atk * boost)} to ${Math.round(info.nextAtk * boost)}, health ${unit.hp} to ${info.nextHp}.`;
    } else if (unit.level >= maxLevel) {
      popUpgrade.disabled = true;
      popUpgradeLabel.textContent = "Max level";
      popCost.textContent = "";
      popPreview.textContent = "This hero is at the level cap.";
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
    if (!popDetails.hidden) popDetails.innerHTML = detailsHtml(unit);
  }

  function detailsHtml(unit: any) {
    const game = state.session!.game;
    const lines: string[] = [];
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
      lines.push(`<p class="td-aura-line">${unit.skillName ?? "Ultimate"}: revives the most recently fallen hero on its free ring at level 1 with half health. Heals nearby allies when nobody can be revived.</p>`);
    }
    if (unit.variant === "soul_drain") {
      lines.push(`<p class="td-aura-line">${unit.skillName ?? "Ultimate"}: heavy hit on the weakest enemy in range that stuns it for 2 seconds. A kill refunds 60% of the charge.</p>`);
    }
    lines.push(`<p>Levels belong to this deployed unit. A fallen hero re-enters at level 1.</p>`);
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
    const result = session.game.upgrade(state.selectedEntityId);
    if (result.ok) ctx.notice(`${result.hero.name} reached level ${result.hero.level}.`);
    else ctx.notice(result.reason || "Upgrade unavailable.");
  });
  q("[data-pop-rotate]").addEventListener("click", () => {
    if (state.session && state.selectedEntityId !== null) state.session.game.rotate(state.selectedEntityId);
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
