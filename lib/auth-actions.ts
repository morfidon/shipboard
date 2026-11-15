"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { clientAddress, hit, tooManyTries } from "@/lib/rate-limit";

export type SignInState = {
  message?: string;
  email?: string;
};

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Before any password is checked: 5 tries per email, and 20 per address,
  // every 15 minutes. Both count, so neither one guesser nor one network
  // can try forever.
  const requestHeaders = await headers();
  const limits = await Promise.all([
    hit(`sign-in:email:${email.trim().toLowerCase()}`, 5, 15 * 60),
    hit(`sign-in:address:${clientAddress(requestHeaders)}`, 20, 15 * 60),
  ]);
  const blocked = limits.filter((limit) => !limit.allowed);
  if (blocked.length > 0) {
    // The longest wait, so the next try after it really is allowed.
    const wait = Math.max(...blocked.map((limit) => limit.retryAfterSeconds));
    return { message: tooManyTries(wait), email };
  }

  try {
    await auth.api.signInEmail({
      // callbackURL: where a fresh verification link leads, if one is needed.
      body: { email, password, callbackURL: "/dashboard" },
      headers: requestHeaders,
    });
  } catch (error) {
    if (error instanceof APIError) {
      // Better Auth says what went wrong. The email goes back to the form,
      // the password never does.
      return { message: error.message, email };
    }
    throw error;
  }

  // redirect() works by throwing, so it stays outside the try.
  redirect("/dashboard");
}

export type SignUpState = {
  message?: string;
  sentTo?: string;
  values?: { name: string; email: string };
};

export async function signUpAction(
  _previous: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const values = { name, email };

  if (!name) {
    return { message: "Tell us your name.", values };
  }

  // 5 new accounts per address every hour: enough for a family, not for
  // a script.
  const address = clientAddress(await headers());
  const limit = await hit(`sign-up:address:${address}`, 5, 60 * 60);
  if (!limit.allowed) {
    return { message: tooManyTries(limit.retryAfterSeconds), values };
  }

  try {
    await auth.api.signUpEmail({
      // callbackURL: where the verification link leads.
      body: { name, email, password, callbackURL: "/dashboard" },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { message: error.message, values };
    }
    throw error;
  }

  // No session yet: first they open the link we just sent.
  return { sentTo: email };
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
