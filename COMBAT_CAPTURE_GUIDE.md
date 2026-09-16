# Hero Combat Capture

`hero_combat_capture.py` records engine events from a live Motto Immortal fight. `combat_analysis.py` converts the raw events into an evidence report focused on combat flow, missing actions, and two-way hero relationships.

## Outputs

Each capture creates `fights/<hero>_<timestamp>/` containing:

- `capture_manifest.json`: test conditions and capture identity
- `events.jsonl`: immutable raw event evidence
- `HERO_ANALYSIS.json`: complete structured analysis and timeline
- `HERO_GUIDE.md`: readable guide-oriented analysis
- `EXPERIMENT_COMPARISON.md`: generated after the second run of a named experiment
- `ANALYSIS_ERROR.txt`: only present when analysis failed; raw events remain usable

The report labels direct observations separately from strong inference, observed opportunity, unknown evidence, and censored observations.

## Before a fight

Start the game and navigate to the formation or pre-battle screen. Run the capture command and wait for:

```text
READY TO WATCH FIGHT — start battle now.
```

Start only one fight. Stop with `q` + Enter or Ctrl-C after the result screen appears.

## Single capture

```bash
python3 hero_combat_capture.py zaojun \
  --mode pve \
  --stage "Tower 123" \
  --opponent "enemy formation fingerprint" \
  --lineup "Tank,Zaojun,Support A,Support B,Utility" \
  --formation "slot and position notes" \
  --investment "Zaojun D5/R4; team preset A" \
  --automation auto \
  --result victory \
  --client-build "version/build" \
  --expect "Which ally contributes the most stored resource?" \
  --expect "Does the bond move after its recipient dies?"
```

`--runtime-root` defaults to an automatically detected sibling `android` workspace when the extraction folders are not in this repository. Set `MOTTO_CAPTURE_RUNTIME_ROOT` or pass `--runtime-root` to override it.

## Controlled experiments

Variant names are arbitrary. Use the same experiment name and change only the intended condition.

```bash
python3 hero_combat_capture.py zaojun \
  --package com.tencent.tmgp.seayoo.zero
  --experiment zaojun-target-count 
  --variant single-target --repeat 1 \
  --vary stage 
  --vary opponent \
  --mode pve 
  --stage "Mindsea Boss" 
  --opponent "Demonic Horse" \
  --lineup "same lineup" 
  --formation "same formation" 
  --automation auto

python3 hero_combat_capture.py zaojun \
  --package com.tencent.tmgp.seayoo.zero
  --experiment zaojun-target-count 
  --variant five-target --repeat 1 \
  --vary stage 
  --vary opponent \
  --mode pve 
  --stage "Wave X" 
  --opponent "Wave X" \
  --lineup "same lineup" 
  --formation "same formation" 
  --automation auto
```

Use `--vary` to declare the manifest field intentionally changed by the experiment. Use at least three repeats per variant when RNG or target movement can materially change the result. A comparison is causal only when every field except the declared variable is controlled. The report calls out missing or unintended differences.

Useful Zaojun experiments include:

- `zaojun-target-count`: single target versus five targets
- `zaojun-spacing`: grouped versus separated enemies
- `zaojun-pve-controlled`: repeat the same PvE encounter with an identical Zaojun team, formation, investment, automation setting, and opponent; compare survival, first-Ultimate timing, completed Ultimates, resource committed per Ultimate, damage, healing, and target coverage
- `zaojun-pvp-burst-control`: repeat a controlled PvP matchup against early burst and control; record whether Zaojun reaches full Energy, begins and completes her Ultimate, survives the opening, and receives enough direct support for a follow-up cast
- `zaojun-bond-death`: bond recipient survives versus dies early
- `zaojun-control`: same opponent without versus with an early control window; distinguish whether control cancels the Ultimate, pauses its execution, delays its start, prevents remaining projectiles, or allows already-launched projectiles to land
- `zaojun-cooldown`: identical setup with controlled Haste/Cooldown differences
- `zaojun-food-formula`: vary only the candidate max-HP owner

## Rebuild or compare old captures

```bash
python3 hero_combat_capture.py --analyze fights/zaojun_YYYYMMDD_HHMMSS

python3 hero_combat_capture.py \
  --compare fights/run_one fights/run_two fights/run_three \
  --out fights/zaojun_comparison
```

## Evidence limits

- Calculator output is not settlement damage or effective HP loss.
- A skill-end callback does not prove every projectile or delayed effect landed.
- Missing events are unknown unless an explicit expected-event rule applies.
- Buff application does not prove full uptime or quantify prevented damage.
- Allied Energy spending is an observed opportunity; mechanic-state evidence is needed to prove conversion.
- New captures record attacker and victim ATK/max-HP candidates around Zaojun's Food Offering feature. Formula ownership still requires matching those operands to constructed damage or a controlled stat-isolation test.
- Partner recommendations require repeated controlled recordings plus verified skill implementation; one strong fight is not proof of a best team.
