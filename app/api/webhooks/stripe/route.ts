// Stripe's doorbell: Stripe sends a POST here when something happens in our
// account, like a new subscription. For now, the route only says who rang.
// It doesn't check who sent the request yet, so it changes nothing.
export async function POST(request: Request) {
  const event = await request.json();
  console.log(`Stripe rang: ${event.type} (${event.id})`);

  // Any 2xx answer tells Stripe the event arrived. Anything else, and
  // Stripe tries again later.
  return Response.json({ received: true });
}
