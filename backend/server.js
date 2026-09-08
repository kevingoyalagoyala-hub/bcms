require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const residentRoutes = require('./routes/residents');
const requestRoutes = require('./routes/requests');
const announcementRoutes = require('./routes/announcements');
const certificateRoutes = require('./routes/certificates');

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (2x2 photos, valid IDs, DTI docs, etc.)
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'BCMS API', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/certificates', certificateRoutes);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// Central error handler (e.g. multer file-too-large errors)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Max size is ${process.env.MAX_UPLOAD_MB || 5}MB.` });
  }
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`BCMS API listening on http://localhost:${PORT}`);
});
