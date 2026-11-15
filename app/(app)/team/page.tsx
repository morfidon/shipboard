import type { Metadata } from "next";
import { InviteForm } from "@/components/invite-form";
import { SubmitButton } from "@/components/submit-button";
import { manageBillingAction, upgradeAction } from "@/lib/billing-actions";
import {
  getBilling,
  getMembers,
  getPendingInvitations,
  getTeamName,
} from "@/lib/data";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const [teamName, members, invitations, billing] = await Promise.all([
    getTeamName(),
    getMembers(),
    getPendingInvitations(),
    getBilling(),
  ]);
  const isPro = billing.plan === "pro";
  // A subscription that isn't over yet, as Stripe's last event told us.
  const hasSubscription =
    billing.status !== null &&
    !["canceled", "incomplete_expired"].includes(billing.status);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{teamName}</h1>
        <p className="mt-2 text-muted-foreground">Who works on this team.</p>
      </div>
      <ul className="divide-y rounded-md border">
        {members.map((person) => (
          <li
            key={person.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="font-medium">{person.name}</p>
              <p className="text-sm text-muted-foreground">{person.email}</p>
            </div>
            <span className="text-sm capitalize">{person.role}</span>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="text-lg font-semibold">Plan</h2>
        {isPro ? (
          <p>Pro ({billing.status}): file attachments on every issue.</p>
        ) : hasSubscription ? (
          <p>
            Free for now: the subscription is {billing.status}. Manage billing
            to fix the payment.
          </p>
        ) : (
          <p>Free. Pro adds file attachments on every issue, for $9 a month.</p>
        )}
        {billing.canManage && (
          <div className="flex flex-wrap gap-2">
            {!isPro && !hasSubscription && (
              <form action={upgradeAction}>
                <SubmitButton
                  label="Upgrade to Pro"
                  pendingLabel="Opening Stripe…"
                />
              </form>
            )}
            {billing.customerId && (
              <form action={manageBillingAction}>
                <SubmitButton
                  label="Manage billing"
                  pendingLabel="Opening Stripe…"
                />
              </form>
            )}
          </div>
        )}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Invite someone</h2>
        <InviteForm />
        {invitations.length > 0 && (
          <ul className="text-sm text-muted-foreground">
            {invitations.map((invite) => (
              <li key={invite.id}>
                Waiting for {invite.email} ({invite.role})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
