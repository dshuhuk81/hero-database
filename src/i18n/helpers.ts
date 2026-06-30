import { defaultLocale, type Locale } from "./config";

export type LocalizedString = string | Partial<Record<Locale, string>>;

export function pickLang(value: LocalizedString | null | undefined, locale: Locale): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  const direct = value[locale]?.trim();
  if (direct) return direct;

  const fallback = value[defaultLocale]?.trim();
  if (fallback) return fallback;

  return Object.values(value).find((entry) => entry?.trim())?.trim() ?? "";
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}
