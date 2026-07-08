# Route Ownership Matrix

## Purpose

This matrix classifies current frontend routes by intended product boundary. It is documentation only. No routes have been moved or changed.

## Ownership Legend

- **Gateway**: client-facing Facility Intelligence SaaS platform with operational data capture, role dashboards, onboarding, tier-based intelligence, Drift Intelligence, Operational DNA, Observation Journal, Facility Memory, compliance/climate intelligence, and BMS/BAS/CMMS integrations.
- **Facility Compass HQ**: internal Nexum Suum consulting, CRM, billing, assessment, report-generation, license oversight, and admin orchestration platform.
- **CTS Institute**: education, publications, courses, roundtables, certifications, and community.
- **Shared/Review**: route currently crosses boundaries and needs future product decision.

HQ receives summaries, metadata, usage, entitlement status, and authorized assessment context from Gateway; it does not receive every detailed operational log by default.

## Public Routes

| Route | Current purpose | Recommended owner |
|---|---|---|
| `/login` | User sign in | Shared identity |
| `/register` | User registration and invite registration | Shared identity, Gateway entry |
| `/verify-email` | Cognito confirmation | Shared identity |
| `/auth/callback` | OAuth callback | Shared identity |
| `/pricing` | Subscription/pilot/quote entry | Facility Compass HQ with Gateway public entry |
| `/welcome` | Post-payment/post-booking welcome | Facility Compass HQ with Gateway handoff |
| `/onboarding` | Client onboarding workflow | Gateway client onboarding + HQ setup visibility |

## Gateway Routes

| Route | Module |
|---|---|
| `/` | Main customer hub |
| `/dashboard` | General dashboard |
| `/dashboard/manager` | Manager dashboard |
| `/dashboard/supervisor` | Supervisor dashboard |
| `/dashboard/executive` | Executive dashboard |
| `/dashboard/energy` | Energy dashboard |
| `/dashboard/employees` | Employee dashboard directory |
| `/dashboard/tech` | Technician dashboard |
| `/dashboard/operator` | Operator dashboard |
| `/dashboard/engineer` | Engineer dashboard |
| `/dashboard/custodian` | Custodian dashboard |
| `/dashboard/compliance` | Compliance dashboard |
| `/employee-dashboard` | Operation Center |
| `/equipment` | Equipment metrics |
| `/equipment-library` | Equipment library |
| `/equipment-intelligence` | Equipment AI/intelligence workflow |
| `/inventory-library` | Inventory library |
| `/equipment-systems` | Equipment systems |
| `/hvac-calculator` | HVAC calculator |
| `/data-source` | Facility data source/log intake |
| `/field-logging` | Field logging |
| `/compliance-logger` | Compliance logger |
| `/compliance-documents` | Compliance documents |
| `/work-orders` | Work orders |
| `/violations` | Violations |
| `/messages` | Messages |
| `/kanban` | Kanban work view |
| `/calendar` | Work calendar |
| `/emergency` | Emergency workflows |
| `/vendors` | Vendor directory |
| `/workflows` | Operational workflows |
| `/settings` | Customer settings |
| `/workload` | Workload view |
| `/command-hub` | Command dashboard |
| `/command-center` | Facility command center |
| `/staff-performance` | Staff performance |
| `/contractor-installs` | Contractor installs |
| `/org-efficiency-report` | Organization efficiency report |
| `/staff-scheduling` | Scheduling |
| `/preventive-maintenance` | Preventive maintenance |

## Gateway Intelligence Routes

| Route | Module | Notes |
|---|---|---|
| `/operational-intelligence` | Operational intelligence | Currently large, mixed local/API |
| `/facility-memory` | Facility Memory | Gateway client-facing intelligence; HQ may consume authorized summaries/context |
| `/operational-dna` | Operational DNA | Gateway client-facing intelligence; HQ may consume authorized summaries/context |
| `/event-integrity` | Event Integrity | Gateway client-facing intelligence; HQ may consume authorized summaries/context |
| `/drift-intelligence` | Drift Intelligence | Gateway client-facing intelligence; HQ may consume authorized summaries/context |
| `/system-violations` | System Violations | Gateway operational module |
| `/dc-vault` | Decision Continuity Vault | Gateway + HQ shared |
| `/climate-intelligence` | Climate Intelligence | Gateway client-facing intelligence |
| `/project-controls` | Project Controls | Gateway + HQ shared |
| `/decision-outcomes` | Decision Outcome Tracking | Gateway + HQ shared |
| `/continuity-intelligence` | Continuity Intelligence | Gateway + HQ shared |
| `/work-integrity` | Work Integrity | Gateway client-facing intelligence; HQ may use for report context when authorized |
| `/evidence-board` | Evidence Board | Gateway operational evidence |
| `/observations` | Observation Journal | Gateway client-facing evidence and intelligence |
| `/vendor-intelligence` | Vendor Intelligence | Gateway + HQ shared |
| `/occae` | OCCAE probability intelligence | Review boundary |
| `/virtuous` | Virtuous score | Review boundary |
| `/historical-data` | Historical data | Gateway |

## Sector Routes

| Route | Module | Recommended owner |
|---|---|---|
| `/retail-dashboard` | Retail operational dashboard | Gateway |
| `/retail-intelligence` | Retail intelligence | Gateway |
| `/government-dashboard` | Government dashboard | Gateway |
| `/dashboard/dispatcher` | Dispatcher dashboard | Gateway |
| `/dashboard/firefighter` | Firefighter dashboard | Gateway |
| `/dashboard/officer` | Officer dashboard | Gateway |
| `/gov-intelligence` | Government intelligence hub | Gateway |
| `/gov-assessment` | Government assessment | Gateway + HQ shared |
| `/gov-knowledge` | Knowledge preservation | Gateway |
| `/gov-capital-planning` | Capital planning | Gateway + HQ shared |
| `/gov-deferred-maintenance` | Deferred maintenance | Gateway |
| `/gov-emergency-ops` | Emergency operations | Gateway |
| `/gov-public-works` | Public works | Gateway |
| `/gov-environmental` | Environmental | Gateway |
| `/gov-pmo` | PMO | Gateway + HQ shared |
| `/gov-decision-registry` | Decision registry | Gateway + HQ shared |
| `/operational-trust` | Operational trust | Gateway |
| `/property-dashboard` | Property dashboard | Gateway |
| `/vendor-dashboard` | Vendor dashboard | Shared/Review |
| `/service-tech` | Service tech dashboard | Gateway or future vendor portal |
| `/service-tech-analytics` | Service tech analytics | Gateway or future vendor portal |

## Facility Compass HQ Routes Currently In Gateway

| Route | Current purpose | Recommended future owner |
|---|---|---|
| `/workspace` | Nexum internal workspace | Facility Compass HQ |
| `/nexum-workspace` | Alias for internal workspace | Facility Compass HQ |
| `/admin/licensees` | Licensee administration | Facility Compass HQ |
| `/admin/oi-reports` | OI report admin | Facility Compass HQ |
| `/fias` | FIAS assessment/admin workflow | Facility Compass HQ |
| `/consulting` | Consulting requests/services | Facility Compass HQ |
| `/onboarding-status` | Internal onboarding status tracking | Facility Compass HQ |
| `/implementation-guide` | Client implementation guide | HQ-authored, Gateway-visible |
| `/platform-guide` | Platform guide | Shared documentation route |
| `/policy-guide` | Policy guide | Shared documentation route |
| `/leadership-transition` | Leadership transition | Facility Compass HQ or Gateway, review |
| `/intelligence-centers` | Intelligence center index | Shared/Review |
| `/facility-intelligence` | Product/module launcher | Gateway |

## CTS Institute Routes

| Route | Current purpose | Recommended future owner |
|---|---|---|
| `/optimize-learn` | Optimize & Learn course experience | CTS Institute |
| `/apprentice` | Apprentice LMS | CTS Institute |
| `/instructor` | Facility instructor | Shared: CTS education + HQ AI |
| `/courses` route API consumers | Course list/content | CTS Institute |

## Routing Risk Notes

- All protected routes currently sit under one `ProtectedRoute`, so ownership is not enforced by product boundary.
- Admin-only visibility exists in sidebar logic for some items, but not all route-level ownership decisions are enforced consistently.
- Some internal/HQ routes are reachable from the same deployed customer app if role gates fail or are incomplete.
- Recommended next step is route metadata, not route movement: add a documentation manifest first, then later enforce route ownership in one place.
