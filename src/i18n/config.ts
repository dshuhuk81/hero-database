export const locales = ["en", "de", "es", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  de: "DE",
  es: "ES",
  ru: "RU",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  ru: "Русский",
};

const localizedRoutes = new Set(["/", "/events", "/tips", "/totems"]);

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export function splitPath(pathname: string) {
  const cleanPath = pathname || "/";
  const [pathAndQuery, hash = ""] = cleanPath.split("#");
  const [pathOnly, query = ""] = pathAndQuery.split("?");

  return {
    pathOnly: pathOnly || "/",
    query: query ? `?${query}` : "",
    hash: hash ? `#${hash}` : "",
  };
}

export function getLocaleFromPathname(pathname: string): Locale {
  const { pathOnly } = splitPath(pathname);
  const firstSegment = pathOnly.split("/").filter(Boolean)[0];
  return isLocale(firstSegment) ? firstSegment : defaultLocale;
}

export function stripLocaleFromPathname(pathname: string): string {
  const { pathOnly, query, hash } = splitPath(pathname);
  const parts = pathOnly.split("/").filter(Boolean);

  if (isLocale(parts[0])) {
    parts.shift();
  }

  const stripped = parts.length ? `/${parts.join("/")}` : "/";
  return `${stripped}${query}${hash}`;
}

export function isLocalizedRoute(pathname: string): boolean {
  const { pathOnly } = splitPath(stripLocaleFromPathname(pathname));
  const normalized = pathOnly.replace(/\/+$/, "") || "/";
  return localizedRoutes.has(normalized);
}

export function localizePath(pathname: string, locale: Locale): string {
  const stripped = stripLocaleFromPathname(pathname);
  const { pathOnly, query, hash } = splitPath(stripped);
  const normalized = pathOnly.replace(/\/+$/, "") || "/";

  if (!localizedRoutes.has(normalized)) {
    return stripped;
  }

  const localizedPath = locale === defaultLocale ? normalized : `/${locale}${normalized}`;
  return `${localizedPath}${query}${hash}`;
}

export function getAlternateLinks(pathname: string, site?: URL | string) {
  if (!site || !isLocalizedRoute(pathname)) return [];

  return locales.map((locale) => ({
    locale,
    href: new URL(localizePath(pathname, locale), site).href,
  }));
}
