"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createIssue, updateIssueStatus, type IssueStatus } from "@/lib/data";
import { issueSchema, statusSchema } from "@/lib/schemas";

export type FormState = {
  errors?: { title?: string[]; description?: string[] };
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
  const result = issueSchema.safeParse(input);

  if (!result.success) {
    return {
      errors: z.flattenError(result.error).fieldErrors,
      // React empties the form after every submit, so we send back
      // what was typed and the form shows it again.
      values: {
        title: String(input.title ?? ""),
        description: String(input.description ?? ""),
      },
    };
  }

  await createIssue({ projectId, ...result.data });
  redirect(`/projects/${projectId}`);
}

export async function updateIssueStatusAction(
  issueId: string,
  status: IssueStatus,
) {
  // Our menu offers only the three statuses. parse() throws for anything else.
  await updateIssueStatus(issueId, statusSchema.parse(status));
  // The data changed, so render the current page again with fresh data.
  refresh();
}
