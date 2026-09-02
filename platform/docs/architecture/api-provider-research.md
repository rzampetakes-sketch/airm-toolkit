# API / Data Provider Research

Researched September 2026. Confidence noted per vendor — verify anything
marked "unconfirmed" directly before committing engineering time or a
contract to it. This is not legal or commercial advice; pricing and
access terms change and should be reconfirmed with each vendor before
you budget against them.

## Part 1 — Business/First class commercial fares

| Provider | Real-time premium-cabin data? | Access model | Notes |
|---|---|---|---|
| **Duffel** | Yes — `cabin_class` request param (`economy`/`premium_economy`/`business`/`first`), filtered airline-side, not client-side | **Self-serve signup**, no accreditation required | Best starting point for an indie MVP. Coverage still depends on which airlines Duffel has NDC/EDIFACT connections to — verify your specific target routes have business/first inventory before committing. Pricing is transactional (per-booking), not a flat API fee — confirm current rates on their site before modeling unit economics. |
| **Amadeus Self-Service** | N/A — **portal decommissioned** | Self-service registration was paused in Spring 2026 and the entire Self-Service developer portal was shut down **2026-07-17**; existing keys are disabled | **Do not build against this.** If you already see this recommended in older tutorials/blog posts, it's stale. The `AmadeusFlightProvider` stub in this repo is intentionally dormant and warns loudly if a key is set. |
| **Amadeus Enterprise** | Yes, same underlying GDS data | Direct commercial agreement with Amadeus (not self-serve); typically requires an account team conversation | The realistic path to Amadeus data now, but expect a sales cycle and minimum commercial terms, not an instant API key. |
| **Sabre (Bargain Finder Max)** | Yes — full ATPCO/NDC/LCC content, cabin-filterable | **Requires activation by a Sabre account representative** — no instant self-serve key | Same pattern as Amadeus Enterprise: budget for an onboarding/commercial conversation, not a signup form. |
| **Travelport (Universal API)** | Yes | Requires **IATA or ARC agency accreditation**, or operating under a host agency/consolidator's ticketing authority, plus a certification process | The most gated of the four — assume this is a Phase 2+ integration once you have (or partner with someone who has) agency accreditation. |

**Bottom line for an MVP:** start on **Duffel**. It's the only one of the
four with same-day, no-accreditation self-serve access, and it natively
supports the business/first filter this project needs. Treat
Amadeus/Sabre/Travelport as later additions once you have commercial
leverage (volume, funding, or an agency partner) to get past their gates
— the adapter pattern in `apps/api/src/modules/flights/providers/` means
adding them later is additive, not a rewrite.

## Part 2 — Private jet empty-leg data

| Provider | Real-time empty-leg data? | Access model | Notes |
|---|---|---|---|
| **Avinode** | Yes — purpose-built for this: "End Client Empty Leg Search" and "End Client Empty Leg Subscription" (webhook push) APIs at `developer.avinodegroup.com` | Requires an **Avinode Marketplace account** (broker or operator subscription) to get API credentials — not an anonymous public key | The strongest real candidate. Avinode is the dominant B2B charter marketplace, so its empty-leg feed is the deepest liquidity pool available. Prefer the subscription/webhook flow over polling search for production, per their own docs. Confirm current Marketplace subscription pricing directly — it's not published as a flat developer fee. |
| **Jettly** | Markets "API Integrations" for empty legs on its site | **Unconfirmed** — no public technical documentation (auth, request/response shape, rate limits) found during this research pass | Contact Jettly directly before relying on this; the `JettlyEmptyLegProvider` stub in this repo is a placeholder, not a verified integration. |
| **JetHunter, Villiers, Jettly (consumer-facing), EmptyJet, Jetvia** | These are consumer-facing empty-leg **marketplaces/brokers** (B2C booking sites), not confirmed developer data APIs | N/A | Worth watching as potential future partnership/affiliate sources, but no evidence of a public API found. Don't assume "FlightPath", "Portside", or "Stripejet" (mentioned in the original brief) are current, documented API products — none turned up verifiable developer documentation in this research pass; if you have a specific vendor link for these, share it and I'll verify directly. |
| **Your own Operators (first-party)** | Yes, by construction | You control it entirely | `EmptyLeg` rows with `source = platform_listed`, created by operators through the operator portal / `POST /operators/:id/empty-legs`. This is "free" real-time data you don't have to license from anyone — likely your actual bootstrap strategy before any aggregator deal closes. |

**Bottom line for an MVP:** launch on **first-party operator listings**
(free, immediate, no vendor negotiation) and treat **Avinode** as the
first external aggregator to pursue once you have enough traction to
justify a Marketplace subscription — it's the one vendor here with
genuine, documented, purpose-built API support for exactly this feature.

## What this means for the build order

1. Ship with `USE_MOCK_PROVIDERS=true` to build and demo both search
   flows against fixture data (`MockFlightProvider`, `MockEmptyLegProvider`).
2. Get a **Duffel** test API key (same-day signup) — this unlocks real
   Part 1 search with zero commercial negotiation.
3. Recruit a handful of real jet **Operators** to list empty legs
   directly — this unlocks real Part 2 inventory with zero API
   integration work at all.
4. Pursue an **Avinode Marketplace** subscription once Part 2 has enough
   users to justify it, for broader empty-leg liquidity beyond your own
   operator network.
5. Revisit Amadeus Enterprise / Sabre / Travelport only once you have the
   commercial standing (funding, volume, or an agency partnership) their
   gated access models expect.
