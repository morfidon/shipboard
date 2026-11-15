"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  archiveIssue,
  createIssue,
  createProject,
  projectTag,
  teamTag,
  updateIssue,
  updateIssueStatus,
  type IssueStatus,
} from "@/lib/data";
import { issueSchema, projectSchema, statusSchema } from "@/lib/schemas";

// Every action here is a public endpoint: anyone can call it with any
// arguments. The data layer checks who is asking and what their role may
// do before it changes anything.

export type FormState = {
  errors?: { title?: string[]; description?: string[] };
  message?: string;
  values?: { title: string; description: string };
};

// The issue form's fields, checked. (Not exported, so not an action.)
function readIssueForm(formData: FormData) {
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
  return { result: issueSchema.safeParse(input), values };
}

export async function createIssueAction(
  projectId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { result, values } = readIssueForm(formData);
  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors, values };
  }

  const created = await createIssue({ projectId, ...result.data });
  if (!created) {
    return { message: "Project not found.", values };
  }

  // The id as the database stores it, so the label matches the saved copies.
  updateTag(projectTag(created.projectId));
  redirect(`/projects/${created.projectId}`);
}

export async function updateIssueAction(
  issueId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { result, values } = readIssueForm(formData);
  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors, values };
  }

  const updated = await updateIssue(issueId, result.data);
  if (!updated) {
    return { message: "Issue not found.", values };
  }

  updateTag(projectTag(updated.projectId));
  redirect(`/projects/${updated.projectId}`);
}

export async function updateIssueStatusAction(
  issueId: string,
  status: IssueStatus,
): Promise<{ error?: string }> {
  // Our menu offers only the three statuses. parse() throws for anything else.
  const changed = await updateIssueStatus(issueId, statusSchema.parse(status));
  if (!changed) {
    return { error: "Issue not found." };
  }

  // Throw away every saved copy with this project's label. updateTag also
  // renders the current page again, in the same answer.
  updateTag(projectTag(changed.projectId));
  return {};
}

export async function archiveIssueAction(
  issueId: string,
): Promise<{ error?: string }> {
  const archived = await archiveIssue(issueId);
  if (!archived) {
    return { error: "Issue not found." };
  }

  updateTag(projectTag(archived.projectId));
  return {};
}

export type ProjectFormState = {
  errors?: { name?: string[]; description?: string[] };
  values?: { name: string; description: string };
};

export async function createProjectAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
  const result = projectSchema.safeParse(values);
  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors, values };
  }

  const created = await createProject(result.data);
  // The dashboard's copy lists the team's projects: a new one must show.
  updateTag(teamTag(created.organizationId));
  redirect(`/projects/${created.id}`);
}
