const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const config = require('./src/config/env');
const logger = require('./src/utils/logger');
require('./src/db/database'); // initializes & seeds the SQLite DB on startup
const apiRateLimiter = require('./src/middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

const flightsRouter = require('./src/routes/flights');
const autocompleteRouter = require('./src/routes/autocomplete');
const authRouter = require('./src/routes/auth');
const corporateRouter = require('./src/routes/corporate');
const adminRouter = require('./src/routes/admin');

const app = express();
// Needed for correct secure-cookie / rate-limit behavior behind a reverse proxy (e.g. on Render/Heroku/Fly).
app.set('trust proxy', 1);

// --- Security & performance middleware --------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(compression());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// --- Corporate portal session (backed by SQLite so logins survive restarts) --
app.use(
  session({
    store: new SQLiteStore({ dir: path.join(__dirname, 'data'), db: 'sessions.db' }),
    name: 'connect.sid',
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      maxAge: 8 * 60 * 60 * 1000, // 8-hour session
    },
  })
);

// --- API routes ---------------------------------------------------------------
app.use('/api/flights', apiRateLimiter, flightsRouter);
app.use('/api/autocomplete', apiRateLimiter, autocompleteRouter);
app.use('/api/auth', apiRateLimiter, authRouter);
app.use('/api/corporate', apiRateLimiter, corporateRouter);
app.use('/api/admin', apiRateLimiter, adminRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv });
});

// --- Static frontend -----------------------------------------------------------
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Corporate Travel Platform listening on http://localhost:${config.port}`);
  if (!config.amadeus.clientId) {
    logger.warn(
      'AMADEUS_CLIENT_ID is not set — flight search will fail until you configure backend/.env'
    );
  }
  if (!config.travelpayouts.marker) {
    logger.warn(
      'TRAVELPAYOUTS_MARKER is not set — "Book Now" links will work but won\'t be credited to your affiliate account.'
    );
  }
});
