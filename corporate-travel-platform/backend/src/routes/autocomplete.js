const express = require('express');
const { fetchLocations } = require('../services/autocompleteService');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/validators');

const router = express.Router();

// GET /api/autocomplete/locations?term=Lon
router.get(
  '/locations',
  catchAsync(async (req, res) => {
    const term = (req.query.term || '').trim();
    if (term.length < 2) {
      throw new ValidationError('"term" must be at least 2 characters.');
    }

    const locations = await fetchLocations(term);
    res.json({ locations: locations.slice(0, 8) });
  })
);

module.exports = router;
