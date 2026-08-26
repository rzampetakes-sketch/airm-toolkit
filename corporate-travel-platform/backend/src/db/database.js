// SQLite data layer for the B2B corporate portal (companies, users,
// bookings, quote/invoice requests). SQLite is used because it needs no
// external database server — the whole platform runs from `npm start` with
// zero infrastructure, which matters for a live pitch demo.
//
// >>> Swapping in a hosted database later <<<
// If/when you outgrow SQLite (e.g. move to Postgres/MySQL for a multi-node
// deployment), this is the only file that needs to change: replace the
// better-sqlite3 calls below with your driver of choice (e.g. `pg`), keep
// the same exported function signatures, and every route in
// src/routes/{auth,corporate,admin}.js keeps working unmodified. Point it at
// a managed instance via a connection string in backend/.env, e.g.:
//   DATABASE_URL=postgres://user:password@host:5432/corporate_travel
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'corporate.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    billing_email TEXT NOT NULL,
    account_manager_notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    traveler_name TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    cabin_class TEXT NOT NULL,
    airline_name TEXT NOT NULL,
    depart_date TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'quote_requested', 'quoted', 'declined')),
    quote_notes TEXT DEFAULT '',
    invoice_amount REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_company ON bookings(company_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
`);

function seedDemoData() {
  const companyCount = db.prepare('SELECT COUNT(*) AS n FROM companies').get().n;
  if (companyCount > 0) return; // already seeded

  logger.info('Seeding demo corporate account (first run)...');

  const insertCompany = db.prepare(
    'INSERT INTO companies (name, billing_email, account_manager_notes) VALUES (?, ?, ?)'
  );
  const companyId = insertCompany.run(
    'Meridian Capital Partners',
    'travel@meridiancapital.example',
    'Preferred carriers: Emirates, Singapore Airlines. Net-30 invoicing.'
  ).lastInsertRowid;

  const insertUser = db.prepare(
    'INSERT INTO users (company_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  );

  // Demo credentials — change these passwords immediately in a real deployment.
  insertUser.run(
    null,
    'Platform Admin',
    'admin@corporatetravel.example',
    bcrypt.hashSync('AdminDemo123!', 10),
    'admin'
  );
  insertUser.run(
    companyId,
    'Alexandra Reyes',
    'travel.manager@meridiancapital.example',
    bcrypt.hashSync('ClientDemo123!', 10),
    'client'
  );

  const clientUserId = db.prepare('SELECT id FROM users WHERE email = ?').get('travel.manager@meridiancapital.example').id;

  const insertBooking = db.prepare(`
    INSERT INTO bookings
      (company_id, user_id, traveler_name, origin, destination, cabin_class, airline_name, depart_date, price, currency, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBooking.run(companyId, clientUserId, 'J. Whitfield (CEO)', 'JFK', 'LHR', 'BUSINESS', 'British Airways', '2026-06-02', 6480, 'USD', 'booked');
  insertBooking.run(companyId, clientUserId, 'A. Reyes (CFO)', 'JFK', 'SIN', 'FIRST', 'Singapore Airlines', '2026-07-14', 14250, 'USD', 'booked');
  insertBooking.run(companyId, clientUserId, 'M. Chen (VP Sales)', 'LAX', 'HND', 'BUSINESS', 'ANA', '2026-08-20', 7120, 'USD', 'quote_requested');

  logger.info('Demo login: admin@corporatetravel.example / AdminDemo123!');
  logger.info('Demo login: travel.manager@meridiancapital.example / ClientDemo123!');
}

seedDemoData();

module.exports = db;
