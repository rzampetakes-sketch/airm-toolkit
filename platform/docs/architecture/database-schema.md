# Database Schema (ERD)

PostgreSQL, modeled with Prisma (`apps/api/prisma/schema.prisma` is the
source of truth). Five core entities as requested — `User`, `Booking`,
`Flight`, `EmptyLeg`, `Operator` — plus `Payment`, which any booking flow
needs.

```mermaid
erDiagram
    OPERATOR ||--o{ USER : "employs (operator staff logins)"
    OPERATOR ||--o{ EMPTY_LEG : lists
    USER ||--o{ BOOKING : places
    FLIGHT ||--o| BOOKING : "booked as"
    EMPTY_LEG ||--o| BOOKING : "booked as"
    BOOKING ||--o{ PAYMENT : "paid by"

    USER {
        uuid id PK
        string email
        string phone
        string first_name
        string last_name
        string role "traveler|operator|admin"
        uuid operator_id FK "nullable — set for operator staff logins"
        timestamp created_at
    }

    OPERATOR {
        uuid id PK
        string name
        string contact_email
        string contact_phone
        string certificate_number "Part 135 / ARGUS / IS-BAO ref"
        boolean verified
        string stripe_connected_account_id "nullable, set after Connect onboarding"
        timestamp created_at
    }

    FLIGHT {
        uuid id PK
        string source "duffel|amadeus|sabre|travelport|mock"
        string source_offer_id
        string cabin_class "business|first"
        string airline
        string origin
        string destination
        timestamp departure_at
        timestamp arrival_at
        jsonb raw_payload
        decimal amount
        string currency
        int seats_available
        timestamp expires_at
        timestamp created_at
    }

    EMPTY_LEG {
        uuid id PK
        uuid operator_id FK "nullable — null for external-aggregator listings"
        string operator_name
        string source "platform_listed|avinode|jettly|mock"
        string source_listing_id "nullable"
        string aircraft_type
        string origin
        string destination
        timestamp departure_at
        timestamp arrival_at
        int seats_available
        decimal amount
        string currency
        string status "available|booked|expired|cancelled"
        timestamp created_at
    }

    BOOKING {
        uuid id PK
        uuid user_id FK
        string booking_type "flight|empty_leg"
        uuid flight_id FK "nullable, unique — set when booking_type=flight"
        uuid empty_leg_id FK "nullable, unique — set when booking_type=empty_leg"
        string status "pending_payment|confirmed|cancelled|failed"
        decimal total_amount
        string currency
        string payment_status "unpaid|authorized|captured|refunded"
        timestamp created_at
    }

    PAYMENT {
        uuid id PK
        uuid booking_id FK
        string stripe_payment_intent_id
        decimal amount
        string currency
        decimal platform_fee_amount
        string status
        timestamp created_at
    }
```

## Notes on the design

- **`Booking` references exactly one of `flightId` / `emptyLegId`.**
  Prisma has no native "exactly one of two nullable FKs" constraint, so
  this is enforced in `BookingService` (`bookFlight` vs. `bookEmptyLeg`
  are separate methods, each setting only their own FK) rather than in
  the schema. If you outgrow two booking types, revisit this as a
  polymorphic `bookable_type`/`bookable_id` pair.
- **`Flight` is a cache, not authoritative inventory.** It's the priced
  snapshot returned from a provider search, with the provider's own
  `expiresAt` copied over — `BookingService.bookFlight` refuses to book
  an expired one. This is why `Flight` has a `rawPayload` JSONB column:
  it preserves exactly what the provider returned for later audit/dispute
  handling, even after the provider's own offer has expired.
- **`EmptyLeg` is a real table you own, not just a cache** — unlike
  `Flight`, this is authoritative inventory for `platform_listed` rows
  (an Operator's own listing lives here permanently, not just for the
  duration of a search). Its `status` transitions
  `available → booked` inside the same DB transaction that creates the
  `Booking`, closing the double-booking race condition.
- **`Operator.stripeConnectedAccountId` is nullable** because an
  operator can register and list flights before completing Stripe
  Connect onboarding; `PaymentsService` only attempts a split payout once
  it's set, otherwise the platform simply collects the full amount (settle
  with the operator out-of-band until then).
- **No loyalty/markup/B2B tables in this schema.** Those were part of an
  earlier, broader "VIP travel platform" concept for this same repo. This
  brief is scoped to exactly the two products described, so those tables
  were removed rather than left half-wired; add them back deliberately if
  a future brief asks for dynamic pricing or a loyalty program again.
