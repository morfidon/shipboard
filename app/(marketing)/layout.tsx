import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-8 py-4">
        <Link href="/" className="text-lg font-bold">
          Shipboard
        </Link>
        <Link href="/sign-in" className={buttonVariants({ variant: "outline" })}>
          Sign in
        </Link>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t px-8 py-4 text-sm text-muted-foreground">
        Shipboard, the project tracker for small teams.
      </footer>
    </div>
  );
}
