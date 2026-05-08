#!/bin/bash
# Deploy nexum-fias-clients Lambda + ensure DynamoDB table exists
set -e

ACCOUNT_ID="758027491272"
REGION="us-east-2"
API_ID="vflco2pvo3"
FUNC="nexum-fias-clients"
FILE="fi-fias-clients.mjs"
ROLE="fi-fias-clients-role"
TABLE="FIASClients"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════════════"
echo "  FIAS Clients — Lambda + DynamoDB Deploy"
echo "═══════════════════════════════════════════════"

# ── 1. DynamoDB table ──────────────────────────────
echo ""
echo "1/4  DynamoDB Table"
if aws dynamodb describe-table --table-name "$TABLE" --region $REGION > /dev/null 2>&1; then
  echo "  ✓ $TABLE already exists"
else
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions \
      AttributeName=advisorId,AttributeType=S \
      AttributeName=clientId,AttributeType=S \
    --key-schema \
      AttributeName=advisorId,KeyType=HASH \
      AttributeName=clientId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION > /dev/null
  echo "  ✓ $TABLE created (PAY_PER_REQUEST)"
  echo "  Waiting 10s for table to activate..."
  sleep 10
fi

# ── 2. IAM role ────────────────────────────────────
echo ""
echo "2/4  IAM Role"
if aws iam get-role --role-name "$ROLE" > /dev/null 2>&1; then
  echo "  ✓ Role already exists"
else
  aws iam create-role --role-name "$ROLE" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > /dev/null
  aws iam attach-role-policy --role-name "$ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "  ✓ Role created"
fi

aws iam put-role-policy --role-name "$ROLE" --policy-name policy \
  --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:GetItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\"],\"Resource\":\"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${TABLE}\"}]}" > /dev/null
echo "  ✓ DynamoDB policy attached"
echo "  Waiting 8s for IAM propagation..."
sleep 8

# ── 3. Lambda ──────────────────────────────────────
echo ""
echo "3/4  Lambda Function"
TMPDIR=$(mktemp -d)
cp "$SCRIPT_DIR/$FILE" "$TMPDIR/$FILE"
(cd "$TMPDIR" && zip "$FUNC.zip" "$FILE" > /dev/null)

if aws lambda get-function --function-name "$FUNC" --region $REGION > /dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FUNC" \
    --zip-file "fileb://$TMPDIR/$FUNC.zip" \
    --region $REGION > /dev/null
  aws lambda update-function-configuration \
    --function-name "$FUNC" \
    --environment "Variables={FIAS_TABLE=${TABLE}}" \
    --region $REGION > /dev/null 2>&1 || true
  echo "  ✓ $FUNC updated"
else
  aws lambda create-function \
    --function-name "$FUNC" \
    --runtime nodejs22.x \
    --architectures arm64 \
    --handler "fi-fias-clients.handler" \
    --role "arn:aws:iam::${ACCOUNT_ID}:role/${ROLE}" \
    --zip-file "fileb://$TMPDIR/$FUNC.zip" \
    --environment "Variables={FIAS_TABLE=${TABLE}}" \
    --timeout 15 \
    --region $REGION > /dev/null
  echo "  ✓ $FUNC created"
fi
rm -rf "$TMPDIR"

# ── 4. API Gateway — update existing /fias/clients routes ─────────────────────
echo ""
echo "4/4  API Gateway Routes"

LAMBDA_ARN=$(aws lambda get-function --function-name "$FUNC" --region $REGION \
  --query 'Configuration.FunctionArn' --output text)

aws lambda add-permission \
  --function-name "$FUNC" \
  --statement-id "apigw-fias-clients" \
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

AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers --api-id $API_ID --region $REGION \
  --query 'Items[0].AuthorizerId' --output text)

for ROUTE_KEY in "GET /fias/clients" "POST /fias/clients" "PATCH /fias/clients/{id}" "DELETE /fias/clients/{id}"; do
  EXISTING=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
    --query "Items[?RouteKey=='${ROUTE_KEY}'].RouteId" --output text 2>/dev/null)
  if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ]; then
    aws apigatewayv2 update-route --api-id $API_ID \
      --route-id "$EXISTING" \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type JWT \
      --authorizer-id "$AUTHORIZER_ID" \
      --region $REGION > /dev/null
    echo "  ✓ $ROUTE_KEY updated"
  else
    aws apigatewayv2 create-route --api-id $API_ID \
      --route-key "$ROUTE_KEY" \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type JWT \
      --authorizer-id "$AUTHORIZER_ID" \
      --region $REGION > /dev/null
    echo "  ✓ $ROUTE_KEY created"
  fi
done

echo ""
echo "═══════════════════════════════════════════════"
echo "  Done. Test with:"
echo "  GET  ${API_ID}.execute-api.${REGION}.amazonaws.com/prod/fias/clients"
echo "═══════════════════════════════════════════════"
