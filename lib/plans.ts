// The names our Stripe setup uses. pnpm stripe:setup creates them in a
// sandbox, and the app finds them again by these names.
export const PRO_PRODUCT_ID = "shipboard_pro";
export const PRO_PRICE_LOOKUP_KEY = "shipboard_pro_monthly";
export const PORTAL_CONFIGURATION_TAG = "shipboard";

export type Plan = "free" | "pro";
