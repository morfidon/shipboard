"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction, type ProjectFormState } from "@/lib/actions";

const initialState: ProjectFormState = {};

export function NewProjectForm() {
  const [state, formAction] = useActionState(createProjectAction, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={state.values?.name}
          aria-invalid={Boolean(state.errors?.name)}
          aria-describedby={state.errors?.name && "name-error"}
        />
        {state.errors?.name && (
          <p id="name-error" role="alert" className="text-sm text-destructive">
            {state.errors.name[0]}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={state.values?.description}
          aria-invalid={Boolean(state.errors?.description)}
          aria-describedby={state.errors?.description && "description-error"}
        />
        {state.errors?.description && (
          <p
            id="description-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {state.errors.description[0]}
          </p>
        )}
      </div>
      <SubmitButton label="Create project" pendingLabel="Creating…" />
    </form>
  );
}
