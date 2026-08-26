// Loads and validates environment variables once, at startup, so the rest of
// the app can trust `config` instead of reading process.env everywhere.
require('dotenv').config();

function required(name, { allowEmptyInDev = false } = {}) {
  const value = process.env[name];
  if (!value) {
    if (allowEmptyInDev && process.env.NODE_ENV !== 'production') {
      return '';
    }
    throw new Error(
      `Missing required environment variable "${name}". ` +
        'Copy backend/.env.example to backend/.env and fill in your credentials.'
    );
  }
  return value;
}

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4000',

  amadeus: {
    // Amadeus lets the sandbox run with placeholder credentials rejected at
    // call-time (not at boot), which keeps `npm start` usable for exploring
    // the UI before the developer has registered for API keys.
    clientId: required('AMADEUS_CLIENT_ID', { allowEmptyInDev: true }),
    clientSecret: required('AMADEUS_CLIENT_SECRET', { allowEmptyInDev: true }),
    hostname: process.env.AMADEUS_HOSTNAME === 'production' ? 'production' : 'test',
  },

  travelpayouts: {
    marker: process.env.TRAVELPAYOUTS_MARKER || '',
    apiToken: process.env.TRAVELPAYOUTS_API_TOKEN || '',
  },

  rateLimit: {
    windowMinutes: parseFloat(process.env.RATE_LIMIT_WINDOW_MINUTES || '1'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10),
  },

  session: {
    // Signs the corporate-portal session cookie. Generate a real random
    // value for production, e.g.: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
  },
};

module.exports = config;
