# Watcher of Realms: Hero-Progression

Client: `1.6.38.829.1`

## Ergebnis

- `167` beobachtete `HeroGrowing`-Profile
- `1848` hero-spezifische Advancement-Deltas
- `1350` hero-spezifische Awakening-Datensätze
- Attribute: `1=ATK`, `2=DEF`, `5=MRES`, `7=HP`

`HeroGrowing` kann nicht global mit einer statischen Hero-ID verbunden werden. Der Schlüssel `m_HeroGrowingID` liegt in den serverseitigen Hero-Instanzdaten (`mtHeroData`) und nicht in `Unit`. Deshalb enthält die CSV Growth-Profile mit `hero_join_status=unresolved_server_instance_join`; fehlende Werte werden nicht als null oder 0 interpretiert.

## Konkretes Growth-Beispiel

Profil `705`, Level `1`, Advancement `0`, Awakening `0`:

| HP | ATK | DEF | MRES |
|---:|---:|---:|---:|
| 120817 | 4393 | 1107 | 1107 |

Die Levelkurve ist daher als **Anchors-only-Datensatz** exportiert. Es wurde keine Interpolation erfunden. Advancement und Awakening sind dagegen über `HeroAdvanced.m_ID` bzw. `Awakening.m_HeroID` direkt einem Hero zugeordnet.

## Nutzung

Für eine Tower-Defense-Referenz können die Attribute je Progressionsart getrennt ausgewertet werden. Eine vollständige absolute Levelkurve pro sichtbarem Hero benötigt zusätzlich einen Account-/Serverdump mit `m_HeroGrowingID`.
