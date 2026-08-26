# AURUM — Business & First Class Travel Platform

A premium, B2B-focused travel platform for Business and First Class flights
only. It combines a public live-search engine (with Travelpayouts affiliate
booking links) and a Corporate Portal — login, dashboard, quote/invoice
requests, and an admin desk — so it's ready to pitch directly to corporate
travel accounts.

Built from scratch: no WordPress, no page builder, no heavy UI framework.
Plain HTML5 + Tailwind CSS on the frontend, Node.js/Express + SQLite on the
backend.

---

## 1. What's inside

- **Live flight search** — Amadeus Self-Service `POST /v2/shopping/flight-offers`,
  hard-locked to `BUSINESS`/`FIRST` cabins server-side (Economy and Premium
  Economy are rejected by the API, not just hidden in the UI). One request
  shape covers one-way, round-trip, and multi-city (2-6 legs).
- **Rich results** — per-leg flight times/duration/stops, checked-baggage
  allowance, and cabin amenities, all read directly from the Amadeus fare
  data (not hard-coded marketing copy).
- **Monetized booking** — every "Book Now" button opens an Aviasales
  (Travelpayouts) deep link in a new tab with your affiliate `marker`
  attached, without ever redirecting the page itself.
- **B2B Corporate Portal** (SQLite-backed, session auth):
  - **Client dashboard** — travel history, monthly expenditure, quote/invoice
    request tracker, CSV and PDF expense export.
  - **Quote / invoice requests** — a logged-in corporate user can request a
    custom itinerary quote instead of booking immediately.
  - **Admin panel** — every corporate account, every booking, and a work
    queue to resolve quote requests (issue an invoice amount or decline).
- **Dark luxury UI** — charcoal/navy background, brass/gold accents, built
  with Tailwind (compiled to a static stylesheet, no CDN dependency).

## 2. Directory structure

```
corporate-travel-platform/
└── backend/                     # Single Node service: API + static frontend
    ├── server.js                 # Express app entrypoint
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.example               # Copy to .env and fill in your credentials
    ├── data/                      # SQLite files, auto-created (gitignored)
    │   ├── corporate.db            # companies / users / bookings
    │   └── sessions.db             # login sessions
    ├── src/
    │   ├── config/
    │   │   └── env.js               # Loads & validates backend/.env
    │   ├── middleware/
    │   │   ├── auth.js               # requireAuth / requireRole session guards
    │   │   ├── errorHandler.js       # catchAsync + centralized JSON errors
    │   │   └── rateLimiter.js        # express-rate-limit on /api/*
    │   ├── db/
    │   │   └── database.js           # SQLite schema + demo-data seeding
    │   ├── services/
    │   │   ├── amadeusClient.js      # OAuth2 + POST flight-offers search
    │   │   ├── travelpayouts.js      # Builds the affiliate "Book Now" link
    │   │   ├── autocompleteService.js# City/airport autocomplete (no key needed)
    │   │   └── transformers.js       # Raw Amadeus JSON -> UI-friendly shape
    │   ├── routes/
    │   │   ├── flights.js            # POST /api/flights/search
    │   │   ├── autocomplete.js       # GET  /api/autocomplete/locations
    │   │   ├── auth.js               # POST /api/auth/login, /logout, GET /me
    │   │   ├── corporate.js          # /api/corporate/* (role: client)
    │   │   └── admin.js              # /api/admin/*     (role: admin)
    │   └── utils/
    │       ├── validators.js         # Input validation (IATA codes, dates, legs...)
    │       ├── csv.js                # Dependency-free CSV writer
    │       ├── pdf.js                # PDF expense summary (pdfkit)
    │       └── logger.js
    └── public/                    # Static frontend, served by Express
        ├── index.html               # Search + results (public)
        ├── login.html                # Corporate portal login
        ├── dashboard.html            # Corporate client dashboard
        ├── admin.html                 # Admin panel
        ├── css/
        │   ├── input.css              # Tailwind source
        │   └── output.css             # Compiled stylesheet (checked in, prebuilt)
        └── js/
            ├── api.js                 # fetch() wrapper for our own /api/*
            ├── state.js               # Shared in-memory session object
            ├── utils.js               # Formatting/escaping helpers
            ├── autocomplete.js        # Reusable autocomplete dropdown widget
            ├── flights.js             # Search form, filters, sort, results, quote modal
            ├── main.js                # Boots the homepage
            ├── login.js, dashboard.js, admin.js
```

## 3. Prerequisites

- Node.js 18+ (Node 20/22 recommended)
- A free [Amadeus for Developers](https://developers.amadeus.com) account
  (Self-Service test API — real, live-queried flight data with a limited
  sandbox catalog of routes)
- A free [Travelpayouts](https://www.travelpayouts.com) affiliate account
  (for your `marker` ID — this is what earns you commission)

No database server, no Redis, no external services required — everything
(including corporate accounts and sessions) runs from a single embedded
SQLite file created automatically on first run.

## 4. Setup

```bash
cd corporate-travel-platform/backend
npm install

cp .env.example .env
# now edit .env — see step 5 below for exactly which values to fill in

npm run build:css      # compiles Tailwind (public/css/output.css is also
                        # checked in prebuilt, so this step is optional
                        # unless you change the design)

npm start               # http://localhost:4000
```

On first run the server prints two demo logins to the console (also stored,
hashed, in `backend/data/corporate.db`):

```
Admin:            admin@corporatetravel.example / AdminDemo123!
Corporate client: travel.manager@meridiancapital.example / ClientDemo123!
```

Use these to explore `/dashboard.html` and `/admin.html` immediately —
**change or remove them** (`src/db/database.js` → `seedDemoData()`) before
using this with real client data.

For local development with auto-restart on file changes: `npm run dev`
(uses `nodemon`).

## 5. Where to put your credentials

Everything lives in `backend/.env` (copied from `.env.example`, and already
git-ignored — never commit your real `.env`).

### Amadeus Self-Service API (live flight data)

```env
AMADEUS_CLIENT_ID=your_amadeus_api_key_here
AMADEUS_CLIENT_SECRET=your_amadeus_api_secret_here
AMADEUS_HOSTNAME=test
```

1. Create a free account at https://developers.amadeus.com.
2. Go to **My Self-Service Workspace → Create new app**.
3. Copy the **API Key** into `AMADEUS_CLIENT_ID`.
4. Copy the **API Secret** into `AMADEUS_CLIENT_SECRET`.
5. Leave `AMADEUS_HOSTNAME=test` until Amadeus approves your app for
   production traffic (a paid tier); then switch it to `production`.
   `backend/src/services/amadeusClient.js` picks the correct base URL
   (`test.api.amadeus.com` vs `api.amadeus.com`) automatically from this
   value.

The test environment returns real, live-queried results but only for a
limited catalog of routes/dates — if a search returns zero results, that's
expected sandbox behavior, not a bug (see `amadeusClient.js`, which turns a
"no inventory" 400 response into a clean empty result instead of an error).

### Travelpayouts affiliate marker (monetization)

```env
TRAVELPAYOUTS_MARKER=your_travelpayouts_marker_id_here
```

1. Sign up free at https://www.travelpayouts.com and create a "website"
   project.
2. Your affiliate ID is shown in the dashboard as **marker** (a number,
   e.g. `123456`). Paste it into `TRAVELPAYOUTS_MARKER`.

`backend/src/services/travelpayouts.js` attaches this marker as a
`?marker=` query parameter to every outbound Aviasales "Book Now" link — see
`buildFlightBookingUrl()` for the exact URL format if you want to customize
it (e.g. swap in your own white-label domain).

### Session secret (corporate portal login)

```env
SESSION_SECRET=replace_with_a_long_random_string
```

Generate one with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Corporate database

No setup needed — SQLite is used by default so the whole platform runs with
zero external infrastructure (see `backend/src/db/database.js`, which
creates and demo-seeds `backend/data/corporate.db` on first launch). The top
of that file explains exactly how to swap in a hosted Postgres/MySQL
database later without touching any route file, if/when you outgrow SQLite.

## 6. How the pieces fit together

**Public search (`/`)** — the frontend calls `POST /api/flights/search` with
an array of `legs` (`{origin, destination, date}`), traveler count, and
`cabinClass` (`BUSINESS` or `FIRST` — the API rejects anything else). The
backend authenticates with Amadeus (OAuth2 client-credentials, cached
in-memory), submits a `flight-offers` search with a `cabinRestrictions`
filter, and returns a compact JSON shape per offer: airline, per-leg
itinerary, baggage allowance, amenities, price, and a ready-to-use
`bookingUrl`. The frontend never sees your Amadeus or Travelpayouts
credentials — only your own server does.

**Booking** — clicking "Book Now" opens `bookingUrl` in a new tab
(`target="_blank" rel="noopener noreferrer"`) and, if the visitor is logged
into a corporate account, silently logs the itinerary to their dashboard via
`POST /api/corporate/bookings` (fire-and-forget; the actual booking still
happens on the partner site).

**Quote requests** — "Request Quote / Invoice" requires a corporate login.
It posts the itinerary to `POST /api/corporate/quote-requests`
(`status = quote_requested`). It shows up in the client's own dashboard and
in the admin's **Pending quote requests** queue. The admin resolves it
(`PATCH /api/admin/quote-requests/:id`) with either an invoice amount
(`status = quoted`) or a decline — the client sees the update on their next
dashboard visit.

**Auth** — `express-session`, backed by a SQLite session store so logins
survive server restarts. Passwords are hashed with `bcryptjs`. Every
`/api/corporate/*` route requires `role = client` and is automatically
scoped to that user's own `company_id` — one corporate account can never see
another's data. Every `/api/admin/*` route requires `role = admin`.

## 7. Adding real corporate clients

Create a company and its first user directly in SQLite (or write a small
admin-only signup route if you want self-serve onboarding):

Run this from inside `backend/`:

```bash
node -e "
const db = require('./src/db/database');
const bcrypt = require('bcryptjs');
const companyId = db.prepare('INSERT INTO companies (name, billing_email) VALUES (?, ?)')
  .run('Acme Holdings', 'travel@acme.example').lastInsertRowid;
db.prepare('INSERT INTO users (company_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
  .run(companyId, 'Jane Doe', 'jane@acme.example', bcrypt.hashSync('a-strong-temp-password', 10), 'client');
console.log('Created company', companyId);
"
```

## 8. Production notes

- Set `NODE_ENV=production` so session cookies are marked `secure` (requires
  HTTPS) and Express serves compact error responses.
- Put this behind a reverse proxy (nginx, Caddy, or your platform's
  built-in one) for TLS termination; `app.set('trust proxy', 1)` is already
  configured in `server.js`.
- Back up `backend/data/corporate.db` regularly — it's the only place
  corporate account and booking data lives.
- Rotate `SESSION_SECRET` and the demo passwords before onboarding real
  clients.
