// ── fi-violations Lambda ──────────────────────────────────────────────────────
// FI Platform — Compliance Violations CRUD
//
// JWT-protected routes:
//   GET    /violations              — list all violations for facility
//   POST   /violations              — create a violation
//   PATCH  /violations/{id}         — update status / acknowledged / notes
//   DELETE /violations/{id}         — remove a violation

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb   = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.VIOLATIONS_TABLE || "ViolationEvents";

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

function getMethod(e)   { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)     { return e?.requestContext?.http?.path   || e?.path       || ""; }
function getClaims(e)   { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function facilityId(c)  { return c?.["custom:facilityId"] || c?.["custom:orgId"] || "facility-001"; }

function newId() {
  return `viol-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function mapItem(item, fid) {
  const id = item.violationId || item.SK?.split("#")[1] || "";
  return {
    violationId:   id,
    id,
    type:          item.type          || item.violationType || "",
    violationType: item.violationType || item.type          || "",
    employeeName:  item.employeeName  || item.operator      || "",
    operator:      item.operator      || item.employeeName  || "",
    operatorId:    item.operatorId    || "",
    timestamp:     item.timestamp     || item.issuedAt      || item.createdAt || "",
    issuedAt:      item.issuedAt      || item.timestamp     || item.createdAt || "",
    createdAt:     item.createdAt     || item.timestamp     || "",
    updatedAt:     item.updatedAt     || "",
    severityScore: item.severityScore ?? item.severity     ?? 1,
    severity:      item.severity      ?? item.severityScore ?? 1,
    weightFactor:  item.weightFactor  ?? item.weight       ?? 1,
    weight:        item.weight        ?? item.weightFactor  ?? 1,
    description:   item.description   || "",
    acknowledged:  item.acknowledged  || false,
    inReview:      item.inReview      || false,
    status:        item.status        || "open",
    department:    item.department    || "",
    notes:         item.notes         || "",
    facilityId:    item.facilityId    || fid,
  };
}

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid = facilityId(claims);

  // ── GET /violations ─────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/violations") || path.includes("/violations?"))) {
    try {
      const qs     = event.queryStringParameters || {};
      const limit  = Math.min(parseInt(qs.limit || "200"), 500);
      const status = qs.status;

      let params = {
        TableName:                 TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      if (status) {
        params.FilterExpression              = "#st = :status";
        params.ExpressionAttributeNames      = { "#st": "status" };
        params.ExpressionAttributeValues[":status"] = status;
      }

      const result     = await ddb.send(new QueryCommand(params));
      const violations = (result.Items || []).map(i => mapItem(i, fid));

      return json(200, { violations, count: violations.length });
    } catch (err) {
      console.error("GET /violations:", err);
      return json(500, { message: "Failed to fetch violations.", detail: err.message });
    }
  }

  // ── POST /violations ────────────────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/violations")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);

      const now = new Date().toISOString();
      const id  = newId();

      const item = {
        PK:            `FACILITY#${fid}`,
        SK:            `VIOLATION#${now}#${id}`,
        violationId:   id,
        facilityId:    fid,
        type:          body.type          || body.violationType || "General",
        violationType: body.violationType || body.type          || "General",
        employeeName:  body.employeeName  || body.operator      || "",
        operator:      body.operator      || body.employeeName  || "",
        operatorId:    body.operatorId    || claims?.sub        || "",
        timestamp:     body.timestamp     || now,
        issuedAt:      body.issuedAt      || now,
        severityScore: body.severityScore ?? body.severity     ?? 1,
        severity:      body.severity      ?? body.severityScore ?? 1,
        weightFactor:  body.weightFactor  ?? body.weight       ?? 1,
        weight:        body.weight        ?? body.weightFactor  ?? 1,
        description:   body.description   || "",
        acknowledged:  false,
        inReview:      false,
        status:        body.status        || "open",
        department:    body.department    || claims?.["custom:department"] || "",
        notes:         body.notes         || "",
        createdAt:     now,
        updatedAt:     now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return json(200, { success: true, violationId: id, violation: mapItem(item, fid) });
    } catch (err) {
      console.error("POST /violations:", err);
      return json(500, { message: "Failed to create violation.", detail: err.message });
    }
  }

  // ── PATCH /violations/{id} ──────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/violations/")) {
    try {
      const id  = path.split("/violations/")[1].split("?")[0];
      let raw   = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();

      const setExprs = ["updatedAt = :now"];
      const names    = {};
      const vals     = { ":now": now };

      if (body.status       !== undefined) { setExprs.push("#st = :st");          names["#st"] = "status"; vals[":st"]   = body.status; }
      if (body.acknowledged !== undefined) { setExprs.push("acknowledged = :ack");                          vals[":ack"]  = body.acknowledged; }
      if (body.inReview     !== undefined) { setExprs.push("inReview = :ir");                               vals[":ir"]   = body.inReview; }
      if (body.notes        !== undefined) { setExprs.push("notes = :notes");                               vals[":notes"]= body.notes; }
      if (body.description  !== undefined) { setExprs.push("description = :desc");                          vals[":desc"] = body.description; }
      if (body.severityScore!== undefined) { setExprs.push("severityScore = :ss");                          vals[":ss"]   = body.severityScore; }

      const params = {
        TableName:                 TABLE,
        Key:                       { PK: `FACILITY#${fid}`, SK: `VIOLATION#${id}` },
        UpdateExpression:          "SET " + setExprs.join(", "),
        ExpressionAttributeValues: vals,
      };
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;

      await ddb.send(new UpdateCommand(params));
      return json(200, { success: true, violationId: id });
    } catch (err) {
      console.error("PATCH /violations:", err);
      return json(500, { message: "Failed to update violation.", detail: err.message });
    }
  }

  // ── DELETE /violations/{id} ─────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/violations/")) {
    try {
      const id = path.split("/violations/")[1].split("?")[0];
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { PK: `FACILITY#${fid}`, SK: `VIOLATION#${id}` },
      }));
      return json(200, { success: true });
    } catch (err) {
      console.error("DELETE /violations:", err);
      return json(500, { message: "Failed to delete violation.", detail: err.message });
    }
  }

  return json(404, { message: "Route not found" });
};
