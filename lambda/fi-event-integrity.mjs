// Event-to-Record Integrity Engine™
// Measures fidelity of operational records across the 7-step integrity chain:
//   Event → Observation → Capture → Documentation → Storage → Reporting → Decision

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

const TABLE      = process.env.TABLE      || "NexumEventIntegrity";
const SNAP_TABLE = process.env.SNAP_TABLE || "NexumIntegritySnapshots";
const WO_TABLE   = process.env.WO_TABLE   || "WorkOrders";
const VE_TABLE   = process.env.VE_TABLE   || "ViolationEvents";
const LOG_TABLE  = process.env.LOG_TABLE  || "FacilityLogs-v2";

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

const getClaims = (e) => {
  try { return e.requestContext?.authorizer?.jwt?.claims || {}; }
  catch { return {}; }
};

const getFid = (claims) =>
  claims["custom:facilityId"] || claims["custom:orgId"] || "facility-001";

const safeStr = (v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v || ""));

// ── Scoring algorithms ─────────────────────────────────────────────────────

/**
 * Infer hours elapsed between event occurrence and record creation.
 * Returns null if either timestamp is unavailable.
 */
function captureLatenycHours(record) {
  const eventTs = record.event_time || record.occurred_at || record.scheduled_date || record.date;
  const createTs = record.createdAt  || record.created_at;
  if (!eventTs || !createTs) return null;
  try {
    const diff = (new Date(createTs) - new Date(eventTs)) / 3_600_000;
    return diff < 0 ? 0 : diff;  // negative = record pre-dated event; treat as immediate
  } catch { return null; }
}

/**
 * Capture Latency Score (0-100)
 * Measures elapsed time between event occurrence and record creation.
 */
function scoreCaptureLatency(hours) {
  if (hours === null || hours === undefined) return 45; // unknown = penalised but not catastrophic
  if (hours <= 1)   return 100;
  if (hours <= 4)   return 88;
  if (hours <= 24)  return 70;
  if (hours <= 72)  return 48;
  if (hours <= 168) return 25;
  return 8;
}

/**
 * Evidence Completeness Score (0-100)
 * Measures quality and quantity of supporting evidence attached to the record.
 */
function scoreEvidenceCompleteness(record) {
  let earned = 0;
  let possible = 0;

  const add = (cond, pts) => { possible += pts; if (cond) earned += pts; };

  // Timestamp of event (not just record creation)
  add(!!(record.event_time || record.occurred_at || record.date), 14);
  // Asset / equipment identification
  add(!!(record.assetId || record.equipment_id || record.asset_id || record.equipmentId), 12);
  // Physical location
  add(!!(record.location || record.building || record.area || record.room || record.floor), 12);
  // Responsible person / witness
  add(!!(record.assignedTo || record.assigned_to || record.reporter || record.reported_by || record.technician), 10);
  // Photo / image attachments
  const attachCount = Array.isArray(record.attachments) ? record.attachments.length
                    : (parseInt(record.attachment_count, 10) || 0);
  add(attachCount > 0, 14);
  // Video evidence
  add(Array.isArray(record.videos) && record.videos.length > 0, 8);
  // Measurements / sensor readings
  add(!!(record.measurements || record.readings || record.temperature ||
         record.pressure || record.level || record.value), 10);
  // Substantive description / notes (≥ 40 chars)
  const desc = safeStr(record.description || record.notes || record.summary || "");
  add(desc.length >= 40, 10);
  // Corroborating documentation (sign-off, secondary review, linked records)
  add(!!(record.reviewed_by || record.verified_by || record.approved_by ||
         Array.isArray(record.linked_records)), 10);

  return possible > 0 ? Math.round((earned / possible) * 100) : 50;
}

/**
 * Event Integrity Score (0-100)
 * Measures fidelity between the actual event and the documented record.
 */
function scoreEventIntegrity(record, captureHours) {
  let score = 100;

  // Capture delay penalises direct fidelity
  if (captureHours !== null) {
    if      (captureHours > 168) score -= 28;
    else if (captureHours > 72)  score -= 18;
    else if (captureHours > 24)  score -= 10;
    else if (captureHours > 8)   score -= 4;
  }

  // Missing critical identification fields
  if (!record.assetId && !record.equipment_id && !record.asset_id && !record.equipmentId) score -= 10;
  if (!record.location && !record.building && !record.area) score -= 10;
  if (!record.event_time && !record.occurred_at && !record.date) score -= 14;

  // Shallow documentation
  const desc = safeStr(record.description || record.notes || record.summary || "");
  if (desc.length < 10) score -= 20;
  else if (desc.length < 30) score -= 10;

  // Open/pending records are structurally incomplete
  if (record.status === "open" || record.status === "pending") score -= 4;

  return Math.max(0, score);
}

/**
 * Assumption Risk Score (0-100)
 * 100 = no assumption risk; lower = greater likelihood of reconstruction / inference.
 */
function scoreAssumptionRisk(record, captureHours) {
  let score = 100;

  // Significant delay → likely memory reconstruction
  if (captureHours !== null) {
    if      (captureHours > 168) score -= 32;
    else if (captureHours > 72)  score -= 22;
    else if (captureHours > 24)  score -= 14;
    else if (captureHours > 8)   score -= 6;
  } else {
    score -= 14; // unknown latency = uncertain
  }

  // Single-source documentation
  const evidenceSources = [
    (Array.isArray(record.attachments) && record.attachments.length > 0),
    (Array.isArray(record.videos) && record.videos.length > 0),
    !!(record.measurements || record.readings),
    !!(record.assignedTo || record.reporter),
    !!(record.reviewed_by || record.verified_by),
  ].filter(Boolean).length;
  if (evidenceSources <= 1) score -= 18;
  else if (evidenceSources === 2) score -= 6;

  // Vague / terse description
  const desc = safeStr(record.description || record.notes || "");
  if (desc.length < 20) score -= 18;

  return Math.max(0, score);
}

/**
 * Documentation Confidence Score (0-100)
 * Composite of event integrity, evidence completeness, and assumption risk.
 */
function scoreDocumentationConfidence(ei, ec, ar) {
  return Math.round(ei * 0.35 + ec * 0.35 + ar * 0.30);
}

/**
 * Decision Defensibility Score (0-100)
 * Measures whether the record can support audits, investigations, or executive decisions.
 */
function scoreDecisionDefensibility(record, scores) {
  let score = scores.documentation_confidence * 0.40
            + scores.evidence_completeness    * 0.30
            + scores.capture_latency          * 0.20;

  // Secondary review / sign-off adds defensibility
  if (record.reviewed_by || record.verified_by || record.approved_by) score += 8;
  if (record.status === "completed" || record.status === "closed")     score += 4;

  return Math.min(100, Math.round(score));
}

function riskLevel(score) {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  if (score >= 40) return "orange";
  return "red";
}

/**
 * Generate prioritised recommended actions based on score weaknesses.
 */
function buildActions(scores, captureHours) {
  const actions = [];

  if (scores.capture_latency < 50)
    actions.push({
      priority: "high",
      category: "timeliness",
      action: "Implement real-time mobile capture",
      detail: "Records are being created more than 24 hours after events. Deploy mobile forms to capture events at the moment they occur.",
    });

  if (scores.evidence_completeness < 55)
    actions.push({
      priority: "high",
      category: "evidence",
      action: "Enforce mandatory evidence fields",
      detail: "Most records lack photos, measurements, or location data. Set required fields on work order and violation forms.",
    });

  if (scores.assumption_risk < 55)
    actions.push({
      priority: "high",
      category: "integrity",
      action: "Review retroactively-created records",
      detail: captureHours !== null && captureHours > 24
        ? `Records averaged ${Math.round(captureHours)}h post-event. Verify accuracy with direct witnesses before relying on these for compliance.`
        : "High assumption risk detected. Require direct-observation confirmation on delayed records.",
    });

  if (scores.event_integrity < 60)
    actions.push({
      priority: "medium",
      category: "fidelity",
      action: "Enrich records with direct evidence",
      detail: "Records frequently lack event timestamps, asset IDs, or location. These fields are required for legal and audit defensibility.",
    });

  if (scores.decision_defensibility < 50)
    actions.push({
      priority: "high",
      category: "defensibility",
      action: "Require secondary review on critical records",
      detail: "Records cannot currently support audits or investigations. Add a reviewer sign-off step to the documentation workflow.",
    });

  if (scores.documentation_confidence < 60)
    actions.push({
      priority: "medium",
      category: "confidence",
      action: "Standardise documentation templates",
      detail: "Inconsistent record depth detected. Use structured forms with required sections to improve documentation confidence.",
    });

  return actions.slice(0, 6);
}

/**
 * Score a single record and return all 6 scores + metadata.
 */
function scoreRecord(record, rtype) {
  const captureHours = captureLatenycHours(record);

  const capture_latency          = scoreCaptureLatency(captureHours);
  const evidence_completeness    = scoreEvidenceCompleteness(record);
  const event_integrity          = scoreEventIntegrity(record, captureHours);
  const assumption_risk          = scoreAssumptionRisk(record, captureHours);
  const documentation_confidence = scoreDocumentationConfidence(event_integrity, evidence_completeness, assumption_risk);
  const decision_defensibility   = scoreDecisionDefensibility(record, {
    documentation_confidence, evidence_completeness, capture_latency,
  });

  const composite = Math.round(
    event_integrity          * 0.20 +
    capture_latency          * 0.15 +
    evidence_completeness    * 0.20 +
    assumption_risk          * 0.15 +
    documentation_confidence * 0.15 +
    decision_defensibility   * 0.15,
  );

  return {
    scores: {
      event_integrity, capture_latency, evidence_completeness,
      assumption_risk, documentation_confidence, decision_defensibility, composite,
    },
    capture_latency_hours: captureHours,
    integrity_risk_level:  riskLevel(composite),
  };
}

// ── Data layer ──────────────────────────────────────────────────────────────

async function queryTable(tableName, pk, limit = 200) {
  try {
    const r = await db.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": pk },
      ScanIndexForward: false,
      Limit: limit,
    }));
    return r.Items || [];
  } catch { return []; }
}

// ── Full audit ──────────────────────────────────────────────────────────────

async function runAudit(fid) {
  const pk = `FACILITY#${fid}`;

  const [wos, ves, logs] = await Promise.all([
    queryTable(WO_TABLE,  pk, 200),
    queryTable(VE_TABLE,  pk, 200),
    queryTable(LOG_TABLE, pk, 100),
  ]);

  const allRecords = [
    ...wos.map(r  => ({ ...r, _rtype: "work_order"    })),
    ...ves.map(r  => ({ ...r, _rtype: "violation"      })),
    ...logs.map(r => ({ ...r, _rtype: "facility_log"   })),
  ];

  if (allRecords.length === 0) {
    return emptyResult();
  }

  const dist   = { green: 0, yellow: 0, orange: 0, red: 0 };
  const sums   = {
    event_integrity: 0, capture_latency: 0, evidence_completeness: 0,
    assumption_risk: 0, documentation_confidence: 0, decision_defensibility: 0,
  };
  const allCapHours = [];
  const recentRecords = [];
  const now = new Date().toISOString();

  for (const record of allRecords) {
    const { scores, capture_latency_hours, integrity_risk_level } = scoreRecord(record, record._rtype);

    dist[integrity_risk_level]++;
    for (const k of Object.keys(sums)) sums[k] += scores[k];
    if (capture_latency_hours !== null) allCapHours.push(capture_latency_hours);

    const recSK = record.SK || randomUUID();
    recentRecords.push({
      record_type: record._rtype,
      record_sk: recSK,
      record_title: safeStr(record.title || record.type || record.violation_type || record.log_type || recSK).slice(0, 60),
      ...scores,
      integrity_risk_level,
      capture_latency_hours,
    });

    try {
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK: pk,
          SK: `INTEGRITY#${record._rtype.toUpperCase()}#${recSK}`,
          record_type: record._rtype,
          record_sk: recSK,
          ...scores,
          integrity_risk_level,
          capture_latency_hours,
          scored_at: now,
          ttl: Math.floor(Date.now() / 1000) + 90 * 86400,
        },
      }));
    } catch { /* best-effort */ }
  }

  const n = allRecords.length;
  const avgScores = {};
  for (const k of Object.keys(sums)) avgScores[k] = Math.round(sums[k] / n);
  avgScores.composite = Math.round(
    avgScores.event_integrity          * 0.20 +
    avgScores.capture_latency          * 0.15 +
    avgScores.evidence_completeness    * 0.20 +
    avgScores.assumption_risk          * 0.15 +
    avgScores.documentation_confidence * 0.15 +
    avgScores.decision_defensibility   * 0.15,
  );

  const avgCapHours = allCapHours.length
    ? Math.round(allCapHours.reduce((a, b) => a + b, 0) / allCapHours.length * 10) / 10
    : null;

  const summary = {
    records_scored:      n,
    scores:              avgScores,
    risk_distribution:   dist,
    integrity_risk_level: riskLevel(avgScores.composite),
    avg_capture_latency_hours: avgCapHours,
    recommended_actions: buildActions(avgScores, avgCapHours),
    scored_at:           now,
    recent_records:      recentRecords.slice(0, 25),
    data_points: {
      work_orders:    wos.length,
      violations:     ves.length,
      facility_logs:  logs.length,
    },
  };

  try {
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: pk,
        SK: "SUMMARY#LATEST",
        ...summary,
        ttl: Math.floor(Date.now() / 1000) + 24 * 3600,
      },
    }));
  } catch { /* best-effort */ }

  // Write daily snapshot for trend tracking
  const today = now.slice(0, 10);
  try {
    await db.send(new PutCommand({
      TableName: SNAP_TABLE,
      Item: {
        PK: pk,
        SK: `SNAPSHOT#${today}`,
        scores: avgScores,
        integrity_risk_level: summary.integrity_risk_level,
        records_scored: n,
        risk_distribution: dist,
        date: today,
        ttl: Math.floor(Date.now() / 1000) + 365 * 86400,
      },
    }));
  } catch { /* best-effort */ }

  return summary;
}

function emptyResult() {
  const zero = {
    event_integrity: 0, capture_latency: 0, evidence_completeness: 0,
    assumption_risk: 0, documentation_confidence: 0, decision_defensibility: 0, composite: 0,
  };
  return {
    records_scored: 0,
    scores: zero,
    risk_distribution: { green: 0, yellow: 0, orange: 0, red: 0 },
    integrity_risk_level: "red",
    avg_capture_latency_hours: null,
    recommended_actions: [],
    scored_at: new Date().toISOString(),
    recent_records: [],
    data_points: { work_orders: 0, violations: 0, facility_logs: 0 },
  };
}

// ── Lambda handler ──────────────────────────────────────────────────────────

export async function handler(event) {
  const method = getMethod(event);
  const path   = getPath(event);
  if (method === "OPTIONS") return res(200, {});

  const claims = getClaims(event);
  const fid    = getFid(claims);
  const pk     = `FACILITY#${fid}`;

  // ── GET /event-integrity — cached summary or auto-run ──────────────────
  if (method === "GET" && (path === "/event-integrity" || path.endsWith("/event-integrity"))) {
    try {
      const cached = await db.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: "SUMMARY#LATEST" } }));
      if (cached.Item) return res(200, cached.Item);
    } catch { /* miss */ }
    return res(200, await runAudit(fid));
  }

  // ── POST /event-integrity/audit — force re-audit ───────────────────────
  if (method === "POST" && path.endsWith("/audit")) {
    return res(200, await runAudit(fid));
  }

  // ── GET /event-integrity/records — paginated scored records ───────────
  if (method === "GET" && path.endsWith("/records")) {
    try {
      const r = await db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :pfx)",
        ExpressionAttributeValues: { ":pk": pk, ":pfx": "INTEGRITY#" },
        ScanIndexForward: false,
        Limit: 50,
      }));
      return res(200, { records: r.Items || [] });
    } catch { return res(200, { records: [] }); }
  }

  // ── GET /event-integrity/trends — daily snapshots ─────────────────────
  if (method === "GET" && path.endsWith("/trends")) {
    try {
      const r = await db.send(new QueryCommand({
        TableName: SNAP_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :pfx)",
        ExpressionAttributeValues: { ":pk": pk, ":pfx": "SNAPSHOT#" },
        ScanIndexForward: true,
        Limit: 90,
      }));
      return res(200, { trends: (r.Items || []).slice(-30) });
    } catch { return res(200, { trends: [] }); }
  }

  // ── GET /event-integrity/records/{type} — filter by record type ────────
  if (method === "GET" && path.includes("/records/")) {
    const rtype = path.split("/records/")[1]?.replace(/-/g, "_").toUpperCase() || "";
    try {
      const r = await db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :pfx)",
        ExpressionAttributeValues: { ":pk": pk, ":pfx": `INTEGRITY#${rtype}#` },
        ScanIndexForward: false,
        Limit: 50,
      }));
      return res(200, { records: r.Items || [] });
    } catch { return res(200, { records: [] }); }
  }

  return res(404, { error: "Not found" });
}
