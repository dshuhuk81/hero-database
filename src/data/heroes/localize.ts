import { locales, type Locale } from "../../i18n/config";
import { pickLang, type LocalizedString } from "../../i18n/helpers";

type HeroTextOverlay = Record<string, unknown>;

const overlayModules = import.meta.glob("./i18n/*.json", { eager: true }) as Record<string, { default?: HeroTextOverlay }>;

const heroOverlays = Object.fromEntries(
  Object.entries(overlayModules).map(([path, module]) => {
    const file = path.split("/").pop() ?? "";
    const id = file.replace(/\.json$/i, "");
    return [id, module.default ?? {}];
  })
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isLocalizedStringMap(value: unknown): value is Partial<Record<Locale, string>> {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.some((key) => locales.includes(key as Locale)) && keys.every((key) => locales.includes(key as Locale) || typeof value[key] === "string" || value[key] == null);
}

function resolveBase(base: unknown, locale: Locale): unknown {
  if (typeof base === "string" || isLocalizedStringMap(base)) {
    return pickLang(base as LocalizedString, locale);
  }

  if (Array.isArray(base)) {
    return base.map((item) => resolveBase(item, locale));
  }

  if (isPlainObject(base)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(base)) {
      out[key] = resolveBase(value, locale);
    }
    return out;
  }

  return base;
}

function localizeNode(base: unknown, overlay: unknown, locale: Locale): unknown {
  if (overlay == null) return resolveBase(base, locale);

  if (typeof overlay === "string" || isLocalizedStringMap(overlay)) {
    const localized = pickLang(overlay as LocalizedString, locale);
    return localized || resolveBase(base, locale);
  }

  if (Array.isArray(base) || Array.isArray(overlay)) {
    const baseItems = Array.isArray(base) ? base : [];
    const overlayItems = Array.isArray(overlay) ? overlay : [];
    const length = Math.max(baseItems.length, overlayItems.length);
    return Array.from({ length }, (_, index) => localizeNode(baseItems[index], overlayItems[index], locale));
  }

  if (isPlainObject(base) || isPlainObject(overlay)) {
    const baseObject = isPlainObject(base) ? base : {};
    const overlayObject = isPlainObject(overlay) ? overlay : {};
    const keys = new Set([...Object.keys(baseObject), ...Object.keys(overlayObject)]);
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      out[key] = localizeNode(baseObject[key], overlayObject[key], locale);
    }
    return out;
  }

  return overlay ?? base;
}

export function localizeHeroData<T extends Record<string, unknown>>(hero: T, locale: Locale): T {
  const overlay = heroOverlays[(hero as { id?: string }).id ?? ""] ?? {};
  return localizeNode(hero, overlay, locale) as T;
}
