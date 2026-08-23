# Last Light — Playtest Build
https://todocaldo.github.io/Last-Light-Testing/

A single-file browser game. No build step, no server, no dependencies —
just static HTML/CSS/JS that runs entirely in the browser.

## Files in this bundle

- **`index.html`** — landing page, links to the current playtest version.
- **`last-light-poc-v2_0_29.html`** — the actual game (current version).
- **`CHANGELOG.md`** — version history.

## Setting this up on GitHub Pages

**1. Create the repository**
- On GitHub, click **New repository**.
- Name it whatever you like (e.g. `last-light-playtest`).
- Keep it **Public** — GitHub Pages on a free account requires a public
  repo (unless you're on a paid plan with private Pages support).
- Skip adding a README/`.gitignore`/license at this step — you already have one.

**2. Upload the files**
Easiest path, no git command line needed:
- Open your new repo on GitHub → **Add file → Upload files**.
- Drag in `index.html`, `last-light-poc-v2_0_29.html`, and `CHANGELOG.md`.
- Commit directly to the `main` branch.

*(If you're comfortable with git instead: clone the repo, copy the files
in, `git add .`, `git commit -m "playtest build"`, `git push`.)*

**3. Enable GitHub Pages**
- In the repo, go to **Settings → Pages**.
- Under **Source**, select **Deploy from a branch**.
- Branch: `main`, folder: `/ (root)`. Save.
- GitHub will build the site — takes about a minute. Refresh the Pages
  settings page and it'll show your live URL, something like:
  `https://yourusername.github.io/last-light-playtest/`

**4. Share that URL**
That link opens `index.html` automatically, which links straight to the
playable build. Works on phones and desktop — nothing to install.

## Shipping a new version later

Each new version can just be added as a new file
(`last-light-poc-v2_0_30.html`, etc.) rather than overwriting the old
one — keeps prior versions around if you want to compare or roll back.
Update the `Play Now` link in `index.html` to point at the new filename,
re-upload both files (and the updated `CHANGELOG.md`), and the live site
updates within about a minute of the commit landing.

## Notes for playtesters

- Nothing is installed — it's a webpage.
- No progress is saved between visits (no server, no local storage by
  design) — every visit starts a fresh campaign.
- Best viewed on mobile in portrait, but works on desktop too.
