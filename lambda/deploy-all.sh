#!/bin/bash
# ── Nexum Suum Lambda Deploy Script ───────────────────────────────────────────
# Run from the repo root: bash lambda/deploy-all.sh
# Requires: AWS CLI configured, correct account/region

set -e

ACCOUNT_ID="758027491272"
REGION="us-east-2"
API_ID="vflco2pvo3"
FROM_EMAIL="noreply@nexumsuum.com"
FRONTEND_URL="https://portal.nexumsuum-facilityintelligence.com"
PORTAL_URL="https://nexumsuum-connections.netlify.app"
ADMIN_EMAIL="razzellv@nexumsuum.com"
# Set this after deploying the Apps Script (Extensions → Apps Script → Deploy → Web app URL)
SHEETS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbxmbYPEuVIRL_pb2BJxcjnli5UYyUe0M2kI6NedHk9bBu3FuYhex1lAuDYv1psACGL9/exec"
# Set this from Stripe Dashboard → Developers → Webhooks → signing secret
STRIPE_WEBHOOK_SECRET=""
# Set this from Stripe Dashboard → Developers → API keys → Secret key
STRIPE_SECRET_KEY=""

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
echo "1/6  DynamoDB Tables"
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

# NexumProspectBuyers
create_table NexumProspectBuyers \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

echo ""
echo "2/6  IAM Roles"

for ROLE in vendor-invite-role fias-session-role pilot-lambda-role email-settings-role prospect-buyers-role stripe-webhook-role; do
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

aws iam put-role-policy --role-name prospect-buyers-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumProspectBuyers\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumProspectBuyers/index/*\"]},{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\"],\"Resource\":\"*\"}]}" > /dev/null

aws iam put-role-policy --role-name stripe-webhook-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\"],\"Resource\":\"*\"},{\"Effect\":\"Allow\",\"Action\":[\"lambda:InvokeFunction\"],\"Resource\":\"arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:nexum-prospect-buyers\"}]}" > /dev/null

echo "  ✓ Policies attached"

echo ""
echo "  Waiting 12s for IAM propagation..."
sleep 12

echo ""
echo "3/6  Lambda Functions"

deploy_lambda "vendor-invite"           "vendor-invite.mjs"        "vendor-invite-role"    "VENDORS_TABLE=NexumVendors,SES_FROM_EMAIL=${FROM_EMAIL},FRONTEND_URL=${FRONTEND_URL}"
deploy_lambda "fias-session"            "fias-session.mjs"         "fias-session-role"     "FIAS_TABLE=NexumFIAS"
deploy_lambda "pilot-submit"            "pilot-submit.mjs"         "pilot-lambda-role"     "PILOTS_TABLE=NexumPilots,SES_FROM_EMAIL=${FROM_EMAIL},FRONTEND_URL=${FRONTEND_URL},ADMIN_EMAIL=${ADMIN_EMAIL}"
deploy_lambda "pilot-admin"             "pilot-admin.mjs"          "pilot-lambda-role"     "PILOTS_TABLE=NexumPilots,SES_FROM_EMAIL=${FROM_EMAIL},FRONTEND_URL=${FRONTEND_URL}"
deploy_lambda "email-settings"          "email-settings.mjs"       "email-settings-role"   "SETTINGS_TABLE=NexumSettings"
deploy_lambda "nexum-prospect-buyers"   "prospect-buyers.mjs"      "prospect-buyers-role"  "PROSPECTS_TABLE=NexumProspectBuyers,SES_FROM_EMAIL=${FROM_EMAIL},ADMIN_EMAIL=${ADMIN_EMAIL},FRONTEND_URL=${FRONTEND_URL},PORTAL_URL=${PORTAL_URL},SHEETS_SCRIPT_URL=${SHEETS_SCRIPT_URL}"
deploy_lambda "nexum-stripe-webhook"    "stripe-webhook.mjs"       "stripe-webhook-role"   "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY},STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET},PROSPECTS_LAMBDA_NAME=nexum-prospect-buyers,SES_FROM_EMAIL=${FROM_EMAIL},ADMIN_EMAIL=${ADMIN_EMAIL},PORTAL_URL=${PORTAL_URL},FRONTEND_URL=${FRONTEND_URL}"

echo ""
echo "4/6  API Gateway Routes"

add_route "POST /vendors/invite"                        "vendor-invite"         "jwt"
add_route "POST /fias-sessions"                         "fias-session"          "jwt"
add_route "POST /pilot-application"                     "pilot-submit"          "none"
add_route "POST /pilot-verify"                          "pilot-submit"          "none"
add_route "GET /pilot-applications"                     "pilot-admin"           "jwt"
add_route "POST /pilot-applications/{id}/{action}"      "pilot-admin"           "jwt"
add_route "POST /email-settings"                        "email-settings"        "jwt"
add_route "GET /email-settings"                         "email-settings"        "jwt"
add_route "GET /prospect-buyers"                        "nexum-prospect-buyers" "jwt"
add_route "POST /prospect-buyers/{id}/{action}"         "nexum-prospect-buyers" "jwt"
add_route "POST /stripe-webhook"                        "nexum-stripe-webhook"  "none"

echo ""
echo "5/6  Stripe Webhook registration reminder"
echo "  ─────────────────────────────────────────────────"
echo "  After deploy, register this URL in Stripe Dashboard:"
echo "  https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/stripe-webhook"
echo "  Event to listen for: checkout.session.completed"
echo "  Copy the signing secret → set STRIPE_WEBHOOK_SECRET above → redeploy"
echo "  ─────────────────────────────────────────────────"

echo ""
echo "6/6  Verify routes"
aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
  --query 'Items[?contains(RouteKey,`invite`) || contains(RouteKey,`pilot`) || contains(RouteKey,`prospect`) || contains(RouteKey,`stripe`) || contains(RouteKey,`email-settings`)].[RouteKey,AuthorizationType]' \
  --output table

echo ""
echo "═══════════════════════════════════════════════"
echo "  Deploy complete."
echo "  All 7 Lambdas live on API: $API_ID"
echo "═══════════════════════════════════════════════"
