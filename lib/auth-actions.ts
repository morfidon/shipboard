"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

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

  try {
    await auth.api.signInEmail({
      // callbackURL: where a fresh verification link leads, if one is needed.
      body: { email, password, callbackURL: "/dashboard" },
      headers: await headers(),
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
