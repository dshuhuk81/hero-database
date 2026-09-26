// Shared context for the tower defense page modules. The page script builds one
// PageContext and passes it to each module factory. Cross-module calls go through
// ctx.actions, which the page fills once all modules exist; modules only call
// actions at runtime, never while they are being created.
import type { createPauseController } from "../ui.js";
import type { RunBoost, RunMode, RunTier, SaveStore } from "./save";
import type { DailySetup } from "./daily";

export type Slot = { type: string; index: number };

export type Session = {
  game: any;
  renderer: any;
  canvas: HTMLCanvasElement;
  map: any;
  started: boolean;
  perfectWaves: number;
  flyerHint?: boolean; // the "flyers pass over blockers" notice was shown this run
  keyboardSlots: Slot[];
  favLevels: Record<string, number>; // blessing levels this run was built with
  boost: RunBoost | null; // shard boost this run was built with
  debug: boolean;
  daily: DailySetup | null; // Daily Trial setup (M19) when this run is the trial
};

// Mutable UI state shared between modules.
export type PageState = {
  session: Session | null;
  selectedMap: any;
  selectedMode: RunMode; // run mode picked in the lobby (waves.js)
  selectedTier: RunTier; // difficulty tier for 10 and 20 waves (M3)
  selectedEntityId: number | null; // hero with the open popover
  deployHeroId: string; // fallen hero picked from the deck for redeploy
  pendingSlot: Slot | null; // ring the recruit sheet is open for
};

export type PageActions = {
  // session.ts
  startSession(map: any, options?: { daily?: DailySetup | null }): void;
  toLobby(): void;
  handleChange(type: string): void;
  spaceBelowMap(): number;
  // hud.ts
  updateHud(): void;
  syncMainAction(): void;
  renderPreview(): void;
  playSound(kind: string): void;
  questName(quest: any): string;
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
  // panels.ts
  openPanel(name: string, opener?: HTMLElement | null): void;
  closePanel(restoreFocus?: boolean): void;
  activePanel(): HTMLElement | null;
  selectBlessingsTab(tab: "favor" | "run"): void;
  renderRunTab(): void;
  syncSpendButton(): void;
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
  maxLevel: number;
  bossFor(map: any): any; // bosses.json entry of the map's final boss
  blessingNames: Record<string, string>;
  store: SaveStore;
  state: PageState;
  pause: ReturnType<typeof createPauseController>;
  getSession(): Session | null;
  notice(text: string): void;
  actions: PageActions;
};
