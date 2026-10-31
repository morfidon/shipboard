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
