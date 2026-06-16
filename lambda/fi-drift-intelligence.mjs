// Performance Drift & Sequencing Drift Intelligence Engine
// Detects gradual degradation before alarms or failures occur.
//
// Drift categories:
//   A  Operationally Normal          E  Sequencing Drift
//   B  Optimization Opportunity      F  Maintenance Compliance Issue
//   C  Performance Drift             G  Confirmed Fault
//   D  Reliability Drift             H  Critical Risk

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const db = DynamoDBDocumentClient.from(client);

const TABLE    = process.env.TABLE    || "NexumDriftAnalysis";
const RDGS     = process.env.RDGS     || "NexumDriftReadings";
const WO_TABLE = process.env.WO_TABLE || "WorkOrders";
const VE_TABLE = process.env.VE_TABLE || "ViolationEvents";

const res = (s, b) => ({
  statusCode: s,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
  },
  body: JSON.stringify(b),
});

const getMethod = (e) => e.requestContext?.http?.method || e.httpMethod || "GET";
const getPath   = (e) => e.requestContext?.http?.path   || e.path       || "/";
const getBody   = (e) => { try { return JSON.parse(e.body || "{}"); } catch { return {}; } };
const getClaims = (e) => { try { return e.requestContext?.authorizer?.jwt?.claims || {}; } catch { return {}; } };
const getFid    = (c) => c["custom:facilityId"] || c["custom:orgId"] || "facility-001";

// ── Parameter rules ────────────────────────────────────────────────────────
// drift_direction: "decreasing" = flag when going down, "increasing" = flag when going up

const PARAM_RULES = {
  chw_delta_t: {
    label: "CHW Delta-T", unit: "°F",
    ideal_min: 10, warn_min: 8, critical_min: 4,
    drift_direction: "decreasing",
    category: "C",
    causes: ["Low Delta-T Syndrome","Excessive Coil Flow","Valve Leakage","Control Sequence Issue","Bypass Flow"],
    impact: "Reduced chiller efficiency and increased energy consumption.",
  },
  hw_delta_t: {
    label: "HW Delta-T", unit: "°F",
    ideal_min: 20, warn_min: 15, critical_min: 8,
    drift_direction: "decreasing",
    category: "C",
    causes: ["Coil Bypass","Valve Leakage","Boiler Short-Cycling","Undersized Coils"],
    impact: "Increased boiler runtime and fuel consumption.",
  },
  kw_per_ton: {
    label: "kW/Ton", unit: "kW/ton",
    ideal_max: 0.65, warn_max: 0.80, critical_max: 1.0,
    drift_direction: "increasing",
    category: "C",
    causes: ["Condenser Fouling","Evaporator Fouling","Low Refrigerant Charge","High Lift Conditions","Tube Scaling"],
    impact: "Direct increase in chiller operating cost.",
  },
  boiler_efficiency: {
    label: "Boiler Efficiency", unit: "%",
    ideal_min: 85, warn_min: 80, critical_min: 75,
    drift_direction: "decreasing",
    category: "C",
    causes: ["Flue Gas Fouling","Burner Tuning Drift","Scale Buildup","Air-Fuel Ratio Drift"],
    impact: "Increased fuel consumption per unit of heat delivered.",
  },
  bearing_temp: {
    label: "Bearing Temperature", unit: "°F",
    warn_max: 180, critical_max: 200,
    drift_direction: "increasing",
    category: "D",
    causes: ["Lubrication Degradation","Overloading","Misalignment","Bearing Wear"],
    impact: "Progressive bearing failure leading to motor replacement.",
  },
  vibration_ips: {
    label: "Vibration", unit: "in/s",
    warn_max: 0.10, critical_max: 0.25,
    drift_direction: "increasing",
    category: "D",
    causes: ["Imbalance","Misalignment","Looseness","Bearing Defect","Resonance"],
    impact: "Accelerated wear on rotating components.",
  },
  pump_speed_pct: {
    label: "Pump Speed", unit: "%",
    context: "sustained high speed under low load suggests flow control issue",
    drift_direction: "increasing",
    category: "C",
    causes: ["Control Loop Hunting","Valve Bypass","Wrong Setpoint","VFD Fault"],
    impact: "Excess energy consumption and flow-induced cavitation risk.",
  },
  vfd_frequency: {
    label: "VFD Frequency", unit: "Hz",
    context: "trending toward 60Hz under low load indicates control issue",
    drift_direction: "increasing",
    category: "E",
    causes: ["Pressure Setpoint Drift","Valve Failure","Control Sequence Issue","Demand Override"],
    impact: "Loss of variable-speed energy savings.",
  },
  oil_differential_pressure: {
    label: "Oil Differential Pressure", unit: "psi",
    warn_min: 8, critical_min: 5,
    drift_direction: "decreasing",
    category: "D",
    causes: ["Oil Filter Fouling","Oil Pump Wear","Oil Quality Degradation","Relief Valve Issue"],
    impact: "Compressor bearing lubrication failure.",
  },
  steam_consumption: {
    label: "Steam Consumption", unit: "lbs/hr",
    context: "trending up relative to load indicates losses",
    drift_direction: "increasing",
    category: "C",
    causes: ["Steam Trap Failure","Condensate Losses","Insulation Degradation","Process Leak"],
    impact: "Increased boiler load and fuel cost.",
  },
};

// ── Linear regression trend engine ────────────────────────────────────────

function analyzeTrend(rawReadings) {
  if (!rawReadings || rawReadings.length < 3) {
    return { drift_detected: false, confidence: "insufficient_data", reading_count: rawReadings?.length || 0 };
  }

  const sorted = [...rawReadings]
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const n = Math.min(sorted.length, 12);
  const recent = sorted.slice(-n);
  const values = recent.map(r => parseFloat(r.v));

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  values.forEach((v, i) => { num += (i - xMean) * (v - yMean); den += (i - xMean) ** 2; });
  const slope = den !== 0 ? num / den : 0;
  const slopePctPerReading = yMean !== 0 ? (slope / Math.abs(yMean)) * 100 : 0;

  const predicted = values.map((_, i) => yMean + slope * (i - xMean));
  const ssTot = values.reduce((a, v) => a + (v - yMean) ** 2, 0);
  const ssRes = values.reduce((a, v, i) => a + (v - predicted[i]) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  const current = values[n - 1];
  const baseline = yMean;
  const direction = slope >  0.001 ? "increasing"
                  : slope < -0.001 ? "decreasing"
                  : "stable";

  const significantSlope = Math.abs(slopePctPerReading) > 2.5;
  const strongTrend = r2 > 0.45;

  return {
    current: Math.round(current * 100) / 100,
    baseline: Math.round(baseline * 100) / 100,
    slope: Math.round(slope * 1000) / 1000,
    slope_pct_per_reading: Math.round(slopePctPerReading * 10) / 10,
    r_squared: Math.round(r2 * 100) / 100,
    direction,
    reading_count: n,
    drift_detected: significantSlope && strongTrend,
    confidence: r2 > 0.70 ? "high" : r2 > 0.45 ? "medium" : "low",
    values_sampled: values,
  };
}

// ── Low Load Protection ────────────────────────────────────────────────────
// Suppress fault/drift classification when conditions suggest low building demand.

function isLowLoad(context) {
  const { oat, occupancy_pct, cooling_demand_pct, heating_demand_pct } = context || {};
  const lowOAT    = oat !== undefined && oat < 65;
  const highOAT   = oat !== undefined && oat > 85;
  const lowOccup  = occupancy_pct !== undefined && occupancy_pct < 30;
  const lowCool   = cooling_demand_pct !== undefined && cooling_demand_pct < 20;
  const lowHeat   = heating_demand_pct !== undefined && heating_demand_pct < 20;
  const active    = [lowOAT || highOAT, lowOccup, lowCool, lowHeat].filter(Boolean).length;
  return { active: active >= 2, factors: { lowOAT, highOAT, lowOccup, lowCool, lowHeat } };
}

// ── Triple Constraint expansion ────────────────────────────────────────────

function buildTripleConstraint(category, parameter, current, rule) {
  const stages = [];

  if (category === "B" || category === "C") {
    stages.push({
      stage: 1, label: "Current",
      time: "Immediate", cost: "None", scope: "Monitor and trend",
    });
    stages.push({
      stage: 2, label: "Near-Term",
      time: "1–3 Months", cost: "Low–Moderate",
      scope: "Efficiency degradation compounds; energy waste accumulates",
    });
    stages.push({
      stage: 3, label: "Medium-Term",
      time: "3–12 Months", cost: "Moderate–High",
      scope: `${rule?.label || parameter} drift becomes measurable performance liability; may require service call`,
    });
  } else if (category === "D" || category === "F") {
    stages.push({
      stage: 1, label: "Current",
      time: "Immediate", cost: "Low (PM)",
      scope: "Address maintenance task before wear progression",
    });
    stages.push({
      stage: 2, label: "Near-Term",
      time: "1–3 Months", cost: "Moderate",
      scope: "Accelerated wear on affected component",
    });
    stages.push({
      stage: 3, label: "Medium-Term",
      time: "3–12 Months", cost: "High",
      scope: "Component reliability degradation; scheduled replacement may be required",
    });
    stages.push({
      stage: 4, label: "Failure Risk",
      time: "Unknown", cost: "Critical",
      scope: "Unplanned failure and operational interruption",
    });
  } else if (category === "E") {
    stages.push({
      stage: 1, label: "Current",
      time: "Immediate", cost: "Low",
      scope: "Sequencing adjustment; no hardware required",
    });
    stages.push({
      stage: 2, label: "Ongoing",
      time: "Daily", cost: "Accumulating",
      scope: "Energy waste and excess equipment wear per day of inaction",
    });
    stages.push({
      stage: 3, label: "Long-Term",
      time: "6–24 Months", cost: "High",
      scope: "Reduced equipment life and increased maintenance frequency",
    });
  } else if (category === "G" || category === "H") {
    stages.push({
      stage: 1, label: "Immediate Action",
      time: "Now", cost: "Repair / Inspect",
      scope: "Prevent further damage or safety risk",
    });
    stages.push({
      stage: 2, label: "If Deferred",
      time: "< 30 Days", cost: "High",
      scope: "Secondary damage to related systems",
    });
    stages.push({
      stage: 3, label: "If Ignored",
      time: "Unknown", cost: "Critical",
      scope: "Operational failure, safety incident, or regulatory consequence",
    });
  }

  return stages;
}

// ── Sequencing analysis ────────────────────────────────────────────────────

function analyzeSequencing(stagingData) {
  const findings = [];
  let driftScore = 0;

  // Chiller staging
  if (stagingData.chillers && stagingData.chillers.length > 1) {
    const running = stagingData.chillers.filter(c => c.running);
    if (running.length >= 2) {
      const avgLoad = running.reduce((a, c) => a + (c.load_pct || 0), 0) / running.length;
      const totalLoad = running.reduce((a, c) => a + (c.load_pct || 0), 0);
      // Total capacity utilization across all running chillers
      if (avgLoad < 40 && running.length >= 2) {
        const potentialSingleLoad = totalLoad * (running.length / 1); // if consolidated
        driftScore += 25;
        findings.push({
          id: randomUUID(),
          category: "E",
          severity: "medium",
          title: "Chiller Staging Opportunity",
          description: `${running.length} chillers operating at avg ${Math.round(avgLoad)}% load. ` +
            `Consolidating to fewer units would improve efficiency.`,
          causes: ["Low building load","Unoptimized staging logic","Missing lead/lag automation"],
          impact: `Estimated ${Math.round((running.length - 1) * 15)}–${Math.round((running.length - 1) * 25)}% energy savings on chiller plant.`,
          low_load_protected: false,
        });
      }
    }
  }

  // Pump staging
  if (stagingData.pumps && stagingData.pumps.length > 1) {
    const running = stagingData.pumps.filter(p => p.running);
    const allHigh = running.every(p => (p.speed_pct || 100) > 80);
    const allLow  = running.every(p => (p.speed_pct || 0)  < 40);
    if (running.length === stagingData.pumps.length && allLow) {
      driftScore += 20;
      findings.push({
        id: randomUUID(),
        category: "E",
        severity: "medium",
        title: "Pump Lead/Lag Sequencing Drift",
        description: `All ${running.length} pumps running at low speed. ` +
          `Lead/lag operation would reduce wear and energy consumption.`,
        causes: ["Missing lag pump cutoff setpoint","Control sequence drift","Operator override left active"],
        impact: "Excess pump wear and energy waste; reduced equipment life.",
        low_load_protected: false,
      });
    }
    if (allHigh && running.length >= 2) {
      driftScore += 15;
      findings.push({
        id: randomUUID(),
        category: "E",
        severity: "high",
        title: "Pump Operating at Max Speed — Staging Review",
        description: `All ${running.length} pumps at >80% speed simultaneously. ` +
          `Review system pressure setpoints and verify no hydraulic obstruction.`,
        causes: ["Pressure setpoint too high","Control valve issue","Undersized distribution"],
        impact: "Potential flow-induced cavitation and excess energy.",
        low_load_protected: false,
      });
    }
  }

  return { findings, drift_score: Math.min(100, driftScore) };
}

// ── Scoring from readings ──────────────────────────────────────────────────

function computeScores(paramTrends, sequencingDrift, maintenanceRisk, context) {
  const llp = isLowLoad(context);

  let perfDrift = 0;
  let reliabilityDrift = 0;
  let energyWaste = 0;
  const paramFindings = [];

  for (const [param, trend] of Object.entries(paramTrends)) {
    const rule = PARAM_RULES[param];
    if (!trend || !rule || !trend.drift_detected) continue;

    const going = trend.direction;
    const relevant = (rule.drift_direction === "decreasing" && going === "decreasing") ||
                     (rule.drift_direction === "increasing" && going === "increasing");
    if (!relevant) continue;

    // Apply Low Load Protection for flow-related parameters
    const llpApplies = llp.active && ["chw_delta_t","hw_delta_t","pump_speed_pct","vfd_frequency"].includes(param);
    const category = llpApplies ? "A" : rule.category;
    const severity = trend.confidence === "high" ? "high"
                   : trend.confidence === "medium" ? "medium" : "low";

    const severity_pts = severity === "high" ? 20 : severity === "medium" ? 12 : 6;

    if (rule.category === "C") { perfDrift += severity_pts; energyWaste += severity_pts * 0.6; }
    if (rule.category === "D") { reliabilityDrift += severity_pts; }

    // Threshold breaches add additional score
    if (rule.warn_min  !== undefined && trend.current < rule.warn_min)     { perfDrift += 10; reliabilityDrift += 5; }
    if (rule.critical_min !== undefined && trend.current < rule.critical_min) { perfDrift += 20; reliabilityDrift += 15; }
    if (rule.warn_max  !== undefined && trend.current > rule.warn_max)     { reliabilityDrift += 10; }
    if (rule.critical_max !== undefined && trend.current > rule.critical_max) { reliabilityDrift += 25; }

    const tc = buildTripleConstraint(category, param, trend.current, rule);

    paramFindings.push({
      id: randomUUID(),
      category,
      parameter: param,
      severity: llpApplies ? "low" : severity,
      title: `${rule.label} ${going === "decreasing" ? "Declining" : "Rising"} Trend`,
      description: `${rule.label} trending ${going} (current: ${trend.current} ${rule.unit}, ` +
        `slope: ${trend.slope_pct_per_reading > 0 ? "+" : ""}${trend.slope_pct_per_reading}% per reading, ` +
        `R²=${trend.r_squared}).${llpApplies ? " Low Load Protection active — monitoring only." : ""}`,
      causes: rule.causes,
      impact: rule.impact,
      triple_constraint: tc,
      trend_summary: { ...trend, values_sampled: undefined },
      low_load_protected: llpApplies,
      recommendation: llpApplies
        ? "Low load conditions detected. Continue trend monitoring before actioning."
        : trend.confidence === "high"
          ? `Confirmed drift. ${rule.causes[0]} is the primary suspect. Schedule investigation.`
          : `Trend emerging. Collect ${Math.max(0, 5 - trend.reading_count)} more readings to confirm.`,
    });
  }

  // Cap scores
  perfDrift        = Math.min(100, perfDrift);
  reliabilityDrift = Math.min(100, reliabilityDrift);
  energyWaste      = Math.min(100, energyWaste);

  const seqDrift       = Math.min(100, sequencingDrift);
  const maintRisk      = Math.min(100, maintenanceRisk);
  const optPotential   = Math.min(100, Math.round((perfDrift * 0.4 + seqDrift * 0.4 + energyWaste * 0.2)));
  const assetHealth    = Math.max(0, 100 - Math.round(reliabilityDrift * 0.5 + maintRisk * 0.3 + perfDrift * 0.2));
  const facilityScore  = Math.max(0, 100 - Math.round(
    perfDrift * 0.25 + seqDrift * 0.25 + reliabilityDrift * 0.20 + maintRisk * 0.15 + energyWaste * 0.15
  ));

  return {
    scores: {
      performance_drift:   perfDrift,
      sequencing_drift:    seqDrift,
      reliability_drift:   reliabilityDrift,
      optimization_potential: optPotential,
      energy_waste:        energyWaste,
      maintenance_risk:    maintRisk,
      asset_health:        assetHealth,
      facility_intelligence: facilityScore,
    },
    param_findings: paramFindings,
    low_load_protection: llp,
  };
}

// ── Maintenance risk from work orders ─────────────────────────────────────

async function maintenanceRiskFromWOs(fid) {
  let risk = 0;
  const findings = [];
  try {
    const r = await db.send(new QueryCommand({
      TableName: WO_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      ScanIndexForward: false,
      Limit: 200,
    }));
    const wos = r.Items || [];
    const now = Date.now();
    const overdueRaw = wos.filter(w => {
      const due = w.dueDate || w.due_date || w.scheduled_date;
      return due && w.status !== "completed" && w.status !== "closed" && new Date(due) < new Date();
    });

    if (overdueRaw.length > 0) {
      risk += Math.min(40, overdueRaw.length * 8);
      findings.push({
        id: randomUUID(),
        category: "F",
        severity: overdueRaw.length >= 5 ? "high" : "medium",
        title: `${overdueRaw.length} Overdue Work Order${overdueRaw.length > 1 ? "s" : ""}`,
        description: `${overdueRaw.length} work order${overdueRaw.length > 1 ? "s are" : " is"} past due. Unresolved maintenance creates progressive reliability risk.`,
        causes: ["Scheduling gaps", "Resource constraints", "Deferred maintenance culture"],
        impact: "Deferred maintenance compounds drift into component failure.",
        triple_constraint: buildTripleConstraint("F", "maintenance", null, null),
        low_load_protected: false,
        recommendation: "Triage overdue work orders by priority and schedule completion within 30 days.",
      });
    }

    // Recurring failures on same asset
    const byAsset = {};
    for (const w of wos) {
      const assetId = w.assetId || w.asset_id || w.equipmentId || "unknown";
      if (!byAsset[assetId]) byAsset[assetId] = [];
      byAsset[assetId].push(w);
    }
    for (const [assetId, assetWOs] of Object.entries(byAsset)) {
      if (assetId === "unknown") continue;
      const last90 = assetWOs.filter(w => {
        const ts = w.createdAt || w.created_at;
        return ts && (now - new Date(ts)) < 90 * 86_400_000;
      });
      if (last90.length >= 3) {
        risk += 15;
        findings.push({
          id: randomUUID(),
          category: "D",
          severity: last90.length >= 5 ? "high" : "medium",
          title: `Recurring Work Orders — ${assetId}`,
          description: `${last90.length} work orders on asset ${assetId} in last 90 days. Recurring work patterns indicate underlying reliability drift.`,
          causes: ["Root cause not addressed", "Component nearing end of life", "Design deficiency"],
          impact: "Reliability drift leading to eventual unplanned failure.",
          triple_constraint: buildTripleConstraint("D", "asset", null, null),
          low_load_protected: false,
          recommendation: `Perform root cause analysis on asset ${assetId}. Review maintenance history for pattern.`,
        });
      }
    }
  } catch { /* best-effort */ }
  return { risk: Math.min(100, risk), findings };
}

// ── Full analysis ──────────────────────────────────────────────────────────

async function runAnalysis(fid, contextOverride) {
  const pk = `FACILITY#${fid}`;

  // Gather readings grouped by parameter + asset
  let allReadings = [];
  try {
    const r = await db.send(new QueryCommand({
      TableName: RDGS,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": pk },
      ScanIndexForward: false,
      Limit: 1000,
    }));
    allReadings = r.Items || [];
  } catch { /* empty */ }

  // Group readings by parameter
  const byParam = {};
  for (const rdg of allReadings) {
    const key = rdg.parameter || "unknown";
    if (!byParam[key]) byParam[key] = [];
    byParam[key].push({ v: rdg.value, ts: rdg.timestamp || rdg.ts });
  }

  // Run trend analysis per parameter
  const paramTrends = {};
  for (const [param, readings] of Object.entries(byParam)) {
    if (PARAM_RULES[param]) {
      paramTrends[param] = analyzeTrend(readings);
    }
  }

  // Gather staging data for sequencing analysis
  const stagingData = { chillers: [], pumps: [] };
  for (const rdg of allReadings) {
    if (rdg.staging_type === "chiller" && rdg.asset_id) {
      const existing = stagingData.chillers.find(c => c.id === rdg.asset_id);
      if (!existing) stagingData.chillers.push({ id: rdg.asset_id, load_pct: rdg.value, running: rdg.value > 5 });
    }
    if (rdg.staging_type === "pump" && rdg.asset_id) {
      const existing = stagingData.pumps.find(p => p.id === rdg.asset_id);
      if (!existing) stagingData.pumps.push({ id: rdg.asset_id, speed_pct: rdg.value, running: rdg.value > 5 });
    }
  }

  // Use context from most recent reading batch if not overridden
  const context = contextOverride || (allReadings.length > 0
    ? { oat: allReadings[0].oat, occupancy_pct: allReadings[0].occupancy_pct }
    : {});

  const { risk: maintRisk, findings: maintFindings } = await maintenanceRiskFromWOs(fid);
  const { findings: seqFindings, drift_score: seqDriftScore } = analyzeSequencing(stagingData);
  const { scores, param_findings, low_load_protection } = computeScores(paramTrends, seqDriftScore, maintRisk, context);

  // Merge and sort findings (H→G→D→F→E→C→B→A)
  const allFindings = [...param_findings, ...seqFindings, ...maintFindings]
    .sort((a, b) => "HGDFEECBA".indexOf(a.category) - "HGDFEECBA".indexOf(b.category));

  // Category distribution
  const catDist = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };
  for (const f of allFindings) catDist[f.category] = (catDist[f.category] || 0) + 1;
  if (allFindings.length === 0) catDist.A = 1; // all normal

  // Recommended actions
  const recommendations = allFindings
    .filter(f => f.category !== "A")
    .slice(0, 6)
    .map(f => ({
      priority: ["H","G"].includes(f.category) ? "critical" : ["D","F"].includes(f.category) ? "high" : "medium",
      action: f.title,
      detail: f.recommendation || f.impact,
      category: f.category,
    }));

  const summary = {
    facility_id: fid,
    scores,
    findings: allFindings,
    category_distribution: catDist,
    recommendations,
    low_load_protection,
    data_points: {
      reading_count: allReadings.length,
      parameters_tracked: Object.keys(byParam).length,
      staging_chillers: stagingData.chillers.length,
      staging_pumps: stagingData.pumps.length,
    },
    analyzed_at: new Date().toISOString(),
    has_readings: allReadings.length > 0,
  };

  try {
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: pk,
        SK: "ANALYSIS#LATEST",
        ...summary,
        ttl: Math.floor(Date.now() / 1000) + 12 * 3600,
      },
    }));
  } catch { /* best-effort */ }

  return summary;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function handler(event) {
  const method = getMethod(event);
  const path   = getPath(event);
  if (method === "OPTIONS") return res(200, {});

  const claims = getClaims(event);
  const fid    = getFid(claims);
  const pk     = `FACILITY#${fid}`;

  // GET /drift-intelligence — cached or auto-analyze
  if (method === "GET" && (path === "/drift-intelligence" || path.endsWith("/drift-intelligence"))) {
    try {
      const cached = await db.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: "ANALYSIS#LATEST" } }));
      if (cached.Item) return res(200, cached.Item);
    } catch { /* miss */ }
    return res(200, await runAnalysis(fid, null));
  }

  // POST /drift-intelligence/analyze — force re-analysis
  if (method === "POST" && path.endsWith("/analyze")) {
    const body = getBody(event);
    return res(200, await runAnalysis(fid, body.context || null));
  }

  // POST /drift-intelligence/readings — submit readings batch
  if (method === "POST" && path.endsWith("/readings")) {
    const body = getBody(event);
    const { readings, oat, occupancy_pct } = body;
    if (!Array.isArray(readings) || readings.length === 0) {
      return res(400, { error: "readings array required" });
    }
    const now = new Date().toISOString();
    const writes = [];
    for (const rdg of readings) {
      const { parameter, value, unit, asset_id, staging_type, timestamp } = rdg;
      if (!parameter || value === undefined) continue;
      writes.push(db.send(new PutCommand({
        TableName: RDGS,
        Item: {
          PK: pk,
          SK: `READING#${parameter}#${asset_id || "facility"}#${timestamp || now}`,
          parameter, value: parseFloat(value), unit: unit || "",
          asset_id: asset_id || "facility",
          staging_type: staging_type || null,
          oat: oat !== undefined ? parseFloat(oat) : null,
          occupancy_pct: occupancy_pct !== undefined ? parseFloat(occupancy_pct) : null,
          timestamp: timestamp || now,
          ttl: Math.floor(Date.now() / 1000) + 180 * 86400, // 180 days
        },
      })));
    }
    await Promise.all(writes.map(p => p.catch(() => {})));
    return res(200, { stored: writes.length, message: "Readings stored. Run /analyze to refresh analysis." });
  }

  // GET /drift-intelligence/readings — list recent readings
  if (method === "GET" && path.endsWith("/readings")) {
    try {
      const r = await db.send(new QueryCommand({
        TableName: RDGS,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ScanIndexForward: false,
        Limit: 100,
      }));
      return res(200, { readings: r.Items || [] });
    } catch { return res(200, { readings: [] }); }
  }

  // GET /drift-intelligence/trends — parameter trend summary
  if (method === "GET" && path.endsWith("/trends")) {
    try {
      const r = await db.send(new QueryCommand({
        TableName: RDGS,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ScanIndexForward: true,
        Limit: 500,
      }));
      const byParam = {};
      for (const rdg of (r.Items || [])) {
        const k = rdg.parameter;
        if (!byParam[k]) byParam[k] = [];
        byParam[k].push({ ts: rdg.timestamp, v: rdg.value, asset: rdg.asset_id });
      }
      const trends = {};
      for (const [p, rdgs] of Object.entries(byParam)) {
        if (PARAM_RULES[p]) trends[p] = { rule: PARAM_RULES[p], ...analyzeTrend(rdgs), readings: rdgs.slice(-20) };
      }
      return res(200, { trends, parameters: Object.keys(PARAM_RULES) });
    } catch { return res(200, { trends: {}, parameters: Object.keys(PARAM_RULES) }); }
  }

  return res(404, { error: "Not found" });
}
