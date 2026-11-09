## [v2.4.2] — Run Log (Minor)

### Added
- **Run log for playtest feedback.** The game keeps a compact record of the
  campaign: one row per mission (kind, tier, Darkened depth, result, rounds,
  squad levels going in, Weariness, deaths, injuries, level-ups, gold, Darkness,
  standing, roster size, Lv3-ever count, region progress), plus Wait a Day,
  tithes (paid or missed), hires, dismissals, Trainer retirements and version
  changes. About 1 KB per 4 missions.
- It's saved with the campaign. When a campaign ends (won, lost or abandoned
  through New Campaign) the log is also kept on the device as the "last
  finished campaign", so it survives the save being cleared.
- **Settings > Run log:** shows which campaign it covers, with **Copy run log**
  (to paste into a message) and **Download** (a .json file named with the
  version and day). Nothing is sent anywhere.
- Campaigns saved before this version start a log on load, marked with the day
  it began.
- Developer side: `claude/tools/runlog_report.py` summarises one or more logs
  (fights by kind and tier, milestones by mission number, Darkness and gold
  curves) beside the campaign simulator's reference numbers.

### Verified
- Seeded harness run unchanged: `480 84da79f121db1f940bd72620080a05cba4aee539 230`
  (every hook is skipped when there's no run log, as in the harness).
- Browser: rows recorded across missions, a tithe and a Wait a Day; the log
  survives a reload; Copy fills the clipboard and Download saves the file;
  game over keeps the log and the title's Settings shows it; smoke and save
  tests pass; no console errors.
