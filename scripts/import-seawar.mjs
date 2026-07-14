import fs from "node:fs";
import path from "node:path";

// Builds src/data/seawar.json from the extracted game client config
// (Sacred Vessel War / internal name "SeaWar").
// Source: android/live_extractions/<stamp>/unpacked/<region>/client/config/seawar/*
// Nothing here is invented - every field is copied from the client config.
// Attribute names and categories come from the client enums
// ESeaWarAttrType / ESeaWarAttrTypeType.

const DUMP_ROOT = "/Users/daschultheiss/android/live_extractions";
const OUTPUT_PATH = "src/data/seawar.json";

// ESeaWarAttrType (client/dist/default/game-define/generated/SeaWarAttrTypeDefine.js)
const ATTR_NAMES = {
  1: "Hp",
  2: "ArmorPiercing",
  3: "Explosion",
  4: "Hardness",
  5: "Thickness",
  6: "HpRecovery",
  7: "MiningEfficiency",
  8: "MiningCapacity",
  9: "PlunderEfficiency",
  10: "AdvancedMiningEfficiency",
  11: "Cannon",
  12: "Shield",
  13: "Stamina",
  14: "StaminaRecovery",
};

// ESeaWarAttrTypeType
const CATEGORY_NAMES = { 1: "Combat", 2: "Mining", 3: "Survival" };

// Ship stat template keys per attribute (Private.js SEA_WAR_ATTR_TEMPLATE_KEY_MAP)
const ATTR_STAT_KEY = {
  1: "hp",
  2: "atk1",
  3: "atk2",
  4: "def1",
  5: "def2",
  6: "hp_restore",
  7: "prod_rate",
  8: "prod_limit",
  9: "rape_rate",
  10: "prod_limit_sp",
  11: "atk_num",
  12: "def_shield",
  13: "power_limit",
  14: "power_restore",
};

// Resource ids used by the mode (seawar_constant.json)
const RESOURCE_NAMES = {
  203: "ore",
  204: "rareOre",
  205: "stamina",
  15: "diamonds",
};

function findLatestDump() {
  const stamps = fs
    .readdirSync(DUMP_ROOT)
    .filter((entry) => /^\d{8}_\d{6}$/.test(entry))
    .sort()
    .reverse();

  for (const stamp of stamps) {
    const unpacked = path.join(DUMP_ROOT, stamp, "unpacked");
    if (!fs.existsSync(unpacked)) continue;
    for (const region of fs.readdirSync(unpacked).sort()) {
      const seawarDir = path.join(unpacked, region, "client", "config", "seawar");
      if (fs.existsSync(path.join(seawarDir, "seawar_constant.json"))) {
        return { stamp, region, seawarDir, configDir: path.join(unpacked, region, "client", "config") };
      }
    }
  }
  return null;
}

function readJson(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  delete raw.__m;
  return raw;
}

function toCost(cost) {
  if (!cost) return null;
  return { resource: RESOURCE_NAMES[cost.type] ?? String(cost.type), num: cost.num ?? 0 };
}

function buildShipLevels(raw) {
  return Object.values(raw)
    .sort((a, b) => a.LV - b.LV)
    .map((row) => ({
      level: row.LV,
      upgradeCost: toCost(row.cost),
      hp: row.hp,
      armorPiercing: row.atk1,
      explosion: row.atk2,
      hardness: row.def1,
      thickness: row.def2,
      hpRecovery: row.hp_restore,
      cannon: row.atk_num,
      shield: row.def_shield,
      miningEfficiency: row.prod_rate,
      miningCapacity: row.prod_limit,
      plunderEfficiency: row.rape_rate,
      stamina: row.power_limit,
      staminaRecovery: row.power_restore,
    }));
}

// Maps attr id -> icon slug, taken from icon_path in seawar_talent_enum.json.
// The icons are extracted from the SA_UI_SeaWar sprite atlas by
// scripts/extract-seawar-assets.py into public/seawar/icons/.
function buildIconMap(enumRaw) {
  const map = {};
  for (const entry of Object.values(enumRaw)) {
    const file = entry.icon_path?.split("/").pop() ?? "";
    const slug = file.replace(/^A_UI_Seawar_Skill_/i, "").replace(/\.png$/i, "").toLowerCase();
    if (slug) map[entry.attr_id] = `/seawar/icons/${slug}.webp`;
  }
  return map;
}

function buildTalents(raw, iconMap) {
  return Object.entries(raw)
    .map(([groupId, levelMap]) => {
      const levels = Object.values(levelMap)
        .filter((entry) => typeof entry === "object")
        .sort((a, b) => a.talent_lv - b.talent_lv)
        .map((entry) => ({
          level: entry.talent_lv,
          requiredShipLevel: entry.necessary_lv,
          cost: toCost(entry.cost),
          value: entry.value,
        }));
      const source = Object.values(levelMap).find((entry) => typeof entry === "object");
      return {
        group: Number(groupId),
        attr: source.attr,
        attrName: ATTR_NAMES[source.attr],
        statKey: ATTR_STAT_KEY[source.attr],
        category: CATEGORY_NAMES[source.type],
        icon: iconMap[source.attr] ?? null,
        maxLevel: levels[levels.length - 1].level,
        costResource: levels[0].cost?.resource ?? null,
        totalCost: levels.reduce((sum, l) => sum + (l.cost?.num ?? 0), 0),
        levels,
      };
    })
    .sort((a, b) => a.group - b.group);
}

// Ship avatar layers. The Chinese asset names say what each layer is:
// chuanfan = sails, chuanshou = bow, chuanshen = hull, huopao = cannons.
// All four textures share one 520x360 canvas and stack into the full ship.
const SHIP_PARTS = {
  1: { part: "sails", asset: "chuanfan" },
  2: { part: "bow", asset: "chuanshou" },
  3: { part: "hull", asset: "chuanshen" },
  4: { part: "cannons", asset: "huopao" },
  5: { part: "shield", asset: null },
};

function buildShipVisuals(raw) {
  return Object.values(raw).map((row) => {
    const meta = SHIP_PARTS[row.id] ?? { part: String(row.id), asset: null };
    return {
      id: row.id,
      part: meta.part,
      asset: meta.asset,
      drivenBy: (row.attr_type ?? []).map((attr) => ATTR_NAMES[attr] ?? "shipLevel"),
      stageThresholds: row.lv,
      // Only the four drawn layers have textures; the shield layer is empty_img in the config.
      images: meta.asset
        ? row.res_path.map((res, index) =>
            res === "empty_img" ? null : `/seawar/a_ui_seawar_${meta.asset}_${index}.webp`,
          )
        : null,
    };
  });
}

function buildSeasons(configDir) {
  const activePath = path.join(configDir, "active", "active.json");
  if (!fs.existsSync(activePath)) return [];
  const active = readJson(activePath);
  return Object.values(active)
    .filter((entry) => typeof entry?.name === "string" && entry.name.startsWith("seawar"))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      version: entry.version,
      start: entry.start_time,
      end: entry.end_time,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

const dump = findLatestDump();
if (!dump) {
  console.error("No seawar config found under", DUMP_ROOT);
  process.exit(1);
}

const constants = readJson(path.join(dump.seawarDir, "seawar_constant.json"));
const shipLevels = buildShipLevels(readJson(path.join(dump.seawarDir, "seawar_ship_level.json")));
const iconMap = buildIconMap(readJson(path.join(dump.seawarDir, "seawar_talent_enum.json")));
const talents = buildTalents(readJson(path.join(dump.seawarDir, "seawar_ship_talent_level.json")), iconMap);
const shipVisuals = buildShipVisuals(readJson(path.join(dump.seawarDir, "seawar_ship_avatar.json")));
const seasons = buildSeasons(dump.configDir);

let cumulative = 0;
for (const level of shipLevels) {
  level.cumulativeOre = cumulative;
  cumulative += level.upgradeCost?.num ?? 0;
}

const output = {
  meta: {
    source: `live_extractions/${dump.stamp}/unpacked/${dump.region}/client/config/seawar`,
    captured: dump.stamp.slice(0, 4) + "-" + dump.stamp.slice(4, 6) + "-" + dump.stamp.slice(6, 8),
    generatedBy: "scripts/import-seawar.mjs",
    note: "Values copied verbatim from the game client config. Units for miningEfficiency, staminaRecovery and deathProtectionPeriod are not exposed by the client and are shown as raw values.",
  },
  seasons,
  constants: {
    unprotectionLevel: constants.unprotection_lv,
    deathProtectionPeriod: constants.death_protection_period,
    shieldDuration: constants.shield_duration,
    defenderAdvantage: constants.def_advantage,
    attacksPerBattle: constants.attack_num_per_battle,
    continuousAttackStaminaRequirement: constants.continuous_attack_limit,
    refreshEnemyNum: constants.refresh_enemy_num,
    dailyFreeRefreshCount: constants.daily_refresh_enemy_count,
    refreshPurchaseLimitPerDay: constants.refresh_count_daily_purchase_limit,
    radarCost: toCost(constants.radar_count_price),
    oreToHpExchange: constants.gold_hp_exchange_rate,
    rareOrePerStamina: constants.gold_power_exchange_rate,
    rareOreToOreRate: constants.sp_gold_exchange_rate,
    battleRecordLimit: constants.user_battle_record_limit,
    attackedRecordLimit: constants.user_be_attacked_record_limit,
    allianceBattleRecordLimit: constants.alliance_battle_record_limit,
    matchmaking: {
      sameAllianceMembers: constants.refresh_same_alliance_member,
      includeDefeatedPlayers: constants.refresh_defeated_player,
      defeatedPlayerPercent: constants.refresh_defeated_player_percent,
      higherCombatPercent: constants.refresh_higher_combat_player_percent,
      lowerCombatPercent: constants.refresh_lower_combat_player_num_percent,
    },
    talentGroupCount: constants.talent_group_num,
  },
  shipLevels,
  talents,
  shipVisuals,
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

console.log(`Wrote ${OUTPUT_PATH}`);
console.log(`  source      : ${output.meta.source}`);
console.log(`  seasons     : ${seasons.length}`);
console.log(`  ship levels : ${shipLevels.length} (total ore to max: ${cumulative.toLocaleString("en-US")})`);
console.log(`  talents     : ${talents.length}`);
