import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.FIAS_TABLE || "NexumFIAS";

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

    const facilityId = claims["custom:facilityId"] || "facility-unknown";
    const orgId      = claims["custom:orgId"]      || "org-unknown";
    const assessorId = claims["sub"];

    let rawBody = event.body || "{}";
    if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    const session = JSON.parse(rawBody);

    if (!session.sessionId || !session.fiasScore) {
      return json(400, { message: "sessionId and fiasScore are required" });
    }

    const now = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      ConditionExpression: "attribute_not_exists(SK)", // sealed records cannot be overwritten
      Item: {
        PK:      `FACILITY#${facilityId}`,
        SK:      `FIAS#${session.sessionId}`,
        GSI1PK:  `ORG#${orgId}`,
        GSI1SK:  `FIAS#${session.sealedAt || now}`,
        ...session,
        facilityId,
        orgId,
        assessorId,
        sealed:    true,
        createdAt: now,
      },
    }));

    return json(200, { success: true, sessionId: session.sessionId, fiasScore: session.fiasScore });

  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(409, { message: "Sealed record already exists — cannot overwrite." });
    }
    console.error("fias-session error:", err);
    return json(500, { message: "Failed to save FIAS session.", detail: err.message });
  }
};
