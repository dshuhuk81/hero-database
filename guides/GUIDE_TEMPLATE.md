# Hero Guide Template

Use this as the structural reference for every new guide written in `guides.astro`.

---

## Design Principle

Scan-first. A player should be able to decide within 10 seconds whether to pull and use this hero.
Every section exists to answer exactly one decision. If a section does not help a player decide
something actionable, cut it.

---

## Section Order

### 1. HEADER (keep - auto-rendered)
- hero-portrait, char-name, hero-quote, faction/class/rarity tags
- No changes needed per hero - just fill the fields.

### 2. VERDICT STRIP
CSS class: `.verdict-strip`
Max length: 2 sentences.
Content rules:
- Line 1 (`.verdict-role`): Role archetype in 2-4 words. E.g. "Zone-Control Support" / "Burst Carry" / "Revive Anchor"
- Line 2 (`.verdict-line`): Core loop in one sentence. What the hero DOES mechanically in the simplest form.
- `.verdict-meta` pills: 3 pills only. "Best in:", "Skip if:", "Key investment:"
- NO paragraphs. NO theory. NO lore.

### 3. PLAY / SKIP
CSS class: `.sw-grid` with `.sw-card.strengths` and `.sw-card.weaknesses`
Title override: "Use [Hero] when" / "Skip [Hero] when"
Rules:
- Exactly 4 bullets per column. No more.
- Each bullet is a CONDITION, not a feature description.
- Wrong: "Has strong burst damage"
- Correct: "Enemy team has one primary carry you need to lock down"

### 4. HOW IT WORKS
CSS class: `.mechanic-box`
Rules:
- Bullet list only. No prose paragraphs.
- Max 5 bullets.
- Each bullet: one mechanic, one sentence.
- Focus on the LOOP: trigger -> effect -> scale -> payoff
- For heroes with a ramp mechanic: include the ramp in one bullet, the payoff in another.

### 5. SKILLS
CSS class: `.skills-grid` with `.skill-card`
Rules:
- Keep upgrade blocks (Lv2/Lv3/Lv4) - players need them.
- Remove the long `.skill-note` blocks entirely. Replace with NOTHING or one short italicized line max.
- Highlight key words with `<span class="highlight">`.
- If a skill upgrade is "the investment breakpoint", call it out in the upgrade row directly.

### 6. INVESTMENT ORDER
CSS class: `.mechanic-box` with `<ol>` numbered list
Rules:
- Numbered list in exact order of priority.
- Max 5 items.
- Each item: investment name + one-sentence reason why it is this high.
- Start with the Relic level if relevant.
- Do NOT say "recommended" - say the exact level (e.g. "Relic Lv3").

### 7. RATINGS
CSS class: `.rating-grid` with `.rating-card`
Rules:
- Include all relevant modes: PVE, Boss, PVP, and any mode-specific ratings.
- `.rating-desc` max 15 words. One sentence fragment only.
- Ratings: SSS / SS / S / A+ / A / B / C

### 8. COMPS
CSS class: `.comp-list` with `{HERONAME_COMPS}` data
Rules:
- Keep existing comp-entry format (label + reason + hero row + notes).
- Reason max 2 sentences.
- Notes: max 3 bullets, each max 20 words.
- Comp labels: "Mode - Archetype Name" format. E.g. "PVE - Fusion Power Core"

### 9. KEY SYNERGIES
CSS class: `.synergy-list` with `.synergy-entry`
Rules:
- Hero name + ONE sentence only.
- Max 6 entries.
- Sentence must answer: "Why does this specific hero + this specific hero = more than the sum of parts?"
- No generic phrases like "provides good support" or "deals damage alongside".

---

## Sections Removed vs Old Format

| Old Section | Status | Reason |
|---|---|---|
| Lore / Background | REMOVED | Player-facing guides need decisions, not mythology |
| Jump Navigation | REMOVED | Fewer sections = no navigation needed |
| Print bar | REMOVED | Minimal value, visual noise |
| Positioning (standalone) | MERGED | 1 bullet in How It Works covers it |
| Playstyle Summary | REMOVED | Verdict + Play/Skip covers it |
| Faction Synergy (standalone) | MERGED | 1 bullet in How It Works or a synergy entry |

---

## HTML Skeleton

```html
<!-- ═══════════════════════════════════════
     HERONAME GUIDE
     ═══════════════════════════════════════ -->
{releasedGuides.some(g => g.id === "heroname") && (
<div class="guide-slide" id="heroname">
  <div class="guide-container">

    <!-- HEADER -->
    <header class="hero-header">
      <div class="epithet">Motto Immortal - Hero Guide</div>
      <img class="hero-portrait" src="..." alt="..." loading="lazy" />
      <h1 class="char-name">Hero Name</h1>
      <p class="hero-quote">Quote here.</p>
      <div class="tags">
        <span class="tag tag-faction">Faction Name</span>
        <span class="tag tag-class">Class</span>
        <span class="tag tag-rarity">Rarity</span>
      </div>
    </header>

    <!-- VERDICT -->
    <section class="section">
      <div class="verdict-strip">
        <div class="verdict-role">Role Archetype Here</div>
        <p class="verdict-line">Core loop in one sentence.</p>
        <div class="verdict-meta">
          <span class="verdict-meta-item"><strong>Best in:</strong> Mode / Scenario</span>
          <span class="verdict-meta-item"><strong>Skip if:</strong> Condition</span>
          <span class="verdict-meta-item"><strong>Key investment:</strong> What to prioritize</span>
        </div>
      </div>
    </section>

    <!-- PLAY / SKIP -->
    <section class="section">
      <div class="sw-grid">
        <div class="sw-card strengths">
          <div class="sw-title">Use [Hero] when</div>
          <ul class="sw-list">
            <li>Condition 1</li>
            <li>Condition 2</li>
            <li>Condition 3</li>
            <li>Condition 4</li>
          </ul>
        </div>
        <div class="sw-card weaknesses">
          <div class="sw-title">Skip [Hero] when</div>
          <ul class="sw-list">
            <li>Condition 1</li>
            <li>Condition 2</li>
            <li>Condition 3</li>
            <li>Condition 4</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="section">
      <div class="section-title">How It Works</div>
      <div class="mechanic-box">
        <div class="mechanic-label">Core Mechanic Name</div>
        <ul class="mechanic-list">
          <li>Mechanic 1</li>
          <li>Mechanic 2</li>
          <li>Mechanic 3</li>
          <li>Mechanic 4</li>
          <li>Mechanic 5</li>
        </ul>
      </div>
    </section>

    <!-- SKILLS -->
    <section class="section">
      <div class="section-title">Skills</div>
      <div class="skills-grid">
        <!-- skill-card entries here, no skill-note blocks -->
      </div>
    </section>

    <!-- INVESTMENT ORDER -->
    <section class="section">
      <div class="section-title">Investment Order</div>
      <div class="mechanic-box">
        <div class="mechanic-label">Do this in order</div>
        <ol class="mechanic-list" style="list-style:decimal; padding-left:20px;">
          <li><strong>Priority 1</strong> - reason why.</li>
          <li><strong>Priority 2</strong> - reason why.</li>
          <li><strong>Priority 3</strong> - reason why.</li>
        </ol>
      </div>
    </section>

    <!-- RATINGS -->
    <section class="section">
      <div class="section-title">Ratings</div>
      <div class="rating-grid">
        <div class="rating-card">
          <div class="rating-mode">Mode Name</div>
          <div class="rating-cell"><span class="rating-badge rating-s">S</span></div>
          <div class="rating-desc">One sentence fragment max 15 words.</div>
        </div>
      </div>
    </section>

    <!-- COMPS -->
    <section class="section">
      <div class="section-title">Suggested Comps</div>
      <div class="comp-list">
        {HERONAME_COMPS.map(comp => (
          <div class="comp-entry">
            <div class="comp-entry-header">
              <span class="comp-label">{comp.label}</span>
              <p class="comp-reason">{comp.reason}</p>
            </div>
            <div class="comp-hero-row">
              {comp.heroes.map(id => (
                <a href={`/heroes/${id}`} class="hero-chip">
                  <img src={heroImage(id)} alt={heroName(id)} loading="lazy" />
                  <span class="hero-chip-name">{heroName(id)}</span>
                </a>
              ))}
            </div>
            {comp.notes?.length > 0 && (
              <ul class="comp-notes">
                {comp.notes.map(n => <li>{n}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>

    <!-- KEY SYNERGIES -->
    <section class="section">
      <div class="section-title">Key Synergies</div>
      <div class="synergy-list">
        <div class="synergy-entry">
          <div class="synergy-hero-name">Hero Name</div>
          <p class="synergy-body">One sentence: why this pairing creates more than either alone.</p>
        </div>
      </div>
    </section>

  </div>
</div>
)}
```
