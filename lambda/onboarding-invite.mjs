import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE        = process.env.ONBOARDING_TABLE || "NexumOnboarding";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL   || "noreply@nexumsuum.com";
const FRONTEND_URL = process.env.FRONTEND_URL      || "https://nexumsuum.com";

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

    const facilityId  = claims["custom:facilityId"] || "facility-unknown";
    const orgId       = claims["custom:orgId"]      || "org-unknown";
    const invitedBy   = claims["email"]             || claims["sub"];

    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    const { name, email, role, department, orgType } = JSON.parse(raw);

    if (!name || !email) return json(400, { message: "name and email are required" });

    const inviteId    = randomUUID();
    const now         = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:         `ORG#${orgId}`,
        SK:         `INVITE#${inviteId}`,
        inviteId,
        facilityId,
        orgId,
        name,
        email:      email.trim().toLowerCase(),
        role:       role       || "",
        department: department || "",
        orgType:    orgType    || "",
        invitedBy,
        status:     "pending",
        createdAt:  now,
        expiresAt:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }));

    const params = new URLSearchParams({ invite: inviteId, facilityId, email: email.trim().toLowerCase() });
    const signupUrl = `${FRONTEND_URL}/register?${params.toString()}`;

    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `You've been invited to join Nexum Suum — ${name}` },
        Body: {
          Text: {
            Data: `Hi ${name},\n\nYou've been invited to join your organization on Nexum Suum Facility Intelligence.\n\nYour role: ${role || "Team Member"}${department ? `\nDepartment: ${department}` : ""}\n\nCreate your account:\n\n${signupUrl}\n\nThis link expires in 7 days.\n\n— Nexum Suum`,
          },
        },
      },
    }));

    return json(200, { success: true, inviteId });

  } catch (err) {
    console.error("onboarding-invite error:", err);
    return json(500, { message: "Failed to send invite.", detail: err.message });
  }
};
