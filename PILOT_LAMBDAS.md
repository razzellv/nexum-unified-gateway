# Pilot Program Lambdas

Three Lambda functions covering the full pilot application lifecycle.

## Routes Summary

| Route | Lambda | Auth |
|---|---|---|
| `POST /pilot-application` | pilot-submit | None (public) |
| `POST /pilot-verify` | pilot-submit | None (public) |
| `GET /pilot-applications` | pilot-admin | JWT (admin) |
| `PATCH /pilot-applications/{id}/{action}` | pilot-admin | JWT (admin) |

## DynamoDB Table: NexumPilots

- PK: `PILOT#${appId}`, SK: `META`
- GSI1PK: `STATUS#${status}`, GSI1SK: `CREATED#${createdAt}` — list by status

---

## Lambda 1: pilot-submit (pilot-submit.mjs)

Handles both `POST /pilot-application` (public submission) and `POST /pilot-verify` (code entry).

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });
const TABLE      = process.env.PILOTS_TABLE  || "NexumPilots";
const FROM_EMAIL = process.env.SES_FROM_EMAIL || "noreply@nexumsuum.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://nexumsuum.com";

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,Authorization" }, body: JSON.stringify(body) };
}
function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)   { return e?.requestContext?.http?.path   || e?.path || ""; }

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const path = getPath(event);

  // ── POST /pilot-verify ────────────────────────────────────────────────────
  if (path.includes("pilot-verify")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const { code, email } = JSON.parse(raw);

      if (!code || !email) return json(400, { message: "code and email are required" });

      // Scan for matching code — GSI query by STATUS#approved would be more efficient at scale
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :status",
        FilterExpression: "pilotCode = :code AND email = :email",
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

      // Mark as activated
      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: app.PK, SK: "META" },
        UpdateExpression: "SET #st = :active, activatedAt = :now, GSI1PK = :gsi",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: {
          ":active": "active",
          ":now":    new Date().toISOString(),
          ":gsi":    "STATUS#active",
        },
      }));

      return json(200, { success: true, appId: app.appId, tier: app.tier || "Business" });

    } catch (err) {
      console.error("pilot-verify error:", err);
      return json(500, { message: "Verification failed.", detail: err.message });
    }
  }

  // ── POST /pilot-application ───────────────────────────────────────────────
  try {
    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    const body = JSON.parse(raw);

    const { name, company, email, role, facilities, useCase, tier, promoId, supportAddon, agreedToResponsibilities } = body;

    if (!name || !email) return json(400, { message: "name and email are required" });

    const appId     = randomUUID();
    const now       = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:      `PILOT#${appId}`,
        SK:      "META",
        GSI1PK:  "STATUS#pending",
        GSI1SK:  `CREATED#${now}`,
        appId,
        name,
        company:  company  || "",
        email:    email.trim().toLowerCase(),
        role:     role     || "",
        facilities: facilities || "",
        useCase:  useCase  || "",
        tier:     tier     || "Business",
        promoId:  promoId  || null,
        supportAddon: supportAddon || null,
        agreedToResponsibilities: agreedToResponsibilities || false,
        status:   "pending",
        createdAt: now,
      },
    }));

    // Send confirmation email to applicant
    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Nexum Suum Pilot Application Received" },
        Body: { Text: { Data: `Hi ${name},\n\nWe received your pilot application for Nexum Suum Facility Intelligence.\n\nWe review applications within 2–3 business days. You'll receive an email with your approval code if selected.\n\nApplication ID: ${appId}\n\n— Nexum Suum` } },
      },
    }));

    // Notify admin
    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: ["razzellv@nexumsuum.com"] },
      Message: {
        Subject: { Data: `New Pilot Application — ${name} (${company})` },
        Body: { Text: { Data: `New pilot application received.\n\nName: ${name}\nCompany: ${company}\nEmail: ${email}\nRole: ${role}\nFacilities: ${facilities}\nUse Case: ${useCase}\n\nReview in NexumWorkspace → Pilot tab.\nApp ID: ${appId}` } },
      },
    }));

    return json(200, { success: true, appId });

  } catch (err) {
    console.error("pilot-application error:", err);
    return json(500, { message: "Failed to submit application.", detail: err.message });
  }
};
```

---

## Lambda 2: pilot-admin (pilot-admin.mjs)

Handles `GET /pilot-applications` and `PATCH /pilot-applications/{id}/{action}`.
Requires JWT (admin only — check `custom:role === 'admin'`).

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const ses = new SESClient({ region: "us-east-1" });
const TABLE        = process.env.PILOTS_TABLE  || "NexumPilots";
const FROM_EMAIL   = process.env.SES_FROM_EMAIL || "info@nexumsuum-facilityintelligence.com";
const FRONTEND_URL = process.env.FRONTEND_URL   || "https://nexumsuum.com";

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,Authorization" }, body: JSON.stringify(body) };
}
function getClaims(e) { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });
  if (claims["custom:role"] !== "admin") return json(403, { message: "Admin only" });

  const method = getMethod(event);

  // ── GET /pilot-applications ───────────────────────────────────────────────
  if (method === "GET") {
    try {
      const statuses = ["pending", "in_progress", "approved", "declined", "active"];
      const allItems = [];

      for (const status of statuses) {
        const result = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :status",
          ExpressionAttributeValues: { ":status": `STATUS#${status}` },
        }));
        allItems.push(...(result.Items || []));
      }

      return json(200, { applications: allItems });

    } catch (err) {
      console.error("get pilots error:", err);
      return json(500, { message: "Failed to fetch applications.", detail: err.message });
    }
  }

  // ── PATCH /pilot-applications/{id}/{action} ───────────────────────────────
  if (method === "PATCH") {
    try {
      const pathParts = (event?.requestContext?.http?.path || event?.path || "").split("/");
      const appId  = pathParts[pathParts.length - 2];
      const action = pathParts[pathParts.length - 1]; // approve | decline | discard | in_progress

      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const { notes } = JSON.parse(raw);

      const now       = new Date().toISOString();
      const newStatus = action === "approve"     ? "approved"    :
                        action === "decline"     ? "declined"    :
                        action === "discard"     ? "discarded"   :
                        action === "in_progress" ? "in_progress" : action;

      // Fetch existing record to get email for notifications
      const existing = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND SK = :sk",
        ExpressionAttributeValues: { ":pk": `PILOT#${appId}`, ":sk": "META" },
      }));

      const app = existing.Items?.[0];
      if (!app) return json(404, { message: "Application not found" });

      let pilotCode = app.pilotCode;

      // Generate code on approval
      if (action === "approve" && !pilotCode) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        pilotCode = "NXS-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      }

      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PILOT#${appId}`, SK: "META" },
        UpdateExpression: "SET #st = :status, GSI1PK = :gsi, updatedAt = :now" +
          (notes    ? ", adminNotes = :notes"     : "") +
          (pilotCode ? ", pilotCode = :code, approvedAt = :now" : "") +
          (action === "decline" ? ", declinedAt = :now" : ""),
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: {
          ":status": newStatus,
          ":gsi":    `STATUS#${newStatus}`,
          ":now":    now,
          ...(notes     ? { ":notes": notes }     : {}),
          ...(pilotCode ? { ":code": pilotCode }  : {}),
        },
      }));

      // Send emails on approve/decline
      if (action === "approve" && app.email) {
        await ses.send(new SendEmailCommand({
          Source: FROM_EMAIL,
          Destination: { ToAddresses: [app.email] },
          Message: {
            Subject: { Data: "You're approved — Nexum Suum Pilot Program" },
            Body: { Text: { Data: `Hi ${app.name},\n\nCongratulations — you've been approved for the Nexum Suum Pilot Program.\n\nYour access code: ${pilotCode}\n\nEnter it at:\n${FRONTEND_URL}/pricing (click "Apply for Pilot access" then "Already have a code?")\n\nWelcome to the program.\n\n— Nexum Suum` } },
          },
        }));
      }

      if (action === "decline" && app.email) {
        await ses.send(new SendEmailCommand({
          Source: "noreply@nexumsuum.com",
          Destination: { ToAddresses: [app.email] },
          Message: {
            Subject: { Data: "Nexum Suum Pilot Application Update" },
            Body: { Text: { Data: `Hi ${app.name},\n\nThank you for your interest in the Nexum Suum Pilot Program. Unfortunately, we're unable to offer you a spot at this time.\n\n${notes ? `Note from our team: ${notes}\n\n` : ""}We'll keep your application on file and may reach out if a spot opens.\n\n— Nexum Suum` } },
          },
        }));
      }

      return json(200, { success: true, appId, newStatus, pilotCode: pilotCode || null });

    } catch (err) {
      console.error("patch pilot error:", err);
      return json(500, { message: "Failed to update application.", detail: err.message });
    }
  }

  return json(405, { message: "Method not allowed" });
};
```

---

## IAM Permissions (both Lambdas share the same policy)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:758027491272:table/NexumPilots",
        "arn:aws:dynamodb:us-east-2:758027491272:table/NexumPilots/index/*"
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

---

## AWS CLI Deployment

```bash
ACCOUNT_ID="758027491272"
REGION="us-east-2"
API_ID="vflco2pvo3"
FROM_EMAIL="noreply@nexumsuum.com"
FRONTEND_URL="https://nexumsuum.com"

# ── 1. Create DynamoDB table ───────────────────────────────────────────────────
aws dynamodb create-table \
  --table-name NexumPilots \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --region $REGION

# ── 2. Create shared IAM role ──────────────────────────────────────────────────
aws iam create-role --role-name pilot-lambda-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name pilot-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam put-role-policy --role-name pilot-lambda-role --policy-name pilot-policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumPilots\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumPilots/index/*\"]},{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\"],\"Resource\":\"*\"}]}"

sleep 12

# ── 3. Deploy pilot-submit Lambda ─────────────────────────────────────────────
mkdir -p /tmp/pilot-submit
# (paste pilot-submit.mjs code into /tmp/pilot-submit/pilot-submit.mjs)
cd /tmp/pilot-submit && zip pilot-submit.zip pilot-submit.mjs

aws lambda create-function \
  --function-name pilot-submit \
  --runtime nodejs22.x --architectures arm64 \
  --handler pilot-submit.handler \
  --role arn:aws:iam::${ACCOUNT_ID}:role/pilot-lambda-role \
  --zip-file fileb:///tmp/pilot-submit/pilot-submit.zip \
  --environment "Variables={PILOTS_TABLE=NexumPilots,SES_FROM_EMAIL=${FROM_EMAIL},FRONTEND_URL=${FRONTEND_URL}}" \
  --timeout 15 --region $REGION

# ── 4. Deploy pilot-admin Lambda ──────────────────────────────────────────────
mkdir -p /tmp/pilot-admin
# (paste pilot-admin.mjs code into /tmp/pilot-admin/pilot-admin.mjs)
cd /tmp/pilot-admin && zip pilot-admin.zip pilot-admin.mjs

aws lambda create-function \
  --function-name pilot-admin \
  --runtime nodejs22.x --architectures arm64 \
  --handler pilot-admin.handler \
  --role arn:aws:iam::${ACCOUNT_ID}:role/pilot-lambda-role \
  --zip-file fileb:///tmp/pilot-admin/pilot-admin.zip \
  --environment "Variables={PILOTS_TABLE=NexumPilots,SES_FROM_EMAIL=${FROM_EMAIL},FRONTEND_URL=${FRONTEND_URL}}" \
  --timeout 15 --region $REGION

# ── 5. Wire API Gateway routes ────────────────────────────────────────────────
SUBMIT_ARN=$(aws lambda get-function --function-name pilot-submit --region $REGION --query 'Configuration.FunctionArn' --output text)
ADMIN_ARN=$(aws lambda get-function  --function-name pilot-admin  --region $REGION --query 'Configuration.FunctionArn' --output text)
AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id $API_ID --region $REGION --query 'Items[0].AuthorizerId' --output text)

# Grant API Gateway invoke permissions
aws lambda add-permission --function-name pilot-submit --statement-id apigw-pilot-submit \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*/pilot*" --region $REGION
aws lambda add-permission --function-name pilot-admin --statement-id apigw-pilot-admin \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*/pilot*" --region $REGION

# Create integrations
SUBMIT_INT=$(aws apigatewayv2 create-integration --api-id $API_ID --integration-type AWS_PROXY \
  --integration-uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${SUBMIT_ARN}/invocations" \
  --payload-format-version 2.0 --region $REGION --query 'IntegrationId' --output text)
ADMIN_INT=$(aws apigatewayv2 create-integration --api-id $API_ID --integration-type AWS_PROXY \
  --integration-uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${ADMIN_ARN}/invocations" \
  --payload-format-version 2.0 --region $REGION --query 'IntegrationId' --output text)

# Create routes — submit routes have no auth, admin routes require JWT
aws apigatewayv2 create-route --api-id $API_ID --route-key "POST /pilot-application" \
  --target "integrations/${SUBMIT_INT}" --authorization-type NONE --region $REGION
aws apigatewayv2 create-route --api-id $API_ID --route-key "POST /pilot-verify" \
  --target "integrations/${SUBMIT_INT}" --authorization-type NONE --region $REGION
aws apigatewayv2 create-route --api-id $API_ID --route-key "GET /pilot-applications" \
  --target "integrations/${ADMIN_INT}" --authorization-type JWT --authorizer-id $AUTHORIZER_ID --region $REGION
aws apigatewayv2 create-route --api-id $API_ID --route-key "PATCH /pilot-applications/{id}/{action}" \
  --target "integrations/${ADMIN_INT}" --authorization-type JWT --authorizer-id $AUTHORIZER_ID --region $REGION

# Confirm
aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
  --query 'Items[?contains(RouteKey,`pilot`)]' --output table
```
