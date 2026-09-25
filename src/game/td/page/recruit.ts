// Recruitment sheet (opens from an empty ring) and battlefield input. Pointer,
// touch and keyboard all go through activateSlot.
import { tdAsset } from "../assets.js";
import { canvasPoint, nearestSlot } from "../render.js";
import { slotHitRadius } from "../ui.js";
import anims from "../../../data/tdHeroAnims.json";

// Idle loop sprite sheets rendered from the game's Spine data (scripts/td-spine/).
const ANIM_VERSION = "v1";
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
  let lastPointerType = "mouse";
  let previewId = "";

  // Preview strip: the hovered or focused hero's in-game idle animation.
  function preview(heroId: string) {
    const hero = heroById.get(heroId);
    const anim = (anims as Record<string, { frames: number; duration: number }>)[heroId];
    if (!hero || heroId === previewId) return;
    previewId = heroId;
    previewEl.hidden = !anim;
    if (!anim) return;
    animEl.style.backgroundImage = `url("${tdAsset(`anims/${heroId}-idle-${ANIM_VERSION}.webp`)}")`;
    animEl.style.setProperty("--td-anim-frames", String(anim.frames));
    animEl.style.setProperty("--td-anim-duration", `${anim.duration}s`);
    q("[data-td-preview-name]").textContent = hero.name;
    q("[data-td-preview-sub]").textContent = `${hero.class} - tier ${hero.tier} - ${hero.cost} gold`;
    const skill = data.tuning.heroSkills?.[heroId]?.skillName;
    q("[data-td-preview-ult]").textContent = skill ? `Ultimate: ${skill}` : "";
  }

  function open(slot: Slot) {
    const session = state.session;
    if (!session) return;
    const game = session.game;
    ctx.actions.closePopover(false);
    ctx.actions.cancelDeploy();
    state.pendingSlot = slot;
    game.focusedSlot = slot;
    const road = slot.type === "road";
    sheetKicker.textContent = `${road ? "Road" : "Platform"} ring ${slot.index + 1}`;
    sheetNote.textContent = road
      ? "Tanks hold the line, Warriors cleave groups, Assassins catch enemies that slip through."
      : "Mages splash packs and armor, Archers snipe tough enemies and flyers, Supports heal and boost allies.";
    sheetList.innerHTML = data.heroes.filter((hero: any) => hero.slot === slot.type).map((hero: any) =>
      `<button class="td-hero-card" type="button" data-place-hero="${hero.id}">` +
      `<img src="${hero.image}" alt="" width="44" height="44" loading="lazy">` +
      `<span class="td-card-copy"><strong>${hero.name}</strong><small data-place-reason></small></span>` +
      `<span class="td-tier" data-tier="${hero.tier}">${hero.tier}</span></button>`).join("");
    update();
    previewId = "";
    const first = sheetList.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? sheetList.querySelector<HTMLButtonElement>("button");
    if (first) preview(first.dataset.placeHero!);
    const [x] = (road ? session.map.roadSlots : session.map.platformSlots)[slot.index];
    sheetEl.classList.toggle("is-left", x > 480);
    // Portrait: keep the map visible by docking the list into the space below it.
    const below = ctx.actions.spaceBelowMap();
    const dockBelow = below >= 220 && stageEl.clientWidth <= 600;
    sheetEl.classList.toggle("is-below", dockBelow);
    if (dockBelow) sheetEl.style.setProperty("--td-sheet-top", `${stageEl.clientHeight - below + 8}px`);
    sheetEl.hidden = false;
    if (session.started && game.running) pause.add("recruit");
    (sheetList.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? sheetEl).focus({ preventScroll: true });
  }

  function update() {
    const game = state.session?.game;
    if (!game) return;
    sheetList.querySelectorAll<HTMLButtonElement>("[data-place-hero]").forEach((button) => {
      const hero = heroById.get(button.dataset.placeHero!);
      const deployed = game.heroes.some((unit: any) => unit.id === hero.id);
      const affordable = game.gold >= hero.cost;
      const reason = deployed ? "Already deployed" : !affordable ? `Needs ${hero.cost} gold` : "";
      button.disabled = !!reason || game.complete;
      button.classList.toggle("is-unavailable", !!reason);
      button.querySelector<HTMLElement>("[data-place-reason]")!.textContent = reason ? `${hero.cost} gold - ${reason}` : `${hero.class} - ${hero.cost} gold`;
    });
  }

  function close(restoreFocus = true) {
    if (sheetEl.hidden && !state.pendingSlot) return;
    const hadFocus = sheetEl.contains(document.activeElement);
    sheetEl.hidden = true;
    state.pendingSlot = null;
    if (state.session) state.session.game.focusedSlot = null;
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
      if (hero.slot !== slot.type) { ctx.notice(`${hero.name} needs a ${hero.slot} ring.`); return; }
      if (game.place(hero.id, slot.type, slot.index)) { ctx.notice(`${hero.name} redeployed.`); ctx.actions.cancelDeploy(); }
      else ctx.notice(game.gold < hero.cost ? `Needs ${hero.cost} gold to redeploy ${hero.name}.` : "Your team is full.");
      return;
    }
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
    canvas.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        keyboardIndex = (keyboardIndex + (event.key === "ArrowRight" ? 1 : -1) + keyboardSlots.length) % keyboardSlots.length;
        const slot = keyboardSlots[keyboardIndex];
        game.focusedSlot = slot;
        ctx.notice(`${slot.type === "road" ? "Road" : "Platform"} ring ${slot.index + 1}. Press Enter to use it.`);
      } else {
        activateSlot(keyboardSlots[keyboardIndex]);
      }
    });
  }

  q("[data-td-sheet-close]").addEventListener("click", () => close());
  const previewFrom = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-place-hero]");
    if (button) preview(button.dataset.placeHero!);
  };
  sheetList.addEventListener("pointerover", previewFrom);
  sheetList.addEventListener("focusin", previewFrom);
  sheetList.addEventListener("click", (event) => {
    const session = state.session;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-place-hero]");
    if (!button || !state.pendingSlot || !session) return;
    const hero = heroById.get(button.dataset.placeHero!);
    // Placing disables this button, which drops focus; decide on restoring it first.
    const hadFocus = sheetEl.contains(document.activeElement);
    if (session.game.place(hero.id, state.pendingSlot.type, state.pendingSlot.index)) {
      close(false);
      if (hadFocus) session.canvas.focus({ preventScroll: true });
      ctx.notice(session.started || session.game.heroes.length > 1
        ? `${hero.name} deployed.`
        : `${hero.name} deployed. Add more heroes, then start wave 1.`);
    } else {
      update();
    }
  });

  // Taps on the letterbox around the map dismiss the selection like empty map space.
  stageEl.addEventListener("click", (event) => {
    if (event.target !== stageEl) return;
    close(false);
    ctx.actions.closePopover(false);
    ctx.actions.cancelDeploy();
  });

  return { open, update, close, bindCanvas, isOpen: () => !sheetEl.hidden };
}
