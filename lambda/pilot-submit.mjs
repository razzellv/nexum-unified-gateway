import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE        = process.env.PILOTS_TABLE   || "NexumPilots";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL || "noreply@nexumsuum.com";
const FRONTEND_URL = process.env.FRONTEND_URL   || "https://nexumsuum.com";
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL    || "razzellv@nexumsuum.com";

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

function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "";
}

function getPath(event) {
  return event?.requestContext?.http?.path || event?.path || "";
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const path = getPath(event);

  // ── POST /pilot-verify ──────────────────────────────────────────────────────
  if (path.includes("pilot-verify")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const { code, email } = JSON.parse(raw);

      if (!code || !email) return json(400, { message: "code and email are required" });

      const result = await ddb.send(new QueryCommand({
        TableName:                 TABLE,
        IndexName:                 "GSI1",
        KeyConditionExpression:    "GSI1PK = :status",
        FilterExpression:          "pilotCode = :code AND email = :email",
        ExpressionAttributeValues: {
          ":status": "STATUS#approved",
          ":code":   code.trim().toUpperCase(),
          ":email":  email.trim().toLowerCase(),
        },
      }));

      if (!result.Items || result.Items.length === 0) {
        return json(404, { message: "Invalid code or email. Check your approval email and try again." });
      }

      const app = result.Items[0];

      await ddb.send(new UpdateCommand({
        TableName:                 TABLE,
        Key:                       { PK: app.PK, SK: "META" },
        UpdateExpression:          "SET #st = :active, activatedAt = :now, GSI1PK = :gsi",
        ExpressionAttributeNames:  { "#st": "status" },
        ExpressionAttributeValues: {
          ":active": "active",
          ":now":    new Date().toISOString(),
          ":gsi":    "STATUS#active",
        },
      }));

      return json(200, { success: true, appId: app.appId, tier: app.tier || "Business" });

    } catch (err) {
      console.error("pilot-verify error:", err);
      return json(500, { message: "Verification failed.", detail: err.message });
    }
  }

  // ── POST /pilot-application ─────────────────────────────────────────────────
  try {
    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    const body = JSON.parse(raw);

    const {
      name, company, email, role, facilities, useCase,
      tier, promoId, supportAddon, agreedToResponsibilities,
    } = body;

    if (!name || !email) return json(400, { message: "name and email are required" });

    const appId = randomUUID();
    const now   = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:      `PILOT#${appId}`,
        SK:      "META",
        GSI1PK:  "STATUS#pending",
        GSI1SK:  `CREATED#${now}`,
        appId,
        name,
        company:   company   || "",
        email:     email.trim().toLowerCase(),
        role:      role      || "",
        facilities: facilities || "",
        useCase:   useCase   || "",
        tier:      tier      || "Business",
        promoId:   promoId   || null,
        supportAddon: supportAddon || null,
        agreedToResponsibilities: agreedToResponsibilities || false,
        status:    "pending",
        createdAt: now,
      },
    }));

    // Confirmation to applicant
    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Nexum Suum Pilot Application Received" },
        Body: {
          Text: {
            Data: `Hi ${name},\n\nWe received your pilot application for Nexum Suum Facility Intelligence.\n\nWe review applications within 2–3 business days. You'll receive an email with your approval code if selected.\n\nApplication ID: ${appId}\n\n— Nexum Suum`,
          },
        },
      },
    }));

    // Admin notification
    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [ADMIN_EMAIL] },
      Message: {
        Subject: { Data: `New Pilot Application — ${name} (${company || "no company"})` },
        Body: {
          Text: {
            Data: `New pilot application received.\n\nName: ${name}\nCompany: ${company}\nEmail: ${email}\nRole: ${role}\nFacilities: ${facilities}\nUse Case: ${useCase}\n\nReview in NexumWorkspace → Pilot tab.\nApp ID: ${appId}`,
          },
        },
      },
    }));

    return json(200, { success: true, appId });

  } catch (err) {
    console.error("pilot-application error:", err);
    return json(500, { message: "Failed to submit application.", detail: err.message });
  }
};
