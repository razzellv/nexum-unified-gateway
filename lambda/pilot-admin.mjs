import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const ddb     = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses     = new SESClient({ region: "us-east-1" });
const cognito = new CognitoIdentityProviderClient({ region: "us-east-2" });

const TABLE        = process.env.PILOTS_TABLE   || "NexumPilots";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL || "info@nexumsuum-facilityintelligence.com";
const FRONTEND_URL = process.env.FRONTEND_URL   || "https://portal.nexumsuum-facilityintelligence.com";
const USER_POOL_ID = process.env.USER_POOL_ID   || "us-east-2_mKMqaRq70";
const PILOT_TIER   = "business";

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

// ── Provision Business tier in Cognito if user already exists ─────────────────
// Non-fatal: user may not have registered yet — post-confirmation trigger handles it
async function provisionCognitoTier(email) {
  try {
    const result = await cognito.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter:     `email = "${email.toLowerCase()}"`,
      Limit:      1,
    }));

    if (!result.Users || result.Users.length === 0) return { provisioned: false, reason: "user_not_found" };

    const username = result.Users[0].Username;
    await cognito.send(new AdminUpdateUserAttributesCommand({
      UserPoolId:     USER_POOL_ID,
      Username:       username,
      UserAttributes: [
        { Name: "custom:tier", Value: PILOT_TIER },
      ],
    }));

    return { provisioned: true, username };
  } catch (err) {
    console.warn("Cognito tier provision skipped:", err.message);
    return { provisioned: false, reason: err.message };
  }
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  // Admin-only: razzellv@nexumsuum.com or custom:role = admin
  const email = claims.email || "";
  const role  = claims["custom:role"] || "";
  const isAdmin = role === "admin" ||
    email.endsWith("@nexumsuum.com") ||
    email.endsWith("@nexumsuum-facilityintelligence.com");
  if (!isAdmin) return json(403, { message: "Admin only" });

  const method = getMethod(event);

  // ── GET /pilot-applications ─────────────────────────────────────────────────
  if (method === "GET") {
    try {
      const statuses = ["pending", "in_progress", "approved", "declined", "active", "discarded"];
      const allItems = [];

      for (const status of statuses) {
        const result = await ddb.send(new QueryCommand({
          TableName:                 TABLE,
          IndexName:                 "GSI1",
          KeyConditionExpression:    "GSI1PK = :status",
          ExpressionAttributeValues: { ":status": `STATUS#${status}` },
        }));
        allItems.push(...(result.Items || []));
      }

      // Sort newest first
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return json(200, { applications: allItems });

    } catch (err) {
      console.error("GET /pilot-applications:", err);
      return json(500, { message: "Failed to fetch applications.", detail: err.message });
    }
  }

  // ── POST /pilot-applications/{id}/{action} ──────────────────────────────────
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
        action === "in_progress" ? "in_progress" :
        action === "activate"    ? "active"      : action;

      // Fetch existing record
      const existing = await ddb.send(new QueryCommand({
        TableName:                 TABLE,
        KeyConditionExpression:    "PK = :pk AND SK = :sk",
        ExpressionAttributeValues: { ":pk": `PILOT#${appId}`, ":sk": "META" },
      }));

      const app = existing.Items?.[0];
      if (!app) return json(404, { message: "Application not found" });

      const now       = new Date().toISOString();
      let   pilotCode = app.pilotCode;
      let   cognitoResult = null;

      if (action === "approve" && !pilotCode) pilotCode = genCode();

      // Always store pilotTier = "business" on approve
      const setTierExpr  = action === "approve" ? ", pilotTier = :tier" : "";
      const tierVal      = action === "approve" ? { ":tier": PILOT_TIER } : {};

      await ddb.send(new UpdateCommand({
        TableName:                TABLE,
        Key:                      { PK: `PILOT#${appId}`, SK: "META" },
        UpdateExpression:
          "SET #st = :status, GSI1PK = :gsi, updatedAt = :now" +
          (notes     ? ", adminNotes = :notes"              : "") +
          (pilotCode ? ", pilotCode = :code, approvedAt = :now" : "") +
          (action === "decline" ? ", declinedAt = :now"    : "") +
          setTierExpr,
        ExpressionAttributeNames:  { "#st": "status" },
        ExpressionAttributeValues: {
          ":status": newStatus,
          ":gsi":    `STATUS#${newStatus}`,
          ":now":    now,
          ...(notes     ? { ":notes": notes }    : {}),
          ...(pilotCode ? { ":code":  pilotCode } : {}),
          ...tierVal,
        },
      }));

      // Provision Business tier in Cognito immediately if user already exists
      if (action === "approve" && app.email) {
        cognitoResult = await provisionCognitoTier(app.email);
      }

      // Approval email — rich HTML version
      if (action === "approve" && app.email) {
        await ses.send(new SendEmailCommand({
          Source:      FROM_EMAIL,
          Destination: { ToAddresses: [app.email] },
          Message: {
            Subject: { Data: "You're in — Nexum Suum FI Pilot Program" },
            Body: {
              Text: {
                Data: [
                  `Hi ${app.name},`,
                  "",
                  "Congratulations — you've been approved for the Nexum Suum Facility Intelligence Pilot Program.",
                  "",
                  `Your pilot access code: ${pilotCode}`,
                  `Tier granted: Business (full platform access)`,
                  "",
                  "To activate:",
                  `1. Go to ${FRONTEND_URL}/pricing`,
                  `2. Click "Apply for Pilot access"`,
                  `3. Click "Already have a code?" and enter: ${pilotCode}`,
                  `4. Use the email address you applied with: ${app.email}`,
                  "",
                  "You'll be redirected to register (or log in if you already have an account).",
                  "Your account will automatically reflect Business tier access.",
                  "",
                  notes ? `Note from our team: ${notes}\n` : "",
                  "Welcome to the program.",
                  "— Nexum Suum",
                ].join("\n"),
              },
              Html: {
                Data: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#0f0f1a;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2d2d4e;">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:24px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">You're in. 🎉</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Nexum Suum FI Pilot Program — Approved</p>
    </div>
    <div style="padding:28px;">
      <p style="color:#e2e8f0;font-size:15px;margin:0 0 16px;">Hi ${app.name},</p>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">Your application has been approved. Here is everything you need to get started.</p>

      <div style="background:#0f172a;border:1px solid #7c3aed;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#a78bfa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px;">Your Pilot Access Code</p>
        <p style="color:#fff;font-size:26px;font-weight:700;font-family:monospace;letter-spacing:.12em;margin:0;">${pilotCode}</p>
        <p style="color:#6b7280;font-size:11px;margin:6px 0 0;">Tier: <span style="color:#34d399;font-weight:600;">Business — Full Platform Access</span></p>
      </div>

      <div style="margin-bottom:24px;">
        <p style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 10px;">How to activate:</p>
        <ol style="color:#a1a1aa;font-size:13px;padding-left:20px;margin:0;line-height:1.8;">
          <li>Go to <a href="${FRONTEND_URL}/pricing" style="color:#a78bfa;">${FRONTEND_URL}/pricing</a></li>
          <li>Click <strong style="color:#e2e8f0;">"Apply for Pilot access"</strong></li>
          <li>Click <strong style="color:#e2e8f0;">"Already have a code?"</strong></li>
          <li>Enter code <strong style="color:#fff;font-family:monospace;">${pilotCode}</strong> and your email: <strong style="color:#e2e8f0;">${app.email}</strong></li>
        </ol>
      </div>

      ${notes ? `<div style="background:#1e1b4b;border-left:3px solid #7c3aed;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:20px;"><p style="color:#a78bfa;font-size:11px;font-weight:700;margin:0 0 4px;text-transform:uppercase;">Note from our team</p><p style="color:#c4b5fd;font-size:13px;margin:0;">${notes}</p></div>` : ""}

      <p style="color:#6b7280;font-size:12px;border-top:1px solid #2d2d4e;padding-top:16px;margin:24px 0 0;">
        Nexum Suum Facility Intelligence · <a href="${FRONTEND_URL}" style="color:#a78bfa;">portal.nexumsuum-facilityintelligence.com</a>
      </p>
    </div>
  </div>
</body>
</html>`,
              },
            },
          },
        }));
      }

      // Decline email
      if (action === "decline" && app.email) {
        await ses.send(new SendEmailCommand({
          Source:      FROM_EMAIL,
          Destination: { ToAddresses: [app.email] },
          Message: {
            Subject: { Data: "Nexum Suum Pilot Application Update" },
            Body: {
              Text: {
                Data: `Hi ${app.name},\n\nThank you for your interest in the Nexum Suum Facility Intelligence Pilot Program. We're unable to offer you a spot at this time.\n\n${notes ? `Note from our team: ${notes}\n\n` : ""}We'll keep your application on file and may reach out in the future.\n\n— Nexum Suum`,
              },
            },
          },
        }));
      }

      return json(200, {
        success:        true,
        appId,
        newStatus,
        pilotCode:      pilotCode     || null,
        pilotTier:      action === "approve" ? PILOT_TIER : null,
        cognitoTierSet: cognitoResult?.provisioned ?? null,
      });

    } catch (err) {
      console.error("action /pilot-applications:", err);
      return json(500, { message: "Failed to update application.", detail: err.message });
    }
  }

  return json(405, { message: "Method not allowed" });
};
