// SINGLE SOURCE OF TRUTH for site navigation.
//
// Both the index.astro teaser grid and the Sidebar.astro rail / mobile bar are
// derived from this one array. Add, remove or reorder an entry here and BOTH
// surfaces update automatically - never edit nav in two places again.
//
// Rules:
//  - Array order drives display order on BOTH surfaces. On the sidebar, items
//    are bucketed by `group` (primary / content / meta) but keep this array's
//    relative order within each bucket. The teaser grid shows every entry with
//    `teaser: true` in this array's order.
//  - `label` is the only label. The teaser shows it as the card headline; the
//    sidebar uses it for the desktop tooltip and the mobile/more-sheet text.
//  - `badge` is rendered ONLY on the index teaser, never on the sidebar.
//  - `icon` is the inner SVG markup (24x24 viewBox, stroke-based, Lucide-style).

import { type LocalizedString } from "../i18n/helpers";

export interface NavEntry {
  /** Display label. Teaser headline + sidebar tooltip/mobile text. */
  label: string;
  href: string;
  /** Inner SVG markup for a 24x24 stroke icon. */
  icon: string;
  /** Sidebar bucket. */
  group: "primary" | "content" | "tools" | "meta";
  /** Show this entry as a card on the index.astro teaser grid. */
  teaser?: boolean;
  /** Pin this entry to the mobile bottom bar (max 4). Others go to the More sheet. */
  mobile?: boolean;
  /** Show this entry in the sidebar rail / mobile bar / more-sheet. Defaults to true. Set false for entries only reachable via another hub page (e.g. /guides game-mode section). */
  sidebar?: boolean;
  /** Teaser card sub-text. Only used when `teaser` is true. */
  description?: LocalizedString;
  /** Teaser-only badge. Never shown on the sidebar. `until` (YYYY-MM-DD) hides the badge after that date at build time. */
  badge?: { text: LocalizedString; color?: string; until?: string };
  /** Marks the destination as under maintenance (disables the link). */
  status?: { type: "maintenance"; tooltip?: string };
  /** Keep internal tooling visible during local development only. */
  localOnly?: boolean;
}

export const defaultMaintenanceTooltip = "currently under maintenance";

const allNavEntries: NavEntry[] = [
  {
    label: "Home",
    href: "/",
    group: "primary",
    mobile: true,
    icon: `<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>`,
  },
  {
    label: "Boss Encounters",
    href: "/bosses",
    group: "content",
    sidebar: false,
    description: {
      en: "Boss counters & recommended team comps",
      de: "Boss-Gegner und empfohlene Teamzusammenstellungen",
      es: "Jefes y composiciones de equipo recomendadas",
      ru: "Боссы и рекомендуемые составы команд",
      zh: "Boss 克制思路与推荐阵容",
    },
    icon: `<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v-4a8 8 0 1 1 8 0v4"/><path d="M12 20v-2"/><path d="M8 20h8"/>`,
  },
  {
    label: "CN vs Global",
    href: "/cn-preview",
    group: "primary",
    teaser: false,
    sidebar: false,
    localOnly: true,
    description: {
      en: "Compare Global hero skills against the Chinese base version",
      de: "Vergleiche die globalen Heldenfähigkeiten mit der chinesischen Basisversion",
      es: "Compara las habilidades de los héroes globales con la versión base china",
      ru: "Сравните навыки глобальных героев с китайской базовой версией",
      zh: "对比国际服英雄技能与国服基准版本",
    },
    icon: `<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M8 7h4"/><path d="M10 5v4"/><path d="M15.5 15h.01"/><path d="M17.5 17h.01"/><path d="M14.5 18.5h.01"/>`,
  },
  {
    label: "Delusion Den",
    href: "/delusions-den",
    group: "content",
    sidebar: false,
    description: {
      en: "Recommended teams and strategy for each stage",
      de: "Empfohlene Teams und Strategien für jede Stufe",
      es: "Equipos recomendados y estrategias para cada etapa",
      ru: "Рекомендованные команды и стратегия для каждого этапа",
      zh: "每个关卡的推荐队伍与打法思路",
    },
    icon: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  },
  {
    label: "Divine Throne",
    href: "/guides/divine-throne",
    group: "content",
    sidebar: false,
    localOnly: true,
    description: {
      en: "New Divine Throne system - unlocks, Ether upgrades and first-wave heroes",
      de: "Neues Divine-Throne-System - Freischaltung, Ether-Upgrades und erste Heldenwelle",
      es: "Nuevo sistema Divine Throne: desbloqueos, mejoras de Ether y primeros héroes",
      ru: "Новая система Divine Throne: открытие, улучшения Ether и первая волна героев",
      zh: "全新神王宝座系统——解锁条件、以太升级与首批英雄",
    },
    badge: { text: { en: "New", de: "Neu", es: "Nuevo", ru: "Новое", zh: "新" }, color: "var(--accent-new)", until: "2026-08-01" },
    icon: `<path d="M12 2l2.4 5.1L20 8l-4 4.1.9 5.9L12 15.1 7.1 18l.9-5.9L4 8l5.6-.9L12 2z"/><path d="M5 21h14"/><path d="M8 18h8"/>`,
  },
  {
  label: "Events",
  href: "/events",
  group: "content",
  sidebar: false,
  description: {
    en: "Campaign stages & event team guides",
    de: "Kampagnenstufen und Event-Teamguides",
    es: "Etapas de campaña y guías de equipos para eventos",
    ru: "Этапы кампании и гайды по командам для событий",
    zh: "战役关卡与活动队伍攻略",
  },
  icon: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
    badge: { text: { en: "Updated", de: "Aktualisiert", es: "Actualizado", ru: "Обновлено", zh: "已更新" }, color: "var(--accent-purple)", until: "2026-08-01" },
  },
  {
    label: "Guides",
    href: "/guides",
    group: "content",
    mobile: true,
    teaser: true,
    description: {
      en: "Hero and Game Mode specific guides.",
      de: "Helden- und spielmodus-spezifische Guides.",
      es: "Guías específicas de héroes y modos de juego.",
      ru: "Гайды по героям и игровым режимам.",
      zh: "英雄与玩法专属攻略。",
    },
    badge: { text: { en: "New", de: "Neu", es: "Nuevo", ru: "Новое", zh: "新" }, color: "var(--accent-new)", until: "2026-08-01" },
    icon: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  },
  {
    label: "Hero List",
    href: "/heroes",
    group: "primary",
    mobile: true,
    teaser: true,
    description: {
      en: "Browse all heroes with stats & ratings",
      de: "Alle Helden mit Werten und Bewertungen durchsuchen",
      es: "Explora todos los héroes con estadísticas y valoraciones",
      ru: "Просматривайте всех героев с характеристиками и рейтингами",
      zh: "浏览全部英雄的属性与评分",
    },
    badge: { text: { en: "Updated", de: "Aktualisiert", es: "Actualizado", ru: "Обновлено", zh: "已更新" }, color: "var(--accent-purple)", until: "2026-08-01" },
    icon: `<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19.5 6.5L21 3l-3.5 1.5"/><path d="M9.5 17.5L21 6V3h-3L6.5 14.5"/><path d="M11 19l-6-6"/><path d="M8 16l-4 4"/><path d="M4.5 6.5L3 3l3.5 1.5"/>`,
  },
  {
    label: "Hero Stats",
    href: "/hero-stats",
    group: "primary",
    mobile: true,
    teaser: true,
    description: {
      en: "Compare all heroes with their stats",
      de: "Alle Helden mit ihren Werten vergleichen",
      es: "Compara a todos los héroes con sus estadísticas",
      ru: "Сравните всех героев по характеристикам",
      zh: "对比全部英雄的属性数据",
    },
    icon: `<line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="10"/><line x1="3" y1="20" x2="21" y2="20"/>`,
  },
  {
    label: "Tips",
    href: "/tips",
    group: "content",
    teaser: true,
    description: {
      en: "Beginner tips & shrine system breakdowns",
      de: "Anfängertipps und Aufschlüsselung des Schreinsystems",
      es: "Consejos para principiantes y desglose del sistema de santuario",
      ru: "Советы для новичков и разбор системы святилищ",
      zh: "新手技巧与神龛系统解析",
    },
    badge: { text: { en: "Updated", de: "Aktualisiert", es: "Actualizado", ru: "Обновлено", zh: "已更新" }, color: "var(--accent-purple)", until: "2026-08-01" },
    icon: `<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  },
  {
    label: "Totems",
    href: "/totems",
    group: "content",
    teaser: true,
    description: {
      en: "All totems with effects, tags & ratings",
      de: "Alle Totems mit Effekten, Tags und Bewertungen",
      es: "Todos los tótems con efectos, etiquetas y valoraciones",
      ru: "Все тотемы с эффектами, тегами и рейтингами",
      zh: "全部图腾的效果、标签与评分",
    },
    icon: `<path d="M12 2L8 6v3l-2 2v4l2 2v3l4 2 4-2v-3l2-2v-4l-2-2V6z"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="6" y1="15" x2="18" y2="15"/>`,
  },
  {
    label: "Summon Calculator",
    href: "/summon-calculator",
    group: "tools",
    teaser: true,
    description: {
      en: "Calculate target odds and expected copies from your saved summons",
      de: "Berechne Zielwahrscheinlichkeiten und erwartete Kopien aus deinen gespeicherten Beschwörungen",
      es: "Calcula las probabilidades objetivo y las copias esperadas a partir de tus invocaciones guardadas",
      ru: "Рассчитайте шансы на цель и ожидаемое число копий на основе ваших сохранённых призывов",
      zh: "根据已保存的召唤记录计算目标概率与期望获取数量",
    },
    badge: { text: { en: "New", de: "Neu", es: "Nuevo", ru: "Новое", zh: "新" }, color: "var(--accent-new)", until: "2026-08-01" },
    icon: `<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="12" y1="11" x2="12" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><path d="M15 14l2 2 3-4"/>`,
  },
  {
    label: "Wishlist",
    href: "/wishlisht",
    group: "tools",
    teaser: true,
    description: {
      en: "Recommended F2P Wishlist picks for all four regular factions",
      de: "Empfohlene F2P-Wish-List-Picks für alle vier regulären Fraktionen",
      es: "Selecciones F2P recomendadas para las cuatro facciones normales",
      ru: "Рекомендуемые F2P-герои Wish List для четырёх обычных фракций",
      zh: "四个常规阵营的推荐零氪心愿单选择",
    },
    badge: { text: { en: "New", de: "Neu", es: "Nuevo", ru: "Новое", zh: "新" }, color: "var(--accent-new)", until: "2026-08-01" },
    icon: `<path d="M12 21s-7-4.6-9.2-9.1C1 8.2 3.2 4 7.3 4c2 0 3.7 1.1 4.7 2.6C13 5.1 14.7 4 16.7 4c4.1 0 6.3 4.2 4.5 7.9C19 16.4 12 21 12 21z"/><path d="m16.5 7 .5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z"/>`,
  },
  {
    label: "Release Calendar",
    href: "/summon-calendar",
    group: "tools",
    teaser: true,
    description: {
      en: "Possible guesses on upcoming releases.",
      de: "Mögliche Vorhersagen zu kommenden Veröffentlichungen.",
      es: "Posibles predicciones de próximos lanzamientos.",
      ru: "Возможные прогнозы будущих релизов на основе данных CN.",
      zh: "基于国服数据对后续上线内容的推测。",
    },
    icon: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 12.5l1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4z"/>`,
  },
  {
    label: "Virtue Guide",
    href: "/virtues",
    group: "content",
    sidebar: false,
    description: {
      en: "New deity upgrade pieces - sets, rarities & farming guide",
      de: "Neue Aufstiegsstücke für Gottheiten - Sets, Seltenheiten und Farm-Guide",
      es: "Nuevas piezas de mejora divina: conjuntos, rarezas y guía de farmeo",
      ru: "Новые материалы улучшения божеств: наборы, редкости и гайд по фарму",
      zh: "全新神祇养成部件——套装、稀有度与刷取攻略",
    },
    icon: `<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>`,
  },
  {
    label: "Changes",
    href: "/changelog",
    group: "meta",
    icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="15" r="3"/><path d="M12 13.5V15l1 1"/>`,
  },
  {
    label: "Status",
    href: "/status",
    group: "meta",
    localOnly: true,
    icon: `<path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="11" width="3" height="5" rx="1"/><rect x="12" y="7" width="3" height="9" rx="1"/><rect x="17" y="3" width="3" height="13" rx="1"/>`,
  },
  {
    label: "About",
    href: "/about",
    group: "meta",
    icon: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
  },
];

export const navEntries = allNavEntries.filter((entry) => !entry.localOnly || import.meta.env.DEV);

/** Badge for an entry, or undefined once its `until` date has passed (evaluated at build time). */
export function activeBadge(entry: NavEntry): NavEntry["badge"] {
  const badge = entry.badge;
  if (!badge) return undefined;
  if (badge.until && new Date(badge.until + "T23:59:59") < new Date()) return undefined;
  return badge;
}

/** Entries shown on the index.astro teaser grid, in array order. */
export const teaserEntries = navEntries.filter((e) => e.teaser);
