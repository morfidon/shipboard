"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Collapsible({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? <ChevronDown /> : <ChevronRight />}
        {title}
      </Button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}
