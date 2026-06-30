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
    lastUpdated: { en: "Last updated", de: "Zuletzt aktualisiert", es: "Última actualización", ru: "Последнее обновление" },
    front: { en: "Front", de: "Vorne", es: "Frente", ru: "Передний ряд" },
    back: { en: "Back", de: "Hinten", es: "Atrás", ru: "Задний ряд" },
    more: { en: "More", de: "Mehr", es: "Más", ru: "Ещё" },
    support: { en: "Support", de: "Unterstützen", es: "Apoyar", ru: "Поддержать" },
    dismiss: { en: "Dismiss", de: "Schließen", es: "Cerrar", ru: "Закрыть" },
  },
  events: {
    metaTitle: { en: "Event Guide | Motto Immortal", de: "Event-Guide | Motto Immortal", es: "Guía de eventos | Motto Immortal", ru: "Гайд по событиям | Motto Immortal" },
    metaDescription: {
      en: "Campaign stages and event team compositions for Motto Immortal.",
      de: "Kampagnenstufen und Event-Teamzusammenstellungen für Motto Immortal.",
      es: "Etapas de campaña y composiciones de equipo de eventos para Motto Immortal.",
      ru: "Этапы кампании и составы команд для событий в Motto Immortal.",
    },
    tag: { en: "PvE", de: "PvE", es: "PvE", ru: "PvE" },
    headline: { en: "Event Guide", de: "Event-Guide", es: "Guía de eventos", ru: "Гайд по событиям" },
    subtitle: { en: "Campaign stages & event team compositions", de: "Kampagnenstufen & Event-Teamzusammenstellungen", es: "Etapas de campaña y composiciones de equipo de eventos", ru: "Этапы кампании и составы команд для событий" },
  },
  footer: {
    claim: { en: "Motto Immortal\nHero Database by Frieren", de: "Motto Immortal\nHelden-Datenbank von Frieren", es: "Motto Immortal\nBase de datos de héroes por Frieren", ru: "Motto Immortal\nБаза героев от Frieren" },
    privacyPolicy: { en: "Privacy Policy", de: "Datenschutzhinweise", es: "Política de privacidad", ru: "Политика конфиденциальности" },
    copyright: { en: "{year} Motto Immortal @GOAT Games. All rights reserved.", de: "{year} Motto Immortal @GOAT Games. Alle Rechte vorbehalten.", es: "{year} Motto Immortal @GOAT Games. Todos los derechos reservados.", ru: "{year} Motto Immortal @GOAT Games. Все права защищены." },
    supportProject: { en: "Support the project", de: "Projekt unterstützen", es: "Apoyar el proyecto", ru: "Поддержать проект" },
  },
  language: {
    label: { en: "Language", de: "Sprache", es: "Idioma", ru: "Язык" },
  },
  nav: {
    "/": { en: "Home", de: "Startseite", es: "Inicio", ru: "Главная" },
    "/heroes": { en: "Hero List", de: "Heldenliste", es: "Lista de héroes", ru: "Список героев" },
    "/hero-stats": { en: "Hero Stats", de: "Heldenattribute", es: "Atributos de héroes", ru: "Характеристики героев" },
    "/cn-preview": { en: "CN vs Global", de: "CN vs. Global", es: "CN vs. global", ru: "CN vs Global" },
    "/virtues": { en: "Virtue Guide", de: "Tugenden-Guide", es: "Guía de virtudes", ru: "Гайд по добродетелям" },
    "/delusions-den": { en: "Delusion Den Guide", de: "Guide zur Höhle der Täuschung", es: "Guía de la Cueva del Engaño", ru: "Гайд по Пещере иллюзий" },
    "/tips": { en: "Tips", de: "Tipps", es: "Consejos", ru: "Советы" },
    "/bosses": { en: "Boss Encounters", de: "Bosskämpfe", es: "Encuentros con jefes", ru: "Бои с боссами" },
    "/events": { en: "Events", de: "Events", es: "Eventos", ru: "События" },
    "/totems": { en: "Totems", de: "Totems", es: "Tótems", ru: "Тотемы" },
    "/summon-calendar": { en: "Summon Calendar", de: "Beschwörungskalender", es: "Calendario de invocaciones", ru: "Календарь призывов" },
    "/summon-calculator": { en: "Summon Calculator", de: "Beschwörungsrechner", es: "Calculadora de invocaciones", ru: "Калькулятор призывов" },
    "/changelog": { en: "Changes", de: "Änderungen", es: "Cambios", ru: "Изменения" },
    "/status": { en: "Status", de: "Status", es: "Estado", ru: "Статус" },
    "/about": { en: "About", de: "Über diese Seite", es: "Acerca de esta página", ru: "О сайте" },
  },
};

export function t(locale: Locale = defaultLocale, section: keyof TranslationTree, key: string): string {
  return pickLang(translations[section][key], locale);
}

export function navLabel(href: string, fallback: string, locale: Locale = defaultLocale): string {
  return pickLang(translations.nav[href], locale) || fallback;
}

export { translations };
