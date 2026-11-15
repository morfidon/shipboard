"use client";

import { useState } from "react";
import {
  recordUploadAction,
  requestUploadAction,
} from "@/lib/attachment-actions";
import { attachmentTypes } from "@/lib/schemas";

export function AttachmentUpload({ issueId }: { issueId: string }) {
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setMessage(undefined);
    try {
      // 1. Our server checks everything and signs a link for this file.
      const ticket = await requestUploadAction(issueId, {
        fileName: file.name,
        size: file.size,
        contentType: file.type,
      });
      if ("error" in ticket) {
        setMessage(ticket.error);
        return;
      }

      // 2. The file goes straight to storage. Our server never carries it.
      const sent = await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!sent.ok) {
        setMessage("The upload failed. Try again.");
        return;
      }

      // 3. Our server checks that it arrived, and saves the attachment.
      const saved = await recordUploadAction(issueId, ticket.key, {
        fileName: file.name,
        size: file.size,
        contentType: file.type,
      });
      setMessage(saved.error);
    } catch {
      setMessage("The upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        aria-label="Attach a file"
        accept={attachmentTypes.join(",")}
        disabled={busy}
        className="text-sm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void upload(file);
          }
        }}
      />
      {busy && <p className="text-sm text-muted-foreground">Uploading…</p>}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
