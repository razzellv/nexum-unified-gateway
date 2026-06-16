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

# ── Helper: create DynamoDB table if it does not already exist ─────────────────
ensure_table() {
  local NAME=$1 KEY_SCHEMA=$2 ATTR_DEFS=$3 BILLING=$4
  if aws dynamodb describe-table --table-name "$NAME" --region $REGION > /dev/null 2>&1; then
    echo "  ✓ Table $NAME already exists"
  else
    aws dynamodb create-table \
      --table-name "$NAME" \
      --key-schema $KEY_SCHEMA \
      --attribute-definitions $ATTR_DEFS \
      --billing-mode "$BILLING" \
      --region $REGION > /dev/null
    echo "  ✓ Table $NAME created"
  fi
}

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
    aws lambda wait function-updated \
      --function-name "$NAME" \
      --region $REGION 2>/dev/null || sleep 5
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

# ── Helper: delete integrations not referenced by any route ───────────────────
purge_unused_integrations() {
  echo "▶ Purging orphaned integrations (frees capacity)..."

  # --max-results 300 is the service hard limit; avoids pagination issues
  USED_IDS=$(aws apigatewayv2 get-routes \
    --api-id "$API_ID" --region "$REGION" --max-results 500 \
    --query 'Items[].Target' --output text 2>/dev/null \
    | tr '\t' '\n' | sed 's|integrations/||g' | grep -v '^$' | sort -u)

  ALL_IDS=$(aws apigatewayv2 get-integrations \
    --api-id "$API_ID" --region "$REGION" --max-results 300 \
    --query 'Items[].IntegrationId' --output text 2>/dev/null \
    | tr '\t' '\n' | grep -v '^$')

  TOTAL=0; DELETED=0
  for INT_ID in $ALL_IDS; do
    TOTAL=$((TOTAL + 1))
    if ! echo "$USED_IDS" | grep -qx "$INT_ID"; then
      aws apigatewayv2 delete-integration \
        --api-id "$API_ID" \
        --integration-id "$INT_ID" \
        --region "$REGION" > /dev/null 2>&1 && DELETED=$((DELETED + 1))
    fi
  done
  REMAINING=$((TOTAL - DELETED))
  echo "  ✓ Removed $DELETED orphaned integrations ($REMAINING remaining of 300 max)"

  # Delete routes whose target is not in integrations/<id> format.
  # These are leftovers from broken deploys; trying to update-route on them
  # causes a BadRequestException that can kill the script on macOS bash 3.2.
  TMPFILE=$(mktemp)
  aws apigatewayv2 get-routes --api-id "$API_ID" --region "$REGION" --max-results 500 \
    --query 'Items[].[RouteId, Target]' --output text 2>/dev/null > "$TMPFILE" || true
  MALFORMED_DEL=0
  while IFS=$(printf '\t') read -r rid target; do
    [[ -z "$rid" || "$rid" == "None" ]] && continue
    case "$target" in
      integrations/*) continue ;;  # valid target — skip
    esac
    aws apigatewayv2 delete-route --api-id "$API_ID" --route-id "$rid" \
      --region "$REGION" > /dev/null 2>&1 && MALFORMED_DEL=$((MALFORMED_DEL + 1)) || true
    echo "  ✓ Removed malformed route $rid (bad target: ${target:-empty})"
  done < "$TMPFILE"
  rm -f "$TMPFILE"
  if [ $MALFORMED_DEL -eq 0 ]; then echo "  ✓ No malformed routes found"; fi
}

# ── Helper: add / update an API Gateway route ──────────────────────────────────
# Reuses the existing integration for a Lambda rather than creating a new one
# each time — prevents the 300-integration hard limit from being hit on re-deploys.
# Uses --max-results 300 to avoid pagination truncating the integrations list.
add_route() {
  local ROUTE_KEY=$1 LAMBDA_NAME=$2 AUTH=$3

  LAMBDA_ARN=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" \
    --query 'Configuration.FunctionArn' --output text)

  local INT_URI="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"

  # Reuse existing integration for this Lambda URI (--max-results 300 avoids pagination miss)
  INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
    --api-id "$API_ID" --region "$REGION" --max-results 300 \
    --query "Items[?IntegrationUri=='${INT_URI}'] | [0].IntegrationId" \
    --output text 2>/dev/null)

  # Strip any trailing whitespace/newlines that might sneak through
  INTEGRATION_ID="${INTEGRATION_ID//[$'\t\r\n ']}"

  if [ -z "$INTEGRATION_ID" ] || [ "$INTEGRATION_ID" = "None" ]; then
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
      --api-id "$API_ID" \
      --integration-type AWS_PROXY \
      --integration-uri "$INT_URI" \
      --payload-format-version 2.0 \
      --region "$REGION" \
      --query 'IntegrationId' --output text 2>/dev/null)
    INTEGRATION_ID="${INTEGRATION_ID//[$'\t\r\n ']}"
  fi

  # Guard: if INTEGRATION_ID is still empty, skip this route rather than corrupting it
  if [ -z "$INTEGRATION_ID" ] || [ "$INTEGRATION_ID" = "None" ]; then
    echo "  ✗ SKIPPED $ROUTE_KEY — could not obtain integration ID (limit reached?)"
    echo "    Run: bash ./purge-integrations.sh  then re-run this script"
    return 1
  fi

  STMT_ID="apigw-$(echo "$ROUTE_KEY" | tr '/ {}' '----' | tr '[:upper:]' '[:lower:]' | tr -s '-')"
  aws lambda add-permission \
    --function-name "$LAMBDA_NAME" \
    --statement-id "$STMT_ID" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" \
    --region "$REGION" > /dev/null 2>&1 || true

  EXISTING_ROUTE=$(aws apigatewayv2 get-routes --api-id "$API_ID" --region "$REGION" \
    --max-results 500 \
    --query "Items[?RouteKey=='${ROUTE_KEY}'].RouteId" --output text 2>/dev/null)
  EXISTING_ROUTE="${EXISTING_ROUTE//[$'\t\r\n ']}"

  local ROUTE_ACTION="created"
  if [ -n "$EXISTING_ROUTE" ] && [ "$EXISTING_ROUTE" != "None" ]; then
    # Try to update in-place; if route is malformed, delete it and fall through to create.
    # Use `if cmd; then` (not `cmd || var=false`) — bash suppresses set -e inside `if` conditions.
    local UPDATE_SUCCEEDED=false
    if [ "$AUTH" = "jwt" ]; then
      AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id "$API_ID" --region "$REGION" \
        --query 'Items[0].AuthorizerId' --output text 2>/dev/null) || true
      if aws apigatewayv2 update-route --api-id "$API_ID" \
          --route-id "$EXISTING_ROUTE" \
          --target "integrations/${INTEGRATION_ID}" \
          --authorization-type JWT \
          --authorizer-id "$AUTHORIZER_ID" \
          --region "$REGION" > /dev/null 2>&1; then
        UPDATE_SUCCEEDED=true
      fi
    else
      if aws apigatewayv2 update-route --api-id "$API_ID" \
          --route-id "$EXISTING_ROUTE" \
          --target "integrations/${INTEGRATION_ID}" \
          --authorization-type NONE \
          --region "$REGION" > /dev/null 2>&1; then
        UPDATE_SUCCEEDED=true
      fi
    fi
    if [ "$UPDATE_SUCCEEDED" = true ]; then
      echo "  ✓ Route $ROUTE_KEY updated → $LAMBDA_NAME"
      return 0
    fi
    # Update failed (malformed/orphaned route) — delete and recreate cleanly
    aws apigatewayv2 delete-route --api-id "$API_ID" \
      --route-id "$EXISTING_ROUTE" --region "$REGION" > /dev/null 2>&1 || true
    ROUTE_ACTION="recreated"
  fi

  if [ "$AUTH" = "jwt" ]; then
    AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id "$API_ID" --region "$REGION" \
      --query 'Items[0].AuthorizerId' --output text)
    aws apigatewayv2 create-route --api-id "$API_ID" \
      --route-key "$ROUTE_KEY" \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type JWT \
      --authorizer-id "$AUTHORIZER_ID" \
      --region "$REGION" > /dev/null
  else
    aws apigatewayv2 create-route --api-id "$API_ID" \
      --route-key "$ROUTE_KEY" \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type NONE \
      --region "$REGION" > /dev/null
  fi
  echo "  ✓ Route $ROUTE_KEY $ROUTE_ACTION → $LAMBDA_NAME"
}

# ══════════════════════════════════════════════════════════════════════════════
echo "0/4  DynamoDB Tables (Issue Origin & Reporting Intelligence)"

# Core operational tables (created if they don't already exist)
ensure_table "FacilityLogs-v2" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "WorkOrders" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "ViolationEvents" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "EquipmentLibrary" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumInventory" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumOrganizations" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumUsers" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "FacilitySettings" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "SpendingTransactions" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "AuditReports" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "InventoryParts" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumLearningEnrollments" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "TrainingAssignments" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "UsageMetrics" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "ViolationsType" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# NexumFIASAssessments — VVFI sessions, PK=FACILITY#{id}, SK=VVFI#{ts}#{id}
ensure_table "NexumFIASAssessments" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# IssueOrigins — PK=FACILITY#{id}, SK=ISSUE#{uuid}
ensure_table "IssueOrigins" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# IssueReportAttempts — PK=ISSUE#{uuid}, SK=ATTEMPT#{ts}#{uuid}
ensure_table "IssueReportAttempts" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# LinkedHistoricalRecords — PK=ISSUE#{uuid}, SK=LINK#{type}#{recordId}
ensure_table "LinkedHistoricalRecords" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# BMS / Skid tables
ensure_table "NexumBMSFeeds" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumSkids" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumBMSData" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# ── Cost Intelligence table ───────────────────────────────────────────────────
ensure_table "NexumAssetValuation" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumWorkIntegrity" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumResourcePlanning" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# ── Facility Memory, Operational DNA, Event Integrity tables ─────────────────
ensure_table "NexumDriftAnalysis" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumDriftReadings" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumEventIntegrity" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumIntegritySnapshots" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumFacilityMemory" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumOperationalDNA" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# ── System Violations & Resolution Intelligence table ─────────────────────────
ensure_table "NexumSystemViolations" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# ── Decision Continuity™ Vault table ─────────────────────────────────────────
ensure_table "NexumDCVault" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# ── Observation Journal tables ────────────────────────────────────────────────
ensure_table "ObservationJournal" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "ObservationEvents" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# Risk Engine tables
ensure_table "NexumRiskTolerance" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumRiskAcceptance" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "NexumSuggestions" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

# Vendor Pluck table (NexumVendorPlucks with GSI1 for vendor-side lookup)
ensure_table "ProjectControls" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "DecisionOutcomes" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

ensure_table "ContinuityScores" \
  "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
  "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S" \
  "PAY_PER_REQUEST"

if aws dynamodb describe-table --table-name "NexumVendorPlucks" --region $REGION > /dev/null 2>&1; then
  echo "  ✓ Table NexumVendorPlucks already exists"
else
  aws dynamodb create-table \
    --table-name "NexumVendorPlucks" \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --region $REGION > /dev/null
  echo "  ✓ Table NexumVendorPlucks created"
fi

echo ""
echo "1/4  IAM Roles"

for ROLE in fi-violations-role fi-work-orders-role fi-inventory-role fi-equipment-role fi-vvfi-role fi-messages-role fi-audit-reports-role fi-users-role fi-intake-role fi-onboarding-role fi-courses-role fi-manager-dashboard-role fi-issue-origin-role fi-bms-skids-role fi-risk-engine-role fi-vendor-pluck-role fi-observation-journal-role fi-cost-intelligence-role fi-work-integrity-role fi-resource-planning-role fi-facility-memory-role fi-operational-dna-role fi-event-integrity-role fi-drift-intelligence-role fi-system-violations-role nexum-fi-dc-vault-role nexum-fi-trial-manager-role fi-project-controls-role fi-dot-role fi-continuity-role; do
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

aws iam put-role-policy --role-name fi-messages-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumMessages\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumMessages/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-audit-reports-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/AuditReports\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/AuditReports/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-users-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"cognito-idp:ListUsers\",\"cognito-idp:AdminGetUser\",\"cognito-idp:AdminUpdateUserAttributes\"],\"Resource\":\"arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/us-east-2_mKMqaRq70\"},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumUsers\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumUsers/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-intake-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumLeads\"},{\"Effect\":\"Allow\",\"Action\":[\"ses:SendEmail\",\"ses:SendRawEmail\"],\"Resource\":\"*\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-onboarding-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:Scan\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumOnboardingRecords\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-courses-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Scan\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumCourses\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-bms-skids-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumBMSFeeds\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumSkids\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumBMSData\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-issue-origin-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/IssueOrigins\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/IssueReportAttempts\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/LinkedHistoricalRecords\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-manager-dashboard-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/FacilityLogs-v2\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ViolationEvents\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumUsers\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumUsers/index/*\"]},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:Query\",\"dynamodb:Scan\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EquipmentLibrary\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EquipmentLibrary/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-risk-engine-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumRiskTolerance\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumRiskAcceptance\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumSuggestions\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-vendor-pluck-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumVendorPlucks\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumVendorPlucks/index/*\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumVendors\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumVendors/index/*\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-observation-journal-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ObservationJournal\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ObservationEvents\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-cost-intelligence-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumAssetValuation\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/SpendingTransactions\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-work-integrity-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumWorkIntegrity\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ViolationEvents\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-resource-planning-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumResourcePlanning\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumInventory\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EquipmentLibrary\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-facility-memory-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumFacilityMemory\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ViolationEvents\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-operational-dna-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumOperationalDNA\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ViolationEvents\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-event-integrity-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumEventIntegrity\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumIntegritySnapshots\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ViolationEvents\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/FacilityLogs-v2\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-drift-intelligence-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumDriftAnalysis\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumDriftReadings\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/WorkOrders\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ViolationEvents\"]}]}" > /dev/null

aws iam put-role-policy --role-name fi-system-violations-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":[\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumSystemViolations\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ObservationJournal\",\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumDCVault\"]}]}" > /dev/null

aws iam put-role-policy --role-name nexum-fi-dc-vault-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumDCVault\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-project-controls-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ProjectControls\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-dot-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/DecisionOutcomes\"}]}" > /dev/null

aws iam put-role-policy --role-name fi-continuity-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ContinuityScores\"}]}" > /dev/null

aws iam put-role-policy --role-name nexum-fi-trial-manager-role --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"cognito-idp:ListUsers\",\"cognito-idp:AdminDeleteUser\"],\"Resource\":\"arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/us-east-2_mKMqaRq70\"},{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:DeleteItem\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumUsers\"},{\"Effect\":\"Allow\",\"Action\":[\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"],\"Resource\":\"*\"}]}" > /dev/null

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

echo "▶ Ensuring fi-quality-intelligence-role..."
QI_POLICY="{
  \"Version\":\"2012-10-17\",
  \"Statement\":[
    {\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/NexumQualityIntelligence\"},
    {\"Effect\":\"Allow\",\"Action\":[\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"],\"Resource\":\"*\"}
  ]
}"
if aws iam get-role --role-name "fi-quality-intelligence-role" > /dev/null 2>&1; then
  echo "  ✓ Role fi-quality-intelligence-role already exists"
else
  aws iam create-role --role-name "fi-quality-intelligence-role" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > /dev/null
  aws iam attach-role-policy --role-name "fi-quality-intelligence-role" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "  ✓ Role fi-quality-intelligence-role created"
fi
aws iam put-role-policy --role-name fi-quality-intelligence-role --policy-name policy \
  --policy-document "$QI_POLICY" > /dev/null

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
  "VVFI_TABLE=NexumFIASAssessments,ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"

deploy_lambda "nexum-fi-messages" "fi-messages.mjs" "fi-messages-role" \
  "MESSAGES_TABLE=NexumMessages"

deploy_lambda "nexum-fi-audit-reports" "fi-audit-reports.mjs" "fi-audit-reports-role" \
  "AUDIT_TABLE=AuditReports"

deploy_lambda "nexum-fi-users" "fi-users.mjs" "fi-users-role" \
  "USER_POOL_ID=us-east-2_mKMqaRq70,USERS_TABLE=NexumUsers"

deploy_lambda "nexum-fi-intake" "fi-intake.mjs" "fi-intake-role" \
  "LEADS_TABLE=NexumLeads,SES_FROM_EMAIL=info@nexumsuum-facilityintelligence.com,ADMIN_EMAIL=razzellv@nexumsuum.com"

deploy_lambda "nexum-fi-onboarding" "fi-onboarding.mjs" "fi-equipment-role" \
  "ONBOARDING_TABLE=NexumOnboardingRecords"

deploy_lambda "nexum-fi-courses" "fi-courses.mjs" "fi-courses-role" \
  "COURSES_TABLE=NexumCourses"

deploy_lambda "nexum-fi-bookings" "fi-bookings.mjs" "fi-bookings-role" \
  "ADMIN_EMAIL=razzellv@nexumsuum.com,FROM_EMAIL=no-reply@nexumsuum-facilityintelligence.com"

deploy_lambda "nexum-fi-sms" "fi-sms.mjs" "fi-sms-role" \
  "ADMIN_PHONE=+19734448260"

deploy_lambda "nexum-quality-intelligence" "quality-intelligence.mjs" "fi-quality-intelligence-role" \
  "QI_TABLE=NexumQualityIntelligence"

deploy_lambda "nexum-fi-manager-dashboard" "fi-manager-dashboard.mjs" "fi-manager-dashboard-role" \
  "REGION=us-east-2"

deploy_lambda "nexum-fi-issue-origin" "fi-issue-origin.mjs" "fi-issue-origin-role" \
  "REGION=us-east-2,ORIGINS_TABLE=IssueOrigins,ATTEMPTS_TABLE=IssueReportAttempts,LINKS_TABLE=LinkedHistoricalRecords"

deploy_lambda "nexum-fi-bms-skids" "fi-bms-skids.mjs" "fi-bms-skids-role" \
  "REGION=us-east-2,FEEDS_TABLE=NexumBMSFeeds,SKIDS_TABLE=NexumSkids,DATA_TABLE=NexumBMSData"

deploy_lambda "nexum-fi-risk-engine" "fi-risk-engine.mjs" "fi-risk-engine-role" \
  "REGION=us-east-2,TOLERANCE_TABLE=NexumRiskTolerance,ACCEPTANCE_TABLE=NexumRiskAcceptance,SUGGESTIONS_TABLE=NexumSuggestions,WO_TABLE=WorkOrders"

deploy_lambda "nexum-fi-vendor-pluck" "fi-vendor-pluck.mjs" "fi-vendor-pluck-role" \
  "REGION=us-east-2,PLUCKS_TABLE=NexumVendorPlucks,VENDORS_TABLE=NexumVendors"

# Observation Journal
deploy_lambda "nexum-fi-observation-journal" "fi-observation-journal.mjs" "fi-observation-journal-role" \
  "OBS_TABLE=ObservationJournal,EVENTS_TABLE=ObservationEvents,ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"

# Cost Intelligence
deploy_lambda "nexum-fi-cost-intelligence" "fi-cost-intelligence.mjs" "fi-cost-intelligence-role" \
  "VALUATION_TABLE=NexumAssetValuation,TRANSACTIONS_TABLE=SpendingTransactions"

deploy_lambda "nexum-fi-work-integrity" "fi-work-integrity.mjs" "fi-work-integrity-role" \
  "WI_TABLE=NexumWorkIntegrity,VIOLATIONS_TABLE=ViolationEvents,ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"

# Resource Planning
deploy_lambda "nexum-fi-resource-planning" "fi-resource-planning.mjs" "fi-resource-planning-role" \
  "RP_TABLE=NexumResourcePlanning,WO_TABLE=WorkOrders,INV_TABLE=NexumInventory,EQ_TABLE=EquipmentLibrary"

# Facility Memory Engine
deploy_lambda "nexum-fi-facility-memory" "fi-facility-memory.mjs" "fi-facility-memory-role" \
  "TABLE=NexumFacilityMemory,WO_TABLE=WorkOrders,VE_TABLE=ViolationEvents"

# Operational DNA Engine
deploy_lambda "nexum-fi-operational-dna" "fi-operational-dna.mjs" "fi-operational-dna-role" \
  "TABLE=NexumOperationalDNA,WO_TABLE=WorkOrders,VE_TABLE=ViolationEvents"

# Event-to-Record Integrity Engine
deploy_lambda "nexum-fi-event-integrity" "fi-event-integrity.mjs" "fi-event-integrity-role" \
  "TABLE=NexumEventIntegrity,SNAP_TABLE=NexumIntegritySnapshots,WO_TABLE=WorkOrders,VE_TABLE=ViolationEvents,LOG_TABLE=FacilityLogs-v2"

# Performance & Sequencing Drift Intelligence Engine
deploy_lambda "nexum-fi-drift-intelligence" "fi-drift-intelligence.mjs" "fi-drift-intelligence-role" \
  "TABLE=NexumDriftAnalysis,RDGS=NexumDriftReadings,WO_TABLE=WorkOrders,VE_TABLE=ViolationEvents"

# System Violations & Resolution Intelligence™
deploy_lambda "nexum-fi-system-violations" "fi-system-violations.mjs" "fi-system-violations-role" \
  "TABLE=NexumSystemViolations,OBS_TABLE=ObservationJournal,DC_TABLE=NexumDCVault"

# Decision Continuity™ Vault & Admissibility Engine™
deploy_lambda "nexum-fi-dc-vault" "fi-dc-vault.mjs" "nexum-fi-dc-vault-role" "TABLE=NexumDCVault"

# Project Controls — EVM (Earned Value Management)
deploy_lambda "nexum-fi-project-controls" "fi-project-controls.mjs" "fi-project-controls-role" "TABLE=ProjectControls"

# Decision Outcome Tracking™
deploy_lambda "nexum-fi-dot" "fi-dot.mjs" "fi-dot-role" "TABLE=DecisionOutcomes"

# Continuity Intelligence™
deploy_lambda "nexum-fi-continuity" "fi-continuity.mjs" "fi-continuity-role" "TABLE=ContinuityScores"

# Trial Manager — daily cleanup of expired trial accounts (no API route; CloudWatch schedule)
deploy_lambda "nexum-fi-trial-manager" "fi-trial-manager.mjs" "nexum-fi-trial-manager-role" \
  "COGNITO_USER_POOL=us-east-2_mKMqaRq70,USERS_TABLE=NexumUsers"

# ── CloudWatch Events rule: run trial manager daily at 06:00 UTC ──────────────
TRIAL_RULE_NAME="nexum-fi-trial-manager-daily"
TRIAL_LAMBDA_ARN=$(aws lambda get-function --function-name nexum-fi-trial-manager \
  --region "$REGION" --query 'Configuration.FunctionArn' --output text 2>/dev/null || true)

if [ -n "$TRIAL_LAMBDA_ARN" ] && [ "$TRIAL_LAMBDA_ARN" != "None" ]; then
  # Create or update the rule
  aws events put-rule \
    --name "$TRIAL_RULE_NAME" \
    --schedule-expression "cron(0 6 * * ? *)" \
    --state ENABLED \
    --region "$REGION" > /dev/null 2>&1 || true

  # Add Lambda as target (idempotent)
  aws events put-targets \
    --rule "$TRIAL_RULE_NAME" \
    --targets "Id=TrialManager,Arn=$TRIAL_LAMBDA_ARN" \
    --region "$REGION" > /dev/null 2>&1 || true

  # Grant Events permission to invoke Lambda (idempotent via SID)
  aws lambda add-permission \
    --function-name nexum-fi-trial-manager \
    --statement-id "AllowCloudWatchEvents" \
    --action "lambda:InvokeFunction" \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${REGION}:758027491272:rule/${TRIAL_RULE_NAME}" \
    --region "$REGION" > /dev/null 2>&1 || true

  echo "  ✓ CloudWatch schedule → nexum-fi-trial-manager (daily 06:00 UTC)"
fi

echo ""
echo "3/4  API Gateway Routes"
echo "     (existing routes updated in-place; new ones created)"

purge_unused_integrations

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
add_route "GET /onboarding"                         "nexum-fi-onboarding"  "jwt"
add_route "POST /onboarding"                         "nexum-fi-onboarding"  "jwt"
add_route "GET /onboarding/all"                     "nexum-fi-onboarding"  "jwt"
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

# Quality Intelligence — longitudinal snapshot storage
add_route "GET /quality-intelligence"  "nexum-quality-intelligence"  "jwt"
add_route "POST /quality-intelligence" "nexum-quality-intelligence"  "jwt"

# Manager / Supervisor / Executive Dashboards
add_route "GET /dashboard/manager"     "nexum-fi-manager-dashboard"  "jwt"
add_route "GET /dashboard/supervisor"  "nexum-fi-manager-dashboard"  "jwt"
add_route "GET /dashboard/executive"   "nexum-fi-manager-dashboard"  "jwt"
add_route "GET /dashboard/energy"      "nexum-fi-manager-dashboard"  "jwt"

# BMS Integration + Skids — 15 routes
add_route "POST /bms/feeds"              "nexum-fi-bms-skids"  "jwt"
add_route "GET /bms/feeds"              "nexum-fi-bms-skids"  "jwt"
add_route "GET /bms/feeds/{feedId}"     "nexum-fi-bms-skids"  "jwt"
add_route "PATCH /bms/feeds/{feedId}"     "nexum-fi-bms-skids"  "jwt"
add_route "DELETE /bms/feeds/{feedId}"     "nexum-fi-bms-skids"  "jwt"
add_route "GET /bms/data/{feedId}"      "nexum-fi-bms-skids"  "jwt"
add_route "GET /bms/metadata"           "nexum-fi-bms-skids"  "none"
add_route "POST /bms/ingest"             "nexum-fi-bms-skids"  "none"
add_route "POST /skids"                  "nexum-fi-bms-skids"  "jwt"
add_route "GET /skids"                  "nexum-fi-bms-skids"  "jwt"
add_route "GET /skids/{skidId}"         "nexum-fi-bms-skids"  "jwt"
add_route "PATCH /skids/{skidId}"         "nexum-fi-bms-skids"  "jwt"
add_route "DELETE /skids/{skidId}"         "nexum-fi-bms-skids"  "jwt"
add_route "GET /skids/{skidId}/data"    "nexum-fi-bms-skids"  "jwt"

# Issue Origin & Reporting Intelligence — 10 routes
add_route "POST /issues"                     "nexum-fi-issue-origin"  "jwt"
add_route "GET /issues"                      "nexum-fi-issue-origin"  "jwt"
add_route "GET /issues/{issueId}"            "nexum-fi-issue-origin"  "jwt"
add_route "PATCH /issues/{issueId}"          "nexum-fi-issue-origin"  "jwt"
add_route "POST /issues/{issueId}/report"    "nexum-fi-issue-origin"  "jwt"
add_route "GET /issues/{issueId}/reports"    "nexum-fi-issue-origin"  "jwt"
add_route "GET /issues/{issueId}/continuity" "nexum-fi-issue-origin"  "jwt"
add_route "POST /issues/{issueId}/link"      "nexum-fi-issue-origin"  "jwt"
add_route "GET /issues/{issueId}/links"      "nexum-fi-issue-origin"  "jwt"
add_route "GET /issues/{issueId}/summary"    "nexum-fi-issue-origin"  "jwt"

# Risk Engine — 8 routes
add_route "GET /risk/tolerance"                  "nexum-fi-risk-engine"  "jwt"
add_route "PATCH /risk/tolerance"                 "nexum-fi-risk-engine"  "jwt"
add_route "GET /risk/acceptance"                 "nexum-fi-risk-engine"  "jwt"
add_route "POST /risk/acceptance"                 "nexum-fi-risk-engine"  "jwt"
add_route "POST /risk/acceptance/{sk}/expire"     "nexum-fi-risk-engine"  "jwt"
add_route "GET /suggestions"                     "nexum-fi-risk-engine"  "jwt"
add_route "POST /suggestions/generate"            "nexum-fi-risk-engine"  "jwt"
add_route "POST /suggestions/{sk}/dismiss"        "nexum-fi-risk-engine"  "jwt"
add_route "POST /suggestions/{sk}/act"            "nexum-fi-risk-engine"  "jwt"

# Vendor Pluck — 9 routes
add_route "GET /vendors"                         "nexum-fi-vendor-pluck"  "jwt"
add_route "GET /vendors/{id}"                    "nexum-fi-vendor-pluck"  "jwt"
add_route "POST /vendors/{id}/pluck"              "nexum-fi-vendor-pluck"  "jwt"
add_route "GET /vendors/plucks"                  "nexum-fi-vendor-pluck"  "jwt"
add_route "GET /vendor/profile"                  "nexum-fi-vendor-pluck"  "jwt"
add_route "PATCH /vendor/profile"                 "nexum-fi-vendor-pluck"  "jwt"
add_route "GET /vendor/plucks"                   "nexum-fi-vendor-pluck"  "jwt"
add_route "POST /vendor/plucks/{sk}/respond"      "nexum-fi-vendor-pluck"  "jwt"

# Observation Journal — 13 routes
add_route "GET /observations"                          "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations"                         "nexum-fi-observation-journal"  "jwt"
add_route "GET /observations/{sk}"                     "nexum-fi-observation-journal"  "jwt"
add_route "GET /observations/{sk}/score"               "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/{sk}/validate"           "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/{sk}/escalate"           "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/{sk}/assign"             "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/{sk}/action"             "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/{sk}/verify"             "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/{sk}/close"              "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/{sk}/reopen"             "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/{sk}/amend"              "nexum-fi-observation-journal"  "jwt"
add_route "POST /observations/ai-summary"              "nexum-fi-observation-journal"  "jwt"

# Cost Intelligence — 7 routes
add_route "GET /costs/summary"       "nexum-fi-cost-intelligence"  "jwt"
add_route "GET /costs/transactions"  "nexum-fi-cost-intelligence"  "jwt"
add_route "POST /costs/transactions" "nexum-fi-cost-intelligence"  "jwt"
add_route "GET /costs/valuations"    "nexum-fi-cost-intelligence"  "jwt"
add_route "POST /costs/valuations"   "nexum-fi-cost-intelligence"  "jwt"
add_route "GET /costs/depreciation"  "nexum-fi-cost-intelligence"  "jwt"
add_route "GET /costs/breakdown"     "nexum-fi-cost-intelligence"  "jwt"

# Work Integrity Engine — 9 routes
add_route "GET /work-integrity/tasks"              "nexum-fi-work-integrity"  "jwt"
add_route "POST /work-integrity/tasks"             "nexum-fi-work-integrity"  "jwt"
add_route "PATCH /work-integrity/tasks/{sk}"       "nexum-fi-work-integrity"  "jwt"
add_route "POST /work-integrity/tasks/{sk}/review" "nexum-fi-work-integrity"  "jwt"
add_route "GET /work-integrity/deadlines"          "nexum-fi-work-integrity"  "jwt"
add_route "GET /work-integrity/critical-path"      "nexum-fi-work-integrity"  "jwt"
add_route "GET /work-integrity/competency-match"   "nexum-fi-work-integrity"  "jwt"
add_route "GET /work-integrity/performance"        "nexum-fi-work-integrity"  "jwt"
add_route "POST /work-integrity/ai-critique"       "nexum-fi-work-integrity"  "jwt"

add_route "GET /resources/summary"             "nexum-fi-resource-planning"  "jwt"
add_route "GET /resources/vendors"             "nexum-fi-resource-planning"  "jwt"
add_route "POST /resources/vendors"            "nexum-fi-resource-planning"  "jwt"
add_route "GET /resources/parts"               "nexum-fi-resource-planning"  "jwt"
add_route "POST /resources/parts"              "nexum-fi-resource-planning"  "jwt"
add_route "GET /resources/float-time"          "nexum-fi-resource-planning"  "jwt"
add_route "GET /resources/intervals"           "nexum-fi-resource-planning"  "jwt"

# Facility Memory Engine — 9 routes
add_route "GET /facility-memory"                      "nexum-fi-facility-memory"  "jwt"
add_route "POST /facility-memory"                     "nexum-fi-facility-memory"  "jwt"
add_route "GET /facility-memory/{sk}"                 "nexum-fi-facility-memory"  "jwt"
add_route "PATCH /facility-memory/{sk}"               "nexum-fi-facility-memory"  "jwt"
add_route "DELETE /facility-memory/{sk}"              "nexum-fi-facility-memory"  "jwt"
add_route "GET /facility-memory/scores"               "nexum-fi-facility-memory"  "jwt"
add_route "GET /facility-memory/patterns"             "nexum-fi-facility-memory"  "jwt"
add_route "POST /facility-memory/ingest"              "nexum-fi-facility-memory"  "jwt"
add_route "GET /facility-memory/search"               "nexum-fi-facility-memory"  "jwt"

# Operational DNA Engine — 5 routes
add_route "GET /operational-dna"                      "nexum-fi-operational-dna"  "jwt"
add_route "POST /operational-dna/analyze"             "nexum-fi-operational-dna"  "jwt"
add_route "GET /operational-dna/patterns"             "nexum-fi-operational-dna"  "jwt"
add_route "GET /operational-dna/predictions"          "nexum-fi-operational-dna"  "jwt"
add_route "GET /operational-dna/clusters"             "nexum-fi-operational-dna"  "jwt"

# Event-to-Record Integrity Engine — 6 routes
add_route "GET /event-integrity"                      "nexum-fi-event-integrity"  "jwt"
add_route "POST /event-integrity/audit"               "nexum-fi-event-integrity"  "jwt"
add_route "GET /event-integrity/records"              "nexum-fi-event-integrity"  "jwt"
add_route "GET /event-integrity/trends"               "nexum-fi-event-integrity"  "jwt"
add_route "GET /event-integrity/records/{type}"       "nexum-fi-event-integrity"  "jwt"

# Drift Intelligence Engine — 5 routes
add_route "GET /drift-intelligence"                   "nexum-fi-drift-intelligence"  "jwt"
add_route "POST /drift-intelligence/analyze"          "nexum-fi-drift-intelligence"  "jwt"
add_route "POST /drift-intelligence/readings"         "nexum-fi-drift-intelligence"  "jwt"
add_route "GET /drift-intelligence/readings"          "nexum-fi-drift-intelligence"  "jwt"
add_route "GET /drift-intelligence/trends"            "nexum-fi-drift-intelligence"  "jwt"

# System Violations & Resolution Intelligence™ — 5 routes
add_route "GET /system-violations"          "nexum-fi-system-violations"  "jwt"
add_route "POST /system-violations"         "nexum-fi-system-violations"  "jwt"
add_route "GET /system-violations/stats"    "nexum-fi-system-violations"  "jwt"
add_route "GET /system-violations/{id}"     "nexum-fi-system-violations"  "jwt"
add_route "PATCH /system-violations/{id}"   "nexum-fi-system-violations"  "jwt"

# Decision Continuity™ Vault & Admissibility Engine™ — 6 routes
add_route "GET /dc-vault"                              "nexum-fi-dc-vault"  "jwt"
add_route "POST /dc-vault"                             "nexum-fi-dc-vault"  "jwt"
add_route "GET /dc-vault/stats"                        "nexum-fi-dc-vault"  "jwt"
add_route "GET /dc-vault/{chainId}"                    "nexum-fi-dc-vault"  "jwt"
add_route "POST /dc-vault/{chainId}/signals"           "nexum-fi-dc-vault"  "jwt"
add_route "PATCH /dc-vault/{chainId}/signals/{sigId}"  "nexum-fi-dc-vault"  "jwt"

# Project Controls — EVM — 3 routes
add_route "GET /project-controls"               "nexum-fi-project-controls"  "jwt"
add_route "POST /project-controls"              "nexum-fi-project-controls"  "jwt"
add_route "DELETE /project-controls/{projectId}" "nexum-fi-project-controls" "jwt"

# Decision Outcome Tracking™ — 3 routes
add_route "GET /decision-outcomes"                    "nexum-fi-dot"  "jwt"
add_route "POST /decision-outcomes"                   "nexum-fi-dot"  "jwt"
add_route "DELETE /decision-outcomes/{decisionId}"    "nexum-fi-dot"  "jwt"

# Continuity Intelligence™ — 2 routes
add_route "GET /continuity"   "nexum-fi-continuity"  "jwt"
add_route "POST /continuity"  "nexum-fi-continuity"  "jwt"

echo ""
echo "4/4  Verify routes"
aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
  --query 'Items[?contains(RouteKey,`violations`) || contains(RouteKey,`work-orders`) || contains(RouteKey,`observations`) || contains(RouteKey,`costs`) || contains(RouteKey,`work-integrity`)].[RouteKey,AuthorizationType]' \
  --output table

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Nexum Suum FI Platform — All Active Endpoints"
echo "  (JWT protected unless noted)"
echo ""
echo "  CORE CRUD"
echo "  GET/POST/PATCH/DELETE  /violations  /work-orders  /inventory"
echo "  GET/POST/PATCH/DELETE  /equipment   /vvfi         /messages"
echo "  GET/POST/PATCH/DELETE  /audit-reports"
echo "  PATCH /users/{userId}"
echo "  POST  /work-orders/{id}/notes"
echo ""
echo "  FACILITY LOGS & METRICS"
echo "  GET  /facility-logs   /logs/latest   /logs/query   /metrics"
echo "  POST /logs   /facility-log-ingest"
echo ""
echo "  ONBOARDING & USERS"
echo "  GET/POST /onboarding   GET /onboarding/all   GET/PATCH /users"
echo "  POST /onboarding/{facilityId}/milestone"
echo "  POST /intake  (PUBLIC — no JWT)"
echo ""
echo "  DASHBOARD APIs"
echo "  GET /dashboard/manager   /dashboard/supervisor"
echo "  GET /dashboard/executive  /dashboard/energy"
echo ""
echo "  BMS INTEGRATION & SKIDS"
echo "  GET/POST /bms/feeds   GET/PATCH/DELETE /bms/feeds/{feedId}"
echo "  GET /bms/data/{feedId}   GET /bms/metadata"
echo "  POST /bms/ingest  (PUBLIC)"
echo "  GET/POST/PATCH/DELETE /skids   GET /skids/{skidId}/data"
echo ""
echo "  ISSUE ORIGIN & REPORTING INTELLIGENCE"
echo "  GET/POST /issues   GET/PATCH /issues/{issueId}"
echo "  POST /issues/{issueId}/report|link"
echo "  GET  /issues/{issueId}/reports|continuity|links|summary"
echo ""
echo "  RISK ENGINE & SUGGESTIONS"
echo "  GET/PATCH /risk/tolerance   GET/POST /risk/acceptance"
echo "  POST /risk/acceptance/{sk}/expire"
echo "  GET /suggestions   POST /suggestions/generate"
echo "  POST /suggestions/{sk}/dismiss|act"
echo ""
echo "  VENDOR PLUCK"
echo "  GET /vendors   GET /vendors/{id}   POST /vendors/{id}/pluck"
echo "  GET /vendors/plucks"
echo "  GET/PATCH /vendor/profile   GET /vendor/plucks"
echo "  POST /vendor/plucks/{sk}/respond"
echo ""
echo "  OBSERVATION JOURNAL"
echo "  GET/POST /observations   GET /observations/{sk}"
echo "  GET /observations/{sk}/score"
echo "  POST /observations/{sk}/validate|escalate|assign|action|verify|close|reopen|amend"
echo "  POST /observations/ai-summary"
echo ""
echo "  COST INTELLIGENCE"
echo "  GET /costs/summary   /costs/breakdown   /costs/depreciation"
echo "  GET/POST /costs/transactions   GET/POST /costs/valuations"
echo ""
echo "  WORK INTEGRITY ENGINE"
echo "  GET/POST /work-integrity/tasks"
echo "  PATCH /work-integrity/tasks/{sk}"
echo "  POST  /work-integrity/tasks/{sk}/review"
echo "  GET   /work-integrity/deadlines"
echo "  GET   /work-integrity/critical-path"
echo "  GET   /work-integrity/competency-match"
echo "  GET   /work-integrity/performance"
echo "  POST  /work-integrity/ai-critique"
echo ""
echo "  DRIFT INTELLIGENCE ENGINE"
echo "  GET /drift-intelligence   POST /drift-intelligence/analyze"
echo "  POST/GET /drift-intelligence/readings"
echo "  GET /drift-intelligence/trends"
echo ""
echo "  EVENT-TO-RECORD INTEGRITY ENGINE™"
echo "  GET /event-integrity   POST /event-integrity/audit"
echo "  GET /event-integrity/records   GET /event-integrity/records/{type}"
echo "  GET /event-integrity/trends"
echo ""
echo "  FACILITY MEMORY ENGINE"
echo "  GET/POST /facility-memory"
echo "  GET/PATCH/DELETE /facility-memory/{sk}"
echo "  GET /facility-memory/scores|patterns|search"
echo "  POST /facility-memory/ingest"
echo ""
echo "  OPERATIONAL DNA ENGINE"
echo "  GET /operational-dna   POST /operational-dna/analyze"
echo "  GET /operational-dna/patterns|predictions|clusters"
echo ""
echo "  SYSTEM VIOLATIONS & RESOLUTION INTELLIGENCE™"
echo "  GET/POST /system-violations"
echo "  GET /system-violations/stats"
echo "  GET/PATCH /system-violations/{id}"
echo ""
echo "  DECISION CONTINUITY™ VAULT & ADMISSIBILITY ENGINE™"
echo "  GET/POST /dc-vault"
echo "  GET /dc-vault/stats"
echo "  GET /dc-vault/{chainId}"
echo "  POST /dc-vault/{chainId}/signals"
echo "  PATCH /dc-vault/{chainId}/signals/{sigId}"
echo ""
echo "  OTHER"
echo "  GET /quality-intelligence   POST /quality-intelligence"
echo "  GET /fias   POST /fias   POST /admin/send-email   POST /admin/send-sms"
echo "  GET/POST /bookings   GET/POST /courses"
echo "═══════════════════════════════════════════════════"
