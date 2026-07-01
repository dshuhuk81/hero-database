import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const heroesDir = path.join(root, "src", "data", "heroes");
const overlayDir = path.join(heroesDir, "i18n");

const overrides = {
  amunra: { de: "Amun-Ra", es: "Amón-Ra", ru: "Амон-Ра" },
  aquarius: { de: "Wassermann", es: "Acuario", ru: "Водолей" },
  aries: { de: "Widder", es: "Aries", ru: "Овен" },
  artemis: { de: "Artemis", es: "Artemisa", ru: "Артемида" },
  cancer: { de: "Krebs", es: "Cáncer", ru: "Рак" },
  canopicjar: { de: "Kanopenkrug", es: "Jarra canópica", ru: "Канопический сосуд" },
  capricorn: { de: "Steinbock", es: "Capricornio", ru: "Козерог" },
  cronus: { de: "Kronos", es: "Crono", ru: "Кронос" },
  demeter: { de: "Demeter", es: "Deméter", ru: "Деметра" },
  freya: { de: "Freya", es: "Freya", ru: "Фрейя" },
  gemini: { de: "Zwillinge", es: "Géminis", ru: "Близнецы" },
  hebo: { de: "Hebo", es: "Hebo", ru: "Хэ Бо" },
  hecate: { de: "Hekate", es: "Hécate", ru: "Геката" },
  heket: { de: "Heket", es: "Heket", ru: "Хекет" },
  hela: { de: "Hela", es: "Hela", ru: "Хела" },
  hephaestus: { de: "Hephaistos", es: "Hefesto", ru: "Гефест" },
  jormungandr: { de: "Jörmungandr", es: "Jörmungandr", ru: "Ёрмунганд" },
  leo: { de: "Löwe", es: "Leo", ru: "Лев" },
  libra: { de: "Waage", es: "Libra", ru: "Весы" },
  momus: { de: "Momos", es: "Momos", ru: "Момос" },
  nephtys: { de: "Nephthys", es: "Neftis", ru: "Нефтида" },
  nut: { de: "Nut", es: "Nut", ru: "Нут" },
  nuwa: { de: "Nüwa", es: "Nüwa", ru: "Нюйва" },
  phoenix: { de: "Phönix", es: "Fénix", ru: "Феникс" },
  pisces: { de: "Fische", es: "Piscis", ru: "Рыбы" },
  sagittarius: { de: "Schütze", es: "Sagitario", ru: "Стрелец" },
  scorpio: { de: "Skorpion", es: "Escorpio", ru: "Скорпион" },
  set: { de: "Seth", es: "Set", ru: "Сет" },
  taurus: { de: "Stier", es: "Tauro", ru: "Телец" },
  virgo: { de: "Jungfrau", es: "Virgo", ru: "Дева" },
  xuannv: { de: "Xuannv", es: "Xuannv", ru: "Сюаньнюй" },
  yanluo: { de: "Yanluo", es: "Yanluo", ru: "Яньло" },
  zaojun: { de: "Zaojun", es: "Zaojun", ru: "Цзаоцзюнь" },
};

function heroNameFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  return data.name || "";
}

function localizedNames(baseName, id) {
  const override = overrides[id] ?? {};
  return {
    de: override.de ?? baseName,
    es: override.es ?? baseName,
    ru: override.ru ?? baseName,
  };
}

const files = fs
  .readdirSync(heroesDir)
  .filter((file) => file.endsWith(".json"))
  .filter((file) => file !== "index.js");

let created = 0;

for (const file of files) {
  const id = file.replace(/\.json$/i, "");
  const overlayPath = path.join(overlayDir, `${id}.json`);
  if (fs.existsSync(overlayPath)) continue;

  const basePath = path.join(heroesDir, file);
  const baseName = heroNameFromFile(basePath);
  const names = localizedNames(baseName, id);
  const content = {
    name: {
      de: names.de,
      es: names.es,
      ru: names.ru,
    },
  };

  fs.writeFileSync(overlayPath, `${JSON.stringify(content, null, 2)}\n`);
  created += 1;
}

console.log(`Created ${created} hero name overlays.`);
