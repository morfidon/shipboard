// Creates what Shipboard needs in a Stripe sandbox: the Pro product, its
// monthly price and the Customer Portal settings. Safe to run twice: it
// looks for each one first and creates only what's missing.
//
//   pnpm stripe:setup   (reads STRIPE_SECRET_KEY from .env.local)
import Stripe from "stripe";
import {
  PORTAL_CONFIGURATION_TAG,
  PRO_PRICE_LOOKUP_KEY,
  PRO_PRODUCT_ID,
} from "../lib/plans.ts";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(
    "Put your sandbox's secret key in .env.local: STRIPE_SECRET_KEY=sk_test_...",
  );
  process.exit(1);
}
// Sandbox keys have _test_ in them: sk_test_…, or rkcs_test_… for an
// anonymous sandbox. A live key never does.
if (!/^[a-z]+_test_/.test(key)) {
  console.error("This script only runs in a sandbox: use a test key.");
  process.exit(1);
}
const stripe = new Stripe(key);

// The product has our own id, so we can ask for it by name.
async function product() {
  try {
    await stripe.products.retrieve(PRO_PRODUCT_ID);
    return "already there";
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) {
      throw error;
    }
  }
  await stripe.products.create({
    id: PRO_PRODUCT_ID,
    name: "Shipboard Pro",
    description: "File attachments on every issue.",
  });
  return "created";
}

// Prices can't have our own id, but they can have a lookup key.
async function price() {
  const found = await stripe.prices.list({
    lookup_keys: [PRO_PRICE_LOOKUP_KEY],
  });
  if (found.data.length > 0) {
    return "already there";
  }
  await stripe.prices.create({
    product: PRO_PRODUCT_ID,
    lookup_key: PRO_PRICE_LOOKUP_KEY,
    currency: "usd",
    unit_amount: 900,
    recurring: { interval: "month" },
  });
  return "created";
}

// The portal settings: what a customer may do there. Our tag in the
// metadata is how the app finds them again.
async function portal() {
  const found = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  if (found.data.some((c) => c.metadata?.app === PORTAL_CONFIGURATION_TAG)) {
    return "already there";
  }
  await stripe.billingPortal.configurations.create({
    name: "Shipboard",
    metadata: { app: PORTAL_CONFIGURATION_TAG },
    business_profile: { headline: "Shipboard: your Pro plan" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  return "created";
}

console.log(`Product ${PRO_PRODUCT_ID}: ${await product()}`);
console.log(`Price ${PRO_PRICE_LOOKUP_KEY}: ${await price()}`);
console.log(`Customer Portal settings: ${await portal()}`);
