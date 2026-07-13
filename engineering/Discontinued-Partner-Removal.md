# Discontinued Partner Removal

## Purpose

This document records the static verification and implementation scope for removing active customer-facing references to discontinued PAG, Voltwise, VaultMind/VM, NodeWatt, and related joint-program packaging from the Gateway repository.

This is a historical engineering record only. It must not be used to advertise, sell, provision, or imply an active partner relationship.

## Reason For Removal

Nexum Suum is no longer working with the former partner organizations referenced by discontinued joint-program packaging. Active customer-facing offers, partner badges, joint-program descriptions, checkout paths, entitlement paths, and data-sharing paths tied specifically to those former partners must not remain available in Gateway.

The relationships are inactive, the programs are discontinued, and any former-partner names retained in this document are historical audit references only. This document cannot be used for marketing, sales, provisioning, active partnership representation, or customer-facing partnership claims.

## Implementation Record

| Item | Result |
|---|---|
| Implementation date | 2026-07-12 |
| Branch | `codex-pag-voltwise-removal` |
| Production files changed | `src/pages/Pricing.tsx` |
| Documentation files changed | `engineering/Discontinued-Partner-Removal.md` |
| Default branch modified | Yes, through approved PR merge |
| Pull request | `https://github.com/razzellv/nexum-unified-gateway/pull/9` |
| Approved source commit | `e2a95d381b854ee4d674a395f5c3aa01a6a45471` |
| Production merge commit | `00c4ccb930cb5e4c8d76bd88990f85916bb75b77` |
| Merged timestamp | `2026-07-13T12:16:04Z` |
| Netlify production deploy ID | `6a54d7069e874000084d32aa` |
| Netlify production context | `production` |
| Netlify production state | `ready` |
| Netlify created timestamp | `2026-07-13T12:16:06.042Z` |
| Netlify published timestamp | `2026-07-13T12:16:35.051Z` |
| Production URL | `https://portal.nexumsuum-facilityintelligence.com` |
| Deployed or merged | Yes |

## Confirmed Scope

Repository-wide static search found active former-partner/joint-program references concentrated in `src/pages/Pricing.tsx`.

Confirmed active Pricing references removed:

- Command Enterprise feature labels for discontinued joint programs.
- Enterprise Joint Programs section.
- Institutional-Scale Programs customer-facing heading and explanation.
- IFRA, DIGP, OC3, and CIIP program cards.
- PAG and VM partner badges.
- Request Engagement buttons tied to those discontinued program cards.

## Search Terms Used

- `PAG`
- `Persistence Analytics Group`
- `Persistence Analytics`
- `Voltwise`
- `Volt Wise`
- `VoltWise`
- `VaultMind`
- `NodeWatt`
- `VM`
- `Nexum Suum + PAG`
- `Nexum Suum + Voltwise`
- `Nexum Suum + PAG + Voltwise`
- `NS + PAG`
- `NS + Voltwise`
- `NS + PAG + Voltwise`
- `Integrated Facility Risk Assessment`
- `Institutional Scale Programs`
- `Institutional-Scale Programs`
- `Joint Programs`
- `CIIP`
- `OC3`
- `DIGP`
- `IFRA`

## Active References Removed

| Area | Result |
|---|---|
| Pricing page cards | Removed discontinued joint-program cards. |
| Pricing page quick/feature labels | Removed joint-program labels from Command Enterprise features. |
| Pricing page calls to action | Removed request-engagement buttons for discontinued joint-program offerings. |
| Public route navigation | No separate active Joint Programs or Partnership Hub route was found in the repository. |
| Metadata/SEO/schema | No active former-partner metadata or schema was found in static search. |
| Mobile/responsive variants | Pricing section was generated from the same removed JSX block; no separate mobile duplicate was found. |

## Exact Pricing Elements Removed

- Command Enterprise feature array entries:
  - `── Joint Programs`
  - `IFRA™ Integrated Risk Assessment`
  - `CIIP™ Continuity Intelligence`
  - `OC3™ Certification eligible`
- Enterprise Joint Programs section wrapper.
- `Enterprise Joint Programs` eyebrow.
- `Institutional-Scale Programs` heading.
- Multi-partner program explanatory copy.
- Program-card data and UI for:
  - IFRA Integrated Facility Risk Assessment.
  - DIGP Decision Intelligence Governance Program.
  - OC3 Operational Continuity & Compliance Certification.
  - CIIP Continuity & Institutional Intelligence Program.
- `PAG` and `VM` partner badges inside those cards.
- Discontinued program pricing labels and tier notes.
- `Request Engagement` buttons that called `openEngage` with discontinued program names.

## Imports, Constants, And Assets

- No imported pricing data was tied exclusively to the removed programs.
- No image or logo assets were found for the discontinued partners in repository search.
- No route imports were removed.
- No constants outside the removed inline Pricing block were removed.
- No icon imports were removed because `TrendingUp` remains used by supported Nexum Suum Pricing content.

## Deprecated Identifiers Retained

No Stripe price IDs, product IDs, entitlement keys, DynamoDB seed records, Lambda route identifiers, or environment variables specific to the discontinued partner programs were found in repository code during static search.

The former names and acronyms are retained only in this engineering note for auditability.

## Historical Compatibility Decisions

- No historical customer records were edited.
- No Stripe records were deleted.
- No DynamoDB records were deleted.
- No AWS resources were changed.
- No entitlement identifiers were remapped to another tier.

## Stripe Impact

No active Stripe price IDs, lookup keys, checkout metadata, webhook conditions, success-page logic, or cancellation-page logic specific to the discontinued partner programs were found in repository code.

Because `/stripe/verify-session` is already classified as missing or uncertain in the engineering audit, end-to-end checkout verification remains limited. This removal does not attempt to repair that route.

Supported Nexum Suum pricing, Stripe identifiers, checkout behavior, and customer subscription tiers were preserved.

## Entitlement Impact

No active entitlement mappings specific to PAG, Voltwise, VaultMind/VM, NodeWatt, IFRA, DIGP, OC3, or CIIP were found in repository code.

Supported Nexum Suum tiers and sector configurations were not changed.

Independent Gateway capabilities were preserved, including Drift Intelligence, Operational DNA, Facility Memory, Observation Journal, Climate Intelligence, Compliance Intelligence, operational trend detection, engineering calculations, HVAC metric derivation, baseline calculations, risk trends, performance suggestions, reliability indicators, Decision Defensibility outputs, role-specific analysis, and tier-specific analysis.

## Integration Impact

No active API calls, webhooks, scheduled jobs, Lambda invocations, outbound HTTP requests, credentials, endpoint URLs, browser keys, email destinations, SMS destinations, or integration controls specific to the discontinued partners were found in repository code.

No infrastructure or secret cleanup was performed.

## Platform Impact

| Area | Result |
|---|---|
| API Gateway/API routes | No code changes. |
| Lambda | No code changes. |
| IAM | No changes. |
| DynamoDB | No records or table definitions changed. |
| S3/assets | No assets changed or deleted. |
| Environment variables | No variables added, changed, or removed. |
| Authentication/authorization | No changes. |
| Tenant/facility isolation | No changes. |
| Role/tier enforcement | No changes. |
| Security | Removed active customer-facing discontinued-offer CTAs; no secrets exposed. |

## AWS Follow-Up Items

Static repository review found no partner-specific AWS resources to remove from code. AWS Console verification is still recommended before declaring infrastructure cleanup complete:

- API Gateway routes.
- Lambda environment variables.
- CloudWatch scheduled events.
- DynamoDB historical records.
- S3 customer-facing assets.
- Stripe product metadata outside this repository.

## Test Results

Static verification performed:

- Repository-wide former-partner search before edit.
- Pricing-page source inspection.
- Repository-wide former-partner search after edit.

Validation performed:

- `npm run build`: passed.
- `npm run lint`: failed on existing repository-wide lint debt during pre-release validation, including a parse error in `lambda/pilot-admin.mjs` and broad pre-existing `@typescript-eslint/no-explicit-any`, hook dependency, empty-block, and related lint findings outside this removal scope.
- TypeScript type check: no standalone `package.json` script exists; `npx tsc --noEmit` passed.
- Formatting: no standalone formatting script exists in `package.json`.
- Local preview route check: `npx vite preview --host 127.0.0.1 --port 4173` served `/pricing` with HTTP 200.
- PR deploy preview check: Netlify deploy preview passed for `https://deploy-preview-9--nexum-facility-intelligence.netlify.app`.
- Production deploy check: Netlify production deploy `6a54d7069e874000084d32aa` reached `ready` for merge commit `00c4ccb930cb5e4c8d76bd88990f85916bb75b77`.
- Desktop live browser verification passed against `/pricing` on production.
- Mobile live browser verification passed against `/pricing` on production.
- Browser console errors during live desktop/mobile verification: none observed.

No unit, integration, component, route, entitlement, or checkout test script is currently defined in `package.json`.

Post-change search results:

- Production source search (`src`, `lambda`, `public`, `netlify.toml`, `package.json`, `index.html`): no former-partner or discontinued-program matches.
- Repository-wide search: remaining matches are in this historical engineering document only.

## Production Verification

Production verification was completed on `2026-07-13` after Netlify published deploy `6a54d7069e874000084d32aa`.

Confirmed absent from the rendered production Pricing page on desktop and mobile:

- `Institutional-Scale Programs`
- `IFRA`
- `DIGP`
- `OC3`
- `CIIP`
- `Integrated Facility Risk Assessment`
- `PAG`
- `VaultMind`
- `Voltwise`
- `NodeWatt`
- `Request Engagement`

Confirmed still present on the rendered production Pricing page on desktop and mobile:

- `Basic`
- `Standard`
- `Business`
- `Prestige`
- `Retail`
- `Government`
- `Property`
- `Enterprise`

Live production HTTP verification returned `HTTP/2 200` from Netlify for `/pricing` with cache-busted requests. The rendered page loaded without observed browser console errors.

## Rollback Procedure

Rollback is isolated to reverting the Pricing page edit and this engineering note. No database migration, Cognito change, API Gateway change, IAM change, AWS resource recreation, Stripe record restoration, or production deployment rollback is required by this repository change.

If rollback is required, revert merge commit `00c4ccb930cb5e4c8d76bd88990f85916bb75b77` or restore `src/pages/Pricing.tsx` to the pre-removal version from `main` before PR #9, then redeploy through the standard Netlify production path. Confirm that supported Nexum Suum pricing tiers, checkout paths, and entitlement behavior remain intact after rollback.
