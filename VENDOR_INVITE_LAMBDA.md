# Vendor Invite Lambda — vendor-invite

## Purpose
Sends a vendor invite email via SES and stores a pending invite record in DynamoDB.
Triggered by facility managers clicking "Invite" in the Vendor Hub.

## API Gateway Route
POST /vendors/invite
- JWT Authorizer: Required (facility manager / admin role)
- Integration: vendor-invite Lambda

## Environment Variables
| Variable | Description | Example |
|---|---|---|
| `VENDORS_TABLE` | DynamoDB table for vendor records | `NexumVendors` |
| `SES_FROM_EMAIL` | Verified SES sender address | `noreply@nexumsuum.com` |
| `FRONTEND_URL` | Frontend base URL for signup link | `https://nexumsuum.com` |

## DynamoDB Table: NexumVendors
If this table doesn't exist yet, create it:
- Partition key: `PK` (String)
- Sort key: `SK` (String)
- GSI1: `GSI1PK` / `GSI1SK`

Invite record pattern:
- `PK`: `FACILITY#${facilityId}`
- `SK`: `VENDOR_INVITE#${inviteToken}`

## Lambda Code (vendor-invite.mjs)

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" }); // SES is us-east-1

const TABLE        = process.env.VENDORS_TABLE  || "NexumVendors";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL || "noreply@nexumsuum.com";
const FRONTEND_URL = process.env.FRONTEND_URL   || "https://nexumsuum.com";

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

export const handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return json(200, {});
  }

  try {
    const claims = getClaims(event);
    if (!claims) return json(401, { message: "Unauthorized" });

    const facilityId = claims["custom:facilityId"];
    const orgId      = claims["custom:orgId"];
    const invitedBy  = claims["email"] || claims["sub"];

    const body = JSON.parse(event.body || "{}");
    const { name, email, message = "" } = body;

    if (!name || !email) {
      return json(400, { message: "name and email are required" });
    }

    const inviteToken = randomUUID();
    const now         = new Date().toISOString();

    // Store invite record
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:           `FACILITY#${facilityId}`,
        SK:           `VENDOR_INVITE#${inviteToken}`,
        GSI1PK:       `ORG#${orgId}`,
        GSI1SK:       `VENDOR_INVITE#${now}`,

        inviteToken,
        name,
        email:        email.toLowerCase().trim(),
        facilityId,
        orgId,
        invitedBy,
        inviteStatus: "invited",
        status:       "pending",
        createdAt:    now,
        expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }));

    // Build signup URL
    const params = new URLSearchParams({ invite: inviteToken, facilityId, email: email.toLowerCase().trim() });
    const signupUrl = `${FRONTEND_URL}/register?${params.toString()}`;

    // Email body
    const personalNote = message.trim()
      ? `\nPersonal message from your contact:\n"${message.trim()}"\n`
      : "";

    const emailText = `You've been invited to join Nexum Suum Facility Intelligence as a vendor partner.
${personalNote}
Create your free account using the link below. Your access is scoped to the facility that invited you.

${signupUrl}

With your account you can:
- View work orders assigned to your company
- Receive and respond to emergency alerts
- Upload completion notes and photos
- Track your job history and performance

This invite link expires in 7 days.

—
Nexum Suum Facility Intelligence
`;

    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `You've been invited to Nexum Suum — ${name}` },
        Body:    { Text: { Data: emailText } },
      },
    }));

    return json(200, {
      success:     true,
      inviteToken,
      message:     `Invite sent to ${email}`,
    });

  } catch (err) {
    console.error("vendor-invite error:", err);
    return json(500, { message: "Failed to send invite. Please try again." });
  }
};
```

## IAM Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:758027491272:table/NexumVendors",
        "arn:aws:dynamodb:us-east-2:758027491272:table/NexumVendors/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

## Deployment Steps

1. **Create Lambda** in AWS Console → Lambda → Create function
   - Name: `vendor-invite`
   - Runtime: Node.js 22.x
   - Architecture: arm64 (cheaper)
   - Handler: `vendor-invite.handler`

2. **Upload code** — paste `vendor-invite.mjs` content or zip and upload

3. **Set environment variables** in Lambda config:
   - `VENDORS_TABLE` = `NexumVendors`
   - `SES_FROM_EMAIL` = your verified SES email
   - `FRONTEND_URL` = `https://nexumsuum.com` (or your actual domain)

4. **Attach IAM policy** above to the Lambda execution role

5. **Verify SES sender** — in SES console, verify `noreply@nexumsuum.com`
   (or your FROM address). If in SES sandbox, also verify recipient emails.

6. **Wire API Gateway route**
   - Open the existing HTTP API (`vflco2pvo3`)
   - Add route: `POST /vendors/invite`
   - Integration: vendor-invite Lambda
   - Authorizer: existing JWT authorizer

7. **Create DynamoDB table** `NexumVendors` if it doesn't exist
   - PK: `PK` (String), SK: `SK` (String)
   - GSI1: `GSI1PK` / `GSI1SK` (String / String)
   - Billing: On-demand

## Notes
- Invite tokens expire after 7 days (stored in `expiresAt` — enforce in register flow)
- When vendor completes registration, update `inviteStatus` → `accepted` via PUT /vendors/:vendorId
- Historical work records are preserved if vendor is later removed from a facility
