// GET /invite/lookup?inviteId=UUID
// Public endpoint (no auth) — called by Register page to hydrate invite data.
// Reads from NexumOnboarding table via direct key: PK=INVITE#<id>, SK=METADATA

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand }       from "@aws-sdk/lib-dynamodb";

const ddb   = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.ONBOARDING_TABLE || "NexumOnboarding";

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

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "";
  if (method === "OPTIONS") return json(200, {});
  if (method !== "GET")     return json(405, { message: "Method not allowed" });

  const inviteId = event.queryStringParameters?.inviteId || "";
  if (!inviteId) return json(400, { message: "inviteId is required" });

  try {
    const result = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `INVITE#${inviteId}`, SK: "METADATA" },
    }));

    if (!result.Item) return json(404, { message: "Invite not found or expired." });

    const item = result.Item;

    // Check expiry
    if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
      return json(410, { message: "expired", detail: "This invite link has expired. Ask your admin to resend it." });
    }

    // Return safe subset — no internal DynamoDB keys
    return json(200, {
      inviteId:   item.inviteId,
      facilityId: item.facilityId  || "",
      orgId:      item.orgId       || "",
      orgType:    item.orgType     || "",
      orgName:    item.orgName     || "",
      name:       item.name        || "",
      email:      item.email       || "",
      role:       item.role        || "",
      department: item.department  || "",
      status:     item.status      || "pending",
    });
  } catch (err) {
    console.error("invite-lookup error:", err);
    return json(500, { message: "Failed to load invite.", detail: err.message });
  }
};
