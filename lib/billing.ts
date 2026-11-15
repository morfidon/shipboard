import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { member, organization, user } from "@/db/schema";
import { PRO_PRODUCT_ID } from "@/lib/plans";
import { stripe } from "@/lib/stripe";

// A team is on Pro while a subscription to our Pro price is paid up, or in
// a trial.
const proStatuses = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

// The Stripe customer a subscription event is about, or null for an event
// we don't use.
export function customerOf(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const { customer } = event.data.object;
      return typeof customer === "string" ? customer : customer.id;
    }
    default:
      return null;
  }
}

// The team's plan as Stripe sees it now. Stripe doesn't promise the order of
// events, so we don't trust the copy inside one event: we ask for all of the
// customer's subscriptions, on every page. Pro means a subscription to our Pro
// product, whatever its price: the lookup key only picks the price for new
// purchases.
export async function planNow(customerId: string) {
  let pro: Stripe.Subscription | undefined;
  let newest: Stripe.Subscription | undefined;
  for await (const subscription of stripe().subscriptions.list({
    customer: customerId,
    status: "all",
  })) {
    newest ??= subscription;
    if (
      proStatuses.has(subscription.status) &&
      subscription.items.data.some(
        (item) => productOf(item.price) === PRO_PRODUCT_ID,
      )
    ) {
      pro = subscription;
      break;
    }
  }
  return {
    plan: pro ? ("pro" as const) : ("free" as const),
    planStatus: (pro ?? newest)?.status ?? null,
  };
}

function productOf(price: Stripe.Price) {
  return typeof price.product === "string" ? price.product : price.product.id;
}

export async function applyStripeEvent(event: Stripe.Event) {
  const customerId = customerOf(event);
  if (!customerId) {
    return;
  }

  const result = await db.transaction(async (tx) => {
    // Waiting for another event of this team: 5 seconds at most. After that,
    // the route fails, and Stripe tries again later.
    await tx.execute(sql`set local lock_timeout = '5s'`);
    // Our server made this customer for one team. We lock that team's row,
    // so another event for the same team waits here until this one is saved.
    const [team] = await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.stripeCustomerId, customerId))
      .for("update");
    if (!team) {
      return null;
    }
    const now = await planNow(customerId);
    await tx.update(organization).set(now).where(eq(organization.id, team.id));
    return { teamId: team.id, plan: now.plan };
  });

  if (!result) {
    console.log(`Skipped ${event.type}: not one of our teams.`);
    return;
  }
  // A new subscription sends a thank-you email, but only when the team
  // really is on Pro now.
  if (event.type === "customer.subscription.created" && result.plan === "pro") {
    await sendWelcomeEmail(result.teamId);
  }
}

// For now, emails go to the terminal.
async function sendWelcomeEmail(organizationId: string) {
  const owners = await db
    .select({ email: user.email, team: organization.name })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      and(eq(member.organizationId, organizationId), eq(member.role, "owner")),
    );
  for (const owner of owners) {
    console.log(
      `Email to ${owner.email}: ${owner.team} is on Pro now. Thank you!`,
    );
  }
}
