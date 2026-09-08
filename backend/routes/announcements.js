const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/** GET /api/announcements — public to any authenticated user (resident or admin) */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM announcements ORDER BY pinned DESC, posted_date DESC, created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

/** POST /api/announcements — admin only */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, body, pinned } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required.' });
  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO announcements (id, title, body, author, pinned) VALUES (?,?,?,?,?)',
      [id, title, body, req.user.fullName || req.user.username, pinned ? 1 : 0]
    );
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create announcement.' });
  }
});

/** PUT /api/announcements/:id — admin only */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, body, pinned } = req.body;
  try {
    const sets = []; const params = [];
    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (body !== undefined) { sets.push('body = ?'); params.push(body); }
    if (pinned !== undefined) { sets.push('pinned = ?'); params.push(pinned ? 1 : 0); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
    params.push(req.params.id);
    await pool.query(`UPDATE announcements SET ${sets.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Announcement not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update announcement.' });
  }
});

/** DELETE /api/announcements/:id — admin only */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete announcement.' });
  }
});

module.exports = router;
