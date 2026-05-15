import { DynamoDBClient }           from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand }        from "@aws-sdk/client-ses";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });

const TABLE       = process.env.QUOTES_TABLE  || "NexumOrganizations";
const FROM_EMAIL  = process.env.SES_FROM_EMAIL || "info@nexumsuum-facilityintelligence.com";
const SALES_EMAIL = "info@nexumsuum-facilityintelligence.com";

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

function buildNotificationEmail(q) {
  const row = (label, val) => val
    ? `<tr><td style="padding:6px 12px;color:#94a3b8;font-size:13px;width:180px">${label}</td><td style="padding:6px 12px;font-size:13px;font-weight:600">${val}</td></tr>`
    : '';

  // Storage estimate (mirrors Pricing.tsx calculation)
  const eq   = parseInt(q.estimatedEquipment)     || 0;
  const inv  = parseInt(q.estimatedInventoryItems) || 0;
  const yrs  = parseInt(q.historicalDataYears)     || 0;
  const docs = parseInt(q.complianceDocsCount)     || 0;
  const totalMB = (eq * 3 / 1024) + (eq * 365 * yrs / 1024) + (inv * 2 / 1024) + (docs * 50 / 1024);
  const storageLabel = totalMB > 0 ? `~${totalMB.toFixed(1)} GB estimated` : 'Not provided';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,sans-serif;background:#0f172a;color:#f1f5f9">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:linear-gradient(135deg,#1e3a5f,#0f172a);border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="margin:0;font-size:12px;color:#60a5fa;letter-spacing:2px;text-transform:uppercase">Enterprise Quote Request</p>
      <h1 style="margin:8px 0 0;font-size:24px;font-weight:700">New Quote — ${q.companyName || 'Unknown Company'}</h1>
    </div>
    <div style="background:#1e293b;border-radius:12px;padding:4px;margin-bottom:16px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Company', q.companyName)}
        ${row('Contact', q.contactName)}
        ${row('Email', q.email)}
        ${row('Phone', q.phone)}
        ${row('Org Type', q.orgType)}
        ${row('Locations', q.estimatedLocations)}
        ${row('Team Size', q.teamSize)}
        ${row('Equipment Assets', q.estimatedEquipment)}
        ${row('Inventory Items', q.estimatedInventoryItems)}
        ${row('Historical Data (yrs)', q.historicalDataYears)}
        ${row('Compliance Docs', q.complianceDocsCount)}
        ${row('Est. Storage', storageLabel)}
        ${row('Notes', q.notes)}
      </table>
    </div>
    <p style="font-size:12px;color:#475569;text-align:center;margin-top:24px">
      Nexum Suum Facility Intelligence™ · Submitted ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
    </p>
  </div>
</body>
</html>`;
}

function buildConfirmationEmail(q) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,sans-serif;background:#0f172a;color:#f1f5f9">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:linear-gradient(135deg,#1e3a5f,#0f172a);border-radius:12px;padding:32px;text-align:center;margin-bottom:24px">
      <p style="margin:0;font-size:12px;color:#60a5fa;letter-spacing:2px;text-transform:uppercase">Nexum Suum Facility Intelligence™</p>
      <h1 style="margin:12px 0 4px;font-size:22px;font-weight:700">We got your request, ${q.contactName?.split(' ')[0] || 'there'}!</h1>
      <p style="margin:0;color:#94a3b8;font-size:14px">Our team will reach out within 1 business day.</p>
    </div>
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:16px">
      <p style="margin:0 0 8px;font-size:14px;color:#94a3b8">What happens next:</p>
      <ol style="margin:0;padding-left:20px;color:#f1f5f9;font-size:14px;line-height:1.8">
        <li>A Nexum solutions specialist reviews your requirements</li>
        <li>We prepare a custom proposal with storage and seat estimates</li>
        <li>15-minute discovery call to align on scope and pricing</li>
        <li>Contract + onboarding kickoff</li>
      </ol>
    </div>
    <p style="font-size:12px;color:#475569;text-align:center">
      Questions? Reply to this email or contact <a href="mailto:${SALES_EMAIL}" style="color:#60a5fa">${SALES_EMAIL}</a>
    </p>
  </div>
</body>
</html>`;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return json(200, {});
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { companyName, contactName, email } = body;
  if (!companyName || !contactName || !email) {
    return json(400, { error: 'companyName, contactName, and email are required' });
  }

  const quoteId  = `QUOTE#${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now      = new Date().toISOString();

  // Persist to DynamoDB using NexumOrganizations table (no dedicated quotes table needed for pilot)
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK:          quoteId,
      SK:          "METADATA",
      type:        "enterprise_quote",
      companyName, contactName, email,
      phone:       body.phone        || '',
      orgType:     body.orgType      || '',
      estimatedLocations:    body.estimatedLocations    || '',
      teamSize:              body.teamSize              || '',
      estimatedEquipment:    body.estimatedEquipment    || '',
      estimatedInventoryItems: body.estimatedInventoryItems || '',
      historicalDataYears:   body.historicalDataYears   || '',
      complianceDocsCount:   body.complianceDocsCount   || '',
      notes:                 body.notes                 || '',
      submittedAt:  now,
      status:       'new',
    },
  }));

  // Notify sales team
  try {
    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [SALES_EMAIL] },
      Message: {
        Subject: { Data: `Enterprise Quote: ${companyName}` },
        Body: {
          Html: { Data: buildNotificationEmail(body) },
          Text: { Data: `Enterprise quote from ${companyName} (${email}). Locations: ${body.estimatedLocations}, Team: ${body.teamSize}, Equipment: ${body.estimatedEquipment}. Notes: ${body.notes}` },
        },
      },
    }));
  } catch (err) {
    console.error('SES notify error:', err.message);
  }

  // Confirm to submitter
  try {
    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'We received your Nexum Enterprise request' },
        Body: {
          Html: { Data: buildConfirmationEmail(body) },
          Text: { Data: `Hi ${contactName}, we received your enterprise quote request and will be in touch within 1 business day.` },
        },
      },
    }));
  } catch (err) {
    console.error('SES confirm error:', err.message);
  }

  return json(200, { success: true, quoteId });
};
