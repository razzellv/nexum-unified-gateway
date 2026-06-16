// ── fi-operational-dna Lambda ──────────────────────────────────────────────────
// FI Platform — Operational DNA Profile & Predictive Intelligence
//
// JWT-protected routes:
//   GET  /operational-dna              — cached profile (recomputes if stale > 24h)
//   POST /operational-dna/analyze      — force reanalysis, return fresh profile
//   GET  /operational-dna/patterns     — patterns from cached/fresh profile
//   GET  /operational-dna/predictions  — predictions from cached/fresh profile
//   GET  /operational-dna/risk-trajectory — risk_trajectory + failure_probability + reliability_index

import { DynamoDBClient }                                from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand,
         GetCommand }                                    from "@aws-sdk/lib-dynamodb";
import { randomUUID }                                    from "crypto";

const ddb      = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE    = process.env.TABLE    || "NexumOperationalDNA";
const WO_TABLE = process.env.WO_TABLE || "WorkOrders";
const VE_TABLE = process.env.VE_TABLE || "ViolationEvents";

const CACHE_SK  = "DNA#PROFILE#LATEST";
const STALE_MS  = 24 * 60 * 60 * 1000; // 24 hours

// ── Response helper ────────────────────────────────────────────────────────────
function res(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                 "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

// ── Request helpers ────────────────────────────────────────────────────────────
function getMethod(e)  { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)    { return e?.requestContext?.http?.path   || e?.rawPath    || e?.path || ""; }
function getClaims(e)  { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function getFid(c)     { return c?.["custom:facilityId"] || c?.["custom:orgId"] || "facility-001"; }

// ── Data fetchers ──────────────────────────────────────────────────────────────
async function fetchWorkOrders(fid) {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName:                 WO_TABLE,
      KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": "WO#" },
      ScanIndexForward:          false,
      Limit:                     500,
    }));
    return result.Items || [];
  } catch (err) {
    console.warn("fetchWorkOrders error:", err.message);
    return [];
  }
}

async function fetchViolations(fid) {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName:                 VE_TABLE,
      KeyConditionExpression:    "PK = :pk",
      ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      ScanIndexForward:          false,
      Limit:                     200,
    }));
    return result.Items || [];
  } catch (err) {
    console.warn("fetchViolations error:", err.message);
    return [];
  }
}

// ── Score calculators ──────────────────────────────────────────────────────────

/**
 * reliability_index (0-100)
 * Based on WO completion rate, PM rate, and avg resolution time
 */
function calcReliabilityIndex(wos) {
  if (!wos.length) return 75; // neutral default when no data

  const completed     = wos.filter(w => (w.status || "").toLowerCase() === "completed");
  const pmWos         = wos.filter(w => (w.type || "").toLowerCase().includes("pm") ||
                                        (w.type || "").toLowerCase().includes("preventive"));
  const completionRate = completed.length / wos.length;

  // PM rate: ratio of PM WOs to total
  const pmRate = pmWos.length / Math.max(wos.length, 1);

  // Average resolution time in days (completedAt - createdAt)
  let avgResolutionDays = 7; // fallback
  const resolved = completed.filter(w => w.completedAt && w.createdAt);
  if (resolved.length > 0) {
    const totalMs = resolved.reduce((acc, w) => {
      return acc + (new Date(w.completedAt) - new Date(w.createdAt));
    }, 0);
    avgResolutionDays = totalMs / resolved.length / 86400000;
  }

  // Resolution score: 0 days → 100, 30+ days → 0
  const resolutionScore = Math.max(0, Math.min(100, 100 - (avgResolutionDays / 30) * 100));

  const score = Math.round(
    completionRate * 50 +
    pmRate         * 20 +
    resolutionScore * 0.30
  );

  return Math.min(100, Math.max(0, score));
}

/**
 * failure_probability (0-100)
 * Based on recent critical WOs vs historical, violation rate trend
 */
function calcFailureProbability(wos, violations) {
  if (!wos.length && !violations.length) return 20;

  const now         = Date.now();
  const thirtyDays  = 30 * 86400000;
  const cutoffRecent = new Date(now - thirtyDays).toISOString();
  const cutoffOld    = new Date(now - 90 * 86400000).toISOString();

  const recentCritical = wos.filter(w =>
    (w.createdAt || "") >= cutoffRecent &&
    (["critical", "high"].includes((w.priority || "").toLowerCase()) ||
     ["critical", "high"].includes((w.status   || "").toLowerCase()))
  ).length;

  const historicalCritical = wos.filter(w =>
    (w.createdAt || "") >= cutoffOld &&
    (w.createdAt || "")  < cutoffRecent &&
    (["critical", "high"].includes((w.priority || "").toLowerCase()) ||
     ["critical", "high"].includes((w.status   || "").toLowerCase()))
  ).length;

  // Rate increase factor
  const historicalMonthlyRate = historicalCritical / 2; // 60 days ÷ 30
  const criticalRatio = historicalMonthlyRate > 0
    ? recentCritical / historicalMonthlyRate
    : recentCritical > 0 ? 2 : 1;

  // Violation contribution
  const recentViolations = violations.filter(v =>
    (v.timestamp || v.createdAt || "") >= cutoffRecent
  ).length;

  const criticalScore    = Math.min(60, recentCritical * 8);
  const trendScore       = Math.min(20, (criticalRatio - 1) * 10);
  const violationScore   = Math.min(20, recentViolations * 3);

  return Math.min(100, Math.max(0, Math.round(criticalScore + trendScore + violationScore)));
}

/**
 * operational_stability_index (0-100)
 * Based on month-to-month WO frequency variance (coefficient of variation)
 * Lower CV → higher stability
 */
function calcOperationalStabilityIndex(wos) {
  if (!wos.length) return 80;

  // Count WOs by calendar month (YYYY-MM)
  const monthCounts = {};
  for (const w of wos) {
    const ts = w.createdAt || "";
    if (ts.length >= 7) {
      const ym = ts.slice(0, 7); // "YYYY-MM"
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    }
  }

  const counts = Object.values(monthCounts);
  if (counts.length < 2) return 75;

  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  if (mean === 0) return 100;

  const variance = counts.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / counts.length;
  const stdDev   = Math.sqrt(variance);
  const cv       = stdDev / mean; // coefficient of variation

  // CV=0 → 100, CV=1 → 50, CV>=2 → 0
  const score = Math.max(0, Math.round(100 - cv * 50));
  return Math.min(100, score);
}

/**
 * maintenance_effectiveness_score (0-100)
 * Based on completion rate + recurrence ratio (lower recurrence = better)
 */
function calcMaintenanceEffectivenessScore(wos) {
  if (!wos.length) return 70;

  const completed     = wos.filter(w => (w.status || "").toLowerCase() === "completed").length;
  const completionRate = completed / wos.length;

  // Recurrence ratio: WOs with same equipmentId that appear more than once
  const equipCounts = {};
  for (const w of wos) {
    const eid = w.equipmentId || w.system || "";
    if (eid) equipCounts[eid] = (equipCounts[eid] || 0) + 1;
  }
  const recurringEquip = Object.values(equipCounts).filter(c => c > 1).length;
  const totalEquip     = Object.keys(equipCounts).length || 1;
  const recurrenceRatio = recurringEquip / totalEquip; // higher = worse

  const score = Math.round(
    completionRate    * 60 +
    (1 - recurrenceRatio) * 40
  );

  return Math.min(100, Math.max(0, score));
}

/**
 * risk_trajectory: 'improving' | 'stable' | 'degrading' | 'critical'
 * Compare last 30 days high/critical WOs vs previous 30 days
 */
function calcRiskTrajectory(wos) {
  const now   = Date.now();
  const cut30 = new Date(now - 30 * 86400000).toISOString();
  const cut60 = new Date(now - 60 * 86400000).toISOString();

  const isCriticalOrHigh = w =>
    ["critical", "high"].includes((w.priority || "").toLowerCase()) ||
    ["critical", "high"].includes((w.status   || "").toLowerCase());

  const last30 = wos.filter(w => (w.createdAt || "") >= cut30 && isCriticalOrHigh(w)).length;
  const prev30 = wos.filter(w =>
    (w.createdAt || "") >= cut60 &&
    (w.createdAt || "")  < cut30 &&
    isCriticalOrHigh(w)
  ).length;

  if (last30 >= 10)                                    return "critical";
  if (prev30 === 0 && last30 === 0)                    return "stable";
  if (prev30 === 0 && last30 > 0)                      return "degrading";
  const change = (last30 - prev30) / prev30;
  if (change > 0.30)                                   return "degrading";
  if (change < -0.20)                                  return "improving";
  return "stable";
}

// ── Pattern detection ──────────────────────────────────────────────────────────
function detectPatterns(wos, violations) {
  const now     = Date.now();
  const cut30   = new Date(now - 30 * 86400000).toISOString();
  const cut60   = new Date(now - 60 * 86400000).toISOString();
  const patterns = [];

  // 1. recurring_failure — top 5 systems with > 2 WOs
  const systemCounts = {};
  for (const w of wos) {
    const sys = w.system || w.equipmentType || w.equipmentId || "";
    if (sys) systemCounts[sys] = (systemCounts[sys] || 0) + 1;
  }
  const topSystems = Object.entries(systemCounts)
    .filter(([, c]) => c > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [system, count] of topSystems) {
    const dnaId = randomUUID();
    patterns.push({
      dna_id:             dnaId,
      pattern_type:       "recurring_failure",
      asset_id:           system,
      pattern_frequency:  count,
      trend_direction:    "increasing",
      confidence_score:   Math.min(95, 60 + count * 5),
      risk_score:         Math.min(100, 40 + count * 8),
      description:        `System "${system}" has ${count} work orders indicating recurring failures.`,
      recommended_action: `Schedule a root cause analysis for ${system} and consider a PM program.`,
      evidence:           wos.filter(w => (w.system || w.equipmentType || w.equipmentId || "") === system)
                             .slice(0, 5)
                             .map(w => ({ workOrderId: w.workOrderId || w.SK, title: w.title, createdAt: w.createdAt })),
    });
  }

  // 2. seasonal_trend — peak month by WO count
  const monthCounts = {};
  for (const w of wos) {
    const ts = w.createdAt || "";
    if (ts.length >= 7) {
      const month = ts.slice(5, 7); // "01"-"12"
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }
  }
  const sortedMonths = Object.entries(monthCounts).sort((a, b) => b[1] - a[1]);
  if (sortedMonths.length > 0) {
    const [peakMonth, peakCount] = sortedMonths[0];
    const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthName  = monthNames[parseInt(peakMonth, 10)] || peakMonth;
    patterns.push({
      dna_id:             randomUUID(),
      pattern_type:       "seasonal_trend",
      asset_id:           "",
      pattern_frequency:  peakCount,
      trend_direction:    "seasonal",
      confidence_score:   70,
      risk_score:         Math.min(80, 30 + peakCount * 3),
      description:        `Work order volume peaks in ${monthName} (${peakCount} WOs).`,
      recommended_action: `Pre-position resources and schedule preventive maintenance before ${monthName}.`,
      evidence:           [{ peak_month: peakMonth, peak_count: peakCount, all_months: Object.fromEntries(sortedMonths) }],
    });
  }

  // 3. human_factor — assignees with > 1 overdue task
  const now_iso = new Date().toISOString();
  const overdueCounts = {};
  for (const w of wos) {
    const isOverdue = w.dueDate && w.dueDate < now_iso &&
                      !["completed", "closed"].includes((w.status || "").toLowerCase());
    if (!isOverdue) continue;
    // assignedTo may be string or object
    let assignee = "";
    if (w.assignedTo && typeof w.assignedTo === "object") {
      assignee = w.assignedTo.id || w.assignedTo.name || w.assignedTo.email || JSON.stringify(w.assignedTo);
    } else {
      assignee = w.assignedTo || "";
    }
    if (assignee) overdueCounts[assignee] = (overdueCounts[assignee] || 0) + 1;
  }
  const overdueAssignees = Object.entries(overdueCounts).filter(([, c]) => c > 1);
  if (overdueAssignees.length > 0) {
    patterns.push({
      dna_id:             randomUUID(),
      pattern_type:       "human_factor",
      asset_id:           "",
      pattern_frequency:  overdueAssignees.length,
      trend_direction:    "stable",
      confidence_score:   75,
      risk_score:         Math.min(90, 30 + overdueAssignees.length * 10),
      description:        `${overdueAssignees.length} assignee(s) have more than 1 overdue task, indicating possible capacity issues.`,
      recommended_action: "Review workload distribution and consider reassigning or adding resources.",
      evidence:           overdueAssignees.map(([assignee, count]) => ({ assignee, overdue_count: count })),
    });
  }

  // 4. compliance_drift — recent 30d violations > previous 30d avg by > 30%
  const recentViolations = violations.filter(v => (v.timestamp || v.createdAt || "") >= cut30).length;
  const prevViolations   = violations.filter(v => {
    const ts = v.timestamp || v.createdAt || "";
    return ts >= cut60 && ts < cut30;
  }).length;

  const prevAvg = prevViolations; // 30-day window
  if (prevAvg > 0 && recentViolations > prevAvg * 1.30) {
    const drift = Math.round(((recentViolations - prevAvg) / prevAvg) * 100);
    patterns.push({
      dna_id:             randomUUID(),
      pattern_type:       "compliance_drift",
      asset_id:           "",
      pattern_frequency:  recentViolations,
      trend_direction:    "increasing",
      confidence_score:   80,
      risk_score:         Math.min(100, 50 + drift),
      description:        `Violations increased by ${drift}% in the last 30 days vs prior period (${recentViolations} vs ${prevAvg}).`,
      recommended_action: "Initiate a compliance audit and review recent inspection records.",
      evidence:           [{ recent_30d: recentViolations, previous_30d: prevAvg, drift_pct: drift }],
    });
  }

  return patterns;
}

// ── Prediction generation ──────────────────────────────────────────────────────
function generatePredictions(scores, patterns) {
  const predictions = [];

  // 1. failure_risk if failureProbability > 60
  if (scores.failure_probability > 60) {
    predictions.push({
      prediction_id:    randomUUID(),
      prediction_type:  "failure_risk",
      horizon:          "30_days",
      probability:      scores.failure_probability,
      confidence:       75,
      title:            "Elevated Failure Risk Detected",
      description:      `Failure probability is at ${scores.failure_probability}%. Immediate preventive action recommended.`,
      recommended_action: "Audit high-priority open work orders and escalate unresolved critical issues.",
      risk_level:       scores.failure_probability >= 80 ? "critical" : "high",
    });
  }

  // 2. capacity_risk if human_factor patterns exist
  const humanFactorPatterns = patterns.filter(p => p.pattern_type === "human_factor");
  if (humanFactorPatterns.length > 0) {
    predictions.push({
      prediction_id:    randomUUID(),
      prediction_type:  "capacity_risk",
      horizon:          "14_days",
      probability:      Math.min(90, 40 + humanFactorPatterns[0].risk_score),
      confidence:       70,
      title:            "Workforce Capacity Risk",
      description:      "Overdue task accumulation suggests maintenance staff may be at capacity.",
      recommended_action: "Review staffing levels and redistribute workload across available technicians.",
      risk_level:       "medium",
    });
  }

  // 3. seasonal_preparation if seasonal pattern detected
  const seasonalPatterns = patterns.filter(p => p.pattern_type === "seasonal_trend");
  if (seasonalPatterns.length > 0) {
    const sp = seasonalPatterns[0];
    predictions.push({
      prediction_id:    randomUUID(),
      prediction_type:  "seasonal_preparation",
      horizon:          "60_days",
      probability:      65,
      confidence:       sp.confidence_score,
      title:            "Seasonal Maintenance Surge Anticipated",
      description:      sp.description,
      recommended_action: sp.recommended_action,
      risk_level:       "low",
    });
  }

  // 4. trajectory_warning if degrading or critical
  if (scores.risk_trajectory === "degrading" || scores.risk_trajectory === "critical") {
    predictions.push({
      prediction_id:    randomUUID(),
      prediction_type:  "trajectory_warning",
      horizon:          "30_days",
      probability:      scores.risk_trajectory === "critical" ? 90 : 70,
      confidence:       80,
      title:            scores.risk_trajectory === "critical"
                          ? "Critical Risk Trajectory — Immediate Action Required"
                          : "Degrading Risk Trajectory",
      description:      `Operational risk trajectory is "${scores.risk_trajectory}". Critical and high-priority incidents are increasing.`,
      recommended_action: "Conduct an operational review and escalate to facility leadership immediately.",
      risk_level:       scores.risk_trajectory === "critical" ? "critical" : "high",
    });
  }

  return predictions;
}

// ── Root cause clusters ────────────────────────────────────────────────────────
function buildRootCauseClusters(wos) {
  const systemCounts = {};
  for (const w of wos) {
    const sys = w.system || w.equipmentType || w.equipmentId || "unknown";
    systemCounts[sys] = (systemCounts[sys] || 0) + 1;
  }
  const total = wos.length || 1;
  return Object.entries(systemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([system, count]) => ({
      system,
      wo_count: count,
      share_pct: Math.round((count / total) * 100),
    }));
}

// ── Full analysis engine ───────────────────────────────────────────────────────
async function runAnalysis(fid) {
  const [wos, violations] = await Promise.all([
    fetchWorkOrders(fid),
    fetchViolations(fid),
  ]);

  const reliabilityIndex              = calcReliabilityIndex(wos);
  const failureProbability            = calcFailureProbability(wos, violations);
  const operationalStabilityIndex     = calcOperationalStabilityIndex(wos);
  const maintenanceEffectivenessScore = calcMaintenanceEffectivenessScore(wos);
  const riskTrajectory                = calcRiskTrajectory(wos);

  const scores = {
    reliability_index:              reliabilityIndex,
    failure_probability:            failureProbability,
    operational_stability_index:    operationalStabilityIndex,
    maintenance_effectiveness_score: maintenanceEffectivenessScore,
    risk_trajectory:                riskTrajectory,
  };

  const patterns         = detectPatterns(wos, violations);
  const predictions      = generatePredictions(scores, patterns);
  const rootCauseClusters = buildRootCauseClusters(wos);

  const now = new Date().toISOString();

  const profile = {
    facility_id:               fid,
    generated_at:              now,
    data_points: {
      total_work_orders:       wos.length,
      total_violations:        violations.length,
    },
    scores,
    patterns,
    predictions,
    root_cause_clusters:       rootCauseClusters,
  };

  // Cache to DynamoDB
  try {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:         `FACILITY#${fid}`,
        SK:         CACHE_SK,
        ...profile,
        cachedAt:   now,
      },
    }));
  } catch (cacheErr) {
    console.warn("runAnalysis - cache write error:", cacheErr.message);
  }

  return profile;
}

// ── Load cached profile (recompute if stale or missing) ───────────────────────
async function getOrComputeProfile(fid) {
  try {
    const cached = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key:       { PK: `FACILITY#${fid}`, SK: CACHE_SK },
    }));

    if (cached.Item) {
      const cachedAt = cached.Item.cachedAt || cached.Item.generated_at || "";
      const ageMs    = cachedAt ? Date.now() - new Date(cachedAt).getTime() : Infinity;
      if (ageMs < STALE_MS) {
        return { profile: cached.Item, fromCache: true };
      }
    }
  } catch (err) {
    console.warn("getOrComputeProfile - cache read error:", err.message);
  }

  const profile = await runAnalysis(fid);
  return { profile, fromCache: false };
}

// ── Main handler ───────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return res(200, {});

  const claims = getClaims(event);
  if (!claims) return res(401, { message: "Unauthorized" });

  const fid = getFid(claims);

  try {
    // POST /operational-dna/analyze — force fresh reanalysis
    if (method === "POST" && (path.endsWith("/operational-dna/analyze") || path.includes("/operational-dna/analyze"))) {
      const profile = await runAnalysis(fid);
      return res(200, { ...profile, fromCache: false });
    }

    // GET /operational-dna/patterns
    if (method === "GET" && (path.endsWith("/operational-dna/patterns") || path.includes("/operational-dna/patterns"))) {
      const { profile } = await getOrComputeProfile(fid);
      return res(200, {
        facility_id:    fid,
        generated_at:   profile.generated_at,
        patterns:       profile.patterns || [],
        pattern_count:  (profile.patterns || []).length,
      });
    }

    // GET /operational-dna/predictions
    if (method === "GET" && (path.endsWith("/operational-dna/predictions") || path.includes("/operational-dna/predictions"))) {
      const { profile } = await getOrComputeProfile(fid);
      return res(200, {
        facility_id:      fid,
        generated_at:     profile.generated_at,
        predictions:      profile.predictions || [],
        prediction_count: (profile.predictions || []).length,
      });
    }

    // GET /operational-dna/risk-trajectory
    if (method === "GET" && (path.endsWith("/operational-dna/risk-trajectory") || path.includes("/operational-dna/risk-trajectory"))) {
      const { profile } = await getOrComputeProfile(fid);
      const scores = profile.scores || {};
      return res(200, {
        facility_id:         fid,
        generated_at:        profile.generated_at,
        risk_trajectory:     scores.risk_trajectory,
        failure_probability: scores.failure_probability,
        reliability_index:   scores.reliability_index,
      });
    }

    // GET /operational-dna — cached or fresh profile
    if (method === "GET" && (path.endsWith("/operational-dna") || path.includes("/operational-dna?"))) {
      const { profile, fromCache } = await getOrComputeProfile(fid);
      return res(200, { ...profile, fromCache });
    }

    return res(404, { message: "Route not found", path, method });
  } catch (err) {
    console.error("fi-operational-dna error:", err);
    return res(500, { message: "Internal error", detail: err.message });
  }
};
