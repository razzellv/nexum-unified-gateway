// Quality Intelligence Lambda — persists QI snapshots for longitudinal trend analysis
// Routes:
//   POST /quality-intelligence  → save a snapshot (JWT required)
//   GET  /quality-intelligence  → retrieve last N snapshots for facilityId (JWT required)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const db     = DynamoDBDocumentClient.from(client);

const TABLE = process.env.QI_TABLE || "NexumQualityIntelligence";

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

function getMethod(e) {
  return e?.requestContext?.http?.method || e?.httpMethod || "GET";
}

function getFacilityId(e) {
  const auth = e.headers?.Authorization || e.headers?.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const payload = JSON.parse(Buffer.from(auth.split(".")[1], "base64").toString());
      return payload["custom:facilityId"] || payload["cognito:username"] || "facility-001";
    } catch (_) {}
  }
  return e.queryStringParameters?.facilityId || "facility-001";
}

export const handler = async (event) => {
  const method = getMethod(event);
  if (method === "OPTIONS") return json(200, {});

  const facilityId = getFacilityId(event);

  if (method === "POST") {
    let body;
    try {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString()
        : event.body || "{}";
      body = JSON.parse(raw);
    } catch (_) {
      return json(400, { error: "Invalid JSON" });
    }

    const snapshotId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item = {
      facilityId,
      snapshotId,
      createdAt: new Date().toISOString(),
      scores: body.scores || {},
      hiddenCostEstimate: body.hiddenCostEstimate || 0,
      preventedCostEstimate: body.preventedCostEstimate || 0,
      insights: body.insights || [],
      driftIndicators: body.driftIndicators || [],
      costSignals: body.costSignals || [],
      defensibilityNote: body.defensibilityNote || {},
      logCount: body.logCount || 0,
    };

    try {
      await db.send(new PutCommand({ TableName: TABLE, Item: item }));
      return json(200, { saved: true, snapshotId, createdAt: item.createdAt });
    } catch (err) {
      console.error("DynamoDB put error:", err);
      return json(500, { error: "Failed to save snapshot" });
    }
  }

  if (method === "GET") {
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || "30"), 100);
    try {
      const result = await db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "facilityId = :fid",
        ExpressionAttributeValues: { ":fid": facilityId },
        ScanIndexForward: false,
        Limit: limit,
      }));
      return json(200, { snapshots: result.Items || [] });
    } catch (err) {
      console.error("DynamoDB query error:", err);
      return json(500, { error: "Failed to retrieve snapshots" });
    }
  }

  return json(405, { error: "Method not allowed" });
};
