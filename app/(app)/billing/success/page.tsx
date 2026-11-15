import type { Metadata } from "next";
import Link from "next/link";
import { getBilling } from "@/lib/data";

export const metadata: Metadata = { title: "Thank you" };

// Stripe sends the team here after paying. The plan itself changes only
// when Stripe's webhook tells the server, so this page just reads it.
export default async function BillingSuccessPage() {
  const billing = await getBilling();

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-bold">Thank you!</h1>
      {billing.plan === "pro" ? (
        <p>Your team is on Pro now.</p>
      ) : (
        <>
          <p>
            We haven&apos;t received confirmation yet. Check again in a moment.
          </p>
          {/* A plain form: sending it loads this page again. */}
          <form action="/billing/success">
            <button type="submit" className="underline">
              Check again
            </button>
          </form>
        </>
      )}
      <Link href="/team" className="self-start underline">
        Back to your team
      </Link>
    </div>
  );
}
