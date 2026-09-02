# Travel Platform (MVP scaffold)

VIP travel metasearch + booking platform: unified search across Business/
First class commercial flights, private jet charter, and empty legs, with
a merchant-of-record pricing/markup engine and a cross-product loyalty
ledger.

See [`docs/architecture/ARCHITECTURE.md`](./docs/architecture/ARCHITECTURE.md)
for the system design and [`docs/architecture/database-schema.md`](./docs/architecture/database-schema.md)
for the ERD. The Prisma schema at `apps/api/prisma/schema.prisma` is the
source of truth for the database.

## Layout

```
platform/
├── apps/
│   ├── web/              # Next.js B2C storefront (scaffolded)
│   ├── partner-portal/   # Next.js B2B portal (Phase 2, README only)
│   ├── admin/            # Next.js internal ops console (Phase 2, README only)
│   └── api/               # NestJS backend — modular monolith
│       ├── prisma/schema.prisma
│       └── src/
│           ├── modules/
│           │   ├── search/          # unified search orchestrator
│           │   ├── pricing/          # dynamic markup engine
│           │   ├── booking/          # order state machine
│           │   ├── loyalty/          # points wallet / ledger
│           │   ├── payments/         # Stripe Connect (merchant of record)
│           │   ├── notifications/    # WhatsApp/SMS/email
│           │   ├── users/
│           │   └── integrations/     # one adapter per external API
│           │       ├── duffel/
│           │       ├── avinode/
│           │       ├── stripe/
│           │       └── twilio/
│           └── common/
├── packages/
│   ├── types/    # @travel-platform/types — UnifiedFlightOffer, MarkupRule, etc.
│   └── ui/        # @travel-platform/ui — shared luxury component library
├── docker-compose.yml   # local Postgres + Redis
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting started

```bash
cd platform
cp .env.example .env        # fill in Duffel/Avinode/Stripe/Twilio keys as you get them
docker compose up -d        # Postgres + Redis
pnpm install
pnpm prisma:generate
pnpm prisma:migrate         # creates tables from schema.prisma
pnpm dev                    # runs apps/web and apps/api in parallel via turbo
```

`apps/web` serves on `:3000`, `apps/api` on `:3001` (prefixed `/api/v1`).

## What's real vs. stubbed right now

- **Real, working logic:** the Prisma schema, the markup-matching
  algorithm in `pricing.service.ts`, and the append-only loyalty ledger
  transaction in `loyalty.service.ts`.
- **Stubbed, ready to wire up:** `DuffelAdapter` and `AvinodeAdapter`
  return `[]` until real API credentials and request-building are added;
  `StripeAdapter`/`TwilioAdapter` call the real SDKs but need live keys in
  `.env`; `BookingService`/`PaymentsService`/`NotificationsService` cover
  the DB-side state machine but not the full orchestration (order
  creation with the vendor, RFQ queue, retry-backed notification queue).

## Suggested build order

1. Get `pnpm dev` running end-to-end against the stub adapters (empty
   results) to validate the wiring.
2. Implement `DuffelAdapter.fetchOffersFromDuffel` against a Duffel test
   API key — this unlocks real commercial search.
3. Implement the charter RFQ flow: `AvinodeAdapter` search + a BullMQ
   queue for request/quote/confirm, since charter is not instant-book.
4. Wire `PaymentsService` into the booking confirmation flow and add the
   Stripe webhook handler (`payment_intent.succeeded` → confirm booking →
   `LoyaltyService.earnForBooking` → `NotificationsService`).
5. Seed at least one `global` `MarkupRule` — pricing intentionally sells
   at cost with zero rules configured, by design (see
   `pricing.service.ts` docstring), so nothing should go live without one.
