import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-2" });
const TABLE = "NexumBookings";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "razzellv@nexumsuum.com";
const FROM_EMAIL  = process.env.FROM_EMAIL  || "no-reply@nexumsuum-facilityintelligence.com";

// Available time slots (EST), displayed in the UI
const TIME_SLOTS = ["09:00","10:00","11:00","13:00","14:00","15:00","16:00"];

const respond = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

const parseBody = (event) => { try { return JSON.parse(event.body || "{}"); } catch { return {}; } };

const fmtTime = (slot) => {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2,"0")} ${ampm} EST`;
};

export const handler = async (event) => {
  const method    = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path      = event.requestContext?.http?.path || event.path || "/";
  const pathParts = path.split("/").filter(Boolean);
  const bookingId = pathParts[1]; // /bookings/:id
  const qsp       = event.queryStringParameters || {};

  // ── GET /bookings?date=YYYY-MM-DD  (public — returns available slots) ────────
  if (method === "GET" && !bookingId) {
    if (qsp.date) {
      const taken = await ddb.send(new ScanCommand({
        TableName: TABLE,
        FilterExpression: "scheduledDate = :d AND #st <> :c",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: { ":d": qsp.date, ":c": "cancelled" },
      }));
      const bookedSlots = (taken.Items || []).map(b => b.timeSlot);
      const available   = TIME_SLOTS.filter(s => !bookedSlots.includes(s));
      return respond(200, { date: qsp.date, bookedSlots, available, allSlots: TIME_SLOTS });
    }

    // Admin — return all bookings (not cancelled)
    const result = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "#st <> :c",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: { ":c": "cancelled" },
    }));
    const bookings = (result.Items || []).sort((a, b) =>
      (a.scheduledDate + a.timeSlot).localeCompare(b.scheduledDate + b.timeSlot)
    );
    return respond(200, { bookings });
  }

  // ── GET /bookings/all  (admin — include cancelled) ───────────────────────────
  if (method === "GET" && bookingId === "all") {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const bookings = (result.Items || []).sort((a, b) =>
      b.scheduledDate.localeCompare(a.scheduledDate)
    );
    return respond(200, { bookings });
  }

  // ── POST /bookings ───────────────────────────────────────────────────────────
  if (method === "POST" && !bookingId) {
    const { clientName, clientEmail, clientPhone, clientOrg,
            service, scheduledDate, timeSlot, notes, stripeSessionId } = parseBody(event);

    if (!clientName || !clientEmail || !service || !scheduledDate || !timeSlot)
      return respond(400, { error: "clientName, clientEmail, service, scheduledDate, timeSlot are required" });

    if (!TIME_SLOTS.includes(timeSlot))
      return respond(400, { error: "Invalid time slot" });

    // ── Availability check ───────────────────────────────────────────────────
    const conflict = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "scheduledDate = :d AND timeSlot = :t AND #st <> :c",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: { ":d": scheduledDate, ":t": timeSlot, ":c": "cancelled" },
    }));
    if ((conflict.Items || []).length > 0)
      return respond(409, { error: "That time slot is already booked. Please choose another." });

    const id = randomUUID();
    const booking = {
      bookingId: id,
      clientName, clientEmail,
      clientPhone:       clientPhone || "",
      clientOrg:         clientOrg   || "",
      service,
      scheduledDate, timeSlot,
      status:            "confirmed",
      stripeSessionId:   stripeSessionId || "",
      notes:             notes || "",
      createdAt:         new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: booking }));

    const timeLabel = fmtTime(timeSlot);

    // ── Confirmation emails ──────────────────────────────────────────────────
    const clientHtml = `<html><body style="font-family:sans-serif;background:#0a0a0a;color:#e5e7eb;padding:32px;max-width:600px;">
      <div style="margin-bottom:24px;">
        <span style="color:#f97316;font-size:20px;font-weight:bold;">Nexum Suum</span>
        <span style="color:#6b7280;font-size:13px;margin-left:8px;">Facility Intelligence™</span>
      </div>
      <h2 style="color:#fff;margin-bottom:8px;">Your session is confirmed.</h2>
      <p style="color:#9ca3af;margin-bottom:24px;">Hi ${clientName}, here are your booking details:</p>
      <table style="width:100%;border-collapse:collapse;background:#111;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:12px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Service</td>
            <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #1f2937;">${service}</td></tr>
        <tr><td style="padding:12px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Date</td>
            <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #1f2937;">${scheduledDate}</td></tr>
        <tr><td style="padding:12px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Time</td>
            <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #1f2937;">${timeLabel}</td></tr>
        ${clientOrg ? `<tr><td style="padding:12px 16px;color:#9ca3af;">Organization</td>
            <td style="padding:12px 16px;">${clientOrg}</td></tr>` : ""}
      </table>
      <p style="color:#9ca3af;margin-top:24px;font-size:13px;">
        We'll be in touch 24–48 hours before your session with any prep notes or instructions.
        To reschedule, reply to this email.
      </p>
      <p style="margin-top:32px;color:#6b7280;font-size:13px;">— Razzel Taylor<br/>Nexum Suum Facility Intelligence™</p>
    </body></html>`;

    const adminHtml = `<html><body style="font-family:sans-serif;background:#0a0a0a;color:#e5e7eb;padding:32px;max-width:600px;">
      <div style="background:#f97316;color:#fff;padding:12px 16px;border-radius:6px;margin-bottom:24px;font-weight:bold;">
        New Booking — ${service}
      </div>
      <table style="width:100%;border-collapse:collapse;background:#111;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Client</td>
            <td style="padding:10px 16px;border-bottom:1px solid #1f2937;">${clientName}</td></tr>
        <tr><td style="padding:10px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Email</td>
            <td style="padding:10px 16px;border-bottom:1px solid #1f2937;">${clientEmail}</td></tr>
        <tr><td style="padding:10px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Phone</td>
            <td style="padding:10px 16px;border-bottom:1px solid #1f2937;">${clientPhone || "N/A"}</td></tr>
        <tr><td style="padding:10px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Organization</td>
            <td style="padding:10px 16px;border-bottom:1px solid #1f2937;">${clientOrg || "N/A"}</td></tr>
        <tr><td style="padding:10px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Date</td>
            <td style="padding:10px 16px;border-bottom:1px solid #1f2937;">${scheduledDate}</td></tr>
        <tr><td style="padding:10px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Time</td>
            <td style="padding:10px 16px;border-bottom:1px solid #1f2937;">${timeLabel}</td></tr>
        <tr><td style="padding:10px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Booking ID</td>
            <td style="padding:10px 16px;font-size:11px;font-family:monospace;border-bottom:1px solid #1f2937;">${id}</td></tr>
        <tr><td style="padding:10px 16px;color:#9ca3af;border-bottom:1px solid #1f2937;">Stripe Session</td>
            <td style="padding:10px 16px;font-size:11px;font-family:monospace;border-bottom:1px solid #1f2937;">${stripeSessionId || "N/A"}</td></tr>
        ${notes ? `<tr><td style="padding:10px 16px;color:#9ca3af;">Notes</td>
            <td style="padding:10px 16px;">${notes}</td></tr>` : ""}
      </table>
    </body></html>`;

    await Promise.allSettled([
      ses.send(new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [clientEmail] },
        Message: {
          Subject: { Data: `Booking Confirmed: ${service} on ${scheduledDate}` },
          Body: { Html: { Data: clientHtml } },
        },
      })),
      ses.send(new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [ADMIN_EMAIL] },
        ReplyToAddresses: [clientEmail],
        Message: {
          Subject: { Data: `[New Booking] ${service} — ${scheduledDate} @ ${timeLabel}` },
          Body: { Html: { Data: adminHtml } },
        },
      })),
    ]);

    return respond(201, { booking });
  }

  // ── PATCH /bookings/:id ──────────────────────────────────────────────────────
  if (method === "PATCH" && bookingId) {
    const body = parseBody(event);
    const parts = []; const names = {}; const vals = {}; let i = 0;
    for (const [k, v] of Object.entries(body)) {
      if (["bookingId","createdAt"].includes(k)) continue;
      names[`#f${i}`] = k; vals[`:v${i}`] = v;
      parts.push(`#f${i} = :v${i}`); i++;
    }
    if (!parts.length) return respond(400, { error: "Nothing to update" });
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: { bookingId },
      UpdateExpression: `SET ${parts.join(", ")}`,
      ExpressionAttributeNames: names, ExpressionAttributeValues: vals,
    }));
    return respond(200, { updated: true });
  }

  // ── DELETE /bookings/:id  (soft delete → status=cancelled) ──────────────────
  if (method === "DELETE" && bookingId) {
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: { bookingId },
      UpdateExpression: "SET #st = :c",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: { ":c": "cancelled" },
    }));
    return respond(200, { cancelled: true });
  }

  return respond(404, { error: "Route not found" });
};
