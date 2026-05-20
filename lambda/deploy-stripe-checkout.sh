#!/bin/bash
# Redeploy stripe-checkout Lambda (mode fix — one-time vs subscription)
# Run from lambda/ folder:  bash deploy-stripe-checkout.sh
#
# ⚠️  Update FUNCTION_NAME below if your Lambda has a different name.
#     Common names: nexum-stripe-checkout  /  stripe-checkout  /  nexum-fi-stripe-checkout
#     Find it: aws lambda list-functions --region us-east-2 --query 'Functions[*].FunctionName'

set -e

FUNCTION_NAME="nexum-stripe-checkout"    # ← update if needed
REGION="us-east-2"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Redeploying $FUNCTION_NAME..."

TMPDIR=$(mktemp -d)
cp "$SCRIPT_DIR/stripe-checkout.mjs" "$TMPDIR/"
(cd "$TMPDIR" && zip stripe-checkout.zip stripe-checkout.mjs > /dev/null)

aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://$TMPDIR/stripe-checkout.zip" \
  --region "$REGION"

rm -rf "$TMPDIR"
echo "✓ $FUNCTION_NAME updated — Book & Pay one-time payments now work"
