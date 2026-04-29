var TRANSLATIONS = {
  en: {
    nav_home: "Home",
    nav_heros: "Heros",
    nav_guides: "Hero Guides",
    nav_tips: "Tips",
    nav_bosses: "Boss Encounters",
    nav_events: "Events",
    nav_tower: "Tower",
    nav_delusions: "Delusions Den",
    nav_totems: "Totems",
    nav_virtues: "Virtues",
    nav_changes: "Changes",
    nav_about: "About",
    nav_support: "Support",
    nav_more: "More",
    nav_support_project: "Support the project",
    index_explore: "Explore the Database",
    support_headline: "Keep this free",
    support_desc: "Motto Immortal DB is built and maintained solo - no paywalls, no sponsorships. Hosting and infrastructure cost real money every month. If this tool has saved you time or helped you build a better team, a small contribution goes a long way.",
    support_item1: "Vercel hosting & serverless functions",
    support_item2: "Domain & CDN costs",
    support_item3: "Time spent on data, updates & new features",
    support_donate_paypal: "Donate via PayPal",
    support_donate_kofi: "Support on Ko-fi",
    support_alt: "No budget? Sharing this site with your guild or alliance helps just as much.",
    support_thankyou: "Thank you for your donation!",
    heroes_tag: "Hero Database",
    heroes_headline: "Choose your hero",
    heroes_subtitle: "Browse all heroes, stats, skills & synergies",
    heroes_shown: " Heroes shown",
    heroes_sort_by: "Sort by",
    heroes_sort_name_asc: "Name (A-Z)",
    heroes_sort_name_desc: "Name (Z-A)",
    heroes_sort_rating_desc: "Rating (best first)",
    heroes_sort_rating_asc: "Rating (worst first)",
    heroes_sort_class: "Class",
    heroes_sort_rarity_desc: "Rarity (highest first)",
    footer_privacy: "Privacy Policy"
  },
  ru: {
    nav_home: "Главная",
    nav_heros: "Герои",
    nav_guides: "Гайды",
    nav_tips: "Советы",
    nav_bosses: "Боссы",
    nav_events: "События",
    nav_tower: "Башня",
    nav_delusions: "Логово заблуждений",
    nav_totems: "Тотемы",
    nav_virtues: "Добродетели",
    nav_changes: "Изменения",
    nav_about: "О проекте",
    nav_support: "Поддержка",
    nav_more: "Ещё",
    nav_support_project: "Поддержать проект",
    index_explore: "Исследуй базу данных",
    support_headline: "Поддержи проект",
    support_desc: "Motto Immortal DB создаётся и поддерживается одним человеком - без платного контента и спонсоров. Хостинг и инфраструктура стоят реальных денег каждый месяц. Если этот инструмент сэкономил тебе время - небольшой вклад имеет большое значение.",
    support_item1: "Хостинг Vercel и серверные функции",
    support_item2: "Домен и CDN",
    support_item3: "Время на данные, обновления и новые функции",
    support_donate_paypal: "Донат через PayPal",
    support_donate_kofi: "Поддержать на Ko-fi",
    support_alt: "Нет бюджета? Поделись сайтом с гильдией - это тоже помогает.",
    support_thankyou: "Спасибо за донат!",
    heroes_tag: "База данных героев",
    heroes_headline: "Выбери своего героя",
    heroes_subtitle: "Все герои, статы, навыки и синергии",
    heroes_shown: " Героев показано",
    heroes_sort_by: "Сортировка",
    heroes_sort_name_asc: "Имя (А-Я)",
    heroes_sort_name_desc: "Имя (Я-А)",
    heroes_sort_rating_desc: "Рейтинг (лучшие)",
    heroes_sort_rating_asc: "Рейтинг (худшие)",
    heroes_sort_class: "Класс",
    heroes_sort_rarity_desc: "Редкость (высшая)",
    footer_privacy: "Конфиденциальность"
  }
};

function applyTranslations(lang) {
  var dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  document.documentElement.setAttribute('data-lang', lang);
  var els = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-i18n');
    if (dict[key]) els[i].textContent = dict[key];
  }
  // update toggle button states
  var btns = document.querySelectorAll('.lang-btn');
  for (var j = 0; j < btns.length; j++) {
    btns[j].classList.toggle('active', btns[j].getAttribute('data-lang-set') === lang);
  }
}

function initI18n() {
  var lang = localStorage.getItem('lang') || 'en';
  applyTranslations(lang);

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.lang-btn');
    if (!btn) return;
    var newLang = btn.getAttribute('data-lang-set');
    if (!newLang) return;
    localStorage.setItem('lang', newLang);
    applyTranslations(newLang);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}
