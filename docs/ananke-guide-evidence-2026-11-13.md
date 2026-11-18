# Ananke guide evidence — 2026-11-13

Scope: Ananke in Motto Immortal / 不朽箴言. The Hades section of the supplied template was accidental, as confirmed by the owner. Public copy uses neutral source labels.

Publication decision: the owner requested a general informational guide. Battle results, counts, timings and comparisons below remain research material and are not included on the page. Potentially valuable additions require a separate owner decision. The current account-specific results do not justify a universal performance claim.

## Local primary sources

- `src/data/heroes/ananke.json`: current skill and relic text, refreshed from the client on 2026-11-13. Existing owner changes preserved.
- `fights/reports/ananke_guide_handoff_2026-11-13.md`: owner-confirmed team compositions and recording limitations.
- `fights/reports/ananke_findings_2026-11-13.md`: contextual interpretation of the recordings.
- `fights/reports/ananke_mechanics.md`: cast timing and per-fight observations.
- `fights/session_ananke_*/NN_*/events.jsonl`: raw recordings.
- Corresponding `HERO_ANALYSIS.json`: calculated damage, effective enemy HP loss, suppression and capture duration. Rosters can contain stale heroes.
- `fights/reports/nidhogg_guide_handoff_2026-11-03.md`, section 1: suppression code/config findings. These were supplied as prior analysis, not independently rederived from client code in this task.

Test account: heroes level 446, Auto. Investment was not varied. All recorded results describe this account and the named teams; they are not universal ratings. No before-patch sample exists.

## Verification and corrections

1. Tower 724/725 has **11** fight folders: one victory on 724 and ten losses on 725. The older findings file's “12 fights, 11 lost” is inconsistent with the actual folders and per-fight mechanics table. Do not publish that older count.
2. The 35 Odyssey captures include other teams. The per-fight report lists **15 Ananke sub-fights**, 14 victories and one defeat. The owner reports Ananke was used only in the first team; stages are not replayable. This is not a controlled partner comparison.
3. `an_rows.json` uses stale roster membership to flag Ananke presence: it excludes boss run 1 even though she deals damage and includes the Isis run with zero Ananke damage. Do not use its `ank` flag to count participants.
4. `DAMAGE.out` is calculator output. Its shares differ from `hero_hp_share_with_summons`, which attributes effective enemy HP loss. Keep those quantities separate; the supplied reports use both.
5. Recomputed all 12 boss ratios from `metrics.enemy_hp_lost`, normalized to the mean of the first three Ananke runs. Results match the handoff:

| Session / fights | Relative effective boss HP loss | Capture duration |
| --- | --- | --- |
| 083426 / 1–3, Ananke | 0.786 / 0.858 / 1.356 | 92.2 / 75.4 / 92.2 s |
| 083426 / 4, Isis | 1.245 | 92.2 s |
| 083426 / 5, Xuannv | 1.883 | 56.8 s |
| 083426 / 6, Zeus | 3.807 | 42.3 s |
| 084326 / 1–3, Zeus + Ananke, team A | 1.937 / 1.960 / 1.189 | 71.2 / 47.8 / 38.9 s |
| 084326 / 4–6, Zeus + Ananke, team B | 3.154 / 1.787 / 2.171 | 82.1 / 73.8 / 74.4 s |

Boss gameplay lasts 90 s; full captures include about 2.2 s extra. Early endings mean the team died, despite the recorder calling every boss fight “victory”. Solo-comparison supports: Idunn, Heqet, Caishen, Dionysus. Team A: Heqet, Caishen, Dionysus. Team B: Mazu, Meret (Idunn in fight 5), Hephaestus. Adding Ananke changes a support slot; this is not an isolated measurement of her benefit to Zeus.

6. Scanned raw Ananke TRUE-path damage events: **1,935 events**, all with `skill = nil`. A contemporaneous `active_skill` field does not prove that skill generated the extra damage. The mark is a plausible explanation, supported by its text, but attribution to its precise runtime trigger remains an interpretation.
7. Raw calculator shares in Zeus + Ananke boss team B: 33.7 / 40.4 / 36.9%; true-damage shares of Ananke's calculator damage: 51.7 / 48.6 / 53.3%. Team A true shares: 71.2 / 75.5 / 70.1%, with her dying at 16.5 s. A larger share does not establish a larger total.
8. Campaign effective HP shares in the current structured reports range from 3.3% to 91.0% across different teams and outcomes. Do not present the handoff's narrower 74–87% team-specific range as a universal campaign result or mix it with the effective-HP metric.

## External research

Accessed 2026-11-13. Searches covered hero name with skills, relic, teams, strength, builds and experience, plus TapTap, Bilibili, NGA, 9game and Huya. Only the game-specific material below was useful. No verified high-level build, 10–15 hidden combinations, current numerical tier rating or duplicate breakpoint was recovered.

| Source | Author | Date displayed | Relevant content / short original excerpt | Weight |
| --- | --- | --- | --- | --- |
| [方块刺客真不行](https://www.taptap.cn/moment/829599527341132963?group_id=784460) | 藤蔓 | 07/23; year contextualized as 2026 in the indexed forum listing | “在第二次隐身之前被月老抽死了” — died to Yue Lao before the second untargetable window. The post describes a failed faction-tower attempt; investment and level gap are missing. | Direct anecdote, Community; no general matchup conclusion. |
| [Guide listing](https://www.taptap.cn/group/784460/group-label/1750254) | 兮兮（如烟是我的女王） | guide title updated 2026-08-12 | “方块阿南刻：等级+5，过” — terse skip recommendation referring to +5 levels. The meaning of the level benefit was not independently established. | Indexed listing excerpt only; full guide and comments not recovered. |
| [Launch-era forum listing](https://www.taptap.cn/app/708799/topic?page=52) | 天秤座, official operator (indexed listing) | 2026-07-24 | “蓄力斩杀 \| 标记真伤 \| 不可选中” — charged finishing damage, mark-triggered true damage, untargetability. | Historical indexed excerpt. Page contents move as new posts are added. Exact current coefficients come from local client text. |
| [Anniversary tier-list post](https://www.taptap.cn/moment/846834353257317186) | 猫鱼Gary | 09/09 | Body says the list is incomplete; ranking is an image. Ananke's placement was not verified. | Discovery only; no rank extracted or claimed. |

**Access limits:** the web reader exposed post bodies and recommendations but no scrollable comment stream. The requested minimum of 100 comments per thread was not achieved. Recommendations shown below a post are unrelated posts, not that post's comments. Search-index excerpts and live paginated listings differed; label index-only material as such.

Excluded: the Ananke analysis for 永暮幻想, unrelated standalone Ananke games and mythological references. Its damage-transfer mechanics and PvE superlatives do not belong to Motto Immortal.

## Publication boundaries

- Relic Lv2 transfers the mark on death; Lv4 adds the next dash on kill participation. Those are textual mechanic unlocks, not proven universal investment recommendations.
- The 5% base mark and relic 10%/20% lines do not establish whether the percentages add or replace one another. Do not claim 15% or 25% total.
- No skill text grants a freeze, silence, stun or energy loop to Ananke. Do not invent a control build.
- ATK scaling is confirmed; an optimal stat priority, critical threshold, virtue set and endgame build are not established.
- Partner skill descriptions can explain available protection, damage and Energy support. Co-occurrence in a team is not proof of a special interaction. Heqet's minion buffs do not automatically apply to Ananke.
- Divine V / level 300 in hero reference stats is a reference configuration, not a minimum playable rank, the tested rank or a duplicate requirement.
- Existing `ratings/invest.json` has relic 20/30 for Ananke without provenance in that entry. Do not promote it to a verified breakpoint.
- Momus, faction tower, Torment Rift, before/after patch comparisons, multiple PvP opponents and investment sweeps remain open.
