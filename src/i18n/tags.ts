import type { Locale } from "./config";

// Localized synergy-tag labels. English intentionally omitted: the caller's
// SNAKE_CASE -> Title Case fallback keeps the existing English wording, so
// English rendering never changes. de/es/ru/zh use concise game terms.
type TagLabel = Partial<Record<Locale, string>>;

const TAG_LABELS: Record<string, TagLabel> = {
  DEATH_PREVENTION: { de: "Todesverhinderung", es: "Prevención de muerte", ru: "Предотвращение смерти", zh: "免死" },
  ENEMY_ARMOR_REDUCTION: { de: "Rüstungsreduktion", es: "Reducción de armadura", ru: "Снижение брони", zh: "减甲" },
  ENEMY_ATK_DOWN: { de: "ANG-Senkung", es: "Reducción de ATQ", ru: "Снижение ATK", zh: "降攻" },
  ENEMY_ATK_SPD_DOWN: { de: "Angriffstempo-Senkung", es: "Reducción de vel. de ATQ", ru: "Снижение скор. атаки", zh: "降攻速" },
  ENEMY_ATTRIBUTE_REDUCTION: { de: "Attribut-Reduktion", es: "Reducción de atributos", ru: "Снижение характеристик", zh: "属性削弱" },
  ENEMY_BUFF_DISPEL: { de: "Buff-Entfernung", es: "Disipar mejoras", ru: "Развеивание баффов", zh: "驱散增益" },
  ENEMY_CROWD_CONTROL: { de: "Massenkontrolle", es: "Control de masas", ru: "Контроль", zh: "控制" },
  ENEMY_ENERGY_DRAIN: { de: "Energieentzug", es: "Drenaje de energía", ru: "Похищение энергии", zh: "能量吸取" },
  ENEMY_DAMAGE_DEALT_DOWN: { de: "Gegnerschaden −", es: "Daño enemigo reducido", ru: "Снижение урона врага", zh: "降低敌方伤害" },
  ENEMY_TAUNT: { de: "Spott", es: "Provocar", ru: "Провокация", zh: "嘲讽" },
  ENEMY_VULNERABILITY: { de: "Verwundbarkeit", es: "Vulnerabilidad", ru: "Уязвимость", zh: "易伤" },
  PLAYSTYLE_AREA_DAMAGE: { de: "Flächenschaden", es: "Daño en área", ru: "Урон по площади", zh: "范围伤害" },
  PLAYSTYLE_BASIC_ATTACK_SCALER: { de: "Normalangriff-Skalierung", es: "Escalado de ataque básico", ru: "Масштаб. от обычных атак", zh: "普攻流" },
  REVIVE: { de: "Wiederbelebung", es: "Revivir", ru: "Воскрешение", zh: "复活" },
  SELF_ARMOR_UP: { de: "Rüstung +", es: "Aumento de armadura", ru: "Повышение брони", zh: "增甲" },
  SELF_ATK_SPEED: { de: "Angriffstempo", es: "Vel. de ataque", ru: "Скорость атаки", zh: "攻速" },
  SELF_ATK_UP: { de: "ANG +", es: "Aumento de ATQ", ru: "Повышение ATK", zh: "增攻" },
  SELF_CC_RESISTANCE: { de: "CC-Resistenz", es: "Resistencia a control", ru: "Сопр. контролю", zh: "抗控" },
  SELF_DAMAGE_REDUCTION: { de: "Schadensreduktion", es: "Reducción de daño", ru: "Снижение урона", zh: "减伤" },
  SELF_DODGE: { de: "Ausweichen", es: "Evasión", ru: "Уклонение", zh: "闪避" },
  SELF_ENERGY_RESTORE: { de: "Energieregeneration", es: "Recuperación de energía", ru: "Восстановление энергии", zh: "回能" },
  SELF_DEF_IGNORE: { de: "VTD ignorieren", es: "Ignorar DEF", ru: "Игнорирование защиты", zh: "无视防御" },
  SELF_HEAL: { de: "Heilung", es: "Curación", ru: "Лечение", zh: "治疗" },
  SELF_HEAL_EFFECT_UP: { de: "Heileffekt +", es: "Aumento de curación", ru: "Усиление лечения", zh: "治疗强化" },
  SELF_HIT_AVOID: { de: "Treffer vermeiden", es: "Evitar impacto", ru: "Уход от удара", zh: "免命中" },
  SELF_HP_UP: { de: "LP +", es: "Aumento de HP", ru: "Повышение HP", zh: "增加生命" },
  SELF_LIFESTEAL_UP: { de: "Lebensraub +", es: "Aumento de robo de vida", ru: "Усиление вампиризма", zh: "生命汲取" },
  SELF_SHIELD: { de: "Schild", es: "Escudo", ru: "Щит", zh: "护盾" },
  SELF_SUSTAIN: { de: "Selbstheilung", es: "Sustento", ru: "Устойчивость", zh: "续航" },
  SUMMON: { de: "Beschwörung", es: "Invocación", ru: "Призыв", zh: "召唤" },
  TEAM_ATK_SPD_UP: { de: "Team-Angriffstempo +", es: "Vel. de ATQ de equipo", ru: "Скор. атаки команды", zh: "团队攻速" },
  TEAM_BUFF: { de: "Team-Buff", es: "Mejora de equipo", ru: "Бафф команды", zh: "团队增益" },
  TEAM_CC_IMMUNITY: { de: "CC-Immunität", es: "Inmunidad a control", ru: "Иммунитет к контролю", zh: "免控" },
  TEAM_CDR: { de: "Team-Abklingzeit", es: "Red. de enfriamiento de equipo", ru: "Ускор. перезарядки команды", zh: "团队冷却缩减" },
  TEAM_DAMAGE_REDUCTION: { de: "Team-Schadensreduktion", es: "Reducción de daño de equipo", ru: "Снижение урона команды", zh: "团队减伤" },
  TEAM_DEBUFF_CLEANSE: { de: "Debuff-Reinigung", es: "Purga de perjuicios", ru: "Очищение дебаффов", zh: "净化" },
  TEAM_ENERGY_RESTORE: { de: "Team-Energie", es: "Energía de equipo", ru: "Энергия команды", zh: "团队回能" },
  TEAM_HEAL: { de: "Team-Heilung", es: "Curación de equipo", ru: "Лечение команды", zh: "团队治疗" },
  TEAM_SHIELD: { de: "Team-Schild", es: "Escudo de equipo", ru: "Щит команды", zh: "团队护盾" },
};

export function getTagLabelTranslation(tag: string, locale: Locale): string | undefined {
  return TAG_LABELS[tag]?.[locale];
}
