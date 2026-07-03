// Retail Intelligence™ type definitions — Nexum Suum FI Platform

export type RetailFormat =
  | 'grocery' | 'big_box' | 'department_store' | 'convenience'
  | 'specialty' | 'pharmacy' | 'electronics' | 'home_improvement'
  | 'clothing' | 'restaurant' | 'food_service' | 'warehouse_club'
  | 'dollar_store' | 'auto_parts' | 'pet_supply' | 'other';

export type ShrinkCategory =
  | 'employee_theft' | 'shoplifting' | 'vendor_fraud'
  | 'admin_error' | 'damage' | 'unknown';

export type ComplianceArea =
  | 'food_safety' | 'health_permit' | 'fire_safety' | 'ada'
  | 'labor' | 'weights_measures' | 'alcohol_tobacco' | 'building';

export type VendorStatus = 'preferred' | 'approved' | 'probation' | 'suspended' | 'new';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' | 'discontinued';

export type ShiftType = 'opening' | 'mid' | 'closing' | 'overnight' | 'weekend';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'escalated';

// ── Core store profile ────────────────────────────────────────────────────────
export interface StoreProfile {
  storeId: string;
  storeName: string;
  format: RetailFormat;
  squareFeet: number;
  salesFloorSqFt: number;
  backroomSqFt: number;
  numberOfCheckouts: number;
  numberOfSelfCheckouts: number;
  numberOfDepartments: number;
  openDate: string;
  recentRenovationDate?: string;
  targetWeeklySales: number;
  targetShrinkPct: number;       // e.g. 1.5 = 1.5%
  targetInventoryTurnDays: number; // e.g. 14 = 2-week turn
  targetFoodSafetyScore: number;   // 0–100
  targetOnTimeTaskCompletion: number; // pct
}

// ── Inventory intelligence ────────────────────────────────────────────────────
export interface InventorySnapshot {
  snapshotId: string;
  storeId: string;
  timestamp: string;
  operator: string;
  department: string;
  category: string;
  skuCount: number;
  totalUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
  // Velocity metrics
  unitsSoldLast7Days: number;
  unitsSoldLast30Days: number;
  unitsReceivedLast30Days: number;
  // Health flags
  outOfStockSkus: number;
  lowStockSkus: number;
  overStockSkus: number;
  deadStockSkus: number;       // no sales in 90+ days
  expiredUnits?: number;        // for perishables
  nearExpiryUnits?: number;
  // Shrink
  shrinkUnits?: number;
  shrinkValue?: number;
  shrinkCategory?: ShrinkCategory;
  notes?: string;
  createdAt: string;
}

// ── Shrink & loss prevention ──────────────────────────────────────────────────
export interface ShrinkEvent {
  eventId: string;
  storeId: string;
  timestamp: string;
  reportedBy: string;
  category: ShrinkCategory;
  department: string;
  itemDescription: string;
  unitCost: number;
  unitsLost: number;
  totalValue: number;
  recoveryValue?: number;
  caseNumber?: string;
  policeReport?: boolean;
  corrective?: string;
  status: 'open' | 'resolved' | 'under_review';
  createdAt: string;
}

// ── Food safety & compliance ──────────────────────────────────────────────────
export interface FoodSafetyLog {
  logId: string;
  storeId: string;
  timestamp: string;
  operator: string;
  area: string;             // e.g. "Deli Counter", "Walk-in Cooler"
  checkType: 'temperature' | 'sanitation' | 'date_rotation' | 'pest' | 'equipment' | 'employee_hygiene';
  temperatureF?: number;
  targetMinF?: number;
  targetMaxF?: number;
  passed: boolean;
  correctedOnSite: boolean;
  corrective?: string;
  notes?: string;
  createdAt: string;
}

export interface ComplianceRecord {
  recordId: string;
  storeId: string;
  area: ComplianceArea;
  itemDescription: string;
  lastInspectionDate?: string;
  nextDueDate?: string;
  expiryDate?: string;
  status: 'compliant' | 'non_compliant' | 'expiring_soon' | 'expired' | 'pending';
  inspector?: string;
  score?: number;            // 0–100 for health inspection scores
  notes?: string;
  updatedAt: string;
}

// ── Vendor performance ────────────────────────────────────────────────────────
export interface VendorPerformanceLog {
  logId: string;
  storeId: string;
  vendorId: string;
  vendorName: string;
  timestamp: string;
  deliveryOnTime: boolean;
  fillRate: number;          // pct of ordered units delivered
  qualityRejections: number; // units rejected
  invoiceAccuracy: boolean;
  shortages: number;
  substitutions: number;
  notes?: string;
  createdAt: string;
}

// ── Operational task log ──────────────────────────────────────────────────────
export interface OperationalTask {
  taskId: string;
  storeId: string;
  shift: ShiftType;
  department: string;
  taskName: string;
  assignedTo?: string;
  dueTime?: string;
  completedAt?: string;
  status: TaskStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recurrence: 'daily' | 'weekly' | 'monthly' | 'one_time';
  notes?: string;
  createdAt: string;
}

// ── Energy & sustainability ───────────────────────────────────────────────────
export interface StoreEnergySnapshot {
  snapshotId: string;
  storeId: string;
  periodStart: string;
  periodEnd: string;
  electricKwh: number;
  gasTherm?: number;
  waterGallons?: number;
  refrigerantLbs?: number;
  electricCost: number;
  gasCost?: number;
  totalUtilityCost: number;
  intensityKwhPerSqFt: number;
  carbonLbs: number;
  notes?: string;
  createdAt: string;
}

// ── Intelligence output types ─────────────────────────────────────────────────
export interface RetailKPI {
  label: string;
  value: string;
  sub: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  color: string;
  alert?: boolean;
}

export interface InventoryHealthSummary {
  totalSkus: number;
  totalValue: number;
  outOfStockRate: number;    // pct
  lowStockRate: number;
  overStockRate: number;
  deadStockValue: number;
  turnDays: number;
  topDeadStockDept: string;
  topOutOfStockDept: string;
  expiryRisk: number;        // $ at risk from near-expiry
  recommendedMarkdowns: string[];
  reorderAlerts: string[];
}

export interface ShrinkSummary {
  totalShrinkValue: number;
  shrinkPct: number;         // vs. total retail value
  byCategoryValue: Record<ShrinkCategory, number>;
  topDepartment: string;
  topCategory: ShrinkCategory;
  weekOverWeekChange: number; // pct change
  recoveredValue: number;
  openCases: number;
  riskAlerts: string[];
  preventionActions: string[];
}

export interface VendorIntelligenceSummary {
  totalVendors: number;
  avgFillRate: number;
  avgOnTimeRate: number;
  preferredVendorCount: number;
  probationCount: number;
  topPerformer: string;
  underperformer: string;
  totalShortageValue: number;
  recommendations: string[];
}

export interface FoodSafetyScore {
  overallScore: number;       // 0–100
  passRate: number;           // pct of checks passed
  criticalViolations: number;
  majorViolations: number;
  minorViolations: number;
  temperatureCompliance: number; // pct
  sanitationCompliance: number;
  dateRotationCompliance: number;
  expiringPermits: string[];
  correctiveActions: string[];
}

export interface OperationalEfficiency {
  taskCompletionRate: number;  // pct
  onTimeCompletionRate: number;
  criticalTasksMissed: number;
  avgTasksPerShift: number;
  bestShift: ShiftType;
  worstShift: ShiftType;
  topMissedCategory: string;
  recommendations: string[];
}

export interface RetailCTSInsight {
  dimension: 'reliability' | 'relevance' | 'scalability' | 'volatility' | 'validation';
  score: number;              // 0–100
  trend: 'improving' | 'stable' | 'declining';
  keyMetric: string;
  interpretation: string;
  correctiveActions: string[];
  preservedKnowledge: string[];
  benchmarkComparison: string;  // vs. national retail standards
}

export interface RetailExecutiveSummary {
  periodLabel: string;
  storePerformanceIndex: number;  // 0–100 composite
  totalSalesEstimate: number;
  shrinkRatePct: number;
  inventoryTurnDays: number;
  foodSafetyScore: number;
  taskCompletionRate: number;
  energyIntensity: number;        // kWh/sq ft
  vendorFillRate: number;
  topRisks: string[];
  quickWins: string[];
  capitalProjects: string[];
  fiveYearProjection: string;
}

export interface RetailTimelineEntry {
  id: string;
  timestamp: string;
  source: 'inventory' | 'shrink' | 'food_safety' | 'vendor' | 'compliance' | 'operations' | 'energy' | 'cts';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  department?: string;
  value?: string;
}
