/**
 * Lambda: fi-onboarding
 * Routes:
 *   GET  /onboarding               — get my onboarding record (JWT)
 *   POST /onboarding               — upsert record (JWT)
 *   GET  /onboarding/all           — admin: list all records (JWT, admin only)
 *   POST /onboarding/:facilityId/milestone — admin: manually check a milestone
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.ONBOARDING_TABLE || "NexumOnboardingRecords";
const ADMIN_DOMAINS = ["nexumsuum.com", "nexumsuum-facilityintelligence.com"];

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
    body: JSON.stringify(body),
  };
}

function decodeJwt(token) {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch { return null; }
}

function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)   { return e?.requestContext?.http?.path   || e?.path       || ""; }

function defaultMilestones() {
  return [
    { id: "account_created",      label: "Account created & verified",            done: false, auto: true  },
    { id: "org_configured",       label: "Organization type configured",           done: false, auto: true  },
    { id: "first_equipment",      label: "First equipment logged",                 done: false, auto: false },
    { id: "first_work_order",     label: "First work order created",               done: false, auto: false },
    { id: "team_invited",         label: "Team member invited (≥ 1 additional)",   done: false, auto: false },
    { id: "compliance_logged",    label: "Compliance logger used",                 done: false, auto: false },
    { id: "first_violation",      label: "Violations module reviewed",             done: false, auto: false },
    { id: "checkin_30d",          label: "30-day check-in completed",              done: false, auto: false },
  ];
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const path = getPath(event);

  // Auth
  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const claims = token ? decodeJwt(token) : null;
  if (!claims) return json(401, { message: "Authentication required" });

  const facilityId = claims["custom:facilityId"] || "facility-001";
  const email      = (claims.email || "").toLowerCase();
  const domain     = email.split("@")[1] || "";
  const isAdmin    = ADMIN_DOMAINS.includes(domain) || claims["custom:role"] === "admin";

  let body = {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString()
      : event.body || "{}";
    body = JSON.parse(raw);
  } catch { /* ignore */ }

  // ── GET /onboarding/all  (admin) ─────────────────────────────────────────
  if (getMethod(event) === "GET" && path.includes("/all")) {
    if (!isAdmin) return json(403, { message: "Admin only" });
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    return json(200, { records: result.Items || [] });
  }

  // ── POST /onboarding/:facilityId/milestone  (admin) ──────────────────────
  if (getMethod(event) === "POST" && path.includes("/milestone")) {
    if (!isAdmin) return json(403, { message: "Admin only" });
    const targetId   = path.split("/").filter(Boolean).find((s, i, arr) => arr[i + 1] === "milestone") || facilityId;
    const { milestoneId, done } = body;
    if (!milestoneId) return json(400, { message: "milestoneId required" });

    const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { facilityId: targetId } }));
    const record = existing.Item;
    if (!record) return json(404, { message: "Record not found" });

    const milestones = (record.milestones || []).map(m =>
      m.id === milestoneId ? { ...m, done: done !== false, doneAt: new Date().toISOString() } : m
    );
    const completed = milestones.filter(m => m.done).length;
    const progress  = Math.round((completed / milestones.length) * 100);

    await ddb.send(new UpdateCommand({
      TableName:        TABLE,
      Key:              { facilityId: targetId },
      UpdateExpression: "SET milestones = :m, progress = :p, updatedAt = :u",
      ExpressionAttributeValues: {
        ":m": milestones,
        ":p": progress,
        ":u": new Date().toISOString(),
      },
    }));
    return json(200, { milestones, progress });
  }

  // ── GET /onboarding ───────────────────────────────────────────────────────
  if (getMethod(event) === "GET") {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { facilityId } }));
    if (!result.Item) {
      // Auto-create on first fetch
      const record = {
        facilityId,
        email,
        orgName:    claims["custom:orgName"]  || "",
        orgType:    claims["custom:orgType"]  || "facility",
        type:       "pilot",
        status:     "in_progress",
        assignedBy: "razzellv@nexumsuum.com",
        milestones: defaultMilestones(),
        progress:   0,
        notes:      "",
        createdAt:  new Date().toISOString(),
        updatedAt:  new Date().toISOString(),
      };
      // Mark account_created automatically
      record.milestones[0].done   = true;
      record.milestones[0].doneAt = new Date().toISOString();
      record.progress = Math.round((1 / record.milestones.length) * 100);
      await ddb.send(new PutCommand({ TableName: TABLE, Item: record }));
      return json(200, { record });
    }
    return json(200, { record: result.Item });
  }

  // ── POST /onboarding  (upsert milestone progress) ────────────────────────
  if (getMethod(event) === "POST") {
    const { milestoneId, orgName, notes, paidServices } = body;

    const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { facilityId } }));
    const record   = existing.Item || {
      facilityId,
      email,
      orgName:    orgName || claims["custom:orgName"] || "",
      orgType:    claims["custom:orgType"] || "facility",
      type:       "pilot",
      status:     "in_progress",
      assignedBy: "razzellv@nexumsuum.com",
      milestones: defaultMilestones(),
      progress:   0,
      notes:      "",
      createdAt:  new Date().toISOString(),
    };

    if (milestoneId) {
      record.milestones = (record.milestones || defaultMilestones()).map(m =>
        m.id === milestoneId ? { ...m, done: true, doneAt: new Date().toISOString() } : m
      );
    }
    if (orgName)      record.orgName      = orgName;
    if (notes)        record.notes        = notes;
    if (paidServices) record.paidServices = paidServices;

    const completed = (record.milestones || []).filter(m => m.done).length;
    record.progress  = Math.round((completed / (record.milestones?.length || 8)) * 100);
    record.status    = record.progress === 100 ? "complete" : "in_progress";
    record.updatedAt = new Date().toISOString();

    await ddb.send(new PutCommand({ TableName: TABLE, Item: record }));
    return json(200, { record });
  }

  return json(405, { message: "Method not allowed" });
};
