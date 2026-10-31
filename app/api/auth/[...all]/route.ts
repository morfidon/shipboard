import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Every address under /api/auth (sign in, sign out, get the session...)
// goes to Better Auth.
export const { GET, POST } = toNextJsHandler(auth);
