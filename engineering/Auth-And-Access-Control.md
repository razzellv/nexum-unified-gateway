# Auth And Access Control

## Purpose

This document describes current authentication and access-control behavior. It is documentation only and does not change auth.

## Boundary Definitions

- **Gateway**: client-facing Facility Intelligence SaaS platform with operational data capture, role dashboards, onboarding, tier-based intelligence, Drift Intelligence, Operational DNA, Observation Journal, Facility Memory, compliance/climate intelligence, and BMS/BAS/CMMS integrations.
- **Facility Compass HQ**: internal Nexum Suum consulting, CRM, billing, assessment, report-generation, license oversight, and admin orchestration platform.
- **CTS Institute**: education, publications, courses, roundtables, certifications, and community.

## Current Auth Stack

The app uses Amazon Cognito with multiple overlapping client implementations:

- `src/auth/cognitoClient.ts`: direct Cognito SDK signup/signin/confirm/forgot-password.
- `src/auth/session.ts`: OAuth code exchange, refresh token handling, `nexum_auth_tokens`.
- `src/auth/token.ts`: legacy localStorage token helpers.
- `src/auth/AuthContext.tsx`: context provider that reads legacy token keys.
- `src/hooks/useAuth.ts`: hook used by `ProtectedRoute`, migrates legacy tokens and derives user profile.
- `src/pages/AuthCallback.tsx`: OAuth callback handling.
- `src/pages/login.tsx`: direct email/password login flow.
- `src/pages/Register.tsx`: signup and invite registration flow.

## Cognito Configuration

Known values from repository instructions and code:

- User Pool: `us-east-2_mKMqaRq70`
- Region: `us-east-2`
- Client ID fallback: `7vvu6kruod12nu1nkfonbfekre`

Environment variables:

- `VITE_COGNITO_DOMAIN`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_CLIENT_ID`
- `VITE_API_BASE_URL`

## Token Storage

Current localStorage/sessionStorage keys:

- `nexum_access_token`
- `nexum_id_token`
- `nexum_refresh_token`
- `nexum_auth_tokens`
- `nexum_auth_error`

Auth state also influences:

- `nexum_org_type`
- `nexum_active_facility_id`
- `nexum_active_facility_name`
- `nexum_onboarding_complete`
- `nexum_onboarding_verified`
- `nexum_onboarding_session`
- `nexum_onboarding_tier`
- `nexum_onboarding_email`

## JWT Claims

Important claims used by the app:

- `sub`
- `email`
- `name`
- `custom:role`
- `custom:facilityId`
- `custom:orgId`
- `custom:tier`
- `custom:subscription`
- `custom:department`
- `custom:orgType`
- `custom:inviteId`

Fallbacks used in code:

- role: `employee`
- facilityId: `facility-001`
- orgId: `org-001`
- department: `Operations`
- orgType: `facility`

## Roles

Facility:

- leadership: `executive`, `director`, `manager`, `supervisor`, `compliance_officer`
- staff: `engineer`, `operator`, `technician`, `custodian`, `employee`

Retail:

- leadership: `owner`, `manager`, `shift_lead`
- staff: `associate`, `clerk`, `cook`, `cashier`, `cs_associate`

Government:

- leadership: `chief`, `director`, `lieutenant`, `captain`
- staff: `officer`, `firefighter`, `dispatcher`, `ems_tech`, `personnel`

Service tech:

- leadership: `owner`, `operations_manager`, `dispatch_manager`
- staff: `technician`, `field_tech`, `apprentice`

Admin:

- `admin`

## Admin Rule

Business rule:

- `razzellv@nexumsuum.com` is the primary admin.
- Admin email domain must be `@nexumsuum.com` or `@nexumsuum-facilityintelligence.com`.
- Admin bypasses tier, role, and department checks.

Current implementation risk:

- `ProtectedRoute` treats `role === "admin"` or an approved domain as admin.
- `useAuth` assigns effective role `admin` to approved-domain users.
- This should be normalized before any hardening or product separation.

## Route Protection

`ProtectedRoute` behavior:

1. Waits for auth loading.
2. Redirects unauthenticated users to `/login`.
3. If authenticated at `/`, routes by role/org type.
4. For non-admin users:
   - no tier redirects to `/pricing`.
   - no onboarding completion redirects to `/onboarding`.
5. Renders protected child routes.

## Post-Login Routing

Role/org routing:

- admin: `/`
- facility executive/director: `/dashboard/executive`
- facility manager: `/dashboard/manager`
- facility supervisor: `/dashboard/supervisor`
- engineer: `/dashboard/engineer`
- technician: `/dashboard/tech`
- operator: `/dashboard/operator`
- custodian: `/dashboard/custodian`
- compliance officer: `/dashboard/compliance`
- retail roles: `/retail-dashboard`
- government leadership: `/government-dashboard`
- dispatcher: `/dashboard/dispatcher`
- firefighter/ems tech: `/dashboard/firefighter`
- officer/personnel: `/dashboard/officer`

## Signup And Invite Flow

Registration can occur via:

- direct public registration;
- plan or paid session registration;
- pilot registration;
- invite-mode registration.

`cognitoSignUp` can set:

- `email`
- `name`
- `phone_number`
- `custom:orgId`
- `custom:orgType`
- `custom:tier`
- `custom:facilityId`
- `custom:role`
- `custom:department`
- `custom:inviteId`

Post-confirmation Lambda behavior:

1. Checks invite record by `custom:inviteId`.
2. Checks pilot record.
3. Applies defaults for new org owners.
4. Updates Cognito custom attributes.

## Boundary Recommendations

- Keep identity shared across Gateway, HQ, and CTS initially.
- Define product entitlements separately from raw role names.
- Gateway access should be based on customer org role, tier, facility, department, onboarding state, and module entitlement for client-facing operational and intelligence features.
- HQ access should be based on Nexum internal admin/operator roles for consulting, CRM, billing, assessment, report generation, license oversight, and admin orchestration.
- CTS access should be based on member status, enrollment, certification role, and course entitlement.
- HQ should receive summaries, metadata, usage, entitlement status, and authorized assessment context from Gateway; detailed operational logs should remain Gateway-scoped unless explicitly authorized for assessment/report work.

## Risks To Address Later

- Multiple auth implementations can drift.
- Token refresh and user derivation are split.
- Admin-domain handling is inconsistent.
- Route-level ownership is not centrally enforced.
- Some APIs use ID token, some access token, and some use whichever token is available.
- localStorage controls important onboarding and tier-adjacent behavior.
