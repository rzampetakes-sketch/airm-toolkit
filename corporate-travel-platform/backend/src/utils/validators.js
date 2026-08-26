// Shared request-validation helpers. Every value that ends up inside an
// outbound URL (to Amadeus or to a Travelpayouts booking link) is validated
// here first, so malformed or malicious input never reaches those calls.

const IATA_CODE_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// This platform is scoped exclusively to premium travel — Economy and
// Premium Economy are intentionally not accepted anywhere in the API.
const CABIN_CLASSES = new Set(['BUSINESS', 'FIRST']);

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function requireIataCode(value, fieldName) {
  if (typeof value !== 'string' || !IATA_CODE_RE.test(value.toUpperCase())) {
    throw new ValidationError(`"${fieldName}" must be a valid 3-letter IATA code (e.g. "JFK").`);
  }
  return value.toUpperCase();
}

function requireDate(value, fieldName, { allowPast = false } = {}) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new ValidationError(`"${fieldName}" must be a date in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`"${fieldName}" is not a valid calendar date.`);
  }
  if (!allowPast) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (parsed < today) {
      throw new ValidationError(`"${fieldName}" cannot be in the past.`);
    }
  }
  return value;
}

function parsePassengerCount(value, fieldName, { min = 1, max = 9, defaultValue = 1 } = {}) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`"${fieldName}" must be a whole number between ${min} and ${max}.`);
  }
  return n;
}

function parseCabinClass(value) {
  const upper = String(value || '').toUpperCase();
  if (!CABIN_CLASSES.has(upper)) {
    throw new ValidationError(
      `"cabinClass" must be one of: ${Array.from(CABIN_CLASSES).join(', ')} (this platform only searches premium cabins).`
    );
  }
  return upper;
}

/**
 * Validates a multi-city itinerary: 1-6 legs, each with valid IATA codes and
 * a valid date, dates non-decreasing across legs (you can't depart on a
 * later leg before an earlier one).
 */
function requireLegs(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError('"legs" must be a non-empty array of flight legs.');
  }
  if (value.length > 6) {
    throw new ValidationError('A maximum of 6 legs is supported per itinerary.');
  }

  let previousDate = null;
  return value.map((leg, index) => {
    const origin = requireIataCode(leg?.origin, `legs[${index}].origin`);
    const destination = requireIataCode(leg?.destination, `legs[${index}].destination`);
    if (origin === destination) {
      throw new ValidationError(`legs[${index}]: origin and destination must be different.`);
    }
    const date = requireDate(leg?.date, `legs[${index}].date`);
    if (previousDate && date < previousDate) {
      throw new ValidationError('Each leg must depart on or after the previous leg\'s date.');
    }
    previousDate = date;
    return { origin, destination, date };
  });
}

function requireNonEmptyString(value, fieldName, { maxLength = 100 } = {}) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${fieldName}" is required.`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`"${fieldName}" is too long.`);
  }
  return value.trim();
}

module.exports = {
  ValidationError,
  requireIataCode,
  requireDate,
  parsePassengerCount,
  parseCabinClass,
  requireNonEmptyString,
  requireLegs,
};
