"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createIssueAction, type FormState } from "@/lib/actions";

const initialState: FormState = {};

export function NewIssueForm({ projectId }: { projectId: string }) {
  // The project's id travels with the action; the fields come from the form.
  const [state, formAction] = useActionState(
    createIssueAction.bind(null, projectId),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

// useFormStatus reads the form it sits in, so the button is its own component.
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? "Creating…" : "Create issue"}
    </Button>
  );
}
