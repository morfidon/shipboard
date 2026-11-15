import { eq } from "drizzle-orm";
import { http, HttpResponse } from "msw";
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
import { db } from "@/db";
import { organization } from "@/db/schema";
import { manageBillingAction, upgradeAction } from "@/lib/billing-actions";
import { getCurrentUser } from "@/lib/current-user";
import { createOrganization } from "./factories";
import {
  api,
  fakeStripe,
  listSubscriptions,
  resetFakeStripe,
  stripeServer,
} from "./stripe-mock";

vi.mock("next/navigation", () => ({
  // Like the real redirect(): it throws, so nothing after it runs.
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));

// Our fake Stripe answers during these tests. A request it has no answer
// for fails the test, so nothing ever reaches the real Stripe.
beforeAll(() => stripeServer.listen({ onUnhandledFrame: "error" }));
afterEach(() => stripeServer.resetHandlers());
afterAll(() => stripeServer.close());

let organizationId: string;

beforeEach(async () => {
  vi.clearAllMocks();
  resetFakeStripe();
  organizationId = (await createOrganization()).id;
  signedInAs("owner");
});

function signedInAs(role: string) {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "maya",
    name: "Maya Chen",
    organizationId,
    role,
  });
}

async function setBilling(values: Partial<typeof organization.$inferInsert>) {
  await db
    .update(organization)
    .set(values)
    .where(eq(organization.id, organizationId));
}

async function storedCustomer() {
  const [row] = await db
    .select({ customer: organization.stripeCustomerId })
    .from(organization)
    .where(eq(organization.id, organizationId));
  return row.customer;
}

// A team that already has its customer, with no subscription yet.
async function withCustomer() {
  await setBilling({ stripeCustomerId: "cus_test_1" });
  fakeStripe.subscriptions.set("cus_test_1", []);
}

const ours = () => ({ purpose: "pro-upgrade", organizationId });

describe("upgradeAction", () => {
  it("makes the team's customer, then sends the owner to Checkout", async () => {
    fakeStripe.subscriptions.set("cus_test_new", []);

    await expect(upgradeAction()).rejects.toThrow(
      "NEXT_REDIRECT https://checkout.stripe.com/c/pay/cs_test_1",
    );

    expect(fakeStripe.sent.customer.get("metadata[organizationId]")).toBe(
      organizationId,
    );
    expect(fakeStripe.keys.customer).toBe(`customer-${organizationId}`);
    expect(await storedCustomer()).toBe("cus_test_new");
    const sent = fakeStripe.sent.checkout;
    expect(sent.get("customer")).toBe("cus_test_new");
    expect(sent.get("line_items[0][price]")).toBe("price_test_pro");
    expect(sent.get("metadata[purpose]")).toBe("pro-upgrade");
    expect(sent.get("metadata[organizationId]")).toBe(organizationId);
  });

  it("reuses our open Checkout, so two tabs pay only once", async () => {
    await withCustomer();
    fakeStripe.openCheckouts.set("cus_test_1", [
      {
        url: "https://checkout.stripe.com/c/pay/cs_test_open",
        metadata: ours(),
      },
    ]);

    await expect(upgradeAction()).rejects.toThrow(
      "NEXT_REDIRECT https://checkout.stripe.com/c/pay/cs_test_open",
    );
    expect(fakeStripe.sent.checkout).toBeUndefined();
  });

  it("never reuses a Checkout that isn't our Pro upgrade", async () => {
    await withCustomer();
    fakeStripe.openCheckouts.set("cus_test_1", [
      { url: "https://checkout.stripe.com/c/pay/cs_other", metadata: {} },
    ]);

    await expect(upgradeAction()).rejects.toThrow(
      "NEXT_REDIRECT https://checkout.stripe.com/c/pay/cs_test_1",
    );
  });

  it("sends the team to the portal when its Checkout completes during the checks", async () => {
    await withCustomer();
    fakeStripe.openCheckouts.set("cus_test_1", [
      {
        url: "https://checkout.stripe.com/c/pay/cs_test_open",
        metadata: ours(),
      },
    ]);
    // Right after Stripe's first answer, the Checkout completes: it isn't
    // open any more, and its subscription is there.
    let answered = 0;
    const complete = () => {
      answered += 1;
      if (answered === 1) {
        fakeStripe.openCheckouts.set("cus_test_1", []);
        fakeStripe.subscriptions.set("cus_test_1", [
          { id: "sub_test_1", status: "active" },
        ]);
      }
    };
    stripeServer.use(
      http.get(`${api}/subscriptions`, ({ request }) => {
        const response = listSubscriptions(request);
        complete();
        return response;
      }),
      http.get(`${api}/checkout/sessions`, () => {
        const open = fakeStripe.openCheckouts.get("cus_test_1") ?? [];
        complete();
        return HttpResponse.json({
          object: "list",
          data: open.map((c, i) => ({ id: `cs_test_open_${i}`, ...c })),
          has_more: false,
        });
      }),
    );

    await expect(upgradeAction()).rejects.toThrow("NEXT_REDIRECT https://");
    expect(fakeStripe.calls).not.toContain("POST /v1/checkout/sessions");
  });

  it("sends a team whose subscription isn't over to the portal", async () => {
    await setBilling({
      stripeCustomerId: "cus_test_1",
      planStatus: "past_due",
    });
    fakeStripe.subscriptions.set("cus_test_1", [
      { id: "sub_test_1", status: "past_due" },
    ]);

    await expect(upgradeAction()).rejects.toThrow(
      "NEXT_REDIRECT https://billing.stripe.com/p/session/test_1",
    );
    expect(fakeStripe.sent.checkout).toBeUndefined();
  });

  it("reads every page of subscriptions", async () => {
    await setBilling({ stripeCustomerId: "cus_test_1" });
    const canceled = Array.from({ length: 10 }, (_, i) => ({
      id: `sub_old_${i}`,
      status: "incomplete_expired",
    }));
    fakeStripe.subscriptions.set("cus_test_1", [
      ...canceled,
      { id: "sub_test_1", status: "past_due" },
    ]);

    await expect(upgradeAction()).rejects.toThrow(
      "NEXT_REDIRECT https://billing.stripe.com/p/session/test_1",
    );
  });

  it("gives the team a new customer when Stripe's was deleted", async () => {
    await setBilling({ stripeCustomerId: "cus_gone" });
    fakeStripe.deletedCustomers.add("cus_gone");
    fakeStripe.subscriptions.set("cus_test_new", []);

    await expect(upgradeAction()).rejects.toThrow(
      "NEXT_REDIRECT https://checkout",
    );
    expect(fakeStripe.keys.customer).toBe(
      `customer-${organizationId}-after-cus_gone`,
    );
    expect(await storedCustomer()).toBe("cus_test_new");
  });

  it("asks Stripe nothing for a team already on Pro", async () => {
    await setBilling({
      plan: "pro",
      planStatus: "active",
      stripeCustomerId: "cus_test_1",
    });

    await expect(upgradeAction()).rejects.toThrow("NEXT_REDIRECT /team");
    expect(fakeStripe.calls).toEqual([]);
  });

  it("refuses a member, before asking Stripe anything", async () => {
    signedInAs("member");

    await expect(upgradeAction()).rejects.toThrow(
      "Only an owner or an admin can change the plan.",
    );
    expect(fakeStripe.calls).toEqual([]);
  });
});

describe("manageBillingAction", () => {
  it("sends the owner of a team with a customer to the Customer Portal", async () => {
    await setBilling({
      planStatus: "past_due",
      stripeCustomerId: "cus_test_1",
    });

    await expect(manageBillingAction()).rejects.toThrow(
      "NEXT_REDIRECT https://billing.stripe.com/p/session/test_1",
    );
    expect(fakeStripe.sent.portal.get("customer")).toBe("cus_test_1");
    expect(fakeStripe.sent.portal.get("configuration")).toBe("bpc_test");
  });
});
