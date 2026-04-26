import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE        = process.env.VENDORS_TABLE  || "NexumVendors";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL || "noreply@nexumsuum.com";
const FRONTEND_URL = process.env.FRONTEND_URL   || "https://nexumsuum.com";

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

  console.log("RAW EVENT:", JSON.stringify({
    method: getMethod(event),
    body: event.body,
    isBase64: event.isBase64Encoded,
    claims: getClaims(event),
  }));

  try {
    const claims = getClaims(event);
    if (!claims) return json(401, { message: "Unauthorized" });

    const facilityId = claims["custom:facilityId"];
    const orgId      = claims["custom:orgId"];
    const invitedBy  = claims["email"] || claims["sub"];

    let rawBody = event.body || "{}";
    if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString("utf-8");

    const body = JSON.parse(rawBody);
    console.log("PARSED:", JSON.stringify({ name: body.name, email: body.email, facilityId, orgId }));

    const { name, email, message = "" } = body;
    if (!name || !email) {
      return json(400, { message: "name and email are required", received: { name, email } });
    }

    const inviteToken = randomUUID();
    const now         = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:           `FACILITY#${facilityId}`,
        SK:           `VENDOR_INVITE#${inviteToken}`,
        GSI1PK:       `ORG#${orgId}`,
        GSI1SK:       `VENDOR_INVITE#${now}`,
        inviteToken,
        name,
        email:        email.toLowerCase().trim(),
        facilityId,
        orgId,
        invitedBy,
        inviteStatus: "invited",
        status:       "pending",
        createdAt:    now,
        expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }));

    const params = new URLSearchParams({
      invite:     inviteToken,
      facilityId,
      email:      email.toLowerCase().trim(),
    });
    const signupUrl    = `${FRONTEND_URL}/register?${params.toString()}`;
    const personalNote = message.trim()
      ? `\nMessage from your contact:\n"${message.trim()}"\n`
      : "";

    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `You've been invited to Nexum Suum — ${name}` },
        Body: {
          Text: {
            Data: `You've been invited to join Nexum Suum Facility Intelligence as a vendor partner.\n${personalNote}\nCreate your free account:\n\n${signupUrl}\n\nThis link expires in 7 days.\n\n— Nexum Suum Facility Intelligence`,
          },
        },
      },
    }));

    return json(200, { success: true, inviteToken, message: `Invite sent to ${email}` });

  } catch (err) {
    console.error("vendor-invite error:", err);
    return json(500, { message: "Failed to send invite.", detail: err.message });
  }
};
