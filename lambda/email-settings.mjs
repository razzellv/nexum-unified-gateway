import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.SETTINGS_TABLE || "NexumSettings";

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

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  try {
    const claims = getClaims(event);
    if (!claims) return json(401, { message: "Unauthorized" });
    if (claims["custom:role"] !== "admin") return json(403, { message: "Admin only" });

    const orgId  = claims["custom:orgId"] || "global";
    const method = getMethod(event);

    // GET /email-settings
    if (method === "GET") {
      const result = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key:       { PK: `ORG#${orgId}`, SK: "EMAIL_SETTINGS" },
      }));
      return json(200, { settings: result.Item?.settings || null });
    }

    // POST /email-settings
    let rawBody = event.body || "{}";
    if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    const { settings } = JSON.parse(rawBody);

    if (!settings) return json(400, { message: "settings object is required" });

    const now = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:        `ORG#${orgId}`,
        SK:        "EMAIL_SETTINGS",
        settings,
        orgId,
        updatedAt: now,
        updatedBy: claims["sub"],
      },
    }));

    return json(200, { success: true, savedAt: now });

  } catch (err) {
    console.error("email-settings error:", err);
    return json(500, { message: "Failed to save email settings.", detail: err.message });
  }
};
