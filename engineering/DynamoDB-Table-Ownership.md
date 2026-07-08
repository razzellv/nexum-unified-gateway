# DynamoDB Table Ownership

## Purpose

This document classifies DynamoDB tables by recommended product boundary. It is based on repository references, Lambda defaults, and audit findings.

## Ownership Legend

- **Gateway**: client-facing Facility Intelligence SaaS platform with operational data capture, role dashboards, onboarding, tier-based intelligence, Drift Intelligence, Operational DNA, Observation Journal, Facility Memory, compliance/climate intelligence, and BMS/BAS/CMMS integrations.
- **Facility Compass HQ**: internal Nexum Suum consulting, CRM, billing, assessment, report-generation, license oversight, and admin orchestration platform.
- **CTS Institute**: education, publications, courses, roundtables, certifications, and community.
- **Shared**: used across product boundaries; should have explicit contracts.

HQ receives summaries, metadata, usage, entitlement status, and authorized assessment context from Gateway; detailed operational logs remain Gateway-owned unless explicitly authorized for assessment/report work.

## Gateway Tables

| Table | Purpose | Notes |
|---|---|---|
| `FacilityLogs-v2` | Facility/operator/equipment logs | Core defensible operational record |
| `WorkOrders` | Work order records | Core operational workflow |
| `ViolationEvents` | Compliance/violation events | Core operational/compliance record |
| `EquipmentLibrary` | Equipment and asset records | Core asset registry |
| `NexumInventory` | Inventory and parts | Core resource record |
| `InventoryParts` | Inventory parts | May overlap with `NexumInventory` |
| `FacilitySettings` | Facility configuration | Gateway settings |
| `NexumDepartments` | Departments | Gateway org structure |
| `NexumMessages` | Command hub messages | Gateway communication |
| `ObservationJournal` | Observation records | Gateway evidence, HQ analysis candidate |
| `ObservationEvents` | Observation event history | Gateway evidence |
| `IssueOrigins` | Issue origin records | Gateway issue traceability |
| `IssueReportAttempts` | Issue report attempts | Gateway issue traceability |
| `LinkedHistoricalRecords` | Linked issue history | Gateway issue traceability |
| `NexumBMSFeeds` | BMS integration config | Gateway integration |
| `NexumBMSData` | BMS point data | Gateway operational telemetry |
| `NexumSkids` | Equipment skid definitions | Gateway asset/integration model |
| `NexumSystemViolations` | System violation records | Gateway operational intelligence |
| `NexumQualityIntelligence` | Quality snapshots | Gateway/HQ shared, customer-facing display |
| `NexumContinuity` | Continuity records | Gateway/HQ shared |
| `NexumFacilityMemory` | Facility Memory | Gateway client-facing intelligence; HQ summary/context access when authorized |
| `NexumOperationalDNA` | Operational DNA | Gateway client-facing intelligence; HQ summary/context access when authorized |
| `NexumDriftAnalysis` | Drift Intelligence output | Gateway client-facing intelligence; HQ summary/context access when authorized |
| `NexumDriftReadings` | Drift readings | Gateway operational intelligence input |

## Facility Compass HQ Tables

| Table | Purpose | Notes |
|---|---|---|
| `NexumOrganizations` | Organization records | HQ client profile owner |
| `Organizations` | Organization records | Possible legacy/parallel org table |
| `Licenses` | License records | HQ licensing owner |
| `NexumUsers` | User profile records | Shared identity, HQ admin owner |
| `NexumOnboarding` | Onboarding/invite/utilities | HQ orchestration |
| `NexumOnboardingRecords` | Onboarding status records | HQ orchestration |
| `NexumPilots` | Pilot applications/approvals | HQ growth/pilot workflow |
| `NexumLeads` | Leads | HQ sales workflow |
| `NexumProspectBuyers` | Prospect buyers | HQ sales/billing workflow |
| `NexumFIAS` | FIAS sessions | HQ assessment owner |
| `NexumFIASClients` | FIAS clients | HQ assessment/client owner |
| `NexumFIASAssessments` | VVFI/FIAS assessments | HQ engine, Gateway display possible |
| `NexumDCVault` | Decision Continuity Vault | Shared: Gateway evidence + HQ defensibility |
| `NexumEventIntegrity` | Event integrity | HQ analysis, Gateway display |
| `NexumIntegritySnapshots` | Integrity snapshots | HQ analysis |
| `NexumRiskTolerance` | Risk tolerance config | HQ policy/config |
| `NexumRiskAcceptance` | Risk acceptance records | Shared |
| `NexumSuggestions` | Generated suggestions | HQ engine, Gateway display |
| `SpendingTransactions` | Spending/cost records | HQ/Gateway shared |
| `NexumResourcePlanning` | Resource planning overlays | Shared |
| `NexumVendorPlucks` | Vendor pluck records | Shared vendor/HQ workflow |
| `NexumVendors` | Vendor records | Shared |
| `NexumEmailSettings` or `FacilitySettings` | Email settings depending deployment | HQ/admin config |

## CTS Institute Tables

| Table | Purpose | Notes |
|---|---|---|
| `NexumCourses` | Course metadata | CTS owner |
| `NexumLearningEnrollments` | Enrollments | CTS owner |
| `TrainingAssignments` | Training assignments | CTS owner |
| `UsageMetrics` | Usage metrics | Shared analytics, CTS may consume |

## Tables In Business Rules But Not Fully Mapped

| Table | Notes |
|---|---|
| `AuditReports` | Gateway compliance reports; HQ may aggregate |
| `ViolationsType` | Violation taxonomy/config; HQ config, Gateway use |
| `NexumDepartments` | Gateway org structure; HQ may configure |

## Recommended Ownership Rules

1. Gateway tables should store customer operational records, telemetry, onboarding state needed by the client portal, and customer-facing intelligence records.
2. HQ tables should store consulting, CRM, billing, licensing, assessments, report-generation workflows, license oversight, and admin orchestration records.
3. CTS tables should store learning products, enrollments, credentials, publications, roundtables, certifications, and community membership.
4. Shared tables need explicit read/write contracts before any service split.
5. localStorage-backed records that represent defensible evidence should eventually be persisted to Gateway-owned tables.
6. HQ integrations should receive Gateway summaries, metadata, usage, entitlement status, and authorized assessment context rather than full detailed operational logs by default.
