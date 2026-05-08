// ── fi-fias-clients Lambda ────────────────────────────────────────────────────
// FIAS — Facility Intelligence Assessment System client management
//
// JWT-protected routes:
//   GET    /fias/clients          — list all FIAS clients for this advisor
//   POST   /fias/clients          — create a new FIAS client
//   PATCH  /fias/clients/{id}     — update client fields / assessment scores
//   DELETE /fias/clients/{id}     — remove a client

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb   = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.FIAS_TABLE || "FIASClients";

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
function advisorId(c)  { return c?.sub || c?.username || "advisor-001"; }

function newId() {
  return `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function mapClient(item) {
  return {
    clientId:         item.clientId         || item.SK?.split("#")[1] || "",
    name:             item.name             || "",
    facilityType:     item.facilityType     || "",
    industry:         item.industry         || "",
    location:         item.location         || "",
    teamSize:         item.teamSize         || "",
    systemCount:      item.systemCount      || "",
    status:           item.status           || "pending",
    notes:            item.notes            || "",
    overallScore:     item.overallScore     ?? undefined,
    ctsLevel:         item.ctsLevel         ?? undefined,
    lastAssessmentAt: item.lastAssessmentAt || undefined,
    vvfiTier:         item.vvfiTier         || undefined,
    vvfiEnrolledAt:   item.vvfiEnrolledAt   || undefined,
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

  const aid = advisorId(claims);

  // ── GET /fias/clients ────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/fias/clients") || path.includes("/fias/clients?"))) {
    try {
      const qs     = event.queryStringParameters || {};
      const limit  = Math.min(parseInt(qs.limit || "200"), 500);
      const status = qs.status;

      const params = {
        TableName:                 TABLE,
        KeyConditionExpression:    "advisorId = :aid",
        ExpressionAttributeValues: { ":aid": aid },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      if (status) {
        params.FilterExpression                  = "#st = :status";
        params.ExpressionAttributeNames          = { "#st": "status" };
        params.ExpressionAttributeValues[":status"] = status;
      }

      const result  = await ddb.send(new QueryCommand(params));
      const clients = (result.Items || []).map(mapClient);

      return json(200, { clients, count: clients.length });
    } catch (err) {
      console.error("GET /fias/clients:", err);
      return json(500, { message: "Failed to fetch clients.", detail: err.message });
    }
  }

  // ── POST /fias/clients ───────────────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/fias/clients")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);

      if (!body.name) return json(400, { message: "name is required" });

      const now      = new Date().toISOString();
      const clientId = body.clientId || newId();

      const item = {
        advisorId:        aid,
        clientId,
        name:             body.name,
        facilityType:     body.facilityType     || "",
        industry:         body.industry         || "",
        location:         body.location         || "",
        teamSize:         body.teamSize         || "",
        systemCount:      body.systemCount      || "",
        status:           body.status           || "pending",
        notes:            body.notes            || "",
        overallScore:     body.overallScore     ?? undefined,
        ctsLevel:         body.ctsLevel         ?? undefined,
        lastAssessmentAt: body.lastAssessmentAt || undefined,
        vvfiTier:         body.vvfiTier         || undefined,
        vvfiEnrolledAt:   body.vvfiEnrolledAt   || undefined,
        createdAt:        body.createdAt        || now,
        updatedAt:        now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return json(200, { success: true, clientId, client: mapClient(item) });
    } catch (err) {
      console.error("POST /fias/clients:", err);
      return json(500, { message: "Failed to create client.", detail: err.message });
    }
  }

  // ── PATCH /fias/clients/{id} ─────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/fias/clients/")) {
    try {
      const clientId = decodeURIComponent(path.split("/fias/clients/")[1].split("?")[0]);
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();

      const setExprs = ["updatedAt = :now"];
      const names    = {};
      const vals     = { ":now": now };

      if (body.name            !== undefined) { setExprs.push("#nm = :name");    names["#nm"] = "name";   vals[":name"]   = body.name; }
      if (body.facilityType    !== undefined) { setExprs.push("facilityType = :ft");                       vals[":ft"]     = body.facilityType; }
      if (body.industry        !== undefined) { setExprs.push("industry = :ind");                           vals[":ind"]    = body.industry; }
      if (body.location        !== undefined) { setExprs.push("#loc = :loc");    names["#loc"] = "location"; vals[":loc"]  = body.location; }
      if (body.teamSize        !== undefined) { setExprs.push("teamSize = :ts");                            vals[":ts"]    = body.teamSize; }
      if (body.systemCount     !== undefined) { setExprs.push("systemCount = :sc");                         vals[":sc"]    = body.systemCount; }
      if (body.status          !== undefined) { setExprs.push("#st = :st");      names["#st"] = "status"; vals[":st"]    = body.status; }
      if (body.notes           !== undefined) { setExprs.push("notes = :notes");                            vals[":notes"] = body.notes; }
      if (body.overallScore    !== undefined) { setExprs.push("overallScore = :os");                        vals[":os"]    = body.overallScore; }
      if (body.ctsLevel        !== undefined) { setExprs.push("ctsLevel = :ctl");                           vals[":ctl"]   = body.ctsLevel; }
      if (body.lastAssessmentAt !== undefined) { setExprs.push("lastAssessmentAt = :la");                   vals[":la"]    = body.lastAssessmentAt; }
      if (body.vvfiTier        !== undefined) { setExprs.push("vvfiTier = :vt");                            vals[":vt"]    = body.vvfiTier; }
      if (body.vvfiEnrolledAt  !== undefined) { setExprs.push("vvfiEnrolledAt = :ve");                      vals[":ve"]    = body.vvfiEnrolledAt; }

      const params = {
        TableName:                 TABLE,
        Key:                       { advisorId: aid, clientId },
        UpdateExpression:          "SET " + setExprs.join(", "),
        ExpressionAttributeValues: vals,
      };
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;

      await ddb.send(new UpdateCommand(params));
      return json(200, { success: true, clientId });
    } catch (err) {
      console.error("PATCH /fias/clients:", err);
      return json(500, { message: "Failed to update client.", detail: err.message });
    }
  }

  // ── DELETE /fias/clients/{id} ────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/fias/clients/")) {
    try {
      const clientId = decodeURIComponent(path.split("/fias/clients/")[1].split("?")[0]);
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { advisorId: aid, clientId },
      }));
      return json(200, { success: true });
    } catch (err) {
      console.error("DELETE /fias/clients:", err);
      return json(500, { message: "Failed to delete client.", detail: err.message });
    }
  }

  return json(404, { message: "Route not found" });
};
