import { defaultLocale, type Locale } from "./config";
import { pickLang, type LocalizedString } from "./helpers";

type TranslationTree = {
  common: Record<string, LocalizedString>;
  home: Record<string, LocalizedString>;
  events: Record<string, LocalizedString>;
  tips: Record<string, LocalizedString>;
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
    compositions: { en: "Compositions", de: "Kombinationen", es: "Composiciones", ru: "Составы" },
    noCompositions: { en: "No compositions available for this mode.", de: "Für diesen Modus sind keine Kombinationen verfügbar.", es: "No hay composiciones disponibles para este modo.", ru: "Для этого режима нет доступных составов." },
    currentHero: { en: "Current hero", de: "Aktueller Held", es: "Héroe actual", ru: "Текущий герой" },
    totem: { en: "Totem", de: "Totem", es: "Tótem", ru: "Тотем" },
    strengths: { en: "Strengths", de: "Stärken", es: "Fortalezas", ru: "Сильные стороны" },
    weaknesses: { en: "Weaknesses", de: "Schwächen", es: "Debilidades", ru: "Слабые стороны" },
    noStrengths: { en: "No strengths listed yet.", de: "Noch keine Stärken eingetragen.", es: "Todavía no hay fortalezas listadas.", ru: "Пока не указаны сильные стороны." },
    noWeaknesses: { en: "No weaknesses listed yet.", de: "Noch keine Schwächen eingetragen.", es: "Todavía no hay debilidades listadas.", ru: "Пока не указаны слабые стороны." },
    relicInvestment: { en: "Relic Investment", de: "Relikt-Investition", es: "Inversión de reliquia", ru: "Вложение в реликвию" },
    f2pInvestment: { en: "F2P Investment", de: "F2P-Investition", es: "Inversión F2P", ru: "F2P-вложение" },
    recommendation: { en: "Recommendation", de: "Empfehlung", es: "Recomendación", ru: "Рекомендация" },
    usedIn: { en: "Used In", de: "Verwendet in", es: "Usado en", ru: "Используется в" },
  },
  home: {
    metaTitle: {
      en: "Motto Immortal Database | Hero Stats, Tier Lists & Guides",
      de: "Motto Immortal Datenbank | Heldenwerte, Tierlisten & Guides",
      es: "Base de datos de Motto Immortal | Estadísticas, listas de niveles y guías",
      ru: "База данных Motto Immortal | Статы героев, тир-листы и гайды",
    },
    metaDescription: {
      en: "The complete database for Motto Immortal. Hero stats, skills, tier lists, team compositions, boss guides and more. All 89 heroes covered.",
      de: "Die komplette Datenbank für Motto Immortal. Heldenwerte, Fähigkeiten, Tierlisten, Teamzusammenstellungen, Boss-Guides und mehr. Alle 89 Helden abgedeckt.",
      es: "La base de datos completa de Motto Immortal. Estadísticas, habilidades, listas de niveles, composiciones de equipo, guías de jefes y más. Los 89 héroes están cubiertos.",
      ru: "Полная база данных по Motto Immortal. Характеристики, навыки, тир-листы, составы команд, гайды по боссам и многое другое. Охвачены все 89 героев.",
    },
    heroHeadline: { en: "Motto Immortal", de: "Motto Immortal", es: "Motto Immortal", ru: "Motto Immortal" },
    exploreHeadline: { en: "Explore the Database", de: "Datenbank erkunden", es: "Explora la base de datos", ru: "Изучите базу данных" },
    keepFreeHeadline: { en: "Keep this free", de: "Diese Seite kostenlos halten", es: "Mantener esto gratis", ru: "Сохранить это бесплатным" },
    supportDescription: {
      en: "Motto Immortal DB is built and maintained solo - no paywalls, no sponsorships. Hosting and infrastructure cost real money every month. If this tool has saved you time or helped you build a better team, a small contribution goes a long way.",
      de: "Die Motto Immortal DB wird von einer einzelnen Person entwickelt und gepflegt – ohne Paywall und ohne Sponsoring. Hosting und Infrastruktur kosten jeden Monat echtes Geld. Wenn dir dieses Tool Zeit gespart oder geholfen hat, ein besseres Team zusammenzustellen, hilft schon ein kleiner Beitrag sehr.",
      es: "Motto Immortal DB se construye y mantiene en solitario: sin muros de pago ni patrocinios. El alojamiento y la infraestructura cuestan dinero real cada mes. Si esta herramienta te ha ahorrado tiempo o te ha ayudado a formar un mejor equipo, una pequeña aportación ayuda mucho.",
      ru: "Motto Immortal DB создаётся и поддерживается в одиночку — без платного доступа и без спонсоров. Хостинг и инфраструктура стоят реальных денег каждый месяц. Если этот инструмент сэкономил вам время или помог собрать более сильную команду, небольшая поддержка действительно помогает.",
    },
    supportBullet1: { en: "Vercel hosting & serverless functions", de: "Vercel-Hosting und serverlose Funktionen", es: "Hosting en Vercel y funciones sin servidor", ru: "Хостинг Vercel и serverless-функции" },
    supportBullet2: { en: "Domain & CDN costs", de: "Domain- und CDN-Kosten", es: "Costes de dominio y CDN", ru: "Расходы на домен и CDN" },
    supportBullet3: { en: "Time spent on data, updates & new features", de: "Zeit für Daten, Updates und neue Funktionen", es: "Tiempo dedicado a datos, actualizaciones y nuevas funciones", ru: "Время на данные, обновления и новые функции" },
    supportKofi: { en: "Support on Ko-fi", de: "Auf Ko-fi unterstützen", es: "Apoyar en Ko-fi", ru: "Поддержать на Ko-fi" },
    supportPaypal: { en: "Donate via PayPal", de: "Per PayPal spenden", es: "Donar por PayPal", ru: "Пожертвовать через PayPal" },
    supportAlt: { en: "No budget? Sharing this site with your guild or alliance helps just as much.", de: "Kein Budget? Wenn du die Seite mit deiner Gilde oder Allianz teilst, hilft das genauso.", es: "¿Sin presupuesto? Compartir este sitio con tu gremio o alianza también ayuda muchísimo.", ru: "Нет бюджета? Поделиться этим сайтом с вашей гильдией или альянсом помогает не меньше." },
    supportersLabel: { en: "Thank you for your donation!", de: "Danke für deine Spende!", es: "¡Gracias por tu donación!", ru: "Спасибо за ваше пожертвование!" },
    languageNoticeEyebrow: { en: "New", de: "Neu", es: "Nuevo", ru: "Новое" },
    languageNoticeTitle: {
      en: "Motto Immortal DB now speaks more languages",
      de: "Motto Immortal DB gibt es jetzt in mehreren Sprachen",
      es: "Motto Immortal DB ahora está disponible en varios idiomas",
      ru: "Motto Immortal DB теперь доступна на нескольких языках",
    },
    languageNoticeBody: {
      en: "You can switch between English, German, Spanish and Russian with the language selector. If you spot translation issues or missing text, please contact me directly on Discord.",
      de: "Du kannst oben zwischen Englisch, Deutsch, Spanisch und Russisch wechseln. Wenn dir Übersetzungsfehler oder fehlende Texte auffallen, melde dich gern direkt bei mir auf Discord.",
      es: "Puedes cambiar entre inglés, alemán, español y ruso con el selector de idioma. Si ves errores de traducción o textos faltantes, contáctame directamente por Discord.",
      ru: "Теперь можно переключаться между английским, немецким, испанским и русским через выбор языка. Если заметите ошибки перевода или пропущенный текст, напишите мне напрямую в Discord.",
    },
    languageNoticeDiscord: { en: "Discord: ds_frieren", de: "Discord: ds_frieren", es: "Discord: ds_frieren", ru: "Discord: ds_frieren" },
    languageNoticeDismiss: { en: "Got it", de: "Alles klar", es: "Entendido", ru: "Понятно" },
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
    subtitle: { en: "Campaign stages & event team compositions", de: "Kampagnenstufen & Event-Teamzusammenstellungen", es: "Etapas de campaña y composiciones de equipo para eventos de Motto Immortal.", ru: "Этапы кампании и составы команд для событий" },
  },
  tips: {
    metaTitle: { en: "Tips | Motto Immortal", de: "Tipps | Motto Immortal", es: "Consejos | Motto Immortal", ru: "Советы | Motto Immortal" },
    metaDescription: {
      en: "Beginner tips and core game mechanics for Motto Immortal.",
      de: "Anfängertipps und grundlegende Spielmechaniken für Motto Immortal.",
      es: "Consejos para principiantes y mecánicas básicas de juego para Motto Immortal.",
      ru: "Советы для новичков и базовые механики игры Motto Immortal.",
    },
    tag: { en: "Guide", de: "Guide", es: "Guía", ru: "Гайд" },
    headline: { en: "Tips", de: "Tipps", es: "Consejos", ru: "Советы" },
    subtitle: { en: "Beginner tips and core game mechanics", de: "Anfängertipps und grundlegende Spielmechaniken", es: "Consejos para principiantes y mecánicas básicas del juego", ru: "Советы для новичков и базовые механики игры" },
    lastUpdated: { en: "Last updated", de: "Zuletzt aktualisiert", es: "Última actualización", ru: "Последнее обновление" },
    subnavMechanics: { en: "Mechanics", de: "Mechaniken", es: "Mecánicas", ru: "Механики" },
    subnavEarly: { en: "Early Game", de: "Frühes Spiel", es: "Inicio", ru: "Начало игры" },
    subnavMidLate: { en: "Mid-Late", de: "Mittleres & spätes Spiel", es: "Juego medio y tardío", ru: "Середина и поздняя игра" },
    subnavTeams: { en: "Team Building", de: "Teambuilding", es: "Construcción de equipo", ru: "Сборка команды" },
  },
  totems: {
    metaTitle: { en: "Totems | Motto Immortal", de: "Totems | Motto Immortal", es: "Tótems | Motto Immortal", ru: "Тотемы | Motto Immortal" },
    metaDescription: {
      en: "All totems with effects, archetypes, and ratings for Motto Immortal.",
      de: "Alle Totems mit Effekten, Archetypen und Bewertungen für Motto Immortal.",
      es: "Todos los tótems con efectos, arquetipos y valoraciones para Motto Immortal.",
      ru: "Все тотемы с эффектами, архетипами и рейтингами для Motto Immortal.",
    },
    tag: { en: "Equipment", de: "Ausrüstung", es: "Equipo", ru: "Снаряжение" },
    headline: { en: "Totems", de: "Totems", es: "Tótems", ru: "Тотемы" },
    subtitle: { en: "All totems with effects & ratings", de: "Alle Totems mit Effekten und Bewertungen", es: "Todos los tótems con efectos y valoraciones", ru: "Все тотемы с эффектами и рейтингами" },
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
    "/delusions-den": { en: "Delusion Den Guide", de: "Guide für die Höhle der Täuschung", es: "Guía de la Cueva del Engaño", ru: "Гайд по Пещере иллюзий" },
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
