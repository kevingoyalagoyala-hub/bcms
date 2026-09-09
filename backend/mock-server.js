/**
 * mock-server.js — Zero-install "quick start" backend for BCMS.
 *
 * This implements the EXACT SAME API endpoints as the real MySQL backend
 * (server.js + routes/*.js), but stores everything in memory instead of a
 * real database. Use this to try the fully-connected app (frontend <-> API)
 * in under a minute, with no MySQL installation required.
 *
 * IMPORTANT: All data resets every time you restart this server. This is
 * for demos and local development only — for a real deployment with
 * persistent data, follow the MySQL setup in README.md and run `npm start`
 * (server.js) instead of this file.
 *
 * Usage:
 *   npm install
 *   node mock-server.js
 *   -> API on http://localhost:4000
 */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = 'mock-server-dev-secret-do-not-use-in-production';
const UPLOAD_DIR = 'uploads-mock';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 5 * 1024 * 1024 } });

/* ----------------------------- IN-MEMORY DATA ----------------------------- */
function hash(pw) { return bcrypt.hashSync(pw, 8); }

const DB = {
  admins: [
    { id: 'ad1', username: 'admin', password_hash: hash('admin123'), full_name: 'Leo M. Mag-Ampo', role: 'Punong Barangay', is_active: 1 },
  ],
  residents: [
    { id: 'r1', username: 'juan.delacruz', password_hash: hash('resident123'), first_name: 'Juan', middle_name: 'Santos', last_name: 'Dela Cruz', suffix: '', birthdate: '1990-04-12', sex: 'Male', civil_status: 'Married', purok: 'Purok 2', address: 'Purok 2, Barangay Capacuhan', contact_number: '0917-234-5678', email: 'juan.delacruz@example.com', occupation: 'Tricycle Driver', years_of_residency: 15, photo_path: null, bio: 'Proud tricycle driver and father of two.', status: 'Active', date_registered: '2023-01-10' },
    { id: 'r2', username: 'maria.reyes', password_hash: hash('resident123'), first_name: 'Maria', middle_name: 'Luna', last_name: 'Reyes', suffix: '', birthdate: '1985-09-23', sex: 'Female', civil_status: 'Widowed', purok: 'Purok 4', address: 'Purok 4, Barangay Capacuhan', contact_number: '0928-555-1122', email: 'maria.reyes@example.com', occupation: 'Sari-sari Store Owner', years_of_residency: 22, photo_path: null, bio: '', status: 'Active', date_registered: '2023-02-14' },
  ],
  documentTypes: ['clearance','residency','indigency','jobseeker','lowincome','noincome','attestation','soloparent','business','brgyid'],
  requests: [],
  announcements: [
    { id: 'an1', title: 'Free Anti-Rabies Vaccination for Pets', body: 'The Barangay Health Center will conduct a free anti-rabies vaccination drive at the Covered Court.', author: 'Barangay Health Center', pinned: 1, posted_date: '2026-09-03' },
    { id: 'an2', title: 'Schedule of Barangay Assembly Meeting', body: 'All residents are invited to attend the Quarterly Barangay Assembly at the Barangay Hall.', author: 'Office of the Punong Barangay', pinned: 0, posted_date: '2026-09-01' },
  ],
  certificateLog: [],
};
(function seedRequests(){
  const mk = (id, residentId, docKey, formData, status, remarks) => DB.requests.push({
    id, ref_no: 'BCMS-2026-'+(1000+Number(id.replace('rq',''))), resident_id: residentId, doc_key: docKey,
    form_data: formData, status, remarks: remarks||'', date_requested: new Date().toISOString(), date_updated: new Date().toISOString(),
  });
  mk('rq1','r1','clearance',{purpose:'Employment'},'Released','Released to requesting party.');
  mk('rq2','r1','residency',{yearsOfResidency:15,purpose:'Loan Application'},'Pending','');
  mk('rq3','r2','indigency',{purpose:'Medical Assistance'},'Approved','Approved by Punong Barangay.');
})();

function toSafe(row) { if (!row) return row; const { password_hash, ...safe } = row; return safe; }
function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' }); }

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token.' }); }
}
function requireAdmin(req, res, next) { if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Barangay staff access required.' }); next(); }
function requireResident(req, res, next) { if (req.user?.role !== 'resident') return res.status(403).json({ error: 'Resident account required.' }); next(); }

/* ----------------------------- AUTH ----------------------------- */
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'BCMS Mock API', time: new Date().toISOString() }));

app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'username, password, and role are required.' });
  if (role === 'resident') {
    const r = DB.residents.find(x => x.username === username);
    if (!r || !bcrypt.compareSync(password, r.password_hash)) return res.status(401).json({ error: 'Invalid username or password.' });
    if (r.status !== 'Active') return res.status(403).json({ error: 'This account has been deactivated. Please visit the Barangay Hall.' });
    return res.json({ token: signToken({ id: r.id, role: 'resident', username: r.username }), user: toSafe(r) });
  } else if (role === 'admin') {
    const a = DB.admins.find(x => x.username === username);
    if (!a || !bcrypt.compareSync(password, a.password_hash)) return res.status(401).json({ error: 'Invalid staff username or password.' });
    return res.json({ token: signToken({ id: a.id, role: 'admin', username: a.username, fullName: a.full_name }), user: toSafe(a) });
  }
  res.status(400).json({ error: "role must be 'resident' or 'admin'." });
});

app.post('/api/auth/register', (req, res) => {
  const b = req.body;
  const required = ['firstName','lastName','birthdate','sex','civilStatus','purok','contactNumber','username','password'];
  for (const f of required) if (!b[f]) return res.status(400).json({ error: `${f} is required.` });
  if (String(b.password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (DB.residents.some(r => r.username === b.username)) return res.status(409).json({ error: 'That username is already taken. Please choose another.' });

  const r = {
    id: uuidv4(), username: b.username, password_hash: hash(b.password),
    first_name: b.firstName, middle_name: b.middleName || '', last_name: b.lastName, suffix: b.suffix || '',
    birthdate: b.birthdate, sex: b.sex, civil_status: b.civilStatus, purok: b.purok,
    address: `${b.purok}, Barangay Capacuhan`, contact_number: b.contactNumber, email: b.email || '',
    occupation: '', years_of_residency: 0, photo_path: null, bio: '', status: 'Active',
    date_registered: new Date().toISOString().slice(0,10),
  };
  DB.residents.push(r);
  res.status(201).json({ token: signToken({ id: r.id, role: 'resident', username: r.username }), user: toSafe(r) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const table = req.user.role === 'admin' ? DB.admins : DB.residents;
  const row = table.find(x => x.id === req.user.id);
  if (!row) return res.status(404).json({ error: 'Account not found.' });
  res.json({ role: req.user.role, user: toSafe(row) });
});

/* ----------------------------- RESIDENTS ----------------------------- */
app.get('/api/residents', requireAuth, requireAdmin, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  let rows = DB.residents;
  if (q) rows = rows.filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || r.username.toLowerCase().includes(q));
  res.json(rows.map(toSafe));
});
app.get('/api/residents/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Not authorized to view this profile.' });
  const r = DB.residents.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Resident not found.' });
  res.json(toSafe(r));
});
app.post('/api/residents', requireAuth, requireAdmin, (req, res) => {
  const b = req.body;
  const required = ['username','password','firstName','lastName','birthdate','sex','civilStatus','purok','contactNumber'];
  for (const f of required) if (!b[f]) return res.status(400).json({ error: `${f} is required.` });
  if (DB.residents.some(r => r.username === b.username)) return res.status(409).json({ error: 'Username already taken.' });
  const r = {
    id: uuidv4(), username: b.username, password_hash: hash(b.password),
    first_name: b.firstName, middle_name: b.middleName || '', last_name: b.lastName, suffix: b.suffix || '',
    birthdate: b.birthdate, sex: b.sex, civil_status: b.civilStatus, purok: b.purok,
    address: b.address || `${b.purok}, Barangay Capacuhan`, contact_number: b.contactNumber, email: b.email || '',
    occupation: b.occupation || '', years_of_residency: Number(b.yearsOfResidency) || 0, photo_path: null, bio: '',
    status: 'Active', date_registered: new Date().toISOString().slice(0,10),
  };
  DB.residents.push(r);
  res.status(201).json(toSafe(r));
});
app.put('/api/residents/:id', requireAuth, requireAdmin, (req, res) => {
  const r = DB.residents.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Resident not found.' });
  const b = req.body;
  const map = { firstName:'first_name', middleName:'middle_name', lastName:'last_name', suffix:'suffix', birthdate:'birthdate', sex:'sex', civilStatus:'civil_status', purok:'purok', address:'address', contactNumber:'contact_number', email:'email', occupation:'occupation', yearsOfResidency:'years_of_residency', status:'status', username:'username' };
  for (const [k,col] of Object.entries(map)) if (b[k] !== undefined) r[col] = b[k];
  if (b.password) r.password_hash = hash(b.password);
  res.json(toSafe(r));
});
app.patch('/api/residents/:id/status', requireAuth, requireAdmin, (req, res) => {
  const r = DB.residents.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Resident not found.' });
  if (!['Active','Deactivated'].includes(req.body.status)) return res.status(400).json({ error: 'status must be Active or Deactivated.' });
  r.status = req.body.status;
  res.json({ ok: true });
});
app.patch('/api/residents/me', requireAuth, requireResident, upload.single('photo'), (req, res) => {
  const r = DB.residents.find(x => x.id === req.user.id);
  if (!r) return res.status(404).json({ error: 'Resident not found.' });
  if (req.body.bio !== undefined) r.bio = String(req.body.bio).slice(0, 300);
  if (req.file) r.photo_path = `/uploads/${path.basename(req.file.path)}`;
  res.json(toSafe(r));
});

/* ----------------------------- DOCUMENT REQUESTS ----------------------------- */
app.post('/api/requests', requireAuth, requireResident, upload.any(), (req, res) => {
  const { docKey } = req.body;
  if (!docKey || !DB.documentTypes.includes(docKey)) return res.status(400).json({ error: 'Unknown document type.' });
  const formData = {};
  for (const [k,v] of Object.entries(req.body)) if (k !== 'docKey') formData[k] = v;
  if (req.files) for (const f of req.files) { formData[f.fieldname] = `/uploads/${path.basename(f.path)}`; formData[f.fieldname+'_name'] = f.originalname; }
  const id = uuidv4();
  const refNo = 'BCMS-' + new Date().getFullYear() + '-' + (1001 + DB.requests.length);
  const now = new Date().toISOString();
  DB.requests.unshift({ id, ref_no: refNo, resident_id: req.user.id, doc_key: docKey, form_data: formData, status: 'Pending', remarks: '', date_requested: now, date_updated: now });
  res.status(201).json(DB.requests[0]);
});
app.get('/api/requests/mine', requireAuth, requireResident, (req, res) => {
  res.json(DB.requests.filter(r => r.resident_id === req.user.id).sort((a,b)=> new Date(b.date_requested)-new Date(a.date_requested)));
});
app.get('/api/requests', requireAuth, requireAdmin, (req, res) => {
  const { status, docKey, q } = req.query;
  let rows = DB.requests.map(r => ({ ...r, resident_name: (() => { const res2 = DB.residents.find(x=>x.id===r.resident_id); return res2 ? `${res2.first_name} ${res2.last_name}` : ''; })() }));
  if (status) rows = rows.filter(r => r.status === status);
  if (docKey) rows = rows.filter(r => r.doc_key === docKey);
  if (q) { const ql = q.toLowerCase(); rows = rows.filter(r => r.ref_no.toLowerCase().includes(ql) || r.resident_name.toLowerCase().includes(ql)); }
  rows.sort((a,b)=> new Date(b.date_requested)-new Date(a.date_requested));
  res.json(rows);
});
app.get('/api/requests/:id', requireAuth, (req, res) => {
  const r = DB.requests.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  if (req.user.role !== 'admin' && req.user.id !== r.resident_id) return res.status(403).json({ error: 'Not authorized to view this request.' });
  res.json({ ...r, attachments: [] });
});
app.patch('/api/requests/:id', requireAuth, requireAdmin, (req, res) => {
  const r = DB.requests.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  const allowed = ['Pending','Approved','Rejected','Ready for Pickup','Released'];
  if (req.body.status) { if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status value.' }); r.status = req.body.status; }
  if (req.body.remarks !== undefined) r.remarks = req.body.remarks;
  r.date_updated = new Date().toISOString();
  res.json(r);
});

/* ----------------------------- ANNOUNCEMENTS ----------------------------- */
app.get('/api/announcements', requireAuth, (req, res) => {
  res.json([...DB.announcements].sort((a,b)=> (b.pinned-a.pinned) || (new Date(b.posted_date)-new Date(a.posted_date))));
});
app.post('/api/announcements', requireAuth, requireAdmin, (req, res) => {
  const { title, body, pinned } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required.' });
  const a = { id: uuidv4(), title, body, author: req.user.fullName || req.user.username, pinned: pinned ? 1 : 0, posted_date: new Date().toISOString().slice(0,10) };
  DB.announcements.unshift(a);
  res.status(201).json(a);
});
app.put('/api/announcements/:id', requireAuth, requireAdmin, (req, res) => {
  const a = DB.announcements.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Announcement not found.' });
  const { title, body, pinned } = req.body;
  if (title !== undefined) a.title = title;
  if (body !== undefined) a.body = body;
  if (pinned !== undefined) a.pinned = pinned ? 1 : 0;
  res.json(a);
});
app.delete('/api/announcements/:id', requireAuth, requireAdmin, (req, res) => {
  DB.announcements = DB.announcements.filter(x => x.id !== req.params.id);
  res.json({ ok: true });
});

/* ----------------------------- CERTIFICATES ----------------------------- */
app.get('/api/certificates/:requestId', requireAuth, (req, res) => {
  const r = DB.requests.find(x => x.id === req.params.requestId);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  if (req.user.role !== 'admin' && req.user.id !== r.resident_id) return res.status(403).json({ error: 'Not authorized to view this certificate.' });
  if (!['Approved','Ready for Pickup','Released'].includes(r.status)) return res.status(409).json({ error: 'This request has not been approved yet.' });
  const resident = DB.residents.find(x => x.id === r.resident_id);
  res.json({ request: r, resident: toSafe(resident), documentType: { doc_key: r.doc_key } });
});
app.post('/api/certificates/:requestId/log', requireAuth, requireAdmin, (req, res) => {
  const r = DB.requests.find(x => x.id === req.params.requestId);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  const entry = { id: uuidv4(), request_id: r.id, control_no: r.ref_no, generated_by: req.user.id, generated_at: new Date().toISOString() };
  DB.certificateLog.unshift(entry);
  res.status(201).json({ ok: true, id: entry.id });
});
app.get('/api/certificates', requireAuth, requireAdmin, (req, res) => {
  res.json(DB.certificateLog.map(cl => {
    const r = DB.requests.find(x => x.id === cl.request_id);
    const res2 = r ? DB.residents.find(x => x.id === r.resident_id) : null;
    return { ...cl, ref_no: r?.ref_no, doc_key: r?.doc_key, status: r?.status, resident_name: res2 ? `${res2.first_name} ${res2.last_name}` : '' };
  }));
});

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large.' });
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => console.log(`BCMS MOCK API (in-memory, no DB required) listening on http://localhost:${PORT}`));
