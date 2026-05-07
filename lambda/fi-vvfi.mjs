// ── fi-vvfi Lambda ────────────────────────────────────────────────────────────
// FI Platform — VVFI Retainer / FIAS Assessment Data
//
// JWT-protected routes:
//   GET    /vvfi               — list VVFI sessions / FIAS assessments for facility
//   POST   /vvfi               — create / save a VVFI session
//   PATCH  /vvfi/{id}          — update a session (status, score, notes)
//   DELETE /vvfi/{id}          — remove a session

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb   = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.VVFI_TABLE || "NexumFIASAssessments";

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
function getClaims(e)  { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function facilityId(c) { return c?.["custom:facilityId"] || c?.["custom:orgId"] || "facility-001"; }

function newId() {
  return `vvfi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function mapItem(item, fid) {
  const id = item.sessionId || item.assessmentId || item.SK?.split("#")[1] || "";
  return {
    sessionId:        id,
    assessmentId:     id,
    id,
    facilityId:       item.facilityId       || fid,
    facilityName:     item.facilityName     || "",
    assessorId:       item.assessorId       || "",
    assessorName:     item.assessorName     || "",
    status:           item.status           || "draft",
    overallScore:     item.overallScore     ?? null,
    ctsLevel:         item.ctsLevel         ?? null,
    vvfiTier:         item.vvfiTier         || null,
    confidenceScore:  item.confidenceScore  ?? null,
    sections:         item.sections         || {},
    findings:         item.findings         || [],
    recommendations:  item.recommendations  || [],
    systemsAssessed:  item.systemsAssessed  || [],
    dataPoints:       item.dataPoints       ?? 0,
    reportUrl:        item.reportUrl        || null,
    notes:            item.notes            || "",
    completedAt:      item.completedAt      || null,
    createdAt:        item.createdAt        || "",
    updatedAt:        item.updatedAt        || "",
  };
}

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid = facilityId(claims);

  // ── GET /vvfi ────────────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/vvfi") || path.includes("/vvfi?"))) {
    try {
      const qs     = event.queryStringParameters || {};
      const limit  = Math.min(parseInt(qs.limit || "50"), 200);
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

      const result   = await ddb.send(new QueryCommand(params));
      const sessions = (result.Items || []).map(i => mapItem(i, fid));

      return json(200, { sessions, count: sessions.length });
    } catch (err) {
      console.error("GET /vvfi:", err);
      return json(500, { message: "Failed to fetch VVFI sessions.", detail: err.message });
    }
  }

  // ── POST /vvfi ───────────────────────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/vvfi")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();
      const id   = newId();

      const item = {
        PK:               `FACILITY#${fid}`,
        SK:               `VVFI#${now}#${id}`,
        sessionId:        id,
        assessmentId:     id,
        facilityId:       fid,
        facilityName:     body.facilityName     || "",
        assessorId:       body.assessorId       || claims?.sub || "",
        assessorName:     body.assessorName     || claims?.name || claims?.email || "",
        status:           body.status           || "draft",
        overallScore:     body.overallScore     ?? null,
        ctsLevel:         body.ctsLevel         ?? null,
        vvfiTier:         body.vvfiTier         || null,
        confidenceScore:  body.confidenceScore  ?? null,
        sections:         body.sections         || {},
        findings:         body.findings         || [],
        recommendations:  body.recommendations  || [],
        systemsAssessed:  body.systemsAssessed  || [],
        dataPoints:       body.dataPoints       ?? 0,
        reportUrl:        body.reportUrl        || null,
        notes:            body.notes            || "",
        completedAt:      body.completedAt      || null,
        createdAt:        now,
        updatedAt:        now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return json(200, { success: true, sessionId: id, session: mapItem(item, fid) });
    } catch (err) {
      console.error("POST /vvfi:", err);
      return json(500, { message: "Failed to save VVFI session.", detail: err.message });
    }
  }

  // ── PATCH /vvfi/{id} ─────────────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/vvfi/")) {
    try {
      const id  = path.split("/vvfi/")[1].split("?")[0];
      let raw   = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();

      const setExprs = ["updatedAt = :now"];
      const names    = {};
      const vals     = { ":now": now };

      if (body.status          !== undefined) { setExprs.push("#st = :st");          names["#st"] = "status"; vals[":st"]  = body.status; }
      if (body.overallScore    !== undefined) { setExprs.push("overallScore = :os");                          vals[":os"]  = body.overallScore; }
      if (body.confidenceScore !== undefined) { setExprs.push("confidenceScore = :cs");                       vals[":cs"]  = body.confidenceScore; }
      if (body.ctsLevel        !== undefined) { setExprs.push("ctsLevel = :ctl");                             vals[":ctl"] = body.ctsLevel; }
      if (body.vvfiTier        !== undefined) { setExprs.push("vvfiTier = :vt");                              vals[":vt"]  = body.vvfiTier; }
      if (body.sections        !== undefined) { setExprs.push("sections = :sec");                             vals[":sec"] = body.sections; }
      if (body.findings        !== undefined) { setExprs.push("findings = :fnd");                             vals[":fnd"] = body.findings; }
      if (body.recommendations !== undefined) { setExprs.push("recommendations = :rec");                      vals[":rec"] = body.recommendations; }
      if (body.notes           !== undefined) { setExprs.push("notes = :notes");                              vals[":notes"] = body.notes; }
      if (body.completedAt     !== undefined) { setExprs.push("completedAt = :cat");                          vals[":cat"] = body.completedAt; }
      if (body.reportUrl       !== undefined) { setExprs.push("reportUrl = :ru");                             vals[":ru"]  = body.reportUrl; }
      if (body.dataPoints      !== undefined) { setExprs.push("dataPoints = :dp");                            vals[":dp"]  = body.dataPoints; }

      const params = {
        TableName:                 TABLE,
        Key:                       { PK: `FACILITY#${fid}`, SK: `VVFI#${id}` },
        UpdateExpression:          "SET " + setExprs.join(", "),
        ExpressionAttributeValues: vals,
      };
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;

      await ddb.send(new UpdateCommand(params));
      return json(200, { success: true, sessionId: id });
    } catch (err) {
      console.error("PATCH /vvfi:", err);
      return json(500, { message: "Failed to update VVFI session.", detail: err.message });
    }
  }

  // ── DELETE /vvfi/{id} ────────────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/vvfi/")) {
    try {
      const id = path.split("/vvfi/")[1].split("?")[0];
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { PK: `FACILITY#${fid}`, SK: `VVFI#${id}` },
      }));
      return json(200, { success: true });
    } catch (err) {
      console.error("DELETE /vvfi:", err);
      return json(500, { message: "Failed to delete VVFI session.", detail: err.message });
    }
  }

  return json(404, { message: "Route not found" });
};
