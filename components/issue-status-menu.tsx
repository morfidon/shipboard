"use client";

import { badgeVariants } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateIssueStatusAction } from "@/lib/actions";
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

export function IssueStatusMenu({
  issueId,
  status,
}: {
  issueId: string;
  status: IssueStatus;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={badgeVariants({ variant: statusVariants[status] })}
      >
        {statusLabels[status]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(next: IssueStatus) =>
            updateIssueStatusAction(issueId, next)
          }
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <DropdownMenuRadioItem key={value} value={value} closeOnClick>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
