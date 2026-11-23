## [v2.4.6] — Audio Credit & Copyright in About (Minor)

### Added
- **Settings > About** now ends with two lines in the same small print as the
  font licence note:
  - "Music and sound effects: original, made for Last Light with 16-bit
    Studio (AI-assisted)."
  - "© 2026 Randall Allsup. All rights reserved."
- No outside licence requires credit: every sound and instrument was generated
  in code by 16-bit Studio, with no third-party samples (see
  `claude/music-studio/LICENCES.md`). The credit line is good practice and
  makes the AI involvement visible in the game; Steam's AI content disclosure
  is still needed at listing time.

### Verified
- Browser: About renders both lines at phone width (393 px), no console
  errors. Text only; no gameplay changes.
