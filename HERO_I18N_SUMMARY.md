# Hero I18N Summary

## Ziel
Die Hero-Detailseiten sollen ihre Texte je nach Sprache aus externen Uebersetzungs-Overlays beziehen, statt alles direkt in Astro- und HTML-Snippets zu pflegen.

## Umgesetzt

- Eine Overlay-Schicht fuer Heldentexte ist aktiv.
  - Basisdaten bleiben in `src/data/heroes/*.json`.
  - Sprachspezifische Texte liegen in `src/data/heroes/i18n/*.json`.
  - `src/data/heroes/localize.ts` legt die Uebersetzungen rekursiv auf die Basisdaten.

- Die Hero-Detailseiten sind sprachfaehig.
  - `src/pages/heroes/[id].astro` nutzt die lokalisierte Hero-Datenquelle.
  - `src/pages/[locale]/heroes/[id].astro` stellt die Sprach-Routen bereit.
  - Hero-Navigation, Side-Section-Titel und Ratings greifen auf die Locale-Texte zu.

- Die hero-spezifischen UI-Texte sind erweitert.
  - `src/i18n/ui.ts` enthaelt neue Schluessel fuer Hero-Labels, Rating-Texte, Stat-Labels, CN-Vergleich, Synergien und Investment-Bereiche.
  - `src/components/RatingTiles.astro` zeigt lokalisierte Rating-Beschriftungen.
  - `src/components/RelicInvestment.astro` und `src/components/F2pInvestment.astro` akzeptieren lokalisierte Strings.
  - `src/components/HeroCompositions.astro` zieht lokalisierte Hero-Namen und lokale Links.

## Neue Hero-Overlays

- Vollstaendige Uebersetzungen fuer:
  - `src/data/heroes/i18n/zeus.json`
  - `src/data/heroes/i18n/athena.json`
  - `src/data/heroes/i18n/heracles.json`

- Namens-Overlays fuer mitreferenzierte Helden:
  - `src/data/heroes/i18n/yuelao.json`
  - `src/data/heroes/i18n/dionysus.json`
  - `src/data/heroes/i18n/caishen.json`
  - `src/data/heroes/i18n/diana.json`
  - `src/data/heroes/i18n/mengpo.json`
  - `src/data/heroes/i18n/nuba.json`

## Zusatzaenderungen

- `src/data/ratings/invest.json` enthaelt lokalisierte Investitionshinweise fuer Zeus.
- Der Language Switcher bleibt ueber den Sticky-Elementen sichtbar.

## Verifikation

- JSON-Checks fuer die neuen Overlay-Dateien laufen sauber.
- `npm run build` ist erfolgreich durchgelaufen.

## Stand

Die Heldenseiten liefern jetzt bereits fuer die lokalisierten Overlays echte deutsche, spanische und russische Texte. Weitere Helden koennen im gleichen Muster nachgezogen werden, ohne die Seitenstruktur erneut umbauen zu muessen.
