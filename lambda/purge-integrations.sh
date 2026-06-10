#!/bin/bash
# ── Nexum Suum — Purge Orphaned API Gateway Integrations ─────────────────────
# Run this when deploy fails with:
#   "Maximum number of Integrations for this API has been reached"
#
# Safe to run at any time — only deletes integrations NOT referenced by a route.
#
# Usage (from lambda/ folder):
#   bash ./purge-integrations.sh

API_ID="vflco2pvo3"
REGION="us-east-2"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Nexum Suum — Purge Orphaned API Gateway Integrations"
echo "  API: $API_ID  Region: $REGION"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 1: collect integration IDs currently wired to a route
echo "▶ Collecting integration IDs referenced by routes..."
USED_IDS=$(aws apigatewayv2 get-routes \
  --api-id "$API_ID" --region "$REGION" \
  --query 'Items[].Target' --output text 2>/dev/null \
  | tr '\t' '\n' \
  | sed 's|integrations/||g' \
  | grep -v '^$' \
  | sort -u)

USED_COUNT=$(echo "$USED_IDS" | grep -c . 2>/dev/null || echo 0)
echo "  ${USED_COUNT} integrations are referenced by routes"

# Step 2: collect all integration IDs
echo "▶ Fetching all integrations..."
ALL_IDS=$(aws apigatewayv2 get-integrations \
  --api-id "$API_ID" --region "$REGION" \
  --query 'Items[].IntegrationId' --output text 2>/dev/null \
  | tr '\t' '\n' \
  | grep -v '^$')

TOTAL=$(echo "$ALL_IDS" | grep -c . 2>/dev/null || echo 0)
echo "  ${TOTAL} total integrations found"

# Step 3: delete orphans
echo "▶ Deleting orphaned integrations..."
DELETED=0
SKIPPED=0
for INT_ID in $ALL_IDS; do
  if ! echo "$USED_IDS" | grep -qx "$INT_ID"; then
    if aws apigatewayv2 delete-integration \
        --api-id "$API_ID" \
        --integration-id "$INT_ID" \
        --region "$REGION" > /dev/null 2>&1; then
      echo "  ✓ Deleted $INT_ID"
      DELETED=$((DELETED + 1))
    else
      echo "  ✗ Could not delete $INT_ID (skipping)"
      SKIPPED=$((SKIPPED + 1))
    fi
  else
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Done — removed $DELETED orphaned integrations"
echo "  Kept $SKIPPED (in use by routes)"
echo ""
echo "  Remaining integrations:"
REMAINING=$(aws apigatewayv2 get-integrations \
  --api-id "$API_ID" --region "$REGION" \
  --query 'length(Items)' --output text 2>/dev/null)
echo "  $REMAINING of 300 slots used"
echo ""
echo "  You can now re-run: bash ./deploy-fi-backend.sh"
echo "═══════════════════════════════════════════════════"
