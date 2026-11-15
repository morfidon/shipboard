import { APIError } from "better-auth/api";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { AcceptInvitationForm } from "@/components/accept-invitation-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Invitation" };

// Better Auth shows an invitation only to the person it was sent to.
async function findInvitation(id: string) {
  try {
    const invitation = await auth.api.getInvitation({
      query: { id },
      headers: await headers(),
    });
    return { invitation };
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message };
    }
    throw error;
  }
}

export default async function InvitationPage({
  params,
}: PageProps<"/invitations/[id]">) {
  const { id } = await params;
  const result = await findInvitation(id);

  if (!result.invitation) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold">
          This invitation can&apos;t be used
        </h1>
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const { invitation } = result;
  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold">
        Join {invitation.organizationName}?
      </h1>
      <p className="text-muted-foreground">
        {invitation.inviterEmail} invited you as {invitation.role}.
      </p>
      <AcceptInvitationForm invitationId={invitation.id} />
    </div>
  );
}
