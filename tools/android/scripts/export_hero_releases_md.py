"""Shared offline Markdown exporter for the separate CN and Global entry points.

Pass an unpacked x_cn/x_global directory or a client pull directory (cn/global).
Pulls are unpacked using unpack_config; only that mode needs PyCryptodome.
No emulator, Frida, online services, or manually curated name maps are used.
"""
import argparse
import json
import re
import zlib
from collections import Counter
from datetime import date
from pathlib import Path

from cn_hero_dates import PLACEHOLDER, skin_names


def language_pairs(source):
    """Read actual client language chunks (raw DEFLATE JSON key/value pairs)."""
    if source is None:
        return {}
    paths = sorted((p for p in source.iterdir() if p.name.isdigit()), key=lambda p: int(p.name)) if source.is_dir() else [source]
    pairs = {}
    for path in paths:
        raw = path.read_bytes()
        try:
            data = json.loads(raw.decode('utf-8-sig'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            data = json.loads(zlib.decompress(raw, -15).decode('utf-8-sig'))
        entries = data.items() if isinstance(data, dict) else data
        for key, value in entries:
            if not isinstance(value, str):
                raise ValueError(f'{path}: language value for {key!r} is not a string')
            if key in pairs and pairs[key] != value:
                raise ValueError(f'{path}: conflicting language values for {key!r}')
            pairs[key] = value
    return pairs


def cell(value):
    if value is None or value == '':
        return '—'
    return str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('|', '\\|').replace('\r', ' ').replace('\n', '<br>')


def release_status(raw, today):
    if not raw:
        return 'ohne Datum'
    if PLACEHOLDER.match(raw):
        return 'Platzhalter'
    try:
        value = date.fromisoformat(raw[:10])
    except ValueError:
        return 'ungültiges Datum'
    return 'Datum erreicht' if value <= today else 'zukünftig'


def write_report(client, root, output, today, language_dir=None, source=None):
    config = root / 'client/config'
    heroes = json.loads((config / 'hero_detail.json').read_text(encoding='utf-8'))
    language = 'ZH_CN' if client == 'cn' else 'EN_US'
    if language_dir is None:
        language_dir = next((p for p in (root / language, config / (language + '.json')) if p.exists()), None)
    pairs = language_pairs(language_dir)
    internal = skin_names(root) if (config / 'hero_skin.json').exists() else {}
    groups = ([], [])
    for key, hero in heroes.items():
        if not isinstance(hero, dict):
            continue
        gid = int(key)
        raw_name = hero.get('name') or ''
        if raw_name.startswith('tid#'):
            name = pairs.get(raw_name[4:]) or pairs.get(raw_name) or ''
            origin = language if name else 'nicht aufgelöst'
        else:
            name = raw_name
            origin = 'direkt' if name else 'fehlt'
        cjk = bool(re.search(r'[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\U00020000-\U000323af]', name))
        raw_date = hero.get('enable_time') or ''
        row = (gid, name, raw_name, origin, 'ja' if cjk else ('nein' if name else 'offen'),
               internal.get(gid), raw_date, release_status(raw_date, today), hero.get('is_visible'))
        groups[0 if 1000 <= gid <= 5999 else 1].append(row)
    for rows in groups:
        rows.sort(key=lambda r: (r[6] or '9999', r[0]))
    regular, others = groups
    counts = Counter(r[7] for r in regular)
    title = 'China (CN)' if client == 'cn' else 'Global'
    lines = [f'# Helden-Releasedaten – {title}', '',
             f'Auswertung am {today.isoformat()}; Quelldaten: `{source or root}`.',
             f'Entpackte Konfiguration: `{root}`.',
             f'Sprache: {language}; Quelle: `{language_dir}`.' if language_dir else f'Sprache: {language}; Sprachdateien fehlen, Namensschlüssel bleiben sichtbar.',
             '', f'{len(regular)} reguläre Helden (IDs 1000–5999), {len(others)} weitere Einträge; insgesamt {len(regular) + len(others)} Datensätze aus hero_detail.',
             'Reguläre Helden: ' + ', '.join(f'{key}: {value}' for key, value in sorted(counts.items())) + '.', '',
             'Alle Einträge bleiben enthalten, auch ohne Datum oder mit is_visible=0. Weitere IDs stehen separat, da sie NPCs, Tests oder Varianten enthalten können.',
             'enable_time wird unverändert übernommen. Fehlende Daten sind kein Beleg für einen Launch-Release. „Datum erreicht“ vergleicht nur das Client-Datum mit dem Auswertungstag.',
             '2099-* und 2027-12-12* werden nach der bestehenden Projektregel als Platzhalter markiert; der Originalwert bleibt erhalten. Keine Datumsableitung aus Events.',
             '„Han-Zeichen“ prüft den aufgelösten Namen auf chinesische Schriftzeichen; interne Porträtnamen werden separat ausgewiesen und ersetzen keinen fehlenden Anzeigenamen.', '']
    for heading, rows in [('Reguläre Helden', regular), ('Weitere hero_detail-Einträge', others)]:
        lines += [f'## {heading}', '',
                  '| ID | Client-Name | name (Original) | Namensquelle | Han-Zeichen | Intern (Porträt) | enable_time (Original) | Datumsstatus | is_visible |',
                  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
        lines += ['| ' + ' | '.join(cell(value) for value in row) + ' |' for row in rows]
        lines += ['']
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text('\n'.join(lines), encoding='utf-8')
    unresolved = sum(not row[1] for row in regular)
    print(f'{title}: {len(regular)} Helden + {len(others)} weitere Einträge -> {output}')
    print(f'  {unresolved} reguläre Helden ohne aufgelösten Client-Namen')


def main(client):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help=f'entpacktes x_{client} oder Emulator-Pull-Ordner {client}')
    parser.add_argument('--out', type=Path, default=Path(f'out/site_data/HERO_RELEASES_{client.upper()}.md'))
    parser.add_argument('--language-dir', type=Path, help='passender ZH_CN-/EN_US-Ordner mit numerischen Deflate-Chunks oder JSON-Datei mit Schlüssel/Wert-Paaren')
    parser.add_argument('--today', type=date.fromisoformat, default=date.today(), help='Auswertungstag YYYY-MM-DD (keine Client-Version)')
    args = parser.parse_args()
    root = args.source
    try:
        if (root / 'data/packages').is_dir() or (root / 'files/data/packages').is_dir():
            if root.name != client:
                parser.error(f'Pull-Ordner muss {client!r} heißen; für diesen Client wurde {root.name!r} übergeben')
            from unpack_config import unpack
            root = unpack(root)
        write_report(client, root, args.out, args.today, args.language_dir, args.source)
    except (OSError, ValueError, zlib.error) as exc:
        parser.exit(1, f'Export fehlgeschlagen: {exc}\n')
    return 0
