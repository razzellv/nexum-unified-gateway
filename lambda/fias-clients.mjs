import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.FIAS_CLIENTS_TABLE || "NexumFIASClients";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
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

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const userId = claims["sub"];
  const orgId  = claims["custom:orgId"] || `user-${userId}`;
  const method = getMethod(event);
  const path   = getPath(event);

  // ── GET /fias/clients ───────────────────────────────────────────────────────
  if (method === "GET" && path.endsWith("/fias/clients")) {
    try {
      const result = await ddb.send(new QueryCommand({
        TableName:                 TABLE,
        IndexName:                 "GSI1",
        KeyConditionExpression:    "GSI1PK = :org",
        ExpressionAttributeValues: { ":org": `ORG#${orgId}` },
        ScanIndexForward:          false,
      }));

      const clients = (result.Items || []).map((item) => ({
        clientId:     item.clientId,
        name:         item.name,
        facilityType: item.facilityType,
        industry:     item.industry     || "",
        location:     item.location     || "",
        teamSize:     item.teamSize     || "",
        systemCount:  item.systemCount  || "",
        notes:        item.notes        || "",
        status:       item.status       || "pending",
        overallScore: item.overallScore,
        ctsLevel:     item.ctsLevel,
        vvfiTier:     item.vvfiTier,
        createdAt:    item.createdAt,
        updatedAt:    item.updatedAt,
      }));

      return json(200, { clients });
    } catch (err) {
      console.error("fias-clients GET error:", err);
      return json(500, { message: "Failed to list clients.", detail: err.message });
    }
  }

  // ── POST /fias/clients ──────────────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/fias/clients")) {
    try {
      let rawBody = event.body || "{}";
      if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
      const client = JSON.parse(rawBody);

      if (!client.name || !client.facilityType) {
        return json(400, { message: "name and facilityType are required" });
      }

      const clientId = client.clientId || `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const now = new Date().toISOString();

      const item = {
        PK:           `USER#${userId}`,
        SK:           `CLIENT#${clientId}`,
        GSI1PK:       `ORG#${orgId}`,
        GSI1SK:       `CLIENT#${now}`,
        clientId,
        userId,
        orgId,
        name:         client.name,
        facilityType: client.facilityType,
        industry:     client.industry     || "",
        location:     client.location     || "",
        teamSize:     client.teamSize     || "",
        systemCount:  client.systemCount  || "",
        notes:        client.notes        || "",
        status:       client.status       || "pending",
        overallScore: client.overallScore,
        ctsLevel:     client.ctsLevel,
        vvfiTier:     client.vvfiTier,
        createdAt:    client.createdAt    || now,
        updatedAt:    now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

      return json(200, { success: true, clientId });
    } catch (err) {
      console.error("fias-clients POST error:", err);
      return json(500, { message: "Failed to create client.", detail: err.message });
    }
  }

  // ── PUT /fias/clients/{clientId} ────────────────────────────────────────────
  if (method === "PUT" && path.includes("/fias/clients/")) {
    try {
      const clientId = path.split("/fias/clients/")[1];
      let rawBody = event.body || "{}";
      if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
      const updates = JSON.parse(rawBody);
      const now = new Date().toISOString();

      await ddb.send(new UpdateCommand({
        TableName:                 TABLE,
        Key:                       { PK: `USER#${userId}`, SK: `CLIENT#${clientId}` },
        UpdateExpression:          "SET #name = :name, facilityType = :ft, industry = :ind, #loc = :loc, teamSize = :ts, systemCount = :sc, notes = :notes, #status = :status, overallScore = :score, ctsLevel = :cts, vvfiTier = :tier, updatedAt = :now",
        ExpressionAttributeNames:  { "#name": "name", "#loc": "location", "#status": "status" },
        ExpressionAttributeValues: {
          ":name":  updates.name         || "",
          ":ft":    updates.facilityType || "",
          ":ind":   updates.industry     || "",
          ":loc":   updates.location     || "",
          ":ts":    updates.teamSize     || "",
          ":sc":    updates.systemCount  || "",
          ":notes": updates.notes        || "",
          ":status":updates.status       || "pending",
          ":score": updates.overallScore,
          ":cts":   updates.ctsLevel,
          ":tier":  updates.vvfiTier,
          ":now":   now,
        },
      }));

      return json(200, { success: true, clientId });
    } catch (err) {
      console.error("fias-clients PUT error:", err);
      return json(500, { message: "Failed to update client.", detail: err.message });
    }
  }

  // ── DELETE /fias/clients/{clientId} ────────────────────────────────────────
  if (method === "DELETE" && path.includes("/fias/clients/")) {
    try {
      const clientId = path.split("/fias/clients/")[1];
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { PK: `USER#${userId}`, SK: `CLIENT#${clientId}` },
      }));
      return json(200, { success: true });
    } catch (err) {
      console.error("fias-clients DELETE error:", err);
      return json(500, { message: "Failed to delete client.", detail: err.message });
    }
  }

  return json(404, { message: "Not found" });
};
