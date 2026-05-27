// ── fi-messages Lambda ────────────────────────────────────────────────────────
// FI Platform — Facility Messaging / Announcements
//
// JWT-protected routes:
//   GET    /messages             — list messages for facility (inbox + sent)
//   POST   /messages             — send a new message
//   PATCH  /messages/{id}        — mark read / update status
//   DELETE /messages/{id}        — delete a message

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID }                              from "crypto";

const ddb   = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.MESSAGES_TABLE || "NexumMessages";

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

  // ── GET /messages ─────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/messages") || path.includes("/messages?"))) {
    try {
      const qs    = event.queryStringParameters || {};
      const limit = Math.min(parseInt(qs.limit || "50"), 200);
      const type  = qs.type; // "inbox" | "sent" | "announcement" | undefined (all)

      let params = {
        TableName:                 TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      if (type) {
        params.FilterExpression = "msgType = :t";
        params.ExpressionAttributeValues[":t"] = type;
      }

      const result   = await ddb.send(new QueryCommand(params));
      const messages = result.Items || [];
      return json(200, { messages, count: messages.length });
    } catch (err) {
      // Table not yet created — return empty instead of 500
      if (err.name === "ResourceNotFoundException") {
        console.warn("NexumMessages table not found — returning empty");
        return json(200, { messages: [], count: 0 });
      }
      console.error("GET /messages:", err);
      return json(500, { message: "Failed to fetch messages.", detail: err.message });
    }
  }

  // ── POST /messages ────────────────────────────────────────────────────────
  if (method === "POST" && (path.endsWith("/messages") || path.includes("/messages?"))) {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
      const { subject, content, toUserId, toRole, msgType = "message", priority = "normal" } = body;

      if (!content) return json(400, { message: "content is required." });

      const id  = randomUUID();
      const now = new Date().toISOString();
      const item = {
        PK:         `FACILITY#${fid}`,
        SK:         `MSG#${now}#${id}`,
        messageId:  id,
        facilityId: fid,
        fromUserId: claims.sub,
        fromName:   claims.name || claims.email || "Unknown",
        toUserId:   toUserId || null,
        toRole:     toRole   || null,
        subject:    subject  || "(no subject)",
        content,
        msgType,
        priority,
        read:       false,
        createdAt:  now,
        updatedAt:  now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return json(201, { message: item });
    } catch (err) {
      console.error("POST /messages:", err);
      return json(500, { message: "Failed to send message.", detail: err.message });
    }
  }

  // ── PATCH /messages/{id} ──────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/messages/")) {
    try {
      const id   = path.split("/messages/")[1].split("?")[0];
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
      const now  = new Date().toISOString();

      const sets  = ["updatedAt = :ua"];
      const vals  = { ":ua": now, ":pk": `FACILITY#${fid}` };
      const names = {};

      if (body.read    !== undefined) { sets.push("#rd = :rd");  vals[":rd"] = body.read;    names["#rd"] = "read"; }
      if (body.status  !== undefined) { sets.push("#st = :st");  vals[":st"] = body.status;  names["#st"] = "status"; }
      if (body.content !== undefined) { sets.push("content = :ct"); vals[":ct"] = body.content; }

      await ddb.send(new UpdateCommand({
        TableName:                 TABLE,
        Key:                       { PK: `FACILITY#${fid}`, SK: `MSG#${id}` },
        UpdateExpression:          `SET ${sets.join(", ")}`,
        ExpressionAttributeValues: vals,
        ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
        ConditionExpression:       "PK = :pk",
      }));
      return json(200, { messageId: id, updatedAt: now });
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") return json(404, { message: "Message not found." });
      console.error("PATCH /messages/{id}:", err);
      return json(500, { message: "Failed to update message.", detail: err.message });
    }
  }

  // ── DELETE /messages/{id} ─────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/messages/")) {
    try {
      const id = path.split("/messages/")[1].split("?")[0];
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { PK: `FACILITY#${fid}`, SK: `MSG#${id}` },
      }));
      return json(200, { messageId: id, deleted: true });
    } catch (err) {
      console.error("DELETE /messages/{id}:", err);
      return json(500, { message: "Failed to delete message.", detail: err.message });
    }
  }

  return json(404, { message: "Not found." });
};
