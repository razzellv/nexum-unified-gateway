/**
 * Nexum Suum — Unified Asset & Inventory Data Model
 * Version: 2.0
 * Principle: "Structured, admissible data driving defensible decisions."
 *
 * Segments: government | facility | retail | property | personal
 * Input methods: manual | import | api | sensor
 * Confidence: verified | estimated | unknown
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export type Segment        = 'government' | 'facility' | 'retail' | 'property' | 'personal';
export type Confidence     = 'verified' | 'estimated' | 'unknown';
export type InputMethod    = 'manual' | 'import' | 'api' | 'sensor';
export type OperationalRole= 'critical' | 'important' | 'support' | 'non_critical';
export type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'failed' | 'decommissioned';
export type LifecyclePhase = 'new' | 'active' | 'aging' | 'end_of_life' | 'retired';
export type ComplianceStatus = 'current' | 'due_soon' | 'overdue' | 'not_applicable' | 'pending';
export type RiskLevel      = 'critical' | 'high' | 'medium' | 'low' | 'negligible';
export type EnergyType     = 'electrical' | 'natural_gas' | 'water' | 'steam' | 'chilled_water' | 'compressed_air' | 'none';
export type AssetStatus    = 'active' | 'inactive' | 'maintenance' | 'decommissioned' | 'disposed';

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION HIERARCHY
// ─────────────────────────────────────────────────────────────────────────────

export interface LocationHierarchy {
  siteId:       string;      // Top-level: portfolio / campus / organization
  siteName:     string;
  buildingId:   string;      // Building or store unit
  buildingName: string;
  floor?:       string;      // Floor / level
  zone?:        string;      // Zone / wing / department
  systemArea?:  string;      // HVAC, Electrical, Plumbing, IT, Food Service…
  subSystem?:   string;      // AHU-1, Panel-B, RTU-3…
  room?:        string;      // Room number or unit number
  gpsLat?:      number;
  gpsLng?:      number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICAL SPECIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface TechnicalSpecs {
  // Identification
  manufacturer?:    string;
  model?:           string;
  modelYear?:       number;
  serialNumber?:    string;
  assetTag?:        string;       // Internal asset tag / barcode
  rfidTag?:         string;

  // Physical
  weightLbs?:       number;
  dimensionsIn?:    string;       // "W x D x H"
  colorFinish?:     string;

  // Capacity & Performance (universal)
  capacity?:        string;       // e.g. "5 ton", "200A", "500 gal", "48U"
  ratedOutput?:     string;
  efficiency?:      string;       // SEER, EER, COP, %
  voltageV?:        number;
  amperage?:        number;
  phaseType?:       string;       // "1-phase" | "3-phase"
  frequencyHz?:     number;
  btuRating?:       number;
  horsepowerHP?:    number;
  pressurePSI?:     number;
  flowRateGPM?:     number;
  storageCapacityL?:number;

  // Network / IT
  ipAddress?:       string;
  macAddress?:      string;
  firmware?:        string;
  protocol?:        string;       // BACnet, Modbus, MQTT, REST…
  communicationType?: string;     // wired | wireless | cellular | zigbee

  // Data plate / nameplate
  dataPlateNotes?:  string;
  certifications?:  string[];     // UL, ASME, NSF, FM…
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE & RUNTIME
// ─────────────────────────────────────────────────────────────────────────────

export interface Lifecycle {
  installDate?:          string;   // ISO date
  manufactureDate?:      string;
  warrantyExpiry?:       string;
  expectedLifeYears?:    number;
  designLifeHours?:      number;
  currentRuntimeHours?:  number;
  lastInspectionDate?:   string;
  nextInspectionDate?:   string;
  certificationExpiry?:  string;
  lastPMDate?:           string;
  nextPMDate?:           string;
  phase:                 LifecyclePhase;
  condition:             AssetCondition;
  conditionConfidence:   Confidence;
  // Computed
  assetHealthPct?:       number;   // (1 - runtime/designLife) × 100
  ageYears?:             number;
  remainingLifePct?:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

export interface MaintenanceRecord {
  id:            string;
  date:          string;
  type:          'preventive' | 'corrective' | 'predictive' | 'inspection' | 'calibration';
  performedBy?:  string;
  vendor?:       string;
  notes?:        string;
  cost?:         number;
  workOrderId?:  string;
  attachments?:  string[];    // S3 keys / URLs
}

export interface ComplianceRequirement {
  id:            string;
  standard:      string;      // NFPA 25, ASHRAE 180, OSHA, NSF, NFPA 1710…
  description:   string;
  frequency:     string;      // "Annual" | "Quarterly" | "Monthly"
  lastCompleted?:string;
  nextDue?:      string;
  status:        ComplianceStatus;
  documentIds?:  string[];
  inspector?:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENERGY & UTILITY
// ─────────────────────────────────────────────────────────────────────────────

export interface EnergyProfile {
  primaryEnergy:     EnergyType;
  secondaryEnergy?:  EnergyType;
  ratedConsumption?: number;     // kWh, BTU, GPD, etc.
  consumptionUnit?:  string;     // "kWh/yr" | "BTU/hr" | "GPD"
  measuredConsumption?: number;
  measurementDate?:  string;
  annualCost?:       number;
  meterPointId?:     string;     // For BMS/sensor cross-link
  subMeterEnabled:   boolean;
  carbonFactor?:     number;     // kg CO2 per unit
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK & CRITICALITY
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskProfile {
  operationalRole:      OperationalRole;
  riskLevel:            RiskLevel;
  failureImpact?:       string;      // Plain text description
  redundancyAvailable:  boolean;
  redundancyAssetId?:   string;
  mttfHours?:           number;      // Mean time to failure
  mttrHours?:           number;      // Mean time to repair
  criticalityScore?:    number;      // 0–100 composite
  regulatoryRequired:   boolean;
  lifesSafety:          boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialData {
  purchaseCost?:        number;
  currentBookValue?:    number;
  replacementCost?:     number;
  annualMaintenanceCost?: number;
  annualEnergyCost?:    number;
  totalCostOfOwnership?: number;
  depreciationMethod?:  'straight_line' | 'declining_balance' | 'none';
  depreciationYears?:   number;
  budgetCode?:          string;
  costCenterCode?:      string;
  poNumber?:            string;       // Purchase Order
  vendorId?:            string;
  insuranceValue?:      number;
  noiImpact?:           number;       // Property management: Net Operating Income impact
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-LINKS
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetLinks {
  workOrderIds?:      string[];
  complianceDocIds?:  string[];
  violationIds?:      string[];
  fiasSessionIds?:    string[];
  parentAssetId?:     string;    // For sub-components
  childAssetIds?:     string[];
  inventoryItemIds?:  string[];  // Linked parts/consumables
  vendorContractId?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE / AUDIT TRAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditProvenance {
  createdAt:       string;
  createdBy:       string;
  updatedAt:       string;
  updatedBy:       string;
  dataSource:      InputMethod;
  confidence:      Confidence;
  verifiedBy?:     string;
  verifiedAt?:     string;
  changeLog?:      { ts: string; user: string; field: string; from: string; to: string }[];
  importBatchId?:  string;
  sensorDeviceId?: string;
  apiSource?:      string;      // "honeywell" | "siemens" | "maximo" etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT-SPECIFIC EXTENSIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Government / Public Safety additions */
export interface GovtExtension {
  apparatusId?:         string;      // Vehicle / fleet ID
  chainOfCustodyRef?:   string;
  classificationLevel?: string;      // Confidential | Sensitive | Public
  personnelAssigned?:   string[];
  responseMetrics?:     { metric: string; target: string; actual: string }[];
  nfpaCategory?:        string;      // NFPA 1710, NFPA 25, etc.
  grantFunded?:         boolean;
  grantRef?:            string;
}

/** Retail / Multi-site additions */
export interface RetailExtension {
  storeId?:             string;
  storeFormat?:         string;      // "QSR" | "Full Service" | "Express"
  departmentZone?:      string;      // "Hot Line" | "Cold Line" | "Front of House"
  healthInspectionRef?: string;
  tempLogEnabled:       boolean;
  minTempF?:            number;
  maxTempF?:            number;
  cleaningSchedule?:    string;
  fifoTracked:          boolean;
  benchmarkGroupId?:    string;      // For cross-site benchmarking
  uptimeTarget?:        number;      // % target uptime
  uptimeActual?:        number;
}

/** Property Management additions */
export interface PropertyExtension {
  unitId?:              string;      // Apartment / suite
  tenantId?:            string;
  tenantImpact?:        'high' | 'medium' | 'low' | 'none';
  commonArea:           boolean;
  turnoverReady:        boolean;
  capitalProjectRef?:   string;
  noiBasis?:            number;      // Contribution to NOI
  leaseCoverage?:       string;      // "landlord" | "tenant" | "shared"
  capexCategory?:       'replacement' | 'improvement' | 'maintenance';
}

/** Personal / Homeowner additions */
export interface HomeExtension {
  room?:               string;      // "Kitchen" | "Master Bath" | "Garage"
  smartHomeId?:        string;      // Google Home / Alexa device ID
  reminderEnabled:     boolean;
  nextReminderDate?:   string;
  selfServiceable:     boolean;
  diyNotes?:           string;
  utilityRebateEligible: boolean;
  estimatedSavings?:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER ASSET RECORD
// ─────────────────────────────────────────────────────────────────────────────

export interface UnifiedAsset {
  // Core identity
  id:              string;
  facilityId:      string;
  segment:         Segment;
  status:          AssetStatus;

  // Classification
  name:            string;
  assetType:       string;       // "HVAC Unit" | "Fire Suppression" | "Refrigeration" | "Vehicle"…
  category:        string;       // Top-level group
  subCategory?:    string;
  systemType?:     string;       // "Mechanical" | "Electrical" | "Plumbing" | "IT" | "Food Service"…
  tags?:           string[];

  // Location
  location:        LocationHierarchy;

  // Data
  specs:           TechnicalSpecs;
  lifecycle:       Lifecycle;
  energy:          EnergyProfile;
  risk:            RiskProfile;
  financial:       FinancialData;
  compliance:      ComplianceRequirement[];
  maintenance:     MaintenanceRecord[];
  links:           AssetLinks;
  provenance:      AuditProvenance;

  // Segment extensions (only one populated per record)
  govt?:           GovtExtension;
  retail?:         RetailExtension;
  property?:       PropertyExtension;
  home?:           HomeExtension;

  // Freeform notes
  notes?:          string;
  photoUrls?:      string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY ITEM (consumables / parts / stock)
// ─────────────────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id:              string;
  facilityId:      string;
  segment:         Segment;

  // Identity
  name:            string;
  sku?:            string;
  barcode?:        string;
  category:        string;       // "Parts" | "Food" | "Chemical" | "Uniform" | "Tool"…
  subCategory?:    string;
  brand?:          string;
  description?:    string;

  // Location
  locationSiteId:  string;
  locationZone?:   string;       // "Storage Room A" | "Walk-In Cooler" | "Armory"
  binSlot?:        string;

  // Quantity
  quantityOnHand:  number;
  unit:            string;       // "each" | "box" | "gallon" | "lb" | "roll"
  reorderPoint?:   number;
  reorderQuantity?:number;
  maxStock?:       number;

  // Perishable / temp-sensitive
  perishable:      boolean;
  expiryDate?:     string;
  minTempF?:       number;
  maxTempF?:       number;
  fifo:            boolean;

  // Financial
  unitCost?:       number;
  totalValue?:     number;
  poNumber?:       string;
  vendorId?:       string;
  lastPurchaseDate?:string;
  lastPurchasePrice?:number;

  // Compliance
  safetyDataSheetUrl?: string;
  hazmat:          boolean;
  hazmatClass?:    string;
  nsfCertified?:   boolean;
  usda?:           boolean;

  // Links
  linkedAssetIds?: string[];
  workOrderIds?:   string[];

  // Provenance
  provenance:      AuditProvenance;
  notes?:          string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT FIELD REQUIREMENTS (required | optional | hidden)
// ─────────────────────────────────────────────────────────────────────────────

export type FieldReq = 'required' | 'optional' | 'hidden';

export interface SegmentFieldMap {
  name:                FieldReq;
  assetType:           FieldReq;
  location:            FieldReq;
  serialNumber:        FieldReq;
  installDate:         FieldReq;
  expectedLifeYears:   FieldReq;
  runtimeHours:        FieldReq;
  operationalRole:     FieldReq;
  riskLevel:           FieldReq;
  compliance:          FieldReq;
  energyProfile:       FieldReq;
  financial:           FieldReq;
  chainOfCustody:      FieldReq;
  tenantImpact:        FieldReq;
  temperatureLog:      FieldReq;
  smartHomeId:         FieldReq;
  maintenanceHistory:  FieldReq;
  redundancy:          FieldReq;
  warrantyExpiry:      FieldReq;
}

export const SEGMENT_FIELDS: Record<Segment, SegmentFieldMap> = {
  government: {
    name: 'required', assetType: 'required', location: 'required',
    serialNumber: 'required', installDate: 'required', expectedLifeYears: 'required',
    runtimeHours: 'optional', operationalRole: 'required', riskLevel: 'required',
    compliance: 'required', energyProfile: 'optional', financial: 'required',
    chainOfCustody: 'required', tenantImpact: 'hidden', temperatureLog: 'hidden',
    smartHomeId: 'hidden', maintenanceHistory: 'required', redundancy: 'required',
    warrantyExpiry: 'required',
  },
  facility: {
    name: 'required', assetType: 'required', location: 'required',
    serialNumber: 'required', installDate: 'required', expectedLifeYears: 'required',
    runtimeHours: 'required', operationalRole: 'required', riskLevel: 'required',
    compliance: 'required', energyProfile: 'required', financial: 'optional',
    chainOfCustody: 'hidden', tenantImpact: 'hidden', temperatureLog: 'optional',
    smartHomeId: 'hidden', maintenanceHistory: 'required', redundancy: 'optional',
    warrantyExpiry: 'required',
  },
  retail: {
    name: 'required', assetType: 'required', location: 'required',
    serialNumber: 'optional', installDate: 'required', expectedLifeYears: 'optional',
    runtimeHours: 'required', operationalRole: 'required', riskLevel: 'optional',
    compliance: 'required', energyProfile: 'optional', financial: 'optional',
    chainOfCustody: 'hidden', tenantImpact: 'hidden', temperatureLog: 'required',
    smartHomeId: 'hidden', maintenanceHistory: 'required', redundancy: 'optional',
    warrantyExpiry: 'optional',
  },
  property: {
    name: 'required', assetType: 'required', location: 'required',
    serialNumber: 'optional', installDate: 'required', expectedLifeYears: 'required',
    runtimeHours: 'optional', operationalRole: 'optional', riskLevel: 'optional',
    compliance: 'optional', energyProfile: 'optional', financial: 'required',
    chainOfCustody: 'hidden', tenantImpact: 'required', temperatureLog: 'hidden',
    smartHomeId: 'hidden', maintenanceHistory: 'required', redundancy: 'hidden',
    warrantyExpiry: 'required',
  },
  personal: {
    name: 'required', assetType: 'required', location: 'optional',
    serialNumber: 'optional', installDate: 'optional', expectedLifeYears: 'optional',
    runtimeHours: 'hidden', operationalRole: 'hidden', riskLevel: 'hidden',
    compliance: 'optional', energyProfile: 'optional', financial: 'optional',
    chainOfCustody: 'hidden', tenantImpact: 'hidden', temperatureLog: 'hidden',
    smartHomeId: 'optional', maintenanceHistory: 'optional', redundancy: 'hidden',
    warrantyExpiry: 'optional',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSET CATEGORIES BY SEGMENT
// ─────────────────────────────────────────────────────────────────────────────

export const ASSET_CATEGORIES: Record<Segment, { group: string; types: string[] }[]> = {
  government: [
    { group: 'Fire & Life Safety',   types: ['Fire Panel', 'Suppression System', 'Extinguisher', 'Smoke Detector', 'Emergency Lighting', 'PA System'] },
    { group: 'Apparatus / Fleet',    types: ['Fire Engine', 'Ladder Truck', 'Rescue Unit', 'Command Vehicle', 'EMS Unit', 'Support Vehicle'] },
    { group: 'HVAC & Mechanical',    types: ['Air Handler', 'Chiller', 'Boiler', 'Generator', 'UPS', 'Cooling Tower'] },
    { group: 'Weapons & Equipment',  types: ['Firearm', 'Protective Gear', 'Radio / Comm', 'Body Camera', 'Taser', 'K9 Equipment'] },
    { group: 'Facilities',           types: ['HVAC Unit', 'Electrical Panel', 'Plumbing Fixture', 'Security Camera', 'Access Control', 'Server'] },
    { group: 'IT Infrastructure',    types: ['Server', 'Network Switch', 'Radio Tower', 'Dispatch Console', 'CAD Workstation'] },
  ],
  facility: [
    { group: 'HVAC',                 types: ['AHU', 'RTU', 'FCU', 'Chiller', 'Boiler', 'Cooling Tower', 'VRF System', 'Exhaust Fan', 'MAU'] },
    { group: 'Electrical',           types: ['Main Panel', 'Sub-Panel', 'Transformer', 'Generator', 'UPS', 'Motor', 'VFD', 'Lighting Control'] },
    { group: 'Plumbing',             types: ['Pump', 'Water Heater', 'Backflow Preventer', 'PRV', 'Sump Pump', 'Cooling Tower', 'Boiler Feed'] },
    { group: 'Fire & Life Safety',   types: ['Fire Panel', 'Suppression Riser', 'Standpipe', 'Extinguisher', 'Emergency Light', 'Exit Sign'] },
    { group: 'Building Controls',    types: ['BMS Controller', 'DDC Panel', 'Thermostat', 'Sensor Node', 'VAV Box', 'Actuator'] },
    { group: 'Vertical Transport',   types: ['Elevator', 'Escalator', 'Moving Walk', 'Dumbwaiter', 'Lift'] },
    { group: 'IT / AV',              types: ['Server', 'Network Switch', 'UPS', 'CCTV Camera', 'Access Control Panel', 'AV System'] },
    { group: 'Furniture',            types: ['Desk', 'Chair', 'Cabinet', 'Shelving', 'Locker', 'Table', 'Partition'] },
    { group: 'Kitchen / Breakroom',  types: ['Refrigerator', 'Microwave', 'Coffee Maker', 'Dishwasher', 'Ice Machine', 'Vending Machine'] },
    { group: 'Janitorial',           types: ['Auto Scrubber', 'Vacuum', 'Pressure Washer', 'Floor Polisher', 'Extraction Machine'] },
    { group: 'Appliances',           types: ['Washer', 'Dryer', 'Dishwasher', 'Refrigerator', 'Freezer', 'Oven', 'Water Dispenser'] },
  ],
  retail: [
    { group: 'Refrigeration',        types: ['Walk-In Cooler', 'Walk-In Freezer', 'Reach-In Case', 'Display Cooler', 'Ice Machine', 'Prep Table'] },
    { group: 'Cooking Equipment',    types: ['Fryer', 'Grill', 'Oven', 'Steamer', 'Range', 'Salamander', 'Holding Cabinet', 'Pizza Oven'] },
    { group: 'Beverage',             types: ['Espresso Machine', 'Blender', 'Juice Press', 'Soda System', 'Beer Tap', 'Water Filtration'] },
    { group: 'HVAC',                 types: ['RTU', 'Split System', 'Exhaust Hood', 'Make-Up Air', 'Walk-In Evaporator', 'Condenser'] },
    { group: 'POS & Tech',           types: ['POS Terminal', 'Kitchen Display', 'Receipt Printer', 'Cash Drawer', 'Tablet', 'Router', 'DVR'] },
    { group: 'Retail Fixtures',      types: ['Shelving Unit', 'Display Case', 'Checkout Counter', 'Shopping Cart', 'Sign Board', 'Mirror'] },
    { group: 'Safety & Compliance',  types: ['Fire Suppression Hood', 'Extinguisher', 'First Aid Kit', 'AED', 'Emergency Light', 'CCTV'] },
    { group: 'Delivery & Storage',   types: ['Dock Leveler', 'Pallet Jack', 'Hand Truck', 'Shelving Rack', 'Freezer Trailer'] },
  ],
  property: [
    { group: 'HVAC',                 types: ['Central AC', 'Furnace', 'Heat Pump', 'Window AC', 'Boiler', 'Radiator', 'Mini-Split', 'ERV'] },
    { group: 'Plumbing',             types: ['Water Heater', 'Tankless Heater', 'Sump Pump', 'Water Softener', 'Irrigation Pump', 'Backflow'] },
    { group: 'Electrical',           types: ['Main Panel', 'Sub-Panel', 'Generator', 'EV Charger', 'Solar Inverter', 'Meter', 'Transfer Switch'] },
    { group: 'Appliances',           types: ['Refrigerator', 'Dishwasher', 'Washer', 'Dryer', 'Oven', 'Microwave', 'Garbage Disposal'] },
    { group: 'Building Systems',     types: ['Elevator', 'Intercom', 'Access Control', 'Security Camera', 'Fire Panel', 'Suppression'] },
    { group: 'Exterior',             types: ['Roof', 'Parking Lot', 'Fence', 'Gate', 'Landscaping Equipment', 'Snow Blower', 'Mower'] },
    { group: 'Common Area',          types: ['Laundry Machine', 'Gym Equipment', 'Pool Pump', 'Pool Heater', 'Sauna', 'Lighting'] },
  ],
  personal: [
    { group: 'HVAC',                 types: ['Central AC', 'Furnace', 'Heat Pump', 'Window AC', 'Space Heater', 'Ceiling Fan', 'Dehumidifier'] },
    { group: 'Kitchen Appliances',   types: ['Refrigerator', 'Oven', 'Dishwasher', 'Microwave', 'Coffee Maker', 'Toaster', 'Blender'] },
    { group: 'Laundry',              types: ['Washer', 'Dryer', 'Combo Unit'] },
    { group: 'Plumbing',             types: ['Water Heater', 'Tankless Heater', 'Sump Pump', 'Water Softener', 'Well Pump'] },
    { group: 'Electrical',           types: ['Main Panel', 'Generator', 'EV Charger', 'Solar System', 'Battery Backup'] },
    { group: 'Smart Home',           types: ['Thermostat', 'Security Camera', 'Doorbell Camera', 'Smart Lock', 'Hub', 'Sensor Array'] },
    { group: 'Exterior',             types: ['Lawn Mower', 'Snow Blower', 'Pressure Washer', 'Garage Door Opener', 'Irrigation System'] },
    { group: 'Entertainment',        types: ['TV', 'Home Theater', 'Gaming Console', 'Sound System', 'Projector'] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING FLOW STEPS
// ─────────────────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  step:        number;
  id:          string;
  label:       string;
  description: string;
  fields:      string[];
  required:    boolean;
}

export const ASSET_ONBOARDING_FLOW: OnboardingStep[] = [
  { step: 1, id: 'identity',    label: 'Asset Identity',        description: 'Name, type, category, and location assignment.',                fields: ['name', 'assetType', 'category', 'location'], required: true },
  { step: 2, id: 'specs',       label: 'Technical Specs',       description: 'Manufacturer, model, serial number, and nameplate data.',        fields: ['manufacturer', 'model', 'serialNumber', 'capacity', 'voltage'], required: true },
  { step: 3, id: 'lifecycle',   label: 'Lifecycle & Health',    description: 'Install date, expected life, runtime hours, and condition.',     fields: ['installDate', 'expectedLifeYears', 'currentRuntimeHours', 'condition'], required: true },
  { step: 4, id: 'risk',        label: 'Risk & Criticality',    description: 'Operational role, risk level, and redundancy status.',           fields: ['operationalRole', 'riskLevel', 'redundancyAvailable', 'lifesSafety'], required: false },
  { step: 5, id: 'compliance',  label: 'Compliance & PM',       description: 'Applicable standards, inspection dates, and PM schedule.',       fields: ['compliance', 'lastInspectionDate', 'nextPMDate', 'certificationExpiry'], required: false },
  { step: 6, id: 'energy',      label: 'Energy & Utility',      description: 'Energy type, rated consumption, and metering information.',      fields: ['primaryEnergy', 'ratedConsumption', 'consumptionUnit', 'subMeterEnabled'], required: false },
  { step: 7, id: 'financial',   label: 'Financial Data',        description: 'Purchase cost, replacement value, and budget codes.',            fields: ['purchaseCost', 'replacementCost', 'annualMaintenanceCost', 'poNumber'], required: false },
  { step: 8, id: 'validate',    label: 'Validate & Confirm',    description: 'Review data confidence, assign verification status, and save.',  fields: ['confidence', 'verifiedBy', 'notes', 'photoUrls'], required: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH SCORING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function calcAssetHealth(asset: Pick<UnifiedAsset, 'lifecycle'>): number | null {
  const { currentRuntimeHours, designLifeHours, installDate, expectedLifeYears } = asset.lifecycle;
  if (currentRuntimeHours && designLifeHours && designLifeHours > 0) {
    return Math.max(0, Math.round((1 - currentRuntimeHours / designLifeHours) * 100));
  }
  if (installDate && expectedLifeYears && expectedLifeYears > 0) {
    const ageYrs = (Date.now() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.round((1 - ageYrs / expectedLifeYears) * 100));
  }
  return null;
}

export function healthColor(pct: number): string {
  if (pct >= 75) return 'text-green-400';
  if (pct >= 50) return 'text-yellow-400';
  if (pct >= 25) return 'text-orange-400';
  return 'text-red-400';
}

export function healthBg(pct: number): string {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

export function riskColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    critical: 'text-red-400', high: 'text-orange-400',
    medium: 'text-yellow-400', low: 'text-blue-400', negligible: 'text-muted-foreground',
  };
  return map[level];
}

export function complianceColor(status: ComplianceStatus): string {
  const map: Record<ComplianceStatus, string> = {
    current: 'text-green-400', due_soon: 'text-yellow-400',
    overdue: 'text-red-400', not_applicable: 'text-muted-foreground', pending: 'text-blue-400',
  };
  return map[status];
}
