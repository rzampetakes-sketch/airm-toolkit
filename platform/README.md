# Business Class Search + Private Jet Empty Leg Marketplace

Two-part MVP:

1. **Business/First class flight search** — Skyscanner-style search
   filtered to premium cabins only.
2. **Private jet empty-leg marketplace** — operators list discounted
   repositioning flights; users browse and book them.

See [`docs/architecture/ARCHITECTURE.md`](./docs/architecture/ARCHITECTURE.md)
for the system design, [`docs/architecture/database-schema.md`](./docs/architecture/database-schema.md)
for the ERD, and [`docs/architecture/api-provider-research.md`](./docs/architecture/api-provider-research.md)
for researched notes on which flight/empty-leg data providers are
realistically accessible today and what each requires. The Prisma schema
at `apps/api/prisma/schema.prisma` is the source of truth for the
database.

## Layout

```
platform/
├── apps/
│   ├── web/               # Next.js — flight search UI + empty-leg browse (scaffolded)
│   ├── operator-portal/   # Next.js — operators list empty legs (Phase 2, README only)
│   ├── admin/             # Next.js — internal ops console (Phase 2, README only)
│   └── api/                # NestJS backend — modular monolith
│       ├── prisma/schema.prisma
│       └── src/
│           ├── modules/
│           │   ├── flights/           # Part 1: business/first class search
│           │   │   └── providers/     #   duffel, amadeus, sabre, mock
│           │   ├── empty-legs/        # Part 2: marketplace search
│           │   │   └── providers/     #   internal (Operator-listed), avinode, jettly, mock
│           │   ├── operators/         # operator registration + listing management
│           │   ├── booking/           # order state machine (flight | empty_leg)
│           │   ├── payments/          # Stripe (+ Connect payout to operators)
│           │   ├── notifications/     # booking confirmation (WhatsApp/SMS)
│           │   └── users/
│           └── common/
├── packages/
│   ├── types/    # @travel-platform/types — FlightOffer, EmptyLegListing, etc.
│   └── ui/        # @travel-platform/ui — FlightOfferCard, EmptyLegCard
├── docker-compose.yml   # local Postgres + Redis
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting started

```bash
cd platform
cp .env.example .env        # USE_MOCK_PROVIDERS=true works with zero API keys
docker compose up -d        # Postgres + Redis
pnpm install
pnpm prisma:generate
pnpm prisma:migrate         # creates tables from schema.prisma
pnpm dev                    # runs apps/web and apps/api in parallel via turbo
```

`apps/web` serves on `:3000`, `apps/api` on `:3001` (prefixed `/api/v1`).

## The adapter pattern (why you can start with zero API keys)

Both search domains are built against a provider interface, not a
vendor SDK:

- `apps/api/src/modules/flights/providers/flight-provider.interface.ts`
  — implemented by `MockFlightProvider`, `DuffelFlightProvider`,
  `AmadeusFlightProvider`, `SabreFlightProvider`.
- `apps/api/src/modules/empty-legs/providers/empty-leg-provider.interface.ts`
  — implemented by `MockEmptyLegProvider`, `InternalEmptyLegProvider`
  (your own operators' listings, always on), `AvinodeEmptyLegProvider`,
  `JettlyEmptyLegProvider`.

Each provider's `isEnabled()` checks its own env vars — `FlightsService`
and `EmptyLegsService` just fan out to whichever providers are currently
enabled and merge the results. Set `USE_MOCK_PROVIDERS=true` to build
and demo the whole app before any real credentials exist; flip it off
and set `DUFFEL_API_KEY` (or `AVINODE_API_KEY`) once you have one, and
nothing else changes.

## What's real vs. stubbed right now

- **Real, working logic:** the Prisma schema; the provider fan-out/merge
  in `flights.service.ts` and `empty-legs.service.ts`; the booking state
  machine including the transactional "mark booked" race-condition fix
  in `booking.service.ts`; the Stripe Connect commission split in
  `payments.service.ts`.
- **Stubbed, ready to wire up:** `DuffelFlightProvider` and
  `AvinodeEmptyLegProvider` are the two most realistic real integrations
  (see api-provider-research.md) but still return `[]` until you add the
  real HTTP calls with a live API key. `AmadeusFlightProvider` is
  intentionally dormant — Amadeus Self-Service was decommissioned in
  2026; don't build against it without an Enterprise agreement.

## Suggested build order

1. `USE_MOCK_PROVIDERS=true`, `pnpm dev` — validate both search flows
   and the booking flow end-to-end against fixture data.
2. Get a Duffel test API key (same-day, self-serve) and implement
   `DuffelFlightProvider.createOfferRequest` — this unlocks real Part 1
   search.
3. Recruit a few real operators and have them list empty legs via
   `POST /operators/:id/empty-legs` — this unlocks real Part 2 inventory
   with zero third-party integration work.
4. Wire `PaymentsService` into the booking confirmation flow, add the
   Stripe webhook handler, and send the confirmation notification.
5. Once Part 2 has traction, pursue an Avinode Marketplace subscription
   and implement `AvinodeEmptyLegProvider` for broader liquidity beyond
   your own operator network.
