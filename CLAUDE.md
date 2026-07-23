# CLAUDE.md

Single-user guitar practice web app (Node/Express + `node:sqlite`), deployed
to a homelab via Docker. See README.md for architecture and run commands.

## Features (high level — check the code before relying on specifics)

- **Practice tab**: drills one CAGED chord *pair* at a time for a fixed
  length (3/5/10 min, countdown timer), with an optional on-beat metronome
  (bpm adjustable). End early or skip. Rate the pair (Struggled/OK/Nailed it)
  when the timer ends; rating feeds an EMA "mastery" score per pair.
- Chord engine: 12 roots × 5 forms (E/A/D/G/C) × up to 6 types (maj, min, 7,
  min7, maj7, pow5) × open/barre position, rendered as generated fret
  diagrams. Practice is tracked by *shape signature* (`form:type:open|barre`),
  ignoring root, since a barre shape is the same shape moved up the neck.
- **Least-practiced-first selection**: the app always serves the directional
  shape-pair with the fewest recorded practices, so weak spots and full
  fretboard coverage get filled in over time.
- **Levels** (`LEVELS` in `public/app.js`): curated filter-chip presets that
  gate the pool from open majors up to the full CAGED set, for progressive
  difficulty. Chips underneath stay individually editable after picking one.
- **Progress tab**: streaks, total time, shape coverage (X / 60), activity
  heatmap, daily-minutes chart, least/most-practiced pairs, mastery breakdown
  (struggling/learning/mastered), recent drills.
- **Drill log**: full session history on its own tab/list, each row
  individually deletable (deleting recomputes that pair's stats from
  remaining sessions).
- No accounts/auth. Single SQLite file (`db.js`), REST API in `server.js`
  (`/api/sessions`, `/api/practice-counts`, `/api/stats`).

## Working style — read this before touching UI/UX work

**The job is to write code. Not to install tooling to look at the code running.**

- Do not install browser automation (Playwright, Puppeteer, Chromium, jsdom,
  chromium-cli, etc.) to verify a UI or UX change — not even in a scratch/temp
  directory. This has happened before and wasted a large download and a pile
  of unrequested tool calls for what should have been a code edit.
- Do not write throwaway smoke-test / screenshot scripts for frontend changes.
  Make the change, say in one or two sentences what changed and why, and stop.
  The user runs `npm start` and looks at it themselves.
- `node --check file.js` for a syntax sanity check is fine. Starting the
  server and hitting an endpoint with `curl` to confirm an API response shape
  is fine. Anything beyond that — spinning up a browser, driving it, capturing
  screenshots — is not, unless explicitly asked for.
- If a change is genuinely hard to reason about without seeing it rendered,
  say so and ask the user to look and report back. Don't build a rig to look
  on your behalf.
- No new dependencies (npm packages or system tools, including in temp/scratch
  dirs) without asking first.
