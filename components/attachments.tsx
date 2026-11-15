import Link from "next/link";
import { AttachmentUpload } from "@/components/attachment-upload";
import { getAttachments, getBilling, getIssuePermissions } from "@/lib/data";

export async function Attachments({ issueId }: { issueId: string }) {
  const [files, billing, permissions] = await Promise.all([
    getAttachments(issueId),
    getBilling(),
    getIssuePermissions(),
  ]);

  return (
    <section className="mt-10 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Attachments</h2>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {files.map((file) => (
            <li key={file.id}>
              {/* Our own address: it checks access and makes a fresh link. */}
              <Link
                href={`/attachments/${file.id}/download`}
                prefetch={false}
                className="underline"
              >
                {file.fileName}
              </Link>{" "}
              <span className="text-muted-foreground">
                ({formatSize(file.size)})
              </span>
            </li>
          ))}
        </ul>
      )}
      {billing.plan !== "pro" ? (
        <p className="text-sm text-muted-foreground">
          Attachments are a Pro feature.
        </p>
      ) : (
        // Only people who may change the issue see the upload.
        permissions.update && <AttachmentUpload issueId={issueId} />
      )}
    </section>
  );
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
