# API Manifest

## Purpose

This manifest documents API calls discovered during the repository audit. It is a planning artifact only and does not assert that every route is currently deployed.

## Boundary Definitions

- **Gateway**: client-facing Facility Intelligence SaaS platform with operational data capture, role dashboards, onboarding, tier-based intelligence, Drift Intelligence, Operational DNA, Observation Journal, Facility Memory, compliance/climate intelligence, and BMS/BAS/CMMS integrations.
- **Facility Compass HQ**: internal Nexum Suum consulting, CRM, billing, assessment, report-generation, license oversight, and admin orchestration platform.
- **CTS Institute**: education, publications, courses, roundtables, certifications, and community.

HQ should receive summaries, metadata, usage, entitlement status, and authorized assessment context from Gateway. HQ should not receive every detailed operational log by default.

## API Base

Primary base:

```text
https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod
```

Configured by:

```text
VITE_API_BASE_URL
```

Many files also hardcode the production base URL as a fallback.

## API Client Patterns

- `apiRequest` in `src/lib/api.ts`: attaches bearer auth, prefers `nexum_id_token`, throws on errors.
- `apiClient` in `src/auth/apiClient.ts`: attaches bearer auth, returns `{ data, error, status }`.
- Raw `fetch`: used throughout pages and components.
- Cognito OAuth token exchange: direct `fetch` to Cognito `/oauth2/token`.

## Authentication Model

Most application APIs expect:

```http
Authorization: Bearer <Cognito JWT>
```

Known exceptions:

- `/bms/ingest`: BMS API key style auth using `X-BMS-API-Key`.
- `/stripe-webhook`: Stripe signature verification.
- `/invite/lookup`: public invite validation.
- `/intake`, selected lead/prospect/booking routes: public or semi-public.

## Gateway APIs

These belong primarily to Gateway because they power the client-facing SaaS: operational evidence capture, customer onboarding, dashboards, tier-based intelligence, and integrations.

| Endpoint family | Purpose | Auth | Backend dependency |
|---|---|---:|---|
| `/equipment` | Equipment CRUD, counts, recent equipment, metadata | JWT | `fi-equipment.mjs`, `EquipmentLibrary` |
| `/equipment/{id}` | Update/delete specific equipment | JWT | `fi-equipment.mjs` |
| `/equipment/intelligence` | Save/read equipment intelligence analysis | JWT | equipment intelligence backend, uncertain full coverage |
| `/equipment/readings` | Equipment readings | JWT | equipment readings/log backend |
| `/inventory` | Inventory CRUD/import | JWT | `fi-inventory.mjs`, `NexumInventory` |
| `/inventory/{id}` | Inventory item update/delete | JWT | `fi-inventory.mjs` |
| `/logs` | Equipment/facility log write path | JWT | facility log backend |
| `/logs/latest` | Latest facility logs | JWT | facility log backend |
| `/facility-log-ingest` | Manual/field log ingestion | JWT | uncertain local Lambda coverage |
| `/facility-logs` | Facility log list/filter | JWT | uncertain local Lambda coverage |
| `/work-orders` | Work order CRUD | JWT | `fi-work-orders.mjs`, `WorkOrders` |
| `/work-orders/{id}` | Work order update/delete | JWT | `fi-work-orders.mjs` |
| `/work-orders/{id}/notes` | Work order notes | JWT | work order backend |
| `/work-orders/{id}/status` | Status update | JWT | work order backend |
| `/violations` | Violation CRUD | JWT | `fi-violations.mjs`, `ViolationEvents` |
| `/violations/{id}/resolve` | Resolve violation | JWT | violation backend |
| `/audit-reports` | Compliance audit reports | JWT | `fi-audit-reports.mjs`, `AuditReports` |
| `/messages` | Command hub messages | JWT | `fi-messages.mjs`, `NexumMessages` |
| `/messages/{id}/read` | Mark message read | JWT | message backend |
| `/users` | User list/create/update | JWT | `fi-users.mjs`, Cognito, `NexumUsers` |
| `/users-list` | User list alternate route | JWT | uncertain route alias |
| `/facilities` | Facility list by org | JWT | uncertain local Lambda coverage |
| `/buildings` | Building list | JWT | uncertain local Lambda coverage |
| `/bms/feeds` | Register/list BMS feeds | JWT | `fi-bms-skids.mjs`, `NexumBMSFeeds` |
| `/bms/feeds/{id}` | Feed detail/update/delete | JWT | `fi-bms-skids.mjs` |
| `/bms/data/{id}` | Latest feed data | JWT | `fi-bms-skids.mjs`, `NexumBMSData` |
| `/bms/ingest` | External BMS data push | API key | `fi-bms-skids.mjs`, `NexumBMSData` |
| `/skids` | Equipment skid CRUD/list | JWT | `fi-bms-skids.mjs`, `NexumSkids` |
| `/skids/{id}` | Skid detail/update/delete | JWT | `fi-bms-skids.mjs` |
| `/skids/{id}/data` | Live skid data | JWT | `fi-bms-skids.mjs`, `NexumBMSData` |

## Intelligence APIs

These are currently mixed between Gateway client-facing intelligence and HQ orchestration. Gateway keeps its customer-facing intelligence modules; HQ may orchestrate internal assessment/report workflows using summaries, metadata, usage, entitlement status, and authorized assessment context.

| Endpoint family | Purpose | Recommended owner | Backend dependency |
|---|---|---|---|
| `/dc-vault` | Decision Continuity Vault chains | Gateway + HQ shared | `fi-dc-vault.mjs`, `NexumDCVault` |
| `/dc-vault/stats` | DC Vault stats | Gateway + HQ shared | `fi-dc-vault.mjs` |
| `/dc-vault/{id}/signals` | Decision chain signals | Gateway + HQ shared | `fi-dc-vault.mjs` |
| `/observations` | Observation journal | Gateway | `fi-observation-journal.mjs`, `ObservationJournal` |
| `/observations/ai-summary` | AI-generated observation summary | HQ engine, Gateway display | `fi-observation-journal.mjs`, Anthropic |
| `/issues` | Issue origin records | Gateway | `fi-issue-origin.mjs` |
| `/issues/{id}/report` | Issue report attempt | Gateway | `fi-issue-origin.mjs` |
| `/issues/{id}/continuity` | Issue continuity score | Gateway + HQ shared | `fi-issue-origin.mjs` |
| `/facility-memory` | Facility memory records | Gateway + HQ shared | `fi-facility-memory.mjs` |
| `/facility-memory/ingest` | Build customer-facing Facility Memory from authorized records/context | Gateway intelligence, HQ assessment context when authorized | `fi-facility-memory.mjs` |
| `/operational-dna` | Operational DNA read | Gateway display | `fi-operational-dna.mjs` |
| `/operational-dna/analyze` | Customer-facing Operational DNA analysis | Gateway intelligence, HQ assessment context when authorized | `fi-operational-dna.mjs` |
| `/event-integrity` | Event integrity read | Gateway display | `fi-event-integrity.mjs` |
| `/event-integrity/audit` | Event audit generation | Gateway intelligence, HQ report context when authorized | `fi-event-integrity.mjs` |
| `/drift-intelligence` | Drift records | Gateway display | `fi-drift-intelligence.mjs` |
| `/drift-intelligence/analyze` | Customer-facing Drift Intelligence analysis | Gateway intelligence, HQ assessment context when authorized | `fi-drift-intelligence.mjs` |
| `/system-violations` | System violations | Gateway | `fi-system-violations.mjs` |
| `/system-violations/stats` | System violation stats | Gateway | `fi-system-violations.mjs` |
| `/risk/tolerance` | Risk thresholds | HQ config, Gateway read | `fi-risk-engine.mjs` |
| `/risk/acceptance` | Risk acceptance records | HQ + Gateway | `fi-risk-engine.mjs` |
| `/suggestions` | Risk/action suggestions | Gateway display, HQ oversight/config | `fi-risk-engine.mjs` |
| `/suggestions/generate` | Generate suggestions | Gateway intelligence, HQ oversight/config | `fi-risk-engine.mjs` |
| `/costs/*` | Cost, valuation, depreciation, breakdown | Gateway intelligence, HQ billing/report context when authorized | `fi-cost-intelligence.mjs` |
| `/resources/*` | Vendor, parts, float-time resource planning | Gateway + HQ shared | `fi-resource-planning.mjs` |
| `/work-integrity/*` | Work integrity tasks and AI critique | HQ engine, Gateway display | `fi-work-integrity.mjs`, Anthropic |
| `/quality-intelligence` | Quality snapshots | Gateway + HQ shared | `quality-intelligence.mjs` |
| `/vvfi` | VVFI/FIAS assessment data | HQ owner, Gateway display | `fi-vvfi.mjs`, Anthropic |

## Facility Compass HQ APIs

These belong primarily to internal Nexum Suum consulting, CRM, billing, assessment, report-generation, license oversight, and admin orchestration.

| Endpoint family | Purpose | Auth | Backend dependency |
|---|---|---:|---|
| `/onboarding/org` | Create/update organization onboarding record | JWT | `onboarding-org.mjs` |
| `/onboarding/invite` | Create onboarding invite | JWT | `onboarding-invite.mjs` |
| `/onboarding/utilities` | Save onboarding utilities/settings | JWT | `onboarding-utilities.mjs` |
| `/onboarding` | Onboarding status record | JWT | `fi-onboarding.mjs` |
| `/invite/lookup` | Public invite lookup | Public | `invite-lookup.mjs` |
| `/pilot-application` | Pilot application submit | Public/JWT mixed | `pilot-submit.mjs` |
| `/pilot-verify` | Pilot approval verification | Public | `pilot-submit.mjs` |
| `/pilot-applications` | Internal pilot admin list | Admin | `pilot-admin.mjs` |
| `/intake` | Sales/service intake | Public | `fi-intake.mjs` |
| `/enterprise-quote` | Enterprise quote request | Public/JWT mixed | `enterprise-quote.mjs` |
| `/bookings` | Booking availability/create | Public | `fi-bookings.mjs` |
| `/bookings/all` | Internal booking list | Admin | `fi-bookings.mjs` |
| `/leads` | Lead pipeline | Public for POST, admin for list/update | `leads.mjs`, `nexum-leads.mjs` |
| `/prospect-buyers` | Prospect buyer records | Internal/admin | `prospect-buyers.mjs` |
| `/email-settings` | Email settings | JWT/admin | `email-settings.mjs` |
| `/admin/licenses` | License admin | Admin | uncertain local coverage |
| `/admin/send-email` | Internal outbound email | Admin | uncertain local coverage |
| `/admin/send-sms` | Internal outbound SMS | Admin | `fi-sms.mjs` or uncertain route |
| `/stripe/checkout` | Create Stripe checkout session | JWT or public depending flow | `stripe-checkout.mjs` |
| `/stripe-webhook` | Stripe webhook handler | Stripe signature | `stripe-webhook.mjs` |
| `/stripe/verify-session` | Verify checkout session | uncertain | uncertain local coverage |

## CTS Institute APIs

| Endpoint family | Purpose | Auth | Backend dependency |
|---|---|---:|---|
| `/courses` | List/create/update/delete courses | JWT | `fi-courses.mjs`, `NexumCourses` |
| `/lms/enroll` | Assign course enrollment | JWT | uncertain local coverage |
| `/lms/enrollments/all` | View enrollments | JWT | uncertain local coverage |

## Uncertain Or Likely Missing Local Route Coverage

These routes are called by the frontend but were not clearly mapped to a local Lambda file during audit:

- `/dashboard/executive`
- `/dashboard/energy`
- `/dashboard/supervisor`
- `/budget/summary`
- `/buildings`
- `/facility-logs`
- `/compliance-analyzer`
- `/equipment-systems`
- `/instructor/chat`
- `/staff-performance`
- `/mpcc/readings`
- `/mpcc/summary`
- `/admin/licenses`
- `/admin/send-email`
- `/admin/send-sms`
- `/stripe/verify-session`
- `/lms/enroll`
- `/lms/enrollments/all`
- Selected `/bookings/all` and workspace admin variants should be verified against deployed API Gateway.
