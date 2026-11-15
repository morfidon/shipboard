import "server-only";
import Stripe from "stripe";
import { PORTAL_CONFIGURATION_TAG, PRO_PRICE_LOOKUP_KEY } from "@/lib/plans";

let client: Stripe | undefined;

// The Stripe client, made on first use. Without a key, only the payment
// buttons fail; the rest of the app keeps working.
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is missing. Put your sandbox's secret key in .env.local.",
    );
  }
  // A slow Stripe must not hold our locks for long: each request gets 5
  // seconds at most, and one more try.
  client ??= new Stripe(key, { timeout: 5_000, maxNetworkRetries: 1 });
  return client;
}

// The Pro price, found by its lookup key, so no price id lives in our code.
export async function proPriceId() {
  const prices = await stripe().prices.list({
    lookup_keys: [PRO_PRICE_LOOKUP_KEY],
    active: true,
  });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      "No Pro price in this Stripe account. Run pnpm stripe:setup.",
    );
  }
  return price.id;
}

// Our Customer Portal settings, found by the tag in their metadata.
export async function portalConfigurationId() {
  const configurations = await stripe().billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const ours = configurations.data.find(
    (configuration) => configuration.metadata?.app === PORTAL_CONFIGURATION_TAG,
  );
  if (!ours) {
    throw new Error(
      "No Customer Portal settings in this Stripe account. Run pnpm stripe:setup.",
    );
  }
  return ours.id;
}
