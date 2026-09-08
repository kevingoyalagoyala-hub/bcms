/**
 * scripts/migrate.js
 * Runs schema.sql against the configured MySQL database, then seeds:
 *  - one admin (Punong Barangay) account from .env SEED_ADMIN_* values
 *  - four demo resident accounts (matching the frontend demo data) so you
 *    can log in and test immediately after connecting the real backend.
 *
 * Usage:
 *   npm install
 *   cp .env.example .env   (then edit DB_* values)
 *   npm run migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  console.log('Connected. Running schema.sql ...');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await connection.query(schema);
  console.log('Schema applied.');

  await connection.query(`USE ${process.env.DB_NAME || 'bcms_db'}`);

  // ---- Seed admin (Punong Barangay) ----
  const adminUser = process.env.SEED_ADMIN_USERNAME || 'admin';
  const [existingAdmin] = await connection.query('SELECT id FROM admins WHERE username = ?', [adminUser]);
  if (!existingAdmin.length) {
    const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', 10);
    await connection.query(
      'INSERT INTO admins (id, username, password_hash, full_name, role) VALUES (UUID(), ?, ?, ?, ?)',
      [adminUser, hash, process.env.SEED_ADMIN_FULLNAME || 'Leo M. Mag-Ampo', process.env.SEED_ADMIN_ROLE || 'Punong Barangay']
    );
    console.log(`Seeded admin account: ${adminUser}`);
  } else {
    console.log('Admin account already exists, skipping.');
  }

  // ---- Seed demo residents (same data as the frontend demo, for parity) ----
  const demoResidents = [
    { username: 'juan.delacruz', password: 'resident123', firstName: 'Juan', middleName: 'Santos', lastName: 'Dela Cruz', suffix: '', birthdate: '1990-04-12', sex: 'Male', civilStatus: 'Married', purok: 'Purok 2', contactNumber: '0917-234-5678', email: 'juan.delacruz@example.com', occupation: 'Tricycle Driver', years: 15 },
    { username: 'maria.reyes', password: 'resident123', firstName: 'Maria', middleName: 'Luna', lastName: 'Reyes', suffix: '', birthdate: '1985-09-23', sex: 'Female', civilStatus: 'Widowed', purok: 'Purok 4', contactNumber: '0928-555-1122', email: 'maria.reyes@example.com', occupation: 'Sari-sari Store Owner', years: 22 },
    { username: 'pedro.santos', password: 'resident123', firstName: 'Pedro', middleName: 'Cruz', lastName: 'Santos', suffix: 'Jr.', birthdate: '2002-11-05', sex: 'Male', civilStatus: 'Single', purok: 'Purok 1', contactNumber: '0939-888-4433', email: 'pedro.santos@example.com', occupation: 'Student', years: 20 },
    { username: 'ana.gonzales', password: 'resident123', firstName: 'Ana', middleName: 'Marie', lastName: 'Gonzales', suffix: '', birthdate: '1979-02-17', sex: 'Female', civilStatus: 'Separated', purok: 'Purok 3', contactNumber: '0947-321-7788', email: 'ana.gonzales@example.com', occupation: 'Vendor', years: 30 },
  ];

  for (const r of demoResidents) {
    const [existing] = await connection.query('SELECT id FROM residents WHERE username = ?', [r.username]);
    if (existing.length) { console.log(`Resident ${r.username} already exists, skipping.`); continue; }
    const hash = await bcrypt.hash(r.password, 10);
    await connection.query(
      `INSERT INTO residents (id, username, password_hash, first_name, middle_name, last_name, suffix, birthdate, sex, civil_status, purok, address, contact_number, email, occupation, years_of_residency)
       VALUES (UUID(), ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r.username, hash, r.firstName, r.middleName, r.lastName, r.suffix, r.birthdate, r.sex, r.civilStatus, r.purok, `${r.purok}, Barangay Capacuhan`, r.contactNumber, r.email, r.occupation, r.years]
    );
    console.log(`Seeded resident: ${r.username}`);
  }

  // ---- Seed a couple of sample announcements ----
  const [annCount] = await connection.query('SELECT COUNT(*) AS c FROM announcements');
  if (annCount[0].c === 0) {
    await connection.query(
      `INSERT INTO announcements (id, title, body, author, pinned) VALUES
        (UUID(), 'Free Anti-Rabies Vaccination for Pets', 'The Barangay Health Center will conduct a free anti-rabies vaccination drive for dogs and cats at the Barangay Covered Court. Bring your pets on a leash or in a carrier.', 'Barangay Health Center', 1),
        (UUID(), 'Schedule of Barangay Assembly Meeting', 'All residents are invited to attend the Quarterly Barangay Assembly at the Barangay Hall.', 'Office of the Punong Barangay', 0)`
    );
    console.log('Seeded sample announcements.');
  }

  console.log('\nMigration complete. You can now run: npm start');
  await connection.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
