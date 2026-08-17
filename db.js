import { DatabaseSync } from 'node:sqlite';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const DB_PATH = process.env.DB_PATH || './data/guitar.db';

// Make sure the directory for the DB file exists (e.g. ./data or /data in Docker)
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const tableExists = n => !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(n);
const columns = t => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);

// Users are a "who's practicing" switch, not accounts — no password, no auth.
// The first user created is the admin and is the only one who may add or
// remove users. Everything else in the schema hangs off users.id.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL COLLATE NOCASE UNIQUE,
    is_admin   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// A "session" = one chord pair practiced for ~5 minutes.
// Practice is tracked per user, by SHAPE SIGNATURE = form:type:pos
// (pos = open|barre), deliberately ignoring the root note (changing root just
// slides the shape).
const SIG_PAIR_STATS_DDL = `
  CREATE TABLE IF NOT EXISTS sig_pair_stats (
    user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
    pair_sig          TEXT NOT NULL,
    a_sig TEXT, b_sig TEXT,
    a_form TEXT, a_type TEXT, a_pos TEXT,
    b_form TEXT, b_type TEXT, b_pos TEXT,
    times_practiced   INTEGER NOT NULL DEFAULT 0,
    total_seconds     INTEGER NOT NULL DEFAULT 0,
    last_rating       INTEGER,
    mastery           REAL,
    last_practiced_at TEXT
  )`;

// ── migrations from the single-user schema ───────────────────────────
// Pre-existing rows get user_id = NULL and are claimed by the first user
// created (see createUser) — that user is the person whose history it is.
if (tableExists('sessions')) {
  const cols = columns('sessions');
  if (!cols.includes('bpm')) db.exec(`ALTER TABLE sessions ADD COLUMN bpm INTEGER`);
  if (!cols.includes('user_id')) {
    db.exec(`ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  }
}
if (tableExists('sig_pair_stats') && !columns('sig_pair_stats').includes('user_id')) {
  // pair_sig was the primary key; it now has to repeat once per user, so the
  // table is rebuilt with a (user_id, pair_sig) unique index instead.
  const carried = ['pair_sig', 'a_sig', 'b_sig', 'a_form', 'a_type', 'a_pos',
    'b_form', 'b_type', 'b_pos', 'times_practiced', 'total_seconds',
    'last_rating', 'mastery', 'last_practiced_at'].join(', ');
  db.exec(`
    ALTER TABLE sig_pair_stats RENAME TO sig_pair_stats_legacy;
    ${SIG_PAIR_STATS_DDL};
    INSERT INTO sig_pair_stats (user_id, ${carried})
      SELECT NULL, ${carried} FROM sig_pair_stats_legacy;
    DROP TABLE sig_pair_stats_legacy;
  `);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
    started_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    pair_sig         TEXT    NOT NULL,
    a_root TEXT, a_form TEXT, a_type TEXT, a_pos TEXT,
    b_root TEXT, b_form TEXT, b_type TEXT, b_pos TEXT,
    rating           INTEGER,
    bpm              INTEGER,
    notes            TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(user_id, started_at);

  ${SIG_PAIR_STATS_DDL};
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sigpair_key   ON sig_pair_stats(user_id, pair_sig);
  CREATE INDEX        IF NOT EXISTS idx_sigpair_times ON sig_pair_stats(user_id, times_practiced);
`);

// ── shape-signature helpers (must match app.js) ──────────────────────
const sig = c => `${c.form}:${c.type}:${c.pos}`;
export const pairSig = (a, b) => `${sig(a)}>${sig(b)}`;

// Shape catalog — must match OPEN_SHAPES in app.js. G and C forms only
// carry the types that have a genuine open shape.
const FORM_TYPES = {
  E: ['maj', 'min', '7', 'min7', 'maj7', 'pow5'],
  A: ['maj', 'min', '7', 'min7', 'maj7', 'pow5'],
  D: ['maj', 'min', '7', 'min7', 'maj7', 'pow5'],
  G: ['maj', '7', 'maj7'],
  C: ['maj', '7', 'maj7'],
};
const ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const VALID_SIGS = new Set();
for (const [form, types] of Object.entries(FORM_TYPES))
  for (const type of types)
    for (const pos of ['open', 'barre'])
      VALID_SIGS.add(`${form}:${type}:${pos}`);

// A chord is well-formed iff the form carries the type and pos matches the
// root (the form's own root is the open position, every other root is barre).
export function isValidChord(c) {
  return !!c && ROOTS.includes(c.root)
    && (FORM_TYPES[c.form] || []).includes(c.type)
    && c.pos === (c.root === c.form ? 'open' : 'barre');
}

// ── prepared statements ──────────────────────────────────────────────
const q = {
  listUsers:  db.prepare(`SELECT id, name, is_admin FROM users ORDER BY id ASC`),
  findUser:   db.prepare(`SELECT id, name, is_admin FROM users WHERE id = ?`),
  userByName: db.prepare(`SELECT id FROM users WHERE name = ?`),
  countUsers: db.prepare(`SELECT COUNT(*) AS n FROM users`),
  insertUser: db.prepare(`INSERT INTO users (name, is_admin) VALUES (?, ?)`),
  delUser:    db.prepare(`DELETE FROM users WHERE id = ?`),
  delUserSessions: db.prepare(`DELETE FROM sessions WHERE user_id = ?`),
  delUserStats:    db.prepare(`DELETE FROM sig_pair_stats WHERE user_id = ?`),
  claimSessions:   db.prepare(`UPDATE sessions SET user_id = ? WHERE user_id IS NULL`),
  claimStats:      db.prepare(`UPDATE sig_pair_stats SET user_id = ? WHERE user_id IS NULL`),

  insertSession: db.prepare(`
    INSERT INTO sessions
      (user_id, started_at, duration_seconds, pair_sig,
       a_root, a_form, a_type, a_pos, b_root, b_form, b_type, b_pos, rating, bpm)
    VALUES
      (@user_id, datetime('now', '-' || @duration_seconds || ' seconds'), @duration_seconds, @pair_sig,
       @a_root, @a_form, @a_type, @a_pos, @b_root, @b_form, @b_type, @b_pos, @rating, @bpm)`),

  getStat: db.prepare(`SELECT * FROM sig_pair_stats WHERE user_id = ? AND pair_sig = ?`),
  upsertStat: db.prepare(`
    INSERT INTO sig_pair_stats
      (user_id, pair_sig, a_sig, b_sig, a_form, a_type, a_pos, b_form, b_type, b_pos,
       times_practiced, total_seconds, last_rating, mastery, last_practiced_at)
    VALUES
      (@user_id, @pair_sig, @a_sig, @b_sig, @a_form, @a_type, @a_pos, @b_form, @b_type, @b_pos,
       1, @duration_seconds, @rating, @mastery, datetime('now'))
    ON CONFLICT(user_id, pair_sig) DO UPDATE SET
       times_practiced   = times_practiced + 1,
       total_seconds     = total_seconds + @duration_seconds,
       last_rating       = COALESCE(@rating, last_rating),
       mastery           = @mastery,
       last_practiced_at = datetime('now')`),

  allStats: db.prepare(`SELECT pair_sig, a_sig, b_sig, times_practiced, last_practiced_at FROM sig_pair_stats WHERE user_id = ?`),
  allPairStats: db.prepare(`SELECT a_form, a_type, a_pos, b_form, b_type, b_pos, times_practiced, mastery FROM sig_pair_stats WHERE user_id = ?`),

  leastPracticed: db.prepare(`SELECT * FROM sig_pair_stats WHERE user_id = ? ORDER BY times_practiced ASC, last_practiced_at ASC LIMIT ?`),
  mostPracticed:  db.prepare(`SELECT * FROM sig_pair_stats WHERE user_id = ? ORDER BY times_practiced DESC LIMIT ?`),

  recentSessions: db.prepare(`SELECT * FROM sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`),
  allSessions:    db.prepare(`SELECT * FROM sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`),
  getSession:     db.prepare(`SELECT * FROM sessions WHERE id = ? AND user_id = ?`),
  delSession:     db.prepare(`DELETE FROM sessions WHERE id = ?`),
  sessionsForPair: db.prepare(`SELECT rating, duration_seconds, started_at FROM sessions WHERE user_id = ? AND pair_sig = ? ORDER BY started_at ASC`),
  delStat:        db.prepare(`DELETE FROM sig_pair_stats WHERE user_id = ? AND pair_sig = ?`),
  recomputeStat:  db.prepare(`UPDATE sig_pair_stats SET times_practiced=@t, total_seconds=@s, last_rating=@lr, mastery=@m, last_practiced_at=@lp WHERE user_id=@u AND pair_sig=@k`),

  totals: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sessions WHERE user_id = @u)                          AS total_sessions,
      (SELECT COALESCE(SUM(duration_seconds),0) FROM sessions WHERE user_id = @u) AS total_seconds,
      (SELECT COUNT(*) FROM sig_pair_stats WHERE user_id = @u)                    AS unique_combos`),

  dailyActivity: db.prepare(`
    SELECT date(started_at, 'localtime') AS day,
           SUM(duration_seconds)         AS secs,
           COUNT(*)                      AS sessions
      FROM sessions
     WHERE user_id = @u AND started_at >= datetime('now', @win)
     GROUP BY day
     ORDER BY day ASC`),

  practiceDays: db.prepare(`
    SELECT DISTINCT date(started_at, 'localtime') AS day
      FROM sessions WHERE user_id = ? ORDER BY day DESC`),

  masteryBuckets: db.prepare(`
    SELECT
      SUM(CASE WHEN mastery < 0.8 THEN 1 ELSE 0 END)                  AS struggling,
      SUM(CASE WHEN mastery >= 0.8 AND mastery < 1.5 THEN 1 ELSE 0 END) AS learning,
      SUM(CASE WHEN mastery >= 1.5 THEN 1 ELSE 0 END)                 AS mastered
    FROM sig_pair_stats WHERE user_id = ? AND mastery IS NOT NULL`),
};

const ALPHA = 0.4;           // EMA smoothing for the optional rating-based mastery
const MAX_NAME = 24;

// ── users ────────────────────────────────────────────────────────────
export function listUsers() {
  return q.listUsers.all();
}

export function getUser(id) {
  return Number.isInteger(id) ? (q.findUser.get(id) || null) : null;
}

// The first user created claims any history recorded before the app had
// users at all (single-user era), and is the admin.
export function createUser(name) {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return { error: 'Enter a name.' };
  if (clean.length > MAX_NAME) return { error: `Keep the name to ${MAX_NAME} characters or fewer.` };
  if (q.userByName.get(clean)) return { error: 'That name is already taken.' };

  const first = q.countUsers.get().n === 0;
  db.exec('BEGIN');
  try {
    const id = Number(q.insertUser.run(clean, first ? 1 : 0).lastInsertRowid);
    if (first) { q.claimSessions.run(id); q.claimStats.run(id); }
    db.exec('COMMIT');
    return { user: q.findUser.get(id) };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Removing a user takes their whole practice history with them.
export function deleteUser(id) {
  const user = q.findUser.get(Number(id));
  if (!user) return { deleted: 0 };
  db.exec('BEGIN');
  try {
    q.delUserSessions.run(user.id);
    q.delUserStats.run(user.id);
    q.delUser.run(user.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { deleted: 1 };
}

// ── practice data (all scoped to one user) ───────────────────────────
// Record a completed practice session and roll it into the shape-pair stats.
export function recordSession({ userId, pair, duration_seconds, rating, bpm }) {
  const dur = Math.max(0, Math.round(duration_seconds || 0));
  const r = rating == null ? null : Math.max(0, Math.min(2, Number(rating)));
  const b = bpm == null ? null : Math.max(30, Math.min(300, Math.round(Number(bpm))));
  const key = pairSig(pair.a, pair.b);

  db.exec('BEGIN');
  try {
    q.insertSession.run({
      user_id: userId, duration_seconds: dur, pair_sig: key, rating: r, bpm: b,
      a_root: pair.a.root, a_form: pair.a.form, a_type: pair.a.type, a_pos: pair.a.pos,
      b_root: pair.b.root, b_form: pair.b.form, b_type: pair.b.type, b_pos: pair.b.pos,
    });

    const existing = q.getStat.get(userId, key);
    let mastery;
    if (r == null) {
      mastery = existing ? existing.mastery : null;          // no rating → leave mastery as-is
    } else {
      mastery = existing && existing.mastery != null
        ? existing.mastery * (1 - ALPHA) + r * ALPHA
        : r;
    }

    q.upsertStat.run({
      user_id: userId,
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
  return q.getStat.get(userId, key);
}

// Counts (+ recency) the client needs to choose the least-practiced pair:
//   pairCounts[pair_sig]  – times that exact shape-pair was practiced
//   sigCounts[signature]  – times that individual shape appeared (as a or b)
//   pairLast[pair_sig]    – when that shape-pair was last practiced
//   sigLast[signature]    – when that individual shape was last practiced (as a or b)
// last/pairLast feed the client's recency-decay so a shape that hasn't been
// touched in a long time resurfaces even if its raw count isn't the lowest.
export function getPracticeCounts(userId) {
  const rows = q.allStats.all(userId);
  const pairCounts = {};
  const sigCounts = {};
  const pairLast = {};
  const sigLast = {};
  for (const row of rows) {
    pairCounts[row.pair_sig] = row.times_practiced;
    pairLast[row.pair_sig] = row.last_practiced_at;
    sigCounts[row.a_sig] = (sigCounts[row.a_sig] || 0) + row.times_practiced;
    sigCounts[row.b_sig] = (sigCounts[row.b_sig] || 0) + row.times_practiced;
    if (!sigLast[row.a_sig] || row.last_practiced_at > sigLast[row.a_sig]) sigLast[row.a_sig] = row.last_practiced_at;
    if (!sigLast[row.b_sig] || row.last_practiced_at > sigLast[row.b_sig]) sigLast[row.b_sig] = row.last_practiced_at;
  }
  return { pairCounts, sigCounts, pairLast, sigLast };
}

// Full drill log, newest first (bounded so a runaway history can't blow up).
export function getAllSessions(userId, limit = 2000) {
  return q.allSessions.all(userId, limit);
}

// Delete one logged drill and recompute the affected shape-pair's stats from
// the sessions that remain (mastery is replayed as the same EMA recordSession
// uses, so the numbers stay consistent). Drops the stat row if nothing's left.
export function deleteSession(userId, id) {
  const sess = q.getSession.get(Number(id), userId);
  if (!sess) return { deleted: 0 };

  db.exec('BEGIN');
  try {
    q.delSession.run(sess.id);
    const remaining = q.sessionsForPair.all(userId, sess.pair_sig);
    if (!remaining.length) {
      q.delStat.run(userId, sess.pair_sig);
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
        lp: remaining[remaining.length - 1].started_at, u: userId, k: sess.pair_sig,
      });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { deleted: 1 };
}

export function getStats(userId) {
  const totals = q.totals.get({ u: userId });
  const buckets = q.masteryBuckets.get(userId);
  const daily = q.dailyActivity.all({ u: userId, win: '-119 days' });
  const { current, longest } = computeStreaks(q.practiceDays.all(userId).map(r => r.day));

  // signature coverage: how many current shapes have been practiced at least
  // once (sessions on retired shapes stay in the log but don't count here)
  const { sigCounts } = getPracticeCounts(userId);
  const coveredSigs = Object.keys(sigCounts).filter(s => VALID_SIGS.has(s)).length;

  return {
    totals: { ...totals, covered_sigs: coveredSigs, total_sigs: VALID_SIGS.size },
    streak: { current, longest },
    mastery: {
      struggling: buckets.struggling || 0,
      learning:   buckets.learning   || 0,
      mastered:   buckets.mastered   || 0,
    },
    daily,
    leastPracticed: q.leastPracticed.all(userId, 8),
    mostPracticed:  q.mostPracticed.all(userId, 8),
    recentSessions: q.recentSessions.all(userId, 8),
    // Full (uncapped) pair list — the skill-level breakdown lives client-side
    // (LEVELS is defined in app.js), so it needs every pair to bucket by level.
    pairStats: q.allPairStats.all(userId),
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
