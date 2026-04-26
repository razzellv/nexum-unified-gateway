# FIAS Session Lambda — fias-session

## Purpose
Persists a sealed FIAS assessment to DynamoDB when a Nexum admin pushes it to the platform.
Triggered from the FIAS internal tool after the assessor clicks "Push to Platform."

## API Gateway Route
POST /fias-sessions
- JWT Authorizer: Required (admin only — FIAS is an internal tool)
- Integration: fias-session Lambda

## DynamoDB Table: NexumFIAS
- PK: `FACILITY#${facilityId}`
- SK: `FIAS#${sessionId}`
- GSI1: `GSI1PK` = `ORG#${orgId}` / `GSI1SK` = `FIAS#${sealedAt}`

## Lambda Code (fias-session.mjs)

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.FIAS_TABLE || "NexumFIAS";

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

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  try {
    const claims = getClaims(event);
    if (!claims) return json(401, { message: "Unauthorized" });

    const facilityId = claims["custom:facilityId"] || "facility-unknown";
    const orgId      = claims["custom:orgId"]      || "org-unknown";
    const assessorId = claims["sub"];

    let rawBody = event.body || "{}";
    if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    const session = JSON.parse(rawBody);

    const {
      sessionId, facilityName, location, systemType, assessmentType,
      assessorName, assessorEmail, conductedAt, equipmentTag,
      conditionScore, performanceScore, riskScore, fiasScore, riskBand,
      conditionResponses, performanceNotes, riskNotes, findings,
      sealedAt,
    } = session;

    if (!sessionId || !fiasScore) {
      return json(400, { message: "sessionId and fiasScore are required" });
    }

    const now = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK:      `FACILITY#${facilityId}`,
        SK:      `FIAS#${sessionId}`,
        GSI1PK:  `ORG#${orgId}`,
        GSI1SK:  `FIAS#${sealedAt || now}`,

        sessionId,
        facilityId,
        orgId,
        assessorId,
        facilityName:       facilityName     || "",
        location:           location         || "",
        systemType:         systemType       || "",
        assessmentType:     assessmentType   || "",
        assessorName:       assessorName     || "",
        assessorEmail:      assessorEmail    || "",
        conductedAt:        conductedAt      || now,
        equipmentTag:       equipmentTag     || "",
        conditionScore:     conditionScore   ?? 0,
        performanceScore:   performanceScore ?? 0,
        riskScore:          riskScore        ?? 0,
        fiasScore:          fiasScore        ?? 0,
        riskBand:           riskBand         || "",
        conditionResponses: conditionResponses || {},
        performanceNotes:   performanceNotes || [],
        riskNotes:          riskNotes        || [],
        findings:           findings         || [],
        sealed:             true,
        sealedAt:           sealedAt         || now,
        createdAt:          now,
      },
      ConditionExpression: "attribute_not_exists(SK)", // prevent overwriting sealed records
    }));

    return json(200, { success: true, sessionId, fiasScore });

  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(409, { message: "Session already exists — sealed records cannot be overwritten." });
    }
    console.error("fias-session error:", err);
    return json(500, { message: "Failed to save FIAS session.", detail: err.message });
  }
};
```

## IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["dynamodb:PutItem"],
    "Resource": [
      "arn:aws:dynamodb:us-east-2:758027491272:table/NexumFIAS",
      "arn:aws:dynamodb:us-east-2:758027491272:table/NexumFIAS/index/*"
    ]
  }]
}
```

## AWS CLI Deployment

```bash
ACCOUNT_ID="758027491272"
REGION="us-east-2"
API_ID="vflco2pvo3"

# 1. Write Lambda source
mkdir -p /tmp/fias-session
cat > /tmp/fias-session/fias-session.mjs << 'EOF'
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.FIAS_TABLE || "NexumFIAS";

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
    const facilityId = claims["custom:facilityId"] || "facility-unknown";
    const orgId      = claims["custom:orgId"]      || "org-unknown";
    const assessorId = claims["sub"];
    let rawBody = event.body || "{}";
    if (event.isBase64Encoded) rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    const s = JSON.parse(rawBody);
    if (!s.sessionId || !s.fiasScore) return json(400, { message: "sessionId and fiasScore are required" });
    const now = new Date().toISOString();
    await ddb.send(new PutCommand({
      TableName: TABLE,
      ConditionExpression: "attribute_not_exists(SK)",
      Item: { PK: `FACILITY#${facilityId}`, SK: `FIAS#${s.sessionId}`, GSI1PK: `ORG#${orgId}`, GSI1SK: `FIAS#${s.sealedAt||now}`, ...s, facilityId, orgId, assessorId, sealed: true, createdAt: now },
    }));
    return json(200, { success: true, sessionId: s.sessionId, fiasScore: s.fiasScore });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") return json(409, { message: "Sealed record already exists." });
    console.error("fias-session error:", err);
    return json(500, { message: "Failed to save FIAS session.", detail: err.message });
  }
};
EOF
cd /tmp/fias-session && zip fias-session.zip fias-session.mjs

# 2. Create DynamoDB table
aws dynamodb create-table \
  --table-name NexumFIAS \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --region $REGION

# 3. Create IAM role
aws iam create-role --role-name fias-session-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
  --region $REGION
aws iam attach-role-policy --role-name fias-session-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam put-role-policy --role-name fias-session-role --policy-name fias-session-policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFIAS\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFIAS/index/*\"]}]}"

sleep 12

# 4. Create Lambda
aws lambda create-function \
  --function-name fias-session \
  --runtime nodejs22.x --architectures arm64 \
  --handler fias-session.handler \
  --role arn:aws:iam::${ACCOUNT_ID}:role/fias-session-role \
  --zip-file fileb:///tmp/fias-session/fias-session.zip \
  --environment "Variables={FIAS_TABLE=NexumFIAS}" \
  --timeout 10 --region $REGION

# 5. Wire API Gateway
LAMBDA_ARN=$(aws lambda get-function --function-name fias-session --region $REGION --query 'Configuration.FunctionArn' --output text)
aws lambda add-permission --function-name fias-session --statement-id apigw-fias-session \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*/fias-sessions" --region $REGION
INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
  --payload-format-version 2.0 --region $REGION --query 'IntegrationId' --output text)
AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id $API_ID --region $REGION --query 'Items[0].AuthorizerId' --output text)
aws apigatewayv2 create-route --api-id $API_ID --route-key "POST /fias-sessions" \
  --target "integrations/${INTEGRATION_ID}" --authorization-type JWT --authorizer-id $AUTHORIZER_ID --region $REGION

echo "Done — POST /fias-sessions live"
```
