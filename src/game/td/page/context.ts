// Shared context for the tower defense page modules. The page script builds one
// PageContext and passes it to each module factory. Cross-module calls go through
// ctx.actions, which the page fills once all modules exist; modules only call
// actions at runtime, never while they are being created.
import type { createPauseController } from "../ui.js";
import type { RunBoost, RunTier, SaveStore } from "./save";
import type { DailySetup } from "./daily";
import type { CampaignRun } from "./campaign";
import type { ExpeditionState } from "./save";
import type { ScreenId } from "./nav";

export type Slot = { type: string; index: number };

export type Session = {
  game: any;
  renderer: any;
  canvas: HTMLCanvasElement;
  map: any;
  started: boolean;
  flyerHint?: boolean; // the "flyers pass over blockers" notice was shown this run
  archerHint?: boolean; // the "archers shoot platform heroes" notice was shown this run
  keyboardSlots: Slot[];
  favLevels: Record<string, number>; // blessing levels this run was built with
  boost: RunBoost | null; // shard boost this run was built with
  debug: boolean;
  daily: DailySetup | null; // Daily Trial setup (M19) when this run is the trial
  expedition: ExpeditionState | null; // Expedition state (M21) this stage was started from
  campaign: CampaignRun | null; // Campaign stage and squad (M26) when this run is a campaign stage
};

// Mutable UI state shared between modules.
export type PageState = {
  session: Session | null;
  selectedMap: any;
  selectedTier: RunTier; // difficulty tier (M3)
  selectedEntityId: number | null; // hero with the open popover
  deployHeroId: string; // hero picked from the deck by tap (fallen or not yet fielded)
  relocateEntityId: number | null; // placed hero being moved to another tile (R4)
  pendingSlot: Slot | null; // ring the recruit sheet is open for
};

export type PageActions = {
  // session.ts
  startSession(map: any, options?: { daily?: DailySetup | null; expedition?: ExpeditionState | null; campaign?: CampaignRun | null }): void;
  toLobby(target?: ScreenId): void; // ends the run; target defaults to where it was started from
  handleChange(type: string): void;
  spaceBelowMap(): number;
  // hud.ts
  updateHud(): void;
  // powers.ts: a map tap while a Divine Intervention is armed casts it (true when cast or armed).
  aimPower(x: number, y: number): boolean;
  resetPowers(): void;
  hoverPower(x: number, y: number): void; // Thunderfall aim preview under the cursor (R5)
  startStage(): void; // starts the stage once a hero stands; no-op while it runs
  renderPreview(): void;
  playSound(kind: string): void;
  renderDeck(): void;
  cancelDeploy(): void;
  syncPauseButton(): void;
  // popover.ts
  selectUnit(unit: any): void;
  closePopover(restoreFocus?: boolean): void;
  refreshSelection(): void;
  positionPopover(): void;
  // recruit.ts
  closeSheet(restoreFocus?: boolean): void;
  updateSheet(): void;
  bindCanvas(session: Session): void;
  beginRelocation(entityId: number): void; // next compatible empty tile receives the hero
  consumeDragClick(): boolean; // true once after a deck drag, so its trailing click is ignored
  // panels.ts
  openPanel(name: string, opener?: HTMLElement | null): void;
  closePanel(restoreFocus?: boolean): void;
  activePanel(): HTMLElement | null;
  selectBlessingsTab(tab: "favor" | "run"): void;
  renderRunTab(): void;
  syncSpendButton(): void;
  // nav.ts
  showScreen(id: ScreenId): void;
  exitPlay(target?: ScreenId): void;
  // campaign.ts
  selectCampaignStage(id: string): boolean; // picks the stage (and last squad) for the squad screen
  // page
  renderLobby(): void;
  syncAudioUi(): void;
  playEffect(effect: any): void;
};

export type PageContext = {
  root: HTMLElement;
  q<T extends HTMLElement = HTMLElement>(selector: string): T;
  data: any;
  heroById: Map<string, any>;
  bossFor(map: any): any; // bosses.json entry of the map's final boss
  blessingNames: Record<string, string>;
  store: SaveStore;
  state: PageState;
  pause: ReturnType<typeof createPauseController>;
  getSession(): Session | null;
  notice(text: string): void;
  actions: PageActions;
};
