# Email Settings Lambda — email-settings

## Purpose
Persists FROM email address settings (confirmation, approval, decline, invoice, general inquiry)
to DynamoDB. Called from NexumWorkspace → Email Settings tab when admin saves changes.

## API Gateway Route
POST /email-settings
- JWT Authorizer: Required (admin only)
- Integration: email-settings Lambda

## DynamoDB Table: NexumSettings
Reusable settings table — use for any platform-wide config.
- PK: `ORG#${orgId}` (or `GLOBAL` for platform-wide)
- SK: `EMAIL_SETTINGS`

## Lambda Code (email-settings.mjs)

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.SETTINGS_TABLE || "NexumSettings";

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,Authorization" }, body: JSON.stringify(body) };
}
function getClaims(e) { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  try {
    const claims = getClaims(event);
    if (!claims) return json(401, { message: "Unauthorized" });
    if (claims["custom:role"] !== "admin") return json(403, { message: "Admin only" });

    const orgId = claims["custom:orgId"] || "global";
    const method = getMethod(event);

    // GET /email-settings — return current settings
    if (method === "GET") {
      const result = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `ORG#${orgId}`, SK: "EMAIL_SETTINGS" },
      }));
      return json(200, { settings: result.Item?.settings || null });
    }

    // POST /email-settings — save settings
    let rawBody = event.body || "{}";
    if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    const { settings } = JSON.parse(rawBody);

    if (!settings) return json(400, { message: "settings object is required" });

    const now = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:        `ORG#${orgId}`,
        SK:        "EMAIL_SETTINGS",
        settings,
        orgId,
        updatedAt: now,
        updatedBy: claims["sub"],
      },
    }));

    return json(200, { success: true, savedAt: now });

  } catch (err) {
    console.error("email-settings error:", err);
    return json(500, { message: "Failed to save email settings.", detail: err.message });
  }
};
```

## IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["dynamodb:PutItem", "dynamodb:GetItem"],
    "Resource": [
      "arn:aws:dynamodb:us-east-2:758027491272:table/NexumSettings"
    ]
  }]
}
```

## AWS CLI Deployment

```bash
ACCOUNT_ID="758027491272"
REGION="us-east-2"
API_ID="vflco2pvo3"

# 1. Create DynamoDB table (no GSI needed — single item per org)
aws dynamodb create-table \
  --table-name NexumSettings \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

# 2. Create IAM role
aws iam create-role --role-name email-settings-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name email-settings-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam put-role-policy --role-name email-settings-role --policy-name email-settings-policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumSettings\"}]}"

sleep 12

# 3. Write + deploy Lambda
mkdir -p /tmp/email-settings
cat > /tmp/email-settings/email-settings.mjs << 'EOF'
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.SETTINGS_TABLE || "NexumSettings";
function json(s,b){return{statusCode:s,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,Authorization"},body:JSON.stringify(b)};}
function getClaims(e){return e?.requestContext?.authorizer?.jwt?.claims||e?.requestContext?.authorizer?.claims||null;}
function getMethod(e){return e?.requestContext?.http?.method||e?.httpMethod||"";}
export const handler = async (event) => {
  if (getMethod(event)==="OPTIONS") return json(200,{});
  try {
    const claims=getClaims(event);
    if (!claims) return json(401,{message:"Unauthorized"});
    if (claims["custom:role"]!=="admin") return json(403,{message:"Admin only"});
    const orgId=claims["custom:orgId"]||"global";
    const method=getMethod(event);
    if (method==="GET") {
      const r=await ddb.send(new GetCommand({TableName:TABLE,Key:{PK:`ORG#${orgId}`,SK:"EMAIL_SETTINGS"}}));
      return json(200,{settings:r.Item?.settings||null});
    }
    let raw=event.body||"{}";
    if(event.isBase64Encoded) raw=Buffer.from(raw,"base64").toString("utf-8");
    const {settings}=JSON.parse(raw);
    if(!settings) return json(400,{message:"settings required"});
    const now=new Date().toISOString();
    await ddb.send(new PutCommand({TableName:TABLE,Item:{PK:`ORG#${orgId}`,SK:"EMAIL_SETTINGS",settings,orgId,updatedAt:now,updatedBy:claims["sub"]}}));
    return json(200,{success:true,savedAt:now});
  } catch(err) {
    console.error("email-settings error:",err);
    return json(500,{message:"Failed to save.",detail:err.message});
  }
};
EOF
cd /tmp/email-settings && zip email-settings.zip email-settings.mjs

aws lambda create-function \
  --function-name email-settings \
  --runtime nodejs22.x --architectures arm64 \
  --handler email-settings.handler \
  --role arn:aws:iam::${ACCOUNT_ID}:role/email-settings-role \
  --zip-file fileb:///tmp/email-settings/email-settings.zip \
  --environment "Variables={SETTINGS_TABLE=NexumSettings}" \
  --timeout 10 --region $REGION

# 4. Wire API Gateway
LAMBDA_ARN=$(aws lambda get-function --function-name email-settings --region $REGION --query 'Configuration.FunctionArn' --output text)
aws lambda add-permission --function-name email-settings --statement-id apigw-email-settings \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*/email-settings" --region $REGION
INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id $API_ID --integration-type AWS_PROXY \
  --integration-uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
  --payload-format-version 2.0 --region $REGION --query 'IntegrationId' --output text)
AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id $API_ID --region $REGION --query 'Items[0].AuthorizerId' --output text)
aws apigatewayv2 create-route --api-id $API_ID --route-key "POST /email-settings" \
  --target "integrations/${INTEGRATION_ID}" --authorization-type JWT --authorizer-id $AUTHORIZER_ID --region $REGION
aws apigatewayv2 create-route --api-id $API_ID --route-key "GET /email-settings" \
  --target "integrations/${INTEGRATION_ID}" --authorization-type JWT --authorizer-id $AUTHORIZER_ID --region $REGION

echo "Done — POST /email-settings and GET /email-settings live"
```
