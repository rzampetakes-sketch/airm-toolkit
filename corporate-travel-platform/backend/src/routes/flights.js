const express = require('express');
const amadeus = require('../services/amadeusClient');
const { transformFlightOffers } = require('../services/transformers');
const { catchAsync } = require('../middleware/errorHandler');
const { parsePassengerCount, parseCabinClass, requireLegs } = require('../utils/validators');

const router = express.Router();

// POST /api/flights/search
// Body: { legs: [{origin, destination, date}, ...], adults, cabinClass }
//
// A single request shape covers one-way (1 leg), round-trip (2 legs where
// leg 2 reverses leg 1's cities), and multi-city (2-6 arbitrary legs) —
// this platform never queries Economy/Premium Economy inventory.
router.post(
  '/search',
  catchAsync(async (req, res) => {
    const legs = requireLegs(req.body?.legs);
    const adults = parsePassengerCount(req.body?.adults, 'adults');
    const cabinClass = parseCabinClass(req.body?.cabinClass);

    const searchContext = { legs, adults, cabinClass };

    const amadeusResponse = await amadeus.searchFlightOffers({
      legs,
      adults,
      cabinClass,
      max: 20,
    });

    const offers = transformFlightOffers(amadeusResponse, searchContext);

    res.json({
      count: offers.length,
      currency: offers[0]?.currency || 'USD',
      offers,
    });
  })
);

module.exports = router;
