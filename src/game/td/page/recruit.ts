// Recruitment sheet (opens from an empty tile) and battlefield input. Pointer,
// touch and keyboard all go through activateSlot. Choosing a card only inspects that hero
// (touch has no hover); the Deploy button in the sheet footer is the one action that places.
import { classIconImg } from "../assets.js";
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
  let lastPointerType = "mouse";
  let previewId = "";

  const ringOf = (game: any, slot: Slot) => (RING_INFO as Record<string, { name: string; text: string }>)[game.ringKind(slot.type, slot.index)];

  // Why the selected hero cannot be deployed right now ("" when it can).
  function blockReason(game: any, heroId: string) {
    const cost = game.deployCost(heroId);
    if (game.complete) return "The battle is over";
    if (game.heroes.some((unit: any) => unit.id === heroId)) return "Already deployed";
    if (game.heroes.length >= game.deployCap()) return `Team full (${game.deployCap()})`;
    if (game.gold < cost) return `Needs ${cost} gold, you have ${Math.floor(game.gold)}`;
    return "";
  }

  function syncDeploy() {
    const game = state.session?.game;
    const hero = heroById.get(previewId);
    if (!game || !hero) { deployButton.disabled = true; reasonEl.textContent = ""; return; }
    const reason = blockReason(game, hero.id);
    deployButton.disabled = !!reason;
    deployButton.textContent = `Deploy ${hero.name} · ${game.deployCost(hero.id)} gold`;
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
    game.uiPlacement = point && stats ? { x: point[0], y: point[1], range: stats.range, type: slot.type } : null;

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
    q("[data-td-preview-facts]").textContent = stats
      ? `${stats.hitsFlyers ? "Hits ground and flying enemies" : "Hits ground enemies only"} · Range ${Math.round(stats.range)}${rangeBonus}`
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
      if (stats.level > 1) lines.push(`<p>Enters at battle rank ${stats.level} (Divine Blessing).</p>`);
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
        : `${hero.name} deployed. Add more heroes, then start wave 1.`);
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
    // Daily Trial (M19): only the day's heroes are listed.
    sheetList.innerHTML = data.heroes.filter((hero: any) => hero.slot === slot.type && (!game.allowedHeroes || game.allowedHeroes.has(hero.id))).map((hero: any) =>
      `<button class="td-hero-card" type="button" data-place-hero="${hero.id}" aria-pressed="false">` +
      `<img src="${hero.image}" alt="" width="44" height="44" loading="lazy">` +
      `<span class="td-card-copy"><strong>${classIconImg(hero.class, 16)}${hero.name}</strong><small data-place-reason></small></span></button>`).join("");
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
      const reason = deployed ? "Already deployed" : full ? `Team full (${game.deployCap()})` : game.gold < cost ? `Needs ${cost} gold` : "";
      button.classList.toggle("is-unavailable", !!reason);
      button.querySelector<HTMLElement>("[data-place-reason]")!.textContent = reason || `${hero.class} - ${cost} gold`;
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
    if (occupant) { ctx.actions.selectUnit(occupant); return; }
    if (state.deployHeroId) {
      const hero = heroById.get(state.deployHeroId);
      if (hero.slot !== slot.type) { ctx.notice(`${hero.name} needs a ${hero.slot} tile.`); return; }
      if (game.place(hero.id, slot.type, slot.index)) { ctx.notice(`${hero.name} redeployed.`); ctx.actions.cancelDeploy(); }
      else ctx.notice(game.gold < hero.cost ? `Needs ${hero.cost} gold to redeploy ${hero.name}.` : `Your team is full (${game.deployCap()} heroes). Sell a hero to make room.`);
      return;
    }
    if (game.heroes.length >= game.deployCap()) { ctx.notice(`Your team is full (${game.deployCap()} heroes). Sell a hero to make room.`); return; }
    open(slot);
  }

  // Listeners live on the run's own canvas, so they disappear with it.
  function bindCanvas(current: Session) {
    const { canvas, map, game, keyboardSlots } = current;
    let keyboardIndex = 0;
    canvas.addEventListener("pointerdown", (event) => { lastPointerType = event.pointerType || "mouse"; });
    canvas.addEventListener("click", (event) => {
      if (state.session !== current || game.complete) return;
      const scale = canvas.getBoundingClientRect().width / 960;
      const slot: any = nearestSlot(map, canvasPoint(canvas, event), slotHitRadius(scale, lastPointerType));
      if (!slot) { close(false); ctx.actions.closePopover(false); ctx.actions.cancelDeploy(); return; }
      activateSlot({ type: slot.type, index: slot.index });
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!state.deployHeroId || event.pointerType !== "mouse") return;
      const hero = heroById.get(state.deployHeroId);
      const slot: any = nearestSlot(map, canvasPoint(canvas, event));
      const point = slot && (slot.type === "road" ? map.roadSlots : map.platformSlots)[slot.index];
      game.uiPlacement = slot && slot.type === hero.slot ? { x: point[0], y: point[1], range: hero.range, type: slot.type } : null;
    });
    canvas.addEventListener("pointerleave", () => { if (state.deployHeroId) game.uiPlacement = null; });
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

  return { open, update, close, bindCanvas, isOpen: () => !sheetEl.hidden };
}
