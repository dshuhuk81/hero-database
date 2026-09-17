version: 2
events:
  - id: 2
    type: command
    name: command
    label: /bin/zsh -lc "sed -n '1,260p' src/pages/tips.astro"
    time: 2026-09-17T13:17:27.621Z
  - id: 4
    type: command
    name: command
    label: /bin/zsh -lc "sed -n '1,300p' src/styles/tips.css && nl -ba src/pages/tips.astro | sed -n '1,280p'"
    time: 2026-09-17T13:17:37.719Z
  - id: 5
    type: command
    name: command
    label: /bin/zsh -lc "rg --files src/pages | rg 'wishlist|wishlisht' && rg -n \"const copy|const checklist|const roles|const doItems|const problems|tips-section.*id=|wishlisht\" src/pages/tips.astro"
    time: 2026-09-17T13:17:50.554Z
  - id: 7
    type: command
    name: command
    label: /bin/zsh -lc "sed -n '1,260p' data/CAMPAIGN_ODYSSEY_UNLOCK_OVERVIEW.md && sed -n '1,220p' package.json && rg -n \"Odyssey|Wishlist|Zodiac|Mindsea|Resonating Altar|Torment Rift|relic\" data/CAMPAIGN_O…
    time: 2026-09-17T13:21:55.181Z
  - id: 8
    type: command
    name: command
    label: /bin/zsh -lc 'rg -n -i "Torment Rift|Torment|Destined Zodiac|Zodiac|Mindsea|Resonating Altar|hero_echo|god_trial|weekly_activities" src data public | head -300'
    time: 2026-09-17T13:22:02.074Z
  - id: 9
    type: command
    name: command
    label: /bin/zsh -lc "sed -n '215,280p' src/components/tips/TipsEarly.astro && rg -n -i \"wishlist|Torment Rift|Zodiac\" src/components/tips/TipsEarly.astro | head -80"
    time: 2026-09-17T13:22:06.654Z
  - id: 11
    type: files
    name: files
    label: 'File changes · /Users/daschultheiss/hero-database/src/pages/tips.astro @@ -30,3 +30,3 @@ pullRuleTitle: { en: "Use what you pull", de: "Spiele mit dem, was du ziehst" }, - pullRuleBody: { en: "Meta h…'
    time: 2026-09-17T13:22:56.455Z
  - id: 12
    type: files
    name: files
    label: File changes · /Users/daschultheiss/hero-database/src/pages/tips.astro @@ -124,3 +124,3 @@ - <nav class="tips-anchor-nav" aria-label={pick(copy.rulesLabel)}><div class="tips-anchor-nav-inner"><a href…
    time: 2026-09-17T13:23:13.476Z
  - id: 13
    type: command
    name: command
    label: /bin/zsh -lc 'git diff --check && git diff -- src/pages/tips.astro && npm run build'
    time: 2026-09-17T13:23:18.113Z
  - id: 14
    type: command
    name: command
    label: /bin/zsh -lc "git status --short && nl -ba src/pages/tips.astro | sed -n '24,90p;112,165p'"
    time: 2026-09-17T13:23:30.240Z
  - id: 15
    type: command
    name: command
    label: /bin/zsh -lc "rg -n -m 20 'OpenConditionName_20006|Torment Rift' /Users/daschultheiss/android/game_extracted/region_7584e4b000/client /Users/daschultheiss/android/live_device_data 2>/dev/null"
    time: 2026-09-17T13:23:41.133Z
