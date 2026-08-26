// Session-based auth guards for the B2B corporate portal API. The public
// flight-search endpoints never touch these — only /api/corporate/* and
// /api/admin/* are protected.

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'You must be logged in to access this resource.' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'You must be logged in to access this resource.' });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
