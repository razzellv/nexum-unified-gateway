# Nexum Suum Facility Intelligence™ — FI Platform

## What This Is
This is the PRIMARY SaaS product — the customer-facing platform that paying subscribers use daily for facility operations management.

## Who Uses It
Paying customers across three sectors:
- Facility/Industrial managers, engineers, operators, custodians
- Retail owners, managers, shift leads, associates
- Government/Public Safety chiefs, officers, firefighters, dispatchers

## Purpose
Operational Intelligence + Decision Defensibility platform. Customers log equipment data, manage work orders, track violations, manage inventory, and get AI-powered insights. Everything they do builds a defensible operational record.

## Tech Stack
- Frontend: React + TypeScript + Vite → deployed on Netlify
- URL: portal.nexumsuum-facilityintelligence.com
- Backend: AWS Lambda + DynamoDB + API Gateway + Cognito
- API Base: https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod
- Cognito User Pool: us-east-2_mKMqaRq70 (FI Platform users only)
- GitHub: razzellv/nexum-unified-gateway
- Repo path on Mac: /Users/razzelltaylor/Documents/FI Platform /nexum-unified-gateway

## Key Business Rules
- Admin role: razzellv@nexumsuum.com only — bypasses ALL tier and role restrictions
- Admin email domain must be @nexumsuum.com or @nexumsuum-facilityintelligence.com
- Three org types: facility, retail, government — stored in custom:orgType Cognito attribute
- Subscription tiers: basic, standard, business, premium, enterprise, admin
- Annual licensing for Facility and Government, monthly for Retail
- TierGate component gates features — admin always bypasses

## Pricing (Annual License)
Facility: Basic $10,788 | Standard $23,988 | Business $47,988 | Premium $83,988
Government: Command Basic $4,970 | Standard $9,970 | Pro $19,970
Retail: Starter $197/mo | Pro $297/mo (+ annual options available)

## Stripe Price IDs
Facility Basic: price_1TAbJ4Dfw4bOR2dfEHzEs5qY
Facility Standard: price_1TAbKQDfw4bOR2df9CbJymgf
Facility Business: price_1TAbNoDfw4bOR2dfepJUVort
Facility Premium: price_1TAbPLDfw4bOR2dfeT4Posk4
Command Basic: price_1TGTMYDfw4bOR2dfkANtaj0z
Command Standard: price_1TGTNzDfw4bOR2df7EU4x1DQ
Command Pro: price_1TGTPGDfw4bOR2dfJZVGSrm5
Retail Starter Monthly: price_1TGTF3Dfw4bOR2dfenLjfUMf
Retail Pro Monthly: price_1TGTIMDfw4bOR2dfWvWCGU87
Retail Starter Annual: price_1THMfpDfw4bOR2dfwtc7c1LJ
Retail Pro Annual: price_1THMepDfw4bOR2df4bO6qRtW

## DynamoDB Tables (19 total, us-east-2)
FacilityLogs-v2, WorkOrders, ViolationEvents, EquipmentLibrary,
NexumInventory, NexumOrganizations, NexumUsers, FacilitySettings,
NexumDepartments, SpendingTransactions, AuditReports, InventoryParts,
NexumLearningEnrollments, TrainingAssignments, UsageMetrics,
Organizations, Licenses, ViolationsType, NexumFIASAssessments

## Key Patterns
- All Lambda PK format: "FACILITY#<facilityId>"
- All Lambda SK format: "LOG#<timestamp>" or "WO#<id>" etc
- JWT claims: custom:role, custom:facilityId, custom:orgId, custom:tier, custom:department, custom:orgType
- facilityId always from JWT: user?.facilityId || user?.["custom:facilityId"] || "facility-001"
- Admin bypasses: role === "admin" skips ALL tier, role, department checks
- localStorage keys: nexum_access_token, nexum_org_type, nexum_dept_budgets, compliance_docs

## Dashboard Routing by Role + OrgType
admin → / (sees everything)
facility + executive/director → /dashboard/executive
facility + manager → /dashboard/manager
facility + supervisor → /dashboard/supervisor
facility + staff → / (main hub)
retail + owner/manager → /retail-dashboard
retail + staff → /retail-dashboard (limited view)
government + chief/director → /government-dashboard
government + staff → /government-dashboard (limited view)

## AWS Infrastructure
Account: 758027491272
Region: us-east-2
API Gateway ID: vflco2pvo3
Lambda Role: arn:aws:iam::758027491272:role/service-role/equipment-list-lambda-role-j1rgtjvq
