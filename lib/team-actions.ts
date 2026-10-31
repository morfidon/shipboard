"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type InviteState = {
  message?: string;
  sentTo?: string;
};

export async function inviteAction(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const email = String(formData.get("email") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "member";

  try {
    // Better Auth checks that the person asking may invite to their
    // active team, and that the email isn't a member already.
    await auth.api.createInvitation({
      body: { email, role },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { message: error.message };
    }
    throw error;
  }

  // Show the new invitation in the list.
  refresh();
  return { sentTo: email };
}

export type AcceptState = {
  message?: string;
};

export async function acceptInvitationAction(
  invitationId: string,
): Promise<AcceptState> {
  try {
    // Only the person it was sent to can accept it. Accepting also
    // switches their session to the new team.
    await auth.api.acceptInvitation({
      body: { invitationId },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { message: error.message };
    }
    throw error;
  }

  // The sidebar shows the team too, and it stays on screen: render it again.
  refresh();
  redirect("/projects");
}
