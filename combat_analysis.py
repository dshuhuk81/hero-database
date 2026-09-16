"""Offline, evidence-first analysis for ``hero_combat_capture.py``.

The capture process deliberately records generic engine events.  This module
turns those events into player-facing explanations without treating absence as
proof or inference as observation.  Hero adapters may add mechanic-specific
interpretation while preserving the raw JSONL as the source of truth.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = 4
UNKNOWN = {None, "", "?", "nil", "None"}


def number(value: Any, default: float | None = None) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    return result if math.isfinite(result) else default


def stamp(row: dict[str, Any]) -> float:
    return max(0.0, number(row.get("ms"), 0.0) or 0.0)


def state(text: Any) -> dict[str, str]:
    return dict(part.split(":", 1) for part in str(text).split(",") if ":" in part)


def sumfield(rows: Iterable[dict[str, Any]], key: str) -> float:
    return sum(number(row.get(key), 0.0) or 0.0 for row in rows)


def entity(row: dict[str, Any], prefix: str = "") -> str:
    key = f"{prefix}_instance" if prefix else "instance"
    value = row.get(key)
    if value not in UNKNOWN:
        return str(value)
    hero_key = f"{prefix}_hero" if prefix else "hero"
    return str(row.get(hero_key, "?"))


def dedupe_events(rows: Iterable[dict[str, Any]], fields: tuple[str, ...]) -> list[dict[str, Any]]:
    seen: set[tuple[Any, ...]] = set()
    result = []
    for row in rows:
        key = tuple(row.get(field) for field in fields)
        if key in seen:
            continue
        seen.add(key)
        result.append(row)
    return result


def _load_reference_kit(meta: dict[str, Any]) -> dict[str, Any] | None:
    slug = (meta.get("hero") or {}).get("slug")
    repo = meta.get("hero_repo")
    if not slug or not repo:
        return None
    source = Path(repo) / "src/data/heroes" / f"{slug}.json"
    if not source.exists():
        return None
    try:
        data = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return {
        "source": str(source),
        "skills": data.get("skills", []),
        "relic": data.get("relic", {}),
        "note": "Reference text only; it does not prove the captured investment or runtime parameters.",
    }


def _build_roster(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    roster: dict[str, dict[str, Any]] = {}
    for row in rows:
        for prefix in ("", "src", "dst"):
            instance = entity(row, prefix)
            hero_key = f"{prefix}_hero" if prefix else "hero"
            if prefix in {"src", "dst"}:
                # Capture events use src/dst, not src_hero/dst_hero.
                hero_key = prefix
            hero = row.get(hero_key)
            if instance in UNKNOWN or hero in UNKNOWN:
                continue
            camp_key = f"{prefix}_camp" if prefix else "camp"
            item = roster.setdefault(instance, {
                "hero": str(hero), "camp": None, "master": None,
                "position": None, "features": [], "loadout": {},
            })
            if row.get(camp_key) not in UNKNOWN:
                item["camp"] = str(row.get(camp_key))
            master_key = f"{prefix}_master" if prefix else "master"
            if row.get(master_key) not in UNKNOWN:
                item["master"] = row.get(master_key)
            position_key = f"{prefix}_position" if prefix else "position"
            if row.get(position_key) not in UNKNOWN:
                item["position"] = row.get(position_key)
            if row.get("kind") == "PLAYER_LINEUP" and not prefix:
                item["loadout"] = {key: row.get(key) for key in (
                    "level", "relic", "throne", "divination", "max_hp", "atk"
                )}
            if row.get("kind") == "FEATURE_INIT" and not prefix:
                feature = row.get("feature")
                if feature not in UNKNOWN and feature not in item["features"]:
                    item["features"].append(feature)
    return roster


def _significant_timeline(
    rows: list[dict[str, Any]], target: set[str], camp: str
) -> list[dict[str, Any]]:
    timeline = []
    interesting = {
        "PLAYER_SKILL", "ENERGY_CHANGE", "DAMAGE", "HEAL", "BUFF_ADD",
        "BUFF_REMOVE", "PLAYER_DEAD", "PLAYER_REVIVE", "SUMMON_CREATE",
        "SUMMON_DESTROY", "TARGET_SELECTION", "DIRECT_HP_CHANGE",
    }
    seen: set[tuple[Any, ...]] = set()
    for row in rows:
        if row.get("kind") not in interesting:
            continue
        touches_target = (
            entity(row) in target or entity(row, "src") in target or entity(row, "dst") in target
        )
        # Team Energy spending is relevant to resource-sharing heroes.
        allied_energy = row.get("kind") == "ENERGY_CHANGE" and str(row.get("camp")) == camp
        if not touches_target and not allied_energy:
            continue
        # addBufById commonly delegates to addBufByData; show that as one event.
        duplicate_key = (
            row.get("kind"), row.get("ms"), row.get("id"), row.get("src_instance"),
            row.get("dst_instance"), row.get("skill"), row.get("effective"), row.get("out"),
        )
        if row.get("kind") in {"BUFF_ADD", "BUFF_REMOVE"} and duplicate_key in seen:
            continue
        seen.add(duplicate_key)
        timeline.append({
            "seconds": stamp(row) / 1000,
            "kind": row.get("kind"),
            "actor": row.get("hero") or row.get("src") or row.get("master") or "?",
            "actor_instance": row.get("instance") or row.get("src_instance") or "?",
            "recipient": row.get("dst") or row.get("targets") or "?",
            "recipient_instance": row.get("dst_instance") or "?",
            "skill": row.get("skill") or row.get("active_skill") or row.get("feature") or row.get("reason") or "?",
            "value": row.get("out") or row.get("effective") or row.get("actual") or row.get("id") or "?",
            "state": row.get("state") or row.get("src_state") or "?",
            "spent": number(row.get("spent"), 0.0) or 0.0,
            "gained": number(row.get("gained"), 0.0) or 0.0,
        })
    return sorted(timeline, key=lambda item: item["seconds"])


def _match_casts(
    rows: list[dict[str, Any]], target: set[str], end_ms: float
) -> list[dict[str, Any]]:
    casts = [row for row in rows if row.get("kind") == "PLAYER_SKILL" and entity(row) in target]
    starts = [row for row in casts if row.get("phase") == "start"]
    damage = [row for row in rows if row.get("kind") == "DAMAGE" and entity(row, "src") in target]
    support = [
        row for row in rows if row.get("kind") in {"HEAL", "BUFF_ADD", "DIRECT_HP_CHANGE", "SUMMON_CREATE"}
        and (entity(row, "src") in target or entity(row) in target)
    ]
    clears = [
        row for row in rows if row.get("kind") == "ENERGY_CHANGE"
        and entity(row) in target and row.get("reason") == "ultimate_clear"
    ]
    result = []
    for index, start in enumerate(starts):
        skill = start.get("skill")
        started = stamp(start)
        next_start = min(
            (stamp(other) for other in starts[index + 1:] if stamp(other) > started),
            default=end_ms + 1,
        )
        ends = [row for row in casts if row.get("phase") == "end" and row.get("skill") == skill and started <= stamp(row) < next_start]
        hits = [row for row in damage if row.get("active_skill") == skill and started <= stamp(row) < next_start]
        effects = [
            row for row in support if started <= stamp(row) < next_start
            and (row.get("skill") == skill or row.get("active_skill") == skill)
        ]
        result.append({
            "skill": skill,
            "start_seconds": started / 1000,
            "end_seconds": stamp(ends[0]) / 1000 if ends else None,
            "hit_count": len(hits),
            "damage": sumfield(hits, "out"),
            "targets": sorted({entity(row, "dst") for row in hits}),
            "first_hit_seconds": stamp(hits[0]) / 1000 if hits else None,
            "support_effect_count": len(effects),
            "ultimate": any(abs(stamp(clear) - started) <= 1 for clear in clears),
            "state": start.get("state", "?"),
        })
    return result


def _findings(
    rows: list[dict[str, Any]], target: set[str], casts: list[dict[str, Any]], end_ms: float
) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    deaths = [row for row in rows if row.get("kind") == "PLAYER_DEAD" and entity(row) in target]
    first_death = min((stamp(row) for row in deaths), default=None)
    ultimate_clears = [
        row for row in rows
        if row.get("kind") == "ENERGY_CHANGE"
        and entity(row) in target and row.get("reason") == "ultimate_clear"
    ]
    if first_death is not None and not any(stamp(row) < first_death for row in ultimate_clears):
        findings.append({
            "status": "not_observed", "confidence": "observed",
            "finding": "The hero died before any recorded Ultimate Energy clear.",
            "reason": f"Death was recorded at {first_death / 1000:.3f}s.",
        })
    for cast in casts:
        when = cast["start_seconds"]
        if cast["end_seconds"] is None:
            observed_effects = cast["hit_count"] + cast["support_effect_count"]
            reason = "No matching end callback was captured."
            confidence = "observed"
            control_rows = [
                row for row in rows
                if row.get("kind") == "BUFF_ADD" and entity(row, "dst") in target
                and when * 1000 <= stamp(row) <= min(end_ms, when * 1000 + 3000)
                and any(token in str(row.get("buff_state", "")).casefold()
                        for token in ("stun", "silence", "freeze", "control", "knock", "sleep", "fear", "charm"))
            ]
            if observed_effects:
                reason += (
                    f" The cast still produced {cast['hit_count']} attributed hit(s) and "
                    f"{cast['support_effect_count']} attributed support effect(s), so the missing callback "
                    "does not establish cancellation or interruption."
                )
            elif first_death is not None and when <= first_death / 1000 <= when + 3:
                reason += f" The hero died at {first_death / 1000:.3f}s, which may explain why no effect followed."
                confidence = "strong_inference"
            elif control_rows:
                first_control = control_rows[0]
                reason += f" A control-like buff `{first_control.get('id', '?')}` was applied at {stamp(first_control) / 1000:.3f}s; it may have interrupted or delayed execution."
                confidence = "strong_inference"
            elif end_ms / 1000 - when < 1.0:
                reason += " The recording/fight ended less than one second later."
                confidence = "strong_inference"
            findings.append({
                "status": "not_observed", "confidence": confidence,
                "finding": f"No completion callback was captured for `{cast['skill']}` started at {when:.3f}s.",
                "reason": reason,
            })
        if cast["ultimate"] and cast["hit_count"] == 0 and cast["support_effect_count"] == 0:
            reason = "No synchronously attributed damage or support effect was recorded before the next cast."
            if end_ms / 1000 - when < 1.0:
                reason += " The fight or capture ended before a normal projectile window elapsed."
            else:
                reason += " Delayed damage may instead be labeled `normal_or_delayed`."
            findings.append({
                "status": "not_observed", "confidence": "observed",
                "finding": f"`{cast['skill']}` at {when:.3f}s had no directly attributed hit.",
                "reason": reason,
            })
    if not casts:
        findings.append({
            "status": "not_observed", "confidence": "observed",
            "finding": "No player-level skill start was captured for the selected hero.",
            "reason": "This can mean no cast occurred or the player-level hook was unavailable; check hook health.",
        })
    return findings


def _benefit_matrices(
    rows: list[dict[str, Any]], target: set[str], roster: dict[str, dict[str, Any]], camp: str
) -> dict[str, list[dict[str, Any]]]:
    # cureExt emits once per engine heal. Multiple identical same-tick heals can
    # be genuine (for example two projectiles), so they must not be collapsed.
    heals = [row for row in rows if row.get("kind") == "HEAL"]
    buffs = dedupe_events(
        (row for row in rows if row.get("kind") == "BUFF_ADD"),
        ("ms", "id", "src_instance", "dst_instance", "skill"),
    )
    hp_changes = [row for row in rows if row.get("kind") == "DIRECT_HP_CHANGE"]
    damage = [row for row in rows if row.get("kind") == "DAMAGE"]

    def describe(instance: str) -> str:
        item = roster.get(instance, {})
        return str(item.get("hero") or instance)

    def teammate(instance: str) -> bool:
        item = roster.get(instance, {})
        return str(item.get("camp")) == str(camp) and item.get("hero") != "H_MainPlayer"

    given_peers = {
        entity(row, "dst") for row in heals + buffs
        if entity(row, "src") in target and entity(row, "dst") not in target and teammate(entity(row, "dst"))
    }
    received_peers = {
        entity(row, "src") for row in heals + buffs
        if entity(row, "dst") in target and entity(row, "src") not in target and teammate(entity(row, "src"))
    }
    given = []
    for peer in sorted(given_peers):
        hh = [row for row in heals if entity(row, "src") in target and entity(row, "dst") == peer]
        bb = [row for row in buffs if entity(row, "src") in target and entity(row, "dst") == peer]
        given.append({
            "peer": peer, "hero": describe(peer), "effective_healing": sumfield(hh, "effective"),
            "buff_applications": len(bb), "buff_ids": sorted({str(row.get("id")) for row in bb}),
            "first_seconds": min((stamp(row) for row in hh + bb), default=0) / 1000,
            "confidence": "observed",
        })
    received = []
    for peer in sorted(received_peers):
        hh = [row for row in heals if entity(row, "src") == peer and entity(row, "dst") in target]
        bb = [row for row in buffs if entity(row, "src") == peer and entity(row, "dst") in target]
        received.append({
            "peer": peer, "hero": describe(peer), "effective_healing": sumfield(hh, "effective"),
            "buff_applications": len(bb), "buff_ids": sorted({str(row.get("id")) for row in bb}),
            "first_seconds": min((stamp(row) for row in hh + bb), default=0) / 1000,
            "confidence": "observed",
        })
    allied_spending = []
    for instance, item in roster.items():
        if str(item.get("camp")) != camp or instance in target:
            continue
        events = [
            row for row in rows
            if row.get("kind") == "ENERGY_CHANGE" and entity(row) == instance
            and (number(row.get("spent"), 0) or 0) > 0
        ]
        if events:
            allied_spending.append({
                "peer": instance, "hero": describe(instance), "energy_spent": sumfield(events, "spent"),
                "events": len(events), "first_seconds": min(stamp(row) for row in events) / 1000,
                "confidence": "observed_opportunity",
                "note": "Observed allied Energy consumption; actual conversion into the hero-specific resource requires mechanic-state evidence.",
            })
    direct_hp = [row for row in hp_changes if entity(row) in target]
    enemy_peers = {
        entity(row, "dst") for row in damage + buffs
        if entity(row, "src") in target
        and str(roster.get(entity(row, "dst"), {}).get("camp")) not in {str(camp), "None"}
    }
    enemy_pressure = []
    for peer in sorted(enemy_peers):
        dd = [row for row in damage if entity(row, "src") in target and entity(row, "dst") == peer]
        bb = [row for row in buffs if entity(row, "src") in target and entity(row, "dst") == peer]
        enemy_pressure.append({
            "peer": peer, "hero": describe(peer), "calculator_damage": sumfield(dd, "out"),
            "damage_events": len(dd), "effect_applications": len(bb),
            "effect_ids": sorted({str(row.get("id")) for row in bb}), "confidence": "observed",
        })
    return {
        "given": given, "received": received, "allied_energy_spending": allied_spending,
        "enemy_pressure": enemy_pressure, "target_direct_hp_changes": direct_hp,
    }


def _zaojun_analysis(
    rows: list[dict[str, Any]], target: set[str], roster: dict[str, dict[str, Any]],
    casts: list[dict[str, Any]], camp: str, end_ms: float,
) -> dict[str, Any]:
    buff_rows = dedupe_events(
        (row for row in rows if row.get("kind") == "BUFF_ADD"),
        ("ms", "id", "src_instance", "dst_instance", "skill"),
    )
    # Known internal IDs are evidence aids, not global-facing names.
    bond_ids = {"40133401"}
    bond_apps = [row for row in buff_rows if str(row.get("id")) in bond_ids and entity(row, "src") in target]
    bond_targets = [entity(row, "dst") for row in bond_apps]
    deaths = [row for row in rows if row.get("kind") == "PLAYER_DEAD"]
    bond_lifecycle = []
    for app in bond_apps:
        recipient = entity(app, "dst")
        death = next((row for row in deaths if entity(row) == recipient and stamp(row) >= stamp(app)), None)
        replacements = [row for row in bond_apps if stamp(row) > (stamp(death) if death else end_ms)]
        bond_lifecycle.append({
            "recipient": recipient,
            "hero": roster.get(recipient, {}).get("hero", "unknown"),
            "applied_seconds": stamp(app) / 1000,
            "recipient_death_seconds": stamp(death) / 1000 if death else None,
            "replacement_observed": bool(replacements),
            "confidence": "observed" if death else "censored",
        })
    delayed = [
        row for row in rows if row.get("kind") == "DAMAGE"
        and entity(row, "src") in target and row.get("active_skill") == "normal_or_delayed"
    ]
    resource_observations = []
    passive_samples = []
    for row in rows:
        if row.get("kind") != "FEATURE_EXIT" or entity(row) not in target:
            continue
        values = state(row.get("self_state"))
        if "energyMaxCount" in values and ("energyCount" in values or "cachedEnergyCount" in values):
            stored_raw = number(values.get("energyCount"))
            committed_raw = number(values.get("cachedEnergyCount"))
            maximum_raw = number(values.get("energyMaxCount"))
            resource_observations.append({
                "seconds": stamp(row) / 1000,
                "feature": row.get("feature"),
                "stored_raw": stored_raw,
                "committed_raw": committed_raw,
                "maximum_raw": maximum_raw,
                "stored_display": stored_raw / 1024 if stored_raw is not None else None,
                "committed_display": committed_raw / 1024 if committed_raw is not None else None,
                "maximum_display": maximum_raw / 1024 if maximum_raw is not None else None,
            })
        if "atkMaxCount" in values and "cdTimeLength" in values:
            interval_raw = number(values.get("cdTimeLength"))
            energy_tick_raw = number(values.get("energyCount"))
            passive_samples.append({
                "seconds": stamp(row) / 1000,
                "feature": row.get("feature"),
                "atk_stacks": number(values.get("atkCount")),
                "max_atk_stacks": number(values.get("atkMaxCount")),
                "interval_raw": interval_raw,
                "interval_seconds": interval_raw / 1024 if interval_raw is not None else None,
                "energy_per_tick_raw": energy_tick_raw,
                "energy_per_tick_display": energy_tick_raw / 1024 if energy_tick_raw is not None else None,
            })

    def changing(samples: list[dict[str, Any]], keys: tuple[str, ...]) -> list[dict[str, Any]]:
        result = []
        previous = None
        for sample in samples:
            signature = tuple(sample.get(key) for key in keys)
            if signature == previous:
                continue
            previous = signature
            result.append(sample)
        return result

    resource_samples = changing(resource_observations, ("stored_raw", "committed_raw", "maximum_raw"))
    passive_samples = changing(passive_samples, ("atk_stacks", "interval_raw", "energy_per_tick_raw"))
    target_selections = []
    for row in rows:
        if row.get("kind") != "TARGET_SELECTION" or entity(row) not in target:
            continue
        targets = [part for part in str(row.get("targets", "")).split(",") if part]
        target_selections.append({
            "seconds": stamp(row) / 1000, "feature": row.get("feature"),
            "targets": targets, "target_count": len(targets),
        })
    food_formula_events = []
    for row in rows:
        if row.get("kind") != "FEATURE_ENTER" or entity(row) not in target:
            continue
        if "skill1" not in str(row.get("feature", "")).casefold():
            continue
        if row.get("victim") in UNKNOWN or number(row.get("damage")) is None:
            continue
        food_formula_events.append({
            "seconds": stamp(row) / 1000, "method": row.get("method"),
            "killer": row.get("killer"), "killer_atk": number(row.get("killer_atk")),
            "killer_max_hp": number(row.get("killer_max_hp")),
            "victim": row.get("victim"), "victim_atk": number(row.get("victim_atk")),
            "victim_max_hp": number(row.get("victim_max_hp")),
            "constructed_damage": number(row.get("damage")),
        })

    ultimate_cycles = []
    ultimate_casts = [cast for cast in casts if cast.get("ultimate")]
    for cast in ultimate_casts:
        started = cast["start_seconds"]
        # A cast can expose both its before-transfer and after-transfer state at
        # the same battle timestamp. Prefer the post-transfer state, identified
        # by the largest committed value, when distance is otherwise tied.
        snapshots = sorted(
            resource_observations,
            key=lambda item: (
                abs(item["seconds"] - started),
                0 if item["seconds"] >= started else 1,
                -(item.get("committed_display") or 0),
            ),
        )
        resource = snapshots[0] if snapshots and abs(snapshots[0]["seconds"] - started) <= 0.25 else None
        selections = [
            item for item in target_selections
            if started <= item["seconds"] <= started + 3
            and "skill3" in str(item.get("feature", "")).casefold()
        ]
        selection = selections[0] if selections else None
        ultimate_cycles.append({
            "start_seconds": started,
            "end_seconds": cast.get("end_seconds"),
            "stored_at_start": resource.get("stored_display") if resource else None,
            "committed_at_start": resource.get("committed_display") if resource else None,
            "selected_targets": selection.get("targets", []) if selection else [],
            "selected_target_count": selection.get("target_count") if selection else None,
            "hit_events": cast.get("hit_count", 0),
            "calculator_damage": cast.get("damage", 0),
            "confidence": "observed" if resource and selection else "partial",
        })

    adapter_findings = []
    full_energy = [
        row for row in rows if row.get("kind") == "ENERGY_CHANGE" and entity(row) in target
        and (number(row.get("after"), 0) or 0) >= 1_024_000
    ]
    clears = [
        row for row in rows if row.get("kind") == "ENERGY_CHANGE" and entity(row) in target
        and row.get("reason") == "ultimate_clear"
    ]
    hero_deaths = [row for row in rows if row.get("kind") == "PLAYER_DEAD" and entity(row) in target]
    if full_energy:
        reached = min(stamp(row) for row in full_energy)
        next_clear = next((row for row in clears if stamp(row) >= reached), None)
        next_death = next((row for row in hero_deaths if stamp(row) >= reached), None)
        if next_clear is None or (next_death is not None and stamp(next_death) < stamp(next_clear)):
            boundary = stamp(next_death) if next_death else end_ms
            adapter_findings.append({
                "status": "not_observed", "confidence": "observed",
                "finding": f"Zaojun reached the known full-Energy scale at {reached / 1000:.3f}s but did not begin a recorded Ultimate before the observation boundary.",
                "reason": f"The boundary was {'her death' if next_death else 'the end of the capture'} at {boundary / 1000:.3f}s. Energy readiness alone did not produce a completed action.",
            })
    return {
        "adapter": "zaojun",
        "bond_lifecycle": bond_lifecycle,
        "bond_targets": bond_targets,
        "delayed_damage": {"events": len(delayed), "calculator_output": sumfield(delayed, "out")},
        "food_offering_formula": {
            "status": "captured_operands" if food_formula_events else "unresolved",
            "reason": "Candidate calculation callbacks include attacker and victim ATK/max-HP operands; compare constructed damage against each formula before concluding ownership." if food_formula_events else "This older capture predates attacker/victim max-HP instrumentation. Record a new fight to expose candidate operands.",
            "events": food_formula_events,
        },
        "resource_state": {
            "status": "observed_snapshots" if resource_samples else "partial",
            "reason": "Feature-state snapshots expose stored, committed, and maximum resource values when the relevant runtime feature is loaded." if resource_samples else "Allied Energy spending is captured, but no resource-bearing feature state was observed.",
            "samples": resource_samples,
        },
        "passive_state": {"samples": passive_samples},
        "target_selections": target_selections,
        "ultimate_cycles": ultimate_cycles,
        "findings": adapter_findings,
    }


def analyze(
    meta: dict[str, Any], rows: list[dict[str, Any]], camp: str = "1", config_root: Any = None
) -> dict[str, Any]:
    rows = [dict(row) for row in rows]
    rows.sort(key=stamp)
    hero = meta.get("hero") or {}
    runtime = str(hero.get("runtime_identity", ""))
    roster = _build_roster(rows)
    matching_targets = {instance for instance, item in roster.items() if item.get("hero") == runtime and str(item.get("camp")) == str(camp)}
    if not matching_targets:
        # Some early feature events omit camp; a unique runtime instance is still useful with a warning.
        candidates = {instance for instance, item in roster.items() if item.get("hero") == runtime}
        if len(candidates) == 1:
            matching_targets = candidates
    # Runtime callbacks without an instance fall back to the symbolic hero
    # name. Keep that alias for event matching, but do not report it as a
    # second combatant when a concrete instance is available.
    concrete_targets = {instance for instance in matching_targets if instance != runtime}
    targets = matching_targets
    reported_targets = concrete_targets or matching_targets
    end_ms = max((stamp(row) for row in rows), default=0.0)
    damage = [row for row in rows if row.get("kind") == "DAMAGE"]
    outgoing = [row for row in damage if entity(row, "src") in targets]
    incoming = [row for row in damage if entity(row, "dst") in targets]
    team_damage = [row for row in damage if str(row.get("src_camp")) == str(camp)]
    energy = [row for row in rows if row.get("kind") == "ENERGY_CHANGE" and entity(row) in targets]
    deaths = [row for row in rows if row.get("kind") == "PLAYER_DEAD" and entity(row) in targets]
    casts = _match_casts(rows, targets, end_ms)
    hooks = {
        "ready": any(row.get("kind") == "READY" for row in rows),
        "damage_hook": next(({"normal": row.get("normal"), "true_damage": row.get("true_damage")} for row in rows if row.get("kind") == "DAMAGE_HOOK"), None),
        "fatal_events": [row for row in rows if row.get("kind") == "FATAL"],
        "lineup": any(row.get("kind") == "PLAYER_LINEUP" for row in rows),
        "skill_events": any(row.get("kind") == "PLAYER_SKILL" for row in rows),
    }
    warnings = [
        "Damage values are calculator output, not settlement damage or effective HP loss.",
        "Missing events mean unknown unless an expected-event rule explicitly applies.",
        "Delayed projectiles and persistent effects may be labeled `normal_or_delayed`.",
        "Buff applications do not by themselves prove uptime, mitigation, or damage amplification.",
        "Shield mutation coverage depends on which runtime shield classes were loaded when the probe attached.",
    ]
    if len(reported_targets) != 1:
        warnings.append(f"Selected target resolved to {len(reported_targets)} concrete instances; hero-specific totals may be incomplete or aggregated.")
    if not hooks["ready"] or hooks["fatal_events"]:
        warnings.append("Capture hook health is incomplete; interpret missing actions cautiously.")
    if any(stamp(b) + 1000 < stamp(a) for a, b in zip(rows, rows[1:]) if stamp(b) > 0):
        warnings.append("Battle-clock reset detected; this capture may contain multiple fights.")

    by_skill = []
    skills = sorted({str(cast.get("skill")) for cast in casts})
    for skill in skills:
        matching = [cast for cast in casts if str(cast.get("skill")) == skill]
        by_skill.append({
            "skill": skill, "starts": len(matching),
            "completed_callbacks": sum(cast["end_seconds"] is not None for cast in matching),
            "hit_events": sum(cast["hit_count"] for cast in matching),
            "calculator_damage": sum(cast["damage"] for cast in matching),
            "start_seconds": [cast["start_seconds"] for cast in matching],
            "targets": sorted({target for cast in matching for target in cast["targets"]}),
        })
    benefits = _benefit_matrices(rows, targets, roster, str(camp))
    findings = _findings(rows, targets, casts, end_ms)
    slug = str(hero.get("slug", "")).casefold()
    adapter = _zaojun_analysis(rows, targets, roster, casts, str(camp), end_ms) if slug == "zaojun" or "zaojun" in runtime.casefold() else None
    if adapter:
        findings.extend(adapter.get("findings", []))
    return {
        "schema_version": SCHEMA_VERSION,
        "hero": hero.get("name") or hero.get("slug") or runtime,
        "runtime": runtime,
        "camp": str(camp),
        "target_instances": sorted(reported_targets),
        "target_match_aliases": sorted(targets - reported_targets),
        "context": meta.get("experiment", {}),
        "capture": {
            "schema_version": meta.get("schema_version", 1),
            "capture_id": meta.get("capture_id"),
            "event_count": len(rows), "observed_seconds": end_ms / 1000,
            "hook_health": hooks,
        },
        "reference_kit": _load_reference_kit(meta),
        "coverage_warnings": warnings,
        "roster": roster,
        "metrics": {
            "calculator_damage": sumfield(outgoing, "out"),
            "incoming_calculator_damage": sumfield(incoming, "out"),
            "damage_events": len(outgoing),
            "team_damage_share": sumfield(outgoing, "out") / max(1.0, sumfield(team_damage, "out")),
            "energy_gained": sumfield(energy, "gained"),
            "energy_spent": sumfield(energy, "spent"),
            "deaths": len(deaths),
        },
        "skills": by_skill,
        "casts": casts,
        "timeline": _significant_timeline(rows, targets, str(camp)),
        "findings": findings,
        "benefits": benefits,
        "damage_by_target": {
            target: sumfield((row for row in outgoing if entity(row, "dst") == target), "out")
            for target in sorted({entity(row, "dst") for row in outgoing})
        },
        "hero_adapter": adapter,
    }


def _cell(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def _format_time(value: Any) -> str:
    result = number(value)
    return "—" if result is None else f"{result:.3f}"


def render_markdown(result: dict[str, Any]) -> str:
    capture = result["capture"]
    metrics = result["metrics"]
    context = result.get("context") or {}
    lines = [
        f"# {result['hero']} — combat evidence report", "",
        f"Observed **{capture['observed_seconds']:.3f}s** and **{capture['event_count']} events**. ",
        f"Selected instance(s): `{', '.join(result['target_instances']) or 'unresolved'}`.", "",
        f"Mode/stage: **{_cell(context.get('stage') or context.get('mode') or 'unspecified')}**. "
        f"Recorded result: **{_cell(context.get('result') or 'unknown')}**. "
        f"Variant/repeat: **{_cell(context.get('variant') or 'single')} / {_cell(context.get('repeat') or 1)}**.", "",
        "## Evidence quality", "",
        f"- Ready hook: **{capture['hook_health']['ready']}**",
        f"- Damage hook: **{_cell(capture['hook_health']['damage_hook'])}**",
        f"- Lineup events: **{capture['hook_health']['lineup']}**",
        f"- Skill events: **{capture['hook_health']['skill_events']}**",
    ]
    lines += [f"- Warning: {warning}" for warning in result["coverage_warnings"]]
    lines += ["", "## What happened", "", "| Measure | Observed |", "|---|---:|",
              f"| Calculator damage | {metrics['calculator_damage']:,.0f} |",
              f"| Team damage share | {metrics['team_damage_share']:.2%} |",
              f"| Incoming calculator damage | {metrics['incoming_calculator_damage']:,.0f} |",
              f"| Energy gained / spent | {metrics['energy_gained']:,.0f} / {metrics['energy_spent']:,.0f} |",
              f"| Explicit death events | {metrics['deaths']} |", "",
              "### Skill cadence", "", "| Skill | Starts | Completion callbacks | Hits | Damage | Targets |",
              "|---|---:|---:|---:|---:|---:|"]
    for skill in result["skills"]:
        lines.append(
            f"| `{_cell(skill['skill'])}` | {skill['starts']} | {skill['completed_callbacks']} | "
            f"{skill['hit_events']} | {skill['calculator_damage']:,.0f} | {len(skill['targets'])} |"
        )
    if not result["skills"]:
        lines.append("| — | 0 | 0 | 0 | 0 | 0 |")

    lines += ["", "## What did not happen, and why?", ""]
    if result["findings"]:
        lines += ["| Observation | Best-supported explanation | Confidence |", "|---|---|---|"]
        for finding in result["findings"]:
            lines.append(f"| {_cell(finding['finding'])} | {_cell(finding['reason'])} | `{finding['confidence']}` |")
    else:
        lines.append("No generic missing-action rule fired. This is not proof that every mechanic executed correctly.")
    expectations = (result.get("context") or {}).get("expectations") or []
    if expectations:
        lines += ["", "### Operator-supplied questions", ""]
        lines += [f"- {_cell(expectation)}" for expectation in expectations]
        lines += ["", "These questions describe test intent. They are not marked passed unless a finding or mechanic table supplies direct evidence."]

    lines += ["", "## What the hero gave teammates", "",
              "| Teammate | Effective healing | Buff applications | Buff IDs | First event (s) | Confidence |",
              "|---|---:|---:|---|---:|---|"]
    for item in result["benefits"]["given"]:
        lines.append(f"| {_cell(item['hero'])} (`{_cell(item['peer'])}`) | {item['effective_healing']:,.0f} | {item['buff_applications']} | {_cell(item['buff_ids'])} | {item['first_seconds']:.3f} | `{item['confidence']}` |")
    if not result["benefits"]["given"]:
        lines.append("| No attributable support event observed | 0 | 0 | — | — | `unknown` |")

    lines += ["", "## What teammates gave the hero", "",
              "| Teammate | Effective healing | Buff applications | Buff IDs | First event (s) | Confidence |",
              "|---|---:|---:|---|---:|---|"]
    for item in result["benefits"]["received"]:
        lines.append(f"| {_cell(item['hero'])} (`{_cell(item['peer'])}`) | {item['effective_healing']:,.0f} | {item['buff_applications']} | {_cell(item['buff_ids'])} | {item['first_seconds']:.3f} | `{item['confidence']}` |")
    if not result["benefits"]["received"]:
        lines.append("| No attributable support event observed | 0 | 0 | — | — | `unknown` |")

    lines += ["", "## Pressure the hero applied to enemies", "",
              "| Enemy | Calculator damage | Damage events | Effect applications | Effect IDs | Confidence |",
              "|---|---:|---:|---:|---|---|"]
    for item in result["benefits"]["enemy_pressure"]:
        lines.append(f"| {_cell(item['hero'])} (`{_cell(item['peer'])}`) | {item['calculator_damage']:,.0f} | {item['damage_events']} | {item['effect_applications']} | {_cell(item['effect_ids'])} | `{item['confidence']}` |")
    if not result["benefits"]["enemy_pressure"]:
        lines.append("| No attributable enemy pressure observed | 0 | 0 | 0 | — | `unknown` |")

    lines += ["", "### Allied Energy-spending opportunity", "",
              "These are observed spends, not automatically proven hero-resource gains.", "",
              "| Ally | Energy spent | Spend events | First spend (s) |", "|---|---:|---:|---:|"]
    for item in result["benefits"]["allied_energy_spending"]:
        lines.append(f"| {_cell(item['hero'])} (`{_cell(item['peer'])}`) | {item['energy_spent']:,.0f} | {item['events']} | {item['first_seconds']:.3f} |")
    if not result["benefits"]["allied_energy_spending"]:
        lines.append("| No allied Energy spend captured | 0 | 0 | — |")

    adapter = result.get("hero_adapter")
    if adapter and adapter.get("adapter") == "zaojun":
        lines += ["", "## Zaojun mechanic audit", "", "### Bond lifecycle", "",
                  "| Recipient | Applied (s) | Recipient death (s) | Replacement observed | Confidence |",
                  "|---|---:|---:|---|---|"]
        for item in adapter["bond_lifecycle"]:
            lines.append(f"| {_cell(item['hero'])} (`{_cell(item['recipient'])}`) | {_format_time(item['applied_seconds'])} | {_format_time(item['recipient_death_seconds'])} | {item['replacement_observed']} | `{item['confidence']}` |")
        if not adapter["bond_lifecycle"]:
            lines.append("| No known bond application captured | — | — | — | `unknown` |")
        delayed = adapter["delayed_damage"]
        lines += ["", f"Delayed/unattributed damage: **{delayed['events']} events**, **{delayed['calculator_output']:,.0f}** calculator output.", "",
                  f"Resource-state coverage: **{adapter['resource_state']['status']}** — {adapter['resource_state']['reason']}", "",
                  f"Food Offering formula: **{adapter['food_offering_formula']['status']}** — {adapter['food_offering_formula']['reason']}"]
        formula_events = adapter["food_offering_formula"].get("events", [])
        if formula_events:
            lines += ["", "| Time (s) | Method | Attacker ATK / max HP | Victim ATK / max HP | Constructed damage |",
                      "|---:|---|---:|---:|---:|"]
            for event in formula_events:
                lines.append(f"| {event['seconds']:.3f} | `{_cell(event['method'])}` | {_cell(event['killer_atk'])} / {_cell(event['killer_max_hp'])} | {_cell(event['victim_atk'])} / {_cell(event['victim_max_hp'])} | {_cell(event['constructed_damage'])} |")
        resource_samples = adapter["resource_state"].get("samples", [])
        lines += ["", "### Stored-resource state changes", "",
                  "Displayed values convert the engine's 1,024 fixed-point scale. Raw values remain in HERO_ANALYSIS.json.", "",
                  "| Time (s) | Stored | Committed to active cast | Maximum |", "|---:|---:|---:|---:|"]
        for sample in resource_samples:
            lines.append(f"| {sample['seconds']:.3f} | {_cell(sample['stored_display'])} | {_cell(sample['committed_display'])} | {_cell(sample['maximum_display'])} |")
        if not resource_samples:
            lines.append("| — | No resource state captured | — | — |")
        passive_samples = adapter["passive_state"].get("samples", [])
        lines += ["", "### Passive cadence state changes", "",
                  "| Time (s) | ATK stacks | Stack cap | Interval (s) | Energy/tick |", "|---:|---:|---:|---:|---:|"]
        for sample in passive_samples:
            lines.append(f"| {sample['seconds']:.3f} | {_cell(sample['atk_stacks'])} | {_cell(sample['max_atk_stacks'])} | {_cell(sample['interval_seconds'])} | {_cell(sample['energy_per_tick_display'])} |")
        if not passive_samples:
            lines.append("| — | No passive state captured | — | — | — |")
        lines += ["", "### Runtime target selections", "",
                  "| Time (s) | Feature | Target count | Targets |", "|---:|---|---:|---|"]
        for selection in adapter["target_selections"]:
            lines.append(f"| {selection['seconds']:.3f} | `{_cell(selection['feature'])}` | {selection['target_count']} | {_cell(selection['targets'])} |")
        if not adapter["target_selections"]:
            lines.append("| — | No target selection captured | 0 | — |")
        lines += ["", "### Ultimate cycles", "",
                  "| Start (s) | End (s) | Stored | Committed | Selected targets | Hit events | Damage | Confidence |",
                  "|---:|---:|---:|---:|---:|---:|---:|---|"]
        for cycle in adapter["ultimate_cycles"]:
            lines.append(f"| {cycle['start_seconds']:.3f} | {_format_time(cycle['end_seconds'])} | {_cell(cycle['stored_at_start'])} | {_cell(cycle['committed_at_start'])} | {_cell(cycle['selected_target_count'])} | {cycle['hit_events']} | {cycle['calculator_damage']:,.0f} | `{cycle['confidence']}` |")
        if not adapter["ultimate_cycles"]:
            lines.append("| No Ultimate cycle captured | — | — | — | — | 0 | 0 | `unknown` |")

    timeline_highlights = [
        item for item in result["timeline"]
        if item["kind"] != "ENERGY_CHANGE"
        or item["spent"] > 0
        or abs(item["gained"]) >= 100_000
        or str(item["skill"]) == "ultimate_clear"
    ]
    lines += ["", "## Significant timeline", "",
              "The JSON report retains the complete target-relevant timeline. This readable view suppresses small periodic Energy ticks and is capped at 250 events.", "",
              "| Time (s) | Event | Actor | Recipient | Skill/context | Value | State |",
              "|---:|---|---|---|---|---:|---|"]
    for item in timeline_highlights[:250]:
        lines.append(f"| {item['seconds']:.3f} | {_cell(item['kind'])} | {_cell(item['actor'])} | {_cell(item['recipient'])} | `{_cell(item['skill'])}` | {_cell(item['value'])} | `{_cell(item['state'])}` |")
    if not timeline_highlights:
        lines.append("| — | No significant event captured | — | — | — | — | — |")

    lines += ["", "## Interpretation contract", "",
              "- `observed`: the named event/value is present in the capture.",
              "- `strong_inference`: adjacent events support the explanation, but the engine did not state the cause.",
              "- `observed_opportunity`: an enabling action occurred; conversion into the target mechanic is not directly captured.",
              "- `unknown` or `censored`: the recording cannot answer the question.",
              "- Compare repeated, identical encounters before claiming that a partner or build caused a performance change.", ""]
    return "\n".join(lines)


def save_report(outdir: str | Path, result: dict[str, Any]) -> None:
    folder = Path(outdir)
    folder.mkdir(parents=True, exist_ok=True)
    outputs = {
        "HERO_ANALYSIS.json": json.dumps(result, ensure_ascii=False, indent=2),
        "HERO_GUIDE.md": render_markdown(result),
    }
    for name, content in outputs.items():
        temporary = folder / f"{name}.tmp"
        temporary.write_text(content + ("\n" if not content.endswith("\n") else ""), encoding="utf-8")
        temporary.replace(folder / name)


def _load_capture(folder: str | Path) -> tuple[dict[str, Any], list[dict[str, Any]], int]:
    path = Path(folder)
    meta = json.loads((path / "capture_manifest.json").read_text(encoding="utf-8"))
    rows = []
    malformed = 0
    for line in (path / "events.jsonl").read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            malformed += 1
    return meta, rows, malformed


def rebuild(folder: str | Path, output: str | Path | None = None, camp: str = "1", config_root: Any = None, hero_repo: Any = None) -> dict[str, Any]:
    meta, rows, malformed = _load_capture(folder)
    if hero_repo:
        meta["hero_repo"] = str(hero_repo)
    result = analyze(meta, rows, camp, config_root)
    if malformed:
        result["coverage_warnings"].append(f"{malformed} malformed or partial JSONL records were skipped.")
    save_report(output or folder, result)
    return result


def compare(folders: Iterable[str | Path], output: str | Path, camp: str = "1", config_root: Any = None, hero_repo: Any = None) -> list[dict[str, Any]]:
    destination = Path(output)
    destination.mkdir(parents=True, exist_ok=True)
    results = []
    paths = [Path(folder) for folder in folders]
    for folder in paths:
        results.append(rebuild(folder, destination / folder.name, camp, config_root, hero_repo))
    lines = ["# Controlled hero capture comparison", "",
             "Differences are descriptive unless manifests confirm identical stage, opponents, formation, investment, and controls.", "",
             "| Capture | Variant | Repeat | Mode/stage | Result | Seconds | Damage | Team share | Skill starts | Deaths |",
             "|---|---|---:|---|---|---:|---:|---:|---:|---:|"]
    for path, result in zip(paths, results):
        context = result.get("context") or {}
        lines.append(
            f"| {path.name} | {_cell(context.get('variant', 'single'))} | {_cell(context.get('repeat', 1))} | "
            f"{_cell(context.get('stage') or context.get('mode') or 'unspecified')} | {_cell(context.get('result') or 'unknown')} | {result['capture']['observed_seconds']:.3f} | "
            f"{result['metrics']['calculator_damage']:,.0f} | {result['metrics']['team_damage_share']:.2%} | "
            f"{sum(item['starts'] for item in result['skills'])} | {result['metrics']['deaths']} |"
        )
    contexts = [result.get("context") or {} for result in results]
    controlled_fields = ("stage", "mode", "opponent", "lineup", "formation", "investment", "automation", "client_build")
    declared_varying = set().union(*(set(context.get("varied_fields") or []) for context in contexts))
    differences = [field for field in controlled_fields if len({json.dumps(context.get(field), sort_keys=True) for context in contexts}) > 1]
    uncontrolled_differences = [field for field in differences if field not in declared_varying]
    missing = [field for field in controlled_fields if field not in declared_varying and all(context.get(field) in (None, "", "unknown", "unspecified") for context in contexts)]
    lines += ["", "## Comparability", ""]
    lines.append("Declared variable fields: " + (", ".join(f"`{field}`" for field in sorted(declared_varying)) or "none") + ".")
    if missing:
        lines.append("Control metadata is insufficient for: " + ", ".join(f"`{field}`" for field in missing) + ". Treat differences as descriptive.")
    elif uncontrolled_differences:
        lines.append("Not controlled: " + ", ".join(f"`{field}`" for field in uncontrolled_differences) + ". Treat differences as descriptive.")
    else:
        lines.append("Recorded control fields match. Unrecorded investment, RNG, or settlement differences may still remain.")
    (destination / "COMPARISON.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return results
