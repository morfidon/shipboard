"use client";

import { useOptimistic, useState, useTransition } from "react";
import { badgeVariants } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveIssueAction, updateIssueStatusAction } from "@/lib/actions";
import type { IssueStatus } from "@/lib/data";

const statusLabels = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const statusVariants = {
  todo: "outline",
  in_progress: "default",
  done: "secondary",
} as const;

// For someone who may look but not change: the badge alone, no menu.
export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={badgeVariants({ variant: statusVariants[status] })}>
      {statusLabels[status]}
    </span>
  );
}

export function IssueStatusMenu({
  issueId,
  status,
  canArchive,
}: {
  issueId: string;
  status: IssueStatus;
  canArchive: boolean;
}) {
  // While the action runs, the badge shows the status we asked for.
  // When it ends, the badge shows what the server says again.
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  function changeStatus(next: IssueStatus) {
    setError("");
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await updateIssueStatusAction(issueId, next);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  function archive() {
    setError("");
    startTransition(async () => {
      const result = await archiveIssueAction(issueId);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={badgeVariants({
            variant: statusVariants[optimisticStatus],
          })}
        >
          {statusLabels[optimisticStatus]}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={optimisticStatus}
            onValueChange={changeStatus}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={archive}>Archive</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
