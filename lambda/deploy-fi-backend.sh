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

# ── Helper: ensure DynamoDB table exists ──────────────────────────────────────
ensure_table() {
  local NAME=$1 KEY=$2
  if aws dynamodb describe-table --table-name "$NAME" --region $REGION > /dev/null 2>&1; then
    echo "  ✓ Table $NAME already exists"
  else
    aws dynamodb create-table \
      --table-name "$NAME" \
      --attribute-definitions "AttributeName=${KEY},AttributeType=S" \
      --key-schema "AttributeName=${KEY},KeyType=HASH" \
      --billing-mode PAY_PER_REQUEST \
      --region $REGION > /dev/null
    echo "  ✓ Table $NAME created"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
echo "0/4  DynamoDB Tables"
ensure_table "NexumOnboardingRecords" "facilityId"
ensure_table "NexumCourses"           "courseId"
ensure_table "NexumBookings"          "bookingId"
echo ""

echo "1/4  IAM Roles"

for ROLE in fi-violations-role fi-work-orders-role fi-inventory-role fi-equipment-role fi-vvfi-role fi-messages-role fi-audit-reports-role fi-users-role fi-intake-role fi-onboarding-role fi-courses-role; do
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
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ViolationEvents\"},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:GetItem\",\"dynamodb:UpdateItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumOnboardingRecords\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-work-orders-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\"},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:GetItem\",\"dynamodb:UpdateItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumOnboardingRecords\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-inventory-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumInventory\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/FacilityLogs-v2\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-equipment-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EquipmentLibrary\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/FacilityLogs-v2\"]},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:GetItem\",\"dynamodb:UpdateItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumOnboardingRecords\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-vvfi-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFIASAssessments\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-messages-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumMessages\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumMessages/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-audit-reports-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/AuditReports\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/AuditReports/index/*\"]},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:GetItem\",\"dynamodb:UpdateItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumOnboardingRecords\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-users-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"cognito-idp:ListUsers\",\"cognito-idp:AdminGetUser\",\"cognito-idp:AdminUpdateUserAttributes\"],\"Resource\":\"arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/us-east-2_mKMqaRq70\"},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumUsers\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumUsers/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-intake-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumLeads\"},{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\"],\"Resource\":\"*\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-onboarding-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:Scan\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumOnboardingRecords\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-courses-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Scan\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumCourses\"}]}" > /dev/null

echo "▶ Ensuring fi-bookings-role..."
BOOKINGS_POLICY='{
  "Version":"2012-10-17",
  "Statement":[
    {"Effect":"Allow","Action":["dynamodb:PutItem","dynamodb:GetItem","dynamodb:UpdateItem","dynamodb:DeleteItem","dynamodb:Scan","dynamodb:Query"],"Resource":"arn:aws:dynamodb:us-east-2:758027491272:table/NexumBookings"},
    {"Effect":"Allow","Action":["ses:SendEmail","ses:SendRawEmail"],"Resource":"*"},
    {"Effect":"Allow","Action":["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],"Resource":"*"}
  ]
}'
if aws iam get-role --role-name "fi-bookings-role" > /dev/null 2>&1; then
  echo "  ✓ Role fi-bookings-role already exists"
else
  aws iam create-role --role-name "fi-bookings-role" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > /dev/null
  aws iam attach-role-policy --role-name "fi-bookings-role" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "  ✓ Role fi-bookings-role created"
fi
aws iam put-role-policy --role-name fi-bookings-role --policy-name policy \
  --policy-document "$BOOKINGS_POLICY" > /dev/null

echo "▶ Ensuring fi-sms-role..."
SMS_POLICY='{
  "Version":"2012-10-17",
  "Statement":[
    {"Effect":"Allow","Action":["sns:Publish"],"Resource":"*"},
    {"Effect":"Allow","Action":["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],"Resource":"*"}
  ]
}'
if aws iam get-role --role-name "fi-sms-role" > /dev/null 2>&1; then
  echo "  ✓ Role fi-sms-role already exists"
else
  aws iam create-role --role-name "fi-sms-role" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > /dev/null
  aws iam attach-role-policy --role-name "fi-sms-role" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "  ✓ Role fi-sms-role created"
fi
aws iam put-role-policy --role-name fi-sms-role --policy-name policy \
  --policy-document "$SMS_POLICY" > /dev/null

echo "  ✓ Policies attached"
echo ""
echo "  Waiting 12s for IAM propagation..."
sleep 12

echo ""
echo "2/4  Lambda Functions (11 total)"

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

deploy_lambda "nexum-fi-messages" "fi-messages.mjs" "fi-messages-role" \
  "MESSAGES_TABLE=NexumMessages"

deploy_lambda "nexum-fi-audit-reports" "fi-audit-reports.mjs" "fi-audit-reports-role" \
  "AUDIT_TABLE=AuditReports"

deploy_lambda "nexum-fi-users" "fi-users.mjs" "fi-users-role" \
  "USER_POOL_ID=us-east-2_mKMqaRq70,USERS_TABLE=NexumUsers"

deploy_lambda "nexum-fi-intake" "fi-intake.mjs" "fi-intake-role" \
  "LEADS_TABLE=NexumLeads,SES_FROM_EMAIL=info@nexumsuum-facilityintelligence.com,ADMIN_EMAIL=razzellv@nexumsuum.com"

deploy_lambda "nexum-fi-onboarding" "fi-onboarding.mjs" "fi-onboarding-role" \
  "ONBOARDING_TABLE=NexumOnboardingRecords"

deploy_lambda "nexum-fi-courses" "fi-courses.mjs" "fi-courses-role" \
  "COURSES_TABLE=NexumCourses"

deploy_lambda "nexum-fi-bookings" "fi-bookings.mjs" "fi-bookings-role" \
  "ADMIN_EMAIL=razzellv@nexumsuum.com,FROM_EMAIL=no-reply@nexumsuum-facilityintelligence.com"

deploy_lambda "nexum-fi-sms" "fi-sms.mjs" "fi-sms-role" \
  "ADMIN_PHONE=+19734448260"

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

# Facility Logs canonical FE paths (handled by equipment Lambda)
add_route "GET /facility-logs"           "nexum-fi-equipment"       "jwt"
add_route "POST /facility-log-ingest"    "nexum-fi-equipment"       "jwt"

# Messages — 4 routes
add_route "GET /messages"                "nexum-fi-messages"        "jwt"
add_route "POST /messages"               "nexum-fi-messages"        "jwt"
add_route "PATCH /messages/{id}"         "nexum-fi-messages"        "jwt"
add_route "DELETE /messages/{id}"        "nexum-fi-messages"        "jwt"

# Audit Reports — 4 routes
add_route "GET /audit-reports"           "nexum-fi-audit-reports"   "jwt"
add_route "POST /audit-reports"          "nexum-fi-audit-reports"   "jwt"
add_route "PATCH /audit-reports/{id}"    "nexum-fi-audit-reports"   "jwt"
add_route "DELETE /audit-reports/{id}"   "nexum-fi-audit-reports"   "jwt"

# Users — 3 routes (Cognito-backed, leadership only)
add_route "GET /users"                   "nexum-fi-users"           "jwt"
add_route "GET /users/{userId}"          "nexum-fi-users"           "jwt"
add_route "PATCH /users/{userId}"        "nexum-fi-users"           "jwt"

# Intake — public, no JWT
add_route "POST /intake"                 "nexum-fi-intake"          "none"

# Onboarding tracker
add_route "GET /onboarding"                          "nexum-fi-onboarding"  "jwt"
add_route "POST /onboarding"                         "nexum-fi-onboarding"  "jwt"
add_route "GET /onboarding/all"                      "nexum-fi-onboarding"  "jwt"
add_route "POST /onboarding/{facilityId}/milestone"  "nexum-fi-onboarding"  "jwt"

# Courses (Optimize & Learn)
add_route "GET /courses"           "nexum-fi-courses"  "jwt"
add_route "POST /courses"          "nexum-fi-courses"  "jwt"
add_route "PATCH /courses/{id}"    "nexum-fi-courses"  "jwt"
add_route "DELETE /courses/{id}"   "nexum-fi-courses"  "jwt"

# Bookings — public (no JWT)
add_route "GET /bookings"          "nexum-fi-bookings"  "none"
add_route "POST /bookings"         "nexum-fi-bookings"  "none"
add_route "GET /bookings/all"      "nexum-fi-bookings"  "none"
add_route "PATCH /bookings/{id}"   "nexum-fi-bookings"  "none"
add_route "DELETE /bookings/{id}"  "nexum-fi-bookings"  "none"

add_route "POST /admin/send-email"  "pilot-admin"    "jwt"
add_route "POST /admin/send-sms"    "nexum-fi-sms"   "jwt"

echo ""
echo "4/4  Verify routes"
aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
  --query 'Items[?contains(RouteKey,`violations`) || contains(RouteKey,`work-orders`) || contains(RouteKey,`inventory`) || contains(RouteKey,`equipment`) || contains(RouteKey,`vvfi`) || contains(RouteKey,`logs`) || contains(RouteKey,`metrics`) || contains(RouteKey,`messages`) || contains(RouteKey,`audit-reports`) || contains(RouteKey,`users`) || contains(RouteKey,`intake`)].[RouteKey,AuthorizationType]' \
  --output table

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deploy complete."
echo ""
echo "  FI Platform Endpoints (JWT unless noted):"
echo "  GET    /violations     /work-orders    /inventory"
echo "  GET    /equipment      /metrics        /vvfi"
echo "  GET    /facility-logs  /logs/latest    /logs/query"
echo "  GET    /messages       /audit-reports  /users"
echo "  POST   /violations     /work-orders    /inventory"
echo "  POST   /equipment      /logs           /vvfi"
echo "  POST   /facility-log-ingest  /messages  /audit-reports"
echo "  POST   /intake (PUBLIC — no JWT)"
echo "  PATCH  /violations/{id}   /work-orders/{id}  /inventory/{id}"
echo "  PATCH  /equipment/{id}    /vvfi/{id}          /messages/{id}"
echo "  PATCH  /audit-reports/{id} /users/{userId}"
echo "  DELETE /violations/{id}   /work-orders/{id}  /inventory/{id}"
echo "  DELETE /equipment/{id}    /vvfi/{id}          /messages/{id}"
echo "  DELETE /audit-reports/{id}"
echo "  POST   /work-orders/{id}/notes"
echo "  GET    /onboarding         /onboarding/all"
echo "  POST   /onboarding         /onboarding/{facilityId}/milestone"
echo "═══════════════════════════════════════════════════"
