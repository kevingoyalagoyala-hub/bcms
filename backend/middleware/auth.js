const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Verifies the Bearer token and attaches { id, role, username } to req.user
 * role is either 'resident' or 'admin'
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, username, fullName }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/** Restricts a route to admin/barangay-staff accounts only */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Barangay staff access required.' });
  }
  next();
}

/** Restricts a route to resident accounts only */
function requireResident(req, res, next) {
  if (!req.user || req.user.role !== 'resident') {
    return res.status(403).json({ error: 'Resident account required.' });
  }
  next();
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

module.exports = { requireAuth, requireAdmin, requireResident, signToken };
