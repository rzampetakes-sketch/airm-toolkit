# Database Schema (ERD)

PostgreSQL, modeled with Prisma (`apps/api/prisma/schema.prisma` is the
source of truth — this doc is the human-readable view of it).

```mermaid
erDiagram
    COMPANY ||--o{ USER : employs
    USER ||--|| LOYALTY_ACCOUNT : has
    LOYALTY_ACCOUNT ||--o{ LOYALTY_LEDGER_ENTRY : records
    USER ||--o{ BOOKING : places
    COMPANY ||--o{ BOOKING : "places (B2B)"
    OFFER ||--o| BOOKING : "becomes"
    MARKUP_RULE ||--o{ OFFER : "applied to"
    BOOKING ||--o{ BOOKING_SEGMENT : contains
    BOOKING ||--o{ PASSENGER : carries
    BOOKING ||--o{ PAYMENT : "paid by"
    BOOKING ||--o{ NOTIFICATION_LOG : triggers
    BOOKING ||--o{ LOYALTY_LEDGER_ENTRY : "earns/redeems via"
    BOOKING ||--o| HOTEL_BOOKING : "add-on"
    BOOKING ||--o| TRANSFER_BOOKING : "add-on"

    COMPANY {
        uuid id PK
        string name
        string type "b2b_agency|corporate"
        string billing_currency
        timestamp created_at
    }

    USER {
        uuid id PK
        uuid company_id FK "nullable"
        string email
        string phone
        string first_name
        string last_name
        string role "b2c|b2b_agent|admin|ops"
        string kyc_status
        timestamp created_at
    }

    LOYALTY_ACCOUNT {
        uuid id PK
        uuid user_id FK
        int points_balance
        string tier "silver|gold|platinum|black"
        timestamp created_at
    }

    LOYALTY_LEDGER_ENTRY {
        uuid id PK
        uuid loyalty_account_id FK
        uuid booking_id FK "nullable"
        string entry_type "earn|redeem|adjust|expire"
        string source "commercial_flight|private_jet_charter|empty_leg|promo"
        int points
        int balance_after
        string notes
        timestamp created_at
    }

    MARKUP_RULE {
        uuid id PK
        string name
        string scope_type "route|aircraft_type|cabin_class|customer_segment|global"
        jsonb scope_value
        string markup_type "percentage|fixed"
        decimal markup_value
        int priority
        boolean active
        timestamp valid_from
        timestamp valid_to
    }

    OFFER {
        uuid id PK
        string source "duffel|amadeus|sabre|avinode|empty_leg"
        string source_offer_id
        string offer_type "commercial_flight|private_jet_charter|empty_leg"
        jsonb raw_payload
        decimal base_amount
        string base_currency
        uuid applied_markup_rule_id FK "nullable"
        decimal final_amount
        string final_currency
        timestamp expires_at
        timestamp created_at
    }

    BOOKING {
        uuid id PK
        uuid user_id FK
        uuid company_id FK "nullable"
        uuid offer_id FK
        string booking_type "commercial_flight|private_jet_charter|empty_leg"
        string status "pending_payment|charter_requested|confirmed|ticketed|cancelled|failed"
        string confirmation_number
        decimal total_amount
        string currency
        string payment_status "unpaid|authorized|captured|refunded"
        timestamp created_at
    }

    BOOKING_SEGMENT {
        uuid id PK
        uuid booking_id FK
        string segment_type "flight|charter_leg|hotel|transfer"
        string origin
        string destination
        timestamp departure_at
        timestamp arrival_at
        jsonb details
    }

    PASSENGER {
        uuid id PK
        uuid booking_id FK
        string first_name
        string last_name
        date date_of_birth
        string passport_number
        string nationality
    }

    PAYMENT {
        uuid id PK
        uuid booking_id FK
        string stripe_payment_intent_id
        string connected_account_id "nullable, Stripe Connect operator payout"
        decimal amount
        string currency
        decimal platform_fee_amount
        string status "requires_payment|authorized|captured|refunded|failed"
        timestamp created_at
    }

    NOTIFICATION_LOG {
        uuid id PK
        uuid user_id FK
        uuid booking_id FK "nullable"
        string channel "whatsapp|sms|email"
        string template
        string status "queued|sent|delivered|failed"
        timestamp sent_at
    }

    HOTEL_BOOKING {
        uuid id PK
        uuid booking_id FK
        string hotel_name
        string room_type
        date check_in
        date check_out
        decimal amount
    }

    TRANSFER_BOOKING {
        uuid id PK
        uuid booking_id FK
        string vehicle_type
        string pickup_location
        string dropoff_location
        timestamp pickup_at
        decimal amount
    }
```

## Notes on the design

- **`OFFER` is immutable and cached, not authoritative inventory.** It's a
  priced snapshot returned from search, with a short `expires_at`. A
  `BOOKING` references the `OFFER` it was created from so pricing/markup
  is always auditable after the fact, even if the rule changes later.
- **`LOYALTY_LEDGER_ENTRY` stores a running `balance_after`** on every row
  (append-only, never update/delete) so the wallet balance is always
  reconstructable and auditable — this is the same pattern used for
  financial ledgers. `LOYALTY_ACCOUNT.points_balance` is a denormalized
  cache of the latest `balance_after`, updated in the same DB transaction.
- **`MARKUP_RULE.scope_value` is JSONB** because scope shape differs by
  `scope_type` (a route rule needs `{origin, destination}`; an aircraft
  rule needs `{aircraftType}`; a segment rule needs `{customerSegment}`).
  Rules are evaluated in `priority` order and the pricing engine documents
  which one won on the `OFFER` row.
- **B2B vs B2C** is not a separate schema — `COMPANY` is nullable on both
  `USER` and `BOOKING`. A B2C consumer has `company_id = null`; a travel
  agent booking on behalf of a client has `company_id` set and the actual
  traveler goes in `PASSENGER`.
- Payment sits on its own table (not embedded in `BOOKING`) because a
  booking can have multiple payment attempts (failed → retried) and, for
  charter with a connected operator, potentially split disbursement.
