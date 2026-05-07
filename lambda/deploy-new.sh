#!/bin/bash
# ── Nexum Suum — Lead Pipeline + FIAS Clients Deploy ──────────────────────────
# Creates: NexumLeads table, NexumFIASClients table, fias-clients Lambda,
#          nexum-leads Lambda, and 9 API Gateway routes.
#
# Run from the lambda/ folder:
#   bash deploy-new.sh

set -e

ACCOUNT_ID="758027491272"
REGION="us-east-2"
API_ID="vflco2pvo3"
FROM_EMAIL="noreply@nexumsuum.com"
ADMIN_EMAIL="razzellv@nexumsuum.com"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Nexum Suum — Lead Pipeline + FIAS Clients Deploy"
echo "  Account: $ACCOUNT_ID  Region: $REGION"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Helper: zip and deploy one Lambda ─────────────────────────────────────────
deploy_lambda() {
  local NAME=$1 FILE=$2 ROLE=$3 ENV_VARS=$4
  echo "▶ Deploying $NAME..."
  TMPDIR=$(mktemp -d)
  cp "$SCRIPT_DIR/$FILE" "$TMPDIR/$FILE"
  (cd "$TMPDIR" && zip "$NAME.zip" "$FILE" > /dev/null)

  if aws lambda get-function --function-name "$NAME" --region $REGION > /dev/null 2>&1; then
    aws lambda update-function-code \
      --function-name "$NAME" \
      --zip-file "fileb://$TMPDIR/$NAME.zip" \
      --region $REGION > /dev/null
    # Update env vars on existing function
    aws lambda update-function-configuration \
      --function-name "$NAME" \
      --environment "Variables={$ENV_VARS}" \
      --region $REGION > /dev/null 2>&1 || true
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
  local ROUTE_KEY=$1 LAMBDA_NAME=$2 AUTH=$3

  LAMBDA_ARN=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region $REGION \
    --query 'Configuration.FunctionArn' --output text)

  STMT_ID="apigw-$(echo "$ROUTE_KEY" | tr '/ {}' '----' | tr '[:upper:]' '[:lower:]' | tr -s '-')"
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

  # Check if route already exists
  EXISTING_ROUTE=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
    --query "Items[?RouteKey=='${ROUTE_KEY}'].RouteId" --output text 2>/dev/null)

  if [ -n "$EXISTING_ROUTE" ] && [ "$EXISTING_ROUTE" != "None" ]; then
    # Update existing route to point to new integration
    if [ "$AUTH" = "jwt" ]; then
      AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id $API_ID --region $REGION \
        --query 'Items[0].AuthorizerId' --output text)
      aws apigatewayv2 update-route --api-id $API_ID \
        --route-id "$EXISTING_ROUTE" \
        --target "integrations/${INTEGRATION_ID}" \
        --authorization-type JWT \
        --authorizer-id "$AUTHORIZER_ID" \
        --region $REGION > /dev/null
    else
      aws apigatewayv2 update-route --api-id $API_ID \
        --route-id "$EXISTING_ROUTE" \
        --target "integrations/${INTEGRATION_ID}" \
        --authorization-type NONE \
        --region $REGION > /dev/null
    fi
    echo "  ✓ Route $ROUTE_KEY updated → $LAMBDA_NAME ($AUTH)"
  else
    if [ "$AUTH" = "jwt" ]; then
      AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id $API_ID --region $REGION \
        --query 'Items[0].AuthorizerId' --output text)
      aws apigatewayv2 create-route --api-id $API_ID \
        --route-key "$ROUTE_KEY" \
        --target "integrations/${INTEGRATION_ID}" \
        --authorization-type JWT \
        --authorizer-id "$AUTHORIZER_ID" \
        --region $REGION > /dev/null
    else
      aws apigatewayv2 create-route --api-id $API_ID \
        --route-key "$ROUTE_KEY" \
        --target "integrations/${INTEGRATION_ID}" \
        --authorization-type NONE \
        --region $REGION > /dev/null
    fi
    echo "  ✓ Route $ROUTE_KEY created → $LAMBDA_NAME ($AUTH)"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
echo "1/5  DynamoDB Tables"

create_table NexumFIASClients \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

create_table NexumLeads \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

echo ""
echo "2/5  IAM Roles"

for ROLE in fias-clients-role nexum-leads-role; do
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

aws iam put-role-policy --role-name fias-clients-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFIASClients\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFIASClients/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name nexum-leads-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumLeads\"]},{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\"],\"Resource\":\"*\"}]}" > /dev/null

echo "  ✓ Policies attached"
echo ""
echo "  Waiting 12s for IAM propagation..."
sleep 12

echo ""
echo "3/5  Lambda Functions"

deploy_lambda "nexum-fias-clients" "fias-clients.mjs" "fias-clients-role" \
  "FIAS_CLIENTS_TABLE=NexumFIASClients"

deploy_lambda "nexum-leads" "nexum-leads.mjs" "nexum-leads-role" \
  "LEADS_TABLE=NexumLeads,SES_FROM_EMAIL=${FROM_EMAIL},ADMIN_EMAIL=${ADMIN_EMAIL}"

echo ""
echo "4/5  API Gateway Routes"
echo "     (existing routes are updated in-place; new ones created)"

# FIAS Clients — 4 routes
add_route "GET    /fias/clients"              "nexum-fias-clients" "jwt"
add_route "POST   /fias/clients"              "nexum-fias-clients" "jwt"
add_route "PUT    /fias/clients/{clientId}"   "nexum-fias-clients" "jwt"
add_route "DELETE /fias/clients/{clientId}"   "nexum-fias-clients" "jwt"

# Leads — 4 routes (JWT)
add_route "GET    /leads"                     "nexum-leads" "jwt"
add_route "POST   /leads"                     "nexum-leads" "jwt"
add_route "PATCH  /leads/{id}"                "nexum-leads" "jwt"
add_route "DELETE /leads/{id}"                "nexum-leads" "jwt"

# Calendly webhook — public, no auth
add_route "POST   /leads/webhook/calendly"    "nexum-leads" "none"

echo ""
echo "5/5  Verify routes"
aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
  --query 'Items[?contains(RouteKey,`fias/clients`) || contains(RouteKey,`leads`)].[RouteKey,AuthorizationType]' \
  --output table

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deploy complete."
echo ""
echo "  Endpoints:"
echo "  GET    https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/leads"
echo "  POST   https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/leads"
echo "  PATCH  https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/leads/{id}"
echo "  DELETE https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/leads/{id}"
echo ""
echo "  Calendly webhook URL (paste into Calendly → Integrations → Webhooks):"
echo "  POST https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/leads/webhook/calendly"
echo ""
echo "  FIAS Clients:"
echo "  GET/POST https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/fias/clients"
echo "═══════════════════════════════════════════════════"
