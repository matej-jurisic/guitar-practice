import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  recordSession, getPracticeCounts, getStats, getAllSessions, deleteSession, isValidChord,
  listUsers, getUser, createUser, deleteUser,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const api = express.Router();

// Who's practicing, sent as an X-User-Id header. This is a profile switch on a
// shared install, not authentication — there are no passwords anywhere.
const actor = req => getUser(Number(req.get('X-User-Id')));

function withUser(req, res, next) {
  const user = actor(req);
  if (!user) return res.status(401).json({ error: 'unknown user' });
  req.user = user;
  next();
}

// ── users ──
api.get('/users', (req, res) => {
  res.json(listUsers());
});

// Open while there are no users at all (first run picks the admin);
// after that only the admin may add people.
api.post('/users', (req, res) => {
  if (listUsers().length && !actor(req)?.is_admin) {
    return res.status(403).json({ error: 'only the admin can add users' });
  }
  const { user, error } = createUser(req.body?.name);
  if (error) return res.status(400).json({ error });
  res.json(user);
});

api.delete('/users/:id', withUser, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'only the admin can remove users' });
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'you cannot remove yourself' });
  const result = deleteUser(id);
  if (!result.deleted) return res.status(404).json({ error: 'user not found' });
  res.json(result);
});

// ── practice data, all scoped to the calling user ──
// Record a completed 5-minute (or ended-early) single-pair session.
api.post('/sessions', withUser, (req, res) => {
  const { pair, duration_seconds, rating, bpm } = req.body || {};
  if (!isValidChord(pair?.a) || !isValidChord(pair?.b)) {
    return res.status(400).json({ error: 'pair {a,b} must each be a known root/form/type/pos combination' });
  }
  res.json(recordSession({ userId: req.user.id, pair, duration_seconds, rating, bpm }));
});

// Full drill history for the Progress tab.
api.get('/sessions', withUser, (req, res) => {
  res.json(getAllSessions(req.user.id));
});

// Delete one logged drill; the affected shape-pair's stats are recomputed.
api.delete('/sessions/:id', withUser, (req, res) => {
  const result = deleteSession(req.user.id, req.params.id);
  if (!result.deleted) return res.status(404).json({ error: 'session not found' });
  res.json(result);
});

// Practice counts used by the client to pick the least-practiced pair.
api.get('/practice-counts', withUser, (req, res) => {
  res.json(getPracticeCounts(req.user.id));
});

// Everything the progress dashboard needs.
api.get('/stats', withUser, (req, res) => {
  res.json(getStats(req.user.id));
});

app.use('/api', api);

app.listen(PORT, () => {
  console.log(`🎸 Guitar practice app running at http://localhost:${PORT}`);
});
