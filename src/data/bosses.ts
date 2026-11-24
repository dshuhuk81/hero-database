import data from './bosses.json';
import rewardData from './generated/bosses.global.json';
import { heroes } from './heroes/withRatings.js';
import { rankHeroesForBoss } from './ratings/ratingSystem.js';
import { getBossTeam } from '../utils/bossTeams.js';

export type Reward = [number, number, number];
export interface RewardItem {
  name: string | null;
  icon: string | null;
  quality?: number;
  description?: string | null;
  choose?: { count: number; options: Reward[] };
}
export interface Milestone { damage: number; rewards: Reward[] }
export interface RankRow { from: number; to: number; rewards: Reward[]; title?: string | null; category?: number }
export interface BossRewardEntry {
  siteId: string | null;
  clientName: string | null;
  mode: 'torment_rift' | 'grim_surge' | 'old_gods_calamity' | 'old_gods_return';
  damageMilestones?: Milestone[];
  dailyRanks?: RankRow[];
  dailyAttempts?: number;
  unlockCost?: number;
  showRewards?: Reward[];
  recordMilestones?: Milestone[];
  awakenings?: { index: number; afterChapter: number | null; dailyAttempts: number; showRewards: Reward[]; ranks: RankRow[] }[];
  cost?: Reward | null;
  serverMilestones?: Milestone[];
  finalRanks?: RankRow[];
}
export interface ModeInfo { name: string | null; help: string | null; unlock?: string | null }

export const rewardItems = rewardData.items as unknown as Record<string, RewardItem>;
export const rewardModes = rewardData.modes as unknown as Record<BossRewardEntry['mode'], ModeInfo>;
const rewardEntries = rewardData.bosses as unknown as BossRewardEntry[];

// Order of the reward panels when a boss appears in several modes (Typhon).
const MODE_ORDER: BossRewardEntry['mode'][] = ['torment_rift', 'grim_surge', 'old_gods_return', 'old_gods_calamity'];

// Portrait artwork needs individual crops in the wide directory/header stages.
const artworkFocus: Record<string, string> = {
  baphomet: '50% 49%',
  spirit_of_night_hag: '50% 38%',
  epica: '50% 18%',
  lilith: '50% 18%',
  isthar_vi: '50% 32%',
  jackfrost: '50% 28%',
  typhoon: '50% 40%',
};

/** Short facts for the directory tile and the header, only from client data. */
function modeFacts(rewards: BossRewardEntry[]) {
  const facts: { label: string; value: string; icon?: string | null }[] = [];
  for (const entry of rewards) {
    if (entry.mode === 'torment_rift') {
      facts.push({ label: 'Unlock', value: 'Odyssey 9-3' }, { label: 'Ranking', value: 'Resets daily' });
    } else if (entry.mode === 'grim_surge' && entry.dailyAttempts) {
      facts.push({ label: 'Entry', value: `${entry.dailyAttempts} a day, reset 07:00` });
      if (entry.unlockCost) facts.push({ label: 'Start', value: `${entry.unlockCost.toLocaleString('en-US')} Contribution` });
    } else if (entry.mode === 'old_gods_return') {
      const cost = entry.cost ? rewardItems[`${entry.cost[0]}/${entry.cost[1]}`] : null;
      facts.push({ label: 'Event', value: 'Weekly rotation' });
      if (cost?.name) facts.push({ label: 'Entry', value: `${entry.cost![2]} ${cost.name}`, icon: cost.icon });
    } else if (entry.mode === 'old_gods_calamity' && entry.awakenings?.length) {
      const chapters = entry.awakenings.map((a) => a.afterChapter).filter(Boolean).join(', ');
      facts.push({ label: 'Awakens after', value: `Chapter ${chapters}` });
    }
  }
  return facts;
}

export const visibleBosses = data.bosses
  .filter(boss => boss.id !== 'nian_beast')
  .map(boss => {
    const rewards = rewardEntries
      .filter(entry => entry.siteId === boss.id)
      .sort((a, b) => MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode));
    return {
      ...boss,
      team: getBossTeam(boss, heroes),
      artworkFocus: artworkFocus[boss.id] ?? '50% 50%',
      rewards,
      facts: modeFacts(rewards),
      bestRated: rankHeroesForBoss(heroes, boss.id).slice(0, 10) as { hero: { id: string; name: string }; tier: string }[],
    };
  });

export type BossView = (typeof visibleBosses)[number];

const R2_BASE = 'https://pub-e35e94828bf347ca93c3d2c6a50d06f6.r2.dev';

export interface BossFact { label: string; value: string; icon?: string | null; badge?: string }

/** Faction and class as icon facts: visible label, icon instead of the value text. */
export function identityFacts(boss: { faction?: string; class?: string }): BossFact[] {
  const facts: BossFact[] = [];
  if (boss.faction) facts.push({ label: 'Faction', value: boss.faction, badge: `${R2_BASE}/icons/factions/${boss.faction.toLowerCase()}.webp` });
  if (boss.class) facts.push({ label: 'Class', value: boss.class, badge: `${R2_BASE}/icons/classes/${boss.class.toLowerCase()}.webp` });
  return facts;
}

export function bossSkillIcon(bossId: string, index: number) {
  const aliases: Record<string, string> = { isthar_vi: 'ishtar', typhoon: 'typhon' };
  return `https://pub-e35e94828bf347ca93c3d2c6a50d06f6.r2.dev/bosses/${aliases[bossId] ?? bossId}_skill_${index + 1}.png`;
}
