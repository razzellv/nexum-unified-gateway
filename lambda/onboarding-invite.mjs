import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand }       from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand }              from "@aws-sdk/client-ses";
import { randomUUID }                               from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE        = process.env.ONBOARDING_TABLE || "NexumOnboarding";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL   || "noreply@nexumsuum.com";
const FRONTEND_URL = process.env.FRONTEND_URL      || "https://portal.nexumsuum-facilityintelligence.com";

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

const ROLE_DISPLAY = {
  engineer: "Engineer", operator: "Operator", technician: "Technician",
  custodian: "Custodian", manager: "Manager", supervisor: "Supervisor",
  director: "Director", executive: "Executive", officer: "Officer",
  firefighter: "Firefighter", dispatcher: "Dispatcher", ems_tech: "EMS Technician",
  associate: "Associate", clerk: "Clerk", cook: "Cook", cashier: "Cashier",
};

function buildHtmlEmail({ name, role, department, orgName, signupUrl, expiresLabel }) {
  const roleLabel = ROLE_DISPLAY[role] || role || "Team Member";
  const deptLine  = department ? `<p style="margin:4px 0;color:#64748b;font-size:14px;">Department: <strong>${department}</strong></p>` : "";
  const orgLine   = orgName    ? `<p style="margin:4px 0;color:#64748b;font-size:14px;">Organization: <strong>${orgName}</strong></p>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:28px 32px;">
          <p style="margin:0;color:#00ffe1;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Nexum Suum</p>
          <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Facility Intelligence™</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">You've been invited!</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Hi <strong>${name}</strong>,<br><br>
            You've been invited to join your organization on Nexum Suum Facility Intelligence — the platform your team uses to manage operations, compliance, and facility data.
          </p>

          <!-- Role card -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your Access</p>
            <p style="margin:4px 0;color:#0f172a;font-size:16px;font-weight:700;">
              <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:20px;font-size:13px;">${roleLabel}</span>
            </p>
            ${deptLine}
            ${orgLine}
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin:28px 0;">
            <a href="${signupUrl}" style="display:inline-block;background:linear-gradient(135deg,#00bfa6,#0ea5e9);color:#ffffff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
              Accept Invitation &amp; Create Account →
            </a>
          </div>

          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            This link expires ${expiresLabel}. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">
            Nexum Suum Facility Intelligence™ · <a href="${FRONTEND_URL}" style="color:#0ea5e9;text-decoration:none;">portal.nexumsuum-facilityintelligence.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  try {
    const claims = getClaims(event);
    if (!claims) return json(401, { message: "Unauthorized" });

    const facilityId  = claims["custom:facilityId"] || "facility-unknown";
    const orgId       = claims["custom:orgId"]      || "org-unknown";
    const orgName     = claims["custom:orgName"]    || "";
    const invitedBy   = claims["email"]             || claims["sub"];

    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    const { name, email, role, department, orgType } = JSON.parse(raw);

    if (!name || !email) return json(400, { message: "name and email are required" });

    const inviteId  = randomUUID();
    const now       = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const inviteItem = {
      inviteId,
      facilityId,
      orgId,
      orgName,
      name,
      email:      email.trim().toLowerCase(),
      role:       role       || "",
      department: department || "",
      orgType:    orgType    || "",
      invitedBy,
      status:     "pending",
      createdAt:  now,
      expiresAt,
    };

    // Write org-scoped record (for org member listing)
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: { PK: `ORG#${orgId}`, SK: `INVITE#${inviteId}`, ...inviteItem },
    }));

    // Write direct-lookup record (for Register page, no GSI needed)
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: { PK: `INVITE#${inviteId}`, SK: "METADATA", ...inviteItem },
    }));

    const urlParams  = new URLSearchParams({ invite: inviteId, facilityId, email: email.trim().toLowerCase() });
    const signupUrl  = `${FRONTEND_URL}/register?${urlParams.toString()}`;
    const expiresLabel = "in 7 days";

    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `You've been invited to join ${orgName || "Nexum Suum"} — ${name}` },
        Body: {
          Html: { Data: buildHtmlEmail({ name, role, department, orgName, signupUrl, expiresLabel }) },
          Text: {
            Data: `Hi ${name},\n\nYou've been invited to join ${orgName || "your organization"} on Nexum Suum Facility Intelligence.\n\nRole: ${ROLE_DISPLAY[role] || role || "Team Member"}${department ? `\nDepartment: ${department}` : ""}\n\nCreate your account:\n${signupUrl}\n\nThis link expires ${expiresLabel}.\n\n— Nexum Suum`,
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
