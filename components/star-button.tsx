"use client";

import { useState } from "react";

export function StarButton() {
  const [starred, setStarred] = useState(false);

  return (
    <button
      onClick={() => setStarred(!starred)}
      aria-pressed={starred}
      className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      {starred ? "★ Starred" : "☆ Star"}
    </button>
  );
}
