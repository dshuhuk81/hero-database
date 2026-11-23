// Odyssey quest chains, rewards and feature unlocks from the Global client.
// Exported by tools/android/scripts/export_odyssey.py and imported with `npm run import:game-data`;
// do not edit src/data/generated/ by hand.
import raw from "./generated/odyssey.global.json";

export type RewardKind = "currency" | "item" | "equipment";

export interface Reward {
  kind: RewardKind;
  id: number;
  /** -1 on equipment rewards in the client; meaning not confirmed yet. */
  amount: number;
  name: string | null;
  icon?: string | null;
  quality?: number | null;
  qualityName?: string | null;
}

export interface Quest {
  id: number;
  text: string | null;
  targetType: number;
  target: number;
  chapter?: number;
  stage?: number;
  rewards: Reward[];
}

export interface UnlockCondition {
  stageId?: number;
  stage?: string | null;
  never?: boolean;
  vip?: number;
  other?: { kind: string; param: number }[];
  startTime?: string;
  vipUnlock?: number;
}

export interface Unlock {
  id: number;
  key: string;
  name: string | null;
  /** "client" = English client text, "label" = tools/android/scripts/data/unlock_labels.json. */
  nameSource: "client" | "label" | null;
  /** Unnamed event/shop/technical gates; not shown on the site. */
  hidden: boolean;
  description: string | null;
  conditions: Record<string, UnlockCondition>;
  popup: boolean;
  icon: string | null;
}

interface Chain {
  key: "odyssey" | "chapters" | "spire";
  label: string;
  quests: Quest[];
}

const data = raw as unknown as {
  generatedAt: string;
  client: string;
  chains: Chain[];
  unlocks: Unlock[];
  unresolved: { key: string; where: string }[];
};

/**
 * open_condition ships two complete variants. Variant "1" matches the older Global config;
 * variant "2" appeared later. Which one live accounts get is still open, so the page shows
 * variant 1 and notes where variant 2 differs.
 */
export const PRIMARY_VARIANT = "1";
export const ALT_VARIANT = "2";

/** Stage ids of this size or larger are never reached in normal play. */
const STAGE_SENTINEL = 99999;
const PLACEHOLDER_START = "2099-";

/** Unlocks shown on the site (hidden ones are unnamed event/shop/technical gates). */
export const allUnlocks: Unlock[] = data.unlocks.filter((unlock) => !unlock.hidden);

export const odysseyMeta = {
  client: data.client,
  generated: data.generatedAt,
  /** Names still missing among what the page shows (quests, rewards, visible unlocks). */
  unresolvedCount:
    allUnlocks.filter((unlock) => !unlock.name).length +
    data.chains.reduce((sum, c) => sum + c.quests.filter((q) => !q.text || q.rewards.some((r) => !r.name)).length, 0),
};

const chain = (key: Chain["key"]) => data.chains.find((c) => c.key === key)?.quests ?? [];

export const stageLabel = (stageId: number) => {
  const chapter = Math.floor(stageId / 100);
  const stage = stageId % 100;
  return chapter === 0 ? `Prologue ${stage}` : `${chapter}-${stage}`;
};

export const chapterLabel = (chapter: number) => (chapter === 0 ? "Prologue" : `Chapter ${chapter}`);

/** An unlock that progress alone never opens (sentinel stage, 2099 start, no stage condition). */
export const unlockState = (condition: UnlockCondition | undefined) => {
  if (!condition) return "missing" as const;
  if (condition.startTime?.startsWith(PLACEHOLDER_START)) return "disabled" as const;
  if (condition.never || (condition.stageId ?? 0) >= STAGE_SENTINEL) return "disabled" as const;
  if (condition.stageId !== undefined) return "stage" as const;
  return "other" as const;
};

export const sameCondition = (a?: UnlockCondition, b?: UnlockCondition) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const stageUnlocks = (variant: string) =>
  allUnlocks.filter((unlock) => unlockState(unlock.conditions[variant]) === "stage");

export interface RewardTotal {
  key: string;
  name: string | null;
  kind: RewardKind;
  icon?: string | null;
  amount: number;
  /** Equipment pieces are counted, not summed (their amount is -1). */
  count: number;
}

/** Sums stackable rewards (currencies, items). Equipment pieces are unique and stay per quest. */
export const totalRewards = (quests: Quest[]): RewardTotal[] => {
  const totals = new Map<string, RewardTotal>();
  for (const quest of quests) {
    for (const reward of quest.rewards) {
      if (reward.kind === "equipment") continue;
      const key = `${reward.kind}:${reward.id}`;
      const name = reward.name;
      const entry = totals.get(key) ?? { key, name, kind: reward.kind, icon: reward.icon, amount: 0, count: 0 };
      entry.count += 1;
      if (reward.amount > 0) entry.amount += reward.amount;
      totals.set(key, entry);
    }
  }
  const order: Record<RewardKind, number> = { currency: 0, item: 1, equipment: 2 };
  return [...totals.values()].sort((a, b) => order[a.kind] - order[b.kind] || (a.key < b.key ? -1 : 1));
};

export interface ChapterGroup {
  chapter: number;
  label: string;
  stageQuests: Quest[];
  clearQuest?: Quest;
  unlocks: Unlock[];
  totals: RewardTotal[];
}

const clearQuests = chain("chapters");
const stageQuests = chain("odyssey");

export const chapterGroups: ChapterGroup[] = (() => {
  const chapters = new Set<number>();
  for (const quest of stageQuests) chapters.add(quest.chapter ?? 0);
  for (const quest of clearQuests) chapters.add(quest.chapter ?? 0);
  const unlocks = stageUnlocks(PRIMARY_VARIANT);
  return [...chapters].sort((a, b) => a - b).map((chapter) => {
    const own = stageQuests.filter((quest) => (quest.chapter ?? 0) === chapter);
    const clearQuest = clearQuests.find((quest) => quest.chapter === chapter);
    const chapterUnlocks = unlocks
      .filter((unlock) => Math.floor((unlock.conditions[PRIMARY_VARIANT].stageId ?? 0) / 100) === chapter)
      .sort((a, b) => (a.conditions[PRIMARY_VARIANT].stageId ?? 0) - (b.conditions[PRIMARY_VARIANT].stageId ?? 0) || a.id - b.id);
    return {
      chapter,
      label: chapterLabel(chapter),
      stageQuests: own,
      clearQuest,
      unlocks: chapterUnlocks,
      totals: totalRewards(clearQuest ? [...own, clearQuest] : own),
    };
  });
})();

export const spireQuests: Quest[] = chain("spire");

export const odysseyTotals = totalRewards([...stageQuests, ...clearQuests]);

/**
 * Starter equipment handed out by stage quests. Grouped by the first word of the item name
 * ("Crude", "Common", "Excellent"), which is what players see; the client's quality name differs
 * ("Excellent" pieces have quality "Rare").
 */
export const equipmentSummary = (() => {
  const quests = stageQuests.filter((quest) => quest.rewards.some((reward) => reward.kind === "equipment"));
  const tiers = new Map<string, number>();
  for (const quest of quests) {
    for (const reward of quest.rewards) {
      if (reward.kind !== "equipment") continue;
      const tier = reward.name?.split(" ")[0] ?? "?";
      tiers.set(tier, (tiers.get(tier) ?? 0) + 1);
    }
  }
  return {
    pieces: [...tiers.values()].reduce((sum, n) => sum + n, 0),
    tiers: [...tiers.entries()].map(([tier, count]) => ({ tier, count })),
    from: quests[0] ? stageLabel(quests[0].target) : null,
    to: quests.at(-1) ? stageLabel(quests.at(-1)!.target) : null,
    firstQuestId: quests[0]?.id ?? null,
  };
})();
export const spireTotals = totalRewards(spireQuests);

export const questCounts = {
  stages: stageQuests.length,
  chapters: clearQuests.length,
  spire: spireQuests.length,
  unlocks: allUnlocks.length,
};
