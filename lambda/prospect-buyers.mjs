// ============================================================
// Lambda: prospect-buyers
// Handles portal purchasers from nexumsuum-connections.netlify.app
//
// Routes (all admin-only except OPTIONS):
//   GET  /prospect-buyers              — list all prospect buyers
//   POST /prospect-buyers/:id/schedule    — mark call scheduled
//   POST /prospect-buyers/:id/import-ready — send import instructions email
//   POST /prospect-buyers/:id/convert     — mark converted to FI Platform
//   POST /prospect-buyers/:id/churn       — mark churned
//
// Also called by stripe-webhook.mjs to write new buyers:
//   POST /prospect-buyers (internal, no auth — use IAM policy to restrict)
// ============================================================

import { DynamoDBClient }                   from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient,
         PutCommand, QueryCommand,
         UpdateCommand, ScanCommand }        from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand }       from "@aws-sdk/client-ses";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE        = process.env.PROSPECTS_TABLE || "NexumProspectBuyers";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL  || "info@nexumsuum-facilityintelligence.com";
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL     || "razzellv@nexumsuum.com";
const PORTAL_URL   = process.env.PORTAL_URL      || "https://nexumsuum-connections.netlify.app";
const FI_URL       = process.env.FRONTEND_URL    || "https://portal.nexumsuum-facilityintelligence.com";
const SHEETS_URL   = process.env.SHEETS_SCRIPT_URL || ""; // Apps Script /exec URL

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":"Content-Type,Authorization",
      "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
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

function getPath(event) {
  return event?.requestContext?.http?.path || event?.path || "";
}

function isAdmin(event) {
  const claims = getClaims(event);
  return claims?.["custom:role"] === "admin";
}

// Write buyer row to Google Sheet via Apps Script
async function writeToSheet(buyer) {
  if (!SHEETS_URL) return;
  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system:    "buyer",
        name:      buyer.name,
        company:   buyer.company    || "",
        email:     buyer.email,
        phone:     buyer.phone      || "",
        product:   buyer.product,
        sessionId: buyer.sessionId  || "",
        amount:    buyer.amount     || "",
        status:    buyer.status     || "Pending Review",
        notes:     buyer.notes      || "",
      }),
    });
  } catch (e) {
    console.warn("Sheet write failed (non-fatal):", e.message);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  // ── Internal: POST /prospect-buyers (from stripe-webhook Lambda, no user auth) ──
  // Stripe webhook Lambda calls this with { _internal: true }
  if (method === "POST" && path.endsWith("/prospect-buyers")) {
    let body = {};
    try {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64").toString("utf-8")
        : event.body || "{}";
      body = JSON.parse(raw);
    } catch { return json(400, { error: "Invalid JSON" }); }

    if (!body._internal) return json(403, { error: "Forbidden" });

    const {
      buyerId, name, company, email, phone,
      product, sessionId, amount, purchasedAt,
    } = body;

    const now = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:          `BUYER#${buyerId}`,
        SK:          "META",
        GSI1PK:      "STATUS#pending",
        GSI1SK:      `PURCHASED#${now}`,
        id:          buyerId,
        name:        name        || "",
        company:     company     || "",
        email:       (email || "").toLowerCase(),
        phone:       phone       || "",
        product:     product     || "",
        sessionId:   sessionId   || "",
        amount:      amount      || 0,
        status:      "pending",
        purchasedAt: purchasedAt || now,
        createdAt:   now,
      },
    }));

    // Write to Google Sheet
    await writeToSheet({ name, company, email, phone, product, sessionId, amount, status: "Pending Review" });

    // Admin notification
    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [ADMIN_EMAIL] },
      Message: {
        Subject: { Data: `New Portal Purchase — ${name} (${product})` },
        Body: {
          Text: {
            Data: `New prospect buyer from the Nexum Suum portal.\n\nName: ${name}\nCompany: ${company || "—"}\nEmail: ${email}\nProduct: ${product}\nAmount: $${amount}\n\nReview in NexumWorkspace → Prospects tab.\n${FI_URL}/workspace`,
          },
        },
      },
    }));

    return json(200, { success: true, buyerId });
  }

  // All routes below require admin ────────────────────────────────────────────
  if (!isAdmin(event)) return json(403, { error: "Admin only" });

  // ── GET /prospect-buyers — list all ──────────────────────────────────────────
  if (method === "GET" && path.endsWith("/prospect-buyers")) {
    try {
      const statuses = ["pending", "scheduled", "import_ready", "converted", "churned"];
      const all = [];
      for (const status of statuses) {
        const res = await ddb.send(new QueryCommand({
          TableName:                 TABLE,
          IndexName:                 "GSI1",
          KeyConditionExpression:    "GSI1PK = :s",
          ExpressionAttributeValues: { ":s": `STATUS#${status}` },
        }));
        all.push(...(res.Items || []));
      }
      all.sort((a, b) => (b.purchasedAt || "").localeCompare(a.purchasedAt || ""));
      return json(200, { buyers: all });
    } catch (err) {
      console.error("list prospects error:", err);
      return json(500, { error: err.message });
    }
  }

  // ── POST /prospect-buyers/:id/:action ─────────────────────────────────────────
  if (method === "POST") {
    const parts  = path.split("/").filter(Boolean);
    const action = parts[parts.length - 1];
    const id     = parts[parts.length - 2];

    if (!id || !action) return json(400, { error: "Missing id or action" });

    let body = {};
    try {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64").toString("utf-8")
        : event.body || "{}";
      body = JSON.parse(raw);
    } catch {}

    const { email, name, company, product, notes } = body;

    const statusMap = {
      schedule:     "scheduled",
      "import-ready": "import_ready",
      convert:      "converted",
      churn:        "churned",
    };

    const newStatus = statusMap[action];
    if (!newStatus) return json(400, { error: `Unknown action: ${action}` });

    try {
      // Update DynamoDB
      await ddb.send(new UpdateCommand({
        TableName:                 TABLE,
        Key:                       { PK: `BUYER#${id}`, SK: "META" },
        UpdateExpression:          "SET #st = :status, GSI1PK = :gsi, updatedAt = :now, notes = :notes",
        ExpressionAttributeNames:  { "#st": "status" },
        ExpressionAttributeValues: {
          ":status": newStatus,
          ":gsi":    `STATUS#${newStatus}`,
          ":now":    new Date().toISOString(),
          ":notes":  notes || "",
        },
      }));

      // Send email based on action
      if (action === "import-ready" && email) {
        await ses.send(new SendEmailCommand({
          Source:      FROM_EMAIL,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: "Your Nexum Suum Data Import Instructions" },
            Body: {
              Text: {
                Data: `Hi ${name || "there"},\n\nYou're ready to import your portal data into the Nexum Suum Facility Intelligence Platform.\n\nHere's how:\n\n1. Open your Google Sheet from the portal\n2. File → Download → CSV (current sheet)\n3. At the FI Platform onboarding: look for "Import from Portal CSV" at the top\n4. Upload the CSV — your staff and equipment will pre-fill automatically\n\nStart your onboarding here:\n${FI_URL}/onboarding\n\nIf you need help, reply to this email.\n\n— Nexum Suum Team`,
              },
            },
          },
        }));
      }

      if (action === "convert" && email) {
        await ses.send(new SendEmailCommand({
          Source:      FROM_EMAIL,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: "Welcome to Nexum Suum Facility Intelligence" },
            Body: {
              Text: {
                Data: `Hi ${name || "there"},\n\nYour Nexum Suum Facility Intelligence account is being set up.\n\nYou'll receive a separate email with your login credentials shortly.\n\nIn the meantime, you can review the platform guide:\n${FI_URL}/platform-guide\n\nWelcome aboard — excited to have ${company || "your organization"} on the platform.\n\n— Nexum Suum Team`,
              },
            },
          },
        }));
      }

      return json(200, { success: true, id, status: newStatus });

    } catch (err) {
      console.error(`action ${action} error:`, err);
      return json(500, { error: err.message });
    }
  }

  return json(404, { error: "Route not found" });
};
