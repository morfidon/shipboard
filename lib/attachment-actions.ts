"use server";

import { refresh } from "next/cache";
import { prepareUpload, saveAttachment } from "@/lib/data";
import { uploadSchema } from "@/lib/schemas";

export type UploadTicket = { error: string } | { key: string; url: string };

// Step 1 of an upload: the browser describes its file, and gets a signed
// link for exactly that file, or the reason it can't upload.
export async function requestUploadAction(
  issueId: string,
  file: unknown,
): Promise<UploadTicket> {
  const parsed = uploadSchema.safeParse(file);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  return prepareUpload(issueId, parsed.data);
}

// Step 3: the file is in storage. Save the attachment and show it.
export async function recordUploadAction(
  issueId: string,
  key: string,
  file: unknown,
): Promise<{ error?: string }> {
  const parsed = uploadSchema.safeParse(file);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const saved = await saveAttachment(issueId, String(key), parsed.data);
  if ("error" in saved) {
    return saved;
  }
  refresh();
  return {};
}
