const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { catchAsync } = require('../middleware/errorHandler');
const { requireNonEmptyString } = require('../utils/validators');

const router = express.Router();

// POST /api/auth/login  { email, password }
router.post(
  '/login',
  catchAsync(async (req, res) => {
    const email = requireNonEmptyString(req.body?.email, 'email', { maxLength: 200 }).toLowerCase();
    const password = requireNonEmptyString(req.body?.password, 'password', { maxLength: 200 });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let companyName = null;
    if (user.company_id) {
      const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(user.company_id);
      companyName = company?.name || null;
    }

    req.session.user = {
      id: user.id,
      companyId: user.company_id,
      companyName,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    };

    res.json({ user: req.session.user });
  })
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/me — used by dashboard/admin pages to check session state
router.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  res.json({ user: req.session.user });
});

module.exports = router;
