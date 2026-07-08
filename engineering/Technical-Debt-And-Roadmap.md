# Technical Debt And Roadmap

## Purpose

This document records current technical debt and a conservative refactoring roadmap that preserves functionality while separating Gateway, Facility Compass HQ, and CTS Institute.

## Boundary Definitions

- **Gateway**: client-facing Facility Intelligence SaaS platform with operational data capture, role dashboards, onboarding, tier-based intelligence, Drift Intelligence, Operational DNA, Observation Journal, Facility Memory, compliance/climate intelligence, and BMS/BAS/CMMS integrations.
- **Facility Compass HQ**: internal Nexum Suum consulting, CRM, billing, assessment, report-generation, license oversight, and admin orchestration platform.
- **CTS Institute**: education, publications, courses, roundtables, certifications, and community.

Gateway is not collection-only. It keeps its client-facing intelligence modules. HQ receives summaries, metadata, usage, entitlement status, and authorized assessment context from Gateway rather than every detailed operational log by default.

## Current Strengths

- Broad product surface already exists.
- Central route table provides visibility into the app.
- Cognito integration is functional across direct login and OAuth-style flows.
- Many production-backed Lambda modules exist.
- DynamoDB key patterns are largely facility/org scoped.
- Customer-facing operational modules cover equipment, inventory, logs, work orders, violations, BMS, compliance, and dashboards.
- Intelligence concepts are present and differentiated.
- Stripe, SES, BMS ingest, CSV/Excel import, and Anthropic integrations are represented.

## Current Technical Debt

### Architecture

- Gateway, Facility Compass HQ, and CTS Institute are mixed in one route tree.
- Internal admin pages currently live in the same app as customer routes.
- Product boundary ownership is not encoded in route metadata.
- Multiple modules combine UI, API calls, local persistence, and business logic in very large page files.

### Auth

- Auth logic is split across Cognito SDK, OAuth session helpers, token helpers, context, and hook implementations.
- Admin detection is not normalized.
- Some code uses ID token, some access token, and some whichever token exists.
- Important tier/onboarding behavior depends on localStorage.

### API

- Three API patterns exist: `apiRequest`, `apiClient`, and raw `fetch`.
- Production API base URL is hardcoded in many files.
- Some frontend routes call APIs not clearly backed by local Lambda files.
- Error handling and response parsing are inconsistent.

### Data

- localStorage is used as source of truth for several workflows that look operationally important.
- DynamoDB table ownership is not explicitly documented in code.
- Some tables appear duplicated or overlapping.
- Facility and org defaults such as `facility-001` and `org-001` appear in many places.

### Intelligence

- Browser-side engines write to localStorage.
- Some intelligence engines run globally at app startup.
- AI-backed logic exists both in Lambda and browser-side code paths.
- Intelligence reports do not yet flow through one report/evidence registry.

### Codebase Health

- Very large files increase change risk:
  - `src/pages/Pricing.tsx`
  - `src/pages/EquipmentLibrary.tsx`
  - `src/pages/SystemViolations.tsx`
  - `src/pages/OperationalIntelligence.tsx`
  - `src/pages/NexumWorkspace.tsx`
  - `src/pages/InventoryLibrary.tsx`
  - `src/pages/command-hub/Settings.tsx`
- Backup, broken, and old files exist beside active files.
- Lint could not be verified during audit because the local `eslint` binary was unavailable.

## Refactoring Roadmap

### Phase 0: Documentation Baseline

Status: in progress through this `/engineering` folder.

Deliverables:

- Architecture map.
- API manifest.
- Route ownership matrix.
- DynamoDB table ownership matrix.
- Intelligence engine map.
- Auth/access-control documentation.
- Product boundary definitions.
- Technical debt and roadmap.

No production code changes.

### Phase 1: Ownership Metadata

Goal: classify without changing behavior.

Recommended small improvements:

- Add a route ownership manifest in documentation first.
- Add API ownership labels in documentation.
- Add table ownership labels in documentation.
- Mark modules as production, beta, experimental, or local-only in documentation.

Do not move routes or files in this phase.

### Phase 2: API Contract Stabilization

Goal: preserve all endpoints while making ownership visible.

Recommended work:

- Create a generated or maintained API manifest.
- Verify deployed API Gateway routes against frontend calls and local Lambda files.
- Identify 404/401/500-producing routes.
- Mark route status: active, deployed-unverified, missing, deprecated, duplicate.
- Keep current API calls unchanged until status is confirmed.

### Phase 3: Auth Normalization

Goal: one source of truth for user identity and entitlements.

Recommended work:

- Centralize JWT claim parsing.
- Centralize admin detection.
- Centralize tier and org type derivation.
- Preserve existing localStorage token keys during migration.
- Define product access claims for Gateway, HQ, and CTS.

### Phase 4: Product API Clients

Goal: logical separation without backend migration.

Recommended work:

- Introduce ownership-level API wrappers later:
  - `gatewayApi`
  - `hqApi`
  - `ctsApi`
- Initially point all wrappers to the same API base.
- Keep endpoint paths stable.
- Gradually move raw `fetch` calls behind the correct wrapper.

### Phase 5: Gateway Stabilization

Goal: make Gateway the reliable client-facing Facility Intelligence SaaS layer for operational capture, onboarding, role dashboards, integrations, and customer-facing intelligence.

Priority modules:

- Facility logs.
- Equipment.
- Inventory.
- Work orders.
- Violations.
- BMS/BAS/CMMS intake.
- Messages.
- Customer dashboards.
- Onboarding.
- Tier-based intelligence.
- Drift Intelligence.
- Operational DNA.
- Observation Journal.
- Facility Memory.
- Compliance and climate intelligence.
- Evidence/decision records.

Recommended work:

- Move defensible operational records out of localStorage as source of truth.
- Keep localStorage as cache/offline support only.
- Confirm all customer-facing modules have backend route coverage.
- Preserve Gateway-owned client-facing intelligence modules; do not move them wholesale into HQ.
- Avoid redesigning UI during this phase.

### Phase 6: Facility Compass HQ Separation

Goal: isolate internal Nexum Suum consulting, CRM, billing, assessment, report-generation, license oversight, and admin orchestration.

Candidate routes:

- `/workspace`
- `/nexum-workspace`
- `/admin/licensees`
- `/admin/oi-reports`
- `/fias`
- `/onboarding-status`
- `/consulting`
- pilot, prospect, booking, billing, and license workflows.

Recommended work:

- Put HQ ownership behind internal role checks first.
- Separate HQ route metadata.
- Move internal report generation, consulting, assessment administration, billing, CRM, licensing, and admin workflows behind HQ APIs.
- Consume Gateway summaries, metadata, usage, entitlement status, and authorized assessment context.
- Publish only customer-approved outputs back to Gateway.
- Do not replicate every detailed Gateway operational log into HQ by default.

### Phase 7: CTS Institute Separation

Goal: isolate education/community.

Candidate routes/modules:

- `/optimize-learn`
- `/apprentice`
- course data and content modules.
- enrollment manager.
- quizzes, exams, certificates.

Recommended work:

- Define CTS course/enrollment/credential records.
- Make Gateway consume CTS summaries rather than own course logic.
- Keep Nexum methods and educational content in CTS.

### Phase 8: Deployment Separation

Goal: split only after contracts are stable.

Possible deployment targets:

- Gateway: `portal.nexumsuum-facilityintelligence.com`
- Facility Compass HQ: internal Nexum domain to be determined.
- CTS Institute: education/community domain to be determined.

Recommended work:

- Shared auth package or shared identity service.
- Shared API contract definitions.
- Shared UI primitives only if they do not force product coupling.
- Separate CI/deploy pipelines.

## Priority Order

1. Verify deployed API Gateway route inventory.
2. Normalize auth/admin/tier derivation.
3. Remove browser-side AI secret exposure risk.
4. Establish ownership manifests for routes, APIs, and tables.
5. Convert operational localStorage source-of-truth records to backend persistence.
6. Isolate HQ internal consulting, CRM, billing, assessment, report-generation, license oversight, and admin orchestration workflows.
7. Isolate CTS learning/community workflows.
8. Split deployments.

## Complexity Estimate

| Phase | Complexity | Risk | Notes |
|---|---:|---:|---|
| Documentation baseline | Low | Low | Current task |
| Ownership metadata | Low | Low | No behavior changes |
| API route verification | Medium | Medium | Requires deployed API comparison |
| Auth normalization | Medium-High | High | Must preserve all login flows |
| API wrapper consolidation | Medium | Medium | Many raw fetch calls |
| Gateway data persistence cleanup | High | High | Must preserve customer records |
| HQ separation | High | Medium-High | Internal workflows mixed with customer app |
| CTS separation | Medium | Medium | Course content mostly self-contained |
| Deployment separation | High | High | Should happen last |
