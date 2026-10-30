"use client";

import { useState } from "react";

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
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}
