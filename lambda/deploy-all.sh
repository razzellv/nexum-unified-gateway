#!/bin/bash
# ── Nexum Suum Lambda Deploy Script ───────────────────────────────────────────
# Run from the repo root: bash lambda/deploy-all.sh
# Requires: AWS CLI configured, correct account/region

set -e

ACCOUNT_ID="758027491272"
REGION="us-east-2"
API_ID="vflco2pvo3"
FROM_EMAIL="noreply@nexumsuum.com"
FRONTEND_URL="https://nexumsuum.com"
ADMIN_EMAIL="razzellv@nexumsuum.com"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Nexum Suum Lambda Deploy"
echo "  Account: $ACCOUNT_ID  Region: $REGION"
echo "═══════════════════════════════════════════════"
echo ""

# ── Helper: zip and deploy one Lambda ─────────────────────────────────────────
deploy_lambda() {
  local NAME=$1
  local FILE=$2
  local ROLE=$3
  local ENV_VARS=$4

  echo "▶ Deploying $NAME..."
  TMPDIR=$(mktemp -d)
  cp "$SCRIPT_DIR/$FILE" "$TMPDIR/$FILE"
  (cd "$TMPDIR" && zip "$NAME.zip" "$FILE" > /dev/null)

  # Check if Lambda exists
  if aws lambda get-function --function-name "$NAME" --region $REGION > /dev/null 2>&1; then
    aws lambda update-function-code \
      --function-name "$NAME" \
      --zip-file "fileb://$TMPDIR/$NAME.zip" \
      --region $REGION > /dev/null
    echo "  ✓ $NAME updated"
  else
    aws lambda create-function \
      --function-name "$NAME" \
      --runtime nodejs22.x \
      --architectures arm64 \
      --handler "${FILE%.mjs}.handler" \
      --role "arn:aws:iam::${ACCOUNT_ID}:role/${ROLE}" \
      --zip-file "fileb://$TMPDIR/$NAME.zip" \
      --environment "Variables={$ENV_VARS}" \
      --timeout 15 \
      --region $REGION > /dev/null
    echo "  ✓ $NAME created"
  fi

  rm -rf "$TMPDIR"
}

# ── Helper: create DynamoDB table if it doesn't exist ─────────────────────────
create_table() {
  local NAME=$1
  if aws dynamodb describe-table --table-name "$NAME" --region $REGION > /dev/null 2>&1; then
    echo "  ✓ Table $NAME already exists"
  else
    shift
    aws dynamodb create-table --table-name "$NAME" "$@" --region $REGION > /dev/null
    echo "  ✓ Table $NAME created"
  fi
}

# ── Helper: add API Gateway route ─────────────────────────────────────────────
add_route() {
  local ROUTE_KEY=$1
  local LAMBDA_NAME=$2
  local AUTH=$3

  LAMBDA_ARN=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region $REGION \
    --query 'Configuration.FunctionArn' --output text)

  # Add invoke permission (ignore if already exists)
  STMT_ID="apigw-$(echo "$ROUTE_KEY" | tr '/ {}' '----' | tr '[:upper:]' '[:lower:]')"
  aws lambda add-permission \
    --function-name "$LAMBDA_NAME" \
    --statement-id "$STMT_ID" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" \
    --region $REGION > /dev/null 2>&1 || true

  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --payload-format-version 2.0 \
    --region $REGION \
    --query 'IntegrationId' --output text)

  if [ "$AUTH" = "jwt" ]; then
    AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id $API_ID --region $REGION \
      --query 'Items[0].AuthorizerId' --output text)
    aws apigatewayv2 create-route --api-id $API_ID \
      --route-key "$ROUTE_KEY" \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type JWT \
      --authorizer-id $AUTHORIZER_ID \
      --region $REGION > /dev/null
  else
    aws apigatewayv2 create-route --api-id $API_ID \
      --route-key "$ROUTE_KEY" \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type NONE \
      --region $REGION > /dev/null
  fi

  echo "  ✓ Route $ROUTE_KEY → $LAMBDA_NAME ($AUTH)"
}

# ══════════════════════════════════════════════════════════════════════════════
echo "1/5  DynamoDB Tables"
# NexumVendors
create_table NexumVendors \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

# NexumFIAS
create_table NexumFIAS \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

# NexumPilots
create_table NexumPilots \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

# NexumSettings
create_table NexumSettings \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

echo ""
echo "2/5  IAM Roles"

for ROLE in vendor-invite-role fias-session-role pilot-lambda-role email-settings-role; do
  if aws iam get-role --role-name "$ROLE" > /dev/null 2>&1; then
    echo "  ✓ Role $ROLE already exists"
  else
    aws iam create-role --role-name "$ROLE" \
      --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > /dev/null
    aws iam attach-role-policy --role-name "$ROLE" \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    echo "  ✓ Role $ROLE created"
  fi
done

# Attach DynamoDB + SES policies
aws iam put-role-policy --role-name vendor-invite-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumVendors\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumVendors/index/*\"]},{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\"],\"Resource\":\"*\"}]}" > /dev/null

aws iam put-role-policy --role-name fias-session-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFIAS\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFIAS/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name pilot-lambda-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumPilots\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumPilots/index/*\"]},{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\"],\"Resource\":\"*\"}]}" > /dev/null

aws iam put-role-policy --role-name email-settings-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumSettings\"}]}" > /dev/null

echo "  ✓ Policies attached"

echo ""
echo "  Waiting 12s for IAM propagation..."
sleep 12

echo ""
echo "3/5  Lambda Functions"

deploy_lambda "vendor-invite"  "vendor-invite.mjs"  "vendor-invite-role"  "VENDORS_TABLE=NexumVendors,SES_FROM_EMAIL=${FROM_EMAIL},FRONTEND_URL=${FRONTEND_URL}"
deploy_lambda "fias-session"   "fias-session.mjs"   "fias-session-role"   "FIAS_TABLE=NexumFIAS"
deploy_lambda "pilot-submit"   "pilot-submit.mjs"   "pilot-lambda-role"   "PILOTS_TABLE=NexumPilots,SES_FROM_EMAIL=${FROM_EMAIL},FRONTEND_URL=${FRONTEND_URL},ADMIN_EMAIL=${ADMIN_EMAIL}"
deploy_lambda "pilot-admin"    "pilot-admin.mjs"    "pilot-lambda-role"   "PILOTS_TABLE=NexumPilots,SES_FROM_EMAIL=${FROM_EMAIL},FRONTEND_URL=${FRONTEND_URL}"
deploy_lambda "email-settings" "email-settings.mjs" "email-settings-role" "SETTINGS_TABLE=NexumSettings"

echo ""
echo "4/5  API Gateway Routes"

add_route "POST /vendors/invite"                    "vendor-invite"  "jwt"
add_route "POST /fias-sessions"                     "fias-session"   "jwt"
add_route "POST /pilot-application"                 "pilot-submit"   "none"
add_route "POST /pilot-verify"                      "pilot-submit"   "none"
add_route "GET /pilot-applications"                 "pilot-admin"    "jwt"
add_route "PATCH /pilot-applications/{id}/{action}" "pilot-admin"    "jwt"
add_route "POST /email-settings"                    "email-settings" "jwt"
add_route "GET /email-settings"                     "email-settings" "jwt"

echo ""
echo "5/5  Verify routes"
aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
  --query 'Items[?contains(RouteKey,`invite`) || contains(RouteKey,`fias`) || contains(RouteKey,`pilot`) || contains(RouteKey,`email-settings`)].[RouteKey,AuthorizationType]' \
  --output table

echo ""
echo "═══════════════════════════════════════════════"
echo "  Deploy complete."
echo "  All 5 Lambdas live on API: $API_ID"
echo "═══════════════════════════════════════════════"
