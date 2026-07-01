import { DatabaseSync } from 'node:sqlite';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const DB_PATH = process.env.DB_PATH || './data/guitar.db';

// Make sure the directory for the DB file exists (e.g. ./data or /data in Docker)
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// A "session" = one chord pair practiced for ~5 minutes.
// Practice is tracked by SHAPE SIGNATURE = form:type:pos (pos = open|barre),
// deliberately ignoring the root note (changing root just slides the shape).
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    pair_sig         TEXT    NOT NULL,
    a_root TEXT, a_form TEXT, a_type TEXT, a_pos TEXT,
    b_root TEXT, b_form TEXT, b_type TEXT, b_pos TEXT,
    rating           INTEGER,
    bpm              INTEGER,
    notes            TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);

  CREATE TABLE IF NOT EXISTS sig_pair_stats (
    pair_sig          TEXT PRIMARY KEY,
    a_sig TEXT, b_sig TEXT,
    a_form TEXT, a_type TEXT, a_pos TEXT,
    b_form TEXT, b_type TEXT, b_pos TEXT,
    times_practiced   INTEGER NOT NULL DEFAULT 0,
    total_seconds     INTEGER NOT NULL DEFAULT 0,
    last_rating       INTEGER,
    mastery           REAL,
    last_practiced_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sigpair_times ON sig_pair_stats(times_practiced);
`);

// Upgrade older DBs that predate the metronome (bpm column added later).
if (!db.prepare(`PRAGMA table_info(sessions)`).all().some(c => c.name === 'bpm')) {
  db.exec(`ALTER TABLE sessions ADD COLUMN bpm INTEGER`);
}

// ── shape-signature helpers (must match app.js) ──────────────────────
const sig = c => `${c.form}:${c.type}:${c.pos}`;
export const pairSig = (a, b) => `${sig(a)}>${sig(b)}`;

// ── prepared statements ──────────────────────────────────────────────
const q = {
  insertSession: db.prepare(`
    INSERT INTO sessions
      (started_at, duration_seconds, pair_sig,
       a_root, a_form, a_type, a_pos, b_root, b_form, b_type, b_pos, rating, bpm)
    VALUES
      (datetime('now', '-' || @duration_seconds || ' seconds'), @duration_seconds, @pair_sig,
       @a_root, @a_form, @a_type, @a_pos, @b_root, @b_form, @b_type, @b_pos, @rating, @bpm)`),

  getStat: db.prepare(`SELECT * FROM sig_pair_stats WHERE pair_sig = ?`),
  upsertStat: db.prepare(`
    INSERT INTO sig_pair_stats
      (pair_sig, a_sig, b_sig, a_form, a_type, a_pos, b_form, b_type, b_pos,
       times_practiced, total_seconds, last_rating, mastery, last_practiced_at)
    VALUES
      (@pair_sig, @a_sig, @b_sig, @a_form, @a_type, @a_pos, @b_form, @b_type, @b_pos,
       1, @duration_seconds, @rating, @mastery, datetime('now'))
    ON CONFLICT(pair_sig) DO UPDATE SET
       times_practiced   = times_practiced + 1,
       total_seconds     = total_seconds + @duration_seconds,
       last_rating       = COALESCE(@rating, last_rating),
       mastery           = @mastery,
       last_practiced_at = datetime('now')`),

  allStats: db.prepare(`SELECT pair_sig, a_sig, b_sig, times_practiced FROM sig_pair_stats`),

  leastPracticed: db.prepare(`SELECT * FROM sig_pair_stats ORDER BY times_practiced ASC, last_practiced_at ASC LIMIT ?`),
  mostPracticed:  db.prepare(`SELECT * FROM sig_pair_stats ORDER BY times_practiced DESC LIMIT ?`),

  recentSessions: db.prepare(`SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?`),
  allSessions:    db.prepare(`SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?`),
  getSession:     db.prepare(`SELECT * FROM sessions WHERE id = ?`),
  delSession:     db.prepare(`DELETE FROM sessions WHERE id = ?`),
  sessionsForPair: db.prepare(`SELECT rating, duration_seconds, started_at FROM sessions WHERE pair_sig = ? ORDER BY started_at ASC`),
  delStat:        db.prepare(`DELETE FROM sig_pair_stats WHERE pair_sig = ?`),
  recomputeStat:  db.prepare(`UPDATE sig_pair_stats SET times_practiced=@t, total_seconds=@s, last_rating=@lr, mastery=@m, last_practiced_at=@lp WHERE pair_sig=@k`),

  totals: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sessions)                          AS total_sessions,
      (SELECT COALESCE(SUM(duration_seconds),0) FROM sessions) AS total_seconds,
      (SELECT COUNT(*) FROM sig_pair_stats)                    AS unique_combos`),

  dailyActivity: db.prepare(`
    SELECT date(started_at, 'localtime') AS day,
           SUM(duration_seconds)         AS secs,
           COUNT(*)                      AS sessions
      FROM sessions
     WHERE started_at >= datetime('now', ?)
     GROUP BY day
     ORDER BY day ASC`),

  practiceDays: db.prepare(`
    SELECT DISTINCT date(started_at, 'localtime') AS day
      FROM sessions ORDER BY day DESC`),

  masteryBuckets: db.prepare(`
    SELECT
      SUM(CASE WHEN mastery < 0.8 THEN 1 ELSE 0 END)                  AS struggling,
      SUM(CASE WHEN mastery >= 0.8 AND mastery < 1.5 THEN 1 ELSE 0 END) AS learning,
      SUM(CASE WHEN mastery >= 1.5 THEN 1 ELSE 0 END)                 AS mastered
    FROM sig_pair_stats WHERE mastery IS NOT NULL`),
};

const ALPHA = 0.4;           // EMA smoothing for the optional rating-based mastery
const TOTAL_SIGNATURES = 60; // 5 forms × 6 types × {open, barre}

// Record a completed practice session and roll it into the shape-pair stats.
export function recordSession({ pair, duration_seconds, rating, bpm }) {
  const dur = Math.max(0, Math.round(duration_seconds || 0));
  const r = rating == null ? null : Math.max(0, Math.min(2, Number(rating)));
  const b = bpm == null ? null : Math.max(30, Math.min(300, Math.round(Number(bpm))));
  const key = pairSig(pair.a, pair.b);

  db.exec('BEGIN');
  try {
    q.insertSession.run({
      duration_seconds: dur, pair_sig: key, rating: r, bpm: b,
      a_root: pair.a.root, a_form: pair.a.form, a_type: pair.a.type, a_pos: pair.a.pos,
      b_root: pair.b.root, b_form: pair.b.form, b_type: pair.b.type, b_pos: pair.b.pos,
    });

    const existing = q.getStat.get(key);
    let mastery;
    if (r == null) {
      mastery = existing ? existing.mastery : null;          // no rating → leave mastery as-is
    } else {
      mastery = existing && existing.mastery != null
        ? existing.mastery * (1 - ALPHA) + r * ALPHA
        : r;
    }

    q.upsertStat.run({
      pair_sig: key,
      a_sig: `${pair.a.form}:${pair.a.type}:${pair.a.pos}`,
      b_sig: `${pair.b.form}:${pair.b.type}:${pair.b.pos}`,
      a_form: pair.a.form, a_type: pair.a.type, a_pos: pair.a.pos,
      b_form: pair.b.form, b_type: pair.b.type, b_pos: pair.b.pos,
      duration_seconds: dur, rating: r, mastery,
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return q.getStat.get(key);
}

// Counts the client needs to choose the least-practiced pair:
//   pairCounts[pair_sig]  – times that exact shape-pair was practiced
//   sigCounts[signature]  – times that individual shape appeared (as a or b)
export function getPracticeCounts() {
  const rows = q.allStats.all();
  const pairCounts = {};
  const sigCounts = {};
  for (const row of rows) {
    pairCounts[row.pair_sig] = row.times_practiced;
    sigCounts[row.a_sig] = (sigCounts[row.a_sig] || 0) + row.times_practiced;
    sigCounts[row.b_sig] = (sigCounts[row.b_sig] || 0) + row.times_practiced;
  }
  return { pairCounts, sigCounts };
}

// Full drill log, newest first (bounded so a runaway history can't blow up).
export function getAllSessions(limit = 2000) {
  return q.allSessions.all(limit);
}

// Delete one logged drill and recompute the affected shape-pair's stats from
// the sessions that remain (mastery is replayed as the same EMA recordSession
// uses, so the numbers stay consistent). Drops the stat row if nothing's left.
export function deleteSession(id) {
  const sess = q.getSession.get(Number(id));
  if (!sess) return { deleted: 0 };

  db.exec('BEGIN');
  try {
    q.delSession.run(sess.id);
    const remaining = q.sessionsForPair.all(sess.pair_sig);
    if (!remaining.length) {
      q.delStat.run(sess.pair_sig);
    } else {
      let total = 0, mastery = null, lastRating = null;
      for (const r of remaining) {
        total += r.duration_seconds;
        if (r.rating != null) {
          mastery = mastery == null ? r.rating : mastery * (1 - ALPHA) + r.rating * ALPHA;
          lastRating = r.rating;
        }
      }
      q.recomputeStat.run({
        t: remaining.length, s: total, lr: lastRating, m: mastery,
        lp: remaining[remaining.length - 1].started_at, k: sess.pair_sig,
      });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { deleted: 1 };
}

export function getStats() {
  const totals = q.totals.get();
  const buckets = q.masteryBuckets.get();
  const window = '-119 days';
  const daily = q.dailyActivity.all(window);
  const { current, longest } = computeStreaks(q.practiceDays.all().map(r => r.day));

  // signature coverage: how many of the 60 shapes have been practiced at least once
  const { sigCounts } = getPracticeCounts();
  const coveredSigs = Object.keys(sigCounts).length;

  return {
    totals: { ...totals, covered_sigs: coveredSigs, total_sigs: TOTAL_SIGNATURES },
    streak: { current, longest },
    mastery: {
      struggling: buckets.struggling || 0,
      learning:   buckets.learning   || 0,
      mastered:   buckets.mastered   || 0,
    },
    daily,
    leastPracticed: q.leastPracticed.all(8),
    mostPracticed:  q.mostPracticed.all(8),
    recentSessions: q.recentSessions.all(8),
  };
}

function computeStreaks(days) {
  if (!days.length) return { current: 0, longest: 0 };
  const set = new Set(days);
  const localISO = d => {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
  };

  let current = 0;
  const cursor = new Date();
  if (!set.has(localISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(localISO(cursor))) { current++; cursor.setDate(cursor.getDate() - 1); }

  const sorted = [...set].sort();
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const cur = new Date(sorted[i] + 'T00:00:00');
    run = Math.round((cur - prev) / 86400000) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return { current, longest };
}

export default db;
