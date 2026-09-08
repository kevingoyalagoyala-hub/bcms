const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth, requireAdmin, requireResident } = require('../middleware/auth');

const router = express.Router();

/* ---------------------------------------------------------------------
   File upload config (multer) — files land in UPLOAD_DIR/requests/<reqId>/
--------------------------------------------------------------------- */
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'requests', req.uploadRequestId || 'tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024 },
});

// Generates a per-request folder id before multer runs, so files land in the right place
function assignRequestId(req, res, next) { req.uploadRequestId = uuidv4(); next(); }

const REF_PREFIX = () => `BCMS-${new Date().getFullYear()}-`;

/* ---------------------------------------------------------------------
   POST /api/requests — resident submits a new document request
   multipart/form-data: fields = doc-specific answers, files = uploads
--------------------------------------------------------------------- */
router.post('/', requireAuth, requireResident, assignRequestId, upload.any(), async (req, res) => {
  const { docKey } = req.body;
  if (!docKey) return res.status(400).json({ error: 'docKey is required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [dt] = await conn.query('SELECT * FROM document_types WHERE doc_key = ?', [docKey]);
    if (!dt.length) throw { status: 400, message: 'Unknown document type.' };

    // Build form_data JSON from all non-file text fields (everything except docKey)
    const formData = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (k !== 'docKey') formData[k] = v;
    }

    const id = req.uploadRequestId;
    const [countRows] = await conn.query('SELECT COUNT(*) AS c FROM document_requests');
    const refNo = REF_PREFIX() + (1001 + Number(countRows[0].c));

    await conn.query(
      `INSERT INTO document_requests (id, ref_no, resident_id, doc_key, form_data, status) VALUES (?,?,?,?,?, 'Pending')`,
      [id, refNo, req.user.id, docKey, JSON.stringify(formData)]
    );

    if (req.files && req.files.length) {
      for (const file of req.files) {
        await conn.query(
          `INSERT INTO request_attachments (id, request_id, field_name, original_name, file_path, mime_type) VALUES (?,?,?,?,?,?)`,
          [uuidv4(), id, file.fieldname, file.originalname, file.path.replace(/\\/g, '/'), file.mimetype]
        );
      }
    }

    await conn.commit();
    const [rows] = await conn.query('SELECT * FROM document_requests WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to submit request.' });
  } finally {
    conn.release();
  }
});

/** GET /api/requests/mine — resident's own requests */
router.get('/mine', requireAuth, requireResident, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM document_requests WHERE resident_id = ? ORDER BY date_requested DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch your requests.' });
  }
});

/** GET /api/requests — admin: list all, filter by ?status=&docKey=&q= */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, docKey, q } = req.query;
    let sql = `SELECT r.*, CONCAT(res.first_name," ",res.last_name) AS resident_name
               FROM document_requests r JOIN residents res ON res.id = r.resident_id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND r.status = ?'; params.push(status); }
    if (docKey) { sql += ' AND r.doc_key = ?'; params.push(docKey); }
    if (q) { sql += ' AND (r.ref_no LIKE ? OR CONCAT(res.first_name," ",res.last_name) LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    sql += ' ORDER BY r.date_requested DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch requests.' });
  }
});

/** GET /api/requests/:id — full detail incl. attachments; owner resident or any admin */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM document_requests WHERE id = ?', [req.params.id]);
    const reqRow = rows[0];
    if (!reqRow) return res.status(404).json({ error: 'Request not found.' });
    if (req.user.role !== 'admin' && req.user.id !== reqRow.resident_id) {
      return res.status(403).json({ error: 'Not authorized to view this request.' });
    }
    const [attachments] = await pool.query('SELECT id, field_name, original_name, file_path, mime_type FROM request_attachments WHERE request_id = ?', [req.params.id]);
    res.json({ ...reqRow, attachments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch request.' });
  }
});

/** PATCH /api/requests/:id — admin updates status / remarks */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { status, remarks } = req.body;
  const allowed = ['Pending', 'Approved', 'Rejected', 'Ready for Pickup', 'Released'];
  if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status value.' });

  try {
    const sets = [];
    const params = [];
    if (status) { sets.push('status = ?'); params.push(status); }
    if (remarks !== undefined) { sets.push('remarks = ?'); params.push(remarks); }
    sets.push('handled_by = ?'); params.push(req.user.id);
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
    params.push(req.params.id);

    await pool.query(`UPDATE document_requests SET ${sets.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM document_requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Request not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update request.' });
  }
});

module.exports = router;
