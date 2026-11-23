## [v2.4.3] — Sound Player & Volume Controls (Minor)

### Added
- **Sound player (`audio.js`, new file).** Loaded after `sprites.js`, like the art
  renderer: the game core never waits on it, and the testing harness never
  loads it.
  - The game names moments with `sfx('cue_id')` (a no-op without `audio.js`).
    41 cues are wired: interface, progression (level-up, nickname, bond, item,
    a recruit falling, injury), weapon attacks per weapon, enemy attacks, hit,
    dodge, block, deaths, heal, cast, ability, skill, battle start, the player's
    turn, waves, objectives, the Arena ignite, boss arrivals, Darkened missions,
    mission won/lost, tithe paid/missed, Wait a Day, hire, embark.
  - **Placeholder sounds:** every cue is synthesised in the browser for now, so
    timing and feel can be judged before any recordings are bought. A recording
    listed in `audio.js`'s `FILES` (Ogg or M4A, whichever the browser plays)
    replaces its placeholder automatically.
  - **Music follows the screen** (title, camp, battle, region boss / Final
    Trial, victory, defeat) with a one-second crossfade. Generated ambience
    stands in until tracks arrive (`MUSIC_FILES`).
  - Repeated effects vary their pitch slightly; a gentle limiter stops stacked
    hits clipping; sound pauses when the app goes to the background.
  - Sound starts after the first tap (the existing `unlockAudio()`, which iOS
    needs).
- **Settings > Sound:** On / Muted, and Master, Music, Effects and Interface
  volume sliders (stored with the other settings; a slider plays a sample when
  released).

### Verified
- Seeded harness run unchanged: `480 84da79f121db1f940bd72620080a05cba4aee539 230`.
- Browser: audio starts on the first tap; all 41 cues play and produce signal;
  music switches title → camp → battle → camp; Muted silences everything and
  On restores it; sliders show and store their values; no script errors.
