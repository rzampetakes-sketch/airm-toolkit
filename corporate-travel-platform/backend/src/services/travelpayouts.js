// Builds the outbound "Book Now" deep link for Travelpayouts' Aviasales
// affiliate program, with our marker (affiliate ID) attached, so every click
// is tracked and commissioned to us.
//
// This app does NOT redirect the user automatically and does NOT lock the
// results page to Travelpayouts data — flight results themselves come live
// from Amadeus (see amadeusClient.js). This link is only used for the
// "Book Now" call-to-action, opened in a new tab by the frontend.
//
// >>> Set your affiliate marker in backend/.env as TRAVELPAYOUTS_MARKER <<<
// Get it free at https://www.travelpayouts.com after creating a "website" project.
const config = require('../config/env');

const MARKER = config.travelpayouts.marker;

function twoDigit(n) {
  return String(n).padStart(2, '0');
}

// Aviasales deep-link date format is "ddmm" (day + month, no year/dashes).
function toDdMm(isoDate) {
  const [, month, day] = isoDate.split('-');
  return `${twoDigit(day)}${twoDigit(month)}`;
}

/**
 * Builds an Aviasales (Travelpayouts) search deep link for an itinerary of
 * one or more legs. One leg = one-way; two legs (A->B, B->A) = round-trip;
 * more legs = multi-city — the URL scheme is the same concatenated pattern
 * for all three: {ORIGIN}{DDMM}{DEST} repeated per leg, then a pax digit.
 *
 * @param {Array<{origin: string, destination: string, date: string}>} legs
 * @param {number} adults
 */
function buildFlightBookingUrl(legs, adults) {
  const paxDigit = Math.min(Math.max(adults || 1, 1), 9);
  const searchToken = legs.map((leg) => `${leg.origin}${toDdMm(leg.date)}${leg.destination}`).join('') + paxDigit;

  const url = new URL(`https://www.aviasales.com/search/${searchToken}`);
  if (MARKER) url.searchParams.set('marker', MARKER);
  return url.toString();
}

module.exports = { buildFlightBookingUrl };
