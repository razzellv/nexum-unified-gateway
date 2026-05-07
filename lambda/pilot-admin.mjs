import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE        = process.env.PILOTS_TABLE   || "NexumPilots";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL || "info@nexumsuum-facilityintelligence.com";
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

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "NXS-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });
  if (claims["custom:role"] !== "admin") return json(403, { message: "Admin only" });

  const method = getMethod(event);

  // ── GET /pilot-applications ─────────────────────────────────────────────────
  if (method === "GET") {
    try {
      const statuses  = ["pending", "in_progress", "approved", "declined", "active", "discarded"];
      const allItems  = [];

      for (const status of statuses) {
        const result = await ddb.send(new QueryCommand({
          TableName:                 TABLE,
          IndexName:                 "GSI1",
          KeyConditionExpression:    "GSI1PK = :status",
          ExpressionAttributeValues: { ":status": `STATUS#${status}` },
        }));
        allItems.push(...(result.Items || []));
      }

      return json(200, { applications: allItems });

    } catch (err) {
      console.error("get pilots error:", err);
      return json(500, { message: "Failed to fetch applications.", detail: err.message });
    }
  }

  // ── POST|PATCH /pilot-applications/{id}/{action} ────────────────────────────
  if (method === "POST" || method === "PATCH") {
    try {
      const pathParts = (event?.requestContext?.http?.path || event?.path || "").split("/");
      const appId     = pathParts[pathParts.length - 2];
      const action    = pathParts[pathParts.length - 1];

      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const { notes } = JSON.parse(raw);

      const newStatus =
        action === "approve"     ? "approved"    :
        action === "decline"     ? "declined"    :
        action === "discard"     ? "discarded"   :
        action === "in_progress" ? "in_progress" : action;

      // Fetch existing record for email + code check
      const existing = await ddb.send(new QueryCommand({
        TableName:                 TABLE,
        KeyConditionExpression:    "PK = :pk AND SK = :sk",
        ExpressionAttributeValues: { ":pk": `PILOT#${appId}`, ":sk": "META" },
      }));

      const app = existing.Items?.[0];
      if (!app) return json(404, { message: "Application not found" });

      const now       = new Date().toISOString();
      let   pilotCode = app.pilotCode;

      if (action === "approve" && !pilotCode) pilotCode = genCode();

      await ddb.send(new UpdateCommand({
        TableName:                TABLE,
        Key:                      { PK: `PILOT#${appId}`, SK: "META" },
        UpdateExpression:
          "SET #st = :status, GSI1PK = :gsi, updatedAt = :now" +
          (notes     ? ", adminNotes = :notes" : "") +
          (pilotCode ? ", pilotCode = :code, approvedAt = :now" : "") +
          (action === "decline" ? ", declinedAt = :now" : ""),
        ExpressionAttributeNames:  { "#st": "status" },
        ExpressionAttributeValues: {
          ":status": newStatus,
          ":gsi":    `STATUS#${newStatus}`,
          ":now":    now,
          ...(notes     ? { ":notes": notes }     : {}),
          ...(pilotCode ? { ":code": pilotCode }  : {}),
        },
      }));

      // Approval email
      if (action === "approve" && app.email) {
        await ses.send(new SendEmailCommand({
          Source:      FROM_EMAIL,
          Destination: { ToAddresses: [app.email] },
          Message: {
            Subject: { Data: "You're approved — Nexum Suum Pilot Program" },
            Body: {
              Text: {
                Data: `Hi ${app.name},\n\nCongratulations — you've been approved for the Nexum Suum Pilot Program.\n\nYour access code: ${pilotCode}\n\nEnter it at:\n${FRONTEND_URL}/pricing\n(click "Apply for Pilot access" → "Already have a code?")\n\nWelcome aboard.\n\n— Nexum Suum`,
              },
            },
          },
        }));
      }

      // Decline email
      if (action === "decline" && app.email) {
        await ses.send(new SendEmailCommand({
          Source:      "noreply@nexumsuum.com",
          Destination: { ToAddresses: [app.email] },
          Message: {
            Subject: { Data: "Nexum Suum Pilot Application Update" },
            Body: {
              Text: {
                Data: `Hi ${app.name},\n\nThank you for your interest in the Nexum Suum Pilot Program. Unfortunately, we're unable to offer you a spot at this time.\n\n${notes ? `Note from our team: ${notes}\n\n` : ""}We'll keep your application on file.\n\n— Nexum Suum`,
              },
            },
          },
        }));
      }

      return json(200, { success: true, appId, newStatus, pilotCode: pilotCode || null });

    } catch (err) {
      console.error("patch pilot error:", err);
      return json(500, { message: "Failed to update application.", detail: err.message });
    }
  }

  return json(405, { message: "Method not allowed" });
};
