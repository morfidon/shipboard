import { eq, sql } from "drizzle-orm";
import { http, HttpResponse } from "msw";
import Stripe from "stripe";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { db } from "@/db";
import { organization, stripeEvent } from "@/db/schema";
import { createMember, createOrganization, createUser } from "./factories";
import {
  api,
  fakeStripe,
  listSubscriptions,
  resetFakeStripe,
  stripeServer,
} from "./stripe-mock";

// The made-up secret from .env.test. The route checks every signature
// against it, the same way it checks the real one from Stripe.
const secret = process.env.STRIPE_WEBHOOK_SECRET!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// The route asks Stripe for the customer's subscriptions, and our fake
// Stripe answers. A request it has no answer for fails the test.
beforeAll(() => stripeServer.listen({ onUnhandledFrame: "error" }));
afterEach(() => stripeServer.resetHandlers());
afterAll(() => stripeServer.close());

type Team = { id: string; customer: string; ownerEmail: string };
let acme: Team;
let globex: Team;

// A team with its own Stripe customer, like our upgrade makes it.
async function teamWithCustomer(customer: string): Promise<Team> {
  const team = await createOrganization();
  await db
    .update(organization)
    .set({ stripeCustomerId: customer })
    .where(eq(organization.id, team.id));
  const owner = await createUser();
  await createMember({
    organizationId: team.id,
    userId: owner.id,
    role: "owner",
  });
  return { id: team.id, customer, ownerEmail: owner.email };
}

beforeEach(async () => {
  vi.restoreAllMocks();
  resetFakeStripe();
  acme = await teamWithCustomer("cus_acme");
  globex = await teamWithCustomer("cus_globex");
});

// How Stripe sees a customer's subscriptions right now.
function stripeSays(team: Team, status: string, product = "shipboard_pro") {
  fakeStripe.subscriptions.set(team.customer, [
    { id: "sub_test_1", status, product },
  ]);
}

// How many database connections are waiting for a lock right now.
async function lockWaiters() {
  const result = await db.execute(
    sql`select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and datname = current_database()`,
  );
  return Number((result.rows[0] as { n: number }).n);
}

// A subscription event, shaped like the ones Stripe sends. Its copy of the
// subscription shows how things were when the event happened.
function subscriptionEvent(type: string, team: Team | null, status: string) {
  return {
    id: `evt_test_${crypto.randomUUID()}`,
    object: "event",
    type,
    data: {
      object: {
        id: "sub_test_1",
        object: "subscription",
        customer: team?.customer ?? "cus_not_ours",
        status,
      },
    },
  };
}

// Sends an event to our route, signed like Stripe signs it: the JSON as
// text, and a header made from that exact text and the secret.
function deliver(event: object, signWith = secret) {
  const payload = JSON.stringify(event, null, 2);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: signWith,
  });
  return POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    }),
  );
}

async function billing(team: Team) {
  const [row] = await db
    .select({ plan: organization.plan, status: organization.planStatus })
    .from(organization)
    .where(eq(organization.id, team.id));
  return row;
}

describe("the Stripe webhook", () => {
  it("puts the team on Pro when its subscription starts", async () => {
    stripeSays(acme, "active");

    const response = await deliver(
      subscriptionEvent("customer.subscription.created", acme, "active"),
    );

    expect(response.status).toBe(200);
    expect(await billing(acme)).toEqual({ plan: "pro", status: "active" });
  });

  it("changes only the team whose customer the event names", async () => {
    stripeSays(globex, "active");

    await deliver(
      subscriptionEvent("customer.subscription.created", globex, "active"),
    );

    expect(await billing(globex)).toEqual({ plan: "pro", status: "active" });
    expect(await billing(acme)).toEqual({ plan: "free", status: null });
  });

  it("sends the welcome email once, even if Stripe sends the event twice", async () => {
    stripeSays(acme, "active");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const event = subscriptionEvent(
      "customer.subscription.created",
      acme,
      "active",
    );

    await deliver(event);
    await deliver(event);

    const emails = log.mock.calls.filter(([line]) =>
      String(line).startsWith(`Email to ${acme.ownerEmail}`),
    );
    expect(emails).toHaveLength(1);
    expect(await db.select().from(stripeEvent)).toHaveLength(1);
  });

  it("puts the team back on Free when the subscription ends", async () => {
    stripeSays(acme, "active");
    await deliver(
      subscriptionEvent("customer.subscription.created", acme, "active"),
    );
    stripeSays(acme, "canceled");
    await deliver(
      subscriptionEvent("customer.subscription.deleted", acme, "canceled"),
    );

    expect(await billing(acme)).toEqual({ plan: "free", status: "canceled" });
  });

  it("keeps the team on Free when an old event arrives after the end", async () => {
    stripeSays(acme, "canceled");
    await deliver(
      subscriptionEvent("customer.subscription.deleted", acme, "canceled"),
    );
    // Late: the event from when the subscription started. Its copy still
    // says active, but Stripe says canceled.
    await deliver(
      subscriptionEvent("customer.subscription.created", acme, "active"),
    );

    expect(await billing(acme)).toEqual({ plan: "free", status: "canceled" });
  });

  it("lets the newer answer win when two events race", async () => {
    stripeSays(acme, "active");
    // Stripe's first answer ("active") is made, then held.
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    let answers = 0;
    stripeServer.use(
      http.get(`${api}/subscriptions`, async ({ request }) => {
        answers += 1;
        const response = listSubscriptions(request);
        if (answers === 1) {
          await held;
        }
        return response;
      }),
    );

    const slow = deliver(
      subscriptionEvent("customer.subscription.updated", acme, "active"),
    );
    await vi.waitFor(() => expect(answers).toBe(1));
    // Meanwhile the subscription ends, and its event comes in.
    stripeSays(acme, "canceled");
    let fastDone = false;
    const fast = deliver(
      subscriptionEvent("customer.subscription.deleted", acme, "canceled"),
    ).finally(() => (fastDone = true));
    // The held answer goes out only when the second event is waiting for
    // the team's lock, or is already done.
    await vi.waitFor(async () =>
      expect(fastDone || (await lockWaiters()) > 0).toBe(true),
    );
    release();
    await Promise.all([slow, fast]);

    expect(await billing(acme)).toEqual({ plan: "free", status: "canceled" });
  });

  it("finds Pro on the second page of subscriptions", async () => {
    fakeStripe.subscriptions.set(acme.customer, [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `sub_old_${i}`,
        status: "canceled",
      })),
      { id: "sub_test_1", status: "active" },
    ]);

    await deliver(
      subscriptionEvent("customer.subscription.created", acme, "active"),
    );

    expect(await billing(acme)).toEqual({ plan: "pro", status: "active" });
  });

  it("counts any price of the Pro product, and nothing else", async () => {
    stripeSays(acme, "active", "shipboard_pro");
    stripeSays(globex, "active", "some_other_product");

    await deliver(
      subscriptionEvent("customer.subscription.updated", acme, "active"),
    );
    await deliver(
      subscriptionEvent("customer.subscription.updated", globex, "active"),
    );

    expect(await billing(acme)).toMatchObject({ plan: "pro" });
    expect(await billing(globex)).toMatchObject({ plan: "free" });
  });

  it("saves nothing when Stripe doesn't answer, so Stripe can try again", async () => {
    stripeSays(acme, "active");
    stripeServer.use(
      http.get(`${api}/subscriptions`, () => HttpResponse.error()),
    );

    await expect(
      deliver(
        subscriptionEvent("customer.subscription.created", acme, "active"),
      ),
    ).rejects.toThrow("An error occurred with our connection to Stripe");
    expect(await billing(acme)).toEqual({ plan: "free", status: null });
    expect(await db.select().from(stripeEvent)).toEqual([]);
  });

  it("refuses an event signed with another secret", async () => {
    stripeSays(acme, "active");

    const response = await deliver(
      subscriptionEvent("customer.subscription.created", acme, "active"),
      "whsec_somebody_else",
    );

    expect(response.status).toBe(400);
    expect(await billing(acme)).toEqual({ plan: "free", status: null });
  });

  it("answers 200 to an event that isn't about one of our teams", async () => {
    const response = await deliver(
      subscriptionEvent("customer.subscription.created", null, "active"),
    );

    expect(response.status).toBe(200);
    expect(fakeStripe.calls).toEqual([]);
  });
});
