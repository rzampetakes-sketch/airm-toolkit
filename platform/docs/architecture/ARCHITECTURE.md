# High-Level System Architecture

Two-part platform:

1. **Business/First class flight search** — a Skyscanner-style search
   filtered to premium cabins only.
2. **Private jet empty-leg marketplace** — operators list discounted
   repositioning flights; users browse and book them.

Both share the same booking/payment/user infrastructure but have
independent search domains and independent provider integrations — that
separation is the main architectural decision below.

## Guiding principles

- **Adapter pattern for every data source, in both domains.** Neither
  `FlightsService` (Part 1) nor `EmptyLegsService` (Part 2) ever talks to
  a vendor SDK directly — each only sees a `FlightProvider` /
  `EmptyLegProvider` implementation. This is what lets you launch on the
  mock provider today and swap in Duffel/Avinode later by adding one
  file, not by rewriting search or booking.
- **Mock data is a first-class provider, not a special case.**
  `MockFlightProvider` and `MockEmptyLegProvider` implement the exact
  same interface as every real adapter and are toggled with one env var
  (`USE_MOCK_PROVIDERS=true`). The orchestrator code has no `if (mock)`
  branch anywhere — see `flights.service.ts` / `empty-legs.service.ts`.
- **Part 2 has two distinct data sources merged into one list:** listings
  Operators enter directly through the platform (`InternalEmptyLegProvider`,
  reading straight from Postgres — this is first-party marketplace data,
  always enabled) and listings pulled from an external aggregator like
  Avinode (gated behind API credentials, disabled until you have them).
  `EmptyLegsService` merges both without caring which is which.
- **Modular monolith, not microservices, for the MVP.** One NestJS app
  with clean module boundaries (`flights`, `empty-legs`, `operators`,
  `booking`, `payments`, `notifications`, `users`). Split out a module
  later only if its load profile actually demands it.

## Diagram

```
                         CLIENTS
   ┌────────────────────┐        ┌───────────────────────┐
   │  Web (Next.js)      │        │ Operator Portal (Next) │
   │  business/first      │        │ operators list empty   │
   │  class search + book │        │ legs, manage listings   │
   │  empty-leg browse    │        └────────────┬───────────┘
   └──────────┬──────────┘                     │
              │            HTTPS (REST)         │
              └─────────────────┬───────────────┘
                        ┌────────▼─────────┐
                        │   API Gateway     │  AuthN, validation,
                        │   (NestJS)        │  rate limiting
                        └────────┬─────────┘
                                 │
   ┌─────────────────────────────┼─────────────────────────────────┐
   │                  CORE DOMAIN MODULES (apps/api)                 │
   │                                                                  │
   │  ┌──────────────────┐        ┌───────────────────────────────┐ │
   │  │ Flights           │        │ EmptyLegs                      │ │
   │  │ (Part 1: search)  │        │ (Part 2: marketplace)          │ │
   │  └─────────┬────────┘        └───────┬───────────┬───────────┘ │
   │            │                          │           │             │
   │            │                  ┌───────▼──────┐  ┌─▼───────────┐│
   │            │                  │ Operators     │  │(reads back  ││
   │            │                  │ (listing mgmt)│  │ Operator     ││
   │            │                  └───────────────┘  │ listings)    ││
   │            │                                       └────────────┘│
   │  ┌─────────▼─────────────────────────▼──────────┐                │
   │  │              Booking / Payments / Users        │               │
   │  └────────────────────────────────────────────────┘               │
   └──────────────────────────────┬───────────────────────────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │      PROVIDER ADAPTERS        │
                     │  flights/providers/{duffel,   │
                     │  amadeus,sabre,mock}          │
                     │  empty-legs/providers/{avinode,│
                     │  jettly,internal,mock}         │
                     └──────────────┬──────────────┘
                                    │
      ┌──────────────┬──────────────┼───────────────┬───────────────┐
┌─────▼─────┐  ┌──────▼─────┐ ┌─────▼──────┐  ┌──────▼──────┐ ┌─────▼─────┐
│ Duffel     │  │ Amadeus    │ │ Sabre      │  │ Avinode      │ │ Postgres  │
│ (self-serve│  │ (Enterprise│ │ (activation│  │ (Marketplace │ │ (Operator-│
│ signup)    │  │ only — see │ │ via rep)   │  │ dev program) │ │ listed    │
│            │  │ research)  │ │            │  │              │ │ empty legs│
└────────────┘  └────────────┘ └────────────┘  └──────────────┘ └───────────┘

                    DATA & INFRA (shared by all modules)
        ┌───────────────┐        ┌───────────────────────┐
        │ PostgreSQL     │        │ Redis                  │
        │ users, bookings│        │ search result caching, │
        │ operators,     │        │ session, rate limiting │
        │ flights, legs  │        └───────────────────────┘
        └───────────────┘
```

## Request flow: business/first class search (Part 1)

1. Client calls `GET /api/v1/flights/search?origin&destination&departureDate&cabinClass=business|first`.
2. `FlightsService` fans out in parallel to every **enabled**
   `FlightProvider` (a provider's `isEnabled()` checks its own env vars —
   nothing is called if uncredentialed).
3. Each provider maps its vendor response into the shared `FlightOffer`
   shape (`packages/types`), already filtered to the requested cabin —
   filtering happens in the provider's own API request (e.g. Duffel's
   `cabin_class` param), not client-side after fetching everything.
4. Results are merged, sorted by price, and returned as one list.
5. Booking a `FlightOffer` creates a `Booking` row referencing the cached
   `Flight` record (see database-schema.md) and proceeds to payment.

## Request flow: empty-leg marketplace (Part 2)

1. **Listing side:** an Operator calls
   `POST /api/v1/operators/:operatorId/empty-legs` (from the operator
   portal) to publish a repositioning flight. This writes directly to
   the `EmptyLeg` table with `source = platform_listed`.
2. **Browse side:** a user calls `GET /api/v1/empty-legs/search`.
   `EmptyLegsService` merges `InternalEmptyLegProvider` (reads the
   `platform_listed` rows straight from Postgres) with any enabled
   external aggregator (`AvinodeEmptyLegProvider`, `JettlyEmptyLegProvider`)
   into one sorted list.
3. Booking marks the `EmptyLeg` row `booked` inside a DB transaction
   (preventing a race where two users book the same seats) and creates a
   `Booking`.
4. Payment splits via Stripe Connect: the operator receives the fare
   minus the platform's commission, once they've completed Connect
   onboarding (`Operator.stripeConnectedAccountId`).

## Why this isn't one merged "unified offer" model

An earlier draft of this project modeled commercial and private-jet
inventory as one `UnifiedFlightOffer` type merged into a single ranked
list (useful for a "one search bar for everything" VIP product). This
brief is narrower and more concrete — two separate, independently
launchable products — so `FlightOffer` and `EmptyLegListing` are kept as
distinct types with distinct search endpoints. Merging them into one
interleaved search result is a straightforward follow-on if you later
want that UX; it does not require restructuring either domain.
