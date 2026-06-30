import { defaultLocale, type Locale } from "./config";
import { pickLang, type LocalizedString } from "./helpers";

type TranslationTree = {
  common: Record<string, LocalizedString>;
  events: Record<string, LocalizedString>;
  footer: Record<string, LocalizedString>;
  language: Record<string, LocalizedString>;
  nav: Record<string, LocalizedString>;
};

const translations: TranslationTree = {
  common: {
    lastUpdated: { en: "Last updated", de: "Zuletzt aktualisiert", es: "", ru: "" },
    front: { en: "Front", de: "", es: "", ru: "" },
    back: { en: "Back", de: "", es: "", ru: "" },
    more: { en: "More", de: "", es: "", ru: "" },
    support: { en: "Support", de: "Unterstütze", es: "", ru: "" },
    dismiss: { en: "Dismiss", de: "", es: "", ru: "" },
  },
  events: {
    metaTitle: { en: "Event Guide | Motto Immortal", de: "Heldenkampagne-Guide | Motto Immortal", es: "", ru: "" },
    metaDescription: {
      en: "Campaign stages and event team compositions for Motto Immortal.",
      de: "Alle Teams für die aktuellste Heldenkampagne.",
      es: "",
      ru: "",
    },
    tag: { en: "PvE", de: "", es: "", ru: "" },
    headline: { en: "Event Guide", de: "Event Guide", es: "", ru: "" },
    subtitle: { en: "Campaign stages & event team compositions", de: "Alle Teams für die aktuellste Heldenkampagne.", es: "", ru: "" },
  },
  footer: {
    claim: { en: "Motto Immortal\nHero Database by Frieren", de: "Motto Immortal\nHelden Datenbank von Frieren", es: "", ru: "" },
    privacyPolicy: { en: "Privacy Policy", de: "Datenschutzhinweise", es: "", ru: "" },
    copyright: { en: "{year} Motto Immortal @GOAT Games. All rights reserved.", de: "{year} Motto Immortal @GOAT Games. Alle Rechte vorbehalten.", es: "", ru: "" },
    supportProject: { en: "Support the project", de: "Ünterstütze das Projekt", es: "", ru: "" },
  },
  language: {
    label: { en: "Language", de: "Sprache", es: "", ru: "" },
  },
  nav: {
    "/": { en: "Home", de: "Home", es: "", ru: "" },
    "/heroes": { en: "Hero List", de: "Alle Helden", es: "", ru: "" },
    "/hero-stats": { en: "Hero Stats", de: "Helden Attribute", es: "", ru: "" },
    "/cn-preview": { en: "CN vs Global", de: "CN-Vergleich", es: "", ru: "" },
    "/virtues": { en: "Virtue Guide", de: "Tugenden Guide", es: "", ru: "" },
    "/delusions-den": { en: "Delusion Den Guide", de: "Guide zu Höhle der Täuschung", es: "", ru: "" },
    "/tips": { en: "Tips", de: "Tips", es: "", ru: "" },
    "/bosses": { en: "Boss Encounters", de: "Bosskämpfe", es: "", ru: "" },
    "/events": { en: "Events", de: "Events", es: "", ru: "" },
    "/totems": { en: "Totems", de: "Totems", es: "", ru: "" },
    "/summon-calendar": { en: "Summon Calendar", de: "Beschwörungskalender", es: "", ru: "" },
    "/summon-calculator": { en: "Summon Calculator", de: "Beschwörungsrechner", es: "", ru: "" },
    "/changelog": { en: "Changes", de: "Änderungen", es: "", ru: "" },
    "/status": { en: "Status", de: "Status", es: "", ru: "" },
    "/about": { en: "About", de: "Über diese Seite", es: "", ru: "" },
  },
};

export function t(locale: Locale = defaultLocale, section: keyof TranslationTree, key: string): string {
  return pickLang(translations[section][key], locale);
}

export function navLabel(href: string, fallback: string, locale: Locale = defaultLocale): string {
  return pickLang(translations.nav[href], locale) || fallback;
}

export { translations };
