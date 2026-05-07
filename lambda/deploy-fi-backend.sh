#!/bin/bash
# ── Nexum Suum — FI Platform Backend Deploy ───────────────────────────────────
# Deploys 5 Lambda functions + 21 API Gateway routes for the FI Platform
# live data layer (equipment, violations, work orders, inventory, VVFI).
#
# Run from the lambda/ folder:
#   bash deploy-fi-backend.sh

set -e

ACCOUNT_ID="758027491272"
REGION="us-east-2"
API_ID="vflco2pvo3"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Nexum Suum — FI Platform Backend Deploy"
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

# ── Helper: add / update an API Gateway route ──────────────────────────────────
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

  EXISTING_ROUTE=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
    --query "Items[?RouteKey=='${ROUTE_KEY}'].RouteId" --output text 2>/dev/null)

  if [ -n "$EXISTING_ROUTE" ] && [ "$EXISTING_ROUTE" != "None" ]; then
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
    echo "  ✓ Route $ROUTE_KEY updated → $LAMBDA_NAME"
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
    echo "  ✓ Route $ROUTE_KEY created → $LAMBDA_NAME"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
echo "1/4  IAM Roles"

for ROLE in fi-violations-role fi-work-orders-role fi-inventory-role fi-equipment-role fi-vvfi-role; do
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

# Scoped DynamoDB policies per Lambda
aws iam put-role-policy --role-name fi-violations-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ViolationEvents\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-work-orders-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-inventory-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumInventory\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/FacilityLogs-v2\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-equipment-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EquipmentLibrary\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/FacilityLogs-v2\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-vvfi-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFIASAssessments\"}]}" > /dev/null

echo "  ✓ Policies attached"
echo ""
echo "  Waiting 12s for IAM propagation..."
sleep 12

echo ""
echo "2/4  Lambda Functions"

deploy_lambda "nexum-fi-violations" "fi-violations.mjs" "fi-violations-role" \
  "VIOLATIONS_TABLE=ViolationEvents"

deploy_lambda "nexum-fi-work-orders" "fi-work-orders.mjs" "fi-work-orders-role" \
  "WORK_ORDERS_TABLE=WorkOrders"

deploy_lambda "nexum-fi-inventory" "fi-inventory.mjs" "fi-inventory-role" \
  "INVENTORY_TABLE=NexumInventory,LOGS_TABLE=FacilityLogs-v2"

deploy_lambda "nexum-fi-equipment" "fi-equipment.mjs" "fi-equipment-role" \
  "EQUIPMENT_TABLE=EquipmentLibrary,LOGS_TABLE=FacilityLogs-v2"

deploy_lambda "nexum-fi-vvfi" "fi-vvfi.mjs" "fi-vvfi-role" \
  "VVFI_TABLE=NexumFIASAssessments"

echo ""
echo "3/4  API Gateway Routes"
echo "     (existing routes updated in-place; new ones created)"

# Violations — 4 routes
add_route "GET /violations"          "nexum-fi-violations"  "jwt"
add_route "POST /violations"         "nexum-fi-violations"  "jwt"
add_route "PATCH /violations/{id}"   "nexum-fi-violations"  "jwt"
add_route "DELETE /violations/{id}"  "nexum-fi-violations"  "jwt"

# Work Orders — 5 routes
add_route "GET /work-orders"                   "nexum-fi-work-orders" "jwt"
add_route "POST /work-orders"                  "nexum-fi-work-orders" "jwt"
add_route "PATCH /work-orders/{id}"            "nexum-fi-work-orders" "jwt"
add_route "DELETE /work-orders/{id}"           "nexum-fi-work-orders" "jwt"
add_route "POST /work-orders/{id}/notes"       "nexum-fi-work-orders" "jwt"

# Inventory — 4 routes
add_route "GET /inventory"           "nexum-fi-inventory"   "jwt"
add_route "POST /inventory"          "nexum-fi-inventory"   "jwt"
add_route "PATCH /inventory/{id}"    "nexum-fi-inventory"   "jwt"
add_route "DELETE /inventory/{id}"   "nexum-fi-inventory"   "jwt"

# Logs (checkout + equipment) — 3 routes
add_route "POST /logs"               "nexum-fi-inventory"   "jwt"
add_route "GET /logs/latest"         "nexum-fi-equipment"   "jwt"
add_route "GET /logs/query"          "nexum-fi-equipment"   "jwt"

# Equipment — 5 routes
add_route "GET /equipment"           "nexum-fi-equipment"   "jwt"
add_route "POST /equipment"          "nexum-fi-equipment"   "jwt"
add_route "PATCH /equipment/{id}"    "nexum-fi-equipment"   "jwt"
add_route "DELETE /equipment/{id}"   "nexum-fi-equipment"   "jwt"
add_route "GET /metrics"             "nexum-fi-equipment"   "jwt"

# VVFI — 4 routes
add_route "GET /vvfi"                "nexum-fi-vvfi"        "jwt"
add_route "POST /vvfi"               "nexum-fi-vvfi"        "jwt"
add_route "PATCH /vvfi/{id}"         "nexum-fi-vvfi"        "jwt"
add_route "DELETE /vvfi/{id}"        "nexum-fi-vvfi"        "jwt"

echo ""
echo "4/4  Verify routes"
aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
  --query 'Items[?contains(RouteKey,`violations`) || contains(RouteKey,`work-orders`) || contains(RouteKey,`inventory`) || contains(RouteKey,`equipment`) || contains(RouteKey,`vvfi`) || contains(RouteKey,`logs`) || contains(RouteKey,`metrics`)].[RouteKey,AuthorizationType]' \
  --output table

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deploy complete."
echo ""
echo "  FI Platform Endpoints (all JWT-protected):"
echo "  GET    /violations    /work-orders    /inventory"
echo "  GET    /equipment     /metrics        /vvfi"
echo "  GET    /logs/latest   /logs/query"
echo "  POST   /violations    /work-orders    /inventory"
echo "  POST   /equipment     /logs           /vvfi"
echo "  PATCH  /violations/{id}  /work-orders/{id}  /inventory/{id}"
echo "  PATCH  /equipment/{id}   /vvfi/{id}"
echo "  DELETE /violations/{id}  /work-orders/{id}  /inventory/{id}"
echo "  DELETE /equipment/{id}   /vvfi/{id}"
echo "  POST   /work-orders/{id}/notes"
echo "═══════════════════════════════════════════════════"
