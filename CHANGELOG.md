# Last Light — Changelog

Format: `major.significant.minor` (e.g. `v2.4.6`).

- **Major** — structural overhauls (e.g. the navigation shell rewrite).
- **Significant** — a new region, class, mission type, or economy system.
- **Minor** — balance tuning, bug fixes, UI polish.

Every entry should update the version in all three places it appears in the
POC file: the `<title>` tag, the HTML comment block beneath it, and the
in-game header line. Cross-reference `Last_Light___Design_Decision_Context`
and its `_ADDENDUM` for the *why* behind anything listed tersely here — this
file is the *what and when*, not the rationale.

---

## [Unreleased]

_Nothing staged yet._

---

## [v2.0.29] — Terrain Fix: Swamp Obstacle Trominoes

### Changed — Minor
- Swamp obstacle clusters (bramble/gnarled-tree) previously used
  `placeCluster()`, a free 8-directional random walk shared with
  mountain's rock/high-ground groups — no shape constraint, so a run of
  consecutive same-direction steps could (and did) produce a straight
  line.
- Added `placeLTromino()`: places exactly 3 tiles as 3-of-4 corners of a
  2x2 block, one corner omitted at random — reads as L/7/J/mirrored-7
  depending on which corner is skipped, and can never be a straight line
  by construction (only 4 possible shapes, all L-variants).
- Scoped to swamp's obstacle clusters specifically — not the bog/
  difficult-terrain clusters (different existing size range, 3-5 not 3)
  and not mountain's `placeCluster` usage, neither of which were part of
  the request.

### Verified
- 200/200 trials placed exactly 3 tiles, 0 straight lines.
- Sample shapes confirmed as valid L-tromino rotations.
- Swamp mission generation confirmed to still build without error
  (30/30).
- Full combat sanity sweep shows no regressions (terrain-layout-only
  change, doesn't touch combat resolution).

### Known Issues (carried into [Unreleased])
- T3 difficulty trough confirmed real and consistent across Defense/
  Bosshunt/Purge/Relic/Stalk (leveled-squad testing) — not yet
  investigated further.
- Leveled-squad vs. fresh-recruit discrepancy for Explore not yet
  investigated.
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- HP-color-border and Battle Key strip remain battle-screen only.

---

## [v2.0.28] — Explore AI Gap Fixed + Reward Recalibrated

Found via a full leveled-squad balance test across all 6 core types
(requested to check "difficulty seems high on some mission types").

### Fixed
- **Explore's general-case AI** only ever pathed toward objectives once
  *all* enemies were dead — but Explore has continuous wave spawning, so
  enemy count essentially never hit zero. The squad never even attempted
  its actual win condition (claim 2 objectives) regardless of strength.
  Confirmed via trace: 0/2 objectives claimed after 15 rounds with a
  properly leveled squad.
- Added a dedicated objective-seeking AI branch to `harness.js` (mirrors
  Cleanse's proven one-holder-per-point pattern). **Game code itself is
  untouched** — this is testing-harness-only, same category as the
  earlier `agoratoll` fix.

### Changed — Minor
- `REWARD_MULTIPLIER.explore`: `1.26 → 1.00` (floor-clamped). Re-measured
  with the same fresh-recruit methodology the whole table is built on:
  Defense re-anchored at 77.5%, Explore now 94.0% avg — solidly easier
  than Defense again. The old 1.26 was compensating for what turns out to
  have been an AI-testing artifact, not real mission difficulty.

### Investigated, not shipped
- A wave-cadence/cap tune was tried to bring a separate leveled-squad
  reading back toward sibling range. Found no combination produced a
  graduated effect — fights resolve too decisively either way (~53% avg
  fully uncapped vs. ~97-99% with *any* dampening tried). Reverted rather
  than ship a change that didn't actually solve the problem.

### Flagged for future investigation
- Leveled-squad testing and fresh-recruit testing give sharply different
  readings for Explore specifically (53% vs. 94% avg under otherwise
  identical AI/wave conditions) — worth its own dedicated look sometime,
  but out of scope for this pass. Fresh-recruit is what the
  `REWARD_MULTIPLIER` table has always been built on, so that's the
  number trusted for this recalibration.

### Verified
- Full combat sanity sweep shows Explore consistently strong post-fix, no
  regressions elsewhere.

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- HP-color-border and Battle Key strip remain battle-screen only.
- Leveled-squad vs. fresh-recruit discrepancy for Explore, noted above,
  not yet investigated.

---

## [v2.0.27] — Deploy Screen Labels + Initiative Strip Fix

Two playtest fixes, both closing gaps flagged since v2.0.13.

### Fixed
- **Deploy screen** previously showed players by bare weapon glyph
  only — the same gap the battle screen had before v2.0.13's
  `assignPlayerLabel()` fix, just never extended to Deploy. Recomputed
  fresh each `renderDeploy()` call (idempotent, cheap, squad composition
  doesn't change mid-deployment) rather than persisted, since Deploy has
  no single entry-point function like `beginBattle()` to compute it once.
- **Initiative strip bug**: enemy names already embed their number at
  spawn time (e.g. "Husk 1"), but the strip's `uu.name.split(' ')[0]`
  took only the first word, silently dropping the number for every
  enemy — two Husks in the same fight showed as identical "Husk" tokens
  with no way to tell them apart. Fixed to show the full name for
  enemies while keeping the existing first-word-only behavior for
  players (their names are always clean single tokens — nicknames are a
  separate field, never merged into `.name` — so no change needed there).

### Verified
- Deploy screen duplicate-weapon labeling confirmed sequential (S1, S2).
- Init strip confirmed to show "Husk 1" in full for enemies while player
  names stay unchanged.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- HP-color-border is still battle-screen only — Deploy doesn't have it
  (Deploy now has duplicate-numbering, matching battle, but not the
  HP-tier border color).
- Battle Key strip is battle-screen only — the Deploy screen doesn't show
  it.

---

## [v2.0.26] — Expand Barracks: Two-Click Confirm

### Changed — Minor
- Added two-click confirm to `expandBarracks()`, matching the established
  pattern (`fireRecruit`'s Retire, the 4 ordain functions). Single
  boolean flag (`G.confirmExpandBarracks`), not a composite key like
  ordain's — there's only one expand action, no per-recruit variants to
  disambiguate between.
- Gold check happens *before* the confirm arms, so insufficient funds
  never even shows a confirm state.

### Verified
- Two clicks required to commit; gold only deducted on the second click.
- Confirmed the confirm flag never arms at all when gold is insufficient.
- Full combat sanity sweep shows no regressions (UI-only change).

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.
- Battle Key strip is battle-screen only — the Deploy screen doesn't show
  it.

---

## [v2.0.25] — Company Hall Layout: Barracks Above Wait a Day

### Changed — Minor
- Moved the Barracks chip + Expand button from the top of Company Hall
  (previously grouped with the trainer chip) to sit directly above Wait
  a Day at the bottom, on their own flex-`nowrap` row so they reliably
  share one line instead of wrapping on narrow phones.
- Shortened Expand's label ("Expand Barracks (+3 slots, Xg)" → "Expand
  (+3, Xg)") — needed for reliable same-line fitting.
- Trainer chip stays at the top, untouched — not part of this request.

### Verified
- Confirmed final HTML ordering and `white-space:nowrap` on both the
  Barracks chip and Expand button.
- Full combat sanity sweep shows no regressions (UI-only change).

### Note
- Caught and reverted my own overreach mid-edit: initially also gave the
  Expand button `.subtle` styling to visually match Wait a Day, but that
  wasn't asked for and doesn't fit — Expand is a real spending action,
  not a rarely-used one like Wait a Day, so it keeps default button
  weight.

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.
- Battle Key strip is battle-screen only — the Deploy screen doesn't show
  it.

---

## [v2.0.24] — Hover-Only Tooltips Resolved

Investigated each of the ~8 remaining hover-only `title=` tooltips
individually rather than converting them all the same way — they turned
out to be three genuinely different situations.

### Fixed
- **The 4 Ordain buttons** (Darkwarden/Duskhunter/Shadesinger/Nightsworn)
  had **no confirm step at all** — they fired immediately on first click,
  and the hover title was mobile's only warning before an irreversible
  reclass. Added two-click confirm using a composite
  `confirmOrdainKey` (`recruitId-pathName`, not a shared field) — a
  recruit can be simultaneously eligible for multiple ordain paths if
  multiple regions are reclaimed, so a shared single-field confirm would
  have incorrectly armed multiple buttons at once.
- Enemy mutations info on the **Deploy screen's** "Enemies Sighted"
  scouting list converted to `tappableTag()`. Initially deleted this one
  on the assumption it duplicated the battle screen's `expandedUnitId`
  tap-to-expand panel — caught the mistake before shipping: it's a
  completely separate static list on a different screen with no expand
  mechanism of its own, so deleting it would have been a real
  regression, not a redundancy cleanup.

### Changed — Minor
- Retrain's weapon tag converted to `tappableTag()` — genuine content, no
  other access existed.
- Two tooltips were genuinely redundant and just got deleted, no
  replacement needed: the **battle screen's** enemy mutations tooltip
  (already available in the real `expandedUnitId` panel there) and the
  skill-cooldown button's tooltip (the round count is already in the
  button's own visible label text).
- Portrait `title="${key}"` left alone — internal debug key on a Phase-2
  art placeholder, not real player-facing content.

### Verified
- Two-click confirm requires exactly 2 clicks to commit.
- Composite key confirmed to prevent cross-contamination both between
  different ordain paths for the same recruit, and between different
  recruits for the same path.
- `mutationsTooltip()`'s empty-string fallback confirmed for unmutated
  enemies (falls back to plain text, no broken tag).
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.
- Battle Key strip is battle-screen only — the Deploy screen doesn't show
  it.
- All hover-only tooltips from the original backlog are now resolved.

---

## [v2.0.23] — Detailed Terrain Definitions in Help

### Changed — Minor
- Replaced Help's terse "see the Battle Key" terrain pointer with actual
  definitions. The in-battle strip stays short and is unchanged — detail
  belongs on the Help page, per direction.

### Verified
- Grounded in the exact per-setting obstacle data — checked all 5
  `MISSION_SETTINGS` entries directly rather than just the Battle Key's
  abbreviated glyph set. Caught that Dungeon's rubble uses a different
  glyph (▒) than the other settings' rubble (▓), so the Help text
  organizes by mechanic category (Rubble = movement-only; Walls/Rock/
  Gnarled Trees = movement + line-of-sight) rather than by exact glyph,
  since appearance varies slightly by region but the underlying rule
  doesn't.
- Difficult terrain and High Ground numbers reconfirmed against code (1
  extra step, +1 DEF) rather than assumed still correct from the earlier
  terrain-legend work.
- Full combat sanity sweep shows no regressions (text-only change).

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~8 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.
- Battle Key strip is battle-screen only — the Deploy screen doesn't show
  it.

---

## [v2.0.22] — Opportunity Attacks Added to Help

### Changed — Minor
- Added Opportunity Attacks explanation to Help's Move & Attack section.

### Verified
- Verified the exact trigger before writing anything
  (`checkOpportunitySegment`/`opportunityCheck`): fires specifically on
  **disengage** — a unit that starts a move segment adjacent to an enemy
  and ends that segment no longer adjacent gives that enemy a free
  strike. Symmetric (applies to enemies disengaging from the player too,
  not just the reverse). Does **not** trigger from approaching an enemy
  or from moving while staying adjacent — only from breaking adjacency.
  Text written to match that precisely rather than a looser "moving near
  enemies is risky" gloss.
- Full combat sanity sweep shows no regressions (text-only change).

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~8 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.
- Battle Key strip is battle-screen only — the Deploy screen doesn't show
  it.

---

## [v2.0.21] — Item 5: Deploy/Light/Move/Attack Explanation

### Added
- **Battle Basics** section in the Help page fully written, replacing the
  v2.0.18 placeholder: Deployment (tap recruit, tap spawn-zone tile; tap
  an already-placed unit to re-select and move them), Move & Attack (one
  of each per turn, either order), Light Levels (full 4-tier breakdown
  with the Duskhunter exception explained), and a pointer to the
  in-battle Battle Key for live reference.
- Light-tier line added to the in-battle strip (with extra Duskhunter
  detail) — split as decided: light tiers live in *both* places, while
  deploy/move/attack live in Help only.

### Changed — Minor
- Strip renamed "Terrain Key" → "Battle Key" since it now covers more
  than terrain.

### Verified
- Checked the actual mechanic before writing any text (read
  `computeLitTiles()`/the `isFullyLit` CSS-class logic directly, didn't
  assume): it's a **4-tier system**, not 3 — Fog (undiscovered) → Dimmed
  (discovered but no unit currently lighting it, so an enemy standing
  there is presently untracked) → Greylit/dim (melee fine, ranged blocked
  except Duskhunters) → Lit (anyone can attack).
- Checked that move/attack have no enforced order (`hasMoved`/
  `hasAttacked` are independent flags, no ordering check found anywhere
  in the codebase) before writing "either order" into the text.
- Full combat sanity sweep shows no regressions (UI/content-only change).

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~8 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.
- Battle Key strip is battle-screen only — the Deploy screen doesn't show
  it, though it displays the same tile glyphs during placement.
- All five original playtest-fix discussion items (onboarding, AGI
  rename, Move display, Advance Day prominence, terrain reminders, battle
  basics) are now resolved.

---

## [v2.0.20] — Item 4: Difficult Terrain Reminders

### Added
- Collapsible "Terrain Key" strip below the battle grid, mirroring the
  Chronicle strip's exact collapse pattern (`G.terrainLegendExpanded` /
  `toggleTerrainLegend()`). Covers difficult terrain, obstacles (noting
  the movement-only vs. movement+line-of-sight distinction), high
  ground, and the objective marker. Numbers verified against actual code
  before writing the text: difficult terrain costs exactly 1 extra step,
  high ground is exactly +1 DEF.
- Battle log reinforcement: player moves that cross difficult terrain now
  log "*X pushes through the difficult ground — that cost extra.*"
  instead of the generic "*X moves.*" — checks the whole path, not just
  the destination tile, since a move can cross difficult terrain partway
  through without ending on it.

### Changed — Minor
- Overrode `.taginfo`'s 80px `max-height` cap for the terrain legend
  specifically — that cap was designed for short single-tag tooltips, and
  the 4-line legend (with one long wrapping line) would have clipped at
  it otherwise.

### Verified
- Legend toggle round-trip confirmed (closed → open → closed).
- A 15-mission persistent-squad simulation confirmed both the
  reinforcement line and the normal move line actually fire in real play,
  not just in isolated logic checks.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- Battle Basics help section is still a placeholder — item 5
  (deploy/light/move/attack explanation) not yet discussed/locked.
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~8 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.
- Terrain legend is battle-screen only — the Deploy screen doesn't show
  it, though it displays the same tile glyphs during placement.

---

## [v2.0.19] — Playtest Fix: Advance Day Demoted

### Changed — Minor
- "Advance Day" was too prominent for how rarely it's actually used — it
  lived in the always-visible header, styled identically to "New
  Campaign," on every screen, despite only ever being enabled on the
  patron screen. Moved out of the global header entirely into Company
  Hall's page content (where it's already conceptually scoped), so it
  simply doesn't exist on any other screen instead of sitting there
  greyed out.
- New `button.subtle` CSS class (transparent background, muted `--ash`
  text, smaller padding) — deliberately quieter than the default button,
  let alone `.primary`/`.danger`.
- Relabeled "Wait a Day" for clarity now that it's contextual rather than
  a global header action.

### Verified
- `advanceDayAction()` confirmed to still charge upkeep and advance
  `G.day` correctly from its new call site.
- Full combat sanity sweep shows no regressions (UI-only change,
  `advanceDayAction()`'s internal logic untouched).

### Known Issues (carried into [Unreleased])
- Battle Basics help section is a placeholder — pending items 4
  (difficult terrain reminders) and 5 (deploy/light/move/attack
  explanation), still to be discussed and locked.
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~8 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.

---

## [v2.0.18] — Onboarding Item 1: Help Page + Tappable Header Stats

### Added
- New persistent "? Help" header button, reachable from **any** screen —
  not tied to the camp/patron nav shell, since a player mid-battle should
  be able to check what a stat means without abandoning the fight.
  `openHelp()`/`closeHelp()` track `G.previousScreen` separately from
  `G.screen` so closing Help returns to exactly where the player was.
- Help page covers **Header Stats**, **Recruiting**, **Squad Selection**,
  and **Choosing a Mission** — scoped deliberately to what item 1 asked
  for. **Battle Basics is left as an explicit placeholder** ("Coming
  soon"), not guessed-at content, since terrain reminders and
  battle-mechanics explanation are separate, still-open items (4 and 5)
  pending their own design discussion.

### Changed — Minor
- Day/Gold/Upkeep/Tithe/Darkness header chips converted to
  `tappableTag()`. Darkness previously had a hover-only `title=`, one of
  the ~9 flagged in Known Issues — this closes out part of that backlog
  too.

### Verified
- `openHelp`/`closeHelp` round-trip confirmed correct from both `patron`
  and `battle` screens.
- `openHelp()` confirmed not to throw when called before `G` exists.
- `tappableTag`/`toggleTagInfo` round-trip confirmed (closed → open →
  `panelHtml` populated).
- Full combat sanity sweep shows no regressions (UI-only change).

### Known Issues (carried into [Unreleased])
- Battle Basics help section is a placeholder — pending items 4
  (difficult terrain reminders) and 5 (deploy/light/move/attack
  explanation), still to be discussed and locked.
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~8 hover-only `title=` tooltips remain unconverted (was ~9; Darkness
  converted this pass).
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.

---

## [v2.0.17] — Playtest Fixes: AGI Rename + Move Display

### Changed — Minor
- **INIT renamed to AGI** in every player-facing display: Company Hall
  roster card, Recruitment Office candidate card, battle expanded status,
  level-up choice card, the "Sharpen Reflexes" button, background/trait/
  mutation tooltips, and the boss-awaken battle log line.
  **Display-only** — the internal `r.init` field name is unchanged.
  Renaming it would have meant touching every combat/dodge formula that
  reads it for zero player-visible benefit; this was a label change, not
  a data-model change.
- **Move added** to the two pre-battle "mercenary" stat displays that
  were missing it — Company Hall roster card and Recruitment Office
  candidate card. It was already shown in battle-screen displays and the
  level-up card, just not these two.

### Verified
- `formatTraitMods()` confirmed to output "AGI" instead of "INIT."
- Full combat sanity sweep shows no regressions (display-only change —
  `.init` field and every formula that reads it are untouched).

### Known Issues (carried into [Unreleased])
- Onboarding/explanation system for header stats, recruiting, mission
  selection, and battle basics — discussed at length, several directions
  proposed, none locked or implemented yet.
- Lasting reminders for difficult terrain — discussed, not implemented.
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.

---

## [v2.0.16] — Enemy HP-Color Indicator

### Changed — Minor
- Extended the v2.0.13 player HP-as-border-color indicator to enemy
  units too. Same thresholds (25%/50%, still borrowing
  `WOUND_HP_THRESHOLD` for consistency even though enemies have no
  equivalent wound mechanic at that number — purely a visual HP-tier
  signal for them, not a mechanic tie-in like it is for players), but
  darker shades (`hp-enemy-healthy`/`caution`/`critical`:
  `#495e40`/`#7f6525`/`#5e2323`) so "ally hurt" and "enemy hurt" don't
  read as visually identical at a glance.
- Coexists cleanly with the existing boss outline — separate CSS
  property, same pattern as `.active` already coexisting with the
  player-side version.

### Verified
- Tier logic confirmed to produce matching class names for both sides at
  all three boundary cases (25%, 50%, and above).
- CSS rules confirmed present for all three enemy tiers.
- Full combat sanity sweep shows no regressions (CSS/rendering only).

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player/enemy duplicate-labeling and HP-color-border are battle-screen
  only — the Deploy screen still shows plain weapon glyphs.

---

## [v2.0.15] — Patron Tagline Audit + Thieves Bias Removal

### Changed — Minor
- Audited `PATRON_ARCHETYPES.desc` (the short card tagline, separate from
  the deeper `.flavor` line) against actual current bonus fields. The
  auto-generated mechanical summary line beneath it was already accurate
  and complete, but two taglines had drifted stale from earlier balance
  passes:
  - **Noble**: said nothing about its actual gold stipend. Now: "Political
    influence, inherited standing, and a house purse that keeps opening."
  - **Military**: promised "training, equipment" bonuses that don't
    exist — `poolBonus` is about recruit quantity, not training speed or
    gear cost. Now: "Discipline, numbers, and a wider muster to draw
    recruits from."
- `thievesBias` removed (`true → false`) — Thieves Guild no longer skews
  the candidate pool toward Thug/Pickpocket backgrounds.

### Verified
- Both taglines confirmed updated directly.
- 200-roll sample confirmed Thug/Pickpocket background rate back to
  baseline (~10%) instead of the old ~40%-chance-per-candidate elevation.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player duplicate-labeling and HP-color-border are battle-screen only —
  the Deploy screen still shows plain weapon glyphs.
- Thieves Guild's `.flavor` line ("Black-market connections and light
  fingers") still gestures loosely at the now-removed `thievesBias`
  mechanic ("light fingers") — flagged during this pass but not changed,
  since it wasn't explicitly requested and "light fingers" reads as
  general Guild identity, not strictly a mechanic promise. Revisit if it
  reads as a mismatch once thievesBias is gone.

---

## [v2.0.14] — Landing Page

### Added
- New `landing` screen (`renderLanding()`), shown first via
  `startNewCampaign()` — the game previously jumped straight from load
  into archetype selection with zero scene-setting.
- Narrative core trimmed to 3 short paragraphs plus a "Choose Your
  Company" button (`beginArchetypeSelection()`) — deliberately short. A
  fuller draft with all six house lines included didn't fit a mobile
  screen without scrolling, so those six lines moved to each archetype
  card's existing flavor slot instead.

### Changed — Minor
- All 6 `PATRON_ARCHETYPES.flavor` lines rewritten to tease each house's
  capstone antagonist (already established in `CAPSTONE_FLAVOR`) without
  spoiling it. These lines were already displayed on the archetype card
  and reused in the "take up the mantle" log line, so the new lines slot
  in at the moment of the actual choice rather than a screen earlier.

### Verified
- Full state-transition chain confirmed directly: `startNewCampaign()` →
  `landing`, `beginArchetypeSelection()` → `archetype`, and — since
  `confirmNewCampaign()`'s restart flow already routes through
  `startNewCampaign()` — a mid-game restart correctly returns to the
  landing page too, not just first boot.
- All 6 new archetype flavor lines confirmed present.
- Full combat sanity sweep shows no regressions (expected — UI/narrative
  only, no gameplay logic touched).

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player duplicate-labeling and HP-color-border are battle-screen only —
  the Deploy screen still shows plain weapon glyphs.

---

## [v2.0.13] — Playtest Fixes

### Changed — Minor
- Nickname font shrunk one size step (`0.85em` relative to the recruit
  name) on the Company Hall inline display.
- Player battle-grid labels: previously rendered by weapon glyph only
  (`ch = WEAPONS[weaponKey].glyph`), so two same-weapon recruits were
  visually identical mid-fight — no way to tell which was wounded at a
  glance. Added `assignPlayerLabel()`, mirroring the existing enemy
  duplicate-numbering pattern exactly (`S1`/`S2` for two spear users),
  grouped by weapon glyph since players don't have their own `.glyph`
  field. Assigned once per squad member in `beginBattle()`.
- HP-as-border-color on player battle cells: green above 50%, amber
  25-50%, red at/below 25%. The red threshold deliberately matches
  `WOUND_HP_THRESHOLD` exactly — it's "this recruit will be Wounded if
  the mission ends right now," a real mechanic-aligned signal rather than
  an arbitrary color split. Uses `border` (not `outline`) so it coexists
  cleanly with the existing `.active` outline indicator — both show at
  once for the currently-acting unit.

### Verified
- Duplicate-weapon labeling confirmed sequential (`S1`, `S2`) while
  distinct weapons each correctly get `1`.
- All HP-color boundary cases confirmed exact, including the 25%/50%
  edges.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started.
- Player duplicate-labeling and HP-color-border are battle-screen only —
  the pre-battle Deploy screen still shows plain weapon glyphs with no
  numbering, since labels aren't assigned until `beginBattle()`. Not
  flagged as a bug by the playtest, but a natural follow-up if it comes
  up.

---

## [v2.0.12] — Nickname Tuning

### Changed — Minor
- Deployed category threshold raised `3 → 5`. Consistent with the
  original note that all 11 nickname thresholds were flagged as tunable
  pending real playtesting, not final balance numbers.

### Verified
- No unlock at 4 consecutive deployments, correct unlock at exactly 5.

### Known Issues (carried into [Unreleased])
- The remaining 10 nickname thresholds remain flagged as tunable pending
  further playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.
- Pixel-graphics Phase 2 (actual sprite art) not started — Phase 1 data
  layer/CSS groundwork shipped in v2.0.11.

---

## [v2.0.11] — Pixel-Graphics Phase 1 Prep

Purely additive, zero visible/behavioral change today — lays the data and
CSS groundwork a future sprite pass can build on without a rewrite.

### Added
- `spriteKey` added alongside every existing glyph: 5 weapons, 9 base enemy
  types (covers boss variants too — bosses are built from these same
  archetypes with scaled stats, not separate art), and 5 distinct terrain
  sprites deduped from 8 obstacle entries across all 5 settings (rubble
  and wall repeat across Ruins/Dungeon/Plain).
- `TILE_SPRITE_KEYS`: a small lookup for the 3 glyphs (high ground,
  difficult terrain, objective marker) drawn as inline literals in
  `renderBattle()`/`renderDeploy()` rather than attached to any data
  object.
- `CLASS_SPRITE_KEYS` + `getPlayerSpriteKey()`: player sprite scope
  decided as per-class, not per-weapon or fully individual. Covers all 10
  states `getClassName()` can actually return — the 6 base classes (5
  weapon-mapped classes + Arcanist's `canCast` override; `canHeal` also
  overrides to Guardian regardless of weapon) plus the 4 permanent
  reclass paths (Darkwarden/Duskhunter/Shadesinger/Nightsworn). Recruits
  below veteran Lv1 (no class yet) fall back to the weapon spriteKey.

### Changed — Minor
- Cell sizing switched from a fluid `clamp(22-36px)` to fixed integer
  steps (24/48/72px via media-query breakpoints on `:root`) — pixel art
  wants exact-multiple scaling to stay crisp; the old fluid non-integer
  sizing would blur sprites.
- `image-rendering: pixelated` added to `.cell` as forward-compat — no
  effect today (only affects images, and there are none yet), correct
  from day one once sprites exist.

### Verified
- `getPlayerSpriteKey()` checked directly across every resolution path:
  unleveled fallback, all 5 weapon-mapped classes, the `canCast`/`canHeal`
  overrides, and all 4 reclass paths — all correct. All 10
  `CLASS_SPRITE_KEYS` entries confirmed present.
- Full combat sanity sweep shows no regressions (expected — none of this
  touches gameplay logic).

### Known Issues (carried into [Unreleased])
- All 11 nickname thresholds remain flagged as tunable pending real
  playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.

---

## [v2.0.10] — Retirement

### Added
- One-way retirement for max-level veterans. Removed from the active
  roster entirely — stops costing `recruitFee`/upkeep — either as a plain
  departure or as a **Trainer**.
- No new button: the existing Retire/confirm flow forks only at the
  confirm step, and only for max-level recruits. Non-max-level recruits
  are unchanged (single "Confirm?"). Max-level recruits get a
  "Retire" / "Keep as Trainer" choice in that same confirm slot instead.
- `activeTrainer()`: only the **most recently retired** trainer's effect
  is active — retiring a second trainer replaces which one counts, it
  doesn't stack. Plain (non-trainer) retirees are ignored by this lookup
  but still kept in `G.retirees` for history.
- `effectiveLevelThreshold()`: reduces every active recruit's next level
  threshold by 1 mission when a trainer is active
  (`LEVEL_THRESHOLDS [2,5,9] → [1,4,8]`). Both the actual level-up check
  in `endBattle()` and the Company Hall "X to next level" display now
  route through this same function, so they can't drift out of sync with
  each other.
- Company Hall shows the active trainer as a tappable chip when one
  exists, explaining the mechanic.

### Verified
- Threshold reduction confirmed exact (`[1,4,8]` with a trainer active,
  `[2,5,9]` without).
- `activeTrainer()` confirmed to pick the most recent trainer, ignore
  plain retirees, and return `null` when none exist.
- `retireAsTrainer()` confirmed blocked below max level, and confirmed to
  correctly move a max-level recruit out of `roster`/`squadSelect` into
  `retirees` with `isTrainer:true` when it succeeds.
- Plain two-click Retire path confirmed unchanged from the old dismiss
  flow.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- All 11 nickname thresholds remain flagged as tunable pending real
  playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.

---

## [v2.0.9] — Bond System

### Added
- Two recruits who've shared `BOND_MISSIONS_THRESHOLD` (5) missions
  together get `+1 ATK`/`+1 DEF` each while both are deployed in the same
  squad. Positive-only by design — no rivalry/incompatibility penalties.
- New per-recruit field `missionsWith` (other recruit id → shared-mission
  count), incremented pairwise for every surviving squadmate pair in
  `endBattle()`, regardless of win/loss.
- Bond bonus applied fresh every battle in `beginBattle()` and reverted at
  the very start of `endBattle()` — deliberately *not* a permanent stat
  change, since deployed units are direct `G.roster` references rather
  than battle-local copies, so anything added has to be symmetrically
  removed or it would silently inflate the recruit's displayed stats
  forever.
- Stacks by design: a recruit bonded with both other squad members gets
  the bonus twice, rewarding a consistent trio rather than capping it.
- Company Hall shows active bonds (at/above threshold) as a tappable tag
  per recruit, naming the bonded partner and mission count.

### Verified
- End-to-end via persistent-roster simulation: `missionsWith` accumulated
  correctly across 6 consecutive missions for both pairs (1→2→3→4→5→6).
- ATK reverted to the exact base value after every single battle — no
  leakage into permanent stats.
- Mid-battle (7th deployment, both pairs at threshold) ATK correctly
  showed `base+2` from stacking both bonds simultaneously.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- Retirement is designed (see design doc) but not yet implemented.
- All 11 nickname thresholds remain flagged as tunable pending real
  playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.

---

## [v2.0.8] — Barracks Expansion

### Added
- Roster is now capped — previously uncapped entirely, limited only
  implicitly by upkeep affordability. Base cap 6 (`BARRACKS_BASE_CAP`),
  `+3` slots per purchase (`BARRACKS_SLOTS_PER_EXPANSION`) via a new
  "Expand Barracks" action on Company Hall.
- Cost formula: `50 + expansions×100 + repTier×50` gold — scales on two
  axes deliberately (repeated purchases get pricier; a more established
  company is expected to absorb a higher price, matching `titheAmount`'s
  existing rep-tier-scaling precedent). Starts at 50g, accessible early.
- `hireRecruit()` now blocks at cap with a clear "Barracks Full" button
  state instead of a silent no-op. Roster capacity (`current/cap`)
  surfaced on both Company Hall and the Recruitment Office header.

### Verified
- Cap and cost formula checked directly across every
  expansion-count × rep-tier combination — all match the designed table
  exactly (e.g. 0 expansions/tier 0 → 50g, 2 expansions/tier 3 → 400g).
- Hire-blocked-at-cap confirmed (roster held at 6, hire attempt no-op).
- Gold deduction and sequential-expansion compounding confirmed across 3
  consecutive purchases.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- Bonds and Retirement are designed (see design doc) but not yet
  implemented.
- All 11 nickname thresholds remain flagged as tunable pending real
  playtesting.
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.

---

## [v2.0.7] — Nickname System

### Added
- 11 tracked achievement categories (Wounded, Deployed, Avoided Death,
  Kills, Healed, Dodged, Boss/Elite Kills, Flawless Missions, First Kill,
  Fought While Wounded, Damage Dealt), each with a threshold and 10 unique
  suffixes. Checked in that priority order — only the first threshold
  crossed ever assigns a nickname, permanent thereafter.
- New per-recruit counters: `timesWounded`, `deathsAvoided`,
  `consecutiveDeployments`, `totalKills`, `healsGiven`, `dodges`,
  `flawlessMissions`, `firstKillCount`, `foughtWhileWoundedCount`,
  `damageDealt` — hooked directly into `attackUnit`, `castBolt`,
  `resolveSporeContagion`, `healUnit`, and `endBattle`'s roster-processing
  pass, not derived after the fact.
- Company Hall display: nickname shown inline after the recruit's name
  ("Leikos *the Scarred*"), plus a tappable info tag explaining which
  achievement earned it. Not propagated to the battle log or result
  screen — Company Hall only, by design.

### Known limitation
- `resolveSporeContagion`'s inline death handling doesn't feed
  `totalKills`/`firstKillCount` — matching a pre-existing gap where it
  never fed `eliteKills` either. Not introduced by this pass, just not
  fixed by it.

### Verified
- End-to-end via a persistent-roster multi-mission simulation (same
  recruit object across many real fought battles, not just formula
  checks) — confirmed counters accumulate correctly and a nickname
  assigns at the right threshold.
- Direct priority-order check confirming all 11 categories fire
  independently, and that ties resolve toward the higher-priority
  category (e.g. Wounded beats Kills when both qualify simultaneously).
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- All 11 nickname thresholds are explicitly flagged as tunable pending
  real playtesting, not final balance numbers — especially Healed (30)
  and Fought-While-Wounded (5), which the pre-implementation analysis
  flagged as genuinely uncertain (Healed's rate is highly build-dependent;
  Fought-While-Wounded depends entirely on roster-rotation playstyle).
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.
- Bonds, Retirement, and Barracks Expansion are designed (see design doc)
  but not yet implemented.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted.
- Open design question: Company Hall's tag density with several
  tap-to-expand panels open at once on one recruit card.

---

## [v2.0.6] — Noble Revision

### Changed — Minor
- `stipendPerTier`: 8g → 5g (kept alongside two new levers rather than
  standing alone, so its individual weight came down).
- Added `repGainMult:1.10` — +10% rep from mission rewards, applied inside
  `genMission()`'s single reward calculation alongside `REWARD_MULTIPLIER`
  and any `missionTypeBonus`, not as a separate rounding pass.
- Added `failRepLossMult:0.90` — -10% rep lost specifically on mission
  failure. `titheMissRepLoss()` is deliberately untouched — a missed tithe
  costs full reputation regardless of patron.

### Verified
- Directly tested all three Noble mechanics against expected values
  (stipend, rep-gain multiplier, failure-loss multiplier) rather than just
  syntax-checking — confirmed correct, including that Noble's rep reward
  and a baseline archetype's rep reward stay internally consistent once
  `REWARD_MULTIPLIER`'s per-type variance is accounted for.

---

## [v2.0.5] — Patron Economy Rework

### Changed — Significant
- Temple: `upkeepMult` unchanged (0.85), added `darknessMult:0.90` (-10% Darkness
  growth per attempt) and `restHealPct:0.35` (was flat 0.25 for everyone,
  +10 points for Temple specifically).
- Thieves: `hireDiscount` 0.20 → 0 (removed — one-time saving on a small base
  cost, not comparable to a recurring discount), `upkeepMult` stays 1.0
  (no discount), added `titheDiscount:0.20` as the sole economic lever.
- Noble: added `stipendPerTier:8` — a recurring stipend (`8g × current
  repTier`, granted every mission via `applyNobleStipend()`) rather than a
  one-time grant at each tier crossing.
- `recruitBonus` removed from every archetype and from `candidateBonus()`.
  Was `0` for all six archetypes — dead weight that was still advertised
  conditionally in the archetype-comparison UI despite never doing anything.
- `refreshCandidates()` cost now scales with rep tier (10/15/20/25 across
  tiers 0-3) instead of a flat 5g regardless of standing.

### Fixed
- Temple and Thieves were reviewed and found meaningfully weaker than
  Merchant/Military/Explorer. Root cause for Thieves specifically: its hire
  discount targeted a one-time cost (`c.cost`, ~15-30g, paid once per
  recruit) while Merchant's upkeep discount targets a recurring cost
  (`totalDailyFee()`, charged every mission for the whole roster, for the
  whole campaign) — similar-sounding percentages, very different total
  value. Noble had no lever at all beyond starting rep.
- Fixed via deterministic gold-flow simulation against the actual
  `recruitFee`/`titheAmount`/`repTier` formulas (same win/loss sequence
  shared across every scenario to avoid RNG noise skewing the comparison),
  not rough estimates. Thieves' 20% tithe discount was checked at
  20/40/60/80-mission campaign lengths and converges to ~100-101% parity
  with Merchant's real upkeep savings by mission 60 and holds there
  (a 25% discount was also tested and rejected — it never stabilizes,
  climbing past 127% and still rising by mission 80).
- Noble's original "flat gold at each tier crossing" concept was tested and
  found structurally incapable of matching Merchant long-term: there are
  only 3 possible crossings in the whole game, so its total payout is
  capped the moment tier 3 is reached, while Merchant's discount keeps
  compounding for as long as the campaign runs (checked: an 8g×tier
  crossing-grant totaled 600g regardless of whether the campaign ran 40 or
  60 missions, while Merchant's savings grew from 743g to 1163g over that
  same span). Replaced with a recurring stipend that scales with *current*
  tier every mission instead of a finite one-time sum — this version
  converges to ~99% parity with Merchant by mission 80, tracking it
  properly rather than falling permanently behind after the last crossing.

### Known Issues (carried into [Unreleased])
- Trophy count (`elysiumTrophies`) still has no persistent header
  indicator — only visible on the Elysium region page. Deferred per
  earlier direction.
- Broodmother's Brood Swarm summon ability (cooldown 2, independent of the
  wave-spawn system) remains unaddressed in Arena specifically, pending a
  dedicated Arena balance pass.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted outside Company
  Hall/Recruitment/Deploy/Battle (Ordain/Retrain button explanations, the
  darkness meter chip, retrain's equipped-weapon tag, others).
- Open design question, never resolved: Company Hall's tag density once
  several tap-to-expand panels are open simultaneously on one recruit card
  (background, trait, healer, both equipment slots, wounds, N injuries).

---

## [v2.0.4] — Patron Voice + Five Fixes

### Added
- Reputation-tier crossings now fire a one-time Chronicle entry using the
  existing `PATRON_REP_TIERS` name ladder (e.g. "Your standing grows:
  Thieves Guild now sees you as 'Shadow Broker.'"). That ladder existed
  since early on but was never surfaced as an actual moment — just a
  background lookup for a status-bar label.
- `PATRON_VOICE`: archetype-flavored reactive lines at two rare,
  already-tracked milestones — a recruit's first max-veteran-level, and
  each of the four regions being fully reclaimed. All 6 archetypes have
  distinct voice at both; verified programmatically for completeness.

### Changed — Minor
- Caster tag tooltip (Company Hall + Recruitment Office) now shows the
  recruit's actual current bolt power and the damage formula, instead of
  just "scales with veteran level" — was inconsistent with Healer's
  tooltip, which already gave a concrete number.
- Hand/head equipment ("trinket") tooltips now show stat mods alongside
  flavor text, matching how background/trait tags already work. Fixed by
  reusing `formatTraitMods()` — its key scheme already matched equipment's
  `mod:{atk,def,init,hp}` format exactly, no new helper needed.
- Level-up choice card now shows weapon alongside stats.

### Fixed
- `returnToPatron()` wasn't resetting `G.patronPage`, so launching a
  mission from the Expedition Board dropped you back on the Expedition
  Board post-battle instead of Company Hall, where roster updates
  (level-ups, deaths, new gear) actually need attention first. Now forces
  `'hall'`.

### Known Issues (carried into [Unreleased])
- Trophy count (`elysiumTrophies`) is real and tracked correctly, but it's
  only ever displayed on the Elysium region page itself — no persistent
  header/status-bar indicator anywhere else. Investigated per a report of
  "where is it," confirmed as a discoverability gap rather than a bug.
  Left as-is per direction — revisit if it keeps causing confusion.
- Patron directives, a standing favor-meter separate from general
  Reputation, and a unique per-archetype active mechanic were all floated
  in the same brainstorm as this pass's rep-tier/reactive-voice work and
  deliberately deferred — this pass was the cheap, low-risk layer only.
- Broodmother's Brood Swarm summon ability (cooldown 2, independent of the
  wave-spawn system) remains unaddressed in Arena specifically, pending a
  dedicated Arena balance pass.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted outside Company
  Hall/Recruitment/Deploy/Battle (Ordain/Retrain button explanations, the
  darkness meter chip, retrain's equipped-weapon tag, others).
- Open design question, never resolved: Company Hall's tag density once
  several tap-to-expand panels are open simultaneously on one recruit card
  (background, trait, healer, both equipment slots, wounds, N injuries).

---

## [v2.0.3] — Endless Bout Balance Fix

### Changed — Minor
- `genArenaBoutMission()`: `phases` 3 → 2, `enemyCount` 6+rand(0,1) → 4.
- Wave-spawn cadence for `arenabout` slowed from every 2 rounds to every 3,
  plus a hard cap of 4 total waves (scoped to `arenabout` only — no other
  mission type's wave timing changed).
- `last-light-testing-harness.js`: `agoratoll` now shares the holder-pattern
  AI branch with `templerite`/`elysiumhunt` (it has the identical
  objectives/holdRounds structure, confirmed by inspection). Fixed a real
  race condition where a player unit dying mid-move to a disengage
  free-strike could get the battle-loop's `currentUnit` read stale,
  silently miscounting an in-progress, still-winnable battle as an instant
  loss — affected every prior sweep run with the old harness to an unknown
  degree, though spot-checks against earlier readings (Defense, Purge,
  Endless Rite) showed no meaningful drift.

### Fixed
- Arena's Endless Bout was badly out of line with its three Endless-X
  siblings: 0.0–0.7% (n=150) against a 2–4% sibling band (Rite 3.3–4%,
  Hunt 2%, Toll 3.3%). Diagnosed via single-battle trace: the boss had no
  waves-pause-until-engaged gating (unlike its search-phase siblings, since
  it's present from round 1), and separately, `phases:3` meant it had to be
  dropped to 0 HP three separate times (full heal + ATK/move buff each
  phase) while trash pressure never let up. Swept `phases` × `enemyCount`
  empirically — `enemyCount` alone did nothing even at half its original
  value; `phases` was the dominant lever. Landed on `phases:2` +
  `enemyCount:4` (measured 4.0% in isolation, 2.7% against the actual
  shipped mission factory with the wave-cap also applied), which keeps the
  "won't stay down the first time" beat from the mission's flavor text
  intact — `phases:1` alone hit the same win rate but removes that beat.

### Known Issues (carried into [Unreleased])
- Broodmother's Brood Swarm summon ability (cooldown 2, +2 enemies,
  independent of the wave-spawn system) was identified as a secondary
  pressure source specifically in Endless Bout during this investigation.
  Deliberately left alone pending a dedicated Arena balance pass — not
  addressed by the phases/enemyCount fix above.
- The harness AI's targeting priority (attack lowest-HP-in-range) never
  deliberately focuses bosses over trash. This likely makes multi-phase
  boss encounters read harder in the harness than they'd play in practice
  with a human directing focus fire — a caveat on how literally to trust
  low win-rate readings on boss fights specifically, not a bug to fix.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- ~9 hover-only `title=` tooltips remain unconverted outside Company
  Hall/Recruitment/Deploy/Battle (Ordain/Retrain button explanations, the
  darkness meter chip, retrain's equipped-weapon tag, others).
- Open design question, never resolved: Company Hall's tag density once
  several tap-to-expand panels are open simultaneously on one recruit card
  (background, trait, healer, both equipment slots, wounds, N injuries).

---

## [v2.0.2] — Bosshunt/Relic/Stalk Reward Recalibration

### Changed — Minor
- `REWARD_MULTIPLIER`: `bosshunt` 1.52 → 1.00 (floor-clamped), `relic` 1.26 →
  1.10, `stalk` unchanged at 1.00. Same formula and methodology as v2.0.1
  (100 trials/tier, T1–4 avg, fresh defense anchor re-measured at 76.25%).

### Fixed
- Completes the 12×12 re-validation started in v2.0.1: Bosshunt, Relic, and
  Stalk multipliers were the same category of staleness flagged for
  Purge/Explore — calibrated pre-grid-resize, never reconfirmed. Bosshunt
  drifted the hardest, flipping from the hardest core type by far (27.00%
  old baseline avg) to easier than the Defense safe-baseline (79.5% avg,
  T4 43%). Relic softened from 39.38% to 62.5% avg (T4 23%) but remains
  genuinely harder than Defense. Stalk landed almost exactly at parity with
  the freshly-measured Defense anchor (76.25% avg vs. 76.25%) — no change
  needed. All six core mission types' reward multipliers are now confirmed
  against the current grid.

### Known Issues (carried into [Unreleased])
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- `last-light-testing-harness.js`'s holder-pattern AI branches don't
  explicitly cover `agoratoll`/`arenabout` — they test plausibly via the
  general-case fallback, but that's coincidental, not confirmed-correct
  dedicated logic. **Resolved in v2.0.3** (agoratoll), see below.
- ~9 hover-only `title=` tooltips remain unconverted outside Company
  Hall/Recruitment/Deploy/Battle (Ordain/Retrain button explanations, the
  darkness meter chip, retrain's equipped-weapon tag, others).
- Open design question, never resolved: Company Hall's tag density once
  several tap-to-expand panels are open simultaneously on one recruit card
  (background, trait, healer, both equipment slots, wounds, N injuries).

---

## [v2.0.1] — Purge/Explore Reward Recalibration

### Changed — Minor
- `REWARD_MULTIPLIER`: `explore` 1.0 → 1.26, `purge` 1.89 → 1.15, recalculated
  via the existing `sqrt(defenseWinRate/typeWinRate)` formula against fresh
  harness data on the 12×12 grid (100 trials/tier, T1–4 avg, fresh-recruit
  squads, defense anchor re-measured alongside at 76.25%).

### Fixed
- Purge and Explore reward multipliers were still calibrated against
  14×9-era win rates, never re-confirmed after the grid resize to 12×12 as
  flagged in the design doc. Both had drifted hard, in opposite directions:
  Explore flipped from easier-than-Defense (75.00% avg, floor-clamped to
  1.0x) to harder-than-Defense (47.75% avg, T4 21%); Purge flipped from the
  hardest type by far (17.62% avg, 1.89x) to the second-easiest of the two
  (57.25% avg, T4 17%).

### Known Issues (carried into [Unreleased])
- Bosshunt, Relic, and Stalk reward multipliers were **not** re-measured in
  this pass and remain unconfirmed against the current 12×12 grid — same
  category of staleness as Purge/Explore before this fix, just not yet
  flagged as urgently. **Resolved in v2.0.2**, see above.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- `ai_runner.js`'s holder-pattern AI branches don't explicitly cover
  `agoratoll`/`arenabout` — they test plausibly via the general-case
  fallback, but that's coincidental, not confirmed-correct dedicated logic.
- ~9 hover-only `title=` tooltips remain unconverted outside Company
  Hall/Recruitment/Deploy/Battle (Ordain/Retrain button explanations, the
  darkness meter chip, retrain's equipped-weapon tag, others).
- Open design question, never resolved: Company Hall's tag density once
  several tap-to-expand panels are open simultaneously on one recruit card
  (background, trait, healer, both equipment slots, wounds, N injuries).

---

## [v2.0.0] — Region-Reclaim Layer & Navigation Overhaul

Retroactive baseline tag — this is a single large entry covering everything
built before versioning was introduced, not a series of smaller releases
that were actually tagged individually at the time. Future work should be
logged incrementally under [Unreleased] instead of batched like this.

### Added — Significant
- **Temple region**: Darkwarden class (Banish, Beacon-Keeper, Warden of the
  Last Ward), Cleanse mission mechanic (multi-point hold + light-beacon),
  4-step chain, The Endless Rite boss.
- **Elysium region**: Duskhunter class (dim-light targeting passive, Mark
  Quarry, Alpha's Bane, Trophy-Taker), Pack Hunt mission mechanic, 4-step
  chain, The Endless Hunt boss.
- **Agora region**: Shadesinger class (Cutting Verse, Rousing Chorus, Silver
  Tongue), traderoute mission mechanic (linear node placement), 4-step
  chain, The Endless Toll boss.
- **Arena region**: Nightsworn class (Riposte Mark counter-attack, Twinstrike
  Fury, Second Wind), Trial mission mechanic (wave survival + escalating
  elites), 4-step chain, The Endless Bout multi-phase boss, weapon
  retraining (reassign any recruit's weapon/base class).
- **Region economy layer**: Temple Infirmary (HP/wound/injury healing for
  gold), Elysium Trophy Crafting (a new non-gold currency earned from
  boss/elite kills, yielding superior gear), Agora Equipment Purchase (buy
  a specific item instead of gambling on drops), Arena Retraining pricing.
- **Camp navigation shell**: Company Hall, Recruitment Office, Expedition
  Board, and Reclaimed Territories as distinct pages behind a shared
  breadcrumb/nav-pill strip, replacing one long scrolling patron screen.
  Reclaimed Territories renders locked regions visibly-but-inert rather
  than hiding them.
- **Tap-to-expand** (`G.expandedTags` / `tappableTag()`): mobile-accessible
  replacement for hover-only `title=` tooltips, since `title=` doesn't work
  reliably on touch devices. Rolled out to Company Hall, Recruitment
  Office, and Deploy/Battle screens (obstacle tiles, Heal/Cast formulas).
- **Versioning**: this file, plus the three-location version tag in the POC.

### Changed — Major
- `renderPatron()` restructured from one monolithic function into a page
  dispatcher; the four region "cards" extracted into standalone
  `buildXHtml()` functions reused by both the old card view and the new
  full-page region views.

### Changed — Minor
- Mission/candidate card text sized up (10–10.5px → 13–15px) for mobile
  legibility; 2-column grids added to Company Hall, Recruitment Office,
  Expedition Board, and Reclaimed Territories.
- Background/trait tag color corrected to bone-white (was inheriting the
  generic dim-ash tag color); hover/tap info extended to include actual
  stat modifiers, not just flavor text.
- Healer/Caster tags given tooltips explaining their real mechanics (heal
  amount, bolt-power formula) — previously had none at all.
- 19 card-content rows and 9 reward/embark rows given `flex-wrap` (were
  overflow-prone on narrow screens); buttons/nav-pills/checkboxes resized
  for touch tap-targets; `<select>` dropdowns given theme-matching styles
  (were unstyled browser defaults).
- Chronicle's collapsed single-entry line given an explicit font-size and
  color-class support (previously had neither, rendering at browser-default
  size with no severity coloring).
- Capstone card kept inert and positioned at the bottom of the Expedition
  Board's mission list; only gets the glow/pulse treatment once actually
  ready, and never moves position.

### Fixed
- Arena retraining was completely free; now costs `500 + veteranLevel×500`
  gold.
- Second Wind (Nightsworn's original Lv.3 passive) was mechanically dead —
  its eligibility gate requires `veteranLevel === MAX_VETERAN_LEVEL`, so
  "counts double toward next level" had nothing left to count toward.
  Redesigned to a private, level-system-independent +1 max HP per win.
- A related latent bug in the base leveling check itself: `missionsSurvived
  === LEVEL_THRESHOLDS[...]` could be skipped over by any future
  double-increment mechanic; hardened to `>=`.
- Elite-arrival scheduling bug in Arena's Trial missions: a spacing formula
  computed arrival rounds in descending order, which could place an elite
  on the very first wave instead of a later one.
- Arena's "+1 elite per tier" design (1/2/3/4 across the chain) proved
  unbeatable at 3–4 simultaneous elites regardless of trash/timing
  adjustments; capped at 2 for all steps. Same category of fix as Temple's
  ward-count cap (3→2) earlier in the project's history.

### Known Issues (carried into [Unreleased])
- Purge and Explore balance not re-validated since being flagged as
  "potentially noisy" — predates this entire release. **Resolved in
  v2.0.1**, see below.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- `ai_runner.js`'s holder-pattern AI branches don't explicitly cover
  `agoratoll`/`arenabout` — they test plausibly via the general-case
  fallback, but that's coincidental, not confirmed-correct dedicated logic.
- ~9 hover-only `title=` tooltips remain unconverted outside Company
  Hall/Recruitment/Deploy/Battle (Ordain/Retrain button explanations, the
  darkness meter chip, retrain's equipped-weapon tag, others).
- Open design question, never resolved: Company Hall's tag density once
  several tap-to-expand panels are open simultaneously on one recruit card
  (background, trait, healer, both equipment slots, wounds, N injuries).
