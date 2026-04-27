import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
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

function getClaims(e) {
  return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null;
}
function getMethod(e) {
  return e?.requestContext?.http?.method || e?.httpMethod || "";
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  try {
    const claims = getClaims(event);
    if (!claims) return json(401, { message: "Unauthorized" });

    const facilityId = claims["custom:facilityId"] || "facility-unknown";
    const orgId      = claims["custom:orgId"]      || "org-unknown";

    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    const body = JSON.parse(raw);

    // body contains all utilities fields + budget object
    const { budget, ...utilities } = body;

    const now = new Date().toISOString();

    // Save utilities
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:        `ORG#${orgId}`,
        SK:        `UTILITIES#${facilityId}`,
        orgId,
        facilityId,
        ...utilities,
        updatedAt: now,
      },
    }));

    // Save budget separately if provided
    if (budget) {
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: {
          PK:        `ORG#${orgId}`,
          SK:        `BUDGET#${facilityId}`,
          orgId,
          facilityId,
          annualTotal:     budget.annualTotal     || 0,
          fiscalYearStart: budget.fiscalYearStart || "January",
          trackActuals:    budget.trackActuals    || false,
          notes:           budget.notes           || "",
          departments:     budget.departments     || [],
          updatedAt:       now,
        },
      }));
    }

    return json(200, { success: true, facilityId, orgId });

  } catch (err) {
    console.error("onboarding-utilities error:", err);
    return json(500, { message: "Failed to save utilities.", detail: err.message });
  }
};
