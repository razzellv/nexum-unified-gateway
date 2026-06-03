// ── fi-issue-origin Lambda ────────────────────────────────────────────────────
// Issue Origin & Reporting Intelligence — tracks every issue from first report
// through closure, building a defensible evidence chain with continuity scores.
//
// JWT-protected routes:
//   POST   /issues                       — create issue with source metadata
//   GET    /issues                       — list issues for facility
//   GET    /issues/{id}                  — full origin + timeline + scores + AI summary
//   POST   /issues/{id}/report           — add a report attempt
//   GET    /issues/{id}/reports          — list all report attempts + reporter breakdown
//   GET    /issues/{id}/continuity       — continuity scores only
//   POST   /issues/{id}/link             — attach a historical record
//   GET    /issues/{id}/links            — list all linked records
//   GET    /issues/{id}/summary          — AI-ready summary + dashboard fields
//   PATCH  /issues/{id}                  — update issue (status, severity, closure)

import { DynamoDBClient }    from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.REGION || "us-east-2" })
);

const ORIGINS_TABLE = process.env.ORIGINS_TABLE  || "IssueOrigins";
const ATTEMPTS_TABLE = process.env.ATTEMPTS_TABLE || "IssueReportAttempts";
const LINKS_TABLE   = process.env.LINKS_TABLE    || "LinkedHistoricalRecords";

// ── CORS / response helpers ───────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

function json(status, body) {
  return {
    statusCode: status,
    headers:    { ...CORS, "Content-Type": "application/json" },
    body:       JSON.stringify(body),
  };
}

// ── JWT / user helpers ────────────────────────────────────────────────────────
function extractUser(event) {
  // Prefer authorizer claims (injected by API Gateway JWT authorizer)
  const claims =
    event?.requestContext?.authorizer?.jwt?.claims ||
    event?.requestContext?.authorizer?.claims ||
    null;

  if (claims) {
    return {
      userId:     claims.sub || claims["cognito:username"] || "unknown",
      email:      claims.email || "",
      role:       claims["custom:role"] || "staff",
      facilityId: claims["custom:facilityId"] || claims["custom:orgId"] || "facility-001",
    };
  }

  // Fallback: decode Bearer token manually
  try {
    const auth  = event.headers?.Authorization || event.headers?.authorization || "";
    const token = auth.replace("Bearer ", "");
    const p     = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return {
      userId:     p.sub || p["cognito:username"] || "unknown",
      email:      p.email || "",
      role:       p["custom:role"] || "staff",
      facilityId: p["custom:facilityId"] || p["custom:orgId"] || "facility-001",
    };
  } catch {
    return { userId: "unknown", email: "", role: "staff", facilityId: "facility-001" };
  }
}

// ── DynamoDB pagination helper ────────────────────────────────────────────────
async function queryAll(params, maxPages = 10) {
  const items = [];
  let last;
  for (let i = 0; i < maxPages; i++) {
    const res = await ddb.send(new QueryCommand({ ...params, ExclusiveStartKey: last }));
    items.push(...(res.Items || []));
    last = res.LastEvaluatedKey;
    if (!last) break;
  }
  return items;
}

// ── Routing helpers ───────────────────────────────────────────────────────────
function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "GET";
}
function getPath(event) {
  return event?.requestContext?.http?.path || event?.path || "";
}

// ══════════════════════════════════════════════════════════════════════════════
// SCORING ENGINE
// ══════════════════════════════════════════════════════════════════════════════

function computeScores(issue, attempts, links) {
  const now          = Date.now();
  const issueCreated = new Date(issue.originalTimestamp || issue.createdAt || now).getTime();
  const ageHours     = (now - issueCreated) / 3600000;

  // Reporter counts
  const reporterIds    = new Set([issue.firstReporterId, ...attempts.map(a => a.reporterId)].filter(Boolean));
  const uniqueReporters = reporterIds.size;

  // Attempt type breakdowns
  const repairAttempts = attempts.filter(a => a.attemptType === "repair_attempt").length;
  const reopens        = attempts.filter(a => a.attemptType === "reopen").length;
  const escalations    = attempts.filter(a => a.isEscalation).length;
  const closureNotes   = attempts.filter(a => a.attemptType === "closure_note").length;
  const duplicates     = attempts.filter(a => a.isDuplicate).length;

  // Links
  const linkedPMs         = links.filter(l => l.recordType === "pm").length;
  const linkedWOs         = links.filter(l => l.recordType === "work_order").length;
  const linkedViolations  = links.filter(l => l.recordType === "violation").length;
  const totalLinks        = links.length;

  const hasClosureEvidence  = !!(issue.closureEvidence);
  const hasOriginalAttach   = !!(issue.originalAttachment);
  const hasAttemptAttach    = attempts.some(a => a.attachment);

  // Average gap between consecutive attempts (hours)
  const sortedAttempts = [...attempts].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let avgGapHours = 0;
  if (sortedAttempts.length >= 2) {
    const gaps = sortedAttempts.slice(1).map((a, i) =>
      (new Date(a.timestamp).getTime() - new Date(sortedAttempts[i].timestamp).getTime()) / 3600000
    );
    avgGapHours = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  }

  // ── Issue Continuity Score (0=poor chain, 100=excellent) ─────────────────
  let ics = 40;
  if (uniqueReporters >= 2) ics += 10;
  if (uniqueReporters >= 3) ics += 10;
  if (totalLinks >= 2)      ics += 10;
  if (totalLinks >= 5)      ics += 5;
  if (escalations > 0)      ics += 10;
  if (hasClosureEvidence)   ics += 15;
  if (repairAttempts > 0 && reopens === 0) ics += 10; // clean repair
  if (repairAttempts > 0 && reopens > 0)   ics -= 10; // failed repair

  // ── Visibility Gap Score (0=fully visible, 100=invisible) ─────────────────
  let vgs = 0;
  if (uniqueReporters === 1)              vgs += 35;
  if (ageHours > 72  && attempts.length <= 1) vgs += 25;
  if (escalations === 0 && ageHours > 48) vgs += 20;
  if (linkedWOs === 0 && ageHours > 24)   vgs += 10;
  if (issue.severity === "critical" && ageHours > 4) vgs += 10;

  // ── Escalation Risk Score (0=low, 100=critical) ───────────────────────────
  let ers = 15;
  if (issue.status === "open"    && ageHours > 48)  ers += 20;
  if (issue.status === "open"    && ageHours > 168) ers += 20;
  if (issue.severity === "critical") ers += 25;
  if (issue.severity === "high")     ers += 15;
  if (repairAttempts > 0 && reopens > 0) ers += 20;
  if (uniqueReporters >= 3 && escalations === 0) ers += 10;

  // ── Reporting Friction Score (0=smooth, 100=blocked) ─────────────────────
  let rfs = 0;
  if (avgGapHours > 24)               rfs += 20;
  if (avgGapHours > 72)               rfs += 20;
  if (duplicates > 0)                 rfs += 15;
  if (attempts.length === 0 && ageHours > 24) rfs += 30;
  if (attempts.length === 0 && ageHours > 72) rfs += 15;

  // ── Repeat Failure Risk Score (0=isolated, 100=systemic) ─────────────────
  let rfrs = 10;
  if (repairAttempts >= 2)  rfrs += 20;
  if (reopens >= 1)         rfrs += 30;
  if (reopens >= 2)         rfrs += 20;
  if (linkedPMs > 0 && repairAttempts > 0) rfrs += 10;
  if (linkedViolations > 0) rfrs += 10;

  // ── Decision Defensibility Score (0=indefensible, 100=airtight) ──────────
  let dds = 30;
  if (uniqueReporters >= 2)   dds += 10;
  if (totalLinks >= 3)        dds += 15;
  if (hasClosureEvidence)     dds += 20;
  if (escalations > 0)        dds += 10;
  if (hasOriginalAttach)      dds += 7;
  if (hasAttemptAttach)       dds += 8;

  const clamp = v => Math.max(0, Math.min(100, v));

  return {
    issueContinuityScore:     clamp(ics),
    visibilityGapScore:       clamp(vgs),
    escalationRiskScore:      clamp(ers),
    reportingFrictionScore:   clamp(rfs),
    repeatFailureRiskScore:   clamp(rfrs),
    decisionDefensibilityScore: clamp(dds),
    computedAt: new Date().toISOString(),
    factors: {
      uniqueReporters,
      totalAttempts:      attempts.length,
      repairAttempts,
      reopens,
      escalations,
      duplicates,
      closureNotes,
      totalLinkedRecords: totalLinks,
      linkedPMs,
      linkedWOs,
      linkedViolations,
      ageHours:           Math.round(ageHours),
      hasClosureEvidence,
      avgGapHoursBetweenAttempts: Math.round(avgGapHours),
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AI SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════════════════════

const SOURCE_LABEL = {
  operator_log:  "during operator rounds",
  pm:            "during a scheduled PM inspection",
  work_order:    "while executing a work order",
  violation:     "via a compliance inspection",
  inspection:    "during a facility inspection",
  photo:         "via an uploaded photo or image",
  ai_detection:  "by an AI detection system",
  vendor_note:   "via a vendor note",
  bas_alarm:     "through a BAS alarm event",
  manual_report: "via a manual report",
};

function fmtDate(iso) {
  if (!iso) return "an unknown date";
  return new Date(iso).toLocaleString("en-US", {
    month:  "2-digit", day: "2-digit", year:   "numeric",
    hour:   "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function buildAISummary(issue, attempts, links, scores) {
  const reporter   = issue.firstReporterName || "an unidentified reporter";
  const firstDate  = fmtDate(issue.originalTimestamp || issue.createdAt);
  const sourceCtx  = SOURCE_LABEL[issue.sourceType] || "during facility operations";
  const reportCat  = issue.reportSourceCategory === "sensor" ? "sensor-generated"
                   : issue.reportSourceCategory === "ai_inferred" ? "AI-inferred"
                   : issue.reportSourceCategory === "system_generated" ? "system-generated"
                   : "human-reported";

  const sorted = [...attempts].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const lastAttempt = sorted[sorted.length - 1];

  let text = `This issue was first reported by ${reporter} on ${firstDate} ${sourceCtx}`;
  text += ` (${reportCat}, confidence ${issue.confidenceLevel ?? 80}%).`;

  if (lastAttempt) {
    const lastDate = fmtDate(lastAttempt.timestamp);
    const typeLabel = {
      repair_attempt: "a repair attempt",
      escalation:     "an escalation notice",
      closure_note:   "a closure note",
      reopen:         "a reopen event",
      pm_note:        "a related PM note",
      clarification:  "a clarifying report",
      duplicate:      "a duplicate report",
    }[lastAttempt.attemptType] || "a follow-up report";
    text += ` A follow-up report was submitted by ${lastAttempt.reporterName} on ${lastDate} as ${typeLabel}`;
    if (lastAttempt.description) {
      text += `, noting: "${lastAttempt.description.slice(0, 120)}${lastAttempt.description.length > 120 ? "…" : ""}"`;
    }
    text += ".";
  }

  if (links.length > 0) {
    const types = [...new Set(links.map(l => l.recordType))].join(", ");
    text += ` Historical ${types} records suggest this condition may have repeated across multiple reporting cycles.`;
  }

  if (scores.visibilityGapScore >= 60) {
    text += ` The issue appears to have a high visibility gap — field observations were reported multiple times before meaningful organizational response.`;
  } else if (scores.visibilityGapScore >= 30) {
    text += ` The issue appears to have a moderate visibility gap because field observations were reported more than once before final resolution.`;
  }

  const { repairAttempts, reopens } = scores.factors;
  if (repairAttempts > 0 && reopens > 0) {
    text += ` This issue was repaired ${repairAttempts} time(s) but reopened ${reopens} time(s), indicating a potential repeat-failure pattern.`;
  }

  if (scores.decisionDefensibilityScore >= 70) {
    text += ` Decision defensibility is strong with a documented evidence chain.`;
  } else if (scores.decisionDefensibilityScore < 50) {
    text += ` Decision defensibility is currently low — additional documentation and closure evidence are recommended.`;
  }

  return text;
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD FIELDS BUILDER
// ══════════════════════════════════════════════════════════════════════════════

function buildDashboardFields(issue, attempts, links, scores) {
  const sortedAttempts = [...attempts].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const lastAttempt = sortedAttempts[sortedAttempts.length - 1];

  return {
    firstReportedBy:      issue.firstReporterName,
    firstReportedAt:      issue.originalTimestamp,
    firstReporterRole:    issue.firstReporterRole,
    lastReportedBy:       lastAttempt?.reporterName  || issue.firstReporterName,
    lastReportedAt:       lastAttempt?.timestamp     || issue.originalTimestamp,
    totalReports:         attempts.length + 1,
    uniqueReporters:      scores.factors.uniqueReporters,
    repairAttempts:       scores.factors.repairAttempts,
    reopenEvents:         scores.factors.reopens,
    linkedPMRecords:      scores.factors.linkedPMs,
    linkedWORecords:      scores.factors.linkedWOs,
    linkedViolationRecords: scores.factors.linkedViolations,
    totalLinkedRecords:   scores.factors.totalLinkedRecords,
    defensibilityStatus:
      scores.decisionDefensibilityScore >= 70 ? "Strong"  :
      scores.decisionDefensibilityScore >= 50 ? "Moderate" : "Weak",
    continuityStatus:
      scores.issueContinuityScore >= 70 ? "Well-documented" :
      scores.issueContinuityScore >= 40 ? "Partial"         : "Sparse",
    visibilityStatus:
      scores.visibilityGapScore >= 60 ? "High Gap"  :
      scores.visibilityGapScore >= 30 ? "Moderate Gap" : "Visible",
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function createIssue(event, user) {
  const body      = JSON.parse(event.body || "{}");
  const issueId   = randomUUID();
  const now       = new Date().toISOString();

  const item = {
    PK:                   `FACILITY#${user.facilityId}`,
    SK:                   `ISSUE#${issueId}`,
    issueId,
    facilityId:           user.facilityId,
    title:                body.title || "Untitled Issue",
    // source metadata
    sourceType:           body.sourceType           || "manual_report",
    reportSourceCategory: body.reportSourceCategory || "human",
    confidenceLevel:      body.confidenceLevel      ?? 80,
    // first reporter
    firstReporterName:    body.firstReporterName || body.reporterName || user.email,
    firstReporterRole:    body.firstReporterRole || body.reporterRole || user.role,
    firstReporterId:      body.firstReporterId   || user.userId,
    // asset
    assetId:              body.assetId    || null,
    systemType:           body.systemType || null,
    // content
    originalTimestamp:    body.originalTimestamp || now,
    originalDescription:  body.originalDescription || body.description || "",
    originalAttachment:   body.originalAttachment  || null,
    // classification
    severity:             body.severity || "medium",
    status:               "open",
    tags:                 body.tags || [],
    // lifecycle
    createdAt:   now,
    updatedAt:   now,
    closedAt:    null,
    closedById:  null,
    closedByName: null,
    closureEvidence: null,
  };

  await ddb.send(new PutCommand({ TableName: ORIGINS_TABLE, Item: item }));
  return json(201, { issueId, issue: item, message: "Issue created" });
}

async function listIssues(event, user) {
  const qs       = event.queryStringParameters || {};
  const limit    = Math.min(parseInt(qs.limit || "50"), 200);
  const status   = qs.status;
  const severity = qs.severity;

  const params = {
    TableName:                 ORIGINS_TABLE,
    KeyConditionExpression:    "PK = :pk",
    ExpressionAttributeValues: { ":pk": `FACILITY#${user.facilityId}` },
    ScanIndexForward:          false,
    Limit:                     limit,
  };

  const filters = [];
  if (status) {
    params.ExpressionAttributeValues[":status"] = status;
    params.ExpressionAttributeNames            = { "#s": "status" };
    filters.push("#s = :status");
  }
  if (severity) {
    params.ExpressionAttributeValues[":severity"] = severity;
    filters.push("severity = :severity");
  }
  if (filters.length) params.FilterExpression = filters.join(" AND ");

  const items = await queryAll(params, 5);
  return json(200, { issues: items, count: items.length });
}

async function getIssue(issueId, user) {
  const issueRes = await queryAll({
    TableName:                 ORIGINS_TABLE,
    KeyConditionExpression:    "PK = :pk AND SK = :sk",
    ExpressionAttributeValues: {
      ":pk": `FACILITY#${user.facilityId}`,
      ":sk": `ISSUE#${issueId}`,
    },
  });
  const issue = issueRes[0];
  if (!issue) return json(404, { error: "Issue not found" });

  const [attempts, links] = await Promise.all([
    queryAll({ TableName: ATTEMPTS_TABLE, KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": `ISSUE#${issueId}` } }),
    queryAll({ TableName: LINKS_TABLE,    KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": `ISSUE#${issueId}` } }),
  ]);

  const sorted = [...attempts].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const scores  = computeScores(issue, attempts, links);
  const summary = buildAISummary(issue, sorted, links, scores);

  const timeline = [
    {
      type:        "origin",
      timestamp:   issue.originalTimestamp || issue.createdAt,
      actor:       issue.firstReporterName,
      role:        issue.firstReporterRole,
      sourceType:  issue.sourceType,
      description: issue.originalDescription,
      attachment:  issue.originalAttachment,
      isOrigin:    true,
    },
    ...sorted.map(a => ({
      type:        a.attemptType,
      timestamp:   a.timestamp,
      actor:       a.reporterName,
      role:        a.reporterRole,
      description: a.description,
      attachment:  a.attachment || null,
      isDuplicate: a.isDuplicate,
      isEscalation: a.isEscalation,
    })),
  ];

  return json(200, {
    issue,
    timeline,
    attempts:        sorted,
    links,
    scores,
    aiSummary:       summary,
    dashboardFields: buildDashboardFields(issue, attempts, links, scores),
  });
}

async function addReportAttempt(event, issueId, user) {
  const body      = JSON.parse(event.body || "{}");
  const attemptId = randomUUID();
  const now       = new Date().toISOString();

  const attempt = {
    PK:           `ISSUE#${issueId}`,
    SK:           `ATTEMPT#${now}#${attemptId}`,
    attemptId,
    issueId,
    facilityId:   user.facilityId,
    reporterName: body.reporterName || user.email,
    reporterRole: body.reporterRole || user.role,
    reporterId:   body.reporterId   || user.userId,
    timestamp:    body.timestamp    || now,
    description:  body.description  || "",
    attemptType:  body.attemptType  || "clarification",
    attachment:   body.attachment   || null,
    isDuplicate:  body.isDuplicate  || false,
    isEscalation: body.isEscalation || false,
    createdAt:    now,
  };

  await ddb.send(new PutCommand({ TableName: ATTEMPTS_TABLE, Item: attempt }));

  await ddb.send(new UpdateCommand({
    TableName:                 ORIGINS_TABLE,
    Key:                       { PK: `FACILITY#${user.facilityId}`, SK: `ISSUE#${issueId}` },
    UpdateExpression:          "SET updatedAt = :now",
    ExpressionAttributeValues: { ":now": now },
  }));

  return json(201, { attemptId, attempt, message: "Report attempt added" });
}

async function getReportAttempts(issueId) {
  const attempts = await queryAll({
    TableName:                 ATTEMPTS_TABLE,
    KeyConditionExpression:    "PK = :pk",
    ExpressionAttributeValues: { ":pk": `ISSUE#${issueId}` },
    ScanIndexForward:          true,
  });

  const byReporter = {};
  for (const a of attempts) {
    const key = a.reporterId || a.reporterName;
    if (!byReporter[key]) {
      byReporter[key] = { name: a.reporterName, role: a.reporterRole, count: 0, attempts: [] };
    }
    byReporter[key].count++;
    byReporter[key].attempts.push(a);
  }

  return json(200, {
    attempts,
    totalAttempts:    attempts.length,
    uniqueReporters:  Object.keys(byReporter).length,
    byReporter,
    attemptTypes: {
      duplicate:      attempts.filter(a => a.isDuplicate).length,
      escalation:     attempts.filter(a => a.isEscalation).length,
      repair_attempt: attempts.filter(a => a.attemptType === "repair_attempt").length,
      reopen:         attempts.filter(a => a.attemptType === "reopen").length,
      closure_note:   attempts.filter(a => a.attemptType === "closure_note").length,
      pm_note:        attempts.filter(a => a.attemptType === "pm_note").length,
      clarification:  attempts.filter(a => a.attemptType === "clarification").length,
    },
  });
}

async function getContinuityScores(issueId, user) {
  const issueRes = await queryAll({
    TableName:                 ORIGINS_TABLE,
    KeyConditionExpression:    "PK = :pk AND SK = :sk",
    ExpressionAttributeValues: { ":pk": `FACILITY#${user.facilityId}`, ":sk": `ISSUE#${issueId}` },
  });
  const issue = issueRes[0];
  if (!issue) return json(404, { error: "Issue not found" });

  const [attempts, links] = await Promise.all([
    queryAll({ TableName: ATTEMPTS_TABLE, KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": `ISSUE#${issueId}` } }),
    queryAll({ TableName: LINKS_TABLE,    KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": `ISSUE#${issueId}` } }),
  ]);

  return json(200, computeScores(issue, attempts, links));
}

async function linkRecord(event, issueId, user) {
  const body   = JSON.parse(event.body || "{}");
  const linkId = randomUUID();
  const now    = new Date().toISOString();

  const link = {
    PK:                `ISSUE#${issueId}`,
    SK:                `LINK#${body.recordType || "record"}#${body.recordId || linkId}`,
    linkId,
    issueId,
    facilityId:        user.facilityId,
    recordType:        body.recordType        || "manual",
    recordId:          body.recordId          || linkId,
    recordTimestamp:   body.recordTimestamp   || null,
    recordDescription: body.recordDescription || "",
    linkedAt:          now,
    linkedBy:          user.userId,
    linkedByName:      body.linkedByName || user.email,
  };

  await ddb.send(new PutCommand({ TableName: LINKS_TABLE, Item: link }));
  return json(201, { linkId, link, message: "Historical record linked" });
}

async function getLinks(issueId) {
  const links = await queryAll({
    TableName:                 LINKS_TABLE,
    KeyConditionExpression:    "PK = :pk",
    ExpressionAttributeValues: { ":pk": `ISSUE#${issueId}` },
  });

  const byType = {};
  for (const l of links) {
    if (!byType[l.recordType]) byType[l.recordType] = [];
    byType[l.recordType].push(l);
  }

  return json(200, { links, totalLinks: links.length, byType });
}

async function getAISummary(issueId, user) {
  const issueRes = await queryAll({
    TableName:                 ORIGINS_TABLE,
    KeyConditionExpression:    "PK = :pk AND SK = :sk",
    ExpressionAttributeValues: { ":pk": `FACILITY#${user.facilityId}`, ":sk": `ISSUE#${issueId}` },
  });
  const issue = issueRes[0];
  if (!issue) return json(404, { error: "Issue not found" });

  const [attempts, links] = await Promise.all([
    queryAll({ TableName: ATTEMPTS_TABLE, KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": `ISSUE#${issueId}` } }),
    queryAll({ TableName: LINKS_TABLE,    KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": `ISSUE#${issueId}` } }),
  ]);

  const scores = computeScores(issue, attempts, links);
  return json(200, {
    issueId,
    aiSummary:       buildAISummary(issue, attempts, links, scores),
    scores,
    dashboardFields: buildDashboardFields(issue, attempts, links, scores),
  });
}

async function updateIssue(event, issueId, user) {
  const body = JSON.parse(event.body || "{}");
  const now  = new Date().toISOString();

  const sets   = ["updatedAt = :now"];
  const vals   = { ":now": now };
  const names  = {};

  const allowed = ["severity", "title", "closureEvidence", "closedAt", "closedById", "closedByName", "tags"];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key} = :${key}`);
      vals[`:${key}`] = body[key];
    }
  }
  // status uses reserved word guard
  if (body.status !== undefined) {
    sets.push("#s = :status");
    vals[":status"] = body.status;
    names["#s"]     = "status";
    if (body.status === "closed" && !body.closedAt) {
      sets.push("closedAt = :closedAt");
      vals[":closedAt"] = now;
    }
  }

  const params = {
    TableName:                 ORIGINS_TABLE,
    Key:                       { PK: `FACILITY#${user.facilityId}`, SK: `ISSUE#${issueId}` },
    UpdateExpression:          `SET ${sets.join(", ")}`,
    ExpressionAttributeValues: vals,
    ReturnValues:              "ALL_NEW",
  };
  if (Object.keys(names).length) params.ExpressionAttributeNames = names;

  const result = await ddb.send(new UpdateCommand(params));
  return json(200, { issue: result.Attributes, message: "Issue updated" });
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const user = extractUser(event);

  // Parse path: /issues, /issues/{id}, /issues/{id}/report, etc.
  const issueMatch = path.match(/\/issues\/([^/]+)(\/.*)?$/);
  const issueId    = issueMatch ? issueMatch[1] : null;
  const subPath    = issueMatch ? (issueMatch[2] || "") : "";

  try {
    // ── Collection routes ──────────────────────────────────────────────────
    if (!issueId || issueId === "") {
      if (method === "POST") return await createIssue(event, user);
      if (method === "GET")  return await listIssues(event, user);
      return json(405, { error: "Method not allowed" });
    }

    // ── Instance routes ────────────────────────────────────────────────────
    if (subPath === "" || subPath === "/") {
      if (method === "GET")   return await getIssue(issueId, user);
      if (method === "PATCH") return await updateIssue(event, issueId, user);
      return json(405, { error: "Method not allowed" });
    }

    if (subPath === "/report") {
      if (method === "POST") return await addReportAttempt(event, issueId, user);
      return json(405, { error: "Method not allowed" });
    }

    if (subPath === "/reports") {
      if (method === "GET") return await getReportAttempts(issueId);
      return json(405, { error: "Method not allowed" });
    }

    if (subPath === "/continuity") {
      if (method === "GET") return await getContinuityScores(issueId, user);
      return json(405, { error: "Method not allowed" });
    }

    if (subPath === "/link") {
      if (method === "POST") return await linkRecord(event, issueId, user);
      return json(405, { error: "Method not allowed" });
    }

    if (subPath === "/links") {
      if (method === "GET") return await getLinks(issueId);
      return json(405, { error: "Method not allowed" });
    }

    if (subPath === "/summary") {
      if (method === "GET") return await getAISummary(issueId, user);
      return json(405, { error: "Method not allowed" });
    }

    return json(404, { error: "Route not found", path, method });
  } catch (err) {
    console.error("fi-issue-origin error:", err);
    return json(500, { error: err.message || "Internal server error" });
  }
};
