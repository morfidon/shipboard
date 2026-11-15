import { applyStripeEvent } from "@/lib/billing";
import { stripe, webhookSecret } from "@/lib/stripe";

// Stripe's doorbell. Stripe signs every event with our endpoint's secret,
// so we can check that Stripe sent it, and that nobody changed it.
export async function POST(request: Request) {
  // The raw body, exactly as it arrived: the signature covers every byte.
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Rejected a webhook: ${message}`);
    return new Response("Invalid signature", { status: 400 });
  }

  await applyStripeEvent(event);
  return Response.json({ received: true });
}
