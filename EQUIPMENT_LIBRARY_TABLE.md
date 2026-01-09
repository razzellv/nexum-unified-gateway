# Equipment Library DynamoDB Table Design

## Table Name: `EquipmentLibrary`

### Access Patterns:
1. Get all equipment for an organization
2. Get specific equipment details
3. Get equipment for a facility
4. Search by equipment type
5. Count equipment for billing (25+ = extra $10/mo)

### Schema:
```
PK: ORG#<orgId>
SK: EQUIPMENT#<equipmentId>#<timestamp>

Attributes:
- equipmentId: string (unique ID)
- facilityId: string
- orgId: string
- scannedAt: ISO timestamp
- scannedBy: userId

// Nameplate Data
- manufacturer: string
- model: string
- serialNumber: string
- equipmentType: string (boiler, chiller, etc)
- yearManufactured: number

// AI Analysis
- ai_analysis: {
    efficiency_rating: string
    maintenance_recommendations: []
    compliance_notes: string
    estimated_age: number
    condition_assessment: string
  }

// Media
- photos: [
    {
      s3_url: string
      uploaded_at: timestamp
      type: "nameplate" | "overview" | "detail"
    }
  ]

// Reports
- reports: [
    {
      generated_at: timestamp
      report_url: string (S3)
      report_type: "initial" | "inspection" | "maintenance"
    }
  ]

// Metadata
- tags: string[]
- notes: string
- archived: boolean (default: false)
- createdAt: ISO timestamp
- updatedAt: ISO timestamp

// GSI for facility-based queries
GSI1PK: FACILITY#<facilityId>
GSI1SK: EQUIPMENT#<equipmentType>#<timestamp>
```

### Indexes:

**GSI1 - FacilityEquipmentIndex:**
- PK: `FACILITY#<facilityId>`
- SK: `EQUIPMENT#<equipmentType>#<timestamp>`
- Use: Query all equipment for a facility, sorted by type

**GSI2 - TypeIndex:**
- PK: `ORG#<orgId>`
- SK: `TYPE#<equipmentType>#<timestamp>`
- Use: Query all equipment of a specific type across org

### Billing Logic:
```javascript
// Count active equipment
const count = await countEquipment(orgId, { archived: false });

// Tier pricing
if (count > 25) {
  additionalCharge = 10.00;
  message = `${count} equipment in library (+$10/mo)`;
}
```
