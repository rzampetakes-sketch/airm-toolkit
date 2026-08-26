const express = require('express');
const db = require('../db/database');
const { requireRole } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const { toCsv } = require('../utils/csv');
const { streamExpensePdf } = require('../utils/pdf');
const {
  requireNonEmptyString,
  requireIataCode,
  requireDate,
  parseCabinClass,
} = require('../utils/validators');

const router = express.Router();

// Every route below is scoped to the logged-in client's own company_id —
// a corporate user can never see or export another company's data.
router.use(requireRole('client'));

function companyId(req) {
  return req.session.user.companyId;
}

// GET /api/corporate/bookings — travel history & upcoming itineraries
router.get(
  '/bookings',
  catchAsync(async (req, res) => {
    const bookings = db
      .prepare('SELECT * FROM bookings WHERE company_id = ? ORDER BY depart_date DESC')
      .all(companyId(req));
    res.json({ bookings });
  })
);

// GET /api/corporate/expenses/summary — monthly expenditure log
router.get(
  '/expenses/summary',
  catchAsync(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT strftime('%Y-%m', depart_date) AS month,
                COUNT(*) AS tripCount,
                SUM(price) AS totalSpend
         FROM bookings
         WHERE company_id = ? AND status IN ('booked', 'quoted')
         GROUP BY month
         ORDER BY month DESC`
      )
      .all(companyId(req));
    res.json({ months: rows });
  })
);

// GET /api/corporate/expenses/export.csv
router.get(
  '/expenses/export.csv',
  catchAsync(async (req, res) => {
    const bookings = db
      .prepare('SELECT * FROM bookings WHERE company_id = ? ORDER BY depart_date DESC')
      .all(companyId(req));

    const csv = toCsv(bookings, [
      { label: 'Date', value: (b) => b.depart_date },
      { label: 'Traveler', value: (b) => b.traveler_name },
      { label: 'Origin', value: (b) => b.origin },
      { label: 'Destination', value: (b) => b.destination },
      { label: 'Cabin', value: (b) => b.cabin_class },
      { label: 'Airline', value: (b) => b.airline_name },
      { label: 'Status', value: (b) => b.status },
      { label: 'Price', value: (b) => b.price },
      { label: 'Currency', value: (b) => b.currency },
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expense-summary.csv"');
    res.send(csv);
  })
);

// GET /api/corporate/expenses/export.pdf
router.get(
  '/expenses/export.pdf',
  catchAsync(async (req, res) => {
    const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(companyId(req));
    const bookings = db
      .prepare('SELECT * FROM bookings WHERE company_id = ? ORDER BY depart_date DESC')
      .all(companyId(req));

    streamExpensePdf(res, {
      companyName: company?.name || 'Company',
      generatedAt: new Date().toISOString().slice(0, 10),
      bookings,
    });
  })
);

// GET /api/corporate/quote-requests — this company's pending/resolved requests
router.get(
  '/quote-requests',
  catchAsync(async (req, res) => {
    const requests = db
      .prepare(
        `SELECT * FROM bookings
         WHERE company_id = ? AND status IN ('quote_requested', 'quoted', 'declined')
         ORDER BY created_at DESC`
      )
      .all(companyId(req));
    res.json({ requests });
  })
);

// POST /api/corporate/quote-requests — request a custom itinerary quote/invoice
router.post(
  '/quote-requests',
  catchAsync(async (req, res) => {
    const travelerName = requireNonEmptyString(req.body?.travelerName, 'travelerName', { maxLength: 150 });
    const origin = requireIataCode(req.body?.origin, 'origin');
    const destination = requireIataCode(req.body?.destination, 'destination');
    const cabinClass = parseCabinClass(req.body?.cabinClass);
    const airlineName = requireNonEmptyString(req.body?.airlineName || 'Unspecified', 'airlineName', { maxLength: 150 });
    const departDate = requireDate(req.body?.departDate, 'departDate');
    const notes = String(req.body?.notes || '').slice(0, 1000);

    const insert = db.prepare(`
      INSERT INTO bookings
        (company_id, user_id, traveler_name, origin, destination, cabin_class, airline_name, depart_date, price, currency, status, quote_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'USD', 'quote_requested', ?)
    `);
    const result = insert.run(
      companyId(req),
      req.session.user.id,
      travelerName,
      origin,
      destination,
      cabinClass,
      airlineName,
      departDate,
      notes
    );

    res.status(201).json({ id: result.lastInsertRowid });
  })
);

// POST /api/corporate/bookings — log a self-booked itinerary for the
// dashboard's travel history, fired when a logged-in corporate user clicks
// "Book Now" on a live search result (the actual booking still happens on
// the airline/Aviasales site that opens in a new tab).
router.post(
  '/bookings',
  catchAsync(async (req, res) => {
    const travelerName = requireNonEmptyString(req.body?.travelerName || req.session.user.fullName, 'travelerName', { maxLength: 150 });
    const origin = requireIataCode(req.body?.origin, 'origin');
    const destination = requireIataCode(req.body?.destination, 'destination');
    const cabinClass = parseCabinClass(req.body?.cabinClass);
    const airlineName = requireNonEmptyString(req.body?.airlineName || 'Unspecified', 'airlineName', { maxLength: 150 });
    const departDate = requireDate(req.body?.departDate, 'departDate');
    const price = Number(req.body?.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: '"price" must be a non-negative number.' });
    }
    const currency = String(req.body?.currency || 'USD').slice(0, 6);

    const insert = db.prepare(`
      INSERT INTO bookings
        (company_id, user_id, traveler_name, origin, destination, cabin_class, airline_name, depart_date, price, currency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked')
    `);
    const result = insert.run(
      companyId(req),
      req.session.user.id,
      travelerName,
      origin,
      destination,
      cabinClass,
      airlineName,
      departDate,
      price,
      currency
    );

    res.status(201).json({ id: result.lastInsertRowid });
  })
);

module.exports = router;
