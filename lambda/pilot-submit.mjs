import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE        = process.env.PILOTS_TABLE   || "NexumPilots";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL || "noreply@nexumsuum.com";
const FRONTEND_URL = process.env.FRONTEND_URL   || "https://portal.nexumsuum-facilityintelligence.com";
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL    || "razzellv@nexumsuum.com";
const USER_POOL_ID = process.env.USER_POOL_ID   || "us-east-2_mKMqaRq70";
const PILOT_TIER   = "business";

const cognito = new CognitoIdentityProviderClient({ region: "us-east-2" });

// Provision Business tier in Cognito if user is already registered
async function provisionCognitoTier(email) {
  try {
    const res = await cognito.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter:     `email = "${email.toLowerCase()}"`,
      Limit:      1,
    }));
    if (!res.Users || res.Users.length === 0) return false;
    await cognito.send(new AdminUpdateUserAttributesCommand({
      UserPoolId:     USER_POOL_ID,
      Username:       res.Users[0].Username,
      UserAttributes: [{ Name: "custom:tier", Value: PILOT_TIER }],
    }));
    return true;
  } catch (err) {
    console.warn("provisionCognitoTier:", err.message);
    return false;
  }
}

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
        UpdateExpression:          "SET #st = :active, activatedAt = :now, GSI1PK = :gsi, pilotTier = :tier",
        ExpressionAttributeNames:  { "#st": "status" },
        ExpressionAttributeValues: {
          ":active": "active",
          ":now":    new Date().toISOString(),
          ":gsi":    "STATUS#active",
          ":tier":   PILOT_TIER,
        },
      }));

      // Provision Business tier in Cognito if the user already has an account.
      // If they don't yet, the cognito-post-confirmation trigger handles it on registration.
      const tierProvisioned = await provisionCognitoTier(app.email);

      return json(200, {
        success:        true,
        appId:          app.appId,
        tier:           PILOT_TIER,
        tierProvisioned,
      });

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
        Subject: { Data: "Thank you for your interest — Nexum Suum Pilot Program" },
        Body: {
          Text: {
            Data: [
              `Hi ${name},`,
              "",
              "Thank you for your interest in becoming a Nexum Suum Pilot Partner.",
              "",
              "We received your application and are reviewing it now. You'll hear from us within 2–3 business days.",
              "",
              "── Pilot Partner Perks ─────────────────────────────────────",
              "As a Pilot Partner, you'll receive:",
              "  · Early access to new platform features before public release",
              "  · Direct input into the product roadmap — your feedback shapes what we build",
              "  · Invitations to Nexum Suum events, webinars, and industry roundtables",
              "  · Priority onboarding support and a dedicated point of contact",
              "  · Company updates and insider announcements before anyone else",
              "  · Business tier access — the full platform, no restrictions",
              "",
              "We're selective about our Pilot Partners because your experience matters.",
              "We want to make sure this is the right fit for both sides.",
              "",
              `Application ID: ${appId}`,
              "",
              "Questions? Reply to this email or reach us at: razzellv@nexumsuum.com",
              "",
              "— Razzel Taylor",
              "  Nexum Suum Facility Intelligence™",
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
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Thank you for your interest.</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Nexum Suum Pilot Partner Program — Application Received</p>
    </div>
    <div style="padding:28px;">
      <p style="color:#e2e8f0;font-size:15px;margin:0 0 8px;">Hi ${name},</p>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">
        We received your application and are reviewing it now. You'll hear from us within <strong style="color:#e2e8f0;">2–3 business days</strong>.
        We're selective about our Pilot Partners because your experience is important to us.
      </p>

      <div style="background:#0d1117;border:1px solid #7c3aed;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#a78bfa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 14px;">Pilot Partner Perks</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;color:#a78bfa;font-size:16px;width:20px;">→</td><td style="padding:5px 0;color:#e2e8f0;font-size:13px;"><strong>Early feature access</strong> — before public release</td></tr>
          <tr><td style="padding:5px 0;color:#a78bfa;font-size:16px;">→</td><td style="padding:5px 0;color:#e2e8f0;font-size:13px;"><strong>Direct product input</strong> — your feedback shapes what we build</td></tr>
          <tr><td style="padding:5px 0;color:#a78bfa;font-size:16px;">→</td><td style="padding:5px 0;color:#e2e8f0;font-size:13px;"><strong>Event & webinar invitations</strong> — roundtables, industry sessions</td></tr>
          <tr><td style="padding:5px 0;color:#a78bfa;font-size:16px;">→</td><td style="padding:5px 0;color:#e2e8f0;font-size:13px;"><strong>Priority onboarding support</strong> — dedicated point of contact</td></tr>
          <tr><td style="padding:5px 0;color:#a78bfa;font-size:16px;">→</td><td style="padding:5px 0;color:#e2e8f0;font-size:13px;"><strong>Insider company updates</strong> — before anyone else hears them</td></tr>
          <tr><td style="padding:5px 0;color:#a78bfa;font-size:16px;">→</td><td style="padding:5px 0;color:#e2e8f0;font-size:13px;"><strong>Business tier access</strong> — full platform, no restrictions</td></tr>
        </table>
      </div>

      <p style="color:#6b7280;font-size:12px;margin:0 0 4px;">Application ID: <span style="color:#a1a1aa;font-family:monospace;">${appId}</span></p>
      <p style="color:#6b7280;font-size:12px;margin:0 0 20px;">
        Questions? Reply to this email or reach us at
        <a href="mailto:razzellv@nexumsuum.com" style="color:#a78bfa;">razzellv@nexumsuum.com</a>
      </p>

      <div style="border-top:1px solid #2d2d4e;padding-top:16px;">
        <p style="color:#6b7280;font-size:12px;margin:0 0 2px;">Razzel Taylor</p>
        <p style="color:#6b7280;font-size:12px;margin:0;">
          Nexum Suum Facility Intelligence™ ·
          <a href="${FRONTEND_URL}" style="color:#a78bfa;">portal.nexumsuum-facilityintelligence.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
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
            Data: `New pilot application received.\n\nName: ${name}\nCompany: ${company}\nEmail: ${email}\nRole: ${role}\nFacilities: ${facilities}\nUse Case: ${useCase}\n\nReview application: ${FRONTEND_URL}/workspace\nApp ID: ${appId}`,
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
