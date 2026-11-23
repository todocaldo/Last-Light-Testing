## [v2.4.5] — Recorded Music (Minor)

### Changed
- **All six music moods are now recordings** instead of the synthesised
  placeholder ambience, made with 16-bit Studio v0.7.0 and converted from the
  WAV masters to Ogg Vorbis (q5) and AAC .m4a (128 kbps) in
  `last-light/audio/music/`:

  | Mood | Track | Length | Plays |
  | --- | --- | --- | --- |
  | `title` | Light in the Dark (A minor, 87 BPM) | 88 s | Loops |
  | `camp` | Embers at Dusk (D dorian, 97 BPM) | 99 s | Loops |
  | `battle` | Iron Pulse (D phrygian, 116 BPM) | 66 s | Loops |
  | `boss` | Final Trial (D harmonic minor, 160 BPM) | 48 s | Loops |
  | `victory` | Sunrise on the Hills (C major) | 27 s | Once |
  | `defeat` | Fading Crown (D minor) | 16 s | Once |

- **Seamless loops:** AAC adds a few hundred samples of padding at the end of a
  file, which would leave a gap where an .m4a loop restarts. `audio.js` now
  knows each loop's exact length and cuts the loop there. The .ogg files
  decode to the exact length already.
- **Victory and game over play once**, then go quiet (before, every recorded
  track would have looped).
- If the first tap starts the placeholder before a track has finished
  loading, the music switches to the recording as soon as it arrives.
- The Settings > Sound note no longer says the music is a placeholder.
- All 12 files total about 11 MB (5.3 MB Ogg + 5.5 MB M4A); a browser
  downloads only one format, about 5.5 MB. The WAV masters stay out of the
  build.

### Licence
- Original, AI-assisted compositions (chords and melodies written by Claude;
  bass, drums and instruments generated in code by 16-bit Studio). List them
  as AI-generated in the audio records sheet and in Steam's AI content
  disclosure.

### Verified
- Decoded sample counts: every .ogg matches its WAV master exactly; each .m4a
  starts in sync (offset 0) with 41–921 extra samples at the end, which the
  loop cut removes.
- Browser: all six .ogg tracks load (200); title, camp, battle, boss (capstone),
  victory and game over each play their recording; the game-over track ends
  after 16 s and stays silent; no console errors.
- No gameplay changes; the testing harness doesn't load audio.
