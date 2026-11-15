import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// A stand-in for Stripe's API. MSW catches every request our code sends to
// api.stripe.com and answers it here, like Stripe would. Nothing leaves the
// machine, and no key is needed.
export const api = "https://api.stripe.com/v1";

type FakeSubscription = { id: string; status: string; product?: string };
type FakeCheckout = { url: string; metadata: Record<string, string> };

// What our fake Stripe knows. Each test sets what it needs.
export const fakeStripe = {
  // Each customer's subscriptions, newest first. A customer we never set
  // doesn't exist.
  subscriptions: new Map<string, FakeSubscription[]>(),
  // Each customer's open Checkouts.
  openCheckouts: new Map<string, FakeCheckout[]>(),
  // Customers someone deleted in Stripe.
  deletedCustomers: new Set<string>(),
  // The last form Stripe was sent, and its idempotency key, per kind.
  sent: {} as Record<string, URLSearchParams>,
  keys: {} as Record<string, string | null>,
  // Every request, like "POST /v1/customers".
  calls: [] as string[],
};

export function resetFakeStripe() {
  fakeStripe.subscriptions.clear();
  fakeStripe.openCheckouts.clear();
  fakeStripe.deletedCustomers.clear();
  fakeStripe.sent = {};
  fakeStripe.keys = {};
  fakeStripe.calls = [];
}

// A subscription as Stripe's API shows it, with one item on a price of a
// product: our Pro product, unless the test says otherwise.
export function subscriptionJson(
  customer: string,
  subscription: FakeSubscription,
) {
  return {
    id: subscription.id,
    object: "subscription",
    customer,
    status: subscription.status,
    items: {
      object: "list",
      data: [
        {
          id: `si_${subscription.id}`,
          object: "subscription_item",
          price: {
            id: "price_test_pro",
            object: "price",
            product: subscription.product ?? "shipboard_pro",
          },
        },
      ],
    },
  };
}

// One page of a list, like Stripe's: `limit` items (10 by default), after
// the id in `starting_after`, and `has_more` when there is another page.
function page<T extends { id: string }>(request: Request, all: T[]) {
  const query = new URL(request.url).searchParams;
  const limit = Number(query.get("limit") ?? 10);
  const after = query.get("starting_after");
  const start = after ? all.findIndex((item) => item.id === after) + 1 : 0;
  return HttpResponse.json({
    object: "list",
    data: all.slice(start, start + limit),
    has_more: start + limit < all.length,
  });
}

// The customer's subscriptions, one page at a time. An unknown customer gets
// an error, like Stripe's.
export function listSubscriptions(request: Request) {
  const query = new URL(request.url).searchParams;
  const customer = query.get("customer") ?? "";
  const subscriptions = fakeStripe.subscriptions.get(customer);
  if (!subscriptions) {
    return HttpResponse.json(
      {
        error: {
          type: "invalid_request_error",
          message: `No such customer: '${customer}'`,
        },
      },
      { status: 404 },
    );
  }
  // Without status=all, Stripe leaves out canceled subscriptions.
  const shown =
    query.get("status") === "all"
      ? subscriptions
      : subscriptions.filter((s) => s.status !== "canceled");
  return page(
    request,
    shown.map((s) => subscriptionJson(customer, s)),
  );
}

async function remember(kind: string, request: Request) {
  fakeStripe.keys[kind] = request.headers.get("idempotency-key");
  fakeStripe.sent[kind] = new URLSearchParams(await request.text());
}

export const stripeServer = setupServer(
  http.get(`${api}/prices`, ({ request }) =>
    page(request, [{ id: "price_test_pro", object: "price" }]),
  ),
  http.get(`${api}/billing_portal/configurations`, ({ request }) =>
    page(request, [{ id: "bpc_test", metadata: { app: "shipboard" } }]),
  ),
  http.post(`${api}/customers`, async ({ request }) => {
    await remember("customer", request);
    return HttpResponse.json({ id: "cus_test_new", object: "customer" });
  }),
  http.get(`${api}/customers/:id`, ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json(
      fakeStripe.deletedCustomers.has(id)
        ? { id, object: "customer", deleted: true }
        : { id, object: "customer" },
    );
  }),
  http.get(`${api}/subscriptions`, ({ request }) => listSubscriptions(request)),
  http.get(`${api}/checkout/sessions`, ({ request }) => {
    const customer = new URL(request.url).searchParams.get("customer") ?? "";
    const open = fakeStripe.openCheckouts.get(customer) ?? [];
    return page(
      request,
      open.map((checkout, i) => ({
        id: `cs_test_open_${i}`,
        object: "checkout.session",
        ...checkout,
      })),
    );
  }),
  http.post(`${api}/checkout/sessions`, async ({ request }) => {
    await remember("checkout", request);
    return HttpResponse.json({
      id: "cs_test_1",
      object: "checkout.session",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
  }),
  http.post(`${api}/billing_portal/sessions`, async ({ request }) => {
    await remember("portal", request);
    return HttpResponse.json({
      id: "bps_test_1",
      object: "billing_portal.session",
      url: "https://billing.stripe.com/p/session/test_1",
    });
  }),
);

stripeServer.events.on("request:start", ({ request }) => {
  fakeStripe.calls.push(`${request.method} ${new URL(request.url).pathname}`);
});
