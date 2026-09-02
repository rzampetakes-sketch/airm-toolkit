# High-Level System Architecture

Two-part platform, one shared checkout:

1. **Business/First class flight search** — a Skyscanner-style search
   filtered to premium cabins only, with a full purchase flow (seats,
   baggage, frequent-flyer pass-through) rather than price comparison only.
2. **Private jet empty-leg marketplace** — operators, and any number of
   external aggregators, list discounted repositioning flights; users
   browse and book them.

Both funnel into the same checkout: once a Flight or EmptyLeg is
selected, the customer can attach hotel/car/taxi add-ons and pay for
everything — flight/leg plus every add-on — in one transaction. See
"The checkout flow" below.

## Guiding principles

- **Adapter pattern for every data source, in every domain** — flights,
  empty legs, and now hotels/car rentals/taxis. No service in this
  codebase talks to a vendor SDK directly; each only sees its own
  provider interface (`FlightProvider`, `EmptyLegProvider`,
  `HotelProvider`, `CarRentalProvider`, `TaxiProvider`). This is what
  lets the mock provider work today and a real vendor get swapped in
  later by adding one file, not by rewriting search or booking.
- **Mock data is a first-class provider, not a special case**, in every
  domain. `MockFlightProvider`, `MockEmptyLegProvider`,
  `MockHotelProvider`, `MockCarRentalProvider`, `MockTaxiProvider` all
  implement the exact same interface as a real adapter and are toggled
  with one env var (`USE_MOCK_PROVIDERS=true`). No orchestrator has an
  `if (mock)` branch anywhere.
- **Empty-leg providers are a registered array behind a DI token, not a
  fixed constructor signature.** `EmptyLegsService` depends only on
  `EMPTY_LEG_PROVIDERS` (an injection token resolving to
  `EmptyLegProvider[]`) — see `empty-legs.module.ts`. Adding JetHunter,
  Villiers, or any future aggregator is: write a class implementing
  `EmptyLegProvider`, add it to that module's provider list. Nothing in
  `EmptyLegsService`, the controller, or any other module changes. The
  same pattern (`HOTEL_PROVIDERS`, `CAR_RENTAL_PROVIDERS`,
  `TAXI_PROVIDERS`) is used for the three add-on domains, even though
  each currently has one real (`partner`) adapter plus mock — the brief
  calls for one contracted hotel/car/taxi partner, not a multi-vendor
  marketplace like empty legs, but the registry costs nothing extra and
  means adding a second partner later is the same one-file change.
- **`InternalEmptyLegProvider` is a provider like any other**, just
  always enabled — it reads `platform_listed` rows straight from
  Postgres (an Operator's own listings) rather than calling an external
  API. `EmptyLegsService` merges it with Avinode/Jettly/JetHunter/Villiers
  results without knowing or caring which is internal.
- **One `Booking` row is the whole checkout**, not just the flight/leg
  purchase — passengers, seat selections, baggage, and every add-on
  attach to it and are paid together. See "The checkout flow" below.
- **Modular monolith, not microservices, for the MVP.** One NestJS app
  with clean module boundaries. Split a module out later only if its
  load profile actually demands it.

## Diagram

```
                                   CLIENTS
   ┌────────────────────────┐            ┌───────────────────────┐
   │  Web (Next.js)          │            │ Operator Portal (Next) │
   │  search → checkout →    │            │ operators list empty   │
   │  add-ons → payment       │            │ legs, manage listings   │
   │  + persistent live chat  │            └────────────┬───────────┘
   │  widget (Crisp, every    │                          │
   │  page — see "Live chat") │                          │
   └────────────┬────────────┘                          │
                │                    HTTPS (REST)         │
                └──────────────────────┬──────────────────┘
                              ┌─────────▼─────────┐
                              │   API Gateway       │  AuthN, validation,
                              │   (NestJS)          │  rate limiting
                              └─────────┬─────────┘
                                        │
   ┌─────────────────────────────────────┼───────────────────────────────────┐
   │                      CORE DOMAIN MODULES (apps/api)                      │
   │                                                                           │
   │  ┌───────────┐   ┌────────────┐   ┌─────────┐   ┌──────────┐  ┌───────┐ │
   │  │ Flights    │   │ EmptyLegs   │   │ Hotels   │   │CarRentals │  │ Taxis  │ │
   │  │ (Part 1)   │   │ (Part 2)    │   │ (add-on) │   │ (add-on)  │  │(add-on)│ │
   │  └─────┬─────┘   └──────┬──────┘   └────┬────┘   └─────┬────┘  └───┬───┘ │
   │        │                │                │              │           │      │
   │        │         ┌──────▼──────┐         │              │           │      │
   │        │         │ Operators    │         │              │           │      │
   │        │         │ (listing mgmt│         │              │           │      │
   │        │         │  → EmptyLeg) │         │              │           │      │
   │        │         └─────────────┘         │              │           │      │
   │        └────────────────┴─────────────────┴──────┬───────┴───────────┘      │
   │                                                     │                        │
   │  ┌──────────────────────────────────────────────────▼─────────────────┐    │
   │  │  Booking  (one row = one checkout: passengers, seats, baggage,      │    │
   │  │  loyalty pass-through, hotel/car/taxi add-ons — see checkout flow)  │    │
   │  └──────────────────────────────┬───────────────────────────────────┘    │
   │                                  │                                          │
   │  ┌───────────────┐   ┌───────────▼──────────┐   ┌───────────────────┐     │
   │  │ Users          │   │ Payments               │   │ Notifications       │     │
   │  │ (+ saved       │   │ (Stripe + Connect      │   │ (booking             │     │
   │  │ LoyaltyMembership)  │  payout to operators) │   │  confirmation)       │     │
   │  └───────────────┘   └───────────────────────┘   └───────────────────┘     │
   └───────────────────────────────────┬─────────────────────────────────────┘
                                        │
                    ┌────────────────────▼───────────────────┐
                    │            PROVIDER ADAPTERS              │
                    │ flights/providers/{duffel,amadeus,sabre,  │
                    │   mock}                                    │
                    │ empty-legs/providers/{internal,avinode,   │
                    │   jettly,jethunter,villiers,mock}          │
                    │   ← registered array behind EMPTY_LEG_    │
                    │     PROVIDERS; adding a vendor = one line  │
                    │ hotels/providers/{partner,mock}            │
                    │ car-rentals/providers/{partner,mock}       │
                    │ taxis/providers/{partner,mock}             │
                    └────────────────────┬───────────────────┘
                                          │
   ┌───────────┬───────────┬─────────────┼─────────────┬───────────┬───────────┐
┌──▼──┐  ┌──────▼─────┐┌────▼────┐  ┌─────▼─────┐ ┌─────▼─────┐┌────▼────┐┌─────▼─────┐
│Duffel│ │Amadeus/Sabre││ Avinode │  │Jettly /   │ │ Postgres   ││ Hotel   ││ Car/Taxi   │
│(self-│ │(enterprise- │(Market- │  │JetHunter/ │ │(Operator-  ││ partner ││ partner    │
│serve)│ │ gated)      │place dev│  │Villiers   │ │ listed     ││ (vendor ││ (vendor    │
│      │ │             │program) │  │(unconfirmed│ │ empty legs)││  TBD)  ││  TBD)      │
└─────┘  └────────────┘└────────┘  │ APIs)     │ └───────────┘└────────┘└───────────┘
                                    └───────────┘

                    DATA & INFRA (shared by all modules)
        ┌───────────────┐        ┌───────────────────────┐
        │ PostgreSQL     │        │ Redis                  │
        │ users, bookings│        │ search result caching, │
        │ loyalty, seats,│        │ session, rate limiting │
        │ baggage, add-ons│       └───────────────────────┘
        └───────────────┘
```

## The checkout flow (search → confirmation)

This is the flow the wireframe in the accompanying design covers
screen-by-screen; here is the backend side of the same journey.

1. **Search.** `GET /flights/search` or `GET /empty-legs/search` — no DB
   write yet. Results are ephemeral `FlightOffer[]` / `EmptyLegListing[]`.
2. **Select → start checkout.** `POST /bookings/flights` (body: the exact
   `FlightOffer` the client got back) or `POST /bookings/empty-legs`
   (body: `emptyLegId`). This is the first DB write: for a flight, the
   chosen offer is cached into `Flight` + `FlightSegment` rows (search
   results are never persisted otherwise — see `FlightsService`); for an
   empty leg, its `EmptyLeg.status` flips to `booked` immediately, the
   same tradeoff an airline makes with a seat hold, given how scarce that
   inventory is. Either way, a `Booking` is created with `status: draft`.
3. **Passengers, seats, baggage, loyalty.** For each traveler:
   `POST /bookings/:id/passengers` (name, DOB, optionally a
   `LoyaltyMembership` — see "Frequent-flyer pass-through" below), then
   `POST /bookings/:id/seats` and `POST /bookings/:id/baggage` per
   passenger. Each call is a DB transaction that both records the
   selection and increments `Booking.totalAmount` — the running total the
   checkout UI displays is always the authoritative one, never
   recomputed client-side.
4. **Add-ons, same flow.** `GET /hotels/search`, `GET /car-rentals/search`,
   `GET /taxis/search` (each fans out across its own provider registry,
   same pattern as flights/empty-legs), then
   `POST /bookings/:id/hotels` / `car-rentals` / `taxis` to attach a
   choice. Optional, skippable, and — because they all post to the same
   `bookingId` — priced into the same running total as steps 2–3, not a
   separate purchase.
5. **Checkout.** `POST /bookings/:id/checkout` locks `totalAmount`, moves
   the `Booking` from `draft` to `pending_payment`, and creates one
   `Payment`/Stripe PaymentIntent covering everything assembled in steps
   2–4. For an empty-leg booking with a verified `Operator`, this is
   where the Stripe Connect commission split happens (see
   `PaymentsService`).
6. **Confirmation.** On payment success (Stripe webhook, not built in
   this pass — see the API's TODOs), `Booking.status` → `confirmed` and
   `NotificationsService` sends the booking confirmation.

## Frequent-flyer pass-through (not a platform loyalty program)

An earlier draft of this project had a platform-run "points wallet"
loyalty ledger; it was dropped when the project was rescoped to this
narrower brief. What's here instead is much smaller: a `LoyaltyMembership`
is just a saved `(airline IATA code, membership number)` pair on the
`User` (`POST /users/:id/loyalty-memberships`), copied onto the relevant
`Passenger` row at booking time (or entered fresh, one-off) and, once a
real GDS integration exists, forwarded to the airline as part of the
passenger record — Duffel, for example, accepts a
`loyalty_programme_accounts` field per passenger for exactly this. *The
airline* credits the miles; the platform never touches a balance.

## Hotel / car / taxi add-ons

Modeled identically to flights/empty legs — `HotelsModule`,
`CarRentalsModule`, `TaxisModule`, each with a `search()` that fans out
across an array of providers behind its own DI token
(`HOTEL_PROVIDERS`/`CAR_RENTAL_PROVIDERS`/`TAXI_PROVIDERS`) and a `mock`
provider for development. Each currently has exactly one real adapter —
`PartnerHotelProvider`, `PartnerCarRentalProvider`, `PartnerTaxiProvider`
— stubbed pending a vendor decision (the brief specifies "our own hotel
partner inventory/API", i.e. one contracted supplier per domain, not a
multi-vendor marketplace like empty legs). Booking an add-on attaches a
row (`HotelBooking`/`CarRentalBooking`/`TaxiBooking`) to the same
in-progress `Booking`, which is what makes it feel like the next step of
one checkout instead of a separate purchase.

## Live chat widget

**Recommendation: a hosted widget (Crisp), not a custom-built one**, for
the MVP. A custom chat stack (message storage, agent inbox, presence,
mobile push for agents) is weeks of work that has nothing to do with
selling flights; Crisp/Intercom-style widgets solve it in an afternoon.
Between the two, Crisp is the pragmatic MVP pick over Intercom — a
comparable embed with a materially lower cost floor for a small team;
revisit Intercom later if you need its deeper CRM/marketing-automation
features.

- **Frontend:** `apps/web/components/LiveChatWidget.tsx`, mounted once in
  `app/layout.tsx` so it's present on every page — persistent
  bottom-right, as requested — without every page needing to know about
  it. Renders nothing if `NEXT_PUBLIC_CRISP_WEBSITE_ID` is unset, so local
  dev without a Crisp account isn't broken.
- **Backend touchpoint (not yet built):** pass the logged-in user's id/
  email and, if they're mid-checkout, the current `bookingId`, into
  Crisp's session data (`$crisp.push(["set", "session:data", ...])`) so a
  support agent sees booking context immediately instead of asking the
  customer to repeat it. This is a small addition to
  `LiveChatWidget.tsx` once the frontend has an auth/session layer to
  read from — out of scope for this pass, which only wires up the widget
  itself.

## Why Part 1 and Part 2 aren't one merged "unified offer" model

An earlier draft of this project modeled commercial and private-jet
inventory as one `UnifiedFlightOffer` type merged into a single ranked
list. This brief is narrower and more concrete — two separate,
independently launchable products funneling into one shared checkout —
so `FlightOffer` and `EmptyLegListing` stay distinct types with distinct
search endpoints, while `Booking` (and everything attached to it) is
genuinely shared. Merging search results into one interleaved list is a
straightforward follow-on later; it doesn't require restructuring either
domain or the checkout.
