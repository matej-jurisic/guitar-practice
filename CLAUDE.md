# CLAUDE.md

Single-user guitar practice web app (Node/Express + `node:sqlite`), deployed
to a homelab via Docker. See README.md for architecture and run commands.

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
