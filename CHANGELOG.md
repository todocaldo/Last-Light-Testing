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

## [v2.1.6] — Elysium/Agora Full Re-Tune + All 4 Endless-X Bosses Retargeted to 50-60% (Significant)

### Fixed — Critical
- **Elysium's entire chain (`packhunt` type) and both regions' Endless-X
  bosses (`elysiumhunt`, `agoratoll`) had never received the gentler
  wave-cadence/cap treatment Temple got in v2.1.2** -- still on the
  original aggressive "every 2 rounds, escalating size, no cap" formula.
  Agora's own regular chain (`traderoute`) had inherited the fix
  automatically (shares Temple's `isCleanseType` gating), which is why
  Agora looked mostly fine while Elysium was catastrophic -- this was a
  real, previously-undiagnosed gap, not just stale tuning numbers. Fresh
  N=30 baseline before any fix: Agora chain 80-100%, Elysium chain
  10-93% (steps 3/4 in the 10-13% range), Agora's Endless Toll 6.7%,
  Elysium's Endless Hunt 0.0%. Extended the same cadence-every-3-rounds/
  capped-total-waves rule to `packhunt`/`elysiumhunt`/`agoratoll` (new
  constants: `PACKHUNT_WAVE_SIZE`/`CAP`, `ELYSIUMHUNT_WAVE_SIZE`/`CAP`,
  `AGORATOLL_WAVE_SIZE`/`CAP`, all `2`/`4` to start). This single change
  alone brought Elysium's chain from 10-73% up to 80-100% before any
  other tuning, and Agora's Endless Toll from 6.7% to 36.7%.

### Changed — Significant
- **Elysium/Agora chain re-tune** (target `90/85/80/75`, matching
  Temple/Arena's existing curve): Agora enemy count `[3,3,3,2]` (was
  `[4,4,2,1]`); Elysium enemy count `[12,13,8,6]` (was `[12,13,11,9]`).
  Final (N=30): Agora `93.3/76.7/73.3/83.3%`, Elysium
  `96.7/80.0/90.0/86.7%`.
- **All 4 regions' Endless-X bosses retargeted to a consistent 50-60%
  win rate** (previously wildly inconsistent: Temple 43.3% after its
  v2.1.2 fix, Arena ~3.3% -- apparently never actually revised despite
  that fix implying siblings would follow -- Agora/Elysium wherever the
  structural fix above happened to leave them).
  - Added a per-region dampener to the shared `spawnRiteBoss()` function
    used by `templerite`/`agoratoll`/`elysiumhunt`: new
    `RITE_BOSS_MULT = {templerite:0.85, agoratoll:0.65, elysiumhunt:0.15}`.
    Elysium's boss stayed broken even after the wave fix despite an
    identical undampened base formula to the other two -- needed its
    own lever.
  - **Arena's Endless Bout required real investigation, not just a
    dampener value.** It's architecturally distinct from the other 3:
    spawns at deployment via the old apex/capstone formula (not
    `spawnRiteBoss`'s mid-battle holder pattern), and carries its own
    3-now-2-phase revival mechanic (`phasesRemaining` in
    `resolveEnemyDeath`) where every non-final "death" fully heals the
    boss AND multiplies its ATK by `1.15x`. Dampening the boss's own
    stats had sharply diminishing returns -- a 25x reduction
    (`0.55`->`0.02`) only moved win rate from ~5% to ~32%. Traced the
    real bottleneck to Arena Bout's regular reinforcement waves, which
    had never been given a wave-*size* lever at all (only cadence/cap)
    and were falling through to the fully uncapped generic escalating
    formula -- up to 3 enemies/wave across 4 waves, 12 extra regular
    enemies on top of the phase-revival boss itself. Capping this at a
    flat 1/wave alone jumped win rate to 82.5%; a boss dampener (new
    `ARENABOUT_MULT = 0.95`) then brought it back down into range. The
    `phases:2` setting itself is a documented v2.0.3 design decision
    (kept over `phases:1` for flavor at equal balance) and was **not**
    touched.
  - Final Endless-X boss win rates (N=80): Temple `45.0%`, Arena
    `57.5%`, Agora `56.3%`, Elysium `48.8%` -- all four now cluster in a
    consistent, narrow band around the 50-60% target, versus the
    previous 3.3-43.3% spread across wildly different, mostly-
    unintentional values.

### Verified
- Full combat sanity sweep across the core 6 mission types after this
  pass, no regressions (none of this session's changes touch core-6
  code paths).
- Resolved an apparent "4th outcome category" in reclaim-trial test
  diagnostics (trials landing in `screen==='result'` matching neither
  `win`, `squadWiped`, nor `hitGuardLimit`): traced to the game's own
  `INJURY_CHANCE` revival mechanic in `endBattle()` -- a "fallen"
  recruit can be pulled back to 1 HP alive with an injury after the
  wipe check already ran, which threw off post-hoc wipe/guard-hit
  classification in test diagnostics but never affected the actual
  win/loss result itself. Confirmed as intended game behavior, not a
  bug.

### Known Issues (carried into [Unreleased])
- The cross-cutting AI-turn stall (both the core-6's generic form and
  Relic's more severe extraction-march variant) remains uninvestigated.
- Elysium's Endless Hunt still shows an occasional severe round-count
  outlier (one N=80 read averaged 262.3 rounds) -- likely the same
  drag-artifact category as Relic's, not chased down this pass.

---

## [v2.1.5] — Full Re-Verification of All 6 Core Mission Types + Reward-Multiplier Recalibration (Significant)

### Fixed — Critical
- **Boss Hunt, Stalk, Defense, and Explore's T4 tiers re-tuned** against
  the correctly-capped (`MAX_VETERAN_LEVEL=3`) squad, closing out the
  Known Issue carried from v2.1.4. Purge and Relic's T4 were already fine
  and untouched by this specific fix.

### Changed — Significant
- **Full re-verification and re-tune of all 6 core mission types**, from
  a fresh N=100-150 baseline rather than trusting v2.1.4's "T1-T3 verified
  and trustworthy" claim at face value. That claim did not hold up: the
  fresh baseline found T3 in the high teens to low 40s for every single
  type, and T1/T2 inconsistent (35-84%) -- nowhere near the flat 85-90%
  target. Given this project's history of balance numbers being
  invalidated after the fact, everything was re-measured from scratch
  before any constant was touched.
- Two false leads investigated and ruled out first: (1) hypothesized the
  Lv2 ability (unlocked at T3's squad level, before Lv3 specialization)
  was hurting win rate via a targeting gap -- a controlled ablation test
  (T3 Defense, ability forced off vs on) showed the opposite, disabling
  it made things worse (15.0% -> 2.5%), ruling this out before tuning
  around a phantom bug. (2) Confirmed a real, cross-cutting AI-turn-stall
  issue (guard-limit hits with the round counter still advancing, not a
  hard freeze) hitting unpredictable tiers/types at ~3-8% incidence where
  sampled directly -- broader than the previously-known "rare T1 Boss
  Hunt AI stall." Logged as an open item, not fixed this pass. Also
  established a real +-5-8 percentage point combat-RNG noise floor at
  N=150 on fully unchanged constants, informing how hard to chase
  precision in the tuning that followed.
- Final settings, all 6 types:
  - Defense: `85.0/93.0/90.0/87.0%`. Enemy count `[5,4,5,8]` (was
    `[5,6,8,8]`), wave size `[1,1,1,null]` (was `[2,2,2,null]`). T1's
    "count fixed at 5" constraint explicitly lifted this pass per
    direction -- wave size and count are both levers now, only
    `DEFENSE_ROUNDS` stays fixed.
  - Boss Hunt: `95.3/92.7/82.7/91.3%`. Minion count `[2,2,5,3]` (was
    `[2,2,8,3]`), boss dampener `[0.90,0.60,0.10,0.90]` (was
    `[1.08,0.80,1,0.92]`).
  - Purge: `81.3/84.0/92.7/86.7%`. Enemy count `[2,2,3,7]` (was
    `[2,3,7,7]`), wave size `[2,2,null,null]` (was `[3,3,null,null]`).
  - Relic: `88.8/82.5/86.3/83.8%`. Enemy count `[1,1,2,3]` (was
    `[1,1,3,3]`), cadence `[3,3,3,2]` (was `[2,2,2,2]`), wave size
    `[1,1,2,4]` (was `[2,1,5,4]`). Wave-size cuts alone barely moved win
    rate; cadence turned out to be the dominant lever, since the
    claim-then-return-to-entrance requirement exposes the squad to many
    wave cycles regardless of per-wave size.
  - Explore: `94.0/93.3/91.3/92.7%`. Enemy count `[3,2,3,4]` (was
    `[3,2,5,4]`), wave size `[2,2,2,2]` (was `[2,3,3,2]`), cadence
    `[3,3,3,2]` (was `[2,3,3,2]`). Wave cadence confirmed as the dominant
    lever for T1 specifically -- reverting cadence alone (with count/wave
    already cut) snapped T1 right back to its 51% baseline.
  - Stalk: `90.7/86.7/88.7/86.7%`. Elite dampener
    `[0.42,0.20,0.22,0.32]` (was `[0.65,0.30,0.49,0.42]`); enemy count
    unchanged.
- **`REWARD_MULTIPLIER` recalibrated to flat 1.0 across all six types**
  (was `{defense:1.0, explore:1.0, bosshunt:1.00, purge:1.15,
  relic:1.10, stalk:1.0}`). Recomputed via the existing
  `sqrt(defenseRate/typeRate)` formula against the fresh post-retune
  per-type averages (Defense 88.75%, Boss Hunt 90.5%, Purge 86.17%,
  Relic 85.35%, Explore 92.83%, Stalk 88.2%): every value landed within
  0.978-1.020 of 1.0, indistinguishable from flat given this pass's own
  established noise floor. The old values were calibrated against
  pre-retune win rates (some dating to v2.0.1) that no longer describe
  the game -- with difficulty now deliberately flat by design, there's
  nothing left for a win-rate-based multiplier to compensate for.

### Verified
- Full combat sanity sweep across all 6 mission types x 4 tiers after
  the complete pass, no crashes.

### Known Issues (carried into [Unreleased])
- **Cross-cutting AI-turn stall**, both a generic form (guard-limit hit,
  round counter still advancing, ~3-8% incidence sampled directly across
  Defense/Boss Hunt) and a substantially more severe variant specific to
  Relic's extraction march (occasional 100+ round fights before
  resolving -- not tier-specific, not introduced by this pass, reproduced
  in pre-tuning data too, e.g. the old Relic T4 baseline's 53-round
  average). Neither investigated to a code fix this pass.
- Temple/Arena's `90/85/80/75` chain target still not reconciled with
  the core-6's flat `85-95` target.
- Elysium Hunt and Agora Toll still use the original, more aggressive
  `templerite`-tier wave formula -- never brought in line with Temple's
  or Arena's gentler treatment.
- Region-reclass mutation consolidation (Snare→Slow, remaining retags)
  still deferred.

---

## [v2.0.47] — Stage 0: Knockback + Leap Engine Primitives

### Added — Minor
- `applyKnockback()` and the Leap mechanic's core resolution
  (`canLeapTo`/`resolveLeap`), built as standalone engine primitives ahead
  of the abilities that would use them — Knockback and Leap were both
  reserved-but-unbuilt in the Tag Vocabulary at the time.

### Verified
- Full combat sanity sweep shows no regressions (new code not yet wired
  into any live ability).

### Known Issues (carried into [Unreleased])
- T3 difficulty trough confirmed real and consistent across Defense/
  Bosshunt/Purge/Relic/Stalk (leveled-squad testing) — not yet
  investigated further.
- Leveled-squad vs. fresh-recruit discrepancy for Explore not yet
  investigated.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.

---

## [v2.0.48] — Stage 1: Backgrounds/Traits/HIDDEN_TALENT_PCT Rebalance

### Changed — Significant
- All 19 backgrounds (Miner deleted) rebalanced to a strict budget rule:
  HP+ATK+DEF+AGI sums to exactly 3 per background. DEF field added (was
  missing entirely from the original background design). Several weapon
  affinity reassignments (Butcher→Dagger, Trapper→Quarterstaff); Heal
  guarantee moved from Hermit to Acolyte.
- All 12 named traits (+4 null slots) rebalanced to a zero-sum rule (mods
  sum to 0). Precise replaces Wary. Plodding/Thickskinned now use 3 stats
  while staying zero-sum.
- `HIDDEN_TALENT_PCT` reduced from 0.15 to 2/21 (~9.52%), recalculated so
  all 7 classes land at an even 14.29% distribution given 19 backgrounds
  and 3 non-special backgrounds per weapon.

### Verified
- Full combat sanity sweep shows no crashes across the full background/
  trait rebalance.

### Known Issues (carried into [Unreleased])
- T3 difficulty trough confirmed real and consistent across Defense/
  Bosshunt/Purge/Relic/Stalk (leveled-squad testing) — not yet
  investigated further.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.

---

## [v2.0.49] — Stage 2: Primal Class + Weapon DEF Rebalance

### Added — Significant
- **Primal class** (Quarterstaff): Bull Charge and Feral Roar at Lv2;
  Tiger-Form (Predator Pounce, using the Leap primitive from v2.0.47) and
  Bear-Form (Wild Vigor) at Lv3. Guardian decoupled from the Quarterstaff
  weapon tie entirely — now a pure `canHeal` override, no weapon
  dependency.

### Changed — Minor
- Weapon DEF values rebalanced under the confirmed budget rule
  (ATK+DEF = 5-(range-1)): Spear ATK+2/DEF+3, Longsword ATK+4/DEF+0/
  Move+1, Longbow ATK+4/DEF-1, Quarterstaff ATK+1/DEF+4, Dagger ATK+3/
  DEF+0/Move+1.

### Verified
- Full combat sanity sweep shows no crashes with Primal live in the
  class pool.

### Known Issues (carried into [Unreleased])
- T3 difficulty trough confirmed real and consistent — not yet
  investigated further.
- 11 of ~24 designed mutations still unimplemented (Primal's Leap usage
  doesn't reduce this count — it's a class ability, not a mutation).
- Fog/movement-range visibility gap still just proposed, not built.
- Broodmother's Brood Swarm summon ability remains unaddressed in Arena.

---

## [v2.0.50] — Stage 3a: Lv2 Ability Retag/Reprice

### Changed — Significant
- All 18 Lv2 abilities moved onto the unified field-shape schema (stats+
  pctReduction for debuffs, allyBuffStats/allyBuffPct/allyBuffDuration
  for ally buffs, selfBuffStats/selfBuffPct/selfBuffDuration for self
  buffs, knockback, riposteDuration) — no more effectTarget/amount/
  setToZero except Move for Root.
- Protective Ward → Light Ward (unconditional self+adjacent, fixed
  range:1, not weapon-scaled). Safe Shot's range fixed at 1. Region-
  reclass classes (Darkwarden/Duskhunter/Shadesinger/Nightsworn) use a
  fixed numeric range instead of a weapon tie, since Guardian's
  weapon-tie removal (v2.0.49) set the precedent that class identity
  shouldn't require a specific weapon.
- Allied Cost Framework confirmed: base 100%, -15% per tag, -15% per
  range step beyond 1, -15% for AoE at range 1, +15% per cooldown-turn
  offset. Region-reclass signature abilities explicitly exempted at
  100% (a flagship-exception category, same one Execute would later
  join).

### Verified
- Full combat sanity sweep shows no crashes across the full Lv2 retag.

### Known Issues (carried into [Unreleased])
- T3 difficulty trough confirmed real — not yet investigated further.
- Win rates trending upward through Stage 1-3a (player-side buffs) —
  flagged for a dedicated difficulty pass once the full rebalance lands.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.

---

## [v2.0.51] — Stage 3b: Lv3 Specialization Retag/Reprice

### Changed — Significant
- All Lv3 specializations retagged onto the same unified schema as Lv2:
  pctReduction 50%→75%, statPct 25-30%→75%, Execute 200%/120%→300%/150%,
  Thorn Armor→Blazing Armor/Sunborn, Sunwave heal 6→2, Beacon Ward
  gained enemyDamage:2, Rampart gained allyRiposteDuration:1
  (squad-wide riposte). Spore Contagion's stat changed DEF→ATK (now
  uses the Weaken tag instead of Sunder).

### Verified
- Full combat sanity sweep shows no crashes across the full Lv3 retag.

### Known Issues (carried into [Unreleased])
- T3 difficulty trough confirmed real — win rates still trending upward
  through the player-side buff passes (Stage 1-3b); enemy-side rework
  (Stage 3c) queued next specifically to offset this.
- 11 of ~24 designed mutations still unimplemented.
- Fog/movement-range visibility gap still just proposed, not built.

---

## [v2.0.52] — Stage 3c (Partial): Enemy Signature Ability Retag

### Changed — Significant
- Enemy signature abilities retagged to match the player-side schema:
  pctReduction 50%→75% across the board. Dread Strike (Dreadspawn)
  cooldown 4→3, damage multiplier 1.3→1.0. Broodmother's Brood Swarm
  cooldown 2→3. Elder's Wrath's DEF effect changed from a hard
  setToZero to pctReduction:0.75 — the last hard-zero stat effect
  anywhere in the ability system at the time (later removed entirely
  in v2.1.0's boss rework). Rabid Lunge (Hound) lost its fullHpOnly
  gate, gained firstAttackBonus:0.15 (the Alpha Strike mechanic)
  instead.
- Boss `dmgMult` sitting at a flat 1.0 regardless of melee/ranged type
  flagged as inconsistent but deliberately deferred — bosses were
  already known to be severely underpowered and slated for their own
  dedicated rework pass rather than a partial fix here.

### Verified
- Full combat sanity sweep shows no crashes across the enemy-side
  retag.

### Known Issues (carried into [Unreleased])
- Win rates rose through every player-side stage (1-3b), partially
  offset by this enemy-side stage — tier-matched sweep still shows
  90%+ across the board when squad level matches mission tier,
  considered too easy. Dedicated difficulty recalibration pass needed.
- **Critical discovery, not yet acted on**: the test harness's AI
  (`performAITurn()`) never invokes `BUFF_ABILITIES` or
  `SPECIALIZATION_SKILLS` for any class — every win-rate sweep this
  entire rebalance has measured basic-attack-and-stat-modifier combat
  only, never the actual ability rebalance in simulation. **Resolved
  in v2.1.0** (ability-aware AI), see below.
- Boss rework still deferred — bosses confirmed severely underpowered.
  **First addressed in v2.1.0**, fully reworked in v2.1.1-v2.1.2.
- 11 of ~24 designed mutations still unimplemented. **13 new mutations
  added across v2.1.1**, closing most of this gap.

---

## [v2.0.53] — Bug Fix: Post-Mission Sequence Order (Darkness vs. Tithe)

Reported: a mission could end in an unwinnable game-over even when a due
tithe payment should have been able to prevent it.

### Root cause
`endBattle()` ran `processDarkness()` before `processTithe()` — if
darkness was already high enough to trigger a game-over on its own rise,
that check fired before the tithe payment (which reduces darkness) ever
had a chance to apply.

### Fixed
- Reordered `endBattle()`'s post-mission sequence: gold → upkeep/
  stipend/tithe → darkness rises last, so a due tithe payment can always
  reduce darkness before the game-over check evaluates it.

### Verified
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- Whether a cancelled expedition should ever be eligible to pay the
  tithe is a related open design question, surfaced while fixing this.
  **Addressed in v2.0.54**, see below.
- Difficulty recalibration still pending (carried from v2.0.52).
- Boss rework still deferred (carried from v2.0.52).

---

## [v2.0.54] — Fixed: cancelExpedition() No Longer Advances a Day

### Root cause
`cancelExpedition()` called `processDarkness(false)`, `chargeUpkeep(1)`,
and `applyNobleStipend()` — the same day-advancement side effects as
actually completing a mission, even though cancelling happens *before*
a battle and shouldn't cost a day. `applyNobleStipend()` in particular
was an exploitable free-gold path.

### Fixed
- Removed all three calls from `cancelExpedition()`. Reputation loss on
  cancellation is kept (that's an intentional cost, not a day-advance
  side effect).

### Verified
- Full combat sanity sweep shows no regressions (economy-only change).

### Known Issues (carried into [Unreleased])
- Difficulty recalibration still pending (carried from v2.0.52).
- Boss rework still deferred (carried from v2.0.52).
- Ability-aware AI gap still unresolved (carried from v2.0.52).
  **Resolved in v2.1.0**, see below.

---

## [v2.0.55] — Bug Fix: "undefined ATK&Move" on Lv2 Ability Choice Screen

Reported: Lv2 ability choice screen showing "undefined ATK&Move" instead
of a real effect description; separately reported that Lv2 choices
sometimes didn't appear at all after a Boss Hunt mission.

### Root cause
Two duplicate copies of ability-label-building logic (in-battle action
buttons, and the Lv2 choice screen) were never updated when Stage 3a
(v2.0.50) moved abilities onto the pctReduction schema — both still
read the retired `a.amount` field, which is `undefined` for every
retagged ability. Worse: for abilities with no `stats`/`stat` field at
all (Bull Charge, Feral Roar, Safe Shot), the resulting template string
crashed `renderResult()` mid-render, leaving the screen blank — the
actual root cause of Lv2 choices silently failing to appear on regular
Boss Hunt missions, not a separate bug from the "undefined ATK&Move"
report.

### Fixed
- Extracted a shared `abilityEffectLabel(a)` helper, used by both the
  in-battle button and the Lv2 choice screen — the two call sites can no
  longer drift out of sync the way they did here.

### Verified
- Direct simulation of the exact crash path (an ability with no stats
  field) confirmed fixed.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- Difficulty recalibration still pending.
- Boss rework still deferred.
- Ability-aware AI gap still unresolved.

---

## [v2.0.56] — Bug Fix: Level-Up Choices Missing After Capstone Boss Hunt

Reported directly: "Post Boss Hunt recruits leveled up with no [Lv2/Lv3/
stat] choice appearing."

### Root cause
`pendingChoice`/`pendingAbilityChoice`/`pendingSpecializationChoice`
were only ever rendered inside `renderResult()`. Capstone missions route
to a separate victory screen, `renderVictory()`, entirely bypassing
`renderResult()` — so any pending training choice earned on a capstone
mission specifically was silently dropped from the UI, even though the
underlying data was set correctly.

### Fixed
- Extracted `renderPendingTrainingChoices()`, a shared function used by
  both `renderResult()` and `renderVictory()`. "Continue the Legend" is
  now disabled with a "Resolve training above to continue" label
  whenever anything's pending, mirroring `renderResult()`'s existing
  button-gating pattern.

### Verified
- Direct tests against real `renderPendingTrainingChoices()`/
  `renderVictory()`/`renderResult()` calls confirmed all 3 choice types
  render and block the continue button when pending, and re-enable
  correctly once resolved.
- Full combat sanity sweep shows no regressions.

### Known Issues (carried into [Unreleased])
- Difficulty recalibration still pending. **Addressed at length across
  v2.1.0-v2.1.2**, see below.
- Boss rework still deferred. **Addressed across v2.1.0-v2.1.2**.
- Ability-aware AI gap still unresolved. **Resolved in v2.1.0**.

---

## [v2.1.0] — Difficulty Rebalance Pass + Boss Hunt Rework (Significant)

The largest single pass in the project's history. Summarized here;
cross-reference the in-file HTML changelog comment (same version tag)
for full narrative detail on each sub-decision.

### Added — Significant
- **Ability-aware test harness AI**: `tryAbility()`/
  `trySpecializationSkill()`, resolving the critical gap flagged in
  v2.0.52 — `performAITurn()` previously only used a basic attack or the
  legacy Cast/Heal actions, meaning every sweep in this project's history
  had measured stat/weapon changes only, never whether a specific
  ability's rebalance had any real effect. Not tactically smart
  (abilities fire the instant available, no positional judgment) but the
  first time ability usage has been measured at all.
- **Boss Hunt rework, phase 1**: bosses now inherit their own rolled
  archetype's signature ability (via `getEnemyAbilities()`) instead of a
  single universal `BOSS_ABILITY` ("Elder's Wrath") disconnected from
  flavor; stats derive from the archetype via a `buildBossHuntElite()`
  function kept fully separate from the shared `buildEliteUnit()`, so
  Stalk's mid-battle elite and Arena Bout are unaffected. Every Boss Hunt
  boss guaranteed 1-2 mutations (never 0) from a new boss-exclusive pool:
  Enraged, Numbed, Vampiric, Splitting (new), plus Two-headed and Bloated
  (reused from the regular pool).

### Changed — Significant
- Tier 2-4 enemy archetype stats retuned via extensive matched-tier and
  multi-mission-attrition testing (a squad plays consecutive missions
  with no free heal between them, confirmed as the game's actual design
  — this surfaced a large gap between single-mission and in-context
  difficulty the original tier sweeps had been missing). Hound ATK
  5→6/DEF 0→1, Viper HP 7→9/DEF 1→2, Spitter HP 8→12/DEF 1→2/AGI 4→3,
  Binder HP 10→14/ATK 4→6/DEF 2→4. Tier 4's starting spawn count and
  wave-reinforcement pool composition changed to mirror Tier 3's (a
  diagnostic finding: `enemyPool()`'s tier-depth weighting meant a
  "normal" T4 mission was mostly spawning T1-3 archetypes, not what the
  archetype table implied) — this fix doesn't apply to Boss Hunt, which
  was later found to have no wave mechanic at all.
- Blazing Armor (Guardian/Sunborn) given a new `adjacentEnemyDamage`
  field after isolated-specialization testing found it trailing its
  sibling Lightwalker by 18.6 points — it contributed zero offense
  where Sunwave contributes guaranteed heal+chip damage every cast for
  the same cooldown.

### Verified
- Extensive empirical testing throughout (see in-file comment for full
  methodology): matched-tier sweeps, multi-mission attrition sequences,
  isolated single-archetype tests, noise-floor demonstrations (repeat
  runs of identical configs to distinguish real effects from sampling
  variance at N=100-300).
- Full combat sanity sweep across all 6 mission types x 4 tiers shows no
  crashes.

### Known Issues (carried into [Unreleased])
- Boss Hunt's overall win rate not yet tuned — durability (hits-to-kill)
  and win-rate turned out to be separable problems; only durability
  addressed here. **Continued across v2.1.1-v2.1.2**, see below.
- T2's specific numbers noisier than other tiers during this pass —
  flagged as needing a larger-N confirmation run, not yet done.
- Region-reclass mutation consolidation (Snare→Slow, remaining retags)
  still deferred.
- 11 of ~24 designed mutations still unimplemented. **Closed almost
  entirely in v2.1.1**, see below.

---

## [v2.1.1] — Mutation System Consolidation + Packaging Fix (Significant)

### Fixed — Critical (Packaging)
- **v2.1.0 shipped with `window.addEventListener('DOMContentLoaded',
  startNewCampaign)` missing entirely** — the game loaded to a blank
  screen (nav bar only) until "New Campaign" was clicked manually, which
  calls `startNewCampaign()` directly and masked the missing
  auto-trigger. Root cause: the testing workflow extracts the game's
  script into a standalone file for the Node harness, and that
  extraction has stripped `DOMContentLoaded` from the very start
  (headless Node has no real browser event to fire it against) — every
  edit since v2.0.56 was applied to that pre-stripped working copy, and
  packaging v2.1.0 substituted it back into the HTML wrapper without
  re-adding the line. Fixed directly in the v2.1.0 file after being
  reported; packaging process for this and all subsequent releases now
  explicitly grep-verifies the line's presence at each step rather than
  trusting the substitution blindly.

### Changed — Significant
- **Mutation pool consolidation**: replaced `MELEE_MUTATIONS`/
  `RANGED_MUTATIONS`/`BOSS_MUTATIONS` (three separate arrays) with one
  unified `MUTATIONS` pool (25 entries). Eligibility (`'melee'`/
  `'ranged'`, either or both) is now an explicit field per mutation
  instead of "which array is it physically written in" — verified with
  3,000+ trial sweeps: zero melee-only mutations ever rolled on a
  ranged unit. 6 old melee/ranged flavor-twin pairs merged into single
  entries (confirmed byte-for-byte mechanically identical before
  merging, not assumed from names): Blighted/Fungal, Sporehazed/
  Sporetainted, Tentacled/Infected, Leaking/Sizzling, Clawed/Barbed,
  Rabid/Lurking. `Chitenous` corrected to the proper spelling
  `Chitinous`.
- 4 mechanics promoted from boss-exclusive to the general pool
  (confirmed intentional): Frenzied (renamed from Enraged), Numbed,
  Vampiric, Splitting.
- 10 new mutations added, including the first two real implementations
  of the Trigger tag (reserved but unbuilt since the original Tag
  Vocabulary consolidation): Parasitic (spawns a Crawler on death) and
  Pustuled (explodes for 1 AoE damage on death). Frog-Legged applies the
  Leap mechanic (built for Predator Pounce in v2.0.47) to the mutation
  pool for the first time. Sadistic is a genuine stacking counter,
  distinct from Frenzied/Numbed's fresh-every-attack recompute.
  Vampiric's heal rate tuned from 70% (its original boss-only value,
  confirmed too strong) down to 15%, worked out against real boss ATK
  and average recruit DEF math.
- Tag Vocabulary model updated (documentation only, no code change):
  every tag now describes a mechanic shape, with magnitude set per
  attachment rather than one fixed % enforced across every use — the
  underlying code already worked this way, this just makes the
  documentation match reality. The Cost Framework's per-tag-count
  pricing remains a baseline formula, not extended to price magnitude.

### Verified
- Direct functional tests against real game functions for every new/
  changed mechanism, not mocks, including catching and fixing 2 genuine
  bugs during testing before shipping (an `ABILITY_LOOKUP` crash from an
  incomplete Elder's Wrath removal; a live-investigated Frenzied damage
  anomaly that turned out to be a test-script artifact, confirmed via
  isolated reproduction before being ruled out as shipped-code behavior).
- Full combat sanity sweep across all 6 mission types x 4 tiers shows no
  crashes.

### Known Issues (carried into [Unreleased])
- Boss Hunt win-rate tuning still incomplete (carried from v2.1.0).
  **Continued in v2.1.2**, see below.
- Region-reclass mutation consolidation (Snare→Slow) still deferred.
- Capstone/Arena Bout boss stat rework still deferred (only got an
  ability-inheritance fallback in v2.1.0, not the full stat rework).

---

## [v2.1.4] — Arena Chain Rework, Exhibition Match, Critical Squad-Generation Bug Fix + Full Re-Tune of All 6 Core Mission Types (Significant)

### Added — Significant
- **Arena chain rework**: the 4 regular Arena missions redesigned from the
  old survive-N-rounds + mid-fight-elite mechanic to a hold-to-ignite +
  fixed-total-wave-count structure. 3 static starting enemies, hold a
  center-map point for 1 round to "ignite," then a fixed wave count
  (4/5/6/7 across steps 1-4) instead of an open-ended survival timer. A
  critical soft-lock bug was found and fixed during this work -- the
  wave-eligibility ceiling (borrowed from Temple's pattern, round<=20)
  silently blocked the fixed wave count from ever completing past round
  20, meaning a long fight could become permanently unwinnable in real
  play, not just a rare test artifact. Tuned against a 90/85/80/75%
  target curve per step.
- **Exhibition Match**: a new standalone feature -- a solo 1v2 sparring
  bout that levels a single low-level recruit without spending a day (no
  upkeep, tithe, or darkness tick). Cost scales with the recruit's own
  veteran level. Losing risks a real wound (the existing recoverable
  stat-penalty system) but never the more severe injury/permadeath system
  -- verified via direct trace showing `recruitInjuries:0` across every
  test trial, confirming recruits are floored at 1 HP instead of ever
  reaching the fallen/injury-roll pathway. Missions-survived credit
  requires an actual win, not just survival, since guaranteed survival
  would otherwise make winning irrelevant for leveling purposes. UI entry
  point lives on the Arena page itself, a two-step flow (button, then a
  recruit picker), not on individual recruit cards.

### Fixed — Critical
- **Every mission-type balance number produced earlier this session (Boss
  Hunt, Stalk, Purge, Defense, Explore, Relic) was invalidated by a
  test-harness bug and has been re-tuned from scratch.** The reusable
  trial-runner functions were calling `genRecruit(squadTier)` and then
  separately applying the full `levelUpRecruit()` progression on top --
  double-counting the tier bonus, since `genRecruit`'s own `bonus`
  parameter already adds directly to ATK/DEF/HP independent of leveling.
  Concretely: a "Lv4" test squad was carrying roughly +3-4 ATK, +2-8 DEF,
  and +13 HP more than a correctly-generated Lv4 recruit should have.
  Caught directly from a report that a traced T4 Relic squad "looked too
  strong" for its stated level, which prompted checking the actual
  generation code and confirmed it immediately. Fixed in both
  `runTrialWithMission` and `runTrialWithStallDetection`; `runReclaimTrial`
  already used the correct pattern, so the earlier Temple/Arena/Exhibition
  Match work was unaffected and did not need re-verification.

### Changed — Significant
- **Full re-tune of all 6 core mission types**, against the corrected
  squad generation, targeting a flat 85-90% win rate at every tier (a
  deliberate revision from the earlier declining 85/75/65/55 curve).
  Every mission type required real, substantive rework once retested, not
  minor touch-ups -- the scale of correction varied hugely: Relic T4's
  wave size dropped from 12 to 4; Boss Hunt T4's minion count dropped
  from 9 to 3; Explore's entire per-tier wave curve had to be rebuilt.
  Confirmed directly during this pass: the earlier "T4 is uniquely
  resistant, likely needs tier-depth stat scaling" investigation was
  itself chasing a symptom of the squad-generation bug -- once retested
  with correct squads, T4 responded to ordinary tuning like any other
  tier and needed no special scaling mechanism.
  - Boss Hunt: minion count `[2,2,8,3]`, boss dampener
    `[1.08,0.80,1,0.92]`.
  - Stalk: elite dampener `[0.65,0.30,0.49,0.42]`.
  - Purge: enemy count `[2,3,7,7]`, wave size `[3,3,null,null]`.
  - Defense: enemy count `[5,6,8,8]` (T1 fixed at 5, rounds fixed at
    `[4,5,6,7]` per explicit design constraint), wave size
    `[2,2,2,null]`.
  - Explore: enemy count `[3,2,5,4]`, wave size `[2,3,3,2]`, cadence
    `[2,3,3,2]`.
  - Relic: enemy count `[1,1,3,3]`, cadence `[2,2,2,2]`, wave size
    `[2,1,5,4]`.

### Verified
- Every mission type's final settings landed within a consistent, modest
  band of target (typically within 5-10 points), with real, honestly
  reported volatility on specific tiers (Boss Hunt T2/T3, Defense across
  the board, Stalk T4) that repeated re-testing could not fully resolve --
  documented rather than papered over with a single favorable reading.
- Full combat sanity sweep after every individual mission type's re-tune,
  all clean, no crashes. Final full combat sanity sweep across all 6
  mission types x 4 tiers on the truly final packaged file, clean.

### Known Issues (carried into [Unreleased])
- **Found immediately after this version's balance work was believed
  complete, while preparing session handoff documentation**: a second
  squad-generation bug, separate from the one this version's own Fixed
  section describes. Every T4 test this entire session used an uncapped
  `squadVetLevel=4`, but `MAX_VETERAN_LEVEL=3` -- the real game's actual
  maximum. Every T4 balance number shipped in this version was tested
  against an impossible, over-leveled squad. Confirmed directly: a
  "level 4" test recruit carried ATK 11 / HP 32 versus the real level-3
  maximum of ATK 8 / HP 24. Re-tested against the correctly-capped
  squad: Boss Hunt T4 (81%) and Stalk T4 (77%) now read as too hard;
  Defense T4 (93%) and Explore T4 (92%) now read as too easy; Purge T4
  (85%) and Relic T4 (87%) happen to still be in range. **Boss Hunt,
  Stalk, Defense, and Explore's T4 tiers need re-tuning before the next
  version ships** -- this version's shipped T4 numbers for those four
  mission types should not be trusted. Fixed defensively in the test
  harness (`runTrialWithMission`/`runTrialWithStallDetection`/
  `runReclaimTrial` now cap `squadVetLevel` internally, so this specific
  mistake can't recur), but the affected constants themselves are
  unchanged pending re-tuning.
- Boss Hunt T3 and Defense (all tiers) showed the most persistent
  volatility during re-tuning -- settings are within a reasonable band
  but not as tightly locked as other mission types.
- Region-reclass mutation consolidation (Snare→Slow, remaining retags)
  still deferred.
- Elysium Hunt and Agora Toll still use the original, more aggressive
  templerite-tier wave formula -- never brought in line with Temple's or
  Arena's gentler treatment.

---

## [v2.1.3] — Temple Region Rework: Darkness/Tithe, Chain Rebalance, The Endless Rite, Unlock Condition (Significant)

### Changed — Significant
- **Darkness/tithe tuning**: `DARKNESS_PER_TITHE` raised 12→14 (closest integer
  to a requested ~66-mission doom clock that still preserves guaranteed
  eventual game-over -- 15+ creates a permanent sustainable steady-state,
  confirmed via direct simulation). Lands at 59 missions under continuous
  play. Waiting (`advanceDayAction`, a day advance with no mission attempted)
  previously only charged upkeep -- darkness and the tithe clock stood
  still, letting a player wait indefinitely with zero pressure. Now mirrors
  the exact tithe-then-darkness sequence a real mission end uses.
- **Temple chain rebalance**: starting enemy count set static at 3 across
  all 4 steps (was a backwards-scaling 6/5/3/2). Root cause for a set of
  unexplained losses: `cleanse`-type missions share the same wave-
  reinforcement list as 5 other mission types, but place objectives far
  from spawn by design and have no round limit -- a wave cadence tuned for
  shorter engagements let one mission snowball to 28 total enemies by round
  16. New per-step wave size/cap arrays replace the shared formula, tuned
  against a 90/85/80/75% target curve. A new reusable test harness addition
  (`RECLAIM_REGIONS`/`runReclaimTrial`/`testRegionStep`) now covers all 4
  reclaim-chain regions going forward, not just Temple.
- **The Endless Rite** (Temple's chain-ending unlock boss) went from a
  confirmed literal 0% win rate to 46.7%, across five rounds of
  investigation: boss reworked from the old pre-rework formula onto the
  same `buildBossHuntElite()` system built for Boss Hunt; gentler wave
  treatment plus a new 2-round delay before reinforcements start after the
  boss ambushes (traced directly to a trial where the boss sat untouched at
  91/91 HP while the squad wiped to leftover starting enemies); starting
  count reduced 8-9→4→3; wave cap reduced 6→4 after tracing a 128-round
  outlier to Broodmother's own Brood Swarm ability acting as a second,
  uncapped reinforcement stream independent of the wave-cap system (left
  uncapped per direction, accepted as a natural characteristic of that
  archetype). The single biggest lever: `buildBossHuntElite()`'s
  `TARGET_HITS` formula was only ever tested across Boss Hunt's own tier
  range (max 18 hits at T4) -- Endless Rite's mission tier of 6 was silently
  extrapolating it to 24, never validated. Capping the tier fed into the
  formula at 4 took win rate from 13.3% to 46.7% in one change.
- **Temple unlock condition** replaced an invisible mechanic (silently
  counting missions where a Heal/Cast-background recruit merely existed in
  the squad) with one matching the pattern already used by the other 3
  reclaimable regions -- tied to an already-visible, thematically-matched
  resource. Temple now uses total darkness reduced via successful tithe
  payments (100 threshold, ~7 tithes), reinforcing the darkness/tithe system
  reworked in this same version rather than an undiscoverable requirement.

### Verified
- Feasibility re-check (the original question motivating this version):
  expected-attempts math against final tuned values puts reaching
  Temple-reclaimed plus a Lv3 Darkwarden at ~25.7 expected missions against
  the 59-mission darkness budget (44% used) -- confirmed comfortably
  feasible. At the start of this version's work, the same question had a
  hard "no": the Endless Rite's 0% win rate made the path structurally
  impossible at any mission count.
- Two self-caught math errors during the darkness/tithe work, corrected
  before shipping rather than glossed over: an initial "33 missions" claim
  was wrong (real answer: 23), traced to the test simulator applying the
  darkness rise before that mission's own tithe reduction, backwards from
  the real game's order. A wave-counter reset bug and a stale-test-file bug
  (a cached script missing the latest formula produced a bogus 5% reading
  contradicted by a 12/12-win manual trace) were also caught mid-session.
- Full combat sanity sweep across all 6 mission types x 4 tiers shows no
  crashes.

### Known Issues (carried into [Unreleased])
- T2's Temple chain step tuning is noisier than the others (a repeat run at
  identical settings showed 72.0% vs. an earlier 82.0%) -- true value likely
  somewhere in the low-to-high 70s, not pinned down further.
- Region-reclass mutation consolidation (Snare→Slow) still deferred.
- Capstone/Arena Bout boss stat rework still deferred.
- Elysium Hunt and Agora Toll still use the original, more aggressive
  templerite-tier wave formula -- not brought in line with Temple's gentler
  treatment in this pass.

---

## [v2.1.2] — Enemy Pathfinding + Stat-Math Bug Fixes + Full Boss Stat Model Rewrite (Significant)

### Fixed — Critical
- **Enemy pathfinding**: reported directly from a real Boss Hunt
  screenshot — two minions stuck directly behind the boss, never
  routing around despite open tiles being available. Root cause:
  `enemyAct()`'s movement was a naive greedy step-toward-target loop
  whose only fallback (try pure-X or pure-Y if the diagonal step was
  blocked) is a no-op whenever the target is in a straight line rather
  than diagonal — exactly the reported case. Fixed by reusing the game's
  own existing Dijkstra pathfinder (`dijkstraSweep`/`findPath`), already
  proven since player movement-range preview and click-to-move have
  depended on it — enemies simply never used it. Flagged directly: this
  makes the game somewhat harder on average, independent of anything
  else, since enemies that used to get stuck now reliably reach the
  squad.
- **Five related stat-math bugs**, reported together and traced to two
  root causes:
  - Every percentage-based buff/debuff (9 separate call sites across
    Lv2 abilities, Lv3 skills, and enemy abilities) computed its delta
    against the target's CURRENT, potentially already-modified stat
    rather than a stable base — stacking effects compounded
    multiplicatively, and a buff applied to an already-negative stat
    made it more negative instead of correcting it. Fixed with a
    `base{atk,def,init,move}` snapshot taken once battle begins (and at
    each of the 3 mid-battle spawn points, which need their own since
    they happen after that snapshot), and repointed all 9 sites at it.
  - Floor-at-zero: even with the base-stat fix, multiple different
    debuff sources stacking against the same base can still sum past
    zero. Clamped once at the point combat math actually reads the
    value (`attackUnit`'s rawAtk/rawDef/rawInit) rather than chasing a
    floor into every individual application site.
  - Splitting: clones were observed still carrying the Splitting
    mutation, risking runaway re-splitting. The `hasSplit` flag alone
    should have prevented this — made it structurally impossible
    instead, stripping `'Splitting'` from both copies' mutation lists
    the moment a split resolves.

### Changed — Significant
- **Boss stat model rewritten twice this pass**, each iteration driven
  by a measured failure, not assumption. First rewrite: HP now derives
  from the actual deployed squad's average damage output against a
  tier-scaled hits-to-kill target (final curve: 4 hits at T1, +2 per
  tier), replacing a fixed archetype multiplier confirmed too strong in
  real play — the first version of this fix used a flat 25-hit target
  at every tier and produced a 221 HP T1 boss with a confirmed 0% win
  rate, since 25 hits was only ever validated at T4. Second rewrite:
  ATK/DEF are now pinned to HP (scaled by how much bigger this boss's HP
  is than its own archetype's base HP, preserving the archetype's
  internal proportions) instead of an unrelated degree-exponent —
  dampened with a square root (an 8x-HP boss would otherwise mean 8x
  ATK, a near-guaranteed one-shot), then capped at 2.5x on top of that
  after diagnostic tracing showed sqrt-dampening alone wasn't enough for
  low-base-HP archetypes (Crawler/Hound/Viper/Broodmother) specifically.
- One bug caught mid-process, not glossed over: a `degreeHpMult` formula
  assumed the wrong baseline for the regular-boss `degree` value (2, not
  1, per a convention locked in earlier), silently giving regular bosses
  a capstone-intended 1.5x HP multiplier — found by directly
  re-verifying a suspicious result by hand rather than accepting it.
- Boss Hunt minion count tuned separately once boss-only isolation
  testing showed the boss alone performing well (82-100% win rate at
  every tier) while the full mission lagged 20-53 points behind at
  every tier — minions, untouched by the boss-specific work, were the
  actual bottleneck. Final curve: 2/2/10/10 minions across T1-4 (floor
  of 2, never 0 or 1, per direction). T3 and T4 both showed strong
  resistance to modest count increases before responding to a much
  larger jump; T4 specifically overshot hard (26.7% win rate) at one
  intermediate value before narrowing back to target.

### Verified
- Direct functional tests against real `attackUnit()`/`checkSplitting()`/
  `enemyAct()` calls for every fix, not mocks.
- Final matched-tier/level Boss Hunt results: T1 90.0% (target 85%), T2
  66.7% (target 75%), T3 71.7% (target 65%), T4 51.7% (target 55%) — all
  four within normal sampling noise of target.
- One stale-test-file bug caught mid-iteration (a cached test script
  hadn't picked up the latest minion-count formula, producing a bogus
  5% reading that contradicted a 12/12-win manual trace) — rebuilt fresh
  and re-verified before trusting any further results, rather than
  reporting the contradiction as a real finding.
- Full combat sanity sweep across all 6 mission types x 4 tiers shows no
  crashes.

### Known Issues (carried into [Unreleased])
- Capstone/Arena Bout still on the older, un-rewritten boss stat model
  — only Boss Hunt got the full HP-relative-to-squad-damage +
  pinned-ATK/DEF rework in this pass.
- Region-reclass mutation consolidation (Snare→Slow, remaining retags)
  still deferred.
- GitHub index (`index.html`) and this changelog file must be updated
  with every future version going forward — process gap identified
  after this release (the index wasn't updated for v2.1.2 until
  flagged, and this file hadn't been updated since v2.0.46).

---

## [v2.0.46] — Removed Redundant "New Campaign" from Capstone Victory

### Changed — Minor
- Removed "Begin a New Campaign" from the capstone Victory screen
  (`renderVictory()`) — redundant next to "Continue the Legend", which
  is already the correct path into the post-capstone region-reclaim
  content, and starting fresh right after finally winning the capstone
  isn't something the flow should be inviting at that exact moment.
- New-campaign capability is untouched everywhere it's actually
  appropriate: still on the persistent header (available from any
  screen) and on `renderGameOver()` (a genuinely different context —
  campaign-ending loss, where starting fresh is the only sensible next
  step).

### Verified
- Confirmed the remaining `startNewCampaign()` button belongs to Game
  Over, not a second instance of the same issue, before leaving it
  alone.
- Full combat sanity sweep shows no regressions (UI-only change).

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

---

## [v2.0.45] — Fixed: Remaining INIT References (Trinkets + Merc Skills)

Reported: Silver Torc, Quicksilver Ring, Arcane Surge, and Disarming
Strike still showing INIT.

### Root cause
The real scope was much bigger than the 2 reported items: **13 separate
places** doing raw `s.toUpperCase()` on stat keys, completely bypassing
the v2.0.17/v2.0.31 AGI-labeled formatters. `formatTraitMods` and
`describeAbility` were fixed back then, but the *live* battle-log/
button-label generation code (`useAbility`, `resolveSkillAttack`,
`useSpecializationSkill`) independently built its own stat-name strings
and was never audited. Also found a **third, previously-undiscovered
parallel formatter**, `describeSkill()` (used by the Lv3
specialization-choice screen and the live battle-screen action button),
with its own 4 raw `toUpperCase()` calls.

### Fixed
- Added a shared `statAbbrev()` helper and routed all 13 real sites
  through it: the 2 reported trinkets, Arcane Surge's and Disarming
  Strike's live battle-log text, the Lv2 ability-choice screen, the Lv3
  specialization-choice screen, the live battle-screen action button
  (arguably the *most* visible instance of all — shown every turn), and
  the permanent-injury tag (`INJURY_TYPES` includes init-affecting
  injuries too, so this was also silently affected).

### Caught mid-process
- Two `str_replace` edits accidentally dropped adjacent lines while
  trimming a `toUpperCase()` call down to a `statAbbrev()` call — one
  caused a real syntax error (an `if(effectiveSetToZero){` opening
  brace vanished, breaking the if/else-if/else chain), the other
  silently dropped an `effectLabel` assignment. Both found via
  syntax-check and direct output testing before shipping, not left in.

### Verified
- `statAbbrev()` correctness confirmed for all 5 mapped stats.
- Full scan of `describeSkill()` output across every
  `SPECIALIZATION_SKILLS` entry for lingering "init" — none found.
- Direct simulation of the exact Arcane Surge and Disarming Strike code
  paths (self-buff label, live-debuff label, Lv2-choice-screen label,
  battle-button label) — all four independently confirmed "AGI".
- 15 real, fully-simulated missions checked for lingering INIT in actual
  battle logs — none found.
- Full combat sanity sweep shows no regressions.

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

---

## [v2.0.44] — Fixed: Dropdown Tooltips Getting Cut Off

Reported: battle log ability tooltip getting clipped.

### Root cause
`tappableTag()`'s panel had no way to override the default `.taginfo`
80px max-height cap — that cap was sized for short single-clause
tooltips, but `describeAbility()` output (added v2.0.31) can run to 2-3
combined clauses.

### Fixed
- Added an optional 5th `panelStyle` parameter to `tappableTag()`
  (backward-compatible — every existing call site without it is
  unaffected), rather than a one-off patch, since the same clipping
  could recur anywhere long content meets this function.
- Fixed the reported case (battle log, longest actual description 168
  chars) plus two others found by auditing all `tappableTag()` content
  lengths while investigating, rather than stopping at the one instance:
  the Caster tag tooltip (204 chars — even longer than the reported
  case) and the Deploy screen's mutation-scouting tooltip (a
  3-mutation enemy's combined description runs 207 chars across
  multiple lines — likely the worst case of the three).
- All three now use `max-height:180px`, sized with margin above the
  measured longest real content rather than guessed.

### Verified
- `tappableTag()`'s backward compatibility confirmed — calls without
  the 5th param render identically to before.
- The new parameter confirmed to apply the custom style correctly and
  independently of the existing `extraStyle` (tag-level) parameter.
- Full combat sanity sweep shows no regressions (UI-only change).

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

---

## [v2.0.43] — Bonds: Capped at 1, Reset on Death

### Changed
- **Capped**: previously stacked — a recruit bonded with both other
  squad members got the +1 ATK/+1 DEF bonus *twice*, applied
  unconditionally per qualifying pair. Now checks each side
  independently before applying and skips a unit that's already
  received its one bond bonus this battle — a unit bonded with 2
  partners still only gets 1 bonus, but their other bonded partner (if
  not yet bonused) still gets theirs.
- **Reset on death**: `missionsWith` previously just went orphaned when
  a partner died — harmless in practice since recruit IDs are never
  reused, but not an explicit, intentional reset. Now explicitly clears
  the survivor's entry for any recruit who truly falls, using the final
  death list (after the injury-survival roll resolves), not the initial
  hp≤0 one.
- Company Hall's bond tooltip now notes the cap whenever a recruit has
  more than one qualifying bond, since each tag previously claimed the
  full bonus independently, overstating the total for that case.

### Verified
- Cap confirmed via a 3-recruit squad with all 3 pairs bonded (worst
  case) — every unit landed at exactly +1, not +2 or +3, through a real
  `beginBattle()` call.
- Reset-on-death verified twice: a simple forced-death case, and the
  tricky edge case where one recruit truly dies and another is pulled
  back by the injury-survival roll in the same battle — confirmed the
  injury-survivor's bond with the truly-dead partner resets correctly
  while their bond with a still-alive third recruit stays intact.
- Company Hall confirmed to render without error for both single-bond
  and multi-bond recruits.
- Full combat sanity sweep shows no regressions.

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

---

## [v2.0.42] — New: Replace Mission Button

### Added
- **Replace Mission** button on the Expedition Board — pays gold to swap
  one random mission for a freshly generated one.
- Cost is exactly double `refreshCandidatesCost()` (Recruitment
  Office's pool-refresh price) with the same rep-tier scaling: 20/30/40/50g
  across tiers 0-3.
- No confirm step, matching `refreshCandidates()`'s own pattern —
  straightforward gold-gated action, not a destructive/irreversible one
  like Retire or Ordain.

### Verified
- Cost confirmed exactly 2x `refreshCandidatesCost()` at every rep tier
  tested.
- Swap logic confirmed to replace exactly one mission (2 of 3 originals
  remain) and deduct the correct amount.
- Insufficient gold confirmed to block the action entirely (gold and
  mission list both unchanged).
- Full combat sanity sweep shows no regressions (economy-only change).

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

---

## [v2.0.41] — Removed Temple's Recruitment Bias

### Changed
- Removed Temple's caster/healer recruitment bias (`templeBias: true →
  false`), matching the exact treatment Thieves' bias got in v2.0.15.
- Static `desc` ("Healing, learning, and light against the dark") left
  untouched — identity flavor tied to Temple's other real bonuses
  (cheaper upkeep, slower Darkness growth, faster rest recovery), not a
  mechanic claim, same reasoning as leaving Thieves' "Light fingers"
  alone.
- Auto-generated tagline text ("more healers & casters in recruitment
  pool") is conditional on the flag itself, so it suppresses
  automatically with no separate edit needed.

### Verified
- Flag confirmed `false`.
- A 300-roll recruitment sample under Temple patron showed 18.3%
  Heal/Cast-eligible backgrounds — closely matching the expected
  unbiased baseline (4 of 20 background types = ~20%), a sharp contrast
  to the ~52% the old 40%-chance-per-roll bias would have produced.
- Full combat sanity sweep shows no regressions.

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

---

## [v2.0.40] — MAJOR BUG FIX: Capstone Repeatable Post-Victory

The capstone was repeatably attemptable for its full 600g/50rep reward
even after being won.

### Root cause
`G.hasWon` gets set `true` on capstone victory (`endBattle`), but it was
only ever *checked* elsewhere to unlock the post-capstone region-reclaim
layer — never to gate the capstone mission itself back out.
`buildCapstoneHtml()` showed the "Face [boss]" attempt button
unconditionally whenever the rep/veteran readiness thresholds were met,
with no check for whether it had already been won.

### Fixed
- Fixed at both the display and function level (defense in depth, same
  pattern as the debuff-revert safety net): `buildCapstoneHtml()` now
  shows a "conquered" state instead of the attempt button once
  `G.hasWon` is true, and `embarkCapstone()` itself now refuses to
  proceed even if called directly.

### Verified
- Two passes — first pass caught my own test-fixture gap (forgot to set
  `G.maxVeteransEverAchieved`, so the readiness check was false
  throughout and the positive case was never actually exercised).
  Rebuilt with the readiness threshold properly satisfied: confirmed the
  button correctly shows when legitimately ready and not yet won,
  correctly shows the conquered state instead once won, and
  `embarkCapstone()` confirmed to refuse deployment after a win.
- Full combat sanity sweep shows no regressions.

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

---

## [v2.0.39] — Embark Confirm Gate for Incomplete Squads

Reported: "only two mercenaries were selected when I intended 3."
Considered a Back button first, but it would've needed to either lose
the embarked mission from the board or restore it — more plumbing for a
less direct fix. Went with gating the commit itself instead.

### Added
- A squad under 3 now requires a second confirming tap before embarking,
  matching the established two-click pattern (Retire, Ordain, Expand
  Barracks).
- `confirmEmbarkAndDeploy()`, shared by all 10 embark-family functions
  (`embark`, `embarkArenaBout`/`Mission`, `embarkAgoraMission`/`Toll`,
  `embarkElysiumMission`/`Hunt`, `embarkTempleMission`/`Rite`,
  `embarkCapstone`), which otherwise duplicated the exact same final
  commit pair verbatim.
- `embarkButtonHtml()`, a shared renderer for all 10 corresponding
  buttons — same duplication existed there too.

### Changed — Minor
- `embark()` itself needed special handling since it has a side effect
  (swapping the picked mission out of the board for a new one) that
  must happen *after* confirmation, not before — restructured inline
  rather than routing through the shared helper, so a first tap with an
  incomplete squad never touches the board.
- `toggleSquad()` now resets the confirm flag on any selection change,
  so a stale confirm-armed state can't carry over after the squad is
  fixed.

### Verified
- Confirm arms on the first call without starting deployment; second
  call proceeds correctly with the right mission object.
- `toggleSquad` confirmed to clear the stale confirm flag.
- `embark()`'s mission-board swap confirmed to only fire on the
  confirmed (second) call, not the first.
- Full combat sanity sweep shows no regressions.

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

---

## [v2.0.38] — INIT Check + Chronicle Reordered

### Checked, no fix needed
- Searched exhaustively for lingering INIT/Initiative text — case-sensitive
  grep, case-insensitive grep, and direct output testing of
  `formatTraitMods()` (trinket tooltips) and `describeAbility()` (all 44
  ability descriptions, including Cheap Shot which specifically targets
  init+def). Zero player-facing instances found anywhere. Every
  remaining match is either changelog history, the unrelated
  "Initialization" section comment, or the coincidental `AFFINITY`
  substring. Likely a stale cached build on the reporting end.

### Changed — Minor
- Chronicle strip moved above the Camp breadcrumb/nav-pills block in
  `renderNavShell()` (shared by Company Hall, Recruitment Office,
  Expedition Board, Reclaimed Territories, and the region-reclaim
  pages) — was previously sandwiched between the nav pills and the page
  content; now sits directly below the header on every page that uses
  this shared shell. Pure reorder, no content or behavior changed.

### Verified
- Full combat sanity sweep shows no regressions (layout-only change).

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

---

## [v2.0.37] — New: Hall of Fame

Requested feature. Found and fixed a real blocker first: recruits who
died in battle previously vanished with zero trace — `endBattle()`'s
fallen-filter just removed them from `G.roster`, losing every stat
permanently. Retired recruits were already fine (`G.retirees` is a
permanent archive); death just never got the same treatment.

### Added
- `G.hallOfFameArchive`, populated right before the existing
  fallen-filter line so nothing is lost anymore, mirroring the retirees
  pattern. `allEverRostered()` combines active roster + retirees +
  archive into one list, each entry tagged `active`/`retired`/`fell`.
- **14 categories**, per direction ("add all existing tracked stats"):
  kills, damage dealt, damage taken, missions completed, elites/bosses
  slain, heals given, dodges, flawless missions, times wounded, deaths
  cheated, first kills, battles fought while wounded, items found,
  longest deployment streak.
- New **Hall of Fame** button in Company Hall — top 5 shown per
  category, each entry tagged with its status.

### New tracking
- **`damageTaken`** didn't exist before. Required auditing every place a
  unit's HP can decrease (7 total spots) to find the ones where a
  player could be the one taking damage — 5 needed hooks (normal
  attacks, Spore Contagion, mutation splash, reflect/thorns, Corrosive
  counter-damage), 2 correctly excluded (Cast Bolt and the enemyDamage
  skill effect can only ever target enemies). `resolveSkillAttack` and
  `useEnemyAbility` (Elder's Wrath's home function) both route through
  `attackUnit` internally, so one hook covers both automatically.
- **`peakConsecutiveDeployments`**: the existing `consecutiveDeployments`
  resets to 0 whenever a recruit sits out an expedition, so using it
  directly for "longest streak" would show current streak instead of
  best-ever. Added a separate never-decreasing field instead.

### Verified
- `allEverRostered()` confirmed to combine and tag all three sources
  correctly; `renderHallOfFame()` confirmed not to throw on empty and
  populated data.
- Full end-to-end test using the same `beginBattle()`/deploy pattern
  established throughout this project (real patron object, real
  `genRecruit()` output, real deployment): a recruit forced to fall
  mid-battle with real stats correctly landed in the archive with the
  right cause, was removed from the active roster, and showed up
  correctly tagged — including a full `renderHallOfFame()` pass against
  that real post-battle state, not just isolated function checks.
- Full combat sanity sweep shows no regressions.

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

---

## [v2.0.36] — Compact Header Extended to Deploy

### Changed — Minor
- The v2.0.34 compact header was scoped to battle only, but Deploy has
  the same problem (big header eating space above a screen that's also
  mostly about the grid) — confirmed via screenshot that what was being
  reported as "still full-size" was actually the Deploy screen, not
  Battle. Battle itself was already correctly compact and already
  hiding the icon+patron chip; Deploy just wasn't included in the
  toggle yet.
- Broadened the `render()` toggle from `G.screen==='battle'` to
  `(G.screen==='battle'||G.screen==='deploy')`, and renamed the CSS
  class from `battle-compact` to `compact-header` since it's no longer
  battle-specific — same CSS rules otherwise, unchanged.

### Verified
- Toggle confirmed to apply the class on both battle and deploy, and
  correctly stay empty on patron/landing/result.
- Full combat sanity sweep shows no regressions (UI-only change).

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

---

## [v2.0.35] — Block Chance Scales with DEF Advantage

### Changed
- Block chance now scales with how much greater the defender's
  effective DEF is than the attacker's ATK, replacing the flat 20%:
  - **<50% greater** → 20%
  - **<100% greater** → 40%
  - **≥100% greater** → 60% (cap)
- `DEF === ATK` (0% greater) still qualifies for the lowest tier,
  matching the old system's inclusive `atk<=effDef` boundary.
- `DEF < ATK` now gives a genuine 0% (no block possible at all) — a
  real behavior change from before, where equal-or-lower ATK than DEF
  was the only gate, with no distinction between "just barely
  qualifies" and "wildly outclassed" beyond a flat 20% either way.
- Updated Help's Block paragraph to explain the new scaling instead of
  the old flat number.

### Verified
- All 8 boundary cases (DEF<ATK, exactly equal, just under each
  threshold, exactly at each threshold, and well past the top one)
  confirmed to produce the exact expected tier.
- Full combat sanity sweep shows no regressions — genuine combat-math
  change, not cosmetic, so this got the same trial-based check as any
  other balance change.

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

---

## [v2.0.34] — Block Chance Confirmed + Title & Battle Header Fixes

### Checked, no fix needed
- **Block chance** is a flat, non-scaling 20% whenever `ATK ≤ effective
  DEF`, 0% otherwise — never higher, never 100%. Help's existing text
  was already accurate. No "double attack"-style scaling tied to block
  exists anywhere in the file; that's likely `repeatHit` (Twinstrike
  Fury) or `dualTarget` (Dual Talonstrike/Twin Fang) being recalled
  instead — unrelated specialization abilities.

### Changed — Minor
- **Title**: removed "Vertical Slice" from both the browser `<title>`
  and the in-game `<h1>`, merged the version number directly into the
  h1 instead of a separate small div below it.
- **Battle-screen header** was taking up too much vertical space. Added
  a `#mainHeader.battle-compact` class, toggled in `render()` scoped
  specifically to `G.screen==='battle'` (every other screen keeps the
  full header untouched): smaller h1, expedition/flavor sub-text
  hidden, portrait+patron-name chip hidden, and Help/New Campaign
  shrunk into a dedicated space-between row.

### Verified
- Ran a real battle and confirmed `render()` executes the new toggle
  line without throwing, on every call, before all early-return
  branches.
- Confirmed every `battle-compact` CSS selector matches its JS string
  exactly, no typos.
- Full combat sanity sweep shows no regressions (UI-only change).

### Note
- Couldn't verify class-toggle *persistence* through the harness, since
  its DOM shim's `getElementById()` returns a fresh fake element on
  every call rather than a persistent node — a harness limitation, not
  something that affects the real browser-facing code (`className`
  assignment is standard DOM API).

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

---

## [v2.0.33] — Debuff Death Fix + Stat Coloring + Mission Explanations

Three parts, all requested together.

### Fixed
- **Debuffs (Elder's Wrath and all others) now end on the caster's
  death**, not just on normal turn-based expiry. Previously neither
  debuff system had any death trigger at all, so a debuff from a caster
  who never got another turn just sat active indefinitely. This was the
  root cause of the reported bug — Elder's Wrath's DEF-0 debuff
  surviving all the way to the Company Hall screen, because the
  debuffed recruit didn't get enough further turns before the battle
  ended for the countdown to finish, and `endBattle()` had no cleanup
  for leftover temp mods at all.
- Added caster-id tracking to `applyTempMod` (updated all 14 call
  sites) and a new `revertDebuffsFromDeadCaster()`, wired into all 5
  separate death-finalization spots in the file (only 2 of which shared
  code before this fix).
- Added a hard safety-net at `endBattle()` that force-reverts anything
  still outstanding on the whole squad regardless of cause, as a
  guarantee against any future edge case doing the same thing.

### Added
- **Buffs/debuffs now visibly color-code the affected stat number** in
  the shared ally/enemy status panel — green for buffed, red for
  debuffed. The underlying numbers were already live and correct; this
  makes a modification visible at a glance instead of only technically
  correct.
- **Mission-type explanations** in Help's Choosing a Mission section for
  all 6 core types — each verified against exact code before writing.
  Explore's instant-claim, Purge's 2-round hold, and Relic's
  whole-squad-must-return requirement are genuinely different
  mechanics, not variations on a theme, and Help now explains each one
  precisely.

### Verified
- Ran 25 real, fully-simulated missions with a persistent squad,
  checking for leftover debuff-tracking entries after every single
  one — zero found.
- `statModDirection()` confirmed correct for buffed/debuffed/untouched
  stats.
- Full combat sanity sweep shows no regressions across all three parts.

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

## [v2.0.32] — Help: Block Mechanic Visibility

### Changed — Minor
- Block was already explained in Help (added in v2.0.30's Combat Stats
  paragraph), but as an unlabeled clause buried mid-paragraph next to the
  damage formula — easy to miss since it had no bolded lead-in term like
  every other Battle Basics sub-topic does. Split into three separately
  labeled paragraphs (**Combat Stats** / **Block** / **Dodge**) instead
  of one run-on paragraph. No content or mechanic changed, purely a
  visibility/scannability fix.

### Verified
- Syntax check only — text-only change, no combat logic touched.

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

## [v2.0.31] — Spawn-Edge Fix + Elder's Wrath Check + Ability Tooltips

### Fixed
- **Wave spawn edge bug**: waves were hardcoded to a fixed east-side band
  regardless of where the player actually entered — but the spawn zone
  is randomly west/east/north/south, so waves could spawn right next to
  or overlapping the player's entry area in ~75% of missions. Added
  `oppositeEdgePoint()`, computed relative to `G.battle.spawnZone.edge`,
  mirroring the original band width exactly for all 4 directions. Fixed
  at both wave-spawn call sites (main `spawnWave` loop + Trial's
  elite-wave branch).

### Investigated, no fix needed
- **Elder's Wrath**: confirmed working as designed. Universal boss
  ability (not archetype-specific), uses the boss's own attack range,
  single-target, normal damage. On a successful hit it also zeroes the
  target's DEF for ~2 turns before automatically reverting.

### Added
- **Tap-to-expand descriptions for special-attack log lines** (both
  enemy and ally), covering all 44 abilities across `BOSS_ABILITY`/
  `ENEMY_ABILITIES`/`BUFF_ABILITIES`/`SPECIALIZATION_SKILLS`. Built as a
  generic formatter (`describeAbility()`) reading each ability's raw
  mechanical fields into plain-English text, rather than 44 hand-written
  strings — self-maintaining, so a rebalanced or new ability gets an
  accurate tooltip automatically.
- Detects the combat log's consistent `"X uses Y!"` message pattern
  (same across all 4 usage call sites) via `ABILITY_LOOKUP`, a combined
  name→ability map.
- Log entries now carry a stable `id` (`G.battle.logIdCounter`) instead
  of relying on array position for the tappable-tag key — array index
  would have broken expand-state persistence once a long battle's log
  exceeds the existing 50-entry cap and old entries get shifted out.

### Verified
- All 4 spawn entry edges confirmed to produce waves strictly in the
  correct opposite-side band.
- All 44 abilities checked for suspiciously short/empty descriptions —
  caught and fixed one real gap during verification (Arcane Surge's
  plural `stats` array + `effectTarget:'self'` was silently dropped by
  a buff clause that only checked the singular `stat` field).
- Confirmed working end-to-end in a real fought battle (an actual
  "Elder Broodmother uses Brood Swarm!" log line correctly became
  tappable with the right description), not just checked in isolation.
- Full combat sanity sweep shows no regressions across all three
  changes.

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

## [v2.0.30] — Help Page: Combat & Healing Mechanics

All numbers checked against source before writing — same standard as
every prior Help pass.

### Added
- **Healing, Wounds & Injuries** section — Wounds (survive a mission
  ≤25% max HP, 2 random stats -1 each, mended 1/cycle + 25%/35% HP
  recovery while benched) vs. Injuries (30% chance to survive a
  would-be death instead, permanent -2 to one stat, never heals on its
  own). These are genuinely different mechanics, not a rename of each
  other, and Help now says so explicitly.
- **Combat Stats** paragraph in Battle Basics — the actual damage formula
  (`ATK − effective DEF + rand(-1,2)`, minimum 1), the 20% full-block
  chance when `ATK ≤ effective DEF`, and the dodge formula
  (`min(30%, AGI × 2%)`) — none of which were explained anywhere in Help
  before, despite being the core of every fight.
- **Casting & Healing** paragraph — Heal (2-4 HP, range 2, single-target)
  and Cast Bolt (power `3 + veteran level × 2`, armor-piercing,
  undodgeable, scales with veteran level) were previously only mentioned
  by name ("Heal/Cast Bolt if they have it") with zero explanation of
  what either actually does or how it scales.

### Changed — Minor
- Upkeep line now shows the exact formula
  (`2 + tier×3 + veteranLevel×2`/day) instead of just "scales with tier
  and level."

### Verified
- Full combat sanity sweep shows no regressions (text-only change).

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
