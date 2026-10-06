# Tower Defense Mythology Groups and Two-Row Lords

Date: October 5, 2026

## Purpose

Give every mythological Tower Defense hero an explicit mythology-group identity and use that
identity for a two-row squad system. Each row contains five total units and may be led by one
Lord. A Lord permanently empowers matching heroes in that Lord's row, while unrelated heroes
remain legal picks without receiving the Lord bonus.

This feature applies only to the Tower Defense roster. It must not change the 88 heroes in
`src/data/heroes/` or the generated `src/data/all_heroes_db.json`.

## Scope

The feature covers:

- mythology-group metadata for the 22 named mythological Tower Defense heroes;
- a central catalog for group display metadata and icons;
- seven coordinated group icons;
- two five-slot squad rows, for a maximum of ten selected units;
- up to one Lord in each row;
- row-scoped, permanently active Lord bonuses;
- reuse of group membership by the existing Greek and Norse Pantheon Bonds.

The twelve `recruit-*` units stay group-less. They can occupy either row but never receive a
Lord bonus unless a later design explicitly introduces a recruit rule.

This change does not add new Lord heroes, broadly rebalance stages, or edit the main-site hero
database.

## Data ownership

### Hero membership

The Tower Defense identity is authoritative. Group membership must not be inferred through
`statSource`: TD Odin only borrows Zeus's statistics, for example, and TD Surtr only borrows
Set's statistics. Their identities and mythology remain Odin and Surtr.

Each named TD hero receives a `mythologyGroups` array with one or two stable group IDs. Both
memberships are mechanically equal. Array order is presentation order only.

The group information should live in authored Tower Defense data rather than the generated
`gameBalance.json`. The balance-data generator copies it into each generated hero row so the
UI and simulation consume one generated runtime shape.

### Group catalog

A central authored catalog defines each active group once. Each record contains:

- stable ID;
- English display name;
- icon path;
- display color;
- optional description;
- optional `lordHeroId`.

Membership is never duplicated in the catalog. It is derived from hero
`mythologyGroups` arrays. A group may exist with few members and may have no Lord yet.

### Validation

A focused validator must fail when:

- a named mythological TD hero has no group or more than two groups;
- a hero repeats a group ID;
- a referenced group does not exist;
- an active group has no icon asset;
- a `lordHeroId` does not name a TD hero;
- a Lord's configured `groupId` is not one of that Lord's own memberships;
- a `recruit-*` unit receives a mythology group unintentionally.

The validator is added to the relevant Tower Defense test workflow. No main hero merge workflow
is involved.

## Initial groups and membership

The initial active catalog contains seven groups.

### Greek

Atlas, Gaia, Helios, Hecate, Thanatos, Hephaestus, Boreas, Atalanta, Stheno, Plutus,
Harmonia, Asclepius.

### Norse

Ymir, Heimdall, Aegir, Surtr, Fenrir, Nott, Vidar, Odin, Skadi.

### Egyptian

Isis.

### Elder Powers

Atlas, Ymir, Gaia, Helios, Surtr, Nott.

### Underworld

Hecate, Thanatos, Isis.

### Wildborn

Aegir, Fenrir, Boreas, Skadi, Atalanta, Stheno.

### Divine Guardians

Heimdall, Vidar, Harmonia, Asclepius.

Hephaestus, Plutus, and Odin intentionally have only their cultural group in the first release.
Potential later groups include Chinese Divine Court, Zodiac Court, Sea Powers, Divine
Artificers, and Tricksters. They are not added as empty active records.

## Icon system

Create one transparent WebP icon for each active group under a dedicated Tower Defense asset
directory. The set uses the existing premium painted mythic UI language: compact centered
emblems, strong silhouettes at small sizes, restrained antique gold framing, distinct accent
colors, no text, no characters, and no background plate outside the emblem.

Motifs:

- Greek: laurel and Ionic/lightning geometry;
- Norse: angular knotwork, rune, and world-tree geometry;
- Egyptian: winged solar disc or scarab geometry;
- Elder Powers: cracked cosmic disc or ancient mountain;
- Underworld: dark gate and cold flame;
- Wildborn: claw, antler, and leaf geometry;
- Divine Guardians: shield and halo.

The generated originals and final project paths must be documented. Icons are decorative where
the adjacent group name is visible and receive readable alternative text where they carry the
label alone.

## Squad model

The campaign squad is stored as two ordered rows of five slots. Empty slots are allowed.

Rules:

- at most ten distinct heroes across both rows;
- at most five heroes per row;
- at most one Lord per row;
- a Lord consumes one of the five slots;
- a row with a Lord therefore supports the Lord plus four other heroes;
- a row without a Lord supports five regular heroes;
- a hero cannot occur in both rows;
- unrelated heroes are legal in a Lord row;
- a Lord occupies the first displayed slot of the row;
- when no Lord is selected, a regular hero may occupy that slot;
- adding a Lord to a full regular row must not silently remove a hero.

The campaign configuration changes from a flat squad size of six to two rows of five. Runtime
entry points that still need a flat hero list receive the rows flattened in row order. Row
identity travels alongside the flat list so the simulation can resolve Lord effects.

Headless callers that provide only a flat squad remain supported through a deterministic
normalization path, but new campaign code uses the explicit row model.

## Squad-selection interaction

The Squad screen shows two compact, stacked lineup rows. Each row displays:

- its five slots;
- its active Lord and led group, when present;
- the group icon and name;
- a connected state for matching heroes;
- a visibly unconnected but still enabled state for unrelated heroes.

The user selects an active row by tapping its label, panel, or an empty slot. Tapping a roster
hero adds that hero to the first available slot in the active row. Dragging allows exact
placement, row-to-row movement, and swapping. Removing a hero preserves the remaining slot
order rather than silently transferring heroes between rows.

Lord roster cards carry a crown treatment. Hero roster cards display up to two mythology-group
icons. A clear feedback message explains full rows, duplicate heroes, a second Lord in one row,
and why a hero is not receiving the row bonus.

The layout must continue to work in the supported landscape phone viewport. It may reduce the
lineup-card size to fit the second row, but must preserve readable tap targets and must not make
the roster unusable.

## Save storage

New progress stores `lastSquadRows` as two arrays while a derived flat list may be retained only
where needed by runtime interfaces. Existing flat `lastSquad` selections are not migrated; when
that field is the only saved lineup, the new two-row selection starts empty.

No owned heroes, levels, currencies, stage clears, or other progression are changed.

## Lord behavior

Every Lord definition references one `groupId`; it no longer stores a hand-maintained member
list. Eligibility is derived from the selected row and each hero's `mythologyGroups`.

Lord bonuses are lineup passives. Once a battle starts, they remain active for the entire
battle even if the Lord:

- has not been deployed;
- dies;
- is sold or relocated;
- is otherwise absent from the current battlefield entities.

Only matching heroes in that Lord's own row benefit. A dual-group hero receives the full bonus
when either membership matches, but never receives the other row's Lord bonus. Two rows may
therefore run two independent Lords without stacking both bonuses on one hero.

Isis remains the only implemented Lord in this release and leads `egyptian`. Since she is the
only current Egyptian hero, her group bonus currently applies only to herself. This is an
intentional content limitation, not a reason to misclassify other heroes.

Isis's basic attribute bonus and periodic damage/healing bonus run from the lineup state rather
than from a living Isis entity. The periodic interval uses the number of matching teammates in
her row. Her attack-triggered enemy mark still requires Isis to attack because it is part of
her own combat action rather than the always-on row bonus.

Future Lords use the same row contract but may define different group-specific effects in the
tuning data and simulation. No generic one-size-fits-all Lord ability is imposed.

## Pantheon Bonds

The existing Greek and Norse Pantheon Bonds remain a separate battlefield synergy system.
Their membership is derived from the same hero `mythologyGroups` data so they cannot drift from
the displayed origins. Their current tier effects and recruit-wildcard behavior remain
unchanged. Lord bonuses are row-scoped; Pantheon Bonds continue to count eligible deployed
heroes across the battlefield according to their existing rules.

## Derived displays

The selected roster grows from six to at most ten heroes. Placement gold and other deployment
rules remain unchanged. Recommended Might and squad summaries use the actually selected heroes,
while generators and sampling scripts must avoid attempting exhaustive ten-hero combinations.

The implementation does not retune enemies or stage rewards. Any broad combat rebalance or
balance report is a separate decision.

## Tests and verification

Targeted automated coverage includes:

- group-catalog and hero-membership validation;
- one- and two-group heroes;
- group-less recruits;
- two rows of five, uniqueness, and one-Lord-per-row constraints;
- unrelated heroes remaining legal but unbuffed;
- dual-group matching in either eligible row;
- no cross-row Lord bonus leakage;
- Lord bonuses before deployment and after Lord death or sale;
- Isis's lineup-driven periodic effect and attack-driven mark;
- Greek/Norse Bonds deriving membership from the shared group data;
- new row-save sanitization; legacy flat lineup data is ignored;
- click and pointer/drag squad interactions;
- campaign session startup with structured rows and a compatible flat list.

Run the relevant Tower Defense tests and data validator. Do not run `npm run build`; repository
policy reserves production builds for the owner.

## Explicit non-goals

- Editing `src/data/heroes/*.json` or `all_heroes_db.json`.
- Giving mythology groups to ordinary recruits.
- Creating additional Lord portraits or heroes.
- Implementing Lords for all seven groups in this release.
- Reclassifying a hero merely to make Isis stronger.
- Migrating the old flat six-hero lineup into the new row model.
- A broad stage or enemy balance pass.
- Producing a balance report.
