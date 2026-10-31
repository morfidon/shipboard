"use server";

import { redirect } from "next/navigation";
import { createIssue } from "@/lib/data";

export type FormState = { error?: string };

export async function createIssueAction(
  projectId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return { error: "Give the issue a title." };
  }

  await createIssue({ projectId, title, description });
  redirect(`/projects/${projectId}`);
}
