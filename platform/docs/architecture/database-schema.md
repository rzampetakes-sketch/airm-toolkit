# Database Schema (ERD)

PostgreSQL, modeled with Prisma (`apps/api/prisma/schema.prisma` is the
source of truth). Extends the original five entities (`User`, `Booking`,
`Flight`, `EmptyLeg`, `Operator`) with the checkout-journey additions
requested: loyalty pass-through, seat selection, baggage, and the
hotel/car/taxi add-ons.

```mermaid
erDiagram
    OPERATOR ||--o{ USER : "employs (operator staff logins)"
    OPERATOR ||--o{ EMPTY_LEG : lists
    USER ||--o{ BOOKING : places
    USER ||--o{ LOYALTY_MEMBERSHIP : saves
    FLIGHT ||--o| BOOKING : "booked as"
    FLIGHT ||--o{ FLIGHT_SEGMENT : has
    EMPTY_LEG ||--o| BOOKING : "booked as"
    BOOKING ||--o{ PASSENGER : carries
    BOOKING ||--o{ SEAT_SELECTION : includes
    BOOKING ||--o{ BAGGAGE_SELECTION : includes
    BOOKING ||--o{ HOTEL_BOOKING : "add-on"
    BOOKING ||--o{ CAR_RENTAL_BOOKING : "add-on"
    BOOKING ||--o{ TAXI_BOOKING : "add-on"
    BOOKING ||--o{ PAYMENT : "paid by"
    PASSENGER ||--o{ SEAT_SELECTION : has
    PASSENGER ||--o{ BAGGAGE_SELECTION : has
    FLIGHT_SEGMENT ||--o{ SEAT_SELECTION : "seat on"

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

    LOYALTY_MEMBERSHIP {
        uuid id PK
        uuid user_id FK
        string airline_iata_code
        string membership_number
        timestamp created_at
        note "unique (user_id, airline_iata_code) — NOT a points ledger, see notes"
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

    FLIGHT_SEGMENT {
        uuid id PK
        uuid flight_id FK
        int sequence
        string origin
        string destination
        timestamp departure_at
        timestamp arrival_at
        string airline
        string flight_number
        int duration_minutes
    }

    EMPTY_LEG {
        uuid id PK
        uuid operator_id FK "nullable — null for external-aggregator listings"
        string operator_name
        string source "platform_listed|avinode|jettly|jethunter|villiers|mock"
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
        string status "draft|pending_payment|confirmed|cancelled|failed"
        decimal total_amount "accumulates as passengers/seats/baggage/add-ons are attached"
        string currency
        string payment_status "unpaid|authorized|captured|refunded"
        timestamp created_at
    }

    PASSENGER {
        uuid id PK
        uuid booking_id FK
        string first_name
        string last_name
        date date_of_birth
        string passport_number "nullable"
        string loyalty_airline_iata_code "nullable — snapshot at booking time"
        string loyalty_membership_number "nullable — snapshot at booking time"
    }

    SEAT_SELECTION {
        uuid id PK
        uuid booking_id FK
        uuid passenger_id FK
        uuid flight_segment_id FK
        string seat_number
        decimal price_adjustment
        string currency
        timestamp created_at
        note "unique (passenger_id, flight_segment_id)"
    }

    BAGGAGE_SELECTION {
        uuid id PK
        uuid booking_id FK
        uuid passenger_id FK
        string bag_type "checked|carry_on"
        int quantity
        decimal price_adjustment
        string currency
        timestamp created_at
    }

    HOTEL_BOOKING {
        uuid id PK
        uuid booking_id FK
        string source "partner|mock"
        string source_property_id
        string hotel_name
        string room_type
        date check_in
        date check_out
        decimal amount
        string currency
    }

    CAR_RENTAL_BOOKING {
        uuid id PK
        uuid booking_id FK
        string source "partner|mock"
        string vehicle_type
        string pickup_location
        string dropoff_location
        timestamp pickup_at
        timestamp dropoff_at
        decimal amount
        string currency
    }

    TAXI_BOOKING {
        uuid id PK
        uuid booking_id FK
        string source "partner|mock"
        string vehicle_type
        string pickup_location
        string dropoff_location
        timestamp pickup_at
        decimal amount
        string currency
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

## What changed from the previous revision, and why

- **`Booking.status` gained `draft`.** Previously a `Booking` was created
  already `pending_payment`. Now it's created `draft` the moment a
  Flight/EmptyLeg is selected and stays `draft` through passengers,
  seats, baggage, and add-ons — `BookingService.checkout()` is the only
  thing that moves it to `pending_payment`, at which point `totalAmount`
  is locked and the single `Payment` is created. This is what makes "one
  checkout, one payment" true at the data level, not just in the UI.
- **`Flight` now has real `FlightSegment` rows**, not just a JSON blob.
  Search results (`GET /flights/search`) are still never persisted, but
  the moment a customer commits to an offer (`POST /bookings/flights`),
  it's cached into `Flight` + `FlightSegment` — segments need to be
  addressable rows so `SeatSelection` can reference *which leg* a seat
  was picked on, not just which flight.
- **`Passenger` is back.** It existed in an earlier revision of this
  project, was removed when the project was rescoped to a leaner brief,
  and returns now because seat selection, baggage, and per-traveler
  frequent-flyer numbers are all inherently per-passenger, not
  per-booking.
- **`LoyaltyMembership` is deliberately not a ledger.** No
  `points_balance`, no `earn`/`redeem` entries — just a saved
  `(airline, membership number)` pair per user, because the brief asks
  for miles to be credited *by the airline*, not by the platform. Its
  data is copied onto `Passenger.loyalty_*` at booking time (see
  `BookingService.addPassenger`) so what's on file for next time can't be
  silently changed by editing a past booking.
- **`HotelBooking`/`CarRentalBooking`/`TaxiBooking` all key off
  `Booking`, not off `User` or a separate "order".** An add-on is
  something attached to one specific checkout, priced into that
  checkout's `totalAmount`, and paid by that checkout's one `Payment` —
  never a standalone purchase with its own payment flow.
- **`EmptyLegProviderSource` gained `jethunter` and `villiers`** as
  additional (currently unconfirmed-API, per api-provider-research.md)
  aggregators, alongside the existing `avinode`/`jettly`/`platform_listed`
  — this is the only schema change adding a new empty-leg source ever
  requires; the application-layer registry change is one line in
  `empty-legs.module.ts` (see ARCHITECTURE.md).
