# Operator Portal (Phase 2)

Next.js app for private jet Operators to:

- Register / manage their company profile (`Operator` model) and
  complete Stripe Connect onboarding for payouts.
- List empty legs directly (`POST /api/v1/operators/:operatorId/empty-legs`
  — see `apps/api/src/modules/operators`), which immediately become
  bookable through `InternalEmptyLegProvider`.
- View and manage bookings against their listings.

Not scaffolded yet. For the MVP, operator listings can be created via
direct API calls (Postman/curl) against `apps/api` — build this portal
once you have real operators wanting a self-serve UI instead of you
entering their listings for them.
