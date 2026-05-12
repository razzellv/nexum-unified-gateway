// ── fi-intake Lambda ──────────────────────────────────────────────────────────
// FI Platform — Intake Form Submission Handler (public, no auth)
//
// Routes:
//   POST /intake   — receive IntakeFormWidget submission, store lead, email admin

import { DynamoDBClient }         from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient,
         PutCommand }             from "@aws-sdk/lib-dynamodb";
import { SESClient,
         SendEmailCommand }       from "@aws-sdk/client-ses";
import { randomUUID }             from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE       = process.env.LEADS_TABLE    || "NexumLeads";
const FROM_EMAIL  = process.env.SES_FROM_EMAIL || "info@nexumsuum-facilityintelligence.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL    || "razzellv@nexumsuum.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                 "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};

    const {
      fullName, workEmail, title, company,
      facilityType, numFacilities, systems = [],
      challenges = [], need, submittedAt,
    } = body;

    if (!workEmail) return json(400, { message: "workEmail is required." });

    const id  = randomUUID();
    const now = submittedAt || new Date().toISOString();

    // ── Store in DynamoDB ─────────────────────────────────────────────────────
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:           `LEAD#${now.slice(0,10)}`,
        SK:           `INTAKE#${now}#${id}`,
        leadId:       id,
        leadType:     "intake",
        fullName:     fullName   || "",
        workEmail,
        title:        title      || "",
        company:      company    || "",
        facilityType: facilityType || "",
        numFacilities: numFacilities || "",
        systems,
        challenges,
        need:         need || "",
        submittedAt:  now,
        status:       "new",
        source:       "fi-platform-intake",
      },
    }));

    // ── Send notification email to admin ──────────────────────────────────────
    const systemsList   = systems.length   ? systems.join(", ")    : "None selected";
    const challengeList = challenges.length ? challenges.join("\n• ") : "None selected";

    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [ADMIN_EMAIL] },
      Message: {
        Subject: {
          Data: `[FI Platform Intake] ${fullName || workEmail} — ${company || "Unknown Org"}`,
        },
        Body: {
          Text: {
            Data: [
              "NEW INTAKE FORM SUBMISSION",
              "══════════════════════════════",
              "",
              `Name:             ${fullName || "(not provided)"}`,
              `Work Email:       ${workEmail}`,
              `Title / Role:     ${title || "(not provided)"}`,
              `Company:          ${company || "(not provided)"}`,
              "",
              `Facility Type:    ${facilityType || "(not selected)"}`,
              `# of Locations:   ${numFacilities || "(not selected)"}`,
              `Primary Systems:  ${systemsList}`,
              "",
              "Challenges Reported:",
              `• ${challengeList}`,
              "",
              `What They Need:   ${need || "(not selected)"}`,
              "",
              `Submitted:        ${now}`,
              `Lead ID:          ${id}`,
              "",
              "——",
              "Nexum Suum Facility Intelligence — Intake Notification",
            ].join("\n"),
          },
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1a1a2e;padding:20px 24px;">
      <h2 style="color:#c084fc;margin:0;font-size:18px;">New Intake Submission</h2>
      <p style="color:#a1a1aa;margin:4px 0 0;font-size:13px;">FI Platform — portal.nexumsuum-facilityintelligence.com</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#71717a;width:140px;">Name</td><td style="padding:6px 0;font-weight:600;">${fullName || "<em>not provided</em>"}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Email</td><td style="padding:6px 0;"><a href="mailto:${workEmail}" style="color:#c084fc;">${workEmail}</a></td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Title</td><td style="padding:6px 0;">${title || "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Company</td><td style="padding:6px 0;font-weight:600;">${company || "—"}</td></tr>
        <tr><td colspan="2"><hr style="border:0;border-top:1px solid #e5e7eb;margin:12px 0;"></td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Facility Type</td><td style="padding:6px 0;">${facilityType || "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;"># Locations</td><td style="padding:6px 0;">${numFacilities || "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Systems</td><td style="padding:6px 0;">${systemsList}</td></tr>
        <tr><td colspan="2"><hr style="border:0;border-top:1px solid #e5e7eb;margin:12px 0;"></td></tr>
        <tr><td style="padding:6px 0;color:#71717a;vertical-align:top;">Challenges</td>
            <td style="padding:6px 0;">${challenges.map(c => `<div>• ${c}</div>`).join("") || "—"}</td></tr>
        <tr><td colspan="2"><hr style="border:0;border-top:1px solid #e5e7eb;margin:12px 0;"></td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Needs</td><td style="padding:6px 0;font-weight:600;color:#c084fc;">${need || "—"}</td></tr>
      </table>
      <div style="margin-top:20px;padding:12px;background:#f9fafb;border-radius:6px;font-size:12px;color:#6b7280;">
        Lead ID: ${id} &nbsp;·&nbsp; ${now}
      </div>
    </div>
  </div>
</body>
</html>`,
          },
        },
      },
    }));

    return json(200, { success: true, leadId: id });

  } catch (err) {
    console.error("POST /intake:", err);
    // Always return 200 to the client — intake is best-effort
    return json(200, { success: true });
  }
};
