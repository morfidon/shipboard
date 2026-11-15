// A fake Stripe for the test servers. Playwright starts each server with
// NODE_OPTIONS="--import ./e2e/fake-stripe.ts", so Node loads this file before
// Next.js, and every request the server sends to api.stripe.com is answered
// here. The app itself has no switch for it, and the build doesn't include it.
import { http, HttpResponse, passthrough } from "msw";
import { PRO_PRICE_LOOKUP_KEY } from "../lib/plans.ts";
import { api, fakeStripe, stripeServer } from "../tests/stripe-mock.ts";

// Only next to the made-up key from .env.test. With any other key the server
// stops right here, so the fake can never stand in for real payments.
if (process.env.STRIPE_SECRET_KEY !== "sk_test_fake_key_for_tests") {
  throw new Error(
    "The fake Stripe only runs with the made-up key from .env.test.",
  );
}

// Our Pro price, the one price this fake Stripe has.
const proPrice = {
  id: "price_test_pro",
  object: "price",
  active: true,
  lookup_key: PRO_PRICE_LOOKUP_KEY,
};

// What our upgrade must ask Stripe for: a subscription, for a customer the
// fake made, on the Pro price, one of it, coming back to this server.
// Returns the first thing that's wrong, or nothing.
function wrongCheckout(form: URLSearchParams) {
  const site = process.env.BETTER_AUTH_URL;
  const expected = {
    mode: "subscription",
    "line_items[0][price]": proPrice.id,
    "line_items[0][quantity]": "1",
    success_url: `${site}/billing/success`,
    cancel_url: `${site}/team`,
  };
  for (const [param, value] of Object.entries(expected)) {
    if (form.get(param) !== value) {
      return { param, message: `Expected ${value}, got ${form.get(param)}.` };
    }
  }
  // One line item, and nothing else: no second item, no inline price.
  const items = [...form.keys()].filter((key) => key.startsWith("line_items"));
  if (items.length !== 2) {
    return {
      param: "line_items",
      message: `Expected one item with a price and a quantity, got ${items.join(", ")}.`,
    };
  }
  const customer = form.get("customer") ?? "";
  if (!fakeStripe.subscriptions.has(customer)) {
    return { param: "customer", message: `No such customer: '${customer}'` };
  }
}

stripeServer.use(
  // Next.js also sends requests to its own server, for example to show the
  // page an action redirects to. Those go through untouched.
  http.all(/^http:\/\/localhost:\d+\//, () => passthrough()),
  // Prices by lookup key and by active, like Stripe: a key it doesn't know,
  // or a search for inactive prices only, finds nothing.
  http.get(`${api}/prices`, ({ request }) => {
    const query = new URL(request.url).searchParams;
    const keys = [...query]
      .filter(([name]) => name.startsWith("lookup_keys["))
      .map(([, value]) => value);
    const active = query.get("active");
    const found =
      (keys.length === 0 || keys.includes(PRO_PRICE_LOOKUP_KEY)) &&
      (active === null || active === String(proPrice.active));
    return HttpResponse.json({
      object: "list",
      data: found ? [proPrice] : [],
      has_more: false,
    });
  }),
  // Every team gets its own customer, with no subscriptions yet.
  http.post(`${api}/customers`, () => {
    const id = `cus_test_${crypto.randomUUID()}`;
    fakeStripe.subscriptions.set(id, []);
    return HttpResponse.json({ id, object: "customer" });
  }),
  // The fake has no payment page: the moment our server makes a Checkout
  // that asks for the right thing, the customer has a Pro subscription, as
  // if they had paid. A wrong one gets Stripe's kind of refusal instead.
  http.post(`${api}/checkout/sessions`, async ({ request }) => {
    const form = new URLSearchParams(await request.text());
    const problem = wrongCheckout(form);
    if (problem) {
      return HttpResponse.json(
        { error: { type: "invalid_request_error", ...problem } },
        { status: 400 },
      );
    }
    const id = `cs_test_${crypto.randomUUID()}`;
    fakeStripe.subscriptions.set(form.get("customer")!, [
      { id: `sub_${id}`, status: "active" },
    ]);
    return HttpResponse.json({
      id,
      object: "checkout.session",
      url: `https://checkout.stripe.com/c/pay/${id}`,
    });
  }),
);

// A request the fake has no answer for fails, and never leaves the machine.
stripeServer.listen({ onUnhandledFrame: "error" });
// To stderr: a tool that reads a program's normal output (like the build's
// TypeScript check) must not find our line in it.
console.error(`Fake Stripe is on, in process ${process.pid}.`);
