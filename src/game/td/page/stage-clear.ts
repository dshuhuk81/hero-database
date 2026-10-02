// Battle-end sequences on the result surface. Won stages play Victory and Hero contribution
// for SCENE_MS each, then Rewards. Lost stages play Defeat once, then reveal the dedicated
// advice/statistics page. One timer at a time; stop() clears it (results.reset on restart or exit, a new play()).
// Reduced motion only drops the CSS animations, the timing stays.
import type { PageContext } from "./context";
import { shortNumber } from "../ui.js";
import { currencyIcon, currencyName } from "../currency-icons.js";
import { laurelIcon } from "./campaign";

export const SCENE_MS = 4000;
const SCENES = ["victory", "performance", "rewards"] as const;
export type ClearScene = (typeof SCENES)[number];

export type StageClearReport = {
  mapName: string;
  context: string; // "10 waves · Normal"
  score: number;
  personalBest: boolean;
  lives: number;
  leaks: number;
  duration: string;
  rating: number; // stage rating 0-3 (laurels, by lives kept)
  rewards: { id: string; amount: number }[]; // what the save gained: favor, gold, heroXp, ...
  note: string; // mode outcome (Daily, Expedition, Campaign, debug), empty for Free Play
  rows: any[]; // damageRows(), highest damage first
};

const REWARD_LABELS: Record<string, string> = { favor: "Divine Favor", gold: "Hero Gold" };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function createStageClear(ctx: PageContext, onFinal: () => void) {
  const { q, heroById } = ctx;
  const resultEl = q("[data-td-result]");
  let timer: number | undefined;

  function stop() {
    window.clearTimeout(timer);
    timer = undefined;
  }

  function setScene(scene: ClearScene) {
    resultEl.dataset.scene = scene;
    resultEl.setAttribute("aria-labelledby", `td-clear-${scene}-title`);
  }

  function show(index: number) {
    stop();
    setScene(SCENES[index]);
    if (index < SCENES.length - 1) timer = window.setTimeout(() => show(index + 1), SCENE_MS);
    else {
      resultEl.dataset.final = "";
      onFinal();
    }
  }

  function rewardCard({ id, amount }: { id: string; amount: number }) {
    return `<div class="td-clear-reward${id === "favor" ? " td-clear-reward--favor" : ""}">` +
      `<span class="td-clear-reward-icon">${currencyIcon(id)}</span>` +
      `<div><strong>+${Math.round(amount).toLocaleString()}</strong><small>${REWARD_LABELS[id] ?? currencyName(id)}</small></div></div>`;
  }

  function rankingRow(row: any, index: number) {
    const hero = heroById.get(row.id);
    const share = Math.round(row.share * 100);
    const support = row.heal + row.buff;
    const avatar = hero?.image ? `<img src="${hero.image}" alt="" width="36" height="40" loading="lazy" decoding="async">` : "";
    return `<li class="td-clear-ranking${index === 0 ? " is-mvp" : ""}">` +
      `<span class="td-clear-rank">${index + 1}</span>` +
      `<span class="td-clear-avatar">${avatar}</span>` +
      `<span class="td-clear-name"><strong>${escapeHtml(hero?.name ?? row.name)}</strong>${hero?.title ? `<small>${escapeHtml(hero.title)}</small>` : ""}</span>` +
      `<span class="td-clear-damage"><span><strong>${shortNumber(row.damage)}</strong><small>${share}%</small></span><i style="--td-clear-share:${share}%"></i>` +
      (support ? `<small class="td-clear-support" title="Healing done plus the attack its aura added to allies">+${shortNumber(support)} support</small>` : "") + `</span>` +
      `<span class="td-clear-number"><strong>${row.boss ? shortNumber(row.boss) : "-"}</strong><small>Boss</small></span>` +
      `<span class="td-clear-number"><strong>${row.kills}</strong><small>Kills</small></span>` +
      `</li>`;
  }

  function fill(report: StageClearReport) {
    const scoreText = report.score.toLocaleString();
    q("[data-clear-rewards-kicker]").textContent = `Victory · ${report.mapName}`;
    q("[data-clear-rewards]").innerHTML = report.rewards.map(rewardCard).join("");
    const note = q("[data-clear-note]");
    note.textContent = report.note;
    note.hidden = !report.note;

    q("[data-clear-title]").textContent = `${report.mapName} secured`;
    q("[data-clear-context]").textContent = report.context;
    q("[data-clear-score]").textContent = scoreText;
    q("[data-clear-best]").hidden = !report.personalBest;
    q("[data-clear-lives]").textContent = String(report.lives);
    q("[data-clear-leaks]").textContent = String(report.leaks);
    q("[data-clear-duration]").textContent = report.duration;
    // Three hollow laurels; the earned ones fill one after another as the scene opens.
    const laurels = q("[data-clear-laurels]");
    laurels.setAttribute("aria-label", `Rating ${report.rating} of 3`);
    laurels.innerHTML = [0, 1, 2].map((i) => laurelIcon(i < report.rating).replace("<svg ", `<svg style="--i:${i}" `)).join("");
    const mvp = report.rows[0];
    const mvpHero = mvp ? heroById.get(mvp.id) : null;
    const mvpEl = q("[data-clear-mvp]");
    mvpEl.hidden = !mvp;
    if (mvp) {
      const name = mvpHero?.name ?? mvp.name;
      mvpEl.setAttribute("aria-label", `Most valuable hero: ${name}`);
      const art = q<HTMLImageElement>("[data-clear-mvp-art]");
      art.hidden = !mvpHero?.portrait;
      if (mvpHero?.portrait) art.src = mvpHero.portrait;
      q("[data-clear-mvp-name]").textContent = name;
      q("[data-clear-mvp-stats]").textContent = `${shortNumber(mvp.damage)} damage · ${mvp.kills} ${mvp.kills === 1 ? "kill" : "kills"}`;
    }

    q("[data-clear-performance-kicker]").textContent = `Victory · ${scoreText} points`;
    const total = report.rows.reduce((sum, row) => sum + row.damage, 0);
    q("[data-clear-total]").textContent = total ? `${shortNumber(total)} total damage` : "";
    const list = q("[data-clear-rankings]");
    list.innerHTML = report.rows.map(rankingRow).join("");
    list.scrollTop = 0;
    q("[data-clear-rankings-empty]").hidden = report.rows.length > 0;
    q(".td-clear-legend").hidden = !report.rows.length;
  }

  // Starts the sequence from Victory (a repeated call restarts it with a single timer).
  function play(report: StageClearReport) {
    stop();
    delete resultEl.dataset.final;
    delete resultEl.dataset.fromDefeat;
    fill(report);
    resultEl.dataset.view = "clear";
    show(0);
  }

  // Losses have two steps: the cinematic Defeat scene, then the existing report.
  function playDefeat() {
    stop();
    delete resultEl.dataset.final;
    delete resultEl.dataset.fromDefeat;
    resultEl.dataset.view = "defeat";
    resultEl.setAttribute("aria-labelledby", "td-defeat-title");
    timer = window.setTimeout(() => {
      stop();
      resultEl.dataset.fromDefeat = "";
      resultEl.dataset.view = "loss";
      resultEl.setAttribute("aria-labelledby", "td-loss-title");
      onFinal();
    }, SCENE_MS);
  }

  // After the sequence: Stats switches between Rewards and Hero contribution, no timers.
  function showScene(scene: ClearScene) {
    stop();
    setScene(scene);
  }

  return { play, playDefeat, stop, showScene };
}
