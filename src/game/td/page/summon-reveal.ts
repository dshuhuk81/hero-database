// Summon reveal (M27b): the full-screen stage a summon opens over the Summon screen. Cards
// deal in face down; the back's glow tells the rarity (gold: legendary, purple: epic,
// none: common). A tap flips one card, Reveal all flips the rest, and the
// result bar offers the same summon again or closing. Face-up cards are art plus a small New tag; the panel under them names the last revealed hero (class, role, stars). The summon itself
// is already paid and saved before the stage opens; this module only shows it.
// A new epic / legendary / lord hero gets its own introduction screen once the cards are up (or
// right after its flip on a single pull); a ten pull shows cards only, no detail panel.
import type { PageContext } from "./context";

export type RevealOptions = {
  featuredId: string | null;
  isNew: boolean[]; // per card: a hero not owned before, else a spare copy
  skip: boolean; // "Skip animation": open with every card already face up
  again: { label: string; enabled: boolean } | null;
  wallet: string; // trusted markup: the Divine Seal balance after this summon
  describe: (id: string, isNew: boolean) => string; // trusted markup: name and class of the revealed hero (single pulls only)
  badges: (id: string) => string; // trusted markup: mythology group icons for a card's top-left corner
  intro: (id: string) => string; // trusted markup: introduction screen for a newly pulled epic / legendary hero
};

const FLIP_GAP_MS = 140; // Reveal all: delay between cards

// Rows of the card layout: 10 cards as 3 / 4 / 3, like a hand spread on the table.
function rowsFor(n: number) {
  if (n <= 4) return [n];
  if (n <= 7) return [Math.floor(n / 2), Math.ceil(n / 2)];
  const edge = Math.floor(n / 3);
  return [edge, n - edge * 2, edge];
}

export function createSummonReveal(ctx: PageContext, onAgain: () => void) {
  const { q, heroById } = ctx;
  const stageEl = q<HTMLDialogElement>("[data-td-summon-stage]");
  const cardsEl = q("[data-td-summon-cards]");
  const titleEl = q("[data-td-summon-stage-title]");
  const hintEl = q("[data-td-summon-stage-hint]");
  const walletEl = q("[data-td-summon-stage-wallet]");
  const liveEl = q("[data-td-summon-live]");
  const revealAllButton = q<HTMLButtonElement>("[data-td-summon-reveal-all]");
  const doneEl = q("[data-td-summon-done]");
  const detailEl = q("[data-td-summon-detail]");
  const againButton = q<HTMLButtonElement>("[data-td-summon-again]");
  const introEl = q<HTMLDialogElement>("[data-td-summon-intro]");
  const introBody = q("[data-td-summon-intro-body]");
  const introContinue = q<HTMLButtonElement>("[data-td-summon-intro-continue]");
  let heroIds: string[] = [];
  let featured: string | null = null;
  let isNew: boolean[] = [];
  let describe: RevealOptions["describe"] = () => "";
  let badges: RevealOptions["badges"] = () => "";
  let intro: RevealOptions["intro"] = () => "";
  let introQueue: number[] = [];
  let timers: number[] = [];
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const glowOf = (id: string) => {
    const rarity = heroById.get(id)?.rarity;
    return rarity === "legendary" || rarity === "lord" ? "gold" : rarity === "epic" ? "purple" : "none";
  };
  const glowName: Record<string, string> = { gold: "legendary hero", purple: "epic hero", none: "common hero" };

  function cardHtml(id: string, index: number) {
    const hero = heroById.get(id) ?? { name: id, class: "" };
    const glow = glowOf(id);
    return `<button type="button" class="td-summon-flip td-summon-flip--${glow}${id === featured ? " is-featured" : ""}" data-td-summon-card="${index}" style="--i:${index}" aria-label="Unrevealed card ${index + 1}, ${id === featured ? "featured " : ""}${heroById.get(id)?.rarity === "lord" ? "lord hero" : glowName[glow]}">` +
      `<span class="td-summon-flip-inner">` +
      `<span class="td-summon-face td-summon-face--back" aria-hidden="true"></span>` +
      `<span class="td-summon-face td-summon-face--front" aria-hidden="true">` +
      `<img data-rarity="${hero.rarity ?? ''}" src="${hero.portrait ?? hero.image ?? ""}" alt="" decoding="async">` +
      `<span class="td-summon-face-groups">${badges(id)}</span>` +
      (isNew[index] ? `<span class="td-summon-face-tag">New</span>` : "") +
      `</span></span></button>`;
  }

  const cards = () => [...cardsEl.querySelectorAll<HTMLButtonElement>("[data-td-summon-card]")];
  const hidden = () => cards().filter((card) => !card.classList.contains("is-flipped"));

  // The panel under the cards: details of the last hero revealed or tapped.
  function showDetail(index: number) {
    if (heroIds.length > 1) return; // ten pull: cards only
    detailEl.innerHTML = describe(heroIds[index], isNew[index]);
    detailEl.hidden = false;
    cards().forEach((card, i) => card.classList.toggle("is-shown", i === index));
  }

  function flip(card: HTMLButtonElement) {
    const index = Number(card.dataset.tdSummonCard);
    if (card.classList.contains("is-flipped")) { showDetail(index); return; }
    const id = heroIds[index];
    const hero = heroById.get(id);
    card.classList.add("is-flipped");
    showDetail(index);
    card.setAttribute("aria-label", `${hero?.name ?? id}, ${hero?.class ?? ""}${id === featured ? ", featured hero" : ""}, ${isNew[index] ? "new hero" : "spare copy"}`);
    const rarity = hero?.rarity;
    if (isNew[index] && (rarity === "epic" || rarity === "legendary" || rarity === "lord")) {
      introQueue.push(index);
      // Single flips and a finished set show it after the flip lands; Reveal all waits for the last card.
      if (!timers.length || !hidden().length) window.setTimeout(nextIntro, reducedMotion() ? 0 : 700);
    }
    if (!hidden().length) finish();
  }

  function nextIntro() {
    if (introEl.open || !stageEl.open || !introQueue.length || (timers.length && hidden().length)) return;
    introBody.innerHTML = intro(heroIds[introQueue.shift() as number]);
    introEl.showModal();
    introContinue.focus();
  }

  // Every card is face up: the result bar replaces Reveal all and the summary is announced.
  function finish() {
    timers.forEach(clearTimeout);
    timers = [];
    revealAllButton.hidden = true;
    doneEl.hidden = false;
    hintEl.textContent = "";
    liveEl.textContent = `Summoned: ${heroIds.map((id, i) => `${heroById.get(id)?.name ?? id}${isNew[i] ? " (new)" : ""}`).join(", ")}.`;
    // Reveal all is hidden now: keep focus inside the stage.
    if (!stageEl.contains(document.activeElement) || document.activeElement === revealAllButton) focusDone();
  }

  const focusDone = () => (!againButton.hidden && !againButton.disabled ? againButton : q<HTMLButtonElement>("[data-td-summon-close]")).focus();

  function revealAll() {
    const rest = hidden();
    if (reducedMotion()) { rest.forEach(flip); return; }
    timers.forEach(clearTimeout);
    timers = rest.map((card, i) => window.setTimeout(() => flip(card), i * FLIP_GAP_MS));
  }

  function open(ids: string[], options: RevealOptions) {
    heroIds = ids;
    featured = options.featuredId;
    isNew = options.isNew;
    describe = options.describe;
    badges = options.badges;
    intro = options.intro;
    introQueue = [];
    if (introEl.open) introEl.close();
    detailEl.hidden = true;
    detailEl.innerHTML = "";
    timers.forEach(clearTimeout);
    timers = [];
    let index = 0;
    cardsEl.className = `td-summon-cards${ids.length === 1 ? " is-single" : ""}`;
    cardsEl.innerHTML = rowsFor(ids.length).map((size) => `<div class="td-summon-row">${ids.slice(index, index += size).map((id, i) => cardHtml(id, index - size + i)).join("")}</div>`).join("");
    titleEl.textContent = ids.length === 1 ? "Summon" : `Summon x${ids.length}`;
    hintEl.textContent = ids.length === 1 ? "Tap the card to reveal it." : "Tap a card to reveal it, or reveal all.";
    liveEl.textContent = "";
    walletEl.innerHTML = options.wallet;
    revealAllButton.hidden = false;
    doneEl.hidden = true;
    againButton.hidden = !options.again;
    againButton.disabled = !options.again?.enabled;
    againButton.innerHTML = options.again?.label ?? ""; // trusted markup: currency icon chip
    stageEl.classList.toggle("is-skipped", options.skip);
    if (!stageEl.open) stageEl.showModal();
    if (options.skip) { cards().forEach(flip); focusDone(); }
    else cards()[0]?.focus();
  }

  function close() {
    timers.forEach(clearTimeout);
    timers = [];
    introQueue = [];
    if (introEl.open) introEl.close();
    if (stageEl.open) stageEl.close();
  }

  cardsEl.addEventListener("click", (event) => {
    const card = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-td-summon-card]");
    if (card) flip(card);
  });
  introContinue.addEventListener("click", () => {
    introEl.close();
    if (introQueue.length) window.setTimeout(nextIntro, 120);
    else focusDone();
  });
  revealAllButton.addEventListener("click", revealAll);
  againButton.addEventListener("click", onAgain);
  q("[data-td-summon-close]").addEventListener("click", close);
  // Escape closes the stage only; the menu's own Escape (one screen up) must not see it,
  // wherever focus is, so this listens before it (capture on window).
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !stageEl.open) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (introEl.open) introContinue.click();
    else close();
  }, true);

  return { open, close, isOpen: () => stageEl.open };
}
