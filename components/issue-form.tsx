"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createIssueAction,
  updateIssueAction,
  type FormState,
} from "@/lib/actions";
import type { IssueDetails } from "@/lib/data";

const initialState: FormState = {};

export function NewIssueForm({ projectId }: { projectId: string }) {
  // The project's id travels with the action; the fields come from the form.
  return (
    <IssueForm
      action={createIssueAction.bind(null, projectId)}
      submitLabel="Create issue"
      pendingLabel="Creating…"
    />
  );
}

export function EditIssueForm({ issue }: { issue: IssueDetails }) {
  return (
    <IssueForm
      action={updateIssueAction.bind(null, issue.id)}
      defaultValues={issue}
      submitLabel="Save changes"
      pendingLabel="Saving…"
    />
  );
}

// One form for both: the action and the labels are what differ.
function IssueForm({
  action,
  defaultValues,
  submitLabel,
  pendingLabel,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: { title: string; description: string };
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={state.values?.title ?? defaultValues?.title}
          aria-invalid={Boolean(state.errors?.title)}
          aria-describedby={state.errors?.title && "title-error"}
        />
        <FieldError id="title-error" errors={state.errors?.title} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={state.values?.description ?? defaultValues?.description}
          aria-invalid={Boolean(state.errors?.description)}
          aria-describedby={state.errors?.description && "description-error"}
        />
        <FieldError id="description-error" errors={state.errors?.description} />
      </div>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}

// The server's message for one field. role="alert" reads it out as soon as
// it appears; the field's aria-describedby points here too.
function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {errors[0]}
    </p>
  );
}

// useFormStatus reads the form it sits in, so the button is its own component.
function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? pendingLabel : label}
    </Button>
  );
}
