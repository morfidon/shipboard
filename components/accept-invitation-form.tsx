"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { acceptInvitationAction, type AcceptState } from "@/lib/team-actions";

const initialState: AcceptState = {};

export function AcceptInvitationForm({
  invitationId,
}: {
  invitationId: string;
}) {
  const [state, formAction] = useActionState(
    acceptInvitationAction.bind(null, invitationId),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <SubmitButton label="Join the team" pendingLabel="Joining…" />
    </form>
  );
}
