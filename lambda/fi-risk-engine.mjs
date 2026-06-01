import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));

const TOLERANCE_TABLE  = process.env.TOLERANCE_TABLE  || "NexumRiskTolerance";
const ACCEPTANCE_TABLE = process.env.ACCEPTANCE_TABLE || "NexumRiskAcceptance";
const SUGGESTIONS_TABLE = process.env.SUGGESTIONS_TABLE || "NexumSuggestions";
const WO_TABLE         = process.env.WO_TABLE         || "WorkOrders";

// ─── Default thresholds (0-100, higher = more tolerant) ──────────────────────
const DEFAULT_TOLERANCE = {
  safety:        30,
  compliance:    35,
  operational:   50,
  financial:     55,
  reputational:  45,
};

// ─── Response helper ─────────────────────────────────────────────────────────
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
    body: JSON.stringify(body),
  };
}

function getClaims(event) {
  return (
    event?.requestContext?.authorizer?.jwt?.claims ||
    event?.requestContext?.authorizer?.claims ||
    null
  );
}

function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "";
}

function getPath(event) {
  return event?.requestContext?.http?.path || event?.path || "";
}

function parseBody(event) {
  try {
    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ─── Auth helper ─────────────────────────────────────────────────────────────
function auth(claims) {
  if (!claims) return null;
  const role    = claims["custom:role"] || claims["cognito:groups"]?.[0] || "";
  const orgType = claims["custom:orgType"] || "";
  const facilityId = claims["custom:facilityId"] || claims["custom:orgId"] || "facility-001";
  const orgId   = claims["custom:orgId"] || facilityId;
  const isAdmin = role === "admin";
  const isServiceTech = orgType === "service_tech";
  const isLeadership  = ["executive","director","manager","supervisor","chief","lieutenant","captain","owner","operations_manager","dispatch_manager"].includes(role);
  return { role, orgType, facilityId, orgId, isAdmin, isServiceTech, isLeadership, sub: claims.sub };
}

// ─── Risk Tolerance ───────────────────────────────────────────────────────────
async function getTolerance(facilityId) {
  const result = await ddb.send(new GetCommand({
    TableName: TOLERANCE_TABLE,
    Key: { PK: `FACILITY#${facilityId}`, SK: "TOLERANCE#config" },
  }));
  return result.Item?.thresholds || DEFAULT_TOLERANCE;
}

async function updateTolerance(facilityId, thresholds, updatedBy) {
  const now = new Date().toISOString();
  const merged = { ...DEFAULT_TOLERANCE, ...thresholds };
  await ddb.send(new PutCommand({
    TableName: TOLERANCE_TABLE,
    Item: {
      PK: `FACILITY#${facilityId}`,
      SK: "TOLERANCE#config",
      thresholds: merged,
      updatedBy,
      updatedAt: now,
    },
  }));
  return merged;
}

// ─── Risk Acceptance ──────────────────────────────────────────────────────────
async function createAcceptance(facilityId, data, createdBy) {
  const id  = randomUUID();
  const now = new Date().toISOString();
  const item = {
    PK:            `FACILITY#${facilityId}`,
    SK:            `ACCEPT#${now}#${id}`,
    id,
    facilityId,
    category:      data.category || "operational",
    riskTitle:     data.riskTitle || "Unnamed Risk",
    justification: data.justification || "",
    riskScore:     Number(data.riskScore) || 0,
    acceptedBy:    createdBy,
    acceptedAt:    now,
    expiresAt:     data.expiresAt || null,
    status:        "active",
    relatedIssueId: data.relatedIssueId || null,
    relatedWOId:   data.relatedWOId || null,
    createdAt:     now,
  };
  await ddb.send(new PutCommand({ TableName: ACCEPTANCE_TABLE, Item: item }));
  return item;
}

async function listAcceptance(facilityId) {
  const now = new Date().toISOString();
  const result = await ddb.send(new QueryCommand({
    TableName: ACCEPTANCE_TABLE,
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: { ":pk": `FACILITY#${facilityId}` },
    ScanIndexForward: false,
  }));
  const items = (result.Items || []).map(item => {
    if (item.status === "active" && item.expiresAt && item.expiresAt < now) {
      item.status = "expired";
    }
    return item;
  });
  return items;
}

async function expireAcceptance(facilityId, acceptSK) {
  await ddb.send(new UpdateCommand({
    TableName: ACCEPTANCE_TABLE,
    Key: { PK: `FACILITY#${facilityId}`, SK: acceptSK },
    UpdateExpression: "SET #s = :expired, updatedAt = :now",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":expired": "expired", ":now": new Date().toISOString() },
  }));
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

// Suggestion categories + types
const SUGGESTION_TYPES = {
  REPEAT_WO_VENDOR:   "Consider routing repeated work orders for this service type to a specialized vendor",
  RISK_TOLERANCE_BREACH: "Risk score exceeds tolerance threshold — review or accept",
  COMPLIANCE_GAP:     "Compliance gap detected — schedule corrective action",
  PM_OVERDUE:         "Preventive maintenance is overdue for tracked equipment",
  ESCALATION_NEEDED:  "Issue escalation score suggests leadership review required",
};

async function listSuggestions(facilityId, status = "active", forServiceTech = false) {
  const result = await ddb.send(new QueryCommand({
    TableName: SUGGESTIONS_TABLE,
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: { ":pk": `FACILITY#${facilityId}` },
    ScanIndexForward: false,
  }));
  let items = result.Items || [];
  if (status !== "all") {
    items = items.filter(i => i.status === status);
  }
  if (forServiceTech) {
    items = items.filter(i => i.visibleToServiceTech === true);
  }
  return items;
}

async function createSuggestion(facilityId, data) {
  const id  = randomUUID();
  const now = new Date().toISOString();
  const item = {
    PK:            `FACILITY#${facilityId}`,
    SK:            `SUGGEST#${now}#${id}`,
    id,
    facilityId,
    type:          data.type || "REPEAT_WO_VENDOR",
    category:      data.category || "operational",
    title:         data.title || SUGGESTION_TYPES[data.type] || "Smart Suggestion",
    detail:        data.detail || "",
    riskScore:     Number(data.riskScore) || 0,
    status:        "active",
    priority:      data.priority || "medium",
    triggeredBy:   data.triggeredBy || "system",
    relatedEntityId: data.relatedEntityId || null,
    relatedEntityType: data.relatedEntityType || null,
    suggestedVendorId: data.suggestedVendorId || null,
    suggestedVendorName: data.suggestedVendorName || null,
    vendorMatchScore: data.vendorMatchScore || null,
    visibleToServiceTech: data.visibleToServiceTech === true,
    createdAt:     now,
    expiresAt:     data.expiresAt || null,
  };
  await ddb.send(new PutCommand({ TableName: SUGGESTIONS_TABLE, Item: item }));
  return item;
}

async function updateSuggestionStatus(facilityId, suggestSK, newStatus, note = "") {
  await ddb.send(new UpdateCommand({
    TableName: SUGGESTIONS_TABLE,
    Key: { PK: `FACILITY#${facilityId}`, SK: suggestSK },
    UpdateExpression: "SET #s = :status, statusNote = :note, updatedAt = :now",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: {
      ":status": newStatus,
      ":note":   note,
      ":now":    new Date().toISOString(),
    },
  }));
}

// ─── Auto-generate suggestions from WO patterns ──────────────────────────────
async function generateSuggestions(facilityId) {
  const tolerance = await getTolerance(facilityId);
  const generated = [];

  // Query recent work orders to detect repeat patterns
  let woResult;
  try {
    woResult = await ddb.send(new QueryCommand({
      TableName: WO_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `FACILITY#${facilityId}` },
      ScanIndexForward: false,
      Limit: 100,
    }));
  } catch (_) {
    woResult = { Items: [] };
  }

  const wos = woResult.Items || [];

  // Count WOs by service type / category
  const serviceTypeCounts = {};
  for (const wo of wos) {
    const t = wo.category || wo.serviceType || wo.type || "general";
    serviceTypeCounts[t] = (serviceTypeCounts[t] || 0) + 1;
  }

  // Find service types with >= 3 repeat WOs
  for (const [serviceType, count] of Object.entries(serviceTypeCounts)) {
    if (count >= 3) {
      const riskScore = Math.min(100, 40 + count * 5);
      if (riskScore > tolerance.operational) {
        const sug = await createSuggestion(facilityId, {
          type: "REPEAT_WO_VENDOR",
          category: "operational",
          title: `${count} repeat work orders for "${serviceType}" — consider a specialized vendor`,
          detail: `Your facility has logged ${count} work orders for ${serviceType}. A specialized service provider may resolve this more efficiently and reduce recurrence.`,
          riskScore,
          priority: count >= 6 ? "high" : "medium",
          triggeredBy: "auto-pattern",
          relatedEntityType: "work_order_pattern",
          relatedEntityId: serviceType,
          visibleToServiceTech: true,
        });
        generated.push(sug);
      }
    }
  }

  return generated;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const u = auth(claims);
  if (!u) return json(401, { message: "Unauthorized" });

  const method = getMethod(event);
  const path   = getPath(event);
  const body   = parseBody(event);
  const pp     = event.pathParameters || {};

  try {
    // ── GET /risk/tolerance ─────────────────────────────────────────────────
    if (method === "GET" && path.endsWith("/risk/tolerance")) {
      const thresholds = await getTolerance(u.facilityId);
      return json(200, { facilityId: u.facilityId, thresholds });
    }

    // ── PATCH /risk/tolerance ───────────────────────────────────────────────
    if (method === "PATCH" && path.endsWith("/risk/tolerance")) {
      if (!u.isAdmin && !u.isLeadership) return json(403, { message: "Leadership access required" });
      const merged = await updateTolerance(u.facilityId, body.thresholds || body, u.sub);
      return json(200, { facilityId: u.facilityId, thresholds: merged });
    }

    // ── GET /risk/acceptance ────────────────────────────────────────────────
    if (method === "GET" && path.endsWith("/risk/acceptance")) {
      const items = await listAcceptance(u.facilityId);
      return json(200, { items, count: items.length });
    }

    // ── POST /risk/acceptance ───────────────────────────────────────────────
    if (method === "POST" && path.endsWith("/risk/acceptance")) {
      if (!u.isAdmin && !u.isLeadership) return json(403, { message: "Leadership access required" });
      if (!body.riskTitle || !body.justification) {
        return json(400, { message: "riskTitle and justification are required" });
      }
      const item = await createAcceptance(u.facilityId, body, u.sub);
      return json(201, item);
    }

    // ── POST /risk/acceptance/{sk}/expire ──────────────────────────────────
    if (method === "POST" && /\/risk\/acceptance\/[^/]+\/expire$/.test(path)) {
      if (!u.isAdmin && !u.isLeadership) return json(403, { message: "Leadership access required" });
      const encoded = pp.sk || path.split("/").slice(-2)[0];
      const sk = decodeURIComponent(encoded);
      await expireAcceptance(u.facilityId, sk);
      return json(200, { message: "Risk acceptance expired" });
    }

    // ── GET /suggestions ────────────────────────────────────────────────────
    if (method === "GET" && path.endsWith("/suggestions")) {
      const status = event.queryStringParameters?.status || "active";
      const forST  = u.isServiceTech;
      const items  = await listSuggestions(u.facilityId, status, forST);
      return json(200, { items, count: items.length });
    }

    // ── POST /suggestions/generate ──────────────────────────────────────────
    if (method === "POST" && path.endsWith("/suggestions/generate")) {
      if (!u.isAdmin && !u.isLeadership) return json(403, { message: "Leadership access required" });
      const generated = await generateSuggestions(u.facilityId);
      return json(200, { generated: generated.length, items: generated });
    }

    // ── POST /suggestions/{sk}/dismiss ──────────────────────────────────────
    if (method === "POST" && /\/suggestions\/[^/]+\/dismiss$/.test(path)) {
      const encoded = pp.sk || path.split("/").slice(-2)[0];
      const sk = decodeURIComponent(encoded);
      await updateSuggestionStatus(u.facilityId, sk, "dismissed", body.note || "");
      return json(200, { message: "Suggestion dismissed" });
    }

    // ── POST /suggestions/{sk}/act ──────────────────────────────────────────
    if (method === "POST" && /\/suggestions\/[^/]+\/act$/.test(path)) {
      const encoded = pp.sk || path.split("/").slice(-2)[0];
      const sk = decodeURIComponent(encoded);
      await updateSuggestionStatus(u.facilityId, sk, "acted_on", body.note || "");
      return json(200, { message: "Suggestion marked as acted on" });
    }

    return json(404, { message: "Route not found", path, method });

  } catch (err) {
    console.error("fi-risk-engine error:", err);
    return json(500, { message: "Internal error", detail: err.message });
  }
};
