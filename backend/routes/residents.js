const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toSafe(row) {
  if (!row) return row;
  const { password_hash, ...safe } = row;
  return safe;
}

/** GET /api/residents — admin only, supports ?q=search */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let sql = 'SELECT * FROM residents';
    const params = [];
    if (q) {
      sql += ' WHERE CONCAT(first_name," ",last_name) LIKE ? OR username LIKE ?';
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY last_name, first_name';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toSafe));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch residents.' });
  }
});

/** GET /api/residents/:id — admin, or the resident viewing their own profile */
router.get('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Not authorized to view this profile.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM residents WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Resident not found.' });
    res.json(toSafe(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch resident.' });
  }
});

/** POST /api/residents — admin creates a new resident account */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const b = req.body;
  const required = ['username', 'password', 'firstName', 'lastName', 'birthdate', 'sex', 'civilStatus', 'purok', 'contactNumber'];
  for (const f of required) if (!b[f]) return res.status(400).json({ error: `${f} is required.` });

  try {
    const [dupe] = await pool.query('SELECT id FROM residents WHERE username = ?', [b.username]);
    if (dupe.length) return res.status(409).json({ error: 'Username already taken.' });

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(b.password, 10);
    const address = b.address || `${b.purok}, Barangay Capacuhan`;

    await pool.query(
      `INSERT INTO residents (id, username, password_hash, first_name, middle_name, last_name, suffix, birthdate, sex, civil_status, purok, address, contact_number, email, occupation, years_of_residency)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, b.username, passwordHash, b.firstName, b.middleName || null, b.lastName, b.suffix || null, b.birthdate, b.sex, b.civilStatus, b.purok, address, b.contactNumber, b.email || null, b.occupation || null, b.yearsOfResidency || 0]
    );
    const [rows] = await pool.query('SELECT * FROM residents WHERE id = ?', [id]);
    res.status(201).json(toSafe(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create resident.' });
  }
});

/** PUT /api/residents/:id — admin edits any field; resident can only be edited by staff (per barangay policy) */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const b = req.body;
  try {
    const fields = {
      first_name: b.firstName, middle_name: b.middleName, last_name: b.lastName, suffix: b.suffix,
      birthdate: b.birthdate, sex: b.sex, civil_status: b.civilStatus, purok: b.purok, address: b.address,
      contact_number: b.contactNumber, email: b.email, occupation: b.occupation,
      years_of_residency: b.yearsOfResidency, status: b.status, username: b.username,
    };
    const sets = [];
    const params = [];
    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) { sets.push(`${col} = ?`); params.push(val); }
    }
    if (b.password) {
      sets.push('password_hash = ?');
      params.push(await bcrypt.hash(b.password, 10));
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update.' });
    params.push(req.params.id);
    await pool.query(`UPDATE residents SET ${sets.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query('SELECT * FROM residents WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Resident not found.' });
    res.json(toSafe(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update resident.' });
  }
});

/** PATCH /api/residents/:id/status — quick activate/deactivate */
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['Active', 'Deactivated'].includes(status)) return res.status(400).json({ error: 'status must be Active or Deactivated.' });
  try {
    await pool.query('UPDATE residents SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

module.exports = router;
