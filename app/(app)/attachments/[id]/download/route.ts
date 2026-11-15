import { redirect } from "next/navigation";
import { attachmentDownloadUrl } from "@/lib/data";

// Download, when you click: we check access, then send you to a fresh,
// short-lived link in storage. A page left open never holds an old link.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = await attachmentDownloadUrl(id);
  if (!url) {
    return new Response("Not found", { status: 404 });
  }
  redirect(url);
}
