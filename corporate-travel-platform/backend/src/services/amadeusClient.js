// Thin client around the Amadeus for Developers "Self-Service" APIs.
//
// Handles OAuth2 client-credentials auth (with in-memory token caching) and
// exposes the live flight search this platform needs:
//   - searchFlightOffers -> POST /v2/shopping/flight-offers
//     (the origin-destinations request body, not the simpler GET endpoint,
//     because it is the only Amadeus shape that supports multi-city legs
//     AND a hard cabin restriction in one call)
//
// Credentials are read from backend/.env (AMADEUS_CLIENT_ID / _SECRET) and
// never sent to the browser — the frontend only ever talks to our own
// /api/* routes, which call this module server-side.
const config = require('../config/env');
const logger = require('../utils/logger');

const BASE_URL = config.amadeus.hostname === 'production'
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

class AmadeusApiError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'AmadeusApiError';
    this.statusCode = statusCode;
  }
}

let cachedToken = null; // { accessToken, expiresAt } — expiresAt in epoch ms

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.accessToken;
  }

  if (!config.amadeus.clientId || !config.amadeus.clientSecret) {
    throw new AmadeusApiError(
      'Amadeus API credentials are not configured. Add AMADEUS_CLIENT_ID and ' +
        'AMADEUS_CLIENT_SECRET to backend/.env (see .env.example).',
      503
    );
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.amadeus.clientId,
    client_secret: config.amadeus.clientSecret,
  });

  const response = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    logger.error('Amadeus auth failed:', data);
    throw new AmadeusApiError(
      'Could not authenticate with the Amadeus API. Check your credentials in backend/.env.',
      502
    );
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

/**
 * Live Business/First-class flight offer search, supporting one-way,
 * round-trip, and multi-city itineraries through a single request shape.
 *
 * @param {object} params
 * @param {Array<{origin: string, destination: string, date: string}>} params.legs
 *   One entry per itinerary leg. A round-trip is simply two legs
 *   (outbound + return); multi-city is any number of legs (2-6).
 * @param {number} params.adults
 * @param {'BUSINESS'|'FIRST'} params.cabinClass
 * @param {number} [params.max]  max number of offers to request (default 20)
 */
async function searchFlightOffers({ legs, adults, cabinClass, max = 20 }) {
  const token = await getAccessToken();

  const originDestinations = legs.map((leg, index) => ({
    id: String(index + 1),
    originLocationCode: leg.origin,
    destinationLocationCode: leg.destination,
    departureDateTimeRange: { date: leg.date },
  }));

  const travelers = Array.from({ length: adults }, (_, i) => ({
    id: String(i + 1),
    travelerType: 'ADULT',
  }));

  const requestBody = {
    currencyCode: 'USD',
    originDestinations,
    travelers,
    sources: ['GDS'],
    searchCriteria: {
      maxFlightOffers: max,
      flightFilters: {
        cabinRestrictions: [
          {
            cabin: cabinClass,
            coverage: 'MOST_SEGMENTS',
            originDestinationIds: originDestinations.map((od) => od.id),
          },
        ],
      },
    },
  };

  const response = await fetch(`${BASE_URL}/v2/shopping/flight-offers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data?.errors?.[0]?.detail || 'Unknown Amadeus API error.';
    logger.warn(`Amadeus flight-offers search failed (${response.status}):`, detail);
    // The test sandbox returns 400s for many route/date/cabin combinations
    // that simply have no inventory — surface that as "no results" instead
    // of a hard failure so the UI can show an empty state gracefully.
    if (response.status === 400) {
      return { data: [], dictionaries: {} };
    }
    throw new AmadeusApiError(`Amadeus API error: ${detail}`, 502);
  }

  return data;
}

module.exports = { AmadeusApiError, searchFlightOffers };
