#!/bin/bash
# One-time cleanup of orphaned API Gateway integrations.
# Keeps only integrations that are actively referenced by a route.
# Run from lambda/ folder:  bash cleanup-integrations.sh
#
# After this completes, run deploy-fi-backend.sh normally.

set -e

API_ID="vflco2pvo3"
REGION="us-east-2"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  API Gateway Integration Cleanup"
echo "  API: $API_ID   Region: $REGION"
echo "═══════════════════════════════════════════════════"
echo ""

# Collect integration IDs currently wired to a route
echo "▶ Collecting integrations in use by routes..."
USED_IDS=$(aws apigatewayv2 get-routes \
  --api-id "$API_ID" --region "$REGION" \
  --query 'Items[].Target' --output text \
  | tr '\t' '\n' \
  | grep -o 'integrations/[^ ]*' \
  | sed 's|integrations/||' \
  | sort -u)

USED_COUNT=$(echo "$USED_IDS" | grep -c . || echo 0)
echo "  Active integrations (referenced by routes): $USED_COUNT"

# Collect every integration ID on this API
echo "▶ Listing all integrations..."
ALL_IDS=$(aws apigatewayv2 get-integrations \
  --api-id "$API_ID" --region "$REGION" \
  --query 'Items[].IntegrationId' --output text \
  | tr '\t' '\n' \
  | grep -v '^$')

TOTAL=$(echo "$ALL_IDS" | grep -c . || echo 0)
echo "  Total integrations: $TOTAL"

if [ "$TOTAL" -le "$USED_COUNT" ]; then
  echo ""
  echo "  Nothing to clean up — all integrations are in use."
  exit 0
fi

echo ""
echo "▶ Deleting unused integrations..."
DELETED=0
for INT_ID in $ALL_IDS; do
  [ -z "$INT_ID" ] && continue
  if echo "$USED_IDS" | grep -qx "$INT_ID"; then
    : # in use — skip
  else
    aws apigatewayv2 delete-integration \
      --api-id "$API_ID" \
      --integration-id "$INT_ID" \
      --region "$REGION" > /dev/null 2>&1 \
      && echo "  ✗ Deleted $INT_ID" \
      || echo "  ! Could not delete $INT_ID (may already be gone)"
    DELETED=$((DELETED + 1))
  fi
done

echo ""
# Count remaining (sum across pages — 'length(Items)' prints one count per page)
REMAINING=$(aws apigatewayv2 get-integrations \
  --api-id "$API_ID" --region "$REGION" \
  --query 'Items[].IntegrationId' --output text \
  | tr '\t' '\n' | grep -c . || echo 0)

echo "═══════════════════════════════════════════════════"
echo "  Done. Removed $DELETED unused integration(s)."
echo "  Integrations remaining: $REMAINING / 300 (AWS limit)"
echo ""
echo "  You can now run:  bash deploy-fi-backend.sh"
echo "═══════════════════════════════════════════════════"
echo ""
