// Stripe Checkout Lambda — no Stripe SDK needed, calls Stripe REST API directly
// Handles both subscription (price ID) and payment (price_data for enterprise)

const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY || "";
const FRONTEND_URL = process.env.FRONTEND_URL       || "https://nexumsuum.com";
const STRIPE_API   = "https://api.stripe.com/v1";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
    body: JSON.stringify(body),
  };
}

function getMethod(e) {
  return e?.requestContext?.http?.method || e?.httpMethod || "";
}

// Flatten nested object to Stripe's URL-encoded format
// e.g. { line_items: [{price:'px',quantity:1}] }
// → "line_items[0][price]=px&line_items[0][quantity]=1"
function flattenToStripe(obj, prefix = "") {
  const parts = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (val === null || val === undefined) continue;
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          parts.push(...flattenToStripe(item, `${fullKey}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(item)}`);
        }
      });
    } else if (typeof val === "object") {
      parts.push(...flattenToStripe(val, fullKey));
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(val)}`);
    }
  }
  return parts;
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  if (!STRIPE_KEY) return json(500, { message: "Stripe secret key not configured." });

  try {
    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    const { lineItems, tier, successUrl, cancelUrl, allowPromotionCodes } = JSON.parse(raw);

    if (!lineItems || !lineItems.length) {
      return json(400, { message: "lineItems are required" });
    }

    // Determine mode: payment if any item uses price_data, otherwise subscription
    const hasCustomPriceData = lineItems.some(item => item.price_data);
    const mode = hasCustomPriceData ? "payment" : "subscription";

    const sessionParams = {
      mode,
      line_items: lineItems,
      success_url: successUrl || `${FRONTEND_URL}/welcome?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancelUrl  || `${FRONTEND_URL}/pricing`,
      ...(allowPromotionCodes && mode === "subscription" ? { allow_promotion_codes: "true" } : {}),
    };

    const body = flattenToStripe(sessionParams).join("&");

    const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method:  "POST",
      headers: {
        "Authorization":  `Basic ${Buffer.from(STRIPE_KEY + ":").toString("base64")}`,
        "Content-Type":   "application/x-www-form-urlencoded",
        "Stripe-Version": "2024-06-20",
      },
      body,
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe error:", session);
      return json(stripeRes.status, { error: session.error?.message || "Stripe error" });
    }

    return json(200, { url: session.url, sessionId: session.id });

  } catch (err) {
    console.error("stripe-checkout error:", err);
    return json(500, { message: "Checkout failed.", detail: err.message });
  }
};
