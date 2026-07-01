# Guitar Practice

A single-user web app for focused guitar chord-transition practice. You run
**5-minute drills on a single chord pair**, and the app always serves up the
pair you've practiced **least**. Built around a CAGED chord engine (12 roots ×
5 forms × 6 types) with generated fret diagrams.

## How it works

- **5-minute single-pair drills** — a session is one chord transition practiced
  for a fixed time (3 / 5 / 10 min) with a countdown timer. End early or skip a
  pair anytime; rate it (Struggled / OK / Nailed it) when the timer ends.
- **Least-practiced first** — practice is tracked by *shape signature* =
  `form : type : open|barre`, deliberately **ignoring the root note** (changing
  root just slides the same shape along the neck). That's 5 × 6 × 2 = **60
  distinct shapes**. The generator picks the directional shape-*pair* with the
  fewest practices, so you steadily fill in your weak spots and cover the board.
- **Progress dashboard** — day streak, total time, shape coverage (X / 60),
  activity heatmap, daily-minutes chart, least- and most-practiced shape pairs,
  optional rated-mastery breakdown, and recent drills.

No accounts, no auth. All data lives in a SQLite file.

## Run locally

```bash
npm install
npm start          # http://localhost:8080
```

Dev mode with auto-reload:

```bash
npm run dev
```

The database is created at `./data/guitar.db` (override with `DB_PATH`).

## Deploy (homelab)

With Docker Compose:

```bash
docker compose up -d --build
```

The SQLite database is stored in the `guitar-data` named volume, so it survives
rebuilds. App is served on port `8080`.

Or plain Docker:

```bash
docker build -t guitar-practice .
docker run -d -p 8080:8080 -v guitar-data:/data --name guitar guitar-practice
```

## Configuration

| Env var   | Default            | Description                  |
|-----------|--------------------|------------------------------|
| `PORT`    | `8080`             | HTTP port                    |
| `DB_PATH` | `./data/guitar.db` | SQLite database file path    |

## API

| Method | Path                    | Purpose                                   |
|--------|-------------------------|-------------------------------------------|
| POST   | `/api/sessions`         | Record a completed drill (pair, duration, rating) |
| GET    | `/api/practice-counts`  | Per-shape / per-pair practice counts (drives selection) |
| GET    | `/api/stats`            | Dashboard data                            |

## Project layout

```
server.js          Express server + REST API
db.js              SQLite schema, shape-signature stats, streak logic
public/
  index.html       App shell (Practice / Progress tabs)
  app.js           Chord engine, least-practiced selection, drill flow, dashboard
  styles.css       Styles
Dockerfile
docker-compose.yml
```
