"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// useFormStatus reads the form it sits in, so the button is its own component.
export function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? pendingLabel : label}
    </Button>
  );
}
