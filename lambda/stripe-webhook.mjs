// ============================================================
// Lambda: stripe-webhook
// Route: POST /stripe-webhook (public, no Cognito auth)
//
// Handles Stripe checkout.session.completed events.
// When a prospect buys from nexumsuum-connections.netlify.app:
//   1. Verifies Stripe signature
//   2. Extracts buyer details from session metadata + customer
//   3. Calls prospect-buyers Lambda internally to write DynamoDB + Sheet + send email
//
// Required env vars:
//   STRIPE_SECRET_KEY         — sk_live_xxx
//   STRIPE_WEBHOOK_SECRET     — whsec_xxx (from Stripe Dashboard → Webhooks)
//   PROSPECTS_LAMBDA_NAME     — arn or name of prospect-buyers Lambda
//   ADMIN_EMAIL               — razzellv@nexumsuum.com
//   SES_FROM_EMAIL            — info@nexumsuum-facilityintelligence.com
//   FRONTEND_URL              — https://portal.nexumsuum-facilityintelligence.com
// ============================================================

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { randomUUID }                  from "crypto";
import Stripe                          from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const ses    = new SESClient({ region: "us-east-1" });
const lambda = new LambdaClient({ region: "us-east-2" });

const WEBHOOK_SECRET      = process.env.STRIPE_WEBHOOK_SECRET    || "";
const PROSPECTS_LAMBDA    = process.env.PROSPECTS_LAMBDA_NAME    || "nexum-prospect-buyers";
const FROM_EMAIL          = process.env.SES_FROM_EMAIL           || "info@nexumsuum-facilityintelligence.com";
const ADMIN_EMAIL         = process.env.ADMIN_EMAIL              || "razzellv@nexumsuum.com";
const PORTAL_URL          = process.env.PORTAL_URL               || "https://nexumsuum-connections.netlify.app";

// ── Product name map (Stripe price ID → readable name) ────────────────────────
const PRODUCT_NAMES = {
  // Boiler
  "price_1SzoOpDfw4bOR2df35qzBQ9r": "Boiler Intelligence Package",
  "price_1SzoS9Dfw4bOR2dfaWJ6UqkB": "Boiler Intelligence + Looker Studio",
  // Chiller
  "price_1SzoQ9Dfw4bOR2dfNsRjWHec": "Chiller Intelligence Package",
  "price_1SzoSoDfw4bOR2dfTqTf3dJN": "Chiller Intelligence + Looker Studio",
  // Facility
  "price_1SzoRADfw4bOR2dfumakmsa5": "Facility Intelligence Package",
  "price_1SzoTkDfw4bOR2dfFzvTjft8": "Facility Intelligence + Virtuous & Advanced Dashboards",
  // Documents
  "price_1SXBFODfw4bOR2dfmyLF5z3G": "Facility Compliance Guide",
  "price_1SV2cQDfw4bOR2dfX1sXT8nT": "Thermodynamics and Facility Maintenance",
  "price_1TDr7PDfw4bOR2df1ogrNozX": "Document Package — Checklist Only",
  "price_1TDr4nDfw4bOR2dfUcktuaXC": "Document Package — SOPs Only",
};

function getProductName(session) {
  // Try metadata first (set at checkout creation)
  if (session.metadata?.productName) return session.metadata.productName;
  // Fall back to price ID lookup via line items (requires expand: ["line_items"])
  const priceId = session.metadata?.priceId || "";
  return PRODUCT_NAMES[priceId] || session.metadata?.product || "Nexum Suum Package";
}

// ── Invoke prospect-buyers Lambda internally ───────────────────────────────────
async function createProspectBuyer(payload) {
  try {
    await lambda.send(new InvokeCommand({
      FunctionName:   PROSPECTS_LAMBDA,
      InvocationType: "Event", // async — fire and forget
      Payload:        Buffer.from(JSON.stringify({
        httpMethod: "POST",
        path:       "/prospect-buyers",
        body:       JSON.stringify({ ...payload, _internal: true }),
      })),
    }));
  } catch (err) {
    // Non-fatal — log and continue
    console.error("Failed to invoke prospect-buyers Lambda:", err.message);
  }
}

// ── Confirmation email to buyer ────────────────────────────────────────────────
async function sendBuyerConfirmation({ name, email, product, amount }) {
  if (!email) return;
  try {
    await ses.send(new SendEmailCommand({
      Source:      FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `Your Nexum Suum purchase — ${product}` },
        Body: {
          Text: {
            Data: `Hi ${name || "there"},\n\nThank you for your purchase!\n\nProduct: ${product}\nAmount: $${(amount / 100).toFixed(2)}\n\nYour files are available immediately in your portal:\n${PORTAL_URL}\n\nWe'll follow up shortly to schedule your onboarding call and help you get the most from your package.\n\nIf you have any questions, reply to this email.\n\n— Nexum Suum Team`,
          },
        },
      },
    }));
  } catch (err) {
    console.error("Buyer confirmation email failed:", err.message);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const sig  = event.headers?.["stripe-signature"] || event.headers?.["Stripe-Signature"] || "";
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body || "";

  // ── Verify Stripe signature ──────────────────────────────────────────────────
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // ── Only handle checkout.session.completed ───────────────────────────────────
  if (stripeEvent.type !== "checkout.session.completed") {
    return { statusCode: 200, body: JSON.stringify({ received: true, skipped: stripeEvent.type }) };
  }

  const session = stripeEvent.data.object;

  try {
    // Expand session to get customer + line items if needed
    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["customer", "line_items.data.price"],
    });

    const customer = expanded.customer;
    const name     = expanded.customer_details?.name  || customer?.name  || session.metadata?.name    || "";
    const email    = expanded.customer_details?.email || customer?.email || session.metadata?.email   || "";
    const phone    = expanded.customer_details?.phone || customer?.phone || "";
    const company  = session.metadata?.company        || session.metadata?.companyName || "";
    const product  = getProductName(session);
    const amount   = session.amount_total || 0; // cents
    const buyerId  = randomUUID();

    const buyerPayload = {
      buyerId,
      name,
      company,
      email,
      phone,
      product,
      sessionId:   session.id,
      amount:      (amount / 100).toFixed(2),
      purchasedAt: new Date().toISOString(),
    };

    // Write to DynamoDB + Sheet + notify admin (via prospect-buyers Lambda)
    await createProspectBuyer(buyerPayload);

    // Confirmation email to buyer (done here so it's immediate, not async)
    await sendBuyerConfirmation({ name, email, product, amount });

    console.log(`Processed portal purchase: ${email} — ${product} ($${(amount / 100).toFixed(2)})`);
    return { statusCode: 200, body: JSON.stringify({ received: true, buyerId }) };

  } catch (err) {
    console.error("checkout.session.completed handling error:", err);
    // Return 200 so Stripe doesn't retry — log for manual review
    return { statusCode: 200, body: JSON.stringify({ received: true, error: err.message }) };
  }
};
