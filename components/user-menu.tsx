import { headers } from "next/headers";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";
import { getTeamName } from "@/lib/data";

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
    <div className="flex flex-col gap-2 px-3 text-sm">
      <div>
        <p className="font-medium">{session.user.name}</p>
        <p className="text-muted-foreground">{session.user.email}</p>
        <p className="text-muted-foreground">Team: {await getTeamName()}</p>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
