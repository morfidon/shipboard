import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {/* The page's one main heading, for screen readers and axe. */}
          <h1>Sign in to Shipboard</h1>
        </CardTitle>
        <CardDescription>Use your work email and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        No account yet?&nbsp;
        <Link href="/sign-up" className="underline">
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
