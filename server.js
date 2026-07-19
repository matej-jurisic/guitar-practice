import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { recordSession, getPracticeCounts, getStats, getAllSessions, deleteSession, isValidChord } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const api = express.Router();

// Record a completed 5-minute (or ended-early) single-pair session.
api.post('/sessions', (req, res) => {
  const { pair, duration_seconds, rating, bpm } = req.body || {};
  if (!isValidChord(pair?.a) || !isValidChord(pair?.b)) {
    return res.status(400).json({ error: 'pair {a,b} must each be a known root/form/type/pos combination' });
  }
  res.json(recordSession({ pair, duration_seconds, rating, bpm }));
});

// Full drill history for the Progress tab.
api.get('/sessions', (req, res) => {
  res.json(getAllSessions());
});

// Delete one logged drill; the affected shape-pair's stats are recomputed.
api.delete('/sessions/:id', (req, res) => {
  const result = deleteSession(req.params.id);
  if (!result.deleted) return res.status(404).json({ error: 'session not found' });
  res.json(result);
});

// Practice counts used by the client to pick the least-practiced pair.
api.get('/practice-counts', (req, res) => {
  res.json(getPracticeCounts());
});

// Everything the progress dashboard needs.
api.get('/stats', (req, res) => {
  res.json(getStats());
});

app.use('/api', api);

app.listen(PORT, () => {
  console.log(`🎸 Guitar practice app running at http://localhost:${PORT}`);
});
