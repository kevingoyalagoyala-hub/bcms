-- =====================================================================
-- Brgy Capacuhan Management System (BCMS) — Database Schema (MySQL 8+)
-- Barangay Capacuhan, Oquendo District, Calbayog City, Samar
-- =====================================================================

CREATE DATABASE IF NOT EXISTS bcms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bcms_db;

-- ---------------------------------------------------------------------
-- ADMIN / BARANGAY STAFF ACCOUNTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  username      VARCHAR(50)   NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  full_name     VARCHAR(150)  NOT NULL,
  role          VARCHAR(80)   NOT NULL DEFAULT 'Barangay Staff', -- e.g. Punong Barangay, Barangay Secretary, Barangay Kagawad
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- RESIDENTS (portal accounts + profile / household info)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS residents (
  id                CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  username          VARCHAR(50)   NOT NULL UNIQUE,
  password_hash     VARCHAR(255)  NOT NULL,
  first_name        VARCHAR(100)  NOT NULL,
  middle_name       VARCHAR(100)  NULL,
  last_name         VARCHAR(100)  NOT NULL,
  suffix            VARCHAR(20)   NULL,
  birthdate         DATE          NOT NULL,
  sex               ENUM('Male','Female') NOT NULL,
  civil_status      ENUM('Single','Married','Widowed','Separated','Divorced') NOT NULL DEFAULT 'Single',
  purok             VARCHAR(50)   NOT NULL,
  address           VARCHAR(255)  NOT NULL,
  contact_number    VARCHAR(30)   NOT NULL,
  email             VARCHAR(150)  NULL,
  occupation        VARCHAR(150)  NULL,
  years_of_residency INT          NOT NULL DEFAULT 0,
  photo_path        VARCHAR(255)  NULL,
  bio               TEXT          NULL,
  status            ENUM('Active','Deactivated') NOT NULL DEFAULT 'Active',
  date_registered   DATE          NOT NULL DEFAULT (CURRENT_DATE),
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_residents_name (last_name, first_name),
  INDEX idx_residents_purok (purok)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- DOCUMENT TYPES (the 10 supported certificates — reference/lookup table)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_types (
  doc_key      VARCHAR(40)  NOT NULL PRIMARY KEY, -- e.g. 'clearance', 'residency'
  name         VARCHAR(150) NOT NULL,
  description  VARCHAR(255) NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO document_types (doc_key, name, description) VALUES
  ('clearance',  'Barangay Clearance', 'General purpose clearance'),
  ('residency',  'Certificate of Residency', 'Proof of residence in the barangay'),
  ('indigency',  'Certificate of Indigency', 'For residents belonging to the indigent sector'),
  ('jobseeker',  'First-Time Job Seeker Certificate', 'RA 11261'),
  ('lowincome',  'Certificate of Low Income', 'For scholarship / subsidy applications'),
  ('noincome',   'Certificate of No Income', 'For residents with no source of income'),
  ('attestation','Certificate of Attestation', 'Sworn statement / attestation of facts'),
  ('soloparent', 'Certificate of Solo Parent', 'Supporting document for Solo Parent ID / benefits'),
  ('business',   'Barangay Business Clearance', 'Clearance for business permit application'),
  ('brgyid',     'Barangay ID', 'Official Barangay identification card')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ---------------------------------------------------------------------
-- DOCUMENT REQUESTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_requests (
  id             CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  ref_no         VARCHAR(30)   NOT NULL UNIQUE,
  resident_id    CHAR(36)      NOT NULL,
  doc_key        VARCHAR(40)   NOT NULL,
  form_data      JSON          NOT NULL,             -- doc-specific answers (purpose, income, business info, etc.)
  status         ENUM('Pending','Approved','Rejected','Ready for Pickup','Released') NOT NULL DEFAULT 'Pending',
  remarks        TEXT          NULL,
  handled_by     CHAR(36)      NULL,                 -- admins.id of staff who last updated the status
  date_requested TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_resident FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  CONSTRAINT fk_req_doctype  FOREIGN KEY (doc_key) REFERENCES document_types(doc_key),
  CONSTRAINT fk_req_admin    FOREIGN KEY (handled_by) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_req_status (status),
  INDEX idx_req_resident (resident_id),
  INDEX idx_req_doctype (doc_key)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- REQUEST ATTACHMENTS (uploaded photos/files per request, e.g. 2x2 photo,
-- valid ID, DTI registration, solo parent ID) — stored on disk, path here.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS request_attachments (
  id           CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  request_id   CHAR(36)     NOT NULL,
  field_name   VARCHAR(80)  NOT NULL,   -- matches the form field key, e.g. 'photoUpload', 'validIdUpload'
  original_name VARCHAR(255) NOT NULL,
  file_path    VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(100) NULL,
  uploaded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_request FOREIGN KEY (request_id) REFERENCES document_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ANNOUNCEMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  title       VARCHAR(200) NOT NULL,
  body        TEXT         NOT NULL,
  author      VARCHAR(150) NOT NULL,
  pinned      TINYINT(1)   NOT NULL DEFAULT 0,
  posted_date DATE         NOT NULL DEFAULT (CURRENT_DATE),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- CERTIFICATE LOG (issuance audit trail — one row per printed/generated cert)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificate_log (
  id            CHAR(36)   NOT NULL PRIMARY KEY DEFAULT (UUID()),
  request_id    CHAR(36)   NOT NULL,
  control_no    VARCHAR(30) NOT NULL,
  generated_by  CHAR(36)   NULL,   -- admins.id
  generated_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_certlog_request FOREIGN KEY (request_id) REFERENCES document_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_certlog_admin FOREIGN KEY (generated_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- SAMPLE / DEMO DATA (safe to delete in production)
-- Passwords below are bcrypt hashes of: admin123 / staff123 / resident123
-- Generate your own with: node scripts/hash-password.js <password>
-- =====================================================================
-- Example (replace hashes with ones generated by scripts/hash-password.js):
-- INSERT INTO admins (username, password_hash, full_name, role) VALUES
--   ('admin', '$2a$10$REPLACE_WITH_REAL_HASH', 'Leo M. Mag-Ampo', 'Punong Barangay');
--
-- INSERT INTO residents (username, password_hash, first_name, middle_name, last_name, birthdate, sex, civil_status, purok, address, contact_number, email, occupation, years_of_residency) VALUES
--   ('juan.delacruz', '$2a$10$REPLACE_WITH_REAL_HASH', 'Juan', 'Santos', 'Dela Cruz', '1990-04-12', 'Male', 'Married', 'Purok 2', 'Purok 2, Barangay Capacuhan', '0917-234-5678', 'juan.delacruz@example.com', 'Tricycle Driver', 15);
--
-- Use scripts/migrate.js to seed real bcrypt-hashed demo accounts automatically.
