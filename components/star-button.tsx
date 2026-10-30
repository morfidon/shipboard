"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function StarButton({ projectId }: { projectId: string }) {
  const key = `starred-${projectId}`;
  const starred = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) === "yes",
    () => false,
  );

  function toggle() {
    localStorage.setItem(key, starred ? "no" : "yes");
    window.dispatchEvent(new StorageEvent("storage", { key }));
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={starred}
      className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      {starred ? "★ Starred" : "☆ Star"}
    </button>
  );
}
