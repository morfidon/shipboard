"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { createIssue, updateIssueStatus, type IssueStatus } from "@/lib/data";
import { issueSchema, statusSchema } from "@/lib/schemas";

// Every action here is a public endpoint: anyone can call it with any
// arguments. So each one checks who is asking before it changes anything.

export type FormState = {
  errors?: { title?: string[]; description?: string[] };
  message?: string;
  values?: { title: string; description: string };
};

export async function createIssueAction(
  projectId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    title: formData.get("title"),
    description: formData.get("description"),
  };
  // React empties the form after every submit, so every answer sends back
  // what was typed and the form shows it again.
  const values = {
    title: String(input.title ?? ""),
    description: String(input.description ?? ""),
  };
  const result = issueSchema.safeParse(input);

  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors, values };
  }

  const user = await getCurrentUser();
  const created = await createIssue(
    { projectId, ...result.data },
    user.organizationId,
  );
  if (!created) {
    return { message: "Project not found.", values };
  }

  refresh();
  redirect(`/projects/${projectId}`);
}

export async function updateIssueStatusAction(
  issueId: string,
  status: IssueStatus,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  // Our menu offers only the three statuses. parse() throws for anything else.
  const changed = await updateIssueStatus(
    issueId,
    statusSchema.parse(status),
    user.organizationId,
  );
  if (!changed) {
    return { error: "Issue not found." };
  }

  // The data changed, so render the current page again with fresh data.
  refresh();
  return {};
}
