# Serket — Comprehensive Review

**Faction:** Diamonds ♦ | **Class:** Warrior | **Role:** Nimble | **Rarity:** Legendary
**Status:** Unreleased (Western servers) | **Release on CN:** 2026-01-23
**Recommended Relic:** Lv.30 | **Tag:** Currently the only hero carrying the `SUMMON` tag (Nuwa, Gemini, and Zeus also summon persistent stat-inheriting units but are not tagged — DB inconsistency)

---

## Confidence Legend

- **[VERIFIED]** — derived directly from the official skill text in the preview image
- **[KIT-INFERENCE]** — logical reasoning from verified skill text, no external source needed
- **[CN-COMMUNITY]** — backed by CN-community evidence (TapTap forum, Zhihu, Bilibili guides)
- **[GUIDE.MD-CLAIM]** — claim from the user-supplied `serket-guide.md`; cross-checked, flagged when speculative
- **[SPECULATION]** — best-effort reasoning where no source confirms it

CN sources used:
1. TapTap official forum thread (post-release community evaluation) — strongest source for meta tendency
2. Zhihu tier-list articles (mid-2025, pre-Serket but useful for comparison baselines)
3. TapTap Skill-Preview & Challenge posts (cited in guide.md)

---

## 1) What actually makes Serket unique compared to other Warrior/diver units?

**[VERIFIED + DB-CROSS-CHECK]**

I checked every Warrior currently in the Western DB against Serket's kit:

| Hero | Faction | Role | Mechanic Niche |
|---|---|---|---|
| **Serket** | Diamonds | Nimble | **Burrow + 3 stat-inheriting summons + AoE relic + ATK-Down explosions + self-heal + permanent HP growth** |
| Set | Diamonds | Nimble | Team lifesteal/ATK buff + armor shred (support-warrior hybrid) |
| Aries | Diamonds | Hefty | 5s invincibility on lethal damage, AoE knockback |
| Heracles | Diamonds | Hefty | Damage storage + double-burst dump |
| Sekhmet | Diamonds | Hefty | Berserker stacking, single-target boss DPS |
| Canopic Jar | Diamonds | Nimble | Leap-slam single-target burst |
| Leo | Diamonds | Hefty | Lionheart cone AoE state |
| Nezha | Starglint | Nimble | PvE boss-agnostic DPS carry |
| Bastet (Assassin) | Diamonds | Nimble | Leap to highest-ATK enemy, dodge-tank |
| Nyx (Assassin) | Starglint | Nimble | Diagonal teleport to back-row, untargetable |

**Correction note (v3):** Earlier versions of this review made two wrong claims about Serket's uniqueness. Both are now corrected, plus a clarification about Zeus.

- **v1 error:** I claimed Serket was the only hero in the DB with persistent stat-inheriting summons. **Wrong** — Nuwa, Gemini, and Zeus all have them. The `SUMMON` tag being assigned only to Serket reflects a **DB tag inconsistency**, not a real mechanical exclusivity.
- **v2 error → resolved in v3:** I downgraded the "summons use her active skill" claim to uncertain because Zeus's ult wording suggested Echoes might cast with him. **Clarified:** Zeus's relic text actually reads *"When Zeus casts Almighty Thunderstrike, all Echoes on the field also cast it"* — meaning Echoes only cast **when triggered by Zeus's cast event**. They are **coupled multi-casters**, not autonomous units. Serket's scorpions, by contrast, use Underground Pierce **on their own AI** without needing a Serket-cast trigger. The two mechanics are categorically different.

**[DB INCONSISTENCY — Nuwa, Gemini, and Zeus arguably need the `SUMMON` tag]**

What Serket is **actually** unique for, after both corrections, is narrower but mechanically clean:

**Uniqueness points (corrected v2):**

1. **Summon death generates active offensive value.** This is the one claim that survives all cross-checks. Every other summoner in the DB treats summon-death as a loss event:
   - Nuwa's figurines disappear silently
   - Gemini's Castor leaves Pollux down on the HP cost with no return
   - Zeus's Echoes expire after 15s with no death effect
   - Hephaestus's devices are stationary and have no death state
   - Hecate's flames, Iris orbs, Poseidon's waterspouts are time-bound effects, not units that "die"

   Serket's scorpions explode for **200% ATK AoE + 10% ATK-Down for 10s** on death. **The enemy is punished both for killing them AND for letting them live.** This is the cleanest mechanical hook in her kit and has no peer in the DB. **[VERIFIED]**

2. **3 simultaneous identical summons with uniform 100% base-stat inheritance.** Other summoners scale differently:
   - Nuwa has 3 figurine types but each is a different skill (gated by CD)
   - Gemini has 1 Castor at a time
   - Zeus accumulates Echoes over time via passive trigger, not on-demand

   Only Serket dumps **3 functionally identical scorpions at once** with the same stat block as herself. This creates target-priority chaos in a way no other summoner does. **[VERIFIED]**

3. **Her summons autonomously use her active skill (Ult Lv.4).** Serket's skill text is explicit: "Summoned scorpions can also use the Underground Pierce skill" — scorpions trigger this on their own AI. The closest comparison is Zeus's relic, where Echoes cast Almighty Thunderstrike **only when Zeus himself casts it** (coupled multi-cast, not autonomous behavior). Zeus's mechanic is structurally a stronger version of Cronus's "Echo of Causality" — a controller-triggered amplifier. Serket's scorpions are independent agents. **This is verified-unique once Zeus's mechanic is properly understood.** **[VERIFIED]**

4. **Only Diamonds Warrior with the Nimble/Burrow combination.** Set is also Nimble, but he's a buff-support build. Serket is the only Diamonds Warrior that physically **leaves the battlefield and re-engages** mid-fight via dive + relic-tied damage immunity. **[VERIFIED]**

5. **Hybrid value layers.** Most divers have ONE value layer: Nyx (back-row burst), Bastet (frontline tank-stall), Anubis (execute), Jingwei (assassinate). Serket has **five simultaneous value layers** running in the same fight:
   - Her own underground dive damage
   - 3 scorpions inheriting 100% of her stats and (at Ult Lv.4) using her dive skill themselves
   - AoE relic ticking on her AND each scorpion (Lv.3)
   - Explosion + ATK-Down on every scorpion that dies (passive)
   - Self-heal underground + one-time permanent +30% max HP threshold trigger
   **[KIT-INFERENCE]** — every layer is verified, the "simultaneous" framing is the inference.

6. **Both backline reach AND frontline stall.** Her dive reaches the farthest enemy, but her sustain passive means she also functions as a sticky bruiser. Bastet only tanks; Nyx only deletes; Serket does both. **[KIT-INFERENCE]**

### Reframed: What does Serket's identity actually rest on?

If you strip out everything other summoners can also do, **the one mechanical hook that defines Serket and no one else is the death-value loop**. Scorpions are not just damage dealers — they are **disposable bombs with a built-in debuff**. Every other element of her kit (dive, sustain, AoE relic, knockdown) exists to either *deliver* scorpions into the right position or *keep producing more*.

This reframing matters for build priority: maximizing Serket means maximizing **scorpion turnover**, not scorpion preservation. Counters that "kill her summons" are arguably feeding her kit, not denying it. **[KIT-INFERENCE]**

The CN community sums her up as: *"目前看来是厄里斯全面上位，伤害更高，有群攻能力，生存更强"* — "**a full upgrade over Eris: higher damage, AoE capability, stronger survivability**" **[CN-COMMUNITY]**. That comparison frames her not as a niche pick but as a benchmark-resetter for the new-hero pool.

### 1a) Serket vs. Nuwa — Same Mechanic Family, Different Roles

Since the CN community explicitly recommends Nuwa as a Serket synergy partner, the natural question is: **do they compete or complement?** A direct comparison:

| Dimension | Serket | Nuwa |
|---|---|---|
| Faction / Class / Role | Diamonds / Warrior / Nimble | Starglint / Tank / Hefty |
| Summon count | 3 (simultaneous, via Ult) | Up to 3 (1 per skill, on-demand) |
| Summon stat inheritance | 100% base stats (uniform) | Asymmetric: 100-200% HP, 100-150% ATK per figurine |
| Summon behavior | All 3 do AoE relic + (Lv.4) dive farthest | Bulwark charges + stuns; Greataxe leaps + AoE; Support heals |
| Summon on death | **Explodes** for AoE + ATK-Down | Disappears silently |
| Summon refresh pattern | Wait for ult CD | **Recasting heals existing figurine to full** + adds new effect |
| Summons replicate her active skill | **Yes (Ult Lv.4)** | No |
| Self-positioning | Dives backline | Stays as anchor tank, deploys barrier |
| Team-facing value | Self-completing pressure | Team-wide CC, shields, healing, damage-sharing |
| `coreMechanic` (from DB) | n/a (new release) | "Best tank in game. Perma-CC enemies and shares damage between allied units at base dupe." |
| Base-dupe value | High (full kit) | **Among the best base-dupe value units in game** |

**Are they redundant?** No, they occupy **different combat axes**:
- Nuwa is a **team enabler** — her summons buff the team (barrier, heal, CC), and the figurines exist to **support allied heroes**
- Serket is a **self-completer** — her summons are **extensions of her own threat**, not team utility

**The CN-suggested Serket + Nuwa pairing makes mechanical sense for three concrete reasons** **[CN-COMMUNITY + KIT-INFERENCE]**:

1. **Front/back coverage.** Nuwa anchors the frontline with her Bulwark Figurine + barrier; Serket dives the backline. The enemy can't focus both vectors at once.

2. **Nuwa's Support Figurine heals Serket's scorpions(?).** This is mechanically ambiguous — the skill text says "heals the most vulnerable ally". If summons count as allies, this is a massive force-multiplier for scorpion uptime. If only hero-units count, the synergy is weaker. **[KIT-INFERENCE — needs in-game verification]**

3. **CN-confirmed:** Nuwa pairing "*prevents Nuwa from sudden death and also triggers Nuwa's passive*". This implies Serket provides damage-reduction or staying-power that lets Nuwa stay in the frontline longer. **[CN-COMMUNITY]**

**Verdict:** Run them together when you have both. They are **complementary, not competitive**. If you only have one, the choice depends on what your team already does:
- Have a strong carry that needs an enabler? → **Nuwa**
- Have a control-heavy team that needs a self-sufficient backline pressure unit? → **Serket**

---

## 2) Summon mechanics in real combat scenarios

**[VERIFIED + KIT-INFERENCE]**

Breaking down what the 3 scorpions actually do, step by step:

**Spawn:**
- Ult casts → Serket burrows → 3 scorpions appear around her position. Each scorpion inherits **100% of her base stats** (ATK, HP, presumably Armor/M-Res — the text says "basic stats"). **[VERIFIED]**
- They **take increased damage** (200% DMG taken in the screenshot text — this is a balancing tax on the cheap HP pool). **[VERIFIED]**
- Duration: 10s base, extended at Ult Lv.2. **[VERIFIED]**

**What scorpions do during their lifespan:**
- At Ult Lv.4, scorpions can **use Burrowing Pierce themselves** — meaning each scorpion can independently dive to the farthest enemy and knock them down. This turns the ult from "3 stat sticks" into "3 micro-Serkets". **[VERIFIED]** — this is the single biggest power spike in the kit.
- At Relic Lv.3, each scorpion deals **80% ATK/sec AoE** to nearby enemies. With 3 scorpions, that's potentially **240% ATK/sec extra board-wide AoE** stacking on top of Serket's own relic tick. **[VERIFIED math from skill text]**
- At Relic Lv.4, each scorpion individually gets the damage-immunity proc (1× per 12s). At 3 scorpions, that's effectively a stagger of three independent "save" events, making clean removal much harder. **[VERIFIED]**

**What happens when scorpions die (Scorpion Toxic Burst passive):**
- Each death = AoE explosion at **200% ATK in a 3m radius** + **-10% ATK debuff on hit enemies for 10s**. **[VERIFIED]**
- This means scorpion **death is not a loss event — it's a damage event**. The enemy is punished both for letting them live AND for killing them.

**Real-combat scenarios:**

| Scenario | What happens |
|---|---|
| Enemy AoE clears scorpions instantly | 3× explosions = 600% ATK AoE + 3× ATK-Down stacks. Serket trades summons for a delete + team debuff. |
| Enemy ignores scorpions | Scorpions tick 240% ATK/sec relic AoE + dive backline (Lv.4) for 10s = sustained zone damage |
| Enemy single-targets scorpions | At Relic Lv.4, each scorpion has an immunity proc. They survive 1 burst per 12s each. Hard to clean. |
| Long fight, ult comes back up | New 3 scorpions while old ones still exploding = compounding board pressure |

**The Athena reference frame:** Athena's `coreMechanic` says she enables Zeus's judgment window. Serket has **no single core mechanic** in that sense — she's a pressure profile, not an enabler. **[KIT-INFERENCE]**

---

## 3) Is "farthest enemy" AI enough to make her a legitimate backline assassin?

**Short answer: She's not a backline assassin in the Nyx sense. She's a backline pressure unit, and that's actually a different role.** **[KIT-INFERENCE]**

**The case for backline reach:**
- Burrowing Pierce locks the farthest enemy and digs there. Damage along the path = wave-clear bonus. Emerge = knockdown of surrounding enemies = disruption on the backline. **[VERIFIED]**
- At Ult Lv.4, scorpions also dive the farthest enemy, **multiplying the back-row targeting pressure** 4-fold (Serket + 3 scorpions can all target backline simultaneously). **[VERIFIED]**
- Diamonds DB confirms 13 heroes have "farthest" targeting, so Serket is not unique here — but combining it with 3 stat-inheriting summons that ALSO use the dive is unique. **[DB-CROSS-CHECK]**

**The case against pure backline-assassin classification:**
- **No execute mechanic** (compare Anubis r20 execute on <5% HP). She softens but doesn't delete. **[VERIFIED]**
- **No untargetable phase during the dive.** Nyx (`coreMechanic: untargetable diagonal traversal`) bypasses frontline by becoming non-selectable. Serket goes underground but the skill text doesn't explicitly grant invulnerability during travel — only sustain underground and a shield on emerge (Lv.3). **[VERIFIED — and notable gap vs Nyx]**
- **No frontline isolation.** Bastet leaps to highest-ATK enemy; Nyx symmetrically blinks to back-row at combat start. Serket dives but doesn't get there at combat start — she gets there when her active is up. The first wave of enemy openers will land before she's in position. **[KIT-INFERENCE]**

**Verdict:** Serket is a **backline disruptor**, not a backline assassin. Her job is to put pressure on the back row, force the enemy team to split focus, then survive long enough for that pressure to compound. She makes the backline uncomfortable; she doesn't surgically remove it.

The `.md` calls her a "**bruiser summon diver**" — I agree with that framing. **[GUIDE.MD-CLAIM, confirmed by kit-inference]**

---

## 4) How oppressive is her sustain and survivability?

**Sustain layer breakdown:** **[VERIFIED]**

| Source | Mechanic | When it triggers |
|---|---|---|
| Burrowing Rebirth (passive) | 60% ATK per sec heal while underground | Whenever underground (during ult, during dive, during HP-threshold proc) |
| Burrowing Rebirth threshold | Auto-burrow 3s + **permanent +30% max HP** | First time HP < 40% in a battle (one-time) |
| Toxic Miasma Domain Lv.2 | Damage immunity to overkill hit + DR window | 1× per 12s |
| Underground Pierce Lv.3 | Shield on emerge | Whenever active is cast |
| Toxic Miasma Domain Lv.4 | Damage immunity proc on each scorpion | 1× per 12s per scorpion |

**The interlock that makes this oppressive:**

1. Take big hit → Lv.2 relic absorbs the hit, becomes immune for a window
2. If still pressured, HP drops below 40% → **auto-burrow 3s + heals 60% ATK/sec + permanent HP buff**
3. Burrow window also coincides with Ult animation, dive animation, etc., so the heal compounds during natural skill usage
4. Emerge → shield from Lv.3 active + relic immunity has reset
5. Net effect: **two independent "save" cycles per fight before the enemy has even applied normal pressure**

**Compared to peers:**

- **Anubis** has untargetable-on-cumulative-HP-loss. **One-shot save per HP threshold.** Serket has **two layered saves + a permanent HP buff + ongoing heal**. **[DB-CROSS-CHECK]**
- **Aries** has 5s invincibility on lethal damage. **One save.** Serket has the equivalent of multiple staged saves. **[DB-CROSS-CHECK]**
- **Heracles** has 80% max HP damage storage + dump. **Defensive value is offensive.** Serket's defense is purely defensive. **[DB-CROSS-CHECK]**

CN community comment is direct: *"生存更强（62图硬抗大鹅三下，硬抗精卫扇四次翅膀）"* — "**Survivability is stronger: in Map 62 she tanks the big-goose [enemy] 3 hits, tanks Jingwei's wing 4 times**". **[CN-COMMUNITY]** This is a concrete, testable claim from a CN player and is one of the strongest survivability anecdotes you'll find for a new release.

**Caveat:** The threshold heal is **one-time per battle**. If the enemy can deplete her below 40% and then nuke through the 3s burrow window's damage immunity, she loses the second life. **[KIT-INFERENCE]** The 3s burrow window's immunity is not explicitly stated in the screenshot text — the screenshot says "burrows underground for 3s and permanently increases max HP", but doesn't say "is invulnerable underground". Treat invulnerability-during-burrow as a **moderate-confidence inference** — visually plausible from "underground" framing, but worth verifying in-game.

---

## 5) Bruiser, assassin, summon carry, or hybrid?

**Verdict: a bruiser-summoner with disruption tools. Not an assassin, not a pure carry.** **[KIT-INFERENCE]**

Mapping kit features to archetype:

| Archetype | Match? | Why |
|---|---|---|
| Pure bruiser | Partial | Sustain layers + frontline-survivable, but doesn't taunt or hold aggro |
| Pure assassin | No | No execute, no untargetable traversal, no opener |
| Summon carry | Partial | Summons are her highest scaling source, but they're not her **only** damage |
| Disruption/control | Partial | Knockdown on emerge + ATK-Down from explosions, but no hard CC chain |

The clean framing: **she is a bruiser whose damage is partially externalized into 3 summons, with disruption as a side product.**

If you had to force a single tag in the existing synergy system, the closest matches are:
- `SUMMON` (already assigned in DB — and she's the only one with it)
- `AREA_DAMAGE_DEALER` (already assigned)
- `ATK_DOWN` (already assigned)
- `SELF_SUSTAIN` (already assigned)

The `.md` proposed new tags like `BACKLINE_DIVER`, `ATTRITION_AOE`, `ANTI_ATK_CARRY`, `SUMMONER`, `SELF_SUSTAIN_BRUISER`. **[GUIDE.MD-CLAIM]** I'd push back on adding 5 new tags for one hero — that breaks your "narrow vocabulary" tag system. The existing `SUMMON` tag already captures the core mechanic; what's needed is **consistency** — apply `SUMMON` to Nuwa, Gemini, and Zeus as well. **[RECOMMENDATION]**

---

## 6) Who does she synergize with?

I split by **confidence tier** because most of the .md's named partners are kit-inference, not CN-verified.

### Tier 1 — CN-Verified Synergies

From the TapTap forum post (post-release commentary):

- **Nuba (女魃)** — *"新角色能给前排很高的减伤，特别适配女魃"* — "The new character provides strong DR to frontline, especially compatible with Nuba". **[CN-COMMUNITY]**
- **Nuwa (女娲)** — *"可以直接配合女娲站前排，防止女娲暴毙，还能触发被动"* — "Can directly pair with Nuwa to stand frontline, prevents Nuwa from sudden death, and triggers Nuwa's passive". **[CN-COMMUNITY]**

**Important note for `.md` comparison:** The `.md` lists Anubis, Nyx, Bastet, Sekhmet, Mengpo, Prometheus, Poseidon, Pan, Valkyrie, Cronus, Hecate, Skadi. **Not one of these is CN-confirmed.** Nuba and Nuwa — which the .md doesn't mention — are the actual confirmed partners. **[CRITICAL DISCREPANCY]**

The CN comment also says Serket needs **回能辅助** ("energy-recovery support") — pointing to Caishen-type or energy-regen tools. **[CN-COMMUNITY]**

### Tier 2 — Strong Kit-Inference Synergies

- **Cronus** — `synergyLinks: CDR_TEAM`. Cronus's "Echo of Causality" double-casts the highest-CDR ally's actives. Double-casting Serket's Burrowing Pierce = double the dive damage + double the shield + (at Ult Lv.4) potentially synergistic timing with scorpion dives. **Very strong if it works as written.** **[KIT-INFERENCE, high]**
- **Athena** — DR aura + ATK speed buff. Serket benefits from staying alive longer; her summons benefit from the ATK speed scaling their inherited stats. The `synergyLinks` on Athena currently target Zeus/Heracles — Serket could legitimately be added here. **[KIT-INFERENCE]**
- **Momus** — `coreMechanic: shields without global cooldown`. Continuous shielding on Serket while she's surface-side means her threshold-heal procs are protected. **[KIT-INFERENCE]**
- **Cashien (财神)** — referenced in CN comment as needed energy support, and tier-list shows him as standard ult-cycle enabler. **[CN-COMMUNITY, partial]**

### Tier 3 — Plausible but Unproven Kit-Inference

- **Poseidon** — groups enemies → Serket relic AoE + scorpion AoE hit more targets. Same logic as Skadi/Set synergies, just less verified for Serket specifically.
- **Mengpo** — revive on scorpion death? Doesn't apply (summons aren't allied heroes). Revive on Serket death is fine but redundant with her own threshold heal.
- **Anubis** — execute follows Serket's chip damage. Plausible but neither has a direct mechanical link.

### Tier 4 — Questionable Claims from .md

- **Skadi** — The .md lists her, but Skadi has `synergyLinks` to Yuelao and Momus, not Serket. No direct interaction. **[FLAGGED]**
- **Bastet** — Two solo-carries competing for the same frontline slot. The .md grouping is loose. **[FLAGGED]**
- **Valkyrie / Hladgunnr** — note: "Valkyrie" in the .md refers to **Hladgunnr** (in-game description: *"Hladgunnr, the elegant and dignified Valkyrie of the Swan"*). The localization split caused the confusion. Mechanically, Hladgunnr is a Hearts/Warrior/Hefty meatshield tank with `coreMechanic: line-hold mechanics`. She holds the frontline indefinitely, which gives Serket a stable anchor while she dives the backline. Her Slumber → Ult transition also creates a delayed engagement pattern that complements Serket's dive timing. **[KIT-INFERENCE, moderate]** — plausible but not CN-verified.

---

## 7) Optimal team for her?

I'll give two tiers because the CN evidence is too thin for a single "the team":

### CN-Inspired Frontline-Bruiser Team **[CN-COMMUNITY, partial]**

Based on the TapTap forum post explicitly mentioning Nuba + Nuwa frontline-synergy:

- **Serket** — frontline bruiser + summoner + DR provider
- **Nuwa** — frontline DPS, kept alive by Serket's DR
- **Nuba** — confirmed compatibility, frontline pressure
- **Cashien** — energy-regen support (CN-suggested role)
- **Flex** — likely a healer/sustain support; Mengpo if you have her, or Iris

### Theory-Crafted Cronus-Loop Team **[KIT-INFERENCE]**

If you want to push Serket's dive value:

- **Serket** — main pressure
- **Cronus** — double-casts Serket's Burrowing Pierce via Time Traveler
- **Momus** — continuous shields
- **Poseidon** — groups enemies for Serket's relic AoE and scorpion AoE
- **Caishen/Iris** — energy generation

I would NOT recommend the .md's "Backline-Assassin team" (Serket + Anubis + Nyx + Prometheus + Support). **[FLAGGED]** Serket doesn't function like Nyx — adding her to an assassin team wastes her sustain layers and asks her to do something her kit doesn't prioritize.

### Diamond Faction Bonus Consideration

If you want the 3+2 or 4+1 Diamond faction bonus, Serket + Set + Aries gives you 3 Diamonds with three different sub-roles (Nimble warrior, Nimble buffer-warrior, Hefty tank-warrior). Drop in Bastet or Sekhmet for 4-Diamond stacking. **[KIT-INFERENCE — based on documented faction-bonus mechanics in PROJECT_MEMORY]**

---

## 8) Game modes — where she excels, where she struggles

**[CN-COMMUNITY + KIT-INFERENCE]**

| Mode | Verdict | Reasoning |
|---|---|---|
| **PvP (defense)** | **Strong** | Persistent board clutter wastes attacker AoE; backline pressure forces target priority dilemmas; sustain absorbs trade attempts. The CN forum directly says she's strong here, calling her a full upgrade over Eris. |
| **PvP (offense)** | **Good** | Backline dive applies pressure on enemy carries. Less explosive than Nyx but more durable. |
| **PvE wave clear** | **Good** | Summons + relic AoE handle wave health bars passively. Knockdown helps progression. |
| **Boss / single target** | **Mediocre** | Most of her value is AoE/summon-spread. Summons against a single boss provide chip damage but no critical mechanic. **CN comment: "推塔能力需要明天实测" — "tower-pushing ability needs further testing"** suggests CN is also uncertain on this. **[CN-COMMUNITY]** |
| **Tower / progression** | **Good** | Sustain stack handles long battles; permanent +30% HP buff carries over within battles. |
| **Delusions Den** | **Unknown** | No CN evidence. Kit-inference: summons + relic AoE fit attrition blessings; threshold heal fits wave-survival blessings. **[SPECULATION]** |
| **Odyssey (long campaign)** | **Likely good** | Self-sustaining bruiser kits historically scale here. |

**The CN community's overall stance: strong, but with caveats** — needs energy-recovery support, needs Relic Lv.30, *"对队友练度有要求"* ("has requirements on teammate investment level"). **[CN-COMMUNITY]**

---

## 9) PvP performance and counters

**[CN-COMMUNITY + KIT-INFERENCE]**

### PvP strengths

- Board clutter (3 summons + her) creates a **targeting problem** — enemy AoE has to choose between scorpions and heroes
- ATK-Down on scorpion explosions weakens enemy DPS heroes
- Threshold-heal + permanent HP buff means burst comps need to commit 100% to kill her
- Backline reach pressures the enemy carry

### Counters

| Counter category | Examples | Why it works |
|---|---|---|
| **Heavy AoE that ignores summons** | Hecate's 10s channel, Skadi's vortex | Wide damage hits Serket through summon clutter |
| **Untargetable openers** | Nyx (blinks behind backline at combat start) | Nyx is in the back-row before Serket can dive |
| **Hard CC during dive** | Anything that lands when Serket emerges | She emerges committed to position |
| **Energy drain** | Pan, Anubis | Stops her from ulting → no scorpions = no kit. **CN explicitly notes she needs energy-regen support, implying she's vulnerable to energy drain.** **[CN-COMMUNITY-INFERENCE]** |
| **True damage** | Jormungandr's Revenge state stored true damage | Bypasses her HP-based survival math |
| **Cleanse / debuff removal** | Mengpo | Strips ATK-Down from scorpion explosions |

The Anubis matchup is worth highlighting: **Anubis r20 execute kills below 5% HP through invincible skills.** **[VERIFIED from DB]** If Serket's threshold heal lands her at low HP and Anubis is in execute range, the immunity window may not save her. This is a high-confidence Serket counter.

The Pan matchup mirrors the Heracles matchup the DB already flags: Pan drains energy → ult denied → no scorpions → kit collapses. **[KIT-INFERENCE, high]**

---

## 10) Build priorities (gear, virtues, stats)

**[KIT-INFERENCE — no CN-verified build sheet found]**

Two reasonable interpretations of her optimal stat distribution:

### Build A — Summon Scaling (recommended primary)

Scorpions inherit **base stats** → maximizing her base ATK and HP directly multiplies summon output. **[KIT-INFERENCE]**

Priority:
1. **ATK** — scales her own damage, scorpion damage, relic AoE, explosion damage, AND her per-second underground heal (60% ATK/sec)
2. **Max HP** — scorpions inherit; threshold heal scales; permanent +30% HP procs off max HP
3. **CDR** — gets her dive and ult back faster, which means more burrow time = more heal time
4. **Lifesteal** — pairs with constant AoE relic ticks for sustained healing on top of underground heal

### Build B — Disruptive Bruiser

If you're slotting her into a CC-heavy comp:
1. ATK
2. CDR (for knockdown frequency)
3. Effect-Hit (for ATK-Down landing on resistant targets)
4. Max HP

**Virtue priorities (kit-inference, since virtue data isn't in her DB entry yet):**

- 4-piece set: any **ATK% / HP% combination set**
- 2-piece set: **Lifesteal** or **CDR** depending on build
- Avoid pure crit-DPS sets — her kit doesn't have crit-amplifying scaling

The .md's "**Attack > Lifesteal > Speed**" build order **[GUIDE.MD-CLAIM]** is directionally fine but skips HP (which I'd argue is essential because of the summon-inheritance and threshold mechanics). **[FLAGGED — partial]**

### Relic priority

CN explicitly says *"自己也很吃30神器，推荐至少抽个神话"* — "**she scales heavily with Lv.30 relic, recommend at least Mythical [Lv.30]**". **[CN-COMMUNITY]**

This matches the DB's `recommendedRelicLevel: 30` and the .md's own spike analysis:
- **Lv.1** — relic AoE active. Functional but unimpressive
- **Lv.2** — Serket personal damage immunity. Big defensive jump
- **Lv.3** — scorpions also do AoE. **First major damage spike**
- **Lv.4** — scorpions also get immunity. **Final survivability spike**

If F2P, target Lv.10 minimum, push Lv.20 if she becomes core, Lv.30 only if you're confident she's a long-term invest. **[KIT-INFERENCE]**

---

## 11) AoE teams and sustain comps around her?

**[KIT-INFERENCE]**

**AoE teams:** Strong fit. Her own kit already provides ~240% ATK/sec board-wide AoE (relic on her + relic on 3 scorpions at Lv.3). Adding more AoE creates an attrition zone. Poseidon's grouping makes every tick hit more targets. Skadi's vortex tracks enemies into Serket's relic zone.

**Sustain comps:** Strong fit. Serket already self-sustains; adding team-wide sustain (Athena heal, Mengpo revive, Iris) just creates a comp the enemy can't burn down. The drawback: this style of comp can lose to time-based mechanics (Cronus's tempo control, hard kill pressure within his window).

**Synergy with Set:** Set's lifesteal aura affects Serket; Set's armor shred amplifies Serket's physical damage AND her scorpions' damage. Diamond-faction bonus available. **[KIT-INFERENCE, strong]** — this is actually a better partnership than the .md suggests.

---

## 12) Are players overhyping her, or is she actually that dangerous?

**Verdict: she's genuinely strong, but the .md and Discord buzz risk over-positioning her as a top-tier solo carry. She's a frontline-bruiser summoner that demands proper team building.**

The case **for** the hype:
- CN community calls her *"strong, full upgrade over Eris, higher damage, AoE capability, stronger survivability"*. That's a clear positive verdict from people who already have her live. **[CN-COMMUNITY]**
- She's mechanically distinct on two counts: (1) her summons explode on death for AoE + ATK-Down, which no other summoner does, and (2) her summons autonomously use her active skill on their own AI. Zeus's Echoes are the closest comparison but only fire when Zeus himself casts (coupled multi-cast, not autonomous). **[DB-CROSS-CHECK]**
- Five compounding value layers in a single kit is more than most heroes get. **[KIT-INFERENCE]**

The case **against** over-hyping:
- CN explicitly calls out caveats: needs Relic Lv.30, needs energy support, needs teammate investment. **[CN-COMMUNITY]**
- She has no execute, no untargetable opener, no team-wide buff. She's a self-completer, not an enabler.
- She's vulnerable to energy drain (Pan), execute (Anubis r20), and large AoE that ignores summons (Hecate, Skadi).
- The most prominent CN comparison is against **Eris**, not against established T0 picks like Nyx or Nezha. Being "better than Eris" is meaningful, but Eris is unreleased on Western servers and not a top-tier benchmark.

### Suggested DB tier placement

- **Overall:** A / A+
- **PvP:** A+ (potential S in synergy lobbies with Nuba/Nuwa)
- **PvE wave clear:** A
- **Single-target boss:** B+
- **Relic dependency:** medium-high (real spikes at Lv.3 and Lv.4)
- **Investment confidence:** medium-high

I would **not** rank her S/SS without more data. The CN community itself flags her tower-push performance as "to be tested". **[CN-COMMUNITY]**

The .md's final placement of "**A bis A+ overall, PvP A+, potentially S in passenden Lobbys**" is **broadly correct** — and one of the stronger calls the .md makes. **[GUIDE.MD-CLAIM, validated]**

---

## Critical .md Discrepancies — Quick Reference

For your records, these are the .md claims that **did not survive CN cross-check**:

1. **Synergy partner list** — .md names Anubis, Nyx, Bastet, Sekhmet, Mengpo, Prometheus, Poseidon, Pan, Valkyrie (= Hladgunnr), Cronus, Hecate, Skadi. **CN confirms only Nuba and Nuwa**, neither of which appears in the .md list. **[MAJOR DISCREPANCY]**
2. **"Valkyrie" naming** — refers to **Hladgunnr** (her in-game description literally calls her "the Valkyrie of the Swan"). The localization differs between CN and Western servers. **[CLARIFICATION, not an error]**
3. **"Backline-Assassin Team" composition** (Anubis + Nyx + Prometheus) is theory-crafted and contradicts her actual bruiser-frontline role as described by CN. **[FLAGGED]**
4. **"Hidden Meta Build: Attack > Lifesteal > Speed"** — directionally OK but skips HP, which is mechanically critical due to summon inheritance + threshold mechanics. **[PARTIAL]**

The .md is **mostly correct on her identity profile** (bruiser-summoner-diver, AoE pressure, Relic-scaling). It is **mostly wrong on her specific team partners**.

---

## Sources

- Skill preview image (user-supplied)
- `all_heroes_db.json` — cross-reference for Warrior comparisons, summon-mechanic uniqueness, synergy partners
- TapTap CN forum — post-release community evaluation: https://www.taptap.cn/app/708799/topic (forum thread Feb 2026)
- Zhihu tier-list articles (Sep 2025, pre-Serket — used only for partner-hero context)
- `serket-guide.md` — claims integrated where verifiable, flagged where speculative
- Official TapTap skill preview & teaser posts (cited in .md, re-checked)