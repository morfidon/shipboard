"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getBilling } from "@/lib/data";
import { siteUrl } from "@/lib/site";
import { portalConfigurationId, proPriceId, stripe } from "@/lib/stripe";

// A subscription in one of these states is over: the team may start a new one.
const overStatuses = new Set(["canceled", "incomplete_expired"]);

// Sends the team to Stripe Checkout for the Pro plan, or to the Customer
// Portal when there is already a subscription to manage.
export async function upgradeAction() {
  const { organizationId } = await getCurrentUser();
  const billing = await getBilling();
  if (!billing.canManage) {
    throw new Error("Only an owner or an admin can change the plan.");
  }
  if (billing.plan === "pro") {
    redirect("/team");
  }

  const customerId = await teamCustomer(organizationId);

  // One click at a time per team: the first one locks the team's row, and a
  // second click, or a second tab, waits until the first one is done.
  const url = await db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for("update");

    // First, our own Checkout for this team that is still open: reuse it,
    // so two tabs pay only once.
    for await (const session of stripe().checkout.sessions.list({
      customer: customerId,
      status: "open",
    })) {
      if (
        session.metadata?.purpose === "pro-upgrade" &&
        session.metadata.organizationId === organizationId &&
        session.url
      ) {
        return session.url;
      }
    }

    // Then a subscription that isn't over yet, on every page: manage it in the
    // portal. A Checkout that finished a moment ago has its subscription here.
    for await (const subscription of stripe().subscriptions.list({
      customer: customerId,
    })) {
      if (!overStatuses.has(subscription.status)) {
        return portalUrl(customerId);
      }
    }

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: await proPriceId(), quantity: 1 }],
      client_reference_id: organizationId,
      // Our mark: only a Checkout with it may be reused for this team.
      metadata: { purpose: "pro-upgrade", organizationId },
      subscription_data: { metadata: { organizationId } },
      success_url: `${siteUrl}/billing/success`,
      cancel_url: `${siteUrl}/team`,
    });
    return session.url!;
  });
  redirect(url);
}

// Sends the team to Stripe's Customer Portal: invoices, card, canceling.
export async function manageBillingAction() {
  const { organizationId } = await getCurrentUser();
  const billing = await getBilling();
  if (!billing.canManage) {
    throw new Error("Only an owner or an admin can change the plan.");
  }
  if (!billing.customerId) {
    redirect("/team");
  }
  redirect(await portalUrl(await teamCustomer(organizationId)));
}

// The team's one Stripe customer, made by our server. Its own short
// transaction saves the link before any Checkout work starts.
async function teamCustomer(organizationId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    const [team] = await tx
      .select({ customerId: organization.stripeCustomerId })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for("update");

    let key = `customer-${organizationId}`;
    if (team.customerId) {
      const customer = await stripe().customers.retrieve(team.customerId);
      if (!customer.deleted) {
        return team.customerId;
      }
      // Someone deleted it in Stripe: the team gets a new one, with a new key.
      key = `customer-${organizationId}-after-${team.customerId}`;
    }

    // The key makes a retry get the same customer back. Stripe keeps keys for
    // at least 24 hours; after that, our database keeps the link. Only stable
    // parameters go with the key, so a renamed team can't make a mismatch.
    const customer = await stripe().customers.create(
      { metadata: { organizationId } },
      { idempotencyKey: key },
    );
    await tx
      .update(organization)
      .set({ stripeCustomerId: customer.id })
      .where(eq(organization.id, organizationId));
    return customer.id;
  });
}

async function portalUrl(customerId: string) {
  const portal = await stripe().billingPortal.sessions.create({
    customer: customerId,
    configuration: await portalConfigurationId(),
    return_url: `${siteUrl}/team`,
  });
  return portal.url;
}
