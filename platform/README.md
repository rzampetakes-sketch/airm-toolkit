# Business Class Search + Private Jet Empty Leg Marketplace

Two-part MVP with a full shared checkout:

1. **Business/First class flight search** — Skyscanner-style search
   filtered to premium cabins only, with a real purchase flow: seat
   selection, baggage, and frequent-flyer number pass-through to the
   airline (not a platform loyalty program — see database-schema.md).
2. **Private jet empty-leg marketplace** — operators list discounted
   repositioning flights, and any number of external aggregators
   (Avinode, and later JetHunter/Villiers/etc.) can be plugged in beside
   them without touching core logic; users browse and book.

Either purchase can pick up **hotel / car rental / airport taxi add-ons**
in the same checkout, all paid in one transaction, plus a **persistent
live chat widget** on every page.

See [`docs/architecture/ARCHITECTURE.md`](./docs/architecture/ARCHITECTURE.md)
for the system design (including the full checkout flow and the
multi-provider registry pattern), [`docs/architecture/database-schema.md`](./docs/architecture/database-schema.md)
for the ERD, and [`docs/architecture/api-provider-research.md`](./docs/architecture/api-provider-research.md)
for researched notes on which flight/empty-leg data providers are
realistically accessible today. The Prisma schema at
`apps/api/prisma/schema.prisma` is the source of truth for the database.

## Layout

```
platform/
├── apps/
│   ├── web/               # Next.js — search, checkout, add-ons, live chat widget
│   ├── operator-portal/   # Next.js — operators list empty legs (Phase 2, README only)
│   ├── admin/             # Next.js — internal ops console (Phase 2, README only)
│   └── api/                # NestJS backend — modular monolith
│       ├── prisma/schema.prisma
│       └── src/
│           ├── modules/
│           │   ├── flights/           # Part 1: business/first class search
│           │   │   └── providers/     #   duffel, amadeus, sabre, mock
│           │   ├── empty-legs/        # Part 2: marketplace search
│           │   │   └── providers/     #   internal, avinode, jettly, jethunter, villiers, mock
│           │   │                      #   (registered array behind EMPTY_LEG_PROVIDERS)
│           │   ├── operators/         # operator registration + listing management
│           │   ├── hotels/            # add-on: HOTEL_PROVIDERS registry (partner, mock)
│           │   ├── car-rentals/       # add-on: CAR_RENTAL_PROVIDERS registry (partner, mock)
│           │   ├── taxis/             # add-on: TAXI_PROVIDERS registry (partner, mock)
│           │   ├── booking/           # checkout state machine: draft → pending_payment → confirmed
│           │   ├── payments/          # Stripe (+ Connect payout to operators)
│           │   ├── notifications/     # booking confirmation (WhatsApp/SMS)
│           │   └── users/             # + saved LoyaltyMembership (frequent-flyer numbers)
│           └── common/
├── packages/
│   ├── types/    # @travel-platform/types — FlightOffer, EmptyLegListing, HotelOffer, etc.
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

Every search domain is built against a provider interface, not a vendor
SDK, and every domain's providers are resolved through a DI token so the
service that uses them never grows a vendor-specific branch:

- `flights/providers/flight-provider.interface.ts` — `MockFlightProvider`,
  `DuffelFlightProvider`, `AmadeusFlightProvider`, `SabreFlightProvider`.
- `empty-legs/providers/empty-leg-provider.interface.ts` +
  `EMPTY_LEG_PROVIDERS` token — `MockEmptyLegProvider`,
  `InternalEmptyLegProvider` (your own operators' listings, always on),
  `AvinodeEmptyLegProvider`, `JettlyEmptyLegProvider`,
  `JetHunterEmptyLegProvider`, `VilliersEmptyLegProvider`. Adding another
  aggregator is a one-file change — see `empty-legs.module.ts`.
- `hotels/providers/hotel-provider.interface.ts` + `HOTEL_PROVIDERS`
  token — `MockHotelProvider`, `PartnerHotelProvider`. Same pattern for
  `car-rentals` (`CAR_RENTAL_PROVIDERS`) and `taxis` (`TAXI_PROVIDERS`).

Each provider's `isEnabled()` checks its own env vars — the owning
service just fans out to whichever providers are currently enabled and
merges the results. Set `USE_MOCK_PROVIDERS=true` to build and demo the
whole app before any real credentials exist; flip it off and set the
relevant API key once you have one, and nothing else changes.

## What's real vs. stubbed right now

- **Real, working logic:** the Prisma schema (including the checkout
  additions: `Passenger`, `SeatSelection`, `BaggageSelection`,
  `LoyaltyMembership`, `HotelBooking`/`CarRentalBooking`/`TaxiBooking`);
  the provider fan-out/merge in every domain's service; the full
  checkout state machine in `booking.service.ts` (`draft` →
  passengers/seats/baggage/add-ons, each a transaction that also updates
  `Booking.totalAmount` → `checkout()` locks the total and creates one
  `Payment`); the Stripe Connect commission split in `payments.service.ts`;
  the live chat widget (`apps/web/components/LiveChatWidget.tsx`, Crisp).
- **Stubbed, ready to wire up:** `DuffelFlightProvider` and
  `AvinodeEmptyLegProvider` are the most realistic real integrations (see
  api-provider-research.md) but still return `[]` until you add the real
  HTTP calls with a live API key. `AmadeusFlightProvider` is intentionally
  dormant — Amadeus Self-Service was decommissioned in 2026. Seat/baggage
  pricing uses a flat heuristic (see `booking.service.ts`) pending a real
  provider ancillary-pricing call. `PartnerHotelProvider` /
  `PartnerCarRentalProvider` / `PartnerTaxiProvider` have no vendor picked
  yet — see ARCHITECTURE.md's add-ons section.

## Suggested build order

1. `USE_MOCK_PROVIDERS=true`, `pnpm dev` — validate both search flows and
   the full checkout (passengers → seats → baggage → add-ons → checkout)
   end-to-end against fixture data.
2. Get a Duffel test API key (same-day, self-serve) and implement
   `DuffelFlightProvider.createOfferRequest` — this unlocks real Part 1
   search; revisit seat/baggage pricing against Duffel's real ancillary
   APIs at the same time.
3. Recruit a few real operators and have them list empty legs via
   `POST /operators/:id/empty-legs` — this unlocks real Part 2 inventory
   with zero third-party integration work.
4. Pick and integrate one hotel partner and one car/taxi partner (or one
   partner covering both) — implement the three `Partner*Provider` stubs.
5. Wire `PaymentsService` into the booking confirmation flow, add the
   Stripe webhook handler, and send the confirmation notification.
6. Once Part 2 has traction, pursue an Avinode Marketplace subscription
   for `AvinodeEmptyLegProvider`, and revisit JetHunter/Villiers directly
   with each vendor before building against them (see
   api-provider-research.md).
