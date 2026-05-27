#!/bin/bash
# Checks and corrects the API Gateway JWT authorizer for the FI Platform.
# The JWT authorizer must have Issuer = Cognito user pool URL and
# Audience = Cognito app client ID.  A misconfigured or missing authorizer
# causes every JWT-protected route to return 401.
#
# Run from the lambda/ folder:
#   bash fix-authorizer.sh
#
# After this completes, redeploy routes with:
#   bash deploy-fi-backend.sh

set -e

API_ID="vflco2pvo3"
REGION="us-east-2"
USER_POOL_ID="us-east-2_mKMqaRq70"
CLIENT_ID="7vvu6kruod12nu1nkfonbfekre"
ISSUER="https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  API Gateway JWT Authorizer Fix"
echo "  API: $API_ID   Region: $REGION"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Expected config:"
echo "    Issuer  : $ISSUER"
echo "    Audience: $CLIENT_ID"
echo ""

# ── Check current authorizer ───────────────────────────────────────────────
echo "▶ Current authorizer(s):"
aws apigatewayv2 get-authorizers \
  --api-id "$API_ID" --region "$REGION" \
  --output json | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('Items', [])
if not items:
    print('  (none found)')
for a in items:
    print(f\"  ID     : {a.get('AuthorizerId')}\")
    print(f\"  Name   : {a.get('Name')}\")
    jwt = a.get('JwtConfiguration', {})
    print(f\"  Issuer : {jwt.get('Issuer', '(missing)')}\")
    print(f\"  Audience: {jwt.get('Audience', '(missing)')}\")
    print()
"

AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers \
  --api-id "$API_ID" --region "$REGION" \
  --query 'Items[0].AuthorizerId' --output text 2>/dev/null || true)

JWT_CFG="{\"Audience\":[\"${CLIENT_ID}\"],\"Issuer\":\"${ISSUER}\"}"

if [ -z "$AUTHORIZER_ID" ] || [ "$AUTHORIZER_ID" = "None" ]; then
  # ── Create authorizer ──────────────────────────────────────────────────
  echo "▶ No authorizer found — creating..."
  AUTHORIZER_ID=$(aws apigatewayv2 create-authorizer \
    --api-id "$API_ID" \
    --name "CognitoJWT" \
    --authorizer-type JWT \
    --identity-source '$request.header.Authorization' \
    --jwt-configuration "$JWT_CFG" \
    --region "$REGION" \
    --query 'AuthorizerId' --output text)
  echo "  ✓ Created authorizer: $AUTHORIZER_ID"
else
  # ── Update existing authorizer ─────────────────────────────────────────
  echo "▶ Updating authorizer $AUTHORIZER_ID to correct config..."
  aws apigatewayv2 update-authorizer \
    --api-id "$API_ID" \
    --authorizer-id "$AUTHORIZER_ID" \
    --jwt-configuration "$JWT_CFG" \
    --region "$REGION" > /dev/null
  echo "  ✓ Updated authorizer: $AUTHORIZER_ID"
fi

# ── Verify ─────────────────────────────────────────────────────────────────
echo ""
echo "▶ Verified config:"
aws apigatewayv2 get-authorizer \
  --api-id "$API_ID" \
  --authorizer-id "$AUTHORIZER_ID" \
  --region "$REGION" \
  --output json | python3 -c "
import json, sys
a = json.load(sys.stdin)
jwt = a.get('JwtConfiguration', {})
print(f\"  AuthorizerId: {a.get('AuthorizerId')}\")
print(f\"  Issuer  : {jwt.get('Issuer')}\")
print(f\"  Audience: {jwt.get('Audience')}\")
"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Done. JWT authorizer is correctly configured."
echo ""
echo "  IMPORTANT: Re-run deploy to reattach all routes:"
echo "    bash deploy-fi-backend.sh"
echo "═══════════════════════════════════════════════════"
echo ""
