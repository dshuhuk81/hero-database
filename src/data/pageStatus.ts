import { stripLocaleFromPathname } from "../i18n/config";
import type { LocalizedString } from "../i18n/helpers";

export type ContentPageStatus = {
  state: "under-construction";
  name: LocalizedString;
};

/**
 * Pages listed here keep their normal URL and navigation link, but Base.astro
 * replaces their content with the shared under-construction view.
 *
 * Remove an entry when its replacement content is ready to publish.
 */
export const pageStatuses: Record<string, ContentPageStatus> = {
  "/tierlist": {
    state: "under-construction",
    name: {
      en: "Tier List",
      de: "Tierliste",
      es: "Lista de niveles",
      ru: "Рейтинг героев",
      zh: "英雄梯度榜",
    },
  },
  "/relic-investment": {
    state: "under-construction",
    name: {
      en: "Relic Recommendations",
      de: "Relikt-Empfehlungen",
      es: "Recomendaciones de reliquias",
      ru: "Рекомендации по реликвиям",
      zh: "圣物推荐",
    },
  },
};

export const underConstructionMeta = {
  title: {
    en: "{page} · Under Construction | Motto Immortal Database",
    de: "{page} · In Bearbeitung | Motto Immortal Database",
    es: "{page} · En construcción | Motto Immortal Database",
    ru: "{page} · Страница обновляется | Motto Immortal Database",
    zh: "{page} · 页面建设中 | Motto Immortal Database",
  },
  description: {
    en: "{page} is being rebuilt. Please check back soon.",
    de: "{page} wird überarbeitet. Schau bald wieder vorbei.",
    es: "Estamos renovando {page}. Vuelve pronto.",
    ru: "Раздел «{page}» обновляется. Загляните сюда позже.",
    zh: "“{page}”正在重新制作。请稍后再来查看。",
  },
} satisfies Record<string, LocalizedString>;

export function getPageStatus(pathname: string): ContentPageStatus | undefined {
  const path = stripLocaleFromPathname(pathname).replace(/\/+$/, "") || "/";
  return pageStatuses[path];
}
