import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE      = process.env.LEADS_TABLE    || "NexumLeads";
const FROM_EMAIL = process.env.SES_FROM_EMAIL || "info@nexumsuum-facilityintelligence.com";
const ADMIN_EMAIL = "info@nexumsuum-facilityintelligence.com";

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

function genLeadId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const rand  = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${Date.now()}-${rand}`;
}

function buildAdminEmailHtml(lead) {
  const { name, email, serviceType, deliveryMode, startTime, joinUrl, source, followUpDate } = lead;
  return `
<h2>New Booking Received &mdash; Nexum Suum</h2>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td><b>Name</b></td><td>${name}</td></tr>
  <tr><td><b>Email</b></td><td>${email}</td></tr>
  <tr><td><b>Service</b></td><td>${serviceType}</td></tr>
  <tr><td><b>Delivery</b></td><td>${deliveryMode}</td></tr>
  <tr><td><b>Date/Time</b></td><td>${startTime || "—"}</td></tr>
  ${joinUrl ? `<tr><td><b>Join URL</b></td><td><a href="${joinUrl}">${joinUrl}</a></td></tr>` : ""}
  <tr><td><b>Source</b></td><td>${source}</td></tr>
  <tr><td><b>Follow-up Due</b></td><td>${followUpDate || "—"}</td></tr>
</table>
<p style="margin-top:16px;">Log in to your internal platform to manage this lead.</p>
  `.trim();
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const method = getMethod(event);

  // ── POST /leads — public, no auth required (Calendly webhook + manual) ────────
  if (method === "POST") {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);

      const { name, email } = body;
      if (!name || !email) {
        return json(400, { message: "name and email are required." });
      }

      const leadId    = genLeadId();
      const now       = new Date().toISOString();
      const status    = body.status       || "pending";
      const source    = body.source       || "website";
      const serviceType   = body.serviceType   || "general";
      const deliveryMode  = body.deliveryMode  || "virtual";
      const followUpDate  = body.followUpDate  || null;
      const followUpNote  = body.followUpNote  || "";
      const callbackStatus = body.callbackStatus || "none";
      const callbackNote  = body.callbackNote  || "";
      const joinUrl       = body.joinUrl        || "";
      const startTime     = body.startTime      || "";
      const endTime       = body.endTime        || "";
      const phone         = body.phone          || null;
      const company       = body.company        || null;
      const notes         = Array.isArray(body.notes) ? body.notes : (body.notes ? [body.notes] : []);
      const tags          = Array.isArray(body.tags)  ? body.tags  : [];
      const calendlyEventUri   = body.calendlyEventUri   || null;
      const calendlyInviteeUri = body.calendlyInviteeUri || null;

      const item = {
        PK:                `LEAD#${leadId}`,
        SK:                "META",
        GSI1PK:            `STATUS#${status}`,
        GSI1SK:            `DATE#${now}`,
        GSI2PK:            `TYPE#${serviceType}`,
        leadId,
        name,
        email,
        serviceType,
        deliveryMode,
        status,
        source,
        joinUrl,
        startTime,
        endTime,
        followUpDate,
        followUpNote,
        callbackStatus,
        callbackNote,
        notes,
        tags,
        calendlyEventUri,
        calendlyInviteeUri,
        createdAt:  now,
        updatedAt:  now,
        convertedToClientId: null,
        ...(phone   !== null && { phone }),
        ...(company !== null && { company }),
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

      // Notify admin via SES
      try {
        await ses.send(new SendEmailCommand({
          Source:      FROM_EMAIL,
          Destination: { ToAddresses: [ADMIN_EMAIL] },
          Message: {
            Subject: { Data: `New Booking: ${serviceType} — ${name}` },
            Body: {
              Html: { Data: buildAdminEmailHtml(item) },
              Text: {
                Data: `New Booking Received — Nexum Suum\n\nName: ${name}\nEmail: ${email}\nService: ${serviceType}\nDelivery: ${deliveryMode}\nDate/Time: ${startTime || "—"}\n${joinUrl ? `Join URL: ${joinUrl}\n` : ""}Source: ${source}\nFollow-up Due: ${followUpDate || "—"}\n\nLog in to your internal platform to manage this lead.`,
              },
            },
          },
        }));
      } catch (sesErr) {
        // Non-fatal — log but don't fail the request
        console.error("SES send error:", sesErr);
      }

      return json(201, { success: true, leadId });

    } catch (err) {
      console.error("POST /leads error:", err);
      return json(500, { message: "Failed to create lead.", detail: err.message });
    }
  }

  // All remaining routes require admin auth
  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });
  if (claims["custom:role"] !== "admin") return json(403, { message: "Admin only" });

  // ── GET /leads — list all, optional ?status= or ?type= ───────────────────────
  if (method === "GET") {
    try {
      const qs         = event.queryStringParameters || {};
      const statusFilter = qs.status || null;
      const typeFilter   = qs.type   || null;

      let items = [];

      if (statusFilter) {
        // Query GSI1 by status
        const result = await ddb.send(new QueryCommand({
          TableName:                 TABLE,
          IndexName:                 "GSI1",
          KeyConditionExpression:    "GSI1PK = :gsi1pk",
          ExpressionAttributeValues: { ":gsi1pk": `STATUS#${statusFilter}` },
        }));
        items = result.Items || [];

      } else if (typeFilter) {
        // Query GSI2 by service type
        const result = await ddb.send(new QueryCommand({
          TableName:                 TABLE,
          IndexName:                 "GSI2",
          KeyConditionExpression:    "GSI2PK = :gsi2pk",
          ExpressionAttributeValues: { ":gsi2pk": `TYPE#${typeFilter}` },
        }));
        items = result.Items || [];

      } else {
        // No filter — fetch all statuses via GSI1
        const statuses = ["pending", "scheduled", "contacted", "proposal", "won", "lost", "canceled"];
        for (const status of statuses) {
          const result = await ddb.send(new QueryCommand({
            TableName:                 TABLE,
            IndexName:                 "GSI1",
            KeyConditionExpression:    "GSI1PK = :gsi1pk",
            ExpressionAttributeValues: { ":gsi1pk": `STATUS#${status}` },
          }));
          items.push(...(result.Items || []));
        }
      }

      // Sort newest first
      items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      return json(200, { leads: items });

    } catch (err) {
      console.error("GET /leads error:", err);
      return json(500, { message: "Failed to fetch leads.", detail: err.message });
    }
  }

  // ── PATCH /leads/:leadId — partial update ─────────────────────────────────────
  if (method === "PATCH") {
    try {
      const leadId = event.pathParameters?.leadId || event.path?.split("/").pop();
      if (!leadId) return json(400, { message: "leadId is required." });

      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const updates = JSON.parse(raw);

      const now = new Date().toISOString();

      // Build dynamic UpdateExpression from provided fields
      const allowed = [
        "status", "followUpDate", "followUpNote",
        "callbackStatus", "callbackNote",
        "convertedToClientId", "tags",
        "deliveryMode", "joinUrl", "startTime", "endTime",
        "phone", "company", "name", "email",
        "serviceType", "source",
      ];

      const setExprs   = ["updatedAt = :updatedAt"];
      const exprNames  = {};
      const exprValues = { ":updatedAt": now };

      for (const field of allowed) {
        if (updates[field] !== undefined) {
          const placeholder = `:${field}`;
          const nameAlias   = `#${field}`;
          setExprs.push(`${nameAlias} = ${placeholder}`);
          exprNames[nameAlias]    = field;
          exprValues[placeholder] = updates[field];
        }
      }

      // If status is being updated, also update GSI1PK
      if (updates.status !== undefined) {
        setExprs.push("GSI1PK = :gsi1pk");
        exprValues[":gsi1pk"] = `STATUS#${updates.status}`;
      }

      // If serviceType is being updated, also update GSI2PK
      if (updates.serviceType !== undefined) {
        setExprs.push("GSI2PK = :gsi2pk");
        exprValues[":gsi2pk"] = `TYPE#${updates.serviceType}`;
      }

      // notes: push new strings onto the existing list
      let listAppendExpr = "";
      if (Array.isArray(updates.notes) && updates.notes.length > 0) {
        listAppendExpr = ", #notes = list_append(if_not_exists(#notes, :emptyList), :newNotes)";
        exprNames["#notes"]      = "notes";
        exprValues[":newNotes"]  = updates.notes;
        exprValues[":emptyList"] = [];
      }

      const updateExpression = `SET ${setExprs.join(", ")}${listAppendExpr}`;

      await ddb.send(new UpdateCommand({
        TableName:                 TABLE,
        Key:                       { PK: `LEAD#${leadId}`, SK: "META" },
        UpdateExpression:          updateExpression,
        ExpressionAttributeNames:  Object.keys(exprNames).length  ? exprNames  : undefined,
        ExpressionAttributeValues: exprValues,
        ConditionExpression:       "attribute_exists(PK)",
      }));

      return json(200, { success: true, leadId, updatedAt: now });

    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        return json(404, { message: "Lead not found." });
      }
      console.error("PATCH /leads error:", err);
      return json(500, { message: "Failed to update lead.", detail: err.message });
    }
  }

  // ── DELETE /leads/:leadId — soft delete (status = 'discarded') ────────────────
  if (method === "DELETE") {
    try {
      const leadId = event.pathParameters?.leadId || event.path?.split("/").pop();
      if (!leadId) return json(400, { message: "leadId is required." });

      const now = new Date().toISOString();

      await ddb.send(new UpdateCommand({
        TableName:        TABLE,
        Key:              { PK: `LEAD#${leadId}`, SK: "META" },
        UpdateExpression: "SET #st = :status, GSI1PK = :gsi1pk, updatedAt = :now",
        ExpressionAttributeNames:  { "#st": "status" },
        ExpressionAttributeValues: {
          ":status":  "discarded",
          ":gsi1pk":  "STATUS#discarded",
          ":now":     now,
        },
        ConditionExpression: "attribute_exists(PK)",
      }));

      return json(200, { success: true, leadId, status: "discarded" });

    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        return json(404, { message: "Lead not found." });
      }
      console.error("DELETE /leads error:", err);
      return json(500, { message: "Failed to discard lead.", detail: err.message });
    }
  }

  return json(405, { message: "Method not allowed" });
};
