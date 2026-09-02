# High-Level System Architecture

VIP travel metasearch + booking platform. Merchant-of-record model, unified
search across commercial premium cabins, private jet charter, and empty legs,
plus a proprietary loyalty ledger spanning both.

## Guiding principles

- **Modular monolith first.** One NestJS deployable (`apps/api`) organized
  into strict modules (search, pricing, booking, loyalty, payments,
  notifications, users, integrations). Split into microservices later only
  where load actually demands it (search fan-out and notifications are the
  first candidates).
- **Adapter pattern for every external API.** Duffel, Amadeus/Sabre,
  Avinode, empty-leg feeds, Stripe, Twilio, Resend each live behind a
  narrow interface in `integrations/*`. The rest of the system never talks
  to a vendor SDK directly — it talks to `UnifiedFlightOffer`,
  `PaymentAdapter`, `NotificationAdapter`.
- **Unified offer model.** Commercial fares, charter quotes, and empty-leg
  inventory are normalized into one `UnifiedFlightOffer` shape at the edge
  of the integration layer, before pricing or ranking ever sees them.
- **Async by default for anything slow or unreliable.** Charter RFQs,
  ticket issuance, and notification delivery go through a queue
  (BullMQ/Redis), not the request/response path.

## Diagram

```
                                CLIENTS
   ┌───────────────┐   ┌───────────────────┐   ┌───────────────────┐
   │  Web (Next.js)│   │ B2B Portal (Next)  │   │ Admin Ops (Next)  │
   │  B2C storefront│  │ Agencies / desks   │   │ Markup & loyalty  │
   └───────┬───────┘   └─────────┬─────────┘   └─────────┬─────────┘
           │                     │                        │
           └──────────────┬──────┴────────────┬───────────┘
                           │   HTTPS / GraphQL or REST (BFF)
                  ┌────────▼─────────┐
                  │   API Gateway     │  AuthN/Z, rate limiting, request
                  │   (NestJS)        │  validation, idempotency keys
                  └────────┬─────────┘
                           │
   ┌───────────────────────┼────────────────────────────────────────┐
   │                        CORE DOMAIN MODULES (apps/api)           │
   │                                                                  │
   │  ┌───────────────┐  ┌───────────────┐  ┌────────────────────┐  │
   │  │ Search         │  │ Pricing /     │  │ Booking / Order    │  │
   │  │ Orchestrator   │─▶│ Markup Engine │─▶│ Management         │  │
   │  └───────┬───────┘  └───────────────┘  └──────────┬─────────┘  │
   │          │                                          │            │
   │  ┌───────▼───────┐  ┌───────────────┐  ┌───────────▼─────────┐  │
   │  │ Loyalty Ledger │  │ Payments      │  │ Notifications        │  │
   │  │ (Points Wallet)│  │ (Stripe Conn.)│  │ (WhatsApp/SMS/Email) │  │
   │  └───────────────┘  └───────────────┘  └──────────────────────┘  │
   └───────────────────────────┬────────────────────────────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │   INTEGRATION ADAPTERS      │
                  │  duffel / amadeus / sabre   │
                  │  avinode / empty-leg feed   │
                  │  stripe / twilio / resend   │
                  └─────────────┬──────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                        │
┌───────▼───────┐     ┌─────────▼────────┐      ┌────────▼────────┐
│ Duffel (NDC)   │     │ Avinode (charter │      │ Stripe Connect / │
│ Amadeus/Sabre  │     │ marketplace) +   │      │ Twilio / Resend  │
│ GDS (Business/ │     │ direct operator  │      │                  │
│ First cabins)  │     │ empty-leg feeds  │      │                  │
└───────────────┘     └──────────────────┘      └──────────────────┘

                    DATA & INFRA (shared by all modules)
   ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐
   │ PostgreSQL     │  │ Redis          │  │ Queue (BullMQ/Redis)   │
   │ users, bookings│  │ search cache,  │  │ charter RFQ workflow,  │
   │ loyalty, rules │  │ session, rate  │  │ ticketing, notify jobs │
   └───────────────┘  │ limiting       │  └───────────────────────┘
                       └───────────────┘
   ┌───────────────────────────────────────────────────────────────┐
   │ Object storage (S3-compatible): e-tickets, invoices, KYC docs   │
   └───────────────────────────────────────────────────────────────┘
```

## Request flow: unified search

1. Client sends one search request (`origin`, `destination`, `dates`,
   `pax`, `cabinPreference: business|first|private`).
2. `SearchOrchestratorService` fans out in parallel to enabled adapters:
   - Duffel (and/or Amadeus/Sabre) for scheduled Business/First fares.
   - Avinode for on-demand charter quotes matching the route/dates.
   - Empty-leg feed adapter for existing repositioning flights that match
     within a date/geography tolerance window.
3. Each adapter maps its vendor response into `UnifiedFlightOffer[]`
   (see `apps/api/src/common/interfaces/flight-offer.interface.ts`).
4. Results are merged into one array, cached in Redis keyed by the search
   signature (short TTL — prices are volatile, especially charter).
5. `PricingEngineService` (markup calculator) applies the matching
   `MarkupRule`(s) per offer based on route / aircraft type / cabin /
   customer segment, producing `finalAmount`.
6. Ranked, priced results return as one list to the client — commercial
   and private inventory interleaved, not in separate tabs.

## Request flow: booking

- **Commercial offer** → instant book: create order with adapter (Duffel
  order / Amadeus booking) inside a DB transaction that also creates the
  `Booking` + `BookingSegment` rows in `pending_payment` status → charge
  via Stripe → on success, confirm with adapter, mark `confirmed`, queue
  ticket issuance + notifications.
- **Charter / empty-leg offer** → instant request: create `Booking` in
  `charter_requested` status, push an RFQ job to the queue, operator
  confirms via Avinode → webhook updates booking to `confirmed` → payment
  capture → notifications.
- Both paths end by crediting the `LoyaltyLedger` (earn) once the booking
  is `confirmed`/`ticketed`, and by allowing `LoyaltyLedger` debits
  (redeem) to be applied as a discount at checkout on either flow.

## Why a modular monolith, not microservices, for the MVP

A team building an MVP does not have the operational maturity (observability,
service mesh, on-call) to run 8 services profitably on day one. A modular
monolith with clean module boundaries gets 90% of the maintainability
benefit at a fraction of the operational cost, and the adapter/module
boundaries drawn above are exactly the seams you cut along when a specific
module (most likely Search, given fan-out latency, or Notifications, given
volume) needs to scale independently later.
