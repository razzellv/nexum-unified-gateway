// ── nexum-leads Lambda ────────────────────────────────────────────────────────
// Lead Pipeline CRUD + Calendly webhook receiver
//
// JWT-protected routes (admin):
//   GET    /leads                  — list all leads
//   POST   /leads                  — manually add a lead
//   PATCH  /leads/{id}             — update status / notes / callback date
//   DELETE /leads/{id}             — remove a lead
//
// Public routes:
//   POST   /leads/webhook/calendly — Calendly webhook (no auth)

import { DynamoDBClient }                   from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient,
         PutCommand, QueryCommand,
         UpdateCommand, DeleteCommand,
         ScanCommand }                       from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand }       from "@aws-sdk/client-ses";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE       = process.env.LEADS_TABLE   || "NexumLeads";
const FROM_EMAIL  = process.env.SES_FROM_EMAIL || "noreply@nexumsuum.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL    || "razzellv@nexumsuum.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":"Content-Type,Authorization",
      "Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getClaims(e) {
  return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null;
}
function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)   { return e?.requestContext?.http?.path   || e?.path       || ""; }

function leadId() {
  return `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// ── Calendly payload → lead ───────────────────────────────────────────────────
function parseCalendlyPayload(body) {
  // Calendly v2 webhook shape
  const event    = body?.payload?.event    || body?.event    || {};
  const invitee  = body?.payload?.invitee  || body?.invitee  || {};
  const tracking = invitee?.tracking       || {};

  return {
    source:       "calendly",
    name:         invitee?.name            || "Unknown",
    email:        invitee?.email           || "",
    phone:        invitee?.text_reminder_number || "",
    company:      invitee?.questions_and_answers?.find(q =>
                    /company|org|facility/i.test(q.question))?.answer || "",
    role:         invitee?.questions_and_answers?.find(q =>
                    /role|title|position/i.test(q.question))?.answer || "",
    notes:        invitee?.questions_and_answers?.find(q =>
                    /note|comment|message|describe/i.test(q.question))?.answer || "",
    meetingType:  event?.name             || "Discovery Call",
    scheduledAt:  event?.start_time       || new Date().toISOString(),
    canceledAt:   body?.event === "invitee.canceled" ? new Date().toISOString() : null,
    utmSource:    tracking?.utm_source    || "",
    utmMedium:    tracking?.utm_medium    || "",
    utmCampaign:  tracking?.utm_campaign  || "",
    cancelUrl:    invitee?.cancel_url     || "",
    rescheduleUrl:invitee?.reschedule_url || "",
    calendlyUri:  invitee?.uri            || "",
  };
}

// ── Notify admin of new Calendly lead ─────────────────────────────────────────
async function notifyAdmin(lead) {
  try {
    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [ADMIN_EMAIL] },
      Message: {
        Subject: { Data: `New Lead: ${lead.name} — ${lead.meetingType || "Nexum Suum"}` },
        Body: {
          Text: {
            Data: [
              `New lead via ${lead.source === "calendly" ? "Calendly booking" : "manual entry"}.`,
              ``,
              `Name:     ${lead.name}`,
              `Email:    ${lead.email}`,
              `Phone:    ${lead.phone   || "—"}`,
              `Company:  ${lead.company || "—"}`,
              `Role:     ${lead.role    || "—"}`,
              `Meeting:  ${lead.meetingType || "—"}`,
              lead.scheduledAt ? `Scheduled: ${new Date(lead.scheduledAt).toLocaleString()}` : "",
              ``,
              lead.notes ? `Notes: ${lead.notes}` : "",
              ``,
              `Lead ID: ${lead.leadId}`,
            ].filter(Boolean).join("\n"),
          },
        },
      },
    }));
  } catch (err) {
    console.warn("notifyAdmin SES error:", err.message);
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  // ── Calendly webhook — no auth ─────────────────────────────────────────────
  if (method === "POST" && path.includes("/webhook/calendly")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);

      // Ignore test/cancellation events if desired — still persist canceled for visibility
      const parsed  = parseCalendlyPayload(body);
      const now      = new Date().toISOString();
      const id       = leadId();
      const status   = parsed.canceledAt ? "canceled" : "pending";

      const item = {
        PK:          "LEADS",
        SK:          `LEAD#${id}`,
        leadId:      id,
        source:      parsed.source,
        status,
        name:        parsed.name,
        email:       parsed.email,
        phone:       parsed.phone,
        company:     parsed.company,
        role:        parsed.role,
        meetingType: parsed.meetingType,
        scheduledAt: parsed.scheduledAt,
        canceledAt:  parsed.canceledAt,
        notes:       parsed.notes,
        callbackDate:null,
        followUpDate:null,
        utmSource:   parsed.utmSource,
        utmMedium:   parsed.utmMedium,
        utmCampaign: parsed.utmCampaign,
        cancelUrl:   parsed.cancelUrl,
        rescheduleUrl: parsed.rescheduleUrl,
        calendlyUri: parsed.calendlyUri,
        createdAt:   now,
        updatedAt:   now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

      if (status !== "canceled") await notifyAdmin({ ...parsed, leadId: id });

      return json(200, { received: true, leadId: id });
    } catch (err) {
      console.error("calendly webhook error:", err);
      return json(500, { message: "Webhook processing failed.", detail: err.message });
    }
  }

  // All remaining routes require JWT auth
  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  // ── GET /leads ─────────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/leads") || path.includes("/leads?"))) {
    try {
      const qs      = event.queryStringParameters || {};
      const status  = qs.status;
      const source  = qs.source;
      const limit   = parseInt(qs.limit || "200");

      let params = {
        TableName:                 TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": "LEADS" },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      // Filter by status if provided
      if (status) {
        params.FilterExpression = "#s = :status";
        params.ExpressionAttributeNames = { "#s": "status" };
        params.ExpressionAttributeValues[":status"] = status;
      }
      if (source) {
        params.FilterExpression = (params.FilterExpression ? params.FilterExpression + " AND " : "") + "#src = :source";
        params.ExpressionAttributeNames = { ...(params.ExpressionAttributeNames || {}), "#src": "source" };
        params.ExpressionAttributeValues[":source"] = source;
      }

      const result = await ddb.send(new QueryCommand(params));
      const leads  = (result.Items || []).map(item => ({
        leadId:       item.leadId,
        source:       item.source,
        status:       item.status,
        name:         item.name,
        email:        item.email,
        phone:        item.phone        || "",
        company:      item.company      || "",
        role:         item.role         || "",
        meetingType:  item.meetingType  || "",
        scheduledAt:  item.scheduledAt  || null,
        canceledAt:   item.canceledAt   || null,
        notes:        item.notes        || "",
        callbackDate: item.callbackDate || null,
        followUpDate: item.followUpDate || null,
        convertedAt:  item.convertedAt  || null,
        wonValue:     item.wonValue     || null,
        utmSource:    item.utmSource    || "",
        createdAt:    item.createdAt,
        updatedAt:    item.updatedAt,
      }));

      return json(200, { leads, count: leads.length });
    } catch (err) {
      console.error("GET /leads error:", err);
      return json(500, { message: "Failed to list leads.", detail: err.message });
    }
  }

  // ── POST /leads — manual add ───────────────────────────────────────────────
  if (method === "POST" && (path.endsWith("/leads"))) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);

      if (!body.name || !body.email) return json(400, { message: "name and email are required" });

      const now = new Date().toISOString();
      const id  = leadId();

      const item = {
        PK:          "LEADS",
        SK:          `LEAD#${id}`,
        leadId:      id,
        source:      body.source      || "manual",
        status:      body.status      || "pending",
        name:        body.name,
        email:       body.email.trim().toLowerCase(),
        phone:       body.phone       || "",
        company:     body.company     || "",
        role:        body.role        || "",
        meetingType: body.meetingType || "",
        scheduledAt: body.scheduledAt || null,
        canceledAt:  null,
        notes:       body.notes       || "",
        callbackDate:body.callbackDate|| null,
        followUpDate:body.followUpDate|| null,
        convertedAt: null,
        wonValue:    body.wonValue    || null,
        utmSource:   body.utmSource   || "",
        utmMedium:   body.utmMedium   || "",
        utmCampaign: body.utmCampaign || "",
        createdAt:   now,
        updatedAt:   now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

      if (body.notify !== false) await notifyAdmin({ ...item, leadId: id });

      return json(200, { success: true, leadId: id });
    } catch (err) {
      console.error("POST /leads error:", err);
      return json(500, { message: "Failed to create lead.", detail: err.message });
    }
  }

  // ── PATCH /leads/{id} ─────────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/leads/")) {
    try {
      const id = path.split("/leads/")[1].split("?")[0];
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();

      const setExprs = [];
      const names    = {};
      const vals     = { ":now": now };

      const field = (expr, name, alias, val) => {
        if (val !== undefined) {
          setExprs.push(`${alias} = ${expr}`);
          names[alias.replace("#", "#")] = name;
          vals[expr.replace(":", ":")] = val;
        }
      };

      // Allow updating any of these fields
      if (body.status       !== undefined) { setExprs.push("#s = :status");        names["#s"] = "status";       vals[":status"]       = body.status; }
      if (body.notes        !== undefined) { setExprs.push("notes = :notes");                                    vals[":notes"]        = body.notes; }
      if (body.callbackDate !== undefined) { setExprs.push("callbackDate = :cbd");                               vals[":cbd"]          = body.callbackDate; }
      if (body.followUpDate !== undefined) { setExprs.push("followUpDate = :fud");                               vals[":fud"]          = body.followUpDate; }
      if (body.wonValue     !== undefined) { setExprs.push("wonValue = :wv");                                    vals[":wv"]           = body.wonValue; }
      if (body.convertedAt  !== undefined) { setExprs.push("convertedAt = :cat");                                vals[":cat"]          = body.convertedAt; }
      if (body.company      !== undefined) { setExprs.push("company = :co");                                     vals[":co"]           = body.company; }
      if (body.phone        !== undefined) { setExprs.push("phone = :ph");                                       vals[":ph"]           = body.phone; }
      if (body.meetingType  !== undefined) { setExprs.push("meetingType = :mt");                                 vals[":mt"]           = body.meetingType; }
      if (body.scheduledAt  !== undefined) { setExprs.push("scheduledAt = :sat");                                vals[":sat"]          = body.scheduledAt; }

      setExprs.push("updatedAt = :now");

      const updateParams = {
        TableName:                 TABLE,
        Key:                       { PK: "LEADS", SK: `LEAD#${id}` },
        UpdateExpression:          "SET " + setExprs.join(", "),
        ExpressionAttributeValues: vals,
      };
      if (Object.keys(names).length > 0) updateParams.ExpressionAttributeNames = names;

      await ddb.send(new UpdateCommand(updateParams));

      return json(200, { success: true, leadId: id });
    } catch (err) {
      console.error("PATCH /leads error:", err);
      return json(500, { message: "Failed to update lead.", detail: err.message });
    }
  }

  // ── DELETE /leads/{id} ────────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/leads/")) {
    try {
      const id = path.split("/leads/")[1].split("?")[0];
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { PK: "LEADS", SK: `LEAD#${id}` },
      }));
      return json(200, { success: true });
    } catch (err) {
      console.error("DELETE /leads error:", err);
      return json(500, { message: "Failed to delete lead.", detail: err.message });
    }
  }

  return json(404, { message: "Route not found" });
};
