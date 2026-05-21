import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({ region: "us-east-1" });

const ADMIN_PHONE = process.env.ADMIN_PHONE || "+19734448260";

const respond = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

const parseBody = (event) => { try { return JSON.parse(event.body || "{}"); } catch { return {}; } };

const formatPhone = (raw) => {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";

  if (method === "OPTIONS") return respond(200, {});

  if (method === "POST") {
    const { to, message } = parseBody(event);
    if (!to || !message) return respond(400, { error: "to and message are required" });

    const phone = to.startsWith("+") ? to : formatPhone(to);

    const msgAttrs = {
      "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" },
    };

    // Send to client
    await sns.send(new PublishCommand({
      PhoneNumber: phone,
      Message: message,
      MessageAttributes: msgAttrs,
    }));

    // Send copy/notification to admin phone (so Razzel sees what went out)
    if (phone !== ADMIN_PHONE) {
      await sns.send(new PublishCommand({
        PhoneNumber: ADMIN_PHONE,
        Message: `[Sent to ${phone}]\n${message}`,
        MessageAttributes: msgAttrs,
      }));
    }

    return respond(200, { sent: true, to: phone });
  }

  return respond(405, { error: "Method not allowed" });
};
