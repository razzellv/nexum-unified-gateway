// ── fi-system-violations Lambda ───────────────────────────────────────────────
// FI Platform — System Violations & Resolution Intelligence
//
// JWT-protected routes:
//   GET    /system-violations              — list (supports ?status=&severity=&limit=)
//   POST   /system-violations              — create new violation
//   GET    /system-violations/stats        — aggregate stats
//   GET    /system-violations/{id}         — get single violation by id
//   PATCH  /system-violations/{id}         — update / advance phase

import { DynamoDBClient }                       from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand,
         QueryCommand }                         from "@aws-sdk/lib-dynamodb";
import { randomUUID, createHash }               from "crypto";

const ddb       = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE     = process.env.TABLE     || "NexumSystemViolations";
const OBS_TABLE = process.env.OBS_TABLE || "ObservationJournal";
const DC_TABLE  = process.env.DC_TABLE  || "NexumDCVault";

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(statusCode, body) {
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

function getMethod(e)  { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)    { return e?.requestContext?.http?.path   || e?.path       || ""; }
function getClaims(e)  {
  return e?.requestContext?.authorizer?.jwt?.claims
      || e?.requestContext?.authorizer?.claims
      || null;
}
function facilityId(c) { return c?.["custom:facilityId"] || c?.["custom:orgId"] || "facility-001"; }
function actorEmail(c) { return c?.email || c?.sub || "unknown"; }
function actorRole(c)  { return c?.["custom:role"] || "staff"; }

function parseBody(event) {
  let raw = event.body || "{}";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
  try { return JSON.parse(raw); } catch { return {}; }
}

function pathSegments(path) {
  return path.replace(/^\/prod/, "").split("/").filter(Boolean);
}

function ttlOneYear() {
  return Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
}

// ── Scoring Functions ─────────────────────────────────────────────────────────
function computeViolationScore(item) {
  const sevPts  = { critical: 40, high: 25, medium: 15, low: 5 };
  const priPts  = { critical: 30, high: 20, medium: 10, low: 5 };
  const sev     = (item.severity  || "low").toLowerCase();
  const pri     = (item.priority  || "low").toLowerCase();
  const created = item.createdAt ? new Date(item.createdAt) : new Date();
  const ageDays = Math.max(0, (Date.now() - created.getTime()) / 86400000);
  const ageBonus = Math.min(20, ageDays * 0.5);
  return Math.min(100, (sevPts[sev] ?? 5) + (priPts[pri] ?? 5) + ageBonus);
}

function computeRiskScore(item) {
  const sevBase = { critical: 40, high: 30, medium: 20, low: 10 };
  const sev = (item.severity || "low").toLowerCase();
  let score = sevBase[sev] ?? 10;
  if (item.safetyImpact     && String(item.safetyImpact).trim())     score += 20;
  if (item.complianceImpact && String(item.complianceImpact).trim()) score += 20;
  if (item.energyImpact     && String(item.energyImpact).trim())     score += 10;
  return Math.min(100, score);
}

function computeDefensibilityScore(item) {
  let score = 0;
  if (item.observation || item.observationCustom) score += 15;
  if (item.assumptions  && item.assumptions.length > 0) score += 15;
  if (item.observedAt)   score += 10;
  if (item.reportedBy)   score += 10;
  if (item.rootCauseCategory) score += 20;
  if (item.wasAssumptionCorrect) score += 10;
  if (item.lessonsLearned && String(item.lessonsLearned).trim()) score += 10;
  if (item.workOrderId)  score += 5;
  if (item.authorizedBy && String(item.authorizedBy).trim()) score += 5;
  return Math.min(100, score);
}

function computeRootCauseConfidence(item) {
  let score = 0;
  if (item.actualIssueFound   && String(item.actualIssueFound).trim())   score += 30;
  if (item.rootCauseCategory  && String(item.rootCauseCategory).trim())  score += 20;
  if (item.rootCauseDetail    && String(item.rootCauseDetail).trim())    score += 20;
  if (item.wasAssumptionCorrect === "yes")       score += 30;
  else if (item.wasAssumptionCorrect === "partially") score += 15;
  else if (item.wasAssumptionCorrect === "no")   score += 5;
  return Math.min(100, score);
}

function computeAllScores(item) {
  return {
    violationScore:       Math.round(computeViolationScore(item)),
    riskScore:            Math.round(computeRiskScore(item)),
    defensibilityScore:   Math.round(computeDefensibilityScore(item)),
    rootCauseConfidence:  Math.round(computeRootCauseConfidence(item)),
  };
}

// ── Observation Journal cross-write ──────────────────────────────────────────
async function writeJournalEntry(item, actor, actRole, phase) {
  const now = new Date().toISOString();
  const journalId = `sviol-${randomUUID()}`;
  const facilId   = item.facilityId || "facility-001";
  const record = {
    PK:           `FACILITY#${facilId}`,
    SK:           `OBS#${now}#${journalId}`,
    id:           journalId,
    facilityId:   facilId,
    sourceId:     item.id,
    sourceType:   "system_violation",
    phase,
    observation:  item.observation || item.observationCustom || "",
    reportedBy:   actor,
    personnel:    item.timeline?.slice(-1)?.[0]?.personnel || [],
    assumptions:  item.assumptions || [],
    severity:     item.severity    || "low",
    equipment:    item.equipment   || "",
    building:     item.building    || "",
    area:         item.area        || "",
    createdAt:    now,
    TTL:          ttlOneYear(),
  };
  await ddb.send(new PutCommand({ TableName: OBS_TABLE, Item: record }))
    .catch(err => console.warn("[SystemViolations] ObservationJournal write failed:", err));
}

// ── DC Vault cross-write ─────────────────────────────────────────────────────
const DC_SIGNAL_TYPE_MAP = {
  open:          "observation",
  investigating: "assessment",
  authorized:    "authorization",
  resolved:      "execution",
  verified:      "outcome",
  closed:        "lessons_learned",
};

async function writeDCVaultEntry(item, actor, actRole, phase, isNew) {
  const now = new Date().toISOString();
  const fid = item.facilityId || "facility-001";

  // On new violation: create chain + observation signal
  if (isNew) {
    const chainId = randomUUID();
    const sigId   = randomUUID();
    const raw     = item.observation || item.observationCustom || "";
    const cHash   = createHash("sha256").update(`${raw}||${actor}||${item.observedAt || now}`).digest("hex");
    const lHash   = createHash("sha256").update(`${cHash}||GENESIS`).digest("hex");

    const chain = {
      PK: `FACILITY#${fid}`, SK: `CHAIN#${now}#${chainId}`,
      id: chainId, facilityId: fid,
      title: `${item.observation || item.observationCustom || "Violation"} — ${item.equipment || ""}`.trim(),
      sourceType: "system_violation", sourceId: item.id,
      phases: { observation: sigId }, signalCount: 1,
      headHash: lHash, lastSignalId: sigId,
      metrics: { knowledgePreservationScore: 14, authorizationQuality: 0, assessmentAccuracy: null, decisionAccuracyRate: null, repeatFailureRisk: 0, admissibilityRate: 0 },
      admissibilityVerified: false, status: "active",
      createdAt: now, updatedAt: now, createdBy: actor, TTL: ttlOneYear(),
    };
    const signal = {
      PK: `FACILITY#${fid}`, SK: `SIG#${now}#${sigId}`,
      id: sigId, facilityId: fid, chainId,
      signalType: "observation", sourceType: "system_violation", sourceId: item.id,
      rawContent: raw, actor, actorRole: actRole,
      recordedAt: item.observedAt || now,
      assetName: item.equipment || "", building: item.building || "", area: item.area || "",
      contentHash: cHash, prevSignalId: null, prevChainHash: null, chainHash: lHash,
      normalized: {
        assetCategory: "Facility Equipment", riskCategory: item.safetyImpact ? "Safety" : item.complianceImpact ? "Compliance" : "Operational",
        violationType: item.observation || null, workOrderType: null, complianceCategory: null,
      },
      interpretation: null, assessmentOutcomeMatch: null,
      admissibilityStatus: "normalized",
      createdAt: now, TTL: ttlOneYear(),
    };
    // Store dcChainId on violation so subsequent phases can find it
    item.dcChainId = chainId;
    await ddb.send(new PutCommand({ TableName: DC_TABLE, Item: chain })).catch(() => {});
    await ddb.send(new PutCommand({ TableName: DC_TABLE, Item: signal })).catch(() => {});
    return;
  }

  // On phase transition: add signal to existing chain
  if (!item.dcChainId) return;
  const signalType = DC_SIGNAL_TYPE_MAP[phase];
  if (!signalType) return;

  const sigId   = randomUUID();
  const raw     = `${phase.toUpperCase()} — ${item.howResolved || item.authorizationNote || item.verificationNotes || item.lessonsLearned || phase}`;
  const prevHash = item.dcHeadHash || "GENESIS";
  const cHash   = createHash("sha256").update(`${raw}||${actor}||${now}`).digest("hex");
  const lHash   = createHash("sha256").update(`${cHash}||${prevHash}`).digest("hex");

  const signal = {
    PK: `FACILITY#${fid}`, SK: `SIG#${now}#${sigId}`,
    id: sigId, facilityId: fid, chainId: item.dcChainId,
    signalType, sourceType: "system_violation", sourceId: item.id,
    rawContent: raw, actor, actorRole: actRole, recordedAt: now,
    assetName: item.equipment || "", building: item.building || "", area: item.area || "",
    contentHash: cHash, prevSignalId: item.dcLastSignalId || null, prevChainHash: prevHash, chainHash: lHash,
    normalized: {
      assetCategory: "Facility Equipment", riskCategory: "Operational",
      violationType: null, workOrderType: phase === "resolved" ? "Corrective Maintenance" : null, complianceCategory: null,
    },
    interpretation: null,
    assessmentOutcomeMatch: signalType === "outcome" ? (item.wasAssumptionCorrect || null) : null,
    admissibilityStatus: "normalized",
    createdAt: now, TTL: ttlOneYear(),
  };
  item.dcHeadHash     = lHash;
  item.dcLastSignalId = sigId;
  await ddb.send(new PutCommand({ TableName: DC_TABLE, Item: signal })).catch(() => {});
}

// ── Status phase ordering ─────────────────────────────────────────────────────
const STATUS_ORDER = ["open", "investigating", "wo_created", "in_progress", "resolved", "verified", "authorized", "closed"];

function nextStatus(current) {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1 || idx === STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

// ── Query all items for a facility ───────────────────────────────────────────
async function queryFacility(fid, filters = {}) {
  const params = {
    TableName:                TABLE,
    KeyConditionExpression:   "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk":     `FACILITY#${fid}`,
      ":prefix": "SVIOL#",
    },
    ScanIndexForward: false,
  };
  if (filters.limit) params.Limit = Math.min(Number(filters.limit), 200);

  const result = await ddb.send(new QueryCommand(params));
  let items = result.Items || [];

  if (filters.status && filters.status !== "all") {
    items = items.filter(i => i.status === filters.status);
  }
  if (filters.severity && filters.severity !== "all") {
    items = items.filter(i => (i.severity || "").toLowerCase() === filters.severity.toLowerCase());
  }
  return items;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid   = facilityId(claims);
  const actor = actorEmail(claims);
  const role  = actorRole(claims);
  const segs  = pathSegments(path);
  // segs[0] === "system-violations"
  const id    = segs.length >= 2 && segs[1] !== "stats" ? segs[1] : null;
  const isStats = segs.length >= 2 && segs[1] === "stats";

  const qs = event.queryStringParameters || {};

  // ── GET /system-violations ─────────────────────────────────────────────────
  if (method === "GET" && !id && !isStats) {
    try {
      const items = await queryFacility(fid, {
        status:   qs.status,
        severity: qs.severity,
        limit:    qs.limit,
      });
      return json(200, { violations: items, count: items.length });
    } catch (err) {
      console.error("[SystemViolations] GET list error:", err);
      return json(500, { message: "Failed to fetch violations" });
    }
  }

  // ── GET /system-violations/stats ───────────────────────────────────────────
  if (method === "GET" && isStats) {
    try {
      const items = await queryFacility(fid, {});

      const byStatus = { open: 0, investigating: 0, wo_created: 0, in_progress: 0, resolved: 0, verified: 0, authorized: 0, closed: 0 };
      let critical = 0;
      let pendingRca = 0;
      const resolutionDays = [];
      const observationCounts = {};
      const rootCauseCounts   = {};
      const assumptionAccuracy = { yes: 0, partially: 0, no: 0, total: 0 };

      for (const item of items) {
        const st = item.status || "open";
        if (byStatus[st] !== undefined) byStatus[st]++;
        if ((item.severity || "").toLowerCase() === "critical") critical++;
        if ((st === "in_progress" || st === "resolved") && !item.rootCauseCategory) pendingRca++;
        if (st === "resolved" && item.resolvedAt && item.createdAt) {
          const days = (new Date(item.resolvedAt) - new Date(item.createdAt)) / 86400000;
          if (days >= 0) resolutionDays.push(days);
        }
        const obs = item.observation || item.observationCustom || "";
        if (obs) observationCounts[obs] = (observationCounts[obs] || 0) + 1;
        if (item.rootCauseCategory) {
          rootCauseCounts[item.rootCauseCategory] = (rootCauseCounts[item.rootCauseCategory] || 0) + 1;
        }
        if (item.wasAssumptionCorrect) {
          const wac = item.wasAssumptionCorrect;
          if (wac === "yes" || wac === "partially" || wac === "no") {
            assumptionAccuracy[wac]++;
            assumptionAccuracy.total++;
          }
        }
      }

      const avgResolutionDays = resolutionDays.length
        ? Math.round((resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length) * 10) / 10
        : null;

      const topObservations = Object.entries(observationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([obs, cnt]) => ({ obs, cnt }));

      const topRootCauses = Object.entries(rootCauseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, cnt]) => ({ cat, cnt }));

      return json(200, {
        total:             items.length,
        byStatus,
        critical,
        pendingRca,
        avgResolutionDays,
        topObservations,
        topRootCauses,
        assumptionAccuracy: assumptionAccuracy.total > 0 ? assumptionAccuracy : null,
      });
    } catch (err) {
      console.error("[SystemViolations] GET stats error:", err);
      return json(500, { message: "Failed to compute stats" });
    }
  }

  // ── GET /system-violations/{id} ────────────────────────────────────────────
  if (method === "GET" && id) {
    try {
      const items = await queryFacility(fid, {});
      const found = items.find(i => i.id === id);
      if (!found) return json(404, { message: "Violation not found" });
      return json(200, { violation: found });
    } catch (err) {
      console.error("[SystemViolations] GET single error:", err);
      return json(500, { message: "Failed to fetch violation" });
    }
  }

  // ── POST /system-violations ────────────────────────────────────────────────
  if (method === "POST" && !id) {
    try {
      const b       = parseBody(event);
      const now     = new Date().toISOString();
      const newId   = randomUUID();
      const reportedBy     = b.reportedBy     || actor;
      const reportedByRole = b.reportedByRole || role;
      const assumptions    = Array.isArray(b.assumptions) ? b.assumptions : [];

      const item = {
        PK:               `FACILITY#${fid}`,
        SK:               `SVIOL#${now}#${newId}`,
        id:               newId,
        facilityId:       fid,
        status:           "open",
        priority:         b.priority    || "medium",
        severity:         b.severity    || "medium",
        building:         b.building    || "",
        area:             b.area        || "",
        equipment:        b.equipment   || "",
        equipmentId:      b.equipmentId || "",
        system:           b.system      || "",
        systemType:       b.systemType  || "",
        observation:      b.observation || "",
        observationCustom: b.observationCustom || "",
        observedAt:       b.observedAt  || now,
        reportedBy,
        reportedByRole,
        description:      b.description || "",
        assumptions,
        assumptionsText:  b.assumptionsText || "",
        assumedAt:        now,
        autoDetected:     false,
        timeline: [
          {
            phase:      "open",
            action:     "Violation created",
            by:         actor,
            byRole:     role,
            at:         now,
            note:       "",
            personnel:  [{ name: reportedBy, role: reportedByRole }],
            assumptions,
          },
        ],
        createdAt:  now,
        updatedAt:  now,
        createdBy:  actor,
        TTL:        ttlOneYear(),
      };

      Object.assign(item, computeAllScores(item));

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      await writeJournalEntry(item, actor, role, "open");
      await writeDCVaultEntry(item, actor, role, "open", true).catch(err => console.warn("[DC Vault] cross-write failed:", err));

      return json(201, { violation: item });
    } catch (err) {
      console.error("[SystemViolations] POST error:", err);
      return json(500, { message: "Failed to create violation" });
    }
  }

  // ── PATCH /system-violations/{id} ─────────────────────────────────────────
  if (method === "PATCH" && id) {
    try {
      const b = parseBody(event);

      // Fetch existing
      const items  = await queryFacility(fid, {});
      const existing = items.find(i => i.id === id);
      if (!existing) return json(404, { message: "Violation not found" });

      const now        = new Date().toISOString();
      const newStatus  = b.status || existing.status;
      const statusChanged = newStatus !== existing.status;

      // Build updated item
      const updated = { ...existing, ...b, id, facilityId: fid, updatedAt: now };

      // Auto-set timestamps on phase transition
      if (statusChanged) {
        if (newStatus === "investigating" && !updated.investigationStartedAt) {
          updated.investigationStartedAt = now;
          updated.investigatedBy         = actor;
        }
        if (newStatus === "in_progress" && !updated.workStartedAt) {
          updated.workStartedAt = now;
        }
        if (newStatus === "resolved" && !updated.resolvedAt) {
          updated.resolvedAt  = now;
          updated.resolvedBy  = actor;
        }
        if (newStatus === "verified" && !updated.verifiedAt) {
          updated.verifiedAt  = now;
          updated.verifiedBy  = actor;
        }
        if (newStatus === "authorized" && !updated.authorizedAt) {
          updated.authorizedAt = now;
          // authorizedBy / authorizedByRole / authorizationNote / riskAccepted / riskAcceptanceNote
          // are already merged from b via the spread above
        }
        if (newStatus === "closed" && !updated.closedAt) {
          updated.closedAt  = now;
          updated.closedBy  = actor;
        }

        // Push timeline entry
        const entry = {
          phase:      newStatus,
          action:     `Status advanced to ${newStatus}`,
          by:         actor,
          byRole:     role,
          at:         now,
          note:       b.phaseNote || "",
          personnel:  Array.isArray(b.involvedPersonnel)
                        ? b.involvedPersonnel
                        : (b.involvedPersonnel
                            ? String(b.involvedPersonnel).split(",").map(n => ({ name: n.trim(), role: "" }))
                            : []),
          assumptions: existing.assumptions || [],
        };
        updated.timeline = [...(existing.timeline || []), entry];
      }

      // Recalculate scores
      Object.assign(updated, computeAllScores(updated));

      // Write back (same PK/SK as existing)
      await ddb.send(new PutCommand({ TableName: TABLE, Item: updated }));

      if (statusChanged) {
        await writeJournalEntry(updated, actor, role, newStatus);
        await writeDCVaultEntry(updated, actor, role, newStatus, false).catch(err => console.warn("[DC Vault] cross-write failed:", err));
      }

      return json(200, { violation: updated });
    } catch (err) {
      console.error("[SystemViolations] PATCH error:", err);
      return json(500, { message: "Failed to update violation" });
    }
  }

  return json(404, { message: "Route not found" });
};
