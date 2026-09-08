const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * body: { username, password, role: 'resident' | 'admin' }
 */
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, and role are required.' });
  }

  try {
    if (role === 'resident') {
      const [rows] = await pool.query('SELECT * FROM residents WHERE username = ? LIMIT 1', [username]);
      const resident = rows[0];
      if (!resident) return res.status(401).json({ error: 'Invalid username or password.' });
      if (resident.status !== 'Active') return res.status(403).json({ error: 'This account has been deactivated. Please visit the Barangay Hall.' });

      const ok = await bcrypt.compare(password, resident.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid username or password.' });

      const token = signToken({ id: resident.id, role: 'resident', username: resident.username });
      const { password_hash, ...safe } = resident;
      return res.json({ token, user: safe });

    } else if (role === 'admin') {
      const [rows] = await pool.query('SELECT * FROM admins WHERE username = ? LIMIT 1', [username]);
      const admin = rows[0];
      if (!admin || !admin.is_active) return res.status(401).json({ error: 'Invalid staff username or password.' });

      const ok = await bcrypt.compare(password, admin.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid staff username or password.' });

      const token = signToken({ id: admin.id, role: 'admin', username: admin.username, fullName: admin.full_name });
      const { password_hash, ...safe } = admin;
      return res.json({ token, user: safe });

    } else {
      return res.status(400).json({ error: "role must be 'resident' or 'admin'." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

/** GET /api/auth/me — returns the currently authenticated user's basic info */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const table = req.user.role === 'admin' ? 'admins' : 'residents';
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Account not found.' });
    const { password_hash, ...safe } = rows[0];
    res.json({ role: req.user.role, user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load account.' });
  }
});

module.exports = router;
