// ── fi-audit-reports Lambda ───────────────────────────────────────────────────
// FI Platform — Compliance Audit Reports CRUD
//
// JWT-protected routes:
//   GET    /audit-reports              — list audit reports for facility
//   POST   /audit-reports              — create an audit report
//   PATCH  /audit-reports/{id}         — update status / findings / notes
//   DELETE /audit-reports/{id}         — remove a report

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, UpdateCommand, DeleteCommand,
         GetCommand }                              from "@aws-sdk/lib-dynamodb";
import { randomUUID }                              from "crypto";

const ddb              = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE            = process.env.AUDIT_TABLE || "AuditReports";
const ONBOARDING_TABLE = "NexumOnboardingRecords";

async function markMilestone(fid, milestoneId) {
  try {
    const res    = await ddb.send(new GetCommand({ TableName: ONBOARDING_TABLE, Key: { facilityId: fid } }));
    const record = res.Item;
    if (!record) return;
    if ((record.milestones || []).find(m => m.id === milestoneId)?.done) return;
    const milestones = (record.milestones || []).map(m =>
      m.id === milestoneId ? { ...m, done: true, doneAt: new Date().toISOString() } : m
    );
    const completed = milestones.filter(m => m.done).length;
    const progress  = Math.round((completed / milestones.length) * 100);
    await ddb.send(new UpdateCommand({
      TableName:                 ONBOARDING_TABLE,
      Key:                       { facilityId: fid },
      UpdateExpression:          "SET milestones = :m, progress = :p, updatedAt = :u, #st = :s",
      ExpressionAttributeNames:  { "#st": "status" },
      ExpressionAttributeValues: { ":m": milestones, ":p": progress, ":u": new Date().toISOString(), ":s": progress === 100 ? "complete" : "in_progress" },
    }));
  } catch (err) {
    console.error(`markMilestone(${milestoneId}):`, err.message);
  }
}

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

function getMethod(e)    { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)      { return e?.requestContext?.http?.path   || e?.path       || ""; }
function getClaims(e) {
  return e?.requestContext?.authorizer?.jwt?.claims ||
         e?.requestContext?.authorizer?.claims      || null;
}
function facilityId(c) {
  return c["custom:facilityId"] || c["custom:orgId"] || c.sub || "facility-001";
}

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid = facilityId(claims);

  // ── GET /audit-reports ────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/audit-reports") || path.includes("/audit-reports?"))) {
    try {
      const qs     = event.queryStringParameters || {};
      const limit  = Math.min(parseInt(qs.limit || "50"), 200);
      const status = qs.status; // "open" | "closed" | "pending"

      let params = {
        TableName:                 TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      if (status) {
        params.FilterExpression = "#st = :s";
        params.ExpressionAttributeValues[":s"] = status;
        params.ExpressionAttributeNames = { "#st": "status" };
      }

      const result  = await ddb.send(new QueryCommand(params));
      const reports = result.Items || [];
      return json(200, { reports, count: reports.length });
    } catch (err) {
      console.error("GET /audit-reports:", err);
      return json(500, { message: "Failed to fetch audit reports.", detail: err.message });
    }
  }

  // ── POST /audit-reports ───────────────────────────────────────────────────
  if (method === "POST" && (path.endsWith("/audit-reports") || path.includes("/audit-reports?"))) {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
      const {
        title, reportType = "general", inspectionDate, inspector,
        findings = [], violations = [], recommendations = [],
        status = "open", severity = "low", equipmentIds = [],
      } = body;

      if (!title) return json(400, { message: "title is required." });

      const id  = randomUUID();
      const now = new Date().toISOString();
      const item = {
        PK:              `FACILITY#${fid}`,
        SK:              `AUDIT#${now}#${id}`,
        reportId:        id,
        facilityId:      fid,
        title,
        reportType,
        inspectionDate:  inspectionDate || now.split("T")[0],
        inspector:       inspector || claims.name || claims.email || "Unknown",
        createdBy:       claims.sub,
        findings,
        violations,
        recommendations,
        equipmentIds,
        status,
        severity,
        createdAt:       now,
        updatedAt:       now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      markMilestone(fid, "compliance_logged").catch(() => {});
      return json(201, { report: item });
    } catch (err) {
      console.error("POST /audit-reports:", err);
      return json(500, { message: "Failed to create audit report.", detail: err.message });
    }
  }

  // ── PATCH /audit-reports/{id} ─────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/audit-reports/")) {
    try {
      const id   = path.split("/audit-reports/")[1].split("?")[0];
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
      const now  = new Date().toISOString();

      const sets  = ["updatedAt = :ua"];
      const vals  = { ":ua": now };
      const names = {};

      if (body.status          !== undefined) { sets.push("#st = :st");    vals[":st"] = body.status;          names["#st"] = "status"; }
      if (body.findings        !== undefined) { sets.push("findings = :f"); vals[":f"]  = body.findings; }
      if (body.recommendations !== undefined) { sets.push("recommendations = :r"); vals[":r"] = body.recommendations; }
      if (body.notes           !== undefined) { sets.push("notes = :n");   vals[":n"]  = body.notes; }
      if (body.severity        !== undefined) { sets.push("severity = :sv"); vals[":sv"] = body.severity; }
      if (body.closedAt        !== undefined) { sets.push("closedAt = :ca"); vals[":ca"] = body.closedAt; }

      await ddb.send(new UpdateCommand({
        TableName:                 TABLE,
        Key:                       { PK: `FACILITY#${fid}`, SK: `AUDIT#${id}` },
        UpdateExpression:          `SET ${sets.join(", ")}`,
        ExpressionAttributeValues: vals,
        ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
      }));
      return json(200, { reportId: id, updatedAt: now });
    } catch (err) {
      console.error("PATCH /audit-reports/{id}:", err);
      return json(500, { message: "Failed to update audit report.", detail: err.message });
    }
  }

  // ── DELETE /audit-reports/{id} ────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/audit-reports/")) {
    try {
      const id = path.split("/audit-reports/")[1].split("?")[0];
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { PK: `FACILITY#${fid}`, SK: `AUDIT#${id}` },
      }));
      return json(200, { reportId: id, deleted: true });
    } catch (err) {
      console.error("DELETE /audit-reports/{id}:", err);
      return json(500, { message: "Failed to delete audit report.", detail: err.message });
    }
  }

  return json(404, { message: "Not found." });
};
