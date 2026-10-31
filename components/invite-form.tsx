"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteAction, type InviteState } from "@/lib/team-actions";

const initialState: InviteState = {};

export function InviteForm() {
  const [state, formAction] = useActionState(inviteAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            className="w-64"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <SubmitButton label="Invite" pendingLabel="Inviting…" />
        </div>
      </div>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.sentTo && (
        <p role="status" className="text-sm">
          Invitation sent to {state.sentTo}.
        </p>
      )}
    </form>
  );
}
