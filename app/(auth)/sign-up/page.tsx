import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {/* The page's one main heading, for screen readers and axe. */}
          <h1>Create your Shipboard account</h1>
        </CardTitle>
        <CardDescription>It takes a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Already have an account?&nbsp;
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
