# Admin Ops Console (Phase 2)

Internal Next.js app for the platform team:

- Verify/approve Operators (`Operator.verified`) before their listings
  go live, to keep the empty-leg marketplace trustworthy.
- Moderate/expire stale `EmptyLeg` listings.
- Booking + payment reconciliation views across both products.

Not scaffolded yet — build after `apps/web` and `apps/api` MVP flows are
working end-to-end. Reuses `@travel-platform/ui` and `@travel-platform/types`.
