import { z } from "zod";

// The rules a new issue must pass. This file has no server code,
// so the browser could run the same checks too.
export const issueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the issue a title.")
    .max(120, "Keep the title to 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(5000, "Keep the description to 5,000 characters or fewer."),
});

// A new project: a name, and a few words about it.
export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the project a name.")
    .max(80, "Keep the name to 80 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(500, "Keep the description to 500 characters or fewer."),
});

export const statusSchema = z.enum(["todo", "in_progress", "done"]);

// What may be attached to an issue: a few common kinds, up to 10 MB.
export const attachmentTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
] as const;
export const maxAttachmentSize = 10 * 1024 * 1024;

export const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200, "Keep the file name short."),
  size: z
    .number()
    .int()
    .positive("The file is empty.")
    .max(maxAttachmentSize, "Files can be up to 10 MB."),
  contentType: z.enum(attachmentTypes, "That type of file isn't allowed."),
});
