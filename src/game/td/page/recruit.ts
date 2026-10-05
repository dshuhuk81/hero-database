// Hero placement and battlefield input. Heroes wait in the bottom deck; dragging one onto the
// battlefield and letting go places it on the tile under the pointer. A tap on a deck hero then
// a tap on a tile does the same for keyboards. Pointer, touch and keyboard share activateSlot.
// The recruit sheet (inspect + Deploy button) is the older flow and is no longer opened by tiles.
import { classIconImg } from "../assets.js";
import { patternSvg } from "../board.js";
import { canvasPoint, nearestSlot } from "../render.js";
import { CLASS_ROLES, ROLE_HINTS, slotHitRadius } from "../ui.js";
import { CLASS_ULT_TEXT, RING_INFO, SKILL_TEXT } from "../skills.js";
import type { PageContext, Session, Slot } from "./context";

export function createRecruit(ctx: PageContext) {
  const { q, state, data, heroById, pause } = ctx;
  const stageEl = q("[data-td-stage]");
  const sheetEl = q("[data-td-sheet]");
  const sheetKicker = q("[data-td-sheet-kicker]");
  const sheetNote = q("[data-td-sheet-note]");
  const sheetList = q("[data-td-sheet-list]");
  const previewEl = q("[data-td-sheet-preview]");
  const animEl = q("[data-td-anim]");
  const detailsEl = q<HTMLDetailsElement>("[data-td-preview-details]");
  const detailsBody = q("[data-td-preview-details-body]");
  const deployButton = q<HTMLButtonElement>("[data-td-deploy-selected]");
  const reasonEl = q("[data-td-preview-reason]");
  const deckEl = q("[data-td-deck]");
  let lastPointerType = "mouse";
  let previewId = "";
  let suppressClick = false;

  const ringOf = (game: any, slot: Slot) => (RING_INFO as Record<string, { name: string; text: string }>)[game.ringKind(slot.type, slot.index)];

  // Why the selected hero cannot be deployed right now ("" when it can).
  function blockReason(game: any, heroId: string) {
    const cost = game.deployCost(heroId);
    if (game.complete) return "The battle is over";
    if (game.heroes.some((unit: any) => unit.id === heroId)) return "Already deployed";
    if (game.heroes.length >= game.deployCap()) return `Team full (${game.deployCap()})`;
    if (game.placement < cost) return `Needs ${cost} placement, you have ${Math.floor(game.placement)}`;
    return "";
  }

  function syncDeploy() {
    const game = state.session?.game;
    const hero = heroById.get(previewId);
    if (!game || !hero) { deployButton.disabled = true; reasonEl.textContent = ""; return; }
    const reason = blockReason(game, hero.id);
    deployButton.disabled = !!reason;
    deployButton.textContent = `Deploy ${hero.name} · ${game.deployCost(hero.id)} placement`;
    reasonEl.textContent = reason;
    reasonEl.hidden = !reason;
  }

  // Inspect panel for the chosen hero. Numbers come from the running game (campaign level,
  // blessings and the tile's bonus included), so they match the unit Deploy creates.
  function preview(heroId: string) {
    const hero = heroById.get(heroId);
    const session = state.session;
    const slot = state.pendingSlot;
    if (!hero || !session || !slot || heroId === previewId) return;
    previewId = heroId;
    const game = session.game;
    sheetList.querySelectorAll<HTMLButtonElement>("[data-place-hero]").forEach((button) => {
      const on = button.dataset.placeHero === heroId;
      button.classList.toggle("is-selected", on);
      button.setAttribute("aria-pressed", String(on));
    });
    const stats = game.deployPreview(heroId, slot.type, slot.index);
    const points = slot.type === "road" ? session.map.roadSlots : session.map.platformSlots;
    const point = points[slot.index];
    game.uiPlacement = point && stats ? { x: point[0], y: point[1], range: stats.range, type: slot.type, index: slot.index, heroClass: hero.class, heroId: hero.id } : null;

    // Idle loop from the hero skin ({ url, frames, duration } sprite sheet), else the still portrait.
    const anim: { url: string; frames: number; duration: number } | undefined = hero.anim || undefined;
    const still = anim ? null : hero.portrait;
    animEl.hidden = !anim && !still;
    animEl.classList.toggle("is-still", !anim);
    animEl.style.backgroundImage = anim || still ? `url("${anim ? anim.url : still}")` : "";
    if (anim) {
      animEl.style.setProperty("--td-anim-frames", String(anim.frames));
      animEl.style.setProperty("--td-anim-duration", `${anim.duration}s`);
    }
    q("[data-td-preview-name]").textContent = hero.name;
    q("[data-td-preview-sub]").innerHTML = `${classIconImg(hero.class, 14)}${hero.class} · ${hero.slot === "road" ? "Road" : "Platform"}`;
    q("[data-td-preview-role]").textContent = (ROLE_HINTS as Record<string, string>)[hero.class] ?? "";
    const ring = ringOf(game, slot);
    const rangeBonus = ring && game.ringAt(slot.type, slot.index)?.range ? ` (${ring.name})` : "";
    // Board maps show the attack pattern as a small grid instead of a range number.
    const pattern = game.patternAt(game.heroesById?.get(heroId) ?? hero, slot.type, slot.index);
    const reach = pattern ? `Reach ${patternSvg(pattern)}` : `Range ${Math.round(stats?.range ?? 0)}${rangeBonus}`;
    q("[data-td-preview-facts]").innerHTML = stats
      ? `${stats.hitsFlyers ? "Hits ground and flying enemies" : "Hits ground enemies only"} · ${reach}`
      : "";
    const skill = data.tuning.heroSkills?.[heroId];
    const ultText = skill ? (SKILL_TEXT as Record<string, string>)[skill.variant] : "";
    q("[data-td-preview-ult]").innerHTML = skill
      ? `<strong>Ultimate: ${skill.skillName}</strong>${ultText ? ` ${ultText}` : ""}`
      : "";

    const base = game.heroesById.get(heroId);
    const lines: string[] = [];
    if (stats) {
      lines.push(`<dl class="td-inspect-stats"><div><dt>Attack</dt><dd>${stats.atk}</dd></div><div><dt>Health</dt><dd>${stats.hp}</dd></div><div><dt>Speed</dt><dd>${Math.round(stats.aps * 100) / 100}/s</dd></div><div><dt>Crit</dt><dd>${Math.round(stats.critChance * 1000) / 10}%</dd></div></dl>`);
    }
    const role = (CLASS_ROLES as Record<string, string>)[hero.class];
    if (role) lines.push(`<p>${hero.class}: ${role}</p>`);
    const classUlt = (CLASS_ULT_TEXT as Record<string, string>)[hero.class];
    if (classUlt) lines.push(`<p>${classUlt}</p>`);
    if (ring) lines.push(`<p>On this tile: ${ring.name}: ${ring.text}</p>`);
    if (session.campaign && base?.campaignLevel) lines.push(`<p>Campaign level ${base.campaignLevel} is included in attack and health.</p>`);
    detailsBody.innerHTML = lines.join("");
    previewEl.hidden = false;
    syncDeploy();
  }

  function deploySelected() {
    const session = state.session;
    const slot = state.pendingSlot;
    const hero = heroById.get(previewId);
    if (!session || !slot || !hero || blockReason(session.game, hero.id)) { syncDeploy(); return; }
    const hadFocus = sheetEl.contains(document.activeElement);
    if (session.game.place(hero.id, slot.type, slot.index)) {
      close(false);
      if (hadFocus) session.canvas.focus({ preventScroll: true });
      ctx.notice(session.started || session.game.heroes.length > 1
        ? `${hero.name} deployed.`
        : `${hero.name} deployed. Add more heroes, then start the stage.`);
    } else {
      update();
    }
  }

  function open(slot: Slot) {
    const session = state.session;
    if (!session) return;
    const game = session.game;
    ctx.actions.closePopover(false);
    ctx.actions.cancelDeploy();
    state.pendingSlot = slot;
    game.focusedSlot = slot;
    game.uiPlacement = null;
    const road = slot.type === "road";
    const ring = ringOf(game, slot);
    sheetKicker.textContent = `${road ? "Road" : "Platform"} tile - heroes ${game.heroes.length}/${game.deployCap()}${ring ? ` - ${ring.name}` : ""}`;
    // Class roles now live on the chosen hero; the note only carries the tile's own bonus.
    sheetNote.textContent = ring ? `${ring.name}: ${ring.text}` : "";
    sheetNote.hidden = !ring;
    // Restricted rosters list only their heroes: the day's (Daily Trial), the squad
    // (Campaign, Expedition) or the owned collection (Free Play).
    const listed = data.heroes.filter((hero: any) => hero.slot === slot.type && (!game.allowedHeroes || game.allowedHeroes.has(hero.id)));
    sheetList.innerHTML = listed.length ? listed.map((hero: any) =>
      `<button class="td-hero-card" type="button" data-place-hero="${hero.id}" aria-pressed="false">` +
      `<img src="${hero.image}" alt="" width="44" height="44" loading="lazy">` +
      `<span class="td-card-copy"><strong>${classIconImg(hero.class, 16)}${hero.name}</strong><small data-place-reason></small></span></button>`).join("")
      : `<p class="td-sheet-empty">No ${road ? "road" : "platform"} heroes ${state.session?.daily || state.session?.campaign || state.session?.expedition ? "in this squad" : "in your collection yet. Unlock heroes in the Campaign or summon them with Divine Seals"}.</p>`;
    update();
    previewId = "";
    detailsEl.open = false;
    const first = sheetList.querySelector<HTMLButtonElement>("button:not(.is-unavailable)") ?? sheetList.querySelector<HTMLButtonElement>("button");
    if (first) preview(first.dataset.placeHero!);
    else { previewEl.hidden = true; syncDeploy(); }
    const [x] = (road ? session.map.roadSlots : session.map.platformSlots)[slot.index];
    sheetEl.classList.toggle("is-left", x > 480);
    // Portrait: keep the map visible by docking the list into the space below it.
    const below = ctx.actions.spaceBelowMap();
    const dockBelow = below >= 220 && stageEl.clientWidth <= 600;
    sheetEl.classList.toggle("is-below", dockBelow);
    if (dockBelow) sheetEl.style.setProperty("--td-sheet-top", `${stageEl.clientHeight - below + 8}px`);
    sheetEl.hidden = false;
    if (session.started && game.running) pause.add("recruit");
    (sheetList.querySelector<HTMLButtonElement>(".is-selected") ?? sheetEl).focus({ preventScroll: true });
  }

  function update() {
    const game = state.session?.game;
    if (!game) return;
    sheetList.querySelectorAll<HTMLButtonElement>("[data-place-hero]").forEach((button) => {
      // Cards stay selectable when a hero cannot be deployed, so it can still be inspected.
      const hero = heroById.get(button.dataset.placeHero!);
      const cost = game.deployCost(hero.id);
      const deployed = game.heroes.some((unit: any) => unit.id === hero.id);
      const full = game.heroes.length >= game.deployCap();
      const reason = deployed ? "Already deployed" : full ? `Team full (${game.deployCap()})` : game.placement < cost ? `Needs ${cost} placement` : "";
      button.classList.toggle("is-unavailable", !!reason);
      button.querySelector<HTMLElement>("[data-place-reason]")!.textContent = reason || `${hero.class} - ${cost} placement`;
    });
    syncDeploy();
  }

  function close(restoreFocus = true) {
    if (sheetEl.hidden && !state.pendingSlot) return;
    const hadFocus = sheetEl.contains(document.activeElement);
    sheetEl.hidden = true;
    state.pendingSlot = null;
    if (state.session) { state.session.game.focusedSlot = null; state.session.game.uiPlacement = null; }
    pause.remove("recruit");
    if (restoreFocus && hadFocus) state.session?.canvas.focus({ preventScroll: true });
  }

  function activateSlot(slot: Slot) {
    const session = state.session;
    if (!session || session.game.complete) return;
    const game = session.game;
    const occupant = game.heroes.find((unit: any) => unit.slotType === slot.type && unit.slotIndex === slot.index);
    if (state.relocateEntityId !== null) {
      // Relocation (R4): an invalid tile keeps the mode; tapping the hero itself cancels it.
      if (occupant?.entityId === state.relocateEntityId) { ctx.actions.cancelDeploy(); return; }
      const result = game.relocate(state.relocateEntityId, slot.type, slot.index);
      if (result.ok) { ctx.notice(`${result.hero.name} relocated for ${result.cost} placement.`); ctx.actions.cancelDeploy(); }
      else ctx.notice(result.reason || "Relocation unavailable.");
      return;
    }
    if (occupant) { ctx.actions.selectUnit(occupant); return; }
    if (state.deployHeroId) {
      const hero = heroById.get(state.deployHeroId);
      if (hero.slot !== slot.type) { ctx.notice(`${hero.name} needs a ${hero.slot} tile.`); return; }
      if (game.place(hero.id, slot.type, slot.index)) { ctx.notice(`${hero.name} deployed.`); ctx.actions.cancelDeploy(); }
      else ctx.notice(game.placement < game.deployCost(hero.id) ? `Needs ${game.deployCost(hero.id)} placement to deploy ${hero.name}.` : `Your team is full (${game.deployCap()} heroes). Sell a hero to make room.`);
      return;
    }
    // Drag a hero from the bar onto a tile to place it.
    ctx.notice("Drag a hero from the bar onto a tile to place it.");
  }

  // Relocate (R4) from the hero panel: close it and highlight the empty tiles of the hero's type.
  function beginRelocation(entityId: number) {
    const session = state.session;
    const unit = session?.game.heroes.find((item: any) => item.entityId === entityId);
    if (!session || !unit) return;
    ctx.actions.closePopover(false);
    ctx.actions.cancelDeploy();
    state.relocateEntityId = entityId;
    session.game.uiDeploySlot = unit.slotType;
    ctx.notice(`Tap an empty ${unit.slotType} tile to move ${unit.name}. Tap ${unit.name} again or press Escape to cancel.`);
  }

  // Deck drag: press a hero in the bar, pull it onto the battlefield, release to place it.
  // The tile under the pointer lights up (game.uiPlacement) while the hero fits it.
  const DRAG_START = 6;
  let drag: { heroId: string; pointerId: number; x: number; y: number; active: boolean; ghost: HTMLElement | null } | null = null;

  type Pointer = { clientX: number; clientY: number; pointerType: string };
  const heroSlotAt = (session: Session, hero: any, event: Pointer) => {
    const rect = session.canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
    const scale = rect.width / 960;
    const slot: any = nearestSlot(session.map, canvasPoint(session.canvas, event), slotHitRadius(scale, event.pointerType));
    if (!slot) return null;
    const taken = session.game.heroes.some((unit: any) => unit.slotType === slot.type && unit.slotIndex === slot.index);
    return { type: slot.type as string, index: slot.index as number, valid: slot.type === hero.slot && !taken };
  };

  function endDrag() {
    if (!drag) return;
    const session = state.session;
    drag.ghost?.remove();
    deckEl.querySelectorAll(".is-dragging").forEach((el) => el.classList.remove("is-dragging"));
    if (drag.active) {
      pause.remove("drag");
      if (session) { session.game.uiPlacement = null; session.game.uiDeploySlot = null; }
    }
    drag = null;
  }

  function dropHero(session: Session, hero: any, event: Pointer) {
    const game = session.game;
    const target = heroSlotAt(session, hero, event);
    if (!target) return; // released off the battlefield: cancelled
    if (target.type !== hero.slot) { ctx.notice(`${hero.name} needs a ${hero.slot} tile.`); return; }
    if (!target.valid) { ctx.notice("That tile is taken."); return; }
    const reason = blockReason(game, hero.id);
    if (reason) { ctx.notice(`${hero.name}: ${reason}.`); return; }
    if (game.place(hero.id, target.type, target.index)) {
      ctx.notice(session.started || game.heroes.length > 1 ? `${hero.name} deployed.` : `${hero.name} deployed. Add more heroes, then start the stage.`);
    }
  }

  deckEl.addEventListener("pointerdown", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-deck-ready], [data-deck-fallen]");
    const session = state.session;
    if (!button || !session || session.game.complete || event.button > 0 || drag) return;
    drag = { heroId: (button.dataset.deckReady ?? button.dataset.deckFallen)!, pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false, ghost: null };
  });

  window.addEventListener("pointermove", (event) => {
    const session = state.session;
    if (!drag || event.pointerId !== drag.pointerId || !session) return;
    const hero = heroById.get(drag.heroId);
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_START) return;
      drag.active = true;
      ctx.actions.closePopover(false);
      ctx.actions.closeSheet(false);
      ctx.actions.cancelDeploy();
      pause.add("drag");
      session.game.uiDeploySlot = hero.slot;
      deckEl.querySelector(`[data-deck-ready="${hero.id}"], [data-deck-fallen="${hero.id}"]`)?.classList.add("is-dragging");
      const ghost = document.createElement("div");
      ghost.className = "td-drag-ghost";
      ghost.innerHTML = `<img src="${hero.image}" alt="" width="56" height="56">`;
      document.body.append(ghost);
      drag.ghost = ghost;
    }
    event.preventDefault();
    // A finger covers the hero, so on touch the ghost rides above it.
    const lift = event.pointerType === "touch" ? 56 : 0;
    drag.ghost!.style.transform = `translate(${event.clientX}px, ${event.clientY - lift}px) translate(-50%, -50%)`;
    const target = heroSlotAt(session, hero, { clientX: event.clientX, clientY: event.clientY - lift, pointerType: event.pointerType });
    const game = session.game;
    if (target?.valid) {
      const point = (target.type === "road" ? session.map.roadSlots : session.map.platformSlots)[target.index];
      const stats = game.deployPreview(hero.id, target.type, target.index);
      game.uiPlacement = point && stats ? { x: point[0], y: point[1], range: stats.range, type: target.type, index: target.index, heroClass: hero.class, heroId: hero.id } : null;
    } else game.uiPlacement = null;
    drag.ghost!.classList.toggle("is-valid", !!game.uiPlacement);
  }, { passive: false });

  window.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const session = state.session;
    const hero = heroById.get(drag.heroId);
    const wasActive = drag.active;
    const lift = event.pointerType === "touch" ? 56 : 0;
    if (wasActive && session) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      endDrag(); // lifts the pause first so place() sees a running game
      dropHero(session, hero, { clientX: event.clientX, clientY: event.clientY - lift, pointerType: event.pointerType });
      ctx.actions.renderDeck();
    } else endDrag();
  });
  window.addEventListener("pointercancel", () => { endDrag(); });
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && drag?.active) endDrag(); });

  // Listeners live on the run's own canvas, so they disappear with it.
  function bindCanvas(current: Session) {
    const { canvas, map, game, keyboardSlots } = current;
    let keyboardIndex = 0;
    canvas.addEventListener("pointerdown", (event) => { lastPointerType = event.pointerType || "mouse"; });
    canvas.addEventListener("click", (event) => {
      if (state.session !== current || game.complete) return;
      const point = canvasPoint(canvas, event);
      if (ctx.actions.aimPower(point.x, point.y)) return;
      const scale = canvas.getBoundingClientRect().width / 960;
      const slot: any = nearestSlot(map, canvasPoint(canvas, event), slotHitRadius(scale, lastPointerType));
      if (!slot) { close(false); ctx.actions.closePopover(false); ctx.actions.cancelDeploy(); return; }
      activateSlot({ type: slot.type, index: slot.index });
    });
    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerType === "mouse") { const point = canvasPoint(canvas, event); ctx.actions.hoverPower(point.x, point.y); }
      const moving = state.relocateEntityId !== null ? game.heroes.find((unit: any) => unit.entityId === state.relocateEntityId) : null;
      if ((!state.deployHeroId && !moving) || event.pointerType !== "mouse") return;
      const hero = moving ?? heroById.get(state.deployHeroId);
      const slot: any = nearestSlot(map, canvasPoint(canvas, event));
      const point = slot && (slot.type === "road" ? map.roadSlots : map.platformSlots)[slot.index];
      game.uiPlacement = slot && slot.type === hero.slot ? { x: point[0], y: point[1], range: hero.range, type: slot.type, index: slot.index, heroClass: hero.class, heroId: hero.id } : null;
    });
    canvas.addEventListener("pointerleave", () => { game.uiAim = null; if (state.deployHeroId || state.relocateEntityId !== null) game.uiPlacement = null; });
    canvas.addEventListener("focus", () => { if (!state.pendingSlot) game.focusedSlot = keyboardSlots[keyboardIndex]; });
    canvas.addEventListener("blur", () => { if (!state.pendingSlot) game.focusedSlot = null; });
    const tileAt = (slot: Slot) => (slot.type === "road" ? map.roadSlots : map.platformSlots)[slot.index];
    // Arrow keys move to the nearest tile in that direction (tiles line the road, M22b).
    const step = (dx: number, dy: number) => {
      const [x, y] = tileAt(keyboardSlots[keyboardIndex]);
      let best = -1, bestScore = Infinity;
      keyboardSlots.forEach((slot, i) => {
        const [tx, ty] = tileAt(slot);
        const along = (tx - x) * dx + (ty - y) * dy;
        if (along < 20) return;
        const across = Math.abs((tx - x) * dy - (ty - y) * dx);
        const score = along + across * 2;
        if (score < bestScore) { bestScore = score; best = i; }
      });
      return best < 0 ? keyboardIndex : best;
    };
    const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    canvas.addEventListener("keydown", (event) => {
      if (!(event.key in ARROWS) && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (event.key in ARROWS) {
        keyboardIndex = step(...ARROWS[event.key]);
        const slot = keyboardSlots[keyboardIndex];
        game.focusedSlot = slot;
        const occupant = game.heroes.find((unit: any) => unit.slotType === slot.type && unit.slotIndex === slot.index);
        ctx.notice(`${slot.type === "road" ? "Road" : "Platform"} tile${occupant ? `: ${occupant.name}` : ""}. Press Enter to use it.`);
      } else {
        activateSlot(keyboardSlots[keyboardIndex]);
      }
    });
  }

  q("[data-td-sheet-close]").addEventListener("click", () => close());
  // Click, tap, Enter and Space choose a card; Tab/arrow focus follows. Hover does not change
  // the choice, so the Deploy button always names the hero it will place.
  const previewFrom = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-place-hero]");
    if (button) preview(button.dataset.placeHero!);
  };
  sheetList.addEventListener("focusin", previewFrom);
  sheetList.addEventListener("click", previewFrom);
  deployButton.addEventListener("click", deploySelected);

  // Taps on the letterbox around the map dismiss the selection like empty map space.
  stageEl.addEventListener("click", (event) => {
    if (event.target !== stageEl) return;
    close(false);
    ctx.actions.closePopover(false);
    ctx.actions.cancelDeploy();
  });

  const consumeDragClick = () => { const was = suppressClick; suppressClick = false; return was; };

  return { open, update, close, bindCanvas, beginRelocation, consumeDragClick, endDrag, isOpen: () => !sheetEl.hidden };
}
