# Admin Ops Console (Phase 2)

Internal Next.js app for ops/pricing teams:

- CRUD on `MarkupRule` (route/aircraft/cabin/segment scoping, priority,
  validity window) — see `apps/api/src/modules/pricing`.
- Loyalty tier management and manual ledger adjustments — see
  `apps/api/src/modules/loyalty`.
- Charter RFQ queue: view/action pending `charter_requested` bookings.
- Booking + payment reconciliation views.

Not scaffolded yet — build after `apps/web` and `apps/api` MVP flows are
working end-to-end. Reuses `@travel-platform/ui` and `@travel-platform/types`.
