const express = require('express');
const db = require('../db/database');
const { requireRole } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/validators');

const router = express.Router();

router.use(requireRole('admin'));

// GET /api/admin/companies — every corporate account, with quick totals
router.get(
  '/companies',
  catchAsync(async (req, res) => {
    const companies = db
      .prepare(
        `SELECT c.*,
                (SELECT COUNT(*) FROM users WHERE company_id = c.id) AS userCount,
                (SELECT COUNT(*) FROM bookings WHERE company_id = c.id) AS bookingCount,
                (SELECT COALESCE(SUM(price), 0) FROM bookings WHERE company_id = c.id AND status IN ('booked','quoted')) AS totalSpend
         FROM companies c
         ORDER BY c.name ASC`
      )
      .all();
    res.json({ companies });
  })
);

// GET /api/admin/bookings — every itinerary across every company
router.get(
  '/bookings',
  catchAsync(async (req, res) => {
    const bookings = db
      .prepare(
        `SELECT b.*, c.name AS companyName
         FROM bookings b
         JOIN companies c ON c.id = b.company_id
         ORDER BY b.created_at DESC
         LIMIT 500`
      )
      .all();
    res.json({ bookings });
  })
);

// GET /api/admin/quote-requests?status=quote_requested — the admin's work queue
router.get(
  '/quote-requests',
  catchAsync(async (req, res) => {
    const status = req.query.status;
    const validStatuses = ['quote_requested', 'quoted', 'declined'];
    const rows = status && validStatuses.includes(status)
      ? db
          .prepare(
            `SELECT b.*, c.name AS companyName FROM bookings b
             JOIN companies c ON c.id = b.company_id
             WHERE b.status = ? ORDER BY b.created_at DESC`
          )
          .all(status)
      : db
          .prepare(
            `SELECT b.*, c.name AS companyName FROM bookings b
             JOIN companies c ON c.id = b.company_id
             WHERE b.status IN ('quote_requested','quoted','declined')
             ORDER BY b.created_at DESC`
          )
          .all();
    res.json({ requests: rows });
  })
);

// PATCH /api/admin/quote-requests/:id — resolve a quote with an invoice
// amount, or decline it, adding an admin note visible to the corporate client.
router.patch(
  '/quote-requests/:id',
  catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('Invalid quote request id.');
    }

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quote request not found.' });
    }

    const status = req.body?.status;
    if (!['quoted', 'declined'].includes(status)) {
      throw new ValidationError('"status" must be "quoted" or "declined".');
    }

    const invoiceAmount = status === 'quoted' ? Number(req.body?.invoiceAmount) : null;
    if (status === 'quoted' && (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0)) {
      throw new ValidationError('"invoiceAmount" must be a positive number when quoting.');
    }
    const notes = String(req.body?.notes || '').slice(0, 1000);

    db.prepare(
      `UPDATE bookings SET status = ?, invoice_amount = ?, price = COALESCE(?, price), quote_notes = ? WHERE id = ?`
    ).run(status, invoiceAmount, invoiceAmount, notes, id);

    res.json({ ok: true });
  })
);

module.exports = router;
