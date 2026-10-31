import { headers } from "next/headers";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";

// Who is signed in? Better Auth finds the session cookie in the request
// and looks the session up in the database.
export async function UserMenu() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <Link href="/sign-in" className={buttonVariants({ variant: "outline" })}>
        Sign in
      </Link>
    );
  }

  return (
    <div className="px-3 text-sm">
      <p className="font-medium">{session.user.name}</p>
      <p className="text-muted-foreground">{session.user.email}</p>
    </div>
  );
}
