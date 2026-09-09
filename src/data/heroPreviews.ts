import db from './all_heroes_db.json';

export interface HeroPreview {
  heroId: string;
  status: 'upcoming' | 'released';
  artwork: string;
  artworkPosition?: string;
  updatedAt: string;
  headline: string;
  introduction: string;
  mechanic: { title: string; steps: { title: string; text: string }[] };
  highlights: { title: string; text: string }[];
  goodFit: string;
  watchOut: string;
  guideHref?: string;
}

// Change this ID to feature another configured preview. Set null to hide the teaser.
export const activePreviewHeroId: string | null = 'zaojun';

// Keep previous entries: their shared preview links remain available after release.
export const heroPreviews: HeroPreview[] = [{
  heroId: 'zaojun',
  status: 'upcoming',
  artwork: '/banners/zaojun-preview.png',
  artworkPosition: '75% center',
  updatedAt: '2026-09-09',
  headline: 'Your team’s Energy. Her next firework.',
  introduction: 'Meet an Archer whose power comes from the rhythm of her team. Zaojun turns Energy spent by allies into extra Ultimate projectiles, building toward a firework display that reaches distant enemies. Her kit rewards teams that keep casting and give her time to build momentum.',
  mechanic: {
    title: 'Every cast feeds the next firework.',
    steps: [
      { title: 'Spend Energy', text: 'Allies use Energy as they cast. Their spending helps fuel Zaojun’s next attack.' },
      { title: 'Store Incense Smoke', text: 'Zaojun collects part of that Energy as Incense Smoke. More stored smoke means more potential projectiles.' },
      { title: 'Unleash the Ultimate', text: 'Stored smoke adds extra shots to her Ultimate, prioritizing distant heroes and damaging enemies around its targets.' },
    ],
  },
  highlights: [
    { title: 'An Archer without basic attacks', text: 'She generates her own Energy and builds ATK over time instead of firing normal attacks. Her class alone does not tell you how to build her.' },
    { title: 'One ally, a special connection', text: 'Fire Bond connects her to the highest-HP ally and grants that partner damage reduction. Choosing the right frontline matters alongside her damage plan.' },
  ],
  goodFit: 'You already have allies who spend Energy frequently and a durable frontline. Zaojun is worth a closer look if you enjoy building around an Ultimate carry and letting the team enable her damage.',
  watchOut: 'Attack Speed and basic-attack effects contribute little to her core plan. Early pressure can interrupt her build-up, while scattered enemies reduce the value of her area damage. Check the guide before committing your resources.',
  guideHref: '/guides/zaojun',
}];

export function getPreviewHero(preview: HeroPreview) {
  const hero = Object.values(db).find(hero => hero.id === preview.heroId);
  if (!hero) throw new Error(`Unknown preview hero: ${preview.heroId}`);
  return hero;
}

export const activeHeroPreview = activePreviewHeroId === null ? undefined : heroPreviews.find(p => p.heroId === activePreviewHeroId);
if (activePreviewHeroId && !activeHeroPreview) throw new Error(`Missing preview content for ${activePreviewHeroId}`);
if (new Set(heroPreviews.map(p => p.heroId)).size !== heroPreviews.length) throw new Error('Duplicate hero preview IDs');
