const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/certificates/:requestId
 * Returns everything the frontend needs to render/print a certificate:
 * the request, the resident, and the document type. The actual certificate
 * layout (header, watermark, body template) is rendered client-side using
 * this data — see frontend/app.js -> renderCertificatePage().
 * Only the owning resident or an admin may fetch this.
 */
router.get('/:requestId', requireAuth, async (req, res) => {
  try {
    const [reqRows] = await pool.query('SELECT * FROM document_requests WHERE id = ?', [req.params.requestId]);
    const request = reqRows[0];
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (req.user.role !== 'admin' && req.user.id !== request.resident_id) {
      return res.status(403).json({ error: 'Not authorized to view this certificate.' });
    }
    if (!['Approved', 'Ready for Pickup', 'Released'].includes(request.status)) {
      return res.status(409).json({ error: 'This request has not been approved yet.' });
    }

    const [residentRows] = await pool.query('SELECT * FROM residents WHERE id = ?', [request.resident_id]);
    const resident = residentRows[0];
    const [docRows] = await pool.query('SELECT * FROM document_types WHERE doc_key = ?', [request.doc_key]);
    const { password_hash, ...safeResident } = resident || {};

    res.json({ request, resident: safeResident, documentType: docRows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load certificate data.' });
  }
});

/**
 * POST /api/certificates/:requestId/log
 * Admin calls this each time a certificate is (re)printed, for the audit trail.
 */
router.post('/:requestId/log', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [reqRows] = await pool.query('SELECT ref_no FROM document_requests WHERE id = ?', [req.params.requestId]);
    if (!reqRows[0]) return res.status(404).json({ error: 'Request not found.' });
    const id = uuidv4();
    await pool.query(
      'INSERT INTO certificate_log (id, request_id, control_no, generated_by) VALUES (?,?,?,?)',
      [id, req.params.requestId, reqRows[0].ref_no, req.user.id]
    );
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log certificate generation.' });
  }
});

/** GET /api/certificates — admin: full issuance history */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cl.*, dr.ref_no, dr.doc_key, dr.status, CONCAT(r.first_name," ",r.last_name) AS resident_name
       FROM certificate_log cl
       JOIN document_requests dr ON dr.id = cl.request_id
       JOIN residents r ON r.id = dr.resident_id
       ORDER BY cl.generated_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch certificate history.' });
  }
});

module.exports = router;
